// =====================================================================
//  Funciones normativas — módulo «chile»
//  NCh433.Of1996 Mod.2009 + DS61 (2011) · NCh2369.Of2003 y NCh2369:2023/2025
//  NCh432 (viento) · análisis modal de edificios de cortante (NCh433 6.3)
//  Fuentes y verificación: docs/referencias/chile.md
// =====================================================================
import { defineFns, math, toNum, mkUnit, interp1, fixedUnits } from '../engine.js';

const G = 9.80665;
// ---------- utilidades ----------
const isVec = (x) => math.isMatrix(x) || Array.isArray(x);
const flat = (x) => (math.isMatrix(x) ? x.toArray() : x).flat(Infinity);
// aplica f elemento a elemento si x es vector/matriz
const vmap = (x, f) => (math.isMatrix(x) ? math.matrix(vmap(x.toArray(), f)) : Array.isArray(x) ? x.map(v => vmap(v, f)) : f(x));
const nu = (x, u) => (math.isUnit(x) ? x.toNumber(u) : toNum(x));
const sec = (x) => nu(x, 's');

// Tipo de suelo: 1..5 o 'A'..'E' (DS61 Tabla 4.2 / NCh433 Tabla 6.3)
function soil433(s) {
  if (typeof s === 'string') { const k = 'ABCDEF'.indexOf(s.trim().toUpperCase()); if (k < 0) throw new Error('Tipo de suelo NCh433 inválido: ' + s); s = k + 1; }
  s = Math.round(toNum(s));
  if (s === 6) throw new Error('Suelo tipo F: requiere estudio especial de sitio (DS61 Tabla 6.3)');
  if (!(s >= 1 && s <= 5)) throw new Error('Tipo de suelo NCh433: use 1 = A, 2 = B, 3 = C, 4 = D, 5 = E');
  return s - 1;
}
// DS61 Tabla 6.3 — S, To, T', n, p
const T63 = {
  S: [0.90, 1.00, 1.05, 1.20, 1.30], To: [0.15, 0.30, 0.40, 0.75, 1.20], Tp: [0.20, 0.35, 0.45, 0.85, 1.35],
  n: [1.00, 1.33, 1.40, 1.80, 1.80], p: [2.0, 1.5, 1.6, 1.0, 1.0],
};
function zona(z) { z = Math.round(toNum(z)); if (!(z >= 1 && z <= 3)) throw new Error('Zona sísmica de Chile: 1, 2 o 3'); return z; }

// α(Tn) — NCh433 ec. (6-9)
const alpha = (T, To, p) => { const r = T / To; return (1 + 4.5 * r ** p) / (1 + r ** 3); };

// Cd* — NCh433 Tabla 6.5 (DS61) para el espectro elástico de desplazamientos
function cdStar(T, s) {
  if (T > 5.0 + 1e-9) throw new Error('Tabla 6.5 (Cd*) válida hasta Tn = 5 s');
  switch (s) {
    case 0: return T <= 0.23 ? 1 : T <= 2.52 ? -0.055 * T * T + 0.36 * T + 0.92 : 0.08 * T * T - 0.9 * T + 3.24;
    case 1: return T <= 0.47 ? 1 : T <= 2.02 ? 0.95 * T + 0.55 : 0.065 * T * T - 0.75 * T + 3.72;
    case 2: return T <= 0.65 ? 1 : T <= 2.02 ? 0.57 * T + 0.63 : 0.055 * T * T - 0.63 * T + 2.83;
    case 3: return T <= 0.90 ? 1 : T <= 1.75 ? 1.1 * T : 1.93;
    default: throw new Error('Suelo tipo E: el espectro de desplazamientos requiere estudio especial (NCh433 6.3.5.5)');
  }
}

// NCh433 Tabla 6.4 — Cmax/(S·Ao/g) según R (interpolación lineal entre valores tabulados)
// La Tabla 6.4 no tabula R = 5 (acero IMF de la Tabla 5.1): se interpola linealmente (0,45·S·Ao/g),
// criterio del módulo que el revisor debe aceptar o reemplazar por el valor conservador de R = 4 (0,55).
const T64R = [2, 3, 4, 5.5, 6, 7], T64C = [0.90, 0.60, 0.55, 0.40, 0.35, 0.35];
function cmaxFactor(R) {
  if (R < 2 - 1e-9 || R > 7 + 1e-9) throw new Error('Tabla 6.4 NCh433: R debe estar entre 2 y 7');
  return interp1(R, T64R, T64C);
}

