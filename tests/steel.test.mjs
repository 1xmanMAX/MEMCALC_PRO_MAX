// Pruebas del módulo «steel»: base de perfiles AISC/europea, funciones AISC 360,
// bloques (steelsec, basepl, boltgroup) y plantillas contra ejemplos resueltos.
import { near, truthy, calc, block, runTemplate, section, done, TEMPLATES, math } from './helpers.mjs';
import { settings } from '../src/engine.js';
import { getShape, compAISC, compE5, flexI, flexIy, flexT, flexHSS, mnF4F5, shearAISC, fcrE3, kLabioAISI, SHAPES } from '../src/norms/steel.js';

const KSI = 6894757.29, IN = 0.0254, KIP = 4448.2216, KIPFT = KIP * 0.3048;
const us = (src) => { settings.sys = 'us'; return calc(src); };

section('Base de perfiles — AISC Shapes Database v15/v16 (valores tabulados)');
{
  const ref = [
    ['W14X132', { A: 38.8, d: 14.7, bf: 14.7, tw: 0.645, tf: 1.03, Ix: 1530, Zx: 234, Sx: 209, rx: 6.28, Iy: 548, ry: 3.76, J: 12.3, Cw: 25500, rts: 4.23, ho: 13.7 }],
    ['W18X50', { A: 14.7, d: 18.0, Ix: 800, Zx: 101, Sx: 88.9, ry: 1.65, J: 1.24, rts: 1.98, ho: 17.4 }],
    ['W12X26', { A: 7.65, Zx: 37.2, Sx: 33.4, ry: 1.51, rts: 1.75, J: 0.300, ho: 11.8 }],
    ['W14X99', { A: 29.1, Zx: 173, Zy: 83.6, Sy: 55.2, rx: 6.17, ry: 3.71, 'bf/2tf': 9.34 }],
    ['W24X62', { d: 23.7, tw: 0.430, 'h/tw': 50.1 }],
    ['HSS6X6X3/8', { A: 7.58, tdes: 0.349, Ix: 39.5, Zx: 15.8, rx: 2.28, J: 64.6 }],
    ['L4X4X1/2', { A: 3.75, x: 1.18, rz: 0.776, rx: 1.21 }],
    ['C10X15.3', { A: 4.48, Ix: 67.3, x: 0.634, eo: 0.796 }],
  ];
  for (const [n, props] of ref) {
    const s = getShape(n);
    for (const [k, v] of Object.entries(props)) near(`${n} ${k}`, s.p[k], v, 1e-6);
  }
  truthy('Nombres flexibles: "w12x26", "HSS6X6X.375", "HE 200 B", "IPE 300"', ['w12x26', 'HSS6X6X.375', 'HE 200 B', 'IPE 300'].every(n => !!getShape(n)));
  const ipe = getShape('IPE300'), heb = getShape('HEB200');
  near('IPE 300 Wpl,y = 628.4 cm³ (ArcelorMittal)', ipe.p.Zx, 628.4, 1e-6);
  near('IPE 300 It = 20.12 cm⁴ (ArcelorMittal)', ipe.p.J, 20.12, 0.002);
  near('IPE 300 Iw = 125.9×10³ cm⁶ (ArcelorMittal)', ipe.p.Cw, 125900, 0.002);
  near('HEB 200 It = 59.28 cm⁴ (ArcelorMittal)', heb.p.J, 59.28, 0.002);
  near('HEB 200 Iw = 171.1×10³ cm⁶ (ArcelorMittal)', heb.p.Cw, 171100, 0.002);
  const g = us('Zx = sec("W12X26", "Zx")\nA2 = sec("IPE 300", "A")\nx = sec(0.5)');
  near('sec("W12X26","Zx") devuelve Unit (in³)', g('Zx', 'in^3'), 37.2, 1e-6);
  near('sec("IPE 300","A") = 53.81 cm²', g('A2', 'cm^2'), 53.81, 1e-6);
  near('sec(x) numérico conserva la secante trigonométrica', g('x'), 1 / Math.cos(0.5), 1e-9);
  const cf = getShape('CF150X50X15X2');
  near('Canal conformado CF150×50×15×2: A = 544 mm² (método lineal)', cf.p.A, 544, 1e-6);
  near('CF150×50×15×2: Ix = 1.844×10⁶ mm⁴ (método lineal)', cf.p.Ix, 1843924, 0.001);
}

section('Compresión (AISC 360 E3) — Design Example E.1A');
{
  const r = compAISC('W14X132', 50 * KSI, 30 * 12 * IN, 30 * 12 * IN);
  near('E.1A: Lc/ry = 95.7', r.sy, 95.7, 0.002);
  near('E.1A: Fe = 31.2 ksi', r.Fe / KSI, 31.2, 0.003);
  near('E.1A: Fcr = 25.6 ksi', r.Fcr / KSI, 25.6, 0.003);
  near('E.1A: φcPn = 893 kip', 0.9 * r.Pn / KIP, 893, 0.002);
  near('E3-3 rama elástica: Fcr = 0.877Fe', fcrE3(50, 20), 0.877 * 20, 1e-9);
  const g = us('Fcr = FcrE3(50 ksi, 95.74)\nPn = PnE3("W14X132", 50 ksi, 30 ft, 30 ft)');
  near('FcrE3(50 ksi, 95.74) = 25.6 ksi', g('Fcr', 'ksi'), 25.6, 0.003);
  near('PnE3 en el editor: Pn = 993 kip', g('Pn', 'kip'), 893 / 0.9, 0.003);
  // E7: HSS con paredes esbeltas — Ae < Ag (verificación de coherencia con E7-3)
  const h = compAISC('HSS12X12X3/16', 46 * KSI, 10 * 12 * IN, 10 * 12 * IN);
  truthy('E7: HSS12×12×3/16 (b/t = 66.0) tiene área efectiva reducida', h.Ae < h.A * 0.95, `Ae/Ag = ${(h.Ae / h.A).toFixed(3)}`);
  // E4: canal — el pandeo flexo-torsional puede controlar
  const c = compAISC('C8X11.5', 36 * KSI, 6 * 12 * IN, 3 * 12 * IN);
  truthy('E4: canal C8×11.5 evalúa pandeo flexo-torsional', /E3|E4/.test(c.modo), c.modo);
}

