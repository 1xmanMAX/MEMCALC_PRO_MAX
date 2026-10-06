// Funciones normativas — módulo «analysis» (análisis estructural)
// Rigideces, momentos de empotramiento perfecto (MEP) y deflexiones de casos típicos.
// Fuentes: Kassimali «Matrix Analysis of Structures» (Tabla de MEP, cap. 5), Hibbeler «Análisis
// estructural» (forros: MEP y deflexiones), AISC Manual Tabla 3-23, Muto (1965) «Aseismic design analysis».
import { defineFns, math, toNum, mkUnit, interp1 } from '../engine.js';
void interp1;

// convierte a SI y devuelve unidad con las dimensiones correctas (fuerza·longitud)

const mul = (...a) => a.reduce((p, q) => math.multiply(p, q));
const div = (a, b) => math.divide(a, b);
const pw = (a, n) => math.pow(a, n);
const L_ = (L, a) => math.subtract(L, a);
void toNum; void mkUnit;

defineFns({
  // ---------- rigideces ----------
  kLatEE: { fn: (E, I, h) => div(mul(12, E, I), pw(h, 3)), tex: 'k_{lat}', desc: 'Rigidez lateral de columna biempotrada 12EI/h³', args: 'E, I, h' },
  kLatEA: { fn: (E, I, h) => div(mul(3, E, I), pw(h, 3)), tex: 'k_{lat}', desc: 'Rigidez lateral de columna empotrada–articulada 3EI/h³', args: 'E, I, h' },
  kRotEE: { fn: (E, I, L) => div(mul(4, E, I), L), tex: 'k_{rot}', desc: 'Rigidez a flexión 4EI/L (extremo opuesto empotrado)', args: 'E, I, L' },
  kRotEA: { fn: (E, I, L) => div(mul(3, E, I), L), tex: 'k_{rot}', desc: 'Rigidez a flexión modificada 3EI/L (extremo opuesto articulado)', args: 'E, I, L' },
  kAxial: { fn: (E, A, L) => div(mul(E, A), L), tex: 'k_{ax}', desc: 'Rigidez axial EA/L', args: 'E, A, L' },
  aMuto: { fn: (kb) => toNum(kb) / (2 + toNum(kb)), tex: 'a', desc: 'Coef. de Muto a = k̄/(2+k̄), piso típico', args: 'kbar' },
  aMutoBase: { fn: (kb) => (0.5 + toNum(kb)) / (2 + toNum(kb)), tex: 'a', desc: 'Coef. de Muto primer piso empotrado a = (0.5+k̄)/(2+k̄)', args: 'kbar' },
  // ---------- momentos de empotramiento perfecto (valor absoluto) ----------
  MEPu: { fn: (w, L) => div(mul(w, pw(L, 2)), 12), tex: 'M_{EP}', desc: 'MEP carga uniforme wL²/12', args: 'w, L' },
  MEPuA: { fn: (w, L) => div(mul(w, pw(L, 2)), 8), tex: 'M_{EP}', desc: 'MEP uniforme, otro extremo articulado wL²/8', args: 'w, L' },
  MEPpi: { fn: (P, a, L) => div(mul(P, a, pw(L_(L, a), 2)), pw(L, 2)), tex: 'M_{EP,i}', desc: 'MEP puntual en extremo i: Pab²/L²', args: 'P, a, L' },
  MEPpj: { fn: (P, a, L) => div(mul(P, pw(a, 2), L_(L, a)), pw(L, 2)), tex: 'M_{EP,j}', desc: 'MEP puntual en extremo j: Pa²b/L²', args: 'P, a, L' },
  MEPti: { fn: (w, L) => div(mul(w, pw(L, 2)), 30), tex: 'M_{EP,i}', desc: 'MEP triangular (0 en i → w en j), extremo i: wL²/30', args: 'w, L' },
  MEPtj: { fn: (w, L) => div(mul(w, pw(L, 2)), 20), tex: 'M_{EP,j}', desc: 'MEP triangular (0 en i → w en j), extremo j: wL²/20', args: 'w, L' },
  MEPdelta: { fn: (E, I, D, L) => div(mul(6, E, I, D), pw(L, 2)), tex: 'M_{\\Delta}', desc: 'Momento por desplazamiento relativo 6EIΔ/L²', args: 'E, I, Delta, L' },
  // ---------- deflexiones máximas ----------
  deltaSAu: { fn: (w, L, E, I) => div(mul(5, w, pw(L, 4)), mul(384, E, I)), tex: '\\delta_{max}', desc: 'Simplemente apoyada, uniforme 5wL⁴/384EI', args: 'w, L, E, I' },
  deltaSAp: { fn: (P, L, E, I) => div(mul(P, pw(L, 3)), mul(48, E, I)), tex: '\\delta_{max}', desc: 'Simplemente apoyada, puntual al centro PL³/48EI', args: 'P, L, E, I' },
  deltaEEu: { fn: (w, L, E, I) => div(mul(w, pw(L, 4)), mul(384, E, I)), tex: '\\delta_{max}', desc: 'Biempotrada, uniforme wL⁴/384EI', args: 'w, L, E, I' },
  deltaEAu: { fn: (w, L, E, I) => div(mul(w, pw(L, 4)), mul(185, E, I)), tex: '\\delta_{max}', desc: 'Empotrada–apoyada, uniforme wL⁴/185EI', args: 'w, L, E, I' },
  deltaVu: { fn: (w, L, E, I) => div(mul(w, pw(L, 4)), mul(8, E, I)), tex: '\\delta_{max}', desc: 'Voladizo, uniforme wL⁴/8EI', args: 'w, L, E, I' },
  deltaVp: { fn: (P, L, E, I) => div(mul(P, pw(L, 3)), mul(3, E, I)), tex: '\\delta_{max}', desc: 'Voladizo, puntual en el extremo PL³/3EI', args: 'P, L, E, I' },
  // ---------- momentos máximos ----------
  MSAu: { fn: (w, L) => div(mul(w, pw(L, 2)), 8), tex: 'M_{max}', desc: 'Momento máx. simplemente apoyada uniforme wL²/8', args: 'w, L' },
  MSAp: { fn: (P, a, L) => div(mul(P, a, L_(L, a)), L), tex: 'M_{max}', desc: 'Momento máx. simplemente apoyada puntual Pab/L', args: 'P, a, L' },
  // ---------- utilidades de análisis matricial ----------
  bloque: { fn: (K, i, j, n) => { const m = n === undefined ? 3 : toNum(n); const a = math.isMatrix(K) ? K.toArray() : K; const r0 = (toNum(i) - 1) * m, c0 = (toNum(j) - 1) * m; if (!a[r0 + m - 1] || a[0].length < c0 + m) throw new Error('bloque: índice fuera de la matriz'); return math.matrix(a.slice(r0, r0 + m).map(r => r.slice(c0, c0 + m))); }, tex: '\\mathrm{bloque}', desc: 'Submatriz (i, j) de tamaño n×n (n = 3 por defecto) de una matriz de rigidez', args: 'K, i, j, n' },
  comp: { fn: (v, i, j) => { const a = math.isMatrix(v) ? v.toArray() : v; const r = a[toNum(i) - 1]; if (r === undefined) throw new Error('comp: índice fuera del vector'); return Array.isArray(r) ? r[j === undefined ? 0 : toNum(j) - 1] : r; }, tex: '\\mathrm{comp}', desc: 'Componente i de un vector (o elemento i, j de una matriz)', args: 'v, i, j' },
}, 'Análisis estructural');
