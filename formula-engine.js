// Step-by-step formula walkthroughs with an animated canvas scene.
// A page script sets window.FORMULA_PAGE = H => ({MODES, FIELDS}) before this file loads.
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const reduceMotion = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const PI = Math.PI, TAU = 2*Math.PI;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = t => t < .5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2)/2;
  const seg = (p, a, b) => clamp((p - a)/(b - a));
  const FONT = 'IBM Plex Sans, system-ui, sans-serif', MONO = 'IBM Plex Mono, ui-monospace, monospace';
  const C = {white:'#ffffff', pink:'#8AB4F0', cyan:'#7CC6BE', amber:'#E2B86F', violet:'#B6A2DE', green:'#8FC79A', muted:'rgba(150,163,178,.62)', faint:'rgba(255,255,255,.14)'};

  // ---------- number formatting ----------
  const SUP = {'-':'⁻', 0:'⁰', 1:'¹', 2:'²', 3:'³', 4:'⁴', 5:'⁵', 6:'⁶', 7:'⁷', 8:'⁸', 9:'⁹'};
  function num(v, sig = 4){
    if (!isFinite(v)) return '∞';
    if (v === 0) return '0';
    const a = Math.abs(v);
    if (a >= 1e-3 && a < 1e6){ const s = (+v.toPrecision(sig)).toString(); return s.replace('-', '−'); }
    const e = Math.floor(Math.log10(a)), mnt = +(v/Math.pow(10, e)).toPrecision(sig);
    return `${mnt.toString().replace('-', '−')} × 10${String(e).split('').map(ch => SUP[ch]).join('')}`;
  }
  const PREFIX = [[1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'], [1e-12, 'p']];
  function si(v, unit, sig = 4){
    if (!isFinite(v)) return '∞ ' + unit;
    if (v === 0) return '0 ' + unit;
    const a = Math.abs(v);
    for (const [k, p] of PREFIX) if (a >= k*0.9999999){ return `${(+(v/k).toPrecision(sig)).toString().replace('-', '−')} ${p}${unit}`; }
    return `${num(v, sig)} ${unit}`;
  }
  const fix = (v, d = 3) => !isFinite(v) ? '∞' : (+v.toFixed(d)).toString().replace('-', '−');

  // ---------- canvas helpers for scenes ----------
  const cv = $('scene'), ctx = cv.getContext('2d');
  let W = 0, H = 0;
  function sizeScene(){
    const r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height; cv.width = Math.round(W*dpr); cv.height = Math.round(H*dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  const G = {
    ctx: () => ctx, size: () => [W, H], C, PI, TAU, clamp, ease, seg, num, si, fix, FONT, MONO,
    font(sz, w = 600, mono){ ctx.font = `${w} ${sz}px ${mono ? MONO : FONT}`; },
    text(str, x, y, o = {}){
      ctx.save(); ctx.globalAlpha *= (o.a ?? 1); G.font(o.size || 12.5, o.weight || 600, o.mono);
      ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.base || 'alphabetic'; ctx.fillStyle = o.color || C.white;
      if (o.halo){ ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(15,20,26,.85)'; ctx.lineJoin = 'round'; ctx.strokeText(str, x, y); }
      ctx.fillText(str, x, y); ctx.restore();
    },
    line(x1, y1, x2, y2, color, w = 1.5, o = {}){
      ctx.save(); ctx.globalAlpha *= (o.a ?? 1); ctx.strokeStyle = color; ctx.lineWidth = w; if (o.dash) ctx.setLineDash(o.dash);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
    },
    path(pts, color, w = 2, o = {}){
      if (pts.length < 2) return;
      ctx.save(); ctx.globalAlpha *= (o.a ?? 1); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      if (o.glow){ ctx.shadowBlur = 0; ctx.shadowColor = color; }
      if (o.dash) ctx.setLineDash(o.dash);
      ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); ctx.restore();
    },
    fillPath(pts, fill, o = {}){ ctx.save(); ctx.globalAlpha *= (o.a ?? 1); ctx.fillStyle = fill; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill(); ctx.restore(); },
    circle(x, y, r, o = {}){
      ctx.save(); ctx.globalAlpha *= (o.a ?? 1); ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), o.a0 ?? 0, o.a1 ?? TAU, !!o.ccw);
      if (o.fill){ ctx.fillStyle = o.fill; ctx.fill(); }
      if (o.stroke){ ctx.strokeStyle = o.stroke; ctx.lineWidth = o.w || 1.5; if (o.dash) ctx.setLineDash(o.dash); if (o.glow){ ctx.shadowBlur = 0; ctx.shadowColor = o.stroke; } ctx.stroke(); }
      ctx.restore();
    },
    arrow(x1, y1, x2, y2, color, w = 1.8, o = {}){
      const a = Math.atan2(y2 - y1, x2 - x1), h = o.head || 8;
      G.line(x1, y1, x2, y2, color, w, o);
      ctx.save(); ctx.globalAlpha *= (o.a ?? 1); ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - h*Math.cos(a - .4), y2 - h*Math.sin(a - .4)); ctx.lineTo(x2 - h*Math.cos(a + .4), y2 - h*Math.sin(a + .4)); ctx.closePath(); ctx.fill(); ctx.restore();
    },
    bracket(x1, x2, y, label, color, o = {}){
      G.line(x1, y, x2, y, color, 1.4, o); G.line(x1, y - 5, x1, y + 5, color, 1.4, o); G.line(x2, y - 5, x2, y + 5, color, 1.4, o);
      G.text(label, (x1 + x2)/2, y - 8, {align:'center', color, size:o.size || 12.5, a:o.a, halo:true});
    },
    roundRect(x, y, w, h, r, fill, o = {}){ ctx.save(); ctx.globalAlpha *= (o.a ?? 1); ctx.fillStyle = fill; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); ctx.fill(); if (o.stroke){ ctx.strokeStyle = o.stroke; ctx.lineWidth = 1; ctx.stroke(); } ctx.restore(); }
  };

  // ---------- page ----------
  const PAGE = window.FORMULA_PAGE(G);
  const {MODES, FIELDS} = PAGE;
  MODES.forEach(md => { md.vals = Object.assign({}, md.defaults); });
  const cardsHTML = cards => `<div class="answer">${cards.filter(Boolean).map(c => `<div class="ans ${c.tone || 'y'}"><div class="k">${c.k}</div><div class="v">${c.v}</div><div class="s">${c.s || ''}</div></div>`).join('')}</div>`;

  // ---------- walkthrough state ----------
  let MODE = MODES[0], M = null, STEPS = [], LAST = 0;
  let idx = 0, prog = 0, running = false, auto = false, started = false, holdUntil = 0, speed = 1, lastT = performance.now(), shownIdx = -1, sceneVisible = true, needsDraw = true;
  const dotsEl = $('dots');
  // how far an item of the scene is revealed: 1 once its step is past, eased progress during its step
  function vis(name){
    for (let k = 0; k <= LAST; k++){ const s = STEPS[k]; if (s.show && s.show.includes(name)){ if (k < idx) return 1; if (k === idx) return ease(prog); return 0; } }
    return 0;
  }
  function rebuildDots(){
    dotsEl.innerHTML = '';
    STEPS.forEach((s, i) => {
      const b = document.createElement('button');
      b.className = 'dot'; b.textContent = i === 0 ? '◎' : i === LAST ? '✓' : String(i);
      b.title = i === 0 ? 'The set-up' : i === LAST ? 'Answer' : 'Step ' + i; b.setAttribute('aria-label', b.title);
      b.addEventListener('click', () => goTo(i)); dotsEl.appendChild(b);
    });
  }
  function updatePanel(){
    if (shownIdx === idx) return;
    shownIdx = idx;
    const inf = STEPS[idx].info(M);
    $('stepno').textContent = idx === 0 ? 'Before you start' : idx === LAST ? 'Result' : `Step ${idx} of ${LAST - 1}`;
    $('stitle').innerHTML = inf.title; $('sbody').innerHTML = inf.body; $('swork').innerHTML = inf.work || '';
    [...dotsEl.children].forEach((d, i) => { d.className = 'dot' + (i === idx ? ' active' : i < idx ? ' done' : ''); });
    $('bBack').disabled = idx === 0;
    if (!reduceMotion && $('pcontent').animate) $('pcontent').animate([{opacity:0, transform:'translateY(10px)'}, {opacity:1, transform:'none'}], {duration:420, easing:'cubic-bezier(.2,.7,.2,1)'});
  }
  function updateButtons(){
    $('bPlay').textContent = auto ? '❚❚ Pause' : (idx === LAST && prog >= 1 ? '▶ Replay' : '▶ Play all');
    $('pfill').style.width = ((idx + prog)/(LAST + 1)*100).toFixed(2) + '%';
  }
  function drawScene(t){
    if (!W || !M) return;
    ctx.clearRect(0, 0, W, H);
    MODE.scene(M, {vis, t: reduceMotion ? 0.35 : t/1000, idx, prog, W, H});
  }
  function goTo(i, p = 0, run = true){ started = true; idx = clamp(i, 0, LAST); prog = p; running = run && p < 1; auto = false; needsDraw = true; }
  function next(){ started = true; if (prog < 1){ prog = 1; running = false; } else if (idx < LAST){ idx++; prog = 0; running = true; } needsDraw = true; }
  function back(){ if (idx > 0){ idx--; prog = 1; running = false; auto = false; needsDraw = true; } }
  function togglePlay(){
    started = true;
    if (auto){ auto = false; running = false; }
    else { auto = true; if (idx === LAST && prog >= 1){ idx = 0; prog = 0; } if (prog >= 1) holdUntil = 0; else running = true; }
    needsDraw = true;
  }
  function restart(){ goTo(0, 0, true); }
  function playFromStart(){ goTo(0, 0, true); auto = true; }
  function tick(t){
    const dt = Math.min(64, t - lastT); lastT = t;
    if (running){ prog += dt*speed/STEPS[idx].dur; if (prog >= 1){ prog = 1; running = false; holdUntil = t + 1100/speed; } }
    else if (auto && prog >= 1){ if (idx >= LAST) auto = false; else if (t >= holdUntil){ idx++; prog = 0; running = true; } }
    updatePanel(); updateButtons();
    if (sceneVisible && (!reduceMotion || needsDraw || running)){ drawScene(t); needsDraw = false; }
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
    else if (e.key === 'r' || e.key === 'R') restart();
  });
  $('hStart') && $('hStart').addEventListener('click', () => { $('lab').scrollIntoView({behavior: reduceMotion ? 'auto' : 'smooth'}); playFromStart(); });
  $('hPick').addEventListener('click', () => { $('modes').scrollIntoView({behavior: reduceMotion ? 'auto' : 'smooth'}); });
  if ('IntersectionObserver' in window){
    new IntersectionObserver((ents, obs) => { if (ents.some(e => e.isIntersecting)){ if (!started){ started = true; running = true; } obs.disconnect(); } }, {threshold:0.3}).observe($('stage'));
    new IntersectionObserver(ents => { sceneVisible = ents[0].isIntersecting; }).observe(cv);
  } else { started = true; running = true; }
  if ('ResizeObserver' in window) new ResizeObserver(() => { sizeScene(); needsDraw = true; }).observe(cv);
  else window.addEventListener('resize', () => { sizeScene(); needsDraw = true; });

  // ---------- question types and inputs ----------
  const modeGrid = $('modeGrid'), fieldsEl = $('fields');
  MODES.forEach(md => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'mode-card'; b.dataset.mode = md.id; b.setAttribute('aria-pressed', 'false');
    b.innerHTML = `${md.glyph}<b>${md.title}</b><span>${md.desc}</span>`;
    b.addEventListener('click', () => selectMode(md.id));
    modeGrid.appendChild(b);
  });
  function markCards(){ modeGrid.querySelectorAll('.mode-card').forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === MODE.id ? 'true' : 'false')); }
  function buildFields(){
    fieldsEl.innerHTML = '';
    MODE.fields.forEach(key => {
      const F = FIELDS[key], lab = document.createElement('label');
      lab.className = 'field'; lab.dataset.key = key; lab.innerHTML = `<span>${F.label}</span>`;
      if (F.type === 'select'){
        const s = document.createElement('select'); s.id = 'f_' + key;
        F.options.forEach(([v, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = t; s.appendChild(o); });
        s.value = MODE.vals[key]; s.addEventListener('change', () => { MODE.vals[key] = s.value; refreshVisibility(); });
        lab.appendChild(s);
      } else {
        const i = document.createElement('input'); i.type = 'text'; i.inputMode = F.type === 'expr' ? 'text' : 'decimal'; i.id = 'f_' + key; i.value = MODE.vals[key] ?? '';
        if (F.type === 'expr'){ i.className = 'wide'; i.spellcheck = false; i.autocapitalize = 'off'; }
        i.addEventListener('input', () => { MODE.vals[key] = i.value; });
        if (F.units){
          const row = document.createElement('span'); row.className = 'len';
          const u = document.createElement('select'); u.id = 'f_' + key + '_u'; u.setAttribute('aria-label', 'unit');
          F.units.forEach(([t]) => { const o = document.createElement('option'); o.value = t; o.textContent = t; u.appendChild(o); });
          u.value = MODE.vals[key + '_u'] || F.units[0][0];
          u.addEventListener('change', () => { MODE.vals[key + '_u'] = u.value; });
          row.append(i, u); lab.appendChild(row);
        } else lab.appendChild(i);
      }
      fieldsEl.appendChild(lab);
    });
    refreshVisibility();
  }
  function refreshVisibility(){ fieldsEl.querySelectorAll('.field').forEach(l => { const F = FIELDS[l.dataset.key]; l.hidden = F.showIf ? !F.showIf(MODE.vals, MODE) : false; }); }
  // numbers accept 5.8e7, 5.8×10^7 and commas as decimal points; values with units come back in SI
  function parseNum(raw){
    if (raw == null) return NaN;
    let s = String(raw).trim().replace(/\s+/g, '').replace(/,/g, '.').replace(/[×x*]10\^?/i, 'e').replace(/−/g, '-');
    if (s === '') return NaN;
    if (/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(s)) return parseFloat(s);
    if (window.MX){ try { return window.MX.evalNumber(String(raw)); } catch (e) { return NaN; } }
    return NaN;
  }
  function readVals(){
    const v = {};
    MODE.fields.forEach(k => {
      const F = FIELDS[k], raw = MODE.vals[k];
      if (F.type === 'select'){ v[k] = raw; return; }
      if (F.type === 'expr'){ v[k] = String(raw ?? '').trim(); return; }
      const n = parseNum(raw);
      if (F.units){ const u = MODE.vals[k + '_u'] || F.units[0][0], mult = (F.units.find(x => x[0] === u) || F.units[0])[1]; v[k] = n*mult; v[k + '_u'] = u; v[k + '_raw'] = n; }
      else v[k] = n;
    });
    return v;
  }
  function showErr(msg){ $('err').textContent = msg; }
  function applyModel(m){
    M = m; STEPS = MODE.steps(m); LAST = STEPS.length - 1;
    rebuildDots(); shownIdx = -1; idx = 0; prog = 0; running = started; auto = false; needsDraw = true;
    fillResults();
  }
  function selectMode(id, opts = {}){
    const md = MODES.find(x => x.id === id); if (!md) return;
    MODE = md; markCards(); buildFields(); showErr('');
    let m;
    try { m = MODE.compute(readVals()); } catch (e){ MODE.vals = Object.assign({}, MODE.defaults); buildFields(); m = MODE.compute(readVals()); }
    applyModel(m);
    if (!opts.init){
      try { history.replaceState(null, '', '#' + md.id); } catch (e) {}
      const card = modeGrid.querySelector(`[data-mode="${md.id}"]`);
      if (card && modeGrid.scrollWidth > modeGrid.clientWidth) modeGrid.scrollTo({left: card.offsetLeft - 16, behavior: reduceMotion ? 'auto' : 'smooth'});
    }
  }
  $('form').addEventListener('submit', e => {
    e.preventDefault();
    let m; try { m = MODE.compute(readVals()); } catch (err){ showErr(err.message); return; }
    showErr(''); started = true; applyModel(m);
    $('lab').scrollIntoView({behavior: reduceMotion ? 'auto' : 'smooth'}); playFromStart();
  });
  window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (h && h !== MODE.id && MODES.some(x => x.id === h)) selectMode(h); });

  // ---------- results ----------
  function fillResults(){
    const pr = MODE.problem(M);
    $('resSub').innerHTML = `${MODE.title}: ${pr.chips.join(', ')}`;
    $('resTable').innerHTML = STEPS.filter(s => s.rd).flatMap(s => { const r = s.rd(M); return Array.isArray(r[0]) ? r : [r]; }).map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('');
    $('resAns').innerHTML = cardsHTML(MODE.answer(M)) + (MODE.note ? `<p class="sub">${MODE.note(M)}</p>` : '');
  }
  PAGE.cardsHTML = cardsHTML;

  // ---------- start ----------
  sizeScene();
  const initId = location.hash.slice(1);
  selectMode(MODES.some(x => x.id === initId) ? initId : MODES[0].id, {init:true});
  window.__fx = {
    get state(){ return {idx, prog, running, auto, mode:MODE.id, steps:STEPS.length}; },
    get M(){ return M; }, goTo, selectMode,
    tryCompute(id, vals){ const md = MODES.find(x => x.id === id), saved = MODE, old = md.vals; MODE = md; md.vals = Object.assign({}, md.defaults, vals); let out; try { out = {ok:true, m:md.compute(readVals())}; } catch (e){ out = {ok:false, err:e.message}; } md.vals = old; MODE = saved; return out; },
    modes: MODES.map(x => x.id)
  };
  requestAnimationFrame(t => { lastT = t; tick(t); });
})();
