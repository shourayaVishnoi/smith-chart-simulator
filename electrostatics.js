// Electrostatics: drag point charges to see field lines and equipotentials, plus step-by-step questions.
window.ES = (() => {
  'use strict';
  const K = 8.9875517923e9, EPS0 = 8.8541878128e-12;
  // field and potential of point charges {x, y, q} (SI units) at (x, y)
  function field(charges, x, y){
    let ex = 0, ey = 0, v = 0;
    for (const c of charges){ const dx = x - c.x, dy = y - c.y, r2 = dx*dx + dy*dy, r = Math.sqrt(r2); if (r < 1e-12) return {ex:NaN, ey:NaN, v:NaN}; const k = K*c.q/(r2*r); ex += k*dx; ey += k*dy; v += K*c.q/r; }
    return {ex, ey, v};
  }
  return {K, EPS0, field};
})();

(() => {
  'use strict';
  const MX = window.MX, PL = window.PLOT, ES = window.ES, $ = id => document.getElementById(id);
  const RED = '#E07A6E', BLUE = '#8AB4F0', SAND = '#E2B86F', TEXT = '#D5DCE4';
  let needs = true;
  const canvas = $('esCanvas'), ctx = PL.fit(canvas, () => { needs = true; });
  // charges in nC, positions in metres
  let charges = [{x:-2, y:0, q:2}, {x:2, y:0, q:-2}], sel = 0, hover = null, drag = -1;
  const S = {lines:true, equi:true, vecs:false};
  const view = () => { const w = canvas._w || 600, h = canvas._h || 400, span = 12, s = w/span; return {s, X:x => w/2 + x*s, Y:y => h/2 - y*s, ix:px => (px - w/2)/s, iy:py => (h/2 - py)/s, w, h}; };
  const si = cs => cs.map(c => ({x:c.x, y:c.y, q:c.q*1e-9}));
  function traceLines(V){
    const cs = si(charges), out = [], pos = charges.filter(c => c.q > 0), neg = charges.filter(c => c.q < 0);
    const seeds = pos.length ? pos : neg, dir = pos.length ? 1 : -1, r0 = 14/V.s, hit = 10/V.s;
    const xmax = V.w/V.s/2 + 2, ymax = V.h/V.s/2 + 2;
    seeds.forEach(c => {
      const n = Math.max(8, Math.round(6*Math.abs(c.q)));
      for (let k = 0; k < n; k++){
        const a = 2*Math.PI*(k + .5)/n; let x = c.x + r0*Math.cos(a), y = c.y + r0*Math.sin(a); const pts = [[x, y]];
        for (let it = 0; it < 2500; it++){
          const st = 2.2/V.s, f1 = ES.field(cs, x, y), m1 = Math.hypot(f1.ex, f1.ey); if (!isFinite(m1) || m1 === 0) break;
          const xm = x + dir*st/2*f1.ex/m1, ym = y + dir*st/2*f1.ey/m1, f2 = ES.field(cs, xm, ym), m2 = Math.hypot(f2.ex, f2.ey); if (!isFinite(m2) || m2 === 0) break;
          x += dir*st*f2.ex/m2; y += dir*st*f2.ey/m2; pts.push([x, y]);
          if (Math.abs(x) > xmax || Math.abs(y) > ymax) break;
          if (charges.some(o => o !== c && Math.hypot(o.x - x, o.y - y) < hit)) break;
        }
        out.push(pts);
      }
    });
    return out;
  }
  function equipotentials(V){
    const cs = si(charges), cell = 6, nx = Math.ceil(V.w/cell), ny = Math.ceil(V.h/cell), g = [];
    for (let j = 0; j <= ny; j++){ const row = []; for (let i = 0; i <= nx; i++) row.push(ES.field(cs, V.ix(i*cell), V.iy(j*cell)).v); g.push(row); }
    const unit = ES.K*1e-9, levels = [0.25, 0.5, 1, 2, 4, 8].flatMap(l => [l*unit, -l*unit]).concat([0]), segs = [];
    levels.forEach(L => {
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++){
        const v = [g[j][i] - L, g[j][i + 1] - L, g[j + 1][i + 1] - L, g[j + 1][i] - L]; if (v.some(q => !isFinite(q))) continue;
        const P = [[i*cell, j*cell], [(i + 1)*cell, j*cell], [(i + 1)*cell, (j + 1)*cell], [i*cell, (j + 1)*cell]], pts = [];
        for (let k = 0; k < 4; k++){ const a = v[k], b = v[(k + 1) % 4]; if ((a < 0) !== (b < 0)){ const t = a/(a - b); pts.push([P[k][0] + (P[(k + 1) % 4][0] - P[k][0])*t, P[k][1] + (P[(k + 1) % 4][1] - P[k][1])*t]); } }
        if (pts.length >= 2) segs.push([pts[0], pts[1], L]); if (pts.length === 4) segs.push([pts[2], pts[3], L]);
      }
    });
    return segs;
  }
  function draw(){
    const V = view(); ctx.clearRect(0, 0, V.w, V.h);
    // light grid, 1 m spacing
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = Math.ceil(V.ix(0)); x <= V.ix(V.w); x++){ ctx.moveTo(V.X(x), 0); ctx.lineTo(V.X(x), V.h); }
    for (let y = Math.ceil(V.iy(V.h)); y <= V.iy(0); y++){ ctx.moveTo(0, V.Y(y)); ctx.lineTo(V.w, V.Y(y)); }
    ctx.stroke(); ctx.restore();
    const cs = si(charges);
    if (S.equi){ ctx.save(); ctx.lineWidth = 1.3; equipotentials(V).forEach(([a, b, L]) => { ctx.strokeStyle = L > 0 ? 'rgba(224,122,110,.55)' : L < 0 ? 'rgba(138,180,240,.55)' : 'rgba(213,220,228,.4)'; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }); ctx.restore(); }
    if (S.lines){
      ctx.save(); ctx.strokeStyle = 'rgba(226,184,111,.85)'; ctx.fillStyle = 'rgba(226,184,111,.85)'; ctx.lineWidth = 1.4;
      traceLines(V).forEach(pts => {
        ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(V.X(x), V.Y(y)) : ctx.moveTo(V.X(x), V.Y(y))); ctx.stroke();
        // a small arrowhead halfway along, pointing with the field
        const m = Math.floor(pts.length/2); if (pts.length > 6){ const dir = charges.some(c => c.q > 0) ? 1 : -1, [x1, y1] = pts[m - 1], [x2, y2] = pts[m + 1], a = Math.atan2(-(y2 - y1), x2 - x1) + (dir < 0 ? Math.PI : 0), X = V.X(pts[m][0]), Y = V.Y(pts[m][1]);
          ctx.beginPath(); ctx.moveTo(X + 5*Math.cos(a), Y + 5*Math.sin(a)); ctx.lineTo(X - 4*Math.cos(a - .6), Y - 4*Math.sin(a - .6)); ctx.lineTo(X - 4*Math.cos(a + .6), Y - 4*Math.sin(a + .6)); ctx.closePath(); ctx.fill(); }
      });
      ctx.restore();
    }
    if (S.vecs){
      const st = 36; ctx.save();
      for (let py = st/2; py < V.h; py += st) for (let px = st/2; px < V.w; px += st){
        const f = ES.field(cs, V.ix(px), V.iy(py)), m = Math.hypot(f.ex, f.ey); if (!isFinite(m) || m === 0) continue;
        const a = Math.atan2(-f.ey, f.ex), L = 13, al = Math.min(1, .25 + .12*Math.log10(1 + m));
        ctx.strokeStyle = `rgba(213,220,228,${al})`; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(px - L/2*Math.cos(a), py - L/2*Math.sin(a)); ctx.lineTo(px + L/2*Math.cos(a), py + L/2*Math.sin(a));
        ctx.lineTo(px + L/2*Math.cos(a) - 4*Math.cos(a - .5), py + L/2*Math.sin(a) - 4*Math.sin(a - .5)); ctx.stroke();
      }
      ctx.restore();
    }
    charges.forEach((c, i) => {
      const X = V.X(c.x), Y = V.Y(c.y), r = 9 + 2.2*Math.min(5, Math.abs(c.q));
      ctx.save(); ctx.fillStyle = c.q > 0 ? RED : c.q < 0 ? BLUE : '#8F9BA8'; ctx.beginPath(); ctx.arc(X, Y, r, 0, 2*Math.PI); ctx.fill();
      if (i === sel){ ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X, Y, r + 4, 0, 2*Math.PI); ctx.stroke(); }
      ctx.fillStyle = '#10151B'; ctx.font = '700 15px IBM Plex Sans, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(c.q > 0 ? '+' : c.q < 0 ? '−' : '0', X, Y + 1);
      ctx.restore();
      PL.label(ctx, X, Y + r + 15, `${MX.fmt(c.q, 3)} nC`, {color:TEXT, size:11, align:'center'});
    });
    // probe
    let txt = 'Hover over the field to read E and V. Drag a charge to move it.';
    if (hover && drag < 0){
      const x = V.ix(hover[0]), y = V.iy(hover[1]), f = ES.field(cs, x, y), m = Math.hypot(f.ex, f.ey);
      if (isFinite(m)){
        const a = Math.atan2(-f.ey, f.ex); ctx.save(); ctx.strokeStyle = '#fff'; ctx.fillStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(hover[0], hover[1]); ctx.lineTo(hover[0] + 34*Math.cos(a), hover[1] + 34*Math.sin(a)); ctx.stroke();
        ctx.beginPath(); ctx.arc(hover[0], hover[1], 3, 0, 2*Math.PI); ctx.fill(); ctx.restore();
        txt = `at (${MX.fmt(x, 3)}, ${MX.fmt(y, 3)}) m<br>|E| = <b>${MX.si(m, 'V/m', 4)}</b> at ${MX.fmt(Math.atan2(f.ey, f.ex)*180/Math.PI, 4)}°<br>V = <b>${MX.si(f.v, 'V', 4)}</b>`;
      }
    }
    const tot = charges.reduce((s, c) => s + c.q, 0);
    $('esRead').innerHTML = `${txt}<br><span class="c">${charges.length} charge${charges.length === 1 ? '' : 's'}, total ${MX.fmt(tot, 3)} nC; grid squares are 1 m</span>`;
  }
  function pick(px, py){ const V = view(); let best = -1, bd = 22; charges.forEach((c, i) => { const d = Math.hypot(V.X(c.x) - px, V.Y(c.y) - py); if (d < bd){ bd = d; best = i; } }); return best; }
  const pos = e => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  canvas.addEventListener('pointerdown', e => { const [px, py] = pos(e), i = pick(px, py); if (i >= 0){ drag = i; sel = i; syncSel(); canvas.setPointerCapture(e.pointerId); e.preventDefault(); } needs = true; });
  canvas.addEventListener('pointermove', e => { const [px, py] = pos(e); hover = [px, py]; if (drag >= 0){ const V = view(); charges[drag].x = Math.round(V.ix(px)*10)/10; charges[drag].y = Math.round(V.iy(py)*10)/10; } canvas.style.cursor = drag >= 0 ? 'grabbing' : pick(px, py) >= 0 ? 'grab' : 'crosshair'; needs = true; });
  canvas.addEventListener('pointerup', () => { drag = -1; needs = true; });
  canvas.addEventListener('pointerleave', () => { hover = null; needs = true; });
  canvas.style.touchAction = 'none';
  const qr = $('esQ'), qo = $('esQo');
  function syncSel(){ if (sel >= 0 && charges[sel]){ qr.disabled = false; qr.value = charges[sel].q; qo.value = `${MX.fmt(charges[sel].q, 3)} nC`; } else { qr.disabled = true; qo.value = '—'; } }
  qr.addEventListener('input', () => { if (charges[sel]){ charges[sel].q = +qr.value; syncSel(); needs = true; } });
  const add = q => { const n = charges.length; charges.push({x:Math.round((Math.random()*6 - 3)*10)/10, y:Math.round((Math.random()*4 - 2)*10)/10, q}); sel = n; syncSel(); needs = true; };
  $('esAddP').addEventListener('click', () => add(1)); $('esAddN').addEventListener('click', () => add(-1));
  $('esDel').addEventListener('click', () => { if (charges[sel]){ charges.splice(sel, 1); sel = charges.length - 1; syncSel(); needs = true; } });
  document.querySelectorAll('[data-preset]').forEach(b => b.addEventListener('click', () => {
    const P = {dipole:[{x:-2, y:0, q:2}, {x:2, y:0, q:-2}], like:[{x:-2, y:0, q:2}, {x:2, y:0, q:2}], quad:[{x:-2, y:-2, q:2}, {x:2, y:-2, q:-2}, {x:2, y:2, q:2}, {x:-2, y:2, q:-2}], unequal:[{x:-2, y:0, q:4}, {x:2, y:0, q:-1}], line:[-4, -2, 0, 2, 4].map(x => ({x, y:0, q:1}))};
    charges = P[b.dataset.preset].map(c => ({...c})); sel = 0; syncSel(); needs = true;
  }));
  $('esTog').querySelectorAll('button').forEach(b => b.addEventListener('click', () => { S[b.dataset.v] = !S[b.dataset.v]; b.setAttribute('aria-pressed', String(S[b.dataset.v])); needs = true; }));
  $('esTog').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(S[b.dataset.v])));
  syncSel();
  function loop(){ if (needs){ needs = false; draw(); } requestAnimationFrame(loop); }
  const rm = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  $('hPlay') && $('hPlay').addEventListener('click', () => $('play').scrollIntoView({behavior: rm ? 'auto' : 'smooth'}));
  window.__es = {get charges(){ return charges; }, set(c){ charges = c; needs = true; }};
  requestAnimationFrame(loop);
})();

