// Reference implementations (JS puro) to generate verified numbers for algoritmos.md
import fs from 'fs';
const PI = Math.PI;

// ---------- Newmark linear SDOF (Chopra Table 5.4.2) ----------
export function newmarkLinear({ m, c, k, p, dt, gamma = 0.5, beta = 0.25, u0 = 0, v0 = 0 }) {
  const n = p.length; const u = new Float64Array(n), v = new Float64Array(n), a = new Float64Array(n);
  u[0] = u0; v[0] = v0; a[0] = (p[0] - c * v0 - k * u0) / m;
  const a1 = m / (beta * dt * dt) + gamma * c / (beta * dt);
  const a2 = m / (beta * dt) + (gamma / beta - 1) * c;
  const a3 = (1 / (2 * beta) - 1) * m + dt * (gamma / (2 * beta) - 1) * c;
  const kh = k + a1;
  for (let i = 0; i < n - 1; i++) {
    const ph = p[i + 1] + a1 * u[i] + a2 * v[i] + a3 * a[i];
    u[i + 1] = ph / kh;
    v[i + 1] = gamma / (beta * dt) * (u[i + 1] - u[i]) + (1 - gamma / beta) * v[i] + dt * (1 - gamma / (2 * beta)) * a[i];
    a[i + 1] = (u[i + 1] - u[i]) / (beta * dt * dt) - v[i] / (beta * dt) - (1 / (2 * beta) - 1) * a[i];
  }
  return { u, v, a };
}

// ---------- Newmark nonlinear SDOF with Newton-Raphson (Chopra Table 5.7.1/5.7.2), elastoplastic spring ----------
export function newmarkEP({ m, c, k, fy, p, dt, gamma = 0.5, beta = 0.25, tol = 1e-3, maxit = 50 }) {
  const n = p.length; const u = new Float64Array(n), v = new Float64Array(n), a = new Float64Array(n), fs = new Float64Array(n);
  let up = 0; // plastic displacement
  const spring = (ui) => { let f = k * (ui - up); let kt = k; if (f > fy) { f = fy; kt = 0; } else if (f < -fy) { f = -fy; kt = 0; } return { f, kt }; };
  a[0] = (p[0] - c * v[0] - fs[0]) / m;
  const a1 = m / (beta * dt * dt) + gamma * c / (beta * dt);
  const a2 = m / (beta * dt) + (gamma / beta - 1) * c;
  const a3 = (1 / (2 * beta) - 1) * m + dt * (gamma / (2 * beta) - 1) * c;
  for (let i = 0; i < n - 1; i++) {
    let uj = u[i]; let st = spring(uj); let it = 0;
    const ph = p[i + 1] + a1 * u[i] + a2 * v[i] + a3 * a[i];
    while (true) {
      st = spring(uj);
      const R = ph - st.f - a1 * uj;
      if (Math.abs(R) < tol || it > maxit) break;
      const kT = st.kt + a1; uj += R / kT; it++;
    }
    st = spring(uj);
    // commit plastic state
    if (st.f === fy) up = uj - fy / k; else if (st.f === -fy) up = uj + fy / k;
    u[i + 1] = uj; fs[i + 1] = st.f;
    v[i + 1] = gamma / (beta * dt) * (u[i + 1] - u[i]) + (1 - gamma / beta) * v[i] + dt * (1 - gamma / (2 * beta)) * a[i];
    a[i + 1] = (u[i + 1] - u[i]) / (beta * dt * dt) - v[i] / (beta * dt) - (1 / (2 * beta) - 1) * a[i];
  }
  return { u, v, a, fs };
}

// ---------- Piecewise exact (Nigam-Jennings / Chopra 5.2) coefficients ----------
export function nigamJenningsSpectrum(ag, dt, periods, zeta) {
  // ag in any accel unit (e.g. g); returns D (same unit*s^2), PSA = w^2 D, SA (absolute accel max)
  const out = [];
  for (const T of periods) {
    const w = 2 * PI / T, wd = w * Math.sqrt(1 - zeta * zeta);
    const E = Math.exp(-zeta * w * dt), S = Math.sin(wd * dt), C = Math.cos(wd * dt);
    const sq = Math.sqrt(1 - zeta * zeta);
    const k = w * w; // unit mass, so p = -ag
    // Chopra Table 5.2.1 coefficients (k = w^2, m = 1)
    const A = E * (zeta / sq * S + C);
    const B = E * (S / wd);
    const Cc = (1 / k) * (2 * zeta / (w * dt) + E * (((1 - 2 * zeta * zeta) / (wd * dt) - zeta / sq) * S - (1 + 2 * zeta / (w * dt)) * C));
    const D = (1 / k) * (1 - 2 * zeta / (w * dt) + E * ((2 * zeta * zeta - 1) / (wd * dt) * S + 2 * zeta / (w * dt) * C));
    const Ap = -E * (w / sq * S);
    const Bp = E * (C - zeta / sq * S);
    const Cp = (1 / k) * (-1 / dt + E * ((w / sq + zeta / (dt * sq)) * S + 1 / dt * C));
    const Dp = (1 / (k * dt)) * (1 - E * (zeta / sq * S + C));
    let u = 0, v = 0, umax = 0, atmax = 0;
    for (let i = 0; i < ag.length - 1; i++) {
      const p0 = -ag[i], p1 = -ag[i + 1];
      const un = A * u + B * v + Cc * p0 + D * p1;
      const vn = Ap * u + Bp * v + Cp * p0 + Dp * p1;
      u = un; v = vn;
      const at = -(2 * zeta * w * v + w * w * u); // absolute acceleration
      if (Math.abs(u) > umax) umax = Math.abs(u);
      if (Math.abs(at) > atmax) atmax = Math.abs(at);
    }
    out.push({ T, D: umax, PSA: w * w * umax, PSV: w * umax, SA: atmax });
  }
  return out;
}

