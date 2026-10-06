// Pruebas de validación — módulo «chile» (NCh433+DS61, NCh2369, NCh432, DS60, NCh3171)
// Valores de referencia: tablas de las normas (texto refundido NCh433+DS61, NCh2369.Of2003,
// NCh2369:2023, ASCE 7-05 Tabla 6-3 / NCh432:2010, NCh432.Of71) y cálculos manuales independientes.
import { near, truthy, calc, block, runTemplate, section, done, TEMPLATES } from './helpers.mjs';

const al = (T, To, p) => (1 + 4.5 * (T / To) ** p) / (1 + (T / To) ** 3);

section('NCh433 + DS61 — tablas');
{
  const g = calc(`a1 = AoNCh433(1)
a2 = AoNCh433(2)
a3 = AoNCh433(3)
i1 = INCh433(1)
i2 = INCh433(2)
i3 = INCh433(3)
i4 = INCh433(4)
sA = SNCh433(1)
sC = SNCh433("C")
sE = SNCh433(5)
toB = ToNCh433(2)
tpD = TpNCh433(4)
nE = nNCh433(5)
pA = pNCh433(1)
pC = pNCh433(3)`);
  near('Tabla 6.2: Ao zona 1 = 0.20 g', g('a1'), 0.20); near('Tabla 6.2: Ao zona 2 = 0.30 g', g('a2'), 0.30); near('Tabla 6.2: Ao zona 3 = 0.40 g', g('a3'), 0.40);
  near('Tabla 6.1 (DS61): I cat. I = 0.6', g('i1'), 0.6); near('I cat. II = 1.0', g('i2'), 1.0); near('I cat. III = 1.2', g('i3'), 1.2); near('I cat. IV = 1.2', g('i4'), 1.2);
  near('Tabla 6.3: S suelo A = 0.90', g('sA'), 0.90); near('Tabla 6.3: S suelo C ("C") = 1.05', g('sC'), 1.05); near('Tabla 6.3: S suelo E = 1.30', g('sE'), 1.30);
  near('Tabla 6.3: To suelo B = 0.30 s', g('toB', 's'), 0.30); near("Tabla 6.3: T' suelo D = 0.85 s", g('tpD', 's'), 0.85);
  near('Tabla 6.3: n suelo E = 1.80', g('nE'), 1.80); near('Tabla 6.3: p suelo A = 2.0', g('pA'), 2.0); near('Tabla 6.3: p suelo C = 1.6', g('pC'), 1.6);
}

