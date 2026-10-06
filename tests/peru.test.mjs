// Pruebas de validación — módulo «peru» (E.020, E.030-2026, E.031)
import { near, truthy, calc, block, runTemplate, section, done, math, TEMPLATES } from './helpers.mjs';
import { jacobiEig, rhoCQC, combine, modalShear } from '../src/blocks/peru.js';

const G = 9.80665;
// lector de vectores (Matrix de números o de Unit) de un resultado
const vec = (get, name, u) => { const v = get.ctx ? get.ctx.scope.get(name) : get.res.ctx.scope.get(name); const a = math.isMatrix(v) ? v.toArray() : v; return a.flat().map(x => (math.isUnit(x) ? x.toNumber(u) : x)); };

section('E.030-2026 — tablas y funciones (RM 183-2026-VIVIENDA)');
{
  const v = calc(`z4 = ZE030(4)
z3 = ZE030(3)
z1 = ZE030(1)
uB = UE030(3)
uA1 = UE030(1)
r10 = R0E030(10)
r8 = R0E030(8)
r13 = R0E030(13)
ct = CTE030(8)
d5 = dlimE030(5)
d2 = dlimE030(2)
k1 = kE030(0.4 s)
k2 = kE030(1.0 s)
k3 = kE030(3.0 s)
s1 = SE030(4, 550 m/s)
s2 = SE030(3, 350 m/s)
s3 = SE030(2, 200 m/s)
tp = TpE030(400 m/s)
tl = TlE030(400 m/s)
sa = SaE030(0.05 s, 0.45, 1, 1.05, 0.6 s, 2.0 s, 8)
sap = SaE030(0.4 s, 0.45, 1, 1.05, 0.6 s, 2.0 s, 8)
saL = SaE030(3 s, 0.45, 1, 1.05, 0.6 s, 2.0 s, 8)
V1 = VE030(0.45, 1, 0.5, 1, 8, 1000 tonf)
V2 = VE030(0.45, 1, 2.5, 1.05, 7, 1000 tonf)
sj = sJuntaE030(0.45, 1.05, 20 m)
sj0 = sJuntaE030(0.10, 1.0, 3 m)
s18 = sJunta2018(10 m)
c1 = C1E030(1)
c4 = C1E030(4)
Fa = FneE030(0.30, 3, 1 tonf, 0.45, 1, 1.05)
Fb = FneE030(0.05, 2, 1 tonf, 0.45, 1, 1.05)
al = alphaE030([100, 100, 100] tonf, [3, 6, 9] m, 1)
al2 = alphaE030([100, 100] tonf, [3, 6] m, 2)
fd1 = fdespE030(0)
fd2 = fdespE030(1)`);
  near('Z zona 4 = 0.45 (Tabla N° 1)', v('z4'), 0.45);
  near('Z zona 3 = 0.35', v('z3'), 0.35);
  near('Z zona 1 = 0.10', v('z1'), 0.10);
  near('U categoría B = 1.3 (Tabla N° 7)', v('uB'), 1.3);
  near('U A1 con aislamiento = 1.0 (nota Tabla N° 7)', v('uA1'), 1.0);
  near('R0 EMDL = 3.5 (Tabla N° 10, E.030-2026)', v('r10'), 3.5);
  near('R0 dual = 7', v('r8'), 7);
  near('R0 péndulo invertido = 2.5 (Art. 22.3)', v('r13'), 2.5);
  near('CT dual = 60 (Art. 36.1)', v('ct'), 60);
  near('Distorsión EMDL = 0.004 (Tabla N° 14, 2026)', v('d5'), 0.004);
  near('Distorsión acero = 0.010', v('d2'), 0.010);
  near('k = 1.0 para T ≤ 0.5 s (Art. 35.2)', v('k1'), 1.0);
  near('k = 0.75 + 0.5·1.0 = 1.25', v('k2'), 1.25);
  near('k ≤ 2.0 (T = 3 s)', v('k3'), 2.0);
  near('S (Z4, Vs30 = 550 m/s, S1) = 1.00 (Tabla N° 4)', v('s1'), 1.00);
  near('S (Z3, Vs30 = 350 m/s, límite S2–S3) = 1.15', v('s2'), 1.15);
  near('S (Z2, Vs30 = 200 m/s, límite S3) = 1.40', v('s3'), 1.40);
  near('TP (Vs30 = 400 m/s) = 0.4 + 0.2·(150/200) = 0.55 s', v('tp', 's'), 0.55);
  near('TL (Vs30 = 400 m/s) = 2.5 − 0.5·(150/200) = 2.125 s', v('tl', 's'), 2.125);
  near('Sa rama T < 0.2TP: C = 1 + 7.5T/TP (Tabla N° 6)', v('sa'), 0.45 * (1 + 7.5 * 0.05 / 0.6) * 1.05 / 8);
  near('Sa meseta: ZUCS/R con C = 2.5', v('sap'), 0.45 * 2.5 * 1.05 / 8);
  near('Sa T > TL: C = 2.5·TP·TL/T²', v('saL'), 0.45 * 2.5 * 0.6 * 2 / 9 * 1.05 / 8);
  near('V con C/R mínimo 0.11 (Art. 34.2): 0.45·0.11·1000', v('V1', 'tonf'), 0.45 * 0.11 * 1000);
  near('V = ZUCS/R·P', v('V2', 'tonf'), 0.45 * 2.5 * 1.05 / 7 * 1000);
  near('Junta s = 0.02·Z·S·h (Art. 52.2, 2026)', v('sj', 'm'), 0.02 * 0.45 * 1.05 * 20);
  near('Junta mínima 3 cm', v('sj0', 'm'), 0.03);
  near('Junta E.030-2018: s = 0.006·h', v('s18', 'm'), 0.06);
  near('C1 elementos que pueden caer fuera = 3.0 (Tabla N° 15)', v('c1'), 3.0);
  near('C1 equipos rígidos = 1.5', v('c4'), 1.5);
  near('F = (ai/g)·C1·Pe (Art. 57)', v('Fa', 'tonf'), 0.9);
  near('F mínima = 0.5·Z·U·S·Pe (Art. 58)', v('Fb', 'tonf'), 0.5 * 0.45 * 1.05);
  near('αi uniforme, k = 1: α3 = 9/18', vec(v, 'al')[2], 0.5);
  near('αi con k = 2: α2 = 100·36/(100·9 + 100·36)', vec(v, 'al2')[1], 36 / 45);
  near('Factor de desplazamientos regular 0.75 (Art. 50.1)', v('fd1'), 0.75);
  near('Factor de desplazamientos irregular 0.85 (Art. 50.2)', v('fd2'), 0.85);
}

