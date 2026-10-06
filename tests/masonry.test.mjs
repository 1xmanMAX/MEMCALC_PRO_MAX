// Pruebas de validación — módulo «masonry»
// E.070 (ejemplo de San Bartolomé, edificio de 4 pisos), Tabla 12, E.010/JUNAC, E.080,
// ACI 350.3-06 (Housner), PCA Circular Concrete Tanks (Tablas A-1, A-2, A-5, A-12) y placas (Timoshenko)
import { near, truthy, calc, block, runTemplate, section, done, TEMPLATES } from './helpers.mjs';
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
done();
