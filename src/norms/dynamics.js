// =====================================================================
//  Funciones normativas y núcleo numérico — módulo «dynamics»
//  (dinámica estructural y análisis sísmico, estilo OpenSees / SeismoSignal)
//
//  Núcleo en JS puro (Float64Array y bucles; unidades SI: m, s, kg, N):
//   pwExact      1 GDL lineal, método exacto por tramos lineales (Nigam-Jennings 1968; Chopra §5.2)
//   newmarkLin   1 GDL lineal, Newmark-β (γ = 1/2; β = 1/4 promedio, 1/6 lineal; Chopra Tabla 5.4.2)
//   newmarkNL    1 GDL bilineal (endurecimiento cinemático), Newmark + Newton-Raphson (Chopra Tabla 5.7.1)
//   spectrumNJ   espectro de respuesta D, V, A, SA (Nigam-Jennings, con vibración libre posterior)
//   shearModes   autovalores de edificio de cortante (Jacobi sobre M^-1/2 K M^-1/2)
//   pushoverShear, n2Method, atc40CSM, fema440ELM, coefMethod   (Fajfar 2000/EC8 Anexo B, ATC-40 §8.2.2,
//                FEMA 440 §6, ASCE 41-17 §7.4.3)
//   mander*, hognestad, steel*, momentCurvature   (Mander-Priestley-Park 1988; Hognestad 1951; Park-Paulay 1975)
//   simqke       acelerograma sintético compatible con un espectro (Gasparini-Vanmarcke 1976)
//  Ver docs/referencias/dynamics.md y docs/referencias/investigacion/algoritmos.md
// =====================================================================
import { defineFns, math, toNum, mkUnit } from '../engine.js';
import { ELCENTRO, decodeRecord } from '../data/elcentro.js';

export const G = 9.80665;
const PI2 = 2 * Math.PI;

// ---------------------------------------------------------------------
//  1 GDL lineal: método exacto por tramos (Nigam-Jennings) — masa unitaria
//  ag en m/s²; devuelve u (m), v (m/s), at (aceleración absoluta, m/s²)
// ---------------------------------------------------------------------
export function njCoefs(w, z, dt) {
  const sq = Math.sqrt(1 - z * z), wd = w * sq, E = Math.exp(-z * w * dt), S = Math.sin(wd * dt), Cs = Math.cos(wd * dt), k = w * w;
  return {
    A: E * (z / sq * S + Cs), B: E * S / wd,
    C: (2 * z / (w * dt) + E * (((1 - 2 * z * z) / (wd * dt) - z / sq) * S - (1 + 2 * z / (w * dt)) * Cs)) / k,
    D: (1 - 2 * z / (w * dt) + E * ((2 * z * z - 1) / (wd * dt) * S + 2 * z / (w * dt) * Cs)) / k,
    Ap: -E * w / sq * S, Bp: E * (Cs - z / sq * S),
    Cp: (-1 / dt + E * ((w / sq + z / (dt * sq)) * S + Cs / dt)) / k,
    Dp: (1 - E * (z / sq * S + Cs)) / (k * dt),
  };
}
export function pwExact(ag, dt, w, z) {
  const n = ag.length, u = new Float64Array(n), v = new Float64Array(n), at = new Float64Array(n);
  const c = njCoefs(w, z, dt);
  let uu = 0, vv = 0;
  for (let i = 0; i < n - 1; i++) {
    const p0 = -ag[i], p1 = -ag[i + 1];
    const un = c.A * uu + c.B * vv + c.C * p0 + c.D * p1;
    vv = c.Ap * uu + c.Bp * vv + c.Cp * p0 + c.Dp * p1; uu = un;
    u[i + 1] = uu; v[i + 1] = vv; at[i + 1] = -(2 * z * w * vv + w * w * uu);
  }
  return { u, v, at, coef: c };
}
// subdivisión del paso (interpolación lineal de üg) cuando Δt > T/nmin
function subdiv(ag, dt, T, nmin) {
  const ns = Math.max(1, Math.ceil(dt * nmin / T));
  if (ns === 1) return { a: ag, h: dt, ns };
  const n = ag.length, a = new Float64Array((n - 1) * ns + 1);
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < ns; j++) a[i * ns + j] = ag[i] + (ag[i + 1] - ag[i]) * j / ns;
  a[(n - 1) * ns] = ag[n - 1];
  return { a, h: dt / ns, ns };
}
// Newmark-β lineal (masa unitaria, k = ω², c = 2ζω)
export function newmarkLin(ag, dt, w, z, beta = 0.25, gamma = 0.5) {
  const T = PI2 / w, sd = subdiv(ag, dt, T, 20), a0 = sd.a, h = sd.h, N = a0.length;
  const k = w * w, c = 2 * z * w;
  const a1 = 1 / (beta * h * h) + gamma * c / (beta * h), a2 = 1 / (beta * h) + (gamma / beta - 1) * c, a3 = (1 / (2 * beta) - 1) + h * (gamma / (2 * beta) - 1) * c;
  const kh = k + a1;
  const n = ag.length, u = new Float64Array(n), v = new Float64Array(n), at = new Float64Array(n);
  let uu = 0, vv = 0, aa = -a0[0], upk = 0;
  for (let i = 0; i < N - 1; i++) {
    const ph = -a0[i + 1] + a1 * uu + a2 * vv + a3 * aa;
    const un = ph / kh; if (Math.abs(un) > upk) upk = Math.abs(un);
    const vn = gamma / (beta * h) * (un - uu) + (1 - gamma / beta) * vv + h * (1 - gamma / (2 * beta)) * aa;
    const an = (un - uu) / (beta * h * h) - vv / (beta * h) - (1 / (2 * beta) - 1) * aa;
    uu = un; vv = vn; aa = an;
    if ((i + 1) % sd.ns === 0) { const j = (i + 1) / sd.ns; u[j] = uu; v[j] = vv; at[j] = aa + a0[i + 1]; }
  }
  return { u, v, at, a1, kh, ns: sd.ns, upk };
}
// Newmark-β genérico (Chopra Tabla 5.4.2) con m, c, k y carga p arbitraria — para pruebas
export function newmarkP({ m, c, k, p, dt, gamma = 0.5, beta = 0.25 }) {
  const n = p.length, u = new Float64Array(n), v = new Float64Array(n), a = new Float64Array(n);
  a[0] = p[0] / m;
  const a1 = m / (beta * dt * dt) + gamma * c / (beta * dt), a2 = m / (beta * dt) + (gamma / beta - 1) * c, a3 = (1 / (2 * beta) - 1) * m + dt * (gamma / (2 * beta) - 1) * c;
  for (let i = 0; i < n - 1; i++) {
    u[i + 1] = (p[i + 1] + a1 * u[i] + a2 * v[i] + a3 * a[i]) / (k + a1);
    v[i + 1] = gamma / (beta * dt) * (u[i + 1] - u[i]) + (1 - gamma / beta) * v[i] + dt * (1 - gamma / (2 * beta)) * a[i];
    a[i + 1] = (u[i + 1] - u[i]) / (beta * dt * dt) - v[i] / (beta * dt) - (1 / (2 * beta) - 1) * a[i];
  }
  return { u, v, a };
}
// Resorte bilineal con endurecimiento cinemático (Steel01 sin transición; α = 0 → elastoplástico)
export function bilinearSpring(k, fy, alpha) {
  const s = { uc: 0, fc: 0, f: 0, kt: k };
  s.trial = (u) => {
    const ftr = s.fc + k * (u - s.uc), fup = alpha * k * u + (1 - alpha) * fy, flo = alpha * k * u - (1 - alpha) * fy;
    if (ftr > fup) { s.f = fup; s.kt = alpha * k; } else if (ftr < flo) { s.f = flo; s.kt = alpha * k; } else { s.f = ftr; s.kt = k; }
    return s.f;
  };
  s.commit = (u) => { s.trial(u); s.uc = u; s.fc = s.f; };
  return s;
}
// Newmark no lineal con Newton-Raphson, carga p arbitraria (Chopra Tabla 5.7.1) — para pruebas
export function newmarkNLP({ m, c, k, fy, alpha = 0, p, dt, gamma = 0.5, beta = 0.25 }) {
  const n = p.length, u = new Float64Array(n), v = new Float64Array(n), a = new Float64Array(n), fs = new Float64Array(n);
  const sp = bilinearSpring(k, fy, alpha);
  a[0] = p[0] / m;
  const a1 = m / (beta * dt * dt) + gamma * c / (beta * dt), a2 = m / (beta * dt) + (gamma / beta - 1) * c, a3 = (1 / (2 * beta) - 1) * m + dt * (gamma / (2 * beta) - 1) * c;
  for (let i = 0; i < n - 1; i++) {
    const ph = p[i + 1] + a1 * u[i] + a2 * v[i] + a3 * a[i];
    let uj = u[i];
    for (let it = 0; it < 50; it++) { const R = ph - sp.trial(uj) - a1 * uj; if (Math.abs(R) < 1e-10 * (fy + 1)) break; uj += R / (sp.kt + a1); }
    sp.commit(uj); u[i + 1] = uj; fs[i + 1] = sp.f;
    v[i + 1] = gamma / (beta * dt) * (u[i + 1] - u[i]) + (1 - gamma / beta) * v[i] + dt * (1 - gamma / (2 * beta)) * a[i];
    a[i + 1] = (u[i + 1] - u[i]) / (beta * dt * dt) - v[i] / (beta * dt) - (1 / (2 * beta) - 1) * a[i];
  }
  return { u, v, a, fs };
}
// 1 GDL bilineal bajo sismo (masa unitaria): fy = resistencia por unidad de masa (m/s²)
export function newmarkNL(ag, dt, w, z, fy, alpha = 0, beta = 0.25, gamma = 0.5) {
  const T = PI2 / w, sd = subdiv(ag, dt, T, 40), a0 = sd.a, h = sd.h, N = a0.length;
  const k = w * w, c = 2 * z * w, sp = bilinearSpring(k, fy, alpha);
  const a1 = 1 / (beta * h * h) + gamma * c / (beta * h), a2 = 1 / (beta * h) + (gamma / beta - 1) * c, a3 = (1 / (2 * beta) - 1) + h * (gamma / (2 * beta) - 1) * c;
  const n = ag.length, u = new Float64Array(n), v = new Float64Array(n), at = new Float64Array(n), fs = new Float64Array(n);
  let uu = 0, vv = 0, aa = -a0[0], itMax = 0, Eh = 0, fprev = 0, upk = 0, nfail = 0;
  for (let i = 0; i < N - 1; i++) {
    const ph = -a0[i + 1] + a1 * uu + a2 * vv + a3 * aa;
    let uj = uu, it = 0, conv = false;
    for (; it < 60; it++) { const R = ph - sp.trial(uj) - a1 * uj; if (Math.abs(R) < 1e-11 * fy) { conv = true; break; } uj += R / (sp.kt + a1); }
    itMax = Math.max(itMax, it); if (!conv) nfail++;
    if (Math.abs(uj) > upk) upk = Math.abs(uj);
    sp.commit(uj);
    const vn = gamma / (beta * h) * (uj - uu) + (1 - gamma / beta) * vv + h * (1 - gamma / (2 * beta)) * aa;
    const an = (uj - uu) / (beta * h * h) - vv / (beta * h) - (1 / (2 * beta) - 1) * aa;
    Eh += (sp.f + fprev) / 2 * (uj - uu); fprev = sp.f;
    uu = uj; vv = vn; aa = an;
    if ((i + 1) % sd.ns === 0) { const j = (i + 1) / sd.ns; u[j] = uu; v[j] = vv; at[j] = aa + a0[i + 1]; fs[j] = sp.f; }
  }
  return { u, v, at, fs, itMax, ns: sd.ns, Es: Eh, upk, nfail };
}
// ---------------------------------------------------------------------
//  Espectro de respuesta (Nigam-Jennings) — ag en m/s²
//  devuelve, por periodo: D (m), PSV = ωD, PSA = ω²D, SA (abs.), SV (vel. relativa)
// ---------------------------------------------------------------------
export function spectrumNJ(ag, dt, periods, z) {
  const out = [];
  const n = ag.length;
  for (const T of periods) {
    const w = PI2 / T, c = njCoefs(w, z, dt), w2 = w * w, zw2 = 2 * z * w;
    const npad = Math.ceil(T / dt) + 2;
    let u = 0, v = 0, umax = 0, amax = 0, vmax = 0, tD = 0;
    for (let i = 0; i < n - 1 + npad; i++) {
      const p0 = i < n ? -ag[i] : 0, p1 = i + 1 < n ? -ag[i + 1] : 0;
      const un = c.A * u + c.B * v + c.C * p0 + c.D * p1; v = c.Ap * u + c.Bp * v + c.Cp * p0 + c.Dp * p1; u = un;
      const au = Math.abs(u); if (au > umax) { umax = au; tD = (i + 1) * dt; }
      const av = Math.abs(v); if (av > vmax) vmax = av;
      const aa = Math.abs(zw2 * v + w2 * u); if (aa > amax) amax = aa;
    }
    out.push({ T, D: umax, PSV: w * umax, PSA: w2 * umax, SA: amax, SV: vmax, tD });
  }
  return out;
}
export function logPeriods(T0, T1, n, extra = []) {
  const a = Array.from({ length: n }, (_, i) => T0 * Math.pow(T1 / T0, i / (n - 1)));
  for (const x of extra) if (x > 0) a.push(x);
  return [...new Set(a.map(x => +x.toPrecision(10)))].sort((p, q) => p - q);
}
// Parámetros del registro (SeismoSignal): PGA, PGV, Arias, D5-95
export function recordParams(ag, dt) {
  let pga = 0, tpga = 0, v = 0, pgv = 0, ia = 0;
  const cum = new Float64Array(ag.length);
  for (let i = 0; i < ag.length; i++) {
    const a = Math.abs(ag[i]); if (a > pga) { pga = a; tpga = i * dt; }
    if (i) { v += (ag[i] + ag[i - 1]) / 2 * dt; ia += (ag[i] * ag[i] + ag[i - 1] * ag[i - 1]) / 2 * dt; }
    cum[i] = ia; pgv = Math.max(pgv, Math.abs(v));
  }
  const Ia = Math.PI / (2 * G) * ia;
  const t5 = cum.findIndex(x => x >= 0.05 * ia) * dt, t95 = cum.findIndex(x => x >= 0.95 * ia) * dt;
  return { pga, tpga, pgv, Ia, t5, t95, D595: t95 - t5, dur: (ag.length - 1) * dt };
}

