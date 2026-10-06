// Pruebas de validación — módulo «geotech» (E.050, Das, Bowles, Hetényi, Taylor, Youd et al.)
import { near, truthy, calc, block, runTemplate, section, done, TEMPLATES, math } from './helpers.mjs';

section('Factores de capacidad de carga (Das, Tabla 3.1 y 3.3)');
let v = calc(`phi = 30 deg
Nq = NqBC(phi)
Nc = NcBC(phi)
Ngv = NgVesic(phi)
Ngm = NgMeyerhof(phi)
Ngh = NgHansen(phi)
Nct = NcTerzaghi(phi)
Nqt = NqTerzaghi(phi)
Ngt = NgTerzaghi(phi)
Ngt28 = NgTerzaghi(28 deg)
Nc0 = NcBC(0 deg)
Nct0 = NcTerzaghi(0 deg)`);
near('Nq (φ = 30°) = 18.40', v('Nq'), 18.40, 0.002);
near('Nc (φ = 30°) = 30.14', v('Nc'), 30.14, 0.002);
near('Nγ Vesic (φ = 30°) = 22.40', v('Ngv'), 22.40, 0.002);
near('Nγ Meyerhof (φ = 30°) = 15.67 (E.050 Art. 20.4)', v('Ngm'), 15.67, 0.002);
near('Nγ Hansen (φ = 30°) = 15.07', v('Ngh'), 15.07, 0.002);
near('Terzaghi Nc (φ = 30°) = 37.16', v('Nct'), 37.16, 0.002);
near('Terzaghi Nq (φ = 30°) = 22.46', v('Nqt'), 22.46, 0.002);
near('Terzaghi Nγ (φ = 30°) = 19.13 (Kumbhojkar)', v('Ngt'), 19.13, 0.002);
near('Terzaghi Nγ (φ = 28°) ≈ 13.70 (interpolación)', v('Ngt28'), 13.70, 0.01);
near('Nc (φ = 0) = π + 2 = 5.14 (E.050)', v('Nc0'), 5.14, 0.002);
near('Terzaghi Nc (φ = 0) = 5.70', v('Nct0'), 5.70, 0.003);

section('Das, Ejemplo 3.1: zapata cuadrada 1.5 m, Terzaghi (c = 15.2 kPa, φ = 20°, Df = 1 m, FS = 4)');
v = calc(`phi = 20 deg
c = 15.2 kPa
g1 = 17.8 kN/m^3
B = 1.5 m
Df = 1.0 m
qu = 1.3*c*NcTerzaghi(phi) + g1*Df*NqTerzaghi(phi) + 0.4*g1*B*NgTerzaghi(phi)
Qall = qu/4*B^2`);
near('qu = 1.3c Nc + q Nq + 0.4γB Nγ ≈ 520.8 kN/m²', v('qu', 'kPa'), 520.8, 0.005);
near('Qadm ≈ 293 kN', v('Qall', 'kN'), 293, 0.005);

section('Factores de forma, profundidad, inclinación y nivel freático');
v = calc(`phi = 30 deg
Fcs = scDeBeer(2 m, 2 m, phi)
Fqs = sqDeBeer(2 m, 2 m, phi)
Fgs = sgDeBeer(2 m, 2 m)
Fqd = dqHansen(1.5 m, 2 m, phi)
Fqd2 = dqHansen(3 m, 2 m, phi)
ic = icMeyerhof(10 deg)
ig = igMeyerhof(10 deg, phi)
q1 = qWT(18 kN/m^3, 20 kN/m^3, 1 m, 2 m, 9.81 kN/m^3)
g2 = gammaWT(18 kN/m^3, 20 kN/m^3, 3 m, 2 m, 2 m, 9.81 kN/m^3)
g3 = gammaWT(18 kN/m^3, 20 kN/m^3, 1 m, 2 m, 2 m, 9.81 kN/m^3)`);
near('Fcs De Beer (B = L) = 1 + Nq/Nc = 1.610', v('Fcs'), 1 + 18.401 / 30.140, 0.001);
near('Fqs = 1 + tan30° = 1.577', v('Fqs'), 1 + Math.tan(Math.PI / 6), 0.001);
near('Fγs = 0.6', v('Fgs'), 0.6, 0.001);
near('Fqd (Df/B = 0.75) = 1 + 2tanφ(1−sinφ)²·0.75 = 1.2165', v('Fqd'), 1 + 2 * Math.tan(Math.PI / 6) * 0.25 * 0.75, 0.001);
near('Fqd (Df/B = 1.5) usa atan(1.5) rad', v('Fqd2'), 1 + 2 * Math.tan(Math.PI / 6) * 0.25 * Math.atan(1.5), 0.001);
near('ic = (1 − 10/90)² = 0.790', v('ic'), (8 / 9) ** 2, 0.001);
near('iγ = (1 − 10/30)² = 0.444', v('ig'), (2 / 3) ** 2, 0.001);
near("q' con NF a 1 m (Df = 2 m) = 18·1 + 10.19·1", v('q1', 'kPa'), 18 + (20 - 9.81), 0.001);
near('γ̄ con NF a d = 1 m bajo la base (B = 2 m) = γ\' + (d/B)(γ − γ\')', v('g2', 'kN/m^3'), 10.19 + 0.5 * (18 - 10.19), 0.001);
near('γ̄ con NF sobre la base = γ\'', v('g3', 'kN/m^3'), 10.19, 0.001);

