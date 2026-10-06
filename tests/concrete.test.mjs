// Pruebas de validación — módulo «concrete» (NTE E.060-2009 / ACI 318-19)
import { near, truthy, calc, block, runTemplate, section, done, ctxOf, math, TEMPLATES, runDoc } from './helpers.mjs';
import { blockPM } from '../src/blocks.js';
import { makeSection, stateAt, parseBarsGen } from '../src/blocks/concrete.js';
import { SLAB_TABLES } from '../src/norms/concrete.js';

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
section('Revisión independiente — ejemplos publicados y casos límite');
// Reemplaza el valor de un dato "nombre = ..." en los bloques de cálculo de una plantilla
const setData = (vals) => (d) => { for (const b of d.blocks) if (b.type === 'calc') b.src = b.src.split('\n').map(l => { const m = /^(\w+)\s*=/.exec(l); return m && m[1] in vals ? m[1] + ' = ' + vals[m[1]] + (l.includes('//') ? ' //' + l.split('//').slice(1).join('//') : '') : l; }).join('\n'); };
{
  // E.060 Tablas 13.1–13.3 transcritas del PDF oficial (2009); casos según las figuras de la norma:
  // A vertical (luz corta), B horizontal; bordes rayados = continuos
  const T = SLAB_TABLES, i1 = T.ms.indexOf(1.0), i5 = T.ms.indexOf(0.5);
  truthy('Tabla 13.1 m = 1.00 (Ca): —, .045, —, .050, .075, .071, —, .033, .061', JSON.stringify(T.negA[i1]) === JSON.stringify([0, .045, 0, .050, .075, .071, 0, .033, .061]));
  truthy('Tabla 13.1 m = 0.50 (Cb): —, .006, .022, .006, —, —, .014, .010, .003', JSON.stringify(T.negB[i5]) === JSON.stringify([0, .006, .022, .006, 0, 0, .014, .010, .003]));
  truthy('Tabla 13.2 m = 0.85 (Ca): .050 .024 .029 .036 .031 .042 .040 .029 .028', JSON.stringify(T.cmA[T.ms.indexOf(0.85)]) === JSON.stringify([.050, .024, .029, .036, .031, .042, .040, .029, .028]));
  truthy('Tabla 13.3 m = 0.60 (Ca): .081 .058 .071 .067 .059 .068 .077 .065 .059', JSON.stringify(T.cvA[T.ms.indexOf(0.6)]) === JSON.stringify([.081, .058, .071, .067, .059, .068, .077, .065, .059]));
  // Figuras de la Tabla 13.1: caso 3 = bordes cortos (izq./der.) continuos; 5 = bordes largos (sup./inf.);
  // 6 = solo el borde largo superior; 7 = solo el borde corto derecho; 8 = izq., inf. y der. (largo superior discontinuo);
  // 9 = izq., sup. e inf. (corto derecho discontinuo); 4 = izq. e inf. (adyacentes)
  const cases = { 'D D C C': 3, 'C C D D': 5, 'C D D D': 6, 'D D D C': 7, 'D C C C': 8, 'C C C D': 9, 'D C C D': 4, 'C C C C': 2, 'D D D D': 1 };
  const ok = Object.entries(cases).every(([bd, k]) => block('slab2way', { A: '4 m', B: '5 m', bordes: bd, wud: '1 tonf/m^2', wul: '0.5 tonf/m^2', d: '10 cm' })('caso') === k);
  truthy('slab2way: los 9 casos coinciden con las figuras de la E.060 (bordes sup inf izq der)', ok);
  const s1 = block('slab2way', { A: '3 m', B: '7 m', bordes: 'C C C C', wud: '1 tonf/m^2', wul: '0.5 tonf/m^2', d: '10 cm' });
  truthy('slab2way: m < 0.5 → NO CUMPLE (13.7.1.2) sin error', s1.ctx.checks.length === 1 && !s1.ctx.checks[0].ok);
  g = calc('lsc = lscE060(8, 210 kgf/cm^2, 4200 kgf/cm^2)');
  near('Empalme en compresión MKS 0.007 fy db = SI 0.071 fy[MPa] db (12.16.1; el Anexo II dice 0.071 por errata)', g('lsc', 'cm'), 0.071 * (4200 / 10.197) * 2.54, 0.01);
}
{
  // pmgen frente a un cálculo independiente con recorte exacto de polígonos (eje neutro inclinado)
  const bars = parseBarsGen('R 6 6 44 54 4 4 8', new Map());
  const sec = makeSection([{ x0: 0, y0: 0, b: 50, h: 60 }], bars, { fc: 280, fy: 4200, Es: 2e6, norma: 'E060' });
  const clip = (poly, ux, uy, t0) => { const o = []; for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length], tp = p[0] * ux + p[1] * uy - t0, tq = q[0] * ux + q[1] * uy - t0; if (tp >= 0) o.push(p); if (tp * tq < 0) { const s = tp / (tp - tq); o.push([p[0] + s * (q[0] - p[0]), p[1] + s * (q[1] - p[1])]); } } return o; };
  const cen = (P) => { let A = 0, cx = 0, cy = 0; for (let i = 0; i < P.length; i++) { const [x1, y1] = P[i], [x2, y2] = P[(i + 1) % P.length], c = x1 * y2 - x2 * y1; A += c; cx += (x1 + x2) * c; cy += (y1 + y2) * c; } A /= 2; return { A, cx: cx / (6 * A), cy: cy / (6 * A) }; };
  let worst = 0;
  for (const [deg, c] of [[0, 20], [30, 35], [45, 25], [60, 50], [17, 15]]) {
    const th = deg * Math.PI / 180, ux = Math.cos(th), uy = Math.sin(th), rect = [[0, 0], [50, 0], [50, 60], [0, 60]];
    const tmax = Math.max(...rect.map(p => p[0] * ux + p[1] * uy)), a = 0.85 * c, gC = cen(clip(rect, ux, uy, tmax - a));
    let P = 0.85 * 280 * gC.A, Mx = P * (gC.cx - 25), My = P * (gC.cy - 30);
    for (const b of bars) { const dep = tmax - (b.x * ux + b.y * uy); let fs = Math.max(-4200, Math.min(4200, 2e6 * 0.003 * (c - dep) / c)); if (dep < a) fs -= 0.85 * 280; P += b.A * fs; Mx += b.A * fs * (b.x - 25); My += b.A * fs * (b.y - 30); }
    const st = stateAt(sec, { ux, uy, tmax }, c);
    worst = Math.max(worst, Math.abs(st.P - P) / 1e3, Math.hypot(st.Mx - Mx, st.My - My) / 1e5);
  }
  truthy('pmgen = integración exacta por polígonos (5 ejes neutros inclinados): error < 0.1 t y 0.1 t·m', worst < 0.1, 'máx ' + worst.toFixed(4));
}
{
  // StructurePoint, "Interaction Diagram – Tied RC Column Design Strength (ACI 318-19)": 16×16 in, 8 #9,
  // f'c = 5000 psi, fy = 60 ksi, Es = 29 000 ksi, recubrimiento 2.5 in al centro de barras (= spColumn)
  const p = block('pmgen', { geom: '0 0 40.64 40.64', barras: 'L 6.35 6.35 6.35 34.29 4 9\nL 34.29 6.35 34.29 34.29 4 9', fc: '5000 psi', fy: '60000 psi', Es: '29000 ksi', norma: 'ACI', dir: 'X', demandas: '' });
  const S = p.ctx.scope, kip = (v) => U(v, 'kip');
  near('SP/spColumn: φPn,max = 0.80·0.65·P0 = 797.7 kip', p('phiPnmax', 'kip'), 797.7, 0.002);
  for (const [lab, P, M] of [['fs = 0', 957.4, 261.33], ['fs = 0.5fy', 649.1, 338.54], ['balanceado', 416.8, 385.81], ['εt = εy + 0.003', 190.7, 318.61], ['flexión pura', 0, 237.73]])
    near('SP/spColumn: Mn en el punto ' + lab + ' (Pn = ' + P + ' kip) [kip·ft]', S.get('Mn_X')(kip(P)).toNumber('kip*ft'), M, 0.003);
  near('SP/spColumn: φMn en flexión pura = 213.96 kip·ft', S.get('phiMn_X')(kip(0)).toNumber('kip*ft'), 213.96, 0.003);
  near('SP/spColumn: φMn para φPn = 622.3 kip (fs = 0) = 169.86 kip·ft', S.get('phiMn_X')(kip(622.3)).toNumber('kip*ft'), 169.86, 0.003);
}
{
  // StructurePoint, "Biaxial Bending Interaction Diagrams for Rectangular RC Column (ACI 318-19)" (Pincheira, Ex. 10.20.1):
  // 16×20 in, 10 #8, f'c = 6000 psi; spColumn: Pn = 426.64 kip, Mnx = 320.84, Mny = 200.92 kip·ft con φ = 0.667
  const I = 2.54, bars = `L ${2.5 * I} ${2.5 * I} ${2.5 * I} ${17.5 * I} 4 8\nL ${13.5 * I} ${2.5 * I} ${13.5 * I} ${17.5 * I} 4 8\n${8 * I} ${2.5 * I} 8\n${8 * I} ${17.5 * I} 8`;
  const ph = 0.667, p = block('pmgen', { geom: `0 0 ${16 * I} ${20 * I}`, barras: bars, fc: '6000 psi', fy: '60000 psi', Es: '29000 ksi', norma: 'ACI', dir: 'XY', demandas: `${ph * 426.64} kip, ${ph * 200.92} kip*ft, ${ph * 320.84} kip*ft` });
  near('SP/spColumn biaxial: el punto (φPn, φMny, φMnx) está sobre el contorno de carga (D/C = 1)', p('DCpmg'), 1.0, 0.015);
}
{
  // StructurePoint, "The Role of γf in Two-way Slab Punching Shear (ACI 318)": columna interior 16×16 in, d = 5.75 in,
  // f'c = 4000 psi, Vu = 75.91 kip, Mu = 11.52 kip·ft → Jc = 40 131 in⁴, γv = 0.400, vu = 166.7 psi, vc = 253 psi
  g = calc('Jc = jcInterior(16 in, 16 in, 5.75 in)\ngv = gammavSlab(21.75 in, 21.75 in)');
  near('SP: Jc columna interior = 40 131 in⁴', g('Jc', 'in^4'), 40131, 0.001);
  near('SP: γv = 0.400', g('gv'), 0.400, 0.001);
  const t = runTemplate('co-punzonamiento', setData({ fc: '4000 psi', h: '7 in', d: '5.75 in', c1: '16 in', c2: '16 in', Vu: '75.91 kip', Mu: '11.52 kip*ft' }));
  near('SP: plantilla de punzonamiento vu = 166.7 psi', t('vu', 'psi'), 166.7, 0.003);
  near('SP: plantilla vc = mín(4, 2 + 4/β, αs d/bo + 2)·√f\'c = 253 psi (coeficientes MKS 1.06/0.53/0.27)', t('vc', 'psi'), 253, 0.005);
}
{
  // StructurePoint / Wang (Ex. 13.17.3): columna exterior de pórtico arriostrado, ψA = 4.32, base articulada → k = 0.959
  g = calc('k1 = kBraced(4.32, 1000000)');
  near('SP: k (nomograma arriostrado) ψA = 4.32, ψB = ∞ → 0.959', g('k1'), 0.959, 0.002);
}
{
  // StructurePoint, "Equilibrium Torsion (ACI 318-14)": viga 14×24 in, f'c = 4000 psi, #4 cerrados, rec. 1.5 in,
  // Tu = 28 kip·ft, Vu = 57.14 kip, φ = 0.75 → Aoh = 215.25 in², At/s = 0.0204, Av/s = 0.0295 in²/in, Aℓ = 1.265 in²
  const t = runTemplate('co-torsion', setData({ fc: '4000 psi', fy: '60000 psi', fyt: '60000 psi', b: '14 in', h: '24 in', recl: '1.5 in', est: '4', Tu: '28 kip*ft', Vu: '57.14 kip', Mu: '228.25 kip*ft', phi: '0.75', d: '21.5 in' }));
  near('SP torsión: Aoh = 215.25 in²', t('Aoh', 'in^2'), 215.25, 0.001);
  near('SP torsión: esfuerzo combinado = 325.55 psi', t('tau', 'psi'), 325.55, 0.003);
  near('SP torsión: At/s = 0.0204 in²/in por rama', t('At_s', 'in^2/in'), 0.0204, 0.005);
  near('SP torsión: Av/s = 0.0295 in²/in (Vc MKS 0.53√f\'c ≈ 2√f\'c psi)', t('Av_s', 'in^2/in'), 0.0295, 0.01);
  near('SP torsión: Aℓ = 1.265 in²', t('Al', 'in^2'), 1.265, 0.003);
  near('SP torsión: φTth = 5.87 kip·ft (0.27√f\'c MKS ≈ 1√f\'c psi, +1.9 %)', t('Tth', 'kip*ft'), 5.87, 0.025);
}
{
  // Ramas de las plantillas: clasificaciones que cambian el procedimiento (no son verificaciones)
  const e = runTemplate('co-colesbelta', setData({ lu: '2.0 m' }));
  truthy('Columna poco esbelta (lu = 2 m): δns = 1 y sin errores', e('dns') === 1 && e.res.ctx.errors.length === 0 && e.res.ctx.checks.every(c => c.ok));
  const b = runTemplate('co-biaxial', setData({ Pu: '20 tonf', Mux: '10 tonf*m', Muy: '8 tonf*m' }));
  truthy('Biaxial con Pu < 0.1φPon: rige la ec. 10-23 (Mux/φMnx + Muy/φMny)', b('bres') === 0 && Math.abs(b('DCb') - (10 / b.res.ctx.scope.get('phiMn_X')(U(20, 'tonf')).toNumber('tonf*m') + 8 / b.res.ctx.scope.get('phiMn_Y')(U(20, 'tonf')).toNumber('tonf*m'))) < 1e-9);
  const tq = runTemplate('co-torsion', setData({ Tu: '0.3 tonf*m' }));
  truthy('Torsión menor que el umbral: se informa (tors = 0) sin verificación fallida', tq('tors') === 0 && tq.res.ctx.checks.every(c => c.ok));
}
{
  // Datos extremos: cargas × 20 → NO CUMPLE, sin errores ni NaN en ninguna plantilla
  const re = /^(\s*\w+\s*=\s*)(-?\d+(?:\.\d+)?)(\s*(?:tonf|kN|kip)\S*\s*)(\/\/.*)?$/;
  let okAll = true; const info = [];
  for (const t of TEMPLATES.filter(t => t.id.startsWith('co-') && !['co-anclajes', 'co-nudo'].includes(t.id))) {
    const r = runDoc({ meta: {}, settings: t.settings || {}, blocks: t.blocks.map((b, i) => { const c = { ...JSON.parse(JSON.stringify(b)), id: t.id + i }; if (c.type === 'calc') c.src = c.src.split('\n').map(l => { const m = re.exec(l); return m ? m[1] + (+m[2] * 20) + m[3] + (m[4] || '') : l; }).join('\n'); return c; }) });
    const fine = r.ctx.errors.length === 0 && r.ctx.checks.some(c => !c.ok) && r.ctx.checks.every(c => !Number.isNaN(c.ratio));
    if (!fine) { okAll = false; info.push(t.id); }
  }
  truthy('Cargas × 20 en 16 plantillas: NO CUMPLE sin errores ni NaN', okAll, info.join(', '));
  const nj = runTemplate('co-nudo', setData({ bc: '30 cm', hc: '30 cm', barv: '8' }));
  truthy('Nudo con columna de 30×30 y barras de 1": NO CUMPLE sin errores', nj.res.ctx.errors.length === 0 && nj.res.ctx.checks.some(c => !c.ok));
}
section('Rangos usuales [mín..máx] y ejemplos de validación de las plantillas «concrete»');
for (const t of TEMPLATES.filter(x => x.id.startsWith('co-'))) {
  const inp = runTemplate(t.id).res.ctx.inputs, rg = inp.filter(i => i.range);
  const out = rg.filter(i => { let v = parseFloat(i.num); if (i.range.unit && i.unit && i.range.unit !== i.unit) v = math.unit(v, i.unit).toNumber(i.range.unit); return !(v >= i.range.min && v <= i.range.max); });
  const bad = inp.filter(i => /\.\.|\[/.test(i.label || ''));
  truthy(`${t.id}: ${rg.length} datos con rango, valores por defecto dentro del rango, etiquetas limpias`, rg.length >= 3 && out.length === 0 && bad.length === 0, out.map(i => i.name + ' = ' + i.num).concat(bad.map(i => i.name)).join(', '));
  const v = t.validacion;
  truthy(`${t.id}: tiene «validacion» con fuente, nota y valores`, !!(v && v.fuente && v.nota && Array.isArray(v.valores) && v.valores.length >= 3));
}
{
  const c0 = runTemplate('co-colductil'), c1 = runTemplate('co-colductil', setData({ Pumin: '20 tonf' }));
  truthy('Columna sísmica: Vc = 0 en Lo si Pu < Ag f\'c/20 (E.060 21.6.5.2)', c0('Vc', 'tonf') > 0 && c1('Vc', 'tonf') === 0);
  const c2 = runTemplate('co-colductil', setData({ b: '40 cm', hc: '60 cm' }));
  near('Columna sísmica rectangular: d medido en b (dirección del pórtico)', c2('d', 'cm'), 40 - 4 - 0.9525 - 2.54 / 2, 0.002);
  near('Columna sísmica rectangular: bc con la dimensión mayor (conservador)', c2('bc', 'cm'), 60 - 8 - 0.9525, 0.002);
}
truthy('Listas desplegables intactas con rango (f\'c, espesor de losa, estribo del voladizo)', (() => { const f = (id, n) => runTemplate(id).res.ctx.inputs.find(i => i.name === n); return f('co-placa', 'fc').options.length === 3 && f('co-placa', 'fc').range.max === 420 && f('co-losa2d', 'h').options.length === 4 && f('co-voladizo', 'est').options.length === 2; })());
truthy('Losas: validacion con los coeficientes de la E.060 (Tabla 13.1 y Art. 8.3.3)', ['co-losa2d', 'co-losa1d'].every(id => /Tabla 13\.1|8\.3\.3/.test(TEMPLATES.find(x => x.id === id).validacion.fuente)));
done();
