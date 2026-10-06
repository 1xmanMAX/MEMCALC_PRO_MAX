// Pruebas de validación — módulo «concrete» (NTE E.060-2009 / ACI 318-19)
import { near, truthy, calc, block, runTemplate, section, done, ctxOf, math, TEMPLATES, runDoc } from './helpers.mjs';
import { blockPM } from '../src/blocks.js';

const U = (v, u) => math.unit(v, u);

section('Materiales y flexión (E.060 10.2, 10.3, 10.5)');
let g = calc(`fc = 210 kgf/cm^2
fy = 4200 kgf/cm^2
b1a = beta1E060(210 kgf/cm^2)
b1b = beta1E060(350 kgf/cm^2)
b1c = beta1ACI(35 MPa)
rb = rhobE060(fc, fy)
As = asFlex(25 tonf*m, 30 cm, 54 cm, fc, fy)
Mn = mnRect(As, 30 cm, 54 cm, fc, fy)
AsT = asFlexT(85 tonf*m, 30 cm, 120 cm, 8 cm, 55.5 cm, fc, fy)
Mpr = mprRect(11.36 cm^2, 30 cm, 54 cm, fc, fy)`);
near('β1 (f\'c = 210) = 0.85', g('b1a'), 0.85);
near('β1 (f\'c = 350) = 0.80', g('b1b'), 0.80);
near('β1 ACI (35 MPa) = 0.80', g('b1c'), 0.80);
near('ρb = 0.85β1 f\'c/fy · 6000/(6000+fy) = 0.02125', g('rb'), 0.85 * 0.85 * 210 / 4200 * 6000 / 10200);
near('As (Mu = 25 t·m, 30×54) = 13.59 cm² (verify.mjs / Ottazzi)', g('As', 'cm^2'), 13.59, 0.005);
near('φMn con As requerido = Mu/φ', g('Mn', 'tonf*m'), 25 / 0.9, 0.002);
{ // viga T (a > hf): equilibrio a mano
  const As = g('AsT', 'cm^2'), Asf = 0.85 * 210 * 90 * 8 / 4200, aw = (As - Asf) * 4200 / (0.85 * 210 * 30);
  const Mn = (Asf * 4200 * (55.5 - 4) + (As - Asf) * 4200 * (55.5 - aw / 2)) / 1e5;
  near('Viga T: φMn(As requerido) = Mu (ala + alma)', 0.9 * Mn, 85, 0.002);
}
{ const a = 11.36 * 1.25 * 4200 / (0.85 * 210 * 30); near('Mpr = 1.25fy As (d − a/2) (ACI 18.6.5)', g('Mpr', 'tonf*m'), 11.36 * 1.25 * 4200 * (54 - a / 2) / 1e5); }

section('Doble refuerzo por compatibilidad');
g = calc('M2 = mnRect(25.5 cm^2, 30 cm, 53 cm, 210 kgf/cm^2, 4200 kgf/cm^2, 10.2 cm^2, 6 cm)');
{ // solución a mano: equilibrio con fs' elástico
  const b1 = 0.85, f = 210, y = 4200, Es = 2e6;
  let lo = 1, hi = 53; for (let i = 0; i < 80; i++) { const c = (lo + hi) / 2, fs2 = Math.min(y, Es * 0.003 * (c - 6) / c) - 0.85 * f; const C = 0.85 * f * b1 * c * 30 + 10.2 * fs2; if (C > 25.5 * y) hi = c; else lo = c; }
  const c = lo, a = b1 * c, fs2 = Math.min(y, Es * 0.003 * (c - 6) / c) - 0.85 * f;
  near('Mn doblemente reforzada (compatibilidad a mano)', g('M2', 'tonf*m'), (0.85 * f * a * 30 * (53 - a / 2) + 10.2 * fs2 * 47) / 1e5, 0.002);
}

