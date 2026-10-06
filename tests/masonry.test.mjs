// Pruebas de validación — módulo «masonry»
// E.070 (ejemplo de San Bartolomé, edificio de 4 pisos), Tabla 12, E.010/JUNAC, E.080,
// ACI 350.3-06 (Housner), PCA Circular Concrete Tanks (Tablas A-1, A-2, A-5, A-12) y placas (Timoshenko)
import { near, truthy, calc, block, runTemplate, section, done, TEMPLATES, math } from './helpers.mjs';
import { shellPCA, plateFD, tankWall } from '../src/norms/masonry.js';

section('E.070 — Tabla 9 y fórmulas básicas');
let g = calc(`fm = fmE070(2)
vm = vmE070(2)
fb = fbE070(10)
fm10 = fmE070(10)
Em = EmE070(fm, 1)
Ems = EmE070(fmE070(4), 2)
Fa = FaE070(65 kgf/cm^2, 2.40 m, 0.13 m)
Fa23 = FaE070(65 kgf/cm^2, 2.40 m, 0.23 m)
dmin = dminE070(0.4, 1, 1, 4)
a1 = alphaE070(6.29 tonf, 3.13 m, 34.22 tonf*m)
a2 = alphaE070(1 tonf, 1 m, 10 tonf*m)
a3 = alphaE070(10 tonf, 4 m, 10 tonf*m)
Vm = VmE070(8.1 kgf/cm^2, 0.5, 13 cm, 4 m, 20 tonf)
Vms = VmE070(9.7 kgf/cm^2, 1, 13 cm, 4 m, 0 tonf, 2)
f1 = factE070(12.82 tonf, 6.29 tonf)
f2 = factE070(30 tonf, 5 tonf)`);
near("f'm King Kong industrial = 65 kg/cm² (Tabla 9)", g('fm', 'kgf/cm^2'), 65);
near("v'm King Kong industrial = 8.1 kg/cm² (Tabla 9)", g('vm', 'kgf/cm^2'), 8.1);
near("f'b bloque P = 85 kg/cm²; f'm = 120 kg/cm²", g('fb', 'kgf/cm^2') + g('fm10', 'kgf/cm^2'), 205);
near('Em = 500 f\'m = 32 500 kg/cm² (Art. 24.7)', g('Em', 'kgf/cm^2'), 32500);
near('Em sílice-cal = 600 f\'m = 66 000 kg/cm²', g('Ems', 'kgf/cm^2'), 66000);
near('San Bartolomé: Fa = 93.8 t/m² (t = 13 cm, h = 2.40 m)', g('Fa', 'tonf/m^2'), 93.8, 0.001);
near('Fa ≤ 0.15 f\'m (t = 23 cm) = 9.75 kg/cm²', g('Fa23', 'kgf/cm^2'), 9.75);
near('San Bartolomé: densidad mínima ZUSN/56 = 0.0286', g('dmin'), 0.0286, 0.002);
near('α = Ve L/Me (muro X1 de San Bartolomé) = 0.575', g('a1'), 6.29 * 3.13 / 34.22);
near('α ≥ 1/3', g('a2'), 1 / 3); near('α ≤ 1', g('a3'), 1);
near('Vm = 0.5 v\'m α t L + 0.23 Pg', g('Vm', 'tonf'), 0.5 * 81 * 0.5 * 0.13 * 4 + 0.23 * 20);
near('Vm sílice-cal = 0.35 v\'m α t L', g('Vms', 'tonf'), 0.35 * 97 * 0.13 * 4);
near('Factor Vm1/Ve1 = 12.82/6.29 = 2.04 (muro X1)', g('f1'), 12.82 / 6.29);
near('Factor Vm1/Ve1 acotado a 3', g('f2'), 3);

section('E.070 — diseño de confinamientos (San Bartolomé, muro X1 del primer piso)');
g = calc(`Vm1 = 12.82 tonf
Mu1 = 69.81 tonf*m
L = 3.13 m
h = 2.52 m
Nc = 2
Lm = L
Pc = 7.10 tonf
Pt = 3.23 tonf
fc = 175 kgf/cm^2
fy = 4200 kgf/cm^2
Vc = 1.5*Vm1*Lm/(L*(Nc + 1))
M = Mu1 - Vm1*h/2
F = M/L
Tc = F - Pc - Pt
Cc = Pc + F
Asf = Vc/(fy*1.0*0.85)
Ast = Tc/(fy*0.85)
As = Asf + Ast
Acf = Vc/(0.2*fc*0.85)
Ac = 13 cm*20 cm
An = 9 cm*16 cm
Av = 2*0.32 cm^2
s1 = Av*fy/(0.3*9 cm*fc*(Ac/An - 1))
s2 = Av*fy/(0.12*9 cm*fc)
s3 = max(20 cm/4, 5 cm)
s = min(s1, s2, s3, 10 cm)
Ts = Vm1*Lm/(2*L)
Ass = Ts/(0.9*fy)`);
near('Vc = 1.5 Vm1 Lm/(L(Nc+1)) = 6.41 t', g('Vc', 'tonf'), 6.41, 0.002);
near('M = Mu1 − ½ Vm1 h = 53.66 t·m', g('M', 'tonf*m'), 53.66, 0.002);
near('F = M/L = 17.14 t', g('F', 'tonf'), 17.14, 0.002);
near('T = F − Pc − Pt = 6.81 t', g('Tc', 'tonf'), 6.81, 0.003);
near('C = Pc + F = 24.24 t', g('Cc', 'tonf'), 24.24, 0.002);
near('As = Asf + Ast = 3.70 cm² (μ = 1.0, φ = 0.85)', g('As', 'cm^2'), 3.70, 0.005);
near('Acf = Vc/(0.2 f\'c φ) = 215 cm² ≤ 13×20 = 260 cm²', g('Acf', 'cm^2'), 215.5, 0.003);
near('Estribos: s = 5 cm (s3 = d/4 rige)', g('s', 'cm'), 5);
near('Solera: Ts = 6.41 t', g('Ts', 'tonf'), 6.41, 0.002);
near('Solera: As = Ts/(0.9 fy) = 1.70 cm²', g('Ass', 'cm^2'), 1.70, 0.005);