section('NCh433 — espectro, R*, C, Cmáx, Ak, Sde');
{
  const g = calc(`a0 = alphaNCh433(0.4 s, 0.4 s, 1.6)
a1 = alphaNCh433(1.0 s, 0.4 s, 1.6)
a2 = alphaNCh433(0 s, 0.3 s, 1.5)
rs = RstarNCh433(0.5 s, 0.4 s, 11)
rn = RstarNNCh433(10, 0.3 s, 11)
sa = SaNCh433(0.4 s, 1.05, 0.4 s, 1.6, 0.4, rs, 1.2)
c = CNCh433(0.32 s, 1.05, 0.45 s, 1.4, 0.4, 7)
cm7 = CmaxNCh433(7, 1.05, 0.4)
cm2 = CmaxNCh433(2, 1.0, 0.3)
cm55 = CmaxNCh433(5.5, 1.2, 0.4)
cmin = CminNCh433(1.05, 0.4)
f1 = fNCh433(1)
f05 = fNCh433(0.3)
Ak = AkNCh433([3, 6, 9] m)
sde = SdeNCh433(1.125 s, 2, 0.3)
cdD = CdNCh433(1.2 s, 4)
cdA = CdNCh433(3 s, 1)`);
  near('α(Tn = To) = 5.5/2 = 2.75 (ec. 6-9)', g('a0'), 2.75);
  near('α(1.0 s) suelo C', g('a1'), al(1.0, 0.4, 1.6));
  near('α(0) = 1 (aceleración del suelo)', g('a2'), 1);
  near('R* = 1 + T*/(0.1To + T*/Ro), T*=0.5, To=0.4, Ro=11 → 6.851', g('rs'), 1 + 0.5 / (0.04 + 0.5 / 11), 0.001);
  near('R* = 1 + N·Ro/(4To·Ro + N), N=10, To=0.3 → 5.741', g('rn'), 1 + 110 / (13.2 + 10), 0.001);
  near('Sa/g = I·S·Ao·α/R* (suelo C, zona 3, cat. III)', g('sa'), 1.2 * 1.05 * 0.4 * 2.75 / (1 + 0.5 / (0.04 + 0.5 / 11)));
  near("C = 2.75·S·Ao/(gR)·(T'/T*)^n", g('c'), 2.75 * 1.05 * 0.4 / 7 * (0.45 / 0.32) ** 1.4);
  near('Tabla 6.4: Cmáx (R = 7) = 0.35·S·Ao/g', g('cm7'), 0.35 * 1.05 * 0.4);
  near('Tabla 6.4: Cmáx (R = 2) = 0.90·S·Ao/g', g('cm2'), 0.90 * 0.3);
  near('Tabla 6.4: Cmáx (R = 5.5) = 0.40·S·Ao/g', g('cm55'), 0.40 * 1.2 * 0.4);
  near('Cmín = Ao·S/(6g)', g('cmin'), 0.4 * 1.05 / 6);
  near('f = 1.25 − 0.5q, q = 1 → 0.75 (ec. 6-3)', g('f1'), 0.75);
  near('f con q < 0.5 → q = 0.5 → 1.0', g('f05'), 1.0);
  const Ak = g('Ak').toArray();
  near('Ak nivel 1 = 1 − √(2/3) (ec. 6-5)', Ak[0], 1 - Math.sqrt(2 / 3));
  near('Ak nivel 3 = √(1/3)', Ak[2], Math.sqrt(1 / 3));
  near('Σ Ak = 1', Ak.reduce((a, b) => a + b, 0), 1);
  // Sde = T²/(4π²)·α·Ao·Cd* (Ao en cm/s²), suelo B, Cd* = 0.95T + 0.55
  const T = 1.125; near('Sde suelo B, T = 1.125 s, zona 2 [cm] (ec. 6-12)', g('sde', 'cm'), T * T / (4 * Math.PI ** 2) * al(T, 0.3, 1.5) * 0.3 * 980.665 * (0.95 * T + 0.55));
  near('Tabla 6.5: Cd* suelo D, T = 1.2 s = 1.1·T', g('cdD'), 1.32);
  near('Tabla 6.5: Cd* suelo A, T = 3 s = 0.08T² − 0.9T + 3.24', g('cdA'), 0.08 * 9 - 2.7 + 3.24);
}

