// Pruebas de validación — módulo «dynamics» (dinámica estructural)
import { near, truthy, calc, block, runTemplate, section, done, math, TEMPLATES } from './helpers.mjs';
import { settings } from '../src/engine.js';
import * as D from '../src/norms/dynamics.js';

const G = D.G, IN = 0.0254;
const t0 = () => performance.now();

section('Newmark-β y método exacto (Chopra Ej. 5.1, 5.3, 5.4, 5.5, 5.7)');
{
  const m = 0.2533, k = 10, c = 0.1592, dt = 0.1;
  const p = Array.from({ length: 11 }, (_, i) => (i * dt <= 0.6 + 1e-9 ? 10 * Math.sin(Math.PI * i * dt / 0.6) : 0));
  const avg = D.newmarkP({ m, c, k, p, dt });
  near('Newmark promedio u(0.1) = 0.0437 in (Chopra Tabla E5.3)', avg.u[1], 0.0437, 0.002);
  near('Newmark promedio u(0.5) = 1.4309 in', avg.u[5], 1.4309, 0.001);
  near('Newmark promedio u(1.0) = −1.1441 in', avg.u[10], -1.1441, 0.001);
  const lin = D.newmarkP({ m, c, k, p, dt, beta: 1 / 6 });
  near('Newmark lineal u(0.5) = 1.4782 in (Chopra Tabla E5.4)', lin.u[5], 1.4782, 0.001);
  near('Newmark lineal u(1.0) = −1.2208 in', lin.u[10], -1.2208, 0.001);
  // exacto por tramos con carga p: u = recurrencia de Nigam-Jennings con p/m
  const w = Math.sqrt(k / m), z = c / (2 * Math.sqrt(k * m));
  const ex = D.pwExact(p.map(x => -x / m), dt, w, z);
  near('Exacto por tramos u(1.0) = −1.2432 in (Chopra Tabla E5.1)', ex.u[10], -1.2432, 0.002);
  near('Coeficiente A = 0.8129 (Chopra Ej. 5.1)', ex.coef.A, 0.8129, 0.001);
  near("Coeficiente A' = −3.5796", ex.coef.Ap, -3.5796, 0.001);
  const ep = D.newmarkNLP({ m, c, k, fy: 7.5, p, dt });
  near('Elastoplástico u(0.7) = 2.0951 in (Chopra Tabla E5.7)', ep.u[7], 2.0951, 0.001);
  near('Elastoplástico fS(0.8) = 5.789 kip (descarga)', ep.fs[8], 5.789, 0.001);
}

section('Espectro de El Centro (Chopra Fig. 6.4.1, ζ = 2 %)');
{
  const r = D.elCentro();
  truthy('Registro El Centro: 1560 puntos, Δt = 0.02 s', r.ag.length === 1560 && r.dt === 0.02);
  near('PGA El Centro = 0.319 g', D.recordParams(r.ag, r.dt).pga / G, 0.3188, 0.002);
  const sp = D.spectrumNJ(r.ag, r.dt, [0.5, 1, 2], 0.02);
  near('D(Tn = 0.5 s) = 2.67 in', sp[0].D / IN, 2.67, 0.005);
  near('D(Tn = 1 s) = 5.97 in', sp[1].D / IN, 5.97, 0.005);
  near('D(Tn = 2 s) = 7.47 in', sp[2].D / IN, 7.47, 0.005);
  near('A(Tn = 0.5 s)/g = 1.09', sp[0].PSA / G, 1.094, 0.005);
  const s0 = D.spectrumNJ(r.ag, r.dt, [0.02], 0.05)[0];
  near('Sa(T → 0) ≈ PGA', s0.SA / G, 0.3188, 0.03);
  let t = t0(); D.spectrumNJ(r.ag, r.dt, D.logPeriods(0.02, 4, 120), 0.05); const ms = t0() - t;
  truthy('Espectro de 120 periodos en < 100 ms', ms < 100, ms.toFixed(1) + ' ms');
}

