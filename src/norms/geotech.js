// =====================================================================
//  Funciones normativas — módulo «geotech»
//  Geotecnia y cimentaciones: NTE E.050 Suelos y Cimentaciones (2018),
//  Das (Principios de ingeniería de cimentaciones), Bowles (Foundation
//  Analysis and Design), Terzaghi-Peck, Meyerhof, Hansen, Vesic, Coduto,
//  FHWA (pilotes) y Youd et al. (2001) / Idriss-Boulanger (2008) (licuación).
//  Todas las funciones aceptan escalares o vectores (elemento a elemento).
//  Ver docs/referencias/geotech.md
// =====================================================================
import { defineFns, math, toNum, mkUnit, interp1 } from '../engine.js';

const D2R = Math.PI / 180;
const PA = 101.325; // presión atmosférica [kPa]
const isArr = (x) => math.isMatrix(x) || Array.isArray(x);
// Aplica f elemento a elemento si algún argumento es vector/matriz (difusión de escalares)
function vec(f) {
  return (...a) => {
    const arr = a.map(x => (math.isMatrix(x) ? x.toArray().flat() : Array.isArray(x) ? x.flat() : x));
    const lens = arr.filter(Array.isArray).map(x => x.length);
    if (!lens.length) return f(...a);
    const n = lens[0];
    if (lens.some(l => l !== n)) throw new Error('Los vectores no tienen el mismo tamaño');
    const out = [];
    for (let i = 0; i < n; i++) out.push(f(...arr.map(x => (Array.isArray(x) ? x[i] : x))));
    return math.matrix(out);
  };
}
// ángulo en radianes (acepta Unit en deg/rad o número en grados)
const ang = (x) => (math.isUnit(x) ? x.toNumber('rad') : toNum(x) * D2R);
const kPa = (x) => (math.isUnit(x) ? x.toNumber('kPa') : toNum(x));
const mm = (x) => (math.isUnit(x) ? x.toNumber('m') : toNum(x));
const n0 = (x) => toNum(x);
const def = (x, d) => (x === undefined || x === null ? d : x);

// ---------------------------------------------------------------------
//  1) Factores de capacidad de carga
// ---------------------------------------------------------------------
export const Nq = (phi) => { const t = Math.tan(phi); return Math.exp(Math.PI * t) * Math.tan(Math.PI / 4 + phi / 2) ** 2; };
export const Nc = (phi) => (phi < 1e-6 ? Math.PI + 2 : (Nq(phi) - 1) / Math.tan(phi));
// Terzaghi (1943): Nq = a²/(2cos²(45+φ/2)), a = e^{(3π/4 − φ/2)tanφ}; Nγ de Kumbhojkar (1993) (Das, Tabla 3.1)
const TZ_PHI = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
const TZ_NG = [0, 0.14, 0.56, 1.52, 3.64, 8.34, 19.13, 45.41, 115.31, 325.34, 1072.8];
export const NqTz = (phi) => { const a = Math.exp((0.75 * Math.PI - phi / 2) * Math.tan(phi)); return a * a / (2 * Math.cos(Math.PI / 4 + phi / 2) ** 2); };
export const NcTz = (phi) => (phi < 1e-6 ? 1.5 * Math.PI + 1 : (NqTz(phi) - 1) / Math.tan(phi));
export const NgTz = (phi) => {
  const p = phi / D2R; if (p <= 0) return 0; if (p > 50) throw new Error('φ fuera de rango (0–50°) para Nγ de Terzaghi');
  if (p <= 5) return 0.14 * p / 5;
  return Math.exp(interp1(p, TZ_PHI.slice(1), TZ_NG.slice(1).map(Math.log)));
};
const kp = (phi) => Math.tan(Math.PI / 4 + phi / 2) ** 2;
const chkPhi = (p) => { if (!(p >= 0 && p < 60 * D2R)) throw new Error('Ángulo de fricción fuera de rango (0° ≤ φ < 60°)'); return p; };

// Meyerhof: tabla de Nq* para pilotes (Das, Tabla 11.5 — valores interpolados de Meyerhof 1976)
const MY_PHI = [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45];
const MY_NQ = [12.4, 13.8, 15.5, 17.9, 21.4, 26.0, 29.5, 34.0, 39.7, 46.5, 56.7, 68.2, 81.0, 96.0, 115.0, 143.0, 168.0, 194.0, 231.0, 276.0, 346.0, 420.0, 525.0, 650.0, 780.0, 930.0];

