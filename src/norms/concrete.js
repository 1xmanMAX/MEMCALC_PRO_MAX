// =====================================================================
//  Funciones normativas — módulo «concrete»
//  NTE E.060-2009 (Perú, ecuaciones en el sistema MKS del Anexo II) y
//  ACI 318-19 (unidades SI). Fuentes y verificación: docs/referencias/concrete.md
// =====================================================================
import { defineFns, math, toNum, mkUnit, interp1, BARS } from '../engine.js';

const isU = (x) => math.isUnit(x);
const kgcm = (x) => toNum(x, 'kgf/cm^2');
const MPa = (x) => toNum(x, 'MPa');
const cm = (x) => toNum(x, 'cm');
const nn = (x) => (isU(x) ? x.toNumber() : +x);
const req = (cond, msg) => { if (!cond) throw new Error(msg); };
// diámetro (cm) de una barra: número ASTM (#) o longitud con unidades
function barD(x) {
  if (isU(x)) return x.toNumber('cm');
  const b = BARS[Math.round(+x)]; req(b, 'Varilla #' + x + ' no existe');
  return b.d;
}
const ES_MKS = 2.0e6; // kgf/cm² (E.060 8.5.5: 200 000 MPa ≈ 2·10⁶ kgf/cm², Anexo II)

// ---------- Materiales ----------
export function beta1E060(fc) { const f = kgcm(fc); return f <= 280 ? 0.85 : Math.max(0.65, 0.85 - 0.05 * (f - 280) / 70); }
export function beta1ACI(fc) { const f = MPa(fc); return f <= 28 ? 0.85 : Math.max(0.65, 0.85 - 0.05 * (f - 28) / 7); }

// ---------- Flexión ----------
// Acero requerido en sección rectangular (bloque de Whitney); Mu, b, d, fc, fy con unidades
export function asFlex(Mu, b, d, fc, fy, phi = 0.9) {
  const M = toNum(Mu, 'kgf*cm'), B = cm(b), D = cm(d), f = kgcm(fc), y = kgcm(fy), p = nn(phi);
  req(B > 0 && D > 0 && f > 0 && y > 0, 'asFlex: datos no válidos');
  const disc = 1 - 2 * Math.abs(M) / (0.85 * p * f * B * D * D);
  req(disc >= 0, 'La sección es insuficiente para Mu (aumente b, d o f\'c)');
  return mkUnit(0.85 * f * B * D / y * (1 - Math.sqrt(disc)), 'cm^2');
}
// Acero requerido en viga T (ala en compresión): si a ≤ hf se diseña como rectangular de ancho bf
export function asFlexT(Mu, bw, bf, hf, d, fc, fy, phi = 0.9) {
  const M = Math.abs(toNum(Mu, 'kgf*cm')), BW = cm(bw), BF = cm(bf), HF = cm(hf), D = cm(d), f = kgcm(fc), y = kgcm(fy), p = nn(phi);
  const Ar = asFlex(mkUnit(M, 'kgf*cm'), mkUnit(BF, 'cm'), d, fc, fy, p).toNumber('cm^2');
  if (Ar * y / (0.85 * f * BF) <= HF) return mkUnit(Ar, 'cm^2');
  const Asf = 0.85 * f * (BF - BW) * HF / y, Mf = Asf * y * (D - HF / 2);
  const Asw = asFlex(mkUnit(Math.max(0, M / p - Mf) * p, 'kgf*cm'), mkUnit(BW, 'cm'), d, fc, fy, p).toNumber('cm^2');
  return mkUnit(Asf + Asw, 'cm^2');
}
// Cuantía balanceada E.060 10.3.2 (Es = 2·10⁶ kgf/cm², εcu = 0.003)
export function rhobE060(fc, fy) { const f = kgcm(fc), y = kgcm(fy); return 0.85 * beta1E060(fc) * f / y * (0.003 * ES_MKS / (0.003 * ES_MKS + y)); }
// Momento nominal de una sección rectangular con acero en tracción y en compresión (compatibilidad)
export function mnRect(As, b, d, fc, fy, Asp = 0, dp = 0) {
  const A = cm2(As), B = cm(b), D = cm(d), f = kgcm(fc), y = kgcm(fy), A2 = Asp ? cm2(Asp) : 0, D2 = dp ? cm(dp) : 0;
  const b1 = beta1E060(fc), Es = ES_MKS;
  const force = (c) => { const a = b1 * c; const es2 = 0.003 * (c - D2) / c; let fs2 = Math.max(-y, Math.min(y, Es * es2)); if (D2 < a) fs2 -= 0.85 * f; const es = 0.003 * (D - c) / c; const fs = Math.min(y, Es * es); return { C: 0.85 * f * a * B + A2 * fs2, T: A * fs, a, fs2 }; };
  let lo = 1e-4, hi = D; for (let i = 0; i < 100; i++) { const c = (lo + hi) / 2; const r = force(c); if (r.C > r.T) hi = c; else lo = c; }
  const c = (lo + hi) / 2, r = force(c);
  return mkUnit((0.85 * f * r.a * B * (D - r.a / 2) + A2 * r.fs2 * (D - D2)) / 1e5, 'tonf*m');
}
const cm2 = (x) => toNum(x, 'cm^2');
// Momento probable (ACI 18.6.5 / E.060 21.5.4.1): fs = 1.25 fy, φ = 1
export function mprRect(As, b, d, fc, fy) {
  const A = cm2(As), B = cm(b), D = cm(d), f = kgcm(fc), y = 1.25 * kgcm(fy); const a = A * y / (0.85 * f * B);
  return mkUnit(A * y * (D - a / 2) / 1e5, 'tonf*m');
}
// Factor φ según la deformación neta εt (ACI 318-19 Tabla 21.2.2); espiral = 1 para zunchos
export function phiACI(epst, fy, espiral = 0) {
  const e = nn(epst), ey = MPa(fy) / 200000, pc = nn(espiral) ? 0.75 : 0.65;
  return e <= ey ? pc : e >= ey + 0.003 ? 0.9 : pc + (0.9 - pc) * (e - ey) / 0.003;
}

