// =====================================================================
//  Funciones normativas — módulo «masonry»
//  · NTE E.070 Albañilería (2006)            · NTE E.080 Tierra reforzada (2017)
//  · NTE E.010 Madera (2014) / Manual JUNAC  · ACI 350.3-06 (sismo en tanques, Housner)
//  · PCA «Circular Concrete Tanks without Prestressing» (teoría de cáscaras, ν = 0.2)
//  · Placas rectangulares (PCA «Rectangular Concrete Tanks») por diferencias finitas
// =====================================================================
import { defineFns, math, toNum, mkUnit, interp1 } from '../engine.js';

const KG = 'kgf/cm^2';
const n0 = (x) => toNum(x);
const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
// Difusión elemento a elemento: si algún argumento es vector (Matrix/Array) la función se aplica por componentes
const isVec = (a) => math.isMatrix(a) || Array.isArray(a);
const toArr = (a) => (math.isMatrix(a) ? a.toArray() : a);
function bc(f) {
  return (...args) => {
    const vi = args.findIndex(isVec);
    if (vi < 0) return f(...args);
    const n = toArr(args[vi]).length;
    const out = [];
    for (let k = 0; k < n; k++) out.push(f(...args.map(a => { if (!isVec(a)) return a; const arr = toArr(a); if (arr.length !== n) throw new Error('Vectores de distinta longitud'); return arr[k]; })));
    return math.matrix(out);
  };
}
function pick(tbl, k, what) {
  const i = Math.round(n0(k));
  if (!(i in tbl)) throw new Error(what + ': opción ' + k + ' no válida (use ' + Object.keys(tbl).join(', ') + ')');
  return tbl[i];
}

// ---------------------------------------------------------------------
//  NTE E.070 — Tabla 9: resistencias características (kgf/cm²)
//  [f'b (área bruta), f'm (pilas), v'm (muretes), materia: 1 arcilla, 2 sílice-cal, 3 concreto]
// ---------------------------------------------------------------------
export const E070_T9 = {
  1: [55, 35, 5.1, 1, 'Arcilla — King Kong artesanal'],
  2: [145, 65, 8.1, 1, 'Arcilla — King Kong industrial'],
  3: [215, 85, 9.2, 1, 'Arcilla — Rejilla industrial'],
  4: [160, 110, 9.7, 2, 'Sílice-cal — King Kong normal'],
  5: [145, 95, 9.7, 2, 'Sílice-cal — Dédalo'],
  6: [145, 110, 9.2, 2, 'Sílice-cal — Estándar y mecano'],
  7: [50, 74, 8.6, 3, 'Concreto — Bloque tipo P (f\'b = 50)'],
  8: [65, 85, 9.2, 3, 'Concreto — Bloque tipo P (f\'b = 65)'],
  9: [75, 95, 9.7, 3, 'Concreto — Bloque tipo P (f\'b = 75)'],
  10: [85, 120, 10.9, 3, 'Concreto — Bloque tipo P (f\'b = 85)'],
};
// Tabla 12: coeficiente de momentos m
const T12_C1 = { x: [1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 3.0, 1e6], y: [0.0479, 0.0627, 0.0755, 0.0862, 0.0948, 0.1017, 0.118, 0.125] };
const T12_C2 = { x: [0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.5, 2.0, 1e6], y: [0.060, 0.074, 0.087, 0.097, 0.106, 0.112, 0.128, 0.132, 0.133] };
// interpolación en b/a con extremo "∞": entre 3.0 (o 2.0) e ∞ se interpola en a/b (→ 0)
function mTabla(T, ba) {
  const xs = T.x, n = xs.length;
  if (ba >= xs[n - 2]) { const r0 = 1 / xs[n - 2], r = 1 / ba; return T.y[n - 2] + (T.y[n - 1] - T.y[n - 2]) * (r0 - r) / r0; }
  return interp1(ba, xs.slice(0, n - 1), T.y.slice(0, n - 1));
}