section('Flexión (AISC 360 F2, F3, F6) — Design Examples F.1 y H.1A');
{
  const f = flexI('W18X50', 50 * KSI, 17.5 * 12 * IN, 1.3);
  near('F.1-3A: W18×50 Lp = 5.83 ft', f.Lp / 0.3048, 5.83, 0.003);
  near('F.1-3A: W18×50 Lr = 16.9 ft', f.Lr / 0.3048, 16.9, 0.005);
  near('F.1-3A: φbMn = 288 kip·ft (Lb = 17.5 ft, Cb = 1.30)', 0.9 * f.Mn / KIPFT, 288, 0.003);
  const f0 = flexI('W18X50', 50 * KSI, 0, 1);
  near('F.1-1A: φbMp = 379 kip·ft', 0.9 * f0.Mn / KIPFT, 379, 0.002);
  const h = flexI('W14X99', 50 * KSI, 14 * 12 * IN, 1);
  near('H.1A: W14×99 φMnx = 642 kip·ft (ala no compacta, F3)', 0.9 * h.Mn / KIPFT, 642, 0.003);
  near('H.1A: W14×99 φMny = 311 kip·ft (F6)', 0.9 * flexIy('W14X99', 50 * KSI).Mn / KIPFT, 311, 0.003);
  const p = compAISC('W14X99', 50 * KSI, 14 * 12 * IN, 14 * 12 * IN);
  near('H.1A: W14×99 φPn = 1130 kip (Lc = 14 ft)', 0.9 * p.Pn / KIP, 1130, 0.004);
  const g = us('Cb = CbF1(1, 0.4375, 0.75, 0.9375)\nLp = LpF2(1.51 in, 50 ksi)\nLr = LrF2(1.75 in, 50 ksi, 0.3 in^4, 33.4 in^3, 11.8 in)');
  near('Cb uniforme entre apoyo y centro = 1.30 (F1-1)', g('Cb'), 1.299, 0.001);
  near('W12×26 Lp = 5.33 ft (Tabla 3-2)', g('Lp', 'ft'), 5.33, 0.003);
  near('W12×26 Lr = 14.9 ft (Tabla 3-2)', g('Lr', 'ft'), 14.9, 0.005);
  const hss = us('Mn = MnHSS("HSS6X6X3/8", 46 ksi)');
  near('HSS6×6×3/8 compacto: Mn = Fy·Zx', hss('Mn', 'kip*in'), 46 * 15.8, 1e-6);
}

section('Cortante (AISC 360 G2) — Design Example G.1A');
{
  const v = shearAISC('W24X62', 50 * KSI);
  near('G.1A: W24×62 φvVn = 306 kip (φv = 1.0, Cv1 = 1)', v.phi * v.Vn / KIP, 306, 0.002);
  const g = us('Cv = Cv1G2(80, 50 ksi)');
  near('Cv1 = 1.10√(kvE/Fy)/(h/tw) para h/tw = 80', g('Cv'), 1.10 * Math.sqrt(5.34 * 29000 / 50) / 80, 1e-9);
}

section('Interacción H1 — Design Example H.1A');
{
  const g = us(`Fy = 50 ksi
r = H1(400 kip, 0.9*PnE3("W14X99", Fy, 14 ft, 14 ft), 250 kip*ft, 0.9*MnW("W14X99", Fy, 14 ft, 1), 80 kip*ft, 0.9*MnyW("W14X99", Fy))
r2 = H1(400 kip, 1130 kip, 250 kip*ft, 642 kip*ft, 80 kip*ft, 311 kip*ft)`);
  near('H.1A con valores de tabla: 0.928', g('r2'), 0.928, 0.002);
  near('H.1A con funciones de librería: 0.928', g('r'), 0.928, 0.003);
}

