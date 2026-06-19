/*
 * components.js — Catálogo de componentes: símbolos (desenho SVG),
 * parâmetros editáveis e formatação de números com prefixos de engenharia.
 *
 * O desenho devolve apenas a GEOMETRIA (traços/curvas) no referencial local
 * do componente (terminais em x = ±len/2, y = 0). A interface (ui.js) cuida
 * dos textos (nome, letra do instrumento, sinais +/−, resultados) mantendo-os
 * sempre na horizontal, legíveis, mesmo com o componente girado.
 */
;(function (global) {
  'use strict';
  var CS = global.CS = global.CS || {};

  // ---- Formatação e leitura de números -----------------------------------
  var PREFIX = [
    { e: 9, s: 'G' }, { e: 6, s: 'M' }, { e: 3, s: 'k' }, { e: 0, s: '' },
    { e: -3, s: 'm' }, { e: -6, s: 'µ' }, { e: -9, s: 'n' }, { e: -12, s: 'p' }
  ];
  var SUFFIX = { p: 1e-12, n: 1e-9, u: 1e-6, 'µ': 1e-6, m: 1e-3, k: 1e3, K: 1e3, M: 1e6, G: 1e9 };

  // Lê um campo de texto aceitando vírgula decimal e sufixos (1u, 2.2k, 4k7...)
  function parseEng(str) {
    if (typeof str === 'number') return str;
    if (str === null || str === undefined) return NaN;
    var s = String(str).trim().replace(/\s+/g, '').replace(',', '.');
    if (s === '') return NaN;
    // notação tipo 4k7 = 4.7k
    var m = s.match(/^(-?\d*\.?\d*)([pnuµmkKMG])(\d+)$/);
    if (m) { s = m[1] + '.' + m[3]; return parseFloat(s) * SUFFIX[m[2]]; }
    var m2 = s.match(/^(-?\d*\.?\d+)([pnuµmkKMG])$/);
    if (m2) return parseFloat(m2[1]) * SUFFIX[m2[2]];
    var v = parseFloat(s);
    return isFinite(v) ? v : NaN;
  }

  // Formata um valor com prefixo de engenharia + unidade. Ex.: 4700 → "4.70 kΩ"
  function fmt(value, unit, sig) {
    if (value === null || value === undefined || !isFinite(value)) return '—';
    if (value === 0) return '0 ' + (unit || '');
    sig = sig || 3;
    var neg = value < 0; var v = Math.abs(value);
    var chosen = PREFIX[PREFIX.length - 1];
    for (var i = 0; i < PREFIX.length; i++) {
      if (v >= Math.pow(10, PREFIX[i].e)) { chosen = PREFIX[i]; break; }
    }
    var scaled = v / Math.pow(10, chosen.e);
    var str = scaled >= 100 ? scaled.toFixed(sig - 3 < 0 ? 0 : sig - 3)
            : scaled >= 10 ? scaled.toFixed(sig - 2)
            : scaled.toFixed(sig - 1);
    // remove zeros à direita
    if (str.indexOf('.') >= 0) str = str.replace(/0+$/, '').replace(/\.$/, '');
    return (neg ? '-' : '') + str + ' ' + chosen.s + (unit || '');
  }

  CS.fmt = fmt;
  CS.parseEng = parseEng;

  // ---- Helpers de desenho -------------------------------------------------
  function line(x1, y1, x2, y2, cls) {
    return '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" class="' + (cls || 'body-line') + '"/>';
  }
  function leads(len, innerL, innerR) {
    var h = len / 2;
    var s = '';
    if (-h < -innerL) s += line(-h, 0, -innerL, 0, 'lead');
    if (innerR < h) s += line(innerR, 0, h, 0, 'lead');
    return s;
  }

  // ---- Catálogo -----------------------------------------------------------
  // Cada tipo: title(c), defaults, bodyWidth, draw(c,len), glyph(c), fields(c)
  var TYPES = {

    resistor: {
      title: function (c) { return (c.params && c.params.mode === 'geom') ? 'Fio real (ρ, L, A)' : 'Resistor'; },
      defaults: function (extra) {
        return (extra && extra.mode === 'geom')
          ? { mode: 'geom', label: '', rho: 1.7e-8, L: 1, A: 1e-6 }
          : { mode: 'direct', label: '', R: 10 };
      },
      draw: function (c, len) {
        if (c.params && c.params.mode === 'geom') {
          return leads(len, 20, 20) +
            '<rect x="-20" y="-8" width="40" height="16" rx="3" class="body-fill"/>' +
            line(-20, -8, 20, 8, 'body-line') + line(-20, 8, 20, -8, 'body-line');
        }
        var pts = [[-23,0],[-18,-7],[-12,7],[-6,-7],[0,7],[6,-7],[12,7],[18,-7],[23,0]];
        var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0] + ' ' + p[1]; }).join(' ');
        return leads(len, 23, 23) + '<path d="' + d + '" class="body-line" fill="none"/>';
      }
    },

    wireIdeal: {
      title: function () { return 'Fio ideal'; },
      defaults: function () { return { label: '' }; },
      draw: function (c, len) { var h = len / 2; return line(-h, 0, h, 0, 'body-line'); }
    },

    source: {
      title: function (c) { return (c.params && c.params.kind === 'receptor') ? 'Receptor' : 'Gerador'; },
      defaults: function (extra) {
        var kind = (extra && extra.kind) || 'gerador';
        return kind === 'receptor'
          ? { kind: 'receptor', label: '', emf: 6, r: 0.5 }
          : { kind: 'gerador', label: '', emf: 12, r: 0.5 };
      },
      draw: function (c, len) {
        var flip = c.flipped ? -1 : 1; // + para o lado de b (direita) por padrão
        if (c.params && c.params.kind === 'receptor') {
          return leads(len, 13, 13) +
            '<circle cx="0" cy="0" r="13" class="body-fill"/>';
        }
        // Pilha: linha longa fina (+) e curta grossa (−)
        var plusX = 5 * flip, minusX = -5 * flip;
        return leads(len, 5, 5) +
          line(plusX, -12, plusX, 12, 'body-line') +
          '<line x1="' + minusX + '" y1="-7" x2="' + minusX + '" y2="7" class="body-line" stroke-width="5"/>';
      },
      glyph: function (c) { return (c.params && c.params.kind === 'receptor') ? 'M' : null; }
    },

    capacitor: {
      title: function () { return 'Capacitor'; },
      defaults: function () { return { label: '', C: 1e-6, v0: 0 }; },
      draw: function (c, len) {
        return leads(len, 4, 4) +
          line(-4, -13, -4, 13, 'body-line') + line(4, -13, 4, 13, 'body-line');
      }
    },

    inductor: {
      title: function () { return 'Indutor'; },
      defaults: function () { return { label: '', L: 1e-3, i0: 0 }; },
      draw: function (c, len) {
        var d = 'M -24 0 ';
        for (var k = 0; k < 4; k++) { var x = -24 + k * 12; d += 'a 6 6 0 0 1 12 0 '; }
        return leads(len, 24, 24) + '<path d="' + d + '" class="body-line" fill="none"/>';
      }
    },

    voltmeter: {
      title: function () { return 'Voltímetro'; },
      defaults: function () { return { label: '', ideal: true, Rint: 1e7 }; },
      draw: function (c, len) { return leads(len, 13, 13) + '<circle cx="0" cy="0" r="13" class="body-fill"/>'; },
      glyph: function () { return 'V'; }
    },

    ammeter: {
      title: function () { return 'Amperímetro'; },
      defaults: function () { return { label: '', ideal: true, Rint: 0.01 }; },
      draw: function (c, len) { return leads(len, 13, 13) + '<circle cx="0" cy="0" r="13" class="body-fill"/>'; },
      glyph: function () { return 'A'; }
    },

    galvanometer: {
      title: function () { return 'Galvanômetro'; },
      defaults: function () { return { label: '', ideal: false, Rint: 50 }; },
      draw: function (c, len) { return leads(len, 13, 13) + '<circle cx="0" cy="0" r="13" class="body-fill"/>'; },
      glyph: function () { return 'G'; }
    }
  };

  // Largura mínima (distância entre terminais) para um componente caber.
  var MIN_LEN = 40;

  function get(type) { return TYPES[type]; }
  function defaults(type, extra) { return TYPES[type].defaults(extra); }
  function title(c) { return TYPES[c.type].title(c); }
  function draw(c, len) { return TYPES[c.type].draw(c, len); }
  function glyph(c) { var t = TYPES[c.type]; return t.glyph ? t.glyph(c) : null; }

  // Mostra um número formatado, ou a própria incógnita (ex.: "R1"), ou vazio.
  function valLabel(raw, unit) {
    if (raw === '' || raw == null) return '';
    var n = parseEng(raw);
    if (isFinite(n)) return fmt(n, unit);
    return String(raw).trim();
  }
  // Rótulo curto exibido junto ao componente (nome ou valor principal).
  function shortLabel(c) {
    var p = c.params || {};
    if (p.label) return p.label;
    switch (c.type) {
      case 'resistor':
        if (p.mode === 'geom') { var R = CS.resistanceOf(c); return isFinite(R) ? fmt(R, 'Ω') : 'ρL/A'; }
        return valLabel(p.R, 'Ω');
      case 'source': return valLabel(p.emf, 'V');
      case 'capacitor': return valLabel(p.C, 'F');
      case 'inductor': return valLabel(p.L, 'H');
      case 'wireIdeal': return '';
      default: return '';
    }
  }

  CS.Components = {
    TYPES: TYPES, MIN_LEN: MIN_LEN,
    get: get, defaults: defaults, title: title, draw: draw, glyph: glyph,
    shortLabel: shortLabel
  };

})(typeof window !== 'undefined' ? window : globalThis);