section('E.030 — irregularidades (Tablas N° 11 y 12)');
{
  const v = calc(`a = IaRigE030([38000, 52000, 50000, 47000] tonf/m)
b = IaRigE030([30000, 52000, 50000, 47000] tonf/m)
c = IaRigE030([50000, 52000, 50000, 47000] tonf/m)
d = IaRigE030([34000, 46000, 60000, 64000, 64000] tonf/m)
e = IaResE030([500, 700] tonf)
f = IaResE030([600, 700] tonf)
g1 = IaMasE030([400, 250, 250, 100] tonf)
g2 = IaMasE030([250, 250, 250, 100] tonf)
t1 = IpTorE030([1.4, 1.2], [1, 1])
t2 = IpTorE030([1.6, 1.2], [1, 1])
t3 = IpTorE030([1.6, 1.2], [1, 1], [0.003, 0.006], 0.007)`);
  near('Piso blando: K1/K2 = 0.73 ≥ 0.70 pero K1/prom = 0.765 < 0.80 → 0.75', v('a'), 0.75);
  near('Rigidez extrema: K1/K2 = 0.577 < 0.60 → 0.50', v('b'), 0.50);
  near('Regular en rigidez → 1.0', v('c'), 1.0);
  near('Extrema por promedio: K1/prom(3 sup.) = 34/56.7 = 0.60 < 0.70 → 0.50', v('d'), 0.50);
  near('Piso débil extremo: 500/700 = 0.714 → 0.75 (≥ 0.65)', v('e'), 0.75);
  near('Resistencia 600/700 = 0.857 → 1.0', v('f'), 1.0);
  near('Masa: 400 > 1.5·250 → 0.90', v('g1'), 0.90);
  near('Masa: azotea liviana no cuenta → 1.0', v('g2'), 1.0);
  near('Torsión Δmax/Δprom = 1.4 → 0.75', v('t1'), 0.75);
  near('Torsión extrema 1.6 → 0.60', v('t2'), 0.60);
  near('Torsión: entrepiso con deriva < 50 % del límite no se evalúa', v('t3'), 1.0);
}

