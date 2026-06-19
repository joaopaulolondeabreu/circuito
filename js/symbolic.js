/*
 * symbolic.js — Pequeno motor de álgebra simbólica.
 *
 * Permite que a calculadora trabalhe com INCÓGNITAS (ex.: R1, V3, ε), e não
 * só com números. Cada valor é guardado como uma expressão racional na forma
 *      n / d   (numerador / denominador),
 * onde n e d são polinômios (soma de monômios). Um monômio é
 *      coef · (variável^expoente · variável^expoente · …),
 * com expoentes que podem ser negativos (→ vão para o denominador) ou
 * fracionários (→ raízes). Assim conseguimos somar, multiplicar, dividir,
 * elevar e tirar raiz mantendo as letras, e imprimir um resultado legível.
 *
 * Funciona no navegador e no Node (testes). Depende de CS.parseEng/CS.fmt
 * (definidos em components.js), então deve ser carregado depois dele.
 */
;(function (global) {
  'use strict';
  var CS = global.CS = global.CS || {};

  function fmtNum(x) {
    if (!isFinite(x)) return String(x);
    return Number(x.toPrecision(6)).toString();
  }

  // ---------------------------------------------------------------- monômios
  // Mono: { c: número, v: { nome: expoente } }
  // Poly: [Mono]  (soma de monômios)
  var ONE = [{ c: 1, v: {} }];

  function cleanVars(v) { var o = {}; for (var k in v) if (v[k] !== 0) o[k] = v[k]; return o; }
  function monoKey(v) {
    var ks = Object.keys(v).sort();
    return ks.map(function (k) { return k + '^' + v[k]; }).join('*');
  }
  function polyClean(p) {
    var map = {}, order = [];
    p.forEach(function (m) {
      var v = cleanVars(m.v), key = monoKey(v);
      if (!(key in map)) { map[key] = { c: 0, v: v }; order.push(key); }
      map[key].c += m.c;
    });
    var res = [];
    order.forEach(function (k) { if (Math.abs(map[k].c) > 1e-12) res.push({ c: map[k].c, v: map[k].v }); });
    return res;
  }
  function polyAdd(a, b) { return polyClean(a.concat(b)); }
  function polyNeg(a) { return a.map(function (m) { return { c: -m.c, v: m.v }; }); }
  function monoMul(m1, m2) {
    var v = {}, k;
    for (k in m1.v) v[k] = (v[k] || 0) + m1.v[k];
    for (k in m2.v) v[k] = (v[k] || 0) + m2.v[k];
    return { c: m1.c * m2.c, v: cleanVars(v) };
  }
  function polyMul(a, b) {
    var res = [];
    a.forEach(function (m1) { b.forEach(function (m2) { res.push(monoMul(m1, m2)); }); });
    return polyClean(res);
  }
  function isOne(p) { return p.length === 1 && p[0].c === 1 && Object.keys(p[0].v).length === 0; }
  function isZero(p) { return p.length === 0; }
  function isSingle(p) { return p.length === 1; }

  // ----------------------------------------------------- expressões racionais
  // Rat: { n: Poly, d: Poly }. Normalmente d = ONE.
  function rat(n, d) {
    d = d || ONE;
    if (isZero(d)) throw new Error('divisão por zero');
    if (isSingle(d)) { // denominador é um único monômio → dobra no numerador
      var inv = { c: 1 / d[0].c, v: {} };
      for (var k in d[0].v) inv.v[k] = -d[0].v[k];
      return { n: polyMul(n, [inv]), d: ONE };
    }
    return { n: n, d: d };
  }
  function ratNum(x) { return { n: x === 0 ? [] : [{ c: x, v: {} }], d: ONE }; }
  function ratVar(name) { var v = {}; v[name] = 1; return { n: [{ c: 1, v: v }], d: ONE }; }

  function ratAdd(a, b) {
    if (isOne(a.d) && isOne(b.d)) return { n: polyAdd(a.n, b.n), d: ONE };
    return rat(polyAdd(polyMul(a.n, b.d), polyMul(b.n, a.d)), polyMul(a.d, b.d));
  }
  function ratNeg(a) { return { n: polyNeg(a.n), d: a.d }; }
  function ratSub(a, b) { return ratAdd(a, ratNeg(b)); }
  function ratMul(a, b) { return rat(polyMul(a.n, b.n), polyMul(a.d, b.d)); }
  function ratInv(a) { if (isZero(a.n)) throw new Error('divisão por zero'); return rat(a.d, a.n); }
  function ratDiv(a, b) { return ratMul(a, ratInv(b)); }
  function ratPow(a, e) {
    if (!Number.isInteger(e)) throw new Error('expoente não inteiro');
    if (e === 0) return ratNum(1);
    var neg = e < 0; e = Math.abs(e);
    var r = ratNum(1);
    for (var i = 0; i < e; i++) r = ratMul(r, a);
    return neg ? ratInv(r) : r;
  }
  function ratSqrt(a) {
    if (isOne(a.d) && isZero(a.n)) return ratNum(0);
    if (isOne(a.d) && isSingle(a.n)) { // raiz de um único monômio
      var m = a.n[0];
      if (m.c < 0) throw new Error('raiz de número negativo');
      var v = {}; for (var k in m.v) v[k] = m.v[k] / 2;
      return { n: [{ c: Math.sqrt(m.c), v: v }], d: ONE };
    }
    return ratVar('√(' + formatRat(a) + ')'); // caso raro: trata como bloco atômico
  }

  function isNumeric(a) {
    return isOne(a.d) && (isZero(a.n) || (isSingle(a.n) && Object.keys(a.n[0].v).length === 0));
  }
  function numericValue(a) { return isZero(a.n) ? 0 : a.n[0].c; }

  // ---------------------------------------------------------------- formatação
  // Normaliza para impressão: limpa frações internas (expoentes negativos),
  // cancela fatores comuns entre numerador e denominador e ajusta o sinal,
  // transformando, p.ex., "E/R1 / (1/R1 + 1/R2)" em "E·R2/(R1 + R2)".
  function minExpMap(poly) {
    var vars = {};
    poly.forEach(function (m) { for (var k in m.v) vars[k] = true; });
    var res = {};
    Object.keys(vars).forEach(function (k) {
      var mn = Infinity;
      poly.forEach(function (m) { var e = m.v[k] || 0; if (e < mn) mn = e; });
      res[k] = mn;
    });
    return res;
  }
  function normalizeRat(r) {
    if (isZero(r.n)) return { n: [], d: ONE };
    var frac = false;
    function chk(p) { p.forEach(function (m) { for (var k in m.v) if (!Number.isInteger(m.v[k])) frac = true; }); }
    chk(r.n); chk(r.d);
    if (frac) return r; // tem raízes (expoente fracionário): não mexe
    // 1) multiplica n e d por um monômio que elimina os expoentes negativos
    var clear = {};
    function need(p) { p.forEach(function (m) { for (var k in m.v) { var e = m.v[k]; if (e < 0) clear[k] = Math.max(clear[k] || 0, -e); } }); }
    need(r.n); need(r.d);
    var n = polyMul(r.n, [{ c: 1, v: clear }]);
    var d = polyMul(r.d, [{ c: 1, v: clear }]);
    // 2) cancela o fator monomial comum a numerador e denominador
    var meN = minExpMap(n), meD = minExpMap(d), inv = { c: 1, v: {} }, any = false, keys = {};
    Object.keys(meN).forEach(function (k) { keys[k] = 1; });
    Object.keys(meD).forEach(function (k) { keys[k] = 1; });
    Object.keys(keys).forEach(function (k) {
      var a = (k in meN) ? meN[k] : 0, b = (k in meD) ? meD[k] : 0, cc = Math.min(a, b);
      if (cc > 0) { inv.v[k] = -cc; any = true; }
    });
    if (any) { n = polyMul(n, [inv]); d = polyMul(d, [inv]); }
    // 3) ajusta o sinal: denominador com termo líder negativo → troca os dois
    if (d.length && d[0].c < 0) { n = polyNeg(n); d = polyNeg(d); }
    // 4) denominador de um termo só → dobra no numerador (impressão compacta)
    if (d.length === 1) {
      var dm = d[0], invd = { c: 1 / dm.c, v: {} };
      for (var kk in dm.v) invd.v[kk] = -dm.v[kk];
      n = polyMul(n, [invd]); d = ONE;
    }
    return { n: n, d: d };
  }

  function formatFactor(name, e) {
    if (e === 1) return name;
    if (e === 0.5) return '√' + name;
    if (e === 1.5) return name + '·√' + name;
    if (e === 2) return name + '²';
    if (e === 3) return name + '³';
    if (Number.isInteger(e)) return name + '^' + e;
    return name + '^(' + fmtNum(e) + ')';
  }
  function formatMono(m) { // devolve string SEM sinal (usa |coef|)
    var numF = [], denF = [];
    Object.keys(m.v).forEach(function (k) {
      var e = m.v[k];
      if (e > 0) numF.push(formatFactor(k, e));
      else denF.push(formatFactor(k, -e));
    });
    var ca = Math.abs(m.c);
    var parts = [];
    if (ca !== 1 || numF.length === 0) parts.push(fmtNum(ca));
    numF.forEach(function (f) { parts.push(f); });
    var numStr = parts.join('·');
    if (denF.length) {
      var denStr = denF.length > 1 ? '(' + denF.join('·') + ')' : denF[0];
      return numStr + '/' + denStr;
    }
    return numStr;
  }
  function degree(m) { var s = 0; for (var k in m.v) s += m.v[k]; return s; }
  function formatPoly(p) {
    if (isZero(p)) return '0';
    var terms = p.slice().sort(function (a, b) {
      var ac = Object.keys(a.v).length === 0, bc = Object.keys(b.v).length === 0;
      if (ac !== bc) return ac ? 1 : -1;          // termo constante por último
      var da = degree(a), db = degree(b);
      if (da !== db) return db - da;              // maior grau primeiro
      var ka = monoKey(a.v), kb = monoKey(b.v);   // depois ordem alfabética
      return ka < kb ? -1 : (ka > kb ? 1 : 0);
    });
    var out = '';
    terms.forEach(function (m, i) {
      var s = formatMono(m);
      if (i === 0) out += (m.c < 0 ? '−' : '') + s;
      else out += (m.c < 0 ? ' − ' : ' + ') + s;
    });
    return out;
  }
  function formatRat(r) {
    var nr = normalizeRat(r);
    if (isOne(nr.d)) return formatPoly(nr.n);
    var nP = nr.n.length > 1, dP = nr.d.length > 1;
    return (nP ? '(' + formatPoly(nr.n) + ')' : formatPoly(nr.n)) + ' / ' +
           (dP ? '(' + formatPoly(nr.d) + ')' : formatPoly(nr.d));
  }

  // ----------------------------------------------------------------- parser
  function isIdentStart(c) { return /[A-Za-z_µΩΑ-ω]/.test(c); }
  function isIdentPart(c) { return /[A-Za-z0-9_µΩΑ-ω'′’]/.test(c); }

  function lexNumber(s, i) {
    var start = i, n = s.length;
    while (i < n && s[i] >= '0' && s[i] <= '9') i++;
    if (i < n && s[i] === '.') { i++; while (i < n && s[i] >= '0' && s[i] <= '9') i++; }
    if (i < n && (s[i] === 'e' || s[i] === 'E')) { // notação científica
      var j = i + 1; if (j < n && (s[j] === '+' || s[j] === '-')) j++;
      if (j < n && s[j] >= '0' && s[j] <= '9') { i = j; while (i < n && s[i] >= '0' && s[i] <= '9') i++; }
    }
    var suf = 'pnuµmkKMG'; // prefixo de engenharia, se não vier seguido de letra
    if (i < n && suf.indexOf(s[i]) >= 0) {
      var after = s[i + 1];
      if (!(after && /[A-Za-zΑ-ω]/.test(after))) { i++; while (i < n && s[i] >= '0' && s[i] <= '9') i++; }
    }
    return { value: CS.parseEng(s.slice(start, i)), end: i };
  }

  function tokenize(str) {
    var s = str, i = 0, n = s.length, toks = [];
    var opMap = { '+': '+', '-': '-', '−': '-', '*': '*', '·': '*', '×': '*', '/': '/', '^': '^' };
    while (i < n) {
      var c = s[i];
      if (c === ' ' || c === '\t') { i++; continue; }
      if ((c >= '0' && c <= '9') || (c === '.' && /[0-9]/.test(s[i + 1] || ''))) {
        var r = lexNumber(s, i); toks.push({ t: 'num', v: r.value }); i = r.end; continue;
      }
      if (c === '√') { toks.push({ t: 'fn' }); i++; continue; }
      if (c === '²') { toks.push({ t: 'sup', e: 2 }); i++; continue; }
      if (c === '³') { toks.push({ t: 'sup', e: 3 }); i++; continue; }
      if (isIdentStart(c)) {
        var j = i + 1; while (j < n && isIdentPart(s[j])) j++;
        var name = s.slice(i, j); i = j;
        if (name === 'sqrt' || name === 'raiz') toks.push({ t: 'fn' });
        else toks.push({ t: 'id', name: name });
        continue;
      }
      if (c in opMap) { toks.push({ t: 'op', op: opMap[c] }); i++; continue; }
      if (c === '(') { toks.push({ t: 'lp' }); i++; continue; }
      if (c === ')') { toks.push({ t: 'rp' }); i++; continue; }
      throw new Error('caractere inválido: "' + c + '"');
    }
    return toks;
  }

  function parse(str) {
    var toks = tokenize(str), pos = 0;
    function peek() { return toks[pos]; }
    function next() { return toks[pos++]; }
    function expect(t) { var k = next(); if (!k || k.t !== t) throw new Error('sintaxe'); return k; }
    function starts(tk) { return tk && (tk.t === 'num' || tk.t === 'id' || tk.t === 'lp' || tk.t === 'fn'); }

    function parseExpr() {
      var left = parseTerm();
      while (peek() && peek().t === 'op' && (peek().op === '+' || peek().op === '-')) {
        var op = next().op, right = parseTerm();
        left = op === '+' ? ratAdd(left, right) : ratSub(left, right);
      }
      return left;
    }
    function parseTerm() {
      var left = parsePower();
      while (true) {
        var tk = peek();
        if (tk && tk.t === 'op' && (tk.op === '*' || tk.op === '/')) {
          var op = next().op, right = parsePower();
          left = op === '*' ? ratMul(left, right) : ratDiv(left, right);
        } else if (starts(tk)) { left = ratMul(left, parsePower()); } // multiplicação implícita
        else break;
      }
      return left;
    }
    function parsePower() {
      var base = parseUnary();
      while (peek() && ((peek().t === 'op' && peek().op === '^') || peek().t === 'sup')) {
        var tk = next();
        if (tk.t === 'sup') base = ratPow(base, tk.e);
        else {
          var et = parseUnary();
          if (!isNumeric(et)) throw new Error('expoente não numérico');
          base = ratPow(base, numericValue(et));
        }
      }
      return base;
    }
    function parseUnary() {
      var tk = peek();
      if (tk && tk.t === 'op' && (tk.op === '-' || tk.op === '+')) {
        next(); var a = parseUnary();
        return tk.op === '-' ? ratNeg(a) : a;
      }
      return parseAtom();
    }
    function parseAtom() {
      var tk = next();
      if (!tk) throw new Error('fim inesperado');
      if (tk.t === 'num') return ratNum(tk.v);
      if (tk.t === 'id') return ratVar(tk.name);
      if (tk.t === 'fn') {
        var nx = peek(), arg;
        if (nx && nx.t === 'lp') { next(); arg = parseExpr(); expect('rp'); }
        else arg = parseAtom();
        return ratSqrt(arg);
      }
      if (tk.t === 'lp') { var e = parseExpr(); expect('rp'); return e; }
      throw new Error('sintaxe inesperada');
    }

    var result = parseExpr();
    if (pos !== toks.length) throw new Error('entrada incompleta');
    return result;
  }

  function fromInput(str) {
    if (str == null) return null;
    var t = String(str).trim();
    return t === '' ? null : parse(t);
  }

  CS.Sym = {
    parse: parse, fromInput: fromInput,
    num: ratNum, variable: ratVar,
    add: ratAdd, sub: ratSub, mul: ratMul, div: ratDiv, pow: ratPow, sqrt: ratSqrt, neg: ratNeg,
    format: formatRat, isNumeric: isNumeric, numericValue: numericValue
  };

})(typeof window !== 'undefined' ? window : globalThis);
