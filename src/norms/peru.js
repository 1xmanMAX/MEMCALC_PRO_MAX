// =====================================================================
//  Funciones normativas — módulo «peru»
//  RNE: NTE E.020 Cargas (2006), NTE E.030 Diseño Sismorresistente
//  (2018, modificada por RM 183-2026-VIVIENDA) y NTE E.031 Aislamiento
//  Sísmico (DS 030-2019-VIVIENDA).  Ver docs/referencias/peru.md
//
//  Las funciones SE030, TpE030, TlE030, CE030 y CE030d ya existen en
//  src/engine.js (no se redefinen aquí).
// =====================================================================
import { defineFns, math, toNum, mkUnit, interp1 } from '../engine.js';

const G = 9.80665; // m/s²
const n0 = (x, u) => toNum(x, u);
// vector (Matrix | Array | escalar) -> array de números (en la unidad u, o SI si u se omite)
export function vecNum(v, u) {
  let a = math.isMatrix(v) ? v.toArray() : Array.isArray(v) ? v : [v];
  a = a.flat(Infinity);
  return a.map(x => (math.isUnit(x) ? (u ? x.toNumber(u) : x.value) : Number(x)));
}
const pick = (code, tab, what) => {
  const c = Math.round(n0(code));
  if (!(c in tab)) throw new Error(what + ': código ' + code + ' no válido (' + Object.keys(tab).join(', ') + ')');
  return tab[c];
};

// ---------- E.030 Tablas ----------
const Z_TAB = { 4: 0.45, 3: 0.35, 2: 0.25, 1: 0.10 };                       // Tabla N° 1
const U_TAB = { 1: 1.0, 11: 1.5, 2: 1.5, 3: 1.3, 4: 1.0 };                    // Tabla N° 7 (códigos abajo)
const R0_TAB = {                                                               // Tabla N° 10 (E.030-2026)
  1: 8, 2: 5, 3: 4, 4: 7, 5: 4, 6: 8,          // acero SMF, IMF, OMF, SCBF, OCBF, EBF
  7: 8, 8: 7, 9: 6, 10: 3.5,                   // C°A° pórticos, dual, muros, EMDL
  11: 3, 12: 7, 13: 2.5,                       // albañilería, madera (esf. admisibles), péndulo invertido (22.3)
};
const CT_TAB = { 1: 35, 2: 45, 3: 45, 4: 45, 5: 45, 6: 45, 7: 35, 8: 60, 9: 60, 10: 60, 11: 60, 12: 35, 13: 35 }; // Art. 36.1 (orientativo)
const DLIM_TAB = { 1: 0.007, 2: 0.010, 3: 0.005, 4: 0.010, 5: 0.004 };       // Tabla N° 14 (E.030-2026)
const C1_TAB = { 1: 3.0, 2: 2.0, 3: 3.0, 4: 1.5 };                            // Tabla N° 15

export function kE030(T) { T = n0(T, 's'); return T <= 0.5 ? 1.0 : Math.min(0.75 + 0.5 * T, 2.0); }
export function CdynE030(T, Tp, Tl) { // Tabla N° 6 (con rama de periodos cortos)
  return T < 0.2 * Tp ? 1 + 7.5 * T / Tp : T <= Tp ? 2.5 : T < Tl ? 2.5 * Tp / T : 2.5 * Tp * Tl / (T * T);
}