section('NCh2369.Of2003 y NCh2369:2023');
{
  const g = calc(`tp3 = TpNCh2369(3)
n4 = nNCh2369(4)
i1 = INCh2369(1)
i3 = INCh2369(3)
c = CNCh2369(0.35 s, 0.35 s, 1.33, 0.4, 5, 0.03)
cm1 = CmaxNCh2369(3, 0.05, 0.4)
cm2 = CmaxNCh2369(3, 0.05, 0.3)
cm3 = CmaxNCh2369(5, 0.02, 0.4)
cm4 = CmaxNCh2369(1, 0.03, 0.2)
cmin = CminNCh2369(0.4)
sa1 = SaNCh2369(0.1 s, 0.35 s, 1.33, 0.4, 1, 5, 0.03)
sa2 = SaNCh2369(1.5 s, 0.35 s, 1.33, 0.4, 1, 5, 0.03)
v1 = SaNCh2369v23(0.1 s, 2, 0.4, 1, 5, 0.05)
v2 = SaNCh2369v23(2 s, 2, 0.4, 1, 5, 0.05)`);
  near("Tabla 5.4: T' suelo III = 0.62 s", g('tp3', 's'), 0.62); near('Tabla 5.4: n suelo IV = 1.80', g('n4'), 1.80);
  near('4.3.2: I categoría C1 = 1.20', g('i1'), 1.2); near('4.3.2: I categoría C3 = 0.80', g('i3'), 0.8);
  near("C = 2.75Ao/(gR)·(T'/T*)^n·(0.05/ξ)^0.4, T* = T', ξ = 0.03", g('c'), 0.22 * (0.05 / 0.03) ** 0.4);
  near('Tabla 5.7: Cmáx R = 3, ξ = 0.05, zona 3 = 0.28', g('cm1'), 0.28);
  near('Tabla 5.7: Cmáx R = 3, ξ = 0.05, zona 2 = 0.75·0.28', g('cm2'), 0.21);
  near('Tabla 5.7: Cmáx R = 5, ξ = 0.02 = 0.26', g('cm3'), 0.26);
  near('Tabla 5.7: Cmáx R = 1, ξ = 0.03, zona 1 = 0.50·0.68', g('cm4'), 0.34);
  near('Cmín = 0.25·Ao/g (5.3.3.2)', g('cmin'), 0.10);
  near('Sa periodo corto limitado a I·Cmáx (5.4.2)', g('sa1'), 0.23);
  near('Sa(1.5 s) rama descendente', g('sa2'), 2.75 * 0.4 / 5 * (0.35 / 1.5) ** 1.33 * (0.05 / 0.03) ** 0.4);
  near('NCh2369:2023 meseta Smáx = 2.75·I·S·Ao/(R+1)·(0.05/ξ)^0.4 (ec. 1.1)', g('v1'), 2.75 * 0.4 / 6);
  near('NCh2369:2023 Sa(2 s) = 0.7·I·1.4·S·Ao·α/R (ec. 1 y 3, suelo B)', g('v2'), 0.7 * 1.4 * 0.4 * al(2, 0.30, 1.60) / 5);
  const h = calc(`sv1 = SaVNCh2369v23(0.1 s, 3, 0.4, 1)
sv2 = SaVNCh2369v23(0.5 s, 1, 0.3, 1.2, 2, 0.05)
i1 = INCh2369v23(1)
i4 = INCh2369v23(4)
cm = CminNCh2369v23(1.2, 1.05, 0.4)
cmx5 = CmaxNCh433(5, 1, 0.4)`);
  near('NCh2369:2023 vertical (ec. 2 y 4): 0,7·S·Ao·α(1,7TV/T0)/2·(0,05/0,03)^0,4, suelo C', h('sv1'), 0.7 * 1.05 * 0.4 * al(0.17, 0.40, 1.50) / 2 * (0.05 / 0.03) ** 0.4);
  near('NCh2369:2023 vertical con ξV = 0,05, suelo A, I = 1,2', h('sv2'), 0.7 * 1.2 * 0.9 * 0.3 * al(0.85, 0.15, 1.85) / 2);
  near('NCh2369:2023 4.3.2: I categoría I = 0,80', h('i1'), 0.8); near('NCh2369:2023 4.3.2: I categoría IV = 1,20', h('i4'), 1.2);
  near('NCh2369:2023 5.12.1: Cmín = 0,25·I·S·Ao/g', h('cm'), 0.25 * 1.2 * 1.05 * 0.4);
  near('NCh433 Tabla 6.4: R = 5 (IMF, no tabulado) interpolado 0,45·S·Ao/g', h('cmx5'), 0.45 * 0.4);
  let err = ''; try { calc('x = SaNCh2369v23(1 s, 2, 0.4, 1, 5, 0.01)'); } catch (e) { err = String(e.message); }
  truthy('NCh2369:2023: ξ fuera de 0,02–0,05 → error explícito', /0,02/.test(err));
}

