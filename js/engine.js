/*
 * engine.js — Motor de física do simulador de circuitos.
 *
 * Resolve circuitos elétricos arbitrários (série, paralelo, misto, ponte,
 * etc.) usando ANÁLISE NODAL MODIFICADA (MNA), que é a forma geral e
 * automática de aplicar as Leis de Kirchhoff + Lei de Ohm de uma só vez.
 *
 * NOVIDADE: o solver é genérico sobre um "corpo" (field) de números:
 *   - FieldNum  → aritmética numérica comum (caminho rápido, padrão);
 *   - FieldSym  → aritmética SIMBÓLICA (usa symbolic.js), permitindo
 *                 resolver o circuito com INCÓGNITAS (ex.: R, E, R1...) e
 *                 obter os resultados em função delas.
 * Se qualquer valor do circuito for uma incógnita, usa-se o modo simbólico.
 *
 * Cada componente liga exatamente dois nós: .a e .b (ids de nó, strings).
 * Fontes têm polaridade: terminal + é .b por padrão (params.flipped troca).
 */
;(function (global) {
  'use strict';
  var CS = global.CS = global.CS || {};

  var GLEAK = 1e-11;   // fuga em paralelo com capacitores (mantém nós referenciados)
  var ZERO_I = 1e-9;   // correntes numéricas abaixo disso → zero
  var ZERO_V = 1e-9;   // tensões numéricas abaixo disso → zero

  function num(v, dflt) {
    if (v === '' || v === null || v === undefined) return dflt;
    if (typeof v === 'number') return isFinite(v) ? v : dflt;
    var x = CS.parseEng ? CS.parseEng(v) : parseFloat(String(v).replace(',', '.'));
    return isFinite(x) ? x : dflt;
  }

  // Um rótulo "simples" (uma letra/identificador) pode servir de incógnita.
  function isSymbolLabel(s) {
    if (typeof s !== 'string') return false;
    var t = s.trim();
    return t !== '' && !isFinite(parseFloat(t)) && /^[A-Za-zµΩΑ-ω][A-Za-z0-9_'′’]*$/.test(t);
  }
  // Valor "principal" do componente: usa o campo; se vazio, cai no rótulo
  // (assim, nomear um resistor de "R" já o trata como a incógnita R).
  function mainVal(c, key) {
    var p = c.params || {};
    var raw = p[key];
    if ((raw === '' || raw == null) && isSymbolLabel(p.label)) return p.label;
    return raw;
  }
  function looksSymbolic(raw) {
    if (raw === '' || raw == null) return false;
    if (isFinite(num(raw, NaN))) return false;
    if (!CS.Sym) return false;
    try { CS.Sym.parse(String(raw)); return true; } catch (e) { return false; }
  }
  // O circuito tem alguma incógnita?
  function isSymbolic(circuit) {
    return circuit.components.some(function (c) {
      var p = c.params || {};
      if (c.type === 'resistor') {
        if (p.mode === 'geom') return looksSymbolic(p.rho) || looksSymbolic(p.L) || looksSymbolic(p.A);
        return looksSymbolic(mainVal(c, 'R'));
      }
      if (c.type === 'source') return looksSymbolic(mainVal(c, 'emf')) || looksSymbolic(p.r);
      if (c.type === 'capacitor') return looksSymbolic(mainVal(c, 'C')) || looksSymbolic(p.v0);
      if (c.type === 'inductor') return looksSymbolic(mainVal(c, 'L')) || looksSymbolic(p.i0);
      if (c.type === 'voltmeter' || c.type === 'ammeter' || c.type === 'galvanometer') return looksSymbolic(p.Rint);
      return false;
    });
  }

  // ---- "Corpos" numérico e simbólico -------------------------------------
  var FieldNum = {
    isNumber: true,
    from: function (x) { return x; },
    read: function (v) { if (v === '' || v == null) return null; var x = num(v, NaN); return isFinite(x) ? x : null; },
    add: function (a, b) { return a + b; }, sub: function (a, b) { return a - b; },
    mul: function (a, b) { return a * b; }, div: function (a, b) { return a / b; }, neg: function (a) { return -a; },
    isZero: function (a) { return Math.abs(a) < 1e-13; },
    pivotScore: function (a) { return Math.abs(a); }
  };
  var FieldSym = {
    isNumber: false,
    from: function (x) { return CS.Sym.num(x); },
    read: function (v) { if (v === '' || v == null) return null; try { return CS.Sym.parse(String(v)); } catch (e) { return null; } },
    add: function (a, b) { return CS.Sym.add(a, b); }, sub: function (a, b) { return CS.Sym.sub(a, b); },
    mul: function (a, b) { return CS.Sym.mul(a, b); }, div: function (a, b) { return CS.Sym.div(a, b); }, neg: function (a) { return CS.Sym.neg(a); },
    isZero: function (a) { return a.n.length === 0; },
    pivotScore: function (a) { if (a.n.length === 0) return 0; return CS.Sym.isNumeric(a) ? (1e6 + Math.abs(CS.Sym.numericValue(a))) : 1; }
  };

  // Resistência numérica (para decisões internas, rótulos e validação).
  function resistanceOf(c) {
    if (c.type !== 'resistor') return null;
    var p = c.params || {};
    if (p.mode === 'geom') {
      var rho = num(p.rho, NaN), L = num(p.L, NaN), A = num(p.A, NaN);
      if (!isFinite(rho) || !isFinite(L) || !isFinite(A) || A <= 0) return NaN;
      return rho * L / A;
    }
    return num(mainVal(c, 'R'), NaN);
  }
  // Resistência no corpo F (número ou expressão), ou null se faltar valor.
  function resistanceF(c, F) {
    var p = c.params || {};
    if (p.mode === 'geom') {
      var rho = F.read(p.rho), L = F.read(p.L), A = F.read(p.A);
      if (rho == null || L == null || A == null) return null;
      return F.div(F.mul(rho, L), A);
    }
    return F.read(mainVal(c, 'R'));
  }

  // ---- Eliminação de Gauss-Jordan genérica -------------------------------
  function gaussSolve(A, b, F) {
    var n = b.length;
    if (n === 0) return [];
    var M = A.map(function (r) { return r.slice(); });
    var rhs = b.slice();
    for (var col = 0; col < n; col++) {
      var piv = -1, best = -1;
      for (var r = col; r < n; r++) { var sc = F.pivotScore(M[r][col]); if (sc > best) { best = sc; piv = r; } }
      if (piv < 0 || best <= 0) return null; // singular
      if (piv !== col) { var t = M[piv]; M[piv] = M[col]; M[col] = t; var tb = rhs[piv]; rhs[piv] = rhs[col]; rhs[col] = tb; }
      var pv = M[col][col];
      for (var r2 = 0; r2 < n; r2++) {
        if (r2 === col) continue;
        var f = F.div(M[r2][col], pv);
        if (F.isZero(f)) continue;
        for (var c = col; c < n; c++) M[r2][c] = F.sub(M[r2][c], F.mul(f, M[col][c]));
        rhs[r2] = F.sub(rhs[r2], F.mul(f, rhs[col]));
      }
    }
    var x = new Array(n);
    for (var i = 0; i < n; i++) x[i] = F.div(rhs[i], M[i][i]);
    return x;
  }

  // ---- União-Find (funde nós ligados por fios ideais) --------------------
  function UF() { this.p = {}; }
  UF.prototype.find = function (x) {
    if (this.p[x] === undefined) { this.p[x] = x; return x; }
    var root = x; while (this.p[root] !== root) root = this.p[root];
    while (this.p[x] !== root) { var nx = this.p[x]; this.p[x] = root; x = nx; }
    return root;
  };
  UF.prototype.union = function (a, b) { var ra = this.find(a), rb = this.find(b); if (ra !== rb) this.p[ra] = rb; };

  /*
   * solveDC — resolve o circuito em CC (regime permanente) no corpo F.
   * options: { F, zeroSources, injections:[{a,b,amps}], exclude:Set, openComps:Set }
   * Retorna { ok, error, V:{nó->escalar}, I:{compId->escalar}, rep, problems }.
   */
  function solveDC(circuit, options) {
    options = options || {};
    var F = options.F || FieldNum;
    var exclude = options.exclude || new Set();
    var openComps = options.openComps || new Set();
    var zeroSources = !!options.zeroSources;
    var injections = options.injections || [];

    var comps = circuit.components.filter(function (c) { return !exclude.has(c.id) && !openComps.has(c.id); });

    var uf = new UF();
    circuit.components.forEach(function (c) { uf.find(c.a); uf.find(c.b); });
    comps.forEach(function (c) {
      if (c.type === 'wireIdeal') uf.union(c.a, c.b);
      else if (c.type === 'resistor' && F.isNumber) { var R = resistanceOf(c); if (isFinite(R) && R <= 1e-12) uf.union(c.a, c.b); }
    });
    function rep(n) { return uf.find(n); }

    var conductances = [], branches = [], usedNodes = {}, problems = [];
    function useNode(n) { usedNodes[n] = true; }
    function addCond(a, b, g) { a = rep(a); b = rep(b); conductances.push({ a: a, b: b, g: g }); useNode(a); useNode(b); }
    function addBranch(id, a, b, E, Rs) { a = rep(a); b = rep(b); branches.push({ compId: id, a: a, b: b, E: E, Rs: Rs }); useNode(a); useNode(b); }
    var ONE = F.from(1), ZERO = F.from(0);

    comps.forEach(function (c) {
      var a = c.a, b = c.b, p = c.params || {};
      switch (c.type) {
        case 'wireIdeal': break;
        case 'resistor': {
          var R = resistanceF(c, F);
          if (R == null) { problems.push('Resistor "' + (p.label || c.id) + '" sem valor de resistência.'); break; }
          if (F.isNumber && R <= 1e-12) break;
          addCond(a, b, F.div(ONE, R));
          break;
        }
        case 'source': {
          var emf = zeroSources ? ZERO : resistanceMain(c, 'emf', F);
          if (emf == null) { problems.push('Fonte "' + (p.label || c.id) + '" sem valor de FEM.'); emf = ZERO; }
          var r = F.read(p.r); if (r == null) r = ZERO; else if (F.isNumber) r = Math.max(0, r);
          var plusIsB = !p.flipped;
          addBranch(c.id, plusIsB ? a : b, plusIsB ? b : a, emf, r);
          break;
        }
        case 'capacitor': addCond(a, b, F.from(GLEAK)); break;
        case 'inductor': addBranch(c.id, a, b, ZERO, ZERO); break;
        case 'voltmeter':
          if (p.ideal === false) { var Rv = F.read(p.Rint); if (Rv == null) Rv = F.from(1e7); addCond(a, b, F.div(ONE, Rv)); }
          break;
        case 'ammeter': {
          if (p.ideal !== false) addBranch(c.id, a, b, ZERO, ZERO);
          else { var Ra = F.read(p.Rint); if (Ra == null) Ra = F.from(0.01); addCond(a, b, F.div(ONE, Ra)); }
          break;
        }
        case 'galvanometer': {
          var Rg = F.read(p.Rint);
          var idealG = p.ideal === true || (F.isNumber && (Rg == null || Rg <= 1e-12));
          if (idealG) addBranch(c.id, a, b, ZERO, ZERO);
          else { if (Rg == null) Rg = F.from(50); addCond(a, b, F.div(ONE, Rg)); }
          break;
        }
        default: break;
      }
    });

    injections.forEach(function (inj) { useNode(rep(inj.a)); useNode(rep(inj.b)); });

    var nodeList = Object.keys(usedNodes);
    if (nodeList.length === 0) return { ok: true, V: {}, I: {}, rep: rep, problems: problems };

    // componentes conexas → um terra por sub-circuito
    var adj = {}; nodeList.forEach(function (n) { adj[n] = []; });
    function link(a, b) { if (a !== b) { adj[a].push(b); adj[b].push(a); } }
    conductances.forEach(function (e) { link(e.a, e.b); });
    branches.forEach(function (e) { link(e.a, e.b); });
    injections.forEach(function (inj) { link(rep(inj.a), rep(inj.b)); });
    var ground = {}, seen = {};
    nodeList.forEach(function (start) {
      if (seen[start]) return;
      ground[start] = true; var stack = [start]; seen[start] = true;
      while (stack.length) { var u = stack.pop(); adj[u].forEach(function (w) { if (!seen[w]) { seen[w] = true; stack.push(w); } }); }
    });

    var nodeIndex = {}, idx = 0;
    nodeList.forEach(function (n) { if (!ground[n]) nodeIndex[n] = idx++; });
    var nNodes = idx;
    branches.forEach(function (br, k) { br.idx = nNodes + k; });
    var size = nNodes + branches.length;
    if (size === 0) { var Vz = {}; Object.keys(uf.p).forEach(function (o) { Vz[o] = ZERO; }); return { ok: true, V: Vz, I: {}, rep: rep, problems: problems }; }

    var M = []; for (var i = 0; i < size; i++) { var row = []; for (var j = 0; j < size; j++) row.push(ZERO); M.push(row); }
    var rhs = []; for (var k2 = 0; k2 < size; k2++) rhs.push(ZERO);
    function ni(n) { return ground[n] ? -1 : nodeIndex[n]; }

    conductances.forEach(function (e) {
      var ia = ni(e.a), ib = ni(e.b), g = e.g;
      if (ia >= 0) M[ia][ia] = F.add(M[ia][ia], g);
      if (ib >= 0) M[ib][ib] = F.add(M[ib][ib], g);
      if (ia >= 0 && ib >= 0) { M[ia][ib] = F.sub(M[ia][ib], g); M[ib][ia] = F.sub(M[ib][ia], g); }
    });
    branches.forEach(function (br) {
      var ia = ni(br.a), ib = ni(br.b), kk = br.idx;
      if (ia >= 0) { M[ia][kk] = F.add(M[ia][kk], ONE); M[kk][ia] = F.add(M[kk][ia], ONE); }
      if (ib >= 0) { M[ib][kk] = F.sub(M[ib][kk], ONE); M[kk][ib] = F.sub(M[kk][ib], ONE); }
      M[kk][kk] = F.sub(M[kk][kk], br.Rs);
      rhs[kk] = F.neg(br.E);
    });
    injections.forEach(function (inj) {
      var ia = ni(rep(inj.a)), ib = ni(rep(inj.b));
      if (ia >= 0) rhs[ia] = F.add(rhs[ia], inj.amps);
      if (ib >= 0) rhs[ib] = F.sub(rhs[ib], inj.amps);
    });

    var x = gaussSolve(M, rhs, F);
    if (!x) return { ok: false, error: 'Sistema sem solução única. Verifique curtos em fontes ideais, fios em loop sobre uma fonte, ou trechos soltos.', problems: problems };

    var V = {};
    Object.keys(uf.p).forEach(function (o) {
      var r = rep(o);
      V[o] = ground[r] ? ZERO : (nodeIndex[r] !== undefined ? x[nodeIndex[r]] : ZERO);
    });
    var I = {};
    branches.forEach(function (br) { I[br.compId] = x[br.idx]; });
    return { ok: true, V: V, I: I, rep: rep, problems: problems };
  }

  function resistanceMain(c, key, F) { return F.read(mainVal(c, key)); }

  function equivalentResistance(circuit, nodeA, nodeB, opts) {
    opts = opts || {}; var F = opts.F || FieldNum;
    var res = solveDC(circuit, { F: F, zeroSources: true, exclude: opts.exclude, openComps: opts.openComps, injections: [{ a: nodeA, b: nodeB, amps: F.from(1) }] });
    if (!res.ok) return F.isNumber ? Infinity : null;
    var ra = res.rep(nodeA), rb = res.rep(nodeB);
    if (ra === rb) return F.from(0);
    var va = res.V[nodeA], vb = res.V[nodeB];
    if (va == null || vb == null) return F.isNumber ? Infinity : null;
    var R = F.sub(va, vb);
    if (F.isNumber) { if (!isFinite(R) || R > 1e11) return Infinity; return Math.abs(R); }
    return R;
  }

  // ---- Ajudante de formatação (número OU expressão) ----------------------
  function isExpr(x) { return x != null && typeof x === 'object' && x.n !== undefined; }
  function scalarFmt(x, unit, abs) {
    if (x == null) return '—';
    if (typeof x === 'number') return CS.fmt(abs ? Math.abs(x) : x, unit);
    if (isExpr(x)) {
      if (CS.Sym.isNumeric(x)) { var v = CS.Sym.numericValue(x); return CS.fmt(abs ? Math.abs(v) : v, unit); }
      var s = CS.Sym.format(x); return unit ? (s + ' ' + unit) : s;
    }
    return String(x);
  }
  function snap(x, eps) {
    if (typeof x === 'number') return Math.abs(x) < eps ? 0 : x;
    if (isExpr(x) && CS.Sym.isNumeric(x)) { var v = CS.Sym.numericValue(x); if (Math.abs(v) < eps) return CS.Sym.num(0); }
    return x;
  }

  // ---- Função principal ---------------------------------------------------
  function solveCircuit(circuit) {
    var out = { ok: false, error: null, nodeV: {}, comp: {}, summary: {}, transient: null, warnings: [], symbolic: false };
    if (!circuit.components || circuit.components.length === 0) { out.error = 'Nenhum componente no circuito.'; return out; }

    var symbolic = !!CS.Sym && isSymbolic(circuit);
    var F = symbolic ? FieldSym : FieldNum;
    out.symbolic = symbolic;

    var dc = solveDC(circuit, { F: F });
    if (!dc.ok) { out.error = dc.error; return out; }
    Object.keys(dc.V).forEach(function (k) { dc.V[k] = snap(dc.V[k], ZERO_V); });
    Object.keys(dc.I).forEach(function (k) { dc.I[k] = snap(dc.I[k], ZERO_I); });
    out.nodeV = dc.V;
    if (dc.problems && dc.problems.length) out.warnings = out.warnings.concat(dc.problems);

    var totalDissip = F.from(0);
    function addDissip(p) { totalDissip = F.isNumber ? totalDissip + Math.abs(p) : CS.Sym.add(totalDissip, p); }

    circuit.components.forEach(function (c) {
      var p = c.params || {};
      var Va = dc.V[c.a] != null ? dc.V[c.a] : F.from(0);
      var Vb = dc.V[c.b] != null ? dc.V[c.b] : F.from(0);
      var info = { id: c.id, type: c.type };
      var ddp, cur;

      switch (c.type) {
        case 'wireIdeal': info.voltage = F.from(0); info.current = null; break;
        case 'resistor': {
          var R = resistanceF(c, F);
          info.R = R;
          if (R == null) { info.error = 'sem valor'; break; }
          if (F.isNumber && R <= 1e-12) { info.voltage = 0; info.current = null; break; }
          ddp = F.sub(Va, Vb); cur = F.div(ddp, R);
          info.voltage = ddp; info.current = cur; info.power = F.mul(ddp, cur);
          if (F.isNumber) addDissip(info.power); else addDissip(info.power);
          if (p.mode === 'geom') { info.rho = F.read(p.rho); info.L = F.read(p.L); info.A = F.read(p.A); }
          break;
        }
        case 'source': {
          var emf = resistanceMain(c, 'emf', F); if (emf == null) emf = F.from(0);
          var r = F.read(p.r); if (r == null) r = F.from(0);
          var plusIsB = !p.flipped;
          var Vplus = plusIsB ? Vb : Va, Vminus = plusIsB ? Va : Vb;
          var iB = dc.I[c.id] != null ? dc.I[c.id] : F.from(0);
          info.voltage = F.sub(Vplus, Vminus);
          info.current = iB; info.emf = emf; info.r = r;
          info.internalLoss = F.mul(r, F.mul(iB, iB));
          info.emfPower = F.mul(emf, iB);
          info.usefulPower = F.mul(info.voltage, iB);
          info.mode = sourceMode(iB, F);
          addDissip(info.internalLoss);
          break;
        }
        case 'capacitor': {
          var C = resistanceMain(c, 'C', F);
          ddp = F.sub(Va, Vb); info.voltage = ddp; info.current = F.from(0); info.C = C;
          if (C != null) { info.charge = F.mul(C, ddp); info.energy = F.mul(F.from(0.5), F.mul(C, F.mul(ddp, ddp))); }
          break;
        }
        case 'inductor': {
          info.voltage = F.from(0);
          info.current = dc.I[c.id] != null ? dc.I[c.id] : F.from(0);
          info.L = resistanceMain(c, 'L', F);
          if (info.L != null) info.energy = F.mul(F.from(0.5), F.mul(info.L, F.mul(info.current, info.current)));
          break;
        }
        case 'voltmeter': {
          ddp = F.sub(Va, Vb); info.voltage = ddp; info.reading = ddp;
          info.current = (p.ideal === false) ? F.div(ddp, F.read(p.Rint) || F.from(1e7)) : F.from(0);
          break;
        }
        case 'ammeter': {
          if (p.ideal !== false) { cur = dc.I[c.id] != null ? dc.I[c.id] : F.from(0); info.voltage = F.from(0); }
          else { ddp = F.sub(Va, Vb); cur = F.div(ddp, F.read(p.Rint) || F.from(0.01)); info.voltage = ddp; }
          info.current = cur; info.reading = cur; break;
        }
        case 'galvanometer': {
          var Rg = F.read(p.Rint);
          var idealG = p.ideal === true || (F.isNumber && (Rg == null || Rg <= 1e-12));
          if (idealG) { cur = dc.I[c.id] != null ? dc.I[c.id] : F.from(0); info.voltage = F.from(0); }
          else { ddp = F.sub(Va, Vb); cur = F.div(ddp, Rg || F.from(50)); info.voltage = ddp; }
          info.current = cur; info.reading = cur; info.Rint = Rg; break;
        }
        default: break;
      }
      if (info.current != null) info.current = snap(info.current, ZERO_I);
      if (info.voltage != null) info.voltage = snap(info.voltage, ZERO_V);
      out.comp[c.id] = info;
    });

    out.summary.totalDissipated = totalDissip;

    var srcComps = circuit.components.filter(function (c) {
      if (c.type !== 'source') return false;
      var e = resistanceMain(c, 'emf', F);
      return e != null && !(F.isNumber && e === 0);
    });
    if (srcComps.length === 1) {
      var s = srcComps[0];
      out.summary.externalResistance = equivalentResistance(circuit, s.a, s.b, { F: F, exclude: new Set([s.id]) });
      var si = out.comp[s.id];
      out.summary.mainCurrent = si ? si.current : null;
      out.summary.terminalVoltage = si ? si.voltage : null;
    }

    out.transient = analyzeTransient(circuit, out, F);
    out.ok = true;
    return out;
  }

  function sourceMode(iB, F) {
    if (F.isNumber) return iB >= 0 ? 'gerador' : 'receptor';
    if (CS.Sym.isNumeric(iB)) return CS.Sym.numericValue(iB) >= 0 ? 'gerador' : 'receptor';
    return 'gerador/receptor (depende dos valores)';
  }

  function analyzeTransient(circuit, dcResult, F) {
    var caps = circuit.components.filter(function (c) { return c.type === 'capacitor'; });
    var inds = circuit.components.filter(function (c) { return c.type === 'inductor'; });
    if (caps.length === 0 && inds.length === 0) return null;
    var t = { capacitors: [], inductors: [] };

    caps.forEach(function (c) {
      var info = dcResult.comp[c.id];
      var C = resistanceMain(c, 'C', F);
      var Vf = info ? info.voltage : F.from(0);
      var V0 = F.read((c.params || {}).v0); if (V0 == null) V0 = F.from(0);
      var Rth = equivalentResistance(circuit, c.a, c.b, { F: F, exclude: new Set([c.id]) });
      var rec = { id: c.id, C: C, Vfinal: Vf, V0: V0, Rth: Rth };
      var rthOk = F.isNumber ? (isFinite(Rth) && Rth > 0) : (Rth != null);
      if (C != null && rthOk) {
        rec.tau = F.mul(Rth, C);
        rec.Qfinal = F.mul(C, Vf);
        rec.i0 = F.div(F.sub(Vf, V0), Rth);
        rec.energyFinal = F.mul(F.from(0.5), F.mul(C, F.mul(Vf, Vf)));
        rec.t99 = F.mul(F.from(5), rec.tau);
      } else if (C != null) { rec.tau = F.from(0); rec.Qfinal = F.mul(C, Vf); rec.note = 'Carga praticamente instantânea.'; }
      t.capacitors.push(rec);
    });
    inds.forEach(function (c) {
      var info = dcResult.comp[c.id];
      var L = resistanceMain(c, 'L', F);
      var iF = info ? info.current : F.from(0);
      var Rth = equivalentResistance(circuit, c.a, c.b, { F: F, exclude: new Set([c.id]) });
      var rec = { id: c.id, L: L, iFinal: iF, Rth: Rth };
      var rthOk = F.isNumber ? (isFinite(Rth) && Rth > 0) : (Rth != null);
      if (L != null && rthOk) { rec.tau = F.div(L, Rth); rec.energyFinal = F.mul(F.from(0.5), F.mul(L, F.mul(iF, iF))); rec.t99 = F.mul(F.from(5), rec.tau); }
      t.inductors.push(rec);
    });
    return t;
  }

  CS.solveCircuit = solveCircuit;
  CS.solveDC = solveDC;
  CS.equivalentResistance = equivalentResistance;
  CS.resistanceOf = resistanceOf;
  CS.scalarFmt = scalarFmt;
  CS.isSymbolicCircuit = isSymbolic;
  CS.mainVal = mainVal;
  CS.isSymbolLabel = isSymbolLabel;
  CS._num = num;

})(typeof window !== 'undefined' ? window : globalThis);
