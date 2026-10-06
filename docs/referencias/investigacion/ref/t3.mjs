import { geneig } from './alg.mjs';
const f = (x, n = 3) => (+x).toFixed(n);
// ================= ATC-40 CSM Procedure (bilinear equal-area each trial) =================
function atc40({ cap, Ca, Cv, type = 'A' }) {
  // cap: [[Sd(mm), Sa(m/s2)],...] starting at origin implied
  const pts = [[0, 0], ...cap];
  const g = 9.80665;
  const SaCap = d => { for (let i = 1; i < pts.length; i++) if (d <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return y0 + (y1 - y0) * (d - x0) / (x1 - x0); } return pts[pts.length - 1][1]; };
  const area = d => { let A = 0; for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1]; const x1 = Math.min(pts[i][0], d); if (x1 <= x0) break; const y1 = SaCap(x1); A += (y0 + y1) / 2 * (x1 - x0); } return A; };
  const k0 = pts[1][1] / pts[1][0];
  const Ts = Cv / (2.5 * Ca);
  // demand (ADRS) reduced: Sa(T) [g] = min(2.5Ca*SRA, Cv*SRV/T); Sd = Sa*g*T^2/4pi^2 (mm)
  const demandIntersect = (SRA, SRV) => {
    // find d where capacity meets demand: march along capacity, compute T of secant and compare
    let lo = 1e-3, hi = pts[pts.length - 1][0];
    const fun = d => { const a = SaCap(d); const T = 2 * Math.PI * Math.sqrt(d / 1000 / a); const Sdem = Math.min(2.5 * Ca * SRA, Cv * SRV / T) * g; return a - Sdem; };
    for (let it = 0; it < 200; it++) { const mid = (lo + hi) / 2; if (fun(lo) * fun(mid) <= 0) hi = mid; else lo = mid; }
    return (lo + hi) / 2;
  };
  let dpi = demandIntersect(1, 1); // elastic start
  let res;
  for (let it = 0; it < 100; it++) {
    const api = SaCap(dpi); const A = area(dpi);
    // bilinear: (0,0)-(dy,k0 dy)-(dpi,api) equal area: A = k0 dy^2/2 + (k0 dy + api)/2 (dpi - dy)
    // => k0 dy^2/2 + (k0 dy+api)(dpi-dy)/2 = A -> -k0 dy^2/2 ... solve: (k0 dy dpi - api dy + api dpi)/2 = A
    const dy = (2 * A - api * dpi) / (k0 * dpi - api); const ay = k0 * dy;
    const X = (ay * dpi - dy * api) / (api * dpi);
    const b0 = 63.7 * X; // %
    let kap = 1; if (type === 'A') kap = b0 <= 16.25 ? 1.0 : 1.13 - 0.51 * X; else if (type === 'B') kap = b0 <= 25 ? 0.67 : 0.845 - 0.446 * X; else kap = 0.33;
    const beff = kap * b0 + 5;
    const lim={A:[0.33,0.5],B:[0.44,0.56],C:[0.56,0.67]}[type]; const SRA = Math.max((3.21 - 0.68 * Math.log(beff)) / 2.12, lim[0]), SRV = Math.max((2.31 - 0.41 * Math.log(beff)) / 1.65, lim[1]);
    const dnew = demandIntersect(SRA, SRV);
    res = { dpi: dnew, api: SaCap(dnew), dy, ay, beff, SRA, SRV, kap, it };
    if (Math.abs(dnew - dpi) / dpi < 1e-4) break;
    dpi = dnew;
  }
  return res;
}
const cap = [[48.77, 2.49], [71.37, 3.03], [96.01, 3.39], [199.14, 3.73]];
for (const [name, Ca, Cv] of [['SB', 0.40, 0.40], ['SD', 0.44, 0.64]]) {
  for (const type of ['A','B','C']) { const r = atc40({ cap, Ca, Cv, type });
  console.log('ATC40', name, type, 'beff', f(r.beff, 2), 'SRA', f(r.SRA), 'SRV', f(r.SRV), 'Sdy', f(r.dy, 2), 'Say', f(r.ay, 3), 'Sdp', f(r.dpi, 2), 'Sap', f(r.api, 3), 'kappa', f(r.kap)); }
}

