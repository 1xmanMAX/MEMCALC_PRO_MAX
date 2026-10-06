// Pruebas del módulo «extras»: escalera de dos tramos, piso industrial, pavimento rígido AASHTO 93,
// cimentación de máquina, viga de acoplamiento, diafragma, pase aéreo, muro anclado, panel publicitario,
// FRP (ACI 440.2R-17 Ej. 16.3), pilote (fuste) y encamisado de columnas.
import { section, near, truthy, calc, block, runTemplate, done, math, TEMPLATES, BLOCKS } from './helpers.mjs';
import { pmCircPts, phiMnCircAt } from '../src/norms/extras.js';

const IDS = TEMPLATES.filter(t => t.id.startsWith('ex-')).map(t => t.id);
const G = 9.80665;

// reemplaza el valor de un dato de entrada «nombre = …» en los bloques de cálculo
const setData = (vals) => (d) => {
  for (const [k, v] of Object.entries(vals)) {
    let hit = false;
    for (const b of d.blocks) {
      if (b.type !== 'calc') continue;
      const re = new RegExp('^' + k + ' = .*?(?=\\s+//|$)', 'm');
      if (re.test(b.src)) { b.src = b.src.replace(re, k + ' = ' + v); hit = true; break; }
    }
    if (!hit) throw new Error('Dato no encontrado: ' + k);
  }
};
const status = (g) => {
  const r = g.res, bad = r.ctx.checks.filter(c => !c.ok);
  let nan = false;
  for (const [, v] of r.ctx.scope) { const x = math.isUnit(v) ? v.value : v; if (typeof x === 'number' && Number.isNaN(x)) nan = true; }
  return { err: r.ctx.errors.length, bad: bad.length, n: r.ctx.checks.length, nan, errs: r.ctx.errors };
};

section('Plantillas con datos por defecto: sin errores, sin NaN y todas las verificaciones cumplen');
truthy('Hay al menos 8 plantillas «ex-»', IDS.length >= 8, IDS.length + ' plantillas');
for (const id of IDS) {
  const s = status(runTemplate(id));
  truthy(`[${id}] ${s.n} verificaciones, ${s.bad} no cumplen, ${s.err} errores`, s.err === 0 && s.bad === 0 && s.n >= 4 && !s.nan, JSON.stringify(s.errs).slice(0, 200));
  const t = TEMPLATES.find(x => x.id === id);
  truthy(`[${id}] tiene validacion, summary y figura`, !!t.validacion && t.blocks.some(b => b.type === 'summary') && t.blocks.some(b => !['calc', 'text', 'summary'].includes(b.type)));
}

section('Datos extremos → NO CUMPLE sin errores ni NaN');
const EXT = {
  'ex-escalera-2t': { L1: '5.5 m', tg: '10 cm', sc: '1.0 tonf/m^2' },
  'ex-piso-ind': { hl: '10 cm', Peje: '15 tonf', Pr: '12 tonf' },
  'ex-pav-rigido': { W18: '9e7', kef: '1 kgf/cm^3', Sc: '35 kgf/cm^2' },
  'ex-cim-maquina': { rpm: '1350', hb: '0.5 m', Wm: '20 tonf' },
  'ex-viga-acople': { Vu: '250 tonf' },
  'ex-diafragma': { Ld: '60 m', te: '5 cm', Cx: '0.6' },
  'ex-pase-aereo': { Lc: '120 m', fcab: '4 m', dcab: '0.5 in' },
  'ex-muro-anclado': { H: '20 m', phis: '28 deg', sh: '4 m' },
  'ex-letrero': { V: '130 km/h', Dp: '219 mm', tp: '4 mm' },
  'ex-frp': { wL: '60 kN/m' },
  'ex-pilote-fuste': { Vh: '40 tonf', D: '40 cm', Pu: '400 tonf' },
  'ex-encamisado': { Pu: '400 tonf', Mu: '60 tonf*m', Vu: '80 tonf' },
};
for (const id of IDS) {
  const e = EXT[id];
  if (!truthy(`[${id}] tiene caso extremo definido`, !!e)) continue;
  const s = status(runTemplate(id, setData(e)));
  truthy(`[${id}] extremo ${JSON.stringify(e)} → ${s.bad} NO CUMPLE, ${s.err} errores`, s.bad >= 1 && s.err === 0 && !s.nan, JSON.stringify(s.errs).slice(0, 200));
}