// ---------- NCh2369.Of2003 ----------
function soil2369(s) {
  if (typeof s === 'string') { const k = ['I', 'II', 'III', 'IV'].indexOf(s.trim().toUpperCase()); if (k < 0) throw new Error('Tipo de suelo NCh2369 inválido: ' + s); return k; }
  s = Math.round(toNum(s)); if (!(s >= 1 && s <= 4)) throw new Error('Suelo NCh2369.Of2003: 1 = I, 2 = II, 3 = III, 4 = IV'); return s - 1;
}
const T54 = { Tp: [0.20, 0.35, 0.62, 1.35], n: [1.00, 1.33, 1.80, 1.80] };
// Tabla 5.7 (zona 3): filas R = 1..5, columnas ξ = 0.02, 0.03, 0.05
const T57 = [[0.79, 0.68, 0.55], [0.60, 0.49, 0.42], [0.40, 0.34, 0.28], [0.32, 0.27, 0.22], [0.26, 0.23, 0.18]];
function cmax2369(R, xi, Ao) {
  if (R < 1 - 1e-9 || R > 5 + 1e-9) throw new Error('Tabla 5.7 NCh2369: R debe estar entre 1 y 5');
  if (xi < 0.02 - 1e-9 || xi > 0.05 + 1e-9) throw new Error('Tabla 5.7 NCh2369: ξ debe estar entre 0.02 y 0.05');
  const col = T57.map(r => interp1(xi, [0.02, 0.03, 0.05], r));
  const c3 = interp1(R, [1, 2, 3, 4, 5], col);
  // Nota de la tabla: zona 2 → ×0.75, zona 1 → ×0.50 (equivale a Ao/0.40g)
  const f = Math.abs(Ao - 0.4) < 1e-6 ? 1 : Math.abs(Ao - 0.3) < 1e-6 ? 0.75 : Math.abs(Ao - 0.2) < 1e-6 ? 0.5 : Ao / 0.4;
  return c3 * f;
}

// ---------- NCh2369:2023 (oficializada como NCh2369:2025, D.Ex. 12/2026) ----------
// Tabla 5: S, T0, p (suelos A–D; E con S = 1,3 y estudio de sitio)
const T5_23 = { S: [0.90, 1.00, 1.05, 1.20, 1.30], To: [0.15, 0.30, 0.40, 0.75, null], p: [1.85, 1.60, 1.50, 1.00, null] };
// Espectro vertical de diseño NCh2369:2023 ec. (2) y (4): Sa = 0,7·I·SaV/RV·(0,05/ξV)^0,4,
// SaV = S·Ao·α(1,7·TV/T0), RV = 2,0 y ξV = 0,03 salvo justificación (5.4)
function sav2369v23(T, s, Ao, I, RV = 2, xiV = 0.03) {
  const S = T5_23.S[s], To = T5_23.To[s], p = T5_23.p[s];
  if (To === null) throw new Error('NCh2369:2023: suelo E requiere espectro de sitio (5.4.3)');
  if (!(xiV >= 0.02 - 1e-9 && xiV <= 0.05 + 1e-9)) throw new Error('NCh2369:2023: (0,05/ξ)^0,4 válido solo para 0,02 ≤ ξ ≤ 0,05');
  return 0.7 * I * S * Ao * alpha(1.7 * T, To, p) / RV * (0.05 / xiV) ** 0.4;
}
function sa2369v23(T, s, Ao, I, R, xi) {
  if (!(xi >= 0.02 - 1e-9 && xi <= 0.05 + 1e-9)) throw new Error('NCh2369:2023: (0,05/ξ)^0,4 válido solo para 0,02 ≤ ξ ≤ 0,05 (5.4.2)');
  if (!(R >= 1)) throw new Error('NCh2369:2023: R ≥ 1 (Tabla 6)');
  const S = T5_23.S[s], To = T5_23.To[s], p = T5_23.p[s];
  if (To === null) throw new Error('NCh2369:2023: suelo E requiere espectro de sitio (5.4.3)');
  const fx = (0.05 / xi) ** 0.4;
  const curve = (t) => 0.7 * I * 1.4 * S * Ao * alpha(t, To, p) / R * fx;   // ec. (1) con (3)
  const Smax = 2.75 * I * S * Ao / (R + 1) * fx;                             // ec. (1.1)
  // meseta = Smax entre T = 0 y la intersección con la rama descendente
  let tpk = To, best = 0; for (let t = 0.01; t <= 5 * To; t += To / 200) { const v = curve(t); if (v > best) { best = v; tpk = t; } }
  if (curve(tpk) <= Smax) return Math.min(curve(T), Smax);
  let a = tpk, b = 50; for (let i = 0; i < 80; i++) { const m = (a + b) / 2; if (curve(m) > Smax) a = m; else b = m; }
  return T <= a ? Smax : curve(T);
}

