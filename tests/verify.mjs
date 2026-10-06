// Pruebas de validación de ingeniería: resultados contra soluciones teóricas / tablas
import '../src/norms/index.js';
import { runCalc, math } from '../src/engine.js';
import { blockBeam, blockPM } from '../src/blocks.js';
import { runDoc } from '../src/docrun.js';
import { TEMPLATES } from '../src/templates.js';

let pass = 0, fail = 0;
const near = (name, got, exp, tol = 0.01) => {
  const ok = Math.abs(got - exp) <= Math.abs(exp) * tol + 1e-9;
  ok ? pass++ : fail++;
  console.log((ok ? '  ✔ ' : '  ✘ ') + name.padEnd(58) + ' obtenido ' + (+got).toFixed(4) + '   esperado ' + (+exp).toFixed(4));
};
const ctxOf = () => ({ scope: new Map(), checks: [], inputs: [], toc: [], errors: [], state: { mode: 'completo', hidden: false, dec: 2 }, blockId: 'x', prevVals: new Map(), heading: () => '' });
const calc = (src) => { const c = ctxOf(); runCalc(src, c); if (c.errors.length) throw new Error(JSON.stringify(c.errors)); return (n, u) => { const v = c.scope.get(n); return math.isUnit(v) ? v.toNumber(u) : v; }; };
const beam = (b) => { const c = ctxOf(); blockBeam(b, c); return (n, u) => c.scope.get(n).toNumber(u); };

console.log('Vigas (método de rigidez)');
let g = beam({ tramos: '6', apoyos: 'A A', E: '2e6 tonf/m^2', I: '0.001 m^4', cargas: 'U 1 2' });
near('Simplemente apoyada wL²/8', g('Mpos', 'tonf*m'), 9);
near('Simplemente apoyada 5wL⁴/384EI [mm]', g('deltamax', 'mm'), 5 * 2 * 6 ** 4 / (384 * 2e6 * 0.001) * 1000);
g = beam({ tramos: '6', apoyos: 'E E', E: '2e6 tonf/m^2', I: '0.001 m^4', cargas: 'U 1 2' });
near('Biempotrada M apoyo = wL²/12', -g('Mneg', 'tonf*m'), 6);
near('Biempotrada M centro = wL²/24', g('Mpos', 'tonf*m'), 3);
near('Biempotrada δ = wL⁴/384EI [mm]', g('deltamax', 'mm'), 2 * 6 ** 4 / (384 * 2e6 * 0.001) * 1000);
g = beam({ tramos: '5,5', apoyos: 'A,A,A', cargas: 'U * 2' });
near('Dos tramos iguales M apoyo = wL²/8', -g('Mneg', 'tonf*m'), 6.25);
near('Dos tramos R central = 1.25 wL', g('R2', 'tonf'), 12.5);
g = beam({ tramos: '4', apoyos: 'E L', E: '2e6 tonf/m^2', I: '0.001 m^4', cargas: 'P 4 2' });
near('Voladizo M = PL', -g('Mneg', 'tonf*m'), 8);
near('Voladizo δ = PL³/3EI [mm]', g('deltamax', 'mm'), 2 * 64 / (3 * 2e6 * 0.001) * 1000);
g = beam({ tramos: '6', apoyos: 'A A', cargas: 'T 1 0 3' });
near('Carga triangular M máx = wL²/(9√3)', g('Mpos', 'tonf*m'), 3 * 36 / (9 * Math.sqrt(3)), 0.002);
g = beam({ tramos: '5,5,5', apoyos: 'A,A,A,A', cargas: 'CM: U * 2\nCV: U * 1', alternancia: true });
near('3 tramos, M+ tramo extremo (coef. 0.08 CM + 0.101 CV)', g('Mpos1', 'tonf*m'), 0.08 * 2 * 25 + 0.1013 * 25, 0.01);
near('3 tramos, M− apoyo interior (0.1 CM + 0.1167 CV)', -g('Mneg', 'tonf*m'), 0.1 * 2 * 25 + 0.1167 * 25, 0.01);

