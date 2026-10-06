// Pruebas del módulo «bridges» (AASHTO LRFD / MTC 2018) — ver docs/referencias/bridges.md
import { near, truthy, calc, block, runTemplate, section, done } from './helpers.mjs';

section('Factores de distribución — FHWA, ejemplo de viga PSC (Design Step 5.1): S = 9.667 ft, L = 110 ft, ts = 8 in, Kg = 2 984 704 in⁴, esviaje 20°');
let v = calc(`S = 9.667 ft
L = 110 ft
ts = 8 in
Kg = 2984704 in^4
g1 = gMi1LRFD(S, L, ts, Kg)
g2 = gMi2LRFD(S, L, ts, Kg)
cs = skewVLRFD(20 deg, L, ts, Kg)
v1 = gVi1LRFD(S)*cs
v2 = gVi2LRFD(S)*cs
lev = leverLRFD(S, 1.83 ft, 2 ft)
eM = eMLRFD(1.83 ft)
sk = skewMLRFD(20 deg, S, L, ts, Kg)`);
near('Momento interior, 2+ carriles = 0.796', v('g2'), 0.796, 0.002);
near('Momento interior, 1 carril = 0.542', v('g1'), 0.542, 0.003);
near('Cortante interior 1 carril × corrección por esviaje = 0.782', v('v1'), 0.782, 0.003);
near('Cortante interior 2+ carriles × esviaje = 0.973', v('v2'), 0.973, 0.003);
near('Regla de la palanca (sin m) = 0.672 (ruedas a 6 ft ≈ 1.80 m)', v('lev'), 0.672, 0.01);
near('e = 0.77 + de/9.1 (de = 1.83 ft) = 0.971', v('eM'), 0.971, 0.002);
near('Sin reducción de momento por esviaje < 30°', v('sk'), 1);
v = calc('m1 = mpLRFD(1)\nm3 = mpLRFD(3)\nm4 = mpLRFD(5)\nNL = NLLRFD(7.20 m)\nNL2 = NLLRFD(44 ft)');
near('Presencia múltiple m(1) = 1.20', v('m1'), 1.2); near('m(3) = 0.85', v('m3'), 0.85); near('m(>3) = 0.65', v('m4'), 0.65);
near('Carriles INT(7.20/3.60) = 2', v('NL'), 2); near('Carriles INT(44 ft/12 ft) = 3', v('NL2'), 3);

section('Anchos de franja (Tabla 4.6.2.1.3-1 y 4.6.2.3)');
v = calc('Ep = EposLRFD(2100 mm)\nEn = EnegLRFD(2100 mm)\nEv = EvolLRFD(600 mm)\nE1 = E1slabLRFD(10 m, 8.4 m)\nEm = EmslabLRFD(10 m, 8.4 m, 2)');
near('E⁺ = 660 + 0.55·2100 = 1815 mm', v('Ep', 'mm'), 1815);
near('E⁻ = 1220 + 0.25·2100 = 1745 mm', v('En', 'mm'), 1745);
near('E voladizo = 1140 + 0.833·600 = 1639.8 mm', v('Ev', 'mm'), 1639.8);
near('Losa, un carril 250 + 0.42√(L1·W1)', v('E1', 'mm'), 250 + 0.42 * Math.sqrt(10000 * 8400));
near('Losa, 2 carriles min(2100 + 0.12√(L1·W1), W/NL)', v('Em', 'mm'), Math.min(2100 + 0.12 * Math.sqrt(10000 * 8400), 4200));

