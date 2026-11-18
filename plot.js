// plot.js — small canvas plotting kit: frames with linear/log axes, curves, markers, zoom/pan.
window.PLOT = (() => {
  'use strict';
  const FONT = 'IBM Plex Sans, system-ui, sans-serif', MONO = 'IBM Plex Mono, ui-monospace, monospace';
  const COLORS = ['#8AB4F0', '#7CC6BE', '#E2B86F', '#B6A2DE', '#8FC79A', '#E07A6E', '#D5DCE4', '#EBD3A2'];
  const SUP = {'-':'⁻', 0:'⁰', 1:'¹', 2:'²', 3:'³', 4:'⁴', 5:'⁵', 6:'⁶', 7:'⁷', 8:'⁸', 9:'⁹'};

  function niceStep(span, n){ const raw = span/Math.max(1, n), e = Math.pow(10, Math.floor(Math.log10(raw))), f = raw/e; return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10)*e; }
  function tickLabel(v, step){
    if (Math.abs(v) < step*1e-9) return '0';
    const a = Math.abs(v);
    if (a >= 1e5 || a < 1e-3){ const e = Math.floor(Math.log10(a)), m = +(v/Math.pow(10, e)).toPrecision(3); return `${m}×10${String(e).split('').map(c => SUP[c]).join('')}`.replace('-', '−'); }
    const d = Math.max(0, -Math.floor(Math.log10(step) + 1e-9));
    return (+v.toFixed(Math.min(d, 10))).toString().replace('-', '−');
  }
  // world→pixel mapping for a frame
  function mapper(box, o){
    const lx = v => o.xlog ? Math.log10(v) : v, ly = v => o.ylog ? Math.log10(v) : v;
    const x0 = lx(o.xr[0]), x1 = lx(o.xr[1]), y0 = ly(o.yr[0]), y1 = ly(o.yr[1]);
    const X = v => box.x + (lx(v) - x0)/(x1 - x0)*box.w, Y = v => box.y + box.h - (ly(v) - y0)/(y1 - y0)*box.h;
    const ix = px => { const t = x0 + (px - box.x)/box.w*(x1 - x0); return o.xlog ? Math.pow(10, t) : t; };
    const iy = py => { const t = y0 + (box.y + box.h - py)/box.h*(y1 - y0); return o.ylog ? Math.pow(10, t) : t; };
    return {X, Y, ix, iy, box, o};
  }
  function ticks(lo, hi, log, n){
    if (log){
      const out = [], a = Math.floor(Math.log10(lo)), b = Math.ceil(Math.log10(hi));
      for (let e = a; e <= b; e++) for (let k = 1; k < 10; k++){ const v = k*Math.pow(10, e); if (v >= lo*0.9999 && v <= hi*1.0001) out.push({v, major:k === 1, label: k === 1 ? (e >= -2 && e <= 4 ? String(+v.toPrecision(3)) : `10${String(e).split('').map(c => SUP[c]).join('')}`.replace('-', '−')) : ''}); }
      return out;
    }
    const st = niceStep(hi - lo, n), out = [];
    for (let v = Math.ceil(lo/st)*st; v <= hi + st*1e-9; v += st) out.push({v, major:true, label:tickLabel(v, st), minor:false});
    return out;
  }
  // ticks at whole multiples of a fixed step (e.g. integer sample indices)
  function stepTicks(lo, hi, st){ const out = []; for (let v = Math.ceil(lo/st - 1e-9)*st; v <= hi + 1e-9; v += st) out.push({v, major:true, label:tickLabel(v, st)}); return out; }
  // draw the axes and grid; returns the mapping used by the other helpers
  function frame(ctx, box, o){
    o = Object.assign({mode:'box', grid:true, n:6}, o);
    const M = mapper(box, o);
    ctx.save();
    ctx.font = `500 11px ${FONT}`; ctx.fillStyle = 'rgba(150,163,178,.62)';
    const tx = o.xstep ? stepTicks(o.xr[0], o.xr[1], Math.max(o.xstep, niceStep(o.xr[1] - o.xr[0], Math.max(3, Math.round(box.w/50))))) : ticks(o.xr[0], o.xr[1], o.xlog, Math.max(3, Math.round(box.w/90))), ty = ticks(o.yr[0], o.yr[1], o.ylog, Math.max(3, Math.round(box.h/60)));
    // grid
    if (o.grid){
      if (!o.xlog && !o.ylog && o.mode === 'cartesian'){
        // minor grid (5 per major)
        const sx = niceStep(o.xr[1] - o.xr[0], Math.max(3, Math.round(box.w/90)))/5, sy = niceStep(o.yr[1] - o.yr[0], Math.max(3, Math.round(box.h/60)))/5;
        ctx.strokeStyle = 'rgba(255,255,255,.035)'; ctx.lineWidth = 1; ctx.beginPath();
        for (let v = Math.ceil(o.xr[0]/sx)*sx; v <= o.xr[1]; v += sx){ const x = Math.round(M.X(v)) + .5; ctx.moveTo(x, box.y); ctx.lineTo(x, box.y + box.h); }
        for (let v = Math.ceil(o.yr[0]/sy)*sy; v <= o.yr[1]; v += sy){ const y = Math.round(M.Y(v)) + .5; ctx.moveTo(box.x, y); ctx.lineTo(box.x + box.w, y); }
        ctx.stroke();
      }
      ctx.lineWidth = 1;
      tx.forEach(t => { ctx.strokeStyle = t.major ? 'rgba(255,255,255,.09)' : 'rgba(255,255,255,.04)'; const x = Math.round(M.X(t.v)) + .5; ctx.beginPath(); ctx.moveTo(x, box.y); ctx.lineTo(x, box.y + box.h); ctx.stroke(); });
      ty.forEach(t => { ctx.strokeStyle = t.major ? 'rgba(255,255,255,.09)' : 'rgba(255,255,255,.04)'; const y = Math.round(M.Y(t.v)) + .5; ctx.beginPath(); ctx.moveTo(box.x, y); ctx.lineTo(box.x + box.w, y); ctx.stroke(); });
    }
    if (o.mode === 'cartesian'){
      // axes through the origin, labels beside them
      const ax = clampN(M.X(0), box.x, box.x + box.w), ay = clampN(M.Y(0), box.y, box.y + box.h);
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.4; ctx.beginPath();
      if (o.xr[0] <= 0 && o.xr[1] >= 0){ ctx.moveTo(Math.round(ax) + .5, box.y); ctx.lineTo(Math.round(ax) + .5, box.y + box.h); }
      if (o.yr[0] <= 0 && o.yr[1] >= 0){ ctx.moveTo(box.x, Math.round(ay) + .5); ctx.lineTo(box.x + box.w, Math.round(ay) + .5); }
      ctx.stroke();
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      const ly = clampN(ay + 5, box.y + 2, box.y + box.h - 16);
      tx.forEach(t => { if (t.label && t.label !== '0') ctx.fillText(t.label, M.X(t.v), ly); });
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      const lx = clampN(ax - 6, box.x + 30, box.x + box.w - 4);
      ty.forEach(t => { if (t.label && t.label !== '0') ctx.fillText(t.label, lx, M.Y(t.v)); });
      if (o.xr[0] <= 0 && o.xr[1] >= 0 && o.yr[0] <= 0 && o.yr[1] >= 0){ ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.fillText('0', ax - 5, ay + 5); }
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 1; ctx.strokeRect(box.x + .5, box.y + .5, box.w, box.h);
      if (o.zeroLine && !o.ylog && o.yr[0] < 0 && o.yr[1] > 0){ ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.beginPath(); ctx.moveTo(box.x, Math.round(M.Y(0)) + .5); ctx.lineTo(box.x + box.w, Math.round(M.Y(0)) + .5); ctx.stroke(); }
      if (o.zeroLineX && !o.xlog && o.xr[0] < 0 && o.xr[1] > 0){ ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.beginPath(); ctx.moveTo(Math.round(M.X(0)) + .5, box.y); ctx.lineTo(Math.round(M.X(0)) + .5, box.y + box.h); ctx.stroke(); }
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      let last = -1e9; tx.forEach(t => { const x = M.X(t.v); if (t.label && x - last > 34){ ctx.fillText(t.label, x, box.y + box.h + 5); last = x; } });
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      if (!o.noY) ty.forEach(t => { if (t.label) ctx.fillText(t.label, box.x - 6, M.Y(t.v)); });
      ctx.font = `600 11.5px ${FONT}`; ctx.fillStyle = 'rgba(213,220,228,.8)';
      if (o.xlabel){ ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.fillText(o.xlabel, box.x + box.w, box.y + box.h + 20); }
      if (o.ylabel){ ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText(o.ylabel, box.x, box.y - 6); }
      if (o.title){ ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.font = `700 12.5px ${FONT}`; ctx.fillStyle = '#fff'; ctx.fillText(o.title, box.x + (o.ylabel ? ctx.measureText(o.ylabel).width + 60 : 0), box.y - 6); }
    }
    ctx.restore();
    return M;
  }
  const clampN = (v, a, b) => Math.min(b, Math.max(a, v));
  function clip(ctx, M){ ctx.save(); ctx.beginPath(); ctx.rect(M.box.x, M.box.y, M.box.w, M.box.h); ctx.clip(); }
  function style(ctx, s){
    ctx.strokeStyle = s.color || COLORS[0]; ctx.lineWidth = s.width || 2.2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.globalAlpha = s.alpha ?? 1; ctx.setLineDash(s.dash || []);
    if (s.glow){ ctx.shadowBlur = 0; ctx.shadowColor = s.color || COLORS[0]; }
  }
  // polyline of world points; breaks at NaN and at huge jumps (asymptotes)
  function line(ctx, M, pts, s = {}){
    clip(ctx, M); style(ctx, s); ctx.beginPath();
    let pen = false, py = 0;
    const H = M.box.h;
    for (const [x, y] of pts){
      if (!isFinite(x) || !isFinite(y) || (M.o.ylog && y <= 0) || (M.o.xlog && x <= 0)){ pen = false; continue; }
      const X = M.X(x), Y = M.Y(y);
      if (pen && Math.abs(Y - py) > H*4){ pen = false; }
      if (Math.abs(Y) > 1e6){ pen = false; continue; }
      if (!pen){ ctx.moveTo(X, Y); pen = true; } else ctx.lineTo(X, Y);
      py = Y;
    }
    ctx.stroke(); ctx.restore();
  }
  // y = f(x) sampled per pixel, with extra breaks where f jumps sign through infinity (tan x)
  function fn(ctx, M, f, s = {}){
    const pts = [], n = Math.max(200, Math.round(M.box.w*1.5));
    let prev = null;
    for (let i = 0; i <= n; i++){
      const px = M.box.x + M.box.w*i/n, x = M.ix(px), y = f(x);
      if (prev && isFinite(prev[1]) && isFinite(y)){
        const dy = Math.abs(M.Y(y) - M.Y(prev[1]));
        if (dy > M.box.h*0.9 && Math.sign(y) !== Math.sign(prev[1])) pts.push([NaN, NaN]);
      }
      pts.push([x, y]); prev = [x, y];
    }
    line(ctx, M, pts, s);
  }
  function dot(ctx, M, x, y, s = {}){
    if (!isFinite(x) || !isFinite(y)) return;
    const X = M.X(x), Y = M.Y(y);
    if (X < M.box.x - 6 || X > M.box.x + M.box.w + 6 || Y < M.box.y - 6 || Y > M.box.y + M.box.h + 6) return;
    ctx.save(); ctx.globalAlpha = s.alpha ?? 1; ctx.beginPath(); ctx.arc(X, Y, s.r || 4.5, 0, 2*Math.PI);
    if (s.hollow){ ctx.strokeStyle = s.color || '#fff'; ctx.lineWidth = 2; ctx.stroke(); } else { ctx.fillStyle = s.color || '#fff'; ctx.fill(); if (s.ring !== false){ ctx.strokeStyle = 'rgba(15,20,26,.9)'; ctx.lineWidth = 1.5; ctx.stroke(); } }
    if (s.label){ label(ctx, X + (s.dx ?? 8), Y + (s.dy ?? -8), s.label, s); }
    ctx.restore();
  }
  function cross(ctx, M, x, y, s = {}){
    const X = M.X(x), Y = M.Y(y), r = s.r || 6;
    ctx.save(); ctx.strokeStyle = s.color || '#fff'; ctx.lineWidth = s.width || 2.2; ctx.globalAlpha = s.alpha ?? 1;
    ctx.beginPath(); ctx.moveTo(X - r, Y - r); ctx.lineTo(X + r, Y + r); ctx.moveTo(X - r, Y + r); ctx.lineTo(X + r, Y - r); ctx.stroke(); ctx.restore();
  }
  function label(ctx, x, y, text, s = {}){
    ctx.save(); ctx.globalAlpha = s.alpha ?? 1; ctx.font = `${s.weight || 650} ${s.size || 12}px ${s.mono ? MONO : FONT}`;
    ctx.textAlign = s.align || 'left'; ctx.textBaseline = s.base || 'alphabetic';
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(15,20,26,.88)'; ctx.lineJoin = 'round'; ctx.strokeText(text, x, y);
    ctx.fillStyle = s.color || '#fff'; ctx.fillText(text, x, y); ctx.restore();
  }
  function vline(ctx, M, x, s = {}){ clip(ctx, M); style(ctx, Object.assign({width:1.3, dash:[5, 4]}, s)); const X = M.X(x); ctx.beginPath(); ctx.moveTo(X, M.box.y); ctx.lineTo(X, M.box.y + M.box.h); ctx.stroke(); ctx.restore(); }
  function hline(ctx, M, y, s = {}){ clip(ctx, M); style(ctx, Object.assign({width:1.3, dash:[5, 4]}, s)); const Y = M.Y(y); ctx.beginPath(); ctx.moveTo(M.box.x, Y); ctx.lineTo(M.box.x + M.box.w, Y); ctx.stroke(); ctx.restore(); }
  function area(ctx, M, pts, s = {}){
    clip(ctx, M); ctx.globalAlpha = s.alpha ?? .25; ctx.fillStyle = s.color || COLORS[0]; ctx.beginPath();
    const base = s.base ?? 0;
    ctx.moveTo(M.X(pts[0][0]), M.Y(base)); pts.forEach(([x, y]) => ctx.lineTo(M.X(x), M.Y(isFinite(y) ? y : base))); ctx.lineTo(M.X(pts[pts.length - 1][0]), M.Y(base)); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  function stems(ctx, M, pts, s = {}){
    clip(ctx, M); style(ctx, Object.assign({width:2}, s)); const Y0 = M.Y(s.base ?? 0);
    pts.forEach(([x, y]) => { const X = M.X(x), Y = M.Y(y); ctx.beginPath(); ctx.moveTo(X, Y0); ctx.lineTo(X, Y); ctx.stroke(); ctx.beginPath(); ctx.arc(X, Y, s.r || 3.5, 0, 2*Math.PI); ctx.fillStyle = s.color || COLORS[0]; ctx.fill(); });
    ctx.restore();
  }
  // auto range for data with a little headroom
  function range(vals, pad = .08, fallback = [-1, 1]){
    const v = vals.filter(isFinite); if (!v.length) return fallback.slice();
    let a = Math.min(...v), b = Math.max(...v);
    if (b - a < 1e-12*Math.max(1, Math.abs(a))){ const m = Math.abs(a) || 1; a -= m*.5; b += m*.5; }
    const d = (b - a)*pad; return [a - d, b + d];
  }

  // zoom and pan for a canvas showing one frame; view = {xr, yr}; call opts.onChange() to redraw
  function interactive(canvas, getBox, view, opts = {}){
    const pointers = new Map(); let last = null, pinch = null;
    const toLocal = e => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const world = (p, b) => [view.xr[0] + (p[0] - b.x)/b.w*(view.xr[1] - view.xr[0]), view.yr[0] + (b.y + b.h - p[1])/b.h*(view.yr[1] - view.yr[0])];
    function zoomAt(p, k, axis){
      const b = getBox(), [wx, wy] = world(p, b);
      if (axis !== 'y'){ view.xr = [wx + (view.xr[0] - wx)*k, wx + (view.xr[1] - wx)*k]; }
      if (axis !== 'x'){ view.yr = [wy + (view.yr[0] - wy)*k, wy + (view.yr[1] - wy)*k]; }
      opts.onChange && opts.onChange();
    }
    canvas.addEventListener('wheel', e => { e.preventDefault(); zoomAt(toLocal(e), Math.exp(e.deltaY*0.0015), e.shiftKey ? 'x' : e.altKey ? 'y' : null); }, {passive:false});
    canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); pointers.set(e.pointerId, toLocal(e)); last = toLocal(e); if (pointers.size === 2){ const [a, b] = [...pointers.values()]; pinch = Math.hypot(a[0] - b[0], a[1] - b[1]); } });
    canvas.addEventListener('pointermove', e => {
      const p = toLocal(e);
      if (pointers.has(e.pointerId)){
        pointers.set(e.pointerId, p);
        if (pointers.size === 2 && pinch){ const [a, b] = [...pointers.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (d > 0){ zoomAt([(a[0] + b[0])/2, (a[1] + b[1])/2], pinch/d); pinch = d; } }
        else if (pointers.size === 1 && last){
          const b = getBox(), dx = (p[0] - last[0])/b.w*(view.xr[1] - view.xr[0]), dy = (p[1] - last[1])/b.h*(view.yr[1] - view.yr[0]);
          view.xr = [view.xr[0] - dx, view.xr[1] - dx]; view.yr = [view.yr[0] + dy, view.yr[1] + dy]; last = p; opts.onChange && opts.onChange();
        }
      }
      opts.onHover && opts.onHover(p);
    });
    const up = e => { pointers.delete(e.pointerId); if (pointers.size < 2) pinch = null; last = pointers.size ? [...pointers.values()][0] : null; };
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('pointerleave', () => { opts.onHover && opts.onHover(null); });
    canvas.addEventListener('dblclick', () => { opts.onReset && opts.onReset(); });
    canvas.style.touchAction = 'none';
    return {zoomAt};
  }
  // keep a canvas sized to its CSS box at device resolution
  function fit(canvas, onResize){
    const ctx = canvas.getContext('2d');
    const go = () => { const r = canvas.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1); canvas.width = Math.round(r.width*d); canvas.height = Math.round(r.height*d); ctx.setTransform(d, 0, 0, d, 0, 0); canvas._w = r.width; canvas._h = r.height; onResize && onResize(); };
    if ('ResizeObserver' in window) new ResizeObserver(go).observe(canvas); else window.addEventListener('resize', go);
    go(); return ctx;
  }
  return {COLORS, FONT, MONO, frame, mapper, line, fn, dot, cross, label, vline, hline, area, stems, range, niceStep, interactive, fit};
})();