// ================= Shear building pushover (bilinear springs, analytical) + N2 =================
const g = 9.81;
const masses = [100, 100, 80]; // t  (kN s2/m)
const kst = [80000, 70000, 60000]; // kN/m storey stiffness
const Vy = [1500, 1300, 1000]; // kN storey yield shear
const alpha = 0.05; const h = [3.5, 3, 3];
const n = 3;
const K = Array.from({ length: n }, () => Array(n).fill(0));
for (let i = 0; i < n; i++) { K[i][i] += kst[i]; if (i + 1 < n) { K[i][i] += kst[i + 1]; K[i][i + 1] -= kst[i + 1]; K[i + 1][i] -= kst[i + 1]; } }
const M = masses.map((m, i) => masses.map((_, j) => i === j ? m : 0));
const modes = geneig(K, M); const phi = modes[0].phi; const T1 = 2 * Math.PI / Math.sqrt(modes[0].w2);
const phin = phi.map(x => x / phi[n - 1]);
const mstar = masses.reduce((s, m, i) => s + m * phin[i], 0); const Gam = mstar / masses.reduce((s, m, i) => s + m * phin[i] ** 2, 0);
console.log('SB T1', f(T1, 4), 'T2', f(2 * Math.PI / Math.sqrt(modes[1].w2), 4), 'phi', phin.map(x => f(x, 4)).join(','), 'm*', f(mstar, 2), 'Gamma', f(Gam, 4));
// pushover with load pattern s = m*phi (N2 uses this). storey shear S_i = sum_{j>=i} s_j
const s = masses.map((m, i) => m * phin[i]);
const Sx = s.map((_, i) => s.slice(i).reduce((a, b) => a + b, 0));
const drift = (V, i) => V <= Vy[i] ? V / kst[i] : Vy[i] / kst[i] + (V - Vy[i]) / (alpha * kst[i]);
const curve = [];
for (let lam = 0; lam <= 1; lam += 0.0005) { const Vb = lam * Sx[0] * 10; let d = 0; for (let i = 0; i < n; i++) d += drift(lam * 10 * Sx[i], i); curve.push([d, Vb]); }
// first yield
const lamy = Math.min(...Vy.map((v, i) => v / (10 * Sx[i])));
const ifirst = Vy.map((v, i) => v / (10 * Sx[i])).indexOf(lamy);
let dyr = 0; for (let i = 0; i < n; i++) dyr += drift(lamy * 10 * Sx[i], i);
console.log('first yield storey', ifirst + 1, 'Vb', f(lamy * 10 * Sx[0], 1), 'droof', f(dyr * 1000, 2), 'mm');
// N2 EC8: Type 1 spectrum, ag = 0.30 g, soil C: S=1.15, TB=0.20, TC=0.60, TD=2.0, eta=1
const ag = 0.30 * g, S = 1.15, TB = 0.2, TC = 0.6, TD = 2.0;
const Se = T => T < TB ? ag * S * (1 + T / TB * 1.5) : T < TC ? ag * S * 2.5 : T < TD ? ag * S * 2.5 * TC / T : ag * S * 2.5 * TC * TD / T / T;
// SDOF curve
const sd = curve.map(([d, V]) => [d / Gam, V / Gam]);
const Fs = d => { for (let i = 1; i < sd.length; i++) if (d <= sd[i][0]) { const [x0, y0] = sd[i - 1], [x1, y1] = sd[i]; return y0 + (y1 - y0) * (d - x0) / (x1 - x0); } return sd[sd.length - 1][1]; };
const areaS = dm => { let A = 0; for (let i = 1; i < sd.length && sd[i - 1][0] < dm; i++) { const x1 = Math.min(sd[i][0], dm); A += (sd[i - 1][1] + Fs(x1)) / 2 * (x1 - sd[i - 1][0]); } return A; };
let dm = 0.1; let out;
for (let it = 0; it < 50; it++) {
  const Fy = Fs(dm); const Em = areaS(dm); const dy = 2 * (dm - Em / Fy); // EC8 B.3
  const Tst = 2 * Math.PI * Math.sqrt(mstar * dy / Fy);
  const det = Se(Tst) * (Tst / (2 * Math.PI)) ** 2;
  let dt; const qu = Se(Tst) * mstar / Fy;
  if (Tst >= TC || qu <= 1) dt = det; else dt = Math.max(det / qu * (1 + (qu - 1) * TC / Tst), det);
  out = { Fy, dy, Tst, det, dt, qu, it };
  if (Math.abs(dt - dm) / dt < 1e-5) break; dm = dt;
}
console.log('N2 Fy*', f(out.Fy, 1), 'kN dy*', f(out.dy * 1000, 2), 'mm T*', f(out.Tst, 4), 'Se(T*)/g', f(Se(out.Tst) / g, 4), 'qu', f(out.qu, 3), 'det*', f(out.det * 1000, 2), 'dt*', f(out.dt * 1000, 2), 'mm  droof', f(out.dt * Gam * 1000, 2), 'mm iters', out.it);
// storey drifts at target
{ const target = out.dt * Gam; let lo = 0, hi = 1; for (let k = 0; k < 100; k++) { const mid = (lo + hi) / 2; let d = 0; for (let i = 0; i < n; i++) d += drift(mid * 10 * Sx[i], i); if (d < target) lo = mid; else hi = mid; } const lam = lo; console.log('  at target Vb', f(lam * 10 * Sx[0], 1), 'drifts mm', Sx.map((x, i) => f(drift(lam * 10 * x, i) * 1000, 2)).join(','), 'ratios', Sx.map((x, i) => f(drift(lam * 10 * x, i) / h[i], 5)).join(',')); }