// Steinbrenner (1934): factores F1 y F2 (esquina de un rectángulo B'×L' sobre estrato de espesor H)
export function F1Stein(m, n) {
  const A0 = m * Math.log((1 + Math.sqrt(m * m + 1)) * Math.sqrt(m * m + n * n) / (m * (1 + Math.sqrt(m * m + n * n + 1))));
  const A1 = Math.log((m + Math.sqrt(m * m + 1)) * Math.sqrt(1 + n * n) / (m + Math.sqrt(m * m + n * n + 1)));
  return (A0 + A1) / Math.PI;
}
export function F2Stein(m, n) { return n / (2 * Math.PI) * Math.atan(m / (n * Math.sqrt(m * m + n * n + 1))); }
// Boussinesq — factor de influencia bajo la esquina de un rectángulo (Newmark 1935)
export function IzCornerMN(m, n) {
  const m2 = m * m, n2 = n * n, s = m2 + n2 + 1, r = Math.sqrt(s);
  const a = 2 * m * n * r / (m2 + n2 + m2 * n2 + 1) * (m2 + n2 + 2) / s;
  let b = Math.atan2(2 * m * n * r, s - m2 * n2); // equivale a atan(...) + π si el denominador es negativo
  return (a + b) / (4 * Math.PI);
}
// Grado de consolidación promedio U(Tv) (solución en serie de Terzaghi)
export function Uavg(Tv) {
  if (Tv <= 0) return 0; let U = 1;
  for (let m = 0; m < 200; m++) { const M = Math.PI * (2 * m + 1) / 2; const t = 2 / (M * M) * Math.exp(-M * M * Tv); U -= t; if (t < 1e-12) break; }
  return Math.max(0, Math.min(1, U));
}
// Youd et al. (2001): rd, CRR7.5, corrección por finos
export const rdYoud = (z) => (1 - 0.4113 * z ** 0.5 + 0.04052 * z + 0.001753 * z ** 1.5) / (1 - 0.4177 * z ** 0.5 + 0.05729 * z - 0.006205 * z ** 1.5 + 0.001210 * z * z);
export const crrYoud = (N) => (N >= 30 ? 2.0 : 1 / (34 - N) + N / 135 + 50 / (10 * N + 45) ** 2 - 1 / 200);
export function ncsYoud(N, FC) {
  const a = FC <= 5 ? 0 : FC < 35 ? Math.exp(1.76 - 190 / (FC * FC)) : 5;
  const b = FC <= 5 ? 1 : FC < 35 ? 0.99 + FC ** 1.5 / 1000 : 1.2;
  return a + b * N;
}