console.log('Concreto armado');
let v = calc('fc = 210 kgf/cm^2\nfy = 4200 kgf/cm^2\nb = 30 cm\nd = 54 cm\nMu = 25 tonf*m\nRn = Mu/(0.9*b*d^2)\nrho = 0.85*fc/fy*(1 - sqrt(1 - 2*Rn/(0.85*fc)))\nAs = rho*b*d\nVc = 0.53*sqrtfc(fc)*b*d');
near('As para Mu=25 t·m, b=30, d=54 (cm²)', v('As', 'cm^2'), 13.59, 0.005);
near('Vc = 0.53√f\'c b d (t)', v('Vc', 'tonf'), 0.53 * Math.sqrt(210) * 30 * 54 / 1000);
const c = ctxOf(); blockPM({ b: '40', h: '40', fc: '210', fy: '4200', dp: '6', nx: '3', ny: '1', barra: '6', demandas: '' }, c);
const Ast = 8 * 2.84, P0 = 0.85 * 210 * (1600 - Ast) + 4200 * Ast;
near('Columna φPn,max = 0.7·0.8·P0 (t)', c.scope.get('phiPnmax').toNumber('tonf'), 0.56 * P0 / 1000);

console.log('Puentes (AASHTO HL-93)');
v = calc('L = 10 m\nMt = MtruckHL93(L)\nMd = MtandemHL93(L)\nMl = MlaneHL93(L)\nL2 = 30 m\nMt2 = MtruckHL93(L2)');
near('Tándem L=10 m: 2P(L/2−0.3)²/L', v('Md', 'tonf*m'), 22.68 * 4.7 ** 2 / 10, 0.003);
near('Carril L=10 m: 0.952·L²/8', v('Ml', 'tonf*m'), 0.952 * 100 / 8);
// teoría: eje central a L/2 − e/2 con e = distancia eje central–resultante
{ const P = [3.63, 14.52, 14.52], R = 32.67, xr = (14.52 * 4.3 + 14.52 * 8.6) / R, e = xr - 4.3, x = 15 - e / 2; const RA = R * (30 - (x + e)) / 30; near('Camión L=30 m: posición teórica crítica (t·m)', v('Mt2', 'tonf*m'), RA * x - 3.63 * 4.3, 0.002); void P; }

console.log('Suelos');
v = calc('phi = 30 deg\nNq = e^(pi*tan(phi))*tan(45 deg + phi/2)^2\nNc = (Nq - 1)*cot(phi)\nNg = 2*(Nq + 1)*tan(phi)\nKa = (1 - sin(phi))/(1 + sin(phi))');
near('Nq (φ=30°) = 18.40', v('Nq'), 18.40, 0.002);
near('Nc (φ=30°) = 30.14', v('Nc'), 30.14, 0.002);
near('Nγ Vesic (φ=30°) = 22.40', v('Ng'), 22.40, 0.002);
near('Ka Rankine (φ=30°) = 1/3', v('Ka'), 1 / 3);

v = calc('Df = 3 m\nB = 2 m\nkD = si(Df/B <= 1, Df/B, atan(Df/B))');
near('Hansen kD = atan(Df/B) para Df/B = 1.5', v('kD'), Math.atan(1.5));
v = calc('Z = 0.35\nU = 1\nS = 1.15\nN = 4\ndmin = Z*U*S*N/56');
near('E.070 densidad mínima ZUSN/56', v('dmin'), 0.35 * 1.15 * 4 / 56);
v = calc('fc = 210 kgf/cm^2\nfy = 4200 kgf/cm^2\nldc = max(0.075*fy*db(6)/sqrtfc(fc), 0.0044*fy*db(6)/(1 kgf/cm^2))');
near('ldc barra #6 (E.060 12.3) = 0.075·fy·db/√fc', v('ldc', 'cm'), 0.075 * 4200 * 1.905 / Math.sqrt(210));
console.log('Normas internacionales y E.030-2026');
v = calc('S4 = SE030(4, 450 m/s)\nTp = TpE030(300 m/s)\nTl = TlE030(300 m/s)\nRt = RtBSL(0.9, 0.6)\nAi = AiBSL(0.25, 0.36)\nSa = SaASCE7(0.5, 1.0, 0.6, 8)\nSd = SdEC8(0.3, 0.25, 1.15, 0.2, 0.6, 2, 3.9)\nls = lambdasACI(500 mm)');
near('E.030-2026 S (Z4, Vs30 = 450 m/s) = 1.05', v('S4'), 1.05);
near('E.030-2026 TP (Vs30 = 300 m/s) = 0.70 s', v('Tp', 's'), 0.7);
near('E.030-2026 TL (Vs30 = 300 m/s) = 1.867 s', v('Tl', 's'), 2.0 - 0.4 / 3);
near('BSL Rt = 1 − 0.2(T/Tc − 1)²', v('Rt'), 0.95);
near('BSL Ai = 1 + (1/√α − α)·2T/(1+3T)', v('Ai'), 1 + (2 - 0.25) * 0.72 / 2.08);
near('ASCE 7 Sa = SDS en la meseta (T0 ≤ T ≤ TS)', v('Sa'), 1.0);
near('EC8 Sd = ag·S·2.5/q en meseta', v('Sd'), 0.25 * 1.15 * 2.5 / 3.9);
near('ACI 318-19 λs = √(2/(1+0.004d))', v('ls'), Math.sqrt(2 / 3));
console.log('Acero (AISC 360, W12x26)');
const acero = TEMPLATES.find(t => t.id === 'acero');
const r = runDoc({ meta: {}, settings: {}, blocks: acero.blocks.map((b, i) => ({ ...b, id: 'a' + i })) });
near('Lp = 5.33 ft (Tabla 3-2)', r.ctx.scope.get('Lp').toNumber('ft'), 5.33, 0.003);
near('Lr = 14.9 ft (Tabla 3-2)', r.ctx.scope.get('Lr').toNumber('ft'), 14.9, 0.005);
near('φMp = 140 kip·ft (Tabla 3-2)', 0.9 * r.ctx.scope.get('Mp').toNumber('kip*ft'), 139.5, 0.005);