section('Ejemplo publicado: análisis estático NCh433+DS61 (Meriño Sepúlveda, memoria de título U. del Bío-Bío, Anexo A, Tablas 1–4)');
{
  // Edificio de 5 pisos de muros, h = 2,5 m, zona 3, suelo D, cat. II, P = 914,6005 tonf, bky = 23,5 m.
  // Publicado: Cmáx(R = 4) = 0,264; Cmáx(R = 7) = 0,168; Cmín = 0,080; Qb = 241,45 / 153,65 tonf;
  // Ak = 0,106/0,120/0,142/0,185/0,447; Fkx (R = 4) = 29,361/33,326/39,531/51,518/87,719 tonf; ex1 = 0,470 m; Tax1 = 13,800 tonf·m.
  const g = calc(`Ao = AoNCh433(3)
S = SNCh433("D")
Pk = [194.3775, 194.3775, 194.3775, 194.3775, 137.0905] tonf
P = sum(Pk)
Zk = 2.5 m*(1:5)
c4 = min(max(CNCh433(0.08 s, S, TpNCh433(4), nNCh433(4), Ao, 4), CminNCh433(S, Ao)), CmaxNCh433(4, S, Ao))
c7 = min(max(CNCh433(0.08 s, S, TpNCh433(4), nNCh433(4), Ao, 7), CminNCh433(S, Ao)), CmaxNCh433(7, S, Ao))
cmin = CminNCh433(S, Ao)
Q4 = c4*INCh433(2)*P
Q7 = c7*INCh433(2)*P
Ak = AkNCh433(Zk)
F4 = Ak .* Pk / sum(Ak .* Pk) * Q4
ex = 0.10*23.5 m*Zk/(12.5 m)
Mt = F4 .* ex`);
  near('Meriño: Cmáx (R = 4, suelo D, zona 3) = 0,264', g('c4'), 0.264, 0.002);
  near('Meriño: Cmáx (R = 7) = 0,168', g('c7'), 0.168, 0.002);
  near('Meriño: Cmín = 0,080', g('cmin'), 0.080, 0.002);
  near('Meriño: Qbx (R = 4) = 241,45 tonf', g('Q4', 'tonf'), 241.45, 0.001);
  near('Meriño: Qbx (R = 7) = 153,65 tonf', g('Q7', 'tonf'), 153.65, 0.001);
  const Ak = g('Ak').toArray(), F = g('F4').toArray().map(u => u.toNumber('tonf')), Mt = g('Mt').toArray().map(u => u.toNumber('tonf*m'));
  [0.106, 0.120, 0.142, 0.185, 0.447].forEach((v, i) => near(`Meriño: A${i + 1} = ${v}`, Ak[i], v, 0.005));
  [29.361, 33.326, 39.531, 51.518, 87.719].forEach((v, i) => near(`Meriño: F${i + 1}x (R = 4) = ${v} tonf`, F[i], v, 0.002));
  near('Meriño: momento torsor accidental nivel 1 = 13,800 tonf·m', Mt[0], 13.800, 0.002);
  near('Meriño: momento torsor accidental nivel 5 = 206,140 tonf·m', Mt[4], 206.140, 0.002);
}

