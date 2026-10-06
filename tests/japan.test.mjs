// Pruebas de validación — módulo «japan» (BSL, AIJ, JRA)
import { near, truthy, calc, block, runTemplate, section, done, TEMPLATES, math } from './helpers.mjs';

section('BSL — coeficientes sísmicos (Notif. 1793)');
{
  const g = calc('Z = ZBSL(2)\nTc = TcBSL(3)\nT = TBSL(15 m, 0)\nTs = TBSL(30 m, 1)\nRt = RtBSL(1.0 s, 0.6 s)');
  near('Z zona 2 = 0.9', g('Z'), 0.9);
  near('Tc suelo tipo 3 = 0.8 s', g('Tc', 's'), 0.8);
  near('T = h(0.02 + 0.01α): RC, h = 15 m → 0.30 s', g('T', 's'), 0.30);
  near('T = h(0.02 + 0.01α): acero, h = 30 m → 0.90 s', g('Ts', 's'), 0.90);
  near('Rt(T = 1.0, Tc = 0.6) = 1 − 0.2(T/Tc − 1)²', g('Rt'), 1 - 0.2 * (1 / 0.6 - 1) ** 2);
}

section('Distribución Ai — edificio de 5 pisos con pesos iguales, T = 0.3 s (cálculo manual)');
{
  // αi = 1, 0.8, 0.6, 0.4, 0.2 ; 2T/(1+3T) = 0.6/1.9
  const k = 0.6 / 1.9, a = [1, 0.8, 0.6, 0.4, 0.2], Ai = a.map(x => 1 + (1 / Math.sqrt(x) - x) * k);
  const g = block('aidist', { wi: '1000, 1000, 1000, 1000, 1000', hi: '3, 3, 3, 3, 3', T: '0.3 s', Z: '1', Tc: '0.6', Co: '0.2' });
  const v = g.ctx.scope.get('Ai').toArray();
  near('A2 = 1.1004', v[1], 1.1004, 0.001);
  near('A3 = 1.2182', v[2], 1.2182, 0.001);
  near('A4 = 1.3730', v[3], 1.3730, 0.001);
  near('A5 = 1.6430 (último piso)', v[4], Ai[4], 0.0005);
  near('Cortante basal Q1 = 0.2·5000 = 1000 kN', g('Qb', 'kN'), 1000);
  const Q = g.ctx.scope.get('Qi').toArray().map(q => q.toNumber('kN'));
  near('Q5 = C5·w5 = 0.2·A5·1000 kN', Q[4], 0.2 * Ai[4] * 1000);
  truthy('El bloque aidist dibuja la figura SVG', /<svg/.test(g.html));
}

