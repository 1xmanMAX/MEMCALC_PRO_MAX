const f = (x, n = 3) => (+x).toFixed(n);
// ===== AASHTO DF check vs FHWA steel example (S=9.75 ft, L=120 ft, Kg=818611 in4, ts=8 in) =====
{ const S = 9.75, L = 120, Kg = 818611, ts = 8; const r = Math.pow(Kg / (12 * L * ts ** 3), 0.1);
  console.log('AASHTO DF M1', f(0.06 + (S / 14) ** 0.4 * (S / L) ** 0.3 * r), 'M2', f(0.075 + (S / 9.5) ** 0.6 * (S / L) ** 0.2 * r), 'V1', f(0.36 + S / 25), 'V2', f(0.2 + S / 12 - (S / 35) ** 2)); }
// ===== HL-93 simple span moments (SI) =====
function truckMmax(L) { // axles 35,145,145 kN at 4.3 m spacing; scan positions
  const P = [35, 145, 145], gap = 4.3; let best = 0;
  for (let x = -10; x <= L + 10; x += 0.001) { const pos = [x, x + gap, x + 2 * gap]; // moment at each axle
    for (let j = 0; j < 3; j++) { const a = pos[j]; if (a < 0 || a > L) continue; let M = 0; for (let i = 0; i < 3; i++) { const p = pos[i]; if (p < 0 || p > L) continue; M += p <= a ? P[i] * p * (L - a) / L : P[i] * a * (L - p) / L; } best = Math.max(best, M); } }
  return best; }
function tandemMmax(L) { let best = 0; for (let x = 0; x <= L; x += 0.001) { const pos = [x, x + 1.2]; for (const a of pos) { if (a > L) continue; let M = 0; for (const p of pos) { if (p > L) continue; M += 110 * (p <= a ? p * (L - a) / L : a * (L - p) / L); } best = Math.max(best, M); } } return best; }
for (const L of [10, 20, 30]) { const Mt = truckMmax(L), Mta = tandemMmax(L), Ml = 9.3 * L * L / 8; console.log('HL-93 L', L, 'Mtruck', f(Mt, 1), 'Mtandem', f(Mta, 1), 'Mlane', f(Ml, 1), 'M(LL+IM)=1.33max+lane', f(1.33 * Math.max(Mt, Mta) + Ml, 1), 'kN.m per lane'); }

