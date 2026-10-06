// =====================================================================
//  Funciones normativas — módulo «japan»
//  Building Standard Law (BSL) + Enforcement Order + Notificaciones MLIT,
//  AIJ (concreto armado y acero), JRA (puentes). Unidades SI.
//  (RtBSL, AiBSL, FsBSL y FeBSL ya existen en engine.js)
// =====================================================================
import { defineFns, math, toNum, mkUnit, interp1 } from '../engine.js';

const isVec = (x) => math.isMatrix(x) || Array.isArray(x);
// Aplica f elemento a elemento si x es vector (math.js Matrix o Array)
const vmap = (x, f) => (isVec(x) ? math.map(x, (v) => f(v)) : f(x));
const n0 = (x, u) => toNum(x, u);
const chk = (c, msg) => { if (!c) throw new Error(msg); };
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const E_STEEL = 205000; // N/mm² (AIJ / BSL)

// ---------------------------------------------------------------------
//  Sismo — BSL (Enforcement Order Art. 82-2 a 82-4, 88; Notif. 1793, 1792)
// ---------------------------------------------------------------------
const ZONAS = { 1: 1.0, 2: 0.9, 3: 0.8, 4: 0.7 };
function DsTabRC(rF, rW, bu) {
  // Notif. 1792 Art. 4 (texto vigente, mod. Notif. 596 de 2007), tabla para pórticos con muros de C°A°.
  // Transcrita del MEXT «建築構造設計指針» (2024), tabla 6.1, que reproduce el Art. 4 de la Notif. 1792.
  // Filas: rango del grupo de muros WA–WD y tramo de βu; columnas: rango del grupo de vigas y columnas FA–FD.
  rF = Math.round(rF); rW = Math.round(rW);
  chk(rF >= 1 && rF <= 4, 'Rango de columnas/vigas: 1 (FA) a 4 (FD)');
  chk(rW >= 1 && rW <= 4, 'Rango de muros: 1 (WA) a 4 (WD)');
  chk(bu >= 0 && bu <= 1, 'βu debe estar entre 0 y 1');
  if (bu === 0) return [0.30, 0.35, 0.40, 0.45][rF - 1]; // pórtico sin muros
  const T = {
    1: [[0.30, 0.35, 0.40, 0.45], [0.35, 0.40, 0.45, 0.50], [0.40, 0.45, 0.45, 0.55]],
    2: [[0.35, 0.35, 0.40, 0.45], [0.40, 0.40, 0.45, 0.50], [0.45, 0.45, 0.50, 0.55]],
    3: [[0.35, 0.35, 0.40, 0.45], [0.40, 0.45, 0.45, 0.50], [0.50, 0.50, 0.50, 0.55]],
    4: [[0.40, 0.40, 0.45, 0.45], [0.45, 0.50, 0.50, 0.50], [0.55, 0.55, 0.55, 0.55]],
  };
  const fila = bu <= 0.3 ? 0 : bu <= 0.7 ? 1 : 2;
  return T[rW][fila][rF - 1];
}
function DsTabS(rF, rB, bu) {
  // Notif. 1792 (Art. 3, mod. Notif. 596 de 2007): acero, columnas/vigas FA–FD y arriostres BA–BC
  rF = Math.round(rF); rB = Math.round(rB);
  chk(rF >= 1 && rF <= 4, 'Rango de columnas/vigas: 1 (FA) a 4 (FD)');
  chk(rB >= 1 && rB <= 3, 'Rango de arriostres: 1 (BA), 2 (BB) o 3 (BC)');
  chk(bu >= 0 && bu <= 1, 'βu debe estar entre 0 y 1');
  const fr = [0.25, 0.30, 0.35, 0.40];
  if (bu === 0 || rB === 1) return fr[rF - 1];
  if (rB === 2) return (bu <= 0.3 ? [0.25, 0.30, 0.35, 0.40] : bu <= 0.7 ? [0.30, 0.30, 0.35, 0.45] : [0.35, 0.35, 0.40, 0.50])[rF - 1];
  return (bu <= 0.3 ? [0.30, 0.30, 0.35, 0.40] : bu <= 0.5 ? [0.35, 0.35, 0.40, 0.45] : [0.40, 0.40, 0.45, 0.50])[rF - 1];
}
const FsN = (Rs) => (Rs >= 0.6 ? 1 : 2 - Rs / 0.6);
const FeN = (Re) => (Re <= 0.15 ? 1 : Re >= 0.3 ? 1.5 : 1 + 0.5 * (Re - 0.15) / 0.15);