section('Análisis modal (edificio de cortante) y CQC');
{
  // 2 pisos iguales: m = 1 tonf·s²/m (P = 9.80665 tonf), k = 100 tonf/m → ω² = (3 ∓ √5)/2 · k/m
  const g = calc(`P = [9.80665, 9.80665] tonf
k = [100, 100] tonf/m
T = TmodosCL(P, k)
G = GammaModosCL(P, k)
M = MeffModosCL(P, k)
F = FmodalCL(P, k, [0.1, 0.1])
V = cortesCL(F)
x = cqcNCh433([[3, 4]], [1, 0.01] s)
y = cqcNCh433([[1, 1]], [1, 0.8] s)`);
  const T = g('T').toArray().map(u => u.toNumber('s')), w1 = Math.sqrt((3 - Math.sqrt(5)) / 2 * 100), w2 = Math.sqrt((3 + Math.sqrt(5)) / 2 * 100);
  near('T1 = 2π/ω1, ω1² = 0.382·k/m', T[0], 2 * Math.PI / w1, 0.0005);
  near('T2 = 2π/ω2, ω2² = 2.618·k/m', T[1], 2 * Math.PI / w2, 0.0005);
  const phi1 = (1 + Math.sqrt(5)) / 2 - 1;  // φ1 = [0.618, 1]
  near('Γ1 = Σmφ/Σmφ² = 1.1708', g('G').toArray()[0], (phi1 + 1) / (phi1 ** 2 + 1), 0.0005);
  near('Masa equivalente modo 1 = 0.9472', g('M').toArray()[0], (phi1 + 1) ** 2 / (phi1 ** 2 + 1) / 2, 0.0005);
  near('Corte basal modo 1 = M1*·W·Sa', g('V').toArray()[0][0].toNumber('tonf'), (phi1 + 1) ** 2 / (phi1 ** 2 + 1) / 2 * 2 * 9.80665 * 0.1, 0.0005);
  near('CQC con modos muy separados → SRSS = 5', g('x').toArray()[0], 5, 0.002);
  const r = 0.8, xi = 0.05, rho = 8 * xi * xi * (1 + r) * r ** 1.5 / ((1 - r * r) ** 2 + 4 * xi * xi * r * (1 + r) ** 2);
  near('CQC ρ12 (r = 0.8, ξ = 5 %) = 0.1656 (Der Kiureghian)', g('y').toArray()[0], Math.sqrt(2 + 2 * rho), 0.0005);
}

section('Viento NCh432');
{
  const g = calc(`kb = KzNCh432(9.144 m, 1)
kc = KzNCh432(9.144 m, 2)
kd = KzNCh432(9.144 m, 3)
kc0 = KzNCh432(3 m, 2)
q = qzNCh432(10 m, 35 m/s, 2, 1)
c1 = CpTechoNCh432(10 deg, 0.25, 1)
c2 = CpTechoNCh432(20 deg, 0.5, 2)
c3 = CpTechoSotNCh432(15 deg, 1.0)
c4 = CpMuroSotNCh432(2)
o1 = qNCh432Of71(15 m, 1)
o2 = qNCh432Of71(10 m, 2)
o3 = qNCh432Of71(25 m, 1)`);
  near('Kz exposición B a 30 ft = 0.70 (ASCE 7-05 Tabla 6-3, caso 2)', g('kb'), 0.70, 0.01);
  near('Kz exposición C a 30 ft = 0.98', g('kc'), 0.98, 0.01);
  near('Kz exposición D a 30 ft = 1.16', g('kd'), 1.16, 0.01);
  near('Kz exposición C bajo 15 ft = 0.85', g('kc0'), 0.85, 0.01);
  near('qz = 0.613·Kz·Kd·V²·I [N/m²]', g('q', 'N/m^2'), 0.613 * 2.01 * (10 / 274.32) ** (2 / 9.5) * 0.85 * 35 * 35);
  near('Cp techo barlovento θ = 10°, h/L ≤ 0.25 = −0.7', g('c1'), -0.7); near('Cp techo barlovento θ = 20°, h/L = 0.5, caso 2 = 0.0', g('c2') + 1, 1);
  near('Cp techo sotavento θ = 15°, h/L ≥ 1 = −0.6', g('c3'), -0.6); near('Cp muro sotavento L/B = 2 = −0.3', g('c4'), -0.3);
  const w = calc(`f1 = CpTechoNCh432(5 deg, 0.3, 1)
f2 = CpTechoNCh432(5 deg, 1.0, 1)
f3 = CpTechoSotNCh432(5 deg, 0.3)`);
  near('Cp techo θ < 10° (h/L ≤ 0,5): borde de barlovento −0,9 (ASCE 7-05 Fig. 6-6)', w('f1'), -0.9); near('Cp techo θ < 10° (h/L ≥ 1): −1,3', w('f2'), -1.3);
  near('Cp sotavento θ < 10°: zona h–2h −0,5 (envolvente)', w('f3'), -0.5);
  near('NCh432.Of71 Tabla 1: ciudad, 15 m = 75 kgf/m²', g('o1', 'kgf/m^2'), 75); near('NCh432.Of71: campo abierto, 10 m = 106 kgf/m²', g('o2', 'kgf/m^2'), 106);
  near('NCh432.Of71: interpolación ciudad 25 m = 90 kgf/m²', g('o3', 'kgf/m^2'), 90);
}

