/*
 * ui.js — Interface interativa: desenhar o circuito no quadro, selecionar e
 * editar componentes, arrastar nós, resolver e mostrar os resultados.
 *
 * Modelo de dados (estado S):
 *   S.components: [{ id, type, flipped, params:{...}, a:{x,y}, b:{x,y} }]
 *      Cada componente liga dois pontos do quadro. Dois terminais nas MESMAS
 *      coordenadas (alinhadas à grade) formam o mesmo nó elétrico — é assim que
 *      se criam ligações em série, paralelo, junções, etc.
 */
;(function (global) {
  'use strict';
  var CS = global.CS = global.CS || {};
  var SVGNS = 'http://www.w3.org/2000/svg';
  var GRID = 20;

  var S = {
    components: [], selectedId: null,
    mode: 'select', placeType: null, placeFirst: null,
    results: null, history: [], cursor: null, counter: 0,
    dragEnded: false
  };
  var D = {}; // referências do DOM

  // ---- utilidades ---------------------------------------------------------
  function svgEl(tag, attrs, inner) {
    var e = document.createElementNS(SVGNS, tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (inner != null) e.innerHTML = inner;
    return e;
  }
  function uid() { return 'c' + (++S.counter); }
  function snap(v) { return Math.round(v / GRID) * GRID; }
  function key(p) { return p.x + ',' + p.y; }
  function parseKey(s) { var a = s.split(','); return { x: +a[0], y: +a[1] }; }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  function clientToSvg(evt) {
    var pt = D.svg.createSVGPoint();
    pt.x = evt.clientX; pt.y = evt.clientY;
    var m = D.svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    var p = pt.matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  }
  function snapPt(p) { return { x: snap(p.x), y: snap(p.y) }; }

  function geom(c) {
    var dx = c.b.x - c.a.x, dy = c.b.y - c.a.y;
    var len = Math.hypot(dx, dy) || 1;
    return {
      len: len, ang: Math.atan2(dy, dx) * 180 / Math.PI,
      mx: (c.a.x + c.b.x) / 2, my: (c.a.y + c.b.y) / 2,
      nx: -dy / len, ny: dx / len
    };
  }

  function toast(msg, kind) {
    D.toast.textContent = msg;
    D.toast.className = 'show' + (kind ? ' ' + kind : '');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { D.toast.className = ''; }, 3200);
  }
  function hint(msg) {
    if (msg) { D.hintText.textContent = msg; D.hintBar.classList.add('show'); }
    else D.hintBar.classList.remove('show');
  }

  // ---- histórico (desfazer) ----------------------------------------------
  function pushHistory() {
    S.history.push(JSON.stringify(S.components));
    if (S.history.length > 60) S.history.shift();
  }
  function undo() {
    if (!S.history.length) { toast('Nada para desfazer.'); return; }
    S.components = JSON.parse(S.history.pop());
    S.selectedId = null; clearResults(); renderAll(); renderInspector();
  }
  function clearResults() { S.results = null; updateSummary(); }

  // ---- nós (derivados dos componentes) -----------------------------------
  function nodes() {
    var map = {};
    S.components.forEach(function (c) {
      [c.a, c.b].forEach(function (p) {
        var k = key(p);
        if (!map[k]) map[k] = { x: p.x, y: p.y, deg: 0 };
        map[k].deg++;
      });
    });
    return map;
  }

  function isIncomplete(c) {
    var p = c.params || {};
    if (c.type === 'resistor') return !isFinite(CS.resistanceOf(c));
    if (c.type === 'source') return !isFinite(CS.parseEng(p.emf));
    if (c.type === 'capacitor') return !isFinite(CS.parseEng(p.C));
    if (c.type === 'inductor') return !isFinite(CS.parseEng(p.L));
    return false;
  }

  // ========================================================================
  //  RENDERIZAÇÃO
  // ========================================================================
  function renderAll() {
    renderComponents();
    renderResults();
    renderNodes();
    renderPreview();
  }

  function addText(layer, x, y, str, cls, anchor, extra) {
    var attrs = {
      x: x.toFixed(1), y: y.toFixed(1), class: cls,
      'text-anchor': anchor || 'middle',
      style: 'paint-order:stroke;stroke:var(--bg);stroke-width:3px;stroke-linejoin:round'
    };
    if (extra) for (var k in extra) attrs[k] = extra[k];
    var t = svgEl('text', attrs);
    t.textContent = str;
    layer.appendChild(t);
    return t;
  }

  function renderComponents() {
    var L = D.componentsLayer, LB = D.labelsLayer;
    L.textContent = ''; LB.textContent = '';
    S.components.forEach(function (c) {
      var g = geom(c);
      var grp = svgEl('g', {
        class: 'comp-g' + (c.id === S.selectedId ? ' selected' : '') + (isIncomplete(c) ? ' incomplete' : ''),
        'data-id': c.id,
        transform: 'translate(' + g.mx + ',' + g.my + ') rotate(' + g.ang.toFixed(2) + ')'
      }, CS.Components.draw(c, g.len));
      grp.addEventListener('click', onCompClick);
      L.appendChild(grp);

      // letra central de instrumentos / receptor (sempre na horizontal)
      var gl = CS.Components.glyph(c);
      if (gl) addText(LB, g.mx, g.my + 4, gl, 'label-text', 'middle');

      // sinais + / − para fontes
      if (c.type === 'source') {
        var plus = c.flipped ? c.a : c.b, minus = c.flipped ? c.b : c.a;
        var pm = { x: (plus.x * 0.78 + g.mx * 0.22), y: (plus.y * 0.78 + g.my * 0.22) };
        var mm = { x: (minus.x * 0.78 + g.mx * 0.22), y: (minus.y * 0.78 + g.my * 0.22) };
        addText(LB, pm.x + g.nx * 11, pm.y + g.ny * 11, '+', 'label-text');
        addText(LB, mm.x + g.nx * 11, mm.y + g.ny * 11, '−', 'label-text');
      }

      // nome/valor acima do componente
      var lbl = CS.Components.shortLabel(c);
      if (lbl) addText(LB, g.mx - g.nx * 20, g.my - g.ny * 20, lbl, 'label-text');
    });
  }

  function renderResults() {
    var R = D.resultsLayer; R.textContent = '';
    if (!S.results || !S.results.ok) return;
    var res = S.results;

    S.components.forEach(function (c) {
      var info = res.comp[c.id]; if (!info) return;
      var g = geom(c);
      var lines = resultLines(c, info, res);
      lines.forEach(function (txt, i) {
        addText(R, g.mx + g.nx * (16 + i * 13), g.my + g.ny * (16 + i * 13), txt, 'result-text');
      });
    });

    // potencial em cada nó
    var nm = nodes();
    Object.keys(nm).forEach(function (k) {
      var n = nm[k];
      var v = res.nodeV[k];
      if (v === undefined) return;
      addText(R, n.x + 9, n.y - 8, CS.fmt(v, 'V'), 'result-text', 'start',
        { style: 'paint-order:stroke;stroke:var(--bg);stroke-width:3px;fill:var(--text-faint);font-size:10px' });
    });
  }

  function resultLines(c, info, res) {
    var f = CS.fmt;
    switch (c.type) {
      case 'resistor':
        if (info.current == null) return [];
        return ['I = ' + f(Math.abs(info.current), 'A'), 'U = ' + f(Math.abs(info.voltage), 'V')];
      case 'source':
        return ['I = ' + f(Math.abs(info.current), 'A'), 'U = ' + f(info.voltage, 'V')];
      case 'capacitor': {
        var l = ['U = ' + f(info.voltage, 'V')];
        if (info.charge != null) l.push('Q = ' + f(info.charge, 'C'));
        return l;
      }
      case 'inductor': return ['I = ' + f(info.current, 'A')];
      case 'voltmeter': return ['V: ' + f(info.reading, 'V')];
      case 'ammeter': return ['A: ' + f(info.reading, 'A')];
      case 'galvanometer': return ['G: ' + f(info.reading, 'A')];
      default: return [];
    }
  }

  function renderNodes() {
    var L = D.nodesLayer; L.textContent = '';
    var nm = nodes();
    Object.keys(nm).forEach(function (k) {
      var n = nm[k];
      var dot = svgEl('circle', {
        cx: n.x, cy: n.y, r: n.deg >= 3 ? 5.5 : 4,
        class: 'node-dot' + (n.deg >= 3 ? ' junction' : ''),
        'data-key': k
      });
      dot.addEventListener('pointerdown', onNodeDown);
      L.appendChild(dot);
    });
  }

  function renderPreview() {
    var L = D.wiresPreviewLayer; L.textContent = '';
    if (S.mode !== 'place') return;
    if (S.placeFirst) {
      L.appendChild(svgEl('circle', { cx: S.placeFirst.x, cy: S.placeFirst.y, r: 5, class: 'pending-marker' }));
      if (S.cursor) {
        L.appendChild(svgEl('line', {
          id: 'previewLine', x1: S.placeFirst.x, y1: S.placeFirst.y,
          x2: S.cursor.x, y2: S.cursor.y
        }));
      }
    }
    if (S.cursor) L.appendChild(svgEl('circle', { cx: S.cursor.x, cy: S.cursor.y, r: 4, class: 'pending-marker', 'fill-opacity': '0.5' }));
  }

  // ========================================================================
  //  INTERAÇÃO
  // ========================================================================
  function onCanvasClick(evt) {
    if (S.dragEnded) { S.dragEnded = false; return; }
    if (S.mode === 'place') {
      var p = snapPt(clientToSvg(evt));
      if (!S.placeFirst) {
        S.placeFirst = p;
        hint('Agora clique no SEGUNDO terminal do ' + CS.Components.TYPES[S.placeType.type].title({ params: S.placeType.extra || {} }).toLowerCase() + '. (ESC cancela)');
        renderPreview();
      } else {
        if (dist(S.placeFirst, p) < CS.Components.MIN_LEN - 0.1) {
          toast('Os dois pontos estão muito próximos — afaste mais o segundo terminal.', 'error');
          return;
        }
        pushHistory();
        var c = {
          id: uid(), type: S.placeType.type, flipped: false,
          params: CS.Components.defaults(S.placeType.type, S.placeType.extra),
          a: S.placeFirst, b: p
        };
        S.components.push(c);
        S.selectedId = c.id;
        S.placeFirst = null;
        clearResults();
        renderAll(); renderInspector();
        hint('Componente posicionado! Clique 2 novos pontos para outro igual, ou ESC para parar.');
      }
      return;
    }
    // modo seleção: clique no fundo → desseleciona
    S.selectedId = null;
    renderAll(); renderInspector();
  }

  function onCompClick(evt) {
    if (S.mode === 'place') return; // deixa o clique virar ponto
    evt.stopPropagation();
    S.selectedId = this.getAttribute('data-id');
    renderAll(); renderInspector();
  }

  function onNodeDown(evt) {
    if (S.mode !== 'select') return; // em modo posicionar, o clique cria ponto
    evt.preventDefault(); evt.stopPropagation();
    var cur = parseKey(this.getAttribute('data-key'));
    var moved = false;
    function move(e) {
      var p = snapPt(clientToSvg(e));
      if (p.x === cur.x && p.y === cur.y) return;
      if (!moved) { pushHistory(); moved = true; }
      S.components.forEach(function (c) {
        if (c.a.x === cur.x && c.a.y === cur.y) c.a = { x: p.x, y: p.y };
        if (c.b.x === cur.x && c.b.y === cur.y) c.b = { x: p.x, y: p.y };
      });
      cur = p; clearResults(); renderAll();
    }
    function up() {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      if (moved) { S.dragEnded = true; renderInspector(); }
    }
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  }

  function onCanvasMove(evt) {
    if (S.mode !== 'place') return;
    S.cursor = snapPt(clientToSvg(evt));
    renderPreview();
  }

  // ---- modos --------------------------------------------------------------
  function setPlaceMode(type, extra, btn) {
    S.mode = 'place'; S.placeType = { type: type, extra: extra }; S.placeFirst = null;
    S.selectedId = null;
    D.svg.classList.add('mode-place');
    document.querySelectorAll('.comp-btn').forEach(function (b) { b.classList.remove('active'); });
    if (btn) btn.classList.add('active');
    var ttl = CS.Components.TYPES[type].title({ params: extra || {} });
    hint('Modo posicionar: ' + ttl + '. Clique no PRIMEIRO terminal no quadro.');
    renderAll(); renderInspector();
  }
  function setSelectMode() {
    S.mode = 'select'; S.placeType = null; S.placeFirst = null; S.cursor = null;
    D.svg.classList.remove('mode-place');
    document.querySelectorAll('.comp-btn').forEach(function (b) { b.classList.remove('active'); });
    hint(false);
    renderAll();
  }

  function deleteSelected() {
    if (!S.selectedId) return;
    pushHistory();
    S.components = S.components.filter(function (c) { return c.id !== S.selectedId; });
    S.selectedId = null; clearResults();
    renderAll(); renderInspector();
  }
  function clearAll() {
    if (!S.components.length) return;
    if (!confirm('Apagar todo o circuito? Esta ação pode ser desfeita com "Desfazer".')) return;
    pushHistory();
    S.components = []; S.selectedId = null; clearResults();
    renderAll(); renderInspector();
  }

  // ========================================================================
  //  INSPETOR (painel direito)
  // ========================================================================
  function selectedComp() { return S.components.find(function (c) { return c.id === S.selectedId; }); }

  function fieldsFor(c) {
    var p = c.params || {};
    switch (c.type) {
      case 'resistor':
        return p.mode === 'geom'
          ? [['rho', 'Resistividade ρ', 'Ω·m'], ['L', 'Comprimento L', 'm'], ['A', 'Área da seção A', 'm²']]
          : [['R', 'Resistência R', 'Ω']];
      case 'source':
        return [[ 'emf', p.kind === 'receptor' ? 'Força contraeletromotriz ε′' : 'Força eletromotriz ε', 'V'], ['r', 'Resistência interna r', 'Ω']];
      case 'capacitor': return [['C', 'Capacitância C', 'F'], ['v0', 'Tensão inicial V₀ (opcional)', 'V']];
      case 'inductor': return [['L', 'Indutância L', 'H'], ['i0', 'Corrente inicial i₀ (opcional)', 'A']];
      case 'voltmeter': case 'ammeter': return [['Rint', 'Resistência interna', 'Ω']];
      case 'galvanometer': return [['Rint', 'Resistência da bobina', 'Ω']];
      default: return [];
    }
  }

  function renderInspector() {
    var c = selectedComp();
    if (!c) {
      D.inspectorEmpty.style.display = '';
      D.inspectorContent.style.display = 'none';
      D.inspectorContent.innerHTML = '';
      D.btnDeleteSelected.disabled = true;
      return;
    }
    D.inspectorEmpty.style.display = 'none';
    D.inspectorContent.style.display = '';
    D.btnDeleteSelected.disabled = false;

    var p = c.params || {};
    var html = '';
    html += '<div class="kind-badge">' + CS.Components.title(c) + '</div>';

    html += '<div class="field-group"><label>Nome / etiqueta (opcional)</label>' +
      '<input type="text" data-key="label" value="' + esc(p.label || '') + '" placeholder="ex.: R₁, gerador, motor..."></div>';

    // alternador direto/geométrico para resistor
    if (c.type === 'resistor') {
      html += '<div class="mode-toggle">' +
        '<button data-mode="direct" class="' + (p.mode !== 'geom' ? 'active' : '') + '">Valor R direto</button>' +
        '<button data-mode="geom" class="' + (p.mode === 'geom' ? 'active' : '') + '">Por ρ, L, A</button></div>';
    }
    // ideal / real para instrumentos
    if (c.type === 'voltmeter' || c.type === 'ammeter' || c.type === 'galvanometer') {
      var idealOn = (c.type === 'galvanometer') ? (p.ideal === true) : (p.ideal !== false);
      html += '<div class="mode-toggle">' +
        '<button data-ideal="1" class="' + (idealOn ? 'active' : '') + '">Ideal</button>' +
        '<button data-ideal="0" class="' + (!idealOn ? 'active' : '') + '">Real (com resistência)</button></div>';
    }

    fieldsFor(c).forEach(function (f) {
      // esconde Rint quando o instrumento está ideal
      if (f[0] === 'Rint') {
        var idealOn2 = (c.type === 'galvanometer') ? (p.ideal === true) : (p.ideal !== false);
        if (idealOn2) return;
      }
      var val = p[f[0]];
      html += '<div class="field-group"><label>' + f[1] + '</label>' +
        '<input type="text" data-key="' + f[0] + '" value="' + esc(val == null ? '' : String(val)) + '">' +
        '<div class="unit-suffix">unidade: ' + f[2] + ' &nbsp;·&nbsp; pode usar k, m, µ, n... (ex.: 1u = 1µ, 4k7 = 4700)</div></div>';
    });

    // R calculado para fio geométrico
    if (c.type === 'resistor' && p.mode === 'geom') {
      html += '<div class="result-card"><div class="result-row"><span class="k">R calculado (ρ·L/A)</span>' +
        '<span class="v">' + CS.fmt(CS.resistanceOf(c), 'Ω') + '</span></div></div>';
    }
    // botão de polaridade para fontes
    if (c.type === 'source') {
      html += '<button class="btn full" id="btnFlip" style="margin:4px 0 12px;">⇄ Inverter polaridade (+/−)</button>';
    }

    // resultados do componente (se já resolvido)
    if (S.results && S.results.ok && S.results.comp[c.id]) {
      html += '<div class="section-title">Resultados</div>';
      html += compResultCard(c, S.results.comp[c.id], S.results);
    }

    D.inspectorContent.innerHTML = html;

    // listeners
    D.inspectorContent.querySelectorAll('input[data-key]').forEach(function (inp) {
      inp.addEventListener('input', function () {
        c.params[this.getAttribute('data-key')] = this.value;
        clearResults();
        renderComponents(); // atualiza rótulo
        if (c.type === 'resistor' && c.params.mode === 'geom') renderInspector();
      });
    });
    D.inspectorContent.querySelectorAll('.mode-toggle button[data-mode]').forEach(function (b) {
      b.addEventListener('click', function () {
        var m = this.getAttribute('data-mode');
        if (c.params.mode === m) return;
        if (m === 'geom' && c.params.rho == null) { c.params.rho = 1.7e-8; c.params.L = 1; c.params.A = 1e-6; }
        if (m === 'direct' && c.params.R == null) c.params.R = 10;
        c.params.mode = m; clearResults(); renderAll(); renderInspector();
      });
    });
    D.inspectorContent.querySelectorAll('.mode-toggle button[data-ideal]').forEach(function (b) {
      b.addEventListener('click', function () {
        c.params.ideal = this.getAttribute('data-ideal') === '1';
        clearResults(); renderAll(); renderInspector();
      });
    });
    var flip = D.inspectorContent.querySelector('#btnFlip');
    if (flip) flip.addEventListener('click', function () {
      c.flipped = !c.flipped; clearResults(); renderAll(); renderInspector();
    });
  }

  function compResultCard(c, info, res) {
    var f = CS.fmt, rows = '';
    function row(k, v, muted) { rows += '<div class="result-row' + (muted ? ' muted' : '') + '"><span class="k">' + k + '</span><span class="v">' + v + '</span></div>'; }
    switch (c.type) {
      case 'resistor':
        if (info.current == null) { row('Fio de R≈0', '—'); break; }
        row('Corrente I', f(Math.abs(info.current), 'A'));
        row('Tensão U', f(Math.abs(info.voltage), 'V'));
        row('Potência dissipada', f(Math.abs(info.power), 'W'));
        row('Resistência R', f(info.R, 'Ω'), true);
        break;
      case 'source':
        row('Operando como', info.mode);
        row('Corrente I', f(Math.abs(info.current), 'A'));
        row('Tensão nos terminais U', f(info.voltage, 'V'));
        row('Perda interna (r·I²)', f(info.internalLoss, 'W'));
        row('Potência da FEM (ε·I)', f(Math.abs(info.emfPower), 'W'), true);
        break;
      case 'capacitor':
        row('Tensão U (regime)', f(info.voltage, 'V'));
        if (info.charge != null) row('Carga Q', f(info.charge, 'C'));
        if (info.energy != null) row('Energia', f(info.energy, 'J'));
        var tc = res.transient && res.transient.capacitors.find(function (x) { return x.id === c.id; });
        if (tc && tc.tau) {
          row('Const. de tempo τ = R·C', f(tc.tau, 's'), true);
          row('Carga final Q∞', f(tc.Qfinal, 'C'), true);
          row('Corrente inicial i₀', f(tc.i0, 'A'), true);
          rows += '<div class="result-note">Carga: q(t) = Q∞·(1 − e^(−t/τ)) se começa descarregado.<br>' +
            'Tensão: U(t) = U∞ + (U₀ − U∞)·e^(−t/τ). Praticamente completo em 5τ ≈ ' + f(tc.t99, 's') + '.</div>';
        }
        break;
      case 'inductor':
        row('Corrente I (regime)', f(info.current, 'A'));
        if (info.energy != null) row('Energia', f(info.energy, 'J'));
        var ti = res.transient && res.transient.inductors.find(function (x) { return x.id === c.id; });
        if (ti && ti.tau) {
          row('Const. de tempo τ = L/R', f(ti.tau, 's'), true);
          rows += '<div class="result-note">i(t) = i∞ + (i₀ − i∞)·e^(−t/τ).</div>';
        }
        break;
      case 'voltmeter': row('Leitura', f(info.reading, 'V')); break;
      case 'ammeter': row('Leitura', f(info.reading, 'A')); break;
      case 'galvanometer':
        row('Leitura', f(info.reading, 'A'));
        if (info.Rint) row('Resistência bobina', f(info.Rint, 'Ω'), true);
        break;
      default: row('—', '—');
    }
    return '<div class="result-card">' + rows + '</div>';
  }

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  // ========================================================================
  //  RESOLVER + RESUMO
  // ========================================================================
  function solve() {
    if (!S.components.length) { toast('Monte um circuito primeiro.', 'error'); return; }
    var res = CS.solveCircuit({ components: S.components.map(toEngine) });
    if (!res.ok) { S.results = null; updateSummary(); renderResults(); toast('Não resolvido: ' + res.error, 'error'); return; }
    S.results = res;
    renderResults(); updateSummary(); renderInspector();
    if (res.warnings && res.warnings.length) toast(res.warnings[0], 'error');
    else toast('Circuito resolvido!', 'success');
  }

  function toEngine(c) {
    return { id: c.id, type: c.type, flipped: c.flipped, params: c.params, a: key(c.a), b: key(c.b) };
  }

  function updateSummary() {
    var bar = D.summaryBar;
    if (!S.results || !S.results.ok) {
      bar.innerHTML = '<span class="empty">Monte seu circuito e clique em "Resolver circuito".</span>';
      return;
    }
    var s = S.results.summary, f = CS.fmt, html = '';
    function stat(label, val) { html += '<div class="stat"><span class="label">' + label + '</span><span class="value">' + val + '</span></div>'; }
    if (s.mainCurrent != null) {
      stat('Corrente principal', f(s.mainCurrent, 'A'));
      stat('Tensão nos terminais', f(s.terminalVoltage, 'V'));
      if (isFinite(s.externalResistance)) stat('Resist. externa equiv.', f(s.externalResistance, 'Ω'));
    }
    stat('Potência total dissipada', f(s.totalDissipated, 'W'));
    var nc = S.components.filter(function (c) { return c.type === 'capacitor'; }).length;
    if (nc) {
      var tc = S.results.transient.capacitors[0];
      if (tc && tc.tau) stat('τ (1º capacitor)', f(tc.tau, 's'));
    }
    bar.innerHTML = html;
  }

  // ========================================================================
  //  SALVAR / ABRIR
  // ========================================================================
  function save() {
    var data = JSON.stringify({ app: 'simulador-circuitos-ita', version: 1, components: S.components }, null, 2);
    var blob = new Blob([data], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'circuito.json';
    a.click();
    URL.revokeObjectURL(a.href);
    toast('Circuito salvo no arquivo circuito.json', 'success');
  }
  function open(file) {
    var rd = new FileReader();
    rd.onload = function () {
      try {
        var data = JSON.parse(rd.result);
        if (!data.components) throw new Error('arquivo inválido');
        pushHistory();
        S.components = data.components;
        // garante contador acima dos ids existentes
        S.components.forEach(function (c) { var n = parseInt(String(c.id).replace(/\D/g, ''), 10); if (n > S.counter) S.counter = n; });
        S.selectedId = null; clearResults(); setSelectMode(); renderAll(); renderInspector();
        toast('Circuito carregado!', 'success');
      } catch (e) { toast('Não foi possível abrir o arquivo.', 'error'); }
    };
    rd.readAsText(file);
  }

  // ========================================================================
  //  INICIALIZAÇÃO
  // ========================================================================
  // Circuito de demonstração: gerador 12 V alimentando R1 em série com
  // (R2 // R3). Bons números: I_total = 3 A, U_paralelo = 6 V.
  function exampleCircuit() {
    return [
      { id: 'ex1', type: 'source', flipped: false, params: { kind: 'gerador', label: 'ε', emf: 12, r: 0 }, a: { x: 220, y: 420 }, b: { x: 220, y: 220 } },
      { id: 'ex2', type: 'resistor', flipped: false, params: { mode: 'direct', label: 'R1', R: 2 }, a: { x: 220, y: 220 }, b: { x: 420, y: 220 } },
      { id: 'ex3', type: 'resistor', flipped: false, params: { mode: 'direct', label: 'R2', R: 6 }, a: { x: 420, y: 220 }, b: { x: 420, y: 420 } },
      { id: 'ex4', type: 'wireIdeal', flipped: false, params: {}, a: { x: 420, y: 220 }, b: { x: 600, y: 220 } },
      { id: 'ex5', type: 'resistor', flipped: false, params: { mode: 'direct', label: 'R3', R: 3 }, a: { x: 600, y: 220 }, b: { x: 600, y: 420 } },
      { id: 'ex6', type: 'wireIdeal', flipped: false, params: {}, a: { x: 600, y: 420 }, b: { x: 420, y: 420 } },
      { id: 'ex7', type: 'wireIdeal', flipped: false, params: {}, a: { x: 420, y: 420 }, b: { x: 220, y: 420 } }
    ];
  }

  function init() {
    if (S._inited) return; // evita inicializar duas vezes
    S._inited = true;
    ['componentsLayer', 'labelsLayer', 'resultsLayer', 'nodesLayer', 'wiresPreviewLayer',
     'inspectorEmpty', 'inspectorContent', 'summaryBar', 'hintBar', 'hintText', 'toast', 'btnDeleteSelected']
      .forEach(function (id) { D[id] = document.getElementById(id); });
    D.svg = document.getElementById('svgCanvas');

    D.svg.addEventListener('click', onCanvasClick);
    D.svg.addEventListener('pointermove', onCanvasMove);

    // paleta
    document.querySelectorAll('.comp-btn[data-type]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var extra = {};
        if (btn.dataset.mode) extra.mode = btn.dataset.mode;
        if (btn.dataset.kind) extra.kind = btn.dataset.kind;
        setPlaceMode(btn.dataset.type, extra, btn);
      });
    });
    document.getElementById('btnSelectMode').addEventListener('click', setSelectMode);
    D.btnDeleteSelected.addEventListener('click', deleteSelected);

    document.getElementById('btnSolve').addEventListener('click', solve);
    document.getElementById('btnUndo').addEventListener('click', undo);
    document.getElementById('btnClear').addEventListener('click', clearAll);
    document.getElementById('btnSave').addEventListener('click', save);
    document.getElementById('fileOpen').addEventListener('change', function () { if (this.files[0]) open(this.files[0]); this.value = ''; });
    var btnEx = document.getElementById('btnExample');
    if (btnEx) btnEx.addEventListener('click', function () {
      pushHistory();
      S.components = exampleCircuit();
      S.counter += 20; S.selectedId = null;
      setSelectMode();
      solve();
      toast('Circuito de exemplo carregado e resolvido. Explore os valores!', 'success');
    });

    document.addEventListener('keydown', function (e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'Delete' || e.key === 'Backspace') { deleteSelected(); }
      else if (e.key === 'Escape') { if (S.mode === 'place') { if (S.placeFirst) { S.placeFirst = null; renderPreview(); } else setSelectMode(); } else { S.selectedId = null; renderAll(); renderInspector(); } }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
    });

    renderAll(); updateSummary();
  }

  CS.UI = { init: init, _state: S, loadExample: function (comps) { S.components = comps; S.counter += 50; clearResults(); renderAll(); renderInspector(); } };

})(typeof window !== 'undefined' ? window : globalThis);
