// Lossless transmission lines: question types for the Smith chart engine.
window.SMITH_PAGE = (H) => {
  'use strict';
  const {COL, PI, TAU, ease, seg, mod, deg, polar, rot, cdiv, toG, gam, fromG, ang, wtgA, cw, stubLen, isNeg, f, fc, fz, fj, fS,
    circlePts, rPts, xPts, stroke, text, dot, ring, pointLabel, radial, ringText, arcCW, arcCCW, rimArc, movingDot, plotPoint,
    vswrCircle, faintRX, curveArrow, gPath, circleIntersect} = H;
  // ---------- input helpers ----------
  function needNum(v, what){ if (!isFinite(v)) throw new Error(`Enter a number for ${what}.`); return v; }
  function loadModel(v, opts = {}){
    needNum(v.Z0, 'Z₀'); needNum(v.RL, 'R_L'); needNum(v.XL, 'X_L');
    if (v.Z0 <= 0) throw new Error('Z₀ must be greater than 0.');
    if (v.RL < 0) throw new Error('R_L must be 0 or more for a passive load.');
    if (opts.needY && v.RL === 0 && v.XL === 0) throw new Error('A short-circuit load has infinite admittance. Try another load.');
    return modelFromZ(v.Z0, [v.RL/v.Z0, v.XL/v.Z0]);
  }
  function modelFromZ(Z0, z){
    const G = toG(z), mag = Math.hypot(G[0], G[1]), th = mag < 1e-12 ? 0 : ang(G);
    const s = mag < 1 - 1e-9 ? (1 + mag)/(1 - mag) : Infinity;
    const zz = z[0]*z[0] + z[1]*z[1];
    return {Z0, RL:z[0]*Z0, XL:z[1]*Z0, r:z[0], x:z[1], gu:G[0], gv:G[1], mag, th, s,
      g: zz > 0 ? z[0]/zz : Infinity, b: zz > 0 ? -z[1]/zz : 0, yu:-G[0], yv:-G[1],
      w1:wtgA(th), dmax:cw(th, 0), dmin:cw(th, PI)};
  }
  function lenIn(v, key, what){
    const val = v[key], unit = v[key + '_u'] || 'lam';
    needNum(val, what);
    if (val < 0) throw new Error(`The ${what} can't be negative.`);
    if (unit === 'cm'){
      if (!(v.lam > 0)) throw new Error('Enter the wavelength λ in cm, so lengths in cm can be converted to λ.');
      return {lam:val/v.lam, text:`${f(val)} cm`, conv:`${f(val)} cm ÷ ${f(v.lam)} cm = ${f(val/v.lam)}λ`};
    }
    return {lam:val, text:`${f(val)}λ`, conv:null};
  }
  function noMatchErr(m){
    if (m.mag < 1e-9) throw new Error('This load is already matched (Z_L = Z₀), so there is nothing to solve.');
    if (m.mag > 1 - 1e-9) throw new Error('A purely reactive load (R_L = 0) has |Γ| = 1 and cannot be matched with lossless elements.');
  }
  const chipZ0 = m => `Z<sub>0</sub> = ${f(m.Z0)} Ω`;
  const chipZL = m => `Z<sub>L</sub> = ${fc(m.RL, m.XL, 2)} Ω`;
  const cardsHTML = cards => `<div class="answer">${cards.filter(Boolean).map(c => `<div class="ans ${c.tone || 'y'}"><div class="k">${c.k}</div><div class="v">${c.v}</div><div class="s">${c.s || ''}</div></div>`).join('')}</div>`;

  // ---------- shared steps ----------
  const stIntro = () => ({ dur:3600,
    info: () => ({ title:'Meet the Smith chart',
      body:`<p>Every point inside the big circle is a normalized impedance <b>z = r + jx</b>.</p>
        <p>The <b>full circles</b> are constant-<i>r</i> circles. They all touch the right edge, where r = ∞. The <b>arcs</b> are constant-<i>x</i> arcs: the upper half is +x (inductive) and the lower half is −x (capacitive).</p>
        <p>The horizontal line is pure resistance. The centre is z = 1, a perfect match. The outer ring is the wavelength scale, read toward the generator.</p>`, work:'' }),
    draw: () => {} });
  const stNormalize = () => ({ dur:1600,
    info: m => ({ title:'Normalize the load',
      body:`<p>The chart only works with normalized values, so divide the load by Z<sub>0</sub> first. The centre O (z = 1 + j0) is your reference point.</p>`,
      work:`z<sub>L</sub> = Z<sub>L</sub> / Z<sub>0</sub><br>&nbsp;&nbsp;&nbsp;= (${fc(m.RL, m.XL)}) / ${f(m.Z0)}<br>&nbsp;&nbsp;&nbsp;= <b>${fc(m.r, m.x)}</b><br><span class="c">So r = ${f(m.r)} and x = ${f(m.x)}.</span>` }),
    draw: (m, p) => { const e = ease(p); dot(0, 0, 5*e, COL.ink); text(0.03, -0.055, 'O (z = 1)', {size:12, op:e, anchor:'start'}); },
    rd: m => ['Normalize the load', `z<sub>L</sub> = ${fc(m.r, m.x)}`] });
  const stPlot = () => ({ dur:2600,
    info: m => ({ title:'Plot z<sub>L</sub>',
      body:`<p>Find the <b>r = ${f(m.r)}</b> circle and the <b>x = ${f(m.x)}</b> arc (${m.x < 0 ? 'lower half, capacitive' : m.x > 0 ? 'upper half, inductive' : 'on the horizontal axis'}). Where they cross is z<sub>L</sub>. Label it <b>P</b>.</p>`,
      work:`Γ<sub>L</sub> = (z<sub>L</sub> − 1)/(z<sub>L</sub> + 1) = ${fc(m.gu, m.gv)}<br>|Γ<sub>L</sub>| = <b>${f(m.mag)}</b>&nbsp;&nbsp;∠Γ<sub>L</sub> = ${f(deg(m.th), 1)}°` }),
    draw: (m, p) => plotPoint(m.gu, m.gv, `P: z = ${fc(m.r, m.x)}`, COL.ink, p, m.r, m.x),
    rd: m => [`Plot P where r = ${f(m.r)} meets x = ${f(m.x)}`, `|Γ<sub>L</sub>| = ${f(m.mag)}, ∠Γ<sub>L</sub> = ${f(deg(m.th), 1)}°`] });
  const stVswr = () => ({ dur:2800,
    info: m => ({ title:'Draw the VSWR circle',
      body:`<p>Compass on <b>O</b>, open it to <b>P</b>, and draw a full circle. |Γ| is the same everywhere on a lossless line, so every point on the line sits on this circle. Where it cuts the right half of the axis you can read the VSWR.</p>`,
      work: isFinite(m.s) ? `VSWR = (1 + |Γ|)/(1 − |Γ|) = (1 + ${f(m.mag)})/(1 − ${f(m.mag)})<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;= <b>${f(m.s, 2)}</b>` : 'VSWR = ∞ (|Γ| = 1)' }),
    draw: (m, p) => {
      vswrCircle(m.mag, m.th, seg(p, 0, .8)); dot(m.gu, m.gv, 6, COL.ink);
      const e = seg(p, .8, 1);
      if (e > 0 && isFinite(m.s) && m.mag > .02){ dot(m.mag, 0, 5*e, COL.green); text(m.mag + .02, -.075, `VSWR ≈ ${f(m.s, 2)}`, {color:COL.green, size:13, op:e, anchor: m.mag > .75 ? 'end' : 'start'}); }
    },
    rd: m => ['VSWR circle through P', `VSWR = ${fS(m.s)}`] });
  const stWtgP = () => ({ dur:1500,
    info: m => ({ title:'Read P on the wavelength scale',
      body:`<p>Draw a line from O through P out to the outer scale (wavelengths toward generator). Distances along the line are measured from this reading.</p>`,
      work:`P is at <b>${f(m.w1)}λ</b> toward generator` }),
    draw: (m, p) => { radial(m.th, ease(p), COL.ink); if (p >= 1) ringText(m.th, `${f(m.w1)}λ`, COL.ink); dot(m.gu, m.gv, 6, COL.ink); },
    rd: m => ['Read P on the WTG scale', `${f(m.w1)}λ`] });
  const stToY = why => ({ dur:2600,
    info: m => ({ title:'Switch to admittance',
      body:`<p>${why} Rotate P by <b>180°</b> (a λ/4 move) to get y<sub>L</sub> at <b>P′</b>, and read the chart as an admittance chart from here on.</p>`,
      work:`y<sub>L</sub> = 1/z<sub>L</sub> = <b>${fc(m.g, m.b)}</b>` }),
    draw: (m, p) => {
      const q = ease(seg(p, 0, .8));
      arcCW(m.mag, m.th, PI, q, COL.purple, 2.6, {opacity:.7});
      if (q > 0 && q < 1) movingDot(m.mag, m.th - PI*q, COL.purple);
      const e = seg(p, .8, 1);
      if (e > 0){ stroke([[m.gu, m.gv], [m.yu, m.yv]], e, COL.purple, 1.4, {'stroke-dasharray':'6 4'}); dot(m.yu, m.yv, 6.5, COL.purple); pointLabel(m.yu, m.yv, `P′: y = ${fc(m.g, m.b)}`, COL.purple, e); }
      dot(m.gu, m.gv, 6, COL.ink);
    },
    rd: m => ['Rotate 180° to y<sub>L</sub>', `y<sub>L</sub> = ${fc(m.g, m.b)}`] });
  const stAnswer = () => ({ dur:1600,
    info: m => ({ title:'Answer', body: cardsHTML(H.mode().answer(m)) + (H.mode().note ? `<p>${H.mode().note(m)}</p>` : ''), work:'' }),
    draw: (m, p) => { if (p >= 1 || !H.mode().keys) return; H.mode().keys(m).forEach(([u, v, c]) => ring(u, v, 7 + 20*p, c, 1 - p)); } });

  // ---------- question types ----------
  const GLYPH = {
    adm:'<circle cx="16" cy="16" r="12"/><path d="M10 23 L22 9" stroke-dasharray="3 3"/><circle cx="10" cy="23" r="2.4" fill="currentColor" stroke="none"/><circle cx="22" cy="9" r="2.4" fill="currentColor" stroke="none"/>',
    zin:'<circle cx="16" cy="16" r="12" opacity=".45"/><path d="M16 7 A9 9 0 1 1 7.6 19.4"/><path d="M6.6 15.8 L7.6 19.4 L11.2 18.4"/>',
    mm:'<circle cx="16" cy="16" r="12" opacity=".45"/><path d="M4 16 H28"/><circle cx="9" cy="16" r="2.6" fill="currentColor" stroke="none"/><circle cx="23" cy="16" r="2.6" fill="currentColor" stroke="none"/>',
    meas:'<path d="M3 24 H29"/><path d="M6 24 V20.5 M10 24 V22 M14 24 V20.5 M18 24 V22 M22 24 V20.5 M26 24 V22"/><path d="M3 12 C8 4, 12 20, 16 12 S 24 4, 29 12"/>',
    ss:'<path d="M3 10 H29"/><path d="M18 10 V26"/><path d="M13.5 26 H22.5"/>',
    qw:'<path d="M3 16 H9 M23 16 H29"/><rect x="9" y="11.5" width="14" height="9" rx="2"/><path d="M9 25.5 H23" stroke-dasharray="2 2.5"/>',
    sx:'<path d="M16 4 V20"/><path d="M9.5 20 H22.5 M11.8 24 H20.2 M14 28 H18"/>',
    ds:'<path d="M3 10 H29"/><path d="M11 10 V25 M21 10 V25"/><path d="M7.5 25 H14.5 M17.5 25 H24.5"/>'
  };
  const glyph = k => `<svg viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${GLYPH[k]}</svg>`;

  const MODES = [
    // 1 ----------------------------------------------------------------
    { id:'admittance', title:'Admittance & VSWR', desc:'y<sub>L</sub>, |Γ| and VSWR for a load', glyph:glyph('adm'),
      fields:['Z0', 'RL', 'XL'], defaults:{Z0:'50', RL:'25', XL:'-50'},
      compute: v => { const m = loadModel(v, {needY:true}); m.w2 = mod(m.w1 + .25, .5); return m; },
      problem: m => ({ lede:`A ${f(m.Z0)} Ω line ends in a ${fc(m.RL, m.XL, 2)} Ω load. Watch the chart find the load admittance y<sub>L</sub> and the VSWR, one construction line at a time.`, chips:[chipZ0(m), chipZL(m)], find:'find y<sub>L</sub> and VSWR' }),
      steps: () => [stIntro(), stNormalize(),
        { dur:2200,
          info: m => ({ title:`Find the r = ${f(m.r)} circle`, body:`<p>Find the constant-resistance circle for <b>r = ${f(m.r)}</b>. It crosses the horizontal axis at the point marked ${f(m.r)}. The point we want lies somewhere on this circle.</p>`,
            work:`<span class="c">Centre of the r-circle: (r/(1+r), 0) = (${f(m.r/(1+m.r))}, 0)<br>Radius: 1/(1+r) = ${f(1/(1+m.r))}</span>` }),
          draw: (m, p) => { stroke(rPts(m.r), ease(p), COL.red, 2.8); const c = m.r/(1+m.r), rho = 1/(1+m.r); text(c, rho > 0.25 ? rho - 0.06 : rho + 0.045, `r = ${f(m.r)}`, {color:COL.red, op:seg(p, .6, 1), size:13.5}); } },
        { dur:2200,
          info: m => ({ title:`Find the x = ${f(m.x)} arc`,
            body: Math.abs(m.x) < 1e-12 ? `<p>x = 0, so the load is purely resistive and the point lies on the horizontal axis.</p>`
              : `<p>x is <b>${m.x < 0 ? 'negative (capacitive)' : 'positive (inductive)'}</b>, so look in the <b>${m.x < 0 ? 'lower' : 'upper'} half</b>. Start at <b>${m.x < 0 ? '−' : '+'}j${f(Math.abs(m.x))}</b> on the rim and follow that arc toward the right edge.</p>`,
            work: Math.abs(m.x) < 1e-12 ? '' : `<span class="c">Centre of the x-arc: (1, 1/x) = (1, ${f(1/m.x)})<br>Radius: 1/|x| = ${f(1/Math.abs(m.x))}</span>` }),
          draw: (m, p) => { stroke(xPts(m.x), ease(p), COL.blue, 2.8); if (Math.abs(m.x) > 1e-12){ const g0 = gam(0, m.x); text(0.8*g0[0] - 0.03, 0.8*g0[1], `x = ${f(m.x)}`, {color:COL.blue, op:seg(p, .6, 1), size:13.5, anchor:'end'}); } } },
        { dur:1600,
          info: m => ({ title:'Plot z<sub>L</sub> where they cross',
            body:`<p>The r circle and the x arc cross at one point. That point is <b>z<sub>L</sub> = ${fc(m.r, m.x)}</b>. Label it <b>P</b>.</p><p>The distance OP, as a fraction of the chart's radius, is the size of the reflection coefficient |Γ<sub>L</sub>|.</p>`,
            work:`Γ<sub>L</sub> = (z<sub>L</sub> − 1)/(z<sub>L</sub> + 1)<br>&nbsp;&nbsp;&nbsp;= ${fc(m.gu, m.gv)}<br>|Γ<sub>L</sub>| = <b>${f(m.mag)}</b>&nbsp;&nbsp;∠Γ<sub>L</sub> = ${f(deg(m.th), 1)}°` }),
          draw: (m, p) => { const e = ease(seg(p, 0, .5)), pp = seg(p, .3, 1); if (pp > 0 && pp < 1) ring(m.gu, m.gv, 6 + 22*pp, COL.ink, 1 - pp); dot(m.gu, m.gv, 6*e, COL.ink); pointLabel(m.gu, m.gv, `P: z = ${fc(m.r, m.x)}`, COL.ink, seg(p, .4, .9)); },
          rd: m => [`Plot P where r = ${f(m.r)} meets x = ${f(m.x)}`, `|Γ<sub>L</sub>| = ${f(m.mag)}, ∠Γ<sub>L</sub> = ${f(deg(m.th), 1)}°`] },
        { dur:3000,
          info: m => ({ title:'Draw the constant-VSWR circle',
            body:`<p>Put the compass point on <b>O</b>, open it to <b>P</b>, and draw a full circle.</p><p>|Γ| stays the same everywhere on a lossless line. So moving along the line only moves you <b>around this circle</b>, and every impedance on the line sits on it.</p>`,
            work:`<span class="c">Circle radius = OP = |Γ<sub>L</sub>| × (chart radius)</span><br>|Γ<sub>L</sub>| = ${f(m.mag)}` }),
          draw: (m, p) => { vswrCircle(m.mag, m.th, p); dot(m.gu, m.gv, 6, COL.ink); } },
        { dur:2400,
          info: m => ({ title:'Read the VSWR',
            body: isFinite(m.s) ? `<p>Follow the circle to where it crosses the <b>right half</b> of the horizontal axis. The r value there <b>is the VSWR</b>: about <b>${f(m.s, 2)}</b>.</p><p>The crossing on the left half gives 1/VSWR ≈ ${f(1/m.s, 2)}. That is the normalized impedance at a voltage minimum.</p>`
              : `<p>|Γ| = 1, so the circle is the rim itself and the VSWR is infinite. All the power is reflected.</p>`,
            work: isFinite(m.s) ? `VSWR = (1 + |Γ|)/(1 − |Γ|)<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;= ${f(1 + m.mag)}/${f(1 - m.mag)}<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;= <b>${f(m.s, 2)}</b><br><span class="c">On a paper chart, expect a reading within about ±0.1 of this.</span>` : `VSWR = ∞` }),
          draw: (m, p) => {
            if (isFinite(m.s) && m.s < 60) stroke(rPts(m.s), ease(seg(p, 0, .6)), COL.green, 1.6, {'stroke-dasharray':'4 4', opacity:.8});
            const e = ease(seg(p, .4, .8)); dot(m.mag, 0, 6*e, COL.green); if (m.mag > 0.02) dot(-m.mag, 0, 4.5*e, COL.green, .8);
            const lo = seg(p, .6, 1);
            if (isFinite(m.s)){ text(m.mag + 0.02, -0.075, `VSWR ≈ ${f(m.s, 2)}`, {color:COL.green, op:lo, size:14, anchor: m.mag > 0.75 ? 'end' : 'start'}); if (m.mag > 0.02) text(-m.mag, -0.075, `1/VSWR ≈ ${f(1/m.s, 2)}`, {color:COL.green, op:lo*.85, size:11.5}); }
            else text(0.98, -0.075, 'VSWR = ∞', {color:COL.green, op:lo, size:14, anchor:'end'});
          },
          rd: m => ['VSWR circle meets the right axis', `VSWR = ${fS(m.s)}`] },
        { dur:4200,
          info: m => { const sum = m.w1 + 0.25; return { title:'Rotate 180° to get the admittance',
            body:`<p>Moving λ/4 along the line turns z into y = 1/z. On the chart, λ/4 is <b>half a turn (180°)</b> around the VSWR circle.</p><p>In practice: draw a straight line from <b>P</b> through <b>O</b> to the other side of the circle. Where it lands, <b>P′</b>, is y<sub>L</sub>.</p>`,
            work:`<span class="c">On the outer (WTG) scale:</span><br>P at ${f(m.w1)}λ<br>+ 0.25λ → ${f(sum)}λ${sum >= 0.5 ? ` − 0.5λ = ${f(m.w2)}λ` : ''}<br>P′ at <b>${f(m.w2)}λ</b><br><span class="c">(One full turn of the chart = 0.5λ.)</span>` }; },
          draw: (m, p) => {
            const pa = ease(seg(p, 0, .18)), pb = ease(seg(p, .18, .78)), pc = ease(seg(p, .78, 1));
            radial(m.th, pa); if (pa >= 1) ringText(m.th, `${f(m.w1)}λ`, COL.purple);
            arcCW(m.mag, m.th, PI, pb, COL.purple, 3.4);
            if (pb > 0 && pb < 1){ movingDot(m.mag, m.th - PI*pb, COL.purple); text(0, 0.11, `${Math.round(180*pb)}°`, {color:COL.purple, size:13}); }
            if (pc > 0){ stroke([[m.gu, m.gv], [m.yu, m.yv]], pc, COL.purple, 1.6, {'stroke-dasharray':'6 4'}); radial(m.th + PI, pc); if (pc >= 1) ringText(m.th + PI, `${f(m.w2)}λ`, COL.purple); }
            dot(m.gu, m.gv, 6, COL.ink);
            if (pb >= 1){ dot(m.yu, m.yv, 6.5, COL.purple); pointLabel(m.yu, m.yv, 'P′', COL.purple, 1, 0.07); }
          },
          rd: m => ['Read P on the WTG scale, add 0.25λ', `${f(m.w1)}λ → ${f(m.w2)}λ`] },
        { dur:2600,
          info: m => ({ title:'Read y<sub>L</sub> at P′',
            body:`<p>Read P′ like any other point. It sits on the <b>${f(m.g)}</b> circle and the <b>${isNeg(m.b, 3) ? '−' : '+'}${f(Math.abs(m.b))}</b> arc. Because P′ is an admittance, call these <b>g</b> (conductance) and <b>b</b> (susceptance).</p>`,
            work:`<span class="c">Check by algebra:</span><br>y<sub>L</sub> = 1/z<sub>L</sub> = 1/(${fc(m.r, m.x)})<br>&nbsp;&nbsp;&nbsp;= (${fc(m.r, -m.x)})/${f(m.r*m.r + m.x*m.x)}<br>&nbsp;&nbsp;&nbsp;= <b>${fc(m.g, m.b)}</b>` }),
          draw: (m, p) => {
            stroke(rPts(m.g), ease(seg(p, 0, .55)), COL.purple, 1.6, {'stroke-dasharray':'5 4', opacity:.75});
            stroke(xPts(m.b), ease(seg(p, .3, .85)), COL.purple, 1.6, {'stroke-dasharray':'5 4', opacity:.75});
            dot(m.yu, m.yv, 6.5, COL.purple); pointLabel(m.yu, m.yv, `P′: y = ${fc(m.g, m.b)}`, COL.purple, seg(p, .7, 1));
          },
          rd: m => ['Read P′, opposite P', `y<sub>L</sub> = ${fc(m.g, m.b)}`] },
        stAnswer()],
      answer: m => [
        {tone:'y', k:'Normalized load admittance', v:`y<sub>L</sub> = ${fc(m.g, m.b, 2)}`, s:`Y<sub>L</sub> = y<sub>L</sub>/Z<sub>0</sub> = ${fc(1000*m.g/m.Z0, 1000*m.b/m.Z0, 2)} mS`},
        {tone:'s1', k:'Voltage standing wave ratio', v:`VSWR ${isFinite(m.s) ? '≈ ' + f(m.s, 2) : '= ∞'}`, s:`|Γ<sub>L</sub>| = ${f(m.mag, 2)}`}],
      note: m => `<b>What to write in the exam:</b> z<sub>L</sub> = ${fc(m.r, m.x)} plotted at P. Draw the VSWR circle through P; it cuts the right half of the axis at VSWR ≈ ${isFinite(m.s) ? f(m.s, 1) : '∞'}. P′ is diametrically opposite P, so y<sub>L</sub> ≈ ${fc(m.g, m.b, 2)}.`,
      keys: m => [[m.yu, m.yv, COL.purple], [m.mag, 0, COL.green]] },

    // 2 ----------------------------------------------------------------
    { id:'input-impedance', title:'Input impedance', desc:'Z<sub>in</sub> at a distance from the load', glyph:glyph('zin'),
      fields:['Z0', 'RL', 'XL', 'l', 'lam'], defaults:{Z0:'50', RL:'100', XL:'50', l:'0.2', l_u:'lam', lam:''},
      compute: v => {
        const m = loadModel(v), L = lenIn(v, 'l', 'line length');
        const l = L.lam, sweep = 2*TAU*mod(l, .5), thIn = m.th - sweep, Gin = polar(m.mag, thIn), t = Math.tan(TAU*l);
        const zinF = cdiv([m.r, m.x + t], [1 - m.x*t, m.r*t]);
        return Object.assign(m, {l, lText:L.text, lConv:L.conv, sweep, thIn, ui:Gin[0], vi:Gin[1], zin:fromG(Gin), zinF, t, w2:wtgA(thIn)});
      },
      problem: m => ({ lede:`A ${f(m.Z0)} Ω line, ${m.lText} long, ends in a ${fc(m.RL, m.XL, 2)} Ω load. Find the input impedance Z<sub>in</sub> at the other end.`, chips:[chipZ0(m), chipZL(m), `l = ${m.lText}`], find:'find Z<sub>in</sub>' }),
      steps: () => [stIntro(), stNormalize(), stPlot(), stVswr(), stWtgP(),
        { dur:3600,
          info: m => ({ title:`Move ${m.lText} toward the generator`,
            body:`<p>Going along the line toward the generator turns the point <b>clockwise</b> around the VSWR circle. Add the line length to P's reading on the outer scale.${m.l >= .5 ? ' The chart repeats every 0.5λ, so whole half-wavelengths drop out.' : ''}</p>`,
            work:`${m.lConv ? m.lConv + '<br>' : ''}${f(m.w1)}λ + ${f(m.l)}λ = ${f(m.w1 + m.l)}λ${m.w1 + m.l >= .5 ? ` → ${f(m.w2)}λ <span class="c">(drop whole 0.5λ turns)</span>` : ''}<br>Q is at <b>${f(m.w2)}λ</b>` }),
          draw: (m, p) => {
            const q = ease(seg(p, 0, .85));
            arcCW(m.mag, m.th, m.sweep, q, COL.purple);
            if (q > 0 && q < 1) movingDot(m.mag, m.th - m.sweep*q, COL.purple);
            const e = seg(p, .85, 1);
            if (e > 0){ radial(m.thIn, e, COL.purple); if (e >= 1) ringText(m.thIn, `${f(m.w2)}λ`, COL.purple); dot(m.ui, m.vi, 6.5, COL.purple); }
            dot(m.gu, m.gv, 6, COL.ink);
          },
          rd: m => [`Move ${m.lText} toward the generator`, `${f(m.w1)}λ → ${f(m.w2)}λ`] },
        { dur:2400,
          info: m => ({ title:'Read z<sub>in</sub> at Q',
            body:`<p>Read Q like any other point: it sits on the r = ${f(m.zin[0])} circle and the x = ${f(m.zin[1])} arc. Multiply by Z<sub>0</sub> to get ohms.</p>`,
            work:`<span class="c">Check with the formula:</span><br>z<sub>in</sub> = (z<sub>L</sub> + j tan βl)/(1 + j z<sub>L</sub> tan βl)<br>tan βl = tan(${f(360*m.l, 1)}°) = ${Math.abs(m.t) > 1e6 ? '∞' : f(m.t)}<br>z<sub>in</sub> = <b>${fz(m.zinF)}</b><br>Z<sub>in</sub> = <b>${fc(m.zin[0]*m.Z0, m.zin[1]*m.Z0, 2)} Ω</b>` }),
          draw: (m, p) => { faintRX(m.zin, p, COL.purple); dot(m.ui, m.vi, 6.5, COL.purple); pointLabel(m.ui, m.vi, `Q: z = ${fz(m.zin)}`, COL.purple, seg(p, .55, 1)); },
          rd: m => ['Read Q', `z<sub>in</sub> = ${fz(m.zin)}`] },
        stAnswer()],
      answer: m => [
        {tone:'y', k:'Input impedance', v:`Z<sub>in</sub> = ${fc(m.zin[0]*m.Z0, m.zin[1]*m.Z0, 2)} Ω`, s:`z<sub>in</sub> = ${fz(m.zin)}`},
        {tone:'s1', k:'Standing wave on the line', v:`VSWR ${isFinite(m.s) ? '≈ ' + f(m.s, 2) : '= ∞'}`, s:`|Γ| = ${f(m.mag, 2)} at every point`}],
      keys: m => [[m.ui, m.vi, COL.purple]] },

    // 3 ----------------------------------------------------------------
    { id:'max-min', title:'Voltage max & min', desc:'Where V<sub>max</sub> and V<sub>min</sub> are, and Z there', glyph:glyph('mm'),
      fields:['Z0', 'RL', 'XL'], defaults:{Z0:'50', RL:'30', XL:'40'},
      compute: v => {
        const m = loadModel(v);
        if (m.mag < 1e-9) throw new Error('This load is matched (Z_L = Z₀): there is no standing wave, so there is no V max or V min.');
        const mx = {kind:'max', d:m.dmax, a:0, r:m.s, Z:m.Z0*m.s, u:m.mag}, mn = {kind:'min', d:m.dmin, a:PI, r:1/m.s, Z:m.Z0/m.s, u:-m.mag};
        const firstMax = m.dmax <= m.dmin;
        return Object.assign(m, {o1: firstMax ? mx : mn, o2: firstMax ? mn : mx});
      },
      problem: m => ({ lede:`A ${f(m.Z0)} Ω line ends in a ${fc(m.RL, m.XL, 2)} Ω load. Find where the first voltage maximum and minimum are, and the line impedance at each.`, chips:[chipZ0(m), chipZL(m)], find:'find d<sub>max</sub> and d<sub>min</sub>' }),
      steps: () => [stIntro(), stNormalize(), stPlot(), stVswr(), stWtgP(),
        { dur:3200,
          info: m => { const o = m.o1, target = o.kind === 'max' ? .25 : .5, wrap = target < m.w1; return { title:`Turn to the first voltage ${o.kind === 'max' ? 'maximum' : 'minimum'}`,
            body:`<p>Move toward the generator (clockwise) from P until you hit the horizontal axis. ${o.kind === 'max' ? 'You reach the <b>right</b> half first. That is a voltage <b>maximum</b>, where the line looks like a pure resistance r = VSWR.' : 'You reach the <b>left</b> half first. That is a voltage <b>minimum</b>, where the line looks like a pure resistance r = 1/VSWR.'}</p>`,
            work:`${o.kind === 'max' ? 'right' : 'left'} axis reads ${o.kind === 'max' ? '0.25λ' : '0.5λ'} on the WTG scale<br>d = ${f(target)}λ − ${f(m.w1)}λ${wrap ? ' + 0.5λ' : ''} = <b>${f(o.d)}λ</b>` }; },
          draw: (m, p) => {
            const o = m.o1, q = ease(seg(p, 0, .8));
            arcCW(m.mag, m.th, 2*TAU*o.d, q, COL.purple);
            if (q > 0 && q < 1) movingDot(m.mag, m.th - 2*TAU*o.d*q, COL.purple);
            const e = seg(p, .8, 1);
            if (e > 0){ dot(o.u, 0, 6, COL.green); text(o.u + (o.kind === 'max' ? .02 : -.02), .075, `V ${o.kind} at ${f(o.d)}λ`, {color:COL.purple, size:13, op:e, anchor: o.kind === 'max' ? (m.mag > .7 ? 'end' : 'start') : (m.mag > .7 ? 'start' : 'end')}); }
            dot(m.gu, m.gv, 6, COL.ink);
          },
          rd: m => [`First V<sub>${m.o1.kind}</sub> from the load`, `${f(m.o1.d)}λ`] },
        { dur:2800,
          info: m => ({ title:`λ/4 further: the first ${m.o2.kind === 'max' ? 'maximum' : 'minimum'}`,
            body:`<p>Maxima and minima alternate every λ/4, which is half a turn of the chart. Keep turning to the other side of the axis.</p>`,
            work:`${f(m.o1.d)}λ + 0.25λ = <b>${f(m.o2.d)}λ</b>` }),
          draw: (m, p) => {
            const o = m.o2, q = ease(seg(p, 0, .8));
            arcCW(m.mag, m.o1.a, PI, q, COL.purple, 2.6, {opacity:.55});
            if (q > 0 && q < 1) movingDot(m.mag, m.o1.a - PI*q, COL.purple);
            const e = seg(p, .8, 1);
            if (e > 0){ dot(o.u, 0, 6, COL.green); text(o.u + (o.kind === 'max' ? .02 : -.02), .075, `V ${o.kind} at ${f(o.d)}λ`, {color:COL.purple, size:13, op:e, anchor: o.kind === 'max' ? (m.mag > .7 ? 'end' : 'start') : (m.mag > .7 ? 'start' : 'end')}); }
          },
          rd: m => [`First V<sub>${m.o2.kind}</sub> from the load`, `${f(m.o2.d)}λ`] },
        { dur:2000,
          info: m => ({ title:'Impedance at the maximum and minimum',
            body:`<p>At both points the line impedance is purely resistive. At V<sub>max</sub> it is largest (Z<sub>0</sub> × VSWR); at V<sub>min</sub> it is smallest (Z<sub>0</sub> / VSWR).</p>`,
            work:`Z<sub>max</sub> = ${f(m.Z0)} × ${fS(m.s)} = <b>${f(m.Z0*m.s, 2)} Ω</b><br>Z<sub>min</sub> = ${f(m.Z0)} / ${fS(m.s)} = <b>${f(m.Z0/m.s, 2)} Ω</b>` }),
          draw: (m, p) => {
            const e = seg(p, 0, 1);
            text(m.mag + .02, -.16, `Z = ${f(m.Z0*m.s, 1)} Ω`, {color:COL.green, size:12.5, op:e, anchor: m.mag > .7 ? 'end' : 'start'});
            text(-m.mag - .02, -.16, `Z = ${f(m.Z0/m.s, 1)} Ω`, {color:COL.green, size:12.5, op:e, anchor: m.mag > .7 ? 'start' : 'end'});
          },
          rd: m => ['Impedance at V<sub>max</sub> / V<sub>min</sub>', `${f(m.Z0*m.s, 2)} Ω / ${f(m.Z0/m.s, 2)} Ω`] },
        stAnswer()],
      answer: m => [
        {tone:'y', k:'First voltage maximum', v:`d<sub>max</sub> = ${f(m.dmax)}λ`, s:`Z = Z<sub>0</sub> × VSWR = ${f(m.Z0*m.s, 1)} Ω`},
        {tone:'s1', k:'First voltage minimum', v:`d<sub>min</sub> = ${f(m.dmin)}λ`, s:`Z = Z<sub>0</sub> / VSWR = ${f(m.Z0/m.s, 1)} Ω`}],
      note: m => `VSWR = ${fS(m.s)}. Maxima repeat every 0.5λ, and so do minima.`,
      keys: m => [[m.mag, 0, COL.green], [-m.mag, 0, COL.green]] },

    // 4 ----------------------------------------------------------------
    { id:'load-from-vswr', title:'Load from measurements', desc:'Z<sub>L</sub> from the VSWR and the V<sub>min</sub> position', glyph:glyph('meas'),
      fields:['Z0', 'S', 'dmin', 'lam'], defaults:{Z0:'50', S:'3', dmin:'0.15', dmin_u:'lam', lam:''},
      compute: v => {
        needNum(v.Z0, 'Z₀'); needNum(v.S, 'the VSWR');
        if (v.Z0 <= 0) throw new Error('Z₀ must be greater than 0.');
        if (v.S <= 1) throw new Error('The VSWR must be greater than 1 (a VSWR of 1 just means Z_L = Z₀).');
        const D = lenIn(v, 'dmin', 'V min distance');
        const mag = (v.S - 1)/(v.S + 1), thL = ang(polar(1, PI + 2*TAU*mod(D.lam, .5)));
        const m = modelFromZ(v.Z0, fromG(polar(mag, thL)));
        return Object.assign(m, {S:v.S, dm:D.lam, dText:D.text, dConv:D.conv, wl:mod(D.lam, .5), magS:mag});
      },
      problem: m => ({ lede:`A ${f(m.Z0)} Ω line shows a VSWR of ${f(m.S)}, and the first voltage minimum is ${m.dText} from the load. Find the load impedance Z<sub>L</sub>.`, chips:[chipZ0(m), `VSWR = ${f(m.S)}`, `d<sub>min</sub> = ${m.dText}`], find:'find Z<sub>L</sub>' }),
      steps: () => [stIntro(),
        { dur:2400,
          info: m => ({ title:`Mark VSWR = ${f(m.S)} on the right axis`,
            body:`<p>At a voltage maximum the line impedance is real and equal to VSWR × Z<sub>0</sub>, so the VSWR circle passes through <b>r = ${f(m.S)}</b> on the right half of the horizontal axis.</p>`,
            work:`|Γ| = (VSWR − 1)/(VSWR + 1)<br>&nbsp;&nbsp;&nbsp;= ${f(m.S - 1)}/${f(m.S + 1)} = <b>${f(m.magS)}</b>` }),
          draw: (m, p) => {
            stroke(rPts(m.S), ease(seg(p, 0, .6)), COL.red, 1.8, {'stroke-dasharray':'5 4', opacity:.8});
            dot(m.magS, 0, 6*ease(seg(p, .5, .9)), COL.green);
            text(m.magS + .02, -.075, `r = VSWR = ${f(m.S)}`, {color:COL.green, size:13, op:seg(p, .6, 1), anchor: m.magS > .75 ? 'end' : 'start'});
          },
          rd: m => ['Mark the VSWR on the right axis', `r = ${f(m.S)}, |Γ| = ${f(m.magS)}`] },
        { dur:2400,
          info: m => ({ title:'Draw the VSWR circle', body:`<p>Compass on O, open it to that point, and draw the full circle. The load is somewhere on it; the position of V<sub>min</sub> tells you where.</p>`, work:'' }),
          draw: (m, p) => { stroke(circlePts(0, 0, m.magS, 0, -TAU, 360), ease(p), COL.green, 2.8); dot(0, 0, 4.5, COL.ink); dot(m.magS, 0, 6, COL.green); } },
        { dur:2000,
          info: m => ({ title:'Mark the voltage minimum',
            body:`<p>The voltage minimum is where the impedance is smallest and purely resistive: the <b>left</b> crossing, r = 1/VSWR = ${f(1/m.S)}. Both wavelength scales read 0 there.</p>`,
            work:`r<sub>min</sub> = 1/${f(m.S)} = <b>${f(1/m.S)}</b>` }),
          draw: (m, p) => { const e = ease(p); dot(-m.magS, 0, 6*e, COL.green); text(-m.magS, -.075, 'V min', {color:COL.green, size:13, op:e}); radial(PI, e, COL.ink); if (p >= 1) ringText(PI, '0λ', COL.ink); },
          rd: m => ['V<sub>min</sub> on the left axis', `r = 1/VSWR = ${f(1/m.S)}`] },
        { dur:3400,
          info: m => ({ title:`Move ${m.dText} toward the load`,
            body:`<p>The load is ${m.dText} from the minimum, on the load side. Turn <b>anticlockwise</b> (toward the load) by ${f(m.dm)}λ, using the wavelengths-toward-load scale.</p>`,
            work:`${m.dConv ? m.dConv + '<br>' : ''}WTL reading: 0 + ${f(m.dm)}λ = <b>${f(m.wl)}λ</b>` }),
          draw: (m, p) => {
            const sweep = 2*TAU*m.wl, q = ease(seg(p, 0, .85));
            arcCCW(m.magS, PI, sweep, q, COL.purple);
            if (q > 0 && q < 1) movingDot(m.magS, PI + sweep*q, COL.purple);
            const e = seg(p, .85, 1);
            if (e > 0){ radial(m.th, e, COL.purple); if (e >= 1) ringText(m.th, `WTL ${f(m.wl)}λ`, COL.purple); dot(m.gu, m.gv, 6.5, COL.ink); }
          },
          rd: m => [`Move ${m.dText} toward the load`, `WTL ${f(m.wl)}λ`] },
        { dur:2400,
          info: m => ({ title:'Read z<sub>L</sub>', body:`<p>P lands on the r = ${f(m.r)} circle and the x = ${f(m.x)} arc.</p>`, work:`z<sub>L</sub> = <b>${fc(m.r, m.x)}</b>` }),
          draw: (m, p) => { faintRX([m.r, m.x], p, COL.ink); dot(m.gu, m.gv, 6.5, COL.ink); pointLabel(m.gu, m.gv, `P: z = ${fc(m.r, m.x)}`, COL.ink, seg(p, .5, 1)); },
          rd: m => ['Read P', `z<sub>L</sub> = ${fc(m.r, m.x)}`] },
        { dur:1400,
          info: m => ({ title:'Denormalize', body:`<p>Multiply by Z<sub>0</sub> to turn z<sub>L</sub> back into ohms.</p>`, work:`Z<sub>L</sub> = ${f(m.Z0)} × (${fc(m.r, m.x)})<br>&nbsp;&nbsp;&nbsp;= <b>${fc(m.RL, m.XL, 2)} Ω</b>` }),
          draw: (m) => { dot(m.gu, m.gv, 6.5, COL.ink); },
          rd: m => ['Denormalize', `Z<sub>L</sub> = ${fc(m.RL, m.XL, 2)} Ω`] },
        stAnswer()],
      answer: m => [
        {tone:'y', k:'Load impedance', v:`Z<sub>L</sub> = ${fc(m.RL, m.XL, 1)} Ω`, s:`z<sub>L</sub> = ${fc(m.r, m.x)}`},
        {tone:'s1', k:'Reflection coefficient', v:`Γ<sub>L</sub> = ${f(m.magS, 3)} ∠${f(deg(m.th), 1)}°`, s:`VSWR = ${f(m.S)}`}],
      keys: m => [[m.gu, m.gv, COL.ink]] },

    // 5 ----------------------------------------------------------------
    { id:'single-stub', title:'Single-stub matching', desc:'Stub position and length (two answers)', glyph:glyph('ss'),
      fields:['Z0', 'RL', 'XL', 'stub'], defaults:{Z0:'50', RL:'60', XL:'-80', stub:'short'},
      compute: v => {
        const m = loadModel(v, {needY:true}); noMatchErr(m);
        const rho = m.mag, thy = ang([m.yu, m.yv]), u = rho*rho, vv = rho*Math.sqrt(Math.max(0, 1 - rho*rho));
        const a0 = v.stub === 'short' ? 0 : PI;
        const sols = [ang([u, vv]), ang([u, -vv])].map(phi => {
          const y = fromG(polar(rho, phi)), bs = -y[1], phit = ang(toG([0, bs]));
          return {phi, d:cw(thy, phi), b:y[1], bs, phit, l:cw(a0, phit), w:wtgA(phi)};
        }).sort((a, b) => a.d - b.d);
        return Object.assign(m, {thy, wy:wtgA(thy), stub:v.stub, a0, w0:wtgA(a0), sols});
      },
      problem: m => ({ lede:`Match a ${fc(m.RL, m.XL, 2)} Ω load to a ${f(m.Z0)} Ω line with one ${m.stub}-circuited stub in shunt. Find where to put the stub and how long it must be.`, chips:[chipZ0(m), chipZL(m), `${m.stub}-circuited stub`], find:'find d and l' }),
      steps: () => [stIntro(), stNormalize(), stPlot(), stVswr(),
        stToY('A stub is connected in <b>shunt</b>, and shunt elements add admittances, so work with y instead of z.'),
        { dur:2000,
          info: () => ({ title:'Draw the g = 1 circle', body:`<p>A stub only adds susceptance (jb), never conductance. For a match, the line's admittance at the stub must already be <b>1 + jb</b>, so the stub has to sit on the <b>g = 1 circle</b>: the circle through the centre.</p>`, work:'' }),
          draw: (m, p) => { stroke(rPts(1), ease(p), COL.match, 2.6); text(.5, .56, 'g = 1', {color:COL.match, size:13, op:seg(p, .6, 1)}); dot(m.yu, m.yv, 6.5, COL.purple); } },
        { dur:3600,
          info: m => { const S = m.sols[0], wrap = S.w < m.wy; return { title:'Move toward the generator to the g = 1 circle',
            body:`<p>From P′ turn <b>clockwise</b> around the VSWR circle until you meet the g = 1 circle at <b>A</b>. Read both points on the outer scale. The difference is the stub's distance from the load.</p>`,
            work:`P′ at ${f(m.wy)}λ, A at ${f(S.w)}λ<br>d₁ = ${f(S.w)} − ${f(m.wy)}${wrap ? ' + 0.5' : ''} = <b>${f(S.d)}λ</b>` }; },
          draw: (m, p) => {
            const S = m.sols[0], e0 = seg(p, 0, .15);
            radial(m.thy, e0, COL.purple); if (e0 >= 1) ringText(m.thy, `${f(m.wy)}λ`, COL.purple);
            const q = ease(seg(p, .15, .85));
            arcCW(m.mag, m.thy, 2*TAU*S.d, q, COL.purple);
            if (q > 0 && q < 1) movingDot(m.mag, m.thy - 2*TAU*S.d*q, COL.purple);
            const e = seg(p, .85, 1);
            if (e > 0){ const [u, v] = polar(m.mag, S.phi); radial(S.phi, e, COL.match); if (e >= 1) ringText(S.phi, `${f(S.w)}λ`, COL.match); dot(u, v, 6.5, COL.match); pointLabel(u, v, `A: y = ${fc(1, S.b)}`, COL.match, e, .05, [1, 0]); }
            dot(m.yu, m.yv, 6.5, COL.purple);
          },
          rd: m => ['Stub position, solution 1', `d₁ = ${f(m.sols[0].d)}λ`] },
        { dur:3600,
          info: m => { const S = m.sols[0], sh = m.stub === 'short'; return { title:'Read A and size the stub',
            body:`<p>At A the line admittance is <b>y = ${fc(1, S.b)}</b>. The stub must cancel the susceptance, so it needs <b>y<sub>stub</sub> = ${fj(S.bs)}</b>. Start at the ${sh ? '<b>short-circuit</b> point (y = ∞, right end)' : '<b>open-circuit</b> point (y = 0, left end)'} and turn clockwise around the rim until you reach ${fj(S.bs)}. That distance is the stub length.</p>`,
            work:`stub starts at ${f(m.w0)}λ; ${fj(S.bs)} is at ${f(wtgA(S.phit))}λ<br>l₁ = <b>${f(S.l)}λ</b>` }; },
          draw: (m, p) => {
            const S = m.sols[0], sh = m.stub === 'short', [u, v] = polar(m.mag, S.phi);
            dot(u, v, 6.5, COL.match);
            const st = polar(1, m.a0); dot(st[0], st[1], 5.5, COL.ink);
            text(sh ? .96 : -.96, .09, sh ? 'short (y = ∞)' : 'open (y = 0)', {anchor: sh ? 'end' : 'start', size:12, op:seg(p, .1, .35)});
            rimArc(m.a0, 2*TAU*S.l, ease(seg(p, .25, .9)), COL.match);
            const e = seg(p, .9, 1);
            if (e > 0){ const [tu, tv] = polar(1, S.phit); dot(tu, tv, 5.5, COL.match); ringText(S.phit, `l₁ = ${f(S.l)}λ`, COL.match, e); }
          },
          rd: m => ['Stub length, solution 1', `${fj(m.sols[0].bs)} → l₁ = ${f(m.sols[0].l)}λ`] },
        { dur:3200,
          info: m => { const T = m.sols[1]; return { title:'The second solution',
            body:`<p>Keep turning: the VSWR circle meets the g = 1 circle again at <b>B</b>, where y = ${fc(1, T.b)}. A stub there needs ${fj(T.bs)}.</p>`,
            work:`d₂ = <b>${f(T.d)}λ</b><br>l₂ = <b>${f(T.l)}λ</b>` }; },
          draw: (m, p) => {
            const S = m.sols[0], T = m.sols[1], q = ease(seg(p, 0, .6));
            arcCW(m.mag, S.phi, 2*TAU*(T.d - S.d), q, COL.purple, 2.4, {opacity:.5});
            const e = seg(p, .55, 1);
            if (e > 0){ const [u, v] = polar(m.mag, T.phi); dot(u, v, 6, COL.match); pointLabel(u, v, `B: y = ${fc(1, T.b)}`, COL.match, e, .05, [-1, 0]); rimArc(m.a0, 2*TAU*T.l, ease(e), COL.match, true, .955); if (e >= 1){ const [tu, tv] = polar(.955, T.phit); dot(tu, tv, 5, COL.match); } }
          },
          rd: m => ['Solution 2', `d₂ = ${f(m.sols[1].d)}λ, l₂ = ${f(m.sols[1].l)}λ`] },
        stAnswer()],
      answer: m => { const [S, T] = m.sols; return [
        {tone:'y', k:'Solution 1', v:`d = ${f(S.d)}λ<br>l = ${f(S.l)}λ`, s:`stub gives ${fj(S.bs)}`},
        {tone:'s1', k:'Solution 2', v:`d = ${f(T.d)}λ<br>l = ${f(T.l)}λ`, s:`stub gives ${fj(T.bs)}`}]; },
      note: m => `d is measured from the load to the stub. Both answers work; the shorter one is usually preferred because it is less sensitive to frequency. The stub is ${m.stub}-circuited.`,
      keys: m => m.sols.map(S => [...polar(m.mag, S.phi), COL.match]) },

    // 6 ----------------------------------------------------------------
    { id:'quarter-wave', title:'Quarter-wave transformer', desc:'Where to put it and its Z<sub>0</sub>′', glyph:glyph('qw'),
      fields:['Z0', 'RL', 'XL'], defaults:{Z0:'50', RL:'100', XL:'50'},
      compute: v => {
        const m = loadModel(v); noMatchErr(m);
        const mx = {kind:'max', d:m.dmax, a:0, r:m.s, u:m.mag}, mn = {kind:'min', d:m.dmin, a:PI, r:1/m.s, u:-m.mag};
        [mx, mn].forEach(o => { o.R = m.Z0*o.r; o.Zq = Math.sqrt(m.Z0*o.R); });
        const firstMax = m.dmax <= m.dmin;
        return Object.assign(m, {o1: firstMax ? mx : mn, o2: firstMax ? mn : mx});
      },
      problem: m => ({ lede:`Match a ${fc(m.RL, m.XL, 2)} Ω load to a ${f(m.Z0)} Ω line with a quarter-wave transformer. Find where to put it and its characteristic impedance.`, chips:[chipZ0(m), chipZL(m)], find:'find d and Z<sub>0</sub>′' }),
      steps: () => [stIntro(), stNormalize(), stPlot(), stVswr(),
        { dur:3200,
          info: m => { const o = m.o1; return { title:'Turn to the horizontal axis',
            body:`<p>A quarter-wave transformer only matches a <b>real</b> impedance. Turn clockwise from P to the first point where the line looks purely resistive: the ${o.kind === 'max' ? '<b>right</b> half (a voltage maximum)' : '<b>left</b> half (a voltage minimum)'}.</p>`,
            work:`d = <b>${f(o.d)}λ</b> from the load<br>r there = ${o.kind === 'max' ? 'VSWR' : '1/VSWR'} = ${f(o.r)}` }; },
          draw: (m, p) => {
            const o = m.o1, q = ease(seg(p, 0, .8));
            arcCW(m.mag, m.th, 2*TAU*o.d, q, COL.purple);
            if (q > 0 && q < 1) movingDot(m.mag, m.th - 2*TAU*o.d*q, COL.purple);
            const e = seg(p, .8, 1);
            if (e > 0){ dot(o.u, 0, 6.5, COL.purple); text(o.u + (o.u > 0 ? .02 : -.02), .075, `d = ${f(o.d)}λ`, {color:COL.purple, size:13, op:e, anchor: (o.u > 0) === (m.mag <= .7) ? 'start' : 'end'}); }
            dot(m.gu, m.gv, 6, COL.ink);
          },
          rd: m => ['Turn to the real axis', `d = ${f(m.o1.d)}λ, r = ${f(m.o1.r)}`] },
        { dur:1800,
          info: m => ({ title:'The line is resistive here', body:`<p>At this point the line impedance is real: R = Z<sub>0</sub> × r. This is where the transformer goes.</p>`, work:`R = ${f(m.Z0)} × ${f(m.o1.r)} = <b>${f(m.o1.R, 2)} Ω</b>` }),
          draw: (m, p) => { const o = m.o1; text(o.u + (o.u > 0 ? .02 : -.02), -.17, `R = ${f(o.R, 1)} Ω`, {color:COL.purple, size:12.5, op:seg(p, 0, .6), anchor: (o.u > 0) === (m.mag <= .7) ? 'start' : 'end'}); },
          rd: m => ['Resistance there', `R = ${f(m.o1.R, 2)} Ω`] },
        { dur:2600,
          info: m => ({ title:'Size the λ/4 section',
            body:`<p>A λ/4 section of impedance Z<sub>0</sub>′ turns R into Z<sub>0</sub>′²/R. Make that equal Z<sub>0</sub> and the line is matched: the point jumps to the centre.</p>`,
            work:`Z<sub>0</sub>′ = √(Z<sub>0</sub> · R) = √(${f(m.Z0)} × ${f(m.o1.R, 2)})<br>&nbsp;&nbsp;&nbsp;&nbsp;= <b>${f(m.o1.Zq, 2)} Ω</b>` }),
          draw: (m, p) => {
            const o = m.o1; curveArrow([o.u, 0], [0, 0], o.u > 0 ? .5 : -.5, ease(seg(p, 0, .7)), COL.match);
            const e = seg(p, .6, 1); if (e > 0){ dot(0, 0, 6, COL.match); text(o.u/2, -Math.abs(o.u)/4 - .07, `λ/4 of ${f(o.Zq, 1)} Ω`, {color:COL.match, size:12.5, op:e}); }
          },
          rd: m => ['Transformer impedance', `Z<sub>0</sub>′ = ${f(m.o1.Zq, 2)} Ω`] },
        { dur:2800,
          info: m => { const o = m.o2; return { title:'The other position',
            body:`<p>λ/4 further along, the line is resistive again, at the ${o.kind === 'max' ? 'right crossing (a voltage maximum)' : 'left crossing (a voltage minimum)'}. A transformer there works too.</p>`,
            work:`d = ${f(o.d)}λ, R = ${f(o.R, 2)} Ω<br>Z<sub>0</sub>′ = √(${f(m.Z0)} × ${f(o.R, 2)}) = <b>${f(o.Zq, 2)} Ω</b>` }; },
          draw: (m, p) => {
            const o = m.o2, q = ease(seg(p, 0, .8));
            arcCW(m.mag, m.o1.a, PI, q, COL.purple, 2.4, {opacity:.5});
            if (q > 0 && q < 1) movingDot(m.mag, m.o1.a - PI*q, COL.purple);
            const e = seg(p, .8, 1);
            if (e > 0){ dot(o.u, 0, 6, COL.purple); text(o.u + (o.u > 0 ? .02 : -.02), .075, `d = ${f(o.d)}λ`, {color:COL.purple, size:13, op:e, anchor: (o.u > 0) === (m.mag <= .7) ? 'start' : 'end'}); }
          },
          rd: m => ['Other option', `d = ${f(m.o2.d)}λ, Z<sub>0</sub>′ = ${f(m.o2.Zq, 2)} Ω`] },
        stAnswer()],
      answer: m => [
        {tone:'y', k:'Option 1 (nearest the load)', v:`d = ${f(m.o1.d)}λ<br>Z<sub>0</sub>′ = ${f(m.o1.Zq, 1)} Ω`, s:`line is ${f(m.o1.R, 1)} Ω there (V ${m.o1.kind})`},
        {tone:'s1', k:'Option 2', v:`d = ${f(m.o2.d)}λ<br>Z<sub>0</sub>′ = ${f(m.o2.Zq, 1)} Ω`, s:`line is ${f(m.o2.R, 1)} Ω there (V ${m.o2.kind})`}],
      note: () => 'd is measured from the load to the start of the transformer. The transformer itself is 0.25λ long.',
      keys: m => [[m.o1.u, 0, COL.purple], [0, 0, COL.match]] },

    // 7 ----------------------------------------------------------------
    { id:'stub-length', title:'Stub reactance & length', desc:'Z<sub>in</sub> of a short or open stub, or its length', glyph:glyph('sx'),
      fields:['Z0', 'stub', 'find', 'lst', 'X', 'lam'], defaults:{Z0:'50', stub:'short', find:'zin', lst:'0.1', lst_u:'lam', X:'100', lam:''},
      compute: v => {
        needNum(v.Z0, 'Z₀'); if (v.Z0 <= 0) throw new Error('Z₀ must be greater than 0.');
        const sh = v.stub === 'short', a0 = sh ? PI : 0, m = {Z0:v.Z0, stub:v.stub, find:v.find, a0, w0:wtgA(a0)};
        if (v.find === 'zin'){
          const L = lenIn(v, 'lst', 'stub length'), t = Math.tan(TAU*L.lam);
          let x = sh ? t : (Math.abs(t) < 1e-12 ? -Infinity : -1/t); if (Math.abs(x) > 1e9) x = Infinity;
          Object.assign(m, {l:L.lam, lText:L.text, lConv:L.conv, sweep:2*TAU*mod(L.lam, .5), x});
          m.aE = a0 - m.sweep;
        } else {
          needNum(v.X, 'the reactance');
          const x = v.X/v.Z0, aE = ang(toG([0, x])), l = cw(a0, aE);
          Object.assign(m, {x, aE, l, lText:`${f(l)}λ`, lConv:null, sweep:2*TAU*l});
        }
        m.X = isFinite(m.x) ? m.x*m.Z0 : m.x; m.wE = wtgA(m.aE); m.xChart = fromG(polar(1, m.aE))[1];
        return Object.assign(m, {mag:1, th:m.aE, s:Infinity, gu:Math.cos(m.aE), gv:Math.sin(m.aE), dmax:cw(m.aE, 0), dmin:cw(m.aE, PI)});
      },
      problem: m => m.find === 'zin'
        ? { lede:`A ${m.stub}-circuited ${f(m.Z0)} Ω stub is ${m.lText} long. Find its input impedance.`, chips:[chipZ0(m), `${m.stub}-circuited`, `l = ${m.lText}`], find:'find Z<sub>in</sub>' }
        : { lede:`Find the length of a ${m.stub}-circuited ${f(m.Z0)} Ω stub whose input impedance is ${fj(m.X, 2)} Ω.`, chips:[chipZ0(m), `${m.stub}-circuited`, `X<sub>in</sub> = ${f(m.X, 2)} Ω`], find:'find the length' },
      steps: m => {
        const sh = m.stub === 'short';
        const start = { dur:2000,
          info: m => ({ title:`Start at the ${sh ? 'short' : 'open'} circuit`,
            body:`<p>${sh ? 'A short circuit is z = 0: the <b>left</b> end of the horizontal axis.' : 'An open circuit is z = ∞: the <b>right</b> end of the horizontal axis.'} A lossless stub reflects everything (|Γ| = 1), so moving along it keeps you on the <b>rim</b> of the chart.</p>`,
            work:`WTG reading at the ${sh ? 'short' : 'open'}: <b>${f(m.w0)}λ</b>` }),
          draw: (m, p) => { const e = ease(p), [u, v] = polar(1, m.a0); dot(u, v, 6.5*e, COL.ink); text(u + (sh ? .03 : -.03), v - .075, sh ? 'short (z = 0)' : 'open (z = ∞)', {anchor: sh ? 'start' : 'end', op:e, size:13}); radial(m.a0, e, COL.ink); },
          rd: m => ['Start point', `${sh ? 'short' : 'open'} circuit at ${f(m.w0)}λ`] };
        const moveTo = (title, body, work, rd) => ({ dur:3000, info: m => ({title, body, work}),
          draw: (m, p) => {
            const q = ease(seg(p, 0, .85)); rimArc(m.a0, m.sweep, q, COL.purple);
            if (q > 0 && q < 1) movingDot(.982, m.a0 - m.sweep*q, COL.purple);
            const e = seg(p, .85, 1);
            if (e > 0){ const [u, v] = polar(1, m.aE); dot(u, v, 6.5, COL.purple); radial(m.aE, e, COL.purple); ringText(m.aE, `${f(m.wE)}λ`, COL.purple, e); }
            const [su, sv] = polar(1, m.a0); dot(su, sv, 6, COL.ink);
          }, rd });
        if (m.find === 'zin') return [stIntro(), start,
          moveTo(`Move ${m.lText} toward the generator`, `<p>Turn <b>clockwise</b> around the rim by ${f(m.l)}λ.${m.l >= .5 ? ' The chart repeats every 0.5λ.' : ''}</p>`,
            `${m.lConv ? m.lConv + '<br>' : ''}${f(m.w0)}λ + ${f(m.l)}λ = ${f(m.w0 + m.l)}λ${m.w0 + m.l >= .5 ? ` → ${f(m.wE)}λ` : ''}`,
            m => [`Move ${m.lText} along the rim`, `${f(m.w0)}λ → ${f(m.wE)}λ`]),
          { dur:2200,
            info: m => ({ title:'Read the input reactance',
              body:`<p>The end point is on the rim, so the stub's input impedance is a pure reactance. Read the x arc through it${isFinite(m.x) ? (m.x > 0 ? ': it is inductive' : m.x < 0 ? ': it is capacitive' : '') : ''}.</p>`,
              work:`chart: z<sub>in</sub> = ${fj(m.xChart)}<br><span class="c">formula: ${sh ? 'jZ₀ tan βl' : '−jZ₀ cot βl'} → x = ${isFinite(m.x) ? f(m.x) : '∞'}</span><br>Z<sub>in</sub> = <b>${fj(m.X, 2)} Ω</b>` }),
            draw: (m, p) => { const [u, v] = polar(1, m.aE); if (isFinite(m.x)) stroke(xPts(m.x), ease(seg(p, 0, .7)), COL.blue, 2.2, {opacity:.85}); dot(u, v, 6.5, COL.purple); pointLabel(u, v, `z = ${fj(m.x)}`, COL.purple, seg(p, .55, 1), .1); },
            rd: m => ['Read the reactance', `Z<sub>in</sub> = ${fj(m.X, 2)} Ω`] },
          stAnswer()];
        return [stIntro(), start,
          { dur:2400,
            info: m => ({ title:`Find x = ${f(m.x)} on the rim`, body:`<p>Normalize the reactance, x = X/Z<sub>0</sub>, then follow the ${fj(m.x)} arc out to the rim.</p>`, work:`x = ${f(m.X)}/${f(m.Z0)} = <b>${f(m.x)}</b><br>that point reads ${f(m.wE)}λ` }),
            draw: (m, p) => { stroke(xPts(m.x), ease(seg(p, 0, .7)), COL.blue, 2.4); const e = seg(p, .7, 1); if (e > 0){ const [u, v] = polar(1, m.aE); dot(u, v, 6.5, COL.blue); radial(m.aE, e, COL.blue); ringText(m.aE, `${f(m.wE)}λ`, COL.blue, e); } },
            rd: m => ['Target on the rim', `x = ${f(m.x)} at ${f(m.wE)}λ`] },
          moveTo('Measure the stub length', `<p>Turn clockwise from the ${sh ? 'short' : 'open'} circuit to the target. The distance on the outer scale is the stub length.</p>`,
            `l = ${f(m.wE)}λ − ${f(m.w0)}λ${m.wE < m.w0 ? ' + 0.5λ' : ''} = <b>${f(m.l)}λ</b>`,
            m => ['Stub length', `l = ${f(m.l)}λ`]),
          stAnswer()];
      },
      answer: m => m.find === 'zin'
        ? [{tone:'y', k:'Input impedance', v:`Z<sub>in</sub> = ${fj(m.X, 2)} Ω`, s:`${!isFinite(m.x) ? 'acts as an open circuit' : m.x > 0 ? 'inductive' : m.x < 0 ? 'capacitive' : 'acts as a short circuit'}, z<sub>in</sub> = ${fj(m.x)}`}]
        : [{tone:'y', k:'Stub length', v:`l = ${f(m.l)}λ`, s:`gives Z<sub>in</sub> = ${fj(m.X, 2)} Ω; adding 0.5λ gives the same`}],
      extras:false,
      keys: m => [[...polar(1, m.aE), COL.purple]] },

    // 8 ----------------------------------------------------------------
    { id:'double-stub', title:'Double-stub matching', desc:'Two stub lengths for a fixed spacing', glyph:glyph('ds'),
      fields:['Z0', 'RL', 'XL', 'stub', 'd0', 'dsp'], defaults:{Z0:'50', RL:'60', XL:'-80', stub:'short', d0:'0', dsp:'0.125'},
      compute: v => {
        const m = loadModel(v, {needY:true}); noMatchErr(m);
        const d0 = needNum(v.d0, 'the stub 1 distance'), dsp = needNum(v.dsp, 'the stub spacing');
        if (d0 < 0) throw new Error('The stub 1 distance can’t be negative.');
        if (!(dsp > 0 && dsp < .5)) throw new Error('The stub spacing must be between 0 and 0.5λ (λ/8 = 0.125 and 3λ/8 = 0.375 are common).');
        const thy = ang([m.yu, m.yv]), G1 = polar(m.mag, thy - 2*TAU*d0), y1 = fromG(G1), g1 = y1[0], b1 = y1[1];
        const gmax = 1/Math.pow(Math.sin(TAU*dsp), 2), cR = polar(.5, 2*TAU*dsp);
        const pts = circleIntersect([g1/(1 + g1), 0], 1/(1 + g1), cR, .5);
        if (!pts.length) throw new Error(`No solution: at stub 1, g = ${f(g1)} is in the forbidden region (g > 1/sin²βd = ${f(gmax)}). Move stub 1 (change its distance from the load) or change the spacing.`);
        const a0 = v.stub === 'short' ? 0 : PI;
        const sols = pts.map(Q => {
          const yQ = fromG(Q), bs1 = yQ[1] - b1, G2 = rot(Q, -2*TAU*dsp), y2 = fromG(G2), bs2 = -y2[1];
          return {Q, yQ, bs1, G2, y2, bs2, l1:stubLen(bs1, a0), l2:stubLen(bs2, a0)};
        }).sort((a, b) => (a.l1 + a.l2) - (b.l1 + b.l2));
        return Object.assign(m, {thy, d0, dsp, G1, g1, b1, gmax, cR, stub:v.stub, a0, sols});
      },
      problem: m => ({ lede:`Match a ${fc(m.RL, m.XL, 2)} Ω load to a ${f(m.Z0)} Ω line with two ${m.stub}-circuited shunt stubs ${f(m.dsp)}λ apart, the first ${m.d0 > 0 ? f(m.d0) + 'λ from the load' : 'at the load'}. Find both stub lengths.`, chips:[chipZ0(m), chipZL(m), `spacing ${f(m.dsp)}λ`], find:'find l₁ and l₂' }),
      steps: m => [stIntro(), stNormalize(), stPlot(), stVswr(),
        stToY('Both stubs are in <b>shunt</b>, so work with admittances.'),
        { dur: m.d0 > 0 ? 2800 : 1400,
          info: m => ({ title: m.d0 > 0 ? `Move ${f(m.d0)}λ to stub 1` : 'Stub 1 is at the load',
            body: m.d0 > 0 ? `<p>Turn clockwise by ${f(m.d0)}λ along the VSWR circle to reach the first stub. Read y₁ there.</p>` : `<p>The first stub sits right at the load, so y₁ = y<sub>L</sub>.</p>`,
            work:`y₁ = <b>${fc(m.g1, m.b1)}</b>` }),
          draw: (m, p) => {
            if (m.d0 > 0){ const q = ease(seg(p, 0, .8)); arcCW(m.mag, m.thy, 2*TAU*m.d0, q, COL.purple, 2.6, {opacity:.7}); if (q > 0 && q < 1) movingDot(m.mag, m.thy - 2*TAU*m.d0*q, COL.purple); const e = seg(p, .8, 1); if (e > 0){ dot(m.G1[0], m.G1[1], 6.5, COL.purple); pointLabel(m.G1[0], m.G1[1], `y₁ = ${fc(m.g1, m.b1)}`, COL.purple, e); } }
            else if (p < 1) ring(m.G1[0], m.G1[1], 7 + 18*p, COL.purple, 1 - p);
          },
          rd: m => ['Admittance at stub 1', `y₁ = ${fc(m.g1, m.b1)}`] },
        { dur:2800,
          info: m => ({ title:'Rotate the g = 1 circle toward the load',
            body:`<p>Stub 2 needs g = 1 at its own position. Seen from stub 1, which is ${f(m.dsp)}λ closer to the load, that circle is turned <b>anticlockwise</b> by ${f(m.dsp)}λ (${f(720*m.dsp, 1)}°). Draw the g = 1 circle and its rotated copy.</p>`,
            work:`rotation = 720° × ${f(m.dsp)} = <b>${f(720*m.dsp, 1)}°</b><br><span class="c">Forbidden region: g > 1/sin²(βd) = ${f(m.gmax)}. Here g₁ = ${f(m.g1)}, so a match is possible.</span>` }),
          draw: (m, p) => {
            stroke(rPts(1), ease(seg(p, 0, .5)), COL.match, 2.2, {opacity:.9});
            const ac = ang(m.cR); stroke(circlePts(m.cR[0], m.cR[1], .5, ac + PI, ac + PI - TAU, 240), ease(seg(p, .35, 1)), COL.match, 2.2, {'stroke-dasharray':'6 4'});
            const e = seg(p, .6, 1); text(.5, .56, 'g = 1', {color:COL.match, size:12.5, op:e}); text(m.cR[0], m.cR[1], 'rotated', {color:COL.match, size:12, op:e});
          },
          rd: m => ['Rotate the g = 1 circle', `${f(720*m.dsp, 1)}° toward the load`] },
        { dur:3200,
          info: m => { const S = m.sols[0]; return { title:'Stub 1: slide along the constant-g circle',
            body:`<p>Stub 1 adds susceptance only, so y₁ slides along its own <b>g = ${f(m.g1)}</b> circle until it meets the rotated circle at <b>Q</b>.</p>`,
            work:`y at Q = ${fz(S.yQ)}<br>stub 1 adds j(${f(S.yQ[1])} − ${f(m.b1)}) = <b>${fj(S.bs1)}</b><br>→ l₁ = <b>${f(S.l1)}λ</b>` }; },
          draw: (m, p) => {
            const S = m.sols[0];
            stroke(rPts(m.g1), ease(seg(p, 0, .4)), COL.red, 1.6, {'stroke-dasharray':'5 4', opacity:.7});
            stroke(gPath(m.g1, m.G1, S.Q), ease(seg(p, .3, .9)), COL.purple, 3.2);
            const e = seg(p, .85, 1); if (e > 0){ dot(S.Q[0], S.Q[1], 6.5, COL.purple); pointLabel(S.Q[0], S.Q[1], 'Q', COL.purple, e, .07); }
            dot(m.G1[0], m.G1[1], 6, COL.purple);
          },
          rd: m => ['Stub 1', `${fj(m.sols[0].bs1)} → l₁ = ${f(m.sols[0].l1)}λ`] },
        { dur:3000,
          info: m => ({ title:`Move ${f(m.dsp)}λ to stub 2`,
            body:`<p>Turn clockwise by ${f(m.dsp)}λ around Q's own VSWR circle. Q lands exactly on the g = 1 circle, at <b>R</b>.</p>`,
            work:`y₂ = <b>${fz(m.sols[0].y2)}</b>` }),
          draw: (m, p) => {
            const S = m.sols[0], rq = Math.hypot(S.Q[0], S.Q[1]);
            stroke(circlePts(0, 0, rq, 0, -TAU, 220), ease(seg(p, 0, .3)), COL.green, 1.2, {'stroke-dasharray':'3 4', opacity:.6});
            const q = ease(seg(p, .2, .85)); arcCW(rq, ang(S.Q), 2*TAU*m.dsp, q, COL.purple);
            if (q > 0 && q < 1) movingDot(rq, ang(S.Q) - 2*TAU*m.dsp*q, COL.purple);
            const e = seg(p, .85, 1); if (e > 0){ dot(S.G2[0], S.G2[1], 6.5, COL.match); pointLabel(S.G2[0], S.G2[1], `R: y = ${fz(S.y2)}`, COL.match, e); }
          },
          rd: m => ['Admittance at stub 2', `y₂ = ${fz(m.sols[0].y2)}`] },
        { dur:3000,
          info: m => { const S = m.sols[0], sh = m.stub === 'short'; return { title:'Stub 2 cancels the rest',
            body:`<p>Stub 2 adds <b>${fj(S.bs2)}</b>, which leaves y = 1: matched. Both stub lengths come off the rim, starting from the ${sh ? 'short-circuit point (right end)' : 'open-circuit point (left end)'}.</p>`,
            work:`stub 1: ${fj(S.bs1)} → l₁ = <b>${f(S.l1)}λ</b><br>stub 2: ${fj(S.bs2)} → l₂ = <b>${f(S.l2)}λ</b>` }; },
          draw: (m, p) => {
            const S = m.sols[0];
            curveArrow(S.G2, [0, 0], .3, ease(seg(p, 0, .5)), COL.match);
            const e = seg(p, .4, 1);
            if (e > 0){
              dot(0, 0, 6, COL.match);
              rimArc(m.a0, 2*TAU*S.l1, ease(e), COL.purple, false, .982); rimArc(m.a0, 2*TAU*S.l2, ease(e), COL.match, true, .952);
              if (e >= 1){ ringText(m.a0 - 2*TAU*S.l1, `l₁ = ${f(S.l1)}λ`, COL.purple); ringText(m.a0 - 2*TAU*S.l2, `l₂ = ${f(S.l2)}λ`, COL.match); }
            }
          },
          rd: m => ['Stub 2', `${fj(m.sols[0].bs2)} → l₂ = ${f(m.sols[0].l2)}λ`] },
        ...(m.sols.length > 1 ? [{ dur:3000,
          info: m => { const T = m.sols[1]; return { title:'The second solution',
            body:`<p>The g = ${f(m.g1)} circle cuts the rotated circle a second time, at Q′. The same steps from there give another pair of stubs.</p>`,
            work:`stub 1: ${fj(T.bs1)} → l₁ = <b>${f(T.l1)}λ</b><br>stub 2: ${fj(T.bs2)} → l₂ = <b>${f(T.l2)}λ</b>` }; },
          draw: (m, p) => {
            const T = m.sols[1], rq = Math.hypot(T.Q[0], T.Q[1]);
            stroke(gPath(m.g1, m.G1, T.Q), ease(seg(p, 0, .5)), COL.purple, 2.4, {'stroke-dasharray':'6 4', opacity:.7});
            const e = seg(p, .45, 1);
            if (e > 0){ dot(T.Q[0], T.Q[1], 5.5, COL.purple); pointLabel(T.Q[0], T.Q[1], 'Q′', COL.purple, e, .07); arcCW(rq, ang(T.Q), 2*TAU*m.dsp, ease(e), COL.purple, 2.2, {'stroke-dasharray':'6 4', opacity:.6}); if (e >= 1){ dot(T.G2[0], T.G2[1], 5.5, COL.match); pointLabel(T.G2[0], T.G2[1], 'R′', COL.match, 1, .07); } }
          },
          rd: m => ['Solution 2', `l₁ = ${f(m.sols[1].l1)}λ, l₂ = ${f(m.sols[1].l2)}λ`] }] : []),
        stAnswer()],
      answer: m => m.sols.map((S, i) => ({tone: i ? 's1' : 'y', k:`Solution ${i + 1}`, v:`l₁ = ${f(S.l1)}λ<br>l₂ = ${f(S.l2)}λ`, s:`stubs give ${fj(S.bs1, 2)} and ${fj(S.bs2, 2)}`})),
      note: m => `Stub 1 is ${m.d0 > 0 ? f(m.d0) + 'λ from the load' : 'at the load'}; stub 2 is ${f(m.dsp)}λ further toward the generator. Both are ${m.stub}-circuited.`,
      keys: m => [[0, 0, COL.match]] }
  ];

  const FIELDS = {
    Z0:{label:'Z<sub>0</sub> (Ω)'}, RL:{label:'R<sub>L</sub> (Ω)'}, XL:{label:'X<sub>L</sub> (Ω)'}, S:{label:'VSWR'},
    l:{label:'Line length', type:'len'},
    dmin:{label:'First V<sub>min</sub> from the load', type:'len'},
    lst:{label:'Stub length', type:'len', showIf: v => v.find === 'zin'},
    X:{label:'Wanted X<sub>in</sub> (Ω)', showIf: v => v.find === 'len'},
    lam:{label:'Wavelength λ (cm)', showIf: (v, md) => md.fields.some(k => FIELDS[k].type === 'len' && v[k + '_u'] === 'cm' && (!FIELDS[k].showIf || FIELDS[k].showIf(v, md)))},
    stub:{label:'Stub end', type:'select', options:[['short', 'Short-circuited'], ['open', 'Open-circuited']]},
    find:{label:'Find', type:'select', options:[['zin', 'Input impedance from length'], ['len', 'Length from reactance']]},
    d0:{label:'Stub 1 from the load (λ)'}, dsp:{label:'Stub spacing (λ)'}
  };
  MODES.forEach(md => { md.vals = Object.assign({}, md.defaults); });

  function waveSpec(m, id){
    const S = {segs:[{d:0, G:polar(Math.min(m.mag, 1), m.th)}], marks:[], spans:[], end:'ZL', cap:''};
    const vs = `VSWR <b>${fS(m.s)}</b>`;
    if (id === 'admittance'){
      S.marks = [{d:m.dmax, t:'V max'}, {d:m.dmin, t:'V min'}, {d:.25, t:`z here = yL = ${fc(m.g, m.b, 2)}`}];
      S.cap = `The wave swings between 1 + |Γ| = <b>${f(1 + m.mag, 2)}</b> and 1 − |Γ| = <b>${f(1 - m.mag, 2)}</b>, so ${vs}. A quarter-wave from the load the normalized impedance equals <b>y<sub>L</sub> = ${fc(m.g, m.b, 2)}</b>.`;
    } else if (id === 'input-impedance'){
      const Zin = [m.zin[0]*m.Z0, m.zin[1]*m.Z0];
      S.marks = [{d:m.l, t:`input: Zin = ${fc(Zin[0], Zin[1], 1)} Ω`}];
      S.cap = `The line is <b>${m.lText}</b> long (marked). Looking in at that end, the impedance is <b>Z<sub>in</sub> = ${fc(Zin[0], Zin[1], 2)} Ω</b>. The standing wave is the same all along the line: ${vs}.`;
    } else if (id === 'max-min'){
      S.marks = [{d:m.dmax, t:`V max: Z = ${f(m.Z0*m.s, 1)} Ω`}, {d:m.dmin, t:`V min: Z = ${f(m.Z0/m.s, 1)} Ω`}];
      S.cap = `First maximum <b>${f(m.dmax)}λ</b> from the load (Z = ${f(m.Z0*m.s, 1)} Ω), first minimum <b>${f(m.dmin)}λ</b> (Z = ${f(m.Z0/m.s, 1)} Ω). They repeat every 0.5λ. ${vs}.`;
    } else if (id === 'load-from-vswr'){
      S.marks = [{d:m.dm, t:`V min (measured) at ${m.dText}`}];
      S.cap = `Measured: ${vs}, first minimum <b>${m.dText}</b> from the load. Only a load of <b>Z<sub>L</sub> = ${fc(m.RL, m.XL, 1)} Ω</b> gives this wave.`;
    } else if (id === 'single-stub'){
      const [A, B] = m.sols;
      S.segs.push({d:A.d, G:[0, 0]});
      S.marks = [{d:A.d, t:`stub here: l = ${f(A.l)}λ`}];
      S.cap = `With the ${m.stub}-circuited stub at <b>d = ${f(A.d)}λ</b> (l = <b>${f(A.l)}λ</b>), the line from the stub to the generator carries a plain travelling wave: flat envelope, VSWR 1. Between the stub and the load the original ${vs} remains. The other answer is d = ${f(B.d)}λ, l = ${f(B.l)}λ.`;
    } else if (id === 'quarter-wave'){
      const o = m.o1;
      S.segs.push({d:o.d, G:[(o.R - o.Zq)/(o.R + o.Zq), 0]}, {d:o.d + .25, G:[0, 0]});
      S.spans = [{a:o.d, b:o.d + .25, t:`λ/4 section, Z0′ = ${f(o.Zq, 1)} Ω`}];
      S.marks = [{d:o.d, t:`transformer starts: d = ${f(o.d)}λ`}];
      S.cap = `The λ/4 section (Z<sub>0</sub>′ = <b>${f(o.Zq, 2)} Ω</b>) starts <b>${f(o.d)}λ</b> from the load, where the line looks like ${f(o.R, 1)} Ω. Beyond it the line is matched: flat envelope, VSWR 1.`;
    } else if (id === 'stub-length'){
      const sh = m.stub === 'short';
      S.segs = [{d:0, G:[sh ? -1 : 1, 0]}]; S.end = sh ? 'short' : 'open';
      S.marks = [{d:m.l, t:`stub input: Zin = ${fj(m.X, 1)} Ω`}];
      S.cap = `A ${sh ? 'short' : 'open'} circuit reflects everything, so the envelope falls to zero every λ/2. The stub is <b>${f(m.l)}λ</b> long (marked), and its input impedance is <b>${fj(m.X, 2)} Ω</b>.`;
    } else if (id === 'double-stub'){
      const T = m.sols[0];
      S.segs.push({d:m.d0, G:[-T.Q[0], -T.Q[1]]}, {d:m.d0 + m.dsp, G:[0, 0]});
      S.marks = [{d:m.d0, t:`stub 1: l1 = ${f(T.l1)}λ`}, {d:m.d0 + m.dsp, t:`stub 2: l2 = ${f(T.l2)}λ`}];
      S.cap = `Stub 1 (<b>l₁ = ${f(T.l1)}λ</b>) changes the wave between the stubs; stub 2 (<b>l₂ = ${f(T.l2)}λ</b>), ${f(m.dsp)}λ further on, removes what is left. From stub 2 to the generator the envelope is flat: VSWR 1.`;
    }
    return S;
  }
  return {MODES, FIELDS, waveSpec};
};