section('Ds y Fes (Notif. 1792) — tablas oficiales (MEXT 2024, tablas 6.1 y 6.2; Sato 2011, tabla 2.8)');
{
  const g = calc('a = DsRC(1, 1, 0)\nb2 = DsRC(2, 1, 0.5)\nc = DsRC(4, 1, 0.8)\nd = DsS(1, 1, 0)\ne = DsS(3, 2, 0.5)\nf = DsS(4, 3, 0.6)\ng2 = DsS(2, 3, 0.2)\nfe = FeN1792(0.225)\nfs = FsN1792(0.45)\nfes = FesBSL(0.45, 0.4)');
  near('RC FA, pórtico puro: Ds = 0.30', g('a'), 0.30);
  near('RC FB + WA, βu = 0.5: Ds = 0.40', g('b2'), 0.40);
  near('RC FD, βu = 0.8: Ds = 0.55', g('c'), 0.55);
  // Celdas de la tabla oficial de C°A° que NO siguen la regla «rango del menos dúctil» (error corregido en la revisión)
  const r = calc('a1 = DsRC(1, 3, 0.2)\na2 = DsRC(1, 4, 0.2)\na3 = DsRC(3, 1, 0.8)\na4 = DsRC(2, 3, 0.5)\na5 = DsRC(1, 2, 0.5)\na6 = DsRC(1, 4, 0.5)\na7 = DsRC(2, 4, 0.2)\na8 = DsRC(4, 4, 0.5)');
  near('MEXT tabla 6.1: FA + WC, βu ≤ 0.3 → 0.35', r('a1'), 0.35);
  near('MEXT tabla 6.1: FA + WD, βu ≤ 0.3 → 0.40', r('a2'), 0.40);
  near('MEXT tabla 6.1: FC + WA, βu > 0.7 → 0.45', r('a3'), 0.45);
  near('MEXT tabla 6.1: FB + WC, 0.3 < βu ≤ 0.7 → 0.45', r('a4'), 0.45);
  near('MEXT tabla 6.1: FA + WB, 0.3 < βu ≤ 0.7 → 0.40', r('a5'), 0.40);
  near('MEXT tabla 6.1: FA + WD, 0.3 < βu ≤ 0.7 → 0.45', r('a6'), 0.45);
  near('MEXT tabla 6.1: FB + WD, βu ≤ 0.3 → 0.40', r('a7'), 0.40);
  near('MEXT tabla 6.1: FD + WD, 0.3 < βu ≤ 0.7 → 0.50', r('a8'), 0.50);
  near('Acero FA, sin arriostres: Ds = 0.25', g('d'), 0.25);
  near('Acero FC + BB, 0.3 < βu ≤ 0.7: Ds = 0.35', g('e'), 0.35);
  near('Acero FD + BC, βu > 0.5: Ds = 0.50', g('f'), 0.50);
  near('Acero FB + BC, βu ≤ 0.3: Ds = 0.30', g('g2'), 0.30);
  near('Sato tabla 2.8: FD + BB, 0.3 < βu ≤ 0.7 → 0.45', calc('x = DsS(4, 2, 0.5)')('x'), 0.45);
  near('Fe(Re = 0.225) = 1.25 (interpolación 0.15–0.30)', g('fe'), 1.25);
  near('Fs(Rs = 0.45) = 2 − 0.45/0.6 = 1.25', g('fs'), 1.25);
  near('Fes(0.45, 0.40) = 1.25 × 1.5', g('fes'), 1.875);
}