defineFns({
  fbE070: { fn: (u) => mkUnit(pick(E070_T9, u, 'Unidad E.070')[0], KG), tex: "f'_{b}", desc: "E.070 Tabla 9: f'b de la unidad (1 KK artesanal, 2 KK industrial, 3 rejilla, 4–6 sílice-cal, 7–10 bloque P)", args: 'unidad' },
  fmE070: { fn: (u) => mkUnit(pick(E070_T9, u, 'Unidad E.070')[1], KG), tex: "f'_{m}", desc: "E.070 Tabla 9: resistencia característica f'm de pilas", args: 'unidad' },
  vmE070: { fn: (u) => mkUnit(pick(E070_T9, u, 'Unidad E.070')[2], KG), tex: "v'_{m}", desc: "E.070 Tabla 9: resistencia característica v'm de muretes", args: 'unidad' },
  matE070: { fn: (u) => pick(E070_T9, u, 'Unidad E.070')[3], tex: '\\mathrm{mat}', desc: 'E.070: materia prima de la unidad (1 arcilla, 2 sílice-cal, 3 concreto)', args: 'unidad' },
  EmE070: { fn: (fm, mat = 1) => math.multiply(pick({ 1: 500, 2: 600, 3: 700 }, mat, 'Materia prima'), fm), tex: 'E_m', desc: "E.070 Art. 24.7: Em = 500 f'm arcilla, 600 sílice-cal, 700 concreto (Gm = 0.4 Em)", args: 'fm, mat' },
  FaE070: { fn: bc((fm, h, t) => { const r = toNum(h, 'm') / (35 * toNum(t, 'm')); return math.multiply(Math.min(0.2 * (1 - r * r), 0.15), fm); }), tex: 'F_a', desc: "E.070 Art. 19.1.b: Fa = 0.2 f'm [1 − (h/35t)²] ≤ 0.15 f'm", args: 'fm, h, t' },
  alphaE070: { fn: bc((Ve, L, Me) => clamp(toNum(Ve, 'tonf') * toNum(L, 'm') / toNum(Me, 'tonf*m'), 1 / 3, 1)), tex: '\\alpha', desc: 'E.070 Art. 26.3: α = Ve·L/Me, 1/3 ≤ α ≤ 1', args: 'Ve, L, Me' },
  VmE070: {
    fn: bc((vm, alpha, t, L, Pg, mat = 1) => { const c = Math.round(n0(mat)) === 2 ? 0.35 : 0.5; const r = math.add(math.multiply(c * n0(alpha), math.multiply(vm, math.multiply(t, L))), math.multiply(0.23, Pg)); return math.isUnit(r) ? r.to('tonf') : r; }),
    tex: 'V_m', desc: "E.070 Art. 26.3: Vm = 0.5 v'm α t L + 0.23 Pg (0.35 para sílice-cal)", args: 'vm, alpha, t, L, Pg, mat',
  },
  factE070: { fn: bc((Vm1, Ve1) => clamp(n0(math.divide(Vm1, Ve1)), 2, 3)), tex: '\\frac{V_{m1}}{V_{e1}}', desc: 'E.070 Art. 27 c): factor de amplificación 2 ≤ Vm1/Ve1 ≤ 3 (Vu = Ve·Vm1/Ve1, Mu = Me·Vm1/Ve1)', args: 'Vm1, Ve1' },
  dminE070: { fn: (Z, U, S, N) => n0(Z) * n0(U) * n0(S) * n0(N) / 56, tex: '\\frac{ZUSN}{56}', desc: 'E.070 Art. 19.2.b: densidad mínima de muros ΣLt/Ap ≥ ZUSN/56', args: 'Z, U, S, N' },
  mE070: {
    fn: (caso, ba = 1) => { const c = Math.round(n0(caso)); const r = n0(ba); if (c === 3) return 0.125; if (c === 4) return 0.5; if (!(r > 0)) throw new Error('b/a debe ser positivo'); if (c === 1) return mTabla(T12_C1, Math.max(r, 1)); if (c === 2) { if (r < 0.5) throw new Error('E.070 Tabla 12 caso 2: b/a ≥ 0.5'); return mTabla(T12_C2, r); } throw new Error('Caso de la Tabla 12: 1, 2, 3 o 4'); },
    tex: 'm', desc: 'E.070 Tabla 12: coeficiente de momento m (caso 1: 4 bordes, 2: 3 bordes, 3: bordes horizontales, 4: voladizo)', args: 'caso, b/a',
  },
  ftE070: { fn: (tipo = 1) => mkUnit(Math.round(n0(tipo)) === 2 ? 3.0 : 1.5, KG), tex: "f'_{t}", desc: "E.070 Art. 29.8: f't = 1.5 kg/cm² albañilería simple; 3.0 armada rellena de grout", args: 'tipo' },
  C1E030a: { fn: (k) => pick({ 1: 1.3, 2: 1.3, 3: 0.9, 4: 0.6, 5: 0.9, 6: 0.6 }, k, 'C1'), tex: 'C_1', desc: 'C1 de la E.030-2003 (Art. 23, Tabla N° 9), al que remite E.070 Art. 29.6: 1 precipitarse fuera 1.3; 2 peligro 1.3; 3 muros interiores 0.9; 4 cercos 0.6; 5 tanques/letreros 0.9; 6 diafragmas 0.6. (La E.030-2018 usa otra escala: F = 0.5 ZUS Pe para cercos, Art. 41)', args: 'tipo' },
}, 'Albañilería — E.070');