section('Bloque thsdof (El Centro)');
{
  settings.sys = 'us';
  const D0 = [['0.5 s', 2.67], ['1 s', 5.97], ['2 s', 7.47]];
  for (const [T, d] of D0) { const g = block('thsdof', { registro: 'elcentro', T, zeta: '0.02', metodo: 'nj' }); near(`thsdof NJ umax(Tn = ${T}) [in]`, g('umax', 'in'), d, 0.005); }
  let g = block('thsdof', { registro: 'elcentro', T: '1 s', zeta: '0.02', metodo: 'avg' });
  near('thsdof Newmark promedio umax(1 s) ≈ 5.93 in', g('umax', 'in'), 5.93, 0.01);
  g = block('thsdof', { registro: 'elcentro', T: '0.5 s', zeta: '0.05', modelo: 'bilineal', metodo: 'avg', Ry: '1', alpha: '0' });
  near('Bilineal con Ry = 1 reproduce la respuesta elástica (μ = 1)', g('mu'), 1, 0.01);
  // comparación con la referencia newmarkEP de algoritmos.md
  const r = D.elCentro(), w = 2 * Math.PI / 0.5;
  const nl = D.newmarkNL(r.ag, r.dt, w, 0.05, 0.25 * w * w * D.spectrumNJ(r.ag, r.dt, [0.5], 0.05)[0].D, 0);
  g = block('thsdof', { registro: 'elcentro', T: '0.5 s', zeta: '0.05', modelo: 'bilineal', metodo: 'avg', Ry: '4', alpha: '0' });
  near('Bilineal Ry = 4: μ del bloque = núcleo', g('mu'), Math.max(...nl.u.map(Math.abs)) / (nl.fs.reduce((a, b) => Math.max(a, Math.abs(b)), 0) / w / w), 0.02);
  truthy('Bilineal Ry = 4: 2 < μ < 5 (Chopra Fig. 7.5.3: μ ≈ Ry en la zona de velocidad)', g('mu') > 2 && g('mu') < 5, 'μ = ' + g('mu').toFixed(3));
  const t = t0(); block('thsdof', { registro: 'elcentro', T: '0.37 s', zeta: '0.03', modelo: 'bilineal', metodo: 'avg', Cy: '0.15', alpha: '0.02' }); const ms = t0() - t;
  truthy('thsdof bilineal en < 300 ms', ms < 300, ms.toFixed(1) + ' ms');
  // registro pegado por el usuario (dos columnas)
  const ec = D.elCentro(); const txt = Array.from(ec.ag.slice(0, 400), (a, i) => (i * 0.02).toFixed(2) + ' ' + (a / G).toFixed(6)).join('\n');
  g = block('thsdof', { registro: 'usuario', datos: txt, unidad: 'g', T: '0.5 s', zeta: '0.02' });
  truthy('Registro del usuario (t, a) se lee y calcula', g('umax', 'in') > 0.5);
}

section('Bloque respspec');
{
  settings.sys = 'si';
  const g = block('respspec', { registro: 'elcentro', zetas: '0.02, 0.05', Tmax: '4 s', Tref: '1 s', Sa: '0.45*min(2.5, 1.5/T)' });
  near('SdT(1 s, ζ = 5 %) = 4.44 in', g('SdT', 'in'), 4.44, 0.005);
  near('SaT(1 s, ζ = 5 %) = 0.454 g', g('SaT'), 0.454, 0.005);
  near('PGA = 0.319 g', g('PGA'), 0.3188, 0.002);
  truthy('Intensidad de Arias El Centro ≈ 1.8 m/s', Math.abs(g('Ia', 'm/s') - 1.8) < 0.15, g('Ia', 'm/s').toFixed(3));
  truthy('Factor de escala E.030 Art. 47.5 calculado (> 1)', g('fesc') > 1);
}

