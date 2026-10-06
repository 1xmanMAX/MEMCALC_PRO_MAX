// Pruebas del módulo «analysis»: frame2d, beamcase, influence, cross y plantillas
import { near, truthy, calc, block, runTemplate, section, done, TEMPLATES } from './helpers.mjs';
import { beamFormulas, beamCaseSolve, influenceLine, hardyCross } from '../src/blocks/analysis.js';

const E = 2e6, I = 0.001, EI = E * I;
const sec = `S ${E} 1000 ${I}`; // A grande: sin deformación axial apreciable

section('frame2d — vigas (soluciones clásicas)');
let g = block('frame2d', { nudos: '1 0 0\n2 6 0', secciones: sec, barras: '1 1 2', apoyos: '1 E\n2 E', cargas: 'U 1 2', deflim: '100000' });
near('Biempotrada: M apoyo = −wL²/12', g('Mneg_1', 'tonf*m'), -6);
near('Biempotrada: M centro = wL²/24', g('Mpos_1', 'tonf*m'), 3);
near('Biempotrada: R = wL/2', g('R1y', 'tonf'), 6);
near('Biempotrada: δ = wL⁴/384EI [mm]', g('delta_1', 'mm'), 2 * 6 ** 4 / (384 * EI) * 1000, 0.005);
g = block('frame2d', { nudos: '1 0 0\n2 6 0', secciones: sec, barras: '1 1 2', apoyos: '1 A\n2 Ry', cargas: 'U 1 2', deflim: '100000' });
near('Simplemente apoyada: M = wL²/8', g('Mpos_1', 'tonf*m'), 9);
near('Simplemente apoyada: δ = 5wL⁴/384EI [mm]', g('delta_1', 'mm'), 5 * 2 * 6 ** 4 / (384 * EI) * 1000, 0.005);
g = block('frame2d', { nudos: '1 0 0\n2 4 0', secciones: sec, barras: '1 1 2', apoyos: '1 E', cargas: 'N 2 0 -2' });
near('Voladizo: δ = PL³/3EI [mm]', -g('deltay_2', 'mm'), 2 * 64 / (3 * EI) * 1000);
near('Voladizo: θ = PL²/2EI [rad]', -g('theta_2'), 2 * 16 / (2 * EI));
near('Voladizo: M empotramiento = PL', g('Mneg_1', 'tonf*m'), -8);
g = block('frame2d', { nudos: '1 0 0\n2 6 0', secciones: sec, barras: '1 1 2', apoyos: '1 A\n2 Ry', cargas: 'P 1 10 2\nM 1 0 50%' });
near('Puntual a = 2 m en L = 6 m: Mmax = Pab/L', g('Mpos_1', 'tonf*m'), 10 * 2 * 4 / 6);
g = block('frame2d', { nudos: '1 0 0\n2 6 0', secciones: sec, barras: '1 1 2', apoyos: '1 E\n2 E', cargas: 'T 1 0 3' });
near('Biempotrada triangular: M_A = wL²/30', g('R1m', 'tonf*m'), 3 * 36 / 30);
near('Biempotrada triangular: M_B = wL²/20', -g('R2m', 'tonf*m'), 3 * 36 / 20);
g = block('frame2d', { nudos: '1 0 0\n2 6 0', secciones: sec, barras: '1 1 2', apoyos: '1 E\n2 E', cargas: 'D 2 0 -0.01' });
near('Asentamiento Δ: M = 6EIΔ/L²', Math.abs(g('R1m', 'tonf*m')), 6 * EI * 0.01 / 36);
g = block('frame2d', { nudos: '1 0 0\n2 4 0\n3 8 0', secciones: sec, barras: '1 1 2 rj\n2 2 3', apoyos: '1 E\n3 Ry', cargas: 'U 1,2 1' });
near('Viga Gerber (rótula): M empotramiento = 16', g('Mneg_1', 'tonf*m'), -16);
near('Viga Gerber: tramo suspendido M = wL²/8', g('Mpos_2', 'tonf*m'), 2);
g = block('frame2d', { nudos: '1 0 0\n2 4 0', secciones: sec, barras: '1 1 2', apoyos: '1 E\n2 K 0 500', cargas: 'N 2 0 -2' });
near('Voladizo con resorte: δ = P/(k + 3EI/L³) [mm]', -g('deltay_2', 'mm'), 2 / (500 + 3 * EI / 64) * 1000);
g = block('frame2d', { nudos: '1 0 0\n2 6 3', secciones: sec, barras: '1 1 2', apoyos: '1 A\n2 Ry', cargas: 'U 1 2 proy' });
near('Viga inclinada, carga proyectada: M = wLh²/8', g('Mpos_1', 'tonf*m'), 9);
g = block('frame2d', { nudos: '1 0 0\n2 6 0', secciones: sec, barras: '1 1 2', apoyos: '1 A\n2 Ry', cargas: 'CM: U 1 2\nCV: U 1 1', combinaciones: 'U1 = 1.4 CM + 1.7 CV\nU2 = 1.25(CM + CV) ± CM' });
near('Envolvente = máx(U1, U2a, U2b) = (2.25·2 + 1.25)·wL²/8', g('Mpos_1', 'tonf*m'), (2.25 * 2 + 1.25) * 36 / 8);
near('Reacción por combinación R1y_U1', g('R1y_U1', 'tonf'), (1.4 * 2 + 1.7) * 3);
near('± genera U2a = 2.25CM + 1.25CV', g('R1y_U2a', 'tonf'), (2.25 * 2 + 1.25) * 3);
near('± genera U2b = 0.25CM + 1.25CV', g('R1y_U2b', 'tonf'), (0.25 * 2 + 1.25) * 3);
g = block('frame2d', { nudos: '1 0 0\n2 6 0', secciones: sec, barras: '1 1 2', apoyos: '1 A\n2 Ry', cargas: 'U 1 20 kN/m', unidades: 'kN' });
near('Unidades kN: M = wL²/8 = 90 kN·m', g('Mpos_1', 'kN*m'), 90);