section('Esfuerzos y asentamientos (Newmark, Steinbrenner, Terzaghi)');
v = calc(`I1 = IzCorner(1 m, 1 m, 1 m)
I2 = IzCorner(2 m, 1 m, 1 m)
Ic = IzRect(2 m, 2 m, 1 m)
Icir = IzCircle(1 m, 1 m)
F1 = F1Stein(1, 1e5)
Is1 = IsStein(1, 1e5, 0.5)
Is2 = IsStein(2, 4, 0.3)
d21 = dsig21(100 kPa, 2 m, 2 m, 2 m)`);
near('Newmark esquina m = n = 1 → I = 0.1752', v('I1'), 0.1752, 0.002);
near('Newmark esquina m = 2, n = 1 → I = 0.1999', v('I2'), 0.1999, 0.003);
near('Centro de 2×2 a z = 1 m = 4·I(1,1) = 0.701', v('Ic'), 4 * 0.17522, 0.002);
near('Círculo R = z → I = 1 − (1/2)^1.5 = 0.6464', v('Icir'), 1 - 0.5 ** 1.5, 0.001);
near('Steinbrenner F1(m=1, n→∞) = 0.561 (Bowles)', v('F1'), 0.561, 0.003);
near('Is(μ = 0.5) = F1 (F2 no interviene)', v('Is1'), 0.561, 0.003);
truthy('Is(m=2, n=4, μ=0.3) entre F1 y F1 + F2', v('Is2') > 0.4 && v('Is2') < 0.7, v('Is2').toFixed(3));
near('Método 2:1: qB²/(B+z)² = 25 kPa', v('d21', 'kPa'), 25, 0.001);
v = calc(`S1 = ScCons(0.30, 0.05, 0.90, 3 m, 50 kPa, 50 kPa)
S2 = ScCons(0.30, 0.05, 0.90, 3 m, 50 kPa, 50 kPa, 80 kPa)
S3 = ScCons(0.30, 0.05, 0.90, 3 m, 50 kPa, 20 kPa, 80 kPa)
T50 = TvU(0.5)
T90 = TvU(0.9)
U1 = UTv(0.197)
U2 = UTv(0.848)
Cc = CcSkempton(50)
Se = SeFlex(100 kPa, 2 m, 2 m, 1e4 m, 10000 kPa, 0.5)`);
near('Sc NC = Cc·H/(1+e0)·log(2) = 142.6 mm', v('S1', 'mm'), 0.3 * 3 / 1.9 * Math.log10(2) * 1000, 0.001);
near("Sc SC (σ'f > σ'c) = Cr log(80/50) + Cc log(100/80)", v('S2', 'mm'), 3 / 1.9 * (0.05 * Math.log10(1.6) + 0.3 * Math.log10(1.25)) * 1000, 0.001);
near("Sc SC (σ'f ≤ σ'c) = Cr log(70/50)", v('S3', 'mm'), 3 / 1.9 * 0.05 * Math.log10(1.4) * 1000, 0.001);
near('Tv(U = 50 %) = 0.197', v('T50'), 0.197, 0.003);
near('Tv(U = 90 %) = 0.848', v('T90'), 0.848, 0.002);
near('U(Tv = 0.197) = 50 % (serie)', v('U1'), 0.50, 0.003);
near('U(Tv = 0.848) = 90 % (serie)', v('U2'), 0.90, 0.003);
near('Cc = 0.009(LL − 10) = 0.36', v('Cc'), 0.36, 0.001);
near('Se centro flexible cuadrado (μ=0.5, H→∞) = q B (1−μ²)/E·1.122', v('Se', 'mm'), 100 * 2 * 0.75 / 10000 * 1.1222 * 1000, 0.005);

section('SPT y correlaciones (E.050 Art. 5.27; Youd et al. 2001)');
v = calc(`N60 = N60SPT(20, 70, 1.0, 1.0, 0.95)
CN = CNLiao(50 kPa)
CN2 = CNLiao(10 kPa)
CR = CRrod(5 m)
p1 = phiPeck(20)
p2 = phiHatanaka(20)
Dr = DrSPT(23)
Es = EsSPT(20, 10)
qa = qaSPT(20, 1.0 m, 1.0 m, 25 mm)
qb = qaSPT(20, 2.0 m, 1.0 m, 25 mm)`);
near('N60 = N·(ER/60)·CR = 20·70/60·0.95 = 22.17', v('N60'), 20 * 70 / 60 * 0.95, 0.001);
near('CN (σ\'v = 50 kPa) = √2 = 1.414', v('CN'), Math.SQRT2, 0.001);
near('CN ≤ 1.7', v('CN2'), 1.7, 0.001);
near('CR (barra de 5 m) = 0.85', v('CR'), 0.85, 0.001);
near('φ Peck (N60 = 20) = 27.1 + 6 − 0.216 = 32.88°', v('p1', 'deg'), 32.884, 0.001);
near('φ Hatanaka ((N1)60 = 20) = 40°', v('p2', 'deg'), 40, 0.001);
near('Dr ((N1)60 = 23) = √(23/46) = 0.707', v('Dr'), Math.sqrt(0.5), 0.001);
near('Es = 10·pa·N60 = 20.3 MPa', v('Es', 'MPa'), 10 * 0.101325 * 20, 0.001);
near('Meyerhof (B ≤ 1.22 m): qneta = 19.16·N60·Fd (Fd = 1.33)', v('qa', 'kPa'), 19.16 * 20 * 1.33, 0.001);
near('Meyerhof (B > 1.22 m): 11.98·N60·((3.28B+1)/3.28B)²·Fd', v('qb', 'kPa'), 11.98 * 20 * ((3.28 * 2 + 1) / 6.56) ** 2 * 1.165, 0.001);

section('Licuación (Youd et al. 2001; Idriss y Boulanger 2008; Cetin et al. 2004)');
v = calc(`C15 = CRR75(15)
C20 = CRR75(20)
C30 = CRR75(30)
I15 = CRR75IB(15)
M75 = MSFYoud(7.5)
M65 = MSFYoud(6.5)
MI = MSFIB(7.5)
rd5 = rdYoud(5 m)
rd0 = rdYoud(0 m)
n1 = N160cs(10, 3)
n2 = N160cs(10, 40)
n3 = N160cs(10, 15)
CSR = CSRSeed(0.3, 100 kPa, 60 kPa, 0.95)
PL = PLCetin(15, 0.131, 7.5, 101.325 kPa, 5)`);
near('CRR7.5((N1)60cs = 15) = 0.160', v('C15'), 0.160, 0.005);
near('CRR7.5((N1)60cs = 20) = 0.215', v('C20'), 1 / 14 + 20 / 135 + 50 / 245 ** 2 - 0.005, 0.001);
near('(N1)60cs ≥ 30 → no licuable (2.0)', v('C30'), 2.0, 0.001);
near('CRR Idriss–Boulanger (15) = 0.156', v('I15'), 0.156, 0.01);
near('MSF (Mw = 7.5) = 1.00', v('M75'), 1.0, 0.002);
near('MSF (Mw = 6.5) = 1.44 (Youd et al. Tabla 3)', v('M65'), 1.44, 0.01);
near('MSF IB (7.5) = 1.00', v('MI'), 1.0, 0.002);
near('rd (z = 5 m) ≈ 0.965 (Youd et al. ec. 2)', v('rd5'), 0.9655, 0.002);
near('rd (z = 0) = 1', v('rd0'), 1.0, 0.001);
near('Finos ≤ 5 %: sin corrección', v('n1'), 10, 0.001);
near('Finos ≥ 35 %: 5 + 1.2·(N1)60 = 17', v('n2'), 17, 0.001);
near('Finos 15 %: α + β(N1)60', v('n3'), Math.exp(1.76 - 190 / 225) + (0.99 + 15 ** 1.5 / 1000) * 10, 0.001);
near('CSR = 0.65·0.3·(100/60)·0.95 = 0.309', v('CSR'), 0.65 * 0.3 * 100 / 60 * 0.95, 0.001);
near('Cetin: en la curva determinística (CRR para PL = 50 %) → PL ≈ 0.5', v('PL'), 0.5, 0.06);