// ---------------------------------------------------------------------
//  Autovalores — Jacobi clásico
// ---------------------------------------------------------------------
export function jacobi(A0) {
  const n = A0.length, A = A0.map(r => r.slice()), V = A0.map((r, i) => r.map((_, j) => +(i === j)));
  for (let sw = 0; sw < 100; sw++) {
    let off = 0, dg = 0; for (let p = 0; p < n; p++) { dg += A[p][p] ** 2; for (let q = p + 1; q < n; q++) off += A[p][q] ** 2; }
    if (off <= 1e-26 * dg) break;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
      if (Math.abs(A[p][q]) < 1e-300) continue;
      const th = (A[q][q] - A[p][p]) / (2 * A[p][q]);
      const t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1)), c = 1 / Math.sqrt(t * t + 1), s = t * c;
      for (let k = 0; k < n; k++) { const x = A[k][p], y = A[k][q]; A[k][p] = c * x - s * y; A[k][q] = s * x + c * y; }
      for (let k = 0; k < n; k++) { const x = A[p][k], y = A[q][k]; A[p][k] = c * x - s * y; A[q][k] = s * x + c * y; }
      for (let k = 0; k < n; k++) { const x = V[k][p], y = V[k][q]; V[k][p] = c * x - s * y; V[k][q] = s * x + c * y; }
    }
  }
  const vals = A.map((r, i) => r[i]), idx = vals.map((_, i) => i).sort((a, b) => vals[a] - vals[b]);
  return { vals: idx.map(i => vals[i]), vecs: idx.map(i => V.map(r => r[i])) };
}
// Edificio de cortante: m (kg), k (N/m) por entrepiso 1 → n. Modos normalizados φ_techo = 1
export function shearK(k) {
  const n = k.length, K = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) { K[i][i] += k[i]; if (i + 1 < n) { K[i][i] += k[i + 1]; K[i][i + 1] -= k[i + 1]; K[i + 1][i] -= k[i + 1]; } }
  return K;
}
export function shearModes(m, k) {
  const n = m.length, K = shearK(k), s = m.map(x => 1 / Math.sqrt(x));
  const { vals, vecs } = jacobi(K.map((r, i) => r.map((v, j) => v * s[i] * s[j])));
  if (vals.some(v => !(v > 0))) throw new Error('La matriz de rigidez no es definida positiva (revise las rigideces)');
  const Mt = m.reduce((a, b) => a + b, 0);
  return vals.map((lam, r) => {
    let phi = vecs[r].map((v, i) => v * s[i]); const top = phi[n - 1] || 1; phi = phi.map(x => x / top);
    const L = phi.reduce((a, p, i) => a + p * m[i], 0), Mn = phi.reduce((a, p, i) => a + p * p * m[i], 0);
    const w = Math.sqrt(lam);
    return { w, T: PI2 / w, phi, L, Mn, Gam: L / Mn, Meff: L * L / Mn, ratio: L * L / Mn / Mt };
  });
}
// CQC (Der Kiureghian 1981) con amortiguamientos distintos
export function rhoCQCw(wi, wj, zi, zj) {
  const b = wj / wi;
  return 8 * Math.sqrt(zi * zj) * (zi + b * zj) * b ** 1.5 / ((1 - b * b) ** 2 + 4 * zi * zj * b * (1 + b * b) + 4 * (zi * zi + zj * zj) * b * b);
}
export function combCQC(r, w, z) {
  let s = 0; for (let i = 0; i < r.length; i++) for (let j = 0; j < r.length; j++) s += r[i] * r[j] * rhoCQCw(w[i], w[j], z[i], z[j]);
  return Math.sqrt(Math.max(s, 0));
}
export const combSRSS = (r) => Math.sqrt(r.reduce((a, x) => a + x * x, 0));
export function rayleighCoef(Ti, Tj, zi, zj = zi) {
  const wi = PI2 / Ti, wj = PI2 / Tj;
  // ζi = a0/(2ωi) + a1 ωi/2 ; ζj = ...  (solución general)
  const det = (1 / (2 * wi)) * (wj / 2) - (1 / (2 * wj)) * (wi / 2);
  const a0 = (zi * wj / 2 - zj * wi / 2) / det, a1 = (zj / (2 * wi) - zi / (2 * wj)) / det;
  return { a0, a1 };
}

