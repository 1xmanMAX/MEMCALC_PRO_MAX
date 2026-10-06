// Pruebas del módulo «analysis»: frame2d, beamcase, influence, cross y plantillas
import { near, truthy, calc, block, runTemplate, section, done, TEMPLATES } from './helpers.mjs';
import { beamFormulas, beamCaseSolve, influenceLine, hardyCross, analyzeFrame } from '../src/blocks/analysis.js';

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

section('frame2d — contraste con PyNite 3.2 (FEModel3D, restringido al plano; modelos aleatorios)');
{
  // Referencias generadas con PyNiteFEA 3.2 (analyze_linear / analyze_PDelta): pórtico de 3 pisos con rótulas,
  // cargas parciales, trapezoidales, puntuales y perpendiculares; pórtico a dos aguas; armadura; viga continua
  // con resorte rotacional y asentamiento. Tolerancia 0.1 % (datos redondeados a 6 cifras).
  const REF = [{"n":"frame1","m":{"tipo":"portico","nudos":"n0x0 0 0\nn0x1 5 0\nn0x2 9 0\nn0x3 15 0\nn1x0 0 3\nn1x1 5 3\nn1x2 9 3\nn1x3 15 3\nn2x0 0 6.5\nn2x1 5 6.5\nn2x2 9 6.5\nn2x3 15 6.5\nn3x0 0 10\nn3x1 5 10\nn3x2 9 10\nn3x3 15 10","secciones":"C 2200000.0 0.207225 0.00313885\nV 2200000.0 0.18 0.0054","barras":"1 n0x0 n1x0 C\n2 n0x1 n1x1 C\n3 n0x2 n1x2 C\n4 n0x3 n1x3 C\n5 n1x0 n2x0 C\n6 n1x1 n2x1 C\n7 n1x2 n2x2 C\n8 n1x3 n2x3 C\n9 n2x0 n3x0 C\n10 n2x1 n3x1 C\n11 n2x2 n3x2 C\n12 n2x3 n3x3 C\n13 n1x0 n1x1 V\n14 n1x1 n1x2 V\n15 n1x2 n1x3 V ri\n16 n2x0 n2x1 V\n17 n2x1 n2x2 V\n18 n2x2 n2x3 V\n19 n3x0 n3x1 V\n20 n3x1 n3x2 V\n21 n3x2 n3x3 V","apoyos":"n0x0 110\nn0x1 111\nn0x2 111\nn0x3 110","cargas":"T 13 -1.77962 -1.60744 0 5 perp\nT 14 3.60365 3.18231 0 4\nT 15 2.04464 3.29909 0 6\nN n1x0 1.02761 -1.76247 0\nP 16 5.63815 3.8185\nT 17 3.3537 3.5219 0 4\nT 18 3.76657 0.300001 2.74881 4.79496\nN n2x0 3.17092 -0.592781 0\nT 19 -2.0016 -1.96721 0 5 perp\nT 20 2.56832 3.9469 0 4\nT 21 3.70658 2.96045 0 6\nN n3x0 3.23119 -0.808576 0"},"pd":false,"R":{"n0x0":[-0.0412902,10.1255,0.0],"n0x1":[-2.74235,33.203,4.61412],"n0x2":[-3.01622,41.4607,4.88714],"n0x3":[-1.62987,22.9488,0.0]},"u":{"n3x2":[0.00333412,-0.000632317],"n3x1":[0.00336243,-0.00046716],"n3x3":[0.00329295,-0.000318153]},"M":{"15":10.5688,"21":9.06622,"20":8.44433,"14":7.39002},"N":{"1":10.1255,"2":33.203,"3":41.4607,"4":22.9488}},{"n":"frame1-PΔ","m":{"tipo":"portico","nudos":"n0x0 0 0\nn0x1 5 0\nn0x2 9 0\nn0x3 15 0\nn1x0 0 3\nn1x1 5 3\nn1x2 9 3\nn1x3 15 3\nn2x0 0 6.5\nn2x1 5 6.5\nn2x2 9 6.5\nn2x3 15 6.5\nn3x0 0 10\nn3x1 5 10\nn3x2 9 10\nn3x3 15 10","secciones":"C 2200000.0 0.207225 0.00313885\nV 2200000.0 0.18 0.0054","barras":"1 n0x0 n1x0 C\n2 n0x1 n1x1 C\n3 n0x2 n1x2 C\n4 n0x3 n1x3 C\n5 n1x0 n2x0 C\n6 n1x1 n2x1 C\n7 n1x2 n2x2 C\n8 n1x3 n2x3 C\n9 n2x0 n3x0 C\n10 n2x1 n3x1 C\n11 n2x2 n3x2 C\n12 n2x3 n3x3 C\n13 n1x0 n1x1 V\n14 n1x1 n1x2 V\n15 n1x2 n1x3 V ri\n16 n2x0 n2x1 V\n17 n2x1 n2x2 V\n18 n2x2 n2x3 V\n19 n3x0 n3x1 V\n20 n3x1 n3x2 V\n21 n3x2 n3x3 V","apoyos":"n0x0 110\nn0x1 111\nn0x2 111\nn0x3 110","cargas":"T 13 -1.77962 -1.60744 0 5 perp\nT 14 3.60365 3.18231 0 4\nT 15 2.04464 3.29909 0 6\nN n1x0 1.02761 -1.76247 0\nP 16 5.63815 3.8185\nT 17 3.3537 3.5219 0 4\nT 18 3.76657 0.300001 2.74881 4.79496\nN n2x0 3.17092 -0.592781 0\nT 19 -2.0016 -1.96721 0 5 perp\nT 20 2.56832 3.9469 0 4\nT 21 3.70658 2.96045 0 6\nN n3x0 3.23119 -0.808576 0"},"pd":true,"R":{"n0x0":[-0.0407091,10.1105,0.0],"n0x1":[-2.75091,33.1964,4.64847],"n0x2":[-3.01689,41.4763,4.91681],"n0x3":[-1.62121,22.9547,0.0]},"u":{"n3x2":[0.00335566,-0.000632495],"n3x1":[0.00338396,-0.000467137],"n3x3":[0.00331451,-0.000318243]},"M":{"15":10.5777,"21":9.06367,"20":8.44965,"14":7.42179},"N":{"1":10.1105,"2":33.1964,"3":41.4763,"4":22.9547}},{"n":"gable","m":{"tipo":"portico","nudos":"n0x0 0 0\nn0x1 7.5 0\nn0x2 15 0\nn1x0 0 3.5\nn1x1 7.5 5\nn1x2 15 3.5","secciones":"C 2200000.0 0.210784 0.00376215\nV 2200000.0 0.18 0.0054","barras":"1 n0x0 n1x0 C\n2 n0x1 n1x1 C\n3 n0x2 n1x2 C\n4 n1x0 n1x1 V\n5 n1x1 n1x2 V rj","apoyos":"n0x0 110\nn0x1 110\nn0x2 110","cargas":"P 4 6.96488 0.719906\nT 5 -2.38688 -1.04188 0 7.64853 perp\nN n1x0 3.94658 -1.92952 0"},"pd":false,"R":{"n0x0":[-1.2608,6.98724,0.0],"n0x1":[-0.114208,10.0774,0.0],"n0x2":[2.66454e-15,4.68758,0.0]},"u":{"n1x1":[0.00528449,-0.000108657],"n1x0":[0.00532035,-5.27367e-05],"n1x2":[0.00528104,-3.53799e-05]},"M":{"4":9.00288,"5":8.45471,"1":4.41281,"2":0.571041},"N":{"1":6.98724,"2":10.0774,"3":4.68758,"4":3.62552}},{"n":"gable-PΔ","m":{"tipo":"portico","nudos":"n0x0 0 0\nn0x1 7.5 0\nn0x2 15 0\nn1x0 0 3.5\nn1x1 7.5 5\nn1x2 15 3.5","secciones":"C 2200000.0 0.210784 0.00376215\nV 2200000.0 0.18 0.0054","barras":"1 n0x0 n1x0 C\n2 n0x1 n1x1 C\n3 n0x2 n1x2 C\n4 n1x0 n1x1 V\n5 n1x1 n1x2 V rj","apoyos":"n0x0 110\nn0x1 110\nn0x2 110","cargas":"P 4 6.96488 0.719906\nT 5 -2.38688 -1.04188 0 7.64853 perp\nN n1x0 3.94658 -1.92952 0"},"pd":true,"R":{"n0x0":[-1.26829,6.97164,0.0],"n0x1":[-0.113893,10.0931,0.0],"n0x2":[0.00716169,4.68754,0.0]},"u":{"n1x1":[0.00535057,-0.000108828],"n1x0":[0.00538617,-5.26198e-05],"n1x2":[0.00534729,-3.53799e-05]},"M":{"4":9.04604,"5":8.46291,"1":4.47643,"2":0.622926},"N":{"1":6.97164,"2":10.0931,"3":4.68754,"4":3.61515}},{"n":"truss1","m":{"tipo":"armadura","nudos":"b0 0 0\nb1 2.5 0\nb2 5 0\nb3 7.5 0\nb4 10 0\nt1 2.5 1.5\nt2 5 1.5\nt3 7.5 1.5","secciones":"S 20000000.0 0.00205669 1e-06","barras":"1 b0 b1 S rij\n2 b1 b2 S rij\n3 b2 b3 S rij\n4 b3 b4 S rij\n5 b0 t1 S rij\n6 t3 b4 S rij\n7 t1 t2 S rij\n8 t2 t3 S rij\n9 b1 t1 S rij\n10 b2 t2 S rij\n11 b3 t3 S rij\n12 t1 b2 S rij\n13 b2 t3 S rij","apoyos":"b0 110\nb4 010","cargas":"N t1 -0.489862 -3.48631 0\nN t2 -0.101018 -3.95478 0\nN t3 0.577447 -2.28158 0"},"pd":false,"R":{"b0":[0.0134331,5.16453,0.0],"b4":[0.0,4.55813,0.0]},"u":{"t2":[0.00101095,-0.00581641],"b2":[0.00104465,-0.00567219],"t1":[0.00167432,-0.00417339]},"M":{"5":2.29948e-17,"6":2.16702e-17,"1":1.85336e-17,"4":1.73687e-17},"N":{"1":-8.59411,"2":-8.59411,"3":-7.59689,"4":-7.59689}},{"n":"beam0","m":{"tipo":"portico","nudos":"a0 0 0\na1 5 0\na2 9 0\na3 14 0","secciones":"V 2200000.0 0.18 0.0054","barras":"1 a0 a1 V\n2 a1 a2 V rj\n3 a2 a3 V","apoyos":"a0 111\na1 010\na2 010\na3 010\na3 K 0 0 800","cargas":"T 1 2 3 0.5 4.5\nP 1 5 1.5\nT 2 2 3 0.5 3.5\nP 2 5 1.2\nT 3 2 3 0.5 4.5\nP 3 5 1.5\nD a1 0 -0.005 0"},"pd":false,"R":{"a0":[0.0,13.5769,21.4811],"a1":[0.0,7.17649,0.0],"a2":[0.0,14.7602,0.0],"a3":[0.0,6.98645,-1.09891]},"u":{"a1":[0.0,-0.005],"a0":[0.0,0.0],"a2":[0.0,0.0]},"M":{"1":21.4811,"2":11.6315,"3":11.1516},"N":{"1":0.0,"2":0.0,"3":0.0}}];
  for (const r of REF) {
    const A = analyzeFrame({ ...r.m, combinaciones: '', pdelta: r.pd }, new Map());
    const set = [...A.sets.values()].find(s => s.kind === 'comb');
    const md = A.md, ix = (id) => md.nids.indexOf(id);
    let eR = 0, Rr = 0; for (const [n, v] of Object.entries(r.R)) for (let d = 0; d < 3; d++) { eR = Math.max(eR, Math.abs(set.R[3 * ix(n) + d] - v[d])); Rr = Math.max(Rr, Math.abs(v[d])); }
    let eu = 0, ur = 0; for (const [n, v] of Object.entries(r.u)) for (let d = 0; d < 2; d++) { eu = Math.max(eu, Math.abs(set.u[3 * ix(n) + d] - v[d])); ur = Math.max(ur, Math.abs(v[d])); }
    let eM = 0, Mr = 0; for (const [k, v] of Object.entries(r.M)) { const mi = md.mids.indexOf(k); eM = Math.max(eM, Math.abs(Math.max(...set.mf[mi].M.map(Math.abs)) - v)); Mr = Math.max(Mr, v); }
    let eN = 0, Nr = 0; for (const [k, v] of Object.entries(r.N)) { const mi = md.mids.indexOf(k); eN = Math.max(eN, Math.abs(Math.abs(set.mf[mi].N[0]) - Math.abs(v))); Nr = Math.max(Nr, Math.abs(v)); }
    truthy(`PyNite «${r.n}»: reacciones, desplazamientos, |M|máx y |N| (≤ 0.1 %)`, eR <= 1e-3 * Rr && eu <= 1e-3 * ur && eM <= 1e-3 * Mr && eN <= 1e-3 * Nr + 1e-6,
      `εR=${(eR / Rr).toExponential(1)} εu=${(eu / ur).toExponential(1)} εM=${(eM / Mr).toExponential(1)} εN=${(eN / (Nr || 1)).toExponential(1)}`);
    if (!r.pd) truthy(`«${r.n}»: equilibrio global ΣFx = ΣFy = ΣM = 0`, set.eq.every(v => Math.abs(v) < 1e-6 * (1 + Rr * 10)), set.eq.map(v => v.toExponential(1)).join(' '));
  }
}