section('Escalera de dos tramos: solución cerrada vs análisis matricial');
{
  const g = runTemplate('ex-escalera-2t');
  const wu1 = g('wu1', 'tonf/m'), wu2 = g('wu2', 'tonf/m'), L1 = 2.5, L2 = 1.2, L = 3.7;
  const RA = (wu1 * L1 * (L2 + L1 / 2) + wu2 * L2 * L2 / 2) / L;
  near('wu1 = 1.4(γc·hm + acab) + 1.7·sc', wu1, 1.4 * (2.4 * (0.15 / Math.cos(Math.atan(0.7)) + 0.0875) + 0.1) + 1.7 * 0.2, 1e-6);
  near('RA por equilibrio', g('RA', 'tonf'), RA, 1e-6);
  near('Mmax = RA²/(2wu1)', g('Mmax', 'tonf*m'), RA * RA / (2 * wu1), 1e-6);
  near('Mmax = M+ del análisis matricial (bloque beam)', g('Mpos', 'tonf*m'), g('Mmax', 'tonf*m'), 0.005);
  near('RB = R3 del análisis matricial', g('R3', 'tonf'), g('RB', 'tonf'), 0.005);
}

section('Losa sobre terreno: fórmulas de Westergaard (Huang 2004) recalculadas');
{
  const g = runTemplate('ex-piso-ind');
  const fc = 280, E = 15000 * Math.sqrt(fc), h = 20, k = 5.5, nu = 0.15, P = 3000, a = Math.sqrt(P / (Math.PI * 10));
  const l = Math.pow(E * h ** 3 / (12 * (1 - nu * nu) * k), 0.25);
  const bb = a < 1.724 * h ? Math.sqrt(1.6 * a * a + h * h) - 0.675 * h : a;
  const si = 3 * (1 + nu) * P / (2 * Math.PI * h * h) * (Math.log(l / bb) + 0.6159);
  const se = 3 * (1 + nu) * P / (Math.PI * (3 + nu) * h * h) * (Math.log(E * h ** 3 / (100 * k * a ** 4)) + 1.84 - 4 * nu / 3 + (1 - nu) / 2 + 1.18 * (1 + 2 * nu) * a / l);
  near('ℓ = [Eh³/12(1−ν²)k]^¼ [cm]', g('lrel', 'cm'), l, 1e-6);
  near('σi Westergaard interior [kgf/cm²]', g('sigi', 'kgf/cm^2'), si, 1e-6);
  near('σe Westergaard 1948 borde [kgf/cm²]', g('sige', 'kgf/cm^2'), se, 1e-6);
  near('σi con ν = 0.15 = 0.316P/h²[4log(ℓ/b) + 1.069] (forma original)', g('sigi', 'kgf/cm^2'), 0.316 * P / (h * h) * (4 * Math.log10(l / bb) + 1.069), 0.002);
  near('MR = 7.5√f\'c psi ≈ 2.0√f\'c kgf/cm² (diferencia < 1 %)', g('MR', 'kgf/cm^2'), 7.5 * Math.sqrt(280 * 14.2233) / 14.2233, 0.01);
  near('PCA: w = 257.876·s·√(kh/E) [psf]', g('wadm', 'lbf/ft^2'), 257.876 * (g('MR', 'psi') / 1.7) * Math.sqrt(k * 36.127 * (h / 2.54) / (E * 14.2233)), 0.002);
}

section('Pavimento rígido AASHTO 93 (ejemplo del nomograma: D = 9.75 in ≈ 10 in)');
{
  const v = calc('ZR = ZRconf(95)\nZ9 = ZRconf(90)\nD = DAASHTO93(5.1e6, ZR, 0.29, 1.7, 2.5, 650 psi, 1.0, 3.2, 5e6 psi, 72 lbf/in^3)\nW = W18AASHTO93(D, ZR, 0.29, 1.7, 2.5, 650 psi, 1.0, 3.2, 5e6 psi, 72 lbf/in^3)');
  near('ZR(95 %) = −1.645 (AASHTO Tabla 4.1)', v('ZR'), -1.645, 0.001);
  near('ZR(90 %) = −1.282', v('Z9'), -1.282, 0.001);
  near('D por la ecuación ≈ 9.75 in del nomograma (Garber y Hoel)', v('D', 'in'), 9.75, 0.01);
  near('W18(D) = 5.1×10⁶ (consistencia de la inversión)', v('W'), 5.1e6, 1e-4);
  // ecuación escrita de nuevo en la prueba
  const D = v('D', 'in'), ZR = -1.6449, So = 0.29;
  const logW = ZR * So + 7.35 * Math.log10(D + 1) - 0.06 + Math.log10(1.7 / 3) / (1 + 1.624e7 / (D + 1) ** 8.46) + (4.22 - 0.32 * 2.5) * Math.log10(650 * 1 * (D ** 0.75 - 1.132) / (215.63 * 3.2 * (D ** 0.75 - 18.42 / (5e6 / 72) ** 0.25)));
  near('log W18 recalculado = log(5.1×10⁶)', logW, Math.log10(5.1e6), 0.001);
  const g = runTemplate('ex-pav-rigido');
  near('Plantilla (datos en kgf/cm): Dreq ≈ 9.75 in', g('Dreq', 'in'), 9.75, 0.01);
}