section('Modos y CQC');
{
  near('ρ(β = 0.9, ζ = 5 %) = 0.4730 (Der Kiureghian)', D.rhoCQCw(1, 0.9, 0.05, 0.05), 0.4730, 0.001);
  near('ρ(β = 0.8, ζ = 5 %) = 0.1656', D.rhoCQCw(1, 0.8, 0.05, 0.05), 0.1656, 0.002);
  const ry = D.rayleighCoef(1.0, 0.2, 0.05);
  near('Rayleigh a0 (T = 1.0/0.2 s, ζ = 5 %) = 0.52360', ry.a0, 0.52360, 0.0005);
  near('Rayleigh a1 = 0.002653', ry.a1, 0.002653, 0.001);
  const v = calc('a0 = rayleighA0(1 s, 0.2 s, 0.05)\na1 = rayleighA1(1 s, 0.2 s, 0.05)\nz = zetaRayleigh(0.5 s, a0, a1)\nr = rhoCQC(1 s, 1/0.9 s, 0.05)\nSd = SdSa(0.5, 1 s)\nB = BFEMA440(0.20)\neta = etaEC8(0.10)\nfcc = fccMander(30 MPa, 3 MPa)\nLp = LpPP(3000 mm, 25 mm, 420 MPa)\nSaE = SaElCentro(1 s, 0.02)\nC1 = C1ASCE41(3, 0.5 s, 130)');
  near('zetaRayleigh(0.5 s) = 3.75 %', v('z'), 0.0375, 0.001);
  near('rhoCQC(1 s, 1.111 s) = 0.4730', v('r'), 0.4730, 0.001);
  near('SdSa(0.5 g, 1 s) = 124.2 mm', v('Sd', 'mm'), 0.5 * G / (4 * Math.PI ** 2) * 1000, 0.001);
  near('B(20 %) FEMA 440 = 1.50', v('B'), 4 / (5.6 - Math.log(20)), 0.001);
  near('η(10 %) EC8 = 0.816', v('eta'), Math.sqrt(10 / 15), 0.001);
  near("f'cc Mander (30 MPa, f'l = 3 MPa) = 46.95 MPa", v('fcc', 'MPa'), 46.95, 0.001);
  near('Lp Paulay-Priestley = 0.08·3000 + 0.022·25·420 = 471 mm', v('Lp', 'mm'), 471, 0.001);
  near('SaElCentro(1 s, 2 %) = 0.610', v('SaE'), 0.610, 0.005);
  near('C1 ASCE 41 (μ = 3, Te = 0.5, a = 130) = 1.0615', v('C1'), 1 + 2 / (130 * 0.25), 0.001);
}

section('Edificio de 5 pisos de Chopra (THA modal, El Centro, ζ = 5 %)');
{
  settings.sys = 'us';
  const pre = 'W_i = [100, 100, 100, 100, 100] kip\nk_i = [31.54, 31.54, 31.54, 31.54, 31.54] kip/in\nh_i = [12, 12, 12, 12, 12] ft';
  const t = t0();
  const g = block('thmdof', { masas: 'W_i', rigideces: 'k_i', alturas: 'h_i', registro: 'elcentro', zeta: '0.05', comb: 'CQC' }, pre);
  const ms = t0() - t;
  near('T1 = 2.0007 s', g('T1', 's'), 2.0007, 0.0005);
  near('T2 = 0.6854 s', g('T2', 's'), 0.6854, 0.0005);
  near('T5 = 0.2967 s', g('T5', 's'), 0.2967, 0.0005);
  near('Techo u5,max = 6.840 in (Chopra ≈ 6.85)', g('u_techo', 'in'), 6.840, 0.002);
  near('Cortante basal Vb,max = 73.20 kip (Chopra ≈ 73.3)', g('Vbmax', 'kip'), 73.20, 0.002);
  near('RSA techo CQC = 6.793 in', g('u_rsa', 'in'), 6.793, 0.003);
  near('RSA Vb CQC = 66.45 kip', g('Vb_rsa', 'kip'), 66.45, 0.003);
  truthy('thmdof de 5 pisos en < 300 ms', ms < 300, ms.toFixed(1) + ' ms');
  const gr = block('thmdof', { masas: 'W_i', rigideces: 'k_i', alturas: 'h_i', registro: 'elcentro', amort: 'rayleigh', zeta: '0.05', modosR: '1, 2', comb: 'SRSS' }, pre);
  truthy('Rayleigh (modos 1 y 2): respuesta del techo cercana a la modal (±5 %)', Math.abs(gr('u_techo', 'in') / 6.84 - 1) < 0.05, gr('u_techo', 'in').toFixed(3) + ' in');
}