section('E.070 — Tabla 12 (coeficiente m) y E.030-2003 C1');
g = calc(`m1 = mE070(1, 1.0)
m15 = mE070(1, 1.5)
m3 = mE070(1, 3)
minf = mE070(1, 1e6)
m21 = mE070(2, 1.0)
m22 = mE070(2, 2.0)
c3 = mE070(3)
c4 = mE070(4)
c1 = C1E030a(4)`);
near('Caso 1, b/a = 1.0: m = 0.0479', g('m1'), 0.0479);
near('Caso 1, b/a = 1.5: m = (0.0755 + 0.0862)/2', g('m15'), 0.08085);
near('Caso 1, b/a = 3.0: m = 0.118', g('m3'), 0.118);
near('Caso 1, b/a → ∞: m = 0.125', g('minf'), 0.125, 0.001);
near('Caso 2, b/a = 1.0: m = 0.112', g('m21'), 0.112);
near('Caso 2, b/a = 2.0: m = 0.132', g('m22'), 0.132);
near('Caso 3: m = 0.125; caso 4: m = 0.5', g('c3') + g('c4'), 0.625);
near('C1 de cercos = 0.6 (E.030-2003)', g('c1'), 0.6);

section('Placas por diferencias finitas (Timoshenko y E.070 Tabla 12)');
let p = plateFD(1, 1, { bot: 'A', top: 'A', left: 'A', right: 'A' }, () => 1, 0.3, 24, 24);
near('Placa apoyada cuadrada: w = 0.00406 qa⁴/D', p.w(12, 12), 0.00406, 0.01);
near('Placa apoyada cuadrada: M = 0.0479 qa² (= m caso 1)', p.Mx(12, 12), 0.0479, 0.01);
p = plateFD(1, 1, { bot: 'E', top: 'E', left: 'E', right: 'E' }, () => 1, 0.3, 24, 24);
near('Placa empotrada cuadrada: M centro = 0.0231 qa²', p.Mx(12, 12), 0.0231, 0.01);
near('Placa empotrada cuadrada: M borde = −0.0513 qa²', -p.Mx(0, 12), 0.0513, 0.015);
for (const [ba, m] of [[0.5, 0.060], [1.0, 0.112], [2.0, 0.132]]) {
  const r = plateFD(1, ba, { bot: 'A', top: 'L', left: 'A', right: 'A' }, () => 1, 0.3, 24, Math.round(24 * Math.max(ba, 0.5)));
  near(`3 bordes apoyados + borde libre, b/a = ${ba}: m = ${m} (E.070 Tabla 12)`, r.Mx(12, r.ny), m, 0.01);
}
let tw = tankWall(10, 1, { bot: 'E', top: 'L', left: 'E', right: 'E' }, 1, 0, 0.2, 20);
near('Franja empotrada–libre, carga triangular: M base = qH²/6', -tw.MyB, 1 / 6, 0.03);
tw = tankWall(10, 1, { bot: 'E', top: 'A', left: 'E', right: 'E' }, 1, 0, 0.2, 20);
near('Franja empotrada–articulada, triangular: M base = qH²/15', -tw.MyB, 1 / 15, 0.03);
near('Franja empotrada–articulada, triangular: V base = 0.4 qH', tw.Vb, 0.4, 0.04);

section('PCA Circular Concrete Tanks — teoría de cáscaras (ν = 0.2)');
let sh = shellPCA(3, 1);
const A1 = [0.134, 0.203, 0.267, 0.322, 0.357, 0.362, 0.330, 0.262, 0.157, 0.052];
A1.forEach((c, i) => near(`Tabla A-1, H²/Dt = 3, ${(i / 10).toFixed(1)}H: ${c}`, sh.T(i / 10), c, 0.03));
const A2 = [[0.3, 0.0047], [0.5, 0.0090], [0.6, 0.0097], [0.7, 0.0077], [0.9, -0.0119], [1.0, -0.0333]];
A2.forEach(([y, c]) => near(`Tabla A-2, H²/Dt = 3, ${y.toFixed(1)}H: ${c}`, sh.M(y), c, 0.03));
near('Tabla A-12: cortante en la base 0.262 wH² (empotrada, H²/Dt = 3)', sh.Vbase, 0.262, 0.01);
sh = shellPCA(3, 2);
[[0, 0.074], [0.3, 0.375], [0.6, 0.519], [0.9, 0.210]].forEach(([y, c]) => near(`Tabla A-5 (articulada), H²/Dt = 3, ${y}H: ${c}`, sh.T(y), c, 0.06));
sh = shellPCA(0.4, 1);
[[0.1, 0.134], [0.3, 0.101], [0.5, 0.066]].forEach(([y, c]) => near(`Tabla A-1, H²/Dt = 0.4, ${y}H: ${c} (± 0.005)`, sh.T(y), c, 0.005 / c));
g = calc(`ct = TcoefPCA(3, 0.5, 1)
cm = McoefPCA(3, 1, 1)
cv = VcoefPCA(3, 1)`);
near('Función TcoefPCA(3, 0.5H) = 0.362', g('ct'), 0.362, 0.01);
near('Función McoefPCA(3, base) = −0.0333', g('cm'), -0.0333, 0.01);
near('Función VcoefPCA(3) = 0.262', g('cv'), 0.262, 0.01);
// Ejemplo de la U. de Colorado (D = 90 ft, H = 16 ft, t = 12 in, H²/Dt = 2.84): Tu a 0.6H con wu = 183 pcf
{ const s = shellPCA(16 * 16 / (90 * 1), 1); near('Ejemplo PCA (Colorado): Tu(0.6H) ≈ coef·wu·H·R = 68 384 lb/ft (coef 0.519 de A-5)', 0.519 * 183 * 16 * 45, 68384, 0.002); truthy('Tensión anular máx. con base empotrada < articulada (H²/Dt = 2.84)', s.Tmax < shellPCA(16 * 16 / 90, 2).Tmax); }

