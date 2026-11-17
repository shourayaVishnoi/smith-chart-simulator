// Circuits: a live RC / RL / RLC playground plus step-by-step circuit questions.
window.CKT = (() => {
  'use strict';
  const TAU = 2*Math.PI;
  // time unit for axis labels
  function tunit(T){ return T >= 1 ? [1, 's'] : T >= 1e-3 ? [1e3, 'ms'] : T >= 1e-6 ? [1e6, 'µs'] : [1e9, 'ns']; }
  // series loop driven by a step of V at t = 0 from rest; RK4 on the state (i, vC)
  function sim(ckt, R, L, C, V, T, N = 1600){
    const t = [], vC = [], vR = [], vL = [], I = [], h = T/N;
    let i = 0, v = 0;
    const d = (i, v) => ckt === 'RC' ? [(V - v)/R, (V - v)/(R*C)] : ckt === 'RL' ? [(V - R*i)/L, 0] : [(V - R*i - v)/L, i/C];
    for (let k = 0; k <= N; k++){
      const ii = ckt === 'RC' ? (V - v)/R : i;
      t.push(k*h); vC.push(ckt === 'RL' ? 0 : v); I.push(ii); vR.push(R*ii); vL.push(ckt === 'RC' ? 0 : V - R*ii - (ckt === 'RL' ? 0 : v));
      if (ckt === 'RC'){ const f = x => (V - x)/(R*C), k1 = f(v), k2 = f(v + h/2*k1), k3 = f(v + h/2*k2), k4 = f(v + h*k3); v += h/6*(k1 + 2*k2 + 2*k3 + k4); }
      else {
        const [a1, b1] = d(i, v), [a2, b2] = d(i + h/2*a1, v + h/2*b1), [a3, b3] = d(i + h/2*a2, v + h/2*b2), [a4, b4] = d(i + h*a3, v + h*b3);
        i += h/6*(a1 + 2*a2 + 2*a3 + a4); v += h/6*(b1 + 2*b2 + 2*b3 + b4);
      }
    }
    return {t, vC, vR, vL, i:I};
  }
  // series-loop transfer function to the voltage across one element
  function H(ckt, out, R, L, C, f){
    const w = TAU*f, ZR = [R, 0], ZL = ckt === 'RC' ? [0, 0] : [0, w*L], ZC = ckt === 'RL' ? [0, 0] : [0, -1/(w*C)];
    const Zt = [ZR[0] + ZL[0] + ZC[0], ZR[1] + ZL[1] + ZC[1]], Zo = out === 'R' ? ZR : out === 'L' ? ZL : ZC;
    const den = Zt[0]*Zt[0] + Zt[1]*Zt[1];
    return [(Zo[0]*Zt[0] + Zo[1]*Zt[1])/den, (Zo[1]*Zt[0] - Zo[0]*Zt[1])/den];
  }
  function params(ckt, R, L, C){
    if (ckt === 'RC') return {tau:R*C, fc:1/(TAU*R*C)};
    if (ckt === 'RL') return {tau:L/R, fc:R/(TAU*L)};
    const a = R/(2*L), w0 = 1/Math.sqrt(L*C), z = a/w0, Q = 1/(2*z), p = {alpha:a, w0, f0:w0/TAU, zeta:z, Q};
    if (z < 1){ p.wd = w0*Math.sqrt(1 - z*z); p.Mp = Math.exp(-a*Math.PI/p.wd); p.tp = Math.PI/p.wd; }
    else { const r = Math.sqrt(Math.max(0, a*a - w0*w0)); p.s1 = -a + r; p.s2 = -a - r; }
    return p;
  }
  function window_(ckt, P){
    if (ckt !== 'RLC') return 6*P.tau;
    if (P.zeta < 1) return Math.min(7/P.alpha, 25*TAU/P.wd);
    return 7/Math.abs(P.s1 || -P.alpha);
  }
  // first time a sampled signal crosses a level (linear interpolation)
  function crossTime(t, y, level){ for (let k = 1; k < y.length; k++) if ((y[k - 1] - level)*(y[k] - level) <= 0 && y[k] !== y[k - 1]) return t[k - 1] + (level - y[k - 1])/(y[k] - y[k - 1])*(t[k] - t[k - 1]); return NaN; }
  return {tunit, sim, H, params, window:window_, crossTime};
})();