section('Conexiones (AISC 360 J2, J3, J4, J10) — Manual Tablas 7-1, 7-5, 8-4');
{
  const g = us(`rv = 0.75*FnvJ3("A325", "N")*Abolt(0.75 in)
rvx = 0.75*FnvJ3("A490", "X")*Abolt(1 in)
dh = dhJ3(0.75 in)
dh2 = dhJ3(1 in)
dhm = dhJ3(20 mm)
rb = 0.75*RnAplast(0.75 in, 0.5 in, 58 ksi)
rw = 0.75*RnFilete(1/16 in, 1 in, 70 ksi)
rw90 = 0.75*RnFilete(1/16 in, 1 in, 70 ksi, 90 deg)
bs = RnBloque(5 in^2, 4 in^2, 1 in^2, 36 ksi, 58 ksi, 1)
Ft = FntpJ3(FntJ3("A325"), FnvJ3("A325", "N"), 30 ksi)
U = UD3(1.18 in, 9 in)
ry = RnJ10y(50 ksi, 0.5 in, 1 in, 4 in)
wmin = wminJ2(0.5 in)`);
  near('Tabla 7-1: ¾" Grupo A-N corte simple φrn = 17.9 kip', g('rv', 'kip'), 17.9, 0.003);
  near('Tabla 7-1: 1" Grupo B-X corte simple φrn = 49.5 kip', g('rvx', 'kip'), 49.5, 0.003);
  near('Tabla J3.3: agujero estándar ¾" = 13/16"', g('dh', 'in'), 13 / 16, 1e-9);
  near('Tabla J3.3: agujero estándar 1" = 1⅛"', g('dh2', 'in'), 1.125, 1e-9);
  near('Tabla J3.3M: agujero estándar M20 = 22 mm', g('dhm', 'mm'), 22, 1e-9);
  near('Aplastamiento ¾" en t = ½" A36: φ2.4dtFu = 39.2 kip', g('rb', 'kip'), 39.15, 0.002);
  near('Filete E70 por 1/16 in y in: φRn = 1.392 kip/in (Manual Part 8)', g('rw', 'kip'), 1.392, 0.001);
  near('Filete cargado transversalmente: ×1.5 (J2-5)', g('rw90', 'kip'), 1.5 * 1.392, 0.001);
  near('Bloque de cortante J4-5 = min(0.6FuAnv, 0.6FyAgv) + UbsFuAnt', g('bs', 'kip'), Math.min(0.6 * 58 * 4, 0.6 * 36 * 5) + 58, 1e-6);
  near("F'nt = 1.3Fnt − Fnt/(φFnv)·frv (J3-3a)", g('Ft', 'ksi'), 1.3 * 90 - 90 / (0.75 * 54) * 30, 1e-6);
  near('U = 1 − x̄/l = 0.869 (Ej. D.2)', g('U'), 0.869, 0.001);
  near('J10-2: Rn = Fy·tw·(5k + lb)', g('ry', 'kip'), 50 * 0.5 * (5 + 4), 1e-6);
  near('Tabla J2.4: filete mínimo para t = ½" es 3/16"', g('wmin', 'in'), 3 / 16, 1e-9);
}

section('Construcción compuesta y conformados en frío');
{
  const g = us(`Ec = EcAISC(4 ksi, 145 lbf/ft^3)
Qn = QnI8(0.442 in^2, 4 ksi, Ec, 65 ksi, 1.0, 0.75)
rho = rhoAISI(60, 33 ksi, 29500 ksi, 4)`);
  near('Ec = 145^1.5·√4 = 3492 ksi (I2.1b)', g('Ec', 'ksi'), 145 ** 1.5 * 2, 1e-6);
  near('Qn de perno ¾": min(0.5Asa√(f′cEc), RgRpAsaFu) = 21.5 kip (Manual Tabla 3-21)', g('Qn', 'kip'), 21.5, 0.005);
  const lam = 1.052 / 2 * 60 * Math.sqrt(33 / 29500);
  near('AISI ρ = (1 − 0.22/λ)/λ (Ap. 1, Ec. 1.1-3)', g('rho'), (1 - 0.22 / lam) / lam, 1e-9);
}

section('Bloques');
{
  settings.sys = 'us';
  const g = block('steelsec', { perfil: 'W14X132', tabla: true });
  near('steelsec exporta Zx = 234 in³', g('Zx', 'in^3'), 234, 1e-6);
  near('steelsec exporta λf = bf/2tf = 7.15', g('lambdaf'), 7.15, 1e-6);
  truthy('steelsec dibuja el perfil y la tabla', /<svg/.test(g.html) && /tbl/.test(g.html));
  const v = block('steelsec', { perfil: 'p', sufijo: 'c' }, 'p = "HSS6X6X3/8"');
  near('steelsec lee una variable de texto y aplica sufijo: Zx_c', v('Zx_c', 'in^3'), 15.8, 1e-6);
  for (const n of ['IPE300', 'HEB200', 'C10X15.3', 'L4X4X1/2', 'HSS6.625X0.280', 'PIPE4STD', 'CF150X50X15X2']) {
    let ok = true; try { block('steelsec', { perfil: n }); } catch (e) { ok = false; }
    truthy('steelsec dibuja ' + n, ok);
  }
  // Grupo de pernos: 1 columna de 4 pernos a 3 in, P = 20 kip vertical con e = 3 in
  const b = block('boltgroup', { filas: '4', columnas: '1', sy: '3 in', sx: '3 in', P: '20 kip', ang: '0', ex: '3 in', ey: '0 in' });
  const Ip = 2 * (1.5 ** 2 + 4.5 ** 2), rv = 20 / 4, rh = 20 * 3 * 4.5 / Ip;
  near('Grupo de pernos: Ip = Σ(x²+y²) = 45 in²', b('Ip', 'in^2'), Ip, 1e-9);
  near('Grupo de pernos: r máx = √((P/n)² + (M·y/Ip)²)', b('Rmax', 'kip'), Math.hypot(rv, rh), 1e-9);
  const b2 = block('boltgroup', { filas: '3', columnas: '2', sy: '3 in', sx: '3 in', P: '30 kip', ang: '0', ex: '0 in', ey: '0 in' });
  near('Grupo concéntrico: r = P/n', b2('Rmax', 'kip'), 5, 1e-9);
  // Armadura Pratt resuelta por nudos frente a fórmulas de secciones (wL²/8h, (R − P/2)/sen α)
  settings.sys = 'tec';
  const tr = block('armadura', { L: '12 m', h: '0.8 m', np: '8', w: '0.36 tonf/m', tipo: 'pratt' });
  near('Armadura (nudos): cuerda superior = wL²/(8h)', tr('Ncs', 'tonf'), 0.36 * 144 / 8 / 0.8, 1e-9);
  near('Armadura (nudos): diagonal extrema = (R − P/2)/sen α', tr('Ndt', 'tonf'), (2.16 - 0.27) * Math.hypot(1.5, 0.8) / 0.8, 1e-9);
  near('Armadura (nudos): reacción = wL/2', tr('Rtr', 'tonf'), 2.16, 1e-9);
  const th = block('armadura', { L: '12 m', h: '0.8 m', np: '8', w: '0.36 tonf/m', tipo: 'howe' });
  near('Armadura Howe: diagonal extrema en compresión = (R − P/2)/sen α', th('Ndc', 'tonf'), (2.16 - 0.27) * Math.hypot(1.5, 0.8) / 0.8, 1e-9);
  // Placa base: m, n y λn' de DG1 para W10×49 en placa 35×35 cm
  settings.sys = 'tec';
  const p = block('basepl', { perfil: 'W10X49', N: '35 cm', B: '35 cm', tp: '25 mm', na: '4', da: '19 mm', ed: '5 cm', N2: '50 cm', B2: '50 cm', hef: '30 cm' });
  const d = getShape('W10X49').p.d * 2.54, bf = getShape('W10X49').p.bf * 2.54;
  near('Placa base: m = (N − 0.95d)/2', p('m_pl', 'cm'), (35 - 0.95 * d) / 2, 1e-6);
  near('Placa base: n = (B − 0.8bf)/2', p('n_pl', 'cm'), (35 - 0.8 * bf) / 2, 1e-6);
  near("Placa base: λn' = √(d·bf)/4", p('lambdanp', 'cm'), Math.sqrt(d * bf) / 4, 1e-6);
}

