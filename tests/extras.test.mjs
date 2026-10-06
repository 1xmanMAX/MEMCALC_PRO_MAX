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
  // deflexión con Ie de Branson (E.060 9.6.2.3) recalculada
  const Ec = 15000 * Math.sqrt(210), Ig = 100 * 15 ** 3 / 12, Mcr = 2 * Math.sqrt(210) * Ig / 7.5;
  const d = 15 - 2.5 - 1.27 / 2, As = 1.29 / g('sep', 'cm') * 100, n = 2e6 / Ec, r = n * As / (100 * d), k = Math.sqrt(2 * r + r * r) - r;
  const Icr = 100 * (k * d) ** 3 / 3 + n * As * (d - k * d) ** 2, wD1 = g('wD1', 'tonf/m^2');
  const Ma = g('Mmax', 'kgf*cm') * (wD1 + 0.2) / wu1, rc = Math.min(1, (Mcr / Ma) ** 3), Ie = rc * Ig + (1 - rc) * Icr;
  const di = 5 * Ma * 370 ** 2 / (48 * Ec * Ie), dD = di * wD1 / (wD1 + 0.2);
  near('Flecha diferida + viva = 2ΔD + ΔL (Ie de Branson) [mm]', g('dltLP', 'mm'), (2 * dD + di - dD) * 10, 1e-4);
  const s2 = status(runTemplate('ex-escalera-2t', setData({ cp: '19 cm', p: '22 cm' })));
  truthy('Contrapaso 19 cm y paso 22 cm → NO CUMPLE A.010', s2.bad >= 2 && s2.err === 0);
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

section('Westergaard — Huang, Pavement Analysis and Design, Ejemplos 4.1, 4.2 y 4.3 (valores publicados)');
{
  // k = 100 pci, h = 10 in, a = 6 in, P = 10 000 lb, E = 4×10⁶ psi, ν = 0.15
  const v = calc('l = lrelWest(4e6 psi, 10 in, 0.15, 100 lbf/in^3)\nsc = sigEsqWest(10000 lbf, 10 in, l, 6 in)\nsi = sigIntWest(10000 lbf, 10 in, l, 6 in, 0.15)\nse = sigBordeWest(10000 lbf, 10 in, 4e6 psi, 100 lbf/in^3, 6 in, 0.15)');
  near('Ej. 4.1: ℓ = 42.97 in', v('l', 'in'), 42.97, 0.001);
  near('Ej. 4.1: σc (esquina) = 186.6 psi', v('sc', 'psi'), 186.6, 0.002);
  near('Ej. 4.2: σi (interior, b = 5.804 in) = 143.7 psi', v('si', 'psi'), 143.7, 0.002);
  near('Ej. 4.3: σe (borde, Westergaard 1948 / Ioannides) = 279.4 psi', v('se', 'psi'), 279.4, 0.002);
}