section('frame2d — pórticos (Hibbeler / Kassimali)');
const h = 4, L = 6, Ic = 0.001, Ib = 0.002, Pl = 10;
const port = (ap) => block('frame2d', { nudos: `1 0 0\n2 0 ${h}\n3 ${L} ${h}\n4 ${L} 0`, secciones: `C ${E} 1000 ${Ic}\nV ${E} 1000 ${Ib}`, barras: '1 1 2 C\n2 2 3 V\n3 4 3 C', apoyos: '1,4 ' + ap, cargas: `N 2 ${Pl} 0` });
g = port('A');
near('Portal articulado, carga lateral: M nudo = Ph/2', g('Mmax_1', 'tonf*m'), Pl * h / 2, 0.002);
near('Portal articulado: reacción horizontal = P/2', Math.abs(g('R1x', 'tonf')), Pl / 2, 0.002);
g = port('E');
{ const k = (Ib / L) / (Ic / h); const Mb = Pl * h / 2 * (3 * k + 1) / (6 * k + 1), Mt = Pl * h / 2 * 3 * k / (6 * k + 1);
  near('Portal empotrado: M base = (Ph/2)(3k+1)/(6k+1)', Math.abs(g('R1m', 'tonf*m')), Mb, 0.003);
  near('Portal empotrado: M viga = (Ph/2)·3k/(6k+1)', g('Mmax_2', 'tonf*m'), Mt, 0.003);
  near('Portal empotrado: Σ reacciones = P', Math.abs(g('R1x', 'tonf') + g('R4x', 'tonf')), Pl); }
// Hibbeler, Ej. 11.? equivalente: deriva y exportaciones
g = block('frame2d', { nudos: `1 0 0\n2 0 ${h}\n3 ${L} ${h}\n4 ${L} 0`, secciones: `C ${E} 1000 ${Ic}`, barras: '1 1 2\n2 2 3\n3 4 3', apoyos: '1,4 E', cargas: `CS: N 2 ${Pl} 0`, deriva_caso: 'CS', deriva_f: '6', deriva_lim: '0.5' });
near('Deriva exportada = 6·Δ/h', g('derivamax'), 6 * g('deltax_2', 'm') / h);
truthy('Verificación de deriva agregada', g.ctx.checks.length === 1 && g.ctx.checks[0].ok);