// ---------- Irregularidades (Tablas N° 11 y 12) ----------
// Rigidez: Ki < 0.70 K(i+1) ó Ki < 0.80 prom(K(i+1..i+3))  → 0.75 ; extrema 0.60 / 0.70 → 0.50
export function stiffRatios(K) {
  const n = K.length, r1 = [], r3 = [];
  for (let i = 0; i < n; i++) {
    r1.push(i < n - 1 ? K[i] / K[i + 1] : null);
    r3.push(i < n - 3 ? K[i] / ((K[i + 1] + K[i + 2] + K[i + 3]) / 3) : null);
  }
  return { r1, r3 };
}
export function IaRig(K) {
  const { r1, r3 } = stiffRatios(K);
  let f = 1;
  for (let i = 0; i < K.length; i++) {
    if ((r1[i] !== null && r1[i] < 0.6) || (r3[i] !== null && r3[i] < 0.7)) f = Math.min(f, 0.5);
    else if ((r1[i] !== null && r1[i] < 0.7) || (r3[i] !== null && r3[i] < 0.8)) f = Math.min(f, 0.75);
  }
  return f;
}
export function IaRes(V) {
  let f = 1;
  for (let i = 0; i < V.length - 1; i++) { const r = V[i] / V[i + 1]; if (r < 0.65) f = Math.min(f, 0.5); else if (r < 0.8) f = Math.min(f, 0.75); }
  return f;
}
// Masa: Pi > 1.5 P(adyacente); no se aplica a azotea (último nivel) ni sótanos
export function IaMas(P, nsot = 0) {
  let f = 1; const n = P.length;
  for (let i = nsot; i < n - 1; i++) {
    const adj = []; if (i - 1 >= nsot) adj.push(P[i - 1]); if (i + 1 <= n - 2) adj.push(P[i + 1]);
    if (adj.some(a => P[i] > 1.5 * a)) f = 0.9;
  }
  return f;
}
// Geometría vertical: dimensión en planta > 1.3 × la del piso adyacente (no azotea ni sótanos)
export function IaGeo(D, nsot = 0) {
  let f = 1; const n = D.length;
  for (let i = nsot; i < n - 1; i++) {
    const adj = []; if (i - 1 >= nsot) adj.push(D[i - 1]); if (i + 1 <= n - 2) adj.push(D[i + 1]);
    if (adj.some(a => D[i] > 1.3 * a)) f = 0.9;
  }
  return f;
}
// Torsión: Δmax/Δprom > 1.3 → 0.75 ; > 1.5 → 0.60 ; solo si deriva > 0.5 límite
export function IpTor(Dmax, Dprom, drift, dlim) {
  let f = 1;
  for (let i = 0; i < Dmax.length; i++) {
    const r = Dmax[i] / Dprom[i];
    if (drift && dlim && !(drift[i] > 0.5 * dlim)) continue;
    if (r > 1.5) f = Math.min(f, 0.6); else if (r > 1.3) f = Math.min(f, 0.75);
  }
  return f;
}

// ---------- E.031 ----------
const BM_B = [2, 5, 10, 20, 30, 40], BM_V = [0.8, 1.0, 1.2, 1.5, 1.7, 1.9]; // Tabla N° 5
export function BME031num(beta) { let b = n0(beta); if (b < 1) b *= 100; return interp1(b, BM_B, BM_V); }