// ---------- Rigidez, fisuración y deflexiones ----------
// Profundidad del eje neutro elástico de sección rectangular agrietada (acero en compresión transformado con 2n, E.060 9.6.2.3)
export function kdRect(b, d, As, n, dp = 0, Asp = 0) {
  const B = cm(b), D = cm(d), A = cm2(As), N = nn(n), D2 = dp ? cm(dp) : 0, A2 = Asp ? cm2(Asp) : 0;
  const a = B / 2, bb = N * A + (2 * N - 1) * A2, c = -(N * A * D + (2 * N - 1) * A2 * D2);
  return mkUnit((-bb + Math.sqrt(bb * bb - 4 * a * c)) / (2 * a), 'cm');
}
export function icrRect(b, d, As, n, dp = 0, Asp = 0) {
  const B = cm(b), D = cm(d), A = cm2(As), N = nn(n), D2 = dp ? cm(dp) : 0, A2 = Asp ? cm2(Asp) : 0;
  const x = kdRect(b, d, As, n, dp, Asp).toNumber('cm');
  return mkUnit(B * x ** 3 / 3 + N * A * (D - x) ** 2 + (2 * N - 1) * A2 * (x - D2) ** 2, 'cm^4');
}
// Sección T agrietada (ala en compresión): si kd ≤ hf equivale a rectangular de ancho bf
export function icrT(bf, hf, bw, d, As, n) {
  const BF = cm(bf), HF = cm(hf), BW = cm(bw), D = cm(d), A = cm2(As), N = nn(n);
  let x = kdRect(bf, d, As, n).toNumber('cm');
  if (x <= HF) return mkUnit(BF * x ** 3 / 3 + N * A * (D - x) ** 2, 'cm^4');
  const a = BW / 2, bb = (BF - BW) * HF + N * A, c = -((BF - BW) * HF * HF / 2 + N * A * D);
  x = (-bb + Math.sqrt(bb * bb - 4 * a * c)) / (2 * a);
  return mkUnit((BF - BW) * HF ** 3 / 12 + (BF - BW) * HF * (x - HF / 2) ** 2 + BW * x ** 3 / 3 + N * A * (D - x) ** 2, 'cm^4');
}
// Inercia efectiva de Branson (E.060 9.6.2.3 / ACI 318-14 24.2.3.5a)
export function ieBranson(Mcr, Ma, Ig, Icr) {
  const r = Math.min(1, Math.abs(toNum(Mcr, 'kgf*cm') / toNum(Ma, 'kgf*cm'))) ** 3, g = toNum(Ig, 'cm^4'), c = toNum(Icr, 'cm^4');
  return mkUnit(Math.min(g, r * g + (1 - r) * c), 'cm^4');
}
// Inercia efectiva de Bischoff (ACI 318-19 Tabla 24.2.3.5)
export function ieBischoff(Mcr, Ma, Ig, Icr) {
  const mc = Math.abs(toNum(Mcr, 'kgf*cm')), ma = Math.abs(toNum(Ma, 'kgf*cm')), g = toNum(Ig, 'cm^4'), c = toNum(Icr, 'cm^4');
  if (ma <= 2 / 3 * mc) return mkUnit(g, 'cm^4');
  return mkUnit(Math.min(g, c / (1 - (2 / 3 * mc / ma) ** 2 * (1 - c / g))), 'cm^4');
}
// Factor dependiente del tiempo ξ (E.060 9.6.2.5 / ACI 24.2.4.1.3)
export function xiDef(meses) { const t = isU(meses) ? meses.toNumber('s') / (30.4375 * 86400) : nn(meses); return interp1(t, [0, 3, 6, 12, 60], [0, 1.0, 1.2, 1.4, 2.0]); }
export function lambdaDef(xi, rhop) { return nn(xi) / (1 + 50 * nn(rhop)); }