section('Plantillas contra ejemplos resueltos');
{
  let g = runTemplate('st-columna');
  near('Plantilla columna = AISC E.1A: φcPn = 893 kip', g('phiPn', 'kip'), 893, 0.002);
  near('Plantilla columna: Pu = 1.2·140 + 1.6·420 = 840 kip', g('Pu', 'kip'), 840, 1e-9);
  near('Plantilla columna: función PnE3 = cálculo paso a paso', g('Pn_lib', 'kip'), g('Pn', 'kip'), 1e-6);
  g = runTemplate('st-vigacolumna');
  near('Plantilla viga-columna = AISC H.1A: relación 0.928', g('ratio'), 0.928, 0.003);
  near('Plantilla viga-columna: φMnx = 642 kip·ft', g('phiMnx', 'kip*ft'), 642, 0.003);
  g = runTemplate('st-traccion', (d) => { d.blocks[2].src = d.blocks[2].src.replace('db = 7/8 in', 'db = 3/4 in').replace('P_D = 15 kip', 'P_D = 20 kip').replace('P_L = 45 kip', 'P_L = 60 kip'); });
  near('Tracción con datos de AISC D.2: φtPn fluencia = 122 kip', g('phiPy', 'kip'), 121.5, 0.001);
  near('Tracción con datos de AISC D.2: An = 3.31 in²', g('An', 'in^2'), 3.3125, 0.001);
  near('Tracción con datos de AISC D.2: φtPn rotura = 125 kip', g('phiPr', 'kip'), 125, 0.003);
  g = runTemplate('st-shear-tab');
  { const Ip = 2 * (3.75 ** 2 + 11.25 ** 2), M = 18 * 7.5; near('Shear tab: perno crítico (elástico) = √(4.5² + (M·y/Ip)²) t', g('Rmax', 'tonf'), Math.hypot(4.5, M * 11.25 / Ip), 1e-6); }
  g = runTemplate('st-placa-base');
  { const d = getShape('W10X49').p.d * 2.54, bf = getShape('W10X49').p.bf * 2.54, A1 = 45 * 35, Pp = 0.65 * 0.85 * 210 * A1 * Math.min(Math.sqrt(3000 / A1), 2) / 1000, Pu = 1.2 * 50 + 1.6 * 40;
    const X = 4 * d * bf / (d + bf) ** 2 * Pu / Pp, lam = Math.min(1, 2 * Math.sqrt(X) / (1 + Math.sqrt(1 - X)));
    const l = Math.max((45 - 0.95 * d) / 2, (35 - 0.8 * bf) / 2, lam * Math.sqrt(d * bf) / 4);
    near('Placa base DG1: φPp = 0.65·0.85f′c·A1·√(A2/A1)', g('phiPp', 'tonf'), Pp, 1e-6);
    near('Placa base DG1: tp req = ℓ√(2Pu/(0.9FyBN))', g('tpreq', 'cm'), l * Math.sqrt(2 * Pu * 1000 / (0.9 * 2530 * A1)), 1e-6); }
  g = runTemplate('st-correas');
  { const A = 544e-6, wD = 10 * 1.2 + A * 7850, wLr = 30 * 1.2 * Math.cos(Math.PI / 18), wu = 1.2 * wD + 1.6 * wLr;
    near('Correas: Mux = wu·cosθ·L²/8 (kgf·m)', g('Mux', 'kgf*m'), wu * Math.cos(Math.PI / 18) * 36 / 8, 1e-6);
    near('Correas: presión de viento 0.005·1.0·75² = 28.1 kgf/m² (E.020)', g('ph', 'kgf/m^2'), 28.125, 1e-6); }
  g = runTemplate('st-armadura');
  near('Armadura: cuerda superior = wL²/(8h) = 8.1 t', g('Fcs', 'tonf'), 0.36 * 144 / 8 / 0.8, 1e-6);
  near('Armadura: diagonal extrema = (R − P/2)/sen α = 4.02 t', g('Fd', 'tonf'), (2.16 - 0.27) / (0.8 / Math.hypot(1.5, 0.8)), 1e-6);
  g = runTemplate('st-nave');
  { near('Nave (frame2d a dos aguas): empuje bajo CM = Kleinlogel wL²(3+5m)/(16hN)', Math.abs(g('R1x_CM', 'tonf')), g('HKL', 'tonf'), 0.005);
    near('Nave: K de pórtico no arriostrado con GA = 10, GB = 2.22 ≈ 2.16', g('Kx'), 2.159, 0.002);
    const V = 0.45 * 1 * 1.05 * Math.max(2.5 / 4, 0.11) * g('Psis', 'tonf');
    near('Nave: V = ZUCS·P/R (E.030, C = 2.5, R = 4)', g('Vsis', 'tonf'), V, 1e-6);
    truthy('Nave: B2 entre 1.0 y 1.5 (Apéndice 8)', g('B2') > 1 && g('B2') < 1.5, 'B2 = ' + g('B2').toFixed(3)); }
  g = runTemplate('st-compuesta');
  near('Viga compuesta: Qn = Rg·Rp·Asa·Fu = 7.82 t (I8-1)', g('Qn', 'tonf'), 0.6 * Math.PI * 1.905 ** 2 / 4 * 4570 / 1000, 1e-6);
  near('Viga compuesta: φMn = 28.7 t·m (cálculo manual)', g('phiMn', 'tonf*m'), 28.7, 0.003);
  g = runTemplate('st-viga-ipe');
  near('Viga IPE300: Lp = 1.59 m', g('Lp', 'm'), 1.59, 0.003);
  near('Viga IPE300: Lr (AISC F2-6) = 5.10 m', g('Lr', 'm'), 5.097, 0.003);
  near('Viga IPE300: Cb = 1.30', g('Cb'), 1.299, 0.001);
  for (const t of TEMPLATES.filter(x => x.id.startsWith('st-'))) {
    const r = runTemplate(t.id).res.ctx;
    truthy(`Plantilla «${t.name}»: sin errores y todo cumple`, r.errors.length === 0 && r.checks.length > 0 && r.checks.every(c => c.ok), `${r.checks.length} verif., ${r.errors.length} errores ${r.errors.map(e => e.msg).join('; ')}`);
  }
  truthy('Al menos 11 plantillas de acero (incluye la casa metálica)', TEMPLATES.filter(x => x.id.startsWith('st-')).length >= 11);
}