// Espectro en la roca de ingeniería (Notif. 1461 Art. 4 / Notif. 1457), m/s², h = 5 %
function S0bed(T, nivel) {
  const k = nivel === 2 ? 5 : 1;
  return k * (T < 0.16 ? 0.64 + 6 * T : T < 0.64 ? 1.6 : 1.024 / T);
}
// Amplificación simplificada del suelo Gs (Notif. 1457 Art. 10, método por tipo de suelo)
//   suelo 1: 1.5 (T < 0.576) · 0.864/T · 1.35 (T ≥ 0.64)
//   suelos 2 y 3: 1.5 (T < 0.64) · 1.5·T/0.64 · gv (T ≥ Tu = 0.64·gv/1.5), gv = 2.025 / 2.7
function GsSimp(T, suelo) {
  if (suelo === 1) return T < 0.576 ? 1.5 : T < 0.64 ? 0.864 / T : 1.35;
  const gv = suelo === 2 ? 2.025 : 2.7, Tu = 0.64 * gv / 1.5;
  return T < 0.64 ? 1.5 : T < Tu ? 1.5 * T / 0.64 : gv;
}

// ---------------------------------------------------------------------
//  Viento — BSL Order Art. 87, Notif. 1454 (categorías de rugosidad I–IV)
// ---------------------------------------------------------------------
const RUG = { 1: { Zb: 5, ZG: 250, a: 0.10, g10: 2.0, g40: 1.8 }, 2: { Zb: 5, ZG: 350, a: 0.15, g10: 2.2, g40: 2.0 }, 3: { Zb: 5, ZG: 450, a: 0.20, g10: 2.5, g40: 2.1 }, 4: { Zb: 10, ZG: 550, a: 0.27, g10: 3.1, g40: 2.3 } };
const rug = (c) => { const r = RUG[Math.round(n0(c))]; chk(r, 'Categoría de rugosidad del terreno: 1, 2, 3 o 4'); return r; };
const ErF = (H, r) => 1.7 * (Math.max(H, r.Zb) / r.ZG) ** r.a;
const GfF = (H, r) => (H <= 10 ? r.g10 : H >= 40 ? r.g40 : r.g10 + (r.g40 - r.g10) * (H - 10) / 30);

// ---------------------------------------------------------------------
//  Concreto armado — AIJ Standard for Structural Calculation of RC Structures
// ---------------------------------------------------------------------
// Esfuerzo admisible a tracción de barras (largo / corto plazo), N/mm²
function ftBar(grade, plazo, d) {
  const g = Math.round(grade);
  chk([235, 295, 345, 390, 490].includes(g), 'Acero: SR235, SD295, SD345, SD390 o SD490 (use 235, 295, 345, 390 o 490)');
  if (plazo === 2) return g;
  if (g === 235) return 155;
  if (g === 295) return 195;
  if (g === 490) return d >= 29 ? 195 : 215;
  return d >= 29 ? 195 : 215; // SD345 / SD390
}
// Momento admisible de columna rectangular con armadura simétrica (sección fisurada, n)
function colAllow(Nd, b, D, at, dt, fc, ft, n) {
  const pts = [];
  const d = D - dt;
  for (let k = 0; k <= 600; k++) {
    const xn = D * 0.02 * Math.pow(400 / 0.02, k / 600); // 0.02D … 400D
    let sc = fc;
    if (xn < d) sc = Math.min(sc, ft * xn / (n * (d - xn)));
    if (xn > dt) sc = Math.min(sc, ft * xn / (n * (xn - dt)));
    let Cc, yc;
    if (xn <= D) { Cc = sc * b * xn / 2; yc = xn / 3; }
    else { const sb = sc * (xn - D) / xn; Cc = b * D * (sc + sb) / 2; yc = D * (sc + 2 * sb) / (3 * (sc + sb)); }
    const ssc = n * sc * (xn - dt) / xn;   // compresión (+)
    const sst = n * sc * (d - xn) / xn;    // tracción (+)
    const N = Cc + at * ssc - at * sst;
    const M = Cc * (D / 2 - yc) + at * ssc * (D / 2 - dt) + at * sst * (D / 2 - dt);
    pts.push([N, M]);
  }
  let best = -1;
  for (let i = 1; i < pts.length; i++) {
    const [N1, M1] = pts[i - 1], [N2, M2] = pts[i];
    if ((Nd - N1) * (Nd - N2) <= 0 && N1 !== N2) best = Math.max(best, M1 + (M2 - M1) * (Nd - N1) / (N2 - N1));
  }
  chk(best >= 0, 'La carga axial está fuera del diagrama de esfuerzos admisibles de la columna');
  return best;
}

