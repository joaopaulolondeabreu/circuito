/*
 * solver.js — Álgebra linear de apoio ao simulador.
 *
 * Resolve sistemas lineares A·x = b por eliminação de Gauss com
 * pivoteamento parcial. É a base numérica usada pela Análise Nodal
 * Modificada (ver engine.js).
 *
 * Este arquivo funciona tanto no navegador quanto no Node.js (para os
 * testes automatizados). Ele apenas pendura suas funções no objeto
 * global "CS" (CircuitSim).
 */
;(function (global) {
  'use strict';
  var CS = global.CS = global.CS || {};

  /*
   * Resolve A·x = b.
   *   A : matriz n×n (array de arrays de números)
   *   b : vetor de tamanho n
   * Retorna o vetor x, ou null se a matriz for singular (sem solução
   * única — normalmente sinal de curto em fonte ideal ou trecho solto).
   */
  function solveLinear(A, b) {
    var n = b.length;
    if (n === 0) return [];
    // Cópias para não destruir as entradas originais.
    var M = new Array(n);
    for (var i = 0; i < n; i++) M[i] = A[i].slice();
    var rhs = b.slice();

    for (var col = 0; col < n; col++) {
      // Pivoteamento parcial: maior elemento (em módulo) na coluna.
      var piv = col;
      var maxAbs = Math.abs(M[col][col]);
      for (var r = col + 1; r < n; r++) {
        var v = Math.abs(M[r][col]);
        if (v > maxAbs) { maxAbs = v; piv = r; }
      }
      if (maxAbs < 1e-13) {
        return null; // coluna nula → matriz singular
      }
      if (piv !== col) {
        var tmpRow = M[piv]; M[piv] = M[col]; M[col] = tmpRow;
        var tmpB = rhs[piv]; rhs[piv] = rhs[col]; rhs[col] = tmpB;
      }
      // Eliminação para baixo.
      var pivVal = M[col][col];
      for (var rr = col + 1; rr < n; rr++) {
        var factor = M[rr][col] / pivVal;
        if (factor === 0) continue;
        M[rr][col] = 0;
        for (var c = col + 1; c < n; c++) {
          M[rr][c] -= factor * M[col][c];
        }
        rhs[rr] -= factor * rhs[col];
      }
    }

    // Substituição reversa.
    var x = new Array(n);
    for (var row = n - 1; row >= 0; row--) {
      var s = rhs[row];
      for (var k = row + 1; k < n; k++) s -= M[row][k] * x[k];
      x[row] = s / M[row][row];
    }
    return x;
  }

  CS.solveLinear = solveLinear;

})(typeof window !== 'undefined' ? window : globalThis);