// ---------- análisis modal de edificio de cortante ----------
function jacobiEig(A) {
  const n = A.length, a = A.map(r => r.slice()), V = a.map((r, i) => r.map((_, j) => (i === j ? 1 : 0)));
  for (let sweep = 0; sweep < 100; sweep++) {
    let off = 0; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += a[i][j] ** 2;
    if (off < 1e-22) break;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
      if (Math.abs(a[p][q]) < 1e-300) continue;
      const th = (a[q][q] - a[p][p]) / (2 * a[p][q]);
      const t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1)), c = 1 / Math.sqrt(t * t + 1), s = t * c;
      for (let k = 0; k < n; k++) { const akp = a[k][p], akq = a[k][q]; a[k][p] = c * akp - s * akq; a[k][q] = s * akp + c * akq; }
      for (let k = 0; k < n; k++) { const apk = a[p][k], aqk = a[q][k]; a[p][k] = c * apk - s * aqk; a[q][k] = s * apk + c * aqk; }
      for (let k = 0; k < n; k++) { const vkp = V[k][p], vkq = V[k][q]; V[k][p] = c * vkp - s * vkq; V[k][q] = s * vkp + c * vkq; }
    }
  }
  return { values: a.map((r, i) => r[i]), vectors: V };
}
const _modCache = new Map();
// P: pesos sísmicos por nivel (tonf), k: rigideces de entrepiso (tonf/m); nivel 1 = inferior
function modes(P, k) {
  const Pv = flat(P).map(x => nu(x, 'tonf')), kv = flat(k).map(x => nu(x, 'tonf/m'));
  const n = Pv.length;
  if (!n || kv.length !== n) throw new Error('Pesos y rigideces deben tener el mismo número de niveles');
  if (Pv.some(x => !(x > 0)) || kv.some(x => !(x > 0))) throw new Error('Pesos y rigideces deben ser positivos');
  const key = Pv.join(',') + '|' + kv.join(',');
  if (_modCache.has(key)) return _modCache.get(key);
  const m = Pv.map(x => x / G);                     // tonf·s²/m
  const K = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) { K[i][i] += kv[i]; if (i + 1 < n) { K[i][i] += kv[i + 1]; K[i][i + 1] = -kv[i + 1]; K[i + 1][i] = -kv[i + 1]; } }
  const A = K.map((r, i) => r.map((v, j) => v / Math.sqrt(m[i] * m[j])));
  const { values, vectors } = jacobiEig(A);
  const ord = values.map((v, i) => i).sort((x, y) => values[x] - values[y]);
  const Mt = m.reduce((s, x) => s + x, 0);
  const res = { n, w2: [], T: [], phi: Array.from({ length: n }, () => Array(n).fill(0)), gam: [], meff: [] };
  ord.forEach((jj, j) => {
    const w2 = values[jj]; let ph = vectors.map((r, i) => r[jj] / Math.sqrt(m[i]));
    const top = ph[n - 1] || ph.reduce((a, b) => (Math.abs(b) > Math.abs(a) ? b : a), 0);
    ph = ph.map(v => v / top);
    const L = ph.reduce((s, v, i) => s + v * m[i], 0), Mn = ph.reduce((s, v, i) => s + v * v * m[i], 0);
    res.w2.push(w2); res.T.push(2 * Math.PI / Math.sqrt(w2)); res.gam.push(L / Mn); res.meff.push(L * L / Mn / Mt);
    ph.forEach((v, i) => { res.phi[i][j] = v; });
  });
  if (_modCache.size > 200) _modCache.clear();
  _modCache.set(key, res);
  return res;
}
function rows(X) { const a = math.isMatrix(X) ? X.toArray() : X; if (!Array.isArray(a) || !Array.isArray(a[0])) throw new Error('Se esperaba una matriz (niveles × modos)'); return a; }
function cqc(X, T, xi = 0.05) {
  const a = rows(X), Tv = flat(T).map(sec), nm = a[0].length;
  if (Tv.length !== nm) throw new Error('El número de periodos debe coincidir con el número de columnas (modos)');
  const u0 = a.flat().find(v => math.isUnit(v)); const uName = u0 ? u0.formatUnits() : null;
  const rho = (i, j) => { const r = Tv[i] / Tv[j]; return 8 * xi * xi * r ** 1.5 / ((1 + r) * (1 - r) ** 2 + 4 * xi * xi * r * (1 + r)); };
  const out = a.map(row => {
    const x = row.map(v => (math.isUnit(v) ? v.toNumber(uName) : toNum(v)));
    let s = 0; for (let i = 0; i < nm; i++) for (let j = 0; j < nm; j++) s += rho(i, j) * x[i] * x[j];
    const v = Math.sqrt(Math.max(s, 0)); return uName ? mkUnit(v, uName) : v;
  });
  return math.matrix(out);
}