section('frame2d — armaduras (método de los nudos y de secciones)');
g = block('frame2d', { tipo: 'armadura', nudos: '1 0 0\n2 4 0\n3 2 3', secciones: 'S 2e7 0.001', barras: '1 1 2\n2 1 3\n3 2 3', apoyos: '1 A\n2 Ry', cargas: 'N 3 0 -10' });
near('Triángulo: cordón inferior T = P/(2 tanθ)', g('Nt_1', 'tonf'), 10 / (2 * 1.5));
near('Triángulo: diagonales C = P/(2 senθ)', g('Nc_2', 'tonf'), 10 / (2 * 3 / Math.sqrt(13)));
{
  const p = 2, f = 2;
  const nod = [0, 1, 2, 3, 4, 5, 6].map(k => `${k + 1} ${k * p} 0`).join('\n') + `\n8 ${p} ${f / 3}\n9 ${2 * p} ${2 * f / 3}\n10 ${3 * p} ${f}\n11 ${4 * p} ${2 * f / 3}\n12 ${5 * p} ${f / 3}`;
  const bar = '1 1 2\n2 2 3\n3 3 4\n4 4 5\n5 5 6\n6 6 7\n7 1 8\n8 8 9\n9 9 10\n10 10 11\n11 11 12\n12 12 7\n13 2 8\n14 3 9\n15 4 10\n16 5 11\n17 6 12\n18 8 3\n19 9 4\n20 11 4\n21 12 5';
  g = block('frame2d', { tipo: 'armadura', nudos: nod, secciones: 'S 2e7 0.001', barras: bar, apoyos: '1 A\n7 Ry', cargas: 'N 8-12 0 -1\nN 1,7 0 -0.5', grupos: 'CI 1-6' });
  near('Pratt 12 m (secciones): N barra 3 = (3P·4 − 0.5P·4 − P·2)/1.333', g('Nt_3', 'tonf'), 8 / (4 / 3));
  near('Pratt: montante 13 sin fuerza (nudo 2)', g('Nmax_13', 'tonf'), 0);
  near('Pratt: reacción = 3P', g('R1y', 'tonf'), 3);
  near('Grupo CI: tracción máxima', g('Nt_CI', 'tonf'), Math.max(g('Nt_1', 'tonf'), g('Nt_3', 'tonf')));
}
{ let err = ''; try { block('frame2d', { tipo: 'armadura', nudos: '1 0 0\n2 4 0\n3 4 3\n4 0 3', secciones: 'S 2e7 0.001', barras: '1 1 2\n2 2 3\n3 3 4\n4 4 1', apoyos: '1 A\n2 Ry', cargas: 'N 3 1 0' }); } catch (e) { err = e.message; }
  truthy('Mecanismo (cuadrilátero sin diagonal) detectado como inestable', /inestable/i.test(err), err.slice(0, 60)); }