section('frame2d — segundo orden P-Δ (soluciones cerradas)');
{
  // Columna en voladizo con carga axial P y lateral H en el extremo (Timoshenko–Gere, «Theory of Elastic Stability» §1.11):
  //   δ = H/(P k)·(tan kL − kL) ;  M_base = H·tan(kL)/k ;  k = √(P/EI)
  const Lc = 4, EIc = 2e6 * 0.002, Pc = 0.4 * Math.PI ** 2 * EIc / (4 * Lc * Lc), Hc = 1, kc = Math.sqrt(Pc / EIc), n = 8;
  const nod = Array.from({ length: n + 1 }, (_, k) => `${k + 1} 0 ${Lc * k / n}`).join('\n'), bar = Array.from({ length: n }, (_, k) => `${k + 1} ${k + 1} ${k + 2}`).join('\n');
  const gp = block('frame2d', { nudos: nod, secciones: 'C 2e6 1000 0.002', barras: bar, apoyos: '1 E', cargas: `N ${n + 1} ${Hc} ${-Pc}`, combinaciones: 'U = CM', pdelta: true, servicio: 'U' });
  near('Voladizo P-Δ (P = 0.4 Pcr): δ = H(tan kL − kL)/(Pk)', gp('deltax_' + (n + 1), 'm'), Hc * (Math.tan(kc * Lc) - kc * Lc) / (Pc * kc), 0.002);
  near('Voladizo P-Δ: M base = H·tan(kL)/k', Math.abs(gp('R1m', 'tonf*m')), Hc * Math.tan(kc * Lc) / kc, 0.002);
  near('Amplificación ≈ 1/(1 − P/Pcr) (P = 0.4 Pcr)', gp('ampPD'), Hc * (Math.tan(kc * Lc) - kc * Lc) / (Pc * kc) / (Hc * Lc ** 3 / (3 * EIc)), 0.003);
  let err = ''; try { block('frame2d', { nudos: nod, secciones: 'C 2e6 1000 0.002', barras: bar, apoyos: '1 E', cargas: `N ${n + 1} ${Hc} ${-1.2 * Math.PI ** 2 * EIc / (4 * Lc * Lc)}`, combinaciones: 'U = CM', pdelta: true }); } catch (e) { err = e.message; }
  truthy('P > Pcr: error claro de pandeo (sin NaN)', /P-Δ/.test(err) && /pandeo/.test(err), err.slice(0, 90));
  // pórtico: los casos se mantienen lineales; las combinaciones se amplifican
  const gq = block('frame2d', { nudos: '1 0 0\n2 0 4\n3 6 4\n4 6 0', secciones: 'C rect 0.3 0.3 2e6\nV rect 0.3 0.5 2e6', barras: '1 1 2 C\n2 2 3 V\n3 4 3 C', apoyos: '1,4 A', cargas: 'CM: N 2,3 0 -60\nCS: N 2 2 0', combinaciones: 'U = CM + CS', pdelta: true });
  const gl = block('frame2d', { nudos: '1 0 0\n2 0 4\n3 6 4\n4 6 0', secciones: 'C rect 0.3 0.3 2e6\nV rect 0.3 0.5 2e6', barras: '1 1 2 C\n2 2 3 V\n3 4 3 C', apoyos: '1,4 A', cargas: 'CM: N 2,3 0 -60\nCS: N 2 2 0', combinaciones: 'U = CM + CS' });
  truthy('Pórtico articulado: P-Δ amplifica el momento de la columna (> 1.05×)', gq('Mmax_1', 'tonf*m') > 1.05 * gl('Mmax_1', 'tonf*m'), `${gq('Mmax_1', 'tonf*m').toFixed(3)} vs ${gl('Mmax_1', 'tonf*m').toFixed(3)}`);
  truthy('P-Δ: ΣFx y ΣFy de reacciones = cargas (equilibrio de fuerzas)', Math.abs(gq('R1x_U', 'tonf') + gq('R4x_U', 'tonf') + 2) < 1e-6 && Math.abs(gq('R1y_U', 'tonf') + gq('R4y_U', 'tonf') - 120) < 1e-6);
}

