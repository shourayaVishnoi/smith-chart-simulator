// Control systems: a live G(s) playground (step, root locus, Bode, Nyquist) plus step-by-step questions.
window.CTL = (() => {
  'use strict';
  const MX = window.MX, P = MX.P, C = MX.C, TAU = 2*Math.PI, D = 180/Math.PI;
  // ---------- transfer functions ----------
  function tf(src){
    if (!src || !src.trim()) throw new Error('Type a transfer function, for example 10/(s(s+2)(s+5)).');
    const s = src.replace(/^\s*G\s*\(\s*s\s*\)\s*=\s*/i, '');
    let r; try { r = MX.rational(s); } catch (e){ throw new Error(e.message); }
    if (P.degree(r.n) > P.degree(r.d)) throw new Error('G(s) has more zeros than poles. Use a proper transfer function (numerator degree ≤ denominator degree).');
    if (P.degree(r.d) === 0) throw new Error('G(s) needs at least one pole (an s in the denominator).');
    if (P.degree(r.d) > 12) throw new Error('Keep the order at 12 or below.');
    if (r.n.every(c => c === 0)) throw new Error('G(s) is zero.');
    return {n:r.n, d:r.d, src:s};
  }
  const closed = (n, d, K) => ({n:P.scale(n, K), d:P.add(d, P.scale(n, K))});
  // ---------- small dense matrices ----------
  const zeros = (r, c) => Array.from({length:r}, () => new Array(c).fill(0));
  const eye = n => { const I = zeros(n, n); for (let i = 0; i < n; i++) I[i][i] = 1; return I; };
  const mmul = (A, B) => A.map(row => B[0].map((_, j) => row.reduce((s, a, k) => s + a*B[k][j], 0)));
  const madd = (A, B, k = 1) => A.map((row, i) => row.map((a, j) => a + k*B[i][j]));
  const mscale = (A, k) => A.map(row => row.map(a => a*k));
  function solve(A, B){
    const n = A.length, M = A.map((row, i) => row.concat(B[i])), m = B[0].length;
    for (let c = 0; c < n; c++){
      let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      [M[c], M[p]] = [M[p], M[c]];
      for (let r = 0; r < n; r++) if (r !== c){ const f = M[r][c]/M[c][c]; if (f) for (let k = c; k < n + m; k++) M[r][k] -= f*M[c][k]; }
    }
    return M.map((row, i) => row.slice(n).map(v => v/M[i][i]));
  }
  // matrix exponential: scaling and squaring with a [6/6] Padé approximant
  function expm(A){
    const n = A.length, nrm = Math.max(...A.map(r => r.reduce((s, a) => s + Math.abs(a), 0)));
    const sq = Math.max(0, Math.ceil(Math.log2(nrm || 1)) + 1), As = mscale(A, Math.pow(2, -sq));
    const c = [1, 1/2, 5/44, 1/66, 1/792, 1/15840, 1/665280];
    let X = eye(n), N = eye(n), Dm = eye(n);
    for (let k = 1; k <= 6; k++){ X = mmul(As, X); N = madd(N, X, c[k]); Dm = madd(Dm, X, (k % 2 ? -1 : 1)*c[k]); }
    let E = solve(Dm, N); for (let k = 0; k < sq; k++) E = mmul(E, E);
    return E;
  }
  // step response of num/den (ascending coefficients) on [0, T], exact for a step input (zero-order hold)
  function step(num, den, T, N = 1500){
    const dn = P.trim(den), n = dn.length - 1, lead = dn[n], a = dn.map(x => x/lead), b = num.map(x => x/lead);
    const t = MX.linspace(0, T, N + 1);
    if (n === 0) return {t, y:t.map(() => (b[0] || 0)/a[0])};
    const bn = b[n] || 0, c = []; for (let i = 0; i < n; i++) c.push((b[i] || 0) - bn*a[i]);
    const Mx = zeros(n + 1, n + 1); for (let i = 0; i < n - 1; i++) Mx[i][i + 1] = 1; for (let j = 0; j < n; j++) Mx[n - 1][j] = -a[j]; Mx[n - 1][n] = 1;
    const E = expm(mscale(Mx, T/N)), Phi = E.slice(0, n).map(r => r.slice(0, n)), Gam = E.slice(0, n).map(r => r[n]);
    let x = new Array(n).fill(0); const y = [];
    for (let k = 0; k <= N; k++){ y.push(x.reduce((s, xi, i) => s + c[i]*xi, 0) + bn); x = Phi.map((row, i) => row.reduce((s, p, j) => s + p*x[j], 0) + Gam[i]); }
    return {t, y};
  }
  // a time window that shows the interesting part of the response
  function window_(poles){
    const re = poles.map(p => p[0]);
    if (re.some(r => r > 1e-9)){ const s = Math.max(...re); return Math.min(1e4, Math.max(1e-6, 4/s)); }
    const st = poles.filter(p => p[0] < -1e-9);
    if (!st.length){ const w = Math.max(0, ...poles.map(p => Math.abs(p[1]))); return w > 0 ? 6*TAU/w : 10; }
    const dom = st.reduce((a, p) => -p[0] < -a[0] ? p : a, st[0]), sig = -dom[0];
    let T = 8/sig; const w = Math.abs(dom[1]); if (w > 0) T = Math.min(T, 25*TAU/w);
    const osc = poles.filter(p => Math.abs(p[0]) <= 1e-9 && Math.abs(p[1]) > 0); if (osc.length) T = Math.max(T, 6*TAU/Math.abs(osc[0][1]));
    return Math.min(1e5, Math.max(1e-7, T));
  }
  function stepInfo(t, y, yf){
    const out = {final:yf};
    if (!isFinite(yf) || Math.abs(yf) < 1e-12) return out;
    const sgn = Math.sign(yf), yy = y.map(v => v*sgn), f = Math.abs(yf);
    const cross = lev => { for (let k = 1; k < yy.length; k++) if (yy[k] >= lev && yy[k - 1] < lev) return t[k - 1] + (lev - yy[k - 1])/(yy[k] - yy[k - 1])*(t[k] - t[k - 1]); return NaN; };
    out.tr = cross(.9*f) - cross(.1*f);
    let kmax = 0; yy.forEach((v, k) => { if (v > yy[kmax]) kmax = k; });
    out.peak = yy[kmax]*sgn; out.tp = t[kmax]; out.Mp = Math.max(0, (yy[kmax] - f)/f);
    let ts = 0; for (let k = yy.length - 1; k >= 0; k--) if (Math.abs(yy[k] - f) > .02*f){ ts = k + 1 < t.length ? t[k + 1] : NaN; break; }
    out.ts = ts; return out;
  }
  // ---------- frequency response ----------
  const Ljw = (n, d, K, w) => C.scale(C.div(P.evalC(n, [0, w]), P.evalC(d, [0, w])), K);
  // continuous (unwrapped) phase in degrees from the pole and zero angles
  function phaseFn(n, d, K){
    const zs = P.roots(n), ps = P.roots(d), lead = K*n[n.length - 1];
    const base = lead < 0 ? -180 : 0;
    return w => { let ph = base; zs.forEach(z => { ph += Math.atan2(w - z[1], -z[0])*D; }); ps.forEach(p => { ph -= Math.atan2(w - p[1], -p[0])*D; }); return ph; };
  }
  function wrange(n, d){
    const mags = P.roots(n).concat(P.roots(d)).map(r => Math.hypot(r[0], r[1])).filter(m => m > 1e-9);
    const lo = mags.length ? Math.min(...mags) : 1, hi = mags.length ? Math.max(...mags) : 1;
    return [Math.pow(10, Math.floor(Math.log10(lo)) - 2), Math.pow(10, Math.ceil(Math.log10(hi)) + 2)];
  }
  function margins(n, d, K){
    const [w0, w1] = wrange(n, d), ws = MX.logspace(Math.log10(w0) - 1, Math.log10(w1) + 1, 3000), ph = phaseFn(n, d, K);
    const mag = w => Math.log(C.abs(Ljw(n, d, K, w)));
    const lw = w => Math.log10(w), bis = (f, a, b) => { const r = MX.bisect(x => f(Math.pow(10, x)), lw(a), lw(b), 1e-14); return Math.pow(10, r); };
    const gc = [], pc = [];
    for (let i = 1; i < ws.length; i++){
      const a = ws[i - 1], b = ws[i], ma = mag(a), mb = mag(b);
      if (isFinite(ma) && isFinite(mb) && (ma < 0) !== (mb < 0)) gc.push(bis(mag, a, b));
      // phase crossings of −180 + 360k
      const pa = ph(a), pb = ph(b), ka = Math.floor((pa + 180)/360), kb = Math.floor((pb + 180)/360);
      if (ka !== kb){ const target = -180 + 360*Math.max(ka, kb); pc.push(bis(w => ph(w) - target, a, b)); }
    }
    const wrap = x => { let v = ((x + 180) % 360 + 360) % 360 - 180; return v === -180 ? 180 : v; };
    const pms = gc.map(w => ({w, pm:wrap(180 + ph(w))})), gms = pc.map(w => ({w, gm:1/C.abs(Ljw(n, d, K, w))}));
    const pm = pms.length ? pms.reduce((a, b) => Math.abs(b.pm) < Math.abs(a.pm) ? b : a) : null;
    const gm = gms.length ? gms.reduce((a, b) => Math.abs(Math.log(b.gm)) < Math.abs(Math.log(a.gm)) ? b : a) : null;
    return {pm, gm, pms, gms, ph, range:[w0, w1]};
  }
  // ---------- root locus ----------
  function locus(n, d, Kmax){
    const Ks = [0].concat(MX.logspace(Math.log10(Kmax) - 7, Math.log10(Kmax), 700)), order = P.degree(d);
    let prev = P.roots(d); const br = prev.map(r => [r]);
    for (let i = 1; i < Ks.length; i++){
      const rs = P.roots(P.add(d, P.scale(n, Ks[i]))); if (rs.length !== order) continue;
      const used = new Array(rs.length).fill(false), next = [];
      prev.forEach((p, j) => { let best = -1, bd = Infinity; rs.forEach((r, k) => { if (!used[k]){ const dd = Math.hypot(r[0] - p[0], r[1] - p[1]); if (dd < bd){ bd = dd; best = k; } } }); used[best] = true; next[j] = rs[best]; br[j].push(rs[best]); });
      prev = next;
    }
    return br;
  }
  function kscale(n, d){
    // a gain where the locus has clearly left the open-loop poles
    const rs = P.roots(d).concat(P.roots(n)).map(r => Math.hypot(r[0], r[1])), R = Math.max(1, ...rs), ex = Math.max(1, P.degree(d) - P.degree(n));
    return Math.pow(R, ex)*1e3/Math.abs(n[n.length - 1]);
  }
  // ---------- Routh array (numeric, with the ε and zero-row cases) ----------
  function routh(desc){
    const n = desc.length - 1, rows = [], notes = [];
    const w = Math.ceil((n + 1)/2);
    rows.push(Array.from({length:w}, (_, j) => desc[2*j] ?? 0)); rows.push(Array.from({length:w}, (_, j) => desc[2*j + 1] ?? 0));
    const scale = Math.max(...desc.map(Math.abs)), eps = 1e-7*scale;
    let epsUsed = false, aux = null;
    for (let i = 2; i <= n; i++){
      const a = rows[i - 2], b = rows[i - 1];
      if (b.every(v => Math.abs(v) < 1e-10*scale)){
        // a row of zeros: replace it with the derivative of the auxiliary polynomial from the row above
        const pw = n - (i - 2), coeffs = a.map((v, j) => [v, pw - 2*j]).filter(([, p]) => p >= 0);
        aux = {power:pw, coeffs};
        rows[i - 1] = coeffs.map(([v, p]) => v*p).concat(new Array(w).fill(0)).slice(0, w);
        notes.push({row:i - 1, kind:'zero', aux});
        i--; continue;
      }
      if (Math.abs(b[0]) < 1e-10*scale){ b[0] = eps; epsUsed = true; notes.push({row:i - 1, kind:'eps'}); }
      const row = []; for (let j = 0; j < w; j++) row.push((b[0]*(a[j + 1] ?? 0) - a[0]*(b[j + 1] ?? 0))/b[0]);
      rows.push(row.map(v => Math.abs(v) < 1e-12*scale ? 0 : v));
    }
    if (rows.length > n + 1) rows.length = n + 1;
    const first = rows.map(r => r[0]); let changes = 0;
    for (let i = 1; i < first.length; i++) if (Math.sign(first[i]) !== Math.sign(first[i - 1]) && first[i] !== 0 && first[i - 1] !== 0) changes++;
    return {rows, first, changes, notes, epsUsed, aux, eps};
  }
  return {tf, closed, step, window:window_, stepInfo, Ljw, phaseFn, wrange, margins, locus, kscale, routh, expm};
})();