section('AIJ concreto armado');
{
  const g = calc('fsL = fsaAIJ(24 N/mm^2, 1)\nfsS = fsaAIJ(24 N/mm^2, 2)\nfs2 = fsaAIJ(18 N/mm^2, 1)\nfcS = fcaAIJ(24 N/mm^2, 2)\nftL = ftAIJ(345, 1, 25)\nftL2 = ftAIJ(345, 1, 32)\nal = alphaAIJ(180 kN*m, 150 kN, 640 mm, 2)\nQsu = QsuAIJ(0.008, 24 N/mm^2, 2, 0.004, 295 N/mm^2, 0 N/mm^2, 400 mm, 560 mm)\nMu = MuAIJ(2028 mm^2, 379.5 N/mm^2, 640 mm)\nQa = QaAIJ(400 mm, 560 mm, 1.44, 1.095 N/mm^2, 345 N/mm^2, 0.00238)\nn = nAIJ(30 N/mm^2)');
  near('fs largo plazo Fc24 = 0.49 + 0.24 = 0.73 N/mm²', g('fsL', 'N/mm^2'), 0.73);
  near('fs corto plazo Fc24 = 1.095 N/mm²', g('fsS', 'N/mm^2'), 1.095);
  near('fs largo plazo Fc18 = Fc/30 = 0.60 N/mm²', g('fs2', 'N/mm^2'), 0.60);
  near('fc corto plazo = 2Fc/3 = 16 N/mm²', g('fcS', 'N/mm^2'), 16);
  near('ft largo plazo SD345 D25 = 215 N/mm²', g('ftL', 'N/mm^2'), 215);
  near('ft largo plazo SD345 D32 = 195 N/mm²', g('ftL2', 'N/mm^2'), 195);
  near('α = 4/(M/(Qd) + 1) = 4/2.875', g('al'), 4 / 2.875);
  // Fórmula mínima de Arakawa (荒川min式, coef. 0.053; la versión «media» usa 0.068):
  // [0.053·0.8^0.23·42/2.12 + 0.85·√(0.004·295)]·400·560 = (0.9975 + 0.9233)·224000 = 430.3 kN
  near('Qsu Arakawa mín. (b=400, j=560, pt=0.8 %, pw=0.4 %) = 430.3 kN', g('Qsu', 'kN'), (0.053 * 0.8 ** 0.23 * 42 / 2.12 + 0.85 * Math.sqrt(0.004 * 295)) * 224, 0.001);
  near('… valor numérico de control 430.3 kN (con 0.068, «media», daría 493.5)', g('Qsu', 'kN'), 430.3, 0.001);
  near('Mu = 0.9·at·σy·d = 443.3 kN·m', g('Mu', 'kN*m'), 0.9 * 2028 * 379.5 * 640 / 1e6);
  near('QA corto plazo = b·j·(α·fs + 0.5·wft·(pw − 0.002))', g('Qa', 'kN'), 400 * 560 * (1.44 * 1.095 + 0.5 * 345 * 0.00038) / 1000);
  near('n = 13 para 27 < Fc ≤ 36', g('n'), 13);
  const q2 = calc('Qas = QasAIJ(400 mm, 560 mm, 1.0, 1.095 N/mm^2, 295 N/mm^2, 0.003)\nQw = QaAIJ(400 mm, 560 mm, 1.0, 1.095 N/mm^2, 490 N/mm^2, 0.003)');
  near('QAS control de daño = b·j·((2/3)α·fs + 0.5·wft·(pw − 0.002)) (AIJ 2010 ec. 15.3)', q2('Qas', 'kN'), 224 * (2 / 3 * 1.095 + 0.5 * 295 * 0.001));
  near('QA con wft = 490 se limita a wft = 390 N/mm² (AIJ 2010 art. 15)', q2('Qw', 'kN'), 224 * (1.095 + 0.5 * 390 * 0.001));
  // Columna: momento admisible con N = 0 ≈ at·ft·j (sección doblemente armada)
  const c = calc('Ma0 = MaColAIJ(0 kN, 500 mm, 500 mm, 1548 mm^2, 60 mm, 8 N/mm^2, 215 N/mm^2, 15)\nMu = MucAIJ(2027 mm^2, 379.5 N/mm^2, 600 mm, 1800 kN, 600 mm, 24 N/mm^2)');
  near('Columna N = 0: MA ≈ at·ft·(7/8)d', c('Ma0', 'kN*m'), 1548 * 215 * 0.875 * 440 / 1e6, 0.03);
  near('Mu columna = 0.8·at·σy·D + 0.5·N·D(1 − N/bDFc)', c('Mu', 'kN*m'), (0.8 * 2027 * 379.5 * 600 + 0.5 * 1.8e6 * 600 * (1 - 1.8e6 / (600 * 600 * 24))) / 1e6);
  near('Mu columna en tracción N = −500 kN: 0.8·at·σy·D + 0.4·N·D', calc('Mt = MucAIJ(2027 mm^2, 379.5 N/mm^2, 600 mm, -500 kN, 600 mm, 24 N/mm^2)')('Mt', 'kN*m'), (0.8 * 2027 * 379.5 * 600 - 0.4 * 5e5 * 600) / 1e6);
}

