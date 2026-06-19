/*
 * Testes automatizados do motor de física (engine.js).
 * Rodar com:  node tests/engine.test.js
 * Cada caso tem resposta calculada à mão; comparamos com tolerância.
 */
require('../js/solver.js');
require('../js/engine.js');
var CS = globalThis.CS;

var passed = 0, failed = 0;
function approx(a, b, tol) { tol = tol || 1e-4; return Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)); }
function check(name, got, want, tol) {
  if (approx(got, want, tol)) { passed++; /* ok */ }
  else { failed++; console.log('  ✗ ' + name + '  obtido=' + got + '  esperado=' + want); }
}
function head(t) { console.log('\n• ' + t); }

// ---------------------------------------------------------------------------
// 1) Série: ε=12V (r=0), R1=2Ω, R2=4Ω  → I=2A, U(R1)=4V, U(R2)=8V
// ---------------------------------------------------------------------------
head('Série 12V, 2Ω + 4Ω');
var c1 = { components: [
  { id: 'S', type: 'source', a: 'A', b: 'B', params: { emf: 12, r: 0 } },
  { id: 'R1', type: 'resistor', a: 'B', b: 'C', params: { mode: 'direct', R: 2 } },
  { id: 'R2', type: 'resistor', a: 'C', b: 'A', params: { mode: 'direct', R: 4 } }
]};
var r1 = CS.solveCircuit(c1);
check('I(R1)', Math.abs(r1.comp.R1.current), 2);
check('I(R2)', Math.abs(r1.comp.R2.current), 2);
check('U(R1)', Math.abs(r1.comp.R1.voltage), 4);
check('U(R2)', Math.abs(r1.comp.R2.voltage), 8);
check('I(fonte)', Math.abs(r1.comp.S.current), 2);
check('Req externa', r1.summary.externalResistance, 6);

// ---------------------------------------------------------------------------
// 2) Paralelo: ε=12V (r=0), R1=3Ω // R2=6Ω → Req=2Ω, Itot=6A, I1=4A, I2=2A
// ---------------------------------------------------------------------------
head('Paralelo 12V, 3Ω // 6Ω');
var c2 = { components: [
  { id: 'S', type: 'source', a: 'A', b: 'B', params: { emf: 12, r: 0 } },
  { id: 'R1', type: 'resistor', a: 'B', b: 'A', params: { mode: 'direct', R: 3 } },
  { id: 'R2', type: 'resistor', a: 'B', b: 'A', params: { mode: 'direct', R: 6 } }
]};
var r2 = CS.solveCircuit(c2);
check('I(R1)', Math.abs(r2.comp.R1.current), 4);
check('I(R2)', Math.abs(r2.comp.R2.current), 2);
check('I(total)', Math.abs(r2.comp.S.current), 6);
check('Req externa', r2.summary.externalResistance, 2);

// ---------------------------------------------------------------------------
// 3) Gerador real: ε=10V, r=1Ω, R=4Ω → I=2A, U=8V
// ---------------------------------------------------------------------------
head('Gerador real 10V, r=1Ω, R=4Ω');
var c3 = { components: [
  { id: 'S', type: 'source', a: 'A', b: 'B', params: { emf: 10, r: 1 } },
  { id: 'R', type: 'resistor', a: 'B', b: 'A', params: { mode: 'direct', R: 4 } }
]};
var r3 = CS.solveCircuit(c3);
check('I', Math.abs(r3.comp.S.current), 2);
check('U terminal', r3.comp.S.voltage, 8);
check('Perda interna', r3.comp.S.internalLoss, 4); // r·I² = 1·4
check('U(R)', Math.abs(r3.comp.R.voltage), 8);

// ---------------------------------------------------------------------------
// 4) Gerador + Receptor: ε=12 r=0,5 ; ε'=6 r'=0,5 ; R=2  → I=2A
//    U(gerador)=11V, U(receptor)=7V
// ---------------------------------------------------------------------------
head('Gerador carregando receptor');
var c4 = { components: [
  { id: 'G', type: 'source', a: 'A', b: 'B', params: { kind: 'gerador', emf: 12, r: 0.5 } },
  { id: 'R', type: 'resistor', a: 'B', b: 'C', params: { mode: 'direct', R: 2 } },
  // Receptor entre A(−) e C(+). A corrente chega pelo terminal C (+),
  // então sua FCEM se OPÕE à corrente (condição de receptor/carga).
  { id: 'M', type: 'source', a: 'A', b: 'C', params: { kind: 'receptor', emf: 6, r: 0.5 } }
]};
var r4 = CS.solveCircuit(c4);
check('I no circuito', Math.abs(r4.comp.G.current), 2);
check('U gerador', r4.comp.G.voltage, 11);
check('U receptor (módulo)', Math.abs(r4.comp.M.voltage), 7);
// Gerador entrega potência (mode gerador); receptor recebe (mode receptor):
if (r4.comp.G.mode !== 'gerador') { failed++; console.log('  ✗ G deveria ser gerador, veio ' + r4.comp.G.mode); } else passed++;
if (r4.comp.M.mode !== 'receptor') { failed++; console.log('  ✗ M deveria ser receptor, veio ' + r4.comp.M.mode); } else passed++;