// ---------------------------------------------------------------------
//  Pushover de edificio de cortante con resortes de entrepiso bi/trilineales
//  m (kg), k (N/m), Vy (N), h (m); patrón 'modal' | 'triangular' | 'uniforme'
// ---------------------------------------------------------------------
export function storyDrift(V, st) {
  const { k, Vy, a, fcr, r2 } = st;
  if (fcr > 0 && fcr < 1) {
    const Vc = fcr * Vy, dc = Vc / k, dy = dc + (Vy - Vc) / (r2 * k);
    if (V <= Vc) return V / k; if (V <= Vy) return dc + (V - Vc) / (r2 * k); return dy + (V - Vy) / (a * k);
  }
  return V <= Vy ? V / k : Vy / k + (V - Vy) / (a * k);
}
// Opciones: pdelta (θi = Pi/hi con Pi = g·Σ_{j≥i} mj·fP), cap = { dr: deriva de inicio de la degradación (δc/h),
// ac: pendiente negativa −ac·k, res: resistencia residual/Vy }. Sin P-Δ ni degradación la curva es exacta (control
// de fuerzas invertido por bisección); con ellos se usa control de desplazamiento incremental con Newton-Raphson
// (equilibrio de entrepisos en serie + restricción Σδi = d), descarga elástica de los entrepisos que no localizan.
export function pushoverShear({ m, k, Vy, h, alpha, pattern = 'modal', fcr = 0, r2 = 0.5, druEnd = 0.05, npts = 160, pdelta = false, fP = 1, cap = null }) {
  const n = m.length;
  const al = (Array.isArray(alpha) ? alpha : m.map(() => alpha)).map(a => Math.max(a, 1e-5));
  const theta = m.map((_, i) => (pdelta ? G * fP * m.slice(i).reduce((a, b) => a + b, 0) / h[i] : 0));
  const kE = k.map((x, i) => x - theta[i]);
  if (kE.some(x => !(x > 0))) { const i = kE.findIndex(x => !(x > 0)); const e = new Error(`Inestabilidad elástica por P-Δ en el entrepiso ${i + 1}: P/h = ${theta[i].toExponential(3)} ≥ k`); e.unstable = i; throw e; }
  const modes = shearModes(m, kE);
  const H = []; h.reduce((s, x, i) => (H[i] = s + x), 0);
  let s;
  if (pattern === 'uniforme') s = m.slice();
  else if (pattern === 'triangular') s = m.map((x, i) => x * H[i]);
  else s = m.map((x, i) => x * modes[0].phi[i]);
  // forma de desplazamientos asociada Φ = s/m (φ_techo = 1) — Fajfar (2000)
  const Phi0 = s.map((x, i) => x / m[i]), Phi = Phi0.map(x => x / Phi0[n - 1]);
  const sumS = s.reduce((a, b) => a + b, 0);
  const Sx = s.map((_, i) => s.slice(i).reduce((a, b) => a + b, 0) / sumS);      // V_i / V_b
  const st = m.map((_, i) => ({ k: k[i], Vy: Vy[i], a: al[i], fcr, r2 }));
  const mstar0 = m.reduce((a, x, i) => a + x * Phi[i], 0), Gam0 = mstar0 / m.reduce((a, x, i) => a + x * Phi[i] ** 2, 0), Mt0 = m.reduce((a, b) => a + b, 0);
  if (pdelta || (cap && cap.dr > 0)) {
    const r = pushoverIncr({ st, theta, Sx, h, druEnd, cap });
    return { modes, Phi, s, Sx, H, ...r, mstar: mstar0, Gam: Gam0, Mt: Mt0, alpha1: mstar0 * Gam0 / Mt0, theta, pdelta, incremental: true };
  }
  const drifts = (Vb) => Sx.map((x, i) => storyDrift(Vb * x, st[i]));
  const roof = (Vb) => drifts(Vb).reduce((a, b) => a + b, 0);
  const VbAt = (d) => { let lo = 0, hi = Math.max(...Vy.map((v, i) => v / Sx[i])); while (roof(hi) < d) hi *= 1.5; for (let it = 0; it < 70; it++) { const mid = (lo + hi) / 2; if (roof(mid) < d) lo = mid; else hi = mid; } return (lo + hi) / 2; };
  // eventos de fluencia (y fisuración) por entrepiso
  const ev = [];
  Vy.forEach((v, i) => { const Vb = v / Sx[i]; ev.push({ i, tipo: 'fluencia', Vb, d: roof(Vb) }); if (fcr > 0 && fcr < 1) { const Vc = fcr * v / Sx[i]; ev.push({ i, tipo: 'fisuración', Vb: Vc, d: roof(Vc) }); } });
  ev.sort((a, b) => a.Vb - b.Vb);
  // fin de la curva: primera deriva de entrepiso igual a druEnd
  const VbEnd = (() => { let lo = 0, hi = Math.max(...Vy.map((v, i) => v / Sx[i])); const f = (Vb) => Math.max(...drifts(Vb).map((d, i) => d / h[i])); while (f(hi) < druEnd) hi *= 1.5; for (let it = 0; it < 70; it++) { const mid = (lo + hi) / 2; if (f(mid) < druEnd) lo = mid; else hi = mid; } return lo; })();
  const dEnd = roof(VbEnd);
  // malla de desplazamientos: densa al inicio, con los eventos incluidos
  const ds = new Set();
  for (let j = 0; j <= npts; j++) ds.add(dEnd * (j / npts) ** 1.3);
  ev.forEach(e => { if (e.d < dEnd) ds.add(e.d); });
  const dl = [...ds].sort((a, b) => a - b);
  const curve = dl.map(d => { const Vb = d === 0 ? 0 : VbAt(d); return { d, Vb }; });
  const mstar = m.reduce((a, x, i) => a + x * Phi[i], 0), Gam = mstar / m.reduce((a, x, i) => a + x * Phi[i] ** 2, 0);
  const Mt = m.reduce((a, b) => a + b, 0);
  const stateAt = (d) => { const Vb = VbAt(Math.min(d, dEnd)); return { Vb, dr: drifts(Vb) }; };
  curve.forEach(q => { q.dr = q.d === 0 ? Sx.map(() => 0) : drifts(q.Vb); });
  return { modes, Phi, s, Sx, H, curve, ev, dEnd, VbEnd, mstar, Gam, Mt, drifts, roof, VbAt, stateAt, alpha1: mstar * Gam / Mt, theta, pdelta: false, endBy: 'deriva', Vbmax: VbEnd };
}
// envolvente de entrepiso (fuerza resistente del resorte, sin P-Δ) y su tangente; descarga con k
export function storyBackbone(st, cap, hgt) {
  const { k, Vy, a, fcr, r2 } = st;
  const tri = fcr > 0 && fcr < 1, Vc = tri ? fcr * Vy : Vy, dc = Vc / k, dy = tri ? dc + (Vy - Vc) / (r2 * k) : Vy / k;
  const pre = (d) => (d <= dc ? [k * d, k] : d <= dy ? [Vc + r2 * k * (d - dc), r2 * k] : [Vy + a * k * (d - dy), a * k]);
  const dcap = cap && cap.dr > 0 ? Math.max(cap.dr * hgt, dy) : Infinity, Fc = isFinite(dcap) ? pre(dcap)[0] : 0;
  const ac = cap ? Math.max(cap.ac ?? 0.1, 1e-4) : 0, Fr = cap ? Math.max(cap.res ?? 0, 0) * Vy : 0;
  const dres = isFinite(dcap) ? dcap + Math.max(Fc - Fr, 0) / (ac * k) : Infinity;
  const f = (d) => { if (d <= dcap) return pre(d); if (d <= dres) return [Fc - ac * k * (d - dcap), -ac * k]; return [Fr, 0]; };
  return { f, dy, dc, dcap, dres, Fc, Fr };
}
function pushoverIncr({ st, theta, Sx, h, druEnd, cap }) {
  const n = st.length, bb = st.map((x, i) => storyBackbone(x, cap, h[i]));
  const del = new Float64Array(n), dmx = new Float64Array(n);
  let lam = 0;
  const trial = (i, d) => {
    if (d >= dmx[i] - 1e-15) { const [F, kt] = bb[i].f(d); return [F, kt]; }
    const Fm = bb[i].f(dmx[i])[0]; return [Fm - st[i].k * (dmx[i] - d), st[i].k];
  };
  const solve = (dTarget) => {
    const dl = Float64Array.from(del); let lm = lam;
    for (let it = 0; it < 60; it++) {
      const R = new Float64Array(n), kt = new Float64Array(n); let g = -dTarget, nr = 0;
      for (let i = 0; i < n; i++) { const [F, t] = trial(i, dl[i]); R[i] = F - theta[i] * dl[i] - lm * Sx[i]; let kk = t - theta[i]; if (Math.abs(kk) < 1e-7 * st[i].k) kk = (kk < 0 ? -1 : 1) * 1e-7 * st[i].k; kt[i] = kk; g += dl[i]; nr = Math.max(nr, Math.abs(R[i]) / st[i].Vy); }
      if (nr < 1e-10 && Math.abs(g) < 1e-12 * Math.max(dTarget, 1e-9)) return { dl, lm, it };
      // kt Δδ − Sx Δλ = −R ; ΣΔδ = −g
      let A = 0, B = 0; for (let i = 0; i < n; i++) { A += Sx[i] / kt[i]; B += R[i] / kt[i]; }
      const dlam = (-g + B) / A;
      for (let i = 0; i < n; i++) dl[i] += (Sx[i] * dlam - R[i]) / kt[i];
      lm += dlam;
    }
    return null;
  };
  const dGuess = druEnd * h.reduce((a, b) => a + b, 0);
  const run = (step) => {
    del.fill(0); dmx.fill(0); lam = 0;
    const out = [{ d: 0, Vb: 0, dr: Array(n).fill(0) }];
    let d = 0, Vmax = 0, endBy = 'deriva', fails = 0, hstep = step;
    for (let k = 0; k < 6000; k++) {
      const r = solve(d + hstep);
      if (!r) { hstep /= 2; if (++fails > 12) { endBy = 'convergencia'; break; } continue; }
      const drPrev = Math.max(...Array.from(del, (x, i) => x / h[i]));
      d += hstep; del.set(r.dl); lam = r.lm; for (let i = 0; i < n; i++) dmx[i] = Math.max(dmx[i], del[i]);
      const Vb = lam;   // λ·Sx1 = λ = cortante basal neto (incluye el efecto P-Δ)
      const drNow = Math.max(...Array.from(del, (x, i) => x / h[i]));
      if (drNow >= druEnd) {   // recorta al punto con deriva = druEnd (interpolación lineal)
        const t = (druEnd - drPrev) / (drNow - drPrev || 1), p0 = out[out.length - 1];
        out.push({ d: p0.d + t * (d - p0.d), Vb: p0.Vb + t * (Vb - p0.Vb), dr: p0.dr.map((x, i) => x + t * (del[i] - x)) });
        break;
      }
      out.push({ d, Vb, dr: Array.from(del) }); Vmax = Math.max(Vmax, Vb);
      if (Vb <= 0.2 * Vmax && Vmax > 0) { endBy = 'resistencia'; break; }
      if (hstep < step) hstep = Math.min(step, hstep * 2);
    }
    return { out, endBy, Vmax: Math.max(Vmax, out[out.length - 1].Vb) };
  };
  let R = run(dGuess / 500);
  const dE = R.out[R.out.length - 1].d;
  if (R.out.length < 150 && dE > 0) R = run(dE / 300);
  const curve = R.out;
  const dEnd = curve[curve.length - 1].d;
  // eventos: fluencia, fisuración e inicio de la degradación por entrepiso (primer cruce)
  const ev = [];
  for (let i = 0; i < n; i++) {
    const marks = [['fluencia', bb[i].dy]]; if (st[i].fcr > 0 && st[i].fcr < 1) marks.push(['fisuración', bb[i].dc]); if (isFinite(bb[i].dcap)) marks.push(['degradación', bb[i].dcap]);
    for (const [tipo, dl] of marks) { for (let j = 1; j < curve.length; j++) if (curve[j].dr[i] >= dl && curve[j - 1].dr[i] < dl) { const a = curve[j - 1], b = curve[j], t = (dl - a.dr[i]) / (b.dr[i] - a.dr[i]); ev.push({ i, tipo, Vb: a.Vb + t * (b.Vb - a.Vb), d: a.d + t * (b.d - a.d) }); break; } }
  }
  ev.sort((a, b) => a.d - b.d);
  const stateAt = (d) => { const x = Math.min(Math.max(d, 0), dEnd); for (let j = 1; j < curve.length; j++) if (x <= curve[j].d) { const a = curve[j - 1], b = curve[j], t = (x - a.d) / (b.d - a.d || 1); return { Vb: a.Vb + t * (b.Vb - a.Vb), dr: a.dr.map((y, i) => y + t * (b.dr[i] - y)) }; } const c = curve[curve.length - 1]; return { Vb: c.Vb, dr: c.dr.slice() }; };
  const VbAt = (d) => stateAt(d).Vb;
  return { curve, ev, dEnd, VbEnd: curve[curve.length - 1].Vb, stateAt, VbAt, drifts: null, roof: null, endBy: R.endBy, Vbmax: R.Vmax, bb };
}
// ---------------------------------------------------------------------
//  Tiempo-historia NO LINEAL de edificio de cortante (resortes bilineales de entrepiso con endurecimiento
//  cinemático, P-Δ opcional con columna ficticia, amortiguamiento de Rayleigh con la rigidez inicial)
//  Newmark-β (γ = 1/2, β = 1/4) + Newton-Raphson con la rigidez tangente tridiagonal (Chopra §16.3, Tabla 16.3.3)
//  m (kg), k (N/m), Vy (N), h (m); ag (m/s²). linear = true → resortes elásticos (contraste)
// ---------------------------------------------------------------------
export function nlShearTH({ m, k, Vy, alpha = 0, h, ag, dt, a0 = 0, a1 = 0, pdelta = false, fP = 1, linear = false, beta = 0.25, gamma = 0.5, hmax = Infinity, collapse = 0.10, tol = 1e-8, maxit = 40 }) {
  const n = m.length, N = ag.length;
  const al = Array.isArray(alpha) ? alpha : m.map(() => alpha);
  const th = m.map((_, i) => (pdelta ? G * fP * m.slice(i).reduce((a, b) => a + b, 0) / h[i] : 0));
  const sp = m.map((_, i) => bilinearSpring(k[i], linear ? 1e30 : Vy[i], al[i]));
  const ns = Math.max(1, Math.ceil(dt / hmax - 1e-9)), hs = dt / ns;
  // C = a0 M + a1 K0 (tridiagonal: cd = diagonal, co = fuera de la diagonal (i, i+1))
  const kd = (i) => k[i] + (i + 1 < n ? k[i + 1] : 0);
  const cd = m.map((x, i) => a0 * x + a1 * kd(i)), co = m.map((_, i) => (i + 1 < n ? -a1 * k[i + 1] : 0));
  const Cmul = (x, i) => cd[i] * x[i] + (i > 0 ? co[i - 1] * x[i - 1] : 0) + (i + 1 < n ? co[i] * x[i + 1] : 0);
  const b1 = 1 / (beta * hs * hs), b2 = gamma / (beta * hs), b3 = 1 / (beta * hs), b4 = gamma / beta - 1, b5 = 1 / (2 * beta) - 1, b6 = hs * (gamma / (2 * beta) - 1);
  let u = new Float64Array(n), v = new Float64Array(n), a = new Float64Array(n).fill(-ag[0]);
  const U = Array.from({ length: n }, () => new Float32Array(N)), Fs = Array.from({ length: n }, () => new Float32Array(N));
  const uPk = new Float64Array(n), tuPk = new Float64Array(n), drPk = new Float64Array(n), Fpk = new Float64Array(n), Eh = new Float64Array(n), fPrev = new Float64Array(n), dPrev = new Float64Array(n);
  let VbPk = 0, tVb = 0, itMax = 0, nfail = 0, tCol = null, steps = 0;
  const fref = m.map((_, r) => Math.min(linear ? Infinity : Vy[r], 0.02 * k[r] * h[r]));   // escala de fuerzas del residuo
  const dg = new Float64Array(n), up = new Float64Array(n), lo = new Float64Array(n), rhs = new Float64Array(n), du = new Float64Array(n), cp = new Float64Array(n), dp = new Float64Array(n);
  outer:
  for (let i = 0; i < N - 1; i++) {
    for (let jj = 1; jj <= ns; jj++) {
      const agN = ag[i] + (ag[i + 1] - ag[i]) * jj / ns;
      // p̂ = −M ι üg + (M b1 + C b2) u + (M b3 + C b4) v + (M b5 + C b6) a
      const ph = new Float64Array(n);
      for (let r = 0; r < n; r++) ph[r] = -m[r] * agN + m[r] * (b1 * u[r] + b3 * v[r] + b5 * a[r]) + b2 * Cmul(u, r) + b4 * Cmul(v, r) + b6 * Cmul(a, r);
      const uj = Float64Array.from(u); let conv = false, it = 0;
      for (; it < maxit; it++) {
        // fuerzas de entrepiso y tangentes
        const F = new Float64Array(n), kt = new Float64Array(n);
        for (let r = 0; r < n; r++) { const d = uj[r] - (r ? uj[r - 1] : 0); F[r] = sp[r].trial(d) - th[r] * d; kt[r] = sp[r].kt - th[r]; }
        let rn = 0;
        for (let r = 0; r < n; r++) {
          const fS = F[r] - (r + 1 < n ? F[r + 1] : 0);
          rhs[r] = ph[r] - fS - m[r] * b1 * uj[r] - b2 * Cmul(uj, r);
          rn = Math.max(rn, Math.abs(rhs[r]) / fref[r]);
          dg[r] = kt[r] + (r + 1 < n ? kt[r + 1] : 0) + m[r] * b1 + b2 * cd[r];
          up[r] = r + 1 < n ? -kt[r + 1] + b2 * co[r] : 0; lo[r] = r > 0 ? -kt[r] + b2 * co[r - 1] : 0;
        }
        if (rn < tol) { conv = true; break; }
        // Thomas (tridiagonal)
        cp[0] = up[0] / dg[0]; dp[0] = rhs[0] / dg[0];
        for (let r = 1; r < n; r++) { const den = dg[r] - lo[r] * cp[r - 1]; cp[r] = up[r] / den; dp[r] = (rhs[r] - lo[r] * dp[r - 1]) / den; }
        du[n - 1] = dp[n - 1]; for (let r = n - 2; r >= 0; r--) du[r] = dp[r] - cp[r] * du[r + 1];
        for (let r = 0; r < n; r++) uj[r] += du[r];
      }
      if (!conv) nfail++; itMax = Math.max(itMax, it);
      const vn = new Float64Array(n), an = new Float64Array(n);
      for (let r = 0; r < n; r++) {
        an[r] = b1 * (uj[r] - u[r]) - b3 * v[r] - b5 * a[r];
        vn[r] = v[r] + hs * ((1 - gamma) * a[r] + gamma * an[r]);
      }
      for (let r = 0; r < n; r++) {
        const d = uj[r] - (r ? uj[r - 1] : 0); sp[r].commit(d);
        Eh[r] += (sp[r].f + fPrev[r]) / 2 * (d - dPrev[r]); fPrev[r] = sp[r].f; dPrev[r] = d;
        if (Math.abs(d) > drPk[r]) drPk[r] = Math.abs(d); if (Math.abs(sp[r].f) > Fpk[r]) Fpk[r] = Math.abs(sp[r].f);
        if (Math.abs(d) > collapse * h[r] && tCol === null) tCol = (i + jj / ns) * dt;
      }
      const Vb = Math.abs(sp[0].f - th[0] * dPrev[0]); if (Vb > VbPk) { VbPk = Vb; tVb = (i + jj / ns) * dt; }
      for (let r = 0; r < n; r++) if (Math.abs(uj[r]) > uPk[r]) { uPk[r] = Math.abs(uj[r]); tuPk[r] = (i + jj / ns) * dt; }
      u = uj; v = vn; a = an; steps++;
      if (tCol !== null) { for (let r = 0; r < n; r++) { U[r][i + 1] = u[r]; Fs[r][i + 1] = sp[r].f; } break outer; }
    }
    for (let r = 0; r < n; r++) { U[r][i + 1] = u[r]; Fs[r][i + 1] = sp[r].f; }
  }
  const dres = m.map((_, r) => dPrev[r]);
  return { U, Fs, uPk, tuPk, drPk, Fpk, Eh, VbPk, tVb, itMax, nfail, tCol, ns, hs, theta: th, dres, steps };
}