section('ATC-40 espectro de capacidad (SOFiSTiK BE36 = ATC-40 §8.3.3.3)');
{
  const cap = [[48.77, 2.49], [71.37, 3.03], [96.01, 3.39], [199.14, 3.73]].map(([d, a]) => [d / 1000, a]);
  const atc = (Ca, Cv, type) => D.atc40CSM(cap, (T) => Math.min(2.5 * Ca, Cv / T) * G, Cv / (2.5 * Ca), type);
  let r = atc(0.40, 0.40, 'C');
  near('Suelo SB tipo C: βeff = 9.41 %', r.beff, 9.41, 0.003);
  near('Suelo SB tipo C: Sd,p = 85.55 mm (ref. SOFiSTiK 83.36)', r.dp * 1000, 85.55, 0.003);
  near('Suelo SB tipo C: Sa,p = 3.237 m/s² (ref. 3.24)', r.ap, 3.237, 0.003);
  near('Benchmark SOFiSTiK SB: Sd,p = 83.36 mm (±3 %)', r.dp * 1000, 83.36, 0.03);
  r = atc(0.44, 0.64, 'C');
  near('Suelo SD tipo C: βeff = 14.63 %', r.beff, 14.63, 0.003);
  near('Suelo SD tipo C: Sd,p = 150.32 mm (ref. SOFiSTiK 149.86)', r.dp * 1000, 149.86, 0.01);
  near('Suelo SD tipo C: Sa,p = 3.569 m/s² (ref. 3.63)', r.ap, 3.63, 0.02);
  r = atc(0.40, 0.40, 'A');
  near('Suelo SB tipo A: βeff = 13.81 % (punto fijo convergido 13.89)', r.beff, 13.81, 0.01);
  near('Suelo SB tipo A: Sd,p = 71.76 mm', r.dp * 1000, 71.76, 0.005);
  const f = D.fema440ELM(cap, (T) => Math.min(2.5 * 0.4, 0.4 / T) * G);
  truthy('FEMA 440 converge y da un punto entre ATC tipo A y C', f.ok && f.dp * 1000 > 70 && f.dp * 1000 < 95, (f.dp * 1000).toFixed(2) + ' mm');
}

