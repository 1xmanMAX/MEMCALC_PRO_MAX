// Pruebas del módulo «steel»: base de perfiles AISC/europea, funciones AISC 360,
// bloques (steelsec, basepl, boltgroup) y plantillas contra ejemplos resueltos.
import { near, truthy, calc, block, runTemplate, section, done, TEMPLATES, math } from './helpers.mjs';
import { settings } from '../src/engine.js';
import { getShape, compAISC, flexI, flexIy, shearAISC, fcrE3 } from '../src/norms/steel.js';

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
  { const d = getShape('W10X49').p.d * 2.54, bf = getShape('W10X49').p.bf * 2.54, A1 = 35 * 35, Pp = 0.65 * 0.85 * 210 * A1 * Math.min(Math.sqrt(2500 / A1), 2) / 1000, Pu = 1.2 * 50 + 1.6 * 40;
    const X = 4 * d * bf / (d + bf) ** 2 * Pu / Pp, lam = Math.min(1, 2 * Math.sqrt(X) / (1 + Math.sqrt(1 - X)));
    const l = Math.max((35 - 0.95 * d) / 2, (35 - 0.8 * bf) / 2, lam * Math.sqrt(d * bf) / 4);
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
  { const k = 0.45; near('Nave: Kleinlogel cg = 1/(4(2k+3))', g('cg'), 1 / (4 * (2 * k + 3)), 1e-9);
    near('Nave: K de pórtico no arriostrado con GA = 10, GB = 2.22 ≈ 2.16', g('Kx'), 2.159, 0.002); }
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
  truthy('Al menos 10 plantillas de acero', TEMPLATES.filter(x => x.id.startsWith('st-')).length >= 10);
}
void math;
done();
