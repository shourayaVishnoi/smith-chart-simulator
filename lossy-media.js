// Plane waves in lossy media: question types for the formula walkthrough engine.
window.FORMULA_PAGE = (G) => {
  'use strict';
  const {C, PI, TAU, clamp, num, si, fix} = G;
  const EPS0 = 8.854e-12, MU0 = 4*PI*1e-7;
  const NP2DB = 20/Math.log(10);   // 1 Np = 8.686 dB

  function need(v, what){ if (!isFinite(v)) throw new Error(`Enter a number for ${what}.`); return v; }
  function pos(v, what){ need(v, what); if (v <= 0) throw new Error(`${/^[a-z]/.test(what) ? what[0].toUpperCase() + what.slice(1) : what} must be greater than 0.`); return v; }
  function nonneg(v, what){ need(v, what); if (v < 0) throw new Error(`${/^[a-z]/.test(what) ? what[0].toUpperCase() + what.slice(1) : what} can't be negative.`); return v; }
  const cardsHTML = cards => `<div class="answer">${cards.filter(Boolean).map(c => `<div class="ans ${c.tone || 'y'}"><div class="k">${c.k}</div><div class="v">${c.v}</div><div class="s">${c.s || ''}</div></div>`).join('')}</div>`;

  // exact plane-wave parameters of a medium
  function medium(sig, er, mr, fr){
    const w = TAU*fr, eps = er*EPS0, mu = mr*MU0, lt = sig/(w*eps), r = Math.sqrt(1 + lt*lt), k = w*Math.sqrt(mu*eps/2);
    const alpha = k*lt/Math.sqrt(r + 1), beta = k*Math.sqrt(r + 1);          // √(r − 1) written as lt/√(r + 1) to stay accurate
    const etaMag = Math.sqrt(mu/eps)/Math.sqrt(r), thEta = 0.5*Math.atan(lt);
    return {sig, er, mr, fr, w, eps, mu, lt, alpha, beta, etaMag, thEta, eta0:Math.sqrt(mu/eps),
      delta: alpha > 0 ? 1/alpha : Infinity, lam: TAU/beta, vp: w/beta,
      kind: lt < 0.1 ? 'low-loss (good) dielectric' : lt > 10 ? 'good conductor' : 'in between: use the exact formulas'};
  }
  const span = m => clamp(isFinite(m.delta) ? 3*m.delta : Infinity, 1.2*m.lam, 4*m.lam);
  const fq = m => si(m.fr, 'Hz');
  const pe = v => 100*v < 0.01 ? '< 0.01%' : `${num(100*v, 2)}%`;

  // ---------- scene ----------
  function niceStep(x){ const e = Math.pow(10, Math.floor(Math.log10(x))), n = x/e; return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10)*e; }
  function scene(m, S){
    const ctx = G.ctx(), {W, H, vis, t} = S;
    const L = 58, R = W - 28, top = 104, yc = top + (H - top - 46)/2, amp = Math.min(130, (H - top - 70)/2);
    const zmax = m.zmax, X = z => L + (z/zmax)*(R - L);
    const env = z => Math.exp(-m.alpha*z);
    const ve = vis('env'), envNow = z => 1 - ve*(1 - env(z));
    const phase = t*TAU*0.32;
    // axis and distance ticks
    G.line(L, yc, R, yc, C.faint, 1);
    const st = niceStep(zmax/5);
    for (let z = 0; z <= zmax*1.0001; z += st){ const x = X(z); G.line(x, yc + amp + 10, x, yc + amp + 16, C.muted, 1); G.text(si(z, 'm', 3), x, yc + amp + 30, {align:'center', color:C.muted, size:11.5}); }
    G.text('z →  into the medium', R, yc + amp + 30, {align:'right', color:C.muted, size:11.5, a:.0});
    G.text('E', L - 16, yc - amp + 4, {color:C.white, size:13, weight:700, a:vis('wave')});
    // envelope
    if (ve > 0){
      const top1 = [], bot = [];
      for (let i = 0; i <= 240; i++){ const z = zmax*i/240; top1.push([X(z), yc - amp*envNow(z)]); bot.push([X(z), yc + amp*envNow(z)]); }
      G.fillPath(top1.concat(bot.slice().reverse()), 'rgba(255,79,163,.12)', {a:ve});
      G.path(top1, C.pink, 1.8, {glow:8, a:ve}); G.path(bot, C.pink, 1.8, {glow:8, a:ve});
      G.text(`e^(−αz), α = ${num(m.alpha, 3)} Np/m`, X(zmax*0.02) + 4, yc - amp - 10, {color:C.pink, size:12.5, a:ve, halo:true});
    }
    // carrier: E and (later) H
    const dense = zmax/m.lam > 14, vw = vis('wave');
    if (vw > 0 && !dense){
      const pts = [], hp = [], vh = vis('H');
      for (let i = 0; i <= 700; i++){ const z = zmax*i/700; pts.push([X(z), yc - amp*envNow(z)*Math.cos(phase - m.beta*z)]); hp.push([X(z), yc - amp*0.62*envNow(z)*Math.cos(phase - m.beta*z - m.thEta)]); }
      if (vh > 0){ G.path(hp, C.cyan, 1.8, {a:vh*0.9, dash:[6, 4]}); G.text(`H (lags E by θη = ${fix(m.thEta*180/PI, 1)}°)`, X(zmax*0.02) + 4, yc + amp + 52, {color:C.cyan, size:12.5, a:vh}); }
      G.path(pts, C.white, 2.4, {glow:12, a:vw});
    } else if (vw > 0) G.text('the wave is too dense to draw at this scale: envelope only', (L + R)/2, yc - 6, {align:'center', color:C.muted, size:12.5, a:vw});
    // one wavelength
    const vl = vis('lambda');
    if (vl > 0 && m.lam < zmax*0.95 && !dense){ const x0 = X(0.04*zmax), x1 = X(0.04*zmax + m.lam); G.bracket(x0, x1, yc - amp - 34, `λ = ${si(m.lam, 'm', 3)}`, C.amber, {a:vl}); }
    // skin depth
    const vd = vis('delta');
    if (vd > 0 && isFinite(m.delta) && m.delta <= zmax){
      const x = X(m.delta), y = yc - amp*Math.exp(-1);
      G.line(x, yc - amp - 4, x, yc + amp + 6, C.green, 1.4, {a:vd, dash:[5, 4]});
      G.line(L, y, x, y, C.green, 1.2, {a:vd, dash:[3, 4]});
      G.circle(x, y, 4.5, {fill:C.green, a:vd});
      G.text(`δ = ${si(m.delta, 'm', 3)}: field down to 1/e (36.8%)`, x + 8, y - 8, {color:C.green, size:12.5, a:vd, halo:true});
    } else if (vd > 0 && isFinite(m.delta)) G.text(`δ = ${si(m.delta, 'm', 3)} (beyond the edge of this view)`, R, yc - amp - 10, {align:'right', color:C.green, size:12.5, a:vd, halo:true});
    // a chosen distance
    const vz = vis('zmark');
    if (vz > 0 && m.zmark != null){
      const x = X(m.zmark), y = yc - amp*env(m.zmark);
      G.line(x, yc - amp - 4, x, yc + amp + 6, C.amber, 1.6, {a:vz, dash:[6, 4]});
      G.circle(x, y, 5, {fill:C.amber, a:vz});
      G.font(12.5); const wz = ctx.measureText(m.zLabel).width, leftOk = x - 8 - wz > 12;
      G.text(m.zLabel, leftOk ? x - 8 : x + 8, yc - amp + 14, {align: leftOk ? 'right' : 'left', color:C.amber, size:12.5, a:vz, halo:true});
    }
    // loss-tangent gauge
    const vg = vis('gauge');
    if (vg > 0){
      const gx0 = 24, gx1 = W - 170, gy = 46, lx = v => gx0 + ((clamp(Math.log10(v), -4, 4) + 4)/8)*(gx1 - gx0);
      G.roundRect(gx0, gy - 6, lx(0.1) - gx0, 12, 6, 'rgba(65,217,232,.55)', {a:vg});
      G.roundRect(lx(0.1), gy - 6, lx(10) - lx(0.1), 12, 0, 'rgba(155,123,255,.6)', {a:vg});
      G.roundRect(lx(10), gy - 6, gx1 - lx(10), 12, 6, 'rgba(255,184,77,.6)', {a:vg});
      [1e-4, 1e-2, 1, 1e2, 1e4].forEach(v => G.text(num(v, 1), lx(v), gy + 22, {align:'center', color:C.muted, size:10.5, a:vg}));
      const px = lx(m.lt);
      if (px > gx0 + 250) G.text('low-loss dielectric', gx0 + 4, gy - 12, {color:'#9fe9f2', size:11.5, a:vg});
      if (px < gx1 - 230) G.text('good conductor', gx1 - 4, gy - 12, {align:'right', color:'#ffd29a', size:11.5, a:vg}); ctx.save(); ctx.globalAlpha = vg; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(px, gy + 8); ctx.lineTo(px - 7, gy + 20); ctx.lineTo(px + 7, gy + 20); ctx.closePath(); ctx.fill(); ctx.restore();
      G.text(`σ/ωε = ${num(m.lt, 3)}`, px, gy - 12, {align:'center', color:'#fff', size:12.5, weight:700, a:vg, halo:true});
    }
    // phasors: E and H, with H lagging by θη
    const vp = vis('phasor');
    if (vp > 0){
      const cx = W - 78, cy = 58, r = 40, a0 = phase*0.5;
      G.circle(cx, cy, r, {stroke:'rgba(255,255,255,.22)', w:1, a:vp});
      G.arrow(cx, cy, cx + r*Math.cos(a0), cy - r*Math.sin(a0), C.white, 2, {a:vp});
      G.arrow(cx, cy, cx + .8*r*Math.cos(a0 - m.thEta), cy - .8*r*Math.sin(a0 - m.thEta), C.cyan, 2, {a:vp});
      G.text('E', cx + (r + 10)*Math.cos(a0), cy - (r + 10)*Math.sin(a0) + 4, {align:'center', size:12, weight:700, a:vp});
      G.text(`θη = ${fix(m.thEta*180/PI, 1)}°`, cx, cy + r + 18, {align:'center', color:C.cyan, size:12, a:vp});
    }
  }

  const GLYPH = {
    gen:'<path d="M3 16 C6 4, 9 4, 12 16 S 17 25, 20 16 S 25 11, 29 16"/><path d="M3 5 Q 16 9 29 13" stroke-dasharray="2.5 3"/>',
    cond:'<rect x="15" y="4" width="13" height="24" rx="2" fill="currentColor" opacity=".2" stroke="none"/><path d="M15 4 V28"/><path d="M3 16 C6 6, 9 6, 12 16 C13 20, 14 19, 15 16 C16 14, 17 15, 18 16"/>',
    low:'<path d="M3 16 C6 7, 9 7, 12 16 S 17 25, 20 16 S 25 8, 29 16"/><path d="M3 6 H29" stroke-dasharray="2.5 3"/>',
    att:'<path d="M3 9 Q 16 13 29 24"/><path d="M7 4 V28 M24 4 V28" stroke-dasharray="2 3"/><path d="M7 26 H24"/>'
  };
  const glyph = k => `<svg viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${GLYPH[k]}</svg>`;

  const intro = text => ({ dur:2600, show:['wave'], info: m => ({ title:'The set-up', body:text, work:`σ = ${num(m.sig)} S/m, ε<sub>r</sub> = ${num(m.er)}, μ<sub>r</sub> = ${num(m.mr)}, f = ${fq(m)}<br><span class="c">ε₀ = 8.854 × 10⁻¹² F/m, μ₀ = 4π × 10⁻⁷ H/m</span>` }) });
  const stConst = () => ({ dur:1800, show:[],
    info: m => ({ title:'ω, ε and μ', body:'<p>Turn the inputs into the three quantities every formula uses.</p>', work:`ω = 2πf = <b>${num(m.w)} rad/s</b><br>ε = ε<sub>r</sub>ε₀ = <b>${num(m.eps)} F/m</b><br>μ = μ<sub>r</sub>μ₀ = <b>${num(m.mu)} H/m</b>` }),
    rd: m => ['ω, ε, μ', `${num(m.w, 3)} rad/s`] });
  const stTangent = extra => ({ dur:2400, show:['gauge'],
    info: m => ({ title:'Loss tangent σ/ωε', body:`<p>The loss tangent compares conduction current with displacement current. Below about 0.1 the medium is a low-loss dielectric; above about 10 it is a good conductor.${extra ? ' ' + extra(m) : ''}</p>`, work:`σ/ωε = ${num(m.sig)}/(${num(m.w, 3)} × ${num(m.eps, 3)})<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;= <b>${num(m.lt)}</b><br>→ ${m.kind}` }),
    rd: m => ['Loss tangent σ/ωε', `${num(m.lt)} (${m.kind.split(':')[0]})`] });
  const answerStep = () => ({ dur:1600, show:[], info: m => ({ title:'Answer', body: cardsHTML(MODE_OF(m).answer(m)) + (MODE_OF(m).note ? `<p>${MODE_OF(m).note(m)}</p>` : ''), work:'' }) });
  const MODE_OF = m => MODES.find(x => x.id === m.id);

  const MODES = [
    // 1 ---------------------------------------------------------------- general lossy medium
    { id:'lossy', title:'Wave in a lossy medium', desc:'α, β, η, λ and skin depth, exact formulas', glyph:glyph('gen'),
      fields:['sig', 'er', 'mr', 'f'], defaults:{sig:'0.01', er:'10', mr:'1', f:'10', f_u:'MHz'},
      compute: v => {
        const m = medium(nonneg(v.sig, 'σ'), pos(v.er, 'ε_r'), pos(v.mr, 'μ_r'), pos(v.f, 'the frequency'));
        return Object.assign(m, {id:'lossy', zmax:span(m)});
      },
      problem: m => ({ chips:[`σ = ${num(m.sig)} S/m`, `ε<sub>r</sub> = ${num(m.er)}`, `μ<sub>r</sub> = ${num(m.mr)}`, `f = ${fq(m)}`] }),
      steps: () => [intro('<p>A plane wave travels into a medium that conducts a little (σ). The conduction current drains energy, so the wave <b>shrinks as it goes</b>, and E and H drift out of step. Everything follows from the propagation constant γ = α + jβ = √(jωμ(σ + jωε)).</p>'),
        stConst(), stTangent(),
        { dur:3000, show:['env'],
          info: m => ({ title:'Attenuation constant α', body:'<p>α sets how fast the amplitude dies away: every metre multiplies the field by e<sup>−α</sup>.</p>', work:`α = ω√(με/2) · √(√(1 + (σ/ωε)²) − 1)<br>&nbsp;&nbsp;= <b>${num(m.alpha)} Np/m</b><br>&nbsp;&nbsp;= ${num(m.alpha*NP2DB)} dB/m` }),
          rd: m => ['Attenuation constant α', `${num(m.alpha)} Np/m (${num(m.alpha*NP2DB, 3)} dB/m)`] },
        { dur:2800, show:['lambda'],
          info: m => ({ title:'Phase constant β, λ and v<sub>p</sub>', body:'<p>β sets the wavelength and the speed. Loss makes β bigger than ω√(με), so the wave is shorter and slower than in the same medium without loss.</p>', work:`β = ω√(με/2) · √(√(1 + (σ/ωε)²) + 1)<br>&nbsp;&nbsp;= <b>${num(m.beta)} rad/m</b><br>λ = 2π/β = <b>${si(m.lam, 'm')}</b><br>v<sub>p</sub> = ω/β = <b>${num(m.vp)} m/s</b>` }),
          rd: m => ['Phase constant β', `${num(m.beta)} rad/m`] },
        { dur:2800, show:['H', 'phasor'],
          info: m => ({ title:'Intrinsic impedance η', body:'<p>η is now complex: H lags E by the angle θ<sub>η</sub>, and |η| is smaller than √(μ/ε).</p>', work:`|η| = √(μ/ε) / (1 + (σ/ωε)²)<sup>1/4</sup> = <b>${num(m.etaMag)} Ω</b><br>θ<sub>η</sub> = ½ tan⁻¹(σ/ωε) = <b>${fix(m.thEta*180/PI, 2)}°</b><br>η = ${num(m.etaMag)} ∠${fix(m.thEta*180/PI, 2)}° Ω` }),
          rd: m => ['Intrinsic impedance η', `${num(m.etaMag)} ∠${fix(m.thEta*180/PI, 2)}° Ω`] },
        { dur:2200, show:['delta'],
          info: m => ({ title:'Skin depth δ', body:'<p>The skin depth is the distance over which the field falls to 1/e (36.8%) of its value.</p>', work:`δ = 1/α = <b>${si(m.delta, 'm')}</b>` }),
          rd: m => ['Skin depth δ = 1/α', si(m.delta, 'm')] },
        answerStep()],
      answer: m => [
        {tone:'y', k:'Propagation', v:`α = ${num(m.alpha, 3)} Np/m<br>β = ${num(m.beta, 3)} rad/m`, s:`λ = ${si(m.lam, 'm', 3)}, v<sub>p</sub> = ${num(m.vp, 3)} m/s`},
        {tone:'s1', k:'Impedance and depth', v:`η = ${num(m.etaMag, 3)} ∠${fix(m.thEta*180/PI, 1)}° Ω<br>δ = ${si(m.delta, 'm', 3)}`, s:`σ/ωε = ${num(m.lt, 3)}: ${m.kind}`}],
      scene },

    // 2 ---------------------------------------------------------------- good conductor
    { id:'conductor', title:'Good conductor', desc:'Skin depth, surface resistance, field through a sheet', glyph:glyph('cond'),
      fields:['sig', 'mr', 'f', 't'], defaults:{sig:'5.8e7', mr:'1', f:'1', f_u:'MHz', t:'0.1', t_u:'mm'},
      compute: v => {
        const sig = pos(v.sig, 'σ'), mr = pos(v.mr, 'μ_r'), fr = pos(v.f, 'the frequency'), th = nonneg(v.t, 'the thickness');
        const m = medium(sig, 1, mr, fr);
        const delta = 1/Math.sqrt(PI*fr*m.mu*sig), Rs = 1/(sig*delta), lam = TAU*delta;
        const ratio = Math.exp(-th/delta), dB = NP2DB*th/delta;
        Object.assign(m, {id:'conductor', dA:delta, Rs, lamA:lam, vpA:m.w*delta, etaA:Math.sqrt(2)*Rs, th, ratio, dB, exact:{alpha:m.alpha, beta:m.beta, etaMag:m.etaMag}});
        // draw with the good-conductor values
        m.alpha = 1/delta; m.beta = 1/delta; m.delta = delta; m.lam = lam; m.thEta = PI/4; m.etaMag = m.etaA;
        m.zmax = Math.max(1.2*lam, 1.2*th); m.zmark = th > 0 ? th : null;
        m.zLabel = `t = ${si(th, 'm', 3)}: field × ${num(ratio, 3)} (−${num(dB, 3)} dB)`;
        return m;
      },
      problem: m => ({ chips:[`σ = ${num(m.sig)} S/m`, `μ<sub>r</sub> = ${num(m.mr)}`, `f = ${fq(m)}`, `t = ${si(m.th, 'm', 3)}`] }),
      steps: () => [intro('<p>In a good conductor the conduction current swamps the displacement current. The wave dies within a few <b>skin depths</b>, and E and H are 45° apart.</p>'),
        stTangent(m => m.lt < 10 ? '<b>This is not ≫ 1, so the good-conductor shortcuts are rough here; use the lossy-medium question type instead.</b>' : 'ε<sub>r</sub> = 1 is assumed for the conductor; it barely matters.'),
        { dur:3000, show:['env', 'delta'],
          info: m => ({ title:'Skin depth δ', body:'<p>For a good conductor δ = 1/√(πfμσ). The field falls to 1/e every δ.</p>', work:`δ = 1/√(π × ${fq(m)} × ${num(m.mu, 3)} × ${num(m.sig)})<br>&nbsp;&nbsp;= <b>${si(m.dA, 'm')}</b>` }),
          rd: m => ['Skin depth δ', si(m.dA, 'm')] },
        { dur:2600, show:['lambda'],
          info: m => ({ title:'α = β = 1/δ', body:'<p>In a good conductor attenuation and phase constants are equal, so one wavelength is only 2πδ long and the wave is very slow.</p>', work:`α = β = 1/δ = <b>${num(1/m.dA)} m⁻¹</b><br>λ = 2πδ = <b>${si(m.lamA, 'm')}</b><br>v<sub>p</sub> = ωδ = <b>${num(m.vpA)} m/s</b>` }),
          rd: m => ['α = β = 1/δ', `${num(1/m.dA)} m⁻¹`] },
        { dur:2600, show:['H', 'phasor'],
          info: m => ({ title:'η and surface resistance', body:'<p>η = (1 + j)/(σδ): the magnitude is tiny and the angle is 45°. Its real part is the surface resistance R<sub>s</sub>, used for conductor losses.</p>', work:`R<sub>s</sub> = 1/(σδ) = <b>${num(m.Rs)} Ω</b><br>η = (1 + j)R<sub>s</sub> = <b>${num(m.etaA)} ∠45° Ω</b>` }),
          rd: m => ['Surface resistance R_s', `${num(m.Rs)} Ω`] },
        { dur:2600, show:['zmark'],
          info: m => ({ title:`Through a ${si(m.th, 'm', 3)} sheet`, body:'<p>The field left after a thickness t is e<sup>−t/δ</sup> of what went in.</p>', work:`t/δ = ${num(m.th/m.dA)}<br>field ratio = e<sup>−t/δ</sup> = <b>${num(m.ratio)}</b><br>loss = 8.686 × t/δ = <b>${num(m.dB)} dB</b>` }),
          rd: m => [`Field after t = ${si(m.th, 'm', 3)}`, `× ${num(m.ratio, 3)} (−${num(m.dB, 3)} dB)`] },
        answerStep()],
      answer: m => [
        {tone:'y', k:'Skin depth', v:`δ = ${si(m.dA, 'm', 3)}`, s:`α = β = ${num(1/m.dA, 3)} m⁻¹, λ = ${si(m.lamA, 'm', 3)}`},
        {tone:'s1', k:'Impedance and shielding', v:`R<sub>s</sub> = ${num(m.Rs, 3)} Ω<br>−${num(m.dB, 3)} dB`, s:`through ${si(m.th, 'm', 3)}: field × ${num(m.ratio, 3)}`}],
      note: m => `Check against the exact formulas: α differs by ${pe(Math.abs(m.exact.alpha*m.dA - 1))}, so the shortcuts are ${m.lt > 100 ? 'excellent' : m.lt > 10 ? 'fine' : 'rough'} here.`,
      scene },

    // 3 ---------------------------------------------------------------- low-loss dielectric
    { id:'low-loss', title:'Low-loss dielectric', desc:'The σ/ωε ≪ 1 shortcuts, checked against exact', glyph:glyph('low'),
      fields:['sig', 'er', 'mr', 'f'], defaults:{sig:'1e-4', er:'2.5', mr:'1', f:'100', f_u:'MHz'},
      compute: v => {
        const m = medium(nonneg(v.sig, 'σ'), pos(v.er, 'ε_r'), pos(v.mr, 'μ_r'), pos(v.f, 'the frequency'));
        const aA = (m.sig/2)*Math.sqrt(m.mu/m.eps), bA = m.w*Math.sqrt(m.mu*m.eps), etaRe = m.eta0, etaIm = m.eta0*m.lt/2;
        return Object.assign(m, {id:'low-loss', aA, bA, etaRe, etaIm, eA:Math.abs(aA/m.alpha - 1), eB:Math.abs(bA/m.beta - 1), zmax:span(m)});
      },
      problem: m => ({ chips:[`σ = ${num(m.sig)} S/m`, `ε<sub>r</sub> = ${num(m.er)}`, `μ<sub>r</sub> = ${num(m.mr)}`, `f = ${fq(m)}`] }),
      steps: () => [intro('<p>In a <b>low-loss dielectric</b> the conduction current is tiny compared with the displacement current. The wave travels almost as if there were no loss, decaying slowly over many wavelengths.</p>'),
        stConst(),
        stTangent(m => m.lt >= 0.1 ? '<b>This is not ≪ 1, so the shortcuts below will be off; the last step shows by how much.</b>' : ''),
        { dur:2600, show:['env'],
          info: m => ({ title:'α ≈ (σ/2)√(μ/ε)', body:'<p>The attenuation is small: proportional to σ and to the lossless wave impedance.</p>', work:`α ≈ (${num(m.sig)}/2) × √(μ/ε)<br>&nbsp;&nbsp;= (${num(m.sig)}/2) × ${num(m.eta0)}<br>&nbsp;&nbsp;= <b>${num(m.aA)} Np/m</b>` }),
          rd: m => ['α ≈ (σ/2)√(μ/ε)', `${num(m.aA)} Np/m`] },
        { dur:2400, show:['lambda'],
          info: m => ({ title:'β ≈ ω√(με)', body:'<p>The phase constant is the same as for the lossless medium.</p>', work:`β ≈ ω√(με) = <b>${num(m.bA)} rad/m</b><br>λ ≈ 2π/β = <b>${si(TAU/m.bA, 'm')}</b>` }),
          rd: m => ['β ≈ ω√(με)', `${num(m.bA)} rad/m`] },
        { dur:2400, show:['H', 'phasor'],
          info: m => ({ title:'η ≈ √(μ/ε)(1 + jσ/2ωε)', body:'<p>η is almost real; the small imaginary part makes H lag E by a fraction of a degree.</p>', work:`η ≈ ${num(m.eta0)} × (1 + j${num(m.lt/2, 3)})<br>&nbsp;&nbsp;= <b>${num(m.etaRe)} + j${num(m.etaIm, 3)} Ω</b>` }),
          rd: m => ['η ≈ √(μ/ε)(1 + jσ/2ωε)', `${num(m.etaRe)} + j${num(m.etaIm, 3)} Ω`] },
        { dur:2400, show:['delta'],
          info: m => ({ title:'How good are the shortcuts?', body:'<p>Compare with the exact formulas.</p>', work:`exact α = ${num(m.alpha)} Np/m (shortcut off by ${pe(m.eA)})<br>exact β = ${num(m.beta)} rad/m (off by ${pe(m.eB)})<br>δ = 1/α = <b>${si(m.delta, 'm')}</b>` }),
          rd: m => ['Error of the shortcuts', `α ${pe(m.eA)}, β ${pe(m.eB)}`] },
        answerStep()],
      answer: m => [
        {tone:'y', k:'Shortcut values', v:`α ≈ ${num(m.aA, 3)} Np/m<br>β ≈ ${num(m.bA, 3)} rad/m`, s:`η ≈ ${num(m.etaRe, 4)} + j${num(m.etaIm, 3)} Ω`},
        {tone:'s1', k:'Accuracy', v:`α off by ${pe(m.eA)}`, s:`σ/ωε = ${num(m.lt, 3)}; δ = ${si(m.delta, 'm', 3)}`}],
      scene },

    // 4 ---------------------------------------------------------------- attenuation over a distance
    { id:'attenuation', title:'Attenuation over a distance', desc:'Field left after z, or the distance for a given dB loss', glyph:glyph('att'),
      fields:['sig', 'er', 'mr', 'f', 'find', 'z', 'dB'], defaults:{sig:'4', er:'81', mr:'1', f:'100', f_u:'kHz', find:'field', z:'5', z_u:'m', dB:'60'},
      compute: v => {
        const m = medium(nonneg(v.sig, 'σ'), pos(v.er, 'ε_r'), pos(v.mr, 'μ_r'), pos(v.f, 'the frequency'));
        if (m.alpha <= 0) throw new Error('With σ = 0 the medium is lossless, so the wave never weakens.');
        let z, dB;
        if (v.find === 'field'){ z = nonneg(v.z, 'the distance'); dB = NP2DB*m.alpha*z; }
        else { dB = pos(v.dB, 'the loss'); z = dB/(NP2DB*m.alpha); }
        const ratio = Math.exp(-m.alpha*z);
        return Object.assign(m, {id:'attenuation', find:v.find, z, dB, ratio, zmark:z, zmax:Math.max(1.15*z, span(m)),
          zLabel:`z = ${si(z, 'm', 3)}: field × ${num(ratio, 3)} (−${num(dB, 3)} dB)`});
      },
      problem: m => ({ chips:[`σ = ${num(m.sig)} S/m`, `ε<sub>r</sub> = ${num(m.er)}`, `f = ${fq(m)}`, m.find === 'field' ? `z = ${si(m.z, 'm', 3)}` : `loss = ${num(m.dB)} dB`] }),
      steps: m => [intro('<p>How weak is the wave after travelling a distance z, or how far can it go before it has lost a given number of dB? Both come straight from α: the field falls as e<sup>−αz</sup>.</p>'),
        { dur:2800, show:['gauge', 'env'],
          info: m => ({ title:'Find α', body:`<p>Use the exact formula; the loss tangent is ${num(m.lt, 3)} (${m.kind}).</p>`, work:`ω = ${num(m.w, 3)} rad/s, σ/ωε = ${num(m.lt, 3)}<br>α = ω√(με/2) · √(√(1 + (σ/ωε)²) − 1)<br>&nbsp;&nbsp;= <b>${num(m.alpha)} Np/m</b> = ${num(m.alpha*NP2DB)} dB/m` }),
          rd: m => ['Attenuation constant α', `${num(m.alpha)} Np/m (${num(m.alpha*NP2DB, 3)} dB/m)`] },
        m.find === 'field'
          ? { dur:3000, show:['zmark'],
              info: m => ({ title:`Field after ${si(m.z, 'm', 3)}`, body:'<p>Multiply by e<sup>−αz</sup> for the field, e<sup>−2αz</sup> for the power.</p>', work:`αz = ${num(m.alpha*m.z)} Np<br>field ratio = e<sup>−αz</sup> = <b>${num(m.ratio)}</b><br>power ratio = e<sup>−2αz</sup> = ${num(m.ratio*m.ratio)}<br>loss = 8.686 αz = <b>${num(m.dB)} dB</b>` }),
              rd: m => [`Field after ${si(m.z, 'm', 3)}`, `× ${num(m.ratio, 3)} (−${num(m.dB, 3)} dB)`] }
          : { dur:3000, show:['zmark'],
              info: m => ({ title:`Distance for ${num(m.dB)} dB`, body:'<p>Loss in dB = 8.686 αz, so z = dB/(8.686 α).</p>', work:`z = ${num(m.dB)}/(8.686 × ${num(m.alpha, 3)})<br>&nbsp;&nbsp;= <b>${si(m.z, 'm')}</b><br>field ratio there = ${num(m.ratio)}` }),
              rd: m => [`Distance for ${num(m.dB)} dB`, si(m.z, 'm')] },
        { dur:2000, show:['delta'],
          info: m => ({ title:'In skin depths', body:'<p>Each skin depth costs 8.686 dB, so it is handy to count distance in δ.</p>', work:`δ = 1/α = ${si(m.delta, 'm')}<br>z/δ = <b>${num(m.z/m.delta)}</b>` }),
          rd: m => ['z in skin depths', `${num(m.z/m.delta, 3)} δ`] },
        answerStep()],
      answer: m => [
        m.find === 'field'
          ? {tone:'y', k:`After ${si(m.z, 'm', 3)}`, v:`field × ${num(m.ratio, 3)}`, s:`−${num(m.dB, 3)} dB; power × ${num(m.ratio*m.ratio, 3)}`}
          : {tone:'y', k:`Distance for ${num(m.dB)} dB`, v:`z = ${si(m.z, 'm', 3)}`, s:`field × ${num(m.ratio, 3)} there`},
        {tone:'s1', k:'Attenuation', v:`α = ${num(m.alpha, 3)} Np/m`, s:`${num(m.alpha*NP2DB, 3)} dB/m; δ = ${si(m.delta, 'm', 3)}`}],
      scene }
  ];

  const FIELDS = {
    sig:{label:'Conductivity σ (S/m)'}, er:{label:'ε<sub>r</sub>'}, mr:{label:'μ<sub>r</sub>'},
    f:{label:'Frequency f', units:[['Hz', 1], ['kHz', 1e3], ['MHz', 1e6], ['GHz', 1e9]]},
    t:{label:'Sheet thickness t', units:[['µm', 1e-6], ['mm', 1e-3], ['cm', 1e-2], ['m', 1]]},
    find:{label:'Find', type:'select', options:[['field', 'Field left after a distance'], ['distance', 'Distance for a given loss']]},
    z:{label:'Distance z', units:[['m', 1], ['cm', 1e-2], ['mm', 1e-3], ['km', 1e3]], showIf: v => v.find === 'field'},
    dB:{label:'Loss (dB)', showIf: v => v.find === 'distance'}
  };
  return {MODES, FIELDS};
};