section('Pushover + N2 (algoritmos.md §11: 3 pisos, EC8 tipo 1, ag = 0.3g, suelo C)');
{
  settings.sys = 'si';
  const pre = 'W_i = [100, 100, 80]*9.80665 kN\nk_i = [80000, 70000, 60000] kN/m\nVy_i = [1500, 1300, 1000] kN\nh_i = [3.5, 3, 3] m';
  const ec8 = '0.30*1.15*si(T < 0.2, 1 + T/0.2*1.5, si(T < 0.6, 2.5, si(T < 2, 2.5*0.6/T, 2.5*0.6*2/T^2)))';
  const t = t0();
  const g = block('pushover', { masas: 'W_i', rigideces: 'k_i', Vy: 'Vy_i', alturas: 'h_i', alpha: '0.05', patron: 'modal', druEnd: '0.05', Sa: ec8, Tc: '0.6 s', metodo: 'N2', tipo: 'B', nivel: 'LS' }, pre);
  const ms = t0() - t;
  near('Γ = 1.2619', g('Gam'), 1.2619, 0.001);
  near('m* = 198.98 t', g('mstar', 'kg') / 1000, 198.98, 0.001);
  near('Fy* = 1260.3 kN', g('Fystar', 'kN'), 1260.3, 0.003);
  near('dy* = 39.47 mm', g('dystar', 'mm'), 39.47, 0.005);
  near('T* = 0.4960 s', g('Tstar', 's'), 0.4960, 0.002);
  near('Desplazamiento objetivo del techo N2 = 70.04 mm', g('dN2', 'mm'), 70.04, 0.003);
  near('Primera fluencia: Vb = 1500 kN (entrepiso 1)', g('Vyb', 'kN'), 1500, 0.001);
  near('Deriva máxima en el objetivo = 0.01181', g('derivamax'), 0.01181, 0.01);
  truthy('pushover + 4 métodos en < 300 ms', ms < 300, ms.toFixed(1) + ' ms');
  const p = D.pushoverShear({ m: [100e3, 100e3, 80e3], k: [80e6, 70e6, 60e6], Vy: [1500e3, 1300e3, 1000e3], h: [3.5, 3, 3], alpha: 0.05 });
  near('Techo en la primera fluencia = 45.82 mm', p.ev[0].d * 1000, 45.82, 0.001);
  near('T1 = 0.4899 s', p.modes[0].T, 0.4899, 0.001);
}

section('Materiales y momento–curvatura');
{
  const fcc = D.manderFcc(30, 3), mc = D.manderCurve(30, fcc, 0.002, 5000 * Math.sqrt(30));
  near("Mander f'cc(30; 3) = 46.95 MPa", fcc, 46.95, 0.001);
  near('Mander εcc = 0.00765', mc.ecc, 0.00765, 0.002);
  near('Mander r = 1.289', mc.r, 1.289, 0.002);
  near("Mander f'cc/f'co = 1.565 para f'l/f'co = 0.10 (Mander 1988 Fig. 4, confinamiento igual)", fcc / 30, 1.565, 0.002);
  near("Mander f'cc/f'co para f'l/f'co = 0.30 (ábaco de Mander 1988 Fig. 4: ≈ 2.3)", D.manderFcc(30, 9) / 30, 2.29, 0.01);
  const ss = D.steelModel({ fy: 420, Es: 200000, model: 'park', esh: 0.008, esu: 0.09, fsu: 1.35 * 420 });
  near('Park-Paulay: σ(εsu) = fsu', ss(0.09), 1.35 * 420, 0.002);
  near('Park-Paulay: σ(εsh) = fy', ss(0.008), 420, 0.001);
  settings.sys = 'si';
  const g = block('momcurv', { b: '300 mm', h: '500 mm', rec: '40 mm', fc: '28 MPa', fy: '420 MPa', Es: '200000 MPa', capas: '2 16mm 60 mm\n3 8 440 mm', estribo: '3', s: '100 mm', nlb: '2', nlh: '2', fyh: '420 MPa', P: '0 kN', concreto: 'hognestad', k3: '1', acero: 'epp', traccion: false, L: '2 m' });
  near("M'y = 246.9 kN·m (algoritmos.md §14; mano 249.9)", g('My1', 'kN*m'), 246.9, 0.01);
  near("φ'y = 7.5e-3 1/m (ref. 7.75e-3 con paso grueso; mano 7.33e-3)", g('phiy1', 'm^-1'), 7.5e-3, 0.04);
  near('Mu = 257.3 kN·m (Whitney Mn = 253.8)', g('Mu', 'kN*m'), 257.3, 0.005);
  near('φu = 4.40e-2 1/m', g('phiu', 'm^-1'), 0.0440, 0.01);
  const t = t0();
  const gm = block('momcurv', { b: '40 cm', h: '60 cm', rec: '4 cm', fc: '28 MPa', fy: '420 MPa', capas: '4 8 6.7 cm\n2 8 30 cm\n4 8 53.3 cm', estribo: '3', s: '10 cm', nlb: '2', nlh: '3', fyh: '420 MPa', P: '1200 kN', concreto: 'mander', acero: 'park', traccion: true, L: '1.5 m' });
  const ms = t0() - t;
  truthy('Columna Mander: f\'cc > f\'c y εcu > 0.004', gm('fcc', 'MPa') > 28 && gm('ecu') > 0.004, `f'cc = ${gm('fcc', 'MPa').toFixed(2)} MPa, εcu = ${gm('ecu').toFixed(4)}`);
  truthy('Columna Mander: μφ > 8 y Mn > M\'y', gm('muphi') > 8 && gm('Mn', 'kN*m') > gm('My1', 'kN*m'), 'μφ = ' + gm('muphi').toFixed(2));
  truthy('momcurv Mander en < 300 ms', ms < 300, ms.toFixed(1) + ' ms');
}