section('E.020 Cargas');
{
  const v = calc(`p = PhE020(0.8, 75 km/h)
vh = VhE020(75 km/h, 20 m)
vm = VhE020(60 km/h, 5 m)
lr = LrE020(250 kgf/m^2, 30 m^2, 2)
lr0 = LrE020(250 kgf/m^2, 15 m^2, 2)
lr5 = LrE020(250 kgf/m^2, 400 m^2, 2)
q1 = QtE020(40 kgf/m^2, 10 deg)
q2 = QtE020(40 kgf/m^2, 20 deg)
q3 = QtE020(40 kgf/m^2, 50 deg)
w25 = pAligE020(0.25 m)
w17 = pAligE020(0.17 m)
lt = CVtechoE020(10 deg)
lt2 = CVtechoE020(25 deg)`);
  near('Ph = 0.005·0.8·75² = 22.5 kgf/m² (Art. 12.4)', v('p', 'kgf/m^2'), 22.5);
  near('Vh = 75·(20/10)^0.22 (Art. 12.3)', v('vh', 'km/h'), 75 * 2 ** 0.22);
  near('Vh mínimo 75 km/h y Vh = V bajo 10 m', v('vm', 'km/h'), 75);
  near('Lr = Lo(0.25 + 4.6/√60) (Art. 10)', v('lr', 'kgf/m^2'), 250 * (0.25 + 4.6 / Math.sqrt(60)));
  near('Sin reducción si Ai ≤ 40 m²', v('lr0', 'kgf/m^2'), 250);
  near('Lr ≥ 0.5·Lo', v('lr5', 'kgf/m^2'), 125);
  near('Nieve Qt = Qs para θ ≤ 15° (Art. 11.3a)', v('q1', 'kgf/m^2'), 40);
  near('Nieve Qt = 0.8·Qs para 15° < θ ≤ 30°', v('q2', 'kgf/m^2'), 32);
  near('Nieve Qt = Cs·0.8·Qs, Cs = 1 − 0.025(θ − 30°)', v('q3', 'kgf/m^2'), 16);
  near('Aligerado h = 0.25 m: 350 kgf/m² (Anexo 1)', v('w25', 'kgf/m^2'), 350);
  near('Aligerado h = 0.17 m: 280 kgf/m²', v('w17', 'kgf/m^2'), 280);
  near('CV techo 10°: 100 − 5·7 = 65 kgf/m² (Art. 7.1b)', v('lt', 'kgf/m^2'), 65);
  near('CV techo mínima 50 kgf/m²', v('lt2', 'kgf/m^2'), 50);
}

section('E.031 Aislamiento sísmico');
{
  const v = calc(`b1 = BME031(0.15)
b2 = BME031(2)
b3 = BME031(0.5)
b4 = BME031(25)
dm = DME031(0.3, 3 s, 1.5)
tm = TME031(4000 tonf, 1800 tonf/m)
ra1 = RaE031(8)
ra2 = RaE031(2)
ra3 = RaE031(4)
vst = VstE031(100 tonf, 0.8, 1, 0.2)
kv = kE031(0.2, 0.5 s)
ke = keffLRB(7 tonf, 40 tonf/m, 0.25 m)
be = betaLRB(7 tonf, 40 tonf/m, 0.25 m, 0.02 m)
dt = DTME031(30 cm, 15 m, 2 m, 24 m, 30 m, 1)
dt2 = DTME031(30 cm, 1 m, 0.5 m, 24 m, 30 m, 1)
sam = SaME031(3 s, 0.45, 1.0, 0.4 s, 2.5 s)
lmx = lambdaE031(1.1, 1.2, 1.15)`);
  near('BM(15 %) = 1.35 (Tabla N° 5, interpolado)', v('b1'), 1.35);
  near('BM(≤ 2 %) = 0.8', v('b2'), 0.8);
  near('BM(≥ 40 %) = 1.9', v('b3'), 1.9);
  near('BM(25 %) = 1.6', v('b4'), 1.6);
  near('DM = SaM·TM²/(4π²BM) (ec. 6)', v('dm', 'm'), 0.3 * G * 9 / (4 * Math.PI ** 2 * 1.5));
  near('TM = 2π√(P/(kM·g)) (ec. 7)', v('tm', 's'), 2 * Math.PI * Math.sqrt(4000 / (1800 * G)));
  near('Ra = 3/8·8 = 3 → 2 (máximo)', v('ra1'), 2);
  near('Ra = 3/8·2 = 0.75 → 1 (mínimo)', v('ra2'), 1);
  near('Ra = 3/8·4 = 1.5', v('ra3'), 1.5);
  near('Vst = Vb·(Ps/P)^(1 − 2.5β) (ec. 12)', v('vst', 'tonf'), 100 * 0.8 ** 0.5);
  near('k = 14·β·Tf (ec. 15)', v('kv'), 1.4);
  near('keff = Qd/D + kd', v('ke', 'tonf/m'), 7 / 0.25 + 40);
  near('βeff bilineal = 4Qd(D − Dy)/(2π keff D²)', v('be'), 4 * 7 * 0.23 / (2 * Math.PI * 68 * 0.0625));
  near('DTM = DM[1 + y/PT²·12e/(b² + d²)] (ec. 8)', v('dt', 'cm'), 30 * (1 + 15 * 24 / (24 ** 2 + 30 ** 2)));
  near('DTM ≥ 1.15·DM', v('dt2', 'cm'), 34.5);
  near('SaM = 1.5·Z·C·S, T > TL (ec. 5)', v('sam'), 1.5 * 0.45 * 2.5 * 0.4 * 2.5 / 9);
  near('λmax = [1 + 0.75(λae − 1)]·λtvs·λfab (ec. 1)', v('lmx'), (1 + 0.75 * 0.1) * 1.2 * 1.15);
}