section('frame2d — deformación por cortante (Timoshenko), zonas rígidas y apoyos inclinados');
{
  const Es = 2e6, nu = 0.25, Gs = Es / (2 * (1 + nu)), Ir = 0.3 * 0.8 ** 3 / 12, Asr = 0.24 * 5 / 6;
  let t = block('frame2d', { nudos: '1 0 0\n2 2 0', secciones: `S rect 0.3 0.8 ${Es}`, barras: '1 1 2', apoyos: '1 E', cargas: 'N 2 0 -10', cortante: String(nu) });
  near('Voladizo corto: δ = PL³/3EI + PL/(G·As)', -t('deltay_2', 'm'), 10 * 8 / (3 * Es * Ir) + 10 * 2 / (Gs * Asr), 1e-6);
  t = block('frame2d', { nudos: '1 0 0\n2 6 0', secciones: `S rect 0.3 0.8 ${Es}`, barras: '1 1 2', apoyos: '1 A\n2 Ry', cargas: 'U 1 2', cortante: String(nu), deflim: '1e6' });
  near('Simple con cortante: δ = 5wL⁴/384EI + wL²/(8GAs)', t('delta_1', 'mm'), (5 * 2 * 6 ** 4 / (384 * Es * Ir) + 2 * 36 / (8 * Gs * Asr)) * 1000, 2e-3);
  // empotramiento perfecto con cortante: carga puntual en a = 1 m (L = 4) vs. modelo con nudo bajo la carga
  const a1 = block('frame2d', { nudos: '1 0 0\n2 4 0', secciones: `S rect 0.3 1.2 ${Es}`, barras: '1 1 2', apoyos: '1 E\n2 E', cargas: 'P 1 10 1\nM 1 3 2.5\nT 1 2 5 0.5 3', cortante: String(nu) });
  const a2 = block('frame2d', { nudos: '1 0 0\n2 4 0\n3 1 0\n4 2.5 0\n5 0.5 0\n6 3 0', secciones: `S rect 0.3 1.2 ${Es}`, barras: '1 1 5\n2 5 3\n3 3 4\n4 4 6\n5 6 2', apoyos: '1 E\n2 E', cargas: 'N 3 0 -10\nN 4 0 0 3\nT 2 2 2.6 \nT 3 2.6 4.4\nT 4 4.4 5', cortante: String(nu) });
  near('MEP con cortante (forma de Timoshenko) = modelo subdividido: M_A', a1('R1m', 'tonf*m'), a2('R1m', 'tonf*m'), 1e-9);
  near('MEP con cortante: M_B', a1('R2m', 'tonf*m'), a2('R2m', 'tonf*m'), 1e-9);
  // zonas rígidas: equivalentes a barras muy rígidas explícitas
  const z1 = block('frame2d', { nudos: '1 0 0\n2 0 4\n3 6 4\n4 6 0', secciones: 'C rect 0.4 0.6 2e6\nV rect 0.3 0.6 2e6', barras: '1 1 2 C zj=0.3\n2 2 3 V zi=0.2 zj=0.2\n3 4 3 C zj=0.3', apoyos: '1,4 E', cargas: 'N 2 5 0\nU 2 3' });
  const z2 = block('frame2d', { nudos: '1 0 0\n2 0 4\n3 6 4\n4 6 0\n5 0 3.7\n6 0.2 4\n7 5.8 4\n8 6 3.7', secciones: 'C rect 0.4 0.6 2e6\nV rect 0.3 0.6 2e6\nR 2e10 10 10', barras: '1 1 5 C\n1r 5 2 R\n2a 2 6 R\n2 6 7 V\n2b 7 3 R\n3 4 8 C\n3r 8 3 R', apoyos: '1,4 E', cargas: 'N 2 5 0\nU 2a,2,2b 3' });
  near('Zonas rígidas zi/zj = barras rígidas explícitas: Δx nudo 2', z1('deltax_2', 'mm'), z2('deltax_2', 'mm'), 1e-4);
  near('Zonas rígidas: momento en la base', z1('R1m', 'tonf*m'), z2('R1m', 'tonf*m'), 1e-4);
  near('Zonas rígidas: M− de diseño de la viga en la cara del nudo', z1('Mneg_2', 'tonf*m'), z2('Mneg_2', 'tonf*m'), 1e-4);
  near('Zonas rígidas: M+ de la viga', z1('Mpos_2', 'tonf*m'), z2('Mpos_2', 'tonf*m'), 1e-4);
  const z3 = block('frame2d', { nudos: '1 0 0\n2 0 4\n3 6 4\n4 6 0', secciones: 'C rect 0.4 0.6 2e6\nV rect 0.3 0.6 2e6', barras: '1 1 2 C\n2 2 3 V\n3 4 3 C', apoyos: '1,4 E', cargas: 'N 2 5 0\nU 2 3', brazos: '1' });
  const z4 = block('frame2d', { nudos: '1 0 0\n2 0 4\n3 6 4\n4 6 0', secciones: 'C rect 0.4 0.6 2e6\nV rect 0.3 0.6 2e6', barras: '1 1 2 C zj=0.3\n2 2 3 V zi=0.3 zj=0.3\n3 4 3 C zj=0.3', apoyos: '1,4 E', cargas: 'N 2 5 0\nU 2 3' });
  near('Zonas rígidas automáticas (factor 1 = medio peralte transversal)', z3('deltax_2', 'mm'), z4('deltax_2', 'mm'), 1e-9);
  // rodillo sobre plano inclinado α = 30°: R normal al plano → Rx = −(P/2)·tan α
  const ri = block('frame2d', { nudos: '1 0 0\n2 6 0', secciones: 'S 2e6 0.2 0.005', barras: '1 1 2', apoyos: '1 A\n2 RI 30', cargas: 'P 1 10 3' });
  near('Rodillo inclinado 30°: R2x = −(P/2)·tan 30°', ri('R2x', 'tonf'), -5 * Math.tan(Math.PI / 6));
  near('Rodillo inclinado: R2y = P/2', ri('R2y', 'tonf'), 5);
  near('Rodillo inclinado: N de la viga = R2x (compresión)', -ri('Nc_1', 'tonf'), -5 * Math.tan(Math.PI / 6));
}