section('Bloques');
{
  const b = block('spectrumCL', { norma: 'NCh433', zona: '3', suelo: '3', I: '1', R: '11', T: '0.4', elastico: true, comparar: true });
  const rs = 1 + 0.4 / (0.04 + 0.4 / 11);
  near('spectrumCL: R* exportado (T* = To)', b('Rs'), rs);
  near('spectrumCL: Sa_T = S·Ao·α/R* con α = 2.75', b('Sa_T'), 1.05 * 0.4 * 2.75 / rs);
  truthy('spectrumCL dibuja SVG con leyenda', /<svg/.test(b.html) && /legend/.test(b.html));
  const b2 = block('spectrumCL', { norma: 'NCh2369', zona: '3', suelo: '2', I: '1', R: '5', xi: '0.03', T: '0.2' });
  near('spectrumCL NCh2369: Sa_T = I·Cmáx en periodo corto', b2('Sa_T'), 0.23);
  // Muro sin carga axial con armadura simétrica: Mn ≈ As·fy·(d − d') + aporte del alma (cota inferior)
  const m = block('muroCL', { lw: '4 m', e: '30 cm', fc: '30 MPa', fy: '420 MPa', nb: '8', dbb: '22', lb: '60 cm', dbw: '10', sw: '20 cm', rec: '4 cm', Pu: '0 tonf', du: '8 cm', hw: '30 m' });
  const As = 8 * Math.PI * 22 * 22 / 4, z = (4000 - 300) - 300;   // centroides de bordes a 300 mm de cada extremo
  const Mlow = As * 420 * z / 9.80665e6;
  truthy('muroCL: Mn (P = 0) ≥ As·fy·(distancia entre centroides de bordes)', b2 && m('Mn_w', 'tonf*m') >= Mlow * 0.98, `Mn = ${m('Mn_w', 'tonf*m').toFixed(1)} t·m ≥ ${Mlow.toFixed(1)}`);
  truthy('muroCL: Mn (P = 0) ≤ 1.5 × cota (aporte de la malla del alma acotado)', m('Mn_w', 'tonf*m') <= Mlow * 1.5);
  near('muroCL: φ = 0.9 (sección controlada por tracción)', m('phi_w'), 0.9);
  const m2 = block('muroCL', { lw: '4 m', e: '30 cm', fc: '30 MPa', fy: '420 MPa', nb: '8', dbb: '22', lb: '60 cm', dbw: '10', sw: '20 cm', rec: '4 cm', Pu: '800 tonf', du: '20 cm', hw: '30 m' });
  truthy('muroCL: mayor Pu → mayor profundidad del eje neutro', m2('c_w', 'cm') > m('c_w', 'cm'));
  const climit = 400 / (600 * 20 / 3000), c2 = m2('c_w', 'cm');
  truthy('muroCL: Pu = 800 tonf exige elemento de borde (c ≥ lw/(600δu/hw))', c2 >= climit, `c = ${c2.toFixed(1)} cm, c_lím = ${climit.toFixed(1)} cm`);
  near('muroCL: cc = máx(c − c_lím; c − 0.1lw; c/2) (DS60 21-8a / ACI 21.9.6.4 a)', m2('cc_w', 'cm'), Math.max(c2 - climit, c2 - 40, c2 / 2), 0.002);
  near('muroCL: sin elemento de borde requerido → cc = 0', m('cc_w', 'cm') + 1, 1);
  const f = block('fuerzasCL', { Z: '[3, 6, 9]', F: '[10, 20, 30] tonf', u: 'tonf' });
  truthy('fuerzasCL dibuja la elevación', /<svg/.test(f.html) && /V3 = 30/.test(f.html));
}

