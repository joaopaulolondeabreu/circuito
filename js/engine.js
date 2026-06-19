/*
 * engine.js — Motor de física do simulador de circuitos.
 *
 * Resolve circuitos elétricos arbitrários (série, paralelo, misto, ponte,
 * etc.) usando ANÁLISE NODAL MODIFICADA (MNA), que é a forma geral e
 * automática de aplicar as Leis de Kirchhoff + Lei de Ohm de uma só vez.
 *
 * Ideia da MNA:
 *  - As incógnitas são os POTENCIAIS de cada nó (em relação a um nó de
 *    referência, o "terra") e as CORRENTES em elementos que impõem tensão
 *    (geradores, amperímetros ideais, indutores em regime).
 *  - Cada componente "carimba" (stamp) suas contribuições numa matriz.
 *  - Resolvemos o sistema linear → temos todos os potenciais e correntes.
 *
 * Convenções de unidades: SI (Volt, Ampère, Ohm, Farad, Henry, metro...).
 *
 * Tipos de componente aceitos (campo .type):
 *   resistor    (params.mode = 'direct' usa params.R; 'geom' usa rho,L,A)
 *   wireIdeal   (resistência nula — funde os dois nós)
 *   source      (params.kind = 'gerador' | 'receptor'; usa emf, r)
 *   capacitor   (params.C, params.v0 opcional)
 *   inductor    (params.L, params.i0 opcional)
 *   voltmeter   (params.ideal; se não, params.Rint)
 *   ammeter     (params.ideal; se não, params.Rint)
 *   galvanometer(params.Rint resistência da bobina; params.ideal)
 *
 * Cada componente liga exatamente dois nós: .a e .b (ids de nó, strings).
 * Fontes têm polaridade: terminal + é .b por padrão (params.flipped troca).
 */