// curva tabulada [x, y] (desde el origen): interpolación y área acumulada
export function tab(pts) {
  const P = pts[0][0] === 0 && pts[0][1] === 0 ? pts : [[0, 0], ...pts];
  const at = (x) => { if (x <= 0) return 0; for (let i = 1; i < P.length; i++) if (x <= P[i][0]) { const [x0, y0] = P[i - 1], [x1, y1] = P[i]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0 || 1); } return NaN; };
  const area = (x) => { let A = 0; for (let i = 1; i < P.length && P[i - 1][0] < x; i++) { const x1 = Math.min(P[i][0], x); A += (P[i - 1][1] + at(x1)) / 2 * (x1 - P[i - 1][0]); } return A; };
  const k0 = P[1][1] / P[1][0];
  return { P, at, area, k0, xmax: P[P.length - 1][0] };
}
// Bilineal de áreas iguales con pendiente inicial k0 hasta (dp, ap) — ATC-40 §8.2.2.1 / FEMA 440
export function bilinEqualArea(c, dp) {
  const ap = c.at(dp), A = c.area(dp);
  const den = c.k0 * dp - ap;
  if (!(den > 1e-12 * c.k0 * dp)) return { dy: dp, ay: ap, ap, elastic: true };
  let dy = (2 * A - ap * dp) / den; dy = Math.min(Math.max(dy, 1e-9), dp);
  return { dy, ay: c.k0 * dy, ap, elastic: false };
}
// Método N2 (Fajfar 2000; EC8-1 Anexo B). cap: [[Sd(m), Sa(m/s²)]]; Se(T) en m/s²; Tc en s
export function n2Method(cap, Se, Tc) {
  const c = tab(cap); let dm = Math.min(c.xmax, Se(0.5) * (0.5 / PI2) ** 2), out = null;
  for (let it = 0; it < 100; it++) {
    const dmc = Math.min(dm, c.xmax);
    // F*y = resistencia del mecanismo; con rama descendente (P-Δ, degradación) se toma el máximo hasta d*m
    let Fy = c.at(dmc); for (const q of c.P) if (q[0] <= dmc && q[1] > Fy) Fy = q[1];
    const Em = c.area(dmc);
    const dy = Math.min(Math.max(2 * (dmc - Em / Fy), 1e-9), dmc);                         // EC8 B.3
    const Ts = PI2 * Math.sqrt(dy / Fy);                                                   // B.7
    const det = Se(Ts) * (Ts / PI2) ** 2;                                                  // B.8
    const qu = Se(Ts) / Fy;
    let dt;
    if (Ts >= Tc || qu <= 1) dt = det; else dt = Math.max(det / qu * (1 + (qu - 1) * Tc / Ts), det);   // B.9–B.12
    const cap3 = dt > 3 * det; if (cap3) dt = 3 * det;                                     // B.5: d*t ≤ 3d*et
    out = { Fy, dy, Ts, det, dt, qu, Se: Se(Ts), it: it + 1, cap3, regla: (Ts >= Tc ? 'igual desplazamiento (T* ≥ TC)' : qu <= 1 ? 'respuesta elástica (qu ≤ 1)' : 'T* < TC: dt* = (det*/qu)[1 + (qu − 1)TC/T*]') + (cap3 ? '; limitado a 3d*et' : '') };
    if (Math.abs(dt - dm) <= 1e-6 * dt) break;
    dm = dt;
  }
  out.beyond = out.dt > c.xmax;
  return out;
}
// Espectro de capacidad ATC-40 (Procedimiento A). Sa(T) elástico 5 % (m/s²); Ts = fin de la meseta
export const ATC_KAPPA = { A: [16.25, 1.0, 1.13, 0.51], B: [25, 0.67, 0.845, 0.446], C: [0, 0.33, 0.33, 0] };
export const ATC_MIN = { A: [0.33, 0.50], B: [0.44, 0.56], C: [0.56, 0.67] };
export function atcSR(beff, type) {
  const lim = ATC_MIN[type] || ATC_MIN.A;
  return { SRA: Math.min(1, Math.max((3.21 - 0.68 * Math.log(beff)) / 2.12, lim[0])), SRV: Math.min(1, Math.max((2.31 - 0.41 * Math.log(beff)) / 1.65, lim[1])) };
}
export function atcKappa(b0, X, type) {
  if (type === 'C') return 0.33;
  const [b, k1, kA, kB] = ATC_KAPPA[type] || ATC_KAPPA.A;
  return b0 <= b ? k1 : kA - kB * X;
}
export function reducedSa(Sa, Ts, SRA, SRV) {
  const plat = Sa(Ts) * SRA;
  return (T) => (T <= Ts ? Sa(T) * SRA : Math.min(plat, Sa(T) * SRV));
}
// intersección capacidad–demanda (Sa_dem como función del periodo secante)
export function intersect(c, SaDem) {
  const f = (d) => { const a = c.at(d); const T = PI2 * Math.sqrt(d / a); return a - SaDem(T); };
  const N = 400; let prev = 1e-9 * c.xmax, fp = f(prev);
  for (let j = 1; j <= N; j++) {
    const d = c.xmax * j / N, fd = f(d);
    if (fp < 0 && fd >= 0) { let lo = prev, hi = d; for (let it = 0; it < 80; it++) { const mid = (lo + hi) / 2; if (f(mid) < 0) lo = mid; else hi = mid; } return (lo + hi) / 2; }
    prev = d; fp = fd;
  }
  return null;
}
// punto de prueba inicial: intersección elástica o, si no existe, igual desplazamiento (ATC-40 §8.2.2.1 paso 3)
function startPoint(c, Sa) {
  const d = intersect(c, Sa); if (d !== null) return d;
  const T0 = PI2 * Math.sqrt(1 / c.k0); return Math.min(Sa(T0) * (T0 / PI2) ** 2, 0.98 * c.xmax);
}
export function atc40CSM(cap, Sa, Ts, type = 'A', tol = 1e-4) {
  const c = tab(cap);
  let dpi = startPoint(c, Sa);
  let res = null;
  for (let it = 0; it < 200; it++) {
    const bl = bilinEqualArea(c, dpi), api = bl.ap;
    let X = 0, b0 = 0, kap = 1;
    if (!bl.elastic) { X = (bl.ay * dpi - bl.dy * api) / (api * dpi); b0 = 63.7 * X; kap = atcKappa(b0, X, type); }
    const beff = Math.max(kap * b0 + 5, 5);
    const { SRA, SRV } = atcSR(beff, type);
    const dem = reducedSa(Sa, Ts, SRA, SRV);
    const dn = intersect(c, dem);
    if (dn === null) return { ok: false, msg: 'La capacidad no alcanza al espectro reducido (colapso: sin punto de desempeño)', last: res };
    res = { ok: true, dp: dn, ap: c.at(dn), dy: bl.dy, ay: bl.ay, b0, kap, beff, SRA, SRV, it: it + 1, dem, Teff: PI2 * Math.sqrt(dn / c.at(dn)) };
    if (Math.abs(dn - dpi) <= tol * dpi) break;
    dpi = 0.5 * (dpi + dn);
  }
  return res;
}
// FEMA 440 §6.2 — linealización equivalente mejorada (coeficientes para cualquier curva)
export function fema440Beff(mu, alpha) {
  const m1 = mu - 1; let b, r;
  if (mu <= 1) { b = 5; r = 1; }
  else if (mu < 4) { b = 4.9 * m1 ** 2 - 1.1 * m1 ** 3 + 5; r = 0.20 * m1 ** 2 - 0.038 * m1 ** 3 + 1; }
  else if (mu <= 6.5) { b = 14.0 + 0.32 * m1 + 5; r = 0.28 + 0.13 * m1 + 1; }
  else { r = 0.89 * (Math.sqrt(m1 / (1 + 0.05 * (mu - 2))) - 1) + 1; b = 19 * ((0.64 * m1 - 1) / (0.64 * m1) ** 2) * r * r + 5; }
  const B = 4 / (5.6 - Math.log(b));
  const Msec = (1 + alpha * m1) / mu * r * r;   // M = (Teff/Tsec)²
  return { beff: b, TeffT0: r, B, M: Msec };
}
export function fema440ELM(cap, Sa) {
  const c = tab(cap);
  let dpi = startPoint(c, Sa);
  let res = null;
  for (let it = 0; it < 300; it++) {
    const bl = bilinEqualArea(c, Math.min(dpi, c.xmax));
    const mu = bl.elastic ? 1 : dpi / bl.dy;
    const alpha = bl.elastic ? 1 : ((bl.ap - bl.ay) / (dpi - bl.dy)) / c.k0;
    const T0 = PI2 * Math.sqrt(bl.dy / bl.ay);
    const f = fema440Beff(mu, alpha), Teff = f.TeffT0 * T0;
    const dn = Sa(Teff) / f.B * (Teff / PI2) ** 2;
    res = { ok: dn <= c.xmax, dp: dn, ap: c.at(Math.min(dn, c.xmax)), dy: bl.dy, ay: bl.ay, mu, alpha, T0, Teff, beff: f.beff, B: f.B, M: f.M, it: it + 1 };
    if (Math.abs(dn - dpi) <= 1e-5 * dpi) break;
    dpi = 0.5 * dpi + 0.5 * Math.min(dn, c.xmax * 1.5);
  }
  if (!res.ok) res.msg = 'El desplazamiento de desempeño FEMA 440 excede la capacidad';
  return res;
}
// Método de coeficientes (ASCE 41-17 §7.4.3.3.2 / FEMA 440 cap. 5). Curva global [[d_techo, Vb]] (m, N)
export function C1ASCE41(mu, Te, a) { const T = Math.min(Math.max(Te, 0.2), 1.0); return Te > 1.0 ? 1 : 1 + (mu - 1) / (a * T * T); }
export function C2ASCE41(mu, Te) { return Te > 0.7 ? 1 : 1 + ((mu - 1) / Te) ** 2 / 800; }
// Idealización bilineal de ASCE 41-17 §7.4.3.2.4 (Fig. 7-3): Ke secante en 0.6Vy, rama post-fluencia por (Δd, Vd)
// con Δd = min(δt, desplazamiento en Vb máximo) y áreas iguales hasta Δd. Iterativa en Vy.
export function idealizeASCE41(c, dt) {
  let iMax = 0; for (let i = 1; i < c.P.length; i++) if (c.P[i][1] > c.P[iMax][1]) iMax = i;
  const Dd = Math.min(dt, c.P[iMax][0], c.xmax), Vd = c.at(Dd), A = c.area(Dd);
  const d06 = (V) => { for (let i = 1; i < c.P.length; i++) if (c.P[i][1] >= V) { const [x0, y0] = c.P[i - 1], [x1, y1] = c.P[i]; return x0 + (x1 - x0) * (V - y0) / (y1 - y0 || 1); } return NaN; };
  let Vy = Vd, Ke = c.k0, elastic = false;
  for (let it = 0; it < 60; it++) {
    Ke = 0.6 * Vy / d06(0.6 * Vy);
    const den = Dd - Vd / Ke;
    if (!(den > 1e-9 * Dd)) { Vy = Vd; elastic = true; break; }
    const Vn = Math.min(Math.max((2 * A - Vd * Dd) / den, 1e-6 * Vd), Vd * 1.0000001);
    if (Math.abs(Vn - Vy) <= 1e-9 * Vd) { Vy = Vn; break; }
    Vy = Vn;
  }
  if (!isFinite(Ke) || !(Ke > 0)) Ke = c.k0;
  const dy = Math.min(Vy / Ke, Dd), a1 = Dd > dy * (1 + 1e-9) ? (Vd - Vy) / (Dd - dy) / Ke : 0;
  // pendiente negativa α2 (de (Δd, Vd) al punto de la rama descendente con V = 0.6Vy, o al final de la curva)
  let a2 = null;
  const last = c.P[c.P.length - 1];
  if (last[0] > Dd * (1 + 1e-6) && last[1] < Vd * (1 - 1e-3)) {
    let pt = last;
    for (let i = iMax + 1; i < c.P.length; i++) if (c.P[i][0] > Dd && c.P[i][1] <= 0.6 * Vy) { const [x0, y0] = c.P[i - 1], [x1, y1] = c.P[i]; pt = [x0 + (x1 - x0) * (0.6 * Vy - y0) / (y1 - y0 || -1), 0.6 * Vy]; break; }
    a2 = (pt[1] - Vd) / (pt[0] - Dd) / Ke;
  }
  return { Vy, Ke, dy, Dd, Vd, a1, a2, elastic };
}
// Método de coeficientes (ASCE 41-17 §7.4.3.3.2). Curva global [[δ_techo, Vb]] (m, N); Ti = periodo elástico (s)
// Te = Ti·√(Ki/Ke) (Ec. 7-27); μstrength = Sa/(Vy/W)·Cm (Ec. 7-31); límite μmax por pendiente negativa (Ec. 7-32).
export function coefMethod(curve, W, Sa, Ti, C0, a = 130, Cm = 1, opt = {}) {
  const c = tab(curve), Ki = c.k0, lam = opt.lambda ?? 0.8, aPD = Math.min(opt.alphaPD ?? 0, 0);
  let dt = C0 * Sa(Ti) * (Ti / PI2) ** 2, out;
  for (let it = 0; it < 100; it++) {
    const idl = idealizeASCE41(c, Math.min(dt, c.xmax));
    const Te = Ti * Math.sqrt(Ki / idl.Ke), SaT = Sa(Te);
    const mu = Math.max(SaT / G / (idl.Vy / W) * Cm, 1);
    const C1 = C1ASCE41(mu, Te, a), C2 = C2ASCE41(mu, Te);
    const dn = C0 * C1 * C2 * SaT * (Te / PI2) ** 2;
    let ae = null, mumax = Infinity;
    if (idl.a2 !== null && idl.a2 < 0) { ae = aPD + lam * (idl.a2 - aPD); const hh = 1 + 0.15 * Math.log(Te); mumax = idl.Dd / idl.dy + Math.abs(ae) ** (-hh) / 4; }
    out = { dt: dn, C0, C1, C2, mu, Vy: idl.Vy, Ke: idl.Ke, Ki, Te, Ti, SaT, dy: idl.dy, Dd: idl.Dd, Vd: idl.Vd, a1: idl.a1, a2: idl.a2, ae, mumax, it: it + 1 };
    if (Math.abs(dn - dt) <= 1e-6 * dn) break;
    dt = 0.5 * (dt + dn);
  }
  out.unstable = out.mu > out.mumax;
  return out;
}

