// Pruebas del módulo «bridges» (AASHTO LRFD / MTC 2018) — ver docs/referencias/bridges.md
import { near, truthy, calc, block, runTemplate, section, done, TEMPLATES } from './helpers.mjs';
import { settings, valTex } from '../src/engine.js';

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
near('Momento interior, 2+ carriles = 0.796', v('g2'), 0.796, 0.001);
near('Momento interior, 1 carril = 0.542', v('g1'), 0.542, 0.001);
near('Cortante interior 1 carril × corrección por esviaje = 0.782', v('v1'), 0.782, 0.003);
near('Cortante interior 2+ carriles × esviaje = 0.973', v('v2'), 0.973, 0.003);
near('Regla de la palanca (sin m) = (9.497 + 3.497)/(2·9.667) = 0.672', v('lev'), 0.672, 0.001);
near('e = 0.77 + de/9.1 (de = 1.83 ft) = 0.971', v('eM'), 0.971, 0.001);
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
near('heq(H = 4.5 m) = 0.75 m (interpolado entre 0.9 y 0.6)', v('h1', 'm'), 0.75);
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

section('Revisión — envolvente HL-93 en viga continua contra Müller-Breslau (líneas de influencia cerradas) y tabla HS20 del Apéndice A (AASHTO Standard)');
{
  // Viga continua de dos tramos iguales (ejemplo FHWA de viga de acero: 2 × 140 ft). Línea de influencia exacta:
  // M_B(a) = −a(L² − a²)/(4L²) y M(x) = M0(x, a) + M_B·x/L; barrido fino de posiciones de los ejes (independiente del bloque).
  const ft = 0.3048, L = 140 * ft, kft = 1 / 0.45359237 / ft;
  const MB = (p) => { if (p < 0 || p > 2 * L) return 0; const a = p <= L ? p : 2 * L - p; return -a * (L * L - a * a) / (4 * L * L); };
  const M0 = (x, p) => (p < 0 || p > L ? 0 : p <= x ? p * (L - x) / L : x * (L - p) / L);
  const il = (x, p) => M0(x, p) + MB(p) * x / L;
  const truck = (s) => [[3.63, 0], [14.52, 4.3], [14.52, 4.3 + s]], tand = [[11.34, 0], [11.34, 1.2]];
  const best = (x, ax, sg) => { let b = 0; const sp = ax[ax.length - 1][1]; for (const fl of [0, 1]) for (let s = -sp; s <= 2 * L; s += 0.05) { let m = 0; for (const [P, xa] of ax) { const v = P * il(x, (fl ? sp - xa : xa) + s); if (v * sg > 0) m += v; } if (m * sg > b * sg) b = m; } return b; };
  const lane = (x, sg) => { let a = 0; const n = 4000; for (let i = 0; i < n; i++) { const v = il(x, (i + 0.5) * 2 * L / n); if (v * sg > 0) a += v * 2 * L / n; } return 0.952 * a; };
  const x4 = 0.4 * L; let tr = 0; for (const s of [4.3, 5, 6, 7, 8, 9]) tr = Math.max(tr, best(x4, truck(s), 1));
  const Mpos = Math.max(tr, best(x4, tand, 1)) * 1.33 + lane(x4, 1);
  let tn = 0; for (const s of [4.3, 5, 6, 7, 8, 9]) tn = Math.min(tn, best(L, truck(s), -1));
  let dt = 0; for (let G = 15; G <= 2 * L; G += 0.5) { const t = truck(4.3); dt = Math.min(dt, best(L, t.concat(t.map(([P, a]) => [P, a + 8.6 + G])), -1)); }
  const Mneg = Math.min(Math.min(tn, best(L, tand, -1)) * 1.33 + lane(L, -1), 0.9 * (dt * 1.33 + lane(L, -1)));
  const e = block('hl93env', { tramos: `${L} m, ${L} m`, apoyos: 'A A A', vehiculo: 'HL-93', IM: '0.33', g: '1', secciones: `${x4} m, ${L} m` });
  near('2 × 140 ft: M⁺(0.4L) LL+IM por carril [kip·ft] = Müller-Breslau', e('MLLx1', 'tonf*m') * kft, Mpos * kft, 0.005);
  near('2 × 140 ft: M⁻ en el pilar (90 % de dos camiones + 90 % carril) [kip·ft]', e('MLLnx2', 'tonf*m') * kft, Mneg * kft, 0.005);
  truthy('2 × 140 ft: el doble camión gobierna el momento negativo en el pilar', 0.9 * (dt * 1.33 + lane(L, -1)) < Math.min(tn, best(L, tand, -1)) * 1.33 + lane(L, -1));
  // Apéndice A, AASHTO Standard Specifications (HS20-44 = camión de diseño HL-93): L = 100 ft → 1524.9 kip·ft
  const h = block('hl93env', { tramos: '100 ft', apoyos: 'A A', IM: '0', g: '1', carril: '0' });
  near('Simple L = 100 ft: momento del camión = 1524.9 kip·ft (tabla HS20, Apéndice A)', h('Mtr', 'tonf*m') * kft, 1524.9, 0.003);
  const hl = block('hl93env', { tramos: '100 ft', apoyos: 'A A', IM: '0', g: '1' });
  near('Simple L = 100 ft: carril 0.64 klf → wL²/8 = 800 kip·ft', hl('Mln', 'tonf*m') * kft, 800, 0.003);
}

