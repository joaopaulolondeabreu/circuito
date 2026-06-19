/*
 * app.js — Inicialização geral, tela inicial (escolha de dispositivo) e
 * ligação dos modais (ajuda e calculadora). Carregado por último.
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

    document.querySelectorAll('.calc-tab').forEach(function (t) {
      t.addEventListener('click', function () {
        document.querySelectorAll('.calc-tab').forEach(function (x) { x.classList.remove('active'); });
        this.classList.add('active');
        var tab = this.getAttribute('data-tab');
        $('calcResistorPane').style.display = tab === 'resistor' ? '' : 'none';
        $('calcSourcePane').style.display = tab === 'source' ? '' : 'none';
      });
    });

    [help, calc].forEach(function (m) {
      m.addEventListener('click', function (e) { if (e.target === m) m.classList.remove('show'); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { help.classList.remove('show'); calc.classList.remove('show'); }
    });

    // ================= Tela inicial / modo de visualização =================
    var landing = $('deviceLanding');
    var palette = $('palette'), inspector = $('inspector');
    var tP = $('btnTogglePalette'), tI = $('btnToggleInspector');

    function detectMobile() {
      var touch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
      return touch && Math.min(window.innerWidth || 9999, window.innerHeight || 9999) < 820;
    }
    // Mostra/esconde as "gavetas" do layout de computador em telas estreitas.
    function updateToggles() {
      var mobileView = document.body.classList.contains('view-mobile');
      var small = !mobileView && (window.innerWidth || 9999) <= 980;
      if (tP) tP.style.display = small ? '' : 'none';
      if (tI) tI.style.display = small ? '' : 'none';
      if (!small && palette && inspector) { palette.classList.remove('show'); inspector.classList.remove('show'); }
    }
    function applyView(view, persist) {
      document.body.classList.toggle('view-mobile', view === 'mobile');
      document.body.classList.toggle('view-desktop', view !== 'mobile');
      $('btnCalc').textContent = view === 'mobile' ? '🧮' : '🧮 Calculadora avulsa';
      $('btnHelp').textContent = view === 'mobile' ? '❓' : '❓ Como usar';
      if (persist !== false) { try { localStorage.setItem('circuito_view', view); } catch (e) {} }
      if (CS.UI.setView) CS.UI.setView(view);
      updateToggles();
    }
    function hideLanding() { landing.classList.add('hide'); }
    function showLanding() {
      landing.classList.remove('hide');
      var sug = detectMobile() ? 'mobile' : 'desktop';
      landing.querySelectorAll('.landing-card').forEach(function (b) {
        b.classList.toggle('suggested', b.getAttribute('data-view') === sug);
      });
      $('landingNote').textContent = detectMobile()
        ? 'Detectamos uma tela de toque — sugerimos “Celular / Tablet”. Você pode trocar depois.'
        : 'Você pode trocar a qualquer momento no botão 💻/📱 no topo.';
    }
    landing.querySelectorAll('.landing-card').forEach(function (b) {
      b.addEventListener('click', function () { applyView(this.getAttribute('data-view'), true); hideLanding(); });
    });
    $('btnDevice').addEventListener('click', showLanding);
    if (tP) tP.addEventListener('click', function () { palette.classList.toggle('show'); });
    if (tI) tI.addEventListener('click', function () { inspector.classList.toggle('show'); });
    window.addEventListener('resize', updateToggles);

    // Visualização inicial: usa a escolha salva; senão, mostra a tela inicial
    // (já aplicando uma sugestão por baixo, para a escolha ser instantânea).
    var savedView = null;
    try { savedView = localStorage.getItem('circuito_view'); } catch (e) {}
    if (savedView === 'mobile' || savedView === 'desktop') { applyView(savedView, false); hideLanding(); }
    else { applyView(detectMobile() ? 'mobile' : 'desktop', false); showLanding(); }
  });
})();