section('Envolvente HL-93 (bloque hl93env) contra soluciones cerradas');
let g = block('hl93env', { tramos: '20', apoyos: 'A A', IM: '0', g: '1', carril: '0' });
const ref = calc('Mt = MtruckHL93(20 m)\nMd = MtandemHL93(20 m)');
near('Viga simple L = 20 m: M camión = MtruckHL93 (motor)', g('Mtr', 'tonf*m'), ref('Mt', 'tonf*m'), 0.002);
near('Viga simple L = 20 m: V camión = 14.52 + 14.52·15.7/20 + 3.63·11.4/20', g('VLL', 'tonf'), 14.52 + 14.52 * 15.7 / 20 + 3.63 * 11.4 / 20, 1e-4);
g = block('hl93env', { tramos: '20', apoyos: 'A A', vehiculo: 'Ejes', ejes: '1e-6 0', IM: '0', carril: '0.952' });
near('Carril 0.952 t/m: wL²/8', g('MLLp', 'tonf*m'), 0.952 * 400 / 8, 1e-4);
g = block('hl93env', { tramos: '20, 20', apoyos: 'A A A', vehiculo: 'Ejes', ejes: '1e-6 0', IM: '0', carril: '1' });
near('Continua 2 × 20 m, carga uniforme en ambos tramos: M⁻ apoyo = −wL²/8', g('MLLn', 'tonf*m'), -50, 0.005);
near('Continua 2 × 20 m, carga en un tramo: M⁺ máx = 0.0957 wL²', g('MLLp', 'tonf*m'), 49 / 512 * 400, 0.01);
g = block('hl93env', { tramos: '20', apoyos: 'A A', vehiculo: 'Fatiga' });
const fat = calc('Mf = MfatLRFD(20 m)');
near('Camión de fatiga (ejes a 9.0 m) con IM 15 % = 1.15·MfatLRFD', g('MLLp', 'tonf*m'), 1.15 * fat('Mf', 'tonf*m'), 0.003);
g = block('hl93env', { tramos: '20', apoyos: 'A A', IM: '0.33', DC: 'U * 2', DW: 'U * 0.5', secciones: '10' });
near('DC en el centro: wL²/8 = 100 t·m', g('MDCx1', 'tonf*m'), 100, 1e-4);
near('Resistencia I en el centro: 1.25 DC + 1.5 DW + 1.75 LL', g('Mux1', 'tonf*m'), 1.25 * 100 + 1.5 * 25 + 1.75 * g('MLLx1', 'tonf*m'), 1e-6);
v = calc('Mx = MxLRFD(20 m, 10 m, 1)\nVx = VxLRFD(20 m, 0 m, 1)\nBR = BRLRFD(20 m, 2)');
near('MxLRFD camión en L/2: 14.52·5 + 14.52·(20−14.3)/2 + 3.63·(5.7)/2', v('Mx', 'tonf*m'), 14.52 * 5 + 14.52 * 5.7 / 2 + 3.63 * 5.7 / 2, 1e-4);
near('VxLRFD en el apoyo = cortante exacto', v('Vx', 'tonf'), 14.52 + 14.52 * 15.7 / 20 + 3.63 * 11.4 / 20, 1e-4);
near('Frenado BR (L = 20 m, 2 carriles) = 25 % camión × 2 × 1.0', v('BR', 'tonf'), 0.25 * 32.67 * 2);

section('Pérdidas de presfuerzo — método aproximado (5.9.3.3); ejemplo CONSPAN/Bentley: fpi = 202.5 ksi, Aps = 4.131 in², Ag = 843 in², H = 70 %, f′ci = 4.5 ksi');
v = calc(`gh = gammahLRFD(70)
gs = gammastLRFD(4.5 ksi)
LT = dfpLTLRFD(202.5 ksi, 4.131 in^2, 843 in^2, 70, 4.5 ksi, 2.5 ksi)
ES = dfpESLRFD(28500 ksi, 4066.84 ksi, 1.107 ksi)`);
near('γh = 1.7 − 0.01·70 = 1.00', v('gh'), 1.0);
near('γst = 5/(1 + 4.5) = 0.9091', v('gs'), 0.9091, 1e-3);
near('ΔfpLT = 9.02 (creep) + 10.91 (contracción) + 2.5 (relajación) ksi', v('LT', 'ksi'), 9.02 + 10.91 + 2.5, 0.002);
near('ΔfpES = (Ep/Eci)·fcgp = 7.76 ksi', v('ES', 'ksi'), 7.76, 0.002);
v = calc(`c = cpsLRFD(6.51 in^2, 270 ksi, 243 ksi, 58.5 in, 4 ksi, 96 in, 20 in, 8 in)
fps = fpsLRFD(270 ksi, 243 ksi, c, 58.5 in)
b1 = beta1LRFD(8 ksi)`);
const cExp = 6.51 * 270 / (0.85 * 4 * 0.85 * 96 + 0.28 * 6.51 * 270 / 58.5);
near('c = Aps·fpu/(0.85 f′c β1 b + k Aps fpu/dp) (rectangular)', v('c', 'in'), cExp, 1e-4);
near('fps = fpu(1 − k c/dp), k = 0.28', v('fps', 'ksi'), 270 * (1 - 0.28 * cExp / 58.5), 1e-4);
near('β1(8 ksi) = 0.65', v('b1'), 0.65);