const E030 = 'Sismo — Perú (E.030)';
defineFns({
  ZE030: { fn: (zona) => pick(zona, Z_TAB, 'Zona sísmica'), tex: 'Z', desc: 'Factor de zona Z (E.030 Tabla N° 1): zona 1–4', args: 'zona' },
  UE030: { fn: (cat) => pick(cat, U_TAB, 'Categoría'), tex: 'U', desc: 'Factor de uso U (Tabla N° 7). Códigos: 1 = A1 aislada (U=1), 11 = A1 sin aislamiento en zonas 1–2 (1.5), 2 = A2 (1.5), 3 = B (1.3), 4 = C (1.0)', args: 'cat' },
  R0E030: { fn: (s) => pick(s, R0_TAB, 'Sistema estructural'), tex: 'R_0', desc: 'Coef. básico R0 (Tabla N° 10, E.030-2026). Sistema: 1 SMF, 2 IMF, 3 OMF, 4 SCBF, 5 OCBF, 6 EBF, 7 C°A° pórticos, 8 dual, 9 muros, 10 EMDL, 11 albañilería, 12 madera, 13 péndulo invertido', args: 'sistema' },
  CTE030: { fn: (s) => pick(s, CT_TAB, 'Sistema estructural'), tex: 'C_T', desc: 'Coeficiente CT del periodo T = hn/CT (Art. 36.1) según el código de sistema de R0E030 (7 → 35; acero arriostrado → 45; dual, muros, EMDL, albañilería → 60)', args: 'sistema' },
  dlimE030: { fn: (mat) => pick(mat, DLIM_TAB, 'Material'), tex: '\\left(\\Delta/h\\right)_{lim}', desc: 'Distorsión máxima (Tabla N° 14, E.030-2026): 1 C°A° 0.007, 2 acero 0.010, 3 albañilería 0.005, 4 madera 0.010, 5 EMDL 0.004', args: 'material' },
  kE030: { fn: kE030, tex: 'k', desc: 'Exponente de distribución en altura (Art. 35.2): 1.0 si T ≤ 0.5 s; 0.75 + 0.5T ≤ 2.0', args: 'T' },
  SaE030: { fn: (T, Z, U, S, Tp, Tl, R) => n0(Z) * n0(U) * CdynE030(n0(T, 's'), n0(Tp, 's'), n0(Tl, 's')) * n0(S) / n0(R), tex: 'S_a/g', desc: 'Espectro inelástico ZUCS/R en g (Art. 41.1), con C de la Tabla N° 6 (incluye T < 0.2 TP)', args: 'T, Z, U, S, Tp, Tl, R' },
  VE030: { fn: (Z, U, C, S, R, P) => math.multiply(n0(Z) * n0(U) * n0(S) * Math.max(n0(C) / n0(R), 0.11), P), tex: 'V', desc: 'Cortante basal V = Z·U·S·max(C/R, 0.11)·P (Art. 34.1 y 34.2)', args: 'Z, U, C, S, R, P' },
  fdespE030: { fn: (irr) => (truthy(irr) ? 0.85 : 0.75), tex: 'f_{\\Delta}', desc: 'Factor de desplazamientos inelásticos (Art. 50): 0.75 regular (0) / 0.85 irregular (1); multiplica a R', args: 'irregular' },
  alphaE030: {
    fn: (P, hi, k) => { const p = vecNum(P), h = vecNum(hi, 'm'), kk = n0(k); const w = p.map((x, i) => x * h[i] ** kk), s = w.reduce((a, b) => a + b, 0); return math.matrix(w.map(x => x / s)); },
    tex: '\\alpha', desc: 'Factores de distribución αi = Pi·hi^k / Σ Pj·hj^k (Art. 35.1). Vectores de pesos y alturas desde la base', args: 'Pi, hi, k',
  },
  sJuntaE030: { fn: (Z, S, hh) => mkUnit(Math.max(0.02 * n0(Z) * n0(S) * n0(hh, 'm'), 0.03), 'm'), tex: 's_{min}', desc: 'Junta mínima s = 0.02·Z·S·h ≥ 0.03 m (Art. 52.2, E.030-2026)', args: 'Z, S, h' },
  sJunta2018: { fn: (hh) => mkUnit(Math.max(0.006 * n0(hh, 'm'), 0.03), 'm'), tex: 's_{min}', desc: 'Junta mínima E.030-2018 (Art. 33.2): s = 0.006·h ≥ 0.03 m', args: 'h' },
  C1E030: { fn: (t) => pick(t, C1_TAB, 'Tipo de elemento no estructural'), tex: 'C_1', desc: 'C1 (Tabla N° 15): 1 elementos que pueden precipitarse fuera 3.0; 2 muros y tabiques interiores 2.0; 3 tanques, casa de máquinas, parapetos en azotea 3.0; 4 equipos rígidos 1.5', args: 'tipo' },
  FneE030: {
    fn: (ai, C1, Pe, Z, U, S) => math.multiply(Math.max(n0(ai) * n0(C1), 0.5 * n0(Z) * n0(U) * n0(S)), Pe),
    tex: 'F', desc: 'Fuerza sísmica en elemento no estructural F = (ai/g)·C1·Pe ≥ 0.5·Z·U·S·Pe (Art. 57 y 58); ai en g (o Fi/Pi)', args: 'ai_g, C1, Pe, Z, U, S',
  },
  IaRigE030: { fn: (K) => IaRig(vecNum(K)), tex: 'I_{a,rig}', desc: 'Ia por irregularidad de rigidez / piso blando (Tabla N° 11) a partir del vector de rigideces laterales de entrepiso (1 → n)', args: 'Ki' },
  IaResE030: { fn: (V) => IaRes(vecNum(V)), tex: 'I_{a,res}', desc: 'Ia por irregularidad de resistencia / piso débil (Tabla N° 11): resistencias de entrepiso (1 → n)', args: 'Vri' },
  IaMasE030: { fn: (P) => IaMas(vecNum(P)), tex: 'I_{a,mas}', desc: 'Ia por irregularidad de masa (Pi > 1.5 P adyacente, sin azotea) (Tabla N° 11)', args: 'Pi' },
  IpTorE030: {
    fn: (Dmax, Dprom, drift, dlim) => IpTor(vecNum(Dmax), vecNum(Dprom), drift === undefined ? null : vecNum(drift), dlim === undefined ? null : n0(dlim)),
    tex: 'I_{p,tor}', desc: 'Ip por irregularidad torsional (Δmax/Δprom > 1.3 → 0.75; > 1.5 → 0.60), solo en entrepisos con deriva > 50 % del límite (Tabla N° 12)', args: 'Dmax, Dprom [, deriva, dlim]',
  },
}, E030);

