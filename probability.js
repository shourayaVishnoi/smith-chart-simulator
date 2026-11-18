// Probability & statistics: distributions with shaded probabilities and sampling, plus step-by-step questions.
window.ST = (() => {
  'use strict';
  const SQ2 = Math.SQRT2, SQ2PI = Math.sqrt(2*Math.PI);
  // erf / erfc: series for small |x|, continued fraction for the tail (both to about 1e-15)
  function erfSeries(x){ let s = x, t = x, n = 0; while (Math.abs(t) > 1e-17*Math.abs(s)){ n++; t *= -x*x/n; s += t/(2*n + 1); if (n > 200) break; } return 2/Math.sqrt(Math.PI)*s; }
  function erfcCF(x){
    // Lentz’s method for erfc(x) = exp(−x²)/√π · 1/(x + 1/2/(x + 1/(x + 3/2/(x + …))))
    const tiny = 1e-300; let f = x, C = x, Dd = 0;
    for (let i = 1; i < 300; i++){ const a = i/2; Dd = x + a*Dd; Dd = Math.abs(Dd) < tiny ? tiny : Dd; C = x + a/C; C = Math.abs(C) < tiny ? tiny : C; Dd = 1/Dd; const del = C*Dd; f *= del; if (Math.abs(del - 1) < 1e-16) break; }
    return Math.exp(-x*x)/Math.sqrt(Math.PI)/f;
  }
  const erfc = x => x < 0 ? 2 - erfc(-x) : x < 2.5 ? 1 - erfSeries(x) : erfcCF(x);
  const Phi = z => 0.5*erfc(-z/SQ2);
  const phi = z => Math.exp(-z*z/2)/SQ2PI;
  // inverse normal: Acklam's rational approximation, then two Halley steps
  function invPhi(p){
    if (!(p > 0 && p < 1)) return p === 0 ? -Infinity : p === 1 ? Infinity : NaN;
    const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.3577518672690, -30.66479806614716, 2.506628277459239], b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572], c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783], d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
    let x; const pl = 0.02425;
    if (p < pl){ const q = Math.sqrt(-2*Math.log(p)); x = (((((c[0]*q + c[1])*q + c[2])*q + c[3])*q + c[4])*q + c[5])/((((d[0]*q + d[1])*q + d[2])*q + d[3])*q + 1); }
    else if (p <= 1 - pl){ const q = p - 0.5, r = q*q; x = (((((a[0]*r + a[1])*r + a[2])*r + a[3])*r + a[4])*r + a[5])*q/(((((b[0]*r + b[1])*r + b[2])*r + b[3])*r + b[4])*r + 1); }
    else { const q = Math.sqrt(-2*Math.log(1 - p)); x = -(((((c[0]*q + c[1])*q + c[2])*q + c[3])*q + c[4])*q + c[5])/((((d[0]*q + d[1])*q + d[2])*q + d[3])*q + 1); }
    for (let k = 0; k < 2; k++){ const e = Phi(x) - p, u = e*SQ2PI*Math.exp(x*x/2); x = x - u/(1 + x*u/2); }
    return x;
  }
  // log-gamma (Lanczos, g = 7)
  const LG = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  function lgamma(x){ if (x < 0.5) return Math.log(Math.PI/Math.abs(Math.sin(Math.PI*x))) - lgamma(1 - x); x -= 1; let a = LG[0]; const t = x + 7.5; for (let i = 1; i < 9; i++) a += LG[i]/(x + i); return 0.5*Math.log(2*Math.PI) + (x + 0.5)*Math.log(t) - t + Math.log(a); }
  // regularised incomplete gamma P(a, x)
  function gammaP(a, x){
    if (x <= 0) return 0;
    if (x < a + 1){ let s = 1/a, t = s, ap = a; for (let n = 0; n < 1000; n++){ ap++; t *= x/ap; s += t; if (Math.abs(t) < Math.abs(s)*1e-16) break; } return s*Math.exp(-x + a*Math.log(x) - lgamma(a)); }
    let b = x + 1 - a, c = 1/1e-300, dd = 1/b, h = dd;
    for (let i = 1; i < 1000; i++){ const an = -i*(i - a); b += 2; dd = an*dd + b; if (Math.abs(dd) < 1e-300) dd = 1e-300; c = b + an/c; if (Math.abs(c) < 1e-300) c = 1e-300; dd = 1/dd; const del = dd*c; h *= del; if (Math.abs(del - 1) < 1e-16) break; }
    return 1 - Math.exp(-x + a*Math.log(x) - lgamma(a))*h;
  }
  // regularised incomplete beta I_x(a, b)
  function betacf(a, b, x){
    let qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab*x/qap; if (Math.abs(d) < 1e-300) d = 1e-300; d = 1/d; let h = d;
    for (let m = 1; m < 1000; m++){
      const m2 = 2*m; let aa = m*(b - m)*x/((qam + m2)*(a + m2)); d = 1 + aa*d; if (Math.abs(d) < 1e-300) d = 1e-300; c = 1 + aa/c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1/d; h *= d*c;
      aa = -(a + m)*(qab + m)*x/((a + m2)*(qap + m2)); d = 1 + aa*d; if (Math.abs(d) < 1e-300) d = 1e-300; c = 1 + aa/c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1/d; const del = d*c; h *= del; if (Math.abs(del - 1) < 1e-16) break;
    }
    return h;
  }
  function betaI(a, b, x){
    if (x <= 0) return 0; if (x >= 1) return 1;
    const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a*Math.log(x) + b*Math.log(1 - x));
    return x < (a + 1)/(a + b + 2) ? bt*betacf(a, b, x)/a : 1 - bt*betacf(b, a, 1 - x)/b;
  }
  const tCdf = (t, v) => { const x = v/(v + t*t), ib = 0.5*betaI(v/2, 0.5, x); return t >= 0 ? 1 - ib : ib; };
  const tPdf = (t, v) => Math.exp(lgamma((v + 1)/2) - lgamma(v/2))/Math.sqrt(v*Math.PI)*Math.pow(1 + t*t/v, -(v + 1)/2);
  function tInv(p, v){ let lo = -1e3, hi = 1e3; for (let k = 0; k < 200; k++){ const m = (lo + hi)/2; if (tCdf(m, v) < p) lo = m; else hi = m; } return (lo + hi)/2; }
  const chiCdf = (x, k) => gammaP(k/2, x/2), chiPdf = (x, k) => x <= 0 ? 0 : Math.exp((k/2 - 1)*Math.log(x) - x/2 - k/2*Math.log(2) - lgamma(k/2));
  const lchoose = (n, k) => lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1);
  function binomPmf(k, n, p){ if (k < 0 || k > n || !Number.isInteger(k)) return 0; if (p === 0) return k === 0 ? 1 : 0; if (p === 1) return k === n ? 1 : 0; return Math.exp(lchoose(n, k) + k*Math.log(p) + (n - k)*Math.log(1 - p)); }
  function choose(n, k){ let r = 1; for (let i = 1; i <= k; i++) r = r*(n - k + i)/i; return Math.round(r) === r || r > 1e15 ? r : Math.round(r); }
  const poisPmf = (k, l) => k < 0 || !Number.isInteger(k) ? 0 : Math.exp(k*Math.log(l) - l - lgamma(k + 1));
  // quantiles with linear interpolation between order statistics (numpy default, Excel QUARTILE.INC)
  function quantile(sorted, q){ const h = (sorted.length - 1)*q, lo = Math.floor(h), hi = Math.ceil(h); return sorted[lo] + (h - lo)*(sorted[hi] - sorted[lo]); }
  // random numbers
  let spare = null;
  const randn = () => { if (spare !== null){ const s = spare; spare = null; return s; } let u = 0, v = 0; while (u === 0) u = Math.random(); v = Math.random(); const r = Math.sqrt(-2*Math.log(u)); spare = r*Math.sin(2*Math.PI*v); return r*Math.cos(2*Math.PI*v); };
  return {Phi, phi, invPhi, erfc, lgamma, gammaP, betaI, tCdf, tPdf, tInv, chiCdf, chiPdf, binomPmf, choose, poisPmf, quantile, randn};
})();

