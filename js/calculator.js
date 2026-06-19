/*
 * calculator.js — Calculadora avulsa (agora ALGÉBRICA).
 *
 * Para quando a questão dá apenas alguns valores soltos de UM componente.
 * O aluno preenche o que sabe — números OU incógnitas (ex.: R1, V3, ε) — e a
 * calculadora deduz o resto por propagação de fórmulas, usando o motor de
 * álgebra simbólica (symbolic.js). Os resultados podem sair em função das
 * incógnitas (ex.: U = 3·R1) e o caminho usado é mostrado embaixo.
 *
 * Aba 1 — Resistor / Fio:  R = ρ·L/A  e  Lei de Ohm (U=R·I, P=U·I=R·I²=U²/R)
 * Aba 2 — Gerador / Receptor:  U = ε ∓ r·I, potências e rendimento η.
 */
;(function (global) {
  'use strict';
  var CS = global.CS = global.CS || {};

  function fmtNum(v) { return (!isFinite(v)) ? '' : Number(v.toPrecision(6)).toString(); }
  function defined(x) { return x !== undefined && x !== null; }

  // Propagação de fórmulas até estabilizar. Cada valor é uma expressão do
  // motor simbólico (número ou em função de incógnitas).
  function propagate(vals, rules) {
    var S = CS.Sym, log = [], changed = true, guard = 0;
    while (changed && guard++ < 80) {
      changed = false;
      rules.forEach(function (rule) {
        if (defined(vals[rule.out])) return;
        for (var i = 0; i < rule.needs.length; i++) if (!defined(vals[rule.needs[i]])) return;
        var val; try { val = rule.f(vals, S); } catch (e) { return; }
        if (!defined(val)) return;
        vals[rule.out] = val;
        log.push({ key: rule.out, fm: rule.fm, value: val });
        changed = true;
      });
    }
    return log;
  }

  // ---- definição das abas -------------------------------------------------
  var RES_FIELDS = [
    ['rho', 'Resistividade ρ', 'Ω·m'], ['L', 'Comprimento L', 'm'], ['A', 'Área da seção A', 'm²'],
    ['R', 'Resistência R', 'Ω'], ['V', 'Tensão U', 'V'], ['I', 'Corrente I', 'A'], ['P', 'Potência P', 'W']
  ];
  var RES_RULES = [
    { out: 'R', needs: ['rho', 'L', 'A'], f: function (v, S) { return S.div(S.mul(v.rho, v.L), v.A); }, fm: 'R = ρ·L / A' },
    { out: 'rho', needs: ['R', 'A', 'L'], f: function (v, S) { return S.div(S.mul(v.R, v.A), v.L); }, fm: 'ρ = R·A / L' },
    { out: 'L', needs: ['R', 'A', 'rho'], f: function (v, S) { return S.div(S.mul(v.R, v.A), v.rho); }, fm: 'L = R·A / ρ' },
    { out: 'A', needs: ['rho', 'L', 'R'], f: function (v, S) { return S.div(S.mul(v.rho, v.L), v.R); }, fm: 'A = ρ·L / R' },
    { out: 'V', needs: ['R', 'I'], f: function (v, S) { return S.mul(v.R, v.I); }, fm: 'U = R·I' },
    { out: 'R', needs: ['V', 'I'], f: function (v, S) { return S.div(v.V, v.I); }, fm: 'R = U / I' },
    { out: 'I', needs: ['V', 'R'], f: function (v, S) { return S.div(v.V, v.R); }, fm: 'I = U / R' },
    { out: 'P', needs: ['V', 'I'], f: function (v, S) { return S.mul(v.V, v.I); }, fm: 'P = U·I' },
    { out: 'V', needs: ['P', 'I'], f: function (v, S) { return S.div(v.P, v.I); }, fm: 'U = P / I' },
    { out: 'I', needs: ['P', 'V'], f: function (v, S) { return S.div(v.P, v.V); }, fm: 'I = P / U' },
    { out: 'P', needs: ['R', 'I'], f: function (v, S) { return S.mul(v.R, S.pow(v.I, 2)); }, fm: 'P = R·I²' },
    { out: 'I', needs: ['P', 'R'], f: function (v, S) { return S.sqrt(S.div(v.P, v.R)); }, fm: 'I = √(P / R)' },
    { out: 'R', needs: ['P', 'I'], f: function (v, S) { return S.div(v.P, S.pow(v.I, 2)); }, fm: 'R = P / I²' },
    { out: 'P', needs: ['V', 'R'], f: function (v, S) { return S.div(S.pow(v.V, 2), v.R); }, fm: 'P = U² / R' },
    { out: 'R', needs: ['V', 'P'], f: function (v, S) { return S.div(S.pow(v.V, 2), v.P); }, fm: 'R = U² / P' }
  ];

  var SRC_FIELDS = [
    ['emf', 'FEM ε (ou FCEM ε′)', 'V'], ['r', 'Resistência interna r', 'Ω'], ['U', 'Tensão nos terminais U', 'V'],
    ['I', 'Corrente I', 'A'], ['Pt', 'Potência total', 'W'], ['Pu', 'Potência útil', 'W'],
    ['Pi', 'Potência interna (r·I²)', 'W'], ['eta', 'Rendimento η', '']
  ];
  function srcRules(mode) {
    var gen = mode !== 'receptor';
    return [
      gen ? { out: 'U', needs: ['emf', 'r', 'I'], f: function (v, S) { return S.sub(v.emf, S.mul(v.r, v.I)); }, fm: 'U = ε − r·I' }
          : { out: 'U', needs: ['emf', 'r', 'I'], f: function (v, S) { return S.add(v.emf, S.mul(v.r, v.I)); }, fm: "U = ε′ + r·I" },
      gen ? { out: 'emf', needs: ['U', 'r', 'I'], f: function (v, S) { return S.add(v.U, S.mul(v.r, v.I)); }, fm: 'ε = U + r·I' }
          : { out: 'emf', needs: ['U', 'r', 'I'], f: function (v, S) { return S.sub(v.U, S.mul(v.r, v.I)); }, fm: "ε′ = U − r·I" },
      gen ? { out: 'r', needs: ['emf', 'U', 'I'], f: function (v, S) { return S.div(S.sub(v.emf, v.U), v.I); }, fm: 'r = (ε − U)/I' }
          : { out: 'r', needs: ['emf', 'U', 'I'], f: function (v, S) { return S.div(S.sub(v.U, v.emf), v.I); }, fm: "r = (U − ε′)/I" },
      gen ? { out: 'I', needs: ['emf', 'U', 'r'], f: function (v, S) { return S.div(S.sub(v.emf, v.U), v.r); }, fm: 'I = (ε − U)/r' }
          : { out: 'I', needs: ['emf', 'U', 'r'], f: function (v, S) { return S.div(S.sub(v.U, v.emf), v.r); }, fm: "I = (U − ε′)/r" },
      gen ? { out: 'Pt', needs: ['emf', 'I'], f: function (v, S) { return S.mul(v.emf, v.I); }, fm: 'P_total = ε·I' }
          : { out: 'Pt', needs: ['U', 'I'], f: function (v, S) { return S.mul(v.U, v.I); }, fm: 'P_total = U·I' },
      gen ? { out: 'Pu', needs: ['U', 'I'], f: function (v, S) { return S.mul(v.U, v.I); }, fm: 'P_útil = U·I' }
          : { out: 'Pu', needs: ['emf', 'I'], f: function (v, S) { return S.mul(v.emf, v.I); }, fm: "P_útil = ε′·I" },
      { out: 'Pi', needs: ['r', 'I'], f: function (v, S) { return S.mul(v.r, S.pow(v.I, 2)); }, fm: 'P_interna = r·I²' },
      gen ? { out: 'eta', needs: ['U', 'emf'], f: function (v, S) { return S.div(v.U, v.emf); }, fm: 'η = U/ε' }
          : { out: 'eta', needs: ['emf', 'U'], f: function (v, S) { return S.div(v.emf, v.U); }, fm: "η = ε′/U" },
      gen ? { out: 'I', needs: ['Pt', 'emf'], f: function (v, S) { return S.div(v.Pt, v.emf); }, fm: 'I = P_total/ε' }
          : { out: 'I', needs: ['Pt', 'U'], f: function (v, S) { return S.div(v.Pt, v.U); }, fm: 'I = P_total/U' }
    ];
  }

  // ---- interface das abas -------------------------------------------------
  function buildPane(container, fields, opts) {
    opts = opts || {};
    var html = '';
    if (opts.header) html += opts.header;
    html += '<div class="calc-hint">Pode digitar <b>números</b> ou <b>incógnitas</b> (ex.: R1, V3, ε). O resultado sai em função delas — e você pode usar prefixos como 1u, 4k7.</div>';
    html += '<div class="calc-grid">';
    fields.forEach(function (f) {
      html += '<div class="calc-field" data-key="' + f[0] + '">' +
        '<label>' + f[1] + (f[2] ? ' <span style="color:var(--text-faint)">(' + f[2] + ')</span>' : '') + '</label>' +
        '<input type="text" data-key="' + f[0] + '" placeholder="—" autocomplete="off" spellcheck="false">' +
        '<div class="derived-tag">calculado</div></div>';
    });
    html += '</div>';
    html += '<div class="calc-derivation" data-role="deriv"><span class="none">Preencha os campos conhecidos e clique em “Calcular”.</span></div>';
    html += '<div class="calc-actions"><button class="btn primary" data-role="calc">Calcular</button>' +
      '<button class="btn" data-role="clear">Limpar</button></div>';
    container.innerHTML = html;
  }

  function readVals(container, keys) {
    var vals = {}, known = {};
    keys.forEach(function (k) {
      var inp = container.querySelector('input[data-key="' + k + '"]');
      var raw = inp.value.trim();
      inp.classList.remove('invalid');
      if (raw === '') { vals[k] = undefined; return; }
      try { vals[k] = CS.Sym.parse(raw); known[k] = true; }
      catch (e) { vals[k] = undefined; inp.classList.add('invalid'); }
    });
    return { vals: vals, known: known };
  }

  function displayValue(expr) {
    return CS.Sym.isNumeric(expr) ? fmtNum(CS.Sym.numericValue(expr)) : CS.Sym.format(expr);
  }
  function valueWithUnit(expr, unit) {
    if (CS.Sym.isNumeric(expr)) return CS.fmt(CS.Sym.numericValue(expr), unit);
    var f = CS.Sym.format(expr);
    return unit ? (f + ' ' + unit) : f;
  }

  function showResults(container, fields, vals, known, log) {
    fields.forEach(function (f) {
      var cell = container.querySelector('.calc-field[data-key="' + f[0] + '"]');
      var inp = cell.querySelector('input');
      var derived = !known[f[0]] && defined(vals[f[0]]);
      cell.classList.toggle('derived', derived);
      if (derived) inp.value = displayValue(vals[f[0]]);
    });
    var deriv = container.querySelector('[data-role="deriv"]');
    if (!log.length) {
      deriv.innerHTML = '<span class="none">Não deu para deduzir nada novo. Forneça mais um ou dois valores conhecidos.</span>';
      return;
    }
    var unitOf = {};
    fields.forEach(function (f) { unitOf[f[0]] = f[2]; });
    deriv.innerHTML = log.map(function (s) {
      return '→ <b>' + s.fm + '</b> = ' + valueWithUnit(s.value, unitOf[s.key]);
    }).join('<br>');
  }

  function wirePane(container, fields, getRules) {
    var keys = fields.map(function (f) { return f[0]; });
    container.querySelector('[data-role="calc"]').addEventListener('click', function () {
      var rv = readVals(container, keys);
      var log = propagate(rv.vals, getRules());
      showResults(container, fields, rv.vals, rv.known, log);
    });
    container.querySelector('[data-role="clear"]').addEventListener('click', function () {
      container.querySelectorAll('input').forEach(function (i) { i.value = ''; i.classList.remove('invalid'); });
      container.querySelectorAll('.calc-field').forEach(function (c) { c.classList.remove('derived'); });
      container.querySelector('[data-role="deriv"]').innerHTML = '<span class="none">Preencha os campos conhecidos e clique em “Calcular”.</span>';
    });
  }

  var srcMode = 'gerador';

  function init() {
    var resPane = document.getElementById('calcResistorPane');
    var srcPane = document.getElementById('calcSourcePane');

    buildPane(resPane, RES_FIELDS);
    wirePane(resPane, RES_FIELDS, function () { return RES_RULES; });

    var srcHeader = '<div class="mode-toggle" style="max-width:340px;">' +
      '<button data-m="gerador" class="active">Gerador (U = ε − r·I)</button>' +
      '<button data-m="receptor">Receptor (U = ε′ + r·I)</button></div>';
    buildPane(srcPane, SRC_FIELDS, { header: srcHeader });
    wirePane(srcPane, SRC_FIELDS, function () { return srcRules(srcMode); });
    srcPane.querySelectorAll('.mode-toggle button[data-m]').forEach(function (b) {
      b.addEventListener('click', function () {
        srcMode = this.getAttribute('data-m');
        srcPane.querySelectorAll('.mode-toggle button').forEach(function (x) { x.classList.remove('active'); });
        this.classList.add('active');
      });
    });
  }

  CS.Calculator = { init: init };

})(typeof window !== 'undefined' ? window : globalThis);