section('Pilotes (Das cap. 11; API; Converse–Labarre)');
v = calc(`Nqs = NqMeyerhof(35 deg)
ql = qlMeyerhof(Nqs, 35 deg)
Ap = (0.45 m)^2
qq = 15 m*17 kN/m^3
Qp = min(qq*Nqs, ql)*Ap
a1 = alphaAPI(25 kPa, 50 kPa)
a2 = alphaAPI(100 kPa, 50 kPa)
b1 = betaBurland(30 deg, 1)
eta = etaConverse(4, 3, 0.4 m, 1.2 m)
Ns = NsVesic(0 deg, 50)
Nc0 = NcVesic(0 deg, 50)
qpS = qpMeyerhofSPT(30, 10 m, 0.4 m)
bF = betaFHWA(4 m)`);
near('Nq* Meyerhof (φ = 35°) = 143 (Das Tabla 11.5)', v('Nqs'), 143, 0.001);
near('Das Ej. 11.1: Qp = ql·Ap ≈ 1014 kN (pa = 100 kPa en Das)', v('Qp', 'kN'), 1014, 0.015);
near('α API (ψ = 0.5) = 0.5·0.5^−0.5 = 0.707', v('a1'), 0.5 / Math.sqrt(0.5), 0.001);
near('α API (ψ = 2) = 0.5·2^−0.25 = 0.420', v('a2'), 0.5 * 2 ** -0.25, 0.001);
near('β = (1 − sin30°)tan30° = 0.289', v('b1'), 0.5 * Math.tan(Math.PI / 6), 0.001);
near('Converse–Labarre 4×3, D/s = 1/3 → η = 0.710', v('eta'), 1 - Math.atan(1 / 3) * 180 / Math.PI * (3 * 3 + 2 * 4) / (90 * 12), 0.001);
near('Vesic Nσ*(φ = 0) = 1', v('Ns'), 1, 0.001);
near('Vesic Nc*(φ = 0, Irr = 50) = 4/3(ln 50 + 1) + π/2 + 1 = 9.12', v('Nc0'), 4 / 3 * (Math.log(50) + 1) + Math.PI / 2 + 1, 0.001);
near('Meyerhof SPT: qp = min(0.4 pa N L/D, 4 pa N) = 4 pa N', v('qpS', 'kPa'), 4 * 101.325 * 30, 0.001);
near('β FHWA (z = 4 m) = 1.5 − 0.245·2 = 1.01', v('bF'), 1.01, 0.001);

section('Coeficiente de balasto');
v = calc(`k1 = ksVesic(20000 kPa, 0.3, 1.5 m, 100000 kN*m^2)
k2 = ksBowles(200 kPa, 3)
k3 = ksTerzaghi(40000 kN/m^3, 1.2 m, 1)`);
near('Vesic: 0.65·(Es B⁴/EI)^(1/12)·Es/(B(1−μ²))', v('k1', 'kN/m^3'), 0.65 * (20000 * 1.5 ** 4 / 1e5) ** (1 / 12) * 20000 / (1.5 * 0.91), 0.001);
near('Bowles: ks ≈ 40·FS·qa (qa en kPa → kN/m³)', v('k2', 'kN/m^3'), 3 * 200 / 0.0254, 0.001);
near('Terzaghi (arena): k1·((B + 0.3)/2B)²', v('k3', 'kN/m^3'), 40000 * (1.5 / 2.4) ** 2, 0.001);

section('Viga sobre lecho elástico vs. Hetényi (viga infinita, carga puntual)');
{
  const EI = 2e5 / 9.80665, kb = 20000 / 9.80665, P = 50; // t, m
  const lam = (kb / (4 * EI)) ** 0.25;
  const g = block('winkler', { L: '40 m', B: '1 m', E: EI + ' tonf/m^2', I: '1 m^4', ks: kb + ' tonf/m^3', cargas: 'P 20 ' + P, nel: '240' });
  near('w0 = Pλ/(2k)', g('wmax', 'm'), P * lam / (2 * kb), 0.002);
  near('M0 = P/(4λ)', g('Mpos', 'tonf*m'), P / (4 * lam), 0.003);
  near('M mínimo = −P/(4λ)·e^(−π/2) (en λx = π/2)', -g('Mneg', 'tonf*m'), P / (4 * lam) * Math.exp(-Math.PI / 2), 0.005);
  near('V máximo = P/2', g('Vmax', 'tonf'), P / 2, 0.002);
  near('qmax = k_s·w0', g('qmax', 'tonf/m^2'), kb * P * lam / (2 * kb), 0.002);
  const g2 = block('winkler', { L: '10 m', B: '1 m', E: '2e6', I: '10', ks: '1000', cargas: 'P 2 50\nP 8 50', nel: '100' });
  near('Viga muy rígida: presión ≈ uniforme ΣP/(BL)', g2('qmax', 'tonf/m^2'), 10, 0.01);
  const g3 = block('winkler', { L: '6 m', B: '1 m', E: '2e6', I: '0.1', ks: '2000', cargas: 'P 1 30\nP 5 30\nM 1 3', metodo: 'rigido' });
  near('Método rígido: q = R/L ± 6Re/L² (e = 0.05 m) → 10.5 t/m²', g3('qmax', 'tonf/m^2'), 10.5, 0.001);
  near('Método rígido: qmin = 9.5 t/m²', g3('qmin', 'tonf/m^2'), 9.5, 0.001);
  const g4 = block('winkler', { L: '4 m', B: '1 m', E: '2e6', I: '0.1', ks: '', cargas: 'P 0.5 60', metodo: 'rigido' });
  near('Método rígido e > L/6: q máx = 2R/(3(L/2 − e))', g4('qmax', 'tonf/m^2'), 2 * 60 / (3 * 0.5), 0.002);
  const g5 = block('winkler', { L: '20 m', B: '1 m', E: '2e5', I: '0.05', ks: '3000', cargas: 'P 0 40', sintraccion: true, nel: '200' });
  truthy('Suelo sin tracción: presión mínima ≥ 0', g5('qmin', 'tonf/m^2') >= -1e-9, g5('qmin', 'tonf/m^2').toFixed(4));
}