section('Pavimento rígido AASHTO 93 — Huang Ej. 12.6 (nomograma: D = 9.75 in ≈ 10 in) y Ej. 12.7');
{
  const v = calc('ZR = ZRconf(95)\nZ9 = ZRconf(90)\nD = DAASHTO93(5.1e6, ZR, 0.29, 1.7, 2.5, 650 psi, 1.0, 3.2, 5e6 psi, 72 lbf/in^3)\nW = W18AASHTO93(D, ZR, 0.29, 1.7, 2.5, 650 psi, 1.0, 3.2, 5e6 psi, 72 lbf/in^3)');
  near('ZR(95 %) = −1.645 (AASHTO Tabla 4.1)', v('ZR'), -1.645, 0.001);
  near('ZR(90 %) = −1.282', v('Z9'), -1.282, 0.001);
  near('D por la ecuación ≈ 9.75 in del nomograma (Huang Ej. 12.6)', v('D', 'in'), 9.75, 0.01);
  near('W18(D) = 5.1×10⁶ (consistencia de la inversión)', v('W'), 5.1e6, 1e-4);
  // ecuación escrita de nuevo en la prueba
  const D = v('D', 'in'), ZR = -1.6449, So = 0.29;
  const logW = ZR * So + 7.35 * Math.log10(D + 1) - 0.06 + Math.log10(1.7 / 3) / (1 + 1.624e7 / (D + 1) ** 8.46) + (4.22 - 0.32 * 2.5) * Math.log10(650 * 1 * (D ** 0.75 - 1.132) / (215.63 * 3.2 * (D ** 0.75 - 18.42 / (5e6 / 72) ** 0.25)));
  near('log W18 recalculado = log(5.1×10⁶)', logW, Math.log10(5.1e6), 0.001);
  // Huang Ej. 12.7: términos publicados de la ecuación con D = 9.75 in (ZR·So, 7.35 log(D + 1), último término)
  const D2 = 9.75;
  near('Ej. 12.7: ZR·So = −0.477', -1.645 * 0.29, -0.477, 0.002);
  near('Ej. 12.7: 7.35·log(D + 1) = 7.581', 7.35 * Math.log10(D2 + 1), 7.581, 0.001);
  near('Ej. 12.7: (4.22 − 0.32pt)·log[…] = −0.088', 3.42 * Math.log10(650 * (D2 ** 0.75 - 1.132) / (215.63 * 3.2 * (D2 ** 0.75 - 18.42 / (5e6 / 72) ** 0.25))), -0.088, 0.02);
  const W975 = calc('W = W18AASHTO93(9.75 in, -1.645, 0.29, 1.7, 2.5, 650 psi, 1.0, 3.2, 5e6 psi, 72 lbf/in^3)')('W');
  // Huang usa log(ΔPSI/2.7) (−0.195) y obtiene 5.8×10⁶; con log(ΔPSI/3.0) de la Guía AASHTO resulta ≈ 5.3×10⁶, cercano a los 5.2×10⁶ del nomograma
  near('Ej. 12.7: W18(9.75 in) ≈ 5.2×10⁶ leído en el nomograma (ecuación AASHTO con 4.5 − 1.5)', W975, 5.2e6, 0.04);
  const g = runTemplate('ex-pav-rigido');
  near('Plantilla (datos en kgf/cm): Dreq ≈ 9.75 in', g('Dreq', 'in'), 9.75, 0.01);
}

section('Cimentación de máquina (Richart, Hall y Woods 1970)');
{
  const g = runTemplate('ex-cim-maquina');
  const B = 2.4, L = 4, hb = 1.5, Wm = 6, Wb = 2.4 * B * L * hb, Wt = Wb + Wm, m = Wt / G, rho = 1.8 / G, Gs = rho * 200 ** 2, nu = 0.33;
  const r0 = Math.sqrt(B * L / Math.PI), kz = 4 * Gs * r0 / (1 - nu), Bz = (1 - nu) / 4 * m / (rho * r0 ** 3);
  near('r0 = √(BL/π)', g('r0z', 'm'), r0, 1e-6);
  near('kz = 4Gr0/(1 − ν) [tonf/m]', g('kz', 'tonf/m'), kz, 1e-6);
  near('Dz = 0.425/√Bz', g('Dz'), 0.425 / Math.sqrt(Bz), 1e-6);
  near('fz = √(kz/m)/2π [Hz]', g('fz', 'Hz'), Math.sqrt(kz / m) / (2 * Math.PI), 1e-6);
  const kx = 32 * (1 - nu) * Gs * r0 / (7 - 8 * nu);
  near('fx = √(kx/m)/2π [Hz]', g('fx', 'Hz'), Math.sqrt(kx / m) / (2 * Math.PI), 1e-6);
  const w = 2 * Math.PI * 60, Fo = 2 * (2 / G) * 0.0025 * w;
  near('Fo = SF·mr·G·ω [tonf]', g('Fo', 'tonf'), Fo, 1e-6);
  // cabeceo alrededor del eje de la máquina (paralelo a L): r0 = (L·B³/3π)^¼, kψ = 8Gr0³/3(1 − ν)
  const r0p = Math.pow(L * B ** 3 / (3 * Math.PI), 0.25), kpsi = 8 * Gs * r0p ** 3 / (3 * (1 - nu));
  const Ipsi = Wb / G * ((B * B + hb * hb) / 12 + hb * hb / 4) + Wm / G * (hb + 0.4) ** 2;
  near('r0ψ = (L·B³/3π)^¼ (cabeceo alrededor del eje de la máquina)', g('r0p', 'm'), r0p, 1e-6);
  near('fψ = √(kψ/Iψ)/2π [Hz]', g('fpsi', 'Hz'), Math.sqrt(kpsi / Ipsi) / (2 * Math.PI), 1e-6);
  const Bp = 3 * (1 - nu) / 8 * Ipsi / (rho * r0p ** 5);
  near('Dψ = 0.15/[(1 + Bψ)√Bψ]', g('Dpsi'), 0.15 / ((1 + Bp) * Math.sqrt(Bp)), 1e-6);
  const s2 = status(runTemplate('ex-cim-maquina', setData({ B: '1.6 m' })));
  truthy('Regla ACI 351.3R: B < altura del eje (hb + hm) → NO CUMPLE', s2.bad >= 1 && s2.err === 0);
}