// ---------- E.020 Cargas ----------
const E020 = 'Cargas — Perú (E.020)';
defineFns({
  VhE020: {
    fn: (V, hh) => { const v = Math.max(n0(V, 'km/h'), 75); const z = Math.max(n0(hh, 'm'), 10); return mkUnit(v * (z / 10) ** 0.22, 'km/h'); },
    tex: 'V_h', desc: 'Velocidad de diseño Vh = V·(h/10)^0.22, V ≥ 75 km/h; para h ≤ 10 m Vh = V (E.020 Art. 12.3)', args: 'V, h',
  },
  PhE020: { fn: (Cf, Vh) => mkUnit(0.005 * n0(Cf) * n0(Vh, 'km/h') ** 2, 'kgf/m^2'), tex: 'P_h', desc: 'Presión de viento Ph = 0.005·C·Vh² [kgf/m², Vh en km/h] (E.020 Art. 12.4)', args: 'C, Vh' },
  LrE020: {
    fn: (Lo, At, k) => { const Ai = n0(k) * n0(At, 'm^2'); if (Ai <= 40) return Lo; return math.multiply(Math.max(0.25 + 4.6 / Math.sqrt(Ai), 0.5), Lo); },
    tex: 'L_r', desc: 'Carga viva reducida Lr = Lo·(0.25 + 4.6/√Ai) ≥ 0.5·Lo, Ai = k·At > 40 m² (E.020 Art. 10)', args: 'Lo, At, k',
  },
  QtE020: {
    fn: (Qs, th) => { const t = math.isUnit(th) ? th.toNumber('deg') : n0(th); const f = t <= 15 ? 1 : t <= 30 ? 0.8 : 0.8 * Math.max(0, 1 - 0.025 * (t - 30)); return math.multiply(f, Qs); },
    tex: 'Q_t', desc: 'Carga de nieve en techos Qt = Qs (θ ≤ 15°), 0.8 Qs (15°–30°), Cs·0.8 Qs con Cs = 1 − 0.025(θ − 30°) (E.020 Art. 11.3)', args: 'Qs, θ',
  },
  pAligE020: {
    fn: (hl) => mkUnit(interp1(n0(hl, 'm'), [0.17, 0.20, 0.25, 0.30], [280, 300, 350, 420]), 'kgf/m^2'),
    tex: 'w_{alig}', desc: 'Peso propio de losa aligerada en una dirección (viguetas 0.10 m @ 0.40 m, losa superior 0.05 m) — E.020 Anexo 1: 0.17 → 280, 0.20 → 300, 0.25 → 350, 0.30 → 420 kgf/m²', args: 'h',
  },
  CVtechoE020: {
    fn: (th) => { const t = math.isUnit(th) ? th.toNumber('deg') : n0(th); return mkUnit(t <= 3 ? 100 : Math.max(100 - 5 * (t - 3), 50), 'kgf/m^2'); },
    tex: 'L_{techo}', desc: 'Carga viva de techo (E.020 Art. 7.1 a, b): 100 kgf/m² hasta 3°, −5 kgf/m² por grado, mínimo 50 kgf/m²', args: 'θ',
  },
}, E020);