section('Revisión — fórmulas de distribución forma SI del Manual MTC 2018 (ver = 2) y otras correcciones');
{
  const S = 2100, L = 20000, ts = 200, Kg = 1.0e11;
  const r = Kg / (L * ts ** 3);
  const q = calc(`a = gMi1LRFD(2100 mm, 20 m, 200 mm, 1e11 mm^4, 2)
b = gMi2LRFD(2100 mm, 20 m, 200 mm, 1e11 mm^4, 2)
c = gVi1LRFD(2100 mm, 2)
d = gVi2LRFD(2100 mm, 2)
e = eMLRFD(450 mm, 2)
f = eVLRFD(450 mm, 2)
p = leverLRFD(2.1 m, 0.45 m, 0.60 m, 2)
b9 = gMi2LRFD(2100 mm, 20 m, 200 mm, 1e11 mm^4)
n2 = NpctLRFD(2, 0.2)
Ft4 = FtLRFD(4)
Lt5 = LtLRFD(5)
H4 = HbminLRFD(4)`);
  near('MTC: gM1 = 0.06 + (S/4300)^0.4 (S/L)^0.3 (Kg/Lts³)^0.1', q('a'), 0.06 + (S / 4300) ** 0.4 * (S / L) ** 0.3 * r ** 0.1, 1e-6);
  near('MTC: gM2 = 0.075 + (S/2900)^0.6 (S/L)^0.2 (Kg/Lts³)^0.1', q('b'), 0.075 + (S / 2900) ** 0.6 * (S / L) ** 0.2 * r ** 0.1, 1e-6);
  near('MTC: gV1 = 0.36 + S/7600', q('c'), 0.36 + S / 7600, 1e-6);
  near('MTC: gV2 = 0.2 + S/3600 − (S/10700)²', q('d'), 0.2 + S / 3600 - (S / 10700) ** 2, 1e-6);
  near('MTC: e = 0.77 + de/2800', q('e'), 0.77 + 450 / 2800, 1e-6); near('MTC: e = 0.6 + de/3000', q('f'), 0.6 + 450 / 3000, 1e-6);
  near('MTC: palanca con ruedas a 1.80 m y 0.60 m de la barrera = 0.50', q('p'), 0.5, 1e-6);
  near('9.ª ed. y MTC difieren en menos de 1.5 % (gM2)', q('b') / q('b9'), 1, 0.015);
  near('Tabla 4.7.4.4-1: zona 2 → 150 % de N', q('n2'), 1.5);
  near('Tabla A13.2-1: Ft TL-4 = 240 kN', q('Ft4', 'kN'), 240, 1e-6); near('Lt TL-5 = 2.44 m', q('Lt5', 'm'), 2.44, 1e-6); near('H mín TL-4 = 810 mm', q('H4', 'mm'), 810, 1e-6);
  // pmLRFD: φ·0.80·P0 con φ = 0.75 (5.6.4.4-3)
  const pm = block('pmLRFD', { b: '40 cm', h: '60 cm', fc: '280 kgf/cm^2', fy: '4200 kgf/cm^2', dp: '6', nx: '3', ny: '1', barra: '8', demandas: '0 tonf, 1 tonf*m // Resistencia I' });
  const Ast = 8 * 5.10, P0 = (0.85 * 280 * (40 * 60 - Ast) + 4200 * Ast) / 1000;
  near('pmLRFD: Pr,max = 0.75·0.80·P0 (5.6.4.4-3)', pm('phiPnmax', 'tonf'), 0.75 * 0.8 * P0, 0.002);
  // flexión pura: sección controlada por tracción (φ = 0.90) — 3#8 en tracción, 3#8 en compresión y 2#8 a media altura
  const Mn0 = pm.ctx.scope.get('phiMnS')(0).toNumber('tonf*m');
  truthy('pmLRFD: φMn(P = 0) entre 0.9·As·fy·(d − a/2) de las 3 barras traccionadas y el de todas', Mn0 > 0.9 * 3 * 5.10 * 4.2 * (0.54 - 0.03) / 1.0 * 0.95 && Mn0 < 0.9 * Ast * 4.2 * 0.54, 'φMn = ' + Mn0.toFixed(2) + ' t·m');
  // estribo: el momento de las fuerzas de inercia = Σ kh·Wi·yi (error corregido: EQw multiplicaba por kh)
  const t = runTemplate('br-estribo');
  near('Estribo: Fi·EQw = kh·Σ Wi·yi', t('Fi', 'tonf') * t('EQw', 'm'), t('kh') * (t('W1', 'tonf') * t('hz', 'm') / 2 + t('W2', 'tonf') * (t('hz', 'm') + (t('hp', 'm') - t('hb', 'm')) / 2) + t('W3', 'tonf') * (t('H', 'm') - t('hb', 'm') / 2) + t('W4', 'tonf') * (t('hz', 'm') + t('hp', 'm') / 2)), 1e-6);
  // parapeto (muro espaldar): Resistencia I con EH a hb/3, LS (heq de un muro de altura hb) a hb/2 y BR a hb + 1.80 m
  {
    const hb = t('hb', 'm'), Ka = t('Ka'), g = 1.9, heqp = t('heqp', 'm');
    near('Estribo: heq del parapeto (hb = 1.65 m) interpolado en la Tabla 3.11.6.4-1 (1.5 m → 1.20 m; 3.0 m → 0.90 m)', heqp, 1.2 - 0.3 * (hb - 1.5) / 1.5, 0.001);
    const Mup = 1.5 * 0.5 * Ka * g * hb ** 2 * hb / 3 + 1.75 * (Ka * g * heqp * hb * hb / 2 + t('PBR', 'tonf') * (hb + 1.8));
    near('Estribo: Mup = 1.50·EH·hb/3 + 1.75·(LS·hb/2 + BR·(hb + 1.80))', t('Mup', 'tonf*m'), Mup, 1e-6);
    truthy('Estribo: en el parapeto gobierna Resistencia I sobre Evento Extremo I (BR con γ = 1.75)', t('Mup_R', 'tonf*m') > t('Mup_E', 'tonf*m'));
    // cajuela: neopreno y aplastamiento
    const P = (t('RDC', 'tonf/m') + t('RDW', 'tonf/m')) * 8 / 4 + 0.75 * t('RLL', 'tonf/m') * 8 / 2;
    near('Estribo: σs del neopreno = (PDC + PDW + gV·Rcarril)/(Lb·Wb)', t('ssb', 'MPa'), P * 9.80665 / (300 * 450) * 1000, 1e-6);
    near('Estribo: N requerido = 1.5·(200 + 0.0017·20000 + 0.0067·7000) mm (zona 4)', t('Nreq', 'mm'), 1.5 * (200 + 0.0017 * 20000 + 0.0067 * 7000), 1e-6);
    near('Estribo: φPn de aplastamiento = 0.70·0.85·f\'c·A1·m, m = √(A2/A1) ≤ 2', t('Prb', 'tonf'), 0.7 * 0.85 * 280 * 30 * 45 * Math.min(Math.sqrt(60 * 75 / (30 * 45)), 2) / 1000, 1e-6);
    near('Estribo: Nuc = máx(0.2·Pu, kh·RDC·Ba/Nv)', t('Nuc', 'tonf'), Math.max(0.2 * t('Pub', 'tonf'), 0.22 * t('RDC', 'tonf/m') * 2), 1e-6);
    near('Estribo: acero de temperatura de la pantalla = 0.75·b·h/[2(b + h)·fy] (5.10.6)', t('Atpt', 'cm^2'), 0.75 * 8000 * 900 / (2 * 8900 * 4200 * 0.0980665) * 10, 1e-4);
    truthy('Estribo: incluye las secciones «Parapeto» y «Cajuela»', t.res.ctx.toc.some(x => /Parapeto/.test(x.text || x.t || JSON.stringify(x))) && t.res.ctx.toc.some(x => /Cajuela/.test(x.text || x.t || JSON.stringify(x))));
  }
  const v1 = runTemplate('br-vigalosa');
  near('Viga-losa: Δ = DF·máx[(1+IM)Δcamión, 0.25(1+IM)Δcamión + Δcarril]', v1('DeltaLL', 'mm'), v1('DFd') * Math.max(1.33 * v1('d1', 'mm'), 0.25 * 1.33 * v1('d1', 'mm') + v1('dln', 'mm')), 1e-6);
  truthy('Viga-losa: M⁻ de diseño en la cara de las almas ≤ suma de máximos en el eje (4.6.2.1.6)', v1('Muneg', 'tonf*m/m') <= 1.25 * Math.abs(v1('MDCnL1', 'tonf*m')) + 1.5 * Math.abs(v1('MDWnL1', 'tonf*m')) + 1.75 * Math.abs(v1('MLLneg', 'tonf*m/m')), 'Mu⁻ = ' + v1('Muneg', 'tonf*m/m').toFixed(3) + ' t·m/m');
}