// =====================================================================
const FN433 = {
  // ---------------- NCh433 + DS61 ----------------
  AoNCh433: { fn: (z) => [0.20, 0.30, 0.40][zona(z) - 1], tex: 'A_0/g', desc: 'Aceleración efectiva Ao/g por zona sísmica 1, 2, 3 (NCh433 Tabla 6.2)', args: 'zona' },
  INCh433: { fn: (c) => { c = Math.round(toNum(c)); if (!(c >= 1 && c <= 4)) throw new Error('Categoría de ocupación I a IV (use 1–4)'); return [0.6, 1.0, 1.2, 1.2][c - 1]; }, tex: 'I', desc: 'Coeficiente de importancia por categoría I–IV (NCh433 Tabla 6.1, DS61)', args: 'categoría (1–4)' },
  SNCh433: { fn: (s) => T63.S[soil433(s)], tex: 'S', desc: 'Parámetro de suelo S (DS61 Tabla 6.3; suelo 1=A … 5=E)', args: 'suelo' },
  ToNCh433: { fn: (s) => mkUnit(T63.To[soil433(s)], 's'), tex: 'T_o', desc: 'Periodo To del suelo (DS61 Tabla 6.3)', args: 'suelo' },
  TpNCh433: { fn: (s) => mkUnit(T63.Tp[soil433(s)], 's'), tex: "T'", desc: "Periodo T' del suelo (DS61 Tabla 6.3)", args: 'suelo' },
  nNCh433: { fn: (s) => T63.n[soil433(s)], tex: 'n', desc: 'Exponente n del suelo (DS61 Tabla 6.3)', args: 'suelo' },
  pNCh433: { fn: (s) => T63.p[soil433(s)], tex: 'p', desc: 'Exponente p del suelo (DS61 Tabla 6.3)', args: 'suelo' },
  alphaNCh433: { fn: (T, To, p) => vmap(T, t => alpha(sec(t), sec(To), toNum(p))), tex: '\\alpha', desc: 'Factor de amplificación α(Tn) = (1+4.5(Tn/To)^p)/(1+(Tn/To)^3) (NCh433 ec. 6-9)', args: 'Tn, To, p' },
  SaNCh433: {
    fn: (T, S, To, p, Ao, Rs, I = 1) => vmap(T, t => toNum(I) * toNum(S) * toNum(Ao) * alpha(sec(t), sec(To), toNum(p)) / toNum(Rs)),
    tex: 'S_a/g', desc: 'Espectro de diseño Sa/g = S·Ao·α/(R*/I) (NCh433 ec. 6-8, DS61)', args: 'Tn, S, To, p, Ao/g, R*, I',
  },
  RstarNCh433: { fn: (Ts, To, Ro) => { Ts = sec(Ts); return 1 + Ts / (0.10 * sec(To) + Ts / toNum(Ro)); }, tex: 'R^{*}', desc: 'Factor de reducción R* = 1 + T*/(0.10To + T*/Ro) (NCh433 ec. 6-10)', args: 'T*, To, Ro' },
  RstarNNCh433: { fn: (N, To, Ro) => { N = toNum(N); Ro = toNum(Ro); return 1 + N * Ro / (4 * sec(To) * Ro + N); }, tex: 'R^{*}', desc: 'R* para edificios de muros en función del número de pisos N (NCh433 ec. 6-11)', args: 'N, To, Ro' },
  CNCh433: { fn: (Ts, S, Tp, n, Ao, R) => 2.75 * toNum(S) * toNum(Ao) / toNum(R) * (sec(Tp) / sec(Ts)) ** toNum(n), tex: 'C', desc: "Coeficiente sísmico C = 2.75·S·Ao/(g·R)·(T'/T*)^n sin límites (NCh433 ec. 6-2)", args: "T*, S, T', n, Ao/g, R" },
  CmaxNCh433: { fn: (R, S, Ao) => cmaxFactor(toNum(R)) * toNum(S) * toNum(Ao), tex: 'C_{max}', desc: 'Coeficiente sísmico máximo (NCh433 Tabla 6.4)', args: 'R, S, Ao/g' },
  CminNCh433: { fn: (S, Ao) => toNum(S) * toNum(Ao) / 6, tex: 'C_{min}', desc: 'Coeficiente sísmico mínimo Ao·S/(6g) (NCh433 6.2.3.1.1)', args: 'S, Ao/g' },
  fNCh433: { fn: (q) => { q = toNum(q); return 1.25 - 0.5 * Math.min(1, Math.max(0.5, q)); }, tex: 'f', desc: 'Factor de reducción de Cmax para edificios de muros f = 1.25 − 0.5q (NCh433 ec. 6-3)', args: 'q' },
  AkNCh433: {
    fn: (Z) => { const z = flat(Z).map(x => nu(x, 'm')), H = z[z.length - 1]; if (!(H > 0)) throw new Error('Alturas de nivel no válidas'); return math.matrix(z.map((zk, i) => Math.sqrt(1 - (i ? z[i - 1] : 0) / H) - Math.sqrt(1 - zk / H))); },
    tex: 'A_k', desc: 'Factores Ak = √(1−Zk−1/H) − √(1−Zk/H) de distribución en altura (NCh433 ec. 6-5)', args: 'vector Zk',
  },
  CdNCh433: { fn: (T, s) => vmap(T, t => cdStar(sec(t), soil433(s))), tex: 'C_d^{*}', desc: 'Parámetro Cd* del espectro de desplazamientos (NCh433 Tabla 6.5, DS61)', args: 'Tn, suelo' },
  SdeNCh433: {
    fn: (T, s, Ao) => vmap(T, t => { t = sec(t); const k = soil433(s); const A0 = toNum(Ao) * G * 100; return mkUnit(t * t / (4 * Math.PI ** 2) * alpha(t, T63.To[k], T63.p[k]) * A0 * cdStar(t, k), 'cm'); }),
    tex: 'S_{de}', desc: 'Espectro elástico de desplazamientos Sde = Tn²/(4π²)·α·Ao·Cd* (NCh433 ec. 6-12, DS61)', args: 'Tn, suelo, Ao/g',
  },
  // ---------------- NCh2369.Of2003 ----------------
  TpNCh2369: { fn: (s) => mkUnit(T54.Tp[soil2369(s)], 's'), tex: "T'", desc: "Periodo T' según suelo I–IV (NCh2369.Of2003 Tabla 5.4)", args: 'suelo (1–4)' },
  nNCh2369: { fn: (s) => T54.n[soil2369(s)], tex: 'n', desc: 'Exponente n según suelo I–IV (NCh2369.Of2003 Tabla 5.4)', args: 'suelo (1–4)' },
  INCh2369: { fn: (c) => { c = Math.round(toNum(c)); if (!(c >= 1 && c <= 3)) throw new Error('Categoría NCh2369: 1 = C1, 2 = C2, 3 = C3'); return [1.2, 1.0, 0.8][c - 1]; }, tex: 'I', desc: 'Coeficiente de importancia C1, C2, C3 (NCh2369 4.3.2)', args: 'categoría (1–3)' },
  CNCh2369: { fn: (Ts, Tp, n, Ao, R, xi) => 2.75 * toNum(Ao) / toNum(R) * (sec(Tp) / sec(Ts)) ** toNum(n) * (0.05 / toNum(xi)) ** 0.4, tex: 'C', desc: "C = 2.75·Ao/(g·R)·(T'/T*)^n·(0.05/ξ)^0.4 sin límites (NCh2369 ec. 5-2)", args: "T*, T', n, Ao/g, R, ξ" },
  CmaxNCh2369: { fn: (R, xi, Ao) => cmax2369(toNum(R), toNum(xi), toNum(Ao)), tex: 'C_{max}', desc: 'Coeficiente sísmico máximo (NCh2369 Tabla 5.7, ×0.75 zona 2, ×0.50 zona 1)', args: 'R, ξ, Ao/g' },
  CminNCh2369: { fn: (Ao) => 0.25 * toNum(Ao), tex: 'C_{min}', desc: 'Coeficiente sísmico mínimo 0.25·Ao/g (NCh2369 5.3.3.2)', args: 'Ao/g' },
  SaNCh2369: {
    fn: (T, Tp, n, Ao, I, R, xi) => { const cap = toNum(I) * cmax2369(toNum(R), toNum(xi), toNum(Ao)); return vmap(T, t => { t = sec(t); if (!(t > 0)) return cap; return Math.min(cap, 2.75 * toNum(Ao) * toNum(I) / toNum(R) * (sec(Tp) / t) ** toNum(n) * (0.05 / toNum(xi)) ** 0.4); }); },
    tex: 'S_a/g', desc: 'Espectro de diseño NCh2369.Of2003 (ec. 5-5) limitado a I·Cmax', args: "T, T', n, Ao/g, I, R, ξ",
  },
  SaNCh2369v23: {
    fn: (T, s, Ao, I, R, xi) => vmap(T, t => sa2369v23(sec(t), soil433(s), toNum(Ao), toNum(I), toNum(R), toNum(xi))),
    tex: 'S_a/g', desc: 'Espectro horizontal de diseño NCh2369:2023/2025 (ec. 1, 1.1 y 3; suelo 1=A … 4=D). Suelo D: la Tabla 5 (nota 2) exige espectro de sitio salvo R = 1 o naves livianas (12.2.5)', args: 'T, suelo, Ao/g, I, R, ξ',
  },
  SaVNCh2369v23: {
    fn: (T, s, Ao, I, RV = 2, xiV = 0.03) => vmap(T, t => sav2369v23(sec(t), soil433(s), toNum(Ao), toNum(I), toNum(RV), toNum(xiV))),
    tex: 'S_{aV}/g', desc: 'Espectro vertical de diseño NCh2369:2023/2025 (ec. 2 y 4): 0,7·I·S·Ao·α(1,7TV/T0)/RV·(0,05/ξV)^0,4, RV = 2, ξV = 0,03', args: 'TV, suelo, Ao/g, I, RV, ξV',
  },
  INCh2369v23: { fn: (c) => { c = Math.round(toNum(c)); if (!(c >= 1 && c <= 4)) throw new Error('Categoría de ocupación NCh2369:2023: I a IV (use 1–4)'); return [0.8, 1.0, 1.2, 1.2][c - 1]; }, tex: 'I', desc: 'Coeficiente de importancia NCh2369:2023 (4.3.2): cat. I 0,80; II 1,00; III y IV 1,20', args: 'categoría (1–4)' },
  CminNCh2369v23: { fn: (I, S, Ao) => 0.25 * toNum(I) * toNum(S) * toNum(Ao), tex: 'C_{min}', desc: 'Coeficiente sísmico mínimo NCh2369:2023 Cmín = 0,25·I·S·Ao/g (5.12.1, ec. 12-13)', args: 'I, S, Ao/g' },
  // ---------------- análisis modal espectral (edificio de cortante) ----------------
  TmodosCL: { fn: (P, k) => math.matrix(modes(P, k).T.map(t => mkUnit(t, 's'))), tex: 'T_n', desc: 'Periodos de un edificio de cortante (pesos P en tonf, rigideces k en tonf/m)', args: 'P, k' },
  phiModosCL: { fn: (P, k) => math.matrix(modes(P, k).phi), tex: '\\Phi', desc: 'Formas modales (columnas, φ = 1 en el nivel superior)', args: 'P, k' },
  GammaModosCL: { fn: (P, k) => math.matrix(modes(P, k).gam), tex: '\\Gamma_n', desc: 'Factores de participación modal Γn = φᵀM1/φᵀMφ', args: 'P, k' },
  MeffModosCL: { fn: (P, k) => math.matrix(modes(P, k).meff), tex: 'M_n^{*}/M', desc: 'Fracción de masa equivalente por modo (NCh433 ec. 6-6)', args: 'P, k' },
  FmodalCL: {
    fn: (P, k, Sa) => { const r = modes(P, k), sa = flat(Sa).map(toNum), Pv = flat(P).map(x => nu(x, 'tonf')); if (sa.length !== r.n) throw new Error('Sa debe tener un valor por modo'); return math.matrix(r.phi.map((row, i) => row.map((ph, j) => mkUnit(r.gam[j] * ph * Pv[i] * sa[j], 'tonf')))); },
    tex: 'F_{in}', desc: 'Fuerzas modales Fin = Γn·φin·Pi·San (matriz niveles × modos)', args: 'P, k, Sa/g',
  },
  UmodalCL: {
    fn: (P, k, Sa) => { const r = modes(P, k), sa = flat(Sa).map(toNum); if (sa.length !== r.n) throw new Error('Sa debe tener un valor por modo'); return math.matrix(r.phi.map(row => row.map((ph, j) => mkUnit(r.gam[j] * ph * sa[j] * G / r.w2[j] * 100, 'cm')))); },
    tex: 'u_{in}', desc: 'Desplazamientos modales uin = Γn·φin·San·g/ωn² (matriz niveles × modos)', args: 'P, k, Sa/g',
  },
  cortesCL: {
    fn: (F) => { const a = rows(F), n = a.length; return math.matrix(a.map((row, i) => row.map((_, j) => { let s = a[i][j]; for (let q = i + 1; q < n; q++) s = math.add(s, a[q][j]); return s; }))); },
    tex: 'V', desc: 'Cortes de entrepiso por modo (suma desde el nivel superior)', args: 'F (niveles × modos)',
  },
  entrepisoCL: {
    fn: (U) => { const a = rows(U); return math.matrix(a.map((row, i) => row.map((v, j) => (i ? math.subtract(v, a[i - 1][j]) : v)))); },
    tex: '\\Delta', desc: 'Desplazamientos relativos de entrepiso por modo', args: 'U (niveles × modos)',
  },
  cqcNCh433: { fn: (X, T, xi = 0.05) => cqc(X, T, toNum(xi)), tex: '\\mathrm{CQC}', desc: 'Combinación modal CQC con ρij de NCh433 ec. 6-14 (ξ = 0.05)', args: 'X (niveles × modos), Tn, ξ' },
};
defineFns(FN433, 'Sismo — Chile');