// ---------- Desarrollo, ganchos y empalmes (E.060 Cap. 12, ecuaciones MKS del Anexo II) ----------
export function ldE060(bar, fc, fy, psit = 1, psie = 1, lambda = 1) {
  const db = barD(bar), f = Math.min(Math.sqrt(kgcm(fc)), 26.4), y = kgcm(fy), pte = Math.min(1.7, nn(psit) * nn(psie));
  const k = db <= 1.905 + 1e-6 ? 8.2 : 6.6; // Tabla 12.1: barras de 3/4" y menores / 7/8" y mayores
  return mkUnit(Math.max(y * pte * nn(lambda) / (k * f) * db, 30), 'cm');
}
// Ecuación general (12-1): (cb+Ktr)/db ≤ 2.5
export function ldGenE060(bar, fc, fy, cbKtr, psit = 1, psie = 1, lambda = 1) {
  const db = barD(bar), f = Math.min(Math.sqrt(kgcm(fc)), 26.4), y = kgcm(fy), pte = Math.min(1.7, nn(psit) * nn(psie));
  const psis = db <= 1.905 + 1e-6 ? 0.8 : 1.0, r = Math.min(2.5, nn(cbKtr));
  return mkUnit(Math.max(y * pte * psis * nn(lambda) / (3.5 * f * r) * db, 30), 'cm');
}
export function ldgE060(bar, fc, fy, psie = 1, lambda = 1) {
  const db = barD(bar), f = Math.min(Math.sqrt(kgcm(fc)), 26.4), y = kgcm(fy);
  return mkUnit(Math.max(0.075 * nn(psie) * nn(lambda) * y / f * db, 8 * db, 15), 'cm');
}
export function ldcE060(bar, fc, fy) {
  const db = barD(bar), f = Math.min(Math.sqrt(kgcm(fc)), 26.4), y = kgcm(fy);
  return mkUnit(Math.max(0.075 * y / f * db, 0.0044 * y * db, 20), 'cm');
}
// Empalme por traslape en tracción (12.15): clase = 1 (A) ó 2 (B)
export function lsE060(bar, fc, fy, clase = 2, psit = 1, psie = 1, lambda = 1) {
  const ld = ldE060(bar, fc, fy, psit, psie, lambda).toNumber('cm');
  return mkUnit(Math.max((Math.round(nn(clase)) === 1 ? 1.0 : 1.3) * ld, 30), 'cm');
}
// Empalme por traslape en compresión (12.16.1)
export function lscE060(bar, fc, fy) {
  const db = barD(bar), y = kgcm(fy);
  let l = y <= 4200 ? 0.007 * y * db : (0.013 * y - 24) * db;
  if (kgcm(fc) < 210 - 0.5) l *= 1.3; // f'c < 21 MPa (≈ 210 kgf/cm², Anexo II)
  return mkUnit(Math.max(l, 30), 'cm');
}
// ACI 318-19 25.4.2.4 (SI): ld = fy ψt ψe ψs ψg / (1.1 λ √f'c ((cb+Ktr)/db)) db ≥ 300 mm
export function ldACI(db, fc, fy, cbKtr = 1.5, psit = 1, psie = 1, lambda = 1) {
  const d = toNum(db, 'mm'), f = Math.min(Math.sqrt(MPa(fc)), 8.3), y = MPa(fy);
  const psis = d <= 19.1 + 1e-6 ? 0.8 : 1.0, psig = y <= 420 ? 1.0 : y <= 550 ? 1.15 : 1.3, pte = Math.min(1.7, nn(psit) * nn(psie));
  return mkUnit(Math.max(y * pte * psis * psig / (1.1 * nn(lambda) * f * Math.min(2.5, nn(cbKtr))) * d, 300), 'mm');
}
// ACI 318-19 25.4.3.1 (SI): ldh = fy ψe ψr ψo ψc / (23 λ √f'c) db^1.5 ≥ max(8db, 150 mm)
export function ldhACI(db, fc, fy, psie = 1, psir = 1, psio = 1, lambda = 1) {
  const d = toNum(db, 'mm'), f = Math.min(Math.sqrt(MPa(fc)), 8.3), y = MPa(fy), fcM = MPa(fc);
  const psic = fcM < 42 ? fcM / 105 + 0.6 : 1.0;
  return mkUnit(Math.max(y * nn(psie) * nn(psir) * nn(psio) * psic / (23 * nn(lambda) * f) * d ** 1.5, 8 * d, 150), 'mm');
}

