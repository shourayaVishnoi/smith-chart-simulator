// Plane waves at dielectric interfaces (normal incidence), solved on the Smith chart.
// Each medium behaves like a transmission line whose characteristic impedance is its wave impedance η.
window.SMITH_PAGE = (H) => {
  'use strict';
  const {COL, PI, TAU, ease, seg, mod, deg, polar, toG, fromG, ang, wtgA, cw, isNeg, f, fc, fz, fS,
    circlePts, rPts, xPts, stroke, text, dot, ring, pointLabel, radial, ringText, arcCW, arcCCW, movingDot, plotPoint,
    vswrCircle, faintRX, curveArrow} = H;

  const ETA0 = 120*PI;                       // free-space wave impedance, 120π ≈ 377 Ω
  const eta = er => ETA0/Math.sqrt(er);      // non-magnetic medium (μr = 1)
  const lamCm = (fGHz, er) => 30/(fGHz*Math.sqrt(er));   // wavelength in cm

  function needNum(v, what){ if (!isFinite(v)) throw new Error(`Enter a number for ${what}.`); return v; }
  function needEr(v, what){ needNum(v, what); if (v < 1) throw new Error(`${what} must be at least 1 (ε_r of a dielectric is 1 or more).`); return v; }
  function needF(v){ needNum(v, 'the frequency'); if (v <= 0) throw new Error('The frequency must be greater than 0.'); return v; }
  function model(z){
    const G = toG(z), mag = Math.hypot(G[0], G[1]), th = mag < 1e-12 ? 0 : ang(G);
    return {r:z[0], x:z[1], gu:G[0], gv:G[1], mag, th, s: mag < 1 - 1e-9 ? (1 + mag)/(1 - mag) : Infinity, w1:wtgA(th), dmax:cw(th, 0), dmin:cw(th, PI)};
  }
  const cardsHTML = cards => `<div class="answer">${cards.filter(Boolean).map(c => `<div class="ans ${c.tone || 'y'}"><div class="k">${c.k}</div><div class="v">${c.v}</div><div class="s">${c.s || ''}</div></div>`).join('')}</div>`;
  const pct = v => `${f(100*v, 1)}%`;
  const fG = (mag, th) => `${f(mag, 3)} ∠${f(deg(th), 1)}°`;
  const etaLine = (k, er) => `η<sub>${k}</sub> = 120π/√${f(er)} = <b>${f(eta(er), 2)} Ω</b>`;

  // ---------- shared steps ----------
  const stIntro = () => ({ dur:3600,
    info: () => ({ title:'Waves on the Smith chart',
      body:`<p>A plane wave hitting a boundary head-on behaves exactly like a signal on a transmission line. Each medium acts like a line whose characteristic impedance is its <b>wave impedance η</b>, and the next medium acts like the load.</p>
        <p>So you normalize to η of the medium the wave is in, and read Γ, SWR and distances off the chart as usual. The wavelength scale is in wavelengths <b>in that medium</b>. Media here are non-magnetic (μ<sub>r</sub> = 1), so η = 120π/√ε<sub>r</sub>.</p>`, work:'' }),
    draw: () => {} });
  const stAnswer = () => ({ dur:1600,
    info: m => ({ title:'Answer', body: cardsHTML(H.mode().answer(m)) + (H.mode().note ? `<p>${H.mode().note(m)}</p>` : ''), work:'' }),
    draw: (m, p) => { if (p >= 1 || !H.mode().keys) return; H.mode().keys(m).forEach(([u, v, c]) => ring(u, v, 7 + 20*p, c, 1 - p)); } });
  const stCircle = (title, body, rdLabel) => ({ dur:2600,
    info: m => ({ title, body, work: isFinite(m.s) ? `SWR = (1 + |Γ|)/(1 − |Γ|) = <b>${f(m.s, 3)}</b>` : 'SWR = ∞' }),
    draw: (m, p) => {
      vswrCircle(m.mag, m.th, seg(p, 0, .8)); dot(m.gu, m.gv, 6, COL.ink);
      const e = seg(p, .8, 1);
      if (e > 0 && isFinite(m.s) && m.mag > .02){ dot(m.mag, 0, 5*e, COL.green); text(m.mag + .02, -.075, `SWR ≈ ${f(m.s, 2)}`, {color:COL.green, size:13, op:e, anchor: m.mag > .75 ? 'end' : 'start'}); }
    },
    rd: m => [rdLabel, `SWR = ${fS(m.s)}`] });

  const GLYPH = {
    one:'<path d="M16 3 V29"/><path d="M16 3 H29 V29 H16" fill="currentColor" opacity=".18" stroke="none"/><path d="M3 12 H12 M9 9 L12 12 L9 15"/><path d="M12 20 H3 M6 17 L3 20 L6 23"/>',
    slab:'<path d="M12 3 V29 M20 3 V29"/><path d="M12 3 H20 V29 H12" fill="currentColor" opacity=".2" stroke="none"/><path d="M2 16 H9 M6.5 13.5 L9 16 L6.5 18.5"/><path d="M23 16 H30 M27.5 13.5 L30 16 L27.5 18.5"/>',
    coat:'<path d="M14 3 V29 M19 3 V29"/><path d="M19 3 H30 V29 H19" fill="currentColor" opacity=".18" stroke="none"/><path d="M14 3 H19 V29 H14" fill="currentColor" opacity=".38" stroke="none"/><path d="M2 16 H10 M7.5 13.5 L10 16 L7.5 18.5"/>',
    swr:'<path d="M20 3 V29"/><path d="M20 3 H30 V29 H20" fill="currentColor" opacity=".18" stroke="none"/><path d="M2 14 C5 6, 8 22, 11 14 S 17 6, 20 14"/><path d="M2 25 H18 M5 25 V22 M9 25 V23 M13 25 V22 M17 25 V23"/>'
  };
  const glyph = k => `<svg viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${GLYPH[k]}</svg>`;

  const MODES = [
    // 1 ---------------------------------------------------------------- single interface
    { id:'interface', title:'Single interface', desc:'Γ, τ, SWR and power split at one boundary', glyph:glyph('one'),
      fields:['er1', 'er2'], defaults:{er1:'1', er2:'4'},
      compute: v => {
        const er1 = needEr(v.er1, 'ε_r1'), er2 = needEr(v.er2, 'ε_r2');
        const e1 = eta(er1), e2 = eta(er2), m = model([e2/e1, 0]);
        const G = (e2 - e1)/(e2 + e1);
        return Object.assign(m, {er1, er2, e1, e2, G, tau:1 + G, Pr:G*G, Pt:1 - G*G});
      },
      problem: m => ({ chips:[`ε<sub>r1</sub> = ${f(m.er1)}`, `ε<sub>r2</sub> = ${f(m.er2)}`], find:'find Γ, τ and SWR' }),
      steps: () => [stIntro(),
        { dur:1800,
          info: m => ({ title:'Find the wave impedances', body:`<p>The wave comes from medium 1 and hits medium 2. Work out η for each.</p>`, work:`${etaLine(1, m.er1)}<br>${etaLine(2, m.er2)}` }),
          draw: (m, p) => { const e = ease(p); dot(0, 0, 5*e, COL.ink); text(0.03, -0.055, 'O (z = 1)', {size:12, op:e, anchor:'start'}); },
          rd: m => ['Wave impedances', `η₁ = ${f(m.e1, 1)} Ω, η₂ = ${f(m.e2, 1)} Ω`] },
        { dur:2400,
          info: m => ({ title:'Normalize to medium 1 and plot', body:`<p>Medium 2 is the "load" seen from medium 1: z = η<sub>2</sub>/η<sub>1</sub>. Both η are real, so the point sits on the horizontal axis. Label it <b>P</b>.</p>`, work:`z = ${f(m.e2, 2)}/${f(m.e1, 2)} = <b>${f(m.r)}</b>` }),
          draw: (m, p) => plotPoint(m.gu, m.gv, `P: z = ${f(m.r)}`, COL.ink, p, m.r, 0),
          rd: m => ['Normalize: z = η₂/η₁', `z = ${f(m.r)}`] },
        stCircle('Draw the SWR circle', `<p>Compass on O, open it to P. The circle is the standing-wave pattern in medium 1; where it cuts the right half of the axis you read the SWR.</p>`, 'SWR in medium 1'),
        { dur:2000,
          info: m => ({ title:'Read Γ', body:`<p>P is on the ${m.G < 0 ? '<b>left</b> half of the axis, so Γ is <b>negative</b> (angle 180°): the reflected E field is inverted' : m.G > 0 ? '<b>right</b> half of the axis, so Γ is <b>positive</b> (angle 0°)' : 'centre: no reflection'}. Its size is OP as a fraction of the chart radius.</p>`,
            work:`Γ = (η₂ − η₁)/(η₂ + η₁)<br>&nbsp;&nbsp;= (${f(m.e2, 2)} − ${f(m.e1, 2)})/(${f(m.e2, 2)} + ${f(m.e1, 2)})<br>&nbsp;&nbsp;= <b>${f(m.G, 4)}</b>` }),
          draw: (m, p) => { radial(m.th, ease(p), COL.purple); text(m.gu, m.gv + .1, `Γ = ${f(m.G, 3)}`, {color:COL.purple, size:13.5, op:seg(p, .5, 1)}); },
          rd: m => ['Read Γ (angle from the chart)', `Γ = ${f(m.G, 4)}`] },
        { dur:1800,
          info: m => ({ title:'Transmission and power', body:`<p>The transmitted field is τ = 1 + Γ times the incident field. The power splits as |Γ|² reflected and 1 − |Γ|² transmitted.</p>`,
            work:`τ = 1 + Γ = <b>${f(m.tau, 4)}</b><br>reflected power = Γ² = <b>${pct(m.Pr)}</b><br>transmitted power = 1 − Γ² = <b>${pct(m.Pt)}</b>` }),
          draw: () => {},
          rd: m => ['τ and power split', `τ = ${f(m.tau, 4)}, ${pct(m.Pr)} reflected`] },
        { dur:2800,
          info: m => ({ title:'Where the field peaks in medium 1', body: Math.abs(m.G) < 1e-9 ? `<p>No reflection, so there is no standing wave.</p>`
              : `<p>P itself is the boundary. Turning toward the source (clockwise) you meet the axis ${m.G < 0 ? 'right away on the left: the <b>E minimum is at the boundary</b>' : 'right away on the right: the <b>E maximum is at the boundary</b>'}. Half a turn later is the other one, λ₁/4 away.</p>`,
            work: Math.abs(m.G) < 1e-9 ? '' : `E<sub>${m.G < 0 ? 'min' : 'max'}</sub> at the boundary (0λ₁)<br>E<sub>${m.G < 0 ? 'max' : 'min'}</sub> at <b>0.25λ₁</b> from it` }),
          draw: (m, p) => { if (m.mag < 1e-9) return; const q = ease(p); arcCW(m.mag, m.th, PI, q, COL.purple, 2.6, {opacity:.6}); if (q > 0 && q < 1) movingDot(m.mag, m.th - PI*q, COL.purple); if (q >= 1){ const [u, v] = polar(m.mag, m.th - PI); dot(u, v, 6, COL.green); text(u + (u > 0 ? .02 : -.02), .085, `E ${m.G < 0 ? 'max' : 'min'} at λ₁/4`, {color:COL.purple, size:12.5, anchor: u > 0 ? 'start' : 'end'}); } },
          rd: m => ['E min / E max from the boundary', Math.abs(m.G) < 1e-9 ? 'none' : (m.G < 0 ? 'min at 0, max at 0.25λ₁' : 'max at 0, min at 0.25λ₁')] },
        stAnswer()],
      answer: m => [
        {tone:'y', k:'Reflection and transmission', v:`Γ = ${f(m.G, 3)}<br>τ = ${f(m.tau, 3)}`, s:`η₁ = ${f(m.e1, 1)} Ω, η₂ = ${f(m.e2, 1)} Ω`},
        {tone:'s1', k:'Standing wave and power', v:`SWR = ${fS(m.s)}`, s:`${pct(m.Pr)} of the power reflects, ${pct(m.Pt)} goes through`}],
      keys: m => [[m.gu, m.gv, COL.ink]] },

    // 2 ---------------------------------------------------------------- dielectric slab
    { id:'slab', title:'Dielectric slab', desc:'Γ and SWR in front of a slab between two media', glyph:glyph('slab'),
      fields:['er1', 'er2', 'er3', 't', 'fGHz'], defaults:{er1:'1', er2:'4', er3:'1', t:'1', t_u:'cm', fGHz:'3'},
      compute: v => {
        const er1 = needEr(v.er1, 'ε_r1'), er2 = needEr(v.er2, 'ε_r2 (slab)'), er3 = needEr(v.er3, 'ε_r3');
        needNum(v.t, 'the slab thickness'); if (v.t < 0) throw new Error("The slab thickness can't be negative.");
        let tl = v.t, conv = null;
        if (v.t_u === 'cm'){ const fg = needF(v.fGHz), l2 = lamCm(fg, er2); tl = v.t/l2; conv = `λ₂ = 30/(f√ε<sub>r2</sub>) = 30/(${f(fg)} × √${f(er2)}) = ${f(l2, 3)} cm<br>t = ${f(v.t)} cm ÷ ${f(l2, 3)} cm = ${f(tl)}λ₂`; }
        const e1 = eta(er1), e2 = eta(er2), e3 = eta(er3);
        const back = model([e3/e2, 0]);
        const sweep = 2*TAU*mod(tl, .5), thQ = back.th - sweep, GQ = polar(back.mag, thQ), zq = fromG(GQ);
        const ein = [e2*zq[0], e2*zq[1]], front = model([ein[0]/e1, ein[1]/e1]);
        return Object.assign(front, {er1, er2, er3, e1, e2, e3, tl, tText: v.t_u === 'cm' ? `${f(v.t)} cm` : `${f(tl)}λ₂`, conv, back, sweep, thQ, uq:GQ[0], vq:GQ[1], zq, ein, wQ:wtgA(thQ)});
      },
      problem: m => ({ chips:[`ε<sub>r1</sub> = ${f(m.er1)}`, `slab ε<sub>r2</sub> = ${f(m.er2)}, t = ${m.tText}`, `ε<sub>r3</sub> = ${f(m.er3)}`], find:'find Γ and SWR in medium 1' }),
      steps: () => [stIntro(),
        { dur:1800,
          info: m => ({ title:'Find the wave impedances', body:`<p>Medium 1 (where the wave comes from), the slab (medium 2) and medium 3 behind it.</p>`, work:`${etaLine(1, m.er1)}<br>${etaLine(2, m.er2)}<br>${etaLine(3, m.er3)}` }),
          draw: (m, p) => { const e = ease(p); dot(0, 0, 5*e, COL.ink); },
          rd: m => ['Wave impedances', `${f(m.e1, 1)}, ${f(m.e2, 1)}, ${f(m.e3, 1)} Ω`] },
        { dur:2400,
          info: m => ({ title:'Start at the back face', body:`<p>Inside the slab, medium 3 is the load. Normalize it to the <b>slab</b>: z = η<sub>3</sub>/η<sub>2</sub>. Label it <b>P</b>.</p>`, work:`z = ${f(m.e3, 2)}/${f(m.e2, 2)} = <b>${f(m.back.r)}</b>` }),
          draw: (m, p) => plotPoint(m.back.gu, m.back.gv, `P: z = ${f(m.back.r)}`, COL.ink, p, m.back.r, 0),
          rd: m => ['Back face, normalized to the slab', `z = ${f(m.back.r)}`] },
        { dur:2600,
          info: m => ({ title:'SWR circle inside the slab', body:`<p>Compass on O, open it to P. This circle is the standing wave <b>inside the slab</b>.</p>`, work: `|Γ| in the slab = <b>${f(m.back.mag)}</b>` }),
          draw: (m, p) => { vswrCircle(m.back.mag, m.back.th, p); dot(m.back.gu, m.back.gv, 6, COL.ink); },
          rd: m => ['SWR circle in the slab', `|Γ| = ${f(m.back.mag)}`] },
        { dur:3600,
          info: m => ({ title:`Cross the slab: ${m.tText}`, body:`<p>Moving toward the source turns the point <b>clockwise</b>. Use the slab's own wavelength λ₂ for the distance.</p>`,
            work:`${m.conv ? m.conv + '<br>' : ''}P at ${f(m.back.w1)}λ, + ${f(m.tl)}λ → Q at <b>${f(m.wQ)}λ</b>` }),
          draw: (m, p) => {
            const e0 = seg(p, 0, .15); radial(m.back.th, e0, COL.ink); if (e0 >= 1) ringText(m.back.th, `${f(m.back.w1)}λ`, COL.ink);
            const q = ease(seg(p, .15, .85)); arcCW(m.back.mag, m.back.th, m.sweep, q, COL.purple);
            if (q > 0 && q < 1) movingDot(m.back.mag, m.back.th - m.sweep*q, COL.purple);
            const e = seg(p, .85, 1); if (e > 0){ radial(m.thQ, e, COL.purple); ringText(m.thQ, `${f(m.wQ)}λ`, COL.purple, e); dot(m.uq, m.vq, 6.5, COL.purple); }
            dot(m.back.gu, m.back.gv, 6, COL.ink);
          },
          rd: m => [`Cross the slab (${m.tText})`, `${f(m.back.w1)}λ → ${f(m.wQ)}λ`] },
        { dur:2200,
          info: m => ({ title:'Read the front face', body:`<p>Q is the slab's input, still normalized to η<sub>2</sub>. Multiply by η<sub>2</sub> to get the wave impedance looking into the slab.</p>`, work:`z<sub>Q</sub> = ${fz(m.zq)}<br>η<sub>in</sub> = ${f(m.e2, 2)} × (${fz(m.zq)})<br>&nbsp;&nbsp;&nbsp;&nbsp;= <b>${fc(m.ein[0], m.ein[1], 2)} Ω</b>` }),
          draw: (m, p) => { faintRX(m.zq, p, COL.purple); dot(m.uq, m.vq, 6.5, COL.purple); pointLabel(m.uq, m.vq, `Q: z = ${fz(m.zq)}`, COL.purple, seg(p, .55, 1)); },
          rd: m => ['Front face (normalized to slab)', `z = ${fz(m.zq)}`] },
        { dur:2600,
          info: m => ({ title:'Renormalize to medium 1', body:`<p>Now switch to medium 1: divide η<sub>in</sub> by η<sub>1</sub> and plot it as a new point <b>R</b>. Its circle is the standing wave in medium 1.</p>`, work:`z<sub>1</sub> = η<sub>in</sub>/η<sub>1</sub> = <b>${fc(m.r, m.x)}</b>` }),
          draw: (m, p) => {
            const e = ease(seg(p, 0, .4)); dot(m.gu, m.gv, 6.5*e, COL.blue); pointLabel(m.gu, m.gv, `R: z₁ = ${fc(m.r, m.x)}`, COL.blue, seg(p, .2, .5), .08, m.gv > m.vq ? [0, 1] : [0, -1]);
            if (m.mag > 1e-6) stroke(circlePts(0, 0, m.mag, m.th, m.th - TAU, 300), ease(seg(p, .35, 1)), COL.blue, 2.4, {'stroke-dasharray':'7 5'});
          },
          rd: m => ['Renormalize to medium 1', `z₁ = ${fc(m.r, m.x)}`] },
        { dur:2000,
          info: m => ({ title:'Read Γ and SWR in medium 1', body:`<p>R's distance from O gives |Γ| in medium 1, and its angle gives the phase. The new circle cuts the right half of the axis at the SWR in medium 1.${Math.abs(mod(m.tl + 1e-9, .5)) < 2e-9 ? ' The slab is a whole number of half-wavelengths thick, so it is "invisible": medium 1 sees medium 3 directly.' : ''}</p>`,
            work:`Γ₁ = (z₁ − 1)/(z₁ + 1) = <b>${fG(m.mag, m.th)}</b><br>SWR₁ = <b>${fS(m.s)}</b><br>reflected power = |Γ₁|² = <b>${pct(m.mag*m.mag)}</b>` }),
          draw: (m, p) => { radial(m.th, ease(p), COL.blue); const e = seg(p, .5, 1); if (e > 0 && isFinite(m.s) && m.mag > .02){ dot(m.mag, 0, 5.5, COL.blue); text(m.mag + .02, .085, `SWR₁ ≈ ${f(m.s, 2)}`, {color:COL.blue, size:13, op:e, anchor: m.mag > .75 ? 'end' : 'start'}); } },
          rd: m => ['Γ and SWR in medium 1', `${fG(m.mag, m.th)}, SWR ${fS(m.s)}`] },
        stAnswer()],
      answer: m => [
        {tone:'y', k:'Reflection in medium 1', v:`Γ₁ = ${fG(m.mag, m.th)}`, s:`η<sub>in</sub> = ${fc(m.ein[0], m.ein[1], 1)} Ω`},
        {tone:'s1', k:'Standing wave and power', v:`SWR₁ = ${fS(m.s)}`, s:`${pct(m.mag*m.mag)} of the power reflects`}],
      keys: m => [[m.gu, m.gv, COL.blue]] },

    // 3 ---------------------------------------------------------------- quarter-wave coating
    { id:'coating', title:'Quarter-wave coating', desc:'Coating ε<sub>r</sub> and thickness for zero reflection', glyph:glyph('coat'),
      fields:['er1', 'er3', 'fGHz'], defaults:{er1:'1', er3:'9', fGHz:'10'},
      compute: v => {
        const er1 = needEr(v.er1, 'ε_r1'), er3 = needEr(v.er3, 'ε_r3'), fg = needF(v.fGHz);
        if (Math.abs(er1 - er3) < 1e-12) throw new Error('The two media are the same, so there is no reflection to cancel.');
        const e1 = eta(er1), e3 = eta(er3), e2 = Math.sqrt(e1*e3), er2 = Math.sqrt(er1*er3), l2 = lamCm(fg, er2), t = l2/4;
        const bare = (e3 - e1)/(e3 + e1), back = model([e3/e2, 0]), thQ = back.th - PI, GQ = polar(back.mag, thQ), zq = fromG(GQ);
        const uncoated = model([e3/e1, 0]);
        return Object.assign(model([e2*zq[0]/e1, e2*zq[1]/e1]), {er1, er3, fg, e1, e2, e3, er2, l2, t, bare, back, thQ, uq:GQ[0], vq:GQ[1], zq, uncoated});
      },
      problem: m => ({ chips:[`ε<sub>r1</sub> = ${f(m.er1)}`, `ε<sub>r3</sub> = ${f(m.er3)}`, `f = ${f(m.fg)} GHz`], find:'find the coating ε<sub>r</sub> and thickness' }),
      steps: () => [stIntro(),
        { dur:2400,
          info: m => ({ title:'Without a coating', body:`<p>First see the problem: plot z = η<sub>3</sub>/η<sub>1</sub>. Its distance from O is the reflection you want to get rid of.</p>`, work:`${etaLine(1, m.er1)}<br>${etaLine(3, m.er3)}<br>Γ (bare) = <b>${f(m.bare, 4)}</b>, ${pct(m.bare*m.bare)} of the power reflects` }),
          draw: (m, p) => { const e = ease(p); dot(m.uncoated.gu, 0, 6*e, COL.red); text(m.uncoated.gu, -.09, `bare: z = ${f(m.uncoated.r)}`, {color:COL.red, size:12.5, op:e}); },
          rd: m => ['Bare surface', `Γ = ${f(m.bare, 4)}`] },
        { dur:1800,
          info: m => ({ title:'Choose the coating', body:`<p>A λ/4 layer turns its load η<sub>3</sub> into η<sub>2</sub>²/η<sub>3</sub>. For no reflection that must equal η<sub>1</sub>, so η<sub>2</sub> = √(η<sub>1</sub>η<sub>3</sub>), which means ε<sub>r2</sub> = √(ε<sub>r1</sub>ε<sub>r3</sub>).</p>`,
            work:`η<sub>2</sub> = √(${f(m.e1, 2)} × ${f(m.e3, 2)}) = <b>${f(m.e2, 2)} Ω</b><br>ε<sub>r2</sub> = √(${f(m.er1)} × ${f(m.er3)}) = <b>${f(m.er2, 3)}</b>` }),
          draw: () => {},
          rd: m => ['Coating', `ε_r2 = ${f(m.er2, 3)}, η₂ = ${f(m.e2, 2)} Ω`] },
        { dur:2400,
          info: m => ({ title:'Normalize the back medium to the coating', body:`<p>Inside the coating, medium 3 is the load: z = η<sub>3</sub>/η<sub>2</sub>. Plot it as <b>P</b> and draw its SWR circle.</p>`, work:`z = ${f(m.e3, 2)}/${f(m.e2, 2)} = <b>${f(m.back.r)}</b>` }),
          draw: (m, p) => { const e = seg(p, 0, .6); dot(m.back.gu, m.back.gv, 6*ease(e), COL.ink); pointLabel(m.back.gu, m.back.gv, `P: z = ${f(m.back.r)}`, COL.ink, e, .1, [0, 1]); vswrCircle(m.back.mag, m.back.th, seg(p, .45, 1)); },
          rd: m => ['Back face, normalized to the coating', `z = ${f(m.back.r)}`] },
        { dur:3200,
          info: m => ({ title:'A quarter-wave through the coating', body:`<p>λ/4 is half a turn (180°). P lands on the opposite side at <b>Q</b>: z = η<sub>2</sub>/η<sub>3</sub>.</p>`, work:`z<sub>Q</sub> = 1/${f(m.back.r)} = <b>${f(m.zq[0])}</b>` }),
          draw: (m, p) => {
            const q = ease(seg(p, 0, .85)); arcCW(m.back.mag, m.back.th, PI, q, COL.purple);
            if (q > 0 && q < 1) movingDot(m.back.mag, m.back.th - PI*q, COL.purple);
            if (q >= 1){ dot(m.uq, m.vq, 6.5, COL.purple); pointLabel(m.uq, m.vq, `Q: z = ${f(m.zq[0])}`, COL.purple, seg(p, .85, 1), .08, [0, m.uq < 0 ? 1 : -1]); }
            dot(m.back.gu, m.back.gv, 6, COL.ink);
          },
          rd: m => ['Quarter-wave through the coating', `z = ${f(m.zq[0])}`] },
        { dur:2600,
          info: m => ({ title:'Renormalize to medium 1', body:`<p>η<sub>in</sub> = η<sub>2</sub> × z<sub>Q</sub> = η<sub>2</sub>²/η<sub>3</sub> = η<sub>1</sub>. Normalized to medium 1 that is z = 1: the <b>centre</b>. No reflection.</p>`, work:`η<sub>in</sub> = ${f(m.e2, 2)} × ${f(m.zq[0])} = <b>${f(m.e2*m.zq[0], 2)} Ω</b> = η<sub>1</sub><br>Γ₁ = <b>${f(m.mag, 4)}</b>` }),
          draw: (m, p) => { curveArrow([m.uq, m.vq], [0, 0], .35, ease(seg(p, 0, .7)), COL.match); const e = seg(p, .6, 1); if (e > 0){ dot(0, 0, 6.5, COL.match); text(.06, .2, 'matched: Γ = 0', {color:COL.match, size:13, op:e, anchor:'start'}); } },
          rd: m => ['Front face in medium 1', `Γ = ${f(m.mag, 4)}`] },
        { dur:1800,
          info: m => ({ title:'Thickness', body:`<p>The layer must be a quarter of the wavelength <b>inside the coating</b>.</p>`, work:`λ₂ = 30/(f√ε<sub>r2</sub>) = 30/(${f(m.fg)} × √${f(m.er2, 3)}) = ${f(m.l2, 4)} cm<br>t = λ₂/4 = <b>${f(m.t*10, 3)} mm</b>` }),
          draw: () => {},
          rd: m => ['Thickness = λ₂/4', `${f(m.t*10, 3)} mm`] },
        stAnswer()],
      answer: m => [
        {tone:'y', k:'Coating', v:`ε<sub>r2</sub> = ${f(m.er2, 3)}<br>t = ${f(m.t*10, 3)} mm`, s:`η₂ = ${f(m.e2, 1)} Ω, λ₂/4 at ${f(m.fg)} GHz`},
        {tone:'s1', k:'Reflection', v:`Γ = 0 (was ${f(m.bare, 3)})`, s:`reflected power ${pct(m.bare*m.bare)} → 0% at ${f(m.fg)} GHz`}],
      note: () => 'The coating is exact only at the design frequency; away from it a little reflection comes back.',
      keys: () => [[0, 0, COL.match]] },

    // 4 ---------------------------------------------------------------- unknown medium from SWR
    { id:'from-swr', title:'Medium from SWR', desc:'η and ε<sub>r</sub> of medium 2 from a measured standing wave', glyph:glyph('swr'),
      fields:['er1', 'S', 'dmin', 'fGHz'], defaults:{er1:'1', S:'2', dmin:'0', dmin_u:'lam', fGHz:'3'},
      compute: v => {
        const er1 = needEr(v.er1, 'ε_r1'); needNum(v.S, 'the SWR');
        if (v.S <= 1) throw new Error('The SWR must be greater than 1 (SWR = 1 means the media match).');
        needNum(v.dmin, 'the E min distance'); if (v.dmin < 0) throw new Error("The E min distance can't be negative.");
        let dm = v.dmin, conv = null;
        if (v.dmin_u === 'cm'){ const fg = needF(v.fGHz), l1 = lamCm(fg, er1); dm = v.dmin/l1; conv = `λ₁ = 30/(${f(fg)} × √${f(er1)}) = ${f(l1, 3)} cm<br>d = ${f(v.dmin)} cm ÷ ${f(l1, 3)} cm = ${f(dm)}λ₁`; }
        const magS = (v.S - 1)/(v.S + 1), thL = ang(polar(1, PI + 2*TAU*mod(dm, .5)));
        const z = fromG(polar(magS, thL)), e1 = eta(er1), e2 = [e1*z[0], e1*z[1]];
        const real = Math.abs(z[1]) < 1e-6*Math.max(1, z[0]);
        return Object.assign(model(z), {er1, S:v.S, dm, conv, magS, e1, e2, real, er2: real ? Math.pow(ETA0/e2[0], 2) : NaN, wl:mod(dm, .5), dText: v.dmin_u === 'cm' ? `${f(v.dmin)} cm` : `${f(dm)}λ₁`});
      },
      problem: m => ({ chips:[`ε<sub>r1</sub> = ${f(m.er1)}`, `SWR = ${f(m.S)}`, `E<sub>min</sub> at ${m.dText}`], find:'find η₂ and ε<sub>r2</sub>' }),
      steps: () => [stIntro(),
        { dur:2400,
          info: m => ({ title:`Mark SWR = ${f(m.S)} on the right axis`, body:`<p>The SWR circle in medium 1 passes through r = SWR on the right half of the axis.</p>`, work:`|Γ| = (SWR − 1)/(SWR + 1) = <b>${f(m.magS)}</b><br>${etaLine(1, m.er1)}` }),
          draw: (m, p) => { dot(m.magS, 0, 6*ease(seg(p, .2, .7)), COL.green); text(m.magS + .02, -.075, `r = SWR = ${f(m.S)}`, {color:COL.green, size:13, op:seg(p, .5, 1), anchor: m.magS > .75 ? 'end' : 'start'}); },
          rd: m => ['Mark the SWR', `|Γ| = ${f(m.magS)}`] },
        { dur:2400,
          info: () => ({ title:'Draw the SWR circle', body:`<p>Compass on O, open it to that point. The boundary is somewhere on this circle; the E<sub>min</sub> position tells you where.</p>`, work:'' }),
          draw: (m, p) => { stroke(circlePts(0, 0, m.magS, 0, -TAU, 360), ease(p), COL.green, 2.8); dot(0, 0, 4.5, COL.ink); dot(m.magS, 0, 6, COL.green); } },
        { dur:2000,
          info: m => ({ title:'Mark the E minimum', body:`<p>The field minimum is where the wave impedance is smallest: the <b>left</b> crossing, r = 1/SWR = ${f(1/m.S)}. Both wavelength scales read 0 there.</p>`, work:'' }),
          draw: (m, p) => { const e = ease(p); dot(-m.magS, 0, 6*e, COL.green); text(-m.magS, -.075, 'E min', {color:COL.green, size:13, op:e}); radial(PI, e, COL.ink); },
          rd: m => ['E min on the left axis', `r = ${f(1/m.S)}`] },
        { dur:3200,
          info: m => ({ title:`Move ${m.dText} toward the boundary`, body:`<p>The boundary is ${m.dText} from the minimum, on the "load" side. Turn <b>anticlockwise</b> by ${f(m.dm)}λ₁.${m.dm === 0 ? ' Here the minimum is right at the boundary, so you stay put.' : ''}</p>`, work:`${m.conv ? m.conv + '<br>' : ''}WTL reading = <b>${f(m.wl)}λ</b>` }),
          draw: (m, p) => { const sw = 2*TAU*m.wl, q = ease(seg(p, 0, .85)); arcCCW(m.magS, PI, sw, q, COL.purple); if (q > 0 && q < 1) movingDot(m.magS, PI + sw*q, COL.purple); const e = seg(p, .85, 1); if (e > 0){ radial(m.th, e, COL.purple); dot(m.gu, m.gv, 6.5, COL.ink); } },
          rd: m => [`Move ${m.dText} toward the boundary`, `WTL ${f(m.wl)}λ`] },
        { dur:2200,
          info: m => ({ title:'Read z at the boundary', body:`<p>The point P is medium 2 seen from medium 1, normalized to η<sub>1</sub>.</p>`, work:`z = <b>${fc(m.r, m.x)}</b>` }),
          draw: (m, p) => { faintRX([m.r, m.x], p, COL.ink); dot(m.gu, m.gv, 6.5, COL.ink); pointLabel(m.gu, m.gv, `P: z = ${fc(m.r, m.x)}`, COL.ink, seg(p, .5, 1), .1, Math.abs(m.gv) < .05 ? [0, 1] : undefined); },
          rd: m => ['Read z at the boundary', `z = ${fc(m.r, m.x)}`] },
        { dur:2000,
          info: m => ({ title:'Find η₂ and ε<sub>r2</sub>', body: m.real ? `<p>Multiply by η<sub>1</sub>. η<sub>2</sub> is real, so medium 2 is a lossless dielectric: ε<sub>r2</sub> = (120π/η<sub>2</sub>)².</p>`
              : `<p>Multiply by η<sub>1</sub>. η<sub>2</sub> comes out <b>complex</b>, so medium 2 cannot be a plain lossless dielectric. It is lossy (or magnetic). For a lossless dielectric the minimum sits either at the boundary or λ₁/4 from it.</p>`,
            work:`η<sub>2</sub> = ${f(m.e1, 2)} × (${fc(m.r, m.x)})<br>&nbsp;&nbsp;&nbsp;&nbsp;= <b>${fc(m.e2[0], m.e2[1], 2)} Ω</b>${m.real ? `<br>ε<sub>r2</sub> = (${f(ETA0, 2)}/${f(m.e2[0], 2)})² = <b>${f(m.er2, 3)}</b>` : ''}${m.real && m.er2 < 1 ? '<br><span class="c">ε<sub>r2</sub> below 1 is not an ordinary dielectric: check ε<sub>r1</sub> and the measured values.</span>' : ''}` }),
          draw: (m) => { dot(m.gu, m.gv, 6.5, COL.ink); },
          rd: m => ['η₂ and ε_r2', m.real ? `η₂ = ${f(m.e2[0], 2)} Ω, ε_r2 = ${f(m.er2, 3)}` : `η₂ = ${fc(m.e2[0], m.e2[1], 2)} Ω (lossy)`] },
        stAnswer()],
      answer: m => [
        {tone:'y', k:'Wave impedance of medium 2', v:`η₂ = ${fc(m.e2[0], m.e2[1], 1)} Ω`, s:`z = ${fc(m.r, m.x)} (normalized to medium 1)`},
        {tone:'s1', k:'Permittivity', v: m.real ? `ε<sub>r2</sub> = ${f(m.er2, 3)}` : 'lossy medium', s: !m.real ? 'η₂ is complex' : m.er2 < 1 ? 'below 1: not an ordinary dielectric, check the data' : 'non-magnetic, lossless'}],
      keys: m => [[m.gu, m.gv, COL.ink]] }
  ];

  const FIELDS = {
    er1:{label:'ε<sub>r1</sub> (wave comes from here)'}, er2:{label:'ε<sub>r2</sub>'}, er3:{label:'ε<sub>r3</sub> (behind)'},
    t:{label:'Slab thickness (λ = in the slab)', type:'len'},
    S:{label:'Measured SWR in medium 1'},
    dmin:{label:'First E<sub>min</sub> from the boundary', type:'len'},
    fGHz:{label:'Frequency f (GHz)', showIf: (v, md) => md.id === 'coating' || md.fields.some(k => FIELDS[k].type === 'len' && v[k + '_u'] === 'cm')}
  };
  MODES.forEach(md => { md.vals = Object.assign({}, md.defaults); });

  // ---------- what the answer looks like in the media (distances in λ of medium 1) ----------
  function waveSpec(m, id){
    const S = {segs:[], marks:[], spans:[], end:'', cap:'', dir:'← toward the source (medium 1)'};
    if (id === 'interface'){
      const k2 = Math.sqrt(m.er2/m.er1);
      S.segs = [{d:0, G:[m.G, 0], k:1}]; S.tail = {len:.6, k:k2};
      S.spans = [{a:-.6, b:0, t:`medium 2 (εr = ${f(m.er2)})`}];
      S.marks = [{d:0, t:'boundary'}].concat(Math.abs(m.G) > 1e-9 ? [{d:.25, t: m.G < 0 ? 'E max' : 'E min'}] : []);
      S.cap = `A standing wave forms in medium 1 (SWR <b>${fS(m.s)}</b>), and a plain travelling wave carries <b>${pct(m.Pt)}</b> of the power into medium 2, where the wavelength is shorter by √${f(m.er2/m.er1, 3)}.`;
    } else if (id === 'slab'){
      const k2 = Math.sqrt(m.er2/m.er1), t1 = m.tl/k2;
      S.segs = [{d:0, G:polar(m.back.mag, m.back.th), k:k2}, {d:t1, G:[m.gu, m.gv], k:1}];
      S.tail = {len:.5, k:Math.sqrt(m.er3/m.er1)};
      S.spans = [{a:0, b:t1, t:'slab'}, {a:-.5, b:0, t:`medium 3 (εr = ${f(m.er3)})`}];
      S.marks = [{d:t1, t:'front face'}];
      S.cap = `In medium 1 the wave has SWR <b>${fS(m.s)}</b> and |Γ| = <b>${f(m.mag, 3)}</b>, so <b>${pct(m.mag*m.mag)}</b> of the power reflects. Inside the slab the wavelength is ${f(1/k2, 3)} times as long as in medium 1.`;
    } else if (id === 'coating'){
      const k2 = Math.sqrt(m.er2/m.er1), t1 = .25/k2;
      S.segs = [{d:0, G:[(m.e3 - m.e2)/(m.e3 + m.e2), 0], k:k2}, {d:t1, G:[0, 0], k:1}];
      S.tail = {len:.5, k:Math.sqrt(m.er3/m.er1)};
      S.spans = [{a:0, b:t1, t:'λ/4 coating'}, {a:-.5, b:0, t:`medium 3 (εr = ${f(m.er3)})`}];
      S.marks = [{d:t1, t:`t = ${f(m.t*10, 2)} mm`}];
      S.cap = `With the ε<sub>r</sub> = ${f(m.er2, 2)} coating, medium 1 sees no reflection: its envelope is flat (SWR 1). The standing wave is trapped inside the coating, and all the power goes on into medium 3.`;
    } else if (id === 'from-swr'){
      S.segs = [{d:0, G:[m.gu, m.gv], k:1}];
      if (m.real){ S.tail = {len:.6, k:Math.sqrt(m.er2/m.er1)}; S.spans = [{a:-.6, b:0, t:`medium 2 (εr = ${f(m.er2, 2)})`}]; }
      S.marks = [{d:0, t:'boundary'}].concat(m.dm > 0 ? [{d:m.dm, t:`E min (measured) ${m.dText}`}] : [{d:.25, t:'E max'}]);
      S.cap = m.real ? `The measured pattern (SWR <b>${f(m.S)}</b>, E<sub>min</sub> ${m.dText} from the boundary) fits a lossless medium with <b>ε<sub>r2</sub> = ${f(m.er2, 3)}</b>.` : `The measured pattern needs a complex η₂ = ${fc(m.e2[0], m.e2[1], 1)} Ω, so medium 2 is lossy.`;
    }
    return S;
  }
  return {MODES, FIELDS, waveSpec};
};