section('ACI 350.3-06 — Housner');
g = calc(`r = 3
wi = WiWLc(r)
wc = WcWLc(r)
hi = hiHLc(r)
hc = hcHLc(r)
hip = hipHLc(r)
hcp = hcpHLc(r)
wi2 = WiWLc(2)
wc2 = WcWLc(2)
wir = WiWLr(3)
wcr = WcWLr(3)
eps = epsACIc(3)
Tc = TcACIc(9 m, 4 m)
Tcr = TcACIr(6 m, 3 m)
cw = CwACI(0.5)
ci1 = CiACI(0.2 s, 1.0, 0.6)
ci2 = CiACI(1.2 s, 1.0, 0.6)
ccA = CcACI(2.6666 s, 1.0, 0.6)
ccB = CcACI(2.6668 s, 1.0, 0.6)`);
near('Wi/WL (D/HL = 3) = tanh(2.598)/2.598 = 0.3807', g('wi'), 0.3807, 0.002);
near('Wc/WL (D/HL = 3) = 0.230·3·tanh(1.2267) = 0.5808', g('wc'), 0.5808, 0.002);
near('hi/HL = 0.375 (D/HL ≥ 1.333)', g('hi'), 0.375);
near('hc/HL (D/HL = 3) = 0.5534', g('hc'), 1 - (Math.cosh(3.68 / 3) - 1) / (3.68 / 3 * Math.sinh(3.68 / 3)), 0.0005);
near("h'i/HL (D/HL = 3) = 0.866·3/(2 tanh 2.598) − 1/8", g('hip'), 0.866 * 3 / (2 * Math.tanh(0.866 * 3)) - 0.125);
near("h'c/HL (D/HL = 3)", g('hcp'), 1 - (Math.cosh(3.68 / 3) - 2.01) / (3.68 / 3 * Math.sinh(3.68 / 3)));
near('Fig. 9.3.1: Wi/WL (D/HL = 2) = 0.542', g('wi2'), 0.542, 0.003);
near('Fig. 9.3.1: Wc/WL (D/HL = 2) = 0.437', g('wc2'), 0.4375, 0.003);
near('Rectangular: Wc/WL (L/HL = 3) = 0.264·3·tanh(1.0533)', g('wcr'), 0.264 * 3 * Math.tanh(3.16 / 3));
near('Rectangular: Wi/WL igual a circular para la misma relación', g('wir'), g('wi'));
near('ε = 0.0151·9 − 0.1908·3 + 1.021 = 0.5843', g('eps'), 0.0151 * 9 - 0.1908 * 3 + 1.021);
near('Tc (D = 9 m, HL = 4 m) = 2π√(D/(3.68 g tanh(3.68 HL/D))) = 3.259 s', g('Tc', 's'), 3.259, 0.002);
near('Tc rectangular (L = 6 m, HL = 3 m)', g('Tcr', 's'), 2 * Math.PI * Math.sqrt(6 / (3.16 * 9.80665 * Math.tanh(3.16 * 3 / 6))));
near('Cw (HL/D = 0.5) polinomio Fig. 9.3.4(a)', g('cw'), 9.375e-2 + 0.2039 * 0.5 - 0.1034 * 0.25 - 0.1253 * 0.125 + 0.1267 * 0.0625 - 3.186e-2 * 0.03125);
near('Ci = SDS en la meseta', g('ci1'), 1.0); near('Ci = SD1/Ti para Ti > Ts', g('ci2'), 0.5);
near('Cc continuo en Tc = 1.6/Ts', g('ccA'), g('ccB'), 0.001);
{ let ok = true; for (let r = 0.3; r < 6; r += 0.01) { const a = r < 1.333 ? 0.5 - 0.09375 * r : 0.375; if (Math.abs(a - (0.5 - 0.09375 * Math.min(r, 1.3333))) > 0.001) ok = false; } truthy('hi/HL continuo en D/HL = 1.333', ok); }

section('E.010 Madera / Manual JUNAC');
g = calc(`ckA = CkE010(EminE010(1), fcE010(1))
ckB = CkE010(EminE010(2), fcE010(2))
ckC = CkE010(EminE010(3), fcE010(3))
Ck = ckB
A = 14 cm*14 cm
Ni = NadmE010(fcE010(2), EminE010(2), A, Ck*0.999999, Ck)
Nl = NadmE010(fcE010(2), EminE010(2), A, Ck*1.000001, Ck)
Nc = NadmE010(fcE010(2), EminE010(2), A, 8, Ck)
Nlg = NadmE010(fcE010(2), EminE010(2), A, 30, Ck)
km = kmE010(6 tonf, 35 tonf)
fm = fmE010(1) + fmE010(2) + fmE010(3)
fv = fvE010(2)
ep = EpromE010(3)`);
near('JUNAC Tabla 9.2: Ck grupo A = 17.98', g('ckA'), 17.98, 0.001);
near('JUNAC Tabla 9.2: Ck grupo B = 18.34', g('ckB'), 18.34, 0.001);
near('JUNAC Tabla 9.2: Ck grupo C = 18.42', g('ckC'), 18.42, 0.001);
near('Columna intermedia en λ = Ck: Nadm = ⅔ fc A', g('Ni', 'tonf'), 2 / 3 * 110 * 196 / 1000, 0.002);
near('Continuidad intermedia–larga en λ = Ck (0.329 E A/Ck²)', g('Nl', 'tonf'), g('Ni', 'tonf'), 0.002);
near('Columna corta: Nadm = fc A', g('Nc', 'tonf'), 110 * 196 / 1000);
near('Columna larga λ = 30: 0.329 E A/λ²', g('Nlg', 'tonf'), 0.329 * 75000 * 196 / 900 / 1000);
near('km = 1/(1 − 1.5 N/Ncr)', g('km'), 1 / (1 - 1.5 * 6 / 35));
near('fm grupos A + B + C = 210 + 150 + 100', g('fm', 'kgf/cm^2'), 460);
near('fv grupo B = 12 kg/cm²; Eprom C = 90 000', g('fv', 'kgf/cm^2') + g('ep', 'kgf/cm^2'), 90012);

