
(() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const FONT = 'Bricolage Grotesque, system-ui, sans-serif';
  const COL = {red:'#e0367a', blue:'#0f8fb3', green:'#e58a00', purple:'#6c3cf0', ink:'#221b45', match:'#13906a'};
  const PI = Math.PI, TAU = 2*Math.PI;
  const reduceMotion = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const $ = id => document.getElementById(id);
  const gridG = $('grid'), ov = $('ov');

  // ---------- maths ----------
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = t => t < .5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2)/2;
  const seg = (p, a, b) => clamp((p - a)/(b - a));
  const mod = (a, n) => ((a % n) + n) % n;
  const deg = a => a*180/PI;
  const polar = (r, a) => [r*Math.cos(a), r*Math.sin(a)];
  const rot = (P, a) => [P[0]*Math.cos(a) - P[1]*Math.sin(a), P[0]*Math.sin(a) + P[1]*Math.cos(a)];
  const cdiv = (a, b) => { const d = b[0]*b[0] + b[1]*b[1]; return [(a[0]*b[0] + a[1]*b[1])/d, (a[1]*b[0] - a[0]*b[1])/d]; };
  function toG(z){
    if (!isFinite(z[0]) || !isFinite(z[1])) return [1, 0];
    const d = (z[0] + 1)*(z[0] + 1) + z[1]*z[1];
    return [(z[0]*z[0] + z[1]*z[1] - 1)/d, 2*z[1]/d];
  }
  const gam = (r, x) => toG([r, x]);
  function fromG(G){
    const d = (1 - G[0])*(1 - G[0]) + G[1]*G[1];
    if (d < 1e-14) return [Infinity, 0];
    return [(1 - G[0]*G[0] - G[1]*G[1])/d, 2*G[1]/d];
  }
  const ang = P => Math.atan2(P[1], P[0]);
  const wtgA = a => mod(0.25 - a/(2*TAU), 0.5);            // wavelengths-toward-generator reading at angle a
  const cw = (a0, a1) => mod(a0 - a1, TAU)/(2*TAU);         // clockwise distance (in λ) from angle a0 to a1
  const stubLen = (bs, a0) => cw(a0, ang(toG([0, bs])));    // stub length for susceptance bs, starting at a0

  // ---------- formatting ----------
  const isNeg = (v, d) => v < 0 && +Math.abs(v).toFixed(d) !== 0;
  const f = (v, d = 3) => !isFinite(v) ? '∞' : (isNeg(v, d) ? '−' : '') + (+Math.abs(v).toFixed(d)).toString();
  const fc = (re, im, d = 3) => (!isFinite(re) || !isFinite(im)) ? '∞' : `${f(re, d)} ${isNeg(im, d) ? '−' : '+'} j${f(Math.abs(im), d)}`;
  const fz = (z, d = 3) => fc(z[0], z[1], d);
  const fj = (x, d = 3) => !isFinite(x) ? 'j∞' : `${isNeg(x, d) ? '−' : '+'}j${f(Math.abs(x), d)}`;
  const fS = s => isFinite(s) ? f(s, 2) : '∞';

  // ---------- drawing views: the walkthrough chart and the full chart ----------
  const WALK = {cx:300, cy:300, R:228, W:600, g:ov, ring:1.075, labR:1.2};
  const FULL = {cx:410, cy:430, R:330, W:820, g:null, ring:1.135, labR:1.2};
  let VIEW = WALK;
  const px = (u, v) => [VIEW.cx + VIEW.R*u, VIEW.cy - VIEW.R*v];

  function el(tag, attrs, parent){ const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); (parent || VIEW.g).appendChild(e); return e; }
  function circlePts(cu, cv, rho, a0, a1, n = 240){
    const pts = [];
    for (let i = 0; i <= n; i++){ const a = a0 + (a1 - a0)*i/n; pts.push([cu + rho*Math.cos(a), cv + rho*Math.sin(a)]); }
    return pts;
  }
  function rPts(r){ const c = r/(1+r), rho = 1/(1+r); return circlePts(c, 0, rho, PI, -PI); }
  function xPts(x, n = 200){
    if (Math.abs(x) < 1e-12){ const pts = []; for (let i = 0; i <= n; i++) pts.push([-1 + 2*i/n, 0]); return pts; }
    const ax = Math.abs(x), s = Math.sign(x), g0 = gam(0, ax);
    let a0 = Math.atan2(g0[1] - 1/ax, g0[0] - 1);
    while (a0 < PI/2) a0 += TAU;
    while (a0 > 1.5*PI) a0 -= TAU;
    return circlePts(1, 1/ax, 1/ax, a0, 1.5*PI, n).map(p => [p[0], s*p[1]]);
  }
  function pathD(pts, p){
    if (p <= 0) return '';
    const n = pts.length - 1, fr = p*n, k = Math.floor(fr);
    let d = '';
    for (let i = 0; i <= Math.min(k, n); i++){ const [X, Y] = px(pts[i][0], pts[i][1]); d += (i ? 'L' : 'M') + X.toFixed(2) + ' ' + Y.toFixed(2); }
    if (k < n){ const t = fr - k, a = pts[k], b = pts[k+1]; const [X, Y] = px(a[0] + (b[0]-a[0])*t, a[1] + (b[1]-a[1])*t); d += 'L' + X.toFixed(2) + ' ' + Y.toFixed(2); }
    return d;
  }
  function stroke(pts, p, color, w, extra = {}, parent){
    const d = pathD(pts, p); if (!d) return null;
    return el('path', Object.assign({d, fill:'none', stroke:color, 'stroke-width':w, 'stroke-linecap':'round', 'stroke-linejoin':'round'}, extra), parent);
  }
  function text(u, v, str, o = {}, parent){
    let [X, Y] = px(u, v);
    const anchor = o.anchor || 'middle', w = 0.58*(o.size || 13)*String(str).length, W = VIEW.W || 600;
    const left = anchor === 'start' ? X : anchor === 'end' ? X - w : X - w/2;
    if (left < 4) X += 4 - left; else if (left + w > W - 4) X -= left + w - (W - 4);
    const t = el('text', {x:X.toFixed(1), y:Y.toFixed(1), 'text-anchor':anchor, 'dominant-baseline':'middle', fill:o.color || COL.ink,
      'font-size':o.size || 13, 'font-weight':o.weight || 650, opacity:o.op ?? 1, 'font-family':FONT}, parent);
    if (o.halo !== false) t.setAttribute('class', 'halo');
    t.textContent = str; return t;
  }
  function dot(u, v, r, color, op = 1){ const [X, Y] = px(u, v); return el('circle', {cx:X.toFixed(1), cy:Y.toFixed(1), r:Math.max(0, r), fill:color, stroke:'#fff', 'stroke-width':1.8, opacity:op}); }
  function ring(u, v, r, color, op){ const [X, Y] = px(u, v); return el('circle', {cx:X.toFixed(1), cy:Y.toFixed(1), r:Math.max(0, r), fill:'none', stroke:color, 'stroke-width':2.2, opacity:op}); }
  function pointLabel(u, v, str, color, op = 1, k = 0.08, dir){
    if (op <= 0) return null;
    const m = Math.hypot(u, v);
    const dx = dir ? dir[0] : m < 1e-6 ? 0.6 : u/m, dy = dir ? dir[1] : m < 1e-6 ? 0.8 : v/m;
    return text(u + dx*k, v + dy*k, str, {color, op, size:13.5, anchor: dx > 0.35 ? 'start' : dx < -0.35 ? 'end' : 'middle'});
  }

  // ---------- chart building blocks ----------
  function radial(a, q, color = COL.purple){ return stroke([[0, 0], polar(VIEW.ring, a)], q, color, 1.3, {'stroke-dasharray':'3 4', opacity:.85}); }
  function ringText(a, str, color, op = 1){
    if (op <= 0) return null;
    const [u, v] = polar(VIEW.labR, a), c = Math.cos(a);
    return text(u, v, str, {color, size:12.5, op, anchor: c > .4 ? 'start' : c < -.4 ? 'end' : 'middle'});
  }
  function arcCW(rho, a0, sweep, p, color, w = 3.2, extra = {}){
    if (sweep <= 1e-9 || rho <= 1e-9) return null;
    return stroke(circlePts(0, 0, rho, a0, a0 - sweep, Math.max(24, Math.round(sweep*40))), p, color, w, Object.assign({opacity:.9}, extra));
  }
  function arcCCW(rho, a0, sweep, p, color, w = 3.2, extra = {}){
    if (sweep <= 1e-9 || rho <= 1e-9) return null;
    return stroke(circlePts(0, 0, rho, a0, a0 + sweep, Math.max(24, Math.round(sweep*40))), p, color, w, Object.assign({opacity:.9}, extra));
  }
  function rimArc(a0, sweep, p, color, dashed, rr = 0.982){
    return arcCW(rr, a0, sweep, p, color, 3.6, dashed ? {'stroke-dasharray':'7 5', opacity:.85} : {opacity:.95});
  }
  function movingDot(rho, a, color){ const [u, v] = polar(rho, a); dot(u, v, 6.5, color); }
  function plotPoint(u, v, label, color, p, rr, xx){
    if (rr != null){
      stroke(rPts(rr), ease(seg(p, 0, .45)), COL.red, 2.4, {opacity:.9});
      if (Math.abs(xx) > 1e-12) stroke(xPts(xx), ease(seg(p, .25, .7)), COL.blue, 2.4, {opacity:.9});
    }
    const e = seg(p, rr != null ? .65 : 0, 1);
    if (e > 0){ dot(u, v, 6*ease(e), color); pointLabel(u, v, label, color, e); }
  }
  function vswrCircle(mag, th, p){
    const p1 = ease(seg(p, 0, .25)), p2 = ease(seg(p, .25, 1));
    stroke([[0, 0], polar(mag, th)], p1, COL.green, 2, {'stroke-dasharray':'5 4'});
    if (p1 >= 1 && mag > .15 && Math.abs(Math.sin(th)) > .2){ const [u, v] = polar(mag/2, th); text(u + .03, v, `|Γ| = ${f(mag, 2)}`, {color:COL.green, size:12, anchor:'start'}); }
    if (mag > 1e-6) stroke(circlePts(0, 0, mag, th, th - TAU, 360), p2, COL.green, 2.8);
    dot(0, 0, 4.5, COL.ink);
  }
  function faintRX(z, p, color){
    if (!isFinite(z[0]) || !isFinite(z[1])) return;
    stroke(rPts(z[0]), ease(seg(p, 0, .6)), color, 1.4, {'stroke-dasharray':'5 4', opacity:.6});
    stroke(xPts(z[1]), ease(seg(p, .25, .85)), color, 1.4, {'stroke-dasharray':'5 4', opacity:.6});
  }
  function curveArrow(P0, P1, bend, p, color){
    const dx = P1[0] - P0[0], dy = P1[1] - P0[1], c = [(P0[0] + P1[0])/2 - dy*bend, (P0[1] + P1[1])/2 + dx*bend], pts = [];
    for (let i = 0; i <= 40; i++){ const t = i/40; pts.push([(1-t)*(1-t)*P0[0] + 2*(1-t)*t*c[0] + t*t*P1[0], (1-t)*(1-t)*P0[1] + 2*(1-t)*t*c[1] + t*t*P1[1]]); }
    return stroke(pts, p, color, 2, {'stroke-dasharray':'6 4'});
  }
  // path along a constant-g (or constant-r) circle between two points, never crossing the right edge (b = ∞)
  function gPath(g, A, B, n = 90){
    const c = g/(1 + g), rr = 1/(1 + g);
    const angOf = P => { let a = Math.atan2(P[1], P[0] - c); if (a <= 0) a += TAU; return a; };
    const a0 = angOf(A), a1 = angOf(B), pts = [];
    for (let i = 0; i <= n; i++){ const a = a0 + (a1 - a0)*i/n; pts.push([c + rr*Math.cos(a), rr*Math.sin(a)]); }
    return pts;
  }
  function circleIntersect(c1, r1, c2, r2){
    const dx = c2[0] - c1[0], dy = c2[1] - c1[1], D = Math.hypot(dx, dy);
    if (D < 1e-12 || D > r1 + r2 + 1e-12 || D < Math.abs(r1 - r2) - 1e-12) return [];
    const a = (r1*r1 - r2*r2 + D*D)/(2*D), h = Math.sqrt(Math.max(0, r1*r1 - a*a));
    const mx = c1[0] + a*dx/D, my = c1[1] + a*dy/D;
    const p1 = [mx - h*dy/D, my + h*dx/D], p2 = [mx + h*dy/D, my - h*dx/D];
    return h < 1e-9 ? [p1] : [p1, p2];
  }

  // ---------- grid ----------
  const R_MAJ = [0.2, 0.5, 1, 2, 5], R_MIN = [0.1, 0.3, 0.4, 0.6, 0.7, 0.8, 0.9, 1.5, 3, 4, 10];
  let gridPieces = null, lastGridP = -1;
  function buildGrid(){
    const pcs = [];
    pcs.push({pts:rPts(0), color:'#2a2350', w:1.9});
    pcs.push({pts:xPts(0), color:'#8a83a8', w:1});
    R_MIN.forEach(r => pcs.push({pts:rPts(r), color:'#e8e5f3', w:0.7}));
    R_MAJ.forEach(r => pcs.push({pts:rPts(r), color:'#bdb6d8', w:1}));
    R_MIN.forEach(x => { pcs.push({pts:xPts(x), color:'#e8e5f3', w:0.7}); pcs.push({pts:xPts(-x), color:'#e8e5f3', w:0.7}); });
    R_MAJ.forEach(x => { pcs.push({pts:xPts(x), color:'#bdb6d8', w:1}); pcs.push({pts:xPts(-x), color:'#bdb6d8', w:1}); });
    gridPieces = pcs;
  }
  function drawGrid(p){
    if (Math.abs(p - lastGridP) < 1e-9) return;
    lastGridP = p;
    gridG.innerHTML = '';
    const N = gridPieces.length;
    gridPieces.forEach((pc, k) => stroke(pc.pts, ease(seg(p, 0.6*k/N, 0.6*k/N + 0.3)), pc.color, pc.w, {}, gridG));
    const lp = seg(p, 0.55, 0.95);
    if (lp > 0){
      const ringG = el('g', {opacity:lp}, gridG);
      const [cx, cy] = px(0, 0);
      el('circle', {cx, cy, r:WALK.R*1.075, fill:'none', stroke:'#d6d1ea', 'stroke-width':1}, ringG);
      for (let i = 0; i < 50; i++){
        const th = (180 - 720*i*0.01)*Math.PI/180;
        const big = i % 5 === 0, r2 = big ? 1.055 : 1.03;
        const [x1, y1] = px(Math.cos(th), Math.sin(th)), [x2, y2] = px(r2*Math.cos(th), r2*Math.sin(th));
        el('line', {x1, y1, x2, y2, stroke: big ? '#8a83a8' : '#c4bedb', 'stroke-width': big ? 1.2 : 0.8}, ringG);
        if (big) text(1.13*Math.cos(th), 1.13*Math.sin(th), i === 0 ? '0' : (i/100).toFixed(2), {size:10, weight:500, color:'#8a83a8', halo:false}, ringG);
      }
      R_MAJ.forEach(r => { const u = gam(r, 0)[0]; text(u + 0.012, 0.032, f(r), {size:10, weight:600, color:'#756e95', anchor:'start'}, ringG); });
      text(-0.985, 0.032, '0', {size:10, weight:600, color:'#756e95', anchor:'start'}, ringG);
      R_MAJ.forEach(x => [x, -x].forEach(xx => {
        const g0 = gam(0, xx);
        text(0.915*g0[0], 0.915*g0[1], (xx > 0 ? '+j' : '−j') + f(Math.abs(xx)), {size:10, weight:600, color:'#756e95'}, ringG);
      }));
      const t = el('text', {x:12, y:590, 'font-size':11, fill:'#8a83a8', 'font-family':FONT}, ringG);
      t.textContent = 'Outer scale: wavelengths toward generator (clockwise)';
    }
  }

  // ---------- page-specific question types ----------
  const cardsHTML = cards => `<div class="answer">${cards.filter(Boolean).map(c => `<div class="ans ${c.tone || 'y'}"><div class="k">${c.k}</div><div class="v">${c.v}</div><div class="s">${c.s || ''}</div></div>`).join('')}</div>`;
  let MODE = null;
  const HELP = {NS, FONT, COL, PI, TAU, clamp, ease, seg, mod, deg, polar, rot, cdiv, toG, gam, fromG, ang, wtgA, cw, stubLen,
    isNeg, f, fc, fz, fj, fS, el, circlePts, rPts, xPts, stroke, text, dot, ring, pointLabel, radial, ringText, arcCW, arcCCW, rimArc,
    movingDot, plotPoint, vswrCircle, faintRX, curveArrow, gPath, circleIntersect, mode: () => MODE};
  const PAGE = window.SMITH_PAGE(HELP);
  const {MODES, FIELDS} = PAGE;
  MODES.forEach(md => { md.vals = Object.assign({}, md.defaults); });

  // ---------- walkthrough engine ----------
  MODE = MODES[0]; let M = null, STEPS = [], LAST = 0;
  let idx = 0, prog = 0, running = false, auto = false, started = false, holdUntil = 0, speed = 1, dirty = true, lastT = performance.now();
  let shownIdx = -1;
  const dotsEl = $('dots');

  function rebuildDots(){
    dotsEl.innerHTML = '';
    STEPS.forEach((s, i) => {
      const b = document.createElement('button');
      b.className = 'dot'; b.textContent = i === 0 ? '◎' : i === LAST ? '✓' : String(i);
      b.title = i === 0 ? 'The chart' : i === LAST ? 'Answer' : 'Step ' + i;
      b.setAttribute('aria-label', b.title);
      b.addEventListener('click', () => goTo(i));
      dotsEl.appendChild(b);
    });
  }
  function updatePanel(){
    if (shownIdx === idx) return;
    shownIdx = idx;
    const inf = STEPS[idx].info(M);
    $('stepno').textContent = idx === 0 ? 'Before you start' : idx === LAST ? 'Result' : `Step ${idx} of ${LAST - 1}`;
    $('stitle').innerHTML = inf.title;
    $('sbody').innerHTML = inf.body;
    $('swork').innerHTML = inf.work;
    [...dotsEl.children].forEach((d, i) => { d.className = 'dot' + (i === idx ? ' active' : i < idx ? ' done' : ''); });
    $('bBack').disabled = idx === 0;
    if (!reduceMotion && $('pcontent').animate)
      $('pcontent').animate([{opacity:0, transform:'translateY(10px)'}, {opacity:1, transform:'none'}], {duration:420, easing:'cubic-bezier(.2,.7,.2,1)'});
  }
  function updateButtons(){
    $('bPlay').textContent = auto ? '❚❚ Pause' : (idx === LAST && prog >= 1 ? '▶ Replay' : '▶ Play all');
    $('pfill').style.width = ((idx + prog)/(LAST + 1)*100).toFixed(2) + '%';
  }
  function render(){
    VIEW = WALK;
    drawGrid(idx === 0 ? prog : 1);
    ov.innerHTML = '';
    for (let j = 1; j < idx; j++) STEPS[j].draw(M, 1);
    if (idx > 0) STEPS[idx].draw(M, prog);
    updatePanel(); updateButtons();
  }
  function goTo(i, p = 0, run = true){ started = true; idx = clamp(i, 0, LAST); prog = p; running = run && p < 1; auto = false; dirty = true; }
  function next(){
    started = true;
    if (prog < 1){ prog = 1; running = false; }
    else if (idx < LAST){ idx++; prog = 0; running = true; }
    dirty = true;
  }
  function back(){ if (idx > 0){ idx--; prog = 1; running = false; auto = false; dirty = true; } }
  function togglePlay(){
    started = true;
    if (auto){ auto = false; running = false; }
    else {
      auto = true;
      if (idx === LAST && prog >= 1){ idx = 0; prog = 0; }
      if (prog >= 1) holdUntil = 0; else running = true;
    }
    dirty = true;
  }
  function restart(){ goTo(0, 0, true); }
  function playFromStart(){ goTo(0, 0, true); auto = true; }
  function tick(t){
    const dt = Math.min(64, t - lastT); lastT = t;
    if (running){
      prog += dt*speed/STEPS[idx].dur;
      if (prog >= 1){ prog = 1; running = false; holdUntil = t + 1100/speed; }
      dirty = true;
    } else if (auto && prog >= 1){
      if (idx >= LAST){ auto = false; dirty = true; }
      else if (t >= holdUntil){ idx++; prog = 0; running = true; dirty = true; }
    }
    if (dirty){ render(); dirty = false; }
    requestAnimationFrame(tick);
  }

  $('bNext').addEventListener('click', next);
  $('bBack').addEventListener('click', back);
  $('bPlay').addEventListener('click', togglePlay);
  $('bRestart').addEventListener('click', restart);
  $('speed').addEventListener('change', e => { speed = +e.target.value; });
  document.addEventListener('keydown', e => {
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
    if (e.key === 'ArrowRight'){ next(); e.preventDefault(); }
    else if (e.key === 'ArrowLeft'){ back(); e.preventDefault(); }
    else if (e.key === ' ' && e.target.tagName !== 'BUTTON'){ togglePlay(); e.preventDefault(); }
    else if (e.key === 'r' || e.key === 'R'){ restart(); }
  });
  $('hStart').addEventListener('click', () => { $('lab').scrollIntoView({behavior: reduceMotion ? 'auto' : 'smooth'}); playFromStart(); });
  $('hPick').addEventListener('click', () => { $('modes').scrollIntoView({behavior: reduceMotion ? 'auto' : 'smooth'}); });

  if ('IntersectionObserver' in window){
    new IntersectionObserver((ents, obs) => {
      if (ents.some(e => e.isIntersecting)){ if (!started){ started = true; running = true; dirty = true; } obs.disconnect(); }
    }, {threshold:0.3}).observe($('stage'));
  } else { started = true; running = true; }

  // ---------- question-type picker and inputs ----------
  const modeGrid = $('modeGrid'), fieldsEl = $('fields');
  MODES.forEach(md => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'mode-card'; b.dataset.mode = md.id; b.setAttribute('aria-pressed', 'false');
    b.innerHTML = `${md.glyph}<b>${md.title}</b><span>${md.desc}</span>`;
    b.addEventListener('click', () => selectMode(md.id));
    modeGrid.appendChild(b);
  });
  function markCards(){ modeGrid.querySelectorAll('.mode-card').forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === MODE.id ? 'true' : 'false')); }
  function numInput(key){
    const i = document.createElement('input');
    i.type = 'number'; i.step = 'any'; i.id = 'f_' + key; i.value = MODE.vals[key] ?? '';
    i.addEventListener('input', () => { MODE.vals[key] = i.value; });
    return i;
  }
  function buildFields(){
    fieldsEl.innerHTML = '';
    MODE.fields.forEach(key => {
      const F = FIELDS[key], lab = document.createElement('label');
      lab.className = 'field'; lab.dataset.key = key;
      lab.innerHTML = `<span>${F.label}</span>`;
      if (F.type === 'select'){
        const s = document.createElement('select'); s.id = 'f_' + key;
        F.options.forEach(([v, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = t; s.appendChild(o); });
        s.value = MODE.vals[key];
        s.addEventListener('change', () => { MODE.vals[key] = s.value; refreshVisibility(); });
        lab.appendChild(s);
      } else if (F.type === 'len'){
        const row = document.createElement('span'); row.className = 'len';
        const u = document.createElement('select'); u.id = 'f_' + key + '_u'; u.setAttribute('aria-label', 'unit');
        [['lam', 'λ'], ['cm', 'cm']].forEach(([v, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = t; u.appendChild(o); });
        u.value = MODE.vals[key + '_u'] || 'lam';
        u.addEventListener('change', () => { MODE.vals[key + '_u'] = u.value; refreshVisibility(); });
        row.append(numInput(key), u); lab.appendChild(row);
      } else lab.appendChild(numInput(key));
      fieldsEl.appendChild(lab);
    });
    refreshVisibility();
  }
  function refreshVisibility(){
    fieldsEl.querySelectorAll('.field').forEach(l => { const F = FIELDS[l.dataset.key]; l.hidden = F.showIf ? !F.showIf(MODE.vals, MODE) : false; });
  }
  function readVals(){
    const v = {};
    MODE.fields.forEach(k => {
      const F = FIELDS[k], raw = MODE.vals[k];
      v[k] = F.type === 'select' ? raw : (raw === '' || raw == null ? NaN : parseFloat(raw));
      if (F.type === 'len') v[k + '_u'] = MODE.vals[k + '_u'] || 'lam';
    });
    return v;
  }
  function showErr(msg){ $('err').textContent = msg; }
  function applyModel(m){
    M = m; STEPS = MODE.steps(m); LAST = STEPS.length - 1;
    rebuildDots(); shownIdx = -1; lastGridP = -1;
    idx = 0; prog = 0; running = started; auto = false; dirty = true;
    setProblem(); updateFull();
    waveT0 = performance.now(); if (reduceMotion) drawWave(waveT0);
  }
  function selectMode(id, opts = {}){
    const md = MODES.find(x => x.id === id); if (!md) return;
    MODE = md; markCards(); buildFields(); showErr('');
    let m;
    try { m = MODE.compute(readVals()); }
    catch (e){ MODE.vals = Object.assign({}, MODE.defaults); buildFields(); m = MODE.compute(readVals()); }
    applyModel(m);
    if (!opts.init){
      try { history.replaceState(null, '', '#' + md.id); } catch (e) {}
      const card = modeGrid.querySelector(`[data-mode="${md.id}"]`);
      if (card && modeGrid.scrollWidth > modeGrid.clientWidth) modeGrid.scrollTo({left: card.offsetLeft - 16, behavior: reduceMotion ? 'auto' : 'smooth'});
    }
  }
  $('form').addEventListener('submit', e => {
    e.preventDefault();
    let m;
    try { m = MODE.compute(readVals()); } catch (err){ showErr(err.message); return; }
    showErr(''); started = true; applyModel(m);
    $('lab').scrollIntoView({behavior: reduceMotion ? 'auto' : 'smooth'});
    playFromStart();
  });
  window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (h && h !== MODE.id && MODES.some(x => x.id === h)) selectMode(h); });

  // ---------- complete chart ----------
  const FX = 410, FY = 430, FR = 330;
  const fGrid = $('fGrid'), fSol = $('fSol'), fsvg = $('full');
  const fp = (u, v) => [FX + FR*u, FY - FR*v];
  const INK = '#1b1b1f';
  function fel(tag, attrs, parent){ const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent.appendChild(e); return e; }
  function fpath(pts){ let d = ''; pts.forEach((q, i) => { const [X, Y] = fp(q[0], q[1]); d += (i ? 'L' : 'M') + X.toFixed(1) + ' ' + Y.toFixed(1); }); return d; }
  function rArc(r, X){
    const c = r/(1+r), rho = 1/(1+r);
    let a0 = Math.PI, a1 = -Math.PI;
    if (isFinite(X)){ const g = gam(r, X); const aX = Math.atan2(g[1], g[0] - c); a0 = aX; a1 = 2*Math.PI - aX; }
    const n = Math.max(24, Math.round(Math.abs(a1 - a0)*rho*120));
    return circlePts(c, 0, rho, a0, a1, n);
  }
  function xArc(x, Rl){
    const ax = Math.abs(x), sg = Math.sign(x), g0 = gam(0, ax);
    let a0 = Math.atan2(g0[1] - 1/ax, g0[0] - 1);
    while (a0 < Math.PI/2) a0 += 2*Math.PI;
    while (a0 > 1.5*Math.PI) a0 -= 2*Math.PI;
    let a1 = 1.5*Math.PI;
    if (isFinite(Rl)){ const g = gam(Rl, ax); a1 = Math.atan2(g[1] - 1/ax, g[0] - 1); while (a1 < a0) a1 += 2*Math.PI; while (a1 > 1.5*Math.PI + 1e-9) a1 -= 2*Math.PI; }
    const rho = 1/ax, n = Math.max(16, Math.min(400, Math.round((a1 - a0)*rho*120)));
    return circlePts(1, 1/ax, rho, a0, a1, n).map(q => [q[0], sg*q[1]]);
  }
  const fpolar = (k, deg) => { const a = deg*Math.PI/180; return [FX + FR*k*Math.cos(a), FY - FR*k*Math.sin(a)]; };
  function ftext(x, y, str, o, parent){
    const t = fel('text', {x:x.toFixed(1), y:y.toFixed(1), 'text-anchor':o.anchor || 'middle', 'dominant-baseline':'middle', fill:o.color || INK,
      'font-size':o.size || 8, 'font-weight':o.weight || 500, 'font-family':FONT}, parent);
    if (o.rot != null) t.setAttribute('transform', `rotate(${o.rot.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})`);
    if (o.cls) t.setAttribute('class', o.cls);
    if (o.style) t.setAttribute('style', o.style);
    if (o.html) t.innerHTML = str; else t.textContent = str;
    return t;
  }
  const tangent = deg => { let r = 90 - deg; r = ((r + 180) % 360 + 360) % 360 - 180; if (r > 90) r -= 180; if (r < -90) r += 180; return r; };
  const num = v => String(v).replace('-', '−');

  // radially scaled rulers: each maps a value to |Γ|
  const SCALES = {
    vswr:{name:'VSWR', side:1, toG:s => s === Infinity ? 1 : (s - 1)/(s + 1),
      ticks:[...Array.from({length:10}, (_, i) => 1 + i*0.1), 2.2, 2.4, 2.6, 2.8, 3, 3.5, 4, 4.5, 5, 6, 7, 8, 9, 10, 15, 20, 40],
      labels:[1, 1.2, 1.4, 1.6, 1.8, 2, 2.5, 3, 4, 5, 6, 8, 10, 20, Infinity]},
    rl:{name:'Return loss (dB)', side:1, toG:d => d === Infinity ? 0 : Math.pow(10, -d/20),
      ticks:[...Array.from({length:21}, (_, i) => i*0.5), 11, 12, 13, 14, 15, 16, 18, 20, 25, 30],
      labels:[0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 15, 20, 30]},
    g:{name:'Refl. coeff. |Γ|', side:1, toG:v => v,
      ticks:Array.from({length:51}, (_, i) => i*0.02), labels:Array.from({length:11}, (_, i) => +(i*0.1).toFixed(1))},
    dbs:{name:'SWR (dB)', side:-1, toG:d => { const sv = Math.pow(10, d/20); return (sv - 1)/(sv + 1); },
      ticks:[...Array.from({length:21}, (_, i) => i*0.5), 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 25, 30, 40],
      labels:[0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 30, 40]},
    loss:{name:'Refl. loss (dB)', side:-1, toG:L => Math.sqrt(Math.max(0, 1 - Math.pow(10, -L/10))),
      ticks:[0, .05, .1, .15, .2, .3, .4, .5, .6, .7, .8, .9, 1, 1.2, 1.4, 1.6, 1.8, 2, 2.5, 3, 4, 5, 6, 7, 8, 10, 15],
      labels:[0, .1, .2, .4, .6, 1, 1.5, 2, 3, 4, 6, 10, 15]},
    pw:{name:'Power refl. |Γ|²', side:-1, toG:P => Math.sqrt(P),
      ticks:Array.from({length:21}, (_, i) => i*0.05), labels:Array.from({length:11}, (_, i) => +(i*0.1).toFixed(1))}
  };
  const ROWS = [{y:874, left:'dbs', right:'vswr'}, {y:916, left:'loss', right:'rl'}, {y:958, left:'pw', right:'g'}];

  function buildFullGrid(){
    fGrid.innerHTML = '';
    fel('rect', {x:0, y:0, width:820, height:990, fill:'#ffffff'}, fGrid);
    // title + ring key
    ftext(18, 28, 'Complete Smith chart', {anchor:'start', size:19, weight:800}, fGrid);
    const key = ['Outer ring: wavelengths toward generator (clockwise)', 'Middle ring: wavelengths toward load (anticlockwise)', 'Inner ring: angle of reflection coefficient (°)'];
    key.forEach((k, i) => ftext(804, 20 + i*14, k, {anchor:'end', size:9.5, weight:500, color:'#444'}, fGrid));

    // dense impedance grid
    const BANDS = [[0,.2,.01],[.2,.5,.02],[.5,1,.05],[1,2,.1],[2,5,.2],[5,10,1],[10,20,2],[20,50,10]];
    const NICE = [.2,.5,1,2,5,10,20,50], DELTA = 0.008;
    const snap = v => { let b = null; NICE.forEach(n => { if (n <= v + 1e-9) b = n; }); return b; };
    const wt = v => NICE.some(n => Math.abs(n - v) < 1e-9) ? '0.95' : ((v < 1 ? Math.abs(v*10 - Math.round(v*10)) : Math.abs(v - Math.round(v))) < 1e-6 ? '0.55' : '0.28');
    const groups = {'0.95':'', '0.55':'', '0.28':''};
    BANDS.forEach(([a, b, st]) => {
      for (let k = 1; a + k*st < b - 1e-9; k++){
        const v = +(a + k*st).toFixed(4);
        const lr = 2*st/DELTA - (1 + v)*(1 + v);
        if (lr > 0){ const xl = snap(Math.sqrt(lr)); if (xl) groups[wt(v)] += fpath(rArc(v, xl)); }
        const lx = 2*st/DELTA - v*v;
        if (lx > 0){ const rl = snap(Math.sqrt(lx) - 1); if (rl) groups[wt(v)] += fpath(xArc(v, rl)) + fpath(xArc(-v, rl)); }
      }
    });
    NICE.forEach(v => { groups['0.95'] += fpath(rArc(v, Infinity)) + fpath(xArc(v, Infinity)) + fpath(xArc(-v, Infinity)); });
    groups['0.95'] += fpath([[-1, 0], [1, 0]]);
    for (const w in groups) fel('path', {d:groups[w], fill:'none', stroke:INK, 'stroke-width':w}, fGrid);

    // rings
    [1, 1.045, 1.09, 1.135].forEach(k => fel('circle', {cx:FX, cy:FY, r:FR*k, fill:'none', stroke:INK, 'stroke-width':k === 1 ? 1.6 : 0.8}, fGrid));
    let td = '';
    const tick = (k, deg, len) => { const [x1, y1] = fpolar(k, deg), [x2, y2] = fpolar(k + len, deg); td += `M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`; };
    for (let i = -179; i <= 180; i++){
      tick(1, i, i % 10 === 0 ? 0.016 : i % 5 === 0 ? 0.011 : 0.006);
      if (i % 10 === 0){ const [x, y] = fpolar(1.031, i); ftext(x, y, i === 180 ? '±180' : num(i), {size:7, rot:tangent(i)}, fGrid); }
    }
    for (let j = 0; j < 250; j++){
      const w = j*0.002, big = j % 5 === 0;
      const aL = 180 + 720*w, aG = 180 - 720*w;
      tick(1.045, aL, big ? 0.012 : 0.006);
      tick(1.09, aG, big ? 0.012 : 0.006);
      if (big){
        const lab = j === 0 ? '0.00' : w.toFixed(2);
        let [x, y] = fpolar(1.075, aL); ftext(x, y, lab, {size:6.8, rot:tangent(aL)}, fGrid);
        [x, y] = fpolar(1.12, aG); ftext(x, y, lab, {size:6.8, rot:tangent(aG)}, fGrid);
      }
    }
    fel('path', {d:td, stroke:INK, 'stroke-width':0.6, fill:'none'}, fGrid);

    // r labels along the axis, x labels inside the rim
    const RLAB = [.1,.2,.3,.4,.5,.6,.7,.8,.9,1,1.2,1.4,1.6,1.8,2,3,4,5,10,20,50];
    RLAB.forEach(v => { const [x, y] = fp(gam(v, 0)[0], 0); ftext(x - 2.5, y - 4, String(v), {anchor:'start', size:7, rot:-90, weight:600}, fGrid); });
    ftext(fp(-1, 0)[0] + 4, FY - 5, '0', {anchor:'start', size:7.5, weight:600}, fGrid);
    const XLAB = [.1,.2,.3,.4,.5,.6,.7,.8,.9,1,1.2,1.4,1.6,1.8,2,3,4,5,10,20];
    XLAB.forEach(v => [v, -v].forEach(xx => {
      const g0 = gam(0, xx), [x, y] = fp(0.972*g0[0], 0.972*g0[1]);
      const deg = Math.atan2(g0[1], g0[0])*180/Math.PI;
      ftext(x, y, (xx > 0 ? '+' : '−') + v, {size:6.8, weight:600, rot:tangent(deg)}, fGrid);
    }));

    // radially scaled rulers
    ftext(FX, 846, 'Radially scaled parameters (distance from centre = |Γ| × chart radius)', {size:9.5, weight:700}, fGrid);
    let rd = '';
    ROWS.forEach(row => {
      rd += `M${FX - FR} ${row.y}L${FX + FR} ${row.y}M${FX} ${row.y - 9}L${FX} ${row.y + 4}`;
      [row.left, row.right].forEach(key => {
        const sc = SCALES[key];
        sc.ticks.forEach(v => { const x = FX + sc.side*FR*sc.toG(v); if (isFinite(x)) rd += `M${x.toFixed(1)} ${row.y}L${x.toFixed(1)} ${row.y - 4}`; });
        let lastX = null;
        sc.labels.forEach(v => {
          const x = FX + sc.side*FR*sc.toG(v);
          if (lastX !== null && Math.abs(x - lastX) < 13) return;
          lastX = x;
          rd += `M${x.toFixed(1)} ${row.y}L${x.toFixed(1)} ${row.y - 7}`;
          ftext(x, row.y - 13, v === Infinity ? '∞' : String(v), {size:7.5, weight:600}, fGrid);
        });
        ftext(sc.side > 0 ? FX + FR : FX - FR, row.y + 12, sc.name, {anchor:sc.side > 0 ? 'end' : 'start', size:8.5, weight:700, color:'#333'}, fGrid);
      });
    });
    fel('path', {d:rd, stroke:INK, 'stroke-width':0.8, fill:'none'}, fGrid);
    ftext(FX - 8, 980, '← measure toward load side', {anchor:'end', size:8, color:'#555'}, fGrid);
    ftext(FX + 8, 980, 'measure toward generator side →', {anchor:'start', size:8, color:'#555'}, fGrid);
  }

  // ---------- on the line: standing wave for the current answer ----------
  const cv = $('wave'), ctx = cv.getContext('2d');
  let W = 0, H = 0, waveVisible = true, waveT0 = performance.now();
  function sizeWave(){
    const r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height; cv.width = Math.round(W*dpr); cv.height = Math.round(H*dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  // what the current question's answer looks like on the line: piecewise sections, each with its own Γ
  function waveSpec(){
    const S = Object.assign({marks:[], spans:[], end:'ZL', cap:'', dir:'← toward generator', tail:null}, PAGE.waveSpec(M, MODE.id));
    // amplitude of each section from voltage continuity at the joins
    let a = [1, 0];
    S.segs.forEach((s, k) => {
      if (k > 0){ const V = segV(S.segs[k - 1], s.d); const den = [1 + s.G[0], s.G[1]]; a = Math.hypot(den[0], den[1]) < 1e-9 ? [0, 0] : cdiv(V.v, den); }
      s.a = a;
    });
    if (S.tail){ S.tail.d = 0; S.tail.G = [0, 0]; S.tail.a = segV(S.segs[0], 0).v; }
    return S;
  }
  function segV(s, d){
    const x = TAU*(d - s.d)*(s.k || 1), e1 = [Math.cos(x), Math.sin(x)], e2 = [Math.cos(x), -Math.sin(x)];
    const inc = [s.a[0]*e1[0] - s.a[1]*e1[1], s.a[0]*e1[1] + s.a[1]*e1[0]];
    const aG = [s.a[0]*s.G[0] - s.a[1]*s.G[1], s.a[0]*s.G[1] + s.a[1]*s.G[0]];
    const ref = [aG[0]*e2[0] - aG[1]*e2[1], aG[0]*e2[1] + aG[1]*e2[0]];
    return {inc, ref, v:[inc[0] + ref[0], inc[1] + ref[1]]};
  }
  let WS = null;
  function drawWave(now){
    if (!W || !M) return;
    if (!WS) WS = waveSpec();
    const S = WS, segAt = d => { if (d < -1e-12 && S.tail) return S.tail; let s = S.segs[0]; for (const t of S.segs) if (t.d <= d + 1e-12) s = t; return s; };
    const reveal = reduceMotion ? 1 : ease(clamp((now - waveT0)/1800));
    const phi = reduceMotion ? 0.9 : now/1000*2*Math.PI*0.3;
    const far = Math.max(0, ...S.marks.map(k => k.d), ...S.spans.map(k => k.b), S.minD || 0);
    const D = Math.min(3, Math.max(1.25, Math.ceil((far + .2)*4)/4));
    const dLo = S.tail ? -S.tail.len : 0;
    const L = 30, R = W - (S.end ? 64 : 22), mid = H/2 + 14;
    const xOf = d => R - ((d - dLo)/(D - dLo))*(R - L);
    const N = 420, ds = []; for (let i = 0; i <= N; i++) ds.push(dLo + (D - dLo)*i/N);
    const vals = ds.map(d => segV(segAt(d), d));
    const envs = vals.map(q => Math.hypot(q.v[0], q.v[1]));
    const A = (H/2 - 58)/Math.max(1e-6, ...envs, ...vals.map(q => Math.hypot(q.inc[0], q.inc[1]) + 1e-9));
    const re = c => c[0]*Math.cos(phi) - c[1]*Math.sin(phi);
    ctx.clearRect(0, 0, W, H);
    ctx.font = '600 11.5px Bricolage Grotesque, system-ui, sans-serif';

    // axis & distance ticks
    ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(L, mid); ctx.lineTo(R, mid); ctx.stroke();
    ctx.fillStyle = 'rgba(214,206,255,.6)'; ctx.textAlign = 'center';
    const step = D > 2 ? .5 : .25, names = {0:'0', .25:'λ/4', .5:'λ/2', .75:'3λ/4', 1:'λ', 1.25:'5λ/4', 1.5:'3λ/2', 1.75:'7λ/4', 2:'2λ', 2.5:'5λ/2', 3:'3λ'};
    for (let d = 0; d <= D + 1e-9; d += step){ const x = xOf(d); ctx.beginPath(); ctx.moveTo(x, H - 24); ctx.lineTo(x, H - 18); ctx.stroke(); ctx.fillText(names[+d.toFixed(2)] || `${f(d, 2)}λ`, x, H - 7); }
    ctx.textAlign = 'left'; ctx.fillText(S.dir, L, 14);

    // spans (e.g. the λ/4 section)
    S.spans.forEach(sp => {
      const x1 = xOf(sp.b), x2 = xOf(sp.a);
      ctx.fillStyle = 'rgba(65,217,232,.10)'; ctx.fillRect(x1, 44, x2 - x1, H - 76);
      ctx.fillStyle = '#9fe9f2'; ctx.textAlign = 'center'; ctx.fillText(sp.t, (x1 + x2)/2, H - 38);
    });

    ctx.save();
    ctx.beginPath(); ctx.rect(R - (R - L + 6)*reveal, 0, (R - L + 6)*reveal + 2, H); ctx.clip();
    const grad = ctx.createLinearGradient(0, 40, 0, H - 30);
    grad.addColorStop(0, 'rgba(255,79,163,.30)'); grad.addColorStop(.5, 'rgba(112,71,255,.06)'); grad.addColorStop(1, 'rgba(255,79,163,.30)');
    ctx.beginPath();
    ds.forEach((d, i) => { const x = xOf(d), y = mid - A*envs[i]; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    for (let i = N; i >= 0; i--) ctx.lineTo(xOf(ds[i]), mid + A*envs[i]);
    ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
    const curve = (fn, color, w, glow) => {
      ctx.beginPath(); ds.forEach((d, i) => { const x = xOf(d), y = mid - A*fn(i); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.strokeStyle = color; ctx.lineWidth = w; ctx.shadowBlur = glow || 0; ctx.shadowColor = color; ctx.stroke(); ctx.shadowBlur = 0;
    };
    curve(i => envs[i], '#ff4fa3', 1.8, 8);
    curve(i => -envs[i], '#ff4fa3', 1.8, 8);
    curve(i => re(vals[i].inc), 'rgba(65,217,232,.75)', 1.5);
    curve(i => re(vals[i].ref), 'rgba(255,184,77,.8)', 1.5);
    curve(i => re(vals[i].v), '#ffffff', 2.6, 14);
    ctx.restore();

    // matched sections
    S.segs.forEach((s, k) => {
      if (k === 0 || Math.hypot(s.G[0], s.G[1]) > 1e-9) return;
      const x1 = xOf(D), x2 = xOf(s.d);
      if (x2 - x1 > 120){ ctx.fillStyle = '#9fe9f2'; ctx.textAlign = 'center'; ctx.fillText('matched: VSWR 1', (x1 + x2)/2, H - 38); }
    });
    // the question's own positions
    if (reveal > .9){
      const marks = S.marks.filter(k => k.d <= D + 1e-9 && k.d >= dLo - 1e-9).sort((p, q) => q.d - p.d);
      let lastX = -1e9, row = 0;
      marks.forEach(k => {
        const x = xOf(k.d);
        row = x - lastX < 170 ? 1 - row : 0; lastX = x;
        const ty = 30 + row*15;
        ctx.strokeStyle = 'rgba(255,210,154,.75)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(x, ty + 6); ctx.lineTo(x, H - 26); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = '#ffd29a'; ctx.beginPath(); ctx.arc(x, mid, 3.5, 0, 2*Math.PI); ctx.fill();
        const tw = ctx.measureText(k.t).width; let tx = x - tw/2; tx = Math.max(L - 20, Math.min(W - 8 - tw, tx));
        ctx.textAlign = 'left'; ctx.fillText(k.t, tx, ty);
      });
    }
    // termination block
    if (!S.end) return;
    const lx = R + 10, ly = mid - 22, bw = S.end === 'ZL' ? 38 : 48;
    const lg = ctx.createLinearGradient(lx, ly, lx + bw, ly + 44);
    lg.addColorStop(0, '#7047ff'); lg.addColorStop(1, '#ff4fa3');
    ctx.fillStyle = lg; ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(lx, ly, bw, 44, 9); else ctx.rect(lx, ly, bw, 44);
    ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = '700 12.5px Bricolage Grotesque, system-ui, sans-serif';
    ctx.fillText(S.end, lx + bw/2, mid + 5);
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(R, mid); ctx.lineTo(lx, mid); ctx.stroke();
  }
  function waveCaption(){ WS = waveSpec(); $('waveCap').innerHTML = WS.cap; }
  function waveLoop(t){ if (waveVisible) drawWave(t); if (!reduceMotion) requestAnimationFrame(waveLoop); }
  if ('ResizeObserver' in window) new ResizeObserver(() => { sizeWave(); drawWave(performance.now()); }).observe(cv);
  else window.addEventListener('resize', () => { sizeWave(); drawWave(performance.now()); });
  if ('IntersectionObserver' in window) new IntersectionObserver(ents => { waveVisible = ents[0].isIntersecting; }).observe(cv);

  // ---------- complete solution on the full chart ----------
  const plainChips = pr => pr.chips.map(c => c.replace(/<sub>0<\/sub>/g, '₀').replace(/<[^>]+>/g, '')).join(', ');
  function rulerTransfer(){
    const g = Math.min(M.mag, 1);
    if (!(g > 0.02 && g < 1 - 1e-9)) return null;
    const Sx = FX + FR*g, Nx = FX - FR*g, yEnd = ROWS[ROWS.length - 1].y + 4;
    [Sx, Nx].forEach(x => el('path', {d:`M${x.toFixed(1)} ${FY}L${x.toFixed(1)} ${yEnd}`, fill:'none', stroke:COL.green, 'stroke-width':1.3, 'stroke-dasharray':'4 4'}));
    const vals = {
      vswr:fS(M.s), rl:f(-20*Math.log10(g), 2) + ' dB', g:f(g, 3),
      dbs: isFinite(M.s) ? f(20*Math.log10(M.s), 1) + ' dB' : '∞', loss:f(-10*Math.log10(1 - g*g), 2) + ' dB', pw:f(g*g, 3)
    };
    ROWS.forEach(row => {
      el('circle', {cx:Sx.toFixed(1), cy:row.y, r:3.6, fill:COL.green, stroke:'#fff', 'stroke-width':1.5});
      ftext(Sx + 6, row.y + 11, vals[row.right], {anchor:'start', size:10.5, weight:750, color:COL.green, cls:'halo'}, FULL.g);
      el('circle', {cx:Nx.toFixed(1), cy:row.y, r:3.6, fill:COL.green, stroke:'#fff', 'stroke-width':1.5});
      ftext(Nx - 6, row.y + 11, vals[row.left], {anchor:'end', size:10.5, weight:750, color:COL.green, cls:'halo'}, FULL.g);
    });
    return vals;
  }
  function renderFull(){
    VIEW = FULL; fSol.innerHTML = '';
    ftext(18, 47, MODE.title, {anchor:'start', size:11.5, weight:700, color:'#5b3fd6'}, fSol);
    ftext(18, 62, plainChips(MODE.problem(M)), {anchor:'start', size:10, weight:600, color:'#5b3fd6'}, fSol);
    for (let j = 1; j < STEPS.length; j++){ FULL.g = el('g', {class:'fd', style:`--d:${((j - 1)*0.28).toFixed(2)}s`}, fSol); STEPS[j].draw(M, 1); }
    FULL.g = el('g', {class:'fd', style:`--d:${((STEPS.length - 1)*0.28).toFixed(2)}s`}, fSol);
    const vals = rulerTransfer();
    VIEW = WALK;
    return vals;
  }
  function fillReadings(vals){
    $('solSub').innerHTML = MODE.problem(M).chips.join(', ');
    $('readings').innerHTML = STEPS.filter(s => s.rd).map(s => { const [k, v] = s.rd(M); return `<li><span class="rk">${k}</span><span class="rv">${v}</span></li>`; }).join('');
    const showExtras = MODE.extras !== false && !!vals && isFinite(M.s);
    $('extras').innerHTML = showExtras ? `
      <div>First V<sub>min</sub> from the load<b>${f(M.dmin)}λ</b></div>
      <div>First V<sub>max</sub> from the load<b>${f(M.dmax)}λ</b></div>
      <div>Return loss<b>${vals.rl}</b></div>
      <div>SWR in dB<b>${vals.dbs}</b></div>` : '';
    $('extras').hidden = !showExtras;
    $('finalAns').innerHTML = cardsHTML(MODE.answer(M));
  }
  function updateFull(){ fillReadings(renderFull()); }

  document.querySelectorAll('[data-zoom]').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('[data-zoom]').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
    fsvg.style.width = b.dataset.zoom + '%';
  }));
  $('dlSvg').addEventListener('click', () => {
    const clone = fsvg.cloneNode(true);
    clone.setAttribute('xmlns', NS); clone.setAttribute('width', '820'); clone.setAttribute('height', '990'); clone.removeAttribute('style');
    clone.querySelectorAll('.halo').forEach(t => { t.setAttribute('stroke', '#fff'); t.setAttribute('stroke-width', '4'); t.setAttribute('paint-order', 'stroke'); t.setAttribute('stroke-linejoin', 'round'); });
    clone.querySelectorAll('[class]').forEach(e => { e.removeAttribute('class'); e.removeAttribute('style'); });
    const blob = new Blob(['<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(clone)], {type:'image/svg+xml'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `smith-chart-${MODE.id}.svg`;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  });
  if ('IntersectionObserver' in window){
    new IntersectionObserver((ents, obs) => { if (ents.some(e => e.isIntersecting)){ $('complete').classList.add('in-view'); obs.disconnect(); } }, {threshold:0.12}).observe($('complete'));
  } else $('complete').classList.add('in-view');

  // ---------- problem text ----------
  function setProblem(){
    const pr = MODE.problem(M);
    waveCaption();
  }

  // ---------- start ----------
  buildGrid();
  buildFullGrid();
  sizeWave();
  const initId = location.hash.slice(1);
  selectMode(MODES.some(x => x.id === initId) ? initId : MODES[0].id, {init:true});
  window.__smith = {
    get state(){ return {idx, prog, running, auto, mode:MODE.id, steps:STEPS.length}; },
    get M(){ return M; },
    goTo, next, back, selectMode,
    solve(id, vals){ selectMode(id); Object.assign(MODE.vals, vals); buildFields(); const m = MODE.compute(readVals()); started = true; applyModel(m); return m; },
    tryCompute(id, vals){ const md = MODES.find(x => x.id === id), saved = MODE, old = md.vals; MODE = md; md.vals = Object.assign({}, md.defaults, vals); let out; try { out = {ok:true, m:md.compute(readVals())}; } catch (e){ out = {ok:false, err:e.message}; } md.vals = old; MODE = saved; return out; },
    modes: MODES.map(x => x.id),
    waveEnv(ds){ const S = waveSpec(), at = d => { let q = S.segs[0]; for (const t of S.segs) if (t.d <= d + 1e-12) q = t; return q; }; return ds.map(d => { const v = segV(at(d), d).v; return Math.hypot(v[0], v[1]); }); }
  };
  requestAnimationFrame(t => { lastT = t; tick(t); });
  requestAnimationFrame(t => { if (reduceMotion) drawWave(t); else waveLoop(t); });
})();