// ---------------------------------------------------------------------
//  2) Pendiente de dovelas, Winkler, etc. se resuelven en src/blocks/geotech.js
// ---------------------------------------------------------------------
defineFns({
  // ----- Factores de capacidad de carga -----
  NqBC: { fn: vec((phi) => Nq(chkPhi(ang(phi)))), tex: 'N_q', args: 'φ', desc: 'Nq = e^(π tanφ)·tan²(45+φ/2) (Prandtl–Reissner; Meyerhof, Hansen, Vesic, E.050 Art. 20.4)' },
  NcBC: { fn: vec((phi) => Nc(chkPhi(ang(phi)))), tex: 'N_c', args: 'φ', desc: 'Nc = (Nq − 1)·cotφ; 5.14 para φ = 0 (E.050 Art. 20.4)' },
  NgVesic: { fn: vec((phi) => 2 * (Nq(chkPhi(ang(phi))) + 1) * Math.tan(ang(phi))), tex: 'N_{\\gamma}', args: 'φ', desc: 'Nγ de Vesic (1973) = 2(Nq + 1)tanφ' },
  NgMeyerhof: { fn: vec((phi) => (Nq(chkPhi(ang(phi))) - 1) * Math.tan(1.4 * ang(phi))), tex: 'N_{\\gamma}', args: 'φ', desc: 'Nγ de Meyerhof (1963) = (Nq − 1)tan(1.4φ) — fórmula de la E.050 Art. 20.4' },
  NgHansen: { fn: vec((phi) => 1.5 * (Nq(chkPhi(ang(phi))) - 1) * Math.tan(ang(phi))), tex: 'N_{\\gamma}', args: 'φ', desc: 'Nγ de Hansen (1970) = 1.5(Nq − 1)tanφ' },
  NgEC7: { fn: vec((phi) => 2 * (Nq(chkPhi(ang(phi))) - 1) * Math.tan(ang(phi))), tex: 'N_{\\gamma}', args: 'φ', desc: 'Nγ Eurocódigo 7 (Anexo D) = 2(Nq − 1)tanφ' },
  NcTerzaghi: { fn: vec((phi) => NcTz(chkPhi(ang(phi)))), tex: 'N_c', args: 'φ', desc: 'Nc de Terzaghi (1943) = (Nq − 1)cotφ; 5.70 para φ = 0' },
  NqTerzaghi: { fn: vec((phi) => NqTz(chkPhi(ang(phi)))), tex: 'N_q', args: 'φ', desc: 'Nq de Terzaghi = e^{2(3π/4−φ/2)tanφ}/(2cos²(45+φ/2))' },
  NgTerzaghi: { fn: vec((phi) => NgTz(chkPhi(ang(phi)))), tex: 'N_{\\gamma}', args: 'φ', desc: 'Nγ de Terzaghi según Kumbhojkar (1993), tabla de Das (interpolación logarítmica)' },
  // ----- Factores de forma -----
  scDeBeer: { fn: vec((B, L, phi) => { const p = ang(phi); return 1 + mm(B) / mm(L) * Nq(p) / Nc(p); }), tex: 'F_{cs}', args: 'B, L, φ', desc: 'Forma (De Beer 1970; Das, Vesic): 1 + (B/L)(Nq/Nc)' },
  sqDeBeer: { fn: vec((B, L, phi) => 1 + mm(B) / mm(L) * Math.tan(ang(phi))), tex: 'F_{qs}', args: 'B, L, φ', desc: 'Forma (De Beer): 1 + (B/L)tanφ' },
  sgDeBeer: { fn: vec((B, L) => Math.max(0.6, 1 - 0.4 * mm(B) / mm(L))), tex: 'F_{\\gamma s}', args: 'B, L', desc: 'Forma (De Beer): 1 − 0.4 B/L ≥ 0.6' },
  scMeyerhof: { fn: vec((B, L, phi) => 1 + 0.2 * kp(ang(phi)) * mm(B) / mm(L)), tex: 's_c', args: 'B, L, φ', desc: 'Forma (Meyerhof 1963): 1 + 0.2 Kp B/L' },
  sqMeyerhof: { fn: vec((B, L, phi) => (ang(phi) > 10 * D2R ? 1 + 0.1 * kp(ang(phi)) * mm(B) / mm(L) : 1)), tex: 's_q', args: 'B, L, φ', desc: 'Forma (Meyerhof): sq = sγ = 1 + 0.1 Kp B/L (φ > 10°)' },
  scE050: { fn: vec((B, L) => 1 + 0.2 * mm(B) / mm(L)), tex: 's_c', args: 'B, L', desc: 'Forma E.050 Art. 20.4: sc = 1 + 0.2 B/L' },
  sgE050: { fn: vec((B, L) => 1 - 0.2 * mm(B) / mm(L)), tex: 's_{\\gamma}', args: 'B, L', desc: 'Forma E.050 Art. 20.4: sγ = 1 − 0.2 B/L' },
  // ----- Factores de profundidad -----
  kHansen: { fn: vec((Df, B) => { const r = mm(Df) / mm(B); return r <= 1 ? r : Math.atan(r); }), tex: 'k', args: 'Df, B', desc: 'Parámetro de profundidad de Hansen: Df/B (≤1) o atan(Df/B) [rad]' },
  dqHansen: { fn: vec((Df, B, phi) => { const r = mm(Df) / mm(B), k = r <= 1 ? r : Math.atan(r), p = ang(phi); return 1 + 2 * Math.tan(p) * (1 - Math.sin(p)) ** 2 * k; }), tex: 'F_{qd}', args: 'Df, B, φ', desc: 'Profundidad (Hansen 1970): 1 + 2tanφ(1 − sinφ)²k' },
  dcHansen: { fn: vec((Df, B, phi) => { const r = mm(Df) / mm(B), k = r <= 1 ? r : Math.atan(r), p = ang(phi); if (p < 1e-6) return 1 + 0.4 * k; const dq = 1 + 2 * Math.tan(p) * (1 - Math.sin(p)) ** 2 * k; return dq - (1 - dq) / (Nc(p) * Math.tan(p)); }), tex: 'F_{cd}', args: 'Df, B, φ', desc: 'Profundidad (Hansen/Vesic; Das): φ=0 → 1 + 0.4k; φ>0 → Fqd − (1 − Fqd)/(Nc tanφ)' },
  dcMeyerhof: { fn: vec((Df, B, phi) => 1 + 0.2 * Math.sqrt(kp(ang(phi))) * mm(Df) / mm(B)), tex: 'd_c', args: 'Df, B, φ', desc: 'Profundidad (Meyerhof): 1 + 0.2√Kp D/B' },
  dqMeyerhof: { fn: vec((Df, B, phi) => (ang(phi) > 10 * D2R ? 1 + 0.1 * Math.sqrt(kp(ang(phi))) * mm(Df) / mm(B) : 1)), tex: 'd_q', args: 'Df, B, φ', desc: 'Profundidad (Meyerhof): dq = dγ = 1 + 0.1√Kp D/B (φ > 10°)' },
  // ----- Inclinación de la carga -----
  icMeyerhof: { fn: vec((beta) => (1 - ang(beta) / (Math.PI / 2)) ** 2), tex: 'i_c', args: 'α', desc: 'Inclinación (Meyerhof 1963; E.050 Art. 20.4): ic = iq = (1 − α°/90°)²' },
  igMeyerhof: { fn: vec((beta, phi) => { const b = ang(beta), p = ang(phi); return p <= 0 ? 1 : b >= p ? 0 : (1 - b / p) ** 2; }), tex: 'i_{\\gamma}', args: 'α, φ', desc: 'Inclinación (Meyerhof; E.050): iγ = (1 − α/φ)²' },
  // ----- Nivel freático (Das 3.6) -----
  qWT: { fn: vec((g, gsat, Dw, Df, gw) => { gw = def(gw, mkUnit(9.81, 'kN/m^3')); const G = toNum(g, 'kN/m^3'), Gs = toNum(gsat, 'kN/m^3'), W = toNum(gw, 'kN/m^3'), dw = mm(Dw), df = mm(Df); return mkUnit(dw >= df ? G * df : G * Math.max(0, dw) + (Gs - W) * (df - Math.max(0, dw)), 'kN/m^2'); }), tex: "q'", args: 'γ, γsat, Dw, Df, [γw]', desc: 'Sobrecarga efectiva al nivel de desplante con nivel freático a Dw (Das, caso I)' },
  gammaWT: { fn: vec((g, gsat, Dw, Df, B, gw) => { gw = def(gw, mkUnit(9.81, 'kN/m^3')); const G = toNum(g, 'kN/m^3'), Gp = toNum(gsat, 'kN/m^3') - toNum(gw, 'kN/m^3'), d = mm(Dw) - mm(Df), b = mm(B); return mkUnit(d <= 0 ? Gp : d >= b ? G : Gp + d / b * (G - Gp), 'kN/m^3'); }), tex: '\\bar{\\gamma}', args: 'γ, γsat, Dw, Df, B, [γw]', desc: 'Peso unitario para el término Nγ según el nivel freático (Das, casos I–III)' },
  // ----- Incremento de esfuerzos -----
  IzRect: { fn: vec((B, L, z) => { const b = mm(B) / 2, l = mm(L) / 2, Z = Math.max(mm(z), 1e-9); return 4 * IzCornerMN(b / Z, l / Z); }), tex: 'I_z', args: 'B, L, z', desc: 'Boussinesq: factor de influencia bajo el centro de un rectángulo B×L (4 × Newmark)' },
  IzCorner: { fn: vec((B, L, z) => { const Z = Math.max(mm(z), 1e-9); return IzCornerMN(mm(B) / Z, mm(L) / Z); }), tex: 'I_3', args: 'B, L, z', desc: 'Boussinesq–Newmark: factor bajo la esquina de un rectángulo' },
  IzCircle: { fn: vec((R, z) => { const r = mm(R) / Math.max(mm(z), 1e-9); return 1 - (1 / (1 + r * r)) ** 1.5; }), tex: 'I_z', args: 'R, z', desc: 'Boussinesq: factor bajo el centro de un área circular de radio R' },
  dsig21: { fn: vec((q, B, L, z) => { const b = mm(B), l = mm(L), Z = mm(z); return math.multiply(q, b * l / ((b + Z) * (l + Z))); }), tex: '\\Delta\\sigma_{2:1}', args: 'q, B, L, z', desc: 'Incremento de esfuerzo por el método 2:1: qBL/((B+z)(L+z))' },
  // ----- Asentamiento elástico -----
  F1Stein: { fn: vec((m, n) => F1Stein(n0(m), Math.max(n0(n), 1e-6))), tex: 'F_1', args: "m', n'", desc: "Steinbrenner F1 (m' = L/B, n' = H/(B/2) para el centro)" },
  F2Stein: { fn: vec((m, n) => F2Stein(n0(m), Math.max(n0(n), 1e-6))), tex: 'F_2', args: "m', n'", desc: 'Steinbrenner F2' },
  IsStein: { fn: vec((m, n, mu) => { const M = n0(m), N = Math.max(n0(n), 1e-6), u = n0(mu); return F1Stein(M, N) + (1 - 2 * u) / (1 - u) * F2Stein(M, N); }), tex: 'I_s', args: "m', n', μ", desc: 'Factor de forma de Steinbrenner Is = F1 + (1−2μ)/(1−μ)·F2 (Bowles 1987; Das 5.10)' },
  SeFlex: { fn: vec((q, B, L, H, Es, mu) => { const b = mm(B), l = mm(L), h = mm(H), u = n0(mu); const Is = F1Stein(l / b, h / (b / 2)) + (1 - 2 * u) / (1 - u) * F2Stein(l / b, h / (b / 2)); return mkUnit(kPa(q) * 4 * (b / 2) * (1 - u * u) / kPa(Es) * Is, 'm'); }), tex: 'S_e', args: 'q, B, L, H, Es, μ', desc: 'Asentamiento elástico en el centro de un área flexible (Bowles/Steinbrenner, If = 1)' },
  // ----- SPT (E.050 Art. 5.27, Youd et al. 2001) -----
  N60SPT: { fn: vec((N, ER, CB, CS, CR) => n0(N) * n0(def(ER, 60)) / 60 * n0(def(CB, 1)) * n0(def(CS, 1)) * n0(def(CR, 1))), tex: 'N_{60}', args: 'N, ER(%), CB, CS, CR', desc: 'N60 = N·(ER/60)·CB·CS·CR (E.050 Art. 5.27)' },
  CNLiao: { fn: vec((svp) => Math.min(1.7, Math.sqrt(100 / Math.max(kPa(svp), 1e-6)))), tex: 'C_N', args: "σ'v", desc: "CN = (100 kPa/σ'v)^0.5 ≤ 1.7 (Liao y Whitman 1986; E.050 Art. 5.27; Youd 2001)" },
  CNSkempton: { fn: vec((svp) => 2 / (1 + kPa(svp) / 100)), tex: 'C_N', args: "σ'v", desc: "CN = 2/(1 + σ'v/pa) — arena fina normalmente consolidada (Skempton 1986)" },
  CRrod: { fn: vec((Lr) => { const l = mm(Lr); return l < 3 ? 0.75 : l < 4 ? 0.80 : l < 6 ? 0.85 : l < 10 ? 0.95 : 1.0; }), tex: 'C_R', args: 'Lbarra', desc: 'Corrección por longitud de barras (Youd et al. 2001, Tabla 2)' },
  phiPeck: { fn: vec((N60) => { const N = n0(N60); return mkUnit(27.1 + 0.3 * N - 0.00054 * N * N, 'deg'); }), tex: '\\phi', args: 'N60', desc: 'φ = 27.1 + 0.3N60 − 0.00054N60² (Peck, Hanson y Thornburn 1974; Wolff 1989)' },
  phiHatanaka: { fn: vec((N160) => mkUnit(Math.sqrt(20 * n0(N160)) + 20, 'deg')), tex: '\\phi', args: '(N1)60', desc: 'φ = √(20(N1)60) + 20° (Hatanaka y Uchida 1996)' },
  phiKulhawy: { fn: vec((N60, svp) => mkUnit(Math.atan((n0(N60) / (12.2 + 20.3 * kPa(svp) / PA)) ** 0.34) / D2R, 'deg')), tex: '\\phi', args: "N60, σ'v", desc: "φ = atan[N60/(12.2 + 20.3σ'v/pa)]^0.34 (Kulhawy y Mayne 1990)" },
  DrSPT: { fn: vec((N160) => Math.min(1, Math.sqrt(Math.max(0, n0(N160)) / 46))), tex: 'D_r', args: '(N1)60', desc: 'Densidad relativa Dr = √((N1)60/46) (Idriss y Boulanger 2008)' },
  cuSPT: { fn: vec((N60, k) => mkUnit(kPa(def(k, mkUnit(5, 'kPa'))) * n0(N60), 'kPa')), tex: 'c_u', args: 'N60, [k]', desc: 'cu = k·N60, k ≈ 4–6 kPa (Stroud 1974)' },
  cuHara: { fn: vec((N60) => mkUnit(0.29 * PA * n0(N60) ** 0.72, 'kPa')), tex: 'c_u', args: 'N60', desc: 'cu = 0.29 pa N60^0.72 (Hara et al. 1974; Kulhawy y Mayne)' },
  EsSPT: { fn: vec((N60, a) => mkUnit(n0(def(a, 10)) * PA * n0(N60), 'kPa')), tex: 'E_s', args: 'N60, [α]', desc: 'Es = α·pa·N60; α = 5 arena con finos, 10 limpia NC, 15 limpia SC (Kulhawy y Mayne 1990)' },
  EsBowles: { fn: vec((N) => mkUnit(500 * (n0(N) + 15), 'kPa')), tex: 'E_s', args: 'N', desc: 'Es = 500(N + 15) kPa — arena (Bowles 1996, Tabla 5-6)' },
  qaSPT: { fn: vec((N60, B, Df, Se) => { const N = n0(N60), b = mm(B), Fd = Math.min(1.33, 1 + 0.33 * mm(Df) / b), s = mm(def(Se, mkUnit(25, 'mm'))) * 1000; const q = b <= 1.22 ? 19.16 * N * Fd * s / 25 : 11.98 * N * ((3.28 * b + 1) / (3.28 * b)) ** 2 * Fd * s / 25; return mkUnit(q, 'kPa'); }), tex: 'q_{neta}', args: 'N60, B, Df, [Se]', desc: 'Presión neta admisible por asentamiento Se (25 mm) — Meyerhof (1965) modificada (Das ec. 5.75/5.76)' },
  // ----- Coeficiente de balasto -----
  ksVesic: { fn: vec((Es, mu, B, EI) => { const E = kPa(Es), b = mm(B), u = n0(mu), ei = toNum(EI, 'kN*m^2'); return mkUnit(0.65 * (E * b ** 4 / ei) ** (1 / 12) * E / ((1 - u * u) * b), 'kN/m^3'); }), tex: 'k_s', args: 'Es, μ, B, EI', desc: 'ks = 0.65·(Es B⁴/EI)^{1/12}·Es/(B(1−μ²)) (Vesic 1961)' },
  ksBowles: { fn: vec((qa, FS) => mkUnit(kPa(qa) * n0(def(FS, 3)) / 0.0254, 'kN/m^3')), tex: 'k_s', args: 'qa, [FS]', desc: 'ks ≈ FS·qa/ΔH con ΔH = 25.4 mm (≈ 40·FS·qa, Bowles 1996)' },
  ksEs: { fn: vec((Es, mu, B) => mkUnit(kPa(Es) / (mm(B) * (1 - n0(mu) ** 2)), 'kN/m^3')), tex: 'k_s', args: 'Es, μ, B', desc: 'ks = Es/(B(1 − μ²)) (Bowles, simplificado)' },
  ksTerzaghi: { fn: vec((k1, B, tipo) => { const b = mm(B), k = toNum(k1, 'kN/m^3'); return mkUnit(n0(def(tipo, 1)) === 2 ? k * 0.3 / b : k * ((b + 0.3) / (2 * b)) ** 2, 'kN/m^3'); }), tex: 'k_s', args: 'k1, B, [1=arena|2=arcilla]', desc: 'Corrección por tamaño de Terzaghi (1955) para placa de 0.30 m' },
  // ----- Consolidación -----
  ScCons: { fn: vec((Cc, Cr, e0, H, s0, ds, sc) => { const s = kPa(s0), d = kPa(ds), p = sc === undefined ? s : Math.max(kPa(sc), s), f = mm(H) / (1 + n0(e0)), sf = s + d; const S = sf <= p ? n0(Cr) * Math.log10(sf / s) : n0(Cr) * Math.log10(p / s) + n0(Cc) * Math.log10(sf / p); return mkUnit(f * S, 'm'); }), tex: 'S_c', args: "Cc, Cr, e0, H, σ'0, Δσ, [σ'c]", desc: 'Asentamiento por consolidación primaria NC/SC (Terzaghi; Das 1.15)' },
  CcSkempton: { fn: vec((LL) => 0.009 * (n0(LL) - 10)), tex: 'C_c', args: 'LL', desc: 'Cc = 0.009(LL − 10) (Terzaghi y Peck 1967)' },
  TvU: { fn: vec((U) => { const u = n0(U); if (!(u >= 0 && u < 1)) throw new Error('U debe estar entre 0 y 1'); return u <= 0.6 ? Math.PI / 4 * u * u : 1.781 - 0.933 * Math.log10(100 * (1 - u)); }), tex: 'T_v', args: 'U', desc: 'Factor tiempo Tv(U): π/4·U² (U ≤ 60 %), 1.781 − 0.933 log(100 − U%)' },
  UTv: { fn: vec((Tv) => Uavg(n0(Tv))), tex: 'U', args: 'Tv', desc: 'Grado de consolidación promedio U(Tv) (serie de Terzaghi)' },
  // ----- Pilotes -----
  NqMeyerhof: { fn: vec((phi) => { const p = ang(phi) / D2R; if (p < 20 || p > 45) throw new Error('Nq* de Meyerhof definido para 20° ≤ φ ≤ 45°'); return interp1(p, MY_PHI, MY_NQ); }), tex: 'N_q^{*}', args: 'φ', desc: 'Nq* de Meyerhof (1976) para la punta de pilotes (Das, Tabla 11.5)' },
  qlMeyerhof: { fn: vec((Nqs, phi) => mkUnit(0.5 * PA * n0(Nqs) * Math.tan(ang(phi)), 'kPa')), tex: 'q_l', args: 'Nq*, φ', desc: 'Resistencia de punta límite ql = 0.5·pa·Nq*·tanφ (Meyerhof 1976)' },
  NsVesic: { fn: vec((phi, Irr) => { const p = ang(phi), s = Math.sin(p); return 3 / (3 - s) * Math.exp((Math.PI / 2 - p) * Math.tan(p)) * Math.tan(Math.PI / 4 + p / 2) ** 2 * n0(Irr) ** (4 * s / (3 * (1 + s))); }), tex: 'N_{\\sigma}^{*}', args: 'φ, Irr', desc: 'Nσ* de Vesic (1977) para la punta de pilotes (expansión de cavidades)' },
  NcVesic: { fn: vec((phi, Irr) => { const p = ang(phi); if (p < 1e-6) return 4 / 3 * (Math.log(n0(Irr)) + 1) + Math.PI / 2 + 1; const s = Math.sin(p); const Ns = 3 / (3 - s) * Math.exp((Math.PI / 2 - p) * Math.tan(p)) * Math.tan(Math.PI / 4 + p / 2) ** 2 * n0(Irr) ** (4 * s / (3 * (1 + s))); return (Ns - 1) / Math.tan(p); }), tex: 'N_c^{*}', args: 'φ, Irr', desc: 'Nc* de Vesic: (Nσ* − 1)cotφ; φ = 0 → 4/3(ln Irr + 1) + π/2 + 1' },
  alphaAPI: { fn: vec((cu, svp) => { const psi = kPa(cu) / Math.max(kPa(svp), 1e-6); return Math.min(1, psi <= 1 ? 0.5 * psi ** -0.5 : 0.5 * psi ** -0.25); }), tex: '\\alpha', args: "cu, σ'v", desc: "Adhesión α (API RP2A 1987; Randolph–Murphy): 0.5ψ^-0.5 (ψ ≤ 1), 0.5ψ^-0.25 (ψ > 1), ψ = cu/σ'v" },
  betaBurland: { fn: vec((phi, OCR) => { const p = ang(phi); return (1 - Math.sin(p)) * Math.tan(p) * Math.sqrt(n0(def(OCR, 1))); }), tex: '\\beta', args: 'φ, [OCR]', desc: 'β = (1 − sinφ)·tanφ·√OCR (Burland 1973; Das 11.12)' },
  betaFHWA: { fn: vec((z, N60) => { const b = Math.max(0.25, Math.min(1.2, 1.5 - 0.245 * Math.sqrt(mm(z)))); const N = N60 === undefined ? 15 : n0(N60); return N >= 15 ? b : b * N / 15; }), tex: '\\beta', args: 'z, [N60]', desc: 'Pilas perforadas en arena: β = 1.5 − 0.245√z (0.25–1.2), ×N60/15 si N60 < 15 (FHWA, O’Neill y Reese 1999)' },
  qpFHWA: { fn: vec((N60) => mkUnit(Math.min(2900, 57.5 * n0(N60)), 'kPa')), tex: 'q_p', args: 'N60', desc: 'Punta de pilas perforadas en arena: qp = 57.5·N60 ≤ 2.9 MPa (FHWA-IF-99-025)' },
  qpMeyerhofSPT: { fn: vec((N60, L, D) => mkUnit(Math.min(0.4 * PA * n0(N60) * mm(L) / mm(D), 4 * PA * n0(N60)), 'kPa')), tex: 'q_p', args: 'N60, Lb, D', desc: 'Punta de pilotes hincados en arena: 0.4·pa·N60·L/D ≤ 4·pa·N60 (Meyerhof 1976)' },
  fsMeyerhofSPT: { fn: vec((N60, k) => mkUnit(n0(def(k, 0.02)) * PA * n0(N60), 'kPa')), tex: 'f_s', args: 'N60, [0.02|0.01]', desc: 'Fricción unitaria: 0.02·pa·N60 (desplazamiento grande) / 0.01·pa·N60 (H, pequeño) (Meyerhof 1976)' },
  etaConverse: { fn: vec((n1, n2, D, s) => { const a = n0(n1), b = n0(n2), th = Math.atan(mm(D) / mm(s)) / D2R; return 1 - th * ((a - 1) * b + (b - 1) * a) / (90 * a * b); }), tex: '\\eta', args: 'n1, n2, D, s', desc: 'Eficiencia de grupo de Converse–Labarre: 1 − θ[(n1−1)n2 + (n2−1)n1]/(90 n1 n2), θ = atan(D/s)°' },
  // ----- Licuación (E.050 Art. 38; Youd et al. 2001; Idriss y Boulanger 2008) -----
  rdYoud: { fn: vec((z) => rdYoud(Math.max(0, mm(z)))), tex: 'r_d', args: 'z', desc: 'Coeficiente de reducción de esfuerzos rd (Liao y Whitman; Youd et al. 2001, ec. 2)' },
  rdIB: { fn: vec((z, M) => { const Z = Math.min(34, Math.max(0, mm(z))), m = n0(M); const a = -1.012 - 1.126 * Math.sin(Z / 11.73 + 5.133), b = 0.106 + 0.118 * Math.sin(Z / 11.28 + 5.142); return Math.exp(a + b * m); }), tex: 'r_d', args: 'z, Mw', desc: 'rd de Idriss (1999) / Idriss y Boulanger (2008)' },
  CSRSeed: { fn: vec((amax, sv, svp, rd) => 0.65 * n0(amax) * kPa(sv) / kPa(svp) * n0(rd)), tex: 'CSR', args: "amax/g, σv, σ'v, rd", desc: "CSR = 0.65·(amax/g)·(σv/σ'v)·rd (Seed e Idriss 1971; E.050 Art. 5.29)" },
  N160cs: { fn: vec((N160, FC) => ncsYoud(n0(N160), n0(FC))), tex: '(N_1)_{60cs}', args: '(N1)60, FC(%)', desc: '(N1)60cs = α + β(N1)60 — corrección por finos (Idriss–Seed; Youd et al. 2001)' },
  N160csIB: { fn: vec((N160, FC) => { const f = n0(FC); return n0(N160) + Math.exp(1.63 + 9.7 / (f + 0.01) - (15.7 / (f + 0.01)) ** 2); }), tex: '(N_1)_{60cs}', args: '(N1)60, FC(%)', desc: 'Corrección por finos de Idriss y Boulanger (2008)' },
  CRR75: { fn: vec((N) => crrYoud(n0(N))), tex: 'CRR_{7.5}', args: '(N1)60cs', desc: 'CRR7.5 = 1/(34−N) + N/135 + 50/(10N+45)² − 1/200 (Youd et al. 2001); N ≥ 30 → no licuable (2.0)' },
  CRR75IB: { fn: vec((N) => { const n = Math.min(37.5, Math.max(0, n0(N))); return Math.min(2, Math.exp(n / 14.1 + (n / 126) ** 2 - (n / 23.6) ** 3 + (n / 25.4) ** 4 - 2.8)); }), tex: 'CRR_{7.5}', args: '(N1)60cs', desc: 'CRR(M=7.5, σ\'v=1 atm) de Idriss y Boulanger (2008)' },
  MSFYoud: { fn: vec((M) => 10 ** 2.24 / n0(M) ** 2.56), tex: 'MSF', args: 'Mw', desc: 'Factor de escala de magnitud MSF = 10^2.24/Mw^2.56 (Idriss; Youd et al. 2001)' },
  MSFIB: { fn: vec((M) => Math.min(1.8, 6.9 * Math.exp(-n0(M) / 4) - 0.058)), tex: 'MSF', args: 'Mw', desc: 'MSF = 6.9·e^(−M/4) − 0.058 ≤ 1.8 (Idriss y Boulanger 2008)' },
  KsigmaIB: { fn: vec((svp, N) => { const C = Math.min(0.3, 1 / (18.9 - 2.55 * Math.sqrt(Math.min(37, n0(N))))); return Math.min(1.1, 1 - C * Math.log(kPa(svp) / PA)); }), tex: 'K_{\\sigma}', args: "σ'v, (N1)60cs", desc: 'Factor de sobrecarga Kσ (Idriss y Boulanger 2008)' },
  FSLiq: { fn: vec((CRR, CSR, z, Dw) => (mm(z) < mm(Dw) ? 3 : Math.min(3, n0(CRR) / n0(CSR)))), tex: 'FS_L', args: 'CRR_M, CSR, z, Dw', desc: 'FS_L = CRR_M/CSR (E.050 Art. 38.5.8); sobre el NF o FS > 3 se reporta 3 (no licuable)' },
  PLCetin: { fn: vec((N160, CSR, M, svp, FC) => { const f = Math.min(35, n0(FC)), x = (n0(N160) * (1 + 0.004 * f) - 13.32 * Math.log(n0(CSR)) - 29.53 * Math.log(n0(M)) - 3.70 * Math.log(kPa(svp) / PA) + 0.05 * f + 16.85) / 2.70; return Phi(-x); }), tex: 'P_L', args: "(N1)60, CSR, Mw, σ'v, FC", desc: 'Probabilidad de licuación de Cetin et al. (2004) (E.050 Art. 38.5.6)' },
  liqEstado: { fn: vec((FS, FSmin, z, Dw, N) => (mm(z) < mm(Dw) ? 'Sobre el NF' : N !== undefined && n0(N) >= 30 ? 'No licuable (N ≥ 30)' : n0(FS) >= n0(FSmin) ? 'No licuable' : 'LICUABLE')), tex: '\\text{estado}', args: 'FS, FSmin, z, Dw, [(N1)60cs]', desc: 'Estado frente a licuación por estrato (texto)' },
}, 'Geotecnia');

// Función de distribución normal estándar (Abramowitz y Stegun 26.2.17)
function Phi(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x)), d = 0.3989422804014327 * Math.exp(-x * x / 2);
  const p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x >= 0 ? 1 - p : p;
}

export { D2R, PA };
