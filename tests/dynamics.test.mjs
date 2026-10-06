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

section('Revisión: contraste con OpenSeesPy 3.7 (docs/referencias/revision-dynamics.md)');
{
  const r = D.elCentro();
  // 1 GDL elastoplástico (Steel01 b = 0, Newmark promedio con el mismo subpaso): Tn = 0.5 s, ζ = 5 %, Ry = 4
  { const w = 2 * Math.PI / 0.5, u0 = D.spectrumNJ(r.ag, r.dt, [0.5], 0.05)[0].D, nl = D.newmarkNL(r.ag, r.dt, w, 0.05, w * w * u0 / 4, 0);
    near('OpenSees 1 GDL EP: umax = 0.044304 m (pico en subpasos)', nl.upk, 0.044304, 0.001);
    near('OpenSees 1 GDL EP: u residual = −0.030895 m', nl.u[nl.u.length - 1], -0.030895, 0.001);
    truthy('Newton-Raphson converge en todos los pasos', nl.nfail === 0); }
  { const w = 2 * Math.PI / 1, u0 = D.spectrumNJ(r.ag, r.dt, [1], 0.05)[0].D, nl = D.newmarkNL(r.ag, r.dt, w, 0.05, w * w * u0 / 2, 0.1);
    near('OpenSees 1 GDL bilineal α = 0.1, Ry = 2: umax = 0.086679 m', nl.upk, 0.086679, 0.001); }
  // edificio de 5 pisos de Chopra no lineal (zeroLength + Steel01, Rayleigh βK_init, columna ficticia sin amortiguamiento)
  const kip = 4448.2216, inch = 0.0254, m = Array(5).fill(100 * kip / G), k = Array(5).fill(31.54 * kip / inch), h = Array(5).fill(12 * 0.3048);
  const md = D.shearModes(m, k), ry = D.rayleighCoef(md[0].T, md[2].T, 0.05), ag = r.ag.map(x => 1.5 * x);
  const VyOf = (f) => [1, 0.95, 0.85, 0.7, 0.45].map(x => x * f * 500 * kip * 0.4);
  const run = (f, alpha, pdelta) => D.nlShearTH({ m, k, Vy: VyOf(f), alpha, h, ag, dt: r.dt, a0: ry.a0, a1: ry.a1, pdelta, hmax: md[4].T / 20 });
  let t = t0(); let R = run(1e9, 0, false); const ms = t0() - t;
  near('OpenSees 5 pisos lineal (Rayleigh 1-3): techo = 0.26193 m', R.uPk[4], 0.26193, 0.0005);
  R = run(0.4, 0.03, false);
  near('OpenSees 5 pisos bilineal α = 0.03: techo = 0.23924 m', R.uPk[4], 0.23924, 0.001);
  near('OpenSees 5 pisos bilineal: deriva 1 = 0.0898 m', R.drPk[0], 0.0898, 0.003);
  R = run(0.4, 0.03, true);
  near('OpenSees 5 pisos bilineal + P-Δ: techo = 0.33457 m', R.uPk[4], 0.33457, 0.002);
  near('OpenSees 5 pisos bilineal + P-Δ: residual 1 = −0.1420 m', R.dres[0], -0.1420, 0.005);
  R = run(0.3, 0, true);
  truthy('Colapso dinámico por P-Δ (EP, δ/h > 10 %) en t ≈ 11.18 s como OpenSees', R.tCol !== null && Math.abs(R.tCol - 11.18) < 0.1, 't = ' + R.tCol);
  truthy('nlShearTH 5 pisos (3120 pasos) en < 150 ms', ms < 150, ms.toFixed(1) + ' ms');
  // M–φ: Hognestad (Concrete01 con fpcu = 0.85f''c) + Steel01 b = 0.01, sin tracción, fibras idénticas
  const mc = D.momentCurvature({ b: 300, h: 500, cover: 40, dbh: 10, s: 100, nlb: 2, nlh: 2, fyh: 420, fc: 30, conc: 'hognestad', k3: 0.85, ecuH: 0.0038, tension: false, steel: { fy: 420, Es: 200000, model: 'bilineal', b: 0.01, esu: 0.1, fsu: 567 }, layers: [{ d: 60, As: 1473, n: 3, db: 25 }, { d: 440, As: 1473, n: 3, db: 25 }], P: 0, nf: 120 });
  const Mat = (phi) => { const p = mc.pts; for (let i = 1; i < p.length; i++) if (p[i].phi >= phi) return (p[i - 1].M + (p[i].M - p[i - 1].M) * (phi - p[i - 1].phi) / (p[i].phi - p[i - 1].phi)) / 1e6; return NaN; };
  near('OpenSees M–φ: M(φ = 6.615e-6/mm) = 224.744 kN·m', Mat(6.615e-6), 224.744, 0.002);
  near('OpenSees M–φ: M(φ = 1.6979e-5/mm) = 250.298 kN·m', Mat(1.69785e-5), 250.298, 0.002);
  near('OpenSees M–φ: M(φ = 5.020e-5/mm) = 265.640 kN·m', Mat(5.0200e-5), 265.640, 0.002);
}