(() => {
  'use strict';
  const MX = window.MX, PL = window.PLOT, ST = window.ST, $ = id => document.getElementById(id);
  const BLUE = '#8AB4F0', TEAL = '#7CC6BE', SAND = '#E2B86F', SAGE = '#8FC79A', TEXT = '#D5DCE4';
  let needs = true;
  const canvas = $('stCanvas'), ctx = PL.fit(canvas, () => { needs = true; });
  const S = {dist:'normal', p1:0, p2:1, a:-1, b:1, kind:'between', sample:null};
  const DIST = {
    normal:{p1:['Mean μ', -10, 10, 0.1, 0], p2:['Std dev σ', 0.1, 5, 0.1, 1], disc:false, range:(a, b) => [a - 4*b, a + 4*b], pdf:(x, a, b) => ST.phi((x - a)/b)/b, cdf:(x, a, b) => ST.Phi((x - a)/b), mean:(a) => a, vr:(a, b) => b*b, draw:(a, b) => a + b*ST.randn()},
    binom:{p1:['Trials n', 1, 100, 1, 20], p2:['Success p', 0.01, 0.99, 0.01, 0.3], disc:true, range:(n) => [0, n], pdf:(k, n, p) => ST.binomPmf(k, n, p), mean:(n, p) => n*p, vr:(n, p) => n*p*(1 - p), draw:(n, p) => { let s = 0; for (let i = 0; i < n; i++) if (Math.random() < p) s++; return s; }},
    poisson:{p1:['Rate λ', 0.2, 30, 0.1, 4], p2:null, disc:true, range:(l) => [0, Math.ceil(l + 5*Math.sqrt(l) + 4)], pdf:(k, l) => ST.poisPmf(k, l), mean:(l) => l, vr:(l) => l, draw:(l) => { let k = 0, p = Math.exp(-l), c = p; const u = Math.random(); while (u > c && k < 1000){ k++; p *= l/k; c += p; } return k; }},
    uniform:{p1:['Lower a', -10, 9, 0.1, 0], p2:['Width b − a', 0.1, 20, 0.1, 4], disc:false, range:(a, w) => [a - 0.25*w, a + 1.25*w], pdf:(x, a, w) => x >= a && x <= a + w ? 1/w : 0, cdf:(x, a, w) => Math.min(1, Math.max(0, (x - a)/w)), mean:(a, w) => a + w/2, vr:(a, w) => w*w/12, draw:(a, w) => a + w*Math.random()},
    expo:{p1:['Rate λ', 0.05, 5, 0.05, 1], p2:null, disc:false, range:(l) => [0, 6/l], pdf:(x, l) => x < 0 ? 0 : l*Math.exp(-l*x), cdf:(x, l) => x < 0 ? 0 : 1 - Math.exp(-l*x), mean:(l) => 1/l, vr:(l) => 1/(l*l), draw:(l) => -Math.log(1 - Math.random())/l},
    t:{p1:['Degrees of freedom ν', 1, 50, 1, 5], p2:null, disc:false, range:() => [-5, 5], pdf:(x, v) => ST.tPdf(x, v), cdf:(x, v) => ST.tCdf(x, v), mean:(v) => v > 1 ? 0 : NaN, vr:(v) => v > 2 ? v/(v - 2) : Infinity, draw:(v) => { let c = 0; for (let i = 0; i < v; i++){ const z = ST.randn(); c += z*z; } return ST.randn()/Math.sqrt(c/v); }},
    chi2:{p1:['Degrees of freedom k', 1, 50, 1, 4], p2:null, disc:false, range:(k) => [0, k + 6*Math.sqrt(2*k) + 2], pdf:(x, k) => ST.chiPdf(x, k), cdf:(x, k) => ST.chiCdf(x, k), mean:(k) => k, vr:(k) => 2*k, draw:(k) => { let c = 0; for (let i = 0; i < k; i++){ const z = ST.randn(); c += z*z; } return c; }}
  };
  const r1 = $('stP1'), r2 = $('stP2'), ra = $('stA'), rb = $('stB');
  function setupDist(){
    const d = DIST[S.dist];
    [[r1, d.p1, 'p1', 'rowP1'], [r2, d.p2, 'p2', 'rowP2']].forEach(([r, spec, key, row]) => { $(row).hidden = !spec; if (!spec) return; r.min = spec[1]; r.max = spec[2]; r.step = spec[3]; S[key] = spec[4]; r.value = spec[4]; $(row).querySelector('span').textContent = spec[0]; });
    const [lo, hi] = d.range(S.p1, S.p2); S.a = d.disc ? Math.round(lo + (hi - lo)*0.3) : +(lo + (hi - lo)*0.35).toFixed(2); S.b = d.disc ? Math.round(lo + (hi - lo)*0.6) : +(lo + (hi - lo)*0.65).toFixed(2); S.sample = null;
    syncAB(); sync();
  }
  function syncAB(){ const d = DIST[S.dist], [lo, hi] = d.range(S.p1, S.p2); [ra, rb].forEach(r => { r.min = lo; r.max = hi; r.step = d.disc ? 1 : (hi - lo)/400; }); ra.value = S.a; rb.value = S.b; }
  function sync(){
    $('stDist').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === S.dist)));
    $('stKind').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === S.kind)));
    $('rowA').hidden = S.kind === 'le'; $('rowB').hidden = S.kind === 'ge';
    const f = v => DIST[S.dist].disc ? String(Math.round(v)) : MX.fmt(v, 4);
    $('stP1o').value = MX.fmt(S.p1, 3); $('stP2o').value = MX.fmt(S.p2, 3); $('stAo').value = f(S.a); $('stBo').value = f(S.b); needs = true;
  }
  $('stDist').querySelectorAll('button').forEach(b => b.addEventListener('click', () => { S.dist = b.dataset.v; setupDist(); }));
  $('stKind').querySelectorAll('button').forEach(b => b.addEventListener('click', () => { S.kind = b.dataset.v; sync(); }));
  r1.addEventListener('input', () => { S.p1 = +r1.value; S.sample = null; syncAB(); sync(); });
  r2.addEventListener('input', () => { S.p2 = +r2.value; S.sample = null; syncAB(); sync(); });
  ra.addEventListener('input', () => { S.a = +ra.value; sync(); }); rb.addEventListener('input', () => { S.b = +rb.value; sync(); });
  $('stDraw').addEventListener('click', () => { const d = DIST[S.dist]; S.sample = Array.from({length:2000}, () => d.draw(S.p1, S.p2)); needs = true; });
  $('stClear').addEventListener('click', () => { S.sample = null; needs = true; });
  function prob(){
    const d = DIST[S.dist], a = Math.min(S.a, S.b), b = Math.max(S.a, S.b), A = S.kind === 'le' ? -Infinity : (S.kind === 'ge' ? S.a : a), B = S.kind === 'ge' ? Infinity : (S.kind === 'le' ? S.b : b);
    if (d.disc){ const [lo, hi] = [0, S.dist === 'binom' ? S.p1 : 1e4]; let s = 0; for (let k = Math.max(lo, Math.ceil(A)); k <= Math.min(hi, Math.floor(B)); k++){ const v = d.pdf(k, S.p1, S.p2); s += v; if (S.dist === 'poisson' && k > S.p1 + 60 && v < 1e-18) break; } return {P:s, A, B}; }
    return {P:(isFinite(B) ? d.cdf(B, S.p1, S.p2) : 1) - (isFinite(A) ? d.cdf(A, S.p1, S.p2) : 0), A, B};
  }
  function draw(){
    const W = canvas._w, H = canvas._h, d = DIST[S.dist]; ctx.clearRect(0, 0, W, H);
    const [lo, hi] = d.range(S.p1, S.p2), {P, A, B} = prob(), box = {x:62, y:30, w:W - 86, h:H - 76};
    let ymax;
    if (d.disc){ ymax = 0; for (let k = lo; k <= hi; k++) ymax = Math.max(ymax, d.pdf(k, S.p1, S.p2)); }
    else { ymax = 0; MX.linspace(lo, hi, 400).forEach(x => { const v = d.pdf(x, S.p1, S.p2); if (isFinite(v)) ymax = Math.max(ymax, v); }); ymax = Math.min(ymax, 5); }
    let hist = null;
    if (S.sample){
      const nb = d.disc ? null : 40, bw = d.disc ? 1 : (hi - lo)/nb, cnt = new Map();
      S.sample.forEach(x => { if (x < lo - .5 || x > hi + .5) return; const k = d.disc ? Math.round(x) : Math.floor((x - lo)/bw); cnt.set(k, (cnt.get(k) || 0) + 1); });
      hist = {bw, cnt}; cnt.forEach(c => { ymax = Math.max(ymax, c/S.sample.length/bw); });
    }
    const M = PL.frame(ctx, box, {xr:d.disc ? [lo - .7, hi + .7] : [lo, hi], yr:[0, ymax*1.15], mode:'box', xlabel:'x', ylabel: d.disc ? 'P(X = k)' : 'f(x)', title:{normal:'Normal', binom:'Binomial', poisson:'Poisson', uniform:'Uniform', expo:'Exponential', t:'Student t', chi2:'Chi-square'}[S.dist], xstep: d.disc && hi - lo <= 40 ? 1 : undefined});
    if (hist){ ctx.save(); ctx.fillStyle = 'rgba(213,220,228,.16)'; hist.cnt.forEach((c, k) => { const x0 = d.disc ? k - .45 : lo + k*hist.bw, x1 = d.disc ? k + .45 : x0 + hist.bw, h = c/S.sample.length/hist.bw; ctx.fillRect(M.X(x0), M.Y(h), M.X(x1) - M.X(x0) - 1, M.Y(0) - M.Y(h)); }); ctx.restore(); }
    if (d.disc){
      for (let k = lo; k <= hi; k++){ const v = d.pdf(k, S.p1, S.p2), inside = k >= A - 1e-9 && k <= B + 1e-9, w = Math.min(0.4, 0.4*(M.X(1) - M.X(0))/((M.X(1) - M.X(0)) || 1)); ctx.save(); ctx.fillStyle = inside ? 'rgba(226,184,111,.85)' : 'rgba(138,180,240,.55)'; ctx.fillRect(M.X(k - .38), M.Y(v), M.X(k + .38) - M.X(k - .38), M.Y(0) - M.Y(v)); ctx.restore(); void w; }
    } else {
      const xs = MX.linspace(Math.max(lo, isFinite(A) ? A : lo), Math.min(hi, isFinite(B) ? B : hi), 300);
      if (xs[0] < xs[xs.length - 1]) PL.area(ctx, M, xs.map(x => [x, Math.min(d.pdf(x, S.p1, S.p2), ymax*1.2)]), {color:SAND, alpha:.4});
      PL.fn(ctx, M, x => Math.min(d.pdf(x, S.p1, S.p2), ymax*1.3), {color:BLUE, width:2.6});
    }
    [A, B].forEach(x => { if (isFinite(x)) PL.vline(ctx, M, x, {color:'rgba(226,184,111,.9)'}); });
    const mu = d.mean(S.p1, S.p2), vr = d.vr(S.p1, S.p2), f = v => d.disc ? String(Math.round(v)) : MX.fmt(v, 4);
    const expr = S.kind === 'le' ? `P(X ≤ ${f(B)})` : S.kind === 'ge' ? `P(X ≥ ${f(A)})` : `P(${f(A)} ≤ X ≤ ${f(B)})`;
    PL.label(ctx, box.x + box.w - 8, box.y + 18, `${expr} = ${MX.fmt(P, 5)}`, {color:SAND, size:14, align:'right'});
    let samp = ''; if (S.sample){ const n = S.sample.length, m = S.sample.reduce((s, x) => s + x, 0)/n, v = S.sample.reduce((s, x) => s + (x - m)**2, 0)/(n - 1), frac = S.sample.filter(x => x >= A - 1e-9 && x <= B + 1e-9).length/n; samp = `<br><span class="c">2000 samples: mean ${MX.fmt(m, 4)}, variance ${MX.fmt(v, 4)}, fraction in range ${MX.fmt(frac, 3)}</span>`; }
    $('stRead').innerHTML = `${expr} = <b>${MX.fmt(P, 6)}</b><br>mean = ${MX.fmt(mu, 5)}, variance = ${MX.fmt(vr, 5)}, sd = ${MX.fmt(Math.sqrt(vr), 5)}${samp}`;
  }
  function loop(){ if (needs){ needs = false; draw(); } requestAnimationFrame(loop); }
  setupDist();
  const rm = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  $('hPlay') && $('hPlay').addEventListener('click', () => $('play').scrollIntoView({behavior: rm ? 'auto' : 'smooth'}));
  window.__st = {S, prob, setDist(d){ S.dist = d; setupDist(); }, set(k, v){ S[k] = v; sync(); }};
  requestAnimationFrame(loop);
})();