section('Revisión 2026 — base de datos: consistencia y contraste con AISC v15/v16 y ArcelorMittal');
{
  // consistencia interna de toda la base: r = √(I/A), S = I/(d/2) en perfiles I
  let bad = 0, n = 0;
  for (const s of SHAPES.values()) { const p = s.p; if (!(p.A && p.Ix && p.rx)) continue; n++;
    if (Math.abs(Math.sqrt(p.Ix / p.A) - p.rx) / p.rx > 0.02) bad++;
    if (p.Iy && p.ry && Math.abs(Math.sqrt(p.Iy / p.A) - p.ry) / p.ry > 0.02) bad++;
    if ((s.fam === 'I' || s.fam === 'E') && Math.abs(p.Ix / (p.d / 2) - p.Sx) / p.Sx > 0.02) bad++; }
  truthy(`Consistencia r = √(I/A) y Sx = 2Ix/d en ${n} perfiles`, bad === 0, bad + ' discrepancias');
  truthy('Ángulos desiguales: d = ala larga (vertical, coherente con Ix, ȳ de la Tabla 1-7)', [...SHAPES.values()].filter(s => s.fam === 'L').every(s => s.p.d >= s.p.b2 && (s.p.d === s.p.b2 || s.p.y > s.p.x)));
  near('L6×4×½: d = 6 in (ala larga), b = 4 in', getShape('L6X4X1/2').p.d, 6, 1e-9);
  // 20 perfiles al azar contra el Manual AISC (valores tabulados)
  const aisc = [['W44X335', 'A', 98.5], ['W44X335', 'Ix', 31100], ['W33X201', 'Zx', 773], ['W33X201', 'Ix', 11600], ['W8X10', 'Zx', 8.87], ['W8X10', 'Ix', 30.8],
    ['S4X9.5', 'A', 2.79], ['C6X10.5', 'Ix', 15.1], ['MC4X13.8', 'A', 4.03], ['L3X3X1/2', 'A', 2.76], ['HSS16X12X3/8', 'A', 18.7], ['HSS16X12X3/8', 'Ix', 702],
    ['HSS16X12X3/8', 'J', 862], ['HSS16X12X3/8', 'Zx', 104], ['HSS6X3X3/8', 'A', 5.48], ['HSS5X4X3/16', 'tdes', 0.174], ['HSS8X2X1/4', 'Ix', 28.5], ['HSS7X5X1/8', 'A', 2.70],
    ['HSS4.500X0.188', 'A', 2.36], ['W12X26', 'Ix', 204]];
  for (const [n, k, v] of aisc) near(`AISC ${n} ${k}`, getShape(n).p[k], v, 0.005);
  // 5 perfiles europeos contra ArcelorMittal (A, Iy, Wpl,y, It, Iw)
  const am = [['IPE200', 28.48, 1943, 220.6, 6.98, 12990], ['IPE400', 84.46, 23130, 1307, 51.08, 490000], ['HEB300', 149.1, 25170, 1869, 185.0, 1688000], ['HEB160', 54.25, 2492, 354.0, 31.24, 47940], ['HEA240', 76.84, 7763, 744.6, 41.55, 328500]];
  for (const [n, A, I, Z, J, Cw] of am) { const p = getShape(n).p; near(`${n} A, Iy, Wpl,y, It, Iw (ArcelorMittal)`, (p.A / A + p.Ix / I + p.Zx / Z + p.J / J + p.Cw / Cw) / 5, 1, 0.002); }
}