(() => {
  'use strict';
  const MX = window.MX, PL = window.PLOT, CK = window.CKT, $ = id => document.getElementById(id);
  const reduceMotion = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const canvas = $('ckCanvas');
  const S = {ckt:'RLC', out:'C', R:40, L:10e-3, C:1e-6, V:5};
  let needs = true, phase = 0, data = null;
  const ctx = PL.fit(canvas, () => { needs = true; });
  // log sliders
  const SL = {
    R:{lo:0, hi:5, unit:'Ω', log:true}, L:{lo:-6, hi:1, unit:'H', log:true}, C:{lo:-12, hi:-2, unit:'F', log:true}, V:{lo:0.5, hi:24, unit:'V', log:false}
  };
  Object.entries(SL).forEach(([k, d]) => {
    const inp = $('ck' + k), out = $('ck' + k + 'o');
    const toV = x => d.log ? Math.pow(10, d.lo + (d.hi - d.lo)*x/1000) : +(d.lo + (d.hi - d.lo)*x/1000).toFixed(1);
    const fromV = v => d.log ? (Math.log10(v) - d.lo)/(d.hi - d.lo)*1000 : (v - d.lo)/(d.hi - d.lo)*1000;
    inp.min = 0; inp.max = 1000; inp.step = 1; inp.value = fromV(S[k]);
    const show = () => { out.value = MX.si(S[k], d.unit, 3); };
    inp.addEventListener('input', () => { S[k] = toV(+inp.value); show(); needs = true; data = null; });
    show();
  });
  function seg(id, key, onSet){
    const box = $(id);
    box.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { S[key] = b.dataset.v; sync(); onSet && onSet(); needs = true; data = null; }));
  }
  function sync(){
    $('ckCkt').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === S.ckt)));
    const allowed = S.ckt === 'RC' ? ['C', 'R'] : S.ckt === 'RL' ? ['L', 'R'] : ['C', 'R', 'L'];
    if (!allowed.includes(S.out)) S.out = allowed[0];
    $('ckOut').querySelectorAll('button').forEach(b => { b.hidden = !allowed.includes(b.dataset.v); b.setAttribute('aria-pressed', String(b.dataset.v === S.out)); });
    $('rowL').hidden = S.ckt === 'RC'; $('rowC').hidden = S.ckt === 'RL';
  }
  seg('ckCkt', 'ckt'); seg('ckOut', 'out'); sync();

  function compute(){
    const P = CK.params(S.ckt, S.R, S.L, S.C), T = CK.window(S.ckt, P), r = CK.sim(S.ckt, S.R, S.L, S.C, S.V, T);
    const fc = S.ckt === 'RLC' ? P.f0 : P.fc, fr = [fc/1000, fc*1000], fs = MX.logspace(Math.log10(fr[0]), Math.log10(fr[1]), 500);
    const Hs = fs.map(f => CK.H(S.ckt, S.out, S.R, S.L, S.C, f));
    return {P, T, r, fc, fr, fs, mag:Hs.map(h => 20*Math.log10(Math.hypot(h[0], h[1]))), ph:Hs.map(h => Math.atan2(h[1], h[0])*180/Math.PI)};
  }
  function readout(d){
    const P = d.P, lines = [];
    if (S.ckt !== 'RLC'){ lines.push(`τ = ${MX.si(P.tau, 's', 4)}`, `f<sub>c</sub> = ${MX.si(P.fc, 'Hz', 4)}`, `<span class="c">reaches 63.2% after τ, 99.3% after 5τ</span>`); }
    else {
      lines.push(`f<sub>0</sub> = ${MX.si(P.f0, 'Hz', 4)}`, `α = ${MX.fmt(P.alpha, 4)} s⁻¹`, `ζ = ${MX.fmt(P.zeta, 4)}, Q = ${MX.fmt(P.Q, 4)}`);
      if (P.zeta < 1) lines.push(`<span class="c">underdamped:</span> overshoot ${MX.fmt(100*P.Mp, 4)}% at t<sub>p</sub> = ${MX.si(P.tp, 's', 4)}`);
      else lines.push(`<span class="c">${Math.abs(P.zeta - 1) < 1e-9 ? 'critically damped' : 'overdamped'}: no overshoot</span>`);
    }
    $('ckRead').innerHTML = lines.join('<br>');
  }
  const COL = {C:'#8AB4F0', R:'#7CC6BE', L:'#E2B86F'};
  function draw(){
    if (!data){ data = compute(); readout(data); }
    const W = canvas._w, Hh = canvas._h; ctx.clearRect(0, 0, W, Hh);
    const d = data, [ts, tu] = CK.tunit(d.T), top = {x:58, y:28, w:W - 80, h:Hh*0.5 - 52};
    const sig = {C:d.r.vC, R:d.r.vR, L:d.r.vL};
    const all = ['C', 'R', 'L'].filter(k => S.ckt === 'RLC' || (S.ckt === 'RC' ? k !== 'L' : k !== 'C'));
    const vals = []; all.forEach(k => sig[k].forEach(v => vals.push(v)));
    const M = PL.frame(ctx, top, {xr:[0, d.T*ts], yr:PL.range(vals.concat([0, S.V]), .1), mode:'box', zeroLine:true, xlabel:`t (${tu})`, ylabel:'volts', title:'Step response'});
    all.forEach(k => { if (k !== S.out) PL.line(ctx, M, d.r.t.map((t, j) => [t*ts, sig[k][j]]), {color:COL[k], width:1.4, alpha:.45}); });
    PL.hline(ctx, M, S.V, {color:'rgba(255,255,255,.35)'});
    PL.line(ctx, M, d.r.t.map((t, j) => [t*ts, sig[S.out][j]]), {color:COL[S.out], width:2.8, glow:8});
    // a dot sweeping along the selected output, like a scope trace
    const j = Math.min(d.r.t.length - 1, Math.floor(phase*(d.r.t.length - 1)));
    PL.dot(ctx, M, d.r.t[j]*ts, sig[S.out][j], {color:'#fff', r:4.5});
    let lx = top.x + top.w - 34*all.length - 4; all.forEach(k => { PL.label(ctx, lx, top.y + 16, `v${k === 'C' ? '_C' : k === 'R' ? '_R' : '_L'}`.replace('_', ''), {color:COL[k], alpha:k === S.out ? 1 : .6}); lx += 34; });
    // frequency response of the selected output
    const by = top.y + top.h + 60, bh = Hh - by - 34, half = (W - 80 - 54)/2;
    const mb = {x:58, y:by, w:half, h:bh}, pb = {x:58 + half + 54, y:by, w:half, h:bh};
    const mags = d.mag.filter(isFinite), lo = Math.max(-100, Math.min(...mags)), hi = Math.max(...mags);
    const M2 = PL.frame(ctx, mb, {xr:d.fr, yr:[Math.floor((lo - 5)/10)*10, Math.max(5, Math.ceil((hi + 5)/10)*10)], xlog:true, mode:'box', xlabel:'f (Hz)', ylabel:'dB', title:'Gain'});
    PL.hline(ctx, M2, -3, {color:'rgba(255,255,255,.3)'}); PL.vline(ctx, M2, d.fc, {color:'rgba(226,184,111,.55)'});
    PL.line(ctx, M2, d.fs.map((f, k) => [f, d.mag[k]]), {color:COL[S.out], width:2.4, glow:6});
    const M3 = PL.frame(ctx, pb, {xr:d.fr, yr:[-180, 180], xlog:true, mode:'box', xlabel:'f (Hz)', ylabel:'deg', title:'Phase'});
    PL.hline(ctx, M3, 0, {color:'rgba(255,255,255,.25)', dash:[]}); PL.vline(ctx, M3, d.fc, {color:'rgba(226,184,111,.55)'});
    PL.line(ctx, M3, d.fs.map((f, k) => [f, d.ph[k]]), {color:COL[S.out], width:2.4, glow:6});
    PL.label(ctx, M2.X(d.fc) + 5, mb.y + 14, S.ckt === 'RLC' ? 'f₀' : 'f_c'.replace('_c', 'c'), {color:'#E2B86F', size:11});
  }
  let last = performance.now();
  function loop(t){
    const dt = Math.min(64, t - last)/1000; last = t;
    if (!reduceMotion){ phase = (phase + dt/3.2) % 1; needs = true; } else phase = 1;
    if (needs){ needs = false; draw(); }
    requestAnimationFrame(loop);
  }
  $('hPlay') && $('hPlay').addEventListener('click', () => $('play').scrollIntoView({behavior: reduceMotion ? 'auto' : 'smooth'}));
  window.__ck = {S, get data(){ return data || compute(); }, set(k, v){ S[k] = v; sync(); data = null; needs = true; }};
  requestAnimationFrame(loop);
})();

