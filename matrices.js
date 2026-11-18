// Matrices & linear algebra: see a 2×2 matrix transform the plane, plus step-by-step determinant, inverse, systems and eigenvalues.
window.LA = (() => {
  'use strict';
  const MX = window.MX, P = MX.P;
  const EPS = 1e-10;
  // nice display: integers, small fractions, else 4 significant figures
  function fr(x){
    if (!isFinite(x)) return String(x);
    if (Math.abs(x) < 1e-12) return '0';
    if (Math.abs(x - Math.round(x)) < 1e-9) return String(Math.round(x)).replace('-', '−');
    let h0 = 0, h1 = 1, k0 = 1, k1 = 0, b = Math.abs(x);
    for (let i = 0; i < 20; i++){ const a = Math.floor(b), h2 = a*h1 + h0, k2 = a*k1 + k0; if (k2 > 1000) break; h0 = h1; h1 = h2; k0 = k1; k1 = k2; if (Math.abs(Math.abs(x) - h1/k1) < 1e-9*Math.max(1, Math.abs(x))) return (x < 0 ? '−' : '') + `${h1}/${k1}`; b = 1/(b - a); if (!isFinite(b)) break; }
    return MX.fmt(x, 4);
  }
  function parse(src, what = 'the matrix'){
    if (!src || !src.trim()) throw new Error(`Type ${what}: rows separated by ; or new lines, entries by spaces or commas.`);
    const rows = src.trim().split(/\s*[;\n]\s*/).filter(r => r.trim()).map(r => r.trim().split(/[\s,]+/).filter(Boolean).map(e => { const v = MX.evalNumber(e); if (!isFinite(v)) throw new Error(`"${e}" in ${what} is not a number.`); return v; }));
    const n = rows[0].length; if (rows.some(r => r.length !== n)) throw new Error(`Every row of ${what} needs the same number of entries.`);
    return rows;
  }
  const clone = A => A.map(r => r.slice());
  const clean = A => A.map(r => r.map(v => Math.abs(v) < EPS ? 0 : v));
  // Gaussian elimination to reduced row echelon form, recording each row operation
  function rref(Ain, ncols = Ain[0].length, opts = {}){
    const A = clone(Ain), m = A.length, ops = [], pivots = []; let r = 0;
    const R = i => `R${'₁₂₃₄₅₆₇₈₉'[i]}`;
    for (let c = 0; c < ncols && r < m; c++){
      let p = r; for (let i = r + 1; i < m; i++) if (Math.abs(A[i][c]) > Math.abs(A[p][c]) + EPS && opts.partial !== false) p = i;
      if (opts.partial === false){ p = -1; for (let i = r; i < m; i++) if (Math.abs(A[i][c]) > EPS){ p = i; break; } if (p < 0) continue; }
      if (Math.abs(A[p][c]) < EPS) continue;
      if (p !== r){ [A[p], A[r]] = [A[r], A[p]]; ops.push({t:`${R(r)} ↔ ${R(p)}`, M:clean(A), piv:[r, c]}); }
      const pv = A[r][c]; if (Math.abs(pv - 1) > EPS){ A[r] = A[r].map(v => v/pv); ops.push({t:`${R(r)} → ${R(r)} ÷ ${fr(pv)}`, M:clean(A), piv:[r, c]}); }
      for (let i = 0; i < m; i++){ if (i === r || (opts.forwardOnly && i < r)) continue; const f = A[i][c]; if (Math.abs(f) < EPS) continue; A[i] = A[i].map((v, j) => v - f*A[r][j]); ops.push({t:`${R(i)} → ${R(i)} ${f < 0 ? '+' : '−'} ${fr(Math.abs(f))}${R(r)}`, M:clean(A), piv:[r, c]}); }
      pivots.push(c); r++;
    }
    return {A:clean(A), ops, pivots, rank:r};
  }
  function det(A){
    const n = A.length, B = clone(A); let d = 1;
    for (let c = 0; c < n; c++){ let p = c; for (let i = c + 1; i < n; i++) if (Math.abs(B[i][c]) > Math.abs(B[p][c])) p = i; if (Math.abs(B[p][c]) < 1e-14) return 0; if (p !== c){ [B[p], B[c]] = [B[c], B[p]]; d = -d; } d *= B[c][c]; for (let i = c + 1; i < n; i++){ const f = B[i][c]/B[c][c]; for (let j = c; j < n; j++) B[i][j] -= f*B[c][j]; } }
    return d;
  }
  // characteristic polynomial det(λI − A) by Faddeev–LeVerrier, ascending coefficients
  function charPoly(A){
    const n = A.length; let M = A.map((r, i) => r.map((_, j) => 0)); const c = new Array(n + 1).fill(0); c[n] = 1;
    for (let k = 1; k <= n; k++){
      M = M.map((r, i) => r.map((_, j) => A[i].reduce((s, a, l) => s + a*M[l][j], 0) + (i === j ? c[n - k + 1] : 0)));
      const AM = A.map((r, i) => r.map((_, j) => r.reduce((s, a, l) => s + a*M[l][j], 0)));
      c[n - k] = -AM.reduce((s, r, i) => s + r[i], 0)/k;
    }
    return c;
  }
  function nullSpace(A){
    const {A:R, pivots} = rref(A), n = A[0].length, free = [...Array(n).keys()].filter(j => !pivots.includes(j));
    return free.map(f => { const v = new Array(n).fill(0); v[f] = 1; pivots.forEach((pc, i) => { v[pc] = -R[i][f]; }); return v; });
  }
  function eig(A){
    const cp = charPoly(A), roots = P.roots(cp).map(r => [Math.abs(r[0]) < 1e-9 ? 0 : r[0], Math.abs(r[1]) < 1e-9*Math.max(1, Math.abs(r[0])) ? 0 : r[1]]);
    // merge repeated roots (Durand–Kerner leaves them slightly apart)
    // a root of multiplicity k is only found to about ε^(1/k), so cluster loosely and use the cluster mean, which is accurate
    const vals = []; roots.sort((a, b) => b[0] - a[0] || b[1] - a[1]).forEach(r => { const hit = vals.find(v => Math.hypot(v.re - r[0], v.im - r[1]) < 2e-4*Math.max(1, Math.hypot(r[0], r[1]))); if (hit){ hit.mult++; hit.re = (hit.re*(hit.mult - 1) + r[0])/hit.mult; hit.im = (hit.im*(hit.mult - 1) + r[1])/hit.mult; } else vals.push({re:r[0], im:r[1], mult:1}); });
    // polish: a root of multiplicity k is a simple root of the (k−1)th derivative, so Newton converges fast there
    vals.forEach(v => {
      let q = cp; for (let i = 1; i < v.mult; i++) q = P.deriv(q); const dq = P.deriv(q); let z = [v.re, v.im];
      for (let it = 0; it < 30; it++){ const f = P.evalC(q, z), d = P.evalC(dq, z); if (MX.C.abs(d) === 0) break; const st = MX.C.div(f, d); z = MX.C.sub(z, st); if (MX.C.abs(st) < 1e-15*Math.max(1, MX.C.abs(z))) break; }
      if (isFinite(z[0]) && Math.hypot(z[0] - v.re, z[1] - v.im) < 1e-2*Math.max(1, Math.hypot(v.re, v.im))){ v.re = z[0]; v.im = z[1]; }
      if (Math.abs(v.re - Math.round(v.re)) < 1e-9) v.re = Math.round(v.re); if (Math.abs(v.im) < 1e-9*Math.max(1, Math.abs(v.re))) v.im = 0;
    });
    vals.forEach(v => {
      if (v.im !== 0){ v.vecs = []; return; }
      // null space with a looser tolerance so rounding in λ does not hide it
      const B = A.map((r, i) => r.map((a, j) => a - (i === j ? v.re : 0)));
      const sc = Math.max(1, ...B.flat().map(Math.abs)), R = rrefTol(B, 1e-7*sc), n = A.length, free = [...Array(n).keys()].filter(j => !R.pivots.includes(j));
      v.vecs = free.map(f => { const x = new Array(n).fill(0); x[f] = 1; R.pivots.forEach((pc, i) => { x[pc] = -R.A[i][f]; }); return x; });
    });
    return {cp, vals};
  }
  function rrefTol(Ain, tol){
    const A = clone(Ain), m = A.length, n = A[0].length, pivots = []; let r = 0;
    for (let c = 0; c < n && r < m; c++){ let p = r; for (let i = r + 1; i < m; i++) if (Math.abs(A[i][c]) > Math.abs(A[p][c])) p = i; if (Math.abs(A[p][c]) < tol) continue; [A[p], A[r]] = [A[r], A[p]]; const pv = A[r][c]; A[r] = A[r].map(v => v/pv); for (let i = 0; i < m; i++) if (i !== r){ const f = A[i][c]; A[i] = A[i].map((v, j) => v - f*A[r][j]); } pivots.push(c); r++; }
    return {A, pivots};
  }
  return {fr, parse, rref, det, charPoly, nullSpace, eig, clone};
})();

