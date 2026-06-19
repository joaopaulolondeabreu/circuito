/*
 * Teste de integração da interface usando jsdom (DOM simulado).
 * Carrega o index.html + todos os scripts, monta um circuito, clica em
 * "Resolver" e confere o que aparece na tela. Rodar: node tests/ui.test.js
 * (requer jsdom instalado: npm install --no-save jsdom)
 */
var fs = require('fs');
var path = require('path');
var JSDOM;
try { JSDOM = require('jsdom').JSDOM; }
catch (e) {
  console.log('• Testes de interface PULADOS (jsdom não instalado).');
  console.log('  Para rodá-los: npm install --no-save jsdom');
  process.exit(0);
}

var root = path.join(__dirname, '..');
var html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
var dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true });
var window = dom.window;
var document = window.document;

// Carrega os módulos na ordem do index.html.
['js/solver.js', 'js/engine.js', 'js/components.js', 'js/calculator.js', 'js/ui.js', 'js/app.js']
  .forEach(function (f) { window.eval(fs.readFileSync(path.join(root, f), 'utf8')); });

var CS = window.CS;
// Em jsdom o DOMContentLoaded já passou; garantimos a inicialização.
CS.UI.init();
var pass = 0, fail = 0;
function ok(name, cond) { if (cond) pass++; else { fail++; console.log('  ✗ ' + name); } }
function approx(a, b) { return Math.abs(a - b) <= 1e-3 * Math.max(1, Math.abs(b)); }

// Garante que a interface inicializou.
ok('CS.UI existe', !!(CS && CS.UI));
ok('inspetor vazio inicial', document.getElementById('inspectorEmpty').style.display !== 'none');

// --- monta um circuito série 12V, 2Ω + 4Ω via loadExample ---------------
CS.UI.loadExample([
  { id: 'c1', type: 'source', flipped: false, params: { kind: 'gerador', emf: 12, r: 0 }, a: { x: 100, y: 200 }, b: { x: 100, y: 100 } },
  { id: 'c2', type: 'resistor', flipped: false, params: { mode: 'direct', R: 2 }, a: { x: 100, y: 100 }, b: { x: 300, y: 100 } },
  { id: 'c3', type: 'resistor', flipped: false, params: { mode: 'direct', R: 4 }, a: { x: 300, y: 100 }, b: { x: 100, y: 200 } }
]);

ok('componentes desenhados', document.getElementById('componentsLayer').children.length === 3);
ok('nós desenhados', document.getElementById('nodesLayer').children.length === 3);

// --- clica em "Resolver circuito" ---------------------------------------
document.getElementById('btnSolve').dispatchEvent(new window.Event('click'));
var st = CS.UI._state;
ok('resolveu', !!(st.results && st.results.ok));
ok('I(R1)=2A', st.results && approx(Math.abs(st.results.comp.c2.current), 2));
ok('I(R2)=2A', st.results && approx(Math.abs(st.results.comp.c3.current), 2));
ok('resultados na tela', document.getElementById('resultsLayer').children.length > 0);
ok('resumo preenchido', /Corrente principal/.test(document.getElementById('summaryBar').textContent));

// --- seleciona um resistor (clique no grupo) e confere o inspetor -------
var grp = document.querySelector('.comp-g[data-id="c2"]');
grp.dispatchEvent(new window.Event('click'));
ok('inspetor mostra resistor', /Resist[êe]ncia R/.test(document.getElementById('inspectorContent').textContent));
ok('inspetor mostra resultado', /Corrente I/.test(document.getElementById('inspectorContent').textContent));

// --- testa a calculadora: ρ, L, A → R -----------------------------------
CS.Calculator.init();
var resPane = document.getElementById('calcResistorPane');
function setField(pane, key, val) { pane.querySelector('input[data-key="' + key + '"]').value = val; }
setField(resPane, 'rho', '1.7e-8');
setField(resPane, 'L', '100');
setField(resPane, 'A', '1e-6');
resPane.querySelector('[data-role="calc"]').dispatchEvent(new window.Event('click'));
var Rval = window.CS.parseEng(resPane.querySelector('input[data-key="R"]').value);
ok('calculadora R = ρL/A ≈ 1.7Ω', approx(Rval, 1.7));

// --- calculadora gerador: ε=10, r=1, I=2 → U=8 --------------------------
var srcPane = document.getElementById('calcSourcePane');
setField(srcPane, 'emf', '10'); setField(srcPane, 'r', '1'); setField(srcPane, 'I', '2');
srcPane.querySelector('[data-role="calc"]').dispatchEvent(new window.Event('click'));
var Uval = window.CS.parseEng(srcPane.querySelector('input[data-key="U"]').value);
ok('calculadora U = ε − rI = 8V', approx(Uval, 8));

console.log('\n=====================================');
console.log('  UI: ' + pass + ' OK, ' + fail + ' falharam.');
console.log('=====================================');
process.exit(fail === 0 ? 0 : 1);
