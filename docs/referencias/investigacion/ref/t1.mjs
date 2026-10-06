import fs from 'fs';
import { newmarkLinear, newmarkEP, nigamJenningsSpectrum, geneig, rhoCQC, cqc, manderRect } from './alg.mjs';
const f4 = x => x.toFixed(4);
// Chopra Ex 5.1-5.5: m=0.2533 k=10 c=0.1592 ; p=10 sin(pi t/0.6) t<=0.6 ; dt=0.1
const m = 0.2533, k = 10, c = 0.1592, dt = 0.1;
const t = Array.from({ length: 11 }, (_, i) => i * dt);
const p = t.map(x => x <= 0.6 + 1e-9 ? 10 * Math.sin(Math.PI * x / 0.6) : 0);
const avg = newmarkLinear({ m, c, k, p, dt });
const lin = newmarkLinear({ m, c, k, p, dt, gamma: 0.5, beta: 1 / 6 });
console.log('t   avg(u)   lin(u)');
t.forEach((x, i) => console.log(x.toFixed(1), f4(avg.u[i]), f4(lin.u[i])));
// piecewise exact Ex 5.1 (via unit-mass formulation)
{
  const w = Math.sqrt(k / m), zeta = c / (2 * Math.sqrt(k * m));
  console.log('w', w, 'zeta', zeta, 'Tn', 2 * Math.PI / w);
  // replicate recurrence
  const T = 2 * Math.PI / w; const zz = zeta; const wd = w * Math.sqrt(1 - zz * zz); const E = Math.exp(-zz * w * dt), S = Math.sin(wd * dt), C = Math.cos(wd * dt), sq = Math.sqrt(1 - zz * zz);
  const A = E * (zz / sq * S + C), B = E * S / wd;
  const Cc = (1 / k) * (2 * zz / (w * dt) + E * (((1 - 2 * zz * zz) / (wd * dt) - zz / sq) * S - (1 + 2 * zz / (w * dt)) * C));
  const D = (1 / k) * (1 - 2 * zz / (w * dt) + E * ((2 * zz * zz - 1) / (wd * dt) * S + 2 * zz / (w * dt) * C));
  const Ap = -E * (w / sq * S), Bp = E * (C - zz / sq * S);
  const Cp = (1 / k) * (-1 / dt + E * ((w / sq + zz / (dt * sq)) * S + C / dt));
  const Dp = (1 / (k * dt)) * (1 - E * (zz / sq * S + C));
  console.log('coef A B C D', f4(A), f4(B), f4(Cc), f4(D), "A' B' C' D'", f4(Ap), f4(Bp), f4(Cp), f4(Dp));
  let u = 0, v = 0; const us = [0];
  for (let i = 0; i < 10; i++) { const un = A * u + B * v + Cc * p[i] + D * p[i + 1]; const vn = Ap * u + Bp * v + Cp * p[i] + Dp * p[i + 1]; u = un; v = vn; us.push(u); }
  console.log('exact-interp u:', us.map(f4).join(' '));
}
// Ex 5.5 / 5.7 nonlinear: fy = 7.5 kips elastoplastic, same system
{
  const r = newmarkEP({ m, c, k, fy: 7.5, p, dt, tol: 1e-3 });
  console.log('EP avg u:', Array.from(r.u).map(f4).join(' '));
  console.log('EP fs   :', Array.from(r.fs).map(f4).join(' '));
}
// El Centro spectrum
const rec = fs.readFileSync(process.argv[2], 'utf8').trim().split(/\n/).map(l => l.trim().split(/\s+/).map(Number));
const ag = rec.map(r => r[1]); const dtg = rec[1][0] - rec[0][0];
const g = 386.09; // in/s2
for (const z of [0.02, 0.05]) {
  const sp = nigamJenningsSpectrum(ag.map(a => a * g), dtg, [0.5, 1, 2, 3], z);
  console.log('zeta', z, sp.map(s => `T=${s.T} D=${s.D.toFixed(2)}in PSA/g=${(s.PSA / g).toFixed(3)} SA/g=${(s.SA / g).toFixed(3)} V=${s.PSV.toFixed(2)}in/s`).join(' | '));
  // Newmark check with dt
  for (const T of [0.5, 1, 2]) { const w = 2 * Math.PI / T; const r = newmarkLinear({ m: 1, c: 2 * z * w, k: w * w, p: ag.map(a => -a * g), dt: dtg }); let mx = 0; r.u.forEach(x => mx = Math.max(mx, Math.abs(x))); console.log('   Newmark avg T', T, 'D', mx.toFixed(2)); }
}
// 5-story shear building Chopra (m = 100 kips/g, k = 31.54 kips/in)
{
  const mm = 100 / 386, kk = 31.54, n = 5;
  const K = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => 0));
  for (let i = 0; i < n; i++) { K[i][i] = (i < n - 1 ? 2 : 1) * kk; if (i > 0) K[i][i - 1] = -kk; if (i < n - 1) K[i][i + 1] = -kk; }
  const M = K.map((r, i) => r.map((_, j) => i === j ? mm : 0));
  const modes = geneig(K, M);
  console.log('5st periods', modes.map(md => (2 * Math.PI / Math.sqrt(md.w2)).toFixed(4)).join(' '));
  const one = Array(n).fill(1);
  modes.forEach((md, i) => { const L = md.phi.reduce((s, x) => s + mm * x, 0); const phiTop = md.phi[n - 1]; console.log('mode', i + 1, 'Gamma', (L).toFixed(4), 'Meff/M', (L * L / (n * mm)).toFixed(4), 'phi(norm top=1)', md.phi.map(x => (x / phiTop).toFixed(3)).join(',')); });
}
// CQC rho
for (const b of [0.5, 0.8, 0.9, 0.95, 1.0]) console.log('rho beta', b, 'z=5%', rhoCQC(1, b, 0.05, 0.05).toFixed(4), 'z=2%', rhoCQC(1, b, 0.02, 0.02).toFixed(4));
// Mander
{ const M1 = manderRect({ fco: 30, Ec: 5000 * Math.sqrt(30), flx: 3, fly: 3 }); console.log('Mander fco=30 fl=3: fcc', M1.fcc.toFixed(2), 'ecc', M1.ecc.toFixed(5), 'r', M1.r.toFixed(3), 'sig(0.002)', M1.sig(0.002).toFixed(2), 'sig(0.01)', M1.sig(0.01).toFixed(2)); }