// ---------------------------------------------------------------------------
// 5) Ponte de Wheatstone equilibrada → galvanômetro lê 0
// ---------------------------------------------------------------------------
head('Wheatstone equilibrada (galvanômetro = 0)');
var c5 = { components: [
  { id: 'S', type: 'source', a: 'G0', b: 'TOP', params: { emf: 10, r: 0 } },
  { id: 'R1', type: 'resistor', a: 'TOP', b: 'L', params: { mode: 'direct', R: 10 } },
  { id: 'R2', type: 'resistor', a: 'TOP', b: 'Rr', params: { mode: 'direct', R: 20 } },
  { id: 'R3', type: 'resistor', a: 'L', b: 'G0', params: { mode: 'direct', R: 10 } },
  { id: 'R4', type: 'resistor', a: 'Rr', b: 'G0', params: { mode: 'direct', R: 20 } },
  { id: 'GAL', type: 'galvanometer', a: 'L', b: 'Rr', params: { ideal: true } }
]};
var r5 = CS.solveCircuit(c5);
check('Galvanômetro (A)', r5.comp.GAL.reading, 0, 1e-6);

// Desequilibrando (R4=40) o galvanômetro deve marcar algo != 0
var c5b = JSON.parse(JSON.stringify(c5));
c5b.components.find(function (x) { return x.id === 'R4'; }).params.R = 40;
var r5b = CS.solveCircuit(c5b);
if (Math.abs(r5b.comp.GAL.reading) > 1e-3) passed++; else { failed++; console.log('  ✗ Galvanômetro deveria desviar ao desequilibrar'); }

// ---------------------------------------------------------------------------
// 6) RC em regime: ε=10V, R=1000Ω, C=1µF → V_C=10V, τ=1ms, Q=10µC
// ---------------------------------------------------------------------------
head('RC: carga de capacitor');
var c6 = { components: [
  { id: 'S', type: 'source', a: 'A', b: 'B', params: { emf: 10, r: 0 } },
  { id: 'R', type: 'resistor', a: 'B', b: 'C', params: { mode: 'direct', R: 1000 } },
  { id: 'CAP', type: 'capacitor', a: 'C', b: 'A', params: { C: 1e-6, v0: 0 } }
]};
var r6 = CS.solveCircuit(c6);
check('V_C final', Math.abs(r6.comp.CAP.voltage), 10, 1e-3);
check('Q final', Math.abs(r6.comp.CAP.charge), 1e-5, 1e-3);
var tcap = r6.transient.capacitors[0];
check('tau (RC)', tcap.tau, 1e-3, 1e-3);
check('i0 (corrente inicial)', tcap.i0, 0.01, 1e-3);

// ---------------------------------------------------------------------------
// 7) Resistor geométrico: ρ=1.7e-8, L=100m, A=1e-6 m² → R≈1.7Ω
// ---------------------------------------------------------------------------
head('Fio real (ρ, L, A → R)');
var c7 = { components: [
  { id: 'S', type: 'source', a: 'A', b: 'B', params: { emf: 1.7, r: 0 } },
  { id: 'W', type: 'resistor', a: 'B', b: 'A', params: { mode: 'geom', rho: 1.7e-8, L: 100, A: 1e-6 } }
]};
var r7 = CS.solveCircuit(c7);
check('R do fio', r7.comp.W.R, 1.7, 1e-6);
check('I no fio', Math.abs(r7.comp.W.current), 1.0, 1e-4);

// ---------------------------------------------------------------------------
// 8) equivalentResistance: ponte/escada simples (2Ω série 4Ω = 6Ω)
// ---------------------------------------------------------------------------
head('Resistência equivalente direta');
var c8 = { components: [
  { id: 'R1', type: 'resistor', a: 'X', b: 'Y', params: { mode: 'direct', R: 2 } },
  { id: 'R2', type: 'resistor', a: 'Y', b: 'Z', params: { mode: 'direct', R: 4 } }
]};
check('Req X-Z série', CS.equivalentResistance(c8, 'X', 'Z'), 6);
var c8p = { components: [
  { id: 'R1', type: 'resistor', a: 'X', b: 'Y', params: { mode: 'direct', R: 3 } },
  { id: 'R2', type: 'resistor', a: 'X', b: 'Y', params: { mode: 'direct', R: 6 } }
]};
check('Req X-Y paralelo', CS.equivalentResistance(c8p, 'X', 'Y'), 2);

// ---------------------------------------------------------------------------
// 9) Voltímetro ideal (não altera) e amperímetro ideal (lê corrente)
// ---------------------------------------------------------------------------
head('Instrumentos ideais');
var c9 = { components: [
  { id: 'S', type: 'source', a: 'A', b: 'B', params: { emf: 6, r: 0 } },
  { id: 'AMP', type: 'ammeter', a: 'B', b: 'C', params: { ideal: true } },
  { id: 'R', type: 'resistor', a: 'C', b: 'A', params: { mode: 'direct', R: 3 } },
  { id: 'VOLT', type: 'voltmeter', a: 'C', b: 'A', params: { ideal: true } }
]};
var r9 = CS.solveCircuit(c9);
check('Amperímetro lê', r9.comp.AMP.reading, 2);
check('Voltímetro lê', r9.comp.VOLT.reading, 6);

// ---------------------------------------------------------------------------
console.log('\n=====================================');
console.log('  ' + passed + ' verificações OK, ' + failed + ' falharam.');
console.log('=====================================');
process.exit(failed === 0 ? 0 : 1);