section('Revisión 2026 — perfiles T (WT) y dobles ángulos 2L (propiedades calculadas)');
{
  const t = getShape('WT6X13').p;  // AISC Shapes Database: y = 1.25, Ix = 11.7, Zx = 4.20, Sx = 2.40, ro = 2.54, H = 0.827, Cw = 0.174
  near('WT6×13 ȳ = 1.25 in (AISC)', t.y, 1.25, 0.01); near('WT6×13 Ix = 11.7 in⁴ (AISC)', t.Ix, 11.7, 0.01);
  near('WT6×13 Zx = 4.20 in³ (AISC)', t.Zx, 4.20, 0.01); near('WT6×13 Sx = 2.40 in³ (AISC)', t.Sx, 2.40, 0.01);
  near('WT6×13 r̄o = 2.54 in (AISC)', t.ro, 2.54, 0.01); near('WT6×13 H = 0.827 (AISC)', t.H3, 0.827, 0.005); near('WT6×13 Cw = 0.174 in⁶ (AISC)', t.Cw, 0.174, 0.01);
  near('2L4×4×½ (s = 3/8 in): ry = 1.83 in (Manual Tabla 1-15)', getShape('2L4X4X1/2').p.ry, 1.83, 0.005);
  near('2L4×4×½: A = 2·3.75 in²', getShape('2L4X4X1/2X3/4').p.A, 7.5, 1e-9);
}

section('Revisión 2026 — ejemplos AISC adicionales (E4, E5, E7, F4/F5, F7, F9, G3)');
{
  // AISC Design Examples v15/v16, Ej. E.8: WT7×15 A992, Lc = 20 ft → Fex = 21.3, Fey = 11.0, Fe = 10.5 ksi, Fcr = 9.21 ksi, Pn/Ω = 24.4 kip
  const w = compAISC('WT7X15', 50 * KSI, 20 * 12 * IN, 20 * 12 * IN);
  near('E.8: WT7×15 Fe (flexo-torsional E4) = 10.5 ksi', w.Fe / KSI, 10.5, 0.005);
  near('E.8: WT7×15 Fcr = 9.21 ksi', w.Fcr / KSI, 9.21, 0.003);
  near('E.8: WT7×15 Pn/Ωc = 24.4 kip (ASD)', w.Pn / KIP / 1.67, 24.4, 0.003);
  // Ej. E.10: HSS12×8×3/16 A500 Gr. C (50 ksi), Lc = 24 ft → Fcr = 29.1 ksi, Ae = 5.77 in² (E7)
  const h = compAISC('HSS12X8X3/16', 50 * KSI, 24 * 12 * IN, 24 * 12 * IN);
  near('E.10: HSS12×8×3/16 Fcr = 29.1 ksi', h.Fcr / KSI, 29.1, 0.003);
  near('E.10: HSS12×8×3/16 Ae = 5.77 in² (E7)', h.Ae / IN ** 2, 5.77, 0.003);
  // E5: ángulo simple, verificación de las ecuaciones E5-1/E5-2
  const a = compE5('L3X3X1/4', 36 * KSI, 4 * 12 * IN), Lr = 48 / getShape('L3X3X1/4').p.rx;
  near('E5-1: Lc/r = 72 + 0.75·L/ra (L/ra ≤ 80)', a.esb, 72 + 0.75 * Lr, 1e-9);
  const a2 = compE5('L2X2X1/8', 36 * KSI, 8 * 12 * IN), a3 = compE5('L2X2X1/8', 36 * KSI, 0.5 * 12 * IN), Lr2 = 96 / getShape('L2X2X1/8').p.rx;
  near('E5-2: Lc/r = 32 + 1.25·L/ra (L/ra > 80)', a2.esb, 32 + 1.25 * Lr2, 1e-9);
  truthy('E5 + E7: L2×2×1/8 (b/t = 16 > 0.45√(E/Fy) = 12.8) con L = 6 in tiene Ae < Ag', a3.Ae < a3.A);
  // F5: viga armada 50 × ⅝ … d = 50 in, bf = 16 in, tf = 1 in, tw = 5/16 in, Fy = 50 ksi, Lb = 0 (cálculo manual)
  const pg = mnF4F5({ d: 50 * IN, bf: 16 * IN, tf: 1 * IN, tw: 5 / 16 * IN }, 50 * KSI, 0);
  { const Sx = (16 * 50 ** 3 - (16 - 5 / 16) * 48 ** 3) / 300, aw = 48 * 5 / 16 / 16, Rpg = 1 - aw / (1200 + 300 * aw) * (48 / (5 / 16) - 5.7 * Math.sqrt(580));
    near('F5 (alma esbelta): Mn = Rpg·Fy·Sxc (cálculo manual)', pg.Mn / KIPFT, Rpg * 50 * Sx / 12, 1e-6); }
  // F4: continuidad con F2 en λw = λpw (Rpc = Mp/My)
  const tw4 = 48 / (3.76 * Math.sqrt(580)) * 1.0001;
  const f4 = mnF4F5({ d: 50 * IN, bf: 16 * IN, tf: 1 * IN, tw: tw4 * IN }, 50 * KSI, 0);
  near('F4: en λw = λpw, Mn = Mp (continuidad con F2)', f4.Mn / f4.Mp, 1, 0.001);
  truthy('MnW ya no da error con alma no compacta (W con Fy alto evaluado por F4)', (() => { try { flexI('W44X230', 100 * KSI, 0); return true; } catch (e) { return false; } })());
  // F9: WT6×13 sin PLT, alma en tracción: Mn = min(FyZx, 1.6My)
  const ft = flexT('WT6X13', 50 * KSI, 0);
  near('F9-2: WT6×13 Mn = min(FyZx, 1.6My) (alma en tracción)', ft.Mn / (KIP * IN), Math.min(50 * getShape('WT6X13').p.Zx, 1.6 * 50 * getShape('WT6X13').p.Sx), 1e-6);
  truthy('F9: alma en compresión resiste menos que en tracción', flexT('WT6X13', 50 * KSI, 10 * 12 * IN, 1, 'compresion').Mn < flexT('WT6X13', 50 * KSI, 10 * 12 * IN).Mn);
  // F7: HSS12×12×3/16 (b/t = 66 > 1.40√(E/Fy)) → ala esbelta con Se < Sx
  const fh = flexHSS('HSS12X12X3/16', 46 * KSI);
  truthy('F7-3: ala esbelta, Mn < Fy·Sx', fh.Mn < 46 * KSI * getShape('HSS12X12X3/16').p.Sx * IN ** 3, fh.estado);
  // G3 (AISC Design Example G.4): L5×3×¼ A36, ala larga vertical: φvVn = 0.9·0.6·36·5·0.25 = 24.3 kip
  const vg = shearAISC('L5X3X1/4', 36 * KSI);
  near('G.4: L5×3×¼ φvVn = 24.3 kip (G3, Cv2 = 1)', vg.phi * vg.Vn / KIP, 24.3, 0.002);
  // AISI S100 §1.3: ala con labio adecuado (RI = 1) → k = 4.82 − 5D/w + 0.43
  const kl = kLabioAISI(23, 0.326, 6.5, 248e6);
  near('AISI §1.3: k = (4.82 − 5D/w)·RI^n + 0.43 con RI = 1', kl.k, 4.82 - 5 * 0.326 + 0.43, 1e-9);
}