// ---------------------------------------------------------------------
//  NTE E.010 Madera — Tablas 3 y 5 del texto vigente (gob.pe, 2021; grupos A–C iguales a la versión
//  2006/2014 y al Manual JUNAC; el grupo D se incorporó en 2021). Madera latifoliada con CH ≤ 22 %, kgf/cm²
// ---------------------------------------------------------------------
export const E010 = {
  //      Emin    Eprom    fm   fc∥  fc⊥  ft   fv
  1: { Emin: 95000, Eprom: 130000, fm: 210, fc: 145, fcp: 40, ft: 145, fv: 15, n: 'A' },
  2: { Emin: 75000, Eprom: 100000, fm: 150, fc: 110, fcp: 28, ft: 105, fv: 12, n: 'B' },
  3: { Emin: 55000, Eprom: 90000, fm: 100, fc: 80, fcp: 15, ft: 75, fv: 8, n: 'C' },
  4: { Emin: 45000, Eprom: 65000, fm: 70, fc: 63, fcp: 13, ft: 60, fv: 6, n: 'D' },
};
const g10 = (g, k) => mkUnit(pick(E010, g, 'Grupo E.010 (1 = A, 2 = B, 3 = C, 4 = D)')[k], KG);
defineFns({
  EminE010: { fn: (g) => g10(g, 'Emin'), tex: 'E_{min}', desc: 'E.010 Tabla 5: módulo de elasticidad mínimo (1 = A, 2 = B, 3 = C, 4 = D)', args: 'grupo' },
  EpromE010: { fn: (g) => g10(g, 'Eprom'), tex: 'E_{prom}', desc: 'E.010 Tabla 5: módulo de elasticidad promedio (acción de conjunto, Art. 17)', args: 'grupo' },
  fmE010: { fn: (g) => g10(g, 'fm'), tex: 'f_m', desc: 'E.010 Tabla 3: esfuerzo admisible en flexión (+10 % con acción de conjunto, Art. 16.3)', args: 'grupo' },
  fcE010: { fn: (g) => g10(g, 'fc'), tex: 'f_{c\\parallel}', desc: 'E.010 Tabla 3: compresión paralela a las fibras', args: 'grupo' },
  fcpE010: { fn: (g) => g10(g, 'fcp'), tex: 'f_{c\\perp}', desc: 'E.010 Tabla 3: compresión perpendicular a las fibras', args: 'grupo' },
  ftE010: { fn: (g) => g10(g, 'ft'), tex: 'f_t', desc: 'E.010 Tabla 3: tracción paralela a las fibras', args: 'grupo' },
  fvE010: { fn: (g) => g10(g, 'fv'), tex: 'f_v', desc: 'E.010 Tabla 3: corte paralelo a las fibras', args: 'grupo' },
  CkE010: { fn: (E, fc, forma = 1) => (Math.round(n0(forma)) === 2 ? 0.6077 : 0.7025) * Math.sqrt(n0(math.divide(E, fc))), tex: 'C_k', desc: 'E.010 Art. 27–28 (Tablas 8 y 9) / JUNAC 9.4: Ck = 0.7025√(E/fc) (rectangular); 0.6077√(E/fc) (circular)', args: 'Emin, fc, forma' },
  NadmE010: {
    fn: (fc, E, A, lam, Ck, forma = 1) => { const circ = Math.round(n0(forma)) === 2, l = n0(lam), ck = Ck === undefined ? (circ ? 0.6077 : 0.7025) * Math.sqrt(n0(math.divide(E, fc))) : n0(Ck);
      // λ > 50 no está permitido (E.010 9.4): se sigue usando 0.329·E·A/λ² para que la memoria continúe y la
      // verificación «λ ≤ 50» de la plantilla marque NO CUMPLE (sin errores en cadena)
      if (!(l > 0)) throw new Error('E.010: la esbeltez debe ser positiva');
      if (l < (circ ? 9 : 10)) return math.multiply(fc, A);
      if (l <= ck) return math.multiply(1 - (l / ck) ** 4 / 3, math.multiply(fc, A));
      return math.multiply((circ ? 0.2467 : 0.329) / (l * l), math.multiply(E, A)); },
    tex: 'N_{adm}', desc: 'E.010 Art. 27, 28 y 30: columna corta (λ<10), intermedia (λ≤Ck) o larga (0.329 EA/λ², λ≤50); circular (forma = 2): λ<9, 0.2467 EA/λ², λ≤43. Límite de λ: verificar aparte', args: 'fc, Emin, A, λ, Ck, forma',
  },
  kmE010: { fn: (N, Ncr) => { const r = n0(math.divide(N, Ncr)); if (!(r >= 0)) throw new Error('E.010: N y Ncr deben ser positivos'); return r >= 0.666 ? 1000 : 1 / (1 - 1.5 * r); }, tex: 'k_m', desc: 'E.010 Art. 31.2: km = 1/(1 − 1.5 N/Ncr); si N ≥ Ncr/1.5 (inestable) devuelve 1000 para que la interacción NO CUMPLA', args: 'N, Ncr' },
}, 'Madera — E.010');

// ---------------------------------------------------------------------
//  NTE E.080 Diseño y construcción con tierra reforzada (2017)
// ---------------------------------------------------------------------
defineFns({
  SE080: { fn: (k) => pick({ 1: 1.0, 2: 1.4 }, k, 'Suelo E.080'), tex: 'S', desc: 'E.080 Tabla 1: factor de suelo (1: roca o suelo muy resistente; 2: intermedio o blando)', args: 'tipo' },
  UE080: { fn: (k) => pick({ 1: 1.0, 2: 1.2, 3: 1.4 }, k, 'Uso E.080'), tex: 'U', desc: 'E.080 Tabla 2: factor de uso (1 vivienda, 2 comercio/oficinas, 3 educación/salud)', args: 'tipo' },
  densE080: { fn: (k) => pick({ 1: 0.08, 2: 0.12, 3: 0.15 }, k, 'Uso E.080'), tex: 'd_{min}', desc: 'E.080 Tabla 2: densidad mínima de muros por dirección', args: 'tipo' },
  CE080: { fn: (z) => pick({ 4: 0.25, 3: 0.20, 2: 0.15, 1: 0.10 }, z, 'Zona sísmica'), tex: 'C', desc: 'E.080 Tabla 3: coeficiente sísmico por zona', args: 'zona' },
}, 'Tierra — E.080');