// ---------------- step-by-step questions ----------------
window.FORMULA_PAGE = (G) => {
  'use strict';
  const MX = window.MX, PL = window.PLOT, ST = window.ST;
  const n4 = (v, s = 4) => MX.fmt(v, s), p6 = v => MX.fmt(v, 6);
  const BLUE = '#8AB4F0', TEAL = '#7CC6BE', SAND = '#E2B86F', SAGE = '#8FC79A', LILAC = '#B6A2DE', RED = '#E07A6E', TEXT = '#D5DCE4';
  const cardsHTML = cards => `<div class="answer">${cards.filter(Boolean).map(c => `<div class="ans ${c.tone || 'y'}"><div class="k">${c.k}</div><div class="v">${c.v}</div><div class="s">${c.s || ''}</div></div>`).join('')}</div>`;
  const MODE_OF = m => MODES.find(x => x.id === m.id);
  const answerStep = () => ({ dur:1600, show:[], info: m => ({ title:'Answer', body: cardsHTML(MODE_OF(m).answer(m)) + (MODE_OF(m).note && MODE_OF(m).note(m) ? `<p>${MODE_OF(m).note(m)}</p>` : ''), work:'' }) });
  const pos = (v, w) => { if (!(v > 0) || !isFinite(v)) throw new Error(`${w} must be a positive number.`); };
  const fin = (v, w) => { if (!isFinite(v)) throw new Error(`Enter a number for ${w}.`); };
  const prob01 = (v, w) => { if (!(v >= 0 && v <= 1)) throw new Error(`${w} must be between 0 and 1.`); };
  const nums = (s, w) => { const out = (s || '').split(/[,\s;]+/).filter(Boolean).map(x => { const v = MX.evalNumber(x); if (!isFinite(v)) throw new Error(`"${x}" in ${w} is not a number.`); return v; }); return out; };
  const box1 = S => ({x:66, y:34, w:S.W - 92, h:S.H - 84});
  const GLYPH = {
    normal:'<path d="M3 26 C9 26, 11 6, 16 6 S 23 26, 29 26"/><path d="M16 26 V6" stroke-dasharray="2 3" opacity=".6"/>',
    binom:'<path d="M5 27 V20 M10 27 V12 M15 27 V7 M20 27 V11 M25 27 V19"/><path d="M3 27 H29"/>',
    pois:'<path d="M5 27 V14 M10 27 V8 M15 27 V12 M20 27 V19 M25 27 V24"/><path d="M3 27 H29"/>',
    desc:'<circle cx="7" cy="22" r="1.6" fill="currentColor"/><circle cx="12" cy="17" r="1.6" fill="currentColor"/><circle cx="17" cy="18" r="1.6" fill="currentColor"/><circle cx="22" cy="11" r="1.6" fill="currentColor"/><circle cx="27" cy="8" r="1.6" fill="currentColor"/><path d="M4 25 L29 6"/>',
    bayes:'<rect x="4" y="4" width="24" height="24" rx="2"/><path d="M12 4 V28 M4 20 H12 M12 11 H28"/>',
    ci:'<path d="M3 16 H29"/><path d="M8 11 V21 M24 11 V21"/><circle cx="16" cy="16" r="2.6" fill="currentColor"/>'
  };
  const glyph = k => `<svg viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${GLYPH[k]}</svg>`;
  const kindTxt = (k, a, b, f = n4) => ({lt:`P(X < ${f(a)})`, gt:`P(X > ${f(a)})`, between:`P(${f(a)} < X < ${f(b)})`, eq:`P(X = ${f(a)})`, le:`P(X ≤ ${f(a)})`, ge:`P(X ≥ ${f(a)})`, btw:`P(${f(a)} ≤ X ≤ ${f(b)})`}[k]);
  function bars(m, S, pmf, lo, hi, inside, extra){
    const ctx = G.ctx(), ks = []; for (let k = lo; k <= hi; k++) ks.push(k);
    const ymax = Math.max(...ks.map(pmf)), M = PL.frame(ctx, box1(S), {xr:[lo - .7, hi + .7], yr:[0, ymax*1.2], mode:'box', xlabel:'k', ylabel:'P(X = k)', xstep: hi - lo <= 30 ? 1 : undefined});
    const vb = S.vis('bars'), vs = S.vis('sum');
    ks.forEach(k => { const v = pmf(k), on = inside(k); ctx.save(); ctx.globalAlpha = vb; ctx.fillStyle = on && vs > 0 ? `rgba(226,184,111,${.35 + .55*vs})` : 'rgba(138,180,240,.6)'; ctx.fillRect(M.X(k - .38), M.Y(v), M.X(k + .38) - M.X(k - .38), M.Y(0) - M.Y(v)); ctx.restore(); });
    if (extra) extra(M, ctx);
    return M;
  }

  const MODES = [
    { id:'normal', title:'Normal probabilities', desc:'z-scores and areas under the bell curve, or the value for a percentile', glyph:glyph('normal'),
      fields:['mu', 'sd', 'nkind', 'a', 'b', 'p'], defaults:{mu:'70', sd:'8', nkind:'between', a:'60', b:'85', p:'0.9'},
      compute: v => {
        fin(v.mu, 'μ'); pos(v.sd, 'σ');
        if (v.nkind === 'inv'){ if (!(v.p > 0 && v.p < 1)) throw new Error('The probability must be strictly between 0 and 1.'); const z = ST.invPhi(v.p); return {id:'normal', ...v, z, x:v.mu + z*v.sd}; }
        fin(v.a, 'a'); if (v.nkind === 'between'){ fin(v.b, 'b'); if (!(v.b > v.a)) throw new Error('b must be bigger than a.'); }
        const za = (v.a - v.mu)/v.sd, zb = v.nkind === 'between' ? (v.b - v.mu)/v.sd : null, Pa = ST.Phi(za), Pb = zb === null ? null : ST.Phi(zb);
        const P = v.nkind === 'lt' ? Pa : v.nkind === 'gt' ? 1 - Pa : Pb - Pa;
        return {id:'normal', ...v, za, zb, Pa, Pb, P};
      },
      problem: m => ({ chips:[`X ~ N(μ = ${n4(m.mu)}, σ = ${n4(m.sd)})`, m.nkind === 'inv' ? `find x with P(X < x) = ${n4(m.p)}` : kindTxt(m.nkind, m.a, m.b)] }),
      steps: () => [
        { dur:2200, show:['curve'], info: m => ({ title:'Standardise', body:'<p>Convert to the standard normal with z = (x − μ)/σ; then one table (Φ) works for every normal distribution.</p>', work: m.nkind === 'inv' ? 'x = μ + zσ' : `z<sub>a</sub> = (${n4(m.a)} − ${n4(m.mu)})/${n4(m.sd)} = <b>${n4(m.za)}</b>` + (m.zb !== null ? `<br>z<sub>b</sub> = (${n4(m.b)} − ${n4(m.mu)})/${n4(m.sd)} = <b>${n4(m.zb)}</b>` : '') }), rd: m => m.nkind === 'inv' ? [] : ['z-score' + (m.zb !== null ? 's' : ''), m.zb !== null ? `${n4(m.za)}, ${n4(m.zb)}` : n4(m.za)] },
        { dur:2600, show:['shade'], info: m => m.nkind === 'inv' ? ({ title:'Look up z backwards', body:'<p>Find the z whose area to the left is the given probability.</p>', work:`Φ(z) = ${n4(m.p)} → z = <b>${n4(m.z, 5)}</b>` }) : ({ title:'Areas from Φ', body:'<p>Φ(z) is the area to the left of z.</p>', work:`Φ(${n4(m.za)}) = ${p6(m.Pa)}` + (m.Pb !== null ? `<br>Φ(${n4(m.zb)}) = ${p6(m.Pb)}` : '') }), rd: m => m.nkind === 'inv' ? ['z', n4(m.z, 5)] : [] },
        { dur:2200, show:['ans'], info: m => m.nkind === 'inv' ? ({ title:'Back to x', body:'<p>Undo the standardising.</p>', work:`x = ${n4(m.mu)} + ${n4(m.z, 5)} × ${n4(m.sd)} = <b>${n4(m.x, 6)}</b>` }) : ({ title:'The probability', body: m.nkind === 'gt' ? '<p>Area to the right is 1 minus the area to the left.</p>' : m.nkind === 'between' ? '<p>Area between is the difference of the two left areas.</p>' : '<p>It is the left area itself.</p>', work:`${kindTxt(m.nkind, m.a, m.b)} = <b>${p6(m.P)}</b>` }), rd: m => m.nkind === 'inv' ? ['x', n4(m.x, 6)] : ['Probability', p6(m.P)] },
        answerStep()],
      answer: m => m.nkind === 'inv' ? [{tone:'y', k:`${n4(100*m.p)}th percentile`, v:n4(m.x, 6), s:`z = ${n4(m.z, 5)}`}] : [{tone:'y', k:kindTxt(m.nkind, m.a, m.b), v:p6(m.P), s:`${n4(100*m.P)}%`}],
      scene: (m, S) => {
        const ctx = G.ctx(), lo = m.mu - 4*m.sd, hi = m.mu + 4*m.sd, M = PL.frame(ctx, box1(S), {xr:[lo, hi], yr:[0, ST.phi(0)/m.sd*1.2], mode:'box', xlabel:'x', ylabel:'f(x)'});
        const f = x => ST.phi((x - m.mu)/m.sd)/m.sd, vs = S.vis('shade');
        if (vs > 0){ const [A, B] = m.nkind === 'inv' ? [lo, m.x] : m.nkind === 'lt' ? [lo, m.a] : m.nkind === 'gt' ? [m.a, hi] : [m.a, m.b]; const xs = MX.linspace(Math.max(lo, A), Math.min(hi, B), 300); if (xs[0] < xs[xs.length - 1]) PL.area(ctx, M, xs.map(x => [x, f(x)]), {color:SAND, alpha:.45*vs}); }
        PL.fn(ctx, M, f, {color:BLUE, width:2.6, alpha:S.vis('curve')});
        // z axis under the x axis
        if (S.vis('curve') > 0) for (let z = -3; z <= 3; z++) PL.label(ctx, M.X(m.mu + z*m.sd), M.box.y + M.box.h - 8, `z=${z}`, {color:'rgba(213,220,228,.45)', size:10.5, align:'center', alpha:S.vis('curve')});
        const va = S.vis('ans'); if (va > 0) PL.label(ctx, M.box.x + M.box.w - 8, M.box.y + 20, m.nkind === 'inv' ? `x = ${n4(m.x, 5)}` : `${kindTxt(m.nkind, m.a, m.b)} = ${n4(m.P, 5)}`, {color:SAND, size:15, align:'right', alpha:va});
      } },

    { id:'binom', title:'Binomial probabilities', desc:'n independent trials: exact sums, mean, variance and the normal approximation', glyph:glyph('binom'),
      fields:['n', 'pp', 'bkind', 'k', 'k2'], defaults:{n:'12', pp:'0.3', bkind:'le', k:'4', k2:'6'},
      compute: v => {
        const n = v.n, p = v.pp; if (!(Number.isInteger(n) && n >= 1 && n <= 1000)) throw new Error('n must be a whole number from 1 to 1000.'); prob01(p, 'p');
        const k = v.k; if (!(Number.isInteger(k) && k >= 0 && k <= n)) throw new Error(`k must be a whole number from 0 to ${n}.`);
        let lo = k, hi = k; if (v.bkind === 'le'){ lo = 0; } else if (v.bkind === 'ge'){ hi = n; } else if (v.bkind === 'btw'){ if (!(Number.isInteger(v.k2) && v.k2 >= k && v.k2 <= n)) throw new Error(`The upper k must be a whole number from ${k} to ${n}.`); hi = v.k2; }
        const terms = []; let P = 0; for (let j = lo; j <= hi; j++){ const t = ST.binomPmf(j, n, p); terms.push([j, t]); P += t; }
        const mu = n*p, sd = Math.sqrt(n*p*(1 - p)), Pn = sd > 0 ? ST.Phi((hi + .5 - mu)/sd) - ST.Phi((lo - .5 - mu)/sd) : NaN;
        return {id:'binom', n, p, bkind:v.bkind, k, k2:v.k2, lo, hi, terms, P, mu, sd, Pn};
      },
      problem: m => ({ chips:[`X ~ Bin(n = ${m.n}, p = ${n4(m.p)})`, kindTxt(m.bkind, m.k, m.k2, String)] }),
      steps: () => [
        { dur:2400, show:['bars'], info: m => ({ title:'The binomial formula', body:'<p>The chance of exactly k successes in n trials is the number of ways to choose them times the probability of each way.</p>', work:`P(X = k) = C(n, k) p<sup>k</sup>(1 − p)<sup>n−k</sup>` }) },
        { dur:3200, show:['sum'], info: m => ({ title:`Add k from ${m.lo} to ${m.hi}`, body: m.hi - m.lo > 6 ? '<p>The first few terms are shown; all of them are added.</p>' : '<p>Work out each term and add.</p>', work: m.terms.slice(0, 7).map(([j, t]) => `P(X = ${j}) = C(${m.n}, ${j})·${n4(m.p)}<sup>${j}</sup>·${n4(1 - m.p)}<sup>${m.n - j}</sup> = ${p6(t)}`).join('<br>') + (m.terms.length > 7 ? `<br>… (${m.terms.length} terms)` : '') + `<br>total = <b>${p6(m.P)}</b>` }), rd: m => ['Probability', p6(m.P)] },
        { dur:2400, show:[], info: m => ({ title:'Mean, spread and a check', body:'<p>For large n the binomial looks normal. With the continuity correction (±0.5) the approximation is:</p>', work:`mean np = ${n4(m.mu)}, variance np(1−p) = ${n4(m.sd*m.sd)}<br>normal approx ≈ ${p6(m.Pn)} (exact ${p6(m.P)})` + (m.n*m.p < 5 || m.n*(1 - m.p) < 5 ? '<br><span class="c">np or n(1−p) is under 5, so the approximation is rough here</span>' : '') }), rd: m => [['Mean', n4(m.mu)], ['Standard deviation', n4(m.sd)]] },
        answerStep()],
      answer: m => [{tone:'y', k:kindTxt(m.bkind, m.k, m.k2, String), v:p6(m.P), s:`mean ${n4(m.mu)}, sd ${n4(m.sd)}`}],
      scene: (m, S) => bars(m, S, k => ST.binomPmf(k, m.n, m.p), Math.max(0, Math.floor(m.mu - 4.5*m.sd - 1)), Math.min(m.n, Math.ceil(m.mu + 4.5*m.sd + 1)), k => k >= m.lo && k <= m.hi,
        (M, ctx) => { const vs = S.vis('sum'); if (vs > 0) PL.label(ctx, M.box.x + M.box.w - 8, M.box.y + 20, `${kindTxt(m.bkind, m.k, m.k2, String)} = ${n4(m.P, 5)}`, {color:SAND, size:15, align:'right', alpha:vs}); }) },

    { id:'pois', title:'Poisson probabilities', desc:'Counts of rare events at a known average rate', glyph:glyph('pois'),
      fields:['rate', 'tt', 'bkind', 'k', 'k2'], defaults:{rate:'3', tt:'2', bkind:'ge', k:'4', k2:'8'},
      compute: v => {
        pos(v.rate, 'The rate'); pos(v.tt, 'The interval'); const l = v.rate*v.tt; if (l > 700) throw new Error('λ is too large for exact Poisson sums here; use the normal approximation.');
        const k = v.k; if (!(Number.isInteger(k) && k >= 0)) throw new Error('k must be a whole number 0 or more.');
        let lo = k, hi = k, comp = false; if (v.bkind === 'le') lo = 0; else if (v.bkind === 'ge'){ lo = 0; hi = k - 1; comp = true; } else if (v.bkind === 'btw'){ if (!(Number.isInteger(v.k2) && v.k2 >= k)) throw new Error('The upper k must be a whole number at least k.'); hi = v.k2; }
        const terms = []; let s = 0; for (let j = lo; j <= hi; j++){ const t = ST.poisPmf(j, l); terms.push([j, t]); s += t; }
        return {id:'pois', ...v, l, lo, hi, comp, terms, P: comp ? 1 - s : s, s};
      },
      problem: m => ({ chips:[`rate ${n4(m.rate)} per unit, over ${n4(m.tt)} units`, kindTxt(m.bkind, m.k, m.k2, String)] }),
      steps: () => [
        { dur:2200, show:['bars'], info: m => ({ title:'Find λ', body:'<p>λ is the expected number of events in the interval: rate × length.</p>', work:`λ = ${n4(m.rate)} × ${n4(m.tt)} = <b>${n4(m.l)}</b><br>P(X = k) = e<sup>−λ</sup>λ<sup>k</sup>/k!` }), rd: m => ['λ', n4(m.l)] },
        { dur:3200, show:['sum'], info: m => ({ title: m.comp ? 'Use the complement' : `Add k from ${m.lo} to ${m.hi}`, body: m.comp ? `<p>P(X ≥ ${m.k}) has infinitely many terms, so work out 1 − P(X ≤ ${m.k - 1}).</p>` : '<p>Work out each term and add.</p>', work: m.terms.slice(0, 7).map(([j, t]) => `P(X = ${j}) = e<sup>−${n4(m.l)}</sup>·${n4(m.l)}<sup>${j}</sup>/${j}! = ${p6(t)}`).join('<br>') + (m.terms.length > 7 ? '<br>…' : '') + (m.comp ? `<br>sum = ${p6(m.s)} → 1 − sum = <b>${p6(m.P)}</b>` : `<br>total = <b>${p6(m.P)}</b>`) }), rd: m => ['Probability', p6(m.P)] },
        answerStep()],
      answer: m => [{tone:'y', k:kindTxt(m.bkind, m.k, m.k2, String), v:p6(m.P), s:`λ = ${n4(m.l)}; mean = variance = λ`}],
      scene: (m, S) => bars(m, S, k => ST.poisPmf(k, m.l), 0, Math.max(m.k + 2, (m.bkind === 'btw' ? Math.min(m.k2, 200) : 0) + 2, Math.ceil(m.l + 4*Math.sqrt(m.l) + 3)), k => m.comp ? k >= m.k : (k >= m.lo && k <= m.hi),
        (M, ctx) => { const vs = S.vis('sum'); if (vs > 0) PL.label(ctx, M.box.x + M.box.w - 8, M.box.y + 20, `${kindTxt(m.bkind, m.k, m.k2, String)} = ${n4(m.P, 5)}`, {color:SAND, size:15, align:'right', alpha:vs}); }) },

    { id:'desc', title:'Data summary and regression', desc:'Mean, median, quartiles, standard deviation; with y values, the least-squares line', glyph:glyph('desc'),
      fields:['xs', 'ys'], defaults:{xs:'2, 4, 5, 7, 8, 10, 11, 13', ys:'5.1, 8.9, 10.2, 14.8, 16.1, 20.5, 21.9, 26.3'},
      compute: v => {
        const x = nums(v.xs, 'x'); if (x.length < 2) throw new Error('Enter at least two numbers.'); if (x.length > 500) throw new Error('Use at most 500 values.');
        const y = v.ys && v.ys.trim() ? nums(v.ys, 'y') : null; if (y && y.length !== x.length) throw new Error(`x has ${x.length} values but y has ${y.length}.`);
        const n = x.length, mean = x.reduce((s, a) => s + a, 0)/n, ss = x.reduce((s, a) => s + (a - mean)**2, 0), sorted = x.slice().sort((a, b) => a - b);
        const q1 = ST.quantile(sorted, .25), med = ST.quantile(sorted, .5), q3 = ST.quantile(sorted, .75), iqr = q3 - q1;
        const freq = new Map(); x.forEach(a => freq.set(a, (freq.get(a) || 0) + 1)); const mf = Math.max(...freq.values()), modes = mf > 1 ? [...freq].filter(([, c]) => c === mf).map(([a]) => a) : [];
        const out = {id:'desc', x, y, n, mean, med, q1, q3, iqr, sorted, modes, varS:ss/(n - 1), varP:ss/n, min:sorted[0], max:sorted[n - 1], outliers:sorted.filter(a => a < q1 - 1.5*iqr || a > q3 + 1.5*iqr)};
        if (y){
          const my = y.reduce((s, a) => s + a, 0)/n, sxy = x.reduce((s, a, i) => s + (a - mean)*(y[i] - my), 0), syy = y.reduce((s, a) => s + (a - my)**2, 0);
          if (ss === 0) throw new Error('All x values are the same, so a line cannot be fitted.');
          const b = sxy/ss, a = my - b*mean, r = syy > 0 ? sxy/Math.sqrt(ss*syy) : NaN, res = y.map((yy, i) => yy - (a + b*x[i])), sse = res.reduce((s, e) => s + e*e, 0);
          Object.assign(out, {my, sxy, syy, sxx:ss, b, a, r, r2:r*r, res, se:n > 2 ? Math.sqrt(sse/(n - 2)) : NaN});
        }
        return out;
      },
      problem: m => ({ chips:[`${m.n} x values`].concat(m.y ? ['paired y values'] : []) }),
      steps: () => [
        { dur:2400, show:['pts'], info: m => ({ title:'Centre', body:'<p>The mean balances the data; the median is the middle value once sorted.</p>', work:`mean x̄ = Σx/n = ${n4(m.x.reduce((s, a) => s + a, 0))}/${m.n} = <b>${n4(m.mean, 6)}</b><br>median = <b>${n4(m.med, 6)}</b>` + (m.modes.length ? `<br>mode: ${m.modes.map(a => n4(a)).join(', ')}` : '<br>no repeated value, so no mode') }), rd: m => [['Mean', n4(m.mean, 6)], ['Median', n4(m.med, 6)]] },
        { dur:2600, show:['box'], info: m => ({ title:'Spread', body:'<p>Quartiles use linear interpolation between sorted values (the same rule as Excel QUARTILE.INC and NumPy). The sample standard deviation divides by n − 1.</p>', work:`Q1 = ${n4(m.q1, 6)}, Q3 = ${n4(m.q3, 6)}, IQR = ${n4(m.iqr, 6)}<br>s² = Σ(x − x̄)²/(n − 1) = ${n4(m.varS, 6)} → s = <b>${n4(Math.sqrt(m.varS), 6)}</b><br>population σ = ${n4(Math.sqrt(m.varP), 6)}` + (m.outliers.length ? `<br>outliers (1.5 IQR rule): ${m.outliers.map(a => n4(a)).join(', ')}` : '') }), rd: m => [['Q1, Q3', `${n4(m.q1, 6)}, ${n4(m.q3, 6)}`], ['Sample sd s', n4(Math.sqrt(m.varS), 6)]] },
        { dur:3000, show:['line'], info: m => m.y ? ({ title:'Least-squares line', body:'<p>The slope comes from the covariance of x and y over the variance of x; the line passes through (x̄, ȳ).</p>', work:`S<sub>xx</sub> = ${n4(m.sxx, 6)}, S<sub>xy</sub> = ${n4(m.sxy, 6)}<br>b = S<sub>xy</sub>/S<sub>xx</sub> = <b>${n4(m.b, 6)}</b><br>a = ȳ − b x̄ = <b>${n4(m.a, 6)}</b><br>r = ${n4(m.r, 6)}, r² = ${n4(m.r2, 6)}` }) : ({ title:'No y values', body:'<p>Add a matching list of y values to fit a line.</p>', work:'' }), rd: m => m.y ? [['Line', `y = ${n4(m.a, 5)} ${m.b < 0 ? '−' : '+'} ${n4(Math.abs(m.b), 5)}x`], ['Correlation r', n4(m.r, 6)]] : ['Line', '—'] },
        answerStep()],
      answer: m => [{tone:'y', k:'Mean and sd', v:`${n4(m.mean, 5)}, ${n4(Math.sqrt(m.varS), 5)}`, s:`median ${n4(m.med, 5)}, IQR ${n4(m.iqr, 5)}`}, m.y ? {tone:'s1', k:'Regression line', v:`y = ${n4(m.a, 4)} ${m.b < 0 ? '−' : '+'} ${n4(Math.abs(m.b), 4)}x`, s:`r = ${n4(m.r, 4)}, r² = ${n4(m.r2, 4)}`} : null],
      scene: (m, S) => {
        const ctx = G.ctx(), vp = S.vis('pts'), vb = S.vis('box'), vl = S.vis('line');
        if (m.y){
          const M = PL.frame(ctx, {x:66, y:34, w:S.W - 92, h:S.H*0.68 - 34}, {xr:PL.range(m.x, .08), yr:PL.range(m.y, .1), mode:'box', xlabel:'x', ylabel:'y'});
          if (vl > 0){ PL.fn(ctx, M, x => m.a + m.b*x, {color:SAND, width:2.4, alpha:vl}); m.x.forEach((x, i) => PL.line(ctx, M, [[x, m.y[i]], [x, m.a + m.b*x]], {color:'rgba(224,122,110,.6)', width:1.2, alpha:vl})); PL.dot(ctx, M, m.mean, m.my, {color:SAND, r:5, hollow:true, alpha:vl, label:'(x̄, ȳ)'}); }
          m.x.forEach((x, i) => PL.dot(ctx, M, x, m.y[i], {color:BLUE, r:4.5, alpha:vp}));
        }
        // box plot of x
        const by = m.y ? S.H*0.68 + 30 : S.H*0.45, bh = m.y ? Math.min(50, S.H*0.22) : 70, M2 = PL.frame(ctx, {x:66, y:by, w:S.W - 92, h:bh}, {xr:PL.range(m.x, .08), yr:[0, 1], mode:'box', grid:false, noY:true, xlabel: m.y ? 'x' : 'value'});
        if (!m.y) m.sorted.forEach((x, i) => PL.dot(ctx, M2, x, 0.15 + 0.08*(i % 3), {color:BLUE, r:4, alpha:vp}));
        if (vb > 0){ const yc = .55, h = .35; ctx.save(); ctx.globalAlpha = vb; ctx.strokeStyle = SAND; ctx.lineWidth = 2; ctx.strokeRect(M2.X(m.q1), M2.Y(yc + h), M2.X(m.q3) - M2.X(m.q1), M2.Y(yc - h) - M2.Y(yc + h)); ctx.beginPath(); ctx.moveTo(M2.X(m.med), M2.Y(yc + h)); ctx.lineTo(M2.X(m.med), M2.Y(yc - h));
          const wl = Math.min(...m.sorted.filter(a => a >= m.q1 - 1.5*m.iqr)), wh = Math.max(...m.sorted.filter(a => a <= m.q3 + 1.5*m.iqr)); ctx.moveTo(M2.X(wl), M2.Y(yc)); ctx.lineTo(M2.X(m.q1), M2.Y(yc)); ctx.moveTo(M2.X(m.q3), M2.Y(yc)); ctx.lineTo(M2.X(wh), M2.Y(yc)); ctx.stroke(); ctx.restore();
          m.outliers.forEach(o => PL.dot(ctx, M2, o, yc, {color:RED, r:4, alpha:vb})); PL.dot(ctx, M2, m.mean, yc, {color:BLUE, r:4, hollow:true, alpha:vb}); }
      } },

    { id:'bayes', title:'Bayes’ theorem', desc:'Test accuracy and base rates: P(A | positive) with an area diagram', glyph:glyph('bayes'),
      fields:['pa', 'pba', 'pbna'], defaults:{pa:'0.01', pba:'0.95', pbna:'0.05'},
      compute: v => {
        prob01(v.pa, 'P(A)'); prob01(v.pba, 'P(B | A)'); prob01(v.pbna, 'P(B | not A)');
        const pb = v.pba*v.pa + v.pbna*(1 - v.pa); if (pb === 0) throw new Error('With these numbers B can never happen.');
        return {id:'bayes', ...v, pb, pab:v.pba*v.pa/pb, panb: pb < 1 ? (1 - v.pba)*v.pa/(1 - pb) : NaN};
      },
      problem: m => ({ chips:[`P(A) = ${n4(m.pa)}`, `P(B | A) = ${n4(m.pba)}`, `P(B | A′) = ${n4(m.pbna)}`] }),
      steps: () => [
        { dur:2400, show:['split'], info: m => ({ title:'Split by A', body:'<p>Think of 10 000 people: P(A) of them have the condition.</p>', work:`with A: ${n4(m.pa*1e4)}<br>without A: ${n4((1 - m.pa)*1e4)}` }) },
        { dur:2600, show:['b'], info: m => ({ title:'Who tests positive', body:'<p>Each group splits again by the test result.</p>', work:`true positives P(B|A)P(A) = ${p6(m.pba*m.pa)}<br>false positives P(B|A′)P(A′) = ${p6(m.pbna*(1 - m.pa))}<br>P(B) = <b>${p6(m.pb)}</b>` }), rd: m => ['P(B)', p6(m.pb)] },
        { dur:2600, show:['post'], info: m => ({ title:'Bayes’ theorem', body:'<p>Among the positives, what fraction really have A?</p>', work:`P(A | B) = P(B|A)P(A)/P(B) = ${p6(m.pba*m.pa)}/${p6(m.pb)} = <b>${p6(m.pab)}</b>` + (isFinite(m.panb) ? `<br>P(A | B′) = ${p6(m.panb)}` : '') }), rd: m => [['P(A | B)', p6(m.pab)], ['P(A | not B)', isFinite(m.panb) ? p6(m.panb) : '—']] },
        answerStep()],
      answer: m => [{tone:'y', k:'P(A | B)', v:p6(m.pab), s:`${n4(100*m.pab)}% of positives truly have A`}],
      note: m => m.pab < 0.5 && m.pba > 0.8 ? 'Even an accurate test gives mostly false positives when A is rare: the base rate matters.' : '',
      scene: (m, S) => {
        const ctx = G.ctx(), L = Math.min(S.W - 220, S.H - 80), x0 = 50, y0 = 40, wa = Math.max(L*m.pa, 4), vsp = S.vis('split'), vb = S.vis('b'), vp = S.vis('post');
        G.roundRect(x0, y0, L, L, 4, 'rgba(213,220,228,.05)', {stroke:'rgba(213,220,228,.3)'});
        ctx.save(); ctx.globalAlpha = vsp; ctx.fillStyle = 'rgba(138,180,240,.25)'; ctx.fillRect(x0, y0, wa, L); ctx.restore();
        G.text('A', x0 + wa/2, y0 - 8, {align:'center', a:vsp, color:BLUE}); G.text('not A', x0 + wa + (L - wa)/2, y0 - 8, {align:'center', a:vsp, color:TEXT});
        if (vb > 0){ ctx.save(); ctx.globalAlpha = vb; ctx.fillStyle = 'rgba(226,184,111,.75)'; ctx.fillRect(x0, y0 + L*(1 - m.pba), wa, L*m.pba); ctx.fillStyle = 'rgba(224,122,110,.6)'; ctx.fillRect(x0 + wa, y0 + L*(1 - m.pbna), L - wa, L*m.pbna); ctx.restore();
          G.text('B (test +)', x0 + L + 14, y0 + L - 10, {color:SAND, a:vb}); }
        if (vp > 0){ G.text(`true +: ${n4(m.pba*m.pa*1e4, 4)} in 10 000`, x0 + L + 14, y0 + 30, {color:SAND, a:vp}); G.text(`false +: ${n4(m.pbna*(1 - m.pa)*1e4, 4)}`, x0 + L + 14, y0 + 52, {color:RED, a:vp}); G.text(`P(A | B) = ${n4(m.pab, 4)}`, x0 + L + 14, y0 + 86, {color:'#fff', size:15, a:vp});
          // the positives on their own: how much of the bar is true positives
          const bw = Math.min(S.W - x0 - L - 40, 200), bx = x0 + L + 14, by = y0 + 110; G.text('all positives', bx, by - 6, {color:TEXT, size:12, a:vp});
          G.roundRect(bx, by, bw, 22, 3, 'rgba(224,122,110,.6)', {a:vp}); G.roundRect(bx, by, Math.max(2, bw*m.pab), 22, 3, 'rgba(226,184,111,.9)', {a:vp}); }
      } },

    { id:'ci', title:'Confidence interval for a mean', desc:'z or t interval from data or from x̄, s and n', glyph:glyph('ci'),
      fields:['src', 'data', 'n', 'xbar', 's', 'conf', 'known'], defaults:{src:'data', data:'12.1, 11.8, 12.6, 12.0, 11.5, 12.3, 12.9, 11.7, 12.2, 12.4', n:'36', xbar:'50', s:'6', conf:'95', known:'t'},
      compute: v => {
        let n, xbar, s;
        if (v.src === 'data'){ const x = nums(v.data, 'the data'); if (x.length < 2) throw new Error('Enter at least two values.'); n = x.length; xbar = x.reduce((a, b) => a + b, 0)/n; s = Math.sqrt(x.reduce((a, b) => a + (b - xbar)**2, 0)/(n - 1)); }
        else { n = v.n; xbar = v.xbar; s = v.s; if (!(Number.isInteger(n) && n >= 2)) throw new Error('n must be a whole number of at least 2.'); fin(xbar, 'x̄'); pos(s, 's'); }
        if (!(v.conf > 0 && v.conf < 100)) throw new Error('The confidence level must be between 0 and 100 %.');
        const alpha = 1 - v.conf/100, useZ = v.known === 'z', crit = useZ ? ST.invPhi(1 - alpha/2) : ST.tInv(1 - alpha/2, n - 1), se = s/Math.sqrt(n), E = crit*se;
        return {id:'ci', src:v.src, n, xbar, s, conf:v.conf, alpha, useZ, crit, se, E, lo:xbar - E, hi:xbar + E};
      },
      problem: m => ({ chips:[`n = ${m.n}`, `x̄ = ${n4(m.xbar, 6)}`, `${m.useZ ? 'σ' : 's'} = ${n4(m.s, 6)}`, `${n4(m.conf)}% confidence`] }),
      steps: () => [
        { dur:2200, show:['dist'], info: m => ({ title:'Standard error', body:'<p>The sample mean varies from sample to sample with standard deviation σ/√n.</p>', work:`SE = ${m.useZ ? 'σ' : 's'}/√n = ${n4(m.s, 6)}/√${m.n} = <b>${n4(m.se, 6)}</b>` }), rd: m => ['Standard error', n4(m.se, 6)] },
        { dur:2600, show:['crit'], info: m => ({ title: m.useZ ? 'Critical z' : `Critical t with ${m.n - 1} degrees of freedom`, body: m.useZ ? '<p>σ is known, so use the standard normal.</p>' : '<p>σ is estimated by s, so use Student’s t, which has heavier tails for small n.</p>', work:`${m.useZ ? 'z' : 't'}<sub>${n4(m.alpha/2)}</sub> = <b>${n4(m.crit, 5)}</b>` }), rd: m => [m.useZ ? 'Critical z' : 'Critical t', n4(m.crit, 5)] },
        { dur:2400, show:['int'], info: m => ({ title:'The interval', body:'<p>Go the margin of error either side of the sample mean.</p>', work:`E = ${n4(m.crit, 5)} × ${n4(m.se, 6)} = ${n4(m.E, 6)}<br>x̄ ± E = <b>(${n4(m.lo, 6)}, ${n4(m.hi, 6)})</b>` }), rd: m => [['Margin of error', n4(m.E, 6)], ['Interval', `(${n4(m.lo, 6)}, ${n4(m.hi, 6)})`]] },
        answerStep()],
      answer: m => [{tone:'y', k:`${n4(m.conf)}% interval for μ`, v:`(${n4(m.lo, 5)}, ${n4(m.hi, 5)})`, s:`x̄ = ${n4(m.xbar, 5)} ± ${n4(m.E, 5)}`}],
      scene: (m, S) => {
        const ctx = G.ctx(), v = m.n - 1, f = t => m.useZ ? ST.phi(t) : ST.tPdf(t, v), lim = Math.max(4, m.crit*1.4), M = PL.frame(ctx, {x:66, y:34, w:S.W - 92, h:S.H*0.62}, {xr:[-lim, lim], yr:[0, f(0)*1.25], mode:'box', xlabel: m.useZ ? 'z' : 't', ylabel:'density'});
        const vc = S.vis('crit'); if (vc > 0){ PL.area(ctx, M, MX.linspace(-m.crit, m.crit, 300).map(t => [t, f(t)]), {color:SAND, alpha:.35*vc}); [-m.crit, m.crit].forEach(t => { PL.vline(ctx, M, t, {color:SAND, alpha:vc}); PL.label(ctx, M.X(t), M.box.y + 16, n4(t, 4), {color:SAND, align:'center', alpha:vc}); }); PL.label(ctx, M.X(0), M.Y(f(0)*0.4), `${n4(m.conf)}%`, {color:'#fff', align:'center', size:15, alpha:vc}); }
        PL.fn(ctx, M, f, {color:BLUE, width:2.6, alpha:S.vis('dist')});
        const vi = S.vis('int'); if (vi > 0){ const y = S.H*0.62 + 90, xr = [m.xbar - 2*m.E, m.xbar + 2*m.E], X = x => 66 + (x - xr[0])/(xr[1] - xr[0])*(S.W - 92);
          G.line(X(m.lo), y, X(m.hi), y, SAND, 3, {a:vi}); [m.lo, m.hi].forEach(x => { G.line(X(x), y - 10, X(x), y + 10, SAND, 3, {a:vi}); G.text(n4(x, 5), X(x), y + 28, {align:'center', a:vi, color:SAND}); }); G.circle(X(m.xbar), y, 6, {fill:'#fff', a:vi}); G.text(`x̄ = ${n4(m.xbar, 5)}`, X(m.xbar), y - 16, {align:'center', a:vi}); }
      } }
  ];
  const FIELDS = {
    mu:{label:'Mean μ'}, sd:{label:'Std dev σ'}, nkind:{label:'Find', type:'select', options:[['between', 'P(a < X < b)'], ['lt', 'P(X < a)'], ['gt', 'P(X > a)'], ['inv', 'x for a percentile']]},
    a:{label:'a', showIf: v => v.nkind !== 'inv'}, b:{label:'b', showIf: v => v.nkind === 'between'}, p:{label:'Probability below x', showIf: v => v.nkind === 'inv'},
    n:{label:'Number n', showIf: v => v.src === undefined || v.src === 'summary'}, pp:{label:'Success probability p'},
    bkind:{label:'Find', type:'select', options:[['le', 'P(X ≤ k)'], ['ge', 'P(X ≥ k)'], ['eq', 'P(X = k)'], ['btw', 'P(k ≤ X ≤ k₂)']]}, k:{label:'k'}, k2:{label:'k₂', showIf: v => v.bkind === 'btw'},
    rate:{label:'Average rate (per unit)'}, tt:{label:'Interval length (units)'},
    xs:{label:'x values', type:'expr'}, ys:{label:'y values (optional)', type:'expr'},
    pa:{label:'P(A), the base rate'}, pba:{label:'P(B | A), e.g. sensitivity'}, pbna:{label:'P(B | not A), false positive rate'},
    src:{label:'Given', type:'select', options:[['data', 'Raw data'], ['summary', 'n, x̄ and s']]}, data:{label:'Data', type:'expr', showIf: v => v.src === 'data'},
    xbar:{label:'Sample mean x̄', showIf: v => v.src === 'summary'}, s:{label:'Std dev (s or σ)', showIf: v => v.src === 'summary'}, conf:{label:'Confidence (%)'},
    known:{label:'Use', type:'select', options:[['t', 't (σ unknown)'], ['z', 'z (σ known)']]}
  };
  return {MODES, FIELDS};
};
