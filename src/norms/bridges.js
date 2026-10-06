// =====================================================================
//  Funciones normativas — módulo «bridges» (puentes)
//  AASHTO LRFD Bridge Design Specifications (9.ª ed. 2020 / 10.ª ed. 2024)
//  y Manual de Puentes MTC (Perú, 2018), que adopta AASHTO LRFD.
//  Referencias, tablas y validaciones: docs/referencias/bridges.md
//  Convención: todas las funciones tienen sufijo «LRFD» para no chocar con
//  otros módulos. Las longitudes pueden pasarse con unidades (recomendado);
//  un número sin unidad se interpreta en la unidad indicada en cada función.
// =====================================================================
import { defineFns, math, toNum, mkUnit, interp1 } from '../engine.js';

const isU = (x) => math.isUnit(x);
const mm = (x) => (isU(x) ? x.toNumber('mm') : toNum(x));          // número sin unidad = mm
const mt = (x) => (isU(x) ? x.toNumber('m') : toNum(x));           // número sin unidad = m
const ksi = (x) => (isU(x) ? x.toNumber('ksi') : toNum(x));        // número sin unidad = ksi
const ft = (x) => (isU(x) ? x.toNumber('ft') : toNum(x) / 304.8);   // número sin unidad = mm
const inch = (x) => (isU(x) ? x.toNumber('in') : toNum(x) / 25.4);
const in4 = (x) => (isU(x) ? x.toNumber('in^4') : toNum(x) / 25.4 ** 4);
const mm4 = (x) => (isU(x) ? x.toNumber('mm^4') : toNum(x));          // número sin unidad = mm⁴
const isMTC = (v) => v !== undefined && v !== null && Math.round(toNum(v)) === 2;   // versión de las fórmulas de distribución
const deg = (x) => (isU(x) ? x.toNumber('deg') : toNum(x));        // número sin unidad = grados
const n0 = (x) => toNum(x);
const chk = (c, msg) => { if (!c) throw new Error(msg); };
const ratio = (a, b) => (isU(a) ? a.value : n0(a)) / (isU(b) ? b.value : n0(b));   // cociente adimensional

// ---------------------------------------------------------------------
//  Vehículos de diseño AASHTO (3.6.1.2) en tonf y m
// ---------------------------------------------------------------------
export const AX_TRUCK = (s = 4.3) => [{ p: 3.63, x: 0 }, { p: 14.52, x: 4.3 }, { p: 14.52, x: 4.3 + s }];
export const AX_TANDEM = [{ p: 11.34, x: 0 }, { p: 11.34, x: 1.2 }];
export const W_LANE = 0.952;                                       // tonf/m (0.64 klf; 9.3 N/mm)

