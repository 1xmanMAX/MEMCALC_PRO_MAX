import fs from 'fs';
import { newmarkLinear, nigamJenningsSpectrum, geneig, cqc } from './alg.mjs';
const f = (x, n = 3) => (+x).toFixed(n);
const rec = fs.readFileSync(process.argv[2], 'utf8').trim().split(/\n/).map(l => l.trim().split(/\s+/).map(Number));
const agG = rec.map(r => r[1]); const dt = 0.02; const g = 386.09;
// ---- Chopra 5-storey shear frame, El Centro, zeta 5%: modal time-history superposition ----
const mm = 100 / g, kk = 31.54, n = 5, h = 144; // in
const K = Array.from({ length: n }, () => Array(n).fill(0));
for (let i = 0; i < n; i++) { K[i][i] = (i < n - 1 ? 2 : 1) * kk; if (i > 0) K[i][i - 1] = -kk; if (i < n - 1) K[i][i + 1] = -kk; }
const M = K.map((r, i) => r.map((_, j) => i === j ? mm : 0));
const modes = geneig(K, M); const z = 0.05;
const N = agG.length; const u = Array.from({ length: n }, () => new Float64Array(N));
const roofPeaks = [], VbPeaks = [], wn = [];
modes.forEach((md, r) => {
  const w = Math.sqrt(md.w2); wn.push(w); const Lr = md.phi.reduce((s, x) => s + mm * x, 0); // Gamma (mass-normalized: Mn=1)
  const D = pwExact(agG.map(a => a * g), dt, w, z); // deformation of mode-r SDOF
  let rp = 0, vp = 0;
  for (let t = 0; t < N; t++) { const q = Lr * D[t]; for (let i = 0; i < n; i++) u[i][t] += md.phi[i] * q; const roof = md.phi[n - 1] * q; const Vb = Lr * Lr * w * w * D[t]; rp = Math.max(rp, Math.abs(roof)); vp = Math.max(vp, Math.abs(Vb)); }
  roofPeaks.push(rp); VbPeaks.push(vp);
});
let roofMax = 0, VbMax = 0;
for (let t = 0; t < N; t++) { roofMax = Math.max(roofMax, Math.abs(u[n - 1][t])); let Vb = 0; for (let i = 0; i < n; i++) { /* Vb = sum k_1 * u1 */ } Vb = kk * u[0][t]; VbMax = Math.max(VbMax, Math.abs(Vb)); }
console.log('5st El Centro z5% THA: roof max', f(roofMax), 'in; Vb max', f(VbMax, 2), 'kips; Vb/W', f(VbMax / 500, 4));
console.log('  modal peaks roof', roofPeaks.map(x => f(x, 3)).join(','), ' Vb', VbPeaks.map(x => f(x, 2)).join(','));
const srss = a => Math.sqrt(a.reduce((s, x) => s + x * x, 0));
// RSA with exact spectrum of the record (signed modal contributions for CQC)
const sp = nigamJenningsSpectrum(agG.map(a => a * g), dt, wn.map(w => 2 * Math.PI / w), z);
const roofR = modes.map((md, r) => md.phi[n - 1] * md.phi.reduce((s, x) => s + mm * x, 0) * sp[r].D);
const VbR = modes.map((md, r) => { const L = md.phi.reduce((s, x) => s + mm * x, 0); return L * L * sp[r].PSA; });
console.log('  RSA roof SRSS', f(srss(roofR)), 'CQC', f(cqc(roofR, wn, z)), '| Vb SRSS', f(srss(VbR), 2), 'CQC', f(cqc(VbR, wn, z), 2), ' Tn', wn.map(w => f(2 * Math.PI / w, 3)).join(','), 'D', sp.map(s => f(s.D, 3)).join(','), 'A/g', sp.map(s => f(s.PSA / g, 3)).join(','));

// ---- Spectrum-compatible synthetic (SIMQKE-like) for E.030-type target ----
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const Z = 0.45, U = 1, S = 1.05, TP = 0.6, TL = 2.0; // E.030 Z4 S2
const SaT = T => { const C = T < 0.2 * TP ? 1 + 7.5 * T / TP : T < TP ? 2.5 : T < TL ? 2.5 * TP / T : 2.5 * TP * TL / (T * T); return Z * U * C * S; }; // elastic (R=1), in g
{
  const dtg = 0.01, dur = 20, Nn = Math.round(dur / dtg); const R = rng(12345);
  const nf = 300; const f0 = 0.1, f1 = 45; const freqs = Array.from({ length: nf }, (_, i) => f0 * Math.pow(f1 / f0, i / (nf - 1)));
  const ph = freqs.map(() => 2 * Math.PI * R());
  const env = t => t < 2 ? (t / 2) ** 2 : t < 12 ? 1 : Math.exp(-0.25 * (t - 12)); // Jennings-type trapezoidal
  let A = freqs.map(fr => SaT(1 / fr) * 0.05); // initial
  const Tchk = Array.from({ length: 60 }, (_, i) => 0.03 * Math.pow(4 / 0.03, i / 59));
  const synth = () => Array.from({ length: Nn }, (_, k) => { const t = k * dtg; let s = 0; for (let j = 0; j < nf; j++) s += A[j] * Math.sin(2 * Math.PI * freqs[j] * t + ph[j]); return env(t) * s; });
  let x, ratios;
  for (let it = 0; it < 12; it++) {
    x = synth(); const spf = nigamJenningsSpectrum(x, dtg, freqs.map(fr => 1 / fr), 0.05);
    A = A.map((a, j) => a * SaT(1 / freqs[j]) / spf[j].SA);
    const spc = nigamJenningsSpectrum(x, dtg, Tchk, 0.05); ratios = spc.map((s, i) => s.SA / SaT(Tchk[i]));
    if (it === 0 || it === 11) console.log('SIMQKE iter', it, 'ratio min', f(Math.min(...ratios)), 'max', f(Math.max(...ratios)), 'mean', f(ratios.reduce((a, b) => a + b) / ratios.length));
  }
  x = synth(); console.log('  PGA synth (g)', f(Math.max(...x.map(Math.abs)), 3), 'target ZUS =', f(Z * U * S, 3));
}