section('AIJ acero');
{
  const g = calc('L = LambdaAIJ(235 N/mm^2)\nfc1 = fcAIJ(100, 235 N/mm^2)\nfc2 = fcAIJ(150, 235 N/mm^2)\nib = ibHJIS(400200)\nfb = fbAIJ(6000 mm, ib, 400 mm, 2600 mm^2, 235 N/mm^2, 1)\nC = CbAIJ(0.5)\nA = AHJIS(400200)');
  near('Λ (F = 235) = 119.8 ≈ 120', g('L'), 119.79, 0.001);
  // λ/Λ = 0.8348; ν = 1.5 + (2/3)·0.6969; fc = (1 − 0.4·0.6969)·235/ν
  near('fc(λ = 100, F = 235) = 86.3 N/mm²', g('fc1', 'N/mm^2'), 86.27, 0.002);
  near('fc(λ = 150 > Λ) = 0.277F/(λ/Λ)²', g('fc2', 'N/mm^2'), 0.277 * 235 / (150 / 119.79) ** 2, 0.002);
  near('i (ala + 1/6 alma) H-400×200×8×13 = 52.9 mm', g('ib', 'mm'), Math.sqrt(13 * 200 ** 3 / 12 / (200 * 13 + 374 * 8 / 6)), 0.001);
  const ib = Math.sqrt(13 * 200 ** 3 / 12 / (200 * 13 + 374 * 8 / 6)), ft = 235 / 1.5;
  const f1 = (1 - 0.4 * (6000 / ib) ** 2 / (119.79 ** 2)) * ft, f2 = 89000 / (6000 * 400 / 2600);
  near('fb(lb = 6 m) = máx(f1, 89000/(lb·h/Af))', g('fb', 'N/mm^2'), Math.min(ft, Math.max(f1, f2)), 0.002);
  near('C(M2/M1 = 0.5) = 1.75 + 0.525 + 0.075 = 2.30 (tope)', g('C'), 2.3);
  near('A del H-400×200×8×13 = 83.37 cm²', g('A', 'cm^2'), 83.37);
}

section('Viento y nieve BSL; espectros JRA y Notif. 1461');
{
  const g = calc('q = qBSL(10 m, 3, 34 m/s)\nq4 = qBSL(30 m, 4, 38 m/s)\nmu = mubBSL(20 deg)\nmu0 = mubBSL(65 deg)\nc = kabeBSL(2, 2, 1)\nl1 = SJRA1(0.5, 2)\nl2 = SJRA2I(2.0, 3)\nl3 = SJRA2II(0.2, 1)\ncd = cDJRA(0.1)\ns0 = S0N1461(0.1, 2)\nsr = S0N1461(1.28, 1)\ngs = GsN1457(1.0, 3)');
  // Er = 1.7(10/450)^0.2 = 0.794; Gf = 2.5 → q = 0.6·0.794²·2.5·34² = 1093 N/m²
  near('q (H = 10 m, rugosidad III, V0 = 34) = 1093 N/m²', g('q', 'N/m^2'), 0.6 * (1.7 * (10 / 450) ** 0.2) ** 2 * 2.5 * 34 ** 2);
  const Gf4 = 3.1 + (2.3 - 3.1) * (30 - 10) / 30;
  near('q (H = 30 m, rugosidad IV, V0 = 38) con Gf interpolado', g('q4', 'N/m^2'), 0.6 * (1.7 * (30 / 550) ** 0.27) ** 2 * Gf4 * 38 ** 2);
  near('μb(20°) = √cos 30° = 0.9306', g('mu'), Math.sqrt(Math.cos(Math.PI / 6)));
  near('μb(65° > 60°) = 0', g('mu0'), 0);
  near('Muros: techo pesado, 2 pisos, 1F = 33 cm/m²', g('c', 'cm/m^2'), 33);
  near('JRA nivel 1, suelo II, meseta = 250 gal', g('l1'), 250);
  near('JRA 2012 nivel 2 tipo I, suelo III, T = 2.0 s → 1680/T = 840 gal', g('l2'), 840);
  near('JRA nivel 2 tipo II, suelo I, T = 0.2 s → 4463·T^(2/3)', g('l3'), 4463 * 0.2 ** (2 / 3));
  near('cD(h = 0.10) = 1.5/5 + 0.5 = 0.8', g('cd'), 0.8);
  near('S0 muy raro (T = 0.1 s) = 5·(0.64 + 0.6) = 6.2 m/s²', g('s0'), 6.2);
  near('S0 raro (T = 1.28 s) = 1.024/1.28 = 0.8 m/s²', g('sr'), 0.8);
  near('Gs suelo 3, T = 1.0 s ≥ Tu = 1.152 → 1.5·T/0.64', g('gs'), 1.5 / 0.64);
}