section('beamcase — fórmulas cerradas vs. método de rigidez');
{
  const Lb = 6, w = 2, P = 5, M0 = 3, a = 2, EIb = 2.17e6 * 0.0054;
  let n = 0, ok = 0;
  for (const sp of ['SA', 'V', 'EA', 'EE']) for (const ld of ['U', 'P', 'T', 'Ti', 'M']) {
    const F = beamFormulas(sp, ld, Lb, w, P, M0, a, EIb); const { r } = beamCaseSolve(sp, ld, Lb, w, P, M0, a, EIb);
    const RA = r.reac[0].V, RB = r.reac[1].V, MA = Math.abs(r.reac[0].M), MB = Math.abs(r.reac[1].M);
    const Mp = Math.max(0, ...r.sM), Mmx = Math.max(...r.sM.map(Math.abs)), dmax = Math.max(...r.sD.map(Math.abs));
    for (const f of F) {
      let got = null; const s = f.sym;
      if (/^R_A/.test(s)) got = ld === 'M' ? Math.abs(RA) : RA; else if (s === 'R_B') got = RB;
      else if (/^M_A/.test(s)) got = MA; else if (s === 'M_B') got = MB;
      else if (s === 'M_{max}') got = Mmx; else if (s === 'M^+_{max}') got = Mp;
      else if (/delta_\{max\}|delta_B/.test(s)) got = dmax;
      if (got === null) continue;
      n++; const tol = /185|764|0\.00652/.test(f.tex) ? 0.006 : 0.002;
      if (Math.abs(got - Math.abs(f.val)) <= tol * Math.abs(f.val) + 1e-9) ok++; else console.log('    ✘', sp, ld, s, got, f.val);
    }
  }
  truthy(`Fórmulas AISC 3-23 / Roark coinciden con la rigidez (${ok}/${n})`, ok === n && n > 50);
}
g = block('beamcase', { apoyo: 'V', carga: 'P', L: '4 m', P: '2 tonf', a: '4 m', E: '2e6 tonf/m^2', I: '0.001 m^4' });
near('beamcase voladizo: δ = PL³/3EI [mm]', g('deltamax', 'mm'), 2 * 64 / (3 * EI) * 1000, 0.002);
near('beamcase voladizo: MA = −PL', g('MA', 'tonf*m'), -8);
g = block('beamcase', { apoyo: 'EE', carga: 'P', L: '6 m', P: '6 tonf', a: '3 m', E: '2e6 tonf/m^2', I: '0.001 m^4' });
near('beamcase biempotrada P al centro: δ = PL³/192EI', g('deltamax', 'mm'), 6 * 216 / (192 * EI) * 1000, 0.002);
near('beamcase biempotrada P al centro: M = PL/8', g('Mpos', 'tonf*m'), 6 * 6 / 8);
g = block('beamcase', { apoyo: 'EA', carga: 'U', L: '6 m', w: '2 tonf/m', E: '2e6 tonf/m^2', I: '0.001 m^4', deflim: '360' });
near('beamcase empotrada-apoyada: RB = 3wL/8', g('RB', 'tonf'), 4.5);
near('beamcase empotrada-apoyada: M+ = 9wL²/128', g('Mpos', 'tonf*m'), 9 * 2 * 36 / 128);
truthy('beamcase agrega verificación de deflexión', g.ctx.checks.length === 1);

section('influence — líneas de influencia');
{
  let r = influenceLine([0, 10, 20], ['A', 'A', 'A'], 'R', 1);
  const k = r.pos.findIndex(x => Math.abs(x - 5) < 1e-6);
  near('2 tramos: η(R_B) para x = L/2 = 11/16', r.eta[k], 0.6875, 0.001);
  r = influenceLine([0, 8], ['A', 'A'], 'M', 4);
  near('Simple: η máx. de M al centro = L/4', Math.max(...r.eta), 2, 0.001);
  r = influenceLine([0, 8], ['A', 'A'], 'V', 2);
  near('Simple: η(V) a la derecha de x = L/4 → 3/4', Math.max(...r.eta), 0.75, 0.002);
  near('Simple: η(V) a la izquierda → −1/4', Math.min(...r.eta), -0.25, 0.002);
}
g = block('influence', { tramos: '10, 10', apoyos: 'A, A, A', efecto: 'M', x: '10 m', wD: '2 tonf/m', wL: '0', P: '0' });
near('2 tramos: M_B con carga total = −wL²/8 (Emin)', g('Emin', 'tonf*m'), -25, 0.002);
g = block('influence', { tramos: '10, 10', apoyos: 'A, A, A', efecto: 'M', x: '4 m', wD: '0', wL: '1 tonf/m', P: '0' });
near('2 tramos: M+ en x = 0.4L con carga en el tramo 1 (= 0.0957wL²)', g('Emax', 'tonf*m'), 0.4 * 10 * (1 - 0.4) * 10 / 2 * 1 - 0.4 * 1 * 100 / 16, 0.002);