// ---------------------------------------------------------------------
//  Acero — AIJ Design Standard for Steel Structures / Notif. MLIT 1024
// ---------------------------------------------------------------------
const LambdaF = (F) => Math.sqrt(Math.PI ** 2 * E_STEEL / (0.6 * F));
function fcSteel(lam, F) {
  const L = LambdaF(F), r = lam / L;
  if (lam <= L) { const nu = 1.5 + (2 / 3) * r * r; return (1 - 0.4 * r * r) * F / nu; }
  return 0.277 * F / (r * r);
}
// Perfiles H laminados JIS G 3192 (serie H × B; valores nominales con radio r)
// [H, B, tw, tf, r (mm), A (cm²), Ix (cm⁴), Zx (cm³), Iy (cm⁴), iy (cm)]
const HJIS = {
  200100: [200, 100, 5.5, 8, 8, 26.67, 1810, 181, 134, 2.24],
  250125: [250, 125, 6, 9, 8, 36.97, 3960, 317, 294, 2.82],
  300150: [300, 150, 6.5, 9, 13, 46.78, 7210, 481, 508, 3.29],
  350175: [350, 175, 7, 11, 13, 62.91, 13500, 771, 984, 3.95],
  400200: [400, 200, 8, 13, 16, 83.37, 23500, 1170, 1740, 4.56],
  450200: [450, 200, 9, 14, 18, 95.43, 32900, 1460, 1870, 4.43],
  500200: [500, 200, 10, 16, 20, 112.2, 46800, 1870, 2140, 4.36],
  600200: [600, 200, 11, 17, 22, 131.7, 75600, 2520, 2270, 4.15],
  300300: [300, 300, 10, 15, 13, 118.4, 20200, 1350, 6750, 7.55],
  400400: [400, 400, 13, 21, 22, 218.7, 66600, 3330, 22400, 10.1],
};
const H = (code) => { const s = HJIS[Math.round(n0(code))]; chk(s, 'Perfil H no tabulado: use p. ej. 400200 para H-400×200'); return s; };

// ---------------------------------------------------------------------
//  Puentes — JRA Specifications for Highway Bridges, Parte V (2012)
//  Espectros estándar S0 en gal (cm/s²), amortiguamiento 5 %
// ---------------------------------------------------------------------
function jra(T, suelo, nivel) {
  const g = Math.round(suelo); chk(g >= 1 && g <= 3, 'Tipo de suelo JRA: 1, 2 o 3');
  const c = (x) => Math.cbrt(x), p23 = (x) => x ** (2 / 3), p53 = (x) => x ** (5 / 3);
  if (nivel === 1) {
    if (g === 1) return T < 0.1 ? Math.max(431 * c(T), 160) : T <= 1.1 ? 200 : 220 / T;
    if (g === 2) return T < 0.2 ? Math.max(427 * c(T), 200) : T <= 1.3 ? 250 : 325 / T;
    return T < 0.34 ? Math.max(430 * c(T), 240) : T <= 1.5 ? 300 : 450 / T;
  }
  if (nivel === 21) { // Nivel 2, tipo I (subducción)
    if (g === 1) return T <= 1.4 ? 700 : 980 / T;
    if (g === 2) return T < 0.18 ? Math.max(1505 * c(T), 700) : T <= 1.6 ? 850 : 1360 / T;
    return T < 0.29 ? Math.max(1511 * c(T), 700) : T <= 2.0 ? 1000 : 2000 / T;
  }
  // Nivel 2, tipo II (cortical, tipo Kobe 1995)
  if (g === 1) return T < 0.3 ? 4463 * p23(T) : T <= 0.7 ? 2000 : 1104 / p53(T);
  if (g === 2) return T < 0.4 ? 3224 * p23(T) : T <= 1.2 ? 1750 : 2371 / p53(T);
  return T < 0.5 ? 2381 * p23(T) : T <= 1.5 ? 1500 : 2948 / p53(T);
}
const Tpos = (T) => { const t = n0(T, 's'); chk(t >= 0, 'El periodo debe ser ≥ 0'); return Math.max(t, 1e-6); };

