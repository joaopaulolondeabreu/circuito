/*
 * app.js — Inicialização geral e ligação dos modais (ajuda e calculadora).
 * Carregado por último, depois de todos os outros módulos.
 */
;(function () {
  'use strict';
  var CS = window.CS;
  function $(id) { return document.getElementById(id); }
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    CS.UI.init();
    CS.Calculator.init();

    // ---- modal de ajuda ----
    var help = $('helpModal');
    function openHelp() { help.classList.add('show'); }
    $('btnHelp').addEventListener('click', openHelp);
    $('closeHelp').addEventListener('click', function () { help.classList.remove('show'); });
    $('closeHelp2').addEventListener('click', function () { help.classList.remove('show'); });

    // ---- modal da calculadora ----
    var calc = $('calcModal');
    $('btnCalc').addEventListener('click', function () { calc.classList.add('show'); });
    $('closeCalc').addEventListener('click', function () { calc.classList.remove('show'); });

    // abas da calculadora
    document.querySelectorAll('.calc-tab').forEach(function (t) {
      t.addEventListener('click', function () {
        document.querySelectorAll('.calc-tab').forEach(function (x) { x.classList.remove('active'); });
        this.classList.add('active');
        var tab = this.getAttribute('data-tab');
        $('calcResistorPane').style.display = tab === 'resistor' ? '' : 'none';
        $('calcSourcePane').style.display = tab === 'source' ? '' : 'none';
      });
    });

    // fechar modais clicando no fundo ou com ESC
    [help, calc].forEach(function (m) {
      m.addEventListener('click', function (e) { if (e.target === m) m.classList.remove('show'); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { help.classList.remove('show'); calc.classList.remove('show'); }
    });

    // ---- botões de painel no celular ----
    var palette = $('palette'), inspector = $('inspector');
    var tP = $('btnTogglePalette'), tI = $('btnToggleInspector');
    function updateToggles() {
      var small = window.innerWidth <= 980;
      tP.style.display = small ? '' : 'none';
      tI.style.display = small ? '' : 'none';
      if (!small) { palette.classList.remove('show'); inspector.classList.remove('show'); }
    }
    tP.addEventListener('click', function () { palette.classList.toggle('show'); });
    tI.addEventListener('click', function () { inspector.classList.toggle('show'); });
    window.addEventListener('resize', updateToggles);
    updateToggles();

    // abre a ajuda na primeira visita
    try {
      if (!localStorage.getItem('circuito_seenHelp')) { openHelp(); localStorage.setItem('circuito_seenHelp', '1'); }
    } catch (e) { /* localStorage indisponível */ }
  });
})();