console.log('Plantillas: sin errores y con verificaciones');
for (const t of TEMPLATES) {
  const rr = runDoc({ meta: {}, settings: t.settings || {}, blocks: t.blocks.map((b, i) => ({ ...b, id: 't' + i })) });
  const ok = rr.ctx.errors.length === 0 && rr.ctx.checks.every(x => x.ok);
  ok ? pass++ : fail++;
  console.log((ok ? '  ✔ ' : '  ✘ ') + t.name.padEnd(48) + ` ${rr.ctx.checks.length} verificaciones, ${rr.ctx.errors.length} errores`);
}
{
  const t = TEMPLATES.find(x => x.id === 'viga');
  const d = { meta: {}, settings: {}, blocks: t.blocks.map((b, i) => ({ ...b, id: 'z' + i })) };
  d.blocks[1].src = d.blocks[1].src.replace('fy = 4200', 'fy = 35');
  const rr = runDoc(d); const okSum = !/TODAS LAS VERIFICACIONES CUMPLEN/.test(rr.html);
  okSum ? pass++ : fail++; console.log((okSum ? '  ✔ ' : '  ✘ ') + 'Datos absurdos (fy = 35) no producen «TODAS CUMPLEN»');
}
// ---------------------------------------------------------------------
// Plantillas base (src/templates.js): valores de control y datos extremos
// (revisión docs/referencias/revision-base.md)
// ---------------------------------------------------------------------
const runT = (id, reps = []) => {
  const t = TEMPLATES.find(x => x.id === id);
  const d = { meta: {}, settings: t.settings || {}, blocks: t.blocks.map((b, i) => ({ ...b, id: 'b' + i })) };
  for (const [a, b] of reps) {
    let hit = false;
    for (const bl of d.blocks) if (bl.src && bl.src.includes(a)) { bl.src = bl.src.replace(a, b); hit = true; }
    if (!hit) throw new Error(`${id}: no se encontró «${a}»`);
  }
  const rr = runDoc(d);
  rr.v = (n, u) => { const x = rr.ctx.scope.get(n); return math.isUnit(x) ? x.toNumber(u) : x; };
  rr.fails = rr.ctx.checks.filter(c => !c.ok).map(c => c.label);
  return rr;
};
console.log('Plantillas base: valores de control');
{
  let r = runT('sismo2018');
  near('E.030-2018: V = ZUCS/R·P = 0.35·1·2.5·1.15/8·790 (t)', r.v('V', 'tonf'), 0.35 * 2.5 * 1.15 / 8 * 790);
  r = runT('sismo');
  near('E.030-2026: V = 0.45·1·2.5·S(300 m/s)/8·790 (t)', r.v('V', 'tonf'), 0.45 * 2.5 * r.v('S') / 8 * 790);
  near('E.030-2026: deriva en el extremo = rt·0.75R·Δ/h (piso 2)', r.v('deriva_max').get([1]), 1.10 * 0.75 * 8 * 0.28 / 300);
  r = runT('sismo', [['T = hn/CT', 'T = 10*hn/CT']]);
  near('E.030-2026: C/R ≥ 0.11 aplicado y Δ sin el mínimo (fCR = (C/R)/0.11)', r.v('fCR'), (2.5 * 0.7 * r.v('Tl', 's') / (120 / 35) ** 2 / 8) / 0.11, 0.002);
  near('E.030-2026: V con C/R = 0.11 (t)', r.v('V', 'tonf'), 0.45 * r.v('S') * 0.11 * 790);
  r = runT('columna');
  near('E.060 21.6.4.2: so = min(b/3, 6db, 10 cm) = 10 cm', r.v('so', 'cm'), 10);
  near('E.060 21.6.4.5: fuera de Lo ≤ min(10db, 25 cm) → 17.5 cm', r.v('s_fuera', 'cm'), 17.5);
  near('E.060 9.3.2.2: con Pu = 95 t > 0.1 f\'c Ag, φ = 0.70 → D/C(0.9CM+CS) = 20/φMn = 0.699 (el bloque pm daba 0.59 con φ por deformación)', 20 / r.v('phiMn_X')(math.unit(95, 'tonf')).toNumber('tonf*m'), 0.699, 0.003);
  r = runT('asce7');
  near('ASCE 7-22: T = min(Tmodelo, Cu·Ta) = 1.4·0.0466·15^0.9 (s)', r.v('T'), 1.4 * 0.0466 * 15 ** 0.9);
  r = runT('zapata');
  near('E.050 Art. 21: qa sísmica = 1.20 qa → qns (t/m²)', r.v('qns', 'tonf/m^2'), 1.2 * 25 - 2 * 1.5 - 0.25);
  r = runT('portante');
  near('E.050 Art. 20.4: Nγ Meyerhof (φ = 28°) = (Nq − 1)·tan(1.4φ)', r.v('Ngamma'), (r.v('Nq') - 1) * Math.tan(1.4 * 28 * Math.PI / 180));
}
console.log('Plantillas base: datos extremos → NO CUMPLE, sin errores ni NaN');
const EXTREMOS = [
  ['viga', [['Mu = 22 tonf*m', 'Mu = 220 tonf*m']], 'Sección suficiente'],
  ['viga', [['Vu = 18 tonf', 'Vu = 180 tonf']], 'Dimensiones de la sección'],
  ['vigacont', [['sc = 0.20 tonf/m^2 //', 'sc = 5.0 tonf/m^2 //']], 'Flexión negativa'],
  ['columna', [['b = 40 cm', 'b = 15 cm']], 'Dimensión menor'],
  ['zapata', [['qa = 2.5 kgf/cm^2', 'qa = 0.2 kgf/cm^2']], 'Capacidad neta positiva'],
  ['zapata', [['PD = 60 tonf', 'PD = 600 tonf'], ['hz = 60 cm', 'hz = 30 cm']], 'Punzonamiento'],
  ['aci', [['Mu = 250 kN*m', 'Mu = 2500 kN*m']], 'Resistencia a flexión'],
  ['ec2', [['MEd = 250 kN*m', 'MEd = 2500 kN*m']], 'Resistencia a flexión'],
  ['portante', [['phi = 28 deg', 'phi = 0 deg'], ['c = 1.0 tonf/m^2', 'c = 0 tonf/m^2']], 'Presión de servicio'],
  ['muro', [['H = 4.0 m', 'H = 9.0 m']], 'Volteo'],
  ['muro', [['B = 2.80 m', 'B = 1.00 m']], 'talón'],
  ['aligerado', [['sc = 0.20 tonf/m^2', 'sc = 3.0 tonf/m^2']], 'Alma suficiente'],
  ['sismo', [['categoria = 4 //', 'categoria = 2 //']], 'Tabla N° 9'],
  ['sismo', [['categoria = 4 //', 'categoria = 3 //'], ['Ts = 0.30 s', 'Ts = 0.60 s']], '0.65 TP'],
  ['sismo', [['Ia = 1.0 //', 'Ia = 0.50 //']], 'Tabla N° 13'],
  ['sismo', [['hn = 12.0 m', 'hn = 40 m']], 'Art. 33.2'],
  ['sismo', [['Di = [0.22', 'Di = [2.2']], 'extremo'],
  ['sismo2018', [['categoria = 4 //', 'categoria = 2 //']], 'Tabla N° 6'],
  ['sismo2018', [['Ip = 1.0 //', 'Ip = 0.75 //'], ['hn = 12.0 m', 'hn = 18 m']], '28.1.2'],
  ['sismo2018', [['Di = [0.22', 'Di = [0.32']], 'Tabla N° 11'],
  ['asce7', [['configuracion = 1 //', 'configuracion = 3 //']], 'ELF permitido'],
  ['japon', [['Qu = [3100', 'Qu = [310']], 'Qu ≥ Qun'],
  ['puente', [['fc = 280 kgf/cm^2', 'fc = 100 kgf/cm^2'], ['L = 10.0 m', 'L = 10.0 m'], ['h = roundup(hmin, 0.05 m)', 'h = 0.30 m']], 'Resistencia a flexión'],
  ['acero', [['Lb = 10 ft', 'Lb = 60 ft']], 'Resistencia a flexión'],
  ['albanileria', [['Pm = 22 tonf', 'Pm = 220 tonf']], 'Esfuerzo axial'],
  ['escalera', [['Ln = 3.60 m', 'Ln = 9.00 m']], 'Diferida por CM'],
  ['escalera', [['t = 17 cm', 't = 10 cm'], ['Ln = 3.60 m', 'Ln = 6.00 m']], 'Garganta suficiente'],
];
for (const [id, reps, esperado] of EXTREMOS) {
  const r = runT(id, reps);
  const txt = r.html.replace(/<[^>]+>/g, ' ');
  const ok = r.ctx.errors.length === 0 && !/\bNaN\b|Infinity/.test(txt) && r.fails.some(l => l.includes(esperado)) && !/TODAS LAS VERIFICACIONES CUMPLEN/.test(r.html);
  ok ? pass++ : fail++;
  console.log((ok ? '  ✔ ' : '  ✘ ') + `${id}: ${reps.map(x => x[1]).join(', ')}`.padEnd(58) + ` → NO CUMPLE «${esperado}»` + (ok ? '' : `  [errores ${JSON.stringify(r.ctx.errors).slice(0, 200)}; fallan: ${r.fails.join(' | ')}]`));
}
console.log('Plantillas base: «validacion», rangos usuales y modo de dimensionamiento de la zapata');
{
  const fs = await import('node:fs');
  const baseIds = [...fs.readFileSync(new URL('../src/templates.js', import.meta.url), 'utf8').matchAll(/^\s*id: '([\w-]+)'/gm)].map(m => m[1]);
  for (const id of baseIds) {
    const t = TEMPLATES.find(x => x.id === id), v = t.validacion, r = runT(id);
    const ins = r.ctx.inputs.filter(i => i.range), fuera = ins.filter(i => { const x = parseFloat(i.num); return !(x >= i.range.min && x <= i.range.max); });
    const sinEtq = r.ctx.inputs.filter(i => !i.label);
    const okV = id === 'blanco' || !!(v && v.fuente && v.nota && v.valores.length >= 3);
    const ok = okV && ins.length >= Math.min(3, r.ctx.inputs.filter(i => !i.options).length) && fuera.length === 0 && sinEtq.length === 0;
    ok ? pass++ : fail++;
    console.log((ok ? '  ✔ ' : '  ✘ ') + `${id}: validación ${v ? 'sí' : 'no'}, ${ins.length} datos con rango usual`.padEnd(58) + (ok ? '' : ` [fuera: ${fuera.map(i => i.name).join(', ')}; sin etiqueta: ${sinEtq.map(i => i.name).join(', ')}]`));
  }
  const z = runT('zapata', [['modo = 1 //', 'modo = 2 //'], ['PD = 60 tonf', 'PD = 120 tonf']]);
  near('Zapata con «B y L dados»: B = B_dado = 2.05 m', z.v('B', 'm'), 2.05, 1e-9);
  const zok = z.ctx.errors.length === 0 && z.fails.some(l => l.includes('Presión máxima'));
  zok ? pass++ : fail++; console.log((zok ? '  ✔ ' : '  ✘ ') + 'Zapata con B y L fijos y PD = 120 t: NO CUMPLE la presión (no se redimensiona)');
  const za = runT('zapata', [['PD = 60 tonf', 'PD = 120 tonf']]);
  const aok = za.v('B', 'm') > 2.05 && za.ctx.errors.length === 0;
  aok ? pass++ : fail++; console.log((aok ? '  ✔ ' : '  ✘ ') + 'Zapata en modo automático con PD = 120 t: B crece (' + za.v('B', 'm').toFixed(2) + ' m)');
}
console.log('Segunda opinión (docs/referencias/segunda-opinion.md)');
{
  const ok = (name, c) => { c ? pass++ : fail++; console.log((c ? '  ✔ ' : '  ✘ ') + name); };
  const vg = runT('viga');
  ok('Viga: barras superiores corridas ≥ As,mín (E.060 10.5.2 / 21.4.4.1)', vg.v('nsup') * 1.99 >= vg.v('Asmin', 'cm^2') && vg.ctx.errors.length === 0);
  const zs = runT('zapata', [['MS = 4.0 tonf*m', 'MS = 20 tonf*m'], ['PS = 5 tonf', 'PS = 15 tonf']]);
  near('Zapata: con sismo grande gobierna U2 = 1.25(CM+CV) + CS en qu', zs.v('qu', 'tonf/m^2'), zs.v('qu2', 'tonf/m^2'), 1e-9);
  ok('Zapata: qu2 > qu1 con MS = 20 t·m (antes solo se usaba 1.4CM + 1.7CV)', zs.v('qu2', 'tonf/m^2') > zs.v('qu1', 'tonf/m^2'));
  const z0 = runT('zapata');
  near('Zapata: aplastamiento φPnb = 0.70·0.85·f\'c·A1·2 (A2/A1 ≥ 4)', z0.v('phiPnb', 'tonf'), 0.70 * 0.85 * 210 * 50 * 40 * 2 / 1000, 1e-6);
  const sh = runT('sismo', [['hn = 12.0 m', 'hn = 15.0 m']]);
  ok('Sismo: hn incoherente con hi → NO CUMPLE «Coherencia de datos»', sh.fails.some(l => l.includes('Coherencia de datos')));
}
console.log('Segunda opinión — segunda tanda (vigacont, aligerado, escalera)');
{
  const ok = (name, c) => { c ? pass++ : fail++; console.log((c ? '  ✔ ' : '  ✘ ') + name); };
  const vc = runT('vigacont', [['fc = 210 kgf/cm^2', 'fc = 420 kgf/cm^2']]);
  const b1 = 0.85 - 0.05 * (420 - 280) / 70;
  near('Viga continua: Asmax = 0.75·ρb·b·d con β1(420) = 0.75 (E.060 10.2.7.3)', vc.v('Asmax', 'cm^2'), 0.75 * 0.85 * b1 * 420 / 4200 * 6000 / 10200 * 30 * 54, 1e-6);
  const al = runT('aligerado');
  near('Aligerado: Ig de la T 40/10 × 20 con losa de 5 cm = 11 801 cm⁴', al.v('Igt', 'cm^4'), 11801, 0.001);
  near('Aligerado: Mcr = 2√f\'c·Ig/yb (ec. 9-11)', al.v('Mcrv', 'kgf*cm'), 2 * Math.sqrt(210) * al.v('Igt', 'cm^4') / al.v('ybg', 'cm'), 1e-6);
  ok('Aligerado: deflexión diferida + viva calculada y ≤ ℓ/480 con los datos por defecto', al.ctx.errors.length === 0 && al.fails.length === 0 && al.v('dDv', 'mm') > 0);
  const al2 = runT('aligerado', [['La2 = 4.50 m', 'La2 = 6.00 m']]);
  ok('Aligerado con luz de 6.0 m y h = 20 cm: NO CUMPLE la deflexión (Tabla 9.2)', al2.fails.some(l => l.includes('Deflexión posterior')));
  const es = runT('escalera', [['t = 17 cm', 't = 15 cm']]);
  ok('Escalera con garganta de 15 cm y ℓ = 4.39 m: NO CUMPLE ℓ/240 (antes no se calculaba la deflexión)', es.fails.some(l => l.includes('Diferida por CM')));
  const em = runT('escalera', [['alpha = 1.0 //', 'alpha = 0.8 //']]);
  near('Escalera semiempotrada (α = 0.8): M⁻ = (1/3)·wu·Ln²/8 ≥ (1 − α)·wu·Ln²/8', em.v('Mneg', 'tonf*m/m'), em.v('wu', 'tonf/m^2') * 3.6 ** 2 / 24, 1e-6);
}
console.log(`\nResultado: ${pass} correctas, ${fail} fallidas`);
process.exit(fail ? 1 : 0);