// ---------------------------------------------------------------------
//  Materiales para fibras (compresión positiva; MPa, mm/mm)
// ---------------------------------------------------------------------
export function manderFcc(fco, fl) { return fco * (-1.254 + 2.254 * Math.sqrt(1 + 7.94 * fl / fco) - 2 * fl / fco); }
// Superficie de falla de 5 parámetros (William-Warnke; calibración de Elwi-Murray con los ensayos de Schickert-Winkler)
// usada por Mander, Priestley y Park (1988, Apéndice) para el ábaco de confinamiento triaxial (Fig. 4).
// so = σoct/f'co (negativo en compresión); cth = cos θ (ángulo de Lode). Devuelve τoct/f'co sobre la superficie.
export function manderTauOct(so, cth) {
  const T = 0.069232 - 0.661091 * so - 0.049350 * so * so, Cm = 0.122965 - 1.150502 * so - 0.315545 * so * so;
  const D = 4 * (Cm * Cm - T * T) * cth * cth;
  return Cm * (0.5 * D / cth + (2 * T - Cm) * Math.sqrt(Math.max(D + 5 * T * T - 4 * T * Cm, 0))) / (D + (2 * T - Cm) ** 2);
}
// f'cc con presiones laterales efectivas distintas f'l1 ≠ f'l2 (solución de la superficie: equivale al ábaco de la
// Fig. 4 de Mander 1988). Con f'l1 = f'l2 reproduce la fórmula cerrada a 4 cifras.
export function manderFccBiaxial(fco, fl1, fl2) {
  const a = Math.max(Math.min(fl1, fl2), 0) / fco, b = Math.max(fl1, fl2, 0) / fco;
  if (b <= 0) return fco;
  const F = (x) => {
    const s1 = -a, s2 = -b, s3 = -x, so = (s1 + s2 + s3) / 3;
    const to = Math.sqrt((s1 - s2) ** 2 + (s2 - s3) ** 2 + (s3 - s1) ** 2) / 3;
    return to - manderTauOct(so, (s1 - so) / (Math.SQRT2 * to));
  };
  let lo = 1, hi = 1 + 8 * b + 1; while (F(hi) < 0 && hi < 50) hi *= 1.5;
  for (let i = 0; i < 70; i++) { const mid = (lo + hi) / 2; if (F(mid) < 0) lo = mid; else hi = mid; }
  return fco * (lo + hi) / 2;
}
// Aproximación explícita de Chang y Mander (1994, NCEER-94-0006) del mismo ábaco (error ≲ 1 %)
export function changManderFcc(fco, fl1, fl2) {
  const x1 = Math.min(fl1, fl2) / fco, x2 = Math.max(fl1, fl2) / fco; if (!(x2 > 0)) return fco;
  const r = x1 / x2, xb = (x1 + x2) / 2;
  const A = 6.8886 - (0.6069 + 17.275 * r) * Math.exp(-4.989 * r);
  const B = 4.5 / (5 / A * (0.9849 - 0.6306 * Math.exp(-3.8939 * r)) - 0.1) - 5;
  return fco * (1 + A * (0.1 + 0.9 / (1 + B * xb)) * xb);
}
export function manderCurve(fco, fcc, eco = 0.002, Ec = 5000 * Math.sqrt(fco)) {
  const ecc = eco * (1 + 5 * (fcc / fco - 1)), Esec = fcc / ecc, r = Ec / (Ec - Esec);
  return { ecc, r, Ec, sig: (e) => { if (e <= 0) return 0; const x = e / ecc; return fcc * x * r / (r - 1 + Math.pow(x, r)); } };
}
// recubrimiento no confinado (Mander): curva hasta 2εco y luego recta a cero en εsp
export function manderCover(fco, eco = 0.002, esp = 0.005) {
  const m = manderCurve(fco, fco, eco), s2 = m.sig(2 * eco);
  return (e) => (e <= 0 ? 0 : e <= 2 * eco ? m.sig(e) : e < esp ? s2 * (esp - e) / (esp - 2 * eco) : 0);
}
export function hognestad(fpp, ec0, ecu = 0.0038) {
  return (e) => (e <= 0 ? 0 : e <= ec0 ? fpp * (2 * e / ec0 - (e / ec0) ** 2) : e <= ecu * 1.0001 ? fpp * (1 - 0.15 * (e - ec0) / (ecu - ec0)) : 0);
}
export function steelModel({ fy, Es, model = 'bilineal', b = 0.01, esh = 0.008, esu = 0.10, fsu }) {
  const ey = fy / Es; fsu = fsu || 1.35 * fy;
  if (model === 'epp') return (e) => Math.sign(e) * Math.min(Es * Math.abs(e), fy);
  if (model === 'park') {
    const r = esu - esh, mm = ((fsu / fy) * (30 * r + 1) ** 2 - 60 * r - 1) / (15 * r * r);
    return (e) => { const a = Math.abs(e); let f; if (a <= ey) f = Es * a; else if (a <= esh) f = fy; else { const x = Math.min(a, esu) - esh; f = fy * ((mm * x + 2) / (60 * x + 2) + x * (60 - mm) / (2 * (30 * r + 1) ** 2)); } return Math.sign(e) * f; };
  }
  return (e) => { const a = Math.abs(e); const f = a <= ey ? Es * a : Math.min(fy + b * Es * (a - ey), fsu); return Math.sign(e) * f; };
}