// Momento máximo en la sección x de una viga simple de luz L por un tren de cargas
// (línea de influencia lineal a trozos: el extremo ocurre con un eje sobre un vértice)
function mAtSimple(L, x, axles) {
  const eta = (xi) => (xi < 0 || xi > L ? 0 : xi <= x ? xi * (L - x) / L : x * (L - xi) / L);
  let best = 0;
  const span = axles[axles.length - 1].x;
  for (const flip of [false, true]) {
    const ax = flip ? axles.map(a => ({ p: a.p, x: span - a.x })) : axles;
    for (const a of ax) for (const k of [0, x, L]) {
      const s = k - a.x; const M = ax.reduce((t, b) => t + b.p * eta(b.x + s), 0);
      if (M > best) best = M;
    }
  }
  return best;
}
// Cortante máximo (positivo, justo a la derecha de x) en viga simple
function vAtSimple(L, x, axles) {
  const eta = (xi) => (xi < 0 || xi > L ? 0 : xi < x ? -xi / L : (L - xi) / L);
  let best = 0;
  const span = axles[axles.length - 1].x;
  for (const flip of [false, true]) {
    const ax = flip ? axles.map(a => ({ p: a.p, x: span - a.x })) : axles;
    for (const a of ax) for (const k of [x, L]) {
      const s = k - a.x; const V = ax.reduce((t, b) => t + b.p * eta(b.x + s), 0);
      if (V > best) best = V;
    }
  }
  return best;
}
// Momento máximo absoluto en viga simple (barrido de secciones + posición teórica)
export function absMaxMSimple(L, axles) {
  chk(L > 0 && L < 1e4, 'Luz fuera de rango');
  let best = 0;
  const xs = [];
  for (let i = 0; i <= 200; i++) xs.push(L * i / 200);
  const R = axles.reduce((t, a) => t + a.p, 0), xr = axles.reduce((t, a) => t + a.p * a.x, 0) / R;
  for (const a of axles) { xs.push(L / 2 - (xr - a.x) / 2, L / 2 + (xr - a.x) / 2); }
  for (let i0 = 0; i0 < axles.length; i0++) for (let i1 = i0; i1 < axles.length; i1++) {
    const g = axles.slice(i0, i1 + 1), Rg = g.reduce((t, a) => t + a.p, 0), xg = g.reduce((t, a) => t + a.p * a.x, 0) / Rg;
    for (const a of g) xs.push(L / 2 - (xg - a.x) / 2, L / 2 + (xg - a.x) / 2);
  }
  for (const x of xs) if (x >= 0 && x <= L) best = Math.max(best, mAtSimple(L, x, axles));
  return best;
}
export { mAtSimple, vAtSimple };

// ---------------------------------------------------------------------
//  Tablas sísmicas AASHTO 3.10.3.2 (Fpga, Fa, Fv) — clases de sitio A–E
// ---------------------------------------------------------------------
const SITE = { A: 1, B: 2, C: 3, D: 4, E: 5, F: 6 };
function siteNum(c) {
  if (typeof c === 'string') { const k = SITE[c.trim().toUpperCase()]; chk(k, 'Clase de sitio inválida: ' + c); c = k; }
  const n = Math.round(n0(c)); chk(n >= 1 && n <= 6, 'Clase de sitio: use 1=A, 2=B, 3=C, 4=D, 5=E');
  chk(n !== 6, 'Clase de sitio F: se requiere un estudio de respuesta de sitio (AASHTO 3.10.3.1)');
  return n;
}
const T_FPGA = { x: [0.10, 0.20, 0.30, 0.40, 0.50], 1: [0.8, 0.8, 0.8, 0.8, 0.8], 2: [1, 1, 1, 1, 1], 3: [1.2, 1.2, 1.1, 1.0, 1.0], 4: [1.6, 1.4, 1.2, 1.1, 1.0], 5: [2.5, 1.7, 1.2, 0.9, 0.9] };
const T_FA = { x: [0.25, 0.50, 0.75, 1.00, 1.25], 1: T_FPGA[1], 2: T_FPGA[2], 3: T_FPGA[3], 4: T_FPGA[4], 5: T_FPGA[5] };
const T_FV = { x: [0.10, 0.20, 0.30, 0.40, 0.50], 1: [0.8, 0.8, 0.8, 0.8, 0.8], 2: [1, 1, 1, 1, 1], 3: [1.7, 1.6, 1.5, 1.4, 1.3], 4: [2.4, 2.0, 1.8, 1.6, 1.5], 5: [3.5, 3.2, 2.8, 2.4, 2.4] };
const siteF = (tab, v, c) => interp1(n0(v), tab.x, tab[siteNum(c)]);

// Csm — coeficiente de respuesta sísmica elástica (3.10.4.2)
function csm(T, As, SDS, SD1) {
  T = isU(T) ? T.toNumber('s') : n0(T); As = n0(As); SDS = n0(SDS); SD1 = n0(SD1);
  chk(SDS > 0 && SD1 > 0, 'SDS y SD1 deben ser positivos');
  const Ts = SD1 / SDS, T0 = 0.2 * Ts;
  if (T < T0) return As + (SDS - As) * T / T0;
  if (T <= Ts) return SDS;
  return SD1 / Math.max(T, 1e-9);
}