(() => {
  'use strict';
  const MX = window.MX, PL = window.PLOT, CT = window.CTL, P = MX.P, C = MX.C, $ = id => document.getElementById(id);
  const reduceMotion = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  let needs = true, data = null;
  const canvas = $('ctCanvas'), ctx = PL.fit(canvas, () => { needs = true; });
  const S = {src:'1/(s(s+1)(s+5))', K:10, view:'all'};
  const inp = $('ctG'), kr = $('ctK'), ko = $('ctKo'), err = $('ctErr');
  const toK = x => Math.pow(10, -3 + 6*x/1000), fromK = k => (Math.log10(k) + 3)/6*1000;
  function setK(k){ S.K = k; kr.value = fromK(k); ko.value = `K = ${MX.fmt(k, 4)}`; data = null; needs = true; }
  kr.min = 0; kr.max = 1000; kr.step = 1; setK(S.K); inp.value = S.src;
  kr.addEventListener('input', () => setK(toK(+kr.value)));
  inp.addEventListener('input', () => { S.src = inp.value; data = null; needs = true; });
  $('ctView').querySelectorAll('button').forEach(b => b.addEventListener('click', () => { S.view = b.dataset.v; syncView(); }));
  function syncView(){ $('ctView').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === S.view))); needs = true; }
  document.querySelectorAll('[data-g]').forEach(b => b.addEventListener('click', () => { inp.value = S.src = b.dataset.g; setK(+b.dataset.k); }));
  if (canvas.getBoundingClientRect().width < 700) S.view = 'step';
  syncView();

  function compute(){
    const G = CT.tf(S.src), cl = CT.closed(G.n, G.d, S.K), poles = P.roots(cl.d), T = CT.window(poles), r = CT.step(cl.n, cl.d, T);
    const stable = poles.every(p => p[0] < -1e-9), yf = stable ? P.evalR(cl.n, 0)/P.evalR(cl.d, 0) : NaN;
    const info = stable ? CT.stepInfo(r.t, r.y, yf) : {}, mg = CT.margins(G.n, G.d, S.K);
    const Km = CT.kscale(G.n, G.d), br = CT.locus(G.n, G.d, Km);
    return {G, cl, poles, T, r, stable, info, mg, br, zs:P.roots(G.n), ps:P.roots(G.d)};
  }
  function readout(d){
    const L = [];
    L.push(`closed-loop poles: ${d.poles.slice(0, 6).map(p => MX.fmtC(p, 3)).join(', ')}${d.poles.length > 6 ? ', …' : ''}`);
    L.push(d.stable ? '<b>stable</b>' : '<b>unstable</b> (a pole has Re ≥ 0)');
    if (d.stable && d.info.final !== undefined){ L.push(`final value ${MX.fmt(d.info.final, 4)}`); if (isFinite(d.info.Mp)) L.push(`overshoot ${MX.fmt(100*d.info.Mp, 3)}%, settles in ${MX.si(d.info.ts, 's', 3)}`); }
    L.push(`PM ${d.mg.pm ? MX.fmt(d.mg.pm.pm, 4) + '°' : '∞'}, GM ${d.mg.gm ? MX.fmt(20*Math.log10(d.mg.gm.gm), 4) + ' dB' : '∞'}`);
    $('ctRead').innerHTML = L.join('<br>');
  }
  function drawStep(d, b){
    const ys = d.r.y.filter(isFinite), lim = d.stable ? PL.range(ys.concat([0]), .1) : PL.range(ys.map(v => Math.max(-1e6, Math.min(1e6, v))).concat([0]), .1);
    const [ts, tu] = d.T >= 1 ? [1, 's'] : d.T >= 1e-3 ? [1e3, 'ms'] : [1e6, 'µs'];
    const M = PL.frame(ctx, b, {xr:[0, d.T*ts], yr:lim, mode:'box', zeroLine:true, xlabel:`t (${tu})`, title:'Closed-loop step response'});
    if (d.stable) PL.hline(ctx, M, d.info.final, {color:'rgba(255,255,255,.35)'});
    PL.line(ctx, M, d.r.t.map((t, i) => [t*ts, d.r.y[i]]), {color:'#ff4fa3', width:2.6, glow:8});
    if (d.stable && d.info.Mp > 1e-4) PL.dot(ctx, M, d.info.tp*ts, d.info.peak, {color:'#ffb84d', r:5, label:`+${MX.fmt(100*d.info.Mp, 3)}%`});
  }
  function splaneBox(d, b){
    const pts = d.ps.concat(d.zs, d.poles), R0 = Math.max(1, ...pts.map(p => Math.hypot(p[0], p[1]))); d.br.forEach(br => br.forEach(r => { if (Math.hypot(r[0], r[1]) < 2*R0) pts.push(r); }));
    let xr = PL.range(pts.map(p => p[0]).concat([0]), .12), yr = PL.range(pts.map(p => p[1]).concat([0]), .12);
    const cx = (xr[0] + xr[1])/2, cy = (yr[0] + yr[1])/2, ppx = Math.max((xr[1] - xr[0])/b.w, (yr[1] - yr[0])/b.h);
    xr = [cx - ppx*b.w/2, cx + ppx*b.w/2]; yr = [cy - ppx*b.h/2, cy + ppx*b.h/2];
    return {xr, yr};
  }
  function drawLocus(d, b){
    const v = splaneBox(d, b), M = PL.frame(ctx, b, {xr:v.xr, yr:v.yr, mode:'box', zeroLine:true, zeroLineX:true, xlabel:'σ', ylabel:'jω', title:'Root locus'});
    ctx.save(); ctx.globalAlpha = .07; ctx.fillStyle = '#ff4f6a'; const x0 = M.X(0); ctx.fillRect(Math.max(x0, b.x), b.y, b.x + b.w - Math.max(x0, b.x), b.h); ctx.restore();
    d.br.forEach(br => PL.line(ctx, M, br, {color:'#41d9e8', width:2, alpha:.85}));
    d.ps.forEach(p => PL.cross(ctx, M, p[0], p[1], {color:'#fff', r:5}));
    d.zs.forEach(z => PL.dot(ctx, M, z[0], z[1], {color:'#fff', r:5, hollow:true}));
    d.poles.forEach(p => PL.dot(ctx, M, p[0], p[1], {color:'#ff4fa3', r:5.5}));
  }
  function drawBode(d, b){
    const G = d.G, [w0, w1] = CT.wrange(G.n, G.d), ws = MX.logspace(Math.log10(w0), Math.log10(w1), 600), ph = d.mg.ph;
    const mag = ws.map(w => 20*Math.log10(C.abs(CT.Ljw(G.n, G.d, S.K, w)))), phs = ws.map(ph);
    const h = (b.h - 34)/2, b1 = {x:b.x, y:b.y, w:b.w, h}, b2 = {x:b.x, y:b.y + h + 34, w:b.w, h};
    const fm = mag.filter(isFinite), M1 = PL.frame(ctx, b1, {xr:[w0, w1], yr:[Math.max(-150, Math.floor(Math.min(...fm)/20)*20), Math.min(150, Math.ceil(Math.max(...fm, 5)/20)*20)], xlog:true, mode:'box', ylabel:'dB', title:'Bode (open loop K·G)'});
    PL.hline(ctx, M1, 0, {color:'rgba(255,255,255,.35)'});
    PL.line(ctx, M1, ws.map((w, i) => [w, mag[i]]), {color:'#ff4fa3', width:2.4, glow:6});
    const pr = PL.range(phs.concat([-180]), .08), M2 = PL.frame(ctx, b2, {xr:[w0, w1], yr:pr, xlog:true, mode:'box', ylabel:'deg', xlabel:'ω (rad/s)'});
    PL.hline(ctx, M2, -180, {color:'rgba(255,255,255,.35)'});
    PL.line(ctx, M2, ws.map((w, i) => [w, phs[i]]), {color:'#41d9e8', width:2.4, glow:6});
    if (d.mg.pm){ PL.vline(ctx, M1, d.mg.pm.w, {color:'rgba(255,184,77,.7)'}); PL.vline(ctx, M2, d.mg.pm.w, {color:'rgba(255,184,77,.7)'}); PL.label(ctx, M2.X(d.mg.pm.w) + 4, M2.Y(ph(d.mg.pm.w)) - 6, `PM ${MX.fmt(d.mg.pm.pm, 3)}°`, {color:'#ffb84d', size:11}); }
    if (d.mg.gm){ PL.vline(ctx, M1, d.mg.gm.w, {color:'rgba(79,227,166,.7)'}); PL.label(ctx, M1.X(d.mg.gm.w) + 4, M1.Y(-20*Math.log10(d.mg.gm.gm)) + 14, `GM ${MX.fmt(20*Math.log10(d.mg.gm.gm), 3)} dB`, {color:'#4fe3a6', size:11}); }
  }
  function drawNyquist(d, b){
    const G = d.G, [w0, w1] = CT.wrange(G.n, G.d), ws = MX.logspace(Math.log10(w0) - 1, Math.log10(w1) + 1, 1500), L = ws.map(w => CT.Ljw(G.n, G.d, S.K, w));
    const mags = L.map(z => C.abs(z)).filter(isFinite).sort((a, b) => a - b), R = Math.max(1.6, Math.min(40, 1.3*mags[Math.floor(mags.length*.55)]));
    const ppx = Math.max(2*R/b.w, 2*R/b.h), cx = -R*.35, xr = [cx - ppx*b.w/2, cx + ppx*b.w/2], yr = [-ppx*b.h/2, ppx*b.h/2];
    const M = PL.frame(ctx, b, {xr, yr, mode:'box', zeroLine:true, zeroLineX:true, xlabel:'Re', ylabel:'Im', title:'Nyquist (K·G(jω))'});
    PL.line(ctx, M, L.map(z => [z[0], -z[1]]), {color:'rgba(65,217,232,.55)', width:1.8, dash:[5, 4]});
    PL.line(ctx, M, L.map(z => [z[0], z[1]]), {color:'#41d9e8', width:2.4, glow:6});
    PL.cross(ctx, M, -1, 0, {color:'#ff4f6a', r:6}); PL.label(ctx, M.X(-1), M.Y(0) + 18, '−1', {color:'#ff8fb8', align:'center', size:11});
  }
  function draw(){
    const W = canvas._w, H = canvas._h; ctx.clearRect(0, 0, W, H);
    try { if (!data){ data = compute(); readout(data); } err.textContent = ''; }
    catch (e){ err.textContent = e.message; data = null; PL.label(ctx, W/2, H/2, 'Fix the transfer function to see the plots', {align:'center', color:'#e9e4ff', size:14}); return; }
    const pad = {l:52, r:18, t:28, b:34};
    if (S.view === 'all'){
      const cw = (W - 2*pad.l - 2*pad.r)/2, ch = (H - 2*pad.t - 2*pad.b)/2;
      const box = (i, j) => ({x:pad.l + i*(cw + pad.l + pad.r), y:pad.t + j*(ch + pad.t + pad.b), w:cw, h:ch});
      drawStep(data, box(0, 0)); drawLocus(data, box(1, 0)); drawBode(data, box(0, 1)); drawNyquist(data, box(1, 1));
    } else {
      const b = {x:pad.l + 6, y:pad.t, w:W - pad.l - pad.r - 12, h:H - pad.t - pad.b - 6};
      ({step:drawStep, locus:drawLocus, bode:drawBode, nyquist:drawNyquist})[S.view](data, b);
    }
  }
  function loop(){ if (needs){ needs = false; draw(); } requestAnimationFrame(loop); }
  $('hPlay') && $('hPlay').addEventListener('click', () => $('play').scrollIntoView({behavior: reduceMotion ? 'auto' : 'smooth'}));
  window.__ct = {S, get data(){ return data || compute(); }, setK, setSrc(s){ inp.value = S.src = s; data = null; needs = true; }, view(v){ S.view = v; syncView(); }};
  requestAnimationFrame(loop);
})();

