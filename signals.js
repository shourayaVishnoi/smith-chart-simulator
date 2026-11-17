// Signals & systems: Fourier series, convolution and sampling playgrounds plus step-by-step questions.
window.SIG = (() => {
  'use strict';
  const PI = Math.PI, TAU = 2*PI;
  const frac = x => x - Math.floor(x);
  // periodic waves of amplitude A and period T; series x = a0 + Σ an cos nω0t + bn sin nω0t
  const WAVES = {
    square:{name:'Square wave', sym:'odd and half-wave symmetric, so only odd sine terms',
      f:(t, T, A) => frac(t/T) < .5 ? A : -A, a0:() => 0, an:() => 0, bn:(n, A) => n % 2 ? 4*A/(n*PI) : 0, P:A => A*A,
      fa:'a₀ = 0, aₙ = 0', fb:'bₙ = 4A/(nπ) for odd n, 0 for even n'},
    triangle:{name:'Triangle wave', sym:'even and half-wave symmetric, so only odd cosine terms',
      f:(t, T, A) => { let c = frac(t/T); if (c >= .5) c -= 1; return A*(1 - 4*Math.abs(c)); }, a0:() => 0, an:(n, A) => n % 2 ? 8*A/(n*n*PI*PI) : 0, bn:() => 0, P:A => A*A/3,
      fa:'a₀ = 0, aₙ = 8A/(n²π²) for odd n', fb:'bₙ = 0'},
    sawtooth:{name:'Sawtooth wave', sym:'odd, so only sine terms',
      f:(t, T, A) => { let c = frac(t/T); if (c >= .5) c -= 1; return 2*A*c; }, a0:() => 0, an:() => 0, bn:(n, A) => 2*A*(n % 2 ? 1 : -1)/(n*PI), P:A => A*A/3,
      fa:'a₀ = 0, aₙ = 0', fb:'bₙ = 2A(−1)ⁿ⁺¹/(nπ)'},
    half:{name:'Half-wave rectified sine', sym:'no simple symmetry, but only b₁ survives among the sines',
      f:(t, T, A) => { const u = frac(t/T); return u < .5 ? A*Math.sin(TAU*u) : 0; }, a0:A => A/PI, an:(n, A) => n % 2 ? 0 : -2*A/(PI*(n*n - 1)), bn:(n, A) => n === 1 ? A/2 : 0, P:A => A*A/4,
      fa:'a₀ = A/π, aₙ = −2A/(π(n² − 1)) for even n', fb:'b₁ = A/2, other bₙ = 0'},
    full:{name:'Full-wave rectified sine', sym:'even, so only cosine terms',
      f:(t, T, A) => A*Math.abs(Math.sin(PI*frac(t/T))), a0:A => 2*A/PI, an:(n, A) => -4*A/(PI*(4*n*n - 1)), bn:() => 0, P:A => A*A/2,
      fa:'a₀ = 2A/π, aₙ = −4A/(π(4n² − 1))', fb:'bₙ = 0'},
    pulse:{name:'Rectangular pulse train', sym:'even (pulse centred on t = 0), so only cosine terms',
      f:(t, T, A, d) => { let c = frac(t/T); if (c >= .5) c -= 1; return Math.abs(c) < d/2 ? A : (Math.abs(Math.abs(c) - d/2) < 1e-12 ? A/2 : 0); }, a0:(A, d) => A*d, an:(n, A, d) => 2*A*Math.sin(n*PI*d)/(n*PI), bn:() => 0, P:(A, d) => A*A*d,
      fa:'a₀ = Ad, aₙ = (2A/nπ) sin(nπd)', fb:'bₙ = 0'}
  };
  function coeffs(key, A, N, d = .5){ const w = WAVES[key], a = [w.a0(A, d)], b = [0]; for (let n = 1; n <= N; n++){ a.push(w.an(n, A, d)); b.push(w.bn(n, A, d)); } return {a, b}; }
  function partial(c, T){ const w0 = TAU/T; return t => { let s = c.a[0]; for (let n = 1; n < c.a.length; n++){ if (c.a[n]) s += c.a[n]*Math.cos(n*w0*t); if (c.b[n]) s += c.b[n]*Math.sin(n*w0*t); } return s; }; }
  // one-sided signals for convolution: rect pulse on [0, p), A e^(−p t) u(t), A u(t), triangle on [0, p]
  const SIGS = {
    rect:{name:'Rectangular pulse', pname:'width', f:(t, A, p) => t >= 0 && t < p ? A : 0, end:p => p, tex:(A, p) => `${A}·[u(t) − u(t − ${p})]`},
    exp:{name:'Decaying exponential', pname:'decay rate a', f:(t, A, p) => t >= 0 ? A*Math.exp(-p*t) : 0, end:() => Infinity, tex:(A, p) => `${A}·e<sup>−${p}t</sup>u(t)`},
    step:{name:'Unit step (scaled)', pname:'—', f:(t, A) => t >= 0 ? A : 0, end:() => Infinity, tex:A => `${A}·u(t)`},
    tri:{name:'Triangle pulse', pname:'width', f:(t, A, p) => t >= 0 && t <= p ? A*(1 - Math.abs(2*t/p - 1)) : 0, end:p => p, tex:(A, p) => `${A}·tri on [0, ${p}]`}
  };
  // y(t) = ∫ x(τ) h(t − τ) dτ over the overlap of the supports
  function convAt(x, h, xe, he, t){
    const lo = Math.max(0, t - he), hi = Math.min(t, xe);
    if (!(hi > lo)) return {y:0, lo, hi};
    // split at the kinks so Simpson sees smooth pieces
    const cuts = [lo, hi].concat([xe, t - he].filter(v => v > lo && v < hi)).sort((a, b) => a - b);
    let y = 0; for (let k = 0; k < cuts.length - 1; k++) y += window.MX.integrate(tau => x(tau)*h(t - tau), cuts[k], cuts[k + 1]);
    return {y, lo, hi};
  }
  function alias(f, fs){ const k = Math.round(f/fs); return {fa:Math.abs(f - k*fs), k}; }
  function dft(x, N){ const X = []; for (let k = 0; k < N; k++){ let re = 0, im = 0; for (let n = 0; n < N; n++){ const v = n < x.length ? x[n] : 0, a = -TAU*k*n/N; re += v*Math.cos(a); im += v*Math.sin(a); } X.push([re, im]); } return X; }
  return {WAVES, coeffs, partial, SIGS, convAt, alias, dft};
})();