section('cross — distribución de momentos');
{
  const r = hardyCross([5, 5, 5], [1, 1, 1], ['A', 'A', 'A', 'A'], [[{ t: 'U', w: 2 }], [{ t: 'U', w: 2 }], [{ t: 'U', w: 2 }]], { ciclos: 30, tol: 1e-7 });
  near('3 tramos iguales: M_BC = −0.1 wL² (horario +)', r.M[1][0], -0.1 * 2 * 25, 0.001);
  const r2 = hardyCross([5, 5, 5], [1, 1, 1], ['A', 'A', 'A', 'A'], [[{ t: 'U', w: 2 }], [{ t: 'U', w: 2 }], [{ t: 'U', w: 2 }]], { ciclos: 30, tol: 1e-7, modificado: true });
  near('Rigidez modificada 3EI/L: mismo resultado', r2.M[1][0], -5, 0.001);
  const r3 = hardyCross([6, 6], [1, 1], ['E', 'A', 'E'], [[{ t: 'P', P: 8, a: 3 }], []], { ciclos: 30, tol: 1e-8 });
  near('Cross con carga puntual: M_BA = 3 (pendiente-deflexión)', r3.M[0][1], 3, 0.001);
  const r4 = hardyCross([2, 6], [1, 1], ['L', 'A', 'A'], [[{ t: 'U', w: 1 }], [{ t: 'U', w: 1 }]], { ciclos: 30, tol: 1e-8 });
  near('Voladizo + tramo: momento en el apoyo = −wa²/2', r4.M[1][0], -2, 0.001);
}
g = block('cross', { tramos: '6, 8, 6', apoyos: 'E, A, A, A', I: '1', cargas: 'U 1 2\nU 2 2\nP 3 6 3', ciclos: '20' });
truthy('Bloque cross: error frente a rigidez < 0.1 %', g('errCross') < 1e-3, 'ε = ' + g('errCross'));

section('Funciones normativas');
const v = calc('E = 2.17e6 tonf/m^2\nI = 0.0054 m^4\nk = kLatEE(E, I, 3.5 m)\nM1 = MEPpi(10 tonf, 2 m, 6 m)\nM2 = MEPpj(10 tonf, 2 m, 6 m)\nd = deltaVp(2 tonf, 4 m, E, I)\na = aMuto(1.5)\nK = [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]]\nB = bloque(K, 2, 2, 2)\nc = comp(B, 2, 1)');
near('kLatEE = 12EI/h³', v('k', 'tonf/m'), 12 * 2.17e6 * 0.0054 / 3.5 ** 3);
near('MEP puntual Pab²/L²', v('M1', 'tonf*m'), 10 * 2 * 16 / 36);
near('MEP puntual Pa²b/L²', v('M2', 'tonf*m'), 10 * 4 * 4 / 36);
near('deltaVp = PL³/3EI', v('d', 'mm'), 2 * 64 / (3 * 2.17e6 * 0.0054) * 1000);
near('Coef. de Muto a = k/(2+k)', v('a'), 1.5 / 3.5);
near('bloque(K, 2, 2, 2) y comp', v('c'), 15);

section('Plantillas del módulo');
for (const t of TEMPLATES.filter(x => x.id.startsWith('an-'))) {
  const r = runTemplate(t.id).res;
  truthy(t.name + ': sin errores y todas cumplen', r.ctx.errors.length === 0 && r.ctx.checks.length > 0 && r.ctx.checks.every(c => c.ok), `${r.ctx.checks.length} verificaciones, ${r.ctx.errors.length} errores ${r.ctx.errors.map(e => e.msg).join('; ')}`);
}
{
  const t = runTemplate('an-matricial');
  near('Paso a paso = bloque Pórtico 2D (u₂ en mm)', t('u2') * 1000, t('deltax_2', 'mm'), 1e-6);
  const p = runTemplate('an-portico-ca');
  truthy('Pórtico C°A°: momentos exportados a la memoria (Mneg_7 < 0 < Mpos_7)', p('Mneg_7', 'tonf*m') < 0 && p('Mpos_7', 'tonf*m') > 0);
  const bad = runTemplate('an-portico-ca', d => { d.blocks[1].src = d.blocks[1].src.replace('hc = 40 cm', 'hc = 25 cm').replace('bc = 40 cm', 'bc = 25 cm'); });
  truthy('Pórtico con columnas 25×25: la deriva NO cumple', bad.res.ctx.checks.some(c => !c.ok && /Deriva/.test(c.label)));
}
done();