// ---------------- step-by-step questions ----------------
window.FORMULA_PAGE = (G) => {
  'use strict';
  const MX = window.MX, PL = window.PLOT, ES = window.ES, K = ES.K, EPS0 = ES.EPS0, PI = Math.PI, D = 180/PI;
  const n4 = (v, s = 4) => MX.fmt(v, s), si = (v, u, s = 4) => MX.si(v, u, s);
  const RED = '#E07A6E', BLUE = '#8AB4F0', SAND = '#E2B86F', TEAL = '#7CC6BE', SAGE = '#8FC79A', LILAC = '#B6A2DE', TEXT = '#D5DCE4';
  const cardsHTML = cards => `<div class="answer">${cards.filter(Boolean).map(c => `<div class="ans ${c.tone || 'y'}"><div class="k">${c.k}</div><div class="v">${c.v}</div><div class="s">${c.s || ''}</div></div>`).join('')}</div>`;
  const MODE_OF = m => MODES.find(x => x.id === m.id);
  const answerStep = () => ({ dur:1600, show:[], info: m => ({ title:'Answer', body: cardsHTML(MODE_OF(m).answer(m)) + (MODE_OF(m).note && MODE_OF(m).note(m) ? `<p>${MODE_OF(m).note(m)}</p>` : ''), work:'' }) });
  const pos = (v, w) => { if (!(v > 0) || !isFinite(v)) throw new Error(`${w} must be a positive number.`); };
  const fin = (v, w) => { if (!isFinite(v)) throw new Error(`Enter a number for ${w}.`); };
  const vec = (x, y) => `(${n4(x)}, ${n4(y)})`;
  const ang = (x, y) => Math.atan2(y, x)*D;
  const GLYPH = {
    force:'<circle cx="9" cy="16" r="4"/><circle cx="23" cy="16" r="4"/><path d="M13 16 H19 M27 16 H31 M28.5 13.5 L31 16 L28.5 18.5"/>',
    field:'<circle cx="16" cy="16" r="4"/><path d="M16 3 V9 M16 23 V29 M3 16 H9 M23 16 H29 M7 7 L11 11 M25 25 L21 21 M25 7 L21 11 M7 25 L11 21"/>',
    gauss:'<circle cx="16" cy="16" r="5"/><circle cx="16" cy="16" r="12" stroke-dasharray="3 3"/>',
    cap:'<path d="M12 5 V27 M20 5 V27 M3 16 H12 M20 16 H29"/>'
  };
  const glyph = k => `<svg viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${GLYPH[k]}</svg>`;
  // fit a set of world points into the scene with equal scales
  function fitView(pts, S, pad = 70){
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]); let x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const span = Math.max(x1 - x0, y1 - y0, 1e-9), cx = (x0 + x1)/2, cy = (y0 + y1)/2, s = Math.min((S.W - 2*pad)/Math.max(x1 - x0, span*.3), (S.H - 2*pad)/Math.max(y1 - y0, span*.3));
    return {s, X:x => S.W/2 + (x - cx)*s, Y:y => S.H/2 - (y - cy)*s, ix:px => cx + (px - S.W/2)/s, iy:py => cy - (py - S.H/2)/s};
  }
  function drawCharge(V, x, y, q, label, a = 1){
    const X = V.X(x), Y = V.Y(y);
    G.circle(X, Y, 13, {fill: q > 0 ? RED : q < 0 ? BLUE : '#8F9BA8', a});
    G.text(q > 0 ? '+' : q < 0 ? '−' : '0', X, Y + 5, {align:'center', color:'#10151B', size:16, weight:700, a});
    G.text(label, X, Y + 31, {align:'center', color:TEXT, size:12, a, halo:true});
  }
  const qU = [['µC', 1e-6], ['nC', 1e-9], ['mC', 1e-3], ['C', 1]], lU = [['m', 1], ['cm', 1e-2], ['mm', 1e-3]];

  const MODES = [
    { id:'force', title:'Net force from charges', desc:'Coulomb’s law for each pair, then add the vectors', glyph:glyph('force'),
      fields:['q1', 'x1', 'y1', 'q2', 'x2', 'y2', 'q3', 'x3', 'y3', 'er'], defaults:{q1:'2', q1_u:'µC', x1:'0', y1:'0', q2:'-3', q2_u:'µC', x2:'4', y2:'0', q3:'1', q3_u:'µC', x3:'0', y3:'3', er:'1'},
      compute: v => {
        ['q1', 'q2', 'q3', 'x1', 'y1', 'x2', 'y2', 'x3', 'y3'].forEach(k => fin(v[k], k)); pos(v.er, 'εr');
        if (v.q3 === 0) throw new Error('q₃ must be non-zero to feel a force.');
        const src = [[v.q1, v.x1, v.y1], [v.q2, v.x2, v.y2]].map(([q, x, y], i) => {
          const dx = v.x3 - x, dy = v.y3 - y, r = Math.hypot(dx, dy); if (r === 0) throw new Error(`q₃ sits on top of q${"₁₂"[i]}; move one of them.`);
          const F = K*q*v.q3/(v.er*r*r); return {q, x, y, dx, dy, r, F, fx:F*dx/r, fy:F*dy/r, rep: q*v.q3 > 0};
        });
        const fx = src[0].fx + src[1].fx, fy = src[0].fy + src[1].fy;
        return {id:'force', ...v, src, fx, fy, F:Math.hypot(fx, fy), th:ang(fx, fy)};
      },
      problem: m => ({ chips:[`q₁ = ${si(m.q1, 'C')} at ${vec(m.x1, m.y1)}`, `q₂ = ${si(m.q2, 'C')} at ${vec(m.x2, m.y2)}`, `q₃ = ${si(m.q3, 'C')} at ${vec(m.x3, m.y3)}`].concat(m.er !== 1 ? [`ε<sub>r</sub> = ${n4(m.er)}`] : []) }),
      steps: () => [
        { dur:2000, show:['charges'], info: m => ({ title:'Coulomb’s law', body:'<p>Each charge pushes or pulls q₃ along the line joining them. Work out each force on its own, then add them as vectors.</p>', work:`F = k q<sub>i</sub> q₃ / (ε<sub>r</sub> r²), k = 8.988 × 10⁹ N·m²/C²` }) },
        ...[0, 1].map(i => ({ dur:2600, show:[`f${i}`], info: m => { const s = m.src[i]; return { title:`Force from q${i + 1}`, body:`<p>q${i + 1} and q₃ have ${s.rep ? 'the same sign, so q₃ is pushed away' : 'opposite signs, so q₃ is pulled towards it'}.</p>`, work:`r = ${vec(s.dx, s.dy)} m, |r| = ${n4(s.r)} m<br>|F| = ${si(Math.abs(s.F), 'N')}<br>F = ${si(s.fx, 'N')} x̂ ${s.fy < 0 ? '−' : '+'} ${si(Math.abs(s.fy), 'N')} ŷ` }; },
          rd: m => [`Force from q${i + 1}`, `${si(Math.abs(m.src[i].F), 'N')} (${m.src[i].rep ? 'repulsive' : 'attractive'})`] })),
        { dur:2600, show:['net'], info: m => ({ title:'Add the components', body:'<p>Add the x parts and the y parts separately, then find the size and direction.</p>', work:`F<sub>x</sub> = ${si(m.fx, 'N')}<br>F<sub>y</sub> = ${si(m.fy, 'N')}<br>|F| = √(F<sub>x</sub>² + F<sub>y</sub>²) = <b>${si(m.F, 'N')}</b><br>angle from +x = <b>${n4(m.th)}°</b>` }),
          rd: m => [['Net force on q₃', si(m.F, 'N')], ['Direction from +x', `${n4(m.th)}°`]] },
        answerStep()],
      answer: m => [{tone:'y', k:'Net force on q₃', v:si(m.F, 'N'), s:`at ${n4(m.th)}° from the +x axis`}, {tone:'s1', k:'Components', v:`${si(m.fx, 'N', 3)}, ${si(m.fy, 'N', 3)}`, s:'(F<sub>x</sub>, F<sub>y</sub>)'}],
      scene: (m, S) => {
        const span = Math.max(Math.hypot(m.x1 - m.x3, m.y1 - m.y3), Math.hypot(m.x2 - m.x3, m.y2 - m.y3), Math.hypot(m.x1 - m.x2, m.y1 - m.y2)), Fm = Math.max(...m.src.map(s => Math.abs(s.F)), m.F), Lw = 0.5*span/Fm;
        const tips = m.src.map(s => [m.x3 + s.fx*Lw, m.y3 + s.fy*Lw]).concat([[m.x3 + m.fx*Lw, m.y3 + m.fy*Lw]]);
        const V = fitView([[m.x1, m.y1], [m.x2, m.y2], [m.x3, m.y3]].concat(tips), S, 70), L = Lw*V.s;
        const P = [V.X(m.x3), V.Y(m.y3)];
        const vc = S.vis('charges');
        [[m.q1, m.x1, m.y1, 'q₁'], [m.q2, m.x2, m.y2, 'q₂'], [m.q3, m.x3, m.y3, 'q₃']].forEach(([q, x, y, l]) => drawCharge(V, x, y, q, `${l} = ${si(q, 'C', 3)}`, vc));
        m.src.forEach((s, i) => { const a = S.vis(`f${i}`); if (a > 0){ G.line(V.X(s.x), V.Y(s.y), P[0], P[1], 'rgba(213,220,228,.25)', 1, {dash:[4, 4], a}); G.arrow(P[0], P[1], P[0] + s.fx*L*a, P[1] - s.fy*L*a, i ? TEAL : SAND, 2.6, {a}); G.text(`F${i + 1}`, P[0] + s.fx*L + 6, P[1] - s.fy*L - 6, {color: i ? TEAL : SAND, size:13, a, halo:true}); } });
        const vn = S.vis('net'); if (vn > 0){ G.arrow(P[0], P[1], P[0] + m.fx*L*vn, P[1] - m.fy*L*vn, '#fff', 3.2, {a:vn, head:11}); G.text(`F = ${si(m.F, 'N', 3)}`, Math.min(S.W - 110, P[0] + m.fx*L + 8), P[1] - m.fy*L + 16, {color:'#fff', size:13, a:vn, halo:true});
          m.src.forEach((s, i) => { G.line(P[0] + s.fx*L, P[1] - s.fy*L, P[0] + m.fx*L, P[1] - m.fy*L, 'rgba(255,255,255,.3)', 1, {dash:[3, 3], a:vn}); }); }
      } },

    { id:'efield', title:'Field and potential at a point', desc:'E as a vector sum, V as a plain sum', glyph:glyph('field'),
      fields:['q1', 'x1', 'y1', 'q2', 'x2', 'y2', 'px', 'py', 'er'], defaults:{q1:'4', q1_u:'nC', x1:'-1', y1:'0', q2:'-4', q2_u:'nC', x2:'1', y2:'0', px:'0', py:'1', er:'1'},
      compute: v => {
        ['q1', 'q2', 'x1', 'y1', 'x2', 'y2', 'px', 'py'].forEach(k => fin(v[k], k)); pos(v.er, 'εr');
        const src = [[v.q1, v.x1, v.y1], [v.q2, v.x2, v.y2]].map(([q, x, y], i) => {
          const dx = v.px - x, dy = v.py - y, r = Math.hypot(dx, dy); if (r === 0) throw new Error(`The point is on top of q${"₁₂"[i]}, where the field is infinite.`);
          const E = K*q/(v.er*r*r); return {q, x, y, dx, dy, r, E, ex:E*dx/r, ey:E*dy/r, V:K*q/(v.er*r)};
        });
        const ex = src[0].ex + src[1].ex, ey = src[0].ey + src[1].ey, Vt = src[0].V + src[1].V;
        return {id:'efield', ...v, src, ex, ey, E:Math.hypot(ex, ey), th:ang(ex, ey), V:Vt};
      },
      problem: m => ({ chips:[`q₁ = ${si(m.q1, 'C')} at ${vec(m.x1, m.y1)}`, `q₂ = ${si(m.q2, 'C')} at ${vec(m.x2, m.y2)}`, `P = ${vec(m.px, m.py)} m`] }),
      steps: () => [
        { dur:2000, show:['charges'], info: () => ({ title:'Point charges', body:'<p>Each charge makes a field pointing away from it if positive and towards it if negative. The field is a vector; the potential is a scalar.</p>', work:'E = kq/(ε<sub>r</sub>r²) along r̂,  V = kq/(ε<sub>r</sub>r)' }) },
        ...[0, 1].map(i => ({ dur:2600, show:[`e${i}`], info: m => { const s = m.src[i]; return { title:`From q${i + 1}`, body:'<p>Distance from the charge to P, then the field and potential it makes there.</p>', work:`r = ${n4(s.r)} m<br>|E| = ${si(Math.abs(s.E), 'V/m')}<br>E = (${si(s.ex, 'V/m', 3)}, ${si(s.ey, 'V/m', 3)})<br>V = ${si(s.V, 'V')}` }; },
          rd: m => [`|E| from q${i + 1}`, si(Math.abs(m.src[i].E), 'V/m')] })),
        { dur:2600, show:['net'], info: m => ({ title:'Add them', body:'<p>Field components add as vectors; potentials just add as numbers (with their signs).</p>', work:`E = (${si(m.ex, 'V/m', 4)}, ${si(m.ey, 'V/m', 4)})<br>|E| = <b>${si(m.E, 'V/m')}</b> at <b>${n4(m.th)}°</b><br>V = ${si(m.src[0].V, 'V')} + (${si(m.src[1].V, 'V')}) = <b>${si(m.V, 'V')}</b>` }),
          rd: m => [['Net field |E|', `${si(m.E, 'V/m')} at ${n4(m.th)}°`], ['Potential V', si(m.V, 'V')]] },
        answerStep()],
      answer: m => [{tone:'y', k:'Electric field at P', v:si(m.E, 'V/m'), s:`at ${n4(m.th)}° from +x`}, {tone:'s1', k:'Potential at P', v:si(m.V, 'V'), s:'taking V = 0 far away'}],
      note: m => Math.abs(m.V) < 1e-9*Math.abs(m.src[0].V) ? 'The potential is zero here even though the field is not: zero V does not mean zero E.' : '',
      scene: (m, S) => {
        const span = Math.max(Math.hypot(m.x1 - m.px, m.y1 - m.py), Math.hypot(m.x2 - m.px, m.y2 - m.py), Math.hypot(m.x1 - m.x2, m.y1 - m.y2)), Em = Math.max(...m.src.map(s => Math.abs(s.E)), m.E), Lw = 0.5*span/Em;
        const tips = m.src.map(s => [m.px + s.ex*Lw, m.py + s.ey*Lw]).concat([[m.px + m.ex*Lw, m.py + m.ey*Lw]]);
        const V = fitView([[m.x1, m.y1], [m.x2, m.y2], [m.px, m.py]].concat(tips), S, 70), L = Lw*V.s, P = [V.X(m.px), V.Y(m.py)];
        // faint field lines from the two charges for context
        const cs = [{x:m.x1, y:m.y1, q:m.q1}, {x:m.x2, y:m.y2, q:m.q2}], vc = S.vis('charges');
        if (vc > 0){ const st = 30; for (let py = st/2; py < S.H; py += st) for (let px = st/2; px < S.W; px += st){ const x = V.ix(px), y = V.iy(py), f = ES.field(cs, x, y), mm = Math.hypot(f.ex, f.ey); if (!isFinite(mm) || !mm) continue; const a = Math.atan2(-f.ey, f.ex); G.line(px - 5*Math.cos(a), py - 5*Math.sin(a), px + 5*Math.cos(a), py + 5*Math.sin(a), 'rgba(213,220,228,.18)', 1.2, {a:vc}); } }
        drawCharge(V, m.x1, m.y1, m.q1, `q₁ ${si(m.q1, 'C', 3)}`, vc); drawCharge(V, m.x2, m.y2, m.q2, `q₂ ${si(m.q2, 'C', 3)}`, vc);
        G.circle(P[0], P[1], 5, {fill:'#fff', a:vc}); G.text('P', P[0] - 14, P[1] - 8, {color:'#fff', size:13, a:vc, halo:true});
        m.src.forEach((s, i) => { const a = S.vis(`e${i}`); if (a > 0){ G.arrow(P[0], P[1], P[0] + s.ex*L*a, P[1] - s.ey*L*a, i ? TEAL : SAND, 2.6, {a}); G.text(`E${i + 1}`, P[0] + s.ex*L + 6, P[1] - s.ey*L - 4, {color: i ? TEAL : SAND, size:13, a, halo:true}); } });
        const vn = S.vis('net'); if (vn > 0){ G.arrow(P[0], P[1], P[0] + m.ex*L*vn, P[1] - m.ey*L*vn, '#fff', 3.2, {a:vn, head:11}); G.text(`E = ${si(m.E, 'V/m', 3)}`, Math.min(S.W - 120, P[0] + m.ex*L + 8), P[1] - m.ey*L + 16, {color:'#fff', size:13, a:vn, halo:true}); G.text(`V = ${si(m.V, 'V', 3)}`, 22, S.H - 22, {color:SAGE, size:14, a:vn}); }
      } },

    { id:'gauss', title:'Gauss’s law', desc:'E from a sphere, shell, line, cylinder or sheet of charge', glyph:glyph('gauss'),
      fields:['shape', 'Q', 'lam', 'sig', 'a', 'r'], defaults:{shape:'sphere', Q:'10', Q_u:'nC', lam:'5', lam_u:'nC/m', sig:'2', sig_u:'nC/m²', a:'0.1', a_u:'m', r:'0.05', r_u:'m'},
      compute: v => {
        const sh = v.shape, charge = sh === 'sphere' || sh === 'shell' ? v.Q : sh === 'sheet' ? v.sig : v.lam; fin(charge, 'the charge');
        if (sh !== 'sheet' && sh !== 'line') pos(v.a, 'The radius a');
        if (sh !== 'sheet'){ pos(v.r, 'The distance r'); }
        let E, qenc, surf, inside = false, Ef;
        if (sh === 'sphere'){ inside = v.r < v.a; qenc = inside ? v.Q*(v.r/v.a)**3 : v.Q; E = qenc/(4*PI*EPS0*v.r*v.r); surf = 'a sphere of radius r'; Ef = r => (r < v.a ? v.Q*r/(4*PI*EPS0*v.a**3) : v.Q/(4*PI*EPS0*r*r)); }
        else if (sh === 'shell'){ inside = v.r < v.a; qenc = inside ? 0 : v.Q; E = qenc/(4*PI*EPS0*v.r*v.r); surf = 'a sphere of radius r'; Ef = r => (r < v.a ? 0 : v.Q/(4*PI*EPS0*r*r)); }
        else if (sh === 'line'){ qenc = v.lam; E = v.lam/(2*PI*EPS0*v.r); surf = 'a cylinder of radius r and length L around the line'; Ef = r => v.lam/(2*PI*EPS0*r); }
        else if (sh === 'cylinder'){ inside = v.r < v.a; qenc = inside ? v.lam*(v.r/v.a)**2 : v.lam; E = qenc/(2*PI*EPS0*v.r); surf = 'a coaxial cylinder of radius r and length L'; Ef = r => (r < v.a ? v.lam*r/(2*PI*EPS0*v.a*v.a) : v.lam/(2*PI*EPS0*r)); }
        else { qenc = v.sig; E = v.sig/(2*EPS0); surf = 'a pillbox (short cylinder) through the sheet'; Ef = () => v.sig/(2*EPS0); }
        return {id:'gauss', ...v, sh, E, qenc, surf, inside, Ef, charge};
      },
      problem: m => ({ chips:[{sphere:'solid sphere, uniform charge', shell:'thin spherical shell', line:'infinite line of charge', cylinder:'solid cylinder, uniform charge', sheet:'infinite sheet'}[m.sh],
        m.sh === 'sphere' || m.sh === 'shell' ? `Q = ${si(m.Q, 'C')}` : m.sh === 'sheet' ? `σ = ${si(m.sig, 'C/m²')}` : `λ = ${si(m.lam, 'C/m')}`].concat(m.sh === 'sphere' || m.sh === 'shell' || m.sh === 'cylinder' ? [`a = ${si(m.a, 'm')}`] : []).concat(m.sh !== 'sheet' ? [`r = ${si(m.r, 'm')}`] : []) }),
      steps: () => [
        { dur:2400, show:['shape'], info: m => ({ title:'Pick a Gaussian surface', body:`<p>By symmetry E points ${m.sh === 'sheet' ? 'straight away from the sheet' : 'radially'} and has the same size everywhere on ${m.surf}, so the flux integral becomes E times an area.</p>`, work:'∮ E·dA = Q<sub>enc</sub>/ε₀' }) },
        { dur:2600, show:['surf'], info: m => ({ title:'Charge inside the surface', body: m.sh === 'sheet' ? '<p>The pillbox cuts out an area A of the sheet.</p>' : m.sh === 'line' ? '<p>A length L of the line is inside.</p>' : m.inside ? (m.sh === 'shell' ? '<p>The surface is inside the shell, so it encloses no charge at all.</p>' : `<p>The surface is inside the charge, so it holds only the fraction (r/a)${m.sh === 'sphere' ? '³' : '²'} of it.</p>`) : '<p>The surface is outside, so it holds all of the charge.</p>',
            work: m.sh === 'sheet' ? 'Q<sub>enc</sub> = σA' : m.sh === 'line' ? 'Q<sub>enc</sub> = λL' : m.sh === 'cylinder' ? `Q<sub>enc</sub> = ${m.inside ? `λL(r/a)² = ${si(m.qenc, 'C/m')} × L` : `λL = ${si(m.lam, 'C/m')} × L`}` : `Q<sub>enc</sub> = <b>${si(m.qenc, 'C')}</b>` }),
          rd: m => ['Enclosed charge', m.sh === 'sheet' ? 'σA' : m.sh === 'line' || m.sh === 'cylinder' ? `${si(m.qenc, 'C/m')} × L` : si(m.qenc, 'C')] },
        { dur:2600, show:['E'], info: m => ({ title:'Solve for E', body:'<p>Divide by the area the field passes through.</p>', work: m.sh === 'sheet' ? `E·2A = σA/ε₀ → E = σ/(2ε₀) = <b>${si(m.E, 'V/m')}</b>` : m.sh === 'line' || m.sh === 'cylinder' ? `E·2πrL = Q<sub>enc</sub>/ε₀<br>E = ${m.sh === 'cylinder' && m.inside ? 'λr/(2πε₀a²)' : 'λ/(2πε₀r)'} = <b>${si(m.E, 'V/m')}</b>` : `E·4πr² = Q<sub>enc</sub>/ε₀<br>E = ${m.sh === 'shell' && m.inside ? '0' : m.inside ? 'Qr/(4πε₀a³)' : 'Q/(4πε₀r²)'} = <b>${si(m.E, 'V/m')}</b>` }),
          rd: m => ['Field E', si(m.E, 'V/m')] },
        { dur:2200, show:['curve'], info: m => ({ title:'E against distance', body: m.sh === 'sheet' ? '<p>An infinite sheet gives the same field at every distance.</p>' : m.sh === 'shell' ? '<p>Zero inside, then falling as 1/r² outside, with a jump at the shell.</p>' : m.sh === 'line' ? '<p>The field falls as 1/r.</p>' : `<p>It grows linearly inside, peaks at the surface, then falls as ${m.sh === 'sphere' ? '1/r²' : '1/r'}.</p>`, work:'' }) },
        answerStep()],
      answer: m => [{tone:'y', k: m.sh === 'sheet' ? 'Field near the sheet' : `E at r = ${si(m.r, 'm')}`, v:si(m.E, 'V/m'), s: m.charge > 0 ? 'pointing away' : m.charge < 0 ? 'pointing towards the charge' : ''}],
      scene: (m, S) => {
        const ctx = G.ctx(), cx = S.W*0.25, cy = S.H/2, R = Math.min(S.W*0.18, S.H*0.32), vs = S.vis('shape'), vf = S.vis('surf');
        G.text('Gaussian surface', cx, 30, {align:'center', size:13, weight:600, a:vs});
        if (m.sh === 'sheet'){
          G.roundRect(cx - 4, cy - R*1.2, 8, R*2.4, 2, m.sig >= 0 ? 'rgba(224,122,110,.7)' : 'rgba(138,180,240,.7)', {a:vs});
          G.roundRect(cx - R*.6, cy - R*.35, R*1.2, R*.7, 6, 'rgba(0,0,0,0)', {a:vf, stroke:SAND});
          [-1, 1].forEach(sg => G.arrow(cx + sg*R*.6, cy, cx + sg*R*1.05, cy, SAND, 2.2, {a:vf}));
        } else {
          const rr = m.sh === 'line' ? 0 : R*0.55, rg = m.sh === 'line' ? R*0.7 : R*0.55*m.r/m.a;
          if (m.sh === 'line') G.line(cx, cy - R*1.2, cx, cy + R*1.2, m.lam >= 0 ? RED : BLUE, 4, {a:vs});
          else G.circle(cx, cy, rr, {fill: m.sh === 'shell' ? undefined : (m.charge >= 0 ? 'rgba(224,122,110,.35)' : 'rgba(138,180,240,.35)'), stroke: m.charge >= 0 ? RED : BLUE, w:2.5, a:vs});
          G.circle(cx, cy, Math.min(rg, R*1.3), {stroke:SAND, w:2, dash:[6, 5], a:vf});
          if (vf > 0){ G.line(cx, cy, cx + Math.min(rg, R*1.3), cy, SAND, 1.2, {a:vf}); G.text('r', cx + Math.min(rg, R*1.3)/2, cy - 6, {color:SAND, align:'center', a:vf, halo:true}); }
          if (m.sh !== 'line' && vs > 0) G.text('a', cx - rr*.7, cy - rr*.7 - 6, {color:TEXT, a:vs, halo:true});
        }
        const bx = {x:S.W*0.5, y:40, w:S.W*0.46, h:S.H - 100}, rmax = m.sh === 'sheet' ? 1 : Math.max(2.5*(m.a || m.r), 1.5*m.r);
        const pts = MX.linspace(m.sh === 'sheet' ? 0 : rmax*0.01, rmax, 400).map(r => [r, Math.abs(m.Ef(r))]), ymax = Math.max(...pts.map(p => p[1]).filter(isFinite).slice(5), Math.abs(m.E))*1.15;
        const M = PL.frame(ctx, bx, {xr:[0, rmax], yr:[0, ymax || 1], mode:'box', xlabel: m.sh === 'sheet' ? 'distance (m)' : 'r (m)', ylabel:'|E| (V/m)'});
        const vc = S.vis('curve'); if (vc > 0) PL.line(ctx, M, pts.slice(0, Math.max(2, Math.round(pts.length*vc))).filter(p => p[1] <= ymax*1.2), {color:BLUE, width:2.6});
        if (m.sh !== 'sheet' && m.sh !== 'line' && vc > 0) PL.vline(ctx, M, m.a, {color:'rgba(213,220,228,.4)', alpha:vc});
        const ve = S.vis('E'); if (ve > 0) PL.dot(ctx, M, m.sh === 'sheet' ? rmax/2 : m.r, Math.abs(m.E), {color:SAND, r:6, alpha:ve, label:si(m.E, 'V/m', 3)});
      } },

    { id:'cap', title:'Capacitors', desc:'Parallel-plate, coaxial or spherical: C, Q, E and stored energy', glyph:glyph('cap'),
      fields:['ctype', 'A', 'd', 'a', 'b', 'L', 'er', 'Vc'], defaults:{ctype:'plate', A:'100', A_u:'cm²', d:'1', d_u:'mm', a:'1', a_u:'mm', b:'4', b_u:'mm', L:'1', L_u:'m', er:'2.2', Vc:'100'},
      compute: v => {
        pos(v.er, 'εr'); fin(v.Vc, 'the voltage'); const e = EPS0*v.er; let C, Emax, desc, Emin;
        if (v.ctype === 'plate'){ pos(v.A, 'The plate area'); pos(v.d, 'The gap d'); C = e*v.A/v.d; Emax = Emin = v.Vc/v.d; desc = 'C = ε₀ε<sub>r</sub>A/d'; }
        else { pos(v.a, 'The inner radius a'); pos(v.b, 'The outer radius b'); if (!(v.b > v.a)) throw new Error('The outer radius b must be bigger than a.');
          if (v.ctype === 'coax'){ pos(v.L, 'The length'); C = 2*PI*e*v.L/Math.log(v.b/v.a); Emax = v.Vc/(v.a*Math.log(v.b/v.a)); Emin = v.Vc/(v.b*Math.log(v.b/v.a)); desc = 'C = 2πε₀ε<sub>r</sub>L/ln(b/a)'; }
          else { C = 4*PI*e*v.a*v.b/(v.b - v.a); Emax = v.Vc*v.b/(v.a*(v.b - v.a)); Emin = v.Vc*v.a/(v.b*(v.b - v.a)); desc = 'C = 4πε₀ε<sub>r</sub>ab/(b − a)'; } }
        const Q = C*v.Vc, W = 0.5*C*v.Vc*v.Vc;
        return {id:'cap', ...v, C, Q, W, Emax, Emin, desc, wd: v.ctype === 'plate' ? 0.5*e*Emax*Emax : null};
      },
      problem: m => ({ chips:[{plate:'parallel plates', coax:'coaxial cylinders', sphere:'concentric spheres'}[m.ctype]].concat(m.ctype === 'plate' ? [`A = ${si(m.A, 'm²')}`, `d = ${si(m.d, 'm')}`] : [`a = ${si(m.a, 'm')}`, `b = ${si(m.b, 'm')}`].concat(m.ctype === 'coax' ? [`L = ${si(m.L, 'm')}`] : [])).concat([`ε<sub>r</sub> = ${n4(m.er)}`, `V = ${si(m.Vc, 'V')}`]) }),
      steps: () => [
        { dur:2400, show:['geo'], info: m => ({ title:'Capacitance', body:'<p>Capacitance depends only on the shape and the material between the conductors.</p>', work:`${m.desc} = <b>${si(m.C, 'F')}</b>` }), rd: m => ['Capacitance C', si(m.C, 'F')] },
        { dur:2200, show:['q'], info: m => ({ title:'Charge', body:'<p>The charge on each conductor is proportional to the voltage.</p>', work:`Q = CV = ${si(m.C, 'F')} × ${si(m.Vc, 'V')} = <b>${si(m.Q, 'C')}</b>` }), rd: m => ['Charge Q', si(m.Q, 'C')] },
        { dur:2600, show:['field'], info: m => ({ title:'Field between the conductors', body: m.ctype === 'plate' ? '<p>Between parallel plates the field is uniform.</p>' : '<p>The field is strongest at the inner conductor, which is where breakdown starts.</p>', work: m.ctype === 'plate' ? `E = V/d = <b>${si(m.Emax, 'V/m')}</b>` : m.ctype === 'coax' ? `E(r) = V/(r ln(b/a))<br>at r = a: <b>${si(m.Emax, 'V/m')}</b><br>at r = b: ${si(m.Emin, 'V/m')}` : `E(r) = Vab/((b − a)r²)<br>at r = a: <b>${si(m.Emax, 'V/m')}</b><br>at r = b: ${si(m.Emin, 'V/m')}` }),
          rd: m => [m.ctype === 'plate' ? 'Field E' : 'Largest field (at a)', si(m.Emax, 'V/m')] },
        { dur:2200, show:[], info: m => ({ title:'Stored energy', body:'<p>The energy is stored in the electric field between the conductors.</p>', work:`W = ½CV² = <b>${si(m.W, 'J')}</b>` + (m.wd != null ? `<br>energy density ½ε₀ε<sub>r</sub>E² = ${si(m.wd, 'J/m³')}` : '') }), rd: m => ['Energy W', si(m.W, 'J')] },
        answerStep()],
      answer: m => [{tone:'y', k:'Capacitance', v:si(m.C, 'F'), s:`Q = ${si(m.Q, 'C')}`}, {tone:'s1', k:'Stored energy', v:si(m.W, 'J'), s:`${m.ctype === 'plate' ? 'E' : 'E max'} = ${si(m.Emax, 'V/m')}`}],
      scene: (m, S) => {
        const cx = S.W/2, cy = S.H/2, vg = S.vis('geo'), vq = S.vis('q'), vf = S.vis('field');
        if (m.ctype === 'plate'){
          const w = Math.min(S.W*.5, 360), gap = Math.min(S.H*.45, 200);
          G.roundRect(cx - w/2, cy - gap/2 - 10, w, 10, 2, RED, {a:vg}); G.roundRect(cx - w/2, cy + gap/2, w, 10, 2, BLUE, {a:vg});
          G.roundRect(cx - w/2, cy - gap/2, w, gap, 0, 'rgba(226,184,111,.08)', {a:vg*Math.min(1, (m.er - 1)/2 + .2)});
          for (let i = 0; i < 9; i++){ const x = cx - w/2 + (i + .5)*w/9; G.text('+', x, cy - gap/2 - 16, {align:'center', color:RED, size:14, a:vq}); G.text('−', x, cy + gap/2 + 28, {align:'center', color:BLUE, size:14, a:vq}); G.arrow(x, cy - gap/2 + 8, x, cy + gap/2 - 8, 'rgba(226,184,111,.85)', 1.6, {a:vf}); }
          G.line(cx + w/2 + 26, cy - gap/2, cx + w/2 + 26, cy + gap/2, TEXT, 1.2, {a:vg}); G.text(`d = ${si(m.d, 'm', 3)}`, cx + w/2 + 34, cy + 4, {color:TEXT, a:vg});
          G.text(`+Q = ${si(m.Q, 'C', 3)}`, cx - w/2, cy - gap/2 - 34, {color:RED, a:vq}); G.text(`E = ${si(m.Emax, 'V/m', 3)}`, cx - w/2 - 12, cy + 4, {color:SAND, a:vf, align:'right'});
        } else {
          const R = Math.min(S.W, S.H)*0.36, ra = R*Math.max(.12, m.a/m.b);
          G.circle(cx, cy, R, {fill:'rgba(226,184,111,.07)', stroke:BLUE, w:5, a:vg}); G.circle(cx, cy, ra, {fill:RED, a:vg});
          for (let i = 0; i < 16; i++){ const t = i*PI/8; G.arrow(cx + (ra + 6)*Math.cos(t), cy + (ra + 6)*Math.sin(t), cx + (R - 8)*Math.cos(t), cy + (R - 8)*Math.sin(t), 'rgba(226,184,111,.85)', 1.5, {a:vf, head:6}); }
          G.text(`a = ${si(m.a, 'm', 3)}`, cx, cy + 5, {align:'center', color:'#10151B', size:12, a:vg}); G.text(`b = ${si(m.b, 'm', 3)}`, cx, cy - R - 12, {align:'center', color:TEXT, a:vg});
          G.text(`+Q = ${si(m.Q, 'C', 3)} on the inner, −Q on the outer`, cx, S.H - 22, {align:'center', color:TEXT, a:vq});
          G.text(m.ctype === 'coax' ? 'cross-section of the coax' : 'cross-section of the spheres', 20, 28, {color:TEXT, a:vg});
        }
      } }
  ];
  const FIELDS = {
    q1:{label:'q₁', units:qU}, x1:{label:'x₁ (m)'}, y1:{label:'y₁ (m)'}, q2:{label:'q₂', units:qU}, x2:{label:'x₂ (m)'}, y2:{label:'y₂ (m)'},
    q3:{label:'q₃ (feels the force)', units:qU}, x3:{label:'x₃ (m)'}, y3:{label:'y₃ (m)'}, px:{label:'P x (m)'}, py:{label:'P y (m)'}, er:{label:'ε<sub>r</sub> of the medium'},
    shape:{label:'Charge shape', type:'select', options:[['sphere', 'Solid sphere'], ['shell', 'Spherical shell'], ['line', 'Infinite line'], ['cylinder', 'Solid cylinder'], ['sheet', 'Infinite sheet']]},
    Q:{label:'Total charge Q', units:qU.slice(1, 2).concat(qU.slice(0, 1), qU.slice(2)), showIf: v => v.shape === 'sphere' || v.shape === 'shell'},
    lam:{label:'Line charge λ', units:[['nC/m', 1e-9], ['µC/m', 1e-6], ['C/m', 1]], showIf: v => v.shape === 'line' || v.shape === 'cylinder'},
    sig:{label:'Surface charge σ', units:[['nC/m²', 1e-9], ['µC/m²', 1e-6], ['C/m²', 1]], showIf: v => v.shape === 'sheet'},
    a:{label:'Radius a', units:lU, showIf: v => v.shape ? (v.shape !== 'line' && v.shape !== 'sheet') : v.ctype !== 'plate'}, b:{label:'Outer radius b', units:lU, showIf: v => v.ctype !== 'plate'},
    r:{label:'Distance r', units:lU, showIf: v => v.shape !== 'sheet'},
    ctype:{label:'Capacitor', type:'select', options:[['plate', 'Parallel plates'], ['coax', 'Coaxial'], ['sphere', 'Spherical']]},
    A:{label:'Plate area A', units:[['cm²', 1e-4], ['m²', 1], ['mm²', 1e-6]], showIf: v => v.ctype === 'plate'}, d:{label:'Gap d', units:lU.slice(2).concat(lU.slice(0, 2)), showIf: v => v.ctype === 'plate'},
    L:{label:'Length L', units:lU, showIf: v => v.ctype === 'coax'}, Vc:{label:'Voltage V (V)'}
  };
  return {MODES, FIELDS};
};