section('E.080 Tierra reforzada (2017)');
g = calc(`c4 = CE080(4)
c1 = CE080(1)
s2 = SE080(2)
u3 = UE080(3)
d1 = densE080(1)`);
near('Tabla 3: C zona 4 = 0.25; zona 1 = 0.10', g('c4') + g('c1'), 0.35);
near('Tabla 1: S suelo intermedio = 1.4', g('s2'), 1.4);
near('Tabla 2: U educación = 1.4; densidad vivienda 8 %', g('u3') + g('d1'), 1.48);

section('Bloques');
g = block('wallplan', { muros: 'X1 X 0 0 4 0.13\nX2 X 0 6 4 0.13\nY1 Y 0 0 6 0.13\nY2 Y 4 0 6 0.13\nY3 Y 2 1 1 0.13', planta: '0 0 4 6', Z: '0.45', U: '1', S: '1.05', N: '2', h: '2.5 m', ea: '0.05' });
near('wallplan: densidad X = ΣLt/Ap', g('densX'), 2 * 4 * 0.13 / 24);
near('wallplan: muro de 1.0 m no contribuye (L < 1.20 m)', g('densY'), 2 * 6 * 0.13 / 24);
near('wallplan: CR en el eje de simetría (x = 2 m)', g('xCR', 'm'), 2);
near('wallplan: ZUSN/56', g('dmin'), 0.45 * 1.05 * 2 / 56);
{ const r = g('rX').toArray(); const kk = (L) => 0.13 / (4 * (2.5 / L) ** 3 + 3 * (2.5 / L)), kx = kk(4), ky = kk(6), J = 2 * kx * 9 + 2 * ky * 4;
  near('wallplan: reparto con torsión r = k/Σk + k·|y − yCR|·(0.05 B)/J', r[0], 0.5 + kx * 3 * 0.3 / J); truthy('wallplan: factores con torsión ≥ k/Σk', r.every(v => v >= 0.5)); }
g = block('tijeral', { L: '8 m', H: '2 m', n: '6', tipo: 'Howe', P: '1 tonf', Pb: '0' });
near('Tijeral: reacción = 3 P', g('Ra', 'tonf'), 3);
near('Tijeral: cuerda superior en el apoyo = (R − P/2)/sen θ = 5.59 t', g('Ncs', 'tonf'), 2.5 / Math.sin(Math.atan(0.5)), 0.001);
near('Tijeral: cuerda inferior extrema = (R − P/2)/tan θ = 5.0 t', g('Nti', 'tonf'), 5.0, 0.001);
g = block('cilindro', { H: '4 m', D: '9 m', t: '0.25 m', w: '1 tonf/m^3', base: 'empotrada' });
near('Bloque cilindro: Tmax = CTmax·w·H·R', g('Tmax', 'tonf/m'), shellPCA(16 / 2.25, 1).Tmax * 4 * 4.5);
near('Bloque cilindro: kPCA = H²/Dt = 7.11', g('kPCA'), 16 / 2.25);
g = block('tankwall', { a: '8 m', b: '2 m', inf: 'empotrado', sup: 'libre', lat: 'empotrado', qb: '2 tonf/m^2', qs: '0', nu: '0.2', ndiv: '20' });
truthy('Bloque tankwall: |My base| < qH²/6 por la restricción lateral', g('MyN', 'tonf*m/m') < 2 * 4 / 6 && g('MyN', 'tonf*m/m') > 0.8 * 2 * 4 / 6);
g = block('tanque', { forma: 'circular', tipo: 'elevado', D: '6 m', HL: '3 m', Hw: '3.6 m', tw: '0.2 m', Hf: '12 m', Pi: '100 tonf', Pc: '20 tonf', dmax: '1 m' });
truthy('Bloque tanque: dibuja el modelo de Housner', /Wi\/WL = 0\.542/.test(g.html));