section('Desarrollo y empalmes (E.060 Cap. 12, Anexo II MKS)');
g = calc(`fc = 210 kgf/cm^2
fy = 4200 kgf/cm^2
l5 = ldE060(5, fc, fy)
l8s = ldE060(8, fc, fy, 1.3)
lg6 = ldgE060(6, fc, fy)
lc6 = ldcE060(6, fc, fy)
ls6 = lsE060(6, fc, fy, 2)
lsc6 = lscE060(6, fc, fy)
l3 = ldE060(3, fc, fy)
lA = ldACI(25 mm, 28 MPa, 420 MPa, 1.5)
lhA = ldhACI(25 mm, 28 MPa, 420 MPa)`);
near('ℓd 5/8" = fy db/(8.2√f\'c) = 56.1 cm', g('l5', 'cm'), 4200 * 1.588 / (8.2 * Math.sqrt(210)));
near('ℓd 1" superior = 1.3 fy db/(6.6√f\'c) = 145 cm', g('l8s', 'cm'), 1.3 * 4200 * 2.54 / (6.6 * Math.sqrt(210)));
near('ℓdg 3/4" = 0.075 fy db/√f\'c = 41.4 cm', g('lg6', 'cm'), 0.075 * 4200 * 1.905 / Math.sqrt(210));
near('ℓdc 3/4" (12.3.2)', g('lc6', 'cm'), Math.max(0.075 * 4200 * 1.905 / Math.sqrt(210), 0.0044 * 4200 * 1.905));
near('Empalme clase B 3/4" = 1.3 ℓd', g('ls6', 'cm'), 1.3 * 4200 * 1.905 / (8.2 * Math.sqrt(210)));
near('Empalme en compresión 3/4" = 0.007 fy db', g('lsc6', 'cm'), 0.007 * 4200 * 1.905);
near('ℓd mínimo 300 mm (3/8")', g('l3', 'cm'), Math.max(30, 4200 * 0.953 / (8.2 * Math.sqrt(210))));
near('ACI 318-19 ℓd No.25 (ψs = 1, (cb+Ktr)/db = 1.5) ≈ 48 db', g('lA', 'mm'), 420 / (1.1 * Math.sqrt(28) * 1.5) * 25);
near('ACI 318-19 ℓdh No.25, f\'c = 28 MPa (ψc = 0.867)', g('lhA', 'mm'), 420 * (28 / 105 + 0.6) / (23 * Math.sqrt(28)) * 25 ** 1.5);

section('Deflexiones (E.060 9.6 / ACI 24.2)');
g = calc(`Icr = icrRect(30 cm, 54 cm, 15 cm^2, 9.2)
Ie = ieBranson(5 tonf*m, 15 tonf*m, 540000 cm^4, Icr)
IeB = ieBischoff(5 tonf*m, 15 tonf*m, 540000 cm^4, Icr)
IeG = ieBischoff(5 tonf*m, 3 tonf*m, 540000 cm^4, Icr)
xi5 = xiDef(60)
xi1 = xiDef(12)
lam = lambdaDef(2, 0.005)
IcT = icrT(120 cm, 8 cm, 30 cm, 55 cm, 40 cm^2, 9.2)`);
{
  const n = 9.2, As = 15, b = 30, d = 54, x = (-n * As + Math.sqrt((n * As) ** 2 + 2 * b * n * As * d)) / b;
  const Icr = b * x ** 3 / 3 + n * As * (d - x) ** 2;
  near('Icr sección rectangular (kd por equilibrio de momentos estáticos)', g('Icr', 'cm^4'), Icr);
  const r = (5 / 15) ** 3; near('Ie Branson = (Mcr/Ma)³Ig + [1 − (Mcr/Ma)³]Icr', g('Ie', 'cm^4'), r * 540000 + (1 - r) * Icr);
  near('Ie Bischoff = Icr / [1 − ((2/3)Mcr/Ma)²(1 − Icr/Ig)]', g('IeB', 'cm^4'), Icr / (1 - (2 / 3 * 5 / 15) ** 2 * (1 - Icr / 540000)));
  near('Ie Bischoff = Ig si Ma ≤ (2/3)Mcr', g('IeG', 'cm^4'), 540000);
  // T: eje neutro en el alma resuelto a mano
  const bf = 120, hf = 8, bw = 30, dT = 55, A = 40; const aa = bw / 2, bb = (bf - bw) * hf + n * A, cc = -((bf - bw) * hf * hf / 2 + n * A * dT);
  const xT = (-bb + Math.sqrt(bb * bb - 4 * aa * cc)) / (2 * aa);
  const IT = (bf - bw) * hf ** 3 / 12 + (bf - bw) * hf * (xT - hf / 2) ** 2 + bw * xT ** 3 / 3 + n * A * (dT - xT) ** 2;
  near('Icr de viga T con eje neutro en el alma', g('IcT', 'cm^4'), IT);
}
near('ξ (5 años) = 2.0 (E.060 9.6.2.5)', g('xi5'), 2.0);
near('ξ (12 meses) = 1.4', g('xi1'), 1.4);
near('λΔ = ξ/(1+50ρ\') = 2/1.25 = 1.6', g('lam'), 1.6);