// ---------------------------------------------------------------------
//  ACI 350.3-06 — Masas equivalentes de Housner, alturas y periodos
// ---------------------------------------------------------------------
const GRAV = 9.80665;
const r0 = (x, w) => { const v = n0(x); if (!(v > 0)) throw new Error(w + ' debe ser mayor que cero'); return v; };
export const aci = {
  WiWL: (r, c = 0.866) => Math.tanh(c * r) / (c * r),
  WcWLc: (r) => 0.230 * r * Math.tanh(3.68 / r),
  WcWLr: (r) => 0.264 * r * Math.tanh(3.16 / r),
  hiHL: (r) => (r < 1.333 ? 0.5 - 0.09375 * r : 0.375),
  hcHL: (r, k) => { const x = k / r; return 1 - (Math.cosh(x) - 1) / (x * Math.sinh(x)); },
  hipHL: (r) => (r < 0.75 ? 0.45 : 0.866 * r / (2 * Math.tanh(0.866 * r)) - 1 / 8),
  hcpHL: (r, k) => { const x = k / r; return 1 - (Math.cosh(x) - 2.01) / (x * Math.sinh(x)); },
  Tc: (B, HL, k) => 2 * Math.PI * Math.sqrt(B / (k * GRAV * Math.tanh(k * HL / B))),
  eps: (r) => Math.min(1, 0.0151 * r * r - 0.1908 * r + 1.021),
  Cw: (x) => 9.375e-2 + 0.2039 * x - 0.1034 * x * x - 0.1253 * x ** 3 + 0.1267 * x ** 4 - 3.186e-2 * x ** 5,
  Ci: (T, SDS, SD1) => (T <= SD1 / SDS ? SDS : Math.min(SD1 / T, SDS)),
  Cc: (T, SDS, SD1) => (T <= 1.6 / (SD1 / SDS) ? Math.min(1.5 * SD1 / T, 1.5 * SDS) : 2.4 * SDS / (T * T)),
};
defineFns({
  WiWLc: { fn: (r) => aci.WiWL(r0(r, 'D/HL')), tex: '\\frac{W_i}{W_L}', desc: 'ACI 350.3 Ec. 9-15: Wi/WL = tanh(0.866 D/HL)/(0.866 D/HL), tanque circular', args: 'D/HL' },
  WcWLc: { fn: (r) => aci.WcWLc(r0(r, 'D/HL')), tex: '\\frac{W_c}{W_L}', desc: 'ACI 350.3 Ec. 9-16: Wc/WL = 0.230 (D/HL) tanh(3.68 HL/D)', args: 'D/HL' },
  hiHLc: { fn: (r) => aci.hiHL(r0(r, 'D/HL')), tex: '\\frac{h_i}{H_L}', desc: 'ACI 350.3 Ec. 9-17/18: altura de Wi (sin presión en la base, EBP)', args: 'D/HL' },
  hcHLc: { fn: (r) => aci.hcHL(r0(r, 'D/HL'), 3.68), tex: '\\frac{h_c}{H_L}', desc: 'ACI 350.3 Ec. 9-19: altura de Wc (EBP)', args: 'D/HL' },
  hipHLc: { fn: (r) => aci.hipHL(r0(r, 'D/HL')), tex: "\\frac{h'_i}{H_L}", desc: 'ACI 350.3 Ec. 9-20/21: altura de Wi incluyendo presión en la base (IBP)', args: 'D/HL' },
  hcpHLc: { fn: (r) => aci.hcpHL(r0(r, 'D/HL'), 3.68), tex: "\\frac{h'_c}{H_L}", desc: 'ACI 350.3 Ec. 9-22: altura de Wc (IBP)', args: 'D/HL' },
  WiWLr: { fn: (r) => aci.WiWL(r0(r, 'L/HL')), tex: '\\frac{W_i}{W_L}', desc: 'ACI 350.3 Ec. 9-1: tanque rectangular', args: 'L/HL' },
  WcWLr: { fn: (r) => aci.WcWLr(r0(r, 'L/HL')), tex: '\\frac{W_c}{W_L}', desc: 'ACI 350.3 Ec. 9-2: Wc/WL = 0.264 (L/HL) tanh(3.16 HL/L)', args: 'L/HL' },
  hiHLr: { fn: (r) => aci.hiHL(r0(r, 'L/HL')), tex: '\\frac{h_i}{H_L}', desc: 'ACI 350.3 Ec. 9-3/4 (EBP)', args: 'L/HL' },
  hcHLr: { fn: (r) => aci.hcHL(r0(r, 'L/HL'), 3.16), tex: '\\frac{h_c}{H_L}', desc: 'ACI 350.3 Ec. 9-5 (EBP)', args: 'L/HL' },
  hipHLr: { fn: (r) => aci.hipHL(r0(r, 'L/HL')), tex: "\\frac{h'_i}{H_L}", desc: 'ACI 350.3 Ec. 9-6/7 (IBP)', args: 'L/HL' },
  hcpHLr: { fn: (r) => aci.hcpHL(r0(r, 'L/HL'), 3.16), tex: "\\frac{h'_c}{H_L}", desc: 'ACI 350.3 Ec. 9-8 (IBP)', args: 'L/HL' },
  TcACIc: { fn: (D, HL) => mkUnit(aci.Tc(r0(toNum(D, 'm'), 'D'), r0(toNum(HL, 'm'), 'HL'), 3.68), 's'), tex: 'T_c', desc: 'ACI 350.3 Ec. 9-28 a 9-30: periodo convectivo Tc = 2π√(D/(3.68 g tanh(3.68 HL/D)))', args: 'D, HL' },
  TcACIr: { fn: (L, HL) => mkUnit(aci.Tc(r0(toNum(L, 'm'), 'L'), r0(toNum(HL, 'm'), 'HL'), 3.16), 's'), tex: 'T_c', desc: 'ACI 350.3 Ec. 9-12 a 9-14: periodo convectivo, tanque rectangular', args: 'L, HL' },
  CwACI: { fn: (x) => aci.Cw(r0(x, 'HL/D')), tex: 'C_w', desc: 'ACI 350.3 Fig. 9.3.4(a): coeficiente Cw (polinomio en HL/D)', args: 'HL/D' },
  TiACIc: {
    fn: (HL, D, tw, Ec, gc) => { const hl = toNum(HL, 'm'), d = toNum(D, 'm'), t = toNum(tw, 'm'), E = toNum(Ec, 'Pa'), ga = toNum(gc, 'N/m^3');
      const Cl = 10 * aci.Cw(hl / d) * Math.sqrt(t / (d / 2)); const w = Cl / hl * Math.sqrt(E * GRAV / ga); return mkUnit(2 * Math.PI / w, 's'); },
    tex: 'T_i', desc: 'ACI 350.3 Ec. 9-23 a 9-25: periodo impulsivo de tanque circular (Cl = 10 Cw √(tw/r))', args: 'HL, D, tw, Ec, γc',
  },
  TvACIc: {
    fn: (D, HL, tw, Ec, gL = 9806.65) => { const d = toNum(D, 'm'), hl = toNum(HL, 'm'), t = toNum(tw, 'm'), E = toNum(Ec, 'Pa'), g = math.isUnit(gL) ? toNum(gL, 'N/m^3') : n0(gL);
      return mkUnit(2 * Math.PI * Math.sqrt(g * d * hl * hl / (2 * GRAV * t * E)), 's'); },
    tex: 'T_v', desc: 'ACI 350.3-06 Ec. 9-31 (SI): periodo vertical del líquido Tv = 2π√(γL D HL²/(2 g tw Ec)), tanque circular', args: 'D, HL, tw, Ec, γL',
  },
  CtACI: { fn: (Tv, SDS, SD1, forma = 1) => (Math.round(n0(forma)) === 2 ? 0.4 * n0(SDS) : aci.Ci(toNum(Tv, 's'), n0(SDS), n0(SD1))), tex: 'C_t', desc: 'ACI 350.3-06 Ec. 9-39/40: Ct = SDS (Tv ≤ Ts) o SD1/Tv (circular); 0.4 SDS (rectangular, forma = 2)', args: 'Tv, SDS, SD1, forma' },
  epsACIc: { fn: (r) => aci.eps(r0(r, 'D/HL')), tex: '\\varepsilon', desc: 'ACI 350.3 Ec. 9-45: coeficiente de masa efectiva de la pared', args: 'D/HL' },
  epsACIr: { fn: (r) => aci.eps(r0(r, 'L/HL')), tex: '\\varepsilon', desc: 'ACI 350.3 Ec. 9-44', args: 'L/HL' },
  CiACI: { fn: (T, SDS, SD1) => aci.Ci(toNum(T, 's'), n0(SDS), n0(SD1)), tex: 'C_i', desc: 'ACI 350.3 Ec. 9-32/33: coeficiente sísmico impulsivo', args: 'Ti, SDS, SD1' },
  CcACI: { fn: (T, SDS, SD1) => aci.Cc(toNum(T, 's'), n0(SDS), n0(SD1)), tex: 'C_c', desc: 'ACI 350.3 Ec. 9-37/38: coeficiente sísmico convectivo (amortiguamiento 0.5 %)', args: 'Tc, SDS, SD1' },
}, 'Tanques — ACI 350.3');

