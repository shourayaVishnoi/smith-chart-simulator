// Analog electronics: diode load line, BJT output characteristics and op-amp waveforms, plus step-by-step questions.
window.AE = (() => {
  'use strict';
  const kB = 1.380649e-23, qe = 1.602176634e-19;
  const vt = Tc => kB*(Tc + 273.15)/qe;
  // diode in series with R from a source Vs: solve Vs = I R + V with I = Is(e^{V/nVt} − 1)
  function diodeQ(Vs, R, Is, n, VT){
    const f = V => Vs - V - R*Is*(Math.exp(V/(n*VT)) - 1);
    let lo = Math.min(0, Vs) - 1, hi = Math.max(0, Vs) + 1e-12;
    hi = Math.min(hi, n*VT*Math.log(Vs/(R*Is) + 1 + 1e-300) + 1e-9 || hi);
    for (let k = 0; k < 200; k++){ const m = (lo + hi)/2; if (f(m) > 0) lo = m; else hi = m; }
    const V = (lo + hi)/2; return {V, I:(Vs - V)/R};
  }
  // BJT output characteristic with a soft saturation knee and Early effect
  const bjtIc = (Ib, Vce, beta, VA = 100) => Vce <= 0 ? 0 : beta*Ib*(1 + Vce/VA)*(1 - Math.exp(-Vce/0.06));
  return {vt, diodeQ, bjtIc};
})();