section('Revisión — datos extremos: verificaciones NO CUMPLE sin errores ni NaN');
{
  const setIn = (d, name, val) => { let hit = 0; d.blocks.forEach(b => { if (b.type === 'calc') { const re = new RegExp('^' + name + ' = .*?( //|$)', 'm'); if (re.test(b.src)) { b.src = b.src.replace(re, name + ' = ' + val + '$1'); hit++; } } }); if (!hit) throw new Error('Dato inexistente: ' + name); };
  const cases = [['br-vigalosa', { L: '40.00 m' }], ['br-vigalosa', { S: '3.20 m' }], ['br-vigalosa', { TL: '5' }], ['br-presforzada', { L: '140 ft' }], ['br-presforzada', { S: '14 ft' }],
    ['br-acero', { L: '160 ft' }], ['br-estribo', { H: '12.00 m' }], ['br-estribo', { qn: '15 tonf/m^2' }], ['br-estribo', { hb: '2.40 m', t1: '0.25 m' }], ['br-estribo', { Lb: '550 mm' }], ['br-estribo', { jta: '15 cm' }], ['br-pilar', { Hc: '30.00 m' }], ['br-pilar', { bcol: '0.60 m' }],
    ['br-neopreno', { PLL: '1500 kN' }], ['br-sismo', { bseat: '0.30 m' }], ['br-alcantarilla', { Hf: '6.00 m' }], ['br-peatonal', { L: '60.0 m' }]];
  for (const [id, c] of cases) {
    const r = runTemplate(id, d => { for (const [k, v] of Object.entries(c)) setIn(d, k, v); }).res;
    const nan = r.ctx.checks.filter(x => x.ratio !== null && x.ratio !== undefined && !Number.isFinite(x.ratio));
    truthy(`${id} ${JSON.stringify(c)}: ${r.ctx.checks.filter(x => !x.ok).length} NO CUMPLE, ${r.ctx.errors.length} errores, ${nan.length} D/C no finitos`, r.ctx.errors.length === 0 && nan.length === 0 && r.ctx.checks.some(x => !x.ok), r.ctx.errors.map(e => e.msg).join('; '));
  }
}
section('Segunda opinión — tercera tanda A (puentes)');
{
  const setIn = (d, name, val) => { d.blocks.forEach(b => { if (b.type === 'calc') b.src = b.src.replace(new RegExp('^' + name + ' = .*?( //|$)', 'm'), name + ' = ' + val + '$1'); }); };
  const p = runTemplate('br-presforzada');
  near('Presforzada: tracción en el apoyo (Vu/φ − 0.5Vs − Vp)·cot θ (5.7.3.5-2) [kip]', p('Treq', 'kip'), (p('Vux', 'kip') / 0.9 - 0.5 * Math.min(p('Vs', 'kip'), p('Vux', 'kip') / 0.9) - p('Vp', 'kip')) / Math.tan(p('theta', 'rad')), 1e-6);
  near('Presforzada: fpx = fpe·lpx/(60db) en la cara del apoyo (lpx = 18 in < 36 in) [ksi]', p('fpx', 'ksi'), p('fpe', 'ksi') * 18 / 36, 1e-6);
  near('Presforzada: Vni = c·Acv + μ·Avf·fy con Acv = 20 in/in (5.7.4.3-3) [kip/ft]', p('Vni', 'kip/ft'), (0.28 * 20 + 1.0 * 0.4 / 12 * 60) * 12, 1e-6);
  near('Presforzada: hendimiento 0.04·Aps·fpj/20 ksi (5.9.4.4.1) [in²]', p('Asplr', 'in^2'), 0.04 * 6.51 * 202.5 / 20, 1e-6);
  truthy('Presforzada: tracción superior en la transferencia > 0.0948√f\'ci → se exige refuerzo adherido', p('As_tz', 'in^2') > 0.3 && p('As_tz', 'in^2') < 1.24);
  const a = runTemplate('br-acero');
  near('Acero: Fatiga I γΔf = 1.75·(gM1/1.2)·1.15·Mfat/Sbn [ksi]', a('dff', 'ksi'), 1.75 * a('gF') * a('Mfat', 'kip*ft') * 12 / (a('Sbn', 'in^3')), 1e-6);
  near('Acero: Qn = Asc·Fu (gobierna sobre 0.5Asc√(f\'cEc)) [kip]', a('Qn', 'kip'), Math.PI * 0.875 ** 2 / 4 * 60, 1e-6);
  near('Acero: paso por fatiga p = n·Zr·I/(Vsr·Q) [in]', a('psr', 'in'), 3 * 5.5 * 0.875 ** 2 * a('In', 'in^4') / (a('Vsr', 'kip') * a('Qn_s', 'in^3')), 1e-6);
  near('Acero: aplastamiento del rigidizador 1.4·Apn·Fy, Apn = 2(6 − 1)·0.75 in² [kip]', a('Rsbr', 'kip'), 1.4 * 7.5 * 50, 1e-6);
  const s3 = runTemplate('br-sismo', d => setIn(d, 'sub', '3'));
  near('Sismo: columna simple, puente esencial → R = 2.0 (Tabla 3.10.7.1-1)', s3('R'), 2.0, 1e-9);
  near('Sismo: pórtico de varias columnas, esencial → R = 3.5', runTemplate('br-sismo')('R'), 3.5, 1e-9);
  const c = runTemplate('br-alcantarilla');
  near('Alcantarilla: cortante en la losa inferior qb·(Bi/2 − dv) [tonf]', c('Vu3', 'tonf'), Math.max(c('qb1', 'tonf/m'), c('qb2', 'tonf/m')) * (1.5 - c('dv3', 'm')), 1e-6);
  const w = runTemplate('br-peatonal');
  near('Peatonal: Lp = rt√(E/Fy) (6.10.8.2.3-4) [m]', w('Lp', 'm'), w('rt', 'm') * Math.sqrt(200000 / 345), 1e-6);
}

