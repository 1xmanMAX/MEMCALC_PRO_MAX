// =====================================================================
//  Funciones normativas — módulo «walls» (empujes de tierra y muros)
//  Convenciones (ver docs/referencias/walls.md):
//   · Ángulos: use unidades (30 deg). Un número sin unidad se toma en radianes (math.js).
//   · φ: fricción del relleno; δ: fricción muro-suelo; β: talud del relleno sobre la
//     horizontal; θ: inclinación del trasdós respecto a la vertical, positiva cuando el
//     relleno descansa sobre el trasdós (muro más ancho en la base, convención de Das).
//   · kh, kv: coeficientes sísmicos horizontal y vertical (kv > 0 hacia arriba).
// =====================================================================
import { defineFns, math, toNum, mkUnit, interp1 } from '../engine.js';

const { sin, cos, tan, atan, sqrt, PI, log10 } = Math;
const ang = (x, def = 0) => (x === undefined || x === null ? def : math.isUnit(x) ? x.toNumber('rad') : Number(x));
const nn = (x, def) => (x === undefined || x === null ? def : toNum(x));
const D = 180 / PI;
function chk(cond, msg) { if (!cond) throw new Error(msg); }

// ---------- Rankine ----------
function KaRk(phi, beta) {
  chk(beta <= phi + 1e-12, 'Rankine: el talud β no puede superar a φ');
  const cb = cos(beta), r = sqrt(Math.max(0, cb * cb - cos(phi) ** 2));
  return cb * (cb - r) / (cb + r);
}
function KpRk(phi, beta) {
  chk(beta <= phi + 1e-12, 'Rankine: el talud β no puede superar a φ');
  const cb = cos(beta), r = sqrt(Math.max(0, cb * cb - cos(phi) ** 2));
  return cb * (cb + r) / (cb - r);
}
// ---------- Coulomb (Das, Principles of Foundation Engineering, ec. 7.26 y 7.62) ----------
function KaCl(phi, delta, beta, theta) {
  const a = sin(phi + delta) * sin(phi - beta), b = cos(delta + theta) * cos(theta - beta);
  chk(phi - beta >= -1e-12, 'Coulomb: el talud β no puede superar a φ');
  return cos(phi - theta) ** 2 / (cos(theta) ** 2 * cos(delta + theta) * (1 + sqrt(Math.max(0, a / b))) ** 2);
}
function KpCl(phi, delta, beta, theta) {
  const r = sqrt(sin(phi + delta) * sin(phi + beta) / (cos(delta - theta) * cos(beta - theta)));
  chk(r < 1, 'Coulomb pasivo: combinación φ, δ, β sin solución (δ demasiado alto)');
  return cos(phi + theta) ** 2 / (cos(theta) ** 2 * cos(delta - theta) * (1 - r) ** 2);
}
// ---------- Mononobe–Okabe (Kramer 1996, ec. 11.? ; AASHTO LRFD A11.3) ----------
function psiMO(kh, kv) { chk(kv < 1, 'kv debe ser menor que 1'); return atan(kh / (1 - kv)); }
function KaeM(phi, delta, kh, kv, beta, theta) {
  const psi = psiMO(kh, kv);
  chk(phi - beta - psi >= -1e-12, 'Mononobe–Okabe: φ − β − ψ < 0 (sismo demasiado intenso para el talud; no existe equilibrio)');
  const a = sin(phi + delta) * sin(phi - beta - psi), b = cos(delta + theta + psi) * cos(beta - theta);
  return cos(phi - theta - psi) ** 2 / (cos(psi) * cos(theta) ** 2 * cos(delta + theta + psi) * (1 + sqrt(Math.max(0, a / b))) ** 2);
}
function KpeM(phi, delta, kh, kv, beta, theta) {
  const psi = psiMO(kh, kv);
  chk(phi + beta - psi >= 0, 'Mononobe–Okabe pasivo: φ + β − ψ < 0');
  const r = sqrt(sin(phi + delta) * sin(phi + beta - psi) / (cos(delta - theta + psi) * cos(beta - theta)));
  chk(r < 1, 'Mononobe–Okabe pasivo: combinación sin solución (δ demasiado alto)');
  return cos(phi + theta - psi) ** 2 / (cos(psi) * cos(theta) ** 2 * cos(delta - theta + psi) * (1 - r) ** 2);
}
// ---------- Sobrecargas: Boussinesq modificado (muro rígido, factor 2) ----------
// Franja de ancho a, a una distancia b del muro, presión q; profundidad z (Das 7.? / Jarquio 1981)
function sigStrip(q, a, b, z) {
  if (z <= 0) return 0;
  const a1 = atan(b / z), a2 = atan((a + b) / z), be = a2 - a1, al = a1 + be / 2;
  return 2 * q / PI * (be - sin(be) * cos(2 * al));
}
function stripInt(q, a, b, H) {
  const n = 400; let P = 0, M = 0; // M = momento respecto a la base
  for (let i = 0; i <= n; i++) { const z = H * i / n, w = (i === 0 || i === n) ? 1 : (i % 2 ? 4 : 2); const s = sigStrip(q, a, b, z); P += w * s; M += w * s * (H - z); }
  P *= H / n / 3; M *= H / n / 3; return { P, y: P > 0 ? M / P : 0 };
}
// Terzaghi (1954) / NAVFAC DM-7.2: carga lineal y puntual paralelas al muro
function sigLine(QL, x, z, H) { const m = x / H, n = z / H; return m <= 0.4 ? 0.20 * QL / H * n * n / (0.16 + n * n) ** 2 : 1.28 * QL / H * m * m * n / (m * m + n * n) ** 2; }
function sigPoint(Q, x, z, H) { const m = x / H, n = z / H; return m <= 0.4 ? 0.28 * Q / (H * H) * n * n / (0.16 + n * n) ** 3 : 1.77 * Q / (H * H) * m * m * n * n / (m * m + n * n) ** 3; }
// ---------- Bisección genérica ----------
function bisect(f, lo, hi, msg) {
  let flo = f(lo), fhi = f(hi), k = 0;
  while (flo * fhi > 0 && k++ < 60) { hi *= 2; fhi = f(hi); }
  chk(flo * fhi <= 0, msg);
  for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2, fm = f(m); if (flo * fm <= 0) { hi = m; fhi = fm; } else { lo = m; flo = fm; } if (hi - lo < 1e-10) break; }
  return (lo + hi) / 2;
}
const L = (x) => toNum(x, 'm'), G = (x) => toNum(x, 'tonf/m^3'), Q = (x) => (x === undefined ? 0 : toNum(x, 'tonf/m^2'));

