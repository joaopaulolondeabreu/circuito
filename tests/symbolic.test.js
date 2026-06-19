/*
 * Testes do motor de álgebra simbólica (symbolic.js).
 * Rodar: node tests/symbolic.test.js
 */
require('../js/solver.js');
require('../js/engine.js');
require('../js/components.js');
require('../js/symbolic.js');
var S = globalThis.CS.Sym;

var pass = 0, fail = 0;
function eq(name, got, want) {
  if (got === want) pass++;
  else { fail++; console.log('  ✗ ' + name + '\n      obtido:   "' + got + '"\n      esperado: "' + want + '"'); }
}
function fmt(e) { return S.format(e); }
function P(s) { return fmt(S.parse(s)); } // parse + format

// ---- parsing e impressão básicos -------------------------------------------
eq('número', P('12'), '12');
eq('variável', P('R1'), 'R1');
eq('produto número·var', P('3*R1'), '3·R1');
eq('produto implícito', P('3R1'), '3·R1');
eq('ordem coef primeiro', P('R1*3'), '3·R1');
eq('soma', P('R1+R2'), 'R1 + R2');
eq('subtração', P('U - 6'), 'U − 6');
eq('quadrado', P('I^2'), 'I²');
eq('quadrado unicode', P('I²'), 'I²');
eq('divisão simples', P('U/R'), 'U/R');
eq('U²/R', P('U^2/R'), 'U²/R');
eq('combina termos', P('2*R1 + 3*R1'), '5·R1');
eq('cancelamento numérico', P('2*3'), '6');
eq('eng suffix', P('4k7'), '4700');

// ---- operações (como a calculadora fará) -----------------------------------
function v(name) { return S.variable(name); }
function n(x) { return S.num(x); }

// U = R·I com R = R1 (incógnita), I = 3  →  3·R1
eq('U = R·I simbólico', fmt(S.mul(v('R1'), n(3))), '3·R1');
// R = ρ·L/A totalmente simbólico
eq('R = ρ·L/A', fmt(S.div(S.mul(v('ρ'), v('L')), v('A'))), 'ρ·L/A');
// U = ε − r·I com ε = E, r = 2, I = 3  →  E − 6
eq('U = ε − r·I', fmt(S.sub(v('E'), S.mul(n(2), n(3)))), 'E − 6');
// P = R·I²  com R = R1, I = 2  → 4·R1
eq('P = R·I²', fmt(S.mul(v('R1'), S.pow(n(2), 2))), '4·R1');
// P = U²/R simbólico
eq('P = U²/R', fmt(S.div(S.pow(v('U'), 2), v('R'))), 'U²/R');
// I = √(P/R) simbólico  → √P/√R
eq('I = √(P/R)', fmt(S.sqrt(S.div(v('P'), v('R')))), '√P/√R');
// I = √(P/R) numérico  P=12 R=3 → 2
eq('√ numérico', fmt(S.sqrt(S.div(n(12), n(3)))), '2');
// divisão por soma (entrada do usuário): U/(R1+R2)
eq('div por soma', P('U/(R1+R2)'), 'U / (R1 + R2)');

// ---- ida e volta (o resultado impresso deve poder ser relido) --------------
function roundtrip(name, s) { eq('roundtrip ' + name, P(P(s)), P(s)); }
roundtrip('produto', '3*R1');
roundtrip('U²/R', 'U^2/R');
roundtrip('soma', 'E - 6');
roundtrip('raiz', 'sqrt(P/R)');

// ---- compatibilidade numérica (não pode quebrar a calculadora numérica) ----
var rNum = S.div(S.mul(S.num(1.7e-8), S.num(100)), S.num(1e-6));
eq('R numérico é número', S.isNumeric(rNum), true);
eq('R numérico = 1.7', fmt(rNum), '1.7');

console.log('\n=====================================');
console.log('  Simbólico: ' + pass + ' OK, ' + fail + ' falharam.');
console.log('=====================================');
process.exit(fail === 0 ? 0 : 1);