section('Viga de acoplamiento (ACI 318-19 18.10.7)');
{
  const g = runTemplate('ex-viga-acople');
  const a = Math.atan(0.6 / 1.5);
  near('α = atan((h − 2yd)/ℓn) [°]', g('alfa', 'deg'), a * 180 / Math.PI, 1e-6);
  near('Avd = Vu/(2φfy sen α) [cm²]', g('Avd', 'cm^2'), 70000 / (2 * 0.85 * 4200 * Math.sin(a)), 1e-6);
  near('0.83√f\'c(MPa) ≡ 2.65√f\'c(kgf/cm²)', 0.83 * Math.sqrt(280 * 0.0980665) / 0.0980665, 2.65 * Math.sqrt(280), 0.002);
  truthy('Ramas de confinamiento separadas ≤ 200 mm en el ancho y en la altura (18.10.7.4 d)', (30 - 8) / (g('nr1') - 1) <= 20 && (90 - 8) / (g('nr2') - 1) <= 20, 'nr1 = ' + g('nr1') + ', nr2 = ' + g('nr2'));
  const s2 = status(runTemplate('ex-viga-acople', setData({ Vu: '20 tonf' })));
  truthy('Vu bajo (diagonales opcionales, 18.10.7.3): no se marca NO CUMPLE', s2.bad === 0 && s2.err === 0);
}