// ===== E.030-2018 static =====
{ const Z = 0.45, U = 1.0, S = 1.0, TP = 0.4, TL = 2.5, R0 = 8, Ia = 1, Ip = 1, R = R0 * Ia * Ip;
  const hs = [3.5, 3, 3, 3, 3]; const P = [420, 400, 400, 400, 300]; // tonf (CM + 25% CV)
  const hn = hs.reduce((a, b) => a + b), CT = 35, T = hn / CT;
  const C = T < TP ? 2.5 : T < TL ? 2.5 * TP / T : 2.5 * TP * TL / T / T; const k = T <= 0.5 ? 1 : Math.min(0.75 + 0.5 * T, 2);
  const Ptot = P.reduce((a, b) => a + b); const V = Z * U * C * S / R * Ptot;
  let hcum = 0; const hi = hs.map(x => hcum += x); const den = P.reduce((s, p, i) => s + p * hi[i] ** k, 0);
  const F = P.map((p, i) => p * hi[i] ** k / den * V);
  console.log('E030 hn', hn, 'T', f(T, 4), 'C', f(C, 4), 'C/R', f(C / R, 4), '>=0.11', 'ZUCS/R', f(Z * U * C * S / R, 5), 'P', Ptot, 'V', f(V, 2), 'tonf  k', f(k), 'F', F.map(x => f(x, 2)).join(','));
  // T > 0.5 case with S2 Z4
  const T2 = 0.70, S2 = 1.05, TP2 = 0.6, TL2 = 2.0; const C2 = T2 < TP2 ? 2.5 : 2.5 * TP2 / T2; console.log('E030 caso2 T=0.70 S2: C', f(C2, 4), 'k', f(0.75 + 0.5 * T2, 3), 'ZUCS/R(R=6)', f(0.45 * 1 * C2 * 1.05 / 6, 5));
}
// ===== NCh433 + DS61 static =====
{ const A0 = 0.40, S = 1.05, T0 = 0.40, Tp = 0.45, n = 1.40, p = 1.6, I = 1.0, R = 7, R0 = 11; // zona 3, suelo C, cat II, muros HA
  const Tst = 0.50; let C = 2.75 * S * A0 / R * Math.pow(Tp / Tst, n); const Cmin = A0 * S / 6, Cmax = 0.35 * S * A0; const Cuse = Math.min(Math.max(C, Cmin), Cmax);
  const hs = [3, 3, 3, 3, 3, 3, 3, 3]; const P = [500, 500, 500, 500, 500, 500, 500, 420]; // tonf
  const H = hs.reduce((a, b) => a + b); const Ptot = P.reduce((a, b) => a + b); const Q0 = Cuse * I * Ptot;
  let z = 0; const Z = hs.map(h => z += h); const A = Z.map((zk, i) => Math.sqrt(1 - (i ? Z[i - 1] : 0) / H) - Math.sqrt(1 - zk / H));
  const den = A.reduce((s, a, i) => s + a * P[i], 0); const F = A.map((a, i) => a * P[i] / den * Q0);
  console.log('NCh433 C', f(C, 5), 'Cmin', f(Cmin, 4), 'Cmax', f(Cmax, 4), 'Cuse', f(Cuse, 5), 'Q0', f(Q0, 2), 'Ak', A.map(x => f(x, 4)).join(','), 'Fk', F.map(x => f(x, 2)).join(','));
  // spectrum alpha(Tn) and R* for modal
  const alpha = Tn => (1 + 4.5 * (Tn / T0) ** p) / (1 + (Tn / T0) ** 3);
  const Rst = Tst => 1 + Tst / (0.10 * T0 + Tst / R0);
  console.log('  alpha(0.5)', f(alpha(0.5), 4), 'R*(T*=0.5)', f(Rst(0.5), 4), 'Sa/g(T=0.5)', f(S * A0 * alpha(0.5) / (Rst(0.5) / I), 4), ' alpha(0)', f(alpha(0)), 'max alpha at', (() => { let b = 0, bt = 0; for (let t = 0.01; t < 2; t += 0.001) { const a = alpha(t); if (a > b) { b = a; bt = t; } } return f(bt, 3) + ' = ' + f(b, 4); })());
}
// ===== BSL Japan Ai, Rt =====
{ const Tc = 0.6; const hst = 3.5 * 5; const T = hst * 0.02; const Rt = T < Tc ? 1 : T < 2 * Tc ? 1 - 0.2 * (T / Tc - 1) ** 2 : 1.6 * Tc / T;
  const W = [600, 600, 600, 600, 500]; const Wt = W.reduce((a, b) => a + b);
  const out = []; for (let i = 0; i < 5; i++) { const al = W.slice(i).reduce((a, b) => a + b) / Wt; const Ai = 1 + (1 / Math.sqrt(al) - al) * 2 * T / (1 + 3 * T); const Ci = 1.0 * Rt * Ai * 0.2; out.push([al, Ai, Ci, Ci * W.slice(i).reduce((a, b) => a + b)]); }
  console.log('BSL T', f(T), 'Rt', f(Rt), out.map(([a, A, C, Q], i) => `piso${i + 1}: a=${f(a, 3)} Ai=${f(A, 4)} Ci=${f(C, 4)} Qi=${f(Q, 1)}`).join(' | '));
  const T2 = 1.0; console.log('  Rt(T=1.0,Tc=0.6)', f(1 - 0.2 * (T2 / 0.6 - 1) ** 2, 4), 'Rt(T=1.5)', f(1.6 * 0.6 / 1.5, 4)); }