// =====================================================================
//  NCh433:2026 — Diseño sísmico de edificios (D.Ex. N° 28 MINVU, D.O. 10-08-2026;
//  vigente seis meses después, ≈ 10-02-2027; reemplaza a NCh433 Mod.2009 + DS61).
//  Texto técnico de referencia: prNCh433 en consulta pública (INN, 2022), 4.2.2–4.2.3 y
//  Tablas 2, 4–9. El espectro (Tabla 7), Ao, I, Cmáx y R* se mantienen iguales a DS61
//  (confirmado en el seminario UANDES/AICE/ACHISINA/SOCHIGE 2026). La clasificación del
//  sitio agrega el periodo predominante Tg (H/V, Nakamura). Ver docs/referencias/chile-2026.md.
// =====================================================================
// Tabla 2 (prNCh433): Vs30 mínimo y Tg máximo (exclusivo) por tipo A..D; E: Vs30 < 180 m/s, sin Tg
const VS26 = [900, 500, 350, 180], TG26 = [0.15, 0.30, 0.40, 1.00];
function vs30(v) { const x = math.isUnit(v) ? v.toNumber('m/s') : toNum(v); if (!(x > 0)) throw new Error('Vs30 debe ser positivo (m/s)'); return x; }
function sueloVs26(V) { const k = VS26.findIndex(l => V >= l); return k < 0 ? 4 : k; }   // índice 0..4
// Clasificación 4.2.3.1: primera clasificación por Vs30; si Tg no cumple el límite de esa clase,
// se degrada UN nivel. Tg = 0 representa «H/V plano» (sin periodo predominante), que cumple.
function suelo26(V, Tg) {
  const k = sueloVs26(V);
  if (!(Tg >= 0)) throw new Error('Tg debe ser ≥ 0 s (use 0 para H/V plano)');
  if (k <= 3 && Tg > 0 && Tg >= TG26[k]) return k + 1;
  return k;
}
const v26 = (name, desc) => ({ ...FN433[name], desc: desc + ' — NCh433:2026 (igual que DS61; ver chile-2026.md)' });