defineFns({
  // ----- Sismo BSL -----
  ZBSL: { fn: (z) => { const v = ZONAS[Math.round(n0(z))]; chk(v, 'Zona sísmica BSL: 1 (Z=1.0), 2 (0.9), 3 (0.8) o 4 (Okinawa 0.7)'); return v; }, tex: 'Z', desc: 'Coef. de zona sísmica Z (Notif. 1793 Art. 1): zona 1→1.0, 2→0.9, 3→0.8, 4 (Okinawa)→0.7', args: 'zona' },
  TcBSL: { fn: (t) => { const v = { 1: 0.4, 2: 0.6, 3: 0.8 }[Math.round(n0(t))]; chk(v, 'Tipo de suelo BSL: 1, 2 o 3'); return mkUnit(v, 's'); }, tex: 'T_c', desc: 'Periodo característico del suelo Tc (Notif. 1793 Art. 2): tipo 1→0.4 s, 2→0.6 s, 3→0.8 s', args: 'tipo' },
  TBSL: { fn: (h, a) => mkUnit(n0(h, 'm') * (0.02 + 0.01 * clamp(n0(a), 0, 1)), 's'), tex: 'T', desc: 'Periodo fundamental de diseño T = h(0.02 + 0.01α) (Notif. 1793 Art. 2)', args: 'h, α' },
  FsN1792: { fn: (Rs) => vmap(Rs, (x) => FsN(n0(x))), tex: 'F_s', desc: 'Fs por rigidez relativa (Notif. 1792 Art. 7, tabla 1). Acepta vectores', args: 'Rs' },
  FeN1792: { fn: (Re) => vmap(Re, (x) => FeN(n0(x))), tex: 'F_e', desc: 'Fe por excentricidad: 1.0 (Re ≤ 0.15) → 1.5 (Re ≥ 0.30) (Notif. 1792 Art. 7, tabla 2). Acepta vectores', args: 'Re' },
  FesBSL: { fn: (Rs, Re) => {
    if (!isVec(Rs) && !isVec(Re)) return FsN(n0(Rs)) * FeN(n0(Re));
    const arr = (x) => (isVec(x) ? (math.isMatrix(x) ? x.toArray() : x).flat().map((v) => n0(v)) : null);
    const a = arr(Rs), b = arr(Re), n = (a || b).length;
    chk(!a || !b || a.length === b.length, 'Rs y Re deben tener el mismo número de pisos');
    return math.matrix([...Array(n)].map((_, i) => FsN(a ? a[i] : n0(Rs)) * FeN(b ? b[i] : n0(Re))));
  }, tex: 'F_{es}', desc: 'Factor de forma Fes = Fs·Fe (Notif. 1792 Art. 7). Acepta vectores por piso', args: 'Rs, Re' },
  DsRC: { fn: (rF, rW, bu) => vmap(bu, (x) => DsTabRC(n0(rF), n0(rW), n0(x))), tex: 'D_s', desc: 'Ds concreto armado (Notif. 1792 Art. 4): rangos 1–4 (A–D) de pórticos y muros y βu', args: 'rangoFrame, rangoMuro, βu' },
  DsS: { fn: (rF, rB, bu) => vmap(bu, (x) => DsTabS(n0(rF), n0(rB), n0(x))), tex: 'D_s', desc: 'Ds acero (Notif. 1792 Art. 3): rango FA–FD (1–4), arriostres BA–BC (1–3) y βu', args: 'rangoFrame, rangoArriostre, βu' },
  S0N1461: { fn: (T, nivel) => S0bed(Tpos(T), Math.round(n0(nivel))), tex: 'S_0', desc: 'Espectro de aceleración en la roca de ingeniería [m/s²] (Notif. 1461 / 1457): nivel 1 = sismo raro, 2 = muy raro (×5)', args: 'T, nivel' },
  GsN1457: { fn: (T, s) => { const g = Math.round(n0(s)); chk(g >= 1 && g <= 3, 'Tipo de suelo: 1, 2 o 3'); return GsSimp(Tpos(T), g); }, tex: 'G_s', desc: 'Amplificación simplificada del suelo Gs (Notif. 1457 Art. 10)', args: 'T, tipoSuelo' },
  FhBSL: { fn: (h) => 1.5 / (1 + 10 * n0(h)), tex: 'F_h', desc: 'Reducción por amortiguamiento Fh = 1.5/(1 + 10h) (Notif. 1457 Art. 9)', args: 'h' },
  // ----- Viento y nieve BSL -----
  ErBSL: { fn: (Hh, c) => ErF(n0(Hh, 'm'), rug(c)), tex: 'E_r', desc: 'Distribución vertical de velocidad Er = 1.7(H/ZG)^α (Notif. 1454 Art. 1)', args: 'H, categoría' },
  GfBSL: { fn: (Hh, c) => GfF(n0(Hh, 'm'), rug(c)), tex: 'G_f', desc: 'Factor de ráfaga Gf (Notif. 1454 Art. 1, tabla)', args: 'H, categoría' },
  qBSL: { fn: (Hh, c, V0) => { const h = n0(Hh, 'm'), r = rug(c); return mkUnit(0.6 * ErF(h, r) ** 2 * GfF(h, r) * n0(V0, 'm/s') ** 2, 'N/m^2'); }, tex: 'q', desc: 'Presión de velocidad q = 0.6·E·V0², E = Er²·Gf (Order Art. 87)', args: 'H, categoría, V0' },
  kzBSL: { fn: (z, Hh, c) => { const r = rug(c), h = n0(Hh, 'm'), Z = n0(z, 'm'); return h <= r.Zb ? 1 : ((Math.max(Z, r.Zb)) / h) ** (2 * r.a); }, tex: 'k_z', desc: 'Factor de altura kz para Cpe de barlovento (Notif. 1454 Art. 3)', args: 'Z, H, categoría' },
  mubBSL: { fn: (b) => { const d = math.isUnit(b) ? b.toNumber('deg') : n0(b); return d > 60 ? 0 : Math.sqrt(Math.cos(1.5 * d * Math.PI / 180)); }, tex: '\\mu_b', desc: 'Coef. de forma de techo para nieve μb = √cos(1.5β) (Order Art. 86-4)', args: 'β' },
  // ----- Concreto armado AIJ -----
  fcaAIJ: { fn: (Fc, p) => mkUnit(n0(Fc, 'N/mm^2') / (Math.round(n0(p)) === 2 ? 1.5 : 3), 'N/mm^2'), tex: 'f_c', desc: 'Compresión admisible del concreto: Fc/3 (largo plazo, 1) o 2Fc/3 (corto plazo, 2) (AIJ RC art. 6)', args: 'Fc, plazo' },
  fsaAIJ: { fn: (Fc, p) => { const F = n0(Fc, 'N/mm^2'); const l = Math.min(F / 30, 0.49 + F / 100); return mkUnit(Math.round(n0(p)) === 2 ? 1.5 * l : l, 'N/mm^2'); }, tex: 'f_s', desc: 'Cortante admisible del concreto: min(Fc/30, 0.49+Fc/100); corto plazo ×1.5 (AIJ RC art. 6)', args: 'Fc, plazo' },
  ftAIJ: { fn: (g, p, d) => mkUnit(ftBar(n0(g), Math.round(n0(p)), d === undefined ? 25 : n0(d, 'mm')), 'N/mm^2'), tex: 'f_t', desc: 'Tracción admisible de barras SD (AIJ RC art. 6): largo plazo 195/215, corto plazo = F', args: 'grado, plazo, db' },
  wftAIJ: { fn: (g, p) => { const G = Math.round(n0(g)); return mkUnit(Math.round(n0(p)) === 2 ? Math.min(G, 390) : (G === 235 ? 155 : 195), 'N/mm^2'); }, tex: '{}_w f_t', desc: 'Tracción admisible del refuerzo transversal (AIJ RC art. 6)', args: 'grado, plazo' },
  nAIJ: { fn: (Fc) => { const F = n0(Fc, 'N/mm^2'); return F <= 27 ? 15 : F <= 36 ? 13 : F <= 48 ? 11 : 9; }, tex: 'n', desc: 'Relación de módulos de Young n (AIJ RC art. 5)', args: 'Fc' },
  alphaAIJ: { fn: (M, Q, d, amax) => { const r = n0(M, 'N*mm') / (n0(Q, 'N') * n0(d, 'mm')); chk(r > 0, 'M/(Q·d) debe ser positivo'); return clamp(4 / (r + 1), 1, amax === undefined ? 2 : n0(amax)); }, tex: '\\alpha', desc: 'Factor de cortante α = 4/(M/(Q·d) + 1), 1 ≤ α ≤ αmax (AIJ RC art. 15)', args: 'M, Q, d, αmax' },
  QaAIJ: { fn: (b, j, a, fs, wft, pw) => { const p = clamp(n0(pw), 0.002, 0.012); return mkUnit(n0(b, 'mm') * n0(j, 'mm') * (n0(a) * n0(fs, 'N/mm^2') + 0.5 * n0(wft, 'N/mm^2') * (p - 0.002)) / 1000, 'kN'); }, tex: 'Q_A', desc: 'Cortante admisible a corto plazo Q = b·j·(α·fs + 0.5·wft·(pw − 0.002)), 0.2 % ≤ pw ≤ 1.2 % (AIJ RC art. 15)', args: 'b, j, α, fs, wft, pw' },
  QsuAIJ: { fn: (pt, Fc, MQd, pw, swy, s0, b, j) => {
    const r = clamp(n0(MQd), 1, 3), p = Math.min(n0(pw), 0.012), F = n0(Fc, 'N/mm^2');
    const tau = 0.068 * (100 * n0(pt)) ** 0.23 * (F + 18) / (r + 0.12) + 0.85 * Math.sqrt(p * n0(swy, 'N/mm^2')) + 0.1 * n0(s0, 'N/mm^2');
    return mkUnit(tau * n0(b, 'mm') * n0(j, 'mm') / 1000, 'kN');
  }, tex: 'Q_{su}', desc: 'Resistencia última a cortante de Arakawa (mínima): [0.068·pt^0.23(Fc+18)/(M/Qd+0.12) + 0.85√(pw·σwy) + 0.1σ0]·b·j; pt y pw como fracción', args: 'pt, Fc, M/(Qd), pw, σwy, σ0, b, j' },
  MuAIJ: { fn: (at, sy, d) => mkUnit(0.9 * n0(at, 'mm^2') * n0(sy, 'N/mm^2') * n0(d, 'mm') / 1e6, 'kN*m'), tex: 'M_u', desc: 'Momento último de viga Mu = 0.9·at·σy·d (Notif. 594 / AIJ)', args: 'at, σy, d' },
  MucAIJ: { fn: (at, sy, D, N, b, Fc) => {
    const Dd = n0(D, 'mm'), Nn = n0(N, 'N'), Nb = 0.4 * n0(b, 'mm') * Dd * n0(Fc, 'N/mm^2');
    chk(Nn <= Nb, 'MucAIJ válida para N ≤ 0.4·b·D·Fc');
    return mkUnit((0.8 * n0(at, 'mm^2') * n0(sy, 'N/mm^2') * Dd + 0.5 * Nn * Dd * (1 - Nn / (n0(b, 'mm') * Dd * n0(Fc, 'N/mm^2')))) / 1e6, 'kN*m');
  }, tex: 'M_u', desc: 'Momento último de columna (0 ≤ N ≤ 0.4bDFc): 0.8·at·σy·D + 0.5·N·D·(1 − N/(bDFc))', args: 'at, σy, D, N, b, Fc' },
  MaColAIJ: { fn: (N, b, D, at, dt, fc, ft, n) => mkUnit(colAllow(n0(N, 'N'), n0(b, 'mm'), n0(D, 'mm'), n0(at, 'mm^2'), n0(dt, 'mm'), n0(fc, 'N/mm^2'), n0(ft, 'N/mm^2'), n0(n)) / 1e6, 'kN*m'), tex: 'M_A', desc: 'Momento admisible de columna rectangular con armadura simétrica para N dado (sección fisurada, AIJ RC art. 14)', args: 'N, b, D, at, dt, fc, ft, n' },
  AbJIS: { fn: (d) => { const a = { 10: 71.33, 13: 126.7, 16: 198.6, 19: 286.5, 22: 387.1, 25: 506.7, 29: 642.4, 32: 794.2, 35: 956.6, 38: 1140, 41: 1340 }[Math.round(n0(d, 'mm'))]; chk(a, 'Barra corrugada JIS no tabulada: D10, D13, D16, D19, D22, D25, D29, D32, D35, D38, D41'); return mkUnit(a, 'mm^2'); }, tex: 'a_D', desc: 'Área nominal de barra corrugada JIS G 3112 (D10 … D41); argumento: diámetro nominal en mm', args: 'D' },
  // ----- Acero AIJ -----
  ftsAIJ: { fn: (F) => mkUnit(n0(F, 'N/mm^2') / 1.5, 'N/mm^2'), tex: 'f_t', desc: 'Tracción admisible del acero (largo plazo) ft = F/1.5 (AIJ acero art. 5)', args: 'F' },
  fssAIJ: { fn: (F) => mkUnit(n0(F, 'N/mm^2') / (1.5 * Math.sqrt(3)), 'N/mm^2'), tex: 'f_s', desc: 'Cortante admisible fs = F/(1.5√3) (AIJ acero art. 5)', args: 'F' },
  LambdaAIJ: { fn: (F) => LambdaF(n0(F, 'N/mm^2')), tex: '\\Lambda', desc: 'Esbeltez límite Λ = √(π²E/(0.6F)) (AIJ acero art. 5)', args: 'F' },
  fcAIJ: { fn: (lam, F) => { const l = n0(lam); chk(l > 0 && l <= 250, 'Esbeltez λ fuera de rango (0 < λ ≤ 250)'); return mkUnit(fcSteel(l, n0(F, 'N/mm^2')), 'N/mm^2'); }, tex: 'f_c', desc: 'Compresión admisible del acero (largo plazo) con ν = 3/2 + 2/3(λ/Λ)² (AIJ acero art. 5)', args: 'λ, F' },
  CbAIJ: { fn: (r) => Math.min(2.3, 1.75 + 1.05 * n0(r) + 0.3 * n0(r) ** 2), tex: 'C', desc: 'Factor de gradiente de momento C = 1.75 + 1.05(M2/M1) + 0.3(M2/M1)² ≤ 2.3 (M2/M1 > 0 en curvatura doble)', args: 'M2/M1' },
  fbAIJ: { fn: (lb, i, h, Af, F, C) => {
    const Fv = n0(F, 'N/mm^2'), ft = Fv / 1.5, L = LambdaF(Fv), c = C === undefined ? 1 : n0(C);
    const f1 = (1 - 0.4 * (n0(lb, 'mm') / n0(i, 'mm')) ** 2 / (c * L * L)) * ft;
    const f2 = 89000 / (n0(lb, 'mm') * n0(h, 'mm') / n0(Af, 'mm^2'));
    return mkUnit(Math.min(ft, Math.max(f1, f2)), 'N/mm^2');
  }, tex: 'f_b', desc: 'Flexión admisible con pandeo lateral: máx{(1 − 0.4(lb/i)²/(CΛ²))ft ; 89000/(lb·h/Af)} ≤ ft (AIJ acero art. 5 / Notif. 1024)', args: 'lb, i, h, Af, F, C' },
  hHJIS: { fn: (c) => mkUnit(H(c)[0], 'mm'), tex: 'H', desc: 'Altura del perfil H JIS G 3192 (código HHHBBB, p. ej. 400200)', args: 'código' },
  bHJIS: { fn: (c) => mkUnit(H(c)[1], 'mm'), tex: 'B', desc: 'Ancho de ala del perfil H JIS', args: 'código' },
  twHJIS: { fn: (c) => mkUnit(H(c)[2], 'mm'), tex: 't_w', desc: 'Espesor del alma del perfil H JIS', args: 'código' },
  tfHJIS: { fn: (c) => mkUnit(H(c)[3], 'mm'), tex: 't_f', desc: 'Espesor de ala del perfil H JIS', args: 'código' },
  AHJIS: { fn: (c) => mkUnit(H(c)[5], 'cm^2'), tex: 'A', desc: 'Área del perfil H JIS', args: 'código' },
  IxHJIS: { fn: (c) => mkUnit(H(c)[6], 'cm^4'), tex: 'I_x', desc: 'Inercia fuerte del perfil H JIS', args: 'código' },
  ZxHJIS: { fn: (c) => mkUnit(H(c)[7], 'cm^3'), tex: 'Z_x', desc: 'Módulo elástico fuerte del perfil H JIS', args: 'código' },
  IyHJIS: { fn: (c) => mkUnit(H(c)[8], 'cm^4'), tex: 'I_y', desc: 'Inercia débil del perfil H JIS', args: 'código' },
  iyHJIS: { fn: (c) => mkUnit(H(c)[9], 'cm'), tex: 'i_y', desc: 'Radio de giro débil del perfil H JIS', args: 'código' },
  ibHJIS: { fn: (c) => { const [h, b, tw, tf] = H(c); const I = tf * b ** 3 / 12, A = b * tf + (h - 2 * tf) * tw / 6; return mkUnit(Math.sqrt(I / A), 'mm'); }, tex: 'i', desc: 'Radio de giro del ala comprimida + 1/6 del alma respecto al eje débil (pandeo lateral, AIJ)', args: 'código' },
  // ----- Madera: método de cantidad de muros (Order Art. 46) -----
  kabeBSL: { fn: (techo, pisos, piso) => {
    const t = Math.round(n0(techo)), n = Math.round(n0(pisos)), p = Math.round(n0(piso));
    chk(t === 1 || t === 2, 'Techo: 1 = ligero (metálico), 2 = pesado (teja)');
    chk(n >= 1 && n <= 3 && p >= 1 && p <= n, 'Pisos: 1 a 3 y piso ≤ número de pisos');
    const tab = { 1: { 1: [11], 2: [29, 15], 3: [46, 34, 18] }, 2: { 1: [15], 2: [33, 21], 3: [50, 39, 24] } };
    return mkUnit(tab[t][n][p - 1], 'cm/m^2');
  }, tex: 'c_w', desc: 'Longitud de muro requerida por sismo por m² de planta (Order Art. 46-4, tabla 2, versión previa a 2025)', args: 'techo, pisos, piso' },
  // ----- Puentes JRA -----
  SJRA1: { fn: (T, s) => jra(Tpos(T), n0(s), 1), tex: 'S_{0}', desc: 'Espectro estándar nivel 1 JRA [gal], suelo 1–3 (Parte V, 4.1)', args: 'T, suelo' },
  SJRA2I: { fn: (T, s) => jra(Tpos(T), n0(s), 21), tex: 'S_{I0}', desc: 'Espectro estándar nivel 2 tipo I (subducción) JRA [gal]', args: 'T, suelo' },
  SJRA2II: { fn: (T, s) => jra(Tpos(T), n0(s), 22), tex: 'S_{II0}', desc: 'Espectro estándar nivel 2 tipo II (cortical) JRA [gal]', args: 'T, suelo' },
  cDJRA: { fn: (h) => 1.5 / (40 * n0(h) + 1) + 0.5, tex: 'c_D', desc: 'Corrección por amortiguamiento cD = 1.5/(40h + 1) + 0.5 (JRA V)', args: 'h' },
  czJRA: { fn: (z) => { const v = { 1: 1.0, 2: 0.85, 3: 0.7 }[Math.round(n0(z))]; chk(v, 'Zona JRA: 1 (A), 2 (B) o 3 (C)'); return v; }, tex: 'c_z', desc: 'Coef. de zona JRA: A = 1.0, B = 0.85, C = 0.7', args: 'zona' },
  sueloJRA: { fn: (TG) => { const t = n0(TG, 's'); return t < 0.2 ? 1 : t < 0.6 ? 2 : 3; }, tex: '\\mathrm{suelo}', desc: 'Tipo de suelo JRA según el periodo característico TG = 4ΣHi/Vsi', args: 'TG' },
}, 'Japón');

export { DsTabRC, DsTabS, colAllow, jra, interp1 };