section('Estabilidad de taludes');
{
  // Taylor (1937): φ = 0, β = 60°, círculo de pie → m = c/(F γ H) = 0.191
  let g = block('slope', { superficie: '0 10\n20 10\n25.7735 0\n50 0', estratos: '10 3 0 1.8 Arcilla', malla: '15 35 10 30 12', ybase: '-15', ndov: '40' });
  near('Taylor φ = 0, β = 60°: m = 0.191 → FS = c/(0.191 γ H)', g('FS'), 3 / (0.191 * 1.8 * 10), 0.01);
  near('φ = 0: Fellenius = Bishop', g('FSf'), g('FSb'), 0.001);
  // Arena seca: FS → tanφ/tanβ (talud infinito)
  g = block('slope', { superficie: '0 10\n20 10\n37.32 0\n60 0', estratos: '10 0 35 1.8 Arena', malla: '15 45 10 60 12', ybase: '-5', ndov: '40' });
  near('c = 0: FS mínimo ≈ tanφ/tanβ (talud infinito)', g('FS'), Math.tan(35 * Math.PI / 180) / Math.tan(30 * Math.PI / 180), 0.02);
  // Círculo fijo φ = 0: momento resistente c·R²·θ vs. integración exacta
  g = block('slope', { superficie: '0 10\n20 10\n25.7735 0\n50 0', estratos: '10 3 0 1.8 Arcilla', circulo: '24.25 10.5 10.6', ndov: '200' });
  {
    const pts = [[0, 10], [20, 10], [25.7735, 0], [50, 0]], xc = 24.25, yc = 10.5, R = 10.6;
    const sy = (x) => { for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const [a, b] = pts[i - 1], [c, d] = pts[i]; return b + (d - b) * (x - a) / (c - a); } return 0; };
    const f = (x) => sy(x) - (yc - Math.sqrt(R * R - (x - xc) ** 2));
    const root = (a, b) => { for (let k = 0; k < 60; k++) { const m = (a + b) / 2; (f(m) > 0) === (f(a) > 0) ? a = m : b = m; } return (a + b) / 2; };
    const xl = root(xc - R + 1e-6, xc), xr = root(xc, 28);
    let M = 0; const n = 20000; for (let i = 0; i < n; i++) { const x = xl + (xr - xl) * (i + 0.5) / n; M += 1.8 * Math.max(0, f(x)) * (xr - xl) / n * (xc - x); }
    const th = Math.abs(Math.atan2(xr - xc, yc - sy(xr)) - Math.atan2(xl - xc, yc - sy(xl)));
    near('Círculo fijo φ = 0: FS = c·R²·θ / ΣW·x (integración exacta)', g('FS'), 3 * R * R * th / M, 0.003);
  }
  // Bishop ≥ Fellenius en suelo c–φ
  g = block('slope', { superficie: '0 10\n12 10\n27 0\n45 0', estratos: '10 2.0 25 1.85 1.95 Arcilla\n2 4.0 32 1.95 2.05 Arena', malla: '12 32 12 32 10', ybase: '-4' });
  truthy('Suelo c–φ: FS Bishop ≥ FS Fellenius', g('FSb') >= g('FSf'), `${g('FSb').toFixed(3)} ≥ ${g('FSf').toFixed(3)}`);
  const g2 = block('slope', { superficie: '0 10\n12 10\n27 0\n45 0', estratos: '10 2.0 25 1.85 1.95 Arcilla\n2 4.0 32 1.95 2.05 Arena', malla: '12 32 12 32 10', ybase: '-4', kh: '0.15' });
  truthy('Sismo (kh = 0.15) reduce el FS', g2('FS') < g('FS'), `${g2('FS').toFixed(3)} < ${g('FS').toFixed(3)}`);
}

section('Das, Ejemplo 3.7 (7.ª ed.): carga excéntrica, área efectiva (B = 1.5 m, e = 0.15 m, φ = 30°, Df = 0.7 m)');
v = calc(`phi = 30 deg
B = 1.5 m
L = 1.5 m
Df = 0.7 m
g = 18 kN/m^3
Bp = B - 2*0.15 m
q = g*Df
qu = q*NqBC(phi)*sqDeBeer(Bp, L, phi)*dqHansen(Df, B, phi) + 0.5*g*Bp*NgVesic(phi)*sgDeBeer(Bp, L)
Qu = qu*Bp*L`);
near("q'u = q Nq Fqs Fqd + ½γB'Nγ Fγs ≈ 549 kN/m² (Das)", v('qu', 'kPa'), 549.2, 0.005);
near('Qult = q′u·B′·L ≈ 989 kN (Das)', v('Qu', 'kN'), 988.6, 0.005);

section('Viga de cimentación finita (Hetényi 1946): carga central en viga libre de longitud L');
{
  // y_c = Pλ/(2k)·(cosh λL + cos λL + 2)/(sinh λL + sin λL);  M_c = P/(4λ)·(cosh λL − cos λL)/(sinh λL + sin λL)
  for (const lamL of [1.0, 3.0]) {
    const EI = 1e4, k = 2000, P = 60, lam = (k / (4 * EI)) ** 0.25, L = lamL / lam;
    const g = block('winkler', { L: L + ' m', B: '1 m', E: EI + ' tonf/m^2', I: '1 m^4', ks: k + ' tonf/m^3', cargas: 'P ' + L / 2 + ' ' + P, nel: '200' });
    const ch = Math.cosh(lamL), c = Math.cos(lamL), sh = Math.sinh(lamL), sn = Math.sin(lamL);
    near(`λL = ${lamL}: asentamiento bajo la carga`, g('wmax', 'm'), P * lam / (2 * k) * (ch + c + 2) / (sh + sn), 0.003);
    near(`λL = ${lamL}: momento bajo la carga`, g('Mpos', 'tonf*m'), P / (4 * lam) * (ch - c) / (sh + sn), 0.005);
  }
}

section('Taludes — problemas de verificación publicados (Rocscience Slide2 Verification Manual)');
{
  // ACADS 1(a) (Giam y Donald 1989): c' = 3 kPa, φ' = 19.6°, γ = 20 kN/m³; Bishop 0.987 (Slide), referencia 1.00
  let g = block('slope', { superficie: '20 25\n30 25\n50 35\n70 35', estratos: '35 3 19.6 20 Suelo', unidades: 'kN', malla: '22.8 43.7 42.3 62.6 12', ybase: '20', ndov: '50' });
  near('ACADS 1(a): FS Bishop = 0.987 (Slide #1)', g('FS'), 0.987, 0.01);
  // Arai y Tagyo (1985) ej. 1: c' = 41.65 kPa, φ' = 15°, γ = 18.82 kN/m³; Bishop 1.409 (Slide #14), 1.451 (Arai)
  g = block('slope', { superficie: '0 15\n18 15\n48 35\n66 35', estratos: '35 41.65 15 18.82 Suelo', unidades: 'kN', malla: '10 40 36 70 10', ybase: '0', ndov: '50' });
  near('Arai y Tagyo ej. 1: FS Bishop = 1.409 (Slide #14)', g('FS'), 1.409, 0.01);
  // Arai y Tagyo (1985) ej. 3: mismo talud con NF poligonal; Bishop 1.118 (Slide #16)
  g = block('slope', { superficie: '0 15\n18 15\n48 35\n66 35', estratos: '35 41.65 15 18.82 Suelo', unidades: 'kN', nf: '0 15\n18 15\n30 23\n48 29\n66 32', malla: '10 40 30 70 10', ybase: '0', ndov: '50' });
  near('Arai y Tagyo ej. 3 (NF poligonal): FS Bishop = 1.118 (Slide #16)', g('FS'), 1.118, 0.01);
  // Yamagami y Ueta (1988): c' = 9.8 kPa, φ' = 10°, γ = 17.64 kN/m³; círculo (8.672, 13.934, R 9.695)
  g = block('slope', { superficie: '0 5\n5 5\n15 10\n25 10', estratos: '10 9.8 10 17.64 Suelo', unidades: 'kN', circulo: '8.672 13.934 9.695', ndov: '100' });
  near('Yamagami y Ueta: Bishop en el círculo crítico = 1.344 (Slide #17; 1.348 Y-U)', g('FSb'), 1.344, 0.005);
  near('Yamagami y Ueta: Fellenius = 1.282 (Y-U; Slide «Original» 1.278)', g('FSf'), 1.282, 0.006);
  g = block('slope', { superficie: '0 5\n5 5\n15 10\n25 10', estratos: '10 9.8 10 17.64 Suelo', unidades: 'kN', malla: '3 15 10 25 10', ybase: '0', ndov: '40' });
  near('Yamagami y Ueta: búsqueda automática, FS Bishop = 1.344', g('FS'), 1.344, 0.005);
  near('Yamagami y Ueta: centro del círculo crítico xc ≈ 8.67 m', g('xc', 'm'), 8.672, 0.03);
}