;(function (global) {
  'use strict';
  var CS = global.CS = global.CS || {};

  // Condutância de fuga colocada em paralelo com cada capacitor, para que
  // nós ligados só por capacitores ainda tenham potencial definido em CC.
  // 1e-11 S = 100 GΩ: efeito desprezível nos resultados, e a corrente de
  // fuga (V·GLEAK) fica abaixo do limiar de "zero" usado na exibição.
  var GLEAK = 1e-11;
  var ZERO_I = 1e-9; // correntes abaixo disso são tratadas como zero
  var ZERO_V = 1e-9; // tensões abaixo disso são tratadas como zero

  function num(v, dflt) {
    if (v === '' || v === null || v === undefined) return dflt;
    if (typeof v === 'number') return isFinite(v) ? v : dflt;
    // Aceita vírgula decimal e sufixos de engenharia (1u, 4k7...) via CS.parseEng.
    var x = CS.parseEng ? CS.parseEng(v) : parseFloat(String(v).replace(',', '.'));
    return isFinite(x) ? x : dflt;
  }

  // ---- Union-Find (para fundir nós ligados por fios ideais) -------------
  function UF() { this.p = {}; }
  UF.prototype.find = function (x) {
    if (this.p[x] === undefined) { this.p[x] = x; return x; }
    var root = x;
    while (this.p[root] !== root) root = this.p[root];
    while (this.p[x] !== root) { var nx = this.p[x]; this.p[x] = root; x = nx; }
    return root;
  };
  UF.prototype.union = function (a, b) {
    var ra = this.find(a), rb = this.find(b);
    if (ra !== rb) this.p[ra] = rb;
  };

  // Resistência de um componente resistivo (ou null se não for resistivo).
  function resistanceOf(c) {
    if (c.type === 'resistor') {
      if (c.params && c.params.mode === 'geom') {
        var rho = num(c.params.rho, NaN), L = num(c.params.L, NaN), A = num(c.params.A, NaN);
        if (!isFinite(rho) || !isFinite(L) || !isFinite(A) || A <= 0) return NaN;
        return rho * L / A;
      }
      return num(c.params && c.params.R, NaN);
    }
    return null;
  }

  /*
   * solveDC — resolve o circuito em corrente contínua (regime permanente).
   *
   * options:
   *   zeroSources : se true, zera as FEM dos geradores/receptores (mantém r).
   *                 Usado para calcular resistência equivalente / Thévenin.
   *   injections  : lista de {a,b,amps} — fonte de corrente que injeta `amps`
   *                 no nó a e retira do nó b. Usada para medir resistência.
   *   exclude     : Set de ids de componentes a ignorar (ex.: o próprio
   *                 capacitor cuja resistência de Thévenin queremos medir).
   *   openComps   : Set de ids tratados como circuito aberto (ignorados).
   *
   * Retorna { ok, error, V:{nodeId->volts}, I:{compId->amps}, rep:fn }.
   * V usa os ids de nó ORIGINAIS (mapeados pelo representante de fusão).
   * I[compId] é a corrente no sentido a→b (interno do elemento de tensão).
   */
  function solveDC(circuit, options) {
    options = options || {};
    var exclude = options.exclude || new Set();
    var openComps = options.openComps || new Set();
    var zeroSources = !!options.zeroSources;
    var injections = options.injections || [];

    var comps = circuit.components.filter(function (c) {
      return !exclude.has(c.id) && !openComps.has(c.id);
    });

    // 1) Funde nós ligados por fios ideais (e resistores geométricos nulos).
    var uf = new UF();
    // garante que todo nó exista no UF
    circuit.components.forEach(function (c) { uf.find(c.a); uf.find(c.b); });
    comps.forEach(function (c) {
      if (c.type === 'wireIdeal') uf.union(c.a, c.b);
      else if (c.type === 'resistor') {
        var R = resistanceOf(c);
        if (isFinite(R) && R <= 1e-12) uf.union(c.a, c.b);
      }
    });
    function rep(n) { return uf.find(n); }

    // 2) Monta a lista de elementos a carimbar e descobre quais nós são usados.
    //    "ramos de tensão" = elementos que impõem V e cujo I é incógnita.
    var conductances = []; // {a,b,g}
    var branches = [];     // {compId,a,b,E,Rs}
    var usedNodes = {};
    function useNode(n) { usedNodes[n] = true; }

    function addCond(a, b, g) {
      a = rep(a); b = rep(b);
      conductances.push({ a: a, b: b, g: g });
      useNode(a); useNode(b);
    }
    function addBranch(compId, a, b, E, Rs) {
      a = rep(a); b = rep(b);
      branches.push({ compId: compId, a: a, b: b, E: E, Rs: Rs });
      useNode(a); useNode(b);
    }

    var problems = [];

    comps.forEach(function (c) {
      var a = c.a, b = c.b, p = c.params || {};
      switch (c.type) {
        case 'wireIdeal':
          break; // já fundido
        case 'resistor': {
          var R = resistanceOf(c);
          if (!isFinite(R)) { problems.push('Resistor "' + (p.label || c.id) + '" sem valor de resistência.'); break; }
          if (R <= 1e-12) break; // fundido como fio
          addCond(a, b, 1 / R);
          break;
        }
        case 'source': {
          var emf = zeroSources ? 0 : num(p.emf, 0);
          var r = num(p.r, 0);
          // terminal + é b por padrão; flipped torna + = a.
          // FEM eleva o potencial do terminal − para o +.
          var plusIsB = !p.flipped;
          var aa = plusIsB ? a : b;   // − terminal (origem do ramo)
          var bb = plusIsB ? b : a;   // + terminal (destino do ramo)
          addBranch(c.id, aa, bb, emf, Math.max(0, r));
          break;
        }
        case 'capacitor':
          // Regime permanente CC: capacitor é circuito aberto.
          // Pequena fuga para manter o nó referenciado.
          addCond(a, b, GLEAK);
          break;
        case 'inductor':
          // Regime permanente CC: indutor é curto (FEM=0, Rs=0) → lê corrente.
          addBranch(c.id, a, b, 0, 0);
          break;
        case 'voltmeter':
          if (p.ideal === false) addCond(a, b, 1 / Math.max(1e-9, num(p.Rint, 1e7)));
          // ideal: circuito aberto, não carimba nada (lê só a ddp).
          break;
        case 'ammeter': {
          var ideal = p.ideal !== false;
          if (ideal) addBranch(c.id, a, b, 0, 0);
          else addCond(a, b, 1 / Math.max(1e-9, num(p.Rint, 0.01)));
          break;
        }
        case 'galvanometer': {
          var Rg = num(p.Rint, 0);
          if (p.ideal === true || Rg <= 1e-12) addBranch(c.id, a, b, 0, 0);
          else addCond(a, b, 1 / Rg);
          break;
        }
        default:
          break;
      }
    });

    // injeções de corrente também "usam" seus nós
    injections.forEach(function (inj) { useNode(rep(inj.a)); useNode(rep(inj.b)); });

    var nodeList = Object.keys(usedNodes);
    if (nodeList.length === 0) {
      return { ok: true, V: {}, I: {}, rep: rep, problems: problems };
    }

    // 3) Acha componentes conexas (entre nós-representantes) para escolher
    //    um terra por sub-circuito isolado.
    var adj = {};
    nodeList.forEach(function (n) { adj[n] = []; });
    function link(a, b) { if (a !== b) { adj[a].push(b); adj[b].push(a); } }
    conductances.forEach(function (e) { link(e.a, e.b); });
    branches.forEach(function (e) { link(e.a, e.b); });
    injections.forEach(function (inj) { link(rep(inj.a), rep(inj.b)); });

    var ground = {};   // nodeId -> true se é terra
    var seen = {};
    nodeList.forEach(function (start) {
      if (seen[start]) return;
      // BFS marca a componente; o primeiro nó vira terra.
      ground[start] = true;
      var stack = [start];
      seen[start] = true;
      while (stack.length) {
        var u = stack.pop();
        adj[u].forEach(function (w) { if (!seen[w]) { seen[w] = true; stack.push(w); } });
      }
    });

    // 4) Indexa incógnitas: nós não-terra + correntes de ramo.
    var nodeIndex = {};
    var idx = 0;
    nodeList.forEach(function (n) { if (!ground[n]) nodeIndex[n] = idx++; });
    var nNodes = idx;
    branches.forEach(function (br, k) { br.idx = nNodes + k; });
    var size = nNodes + branches.length;

    if (size === 0) {
      // Tudo aterrado (só nós isolados) → potenciais nulos.
      var Vz = {};
      Object.keys(uf.p).forEach(function (orig) { Vz[orig] = 0; });
      return { ok: true, V: Vz, I: {}, rep: rep, problems: problems };
    }

    // 5) Monta a matriz e o vetor independente.
    var M = [];
    for (var i = 0; i < size; i++) { M.push(new Array(size).fill(0)); }
    var rhs = new Array(size).fill(0);
    function ni(n) { return ground[n] ? -1 : nodeIndex[n]; }

    conductances.forEach(function (e) {
      var ia = ni(e.a), ib = ni(e.b), g = e.g;
      if (ia >= 0) M[ia][ia] += g;
      if (ib >= 0) M[ib][ib] += g;
      if (ia >= 0 && ib >= 0) { M[ia][ib] -= g; M[ib][ia] -= g; }
    });
    branches.forEach(function (br) {
      var ia = ni(br.a), ib = ni(br.b), k = br.idx;
      if (ia >= 0) { M[ia][k] += 1; M[k][ia] += 1; }
      if (ib >= 0) { M[ib][k] -= 1; M[k][ib] -= 1; }
      M[k][k] -= br.Rs;
      rhs[k] = -br.E;
    });
    injections.forEach(function (inj) {
      var ia = ni(rep(inj.a)), ib = ni(rep(inj.b));
      if (ia >= 0) rhs[ia] += inj.amps;
      if (ib >= 0) rhs[ib] -= inj.amps;
    });

    // 6) Resolve.
    var x = CS.solveLinear(M, rhs);
    if (!x) {
      return { ok: false, error: 'Sistema sem solução única. Verifique curtos em fontes ideais, fios em loop sobre uma fonte, ou trechos soltos.', problems: problems };
    }

    // 7) Recupera potenciais (para TODOS os nós originais via representante).
    var V = {};
    Object.keys(uf.p).forEach(function (orig) {
      var r = rep(orig);
      var pot = ground[r] ? 0 : (nodeIndex[r] !== undefined ? x[nodeIndex[r]] : 0);
      V[orig] = pot;
    });
    var I = {};
    branches.forEach(function (br) { I[br.compId] = x[br.idx]; });

    return { ok: true, V: V, I: I, rep: rep, problems: problems };
  }

  /*
   * equivalentResistance — resistência equivalente entre dois nós.
   * Zera as fontes (mantém resistências internas), injeta 1 A e mede a ddp.
   * Retorna Ω (pode ser Infinity se os nós ficarem desconectados).
   */
  function equivalentResistance(circuit, nodeA, nodeB, opts) {
    opts = opts || {};
    var res = solveDC(circuit, {
      zeroSources: true,
      exclude: opts.exclude,
      openComps: opts.openComps,
      injections: [{ a: nodeA, b: nodeB, amps: 1 }]
    });
    if (!res.ok) return Infinity;
    var ra = res.rep(nodeA), rb = res.rep(nodeB);
    if (ra === rb) return 0;
    var va = res.V[nodeA], vb = res.V[nodeB];
    if (va === undefined || vb === undefined) return Infinity;
    var R = va - vb; // /1 A
    if (!isFinite(R) || R > 1e11) return Infinity;
    return Math.abs(R);
  }

  // ---- Resultado completo, formatado para a interface --------------------
  /*
   * solveCircuit — função principal chamada pela interface.
   * Devolve resultados por componente + resumo + análise transitória.
   */
  function solveCircuit(circuit) {
    var out = { ok: false, error: null, nodeV: {}, comp: {}, summary: {}, transient: null, warnings: [] };

    if (!circuit.components || circuit.components.length === 0) {
      out.error = 'Nenhum componente no circuito.';
      return out;
    }

    var dc = solveDC(circuit, {});
    if (!dc.ok) { out.error = dc.error; return out; }
    // "Limpa" ruído numérico e correntes de fuga desprezíveis → zero exato.
    Object.keys(dc.V).forEach(function (k) { if (Math.abs(dc.V[k]) < ZERO_V) dc.V[k] = 0; });
    Object.keys(dc.I).forEach(function (k) { if (Math.abs(dc.I[k]) < ZERO_I) dc.I[k] = 0; });
    out.nodeV = dc.V;
    if (dc.problems && dc.problems.length) out.warnings = out.warnings.concat(dc.problems);

    var totalDissip = 0;
    var sources = [];

    circuit.components.forEach(function (c) {
      var p = c.params || {};
      var Va = dc.V[c.a] || 0, Vb = dc.V[c.b] || 0;
      var info = { id: c.id, type: c.type };
      var ddp, cur, R;

      switch (c.type) {
        case 'wireIdeal':
          info.voltage = 0; info.current = null; // corrente não isolável
          break;
        case 'resistor': {
          R = resistanceOf(c);
          info.R = R;
          if (!isFinite(R)) { info.error = 'sem valor'; break; }
          if (R <= 1e-12) { info.voltage = 0; info.current = null; break; }
          ddp = Va - Vb;
          cur = ddp / R;
          info.voltage = ddp;
          info.current = cur;
          info.power = ddp * cur;
          totalDissip += Math.abs(info.power);
          if (p.mode === 'geom') {
            info.rho = num(p.rho, NaN); info.L = num(p.L, NaN); info.A = num(p.A, NaN);
          }
          break;
        }
        case 'source': {
          var emf = num(p.emf, 0), r = num(p.r, 0);
          var plusIsB = !p.flipped;
          var Vplus = plusIsB ? Vb : Va, Vminus = plusIsB ? Va : Vb;
          // corrente de ramo é definida no sentido − → + (interno).
          var iBranch = dc.I[c.id];
          if (iBranch === undefined) iBranch = 0;
          var U = Vplus - Vminus;          // ddp nos terminais (+ menos −)
          info.voltage = U;
          info.current = iBranch;          // > 0: sai do +, opera como gerador
          info.emf = emf; info.r = r;
          info.internalLoss = r * iBranch * iBranch;
          info.emfPower = emf * iBranch;   // potência convertida pela FEM
          info.usefulPower = U * iBranch;
          info.mode = (iBranch >= 0) ? 'gerador' : 'receptor';
          totalDissip += info.internalLoss;
          sources.push(info);
          break;
        }
        case 'capacitor': {
          var C = num(p.C, NaN);
          ddp = Va - Vb;
          info.voltage = ddp; info.current = 0; info.C = C;
          if (isFinite(C)) { info.charge = C * ddp; info.energy = 0.5 * C * ddp * ddp; }
          break;
        }
        case 'inductor': {
          info.voltage = 0; // curto em CC
          info.current = dc.I[c.id] !== undefined ? dc.I[c.id] : 0;
          info.L = num(p.L, NaN);
          if (isFinite(info.L)) info.energy = 0.5 * info.L * info.current * info.current;
          break;
        }
        case 'voltmeter': {
          ddp = Va - Vb;
          info.voltage = ddp;
          info.reading = Math.abs(ddp);
          if (p.ideal === false) { info.current = ddp / Math.max(1e-9, num(p.Rint, 1e7)); }
          else info.current = 0;
          break;
        }
        case 'ammeter': {
          var idealA = p.ideal !== false;
          if (idealA) { cur = dc.I[c.id] !== undefined ? dc.I[c.id] : 0; info.voltage = 0; }
          else { ddp = Va - Vb; cur = ddp / Math.max(1e-9, num(p.Rint, 0.01)); info.voltage = ddp; }
          info.current = cur; info.reading = Math.abs(cur);
          break;
        }
        case 'galvanometer': {
          var Rg = num(p.Rint, 0);
          if (p.ideal === true || Rg <= 1e-12) { cur = dc.I[c.id] !== undefined ? dc.I[c.id] : 0; info.voltage = 0; }
          else { ddp = Va - Vb; cur = ddp / Rg; info.voltage = ddp; }
          info.current = cur; info.reading = Math.abs(cur); info.Rint = Rg;
          break;
        }
        default: break;
      }
      if (info.current != null && Math.abs(info.current) < ZERO_I) info.current = 0;
      if (info.voltage != null && Math.abs(info.voltage) < ZERO_V) info.voltage = 0;
      if (info.power != null && Math.abs(info.power) < 1e-9) info.power = 0;
      if (info.reading != null && Math.abs(info.reading) < ZERO_I) info.reading = 0;
      out.comp[c.id] = info;
    });

    out.summary.totalDissipated = totalDissip;

    // Resumo de fonte única: resistência externa e corrente principal.
    var srcComps = circuit.components.filter(function (c) { return c.type === 'source' && num((c.params || {}).emf, 0) !== 0; });
    if (srcComps.length === 1) {
      var s = srcComps[0];
      var Rext = equivalentResistance(circuit, s.a, s.b, { exclude: new Set([s.id]) });
      out.summary.externalResistance = Rext;
      var si = out.comp[s.id];
      out.summary.mainCurrent = si ? Math.abs(si.current) : null;
      out.summary.terminalVoltage = si ? si.voltage : null;
      out.summary.emf = num(s.params.emf, 0);
      out.summary.internalR = num(s.params.r, 0);
    }

    // ---- Análise transitória (capacitores e indutores) -------------------
    out.transient = analyzeTransient(circuit, out);

    out.ok = true;
    return out;
  }

  /*
   * analyzeTransient — para cada capacitor/indutor calcula a constante de
   * tempo τ vista por ele (resistência de Thévenin entre seus terminais) e
   * as grandezas do regime transitório (carga/descarga).
   *
   * Para o capacitor: τ = R_th · C, V_C(t) = V_f + (V0 − V_f)·e^(−t/τ).
   * Para o indutor:  τ = L / R_th, i_L(t) = i_f + (i0 − i_f)·e^(−t/τ).
   */
  function analyzeTransient(circuit, dcResult) {
    var caps = circuit.components.filter(function (c) { return c.type === 'capacitor'; });
    var inds = circuit.components.filter(function (c) { return c.type === 'inductor'; });
    if (caps.length === 0 && inds.length === 0) return null;

    var t = { capacitors: [], inductors: [] };

    caps.forEach(function (c) {
      var p = c.params || {};
      var C = num(p.C, NaN);
      var info = out_cap(dcResult, c.id);
      var Vf = info ? info.voltage : 0;       // tensão final (regime)
      var V0 = num(p.v0, 0);
      // R de Thévenin vista pelo capacitor: remove ESTE capacitor e mede R.
      var Rth = equivalentResistance(circuit, c.a, c.b, { exclude: new Set([c.id]) });
      var rec = { id: c.id, C: C, Vfinal: Vf, V0: V0, Rth: Rth };
      if (isFinite(C) && isFinite(Rth) && Rth > 0) {
        rec.tau = Rth * C;
        rec.Qfinal = C * Vf;
        rec.Q0 = C * V0;
        rec.i0 = (Vf - V0) / Rth;            // corrente inicial de carga
        rec.energyFinal = 0.5 * C * Vf * Vf;
        rec.t99 = 5 * rec.tau;               // ~99,3% em 5τ
      } else if (isFinite(C)) {
        rec.tau = 0; rec.Qfinal = C * Vf; rec.note = 'Carga praticamente instantânea (sem resistência em série apreciável).';
      }
      t.capacitors.push(rec);
    });

    inds.forEach(function (c) {
      var p = c.params || {};
      var L = num(p.L, NaN);
      var info = out_cap(dcResult, c.id);
      var iFinal = info ? info.current : 0;
      var i0 = num(p.i0, 0);
      var Rth = equivalentResistance(circuit, c.a, c.b, { exclude: new Set([c.id]) });
      var rec = { id: c.id, L: L, iFinal: iFinal, i0: i0, Rth: Rth };
      if (isFinite(L) && isFinite(Rth) && Rth > 0) {
        rec.tau = L / Rth;
        rec.energyFinal = 0.5 * L * iFinal * iFinal;
        rec.t99 = 5 * rec.tau;
      }
      t.inductors.push(rec);
    });

    return t;
  }

  function out_cap(dcResult, id) { return dcResult.comp[id]; }

  CS.solveCircuit = solveCircuit;
  CS.solveDC = solveDC;
  CS.equivalentResistance = equivalentResistance;
  CS.resistanceOf = resistanceOf;
  CS._num = num;

})(typeof window !== 'undefined' ? window : globalThis);
