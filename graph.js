// Graphing calculator: a Desmos-style playground plus step-by-step calculus questions.
(() => {
  'use strict';
  const MX = window.MX, PL = window.PLOT, $ = id => document.getElementById(id);
  const reduceMotion = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const RESERVED = new Set(['x', 'y', 't', 'theta', 'r']);

  // ---------------- playground ----------------
  const list = $('exprs'), canvas = $('gcCanvas');
  let rows = [], colorIdx = 0, hover = null, needs = true, keyPts = [];
  const view = {xr:[-10, 10], yr:[-6, 6]};
  const box = () => ({x:0, y:0, w:canvas._w || 600, h:canvas._h || 400});
  function squareView(cx, cy, xspan){ const b = box(), ys = xspan*b.h/b.w; view.xr = [cx - xspan/2, cx + xspan/2]; view.yr = [cy - ys/2, cy + ys/2]; }
  const ctx = PL.fit(canvas, () => { const cx = (view.xr[0] + view.xr[1])/2, cy = (view.yr[0] + view.yr[1])/2; squareView(cx, cy, view.xr[1] - view.xr[0]); needs = true; });
  squareView(0, 0, 20);
  PL.interactive(canvas, box, view, {onChange:() => { needs = true; }, onHover:p => { hover = p; needs = true; }, onReset:() => { squareView(0, 0, 20); needs = true; }});

  function addRow(text = '', focus = false, batch = false){
    const r = {id:Math.random().toString(36).slice(2), text, color:PL.COLORS[colorIdx++ % PL.COLORS.length], on:true, kind:null, err:null, param:null, min:-10, max:10, playing:false, dir:1};
    rows.push(r); renderRow(r); parseRow(r); if (!batch) refreshParams();
    if (focus) r.el.querySelector('input.ein').focus();
    needs = true; return r;
  }
  function renderRow(r){
    const el = document.createElement('div'); el.className = 'ex'; el.style.color = r.color; r.el = el;
    el.innerHTML = `<button class="sw" aria-pressed="true" title="Show or hide"></button><input class="ein" spellcheck="false" autocapitalize="off" aria-label="Expression"><button class="del" title="Delete" aria-label="Delete">×</button><div class="sub"></div>`;
    const inp = el.querySelector('input.ein'); inp.value = r.text;
    inp.addEventListener('input', () => { r.text = inp.value; parseRow(r); refreshParams(); needs = true; });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter'){ e.preventDefault(); const i = rows.indexOf(r); if (i === rows.length - 1) addRow('', true); else rows[i + 1].el.querySelector('input.ein').focus(); } });
    el.querySelector('.sw').addEventListener('click', e => { r.on = !r.on; e.currentTarget.setAttribute('aria-pressed', String(r.on)); needs = true; });
    el.querySelector('.del').addEventListener('click', () => { rows = rows.filter(x => x !== r); el.remove(); refreshParams(); needs = true; });
    list.appendChild(el);
  }
  function paramEnv(){ const env = {}; rows.forEach(r => { if (r.kind === 'param' && !r.err) env[r.param] = r.value; }); return env; }
  // classify and compile one row
  function parseRow(r){
    r.kind = null; r.err = null; r.free = [];
    const src = r.text.trim();
    if (!src) return setSub(r, '');
    try {
      const eq = MX.splitEquation(src);
      if (eq){
        const [L, R] = eq, aL = MX.parse(L), aR = MX.parse(R), vL = MX.vars(aL), vR = MX.vars(aR);
        if (aL.t === 'var' && !RESERVED.has(aL.n) && vR.size === 0){ r.kind = 'param'; r.param = aL.n; r.value = MX.compile(aR)({}); if (!r.slider) makeSlider(r); syncSlider(r); return setSub(r, ''); }
        if (aL.t === 'var' && aL.n === 'y' && !vR.has('y')){ r.kind = 'fx'; r.f = MX.compile(aR); r.free = [...vR]; }
        else if (aR.t === 'var' && aR.n === 'y' && !vL.has('y')){ r.kind = 'fx'; r.f = MX.compile(aL); r.free = [...vL]; }
        else if (aL.t === 'var' && aL.n === 'x' && !vR.has('x')){ r.kind = 'fy'; r.f = MX.compile(aR); r.free = [...vR]; }
        else if (aL.t === 'var' && aL.n === 'r'){ r.kind = 'polar'; r.f = MX.compile(aR); r.free = [...vR]; }
        else { r.kind = 'implicit'; const fl = MX.compile(aL), fr = MX.compile(aR); r.f = env => fl(env) - fr(env); r.free = [...new Set([...vL, ...vR])]; }
      } else {
        const a = MX.parse(src), vs = MX.vars(a);
        if (a.t === 'tuple'){
          if (a.items.length !== 2) throw new Error('Use (x, y) for a point or (f(t), g(t)) for a curve.');
          r.f = MX.compile(a); r.free = [...vs]; r.kind = vs.has('t') ? 'param2' : 'point';
        } else { r.kind = 'fx'; r.f = MX.compile(a); r.free = [...vs]; }
      }
      if (r.slider){ r.slider.remove(); r.slider = null; }
      setSub(r, '');
    } catch (e){ r.err = e.message; setSub(r, e.message, true); if (r.slider){ r.slider.remove(); r.slider = null; } }
  }
  function setSub(r, msg, err){ const sub = r.el.querySelector('.sub'); sub.textContent = msg; sub.className = 'sub' + (err ? ' err' : ''); sub.hidden = !msg; }
  function makeSlider(r){
    const sl = document.createElement('div'); sl.className = 'sl';
    sl.innerHTML = `<input type="text" class="mn" aria-label="minimum"><input type="range" step="any" aria-label="${r.param} slider"><input type="text" class="mx" aria-label="maximum"><button type="button" title="Animate">▶</button>`;
    r.el.appendChild(sl); r.slider = sl;
    const rng = sl.querySelector('input[type=range]'), mn = sl.querySelector('.mn'), mx = sl.querySelector('.mx'), pb = sl.querySelector('button');
    rng.addEventListener('input', () => { r.value = +rng.value; const v = +(+rng.value).toPrecision(4); r.text = `${r.param} = ${v}`; r.el.querySelector('input.ein').value = r.text; needs = true; });
    const lim = () => { const a = parseFloat(mn.value), b = parseFloat(mx.value); if (isFinite(a) && isFinite(b) && b > a){ r.min = a; r.max = b; syncSlider(r); } };
    mn.addEventListener('change', lim); mx.addEventListener('change', lim);
    pb.addEventListener('click', () => { r.playing = !r.playing; pb.textContent = r.playing ? '❚❚' : '▶'; });
  }
  function syncSlider(r){
    if (!r.slider) return;
    if (r.value < r.min) r.min = Math.floor(r.value); if (r.value > r.max) r.max = Math.ceil(r.value);
    const rng = r.slider.querySelector('input[type=range]'); rng.min = r.min; rng.max = r.max; rng.value = r.value;
    r.slider.querySelector('.mn').value = r.min; r.slider.querySelector('.mx').value = r.max;
  }
  // unknown letters become sliders, like Desmos
  function refreshParams(){
    const defined = new Set(rows.filter(r => r.kind === 'param').map(r => r.param));
    const need = new Set();
    rows.forEach(r => (r.free || []).forEach(v => { if (!RESERVED.has(v) && !defined.has(v)) need.add(v); }));
    need.forEach(v => { if (!defined.has(v)){ defined.add(v); addRow(`${v} = 1`, false, true); } });
  }

  // marching squares for F(x, y) = 0
  function implicitSegs(F, env){
    const b = box(), cell = 5, nx = Math.ceil(b.w/cell), ny = Math.ceil(b.h/cell), M = PL.mapper(b, {xr:view.xr, yr:view.yr});
    const g = []; for (let j = 0; j <= ny; j++){ const row = []; for (let i = 0; i <= nx; i++){ env.x = M.ix(i*cell); env.y = M.iy(j*cell); row.push(F(env)); } g.push(row); }
    const segs = [];
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++){
      const v = [g[j][i], g[j][i + 1], g[j + 1][i + 1], g[j + 1][i]];
      if (v.some(q => !isFinite(q))) continue;
      const P = [[i*cell, j*cell], [(i + 1)*cell, j*cell], [(i + 1)*cell, (j + 1)*cell], [i*cell, (j + 1)*cell]], pts = [];
      for (let k = 0; k < 4; k++){
        const a = v[k], c = v[(k + 1) % 4];
        if ((a < 0) !== (c < 0)){ const t = a/(a - c); pts.push([P[k][0] + (P[(k + 1) % 4][0] - P[k][0])*t, P[k][1] + (P[(k + 1) % 4][1] - P[k][1])*t]); }
      }
      // skip cells where the sign change is a pole, not a zero (huge values on both sides)
      if (pts.length >= 2){ const big = Math.max(...v.map(Math.abs)); if (big > 1e6*Math.max(1e-9, Math.min(...v.map(Math.abs))) && big > 1e3) continue; }
      if (pts.length === 2) segs.push(pts); else if (pts.length === 4){ segs.push([pts[0], pts[1]]); segs.push([pts[2], pts[3]]); }
    }
    return segs;
  }
  function draw(){
    const b = box(); ctx.clearRect(0, 0, b.w, b.h);
    const M = PL.frame(ctx, b, {xr:view.xr, yr:view.yr, mode:'cartesian'});
    const env = paramEnv(); keyPts = []; const explicit = [];
    rows.forEach(r => {
      if (!r.on || r.err || !r.kind || r.kind === 'param') return;
      const style = {color:r.color, width:2.6, glow:6};
      try {
        if (r.kind === 'fx'){ const f = x => { env.x = x; return r.f(env); }; PL.fn(ctx, M, f, style); explicit.push({f, color:r.color}); }
        else if (r.kind === 'fy'){ const pts = []; for (let i = 0; i <= 800; i++){ const y = view.yr[0] + (view.yr[1] - view.yr[0])*i/800; env.y = y; pts.push([r.f(env), y]); } PL.line(ctx, M, pts, style); }
        else if (r.kind === 'polar'){ const pts = []; for (let i = 0; i <= 1600; i++){ const th = MX.TAU*i/1600; env.theta = th; const rr = r.f(env); pts.push([rr*Math.cos(th), rr*Math.sin(th)]); } PL.line(ctx, M, pts, style); }
        else if (r.kind === 'param2'){ const pts = []; for (let i = 0; i <= 1600; i++){ env.t = MX.TAU*i/1600; const [x, y] = r.f(env); pts.push([x, y]); } PL.line(ctx, M, pts, style); }
        else if (r.kind === 'point'){ const [x, y] = r.f(env); PL.dot(ctx, M, x, y, {color:r.color, r:6, label:`(${MX.fmt(x, 4)}, ${MX.fmt(y, 4)})`, color2:r.color}); }
        else if (r.kind === 'implicit'){
          const segs = implicitSegs(r.f, env);
          ctx.save(); ctx.strokeStyle = r.color; ctx.lineWidth = 2.6; ctx.shadowBlur = 0; ctx.beginPath();
          segs.forEach(([p, q]) => { ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); }); ctx.stroke(); ctx.restore();
        }
      } catch (e) { /* skip a row that fails to evaluate */ }
    });
    // key points of explicit curves: roots, extrema, y-intercepts, intersections
    const [x0, x1] = view.xr, tol = 1e-7*(view.yr[1] - view.yr[0]);
    // a sign change through a pole (tan x, 1/x) is not a root: keep only true zeros
    const zeros = (h, n) => MX.rootsIn(h, x0, x1, n).filter(x => Math.abs(h(x)) < tol);
    explicit.forEach(c => {
      zeros(c.f, 500).forEach(x => keyPts.push({x, y:0, what:'root'}));
      MX.rootsIn(x => MX.deriv(c.f, x), x0, x1, 500).forEach(x => { const y = c.f(x); if (isFinite(y) && Math.abs(MX.deriv(c.f, x)) < 1e-4*Math.max(1, Math.abs(y))) keyPts.push({x, y, what: MX.deriv(c.f, x + 1e-4*(x1 - x0)) > 0 ? 'minimum' : 'maximum'}); });
      if (x0 < 0 && x1 > 0){ const y = c.f(0); if (isFinite(y)) keyPts.push({x:0, y, what:'y-intercept'}); }
    });
    for (let i = 0; i < explicit.length; i++) for (let j = i + 1; j < explicit.length; j++){ const A = explicit[i].f, B = explicit[j].f; zeros(x => A(x) - B(x), 500).forEach(x => keyPts.push({x, y:A(x), what:'intersection'})); }
    keyPts = keyPts.filter(k => isFinite(k.y) && k.y >= view.yr[0] && k.y <= view.yr[1]);
    keyPts.forEach(k => PL.dot(ctx, M, k.x, k.y, {color:'rgba(213,220,228,.85)', r:3.6, ring:false}));
    // hover: snap to a key point, otherwise trace the nearest explicit curve
    if (hover){
      let best = null, bd = 14;
      keyPts.forEach(k => { const d = Math.hypot(M.X(k.x) - hover[0], M.Y(k.y) - hover[1]); if (d < bd){ bd = d; best = k; } });
      if (best){ PL.dot(ctx, M, best.x, best.y, {color:'#fff', r:5.5, label:`${best.what}: (${MX.fmt(best.x, 4)}, ${MX.fmt(best.y, 4)})`}); }
      else {
        const hx = M.ix(hover[0]); let cb = null, cd = 22;
        explicit.forEach(c => { const y = c.f(hx); if (isFinite(y)){ const d = Math.abs(M.Y(y) - hover[1]); if (d < cd){ cd = d; cb = {y, c}; } } });
        if (cb) PL.dot(ctx, M, hx, cb.y, {color:cb.c.color, r:5.5, label:`(${MX.fmt(hx, 4)}, ${MX.fmt(cb.y, 4)})`});
      }
    }
  }
  let lastT = performance.now();
  function loop(t){
    const dt = Math.min(64, t - lastT)/1000; lastT = t;
    rows.forEach(r => { if (r.kind === 'param' && r.playing){ const span = r.max - r.min; r.value += r.dir*span*dt*0.25; if (r.value > r.max){ r.value = r.max; r.dir = -1; } if (r.value < r.min){ r.value = r.min; r.dir = 1; } r.text = `${r.param} = ${+r.value.toPrecision(4)}`; r.el.querySelector('input.ein').value = r.text; syncSlider(r); needs = true; } });
    if (needs){ needs = false; draw(); }
    requestAnimationFrame(loop);
  }
  $('gcAdd').addEventListener('click', () => addRow('', true));
  $('gcZin').addEventListener('click', () => zoomCentre(0.7));
  $('gcZout').addEventListener('click', () => zoomCentre(1/0.7));
  $('gcReset').addEventListener('click', () => { squareView(0, 0, 20); needs = true; });
  function zoomCentre(k){ const cx = (view.xr[0] + view.xr[1])/2, cy = (view.yr[0] + view.yr[1])/2; view.xr = [cx + (view.xr[0] - cx)*k, cx + (view.xr[1] - cx)*k]; view.yr = [cy + (view.yr[0] - cy)*k, cy + (view.yr[1] - cy)*k]; needs = true; }
  document.querySelectorAll('[data-ex]').forEach(b => b.addEventListener('click', () => { rows.forEach(r => r.el.remove()); rows = []; colorIdx = 0; b.dataset.ex.split('|').forEach(t => addRow(t, false, true)); refreshParams(); squareView(0, 0, 20); needs = true; }));
  ['y = a sin(bx)', 'y = 0.25x^2 - 2', 'x^2 + y^2 = 16', 'a = 2', 'b = 1'].forEach(t => addRow(t, false, true)); refreshParams();
  $('hPlay') && $('hPlay').addEventListener('click', () => $('play').scrollIntoView({behavior: reduceMotion ? 'auto' : 'smooth'}));
  window.__gc = {rows: () => rows.map(r => ({text:r.text, kind:r.kind, err:r.err})), keyPts: () => keyPts, view, addRow, setText:(i, t) => { rows[i].text = t; rows[i].el.querySelector('input.ein').value = t; parseRow(rows[i]); refreshParams(); needs = true; }, draw};
  requestAnimationFrame(loop);
})();