section('Sismo AASHTO 3.10 (factores de sitio con interpolación), N (4.7.4.4) y apoyos');
v = calc(`Fp = FpgaLRFD(0.45, 4)
Fa = FaLRFD(1.05, 4)
Fv = FvLRFD(0.42, 4)
FvE = FvLRFD(0.05, 5)
C1 = CsmLRFD(0.0 s, 0.4, 1.0, 0.5)
C2 = CsmLRFD(0.3 s, 0.4, 1.0, 0.5)
C3 = CsmLRFD(1.0 s, 0.4, 1.0, 0.5)
z = zonaLRFD(0.31)
N = NapLRFD(30 m, 8 m, 0 deg)
Np = NpctLRFD(1, 0.04)
Sb = SbearLRFD(300 mm, 450 mm, 12 mm)
h1 = heqLRFD(4.5 m)
be = betaMCFT(0)
th = thetaMCFT(0.001)`);
near('Fpga(PGA = 0.45, D) = 1.05', v('Fp'), 1.05);
near('Fa(Ss = 1.05, D) = 1.08', v('Fa'), 1.08);
near('Fv(S1 = 0.42, D) = 1.58', v('Fv'), 1.58);
near('Fv(S1 ≤ 0.1, E) = 3.5', v('FvE'), 3.5);
near('Csm(T = 0) = As', v('C1'), 0.4); near('Csm meseta = SDS', v('C2'), 1.0); near('Csm(1 s) = SD1/T', v('C3'), 0.5);
near('Zona sísmica (SD1 = 0.31) = 3', v('z'), 3);
near('N = 200 + 0.0017·30000 + 0.0067·8000 = 304.6 mm', v('N', 'mm'), 304.6);
near('Zona 1 con As < 0.05: 75 % de N', v('Np'), 0.75);
near('Factor de forma S = 300·450/(2·12·750) = 7.5', v('Sb'), 7.5);
near('heq(H = 4.5 m) = 1.05 m (interpolado)', v('h1', 'm'), 1.05);
near('MCFT β(εs = 0) = 4.8', v('be'), 4.8); near('MCFT θ(εs = 0.001) = 32.5°', v('th', 'deg'), 32.5);

section('Plantillas del módulo: sin errores y con todas las verificaciones conformes');
for (const id of ['br-vigalosa', 'br-presforzada', 'br-acero', 'br-estribo', 'br-pilar', 'br-neopreno', 'br-sismo', 'br-alcantarilla', 'br-peatonal']) {
  const t = runTemplate(id); const r = t.res;
  truthy(id.padEnd(18) + ` ${r.ctx.checks.length} verificaciones, ${r.ctx.errors.length} errores`, r.ctx.errors.length === 0 && r.ctx.checks.length > 0 && r.ctx.checks.every(c => c.ok), r.ctx.errors.map(e => e.msg).join('; '));
}
{
  const t = runTemplate('br-presforzada');
  near('Viga Tipo IV: pérdida total ≈ 20 % de fpj (rango usual 18–25 %)', t('dfpT', 'ksi') / 202.5, 0.20, 0.05);
  near('Viga Tipo IV: ΔfpES forma cerrada = (Ep/Eci)·fcgp', t('dfpES', 'ksi'), t('dfpESc', 'ksi'), 1e-3);
  const a = runTemplate('br-acero');
  truthy('Viga de acero: PNA en la losa (caso 1) con Mp > My', a('caso') === 1 && a('Mp', 'kip*ft') > 0);
  // datos absurdos: luz enorme → la viga T no cumple
  const bad = runTemplate('br-vigalosa', d => { d.blocks[1].src = d.blocks[1].src.replace('L = 20.00 m', 'L = 35.00 m').replace('nb = 18', 'nb = 18'); d.blocks.forEach(b => { if (b.type === 'calc') b.src = b.src.replace('nb = 18 //', 'nb = 8 //'); }); });
  truthy('Viga T con datos insuficientes (L = 35 m, 8 barras) produce verificaciones que no cumplen', bad.res.ctx.checks.some(c => !c.ok));
}
done();