// ---------- Losas en dos direcciones: método de coeficientes (E.060 13.7, Tablas 13.1–13.3) ----------
// Casos (A = luz corta, B = luz larga; bordes largos = extremos de las franjas en A):
//  1: todos discontinuos · 2: todos continuos · 3: bordes cortos continuos · 4: dos bordes adyacentes continuos
//  5: bordes largos continuos · 6: un borde largo continuo · 7: un borde corto continuo
//  8: tres continuos (un borde largo discontinuo) · 9: tres continuos (un borde corto discontinuo)
const MS = [1.00, 0.95, 0.90, 0.85, 0.80, 0.75, 0.70, 0.65, 0.60, 0.55, 0.50];
const T_NEG_A = [[0, .045, 0, .050, .075, .071, 0, .033, .061], [0, .050, 0, .055, .079, .075, 0, .038, .065], [0, .055, 0, .060, .080, .079, 0, .043, .068], [0, .060, 0, .066, .082, .083, 0, .049, .072], [0, .065, 0, .071, .083, .086, 0, .055, .075], [0, .069, 0, .076, .085, .088, 0, .061, .078], [0, .074, 0, .081, .086, .091, 0, .068, .081], [0, .077, 0, .085, .087, .093, 0, .074, .083], [0, .081, 0, .089, .088, .095, 0, .080, .085], [0, .084, 0, .092, .089, .096, 0, .085, .086], [0, .086, 0, .094, .090, .097, 0, .089, .088]];
const T_NEG_B = [[0, .045, .076, .050, 0, 0, .071, .061, .033], [0, .041, .072, .045, 0, 0, .067, .056, .029], [0, .037, .070, .040, 0, 0, .062, .052, .025], [0, .031, .065, .034, 0, 0, .057, .046, .021], [0, .027, .061, .029, 0, 0, .051, .041, .017], [0, .022, .056, .024, 0, 0, .044, .036, .014], [0, .017, .050, .019, 0, 0, .038, .029, .011], [0, .014, .043, .015, 0, 0, .031, .024, .008], [0, .010, .035, .011, 0, 0, .024, .018, .006], [0, .007, .028, .008, 0, 0, .019, .014, .005], [0, .006, .022, .006, 0, 0, .014, .010, .003]];
const T_CM_A = [[.036, .018, .018, .027, .027, .033, .027, .020, .023], [.040, .020, .021, .030, .028, .036, .031, .022, .024], [.045, .022, .025, .033, .029, .039, .035, .025, .026], [.050, .024, .029, .036, .031, .042, .040, .029, .028], [.056, .026, .034, .039, .032, .045, .045, .032, .029], [.061, .028, .040, .043, .033, .048, .051, .036, .031], [.068, .030, .046, .046, .035, .051, .058, .040, .033], [.074, .032, .054, .050, .036, .054, .065, .044, .034], [.081, .034, .062, .053, .037, .056, .073, .048, .036], [.088, .035, .071, .056, .038, .058, .081, .052, .037], [.095, .037, .080, .059, .039, .061, .089, .056, .038]];
const T_CM_B = [[.036, .018, .027, .027, .018, .027, .033, .023, .020], [.033, .016, .025, .024, .015, .024, .031, .021, .017], [.029, .014, .024, .022, .013, .021, .028, .019, .015], [.026, .012, .022, .019, .011, .017, .025, .017, .013], [.023, .011, .020, .016, .009, .015, .022, .015, .010], [.019, .009, .018, .013, .007, .012, .020, .013, .007], [.016, .007, .016, .011, .005, .009, .017, .011, .006], [.013, .006, .014, .009, .004, .007, .014, .009, .005], [.010, .004, .011, .007, .003, .006, .012, .007, .004], [.008, .003, .009, .005, .002, .004, .009, .005, .003], [.006, .002, .007, .004, .001, .003, .007, .004, .002]];
const T_CV_A = [[.036, .027, .027, .032, .032, .035, .032, .028, .030], [.040, .030, .031, .035, .034, .038, .036, .031, .032], [.045, .034, .035, .039, .037, .042, .040, .035, .036], [.050, .037, .040, .043, .041, .046, .045, .040, .039], [.056, .041, .045, .048, .044, .051, .051, .044, .042], [.061, .045, .051, .052, .047, .055, .056, .049, .046], [.068, .049, .057, .057, .051, .060, .063, .054, .050], [.074, .053, .064, .062, .055, .064, .070, .059, .054], [.081, .058, .071, .067, .059, .068, .077, .065, .059], [.088, .062, .080, .072, .063, .073, .085, .070, .063], [.095, .066, .088, .077, .067, .078, .092, .076, .067]];
const T_CV_B = [[.036, .027, .032, .032, .027, .032, .035, .030, .028], [.033, .025, .029, .029, .024, .029, .032, .027, .025], [.029, .022, .027, .026, .021, .025, .029, .024, .022], [.026, .019, .024, .023, .019, .022, .026, .022, .020], [.023, .017, .022, .020, .016, .019, .023, .019, .017], [.019, .014, .019, .016, .013, .016, .020, .016, .013], [.016, .012, .016, .014, .011, .013, .017, .014, .011], [.013, .010, .014, .011, .009, .010, .014, .011, .009], [.010, .007, .011, .009, .007, .008, .011, .009, .007], [.008, .006, .009, .007, .005, .006, .009, .007, .006], [.006, .004, .007, .005, .004, .005, .007, .005, .004]];
export const SLAB_TABLES = { negA: T_NEG_A, negB: T_NEG_B, cmA: T_CM_A, cmB: T_CM_B, cvA: T_CV_A, cvB: T_CV_B, ms: MS };
export function slabCoef(tab, caso, m) {
  const k = Math.round(nn(caso)), r = nn(m);
  req(k >= 1 && k <= 9, 'Caso de losa debe ser 1 a 9 (E.060 Tablas 13.1–13.3)');
  req(r >= 0.5 - 1e-9 && r <= 1 + 1e-9, 'm = A/B debe estar entre 0.50 y 1.00 (si m < 0.5 la losa trabaja en una dirección)');
  const xs = MS.slice().reverse(), ys = tab.map(row => row[k - 1]).reverse();
  return interp1(r, xs, ys);
}
// Caso a partir del número de bordes largos (nA) y cortos (nB) continuos
export function slabCase(nA, nB) {
  const a = Math.round(nn(nA)), b = Math.round(nn(nB));
  const map = { '0,0': 1, '2,2': 2, '0,2': 3, '1,1': 4, '2,0': 5, '1,0': 6, '0,1': 7, '1,2': 8, '2,1': 9 };
  const c = map[a + ',' + b]; req(c, 'Número de bordes continuos no válido'); return c;
}