// ---------------------------------------------------------------------
//  Pared cilíndrica de tanque (PCA «Circular Concrete Tanks without Prestressing»)
//  Solución exacta de la ecuación de la cáscara cilíndrica (Timoshenko):
//    D w'''' + (E t / R²) w = p(x),  ν = 0.2 (reproduce las Tablas A-1, A-2, A-5, A-12)
//  k = H²/(D t);  y/H medido desde el borde superior (como en las tablas PCA)
//  base: 1 empotrada, 2 articulada;   carga: 1 triangular (líquido), 2 uniforme
//  T = coef·w·H·R (triangular) | coef·p·R (uniforme);  M = coef·w·H³ | coef·p·H²;  V = coef·w·H² | coef·p·H
// ---------------------------------------------------------------------
function solveN(A, b) {
  const n = b.length; A = A.map(r => Array.from(r)); b = Array.from(b);
  for (let i = 0; i < n; i++) {
    let p = i; for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r;
    [A[i], A[p]] = [A[p], A[i]]; [b[i], b[p]] = [b[p], b[i]];
    if (Math.abs(A[i][i]) < 1e-300) throw new Error('Sistema singular');
    for (let r = i + 1; r < n; r++) { const f = A[r][i] / A[i][i]; for (let c = i; c < n; c++) A[r][c] -= f * A[i][c]; b[r] -= f * b[i]; }
  }
  const x = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) { let s = b[i]; for (let c = i + 1; c < n; c++) s -= A[i][c] * x[c]; x[i] = s / A[i][i]; }
  return x;
}
const _shellCache = new Map();
export function shellPCA(k, base = 1, carga = 1, nu = 0.2) {
  k = +k; if (!(k > 0.05) || k > 200) throw new Error('H²/(D·t) fuera de rango (0.05 a 200)');
  const key = [k, base, carga, nu].join('|');
  if (_shellCache.has(key)) return _shellCache.get(key);
  const b = Math.pow(12 * (1 - nu * nu), 0.25) * Math.sqrt(k); // β·H (H = 1)
  const basis = (x) => {
    const e = Math.exp(-b * x), c = Math.cos(b * x), s = Math.sin(b * x);
    const u = 1 - x, eu = Math.exp(-b * u), cu = Math.cos(b * u), su = Math.sin(b * u);
    const F1 = [e * c, -b * e * (c + s), 2 * b * b * e * s, 2 * b ** 3 * e * (c - s)];
    const F2 = [e * s, b * e * (c - s), -2 * b * b * e * c, 2 * b ** 3 * e * (c + s)];
    const G1 = [eu * cu, b * eu * (cu + su), 2 * b * b * eu * su, -2 * b ** 3 * eu * (cu - su)];
    const G2 = [eu * su, -b * eu * (cu - su), -2 * b * b * eu * cu, -2 * b ** 3 * eu * (cu + su)];
    return [F1, F2, G1, G2];
  };
  const wp = (x) => (Math.round(carga) === 2 ? [1, 0, 0, 0] : [1 - x, -1, 0, 0]);
  const B0 = basis(0), B1 = basis(1), p0 = wp(0), p1 = wp(1);
  const fixed = Math.round(base) !== 2;
  const A = [B0.map(f => f[0]), B0.map(f => f[fixed ? 1 : 2]), B1.map(f => f[2]), B1.map(f => f[3])];
  const C = solveN(A, [-p0[0], -p0[fixed ? 1 : 2], -p1[2], -p1[3]]);
  const at = (x) => { const B = basis(x), p = wp(x); return [0, 1, 2, 3].map(o => p[o] + B.reduce((s, f, i) => s + C[i] * f[o], 0)); };
  const mf = -1 / (12 * (1 - nu * nu)) / (4 * k * k);
  const r = { bH: b, T: (y) => at(1 - y)[0], M: (y) => mf * at(1 - y)[2], V: (y) => -mf * at(1 - y)[3] };
  // máximos (barrido fino)
  let Tm = -1e9, yT = 0, Mp = -1e9, yM = 0;
  for (let i = 0; i <= 400; i++) { const y = i / 400, t = r.T(y), m = r.M(y); if (t > Tm) { Tm = t; yT = y; } if (m > Mp) { Mp = m; yM = y; } }
  Object.assign(r, { Tmax: Tm, yTmax: yT, Mpos: Mp, yMpos: yM, Mbase: r.M(1), Vbase: Math.abs(r.V(1)) });
  if (_shellCache.size > 200) _shellCache.clear();
  _shellCache.set(key, r);
  return r;
}
defineFns({
  TcoefPCA: { fn: (k, y, base = 1, carga = 1) => shellPCA(n0(k), n0(base), n0(carga)).T(clamp(n0(y), 0, 1)), tex: 'C_T', desc: 'PCA Tablas A-1/A-5 (exacto, ν=0.2): coeficiente de tensión anular T = C·w·H·R en y/H (desde arriba)', args: 'H²/Dt, y/H, base(1 emp/2 art), carga(1 tri/2 unif)' },
  McoefPCA: { fn: (k, y, base = 1, carga = 1) => shellPCA(n0(k), n0(base), n0(carga)).M(clamp(n0(y), 0, 1)), tex: 'C_M', desc: 'PCA Tablas A-2/A-7: coeficiente de momento vertical M = C·w·H³ (+ tracción en la cara exterior)', args: 'H²/Dt, y/H, base, carga' },
  VcoefPCA: { fn: (k, base = 1, carga = 1) => shellPCA(n0(k), n0(base), n0(carga)).Vbase, tex: 'C_V', desc: 'PCA Tabla A-12: coeficiente de cortante en la base V = C·w·H²', args: 'H²/Dt, base, carga' },
  TmaxPCA: { fn: (k, base = 1, carga = 1) => shellPCA(n0(k), n0(base), n0(carga)).Tmax, tex: 'C_{T,max}', desc: 'PCA: coeficiente máximo de tensión anular', args: 'H²/Dt, base, carga' },
  yTmaxPCA: { fn: (k, base = 1, carga = 1) => shellPCA(n0(k), n0(base), n0(carga)).yTmax, tex: 'y_{T,max}/H', desc: 'PCA: posición (desde arriba) de la tensión anular máxima', args: 'H²/Dt, base, carga' },
  MposPCA: { fn: (k, base = 1, carga = 1) => shellPCA(n0(k), n0(base), n0(carga)).Mpos, tex: 'C_{M+}', desc: 'PCA: coeficiente de momento positivo máximo (tracción cara interior)', args: 'H²/Dt, base, carga' },
}, 'Tanques — PCA');