(() => {
  'use strict';
  const MX = window.MX, PL = window.PLOT, SG = window.SIG, $ = id => document.getElementById(id);
  const reduceMotion = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  let needs = true;
  const canvas = $('sgCanvas'), ctx = PL.fit(canvas, () => { needs = true; });
  const S = {tab:'fourier', wave:'square', N:7, d:.3, x:'rect', h:'exp', tc:1.2, playing:!reduceMotion, f:7, fs:10};
  const panels = {fourier:$('pFourier'), conv:$('pConv'), sampling:$('pSampling')};
  function bindSeg(id, key){ $(id).querySelectorAll('button').forEach(b => b.addEventListener('click', () => { S[key] = b.dataset.v; syncAll(); })); }
  function bindRange(id, key, fmt){ const r = $(id), o = $(id + 'o'); r.value = S[key]; const sh = () => { o.value = fmt(S[key]); }; r.addEventListener('input', () => { S[key] = +r.value; sh(); needs = true; if (key === 'tc'){ S.playing = false; $('sgPlay').textContent = '▶ Slide'; } }); sh(); return {set:v => { S[key] = v; r.value = v; sh(); }}; }
  function syncAll(){
    Object.entries(panels).forEach(([k, el]) => { el.hidden = k !== S.tab; });
    ['sgTab', 'sgWave', 'sgX', 'sgH'].forEach(id => $(id).querySelectorAll('button').forEach(b => { const key = {sgTab:'tab', sgWave:'wave', sgX:'x', sgH:'h'}[id]; b.setAttribute('aria-pressed', String(b.dataset.v === S[key])); }));
    $('rowDuty').hidden = S.wave !== 'pulse'; needs = true;
  }
  bindSeg('sgTab', 'tab'); bindSeg('sgWave', 'wave'); bindSeg('sgX', 'x'); bindSeg('sgH', 'h');
  bindRange('sgN', 'N', v => `${v} harmonic${v > 1 ? 's' : ''}`); bindRange('sgD', 'd', v => `${Math.round(v*100)}%`);
  const tcR = bindRange('sgT', 'tc', v => `t = ${v.toFixed(2)}`);
  bindRange('sgF', 'f', v => `${v.toFixed(1)} Hz`); bindRange('sgFs', 'fs', v => `${v.toFixed(1)} Hz`);
  $('sgPlay').addEventListener('click', () => { S.playing = !S.playing; $('sgPlay').textContent = S.playing ? '❚❚ Pause' : '▶ Slide'; });
  $('sgPlay').textContent = S.playing ? '❚❚ Pause' : '▶ Slide';
  syncAll();
  const PAR = {rect:1, exp:1.5, step:0, tri:1.5};

  function drawFourier(W, H){
    const T = 1, A = 1, c = SG.coeffs(S.wave, A, S.N, S.d), ps = SG.partial(c, T), wv = SG.WAVES[S.wave];
    const top = {x:56, y:28, w:W - 76, h:H*.58 - 40}, bot = {x:56, y:top.y + top.h + 44, w:W - 76, h:H - top.y - top.h - 82};
    const M = PL.frame(ctx, top, {xr:[-1, 1], yr:[-1.45, 1.45], mode:'box', zeroLine:true, xlabel:'t / T', title:`${wv.name}: sum of ${S.N} harmonic${S.N > 1 ? 's' : ''}`});
    const n = 1200, pts = [], tgt = [];
    for (let i = 0; i <= n; i++){ const t = -1 + 2*i/n; pts.push([t, ps(t)]); tgt.push([t, wv.f(t, T, A, S.d)]); }
    PL.line(ctx, M, tgt, {color:'rgba(255,255,255,.45)', width:1.6});
    // the highest harmonic on its own
    const N = S.N, lastN = (() => { for (let k = N; k >= 1; k--) if (c.a[k] || c.b[k]) return k; return 0; })();
    if (lastN) PL.fn(ctx, M, t => c.a[lastN]*Math.cos(TAUv*lastN*t) + c.b[lastN]*Math.sin(TAUv*lastN*t), {color:'#41d9e8', width:1.3, alpha:.55, dash:[4, 3]});
    PL.line(ctx, M, pts, {color:'#ff4fa3', width:2.6, glow:8});
    const mx = Math.max(...pts.map(p => p[1])), top1 = Math.max(...tgt.map(p => p[1]));
    const Pn = c.a[0]**2 + c.a.slice(1).reduce((s, a, k) => s + (a*a + c.b[k + 1]**2)/2, 0), Pt = wv.P(A, S.d);
    const disc = ['square', 'sawtooth', 'pulse'].includes(S.wave);
    $('sgRead').innerHTML = `${wv.fa}<br>${wv.fb}<br><span class="c">${wv.sym}</span><br>power captured: ${MX.fmt(100*Pn/Pt, 5)}%` + (disc ? `<br>peak of the sum: ${MX.fmt(mx, 4)} (overshoot ${MX.fmt(100*(mx - top1)/(2*A*(S.wave === 'pulse' ? .5 : 1)), 3)}% of the jump)` : '') + (lastN ? `<br><span class="c">dashed: harmonic ${lastN} alone</span>` : '');
    const amps = c.a.map((a, k) => k === 0 ? Math.abs(a) : Math.hypot(a, c.b[k]));
    const M2 = PL.frame(ctx, bot, {xr:[-.6, Math.max(8, N) + .6], yr:[0, Math.max(.2, ...amps)*1.15], mode:'box', xlabel:'harmonic n', ylabel:'amplitude', title:'Line spectrum', xstep:1});
    PL.stems(ctx, M2, amps.map((v, k) => [k, v]), {color:'#ffb84d', width:2.4});
  }
  const TAUv = 2*Math.PI;
  function drawConv(W, H){
    const xs = SG.SIGS[S.x], hs = SG.SIGS[S.h], px = PAR[S.x], ph = S.h === 'rect' ? .6 : PAR[S.h];
    const x = t => xs.f(t, 1, px), h = t => hs.f(t, 1, ph), xe = xs.end(px), he = hs.end(ph), t = S.tc;
    const top = {x:56, y:28, w:W - 76, h:H*.5 - 40}, bot = {x:56, y:top.y + top.h + 44, w:W - 76, h:H - top.y - top.h - 82}, xr = [-1.5, 5];
    const M = PL.frame(ctx, top, {xr, yr:[-.15, 1.3], mode:'box', zeroLine:true, xlabel:'τ', title:`x(τ) and h(${t.toFixed(2)} − τ)`});
    const ts = MX.linspace(xr[0], xr[1], 900);
    PL.area(ctx, M, ts.map(tt => [tt, x(tt)*h(t - tt)]), {color:'#4fe3a6', alpha:.35});
    PL.line(ctx, M, ts.map(tt => [tt, x(tt)]), {color:'#ff4fa3', width:2.4, glow:6});
    PL.line(ctx, M, ts.map(tt => [tt, h(t - tt)]), {color:'#41d9e8', width:2.4, glow:6});
    PL.vline(ctx, M, t, {color:'rgba(255,255,255,.5)'});
    PL.label(ctx, top.x + top.w - 210, top.y + 16, 'x(τ)', {color:'#ff4fa3'}); PL.label(ctx, top.x + top.w - 160, top.y + 16, 'h(t − τ)', {color:'#41d9e8'}); PL.label(ctx, top.x + top.w - 90, top.y + 16, 'product', {color:'#4fe3a6'});
    const yt = tt => SG.convAt(x, h, xe, he, tt).y, yv = ts.map(yt), cur = SG.convAt(x, h, xe, he, t);
    const M2 = PL.frame(ctx, bot, {xr, yr:[-.1, Math.max(.3, ...yv)*1.18], mode:'box', zeroLine:true, xlabel:'t', title:'y(t) = (x * h)(t)'});
    PL.line(ctx, M2, ts.map((tt, i) => [tt, yv[i]]), {color:'rgba(255,184,77,.3)', width:1.6});
    PL.line(ctx, M2, ts.filter(tt => tt <= t).map(tt => [tt, yt(tt)]), {color:'#ffb84d', width:2.8, glow:8});
    PL.dot(ctx, M2, t, cur.y, {color:'#fff', r:5.5, label:MX.fmt(cur.y, 4)});
    $('sgRead').innerHTML = `x(t) = ${xs.tex(1, px)}<br>h(t) = ${hs.tex(1, ph)}<br>overlap: ${cur.hi > cur.lo ? `τ from ${MX.fmt(cur.lo, 3)} to ${MX.fmt(cur.hi, 3)}` : 'none'}<br>y(${t.toFixed(2)}) = area of the green product = <b>${MX.fmt(cur.y, 5)}</b>`;
  }
  function drawSampling(W, H){
    const f = S.f, fs = S.fs, {fa} = SG.alias(f, fs), top = {x:56, y:28, w:W - 76, h:H*.55 - 40}, bot = {x:56, y:top.y + top.h + 44, w:W - 76, h:H - top.y - top.h - 82};
    const M = PL.frame(ctx, top, {xr:[0, 1], yr:[-1.3, 1.3], mode:'box', zeroLine:true, xlabel:'t (s)', title:`cos(2π·${f.toFixed(1)}t) sampled at ${fs.toFixed(1)} Hz`});
    PL.fn(ctx, M, t => Math.cos(TAUv*f*t), {color:'rgba(255,255,255,.5)', width:1.5});
    // what an ideal reconstruction from these samples gives: the alias inside ±fs/2
    PL.fn(ctx, M, t => Math.cos(TAUv*fa*t), {color:'#41d9e8', width:2.2, dash: fa === f ? [] : [6, 4], alpha:.9});
    const pts = []; for (let n = 0; n/fs <= 1 + 1e-9; n++) pts.push([n/fs, Math.cos(TAUv*f*n/fs)]);
    PL.stems(ctx, M, pts, {color:'#ff4fa3', width:1.6}); pts.forEach(([a, b]) => PL.dot(ctx, M, a, b, {color:'#ff4fa3', r:4}));
    const fmax = Math.max(2.2*fs, 1.3*f);
    const M2 = PL.frame(ctx, bot, {xr:[-fmax, fmax], yr:[0, 1.25], mode:'box', zeroLineX:true, xlabel:'f (Hz)', title:'Spectrum of the samples: copies every fs'});
    ctx.save(); ctx.globalAlpha = .12; ctx.fillStyle = '#41d9e8'; ctx.fillRect(M2.X(-fs/2), bot.y, M2.X(fs/2) - M2.X(-fs/2), bot.h); ctx.restore();
    const lines = []; for (let k = -6; k <= 6; k++){ [f, -f].forEach(q => { const v = q + k*fs; if (Math.abs(v) <= fmax) lines.push([v, k === 0 ? 1 : .7]); }); }
    PL.stems(ctx, M2, lines.filter(l => l[1] < 1), {color:'rgba(255,79,163,.5)', width:2}); PL.stems(ctx, M2, lines.filter(l => l[1] === 1), {color:'#ff4fa3', width:3});
    PL.label(ctx, M2.X(0), bot.y + 14, 'Nyquist band ±fs/2', {color:'#41d9e8', align:'center', size:11});
    $('sgRead').innerHTML = `Nyquist rate 2f = ${MX.fmt(2*f, 4)} Hz<br>` + (fs > 2*f ? `fs > 2f: <b>no aliasing</b>, the samples rebuild ${MX.fmt(f, 4)} Hz` : `fs ≤ 2f: <b>aliasing</b>, the samples look like ${MX.fmt(fa, 4)} Hz`) + `<br><span class="c">blue: the frequency the samples actually describe</span>`;
  }
  let last = performance.now();
  function loop(now){
    const dt = Math.min(64, now - last)/1000; last = now;
    if (S.tab === 'conv' && S.playing){ let v = S.tc + dt*0.9; if (v > 4.5) v = -1; tcR.set(+v.toFixed(3)); needs = true; }
    if (needs){ needs = false; const W = canvas._w, H = canvas._h; ctx.clearRect(0, 0, W, H); ({fourier:drawFourier, conv:drawConv, sampling:drawSampling})[S.tab](W, H); }
    requestAnimationFrame(loop);
  }
  $('hPlay') && $('hPlay').addEventListener('click', () => $('play').scrollIntoView({behavior: reduceMotion ? 'auto' : 'smooth'}));
  window.__sg = {S, redraw(){ needs = true; }, sync:syncAll};
  requestAnimationFrame(loop);
})();