// ---------------------------------------------------------------------
//  Momento–curvatura por fibras — sección rectangular (N, mm, MPa)
//  p: { b, h, cover (libre al estribo), dbh, s, nlb, nlh, fyh, esuh, fc, conc: 'mander'|'hognestad', k3,
//       ecuH, tension, steel{fy, Es, model, b, esh, esu, fsu}, layers [{d, As, n, db}], P }
// ---------------------------------------------------------------------
export function confinementRect(p) {
  const bc = p.b - 2 * p.cover - p.dbh, dc = p.h - 2 * p.cover - p.dbh;
  const Ash = Math.PI * p.dbh ** 2 / 4, sp = p.s - p.dbh;
  const Ast = p.layers.reduce((a, l) => a + l.As, 0), rcc = Ast / (bc * dc);
  const top = p.layers[0], nTop = top.n || 2, nRows = p.layers.length, db = Math.max(...p.layers.map(l => l.db || 0));
  let w2 = 0;
  if (nTop > 1) w2 += 2 * (nTop - 1) * Math.max(bc / (nTop - 1) - db, 0) ** 2;
  if (nRows > 1) w2 += 2 * (nRows - 1) * Math.max(dc / (nRows - 1) - db, 0) ** 2;
  const ke = Math.max(0, (1 - w2 / (6 * bc * dc)) * (1 - sp / (2 * bc)) * (1 - sp / (2 * dc)) / (1 - rcc));
  const rb = p.nlb * Ash / (p.s * dc), rh = p.nlh * Ash / (p.s * bc);    // ramas paralelas a b y a h
  const flb = ke * rb * p.fyh, flh = ke * rh * p.fyh, fl = (flb + flh) / 2;
  // confinamiento triaxial con f'lx ≠ f'ly (ábaco de Mander 1988); 'promedio' = simplificación con f'l medio
  const fccAvg = manderFcc(p.fc, fl), fccMin = manderFcc(p.fc, Math.min(flb, flh));
  const mode = p.confMode || 'triaxial';
  const fcc = mode === 'promedio' ? fccAvg : mode === 'minimo' ? fccMin : manderFccBiaxial(p.fc, flb, flh);
  const rs = rb + rh;
  const ecu = 0.004 + 1.4 * rs * p.fyh * (p.esuh || 0.09) / fcc;
  return { bc, dc, ke, rb, rh, rs, flb, flh, fl, fcc, fccAvg, fccMin, mode, ecu, w2, rcc, sp };
}
export function momentCurvature(p) {
  const { b, h } = p, nf = p.nf || 120, dy = h / nf;
  const Ec = p.conc === 'hognestad' ? 4700 * Math.sqrt(p.fc) : 5000 * Math.sqrt(p.fc);
  const fr = 0.62 * Math.sqrt(p.fc), ecr = fr / Ec;
  const ten = (e) => (p.tension && e < 0 && e >= -ecr ? Ec * e : 0);
  let conf = null, sCore, sCov, ecuLim, yc1 = 0, yc2 = h, wcore = 0;
  if (p.conc === 'hognestad') {
    const fpp = (p.k3 || 0.85) * p.fc, ec0 = 2 * fpp / Ec;
    const hg = hognestad(fpp, ec0, p.ecuH || 0.0038);
    sCore = sCov = hg; ecuLim = p.ecuH || 0.0038;
    conf = { fpp, ec0, Ec };
  } else {
    conf = confinementRect(p);
    const mc = manderCurve(p.fc, conf.fcc, 0.002, Ec);
    conf.ecc = mc.ecc; conf.r = mc.r; conf.Ec = Ec;
    sCore = mc.sig; sCov = manderCover(p.fc);
    ecuLim = conf.ecu; yc1 = p.cover + p.dbh / 2; yc2 = h - yc1; wcore = conf.bc;
  }
  const ss = steelModel(p.steel), ey = p.steel.fy / p.steel.Es;
  // fibras: [y, A, material]
  const fib = [];
  for (let i = 0; i < nf; i++) {
    const y = (i + 0.5) * dy;
    if (y > yc1 && y < yc2 && wcore > 0) { fib.push([y, wcore * dy, 1]); fib.push([y, (b - wcore) * dy, 0]); }
    else fib.push([y, b * dy, 0]);
  }
  const bars = p.layers.map(l => ({ y: l.d, As: l.As, core: l.d > yc1 && l.d < yc2 }));
  const sig = (e, core) => (e >= 0 ? (core ? sCore(e) : sCov(e)) : ten(e));
  const NM = (et, phi) => {
    let N = 0, M = 0;
    for (const [y, A, c] of fib) { const s = sig(et - phi * y, c) * A; N += s; M += s * (h / 2 - y); }
    for (const r of bars) { const e = et - phi * r.y; const s = (ss(e) - (e > 0 ? sig(e, r.core) : 0)) * r.As; N += s; M += s * (h / 2 - r.y); }
    return [N, M];
  };
  const P = p.P || 0, ytop = p.conc === 'hognestad' ? 0 : yc1, ybot = Math.max(...bars.map(r => r.y));
  const esu = p.steel.model === 'epp' ? Infinity : (p.steel.esu || 0.10);
  const solve = (phi, g) => {
    let lo = g - 0.002, hi = g + 0.002, k = 0;
    while (NM(lo, phi)[0] > P && k++ < 60) lo -= 0.004 * k;
    k = 0; while (NM(hi, phi)[0] < P && k++ < 60) hi += 0.004 * k;
    if (NM(lo, phi)[0] > P || NM(hi, phi)[0] < P) return null;
    for (let it = 0; it < 48; it++) { const mid = (lo + hi) / 2; if (NM(mid, phi)[0] < P) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  };
  const phy0 = 2.1 * ey / h;
  const pts = [{ phi: 0, M: 0, et: 0, ec: 0, es: 0 }];
  let et = P > 0 ? P / (Ec * b * h) : 0, phi = 0, fail = '', Mmax = 0;
  for (let st = 0; st < 2500; st++) {
    const dphi = phi < 3 * phy0 ? phy0 / 40 : phi < 12 * phy0 ? phy0 / 12 : phy0 / 5;
    phi += dphi;
    const e = solve(phi, et);
    if (e === null) { fail = 'equilibrio'; break; }
    et = e;
    const M = NM(et, phi)[1]; Mmax = Math.max(Mmax, M);
    const ec = et - phi * ytop, es = et - phi * ybot;
    pts.push({ phi, M, et, ec, es, etop: et });
    if (ec >= ecuLim) { fail = p.conc === 'hognestad' ? 'concreto (ε_cu en la fibra extrema)' : 'concreto confinado (ε_cu en la fibra extrema del núcleo)'; break; }
    if (-es >= esu) { fail = 'acero (ε_su en la barra extrema)'; break; }
    if (M < 0.5 * Mmax && phi > 5 * phy0) { fail = 'pérdida de resistencia'; break; }
  }
  // puntos característicos por interpolación lineal
  const cross = (fn, lim) => { for (let i = 1; i < pts.length; i++) if (fn(pts[i]) >= lim) { const a = pts[i - 1], c = pts[i], fa = fn(a), fc = fn(c), t = fc === fa ? 1 : (lim - fa) / (fc - fa); return { phi: a.phi + t * (c.phi - a.phi), M: a.M + t * (c.M - a.M), i }; } return null; };
  const cr = p.tension ? cross(q => -(q.et - q.phi * h), ecr) : null;
  const ys = cross(q => -q.es, ey), yc = cross(q => q.et, 0.002);
  const fy1 = ys && (!yc || ys.phi <= yc.phi) ? { ...ys, by: 'acero' } : yc ? { ...yc, by: 'concreto (ε_c = 0.002)' } : null;
  const nA = cross(q => q.et, 0.004), nB = cross(q => -q.es, 0.015);
  let Mn = [nA, nB].filter(Boolean).sort((a, c) => a.phi - c.phi)[0];
  let ult = pts[pts.length - 1];
  if (fail.startsWith('concreto')) { const u = cross(q => q.ec, ecuLim); if (u) ult = { phi: u.phi, M: u.M }; }
  else if (fail.startsWith('acero')) { const u = cross(q => -q.es, esu); if (u) ult = { phi: u.phi, M: u.M }; }
  if (!Mn || Mn.phi > ult.phi) Mn = { phi: ult.phi, M: ult.M };
  const phiY = fy1 ? fy1.phi * Mn.M / fy1.M : NaN;
  return { pts, fy1, Mn, phiY, ult, cr, fail, conf, Ec, ecuLim, ey, sCore, sCov, ss, fr, Mmax, yc1, NM };
}

// ---------------------------------------------------------------------
//  SIMQKE: acelerograma sintético compatible con un espectro (Gasparini-Vanmarcke 1976)
//  Sa(T) objetivo en m/s² (ζ = 5 %). Envolvente trapezoidal de Jennings.
// ---------------------------------------------------------------------
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
export function simqke({ Sa, dur = 20, dt = 0.01, t1 = 2, t2 = 12, cdec = 0.25, seed = 12345, nf = 200, iters = 10, z = 0.05, Tmin = 0.03, Tmax = 4 }) {
  const N = Math.round(dur / dt) + 1, R = rng(seed);
  const fmax = Math.min(45, 0.45 / dt), fmin = Math.max(0.1, 1 / (2 * Tmax));
  const fr = Array.from({ length: nf }, (_, i) => fmin * Math.pow(fmax / fmin, i / (nf - 1)));
  const ph = fr.map(() => PI2 * R());
  const env = new Float64Array(N);
  for (let k = 0; k < N; k++) { const t = k * dt; env[k] = t < t1 ? (t / t1) ** 2 : t <= t2 ? 1 : Math.exp(-cdec * (t - t2)); }
  let A = fr.map(f => Sa(1 / f) * 0.05);
  const Tc = fr.map(f => 1 / f).filter(T => T >= Tmin && T <= Tmax);
  const synth = () => {
    const x = new Float64Array(N);
    for (let j = 0; j < nf; j++) {
      const w = PI2 * fr[j], cw = Math.cos(w * dt), sw = Math.sin(w * dt), Aj = A[j];
      let s = Math.sin(ph[j]), c = Math.cos(ph[j]);
      for (let k = 0; k < N; k++) { x[k] += Aj * s; const sn = s * cw + c * sw; c = c * cw - s * sw; s = sn; }
    }
    for (let k = 0; k < N; k++) x[k] *= env[k];
    // corrección de línea base: x -= env·(c0 + c1 t) con v(fin) = 0 y d(fin) = 0
    let I = [0, 0, 0, 0, 0, 0]; // ∫x, ∫∫x, ∫e, ∫∫e, ∫e t, ∫∫ e t
    const cum = (f) => { let v = 0, d = 0, fp = f(0); for (let k = 1; k < N; k++) { const fk = f(k); const vn = v + (fp + fk) / 2 * dt; d += (v + vn) / 2 * dt; v = vn; fp = fk; } return [v, d]; };
    const [vx, dx] = cum(k => x[k]), [ve, de] = cum(k => env[k]), [vt, dtt] = cum(k => env[k] * k * dt);
    const det = ve * dtt - vt * de;
    if (Math.abs(det) > 1e-30) { const c0 = (vx * dtt - vt * dx) / det, c1 = (ve * dx - vx * de) / det; for (let k = 0; k < N; k++) x[k] -= env[k] * (c0 + c1 * k * dt); }
    void I;
    return x;
  };
  let x, sp, hist = [], best = null;
  for (let it = 0; it < iters; it++) {
    x = synth();
    sp = spectrumNJ(x, dt, fr.map(f => 1 / f), z);
    const rr = sp.filter(s => s.T >= Tmin && s.T <= Tmax).map(s => s.SA / Sa(s.T));
    const h = { it: it + 1, min: Math.min(...rr), max: Math.max(...rr) };
    hist.push(h);
    if (!best || h.min / h.max > best.h.min / best.h.max) best = { x, h };
    A = A.map((a, j) => a * Sa(1 / fr[j]) / sp[j].SA);
  }
  x = best.x;
  sp = spectrumNJ(x, dt, Tc, z);
  const rr = sp.map(s => s.SA / Sa(s.T));
  return { ag: x, dt, N, fr, hist, best: best.h.it, ratioMin: Math.min(...rr), ratioMax: Math.max(...rr), ratioMean: rr.reduce((a, b) => a + b, 0) / rr.length, sp };
}

// ---------------------------------------------------------------------
//  Registro de El Centro y espectro memoizado
// ---------------------------------------------------------------------
let EC_SI = null;
export function elCentro() { if (!EC_SI) EC_SI = Float64Array.from(decodeRecord(ELCENTRO), (a) => a * G); return { ag: EC_SI, dt: ELCENTRO.dt, name: ELCENTRO.name }; }
const ECSP = new Map();
function ecSpec(T, z) {
  const key = T.toPrecision(8) + '|' + z;
  if (!ECSP.has(key)) { const r = elCentro(); ECSP.set(key, spectrumNJ(r.ag, r.dt, [T], z)[0]); if (ECSP.size > 2000) ECSP.clear(); }
  return ECSP.get(key);
}

// ---------------------------------------------------------------------
//  Funciones para el editor
// ---------------------------------------------------------------------
const n0 = (x, u) => toNum(x, u);
const zeta = (z) => { const v = n0(z); return v >= 1 ? v / 100 : v; };
const accG = (x) => (math.isUnit(x) ? x.toNumber('m/s^2') / G : n0(x));   // aceleración → g
defineFns({
  rayleighA0: { fn: (Ti, Tj, z) => mkUnit(rayleighCoef(n0(Ti, 's'), n0(Tj, 's'), zeta(z)).a0, 's^-1'), tex: 'a_0', desc: 'Coeficiente de Rayleigh a0 (C = a0·M + a1·K) para ζ en los periodos Ti y Tj: a0 = 2ζωiωj/(ωi+ωj) (Chopra §11.4)', args: 'Ti, Tj, ζ' },
  rayleighA1: { fn: (Ti, Tj, z) => mkUnit(rayleighCoef(n0(Ti, 's'), n0(Tj, 's'), zeta(z)).a1, 's'), tex: 'a_1', desc: 'Coeficiente de Rayleigh a1 = 2ζ/(ωi+ωj) (Chopra Ec. 11.4.9)', args: 'Ti, Tj, ζ' },
  zetaRayleigh: { fn: (T, a0, a1) => { const w = PI2 / n0(T, 's'); return n0(a0, 's^-1') / (2 * w) + n0(a1, 's') * w / 2; }, tex: '\\zeta_n', desc: 'Amortiguamiento modal de Rayleigh ζ(T) = a0/(2ω) + a1·ω/2 (Chopra Ec. 11.4.8)', args: 'T, a0, a1' },
  rhoCQC: { fn: (Ti, Tj, zi, zj) => { const z1 = zeta(zi), z2 = zj === undefined ? z1 : zeta(zj); return rhoCQCw(PI2 / n0(Ti, 's'), PI2 / n0(Tj, 's'), z1, z2); }, tex: '\\rho_{ij}', desc: 'Coeficiente de correlación CQC de Der Kiureghian (1981) entre los modos de periodos Ti y Tj (ζj opcional)', args: 'Ti, Tj, ζi, ζj' },
  SdSa: { fn: (Sa, T) => mkUnit(accG(Sa) * G * (n0(T, 's') / PI2) ** 2, 'm'), tex: 'S_d', desc: 'Desplazamiento espectral Sd = Sa·T²/(4π²); Sa en g (número) o aceleración', args: 'Sa, T' },
  SaSd: { fn: (Sd, T) => n0(Sd, 'm') * (PI2 / n0(T, 's')) ** 2 / G, tex: 'S_a/g', desc: 'Pseudo-aceleración Sa/g = (2π/T)²·Sd/g', args: 'Sd, T' },
  SvSd: { fn: (Sd, T) => mkUnit(n0(Sd, 'm') * PI2 / n0(T, 's'), 'm/s'), tex: 'S_v', desc: 'Pseudo-velocidad Sv = (2π/T)·Sd', args: 'Sd, T' },
  etaEC8: { fn: (z) => Math.max(Math.sqrt(10 / (5 + 100 * zeta(z))), 0.55), tex: '\\eta', desc: 'Factor de corrección por amortiguamiento η = √(10/(5+ξ)) ≥ 0.55 (EC8-1 Ec. 3.6)', args: 'ζ' },
  BFEMA440: { fn: (b) => 4 / (5.6 - Math.log(100 * zeta(b))), tex: 'B', desc: 'Factor de reducción espectral B = 4/(5.6 − ln βeff[%]) (FEMA 440 Ec. 6-10; ASCE 41-17 Ec. 2-11)', args: 'βeff' },
  SRAATC40: { fn: (b, t) => atcSR(100 * zeta(b), ['A', 'B', 'C'][Math.round(n0(t)) - 1] || 'A').SRA, tex: 'SR_A', desc: 'Reducción espectral en la meseta SRA = (3.21 − 0.68 ln βeff)/2.12 con mínimos por tipo 1 = A, 2 = B, 3 = C (ATC-40 Ec. 8-15, Tabla 8-3)', args: 'βeff, tipo' },
  SRVATC40: { fn: (b, t) => atcSR(100 * zeta(b), ['A', 'B', 'C'][Math.round(n0(t)) - 1] || 'A').SRV, tex: 'SR_V', desc: 'Reducción espectral en la rama de velocidad SRV = (2.31 − 0.41 ln βeff)/1.65 (ATC-40 Ec. 8-16)', args: 'βeff, tipo' },
  C1ASCE41: { fn: (mu, Te, a) => C1ASCE41(n0(mu), n0(Te, 's'), a === undefined ? 130 : n0(a)), tex: 'C_1', desc: 'Coeficiente C1 = 1 + (μ − 1)/(a·Te²) (ASCE 41-17 Ec. 7-29); a = 130 (A, B, C), 90 (D), 60 (E)', args: 'μ, Te, a' },
  C2ASCE41: { fn: (mu, Te) => C2ASCE41(n0(mu), n0(Te, 's')), tex: 'C_2', desc: 'Coeficiente C2 = 1 + ((μ − 1)/Te)²/800 para Te ≤ 0.7 s (ASCE 41-17 Ec. 7-30)', args: 'μ, Te' },
  RmuN2: { fn: (mu, T, Tc) => { const m = n0(mu), t = n0(T, 's'), c = n0(Tc, 's'); return t < c ? (m - 1) * t / c + 1 : m; }, tex: 'R_\\mu', desc: 'Factor de reducción por ductilidad Rμ (Vidic-Fajfar-Fischinger; N2): (μ − 1)T/TC + 1 si T < TC, μ si T ≥ TC', args: 'μ, T, TC' },
  fccMander: { fn: (fco, fl) => { const f = n0(fco, 'MPa'), l = n0(fl, 'MPa'); return mkUnit(manderFcc(f, l), 'MPa'); }, tex: "f'_{cc}", desc: "Resistencia del concreto confinado f'cc = f'co(−1.254 + 2.254√(1 + 7.94f'l/f'co) − 2f'l/f'co) (Mander et al. 1988)", args: "f'co, f'l" },
  eccMander: { fn: (fco, fcc, eco) => (eco === undefined ? 0.002 : n0(eco)) * (1 + 5 * (n0(fcc, 'MPa') / n0(fco, 'MPa') - 1)), tex: '\\varepsilon_{cc}', desc: 'Deformación en la resistencia máxima confinada εcc = εco[1 + 5(f\'cc/f\'co − 1)] (Mander 1988)', args: "f'co, f'cc, εco" },
  ecuPriestley: { fn: (rs, fyh, esu, fcc) => 0.004 + 1.4 * n0(rs) * n0(fyh, 'MPa') * n0(esu) / n0(fcc, 'MPa'), tex: '\\varepsilon_{cu}', desc: 'Deformación última del concreto confinado εcu = 0.004 + 1.4ρs·fyh·εsu/f\'cc (Priestley, Seible y Calvi 1996)', args: 'ρs, fyh, εsu, f\'cc' },
  LpPP: { fn: (L, dbl, fy) => mkUnit(0.08 * n0(L, 'mm') + 0.022 * n0(dbl, 'mm') * n0(fy, 'MPa'), 'mm'), tex: 'L_p', desc: 'Longitud de rótula plástica Lp = 0.08L + 0.022·db·fy [mm, MPa] (Paulay y Priestley 1992, Ec. 4.30)', args: 'L, db, fy' },
  SaElCentro: { fn: (T, z) => { const t = n0(T, 's'); return t <= 0 ? 0.3188 : ecSpec(t, zeta(z)).PSA / G; }, tex: 'S_a^{EC}/g', desc: 'Pseudo-aceleración espectral de El Centro 1940 NS (Sa/g) para el periodo T y el amortiguamiento ζ (Nigam-Jennings)', args: 'T, ζ' },
  SdElCentro: { fn: (T, z) => mkUnit(n0(T, 's') <= 0 ? 0 : ecSpec(n0(T, 's'), zeta(z)).D, 'm'), tex: 'S_d^{EC}', desc: 'Desplazamiento espectral de El Centro 1940 NS (Chopra Fig. 6.6.4)', args: 'T, ζ' },
}, 'Dinámica');