section('Ejemplos publicados — cálculo de límites (Notif. 1457 / 1461)');
{
  // Fuente: «限界耐力計算例» (denmoku-db.jp, 2024), tablas 6-3-1 y 6-3-2, suelo tipo 1:
  //   Te = 0.636 s → Gs = 1.358 ; Te = 0.916 s → Gs = 1.350 ; Te = 0.559 s → Gs = 1.500
  const g = calc('a = GsN1457(0.636, 1)\nb = GsN1457(0.916, 1)\nc = GsN1457(0.559, 1)');
  near('denmoku 2024, suelo 1, Te = 0.636 s: Gs = 1.358', g('a'), 1.358, 0.001);
  near('denmoku 2024, suelo 1, Te = 0.916 s: Gs = 1.350', g('b'), 1.350, 0.001);
  near('denmoku 2024, suelo 1, Te = 0.559 s: Gs = 1.500', g('c'), 1.500, 0.001);
  // Fuente: NILIM, Nota Técnica n.º 1084, tabla 6.3-4 (suelo tipo 2): Ts = 1.09 s → S0 = 4.71, Gs = 2.025, Fh = 0.62, Saf = 5.91 m/s²
  const k = calc('S0 = S0N1461(1.09, 2)\nGs = GsN1457(1.09, 2)\nSaf = S0*0.62*Gs\nS0b = S0N1461(1.00, 2)');
  near('NILIM 1084, Ts = 1.09 s: S0 = 5.12/Ts = 4.71 m/s²', k('S0'), 4.71, 0.005);
  near('NILIM 1084, Ts = 1.09 s, suelo 2: Gs = 2.025', k('Gs'), 2.025);
  near('NILIM 1084: Saf = S0·Fh·Gs = 5.91 m/s² (Fh = 0.62)', k('Saf'), 5.91, 0.005);
  near('NILIM 1084, Ts = 1.00 s: S0 = 5.12 m/s²', k('S0b'), 5.12, 0.001);
}