(() => {
  'use strict';
  const MX = window.MX, PL = window.PLOT, AE = window.AE, $ = id => document.getElementById(id);
  const BLUE = '#8AB4F0', TEAL = '#7CC6BE', SAND = '#E2B86F', SAGE = '#8FC79A', RED = '#E07A6E', TEXT = '#D5DCE4';
  let needs = true;
  const canvas = $('aeCanvas'), ctx = PL.fit(canvas, () => { needs = true; });
  const S = {tab:'diode', Vs:5, R:1000, Is:-14, n:1, VCC:12, RC:2000, IB:30, beta:120, cfg:'inv', gain:4, amp:1, Vsat:12};
  const SL = {
    Vs:['aeVs', 0, 10, 0.1, v => `${v.toFixed(1)} V`], R:['aeR', 1, 4, 0.01, v => MX.si(Math.pow(10, v), 'Ω', 3), true], Is:['aeIs', -16, -9, 1, v => `10${String(v).replace('-', '⁻').replace(/\d/g, d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d])} A`], n:['aeN', 1, 2, 0.05, v => v.toFixed(2)],
    VCC:['aeVCC', 1, 20, 0.5, v => `${v.toFixed(1)} V`], RC:['aeRC', 2, 4.5, 0.01, v => MX.si(Math.pow(10, v), 'Ω', 3), true], IB:['aeIB', 0, 60, 1, v => `${v} µA`], beta:['aeB', 20, 300, 5, v => String(v)],
    gain:['aeG', 0.5, 10, 0.1, v => v.toFixed(1)], amp:['aeA', 0.1, 5, 0.1, v => `${v.toFixed(1)} V`], Vsat:['aeSat', 3, 15, 0.5, v => `±${v.toFixed(1)} V`]
  };
  Object.entries(SL).forEach(([k, [id, lo, hi, st, fmt, isLog]]) => {
    const r = $(id), o = $(id + 'o'); r.min = lo; r.max = hi; r.step = st; r.value = isLog ? Math.log10(S[k]) : S[k];
    const sh = () => { o.value = fmt(isLog ? Math.log10(S[k]) : S[k]); };
    r.addEventListener('input', () => { S[k] = isLog ? Math.pow(10, +r.value) : +r.value; sh(); needs = true; }); sh();
  });
  function seg(id, key){ $(id).querySelectorAll('button').forEach(b => b.addEventListener('click', () => { S[key] = b.dataset.v; sync(); })); }
  function sync(){
    $('aeTab').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === S.tab)));
    $('aeCfg').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === S.cfg)));
    ['diode', 'bjt', 'opamp'].forEach(t => { $('p_' + t).hidden = t !== S.tab; });
    $('rowGain').hidden = !['inv', 'non'].includes(S.cfg); needs = true;
  }
  seg('aeTab', 'tab'); seg('aeCfg', 'cfg'); sync();
  const VT = AE.vt(27);

  function drawDiode(W, H){
    const Is = Math.pow(10, S.Is), q = AE.diodeQ(S.Vs, S.R, Is, S.n, VT), Imax = Math.max(S.Vs/S.R, 1e-6);
    const b = {x:62, y:30, w:W - 86, h:H - 76}, xr = [0, Math.max(1, S.Vs*1.05)], yr = [0, Imax*1.25];
    const M = PL.frame(ctx, b, {xr, yr, mode:'box', xlabel:'V_D (V)'.replace('_D', 'D'), ylabel:'I_D (A)'.replace('_D', 'D'), title:'Diode curve and load line'});
    PL.fn(ctx, M, V => Is*(Math.exp(V/(S.n*VT)) - 1), {color:BLUE, width:2.6});
    PL.line(ctx, M, [[0, S.Vs/S.R], [S.Vs, 0]], {color:SAND, width:2.2});
    PL.dot(ctx, M, q.V, q.I, {color:'#fff', r:6, label:`Q (${MX.fmt(q.V, 4)} V, ${MX.si(q.I, 'A', 3)})`});
    PL.label(ctx, M.X(S.Vs*0.55), M.Y(S.Vs*0.45/S.R) - 10, 'load line', {color:SAND, size:12});
    $('aeRead').innerHTML = `V<sub>D</sub> = <b>${MX.fmt(q.V, 4)} V</b><br>I<sub>D</sub> = <b>${MX.si(q.I, 'A', 4)}</b><br>P<sub>D</sub> = ${MX.si(q.V*q.I, 'W', 3)}<br><span class="c">thermal voltage V<sub>T</sub> = ${MX.fmt(VT*1e3, 4)} mV at 27 °C</span>`;
  }
  function drawBjt(W, H){
    const b = {x:62, y:30, w:W - 86, h:H - 76}, IBs = [10, 20, 30, 40, 50, 60].map(u => u*1e-6), xr = [0, S.VCC*1.1];
    const Imax = Math.max(S.VCC/S.RC, AE.bjtIc(60e-6, S.VCC, S.beta))*1.15, M = PL.frame(ctx, b, {xr, yr:[0, Imax*1e3], mode:'box', xlabel:'VCE (V)', ylabel:'IC (mA)', title:'Output characteristics and DC load line'});
    IBs.forEach(ib => { PL.fn(ctx, M, v => AE.bjtIc(ib, v, S.beta)*1e3, {color:'rgba(138,180,240,.45)', width:1.4}); const y = AE.bjtIc(ib, xr[1]*0.97, S.beta)*1e3; if (y < Imax*1e3) PL.label(ctx, M.X(xr[1]*0.97) - 4, M.Y(y) - 5, `${Math.round(ib*1e6)} µA`, {color:'rgba(213,220,228,.7)', size:10.5, align:'right'}); });
    const ib = S.IB*1e-6; PL.fn(ctx, M, v => AE.bjtIc(ib, v, S.beta)*1e3, {color:BLUE, width:2.6});
    PL.line(ctx, M, [[0, S.VCC/S.RC*1e3], [S.VCC, 0]], {color:SAND, width:2.2});
    // Q-point: where VCE = VCC − IC RC meets the curve for this IB
    let lo = 0, hi = S.VCC; for (let k = 0; k < 100; k++){ const m = (lo + hi)/2; if (S.VCC - m - AE.bjtIc(ib, m, S.beta)*S.RC > 0) lo = m; else hi = m; }
    const Vce = (lo + hi)/2, Ic = (S.VCC - Vce)/S.RC, region = ib === 0 ? 'cut-off' : Vce < 0.3 ? 'saturation' : 'active';
    PL.dot(ctx, M, Vce, Ic*1e3, {color:'#fff', r:6, label:`Q (${MX.fmt(Vce, 3)} V, ${MX.fmt(Ic*1e3, 3)} mA)`});
    $('aeRead').innerHTML = `I<sub>B</sub> = ${S.IB} µA → I<sub>C</sub> = <b>${MX.si(Ic, 'A', 4)}</b><br>V<sub>CE</sub> = <b>${MX.fmt(Vce, 4)} V</b><br>region: <b>${region}</b>${region === 'saturation' ? '<br><span class="c">I<sub>C</sub> is held below βI<sub>B</sub> by the load line</span>' : ''}<br><span class="c">curves include a small Early effect (V<sub>A</sub> = 100 V)</span>`;
  }
  function drawOpamp(W, H){
    const b = {x:62, y:30, w:W - 86, h:H - 76}, f = 1, T = 2, w = 2*Math.PI*f, A = S.amp, Vs = S.Vsat, clip = v => Math.max(-Vs, Math.min(Vs, v));
    const vin = t => A*Math.sin(w*t);
    // integrator and differentiator use RC = 1/(2π f) × gain-ish scaling so the output is visible
    const out = {inv:t => -S.gain*vin(t), non:t => (1 + S.gain)*vin(t), fol:t => vin(t), int:t => A*Math.cos(w*t) - A, dif:t => -A*Math.cos(w*t), comp:t => vin(t) > 0 ? Vs : -Vs}[S.cfg];
    const yr = [-Math.max(Vs, A)*1.15, Math.max(Vs, A)*1.15], M = PL.frame(ctx, b, {xr:[0, T], yr, mode:'box', zeroLine:true, xlabel:'t (ms)', ylabel:'volts', title:'Input and output'});
    [Vs, -Vs].forEach(v => PL.hline(ctx, M, v, {color:'rgba(224,122,110,.6)'}));
    PL.label(ctx, b.x + b.w - 6, M.Y(Vs) - 6, `+Vsat`, {color:RED, size:11, align:'right'}); PL.label(ctx, b.x + b.w - 6, M.Y(-Vs) + 14, `−Vsat`, {color:RED, size:11, align:'right'});
    PL.fn(ctx, M, vin, {color:TEAL, width:2, dash:[6, 4]});
    const raw = MX.linspace(0, T, 600).map(t => out(t)), clipped = raw.some(v => Math.abs(v) > Vs);
    PL.line(ctx, M, MX.linspace(0, T, 600).map((t, i) => [t, clip(raw[i])]), {color:BLUE, width:2.8});
    PL.label(ctx, b.x + 10, b.y + 16, 'v_in'.replace('_', ''), {color:TEAL}); PL.label(ctx, b.x + 50, b.y + 16, 'v_out'.replace('_', ''), {color:BLUE});
    const desc = {inv:`gain = −R<sub>f</sub>/R₁ = −${MX.fmt(S.gain, 3)}`, non:`gain = 1 + R<sub>f</sub>/R₁ = ${MX.fmt(1 + S.gain, 3)}`, fol:'gain = 1 (buffer)', int:'v<sub>out</sub> = −(1/RC)∫v<sub>in</sub> dt; with RC = 1/ω the sine becomes a shifted cosine', dif:'v<sub>out</sub> = −RC dv<sub>in</sub>/dt; with RC = 1/ω a sine becomes −cosine', comp:'output swings to +V<sub>sat</sub> when v<sub>in</sub> > 0, else −V<sub>sat</sub>'}[S.cfg];
    $('aeRead').innerHTML = `${desc}<br>${clipped ? '<b>output is clipping at the rails</b>' : 'output within the rails'}<br><span class="c">input: ${MX.fmt(A, 3)} V peak at 1 kHz</span>`;
  }
  function loop(){ if (needs){ needs = false; const W = canvas._w, H = canvas._h; ctx.clearRect(0, 0, W, H); ({diode:drawDiode, bjt:drawBjt, opamp:drawOpamp})[S.tab](W, H); } requestAnimationFrame(loop); }
  const rm = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  $('hPlay') && $('hPlay').addEventListener('click', () => $('play').scrollIntoView({behavior: rm ? 'auto' : 'smooth'}));
  window.__ae = {S, redraw(){ needs = true; }, sync};
  requestAnimationFrame(loop);
})();