section('SIMQKE (E.030 Z4-S2, R = 1)');
{
  const pre = 'Z = 0.45\nS = 1.05\nTp = 0.6 s\nTl = 2.0 s\nU = 1';
  const t = t0();
  const g = block('simqke', { Sa: 'Z*U*CE030d(T, Tp, Tl)*S', pgaref: 'Z*U*S', nombre: 'tst' }, pre);
  const ms = t0() - t;
  truthy('Razón espectral en 0.03–4 s entre 0.90 y 1.25', g('rmin') >= 0.9 && g('rmax') <= 1.25, `${g('rmin').toFixed(3)}–${g('rmax').toFixed(3)}`);
  truthy('PGA/ZUS entre 1.0 y 1.3 (algoritmos.md §13: 0.526/0.473 = 1.11)', g('rPGA') > 1 && g('rPGA') < 1.3, g('rPGA').toFixed(3));
  truthy('SIMQKE en < 400 ms', ms < 400, ms.toFixed(1) + ' ms');
  const h = block('thsdof', { registro: 'simqke', nombre: 'tst', T: '0.5 s', zeta: '0.05' }, pre);
  truthy('El registro sintético se usa en thsdof', h('umax', 'mm') > 0);
}

section('Plantillas del módulo');
{
  const ids = TEMPLATES.filter(t => t.cat === 'Dinámica estructural').map(t => t.id);
  truthy('6 plantillas en la categoría «Dinámica estructural»', ids.length >= 6, ids.join(', '));
  for (const id of ids) {
    const t = t0(); const g = runTemplate(id); const ms = t0() - t;
    const r = g.res;
    truthy(`${id}: sin errores, todas las verificaciones cumplen (${r.ctx.checks.length})`, r.ctx.errors.length === 0 && r.ctx.checks.length > 0 && r.ctx.checks.every(c => c.ok), r.ctx.errors.map(e => JSON.stringify(e)).join(' ') + r.ctx.checks.filter(c => !c.ok).map(c => c.label).join(' | ') + ` (${ms.toFixed(0)} ms)`);
  }
  const g = runTemplate('dy-5pisos-chopra');
  near('Plantilla 5 pisos: u_techo = 6.840 in', g('u_techo', 'in'), 6.840, 0.002);
  const g2 = runTemplate('dy-sdof-elcentro');
  near('Plantilla 1 GDL: D(Tn = 1 s) = 5.97 in', g2('umax_b', 'in'), 5.97, 0.005);
  const g3 = runTemplate('dy-pushover-n2');
  truthy('Plantilla pushover: deriva en LS ≤ 2 %', g3('derivamax') <= 0.02, g3('derivamax').toFixed(5));
  // datos absurdos: resistencia muy baja → no cumple
  const bad = runTemplate('dy-pushover-n2', (d) => { const b = d.blocks.find(x => x.type === 'calc' && /Vy_i =/.test(x.src)); b.src = b.src.replace('[3200, 2800, 2400, 1700]', '[900, 800, 700, 500]'); });
  truthy('Pushover con resistencias muy bajas no produce «todas cumplen»', bad.res.ctx.errors.length > 0 || bad.res.ctx.checks.some(c => !c.ok));
}
void math;
done();