// ================= Static condensation: portal frame lateral stiffness =================
function portalK(EIc, h, EIb, L) {
  // DOFs: u (lateral, shared, beam axially rigid), th1, th2 (joint rotations). columns fixed at base.
  const kc = [[12 * EIc / h ** 3, 6 * EIc / h ** 2], [6 * EIc / h ** 2, 4 * EIc / h]]; // (u, theta at top) for fixed-base column
  const Ktt = [[4 * EIc / h + 4 * EIb / L, 2 * EIb / L], [2 * EIb / L, 4 * EIc / h + 4 * EIb / L]];
  const Kuu = 2 * kc[0][0]; const Kut = [kc[0][1], kc[0][1]];
  // condense: k = Kuu - Kut Ktt^-1 Kut^T
  const det = Ktt[0][0] * Ktt[1][1] - Ktt[0][1] ** 2; const inv = [[Ktt[1][1] / det, -Ktt[0][1] / det], [-Ktt[1][0] / det, Ktt[0][0] / det]];
  const x = [inv[0][0] * Kut[0] + inv[0][1] * Kut[1], inv[1][0] * Kut[0] + inv[1][1] * Kut[1]];
  return Kuu - (Kut[0] * x[0] + Kut[1] * x[1]);
}
for (const rho of [0, 0.125, 0.5, 1, 1e6]) { const h0 = 1, EIc = 1, L = 2, EIb = rho * 2 * EIc / h0 * L; const kk = portalK(EIc, h0, EIb, L); console.log('portal rho', rho, 'k*h3/EIc', f(kk, 4), 'Chopra 24(12r+1)/(12r+4)', f(24 * (12 * rho + 1) / (12 * rho + 4), 4)); }

// ================= Rayleigh =================
{ const w1 = 2 * Math.PI / 1.0, w3 = 2 * Math.PI / 0.2, z = 0.05; const a0 = z * 2 * w1 * w3 / (w1 + w3), a1 = z * 2 / (w1 + w3); console.log('Rayleigh T=1.0/0.2 z=5%: a0', f(a0, 5), 'a1', f(a1, 6), 'zeta(T=0.5)', f(a0 / (2 * 2 * Math.PI / 0.5) + a1 * (2 * Math.PI / 0.5) / 2, 5)); }

// ================= P-Delta shear building (geometric stiffness) =================
{ // 3-storey above, gravity P per storey = cumulative weight above
  const W = masses.map(m => m * g); const P = W.map((_, i) => W.slice(i).reduce((a, b) => a + b, 0));
  const Kg = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) { const kg = P[i] / h[i]; Kg[i][i] += kg; if (i > 0) { } }
  // Assemble KG like K with kst -> P/h
  const KG = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) { const kg = P[i] / h[i]; KG[i][i] += kg; if (i + 1 < n) { const kg2 = P[i + 1] / h[i + 1]; KG[i][i] += kg2; KG[i][i + 1] -= kg2; KG[i + 1][i] -= kg2; } }
  const KPD = K.map((r, i) => r.map((v, j) => v - KG[i][j]));
  const md = geneig(KPD, M); console.log('P-Delta T1', f(2 * Math.PI / Math.sqrt(md[0].w2), 4), 'vs', f(T1, 4), 'P', P.map(x => f(x, 1)).join(','));
  // static: lateral F = [100,200,300] kN
  const solve = (A, b) => { const n2 = b.length; const a = A.map((r, i) => [...r, b[i]]); for (let i = 0; i < n2; i++) { let p = i; for (let k = i + 1; k < n2; k++) if (Math.abs(a[k][i]) > Math.abs(a[p][i])) p = k;[a[i], a[p]] = [a[p], a[i]]; for (let k = i + 1; k < n2; k++) { const fct = a[k][i] / a[i][i]; for (let j = i; j <= n2; j++) a[k][j] -= fct * a[i][j]; } } const x = Array(n2).fill(0); for (let i = n2 - 1; i >= 0; i--) { let s2 = a[i][n2]; for (let j = i + 1; j < n2; j++) s2 -= a[i][j] * x[j]; x[i] = s2 / a[i][i]; } return x; };
  const F = [100, 200, 300]; const u1 = solve(K, F), u2 = solve(KPD, F);
  const dr1 = u1.map((x, i) => x - (i ? u1[i - 1] : 0)), dr2 = u2.map((x, i) => x - (i ? u2[i - 1] : 0));
  const V = F.map((_, i) => F.slice(i).reduce((a, b) => a + b, 0));
  console.log('P-Delta F=[100,200,300]kN  drift1 mm', dr1.map(x => f(x * 1000, 4)).join(','), ' drift PD mm', dr2.map(x => f(x * 1000, 4)).join(','), ' theta', dr1.map((d, i) => f(P[i] * d / (V[i] * h[i]), 5)).join(','), ' 1/(1-theta)', dr1.map((d, i) => f(1 / (1 - P[i] * d / (V[i] * h[i])), 5)).join(','));
}
