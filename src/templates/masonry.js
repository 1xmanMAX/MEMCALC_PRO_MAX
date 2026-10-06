// =====================================================================
//  Plantillas — módulo «masonry»
//  Albañilería (E.070), madera (E.010 / JUNAC), tierra (E.080) y
//  estructuras contenedoras de líquidos (ACI 350 / ACI 350.3 / PCA)
// =====================================================================
import { calc, text, summary } from './_h.js';

const UNI = '[1 : King Kong artesanal|2 : King Kong industrial|3 : Rejilla industrial|4 : Sílice-cal King Kong|5 : Sílice-cal Dédalo|6 : Sílice-cal estándar|7 : Bloque P (f\'b 50)|8 : Bloque P (f\'b 65)|9 : Bloque P (f\'b 75)|10 : Bloque P (f\'b 85)]';
const ZONA = '[0.45 : Zona 4|0.35 : Zona 3|0.25 : Zona 2|0.10 : Zona 1]';
const SUELO = '[0.80 : S0 roca dura|1.00 : S1 roca o suelo rígido|1.05 : S2 intermedio (Z4)|1.10 : S3 blando (Z4)|1.15 : S2 intermedio (Z3)|1.20 : S3 blando (Z3)]';
const TP = '[0.3 s|0.4 s|0.6 s|1.0 s]';
const TL = '[3.0 s|2.5 s|2.0 s|1.6 s]';
const GRUPO = '[1 : Grupo A|2 : Grupo B|3 : Grupo C]';

// Planta del edificio de 4 pisos (dimensiones en m, cargas en tonf al nivel del primer piso)
const MUROS_EDIF = `X1 X 0 0 3.6 0.23 Pg=24 Pm=28
X2 X 6.4 0 3.6 0.23 Pg=24 Pm=28
X3 X 0 15 3.6 0.23 Pg=24 Pm=28
X4 X 6.4 15 3.6 0.23 Pg=24 Pm=28
X5 X 0 5 4.4 0.23 Pg=36 Pm=42
X6 X 5.6 5 4.4 0.23 Pg=36 Pm=42
X7 X 0 10 4.4 0.23 Pg=36 Pm=42
X8 X 5.6 10 4.4 0.23 Pg=36 Pm=42
X9 X 0 7.5 4.0 0.13 Pg=26 Pm=30
X10 X 6 7.5 4.0 0.13 Pg=26 Pm=30
Y1 Y 0 0 7.2 0.23 Pg=50 Pm=58
Y2 Y 0 7.8 7.2 0.23 Pg=50 Pm=58
Y3 Y 10 0 7.2 0.23 Pg=50 Pm=58
Y4 Y 10 7.8 7.2 0.23 Pg=50 Pm=58
Y5 Y 4.4 1 4.0 0.13 Pg=30 Pm=35
Y6 Y 5.6 10 3.5 0.13 Pg=26 Pm=30`;

const dirAxial = (D) => `## Cargas axiales y esfuerzo axial máximo — dirección ${D} (Art. 19.1.b)
"Cargas de gravedad acumuladas en el primer piso por área tributaria (Pg con 25 % de sobrecarga para la resistencia al corte, Pm con 100 % para el esfuerzo axial); se ingresan en la planta de muros.
sigma${D} = Pm${D} ./ (L${D} .* t${D}) // Esfuerzo axial σm = Pm/(L·t)
Fa${D} = FaE070(fm, hl, t${D}) // Fa = 0.2 f'm [1 − (h/35t)²] ≤ 0.15 f'm (Art. 19.1.b)
ra${D} = max(sigma${D} ./ Fa${D}) // Relación máxima σm/Fa
check ra${D} <= 1 // Esfuerzo axial máximo, dirección ${D} (Art. 19.1.b)`;

const dirSeis = (D) => `## Fuerzas del sismo moderado y resistencia al corte — dirección ${D}
Ve${D} = r${D}*Ve1 // Cortante por muro: Ve = (k/Σk + torsión)·V (Art. 24.5 y E.030 Art. 28.5)
Me${D} = Ve${D}*hM // Momento flector del muro (voladizo): Me = Ve·(M1/V1)
alpha${D} = alphaE070(Ve${D}, L${D}, Me${D}) // α = Ve·L/Me, 1/3 ≤ α ≤ 1 (Art. 26.3)
Vm${D} = VmE070(vm, alpha${D}, t${D}, L${D}, Pg${D}, matE070(uni)) // Vm = 0.5 v'm α t L + 0.23 Pg (Art. 26.3)
rf${D} = max(Ve${D} ./ (0.55*Vm${D})) // Relación máxima Ve/(0.55 Vm)
check rf${D} <= 1 // Control de fisuración Ve ≤ 0.55 Vm en todos los muros, dirección ${D} (Art. 26.2)
SVm${D} = sum(Vm${D}) -> tonf // Resistencia al corte del entrepiso ΣVm
check SVm${D} >= VE // Resistencia global ΣVm ≥ VE ante sismo severo, dirección ${D} (Art. 26.4)
f${D} = factE070(Vm${D}, Ve${D}) // Factor de amplificación 2 ≤ Vm1/Ve1 ≤ 3 (Art. 27)
Vu${D} = f${D} .* Ve${D} // Cortante último ante sismo severo Vu = Ve·(Vm1/Ve1) (Art. 27)
Mu${D} = f${D} .* Me${D} // Momento último Mu = Me·(Vm1/Ve1) (Art. 27)`;

const tabAxial = (D) => ({
  type: 'table', dec: '2', titulo: `Cargas axiales y esfuerzo axial en los muros del primer piso — dirección ${D}`,
  columnas: `Muro = id${D}\nL [m] = L${D}\nt [cm] = t${D}\n$P_g$ [tonf] = Pg${D}\n$P_m$ [tonf] = Pm${D}\n$\\sigma_m$ [kgf/cm²] = sigma${D}\n$F_a$ [kgf/cm²] = Fa${D}\n$\\sigma_m/F_a$ = sigma${D} ./ Fa${D}`,
});
const tabSeis = (D) => ({
  type: 'table', dec: '2', titulo: `Sismo moderado, fisuración y fuerzas del sismo severo — dirección ${D}`,
  columnas: `Muro = id${D}\n$V_e$ [tonf] = Ve${D}\n$M_e$ [tonf·m] = Me${D}\n$\\alpha$ = alpha${D}\n$V_m$ [tonf] = Vm${D}\n$V_e/0.55V_m$ = Ve${D} ./ (0.55*Vm${D})\n$V_m/V_e$ = Vm${D} ./ Ve${D}\n$V_u$ [tonf] = Vu${D}\n$M_u$ [tonf·m] = Mu${D}`,
});