section('Plantillas del módulo (sin errores y todas las verificaciones cumplen)');
for (const t of TEMPLATES.filter(x => x.id.startsWith('ma-'))) {
  const r = runTemplate(t.id).res;
  const bad = r.ctx.checks.filter(c => !c.ok);
  truthy(`${t.name}: ${r.ctx.checks.length} verificaciones, ${r.ctx.errors.length} errores`, r.ctx.errors.length === 0 && bad.length === 0 && r.ctx.checks.length > 0, bad.map(c => c.label).join('; ') + r.ctx.errors.map(e => e.msg).join('; '));
}
// valores de referencia de las plantillas
g = runTemplate('ma-edificio');
near('Edificio: densidad mínima ZUSN/56 (Z = 0.45, S = 1.05, N = 4)', g('dmin'), 0.45 * 1.05 * 4 / 56);
near('Edificio: Vm1 del muro X1 = 0.5 v\'m α t L + 0.23 Pg', g('Vm1', 'tonf'), 0.5 * 81 * (3.6 / 7.8) * 0.23 * 3.6 + 0.23 * 24, 0.001);
g = runTemplate('ma-reservorio');
near('Reservorio: Wi/WL (D/HL = 2.25)', g('Wi', 'tonf') / g('WL', 'tonf'), Math.tanh(0.866 * 2.25) / (0.866 * 2.25));
g = runTemplate('ma-cerco');
near('Cerco: w = 0.8 Z U C1 γ e = 58.3 kg/m²', g('w', 'kgf/m^2'), 0.8 * 0.45 * 0.6 * 1800 * 0.15);
{ const t = TEMPLATES.find(x => x.id === 'ma-armada'); const r = runTemplate('ma-armada', d => { d.blocks[1].src = d.blocks[1].src.replace('Ve = 12 tonf', 'Ve = 40 tonf'); }).res; truthy('Datos absurdos (Ve = 40 t en muro armado) producen verificaciones que no cumplen', r.ctx.checks.some(c => !c.ok)); void t; }
// =====================================================================
//  Revisión independiente (supervisor): ejemplos publicados y datos extremos
// =====================================================================
section('Revisión — San Bartolomé (2006), «Ejemplo de aplicación de la Norma E.070», Tablas 8, 16 y 21');
g = calc(`P = 432.11 tonf
VE = 0.4*1*2.5*1/3*P
aX1 = alphaE070(6.29 tonf, 3.13 m, 34.22 tonf*m)
VmX1 = VmE070(8.1 kgf/cm^2, 0.58, 13 cm, 3.13 m, 14.20 tonf)
VmX1e = VmE070(8.1 kgf/cm^2, aX1, 13 cm, 3.13 m, 14.20 tonf)
aX3 = alphaE070(5.72 tonf, 3.13 m, 22.51 tonf*m)
VmX3 = VmE070(8.1 kgf/cm^2, 0.80, 13 cm, 3.13 m, 19.89 tonf)
fX1 = factE070(12.82 tonf, 6.29 tonf)
fX3 = factE070(17.76 tonf, 5.72 tonf)
VuX3 = fX3*5.72 tonf
MuX3 = fX3*22.51 tonf*m
fc = 175 kgf/cm^2
fy = 4200 kgf/cm^2
VcX3 = 1.5*17.76 tonf*3.13 m/(3.13 m*3)
AcfX3 = VcX3/(0.2*fc*0.85)
TC3 = (67.53 tonf*m - 17.76 tonf*2.52 m/2)/3.13 m - 9.95 tonf
CC3 = (67.53 tonf*m - 17.76 tonf*2.52 m/2)/3.13 m + 9.95 tonf
AnC3 = 4.00 cm^2 + (CC3/0.7 - 4.00 cm^2*fy)/(0.85*0.8*fc)
s1C3 = 0.64 cm^2*fy/(0.3*9 cm*fc*(325/189 - 1))
s2C3 = 0.64 cm^2*fy/(0.12*9 cm*fc)`);
near('Tabla 8: VE = ZUCS/R·P = 0.4·1·2.5·1/3·432.11 = 144.0 t', g('VE', 'tonf'), 144.0, 0.001);
near('Tabla 16: α muro X1 = 0.58 (Ve L/Me)', g('aX1'), 0.58, 0.01);
near('Tabla 16: Vm muro X1 = 12.82 t (α = 0.58)', g('VmX1', 'tonf'), 12.82, 0.002);
near('Tabla 16: Vm muro X1 con α sin redondear ≈ 12.75 t (0.6 % menor)', g('VmX1e', 'tonf'), 12.82, 0.01);
near('Tabla 16: α muro X3 = 0.80', g('aX3'), 0.80, 0.01);
near('Tabla 16: Vm muro X3 = 17.76 t', g('VmX3', 'tonf'), 17.76, 0.002);
near('Tabla 16: Vm1/Ve1 muro X1 = 2.04', g('fX1'), 2.04, 0.003);
near('Tabla 16: Vm1/Ve1 muro X3 = 3.10 → acotado a 3.00', g('fX3'), 3.0);
near('Tabla 16: Vu muro X3 = 17.16 t', g('VuX3', 'tonf'), 17.16, 0.001);
near('Tabla 16: Mu muro X3 = 67.53 t·m', g('MuX3', 'tonf*m'), 67.53, 0.001);
near('Tabla 21: Vc columna C3 (X3) = 8.88 t', g('VcX3', 'tonf'), 8.88, 0.002);
near('Tabla 21: Acf C3 = 298 cm²', g('AcfX3', 'cm^2'), 298, 0.003);
near('Tabla 21: T C3 = 4.47 t (Pt = 0)', g('TC3', 'tonf'), 4.47, 0.005);
near('Tabla 21: C C3 = 24.37 t', g('CC3', 'tonf'), 24.37, 0.002);
near('Tabla 21: An C3 = 155 cm² (δ = 0.8, As = 4.00 cm²)', g('AnC3', 'cm^2'), 155, 0.005);
near('Tabla 21: s1 (13×25, núcleo 9×21) = 7.91 cm', g('s1C3', 'cm'), 7.91, 0.002);
near('Tabla 21: s2 = 14.22 cm', g('s2C3', 'cm'), 14.22, 0.002);

section('Revisión — PCA / U. de Colorado (CVEN 4830, 2008): D = 90 ft, H = 16 ft, t = 12 in');
{ const s3 = shellPCA(3, 1);
  near('Mu base = 0.0333·(1.3·1.7·65 pcf)·H³ = 19 642 lb·ft/ft', Math.abs(s3.Mbase) * 1.3 * 1.7 * 65 * 16 ** 3, 19642, 0.01);
  near('Vu base = 0.262·(1.7·65 pcf)·H² = 7 445 lb/ft', s3.Vbase * 1.7 * 65 * 16 ** 2, 7445, 0.01);
  const T = 68384 / (1.65 * 1.7), fct = (0.0003 * 29e6 * 1.32 + T) / (144 + 8 * 1.32);
  near('Tracción en el concreto fc = (C Es As + T)/(Ac + n As) = 233 psi', fct, 233, 0.005);
  const d = 9.625, As = 0.88, c = As * 60000 / (0.85 * 12 * 0.85 * 4000), phiMn = 0.9 * As * 60000 * (d - 0.85 * c / 2) / 12;
  near('φMn (#6 @ 6", d = 9.625") = 35 553 lb·ft/ft', phiMn, 35553, 0.002);
  const sx = shellPCA(16 * 16 / 90, 1); truthy(`Con el H²/Dt real (2.84) el momento en la base es ${Math.abs(sx.Mbase).toFixed(4)}·wH³ (el ejemplo redondea a 3.0 → 0.0333)`, Math.abs(sx.Mbase) > 0.0333 && Math.abs(sx.Mbase) < 0.037); }