// ---------- E.031 Aislamiento sísmico ----------
const E031 = 'Aislamiento — Perú (E.031)';
defineFns({
  BME031: { fn: (b) => BME031num(b), tex: 'B_M', desc: 'Factor de amortiguamiento BM (E.031 Tabla N° 5) por interpolación lineal; βM en fracción (0.20) o en % (20)', args: 'βM' },
  SaME031: { fn: (T, Z, S, Tp, Tl) => 1.5 * n0(Z) * CdynE030(n0(T, 's'), n0(Tp, 's'), n0(Tl, 's')) * n0(S), tex: 'S_{aM}/g', desc: 'Espectro del sismo máximo considerado SaM = 1.5·Z·U·C·S con U = 1 (E.031 Art. 14.4, ec. 5), en g', args: 'T, Z, S, Tp, Tl' },
  DME031: {
    fn: (SaM, TM, BM) => { const sa = math.isUnit(SaM) ? SaM.toNumber('m/s^2') : n0(SaM) * G; const t = n0(TM, 's'); return mkUnit(sa * t * t / (4 * Math.PI ** 2 * n0(BM)), 'm'); },
    tex: 'D_M', desc: 'Desplazamiento traslacional DM = SaM·TM²/(4π²·BM) (E.031 ec. 6); SaM en g o en m/s²', args: 'SaM, TM, BM',
  },
  TME031: {
    fn: (P, kM) => mkUnit(2 * Math.PI * Math.sqrt(n0(P, 'N') / (n0(kM, 'N/m') * G)), 's'),
    tex: 'T_M', desc: 'Periodo efectivo TM = 2π·√(P/(kM·g)) (E.031 ec. 7)', args: 'P, kM',
  },
  DTME031: {
    fn: (DM, y, e, b, d, PT) => { const f = 1 + n0(y, 'm') / Math.max(n0(PT), 1) ** 2 * 12 * n0(e, 'm') / (n0(b, 'm') ** 2 + n0(d, 'm') ** 2); return math.multiply(Math.max(f, 1.15), DM); },
    tex: 'D_{TM}', desc: 'Desplazamiento total DTM = DM·[1 + (y/PT²)·12e/(b² + d²)] ≥ 1.15·DM (E.031 ec. 8)', args: 'DM, y, e, b, d, PT',
  },
  RaE031: { fn: (R0) => Math.min(Math.max(3 / 8 * n0(R0), 1), 2), tex: 'R_a', desc: 'Ra = 3/8·R0, entre 1 y 2 (E.031 Art. 21.2)', args: 'R0' },
  VstE031: { fn: (Vb, Ps, P, b) => math.multiply((n0(Ps) / n0(P)) ** (1 - 2.5 * n0(b)), Vb), tex: 'V_{st}', desc: 'Cortante no reducido Vst = Vb·(Ps/P)^(1 − 2.5βM) (E.031 ec. 12)', args: 'Vb, Ps, P, βM' },
  kE031: { fn: (b, Tf) => 14 * n0(b) * n0(Tf, 's'), tex: 'k', desc: 'Exponente de distribución sobre la interfaz k = 14·βM·Tf (E.031 ec. 15)', args: 'βM, Tf' },
  keffLRB: {
    fn: (Qd, kd, D) => math.add(math.divide(Qd, D), kd),
    tex: 'k_{eff}', desc: 'Rigidez efectiva de un aislador bilineal (LRB/HDR): keff = Qd/D + kd', args: 'Qd, kd, D',
  },
  betaLRB: {
    fn: (Qd, kd, D, Dy) => { const q = n0(Qd, 'N'), k = n0(kd, 'N/m'), d = n0(D, 'm'), dy = n0(Dy, 'm'); const ke = q / d + k; return Math.max(0, 4 * q * (d - dy) / (2 * Math.PI * ke * d * d)); },
    tex: '\\beta_{eff}', desc: 'Amortiguamiento efectivo bilineal βeff = 4·Qd·(D − Dy)/(2π·keff·D²) (E.031 ec. 4 con E = 4Qd(D − Dy))', args: 'Qd, kd, D, Dy',
  },
  lambdaE031: {
    fn: (ae, tvs, fab) => (1 + 0.75 * (n0(ae) - 1)) * n0(tvs) * n0(fab),
    tex: '\\lambda', desc: 'Factor de modificación de propiedades λ = [1 + 0.75(λae − 1)]·λtvs·λfab (E.031 ec. 1 y 2)', args: 'λae, λtvs, λfab',
  },
}, E031);

function truthy(c) { return math.isUnit(c) ? c.value !== 0 : !!n0(c); }
export const G_ACC = G;