section('Cimentación de máquina (Richart, Hall y Woods 1970)');
{
  const g = runTemplate('ex-cim-maquina');
  const B = 2, L = 4, hb = 1.5, Wm = 6, Wb = 2.4 * B * L * hb, Wt = Wb + Wm, m = Wt / G, rho = 1.8 / G, Gs = rho * 200 ** 2, nu = 0.33;
  const r0 = Math.sqrt(B * L / Math.PI), kz = 4 * Gs * r0 / (1 - nu), Bz = (1 - nu) / 4 * m / (rho * r0 ** 3);
  near('r0 = √(BL/π)', g('r0z', 'm'), r0, 1e-6);
  near('kz = 4Gr0/(1 − ν) [tonf/m]', g('kz', 'tonf/m'), kz, 1e-6);
  near('Dz = 0.425/√Bz', g('Dz'), 0.425 / Math.sqrt(Bz), 1e-6);
  near('fz = √(kz/m)/2π [Hz]', g('fz', 'Hz'), Math.sqrt(kz / m) / (2 * Math.PI), 1e-6);
  const kx = 32 * (1 - nu) * Gs * r0 / (7 - 8 * nu);
  near('fx = √(kx/m)/2π [Hz]', g('fx', 'Hz'), Math.sqrt(kx / m) / (2 * Math.PI), 1e-6);
  const w = 2 * Math.PI * 60, Fo = 2 * (2 / G) * 0.0025 * w;
  near('Fo = SF·mr·G·ω [tonf]', g('Fo', 'tonf'), Fo, 1e-6);
}

section('Viga de acoplamiento (ACI 318-19 18.10.7)');
{
  const g = runTemplate('ex-viga-acople');
  const a = Math.atan(0.6 / 1.5);
  near('α = atan((h − 2yd)/ℓn) [°]', g('alfa', 'deg'), a * 180 / Math.PI, 1e-6);
  near('Avd = Vu/(2φfy sen α) [cm²]', g('Avd', 'cm^2'), 70000 / (2 * 0.85 * 4200 * Math.sin(a)), 1e-6);
  near('0.83√f\'c(MPa) ≡ 2.65√f\'c(kgf/cm²)', 0.83 * Math.sqrt(280 * 0.0980665) / 0.0980665, 2.65 * Math.sqrt(280), 0.002);
}

section('Diafragma');
{
  const g = runTemplate('ex-diafragma');
  const Fpx = 0.5 * 0.45 * 1.0 * 1.05 * 288, w = Fpx / 24;
  near('Fpx = 0.5ZUS·wpx (rige el mínimo)', g('Fpx', 'tonf'), Fpx, 1e-6);
  near('M = wL²/8', g('Mud', 'tonf*m'), w * 576 / 8, 1e-6);
  near('Tu = M/(0.95B)', g('Tu', 'tonf'), w * 576 / 8 / (0.95 * 12), 1e-6);
  near('Colector Ω0·v·(B − lw)/2', g('Fcm', 'tonf'), 2.5 * (w * 12 / 12) * 3, 1e-6);
}

section('Pase aéreo: cable parabólico y cables 6×19');
{
  const v = calc('T1 = cableRot(0.5 in)\nT2 = cableRot(0.75 in)\nT3 = cableRot(1 in, 2)\nw1 = cablePeso(0.5 in)');
  near('Rotura 1/2" EIPS = 13.3 t cortas = 12.07 tf', v('T1', 'tonf'), 13.3 * 0.907185, 1e-6);
  near('Rotura 3/4" EIPS = 29.4 t cortas', v('T2', 'tonf'), 29.4 * 0.907185, 1e-6);
  near('Rotura 1" IPS = 44.9 t cortas', v('T3', 'tonf'), 44.9 * 0.907185, 1e-6);
  near('Peso 1/2" = 0.46 lb/ft = 0.685 kgf/m', v('w1', 'kgf/m'), 0.46 * 1.48816, 1e-6);
  const g = runTemplate('ex-pase-aereo');
  const wr = g('wr', 'kgf/m') / 1000, L = 40, f = 4, P = 0.1;
  const H = (wr * L * L / 8 + P * L / 4) / f, V = wr * L / 2 + P / 2;
  near('H = (wL²/8 + PL/4)/f', g('Hc', 'tonf'), H, 1e-6);
  near('Tmáx = √(H² + V²)', g('Tmax', 'tonf'), Math.hypot(H, V), 1e-6);
  near('Longitud del cable S ≈ L(1 + 8n²/3 − 32n⁴/5)', g('Scab', 'm'), 40 * (1 + 8 / 3 * 0.01 - 32 / 5 * 1e-4), 1e-6);
}