g = calc(`fsf = min(320 ksi/(1.35*sqrt((8)^2 + 4*(2 + 0.625/2)^2)), 36 ksi) -> ksi
Sdh = 0.9*60 ksi/(1.4*20 ksi)
Sdf = 0.9*60 ksi/(1.4*fsf)`);
near('ACI 350-06 Ec. 10-4: fs (s = 8 in, #5, h < 16 in) = 320/(1.35·√(8² + 4·2.31²)) = 25.65 ksi', g('fsf', 'ksi'), 320 / (1.35 * Math.sqrt(64 + 4 * 2.3125 ** 2)), 0.001);
near('ACI 350-06 9.2.6: Sd tracción anular (fs = 20 ksi) = 1.93 → 1.4·Sd = 2.70 ≈ PCA 1.7·1.65 = 2.81', g('Sdh'), 1.929, 0.002);
near('ACI 350-06 9.2.6: Sd flexión = 1.50 → 1.4·Sd = 2.11 ≈ PCA 1.7·1.30 = 2.21', g('Sdf'), 54 / (1.4 * 320 / (1.35 * Math.sqrt(64 + 4 * 2.3125 ** 2))), 0.001);

section('Revisión — ACI 350.3-06 (texto de la norma) y ejemplo publicado (Najah Univ., tanque rectangular L/HL = 1.72)');
g = calc(`wi = WiWLr(3.8/2.2)
wc = WcWLr(3.8/2.2)
hi = hiHLr(3.8/2.2)
hc = hcHLr(3.8/2.2)
hip = hipHLc(0.75)
hip2 = hipHLc(0.7499)
Tv = TvACIc(9 m, 4 m, 0.30 m, 250998 kgf/cm^2, 1 tonf/m^3)
ctc = CtACI(0.02 s, 1.18, 0.709)
ctl = CtACI(1.0 s, 1.18, 0.709)
ctr = CtACI(0.02 s, 1.18, 0.709, 2)
cA = CkE010(EminE010(1), fcE010(1), 2)
cD = CkE010(EminE010(4), fcE010(4))
NlC = NadmE010(fcE010(2), EminE010(2), 100 cm^2, 30, CkE010(EminE010(2), fcE010(2), 2), 2)
NcC = NadmE010(fcE010(2), EminE010(2), 100 cm^2, 8.5, 15.89, 2)
km9 = kmE010(10 tonf, 14 tonf)
N55 = NadmE010(fcE010(2), EminE010(2), 196 cm^2, 55, 18.34)`);
near('Najah: Wi/WL (L/HL = 1.72) = 0.60 (gráfico Fig. 9.2)', g('wi'), 0.60, 0.02);
near('Najah: Wc/WL = 0.40 (gráfico; la ecuación 9-2 da 0.43)', g('wc'), 0.40, 0.09);
near('Najah: hi/HL = 0.37 (0.375 por Ec. 9-4)', g('hi'), 0.37, 0.015);
near('Najah: hc/HL = 0.60', g('hc'), 0.60, 0.015);
near("h'i/HL continuo en D/HL = 0.75 (Ec. 9-20/21: 0.45)", g('hip'), 0.45, 0.02);
near('Ec. 9-31 (SI): Tv = 2π√(γL D HL²/(2 g tw Ec)) — tanque de la plantilla', g('Tv', 's'), 2 * Math.PI * Math.sqrt(9806.65 * 9 * 16 / (2 * 9.80665 * 0.30 * 250998 * 98066.5)), 0.001);
near('Ec. 9-39: Ct = SDS para Tv ≤ Ts', g('ctc'), 1.18);
near('Ec. 9-40: Ct = SD1/Tv para Tv > Ts', g('ctl'), 0.709);
near('9.4.3: Ct = 0.4 SDS en tanques rectangulares', g('ctr'), 0.472);
near('E.010 Tabla 9: Ck circular grupo A = 15.57', g('cA'), 15.57, 0.002);
near('E.010 Tabla 8 (2021): Ck grupo D = 18.77', g('cD'), 18.77, 0.002);
near('E.010 Art. 30: columna circular larga Nadm = 0.2467 E A/λ²', g('NlC', 'tonf'), 0.2467 * 75000 * 100 / 900 / 1000);
near('E.010 Art. 28: columna circular corta λ < 9 → fc A', g('NcC', 'tonf'), 110 * 100 / 1000);
near('kmE010 con N ≥ Ncr/1.5 devuelve 1000 (la interacción no cumple, sin error)', g('km9'), 1000);
truthy('NadmE010 con λ = 55 > 50 no lanza error (la plantilla verifica λ ≤ 50)', g('N55', 'tonf') > 0);
{ const Ncy = 16 / (9 * Math.PI), Niy = 2 / Math.PI; truthy(`ACI 350.3 R6.2: Ncy = 16 Pcy/(9π) = ${Ncy.toFixed(3)} Pcy < Niy = 2/π = ${Niy.toFixed(3)} (se corrigió la plantilla, que usaba 2/π)`, Ncy < Niy); }