export default [
  // ===================================================================
  //  1) EDIFICIO DE ALBAÑILERÍA CONFINADA — E.070 COMPLETO
  // ===================================================================
  {
    id: 'ma-edificio', pais: 'PE', cat: 'Albañilería', icon: 'grid',
    name: 'Edificio de albañilería confinada (E.070)', normas: 'RNE — NTE E.070 Albañilería (2006), E.030 Diseño Sismorresistente (2018), E.060, E.020',
    desc: 'Edificio de 4 pisos: densidad y planta de muros (CM/CR), cargas axiales, sismo por muro según rigidez con torsión, fisuración, resistencia global y diseño de columnas y soleras (Art. 27).',
    titulo: 'Memoria de cálculo — Edificio multifamiliar de albañilería confinada de 4 pisos',
    blocks: [
      text(`# Generalidades
La presente memoria desarrolla el diseño estructural de un **edificio multifamiliar de cuatro pisos** de albañilería confinada (ladrillo de arcilla King Kong industrial, losas aligeradas de 20 cm que conforman diafragmas rígidos), siguiendo el método de diseño por desempeño de la **NTE E.070 Albañilería** (2006): el sismo moderado ($R = 6$) no debe fisurar ningún muro y la resistencia al corte del edificio debe superar la demanda del sismo severo ($R = 3$).

**Normas:** RNE — E.020 Cargas, E.030 Diseño Sismorresistente (2018), E.060 Concreto Armado, E.070 Albañilería. **Referencia:** A. San Bartolomé, D. Quiun y W. Silva, *Diseño y construcción de estructuras sismorresistentes de albañilería* (Fondo Editorial PUCP), Cap. «Ejemplo de diseño de un edificio de albañilería confinada».

**Hipótesis:** muros en voladizo por entrepiso para la distribución del cortante (Art. 24.5), centro de masas en el centroide de la planta típica, cargas de gravedad por área tributaria (Pg con 25 % de sobrecarga y Pm con 100 %, Art. 26.3 y 19.1.b). El análisis estático es válido para edificios regulares de hasta 15 m de altura (E.030 Art. 28).`),
      calc(`# Materiales
uni = 2 // Unidad de albañilería (E.070 Tabla 9) ${UNI}
fm = fmE070(uni) // Resistencia característica a compresión de pilas f'm (Tabla 9)
vm = vmE070(uni) // Resistencia característica a corte de muretes v'm (Tabla 9)
Em = EmE070(fm, matE070(uni)) // Módulo de elasticidad Em = 500 f'm (Art. 24.7)
Gm = 0.4*Em // Módulo de corte Gm = 0.4 Em (Art. 24.7)
fc = 175 kgf/cm^2 // Concreto de confinamiento f'c ≥ 175 kg/cm² (Art. 20.1.f) [175 kgf/cm^2|210 kgf/cm^2]
fy = 4200 kgf/cm^2 // Acero corrugado ASTM A615 grado 60
# Parámetros de la edificación
N = 4 // Número de pisos (E.070 Art. 27: hasta 5 pisos o 15 m)
h1 = 2.60 m // Altura de entrepiso (piso a piso)
hl = 2.40 m // Altura libre del muro (Art. 19.1.a)
wp = 0.90 tonf/m^2 // Peso sísmico por m² de planta (CM + 25 % CV, E.030 Art. 26)
Z = 0.45 // Factor de zona (E.030 Tabla 1) ${ZONA}
U = 1.0 // Factor de uso — vivienda, categoría C (E.030 Tabla 5) [1.0|1.3|1.5]
S = 1.05 // Factor de suelo (E.030 Tabla 3) ${SUELO}
Tp = 0.6 s // Periodo TP (E.030 Tabla 4) ${TP}
Tl = 2.0 s // Periodo TL (E.030 Tabla 4) ${TL}`),
      { type: 'wallplan', muros: MUROS_EDIF, planta: '0 0 10 15', Ap: '', cm: '', Z: 'Z', U: 'U', S: 'S', N: 'N', h: 'h1', hl: 'hl', apoyo: 'voladizo', ea: '0.05', titulo: 'Planta típica de muros (muros de soga t = 13 cm y de cabeza t = 23 cm), CM y CR' },
      calc(`# Análisis sísmico (E.030 Art. 28 — fuerzas estáticas equivalentes)
hn = N*h1 // Altura total de la edificación
CT = 60 m/s // Coeficiente CT para albañilería (E.030 Art. 28.4.1)
Te = hn/CT -> s // Periodo fundamental T = hn/CT
Cs = CE030(Te, Tp, Tl) // Factor de amplificación sísmica (E.030 Art. 14)
P = N*wp*Ap -> tonf // Peso sísmico de la edificación (E.030 Art. 26)
VE = Z*U*Cs*S/3*P -> tonf // Cortante basal del sismo severo, R = 3 (E.070 Art. 23)
Ve1 = VE/2 -> tonf // Cortante basal del sismo moderado, R = 6 (E.070 Art. 23)
## Distribución en altura (pisos de igual peso, T < 0.5 s → k = 1)
hi = (1:N)*h1 // Altura de cada nivel sobre la base
Fi = Ve1*hi/sum(hi) // Fuerzas por nivel Fi = αi·V con αi = Pi hi/Σ Pj hj (E.030 Art. 28.3)
M1 = sum(Fi .* hi) -> tonf*m // Momento de volteo en la base (sismo moderado)
hM = M1/Ve1 -> m // Brazo del momento Me/Ve para los muros del primer piso
"Excentricidad accidental 0.05 B en cada dirección (E.030 Art. 28.5) incluida en el reparto de la planta: los factores $r$ suman {sum(rX)} en X y {sum(rY)} en Y (no se reducen fuerzas por torsión).`),
      calc(`# Muros de la dirección X\n` + dirAxial('X')),
      tabAxial('X'),
      calc(dirSeis('X')),
      tabSeis('X'),
      calc(`# Muros de la dirección Y\n` + dirAxial('Y')),
      tabAxial('Y'),
      calc(dirSeis('Y')),
      tabSeis('Y'),
      calc(`# Diseño de los elementos de confinamiento del primer piso (Art. 27.3)
"Se diseña el muro de fachada **X1** (paño único, dos columnas extremas). Para los demás muros se procede igual con sus valores de la Tabla de la dirección correspondiente.
iw = 1 // Índice del muro de la dirección X a diseñar (1 = X1)
Lw = LX[iw] // Longitud total del muro (incluye columnas)
tw = tX[iw] // Espesor efectivo
Vm1 = VmX[iw] -> tonf // Cortante de agrietamiento diagonal Vm1
Mu1 = MuX[iw] -> tonf*m // Momento último Mu1 = Me1·Vm1/Ve1
Pgw = PgX[iw] -> tonf // Carga de gravedad con 25 % de sobrecarga
Nc = 2 // Número de columnas de confinamiento (muro de un paño)
Lm = Lw // Longitud del paño mayor (muro de un paño: Lm = L, Tabla 11)
Pt = 4.0 tonf // Carga tributaria del muro transversal Y1 sobre la columna extrema (Art. 24.6)
check Lw/(Nc - 1) <= min(2*hl, 5 m) // Espaciamiento de columnas ≤ 2h y ≤ 5 m (Art. 20.1.b)
## Fuerzas internas en la columna extrema (Tabla 11)
Mc = Mu1 - Vm1*h1/2 -> tonf*m // M = Mu1 − ½ Vm1 h
Fc = Mc/Lw -> tonf // Fuerza axial por el momento F = M/L
Pc = Pgw/Nc + Pt -> tonf // Carga de gravedad en la columna (directa + ½ paño + transversal)
Vc = 1.5*Vm1*Lm/(Lw*(Nc + 1)) -> tonf // Cortante en la columna extrema
Tcol = Fc - Pc -> tonf // Tracción T = F − Pc
Ccol = Pc + Fc -> tonf // Compresión C = Pc + F
## Sección de concreto por corte-fricción (Art. 27.3.a.1)
phi = 0.85 // Factor de reducción (corte-fricción)
Acf = Vc/(0.2*fc*phi) -> cm^2 // Acf = Vc/(0.2 f'c φ)
bc = tw // Ancho de la columna = espesor del muro (Art. 20.3)
dc = 30 cm // Peralte de la columna en la dirección del muro
Ac = bc*dc -> cm^2 // Área de la sección
check Ac >= Acf // Sección mínima por corte-fricción (Art. 27.3.a.1)
check Ac >= 15*tw*1 cm // Sección mínima Ac ≥ 15 t (Art. 27.3.a.1)
## Refuerzo vertical (Art. 27.3.a.2)
mu = 1.0 // Coeficiente de fricción (0.8 junta sin tratar; 1.0 junta rugosa) [0.8|1.0]
Asf = Vc/(fy*mu*phi) -> cm^2 // Acero por corte-fricción
Ast = Tcol/(fy*phi) -> cm^2 // Acero por tracción
Asmin = 0.1*fc*Ac/fy -> cm^2 // Mínimo 0.1 f'c Ac/fy
Asreq = max(Asf + Ast, Asmin) // Refuerzo vertical requerido
nb = 4 // Número de varillas (mínimo 4)
bar = 6 // Diámetro de las varillas [4 : 1/2"|5 : 5/8"|6 : 3/4"]
As = nb*Ab(bar) // Refuerzo vertical colocado
check As >= Asreq // Refuerzo vertical de la columna extrema (Art. 27.3.a.2)
## Núcleo confinado por compresión (Art. 27.3.a.1)
rec = 2 cm // Recubrimiento al estribo (Art. 11.10)
An = (bc - 2*rec)*(dc - 2*rec) -> cm^2 // Área del núcleo confinado
delta = 1.0 // δ = 0.8 sin muros transversales; 1.0 con muro transversal (Y1) [0.8|1.0]
phic = 0.7 // φ para estribos cerrados
Anreq = As + (Ccol/phic - As*fy)/(0.85*delta*fc) -> cm^2 // An = As + (C/φ − As fy)/(0.85 δ f'c)
check An >= Anreq // Área del núcleo por compresión (Art. 27.3.a.1)
## Estribos de confinamiento (Art. 27.3.a.3)
Av = 2*Abmm(6) // Estribo cerrado de 6 mm (dos ramas)
tn = bc - 2*rec // Espesor del núcleo
s1 = Av*fy/(0.3*tn*fc*(Ac/An - 1)) -> cm
s2 = Av*fy/(0.12*tn*fc) -> cm
s3 = max(dc/4, 5 cm) // d/4 ≥ 5 cm
s4 = 10 cm
sc = rounddown(min(s1, s2, s3, s4), 2.5 cm) // Espaciamiento en la zona confinada
zc = max(45 cm, 1.5*dc) // Longitud de confinamiento en cada extremo
"Estribos: [] 6 mm, 1 @ 5 cm, resto @ {sc} en {zc} de cada extremo y @ 25 cm en la zona central (mínimo [] 6 mm, 1 @ 5, 4 @ 10, r @ 25 cm).
## Viga solera (Art. 27.3.b)
Ts = Vm1*Lm/(2*Lw) -> tonf // Tracción en la solera Ts = Vm1 Lm/(2L)
hsol = 20 cm // Peralte de la solera = espesor del aligerado (Art. 20.4)
Acs = tw*hsol -> cm^2 // Sección de la solera
Assreq = max(Ts/(0.9*fy), 0.1*fc*Acs/fy) -> cm^2 // As = Ts/(φ fy) ≥ 0.1 f'c Acs/fy, φ = 0.9
Ass = 4*Ab(3) // Refuerzo colocado 4 φ 3/8"
check Ass >= Assreq // Refuerzo longitudinal de la solera (Art. 27.3.b)
## Refuerzo horizontal en los muros del primer piso (Art. 27.1)
"Edificio de más de tres pisos: todos los muros portantes del primer nivel llevan refuerzo horizontal continuo anclado en las columnas.
Ash = Ab(3) // Una varilla de 3/8" en la junta
sh = 30 cm // Cada 3 hiladas
rhoh = Ash/(sh*tw) // Cuantía ρ = As/(s t)
check rhoh >= 0.001 // Cuantía mínima de refuerzo horizontal (Art. 27.1)`),
      text(`> **Pisos superiores (Art. 27.2 y 27.4):** en cada entrepiso $i > 1$ debe cumplirse $V_{mi} > V_{ui}$; de no cumplirse, sus confinamientos se diseñan como en el primer piso. Las columnas extremas de los pisos no agrietados se diseñan con $M_{ui} = M_{ei}\\,(V_{m1}/V_{e1})$ y las soleras con $T_s = V_u L_m/(2L)$.`),
      summary(),
    ],
  },
  // ===================================================================
  //  2) MURO DE ALBAÑILERÍA ARMADA — E.070 Art. 28 (Cap. 8.7)
  // ===================================================================
  {
    id: 'ma-armada', pais: 'PE', cat: 'Albañilería', icon: 'wall',
    name: 'Muro de albañilería armada (E.070)', normas: 'RNE — NTE E.070 Albañilería (2006), Art. 28; E.030',
    desc: 'Muro de bloques de concreto rellenos: esfuerzo axial, fisuración, flexocompresión Mn = As fy D + Pu L/2, confinamiento de bordes y refuerzo horizontal por capacidad.',
    titulo: 'Diseño de muro portante de albañilería armada — NTE E.070',
    blocks: [
      text(`# Generalidades
Diseño de un muro portante de **albañilería armada** de bloques de concreto (tipo P) totalmente rellenos con concreto líquido, en el primer piso de un edificio de 4 pisos. El objetivo de la NTE E.070 (Art. 28) es que el muro falle por **flexión** con formación de rótula plástica en su base, evitando fallas frágiles por corte: el refuerzo horizontal se diseña para el cortante asociado a la capacidad en flexión $M_n$.

Fuerzas del análisis elástico ante sismo moderado tomadas del modelo del edificio.`),
      calc(`# Datos
uni = 10 // Unidad (E.070 Tabla 9) ${UNI}
fm = fmE070(uni) // Resistencia característica f'm
vm = vmE070(uni) // Resistencia característica v'm
fy = 4200 kgf/cm^2 // Acero de refuerzo
L = 4.00 m // Longitud del muro
t = 14 cm // Espesor efectivo (bloque de 14 cm)
hl = 2.40 m // Altura libre
Pg = 30 tonf // Carga de gravedad con 25 % de sobrecarga
Pm = 36 tonf // Carga de gravedad con 100 % de sobrecarga
Ve = 12 tonf // Cortante del sismo moderado
Me = 50 tonf*m // Momento del sismo moderado
# Requisitos generales
check t >= hl/20 // Espesor efectivo mínimo t ≥ h/20 (Art. 19.1.a)
sigmam = Pm/(L*t) -> kgf/cm^2 // Esfuerzo axial máximo
Fa = FaE070(fm, hl, t) // Esfuerzo admisible (Art. 19.1.b)
check sigmam <= Fa // Esfuerzo axial máximo (Art. 19.1.b)
alpha = alphaE070(Ve, L, Me) // Factor de esbeltez (Art. 26.3)
Vm = VmE070(vm, alpha, t, L, Pg, matE070(uni)) -> tonf // Resistencia al agrietamiento diagonal
check Ve <= 0.55*Vm // Control de fisuración (Art. 26.2)
# Diseño por flexocompresión (Art. 28.2 y 28.3)
Mu = 1.25*Me // Momento de diseño Mu = 1.25 Me (Art. 28.2.1.g)
Vu = 1.25*Ve // Cortante de diseño Vu = 1.25 Ve
Pu = 0.9*Pg // Carga axial mínima para dimensionar el acero de borde
Po = 0.1*fm*t*L -> tonf // Po = 0.1 f'm t L (Art. 28.3)
phif = min(max(0.85 - 0.2*Pu/Po, 0.65), 0.85) // 0.65 ≤ φ = 0.85 − 0.2 Pu/Po ≤ 0.85
D = 0.8*L // Brazo D = 0.8 L
Asreq = max((Mu/phif - Pu*L/2)/(fy*D), 2*Ab(3)) -> cm^2 // As = (Mu/φ − Pu L/2)/(fy D) ≥ 2 φ 3/8"
nb = 2 // Varillas en cada extremo
bar = 4 // Diámetro [3 : 3/8"|4 : 1/2"|5 : 5/8"]
As = nb*Ab(bar) // Acero vertical de borde colocado
check As >= Asreq // Refuerzo vertical en los extremos (Art. 28.3)
Pu1 = 1.25*Pm // Máxima carga axial del primer piso
Mn1 = As*fy*D + Pu1*L/2 -> tonf*m // Capacidad en flexión Mn1 = As fy D + Pu L/2
check phif*Mn1 >= Mu // Resistencia a flexocompresión φMn ≥ Mu (Art. 28.3)
"Refuerzo vertical repartido: φ 3/8\\" @ 40 cm (ρ = {0.71 cm^2/(40 cm*t)}) en la zona central (Art. 28.1.11).
check Ab(3)/(40 cm*t) >= 0.001 // Cuantía vertical mínima 0.1 % (Art. 28.1.1)
# Confinamiento de los extremos libres (Art. 28.4)
Ag = L*t // Área bruta
Ig = t*L^3/12 // Inercia bruta
sigmau = Pu1/Ag + Mu*(L/2)/Ig -> kgf/cm^2 // σu = Pu/A + Mu y/I
check sigmau < 0.3*fm // σu < 0.3 f'm: no requiere confinar los bordes (Art. 28.4)
# Diseño por corte — capacidad (Art. 28.5)
Vuf = max(1.25*Vu*Mn1/Mu, Vm) -> tonf // Vuf1 = 1.25 Vu1 (Mn1/Mu1), no menor que Vm1
vi = Vuf/(t*L) -> kgf/cm^2 // Esfuerzo de corte
check vi <= 0.1*fm // vi ≤ 0.10 f'm en la zona de rótula plástica (Art. 28.5)
Dh = si(Me/(Ve*L) >= 1, 0.8*L, L) // D = 0.8 L (esbelto) o L (no esbelto)
sh = 20 cm // Espaciamiento del refuerzo horizontal (≤ 200 mm, edificio de más de 3 pisos, Art. 28.1.4)
Ashreq = Vuf*sh/(fy*Dh) -> cm^2 // Ash = Vuf s/(fy D)
Ash = Ab(3) // Refuerzo horizontal colocado: 1 φ 3/8" @ 20 cm
check Ash >= Ashreq // Refuerzo horizontal por corte (Art. 28.5)
check Ash/(sh*t) >= 0.001 // Cuantía horizontal mínima 0.1 % (Art. 28.1.1)`),
      summary(),
    ],
  },
  // ===================================================================
  //  3) CERCO PERIMÉTRICO / MURO NO PORTANTE — E.070 Cap. 9
  // ===================================================================
  {
    id: 'ma-cerco', pais: 'PE', cat: 'Albañilería', icon: 'wall',
    name: 'Cerco perimétrico de albañilería (E.070 Art. 29–31)', normas: 'RNE — NTE E.070 Albañilería (Art. 29 a 31), E.030 (C1), E.060, E.050',
    desc: 'Muro no portante arriostrado: carga sísmica w = 0.8ZUC1γe, momento Ms = m w a² (Tabla 12), espesor, diseño de columnas y soleras de arriostre y cimiento corrido (volteo y deslizamiento).',
    titulo: 'Diseño de cerco perimétrico de albañilería confinada',
    blocks: [
      text(`# Generalidades
Cerco perimétrico de ladrillo King Kong industrial en aparejo de soga, arriostrado por columnas de concreto armado cada 3.0 m, viga solera superior y cimiento corrido de concreto ciclópeo. El paño se analiza como una losa apoyada en sus arriostres sujeta a la carga sísmica perpendicular a su plano (NTE E.070 Art. 29), sin admitir tracciones por flexión mayores que $f'_t$ (Art. 31). Ejemplo basado en el procedimiento de A. San Bartolomé, *Construcciones de albañilería* (PUCP).`),
      calc(`# Datos
Z = 0.45 // Factor de zona ${ZONA}
U = 1.0 // Factor de uso [1.0|1.3|1.5]
C1 = C1E030a(4) // Coeficiente sísmico de cercos C1 = 0.6 (E.030 Tabla 12, versión citada por E.070 Art. 29.6)
gm = 1.8 tonf/m^3 // Peso volumétrico de la albañilería con tarrajeo
t = 13 cm // Espesor efectivo (soga)
esp = 15 cm // Espesor bruto con tarrajeo e
ha = 2.40 m // Altura libre del paño (entre sobrecimiento y solera)
bp = 3.00 m // Distancia entre columnas de arriostre
caso = 1 // Caso de la Tabla 12 [1 : 4 bordes arriostrados|2 : 3 bordes (sin solera)|3 : bordes horizontales|4 : voladizo]
# Carga sísmica y momento en el paño (Art. 29.6 y 29.7)
w = 0.8*Z*U*C1*gm*esp -> kgf/m^2 // w = 0.8 Z U C1 γ e
a = si(caso == 1, min(ha, bp), si(caso == 2, bp, ha)) // Dimensión crítica a (Tabla 12)
bt = si(caso == 1, max(ha, bp), ha) // Otra dimensión b
mc = mE070(caso, bt/a) // Coeficiente de momento m (Tabla 12)
Ms = mc*w*a^2 -> kgf*m/m // Momento distribuido Ms = m w a²
fmt = 6*Ms/t^2 -> kgf/cm^2 // Esfuerzo de tracción por flexión fm = 6 Ms/t²
ftad = ftE070(1) // Tracción por flexión admisible, albañilería simple (Art. 29.8)
check fmt <= ftad // Tracción por flexión en el paño (Art. 31.3)
treq = sqrt(6*Ms/ftad) -> cm // Espesor mínimo requerido t ≥ √(6 Ms/f't)
check t >= treq // Espesor efectivo del cerco
# Diseño de la columna de arriostre (Art. 29.9 y 31.5)
fcc = 175 kgf/cm^2 // Concreto de columnas y soleras
fy = 4200 kgf/cm^2
fu = 1.25 // Factor de amplificación de carga para el diseño a rotura de arriostres
bcol = t // Ancho de la columna (= espesor del muro)
hcol = 25 cm // Peralte de la columna (perpendicular al muro)
Mcol = fu*w*bp*ha^2/2 -> tonf*m // Voladizo con la carga del paño tributario
dcol = hcol - 4 cm // Peralte efectivo
Rn = Mcol/(0.9*bcol*dcol^2) -> kgf/cm^2
rho = 0.85*fcc/fy*(1 - sqrt(1 - 2*Rn/(0.85*fcc))) // Cuantía (E.060 Cap. 10)
Ascol = max(rho*bcol*dcol, 0.7*sqrtfc(fcc)/fy*bcol*dcol) -> cm^2 // Acero en tracción por cara
Asc = 2*Ab(3) // 2 φ 3/8" por cara (4 φ 3/8" en total)
check Asc >= Ascol // Refuerzo de la columna de arriostre
Vcol = fu*w*bp*ha -> tonf // Cortante en la base
phiVc = 0.85*0.53*sqrtfc(fcc)*bcol*dcol -> tonf // Resistencia al corte del concreto
check Vcol <= phiVc // Corte en la columna
# Diseño de la viga solera
bsol = t // Ancho de la solera
hsol = 20 cm // Peralte de la solera
Msol = fu*w*(a/2)*bp^2/8 -> tonf*m // Faja superior del paño (a/2) simplemente apoyada entre columnas
Rns = Msol/(0.9*hsol*(bsol - 3 cm)^2) -> kgf/cm^2 // Flexión fuera del plano del muro (ancho resistente hsol)
rhos = 0.85*fcc/fy*(1 - sqrt(1 - 2*Rns/(0.85*fcc)))
Assol = max(rhos*hsol*(bsol - 3 cm), 0.7*sqrtfc(fcc)/fy*hsol*(bsol - 3 cm)) -> cm^2
check 2*Ab(3) >= Assol // Solera 4 φ 3/8" (2 por cara)
# Cimiento corrido (Art. 31.6, por metro lineal)
gcc = 2.3 tonf/m^3 // Concreto ciclópeo
Bc = 0.60 m // Ancho del cimiento
hc = 0.80 m // Altura del cimiento (profundidad de cimentación)
hsob = 0.50 m // Altura del sobrecimiento (0.30 m sobre el terreno)
gs = 1.8 tonf/m^3 // Peso unitario del suelo
phis = 30 deg // Ángulo de fricción del suelo
qadm = 1.0 kgf/cm^2 // Capacidad admisible del suelo (E.050)
Pmur = gm*esp*ha*1 m -> tonf // Peso del muro por metro
Pcim = gcc*(Bc*hc + esp*hsob)*1 m -> tonf // Cimiento y sobrecimiento
Ptot = Pmur + Pcim // Carga vertical total
cs = 0.8*Z*U*C1 // Coeficiente sísmico para muro y cimentación
Hm = cs*Pmur // Fuerza sísmica del muro
Hcim = cs*Pcim // Fuerza sísmica de cimiento y sobrecimiento
Kp = tan(45 deg + phis/2)^2 // Coeficiente de empuje pasivo (Rankine)
Ep = 0.5*Kp*gs*hc^2*1 m -> tonf // Empuje pasivo sobre el cimiento
Mv = Hm*(hc + hsob - 0.20 m + ha/2) + Hcim*(hc/2 + 0.15 m) -> tonf*m // Momento de volteo respecto del pie
Mr = Ptot*Bc/2 + Ep*hc/3 -> tonf*m // Momento resistente
check Mr/Mv >= 2.0 // Factor de seguridad al volteo ≥ 2 (Art. 31.6)
mus = tan(phis) // Coeficiente de fricción suelo–concreto
check (mus*Ptot + Ep)/(Hm + Hcim) >= 1.5 // Factor de seguridad al deslizamiento ≥ 1.5 (Art. 31.6)
ecc = Bc/2 - (Mr - Mv)/Ptot // Excentricidad de la resultante en la base (incluye el empuje pasivo)
qmax = Ptot/(Bc*1 m)*(1 + 6*abs(ecc)/Bc) -> kgf/cm^2 // Presión máxima en el suelo
check abs(ecc) <= Bc/6 // Resultante en el tercio central
check qmax <= 1.33*qadm // Presión en el suelo con sismo (E.050: +33 %)`),
      summary(),
    ],
  },
  // ===================================================================
  //  4) VIVIENDA DE ADOBE REFORZADO — E.080 (2017)
  // ===================================================================
  {
    id: 'ma-adobe', pais: 'PE', cat: 'Madera y tierra', icon: 'wall',
    name: 'Vivienda de adobe reforzado (E.080-2017)', normas: 'RNE — NTE E.080 Diseño y construcción con tierra reforzada (RM 121-2017-VIVIENDA), E.030',
    desc: 'Vivienda de un piso de adobe con geomalla: límites geométricos (Fig. 2), densidad de muros (Tabla 2), fuerza sísmica H = SUCP, esfuerzos de corte, compresión y flexión fuera del plano.',
    titulo: 'Diseño de vivienda de adobe reforzado de un piso — NTE E.080',
    blocks: [
      text(`# Generalidades
Vivienda unifamiliar de **un piso** de adobe reforzado con geomalla, viga collar de madera y techo liviano de calamina sobre tijerales de madera, ubicada en la sierra (zona sísmica 2). La NTE E.080 (2017) establece criterios de **resistencia** (corte en el plano y flexión fuera del plano con esfuerzos admisibles, Art. 7.3.1), de **estabilidad** (límites de espesor, esbeltez y arriostre, Art. 6 y Fig. 2) y de **desempeño** (refuerzos compatibles, Art. 7.3.3). Las edificaciones de tierra reforzada son de un piso en zonas 3 y 4 y hasta dos pisos en zonas 1 y 2 (Art. 4.2).`),
      calc(`# Datos
zona = 2 // Zona sísmica (E.030) [4|3|2|1]
Np = 1 // Número de pisos
Ss = SE080(1) // Factor de suelo — Tipo I, roca o suelo muy resistente (Tabla 1)
U = UE080(1) // Factor de uso — vivienda (Tabla 2)
Cz = CE080(zona) // Coeficiente sísmico (Tabla 3)
check Np <= si(zona >= 3, 1, 2) // Número de pisos permitido (Art. 4.2)
## Geometría
esp = 0.40 m // Espesor de muro e (adobe de 40 × 40 × 10 cm)
H = 2.40 m // Altura libre del muro
Larr = 4.00 m // Distancia máxima entre arriostres verticales
av = 1.00 m // Ancho máximo de vano
bar = 1.60 m // Longitud mínima de muro de arriostre (contrafuerte o muro transversal)
Bx = 7.60 m // Dimensión exterior en X
By = 5.60 m // Dimensión exterior en Y
Ap = Bx*By // Área techada
SLX = 5.70 m + 6.60 m + 3.40 m // Longitud neta de muros en X (sin vanos)
SLY = 5.60 m + 4.60 m + 4.70 m // Longitud neta de muros en Y (sin vanos)
## Materiales (Art. 8 y 9)
gad = 1.70 tonf/m^3 // Peso volumétrico del adobe
fo = 12 kgf/cm^2 // Resistencia a compresión de cubos (ensayo, ≥ 10.2 kgf/cm²)
fpm = 6.5 kgf/cm^2 // Resistencia a compresión de muretes f'm (ensayo)
fpt = 0.30 kgf/cm^2 // Resistencia a tracción indirecta de muretes f't (ensayo)
check fo >= 10.2 kgf/cm^2 // Resistencia mínima de la unidad (Art. 8.1)
check fpm >= 6.12 kgf/cm^2 // Resistencia mínima de muretes a compresión (Art. 8.4)
check fpt >= 0.25 kgf/cm^2 // Resistencia mínima de muretes a tracción indirecta (Art. 8.5)
fmad = 0.40*fpm -> kgf/cm^2 // Esfuerzo admisible de compresión fm = 0.40 f'm (Art. 8.4)
vmad = 0.40*fpt -> kgf/cm^2 // Esfuerzo admisible de corte vm = 0.40 f't (Art. 8.5)
ftad = 1.42 kgf/cm^2/2.5 -> kgf/cm^2 // Tracción por flexión admisible = 1.42/2.5 (Art. 8.6 y 9)
# Criterios de estabilidad — límites geométricos (Art. 6, Fig. 2)
check esp >= 0.40 m // Espesor mínimo de muro (Art. 6.1)
check av <= Larr/3 // Ancho de vano a ≤ L/3 (Fig. 2-II)
check bar >= 3*esp // Arriostre 3e ≤ b (Fig. 2-III)
check bar <= 5*esp // Arriostre b ≤ 5e (Fig. 2-III)
check Larr + 1.25*H <= 17.5*esp // L + 1.25 H ≤ 17.5 e (Fig. 2-IV)
check H/esp <= 6 // Esbeltez vertical λv = H/e ≤ 6 (Fig. 2, nota 3)
check Larr/esp <= 10 // Esbeltez horizontal λh = L/e ≤ 10 (Fig. 2, nota 3)
# Densidad de muros (Art. 6.3, Tabla 2)
dmin = densE080(1) // Densidad mínima para vivienda
densX = SLX*esp/Ap // Densidad en X
densY = SLY*esp/Ap // Densidad en Y
check densX >= dmin // Densidad de muros en X (Tabla 2)
check densY >= dmin // Densidad de muros en Y (Tabla 2)
# Fuerza sísmica (Art. 6.8)
wt = 0.12 tonf/m^2 // Peso del techo (calamina, tijerales, cielo raso)
wl = 0.05 tonf/m^2 // Sobrecarga de techo
Pmur = gad*esp*H*(SLX + SLY) -> tonf // Peso de los muros
Ptech = (wt + 0.5*wl)*Ap -> tonf // Techo con 50 % de carga viva
P = Pmur + Ptech // Peso total
Hs = Ss*U*Cz*P -> tonf // H = S U C P
## Corte en el plano de los muros (Art. 7.3.1.a)
tauX = Hs/(1.2*SLX*esp) -> kgf/cm^2 // Área de muros + 20 % por muros transversales (Art. 7.3.1.a.iii)
tauY = Hs/(1.2*SLY*esp) -> kgf/cm^2
check tauX <= vmad // Esfuerzo de corte en X
check tauY <= vmad // Esfuerzo de corte en Y
## Compresión en la base del muro más cargado
At = 2.0 m^2 // Área tributaria de techo por metro de muro
sigma = (gad*H*esp*1 m + (wt + wl)*At)/(esp*1 m) -> kgf/cm^2 // Peso propio + techo
check sigma <= fmad // Compresión admisible (Art. 8.4)
## Flexión fuera del plano (Art. 7.3.1.b)
"El muro se apoya en el cimiento y en los dos arriostres verticales (la viga collar no se considera apoyo, Art. 7.3.1.b.ii): caso de tres bordes arriostrados con borde superior libre (coeficientes de Timoshenko de la Tabla 12 de la E.070).
wf = Ss*U*Cz*gad*esp -> kgf/m^2 // Carga sísmica perpendicular al plano
mf = mE070(2, H/Larr) // Coeficiente m (3 bordes, a = borde libre = L)
Msf = mf*wf*Larr^2 -> kgf*m/m // Momento por metro
ff = 6*Msf/esp^2 -> kgf/cm^2 // Esfuerzo de tracción por flexión
check ff <= ftad // Tracción por flexión admisible (Art. 8.6)`),
      text(`> **Refuerzos (Art. 6.10 y 7.3.3):** geomalla biaxial en ambas caras de los muros, conectada con pasadores a través de las hiladas, viga collar de madera fijada a la malla y a los muros, y dinteles flexibles. Los vanos deben ser pequeños y centrados (Art. 6.6).`),
      summary(),
    ],
  },
  // ===================================================================
  //  5) VIGA DE MADERA — E.010 / JUNAC
  // ===================================================================
  {
    id: 'ma-vigamadera', pais: 'PE', cat: 'Madera y tierra', icon: 'beam',
    name: 'Viga de madera (E.010 / JUNAC)', normas: 'RNE — NTE E.010 Madera (2014), E.020; Manual de Diseño para Maderas del Grupo Andino (JUNAC)',
    desc: 'Vigas de entrepiso por esfuerzos admisibles: flexión, corte a una distancia h del apoyo, aplastamiento, deflexión con 1.8 CM + CV y estabilidad lateral (h/b).',
    titulo: 'Diseño de vigas de madera de entrepiso — NTE E.010',
    blocks: [
      text(`# Generalidades
Diseño por **esfuerzos admisibles** de las vigas de un entrepiso de madera (viguetas con entablado y cielo raso de yeso), según la NTE E.010 y el *Manual de Diseño para Maderas del Grupo Andino* (JUNAC, Cap. 8). Se usa madera estructural seca (CH ≤ 22 %) de dimensiones reales comerciales. Para viguetas que trabajan en conjunto (4 o más elementos con entablado) se emplea el módulo de elasticidad promedio $E_{prom}$; en elementos aislados, $E_{min}$.`),
      calc(`# Datos
grupo = 2 // Grupo estructural de la madera (E.010 Tabla 1) ${GRUPO}
Lv = 3.60 m // Luz de cálculo de la vigueta
sv = 0.60 m // Separación entre viguetas
b = 4 cm // Ancho real (sección comercial 2" × 10")
h = 24 cm // Peralte real
apoyo = 8 cm // Longitud de apoyo
wD = 100 kgf/m^2 // Carga muerta (entablado, cielo raso, acabados)
wL = 200 kgf/m^2 // Sobrecarga de vivienda (E.020)
gmad = 650 kgf/m^3 // Densidad de la madera seca del grupo B (peso propio)
conj = 1 // Elementos en conjunto (≥ 4 viguetas con entablado) [1 : Sí — Eprom|0 : No — Emin]
lim = 300 // Deflexión admisible L/k (E.010 Tabla 8) [300 : Con cielo raso de yeso|250 : Sin cielo raso de yeso]
# Propiedades (E.010 Tablas 3 y 4)
E = si(conj == 1, EpromE010(grupo), EminE010(grupo)) // Módulo de elasticidad
fm = fmE010(grupo) // Esfuerzo admisible en flexión
fv = fvE010(grupo) // Esfuerzo admisible en corte paralelo
fcp = fcpE010(grupo) // Compresión perpendicular a las fibras
A = b*h // Área de la sección
Ix = b*h^3/12 // Momento de inercia
Zx = b*h^2/6 // Módulo de sección
# Cargas
wpp = gmad*A -> kgf/m // Peso propio
wd = wD*sv + wpp -> kgf/m // Carga muerta por vigueta
wl = wL*sv -> kgf/m // Carga viva por vigueta
w = wd + wl // Carga total de servicio
# Flexión (JUNAC 8.4)
M = w*Lv^2/8 -> kgf*m // Momento máximo
sigma = M/Zx -> kgf/cm^2 // Esfuerzo de flexión
check sigma <= fm // Esfuerzo de flexión admisible
# Corte (JUNAC 8.5 — a una distancia h del apoyo)
V = w*(Lv/2 - h) -> kgf // Cortante a la distancia h
tau = 1.5*V/A -> kgf/cm^2 // τ = 1.5 V/(b h)
check tau <= fv // Esfuerzo de corte admisible
# Aplastamiento en el apoyo (JUNAC 8.6)
R = w*Lv/2 -> kgf // Reacción
sap = R/(b*apoyo) -> kgf/cm^2 // Compresión perpendicular a las fibras
check sap <= fcp // Aplastamiento
# Deflexión (E.010 Art. 8.3 / JUNAC 8.3)
weq = 1.8*wd + wl // Carga equivalente con deformaciones diferidas (1.8 CM + CV)
delta = 5*weq*Lv^4/(384*E*Ix) -> cm // Deflexión máxima
dadm = Lv/lim -> cm // Deflexión admisible
check delta <= dadm // Deflexión
# Estabilidad lateral (JUNAC Tabla 8.2)
rhb = h/b // Relación peralte/ancho
check rhb <= 6 // h/b ≤ 6: arriostrar el borde comprimido (entablado) y colocar crucetas o bloques
"Con $h/b$ = {rhb}: el entablado clavado arriostra el borde comprimido; colocar bloques o crucetas a no más de 8 veces el peralte (JUNAC Tabla 8.2).`),
      summary(),
    ],
  },
  // ===================================================================
  //  6) COLUMNA DE MADERA — E.010 / JUNAC (flexocompresión)
  // ===================================================================
  {
    id: 'ma-colmadera', pais: 'PE', cat: 'Madera y tierra', icon: 'column',
    name: 'Columna de madera (E.010 / JUNAC)', normas: 'RNE — NTE E.010 Madera (2014); Manual de Diseño para Maderas del Grupo Andino (JUNAC, Cap. 9)',
    desc: 'Columna rectangular: esbeltez λ = lef/d, Ck = 0.7025√(E/fc), carga admisible (corta, intermedia, larga) y flexocompresión N/Nadm + km M/(Z fm) < 1.',
    titulo: 'Diseño de columna de madera a flexocompresión — NTE E.010',
    blocks: [
      text(`# Generalidades
Columna de madera de sección rectangular maciza sometida a carga axial y momento (carga lateral de viento o excentricidad), diseñada por esfuerzos admisibles según la NTE E.010 y el Manual JUNAC (Cap. 9). Las columnas se clasifican por su esbeltez $\\lambda = l_{ef}/d$ en **cortas** ($\\lambda < 10$), **intermedias** ($10 \\le \\lambda \\le C_k$) y **largas** ($C_k < \\lambda \\le 50$); en flexocompresión se usa $E_{min}$.`),
      calc(`# Datos
grupo = 2 // Grupo estructural ${GRUPO}
b = 14 cm // Ancho real (sección comercial 6" × 6")
d = 14 cm // Dimensión en la dirección del pandeo y de la flexión
lc = 2.60 m // Longitud no arriostrada
k = 1.0 // Factor de longitud efectiva (JUNAC Tabla 9.1) [1.0 : Articulada–articulada|1.2 : Empotrada–articulada con desplazamiento|2.0 : Voladizo|0.65 : Empotrada–empotrada]
Nd = 6.0 tonf // Carga axial de servicio
Md = 0.15 tonf*m // Momento de servicio
# Propiedades (E.010 Tablas 3 y 4)
Emin = EminE010(grupo) // Módulo de elasticidad mínimo
fc = fcE010(grupo) // Compresión paralela admisible
fm = fmE010(grupo) // Flexión admisible
A = b*d // Área
Ix = b*d^3/12 // Inercia
Zx = b*d^2/6 // Módulo de sección
# Esbeltez y carga admisible (JUNAC 9.4)
lef = k*lc // Longitud efectiva
lam = lef/d // Esbeltez λ
check lam <= 50 // Esbeltez máxima λ ≤ 50
Ck = CkE010(Emin, fc) // Esbeltez límite Ck = 0.7025 √(Emin/fc)
"Columna {si(lam < 10, 1, si(lam <= Ck, 2, 3))} (1 = corta, 2 = intermedia, 3 = larga).
Nadm = NadmE010(fc, Emin, A, lam, Ck) -> tonf // Carga admisible
check Nd <= Nadm // Compresión
# Flexocompresión (JUNAC 9.6)
Ncr = pi^2*Emin*Ix/lef^2 -> tonf // Carga crítica de Euler
km = kmE010(Nd, Ncr) // Factor de magnificación km = 1/(1 − 1.5 N/Ncr)
ic = Nd/Nadm + km*Md/(Zx*fm) // Ecuación de interacción
check ic < 1 // N/Nadm + km|M|/(Z fm) < 1`),
      summary(),
    ],
  },
  // ===================================================================
  //  7) TIJERAL DE MADERA — E.010 / JUNAC
  // ===================================================================
  {
    id: 'ma-tijeral', pais: 'PE', cat: 'Madera y tierra', icon: 'beam',
    name: 'Tijeral de madera (E.010 / JUNAC)', normas: 'RNE — NTE E.010 Madera (2014), E.020; Manual JUNAC (Cap. 11 Armaduras)',
    desc: 'Armadura Howe/Pratt a dos aguas: cargas por nudo, análisis por rigidez, diseño de cuerda superior a flexocompresión, cuerda inferior a tracción y diagonales a compresión.',
    titulo: 'Diseño de tijeral de madera para cobertura liviana',
    blocks: [
      text(`# Generalidades
Tijeral de madera a dos aguas para cobertura liviana (teja andina de fibrocemento sobre correas), con cielo raso colgado de la cuerda inferior. La armadura se analiza con nudos articulados y cargas aplicadas en los nudos (JUNAC Cap. 11); la cuerda superior se verifica además a flexocompresión por la carga repartida de las correas entre nudos, y la longitud efectiva de los elementos se toma según la Tabla 11.1 del Manual JUNAC.`),
      calc(`# Datos
grupo = 2 // Grupo estructural ${GRUPO}
Lt = 8.00 m // Luz del tijeral
Ht = 2.00 m // Altura en la cumbrera
np = 6 // Número de paneles
st = 1.00 m // Separación entre tijerales
wcob = 30 kgf/m^2 // Cobertura y correas (por m² en proyección horizontal)
wcr = 30 kgf/m^2 // Cielo raso
wsc = 50 kgf/m^2 // Sobrecarga de techo inclinado (E.020 Art. 7.1: ≥ 50 kg/m²)
theta = atan(Ht/(Lt/2)) -> deg // Pendiente del techo
Lpan = Lt/np // Longitud horizontal del panel
P = (wcob + wsc)*st*Lpan -> tonf // Carga por nudo de la cuerda superior
Pb = wcr*st*Lpan -> tonf // Carga por nudo de la cuerda inferior`),
      { type: 'tijeral', L: 'Lt', H: 'Ht', n: 'np', tipo: 'Howe', P: 'P', Pb: 'Pb', titulo: '' },
      calc(`# Propiedades de la madera (E.010 Tablas 3 y 4)
Emin = EminE010(grupo)
fc = fcE010(grupo)
fm = fmE010(grupo)
ft = ftE010(grupo)
Ck = CkE010(Emin, fc) // Esbeltez límite
# Cuerda superior — flexocompresión (JUNAC 11.4)
b1 = 4 cm // Ancho (sección comercial 2" × 4")
d1 = 9 cm // Peralte (en el plano del tijeral)
A1 = b1*d1
Z1 = b1*d1^2/6
lef1 = 0.8*Lcs // Longitud efectiva en el plano: 0.8 l (cuerda continua, JUNAC Tabla 11.1)
lam1 = lef1/d1 // Esbeltez en el plano
lc1 = 0.60 m // Separación de correas (arriostre fuera del plano)
lam1b = lc1/b1 // Esbeltez fuera del plano
check max(lam1, lam1b) <= 50 // Esbeltez máxima
Nadm1 = min(NadmE010(fc, Emin, A1, lam1, Ck), NadmE010(fc, Emin, A1, lam1b, Ck)) -> tonf // Carga admisible
w1 = (wcob + wsc)*st -> kgf/m // Carga repartida de las correas
M1 = w1*(Lpan)^2/10 -> kgf*m // Momento entre nudos (cuerda continua)
Ncr1 = pi^2*Emin*b1*d1^3/12/lef1^2 -> tonf
km1 = kmE010(Ncs, Ncr1)
ic1 = Ncs/Nadm1 + km1*M1/(Z1*fm) // Interacción
check ic1 < 1 // Flexocompresión de la cuerda superior
# Cuerda inferior — tracción (JUNAC 11.4)
b2 = 4 cm
d2 = 9 cm // Sección 2" × 4"
An2 = 0.85*b2*d2 // Área neta (descuento por perforaciones de pernos)
check Nti/An2 <= ft // Tracción en la cuerda inferior
# Diagonales y montantes — compresión
b3 = 4 cm
d3 = 6.5 cm // Sección 2" × 3"
lam3 = 0.8*Ldc/b3 // Esbeltez fuera del plano (lef = 0.8 l)
check lam3 <= 50
Nadm3 = NadmE010(fc, Emin, b3*d3, lam3, Ck) -> tonf
check Ndc <= Nadm3 // Compresión en la diagonal más cargada
check Ndt/(0.85*b3*d3) <= ft // Tracción en montantes y diagonales
# Deflexión del tijeral (JUNAC 11.6, aproximación)
"Deflexión admisible de armaduras: L/300 con cielo raso de yeso; la contraflecha de fabricación recomendada es L/200 = {Lt/200 -> cm}.`),
      summary(),
    ],
  },
  // ===================================================================
  //  8) RESERVORIO CIRCULAR APOYADO — ACI 350 / ACI 350.3 / PCA
  // ===================================================================
  {
    id: 'ma-reservorio', pais: 'PE', cat: 'Estructuras especiales', icon: 'quake',
    name: 'Reservorio circular apoyado (ACI 350 / 350.3 / PCA)', normas: 'ACI 350-06, ACI 350.3-06 (Housner), PCA Circular Concrete Tanks without Prestressing; RNE E.030, E.060',
    desc: 'Reservorio de 250 m³: tensión anular y momento en la base por teoría de cáscaras (tablas PCA), refuerzo, fisuración, sismo con masas impulsiva y convectiva y altura de oleaje.',
    titulo: 'Diseño estructural de reservorio circular apoyado de concreto armado — 250 m³',
    blocks: [
      text(`# Generalidades
Reservorio cilíndrico apoyado de concreto armado, con pared empotrada en la losa de fondo y cubierta de losa maciza. El análisis hidrostático usa la solución de la **cáscara cilíndrica** (Timoshenko, ν = 0.2), equivalente a las Tablas A-1, A-2 y A-12 del PCA *Circular Concrete Tanks without Prestressing*; el refuerzo se dimensiona con los coeficientes sanitarios de ACI 350R/PCA (1.65 en tracción directa, 1.30 en flexión) y factor de carga 1.7 para el líquido. El análisis sísmico sigue **ACI 350.3-06** (modelo de Housner) con el espectro de la NTE E.030 ($S_{DS} = 2.5ZS$, $T_S = T_P$).`),
      calc(`# Datos
D = 9.00 m // Diámetro interior
HL = 4.00 m // Altura de agua (nivel de rebose)
Hw = 4.60 m // Altura de la pared
tw = 0.25 m // Espesor de la pared
er = 0.15 m // Espesor de la losa de cubierta
gw = 1.0 tonf/m^3 // Peso específico del agua
gc = 2.4 tonf/m^3 // Peso específico del concreto
fc = 280 kgf/cm^2 // Resistencia del concreto (ACI 350: ≥ 4000 psi)
fy = 4200 kgf/cm^2
rec = 5 cm // Recubrimiento (ACI 350 7.7.1: 2 in)
Vol = pi*D^2/4*HL -> m^3 // Capacidad útil
# Análisis hidrostático de la pared (PCA)`),
      { type: 'cilindro', H: 'HL', D: 'D', t: 'tw', w: 'gw', base: 'empotrada', titulo: '' },
      calc(`## Refuerzo anular (horizontal)
Tu = 1.65*1.7*Tmax -> tonf/m // Tracción anular última con coeficiente sanitario 1.65
Ashreq = Tu/(0.9*fy) -> cm^2/m // Acero anular total requerido
Astemp = 0.005*tw*1 m/m -> cm^2/m // Mínimo por contracción y temperatura (ACI 350 Tabla 7.12.2.1)
barh = 5 // Varilla anular (dos caras) [4 : 1/2"|5 : 5/8"|6 : 3/4"]
sh = 20 cm // Espaciamiento en cada cara
Ash = 2*Ab(barh)/sh -> cm^2/m // Acero anular colocado (dos caras)
check Ash >= Ashreq // Refuerzo anular por tracción
check Ash >= Astemp // Refuerzo mínimo por contracción y temperatura
check sh <= 30 cm // Espaciamiento máximo 12 in (ACI 350 7.6.5)
## Esfuerzo de tracción en el concreto (PCA)
Csh = 0.0003 // Coeficiente de contracción del concreto
Es = 2.0e6 kgf/cm^2
Ec = 15000*sqrtfc(fc) // Módulo de elasticidad del concreto (E.060 8.5)
nr = Es/Ec // Relación modular
fct = (Csh*Es*Ash*1 m + Tmax*1 m)/(tw*1 m + nr*Ash*1 m) -> kgf/cm^2 // fc = (C Es As + T)/(Ac + n As)
check fct <= 0.1*fc // Tracción en el concreto ≤ 0.1 f'c (PCA)
## Refuerzo vertical — momento en la base
Mu = 1.3*1.7*Mbase -> tonf*m/m // Momento último con coeficiente sanitario 1.30
barv = 5 // Varilla vertical [4 : 1/2"|5 : 5/8"|6 : 3/4"]
dv = tw - rec - db(barv)/2 // Peralte efectivo
Rn = Mu*1 m/(0.9*100 cm*dv^2) -> kgf/cm^2
rho = 0.85*fc/fy*(1 - sqrt(1 - 2*Rn/(0.85*fc)))
Asvreq = max(rho*100 cm*dv, 14 kgf/cm^2/fy*100 cm*dv)/(1 m) -> cm^2/m // Acero requerido (mínimo 200 b d/fy, ACI 350 10.5.1)
sv = 20 cm // Espaciamiento en la cara interior
Asv = Ab(barv)/sv -> cm^2/m
check Asv >= Asvreq // Refuerzo vertical en la base (cara interior)
check 2*Asv >= 0.003*tw*1 m/m // Cuantía vertical mínima 0.3 % (ACI 350 14.3.2)
## Cortante en la base
Vu = 1.7*Vbase -> tonf/m // Cortante último
phiVc = 0.75*0.53*sqrtfc(fc)*100 cm*dv/(1 m) -> tonf/m // φVc (ACI 350 11.3, φ = 0.75)
check Vu <= phiVc // Cortante en la unión pared–losa de fondo
# Análisis sísmico (ACI 350.3-06 con espectro E.030)
Z = 0.45 // Factor de zona ${ZONA}
S = 1.05 // Factor de suelo ${SUELO}
Tp = 0.6 s // Periodo TP ${TP}
I = 1.5 // Factor de importancia: reservorio de agua, categoría A (E.030 Tabla 5)
Ri = 2.0 // Factor de modificación impulsivo: base empotrada, sobre el terreno (ACI 350.3 Tabla 4.1.1(b))
Rc = 1.0 // Factor de modificación convectivo
SDS = 2.5*Z*S // Aceleración espectral de diseño en periodos cortos (meseta E.030)
SD1 = SDS*Tp/(1 s) // Aceleración espectral a 1 s (TS = TP)
## Masas equivalentes de Housner (ACI 350.3 Sec. 9.3)
WL = gw*Vol -> tonf // Peso del agua
rD = D/HL
Wi = WiWLc(rD)*WL // Masa impulsiva (Ec. 9-15)
Wc = WcWLc(rD)*WL // Masa convectiva (Ec. 9-16)
hi = hiHLc(rD)*HL // Altura de Wi (Ec. 9-17/18)
hc = hcHLc(rD)*HL // Altura de Wc (Ec. 9-19)
hip = hipHLc(rD)*HL // Altura de Wi con presión en la base (Ec. 9-20/21)
hcp = hcpHLc(rD)*HL // Altura de Wc con presión en la base (Ec. 9-22)
eps = epsACIc(rD) // Coeficiente de masa efectiva (Ec. 9-45)
Ww = gc*pi*(D + tw)*tw*Hw -> tonf // Peso de la pared
Wr = gc*pi*(D + 2*tw)^2/4*er -> tonf // Peso de la cubierta
## Periodos y coeficientes sísmicos (ACI 350.3 Sec. 9.3.4 y 9.4)
Ti = TiACIc(HL, D, tw, Ec, gc) -> s // Periodo impulsivo (Ec. 9-23 a 9-25)
Tc = TcACIc(D, HL) // Periodo convectivo (Ec. 9-28 a 9-30)
Ci = CiACI(Ti, SDS, SD1) // Coeficiente impulsivo (Ec. 9-32/33)
Cc = CcACI(Tc, SDS, SD1) // Coeficiente convectivo (Ec. 9-37/38)
## Fuerzas y momentos sísmicos (ACI 350.3 Cap. 4)
Pw = Ci*I*eps*Ww/Ri // Fuerza inercial de la pared (Ec. 4-1)
Pr = Ci*I*Wr/Ri // Fuerza inercial de la cubierta (Ec. 4-2)
Pi = Ci*I*Wi/Ri // Fuerza impulsiva (Ec. 4-3)
Pc = Cc*I*Wc/Rc // Fuerza convectiva (Ec. 4-4)
Vs = sqrt((Pi + Pw + Pr)^2 + Pc^2) -> tonf // Cortante basal (Ec. 4-5)
hw = Hw/2
hr = Hw + er/2
Mb = sqrt((Pi*hi + Pw*hw + Pr*hr)^2 + (Pc*hc)^2) -> tonf*m // Momento en la base de la pared (Ec. 4-10)
Mo = sqrt((Pi*hip + Pw*hw + Pr*hr)^2 + (Pc*hcp)^2) -> tonf*m // Momento de volteo (Ec. 4-13)
dmax = D/2*Cc*I -> m // Altura máxima de oleaje (Ec. 7-2)
"Borde libre disponible $H_w - H_L$ = {Hw - HL}; altura de oleaje $d_{max}$ = {dmax}: {si(dmax > Hw - HL, 'la ola alcanza la cubierta — la losa y su unión con la pared se diseñan para la presión de oleaje (ACI 350.3 R7.1)', 'el oleaje no alcanza la cubierta')}.`),
      { type: 'tanque', forma: 'circular', tipo: 'apoyado', D: 'D', HL: 'HL', Hw: 'Hw', tw: 'tw', Pi: 'Pi', Pc: 'Pc', dmax: 'dmax', titulo: '' },
      calc(`## Tensión anular sísmica (ACI 350.3 Cap. 5)
yb = HL - yTmax // Nivel de la tensión anular hidrostática máxima, desde la base
Piy = Pi/2*(4*HL - 6*hi - (6*HL - 12*hi)*yb/HL)/HL^2 -> tonf/m // Fuerza impulsiva por unidad de altura (Ec. 5-1)
Pcy = Pc/2*(4*HL - 6*hc - (6*HL - 12*hc)*yb/HL)/HL^2 -> tonf/m // Fuerza convectiva por unidad de altura (Ec. 5-3)
Pwy = Pw/Hw -> tonf/m // Inercia de la pared por unidad de altura (Ec. 5-5)
uv = max(SDS*I*(2/3)/Ri, 0.2*SDS) // Aceleración vertical (Ec. 4-15, b = 2/3, Ct = SDS)
Niy = 2*Piy/pi // Tensión anular impulsiva: p = 2Piy/(πr)·cosθ → N = p·r
Ncy = 2*Pcy/pi // Tensión anular convectiva
Nwy = Pwy/pi // Tensión anular por inercia de la pared
Nhy = uv*gw*yTmax*D/2 -> tonf/m // Tensión por aceleración vertical (Ec. 4-14)
Ny = sqrt((Niy + Nwy)^2 + Ncy^2 + Nhy^2) -> tonf/m // Tensión anular hidrodinámica combinada por SRSS (ACI 350.3 Sec. 5.3)
Tus = 1.65*(1.2*Tmax + 1.0*Ny) -> tonf/m // Combinación 1.2F + 1.0E con coeficiente sanitario
check Tus <= 0.9*fy*Ash // Refuerzo anular con sismo
## Transferencia del cortante sísmico en la unión pared–losa de fondo
qv = Vs/(pi*(D + tw)/2) -> tonf/m // Flujo de corte tangencial máximo q = V/(π R)
Avf = 2*Asv // Refuerzo vertical que atraviesa la junta (dos caras)
phiVn = 0.75*1.0*Avf*fy -> tonf/m // Corte-fricción φ μ Avf fy, μ = 1.0 (junta rugosa, E.060 11.7)
check qv <= phiVn // Corte-fricción en la base de la pared`),
      summary(),
    ],
  },
  // ===================================================================
  //  9) CISTERNA RECTANGULAR ENTERRADA — PCA / ACI 350
  // ===================================================================
  {
    id: 'ma-cisterna', pais: 'PE', cat: 'Estructuras especiales', icon: 'slab',
    name: 'Cisterna rectangular enterrada (PCA / ACI 350)', normas: 'PCA Rectangular Concrete Tanks; ACI 350-06; RNE E.060, E.050, E.020',
    desc: 'Cisterna de 26 m³: empuje de agua (prueba hidráulica) y de suelo en reposo con sobrecarga, momentos por placa (diferencias finitas tipo PCA), refuerzo, cortante y losa de techo.',
    titulo: 'Diseño estructural de cisterna rectangular enterrada de concreto armado',
    blocks: [
      text(`# Generalidades
Cisterna enterrada de concreto armado con losa de techo, paredes empotradas en la losa de fondo y en las paredes transversales (continuidad en las esquinas) y apoyadas en la losa de techo. Cada pared se analiza como una **placa** bajo presión triangular o trapezoidal mediante diferencias finitas, lo que reproduce los coeficientes de momento de las tablas del PCA *Rectangular Concrete Tanks* para cualquier relación de lados y condición de borde.

Se consideran dos estados: **(1) prueba hidráulica** — tanque lleno sin relleno exterior; **(2) tanque vacío** con empuje de suelo en reposo y sobrecarga. Coeficientes sanitarios ACI 350R/PCA: 1.30 en flexión, factor de carga 1.7.`),
      calc(`# Datos
Li = 4.00 m // Longitud interior
Bi = 3.00 m // Ancho interior
Hc = 2.50 m // Altura libre interior
HL = 2.20 m // Altura máxima de agua
tw = 0.20 m // Espesor de las paredes
tf = 0.25 m // Espesor de la losa de fondo
tt = 0.15 m // Espesor de la losa de techo
gw = 1.0 tonf/m^3
gs = 1.8 tonf/m^3 // Peso unitario del relleno
phis = 30 deg // Ángulo de fricción del relleno
ws = 0.50 tonf/m^2 // Sobrecarga sobre el terreno
fc = 280 kgf/cm^2
fy = 4200 kgf/cm^2
rec = 5 cm // Recubrimiento
qadm = 1.5 kgf/cm^2 // Capacidad admisible del suelo
Vol = Li*Bi*HL -> m^3 // Volumen útil
# Presiones
Ko = 1 - sin(phis) // Empuje en reposo (paredes restringidas por el techo)
Hp = Hc + (tf + tt)/2 // Altura de cálculo de la pared (entre ejes de losas)
qw = gw*HL -> tonf/m^2 // Presión del agua en la base
qsb = Ko*(ws + gs*(Hp + tt/2)) -> tonf/m^2 // Presión del suelo en la base
qst = Ko*ws -> tonf/m^2 // Presión de la sobrecarga
# Pared larga — estado 1: agua interior`),
      { type: 'tankwall', a: 'Li + tw', b: 'Hp', inf: 'empotrado', sup: 'articulado', lat: 'empotrado', qb: 'qw', qs: '0', hq: 'HL', nu: '0.2', ndiv: '20', sufijo: 'a', titulo: 'Pared larga con agua interior (prueba hidráulica)' },
      calc(`# Pared larga — estado 2: suelo exterior`),
      { type: 'tankwall', a: 'Li + tw', b: 'Hp', inf: 'empotrado', sup: 'articulado', lat: 'empotrado', qb: 'qsb', qs: 'qst', hq: '', nu: '0.2', ndiv: '20', sufijo: 's', titulo: 'Pared larga con empuje de suelo y sobrecarga (tanque vacío)' },
      calc(`# Pared corta — estado 1: agua interior`),
      { type: 'tankwall', a: 'Bi + tw', b: 'Hp', inf: 'empotrado', sup: 'articulado', lat: 'empotrado', qb: 'qw', qs: '0', hq: 'HL', nu: '0.2', ndiv: '20', sufijo: 'c', titulo: 'Pared corta con agua interior' },
      calc(`# Diseño de las paredes (por metro)
bar = 4 // Varilla [3 : 3/8"|4 : 1/2"|5 : 5/8"]
d = tw - rec - db(bar)/2 // Peralte efectivo
fs = 1.3*1.7 // Coeficiente sanitario × factor de carga
As(Mx) = 0.85*fc/fy*(1 - sqrt(1 - 2*(fs*Mx*1 m/(0.9*100 cm*d^2))/(0.85*fc)))*100 cm*d/(1 m) // Acero requerido para un momento por metro
## Refuerzo vertical
Mvi = max(MyNa, MyPs) // Cara interior: base con agua / tramo con suelo
Mve = max(MyPa, MyNs) // Cara exterior: tramo con agua / base con suelo
Asvi = As(Mvi) -> cm^2/m
Asve = As(Mve) -> cm^2/m
Asmin = 0.0015*tw*1 m/m -> cm^2/m // Mínimo por cara: 0.003 tw/2 (ACI 350 Tabla 7.12.2.1, L < 6 m entre juntas)
s = 20 cm // Espaciamiento
Asp = Ab(bar)/s -> cm^2/m // Acero colocado por cara
check Asp >= max(Asvi, Asmin) // Refuerzo vertical, cara interior
check Asp >= max(Asve, Asmin) // Refuerzo vertical, cara exterior
## Refuerzo horizontal
Mhi = max(MxNa, MxNc, MxPs) // Cara interior: esquinas con agua / tramo con suelo
Mhe = max(MxPa, MxPc, MxNs) // Cara exterior: tramo con agua / esquinas con suelo
check Asp >= max(As(Mhi), Asmin) // Refuerzo horizontal, cara interior
check Asp >= max(As(Mhe), Asmin) // Refuerzo horizontal, cara exterior
## Cortante en la base de la pared
Vu = 1.7*max(Vba, Vbs) -> tonf/m
phiVc = 0.75*0.53*sqrtfc(fc)*100 cm*d/(1 m) -> tonf/m // φVc (φ = 0.75)
check Vu <= phiVc // Cortante en la unión con la losa de fondo
# Losa de techo (placa articulada en sus cuatro bordes)
wt = 2.4 tonf/m^3*tt + 0.10 tonf/m^2 // Peso propio + acabados
wlt = 0.25 tonf/m^2 // Sobrecarga del techo (E.020)
wu = 1.4*wt + 1.7*wlt -> tonf/m^2 // Carga última (E.060 9.2)`),
      { type: 'tankwall', a: 'Li + tw', b: 'Bi + tw', inf: 'articulado', sup: 'articulado', lat: 'articulado', qb: 'wu', qs: 'wu', hq: '', nu: '0.2', ndiv: '20', sufijo: 't', titulo: 'Losa de techo con carga última uniforme (momentos en la luz menor = My)' },
      calc(`dt = tt - 3 cm // Peralte efectivo de la losa de techo
Ast = (0.85*fc/fy*(1 - sqrt(1 - 2*(MyPt*1 m/(0.9*100 cm*dt^2))/(0.85*fc)))*100 cm*dt)/(1 m) -> cm^2/m // Ya incluye factores de carga
Asmt = 0.0018*tt*1 m/m -> cm^2/m // Mínimo por temperatura (E.060 9.7.2)
Astc = Ab(3)/(20 cm) -> cm^2/m // φ 3/8" @ 20 cm en ambas direcciones
check Astc >= max(Ast, Asmt) // Refuerzo de la losa de techo
# Presión sobre el suelo (tanque lleno)
Bt = Bi + 2*tw // Ancho exterior
Lt = Li + 2*tw // Largo exterior
Wtot = 2.4 tonf/m^3*(Lt*Bt*(tf + tt) + 2*(Lt + Bi)*tw*Hc) + gw*Vol + (wlt + 0.10 tonf/m^2)*Lt*Bt -> tonf // Peso total
qs = Wtot/(Lt*Bt) -> kgf/cm^2
check qs <= qadm // Presión de contacto (E.050)`),
      summary(),
    ],
  },
  // ===================================================================
  //  10) TANQUE ELEVADO DE FUSTE CILÍNDRICO — Housner / ACI 350.3 + E.030
  // ===================================================================
  {
    id: 'ma-elevado', pais: 'PE', cat: 'Estructuras especiales', icon: 'column',
    name: 'Tanque elevado de fuste (Housner / ACI 350.3 + E.030)', normas: 'ACI 350.3-06, ACI 350-06; RNE E.030 (2018), E.060',
    desc: 'Tanque elevado de 85 m³ sobre fuste cilíndrico: modelo de dos masas (impulsiva + estructura y convectiva), periodos, espectro E.030, fuerzas, momento de volteo, oleaje y resistencia del fuste.',
    titulo: 'Análisis sísmico y diseño del fuste de tanque elevado de concreto armado — 85 m³',
    blocks: [
      text(`# Generalidades
Tanque elevado con cuba cilíndrica de concreto armado sobre un **fuste cilíndrico** hueco empotrado en la cimentación. El análisis sísmico emplea el modelo de **dos masas de Housner** (ACI 350.3-06 Sec. 9.7 y R9.7): la masa impulsiva del agua se suma a la de la cuba y a una fracción de la del fuste, y oscila con la rigidez lateral del soporte; la masa convectiva oscila con su propio periodo largo. Las aceleraciones se obtienen del espectro de la NTE E.030 con $R_i = 2.0$ (tanque sobre pedestal) y $R_c = 1.0$; la ordenada convectiva se amplifica por 1.5 para pasar de 5 % a 0.5 % de amortiguamiento (ACI 350.3 R9.4.2). Ambas respuestas se combinan por SRSS (Ec. 4-5).`),
      calc(`# Datos
D = 6.00 m // Diámetro interior de la cuba
HL = 3.00 m // Altura de agua
Hw = 3.60 m // Altura de la pared de la cuba
tw = 0.20 m // Espesor de la pared de la cuba
tb = 0.25 m // Espesor de la losa de fondo
er = 0.12 m // Espesor de la losa de cubierta
Hf = 12.0 m // Altura del fuste (cimentación a fondo de cuba)
De = 3.00 m // Diámetro exterior del fuste
tf = 0.25 m // Espesor del fuste
gw = 1.0 tonf/m^3
gc = 2.4 tonf/m^3
fc = 280 kgf/cm^2
fy = 4200 kgf/cm^2
Z = 0.45 // Factor de zona ${ZONA}
U = 1.5 // Factor de uso: reservorio de agua, categoría A (E.030 Tabla 5)
S = 1.05 // Factor de suelo ${SUELO}
Tp = 0.6 s // ${TP}
Tl = 2.0 s // ${TL}
Ri = 2.0 // Tanque sobre pedestal (ACI 350.3 Tabla 4.1.1(b))
Rc = 1.0
grav = 9.81 m/s^2
# Pesos y masas
WL = gw*pi*D^2/4*HL -> tonf // Peso del agua
rD = D/HL
Wi = WiWLc(rD)*WL // Masa impulsiva (ACI 350.3 Ec. 9-15)
Wc = WcWLc(rD)*WL // Masa convectiva (Ec. 9-16)
hip = hipHLc(rD)*HL // Altura de Wi sobre el fondo, con presión en el fondo (Ec. 9-20/21)
hcp = hcpHLc(rD)*HL // Altura de Wc sobre el fondo (Ec. 9-22)
Wcuba = gc*(pi*(D + tw)*tw*Hw + pi*(D + 2*tw)^2/4*(tb + er)) -> tonf // Pared, fondo y cubierta
Wfus = gc*pi*(De^2 - (De - 2*tf)^2)/4*Hf -> tonf // Peso del fuste
# Rigidez del fuste y periodos
Ec = 15000*sqrtfc(fc) // Módulo de elasticidad (E.060 8.5)
If = pi/64*(De^4 - (De - 2*tf)^4) // Inercia del fuste
kf = 3*Ec*If/Hf^3 -> tonf/m // Rigidez lateral del voladizo
Wst = Wi + Wcuba + 0.25*Wfus // Peso impulsivo concentrado (masa equivalente del fuste ≈ 1/4)
Ti = 2*pi*sqrt(Wst/(grav*kf)) -> s // Periodo impulsivo (ACI 350.3 R9.7)
Tc = TcACIc(D, HL) // Periodo convectivo (Ec. 9-28 a 9-30)
# Coeficientes sísmicos (E.030)
Sai = Z*U*CE030(Ti, Tp, Tl)*S/Ri // Aceleración impulsiva reducida
Sac = 1.5*Z*U*CE030(Tc, Tp, Tl)*S/Rc // Aceleración convectiva (0.5 % de amortiguamiento)
# Fuerzas y momentos
Pi = Sai*Wst // Fuerza impulsiva (agua + cuba + 1/4 fuste)
Pf = Sai*0.75*Wfus // Fuerza del resto del fuste (a media altura)
Pc = Sac*Wc // Fuerza convectiva
Vs = sqrt((Pi + Pf)^2 + Pc^2) -> tonf // Cortante en la base del fuste (SRSS)
Mbase = sqrt((Pi*(Hf + tb + hip) + Pf*Hf/2)^2 + (Pc*(Hf + tb + hcp))^2) -> tonf*m // Momento de volteo
dmax = D/2*Sac*Rc -> m // Altura de oleaje (ACI 350.3 Ec. 7-2)
dlat = Pi/kf -> cm // Desplazamiento elástico de la cuba (impulsivo)
"Desplazamiento inelástico estimado $0.75 R_i \\delta$ = {0.75*Ri*dlat}; borde libre {Hw - HL} frente a un oleaje de {dmax}: {si(dmax > Hw - HL, 'la cubierta y su unión se diseñan para la presión del oleaje (ACI 350.3 R7.1)', 'el oleaje no alcanza la cubierta')}.`),
      { type: 'tanque', forma: 'circular', tipo: 'elevado', D: 'D', HL: 'HL', Hw: 'Hw', tw: 'tw', Hf: 'Hf', Pi: 'Pi', Pc: 'Pc', dmax: 'dmax', titulo: '' },
      calc(`# Diseño del fuste (sección tubular delgada)
rm = (De - tf)/2 // Radio medio
Ag = pi*(De^2 - (De - 2*tf)^2)/4 // Área bruta
barf = 6 // Varilla vertical [5 : 5/8"|6 : 3/4"|8 : 1"]
sf = 12.5 cm // Espaciamiento en cada cara
nbf = 2*floor(2*pi*rm/sf) // Número de varillas (dos capas)
Asf = nbf*Ab(barf) -> cm^2 // Acero vertical total
rhof = Asf/Ag // Cuantía
check rhof >= 0.0025 // Cuantía mínima de muros (E.060 11.10)
Pu = 0.9*(Wcuba + Wfus + WL) // Carga axial mínima concomitante (0.9 D)
Mu = Mbase // Momento último (sismo a nivel de resistencia)
thf = (Pu + Asf*fy)/(1.7*fc*tf*rm + 2*Asf*fy/pi) // Semiángulo comprimido θ (rad)
Mn = 1.7*fc*tf*rm^2*sin(thf) + 2*Asf*fy*rm*sin(thf)/pi -> tonf*m // Mn de anillo delgado (bloque plástico)
check 0.9*Mn >= Mu // Flexocompresión del fuste
Vuf = Vs // Cortante último
Acw = pi*rm*tf // Área efectiva de corte del tubo (A/2)
barh = 4 // Refuerzo horizontal (dos capas) [4 : 1/2"|5 : 5/8"]
shf = 20 cm // Espaciamiento vertical del refuerzo horizontal
rhoh = 2*Ab(barh)/(shf*tf) // Cuantía horizontal
check rhoh >= 0.0025 // Cuantía horizontal mínima (E.060 11.10.7)
phiVf = 0.85*Acw*(0.53*sqrtfc(fc) + rhoh*fy) -> tonf // φVn = φ Acw (0.53√f'c + ρh fy) (E.060 11.10)
check Vuf <= phiVf // Cortante en el fuste
sigc = (1.25*(Wcuba + Wfus + WL))/Ag -> kgf/cm^2 // Compresión por gravedad
check sigc <= 0.1*fc // Esfuerzo axial bajo (validez de la fórmula de anillo)`),
      summary(),
    ],
  },
];