// ---------------------------------------------------------------------
//  Placa rectangular por diferencias finitas (biarmónica con nudos ficticios)
//  bordes: E empotrado, A articulado, L libre. Valida contra Timoshenko y E.070 Tabla 12.
//  a = ancho (x), b = alto (y, y = 0 en la base); q(x, y) por unidad de rigidez D = 1.
// ---------------------------------------------------------------------
export function plateFD(a, b, edges, qf, nu = 0.2, nx = 24, ny = 24) {
  const hx = a / nx, hy = b / ny, sup = (e) => e === 'E' || e === 'A';
  const key = (i, j) => i + ',' + j, idx = new Map(); let n = 0;
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
    const s = (i === 0 && sup(edges.left)) || (i === nx && sup(edges.right)) || (j === 0 && sup(edges.bot)) || (j === ny && sup(edges.top));
    if (!s) idx.set(key(i, j), n++);
  }
  if (n === 0) throw new Error('Placa sin grados de libertad');
  const add = (...t) => { const o = {}; for (const [c, v] of t) for (const k in v) o[k] = (o[k] || 0) + c * v[k]; return o; };
  const memo = new Map();
  function W(i, j, d = 0) {
    const kk = key(i, j); if (memo.has(kk)) return memo.get(kk);
    if (d > 10) throw new Error('Condiciones de borde incompatibles');
    let r;
    if (i >= 0 && i <= nx && j >= 0 && j <= ny) r = idx.has(kk) ? { [idx.get(kk)]: 1 } : {};
    else if (i < 0 || i > nx) {
      const e = i < 0 ? edges.left : edges.right, ib = i < 0 ? 0 : nx;
      if ((j < 0 && sup(edges.bot)) || (j > ny && sup(edges.top))) r = {};
      else if (e === 'E') r = W(2 * ib - i, j, d + 1); else if (e === 'A') r = add([-1, W(2 * ib - i, j, d + 1)]);
      else r = ghost(i, j, ib, true, d);
    } else {
      const e = j < 0 ? edges.bot : edges.top, jb = j < 0 ? 0 : ny;
      if (e === 'E') r = W(i, 2 * jb - j, d + 1); else if (e === 'A') r = add([-1, W(i, 2 * jb - j, d + 1)]);
      else r = ghost(i, j, jb, false, d);
    }
    memo.set(kk, r); return r;
  }
  // borde libre: M_n = 0 (fantasma 1) y V_n = 0 (fantasma 2)
  function ghost(i, j, eb, alongX, d) {
    const P = (u, v) => (alongX ? W(u, v, d + 1) : W(v, u, d + 1)); // u: normal, v: tangencial
    const u = alongX ? i : j, v = alongX ? j : i, s = u > eb ? 1 : -1, dist = Math.abs(u - eb);
    const hn = alongX ? hx : hy, ht = alongX ? hy : hx;
    const tSup = alongX ? ((v === 0 && sup(edges.bot)) || (v === ny && sup(edges.top))) : ((v === 0 && sup(edges.left)) || (v === nx && sup(edges.right)));
    if (tSup) return {};
    const r2 = (hn * hn) / (ht * ht);
    if (dist === 1) return add([2, P(eb, v)], [-1, P(eb - s, v)], [-nu * r2, add([1, P(eb, v + 1)], [-2, P(eb, v)], [1, P(eb, v - 1)])]);
    const g1 = (vv) => P(eb + s, vv), m1 = (vv) => P(eb - s, vv);
    const c = (2 - nu) * r2;
    const t1 = add([1, g1(v + 1)], [-2, g1(v)], [1, g1(v - 1)]), tm = add([1, m1(v + 1)], [-2, m1(v)], [1, m1(v - 1)]);
    return add([2, g1(v)], [-2, m1(v)], [1, P(eb - 2 * s, v)], [-c, add([1, t1], [-1, tm])]);
  }
  const A = Array.from({ length: n }, () => new Float64Array(n)), B = new Float64Array(n);
  const ax = 1 / hx ** 4, ay = 1 / hy ** 4, axy = 2 / (hx * hx * hy * hy);
  for (const [kk, r] of idx) {
    const [i, j] = kk.split(',').map(Number);
    const eq = add([6 * ax + 6 * ay + 4 * axy, W(i, j)], [-4 * ax - 2 * axy, W(i + 1, j)], [-4 * ax - 2 * axy, W(i - 1, j)],
      [-4 * ay - 2 * axy, W(i, j + 1)], [-4 * ay - 2 * axy, W(i, j - 1)], [ax, W(i + 2, j)], [ax, W(i - 2, j)], [ay, W(i, j + 2)], [ay, W(i, j - 2)],
      [axy, W(i + 1, j + 1)], [axy, W(i - 1, j + 1)], [axy, W(i + 1, j - 1)], [axy, W(i - 1, j - 1)]);
    for (const c in eq) A[r][c] += eq[c];
    B[r] = qf(i * hx, j * hy);
  }
  for (let p = 0; p < n; p++) {
    let m = p; for (let r = p + 1; r < n; r++) if (Math.abs(A[r][p]) > Math.abs(A[m][p])) m = r;
    if (m !== p) { const t = A[p]; A[p] = A[m]; A[m] = t; const tb = B[p]; B[p] = B[m]; B[m] = tb; }
    const Ap = A[p], piv = Ap[p]; if (Math.abs(piv) < 1e-14) throw new Error('Placa inestable: revise los bordes');
    for (let r = p + 1; r < n; r++) { const Ar = A[r], f = Ar[p] / piv; if (f === 0) continue; for (let c = p; c < n; c++) Ar[c] -= f * Ap[c]; B[r] -= f * B[p]; }
  }
  const X = new Float64Array(n);
  for (let p = n - 1; p >= 0; p--) { let s = B[p]; const Ap = A[p]; for (let c = p + 1; c < n; c++) s -= Ap[c] * X[c]; X[p] = s / Ap[p]; }
  const val = (v) => { let s = 0; for (const k in v) s += v[k] * X[k]; return s; };
  const w = (i, j) => val(W(i, j));
  const wxx = (i, j) => (w(i + 1, j) - 2 * w(i, j) + w(i - 1, j)) / hx ** 2, wyy = (i, j) => (w(i, j + 1) - 2 * w(i, j) + w(i, j - 1)) / hy ** 2;
  const Mx = (i, j) => -(wxx(i, j) + nu * wyy(i, j)), My = (i, j) => -(wyy(i, j) + nu * wxx(i, j));
  return { w, Mx, My, nx, ny, hx, hy };
}
// Análisis de pared de tanque rectangular: carga trapezoidal q = qs + (qb − qs)(1 − y/hq) ≥ qs
const _plCache = new Map();
export function tankWall(a, b, edges, qb, qs = 0, nu = 0.2, ndiv = 20, hq = b) {
  const key = [a, b, edges.bot, edges.top, edges.left, edges.right, qb, qs, nu, ndiv, hq].join('|');
  if (_plCache.has(key)) return _plCache.get(key);
  const nx = Math.max(8, Math.min(40, 2 * Math.round(ndiv * Math.sqrt(a / b) / 2))), ny = Math.max(8, Math.min(40, 2 * Math.round(ndiv * Math.sqrt(b / a) / 2)));
  // q(y) = qs + (qb − qs)·⟨1 − y/hq⟩  (hq = altura de la carga triangular, p. ej. nivel del agua)
  const r = plateFD(a, b, edges, (x, y) => qs + (qb - qs) * Math.max(0, 1 - y / hq), nu, nx, ny);
  let MxN = 0, MxP = 0, MyN = 0, MyP = 0, iMyP = 0, jMyP = 0, jMxN = 0, jMxP = 0;
  for (let j = 0; j <= r.ny; j++) for (let i = 0; i <= r.nx; i++) {
    const mx = r.Mx(i, j), my = r.My(i, j);
    if (mx < MxN) { MxN = mx; jMxN = j; } if (mx > MxP) { MxP = mx; jMxP = j; }
    if (my < MyN) MyN = my; if (my > MyP) { MyP = my; iMyP = i; jMyP = j; }
  }
  const ic = Math.round(r.nx / 2);
  // cortante en la base (franja central): V = dMy/dy (diferencia hacia adelante de 2º orden)
  const Vb = Math.abs((-3 * r.My(ic, 0) + 4 * r.My(ic, 1) - r.My(ic, 2)) / (2 * r.hy));
  const out = { r, nx: r.nx, ny: r.ny, MxN, MxP, MyN, MyP, MyB: r.My(ic, 0), Vb, jMxN, jMxP, iMyP, jMyP };
  if (_plCache.size > 50) _plCache.clear();
  _plCache.set(key, out);
  return out;
}