// ---------------- step-by-step questions ----------------
window.FORMULA_PAGE = (G) => {
  'use strict';
  const MX = window.MX, PL = window.PLOT, AE = window.AE, PI = Math.PI, D = 180/PI;
  const n4 = (v, s = 4) => MX.fmt(v, s), si = (v, u, s = 4) => MX.si(v, u, s);
  const BLUE = '#8AB4F0', TEAL = '#7CC6BE', SAND = '#E2B86F', SAGE = '#8FC79A', RED = '#E07A6E', LILAC = '#B6A2DE', TEXT = '#D5DCE4';
  const cardsHTML = cards => `<div class="answer">${cards.filter(Boolean).map(c => `<div class="ans ${c.tone || 'y'}"><div class="k">${c.k}</div><div class="v">${c.v}</div><div class="s">${c.s || ''}</div></div>`).join('')}</div>`;
  const MODE_OF = m => MODES.find(x => x.id === m.id);
  const answerStep = () => ({ dur:1600, show:[], info: m => ({ title:'Answer', body: cardsHTML(MODE_OF(m).answer(m)) + (MODE_OF(m).note && MODE_OF(m).note(m) ? `<p>${MODE_OF(m).note(m)}</p>` : ''), work:'' }) });
  const pos = (v, w) => { if (!(v > 0) || !isFinite(v)) throw new Error(`${w} must be a positive number.`); };
  const fin = (v, w) => { if (!isFinite(v)) throw new Error(`Enter a number for ${w}.`); };
  const upto = (pts, k) => pts.slice(0, Math.max(2, Math.round(pts.length*Math.min(1, k))));
  const GLYPH = {
    diode:'<path d="M3 16 H11 M21 16 H29"/><path d="M11 9 L21 16 L11 23 Z"/><path d="M21 9 V23"/>',
    bjt:'<circle cx="17" cy="16" r="11"/><path d="M4 16 H13 M13 9 V23 M13 12 L22 6 M13 20 L22 26"/><path d="M19.5 23 L22 26 L18.6 26.4"/>',
    mos:'<path d="M4 20 H11 M11 9 V23 M14 9 V23 M14 11 H22 V4 M14 21 H22 V28 M14 16 H19"/>',
    opamp:'<path d="M8 5 L27 16 L8 27 Z"/><path d="M3 11 H8 M3 21 H8 M27 16 H31"/><path d="M11 11 H14 M11 21 H14 M12.5 19.5 V22.5"/>',
    filt:'<path d="M3 9 H15 C19 9, 21 12, 29 26"/><path d="M15 4 V28" stroke-dasharray="2 3" opacity=".6"/>'
  };
  const glyph = k => `<svg viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${GLYPH[k]}</svg>`;
  const RU = [['kΩ', 1e3], ['Ω', 1], ['MΩ', 1e6]];
  const box1 = S => ({x:66, y:34, w:S.W - 92, h:S.H - 84});

  const MODES = [
    { id:'diode', title:'Diode circuit Q-point', desc:'Source, resistor and diode: ideal, 0.7 V drop or the full exponential model', glyph:glyph('diode'),
      fields:['model', 'Vs', 'R', 'Von', 'Is', 'n', 'T'], defaults:{model:'exp', Vs:'5', R:'1', R_u:'kΩ', Von:'0.7', Is:'1e-14', n:'1', T:'27'},
      compute: v => {
        fin(v.Vs, 'Vs'); pos(v.R, 'R');
        let V, I, iters = [];
        if (v.model === 'ideal'){ if (v.Vs > 0){ V = 0; I = v.Vs/v.R; } else { V = v.Vs; I = 0; } }
        else if (v.model === 'cvd'){ pos(v.Von, 'The turn-on voltage'); if (v.Vs > v.Von){ V = v.Von; I = (v.Vs - v.Von)/v.R; } else { V = v.Vs; I = 0; } }
        else {
          pos(v.Is, 'Is'); pos(v.n, 'n'); fin(v.T, 'T'); const VT = AE.vt(v.T), q = AE.diodeQ(v.Vs, v.R, v.Is, v.n, VT); V = q.V; I = q.I;
          // Newton iterations on f(V) = Vs − V − R·Is(e^{V/nVT} − 1), started at 0.7 V (or Vs if smaller)
          let x = Math.min(0.7, v.Vs); for (let k = 0; k < 30; k++){ const e = Math.exp(x/(v.n*VT)), f = v.Vs - x - v.R*v.Is*(e - 1), d = -1 - v.R*v.Is*e/(v.n*VT); iters.push({x, I:(v.Vs - x)/v.R}); const xn = x - f/d; if (Math.abs(xn - x) < 1e-13) break; x = xn; }
          return {id:'diode', ...v, V, I, VT, iters, PD:V*I, PR:I*I*v.R};
        }
        return {id:'diode', ...v, V, I, iters, PD:V*I, PR:I*I*v.R};
      },
      problem: m => ({ chips:[`V<sub>s</sub> = ${si(m.Vs, 'V')}`, `R = ${si(m.R, 'Ω')}`, {ideal:'ideal diode', cvd:`constant drop ${si(m.Von, 'V')}`, exp:`I<sub>s</sub> = ${si(m.Is, 'A')}, n = ${n4(m.n)}`}[m.model]] }),
      steps: () => [
        { dur:2400, show:['curve', 'load'], info: m => ({ title:'Load line', body:'<p>KVL around the loop: V<sub>s</sub> = I R + V<sub>D</sub>. Every possible (V<sub>D</sub>, I) for the resistor lies on this straight line; the diode decides which point.</p>', work:`I = (V<sub>s</sub> − V<sub>D</sub>)/R<br>short-circuit current V<sub>s</sub>/R = ${si(m.Vs/m.R, 'A')}` }) },
        { dur:3200, show:['iter'], info: m => m.model === 'exp' ? ({ title:'Solve with Newton’s method', body:'<p>The diode equation and the load line together give one equation in V<sub>D</sub>. It has no closed form, so iterate.</p>', work:`V<sub>T</sub> = kT/q = ${n4(m.VT*1e3)} mV<br>` + m.iters.slice(0, 6).map((it, k) => `V${k} = ${MX.fmt(it.x, 8)} V`).join('<br>') + `<br><span class="c">${m.iters.length} iterations</span>` })
            : ({ title: m.model === 'ideal' ? 'Ideal diode' : 'Constant-drop model', body: m.model === 'ideal' ? '<p>An ideal diode is a short when forward biased and an open circuit when reverse biased.</p>' : `<p>Assume the diode conducts with ${si(m.Von, 'V')} across it, then check the current is positive.</p>`, work: m.I > 0 ? `I = (V<sub>s</sub> − ${n4(m.V)})/R = ${si(m.I, 'A')} > 0 ✓` : 'the source cannot forward-bias it, so I = 0' }),
          rd: m => ['Diode voltage V<sub>D</sub>', si(m.V, 'V')] },
        { dur:2200, show:['q'], info: m => ({ title:'Q-point and power', body:'<p>The operating point is where the diode curve meets the load line.</p>', work:`V<sub>D</sub> = <b>${n4(m.V, 5)} V</b>, I<sub>D</sub> = <b>${si(m.I, 'A', 5)}</b><br>P<sub>D</sub> = ${si(m.PD, 'W')}, P<sub>R</sub> = ${si(m.PR, 'W')}` }), rd: m => [['Diode current I<sub>D</sub>', si(m.I, 'A', 5)], ['Diode power', si(m.PD, 'W')]] },
        answerStep()],
      answer: m => [{tone:'y', k:'Q-point', v:`${n4(m.V, 4)} V, ${si(m.I, 'A', 4)}`, s:'(V<sub>D</sub>, I<sub>D</sub>)'}, {tone:'s1', k:'Diode power', v:si(m.PD, 'W'), s:`resistor ${si(m.PR, 'W')}`}],
      note: m => m.model === 'exp' ? `The 0.7 V model would give ${si(Math.max(0, (m.Vs - 0.7)/m.R), 'A')}.` : '',
      scene: (m, S) => {
        const ctx = G.ctx(), Imax = Math.max(m.Vs/m.R, 1e-9), xr = [Math.min(0, m.Vs), Math.max(1, m.Vs*1.05)];
        const M = PL.frame(ctx, box1(S), {xr, yr:[Math.min(0, -Imax*0.05), Imax*1.25], mode:'box', zeroLine:true, xlabel:'VD (V)', ylabel:'ID (A)'});
        const dI = V => m.model === 'ideal' ? (V >= 0 ? Infinity : 0) : m.model === 'cvd' ? (V >= m.Von ? Infinity : 0) : m.Is*(Math.exp(V/(m.n*m.VT)) - 1);
        const vc = S.vis('curve');
        if (vc > 0){ if (m.model === 'exp') PL.fn(ctx, M, V => Math.min(dI(V), Imax*10), {color:BLUE, width:2.6, alpha:vc}); else { const k = m.model === 'ideal' ? 0 : m.Von; PL.line(ctx, M, [[xr[0], 0], [k, 0], [k, Imax*1.3]], {color:BLUE, width:2.6, alpha:vc}); } }
        PL.line(ctx, M, [[0, m.Vs/m.R], [m.Vs, 0]], {color:SAND, width:2.2, alpha:S.vis('load')});
        const vi = S.vis('iter'); if (vi > 0 && m.iters.length){ const k = Math.max(1, Math.round(vi*Math.min(6, m.iters.length))); m.iters.slice(0, k).forEach((it, i) => PL.dot(ctx, M, it.x, it.I, {color:LILAC, r:4, label: i < 3 ? `V${i}` : '', dy:-10})); }
        PL.dot(ctx, M, m.V, m.I, {color:'#fff', r:6.5, alpha:S.vis('q'), label:`Q (${n4(m.V, 3)} V, ${si(m.I, 'A', 3)})`});
      } },

    { id:'bjt', title:'BJT voltage-divider bias', desc:'Thevenin base circuit, I_B, I_C, V_CE and the operating region', glyph:glyph('bjt'),
      fields:['VCC', 'R1', 'R2', 'RC', 'RE', 'beta', 'VBE'], defaults:{VCC:'12', R1:'47', R1_u:'kΩ', R2:'10', R2_u:'kΩ', RC:'2.2', RC_u:'kΩ', RE:'1', RE_u:'kΩ', beta:'100', VBE:'0.7'},
      compute: v => {
        pos(v.VCC, 'VCC'); pos(v.R1, 'R1'); pos(v.R2, 'R2'); pos(v.RC, 'RC'); if (!(v.RE >= 0)) throw new Error('RE must be zero or more.'); pos(v.beta, 'β'); fin(v.VBE, 'VBE');
        const VTH = v.VCC*v.R2/(v.R1 + v.R2), RTH = v.R1*v.R2/(v.R1 + v.R2);
        let IB, IC, IE, VCE, region;
        if (VTH <= v.VBE){ IB = IC = IE = 0; VCE = v.VCC; region = 'cut-off'; }
        else {
          IB = (VTH - v.VBE)/(RTH + (v.beta + 1)*v.RE); IC = v.beta*IB; IE = IB + IC; VCE = v.VCC - IC*v.RC - IE*v.RE; region = 'active';
          if (VCE < 0.2){
            // saturated: VCE = 0.2 V and IC < βIB; solve the two loop equations together
            const a11 = RTH + v.RE, a12 = v.RE, b1 = VTH - v.VBE, a21 = v.RE, a22 = v.RC + v.RE, b2 = v.VCC - 0.2, det = a11*a22 - a12*a21;
            IB = (b1*a22 - a12*b2)/det; IC = (a11*b2 - a21*b1)/det; IE = IB + IC; VCE = 0.2; region = 'saturation';
          }
        }
        const approxIC = VTH > v.VBE ? (VTH - v.VBE)/v.RE : 0, stiff = (v.beta + 1)*v.RE >= 10*RTH;
        return {id:'bjt', ...v, VTH, RTH, IB, IC, IE, VCE, region, VE:IE*v.RE, VC:v.VCC - IC*v.RC, VB:IE*v.RE + v.VBE, approxIC, stiff};
      },
      problem: m => ({ chips:[`V<sub>CC</sub> = ${si(m.VCC, 'V')}`, `R₁ = ${si(m.R1, 'Ω')}`, `R₂ = ${si(m.R2, 'Ω')}`, `R<sub>C</sub> = ${si(m.RC, 'Ω')}`, `R<sub>E</sub> = ${si(m.RE, 'Ω')}`, `β = ${n4(m.beta)}`] }),
      steps: () => [
        { dur:2400, show:['ckt'], info: m => ({ title:'Thevenin equivalent of the base', body:'<p>Replace the divider R₁, R₂ by one source and one resistor as seen from the base.</p>', work:`V<sub>TH</sub> = V<sub>CC</sub>R₂/(R₁ + R₂) = <b>${si(m.VTH, 'V')}</b><br>R<sub>TH</sub> = R₁ ∥ R₂ = <b>${si(m.RTH, 'Ω')}</b>` }), rd: m => [['V<sub>TH</sub>', si(m.VTH, 'V')], ['R<sub>TH</sub>', si(m.RTH, 'Ω')]] },
        { dur:2600, show:['ib'], info: m => ({ title:'Base current', body:'<p>KVL around the base loop, with I<sub>E</sub> = (β + 1)I<sub>B</sub> through R<sub>E</sub>.</p>', work: m.region === 'cut-off' ? `V<sub>TH</sub> ≤ V<sub>BE</sub>, so the transistor is off` : `I<sub>B</sub> = (V<sub>TH</sub> − V<sub>BE</sub>)/(R<sub>TH</sub> + (β + 1)R<sub>E</sub>) = <b>${si((m.VTH - m.VBE)/(m.RTH + (m.beta + 1)*m.RE), 'A')}</b>` }), rd: m => ['Base current I<sub>B</sub>', si(m.IB, 'A')] },
        { dur:2600, show:['ic'], info: m => ({ title:'Collector current and V<sub>CE</sub>', body: m.region === 'saturation' ? '<p>Assuming the active region gives V<sub>CE</sub> below 0.2 V, which is impossible, so the transistor is saturated. Solve both loops with V<sub>CE</sub> = 0.2 V.</p>' : '<p>In the active region I<sub>C</sub> = βI<sub>B</sub>. Then KVL around the collector loop.</p>', work:`I<sub>C</sub> = <b>${si(m.IC, 'A')}</b>, I<sub>E</sub> = ${si(m.IE, 'A')}<br>V<sub>CE</sub> = V<sub>CC</sub> − I<sub>C</sub>R<sub>C</sub> − I<sub>E</sub>R<sub>E</sub> = <b>${si(m.VCE, 'V')}</b>` }), rd: m => [['Collector current I<sub>C</sub>', si(m.IC, 'A')], ['V<sub>CE</sub>', si(m.VCE, 'V')]] },
        { dur:2400, show:['q'], info: m => ({ title:`Region: ${m.region}`, body: m.region === 'active' ? '<p>V<sub>CE</sub> is comfortably above 0.2 V, so the active-region assumption holds.</p>' : m.region === 'saturation' ? `<p>I<sub>C</sub>/I<sub>B</sub> = ${n4(m.IC/m.IB)} is below β, as it must be in saturation.</p>` : '<p>No base current flows.</p>', work:`V<sub>B</sub> = ${si(m.VB, 'V')}, V<sub>E</sub> = ${si(m.VE, 'V')}, V<sub>C</sub> = ${si(m.VC, 'V')}` + (m.region === 'active' && m.RE > 0 ? `<br><span class="c">quick estimate (ignoring I<sub>B</sub>): I<sub>C</sub> ≈ (V<sub>TH</sub> − V<sub>BE</sub>)/R<sub>E</sub> = ${si(m.approxIC, 'A')}${m.stiff ? ', fine here since (β+1)R<sub>E</sub> ≥ 10R<sub>TH</sub>' : ''}</span>` : '') }), rd: m => ['Region', m.region] },
        answerStep()],
      answer: m => [{tone:'y', k:'Q-point', v:`${si(m.IC, 'A', 4)}, ${si(m.VCE, 'V', 4)}`, s:'(I<sub>C</sub>, V<sub>CE</sub>)'}, {tone:'s1', k:'Region', v:m.region, s:`I<sub>B</sub> = ${si(m.IB, 'A')}`}],
      scene: (m, S) => {
        const ctx = G.ctx(), Isat = m.VCC/(m.RC + m.RE), M = PL.frame(ctx, box1(S), {xr:[0, m.VCC*1.08], yr:[0, Math.max(Isat, m.IC)*1.25*1e3], mode:'box', xlabel:'VCE (V)', ylabel:'IC (mA)'});
        const vc = S.vis('ckt');
        if (vc > 0) [0.5, 1, 1.5].forEach(f => { const ib = Math.max(m.IB, 1e-6)*f; PL.fn(ctx, M, x => Math.min(m.beta*ib*(1 - Math.exp(-x/0.06))*1e3, 1e9), {color:'rgba(138,180,240,.35)', width:1.3, alpha:vc}); });
        PL.line(ctx, M, [[0, Isat*1e3], [m.VCC, 0]], {color:SAND, width:2.2, alpha:S.vis('ib')}); if (S.vis('ib') > 0) PL.label(ctx, M.X(m.VCC*0.6), M.Y(Isat*0.4*1e3) - 8, 'DC load line', {color:SAND, size:12});
        const vq = S.vis('ic'); if (vq > 0){ PL.fn(ctx, M, x => m.region === 'saturation' ? NaN : m.beta*m.IB*(1 - Math.exp(-x/0.06))*1e3, {color:BLUE, width:2.6, alpha:vq}); PL.dot(ctx, M, m.VCE, m.IC*1e3, {color:'#fff', r:6.5, alpha:vq, label:`Q (${n4(m.VCE, 3)} V, ${n4(m.IC*1e3, 3)} mA)`}); }
        const vr = S.vis('q'); if (vr > 0){ ctx.save(); ctx.globalAlpha = .12*vr; ctx.fillStyle = RED; ctx.fillRect(M.X(0), M.box.y, M.X(0.2) - M.X(0), M.box.h); ctx.restore(); PL.label(ctx, M.X(0.2) + 4, M.box.y + 14, 'saturation', {color:RED, size:11, alpha:vr}); }
      } },

    { id:'mosfet', title:'MOSFET bias', desc:'n-channel enhancement with a gate divider and source resistor', glyph:glyph('mos'),
      fields:['VDD', 'R1', 'R2', 'RD', 'RS', 'Vt', 'Kn'], defaults:{VDD:'15', R1:'1', R1_u:'MΩ', R2:'500', R2_u:'kΩ', RD:'2', RD_u:'kΩ', RS:'1', RS_u:'kΩ', Vt:'1.5', Kn:'1'},
      compute: v => {
        pos(v.VDD, 'VDD'); pos(v.R1, 'R1'); pos(v.R2, 'R2'); if (!(v.RD >= 0)) throw new Error('RD must be zero or more.'); if (!(v.RS >= 0)) throw new Error('RS must be zero or more.'); fin(v.Vt, 'Vt'); pos(v.Kn, 'K');
        const K = v.Kn*1e-3, VG = v.VDD*v.R2/(v.R1 + v.R2), u = VG - v.Vt;
        if (u <= 0) return {id:'mosfet', ...v, K, VG, ID:0, VGS:VG, VDS:v.VDD, region:'cut-off', roots:[]};
        let ID, roots = [];
        if (v.RS === 0) ID = K*u*u;
        else { const a = K*v.RS*v.RS, b = -(2*K*u*v.RS + 1), c = K*u*u, d = Math.sqrt(b*b - 4*a*c); roots = [(-b - d)/(2*a), (-b + d)/(2*a)]; ID = roots[0]; }
        let VGS = VG - ID*v.RS, VDS = v.VDD - ID*(v.RD + v.RS), region = 'saturation';
        if (VDS < VGS - v.Vt){
          // triode: ID = K[2(VGS − Vt)VDS − VDS²] with VGS and VDS both depending on ID
          const f = I => { const g = VG - I*v.RS - v.Vt, d = v.VDD - I*(v.RD + v.RS); return K*(2*g*d - d*d) - I; };
          let lo = 0, hi = ID; for (let k = 0; k < 200; k++){ const mid = (lo + hi)/2; if (f(mid) > 0) lo = mid; else hi = mid; }
          ID = (lo + hi)/2; VGS = VG - ID*v.RS; VDS = v.VDD - ID*(v.RD + v.RS); region = 'triode';
        }
        return {id:'mosfet', ...v, K, VG, u, ID, VGS, VDS, region, roots};
      },
      problem: m => ({ chips:[`V<sub>DD</sub> = ${si(m.VDD, 'V')}`, `R₁ = ${si(m.R1, 'Ω')}`, `R₂ = ${si(m.R2, 'Ω')}`, `R<sub>D</sub> = ${si(m.RD, 'Ω')}`, `R<sub>S</sub> = ${si(m.RS, 'Ω')}`, `V<sub>t</sub> = ${si(m.Vt, 'V')}`, `K = ${n4(m.Kn)} mA/V²`] }),
      steps: () => [
        { dur:2200, show:['ckt'], info: m => ({ title:'Gate voltage', body:'<p>No current flows into the gate, so the divider sets V<sub>G</sub> directly.</p>', work:`V<sub>G</sub> = V<sub>DD</sub>R₂/(R₁ + R₂) = <b>${si(m.VG, 'V')}</b>` }), rd: m => ['Gate voltage V<sub>G</sub>', si(m.VG, 'V')] },
        { dur:3000, show:['quad'], info: m => ({ title:'Assume saturation', body: m.region === 'cut-off' ? '<p>V<sub>G</sub> is below the threshold, so the transistor is off.</p>' : '<p>With V<sub>GS</sub> = V<sub>G</sub> − I<sub>D</sub>R<sub>S</sub>, the square law becomes a quadratic in I<sub>D</sub>. Keep the root that leaves V<sub>GS</sub> above V<sub>t</sub>.</p>', work: m.region === 'cut-off' ? 'I<sub>D</sub> = 0' : (m.RS ? `I<sub>D</sub> = K(V<sub>G</sub> − V<sub>t</sub> − I<sub>D</sub>R<sub>S</sub>)²<br>roots: ${m.roots.map(r => si(r, 'A')).join(', ')}<br>keep I<sub>D</sub> = <b>${si(m.roots[0], 'A')}</b> (the other makes V<sub>GS</sub> < V<sub>t</sub>)` : `I<sub>D</sub> = K(V<sub>GS</sub> − V<sub>t</sub>)² = <b>${si(m.ID, 'A')}</b>`) }), rd: m => ['Drain current I<sub>D</sub>', si(m.ID, 'A')] },
        { dur:2600, show:['check'], info: m => ({ title:'Check the region', body:'<p>Saturation needs V<sub>DS</sub> ≥ V<sub>GS</sub> − V<sub>t</sub>.' + (m.region === 'triode' ? ' It fails, so the transistor is in the triode region; I<sub>D</sub> was re-solved with the triode equation.' : '') + '</p>', work:`V<sub>GS</sub> = ${si(m.VGS, 'V')}<br>V<sub>DS</sub> = V<sub>DD</sub> − I<sub>D</sub>(R<sub>D</sub> + R<sub>S</sub>) = <b>${si(m.VDS, 'V')}</b><br>V<sub>GS</sub> − V<sub>t</sub> = ${si(m.VGS - m.Vt, 'V')} → <b>${m.region}</b>` }), rd: m => [['V<sub>GS</sub>', si(m.VGS, 'V')], ['V<sub>DS</sub>', si(m.VDS, 'V')], ['Region', m.region]] },
        answerStep()],
      answer: m => [{tone:'y', k:'Q-point', v:`${si(m.ID, 'A', 4)}, ${si(m.VDS, 'V', 4)}`, s:'(I<sub>D</sub>, V<sub>DS</sub>)'}, {tone:'s1', k:'Region', v:m.region, s:`V<sub>GS</sub> = ${si(m.VGS, 'V')}`}],
      scene: (m, S) => {
        const ctx = G.ctx(), Imax = Math.max(m.VDD/Math.max(m.RD + m.RS, 1), m.ID)*1.25*1e3, M = PL.frame(ctx, box1(S), {xr:[0, m.VDD*1.08], yr:[0, Imax], mode:'box', xlabel:'VDS (V)', ylabel:'ID (mA)'});
        const ch = vgs => x => { const ov = vgs - m.Vt; if (ov <= 0) return 0; return (x < ov ? m.K*(2*ov*x - x*x) : m.K*ov*ov)*1e3; };
        const vc = S.vis('ckt'); if (vc > 0) [0.6, 0.8, 1.2].forEach(f => PL.fn(ctx, M, ch(m.Vt + Math.max(m.VGS - m.Vt, .3)*f), {color:'rgba(138,180,240,.3)', width:1.3, alpha:vc}));
        const vq = S.vis('quad'); if (vq > 0){ PL.fn(ctx, M, ch(m.VGS), {color:BLUE, width:2.6, alpha:vq}); PL.fn(ctx, M, x => m.K*x*x*1e3, {color:'rgba(182,162,222,.6)', width:1.3, dash:[5, 4], alpha:vq}); PL.label(ctx, M.X(Math.sqrt(Imax*0.8e-3/m.K)), M.Y(Imax*0.8) - 6, 'VDS = VGS − Vt', {color:LILAC, size:11, alpha:vq}); }
        if (m.RD + m.RS > 0) PL.line(ctx, M, [[0, m.VDD/(m.RD + m.RS)*1e3], [m.VDD, 0]], {color:SAND, width:2.2, alpha:S.vis('check')});
        PL.dot(ctx, M, m.VDS, m.ID*1e3, {color:'#fff', r:6.5, alpha:S.vis('check'), label:`Q (${n4(m.VDS, 3)} V, ${n4(m.ID*1e3, 3)} mA)`});
      } },

    { id:'opamp', title:'Op-amp amplifiers', desc:'Inverting, non-inverting, summing and difference amplifiers with the rails', glyph:glyph('opamp'),
      fields:['cfg', 'R1', 'R2', 'Rf', 'V1', 'V2', 'Vsat'], defaults:{cfg:'inv', R1:'10', R1_u:'kΩ', R2:'20', R2_u:'kΩ', Rf:'47', Rf_u:'kΩ', V1:'0.5', V2:'0.2', Vsat:'13'},
      compute: v => {
        pos(v.R1, 'R1'); pos(v.Rf, 'Rf'); fin(v.V1, 'V1'); pos(v.Vsat, 'The saturation voltage');
        if (v.cfg === 'sum') pos(v.R2, 'R2'); if (v.cfg === 'sum' || v.cfg === 'diff') fin(v.V2, 'V2');
        let ideal, formula, gainTxt, Rin;
        if (v.cfg === 'inv'){ ideal = -v.Rf/v.R1*v.V1; formula = 'V<sub>out</sub> = −(R<sub>f</sub>/R₁)V₁'; gainTxt = `${n4(-v.Rf/v.R1)}`; Rin = v.R1; }
        else if (v.cfg === 'non'){ ideal = (1 + v.Rf/v.R1)*v.V1; formula = 'V<sub>out</sub> = (1 + R<sub>f</sub>/R₁)V₁'; gainTxt = `${n4(1 + v.Rf/v.R1)}`; Rin = Infinity; }
        else if (v.cfg === 'sum'){ ideal = -v.Rf*(v.V1/v.R1 + v.V2/v.R2); formula = 'V<sub>out</sub> = −R<sub>f</sub>(V₁/R₁ + V₂/R₂)'; gainTxt = `${n4(-v.Rf/v.R1)} and ${n4(-v.Rf/v.R2)}`; Rin = v.R1; }
        else { ideal = v.Rf/v.R1*(v.V2 - v.V1); formula = 'V<sub>out</sub> = (R<sub>f</sub>/R₁)(V₂ − V₁)'; gainTxt = `${n4(v.Rf/v.R1)} on V₂ − V₁`; Rin = 2*v.R1; }
        const Vout = Math.max(-v.Vsat, Math.min(v.Vsat, ideal));
        return {id:'opamp', ...v, ideal, Vout, clipped: Math.abs(ideal) > v.Vsat, formula, gainTxt, Rin};
      },
      problem: m => ({ chips:[{inv:'inverting', non:'non-inverting', sum:'summing (inverting)', diff:'difference amplifier'}[m.cfg], `R₁ = ${si(m.R1, 'Ω')}`].concat(m.cfg === 'sum' ? [`R₂ = ${si(m.R2, 'Ω')}`] : []).concat([`R<sub>f</sub> = ${si(m.Rf, 'Ω')}`, `V₁ = ${si(m.V1, 'V')}`]).concat(m.cfg === 'sum' || m.cfg === 'diff' ? [`V₂ = ${si(m.V2, 'V')}`] : []).concat([`±${si(m.Vsat, 'V')} rails`]) }),
      steps: () => [
        { dur:2400, show:['tf'], info: m => ({ title:'Ideal op-amp rules', body:'<p>With negative feedback the two inputs sit at the same voltage (virtual short) and no current flows into them. Applying KCL at the inverting input gives the gain.</p>', work:`${m.formula}<br>gain: ${m.gainTxt}` }), rd: m => ['Gain', m.gainTxt] },
        { dur:2400, show:['pt'], info: m => ({ title:'Ideal output', body:'<p>Put the input voltages in.</p>', work:`V<sub>out</sub> = <b>${si(m.ideal, 'V')}</b>` }), rd: m => ['Ideal V<sub>out</sub>', si(m.ideal, 'V')] },
        { dur:2400, show:['rail'], info: m => ({ title:'Check the rails', body: m.clipped ? '<p>The output cannot go beyond the saturation voltage, so it clips.</p>' : '<p>The output is inside the rails, so the ideal result stands.</p>', work:`|V<sub>out</sub>| ${m.clipped ? '>' : '≤'} ${si(m.Vsat, 'V')} → V<sub>out</sub> = <b>${si(m.Vout, 'V')}</b>` + (isFinite(m.Rin) ? `<br>input resistance seen by V₁: ${si(m.Rin, 'Ω')}` : '<br>input resistance: very high (into the + input)') }), rd: m => ['Actual V<sub>out</sub>', si(m.Vout, 'V')] },
        answerStep()],
      answer: m => [{tone:'y', k:'Output voltage', v:si(m.Vout, 'V'), s: m.clipped ? `clipped (ideal ${si(m.ideal, 'V')})` : 'within the rails'}, {tone:'s1', k:'Gain', v:m.gainTxt, s:''}],
      scene: (m, S) => {
        // transfer characteristic: V_out against V₁ (other input held), with the rails
        const ctx = G.ctx(), g = {inv:-m.Rf/m.R1, non:1 + m.Rf/m.R1, sum:-m.Rf/m.R1, diff:-m.Rf/m.R1}[m.cfg], off = {inv:0, non:0, sum:-m.Rf*m.V2/m.R2, diff:m.Rf/m.R1*m.V2}[m.cfg];
        const span = Math.max(Math.abs(m.V1)*1.6, 1.5*m.Vsat/Math.abs(g), 0.5), M = PL.frame(ctx, box1(S), {xr:[-span, span], yr:[-m.Vsat*1.3, m.Vsat*1.3], mode:'box', zeroLine:true, zeroLineX:true, xlabel:'V₁ (V)', ylabel:'Vout (V)'});
        const vr = S.vis('rail'); [m.Vsat, -m.Vsat].forEach(y => PL.hline(ctx, M, y, {color:'rgba(224,122,110,.7)', alpha:Math.max(vr, .35)}));
        PL.fn(ctx, M, x => Math.max(-m.Vsat, Math.min(m.Vsat, g*x + off)), {color:BLUE, width:2.6, alpha:S.vis('tf')});
        if (vr > 0 && m.clipped) PL.fn(ctx, M, x => g*x + off, {color:'rgba(138,180,240,.5)', width:1.4, dash:[5, 4], alpha:vr});
        const vp = S.vis('pt'); if (vp > 0){ PL.dot(ctx, M, m.V1, Math.max(-m.Vsat*1.28, Math.min(m.Vsat*1.28, m.ideal)), {color:LILAC, r:5, alpha: m.clipped ? vp : 0}); PL.dot(ctx, M, m.V1, m.Vout, {color:'#fff', r:6.5, alpha:vp, label:`${si(m.Vout, 'V', 3)}`}); }
        PL.label(ctx, M.box.x + 8, M.box.y + 16, `slope ${n4(g, 3)}${m.cfg === 'sum' || m.cfg === 'diff' ? `, V₂ = ${si(m.V2, 'V', 3)} held` : ''}`, {color:TEXT, size:12});
      } },

    { id:'afilter', title:'Active RC filter', desc:'First-order inverting low-pass or high-pass: gain, cut-off and Bode plot', glyph:glyph('filt'),
      fields:['ftype', 'R1', 'Rf', 'C', 'f'], defaults:{ftype:'low', R1:'10', R1_u:'kΩ', Rf:'100', Rf_u:'kΩ', C:'10', C_u:'nF', f:'1', f_u:'kHz'},
      compute: v => {
        pos(v.R1, 'R1'); pos(v.Rf, 'Rf'); pos(v.C, 'C'); pos(v.f, 'f');
        const low = v.ftype === 'low', K = v.Rf/v.R1, fc = low ? 1/(2*PI*v.Rf*v.C) : 1/(2*PI*v.R1*v.C);
        const H = f => { const r = f/fc, den = [1, r], d2 = 1 + r*r; return low ? [-K/d2, K*r/d2] : [-K*r*r/d2, -K*r/d2]; };
        const h = H(v.f), mag = Math.hypot(h[0], h[1]);
        return {id:'afilter', ...v, low, K, fc, H, mag, dB:20*Math.log10(mag), ph:Math.atan2(h[1], h[0])*D};
      },
      problem: m => ({ chips:[m.low ? 'inverting low-pass (C across R<sub>f</sub>)' : 'inverting high-pass (C in series with R₁)', `R₁ = ${si(m.R1, 'Ω')}`, `R<sub>f</sub> = ${si(m.Rf, 'Ω')}`, `C = ${si(m.C, 'F')}`, `f = ${si(m.f, 'Hz')}`] }),
      steps: () => [
        { dur:2200, show:['pb'], info: m => ({ title:'Passband gain', body:`<p>${m.low ? 'At low frequency the capacitor is open, leaving an inverting amplifier.' : 'At high frequency the capacitor is a short, leaving an inverting amplifier.'}</p>`, work:`|A| = R<sub>f</sub>/R₁ = <b>${n4(m.K)}</b> = ${n4(20*Math.log10(m.K))} dB` }), rd: m => ['Passband gain', `${n4(m.K)} (${n4(20*Math.log10(m.K))} dB)`] },
        { dur:2200, show:['fc'], info: m => ({ title:'Cut-off frequency', body:`<p>The corner is set by the capacitor and the resistor it ${m.low ? 'sits across' : 'is in series with'}.</p>`, work:`f<sub>c</sub> = 1/(2π${m.low ? 'R<sub>f</sub>' : 'R₁'}C) = <b>${si(m.fc, 'Hz')}</b>` }), rd: m => ['Cut-off f<sub>c</sub>', si(m.fc, 'Hz')] },
        { dur:2800, show:['curve', 'pt'], info: m => ({ title:`At f = ${si(m.f, 'Hz')}`, body:'<p>The inversion adds 180° to the usual RC phase.</p>', work:`H = ${m.low ? '−(R<sub>f</sub>/R₁)/(1 + jf/f<sub>c</sub>)' : '−(R<sub>f</sub>/R₁)(jf/f<sub>c</sub>)/(1 + jf/f<sub>c</sub>)'}<br>|H| = <b>${n4(m.mag)}</b> = <b>${n4(m.dB)} dB</b><br>phase = <b>${n4(m.ph)}°</b>` }), rd: m => [['|H| at f', `${n4(m.mag)} (${n4(m.dB)} dB)`], ['Phase at f', `${n4(m.ph)}°`]] },
        answerStep()],
      answer: m => [{tone:'y', k:'Cut-off', v:si(m.fc, 'Hz'), s:`passband gain ${n4(m.K)}`}, {tone:'s1', k:`At ${si(m.f, 'Hz')}`, v:`${n4(m.dB)} dB`, s:`phase ${n4(m.ph)}°`}],
      scene: (m, S) => {
        const ctx = G.ctx(), x = 66, w = S.W - 92, h = (S.H - 112)/2, b1 = {x, y:30, w, h}, b2 = {x, y:30 + h + 52, w, h}, xr = [Math.min(m.fc, m.f)/100, Math.max(m.fc, m.f)*100];
        const fs = MX.logspace(Math.log10(xr[0]), Math.log10(xr[1]), 500), Hs = fs.map(m.H), mag = Hs.map(c => 20*Math.log10(Math.hypot(c[0], c[1]))), ph = Hs.map(c => Math.atan2(c[1], c[0])*D);
        const top = Math.ceil(20*Math.log10(m.K)/10)*10 + 10, M1 = PL.frame(ctx, b1, {xr, yr:[Math.max(top - 90, Math.floor(Math.min(...mag)/10)*10), top], xlog:true, mode:'box', ylabel:'gain (dB)'});
        const M2 = PL.frame(ctx, b2, {xr, yr: m.low ? [80, 190] : [170, 280], xlog:true, mode:'box', ylabel:'phase (°)', xlabel:'f (Hz)'});
        const phw = ph.map(p => m.low ? (p < 0 ? p + 360 : p) : (p < 90 ? p + 360 : p));
        const vf = S.vis('fc'); [M1, M2].forEach(Mx => PL.vline(ctx, Mx, m.fc, {color:'rgba(226,184,111,.7)', alpha:vf}));
        PL.hline(ctx, M1, 20*Math.log10(m.K), {color:'rgba(213,220,228,.35)', alpha:S.vis('pb')}); PL.hline(ctx, M1, 20*Math.log10(m.K) - 3, {color:'rgba(213,220,228,.2)', alpha:vf});
        const k = S.vis('curve'); PL.line(ctx, M1, upto(fs.map((f, i) => [f, mag[i]]), k), {color:BLUE, width:2.6}); PL.line(ctx, M2, upto(fs.map((f, i) => [f, phw[i]]), k), {color:TEAL, width:2.6});
        const vp = S.vis('pt'); if (vp > 0){ PL.dot(ctx, M1, m.f, m.dB, {color:'#fff', r:6, alpha:vp, label:`${n4(m.dB, 3)} dB`}); const p = m.low ? (m.ph < 0 ? m.ph + 360 : m.ph) : (m.ph < 90 ? m.ph + 360 : m.ph); PL.dot(ctx, M2, m.f, p, {color:'#fff', r:6, alpha:vp, label:`${n4(m.ph, 3)}°`}); }
      } }
  ];
  const FIELDS = {
    model:{label:'Diode model', type:'select', options:[['exp', 'Exponential (Shockley)'], ['cvd', 'Constant drop'], ['ideal', 'Ideal']]},
    Vs:{label:'Source V<sub>s</sub> (V)'}, R:{label:'Resistor R', units:RU}, Von:{label:'Turn-on drop (V)', showIf: v => v.model === 'cvd'}, Is:{label:'Saturation current I<sub>s</sub> (A)', showIf: v => v.model === 'exp'}, n:{label:'Ideality factor n', showIf: v => v.model === 'exp'}, T:{label:'Temperature (°C)', showIf: v => v.model === 'exp'},
    VCC:{label:'V<sub>CC</sub> (V)'}, R1:{label:'R₁', units:RU.concat([['MΩ', 1e6]]).slice(0, 3)}, R2:{label:'R₂', units:RU, showIf: v => v.cfg === undefined || v.cfg === 'sum'}, RC:{label:'R<sub>C</sub>', units:RU}, RE:{label:'R<sub>E</sub>', units:RU}, beta:{label:'β'}, VBE:{label:'V<sub>BE</sub> (V)'},
    VDD:{label:'V<sub>DD</sub> (V)'}, RD:{label:'R<sub>D</sub>', units:RU}, RS:{label:'R<sub>S</sub>', units:RU}, Vt:{label:'Threshold V<sub>t</sub> (V)'}, Kn:{label:'K (mA/V²) in I<sub>D</sub> = K(V<sub>GS</sub> − V<sub>t</sub>)²'},
    cfg:{label:'Circuit', type:'select', options:[['inv', 'Inverting'], ['non', 'Non-inverting'], ['sum', 'Summing'], ['diff', 'Difference']]}, Rf:{label:'Feedback R<sub>f</sub>', units:RU}, V1:{label:'V₁ (V)'}, V2:{label:'V₂ (V)', showIf: v => v.cfg === 'sum' || v.cfg === 'diff'}, Vsat:{label:'Rails ±V<sub>sat</sub> (V)'},
    ftype:{label:'Filter', type:'select', options:[['low', 'Low-pass'], ['high', 'High-pass']]}, C:{label:'Capacitor C', units:[['nF', 1e-9], ['µF', 1e-6], ['pF', 1e-12]]}, f:{label:'Frequency f', units:[['kHz', 1e3], ['Hz', 1], ['MHz', 1e6]]}
  };
  return {MODES, FIELDS};
};