// ---------- Columnas: longitud efectiva (nomogramas de Jackson–Julian) ----------
function solveK(f, lo, hi) { let a = lo, b = hi, fa = f(a); for (let i = 0; i < 200; i++) { const c = (a + b) / 2, fc = f(c); if (Math.sign(fc) === Math.sign(fa)) { a = c; fa = fc; } else b = c; } return (a + b) / 2; }
export function kBraced(psiA, psiB) {
  const A = Math.max(1e-6, nn(psiA)), B = Math.max(1e-6, nn(psiB));
  const f = (k) => { const x = Math.PI / k; return A * B / 4 * x * x + (A + B) / 2 * (1 - x / Math.tan(x)) + 2 * Math.tan(x / 2) / x - 1; };
  return solveK(f, 0.5 + 1e-6, 1.0 - 1e-9);
}
export function kSway(psiA, psiB) {
  const A = Math.max(1e-6, nn(psiA)), B = Math.max(1e-6, nn(psiB));
  const f = (k) => { const x = Math.PI / k; return (A * B * x * x - 36) / (6 * (A + B)) - x / Math.tan(x); };
  return solveK(f, 1.0 + 1e-9, 50);
}

// ---------- Losas: transferencia de momento por cortante (E.060 11.12.6 / ACI 8.4.4.2) ----------
export function gammavSlab(b1, b2) { const r = toNum(b1, 'cm') / toNum(b2, 'cm'); return 1 - 1 / (1 + 2 / 3 * Math.sqrt(r)); }
export function jcInterior(c1, c2, d) {
  const C1 = cm(c1), C2 = cm(c2), D = cm(d);
  return mkUnit(D * (C1 + D) ** 3 / 6 + (C1 + D) * D ** 3 / 6 + D * (C2 + D) * (C1 + D) ** 2 / 2, 'cm^4');
}