// ---- Fiber section M-phi, rectangular, Hognestad concrete + EPP steel ----
function mphi({ b, hh, fc, fy, Es, layers, nf = 200, Pax = 0 }) {
  const ec0 = 2 * fc / (4700 * Math.sqrt(fc)); const ecu = 0.0038; const Ec = 4700 * Math.sqrt(fc);
  const sc = e => e <= 0 ? 0 : e <= ec0 ? fc * (2 * e / ec0 - (e / ec0) ** 2) : e <= ecu ? fc * (1 - 0.15 * (e - ec0) / (ecu - ec0)) : 0; // compression positive, no tension
  const ss = e => Math.max(-fy, Math.min(fy, Es * e));
  const dy = hh / nf; const res = [];
  for (const phi of [1e-7, ...Array.from({ length: 2000 }, (_, i) => (i + 1) * 2.5e-7)]) {
    // find eps0 (top strain) for equilibrium N = Pax; strain(y) = e_top - phi*y, y from top
    const N = et => { let s = 0; for (let k = 0; k < nf; k++) { const y = (k + 0.5) * dy; s += sc(et - phi * y) * b * dy; } for (const L of layers) s += (ss(et - phi * L.d) - (et - phi * L.d > 0 ? sc(et - phi * L.d) : 0)) * L.As; return s - Pax; };
    let lo = -0.01, hi = 0.02; for (let it = 0; it < 100; it++) { const mid = (lo + hi) / 2; if (N(mid) > 0) hi = mid; else lo = mid; }
    const et = (lo + hi) / 2; if (et > ecu) break;
    let Mm = 0; for (let k = 0; k < nf; k++) { const y = (k + 0.5) * dy; Mm += sc(et - phi * y) * b * dy * (hh / 2 - y); } for (const L of layers) Mm += (ss(et - phi * L.d) - (et - phi * L.d > 0 ? sc(et - phi * L.d) : 0)) * L.As * (hh / 2 - L.d);
    res.push({ phi, M: Mm, et, eb: et - phi * layers[layers.length - 1].d });
  }
  return res;
}
{ // b=300 h=500 mm, fc=28 MPa, fy=420, 3 #8 bottom (As=1530 mm2) d=440; 2 #5 top (398 mm2) d'=60
  const r = mphi({ b: 300, hh: 500, fc: 28, fy: 420, Es: 200000, layers: [{ d: 60, As: 398 }, { d: 440, As: 1530 }] });
  const yIdx = r.findIndex(p => -p.eb >= 420 / 200000);
  const y = r[yIdx], u = r[r.length - 1];
  console.log('Mphi: yield phi', y.phi.toExponential(3), '1/mm M', f(y.M / 1e6, 2), 'kNm | ultimate phi', u.phi.toExponential(3), 'M', f(u.M / 1e6, 2), 'kNm, ductility', f(u.phi / y.phi, 2));
  // hand: elastic cracked transformed (ignore top steel): n=Es/Ec
  const Ec = 4700 * Math.sqrt(28), nn = 200000 / Ec, rho = 1530 / (300 * 440); const kk2 = Math.sqrt(2 * rho * nn + (rho * nn) ** 2) - rho * nn;
  console.log('  hand (no top steel) k', f(kk2, 4), 'My', f(1530 * 420 * 440 * (1 - kk2 / 3) / 1e6, 2), 'kNm phi_y', (420 / 200000 / (440 * (1 - kk2))).toExponential(3), '| ACI Whitney Mn', f((1530 * 420 * (440 - 1530 * 420 / (0.85 * 28 * 300) / 2)) / 1e6, 2), 'kNm');
}
function pwExact(ag, dt, w, zeta) { const wd = w * Math.sqrt(1 - zeta * zeta), E = Math.exp(-zeta * w * dt), S = Math.sin(wd * dt), C = Math.cos(wd * dt), sq = Math.sqrt(1 - zeta * zeta), k = w * w;
  const A = E * (zeta / sq * S + C), B = E * (S / wd), Cc = (1 / k) * (2 * zeta / (w * dt) + E * (((1 - 2 * zeta * zeta) / (wd * dt) - zeta / sq) * S - (1 + 2 * zeta / (w * dt)) * C)), D = (1 / k) * (1 - 2 * zeta / (w * dt) + E * ((2 * zeta * zeta - 1) / (wd * dt) * S + 2 * zeta / (w * dt) * C));
  const Ap = -E * (w / sq * S), Bp = E * (C - zeta / sq * S), Cp = (1 / k) * (-1 / dt + E * ((w / sq + zeta / (dt * sq)) * S + C / dt)), Dp = (1 / (k * dt)) * (1 - E * (zeta / sq * S + C));
  const u = new Float64Array(ag.length); let uu = 0, v = 0; for (let i = 0; i < ag.length - 1; i++) { const p0 = -ag[i], p1 = -ag[i + 1]; const un = A * uu + B * v + Cc * p0 + D * p1; v = Ap * uu + Bp * v + Cp * p0 + Dp * p1; uu = un; u[i + 1] = uu; } return u; }