section('Pilotes: carga lateral de Broms (1964) — soluciones cerradas');
v = calc(`H1 = HuBromsC(1 kPa, 1 m, 100 m, 0 m, 100 kN*m, 1)
H2 = HuBromsC(1 kPa, 1 m, 100 m, 0 m, 100 kN*m, 2)
H3 = HuBromsC(1 kPa, 1 m, 4 m, 0 m, 1e9 kN*m, 2)
H4 = HuBromsC(50 kPa, 0.5 m, 10 m, 0 m, 1e9 kN*m, 1)
H5 = HuBromsS(1 kN/m^3, 30 deg, 1 m, 4 m, 0 m, 1e9 kN*m, 1)
H6 = HuBromsS(1 kN/m^3, 30 deg, 1 m, 4 m, 0 m, 1e9 kN*m, 2)
H7 = HuBromsS(1 kN/m^3, 30 deg, 1 m, 40 m, 0 m, 300 kN*m, 1)
H8 = HuBromsS(1 kN/m^3, 30 deg, 1 m, 6 m, 0 m, 100 kN*m, 2)`);
near('Cohesivo, cabeza libre, largo: H(1.5D + H/(18cuD)) = My', v('H1', 'kN'), 9 * (-1.5 + Math.sqrt(2.25 + 4 * 100 / 18)), 0.001);
near('Cohesivo, cabeza empotrada, largo: H(1.5D + 0.5f) = 2My', v('H2', 'kN'), 9 * (-1.5 + Math.sqrt(2.25 + 4 * 200 / 18)), 0.001);
near('Cohesivo, empotrado, corto: Hu = 9cuD(L − 1.5D)', v('H3', 'kN'), 22.5, 0.001);
{ const H = v('H4', 'kN'), f = H / 225, g2 = 9.25 - f; near('Cohesivo, libre, corto: H(1.5D + 0.5f) = 2.25cuDg²', H * (0.75 + 0.5 * f), 2.25 * 50 * 0.5 * g2 * g2, 0.001); }
near('Granular, libre, corto: 0.5γDL³Kp/(e + L) = 0.5·64·3/4', v('H5', 'kN'), 0.5 * 64 * 3 / 4, 0.001);
near('Granular, empotrado, corto: 1.5γL²DKp', v('H6', 'kN'), 1.5 * 16 * 3, 0.001);
{ const H = v('H7', 'kN'); near('Granular, libre, largo: H·0.54√(H/(γDKp)) = My', H * 0.54 * Math.sqrt(H / 3), 300, 0.001); }
near('Granular, empotrado, intermedio: (0.5γDL³Kp + My)/L', v('H8', 'kN'), (0.5 * 3 * 216 + 100) / 6, 0.001);

section('Licuación: rd de Cetin et al. (2004) y Kσ (Hynes y Olsen 1999)');
v = calc(`r0 = rdCetin(0 m, 0.3, 7.5, 200 m/s)
r10 = rdCetin(10 m, 0.3, 7.5, 200 m/s)
r25 = rdCetin(25 m, 0.3, 7.5, 200 m/s)
r20 = rdCetin(20 m, 0.3, 7.5, 200 m/s)
K1 = KsigmaYoud(50 kPa, 10)
K2 = KsigmaYoud(200 kPa, 7.36)
K3 = KsigmaYoud(400 kPa, 29.44)`);
near('rd Cetin (z = 0) = 1', v('r0'), 1, 0.0001);
{ const A = -23.013 - 2.949 * 0.3 + 0.999 * 7.5 + 0.0525 * 200, f = (d) => 1 + A / (16.258 + 0.201 * Math.exp(0.341 * (-d + 0.0785 * 200 + 7.586)));
  near('rd Cetin (z = 10 m) = ec. de Cetin et al. (2004)', v('r10'), f(10) / f(0), 0.0001); }
near('rd Cetin (z ≥ 20 m): rd(20) − 0.0046(z − 20)', v('r25'), v('r20') - 0.023, 0.0001);
near("Kσ = 1 para σ'v ≤ pa", v('K1'), 1, 0.0001);
near("Kσ (Dr = 40 %, f = 0.8): (200/101.3)^−0.2", v('K2'), (200 / 101.325) ** -0.2, 0.002);
near("Kσ (Dr = 80 %, f = 0.6): (400/101.3)^−0.4", v('K3'), (400 / 101.325) ** -0.4, 0.002);

section('Perfil estratigráfico');
{
  const g = block('soilprofile', { estratos: '2 SM 1.8 2.0 Arena\n3 CL 1.7 1.9 Arcilla', nf: '1.0 m', spt: '1.5 10\n4 12', ER: '60', zref: '4 m' });
  const sv = 1.8 * 1 + 2.0 * 1 + 1.9 * 2, u = 3;
  near('σv en z = 4 m (γ sobre NF, γsat bajo NF)', g('sv_ref', 'tonf/m^2'), sv, 0.001);
  near("σ'v = σv − u", g('svp_ref', 'tonf/m^2'), sv - u, 0.001);
  const N160 = g('N160v').toArray()[0], svp = (1.8 + 0.5 * 1.0) * 9.80665;
  near('(N1)60 en z = 1.5 m = CN·N·CR (CR = 0.75)', N160, Math.min(1.7, Math.sqrt(100 / svp)) * 10 * 0.75, 0.001);
}