// ---------------- step-by-step questions ----------------
window.FORMULA_PAGE = (G) => {
  'use strict';
  const MX = window.MX, PL = window.PLOT, SG = window.SIG, TAU = 2*Math.PI, n4 = (v, s = 4) => MX.fmt(v, s);
  const cardsHTML = cards => `<div class="answer">${cards.filter(Boolean).map(c => `<div class="ans ${c.tone || 'y'}"><div class="k">${c.k}</div><div class="v">${c.v}</div><div class="s">${c.s || ''}</div></div>`).join('')}</div>`;
  const MODE_OF = m => MODES.find(x => x.id === m.id);
  const answerStep = () => ({ dur:1600, show:[], info: m => ({ title:'Answer', body: cardsHTML(MODE_OF(m).answer(m)) + (MODE_OF(m).note ? `<p>${MODE_OF(m).note(m)}</p>` : ''), work:'' }) });
  const pos = (v, what) => { if (!(v > 0) || !isFinite(v)) throw new Error(`${what} must be a positive number.`); };
  const upto = (pts, k) => pts.slice(0, Math.max(2, Math.round(pts.length*Math.min(1, k))));
  const twoBoxes = S => { const x = 64, w = S.W - 90, h = (S.H - 112)/2; return [{x, y:30, w, h}, {x, y:30 + h + 52, w, h}]; };
  const GLYPH = {
    fs:'<path d="M3 22 V10 H10 V22 H17 V10 H24 V22 H29"/><path d="M3 16 C6 8, 8 8, 10 16 S 14 24, 17 16 S 21 8, 24 16" opacity=".55"/>',
    conv:'<path d="M3 24 H8 V12 H14 V24 H29"/><path d="M14 24 L18 12 L22 24" opacity=".6"/><circle cx="16" cy="6" r="2.4"/><path d="M14.3 4.3 L17.7 7.7 M17.7 4.3 L14.3 7.7"/>',
    samp:'<path d="M3 16 C7 4, 11 4, 15 16 S 23 28, 29 16" opacity=".55"/><path d="M5 16 V9 M11 16 V7 M17 16 V20 M23 16 V24"/><circle cx="5" cy="9" r="1.6" fill="currentColor"/><circle cx="11" cy="7" r="1.6" fill="currentColor"/><circle cx="17" cy="20" r="1.6" fill="currentColor"/><circle cx="23" cy="24" r="1.6" fill="currentColor"/>',
    dft:'<path d="M3 27 H29"/><path d="M6 27 V8 M11 27 V18 M16 27 V22 M21 27 V14 M26 27 V20"/>'
  };
  const glyph = k => `<svg viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${GLYPH[k]}</svg>`;

  const MODES = [
    { id:'fourier', title:'Fourier series of a wave', desc:'Symmetry, a₀, aₙ, bₙ, harmonics and Parseval’s power', glyph:glyph('fs'),
      fields:['wave', 'A', 'T', 'duty', 'N'], defaults:{wave:'square', A:'5', T:'2', T_u:'ms', duty:'0.25', N:'7'},
      compute: v => {
        pos(v.A, 'The amplitude A'); pos(v.T, 'The period T'); const N = Math.round(v.N); if (!(N >= 1 && N <= 99)) throw new Error('Use between 1 and 99 harmonics.');
        const d = v.wave === 'pulse' ? v.duty : .5; if (v.wave === 'pulse' && !(d > 0 && d < 1)) throw new Error('The duty cycle must be between 0 and 1 (for example 0.25).');
        const w = SG.WAVES[v.wave], c = SG.coeffs(v.wave, v.A, N, d), ps = SG.partial(c, v.T);
        const Pn = c.a[0]**2 + c.a.slice(1).reduce((s, a, k) => s + (a*a + c.b[k + 1]**2)/2, 0), Pt = w.P(v.A, d);
        const terms = []; for (let n = 1; n <= N; n++) if (Math.abs(c.a[n]) > 1e-15 || Math.abs(c.b[n]) > 1e-15) terms.push(n);
        return {id:'fourier', ...v, N, d, w, c, ps, Pn, Pt, terms, f0:1/v.T, w0:TAU/v.T};
      },
      problem: m => ({ chips:[m.w.name, `A = ${n4(m.A)}`, `T = ${MX.si(m.T, 's')}`].concat(m.wave === 'pulse' ? [`duty ${n4(m.d)}`] : []).concat([`${m.N} harmonics`]) }),
      steps: () => [
        { dur:2200, show:['wave'], info: m => ({ title:'The wave and its frequency', body:'<p>A periodic signal is a sum of a DC term and harmonics at multiples of the fundamental.</p>', work:`f₀ = 1/T = ${MX.si(m.f0, 'Hz')}<br>ω₀ = 2π/T = ${n4(m.w0)} rad/s<br>x(t) = a₀ + Σ [aₙ cos nω₀t + bₙ sin nω₀t]` }), rd: m => ['Fundamental f₀', MX.si(m.f0, 'Hz')] },
        { dur:2400, show:[], info: m => ({ title:'Use the symmetry', body:`<p>This wave is ${m.w.sym}. That tells you which integrals are zero before you do any work.</p>`, work:`${m.w.fa}<br>${m.w.fb}` }), rd: m => ['DC term a₀', n4(m.c.a[0])] },
        { dur:3000, show:['spec'], info: m => ({ title:'The coefficients', body:'<p>Each nonzero harmonic, with its amplitude cₙ = √(aₙ² + bₙ²):</p>', work: m.terms.slice(0, 8).map(n => `n = ${n}: ${Math.abs(m.c.a[n]) > 1e-15 ? `a = ${n4(m.c.a[n])}` : ''}${Math.abs(m.c.a[n]) > 1e-15 && Math.abs(m.c.b[n]) > 1e-15 ? ', ' : ''}${Math.abs(m.c.b[n]) > 1e-15 ? `b = ${n4(m.c.b[n])}` : ''} → c = ${n4(Math.hypot(m.c.a[n], m.c.b[n]))}`).join('<br>') + (m.terms.length > 8 ? '<br>…' : '') }),
          rd: m => m.terms.slice(0, 5).map(n => [`Harmonic ${n} amplitude`, n4(Math.hypot(m.c.a[n], m.c.b[n]))]) },
        { dur:3000, show:['sum'], info: m => ({ title:`Adding ${m.N} harmonics`, body: ['square', 'sawtooth', 'pulse'].includes(m.wave) ? '<p>The sum closes in on the wave, but near each jump it keeps overshooting by about 9% of the jump (the Gibbs effect) however many terms you add.</p>' : '<p>The sum closes in on the wave quickly because the coefficients fall off fast.</p>', work:`x<sub>${m.N}</sub>(t) = ${n4(m.c.a[0])}${m.terms.slice(0, 4).map(n => `${Math.abs(m.c.a[n]) > 1e-15 ? ` ${m.c.a[n] < 0 ? '−' : '+'} ${n4(Math.abs(m.c.a[n]))} cos ${n}ω₀t` : ''}${Math.abs(m.c.b[n]) > 1e-15 ? ` ${m.c.b[n] < 0 ? '−' : '+'} ${n4(Math.abs(m.c.b[n]))} sin ${n}ω₀t` : ''}`).join('')}${m.terms.length > 4 ? ' + …' : ''}` }) },
        { dur:2400, show:[], info: m => ({ title:'Power (Parseval)', body:'<p>The average power of the wave equals the sum of the powers of its harmonics.</p>', work:`P = a₀² + ½Σ(aₙ² + bₙ²)<br>wave: P = <b>${n4(m.Pt)}</b><br>first ${m.N} harmonics: ${n4(m.Pn)} = <b>${n4(100*m.Pn/m.Pt)}%</b>` }),
          rd: m => [['Average power', n4(m.Pt)], [`Power in ${m.N} harmonics`, `${n4(100*m.Pn/m.Pt)}%`]] },
        answerStep()],
      answer: m => [{tone:'y', k:'Coefficients', v:`${m.w.fa}`, s:m.w.fb}, {tone:'s1', k:`${m.N} harmonics carry`, v:`${n4(100*m.Pn/m.Pt)}%`, s:`of the power ${n4(m.Pt)}`}],
      scene: (m, S) => {
        const ctx = G.ctx(), [b1, b2] = twoBoxes(S), ts = MX.linspace(-m.T, m.T, 1000), sc = 1/m.T;
        const M = PL.frame(ctx, b1, {xr:[-1, 1], yr:[-1.4*m.A, 1.4*m.A], mode:'box', zeroLine:true, zeroLineX:true, xlabel:'t / T'});
        PL.line(ctx, M, ts.map(t => [t*sc, m.w.f(t, m.T, m.A, m.d)]), {color:'rgba(255,255,255,.6)', width:1.8, alpha:S.vis('wave')});
        PL.line(ctx, M, upto(ts.map(t => [t*sc, m.ps(t)]), S.vis('sum')), {color:'#ff4fa3', width:2.6, glow:8});
        const amps = m.c.a.map((a, k) => k === 0 ? Math.abs(a) : Math.hypot(a, m.c.b[k]));
        const M2 = PL.frame(ctx, b2, {xr:[-.6, Math.max(8, m.N) + .6], yr:[0, Math.max(...amps, 1e-9)*1.2], mode:'box', xlabel:'harmonic n', ylabel:'cₙ', xstep:1});
        const vs = S.vis('spec'), shown = Math.round(vs*amps.length);
        PL.stems(ctx, M2, amps.slice(0, shown).map((v, k) => [k, v]), {color:'#ffb84d', width:2.6});
      } },

    { id:'conv', title:'Convolution y = x * h', desc:'Flip, shift, find the overlap and integrate', glyph:glyph('conv'),
      fields:['xtype', 'xA', 'xp', 'htype', 'hA', 'hp', 't0'], defaults:{xtype:'rect', xA:'1', xp:'2', htype:'exp', hA:'1', hp:'1', t0:'3'},
      compute: v => {
        const xs = SG.SIGS[v.xtype], hs = SG.SIGS[v.htype];
        [['xA', 'The height of x'], ['hA', 'The height of h']].forEach(([k, w]) => { if (!isFinite(v[k]) || v[k] === 0) throw new Error(`${w} must be a non-zero number.`); });
        if (v.xtype !== 'step') pos(v.xp, `The ${xs.pname} of x`); if (v.htype !== 'step') pos(v.hp, `The ${hs.pname} of h`);
        if (!isFinite(v.t0)) throw new Error('Enter a number for t.');
        if (v.xtype === 'step' && v.htype === 'step') {/* ramp: fine */}
        const x = t => xs.f(t, v.xA, v.xp), h = t => hs.f(t, v.hA, v.hp), xe = xs.end(v.xp), he = hs.end(v.hp);
        const r = SG.convAt(x, h, xe, he, v.t0), yt = t => SG.convAt(x, h, xe, he, t).y;
        const span = Math.max(4, Math.min(isFinite(xe) ? xe : 4, 12) + Math.min(isFinite(he) ? he : 4, 12), v.t0 + 1);
        return {id:'conv', ...v, xs, hs, x, h, xe, he, y:r.y, lo:r.lo, hi:r.hi, yt, xr:[-1, span + .5]};
      },
      problem: m => ({ chips:[`x(t) = ${m.xs.tex(m.xA, m.xp)}`, `h(t) = ${m.hs.tex(m.hA, m.hp)}`, `t = ${n4(m.t0)}`] }),
      steps: () => [
        { dur:2200, show:['x'], info: m => ({ title:'Write the integral', body:'<p>Convolution slides a flipped copy of h across x and adds up the product.</p>', work:'y(t) = ∫ x(τ) h(t − τ) dτ' }) },
        { dur:2600, show:['flip'], info: m => ({ title:'Flip and shift h', body:`<p>h(t − τ) as a function of τ is h reversed and moved so its start sits at τ = t = ${n4(m.t0)}.</p>`, work:`h(${n4(m.t0)} − τ) is nonzero for τ ${isFinite(m.he) ? `from ${n4(m.t0 - m.he)} ` : ''}up to ${n4(m.t0)}` }) },
        { dur:2600, show:['overlap'], info: m => ({ title:'Find the overlap', body:'<p>The product is only nonzero where both signals are. That gives the limits of the integral.</p>', work: m.hi > m.lo ? `x(τ) ≠ 0 for τ in [0, ${isFinite(m.xe) ? n4(m.xe) : '∞'})<br>h(t − τ) ≠ 0 for τ in (${isFinite(m.he) ? n4(m.t0 - m.he) : '−∞'}, ${n4(m.t0)}]<br>overlap: τ from <b>${n4(m.lo)}</b> to <b>${n4(m.hi)}</b>` : 'They do not overlap, so y = 0 here.' }),
          rd: m => ['Integration limits', m.hi > m.lo ? `${n4(m.lo)} to ${n4(m.hi)}` : 'no overlap'] },
        { dur:2600, show:['area'], info: m => ({ title:'Integrate', body:'<p>The shaded area is y at this t.</p>', work: m.hi > m.lo ? `y(${n4(m.t0)}) = ∫<sub>${n4(m.lo)}</sub><sup>${n4(m.hi)}</sup> x(τ) h(${n4(m.t0)} − τ) dτ = <b>${n4(m.y, 6)}</b>` : `y(${n4(m.t0)}) = 0` }),
          rd: m => [`y(${n4(m.t0)})`, n4(m.y, 6)] },
        { dur:3200, show:['yall'], info: m => ({ title:'The whole output', body:'<p>Repeating this for every t traces out y(t). It starts when the supports first touch and its length is the sum of the two lengths.</p>', work:`y(t) starts at t = 0${isFinite(m.xe) && isFinite(m.he) ? ` and ends at t = ${n4(m.xe + m.he)}` : ''}` }) },
        answerStep()],
      answer: m => [{tone:'y', k:`y(${n4(m.t0)})`, v:n4(m.y, 6), s: m.hi > m.lo ? `integrate over τ from ${n4(m.lo)} to ${n4(m.hi)}` : 'no overlap'}],
      scene: (m, S) => {
        const ctx = G.ctx(), [b1, b2] = twoBoxes(S), ts = MX.linspace(m.xr[0], m.xr[1], 900);
        const vf = S.vis('flip'), t = m.xr[0] + (m.t0 - m.xr[0])*G.ease(vf);
        const xv = ts.map(m.x), hv = ts.map(tt => m.h(m.t0 - tt)), ymax = Math.max(...xv.map(Math.abs), ...hv.map(Math.abs), 1e-9);
        const M = PL.frame(ctx, b1, {xr:m.xr, yr:[-.15*ymax, 1.25*ymax], mode:'box', zeroLine:true, xlabel:'τ'});
        if (S.vis('overlap') > 0 && m.hi > m.lo){ ctx.save(); ctx.globalAlpha = .14*S.vis('overlap'); ctx.fillStyle = '#ffb84d'; ctx.fillRect(M.X(m.lo), b1.y, M.X(m.hi) - M.X(m.lo), b1.h); ctx.restore(); }
        if (S.vis('area') > 0) PL.area(ctx, M, ts.map(tt => [tt, m.x(tt)*m.h(m.t0 - tt)]), {color:'#4fe3a6', alpha:.4*S.vis('area')});
        PL.line(ctx, M, ts.map((tt, i) => [tt, xv[i]]), {color:'#ff4fa3', width:2.6, glow:6, alpha:S.vis('x')});
        if (vf > 0){ PL.line(ctx, M, ts.map(tt => [tt, m.h(t - tt)]), {color:'#41d9e8', width:2.6, glow:6, alpha:vf}); PL.vline(ctx, M, t, {color:'rgba(255,255,255,.5)', alpha:vf}); PL.label(ctx, M.X(t) + 4, b1.y + 14, `τ = t`, {color:'#fff', size:11, alpha:vf}); }
        PL.label(ctx, b1.x + 8, b1.y + 16, 'x(τ)', {color:'#ff4fa3', alpha:S.vis('x')}); PL.label(ctx, b1.x + 52, b1.y + 16, 'h(t − τ)', {color:'#41d9e8', alpha:vf});
        const yv = ts.map(m.yt), M2 = PL.frame(ctx, b2, {xr:m.xr, yr:PL.range(yv.concat([0]), .15), mode:'box', zeroLine:true, xlabel:'t', ylabel:'y(t)'});
        PL.line(ctx, M2, upto(ts.map((tt, i) => [tt, yv[i]]), S.vis('yall')), {color:'#ffb84d', width:2.6, glow:8});
        PL.dot(ctx, M2, m.t0, m.y, {color:'#fff', r:6, alpha:S.vis('area'), label:n4(m.y, 4)});
      } },

    { id:'sampling', title:'Sampling and aliasing', desc:'Nyquist rate, alias frequency and the sampled spectrum', glyph:glyph('samp'),
      fields:['f', 'fs'], defaults:{f:'7', f_u:'kHz', fs:'10', fs_u:'kHz'},
      compute: v => {
        pos(v.f, 'The signal frequency'); pos(v.fs, 'The sampling rate');
        const {fa, k} = SG.alias(v.f, v.fs);
        return {id:'sampling', ...v, fa, k, aliased: v.fs <= 2*v.f, ny:2*v.f};
      },
      problem: m => ({ chips:[`f = ${MX.si(m.f, 'Hz')}`, `f<sub>s</sub> = ${MX.si(m.fs, 'Hz')}`] }),
      steps: () => [
        { dur:2200, show:['sig'], info: m => ({ title:'Nyquist rate', body:'<p>To capture a frequency f you need more than two samples per cycle.</p>', work:`Nyquist rate = 2f = <b>${MX.si(m.ny, 'Hz')}</b><br>f<sub>s</sub> = ${MX.si(m.fs, 'Hz')} → ${m.aliased ? '<b>too slow, the signal aliases</b>' : 'fast enough'}` }), rd: m => ['Nyquist rate 2f', MX.si(m.ny, 'Hz')] },
        { dur:2600, show:['samples'], info: m => ({ title:'Take the samples', body:'<p>The samples are x[n] = cos(2πf n/f<sub>s</sub>), one every 1/f<sub>s</sub> seconds.</p>', work:`T<sub>s</sub> = 1/f<sub>s</sub> = ${MX.si(1/m.fs, 's')}<br>f/f<sub>s</sub> = ${n4(m.f/m.fs)} cycles per sample` }) },
        { dur:2800, show:['spec'], info: m => ({ title:'Spectrum copies', body:'<p>Sampling repeats the spectrum every f<sub>s</sub>. The copy that lands in the band −f<sub>s</sub>/2 … f<sub>s</sub>/2 is what you hear or reconstruct.</p>', work:`lines at ±f + k·f<sub>s</sub><br>closest to zero: |f − ${m.k}·f<sub>s</sub>| = <b>${MX.si(m.fa, 'Hz')}</b>` }), rd: m => ['Apparent frequency', MX.si(m.fa, 'Hz')] },
        { dur:2400, show:['alias'], info: m => ({ title: m.aliased ? 'The alias' : 'No aliasing', body: m.aliased ? '<p>A slower cosine passes through exactly the same sample points, so after sampling the two are indistinguishable.</p>' : '<p>The original frequency is inside the band, so it comes back unchanged.</p>', work: m.aliased ? `f<sub>alias</sub> = |f − k f<sub>s</sub>| = |${MX.si(m.f, 'Hz')} − ${m.k} × ${MX.si(m.fs, 'Hz')}| = <b>${MX.si(m.fa, 'Hz')}</b>` : `reconstructed f = ${MX.si(m.f, 'Hz')}` }) },
        answerStep()],
      answer: m => [{tone:'y', k: m.aliased ? 'Aliased to' : 'Reconstructed as', v:MX.si(m.fa, 'Hz'), s:`sampled at ${MX.si(m.fs, 'Hz')}`}, {tone:'s1', k:'Minimum sampling rate', v:`> ${MX.si(m.ny, 'Hz')}`, s:'Nyquist rate 2f'}],
      note: m => m.fs === 2*m.f ? 'Sampling at exactly 2f is a borderline case: the samples can land on the zero crossings and miss the signal entirely.' : '',
      scene: (m, S) => {
        const ctx = G.ctx(), [b1, b2] = twoBoxes(S), cyc = Math.min(6, Math.max(2, 3*m.f/Math.max(m.fa, m.f/12))), Tw = cyc/m.f, sc = m.f >= 1e3 ? 1e3 : 1, un = sc === 1e3 ? 'ms' : 's';
        const M = PL.frame(ctx, b1, {xr:[0, Tw*sc], yr:[-1.3, 1.3], mode:'box', zeroLine:true, xlabel:`t (${un})`});
        PL.fn(ctx, M, t => Math.cos(TAU*m.f*t/sc), {color:'rgba(255,255,255,.55)', width:1.6, alpha:S.vis('sig')});
        const pts = []; for (let n = 0; n/m.fs <= Tw*(1 + 1e-9); n++) pts.push([n/m.fs*sc, Math.cos(TAU*m.f*n/m.fs)]);
        const vs = S.vis('samples'), k = Math.round(vs*pts.length);
        PL.stems(ctx, M, pts.slice(0, k), {color:'#ff4fa3', width:1.6}); pts.slice(0, k).forEach(([a, b]) => PL.dot(ctx, M, a, b, {color:'#ff4fa3', r:4}));
        if (S.vis('alias') > 0) PL.fn(ctx, M, t => Math.cos(TAU*m.fa*t/sc), {color:'#41d9e8', width:2.4, glow:6, alpha:S.vis('alias'), dash: m.aliased ? [] : [6, 4]});
        const fmax = Math.max(2.2*m.fs, 1.3*m.f), fsc = fmax >= 1e3 ? 1e3 : 1, fun = fsc === 1e3 ? 'kHz' : 'Hz';
        const M2 = PL.frame(ctx, b2, {xr:[-fmax/fsc, fmax/fsc], yr:[0, 1.25], mode:'box', zeroLineX:true, xlabel:`f (${fun})`});
        ctx.save(); ctx.globalAlpha = .12; ctx.fillStyle = '#41d9e8'; ctx.fillRect(M2.X(-m.fs/2/fsc), b2.y, M2.X(m.fs/2/fsc) - M2.X(-m.fs/2/fsc), b2.h); ctx.restore();
        const vsp = S.vis('spec'); const lines = []; for (let kk = -8; kk <= 8; kk++) [m.f, -m.f].forEach(q => { const v = q + kk*m.fs; if (Math.abs(v) <= fmax) lines.push([v/fsc, kk === 0 ? 1 : .7]); });
        PL.stems(ctx, M2, lines.filter(l => l[1] === 1), {color:'#ff4fa3', width:3});
        if (vsp > 0){ PL.stems(ctx, M2, lines.filter(l => l[1] < 1), {color:'rgba(255,79,163,.55)', width:2, alpha:vsp}); PL.dot(ctx, M2, m.fa/fsc, .7, {color:'#41d9e8', r:6, alpha:vsp, label:MX.si(m.fa, 'Hz', 3)}); PL.dot(ctx, M2, -m.fa/fsc, .7, {color:'#41d9e8', r:6, alpha:vsp}); }
      } },

    { id:'dft', title:'DFT of a short sequence', desc:'X[k] term by term, magnitude and phase', glyph:glyph('dft'),
      fields:['seq', 'Npts'], defaults:{seq:'1, 2, 0, -1', Npts:'4'},
      compute: v => {
        const parts = v.seq.split(/[,\s;]+/).filter(Boolean);
        if (!parts.length) throw new Error('Type the samples x[0], x[1], … separated by commas.');
        const x = parts.map(p => { try { return MX.evalNumber(p); } catch (e){ throw new Error(`"${p}" is not a number.`); } });
        if (x.length > 32) throw new Error('Use at most 32 samples.');
        const N = Math.round(v.Npts); if (!(N >= x.length && N <= 64)) throw new Error(`N must be a whole number from ${x.length} (the number of samples) to 64.`);
        const X0 = SG.dft(x, N), sc = Math.max(1e-300, ...X0.map(c => Math.hypot(c[0], c[1]))), X = X0.map(c => c.map(q => Math.abs(q) < 1e-12*sc ? 0 : q));
        return {id:'dft', x, N, X, mag:X.map(c => Math.hypot(c[0], c[1])), ph:X.map(c => Math.hypot(c[0], c[1]) < 1e-12 ? 0 : Math.atan2(c[1], c[0])*180/Math.PI), E:x.reduce((s, q) => s + q*q, 0)};
      },
      problem: m => ({ chips:[`x[n] = {${m.x.map(q => n4(q)).join(', ')}}`, `N = ${m.N}`] }),
      steps: () => [
        { dur:2200, show:['x'], info: m => ({ title:'The definition', body:`<p>Each X[k] correlates the sequence with a complex exponential that turns k times in ${m.N} samples.${m.N > m.x.length ? ` The sequence is padded with ${m.N - m.x.length} zeros.` : ''}</p>`, work:`X[k] = Σ<sub>n=0</sub><sup>${m.N - 1}</sup> x[n] e<sup>−j2πkn/${m.N}</sup>, k = 0 … ${m.N - 1}` }) },
        { dur:2600, show:['X0'], info: m => ({ title:'k = 0 is the sum', body:'<p>Every twiddle factor is 1 when k = 0.</p>', work:`X[0] = ${m.x.map(q => n4(q)).join(' + ')} = <b>${n4(m.X[0][0])}</b>` }), rd: m => ['X[0]', n4(m.X[0][0])] },
        { dur:3400, show:['mag'], info: m => ({ title:'All the bins', body:'<p>Working each sum out the same way:</p>', work: m.X.slice(0, 10).map((c, k) => `X[${k}] = ${MX.fmtC(c)}`).join('<br>') + (m.N > 10 ? '<br>…' : '') }),
          rd: m => m.X.slice(1, Math.min(m.N, 6)).map((c, i) => [`X[${i + 1}]`, MX.fmtC(c)]) },
        { dur:2600, show:['ph'], info: m => ({ title:'Magnitude, phase and a check', body:'<p>For a real sequence |X[k]| is symmetric and the phase is antisymmetric about k = N/2. Parseval gives a check on the arithmetic.</p>', work:`Σ|x[n]|² = ${n4(m.E)}<br>(1/N)Σ|X[k]|² = ${n4(m.mag.reduce((s, q) => s + q*q, 0)/m.N)}` }),
          rd: m => ['Energy Σ|x[n]|²', n4(m.E)] },
        answerStep()],
      answer: m => [{tone:'y', k:'X[k]', v: m.X.slice(0, 4).map((c, k) => `${k}: ${MX.fmtC(c)}`).join('<br>') + (m.N > 4 ? '<br>…' : ''), s:`|X| = ${m.mag.slice(0, 8).map(q => n4(q, 3)).join(', ')}${m.N > 8 ? ', …' : ''}`}],
      scene: (m, S) => {
        const ctx = G.ctx(), x = 64, w = S.W - 90, h = (S.H - 150)/3, b = [0, 1, 2].map(i => ({x, y:30 + i*(h + 46), w, h}));
        const xn = Array.from({length:m.N}, (_, n) => [n, n < m.x.length ? m.x[n] : 0]);
        const M1 = PL.frame(ctx, b[0], {xr:[-.7, m.N - .3], yr:PL.range(xn.map(p => p[1]).concat([0]), .2), mode:'box', zeroLine:true, ylabel:'x[n]', xlabel:'n', xstep:1});
        PL.stems(ctx, M1, xn, {color:'#ff4fa3', width:2.4, alpha:S.vis('x')}); xn.forEach(([a, v]) => PL.dot(ctx, M1, a, v, {color:a < m.x.length ? '#ff4fa3' : 'rgba(255,79,163,.4)', r:4, alpha:S.vis('x')}));
        const M2 = PL.frame(ctx, b[1], {xr:[-.7, m.N - .3], yr:[0, Math.max(...m.mag, 1e-9)*1.2], mode:'box', ylabel:'|X[k]|', xlabel:'k', xstep:1});
        const k0 = S.vis('X0') > 0 ? 1 : 0, kk = Math.max(k0, Math.round(S.vis('mag')*m.N));
        PL.stems(ctx, M2, m.mag.slice(0, kk).map((v, k) => [k, v]), {color:'#ffb84d', width:2.6}); m.mag.slice(0, kk).forEach((v, k) => PL.dot(ctx, M2, k, v, {color:'#ffb84d', r:4, label: m.N <= 16 ? n4(v, 3) : ''}));
        const M3 = PL.frame(ctx, b[2], {xr:[-.7, m.N - .3], yr:[-200, 200], mode:'box', zeroLine:true, ylabel:'∠X[k] (°)', xlabel:'k', xstep:1});
        const vp = S.vis('ph'); PL.stems(ctx, M3, m.ph.map((v, k) => [k, v]), {color:'#41d9e8', width:2.4, alpha:vp}); m.ph.forEach((v, k) => PL.dot(ctx, M3, k, v, {color:'#41d9e8', r:4, alpha:vp}));
      } }
  ];
  const sigOpts = [['rect', 'Rectangular pulse'], ['exp', 'Decaying exponential'], ['step', 'Step'], ['tri', 'Triangle pulse']];
  const FIELDS = {
    wave:{label:'Wave', type:'select', options:Object.entries(SG.WAVES).map(([k, w]) => [k, w.name])},
    A:{label:'Amplitude A'}, T:{label:'Period T', units:[['ms', 1e-3], ['s', 1], ['µs', 1e-6]]}, duty:{label:'Duty cycle d (0–1)', showIf: v => v.wave === 'pulse'}, N:{label:'Harmonics N'},
    xtype:{label:'x(t)', type:'select', options:sigOpts}, xA:{label:'Height of x'}, xp:{label:'x width / decay rate', showIf: v => v.xtype !== 'step'},
    htype:{label:'h(t)', type:'select', options:sigOpts}, hA:{label:'Height of h'}, hp:{label:'h width / decay rate', showIf: v => v.htype !== 'step'}, t0:{label:'Find y at t ='},
    f:{label:'Signal frequency f', units:[['kHz', 1e3], ['Hz', 1], ['MHz', 1e6]]}, fs:{label:'Sampling rate f<sub>s</sub>', units:[['kHz', 1e3], ['Hz', 1], ['MHz', 1e6]]},
    seq:{label:'Samples x[0], x[1], …', type:'expr'}, Npts:{label:'DFT length N'}
  };
  return {MODES, FIELDS};
};