section('frame2d — análisis modal (masas concentradas)');
{
  // columna en voladizo con masa en el extremo: T = 2π√(m/k), k = 3EI/L³
  const mo = block('frame2d', { nudos: '1 0 0\n2 0 3', secciones: 'C 2e6 1000 0.002', barras: '1 1 2', apoyos: '1 E', cargas: 'N 2 1 0', masas: '2 9.80665 x' });
  near('Voladizo con masa: T = 2π√(m·L³/3EI)', mo('T1', 's'), 2 * Math.PI * Math.sqrt(27 / (3 * 2e6 * 0.002)), 1e-9);
  near('Voladizo: masa efectiva = 100 %', mo('MPx1'), 1, 1e-9);
  // edificio de cortante de 3 pisos (vigas infinitamente rígidas): ω² = (k/m)·[2 − 2cos((2j−1)π/7)]
  const hs = 3, kst = 2 * 12 * 2e6 * 0.002 / hs ** 3, mst = 20 / 9.80665;
  const sb = block('frame2d', { nudos: '1 0 0\n2 6 0\n3 0 3\n4 6 3\n5 0 6\n6 6 6\n7 0 9\n8 6 9', secciones: 'C 2e6 1000 0.002\nV 2e6 1000 1000', barras: '1 1 3 C\n2 2 4 C\n3 3 5 C\n4 4 6 C\n5 5 7 C\n6 6 8 C\n7 3 4 V\n8 5 6 V\n9 7 8 V', apoyos: '1,2 E', cargas: 'N 7 1 0', masas: '3-8 10 x', modos: '3' });
  for (let j = 1; j <= 3; j++) near(`Edificio de cortante: T${j}`, sb('T' + j, 's'), 2 * Math.PI / Math.sqrt(kst / mst * (2 - 2 * Math.cos((2 * j - 1) * Math.PI / 7))), 2e-4);
  near('Σ masa efectiva de 3 modos = 100 %', sb('SMPx'), 1, 1e-6);
  // masas a partir de las cargas (fuente de masa CM + 0.25 CV)
  const ms = block('frame2d', { nudos: '1 0 0\n2 0 3\n3 6 3\n4 6 0', secciones: 'C 2e6 1000 0.002\nV 2e6 1000 1000', barras: '1 1 2 C\n2 2 3 V\n3 4 3 C', apoyos: '1,4 E', cargas: 'CM: U 2 3\nCV: U 2 2', masas: '= CM + 0.25 CV x', modos: '1' });
  near('Masa de las cargas: T = 2π√((wL)/(g·2·12EI/h³))', ms('T1', 's'), 2 * Math.PI * Math.sqrt(3.5 * 6 / 9.80665 / (2 * 12 * 2e6 * 0.002 / 27)), 2e-4);
}