section('Muro anclado (FHWA GEC-4)');
{
  const g = runTemplate('ex-muro-anclado');
  const phi = 35 * Math.PI / 180, Ka = (1 - Math.sin(phi)) / (1 + Math.sin(phi)), H = 9, Pt = 0.65 * Ka * 2 * 81, pe = Pt / (H - 0.5 - 0.5), pt = pe + Ka * 1.0, sv = 3;
  near('Ka Rankine 35°', g('Ka'), Ka, 1e-6);
  near('p = 0.65KaγH²/(H − H1/3 − Hn+1/3)', g('pe', 'tonf/m^2'), pe, 1e-6);
  near('T1 = (2/3·H1 + sv/2)·p', g('T1', 'tonf/m'), (1 + 1.5) * pt, 1e-6);
  near('Tn = (sv/2 + 23/48·Hn+1)·p', g('Tn', 'tonf/m'), (1.5 + 23 / 48 * 1.5) * pt, 1e-6);
  near('Equilibrio: ΣT + R = área del trapecio', (g('T1', 'tonf/m') + g('Ti', 'tonf/m') + g('Tn', 'tonf/m') + g('Rb', 'tonf/m')), pt * (H - 1.5 / 3 - 1.5 / 3), 1e-6);
  const beta = Math.PI / 4 + phi / 2, th = 15 * Math.PI / 180;
  near('Distancia a la cuña desde la fila 1', g('xs1', 'm'), 7.5 / (Math.cos(th) * Math.tan(beta) + Math.sin(th)), 1e-6);
}

section('Panel publicitario (E.020 / AISC F8)');
{
  const g = runTemplate('ex-letrero');
  const Vh = 75 * Math.pow(1.2, 0.22), Ph = 0.005 * 1.5 * Vh * Vh;
  near('Vh = V(h/10)^0.22', g('Vh', 'km/h'), Vh, 1e-6);
  near('F = 0.005·C·Vh²·A', g('Fp', 'tonf'), Ph * 48 / 1000, 1e-6);
  near('Zp ≈ (D − t)²t', g('Zp', 'cm^3'), (50.8 - 0.953) ** 2 * 0.953, 1e-6);
}

section('FRP — ACI 440.2R-17 Ejemplo 16.3 (valores publicados)');
{
  const g = runTemplate('ex-frp');
  near('Límite de reforzamiento 1.1MDL + 0.75MLL = 177 kip-ft', 1.1 * g('MDL', 'kip*ft') + 0.75 * g('MLL', 'kip*ft'), 177, 0.01);
  near('φMn sin FRP = 266 kip-ft', g('phiMn0', 'kip*ft'), 266, 0.01);
  near('Icr = 2471×10⁶ mm⁴', g('Icr', 'mm^4'), 2471e6, 0.01);
  near('εbi = 0.00061', g('ebi'), 0.00061, 0.02);
  near('εfd = 0.41√(f\'c/nEftf) ≈ 0.009 (publicado redondeado)', g('efd'), 0.009, 0.03);
  near('c = 5.17 in', g('cna', 'in'), 5.17, 0.02);
  near('Mns ≈ 292 kip-ft', g('Mns', 'kip*ft'), 292, 0.02);
  near('Mnf = 85 kip-ft (con εfd redondeado a 0.009)', g('Mnf', 'kip*ft'), 85, 0.03);
  near('fs,s = 40.4 ksi', g('fss', 'ksi'), 40.4, 0.02);
  truthy('φMn ≥ Mu = 294 kip-ft', g('phiMn', 'kip*ft') >= 294, 'φMn = ' + g('phiMn', 'kip*ft').toFixed(1) + ' kip-ft');
}