defineFns({
  sueloVsNCh433v26: { fn: (V) => sueloVs26(vs30(V)) + 1, tex: '\\mathrm{suelo}_{V_s}', desc: 'Primera clasificación del sitio solo por Vs30 (NCh433:2026, Tabla 2 del prNCh433): 1=A ≥ 900, 2=B ≥ 500, 3=C ≥ 350, 4=D ≥ 180, 5=E < 180 m/s', args: 'Vs30' },
  sueloNCh433v26: { fn: (V, Tg) => suelo26(vs30(V), sec(Tg)) + 1, tex: '\\mathrm{suelo}', desc: 'Clasificación sísmica del sitio NCh433:2026 con Vs30 y Tg (H/V): si Tg ≥ límite de la clase (A 0,15; B 0,30; C 0,40; D 1,00 s) se degrada un nivel (4.2.3.1). Tg = 0 → H/V plano', args: 'Vs30, Tg' },
  TgLimNCh433v26: { fn: (s) => { const k = soil433(s); if (k > 3) throw new Error('Suelo E: la Tabla 2 no limita Tg'); return mkUnit(TG26[k], 's'); }, tex: 'T_{g,lím}', desc: 'Periodo predominante máximo (exclusivo) de cada clase A–D (NCh433:2026, Tabla 2 del prNCh433)', args: 'suelo (1–4)' },
  AoNCh433v26: v26('AoNCh433', 'Ao/g por zona 1, 2, 3'),
  INCh433v26: v26('INCh433', 'Coeficiente I por categoría I–IV (0,6; 1,0; 1,2; 1,2)'),
  SNCh433v26: v26('SNCh433', 'Parámetro S del suelo'),
  ToNCh433v26: v26('ToNCh433', 'Periodo To del suelo'),
  TpNCh433v26: v26('TpNCh433', "Periodo T' del suelo"),
  nNCh433v26: v26('nNCh433', 'Exponente n del suelo'),
  pNCh433v26: v26('pNCh433', 'Exponente p del suelo'),
  alphaNCh433v26: v26('alphaNCh433', 'Factor de amplificación α(Tn)'),
  SaNCh433v26: v26('SaNCh433', 'Espectro de diseño Sa/g = S·Ao·α/(R*/I)'),
  RstarNCh433v26: v26('RstarNCh433', 'R* = 1 + T*/(0,10·To + T*/Ro)'),
  CNCh433v26: v26('CNCh433', "C = 2,75·S·Ao/(g·R)·(T'/T*)^n"),
  CmaxNCh433v26: v26('CmaxNCh433', 'Cmáx según R (0,90 … 0,35)·S·Ao/g'),
  CminNCh433v26: v26('CminNCh433', 'Cmín = Ao·S/(6g)'),
  fNCh433v26: v26('fNCh433', 'Factor f = 1,25 − 0,5q de muros de H.A.'),
  AkNCh433v26: v26('AkNCh433', 'Factores Ak de distribución en altura'),
  SdeNCh433v26: v26('SdeNCh433', 'Espectro elástico de desplazamientos Sde'),
}, 'Sismo — Chile');