section('frame2d — sintaxis, errores y rendimiento');
{
  let err = ''; try { block('frame2d', { nudos: '1 0 0\n2 4 0', secciones: 'S 2e6 0.1 0.001', barras: '1 1 3', apoyos: '1 E', cargas: 'N 2 0 -1' }); } catch (e) { err = e.message; }
  truthy('Nudo inexistente: el mensaje nombra el nudo', /nudo «3» no existe/.test(err), err.slice(0, 80));
  err = ''; try { block('frame2d', { nudos: '1 0 0\n2 0 4\n3 6 4\n4 6 0', secciones: 'S 2e6 0.1 0.001', barras: '1 1 2 rj\n2 2 3\n3 4 3 rj', apoyos: '1,4 A', cargas: 'N 2 1 0' }); } catch (e) { err = e.message; }
  truthy('Mecanismo de ladeo: indica los nudos y la dirección', /mecanismo/.test(err) && /nudos 3, 2|nudos 2, 3/.test(err) && /en x/.test(err), err.slice(0, 110));
  const pm = block('frame2d', { nudos: '1 0 0\n2 6 0', secciones: 'S 2e6 1 0.001', barras: '1 1 2', apoyos: '1 A\n2 Ry', cargas: 'CM: U 1 1\nSX: N 2 1 0\nSY: U 1 0.2', combinaciones: 'U = 1.2 CM ± SX ± 0.3 SY' });
  truthy('Dos signos ± generan 4 combinaciones (Ua…Ud)', ['Ua', 'Ub', 'Uc', 'Ud'].every(k => { try { pm('R1y_' + k, 'tonf'); return true; } catch (e) { return false; } }));
  near('Ud = 1.2 CM − SX − 0.3 SY', pm('R1y_Ud', 'tonf'), (1.2 - 0.3 * 0.2) * 3);
  const pp = block('frame2d', { nudos: '1 0 0\n2 6 3', secciones: 'S 2e6 1 0.001', barras: '1 1 2', apoyos: '1 A\n2 Ry', cargas: 'P 1 10 50% proy' });
  near('Puntual con «proy» no se reduce por la inclinación (R = P/2)', pp('R2y', 'tonf'), 5);
  const rr = block('frame2d', { nudos: '1 0 0\n2 7.6485 0', secciones: 'S 2e6 1 0.001', barras: '1 1 2', apoyos: '1 A\n2 Ry', cargas: 'U 1 2 0 7.65' });
  near('Tramo cargado redondeado (b = 7.65 > L = 7.6485) se acepta', rr('R1y', 'tonf'), 2 * 7.6485 / 2, 1e-3);
  // pórtico de 10 pisos × 10 vanos (210 barras): debe resolverse en pocos segundos
  let nod = '', bar = '', k = 0, ld = '';
  for (let s = 0; s <= 10; s++) for (let b = 0; b <= 10; b++) nod += `${s * 100 + b} ${b * 5} ${s * 3}\n`;
  for (let s = 0; s < 10; s++) for (let b = 0; b <= 10; b++) bar += `${++k} ${s * 100 + b} ${(s + 1) * 100 + b} C\n`;
  for (let s = 1; s <= 10; s++) for (let b = 0; b < 10; b++) { bar += `${++k} ${s * 100 + b} ${s * 100 + b + 1} V\n`; ld += `CM: U ${k} 3\nCV: U ${k} 1\n`; }
  for (let s = 1; s <= 10; s++) ld += `CS: N ${s * 100} ${s} 0\n`;
  const t0 = Date.now();
  const big = block('frame2d', { nudos: nod, secciones: 'C rect 0.5 0.5 2.17e6\nV rect 0.3 0.6 2.17e6', barras: bar, apoyos: '0-10 E', cargas: ld, combinaciones: 'U1 = 1.4 CM + 1.7 CV\nU2 = 1.25(CM + CV) ± CS\nU3 = 0.9 CM ± CS', deriva_caso: 'CS', deriva_f: '6', pdelta: true, masas: '= CM + 0.25 CV x', modos: '6' });
  const dt = Date.now() - t0;
  truthy(`Pórtico de 210 barras con P-Δ y modal resuelto en ${dt} ms (< 4000 ms)`, dt < 4000 && big('T1', 's') > 0.5 && big('ampPD') > 1);
}

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