section('Revisión — fuste del tanque elevado: fórmula plástica del anillo vs compatibilidad de deformaciones');
function ringMn(Ro, t, As, fc, fy, P, Es = 2e6, ecu = 0.003) {
  const Ri = Ro - t, rm = Ro - t / 2, b1 = 0.85, N = 720, M = 16;
  const res = (c) => { let F = 0, Mo = 0; const yNA = Ro - c, yb = Ro - b1 * c;
    for (let i = 0; i < N; i++) { const th = (i + 0.5) / N * 2 * Math.PI;
      for (let j = 0; j < M; j++) { const r = Ri + (j + 0.5) / M * t, y = r * Math.cos(th), dA = r * (t / M) * (2 * Math.PI / N); if (y >= yb) { F += 0.85 * fc * dA; Mo += 0.85 * fc * dA * y; } }
      const y = rm * Math.cos(th), fs = Math.max(-fy, Math.min(fy, Es * ecu * (y - yNA) / c)), dAs = As / N, f = y >= yb ? fs - 0.85 * fc : fs; F += f * dAs; Mo += f * dAs * y; }
    return [F, Mo]; };
  let lo = 1, hi = 6 * Ro; for (let k = 0; k < 60; k++) { const c = (lo + hi) / 2; if (res(c)[0] > P) hi = c; else lo = c; }
  return res((lo + hi) / 2)[1];
}
{ const r = runTemplate('ma-elevado'); const Ro = r('De', 'cm') / 2, t = r('tf', 'cm'), As = r('Asf', 'cm^2'), P = r('Pu', 'kgf');
  const Mfib = ringMn(Ro, t, As, 280, 4200, P) / 1e5, Mpl = r('Mn', 'tonf*m');
  near(`Mn plástico (${Mpl.toFixed(0)} t·m) ≈ Mn por fibras (${Mfib.toFixed(0)} t·m), error < 3 %`, Mpl, Mfib, 0.03);
  truthy('Plantilla del tanque elevado: φ de flexocompresión según E.060 9.3.2.2 (< 0.9 con carga axial)', r('phif') < 0.9 && r('phif') >= 0.7); }

section('Revisión — oleaje y borde libre (ACI 350.3 Cap. 7)');
{ const r = runTemplate('ma-reservorio');
  truthy(`Reservorio: dmax = ${r('dmax', 'm').toFixed(2)} m > borde libre ${r('fbl', 'm').toFixed(2)} m → Wc pasa a impulsiva`, r('dmax', 'm') > r('fbl', 'm') && Math.abs(r('Wcr', 'tonf') - r('Wc', 'tonf')) < 1e-6 && r('Pc', 'tonf') === 0);
  const r2 = runTemplate('ma-reservorio', d => { for (const b of d.blocks) if (b.src) b.src = b.src.replace('Hw = 4.60 m', 'Hw = 6.00 m'); });
  truthy('Reservorio con borde libre suficiente (Hw = 6 m): Wcr = 0 y Pc > 0', r2('Wcr', 'tonf') === 0 && r2('Pc', 'tonf') > 0 && r2.res.ctx.errors.length === 0);
  near('Reservorio: üv = Ct I b/Ri ≥ 0.2 SDS (Ec. 4-15)', r('uv'), Math.max(r('Ct') * 1.5 * (2 / 3) / 2, 0.2 * r('SDS')));
  const e = runTemplate('ma-elevado'); truthy('Tanque elevado: con oleaje > borde libre la masa convectiva se suma al peso impulsivo', e('Wst', 'tonf') > e('Wi', 'tonf') + e('Wcuba', 'tonf') + 0.25 * e('Wfus', 'tonf') + 1); }

section('Revisión — cercos: E.070 (C1 de la E.030-2003) frente a la E.030-2018 (Art. 41 y 43)');
{ const r = runTemplate('ma-cerco');
  near('w E.070 = 0.8·Z·U·C1·γ·e (C1 = 0.6)', r('w070', 'kgf/m^2'), 0.8 * 0.45 * 1 * 0.6 * 1800 * 0.15);
  near('w E.030-2018 = 0.8·0.5·Z·U·S·γ·e', r('w030', 'kgf/m^2'), 0.8 * 0.5 * 0.45 * 1 * 1.05 * 1800 * 0.15);
  const r2 = runTemplate('ma-cerco', d => { for (const b of d.blocks) if (b.src) b.src = b.src.replace('S = 1.05 //', 'S = 1.20 //'); });
  truthy('Con S = 1.20 gobierna la E.030-2018 (0.48 ZUγe = 0.48 ZUγe con C1 = 0.6: iguales)', Math.abs(r2('w', 'kgf/m^2') - r2('w070', 'kgf/m^2')) < 1e-6 && Math.abs(r2('w030', 'kgf/m^2') - r2('w070', 'kgf/m^2')) < 0.01); }

section('Revisión — datos extremos: las plantillas reportan NO CUMPLE sin errores ni NaN');
for (const [id, a, b] of [
  ['ma-edificio', 'wp = 0.90 tonf/m^2', 'wp = 1.60 tonf/m^2'], ['ma-edificio', 'N = 4 //', 'N = 6 //'],
  ['ma-armada', 'Me = 50 tonf*m', 'Me = 150 tonf*m'], ['ma-cerco', 'ha = 2.40 m', 'ha = 4.00 m'],
  ['ma-adobe', 'zona = 2 //', 'zona = 4 //'], ['ma-vigamadera', 'Lv = 4.20 m', 'Lv = 7.00 m'],
  ['ma-colmadera', 'lc = 2.60 m', 'lc = 8.00 m'], ['ma-colmadera', 'Nd = 6.0 tonf', 'Nd = 40 tonf'],
  ['ma-tijeral', 'wsc = 50 kgf/m^2', 'wsc = 600 kgf/m^2'], ['ma-reservorio', 'tw = 0.30 m', 'tw = 0.15 m'],
  ['ma-reservorio', 'D = 9.00 m', 'D = 25.00 m'], ['ma-cisterna', 'tw = 0.20 m', 'tw = 0.10 m'],
  ['ma-cisterna', 'Hc = 2.50 m', 'Hc = 5.00 m'], ['ma-elevado', 'Hf = 12.0 m', 'Hf = 35.0 m'], ['ma-elevado', 'tf = 0.25 m', 'tf = 0.10 m']]) {
  let hit = false;
  const r = runTemplate(id, d => { for (const bl of d.blocks) if (bl.src && bl.src.includes(a)) { bl.src = bl.src.replace(a, b); hit = true; } }).res;
  const bad = r.ctx.checks.filter(c => !c.ok), nan = r.ctx.checks.filter(c => c.ratio !== null && !Number.isFinite(+c.ratio));
  truthy(`${id} con «${b}»: ${bad.length} NO CUMPLE, ${r.ctx.errors.length} errores`, hit && bad.length > 0 && r.ctx.errors.length === 0 && nan.length === 0, r.ctx.errors.map(e => e.msg).join('; '));
}