// ---------------- step-by-step questions ----------------
window.FORMULA_PAGE = (G) => {
  'use strict';
  const MX = window.MX, PL = window.PLOT, {C} = G;
  const f4 = v => MX.fmt(v, 6);
  const cardsHTML = cards => `<div class="answer">${cards.filter(Boolean).map(c => `<div class="ans ${c.tone || 'y'}"><div class="k">${c.k}</div><div class="v">${c.v}</div><div class="s">${c.s || ''}</div></div>`).join('')}</div>`;
  const MODE_OF = m => MODES.find(x => x.id === m.id);
  const answerStep = () => ({ dur:1600, show:[], info: m => ({ title:'Answer', body: cardsHTML(MODE_OF(m).answer(m)) + (MODE_OF(m).note ? `<p>${MODE_OF(m).note(m)}</p>` : ''), work:'' }) });
  function fx(src, what = 'f(x)'){ if (!src) throw new Error(`Type ${what}.`); try { const s = src.replace(/^\s*(y|f\(x\)|g\(x\))\s*=\s*/i, ''); return {f: MX.fn(s, 'x'), src: s}; } catch (e){ throw new Error(`${what}: ${e.message}`); } }
  function interval(a, b){ if (!isFinite(a) || !isFinite(b)) throw new Error('Enter numbers for a and b (you can type things like pi/2).'); if (b <= a) throw new Error('b must be bigger than a.'); }
  function yRange(fs, a, b){ const v = []; fs.forEach(f => { for (let i = 0; i <= 400; i++){ const y = f(a + (b - a)*i/400); if (isFinite(y)) v.push(y); } }); const r = PL.range(v.concat([0]), .12); return r; }
  function frame(m, S){ const ctx = G.ctx(); const box = {x:58, y:30, w:S.W - 84, h:S.H - 72}; return {ctx, M: PL.frame(ctx, box, {xr:m.xr, yr:m.yr, mode:'box', zeroLine:true, zeroLineX:true, xlabel:'x', ylabel:'y'})}; }
  const GLYPH = {
    root:'<path d="M3 16 H29"/><path d="M4 26 C10 26, 12 6, 18 6 S 26 18, 29 22"/><circle cx="13.6" cy="16" r="2.4" fill="currentColor" stroke="none"/>',
    int:'<path d="M3 20 C9 4, 15 4, 20 14 S 26 24, 29 10"/><path d="M3 26 H29"/><path d="M8 26 V12 M13 26 V7 M18 26 V12" stroke-dasharray="2 2"/>',
    area:'<path d="M3 26 H29"/><path d="M5 24 C10 6, 18 6, 27 20" /><path d="M5 26 V24 C10 6, 18 6, 27 20 V26 Z" fill="currentColor" opacity=".25" stroke="none"/>',
    tan:'<path d="M3 24 C10 24, 16 18, 29 4"/><path d="M5 26 L27 10"/><circle cx="16" cy="18" r="2.4" fill="currentColor" stroke="none"/>'
  };
  const glyph = k => `<svg viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${GLYPH[k]}</svg>`;

  // bisection and Newton iterations, recorded for display
  function bisectSteps(f, a, b, n = 40){ const it = []; let fa = f(a); for (let k = 0; k < n; k++){ const m = (a + b)/2, fm = f(m); it.push({a, b, m, fm}); if (fm === 0) break; if ((fa < 0) === (fm < 0)){ a = m; fa = fm; } else b = m; } return it; }
  function newtonSteps(f, x, n = 12){ const it = []; for (let k = 0; k < n; k++){ const fx0 = f(x), d = MX.deriv(f, x); it.push({x, fx:fx0, d}); if (!isFinite(d) || d === 0) break; const xn = x - fx0/d; if (Math.abs(xn - x) < 1e-14*Math.max(1, Math.abs(x))){ it.push({x:xn, fx:f(xn), d:MX.deriv(f, xn)}); break; } x = xn; } return it; }

  const MODES = [
    { id:'roots', title:'Roots of f(x)', desc:'Find where f(x) = 0 with bisection or Newton’s method', glyph:glyph('root'),
      fields:['f', 'a', 'b', 'method'], defaults:{f:'x^3 - 2x - 5', a:'-3', b:'4', method:'bisection'},
      compute: v => {
        const {f, src} = fx(v.f); interval(v.a, v.b);
        const snap = r => Math.abs(r) < 1e-10*(v.b - v.a) ? 0 : r, roots = MX.rootsIn(f, v.a, v.b, 4000).map(snap);
        if (!roots.length) throw new Error('f(x) never crosses zero on [a, b]. Try a wider interval.');
        // bracket the first root for the worked iterations
        const r0 = roots[0], w = Math.max((v.b - v.a)/40, 1e-6);
        let lo = Math.max(v.a, r0 - w), hi = Math.min(v.b, r0 + w);
        for (let k = 0; k < 60 && (f(lo) < 0) === (f(hi) < 0); k++){ lo = Math.max(v.a, lo - w); hi = Math.min(v.b, hi + w); }
        const iters = v.method === 'newton' ? newtonSteps(f, (lo + hi)/2) : bisectSteps(f, lo, hi);
        return {id:'roots', src, f, a:v.a, b:v.b, method:v.method, roots, lo, hi, iters, xr:[v.a, v.b], yr:yRange([f], v.a, v.b)};
      },
      problem: m => ({ chips:[`f(x) = ${m.src}`, `[${f4(m.a)}, ${f4(m.b)}]`, m.method === 'newton' ? 'Newton' : 'bisection'] }),
      steps: () => [
        { dur:2400, show:['curve'], info: m => ({ title:'Plot f(x)', body:'<p>A root is where the curve crosses the x-axis.</p>', work:`f(x) = ${m.src}` }) },
        { dur:2400, show:['bracket'], info: m => ({ title:'Find a sign change', body:'<p>If f changes sign between two points, a continuous f must cross zero in between. That interval is a <b>bracket</b>.</p>', work:`f(${f4(m.lo)}) = ${f4(m.f(m.lo))}<br>f(${f4(m.hi)}) = ${f4(m.f(m.hi))}<br>→ a root lies in [${f4(m.lo)}, ${f4(m.hi)}]` }),
          rd: m => ['Bracket', `[${f4(m.lo)}, ${f4(m.hi)}]`] },
        { dur:4600, show:['iter'], info: m => ({ title: m.method === 'newton' ? 'Newton’s method' : 'Bisection',
            body: m.method === 'newton' ? '<p>Follow the tangent line down to the x-axis: x<sub>n+1</sub> = x<sub>n</sub> − f(x<sub>n</sub>)/f′(x<sub>n</sub>). Near a simple root the number of correct digits roughly doubles each step.</p>' : '<p>Halve the bracket each time, keeping the half where the sign still changes. Each step gains about one binary digit, so it is slow but never fails.</p>',
            work: (m.method === 'newton' ? m.iters.slice(0, 8).map((s, k) => `x${k} = ${MX.fmt(s.x, 10)}, f = ${MX.fmt(s.fx, 3)}`) : m.iters.slice(0, 8).map((s, k) => `${k + 1}: [${MX.fmt(s.a, 7)}, ${MX.fmt(s.b, 7)}] → m = ${MX.fmt(s.m, 8)}`)).join('<br>') + `<br><span class="c">${m.iters.length} iterations in total</span>` }),
          rd: m => [m.method === 'newton' ? 'Newton iterations' : 'Bisection iterations', `${m.iters.length} → ${MX.fmt(m.method === 'newton' ? m.iters[m.iters.length - 1].x : m.iters[m.iters.length - 1].m, 10)}`] },
        { dur:2200, show:['roots'], info: m => ({ title:`All roots on [${f4(m.a)}, ${f4(m.b)}]`, body:'<p>Repeating this on every sign change finds each crossing in the interval.</p>', work: m.roots.map((r, k) => `x${k + 1} = <b>${MX.fmt(r, 10)}</b>`).join('<br>') }),
          rd: m => ['Roots', m.roots.map(r => MX.fmt(r, 8)).join(', ')] },
        answerStep()],
      answer: m => [{tone:'y', k: m.roots.length === 1 ? 'Root' : `${m.roots.length} roots`, v: m.roots.map(r => `x = ${MX.fmt(r, 8)}`).join('<br>'), s:`f(x) = ${m.src} on [${f4(m.a)}, ${f4(m.b)}]`}],
      note: () => 'Roots where the curve only touches the axis without crossing (like x² at 0) have no sign change; zoom into those on the playground graph.',
      scene: (m, S) => {
        const {ctx, M} = frame(m, S);
        PL.fn(ctx, M, m.f, {color:'#fff', width:2.6, glow:8, alpha:S.vis('curve')});
        const vb = S.vis('bracket'); if (vb > 0){ ctx.save(); ctx.globalAlpha = vb*.22; ctx.fillStyle = '#7CC6BE'; ctx.fillRect(M.X(m.lo), M.box.y, M.X(m.hi) - M.X(m.lo), M.box.h); ctx.restore(); }
        const vi = S.vis('iter');
        if (vi > 0){
          const shown = Math.max(1, Math.round(vi*Math.min(m.iters.length, 8)));
          m.iters.slice(0, shown).forEach((s, k) => {
            if (m.method === 'newton'){ const next = m.iters[k + 1]; PL.dot(ctx, M, s.x, s.fx, {color:'#E2B86F', r:4}); if (next){ PL.line(ctx, M, [[s.x, s.fx], [next.x, 0]], {color:'#E2B86F', width:1.6, dash:[5, 4]}); PL.line(ctx, M, [[next.x, 0], [next.x, next.fx]], {color:'rgba(226,184,111,.5)', width:1.2, dash:[2, 3]}); } PL.label(ctx, M.X(s.x), M.Y(0) + 16 + 13*(k % 2), `x${k}`, {color:'#EBD3A2', size:11, align:'center'}); }
            else { const y = M.box.y + 14 + k*12; ctx.save(); ctx.strokeStyle = '#7CC6BE'; ctx.globalAlpha = .9; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(M.X(s.a), y); ctx.lineTo(M.X(s.b), y); ctx.stroke(); ctx.restore(); PL.dot(ctx, M, s.m, 0, {color:'#E2B86F', r:3.2}); }
          });
        }
        const vr = S.vis('roots'); m.roots.forEach(r => PL.dot(ctx, M, r, 0, {color:'#8AB4F0', r:6, alpha:vr, label: vr > .9 ? MX.fmt(r, 6) : '', dy:-12}));
      } },

    { id:'intersect', title:'Where two curves meet', desc:'Solve f(x) = g(x) and get the points', glyph:glyph('int'),
      fields:['f', 'g', 'a', 'b'], defaults:{f:'cos(x)', g:'0.2x', a:'-10', b:'10'},
      compute: v => {
        const F = fx(v.f), Gg = fx(v.g, 'g(x)'); interval(v.a, v.b);
        const h = x => F.f(x) - Gg.f(x), xs = MX.rootsIn(h, v.a, v.b, 6000).map(r => Math.abs(r) < 1e-10*(v.b - v.a) ? 0 : r);
        if (!xs.length) throw new Error('The curves do not cross on [a, b].');
        return {id:'intersect', F, Gg, h, a:v.a, b:v.b, xs, pts:xs.map(x => [x, F.f(x)]), xr:[v.a, v.b], yr:yRange([F.f, Gg.f], v.a, v.b)};
      },
      problem: m => ({ chips:[`f(x) = ${m.F.src}`, `g(x) = ${m.Gg.src}`, `[${f4(m.a)}, ${f4(m.b)}]`] }),
      steps: () => [
        { dur:2400, show:['curves'], info: m => ({ title:'Plot both curves', body:'<p>They meet wherever they have the same y value.</p>', work:`f(x) = ${m.F.src}<br>g(x) = ${m.Gg.src}` }) },
        { dur:2600, show:['h'], info: m => ({ title:'Turn it into one equation', body:'<p>f(x) = g(x) is the same as h(x) = f(x) − g(x) = 0, so the meeting points are the roots of h.</p>', work:`h(x) = (${m.F.src}) − (${m.Gg.src})` }) },
        { dur:2600, show:['xs'], info: m => ({ title:'Solve h(x) = 0', body:'<p>Find every sign change of h and refine it.</p>', work: m.xs.map((x, k) => `x${k + 1} = ${MX.fmt(x, 10)}`).join('<br>') }), rd: m => ['x where they meet', m.xs.map(x => MX.fmt(x, 7)).join(', ')] },
        { dur:2000, show:['pts'], info: m => ({ title:'Get the points', body:'<p>Put each x back into either curve for the y value.</p>', work: m.pts.map(([x, y]) => `(${MX.fmt(x, 7)}, ${MX.fmt(y, 7)})`).join('<br>') }), rd: m => ['Points', m.pts.map(([x, y]) => `(${MX.fmt(x, 5)}, ${MX.fmt(y, 5)})`).join(' ')] },
        answerStep()],
      answer: m => [{tone:'y', k:`${m.pts.length} meeting point${m.pts.length > 1 ? 's' : ''}`, v: m.pts.slice(0, 6).map(([x, y]) => `(${MX.fmt(x, 5)}, ${MX.fmt(y, 5)})`).join('<br>') + (m.pts.length > 6 ? '<br>…' : ''), s:`on [${f4(m.a)}, ${f4(m.b)}]`}],
      scene: (m, S) => {
        const {ctx, M} = frame(m, S), vc = S.vis('curves');
        PL.fn(ctx, M, m.F.f, {color:'#8AB4F0', width:2.6, glow:8, alpha:vc}); PL.fn(ctx, M, m.Gg.f, {color:'#7CC6BE', width:2.6, glow:8, alpha:vc});
        PL.fn(ctx, M, m.h, {color:'#E2B86F', width:1.6, dash:[6, 4], alpha:S.vis('h')*.85});
        const vx = S.vis('xs'); m.xs.forEach(x => PL.dot(ctx, M, x, 0, {color:'#E2B86F', r:4.5, alpha:vx}));
        const vp = S.vis('pts'); m.pts.forEach(([x, y], k) => { PL.vline(ctx, M, x, {color:'rgba(255,255,255,.35)', alpha:vp}); PL.dot(ctx, M, x, y, {color:'#fff', r:6, alpha:vp, label: k < 4 ? `(${MX.fmt(x, 4)}, ${MX.fmt(y, 4)})` : ''}); });
        PL.label(ctx, M.box.x + 8, M.box.y + 18, 'f(x)', {color:'#8AB4F0', alpha:vc}); PL.label(ctx, M.box.x + 48, M.box.y + 18, 'g(x)', {color:'#7CC6BE', alpha:vc}); PL.label(ctx, M.box.x + 90, M.box.y + 18, 'h = f − g', {color:'#E2B86F', alpha:S.vis('h')});
      } },

    { id:'area', title:'Area under a curve', desc:'Riemann sums, trapezoid and Simpson vs the exact integral', glyph:glyph('area'),
      fields:['f', 'a', 'b', 'n'], defaults:{f:'x^2 + 1', a:'0', b:'2', n:'6'},
      compute: v => {
        const {f, src} = fx(v.f); interval(v.a, v.b);
        const n = Math.round(v.n); if (!(n >= 1 && n <= 200)) throw new Error('Use between 1 and 200 strips.');
        const h = (v.b - v.a)/n, xs = Array.from({length:n + 1}, (_, i) => v.a + i*h), ys = xs.map(f);
        if (ys.some(y => !isFinite(y))) throw new Error('f(x) is not defined everywhere on [a, b].');
        let L = 0, Rr = 0, Mid = 0; for (let i = 0; i < n; i++){ L += ys[i]; Rr += ys[i + 1]; Mid += f(v.a + (i + .5)*h); }
        L *= h; Rr *= h; Mid *= h; const T = (L + Rr)/2;
        let Sm = null; if (n % 2 === 0){ Sm = ys[0] + ys[n]; for (let i = 1; i < n; i++) Sm += (i % 2 ? 4 : 2)*ys[i]; Sm *= h/3; }
        const exact = MX.integrate(f, v.a, v.b), absA = MX.integrate(x => Math.abs(f(x)), v.a, v.b);
        return {id:'area', f, src, a:v.a, b:v.b, n, h, xs, ys, L, R:Rr, Mid, T, Sm, exact, absA, xr:[v.a - (v.b - v.a)*.08, v.b + (v.b - v.a)*.08], yr:yRange([f], v.a, v.b)};
      },
      problem: m => ({ chips:[`f(x) = ${m.src}`, `from ${f4(m.a)} to ${f4(m.b)}`, `n = ${m.n}`] }),
      steps: () => [
        { dur:2200, show:['curve', 'shade'], info: m => ({ title:'The area', body:'<p>∫ f(x) dx from a to b is the area between the curve and the x-axis, counting parts below the axis as negative.</p>', work:`∫<sub>${f4(m.a)}</sub><sup>${f4(m.b)}</sup> (${m.src}) dx` }) },
        { dur:2600, show:['strips'], info: m => ({ title:`Cut it into ${m.n} strips`, body:'<p>Each strip has width Δx; add up simple shapes to approximate the area.</p>', work:`Δx = (b − a)/n = ${f4(m.h)}` }), rd: m => ['Strip width Δx', f4(m.h)] },
        { dur:3000, show:['rects'], info: m => ({ title:'Rectangles and trapezoids', body:'<p>Rectangles use one height per strip (left end, right end or middle). Trapezoids join the ends with straight lines.</p>', work:`left sum = ${f4(m.L)}<br>right sum = ${f4(m.R)}<br>midpoint = ${f4(m.Mid)}<br>trapezoid = <b>${f4(m.T)}</b>${m.Sm != null ? `<br>Simpson = <b>${f4(m.Sm)}</b>` : '<br><span class="c">Simpson needs an even n</span>'}` }),
          rd: m => ['Trapezoid / Simpson', `${f4(m.T)} / ${m.Sm != null ? f4(m.Sm) : '—'}`] },
        { dur:2200, show:[], info: m => ({ title:'Compare with the exact value', body:'<p>An accurate integral (adaptive Simpson to about 10 digits) shows how close each rule gets.</p>', work:`exact ≈ <b>${MX.fmt(m.exact, 10)}</b><br>trapezoid error ${MX.fmt(m.T - m.exact, 3)}<br>midpoint error ${MX.fmt(m.Mid - m.exact, 3)}${m.Sm != null ? `<br>Simpson error ${MX.fmt(m.Sm - m.exact, 3)}` : ''}` }),
          rd: m => ['Integral', MX.fmt(m.exact, 10)] },
        answerStep()],
      answer: m => [{tone:'y', k:'Definite integral', v:`${MX.fmt(m.exact, 8)}`, s:`total area counting all parts as positive: ${MX.fmt(m.absA, 6)}`}, {tone:'s1', k:`With n = ${m.n}`, v:`trapezoid ${MX.fmt(m.T, 6)}${m.Sm != null ? `<br>Simpson ${MX.fmt(m.Sm, 6)}` : ''}`, s:`midpoint ${MX.fmt(m.Mid, 6)}`}],
      scene: (m, S) => {
        const {ctx, M} = frame(m, S), pts = []; for (let i = 0; i <= 300; i++){ const x = m.a + (m.b - m.a)*i/300; pts.push([x, m.f(x)]); }
        PL.area(ctx, M, pts, {color:'#8AB4F0', alpha:.22*S.vis('shade')});
        const vs = S.vis('strips'); if (vs > 0) m.xs.forEach(x => PL.vline(ctx, M, x, {color:'rgba(255,255,255,.4)', alpha:vs, dash:[3, 3]}));
        const vr = S.vis('rects');
        if (vr > 0){ const k = Math.max(1, Math.round(vr*m.n)); for (let i = 0; i < k; i++){ const x0 = m.xs[i], x1 = m.xs[i + 1], ym = m.f((x0 + x1)/2); ctx.save(); ctx.globalAlpha = .35; ctx.fillStyle = '#7CC6BE'; const y0 = M.Y(0), y1 = M.Y(ym); ctx.fillRect(M.X(x0), Math.min(y0, y1), M.X(x1) - M.X(x0), Math.abs(y1 - y0)); ctx.globalAlpha = .9; ctx.strokeStyle = '#E2B86F'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(M.X(x0), M.Y(m.ys[i])); ctx.lineTo(M.X(x1), M.Y(m.ys[i + 1])); ctx.stroke(); ctx.restore(); } PL.label(ctx, M.box.x + 8, M.box.y + 18, 'midpoint rectangles', {color:'#7CC6BE'}); PL.label(ctx, M.box.x + 170, M.box.y + 18, 'trapezoid tops', {color:'#E2B86F'}); }
        PL.fn(ctx, M, m.f, {color:'#fff', width:2.6, glow:8, alpha:S.vis('curve')});
      } },

    { id:'tangent', title:'Derivative and tangent line', desc:'Slope at a point, tangent and normal lines', glyph:glyph('tan'),
      fields:['f', 'x0'], defaults:{f:'x^3 - 3x', x0:'1.5'},
      compute: v => {
        const {f, src} = fx(v.f); if (!isFinite(v.x0)) throw new Error('Enter a number for x₀.');
        const x0 = v.x0, y0 = f(x0); if (!isFinite(y0)) throw new Error('f is not defined at x₀.');
        // central differences with Richardson extrapolation
        const D = h => (f(x0 + h) - f(x0 - h))/(2*h), h = 1e-3*Math.max(1, Math.abs(x0)), slope = (4*D(h/2) - D(h))/3;
        const f2 = (f(x0 + h) - 2*y0 + f(x0 - h))/(h*h);
        const sec = [1, 0.5, 0.1, 0.01].map(k => ({h:k, m:(f(x0 + k) - y0)/k}));
        const span = 3; return {id:'tangent', f, src, x0, y0, slope, f2, sec, xr:[x0 - span, x0 + span], yr:[y0 - 2, y0 + 2]};
      },
      problem: m => ({ chips:[`f(x) = ${m.src}`, `x₀ = ${f4(m.x0)}`] }),
      steps: () => [
        { dur:2000, show:['curve', 'pt'], info: m => ({ title:'The point on the curve', body:'<p>Evaluate f at x₀.</p>', work:`f(${f4(m.x0)}) = <b>${f4(m.y0)}</b>` }), rd: m => ['Point', `(${f4(m.x0)}, ${f4(m.y0)})`] },
        { dur:3600, show:['secants'], info: m => ({ title:'Secant lines close in', body:'<p>The slope between x₀ and x₀ + h tends to the derivative as h shrinks.</p>', work: m.sec.map(s => `h = ${s.h}: slope = ${f4(s.m)}`).join('<br>') }) },
        { dur:2200, show:['tangent'], info: m => ({ title:'The derivative and the tangent', body:'<p>The limit of the secant slopes is f′(x₀). The tangent line goes through the point with that slope.</p>', work:`f′(${f4(m.x0)}) = <b>${MX.fmt(m.slope, 8)}</b><br>y = ${f4(m.slope)}(x − ${f4(m.x0)}) + ${f4(m.y0)}<br>&nbsp;&nbsp;= ${f4(m.slope)}x ${m.y0 - m.slope*m.x0 < 0 ? '−' : '+'} ${f4(Math.abs(m.y0 - m.slope*m.x0))}` }),
          rd: m => ['Slope f′(x₀)', MX.fmt(m.slope, 8)] },
        { dur:2000, show:['normal'], info: m => ({ title:'The normal line', body:'<p>The normal is perpendicular to the tangent: its slope is −1/f′(x₀).</p>', work: Math.abs(m.slope) < 1e-12 ? 'tangent is flat, so the normal is the vertical line x = ' + f4(m.x0) : `normal slope = ${f4(-1/m.slope)}<br>y = ${f4(-1/m.slope)}(x − ${f4(m.x0)}) + ${f4(m.y0)}` }),
          rd: m => ['Normal slope', Math.abs(m.slope) < 1e-12 ? 'vertical' : f4(-1/m.slope)] },
        { dur:1800, show:[], info: m => ({ title:'Curvature', body:'<p>The second derivative says which way the curve bends.</p>', work:`f″(${f4(m.x0)}) ≈ ${f4(m.f2)} → ${m.f2 > 1e-9 ? 'concave up' : m.f2 < -1e-9 ? 'concave down' : 'no bend (possible inflection)'}` }), rd: m => ['f″(x₀)', f4(m.f2)] },
        answerStep()],
      answer: m => [{tone:'y', k:'Derivative', v:`f′(${f4(m.x0)}) = ${MX.fmt(m.slope, 6)}`, s:`f(${f4(m.x0)}) = ${f4(m.y0)}`}, {tone:'s1', k:'Tangent line', v:`y = ${MX.fmt(m.slope, 5)}x ${m.y0 - m.slope*m.x0 < 0 ? '−' : '+'} ${MX.fmt(Math.abs(m.y0 - m.slope*m.x0), 5)}`, s:`f″ ≈ ${MX.fmt(m.f2, 4)}`}],
      scene: (m, S) => {
        // equal scales on both axes so the normal line really looks perpendicular
        const bw = S.W - 84, bh = S.H - 72, ys = (m.xr[1] - m.xr[0])*bh/bw; m.yr = [m.y0 - ys/2, m.y0 + ys/2];
        const {ctx, M} = frame(m, S);
        PL.fn(ctx, M, m.f, {color:'#fff', width:2.6, glow:8, alpha:S.vis('curve')});
        const vs = S.vis('secants'); if (vs > 0){ const k = Math.max(1, Math.round(vs*m.sec.length)); m.sec.slice(0, k).forEach((s, i) => { PL.fn(ctx, M, x => m.y0 + s.m*(x - m.x0), {color:'#7CC6BE', width:1.4, alpha:.35 + .15*i}); PL.dot(ctx, M, m.x0 + s.h, m.f(m.x0 + s.h), {color:'#7CC6BE', r:3.5}); }); }
        PL.fn(ctx, M, x => m.y0 + m.slope*(x - m.x0), {color:'#8AB4F0', width:2.4, alpha:S.vis('tangent')});
        const vn = S.vis('normal'); if (vn > 0){ if (Math.abs(m.slope) < 1e-12) PL.vline(ctx, M, m.x0, {color:'#E2B86F', alpha:vn, dash:[]}); else PL.fn(ctx, M, x => m.y0 - (x - m.x0)/m.slope, {color:'#E2B86F', width:2, dash:[7, 5], alpha:vn}); }
        PL.dot(ctx, M, m.x0, m.y0, {color:'#EBD3A2', r:6, alpha:S.vis('pt'), label:`(${MX.fmt(m.x0, 4)}, ${MX.fmt(m.y0, 4)})`});
      } }
  ];
  const FIELDS = {
    f:{label:'f(x)', type:'expr'}, g:{label:'g(x)', type:'expr'}, a:{label:'from a'}, b:{label:'to b'}, n:{label:'Strips n'}, x0:{label:'at x₀'},
    method:{label:'Method', type:'select', options:[['bisection', 'Bisection'], ['newton', 'Newton’s method']]}
  };
  return {MODES, FIELDS};
};