section('Análisis modal — soluciones analíticas');
{
  // Autovalores de matriz simétrica conocida
  const e = jacobiEig([[2, -1, 0], [-1, 2, -1], [0, -1, 2]]);
  near('Jacobi: λ1 = 2 − √2', e.vals[0], 2 - Math.SQRT2, 1e-9);
  near('Jacobi: λ3 = 2 + √2', e.vals[2], 2 + Math.SQRT2, 1e-9);
  // CQC
  near('ρij(λ = 1) = 1', rhoCQC(10, 10, 0.05), 1, 1e-9);
  const l = 0.5, b = 0.05;
  near('ρij(λ = 0.5, β = 5 %) fórmula E.030 Art. 42.2', rhoCQC(10, 5, b), 8 * b * b * (1 + l) * l ** 1.5 / ((1 - l * l) ** 2 + 4 * b * b * l * (1 + l) ** 2), 1e-9);
  near('Combinación ABS-SRSS 0.25Σ|r| + 0.75√Σr² (Art. 42.3)', combine([3, 4], [1, 2], 'ABS'), 0.25 * 7 + 0.75 * 5, 1e-9);

  // Chopra: pórtico de cortante de dos pisos m1 = 2m, m2 = m, k1 = 2k, k2 = k
  const m = 1000, k = 1e6;
  const r = modalShear([2 * m, m], [2 * k, k], [3, 3], () => 0, { comb: 'SRSS' });
  near('2 GDL (Chopra): ω1 = √(k/2m)', r.modes[0].w, Math.sqrt(k / (2 * m)), 1e-6);
  near('2 GDL (Chopra): ω2 = √(2k/m)', r.modes[1].w, Math.sqrt(2 * k / m), 1e-6);
  near('2 GDL: φ1 = [1/2, 1]', r.modes[0].phi[0], 0.5, 1e-6);
  near('2 GDL: φ2 = [−1, 1]', r.modes[1].phi[0], -1, 1e-6);
  near('2 GDL: Γ1 = 4/3', r.modes[0].Gam, 4 / 3, 1e-6);
  near('2 GDL: masa efectiva modo 1 = 8/9', r.modes[0].ratio, 8 / 9, 1e-6);

  // Bloque con unidades: 2 GDL iguales, Sa constante
  const g = block('modal', { masas: '[100, 100] tonf', rigideces: '[5000, 5000] tonf/m', alturas: '[3, 3] m', Sa: '0.25', comb: 'SRSS', fdesp: '1', dlim: '0.01' });
  const mm = 100e3, kk = 5000 * G * 1000;
  near('2 GDL iguales: ω1² = (3 − √5)/2·k/m', (2 * Math.PI / g('T1', 's')) ** 2, (3 - Math.sqrt(5)) / 2 * kk / mm, 1e-6);
  near('2 GDL iguales: ω2² = (3 + √5)/2·k/m', (2 * Math.PI / g('T2', 's')) ** 2, (3 + Math.sqrt(5)) / 2 * kk / mm, 1e-6);
  const ph = (Math.sqrt(5) - 1) / 2, r1 = (1 + ph) ** 2 / (1 + ph * ph) / 2; // φ1 = [0.618, 1]
  near('2 GDL iguales: masa efectiva modo 1 = 0.9472', r1, 0.9472, 1e-3);
  near('Cortante basal SRSS = Sa·√(M1*² + M2*²)', g('Vdin', 'tonf'), 0.25 * 200 * Math.sqrt(r1 ** 2 + (1 - r1) ** 2), 1e-6);
  near('Masa participativa total = 100 %', g('Mpart'), 1, 1e-9);

  // Edificio uniforme de N pisos: ωj = 2√(k/m)·sin((2j − 1)π/(2(2N + 1)))
  for (const N of [3, 5]) {
    const gg = block('modal', { masas: Array(N).fill('200').join(','), rigideces: Array(N).fill('20000').join(','), alturas: Array(N).fill('3').join(','), Sa: '0.2', comb: 'CQC', fdesp: '1' });
    const w0 = Math.sqrt(20000 * G * 1000 / 200e3);
    for (const j of [1, 2, N]) near(`Uniforme N = ${N}: T${j} cerrado`, gg('T' + j, 's'), 2 * Math.PI / (2 * w0 * Math.sin((2 * j - 1) * Math.PI / (2 * (2 * N + 1)))), 1e-6);
  }
  // CQC ≈ SRSS para modos bien separados
  const a = block('modal', { masas: '[200,200,200]', rigideces: '[20000,20000,20000]', alturas: '[3,3,3]', Sa: '0.2', comb: 'CQC', fdesp: '1' });
  const s = block('modal', { masas: '[200,200,200]', rigideces: '[20000,20000,20000]', alturas: '[3,3,3]', Sa: '0.2', comb: 'SRSS', fdesp: '1' });
  near('CQC ≈ SRSS con modos separados (< 1 %)', a('Vdin', 'tonf'), s('Vdin', 'tonf'), 0.01);
  // Matriz de rigidez completa equivalente
  const km = block('modal', { masas: '[100,100]', rigideces: '[[10000, -5000], [-5000, 5000]] tonf/m', alturas: '[3,3]', Sa: '0.25', comb: 'SRSS', fdesp: '1' });
  near('Matriz K condensada = rigideces de entrepiso', km('T1', 's'), g('T1', 's'), 1e-9);
  truthy('Verificaciones del bloque modal registradas', g.ctx.checks.length === 2 && g.ctx.checks[0].ok);
}

