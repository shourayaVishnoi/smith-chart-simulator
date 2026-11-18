// Mechanics & waves: projectiles, oscillators and wave superposition, plus step-by-step questions.
window.MK = (() => {
  'use strict';
  // projectile with optional linear drag (a = −g ŷ − k v), RK4 until it lands
  function flight(v0, deg, h0, g, kd = 0, dt = 0.002){
    const th = deg*Math.PI/180; let x = 0, y = h0, vx = v0*Math.cos(th), vy = v0*Math.sin(th), t = 0; const pts = [[0, h0, 0]];
    const f = (vx, vy) => [-kd*vx, -g - kd*vy];
    for (let i = 0; i < 400000; i++){
      const [a1, b1] = f(vx, vy), [a2, b2] = f(vx + dt/2*a1, vy + dt/2*b1), [a3, b3] = f(vx + dt/2*a2, vy + dt/2*b2), [a4, b4] = f(vx + dt*a3, vy + dt*b3);
      const nx = x + dt*(vx + dt/6*(a1 + a2 + a3)), ny = y + dt*(vy + dt/6*(b1 + b2 + b3));
      const nvx = vx + dt/6*(a1 + 2*a2 + 2*a3 + a4), nvy = vy + dt/6*(b1 + 2*b2 + 2*b3 + b4);
      if (ny < 0 && t > 0){ const s = y/(y - ny); pts.push([x + s*(nx - x), 0, t + s*dt]); break; }
      x = nx; y = ny; vx = nvx; vy = nvy; t += dt; pts.push([x, y, t]);
    }
    return pts;
  }
  return {flight};
})();