section('Plantillas «chile»: sin errores y todas las verificaciones cumplen');
for (const t of TEMPLATES.filter(x => x.id.startsWith('cl-'))) {
  const r = runTemplate(t.id).res.ctx;
  truthy(`${t.id.padEnd(20)} ${r.checks.length} verificaciones, ${r.errors.length} errores`, r.errors.length === 0 && r.checks.length > 0 && r.checks.every(c => c.ok), r.errors.map(e => e.msg).join('; '));
}

section('Plantillas: valores de control (cálculo manual independiente)');
{
  const g = runTemplate('cl-nch433-estatico');
  const P = 4 * 320 * (0.95 + 0.25 * 0.20) + 320 * 0.75, Cmax = 0.75 * 0.35 * 1.05 * 0.4;
  near('Estático: P = 1520 tonf', g('P', 'tonf'), P);
  near('Estático: Qox = f·Cmáx·I·P (controla Cmáx)', g('Qox', 'tonf'), Cmax * P);
  near('Estático: Σ Fkx = Qox', g('Fkx').toArray().reduce((a, b) => a + b.toNumber('tonf'), 0), Cmax * P);
  const m = runTemplate('cl-nch433-modal');
  const Ts = m('Ts', 's');
  near('Modal: R* con T* del primer modo', m('Rs'), 1 + Ts / (0.03 + Ts / 11));
  near('Modal: Qmín = I·S·Ao·P/6 = 110 tonf', m('Qmin', 'tonf'), 2200 * 0.3 / 6);
  truthy('Modal: corte basal escalado al mínimo', Math.abs(m('fs') * m('Qo', 'tonf') - 110) < 0.01, `fs = ${m('fs').toFixed(3)}`);
  const n = runTemplate('cl-nch2369');
  near('NCh2369: Cd = Cmáx(R = 5, ξ = 0.03, zona 3) = 0.23', n('Cd'), 0.23);
  near('NCh2369: Qo = Cd·I·P', n('Qo', 'tonf'), 0.23 * n('P', 'tonf'));
  const w = runTemplate('cl-muro-ds60');
  near('Muro: δu = 1.3·Sde(1.5·T) [cm]', w('deltau', 'cm'), 1.3 * 1.125 ** 2 / (4 * Math.PI ** 2) * al(1.125, 0.3, 1.5) * 0.3 * 980.665 * (0.95 * 1.125 + 0.55));
  near('Muro: Vn = Acv(αc√f\'c + ρt·fy) [tonf]', w('Vn', 'tonf'), 1.5e6 * (0.17 * Math.sqrt(30) + 2 * Math.PI * 25 / (250 * 200) * 420) / 9806.65);
  const v = runTemplate('cl-viento-galpon');
  near('Viento: qh = 0.613·Kz(h)·Kd·V² [kgf/m²]', v('qh', 'kgf/m^2'), 0.613 * 2.01 * (v('h', 'm') / 274.32) ** (2 / 9.5) * 0.85 * 35 ** 2 / 9.80665);
  near('NCh2369: corte en marco interior = Qo·s/L', n('Qmarco', 'tonf'), 0.23 * n('P', 'tonf') * 6 / 60);
  truthy('NCh2369:2023: corte basal comparativo calculado', n('Q23', 'tonf') > 0 && Number.isFinite(n('r23')), `Q23 = ${n('Q23', 'tonf').toFixed(2)} tonf, Q23/Q2003 = ${n('r23').toFixed(3)}`);
  {
    const B = 20, he = 7, r = 10 * Math.tan(10 * Math.PI / 180), s = 6, k = s / 1000;
    const wmb = v('pmb', 'kgf/m^2') * k, wms = v('pms', 'kgf/m^2') * k, wtb = v('ptb', 'kgf/m^2') * k, wts = v('pts', 'kgf/m^2') * k;
    // equilibrio global, momentos respecto de la base de sotavento (vertical: carga en faldón sobre B/2, centroides a B/4 y 3B/4)
    const Rup = (-wtb * B / 2 * 0.75 - wts * B / 2 * 0.25) + ((wmb - wms) * he * he / 2 + (wtb - wts) * r * (he + r / 2)) / B;
    near('Viento: levantamiento en base de barlovento por equilibrio global [tonf]', v('Rup', 'tonf'), Rup);
  }
  const c = runTemplate('cl-nch3171');
  near('NCh3171: Pu máx = 1.2D + 1.4E + L', c('Pumax', 'tonf'), 1.2 * 85 + 1.4 * 32 + 28);
  near('NCh3171: Pu mín = 0.9D − 1.4E', c('Pumin', 'tonf'), 0.9 * 85 - 1.4 * 32);
}