section('Revisión: confinamiento triaxial de Mander (f\'lx ≠ f\'ly)');
{
  for (const x of [0.05, 0.1, 0.3]) near(`Superficie de 5 parámetros con f'l1 = f'l2 = ${x}f'co = fórmula cerrada`, D.manderFccBiaxial(1, x, x), D.manderFcc(1, x), 0.0005);
  near("f'cc/f'co (f'l1 = 0, f'l2 = 0.2) = 1.260 (ábaco de Mander Fig. 4: ≈ 1.26)", D.manderFccBiaxial(1, 0, 0.2), 1.260, 0.003);
  near("Chang-Mander (1994) aproxima la superficie (0.05; 0.2) a ±1 %", D.changManderFcc(1, 0.05, 0.2), D.manderFccBiaxial(1, 0.05, 0.2), 0.01);
  truthy("f'l promedio sobrestima f'cc (0.05; 0.2): 1.678 vs 1.527", D.manderFcc(1, 0.125) > 1.09 * D.manderFccBiaxial(1, 0.05, 0.2));
  const p = { b: 400, h: 600, cover: 40, dbh: 9.5, s: 100, nlb: 3, nlh: 2, fyh: 420, esuh: 0.09, fc: 28, layers: [{ d: 67, As: 2040, n: 4, db: 25.4 }, { d: 300, As: 1020, n: 2, db: 25.4 }, { d: 533, As: 2040, n: 4, db: 25.4 }] };
  const ct = D.confinementRect(p), cp = D.confinementRect({ ...p, confMode: 'promedio' });
  truthy("Columna 40 × 60: f'cc triaxial ≤ promedio y ≥ mínimo", ct.fcc <= cp.fcc && ct.fcc >= D.manderFcc(28, Math.min(ct.flb, ct.flh)), `${ct.fcc.toFixed(2)} / ${cp.fcc.toFixed(2)} MPa`);
  const v = calc('f2 = fccMander2(30 MPa, 1.5 MPa, 6 MPa)');
  near("fccMander2(30; 1.5; 6 MPa) = superficie", v('f2', 'MPa'), D.manderFccBiaxial(30, 1.5, 6), 1e-6);
}

section('Revisión: pushover con P-Δ y degradación, ASCE 41 y N2');
{
  const base = { m: [100e3, 100e3, 80e3], k: [80e6, 70e6, 60e6], Vy: [1500e3, 1300e3, 1000e3], h: [3.5, 3, 3], alpha: 0.05, fcr: 0.4, r2: 0.5 };
  const ex = D.pushoverShear(base), inc = D.pushoverShear({ ...base, pdelta: true, fP: 0 });
  near('Solución en serie con θ = 0 reproduce la curva exacta (d = 0.08 m)', inc.stateAt(0.08).Vb, ex.stateAt(0.08).Vb, 1e-9);
  const pd = D.pushoverShear({ ...base, pdelta: true });
  near('P-Δ: rigidez inicial = Σ(1/(k − θ))⁻¹ con el patrón', pd.curve[1].Vb / pd.curve[1].d, 1 / pd.Sx.reduce((a, x, i) => a + x / (base.k[i] - pd.theta[i]), 0), 1e-6);
  const dg = D.pushoverShear({ ...base, pdelta: true, cap: { dr: 0.015, ac: 0.1, res: 0.2 } });
  const last = dg.curve[dg.curve.length - 1], pk = dg.curve.reduce((a, c) => (c.Vb > a.Vb ? c : a));
  truthy('Degradación: rama descendente y localización en el entrepiso 1 (los demás descargan)', last.Vb < 0.9 * pk.Vb && last.dr[1] < pk.dr[1] && last.dr[0] / 3.5 > 0.04, `Vb ${(pk.Vb / 1e3).toFixed(0)} → ${(last.Vb / 1e3).toFixed(0)} kN`);
  // ASCE 41: curva bilineal exacta → idealización recupera Vy y Ke
  const cb = [[0.01, 1000], [0.05, 1000 + 0.05 * 1e5 * 0.04]];
  const id = D.idealizeASCE41(D.tab(cb), 0.05);
  near('ASCE 41 §7.4.3.2.4: curva bilineal → Vy = 1000', id.Vy, 1000, 1e-4);
  near('ASCE 41: Ke = Ki', id.Ke, 1e5, 1e-4);
  const cm = D.coefMethod(cb, 10000, () => 0.5 * G, 0.5, 1.3, 130, 1);
  near('ASCE 41: μstrength = Sa/(Vy/W) = 0.5/0.1 = 5', cm.mu, 5, 1e-6);
  near('ASCE 41: C1 = 1 + 4/(130·0.25) = 1.1231', cm.C1, 1 + 4 / (130 * 0.25), 1e-6);
  const cn = [[0.02, 1000], [0.05, 900], [0.10, 500]];
  const cmn = D.coefMethod(cn, 10000, () => 0.5 * G, 0.6, 1.2, 130, 1, { alphaPD: -0.02 });
  truthy('ASCE 41 Ec. 7-32: pendiente negativa → μmax finito', cmn.a2 < 0 && isFinite(cmn.mumax), `α2 = ${cmn.a2.toFixed(3)}, μmax = ${cmn.mumax.toFixed(2)}`);
  const n2 = D.n2Method([[0.002, 2], [0.3, 2.2]], () => 30, 8.0);
  truthy('N2: d*t ≤ 3d*et (EC8-1 B.5)', n2.cap3 && Math.abs(n2.dt - 3 * n2.det) < 1e-12, n2.regla);
}