const T1 = (s) => s;
defineFns({
  beta1E060: { fn: beta1E060, tex: '\\beta_1', desc: 'β1 del bloque de Whitney (E.060 10.2.7.3)', args: "f'c" },
  beta1ACI: { fn: beta1ACI, tex: '\\beta_1', desc: 'β1 (ACI 318-19 Tabla 22.2.2.4.3)', args: "f'c" },
  asFlex: { fn: asFlex, tex: T1('A_{s}'), desc: 'As requerido en sección rectangular para Mu', args: 'Mu, b, d, fc, fy[, φ]' },
  asFlexT: { fn: asFlexT, tex: 'A_{s,T}', desc: 'As requerido en viga T (ala en compresión)', args: 'Mu, bw, bf, hf, d, fc, fy[, φ]' },
  rhobE060: { fn: rhobE060, tex: '\\rho_b', desc: 'Cuantía balanceada (E.060 10.3.2)', args: 'fc, fy' },
  mnRect: { fn: mnRect, tex: 'M_n', desc: 'Mn de sección rectangular con As y A\'s (compatibilidad)', args: "As, b, d, fc, fy[, A's, d']" },
  mprRect: { fn: mprRect, tex: 'M_{pr}', desc: 'Momento probable con 1.25 fy y φ = 1', args: 'As, b, d, fc, fy' },
  phiACI: { fn: phiACI, tex: '\\phi', desc: 'φ según εt (ACI 318-19 Tabla 21.2.2)', args: 'εt, fy[, espiral]' },
  kdRect: { fn: kdRect, tex: 'kd', desc: 'Eje neutro elástico de sección agrietada', args: "b, d, As, n[, d', A's]" },
  icrRect: { fn: icrRect, tex: 'I_{cr}', desc: 'Inercia agrietada transformada (A\'s con 2n, E.060 9.6.2.3)', args: "b, d, As, n[, d', A's]" },
  icrT: { fn: icrT, tex: 'I_{cr}', desc: 'Inercia agrietada de viga T', args: 'bf, hf, bw, d, As, n' },
  ieBranson: { fn: ieBranson, tex: 'I_e', desc: 'Inercia efectiva de Branson', args: 'Mcr, Ma, Ig, Icr' },
  ieBischoff: { fn: ieBischoff, tex: 'I_e', desc: 'Inercia efectiva de Bischoff (ACI 318-19)', args: 'Mcr, Ma, Ig, Icr' },
  xiDef: { fn: xiDef, tex: '\\xi', desc: 'Factor de tiempo ξ para deflexión diferida', args: 'meses' },
  lambdaDef: { fn: lambdaDef, tex: '\\lambda_{\\Delta}', desc: 'ξ/(1+50ρ\')', args: "ξ, ρ'" },
  ldE060: { fn: ldE060, tex: '\\ell_d', desc: 'ld en tracción, Tabla 12.1 E.060', args: 'barra, fc, fy[, ψt, ψe, λ]' },
  ldGenE060: { fn: ldGenE060, tex: '\\ell_d', desc: 'ld en tracción, ecuación 12-1 E.060', args: '(cb+Ktr)/db, …' },
  ldgE060: { fn: ldgE060, tex: '\\ell_{dg}', desc: 'Desarrollo con gancho estándar (E.060 12.5)', args: 'barra, fc, fy[, ψe, λ]' },
  ldcE060: { fn: ldcE060, tex: '\\ell_{dc}', desc: 'Desarrollo en compresión (E.060 12.3)', args: 'barra, fc, fy' },
  lsE060: { fn: lsE060, tex: '\\ell_{s}', desc: 'Empalme en tracción clase A(1)/B(2) (E.060 12.15)', args: 'barra, fc, fy, clase' },
  lscE060: { fn: lscE060, tex: '\\ell_{sc}', desc: 'Empalme en compresión (E.060 12.16)', args: 'barra, fc, fy' },
  ldACI: { fn: ldACI, tex: '\\ell_d', desc: 'ld ACI 318-19 25.4.2.4 (SI)', args: 'db, fc, fy, (cb+Ktr)/db, ψt, ψe, λ' },
  ldhACI: { fn: ldhACI, tex: '\\ell_{dh}', desc: 'ldh ACI 318-19 25.4.3.1 (SI)', args: 'db, fc, fy, ψe, ψr, ψo, λ' },
  CaNeg: { fn: (c, m) => slabCoef(T_NEG_A, c, m), tex: 'C_{a,neg}', desc: 'Coef. momento negativo dir. A (E.060 Tabla 13.1)', args: 'caso, m' },
  CbNeg: { fn: (c, m) => slabCoef(T_NEG_B, c, m), tex: 'C_{b,neg}', desc: 'Coef. momento negativo dir. B (E.060 Tabla 13.1)', args: 'caso, m' },
  CaCM: { fn: (c, m) => slabCoef(T_CM_A, c, m), tex: 'C_{a,CM}', desc: 'Coef. momento positivo por CM dir. A (Tabla 13.2)', args: 'caso, m' },
  CbCM: { fn: (c, m) => slabCoef(T_CM_B, c, m), tex: 'C_{b,CM}', desc: 'Coef. momento positivo por CM dir. B (Tabla 13.2)', args: 'caso, m' },
  CaCV: { fn: (c, m) => slabCoef(T_CV_A, c, m), tex: 'C_{a,CV}', desc: 'Coef. momento positivo por CV dir. A (Tabla 13.3)', args: 'caso, m' },
  CbCV: { fn: (c, m) => slabCoef(T_CV_B, c, m), tex: 'C_{b,CV}', desc: 'Coef. momento positivo por CV dir. B (Tabla 13.3)', args: 'caso, m' },
  casoLosa: { fn: slabCase, tex: '\\mathrm{caso}', desc: 'Caso 1–9 según bordes largos y cortos continuos', args: 'nA, nB' },
  kBraced: { fn: kBraced, tex: 'k', desc: 'Factor k, pórtico arriostrado (nomograma)', args: 'ψA, ψB' },
  kSway: { fn: kSway, tex: 'k', desc: 'Factor k, pórtico no arriostrado (nomograma)', args: 'ψA, ψB' },
  gammavSlab: { fn: gammavSlab, tex: '\\gamma_v', desc: 'Fracción de momento transferida por excentricidad del cortante', args: 'b1, b2' },
  jcInterior: { fn: jcInterior, tex: 'J_c', desc: 'Jc de la sección crítica de columna interior (Fig. 11.12.6)', args: 'c1, c2, d' },
}, 'Concreto');