section('Losas en dos direcciones — E.060 Tablas 13.1 a 13.3 (ACI 318-63 Método 3)');
g = calc(`c1 = CaNeg(2, 1.0)
c2 = CbNeg(3, 0.5)
c3 = CaCM(1, 0.5)
c4 = CbCV(9, 0.8)
c5 = CaNeg(4, 0.825)
c6 = CaNeg(3, 0.8)
k4 = casoLosa(1, 1)
k8 = casoLosa(1, 2)
k9 = casoLosa(2, 1)`);
near('Caso 2, m = 1.00: Ca,neg = 0.045', g('c1'), 0.045);
near('Caso 3, m = 0.50: Cb,neg = 0.022', g('c2'), 0.022);
near('Caso 1, m = 0.50: Ca,CM = 0.095', g('c3'), 0.095);
near('Caso 9, m = 0.80: Cb,CV = 0.017', g('c4'), 0.017);
near('Caso 4, m = 0.825: interpolación (0.066 + 0.071)/2', g('c5'), 0.0685);
near('Caso 3: bordes largos discontinuos → Ca,neg = 0', g('c6'), 0, 0);
truthy('Casos: (1,1)→4, (1,2)→8, (2,1)→9', g('k4') === 4 && g('k8') === 8 && g('k9') === 9);
{
  const s = block('slab2way', { A: '4.5 m', B: '5.6 m', bordes: 'C D D C', wud: '0.784 tonf/m^2', wul: '0.425 tonf/m^2', d: '12 cm' });
  const m = 4.5 / 5.6, wu = 0.784 + 0.425, ip = (t) => { const xs = [0.80, 0.85]; return t[0] + (t[1] - t[0]) * (m - xs[0]) / (xs[1] - xs[0]); };
  near('slab2way: Ma⁻ = Ca wu A² (caso 4)', s('Ma_neg', 'tonf*m/m'), ip([0.071, 0.066]) * wu * 4.5 ** 2, 0.001);
  near('slab2way: Mb⁺ = (Cb,CM wud + Cb,CV wul) B²', s('Mb_pos', 'tonf*m/m'), (ip([0.016, 0.019]) * 0.784 + ip([0.020, 0.023]) * 0.425) * 5.6 ** 2, 0.001);
  near('slab2way: borde discontinuo M⁻ = M⁺/3', s('Ma_disc', 'tonf*m/m'), s('Ma_pos', 'tonf*m/m') / 3);
  truthy('slab2way: caso 4 para bordes C D D C', s('caso') === 4);
}

section('Longitud efectiva (nomogramas de Jackson–Julian)');
g = calc('kb = kBraced(1, 1)\nks = kSway(1, 1)\nk0 = kBraced(0.0001, 0.0001)\nks0 = kSway(0.0001, 0.0001)\nks2 = kSway(2, 2)');
near('Arriostrado ψA = ψB = 1 → k ≈ 0.77', g('kb'), 0.774, 0.003);
near('No arriostrado ψA = ψB = 1 → k ≈ 1.32', g('ks'), 1.316, 0.003);
near('Arriostrado ψ → 0 → k = 0.5', g('k0'), 0.5, 0.01);
near('No arriostrado ψ → 0 → k = 1.0', g('ks0'), 1.0, 0.005);
near('No arriostrado ψA = ψB = 2 → k ≈ 1.60', g('ks2'), 1.6, 0.01);

section('Punzonamiento (E.060 11.12.6)');
g = calc('gv = gammavSlab(71 cm, 71 cm)\nJc = jcInterior(50 cm, 50 cm, 21 cm)');
near('γv columna cuadrada = 0.40', g('gv'), 0.4);
near('Jc = d(c1+d)³/6 + (c1+d)d³/6 + d(c2+d)(c1+d)²/2', g('Jc', 'cm^4'), 21 * 71 ** 3 / 6 + 71 * 21 ** 3 / 6 + 21 * 71 * 71 ** 2 / 2);