section('Bloques de fuerzas por nivel, irregularidades y aislamiento');
{
  const sf = block('storyforces', { P: '[100,100,100] tonf', hi: '[3,6,9] m', V: '60 tonf', T: '0.3 s', B: '20 m' });
  near('Fi nivel 3 = V·9/18 (k = 1)', vec(sf, 'Fi_e', 'tonf')[2], 30);
  near('Momento de volteo = ΣFi·hi', sf('Mvol', 'tonf*m'), 10 * 3 + 20 * 6 + 30 * 9);
  near('Torsor accidental Mt3 = 0.05·20·F3', vec(sf, 'Mt_e', 'tonf*m')[2], 30);
  const ir = block('irregE030', { K: '[38000, 52000, 50000, 47000] tonf/m', P: '[300,300,300,200] tonf', cat: 'C', zona: '4', disc: '0' });
  near('Bloque de irregularidades: Ia = 0.75 (piso blando)', ir('Ia_ev'), 0.75);
  truthy('Categoría C, zona 4: irregularidad no extrema permitida', ir.ctx.checks[0].ok);
  const ir2 = block('irregE030', { K: '[38000, 52000, 50000, 47000] tonf/m', cat: 'A2', zona: '4', disc: '0' });
  truthy('Categoría A2, zona 4: no se permiten irregularidades (Tabla N° 13)', !ir2.ctx.checks[0].ok);
  const ir3 = block('irregE030', { K: '[30000, 52000, 50000, 47000] tonf/m', cat: 'C', zona: '2', npisos: '[2, 7 m]', disc: '0' });
  truthy('Zona 2, edificio de 2 pisos: extrema permitida (excepción Tabla N° 13)', ir3.ctx.checks[0].ok);
  const lb = block('lrb', { N: '30', Qd: '7 tonf', kd: '40 tonf/m', Dy: '2 cm', W: '4100 tonf', SaM: 'SaME031(T, 0.45, 1.0, 0.4 s, 2.5 s)', lQmax: '1.5', lQmin: '0.8', lkmax: '1.3', lkmin: '0.8' });
  const D = lb('D_M_inf', 'm'), Tm = lb('T_M_inf', 's'), Bm = lb('B_M_inf');
  const ke = 30 * 0.8 * 7 / D + 30 * 0.8 * 40;
  near('LRB: TM = 2π√(W/(keff·g)) en la convergencia', Tm, 2 * Math.PI * Math.sqrt(4100 / (ke * G)), 1e-4);
  const Sa = 1.5 * 0.45 * (Tm > 2.5 ? 2.5 * 0.4 * 2.5 / Tm ** 2 : 2.5 * 0.4 / Tm);
  near('LRB: punto fijo DM = SaM·TM²·g/(4π²BM)', D, Sa * G * Tm ** 2 / (4 * Math.PI ** 2 * Bm), 1e-4);
  near('LRB: con T > TL y λQ = λk el DM no cambia (Sd constante)', lb('D_M_nom', 'm'), D, 1e-4);
  truthy('LRB: límite superior más rígido (TM sup < TM inf)', lb('T_M_sup', 's') < Tm);
}

section('Plantillas del módulo (datos por defecto)');
{
  const ids = ['pe-e030-estatico', 'pe-e030-dinamico', 'pe-e030-irregularidades', 'pe-e020-metrado', 'pe-e020-viento', 'pe-e030-noestructurales', 'pe-e031-aislamiento'];
  for (const id of ids) {
    const r = runTemplate(id).res;
    truthy(`${id}: sin errores y todas las verificaciones cumplen`, r.ctx.errors.length === 0 && r.ctx.checks.length > 0 && r.ctx.checks.every(c => c.ok), `(${r.ctx.checks.length} verif., ${r.ctx.errors.length} errores)`);
  }
  const st = runTemplate('pe-e030-estatico');
  const P = st('P', 'tonf');
  near('Estático: V = Z·U·C·S/R·P = 0.45·1·2.5·1.075/7·P', st('V', 'tonf'), 0.45 * 2.5 * 1.075 / 7 * P);
  near('Estático: P por m² en rango usual (≈ 0.84 tonf/m²)', P / 1500, 0.8376, 0.01);
  near('Estático: ΣFi = V', vec(st, 'Fi', 'tonf').reduce((a, b) => a + b, 0), st('V', 'tonf'), 1e-9);
  const dy = runTemplate('pe-e030-dinamico');
  near('Rayleigh (estático) ≈ T1 modal del mismo edificio', st('TR', 's'), dy('T1', 's'), 0.005);
  truthy('Dinámico: V din ≥ 0.80·V est tras el escalamiento', dy('Vdis', 'tonf') >= 0.8 * dy('Vest', 'tonf') - 1e-9);
  const ir = runTemplate('pe-e030-irregularidades');
  near('Irregularidades: piso blando → R = 7·0.75 = 5.25', ir('R'), 5.25);
  const ais = runTemplate('pe-e031-aislamiento');
  near('Aislamiento: Ra = 2 (pórticos R0 = 8)', ais('Ra'), 2);
  truthy('Aislamiento: Vs = max(Vst/Ra, Va, Vc)', Math.abs(ais('Vs', 'tonf') - Math.max(ais('Vs1', 'tonf'), ais('Va', 'tonf'), ais('Vc', 'tonf'))) < 1e-6);
  const w = runTemplate('pe-e020-viento');
  near('Viento: Ph muro barlovento = 0.005·0.8·Vh²', w('p_mb', 'kgf/m^2'), 0.005 * 0.8 * w('Vh', 'km/h') ** 2);
}