(() => {
  'use strict';
  const MX = window.MX, PL = window.PLOT, LA = window.LA, $ = id => document.getElementById(id);
  const BLUE = '#8AB4F0', TEAL = '#7CC6BE', SAND = '#E2B86F', SAGE = '#8FC79A', LILAC = '#B6A2DE', RED = '#E07A6E', TEXT = '#D5DCE4';
  let needs = true;
  const canvas = $('laCanvas'), ctx = PL.fit(canvas, () => { needs = true; });
  const S = {a:1, b:1, c:0, d:1, t:1, v:[1, 1], anim:0}, keys = ['a', 'b', 'c', 'd'];
  keys.forEach(k => { const r = $('mx' + k), o = $('mx' + k + 'o'); r.min = -3; r.max = 3; r.step = 0.05; r.value = S[k]; const sh = () => { o.value = MX.fmt(S[k], 3); }; r.addEventListener('input', () => { S[k] = +r.value; sh(); needs = true; }); sh(); });
  function setM(a, b, c, d){ Object.assign(S, {a, b, c, d}); keys.forEach(k => { $('mx' + k).value = S[k]; $('mx' + k + 'o').value = MX.fmt(S[k], 3); }); S.anim = performance.now(); needs = true; }
  document.querySelectorAll('[data-m]').forEach(btn => btn.addEventListener('click', () => { const [a, b, c, d] = btn.dataset.m.split(',').map(Number); setM(a, b, c, d); }));
  $('laMorph').addEventListener('click', () => { S.anim = performance.now(); needs = true; });
  let dragV = false;
  const view = () => { const w = canvas._w, h = canvas._h, s = Math.min(w, h)/7; return {w, h, s, X:x => w/2 + x*s, Y:y => h/2 - y*s, ix:px => (px - w/2)/s, iy:py => (h/2 - py)/s}; };
  canvas.addEventListener('pointerdown', e => { const V = view(), r = canvas.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top; if (Math.hypot(V.X(S.v[0]) - px, V.Y(S.v[1]) - py) < 16){ dragV = true; canvas.setPointerCapture(e.pointerId); } });
  canvas.addEventListener('pointermove', e => { const V = view(), r = canvas.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top; if (dragV){ S.v = [Math.round(V.ix(px)*4)/4, Math.round(V.iy(py)*4)/4]; needs = true; } canvas.style.cursor = dragV ? 'grabbing' : Math.hypot(V.X(S.v[0]) - px, V.Y(S.v[1]) - py) < 16 ? 'grab' : 'default'; });
  canvas.addEventListener('pointerup', () => { dragV = false; });
  canvas.style.touchAction = 'none';
  function arrow(V, x, y, col, w = 2.6, label, from = [0, 0]){
    const X1 = V.X(from[0]), Y1 = V.Y(from[1]), X2 = V.X(x), Y2 = V.Y(y), a = Math.atan2(Y2 - Y1, X2 - X1);
    ctx.save(); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(X1, Y1); ctx.lineTo(X2 - 7*Math.cos(a), Y2 - 7*Math.sin(a)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(X2, Y2); ctx.lineTo(X2 - 11*Math.cos(a - .4), Y2 - 11*Math.sin(a - .4)); ctx.lineTo(X2 - 11*Math.cos(a + .4), Y2 - 11*Math.sin(a + .4)); ctx.closePath(); ctx.fill(); ctx.restore();
    if (label) PL.label(ctx, X2 + 8, Y2 - 8, label, {color:col, size:13});
  }
  function draw(now){
    const V = view(); ctx.clearRect(0, 0, V.w, V.h);
    const k = S.anim ? Math.min(1, (now - S.anim)/1400) : 1, e = k < .5 ? 2*k*k : 1 - Math.pow(-2*k + 2, 2)/2;
    const a = 1 + (S.a - 1)*e, b = S.b*e, c = S.c*e, d = 1 + (S.d - 1)*e, T = (x, y) => [a*x + b*y, c*x + d*y];
    // original grid, faint
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.lineWidth = 1; ctx.beginPath(); for (let i = -12; i <= 12; i++){ ctx.moveTo(V.X(i), 0); ctx.lineTo(V.X(i), V.h); ctx.moveTo(0, V.Y(i)); ctx.lineTo(V.w, V.Y(i)); } ctx.stroke(); ctx.restore();
    // transformed grid
    ctx.save(); ctx.lineWidth = 1.1; for (let i = -10; i <= 10; i++){ [[T(i, -10), T(i, 10)], [T(-10, i), T(10, i)]].forEach(([p, q], j) => { ctx.strokeStyle = i === 0 ? 'rgba(213,220,228,.6)' : j ? 'rgba(138,180,240,.22)' : 'rgba(124,198,190,.22)'; ctx.beginPath(); ctx.moveTo(V.X(p[0]), V.Y(p[1])); ctx.lineTo(V.X(q[0]), V.Y(q[1])); ctx.stroke(); }); } ctx.restore();
    // unit square and its image
    const dt = a*d - b*c, sq = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([x, y]) => T(x, y));
    ctx.save(); ctx.fillStyle = dt >= 0 ? 'rgba(226,184,111,.28)' : 'rgba(224,122,110,.32)'; ctx.beginPath(); sq.forEach(([x, y], i) => i ? ctx.lineTo(V.X(x), V.Y(y)) : ctx.moveTo(V.X(x), V.Y(y))); ctx.closePath(); ctx.fill(); ctx.restore();
    PL.label(ctx, V.X((sq[0][0] + sq[2][0])/2), V.Y((sq[0][1] + sq[2][1])/2) + 4, `area ${MX.fmt(Math.abs(dt), 3)}`, {color:dt >= 0 ? SAND : RED, size:12, align:'center'});
    // eigenvector directions of the full matrix, once the morph is done
    const ev = LA.eig([[S.a, S.b], [S.c, S.d]]);
    if (k >= 1) ev.vals.forEach((v, i) => v.vecs.forEach(x => { const L = Math.hypot(x[0], x[1]), u = [x[0]/L, x[1]/L]; ctx.save(); ctx.strokeStyle = 'rgba(143,199,154,.75)'; ctx.setLineDash([6, 5]); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(V.X(-12*u[0]), V.Y(-12*u[1])); ctx.lineTo(V.X(12*u[0]), V.Y(12*u[1])); ctx.stroke(); ctx.restore(); PL.label(ctx, V.X(3.6*u[0]) + 6, V.Y(3.6*u[1]) - 6, `λ = ${LA.fr(v.re)}`, {color:SAGE, size:12.5}); }));
    arrow(V, ...T(1, 0), TEAL, 3, 'Aî'); arrow(V, ...T(0, 1), BLUE, 3, 'Aĵ');
    const Av = T(S.v[0], S.v[1]);
    arrow(V, S.v[0], S.v[1], 'rgba(213,220,228,.7)', 2, 'v'); arrow(V, Av[0], Av[1], SAND, 2.6, 'Av');
    ctx.save(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(V.X(S.v[0]), V.Y(S.v[1]), 6, 0, 2*Math.PI); ctx.fill(); ctx.restore();
    const valTxt = ev.vals.map(v => v.im ? `${MX.fmt(v.re, 4)} ± ${MX.fmt(Math.abs(v.im), 4)}i` : `${LA.fr(v.re)}${v.mult > 1 ? ` (×${v.mult})` : ''}`).filter((s, i, arr) => arr.indexOf(s) === i).join(', ');
    $('laRead').innerHTML = `A = [${LA.fr(S.a)} ${LA.fr(S.b)}; ${LA.fr(S.c)} ${LA.fr(S.d)}]<br>det = <b>${MX.fmt(S.a*S.d - S.b*S.c, 5)}</b>, trace = ${MX.fmt(S.a + S.d, 5)}<br>eigenvalues: <b>${valTxt}</b>${ev.vals.some(v => v.im) ? '<br><span class="c">complex: the matrix rotates every direction</span>' : ''}<br>v = (${MX.fmt(S.v[0], 3)}, ${MX.fmt(S.v[1], 3)}) → Av = (${MX.fmt(S.a*S.v[0] + S.b*S.v[1], 4)}, ${MX.fmt(S.c*S.v[0] + S.d*S.v[1], 4)})<br><span class="c">drag the white dot to move v</span>`;
    return k < 1;
  }
  function loop(now){ if (needs){ needs = draw(now); } requestAnimationFrame(loop); }
  const rm = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  $('hPlay') && $('hPlay').addEventListener('click', () => $('play').scrollIntoView({behavior: rm ? 'auto' : 'smooth'}));
  window.__la = {S, setM};
  requestAnimationFrame(loop);
})();

// ---------------- step-by-step questions ----------------
window.FORMULA_PAGE = (G) => {
  'use strict';
  const MX = window.MX, LA = window.LA, fr = LA.fr;
  const BLUE = '#8AB4F0', TEAL = '#7CC6BE', SAND = '#E2B86F', SAGE = '#8FC79A', LILAC = '#B6A2DE', RED = '#E07A6E', TEXT = '#D5DCE4';
  const cardsHTML = cards => `<div class="answer">${cards.filter(Boolean).map(c => `<div class="ans ${c.tone || 'y'}"><div class="k">${c.k}</div><div class="v">${c.v}</div><div class="s">${c.s || ''}</div></div>`).join('')}</div>`;
  const MODE_OF = m => MODES.find(x => x.id === m.id);
  const answerStep = () => ({ dur:1600, show:[], info: m => ({ title:'Answer', body: cardsHTML(MODE_OF(m).answer(m)) + (MODE_OF(m).note && MODE_OF(m).note(m) ? `<p>${MODE_OF(m).note(m)}</p>` : ''), work:'' }) });
  const mat = M => `[${M.map(r => r.map(fr).join('  ')).join(' ; ')}]`;
  const matHTML = M => `<span style="display:inline-block;vertical-align:middle;border-left:2px solid currentColor;border-right:2px solid currentColor;padding:0 6px;line-height:1.5">${M.map(r => r.map(v => `<span style="display:inline-block;min-width:3.4em;text-align:right">${fr(v)}</span>`).join('')).join('<br>')}</span>`;
  const square = (A, max = 5) => { if (A.length !== A[0].length) throw new Error(`The matrix must be square (it is ${A.length}×${A[0].length}).`); if (A.length > max) throw new Error(`Use at most ${max}×${max}.`); };
  const R = i => `R${'₁₂₃₄₅₆₇₈₉'[i]}`;
  const GLYPH = {
    det:'<path d="M5 26 L13 6 L29 10 L21 30 Z" transform="translate(0 -2)"/>',
    inv:'<path d="M6 5 V27 M26 5 V27 M10 10 H14 M18 22 H22"/><path d="M20 6 L24 6 M22 4 V8" />',
    sys:'<path d="M5 9 H27 M5 16 H27 M5 23 H27"/><path d="M19 5 V27" stroke-dasharray="2 3"/>',
    eig:'<path d="M4 28 L28 4" stroke-dasharray="3 3"/><path d="M8 24 L16 16 M16 16 L13 16 M16 16 L16 19"/><path d="M8 24 L22 10 M22 10 L18 10 M22 10 L22 14" stroke-width="2.4"/>'
  };
  const glyph = k => `<svg viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${GLYPH[k]}</svg>`;
  // draw a matrix with brackets; optional divider (augmented) and highlighted pivot
  function drawMatrix(M, cx, cy, o = {}){
    const m = M.length, n = M[0].length, ctx = G.ctx(), cw = o.cw || 74, rh = o.rh || 40, w = n*cw, h = m*rh, x0 = cx - w/2, y0 = cy - h/2, a = o.a ?? 1;
    ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = TEXT; ctx.lineWidth = 2;
    [[x0 - 8, 1], [x0 + w + 8, -1]].forEach(([x, s]) => { ctx.beginPath(); ctx.moveTo(x + 8*s, y0 - 4); ctx.lineTo(x, y0 - 4); ctx.lineTo(x, y0 + h + 4); ctx.lineTo(x + 8*s, y0 + h + 4); ctx.stroke(); });
    if (o.split){ ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(213,220,228,.5)'; ctx.beginPath(); ctx.moveTo(x0 + o.split*cw, y0 - 2); ctx.lineTo(x0 + o.split*cw, y0 + h + 2); ctx.stroke(); }
    ctx.restore();
    if (o.piv){ G.roundRect(x0 + o.piv[1]*cw + 4, y0 + o.piv[0]*rh + 4, cw - 8, rh - 8, 6, 'rgba(226,184,111,.22)', {a}); }
    if (o.hiRow !== undefined) G.roundRect(x0 - 4, y0 + o.hiRow*rh + 2, w + 8, rh - 4, 6, 'rgba(138,180,240,.12)', {a});
    M.forEach((r, i) => r.map((v, j) => G.text(fr(v), x0 + (j + .5)*cw, y0 + (i + .5)*rh + 6, {align:'center', mono:true, size:o.size || 16, a, color: o.colCol && j >= o.split ? SAND : '#fff'})));
    return {x0, y0, w, h};
  }
  // play through a list of recorded row operations in proportion to the step progress
  function opsScene(m, S, ops, start, split, label){
    const vo = S.vis('ops'), k = Math.min(ops.length, Math.floor(vo*(ops.length + .999))), cur = k === 0 ? start : ops[k - 1].M;
    const n = cur[0].length, cw = Math.min(78, (S.W - 80)/n), rh = Math.min(46, (S.H - 150)/cur.length);
    drawMatrix(cur, S.W/2, S.H/2 + 10, {cw, rh, split, piv: k ? ops[k - 1].piv : null, colCol: !!split});
    G.text(k ? ops[k - 1].t : label, S.W/2, 46, {align:'center', size:17, color:SAND, mono:true});
    if (ops.length) G.text(`operation ${k} of ${ops.length}`, S.W/2, S.H - 22, {align:'center', size:12, color:'rgba(213,220,228,.55)'});
  }

  const MODES = [
    { id:'det', title:'Determinant', desc:'2×2 formula, 3×3 cofactor expansion, or row reduction for larger', glyph:glyph('det'),
      fields:['A'], defaults:{A:'2 -1 3; 1 4 0; -2 1 5'},
      compute: v => {
        const A = LA.parse(v.A); square(A); const n = A.length, d = LA.det(A);
        let cof = null; if (n === 3) cof = [0, 1, 2].map(j => { const minor = A.slice(1).map(r => r.filter((_, k) => k !== j)), md = minor[0][0]*minor[1][1] - minor[0][1]*minor[1][0]; return {j, a:A[0][j], minor, md, sign: j % 2 ? -1 : 1}; });
        // row reduction (forward only) for the n ≥ 4 explanation
        const B = LA.clone(A), ops = []; let swaps = 0; for (let c = 0; c < n; c++){ let p = c; for (let i = c + 1; i < n; i++) if (Math.abs(B[i][c]) > Math.abs(B[p][c])) p = i; if (Math.abs(B[p][c]) < 1e-12) break; if (p !== c){ [B[p], B[c]] = [B[c], B[p]]; swaps++; ops.push({t:`${R(c)} ↔ ${R(p)} (sign flips)`, M:B.map(r => r.slice()), piv:[c, c]}); } for (let i = c + 1; i < n; i++){ const f = B[i][c]/B[c][c]; if (Math.abs(f) < 1e-14) continue; B[i] = B[i].map((x, j) => x - f*B[c][j]); ops.push({t:`${R(i)} → ${R(i)} ${f < 0 ? '+' : '−'} ${fr(Math.abs(f))}${R(c)}`, M:B.map(r => r.map(x => Math.abs(x) < 1e-12 ? 0 : x)), piv:[c, c]}); } }
        return {id:'det', A, n, d, cof, ops, swaps, U:B};
      },
      problem: m => ({ chips:[`A = ${mat(m.A)}`] }),
      steps: () => [
        { dur:2000, show:['A'], info: m => ({ title:'The matrix', body:'<p>The determinant measures how the matrix scales area (2×2) or volume (3×3); its sign says whether orientation flips. It is zero exactly when A has no inverse.</p>', work:matHTML(m.A) }) },
        { dur:3400, show:['ops'], info: m => m.n === 1 ? ({ title:'1×1', body:'', work:`det = ${fr(m.A[0][0])}` }) : m.n === 2 ? ({ title:'2×2 formula', body:'<p>Multiply down the diagonals and subtract.</p>', work:`det = ad − bc = ${fr(m.A[0][0])}·${fr(m.A[1][1])} − ${fr(m.A[0][1])}·${fr(m.A[1][0])} = <b>${fr(m.d)}</b>` })
            : m.n === 3 ? ({ title:'Expand along the first row', body:'<p>Each entry times its 2×2 minor, with signs + − +.</p>', work: m.cof.map(c => `${c.sign > 0 ? '+' : '−'} ${fr(c.a)} × det${mat(c.minor)} = ${c.sign > 0 ? '+' : '−'} ${fr(c.a)} × ${fr(c.md)}`).join('<br>') + `<br>= <b>${fr(m.d)}</b>` })
            : ({ title:'Reduce to triangular form', body:'<p>Adding multiples of rows does not change the determinant; each swap flips its sign. Then multiply the diagonal.</p>', work: m.ops.slice(0, 10).map(o => o.t).join('<br>') + (m.ops.length > 10 ? '<br>…' : '') + `<br>diagonal: ${m.U.map((r, i) => fr(r[i])).join(' × ')} × (−1)<sup>${m.swaps}</sup> = <b>${fr(m.d)}</b>` }), rd: m => ['Determinant', fr(m.d)] },
        answerStep()],
      answer: m => [{tone:'y', k:'det A', v:fr(m.d), s: Math.abs(m.d) < 1e-12 ? 'singular: no inverse' : 'invertible'}],
      scene: (m, S) => {
        if (m.n >= 4){ if (S.vis('ops') > 0) return opsScene(m, S, m.ops, m.A, 0, 'det'); return drawMatrix(m.A, S.W/2, S.H/2, {a:S.vis('A')}); }
        const vA = S.vis('A'), vo = S.vis('ops');
        drawMatrix(m.A, S.W/2, m.n === 3 ? S.H*0.3 : S.H*0.42, {a:vA, cw:70});
        if (m.n === 3) m.cof.forEach((c, i) => { const a = Math.min(1, Math.max(0, vo*3 - i)); if (a <= 0) return; const x = S.W*(0.2 + 0.3*i), y = S.H*0.68; G.text(`${c.sign > 0 ? '+' : '−'} ${fr(c.a)} ×`, x - 66, y + 6, {align:'right', size:16, mono:true, a, color:SAND}); drawMatrix(c.minor, x, y, {cw:46, rh:34, size:14, a}); G.text(`= ${c.sign > 0 ? '' : '−'}${fr(c.a*c.md)}`.replace('−−', ''), x, y + 52, {align:'center', a, color:TEXT, mono:true}); });
        if (m.n === 2 && vo > 0) G.text(`${fr(m.A[0][0])}·${fr(m.A[1][1])} − ${fr(m.A[0][1])}·${fr(m.A[1][0])} = ${fr(m.d)}`, S.W/2, S.H*0.7, {align:'center', size:20, mono:true, color:SAND, a:vo});
        if (vo > .95) G.text(`det = ${fr(m.d)}`, S.W/2, S.H - 24, {align:'center', size:18, weight:700});
      } },

    { id:'inv', title:'Inverse by Gauss–Jordan', desc:'Row-reduce [A | I] until the left side is I', glyph:glyph('inv'),
      fields:['A'], defaults:{A:'2 1 1; 1 3 2; 1 0 0'},
      compute: v => {
        const A = LA.parse(v.A); square(A, 4); const n = A.length, aug = A.map((r, i) => r.concat(A.map((_, j) => i === j ? 1 : 0)));
        const res = LA.rref(aug, n), singular = res.rank < n, Ainv = singular ? null : res.A.map(r => r.slice(n));
        return {id:'inv', A, n, aug, ops:res.ops, R:res.A, singular, Ainv, d:LA.det(A)};
      },
      problem: m => ({ chips:[`A = ${mat(m.A)}`] }),
      steps: () => [
        { dur:2000, show:['A'], info: m => ({ title:'Set up [A | I]', body:'<p>Write the identity next to A. Every row operation is done to both halves.</p>', work:`det A = ${fr(m.d)}${Math.abs(m.d) < 1e-12 ? ' (zero, so expect no inverse)' : ''}` }) },
        { dur:Math.max(3000, 600), show:['ops'], info: m => ({ title:'Row reduce', body:'<p>Make each pivot 1 and clear the rest of its column.</p>', work: m.ops.slice(0, 14).map(o => o.t).join('<br>') + (m.ops.length > 14 ? `<br>… (${m.ops.length} operations)` : '') }) },
        { dur:2200, show:['res'], info: m => m.singular ? ({ title:'No inverse', body:'<p>A row of zeros appeared on the left, so the left half can never become I. A is singular.</p>', work:matHTML(m.R) }) : ({ title:'Read off A⁻¹', body:'<p>The left half is now I, so the right half is A⁻¹.</p>', work:matHTML(m.Ainv) }), rd: m => ['A⁻¹', m.singular ? 'does not exist' : mat(m.Ainv)] },
        answerStep()],
      answer: m => [{tone:'y', k:'A⁻¹', v: m.singular ? 'none' : `<span style="white-space:normal">${matHTML(m.Ainv)}</span>`, s: m.singular ? 'A is singular (det = 0)' : `det A = ${fr(m.d)}`}],
      scene: (m, S) => { if (S.vis('ops') > 0) return opsScene(m, S, m.ops, m.aug, m.n, '[A | I]'); drawMatrix(m.aug, S.W/2, S.H/2, {split:m.n, colCol:true, a:S.vis('A'), cw:Math.min(70, (S.W - 80)/(2*m.n))}); } },

    { id:'sys', title:'Solve a linear system', desc:'Gaussian elimination: unique, none or infinitely many solutions', glyph:glyph('sys'),
      fields:['A', 'bv'], defaults:{A:'2 1 -1; -3 -1 2; -2 1 2', bv:'8; -11; -3'},
      compute: v => {
        const A = LA.parse(v.A, 'the coefficient matrix'), b = LA.parse(v.bv, 'b').flat(); const m = A.length, n = A[0].length;
        if (b.length !== m) throw new Error(`b needs ${m} entries, one per equation (it has ${b.length}).`); if (n > 6 || m > 6) throw new Error('Use at most 6 equations and 6 unknowns.');
        const aug = A.map((r, i) => r.concat([b[i]])), res = LA.rref(aug, n), rankA = res.rank, inconsistent = res.A.some(r => r.slice(0, n).every(x => Math.abs(x) < 1e-10) && Math.abs(r[n]) > 1e-10);
        const xs = 'xyzwuv'.slice(0, n).split(''); let kind, sol = null, param = null;
        if (inconsistent) kind = 'none';
        else if (rankA === n){ kind = 'unique'; sol = new Array(n).fill(0); res.pivots.forEach((pc, i) => { sol[pc] = res.A[i][n]; }); }
        else { kind = 'many'; const free = [...Array(n).keys()].filter(j => !res.pivots.includes(j)); param = {free, rows:res.pivots.map((pc, i) => ({pc, c:res.A[i][n], coef:free.map(f => -res.A[i][f])}))}; }
        return {id:'sys', A, b, aug, m, n, ops:res.ops, R:res.A, rankA, rankAug: inconsistent ? rankA + 1 : rankA, kind, sol, param, xs};
      },
      problem: m => ({ chips: m.A.map((r, i) => `${r.map((a, j) => `${j && a >= 0 ? '+ ' : ''}${fr(a)}${m.xs[j]}`).join(' ')} = ${fr(m.b[i])}`.replace(/\+ −/g, '− ')) }),
      steps: () => [
        { dur:2000, show:['A'], info: m => ({ title:'Augmented matrix', body:'<p>Write the coefficients with the right-hand side as an extra column.</p>', work:matHTML(m.aug) }) },
        { dur:3200, show:['ops'], info: m => ({ title:'Eliminate', body:'<p>Use row operations to reach reduced row echelon form.</p>', work: m.ops.slice(0, 14).map(o => o.t).join('<br>') + (m.ops.length > 14 ? `<br>… (${m.ops.length} operations)` : '') }) },
        { dur:2600, show:['res'], info: m => ({ title: m.kind === 'unique' ? 'One solution' : m.kind === 'none' ? 'No solution' : 'Infinitely many solutions', body: m.kind === 'none' ? '<p>A row says 0 = (non-zero), which is impossible: the equations contradict each other.</p>' : m.kind === 'many' ? `<p>Rank ${m.rankA} is less than the ${m.n} unknowns, so ${m.n - m.rankA} variable${m.n - m.rankA > 1 ? 's are' : ' is'} free.</p>` : '<p>Every column has a pivot, so each unknown is fixed.</p>',
            work:`rank A = ${m.rankA}, rank [A|b] = ${m.rankAug}<br>` + (m.kind === 'unique' ? m.sol.map((v, i) => `${m.xs[i]} = <b>${fr(v)}</b>`).join(', ') : m.kind === 'many' ? solText(m) : 'inconsistent') }), rd: m => ['Solution', m.kind === 'unique' ? m.sol.map((v, i) => `${m.xs[i]} = ${fr(v)}`).join(', ') : m.kind === 'none' ? 'none' : solText(m)] },
        answerStep()],
      answer: m => [{tone:'y', k: m.kind === 'unique' ? 'Unique solution' : m.kind === 'none' ? 'No solution' : 'Infinitely many', v: m.kind === 'unique' ? m.sol.map((v, i) => `${m.xs[i]} = ${fr(v)}`).join('<br>') : m.kind === 'none' ? '—' : `<span style="white-space:normal;font-size:15px">${solText(m)}</span>`, s:`rank ${m.rankA} of ${m.n} unknowns`}],
      scene: (m, S) => { if (S.vis('ops') > 0) return opsScene(m, S, m.ops, m.aug, m.n, '[A | b]'); drawMatrix(m.aug, S.W/2, S.H/2, {split:m.n, colCol:true, a:S.vis('A'), cw:Math.min(74, (S.W - 80)/(m.n + 1))}); } },

    { id:'eig', title:'Eigenvalues and eigenvectors', desc:'Characteristic polynomial, its roots, and the null space for each λ', glyph:glyph('eig'),
      fields:['A'], defaults:{A:'4 1; 2 3'},
      compute: v => {
        const A = LA.parse(v.A); square(A, 4); const n = A.length, {cp, vals} = LA.eig(A);
        return {id:'eig', A, n, cp, vals, tr:A.reduce((s, r, i) => s + r[i], 0), d:LA.det(A)};
      },
      problem: m => ({ chips:[`A = ${mat(m.A)}`] }),
      steps: () => [
        { dur:2400, show:['A'], info: m => ({ title:'Characteristic equation', body:'<p>λ is an eigenvalue when A − λI has no inverse, so det(A − λI) = 0.</p>', work:`det(λI − A) = ${MX.P.toString(m.cp.map(c => Math.abs(c) < 1e-12 ? 0 : c), 'λ')} = 0` + (m.n === 2 ? `<br><span class="c">for 2×2: λ² − (trace)λ + det, trace = ${fr(m.tr)}, det = ${fr(m.d)}</span>` : '') }) },
        { dur:2600, show:['vals'], info: m => ({ title:'Eigenvalues', body:'<p>Solve the polynomial. Their sum is the trace and their product is the determinant.</p>', work: m.vals.map(v => `λ = <b>${v.im ? `${MX.fmt(v.re, 6)} ± ${MX.fmt(Math.abs(v.im), 6)}i` : fr(v.re)}</b>${v.mult > 1 ? ` (repeated ×${v.mult})` : ''}`).filter((s, i, a) => a.indexOf(s) === i).join('<br>') }), rd: m => ['Eigenvalues', m.vals.map(v => v.im ? `${MX.fmt(v.re, 5)} ± ${MX.fmt(Math.abs(v.im), 5)}i` : fr(v.re)).filter((s, i, a) => a.indexOf(s) === i).join(', ')] },
        { dur:3000, show:['vecs'], info: m => ({ title:'Eigenvectors', body:'<p>For each real λ, solve (A − λI)v = 0; any non-zero solution is an eigenvector.</p>', work: m.vals.filter(v => !v.im).map(v => `λ = ${fr(v.re)}: ${v.vecs.length ? v.vecs.map(x => `(${x.map(fr).join(', ')})`).join(', ') : 'none found'}${v.mult > v.vecs.length ? ' <span class="c">(fewer vectors than the repeat count: not diagonalisable)</span>' : ''}`).join('<br>') + (m.vals.some(v => v.im) ? '<br><span class="c">complex eigenvalues have complex eigenvectors, so there is no real direction left unchanged</span>' : '') }),
          rd: m => m.vals.filter(v => !v.im).map(v => [`Eigenvector for λ = ${fr(v.re)}`, v.vecs.map(x => `(${x.map(fr).join(', ')})`).join(', ') || '—']) },
        answerStep()],
      answer: m => [{tone:'y', k:'Eigenvalues', v: m.vals.map(v => v.im ? `${MX.fmt(v.re, 4)} ± ${MX.fmt(Math.abs(v.im), 4)}i` : fr(v.re)).filter((s, i, a) => a.indexOf(s) === i).join(', '), s:`sum ${fr(m.tr)} = trace, product ${fr(m.d)} = det`}],
      scene: (m, S) => {
        const vA = S.vis('A'), vv = S.vis('vals'), vx = S.vis('vecs');
        if (m.n !== 2){ drawMatrix(m.A, S.W/2, S.H*0.35, {a:vA}); m.vals.forEach((v, i) => G.text(`λ = ${v.im ? `${MX.fmt(v.re, 4)} ± ${MX.fmt(Math.abs(v.im), 4)}i` : fr(v.re)}${v.vecs && v.vecs.length ? `   v = (${v.vecs[0].map(fr).join(', ')})` : ''}`, S.W/2, S.H*0.62 + i*28, {align:'center', mono:true, size:15, a:Math.max(vv, vx), color: i % 2 ? TEAL : SAND})); return; }
        // 2×2: show what A does to the eigen-directions
        const ctx = G.ctx(), s = Math.min(S.W, S.H)/10, X = x => S.W*0.62 + x*s, Y = y => S.H/2 - y*s, A = m.A;
        drawMatrix(A, S.W*0.17, S.H*0.3, {a:vA, cw:56, rh:38});
        ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.beginPath(); for (let i = -6; i <= 6; i++){ ctx.moveTo(X(i), Y(-5)); ctx.lineTo(X(i), Y(5)); ctx.moveTo(X(-6), Y(i)); ctx.lineTo(X(6), Y(i)); } ctx.stroke(); ctx.restore();
        G.line(X(-6), Y(0), X(6), Y(0), 'rgba(213,220,228,.35)', 1); G.line(X(0), Y(-5), X(0), Y(5), 'rgba(213,220,228,.35)', 1);
        m.vals.forEach((v, i) => G.text(`λ${'₁₂'[i]} = ${v.im ? `${MX.fmt(v.re, 4)} ± ${MX.fmt(Math.abs(v.im), 4)}i` : fr(v.re)}`, S.W*0.17, S.H*0.55 + i*28, {align:'center', mono:true, size:15, a:vv, color: i ? TEAL : SAND}));
        m.vals.filter(v => !v.im).forEach((v, i) => v.vecs.forEach(x => {
          const L = Math.hypot(...x), u = [x[0]/L, x[1]/L], col = i ? TEAL : SAND, Au = [A[0][0]*u[0] + A[0][1]*u[1], A[1][0]*u[0] + A[1][1]*u[1]], k = Math.min(1, 1.9/Math.max(1e-9, Math.hypot(...Au)));
          G.line(X(-6*u[0]), Y(-6*u[1]), X(6*u[0]), Y(6*u[1]), col, 1.2, {dash:[5, 5], a:vx*0.7});
          G.arrow(X(0), Y(0), X(2*u[0]), Y(2*u[1]), 'rgba(213,220,228,.8)', 2.2, {a:vx});
          G.arrow(X(0), Y(0), X(2*Au[0]*k), Y(2*Au[1]*k), col, 3, {a:vx});
          G.text(`Av = ${fr(v.re)}v`, X(2*Au[0]*k) + 8, Y(2*Au[1]*k) - 8, {color:col, a:vx, halo:true});
        }));
        if (m.vals.some(v => v.im) && vx > 0) G.text('no real eigen-directions: A rotates every vector', S.W*0.62, S.H - 24, {align:'center', color:TEXT, a:vx});
      } }
  ];
  function solText(m){ const p = m.param, names = p.free.map(f => m.xs[f]); return p.rows.map(r => `${m.xs[r.pc]} = ${fr(r.c)}${r.coef.map((c, k) => Math.abs(c) < 1e-12 ? '' : ` ${c < 0 ? '−' : '+'} ${Math.abs(c - 1*Math.sign(c)) < 1e-12 ? '' : fr(Math.abs(c))}${names[k]}`).join('')}`).join(', ') + `, ${names.join(', ')} free`; }
  const FIELDS = {
    A:{label:'Matrix A (rows split by ;)', type:'expr'}, bv:{label:'Right-hand side b', type:'expr'}
  };
  return {MODES, FIELDS};
};