// ---------- Jacobi generalized eigen (K phi = w2 M phi) via Cholesky + classical Jacobi ----------
export function cholesky(A) { const n = A.length; const L = A.map(r => r.map(() => 0)); for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) { let s = A[i][j]; for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k]; L[i][j] = i === j ? Math.sqrt(s) : s / L[j][j]; } return L; }
export function jacobiSym(Ain, tol = 1e-12, maxSweep = 100) {
  const n = Ain.length; const A = Ain.map(r => r.slice()); const V = A.map((r, i) => r.map((_, j) => +(i === j)));
  for (let sw = 0; sw < maxSweep; sw++) {
    let off = 0; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += A[i][j] ** 2;
    if (Math.sqrt(off) < tol) break;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
      if (Math.abs(A[p][q]) < 1e-300) continue;
      const th = (A[q][q] - A[p][p]) / (2 * A[p][q]);
      const t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1));
      const c = 1 / Math.sqrt(t * t + 1), s = t * c;
      for (let k = 0; k < n; k++) { const akp = A[k][p], akq = A[k][q]; A[k][p] = c * akp - s * akq; A[k][q] = s * akp + c * akq; }
      for (let k = 0; k < n; k++) { const apk = A[p][k], aqk = A[q][k]; A[p][k] = c * apk - s * aqk; A[q][k] = s * apk + c * aqk; }
      for (let k = 0; k < n; k++) { const vkp = V[k][p], vkq = V[k][q]; V[k][p] = c * vkp - s * vkq; V[k][q] = s * vkp + c * vkq; }
    }
  }
  return { vals: A.map((r, i) => r[i]), vecs: V };
}
function lowerSolve(L, b) { const n = L.length, x = new Array(n); for (let i = 0; i < n; i++) { let s = b[i]; for (let k = 0; k < i; k++) s -= L[i][k] * x[k]; x[i] = s / L[i][i]; } return x; }
function upperSolveT(L, b) { const n = L.length, x = new Array(n); for (let i = n - 1; i >= 0; i--) { let s = b[i]; for (let k = i + 1; k < n; k++) s -= L[k][i] * x[k]; x[i] = s / L[i][i]; } return x; }
export function geneig(K, M) {
  const n = K.length; const L = cholesky(M);
  // A = L^-1 K L^-T
  const X = K.map((_, j) => lowerSolve(L, K.map(r => r[j]))); // columns of L^-1 K  (X[j] = column j)
  const Y = []; for (let i = 0; i < n; i++) { const row = X.map(col => col[i]); Y.push(lowerSolve(L, row)); } // (L^-1 (L^-1 K)^T) = L^-1 K^T L^-T
  const A = Y; const { vals, vecs } = jacobiSym(A);
  const idx = vals.map((v, i) => i).sort((a, b) => vals[a] - vals[b]);
  const modes = idx.map(i => { const y = vecs.map(r => r[i]); const phi = upperSolveT(L, y); return { w2: vals[i], phi }; });
  return modes; // phi mass-normalized
}

// ---------- CQC ----------
export function rhoCQC(wi, wj, zi, zj) {
  const b = wj / wi; // Der Kiureghian (1981) with different damping
  const num = 8 * Math.sqrt(zi * zj) * (zi + b * zj) * Math.pow(b, 1.5);
  const den = (1 - b * b) ** 2 + 4 * zi * zj * b * (1 + b * b) + 4 * (zi * zi + zj * zj) * b * b;
  return num / den;
}
export const cqc = (r, w, z) => { let s = 0; for (let i = 0; i < r.length; i++) for (let j = 0; j < r.length; j++) s += rhoCQC(w[i], w[j], z, z) * r[i] * r[j]; return Math.sqrt(s); };

// ---------- Mander ----------
export function manderRect({ fco, ecoi = 0.002, Ec, flx, fly }) {
  // simplified equal lateral pressure version: fl = min/mean
  const fl = (flx + fly) / 2; // use only when flx≈fly; else use chart
  const fcc = fco * (-1.254 + 2.254 * Math.sqrt(1 + 7.94 * fl / fco) - 2 * fl / fco);
  const ecc = ecoi * (1 + 5 * (fcc / fco - 1));
  const Esec = fcc / ecc, r = Ec / (Ec - Esec);
  const sig = (ec) => { const x = ec / ecc; return fcc * x * r / (r - 1 + Math.pow(x, r)); };
  return { fcc, ecc, r, sig };
}