section('Plantillas del módulo: sin errores y todas las verificaciones cumplen');
for (const t of TEMPLATES.filter(t => t.id.startsWith('ge-'))) {
  const g = runTemplate(t.id); const c = g.res.ctx;
  truthy(`${t.name} (${c.checks.length} verificaciones)`, c.errors.length === 0 && c.checks.length > 0 && c.checks.every(x => x.ok), c.errors.map(e => e.msg).join('; ') + c.checks.filter(x => !x.ok).map(x => x.label).join('; '));
}
{
  const g = runTemplate('ge-portante');
  near('Portante: Nγ Meyerhof (φ = 30°) en la plantilla', g('Ngamma'), 15.67, 0.002);
  near("Portante: Q = P + γm·B·L·Df; B' = B − 2·MB/Q", g('Bp', 'm'), 2.6 - 2 * 3 / (110 + 2 * 2.6 * 3.0 * 1.5), 0.001);
  truthy('Portante: qadm = min(qadm1, qadm2) (E.050 Art. 22.2)', Math.abs(g('qadm', 'kPa') - Math.min(g('qadm1', 'kPa'), g('qadm2', 'kPa'))) < 1e-9);
  const gc = runTemplate('ge-combinada');
  near('Combinada: presión de servicio uniforme = R/(B·L)', gc('q', 'tonf/m^2'), 185 / (gc('Bz', 'm') * gc('Lz', 'm')), 0.001);
  {
    // Servicio con sismo −X a mano: P1 = 80, P2 = 105, M = −(Mb1 + Mb2) con Mb = MS + VS·hz
    const Lz = gc('Lz', 'm'), Bz = gc('Bz', 'm'), Mb = 4 + 3 * 0.8 + 6 + 4 * 0.8;
    const Mc = 80 * (0.6 - Lz / 2) + 105 * (5.6 - Lz / 2) - Mb, e = Mc / 185;
    near('Combinada: e de servicio con sismo −X = ΣP(x − L/2)/R (método rígido)', gc('e_R_s', 'm'), e, 0.001);
    near('Combinada: qmax con sismo = R/(BL)·(1 + 6|e|/L)', gc('qmax_s', 'tonf/m^2'), 185 / (Bz * Lz) * (1 + 6 * Math.abs(e) / Lz), 0.001);
    near('Combinada: qns = 1.20 qa − γm Df − s/c (E.050 Art. 21)', gc('qns', 'tonf/m^2'), 1.2 * 20 - 3 - 0.4, 0.001);
    // Envolvente: la del bloque coincide con el caso gobernante calculado por separado
    const one = (cargas) => block('winkler', { metodo: 'rigido', L: Lz + ' m', B: Bz + ' m', E: '2.17e6 tonf/m^2', I: '0.07 m^4', ks: '', cargas, dcrit: '0.906 m' });
    const P = (k) => gc(k, 'tonf'), M1 = gc('Mb1', 'tonf*m'), M2 = gc('Mb2', 'tonf*m');
    const u1 = one(`P 0.6 ${P('Pu1')}\nP 5.6 ${P('Pu2')}`), u3 = one(`P 0.6 ${P('P1_3')}\nP 5.6 ${P('P2_3')}\nM 0.6 ${-M1}\nM 5.6 ${-M2}`), u4 = one(`P 0.6 ${P('P1_4')}\nP 5.6 ${P('P2_4')}\nM 0.6 ${M1}\nM 5.6 ${M2}`);
    near('Combinada: Mneg de la envolvente = Mneg de U1 (gobierna gravedad)', gc('Mneg_u', 'tonf*m'), Math.min(u1('Mneg', 'tonf*m'), u3('Mneg', 'tonf*m')), 0.0005);
    const u5 = one(`P 0.6 ${P('P1_5')}\nP 5.6 ${P('P2_5')}\nM 0.6 ${-M1}\nM 5.6 ${-M2}`);
    near('Combinada: qmin de la envolvente = mín(U4, U5) (0.9CM ± CS)', gc('qmin_u', 'tonf/m^2'), Math.min(u4('qmin', 'tonf/m^2'), u5('qmin', 'tonf/m^2')), 0.0005);
    truthy('Combinada: Vd (a d de la cara) ≤ Vmax de la envolvente', gc('Vd_u', 'tonf') <= gc('Vmax_u', 'tonf') && gc('Vd_u', 'tonf') > 0);
    const w = block('winkler', { metodo: 'rigido', L: '6 m', B: '1 m', E: '2.17e6 tonf/m^2', I: '0.05 m^4', ks: '', cargas: 'CASO A\nP 1 50\nP 5 50\nCASO B\nP 1 30\nP 5 70\nM 5 20', qadm: '100 tonf/m^2' });
    const wa = block('winkler', { metodo: 'rigido', L: '6 m', B: '1 m', E: '2.17e6 tonf/m^2', I: '0.05 m^4', ks: '', cargas: 'P 1 30\nP 5 70\nM 5 20' });
    near('Bloque winkler con CASO: qmax = máx. de los casos (caso B: R = 100, e = (−60 + 140 + 20)/100 = 1 m)', w('qmax', 'tonf/m^2'), 100 / 6 * (1 + 6 * 1 / 6), 0.0001);
    near('Bloque winkler con CASO: e_R del caso más excéntrico', w('e_R', 'm'), wa('e_R', 'm'), 1e-9);
    truthy('Bloque winkler con CASO: tabla por caso y una sola verificación de qadm', /<table class="tbl">/.test(w.html) && w.ctx.checks.length === 1);
    // sismo fuerte: la presión de servicio con sismo y la excentricidad no cumplen
    const gs = runTemplate('ge-combinada', (d) => d.blocks.forEach(b => { if (typeof b.src === 'string') b.src = b.src.replace(/^MS2 = 6 tonf\*m/m, 'MS2 = 60 tonf*m').replace(/^PS2 = 5 tonf/m, 'PS2 = 40 tonf'); }));
    const lab = (re) => gs.res.ctx.checks.filter(x => re.test(x.label));
    truthy('Combinada con MS2 = 60 t·m y PS2 = 40 t: presión con sismo > 1.20 qa → NO CUMPLE, sin errores', gs.res.ctx.errors.length === 0 && lab(/envolvente de 2 casos/).some(x => !x.ok));
    truthy('Combinada con sismo fuerte: la envolvente sísmica gobierna la flexión (|M−| y M+ mayores que con U1)', gs('Mneg_u', 'tonf*m') < u1('Mneg', 'tonf*m') - 5 && gs('Mpos_u', 'tonf*m') > u1('Mpos', 'tonf*m') + 5, `${gs('Mneg_u', 'tonf*m').toFixed(1)} / ${gs('Mpos_u', 'tonf*m').toFixed(1)} t·m`);
  }
  const gp = runTemplate('ge-pilote');
  near('Pilote: Qu = Qp + ΣQs', gp('Qu', 'tonf'), gp('Qp', 'tonf') + gp('Qs', 'tonf'), 0.0001);
  const gl = runTemplate('ge-licuacion', (d) => { d.blocks[2].src = d.blocks[2].src.replace('amax = 0.30', 'amax = 0.45'); });
  truthy('Licuación con amax = 0.45 g ya no cumple (prueba de sensibilidad)', !gl.res.ctx.checks.every(x => x.ok));
  near('Licuación: CRR_M = MSF·Kσ·CRR7.5 (z = 15 m)', gl('CRRM').toArray()[14], gl('MSF') * gl('Ks').toArray()[14] * gl('CRR').toArray()[14], 0.0001);
  const gn = runTemplate('ge-pilote', (d) => { d.blocks.forEach(b => { if (typeof b.src === 'string') b.src = b.src.replace(/^fneg = 1/m, 'fneg = 2'); }); });
  near('Pilote con fricción negativa: Qn = β·per·Σ(q + σ\'v)H', gn('Qn', 'tonf'), gn('betan') * 1.6 * ((2 + gn('sigmav1', 'tonf/m^2')) * 2 + (2 + gn('sigmav2', 'tonf/m^2')) * 4), 0.001);
  truthy('Pilote con fricción negativa: sin fricción positiva en la arcilla y P + Qn > Qadm → NO CUMPLE', gn('Qsc', 'tonf') === 0 && gn.res.ctx.checks.some(x => !x.ok) && gn.res.ctx.errors.length === 0);
  const gt = runTemplate('ge-talud');
  truthy('Talud: FS estático Bishop ≥ Fellenius y seudoestático < estático', gt('FSb_est') >= gt('FSf_est') && gt('FS_sis') < gt('FS_est'), `${gt('FS_est').toFixed(3)} / ${gt('FS_sis').toFixed(3)}`);
}

