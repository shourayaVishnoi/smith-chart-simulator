// Dielectric-filled transmission lines: question types for the formula walkthrough engine.
window.FORMULA_PAGE = (G) => {
  'use strict';
  const {C, PI, TAU, clamp, num, si, fix} = G;
  const C0 = 3e8, EPS0 = 8.854e-12, MU0 = 4*PI*1e-7;

  function need(v, what){ if (!isFinite(v)) throw new Error(`Enter a number for ${what}.`); return v; }
  function pos(v, what){ need(v, what); if (v <= 0) throw new Error(`${/^[a-z]/.test(what) ? what[0].toUpperCase() + what.slice(1) : what} must be greater than 0.`); return v; }
  function erOk(v){ need(v, 'ε_r'); if (v < 1) throw new Error('ε_r must be at least 1.'); return v; }
  const cardsHTML = cards => `<div class="answer">${cards.filter(Boolean).map(c => `<div class="ans ${c.tone || 'y'}"><div class="k">${c.k}</div><div class="v">${c.v}</div><div class="s">${c.s || ''}</div></div>`).join('')}</div>`;
  const MODE_OF = m => MODES.find(x => x.id === m.id);
  const answerStep = () => ({ dur:1600, show:[], info: m => ({ title:'Answer', body: cardsHTML(MODE_OF(m).answer(m)) + (MODE_OF(m).note ? `<p>${MODE_OF(m).note(m)}</p>` : ''), work:'' }) });
  const fq = m => si(m.fr, 'Hz');

  // ---------- scenes ----------
  function waveLane(x0, x1, y, amp, lam, span, phase, color, a, label){
    const pts = [];
    for (let i = 0; i <= 500; i++){ const s = span*i/500; pts.push([x0 + (x1 - x0)*i/500, y - amp*Math.cos(phase - TAU*s/lam)]); }
    G.line(x0, y, x1, y, C.faint, 1, {a});
    G.path(pts, color, 2.4, {glow:10, a});
    G.text(label, x0, y - amp - 16, {color, size:13, weight:700, a});
  }
  function sceneVelocity(m, S){
    const {W, H, vis, t} = S, x0 = 40, x1 = W - 30, span = 2.2*m.lam0, phase = t*TAU*0.35;
    const X = s => x0 + (x1 - x0)*s/span, amp = Math.min(46, H*0.1);
    const ya = H*0.3, yl = H*0.66;
    waveLane(x0, x1, ya, amp, m.lam0, span, phase, C.cyan, vis('air'), 'in air (free space)');
    waveLane(x0, x1, yl, amp, m.lam, span, phase, C.white, vis('line'), `in the line (ε_r = ${num(m.er)}${m.mr !== 1 ? `, μ_r = ${num(m.mr)}` : ''})`);
    const vb = vis('brk');
    if (vb > 0){
      const s0 = 0.05*span;
      G.bracket(X(s0), X(s0 + m.lam0), ya + amp + 24, `λ₀ = ${si(m.lam0, 'm', 3)}`, C.cyan, {a:vb});
      G.bracket(X(s0), X(s0 + m.lam), yl + amp + 24, `λ = ${si(m.lam, 'm', 3)}`, C.amber, {a:vb});
    }
    const vv = vis('vf');
    if (vv > 0){
      const bx = x0, by = H - 34, full = Math.min(320, (x1 - x0)*0.5);
      G.roundRect(bx, by - 7, full, 8, 4, 'rgba(124,198,190,.6)', {a:vv}); G.text('c', bx + full + 8, by + 1, {color:C.cyan, size:12.5, a:vv});
      G.roundRect(bx, by + 6, full*m.vf, 8, 4, 'rgba(255,255,255,.85)', {a:vv}); G.text(`v_p = ${num(m.vf, 3)} c`, bx + full*m.vf + 8, by + 14, {size:12.5, a:vv});
    }
    G.text('same frequency in both, so the slower wave is packed more tightly', (x0 + x1)/2, 30, {align:'center', color:C.muted, size:12.5, a:vis('line')});
  }
  function sceneElectrical(m, S){
    const {W, H, vis, t} = S, x0 = 50, x1 = W - 190, y = H*0.55, amp = Math.min(60, H*0.13), phase = t*TAU*0.35;
    const X = s => x0 + (x1 - x0)*s/m.len;
    const vlin = vis('line');
    G.line(x0, y - amp - 14, x1, y - amp - 14, 'rgba(255,255,255,.35)', 3, {a:vlin});
    G.line(x0, y + amp + 14, x1, y + amp + 14, 'rgba(255,255,255,.35)', 3, {a:vlin});
    if (m.len/m.lam < 40){
      const pts = []; for (let i = 0; i <= 700; i++){ const s = m.len*i/700; pts.push([X(s), y - amp*Math.cos(phase - TAU*s/m.lam)]); }
      G.path(pts, C.white, 2.4, {glow:10, a:vlin});
    } else G.text('too many wavelengths to draw: the line is ' + num(m.len/m.lam, 3) + 'λ long', (x0 + x1)/2, y + 4, {align:'center', color:C.muted, size:12.5, a:vlin});
    G.text(`l = ${si(m.len, 'm', 3)}`, (x0 + x1)/2, y + amp + 40, {align:'center', color:C.muted, size:12.5, a:vlin});
    const vt = vis('ticks');
    if (vt > 0){
      const n = m.len/m.lam, step = n > 16 ? Math.ceil(n/16) : 1;
      for (let k = 0; k <= n + 1e-9; k += step){ const x = X(k*m.lam); G.line(x, y - amp - 24, x, y - amp - 4, C.amber, 1.6, {a:vt}); G.text(`${k}λ`, x, y - amp - 30, {align:'center', color:C.amber, size:11.5, a:vt}); }
      G.text(`λ = ${si(m.lam, 'm', 3)} in the line`, x0, 30, {color:C.amber, size:12.5, a:vt});
      if (Math.abs(m.nl - Math.round(m.nl)) > 0.02){ G.line(x1, y - amp - 24, x1, y - amp - 4, C.pink, 1.6, {a:vt}); G.text(`${num(m.nl, 3)}λ`, x1, y - amp - 30, {align:'center', color:C.pink, size:11.5, a:vt}); }
    }
    const vd = vis('dial');
    if (vd > 0){
      const cx = W - 95, cy = y, r = Math.min(70, H*0.17), ang = (m.bl % 360)*PI/180*vd;
      G.circle(cx, cy, r, {stroke:'rgba(255,255,255,.25)', w:1.2, a:vd});
      if (ang > 0) G.circle(cx, cy, r - 8, {stroke:C.pink, w:6, a0:0, a1:-ang, ccw:true, a:vd, glow:8});
      G.arrow(cx, cy, cx + (r - 8)*Math.cos(-ang), cy + (r - 8)*Math.sin(-ang), C.white, 2, {a:vd});
      G.text(`βl = ${fix(m.bl, 1)}°`, cx, cy + r + 22, {align:'center', color:C.pink, size:13.5, weight:700, a:vd});
      if (m.bl >= 360) G.text(`(${fix(m.bl % 360, 1)}° after whole turns)`, cx, cy + r + 40, {align:'center', color:C.muted, size:11.5, a:vd});
    }
    const vy = vis('delay');
    if (vy > 0) G.text(`delay τ = l/v_p = ${si(m.tau, 's', 3)}`, x0, H - 22, {color:C.cyan, size:13, a:vy});
  }
  function fieldPulse(t){ return 0.55 + 0.45*Math.cos(t*TAU*0.45); }
  function sceneCoax(m, S){
    const {W, H, vis, t} = S, cx = W*0.4, cy = H*0.52, R = Math.min(H*0.38, W*0.3), r = R*m.a/m.b;
    const vg = vis('geom'), vE = vis('E'), vH = vis('H'), vz = vis('z0'), pulse = fieldPulse(t);
    G.circle(cx, cy, R + 7, {fill:'rgba(226,184,111,.25)', a:vg}); G.circle(cx, cy, R, {fill:'rgba(182,162,222,.22)', stroke:'rgba(226,184,111,.85)', w:2, a:vg});
    G.circle(cx, cy, r, {fill:'rgba(226,184,111,.85)', a:vg});
    G.text(`ε_r = ${num(m.er)}`, cx, cy + (R + r)/2 + 5, {align:'center', color:'#D5DCE4', size:12.5, a:vg});
    G.line(cx, cy, cx + r, cy, '#0F141A', 1.5, {a:vg}); G.text('a', cx + r/2, cy - 6, {align:'center', color:'#0F141A', size:12, weight:700, a:vg});
    G.line(cx, cy, cx - R*0.7071, cy + R*0.7071, 'rgba(255,255,255,.7)', 1.2, {a:vg, dash:[4, 3]}); G.text('b', cx - R*0.42, cy + R*0.36, {color:'#fff', size:13, weight:700, a:vg, halo:true});
    if (vE > 0) for (let k = 0; k < 16; k++){ const a = k*TAU/16 + 0.1; const r1 = r + 6, r2 = r + (R - r - 6)*0.92*pulse; G.arrow(cx + r1*Math.cos(a), cy + r1*Math.sin(a), cx + r2*Math.cos(a), cy + r2*Math.sin(a), C.white, 1.6, {a:vE*0.9, head:6}); }
    if (vH > 0) [0.3, 0.55, 0.8].forEach((q, i) => { const rr = r + (R - r)*q; G.circle(cx, cy, rr, {stroke:C.cyan, w:1.4, dash:[6, 6], a:vH*(0.5 + 0.5*pulse)}); const a = t*0.8 + i; G.arrow(cx + rr*Math.cos(a), cy + rr*Math.sin(a), cx + rr*Math.cos(a + .18), cy + rr*Math.sin(a + .18), C.cyan, 1.6, {a:vH, head:7}); });
    const lx = W*0.74;
    G.text('E radial', lx, H*0.3, {color:C.white, size:13, a:vE}); G.text('H in circles', lx, H*0.3 + 22, {color:C.cyan, size:13, a:vH});
    G.text(`b/a = ${num(m.b/m.a, 4)}`, lx, H*0.3 + 56, {color:C.amber, size:13.5, weight:700, a:vg});
    G.text(`Z₀ = ${num(m.Z0, 4)} Ω`, lx, H*0.3 + 92, {color:C.pink, size:20, weight:800, a:vz});
  }
  function sceneTwoWire(m, S){
    const {W, H, vis, t} = S, cx = W*0.4, cy = H*0.52, sc = Math.min(W*0.62, H*1.1)/(m.D*1.6);
    const h = m.D/2, rw = m.d/2, p = Math.sqrt(h*h - rw*rw), X = x => cx + x*sc, Y = y => cy - y*sc;
    const vg = vis('geom'), vE = vis('E'), vH = vis('H'), vz = vis('z0'), pulse = fieldPulse(t);
    const ctx = G.ctx(); ctx.save(); ctx.beginPath(); ctx.rect(14, 14, W*0.66, H - 28); ctx.clip();
    // E lines: circles through the image line charges (±p, 0)
    if (vE > 0) [-2.4, -1.2, -0.55, -0.2, 0.2, 0.55, 1.2, 2.4].forEach(k => {
      const yc = k*p, rr = Math.sqrt(p*p + yc*yc), pts = [];
      for (let i = 0; i <= 360; i++){ const a = i*TAU/360, x = rr*Math.cos(a), y = yc + rr*Math.sin(a); if (Math.hypot(x - h, y) > rw && Math.hypot(x + h, y) > rw) pts.push([X(x), Y(y)]); else if (pts.length > 1){ G.path(pts.splice(0), C.white, 1.3, {a:vE*0.75*pulse}); } else pts.length = 0; }
      if (pts.length > 1) G.path(pts, C.white, 1.3, {a:vE*0.75*pulse});
    });
    // H lines: the equipotential circles around each wire
    if (vH > 0) [0.25, 0.5, 0.8, 1.2].forEach(u0 => { const u = Math.acosh(h/rw) - u0; if (u <= 0.05) return; const xc = p/Math.tanh(u), rr = p/Math.sinh(u); [1, -1].forEach(sg => G.circle(X(sg*xc), Y(0), rr*sc, {stroke:C.cyan, w:1.3, dash:[5, 5], a:vH*(0.45 + 0.4*pulse)})); });
    ctx.restore();
    [1, -1].forEach(sg => G.circle(X(sg*h), Y(0), rw*sc, {fill: sg > 0 ? 'rgba(226,184,111,.9)' : 'rgba(138,180,240,.9)', a:vg}));
    G.bracket(X(-h), X(h), Y(0) + rw*sc + 34, `D = ${si(m.D, 'm', 3)}`, C.amber, {a:vg});
    G.text(`d = ${si(m.d, 'm', 3)}`, X(h), Y(0) - rw*sc - 12, {align:'center', color:C.amber, size:12.5, a:vg, halo:true});
    const lx = W*0.74;
    G.text('E from wire to wire', lx, H*0.3, {color:C.white, size:13, a:vE}); G.text('H circles each wire', lx, H*0.3 + 22, {color:C.cyan, size:13, a:vH});
    G.text(`D/d = ${num(m.D/m.d, 4)}`, lx, H*0.3 + 56, {color:C.amber, size:13.5, weight:700, a:vg});
    G.text(`Z₀ = ${num(m.Z0, 4)} Ω`, lx, H*0.3 + 92, {color:C.pink, size:20, weight:800, a:vz});
  }

  const GLYPH = {
    vel:'<path d="M3 10 C6 4, 9 4, 12 10 S 18 16, 21 10 S 26 4, 29 10"/><path d="M3 23 C4.5 18, 6 18, 7.5 23 S 10.5 28, 12 23 S 15 18, 16.5 23 S 19.5 28, 21 23 S 24 18, 25.5 23 S 28 27, 29 24"/>',
    el:'<path d="M3 13 H29 M3 19 H29"/><path d="M9 9 V23 M17 9 V23 M25 9 V23" stroke-dasharray="2 2.4"/>',
    coax:'<circle cx="16" cy="16" r="12"/><circle cx="16" cy="16" r="4" fill="currentColor" stroke="none"/>',
    tw:'<circle cx="8" cy="16" r="4" fill="currentColor" stroke="none"/><circle cx="24" cy="16" r="4" fill="currentColor" stroke="none"/><path d="M8 10 Q 16 2 24 10 M8 22 Q 16 30 24 22" stroke-dasharray="2.5 2.5"/>'
  };
  const glyph = k => `<svg viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${GLYPH[k]}</svg>`;
  const intro = (text, show) => ({ dur:2600, show, info: m => ({ title:'The set-up', body:text, work:m.given }) });

  const MODES = [
    { id:'velocity', title:'Wavelength and velocity', desc:'v<sub>p</sub>, velocity factor, λ and β in a filled line', glyph:glyph('vel'),
      fields:['er', 'mr', 'f'], defaults:{er:'2.25', mr:'1', f:'100', f_u:'MHz'},
      compute: v => {
        const er = erOk(v.er), mr = pos(v.mr, 'μ_r'), fr = pos(v.f, 'the frequency'), vf = 1/Math.sqrt(er*mr), vp = C0*vf;
        return {id:'velocity', er, mr, fr, vf, vp, lam0:C0/fr, lam:vp/fr, beta:TAU*fr/vp, given:`ε<sub>r</sub> = ${num(er)}, μ<sub>r</sub> = ${num(mr)}, f = ${si(fr, 'Hz')}<br><span class="c">c = 3 × 10⁸ m/s</span>`};
      },
      problem: m => ({ chips:[`ε<sub>r</sub> = ${num(m.er)}`, `μ<sub>r</sub> = ${num(m.mr)}`, `f = ${fq(m)}`] }),
      steps: () => [intro('<p>Fill a line with a dielectric and the wave slows down. The frequency stays the same, so the wavelength shrinks by the same factor.</p>', ['air']),
        { dur:2800, show:['line', 'vf'],
          info: m => ({ title:'Speed in the line', body:'<p>The wave travels at v<sub>p</sub> = c/√(ε<sub>r</sub>μ<sub>r</sub>). The ratio v<sub>p</sub>/c is the velocity factor.</p>', work:`v<sub>p</sub> = 3 × 10⁸/√(${num(m.er)} × ${num(m.mr)})<br>&nbsp;&nbsp;&nbsp;= <b>${num(m.vp)} m/s</b><br>velocity factor = <b>${num(m.vf)}</b> (${fix(100*m.vf, 1)}% of c)` }),
          rd: m => ['Phase velocity v_p', `${num(m.vp)} m/s (VF ${num(m.vf)})`] },
        { dur:2600, show:['brk'],
          info: m => ({ title:'Wavelengths', body:'<p>λ = v/f in each: same f, slower speed, shorter wavelength.</p>', work:`λ₀ = c/f = <b>${si(m.lam0, 'm')}</b><br>λ = v<sub>p</sub>/f = <b>${si(m.lam, 'm')}</b> = λ₀ × ${num(m.vf)}` }),
          rd: m => ['Wavelength in the line', `${si(m.lam, 'm')} (λ₀ = ${si(m.lam0, 'm')})`] },
        { dur:2000, show:[],
          info: m => ({ title:'Phase constant β', body:'<p>β = 2π/λ is the phase shift per metre along the line.</p>', work:`β = 2π/λ = <b>${num(m.beta)} rad/m</b> = ${num(m.beta*180/PI)}°/m` }),
          rd: m => ['Phase constant β', `${num(m.beta)} rad/m`] },
        answerStep()],
      answer: m => [
        {tone:'y', k:'Speed', v:`v<sub>p</sub> = ${num(m.vp, 4)} m/s`, s:`velocity factor ${num(m.vf, 4)}`},
        {tone:'s1', k:'Wavelength', v:`λ = ${si(m.lam, 'm', 4)}`, s:`β = ${num(m.beta, 4)} rad/m; λ₀ = ${si(m.lam0, 'm', 4)}`}],
      scene: sceneVelocity },

    { id:'electrical', title:'Electrical length', desc:'A physical length in wavelengths and degrees', glyph:glyph('el'),
      fields:['len', 'er', 'f'], defaults:{len:'50', len_u:'cm', er:'2.25', f:'300', f_u:'MHz'},
      compute: v => {
        const len = pos(v.len, 'the line length'), er = erOk(v.er), fr = pos(v.f, 'the frequency'), vp = C0/Math.sqrt(er), lam = vp/fr;
        return {id:'electrical', len, er, fr, vp, lam, nl:len/lam, bl:360*len/lam, tau:len/vp, given:`l = ${si(len, 'm')}, ε<sub>r</sub> = ${num(er)}, f = ${si(fr, 'Hz')}`};
      },
      problem: m => ({ chips:[`l = ${si(m.len, 'm', 3)}`, `ε<sub>r</sub> = ${num(m.er)}`, `f = ${fq(m)}`] }),
      steps: () => [intro('<p>Smith chart and line formulas need lengths in <b>wavelengths</b>, measured inside the line. Here a physical length is converted.</p>', ['line']),
        { dur:2400, show:['ticks'],
          info: m => ({ title:'Wavelength in the line', body:'<p>Work out λ inside the dielectric first.</p>', work:`v<sub>p</sub> = c/√ε<sub>r</sub> = ${num(m.vp)} m/s<br>λ = v<sub>p</sub>/f = <b>${si(m.lam, 'm')}</b>` }),
          rd: m => ['Wavelength in the line', si(m.lam, 'm')] },
        { dur:2200, show:[],
          info: m => ({ title:'Length in wavelengths', body:'<p>Divide the physical length by λ. This is the number you rotate by on the Smith chart.</p>', work:`l/λ = ${si(m.len, 'm')} ÷ ${si(m.lam, 'm')} = <b>${num(m.nl)}λ</b><br><span class="c">On the Smith chart: ${num(m.nl % 0.5)}λ after whole half-turns (0.5λ per turn).</span>` }),
          rd: m => ['Length in wavelengths', `${num(m.nl)}λ`] },
        { dur:2600, show:['dial'],
          info: m => ({ title:'Electrical length βl', body:'<p>βl is the phase delay along the line in degrees: 360° per wavelength.</p>', work:`βl = 360° × ${num(m.nl)} = <b>${fix(m.bl, 2)}°</b>${m.bl >= 360 ? `<br>= ${fix(m.bl % 360, 2)}° after whole turns` : ''}` }),
          rd: m => ['Electrical length βl', `${fix(m.bl, 2)}°`] },
        { dur:2000, show:['delay'],
          info: m => ({ title:'Time delay', body:'<p>The time the wave takes to cross the line.</p>', work:`τ = l/v<sub>p</sub> = <b>${si(m.tau, 's')}</b>` }),
          rd: m => ['Time delay', si(m.tau, 's')] },
        answerStep()],
      answer: m => [
        {tone:'y', k:'Electrical length', v:`${num(m.nl, 4)}λ<br>βl = ${fix(m.bl, 1)}°`, s:`λ in the line = ${si(m.lam, 'm', 4)}`},
        {tone:'s1', k:'Delay', v:`τ = ${si(m.tau, 's', 4)}`, s:`v<sub>p</sub> = ${num(m.vp, 4)} m/s`}],
      note: () => 'Use the length in λ on the lossless Smith chart page (input impedance and stub questions).',
      scene: sceneElectrical },

    { id:'coax', title:'Coaxial line', desc:'Z₀, L′, C′ and v<sub>p</sub> from the radii', glyph:glyph('coax'),
      fields:['a', 'b', 'er'], defaults:{a:'1', a_u:'mm', b:'3.5', b_u:'mm', er:'2.25'},
      compute: v => {
        const a = pos(v.a, 'the inner radius'), b = pos(v.b, 'the outer radius'), er = erOk(v.er);
        if (b <= a) throw new Error('The outer radius b must be bigger than the inner radius a.');
        const ln = Math.log(b/a), L = MU0/TAU*ln, Cp = TAU*EPS0*er/ln;
        return {id:'coax', a, b, er, ln, L, Cp, Z0:60/Math.sqrt(er)*ln, Zlc:Math.sqrt(L/Cp), vp:1/Math.sqrt(L*Cp), given:`a = ${si(a, 'm')}, b = ${si(b, 'm')}, ε<sub>r</sub> = ${num(er)}<br><span class="c">diameters work too: only b/a matters</span>`};
      },
      problem: m => ({ chips:[`a = ${si(m.a, 'm', 3)}`, `b = ${si(m.b, 'm', 3)}`, `ε<sub>r</sub> = ${num(m.er)}`] }),
      steps: () => [intro('<p>A coaxial line: an inner conductor of radius a inside an outer one of radius b, with a dielectric between them. Everything depends on the ratio b/a.</p>', ['geom']),
        { dur:1800, show:[],
          info: m => ({ title:'The ratio b/a', body:'<p>Each formula uses ln(b/a).</p>', work:`b/a = ${num(m.b/m.a)}<br>ln(b/a) = <b>${num(m.ln)}</b>` }),
          rd: m => ['ln(b/a)', num(m.ln)] },
        { dur:2400, show:['H'],
          info: m => ({ title:'Inductance per metre L′', body:'<p>The magnetic field circles the inner conductor.</p>', work:`L′ = (μ/2π) ln(b/a) = <b>${si(m.L, 'H/m')}</b>` }),
          rd: m => ['Inductance L′', si(m.L, 'H/m')] },
        { dur:2400, show:['E'],
          info: m => ({ title:'Capacitance per metre C′', body:'<p>The electric field points radially between the conductors, through the dielectric.</p>', work:`C′ = 2πε/ln(b/a) = <b>${si(m.Cp, 'F/m')}</b>` }),
          rd: m => ['Capacitance C′', si(m.Cp, 'F/m')] },
        { dur:2400, show:['z0'],
          info: m => ({ title:'Characteristic impedance Z₀', body:'<p>Z₀ = √(L′/C′), which for coax simplifies to (60/√ε<sub>r</sub>) ln(b/a).</p>', work:`Z₀ = (60/√${num(m.er)}) × ${num(m.ln)}<br>&nbsp;&nbsp;&nbsp;= <b>${num(m.Z0)} Ω</b><br><span class="c">check: √(L′/C′) = ${num(m.Zlc)} Ω</span>` }),
          rd: m => ['Characteristic impedance Z₀', `${num(m.Z0)} Ω`] },
        { dur:1800, show:[],
          info: m => ({ title:'Speed', body:'<p>v<sub>p</sub> = 1/√(L′C′) = c/√ε<sub>r</sub>: the geometry cancels out.</p>', work:`v<sub>p</sub> = <b>${num(m.vp)} m/s</b>` }),
          rd: m => ['Phase velocity v_p', `${num(m.vp)} m/s`] },
        answerStep()],
      answer: m => [
        {tone:'y', k:'Characteristic impedance', v:`Z₀ = ${num(m.Z0, 4)} Ω`, s:`b/a = ${num(m.b/m.a, 4)}, ε<sub>r</sub> = ${num(m.er)}`},
        {tone:'s1', k:'Per-metre values', v:`L′ = ${si(m.L, 'H/m', 3)}<br>C′ = ${si(m.Cp, 'F/m', 3)}`, s:`v<sub>p</sub> = ${num(m.vp, 4)} m/s`}],
      scene: sceneCoax },

    { id:'two-wire', title:'Two-wire line', desc:'Z₀, L′, C′ from wire size and spacing', glyph:glyph('tw'),
      fields:['d', 'D', 'er'], defaults:{d:'2', d_u:'mm', D:'20', D_u:'mm', er:'1'},
      compute: v => {
        const d = pos(v.d, 'the wire diameter'), D = pos(v.D, 'the spacing'), er = erOk(v.er);
        if (D <= d) throw new Error('The centre-to-centre spacing D must be bigger than the wire diameter d.');
        const ac = Math.acosh(D/d), L = MU0/PI*ac, Cp = PI*EPS0*er/ac;
        return {id:'two-wire', d, D, er, ac, L, Cp, Z0:120/Math.sqrt(er)*ac, Zapprox:276/Math.sqrt(er)*Math.log10(2*D/d), Zlc:Math.sqrt(L/Cp), vp:1/Math.sqrt(L*Cp), given:`d = ${si(d, 'm')} (wire diameter), D = ${si(D, 'm')} (centre spacing), ε<sub>r</sub> = ${num(er)}`};
      },
      problem: m => ({ chips:[`d = ${si(m.d, 'm', 3)}`, `D = ${si(m.D, 'm', 3)}`, `ε<sub>r</sub> = ${num(m.er)}`] }),
      steps: () => [intro('<p>Two parallel wires of diameter d, with centres D apart, in a medium of ε<sub>r</sub>. Everything depends on D/d.</p>', ['geom']),
        { dur:1800, show:[],
          info: m => ({ title:'The ratio D/d', body:'<p>The exact formulas use cosh⁻¹(D/d).</p>', work:`D/d = ${num(m.D/m.d)}<br>cosh⁻¹(D/d) = <b>${num(m.ac)}</b>` }),
          rd: m => ['cosh⁻¹(D/d)', num(m.ac)] },
        { dur:2400, show:['H'],
          info: m => ({ title:'Inductance per metre L′', body:'<p>The magnetic field forms circles around each wire.</p>', work:`L′ = (μ/π) cosh⁻¹(D/d) = <b>${si(m.L, 'H/m')}</b>` }),
          rd: m => ['Inductance L′', si(m.L, 'H/m')] },
        { dur:2400, show:['E'],
          info: m => ({ title:'Capacitance per metre C′', body:'<p>The electric field runs from one wire to the other along circular arcs.</p>', work:`C′ = πε/cosh⁻¹(D/d) = <b>${si(m.Cp, 'F/m')}</b>` }),
          rd: m => ['Capacitance C′', si(m.Cp, 'F/m')] },
        { dur:2400, show:['z0'],
          info: m => ({ title:'Characteristic impedance Z₀', body:'<p>Z₀ = (120/√ε<sub>r</sub>) cosh⁻¹(D/d). When D ≫ d this is close to the shortcut (276/√ε<sub>r</sub>) log₁₀(2D/d).</p>', work:`Z₀ = (120/√${num(m.er)}) × ${num(m.ac)}<br>&nbsp;&nbsp;&nbsp;= <b>${num(m.Z0)} Ω</b><br><span class="c">shortcut: ${num(m.Zapprox)} Ω; check √(L′/C′) = ${num(m.Zlc)} Ω</span>` }),
          rd: m => ['Characteristic impedance Z₀', `${num(m.Z0)} Ω`] },
        answerStep()],
      answer: m => [
        {tone:'y', k:'Characteristic impedance', v:`Z₀ = ${num(m.Z0, 4)} Ω`, s:`D/d = ${num(m.D/m.d, 4)}; shortcut gives ${num(m.Zapprox, 4)} Ω`},
        {tone:'s1', k:'Per-metre values', v:`L′ = ${si(m.L, 'H/m', 3)}<br>C′ = ${si(m.Cp, 'F/m', 3)}`, s:`v<sub>p</sub> = ${num(m.vp, 4)} m/s`}],
      scene: sceneTwoWire }
  ];

  const LEN = [['mm', 1e-3], ['cm', 1e-2], ['m', 1], ['µm', 1e-6]];
  const FIELDS = {
    er:{label:'ε<sub>r</sub>'}, mr:{label:'μ<sub>r</sub>'},
    f:{label:'Frequency f', units:[['MHz', 1e6], ['GHz', 1e9], ['kHz', 1e3], ['Hz', 1]]},
    len:{label:'Line length l', units:[['cm', 1e-2], ['m', 1], ['mm', 1e-3]]},
    a:{label:'Inner radius a', units:LEN}, b:{label:'Outer radius b', units:LEN},
    d:{label:'Wire diameter d', units:LEN}, D:{label:'Centre spacing D', units:LEN}
  };
  return {MODES, FIELDS};
};
