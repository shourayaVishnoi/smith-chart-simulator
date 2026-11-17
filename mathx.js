// mathx.js — expression parsing, complex numbers, polynomials and numerics shared by the tool pages.
window.MX = (() => {
  'use strict';
  const PI = Math.PI, TAU = 2*Math.PI;

  // ---------------- expression parser (Desmos-style input) ----------------
  const FUNCS = {
    sin:Math.sin, cos:Math.cos, tan:Math.tan, sec:x => 1/Math.cos(x), csc:x => 1/Math.sin(x), cot:x => 1/Math.tan(x),
    asin:Math.asin, acos:Math.acos, atan:Math.atan, arcsin:Math.asin, arccos:Math.acos, arctan:Math.atan,
    sinh:Math.sinh, cosh:Math.cosh, tanh:Math.tanh, exp:Math.exp, ln:Math.log, log:Math.log10, sqrt:Math.sqrt, cbrt:Math.cbrt,
    abs:Math.abs, floor:Math.floor, ceil:Math.ceil, round:Math.round, sign:Math.sign,
    u:x => (x >= 0 ? 1 : 0), step:x => (x >= 0 ? 1 : 0), rect:x => (Math.abs(x) < 0.5 ? 1 : Math.abs(x) === 0.5 ? 0.5 : 0),
    tri:x => Math.max(0, 1 - Math.abs(x)), sinc:x => (Math.abs(x) < 1e-12 ? 1 : Math.sin(PI*x)/(PI*x)),
    min:Math.min, max:Math.max, mod:(a, b) => ((a % b) + b) % b, atan2:Math.atan2
  };
  const CONSTS = {pi:PI, e:Math.E, tau:TAU};
  const NAMES = Object.keys(FUNCS).concat(Object.keys(CONSTS), ['theta']).sort((a, b) => b.length - a.length);

  function tokenize(src){
    const s = String(src).replace(/π/g, 'pi').replace(/θ/g, 'theta').replace(/[−–]/g, '-').replace(/[·×]/g, '*').replace(/÷/g, '/').replace(/²/g, '^2').replace(/³/g, '^3');
    const out = []; let i = 0;
    while (i < s.length){
      const ch = s[i];
      if (/\s/.test(ch)){ i++; continue; }
      const mnum = /^(\d+\.?\d*|\.\d+)(e[-+]?\d+)?/i.exec(s.slice(i));
      if (mnum && !(mnum[2] && /[a-df-z]/i.test(s[i + mnum[0].length] || ''))){ out.push({k:'num', v:parseFloat(mnum[0])}); i += mnum[0].length; continue; }
      if (/[a-z_]/i.test(ch)){
        let j = i; while (j < s.length && /[a-z]/i.test(s[j])) j++;
        let run = s.slice(i, j);
        // split a run of letters into known names and single-letter variables: "ax" → a·x, "sinx" → sin x
        while (run.length){
          const nm = NAMES.find(n => run.toLowerCase().startsWith(n));
          if (nm){ out.push({k:'id', v:nm}); run = run.slice(nm.length); }
          else { out.push({k:'id', v:run[0]}); run = run.slice(1); }
        }
        i = j; continue;
      }
      if ('+-*/^(),=|<>'.includes(ch)){ out.push({k:'op', v:ch}); i++; continue; }
      throw new Error(`I don't understand "${ch}".`);
    }
    return out;
  }
  function parse(src){
    const toks = tokenize(src); let p = 0;
    const peek = () => toks[p], next = () => toks[p++];
    const isOp = (t, v) => t && t.k === 'op' && t.v === v;
    const startsFactor = t => t && (t.k === 'num' || t.k === 'id' || isOp(t, '(') );
    function expect(v){ const t = next(); if (!isOp(t, v)) throw new Error(`Expected "${v}".`); }
    function expr(){ return sum(); }
    function sum(){
      let a = product();
      while (isOp(peek(), '+') || isOp(peek(), '-')){ const op = next().v; a = {t:'bin', op, a, b:product()}; }
      return a;
    }
    function product(){
      let a = unary();
      for (;;){
        const t = peek();
        if (isOp(t, '*') || isOp(t, '/')){ next(); a = {t:'bin', op:t.v, a, b:unary()}; }
        else if (startsFactor(t)){ a = {t:'bin', op:'*', a, b:power()}; }
        else break;
      }
      return a;
    }
    function unary(){
      if (isOp(peek(), '-')){ next(); return {t:'neg', a:unary()}; }
      if (isOp(peek(), '+')){ next(); return unary(); }
      return power();
    }
    function power(){
      const base = primary();
      if (isOp(peek(), '^')){ next(); return {t:'bin', op:'^', a:base, b:unary()}; }
      return base;
    }
    function primary(){
      const t = next();
      if (!t) throw new Error('The expression ends too early.');
      if (t.k === 'num') return {t:'num', v:t.v};
      if (isOp(t, '|')){ const a = expr(); expect('|'); return {t:'call', f:'abs', args:[a]}; }
      if (isOp(t, '(')){
        const a = expr();
        if (isOp(peek(), ',')){ const items = [a]; while (isOp(peek(), ',')){ next(); items.push(expr()); } expect(')'); return {t:'tuple', items}; }
        expect(')'); return a;
      }
      if (t.k === 'id'){
        if (FUNCS[t.v]){
          let pw = null;
          if (isOp(peek(), '^')){ next(); pw = unary(); }            // sin^2 x
          let args;
          if (isOp(peek(), '(')){
            next(); args = [expr()]; while (isOp(peek(), ',')){ next(); args.push(expr()); } expect(')');
          } else {
            // sin 2x → sin(2x); sin x cos x → sin(x)·cos(x)
            let a = power();
            while (startsFactor(peek()) && !(peek().k === 'id' && FUNCS[peek().v])) a = {t:'bin', op:'*', a, b:power()};
            args = [a];
          }
          const call = {t:'call', f:t.v, args};
          return pw ? {t:'bin', op:'^', a:call, b:pw} : call;
        }
        if (CONSTS[t.v] !== undefined) return {t:'num', v:CONSTS[t.v], name:t.v};
        return {t:'var', n:t.v};
      }
      throw new Error(`Unexpected "${t.v}".`);
    }
    const ast = expr();
    if (p < toks.length) throw new Error(`Unexpected "${toks[p].v}".`);
    return ast;
  }
  function vars(ast, set = new Set()){
    if (!ast) return set;
    if (ast.t === 'var') set.add(ast.n);
    ['a', 'b'].forEach(k => ast[k] && vars(ast[k], set));
    (ast.args || ast.items || []).forEach(x => vars(x, set));
    return set;
  }
  // compile an AST into a fast closure: f(env) → number (env holds variable values)
  function compile(ast){
    switch (ast.t){
      case 'num': { const v = ast.v; return () => v; }
      case 'var': { const n = ast.n; return env => { const v = env[n]; return v === undefined ? NaN : v; }; }
      case 'neg': { const a = compile(ast.a); return env => -a(env); }
      case 'bin': {
        const a = compile(ast.a), b = compile(ast.b);
        switch (ast.op){
          case '+': return env => a(env) + b(env);
          case '-': return env => a(env) - b(env);
          case '*': return env => a(env)*b(env);
          case '/': return env => a(env)/b(env);
          case '^': return env => { const x = a(env), y = b(env); if (x < 0 && !Number.isInteger(y)){ const q = 1/y; if (Number.isInteger(q) && q % 2 === 1) return -Math.pow(-x, y); } return Math.pow(x, y); };
        }
        break;
      }
      case 'call': {
        const fn = FUNCS[ast.f], args = ast.args.map(compile);
        if (args.length === 1){ const a = args[0]; return env => fn(a(env)); }
        return env => fn(...args.map(g => g(env)));
      }
      case 'tuple': { const items = ast.items.map(compile); return env => items.map(g => g(env)); }
    }
    throw new Error('Could not compile the expression.');
  }
  function fn(src, varName = 'x', extra = {}){
    const ast = parse(src), g = compile(ast), env = Object.assign({}, extra);
    const free = [...vars(ast)].filter(v => v !== varName && extra[v] === undefined);
    if (free.length) throw new Error(`Unknown letter${free.length > 1 ? 's' : ''}: ${free.join(', ')}.`);
    return x => { env[varName] = x; return g(env); };
  }
  function evalNumber(src){
    const ast = parse(src);
    const free = [...vars(ast)];
    if (free.length) throw new Error(`"${src}" should be a number.`);
    const v = compile(ast)({});
    if (typeof v !== 'number' || !isFinite(v)) throw new Error(`"${src}" is not a finite number.`);
    return v;
  }
  function splitEquation(src){
    let depth = 0; const s = String(src), idx = [];
    for (let i = 0; i < s.length; i++){ const c = s[i]; if (c === '(') depth++; else if (c === ')') depth--; else if (c === '=' && depth === 0) idx.push(i); }
    if (idx.length === 0) return null;
    if (idx.length > 1) throw new Error('Use only one "=".');
    return [s.slice(0, idx[0]).trim(), s.slice(idx[0] + 1).trim()];
  }

  // ---------------- complex numbers ----------------
  const C = {
    add:(a, b) => [a[0] + b[0], a[1] + b[1]], sub:(a, b) => [a[0] - b[0], a[1] - b[1]],
    mul:(a, b) => [a[0]*b[0] - a[1]*b[1], a[0]*b[1] + a[1]*b[0]],
    div:(a, b) => { const d = b[0]*b[0] + b[1]*b[1]; return [(a[0]*b[0] + a[1]*b[1])/d, (a[1]*b[0] - a[0]*b[1])/d]; },
    abs:a => Math.hypot(a[0], a[1]), arg:a => Math.atan2(a[1], a[0]), scale:(a, k) => [a[0]*k, a[1]*k],
    exp:a => { const r = Math.exp(a[0]); return [r*Math.cos(a[1]), r*Math.sin(a[1])]; }, polar:(r, t) => [r*Math.cos(t), r*Math.sin(t)]
  };

  // ---------------- polynomials (ascending coefficients: p[k] multiplies s^k) ----------------
  const P = {
    trim(p){ const q = p.slice(); while (q.length > 1 && Math.abs(q[q.length - 1]) < 1e-14*Math.max(1, ...q.map(Math.abs))) q.pop(); return q; },
    add(a, b){ const n = Math.max(a.length, b.length), r = []; for (let i = 0; i < n; i++) r.push((a[i] || 0) + (b[i] || 0)); return P.trim(r); },
    scale(a, k){ return a.map(x => x*k); },
    mul(a, b){ const r = new Array(a.length + b.length - 1).fill(0); a.forEach((x, i) => b.forEach((y, j) => { r[i + j] += x*y; })); return P.trim(r); },
    pow(a, n){ let r = [1]; for (let i = 0; i < n; i++) r = P.mul(r, a); return r; },
    deriv(a){ return a.length <= 1 ? [0] : a.slice(1).map((x, i) => x*(i + 1)); },
    evalR(p, x){ let v = 0; for (let i = p.length - 1; i >= 0; i--) v = v*x + p[i]; return v; },
    evalC(p, z){ let v = [0, 0]; for (let i = p.length - 1; i >= 0; i--) v = C.add(C.mul(v, z), [p[i], 0]); return v; },
    degree(p){ return P.trim(p).length - 1; },
    fromRoots(rs){ let p = [1]; rs.forEach(r => { p = P.mul(p, [-r, 1]); }); return p; },
    // all complex roots (Durand–Kerner, then Newton polish); tiny imaginary parts are cleaned
    roots(pIn){
      let p = P.trim(pIn); const out = [];
      while (p.length > 1 && Math.abs(p[0]) < 1e-14*Math.max(1, ...p.map(Math.abs))){ out.push([0, 0]); p = p.slice(1); }
      const n = p.length - 1; if (n < 1) return out;
      const lead = p[n], a = p.map(x => x/lead);
      if (n === 1) return out.concat([[-a[0], 0]]);
      if (n === 2){
        const b = a[1], c = a[0], disc = b*b - 4*c;
        if (disc >= 0){ const q = -0.5*(b + Math.sign(b || 1)*Math.sqrt(disc)); return out.concat([[q, 0], [c/q, 0]]); }
        return out.concat([[-b/2, Math.sqrt(-disc)/2], [-b/2, -Math.sqrt(-disc)/2]]);
      }
      const R = 1 + Math.max(...a.slice(0, n).map(Math.abs));
      let z = []; for (let k = 0; k < n; k++) z.push(C.polar(R*0.9, TAU*k/n + 0.4));
      for (let it = 0; it < 800; it++){
        let moved = 0;
        z = z.map((zi, i) => {
          let den = [1, 0]; z.forEach((zj, j) => { if (j !== i) den = C.mul(den, C.sub(zi, zj)); });
          const dz = C.div(P.evalC(a, zi), den); moved = Math.max(moved, C.abs(dz)); return C.sub(zi, dz);
        });
        if (moved < 1e-14) break;
      }
      const d = P.deriv(a);
      z = z.map(zi => { for (let k = 0; k < 3; k++){ const den = P.evalC(d, zi); if (C.abs(den) < 1e-300) break; zi = C.sub(zi, C.div(P.evalC(a, zi), den)); } return zi; });
      z = z.map(zi => Math.abs(zi[1]) < 1e-9*Math.max(1, Math.abs(zi[0])) ? [zi[0], 0] : zi);
      return out.concat(z.sort((u, v) => u[0] - v[0] || u[1] - v[1]));
    },
    toString(p, v = 's'){
      const t = P.trim(p), parts = [];
      for (let k = t.length - 1; k >= 0; k--){
        const c = t[k]; if (Math.abs(c) < 1e-12 && t.length > 1) continue;
        const ac = Math.abs(c), cs = (k > 0 && Math.abs(ac - 1) < 1e-12) ? '' : fmt(ac, 4), vs = k === 0 ? '' : k === 1 ? v : `${v}^${k}`;
        parts.push({neg: c < 0, s: cs + vs || '1'});
      }
      if (!parts.length) return '0';
      return parts.map((q, i) => (i === 0 ? (q.neg ? '−' : '') : q.neg ? ' − ' : ' + ') + q.s).join('');
    }
  };

  // rational functions of s from an expression: values are {n, d} with polynomial numerator and denominator
  function rational(src, params = {}){
    const ast = parse(src);
    const R = node => {
      switch (node.t){
        case 'num': return {n:[node.v], d:[1]};
        case 'var':
          if (node.n === 's') return {n:[0, 1], d:[1]};
          if (params[node.n] !== undefined) return {n:[params[node.n]], d:[1]};
          throw new Error(`Unknown letter "${node.n}": use s for the Laplace variable.`);
        case 'neg': { const a = R(node.a); return {n:P.scale(a.n, -1), d:a.d}; }
        case 'bin': {
          const a = R(node.a);
          if (node.op === '^'){
            const b = R(node.b);
            if (P.degree(b.n) !== 0 || P.degree(b.d) !== 0) throw new Error('Powers must be whole numbers.');
            const k = b.n[0]/b.d[0];
            if (!Number.isInteger(k) || k < 0 || k > 20) throw new Error('Powers must be whole numbers from 0 to 20.');
            return {n:P.pow(a.n, k), d:P.pow(a.d, k)};
          }
          const b = R(node.b);
          if (node.op === '+') return {n:P.add(P.mul(a.n, b.d), P.mul(b.n, a.d)), d:P.mul(a.d, b.d)};
          if (node.op === '-') return {n:P.add(P.mul(a.n, b.d), P.scale(P.mul(b.n, a.d), -1)), d:P.mul(a.d, b.d)};
          if (node.op === '*') return {n:P.mul(a.n, b.n), d:P.mul(a.d, b.d)};
          if (node.op === '/') return {n:P.mul(a.n, b.d), d:P.mul(a.d, b.n)};
          break;
        }
        case 'call': throw new Error(`Functions like ${node.f}() can't appear in a transfer function.`);
        case 'tuple': throw new Error('Unexpected comma.');
      }
      throw new Error('Could not read the transfer function.');
    };
    const r = R(ast);
    let n = P.trim(r.n), d = P.trim(r.d);
    if (d.length === 1 && d[0] === 0) throw new Error('The denominator is zero.');
    const k = d[d.length - 1]; n = P.scale(n, 1/k); d = P.scale(d, 1/k);   // monic denominator
    return {n, d};
  }

  // ---------------- numerics ----------------
  function integrate(f, a, b, eps = 1e-10){
    const simpson = (a, b, fa, fm, fb) => (b - a)/6*(fa + 4*fm + fb);
    const rec = (a, b, fa, fm, fb, whole, eps, depth) => {
      const m = (a + b)/2, lm = (a + m)/2, rm = (m + b)/2, flm = f(lm), frm = f(rm);
      const left = simpson(a, m, fa, flm, fm), right = simpson(m, b, fm, frm, fb);
      if (depth <= 0 || Math.abs(left + right - whole) <= 15*eps) return left + right + (left + right - whole)/15;
      return rec(a, m, fa, flm, fm, left, eps/2, depth - 1) + rec(m, b, fm, frm, fb, right, eps/2, depth - 1);
    };
    // split into pieces so kinks (u(t), |x|) are handled well
    const N = 64; let s = 0;
    for (let i = 0; i < N; i++){ const x0 = a + (b - a)*i/N, x1 = a + (b - a)*(i + 1)/N, fa = f(x0), fb = f(x1), fm = f((x0 + x1)/2); s += rec(x0, x1, fa, fm, fb, simpson(x0, x1, fa, fm, fb), eps/N, 30); }
    return s;
  }
  function bisect(f, a, b, tol = 1e-13){
    let fa = f(a), fb = f(b); if (fa === 0) return a; if (fb === 0) return b;
    for (let i = 0; i < 200 && Math.abs(b - a) > tol*Math.max(1, Math.abs(a)); i++){ const m = (a + b)/2, fm = f(m); if (fm === 0) return m; if ((fa < 0) === (fm < 0)){ a = m; fa = fm; } else { b = m; fb = fm; } }
    return (a + b)/2;
  }
  // all sign-change roots of f on [a, b] (tangent roots found from tiny local minima of |f|)
  function rootsIn(f, a, b, n = 2000){
    const xs = [], out = []; let px = a, pf = f(a);
    for (let i = 1; i <= n; i++){
      const x = a + (b - a)*i/n, fx = f(x);
      if (isFinite(pf) && isFinite(fx)){
        if (pf === 0) out.push(px);
        else if ((pf < 0) !== (fx < 0) && fx !== 0){ const r = bisect(f, px, x); if (Math.abs(f(r)) < 1e-6*Math.max(1, Math.abs(pf), Math.abs(fx))) out.push(r); }
      }
      px = x; pf = fx; xs.push(x);
    }
    if (pf === 0) out.push(px);
    return out.filter((r, i) => i === 0 || Math.abs(r - out[i - 1]) > 1e-9*Math.max(1, Math.abs(r)));
  }
  function deriv(f, x, h){ h = h || 1e-5*Math.max(1, Math.abs(x)); return (f(x + h) - f(x - h))/(2*h); }
  const linspace = (a, b, n) => Array.from({length:n}, (_, i) => a + (b - a)*i/(n - 1));
  const logspace = (a, b, n) => Array.from({length:n}, (_, i) => Math.pow(10, a + (b - a)*i/(n - 1)));

  // ---------------- formatting ----------------
  const SUP = {'-':'⁻', 0:'⁰', 1:'¹', 2:'²', 3:'³', 4:'⁴', 5:'⁵', 6:'⁶', 7:'⁷', 8:'⁸', 9:'⁹'};
  function fmt(v, sig = 4){
    if (typeof v !== 'number') return String(v);
    if (!isFinite(v)) return isNaN(v) ? '—' : (v > 0 ? '∞' : '−∞');
    if (v === 0) return '0';
    const a = Math.abs(v);
    if (a >= 1e-3 && a < 1e6) return (+v.toPrecision(sig)).toString().replace('-', '−');
    const e = Math.floor(Math.log10(a)), m = +(v/Math.pow(10, e)).toPrecision(sig);
    return `${m.toString().replace('-', '−')} × 10${String(e).split('').map(c => SUP[c]).join('')}`;
  }
  function fmtC(z, sig = 4){
    const re = Math.abs(z[0]) < 1e-12 ? 0 : z[0], im = Math.abs(z[1]) < 1e-12 ? 0 : z[1];
    if (im === 0) return fmt(re, sig);
    if (re === 0) return `${im < 0 ? '−' : ''}j${fmt(Math.abs(im), sig)}`;
    return `${fmt(re, sig)} ${im < 0 ? '−' : '+'} j${fmt(Math.abs(im), sig)}`;
  }
  const PREFIX = [[1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'], [1e-12, 'p']];
  function si(v, unit, sig = 4){
    if (!isFinite(v)) return '∞ ' + unit;
    if (v === 0) return '0 ' + unit;
    const a = Math.abs(v);
    for (const [k, p] of PREFIX) if (a >= k*0.9999999) return `${(+(v/k).toPrecision(sig)).toString().replace('-', '−')} ${p}${unit}`;
    return `${fmt(v, sig)} ${unit}`;
  }

  return {PI, TAU, FUNCS, CONSTS, tokenize, parse, compile, vars, fn, evalNumber, splitEquation, C, P, rational, integrate, bisect, rootsIn, deriv, linspace, logspace, fmt, fmtC, si};
})();
