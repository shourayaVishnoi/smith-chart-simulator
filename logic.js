// Digital logic: expressions, truth tables, K-maps, minimal SOP/POS and gate circuits, plus step-by-step questions.
window.LG = (() => {
  'use strict';
  // ---------- Boolean expressions ----------
  // grammar: or := xor ('+' xor)* ; xor := and ('^' and)* ; and := unary ([*·&] | juxtaposition) unary)* ; unary := [!~¬] unary | atom "'"* ; atom := VAR | 0 | 1 | ( or )
  function tokenize(src){
    let s = src.replace(/\b(AND)\b/gi, '*').replace(/\b(OR)\b/gi, '+').replace(/\b(XOR)\b/gi, '^').replace(/\b(NOT)\b/gi, '!').replace(/[’‘`]/g, "'").replace(/[·∙•∧]/g, '*').replace(/[∨|]/g, '+').replace(/[⊕]/g, '^').replace(/[¬~]/g, '!');
    const out = [];
    for (let i = 0; i < s.length; i++){
      const c = s[i];
      if (/\s/.test(c)) continue;
      if (/[A-Za-z]/.test(c)) out.push({t:'v', v:c.toUpperCase()});
      else if (c === '0' || c === '1') out.push({t:'c', v:+c});
      else if ("+*^!()'&".includes(c)) out.push({t:c === '&' ? '*' : c});
      else throw new Error(`I don't understand "${c}". Use letters for inputs, + for OR, juxtaposition or * for AND, ' or ! for NOT, ^ for XOR.`);
    }
    return out;
  }
  function parse(src){
    if (!src || !src.trim()) throw new Error('Type a Boolean expression, for example AB + A\'C.');
    const tk = tokenize(src); let i = 0;
    const peek = () => tk[i], eat = t => { if (!tk[i] || tk[i].t !== t) throw new Error(t === ')' ? 'A bracket is not closed.' : `Expected ${t}.`); i++; };
    const startsAtom = t => t && (t.t === 'v' || t.t === 'c' || t.t === '(' || t.t === '!');
    function or(){ let a = xor(); while (peek() && peek().t === '+'){ i++; a = {op:'or', a, b:xor()}; } return a; }
    function xor(){ let a = and(); while (peek() && peek().t === '^'){ i++; a = {op:'xor', a, b:and()}; } return a; }
    function and(){ let a = unary(); while (peek() && (peek().t === '*' || startsAtom(peek()))){ if (peek().t === '*') i++; a = {op:'and', a, b:unary()}; } return a; }
    function unary(){ if (peek() && peek().t === '!'){ i++; return {op:'not', a:unary()}; } let a = atom(); while (peek() && peek().t === "'"){ i++; a = {op:'not', a}; } return a; }
    function atom(){
      const t = peek(); if (!t) throw new Error('The expression ends too early.');
      if (t.t === 'v'){ i++; return {op:'var', v:t.v}; } if (t.t === 'c'){ i++; return {op:'const', v:t.v}; }
      if (t.t === '('){ i++; const e = or(); eat(')'); return e; }
      throw new Error(`Unexpected "${t.t}".`);
    }
    const ast = or(); if (i < tk.length) throw new Error(tk[i].t === ')' ? 'There is an extra closing bracket.' : 'Something is left over at the end.');
    return ast;
  }
  function varsOf(ast, s = new Set()){ if (ast.op === 'var') s.add(ast.v); ['a', 'b'].forEach(k => ast[k] && varsOf(ast[k], s)); return s; }
  function evalAst(ast, env){ switch (ast.op){ case 'var': return env[ast.v]; case 'const': return ast.v; case 'not': return 1 - evalAst(ast.a, env); case 'and': return evalAst(ast.a, env) & evalAst(ast.b, env); case 'or': return evalAst(ast.a, env) | evalAst(ast.b, env); default: return evalAst(ast.a, env) ^ evalAst(ast.b, env); } }
  // truth table, rows in binary order with the first variable as the most significant bit
  function table(ast, vars){ const n = vars.length, out = []; for (let r = 0; r < (1 << n); r++){ const env = {}; vars.forEach((v, k) => { env[v] = (r >> (n - 1 - k)) & 1; }); out.push(evalAst(ast, env)); } return out; }
  // "m(1,3,5) d(2)" style input
  function fromMinterms(src){
    const mm = src.match(/(?:Σ\s*)?m\s*\(([^)]*)\)/i); if (!mm) return null;
    const dd = src.match(/d\s*\(([^)]*)\)/i), list = s => s.split(/[,\s]+/).filter(Boolean).map(x => { const k = +x; if (!Number.isInteger(k) || k < 0) throw new Error(`"${x}" is not a minterm number.`); return k; });
    const m = list(mm[1]), d = dd ? list(dd[1]) : [], mx = Math.max(0, ...m, ...d), nv = src.match(/vars?\s*=\s*(\d)/i);
    const n = nv ? +nv[1] : Math.max(2, Math.ceil(Math.log2(mx + 1)));
    if (mx >= (1 << n)) throw new Error(`Minterm ${mx} needs more than ${n} variables.`);
    if (n > 6) throw new Error('Use at most 6 variables.');
    const vars = 'ABCDEF'.slice(0, n).split(''), t = new Array(1 << n).fill(0); m.forEach(k => { t[k] = 1; }); d.forEach(k => { if (t[k] === 1) throw new Error(`${k} is listed as both a minterm and a don't-care.`); t[k] = 2; });
    return {vars, t};
  }
  // ---------- Quine–McCluskey with an exact minimum cover ----------
  const pop = x => { let c = 0; while (x){ c += x & 1; x >>= 1; } return c; };
  function primes(n, ones, dcs){
    let cur = [...new Set([...ones, ...dcs])].map(v => ({v, m:0})), all = [];
    const key = t => t.v + ':' + t.m;
    while (cur.length){
      const next = new Map(), used = new Set();
      for (let a = 0; a < cur.length; a++) for (let b = a + 1; b < cur.length; b++){
        const x = cur[a], y = cur[b]; if (x.m !== y.m) continue; const d = x.v ^ y.v; if (pop(d) !== 1) continue;
        const t = {v:x.v & ~d, m:x.m | d}; next.set(key(t), t); used.add(key(x)); used.add(key(y));
      }
      cur.forEach(t => { if (!used.has(key(t))) all.push(t); }); cur = [...next.values()];
    }
    const seen = new Set(); return all.filter(t => { const k = key(t); if (seen.has(k)) return false; seen.add(k); return true; });
  }
  const covers = (t, x) => (x & ~t.m) === t.v;
  const lits = (t, n) => n - pop(t.m);
  function minCover(n, ones, pis){
    const need = [...ones];
    const ess = [];
    need.forEach(x => { const c = pis.filter(p => covers(p, x)); if (c.length === 1 && !ess.includes(c[0])) ess.push(c[0]); });
    let rem = need.filter(x => !ess.some(p => covers(p, x)));
    let best = null;
    function search(chosen, left){
      const cost = [chosen.length, chosen.reduce((s, p) => s + lits(p, n), 0)];
      if (best && (cost[0] > best.cost[0] || (cost[0] === best.cost[0] && cost[1] >= best.cost[1]))) return;
      if (!left.length){ best = {cover:chosen.slice(), cost}; return; }
      // branch on the minterm with the fewest options
      let pick = left[0], opts = null; left.forEach(x => { const o = pis.filter(p => covers(p, x) && !chosen.includes(p)); if (!opts || o.length < opts.length){ opts = o; pick = x; } });
      opts.sort((a, b) => lits(a, n) - lits(b, n)).forEach(p => { chosen.push(p); search(chosen, left.filter(x => !covers(p, x))); chosen.pop(); });
    }
    search([], rem);
    return {ess, extra: best ? best.cover : [], cover: ess.concat(best ? best.cover : [])};
  }
  function termStr(t, vars, pos = false){
    const n = vars.length, parts = [];
    vars.forEach((v, k) => { const bit = 1 << (n - 1 - k); if (t.m & bit) return; const one = !!(t.v & bit); parts.push(pos ? (one ? v + "'" : v) : (one ? v : v + "'")); });
    if (!parts.length) return pos ? '0' : '1';
    return pos ? (parts.length > 1 ? '(' + parts.join(' + ') + ')' : parts[0]) : parts.join('');
  }
  function minimize(vars, t){
    const n = vars.length, ones = [], zeros = [], dcs = [];
    t.forEach((v, i) => (v === 1 ? ones : v === 2 ? dcs : zeros).push(i));
    const solve = (on, dc) => { if (!on.length) return {pis:[], ess:[], extra:[], cover:[], zero:true}; const pis = primes(n, on, dc), c = minCover(n, on, pis); return {pis, ...c}; };
    const S = solve(ones, dcs), Pp = solve(zeros, dcs);
    const sop = S.zero ? '0' : S.cover.length === 1 && S.cover[0].m === (1 << n) - 1 ? '1' : S.cover.map(p => termStr(p, vars)).join(' + ');
    const pos = Pp.zero ? '1' : Pp.cover.length === 1 && Pp.cover[0].m === (1 << n) - 1 ? '0' : Pp.cover.map(p => termStr(p, vars, true)).join('');
    return {ones, zeros, dcs, sop, pos, S, P:Pp, cost:S.zero || sop === '1' ? [0, 0] : [S.cover.length, S.cover.reduce((s, p) => s + lits(p, n), 0)]};
  }
  // ---------- K-map geometry ----------
  const GRAY = {1:[0, 1], 2:[0, 1, 3, 2]};
  function kmapLayout(n){
    const rb = Math.floor(n/2), cb = n - rb;
    return {rb, cb, rows:GRAY[rb] || [0], cols:GRAY[cb], cell:(r, c) => ((GRAY[rb] || [0])[r] << cb) | GRAY[cb][c]};
  }
  // contiguous runs (in Gray order, allowing wrap-around) of the indices an implicant covers
  function runs(idxs, len){
    const s = new Set(idxs); if (s.size === len) return [[0, len - 1]];
    const out = []; let start = null;
    for (let k = 0; k < len; k++){ if (s.has(k) && start === null) start = k; if (!s.has(k) && start !== null){ out.push([start, k - 1]); start = null; } }
    if (start !== null) out.push([start, len - 1]);
    return out;
  }
  function groupRects(t, n){
    const L = kmapLayout(n), rs = [], cs = [];
    L.rows.forEach((rv, r) => { L.cols.forEach((cv, c) => { if (covers(t, (rv << L.cb) | cv)){ if (!rs.includes(r)) rs.push(r); if (!cs.includes(c)) cs.push(c); } }); });
    const R = runs(rs, L.rows.length), Cc = runs(cs, L.cols.length), out = [];
    R.forEach(r => Cc.forEach(c => out.push({r0:r[0], r1:r[1], c0:c[0], c1:c[1]})));
    return out;
  }
  // ---------- numbers ----------
  const DIG = '0123456789ABCDEF';
  function parseBase(str, b){
    const s = str.trim().toUpperCase(); if (!s) throw new Error('Type a number.');
    const neg = s.startsWith('-'), body = neg ? s.slice(1) : s, [ip, fp = ''] = body.split('.');
    if (body.split('.').length > 2) throw new Error('Use at most one point.');
    let I = 0n, num = 0n, den = 1n;
    for (const ch of ip || '0'){ const d = DIG.indexOf(ch); if (d < 0 || d >= b) throw new Error(`"${ch}" is not a digit in base ${b}.`); I = I*BigInt(b) + BigInt(d); }
    for (const ch of fp){ const d = DIG.indexOf(ch); if (d < 0 || d >= b) throw new Error(`"${ch}" is not a digit in base ${b}.`); num = num*BigInt(b) + BigInt(d); den *= BigInt(b); }
    return {neg, I, num, den, ip:ip || '0', fp};
  }
  function toBase(I, num, den, t, maxFrac = 12){
    const divs = []; let q = I, digits = '';
    if (q === 0n) digits = '0';
    while (q > 0n){ const r = q % BigInt(t); divs.push({q, r:Number(r), nq:q/BigInt(t)}); digits = DIG[Number(r)] + digits; q = q/BigInt(t); }
    const muls = []; let fd = '', n = num, k = 0;
    while (n !== 0n && k < maxFrac){ const p = n*BigInt(t), d = p/den; muls.push({n, den, d:Number(d)}); fd += DIG[Number(d)]; n = p - d*den; k++; }
    return {digits, frac:fd, divs, muls, exact: n === 0n};
  }
  return {parse, varsOf, evalAst, table, fromMinterms, primes, minimize, termStr, covers, kmapLayout, groupRects, parseBase, toBase, pop, DIG};
})();

(() => {
  'use strict';
  const LG = window.LG, PL = window.PLOT, $ = id => document.getElementById(id);
  const BLUE = '#8AB4F0', TEAL = '#7CC6BE', SAND = '#E2B86F', SAGE = '#8FC79A', LILAC = '#B6A2DE', RED = '#E07A6E', TEXT = '#D5DCE4';
  const GC = [BLUE, SAND, TEAL, LILAC, SAGE, RED, '#EBD3A2', '#A9D2CE'];
  let needs = true;
  const canvas = $('lgCanvas'), ctx = PL.fit(canvas, () => { needs = true; }), inp = $('lgExpr');
  let F = null, sel = -1, cellBoxes = [];
  function load(src){
    try {
      const mt = LG.fromMinterms(src);
      if (mt) F = {...mt, src};
      else { const ast = LG.parse(src), vars = [...LG.varsOf(ast)].sort(); if (vars.length > 6) throw new Error('Use at most 6 inputs.'); if (!vars.length) throw new Error('Use at least one input letter.'); F = {vars, t:LG.table(ast, vars), src}; }
      F.min = LG.minimize(F.vars, F.t); $('lgErr').textContent = ''; render();
    } catch (e){ $('lgErr').textContent = e.message; }
    needs = true;
  }
  function render(){
    const {vars, t, min} = F, n = vars.length;
    $('lgRead').innerHTML = `minimal SOP: <b>${min.sop}</b><br>minimal POS: <b>${min.pos}</b><br><span class="c">Σm(${min.ones.join(', ') || '—'})${min.dcs.length ? ` + d(${min.dcs.join(', ')})` : ''}</span>`;
    const head = vars.map(v => `<th>${v}</th>`).join('') + '<th>F</th>';
    $('lgTable').innerHTML = `<table class="tt"><thead><tr><th>#</th>${head}</tr></thead><tbody>${t.map((f, r) => `<tr data-r="${r}"${r === sel ? ' class="on"' : ''}><td>${r}</td>${vars.map((_, k) => `<td>${(r >> (n - 1 - k)) & 1}</td>`).join('')}<td class="f">${f === 2 ? 'X' : f}</td></tr>`).join('')}</tbody></table>`;
    $('lgTable').querySelectorAll('tr[data-r]').forEach(tr => tr.addEventListener('click', () => { sel = +tr.dataset.r === sel ? -1 : +tr.dataset.r; render(); needs = true; }));
  }
  function drawKmap(x0, y0, w, h){
    const {vars, t, min} = F, n = vars.length; cellBoxes = [];
    if (n < 2 || n > 4){ PL.label(ctx, x0 + w/2, y0 + h/2, n > 4 ? 'K-maps are drawn for 2 to 4 inputs' : 'Add a second input for a K-map', {color:TEXT, align:'center', size:13}); return; }
    const L = LG.kmapLayout(n), nr = L.rows.length, nc = L.cols.length, cs = Math.min((w - 70)/nc, (h - 90)/nr, 78), gx = x0 + (w - cs*nc)/2 + 20, gy = y0 + 56;
    const rv = vars.slice(0, L.rb).join(''), cv = vars.slice(L.rb).join(''), bits = (v, nb) => v.toString(2).padStart(nb, '0');
    PL.label(ctx, gx - 10, gy - 30, `${rv || ''}\\${cv}`, {color:TEXT, size:12.5, align:'right'});
    L.cols.forEach((c, j) => PL.label(ctx, gx + (j + .5)*cs, gy - 10, bits(c, L.cb), {color:TEXT, align:'center', size:12.5}));
    L.rows.forEach((r, i) => PL.label(ctx, gx - 10, gy + (i + .5)*cs + 4, L.rb ? bits(r, L.rb) : '', {color:TEXT, align:'right', size:12.5}));
    for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++){
      const m = L.cell(i, j), x = gx + j*cs, y = gy + i*cs, v = t[m];
      ctx.save(); ctx.fillStyle = m === sel ? 'rgba(226,184,111,.18)' : 'rgba(255,255,255,.02)'; ctx.fillRect(x, y, cs, cs); ctx.strokeStyle = 'rgba(213,220,228,.25)'; ctx.strokeRect(x + .5, y + .5, cs, cs); ctx.restore();
      PL.label(ctx, x + cs/2, y + cs/2 + 7, v === 2 ? 'X' : String(v), {color: v === 1 ? '#fff' : v === 2 ? LILAC : 'rgba(213,220,228,.4)', align:'center', size:20});
      PL.label(ctx, x + 5, y + 13, String(m), {color:'rgba(213,220,228,.4)', size:10});
      cellBoxes.push({x, y, s:cs, m});
    }
    min.S.cover.forEach((p, k) => {
      const col = GC[k % GC.length], inset = 4 + 3*(k % 4);
      LG.groupRects(p, n).forEach(g => { ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 2.4; ctx.beginPath(); const x = gx + g.c0*cs + inset, y = gy + g.r0*cs + inset, ww = (g.c1 - g.c0 + 1)*cs - 2*inset, hh = (g.r1 - g.r0 + 1)*cs - 2*inset; if (ctx.roundRect) ctx.roundRect(x, y, ww, hh, 10); else ctx.rect(x, y, ww, hh); ctx.stroke(); ctx.restore(); });
    });
    PL.label(ctx, x0 + w/2, gy + nr*cs + 32, 'Click a cell to cycle 0 → 1 → X', {color:'rgba(213,220,228,.55)', align:'center', size:12});
    let ty = gy + nr*cs + 58; min.S.cover.forEach((p, k) => { PL.label(ctx, x0 + 24 + (k % 3)*(w/3), ty + Math.floor(k/3)*20, LG.termStr(p, vars), {color:GC[k % GC.length], size:13.5}); });
  }
  // two-level AND–OR circuit for the minimal SOP, wires lit for the selected row
  function drawCircuit(x0, y0, w, h){
    const {vars, min} = F, n = vars.length, terms = min.S.cover, row = sel, val = v => row < 0 ? null : (row >> (n - 1 - vars.indexOf(v))) & 1;
    PL.label(ctx, x0 + 8, y0 + 20, row < 0 ? 'Circuit for the minimal SOP (pick a row in the truth table to light it up)' : `Circuit with inputs from row ${row}`, {color:TEXT, size:12.5});
    if (!terms.length || min.sop === '1' || min.sop === '0'){ PL.label(ctx, x0 + w/2, y0 + h/2, `F = ${min.sop} (no gates needed)`, {color:'#fff', align:'center', size:15}); return; }
    const railX = (k, c) => x0 + 20 + k*Math.min(46, (w*.42)/n) + (c ? Math.min(18, w*.02 + 8) : 0), top = y0 + 64, bot = y0 + h - 20;
    const on = '#E2B86F', off = 'rgba(213,220,228,.35)', wc = b => b === null ? 'rgba(213,220,228,.6)' : b ? on : off;
    vars.forEach((v, k) => {
      const b = val(v), xt = railX(k, 0), xc = railX(k, 1);
      PL.label(ctx, xt, top - 22, v, {color:'#fff', align:'center', size:14});
      ctx.save(); ctx.lineWidth = 2; ctx.strokeStyle = wc(b); ctx.beginPath(); ctx.moveTo(xt, top - 14); ctx.lineTo(xt, bot); ctx.moveTo(xt, top - 6); ctx.lineTo(xc, top - 6); ctx.stroke();
      ctx.strokeStyle = wc(b === null ? null : 1 - b); ctx.beginPath(); ctx.moveTo(xc, top + 6); ctx.lineTo(xc, bot); ctx.stroke();
      ctx.fillStyle = '#10151B'; ctx.strokeStyle = wc(b === null ? null : 1 - b); ctx.beginPath(); ctx.arc(xc, top + 2, 4, 0, 2*Math.PI); ctx.fill(); ctx.stroke(); ctx.restore();
      PL.label(ctx, xc + 2, top - 10, "'", {color:TEXT, size:12});
    });
    const gx = railX(n - 1, 1) + 46, gw = 44, gap = (bot - top)/terms.length, orx = Math.min(x0 + w - 150, gx + gw + 90), ory = (top + bot)/2;
    const termVal = p => row < 0 ? null : (LG.covers(p, row) ? 1 : 0), outV = row < 0 ? null : (F.t[row] === 1 ? 1 : F.t[row] === 0 ? 0 : (terms.some(p => LG.covers(p, row)) ? 1 : 0));
    terms.forEach((p, k) => {
      const cy = top + (k + .5)*gap, gh = Math.min(34, gap*0.8), litsL = [];
      vars.forEach((v, j) => { const bit = 1 << (n - 1 - j); if (!(p.m & bit)) litsL.push({x:railX(j, !(p.v & bit) ? 1 : 0), b: val(v) === null ? null : ((p.v & bit) ? val(v) : 1 - val(v))}); });
      const tv = termVal(p);
      if (litsL.length === 1){ ctx.save(); ctx.strokeStyle = wc(litsL[0].b); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(litsL[0].x, cy); ctx.lineTo(gx + gw, cy); ctx.stroke(); ctx.fillStyle = wc(litsL[0].b); ctx.beginPath(); ctx.arc(litsL[0].x, cy, 3, 0, 2*Math.PI); ctx.fill(); ctx.restore(); }
      else {
        litsL.forEach((l, i) => { const y = cy - gh/2 + (i + 1)*gh/(litsL.length + 1); ctx.save(); ctx.strokeStyle = wc(l.b); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(l.x, y); ctx.lineTo(gx, y); ctx.stroke(); ctx.fillStyle = wc(l.b); ctx.beginPath(); ctx.arc(l.x, y, 3, 0, 2*Math.PI); ctx.fill(); ctx.restore(); });
        ctx.save(); ctx.strokeStyle = wc(tv); ctx.fillStyle = '#151C24'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(gx, cy - gh/2); ctx.lineTo(gx + gw/2, cy - gh/2); ctx.arc(gx + gw/2, cy, gh/2, -Math.PI/2, Math.PI/2); ctx.lineTo(gx, cy + gh/2); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
      }
      const ox = litsL.length === 1 ? gx + gw : gx + gw/2 + gh/2, iny = terms.length === 1 ? ory : ory - 16 + 32*(k + .5)/terms.length;
      ctx.save(); ctx.strokeStyle = wc(tv); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ox, cy); ctx.lineTo((ox + orx)/2, cy); ctx.lineTo((ox + orx)/2, iny); ctx.lineTo(orx + (terms.length === 1 ? 0 : 6), iny); ctx.stroke(); ctx.restore();
      PL.label(ctx, gx + gw/2 - 2, cy - gh/2 - 5, LG.termStr(p, vars), {color:GC[k % GC.length], align:'center', size:11.5});
    });
    let outX = orx;
    if (terms.length > 1){
      const oh = 40; ctx.save(); ctx.strokeStyle = wc(outV); ctx.fillStyle = '#151C24'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(orx - 4, ory - oh/2); ctx.quadraticCurveTo(orx + 30, ory - oh/2, orx + 52, ory); ctx.quadraticCurveTo(orx + 30, ory + oh/2, orx - 4, ory + oh/2); ctx.quadraticCurveTo(orx + 12, ory, orx - 4, ory - oh/2); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
      outX = orx + 52;
    }
    ctx.save(); ctx.strokeStyle = wc(outV); ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(outX, ory); ctx.lineTo(outX + 30, ory); ctx.stroke(); ctx.restore();
    PL.label(ctx, outX + 36, ory + 5, `F${outV === null ? '' : ' = ' + outV}`, {color: outV ? on : '#fff', size:15});
  }
  function draw(){
    const W = canvas._w, H = canvas._h; ctx.clearRect(0, 0, W, H); if (!F) return;
    const narrow = W < 640;
    if (narrow){ drawKmap(0, 0, W, H*0.55); drawCircuit(0, H*0.55, W, H*0.45); }
    else { drawKmap(0, 0, W*0.42, H); ctx.save(); ctx.strokeStyle = 'rgba(213,220,228,.12)'; ctx.beginPath(); ctx.moveTo(W*0.42, 20); ctx.lineTo(W*0.42, H - 20); ctx.stroke(); ctx.restore(); drawCircuit(W*0.43, 0, W*0.57, H); }
  }
  canvas.addEventListener('click', e => {
    const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, c = cellBoxes.find(b => x >= b.x && x <= b.x + b.s && y >= b.y && y <= b.y + b.s);
    if (!c || !F) return;
    F.t[c.m] = (F.t[c.m] + 1) % 3; F.min = LG.minimize(F.vars, F.t);
    const ones = F.t.map((v, i) => v === 1 ? i : -1).filter(i => i >= 0), dc = F.t.map((v, i) => v === 2 ? i : -1).filter(i => i >= 0);
    inp.value = `m(${ones.join(',')})${dc.length ? ` d(${dc.join(',')})` : ''} vars=${F.vars.length}`; F.src = inp.value; render(); needs = true;
  });
  inp.addEventListener('input', () => load(inp.value));
  document.querySelectorAll('[data-ex]').forEach(b => b.addEventListener('click', () => { inp.value = b.dataset.ex; sel = -1; load(inp.value); }));
  inp.value = "A'B'C + A'BC + AB'C + ABC' + ABC"; load(inp.value);
  function loop(){ if (needs){ needs = false; draw(); } requestAnimationFrame(loop); }
  const rm = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  $('hPlay') && $('hPlay').addEventListener('click', () => $('play').scrollIntoView({behavior: rm ? 'auto' : 'smooth'}));
  window.__lg = {get F(){ return F; }, load};
  requestAnimationFrame(loop);
})();