section('Revisión independiente — ejemplos publicados y casos adicionales');
{
  // (1) Ejemplo publicado: Rupay Vargas et al. (2022) «Análisis sísmico de fuerzas estáticas equivalentes de un pórtico
  //     de 3 niveles», Yotantsipanko 2(2): 88–100. Z = 0.45, U = 1.5, C = 2.5, S = 1.0, R = 8, P = 59.870 tonf,
  //     Pi = [22.068, 22.068, 15.734] tonf, hi = [3, 6, 9] m → V = 12.629 tonf; F = [2.457, 4.915, 5.256] tonf;
  //     ki = 4832.391 tonf/m → Δ = [0.0026, 0.0047, 0.0058] m; deriva inelástica (0.75R) piso 1 = 0.0052.
  const v = calc(`Vr = VE030(0.45, 1.5, 2.5, 1.0, 8, 59.870 tonf)
Ar = alphaE030([22.068, 22.068, 15.734] tonf, [3, 6, 9] m, kE030(0.257 s))`);
  near('Rupay et al. (2022): V = 12.629 tonf', v('Vr', 'tonf'), 12.629, 1e-3);
  const sf = block('storyforces', { P: '[22.068, 22.068, 15.734] tonf', hi: '[3, 6, 9] m', V: '12.629 tonf', T: '0.257 s' });
  const F = vec(sf, 'Fi_e', 'tonf');
  near('Rupay et al. (2022): F1 = 2.457 tonf', F[0], 2.457, 2e-3);
  near('Rupay et al. (2022): F2 = 4.915 tonf', F[1], 4.915, 2e-3);
  near('Rupay et al. (2022): F3 = 5.256 tonf', F[2], 5.256, 2e-3);
  const Vi = vec(sf, 'Vi_e', 'tonf'), kk = 4832.391;
  const d = [Vi[0] / kk, Vi[0] / kk + Vi[1] / kk, Vi[0] / kk + Vi[1] / kk + Vi[2] / kk];
  near('Rupay et al. (2022): Δ1 = 0.0026 m', d[0], 0.0026, 0.02);
  near('Rupay et al. (2022): Δ2 = 0.0047 m', d[1], 0.0047, 0.02);
  near('Rupay et al. (2022): Δ3 = 0.0058 m', d[2], 0.0058, 0.02);
  near('Rupay et al. (2022): deriva inelástica piso 1 = 0.75·8·Δ1/3 = 0.0052', 0.75 * 8 * d[0] / 3, 0.0052, 0.01);

  // (2) Chopra, Dynamics of Structures, Ej. 12.x/13.x: pórtico de cortante uniforme de 5 pisos, m = 100 kips/g,
  //     k = 31.54 kips/in → Tn = 2.0, 0.6852, 0.4346, 0.3383, 0.2966 s; masas efectivas 87.95, 8.72, 2.42, 0.75, 0.16 %.
  const ch = block('modal', { masas: '[100, 100, 100, 100, 100] kip', rigideces: '[1,1,1,1,1]*31.54 kip/in', alturas: '[12,12,12,12,12] ft', Sa: '0.5', comb: 'SRSS', fdesp: '1' });
  [2.0, 0.6852, 0.4346, 0.3383, 0.2966].forEach((T, i) => near(`Chopra 5 pisos: T${i + 1} = ${T} s`, ch('T' + (i + 1), 's'), T, 2e-3));
  const chm = block('modal', { masas: '[100, 100, 100, 100, 100] kip', rigideces: '[1,1,1,1,1]*31.54 kip/in', alturas: '[12,12,12,12,12] ft', Sa: '0.5', comb: 'SRSS', fdesp: '1', modos: '1' });
  near('Chopra 5 pisos: M1*/M = 87.95 %', chm('Mpart'), 0.8795, 1e-3);
  truthy('Modal con 1 modo: NO CUMPLE el mínimo de 3 modos y el 90 % de masa (Art. 40.2)', chm.ctx.checks.filter(c => !c.ok).length === 2);

  // (3) Verificación independiente (numpy, autovalores generalizados + CQC de Der Kiureghian con β = 5 %)
  //     del edificio de la plantilla dinámica: T1 = 0.44102 s, Vdin = 185.788 tonf; derivas combinadas desde
  //     las derivas modales: [0.0038706, 0.0050522, 0.0045636, 0.0036196, 0.0020917] (restando desplazamientos
  //     combinados se obtendría 0.0050412 en el piso 2: error no conservador).
  const dy = runTemplate('pe-e030-dinamico');
  near('Dinámico vs numpy: T1 = 0.44102 s', dy('T1', 's'), 0.44102, 1e-4);
  near('Dinámico vs numpy: Vdin CQC = 185.788 tonf', dy('Vdin', 'tonf'), 185.788, 1e-4);
  const dd = vec(dy, 'deriva_din');
  [0.0038706, 0.0050522, 0.0045636, 0.0036196, 0.0020917].forEach((x, i) => near(`Dinámico vs numpy: deriva CQC piso ${i + 1}`, dd[i], x, 1e-4));

  // (4) Tablas de la RM 183-2026 revisadas
  const t = calc(`ct2 = CTE030(2)
ct3 = CTE030(3)
ct4 = CTE030(4)
p1 = sisE030(4, 4, 10)
p2 = sisE030(3, 4, 10)
p3 = sisE030(2, 4, 7)
p4 = sisE030(2, 4, 8)
p5 = sisE030(11, 4, 8)
p6 = sisE030(11, 2, 8)
p7 = sisE030(1, 4, 7)
p8 = sisE030(3, 1, 10)
p9 = sisE030(3, 3, 3)`);
  near('CT acero IMF (pórtico a momentos sin arriostrar) = 35 (Art. 36.1)', t('ct2'), 35);
  near('CT acero OMF = 35', t('ct3'), 35);
  near('CT acero SCBF (arriostrado) = 45', t('ct4'), 45);
  truthy('Tabla N° 9: C admite EMDL en zona 4', t('p1') === 1);
  truthy('Tabla N° 9: B no admite EMDL en zona 4', t('p2') === 0);
  truthy('Tabla N° 9: A2 no admite pórticos de C°A° en zona 4', t('p3') === 0);
  truthy('Tabla N° 9: A2 admite sistema dual en zona 4', t('p4') === 1);
  truthy('Tabla N° 9: A1 sin aislamiento no se permite en zona 4', t('p5') === 0);
  truthy('Tabla N° 9: A1 sin aislamiento, dual, en zona 2', t('p6') === 1);
  truthy('Tabla N° 9: A1 aislada, cualquier sistema', t('p7') === 1);
  truthy('Tabla N° 9: B en zona 1, cualquier sistema', t('p8') === 1);
  truthy('Tabla N° 9: B no admite OMF en zona 3', t('p9') === 0);
  let thrown = false; try { calc('w = pAligE020(0.12 m)'); } catch (e) { thrown = true; }
  truthy('pAligE020 fuera del rango tabulado 0.17–0.30 m produce error (no extrapola)', thrown);
  const irc = block('irregE030', { K: '[38000, 52000, 50000, 47000] tonf/m', cat: '2', zona: '4', disc: '0' });
  truthy('irregE030 acepta el código de categoría de UE030 (2 = A2 → no se permiten irregularidades)', !irc.ctx.checks[0].ok);
}