section('Revisión 2026 — placa base: anclajes ACI 318-19 Cap. 17');
{
  const g = runTemplate('st-placa-base');
  near('Ase de varilla ¾"-10 UNC = 0.334 in² (ACI R17.6.1.2)', g('Ase', 'in^2'), 0.334, 0.005);
  near('Abrg de tuerca hexagonal pesada ¾" = 0.91 in² (DG1 Tabla 3.2)', g('Abrg', 'in^2'), 0.91, 0.01);
  { const hefp = Math.max(12.5 / 1.5, 35 / 3), Nb = 10 * Math.sqrt(210 * 0.0980665) * (hefp * 10) ** 1.5 / 9806.65, psi = 0.7 + 0.3 * 12.5 / (1.5 * hefp);
    near("Arrancamiento: h′ef = máx(ca,máx/1.5, s/3) (17.6.2.1.2)", g('hefp', 'cm'), hefp, 1e-9);
    near('φNcbg = 0.70·ANc/ANco·ψed·Nb (cálculo manual)', g('phiNcbg', 'tonf'), 0.7 * 3000 / (9 * hefp * hefp) * psi * Nb, 1e-6); }
}

section('Revisión 2026 — plantilla «Casa de dos pisos en estructura metálica»');
{
  const g = runTemplate('st-casa');
  near('Casa: Vx = ZUCS·P/R con C = 2.5, R = 4', g('Vx', 'tonf'), 0.45 * 1.05 * 2.5 / 4 * g('Psis', 'tonf'), 1e-9);
  near('Casa: fracción del pórtico de borde 1/4 + 0.05·9·4.5/45 = 0.295', g('ft'), 0.295, 1e-9);
  near('Casa: Fbr = V/(2 cos θ) en la cruz', g('Fbr', 'tonf'), g('VY1', 'tonf') / (2 * 3 / Math.hypot(3, 2.8)), 1e-9);
  // Conexiones con sobrerresistencia (AISC 341-16 F1.6a, E1.6b; ASCE 7-16 Tabla 12.2-1)
  near('Casa: RyFyAg del arriostre = 1.4·3235·A', g('Tye', 'tonf'), 1.4 * 3235 * g('A_b', 'cm^2') / 1000, 1e-9);
  near('Casa: Tu de la conexión del arriostre = mín(Ω0·Fbr, RyFyAg) con Ω0 = 2', g('Tu_b', 'tonf'), Math.min(2 * g('Fbr', 'tonf'), g('Tye', 'tonf')), 1e-9);
  truthy('Casa: M con Ω0·CS > M de la envolvente E.090 y Muc = mín(1.1RyMp, MΩ0)', g('Mmax_VIG_o', 'tonf*m') > g('Mmax_VIG', 'tonf*m') && Math.abs(g('Muc', 'tonf*m') - Math.min(1.1 * 1.1 * g('Zx_v', 'cm^3') * 3515 / 1e5, g('Mmax_VIG_o', 'tonf*m'))) < 1e-9);
  near('Casa: fuerza de ala Ffu = Muc/(d + tp)', g('Ffu', 'tonf'), g('Muc', 'tonf*m') * 100 / (g('d_v', 'cm') + 1.59), 1e-9);
  near('Casa: ancho de Whitmore = B + 2·lw·tan 30°', g('bwh', 'cm'), 7.62 + 2 * 10 * Math.tan(Math.PI / 6), 1e-6);
  near('Casa: U = 1 − x̄/l con x̄ = 3B/8 (HSS cuadrado, Tabla D3.1 caso 6)', g('Ub'), 1 - 3 * 7.62 / 8 / 10, 1e-6);
  near('Casa: KL/r de la cartela = 0.65·15/(t/√12)', g('lamg'), 0.65 * 15 / (0.79 / Math.sqrt(12)), 1e-6);
  // Con Ω0 = 1 la demanda de la conexión del OMF baja a la envolvente sísmica sin sobrerresistencia
  const g1 = runTemplate('st-casa', (d) => d.blocks.forEach(b => { if (b.type === 'calc') b.src = b.src.replace('Omegax = 3.0 //', 'Omegax = 1.0 //'); }));
  truthy('Casa: con Ω0 = 1 el momento «con sobrerresistencia» baja y no supera la envolvente E.090', g1('Mmax_VIG_o', 'tonf*m') < g('Mmax_VIG_o', 'tonf*m') && g1('Mmax_VIG_o', 'tonf*m') <= g1('Mmax_VIG', 'tonf*m') + 1e-6);
}