// =====================================================================
//  Viento — NCh432
// =====================================================================
// Exposición: 1 = B, 2 = C, 3 = D (NCh432:2010, procedimiento analítico tipo ASCE 7-05 cap. 6)
const EXP = { B: { a: 7.0, zg: 365.76 }, C: { a: 9.5, zg: 274.32 }, D: { a: 11.5, zg: 213.36 } };
function expo(e) { if (typeof e === 'string') { const k = e.trim().toUpperCase(); if (!EXP[k]) throw new Error('Exposición B, C o D'); return EXP[k]; } e = Math.round(toNum(e)); if (!(e >= 1 && e <= 3)) throw new Error('Exposición: 1 = B, 2 = C, 3 = D'); return EXP['BCD'[e - 1]]; }
const kgm2 = (v) => { const u = mkUnit(v, 'kgf/m^2'); fixedUnits.set(u, 'kgf/m^2'); return u; };
const kz = (z, e) => { const E = expo(e); return 2.01 * (Math.max(z, 4.6) / E.zg) ** (2 / E.a); };
// Cp techo barlovento/sotavento, viento normal a la cumbrera (ASCE 7-05 Fig. 6-6, adoptada en NCh432:2010)
const TH = [10, 15, 20, 25, 30, 35, 45];
const CPW = { 0.25: [[-0.7, -0.18], [-0.5, 0.0], [-0.3, 0.2], [-0.2, 0.3], [-0.2, 0.3], [0.0, 0.4], [0.0, 0.4]], 0.5: [[-0.9, -0.18], [-0.7, -0.18], [-0.4, 0.0], [-0.3, 0.2], [-0.2, 0.2], [-0.2, 0.3], [0.0, 0.4]], 1.0: [[-1.3, -0.18], [-1.0, -0.18], [-0.7, -0.18], [-0.5, 0.0], [-0.3, 0.2], [-0.2, 0.2], [0.0, 0.3]] };
const CPL = { 0.25: [-0.3, -0.5, -0.6], 0.5: [-0.5, -0.5, -0.6], 1.0: [-0.7, -0.6, -0.6] };
function cpRoof(th, hL, caso, lee) {
  hL = Math.min(Math.max(hL, 0.25), 1.0);
  // θ < 10°: ASCE 7-05 Fig. 6-6 da Cp según la distancia desde el borde de barlovento
  // (0–h/2: −0.9 / −1.3; h–2h: −0.5 / −0.7; > 2h: −0.3 / −0.7, para h/L ≤ 0.5 / ≥ 1.0).
  // Envolvente conservadora: faldón de barlovento con el valor del borde (0–h/2) y
  // faldón de sotavento con el de la zona h–2h. Caso 2 (mínima succión): −0.18.
  if (th < 10) {
    if (!lee && caso === 2) return -0.18;
    const k = hL <= 0.5 ? 0 : (hL - 0.5) / 0.5;
    return lee ? -0.5 - 0.2 * k : -0.9 - 0.4 * k;
  }
  const byHL = (k) => (lee ? interp1(th, [10, 15, 20], CPL[k]) : interp1(th, TH, CPW[k].map(r => r[caso === 2 ? 1 : 0])));
  return interp1(hL, [0.25, 0.5, 1.0], [byHL(0.25), byHL(0.5), byHL(1.0)]);
}
// NCh432.Of71 Tabla 1: presión básica q [kgf/m²] vs altura
const Q71 = { 1: { z: [0, 15, 20, 30, 40, 50, 75, 100, 150, 200, 300], q: [55, 75, 85, 95, 103, 108, 121, 131, 149, 162, 186] }, 2: { z: [0, 4, 7, 10, 15, 20, 30, 40, 50, 75, 100, 150, 200, 300], q: [70, 70, 95, 106, 118, 126, 137, 145, 151, 163, 170, 182, 191, 209] } };