section('Datos absurdos no producen «TODAS CUMPLEN» ni errores');
{
  const cleanFail = (r) => r.res.ctx.errors.length === 0 && r.res.ctx.checks.some(c => !c.ok) && !/NaN/.test(r.res.html);
  const muta = (id, pairs) => runTemplate(id, d => { for (const [a, b] of pairs) { const bl = d.blocks.find(x => (x.src || '').includes(a)); bl.src = bl.src.replace(a, b); } });
  truthy('Estático con N = 8 pisos: falla 6.2.1 b) sin errores', cleanFail(muta('cl-nch433-estatico', [['N = 5', 'N = 8'], ['dcmx = [0.08, 0.11, 0.12, 0.12, 0.11]', 'dcmx = [0.08, 0.11, 0.12, 0.12, 0.11, 0.1, 0.1, 0.1]'], ['dpx = [0.11, 0.15, 0.16, 0.16, 0.15]', 'dpx = [0.11, 0.15, 0.16, 0.16, 0.15, 0.1, 0.1, 0.1]'], ['dcmy = [0.06, 0.08, 0.09, 0.09, 0.08]', 'dcmy = [0.06, 0.08, 0.09, 0.09, 0.08, 0.1, 0.1, 0.1]'], ['dpy = [0.09, 0.12, 0.13, 0.13, 0.12]', 'dpy = [0.09, 0.12, 0.13, 0.13, 0.12, 0.1, 0.1, 0.1]']])));
  truthy('Modal con rigideces 100 veces menores: falla la deriva', cleanFail(muta('cl-nch433-modal', [['kx = [60000, 56000, 52000, 46000, 38000, 28000]', 'kx = [600, 560, 520, 460, 380, 280]']])));
  truthy('NCh2369 con K = 50 tonf/m y R = 1: falla deformación 0,015h', cleanFail(muta('cl-nch2369', [['R = 5 //', 'R = 1 //'], ['K = 5200', 'K = 50']])));
  truthy('Muro con Tx = 1,3 s y Pu = 1300 tonf: exige elemento de borde y falla', cleanFail(muta('cl-muro-ds60', [['Pu = 520 tonf', 'Pu = 1300 tonf'], ['Tx = 0.75 s', 'Tx = 1.3 s']])));
  truthy('NCh3171 con E = 300 tonf: falla resistencia y tracción', cleanFail(muta('cl-nch3171', [['E = 32 tonf', 'E = 300 tonf']])));
  const g = runTemplate('cl-nch433-estatico', d => { const b = d.blocks.find(x => /dcmx = /.test(x.src || '')); b.src = b.src.replace('dcmx = [0.08,', 'dcmx = [0.98,'); });
  truthy('Deriva excesiva → falla 5.9.2', g.res.ctx.checks.some(c => !c.ok) && !/TODAS LAS VERIFICACIONES CUMPLEN/.test(g.res.html));
  const w = runTemplate('cl-muro-ds60', d => { const b = d.blocks.find(x => /Pu = 520/.test(x.src || '')); b.src = b.src.replace('Pu = 520 tonf', 'Pu = 2000 tonf'); });
  truthy('Carga axial excesiva → falla 0.35 f\'c Ag (DS60 21.9.5.3)', w.res.ctx.checks.some(c => !c.ok));
}
done();