section('Diagrama P–M general (fibras)');
{
  // 1) columna rectangular: coincide con blockPM (validado en verify.mjs)
  const p = block('pmgen', { geom: '0 0 40 40', barras: 'R 6 6 34 34 3 3 6', fc: '210 kgf/cm^2', fy: '4200 kgf/cm^2', norma: 'ACI', dir: 'X', demandas: '100 tonf, 15 tonf*m' });
  const c = ctxOf(); blockPM({ b: '40', h: '40', fc: '210', fy: '4200', dp: '6', nx: '3', ny: '1', barra: '6', norma: 'ACI', demandas: '100 tonf, 15 tonf*m' }, c);
  near('pmgen = blockPM: φPn,max columna 40×40, 8 #6', p('phiPnmax', 'tonf'), c.scope.get('phiPnmax').toNumber('tonf'), 0.0005);
  near('pmgen = blockPM: D/C para (100 t, 15 t·m)', p('DCpmg'), c.scope.get('DCpm'), 0.003);
  near('P0 = 0.85f\'c(Ag − Ast) + fy Ast', p('Pn0', 'tonf'), (0.85 * 210 * (1600 - 8 * 2.84) + 4200 * 8 * 2.84) / 1000);
  // flexión pura simétrica = −(negativa)
  const mp = p.ctx.scope.get('phiMn_X')(U(0, 'tonf')).toNumber('tonf*m'), mn = p.ctx.scope.get('phiMnneg_X')(U(0, 'tonf')).toNumber('tonf*m');
  near('Sección simétrica: φMn⁺ = φMn⁻ (P = 0)', mp, mn, 0.001);
}
{
  // 2) muro 300×25: un punto del diagrama calculado a mano por capas (c = 60 cm)
  // concreto: a = 0.85·60 = 51 cm; núcleos 4 #8 en x = 5 y 20 (2 por fila) y #3 @ 20 cm en dos capas en el alma
  const p = block('pmgen', { geom: '0 0 300 25', barras: 'L 5 5 5 20 2 8\nL 20 5 20 20 2 8\nL 280 5 280 20 2 8\nL 295 5 295 20 2 8\nM 40 5 260 5 20 3\nM 40 20 260 20 20 3', fc: '210 kgf/cm^2', fy: '4200 kgf/cm^2', norma: 'E060', dir: 'X', demandas: '' });
  // a mano: capas de acero en x (desde el extremo comprimido x = 300)
  const layers = [[295, 2 * 5.10], [280, 2 * 5.10], [20, 2 * 5.10], [5, 2 * 5.10]];
  for (let i = 0; i < 12; i++) layers.push([40 + 20 * i, 2 * 0.71]);
  const c = 60, a = 0.85 * c, Es = 2e6;
  let P = 0.85 * 210 * a * 25, M = P * (150 - a / 2);
  for (const [x, A] of layers) { const dep = 300 - x; let fs = Math.max(-4200, Math.min(4200, Es * 0.003 * (c - dep) / c)); if (dep < a) fs -= 0.85 * 210; P += A * fs; M += A * fs * (x - 150); }
  // la curva de pmgen (nominal) en P calculado debe dar el mismo M
  const MnFun = p.ctx.scope.get('Mn_X'), cFun = p.ctx.scope.get('c_X');
  near('Muro: Mn(P) en el punto c = 60 cm calculado a mano [t·m]', MnFun(U(P / 1000, 'tonf')).toNumber('tonf*m'), M / 1e5, 0.004);
  near('Muro: profundidad del eje neutro c(Pn) = 60 cm', cFun(U(P / 1000, 'tonf')).toNumber('cm'), 60, 0.005);
  near('Muro: φPn,max = 0.80·0.70·P0 (E.060 10.3.6.2)', p('phiPnmax', 'tonf'), 0.56 * (0.85 * 210 * (7500 - 8 * 5.1 - 24 * 0.71) + 4200 * (8 * 5.1 + 24 * 0.71)) / 1000, 0.001);
}
{
  // 3) biaxial exacto: el contorno a 0° reproduce la capacidad uniaxial; Bresler con ey = 0 ⇒ Pn = Pnx
  const pre = 'P = 150 tonf';
  const u = block('pmgen', { geom: '0 0 50 60', barras: 'R 6 6 44 54 4 4 8', fc: '280 kgf/cm^2', fy: '4200 kgf/cm^2', dir: 'X', demandas: '150 tonf, 30 tonf*m' }, pre);
  const bx = block('pmgen', { geom: '0 0 50 60', barras: 'R 6 6 44 54 4 4 8', fc: '280 kgf/cm^2', fy: '4200 kgf/cm^2', dir: 'XY', demandas: '150 tonf, 30 tonf*m, 0 tonf*m' }, pre);
  near('Biaxial con Muy = 0 ⇒ D/C igual al uniaxial', bx('DCpmg'), u('DCpmg'), 0.01);
  const sym = block('pmgen', { geom: '0 0 50 50', barras: 'R 6 6 44 44 4 4 8', fc: '280 kgf/cm^2', fy: '4200 kgf/cm^2', dir: 'XY', demandas: '200 tonf, 20 tonf*m, 20 tonf*m\n200 tonf, -20 tonf*m, 20 tonf*m' });
  truthy('Sección cuadrada simétrica: D/C igual en los cuadrantes', Math.abs(sym.ctx.checks[0].ratio - sym.ctx.checks[1].ratio) < 0.01, sym.ctx.checks.map(c => c.ratio.toFixed(3)).join(' / '));
  const Pnx = u.ctx.scope.get('Pn_X')(U(10, 'cm')).toNumber('tonf'), Mn = u.ctx.scope.get('Mn_X')(U(Pnx, 'tonf')).toNumber('tonf*m');
  near('Pn_X(e) devuelve un punto con Mn/Pn = e', Mn / Pnx * 100, 10, 0.01);
}