// ---------------- step-by-step questions ----------------
window.FORMULA_PAGE = (G) => {
  'use strict';
  const MX = window.MX, PL = window.PLOT, CT = window.CTL, P = MX.P, C = MX.C, TAU = 2*Math.PI, D = 180/Math.PI, n4 = (v, s = 4) => MX.fmt(v, s);
  const cardsHTML = cards => `<div class="answer">${cards.filter(Boolean).map(c => `<div class="ans ${c.tone || 'y'}"><div class="k">${c.k}</div><div class="v">${c.v}</div><div class="s">${c.s || ''}</div></div>`).join('')}</div>`;
  const MODE_OF = m => MODES.find(x => x.id === m.id);
  const answerStep = () => ({ dur:1600, show:[], info: m => ({ title:'Answer', body: cardsHTML(MODE_OF(m).answer(m)) + (MODE_OF(m).note && MODE_OF(m).note(m) ? `<p>${MODE_OF(m).note(m)}</p>` : ''), work:'' }) });
  const pos = (v, what) => { if (!(v > 0) || !isFinite(v)) throw new Error(`${what} must be a positive number.`); };
  const upto = (pts, k) => pts.slice(0, Math.max(2, Math.round(pts.length*Math.min(1, k))));
  const tun = T => T >= 1 ? [1, 's'] : T >= 1e-3 ? [1e3, 'ms'] : [1e6, 'µs'];
  const polyS = p => P.toString(p.map(v => Math.abs(v) < 1e-12 ? 0 : v), 's');
  const cfmt = z => MX.fmtC(z, 4);
  const GLYPH = {
    so:'<path d="M3 26 C8 4, 11 4, 14 15 S 20 19, 24 15 S 28 14, 29 15"/><path d="M3 15 H29" stroke-dasharray="2 3" opacity=".6"/>',
    routh:'<rect x="4" y="5" width="24" height="22" rx="2"/><path d="M4 12 H28 M4 19 H28 M13 5 V27"/>',
    sse:'<path d="M3 27 L29 5" opacity=".55" stroke-dasharray="3 3"/><path d="M3 27 C10 24, 14 18, 29 9"/><path d="M26 7 V11" />',
    margin:'<path d="M3 8 H13 C18 8, 21 14, 29 24"/><path d="M3 18 H29" stroke-dasharray="2 3" opacity=".6"/><path d="M19 4 V28" opacity=".5"/>',
    locus:'<path d="M5 16 H29" opacity=".4"/><path d="M8 16 L13 16 C13 9, 17 5, 22 3 M13 16 C13 23, 17 27, 22 29"/><path d="M6 14 l4 4 m0 -4 l-4 4"/><path d="M11 14 l4 4 m0 -4 l-4 4"/>'
  };
  const glyph = k => `<svg viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${GLYPH[k]}</svg>`;

  // ----- polynomials in K for the Routh question -----
  const R = {
    trim: p => { const q = p.map(v => Math.abs(v) < 1e-10 ? 0 : v); while (q.length > 1 && q[q.length - 1] === 0) q.pop(); return q; },
    mk: (n, d = [1]) => ({n:R.trim(n), d:R.trim(d)}),
    add: (a, b) => R.norm(R.mk(P.add(P.mul(a.n, b.d), P.mul(b.n, a.d)), P.mul(a.d, b.d))),
    sub: (a, b) => R.add(a, {n:P.scale(b.n, -1), d:b.d}),
    mul: (a, b) => R.norm(R.mk(P.mul(a.n, b.n), P.mul(a.d, b.d))),
    div: (a, b) => R.norm(R.mk(P.mul(a.n, b.d), P.mul(a.d, b.n))),
    isZero: a => a.n.every(v => v === 0),
    // polynomial gcd (Euclid) to keep entries small
    gcd(a, b){ a = R.trim(a); b = R.trim(b); for (let i = 0; i < 20 && !(b.length === 1 && Math.abs(b[0]) < 1e-9); i++){ const r = R.pmod(a, b); a = b; b = R.trim(r); } return a; },
    pmod(a, b){ let r = a.slice(); const db = b.length - 1; while (r.length - 1 >= db && r.some(v => v !== 0)){ const k = r[r.length - 1]/b[db], sh = r.length - 1 - db; b.forEach((v, i) => { r[i + sh] -= k*v; }); r.pop(); r = r.map(v => Math.abs(v) < 1e-9*Math.max(1, ...a.map(Math.abs)) ? 0 : v); if (!r.length){ r = [0]; break; } } return r.length ? r : [0]; },
    pdiv(a, b){ const q = new Array(Math.max(1, a.length - b.length + 1)).fill(0); let r = a.slice(); const db = b.length - 1; while (r.length - 1 >= db && r.length){ const k = r[r.length - 1]/b[db], sh = r.length - 1 - db; q[sh] = k; b.forEach((v, i) => { r[i + sh] -= k*v; }); r.pop(); } return R.trim(q); },
    norm(a){
      if (R.isZero(a)) return {n:[0], d:[1]};
      const g = R.gcd(a.n, a.d); let n = a.n, d = a.d;
      if (g.length > 1){ n = R.pdiv(n, g); d = R.pdiv(d, g); }
      const k = d[d.length - 1]; return {n:R.trim(n.map(v => v/k)), d:R.trim(d.map(v => v/k))};
    },
    ev: (a, K) => P.evalR(a.n, K)/P.evalR(a.d, K),
    str(a){ const ps = p => P.toString(p, 'K'), num = ps(a.n); if (a.d.length === 1 && Math.abs(a.d[0] - 1) < 1e-12) return num; return `(${num})/(${ps(a.d)})`; }
  };
  // coefficients of a characteristic polynomial, each a polynomial in K (found by interpolation)
  function charPoly(src){
    if (!src || !src.trim()) throw new Error('Type the characteristic polynomial, for example s^3 + 3s^2 + 2s + K.');
    let expr = src.replace(/=\s*0\s*$/, '');
    if (!/s/.test(expr) && /[,;]/.test(expr)){ const it = expr.split(/[,;]/).map(x => x.trim()).filter(Boolean), nd = it.length - 1; expr = it.map((c, i) => `(${c})*s^${nd - i}`).join(' + '); }
    const hasK = /K/.test(expr), Ks = hasK ? [0, 1, 2, 3, 4, 5] : [0], cs = Ks.map(k => { const r = MX.rational(expr, {K:k}); if (P.degree(r.d) !== 0) throw new Error('Use a polynomial in s (no s in a denominator).'); return P.scale(r.n, r.d[0]); });
    // undo the monic scaling: MX.rational divides by the denominator’s leading coefficient, which is a constant here
    const deg = Math.max(...cs.map(c => P.degree(c)));
    const coeffK = []; for (let p = 0; p <= deg; p++){
      const ys = cs.map(c => c[p] || 0);
      // Newton forward differences on K = 0..5, then convert to a power series in K
      const dif = [ys.slice()]; for (let k = 1; k < ys.length; k++){ const prev = dif[k - 1]; dif.push(prev.slice(1).map((v, i) => v - prev[i])); }
      let poly = [0], basis = [1], fact = 1;
      for (let k = 0; k < ys.length; k++){ if (k > 0){ basis = P.mul(basis, [-(k - 1), 1]); fact *= k; } poly = P.add(poly, P.scale(basis, dif[k][0]/fact)); }
      poly = poly.map(v => Math.abs(v - Math.round(v)) < 1e-9 ? Math.round(v) : v);
      if (hasK){ const t = 7.5, rr = MX.rational(expr, {K:t}), direct = P.scale(rr.n, rr.d[0])[p] || 0; if (Math.abs(P.evalR(poly, t) - direct) > 1e-6*Math.max(1, Math.abs(direct))) throw new Error('K must appear as a polynomial (degree up to 5).'); }
      coeffK.push(R.trim(poly));
    }
    while (coeffK.length > 1 && coeffK[coeffK.length - 1].every(v => v === 0)) coeffK.pop();
    if (coeffK.length < 2) throw new Error('The polynomial needs at least one power of s.');
    return {hasK, coeffK, deg:coeffK.length - 1};
  }
  function routhK(coeffK){
    const desc = coeffK.slice().reverse().map(p => R.mk(p)), n = desc.length - 1, w = Math.ceil((n + 1)/2), z = R.mk([0]);
    const rows = [Array.from({length:w}, (_, j) => desc[2*j] || z), Array.from({length:w}, (_, j) => desc[2*j + 1] || z)];
    for (let i = 2; i <= n; i++){
      const a = rows[i - 2], b = rows[i - 1];
      if (R.isZero(b[0])) throw new Error('A first-column entry is zero for every K. Try a specific value of K instead.');
      const row = []; for (let j = 0; j < w; j++) row.push(R.div(R.sub(R.mul(b[0], a[j + 1] || z), R.mul(a[0], b[j + 1] || z)), b[0]));
      rows.push(row);
    }
    return rows;
  }
  // K intervals where every first-column entry is positive
  function stableK(first){
    const crit = new Set();
    first.forEach(e => [e.n, e.d].forEach(p => { if (P.degree(p) >= 1) P.roots(p).forEach(r => { if (Math.abs(r[1]) < 1e-9) crit.add(+r[0].toPrecision(12)); }); }));
    const cs = [...crit].sort((a, b) => a - b), pts = [-Infinity, ...cs, Infinity], ivs = [];
    for (let i = 0; i < pts.length - 1; i++){
      const a = pts[i], b = pts[i + 1], mid = !isFinite(a) && !isFinite(b) ? 0 : !isFinite(a) ? b - 1 - Math.abs(b) : !isFinite(b) ? a + 1 + Math.abs(a) : (a + b)/2;
      if (first.every(e => R.ev(e, mid) > 0)){ if (ivs.length && ivs[ivs.length - 1][1] === a) ivs[ivs.length - 1][1] = b; else ivs.push([a, b]); }
    }
    return {ivs, crit:cs};
  }
  // s-polynomial whose coefficients are polynomials in K, highest power first
  function kPolyStr(coeffK){
    const out = [];
    for (let p = coeffK.length - 1; p >= 0; p--){
      const c = R.trim(coeffK[p]); if (c.length === 1 && c[0] === 0) continue;
      const sp = p === 0 ? '' : p === 1 ? 's' : `s${String(p).split('').map(ch => '⁰¹²³⁴⁵⁶⁷⁸⁹'[ch]).join('')}`;
      let cs, neg = false;
      if (c.length === 1){ neg = c[0] < 0; cs = Math.abs(c[0]) === 1 && sp ? '' : MX.fmt(Math.abs(c[0]), 4); }
      else { const terms = c.filter(v => v !== 0).length; cs = terms > 1 ? `(${P.toString(c, 'K')})` : P.toString(c, 'K'); if (cs.startsWith('−')){ neg = true; cs = cs.slice(1); } }
      out.push({neg, t:cs + sp});
    }
    return out.map((q, i) => (i === 0 ? (q.neg ? '−' : '') : q.neg ? ' − ' : ' + ') + q.t).join('') || '0';
  }
  const ivStr = iv => !isFinite(iv[0]) && !isFinite(iv[1]) ? 'all K' : !isFinite(iv[0]) ? `K < ${n4(iv[1])}` : !isFinite(iv[1]) ? `K > ${n4(iv[0])}` : `${n4(iv[0])} < K < ${n4(iv[1])}`;

  // ----- shared plotting -----
  function sPlane(ctx, box, pts, extra = {}){
    let xr = PL.range(pts.map(p => p[0]).concat([0, extra.x || 0]), .2), yr = PL.range(pts.map(p => p[1]).concat([0]), .2);
    const cx = (xr[0] + xr[1])/2, cy = (yr[0] + yr[1])/2, ppx = Math.max((xr[1] - xr[0])/box.w, (yr[1] - yr[0])/box.h);
    return PL.frame(ctx, box, {xr:[cx - ppx*box.w/2, cx + ppx*box.w/2], yr:[cy - ppx*box.h/2, cy + ppx*box.h/2], mode:'box', zeroLine:true, zeroLineX:true, xlabel:'σ', ylabel:'jω', title:extra.title});
  }

  const MODES = [
    { id:'second', title:'Second-order specs', desc:'ζ and ωₙ to overshoot, peak, rise and settling times, or back', glyph:glyph('so'),
      fields:['given', 'zeta', 'wn', 'Mp', 'tp'], defaults:{given:'zw', zeta:'0.4', wn:'5', Mp:'16.3', tp:'0.5'},
      compute: v => {
        let z, wn;
        if (v.given === 'mp'){
          if (!(v.Mp > 0 && v.Mp < 100)) throw new Error('Overshoot must be between 0 and 100 %.'); pos(v.tp, 'The peak time');
          const L = Math.log(v.Mp/100); z = -L/Math.sqrt(Math.PI*Math.PI + L*L); wn = Math.PI/(v.tp*Math.sqrt(1 - z*z));
        } else { z = v.zeta; wn = v.wn; if (!(z > 0 && z < 1)) throw new Error('These formulas need an underdamped system: 0 < ζ < 1.'); pos(wn, 'ωₙ'); }
        const wd = wn*Math.sqrt(1 - z*z), th = Math.acos(z), Mp = Math.exp(-z*Math.PI/Math.sqrt(1 - z*z)), tp = Math.PI/wd, tr0 = (Math.PI - th)/wd, ts2 = 4/(z*wn), ts5 = 3/(z*wn);
        const num = [wn*wn], den = [wn*wn, 2*z*wn, 1], T = Math.max(1.4*ts2, 3*tp), r = CT.step(num, den, T, 3000), inf = CT.stepInfo(r.t, r.y, 1);
        return {id:'second', given:v.given, z, wn, wd, th, Mp, tp, tr0, ts2, ts5, r, T, inf, sig:z*wn};
      },
      problem: m => ({ chips: m.given === 'mp' ? [`M<sub>p</sub> = ${n4(100*m.Mp)}%`, `t<sub>p</sub> = ${MX.si(m.tp, 's')}`] : [`ζ = ${n4(m.z)}`, `ω<sub>n</sub> = ${n4(m.wn)} rad/s`] }),
      steps: () => [
        { dur:2400, show:['poles'], info: m => m.given === 'mp' ? ({ title:'ζ from the overshoot', body:'<p>Overshoot depends only on ζ, so invert M<sub>p</sub> = e<sup>−ζπ/√(1−ζ²)</sup>. Then the peak time gives ω<sub>n</sub>.</p>', work:`ζ = −ln M<sub>p</sub> / √(π² + ln² M<sub>p</sub>) = <b>${n4(m.z)}</b><br>ω<sub>n</sub> = π / (t<sub>p</sub>√(1 − ζ²)) = <b>${n4(m.wn)} rad/s</b>` }) : ({ title:'Poles of the standard form', body:'<p>G(s) = ω<sub>n</sub>²/(s² + 2ζω<sub>n</sub>s + ω<sub>n</sub>²). With 0 < ζ < 1 the poles are a complex pair.</p>', work:`s = −ζω<sub>n</sub> ± jω<sub>n</sub>√(1 − ζ²) = ${n4(-m.sig)} ± j${n4(m.wd)}<br>angle from the negative real axis θ = cos⁻¹ζ = ${n4(m.th*D)}°` }),
          rd: m => m.given === 'mp' ? [['Damping ratio ζ', n4(m.z)], ['Natural frequency ωₙ', `${n4(m.wn)} rad/s`]] : ['Poles', `${n4(-m.sig)} ± j${n4(m.wd)}`] },
        { dur:2400, show:['curve'], info: m => ({ title:'Damped frequency', body:'<p>The response rings at the damped frequency and decays with time constant 1/ζω<sub>n</sub>.</p>', work:`ω<sub>d</sub> = ω<sub>n</sub>√(1 − ζ²) = <b>${n4(m.wd)} rad/s</b><br>σ = ζω<sub>n</sub> = ${n4(m.sig)} s⁻¹` }), rd: m => ['Damped frequency ω<sub>d</sub>', `${n4(m.wd)} rad/s`] },
        { dur:2600, show:['peak'], info: m => ({ title:'Peak time and overshoot', body:'<p>The first peak arrives after half a damped period.</p>', work:`t<sub>p</sub> = π/ω<sub>d</sub> = <b>${MX.si(m.tp, 's')}</b><br>M<sub>p</sub> = e<sup>−ζπ/√(1−ζ²)</sup> = <b>${n4(100*m.Mp)}%</b>` }), rd: m => [['Peak time t<sub>p</sub>', MX.si(m.tp, 's')], ['Overshoot M<sub>p</sub>', `${n4(100*m.Mp)}%`]] },
        { dur:2600, show:['rise'], info: m => ({ title:'Rise time', body:'<p>Textbooks use two definitions. 0 → 100% has a closed form; 10 → 90% is read from the curve.</p>', work:`t<sub>r</sub> (0–100%) = (π − θ)/ω<sub>d</sub> = <b>${MX.si(m.tr0, 's')}</b><br>t<sub>r</sub> (10–90%) = ${MX.si(m.inf.tr, 's')}` }), rd: m => ['Rise time 0–100%', MX.si(m.tr0, 's')] },
        { dur:2600, show:['settle'], info: m => ({ title:'Settling time', body:'<p>The envelope e<sup>−ζω<sub>n</sub>t</sup> sets how long the ringing takes to die.</p>', work:`t<sub>s</sub> (2%) ≈ 4/ζω<sub>n</sub> = <b>${MX.si(m.ts2, 's')}</b><br>t<sub>s</sub> (5%) ≈ 3/ζω<sub>n</sub> = ${MX.si(m.ts5, 's')}<br>exact 2% from the curve: ${MX.si(m.inf.ts, 's')}` }), rd: m => ['Settling time (2%)', MX.si(m.ts2, 's')] },
        answerStep()],
      answer: m => [{tone:'y', k:'Overshoot and peak', v:`${n4(100*m.Mp)}% at ${MX.si(m.tp, 's', 3)}`, s:`ζ = ${n4(m.z)}, ω<sub>n</sub> = ${n4(m.wn)} rad/s`}, {tone:'s1', k:'Rise and settling', v:`t<sub>r</sub> ${MX.si(m.tr0, 's', 3)}, t<sub>s</sub> ${MX.si(m.ts2, 's', 3)}`, s:'rise 0–100%, settling 2% (4/ζωₙ)'}],
      scene: (m, S) => {
        const ctx = G.ctx(), sw = Math.min(260, S.W*.34), b1 = {x:58, y:32, w:S.W - sw - 112, h:S.H - 80}, b2 = {x:S.W - sw - 22, y:32, w:sw, h:Math.min(sw, S.H - 80)};
        const [ts, tu] = tun(m.T), M = PL.frame(ctx, b1, {xr:[0, m.T*ts], yr:[0, Math.max(1.2, 1 + m.Mp*1.25)], mode:'box', xlabel:`t (${tu})`, ylabel:'c(t)'});
        PL.hline(ctx, M, 1, {color:'rgba(255,255,255,.4)'});
        const vs = S.vis('settle'); if (vs > 0){ ctx.save(); ctx.globalAlpha = .13*vs; ctx.fillStyle = '#4fe3a6'; ctx.fillRect(b1.x, M.Y(1.02), b1.w, M.Y(.98) - M.Y(1.02)); ctx.restore(); PL.vline(ctx, M, m.ts2*ts, {color:'#4fe3a6', alpha:vs}); PL.label(ctx, M.X(m.ts2*ts) + 4, b1.y + 14, 'ts ≈ 4/ζωn', {color:'#4fe3a6', size:11, alpha:vs});
          [1, -1].forEach(sg => PL.line(ctx, M, m.r.t.map(t => [t*ts, 1 + sg*Math.exp(-m.sig*t)/Math.sqrt(1 - m.z*m.z)]), {color:'rgba(155,123,255,.7)', width:1.3, dash:[5, 4], alpha:vs})); }
        PL.line(ctx, M, upto(m.r.t.map((t, i) => [t*ts, m.r.y[i]]), S.vis('curve')), {color:'#ff4fa3', width:2.8, glow:8});
        const vp = S.vis('peak'); if (vp > 0){ PL.vline(ctx, M, m.tp*ts, {color:'rgba(255,184,77,.7)', alpha:vp}); PL.dot(ctx, M, m.tp*ts, 1 + m.Mp, {color:'#ffb84d', r:6, alpha:vp, label:`Mp ${n4(100*m.Mp, 3)}%`}); }
        const vr = S.vis('rise'); if (vr > 0){ PL.dot(ctx, M, m.tr0*ts, 1, {color:'#41d9e8', r:5.5, alpha:vr, label:'tr (0–100%)', dy:18}); }
        // s-plane
        const sp = sPlane(ctx, b2, [[-m.sig, m.wd], [-m.sig, -m.wd]], {title:'Poles'}), vpo = S.vis('poles');
        if (vpo > 0){ [[-m.sig, m.wd], [-m.sig, -m.wd]].forEach(p => PL.cross(ctx, sp, p[0], p[1], {color:'#ff4fa3', r:6, alpha:vpo})); ctx.save(); ctx.globalAlpha = vpo*.8; ctx.strokeStyle = '#ffb84d'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(sp.X(0), sp.Y(0)); ctx.lineTo(sp.X(-m.sig), sp.Y(m.wd)); ctx.stroke(); ctx.restore(); PL.label(ctx, sp.X(-m.sig) + 8, sp.Y(m.wd), `ωn = ${n4(m.wn, 3)}`, {color:'#ffb84d', size:11, alpha:vpo}); }
      } },

    { id:'routh', title:'Routh–Hurwitz stability', desc:'Routh array, sign changes, special cases and the K range for stability', glyph:glyph('routh'),
      fields:['poly'], defaults:{poly:'s^4 + 2s^3 + 3s^2 + 4s + 5'},
      compute: v => {
        const cp = charPoly(v.poly), n = cp.deg;
        if (n > 10) throw new Error('Keep the degree at 10 or below.');
        if (!cp.hasK){
          const desc = cp.coeffK.slice().reverse().map(p => p[0]);
          if (desc[0] === 0) throw new Error('The leading coefficient is zero.');
          const sg = desc[0] < 0 ? -1 : 1, d2 = desc.map(x => x*sg), rt = CT.routh(d2), roots = P.roots(d2.slice().reverse());
          const rhp = roots.filter(r => r[0] > 1e-7).length, jw = roots.filter(r => Math.abs(r[0]) <= 1e-7).length;
          return {id:'routh', hasK:false, n, desc:d2, flipped: sg < 0, rt, roots, rhp, jw, stable: rhp === 0 && jw === 0};
        }
        const rows = routhK(cp.coeffK), first = rows.map(r => r[0]), st = stableK(first);
        // at each finite end of a stable interval the system oscillates: find ω from the row above the s¹ row
        const ends = []; st.ivs.forEach(iv => iv.forEach(K => { if (isFinite(K)){ const coeffs = cp.coeffK.map(p => P.evalR(p, K)), rs = P.roots(coeffs).filter(r => Math.abs(r[0]) < 1e-6 && r[1] > 1e-9); if (rs.length) ends.push({K, w:rs[0][1]}); } }));
        return {id:'routh', hasK:true, n, coeffK:cp.coeffK, rows, first, ivs:st.ivs, crit:st.crit, ends};
      },
      problem: m => ({ chips:[m.hasK ? `${kPolyStr(m.coeffK)} = 0` : `${polyS(m.desc.slice().reverse())} = 0`] }),
      steps: () => [
        { dur:2400, show:['t0'], info: m => ({ title:'First two rows', body:'<p>Write the coefficients from the highest power, alternating between the first two rows.</p>' + (m.hasK ? '' : (m.desc.some(c => c <= 0) ? '<p>Some coefficients are zero or negative, which already means the system is not stable; the table says how many roots are in the right half.</p>' : '')), work:'' }) },
        { dur:3200, show:['t1'], info: m => ({ title:'Fill in the rest', body:'<p>Each new entry is −(1/b₁)·det[[a₁, a<sub>j+1</sub>], [b₁, b<sub>j+1</sub>]] from the two rows above.' + (!m.hasK && m.rt.notes.length ? ' ' + m.rt.notes.map(nt => nt.kind === 'eps' ? 'A zero appeared in the first column, so it is replaced by a small positive ε.' : `A whole row became zero, so it is replaced by the derivative of the auxiliary polynomial from the row above (power ${nt.aux.power}). That signals roots placed symmetrically about the origin.`).join(' ') : '') + '</p>', work:'' }) },
        { dur:2800, show:['col'], info: m => m.hasK ? ({ title:'Conditions on K', body:'<p>For stability every entry in the first column must be positive.</p>', work: m.first.map((e, i) => `s<sup>${m.n - i}</sup>: ${R.str(e)} > 0`).join('<br>') }) : ({ title:'Count sign changes', body:'<p>Each sign change in the first column is one root in the right half-plane.</p>', work:`first column: ${m.rt.first.map((v, i) => m.rt.notes.some(nt => nt.kind === 'eps' && nt.row === i) ? 'ε' : n4(v)).join(', ')}<br>sign changes: <b>${m.rt.changes}</b>` }),
          rd: m => m.hasK ? ['Stable for', m.ivs.length ? m.ivs.map(ivStr).join(' or ') : 'no value of K'] : ['Sign changes (RHP roots)', String(m.rt.changes)] },
        { dur:2600, show:['roots'], info: m => m.hasK ? ({ title:'The stable range', body:'<p>All first-column entries are positive only between these values. At a finite boundary the system sits on the edge and oscillates.</p>', work:`<b>${m.ivs.length ? m.ivs.map(ivStr).join(' or ') : 'never stable'}</b>` + m.ends.map(e => `<br>at K = ${n4(e.K)}: oscillates at ω = ${n4(e.w)} rad/s`).join('') }) : ({ title:'Check with the roots', body:'<p>Solving the polynomial directly agrees with the table.</p>', work: m.roots.map(r => cfmt(r)).join('<br>') }),
          rd: m => m.hasK ? (m.ends.length ? ['Oscillation at the boundary', m.ends.map(e => `K = ${n4(e.K)}, ω = ${n4(e.w)} rad/s`).join('; ')] : ['Boundary', '—']) : ['Verdict', m.stable ? 'stable' : m.rhp ? `unstable, ${m.rhp} RHP root${m.rhp > 1 ? 's' : ''}` : 'marginally stable (roots on the jω axis)'] },
        answerStep()],
      answer: m => m.hasK ? [{tone:'y', k:'Stable for', v: m.ivs.length ? m.ivs.map(ivStr).join('<br>') : 'no K', s: m.ends.length ? `edge: ${m.ends.map(e => `K = ${n4(e.K)} (ω = ${n4(e.w)} rad/s)`).join(', ')}` : ''}]
        : [{tone:'y', k:'Stability', v: m.stable ? 'Stable' : m.rhp ? 'Unstable' : 'Marginal', s:`${m.rt.changes} sign change${m.rt.changes === 1 ? '' : 's'} → ${m.rhp} right-half-plane root${m.rhp === 1 ? '' : 's'}${m.jw ? `, ${m.jw} on the jω axis` : ''}`}],
      note: m => !m.hasK && m.flipped ? 'The polynomial was multiplied by −1 so the leading coefficient is positive; that does not move any roots.' : '',
      scene: (m, S) => {
        const ctx = G.ctx(), rows = m.hasK ? m.rows.map(r => r.map(R.str)) : m.rt.rows.map((r, i) => r.map((v, j) => j === 0 && m.rt.notes.some(nt => nt.kind === 'eps' && nt.row === i) ? 'ε' : n4(v))), nr = rows.length, nc = rows[0].length;
        const tw = m.hasK ? S.W - 40 : Math.min(S.W*.58, 120 + nc*110), rh = Math.min(38, (S.H - 80)/nr), x0 = 20, y0 = 40, cw = (tw - 64)/nc;
        G.text('Routh array', x0, 26, {size:13, weight:700});
        const v0 = S.vis('t0'), v1 = S.vis('t1'), vc = S.vis('col');
        rows.forEach((r, i) => {
          const a = i < 2 ? v0 : Math.min(1, Math.max(0, v1*(nr - 2) - (i - 2))), y = y0 + i*rh;
          if (a <= 0) return;
          G.text(`s${String(m.n - i).split('').map(c => '⁰¹²³⁴⁵⁶⁷⁸⁹'[c]).join('')}`, x0 + 8, y + rh*.65, {size:14, color:'#ffd29a', a});
          r.forEach((txt, j) => { const isFirst = j === 0, neg = !m.hasK && m.rt.rows[i][0] < 0 && isFirst; G.text(txt, x0 + 64 + j*cw, y + rh*.65, {size: m.hasK ? 12 : 13.5, mono:true, color: isFirst && vc > 0 ? (neg ? '#ff8fb8' : '#4fe3a6') : '#fff', a}); });
          ctx.save(); ctx.globalAlpha = .15*a; ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x0, y + rh); ctx.lineTo(x0 + tw, y + rh); ctx.stroke(); ctx.restore();
        });
        if (vc > 0){ ctx.save(); ctx.globalAlpha = vc*.9; ctx.strokeStyle = '#4fe3a6'; ctx.lineWidth = 2; ctx.strokeRect(x0 + 56, y0 + 2, Math.min(cw, m.hasK ? tw - 70 : cw) - 4, nr*rh - 4); ctx.restore(); }
        const vr = S.vis('roots');
        if (!m.hasK && vr > 0){
          const bx = {x:S.W*.62 + 40, y:46, w:S.W*.38 - 64, h:Math.min(S.W*.38 - 64, S.H - 100)}, M = sPlane(ctx, bx, m.roots, {title:'Roots'});
          ctx.save(); ctx.globalAlpha = .09*vr; ctx.fillStyle = '#ff4f6a'; ctx.fillRect(M.X(0), bx.y, bx.x + bx.w - M.X(0), bx.h); ctx.restore();
          m.roots.forEach(r => PL.cross(ctx, M, r[0], r[1], {color: r[0] > 1e-7 ? '#ff8fb8' : '#4fe3a6', r:6, alpha:vr}));
        }
        if (m.hasK && vr > 0){
          // number line of K with the stable intervals
          const lo = Math.min(-1, ...m.crit), hi = Math.max(1, ...m.crit), span = hi - lo, xr = [lo - .25*span, hi + .25*span], bx = {x:40, y:S.H - 70, w:S.W - 80, h:18};
          const X = k => bx.x + (k - xr[0])/(xr[1] - xr[0])*bx.w;
          ctx.save(); ctx.globalAlpha = vr; ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(bx.x, bx.y + bx.h/2); ctx.lineTo(bx.x + bx.w, bx.y + bx.h/2); ctx.stroke();
          m.ivs.forEach(iv => { const a = X(Math.max(xr[0], iv[0])), b = X(Math.min(xr[1], iv[1])); ctx.globalAlpha = .6*vr; ctx.fillStyle = '#4fe3a6'; ctx.fillRect(a, bx.y, b - a, bx.h); });
          ctx.restore();
          G.text('stable', X(m.ivs.length ? (Math.max(xr[0], m.ivs[0][0]) + Math.min(xr[1], m.ivs[0][1]))/2 : 0), bx.y + bx.h + 18, {align:'center', color:'#4fe3a6', size:12, a: m.ivs.length ? vr : 0});
          m.crit.forEach(k => G.text(`K = ${n4(k, 4)}`, X(k), bx.y - 8, {align:'center', color:'#fff', size:12, a:vr, halo:true}));
        }
      } },

    { id:'sse', title:'Steady-state error', desc:'System type, Kp, Kv, Ka and the error for step, ramp or parabola', glyph:glyph('sse'),
      fields:['G', 'input', 'A'], defaults:{G:'10(s+2)/(s(s+1)(s+5))', input:'ramp', A:'1'},
      compute: v => {
        const g = CT.tf(v.G); if (!isFinite(v.A) || v.A === 0) throw new Error('Use a non-zero input size A.');
        let type = 0; while (type < g.d.length && Math.abs(g.d[type]) < 1e-12) type++;
        const cl = CT.closed(g.n, g.d, 1), poles = P.roots(cl.d), stable = poles.every(p => p[0] < -1e-9);
        // limits of s^k G(s) as s → 0 from the lowest nonzero coefficients
        const lim = k => { const nlow = g.n.findIndex(c => Math.abs(c) > 1e-12); const eff = nlow - (type - k); if (eff > 0) return 0; if (eff < 0) return Infinity; return g.n[nlow]/g.d[type]; };
        const Kp = lim(0), Kv = lim(1), Ka = lim(2);
        const ess = {step: v.A/(1 + Kp), ramp: v.A/Kv, parabola: v.A/Ka}[v.input];
        const order = {step:0, ramp:1, parabola:2}[v.input];
        // response to the input: step response of T(s)/s^order
        const Tw = Math.max(CT.window(poles), 1e-6)*(order ? 1.6 : 1), den = P.mul(cl.d, P.pow([0, 1], order)), r = stable ? CT.step(P.scale(cl.n, v.A), den, Tw, 2000) : null;
        const inp = t => v.A*(order === 0 ? 1 : order === 1 ? t : t*t/2);
        return {id:'sse', g, src:g.src, input:v.input, A:v.A, type, Kp, Kv, Ka, ess, stable, poles, r, Tw, inp, order};
      },
      problem: m => ({ chips:[`G(s) = ${m.src}`, 'unity feedback', `${m.input} input, size ${n4(m.A)}`] }),
      steps: () => [
        { dur:2400, show:[], info: m => ({ title:'Is the closed loop stable?', body:'<p>Error constants only mean something when the loop is stable, so check the closed-loop poles first.</p>', work:`1 + G(s) = 0 → ${polyS(P.add(m.g.d, m.g.n))} = 0<br>poles: ${m.poles.map(cfmt).join(', ')}<br>→ <b>${m.stable ? 'stable' : 'unstable'}</b>` }), rd: m => ['Closed loop', m.stable ? 'stable' : 'unstable'] },
        { dur:2200, show:[], info: m => ({ title:`System type ${m.type}`, body:'<p>The type is the number of pure integrators (poles at s = 0) in G(s).</p>', work:`G(s) has ${m.type} pole${m.type === 1 ? '' : 's'} at the origin → type ${m.type}` }), rd: m => ['System type', String(m.type)] },
        { dur:2600, show:[], info: m => ({ title:'Error constants', body:'<p>Each constant is a limit as s → 0.</p>', work:`K<sub>p</sub> = lim G(s) = <b>${n4(m.Kp)}</b><br>K<sub>v</sub> = lim sG(s) = <b>${n4(m.Kv)}</b><br>K<sub>a</sub> = lim s²G(s) = <b>${n4(m.Ka)}</b>` }), rd: m => ['K<sub>p</sub>, K<sub>v</sub>, K<sub>a</sub>', `${n4(m.Kp)}, ${n4(m.Kv)}, ${n4(m.Ka)}`] },
        { dur:3000, show:['curve'], info: m => ({ title:'The error', body: m.stable ? '<p>Use the constant that matches the input.</p>' : '<p>The loop is unstable, so the output runs away and there is no steady-state error to speak of.</p>', work: m.input === 'step' ? `e<sub>ss</sub> = A/(1 + K<sub>p</sub>) = <b>${n4(m.ess)}</b>` : m.input === 'ramp' ? `e<sub>ss</sub> = A/K<sub>v</sub> = <b>${n4(m.ess)}</b>` : `e<sub>ss</sub> = A/K<sub>a</sub> = <b>${n4(m.ess)}</b>` }), rd: m => ['Steady-state error', m.stable ? n4(m.ess) : 'not defined (unstable)'] },
        answerStep()],
      answer: m => [{tone:'y', k:`e<sub>ss</sub> for a ${m.input}`, v: m.stable ? n4(m.ess) : 'unstable', s:`type ${m.type}; K<sub>p</sub> = ${n4(m.Kp)}, K<sub>v</sub> = ${n4(m.Kv)}, K<sub>a</sub> = ${n4(m.Ka)}`}],
      scene: (m, S) => {
        const ctx = G.ctx(), bx = {x:62, y:34, w:S.W - 88, h:S.H - 84};
        if (!m.stable){ G.text('The closed loop is unstable: the output grows without bound.', S.W/2, S.H/2, {align:'center', size:14, color:'#ff8fb8'}); return; }
        const [ts, tu] = tun(m.Tw), yin = m.r.t.map(m.inp), yall = m.r.y.concat(yin), M = PL.frame(ctx, bx, {xr:[0, m.Tw*ts], yr:PL.range(yall.concat([0]), .08), mode:'box', zeroLine:true, xlabel:`t (${tu})`, ylabel:'r(t), c(t)'});
        PL.line(ctx, M, m.r.t.map((t, i) => [t*ts, yin[i]]), {color:'rgba(255,255,255,.55)', width:1.8, dash:[6, 4]});
        PL.line(ctx, M, upto(m.r.t.map((t, i) => [t*ts, m.r.y[i]]), S.vis('curve')), {color:'#ff4fa3', width:2.8, glow:8});
        PL.label(ctx, bx.x + 8, bx.y + 16, 'input r(t)', {color:'#e9e4ff'}); PL.label(ctx, bx.x + 90, bx.y + 16, 'output c(t)', {color:'#ff4fa3'});
        const vc = S.vis('curve'); if (vc > .95 && isFinite(m.ess)){ const k = m.r.t.length - 1, t = m.r.t[k]; ctx.save(); ctx.strokeStyle = '#ffb84d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(M.X(t*ts) - 6, M.Y(yin[k])); ctx.lineTo(M.X(t*ts) - 6, M.Y(m.r.y[k])); ctx.stroke(); ctx.restore(); PL.label(ctx, M.X(t*ts) - 12, (M.Y(yin[k]) + M.Y(m.r.y[k]))/2, `e → ${n4(m.ess, 3)}`, {color:'#ffb84d', align:'right'}); }
      } },

    { id:'margins', title:'Gain and phase margins', desc:'Crossover frequencies, GM and PM from the Bode plot', glyph:glyph('margin'),
      fields:['G'], defaults:{G:'10/(s(s+1)(s+5))'},
      compute: v => {
        const g = CT.tf(v.G), mg = CT.margins(g.n, g.d, 1), [w0, w1] = mg.range;
        const cl = P.add(g.d, g.n), stable = P.roots(cl).every(p => p[0] < -1e-9);
        return {id:'margins', g, src:g.src, mg, w0, w1, stable, ph:mg.ph};
      },
      problem: m => ({ chips:[`G(s) = ${m.src}`, 'unity feedback'] }),
      steps: () => [
        { dur:2400, show:['mag'], info: m => ({ title:'Gain crossover', body:'<p>Find where |G(jω)| = 1 (0 dB).</p>', work: m.mg.pm ? `ω<sub>gc</sub> = <b>${n4(m.mg.pm.w)} rad/s</b>` : 'The magnitude never crosses 0 dB.' }), rd: m => ['Gain crossover ω<sub>gc</sub>', m.mg.pm ? `${n4(m.mg.pm.w)} rad/s` : 'none'] },
        { dur:2600, show:['pm'], info: m => ({ title:'Phase margin', body:'<p>How much extra phase lag at ω<sub>gc</sub> would push the loop to −180°.</p>', work: m.mg.pm ? `∠G(jω<sub>gc</sub>) = ${n4(m.ph(m.mg.pm.w))}°<br>PM = 180° + ∠G = <b>${n4(m.mg.pm.pm)}°</b>` : 'PM = ∞' }), rd: m => ['Phase margin', m.mg.pm ? `${n4(m.mg.pm.pm)}°` : '∞'] },
        { dur:2400, show:['ph'], info: m => ({ title:'Phase crossover', body:'<p>Find where the phase is −180°.</p>', work: m.mg.gm ? `ω<sub>pc</sub> = <b>${n4(m.mg.gm.w)} rad/s</b>` : 'The phase never reaches −180°.' }), rd: m => ['Phase crossover ω<sub>pc</sub>', m.mg.gm ? `${n4(m.mg.gm.w)} rad/s` : 'none'] },
        { dur:2600, show:['gm'], info: m => ({ title:'Gain margin', body:'<p>How much the gain could rise before |G| reaches 1 at ω<sub>pc</sub>.</p>', work: m.mg.gm ? `|G(jω<sub>pc</sub>)| = ${n4(1/m.mg.gm.gm)}<br>GM = 1/|G| = <b>${n4(m.mg.gm.gm)}</b> = <b>${n4(20*Math.log10(m.mg.gm.gm))} dB</b>` : 'GM = ∞' }), rd: m => ['Gain margin', m.mg.gm ? `${n4(m.mg.gm.gm)} (${n4(20*Math.log10(m.mg.gm.gm))} dB)` : '∞'] },
        answerStep()],
      answer: m => [{tone:'y', k:'Phase margin', v: m.mg.pm ? `${n4(m.mg.pm.pm)}°` : '∞', s: m.mg.pm ? `at ${n4(m.mg.pm.w)} rad/s` : ''}, {tone:'s1', k:'Gain margin', v: m.mg.gm ? `${n4(20*Math.log10(m.mg.gm.gm))} dB` : '∞', s: m.mg.gm ? `×${n4(m.mg.gm.gm)} at ${n4(m.mg.gm.w)} rad/s` : ''}],
      note: m => `Closed loop with unity feedback is ${m.stable ? 'stable' : 'unstable'}.` + (m.mg.pms.length > 1 || m.mg.gms.length > 1 ? ' There is more than one crossover; the margin closest to instability is shown.' : ''),
      scene: (m, S) => {
        const ctx = G.ctx(), x = 64, w = S.W - 90, h = (S.H - 112)/2, b1 = {x, y:30, w, h}, b2 = {x, y:30 + h + 52, w, h};
        const ws = MX.logspace(Math.log10(m.w0), Math.log10(m.w1), 700), mag = ws.map(om => 20*Math.log10(C.abs(CT.Ljw(m.g.n, m.g.d, 1, om)))), phs = ws.map(m.ph);
        const fm = mag.filter(isFinite), M1 = PL.frame(ctx, b1, {xr:[m.w0, m.w1], yr:[Math.max(-160, Math.floor(Math.min(...fm)/20)*20), Math.min(160, Math.ceil(Math.max(...fm, 5)/20)*20)], xlog:true, mode:'box', ylabel:'|G| (dB)'});
        PL.hline(ctx, M1, 0, {color:'rgba(255,255,255,.4)'});
        PL.line(ctx, M1, upto(ws.map((om, i) => [om, mag[i]]), S.vis('mag')), {color:'#ff4fa3', width:2.6, glow:8});
        const M2 = PL.frame(ctx, b2, {xr:[m.w0, m.w1], yr:PL.range(phs.concat([-180]), .08), xlog:true, mode:'box', ylabel:'∠G (°)', xlabel:'ω (rad/s)'});
        PL.hline(ctx, M2, -180, {color:'rgba(255,255,255,.4)'});
        PL.line(ctx, M2, upto(ws.map((om, i) => [om, phs[i]]), S.vis('ph') || S.vis('pm')), {color:'#41d9e8', width:2.6, glow:8});
        const vp = S.vis('pm'); if (vp > 0 && m.mg.pm){ const wg = m.mg.pm.w; [M1, M2].forEach(M => PL.vline(ctx, M, wg, {color:'rgba(255,184,77,.8)', alpha:vp})); PL.dot(ctx, M1, wg, 0, {color:'#ffb84d', r:5.5, alpha:vp, label:`ωgc ${n4(wg, 3)}`}); const pg = m.ph(wg); ctx.save(); ctx.globalAlpha = vp; ctx.strokeStyle = '#ffb84d'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(M2.X(wg), M2.Y(-180)); ctx.lineTo(M2.X(wg), M2.Y(pg)); ctx.stroke(); ctx.restore(); PL.label(ctx, M2.X(wg) - 8, (M2.Y(-180) + M2.Y(pg))/2 + 4, `PM ${n4(m.mg.pm.pm, 3)}°`, {color:'#ffb84d', alpha:vp, align:'right'}); }
        const vg = S.vis('gm'); if (vg > 0 && m.mg.gm){ const wp = m.mg.gm.w, gdb = -20*Math.log10(m.mg.gm.gm); [M1, M2].forEach(M => PL.vline(ctx, M, wp, {color:'rgba(79,227,166,.8)', alpha:vg})); PL.dot(ctx, M2, wp, -180, {color:'#4fe3a6', r:5.5, alpha:vg, label:`ωpc ${n4(wp, 3)}`}); ctx.save(); ctx.globalAlpha = vg; ctx.strokeStyle = '#4fe3a6'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(M1.X(wp), M1.Y(0)); ctx.lineTo(M1.X(wp), M1.Y(gdb)); ctx.stroke(); ctx.restore(); PL.label(ctx, M1.X(wp) + 6, (M1.Y(0) + M1.Y(gdb))/2, `GM ${n4(-gdb, 3)} dB`, {color:'#4fe3a6', alpha:vg}); }
      } },

    { id:'locus', title:'Root locus by the rules', desc:'Asymptotes, centroid, breakaway, jω crossing and departure angles', glyph:glyph('locus'),
      fields:['G'], defaults:{G:'1/(s(s+2)(s+4))'},
      compute: v => {
        const g = CT.tf(v.G), ps = P.roots(g.d), zs = P.roots(g.n), np = ps.length, nz = zs.length, na = np - nz;
        const lead = g.n[g.n.length - 1]; if (lead < 0) throw new Error('Write G(s) with a positive gain; this question uses the usual K > 0 locus.');
        const cen = na > 0 ? (ps.reduce((s, p) => s + p[0], 0) - zs.reduce((s, z) => s + z[0], 0))/na : null;
        const angles = Array.from({length:na}, (_, q) => (2*q + 1)*180/na);
        // real-axis segments: to the left of an odd number of real poles and zeros
        const reals = ps.concat(zs).filter(r => Math.abs(r[1]) < 1e-9).map(r => r[0]).sort((a, b) => b - a), segs = [];
        for (let i = 0; i < reals.length; i += 2) segs.push([i + 1 < reals.length ? reals[i + 1] : -Infinity, reals[i]]);
        const onSeg = x => segs.some(([a, b]) => x >= a - 1e-9 && x <= b + 1e-9);
        // breakaway / break-in: dK/ds = 0 → N D′ − N′ D = 0, real, on a locus segment, K > 0
        const eq = P.add(P.mul(g.n, P.deriv(g.d)), P.scale(P.mul(P.deriv(g.n), g.d), -1));
        const brk = P.roots(eq).filter(r => Math.abs(r[1]) < 1e-7*Math.max(1, Math.abs(r[0]))).map(r => r[0]).filter(x => onSeg(x)).map(x => ({x, K:-P.evalR(g.d, x)/P.evalR(g.n, x)})).filter(b => b.K > 1e-9);
        // jω crossing: Im[D(jω) N(−jω)] = 0 with K = −D/N real and positive
        const jw = []; { const parts = p => { const re = [], im = []; p.forEach((c, k) => { const s = [1, 0, -1, 0][k % 4], t = [0, 1, 0, -1][k % 4]; re[k] = c*s; im[k] = c*t; }); return {re:re.map(v => v || 0), im:im.map(v => v || 0)}; };
          const Dp = parts(g.d), Np = parts(g.n), f = P.add(P.mul(Dp.im, Np.re), P.scale(P.mul(Dp.re, Np.im), -1));
          if (P.degree(f) >= 1) P.roots(f).filter(r => Math.abs(r[1]) < 1e-7*Math.max(1, Math.abs(r[0])) && r[0] > 1e-9).forEach(r => { const w = r[0], K = -C.div(P.evalC(g.d, [0, w]), P.evalC(g.n, [0, w]))[0]; if (K > 1e-9) jw.push({w, K}); }); }
        // departure angles from complex poles (upper half)
        const dep = ps.filter(p => p[1] > 1e-9).map(p => { let a = 180; ps.forEach(q => { if (q !== p) a -= Math.atan2(p[1] - q[1], p[0] - q[0])*D; }); zs.forEach(z => { a += Math.atan2(p[1] - z[1], p[0] - z[0])*D; }); a = ((a % 360) + 540) % 360 - 180; return {p, a}; });
        const br = CT.locus(g.n, g.d, CT.kscale(g.n, g.d));
        return {id:'locus', g, src:g.src, ps, zs, np, nz, na, cen, angles, segs, brk, jw, dep, br, eq};
      },
      problem: m => ({ chips:[`G(s) = ${m.src}`, 'K from 0 to ∞'] }),
      steps: () => [
        { dur:2400, show:['pz'], info: m => ({ title:'Poles and zeros', body:'<p>Branches start at the open-loop poles (K = 0) and end at the zeros or go off to infinity.</p>', work:`poles: ${m.ps.map(cfmt).join(', ')}<br>zeros: ${m.zs.length ? m.zs.map(cfmt).join(', ') : 'none'}<br>${m.np} branches, ${m.na} go to infinity` }), rd: m => ['Branches to infinity', String(m.na)] },
        { dur:2400, show:['seg'], info: m => ({ title:'Real-axis segments', body:'<p>A point on the real axis is on the locus if there is an odd number of real poles and zeros to its right.</p>', work: m.segs.map(([a, b]) => `${isFinite(a) ? n4(a) : '−∞'} to ${n4(b)}`).join('<br>') || 'none' }) },
        { dur:2600, show:['asym'], info: m => ({ title:'Asymptotes', body:'<p>The branches that go to infinity follow straight lines from the centroid.</p>', work: m.na > 0 ? `σ<sub>a</sub> = (Σp − Σz)/(n − m) = <b>${n4(m.cen)}</b><br>angles = (2q + 1)·180°/${m.na} = ${m.angles.map(a => n4(a) + '°').join(', ')}` : 'no asymptotes (as many zeros as poles)' }), rd: m => ['Centroid σ<sub>a</sub>', m.cen === null ? '—' : n4(m.cen)] },
        { dur:2600, show:['brk'], info: m => ({ title:'Breakaway and break-in', body:'<p>Where two branches meet on the real axis K has a local extremum: solve dK/ds = 0, that is N(s)D′(s) − N′(s)D(s) = 0, and keep real roots that lie on a locus segment with K > 0.</p>', work:`${polyS(m.eq)} = 0<br>` + (m.brk.length ? m.brk.map(b => `s = <b>${n4(b.x)}</b> (K = ${n4(b.K)})`).join('<br>') : 'no valid real solutions') }), rd: m => ['Breakaway points', m.brk.length ? m.brk.map(b => n4(b.x)).join(', ') : 'none'] },
        { dur:2600, show:['jw'], info: m => ({ title:'Crossing the jω axis', body:'<p>Put s = jω in 1 + KG(s) = 0 and require both the real and imaginary parts to vanish. This is the same boundary the Routh test finds.</p>', work: m.jw.length ? m.jw.map(c => `ω = <b>±${n4(c.w)} rad/s</b> at K = <b>${n4(c.K)}</b>`).join('<br>') : 'the locus never crosses into the right half-plane for K > 0' }), rd: m => ['jω crossing', m.jw.length ? m.jw.map(c => `±j${n4(c.w)} at K = ${n4(c.K)}`).join('; ') : 'none'] },
        { dur:2400, show:['full', 'dep'], info: m => ({ title:'The full locus', body: m.dep.length ? '<p>From a complex pole the branch leaves at the departure angle: 180° − Σ(angles from other poles) + Σ(angles from zeros).</p>' : '<p>Putting the rules together gives the whole locus.</p>', work: m.dep.map(d => `from ${cfmt(d.p)}: θ<sub>d</sub> = ${n4(d.a)}°`).join('<br>') }), rd: m => m.dep.length ? ['Departure angle', m.dep.map(d => `${n4(d.a)}°`).join(', ')] : ['Departure angles', 'no complex poles'] },
        answerStep()],
      answer: m => [{tone:'y', k:'Asymptotes', v: m.na ? `σ<sub>a</sub> = ${n4(m.cen)}` : 'none', s: m.na ? `at ${m.angles.map(a => n4(a, 3) + '°').join(', ')}` : ''}, {tone:'s1', k:'Stability limit', v: m.jw.length ? `K = ${n4(m.jw[0].K)}` : 'none', s: m.jw.length ? `crosses at ±j${n4(m.jw[0].w)} rad/s` : 'stable for all K > 0'}, m.brk.length ? {tone:'s1', k:'Breakaway', v:m.brk.map(b => n4(b.x)).join(', '), s:`K = ${m.brk.map(b => n4(b.K)).join(', ')}`} : null],
      scene: (m, S) => {
        const ctx = G.ctx(), bx = {x:62, y:34, w:S.W - 88, h:S.H - 84};
        const key = m.ps.concat(m.zs, m.brk.map(b => [b.x, 0]), m.jw.flatMap(c => [[0, c.w], [0, -c.w]]), m.cen !== null ? [[m.cen, 0]] : []), R0 = Math.max(1, ...key.map(p => Math.hypot(p[0], p[1])));
        const pts = key.concat(m.br.flat().filter(r => Math.hypot(r[0], r[1]) < 2.2*R0));
        const M = sPlane(ctx, bx, pts);
        ctx.save(); ctx.globalAlpha = .07; ctx.fillStyle = '#ff4f6a'; ctx.fillRect(Math.max(M.X(0), bx.x), bx.y, bx.x + bx.w - Math.max(M.X(0), bx.x), bx.h); ctx.restore();
        const vs = S.vis('seg'); m.segs.forEach(([a, b]) => { ctx.save(); ctx.globalAlpha = vs; ctx.strokeStyle = '#41d9e8'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(M.X(isFinite(a) ? a : M.ix(bx.x)), M.Y(0)); ctx.lineTo(M.X(b), M.Y(0)); ctx.stroke(); ctx.restore(); });
        const va = S.vis('asym'); if (va > 0 && m.na > 0){ m.angles.forEach(a => { const L = 5*R0, r = a/D; PL.line(ctx, M, [[m.cen, 0], [m.cen + L*Math.cos(r), L*Math.sin(r)]], {color:'#9b7bff', width:1.5, dash:[6, 4], alpha:va}); }); PL.dot(ctx, M, m.cen, 0, {color:'#9b7bff', r:5, alpha:va, label:`σa = ${n4(m.cen, 3)}`, dy:20}); }
        const vf = S.vis('full'); if (vf > 0) m.br.forEach(br => PL.line(ctx, M, br, {color:'#41d9e8', width:2.4, glow:6, alpha:vf}));
        const vb = S.vis('brk'); m.brk.forEach(b => PL.dot(ctx, M, b.x, 0, {color:'#ffb84d', r:6, alpha:vb, label:n4(b.x, 3), dy:-12}));
        const vj = S.vis('jw'); m.jw.forEach(c => { [1, -1].forEach(sg => PL.dot(ctx, M, 0, sg*c.w, {color:'#4fe3a6', r:6, alpha:vj, label: sg > 0 ? `±j${n4(c.w, 3)}, K = ${n4(c.K, 3)}` : ''})); });
        const vp = S.vis('pz'); m.ps.forEach(p => PL.cross(ctx, M, p[0], p[1], {color:'#ff4fa3', r:6, alpha:vp, width:2.6})); m.zs.forEach(z => PL.dot(ctx, M, z[0], z[1], {color:'#ff4fa3', r:6, hollow:true, alpha:vp}));
      } }
  ];
  const FIELDS = {
    given:{label:'Given', type:'select', options:[['zw', 'ζ and ωₙ'], ['mp', 'Overshoot and peak time']]},
    zeta:{label:'Damping ratio ζ', showIf: v => v.given !== 'mp'}, wn:{label:'ω<sub>n</sub> (rad/s)', showIf: v => v.given !== 'mp'},
    Mp:{label:'Overshoot M<sub>p</sub> (%)', showIf: v => v.given === 'mp'}, tp:{label:'Peak time t<sub>p</sub> (s)', showIf: v => v.given === 'mp'},
    poly:{label:'Characteristic polynomial (may contain K)', type:'expr'}, G:{label:'Open-loop G(s)', type:'expr'},
    input:{label:'Input', type:'select', options:[['step', 'Step A·u(t)'], ['ramp', 'Ramp A·t'], ['parabola', 'Parabola A·t²/2']]}, A:{label:'Input size A'}
  };
  return {MODES, FIELDS};
};