(() => {
  'use strict';
  const MX = window.MX, PL = window.PLOT, MK = window.MK, $ = id => document.getElementById(id);
  const BLUE = '#8AB4F0', TEAL = '#7CC6BE', SAND = '#E2B86F', SAGE = '#8FC79A', LILAC = '#B6A2DE', RED = '#E07A6E', TEXT = '#D5DCE4';
  const rm = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const canvas = $('mkCanvas'), ctx = PL.fit(canvas, () => {});
  const S = {tab:'proj', v0:20, ang:50, h0:0, g:9.81, kd:0, m:1, k:20, c:0.6, F0:0, wd:4, A2:1, r2:1, dir:-1, start:performance.now()};
  const SL = {v0:['mkV', 1, 50, 0.5, v => `${v.toFixed(1)} m/s`], ang:['mkAng', 0, 90, 1, v => `${v}°`], h0:['mkH', 0, 50, 0.5, v => `${v.toFixed(1)} m`], kd:['mkKd', 0, 0.5, 0.01, v => v ? `${v.toFixed(2)} s⁻¹` : 'off'],
    m:['mkM', 0.2, 5, 0.1, v => `${v.toFixed(1)} kg`], k:['mkK', 1, 100, 1, v => `${v} N/m`], c:['mkC', 0, 10, 0.1, v => `${v.toFixed(1)} N·s/m`], F0:['mkF', 0, 10, 0.5, v => `${v.toFixed(1)} N`], wd:['mkW', 0.5, 15, 0.1, v => `${v.toFixed(1)} rad/s`],
    A2:['mkA2', 0, 1.5, 0.05, v => v.toFixed(2)], r2:['mkR2', 0.5, 2, 0.01, v => `${v.toFixed(2)} × f₁`]};
  Object.entries(SL).forEach(([key, [id, lo, hi, st, fmt]]) => { const r = $(id), o = $(id + 'o'); r.min = lo; r.max = hi; r.step = st; r.value = S[key]; const sh = () => { o.value = fmt(S[key]); }; r.addEventListener('input', () => { S[key] = +r.value; sh(); if (S.tab === 'osc') resetOsc(); if (S.tab === 'proj') S.start = performance.now(); }); sh(); });
  function segs(){ [['mkTab', 'tab'], ['mkG', 'g'], ['mkDir', 'dir']].forEach(([id, key]) => $(id).querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(String(S[key]) === b.dataset.v)))); ['proj', 'osc', 'wave'].forEach(t => { $('q_' + t).hidden = t !== S.tab; }); }
  [['mkTab', 'tab', false], ['mkG', 'g', true], ['mkDir', 'dir', true]].forEach(([id, key, num]) => $(id).querySelectorAll('button').forEach(b => b.addEventListener('click', () => { S[key] = num ? +b.dataset.v : b.dataset.v; segs(); S.start = performance.now(); resetOsc(); })));
  document.querySelectorAll('[data-wave]').forEach(b => b.addEventListener('click', () => { const [A2, r2, dir] = b.dataset.wave.split(',').map(Number); Object.assign(S, {A2, r2, dir}); ['A2', 'r2'].forEach(k => { $(SL[k][0]).value = S[k]; $(SL[k][0] + 'o').value = SL[k][4](S[k]); }); segs(); }));
  segs();
  // ---- projectile ----
  let traj = null, trajKey = '';
  function drawProj(now){
    const key = [S.v0, S.ang, S.h0, S.g, S.kd].join(); if (key !== trajKey){ traj = {p:MK.flight(S.v0, S.ang, S.h0, S.g, S.kd), ideal: S.kd ? MK.flight(S.v0, S.ang, S.h0, S.g, 0) : null}; trajKey = key; }
    const W = canvas._w, H = canvas._h, all = traj.p.concat(traj.ideal || []), xm = Math.max(5, ...all.map(p => p[0])), ym = Math.max(5, ...all.map(p => p[1]));
    const box = {x:56, y:30, w:W - 80, h:H - 76}, sc = Math.min(box.w/(xm*1.08), box.h/(ym*1.15)), xr = [0, box.w/sc], yr = [0, box.h/sc];
    const M = PL.frame(ctx, box, {xr, yr, mode:'box', xlabel:'x (m)', ylabel:'y (m)'});
    if (traj.ideal) PL.line(ctx, M, traj.ideal.map(p => [p[0], p[1]]), {color:'rgba(213,220,228,.35)', width:1.4, dash:[6, 5]});
    PL.line(ctx, M, traj.p.map(p => [p[0], p[1]]), {color:BLUE, width:2.4});
    const T = traj.p[traj.p.length - 1][2], apex = traj.p.reduce((a, p) => p[1] > a[1] ? p : a), land = traj.p[traj.p.length - 1];
    PL.dot(ctx, M, apex[0], apex[1], {color:SAND, r:4.5, label:`max ${MX.fmt(apex[1], 3)} m`, dy:-12}); PL.dot(ctx, M, land[0], 0, {color:SAND, r:4.5, label:`${MX.fmt(land[0], 4)} m`, dy:-12});
    // ball moves in real time (looping), with its velocity arrow
    const t = rm ? T*0.4 : ((now - S.start)/1000) % (T + 1);
    const i = Math.min(traj.p.length - 1, traj.p.findIndex(p => p[2] >= Math.min(t, T)) === -1 ? traj.p.length - 1 : traj.p.findIndex(p => p[2] >= Math.min(t, T))), p = traj.p[i], q = traj.p[Math.min(traj.p.length - 1, i + 1)];
    const vx = (q[0] - p[0])/Math.max(1e-9, q[2] - p[2]), vy = (q[1] - p[1])/Math.max(1e-9, q[2] - p[2]);
    if (i < traj.p.length - 1){ const X = M.X(p[0]), Y = M.Y(p[1]), L = 2.2; ctx.save(); ctx.strokeStyle = SAND; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X + vx*L, Y - vy*L); ctx.stroke(); ctx.restore(); }
    ctx.save(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(M.X(p[0]), M.Y(p[1]), 7, 0, 2*Math.PI); ctx.fill(); ctx.restore();
    $('mkRead').innerHTML = `flight time <b>${MX.fmt(T, 4)} s</b><br>range <b>${MX.fmt(land[0], 4)} m</b>, max height <b>${MX.fmt(apex[1], 4)} m</b><br>t = ${MX.fmt(Math.min(t, T), 3)} s: speed ${MX.fmt(Math.hypot(vx, vy), 3)} m/s` + (S.kd ? '<br><span class="c">dashed: the same throw without air resistance</span>' : '');
  }
  // ---- oscillator ----
  let osc = null;
  function resetOsc(){ osc = {x:1, v:0, t:0, hist:[], last:performance.now()}; }
  resetOsc();
  function drawOsc(now){
    const W = canvas._w, H = canvas._h, dtReal = Math.min(0.05, (now - osc.last)/1000); osc.last = now;
    const acc = (x, v, t) => (S.F0*Math.cos(S.wd*t) - S.c*v - S.k*x)/S.m, h = 1/600, steps = rm ? 0 : Math.round(dtReal/h);
    for (let s = 0; s < steps; s++){ const {x, v, t} = osc, a1 = acc(x, v, t), a2 = acc(x + h/2*v, v + h/2*a1, t + h/2), a3 = acc(x + h/2*(v + h/2*a1), v + h/2*a2, t + h/2), a4 = acc(x + h*(v + h/2*a2), v + h*a3, t + h);
      osc.x = x + h*(v + h/6*(a1 + a2 + a3)); osc.v = v + h/6*(a1 + 2*a2 + 2*a3 + a4); osc.t = t + h; if (s % 6 === 0) osc.hist.push([osc.t, osc.x]); }
    const span = 10; osc.hist = osc.hist.filter(p => p[0] > osc.t - span);
    // spring and mass on the left
    const sx = 70, top = 40, rest = H*0.45, scale = Math.min(70, H*0.12), y = rest + osc.x*scale;
    ctx.save(); ctx.strokeStyle = TEXT; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx - 40, top); ctx.lineTo(sx + 40, top); ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(213,220,228,.8)'; ctx.beginPath(); ctx.moveTo(sx, top); const turns = 12; for (let i = 0; i <= turns; i++){ const yy = top + 12 + (y - top - 34)*i/turns; ctx.lineTo(sx + (i % 2 ? 14 : -14)*(i && i < turns ? 1 : 0), yy); } ctx.lineTo(sx, y - 22); ctx.stroke();
    ctx.fillStyle = BLUE; ctx.fillRect(sx - 24, y - 22, 48, 44); ctx.fillStyle = '#10151B'; ctx.font = '600 13px IBM Plex Sans, system-ui'; ctx.textAlign = 'center'; ctx.fillText(`${MX.fmt(S.m, 2)} kg`, sx, y + 5); ctx.restore();
    G2line(sx + 36, rest, sx + 50, rest);
    const box = {x:170, y:30, w:W - 194, h:H - 76}, amp = Math.max(1.3, 1.15*Math.max(0, ...osc.hist.map(p => Math.abs(p[1]))));
    const M = PL.frame(ctx, box, {xr:[osc.t - span, osc.t], yr:[-amp, amp], mode:'box', zeroLine:true, xlabel:'t (s)', ylabel:'x (m)'});
    PL.line(ctx, M, osc.hist, {color:BLUE, width:2.4});
    const w0 = Math.sqrt(S.k/S.m), z = S.c/(2*Math.sqrt(S.k*S.m)), X = S.F0/Math.hypot(S.k - S.m*S.wd*S.wd, S.c*S.wd);
    $('mkRead').innerHTML = `ω₀ = √(k/m) = <b>${MX.fmt(w0, 4)} rad/s</b><br>ζ = ${MX.fmt(z, 4)}: ${z === 0 ? 'undamped' : z < 1 ? 'underdamped' : z === 1 ? 'critically damped' : 'overdamped'}` + (S.F0 ? `<br>driving at ${MX.fmt(S.wd, 3)} rad/s → steady amplitude <b>${MX.fmt(X, 4)} m</b>${Math.abs(S.wd - w0) < 0.1*w0 ? ' (near resonance)' : ''}` : '<br><span class="c">set a driving force to see forced oscillation</span>');
  }
  function G2line(x1, y, x2){ ctx.save(); ctx.strokeStyle = 'rgba(226,184,111,.6)'; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2 + 60, y); ctx.stroke(); ctx.restore(); }
  // ---- waves ----
  function drawWave(now){
    const W = canvas._w, H = canvas._h, t = rm ? 0.3 : (now - S.start)/1000, k1 = 2*Math.PI/4, w1 = 2*Math.PI*0.5, k2 = k1*S.r2, w2 = w1*S.r2;
    const y1 = x => Math.sin(k1*x - w1*t), y2 = x => S.A2*Math.sin(k2*x - S.dir*w2*t);
    const box = {x:56, y:30, w:W - 80, h:H - 76}, M = PL.frame(ctx, box, {xr:[0, 16], yr:[-2.7, 2.7], mode:'box', zeroLine:true, xlabel:'x (m)', ylabel:'y'});
    PL.fn(ctx, M, y1, {color:'rgba(124,198,190,.55)', width:1.6}); PL.fn(ctx, M, y2, {color:'rgba(226,184,111,.55)', width:1.6});
    PL.fn(ctx, M, x => y1(x) + y2(x), {color:BLUE, width:2.8});
    PL.label(ctx, box.x + 8, box.y + 16, 'wave 1 →', {color:TEAL}); PL.label(ctx, box.x + 90, box.y + 16, S.dir === 1 ? 'wave 2 →' : '← wave 2', {color:SAND}); PL.label(ctx, box.x + 175, box.y + 16, 'sum', {color:BLUE});
    const standing = S.dir === -1 && Math.abs(S.r2 - 1) < 0.005 && Math.abs(S.A2 - 1) < 0.03, beats = S.dir === 1 && Math.abs(S.r2 - 1) > 0.005 && Math.abs(S.r2 - 1) < 0.25;
    if (standing) for (let n = 0; n <= 8; n++) PL.dot(ctx, M, n*2, 0, {color:SAND, r:4});
    $('mkRead').innerHTML = `wave 1: λ = 4 m, f = 0.5 Hz, v = 2 m/s<br>wave 2: amplitude ${MX.fmt(S.A2, 3)}, f = ${MX.fmt(0.5*S.r2, 3)} Hz, ${S.dir === 1 ? 'same direction' : 'opposite direction'}<br>` + (standing ? '<b>standing wave</b>: nodes every λ/2 = 2 m stay still' : beats ? `<b>beats</b> at |f₁ − f₂| = ${MX.fmt(0.5*Math.abs(S.r2 - 1), 3)} Hz` : S.dir === 1 && Math.abs(S.r2 - 1) < 0.005 ? 'same frequency, same direction: a single wave of larger amplitude' : 'general superposition');
  }
  function loop(now){ const W = canvas._w, H = canvas._h; ctx.clearRect(0, 0, W, H); ({proj:drawProj, osc:drawOsc, wave:drawWave})[S.tab](now); requestAnimationFrame(loop); }
  $('hPlay') && $('hPlay').addEventListener('click', () => $('play').scrollIntoView({behavior: rm ? 'auto' : 'smooth'}));
  window.__mk = {S, segs};
  requestAnimationFrame(loop);
})();