section('Plantillas del módulo');
const mine = TEMPLATES.filter(t => t.id.startsWith('co-'));
truthy('Al menos 15 plantillas de concreto', mine.length >= 15, String(mine.length));
for (const t of mine) {
  const r = runDoc({ meta: {}, settings: t.settings || {}, blocks: t.blocks.map((b, i) => ({ ...JSON.parse(JSON.stringify(b)), id: t.id + i })) });
  truthy(t.id.padEnd(18) + ' sin errores y todas cumplen', r.ctx.errors.length === 0 && r.ctx.checks.length > 0 && r.ctx.checks.every(c => c.ok), `${r.ctx.checks.length} verif.`);
}
{
  const p = runTemplate('co-placa');
  near('Placa: αc = 0.53 para hm/lm ≥ 2 (E.060 11.10.5)', p('alphac'), 0.53);
  near('Placa: c_lím = lm/(600·δu/hm)', p('clim', 'cm'), 350 / (600 * Math.max(16 / 2100, 0.005)));
  near('Placa: Vn = Acw(αc√f\'c + ρh fy)', p('Vn', 'tonf'), 8750 * (0.53 * Math.sqrt(210) + 2 * 0.71 / (25 * 20) * 4200) / 1000, 0.001);
  truthy('Placa: Vu = Vua·Mn/Mua con Mn/Mua ≤ R', p('fa') <= 6 && Math.abs(p('Vu', 'tonf') - 72 * p('fa')) < 1e-6);
  const e = runTemplate('co-colesbelta');
  { const Ec = 15000 * Math.sqrt(280), Ig = 45 ** 4 / 12, EI = 0.4 * Ec * Ig / 1.6, Pc = Math.PI ** 2 * EI / 420 ** 2 / 1000, Cm = 0.6 + 0.4 * 9 / 14;
    near('Columna esbelta: δns = Cm/(1 − Pu/0.75Pc)', e('dns'), Cm / (1 - 190 / (0.75 * Pc))); }
  near('Columna esbelta: Q = ΣPu·Δo/(Vus·he)', e('Q'), 2600 * 0.75 * 8 * 0.45 / (210 * 480));
  const bi = runTemplate('co-biaxial');
  near('Bresler: 1/Pn = 1/Pnx + 1/Pny − 1/Pon', 1 / bi('Pn', 'tonf'), 1 / bi('Pnx', 'tonf') + 1 / bi('Pny', 'tonf') - 1 / bi('Pon', 'tonf'), 1e-6);
  truthy('Bresler y compatibilidad concuerdan (±15 %)', Math.abs(bi('DCb') - bi('DCpmg')) / bi('DCpmg') < 0.15, `${bi('DCb').toFixed(3)} / ${bi('DCpmg').toFixed(3)}`);
  const v = runTemplate('co-vigaductil');
  near('Viga sísmica: Vu = (Mpr⁻ + Mpr⁺)/ln + wu ln/2', v('Vu', 'tonf'), (v('Mprn', 'tonf*m') + v('Mprp', 'tonf*m')) / 5.4 + 1.25 * 3.5 * 5.4 / 2);
  const df = runTemplate('co-deflexion');
  near('Deflexión: análisis por rigidez = 5wL⁴/384EcIe', df('deltamax_s', 'cm'), df('dDL', 'cm'), 0.005);
  const st = runTemplate('co-stm');
  near('Puntal-tensor: T = Pu/tan θ', st('Ft', 'kN'), 900 / Math.tan(st('theta', 'rad')));
}
done();
