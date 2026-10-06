// Pruebas de validación — módulo «geotech» (E.050, Das, Bowles, Hetényi, Taylor, Youd et al.)
import { near, truthy, calc, block, runTemplate, section, done, TEMPLATES } from './helpers.mjs';

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
  near("Portante: B' = B − 2eB", g('Bp', 'm'), 2.4 - 2 * 3 / 110, 0.001);
  truthy('Portante: qadm = min(qadm1, qadm2) (E.050 Art. 22.2)', Math.abs(g('qadm', 'kPa') - Math.min(g('qadm1', 'kPa'), g('qadm2', 'kPa'))) < 1e-9);
  const gc = runTemplate('ge-combinada');
  near('Combinada: presión de servicio uniforme = R/(B·L)', gc('q', 'tonf/m^2'), 185 / (gc('Bz', 'm') * gc('Lz', 'm')), 0.001);
  const gp = runTemplate('ge-pilote');
  near('Pilote: Qu = Qp + ΣQs', gp('Qu', 'tonf'), gp('Qp', 'tonf') + gp('Qs', 'tonf'), 0.0001);
  const gl = runTemplate('ge-licuacion', (d) => { d.blocks[2].src = d.blocks[2].src.replace('amax = 0.30', 'amax = 0.45'); });
  truthy('Licuación con amax = 0.45 g ya no cumple (prueba de sensibilidad)', !gl.res.ctx.checks.every(x => x.ok));
}

done();