section('Plantillas con datos extremos: NO CUMPLE sin errores ni NaN');
{
  const set = (subs) => (d) => { for (const b of d.blocks) if (b.type === 'calc') for (const [re, val] of subs) b.src = b.src.replace(new RegExp('^' + re + ' = .*?(?= //|$)', 'm'), re + ' = ' + val); };
  const cases = [
    ['pe-e030-estatico', [['Ki', '[7200, 6100, 5600, 5000, 4100] tonf/m'], ['sistema', '10'], ['categoria', '3']], ['Sistema estructural permitido', 'Distorsión máxima']],
    ['pe-e030-estatico', [['hei', '[6, 6, 6, 6, 9] m'], ['Ki', '[72000, 20000, 56000, 50000, 41000] tonf/m']], ['Aplicabilidad del método estático', 'Análisis estático permitido']],
    ['pe-e030-dinamico', [['Ki', '[7200, 6100, 5600, 5000, 4100] tonf/m'], ['categoria', '2'], ['sistema', '7']], ['Sistema estructural permitido', 'torsión accidental']],
    ['pe-e030-irregularidades', [['K1', '10000 tonf/m'], ['fdesal', '0.5']], ['Restricciones a la irregularidad']],
    ['pe-e020-metrado', [['Lo', '500 kgf/m^2'], ['Ltab', '300 m'], ['bc', '0.25 m']], ['orden de magnitud', 'Sección de columna']],
    ['pe-e020-viento', [['V', '150 km/h'], ['pend', '0.6'], ['d_v', '20 cm']], ['15°', 'Levantamiento', '1 %']],
    ['pe-e030-noestructurales', [['hp', '2.0 m'], ['s', '2 cm'], ['Pe_tq', '30 tonf']], ['esfuerzos admisibles', 'anclaje', 'Junta']],
    ['pe-e031-aislamiento', [['Qd', '1 tonf'], ['kd', '5 tonf/m'], ['Vs30', '300 m/s'], ['zona', '2']], ['TM ≤ 5.0 s']],
    ['pe-e031-aislamiento', [['Qd', '40 tonf'], ['kd', '400 tonf/m']], ['tres veces', '20 %', 'Deriva']],
  ];
  for (const [id, subs, expect] of cases) {
    const r = runTemplate(id, set(subs)).res;
    const bad = r.ctx.checks.filter(c => !c.ok).map(c => c.label || '');
    const ok = r.ctx.errors.length === 0 && !/NaN/.test(r.html) && expect.every(x => bad.some(l => l.includes(x)));
    truthy(`${id} extremo ${subs.map(x => x[0]).join(',')}: NO CUMPLE esperado, sin errores`, ok, ok ? '' : JSON.stringify({ err: r.ctx.errors.slice(0, 2), bad }));
  }
}