section('Diafragma');
{
  const g = runTemplate('ex-diafragma');
  const Fpx = 0.5 * 0.45 * 1.0 * 1.05 * 288, w = Fpx / 24;
  near('Fpx = 0.5ZUS·wpx (rige el mínimo)', g('Fpx', 'tonf'), Fpx, 1e-6);
  near('M = wL²/8', g('Mud', 'tonf*m'), w * 576 / 8, 1e-6);
  near('Tu = M/(0.95B)', g('Tu', 'tonf'), w * 576 / 8 / (0.95 * 12), 1e-6);
  near('Colector Ω0·v·(B − lw)/2', g('Fcm', 'tonf'), 2.5 * (w * 12 / 12) * 3, 1e-6);
  near('Cortante-fricción losa–muro Avf = (V/lw)/(φμfy) [cm²/m]', g('Avfd', 'cm^2'), (w * 12 / 6) * 1000 / (0.75 * 4200), 1e-6);
  const Ec = 15000 * Math.sqrt(210) * 10; // tonf/m²
  near('δ = 5wL⁴/384EI + 1.2wL²/(8GA) [mm]', g('deltad', 'mm'), (5 * w * 24 ** 4 / (384 * Ec * 0.05 * 12 ** 3 / 12) + 1.2 * w * 576 / (8 * Ec / 2.4 * 0.05 * 12)) * 1000, 1e-6);
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
  near('Inclinación en la torre α = atan(V/H)', g('a1', 'deg'), Math.atan2(V, H) * 180 / Math.PI, 1e-6);
  near('Momento transversal 1.25(wh·L/2·ht + qt·ht²/2) [tonf·m]', g('Mut', 'tonf*m'), 1.25 * (g('wh', 'tonf/m') * 20 * 5.5 + g('qt', 'tonf/m') * 5.5 ** 2 / 2), 1e-6);
  near('Acero de la cara traccionada: nbt/4 + 1 = 3 barras #6', g('Atr', 'cm^2'), 3 * 2.84, 1e-6);
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
  const Dm = 50.8 - 0.953, Ag = Math.PI * Dm * 0.953, rg = Math.sqrt(Math.PI * Dm ** 3 * 0.953 / 8 / Ag), KLr = 2 * 800 / rg, Fe = Math.PI ** 2 * 2.04e6 / KLr ** 2;
  near('Pandeo del poste (K = 2): Fcr = 0.658^(Fy/Fe)·Fy (E3-2) [kgf/cm²]', g('Fcr', 'kgf/cm^2'), Math.pow(0.658, 2460 / Fe) * 2460, 1e-6);
  near('Torsión: Fcr = 0.6Fy (H3-2 no gobierna con D/t = 53)', g('FcrT', 'kgf/cm^2'), 0.6 * 2460, 1e-9);
  near('Pernos: F\'nt = 1.3Fnt − Fnt·frv/(φFnv) ≤ Fnt (J3-3a)', g('Fntp', 'kgf/cm^2'), Math.min(1.3 * 0.75 * 5273 - 0.75 * 5273 / (0.75 * 0.45 * 5273) * g('frv', 'kgf/cm^2'), 0.75 * 5273), 1e-6);
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
  near('k (agrietada, existente) = 0.334', g('kcr'), 0.334, 0.005);
  near('k (servicio con FRP) = 0.343; kd = 187 mm', g('kd', 'mm'), 187, 0.01);
  near('ff,s = 38 N/mm² (≤ 0.55ffu)', g('ffs', 'MPa'), 38, 0.02);
  near('Mnf = 114 kN·m (SI, con εfd = 0.009)', g('Mnf', 'kN*m'), 114, 0.03);
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
  const D = 60, R = 30, dc = 7.5 + 1.27 + 1.905 / 2, nb = 8, A = 2.84, fc = 210, fy = 4200, b1 = 0.85;
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
  const Dc = 60 - 15, rq = 0.5 * Math.max(0.45 * (3600 / (Dc * Dc) - 1), 0.12) * 210 / 4200;
  near('ρs requerida = ½·máx[0.45(Ag/Ach − 1), 0.12]·f\'c/fyt (Tabla 18.13.5.7.1 / IBC 1810.3.9.4.2)', g('rhoreq'), rq, 1e-6);
  const s3 = status(runTemplate('ex-pilote-fuste', setData({ est: '3' })));
  truthy('Espiral 3/8" en pilote de 60 cm → NO CUMPLE (ρs y diámetro mínimo)', s3.bad >= 2 && s3.err === 0, s3.bad + ' NO CUMPLE');
  truthy('Bloque exPMcirc: demanda interior cumple y exterior no cumple', bk.ctx.checks.length === 2 && bk.ctx.checks[0].ok && !bk.ctx.checks[1].ok);
}

section('Encamisado de columna');
{
  const g = runTemplate('ex-encamisado');
  const P0 = 0.56 * (0.85 * 175 * (900 - 4 * 1.99) + 4200 * 4 * 1.99) / 1000;
  near('φPn,máx existente = 0.8·0.7·P0', g('phiPn0', 'tonf'), P0, 1e-6);
  near('Avf = (Pu − φPn0)/(φ·fy·μ)', g('Avf', 'cm^2'), (150 - P0) * 1000 / (0.85 * 4200), 1e-6);
}

section('Segunda opinión — tercera tanda A (extras)');
{
  // Máquina: con Vs = 410 m/s, rz ≈ 1.35 pasa la banda ±20 % pero no la variación 0.5G–1.5G (ACI 351.3R-18 Cap. 4)
  const m = runTemplate('ex-cim-maquina', setData({ Vs: '410 m/s' }));
  const rz = m('rz');
  truthy('Máquina: rz = ' + rz.toFixed(2) + ' fuera de ±20 % pero dentro de la banda con 1.5G → NO CUMPLE la verificación con G variable', rz > 1.2 && rz / Math.sqrt(1.5) < 1.2 && m.res.ctx.checks.some(c => !c.ok && /0.5G y 1.5G/.test(c.label)) && m.res.ctx.errors.length === 0);
  // Letrero: la tracción del perno usa 0.9D (la carga muerta alivia)
  const l = runTemplate('ex-letrero');
  near('Letrero: Tb = 4Mu/(n·Dbc) − 0.9·Wd/n [tonf]', l('Tb', 'tonf'), 4 * l('Mu', 'tonf*m') / (8 * 0.75) - 0.9 * l('Wd', 'tonf') / 8, 1e-6);
}