section('QA de plantillas: «validacion» y rangos usuales [mín..máx] de los datos');
for (const t of TEMPLATES.filter(x => x.id.startsWith('br-'))) {
  const v = t.validacion;
  truthy(`${t.id}: tiene «validacion» con fuente, nota y valores`, !!(v && v.fuente && v.nota && Array.isArray(v.valores) && v.valores.length >= 3));
  const r = runTemplate(t.id).res, ins = r.ctx.inputs.filter(i => i.range);
  const fuera = ins.filter(i => { const x = parseFloat(i.num); return !(x >= i.range.min && x <= i.range.max); });
  truthy(`${t.id}: ${ins.length} datos con rango usual, valores por defecto dentro del rango`, ins.length >= 3 && fuera.length === 0, fuera.map(i => i.name + ' = ' + i.num).join(', '));
  const sinEtq = r.ctx.inputs.filter(i => !i.label);
  truthy(`${t.id}: todos los datos tienen etiqueta`, sinEtq.length === 0, sinEtq.map(i => i.name).join(', '));
}
{ // bloque «neopreno» (dibujo del apoyo zunchado): sin errores, con capas y zunchos
  const g = block('neopreno', { L: '300 mm', W: '450 mm', hri: '12 mm', n: '4', hrc: '6 mm', hs: '3 mm', cover: '6 mm', Ds: '6.5 mm' });
  truthy('neopreno: SVG con 5 zunchos (×5), 4 capas interiores (×4) y H = 75 mm', /<svg/.test(g.html) && /\(×5\)/.test(g.html) && /\(×4\)/.test(g.html) && /H = 75 mm/.test(g.html));
  const t = runTemplate('br-neopreno').res;
  truthy('br-neopreno: incluye la figura del apoyo', /Apoyo de neopreno zunchado/.test(t.html) && t.ctx.errors.length === 0);
}
section('Segunda opinión — M8: fuerzas y momentos de carga viva en la unidad del sistema del documento');
{
  const prev = settings.sys, res = {};
  for (const sys of ['tec', 'si', 'us']) {
    settings.sys = sys;
    const g = calc('Vf = VfatLRFD(20 m)\nMf = MfatLRFD(20 m)\nMx = MxLRFD(20 m, 10 m, 1)\nVx = VxLRFD(20 m, 0 m, 3)\nBR = BRLRFD(20 m, 2)\nFt = FtLRFD(4)');
    res[sys] = { g, tex: ['Vf', 'Mf', 'Mx', 'Vx', 'BR', 'Ft'].map(n => valTex(g.ctx.scope.get(n))).join(' ') };
  }
  settings.sys = prev;
  const U = { tec: ['tonf', 'tonf'], si: ['kN', 'kN'], us: ['kip', 'kip'] };
  for (const sys of ['tec', 'si', 'us']) {
    const t = res[sys].tex, otros = Object.keys(U).filter(k => k !== sys).map(k => U[k][0]);
    truthy(`Sistema «${sys}»: VfatLRFD, MfatLRFD, MxLRFD, VxLRFD, BRLRFD y FtLRFD se muestran en ${U[sys][0]}`, t.includes('\\mathrm{' + U[sys][0]) && otros.every(o => !t.includes('\\mathrm{' + o)), t);
  }
  near('VfatLRFD: mismo valor físico en kip y en tonf', res.us.g('Vf', 'tonf'), res.tec.g('Vf', 'tonf'), 1e-9);
  near('MfatLRFD: mismo valor físico en kip·ft y en tonf·m', res.us.g('Mf', 'tonf*m'), res.tec.g('Mf', 'tonf*m'), 1e-9);
  near('VfatLRFD(20 m) = 14.52 + 14.52·11/20 + 3.63·6.7/20 (ejes a 4.3 y 9.0 m) [tonf]', res.si.g('Vf', 'tonf'), 14.52 + 14.52 * 11 / 20 + 3.63 * 6.7 / 20, 1e-6);
  const h = runTemplate('br-acero').res.html;
  truthy('br-acero (memoria en kip): la sustitución del rango de cortante de fatiga no muestra tonf', !/tonf/.test(h));
}
done();