defineFns({
  KzNCh432: { fn: (z, e) => vmap(z, x => kz(nu(x, 'm'), e)), tex: 'K_z', desc: 'Coeficiente de exposición Kz = 2.01(z/zg)^(2/α), z ≥ 4.6 m (NCh432:2010, exposición 1=B, 2=C, 3=D)', args: 'z, exposición' },
  qzNCh432: {
    fn: (z, V, e, I = 1, Kzt = 1, Kd = 0.85) => vmap(z, x => kgm2(0.613 * kz(nu(x, 'm'), e) * toNum(Kzt) * toNum(Kd) * nu(V, 'm/s') ** 2 * toNum(I) / G)),
    tex: 'q_z', desc: 'Presión por velocidad qz = 0.613·Kz·Kzt·Kd·V²·I [N/m², se muestra en kgf/m²] (NCh432:2010)', args: 'z, V, exposición, I, Kzt, Kd',
  },
  CpTechoNCh432: { fn: (th, hL, caso = 1) => cpRoof(nu(th, 'deg'), toNum(hL), Math.round(toNum(caso)), false), tex: 'C_{p,b}', desc: 'Cp del techo a barlovento, viento normal a la cumbrera (caso 1 succión, 2 presión)', args: 'θ, h/L, caso' },
  CpTechoSotNCh432: { fn: (th, hL) => cpRoof(nu(th, 'deg'), toNum(hL), 1, true), tex: 'C_{p,s}', desc: 'Cp del techo a sotavento, viento normal a la cumbrera', args: 'θ, h/L' },
  CpMuroSotNCh432: { fn: (LB) => interp1(toNum(LB), [1, 2, 4], [-0.5, -0.3, -0.2]), tex: 'C_{p,sot}', desc: 'Cp del muro de sotavento según L/B (−0.5, −0.3, −0.2)', args: 'L/B' },
  qNCh432Of71: { fn: (z, tipo = 1) => { const t = Q71[Math.round(toNum(tipo))]; if (!t) throw new Error('Tipo: 1 = ciudad, 2 = campo abierto / frente al mar'); return vmap(z, x => kgm2(interp1(nu(x, 'm'), t.z, t.q))); }, tex: 'q', desc: 'Presión básica NCh432.Of71 Tabla 1 (1 ciudad, 2 campo abierto)', args: 'z, tipo' },
}, 'Viento — Chile');