// ---------------- step-by-step questions ----------------
window.FORMULA_PAGE = (G) => {
  'use strict';
  const MX = window.MX, PL = window.PLOT, CK = window.CKT, TAU = 2*Math.PI;
  const si = (v, u, s = 4) => MX.si(v, u, s), n4 = (v, s = 4) => MX.fmt(v, s);
  const cardsHTML = cards => `<div class="answer">${cards.filter(Boolean).map(c => `<div class="ans ${c.tone || 'y'}"><div class="k">${c.k}</div><div class="v">${c.v}</div><div class="s">${c.s || ''}</div></div>`).join('')}</div>`;
  const MODE_OF = m => MODES.find(x => x.id === m.id);
  const answerStep = () => ({ dur:1600, show:[], info: m => ({ title:'Answer', body: cardsHTML(MODE_OF(m).answer(m)) + (MODE_OF(m).note ? `<p>${MODE_OF(m).note(m)}</p>` : ''), work:'' }) });
  const pos = (v, what) => { if (!(v > 0) || !isFinite(v)) throw new Error(`${what} must be a positive number.`); };
  const fin = (v, what) => { if (!isFinite(v)) throw new Error(`Enter a number for ${what}.`); };
  // a curve drawn up to fraction k of its length
  const upto = (pts, k) => pts.slice(0, Math.max(2, Math.round(pts.length*Math.min(1, k))));
  const twoBoxes = S => { const x = 64, w = S.W - 90, h = (S.H - 112)/2; return [{x, y:30, w, h}, {x, y:30 + h + 52, w, h}]; };
  function arrow(ctx, x1, y1, x2, y2, color, w = 2.6, alpha = 1, glow = 0){
    if (alpha <= 0) return;
    const a = Math.atan2(y2 - y1, x2 - x1), L = Math.hypot(x2 - x1, y2 - y1), hl = Math.min(12, L*.35);
    ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round';
    /* no glow in the calm theme */
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 - Math.cos(a)*hl*.6, y2 - Math.sin(a)*hl*.6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - hl*Math.cos(a - .38), y2 - hl*Math.sin(a - .38)); ctx.lineTo(x2 - hl*Math.cos(a + .38), y2 - hl*Math.sin(a + .38)); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  const GLYPH = {
    rc:'<path d="M3 26 C8 12, 14 7, 29 6"/><path d="M3 26 H29" opacity=".5"/><path d="M3 6 H29" stroke-dasharray="2 3" opacity=".6"/>',
    rl:'<path d="M3 26 C8 12, 14 7, 29 6"/><path d="M3 26 C6 22,8 22,10 26 C12 22,14 22,16 26" opacity=".7"/>',
    rlc:'<path d="M3 26 C7 4, 10 4, 13 14 S 19 20, 22 15 S 27 13, 29 14"/><path d="M3 14 H29" stroke-dasharray="2 3" opacity=".6"/>',
    res:'<path d="M3 27 C10 26, 13 22, 16 5 C19 22, 22 26, 29 27"/><path d="M3 14 H29" stroke-dasharray="2 3" opacity=".6"/>',
    ac:'<path d="M6 26 V8"/><path d="M6 26 H26"/><path d="M6 26 L22 10"/><circle cx="22" cy="10" r="2" fill="currentColor" stroke="none"/>',
    filt:'<path d="M3 9 H15 C19 9, 21 12, 29 26"/><path d="M15 4 V28" stroke-dasharray="2 3" opacity=".6"/>'
  };
  const glyph = k => `<svg viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${GLYPH[k]}</svg>`;
  const tline = (m, f, T, ts) => { const p = []; for (let k = 0; k <= 400; k++){ const t = T*k/400; p.push([t*ts, f(t)]); } return p; };

  // first-order transient scene: top plot and bottom plot share the time axis, with τ markers
  function firstOrderScene(m, S, top, bot){
    const ctx = G.ctx(), [b1, b2] = twoBoxes(S), [ts, tu] = CK.tunit(m.T), xr = [0, m.T*ts], k = S.vis('curve');
    [[b1, top], [b2, bot]].forEach(([bx, sp]) => {
      const pts = tline(m, sp.f, m.T, ts), M = PL.frame(ctx, bx, {xr, yr:PL.range(pts.map(p => p[1]).concat([0, sp.final, sp.start]), .12), mode:'box', zeroLine:true, xlabel:`t (${tu})`, ylabel:sp.label});
      PL.hline(ctx, M, sp.final, {color:'rgba(255,255,255,.4)', alpha:S.vis('final')});
      if (S.vis('final') > .5) PL.label(ctx, M.box.x + M.box.w - 6, M.Y(sp.final) - 6, `final ${sp.fmt(sp.final)}`, {color:'#D5DCE4', size:11, align:'right', alpha:S.vis('final')});
      const vt = S.vis('tau'); if (vt > 0) for (let n = 1; n <= 5; n++){ const x = n*m.tau; if (x <= m.T){ PL.vline(ctx, M, x*ts, {color:'rgba(226,184,111,.5)', alpha:vt}); if (sp === top) PL.label(ctx, M.X(x*ts) + 3, M.box.y + 13, `${n}τ`, {color:'#E2B86F', size:11, alpha:vt}); } }
      PL.line(ctx, M, upto(pts, k), {color:sp.color, width:2.8, glow:8});
      const vq = S.vis('query'); if (vq > 0) PL.dot(ctx, M, m.t*ts, sp.f(m.t), {color:'#fff', r:6, alpha:vq, label:sp.fmt(sp.f(m.t))});
    });
  }

  const MODES = [
    { id:'rc', title:'RC charging and discharging', desc:'Capacitor voltage and current after a switch, with τ = RC', glyph:glyph('rc'),
      fields:['R', 'C', 'Vs', 'V0', 't'], defaults:{R:'10', R_u:'kΩ', C:'100', C_u:'µF', Vs:'12', V0:'0', t:'1.5', t_u:'s'},
      compute: v => {
        pos(v.R, 'R'); pos(v.C, 'C'); fin(v.Vs, 'the source voltage'); fin(v.V0, 'the starting voltage'); if (!(v.t >= 0)) throw new Error('t must be zero or more.');
        if (v.Vs === v.V0) throw new Error('The capacitor already sits at the source voltage, so nothing changes. Use a different V₀ or Vs.');
        const tau = v.R*v.C, vc = t => v.Vs + (v.V0 - v.Vs)*Math.exp(-t/tau), ic = t => (v.Vs - v.V0)/v.R*Math.exp(-t/tau);
        return {id:'rc', ...v, tau, vc, ic, vt:vc(v.t), it:ic(v.t), T:Math.max(5*tau, 1.15*v.t), charging: v.Vs > v.V0};
      },
      problem: m => ({ chips:[`R = ${si(m.R, 'Ω')}`, `C = ${si(m.C, 'F')}`, `V<sub>s</sub> = ${si(m.Vs, 'V')}`, `v<sub>C</sub>(0) = ${si(m.V0, 'V')}`, `t = ${si(m.t, 's')}`] }),
      steps: () => [
        { dur:2000, show:['final'], info: m => ({ title:'Start and end values', body:`<p>A capacitor's voltage cannot jump, so it starts at v<sub>C</sub>(0). After a long time no current flows and it settles at the source voltage.</p>`, work:`v<sub>C</sub>(0) = ${si(m.V0, 'V')}<br>v<sub>C</sub>(∞) = ${si(m.Vs, 'V')}<br>i(0) = (V<sub>s</sub> − v<sub>C</sub>(0))/R = ${si((m.Vs - m.V0)/m.R, 'A')}` }),
          rd: m => ['Initial current i(0)', si((m.Vs - m.V0)/m.R, 'A')] },
        { dur:2200, show:['tau'], info: m => ({ title:'Time constant', body:'<p>τ = RC sets the speed. Each τ the remaining gap to the final value shrinks to 36.8%.</p>', work:`τ = RC = ${si(m.R, 'Ω')} × ${si(m.C, 'F')} = <b>${si(m.tau, 's')}</b><br>5τ = ${si(5*m.tau, 's')} (within 1% of the end)` }),
          rd: m => ['Time constant τ = RC', si(m.tau, 's')] },
        { dur:3000, show:['curve'], info: m => ({ title: m.charging ? 'Charging curve' : 'Discharging curve', body:'<p>Every first-order circuit follows the same shape: final + (initial − final)·e<sup>−t/τ</sup>.</p>', work:`v<sub>C</sub>(t) = ${n4(m.Vs)} + (${n4(m.V0)} − ${n4(m.Vs)}) e<sup>−t/${n4(m.tau)}</sup> V<br>i(t) = ${si((m.Vs - m.V0)/m.R, 'A')} · e<sup>−t/τ</sup>` }) },
        { dur:2200, show:['query'], info: m => ({ title:`At t = ${si(m.t, 's')}`, body:'<p>Put the time into both expressions.</p>', work:`t/τ = ${n4(m.t/m.tau)}, e<sup>−t/τ</sup> = ${n4(Math.exp(-m.t/m.tau))}<br>v<sub>C</sub> = <b>${si(m.vt, 'V')}</b><br>i = <b>${si(m.it, 'A')}</b><br>v<sub>R</sub> = iR = ${si(m.it*m.R, 'V')}` }),
          rd: m => [[`v<sub>C</sub>(${si(m.t, 's')})`, si(m.vt, 'V')], [`i(${si(m.t, 's')})`, si(m.it, 'A')]] },
        answerStep()],
      answer: m => [{tone:'y', k:`v<sub>C</sub> at ${si(m.t, 's')}`, v:si(m.vt, 'V'), s:`i = ${si(m.it, 'A')}`}, {tone:'s1', k:'Time constant', v:si(m.tau, 's'), s:`5τ = ${si(5*m.tau, 's')}`}],
      scene: (m, S) => firstOrderScene(m, S,
        {f:m.vc, final:m.Vs, start:m.V0, label:'v_C (V)'.replace('_C', 'C'), color:'#8AB4F0', fmt:v => si(v, 'V', 3)},
        {f:m.ic, final:0, start:(m.Vs - m.V0)/m.R, label:'i (A)', color:'#7CC6BE', fmt:v => si(v, 'A', 3)}) },

    { id:'rl', title:'RL current rise and decay', desc:'Inductor current and voltage after a switch, with τ = L/R', glyph:glyph('rl'),
      fields:['R', 'L', 'Vs', 'I0', 't'], defaults:{R:'100', R_u:'Ω', L:'50', L_u:'mH', Vs:'10', I0:'0', I0_u:'mA', t:'1', t_u:'ms'},
      compute: v => {
        pos(v.R, 'R'); pos(v.L, 'L'); fin(v.Vs, 'the source voltage'); fin(v.I0, 'the starting current'); if (!(v.t >= 0)) throw new Error('t must be zero or more.');
        const tau = v.L/v.R, If = v.Vs/v.R;
        if (Math.abs(If - v.I0) < 1e-15) throw new Error('The current already equals Vs/R, so nothing changes.');
        const il = t => If + (v.I0 - If)*Math.exp(-t/tau), vl = t => (v.Vs - v.R*v.I0)*Math.exp(-t/tau);
        return {id:'rl', ...v, tau, If, il, vl, it:il(v.t), vt:vl(v.t), T:Math.max(5*tau, 1.15*v.t)};
      },
      problem: m => ({ chips:[`R = ${si(m.R, 'Ω')}`, `L = ${si(m.L, 'H')}`, `V<sub>s</sub> = ${si(m.Vs, 'V')}`, `i(0) = ${si(m.I0, 'A')}`, `t = ${si(m.t, 's')}`] }),
      steps: () => [
        { dur:2000, show:['final'], info: m => ({ title:'Start and end values', body:'<p>An inductor current cannot jump, so it starts at i(0). In the steady state the inductor is a short circuit and the current is V<sub>s</sub>/R.</p>', work:`i(0) = ${si(m.I0, 'A')}<br>i(∞) = V<sub>s</sub>/R = ${si(m.If, 'A')}<br>v<sub>L</sub>(0) = V<sub>s</sub> − R·i(0) = ${si(m.Vs - m.R*m.I0, 'V')}` }),
          rd: m => ['Final current V<sub>s</sub>/R', si(m.If, 'A')] },
        { dur:2200, show:['tau'], info: m => ({ title:'Time constant', body:'<p>For an inductor τ = L/R: a bigger L or a smaller R makes the current change more slowly.</p>', work:`τ = L/R = ${si(m.L, 'H')} / ${si(m.R, 'Ω')} = <b>${si(m.tau, 's')}</b>` }),
          rd: m => ['Time constant τ = L/R', si(m.tau, 's')] },
        { dur:3000, show:['curve'], info: m => ({ title:'Current and inductor voltage', body:'<p>The current approaches its final value exponentially, and v<sub>L</sub> = L di/dt dies away with the same τ.</p>', work:`i(t) = ${si(m.If, 'A')} + (${si(m.I0, 'A')} − ${si(m.If, 'A')}) e<sup>−t/τ</sup><br>v<sub>L</sub>(t) = ${si(m.Vs - m.R*m.I0, 'V')} · e<sup>−t/τ</sup>` }) },
        { dur:2200, show:['query'], info: m => ({ title:`At t = ${si(m.t, 's')}`, body:'<p>Put the time into both expressions.</p>', work:`t/τ = ${n4(m.t/m.tau)}<br>i = <b>${si(m.it, 'A')}</b><br>v<sub>L</sub> = <b>${si(m.vt, 'V')}</b><br>v<sub>R</sub> = ${si(m.R*m.it, 'V')}` }),
          rd: m => [[`i(${si(m.t, 's')})`, si(m.it, 'A')], [`v<sub>L</sub>(${si(m.t, 's')})`, si(m.vt, 'V')]] },
        answerStep()],
      answer: m => [{tone:'y', k:`i at ${si(m.t, 's')}`, v:si(m.it, 'A'), s:`v<sub>L</sub> = ${si(m.vt, 'V')}`}, {tone:'s1', k:'Time constant', v:si(m.tau, 's'), s:`final current ${si(m.If, 'A')}`}],
      scene: (m, S) => firstOrderScene(m, S,
        {f:m.il, final:m.If, start:m.I0, label:'i (A)', color:'#7CC6BE', fmt:v => si(v, 'A', 3)},
        {f:m.vl, final:0, start:m.Vs - m.R*m.I0, label:'vL (V)', color:'#E2B86F', fmt:v => si(v, 'V', 3)}) },

    { id:'rlc', title:'Series RLC step response', desc:'Damping, ζ, natural frequency, overshoot and settling', glyph:glyph('rlc'),
      fields:['R', 'L', 'C', 'Vs'], defaults:{R:'40', R_u:'Ω', L:'10', L_u:'mH', C:'1', C_u:'µF', Vs:'5'},
      compute: v => {
        pos(v.R, 'R'); pos(v.L, 'L'); pos(v.C, 'C'); fin(v.Vs, 'the source voltage'); if (v.Vs === 0) throw new Error('Use a non-zero step voltage.');
        const P = CK.params('RLC', v.R, v.L, v.C), a = P.alpha, w0 = P.w0, V = v.Vs;
        let vc, kind;
        if (Math.abs(P.zeta - 1) < 1e-9){ kind = 'critical'; vc = t => V*(1 - (1 + a*t)*Math.exp(-a*t)); }
        else if (P.zeta < 1){ kind = 'under'; const wd = P.wd; vc = t => V*(1 - Math.exp(-a*t)*(Math.cos(wd*t) + a/wd*Math.sin(wd*t))); }
        else { kind = 'over'; const s1 = P.s1, s2 = P.s2; vc = t => V*(1 + (s2*Math.exp(s1*t) - s1*Math.exp(s2*t))/(s1 - s2)); }
        const T = CK.window('RLC', P), N = 20000, ts = [], ys = [];
        for (let k = 0; k <= N; k++){ const t = T*k/N; ts.push(t); ys.push(vc(t)); }
        const tr = CK.crossTime(ts, ys, .9*V) - CK.crossTime(ts, ys, .1*V);
        let tsExact = 0; for (let k = N; k >= 0; k--) if (Math.abs(ys[k] - V) > .02*Math.abs(V)){ tsExact = ts[Math.min(N, k + 1)]; break; }
        return {id:'rlc', ...v, P, kind, vc, T, tr, ts2:tsExact, ts4:4/a};
      },
      problem: m => ({ chips:[`R = ${si(m.R, 'Ω')}`, `L = ${si(m.L, 'H')}`, `C = ${si(m.C, 'F')}`, `step ${si(m.Vs, 'V')}`] }),
      steps: () => [
        { dur:2400, show:[], info: m => ({ title:'The characteristic equation', body:'<p>KVL around the loop gives a second-order equation for v<sub>C</sub>. Its roots decide the shape.</p>', work:`LC v″ + RC v′ + v = V<sub>s</sub><br>s² + (R/L)s + 1/(LC) = 0<br>α = R/2L = <b>${n4(m.P.alpha)} s⁻¹</b><br>ω₀ = 1/√(LC) = <b>${n4(m.P.w0)} rad/s</b> (f₀ = ${si(m.P.f0, 'Hz')})` }),
          rd: m => ['α = R/2L', `${n4(m.P.alpha)} s⁻¹`] },
        { dur:2400, show:[], info: m => ({ title: m.kind === 'under' ? 'Underdamped (ζ < 1)' : m.kind === 'critical' ? 'Critically damped (ζ = 1)' : 'Overdamped (ζ > 1)', body:'<p>The damping ratio compares α with ω₀. Below 1 the roots are complex and the voltage rings; above 1 they are real and it creeps up.</p>', work:`ζ = α/ω₀ = <b>${n4(m.P.zeta)}</b><br>` + (m.kind === 'under' ? `s = −α ± jω<sub>d</sub>, ω<sub>d</sub> = ω₀√(1 − ζ²) = ${n4(m.P.wd)} rad/s` : m.kind === 'critical' ? 's = −α (double root)' : `s₁ = ${n4(m.P.s1)}, s₂ = ${n4(m.P.s2)} s⁻¹`) }),
          rd: m => ['ω₀, ζ', `${n4(m.P.w0)} rad/s, ${n4(m.P.zeta)}`] },
        { dur:3200, show:['curve'], info: m => ({ title:'The response', body:'<p>With the capacitor uncharged and no current at t = 0:</p>', work: m.kind === 'under' ? `v<sub>C</sub>(t) = V<sub>s</sub>[1 − e<sup>−αt</sup>(cos ω<sub>d</sub>t + (α/ω<sub>d</sub>) sin ω<sub>d</sub>t)]` : m.kind === 'critical' ? 'v<sub>C</sub>(t) = V<sub>s</sub>[1 − (1 + αt)e<sup>−αt</sup>]' : 'v<sub>C</sub>(t) = V<sub>s</sub>[1 + (s₂e<sup>s₁t</sup> − s₁e<sup>s₂t</sup>)/(s₁ − s₂)]' }) },
        { dur:3000, show:['specs'], info: m => ({ title:'Time-domain specs', body: m.kind === 'under' ? '<p>Peak time and overshoot come straight from ζ and ω<sub>d</sub>. The 2% settling time 4/α is the usual estimate; the exact value from the curve is shown too.</p>' : '<p>No overshoot. Rise and settling times are read from the curve.</p>',
            work: (m.kind === 'under' ? `t<sub>p</sub> = π/ω<sub>d</sub> = <b>${si(m.P.tp, 's')}</b><br>M<sub>p</sub> = e<sup>−ζπ/√(1−ζ²)</sup> = <b>${n4(100*m.P.Mp)}%</b> (peak ${si(m.Vs*(1 + m.P.Mp), 'V')})<br>t<sub>s</sub> ≈ 4/α = ${si(m.ts4, 's')}<br>` : '') + `rise time 10–90% = ${si(m.tr, 's')}<br>exact 2% settling = ${si(m.ts2, 's')}` }),
          rd: m => (m.kind === 'under' ? [['Overshoot, peak time', `${n4(100*m.P.Mp)}%, ${si(m.P.tp, 's')}`]] : []).concat([['Rise time 10–90%', si(m.tr, 's')], ['2% settling time', si(m.ts2, 's')]]) },
        answerStep()],
      answer: m => [{tone:'y', k:m.kind === 'under' ? 'Underdamped' : m.kind === 'critical' ? 'Critically damped' : 'Overdamped', v:`ζ = ${n4(m.P.zeta)}`, s:`ω₀ = ${n4(m.P.w0)} rad/s, α = ${n4(m.P.alpha)} s⁻¹`},
        m.kind === 'under' ? {tone:'s1', k:'Overshoot', v:`${n4(100*m.P.Mp)}%`, s:`peak at t<sub>p</sub> = ${si(m.P.tp, 's')}; settles (2%) in ${si(m.ts2, 's')}, 4/α = ${si(m.ts4, 's')}`} : {tone:'s1', k:'Rise time', v:si(m.tr, 's'), s:`settles (2%) in ${si(m.ts2, 's')}`}],
      scene: (m, S) => {
        const ctx = G.ctx(), [ts, tu] = CK.tunit(m.T), bx = {x:64, y:34, w:S.W - 90, h:S.H - 84}, pts = tline(m, m.vc, m.T, ts);
        const M = PL.frame(ctx, bx, {xr:[0, m.T*ts], yr:PL.range(pts.map(p => p[1]).concat([0, m.Vs*1.05]), .1), mode:'box', zeroLine:true, xlabel:`t (${tu})`, ylabel:'vC (V)'});
        PL.hline(ctx, M, m.Vs, {color:'rgba(255,255,255,.4)'});
        const vs = S.vis('specs');
        if (vs > 0){
          ctx.save(); ctx.globalAlpha = .14*vs; ctx.fillStyle = '#8FC79A'; const y1 = M.Y(m.Vs*1.02), y2 = M.Y(m.Vs*.98); ctx.fillRect(bx.x, Math.min(y1, y2), bx.w, Math.abs(y2 - y1)); ctx.restore();
          PL.vline(ctx, M, m.ts2*ts, {color:'#8FC79A', alpha:vs}); PL.label(ctx, M.X(m.ts2*ts) + 4, bx.y + 14, `t_s (2%)`.replace('_s', 's'), {color:'#8FC79A', size:11, alpha:vs});
          if (m.kind === 'under'){
            const env = t => m.Vs*Math.sqrt(1 + (m.P.alpha/m.P.wd)**2)*Math.exp(-m.P.alpha*t);
            PL.line(ctx, M, tline(m, t => m.Vs + env(t), m.T, ts), {color:'rgba(182,162,222,.7)', width:1.4, dash:[5, 4], alpha:vs});
            PL.line(ctx, M, tline(m, t => m.Vs - env(t), m.T, ts), {color:'rgba(182,162,222,.7)', width:1.4, dash:[5, 4], alpha:vs});
            PL.dot(ctx, M, m.P.tp*ts, m.Vs*(1 + m.P.Mp), {color:'#E2B86F', r:6, alpha:vs, label:`peak ${si(m.Vs*(1 + m.P.Mp), 'V', 3)} (+${n4(100*m.P.Mp, 3)}%)`});
          }
        }
        PL.line(ctx, M, upto(pts, S.vis('curve')), {color:'#8AB4F0', width:2.8, glow:8});
      } },

    { id:'resonance', title:'Resonance, Q and bandwidth', desc:'Series or parallel RLC: f₀, Q, half-power frequencies', glyph:glyph('res'),
      fields:['config', 'R', 'L', 'C', 'Vs'], defaults:{config:'series', R:'10', R_u:'Ω', L:'1', L_u:'mH', C:'10', C_u:'nF', Vs:'1'},
      compute: v => {
        pos(v.R, 'R'); pos(v.L, 'L'); pos(v.C, 'C');
        const w0 = 1/Math.sqrt(v.L*v.C), ser = v.config === 'series', Q = ser ? w0*v.L/v.R : w0*v.R*v.C, a = ser ? v.R/(2*v.L) : 1/(2*v.R*v.C);
        const w1 = -a + Math.sqrt(a*a + w0*w0), w2 = a + Math.sqrt(a*a + w0*w0), Bw = w2 - w1;
        if (ser){ fin(v.Vs, 'the source voltage'); pos(Math.abs(v.Vs), 'The source voltage'); }
        const resp = f => { const w = TAU*f, x = Q*(w/w0 - w0/w); return 1/Math.sqrt(1 + x*x); };
        return {id:'resonance', ...v, ser, w0, f0:w0/TAU, Q, a, f1:w1/TAU, f2:w2/TAU, BW:Bw/TAU, resp, I0: ser ? v.Vs/v.R : null};
      },
      problem: m => ({ chips:[m.ser ? 'series RLC' : 'parallel RLC', `R = ${si(m.R, 'Ω')}`, `L = ${si(m.L, 'H')}`, `C = ${si(m.C, 'F')}`].concat(m.ser ? [`V = ${si(m.Vs, 'V')}`] : []) }),
      steps: () => [
        { dur:2400, show:['curve', 'f0'], info: m => ({ title:'Resonant frequency', body:`<p>At resonance X<sub>L</sub> = X<sub>C</sub>, so the reactances cancel and the ${m.ser ? 'impedance is just R (minimum), so the current peaks' : 'admittance is just 1/R (minimum), so the impedance peaks at R'}.</p>`, work:`ω₀ = 1/√(LC) = ${n4(m.w0)} rad/s<br>f₀ = ω₀/2π = <b>${si(m.f0, 'Hz')}</b>` + (m.ser ? `<br>I<sub>max</sub> = V/R = ${si(m.I0, 'A')}` : `<br>Z<sub>max</sub> = R = ${si(m.R, 'Ω')}`) }),
          rd: m => ['f₀ = 1/(2π√LC)', si(m.f0, 'Hz')] },
        { dur:2400, show:[], info: m => ({ title:'Quality factor', body:'<p>Q measures how sharp the peak is: stored energy over energy lost per radian.</p>', work: m.ser ? `Q = ω₀L/R = (1/R)√(L/C) = <b>${n4(m.Q)}</b>` : `Q = ω₀RC = R√(C/L) = <b>${n4(m.Q)}</b>` }),
          rd: m => ['Quality factor Q', n4(m.Q)] },
        { dur:3000, show:['band'], info: m => ({ title:'Bandwidth and half-power points', body:'<p>The half-power frequencies are where the response drops to 1/√2 of the peak (−3 dB). They are not symmetric about f₀ on a linear scale; f₀ is their geometric mean.</p>', work:`BW = f₀/Q = <b>${si(m.BW, 'Hz')}</b><br>f₁ = ${si(m.f1, 'Hz')}<br>f₂ = ${si(m.f2, 'Hz')}<br>√(f₁f₂) = ${si(Math.sqrt(m.f1*m.f2), 'Hz')}` }),
          rd: m => [['Bandwidth', si(m.BW, 'Hz')], ['Half-power f₁, f₂', `${si(m.f1, 'Hz')}, ${si(m.f2, 'Hz')}`]] },
        answerStep()],
      answer: m => [{tone:'y', k:'Resonance', v:si(m.f0, 'Hz'), s:`Q = ${n4(m.Q)}`}, {tone:'s1', k:'Bandwidth', v:si(m.BW, 'Hz'), s:`${si(m.f1, 'Hz')} to ${si(m.f2, 'Hz')}`}],
      note: m => m.Q < 0.5 ? 'With Q this low the peak is very broad; the half-power points still follow the exact formulas used here.' : '',
      scene: (m, S) => {
        // a sharp peak reads best on a linear axis a few bandwidths wide; a broad one on a log axis
        const ctx = G.ctx(), lin = m.Q >= 2, span = Math.max(4, 3*m.f2/m.f0, 3*m.f0/m.f1), xr = lin ? [Math.max(m.f0 - 5*m.BW, m.f0*.02), m.f0 + 5*m.BW] : [m.f0/span, m.f0*span], bx = {x:64, y:34, w:S.W - 90, h:S.H - 84};
        const M = PL.frame(ctx, bx, {xr, yr:[0, 1.12], xlog:!lin, mode:'box', xlabel:'f (Hz)', ylabel: m.ser ? '|I| / Imax' : '|Z| / R'});
        const pts = (lin ? MX.linspace(xr[0], xr[1], 800) : MX.logspace(Math.log10(xr[0]), Math.log10(xr[1]), 600)).map(f => [f, m.resp(f)]);
        const vb = S.vis('band');
        if (vb > 0){ ctx.save(); ctx.globalAlpha = .16*vb; ctx.fillStyle = '#7CC6BE'; ctx.fillRect(M.X(m.f1), bx.y, M.X(m.f2) - M.X(m.f1), bx.h); ctx.restore();
          PL.hline(ctx, M, Math.SQRT1_2, {color:'rgba(124,198,190,.7)', alpha:vb}); PL.label(ctx, bx.x + 6, M.Y(Math.SQRT1_2) - 6, '1/√2 (−3 dB)', {color:'#7CC6BE', size:11, alpha:vb});
          [[m.f1, 'f₁', 'right', -6], [m.f2, 'f₂', 'left', 6]].forEach(([f, l, al, dx]) => { PL.dot(ctx, M, f, Math.SQRT1_2, {color:'#7CC6BE', r:5, alpha:vb}); PL.label(ctx, M.X(f) + dx, M.Y(Math.SQRT1_2) + 18, l, {color:'#7CC6BE', align:al, alpha:vb}); }); }
        PL.line(ctx, M, upto(pts, S.vis('curve')), {color:'#8AB4F0', width:2.8, glow:8});
        const vf = S.vis('f0'); if (vf > 0){ PL.vline(ctx, M, m.f0, {color:'rgba(226,184,111,.7)', alpha:vf}); PL.dot(ctx, M, m.f0, 1, {color:'#E2B86F', r:6, alpha:vf, label:`f₀ = ${si(m.f0, 'Hz', 3)}`}); }
      } },

    { id:'ac', title:'AC series RLC phasors', desc:'Impedance, current, element voltages, power factor and power', glyph:glyph('ac'),
      fields:['R', 'L', 'C', 'f', 'Vs'], defaults:{R:'30', R_u:'Ω', L:'200', L_u:'mH', C:'100', C_u:'µF', f:'50', f_u:'Hz', Vs:'230'},
      compute: v => {
        pos(v.R, 'R'); pos(v.L, 'L'); pos(v.C, 'C'); pos(v.f, 'f'); pos(v.Vs, 'The rms voltage');
        const w = TAU*v.f, XL = w*v.L, XC = 1/(w*v.C), X = XL - XC, Z = Math.hypot(v.R, X), th = Math.atan2(X, v.R), I = v.Vs/Z;
        return {id:'ac', ...v, w, XL, XC, X, Z, th, I, VR:I*v.R, VL:I*XL, VC:I*XC, pf:Math.cos(th), P:I*I*v.R, Qr:I*I*X, S:v.Vs*I};
      },
      problem: m => ({ chips:[`R = ${si(m.R, 'Ω')}`, `L = ${si(m.L, 'H')}`, `C = ${si(m.C, 'F')}`, `f = ${si(m.f, 'Hz')}`, `V = ${si(m.Vs, 'V')} rms`] }),
      steps: () => [
        { dur:2200, show:['z'], info: m => ({ title:'Reactances', body:'<p>The inductor opposes change more at high frequency, the capacitor less.</p>', work:`ω = 2πf = ${n4(m.w)} rad/s<br>X<sub>L</sub> = ωL = <b>${si(m.XL, 'Ω')}</b><br>X<sub>C</sub> = 1/(ωC) = <b>${si(m.XC, 'Ω')}</b>` }),
          rd: m => ['X<sub>L</sub>, X<sub>C</sub>', `${si(m.XL, 'Ω')}, ${si(m.XC, 'Ω')}`] },
        { dur:2400, show:['z'], info: m => ({ title:'Impedance', body:`<p>In series the impedances add: Z = R + j(X<sub>L</sub> − X<sub>C</sub>). The circuit is ${m.X > 0 ? 'inductive, so current lags' : m.X < 0 ? 'capacitive, so current leads' : 'resistive (at resonance)'}.</p>`, work:`Z = ${n4(m.R)} ${m.X < 0 ? '−' : '+'} j${n4(Math.abs(m.X))} Ω<br>|Z| = √(R² + X²) = <b>${si(m.Z, 'Ω')}</b><br>θ = atan(X/R) = <b>${n4(m.th*180/Math.PI)}°</b>` }),
          rd: m => ['|Z|, angle', `${si(m.Z, 'Ω')}, ${n4(m.th*180/Math.PI)}°`] },
        { dur:3000, show:['ph'], info: m => ({ title:'Current and element voltages', body:'<p>Take the current as reference. V<sub>R</sub> is in phase with it, V<sub>L</sub> leads by 90°, V<sub>C</sub> lags by 90°. Their phasor sum is the source voltage, even though V<sub>L</sub> or V<sub>C</sub> alone can exceed it.</p>', work:`I = V/|Z| = <b>${si(m.I, 'A')}</b><br>V<sub>R</sub> = IR = ${si(m.VR, 'V')}<br>V<sub>L</sub> = IX<sub>L</sub> = ${si(m.VL, 'V')}<br>V<sub>C</sub> = IX<sub>C</sub> = ${si(m.VC, 'V')}<br>√(V<sub>R</sub>² + (V<sub>L</sub> − V<sub>C</sub>)²) = ${si(Math.hypot(m.VR, m.VL - m.VC), 'V')}` }),
          rd: m => ['Current I (rms)', si(m.I, 'A')] },
        { dur:2400, show:['pw'], info: m => ({ title:'Power', body:'<p>Only the resistor dissipates real power. The reactive power swaps back and forth between the fields.</p>', work:`pf = cos θ = <b>${n4(m.pf)}</b> ${m.X > 0 ? 'lagging' : m.X < 0 ? 'leading' : 'unity'}<br>P = I²R = <b>${si(m.P, 'W')}</b><br>Q = I²X = ${si(m.Qr, 'VAR')}<br>S = VI = ${si(m.S, 'VA')}` }),
          rd: m => [['Power factor', `${n4(m.pf)} ${m.X > 0 ? 'lagging' : m.X < 0 ? 'leading' : ''}`], ['P, Q, S', `${si(m.P, 'W')}, ${si(m.Qr, 'VAR')}, ${si(m.S, 'VA')}`]] },
        answerStep()],
      answer: m => [{tone:'y', k:'Impedance |Z| ∠θ', v:`${si(m.Z, 'Ω')} ∠${n4(m.th*180/Math.PI, 3)}°`, s:`I = ${si(m.I, 'A')} rms`}, {tone:'s1', k:'Power', v:`P = ${si(m.P, 'W')}`, s:`pf ${n4(m.pf)} ${m.X > 0 ? 'lagging' : m.X < 0 ? 'leading' : ''}`}],
      scene: (m, S) => {
        const ctx = G.ctx(), W = S.W, H = S.H, half = W*0.56;
        // phasor diagram on the left: VR along I, VL up, VC down, Vs the sum
        const vz = S.vis('ph'), maxV = Math.max(m.VR, m.VL, m.VC, m.Vs), cx = 70, cy = H/2, sc = Math.min(half - 120, H/2 - 50)/maxV;
        G.text('Phasors (current as reference)', 24, 30, {size:13, weight:700});
        G.line(cx - 20, cy, half - 10, cy, 'rgba(255,255,255,.25)', 1); G.line(cx, 46, cx, H - 30, 'rgba(255,255,255,.25)', 1);
        if (vz > 0){
          const k = G.ease(vz), ex = cx + m.VR*sc*k, eL = cy - m.VL*sc*k, eC = cy + m.VC*sc*k;
          arrow(ctx, cx, cy, cx + Math.min(half - 150, 60 + m.I*0), cy, '#D5DCE4', 2, .6); G.text('I', cx + Math.min(half - 150, 60) + 4, cy - 8, {color:'#D5DCE4', size:12});
          arrow(ctx, cx, cy, ex, cy, '#7CC6BE', 3, 1, 6); G.text(`VR ${si(m.VR, 'V', 3)}`, ex - 4, cy + 20, {color:'#7CC6BE', align:'right', size:12, halo:true});
          arrow(ctx, ex, cy, ex, eL, '#E2B86F', 3, 1, 6); G.text(`VL ${si(m.VL, 'V', 3)}`, ex + 10, (cy + eL)/2, {color:'#E2B86F', size:12, halo:true});
          arrow(ctx, ex, eL, ex, eL + m.VC*sc*k, '#B6A2DE', 3, 1, 6); G.text(`VC ${si(m.VC, 'V', 3)}`, ex - 10, eL + m.VC*sc*k*.5, {color:'#B6A2DE', size:12, halo:true, align:'right'});
          arrow(ctx, cx, cy, ex, cy - (m.VL - m.VC)*sc*k, '#8AB4F0', 3.4, 1, 10); G.text(`V ${si(m.Vs, 'V', 3)}`, (cx + ex)/2 - 10, cy - (m.VL - m.VC)*sc*k/2 - 10, {color:'#8AB4F0', size:12.5, halo:true, align:'right'});
          void eC;
        }
        // impedance triangle on the right
        const vzT = S.vis('z'), rx = half + 30, rw = W - rx - 30, maxZ = Math.max(m.R, Math.abs(m.X), 1e-12), zs = Math.min(rw*0.8, H*0.36)/Math.max(m.R, Math.abs(m.X)), by = H/2 + (m.X > 0 ? 70 : -70);
        G.text('Impedance triangle', rx, 30, {size:13, weight:700});
        if (vzT > 0){
          const k = G.ease(vzT), x2 = rx + m.R*zs*k, y2 = by - m.X*zs*k;
          arrow(ctx, rx, by, x2, by, '#7CC6BE', 2.6, 1); G.text(`R ${si(m.R, 'Ω', 3)}`, (rx + x2)/2, by + (m.X > 0 ? 18 : -10), {color:'#7CC6BE', align:'center', size:12, halo:true});
          arrow(ctx, x2, by, x2, y2, '#E2B86F', 2.6, 1); G.text(`X ${si(m.X, 'Ω', 3)}`, x2 + 8, (by + y2)/2, {color:'#E2B86F', size:12, halo:true});
          arrow(ctx, rx, by, x2, y2, '#8AB4F0', 3, 1, 8); G.text(`|Z| ${si(m.Z, 'Ω', 3)}`, (rx + x2)/2 - 8, (by + y2)/2 + (m.X >= 0 ? -8 : 18), {color:'#8AB4F0', size:12.5, halo:true, align:'right'});
          G.text(`θ = ${n4(m.th*180/Math.PI, 3)}°`, rx + 26, by + (m.X > 0 ? -8 : 18), {color:'#fff', size:12, halo:true});
          void maxZ;
        }
        const vp = S.vis('pw'); if (vp > 0){ G.text(`pf ${n4(m.pf, 3)} ${m.X > 0 ? 'lagging' : m.X < 0 ? 'leading' : ''}   P = ${si(m.P, 'W', 3)}`, rx, H - 26, {color:'#8FC79A', size:13, a:vp, weight:700}); }
      } },

    { id:'filter', title:'First-order RC filter', desc:'Cut-off frequency, gain in dB and phase on a Bode plot', glyph:glyph('filt'),
      fields:['ftype', 'R', 'C', 'f'], defaults:{ftype:'low', R:'1', R_u:'kΩ', C:'100', C_u:'nF', f:'5', f_u:'kHz'},
      compute: v => {
        pos(v.R, 'R'); pos(v.C, 'C'); pos(v.f, 'f');
        const fc = 1/(TAU*v.R*v.C), low = v.ftype === 'low', Hf = f => { const r = f/fc; return low ? [1/(1 + r*r), -r/(1 + r*r)] : [r*r/(1 + r*r), r/(1 + r*r)]; };
        const h = Hf(v.f), mag = Math.hypot(h[0], h[1]), ph = Math.atan2(h[1], h[0])*180/Math.PI;
        return {id:'filter', ...v, low, fc, Hf, mag, dB:20*Math.log10(mag), ph};
      },
      problem: m => ({ chips:[m.low ? 'RC low-pass' : 'RC high-pass', `R = ${si(m.R, 'Ω')}`, `C = ${si(m.C, 'F')}`, `f = ${si(m.f, 'Hz')}`] }),
      steps: () => [
        { dur:2200, show:['fc'], info: m => ({ title:'Cut-off frequency', body:'<p>At f<sub>c</sub> the capacitor reactance equals R, the gain is 1/√2 (−3 dB) and the phase is ±45°.</p>', work:`f<sub>c</sub> = 1/(2πRC) = <b>${si(m.fc, 'Hz')}</b>` }), rd: m => ['Cut-off f<sub>c</sub>', si(m.fc, 'Hz')] },
        { dur:2600, show:['curve', 'asym'], info: m => ({ title:'Transfer function', body:`<p>${m.low ? 'Taking the output across C, low frequencies pass and the gain falls 20 dB per decade above f<sub>c</sub>.' : 'Taking the output across R, high frequencies pass and the gain rises 20 dB per decade below f<sub>c</sub>.'} The dashed lines are the straight-line Bode asymptotes.</p>`, work: m.low ? 'H(jf) = 1 / (1 + j f/f<sub>c</sub>)' : 'H(jf) = (j f/f<sub>c</sub>) / (1 + j f/f<sub>c</sub>)' }) },
        { dur:2600, show:['pt'], info: m => ({ title:`At f = ${si(m.f, 'Hz')}`, body:'<p>Put the frequency ratio into H.</p>', work:`f/f<sub>c</sub> = ${n4(m.f/m.fc)}<br>|H| = ${m.low ? '1/√(1 + (f/f<sub>c</sub>)²)' : '(f/f<sub>c</sub>)/√(1 + (f/f<sub>c</sub>)²)'} = <b>${n4(m.mag)}</b><br>gain = 20 log|H| = <b>${n4(m.dB)} dB</b><br>phase = ${m.low ? '−atan(f/f<sub>c</sub>)' : '90° − atan(f/f<sub>c</sub>)'} = <b>${n4(m.ph)}°</b>` }),
          rd: m => [['|H|, gain', `${n4(m.mag)}, ${n4(m.dB)} dB`], ['Phase', `${n4(m.ph)}°`]] },
        answerStep()],
      answer: m => [{tone:'y', k:'Cut-off frequency', v:si(m.fc, 'Hz'), s: m.low ? 'low-pass' : 'high-pass'}, {tone:'s1', k:`At ${si(m.f, 'Hz')}`, v:`${n4(m.dB)} dB, ${n4(m.ph)}°`, s:`|H| = ${n4(m.mag)}`}],
      scene: (m, S) => {
        const ctx = G.ctx(), [b1, b2] = twoBoxes(S), xr = [Math.min(m.fc, m.f)/100, Math.max(m.fc, m.f)*100], fs = MX.logspace(Math.log10(xr[0]), Math.log10(xr[1]), 500);
        const H = fs.map(m.Hf), mag = H.map(h => 20*Math.log10(Math.hypot(h[0], h[1]))), ph = H.map(h => Math.atan2(h[1], h[0])*180/Math.PI);
        const M1 = PL.frame(ctx, b1, {xr, yr:[Math.max(-80, Math.floor(Math.min(...mag)/10)*10 - 5), 5], xlog:true, mode:'box', ylabel:'gain (dB)'});
        const M2 = PL.frame(ctx, b2, {xr, yr: m.low ? [-100, 10] : [-10, 100], xlog:true, mode:'box', ylabel:'phase (°)', xlabel:'f (Hz)'});
        const vf = S.vis('fc'); [M1, M2].forEach(M => PL.vline(ctx, M, m.fc, {color:'rgba(226,184,111,.7)', alpha:vf}));
        PL.hline(ctx, M1, -3, {color:'rgba(255,255,255,.3)', alpha:vf}); if (vf > 0) PL.label(ctx, M1.X(m.fc) + 5, b1.y + 14, `fc = ${si(m.fc, 'Hz', 3)}`, {color:'#E2B86F', size:11, alpha:vf});
        const va = S.vis('asym');
        if (va > 0){
          PL.line(ctx, M1, fs.map(f => [f, m.low ? (f < m.fc ? 0 : -20*Math.log10(f/m.fc)) : (f > m.fc ? 0 : 20*Math.log10(f/m.fc))]), {color:'#B6A2DE', width:1.6, dash:[6, 4], alpha:va});
          PL.line(ctx, M2, fs.map(f => { const r = Math.log10(f/m.fc), p = r < -1 ? 0 : r > 1 ? -90 : -45*(r + 1); return [f, m.low ? p : p + 90]; }), {color:'#B6A2DE', width:1.6, dash:[6, 4], alpha:va});
        }
        const k = S.vis('curve');
        PL.line(ctx, M1, upto(fs.map((f, i) => [f, mag[i]]), k), {color:'#8AB4F0', width:2.8, glow:8});
        PL.line(ctx, M2, upto(fs.map((f, i) => [f, ph[i]]), k), {color:'#7CC6BE', width:2.8, glow:8});
        const vp = S.vis('pt'); if (vp > 0){ PL.dot(ctx, M1, m.f, m.dB, {color:'#fff', r:6, alpha:vp, label:`${n4(m.dB, 3)} dB`}); PL.dot(ctx, M2, m.f, m.ph, {color:'#fff', r:6, alpha:vp, label:`${n4(m.ph, 3)}°`}); }
      } }
  ];
  const RU = [['Ω', 1], ['kΩ', 1e3], ['MΩ', 1e6]], LU = [['mH', 1e-3], ['µH', 1e-6], ['H', 1]], CU = [['µF', 1e-6], ['nF', 1e-9], ['pF', 1e-12], ['mF', 1e-3], ['F', 1]];
  const FIELDS = {
    R:{label:'Resistance R', units:RU}, L:{label:'Inductance L', units:LU}, C:{label:'Capacitance C', units:CU},
    Vs:{label:'Source voltage V<sub>s</sub> (V)', showIf: v => v.config !== 'parallel'}, V0:{label:'Starting v<sub>C</sub>(0) (V)'}, I0:{label:'Starting current i(0)', units:[['mA', 1e-3], ['A', 1], ['µA', 1e-6]]},
    t:{label:'At time t', units:[['ms', 1e-3], ['s', 1], ['µs', 1e-6]]}, f:{label:'Frequency f', units:[['Hz', 1], ['kHz', 1e3], ['MHz', 1e6]]},
    config:{label:'Circuit', type:'select', options:[['series', 'Series RLC'], ['parallel', 'Parallel RLC']]},
    ftype:{label:'Filter', type:'select', options:[['low', 'Low-pass (output across C)'], ['high', 'High-pass (output across R)']]}
  };
  return {MODES, FIELDS};
};