// ---------------- step-by-step questions ----------------
window.FORMULA_PAGE = (G) => {
  'use strict';
  const MX = window.MX, PL = window.PLOT, D = 180/Math.PI;
  const n4 = (v, s = 4) => MX.fmt(v, s), si = (v, u, s = 4) => MX.si(v, u, s);
  const BLUE = '#8AB4F0', TEAL = '#7CC6BE', SAND = '#E2B86F', SAGE = '#8FC79A', LILAC = '#B6A2DE', RED = '#E07A6E', TEXT = '#D5DCE4';
  const cardsHTML = cards => `<div class="answer">${cards.filter(Boolean).map(c => `<div class="ans ${c.tone || 'y'}"><div class="k">${c.k}</div><div class="v">${c.v}</div><div class="s">${c.s || ''}</div></div>`).join('')}</div>`;
  const MODE_OF = m => MODES.find(x => x.id === m.id);
  const answerStep = () => ({ dur:1600, show:[], info: m => ({ title:'Answer', body: cardsHTML(MODE_OF(m).answer(m)) + (MODE_OF(m).note && MODE_OF(m).note(m) ? `<p>${MODE_OF(m).note(m)}</p>` : ''), work:'' }) });
  const pos = (v, w) => { if (!(v > 0) || !isFinite(v)) throw new Error(`${w} must be a positive number.`); };
  const fin = (v, w) => { if (!isFinite(v)) throw new Error(`Enter a number for ${w}.`); };
  const upto = (pts, k) => pts.slice(0, Math.max(2, Math.round(pts.length*Math.min(1, k))));
  const box1 = S => ({x:66, y:34, w:S.W - 92, h:S.H - 84});
  const GLYPH = {
    proj:'<path d="M3 27 C8 6, 22 6, 29 27"/><circle cx="16" cy="11" r="2.4" fill="currentColor" stroke="none"/><path d="M3 29 H29" opacity=".5"/>',
    shm:'<path d="M16 3 V6 L11 8 L21 11 L11 14 L21 17 L16 19 V21"/><rect x="11" y="21" width="10" height="8" rx="1.5"/>',
    damp:'<path d="M3 16 C6 2, 8 2, 10 16 S 14 26, 16 16 S 19 10, 21 16 S 24 19, 26 16 L29 16"/>',
    drive:'<path d="M3 27 C10 26, 13 22, 16 5 C19 22, 22 26, 29 27"/>',
    travel:'<path d="M3 16 C6 8, 9 8, 12 16 S 18 24, 21 16 S 27 8, 29 12"/><path d="M24 26 H30 M27 23 L30 26 L27 29"/>',
    string:'<path d="M3 16 C9 5, 13 5, 16 16 S 23 27, 29 16"/><path d="M3 16 C9 27, 13 27, 16 16 S 23 5, 29 16" opacity=".5"/>'
  };
  const glyph = k => `<svg viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${GLYPH[k]}</svg>`;

  const MODES = [
    { id:'proj', title:'Projectile motion', desc:'Launch speed and angle to time of flight, height, range and impact', glyph:glyph('proj'),
      fields:['v0', 'ang', 'h0', 'g'], defaults:{v0:'25', ang:'35', h0:'10', g:'9.81'},
      compute: v => {
        pos(v.v0, 'The launch speed'); fin(v.ang, 'the angle'); if (!(v.ang > -90 && v.ang < 90)) throw new Error('Use an angle between −90° and 90°.'); if (!(v.h0 >= 0)) throw new Error('The launch height must be zero or more.'); pos(v.g, 'g');
        const th = v.ang/D, vx = v.v0*Math.cos(th), vy = v.v0*Math.sin(th), tUp = Math.max(0, vy/v.g), H = v.h0 + (vy > 0 ? vy*vy/(2*v.g) : 0);
        const T = (vy + Math.sqrt(vy*vy + 2*v.g*v.h0))/v.g; if (!(T > 0)) throw new Error('With no height and no upward speed the projectile never leaves the ground.');
        const R = vx*T, vyf = vy - v.g*T, vf = Math.hypot(vx, vyf), angF = Math.atan2(vyf, vx)*D;
        return {id:'proj', ...v, th, vx, vy, tUp, H, T, R, vyf, vf, angF};
      },
      problem: m => ({ chips:[`v₀ = ${si(m.v0, 'm/s')}`, `θ = ${n4(m.ang)}°`, `h₀ = ${si(m.h0, 'm')}`, `g = ${n4(m.g)} m/s²`] }),
      steps: () => [
        { dur:2200, show:['comp'], info: m => ({ title:'Split the velocity', body:'<p>Horizontal and vertical motion are independent: constant speed sideways, constant acceleration −g vertically.</p>', work:`v<sub>x</sub> = v₀ cos θ = <b>${si(m.vx, 'm/s')}</b><br>v<sub>y</sub> = v₀ sin θ = <b>${si(m.vy, 'm/s')}</b>` }), rd: m => [['v<sub>x</sub>', si(m.vx, 'm/s')], ['v<sub>y</sub> at launch', si(m.vy, 'm/s')]] },
        { dur:2600, show:['apex'], info: m => ({ title:'Highest point', body: m.vy > 0 ? '<p>At the top the vertical velocity is zero.</p>' : '<p>It is launched level or downwards, so the highest point is the launch point.</p>', work:`t<sub>up</sub> = v<sub>y</sub>/g = ${si(m.tUp, 's')}<br>H = h₀ + v<sub>y</sub>²/(2g) = <b>${si(m.H, 'm')}</b>` }), rd: m => ['Maximum height', si(m.H, 'm')] },
        { dur:2800, show:['path'], info: m => ({ title:'Time of flight', body:'<p>Set y = 0 in y = h₀ + v<sub>y</sub>t − ½gt² and take the positive root.</p>', work:`½g t² − v<sub>y</sub>t − h₀ = 0<br>t = (v<sub>y</sub> + √(v<sub>y</sub>² + 2gh₀))/g = <b>${si(m.T, 's')}</b>` }), rd: m => ['Time of flight', si(m.T, 's')] },
        { dur:2400, show:['land'], info: m => ({ title:'Range and impact', body:'<p>Horizontal distance is v<sub>x</sub> times the flight time. At impact the vertical speed has grown by gT.</p>', work:`R = v<sub>x</sub>T = <b>${si(m.R, 'm')}</b><br>v<sub>y</sub> at impact = ${si(m.vyf, 'm/s')}<br>speed ${si(m.vf, 'm/s')} at ${n4(m.angF)}° to the ground` }), rd: m => [['Range', si(m.R, 'm')], ['Impact speed', `${si(m.vf, 'm/s')} at ${n4(m.angF)}°`]] },
        answerStep()],
      answer: m => [{tone:'y', k:'Range', v:si(m.R, 'm'), s:`flight ${si(m.T, 's')}`}, {tone:'s1', k:'Maximum height', v:si(m.H, 'm'), s:`impact ${si(m.vf, 'm/s')}`}],
      scene: (m, S) => {
        const ctx = G.ctx(), xm = Math.max(m.R, 1), ym = Math.max(m.H, 1), b = box1(S), sc = Math.min(b.w/(xm*1.08), b.h/(ym*1.18)), M = PL.frame(ctx, b, {xr:[0, b.w/sc], yr:[0, b.h/sc], mode:'box', xlabel:'x (m)', ylabel:'y (m)'});
        const pts = MX.linspace(0, m.T, 300).map(t => [m.vx*t, m.h0 + m.vy*t - m.g*t*t/2]);
        if (m.h0 > 0) PL.line(ctx, M, [[0, 0], [0, m.h0]], {color:'rgba(213,220,228,.5)', width:5});
        const vc = S.vis('comp'), L = 0.25*Math.min(b.w, b.h)/m.v0;
        if (vc > 0){ const X = M.X(0), Y = M.Y(m.h0); G.arrow(X, Y, X + m.vx*L*vc, Y, TEAL, 2.4, {a:vc}); G.arrow(X, Y, X, Y - m.vy*L*vc, SAND, 2.4, {a:vc}); G.arrow(X, Y, X + m.vx*L*vc, Y - m.vy*L*vc, '#fff', 2.6, {a:vc}); G.text('vₓ', X + m.vx*L + 4, Y + 14, {color:TEAL, a:vc}); G.text('v_y'.replace('_y', 'ᵧ'), X - 18, Y - m.vy*L, {color:SAND, a:vc}); }
        PL.line(ctx, M, upto(pts, S.vis('path')), {color:BLUE, width:2.6});
        const va = S.vis('apex'); if (va > 0) PL.dot(ctx, M, m.vx*m.tUp, m.H, {color:SAND, r:5.5, alpha:va, label:`H = ${si(m.H, 'm', 3)}`, dy:-12});
        const vl = S.vis('land'); if (vl > 0){ PL.dot(ctx, M, m.R, 0, {color:SAND, r:5.5, alpha:vl, label:`R = ${si(m.R, 'm', 3)}`, dy:-12, dx:-8, align:'right'}); const X = M.X(m.R), Y = M.Y(0), l2 = L*.8; G.arrow(X - m.vx*l2, Y + m.vyf*l2, X, Y, '#fff', 2.4, {a:vl}); }
      } },

    { id:'shm', title:'Simple harmonic motion', desc:'Mass on a spring: ω, period, amplitude, phase and x, v, a at any time', glyph:glyph('shm'),
      fields:['m', 'k', 'x0', 'v0', 't'], defaults:{m:'0.5', k:'200', x0:'0.05', v0:'1.2', t:'0.1'},
      compute: v => {
        pos(v.m, 'The mass'); pos(v.k, 'The spring constant'); fin(v.x0, 'x₀'); fin(v.v0, 'v₀'); fin(v.t, 't');
        const w = Math.sqrt(v.k/v.m), A = Math.hypot(v.x0, v.v0/w); if (A === 0) throw new Error('With x₀ = 0 and v₀ = 0 nothing moves.');
        const ph = Math.atan2(-v.v0/w, v.x0), x = A*Math.cos(w*v.t + ph), vel = -A*w*Math.sin(w*v.t + ph), acc = -w*w*x;
        return {id:'shm', ...v, w, f:w/(2*Math.PI), T:2*Math.PI/w, A, ph, x, vel, acc, E:0.5*v.k*A*A, vmax:A*w, amax:A*w*w};
      },
      problem: m => ({ chips:[`m = ${si(m.m, 'kg')}`, `k = ${n4(m.k)} N/m`, `x₀ = ${si(m.x0, 'm')}`, `v₀ = ${si(m.v0, 'm/s')}`, `t = ${si(m.t, 's')}`] }),
      steps: () => [
        { dur:2200, show:['w'], info: m => ({ title:'Natural frequency', body:'<p>Hooke’s law F = −kx gives x″ = −(k/m)x, whose solutions oscillate at ω = √(k/m).</p>', work:`ω = √(k/m) = <b>${n4(m.w)} rad/s</b><br>f = ω/2π = ${si(m.f, 'Hz')}, T = 2π/ω = <b>${si(m.T, 's')}</b>` }), rd: m => [['ω', `${n4(m.w)} rad/s`], ['Period T', si(m.T, 's')]] },
        { dur:2600, show:['amp'], info: m => ({ title:'Amplitude and phase', body:'<p>Match x = A cos(ωt + φ) to the starting position and velocity.</p>', work:`A = √(x₀² + (v₀/ω)²) = <b>${si(m.A, 'm')}</b><br>φ = atan2(−v₀/ω, x₀) = ${n4(m.ph)} rad = ${n4(m.ph*D)}°` }), rd: m => [['Amplitude A', si(m.A, 'm')], ['Phase φ', `${n4(m.ph)} rad`]] },
        { dur:2600, show:['curve', 'pt'], info: m => ({ title:`At t = ${si(m.t, 's')}`, body:'<p>Differentiate once for velocity and again for acceleration.</p>', work:`x = A cos(ωt + φ) = <b>${si(m.x, 'm')}</b><br>v = −Aω sin(ωt + φ) = <b>${si(m.vel, 'm/s')}</b><br>a = −ω²x = <b>${si(m.acc, 'm/s²')}</b>` }), rd: m => [['x(t)', si(m.x, 'm')], ['v(t)', si(m.vel, 'm/s')], ['a(t)', si(m.acc, 'm/s²')]] },
        { dur:2000, show:[], info: m => ({ title:'Energy', body:'<p>The total energy stays constant, swapping between spring and motion.</p>', work:`E = ½kA² = <b>${si(m.E, 'J')}</b><br>v<sub>max</sub> = Aω = ${si(m.vmax, 'm/s')}, a<sub>max</sub> = Aω² = ${si(m.amax, 'm/s²')}` }), rd: m => ['Energy', si(m.E, 'J')] },
        answerStep()],
      answer: m => [{tone:'y', k:'Motion', v:`x = ${n4(m.A, 4)} cos(${n4(m.w, 4)}t ${m.ph < 0 ? '−' : '+'} ${n4(Math.abs(m.ph), 4)})`, s:`T = ${si(m.T, 's')}`}, {tone:'s1', k:`At t = ${si(m.t, 's', 3)}`, v:`${si(m.x, 'm', 3)}, ${si(m.vel, 'm/s', 3)}`, s:`a = ${si(m.acc, 'm/s²')}`}],
      scene: (m, S) => {
        const ctx = G.ctx(), tmax = Math.max(2.2*m.T, m.t*1.2), M = PL.frame(ctx, box1(S), {xr:[0, tmax], yr:[-m.A*1.3, m.A*1.3], mode:'box', zeroLine:true, xlabel:'t (s)', ylabel:'x (m)'});
        const vw = S.vis('w'); if (vw > 0) for (let k = 1; k*m.T <= tmax; k++){ PL.vline(ctx, M, k*m.T, {color:'rgba(226,184,111,.5)', alpha:vw}); PL.label(ctx, M.X(k*m.T) + 3, M.box.y + 14, `${k}T`, {color:SAND, size:11, alpha:vw}); }
        const va = S.vis('amp'); if (va > 0){ PL.hline(ctx, M, m.A, {color:'rgba(182,162,222,.7)', alpha:va}); PL.hline(ctx, M, -m.A, {color:'rgba(182,162,222,.7)', alpha:va}); PL.label(ctx, M.box.x + 6, M.Y(m.A) - 6, `±A = ${si(m.A, 'm', 3)}`, {color:LILAC, size:11.5, alpha:va}); PL.dot(ctx, M, 0, m.x0, {color:'#fff', r:4.5, alpha:va}); }
        PL.line(ctx, M, upto(MX.linspace(0, tmax, 500).map(t => [t, m.A*Math.cos(m.w*t + m.ph)]), S.vis('curve')), {color:BLUE, width:2.6});
        const vp = S.vis('pt'); if (vp > 0) PL.dot(ctx, M, m.t, m.x, {color:SAND, r:6, alpha:vp, label:`x = ${si(m.x, 'm', 3)}`});
      } },

    { id:'damped', title:'Damped oscillator', desc:'Damping ratio, regime, decay, logarithmic decrement and Q', glyph:glyph('damp'),
      fields:['m', 'k', 'c', 'x0', 'v0', 't'], defaults:{m:'2', k:'50', c:'2', x0:'0.1', v0:'0', t:'1.5'},
      compute: v => {
        pos(v.m, 'The mass'); pos(v.k, 'The spring constant'); if (!(v.c >= 0)) throw new Error('The damping coefficient c must be zero or more.'); fin(v.x0, 'x₀'); fin(v.v0, 'v₀'); if (!(v.t >= 0)) throw new Error('t must be zero or more.');
        const w0 = Math.sqrt(v.k/v.m), cc = 2*Math.sqrt(v.k*v.m), z = v.c/cc, a = v.c/(2*v.m);
        let x, kind, wd = null, xs;
        if (Math.abs(z - 1) < 1e-9){ kind = 'critical'; const B = v.v0 + a*v.x0; xs = t => (v.x0 + B*t)*Math.exp(-a*t); }
        else if (z < 1){ kind = z === 0 ? 'undamped' : 'underdamped'; wd = w0*Math.sqrt(1 - z*z); const B = (v.v0 + a*v.x0)/wd; xs = t => Math.exp(-a*t)*(v.x0*Math.cos(wd*t) + B*Math.sin(wd*t)); }
        else { kind = 'overdamped'; const r = Math.sqrt(a*a - w0*w0), s1 = -a + r, s2 = -a - r, C2 = (v.v0 - s1*v.x0)/(s2 - s1), C1 = v.x0 - C2; xs = t => C1*Math.exp(s1*t) + C2*Math.exp(s2*t); }
        x = xs(v.t);
        return {id:'damped', ...v, w0, cc, z, a, wd, kind, xs, x, delta: wd ? 2*Math.PI*a/wd : null, Q: z > 0 ? 1/(2*z) : Infinity, tau:a > 0 ? 1/a : Infinity};
      },
      problem: m => ({ chips:[`m = ${si(m.m, 'kg')}`, `k = ${n4(m.k)} N/m`, `c = ${n4(m.c)} N·s/m`, `x₀ = ${si(m.x0, 'm')}`, `v₀ = ${si(m.v0, 'm/s')}`] }),
      steps: () => [
        { dur:2400, show:[], info: m => ({ title:'Natural frequency and critical damping', body:'<p>m x″ + c x′ + k x = 0. Compare c with the critical value 2√(km).</p>', work:`ω₀ = √(k/m) = ${n4(m.w0)} rad/s<br>c<sub>c</sub> = 2√(km) = ${n4(m.cc)} N·s/m<br>ζ = c/c<sub>c</sub> = <b>${n4(m.z)}</b>` }), rd: m => ['Damping ratio ζ', n4(m.z)] },
        { dur:3000, show:['curve'], info: m => ({ title: m.kind[0].toUpperCase() + m.kind.slice(1), body: m.kind === 'overdamped' ? '<p>ζ > 1: it creeps back without oscillating.</p>' : m.kind === 'critical' ? '<p>ζ = 1: the fastest return without overshoot.</p>' : '<p>ζ < 1: it oscillates inside a decaying envelope.</p>', work: m.wd ? `ω<sub>d</sub> = ω₀√(1 − ζ²) = <b>${n4(m.wd)} rad/s</b><br>x(t) = e<sup>−${n4(m.a)}t</sup>(${n4(m.x0)} cos ω<sub>d</sub>t + ${n4((m.v0 + m.a*m.x0)/m.wd)} sin ω<sub>d</sub>t)` : m.kind === 'critical' ? `x(t) = (${n4(m.x0)} + ${n4(m.v0 + m.a*m.x0)}t)e<sup>−${n4(m.a)}t</sup>` : 'x(t) = C₁e<sup>s₁t</sup> + C₂e<sup>s₂t</sup>' }), rd: m => m.wd ? ['Damped frequency ω<sub>d</sub>', `${n4(m.wd)} rad/s`] : [] },
        { dur:2400, show:['pt'], info: m => ({ title:`At t = ${si(m.t, 's')}`, body:'<p>Put the time into x(t).</p>', work:`x(${n4(m.t)}) = <b>${si(m.x, 'm')}</b>` }), rd: m => [`x(${n4(m.t)} s)`, si(m.x, 'm')] },
        { dur:2400, show:['env'], info: m => ({ title:'How fast it dies away', body: m.wd && m.a > 0 ? '<p>Each cycle the amplitude shrinks by the same factor. The logarithmic decrement and Q describe that.</p>' : '<p>Decay is set by the slower exponential.</p>', work: m.delta ? `envelope time constant 1/(ζω₀) = ${si(m.tau, 's')}<br>δ = ln(x<sub>n</sub>/x<sub>n+1</sub>) = 2πζ/√(1 − ζ²) = <b>${n4(m.delta)}</b><br>Q = 1/(2ζ) = ${n4(m.Q)}` : `Q = ${isFinite(m.Q) ? n4(m.Q) : '∞'}` }), rd: m => m.delta ? [['Log decrement δ', n4(m.delta)], ['Q factor', n4(m.Q)]] : ['Q factor', isFinite(m.Q) ? n4(m.Q) : '∞'] },
        answerStep()],
      answer: m => [{tone:'y', k:m.kind, v:`ζ = ${n4(m.z)}`, s: m.wd ? `ω<sub>d</sub> = ${n4(m.wd)} rad/s` : ''}, {tone:'s1', k:`x at ${si(m.t, 's', 3)}`, v:si(m.x, 'm'), s: m.delta ? `δ = ${n4(m.delta)}` : ''}],
      scene: (m, S) => {
        const ctx = G.ctx(), T = Math.max(m.t*1.2, m.a > 0 ? Math.min(6/m.a, m.wd ? 12*2*Math.PI/m.wd : 6/m.a) : 6*2*Math.PI/m.w0), pts = MX.linspace(0, T, 600).map(t => [t, m.xs(t)]), A = Math.max(...pts.map(p => Math.abs(p[1])), 1e-9);
        const M = PL.frame(ctx, box1(S), {xr:[0, T], yr:[-A*1.2, A*1.2], mode:'box', zeroLine:true, xlabel:'t (s)', ylabel:'x (m)'});
        const ve = S.vis('env'); if (ve > 0 && m.wd && m.a > 0){ const E0 = Math.hypot(m.x0, (m.v0 + m.a*m.x0)/m.wd); [1, -1].forEach(sg => PL.fn(ctx, M, t => sg*E0*Math.exp(-m.a*t), {color:'rgba(182,162,222,.7)', width:1.4, dash:[5, 4], alpha:ve})); }
        PL.line(ctx, M, upto(pts, S.vis('curve')), {color:BLUE, width:2.6});
        PL.dot(ctx, M, m.t, m.x, {color:SAND, r:6, alpha:S.vis('pt'), label:si(m.x, 'm', 3)});
      } },

    { id:'driven', title:'Driven oscillator and resonance', desc:'Steady-state amplitude and phase, resonance peak', glyph:glyph('drive'),
      fields:['m', 'k', 'c', 'F0', 'w'], defaults:{m:'1', k:'100', c:'4', F0:'5', w:'8'},
      compute: v => {
        pos(v.m, 'The mass'); pos(v.k, 'The spring constant'); if (!(v.c >= 0)) throw new Error('c must be zero or more.'); pos(v.F0, 'The force amplitude'); pos(v.w, 'The driving frequency');
        const w0 = Math.sqrt(v.k/v.m), z = v.c/(2*Math.sqrt(v.k*v.m)), Xf = w => v.F0/Math.hypot(v.k - v.m*w*w, v.c*w), X = Xf(v.w);
        if (!isFinite(X)) throw new Error('Driving an undamped oscillator exactly at resonance gives an amplitude that grows forever.');
        const ph = Math.atan2(v.c*v.w, v.k - v.m*v.w*v.w), wr = z < Math.SQRT1_2 ? w0*Math.sqrt(1 - 2*z*z) : 0, Xmax = wr > 0 ? Xf(wr) : v.F0/v.k;
        return {id:'driven', ...v, w0, z, X, Xf, ph, wr, Xmax, Xst:v.F0/v.k};
      },
      problem: m => ({ chips:[`m = ${si(m.m, 'kg')}`, `k = ${n4(m.k)} N/m`, `c = ${n4(m.c)} N·s/m`, `F = ${n4(m.F0)} cos(${n4(m.w)}t) N`] }),
      steps: () => [
        { dur:2200, show:['curve'], info: m => ({ title:'Natural frequency and damping', body:'<p>m x″ + c x′ + k x = F₀ cos ωt. After the transient dies away x = X cos(ωt − φ).</p>', work:`ω₀ = ${n4(m.w0)} rad/s, ζ = ${n4(m.z)}<br>static deflection F₀/k = ${si(m.Xst, 'm')}` }), rd: m => ['ω₀', `${n4(m.w0)} rad/s`] },
        { dur:2600, show:['pt'], info: m => ({ title:'Steady-state amplitude and phase', body:'<p>Substitute the trial solution and solve for X and φ.</p>', work:`X = F₀/√((k − mω²)² + (cω)²) = <b>${si(m.X, 'm')}</b><br>φ = atan(cω/(k − mω²)) = <b>${n4(m.ph*D)}°</b> (response lags the force)` }), rd: m => [['Amplitude X', si(m.X, 'm')], ['Phase lag φ', `${n4(m.ph*D)}°`]] },
        { dur:2600, show:['peak'], info: m => ({ title:'Resonance', body: m.wr > 0 ? '<p>The amplitude peaks a little below ω₀ when there is damping.</p>' : '<p>With ζ ≥ 1/√2 there is no peak: the amplitude only falls as ω rises.</p>', work: m.wr > 0 ? `ω<sub>r</sub> = ω₀√(1 − 2ζ²) = <b>${n4(m.wr)} rad/s</b><br>X<sub>max</sub> = ${si(m.Xmax, 'm')} (${n4(m.Xmax/m.Xst)}× the static deflection)` : 'no resonance peak' }), rd: m => ['Resonant frequency', m.wr > 0 ? `${n4(m.wr)} rad/s` : 'none'] },
        answerStep()],
      answer: m => [{tone:'y', k:'Steady-state amplitude', v:si(m.X, 'm'), s:`phase lag ${n4(m.ph*D)}°`}, {tone:'s1', k:'Resonance', v: m.wr > 0 ? `${n4(m.wr)} rad/s` : 'none', s: m.wr > 0 ? `peak ${si(m.Xmax, 'm')}` : ''}],
      scene: (m, S) => {
        const ctx = G.ctx(), wmax = Math.max(2.2*m.w0, 1.2*m.w), ws = MX.linspace(wmax/600, wmax, 600), ymax = Math.max(m.Xmax, m.X)*1.2, M = PL.frame(ctx, box1(S), {xr:[0, wmax], yr:[0, ymax], mode:'box', xlabel:'ω (rad/s)', ylabel:'X (m)'});
        PL.line(ctx, M, upto(ws.map(w => [w, m.Xf(w)]), S.vis('curve')), {color:BLUE, width:2.6});
        PL.vline(ctx, M, m.w0, {color:'rgba(213,220,228,.35)', alpha:S.vis('curve')}); if (S.vis('curve') > 0) PL.label(ctx, M.X(m.w0) + 4, M.box.y + 14, 'ω₀', {color:TEXT, size:12});
        const vk = S.vis('peak'); if (vk > 0 && m.wr > 0) PL.dot(ctx, M, m.wr, m.Xmax, {color:LILAC, r:5.5, alpha:vk, label:`peak at ${n4(m.wr, 3)}`});
        const vp = S.vis('pt'); if (vp > 0){ PL.vline(ctx, M, m.w, {color:'rgba(226,184,111,.6)', alpha:vp}); PL.dot(ctx, M, m.w, m.X, {color:SAND, r:6, alpha:vp, label:`X = ${si(m.X, 'm', 3)}`}); }
      } },

    { id:'travel', title:'Travelling wave', desc:'y = A sin(kx − ωt + φ): k, ω, speed, displacement and particle velocity', glyph:glyph('travel'),
      fields:['A', 'lam', 'f', 'phi', 'dirw', 'x', 't'], defaults:{A:'0.02', lam:'0.5', f:'40', phi:'0', dirw:'pos', x:'0.3', t:'0.01'},
      compute: v => {
        pos(v.A, 'A'); pos(v.lam, 'λ'); pos(v.f, 'f'); fin(v.phi, 'φ'); fin(v.x, 'x'); fin(v.t, 't');
        const k = 2*Math.PI/v.lam, w = 2*Math.PI*v.f, sg = v.dirw === 'pos' ? -1 : 1, ph = v.phi/D, arg = k*v.x + sg*w*v.t + ph;
        return {id:'travel', ...v, k, w, sg, ph, vel:v.f*v.lam, T:1/v.f, y:v.A*Math.sin(arg), uy:v.A*sg*w*Math.cos(arg), umax:v.A*w, arg};
      },
      problem: m => ({ chips:[`A = ${si(m.A, 'm')}`, `λ = ${si(m.lam, 'm')}`, `f = ${si(m.f, 'Hz')}`, m.dirw === 'pos' ? 'moving in +x' : 'moving in −x', `x = ${si(m.x, 'm')}, t = ${si(m.t, 's')}`] }),
      steps: () => [
        { dur:2200, show:['wave'], info: m => ({ title:'Wave number and angular frequency', body:'<p>k counts radians per metre, ω radians per second.</p>', work:`k = 2π/λ = <b>${n4(m.k)} rad/m</b><br>ω = 2πf = <b>${n4(m.w)} rad/s</b><br>y = ${n4(m.A)} sin(${n4(m.k)}x ${m.sg < 0 ? '−' : '+'} ${n4(m.w)}t${m.phi ? ` + ${n4(m.ph)}` : ''})` }), rd: m => [['k', `${n4(m.k)} rad/m`], ['ω', `${n4(m.w)} rad/s`]] },
        { dur:2200, show:['move'], info: m => ({ title:'Wave speed', body:'<p>The pattern moves one wavelength each period.</p>', work:`v = fλ = ω/k = <b>${si(m.vel, 'm/s')}</b><br>T = 1/f = ${si(m.T, 's')}` }), rd: m => ['Wave speed', si(m.vel, 'm/s')] },
        { dur:2600, show:['pt'], info: m => ({ title:`At x = ${si(m.x, 'm')}, t = ${si(m.t, 's')}`, body:'<p>The displacement comes from the formula; the particle velocity is ∂y/∂t, which is not the wave speed.</p>', work:`phase = ${n4(m.arg)} rad<br>y = <b>${si(m.y, 'm')}</b><br>∂y/∂t = <b>${si(m.uy, 'm/s')}</b> (max Aω = ${si(m.umax, 'm/s')})` }), rd: m => [['Displacement y', si(m.y, 'm')], ['Particle velocity', si(m.uy, 'm/s')]] },
        answerStep()],
      answer: m => [{tone:'y', k:'Displacement', v:si(m.y, 'm'), s:`particle velocity ${si(m.uy, 'm/s')}`}, {tone:'s1', k:'Wave speed', v:si(m.vel, 'm/s'), s:`k = ${n4(m.k)} rad/m, ω = ${n4(m.w)} rad/s`}],
      scene: (m, S) => {
        const ctx = G.ctx(), xr = [Math.min(0, m.x - m.lam), Math.max(2*m.lam, m.x + m.lam)], M = PL.frame(ctx, box1(S), {xr, yr:[-m.A*1.6, m.A*1.6], mode:'box', zeroLine:true, xlabel:'x (m)', ylabel:'y (m)'});
        const vm = S.vis('move'), tt = m.t - (1 - vm)*m.T*0.25;
        if (vm > 0) PL.fn(ctx, M, x => m.A*Math.sin(m.k*x + m.sg*m.w*(m.t - m.T/4) + m.ph), {color:'rgba(213,220,228,.3)', width:1.4, dash:[5, 4], alpha:vm});
        PL.fn(ctx, M, x => m.A*Math.sin(m.k*x + m.sg*m.w*tt + m.ph), {color:BLUE, width:2.6, alpha:S.vis('wave')});
        if (vm > 0){ const xa = xr[0] + (xr[1] - xr[0])*0.15; G.arrow(M.X(xa), M.box.y + 22, M.X(xa) - m.sg*60, M.box.y + 22, SAND, 2.4, {a:vm}); G.text(`v = ${si(m.vel, 'm/s', 3)}`, M.X(xa) - m.sg*70 + (m.sg < 0 ? 8 : -90), M.box.y + 26, {color:SAND, a:vm}); }
        const vp = S.vis('pt'); if (vp > 0){ PL.dot(ctx, M, m.x, m.y, {color:'#fff', r:6, alpha:vp, label:`y = ${si(m.y, 'm', 3)}`}); G.arrow(M.X(m.x), M.Y(m.y), M.X(m.x), M.Y(m.y) - (m.uy/m.umax)*0.22*M.box.h, SAND, 2.4, {a:vp}); G.text('∂y/∂t', M.X(m.x) + 8, M.Y(m.y) - (m.uy/m.umax)*0.22*M.box.h, {color:SAND, a:vp, halo:true}); }
      } },

    { id:'string', title:'Standing waves', desc:'Harmonics on a string or in an open or closed pipe: f, λ, nodes', glyph:glyph('string'),
      fields:['med', 'L', 'Ten', 'mu', 'vs', 'n'], defaults:{med:'string', L:'0.65', Ten:'70', mu:'1.2', vs:'343', n:'3'},
      compute: v => {
        pos(v.L, 'The length'); const n = v.n; if (!(Number.isInteger(n) && n >= 1 && n <= 20)) throw new Error('The harmonic number must be a whole number from 1 to 20.');
        let vel;
        if (v.med === 'string'){ pos(v.Ten, 'The tension'); pos(v.mu, 'The mass per length'); vel = Math.sqrt(v.Ten/(v.mu*1e-3)); } else { pos(v.vs, 'The speed of sound'); vel = v.vs; }
        if (v.med === 'closed' && n % 2 === 0) throw new Error('A pipe closed at one end only has odd harmonics (n = 1, 3, 5, …).');
        const lam = v.med === 'closed' ? 4*v.L/n : 2*v.L/n, f = vel/lam, f1 = v.med === 'closed' ? vel/(4*v.L) : vel/(2*v.L);
        // displacement nodes: fixed ends of a string, the closed end of a pipe; open ends are antinodes
        const nodes = [], anti = [];
        if (v.med === 'string'){ for (let i = 0; i <= n; i++) nodes.push(i*lam/2); for (let i = 0; i < n; i++) anti.push((i + .5)*lam/2); }
        else if (v.med === 'open'){ for (let i = 0; i <= n; i++) anti.push(i*lam/2); for (let i = 0; i < n; i++) nodes.push((i + .5)*lam/2); }
        else { for (let i = 0; i*lam/2 <= v.L + 1e-12; i++) nodes.push(i*lam/2); for (let i = 0; (i + .5)*lam/2 <= v.L + 1e-12; i++) anti.push((i + .5)*lam/2); }
        return {id:'string', ...v, n, vel, lam, f, f1, nodes, anti};
      },
      problem: m => ({ chips:[{string:'string fixed at both ends', open:'pipe open at both ends', closed:'pipe closed at one end'}[m.med], `L = ${si(m.L, 'm')}`].concat(m.med === 'string' ? [`T = ${n4(m.Ten)} N`, `μ = ${n4(m.mu)} g/m`] : [`v = ${n4(m.vs)} m/s`]).concat([`harmonic n = ${m.n}`]) }),
      steps: () => [
        { dur:2200, show:['ends'], info: m => ({ title:'Wave speed', body: m.med === 'string' ? '<p>On a string the speed depends on the tension and the mass per length.</p>' : '<p>In a pipe the waves travel at the speed of sound.</p>', work: m.med === 'string' ? `v = √(T/μ) = √(${n4(m.Ten)}/${n4(m.mu*1e-3)}) = <b>${si(m.vel, 'm/s')}</b>` : `v = <b>${si(m.vel, 'm/s')}</b>` }), rd: m => ['Wave speed', si(m.vel, 'm/s')] },
        { dur:2600, show:['mode'], info: m => ({ title:'Fit whole loops in the length', body: m.med === 'closed' ? '<p>A closed end is a node and an open end an antinode, so only odd quarter-wavelengths fit: L = nλ/4 with n odd.</p>' : `<p>Both ends are ${m.med === 'string' ? 'nodes' : 'antinodes'}, so a whole number of half-wavelengths fits: L = nλ/2.</p>`, work:`λ<sub>${m.n}</sub> = ${m.med === 'closed' ? '4L/n' : '2L/n'} = <b>${si(m.lam, 'm')}</b><br>f<sub>${m.n}</sub> = v/λ = <b>${si(m.f, 'Hz')}</b><br>fundamental f₁ = ${si(m.f1, 'Hz')}` }), rd: m => [['Wavelength', si(m.lam, 'm')], ['Frequency', si(m.f, 'Hz')]] },
        { dur:2400, show:['nodes'], info: m => ({ title:'Nodes and antinodes', body:'<p>Nodes never move; antinodes swing the most. They alternate every λ/4.</p>', work:`nodes at ${m.nodes.map(x => n4(x, 3)).join(', ')} m<br>antinodes at ${m.anti.map(x => n4(x, 3)).join(', ')} m` }), rd: m => ['Nodes (m)', m.nodes.map(x => n4(x, 3)).join(', ')] },
        answerStep()],
      answer: m => [{tone:'y', k:`Harmonic ${m.n}`, v:si(m.f, 'Hz'), s:`λ = ${si(m.lam, 'm')}`}, {tone:'s1', k:'Fundamental', v:si(m.f1, 'Hz'), s:`${m.nodes.length} nodes`}],
      scene: (m, S) => {
        const x0 = 70, x1 = S.W - 70, yc = S.H/2, Aw = Math.min(90, S.H*0.25), X = x => x0 + (x1 - x0)*x/m.L, kk = 2*Math.PI/m.lam, t = S.t;
        const shape = x => m.med === 'open' ? Math.cos(kk*x) : Math.sin(kk*x);
        const ve = S.vis('ends'), vmo = S.vis('mode'), vn = S.vis('nodes');
        if (m.med === 'string'){ [x0, x1].forEach(x => G.roundRect(x - 5, yc - 40, 10, 80, 2, 'rgba(213,220,228,.6)', {a:ve})); }
        else { G.line(x0, yc - Aw - 20, x1, yc - Aw - 20, 'rgba(213,220,228,.5)', 3, {a:ve}); G.line(x0, yc + Aw + 20, x1, yc + Aw + 20, 'rgba(213,220,228,.5)', 3, {a:ve}); if (m.med === 'closed') G.line(x0, yc - Aw - 20, x0, yc + Aw + 20, 'rgba(213,220,228,.8)', 5, {a:ve}); }
        if (vmo > 0){ const env = MX.linspace(0, m.L, 400); [1, -1].forEach(sg => G.path(env.map(x => [X(x), yc - sg*Aw*shape(x)]), 'rgba(138,180,240,.25)', 1.4, {a:vmo})); G.path(env.map(x => [X(x), yc - Aw*shape(x)*Math.cos(2*Math.PI*0.6*t)]), BLUE, 2.8, {a:vmo}); }
        if (vn > 0){ m.nodes.forEach(x => G.circle(X(x), yc, 6, {fill:SAND, a:vn})); m.anti.forEach(x => G.circle(X(x), yc, 5, {stroke:LILAC, w:2, a:vn})); G.text('● node', x0, S.H - 22, {color:SAND, a:vn}); G.text('○ antinode', x0 + 80, S.H - 22, {color:LILAC, a:vn}); }
        G.text(`L = ${si(m.L, 'm', 3)}`, (x0 + x1)/2, S.H - 22, {align:'center', color:TEXT, a:ve}); G.text(`n = ${m.n}: f = ${si(m.f, 'Hz', 4)}`, (x0 + x1)/2, 34, {align:'center', size:15, a:vmo});
      } }
  ];
  const FIELDS = {
    v0:{label:'Launch speed v₀ (m/s)'}, ang:{label:'Angle θ (degrees)'}, h0:{label:'Launch height h₀ (m)'}, g:{label:'g (m/s²)'},
    m:{label:'Mass m (kg)'}, k:{label:'Spring constant k (N/m)'}, x0:{label:'Starting x₀ (m)'}, t:{label:'Time t (s)', showIf: v => v.med === undefined}, c:{label:'Damping c (N·s/m)'},
    F0:{label:'Force amplitude F₀ (N)'}, w:{label:'Driving ω (rad/s)'},
    A:{label:'Amplitude A (m)'}, lam:{label:'Wavelength λ (m)'}, f:{label:'Frequency f (Hz)'}, phi:{label:'Phase φ (degrees)'}, dirw:{label:'Direction', type:'select', options:[['pos', 'Towards +x'], ['neg', 'Towards −x']]}, x:{label:'Position x (m)'},
    med:{label:'Medium', type:'select', options:[['string', 'String, both ends fixed'], ['open', 'Pipe open at both ends'], ['closed', 'Pipe closed at one end']]}, L:{label:'Length L (m)'}, Ten:{label:'Tension T (N)', showIf: v => v.med === 'string'}, mu:{label:'Mass per length μ (g/m)', showIf: v => v.med === 'string'}, vs:{label:'Speed of sound (m/s)', showIf: v => v.med !== 'string'}, n:{label:'Harmonic n'}
  };
  // the SHM and damped questions use v₀ as an initial velocity (m/s); the projectile uses it as a launch speed
  FIELDS.v0 = {label:'v₀ (m/s)'};
  return {MODES, FIELDS};
};