section('Plantillas con datos extremos: NO CUMPLE, sin errores ni NaN');
{
  const sub = (re, to) => (d) => { d.blocks.forEach(b => { if (typeof b.src === 'string') b.src = b.src.replace(re, to); }); };
  const cases = [
    ['ge-portante', /^P = 110 tonf/m, 'P = 400 tonf'], ['ge-portante', /^ML = 6 tonf\*m/m, 'ML = 120 tonf*m'],
    ['ge-combinada', /^PD2 = 80 tonf/m, 'PD2 = 400 tonf'], ['ge-combinada', /^qa = 2.0 kgf\/cm\^2/m, 'qa = 0.5 kgf/cm^2'],
    ['ge-conectada', /^PD1 = 40 tonf/m, 'PD1 = 200 tonf'], ['ge-medianera', /^caso = 2/m, 'caso = 1'],
    ['ge-platea', /^qa = 1.4 kgf\/cm\^2/m, 'qa = 0.4 kgf/cm^2'], ['ge-platea', /^ks = 2.0 kgf\/cm\^3/m, 'ks = 12 kgf/cm^3'], ['ge-winkler', /^PD2 = 75 tonf/m, 'PD2 = 400 tonf'],
    ['ge-corrido', /^wD = 8.5 tonf\/m/m, 'wD = 40 tonf/m'], ['ge-pilote', /^P = 45 tonf/m, 'P = 200 tonf'],
    ['ge-grupo', /^PD = 180 tonf/m, 'PD = 900 tonf'], ['ge-licuacion', /^amax = 0.30/m, 'amax = 0.60'],
    ['ge-talud', /^c1 = 3.5 tonf\/m\^2/m, 'c1 = 0.3 tonf/m^2'], ['ge-spt', /^pexp = 10.0 m/m, 'pexp = 3 m'],
  ];
  for (const [id, re, to] of cases) {
    const g = runTemplate(id, sub(re, to)), c = g.res.ctx;
    const nan = [...c.scope.entries()].filter(([, val]) => { try { return /NaN|Infinity/.test(math.format(val)); } catch (e) { return false; } }).map(([k]) => k);
    truthy(`${id} con ${to}`, c.errors.length === 0 && !nan.length && c.checks.some(x => !x.ok), c.errors.map(e => e.msg).join('; ') + nan.join(','));
  }
}