section('Segunda opinión — zapata de la torre y cámara de anclaje del pase aéreo');
{ const g = runTemplate('ex-pase-aereo');
  const B = 1.4, N = g('Ns', 'tonf'), Ml = g('Hd', 'tonf') * (5.5 + 1.2), Mt = g('wh', 'tonf/m') * 20 * 6.7 + g('qt', 'tonf/m') * 5.5 * (2.75 + 1.2);
  near('Zapata: N = Pv + Wt + Wz (zapata + relleno)', N, g('Pv', 'tonf') + g('Wt', 'tonf') + 2.4 * B * B * 0.6 + 1.8 * (B * B - 0.16) * 0.6, 1e-6);
  near('Zapata: qmax = N/B²(1 + 6el/B + 6et/B) con viento transversal', g('qmax', 'tonf/m^2'), N / (B * B) * (1 + 6 * Ml / N / B + 6 * Mt / N / B), 1e-6);
  near('Zapata: FS volteo = N·B/2/máx(Ml, Mt)', g('FSvol'), N * B / 2 / Math.max(Ml, Mt), 1e-6);
  const T = g('Tmax', 'tonf'), a2 = g('a2', 'deg') * Math.PI / 180, WA = 2.3 * 1.8 * 1.8 * 1.5;
  near('Cámara: FS volteo = WA·LA/2/(Tx·ha0 + Tz·LA/2)', g('FSva'), WA * 0.9 / (T * Math.cos(a2) * 0.3 + T * Math.sin(a2) * 0.9), 1e-6);
  near('Cámara: qmax = N/A(1 + 6e/L)', g('qA', 'tonf/m^2'), (WA - T * Math.sin(a2)) / 3.24 * (1 + 6 * (T * Math.cos(a2) * 0.3 / (WA - T * Math.sin(a2))) / 1.8), 1e-6);
  const s2 = status(runTemplate('ex-pase-aereo', setData({ qa: '0.5 kgf/cm^2' })));
  truthy('Pase aéreo con qa = 0.5 kg/cm²: NO CUMPLE la presión bajo la zapata', s2.bad >= 1 && s2.err === 0); }

section('Segunda opinión — componente vertical de los anclajes en la base del muro anclado');
{ const g = runTemplate('ex-muro-anclado');
  const th = 15 * Math.PI / 180, ThS = g('T1', 'tonf/m') + g('Ti', 'tonf/m') + g('Tn', 'tonf/m');
  near('ΣTv = ΣTh·tan α (= DL·sen α/sh por fila)', g('TvS', 'tonf/m'), ThS * Math.tan(th), 1e-9);
  near('ΣTv = Σ DLi·sen α / sh', g('TvS', 'tonf/m'), (g('T1', 'tonf/m') + g('Ti', 'tonf/m') + g('Tn', 'tonf/m')) * 3 / Math.cos(th) * Math.sin(th) / 3, 1e-9);
  const Nz = 2.4 * 0.3 * 9 + ThS * Math.tan(th) + 2.4 * 0.8 * 0.5, e = 0.1 * (Nz - 0.96) / Nz;
  near('Zapata de la pantalla: q = N/(B − 2e) (Meyerhof)', g('qz', 'tonf/m^2'), Nz / (0.8 - 2 * e), 1e-9);
  near('Último paño: q = (γc·tw·(H − Hb) + ΣTv)/tw', g('qcon', 'tonf/m^2'), (2.4 * 0.3 * 7.5 + ThS * Math.tan(th)) / 0.3, 1e-9);
  const s2 = status(runTemplate('ex-muro-anclado', setData({ qa: '3.0 kgf/cm^2' })));
  truthy('Muro anclado con qa = 3 kg/cm²: NO CUMPLE el hundimiento del paño durante la excavación', s2.bad >= 1 && s2.err === 0); }

section('Bloques gráficos del módulo (datos por defecto)');
for (const k of ['exEscalera', 'exCapas', 'exMaquina', 'exAcople', 'exDiafragma', 'exCable', 'exAnclado', 'exLetrero', 'exFRP', 'exPMcirc']) {
  let ok = false, info = '';
  try { const B = BLOCKS[k]; const g = block(k, { ...B.def }); ok = /<svg/.test(g.html) && !/NaN|undefined/.test(g.html); } catch (e) { info = e.message; }
  truthy('Bloque ' + k + ' se dibuja sin NaN', ok, info);
}

done();