section('Bloque thnl (tiempo-historia no lineal)');
{
  settings.sys = 'us';
  const pre = 'W_i = [100, 100, 100, 100, 100] kip\nk_i = [31.54, 31.54, 31.54, 31.54, 31.54] kip/in\nh_i = [12, 12, 12, 12, 12] ft\nVy_i = [1e5, 1e5, 1e5, 1e5, 1e5] kip';
  let t = t0();
  const g = block('thnl', { masas: 'W_i', rigideces: 'k_i', Vy: 'Vy_i', alturas: 'h_i', alpha: '0', registro: 'elcentro', zeta: '0.05', modosR: '1, 2' }, pre);
  const ms = t0() - t;
  const gm = block('thmdof', { masas: 'W_i', rigideces: 'k_i', alturas: 'h_i', registro: 'elcentro', amort: 'rayleigh', zeta: '0.05', modosR: '1, 2' }, pre);
  near('thnl elástico = superposición modal con el mismo Rayleigh (techo)', g('u_techo', 'in'), gm('u_techo', 'in'), 0.005);
  truthy('thnl de 5 pisos en < 300 ms', ms < 300, ms.toFixed(1) + ' ms');
  const w = block('thnl', { masas: 'W_i', rigideces: 'k_i', Vy: '[5, 5, 4, 3, 2] kip', alturas: 'h_i', alpha: '0', registro: 'elcentro', escala: '2', zeta: '0.05', pdelta: true, dlim: '0.02' }, pre);
  truthy('Resistencia muy baja + P-Δ → colapso → NO CUMPLE sin NaN', w.ctx.checks.some(c => !c.ok) && !/NaN/.test(w.html));
}

section('Plantillas del módulo');
{
  const ids = TEMPLATES.filter(t => t.cat === 'Dinámica estructural').map(t => t.id);
  truthy('7 plantillas en la categoría «Dinámica estructural»', ids.length >= 7, ids.join(', '));
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
  // datos extremos en cada plantilla: sin errores, sin NaN y con al menos un NO CUMPLE
  const setSrc = (re, from, to) => (d) => { const b = d.blocks.find(x => x.type === 'calc' && re.test(x.src)); b.src = b.src.replace(from, to); };
  const extremos = [
    ['dy-sdof-elcentro', setSrc(/mu_disp =/, 'mu_disp = 6', 'mu_disp = 1.2')],
    ['dy-espectro-e030', setSrc(/fesc_max =/, 'fesc_max = 4', 'fesc_max = 0.5')],
    ['dy-5pisos-chopra', setSrc(/dlim =/, 'dlim = 0.020', 'dlim = 0.0005')],
    ['dy-nl-cortante', setSrc(/Cy = 0.20/, 'Cy = 0.20', 'Cy = 0.03')],
    ['dy-pushover-n2', setSrc(/k_i =/, '[450000, 400000, 360000, 300000] kN/m', '[2000, 2000, 2000, 2000] kN/m')],
    ['dy-momcurv-col', setSrc(/P = 1200 kN/, 'P = 1200 kN', 'P = 20000 kN')],
    ['dy-aislamiento', setSrc(/Dcap =/, 'Dcap = 45 cm', 'Dcap = 5 cm')],
  ];
  for (const [id, mut] of extremos) {
    const t = t0(); const r = runTemplate(id, mut).res; const ms = t0() - t;
    const html = r.html;
    truthy(`${id} con datos extremos: sin errores ni NaN y con NO CUMPLE`, r.ctx.errors.length === 0 && r.ctx.checks.some(c => !c.ok) && !/NaN/.test(html), r.ctx.errors.map(e => JSON.stringify(e)).join(' ') + ` (${ms.toFixed(0)} ms)`);
  }
}
void math;
done();