// ===== E.060 viga flexión/corte (kgf, cm) =====
{ const b = 25, h = 50, d = 44, fc = 210, fy = 4200, Mu = 15e5, phi = 0.9;
  // As from Mu = phi As fy (d - As fy /(1.7 fc b))
  const a2 = phi * fy * fy / (1.7 * fc * b), a1 = -phi * fy * d; const As = (-a1 - Math.sqrt(a1 * a1 - 4 * a2 * Mu)) / (2 * a2);
  const a = As * fy / (0.85 * fc * b); const Asmin = Math.max(0.7 * Math.sqrt(fc) / fy * b * d, 0); const beta1 = 0.85; const rhob = 0.85 * beta1 * fc / fy * 6000 / (6000 + fy); const Asmax = 0.75 * rhob * b * d;
  console.log('E060 viga As', f(As, 2), 'cm2 a', f(a, 2), 'cm As_min', f(Asmin, 2), 'As_max(0.75rhob)', f(Asmax, 2), 'rho_b', f(rhob, 5));
  const As3 = 3 * 5.07 + 0; const a3 = As3 * fy / (0.85 * fc * b); console.log('  con 3 phi 1" (15.21 cm2): phiMn', f(phi * As3 * fy * (d - a3 / 2) / 1e5, 3), 'tonf.m');
  const Vc = 0.53 * Math.sqrt(fc) * b * d; const Vu = 14000; const Vs = Vu / 0.85 - Vc; const s = 2 * 0.71 * fy * d / Vs;
  console.log('  Vc', f(Vc, 0), 'kgf phiVc', f(0.85 * Vc, 0), 'Vu=14 t -> Vs', f(Vs, 0), 's(phi3/8 2 ramas)', f(s, 1), 'cm  (smax d/2=22)'); }
// ===== Zapata aislada E.060 =====
{ const PD = 60, PL = 25, qa = 20, c1 = 0.40, c2 = 0.40, fc = 210, fy = 4200; // t, t/m2, m
  const Areq = (PD + PL) * 1.05 / qa; const B = Math.ceil(Math.sqrt(Areq) * 20) / 20; const Pu = 1.4 * PD + 1.7 * PL; const qu = Pu / (B * B);
  // punching: find d (m) such that Vu = qu (B^2 - (c1+d)(c2+d)) <= 0.85*1.06 sqrt(fc)*bo*d  (kgf, cm -> convert)
  const phiVc = d => 0.85 * 1.06 * Math.sqrt(fc) * (2 * (c1 + d) + 2 * (c2 + d)) * 100 * d * 100 / 1000; // tonf
  const Vu = d => qu * (B * B - (c1 + d) * (c2 + d));
  let d = 0.2; while (Vu(d) > phiVc(d)) d += 0.005;
  console.log('Zapata Areq', f(Areq, 3), 'm2 B=L', f(B, 2), 'Pu', f(Pu, 1), 'qu', f(qu, 3), 't/m2 d_punz', f(d, 3), 'm Vu', f(Vu(d), 2), 'phiVc', f(phiVc(d), 2));
  const dd = 0.50; const m = (B - c1) / 2; const Vu1 = qu * B * (m - dd); const phiVc1 = 0.85 * 0.53 * Math.sqrt(fc) * B * 100 * dd * 100 / 1000;
  const Mu = qu * B * m * m / 2; const bcm = B * 100, dcm = dd * 100; const a2 = 0.9 * fy * fy / (1.7 * fc * bcm), a1 = -0.9 * fy * dcm; const As = (-a1 - Math.sqrt(a1 * a1 - 4 * a2 * Mu * 1e5)) / (2 * a2); const Asmin = 0.0018 * bcm * 60;
  console.log('  con h=0.60 d=0.50: punz Vu', f(Vu(dd), 2), 'phiVc', f(phiVc(dd), 2), '| corte 1D Vu', f(Vu1, 2), 'phiVc', f(phiVc1, 2), '| Mu', f(Mu, 2), 't.m As', f(As, 2), 'cm2 As_min(0.0018bh)', f(Asmin, 2)); }