// ---------------- step-by-step questions ----------------
window.FORMULA_PAGE = (G) => {
  'use strict';
  const LG = window.LG, MX = window.MX;
  const BLUE = '#8AB4F0', TEAL = '#7CC6BE', SAND = '#E2B86F', SAGE = '#8FC79A', LILAC = '#B6A2DE', RED = '#E07A6E', TEXT = '#D5DCE4';
  const GC = [BLUE, SAND, TEAL, LILAC, SAGE, RED, '#EBD3A2', '#A9D2CE'];
  const cardsHTML = cards => `<div class="answer">${cards.filter(Boolean).map(c => `<div class="ans ${c.tone || 'y'}"><div class="k">${c.k}</div><div class="v">${c.v}</div><div class="s">${c.s || ''}</div></div>`).join('')}</div>`;
  const MODE_OF = m => MODES.find(x => x.id === m.id);
  const answerStep = () => ({ dur:1600, show:[], info: m => ({ title:'Answer', body: cardsHTML(MODE_OF(m).answer(m)) + (MODE_OF(m).note && MODE_OF(m).note(m) ? `<p>${MODE_OF(m).note(m)}</p>` : ''), work:'' }) });
  const GLYPH = {
    kmap:'<rect x="4" y="4" width="24" height="24" rx="2"/><path d="M10 4 V28 M16 4 V28 M22 4 V28 M4 10 H28 M4 16 H28 M4 22 H28"/><rect x="9" y="9" width="14" height="8" rx="3" stroke-width="2.4"/>',
    canon:'<path d="M5 5 H27 V27 H5 Z M5 11 H27 M14 5 V27 M21 5 V27"/>',
    conv:'<path d="M4 10 H20 M16 6 L20 10 L16 14 M28 22 H12 M16 18 L12 22 L16 26"/>',
    twos:'<path d="M4 16 H12 M8 12 V20 M16 9 H28 M16 16 H28 M16 23 H28"/>',
    ff:'<rect x="9" y="5" width="14" height="22" rx="2"/><path d="M3 10 H9 M3 22 H9 M23 10 H29 M9 19 L13 22 L9 25"/>'
  };
  const glyph = k => `<svg viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${GLYPH[k]}</svg>`;
  const list = (s, what) => { if (!s || !s.trim()) return []; return s.split(/[,\s]+/).filter(Boolean).map(x => { const k = +x; if (!Number.isInteger(k) || k < 0) throw new Error(`"${x}" in the ${what} is not a whole number.`); return k; }); };
  function drawKmapScene(m, S, showGroups, showVals, hi){
    const n = m.vars.length, L = LG.kmapLayout(n), nr = L.rows.length, nc = L.cols.length, cs = Math.min((S.W*0.62 - 80)/nc, (S.H - 120)/nr, 90), gx = 70, gy = 70;
    const bits = (v, nb) => v.toString(2).padStart(nb, '0');
    G.text(`${m.vars.slice(0, L.rb).join('')}\\${m.vars.slice(L.rb).join('')}`, gx - 10, gy - 30, {align:'right', color:TEXT, size:13});
    L.cols.forEach((c, j) => G.text(bits(c, L.cb), gx + (j + .5)*cs, gy - 10, {align:'center', color:TEXT, size:13}));
    L.rows.forEach((r, i) => G.text(L.rb ? bits(r, L.rb) : '', gx - 10, gy + (i + .5)*cs + 4, {align:'right', color:TEXT, size:13}));
    const ctx = G.ctx();
    for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++){
      const mm = L.cell(i, j), x = gx + j*cs, y = gy + i*cs, v = m.t[mm];
      ctx.save(); ctx.strokeStyle = 'rgba(213,220,228,.25)'; ctx.strokeRect(x + .5, y + .5, cs, cs); ctx.restore();
      G.text(v === 2 ? 'X' : String(v), x + cs/2, y + cs/2 + 8, {align:'center', size:22, color: v === 1 ? '#fff' : v === 2 ? LILAC : 'rgba(213,220,228,.35)', a:showVals});
      G.text(String(mm), x + 6, y + 15, {size:10.5, color:'rgba(213,220,228,.4)', weight:500});
    }
    showGroups.forEach(({p, k, a}) => {
      if (a <= 0) return; const col = GC[k % GC.length], inset = 5 + 3*(k % 4);
      LG.groupRects(p, n).forEach(g => { ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = hi === p ? 3.6 : 2.6; ctx.beginPath(); const x = gx + g.c0*cs + inset, y = gy + g.r0*cs + inset, w = (g.c1 - g.c0 + 1)*cs - 2*inset, h = (g.r1 - g.r0 + 1)*cs - 2*inset; if (ctx.roundRect) ctx.roundRect(x, y, w, h, 12); else ctx.rect(x, y, w, h); ctx.stroke(); ctx.restore(); });
    });
    return {x:gx + nc*cs + 40, y:gy};
  }
  function bitsOf(x, n){ return x.toString(2).padStart(n, '0'); }

  const MODES = [
    { id:'kmap', title:'K-map minimisation', desc:'Minterms and don’t-cares to the minimal SOP and POS', glyph:glyph('kmap'),
      fields:['nv', 'mins', 'dcs'], defaults:{nv:'4', mins:'0, 2, 5, 7, 8, 10, 13, 15', dcs:'6, 9'},
      compute: v => {
        const n = Math.round(v.nv); if (!(n >= 2 && n <= 4)) throw new Error('K-maps here use 2, 3 or 4 variables.');
        const mins = list(v.mins, 'minterms'), dcs = list(v.dcs, "don't-cares"), N = 1 << n;
        [...mins, ...dcs].forEach(k => { if (k >= N) throw new Error(`${k} is too big for ${n} variables (0 to ${N - 1}).`); });
        dcs.forEach(k => { if (mins.includes(k)) throw new Error(`${k} is both a minterm and a don't-care.`); });
        const vars = 'ABCD'.slice(0, n).split(''), t = new Array(N).fill(0); mins.forEach(k => { t[k] = 1; }); dcs.forEach(k => { t[k] = 2; });
        const min = LG.minimize(vars, t);
        return {id:'kmap', n, vars, t, mins:[...new Set(mins)].sort((a, b) => a - b), dcs:[...new Set(dcs)].sort((a, b) => a - b), min};
      },
      problem: m => ({ chips:[`F(${m.vars.join(', ')}) = Σm(${m.mins.join(', ') || '—'})`].concat(m.dcs.length ? [`d(${m.dcs.join(', ')})`] : []) }),
      steps: () => [
        { dur:2400, show:['vals'], info: m => ({ title:'Fill the K-map', body:'<p>Rows and columns follow Gray code (00, 01, 11, 10) so neighbouring cells differ in one variable, including across the edges. Put 1 in each minterm and X in each don’t-care.</p>', work:`${m.mins.length} ones, ${m.dcs.length} don’t-cares, ${m.min.zeros.length} zeros` }) },
        { dur:3200, show:['pis'], info: m => ({ title:'Prime implicants', body:'<p>Circle every largest possible group of 1, 2, 4 or 8 cells (Xs may be used). Each such group is a prime implicant.</p>', work: m.min.S.pis.length ? m.min.S.pis.map(p => `${LG.termStr(p, m.vars)} covers ${[...Array(1 << m.n).keys()].filter(x => LG.covers(p, x)).join(', ')}`).join('<br>') : 'none: the function is 0' }), rd: m => ['Prime implicants', m.min.S.pis.map(p => LG.termStr(p, m.vars)).join(', ') || 'none'] },
        { dur:2800, show:['ess'], info: m => ({ title:'Essential prime implicants', body:'<p>A prime implicant is essential if it is the only one covering some 1. Those must be in the answer.</p>', work: m.min.S.ess.length ? m.min.S.ess.map(p => `<b>${LG.termStr(p, m.vars)}</b>`).join(', ') : 'none' }), rd: m => ['Essential', m.min.S.ess.map(p => LG.termStr(p, m.vars)).join(', ') || 'none'] },
        { dur:2800, show:['cover'], info: m => ({ title:'Cover the rest', body: m.min.S.extra.length ? '<p>Add the fewest extra prime implicants (with the fewest literals) that cover the remaining 1s.</p>' : '<p>The essential prime implicants already cover every 1.</p>', work:`F = <b>${m.min.sop}</b><br><span class="c">${m.min.cost[0]} terms, ${m.min.cost[1]} literals</span>` }), rd: m => ['Minimal SOP', m.min.sop] },
        { dur:2400, show:[], info: m => ({ title:'Minimal POS', body:'<p>Group the 0s instead (Xs still allowed) to get F′, then apply De Morgan’s law to get a product of sums.</p>', work:`F = <b>${m.min.pos}</b>` }), rd: m => ['Minimal POS', m.min.pos] },
        answerStep()],
      answer: m => [{tone:'y', k:'Minimal SOP', v:m.min.sop, s:`${m.min.cost[0]} terms, ${m.min.cost[1]} literals`}, {tone:'s1', k:'Minimal POS', v:m.min.pos, s:''}],
      note: m => m.min.S.pis.length > m.min.S.cover.length ? 'Some prime implicants are left out because the others already cover their 1s.' : '',
      scene: (m, S) => {
        const vp = S.vis('pis'), ve = S.vis('ess'), vc = S.vis('cover');
        const groups = m.min.S.pis.map((p, k) => { const inCover = m.min.S.cover.includes(p), isEss = m.min.S.ess.includes(p); return {p, k, a: vc > 0 ? (inCover ? 1 : 1 - .75*vc) : ve > 0 ? (isEss ? 1 : 1 - .5*ve) : vp}; });
        const pos = drawKmapScene(m, S, groups, S.vis('vals'));
        let y = pos.y; G.text('Groups', pos.x, y, {size:13, weight:600, a:vp});
        m.min.S.pis.forEach((p, k) => { const inCover = m.min.S.cover.includes(p), isEss = m.min.S.ess.includes(p); y += 24; G.text(`${LG.termStr(p, m.vars)}${isEss ? '  essential' : ''}`, pos.x, y, {color:GC[k % GC.length], size:14, a: vp*(vc > 0 && !inCover ? .35 : 1), mono:true}); });
        if (vc > 0){ G.text('F =', pos.x, y + 44, {size:15, weight:600, a:vc}); G.text(m.min.sop, pos.x, y + 68, {size:15, mono:true, a:vc, color:'#fff'}); }
      } },

    { id:'canon', title:'Truth table and canonical forms', desc:'Any expression to its truth table, Σm, ΠM, canonical SOP and POS', glyph:glyph('canon'),
      fields:['expr'], defaults:{expr:"A'B + BC' + AC"},
      compute: v => {
        const mt = LG.fromMinterms(v.expr || ''); let vars, t;
        if (mt){ vars = mt.vars; t = mt.t.map(x => x === 2 ? 0 : x); }
        else { const ast = LG.parse(v.expr), vs = [...LG.varsOf(ast)].sort(); if (!vs.length) throw new Error('Use at least one input letter.'); if (vs.length > 5) throw new Error('Use at most 5 inputs here so the table fits.'); vars = vs; t = LG.table(ast, vars); }
        const n = vars.length, ones = t.map((f, i) => f ? i : -1).filter(i => i >= 0), zeros = t.map((f, i) => f ? -1 : i).filter(i => i >= 0);
        const minterm = i => vars.map((x, k) => ((i >> (n - 1 - k)) & 1) ? x : x + "'").join(''), maxterm = i => '(' + vars.map((x, k) => ((i >> (n - 1 - k)) & 1) ? x + "'" : x).join(' + ') + ')';
        return {id:'canon', expr:v.expr, vars, t, n, ones, zeros, cSOP: ones.map(minterm).join(' + ') || '0', cPOS: zeros.map(maxterm).join('') || '1', min:LG.minimize(vars, t)};
      },
      problem: m => ({ chips:[`F = ${m.expr}`] }),
      steps: () => [
        { dur:2800, show:['tt'], info: m => ({ title:'Truth table', body:`<p>List all ${1 << m.n} input combinations in binary order and evaluate F for each.</p>`, work:`${m.n} inputs: ${m.vars.join(', ')}` }) },
        { dur:2400, show:['ones'], info: m => ({ title:'Minterms (rows where F = 1)', body:'<p>Each 1 row gives a product term containing every variable once.</p>', work:`F = Σm(${m.ones.join(', ') || '—'})<br>= ${m.cSOP}` }), rd: m => ['Σm', m.ones.join(', ') || 'none'] },
        { dur:2400, show:['zeros'], info: m => ({ title:'Maxterms (rows where F = 0)', body:'<p>Each 0 row gives a sum term that is 0 only on that row.</p>', work:`F = ΠM(${m.zeros.join(', ') || '—'})<br>= ${m.cPOS}` }), rd: m => ['ΠM', m.zeros.join(', ') || 'none'] },
        { dur:2000, show:[], info: m => ({ title:'Simplest form', body:'<p>The canonical forms are long; minimising gives the same function with fewer gates.</p>', work:`minimal SOP: <b>${m.min.sop}</b><br>minimal POS: <b>${m.min.pos}</b>` }), rd: m => ['Minimal SOP', m.min.sop] },
        answerStep()],
      answer: m => [{tone:'y', k:'Σm', v:`(${m.ones.join(', ') || '—'})`, s:`ΠM(${m.zeros.join(', ') || '—'})`}, {tone:'s1', k:'Minimal SOP', v:m.min.sop, s:`POS: ${m.min.pos}`}],
      scene: (m, S) => {
        const rows = 1 << m.n, rh = Math.min(30, (S.H - 70)/rows), cw = Math.min(56, (S.W - 80)/(m.n + 2)), x0 = Math.max(30, (S.W - cw*(m.n + 2))/2), y0 = 40, vt = S.vis('tt'), vo = S.vis('ones'), vz = S.vis('zeros'), ctx = G.ctx();
        ['#'].concat(m.vars, ['F']).forEach((h, j) => G.text(h, x0 + (j + .5)*cw, y0, {align:'center', size:14, color: j === m.n + 1 ? SAND : TEXT, a:vt}));
        for (let r = 0; r < rows; r++){
          const y = y0 + 12 + r*rh, f = m.t[r], shown = Math.min(1, Math.max(0, vt*rows - r));
          if (shown <= 0) continue;
          if (f && vo > 0){ ctx.save(); ctx.globalAlpha = .16*vo; ctx.fillStyle = SAGE; ctx.fillRect(x0, y, cw*(m.n + 2), rh - 2); ctx.restore(); }
          if (!f && vz > 0){ ctx.save(); ctx.globalAlpha = .12*vz; ctx.fillStyle = RED; ctx.fillRect(x0, y, cw*(m.n + 2), rh - 2); ctx.restore(); }
          G.text(String(r), x0 + cw/2, y + rh*.68, {align:'center', size:Math.min(14, rh*.55), color:'rgba(213,220,228,.5)', a:shown});
          m.vars.forEach((_, k) => G.text(String((r >> (m.n - 1 - k)) & 1), x0 + (k + 1.5)*cw, y + rh*.68, {align:'center', size:Math.min(15, rh*.6), a:shown, mono:true}));
          G.text(String(f), x0 + (m.n + 1.5)*cw, y + rh*.68, {align:'center', size:Math.min(15, rh*.6), color: f ? '#fff' : 'rgba(213,220,228,.45)', a:shown, mono:true, weight:700});
        }
      } },

    { id:'convert', title:'Number base conversion', desc:'Binary, octal, decimal and hex, including fractions', glyph:glyph('conv'),
      fields:['num', 'from', 'to'], defaults:{num:'156.625', from:'10', to:'2'},
      compute: v => {
        const fb = +v.from, tb = +v.to, p = LG.parseBase(v.num, fb), r = LG.toBase(p.I, p.num, p.den, tb);
        const out = (p.neg ? '−' : '') + r.digits + (r.frac ? '.' + r.frac : '');
        // the value in decimal, shown as positional weights when the input is not decimal
        const weights = fb === 10 ? null : [...p.ip].map((ch, k) => `${LG.DIG.indexOf(ch)}×${fb}${String(p.ip.length - 1 - k).split('').map(c => '⁰¹²³⁴⁵⁶⁷⁸⁹'[c]).join('')}`).concat([...p.fp].map((ch, k) => `${LG.DIG.indexOf(ch)}×${fb}⁻${String(k + 1).split('').map(c => '⁰¹²³⁴⁵⁶⁷⁸⁹'[c]).join('')}`));
        const dec = Number(p.I) + Number(p.num)/Number(p.den);
        return {id:'convert', num:v.num.trim().toUpperCase(), fb, tb, p, r, out, weights, dec, neg:p.neg};
      },
      problem: m => ({ chips:[`${m.num} in base ${m.fb}`, `to base ${m.tb}`] }),
      steps: () => [
        { dur:2400, show:[], info: m => ({ title:'Value of the number', body: m.fb === 10 ? '<p>The number is already in decimal.</p>' : '<p>Each digit is worth its value times a power of the base.</p>', work: m.fb === 10 ? `${m.num}` : `${m.weights.slice(0, 12).join(' + ')}${m.weights.length > 12 ? ' + …' : ''}<br>= <b>${(m.neg ? '−' : '') + MX.fmt(m.dec, 12)}</b>` }), rd: m => ['Decimal value', (m.neg ? '−' : '') + MX.fmt(m.dec, 12)] },
        { dur:3200, show:['div'], info: m => ({ title:'Integer part: divide repeatedly', body:`<p>Divide by ${m.tb} and keep the remainders; read them from the bottom up.</p>`, work: m.r.divs.length ? m.r.divs.slice(0, 14).map(d => `${d.q} ÷ ${m.tb} = ${d.nq} remainder <b>${LG.DIG[d.r]}</b>`).join('<br>') + (m.r.divs.length > 14 ? '<br>…' : '') : 'integer part is 0' }), rd: m => ['Integer part', m.r.digits] },
        { dur:3000, show:['mul'], info: m => ({ title:'Fraction part: multiply repeatedly', body: m.r.muls.length ? `<p>Multiply the fraction by ${m.tb}; the whole-number part is the next digit, read from the top down.</p>` : '<p>There is no fraction part.</p>', work: m.r.muls.slice(0, 12).map(s => `${MX.fmt(Number(s.n)/Number(s.den), 8)} × ${m.tb} = ${MX.fmt(Number(s.n)*m.tb/Number(s.den), 8)} → <b>${LG.DIG[s.d]}</b>`).join('<br>') + (m.r.muls.length && !m.r.exact ? '<br><span class="c">stopped after 12 digits; the expansion keeps going</span>' : '') }), rd: m => ['Fraction part', m.r.frac || '—'] },
        answerStep()],
      answer: m => [{tone:'y', k:`In base ${m.tb}`, v:m.out + (m.r.exact ? '' : '…'), s:`${m.num} in base ${m.fb}`}],
      scene: (m, S) => {
        // the division ladder on the left and the multiplication ladder on the right
        const vd = S.vis('div'), vm = S.vis('mul'), lh = Math.min(30, (S.H - 110)/Math.max(8, m.r.divs.length + 1, m.r.muls.length + 1));
        G.text(`${m.num}₍${m.fb}₎ → base ${m.tb}`, S.W/2, 34, {align:'center', size:16, weight:600});
        const xL = S.W*0.08; let y = 76;
        G.text('integer part', xL, y - 8, {size:12.5, color:TEXT, a:vd});
        m.r.divs.slice(0, 16).forEach((d, k) => { const a = Math.min(1, Math.max(0, vd*m.r.divs.length - k)); y = 76 + (k + 1)*lh; G.text(`${m.tb} ) ${d.q}`, xL, y, {mono:true, size:14, a}); G.text(`r ${LG.DIG[d.r]}`, xL + Math.max(150, 12*String(d.q).length + 60), y, {mono:true, size:14, color:SAND, a}); });
        if (vd > .9 && m.r.divs.length){ const xa = xL + Math.max(150, 12*String(m.r.divs[0].q).length + 60) + 50; G.arrow(xa, 76 + Math.min(16, m.r.divs.length)*lh, xa, 76 + lh - 10, SAND, 2, {a:vd}); G.text('read up', xa + 8, 76 + lh*Math.min(16, m.r.divs.length)/2, {color:SAND, size:12, a:vd}); }
        const xR = S.W*0.56; G.text('fraction part', xR, 68, {size:12.5, color:TEXT, a:vm});
        m.r.muls.slice(0, 14).forEach((s, k) => { const a = Math.min(1, Math.max(0, vm*m.r.muls.length - k)), yy = 76 + (k + 1)*lh; G.text(`${MX.fmt(Number(s.n)/Number(s.den), 6)} × ${m.tb}`, xR, yy, {mono:true, size:14, a}); G.text(`→ ${LG.DIG[s.d]}`, xR + 170, yy, {mono:true, size:14, color:TEAL, a}); });
        G.text(`= ${m.out}${m.r.exact ? '' : '…'}`, S.W/2, S.H - 22, {align:'center', size:18, mono:true, color:'#fff', a:Math.max(vd, 0)*(m.r.muls.length ? vm : 1)});
      } },

    { id:'twos', title:'Two’s complement', desc:'Signed integers in n bits: invert and add one, range and hex', glyph:glyph('twos'),
      fields:['dec', 'bits'], defaults:{dec:'-45', bits:'8'},
      compute: v => {
        const n = Math.round(v.bits); if (!(n >= 2 && n <= 32)) throw new Error('Use between 2 and 32 bits.');
        const x = v.dec; if (!Number.isInteger(x)) throw new Error('Type a whole number (it can be negative).');
        const lo = -(2**(n - 1)), hi = 2**(n - 1) - 1; if (x < lo || x > hi) throw new Error(`${n} bits hold ${String(lo).replace('-', '−')} to ${hi}; ${String(x).replace('-', '−')} does not fit.`);
        const mag = Math.abs(x), magB = bitsOf(mag, n), inv = magB.split('').map(b => b === '1' ? '0' : '1').join(''), code = x >= 0 ? magB : bitsOf((2**n + x) % 2**n, n);
        const hex = parseInt(code, 2).toString(16).toUpperCase().padStart(Math.ceil(n/4), '0');
        return {id:'twos', x, n, lo, hi, mag, magB, inv, code, hex};
      },
      problem: m => ({ chips:[`${m.x}`, `${m.n} bits`] }),
      steps: () => [
        { dur:2200, show:['mag'], info: m => ({ title:'Range and magnitude', body:`<p>${m.n}-bit two’s complement holds ${m.lo} to ${m.hi}. Start from the binary of |${m.x}|.</p>`, work:`|${m.x}| = ${m.mag} = <b>${m.magB}</b>` }), rd: m => ['Range', `${m.lo} to ${m.hi}`] },
        { dur:2600, show:['inv'], info: m => ({ title: m.x < 0 ? 'Invert every bit' : 'Positive: nothing to do', body: m.x < 0 ? '<p>Flipping every bit gives the one’s complement.</p>' : '<p>A positive number is stored as plain binary with a leading 0.</p>', work: m.x < 0 ? `${m.magB} → <b>${m.inv}</b>` : `${m.magB}` }) },
        { dur:2600, show:['add'], info: m => ({ title: m.x < 0 ? 'Add one' : 'Result', body: m.x < 0 ? '<p>Adding 1 to the one’s complement gives the two’s complement. The leading 1 marks a negative number.</p>' : '<p>The sign bit is 0.</p>', work:`<b>${m.code}</b><br>hex ${m.hex}<br><span class="c">check: −${m.code[0]}×2${String(m.n - 1).split('').map(c => '⁰¹²³⁴⁵⁶⁷⁸⁹'[c]).join('')} + rest = ${m.x}</span>` }), rd: m => [['Two’s complement', m.code], ['Hex', m.hex]] },
        answerStep()],
      answer: m => [{tone:'y', k:`${m.x} in ${m.n} bits`, v:m.code, s:`hex ${m.hex}`}],
      scene: (m, S) => {
        const bw = Math.min(46, (S.W - 120)/m.n), x0 = (S.W - bw*m.n)/2, rows = [['|x|', m.magB, 'mag', TEXT], [m.x < 0 ? 'invert' : '', m.x < 0 ? m.inv : '', 'inv', LILAC], [m.x < 0 ? '+1 →' : 'result', m.code, 'add', SAND]], ctx = G.ctx();
        rows.forEach(([lab, b, key, col], r) => {
          const a = S.vis(key), y = 90 + r*90; if (!b || a <= 0) return;
          G.text(lab, x0 - 16, y + bw*.62, {align:'right', size:14, color:col, a});
          [...b].forEach((ch, k) => { const x = x0 + k*bw; ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = 'rgba(213,220,228,.3)'; ctx.strokeRect(x + 2, y, bw - 4, bw - 4); if (key === 'add' && k === 0){ ctx.fillStyle = 'rgba(224,122,110,.18)'; ctx.fillRect(x + 2, y, bw - 4, bw - 4); } ctx.restore(); G.text(ch, x + bw/2, y + bw*.62, {align:'center', size:Math.min(22, bw*.5), mono:true, color: ch === '1' ? '#fff' : 'rgba(213,220,228,.45)', a}); });
        });
        G.text('weights', x0 - 16, 60, {align:'right', size:11, color:'rgba(213,220,228,.45)'});
        for (let k = 0; k < m.n; k++) G.text(k === 0 ? `−2${String(m.n - 1).split('').map(c => '⁰¹²³⁴⁵⁶⁷⁸⁹'[c]).join('')}` : `2${String(m.n - 1 - k).split('').map(c => '⁰¹²³⁴⁵⁶⁷⁸⁹'[c]).join('')}`, x0 + (k + .5)*bw, 60, {align:'center', size:Math.min(11.5, bw*.3), color:'rgba(213,220,228,.5)'});
        if (S.vis('add') > .9) G.text(`hex ${m.hex}`, S.W/2, 90 + 3*90 + 10, {align:'center', size:17, mono:true, color:SAND});
      } },

    { id:'ff', title:'Flip-flop timing', desc:'D, T, JK or SR: next state at each clock edge and the timing diagram', glyph:glyph('ff'),
      fields:['fftype', 'q0', 'in1', 'in2'], defaults:{fftype:'jk', q0:'0', in1:'1 0 1 1 0 1', in2:'0 0 1 1 1 0'},
      compute: v => {
        const t = v.fftype, bits = (s, w) => { const b = (s || '').replace(/[^01]/g, ' ').trim().split(/\s+/).join('').split('').filter(c => c === '0' || c === '1').map(Number); if ((s || '').replace(/[\s,01]/g, '').length) throw new Error(`${w} should contain only 0s and 1s.`); return b; };
        const a = bits(v.in1, t === 'jk' ? 'J' : t === 'sr' ? 'S' : t === 'd' ? 'D' : 'T'), b = t === 'jk' || t === 'sr' ? bits(v.in2, t === 'jk' ? 'K' : 'R') : null;
        if (!a.length) throw new Error('Type the input values for each clock edge, for example 1 0 1 1.');
        if (a.length > 16) throw new Error('Use at most 16 clock edges.');
        if (b && b.length !== a.length) throw new Error(`Both inputs need the same number of values (${a.length} and ${b.length}).`);
        const q0 = Math.round(v.q0); if (q0 !== 0 && q0 !== 1) throw new Error('The starting Q must be 0 or 1.');
        let q = q0; const Q = [q], why = [];
        a.forEach((x, k) => {
          let nq, w;
          if (t === 'd'){ nq = x; w = `D = ${x} → Q = ${x}`; }
          else if (t === 't'){ nq = q === null ? null : (x ? 1 - q : q); w = x ? 'T = 1 → toggle' : 'T = 0 → hold'; }
          else if (t === 'jk'){ const y = b[k]; if (!x && !y){ nq = q; w = 'J K = 00 → hold'; } else if (!x && y){ nq = 0; w = 'J K = 01 → reset'; } else if (x && !y){ nq = 1; w = 'J K = 10 → set'; } else { nq = q === null ? null : 1 - q; w = 'J K = 11 → toggle'; } }
          else { const y = b[k]; if (!x && !y){ nq = q; w = 'S R = 00 → hold'; } else if (!x && y){ nq = 0; w = 'S R = 01 → reset'; } else if (x && !y){ nq = 1; w = 'S R = 10 → set'; } else { nq = null; w = 'S R = 11 → not allowed, Q is undefined'; } }
          q = nq; Q.push(q); why.push(w);
        });
        return {id:'ff', t, q0, a, b, Q, why, bad: why.some(w => w.includes('not allowed'))};
      },
      problem: m => ({ chips:[`${m.t.toUpperCase()} flip-flop`, `Q₀ = ${m.q0}`, `${m.t === 'jk' ? 'J' : m.t === 'sr' ? 'S' : m.t.toUpperCase()} = ${m.a.join(' ')}`].concat(m.b ? [`${m.t === 'jk' ? 'K' : 'R'} = ${m.b.join(' ')}`] : []) }),
      steps: () => [
        { dur:2400, show:['clk'], info: m => ({ title:'Characteristic table', body:'<p>The output only changes on a rising clock edge, using the inputs just before the edge.</p>', work:{d:'Q⁺ = D', t:'Q⁺ = T ⊕ Q', jk:'00 hold, 01 reset, 10 set, 11 toggle<br>Q⁺ = JQ′ + K′Q', sr:'00 hold, 01 reset, 10 set, 11 not allowed<br>Q⁺ = S + R′Q'}[m.t] }) },
        { dur:4000, show:['q'], info: m => ({ title:'Edge by edge', body:'<p>Apply the table at each rising edge.</p>', work: m.why.map((w, k) => `edge ${k + 1}: ${w} → Q = <b>${m.Q[k + 1] === null ? '?' : m.Q[k + 1]}</b>`).join('<br>') }), rd: m => ['Q after each edge', m.Q.slice(1).map(x => x === null ? '?' : x).join(' ')] },
        answerStep()],
      answer: m => [{tone:'y', k:'Q sequence', v:m.Q.slice(1).map(x => x === null ? '?' : x).join(' '), s:`starting from Q = ${m.q0}`}],
      note: m => m.bad ? 'S = R = 1 is forbidden for an SR flip-flop, so Q is unknown until a set or reset.' : '',
      scene: (m, S) => {
        const N = m.a.length, x0 = 90, w = S.W - x0 - 30, cw = w/(N + 1), sigs = [['CLK', null], [m.t === 'jk' ? 'J' : m.t === 'sr' ? 'S' : m.t.toUpperCase(), m.a]].concat(m.b ? [[m.t === 'jk' ? 'K' : 'R', m.b]] : []).concat([['Q', 'Q']]), rh = Math.min(80, (S.H - 60)/sigs.length), ctx = G.ctx();
        const vc = S.vis('clk'), vq = S.vis('q');
        sigs.forEach(([lab, data], r) => {
          const yb = 40 + (r + 1)*rh - 16, yt = yb - rh*0.5, a = lab === 'Q' ? 1 : vc;
          G.text(lab, x0 - 20, (yb + yt)/2 + 5, {align:'right', size:15, weight:600, color: lab === 'Q' ? SAND : TEXT, a});
          const pts = [];
          if (data === null){ for (let k = 0; k <= N; k++){ const xs = x0 + k*cw; pts.push([xs, yb], [xs + cw/2, yb], [xs + cw/2, yt], [xs + cw, yt], [xs + cw, yb]); } G.path(pts, BLUE, 2, {a:vc}); return; }
          if (data === 'Q'){
            // Q changes right at each rising edge; unknown stretches are shaded
            const edge = k => x0 + (k - 1)*cw + cw/2, k1 = Math.round(vq*N);
            for (let k = 0; k <= Math.min(k1, N); k++){
              const val = m.Q[k], xs = k === 0 ? x0 : edge(k), xe = k === N || k === k1 ? (k === N ? x0 + (N + 1)*cw : edge(k + 1)) : edge(k + 1);
              if (val === null){ ctx.save(); ctx.globalAlpha = .25; ctx.fillStyle = RED; ctx.fillRect(xs, yt, xe - xs, yb - yt); ctx.restore(); continue; }
              const y = val ? yt : yb, prev = k ? m.Q[k - 1] : null;
              if (k && prev !== null && prev !== val) G.line(xs, yt, xs, yb, SAND, 2.6);
              G.line(xs, y, xe, y, SAND, 2.6);
            }
            return;
          }
          // inputs are shown changing midway between edges so they are stable at each edge
          data.forEach((val, k) => { const xs = k === 0 ? x0 : x0 + k*cw, xe = x0 + (k + 1)*cw; pts.push([xs, val ? yt : yb], [xe, val ? yt : yb]); });
          G.path(pts, TEAL, 2.2, {a:vc});
        });
        for (let k = 1; k <= N; k++){ const x = x0 + (k - 1)*cw + cw/2; G.line(x, 40, x, S.H - 20, 'rgba(213,220,228,.14)', 1, {dash:[3, 4], a:vc}); G.text(String(k), x, S.H - 6, {align:'center', size:10.5, color:'rgba(213,220,228,.5)', a:vc}); }
      } }
  ];
  const FIELDS = {
    nv:{label:'Variables (2–4)'}, mins:{label:'Minterms (comma separated)', type:'expr'}, dcs:{label:'Don’t-cares (optional)', type:'expr'},
    expr:{label:'Expression, e.g. AB′ + C or m(1,3,5)', type:'expr'},
    num:{label:'Number', type:'expr'}, from:{label:'From base', type:'select', options:[['10', 'Decimal (10)'], ['2', 'Binary (2)'], ['8', 'Octal (8)'], ['16', 'Hex (16)']]}, to:{label:'To base', type:'select', options:[['2', 'Binary (2)'], ['8', 'Octal (8)'], ['10', 'Decimal (10)'], ['16', 'Hex (16)']]},
    dec:{label:'Decimal integer'}, bits:{label:'Number of bits'},
    fftype:{label:'Flip-flop', type:'select', options:[['jk', 'JK'], ['d', 'D'], ['t', 'T'], ['sr', 'SR']]}, q0:{label:'Starting Q'},
    in1:{label:'First input at each edge (J, D, T or S)', type:'expr'}, in2:{label:'Second input (K or R)', type:'expr', showIf: v => v.fftype === 'jk' || v.fftype === 'sr'}
  };
  return {MODES, FIELDS};
};