section('Ejemplos publicados — JRA 2012 (coeficientes del método estático)');
{
  // Fuente: Prefectura de Miyagi, manual de diseño sísmico de puentes (basado en JRA V 2012), tablas 3-9, 3-13 y 3-14
  const g = calc('a = kh0JRA(0.05, 1)\nb = kh0JRA(2.0, 2)\nc = kh0JRA(1.0, 3)\nd = khc0JRA(0.5, 1, 1)\ne = khc0JRA(2.0, 3, 1)\nf = khc0JRA(1.0, 1, 2)\ng2 = khc0JRA(0.3, 3, 2)\nh = SJRA2I(0.5, 2)');
  near('kh0 suelo I, T = 0.05 s: 0.431·T^(1/3) ≥ 0.16 → 0.16', g('a'), 0.16);
  near('kh0 suelo II, T = 2.0 s: 0.298·T^(−2/3) = 0.188', g('b'), 0.298 * 2 ** (-2 / 3));
  near('kh0 suelo III, meseta 0.34–1.5 s = 0.30', g('c'), 0.30);
  near('khc0 tipo I (2012), suelo I, meseta 0.16–0.6 s = 1.40', g('d'), 1.40);
  near('khc0 tipo I (2012), suelo III, T = 2.0 s: 1.50·T^(−2/3) = 0.945', g('e'), 1.50 * 2 ** (-2 / 3));
  near('khc0 tipo II, suelo I, T = 1.0 s: 1.24·T^(−4/3) = 1.24', g('f'), 1.24);
  near('khc0 tipo II, suelo III, T = 0.3 s: 2.38·T^(2/3) = 1.06', g('g2'), 2.38 * 0.3 ** (2 / 3));
  // NILIM (2013), fig. 1: espectro tipo I revisado (H24) en suelo II con meseta ≈ 1300 gal entre 0.22 y 0.9 s
  near('S_I0 (2012), suelo II, T = 0.5 s = 1300 gal (NILIM 2013, fig. 1)', g('h'), 1300);
  // continuidad de todas las ramas (kh0, khc0, S0)
  let maxSalto = 0;
  const lado = (f, t) => Math.abs(f(t * 0.99999) - f(t * 1.00001)) / f(t);
  for (const [fn, ts] of [['kh0JRA(T, S)', { 1: [0.1, 1.1], 2: [0.2, 1.3], 3: [0.34, 1.5] }], ['khc0JRA(T, S, 1)', { 1: [0.16, 0.6], 2: [0.22, 0.9], 3: [0.34, 1.4] }], ['khc0JRA(T, S, 2)', { 1: [0.3, 0.7], 2: [0.4, 1.2], 3: [0.5, 1.5] }], ['SJRA2I(T, S)', { 1: [0.16, 0.6], 2: [0.22, 0.9], 3: [0.34, 1.4] }]]) {
    for (const S of [1, 2, 3]) for (const t of ts[S]) {
      const f = (T) => calc(`y = ${fn.replace('(T, S', `(${T}, ${S}`)}`)('y');
      maxSalto = Math.max(maxSalto, lado(f, t));
    }
  }
  truthy('Continuidad de kh0, khc0 y S_I0 en todos los quiebres (salto < 0.5 %)', maxSalto < 0.005, 'salto máx. ' + (100 * maxSalto).toFixed(2) + ' %');
}

section('Ejemplo publicado — presión de velocidad (Notif. 1454)');
{
  // Ejemplo difundido (kentiku-kouzou.jp): V0 = 34 m/s, rugosidad III, H = 10 m → Er = 0.794, E = 1.58, q ≈ 1095 N/m² (con E redondeado)
  const g = calc('Er = ErBSL(10 m, 3)\nq = qBSL(10 m, 3, 34 m/s)');
  near('Er (H = 10 m, rugosidad III) = 0.794', g('Er'), 0.794, 0.001);
  near('q = 0.6·E·V0² ≈ 1095 N/m² (E = 1.58 redondeado en la fuente)', g('q', 'N/m^2'), 1095, 0.004);
}

section('Bloques Qu–Qun y cantidad de muros');
{
  const g = block('qunqu', { Qu: '1200, 900', Qun: '1000, 950' });
  near('Qu/Qun piso 1 = 1.2', g.ctx.scope.get('QuQun').toArray()[0], 1.2);
  truthy('Piso 2 con Qu < Qun genera verificación que NO cumple', g.ctx.checks.length === 2 && !g.ctx.checks[1].ok);
  const k = block('kaberyo', { Lx: '8', Ly: '8', coef: '25 cm/m^2', muros: '0 0 4 0 2\n0 8 2 8 2\n0 0 0 4 2.5\n8 0 8 4 2.5' });
  // franja: 8·2 m² × 0.25 m/m² = 4 m; inferior: 4·2 = 8 → 2.0; superior: 2·2 = 4 → 1.0
  near('LeX = 4·2 + 2·2 = 12 m', k('LeX', 'm'), 12);
  near('Suficiencia franja inferior X = 2.0', k('rX1'), 2.0);
  near('Relación de suficiencia X = 1.0/2.0 = 0.5', k('bX'), 0.5);
  truthy('Balance X cumple (relación ≥ 0.5)', k.ctx.checks[0].ok);
}

section('Plantillas japonesas (sin errores y todas las verificaciones cumplen)');
{
  const ids = TEMPLATES.filter(t => t.pais === 'JP').map(t => t.id);
  truthy('Al menos 8 plantillas JP', ids.length >= 8, ids.length + ' plantillas');
  for (const id of ids) {
    const g = runTemplate(id); const c = g.res.ctx;
    truthy(`${id}: 0 errores, ${c.checks.length} verificaciones cumplen`, c.errors.length === 0 && c.checks.length > 0 && c.checks.every(x => x.ok), c.errors.map(e => e.msg).join('; '));
  }
  const r = runTemplate('jp-bsl-ruta12');
  near('Ruta 1/2: Ai del 5F (T = 0.36 s)', r('Ai').toArray()[4], 1 + (1 / Math.sqrt(4300 / 25700) - 4300 / 25700) * 0.72 / 2.08, 0.001);
  near('Ruta 1/2: cortante basal Q1 = 0.2·ΣW = 5140 kN', r('Qb', 'kN'), 5140);
  const v = runTemplate('jp-aij-viga');
  near('Viga AIJ: Ma corto plazo = at·345·(7/8)d', v('Ma_S', 'kN*m'), 4 * 506.7 * 345 * 0.875 * 635 / 1e6);
  const u = runTemplate('jp-bsl-ruta3');
  near('Ruta 3: Qun piso 1 = Ds·Fes·Qud = 0.40·1.0·25700', u('Qun').toArray()[0].toNumber('kN'), 0.40 * 25700);
  near('Ruta 3: Ds 5F (FB + WA, βu = 0.28) = 0.35', u('Ds').toArray()[4], 0.35);
}

section('Plantillas con datos extremos: deben pasar a NO CUMPLE sin errores ni NaN');
{
  const sub = (id, pairs) => runTemplate(id, d => { for (const [a, b] of pairs) { const blk = d.blocks.find(x => typeof x.src === 'string' && x.src.includes(a)) || d.blocks.find(x => Object.values(x).some(v => typeof v === 'string' && v.includes(a))); if (!blk) throw new Error('No se encontró: ' + a); if (blk.src && blk.src.includes(a)) blk.src = blk.src.replace(a, b); else for (const k in blk) if (typeof blk[k] === 'string' && blk[k].includes(a)) blk[k] = blk[k].replace(a, b); } });
  const casos = [
    ['jp-bsl-ruta12', [['di = [8.6, 8.9, 8.4, 7.3, 5.5] mm', 'di = [8.6, 25, 8.4, 7.3, 5.5] mm'], ['Aw = [7.2,', 'Aw = [1.2,']], ['Deriva', 'Rs', 'Σ2.5αAw']],
    ['jp-bsl-ruta12', [['By = 14.0 m', 'By = 4.0 m']], ['esbeltez']],
    ['jp-bsl-ruta3', [['Qu = [11300', 'Qu = [6000']], ['Piso 1']],
    ['jp-aij-viga', [['sw = 125 mm', 'sw = 300 mm'], ['M_E = 175 kN*m', 'M_E = 400 kN*m']], ['Separación', 'Flexión de corto plazo', 'pw ≥ 0.2']],
    ['jp-aij-columna', [['M_E = 330 kN*m', 'M_E = 900 kN*m'], ['nw = 4', 'nw = 2']], ['N máx', 'Qsu']],
    ['jp-aij-acero', [['lb = 2.4 m', 'lb = 7.2 m'], ['wL = 17.5 kN/m', 'wL = 45 kN/m']], ['Flexión de largo plazo', 'Deflexión']],
    ['jp-madera-kaberyo', [['8.19 0 10.92 0 2.5', '8.19 0 8.5 0 1.0'], ['0 7.28 3.64 7.28 2.5', '0 7.28 1.0 7.28 1.0'], ['techo = 1', 'techo = 2']], ['Longitud efectiva en X']],
    ['jp-madera-kaberyo', [['0 0 0 2.73 2.5', '0 0 0 0.5 1.0'], ['0 4.55 0 7.28 2.5', '0 4.55 0 5.0 1.0']], ['Balance yonbun-wari en Y']],
    ['jp-bsl-viento-nieve', [['ds = 30 cm', 'ds = 150 cm'], ['QE1 = 1450 kN', 'QE1 = 150 kN']], ['nieve', 'sismo controla']],
    ['jp-jra-espectro', [['Pa = 8200 kN', 'Pa = 5000 kN']], ['tipo I', 'tipo II']],
    ['jp-bsl-n1461', [['Qs = 9800 kN', 'Qs = 5000 kN'], ['ths = 1/90', 'ths = 1/50']], ['seguridad: fuerza', 'deriva ≤ 1/75']],
  ];
  for (const [id, pairs, labels] of casos) {
    const r = sub(id, pairs), c = r.res.ctx;
    const malos = c.checks.filter(x => !x.ok).map(x => x.label);
    const nan = /NaN|Infinity/.test(r.res.html);
    truthy(`${id}: datos extremos → sin errores ni NaN`, c.errors.length === 0 && !nan, c.errors.map(e => e.msg).join('; '));
    for (const l of labels) truthy(`${id}: «${l}» pasa a NO CUMPLE`, malos.some(m => m.includes(l)), malos.join(' | '));
  }
}
section('Rangos usuales [mín..máx] y ejemplos de validación de las plantillas «japan»');
for (const t of TEMPLATES.filter(x => x.id.startsWith('jp-'))) {
  const inp = runTemplate(t.id).res.ctx.inputs, rg = inp.filter(i => i.range);
  const out = rg.filter(i => { let v = parseFloat(i.num); if (i.range.unit && i.unit && i.range.unit !== i.unit) v = math.unit(v, i.unit).toNumber(i.range.unit); return !(v >= i.range.min && v <= i.range.max); });
  const bad = inp.filter(i => /\.\.|\[/.test(i.label || ''));
  truthy(`${t.id}: ${rg.length} datos con rango, valores por defecto dentro del rango, etiquetas limpias`, rg.length >= 3 && out.length === 0 && bad.length === 0, out.map(i => i.name + ' = ' + i.num).concat(bad.map(i => i.name)).join(', '));
  const v = t.validacion;
  truthy(`${t.id}: tiene «validacion» con fuente, nota y valores`, !!(v && v.fuente && v.nota && Array.isArray(v.valores) && v.valores.length >= 3));
}
truthy('Listas desplegables intactas con rango (suelo, rangos FA–FD/WA–WD, Fc)', (() => { const f = (id, n) => runTemplate(id).res.ctx.inputs.find(i => i.name === n); return f('jp-bsl-ruta3', 'suelo').options.length === 3 && f('jp-bsl-ruta3', 'rF').options.length === 4 && f('jp-bsl-ruta3', 'rF').range.max === 4 && f('jp-bsl-ruta12', 'Fc').options.length === 5 && f('jp-bsl-ruta12', 'Fc').range.min === 18; })());
truthy('Viento: validacion con el ejemplo publicado de la Notif. 1454 (Er = 0.794, q ≈ 1095 N/m²)', TEMPLATES.find(x => x.id === 'jp-bsl-viento-nieve').validacion.valores.some(v => v.var === 'Er' && v.esperado === 0.794));
section('Segunda opinión — tercera tanda B (JRA: desplazamiento residual; kabe-ryo vigente)');
{ const subT = (pairs) => (d) => { for (const [a, b] of pairs) { let hit = false; d.blocks.forEach(x => { if (typeof x.src === 'string' && x.src.includes(a)) { x.src = x.src.replace(a, b); hit = true; } }); if (!hit) throw new Error('No se encontró: ' + a); } };
  const j = runTemplate('jp-jra-espectro');
  const muR = 0.5 * ((Math.max(j('cIz') * j('khcI') / j('cs'), j('khcII') / j('cs')) * 9800 / 8200) ** 2 + 1);
  near('JRA: μr = ½[(khc0·W/Pa)² + 1] con el sismo que gobierna', j('muR'), muR, 1e-6);
  near('JRA: δR = cR(μr − 1)(1 − r)δy [mm]', j('dR', 'mm'), 0.6 * (muR - 1) * 40, 1e-6);
  const j2 = runTemplate('jp-jra-espectro', subT([['dy = 0.040 m', 'dy = 0.12 m']]));
  truthy('JRA con δy = 0.12 m: NO CUMPLE δR ≤ h/100', j2.res.ctx.checks.some(c => !c.ok && /residual/.test(c.label)));
  const k = runTemplate('jp-madera-kaberyo', subT([['cw1v = 0 cm/m^2', 'cw1v = 40 cm/m^2']]));
  near('Kabe-ryo: cw del 1F = máx(tabla anterior, valor vigente)', k('cw1', 'cm/m^2'), 40, 1e-9);
}
done();