section('Pilote: Matlock–Reese y P–M circular');
{
  const g = runTemplate('ex-pilote-fuste');
  const Ec = 15000 * Math.sqrt(210) * 10, EI = 0.7 * Ec * Math.PI * 0.6 ** 4 / 64, T = Math.pow(EI / 500, 0.2);
  near('T = (EI/nh)^(1/5) [m]', g('Tch', 'm'), T, 1e-6);
  near('M = 0.93·H·T', g('Mlat', 'tonf*m'), 0.93 * 8 * T, 1e-6);
  near('y = 0.93·H·T³/EI [mm]', g('ylat', 'mm'), 0.93 * 8 * T ** 3 / EI * 1000, 1e-6);
  near('φPn = 0.55[0.85f\'c(Ag − Ast) + fyAst]', g('phiPn', 'tonf'), 0.55 * (0.85 * 210 * (Math.PI * 900 - 8 * 2.84) + 4200 * 8 * 2.84) / 1000, 1e-6);
  // integración independiente por franjas para Pn = 0 (flexión pura): busca c con ΣF = 0
  const D = 60, R = 30, dc = 7.5 + 0.953 + 1.905 / 2, nb = 8, A = 2.84, fc = 210, fy = 4200, b1 = 0.85;
  const bars = [...Array(nb).keys()].map(i => R - (R - dc) * Math.cos(2 * Math.PI * i / nb));
  const forces = (c) => {
    const a = b1 * c, N = 4000; let F = 0, M = 0;
    for (let i = 0; i < N; i++) { const y = (i + 0.5) * D / N; if (y > a) break; const w = 2 * Math.sqrt(Math.max(R * R - (R - y) ** 2, 0)); const dF = 0.85 * fc * w * D / N; F += dF; M += dF * (R - y); }
    for (const di of bars) { let s = Math.max(-fy, Math.min(fy, 2e6 * 0.003 * (c - di) / c)); if (di < a) s -= 0.85 * fc; F += s * A; M += s * A * (R - di); }
    return { F, M };
  };
  let lo = 1, hi = 50; for (let i = 0; i < 80; i++) { const c = (lo + hi) / 2; if (forces(c).F > 0) hi = c; else lo = c; }
  const c0 = (lo + hi) / 2, Mn0 = forces(c0).M, et = 0.003 * (Math.max(...bars) - c0) / c0;
  const phi = et >= 0.005 ? 0.9 : 0.75 + 0.15 * (et - 0.0021) / (0.005 - 0.0021);
  near('φMn(P = 0) circular vs integración por franjas [tonf·m]', phiMnCircAt(0, D, dc, nb, A, fc, fy) / 1e5, phi * Mn0 / 1e5, 0.01);
  const pm = pmCircPts(D, dc, nb, A, fc, fy);
  near('φPn,máx = 0.85·0.75·P0', pm.Pmax, 0.85 * 0.75 * (0.85 * fc * (Math.PI * 900 - 8 * A) + fy * 8 * A), 1e-9);
  const bk = block('exPMcirc', { D: '60 cm', dc: dc + ' cm', nb: '8', barra: '6', fc: '210 kgf/cm^2', fy: '4200 kgf/cm^2', demandas: '120 tonf, 13 tonf*m // a\n120 tonf, 40 tonf*m // b' });
  truthy('Bloque exPMcirc: demanda interior cumple y exterior no cumple', bk.ctx.checks.length === 2 && bk.ctx.checks[0].ok && !bk.ctx.checks[1].ok);
}

section('Encamisado de columna');
{
  const g = runTemplate('ex-encamisado');
  const P0 = 0.56 * (0.85 * 175 * (900 - 4 * 1.99) + 4200 * 4 * 1.99) / 1000;
  near('φPn,máx existente = 0.8·0.7·P0', g('phiPn0', 'tonf'), P0, 1e-6);
  near('Avf = (Pu − φPn0)/(φ·fy·μ)', g('Avf', 'cm^2'), (150 - P0) * 1000 / (0.85 * 4200), 1e-6);
}

section('Bloques gráficos del módulo (datos por defecto)');
for (const k of ['exEscalera', 'exCapas', 'exMaquina', 'exAcople', 'exDiafragma', 'exCable', 'exAnclado', 'exLetrero', 'exFRP', 'exPMcirc']) {
  let ok = false, info = '';
  try { const B = BLOCKS[k]; const g = block(k, { ...B.def }); ok = /<svg/.test(g.html) && !/NaN|undefined/.test(g.html); } catch (e) { info = e.message; }
  truthy('Bloque ' + k + ' se dibuja sin NaN', ok, info);
}

done();