defineFns({
  // ----------------------------- Reposo -----------------------------
  K0Jaky: { fn: (phi, OCR) => (1 - sin(ang(phi))) * nn(OCR, 1) ** sin(ang(phi)), tex: 'K_0', args: 'φ, OCR=1', desc: 'K0 = (1 − sen φ)·OCR^sen φ (Jaky 1944; Mayne y Kulhawy 1982)' },
  K0Talud: { fn: (phi, beta, OCR) => (1 - sin(ang(phi))) * nn(OCR, 1) ** sin(ang(phi)) * (1 + sin(ang(beta))), tex: 'K_{0\\beta}', args: 'φ, β, OCR=1', desc: 'K0 con relleno inclinado: K0·(1 + sen β) (Kézdi; AASHTO 3.11.5.2 com.)' },
  // ----------------------------- Rankine -----------------------------
  KaRankine: { fn: (phi, beta) => KaRk(ang(phi), ang(beta)), tex: 'K_a', args: 'φ, β=0', desc: 'Ka de Rankine con talud β (empuje paralelo al talud, por altura vertical)' },
  KpRankine: { fn: (phi, beta) => KpRk(ang(phi), ang(beta)), tex: 'K_p', args: 'φ, β=0', desc: 'Kp de Rankine con talud β' },
  zcRankine: { fn: (c, gamma, phi) => mkUnit(2 * toNum(c, 'tonf/m^2') / (G(gamma) * sqrt(KaRk(ang(phi), 0))), 'm'), tex: 'z_c', args: 'c, γ, φ', desc: 'Profundidad de grietas de tracción 2c/(γ√Ka)' },
  // ----------------------------- Coulomb -----------------------------
  KaCoulomb: { fn: (phi, delta, beta, theta) => KaCl(ang(phi), ang(delta), ang(beta), ang(theta)), tex: 'K_a', args: 'φ, δ, β=0, θ=0', desc: 'Ka de Coulomb (θ: trasdós respecto a la vertical, + si el relleno apoya sobre él)' },
  KpCoulomb: { fn: (phi, delta, beta, theta) => KpCl(ang(phi), ang(delta), ang(beta), ang(theta)), tex: 'K_p', args: 'φ, δ, β=0, θ=0', desc: 'Kp de Coulomb (sobrestima Kp si δ > φ/2)' },
  // ----------------------------- Sismo -----------------------------
  psiMO: { fn: (kh, kv) => mkUnit(psiMO(nn(kh, 0), nn(kv, 0)) * D, 'deg'), tex: '\\psi', args: 'kh, kv=0', desc: 'Ángulo sísmico ψ = atan(kh/(1 − kv))' },
  KaeMO: { fn: (phi, delta, kh, kv, beta, theta) => KaeM(ang(phi), ang(delta), nn(kh, 0), nn(kv, 0), ang(beta), ang(theta)), tex: 'K_{ae}', args: 'φ, δ, kh, kv=0, β=0, θ=0', desc: 'Kae de Mononobe–Okabe (Pae = ½γH²(1 − kv)Kae)' },
  KpeMO: { fn: (phi, delta, kh, kv, beta, theta) => KpeM(ang(phi), ang(delta), nn(kh, 0), nn(kv, 0), ang(beta), ang(theta)), tex: 'K_{pe}', args: 'φ, δ, kh, kv=0, β=0, θ=0', desc: 'Kpe de Mononobe–Okabe (pasivo sísmico)' },
  DKaeSW: { fn: (kh) => 0.75 * nn(kh, 0), tex: '\\Delta K_{ae}', args: 'kh', desc: 'Incremento dinámico Seed–Whitman (1970): ΔKae ≈ ¾ kh (aplicado a 0.6H)' },
  DPaeSW: { fn: (kh, gamma, H) => mkUnit(3 / 8 * nn(kh, 0) * G(gamma) * L(H) ** 2, 'tonf/m'), tex: '\\Delta P_{ae}', args: 'kh, γ, H', desc: 'ΔPae = 3/8·kh·γ·H² (Seed–Whitman), aplicado a 0.6H' },
  khWall: { fn: (PGA, despl) => nn(PGA, 0) * (nn(despl, 1) ? 0.5 : 1), tex: 'k_h', args: 'PGA, desplaza=1', desc: 'kh = 0.5·PGA si el muro admite 25–50 mm (AASHTO 11.6.5.2.2); kh = PGA si es rígido' },
  // ----------------------------- Sobrecargas -----------------------------
  sigmaHstrip: { fn: (q, a, b, z) => mkUnit(sigStrip(Q(q), L(a), L(b), L(z)), 'tonf/m^2'), tex: '\\sigma_h', args: 'q, a, b, z', desc: 'Presión lateral de franja (Boussinesq ×2): (2q/π)(β − sen β cos 2α)' },
  PStrip: { fn: (q, a, b, H) => mkUnit(stripInt(Q(q), L(a), L(b), L(H)).P, 'tonf/m'), tex: 'P_{q}', args: 'q, a, b, H', desc: 'Empuje total de una franja (integración; equivale a Jarquio 1981)' },
  yStrip: { fn: (q, a, b, H) => mkUnit(stripInt(Q(q), L(a), L(b), L(H)).y, 'm'), tex: '\\bar y_{q}', args: 'q, a, b, H', desc: 'Altura del empuje de franja sobre la base del muro' },
  sigmaHline: { fn: (QL, x, z, H) => mkUnit(sigLine(toNum(QL, 'tonf/m'), L(x), L(z), L(H)), 'tonf/m^2'), tex: '\\sigma_h', args: 'QL, x, z, H', desc: 'Carga lineal paralela al muro (Terzaghi / NAVFAC DM-7.2)' },
  PLine: { fn: (QL, x, H) => { const m = L(x) / L(H), q = toNum(QL, 'tonf/m'); return mkUnit(m <= 0.4 ? 0.55 * q : 0.64 * q / (m * m + 1), 'tonf/m'); }, tex: 'P_{L}', args: 'QL, x, H', desc: 'Empuje total de carga lineal (NAVFAC DM-7.2)' },
  sigmaHpoint: { fn: (Qp, x, z, H) => mkUnit(sigPoint(toNum(Qp, 'tonf'), L(x), L(z), L(H)), 'tonf/m^2'), tex: '\\sigma_h', args: 'Q, x, z, H', desc: 'Carga puntual frente a la carga (Terzaghi / NAVFAC DM-7.2)' },
  PwHidro: { fn: (h, gw) => mkUnit(0.5 * (gw === undefined ? 1 : G(gw)) * L(h) ** 2, 'tonf/m'), tex: 'P_w', args: 'hw, γw=1 t/m³', desc: 'Empuje hidrostático ½γw·hw²' },
  // ----------------------------- Seguridad -----------------------------
  FSminE050: { fn: (sismo) => (nn(sismo, 0) ? 1.25 : 1.5), tex: 'FS_{min}', args: 'sismo (0|1)', desc: 'FS mínimo al volteo y deslizamiento: 1.50 estático, 1.25 pseudo-dinámico (E.050 39.13.6)' },
  qaSismoE050: { fn: (qa) => math.multiply(qa, 3 / 2.5), tex: 'q_{a,s}', args: 'qa', desc: 'Presión admisible sísmica: FS 2.5 en vez de 3.0 (E.050 Art. 21) → 1.20·qa' },
  muBase: { fn: (phi, k) => tan(nn(k, 2 / 3) * ang(phi)), tex: '\\mu', args: 'φ, k=2/3', desc: 'Coeficiente de fricción en la base tan(k·φ) (Das: k = 1/2 a 2/3)' },
  // ----------------------------- Tablestacas -----------------------------
  D0Blum: { fn: (H, gamma, Ka, Kp, q) => { const h = L(H), g = G(gamma), ka = nn(Ka), kp = nn(Kp), s = Q(q);
    return mkUnit(bisect(D0 => kp * g * D0 ** 3 / 6 - ka * g * (h + D0) ** 3 / 6 - ka * s * (h + D0) ** 2 / 2, 1e-6, 5 * h + 1, 'Blum: sin solución (Kp ≤ Ka)'), 'm'); },
    tex: 'D_0', args: 'H, γ, Ka, Kp, q=0', desc: 'Tablestaca en voladizo (Blum simplificado): ΣM = 0 respecto al punto de giro; D = 1.2·D0' },
  DFreeEarth: { fn: (H, a, gamma, Ka, Kp, q) => { const h = L(H), ya = L(a), g = G(gamma), ka = nn(Ka), kp = nn(Kp), s = Q(q);
    const f = (Dd) => { const T = h + Dd; return kp * g * Dd * Dd / 2 * (h + 2 * Dd / 3 - ya) - ka * g * T * T / 2 * (2 * T / 3 - ya) - ka * s * T * (T / 2 - ya); };
    return mkUnit(bisect(f, 1e-6, 5 * h + 1, 'Apoyo libre: sin solución'), 'm'); },
    tex: 'D', args: 'H, a, γ, Ka, Kp, q=0', desc: 'Tablestaca anclada, apoyo libre (free earth support): ΣM = 0 respecto al anclaje a la prof. a' },
  // ----------------------------- Suelo reforzado (AASHTO 11.10) -----------------------------
  KrKaAASHTO: { fn: (z, tipo) => { const t = nn(tipo, 3), zz = L(z); if (t >= 3) return 1; const k0 = t === 1 ? 1.7 : 2.5; return interp1(zz, [0, 6], [k0, 1.2]); },
    tex: 'K_r/K_a', args: 'z, tipo', desc: 'Kr/Ka (AASHTO Fig. 11.10.6.2.1-3): tipo 1 tiras metálicas, 2 mallas metálicas, 3 geomallas, 4 geotextiles' },
  FstarAASHTO: { fn: (z, phi, tipo, Cu) => { const t = nn(tipo, 3), zz = L(z), tp = tan(ang(phi));
    if (t === 1) { const f0 = Math.min(2, 1.2 + log10(nn(Cu, 4))); return interp1(zz, [0, 6], [Math.max(f0, tp), tp]); }
    if (t === 2) throw new Error('F* de mallas metálicas depende de t/St (AASHTO 11.10.6.3.2): ingréselo directamente');
    return 0.67 * tp; },
    tex: 'F^{*}', args: 'z, φ, tipo, Cu=4', desc: 'Factor de arranque F* (AASHTO 11.10.6.3.2): tiras 1.2 + log Cu → tan φ a 6 m; geosintéticos 0.67 tan φ' },
  alphaAASHTO: { fn: (tipo) => [1, 1, 1, 0.8, 0.6][nn(tipo, 3)] ?? 0.8, tex: '\\alpha', args: 'tipo', desc: 'Factor de corrección de escala α (AASHTO Tabla 11.10.6.3.2-1)' },
}, 'Empujes de tierra');