section('Rangos usuales [mín..máx] y ejemplos de validación de las plantillas «peru»');
for (const t of TEMPLATES.filter(x => x.id.startsWith('pe-'))) {
  const inp = runTemplate(t.id).res.ctx.inputs, rg = inp.filter(i => i.range);
  const out = rg.filter(i => { let v = parseFloat(i.num); if (i.range.unit && i.unit && i.range.unit !== i.unit) v = math.unit(v, i.unit).toNumber(i.range.unit); return !(v >= i.range.min && v <= i.range.max); });
  const bad = inp.filter(i => /\.\.|\[/.test(i.label || ''));
  truthy(`${t.id}: ${rg.length} datos con rango, valores por defecto dentro del rango, etiquetas limpias`, rg.length >= 3 && out.length === 0 && bad.length === 0, out.map(i => i.name + ' = ' + i.num).concat(bad.map(i => i.name)).join(', '));
  const v = t.validacion;
  truthy(`${t.id}: tiene «validacion» con fuente, nota y valores`, !!(v && v.fuente && v.nota && Array.isArray(v.valores) && v.valores.length >= 3));
}
truthy('Listas desplegables intactas con rango (zona, categoría, sistema; hl y C_pi con rango)', (() => { const f = (id, n) => runTemplate(id).res.ctx.inputs.find(i => i.name === n); return f('pe-e030-estatico', 'zona').options.length === 4 && f('pe-e030-estatico', 'sistema').options.length === 8 && f('pe-e020-metrado', 'hl').options.length === 4 && f('pe-e020-metrado', 'hl').range.max === 0.30 && f('pe-e020-viento', 'C_pi').options.length === 3 && f('pe-e020-viento', 'C_pi').range.max === 0.8; })());
{
  const st = runTemplate('pe-e030-estatico');
  near('Estático: índice de estabilidad del 1.er entrepiso Q = P·Δ1/(V·h1·R)', st('Q').toArray()[0], st('P', 'tonf') * st('Delta_i').toArray()[0].toNumber('m') / (st('V', 'tonf') * 3.5 * 7), 1e-6);
  const dy = runTemplate('pe-e030-dinamico', d => { for (const b of d.blocks) if (b.type === 'calc') b.src = b.src.replace(/^Ia = 1\.0 /m, 'Ia = 0.75 '); });
  truthy('Dinámico: Ia = 0.75 con «irr = Regular» → NO CUMPLE la coherencia (0.85R y 90 %)', dy.res.ctx.checks.some(c => !c.ok && /Coherencia/.test(c.label)));
}
truthy('Plantilla dinámica: validacion con T1 y Vdin del cálculo independiente (numpy)', TEMPLATES.find(x => x.id === 'pe-e030-dinamico').validacion.valores.some(v => v.var === 'T1' && v.esperado === 0.44102));
section('Segunda opinión — segunda tanda (pe-e020-metrado)');
{ const sub2 = (pairs) => (d) => { for (const [a, b] of pairs) { let hit = false; d.blocks.forEach(x => { if (typeof x.src === 'string' && x.src.includes(a)) { x.src = x.src.replace(a, b); hit = true; } }); if (!hit) throw new Error('No se encontró: ' + a); } };
  const g = runTemplate('pe-e020-metrado', sub2([['Ltab = 42 m', 'Ltab = 0 m'], ['wa = 100 kgf/m^2', 'wa = 0 kgf/m^2']]));
  truthy('Metrado sin tabiquería ni acabados: q < 0.6 t/m² → NO CUMPLE el control inferior del orden de magnitud', g.res.ctx.checks.some(c => !c.ok && /Control inferior/.test(c.label)));
}
section('Segunda opinión — tercera tanda B (viento: levantamiento con 0.6 CM)');
{ const w = runTemplate('pe-e020-viento');
  const c = w.res.ctx.checks.find(x => /Levantamiento neto/.test(x.label));
  near('Viento: D/C del levantamiento = (pnet − 0.6·wcob)/qadm', c.ratio, (w('pnet_tb', 'kgf/m^2') - 0.6 * 8) / 60, 1e-6);
}
done();