// Tabla 3.11.6.4-1: altura equivalente de suelo por sobrecarga vehicular (estribos)
const BARR = { 1: { Ft: 60, Lt: 1220, H: 685 }, 2: { Ft: 120, Lt: 1220, H: 685 }, 3: { Ft: 240, Lt: 1220, H: 685 }, 4: { Ft: 240, Lt: 1070, H: 810 }, 5: { Ft: 550, Lt: 2440, H: 1070 }, 6: { Ft: 780, Lt: 2440, H: 2290 } };
const BAR = (TL) => { const k = Math.round(n0(TL)); chk(BARR[k], 'Nivel de contención TL entre 1 y 6'); return BARR[k]; };
const HEQ = { x: [1.5, 3.0, 6.0], y: [1.2, 0.9, 0.6] };

const ap = (f, tex, desc, args) => ({ fn: f, tex, desc, args });
const FN = {
  // ---------------- factores de distribución (4.6.2.2) ----------------
  // Expresiones de la 9.ª/10.ª ed. (unidades de EE. UU.: S, L, de en ft; ts en in; Kg en in⁴), evaluadas con conversión exacta.
  // El Manual MTC 2018 usa la versión SI de ediciones anteriores (constantes redondeadas: 4300, 2900, 3600 mm…; diferencias < 1.5 %).
  // Argumento opcional «ver»: 1 (o vacío) = 9.ª/10.ª ed. AASHTO (unidades EE. UU., conversión exacta);
  //                            2 = forma SI del Manual de Puentes MTC 2018 (AASHTO 4.ª ed. SI: S/4300, S/2900, de/2800…).
  gMi1LRFD: ap((S, L, ts, Kg, ver) => {
    chk(mm(S) > 0 && mm(L) > 0 && mm(ts) > 0 && mm4(Kg) > 0, 'Parámetros del factor de distribución deben ser positivos');
    if (isMTC(ver)) { const s = mm(S), l = mm(L), t = mm(ts), k = mm4(Kg); return 0.06 + (s / 4300) ** 0.4 * (s / l) ** 0.3 * (k / (l * t ** 3)) ** 0.1; }
    const s = ft(S), l = ft(L), t = inch(ts), k = in4(Kg);
    return 0.06 + (s / 14) ** 0.4 * (s / l) ** 0.3 * (k / (12 * l * t ** 3)) ** 0.1;
  }, 'g_{M,1}', 'Factor de distribución de momento, viga interior, un carril: 0.06 + (S/14)^0.4(S/L)^0.3(Kg/12Lts³)^0.1 [ft, in] (Tabla 4.6.2.2.2b-1, tipos a, e, k); ver = 2: forma SI MTC 0.06 + (S/4300)^0.4(S/L)^0.3(Kg/Lts³)^0.1 [mm]', 'S, L, ts, Kg [, ver]'),
  gMi2LRFD: ap((S, L, ts, Kg, ver) => {
    chk(mm(S) > 0 && mm(L) > 0 && mm(ts) > 0 && mm4(Kg) > 0, 'Parámetros del factor de distribución deben ser positivos');
    if (isMTC(ver)) { const s = mm(S), l = mm(L), t = mm(ts), k = mm4(Kg); return 0.075 + (s / 2900) ** 0.6 * (s / l) ** 0.2 * (k / (l * t ** 3)) ** 0.1; }
    const s = ft(S), l = ft(L), t = inch(ts), k = in4(Kg);
    return 0.075 + (s / 9.5) ** 0.6 * (s / l) ** 0.2 * (k / (12 * l * t ** 3)) ** 0.1;
  }, 'g_{M,2}', 'Factor de distribución de momento, viga interior, dos o más carriles: 0.075 + (S/9.5)^0.6(S/L)^0.2(Kg/12Lts³)^0.1 (Tabla 4.6.2.2.2b-1); ver = 2: 0.075 + (S/2900)^0.6(S/L)^0.2(Kg/Lts³)^0.1 (MTC)', 'S, L, ts, Kg [, ver]'),
  gVi1LRFD: ap((S, ver) => (isMTC(ver) ? 0.36 + mm(S) / 7600 : 0.36 + ft(S) / 25), 'g_{V,1}', 'Factor de distribución de cortante, viga interior, un carril: 0.36 + S/25 (ft); ver = 2: 0.36 + S/7600 (mm) (Tabla 4.6.2.2.3a-1)', 'S [, ver]'),
  gVi2LRFD: ap((S, ver) => { if (isMTC(ver)) { const s = mm(S); return 0.2 + s / 3600 - (s / 10700) ** 2; } const s = ft(S); return 0.2 + s / 12 - (s / 35) ** 2; }, 'g_{V,2}', 'Factor de distribución de cortante, viga interior, dos o más carriles: 0.2 + S/12 − (S/35)² (ft); ver = 2: 0.2 + S/3600 − (S/10700)² (mm) (Tabla 4.6.2.2.3a-1)', 'S [, ver]'),
  eMLRFD: ap((de, ver) => (isMTC(ver) ? 0.77 + mm(de) / 2800 : 0.77 + ft(de) / 9.1), 'e_{M}', 'Factor de corrección momento viga exterior e = 0.77 + de/9.1 (ft); ver = 2: 0.77 + de/2800 (mm) (Tabla 4.6.2.2.2d-1)', 'de [, ver]'),
  eVLRFD: ap((de, ver) => (isMTC(ver) ? 0.6 + mm(de) / 3000 : 0.6 + ft(de) / 10), 'e_{V}', 'Factor de corrección cortante viga exterior e = 0.6 + de/10 (ft); ver = 2: 0.6 + de/3000 (mm) (Tabla 4.6.2.2.3b-1)', 'de [, ver]'),
  leverLRFD: ap((S, de, dw, ver) => {
    // Regla de la palanca: un carril, ruedas a 6 ft (1.83 m), la primera a dw = 2 ft (0.61 m) de la cara de la barrera.
    // ver = 2 (MTC/SI): ruedas a 1.80 m y la primera a 0.60 m de la barrera.
    const mtc = isMTC(ver), s = mt(S), d = mt(de), w = dw === undefined || dw === null ? (mtc ? 0.6 : 0.6096) : mt(dw), sw = mtc ? 1.8 : 1.8288;
    chk(s > 0, 'S debe ser positivo');
    const x1 = s + d - w, x2 = x1 - sw;
    return 0.5 * (Math.max(0, x1) + Math.max(0, x2)) / s;
  }, 'R_{palanca}', 'Regla de la palanca (viga exterior, un carril, sin m): R = Σ(0.5·xi)/S, ruedas a 1.83 m, a 0.61 m de la barrera (C4.6.2.2.1); ver = 2: 1.80 m y 0.60 m (MTC)', 'S, de [, dw = 0.61 m, ver]'),
  skewMLRFD: ap((th, S, L, ts, Kg, ver) => {
    const t = Math.min(deg(th), 60); if (t < 30) return 1;
    const r = isMTC(ver) ? mm4(Kg) / (mm(L) * mm(ts) ** 3) : in4(Kg) / (12 * ft(L) * inch(ts) ** 3);
    const c1 = 0.25 * r ** 0.25 * ratio(S, L) ** 0.5;
    return 1 - c1 * Math.tan(t * Math.PI / 180) ** 1.5;
  }, 'r_{skew,M}', 'Reducción por esviaje del factor de momento 1 − c1(tanθ)^1.5 (Tabla 4.6.2.2.2e-1)', 'θ, S, L, ts, Kg [, ver]'),
  skewVLRFD: ap((th, L, ts, Kg, ver) => {
    const t = Math.min(deg(th), 60);
    const r = isMTC(ver) ? mm(L) * mm(ts) ** 3 / mm4(Kg) : 12 * ft(L) * inch(ts) ** 3 / in4(Kg);
    return 1 + 0.2 * r ** 0.3 * Math.tan(t * Math.PI / 180);
  }, 'c_{skew,V}', 'Corrección por esviaje del cortante en apoyo obtuso 1 + 0.20(12Lts³/Kg)^0.3 tanθ (Tabla 4.6.2.2.3c-1)', 'θ, L, ts, Kg [, ver]'),
  mpLRFD: ap((n) => { n = Math.round(n0(n)); chk(n >= 1, 'Número de carriles ≥ 1'); return n === 1 ? 1.2 : n === 2 ? 1.0 : n === 3 ? 0.85 : 0.65; }, 'm', 'Factor de presencia múltiple (Tabla 3.6.1.1.2-1)', 'n'),
  NLLRFD: ap((w) => Math.max(1, Math.floor(mm(w) / 3600 + 1e-9)), 'N_L', 'Número de carriles de diseño = INT(w/3600) (3.6.1.1.1)', 'w (ancho libre de calzada)'),
  // ---------------- anchos de franja (4.6.2.1.3 y 4.6.2.3) ----------------
  EposLRFD: ap((S) => mkUnit(660 + 0.55 * mm(S), 'mm').to('m'), 'E^{+}', 'Franja equivalente momento positivo, losa vaciada in situ: 660 + 0.55S (Tabla 4.6.2.1.3-1)', 'S'),
  EnegLRFD: ap((S) => mkUnit(1220 + 0.25 * mm(S), 'mm').to('m'), 'E^{-}', 'Franja equivalente momento negativo: 1220 + 0.25S (Tabla 4.6.2.1.3-1)', 'S'),
  EvolLRFD: ap((X) => mkUnit(1140 + 0.833 * mm(X), 'mm').to('m'), 'E_{vol}', 'Franja equivalente en voladizo: 1140 + 0.833X (Tabla 4.6.2.1.3-1)', 'X'),
  E1slabLRFD: ap((L, W) => mkUnit(250 + 0.42 * Math.sqrt(Math.min(mm(L), 18000) * Math.min(mm(W), 9000)), 'mm').to('m'), 'E_1', 'Ancho de franja losa, un carril: 250 + 0.42√(L1·W1) (4.6.2.3-1)', 'L, W'),
  EmslabLRFD: ap((L, W, NL) => mkUnit(Math.min(2100 + 0.12 * Math.sqrt(Math.min(mm(L), 18000) * Math.min(mm(W), 18000)), mm(W) / n0(NL)), 'mm').to('m'), 'E_m', 'Ancho de franja losa, múltiples carriles: 2100 + 0.12√(L1·W1) ≤ W/NL (4.6.2.3-2)', 'L, W, NL'),
  // ---------------- incremento dinámico (3.6.2) ----------------
  IMLRFD: ap((tipo) => { const t = Math.round(n0(tipo)); return t === 2 ? 0.15 : t === 3 ? 0.75 : 0.33; }, 'IM', 'Incremento por carga dinámica: 1 = otros estados (0.33), 2 = fatiga (0.15), 3 = juntas (0.75) (Tabla 3.6.2.1-1)', 'tipo'),
  IMburLRFD: ap((DE) => Math.max(0, 0.33 * (1 - 4.1e-4 * mm(DE))), 'IM', 'IM para estructuras enterradas: 33(1 − 4.1×10⁻⁴·DE) % (3.6.2.2)', 'DE (profundidad de relleno)'),
  // ---------------- cargas vivas por posición (viga simple) ----------------
  MfatLRFD: ap((L) => mkUnit(absMaxMSimple(mt(L), AX_TRUCK(9.0)), 'tonf*m'), 'M_{fat}', 'Momento máximo del camión de fatiga (ejes posteriores a 9.0 m, 3.6.1.4.1) en viga simple, sin IM', 'L'),
  VfatLRFD: ap((L) => mkUnit(vAtSimple(mt(L), 0, AX_TRUCK(9.0)), 'tonf'), 'V_{fat}', 'Cortante máximo en el apoyo del camión de fatiga (viga simple), sin IM', 'L'),
  MxLRFD: ap((L, x, tipo) => {
    const l = mt(L), xx = mt(x), t = Math.round(n0(tipo)); chk(xx >= 0 && xx <= l, 'La sección x debe estar dentro de la luz');
    if (t === 3) return mkUnit(W_LANE * xx * (l - xx) / 2, 'tonf*m');
    return mkUnit(mAtSimple(l, xx, t === 2 ? AX_TANDEM : t === 4 ? AX_TRUCK(9.0) : AX_TRUCK()), 'tonf*m');
  }, 'M_{LL}(x)', 'Momento máximo en la sección x de viga simple: tipo 1 camión, 2 tándem, 3 carril, 4 camión de fatiga', 'L, x, tipo'),
  VxLRFD: ap((L, x, tipo) => {
    const l = mt(L), xx = mt(x), t = Math.round(n0(tipo)); chk(xx >= 0 && xx <= l, 'La sección x debe estar dentro de la luz');
    if (t === 3) return mkUnit(W_LANE * (l - xx) ** 2 / (2 * l), 'tonf');
    return mkUnit(vAtSimple(l, xx, t === 2 ? AX_TANDEM : t === 4 ? AX_TRUCK(9.0) : AX_TRUCK()), 'tonf');
  }, 'V_{LL}(x)', 'Cortante máximo en la sección x de viga simple: tipo 1 camión, 2 tándem, 3 carril (carga parcial), 4 fatiga', 'L, x, tipo'),
  BRLRFD: ap((L, NL) => {
    const l = mt(L), n = Math.round(n0(NL));
    const m = n === 1 ? 1.2 : n === 2 ? 1.0 : n === 3 ? 0.85 : 0.65;
    const v = Math.max(0.25 * 32.67, 0.25 * 22.68, 0.05 * (32.67 + W_LANE * l), 0.05 * (22.68 + W_LANE * l));
    return mkUnit(v * n * m, 'tonf');
  }, 'BR', 'Fuerza de frenado total: máx(25% camión o tándem, 5% (camión o tándem + carril))·NL·m (3.6.4)', 'L, NL'),
  heqLRFD: ap((H) => mkUnit(interp1(mt(H), HEQ.x, HEQ.y), 'm'), 'h_{eq}', 'Altura equivalente de suelo por sobrecarga vehicular en estribos (Tabla 3.11.6.4-1)', 'H'),
  // ---------------- sismo (3.10) ----------------
  FpgaLRFD: ap((PGA, sitio) => siteF(T_FPGA, PGA, sitio), 'F_{pga}', 'Factor de sitio Fpga (Tabla 3.10.3.2-1); sitio 1=A … 5=E', 'PGA, sitio'),
  FaLRFD: ap((Ss, sitio) => siteF(T_FA, Ss, sitio), 'F_a', 'Factor de sitio Fa para periodos cortos (Tabla 3.10.3.2-2)', 'Ss, sitio'),
  FvLRFD: ap((S1, sitio) => siteF(T_FV, S1, sitio), 'F_v', 'Factor de sitio Fv para periodos largos (Tabla 3.10.3.2-3)', 'S1, sitio'),
  CsmLRFD: ap((T, As, SDS, SD1) => {
    if (math.isMatrix(T) || Array.isArray(T)) return math.map(T, t => csm(t, As, SDS, SD1));
    return csm(T, As, SDS, SD1);
  }, 'C_{sm}', 'Coeficiente de respuesta sísmica elástica (3.10.4.2-1 a -3), en g', 'T, As, SDS, SD1'),
  zonaLRFD: ap((SD1) => { const v = n0(SD1); return v <= 0.15 ? 1 : v <= 0.30 ? 2 : v <= 0.50 ? 3 : 4; }, '\\mathrm{Zona}', 'Zona sísmica según SD1 (Tabla 3.10.6-1)', 'SD1'),
  NapLRFD: ap((L, H, skew) => {
    const l = mm(L), h = mm(H), s = skew === undefined ? 0 : deg(skew);
    return mkUnit((200 + 0.0017 * l + 0.0067 * h) * (1 + 0.000125 * s * s), 'mm').to('cm');
  }, 'N', 'Longitud mínima de apoyo N = (200 + 0.0017L + 0.0067H)(1 + 0.000125S²) mm (4.7.4.4-1)', 'L, H, S(esviaje)'),
  NpctLRFD: ap((zona, As) => { const z = Math.round(n0(zona)); return z === 1 ? (n0(As) < 0.05 ? 0.75 : 1.0) : 1.5; }, '\\%N', 'Porcentaje de N por zona sísmica: zona 1 75 % (As < 0.05) o 100 %; zonas 2, 3 y 4: 150 % (Tabla 4.7.4.4-1)', 'zona, As'),
  // ---------------- concreto y presfuerzo (Sección 5) ----------------
  beta1LRFD: ap((fc) => { const f = ksi(fc); return Math.min(0.85, Math.max(0.65, 0.85 - 0.05 * (f - 4))); }, '\\beta_1', 'Factor del bloque de compresión β1 (5.6.2.2)', "f'c"),
  EcLRFD: ap((fc, wc) => {
    const f = ksi(fc), w = wc === undefined ? 0.145 : (isU(wc) ? (wc.dimensions[0] === 1 && wc.dimensions[1] === -3 ? wc.toNumber('lb/ft^3') / 1000 : wc.toNumber('lbf/ft^3') / 1000) : n0(wc));
    return mkUnit(120000 * w * w * f ** 0.33, 'ksi');
  }, 'E_c', 'Módulo de elasticidad Ec = 120000·K1·wc²·f\'c^0.33 (ksi, kcf) (5.4.2.4-1, K1 = 1)', "f'c, wc"),
  frLRFD: ap((fc) => mkUnit(0.24 * Math.sqrt(ksi(fc)), 'ksi'), 'f_r', 'Módulo de rotura fr = 0.24λ√f\'c (ksi) (5.4.2.6)', "f'c"),
  gammahLRFD: ap((H) => 1.7 - 0.01 * n0(H), '\\gamma_h', 'Factor de humedad γh = 1.7 − 0.01H (5.9.3.3-2)', 'H [%]'),
  gammastLRFD: ap((fci) => 5 / (1 + ksi(fci)), '\\gamma_{st}', "Factor de resistencia γst = 5/(1 + f'ci) (ksi) (5.9.3.3-3)", "f'ci"),
  dfpLTLRFD: ap((fpi, Aps, Ag, H, fci, dfpR) => {
    const gh = 1.7 - 0.01 * n0(H), gs = 5 / (1 + ksi(fci));
    const rA = ratio(Aps, Ag);
    const R = dfpR === undefined ? 2.4 : ksi(dfpR);
    return mkUnit(10 * ksi(fpi) * rA * gh * gs + 12 * gh * gs + R, 'ksi');
  }, '\\Delta f_{pLT}', 'Pérdidas diferidas aproximadas 10·fpi·Aps/Ag·γh·γst + 12·γh·γst + ΔfpR (5.9.3.3-1)', 'fpi, Aps, Ag, H, fci [, ΔfpR = 2.4 ksi]'),
  dfpESLRFD: ap((Ep, Eci, fcgp) => math.multiply(ratio(Ep, Eci), fcgp), '\\Delta f_{pES}', 'Pérdida por acortamiento elástico ΔfpES = (Ep/Eci)·fcgp (5.9.3.2.3a-1)', 'Ep, Eci, fcgp'),
  kpsLRFD: ap((fpy, fpu) => 2 * (1.04 - ratio(fpy, fpu)), 'k', 'k = 2(1.04 − fpy/fpu) (5.6.3.1.1-2)', 'fpy, fpu'),
  cpsLRFD: ap((Aps, fpu, fpy, dp, fc, b, bw, hf, As, fs) => {
    const A = isU(Aps) ? Aps.toNumber('in^2') : n0(Aps), fu = ksi(fpu), fy = ksi(fpy), d = isU(dp) ? dp.toNumber('in') : n0(dp);
    const f = ksi(fc), B = isU(b) ? b.toNumber('in') : n0(b), Bw = isU(bw) ? bw.toNumber('in') : n0(bw), hF = isU(hf) ? hf.toNumber('in') : n0(hf);
    const Asv = As === undefined ? 0 : (isU(As) ? As.toNumber('in^2') : n0(As)), fsv = fs === undefined ? 0 : ksi(fs);
    const k = 2 * (1.04 - fy / fu), b1 = Math.min(0.85, Math.max(0.65, 0.85 - 0.05 * (f - 4))), a1 = f <= 10 ? 0.85 : Math.max(0.75, 0.85 - 0.02 * (f - 10));
    let c = (A * fu + Asv * fsv) / (a1 * f * b1 * B + k * A * fu / d);
    if (b1 * c > hF) c = (A * fu + Asv * fsv - a1 * f * (B - Bw) * hF) / (a1 * f * b1 * Bw + k * A * fu / d);
    chk(c > 0, 'Profundidad del eje neutro no válida');
    return mkUnit(c, 'in');
  }, 'c', 'Eje neutro con acero de presfuerzo adherido, sección rectangular o T (5.6.3.1.1-3/-4)', 'Aps, fpu, fpy, dp, fc, b, bw, hf [, As, fs]'),
  fpsLRFD: ap((fpu, fpy, c, dp) => { const k = 2 * (1.04 - ratio(fpy, fpu)); return math.multiply(fpu, 1 - k * ratio(c, dp)); }, 'f_{ps}', 'Esfuerzo medio en el acero de presfuerzo fps = fpu(1 − k·c/dp) (5.6.3.1.1-1)', 'fpu, fpy, c, dp'),
  betaMCFT: ap((ex) => 4.8 / (1 + 750 * Math.max(n0(ex), -0.0004)), '\\beta', 'β = 4.8/(1 + 750εs), método general con refuerzo mínimo (5.7.3.4.2-1)', 'εs'),
  thetaMCFT: ap((ex) => mkUnit(29 + 3500 * Math.max(n0(ex), -0.0004), 'deg'), '\\theta', 'θ = 29 + 3500εs (5.7.3.4.2-3)', 'εs'),
  // ---------------- barreras (Apéndice A13, Tabla A13.2-1, base NCHRP 350) ----------------
  FtLRFD: ap((TL) => mkUnit(BAR(TL).Ft, 'kN').to('tonf'), 'F_t', 'Fuerza transversal de diseño de la barrera: TL-1 60, TL-2 120, TL-3 240, TL-4 240, TL-5 550, TL-6 780 kN (Tabla A13.2-1)', 'TL'),
  LtLRFD: ap((TL) => mkUnit(BAR(TL).Lt, 'mm').to('m'), 'L_t', 'Longitud de distribución de Ft: 1220 mm (TL-1 a TL-3), 1070 mm (TL-4), 2440 mm (TL-5, TL-6) (Tabla A13.2-1)', 'TL'),
  HbminLRFD: ap((TL) => mkUnit(BAR(TL).H, 'mm').to('m'), 'H_{min}', 'Altura mínima de la barrera: 685 mm (TL-1 a TL-3), 810 mm (TL-4), 1070 mm (TL-5), 2290 mm (TL-6) (Tabla A13.2-1)', 'TL'),
  // ---------------- apoyos elastoméricos (14.7.5 / 14.7.6) ----------------
  SbearLRFD: ap((L, W, hri) => { const l = mm(L), w = mm(W), h = mm(hri); chk(l > 0 && w > 0 && h > 0, 'Dimensiones del apoyo deben ser positivas'); return l * w / (2 * h * (l + w)); }, 'S_i', 'Factor de forma de la capa, apoyo rectangular S = LW/[2hri(L + W)] (14.7.5.1-1)', 'L, W, hri'),
  DaBearLRFD: ap((tipo) => (Math.round(n0(tipo)) === 2 ? 1.0 : 1.4), 'D_a', 'Coeficiente Da: 1 = rectangular (1.4), 2 = circular (1.0) (14.7.5.3.3)', 'tipo'),
};
defineFns(FN, 'Puentes');