// ===== Muro contención voladizo (Rankine) =====
{ const H = 4.0, g = 1.8, phi = 30 * Math.PI / 180, gc = 2.4, B = 2.6, tb = 0.4, tw = 0.30, toe = 0.6, mu = 0.5, q = 0;
  const Ka = (1 - Math.sin(phi)) / (1 + Math.sin(phi)); const Ea = 0.5 * Ka * g * H * H; const Mo = Ea * H / 3;
  const heel = B - toe - tw; const hw = H - tb;
  const W1 = tw * hw * gc, x1 = toe + tw / 2; const W2 = B * tb * gc, x2 = B / 2; const W3 = heel * hw * g, x3 = toe + tw + heel / 2;
  const Wt = W1 + W2 + W3; const Mr = W1 * x1 + W2 * x2 + W3 * x3;
  const FSv = Mr / Mo, FSd = mu * Wt / Ea; const xr = (Mr - Mo) / Wt; const e = B / 2 - xr; const qmax = Wt / B * (1 + 6 * e / B), qmin = Wt / B * (1 - 6 * e / B);
  console.log('Muro Ka', f(Ka, 4), 'Ea', f(Ea, 3), 't/m Mo', f(Mo, 3), 'W', f(Wt, 3), 'Mr', f(Mr, 3), 'FSvolteo', f(FSv, 2), 'FSdesliz', f(FSd, 2), 'e', f(e, 3), 'qmax', f(qmax, 2), 'qmin', f(qmin, 2), 't/m2');
  // Mononobe-Okabe kh=0.15 kv=0, wall vertical, backfill horizontal, delta=0
  const kh = 0.15, th = Math.atan(kh), dl = 0, bt = 0, i = 0; const KAE = Math.cos(phi - th - bt) ** 2 / (Math.cos(th) * Math.cos(bt) ** 2 * Math.cos(dl + bt + th) * (1 + Math.sqrt(Math.sin(phi + dl) * Math.sin(phi - th - i) / (Math.cos(dl + bt + th) * Math.cos(i - bt)))) ** 2);
  console.log('  M-O kh=0.15: KAE', f(KAE, 4), 'EAE', f(0.5 * KAE * g * H * H, 3), 'dEAE', f(0.5 * (KAE - Ka) * g * H * H, 3)); }
// ===== E.070 albañilería =====
{ const Z = 0.45, U = 1, S = 1.05, N = 4; console.log('E070 densidad min ZUSN/56 =', f(Z * U * S * N / 56, 5));
  const vm = 81, t = 0.13, L = 4, Pg = 20, fm = 650, h = 2.4; const Vm = 0.5 * vm * 1 * t * L + 0.23 * Pg; const sadm = Math.min(0.2 * fm * (1 - (h / (35 * t)) ** 2), 0.15 * fm);
  console.log('  Vm(alpha=1)', f(Vm, 3), 't  0.55Vm', f(0.55 * Vm, 3), ' sigma_adm', f(sadm, 2), 't/m2  Pm_max', f(sadm * L * t, 2), 't'); }
// ===== AISC 360-16 W18x50 =====
{ const Fy = 50, E = 29000, Zx = 101, Sx = 88.9, ry = 1.65, rts = 1.98, J = 1.24, ho = 17.4, c = 1; const Mp = Fy * Zx;
  const Lp = 1.76 * ry * Math.sqrt(E / Fy); const Lr = 1.95 * rts * E / (0.7 * Fy) * Math.sqrt(J * c / (Sx * ho) + Math.sqrt((J * c / (Sx * ho)) ** 2 + 6.76 * (0.7 * Fy / E) ** 2));
  const Mn = (Lb, Cb) => { if (Lb <= Lp) return Mp; if (Lb <= Lr) return Math.min(Mp, Cb * (Mp - (Mp - 0.7 * Fy * Sx) * (Lb - Lp) / (Lr - Lp))); const Fcr = Cb * Math.PI ** 2 * E / (Lb / rts) ** 2 * Math.sqrt(1 + 0.078 * J * c / (Sx * ho) * (Lb / rts) ** 2); return Math.min(Mp, Fcr * Sx); };
  console.log('AISC W18x50 Lp', f(Lp / 12, 2), 'ft Lr', f(Lr / 12, 2), 'ft phiMp', f(0.9 * Mp / 12, 1), 'kip-ft | Lb=11.67ft Cb=1.01', f(0.9 * Mn(140, 1.01) / 12, 1), '| Lb=35ft Cb=1.14', f(0.9 * Mn(420, 1.14) / 12, 1), 'kip-ft; Mu(35ft,wu=1.74)', f(1.74 * 35 * 35 / 8, 1));
  // W14x90 column
  const A = 26.5, rmin = 3.70; for (const Lc of [20, 30]) { const sl = Lc * 12 / rmin, Fe = Math.PI ** 2 * E / sl ** 2, Fcr = Fy / Fe <= 2.25 ? Math.pow(0.658, Fy / Fe) * Fy : 0.877 * Fe; console.log('  W14x90 Lc', Lc, 'ft KL/r', f(sl, 1), 'Fe', f(Fe, 2), 'Fcr', f(Fcr, 2), 'phiPn', f(0.9 * Fcr * A, 0), 'kips'); } }
