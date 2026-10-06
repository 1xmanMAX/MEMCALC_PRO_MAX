// Pruebas de validación de ingeniería: resultados contra soluciones teóricas / tablas
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
console.log(`\nResultado: ${pass} correctas, ${fail} fallidas`);
process.exit(fail ? 1 : 0);