section('Rangos usuales [mín..máx] y ejemplos de validación de las plantillas «geotech»');
for (const t of TEMPLATES.filter(x => x.id.startsWith('ge-'))) {
  const inp = runTemplate(t.id).res.ctx.inputs, rg = inp.filter(i => i.range);
  const out = rg.filter(i => { let v = parseFloat(i.num); if (i.range.unit && i.unit && i.range.unit !== i.unit) v = math.unit(v, i.unit).toNumber(i.range.unit); return !(v >= i.range.min && v <= i.range.max); });
  const bad = inp.filter(i => /\.\.|\[/.test(i.label || ''));
  truthy(`${t.id}: ${rg.length} datos con rango, valores por defecto dentro del rango, etiquetas limpias`, rg.length >= 3 && out.length === 0 && bad.length === 0, out.map(i => i.name + ' = ' + i.num).concat(bad.map(i => i.name)).join(', '));
  const v = t.validacion;
  truthy(`${t.id}: tiene «validacion» con fuente, nota y valores`, !!(v && v.fuente && v.nota && Array.isArray(v.valores) && v.valores.length >= 3));
}
{
  const cn = runTemplate('ge-conectada');
  truthy('Zapata conectada: la interior se diseña sin el alivio (R2d = máx(R2, P2), Ru2d = máx(Ru2, Pu2))', cn('R2d', 'tonf') >= cn('R2', 'tonf') && Math.abs(cn('Ru2d', 'tonf') - 140.5) < 1e-6);
}
truthy('Listas desplegables intactas con rango (φ, f\'c, FS de licuación)', (() => { const f = (id, n) => runTemplate(id).res.ctx.inputs.find(i => i.name === n); return f('ge-portante', 'phi').options.length === 5 && f('ge-portante', 'phi').range.max === 45 && f('ge-combinada', 'fc').options.length === 3 && f('ge-licuacion', 'FSreq').options.length === 3; })());
truthy('Capacidad portante: validacion con los factores publicados de Das (φ = 30°)', TEMPLATES.find(x => x.id === 'ge-portante').validacion.valores.some(v => v.var === 'Nq' && v.esperado === 18.40));
section('Segunda opinión — segunda tanda (ge-platea, ge-medianera)');
{ const sub2 = (pairs) => (d) => { for (const [a, b] of pairs) { let hit = false; d.blocks.forEach(x => { if (typeof x.src === 'string' && x.src.includes(a)) { x.src = x.src.replace(a, b); hit = true; } }); if (!hit) throw new Error('No se encontró: ' + a); } };
  const g = runTemplate('ge-platea');
  near('Platea: qn = qa − γm·Df = 14 − 2 = 12 t/m² (peso de losa y relleno, como en zapatas)', g('qn', 'tonf/m^2'), 12, 1e-9);
  near('Platea: 1.75/β con β = (ks·B1/(4EcI))^¼ (ACI 336.2R)', g('Lrig', 'm'), 1.75 / Math.pow(2000 * 6 / (4 * g('Ecp', 'tonf/m^2') * 6 * 0.9 ** 3 / 12), 0.25), 1e-6);
  const g2 = runTemplate('ge-platea', sub2([['qa = 1.4 kgf/cm^2', 'qa = 1.2 kgf/cm^2']]));
  truthy('Platea con qa = 1.2 kg/cm² y Df = 1 m: NO CUMPLE la presión neta (antes cumplía sin el peso de la losa)', g2.res.ctx.checks.some(c => !c.ok && /presión neta/.test(c.label)));
  const m = runTemplate('ge-medianera');
  const b1 = m('b1p', 'm'), b2 = m('b2p', 'm'), d = m('d', 'm'), c = b1 * b1 / (2 * b1 + b2);
  const Jc = 2 * (b1 * d ** 3 / 12 + d * b1 ** 3 / 12 + b1 * d * (b1 / 2 - c) ** 2) + b2 * d * c * c;
  near('Medianera: Jc de columna de borde (ACI R8.4.4.2.3)', m('Jcb', 'm^4'), Jc, 1e-9);
  near('Medianera: vu = Vu/(bo d) + γv·|Mtu − Vu·eg|·cAB/Jc', m('vub', 'tonf/m^2'), m('Vu', 'tonf') / (m('bo', 'm') * d) + m('gvb') * Math.abs(m('Mtu', 'tonf*m') - m('Vu', 'tonf') * m('eg', 'm')) * c / Jc, 1e-9);
}
section('ge-medianera con sismo (E.060 9.2.3 y E.050 Art. 21)');
{ const sub2 = (pairs) => (d) => { for (const [a, b] of pairs) { let hit = false; d.blocks.forEach(x => { if (typeof x.src === 'string' && x.src.includes(a)) { x.src = x.src.replace(a, b); hit = true; } }); if (!hit) throw new Error('No se encontró: ' + a); } };
  const m = runTemplate('ge-medianera');
  const P = 47, PS = 3, Mb = 0.8 + 0.6 * 0.6, B = 1.05, L = 2.05, ec = B / 2 - 0.2;
  near('Medianera: qns = 1.20·qa − γm·Df = 27 t/m²', m('qns', 'tonf/m^2'), 30 - 3, 1e-9);
  near('Medianera: Mb = MS + VS·hz', m('Mb', 'tonf*m'), Mb, 1e-9);
  near('Medianera: servicio −X (tensor): qmax = (P + PS)/(BL)·(1 + 6e/B), e = Mb/(P + PS)', m('qmax_s', 'tonf/m^2'), (P + PS) / (B * L) * (1 + 6 * (Mb / (P + PS)) / B), 1e-9);
  near('Medianera: e máxima de servicio con sismo (+X) = Mb/(P − PS)', m('e_R_s', 'm'), Mb / (P - PS), 1e-9);
  near('Medianera: U3 = 1.25(CM + CV) + PS', m('Pu3', 'tonf'), 1.25 * P + PS, 1e-9);
  near('Medianera: U4 = 0.9CM − PS', m('Pu4', 'tonf'), 0.9 * 35 - PS, 1e-9);
  const q3 = (1.25 * P + PS) / (B * L) * (1 + 6 * (Mb / (1.25 * P + PS)) / B);
  truthy('Medianera: por defecto gobierna U1 en la presión última (U3 a mano menor)', Math.abs(m('qmax_u', 'tonf/m^2') - 69.4 / (B * L)) < 1e-9 && q3 < m('qmax_u', 'tonf/m^2'), `U3 ${q3.toFixed(2)}`);
  near('Medianera: punzonamiento U3 con γv·|Pu3·ec − MS − Vu3·eg|·cAB/Jc', m('vu3s', 'tonf/m^2'), m('Vu3s', 'tonf') / (m('bo', 'm') * m('d', 'm')) + m('gvb') * Math.abs((1.25 * P + PS) * ec - 0.8 - m('Vu3s', 'tonf') * m('eg', 'm')) * m('cAB', 'm') / m('Jcb', 'm^4'), 1e-9);
  const ms = runTemplate('ge-medianera', sub2([['MS = 0.8 tonf*m', 'MS = 6 tonf*m']])), cs = ms.res.ctx;
  truthy('Medianera con MS = 6 t·m: NO CUMPLE la presión de servicio con sismo (1.20 qa), sin errores', cs.errors.length === 0 && cs.checks.some(x => !x.ok && /qadm/.test(x.label)) && ms('qmax_u', 'tonf/m^2') > m('qmax_u', 'tonf/m^2'), cs.errors.map(e => e.msg).join('; '));
  const mx = runTemplate('ge-medianera', sub2([['PS = 3 tonf', 'PS = 60 tonf'], ['MS = 0.8 tonf*m', 'MS = 30 tonf*m']])), cx = mx.res.ctx;
  truthy('Medianera con PS = 60 t y MS = 30 t·m: levantamiento y resultante fuera → NO CUMPLE sin errores', cx.errors.length === 0 && cx.checks.some(x => !x.ok && /U4/.test(x.label)) && cx.checks.some(x => !x.ok && /2\/3 centrales/.test(x.label)), cx.errors.map(e => e.msg).join('; '));
  const m1 = runTemplate('ge-medianera', sub2([['caso = 2', 'caso = 1'], ['MS = 0.8 tonf*m', 'MS = 20 tonf*m']])).res.ctx;
  truthy('Medianera sin tensor y MS = 20 t·m: NO CUMPLE sin errores', m1.errors.length === 0 && m1.checks.some(x => !x.ok), m1.errors.map(e => e.msg).join('; '));
}
section('ge-licuacion: lista de amax = Z·S (E.030)');
{ const inp = runTemplate('ge-licuacion').res.ctx.inputs.find(i => i.name === 'amax');
  truthy('Licuación: amax con lista desplegable Z·S, valor por defecto 0.30 entre las opciones y rango intacto', inp.options && inp.options.length >= 8 && inp.options.includes('0.30') && inp.options.includes('0.45') && inp.range && inp.range.min === 0.05 && inp.range.max === 0.6);
  truthy('Licuación: opciones de zona 4 = 0.45·S con S de la E.030-2026 (1.00, 1.10, 1.20)', ['0.45', '0.50', '0.54'].every(v => inp.options.includes(v)) && inp.optLabels.filter(t => /Zona 4/.test(t)).length === 3);
  const src = TEMPLATES.find(x => x.id === 'ge-licuacion').blocks.map(b => b.src || '').join('\n');
  truthy('Licuación: advierte que en la costa (zona 4) corresponde ≈ 0.45 g', /costa[^"]*zona 4[^"]*0\.45/.test(src));
}
done();