section('Revisión 2026 — datos extremos: NO CUMPLE sin errores ni NaN');
{
  const ext = [
    ['st-columna', 'P_L = 420 kip', 'P_L = 2500 kip'], ['st-vigacolumna', 'Mux = 250 kip*ft', 'Mux = 900 kip*ft'], ['st-traccion', 'P_L = 45 kip', 'P_L = 200 kip'],
    ['st-shear-tab', 'Vu = 18 tonf', 'Vu = 60 tonf'], ['st-placa-base', 'P_L = 40 tonf', 'P_L = 400 tonf'], ['st-correas', 'Lc = 6 m', 'Lc = 11 m'],
    ['st-armadura', 'Lt = 12 m', 'Lt = 30 m'], ['st-nave', 'Lf = 10 m', 'Lf = 30 m'], ['st-compuesta', 'Lv = 9 m', 'Lv = 16 m'],
    ['st-viga-ipe', 'wLs = 1.0 tonf/m', 'wLs = 6 tonf/m'], ['st-casa', 'h1 = 2.8 m', 'h1 = 6 m'],
    ['st-casa', 'nbf = 6 //', 'nbf = 2 //'], ['st-casa', 'lw = 10 cm', 'lw = 5 cm'], ['st-casa', 'Lg = 15 cm', 'Lg = 80 cm'],
  ];
  for (const [id, a, b] of ext) {
    const r = runTemplate(id, (d) => { const bl = d.blocks.find(x => x.type === 'calc' && x.src.includes(a)); bl.src = bl.src.replace(a, b); }).res.ctx;
    const nan = r.checks.some(c => c.ratio !== undefined && !Number.isFinite(+c.ratio));
    truthy(`${id} con ${b}: sin errores, sin NaN y alguna verificación NO CUMPLE`, r.errors.length === 0 && !nan && r.checks.some(c => !c.ok), `${r.errors.length} errores ${r.errors.map(e => e.msg).join('; ').slice(0, 160)}; ${r.checks.filter(c => !c.ok).length} no cumplen`);
  }
}
void math;
section('QA de plantillas: «validacion» y rangos usuales [mín..máx] de los datos');
for (const t of TEMPLATES.filter(x => x.id.startsWith('st-'))) {
  const v = t.validacion;
  truthy(`${t.id}: tiene «validacion» con fuente, nota y valores`, !!(v && v.fuente && v.nota && Array.isArray(v.valores) && v.valores.length >= 3));
  const r = runTemplate(t.id).res, ins = r.ctx.inputs.filter(i => i.range);
  const fuera = ins.filter(i => { const x = parseFloat(i.num); return !(x >= i.range.min && x <= i.range.max); });
  truthy(`${t.id}: ${ins.length} datos con rango usual, valores por defecto dentro del rango`, ins.length >= 3 && fuera.length === 0, fuera.map(i => i.name + ' = ' + i.num).join(', '));
  const sinEtq = r.ctx.inputs.filter(i => !i.label);
  truthy(`${t.id}: todos los datos tienen etiqueta`, sinEtq.length === 0, sinEtq.map(i => i.name).join(', '));
}
section('Segunda opinión — segunda tanda (st-placa-base)');
{ const sub2 = (pairs) => (d) => { for (const [a, b] of pairs) { let hit = false; d.blocks.forEach(x => { if (typeof x.src === 'string' && x.src.includes(a)) { x.src = x.src.replace(a, b); hit = true; } }); if (!hit) throw new Error('No se encontró: ' + a); } };
  const g = runTemplate('st-placa-base');
  near('Placa base: con sismo las resistencias del concreto se multiplican por 0.75 (ACI 318-19 17.10.5.4)', g('fsis'), 0.75, 1e-9);
  const g2 = runTemplate('st-placa-base', sub2([['Nua = 4 tonf', 'Nua = 7.5 tonf']]));
  truthy('Placa base: Nua = 7.5 t ≤ φNcbg (9.14 t) pero > 0.75·φNcbg → NO CUMPLE con sismo', g2.res.ctx.checks.some(c => !c.ok && /con sismo/.test(c.label)) && g2.res.ctx.checks.filter(c => /^Arrancamiento del concreto \(si no/.test(c.label)).every(c => c.ok));
}
done();