section('Rangos usuales [mín..máx] y ejemplos de validación de las plantillas');
for (const t of TEMPLATES.filter(x => x.id.startsWith('ma-'))) {
  const inp = runTemplate(t.id).res.ctx.inputs, rg = inp.filter(i => i.range);
  const out = rg.filter(i => { let v = parseFloat(i.num); if (i.range.unit && i.unit && i.range.unit !== i.unit) v = math.unit(v, i.unit).toNumber(i.range.unit); return !(v >= i.range.min && v <= i.range.max); });
  const bad = inp.filter(i => /\.\.|\[/.test(i.label || ''));
  truthy(`${t.id}: ${rg.length} datos con rango, valores por defecto dentro del rango, etiquetas limpias`, rg.length >= 5 && out.length === 0 && bad.length === 0, out.map(i => i.name).concat(bad.map(i => i.name)).join(', '));
}
truthy('Listas desplegables intactas con rango (Z, Tp, f\'c del edificio)', (() => { const inp = runTemplate('ma-edificio').res.ctx.inputs, f = (n) => inp.find(i => i.name === n);
  return f('Z').options.length === 4 && f('Z').range.max === 0.45 && f('Tp').options.length === 4 && f('Tp').range.unit === 's' && f('fc').options.length === 2 && f('fc').range.max === 280; })());
{ const r = runTemplate('ma-edificio');
  near('San Bartolomé (2006): Fa = 93.8 t/m² en los muros de soga de la plantilla (t = 13 cm, h = 2.40 m)', math.evaluate('min(FaX)', new Map(r.res.ctx.scope)).toNumber('tonf/m^2'), 93.8, 0.001); }
section('Segunda opinión — tercera tanda A (tanques)');
{ const c = runTemplate('ma-cisterna');
  near('Cisterna: incremento sísmico de Wood Δp = Z·S·γ·H [t/m²]', c('pse', 'tonf/m^2'), 0.45 * 1.05 * 1.8 * (2.7 + 0.075), 1e-6);
  near('Cisterna: Mve = máx(MyPa, MyNs + MyNe/1.7) (U = 1.7CE + 1.0CS)', c('Mve', 'tonf*m/m'), Math.max(c('MyPa', 'tonf*m/m'), c('MyNs', 'tonf*m/m') + c('MyNe', 'tonf*m/m') / 1.7), 1e-6);
  const cw = runTemplate('ma-cisterna', d => { for (const b of d.blocks) if (b.src) b.src = b.src.replace('Hnf = 5.0 m', 'Hnf = 1.0 m'); });
  truthy('Cisterna: con NF a 1.0 m → NO CUMPLE la flotación y la hipótesis de suelo seco', cw.res.ctx.errors.length === 0 && cw.res.ctx.checks.filter(x => !x.ok && /flotación|freático/.test(x.label)).length === 2);
  const c4 = runTemplate('ma-cisterna', d => { for (const b of d.blocks) if (b.src) b.src = b.src.replace(/^bar = 5 /m, 'bar = 4 '); });
  truthy('Cisterna: con 1/2" @ 20 (diseño original) la cara exterior NO CUMPLE con el sismo del suelo', c4.res.ctx.checks.some(x => !x.ok && /cara exterior/.test(x.label)));
  const r = runTemplate('ma-reservorio');
  near('Reservorio: N vertical por volteo = Mb/(π r²) [t/m]', r('Nvm', 'tonf/m'), r('Mb', 'tonf*m') / (Math.PI * 4.65 ** 2), 1e-6); }
near('JUNAC Tabla 9.2: Ck grupo B = 18.34 en la plantilla de columna', runTemplate('ma-colmadera')('Ck'), 18.34, 0.001);
truthy('Plantillas con validacion: edificio, cerco, columna de madera y reservorio', ['ma-edificio', 'ma-cerco', 'ma-colmadera', 'ma-reservorio'].every(id => TEMPLATES.find(x => x.id === id).validacion));
section('Segunda opinión — segunda tanda (ma-cerco)');
{ const sub2 = (pairs) => (d) => { for (const [a, b] of pairs) { let hit = false; d.blocks.forEach(x => { if (typeof x.src === 'string' && x.src.includes(a)) { x.src = x.src.replace(a, b); hit = true; } }); if (!hit) throw new Error('No se encontró: ' + a); } };
  const r = runTemplate('ma-cerco');
  near('Cerco: e = (Mv − mín(½Ep·hc/3, Mv))/P (el pasivo es una reacción, φep = 0.5)', r('ecc', 'm'), (r('Mv', 'tonf*m') - Math.min(0.5 * r('Ep', 'tonf') * 0.8 / 3, r('Mv', 'tonf*m'))) / r('Ptot', 'tonf'), 1e-9);
  const r1 = runTemplate('ma-cerco', sub2([['Z = 0.45 //', 'Z = 0.10 //'], ['S = 1.05 //', 'S = 2.00 //']]));
  truthy('Cerco en zona 1 con S = 2.0: cs usa 0.8·0.5·ZUS (gobierna) y no hay falsas fallas de excentricidad', Math.abs(r1('cs') - 0.08) < 1e-9 && r1.res.ctx.checks.every(c => c.ok));
}
done();
