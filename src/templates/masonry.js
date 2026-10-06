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
const GRUPO = '[1 : Grupo A|2 : Grupo B|3 : Grupo C|4 : Grupo D]';

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
"Para cada muro se calcula el esfuerzo axial $\\sigma_m = P_m/(L\\,t)$ y el esfuerzo admisible $F_a = 0.2\\,f'_m\\left[1-\\left(\\dfrac{h}{35\\,t}\\right)^2\\right] \\le 0.15\\,f'_m$ (Art. 19.1.b). Los valores de cada muro se presentan en la tabla siguiente.
@ocultar
sigma${D} = Pm${D} ./ (L${D} .* t${D}) // Esfuerzo axial σm = Pm/(L·t)
Fa${D} = FaE070(fm, hl, t${D}) // Fa = 0.2 f'm [1 − (h/35t)²] ≤ 0.15 f'm (Art. 19.1.b)
@mostrar
@modo corto
ra${D} = max(sigma${D} ./ Fa${D}) // Relación máxima σm/Fa entre los muros de la dirección ${D}
@modo completo
check ra${D} <= 1 // Esfuerzo axial máximo, dirección ${D} (Art. 19.1.b)`;

const dirSeis = (D) => `## Fuerzas del sismo moderado y resistencia al corte — dirección ${D}
"Para cada muro (valores en la tabla siguiente): cortante del sismo moderado $V_e = r\\,V_{e1}$, con $r$ = fracción de rigidez más el efecto de la torsión (Art. 24.5 y E.030 Art. 37); momento $M_e = V_e\\,(M_1/V_{e1})$ (voladizo); $\\alpha = V_e\\,L/M_e$ con $1/3 \\le \\alpha \\le 1$; resistencia al agrietamiento diagonal $V_m = 0.5\\,v'_m\\,\\alpha\\,t\\,L + 0.23\\,P_g$ ($0.35\\,v'_m$ en unidades sílico-calcáreas, Art. 26.3); factor de amplificación $2 \\le V_{m1}/V_{e1} \\le 3$ y fuerzas del sismo severo $V_u = V_e\\,(V_{m1}/V_{e1})$, $M_u = M_e\\,(V_{m1}/V_{e1})$ (Art. 27).
@ocultar
Ve${D} = r${D}*Ve1 // Cortante por muro: Ve = (k/Σk + torsión)·V (Art. 24.5 y E.030 Art. 37)
Me${D} = Ve${D}*hM // Momento flector del muro (voladizo): Me = Ve·(M1/V1)
alpha${D} = alphaE070(Ve${D}, L${D}, Me${D}) // α = Ve·L/Me, 1/3 ≤ α ≤ 1 (Art. 26.3)
Vm${D} = VmE070(vm, alpha${D}, t${D}, L${D}, Pg${D}, matE070(unid)) // Vm = 0.5 v'm α t L + 0.23 Pg (Art. 26.3)
f${D} = factE070(Vm${D}, Ve${D}) // Factor de amplificación 2 ≤ Vm1/Ve1 ≤ 3 (Art. 27)
Vu${D} = f${D} .* Ve${D} // Cortante último ante sismo severo Vu = Ve·(Vm1/Ve1) (Art. 27)
Mu${D} = f${D} .* Me${D} // Momento último Mu = Me·(Vm1/Ve1) (Art. 27)
@mostrar
@modo corto
rf${D} = max(Ve${D} ./ (0.55*Vm${D})) // Relación máxima Ve/(0.55 Vm) entre los muros de la dirección ${D}
check rf${D} <= 1 // Control de fisuración Ve ≤ 0.55 Vm en todos los muros, dirección ${D} (Art. 26.2)
SVm${D} = sum(Vm${D}) -> tonf // Resistencia al corte del entrepiso ΣVm
@modo completo
check SVm${D} >= VE // Resistencia global ΣVm ≥ VE ante sismo severo, dirección ${D} (Art. 26.4)`;

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
    name: 'Edificio de albañilería confinada (E.070)', normas: 'RNE — NTE E.070 Albañilería (2006), E.030 Diseño Sismorresistente (2018, mod. RM 183-2026-VIVIENDA), E.060, E.020',
    desc: 'Edificio de 4 pisos: densidad y planta de muros (CM/CR), cargas axiales, sismo por muro según rigidez con torsión, fisuración, resistencia global y diseño de columnas y soleras (Art. 27).',
    titulo: 'Memoria de cálculo — Edificio multifamiliar de albañilería confinada de 4 pisos',
    validacion: {
      fuente: 'A. San Bartolomé (2006), «Ejemplo de aplicación de la Norma E.070» (PUCP): Fa = 93.8 t/m² (t = 13 cm, h = 2.40 m, f\'m = 65 kg/cm²); NTE E.070 Tabla 9',
      nota: 'La planta por defecto NO es la del edificio de San Bartolomé: solo Fa (muro de soga, h = 2.40 m) y f\'m, v\'m (Tabla 9) son valores publicados. dmin y Vm1 son valores de control calculados a mano con las fórmulas de la E.070 (Art. 19.2 b y 26.3), no publicados.',
      valores: [
        { var: 'fm', unidad: 'kgf/cm^2', esperado: 65, tol: 0.001, desc: "f'm King Kong industrial (E.070 Tabla 9)" },
        { var: 'vm', unidad: 'kgf/cm^2', esperado: 8.1, tol: 0.001, desc: "v'm King Kong industrial (E.070 Tabla 9)" },
        { var: 'min(FaX)', unidad: 'tonf/m^2', esperado: 93.8, tol: 0.001, desc: 'Fa muros de soga t = 13 cm (San Bartolomé 2006)' },
        { var: 'dmin', esperado: 0.03375, tol: 0.001, desc: 'Control: ZUSN/56 = 0.45·1·1.05·4/56' },
        { var: 'Vm1', unidad: 'tonf', esperado: 21.00, tol: 0.002, desc: "Control: Vm muro X1 = 0.5 v'm α t L + 0.23 Pg (α = 3.6/7.8)" },
      ],
    },
    blocks: [
      text(`# Generalidades
La presente memoria desarrolla el diseño estructural de un **edificio multifamiliar de cuatro pisos** de albañilería confinada (ladrillo de arcilla King Kong industrial, losas aligeradas de 20 cm que conforman diafragmas rígidos), siguiendo el método de diseño por desempeño de la **NTE E.070 Albañilería** (2006): el sismo moderado ($R = 6$) no debe fisurar ningún muro y la resistencia al corte del edificio debe superar la demanda del sismo severo ($R = 3$).

**Normas:** RNE — E.020 Cargas, E.030 Diseño Sismorresistente (2018, modificada por la RM 183-2026-VIVIENDA), E.060 Concreto Armado, E.070 Albañilería. **Referencia:** A. San Bartolomé, D. Quiun y W. Silva, *Diseño y construcción de estructuras sismorresistentes de albañilería* (Fondo Editorial PUCP), Cap. «Ejemplo de diseño de un edificio de albañilería confinada».

**Hipótesis:** muros en voladizo por entrepiso para la distribución del cortante (Art. 24.5), centro de masas en el centroide de la planta típica, cargas de gravedad por área tributaria (Pg con 25 % de sobrecarga y Pm con 100 %, Art. 26.3 y 19.1.b). El análisis estático es válido para edificios regulares de hasta 15 m de altura (E.030 Art. 28).`),
      calc(`# Materiales
unid = 2 // Unidad de albañilería (E.070 Tabla 9) ${UNI}
fm = fmE070(unid) // Resistencia característica a compresión de pilas f'm (Tabla 9)
vm = vmE070(unid) // Resistencia característica a corte de muretes v'm (Tabla 9)
Em = EmE070(fm, matE070(unid)) // Módulo de elasticidad Em = 500 f'm (Art. 24.7)
Gm = 0.4*Em // Módulo de corte Gm = 0.4 Em (Art. 24.7)
fc = 175 kgf/cm^2 // Concreto de confinamiento f'c ≥ 175 kg/cm² (Art. 20.1.f) [175 kgf/cm^2|210 kgf/cm^2] [175..280]
fy = 4200 kgf/cm^2 // Acero corrugado ASTM A615 grado 60 [2800..4200]
# Parámetros de la edificación
N = 4 // Número de pisos (E.070 Art. 27 a: hasta 5 pisos o 15 m) [1..5]
h1 = 2.60 m // Altura de entrepiso (piso a piso) [2.30 m..3.00 m]
hl = 2.40 m // Altura libre del muro (Art. 19.1.a) [2.10 m..2.80 m]
wp = 0.90 tonf/m^2 // Peso sísmico por m² de planta (CM + 25 % CV, E.030 Art. 31) [0.70..1.10]
Z = 0.45 // Factor de zona (E.030 Tabla N° 1) ${ZONA} [0.10..0.45]
U = 1.0 // Factor de uso — vivienda, categoría C (E.030 Tabla N° 7) [1.0|1.3|1.5] [1.0..1.5]
S = 1.05 // Factor de suelo (E.030 Tabla N° 4) ${SUELO} [0.80..2.00]
Tp = 0.6 s // Periodo TP (E.030 Tabla N° 5) ${TP} [0.3 s..1.0 s]
Tl = 2.0 s // Periodo TL (E.030 Tabla N° 5) ${TL} [1.6 s..3.0 s]`),
      { type: 'wallplan', muros: MUROS_EDIF, planta: '0 0 10 15', Ap: '', cm: '', Z: 'Z', U: 'U', S: 'S', N: 'N', h: 'h1', hl: 'hl', apoyo: 'voladizo', ea: '0.05', titulo: 'Planta típica de muros (muros de soga t = 13 cm y de cabeza t = 23 cm), CM y CR' },
      calc(`# Análisis sísmico (E.030 Art. 33 a 36 — fuerzas estáticas equivalentes)
hn = N*h1 // Altura total de la edificación
check N <= 5 // Albañilería confinada: hasta 5 pisos (E.070 Art. 27 a)
check hn <= 15 m // Albañilería confinada: altura total ≤ 15 m (E.070 Art. 27 a)
CT = 60 m/s // Coeficiente CT para albañilería (E.030 Art. 36.1) [35..60]
Te = hn/CT -> s // Periodo fundamental T = hn/CT
Cs = CE030(Te, Tp, Tl) // Factor de amplificación sísmica (E.030 Art. 18, Tabla N° 6)
P = N*wp*Ap -> tonf // Peso sísmico de la edificación (E.030 Art. 31)
VE = Z*U*Cs*S/3*P -> tonf // Cortante basal del sismo severo, R = 3 (E.070 Art. 22)
Ve1 = VE/2 -> tonf // Cortante basal del sismo moderado = ½ sismo severo (E.070 Art. 22)
## Distribución en altura (pisos de igual peso, T < 0.5 s → k = 1)
hi = (1:N)*h1 // Altura de cada nivel sobre la base
Fi = Ve1*hi/sum(hi) // Fuerzas por nivel Fi = αi·V con αi = Pi hi/Σ Pj hj (E.030 Art. 35)
M1 = sum(Fi .* hi) -> tonf*m // Momento de volteo en la base (sismo moderado)
hM = M1/Ve1 -> m // Brazo del momento Me/Ve para los muros del primer piso
"Momento de cada muro $M_e = V_e\\,(M_1/V_1)$: reparto del momento de volteo en proporción al cortante (muros en voladizo, Art. 24.5). Es conservador para $\\alpha$ y para $M_u$ de las columnas; si los muros están acoplados por vigas o losas, use los $M_e$ de un modelo elástico.
"Excentricidad accidental 0.05 B en cada dirección (E.030 Art. 37) incluida en el reparto de la planta: los factores $r$ suman {sum(rX)} en X y {sum(rY)} en Y (no se reducen fuerzas por torsión).`),
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
Nc = 2 // Número de columnas de confinamiento (muro de un paño) [2..5]
Lm = Lw // Longitud del paño mayor (muro de un paño: Lm = L, Tabla 11)
Pt = 4.0 tonf // Carga tributaria del muro transversal Y1 sobre la columna extrema (Art. 24.6) [0..10]
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
dc = 30 cm // Peralte de la columna en la dirección del muro [20..50]
Ac = bc*dc -> cm^2 // Área de la sección
check Ac >= Acf // Sección mínima por corte-fricción (Art. 27.3.a.1)
check Ac >= 15*tw*1 cm // Sección mínima Ac ≥ 15 t (Art. 27.3.a.1)
## Refuerzo vertical (Art. 27.3.a.2)
mu = 1.0 // Coeficiente de fricción (0.8 junta sin tratar; 1.0 junta rugosa) [0.8|1.0]
Asf = Vc/(fy*mu*phi) -> cm^2 // Acero por corte-fricción
Ast = max(Tcol, 0 tonf)/(fy*phi) -> cm^2 // Acero por tracción (T > 0; si T ≤ 0 no hay tracción)
Asmin = 0.1*fc*Ac/fy -> cm^2 // Mínimo 0.1 f'c Ac/fy
Asreq = max(Asf + Ast, Asmin) // Refuerzo vertical requerido
nb = 4 // Número de varillas (mínimo 4) [4..8]
bar = 6 // Diámetro de las varillas [4 : 1/2"|5 : 5/8"|6 : 3/4"]
As = nb*Ab(bar) // Refuerzo vertical colocado
check As >= Asreq // Refuerzo vertical de la columna extrema (Art. 27.3.a.2)
## Núcleo confinado por compresión (Art. 27.3.a.1)
rec = 2 cm // Recubrimiento al estribo (Art. 11.10) [2..4]
An = (bc - 2*rec)*(dc - 2*rec) -> cm^2 // Área del núcleo confinado
delta = 1.0 // δ = 0.8 sin muros transversales; 1.0 con muro transversal (Y1) [0.8|1.0]
phic = 0.7 // φ para estribos cerrados
Anreq = As + (Ccol/phic - As*fy)/(0.85*delta*fc) -> cm^2 // An = As + (C/φ − As fy)/(0.85 δ f'c)
check An >= Anreq // Área del núcleo por compresión (Art. 27.3.a.1)
## Estribos de confinamiento (Art. 27.3.a.3)
Av = 2*Abmm(6) // Estribo cerrado de 6 mm (dos ramas)
tn = bc - 2*rec // Espesor del núcleo
s1 = Av*fy/(0.3*tn*fc*(Ac/An - 1)) -> cm // Espaciamiento s1 = Av fy/(0.3 tn f'c (Ac/An − 1)) (Art. 27.3.a.3)
s2 = Av*fy/(0.12*tn*fc) -> cm // Espaciamiento s2 = Av fy/(0.12 tn f'c)
s3 = max(dc/4, 5 cm) // d/4 ≥ 5 cm
s4 = 10 cm // Espaciamiento máximo en la zona confinada
sc = rounddown(min(s1, s2, s3, s4), 2.5 cm) // Espaciamiento en la zona confinada
zc = max(45 cm, 1.5*dc) // Longitud de confinamiento en cada extremo
"Estribos cerrados de 6 mm: 1 @ 5 cm, resto @ {sc} en una longitud {zc} desde cada extremo y @ 25 cm en la zona central (mínimo de la E.070: estribos de 6 mm, 1 @ 5, 4 @ 10, resto @ 25 cm).
## Viga solera (Art. 27.3.b)
Ts = Vm1*Lm/(2*Lw) -> tonf // Tracción en la solera Ts = Vm1 Lm/(2L)
hsol = 20 cm // Peralte de la solera = espesor del aligerado (Art. 20.4) [17..30]
Acs = tw*hsol -> cm^2 // Sección de la solera
Ass_req = max(Ts/(0.9*fy), 0.1*fc*Acs/fy) -> cm^2 // As = Ts/(φ fy) ≥ 0.1 f'c Acs/fy, φ = 0.9
Ass = 4*Ab(3) // Refuerzo colocado 4 φ 3/8"
check Ass >= Ass_req // Refuerzo longitudinal de la solera (Art. 27.3.b)
## Refuerzo horizontal en los muros del primer piso (Art. 27.1)
"Edificio de más de tres pisos: todos los muros portantes del primer nivel llevan refuerzo horizontal continuo anclado en las columnas.
Ash = Ab(3) // Una varilla de 3/8" en la junta
sh = 30 cm // Cada 3 hiladas [20..40]
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
unid = 10 // Unidad (E.070 Tabla 9) ${UNI}
fm = fmE070(unid) // Resistencia característica f'm
vm = vmE070(unid) // Resistencia característica v'm
fy = 4200 kgf/cm^2 // Acero de refuerzo [2800..4200]
L = 4.00 m // Longitud del muro [1.20 m..8.00 m]
t = 14 cm // Espesor efectivo (bloque de 14 cm) [12..24]
hl = 2.40 m // Altura libre [2.10 m..3.00 m]
Pg = 30 tonf // Carga de gravedad con 25 % de sobrecarga [5..80]
Pm = 36 tonf // Carga de gravedad con 100 % de sobrecarga [5..100]
Ve = 12 tonf // Cortante del sismo moderado [1..30]
Me = 50 tonf*m // Momento del sismo moderado [5..120]
# Requisitos generales
check t >= hl/20 // Espesor efectivo mínimo t ≥ h/20 (Art. 19.1.a)
sigmam = Pm/(L*t) -> kgf/cm^2 // Esfuerzo axial máximo
Fa = FaE070(fm, hl, t) // Esfuerzo admisible (Art. 19.1.b)
check sigmam <= Fa // Esfuerzo axial máximo (Art. 19.1.b)
alpha = alphaE070(Ve, L, Me) // Factor de esbeltez (Art. 26.3)
Vm = VmE070(vm, alpha, t, L, Pg, matE070(unid)) -> tonf // Resistencia al agrietamiento diagonal
check Ve <= 0.55*Vm // Control de fisuración (Art. 26.2)
# Diseño por flexocompresión (Art. 28.2 y 28.3)
Mu = 1.25*Me // Momento de diseño Mu = 1.25 Me (Art. 28.2 a)
Vu = 1.25*Ve // Cortante de diseño Vu = 1.25 Ve (Art. 28.2 a)
Pu = 0.9*Pg // Carga axial mínima para dimensionar el acero de borde (Art. 28.3 b)
Po = 0.1*fm*t*L -> tonf // Po = 0.1 f'm t L (Art. 28.3)
phif = min(max(0.85 - 0.2*Pu/Po, 0.65), 0.85) // 0.65 ≤ φ = 0.85 − 0.2 Pu/Po ≤ 0.85
D = 0.8*L // Brazo D = 0.8 L
Asreq = max((Mu/phif - Pu*L/2)/(fy*D), 2*Ab(3)) -> cm^2 // As = (Mu/φ − Pu L/2)/(fy D) ≥ 2 φ 3/8"
nb = 2 // Varillas en cada extremo [2..4]
bar = 4 // Diámetro [3 : 3/8"|4 : 1/2"|5 : 5/8"]
As = nb*Ab(bar) // Acero vertical de borde colocado
check As >= Asreq // Refuerzo vertical en los extremos (Art. 28.3)
Mn = As*fy*D + Pu*L/2 -> tonf*m // Capacidad con la carga axial mínima Pu = 0.9 Pg (Art. 28.3 b)
check phif*Mn >= Mu // Resistencia a flexocompresión φMn ≥ Mu (Art. 28.3 a)
Pu1 = 1.25*Pm // Máxima carga axial del primer piso (Art. 28.3 f)
Mn1 = As*fy*D + Pu1*L/2 -> tonf*m // Mn1 con Pu = 1.25 Pm, solo para el cortante por capacidad (Art. 28.3 f)
"Refuerzo vertical repartido: φ 3/8\\" @ 40 cm (ρ = {0.71 cm^2/(40 cm*t)}) en la zona central, espaciado ≤ 45 cm (Art. 28.1 k).
check Ab(3)/(40 cm*t) >= 0.001 // Cuantía vertical mínima 0.1 % (Art. 28.1 a)
# Confinamiento de los extremos libres (Art. 28.4)
Ag = L*t // Área bruta
Ig = t*L^3/12 // Inercia bruta
sigmau = Pu1/Ag + Mu*(L/2)/Ig -> kgf/cm^2 // σu = Pu/A + Mu y/I
check sigmau < 0.3*fm // σu < 0.3 f'm: no requiere confinar los bordes (Art. 28.4 b)
# Diseño por corte — capacidad (Art. 28.5)
Vuf = max(1.25*Vu*Mn1/Mu, Vm) -> tonf // Vuf1 = 1.25 Vu1 (Mn1/Mu1), no menor que Vm1
vi = Vuf/(t*L) -> kgf/cm^2 // Esfuerzo de corte
check vi <= 0.1*fm // vi ≤ 0.10 f'm en la zona de rótula plástica (Art. 28.5)
Dh = si(Me/(Ve*L) >= 1, 0.8*L, L) // D = 0.8 L (esbelto) o L (no esbelto)
sh = 20 cm // Espaciamiento del refuerzo horizontal (≤ 200 mm, edificio de más de 3 pisos, Art. 28.1 d) [10..40]
Ashreq = Vuf*sh/(fy*Dh) -> cm^2 // Ash = Vuf s/(fy D)
Ash = Ab(3) // Refuerzo horizontal colocado: 1 φ 3/8" @ 20 cm
check Ash >= Ashreq // Refuerzo horizontal por corte (Art. 28.5)
check Ash/(sh*t) >= 0.001 // Cuantía horizontal mínima 0.1 % (Art. 28.1 a)`),
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
    validacion: {
      fuente: 'Valores de control (E.070 Art. 29.6 y E.030-2018 Art. 41/43)',
      nota: 'No reproduce un ejemplo publicado: valores de control calculados a mano con los datos por defecto (Z = 0.45, U = 1, C1 = 0.6, S = 1.05, γ = 1.8 t/m³, e = 0.15 m).',
      valores: [
        { var: 'w070', unidad: 'kgf/m^2', esperado: 58.32, tol: 0.001, desc: 'Control: w = 0.8 Z U C1 γ e' },
        { var: 'w030', unidad: 'kgf/m^2', esperado: 51.03, tol: 0.001, desc: 'Control: w = 0.8·0.5 Z U S γ e' },
      ],
    },
    blocks: [
      text(`# Generalidades
Cerco perimétrico de ladrillo King Kong industrial en aparejo de soga, arriostrado por columnas de concreto armado cada 3.0 m, viga solera superior y cimiento corrido de concreto ciclópeo. El paño se analiza como una losa apoyada en sus arriostres sujeta a la carga sísmica perpendicular a su plano (NTE E.070 Art. 29), sin admitir tracciones por flexión mayores que $f'_t$ (Art. 31). Ejemplo basado en el procedimiento de A. San Bartolomé, *Construcciones de albañilería* (PUCP).`),
      calc(`# Datos
Z = 0.45 // Factor de zona ${ZONA} [0.10..0.45]
U = 1.0 // Factor de uso [1.0|1.3|1.5] [1.0..1.5]
S = 1.05 // Factor de suelo (E.030 Tabla N° 4) ${SUELO} [0.80..2.00]
C1 = C1E030a(4) // C1 = 0.6 para cercos (E.030-2003 Tabla N° 9, a la que remite E.070 Art. 29.6)
gm = 1.8 tonf/m^3 // Peso volumétrico de la albañilería con tarrajeo [1.6..2.0]
t = 13 cm // Espesor efectivo (soga) [9..25]
esp = 15 cm // Espesor bruto con tarrajeo e [11..27]
ha = 2.40 m // Altura libre del paño (entre sobrecimiento y solera) [1.50 m..3.50 m]
bp = 3.00 m // Distancia entre columnas de arriostre [2.00 m..5.00 m]
caso = 1 // Caso de la Tabla 12 [1 : 4 bordes arriostrados|2 : 3 bordes (sin solera)|3 : bordes horizontales|4 : voladizo]
# Carga sísmica y momento en el paño (Art. 29.6 y 29.7)
w070 = 0.8*Z*U*C1*gm*esp -> kgf/m^2 // w = 0.8 Z U C1 γ e (E.070 Art. 29.6, esfuerzos admisibles)
w030 = 0.8*0.5*Z*U*S*gm*esp -> kgf/m^2 // E.030 vigente: F = 0.5 Z U S Pe para cercos (Art. 60; Art. 41 en 2018), × 0.8 en esfuerzos admisibles (Art. 29; Art. 43 en 2018)
w = max(w070, w030) // Carga de diseño: la mayor (la E.070 remite al C1 de la E.030-2003, ya derogada)
a = si(caso == 1, min(ha, bp), si(caso == 2, bp, ha)) // Dimensión crítica a (Tabla 12)
bt = si(caso == 1, max(ha, bp), ha) // Otra dimensión b
mc = mE070(caso, bt/a) // Coeficiente de momento m (Tabla 12)
Ms = mc*w*a^2 -> kgf*m/m // Momento distribuido Ms = m w a²
fmt = 6*Ms/t^2 -> kgf/cm^2 // Esfuerzo de tracción por flexión fm = 6 Ms/t²
ftad = ftE070(1) // Tracción por flexión admisible, albañilería simple (Art. 29.8)
check fmt <= ftad // Tracción por flexión en el paño (Art. 31.3)
treq = sqrt(6*Ms/ftad) -> cm // Espesor mínimo requerido t ≥ √(6 Ms/f't)
check t >= treq // Espesor efectivo del cerco (E.070 Art. 29.8 y 31.3)
# Diseño de la columna de arriostre (Art. 29.9 y 31.5)
fcc = 175 kgf/cm^2 // Concreto de columnas y soleras [140..280]
fy = 4200 kgf/cm^2 // Acero de refuerzo [2800..4200]
fu = 1.25 // Paso de cargas de servicio a rotura de los arriostres: 1/0.8 (E.030 Art. 29)
bcol = t // Ancho de la columna (= espesor del muro)
hcol = 25 cm // Peralte de la columna (perpendicular al muro) [15..40]
Mcol = fu*w*bp*ha^2/2 -> tonf*m // Voladizo con la carga del paño tributario
dcol = hcol - 4 cm // Peralte efectivo
Rn = Mcol/(0.9*bcol*dcol^2) -> kgf/cm^2
rho = 0.85*fcc/fy*(1 - sqrt(max(0, 1 - 2*Rn/(0.85*fcc)))) // Cuantía (E.060 Cap. 10)
rhomax = 0.75*0.85*0.85*fcc/fy*6000 kgf/cm^2/(6000 kgf/cm^2 + fy) // ρmax = 0.75 ρb (E.060 10.3.4, β1 = 0.85)
check rho <= rhomax // Sección de la columna suficiente: ρ ≤ 0.75 ρb (E.060 10.3.4)
Ascol = max(rho*bcol*dcol, 0.7*sqrtfc(fcc)/fy*bcol*dcol) -> cm^2 // Acero en tracción por cara
Asc = 2*Ab(3) // 2 φ 3/8" por cara (4 φ 3/8" en total)
check Asc >= Ascol // Refuerzo de la columna de arriostre (E.070 Art. 31.5; E.060 Cap. 10)
Vcol = fu*w*bp*ha -> tonf // Cortante en la base
phiVc = 0.85*0.53*sqrtfc(fcc)*bcol*dcol -> tonf // Resistencia al corte del concreto
check Vcol <= phiVc // Corte en la columna (E.060 11.3)
# Diseño de la viga solera
bsol = t // Ancho de la solera
hsol = 20 cm // Peralte de la solera [15..30]
Msol = fu*w*(a/2)*bp^2/8 -> tonf*m // Faja superior del paño (a/2) simplemente apoyada entre columnas
Rns = Msol/(0.9*hsol*(bsol - 3 cm)^2) -> kgf/cm^2 // Flexión fuera del plano del muro (ancho resistente hsol)
rhos = 0.85*fcc/fy*(1 - sqrt(max(0, 1 - 2*Rns/(0.85*fcc))))
check rhos <= rhomax // Sección de la solera suficiente: ρ ≤ 0.75 ρb (E.060 10.3.4)
Assol = max(rhos*hsol*(bsol - 3 cm), 0.7*sqrtfc(fcc)/fy*hsol*(bsol - 3 cm)) -> cm^2
check 2*Ab(3) >= Assol // Solera 4 φ 3/8" (2 por cara)
# Cimiento corrido (Art. 31.6, por metro lineal)
gcc = 2.3 tonf/m^3 // Concreto ciclópeo [2.2..2.4]
Bc = 0.60 m // Ancho del cimiento [0.40 m..1.20 m]
hc = 0.80 m // Altura del cimiento (profundidad de cimentación) [0.60 m..1.50 m]
hsob = 0.50 m // Altura del sobrecimiento (0.30 m sobre el terreno) [0.30 m..0.80 m]
gs = 1.8 tonf/m^3 // Peso unitario del suelo [1.4..2.1]
phis = 30 deg // Ángulo de fricción del suelo [20..40]
qadm = 1.0 kgf/cm^2 // Capacidad admisible del suelo (E.050) [0.5..4.0]
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
zona = 2 // Zona sísmica (E.030) [4|3|2|1] [1..4]
Np = 1 // Número de pisos [1..2]
Ss = SE080(1) // Factor de suelo — Tipo I, roca o suelo muy resistente (Tabla 1)
U = UE080(1) // Factor de uso — vivienda (Tabla 2)
Cz = CE080(zona) // Coeficiente sísmico (Tabla 3)
check Np <= si(zona >= 3, 1, 2) // Número de pisos permitido (Art. 4.2)
## Geometría
esp = 0.40 m // Espesor de muro e (adobe de 40 × 40 × 10 cm) [0.40 m..0.70 m]
H = 2.40 m // Altura libre del muro [2.00 m..3.00 m]
Larr = 4.00 m // Distancia máxima entre arriostres verticales [2.00 m..5.00 m]
av = 1.00 m // Ancho máximo de vano [0.60 m..1.50 m]
bar = 1.60 m // Longitud mínima de muro de arriostre (contrafuerte o muro transversal) [1.20 m..2.50 m]
Bx = 7.60 m // Dimensión exterior en X [4.00 m..12.00 m]
By = 5.60 m // Dimensión exterior en Y [4.00 m..12.00 m]
Ap = Bx*By // Área techada
SLX = 5.70 m + 6.60 m + 3.40 m // Longitud neta de muros en X (sin vanos)
SLY = 5.60 m + 4.60 m + 4.70 m // Longitud neta de muros en Y (sin vanos)
## Materiales (Art. 8 y 9)
gad = 1.70 tonf/m^3 // Peso volumétrico del adobe [1.50..1.90]
fo = 12 kgf/cm^2 // Resistencia a compresión de cubos (ensayo, ≥ 10.2 kgf/cm²) [10.2..20]
fpm = 6.5 kgf/cm^2 // Resistencia a compresión de muretes f'm (ensayo) [6.12..12]
fpt = 0.30 kgf/cm^2 // Resistencia a tracción indirecta de muretes f't (ensayo) [0.25..0.60]
check fo >= 10.2 kgf/cm^2 // Resistencia mínima de la unidad (Art. 8.1)
check fpm >= 6.12 kgf/cm^2 // Resistencia mínima de muretes a compresión (Art. 8.4)
check fpt >= 0.25 kgf/cm^2 // Resistencia mínima de muretes a tracción indirecta (Art. 8.5)
FS = 2.5 // Coeficiente de seguridad (Art. 9) [2.5 : Con ensayos de laboratorio|3.0 : Sin ensayos]
fmad = fpm/FS -> kgf/cm^2 // Compresión admisible fm = f'm/FS = 0.40 f'm con ensayos (Art. 8.4 y 9)
vmad = fpt/FS -> kgf/cm^2 // Corte admisible vm = f't/FS = 0.40 f't con ensayos (Art. 8.5 y 9)
ftad = 1.42 kgf/cm^2/FS -> kgf/cm^2 // Tracción por flexión admisible: resistencia última 0.14 MPa / FS (Art. 8.6 y 9)
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
wt = 0.12 tonf/m^2 // Peso del techo (calamina, tijerales, cielo raso) [0.03..0.30]
wl = 0.05 tonf/m^2 // Sobrecarga de techo [0.03..0.10]
Pmur = gad*esp*H*(SLX + SLY) -> tonf // Peso de los muros
Ptech = (wt + 0.5*wl)*Ap -> tonf // Techo con 50 % de carga viva
P = Pmur + Ptech // Peso total
Hs = Ss*U*Cz*P -> tonf // H = S U C P
## Corte en el plano de los muros (Art. 7.3.1.a)
tauX = Hs/(1.2*SLX*esp) -> kgf/cm^2 // Área de muros + 20 % por muros transversales (Art. 7.3.1.a.iii)
tauY = Hs/(1.2*SLY*esp) -> kgf/cm^2
check tauX <= vmad // Esfuerzo de corte en X (E.080 Art. 7.3.1 a y 8.5)
check tauY <= vmad // Esfuerzo de corte en Y (E.080 Art. 7.3.1 a y 8.5)
## Compresión en la base del muro más cargado
At = 2.0 m^2 // Área tributaria de techo por metro de muro [0.5..4.0]
sigma = (gad*H*esp*1 m + (wt + wl)*At)/(esp*1 m) -> kgf/cm^2 // Peso propio + techo
check sigma <= fmad // Compresión admisible (Art. 8.4)
## Flexión fuera del plano (Art. 7.3.1.b)
"El muro se apoya en el cimiento y en los dos arriostres verticales (la viga collar no se considera apoyo, Art. 7.3.1.b.ii): caso de tres bordes arriostrados con borde superior libre (coeficientes de Timoshenko de la Tabla 12 de la E.070).
wf = Ss*U*Cz*gad*esp -> kgf/m^2 // Carga sísmica perpendicular al plano
mf = mE070(2, H/Larr) // Coeficiente m (3 bordes, a = borde libre = L)
Msf = mf*wf*Larr^2 -> kgf*m/m // Momento por metro
ff = 6*Msf/esp^2 -> kgf/cm^2 // Esfuerzo de tracción por flexión
check ff <= ftad // Tracción por flexión admisible (Art. 8.6)`),
      text(`> **Zonas 3 y 4:** con $C$ = 0.20–0.25 (Tabla 3) las verificaciones de resistencia de la tierra sin reforzar (corte con $f'_t$ ≈ 0.25–0.30 kg/cm² y flexión fuera del plano con 1.42 kg/cm²/FS) normalmente **no cumplen** para esta planta (cambie la zona para comprobarlo). En esos casos la seguridad depende del criterio de **desempeño** (Art. 7.3.3): refuerzo de geomalla o sogas que controle los desplazamientos tras la fisuración, más densidad de muros, menor distancia entre arriostres ($L$) y ensayos que acrediten un $f'_t$ mayor. Esta memoria no cuantifica la contribución del refuerzo.

> **Refuerzos (Art. 6.10 y 7.3.3):** geomalla biaxial en ambas caras de los muros, conectada con pasadores a través de las hiladas, viga collar de madera fijada a la malla y a los muros, y dinteles flexibles. Los vanos deben ser pequeños y centrados (Art. 6.6).`),
      summary(),
    ],
  },
  // ===================================================================
  //  5) VIGA DE MADERA — E.010 / JUNAC
  // ===================================================================
  {
    id: 'ma-vigamadera', pais: 'PE', cat: 'Madera y tierra', icon: 'beam',
    name: 'Viga de madera (E.010 / JUNAC)', normas: 'RNE — NTE E.010 Madera (texto vigente 2021; antes DS 005-2014), E.020; Manual de Diseño para Maderas del Grupo Andino (JUNAC)',
    desc: 'Vigas de entrepiso por esfuerzos admisibles: flexión, corte a una distancia h del apoyo, aplastamiento, deflexión con 1.8 CM + CV y estabilidad lateral (h/b).',
    titulo: 'Diseño de vigas de madera de entrepiso — NTE E.010',
    blocks: [
      text(`# Generalidades
Diseño por **esfuerzos admisibles** de las vigas de un entrepiso de madera (viguetas con entablado y cielo raso de yeso), según la NTE E.010 y el *Manual de Diseño para Maderas del Grupo Andino* (JUNAC, Cap. 8). Se usa madera estructural seca (CH ≤ 22 %) de dimensiones reales comerciales. Para viguetas con acción de conjunto (entablado y separación ≤ 60 cm) se emplea el módulo de elasticidad promedio $E_{prom}$ y los esfuerzos admisibles se incrementan 10 % (Art. 16.3 y 17); en elementos aislados, $E_{min}$.`),
      calc(`# Datos
grupo = 2 // Grupo estructural de la madera (E.010 Tabla 1) ${GRUPO}
Lv = 4.20 m // Luz de cálculo de la vigueta [1.50 m..6.00 m]
sv = 0.60 m // Separación entre viguetas [0.30 m..1.20 m]
b = 6.5 cm // Ancho real (sección comercial 3" × 10") [4..20]
h = 24 cm // Peralte real [9..35]
apoyo = 8 cm // Longitud de apoyo [5..20]
wD = 100 kgf/m^2 // Carga muerta (entablado, cielo raso, acabados) [50..300]
wL = 200 kgf/m^2 // Sobrecarga de vivienda (E.020) [100..500]
gmad = 650 kgf/m^3 // Densidad de la madera seca del grupo B (peso propio) [400..1100]
conj = 1 // Acción de conjunto (viguetas con entablado a ≤ 60 cm) [1 : Sí — Eprom y +10 %|0 : No — Emin]
lim = 300 // Deflexión admisible L/k (E.010 Art. 18.2 a) [300 : Con cielo raso de yeso|250 : Sin cielo raso de yeso]
check si(conj == 1, sv, 0.60 m) <= 0.60 m // Acción de conjunto solo con separación ≤ 60 cm (E.010 Art. 16.3)
# Propiedades (E.010 Tablas 3 y 5)
E = si(conj == 1, EpromE010(grupo), EminE010(grupo)) // Módulo de elasticidad (Art. 17)
kc = si(conj == 1, 1.10, 1.00) // Incremento de esfuerzos por acción de conjunto (Art. 16.3, excepto fc⊥)
fm = kc*fmE010(grupo) // Esfuerzo admisible en flexión
fv = kc*fvE010(grupo) // Esfuerzo admisible en corte paralelo
fcp = fcpE010(grupo) // Compresión perpendicular a las fibras
A = b*h // Área de la sección
Ix = b*h^3/12 // Momento de inercia
Zx = b*h^2/6 // Módulo de sección
# Cargas
wpp = gmad*A -> kgf/m // Peso propio
wd = wD*sv + wpp -> kgf/m // Carga muerta por vigueta
wl = wL*sv -> kgf/m // Carga viva por vigueta
w = wd + wl // Carga total de servicio
# Flexión (E.010 Art. 19.1)
M = w*Lv^2/8 -> kgf*m // Momento máximo
sigma = M/Zx -> kgf/cm^2 // Esfuerzo de flexión
check sigma <= fm // Esfuerzo de flexión admisible (E.010 Art. 19.1)
# Corte (E.010 Art. 19.2 b — a una distancia h del apoyo)
V = w*(Lv/2 - h) -> kgf // Cortante a la distancia h
tau = 1.5*V/A -> kgf/cm^2 // τ = 1.5 V/(b h)
check tau <= fv // Esfuerzo de corte admisible (E.010 Art. 19.2)
# Aplastamiento en el apoyo (E.010 Art. 19.3)
R = w*Lv/2 -> kgf // Reacción
sap = R/(b*apoyo) -> kgf/cm^2 // Compresión perpendicular a las fibras
check sap <= fcp // Aplastamiento (E.010 Art. 19.3)
# Deflexión (E.010 Art. 18)
weq = 1.8*wd + wl // Carga equivalente: deformación diferida +80 % de la carga permanente (Art. 18.3)
delta = 5*weq*Lv^4/(384*E*Ix) -> cm // Deflexión máxima
dadm = Lv/lim -> cm // Deflexión admisible (CM + CV)
check delta <= dadm // Deflexión con carga permanente + viva (Art. 18.2 a)
deltaL = 5*wl*Lv^4/(384*E*Ix) -> cm // Deflexión por carga viva sola
check deltaL <= min(Lv/350, 1.3 cm) // Deflexión por carga viva ≤ L/350 y ≤ 13 mm (Art. 18.2 b)
# Estabilidad lateral (E.010 Art. 20)
rhb = h/b // Relación peralte/ancho
check rhb <= 5 // h/b ≤ 5 (máxima relación con arriostre normado: entablado continuo, Art. 20.2 d)
"Con $h/b$ = {rhb}: h/b ≤ 3 restringe el desplazamiento lateral de los apoyos; h/b ≤ 4 exige además arriostrar el borde comprimido con correas o viguetas a ≤ 60 cm; h/b ≤ 5, con entablado continuo (E.010 Art. 20.2).`),
      summary(),
    ],
  },
  // ===================================================================
  //  6) COLUMNA DE MADERA — E.010 / JUNAC (flexocompresión)
  // ===================================================================
  {
    id: 'ma-colmadera', pais: 'PE', cat: 'Madera y tierra', icon: 'column',
    name: 'Columna de madera (E.010 / JUNAC)', normas: 'RNE — NTE E.010 Madera (texto vigente 2021; antes DS 005-2014); Manual de Diseño para Maderas del Grupo Andino (JUNAC, Cap. 9)',
    desc: 'Columna rectangular: esbeltez λ = lef/d, Ck = 0.7025√(E/fc), carga admisible (corta, intermedia, larga) y flexocompresión N/Nadm + km M/(Z fm) < 1.',
    titulo: 'Diseño de columna de madera a flexocompresión — NTE E.010',
    validacion: {
      fuente: 'Manual de Diseño para Maderas del Grupo Andino (JUNAC), Tabla 9.2, y NTE E.010 Tablas 3, 4 y 8 — grupo B',
      nota: 'Ck, fc y Emin del grupo B son valores publicados. Nadm es un valor de control (columna larga, 0.329 Emin A/λ² con λ = 2.60/0.14), no publicado.',
      valores: [
        { var: 'Ck', esperado: 18.34, tol: 0.001, desc: 'Esbeltez límite Ck grupo B (JUNAC Tabla 9.2)' },
        { var: 'fc', unidad: 'kgf/cm^2', esperado: 110, tol: 0.001, desc: 'Compresión paralela admisible, grupo B' },
        { var: 'Emin', unidad: 'kgf/cm^2', esperado: 75000, tol: 0.001, desc: 'Emin grupo B' },
        { var: 'Nadm', unidad: 'tonf', esperado: 14.02, tol: 0.002, desc: 'Control: 0.329·75 000·196/18.57² (columna larga)' },
      ],
    },
    blocks: [
      text(`# Generalidades
Columna de madera de sección rectangular maciza sometida a carga axial y momento (carga lateral de viento o excentricidad), diseñada por esfuerzos admisibles según la NTE E.010 y el Manual JUNAC (Cap. 9). Las columnas se clasifican por su esbeltez $\\lambda = l_{ef}/d$ en **cortas** ($\\lambda < 10$), **intermedias** ($10 \\le \\lambda \\le C_k$) y **largas** ($C_k < \\lambda \\le 50$); en flexocompresión se usa $E_{min}$.`),
      calc(`# Datos
grupo = 2 // Grupo estructural ${GRUPO}
b = 14 cm // Ancho real (sección comercial 6" × 6") [6.5..30]
d = 14 cm // Dimensión en la dirección del pandeo y de la flexión [6.5..30]
lc = 2.60 m // Longitud no arriostrada [1.50 m..4.50 m]
k = 1.0 // Factor de longitud efectiva (E.010 Art. 26 / JUNAC Tabla 9.1) [1.0 : Articulada–articulada|1.2 : Empotrada–articulada con desplazamiento|2.0 : Voladizo|0.65 : Empotrada–empotrada]
Nd = 6.0 tonf // Carga axial de servicio [0.5..30]
Md = 0.15 tonf*m // Momento de servicio [0..2]
# Propiedades (E.010 Tablas 3 y 4)
Emin = EminE010(grupo) // Módulo de elasticidad mínimo
fc = fcE010(grupo) // Compresión paralela admisible
fm = fmE010(grupo) // Flexión admisible
A = b*d // Área
Ix = b*d^3/12 // Inercia
Zx = b*d^2/6 // Módulo de sección
# Esbeltez y carga admisible (E.010 Art. 27 y 30)
lef = k*lc // Longitud efectiva
lambda = lef/d // Esbeltez λ
check lambda <= 50 // Esbeltez máxima λ ≤ 50 (E.010 Art. 27)
Ck = CkE010(Emin, fc) // Esbeltez límite Ck = 0.7025 √(Emin/fc)
"Columna {si(lambda < 10, 1, si(lambda <= Ck, 2, 3))} (1 = corta, 2 = intermedia, 3 = larga).
Nadm = NadmE010(fc, Emin, A, lambda, Ck) -> tonf // Carga admisible
check Nd <= Nadm // Compresión (E.010 Art. 30)
# Flexocompresión (E.010 Art. 31)
Ncr = pi^2*Emin*Ix/lef^2 -> tonf // Carga crítica de Euler
check Nd < Ncr/1.5 // Estabilidad: N < Ncr/1.5 para que km sea finito (E.010 Art. 31.2)
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
    name: 'Tijeral de madera (E.010 / JUNAC)', normas: 'RNE — NTE E.010 Madera (texto vigente 2021; antes DS 005-2014), E.020; Manual JUNAC (Cap. 11 Armaduras)',
    desc: 'Armadura Howe/Pratt a dos aguas: cargas por nudo, análisis por rigidez, diseño de cuerda superior a flexocompresión, cuerda inferior a tracción y diagonales a compresión.',
    titulo: 'Diseño de tijeral de madera para cobertura liviana',
    blocks: [
      text(`# Generalidades
Tijeral de madera a dos aguas para cobertura liviana (teja andina de fibrocemento sobre correas), con cielo raso colgado de la cuerda inferior. La armadura se analiza con nudos articulados y cargas aplicadas en los nudos (JUNAC Cap. 11); la cuerda superior se verifica además a flexocompresión por la carga repartida de las correas entre nudos, y la longitud efectiva en el plano se toma como 0.9 veces la longitud entre nudos (E.010 Art. 43.2; el Manual JUNAC admitía 0.8 l).`),
      calc(`# Datos
grupo = 2 // Grupo estructural ${GRUPO}
Lt = 8.00 m // Luz del tijeral [4.00 m..15.00 m]
Ht = 2.00 m // Altura en la cumbrera [0.80 m..4.00 m]
np = 6 // Número de paneles [4..12]
st = 1.00 m // Separación entre tijerales [0.60 m..1.50 m]
wcob = 30 kgf/m^2 // Cobertura y correas (por m² en proyección horizontal) [10..100]
wcr = 30 kgf/m^2 // Cielo raso [10..50]
wsc = 50 kgf/m^2 // Sobrecarga de techo inclinado (E.020 Art. 7.1: ≥ 50 kg/m²) [30..100]
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
b1 = 4 cm // Ancho (sección comercial 2" × 4") [4..9]
d1 = 9 cm // Peralte (en el plano del tijeral) [6.5..19]
A1 = b1*d1
Z1 = b1*d1^2/6
lef1 = 0.9*Lcs // Longitud efectiva en el plano: 0.9 l (E.010 Art. 43.2)
lambda1 = lef1/d1 // Esbeltez en el plano
lc1 = 0.55 m // Separación de correas (arriostre fuera del plano) [0.30 m..1.20 m]
lambda1b = lc1/b1 // Esbeltez fuera del plano (correas como arriostre, Art. 43.1)
check max(lambda1, lambda1b) <= 50 // Esbeltez máxima en compresión (Art. 43.5)
check lambda1b <= lambda1 // Separación de correas: esbeltez fuera del plano ≤ en el plano (Art. 43.4)
Nadm1 = min(NadmE010(fc, Emin, A1, lambda1, Ck), NadmE010(fc, Emin, A1, lambda1b, Ck)) -> tonf // Carga admisible
w1 = (wcob + wsc)*st -> kgf/m // Carga repartida de las correas
M1 = w1*(Lpan)^2/10 -> kgf*m // Momento entre nudos (cuerda continua)
Ncr1 = pi^2*Emin*b1*d1^3/12/lef1^2 -> tonf
km1 = kmE010(Ncs, Ncr1)
ic1 = Ncs/Nadm1 + km1*M1/(Z1*fm) // Interacción
check ic1 < 1 // Flexocompresión de la cuerda superior (E.010 Art. 31 y 41.6)
# Cuerda inferior — tracción (JUNAC 11.4)
b2 = 4 cm // Ancho [4..9]
d2 = 9 cm // Sección 2" × 4" [6.5..19]
An2 = 0.85*b2*d2 // Área neta (descuento por perforaciones de pernos)
check Nti/An2 <= ft // Tracción en la cuerda inferior (E.010 Art. 23)
check Lpan/b2 <= 80 // Esbeltez máxima en tracción (lef/b ≤ 80, Art. 43.5)
# Diagonales y montantes — compresión
b3 = 4 cm // Ancho [4..9]
d3 = 6.5 cm // Sección 2" × 3" [6.5..14]
lambda3 = max(0.9*Ldc/d3, Ldc/b3) // Esbeltez: en el plano 0.9 l/d; fuera del plano l/b (sin arriostre intermedio)
check lambda3 <= 50 // Esbeltez máxima de la diagonal (Art. 43.5)
Nadm3 = NadmE010(fc, Emin, b3*d3, lambda3, Ck) -> tonf
check Ndc <= Nadm3 // Compresión en la diagonal más cargada (E.010 Art. 30 y 43)
check Ndt/(0.85*b3*d3) <= ft // Tracción en montantes y diagonales
# Deflexión y contraflecha (E.010 Art. 42)
"Deflexión admisible de armaduras igual a la de elementos en flexión (Art. 42.2: L/300 con cielo raso de yeso, incluyendo la deformación de los nudos); armaduras de más de 8 m llevan contraflecha mínima L/300 = {Lt/300 -> cm} (Art. 42.3).`),
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
    validacion: {
      fuente: 'Valores de control (ACI 350.3-06 Ec. 9-15, 9-16, 9-17 y 9-28 a 9-30)',
      nota: 'No reproduce un ejemplo publicado: valores de control calculados a mano con las ecuaciones de Housner para D = 9 m y HL = 4 m (D/HL = 2.25).',
      valores: [
        { var: 'Wi/WL', esperado: 0.4928, tol: 0.001, desc: 'Control: Wi/WL = tanh(0.866 D/HL)/(0.866 D/HL)' },
        { var: 'hi', unidad: 'm', esperado: 1.50, tol: 0.001, desc: 'Control: hi = 0.375 HL (D/HL ≥ 1.333)' },
        { var: 'Tc', unidad: 's', esperado: 3.259, tol: 0.002, desc: 'Control: Tc = 2π√(D/(3.68 g tanh(3.68 HL/D)))' },
      ],
    },
    blocks: [
      text(`# Generalidades
Reservorio cilíndrico apoyado de concreto armado, con pared empotrada en la losa de fondo y cubierta de losa maciza. El análisis hidrostático usa la solución de la **cáscara cilíndrica** (Timoshenko, ν = 0.2), equivalente a las Tablas A-1, A-2 y A-12 del PCA *Circular Concrete Tanks without Prestressing*; el refuerzo se dimensiona por resistencia con el **factor de durabilidad ambiental** $S_d = \\phi f_y/(\\gamma f_s)$ de ACI 350-06 (9.2.6), o —a elección— con los coeficientes sanitarios del PCA/ACI 350R-89 (1.7 × 1.65 en tracción anular y 1.7 × 1.30 en flexión), que dan resultados similares. El análisis sísmico sigue **ACI 350.3-06** (modelo de Housner) con el espectro de la NTE E.030 ($S_{DS} = 2.5ZS$, $T_S = T_P$). Si el oleaje $d_{max}$ supera el borde libre, la cubierta restringe la masa convectiva: se trata como impulsiva (Malhotra, 2005) y se verifica el anclaje de la cubierta al empuje ascendente.`),
      calc(`# Datos
D = 9.00 m // Diámetro interior [3.00 m..30.00 m]
HL = 4.00 m // Altura de agua (nivel de rebose) [2.00 m..10.00 m]
Hw = 4.60 m // Altura de la pared [2.50 m..11.00 m]
tw = 0.30 m // Espesor de la pared [0.20 m..0.60 m]
er = 0.15 m // Espesor de la losa de cubierta [0.10 m..0.25 m]
gw = 1.0 tonf/m^3 // Peso específico del agua [1.0..1.1]
gc = 2.4 tonf/m^3 // Peso específico del concreto [2.3..2.5]
fc = 280 kgf/cm^2 // Resistencia del concreto (ACI 350: ≥ 4000 psi) [280..420]
fy = 4200 kgf/cm^2 // Acero de refuerzo [2800..4200]
rec = 5 cm // Recubrimiento (ACI 350 7.7.1: 2 in) [5..7.5]
Vol = pi*D^2/4*HL -> m^3 // Capacidad útil
check tw >= si(Hw >= 3.05 m, 30 cm, 20 cm) // Espesor mínimo: 12 in en muros de 10 ft o más en contacto con líquido (ACI 350-06 14.6.2)
# Factores de diseño por durabilidad (ACI 350-06 9.2.6)
metodo = 2 // Factores de diseño del refuerzo [1 : PCA / ACI 350R-89 (1.7 × 1.65 tracción, 1.7 × 1.30 flexión)|2 : ACI 350-06 (1.4 F × Sd)]
fsh = 1400 kgf/cm^2 // fs admisible en tracción anular, exposición normal: 20 ksi (severa: 17 ksi = 1200 kgf/cm²) (9.2.6.3) [1200..1400]
barv = 5 // Varilla vertical [4 : 1/2"|5 : 5/8"|6 : 3/4"]
sv = 20 cm // Espaciamiento del refuerzo vertical en la cara interior [10..30]
fsf = min(320 ksi/(si(tw >= 40.6 cm, 1.2, 1.35)*sqrt((sv/(1 inch))^2 + 4*(2 + db(barv)/(2 inch))^2)), 36 ksi) -> kgf/cm^2 // fs en flexión, exposición normal (ACI 350-06 Ec. 10-4, recubrimiento 2 in)
Sdh = max(0.9*fy/(1.4*fsh), 1) // Sd en tracción anular, γ = 1.4 (U = 1.4 F)
Sdf = max(0.9*fy/(1.4*fsf), 1) // Sd en flexión
fach = si(metodo == 1, 1.7*1.65, 1.4*Sdh) // Factor total en tracción anular
facf = si(metodo == 1, 1.7*1.30, 1.4*Sdf) // Factor total en flexión
fsv = 1700 kgf/cm^2 // fs en el refuerzo de corte: 24 ksi (9.2.6.4)
Sdv = max(0.75*fy/(1.4*fsv), 1) // Sd en cortante (φ = 0.75); aplicado también a Vc (conservador)
facv = si(metodo == 1, 1.7, 1.4*Sdv) // Factor total en cortante
# Análisis hidrostático de la pared (PCA)`),
      { type: 'cilindro', H: 'HL', D: 'D', t: 'tw', w: 'gw', base: 'empotrada', titulo: '' },
      calc(`## Refuerzo anular (horizontal)
Tu = fach*Tmax -> tonf/m // Tracción anular última (factor de carga × durabilidad)
Ashreq = Tu/(0.9*fy) -> cm^2/m // Acero anular total requerido
Astemp = 0.005*tw*1 m/m -> cm^2/m // Mínimo por contracción y temperatura (ACI 350 Tabla 7.12.2.1)
barh = 5 // Varilla anular (dos caras) [4 : 1/2"|5 : 5/8"|6 : 3/4"]
sh = 20 cm // Espaciamiento en cada cara [10..30]
Ash = 2*Ab(barh)/sh -> cm^2/m // Acero anular colocado (dos caras)
check Ash >= Ashreq // Refuerzo anular por tracción (ACI 350-06 9.2.6; PCA)
check Ash >= Astemp // Refuerzo mínimo por contracción y temperatura (ACI 350-06 Tabla 7.12.2.1)
check sh <= 30 cm // Espaciamiento máximo 12 in (ACI 350 7.6.5)
## Esfuerzo de tracción en el concreto (PCA)
Csh = 0.0003 // Coeficiente de contracción del concreto [0.0002..0.0004]
Es = 2.0e6 kgf/cm^2
Ec = 15000*sqrtfc(fc) // Módulo de elasticidad del concreto (E.060 8.5)
nr = Es/Ec // Relación modular
fct = (Csh*Es*Ash*1 m + Tmax*1 m)/(tw*1 m + nr*Ash*1 m) -> kgf/cm^2 // fc = (C Es As + T)/(Ac + n As)
check fct <= 0.1*fc // Tracción en el concreto ≤ 0.1 f'c (PCA)
## Refuerzo vertical — momento en la base
Mu = facf*Mbase -> tonf*m/m // Momento último (factor de carga × durabilidad)
dv = tw - rec - db(barv)/2 // Peralte efectivo
Rn = Mu*1 m/(0.9*100 cm*dv^2) -> kgf/cm^2
rho = 0.85*fc/fy*(1 - sqrt(max(0, 1 - 2*Rn/(0.85*fc))))
check rho <= 0.75*0.85*0.85*fc/fy*6000 kgf/cm^2/(6000 kgf/cm^2 + fy) // Sección suficiente: ρ ≤ 0.75 ρb
Asvreq = max(rho*100 cm*dv, 14 kgf/cm^2/fy*100 cm*dv)/(1 m) -> cm^2/m // Acero requerido (mínimo 200 b d/fy, ACI 350 10.5.1)
Asv = Ab(barv)/sv -> cm^2/m // Acero vertical colocado (cara interior)
check Asv >= Asvreq // Refuerzo vertical en la base (cara interior)
check 2*Asv/tw >= 0.003 // Cuantía vertical mínima 0.3 %, dos caras (ACI 350 14.3.2)
## Cortante en la base
Vu = facv*Vbase -> tonf/m // Cortante último
phiVc = 0.75*0.53*sqrtfc(fc)*100 cm*dv/(1 m) -> tonf/m // φVc (ACI 350 11.3, φ = 0.75)
check Vu <= phiVc // Cortante en la unión pared–losa de fondo (ACI 350-06 11.3, φ = 0.75)
# Análisis sísmico (ACI 350.3-06 con espectro E.030)
Z = 0.45 // Factor de zona ${ZONA} [0.10..0.45]
S = 1.05 // Factor de suelo ${SUELO} [0.80..2.00]
Tp = 0.6 s // Periodo TP ${TP} [0.3 s..1.0 s]
I = 1.5 // Importancia: ACI 350.3 Tabla 4.1.1(a) da 1.25 (línea vital); se adopta U = 1.5 (reservorios: categoría A2, E.030 Tabla N° 7 y Art. 7.3) [1.0|1.25|1.5] [1.0..1.5]
Ri = 2.0 // Factor de modificación impulsivo: base empotrada, sobre el terreno (ACI 350.3 Tabla 4.1.1(b)) [1.5..3.25]
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
epsilon = epsACIc(rD) // Coeficiente de masa efectiva (Ec. 9-45)
Ww = gc*pi*(D + tw)*tw*Hw -> tonf // Peso de la pared
Wr = gc*pi*(D + 2*tw)^2/4*er -> tonf // Peso de la cubierta
## Periodos y coeficientes sísmicos (ACI 350.3 Sec. 9.3.4 y 9.4)
Ti = TiACIc(HL, D, tw, Ec, gc) -> s // Periodo impulsivo (Ec. 9-23 a 9-25)
Tc = TcACIc(D, HL) // Periodo convectivo (Ec. 9-28 a 9-30)
Tv = TvACIc(D, HL, tw, Ec, gw) -> s // Periodo de la vibración vertical del líquido (Ec. 9-31)
Ci = CiACI(Ti, SDS, SD1) // Coeficiente impulsivo (Ec. 9-32/33)
Cc = CcACI(Tc, SDS, SD1) // Coeficiente convectivo (Ec. 9-37/38)
Ct = CtACI(Tv, SDS, SD1) // Coeficiente vertical (Ec. 9-39/40)
## Oleaje y borde libre (ACI 350.3 Cap. 7)
dmax = D/2*Cc*I -> m // Altura máxima de oleaje (Ec. 7-2)
fbl = Hw - HL // Borde libre disponible (hasta el fondo de la cubierta)
Wcr = si(dmax > fbl, Wc, 0 tonf) // Masa convectiva restringida por la cubierta (se suma a la impulsiva)
"Borde libre {fbl} frente a un oleaje de {dmax} (ACI 350.3 7.1). Si $d_{max} > f_{bl}$, la ola alcanza la cubierta: toda la masa convectiva se considera impulsiva ($W_{cr} = W_c$, cota superior del método de Malhotra, 2005; ACI 350.3 R7.1) y se verifica el anclaje de la cubierta; en caso contrario, $W_{cr} = 0$.
## Fuerzas y momentos sísmicos (ACI 350.3 Cap. 4)
Pw = Ci*I*epsilon*Ww/Ri // Fuerza inercial de la pared (Ec. 4-1)
Pr = Ci*I*Wr/Ri // Fuerza inercial de la cubierta (Ec. 4-2)
P_i = Ci*I*(Wi + Wcr)/Ri // Fuerza impulsiva (Ec. 4-3), incluye la masa convectiva restringida
Pc = Cc*I*(Wc - Wcr)/Rc // Fuerza convectiva (Ec. 4-4)
Vs = sqrt((P_i + Pw + Pr)^2 + Pc^2) -> tonf // Cortante basal (Ec. 4-5)
hw = Hw/2
hr = Hw + er/2
hie = (Wi*hi + Wcr*hc)/(Wi + Wcr) -> m // Altura de la masa impulsiva equivalente (EBP)
hiep = (Wi*hip + Wcr*hcp)/(Wi + Wcr) -> m // Ídem con presión en el fondo (IBP)
Mb = sqrt((P_i*hie + Pw*hw + Pr*hr)^2 + (Pc*hc)^2) -> tonf*m // Momento en la base de la pared (Ec. 4-10)
Mo = sqrt((P_i*hiep + Pw*hw + Pr*hr)^2 + (Pc*hcp)^2) -> tonf*m // Momento de volteo (Ec. 4-13)`),
      { type: 'tanque', forma: 'circular', tipo: 'apoyado', D: 'D', HL: 'HL', Hw: 'Hw', tw: 'tw', Pi: 'P_i', Pc: 'Pc', dmax: 'dmax', cubierta: 'sí', titulo: '' },
      calc(`## Tensión anular sísmica (ACI 350.3 Cap. 5 y 6.2)
yb = HL - yTmax // Nivel de la tensión anular hidrostática máxima, desde la base
P_iy = P_i/2*(4*HL - 6*hie - (6*HL - 12*hie)*yb/HL)/HL^2 -> tonf/m // Fuerza impulsiva por unidad de altura (R5.3.3, media circunferencia)
Pcy = Pc/2*(4*HL - 6*hc - (6*HL - 12*hc)*yb/HL)/HL^2 -> tonf/m // Fuerza convectiva por unidad de altura (R5.3.3)
Pwy = Pw/Hw -> tonf/m // Inercia de la pared por unidad de altura (uniforme; conservador)
uv = max(Ct*I*(2/3)/Ri, 0.2*SDS) // Aceleración vertical üv = Ct I b/Ri ≥ 0.2 SDS, b = 2/3 (Ec. 4-15)
Niy = 2*P_iy/pi // Tensión anular impulsiva: piy = 2Piy cosθ/(πr) → N = p r (R6.2)
Ncy = 16*Pcy/(9*pi) // Tensión anular convectiva: pcy = 16 Pcy cosθ/(9πr) (R6.2)
Nwy = Pwy/pi // Tensión anular por inercia de la pared (R6.2)
Nhy = uv*gw*yTmax*D/2 -> tonf/m // Tensión por aceleración vertical Nhy = üv qhy r (R6.2)
Ny = sqrt((Niy + Nwy)^2 + Ncy^2 + Nhy^2) -> tonf/m // Tensión anular hidrodinámica combinada (Ec. 6-1)
Tus = fach/1.4*(1.2*Tmax + 1.0*Ny) -> tonf/m // U = 1.2 F + 1.0 E (ACI 350-06 9.2.1) con el factor de durabilidad (conservador)
check Tus <= 0.9*fy*Ash // Refuerzo anular con sismo (ACI 350.3-06 Ec. 6-1; ACI 350-06 9.2.1)
## Transferencia del cortante sísmico en la unión pared–losa de fondo
qv = Vs/(pi*(D + tw)/2) -> tonf/m // Flujo de corte tangencial máximo q = V/(π R)
Avf = 2*Asv // Refuerzo vertical que atraviesa la junta (dos caras)
phiVn = 0.75*1.0*Avf*fy -> tonf/m // Corte-fricción φ μ Avf fy, μ = 1.0 (junta rugosa, E.060 11.7)
check qv <= phiVn // Corte-fricción en la base de la pared (ACI 350.3-06 3.3.2 y R3.3.2; E.060 11.7)
## Anclaje de la cubierta frente al oleaje
pup = gw*max(dmax - fbl, 0 m) -> tonf/m^2 // Presión ascendente estimada: columna de la ola no acomodada (estimación simplificada)
qup = pup*D/4 - 0.9*gc*er*D/4 -> tonf/m // Tracción por metro en la unión cubierta–pared (placa circular: q = pR/2), descontando 0.9 del peso propio
phiTa = 0.9*Asv*fy -> tonf/m // Resistencia de los anclajes verticales de la cara interior (φ = 0.9)
check qup <= phiTa // Anclaje de la cubierta al empuje del oleaje (ACI 350.3 R7.1)`),
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
Li = 4.00 m // Longitud interior [1.50 m..10.00 m]
Bi = 3.00 m // Ancho interior [1.50 m..10.00 m]
Hc = 2.50 m // Altura libre interior [1.50 m..4.50 m]
HL = 2.20 m // Altura máxima de agua [1.00 m..4.00 m]
tw = 0.20 m // Espesor de las paredes [0.15 m..0.40 m]
tf = 0.25 m // Espesor de la losa de fondo [0.20 m..0.50 m]
tt = 0.15 m // Espesor de la losa de techo [0.12 m..0.25 m]
gw = 1.0 tonf/m^3 // Peso específico del agua [1.0..1.1]
gs = 1.8 tonf/m^3 // Peso unitario del relleno [1.4..2.1]
phis = 30 deg // Ángulo de fricción del relleno [20..40]
ws = 0.50 tonf/m^2 // Sobrecarga sobre el terreno [0..2]
fc = 280 kgf/cm^2 // Resistencia del concreto [210..420]
fy = 4200 kgf/cm^2 // Acero de refuerzo [2800..4200]
rec = 5 cm // Recubrimiento [4..7.5]
qadm = 1.5 kgf/cm^2 // Capacidad admisible del suelo [0.5..4.0]
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
fs = 1.3*1.7 // Factor total en flexión: PCA 1.7 × 1.30 (≈ ACI 350-06: 1.4 × Sd ≈ 1.4 × 1.5)
As(Mx) = 0.85*fc/fy*(1 - sqrt(max(0, 1 - 2*(fs*Mx*1 m/(0.9*100 cm*d^2))/(0.85*fc))))*100 cm*d/(1 m) // Acero requerido para un momento por metro
rhomax = 0.75*0.85*0.85*fc/fy*6000 kgf/cm^2/(6000 kgf/cm^2 + fy) // Cuantía máxima 0.75 ρb (β1 = 0.85)
## Refuerzo vertical
Mvi = max(MyNa, MyPs) -> tonf*m/m // Cara interior: base con agua / tramo con suelo
Mve = max(MyPa, MyNs) -> tonf*m/m // Cara exterior: tramo con agua / base con suelo
@modo corto
Asvi = As(Mvi) -> cm^2/m // Acero vertical requerido, cara interior
Asve = As(Mve) -> cm^2/m // Acero vertical requerido, cara exterior
@modo completo
Asmin = 0.0015*tw*1 m/m -> cm^2/m // Mínimo por cara: 0.003 tw/2 (ACI 350 Tabla 7.12.2.1, L < 6 m entre juntas)
s = 20 cm // Espaciamiento [10..30]
Asp = Ab(bar)/s -> cm^2/m // Acero colocado por cara
check Asp >= max(Asvi, Asmin) // Refuerzo vertical, cara interior
check Asp >= max(Asve, Asmin) // Refuerzo vertical, cara exterior
## Refuerzo horizontal
Mhi = max(MxNa, MxNc, MxPs) -> tonf*m/m // Cara interior: esquinas con agua / tramo con suelo
Mhe = max(MxPa, MxPc, MxNs) -> tonf*m/m // Cara exterior: tramo con agua / esquinas con suelo
@modo corto
Ashi = As(Mhi) -> cm^2/m // Acero horizontal requerido, cara interior
Ashe = As(Mhe) -> cm^2/m // Acero horizontal requerido, cara exterior
@modo completo
Asmax = rhomax*100 cm*d/(1 m) -> cm^2/m // Acero máximo por metro: ρ ≤ 0.75 ρb
check max(Asvi, Asve, Ashi, Ashe) <= Asmax // Espesor de pared suficiente: ρ ≤ 0.75 ρb
check Asp >= max(Ashi, Asmin) // Refuerzo horizontal, cara interior
check Asp >= max(Ashe, Asmin) // Refuerzo horizontal, cara exterior
## Cortante en la base de la pared
Vu = 1.7*max(Vba, Vbs) -> tonf/m
phiVc = 0.75*0.53*sqrtfc(fc)*100 cm*d/(1 m) -> tonf/m // φVc (φ = 0.75)
check Vu <= phiVc // Cortante en la unión con la losa de fondo (ACI 350-06 11.3, φ = 0.75)
# Losa de techo (placa articulada en sus cuatro bordes)
wt = 2.4 tonf/m^3*tt + 0.10 tonf/m^2 -> tonf/m^2 // Peso propio + acabados
wlt = 0.25 tonf/m^2 // Sobrecarga del techo (E.020) [0.10..0.50]
wu = 1.4*wt + 1.7*wlt -> tonf/m^2 // Carga última (E.060 9.2)`),
      { type: 'tankwall', a: 'Li + tw', b: 'Bi + tw', inf: 'articulado', sup: 'articulado', lat: 'articulado', qb: 'wu', qs: 'wu', hq: '', nu: '0.2', ndiv: '20', sufijo: 't', titulo: 'Losa de techo con carga última uniforme (momentos en la luz menor = My)' },
      calc(`dt = tt - 3 cm // Peralte efectivo de la losa de techo
Ast = (0.85*fc/fy*(1 - sqrt(max(0, 1 - 2*(MyPt*1 m/(0.9*100 cm*dt^2))/(0.85*fc))))*100 cm*dt)/(1 m) -> cm^2/m // Ya incluye factores de carga
Astmax = rhomax*100 cm*dt/(1 m) -> cm^2/m // Acero máximo por metro: ρ ≤ 0.75 ρb
check Ast <= Astmax // Espesor de la losa de techo suficiente
Asmt = 0.0018*tt*1 m/m -> cm^2/m // Mínimo por temperatura (E.060 9.7.2)
Astc = Ab(3)/(20 cm) -> cm^2/m // φ 3/8" @ 20 cm en ambas direcciones
check Astc >= max(Ast, Asmt) // Refuerzo de la losa de techo
# Presión sobre el suelo (tanque lleno)
Bt = Bi + 2*tw // Ancho exterior
Lt = Li + 2*tw // Largo exterior
Wcon = 2.4 tonf/m^3*(Lt*Bt*(tf + tt) + 2*(Lt + Bi)*tw*Hc) -> tonf // Peso del concreto: losas de fondo y de techo y paredes
Wag = gw*Vol -> tonf // Peso del agua
Wsc = (wlt + 0.10 tonf/m^2)*Lt*Bt -> tonf // Sobrecarga y acabados del techo
Wtot = Wcon + Wag + Wsc // Peso total
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
    name: 'Tanque elevado de fuste (Housner / ACI 350.3 + E.030)', normas: 'ACI 350.3-06, ACI 350-06, ACI 371R; RNE E.030 (2018, mod. 2026), E.060',
    desc: 'Tanque elevado de 85 m³ sobre fuste cilíndrico: modelo de dos masas (impulsiva + estructura y convectiva), periodos, espectro E.030, fuerzas, momento de volteo, oleaje y resistencia del fuste.',
    titulo: 'Análisis sísmico y diseño del fuste de tanque elevado de concreto armado — 85 m³',
    blocks: [
      text(`# Generalidades
Tanque elevado con cuba cilíndrica de concreto armado sobre un **fuste cilíndrico** hueco empotrado en la cimentación. El análisis sísmico emplea el modelo de **dos masas de Housner** (ACI 350.3-06 Sec. 9.7 y R9.7): la masa impulsiva del agua se suma a la de la cuba y a una fracción de la del fuste, y oscila con la rigidez lateral del soporte; la masa convectiva oscila con su propio periodo largo. Las aceleraciones se obtienen del espectro de la NTE E.030 con $R_i = 2.0$ (tanque sobre pedestal) y $R_c = 1.0$; la ordenada convectiva se amplifica por 1.5 para pasar de 5 % a 0.5 % de amortiguamiento (ACI 350.3 R9.4.2). Ambas respuestas se combinan por SRSS (Ec. 4-5). Si el oleaje supera el borde libre, la masa convectiva restringida por la cubierta se suma a la impulsiva (Malhotra, 2005).`),
      calc(`# Datos
D = 6.00 m // Diámetro interior de la cuba [3.00 m..15.00 m]
HL = 3.00 m // Altura de agua [2.00 m..8.00 m]
Hw = 3.60 m // Altura de la pared de la cuba [2.50 m..9.00 m]
tw = 0.30 m // Espesor de la pared de la cuba [0.20 m..0.50 m]
tb = 0.25 m // Espesor de la losa de fondo [0.20 m..0.50 m]
er = 0.12 m // Espesor de la losa de cubierta [0.10 m..0.20 m]
Hf = 12.0 m // Altura del fuste (cimentación a fondo de cuba) [5.00 m..30.00 m]
De = 3.50 m // Diámetro exterior del fuste [2.00 m..8.00 m]
tf = 0.25 m // Espesor del fuste [0.20 m..0.50 m]
gw = 1.0 tonf/m^3 // Peso específico del agua [1.0..1.1]
gc = 2.4 tonf/m^3 // Peso específico del concreto [2.3..2.5]
fc = 280 kgf/cm^2 // Resistencia del concreto (ACI 350: ≥ 4000 psi) [280..420]
fy = 4200 kgf/cm^2 // Acero de refuerzo [2800..4200]
Z = 0.45 // Factor de zona ${ZONA} [0.10..0.45]
U = 1.5 // Factor de uso: reservorio de agua, categoría A2 (E.030 Tabla N° 7; Art. 7.3) [1.0..1.5]
S = 1.05 // Factor de suelo ${SUELO} [0.80..2.00]
Tp = 0.6 s // ${TP} [0.3 s..1.0 s]
Tl = 2.0 s // ${TL} [1.6 s..3.0 s]
Ri = 2.0 // Tanque sobre pedestal (ACI 350.3 Tabla 4.1.1(b)) [1.5..3.0]
Rc = 1.0
grav = 9.81 m/s^2
check tw >= si(Hw >= 3.05 m, 30 cm, 20 cm) // Espesor mínimo de la pared en contacto con líquido (ACI 350-06 14.6.2)
check tf >= 20 cm // Espesor mínimo del fuste: 20 cm (criterio de esta memoria; ACI 371R recomienda 8 in para pedestales)
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
Tc = TcACIc(D, HL) // Periodo convectivo (Ec. 9-28 a 9-30)
Sac = 1.5*Z*U*CE030(Tc, Tp, Tl)*S/Rc // Aceleración convectiva (0.5 % de amortiguamiento, ACI 350.3 R9.4.2)
dmax = D/2*Sac*Rc -> m // Altura de oleaje (ACI 350.3 Ec. 7-2: dmax = (D/2) Cc I)
fbl = Hw - HL // Borde libre
Wcr = si(dmax > fbl, Wc, 0 tonf) // Masa convectiva restringida por la cubierta (pasa a impulsiva)
Wst = Wi + Wcr + Wcuba + 0.25*Wfus // Peso impulsivo concentrado (masa equivalente del fuste ≈ 1/4)
Ti = 2*pi*sqrt(Wst/(grav*kf)) -> s // Periodo impulsivo (ACI 350.3 R9.7)
# Coeficientes sísmicos (E.030)
Sai = Z*U*CE030(Ti, Tp, Tl)*S/Ri // Aceleración impulsiva reducida
# Fuerzas y momentos
P_i = Sai*Wst // Fuerza impulsiva (agua + cuba + 1/4 fuste)
Pf = Sai*0.75*Wfus // Fuerza del resto del fuste (a media altura)
Pc = Sac*(Wc - Wcr) // Fuerza convectiva
hie = (Wi*hip + Wcr*hcp)/(Wi + Wcr) -> m // Altura de la masa líquida impulsiva sobre el fondo
Vs = sqrt((P_i + Pf)^2 + Pc^2) -> tonf // Cortante en la base del fuste (SRSS)
Mbase = sqrt((P_i*(Hf + tb + hie) + Pf*Hf/2)^2 + (Pc*(Hf + tb + hcp))^2) -> tonf*m // Momento de volteo (cuba como masa a Hf + tb + h, aproximación)
dlat = P_i/kf -> cm // Desplazamiento elástico de la cuba (impulsivo)
"Desplazamiento inelástico estimado $0.75 R_i \\delta$ = {0.75*Ri*dlat}; borde libre {fbl} frente a un oleaje de {dmax}. Si $d_{max} > f_{bl}$, la masa convectiva se considera impulsiva y la cubierta y su unión se diseñan para el empuje del oleaje (ACI 350.3 R7.1); en caso contrario, el oleaje no alcanza la cubierta.`),
      { type: 'tanque', forma: 'circular', tipo: 'elevado', D: 'D', HL: 'HL', Hw: 'Hw', tw: 'tw', Hf: 'Hf', Pi: 'P_i', Pc: 'Pc', dmax: 'dmax', titulo: '' },
      calc(`# Diseño del fuste (sección tubular delgada)
rm = (De - tf)/2 // Radio medio
Ag = pi*(De^2 - (De - 2*tf)^2)/4 // Área bruta
barf = 6 // Varilla vertical [5 : 5/8"|6 : 3/4"|8 : 1"]
sf = 10 cm // Espaciamiento en cada cara [10..30]
nbf = 2*floor(2*pi*rm/sf) // Número de varillas (dos capas)
Asf = nbf*Ab(barf) -> cm^2 // Acero vertical total
rhof = Asf/Ag // Cuantía
check rhof >= 0.0025 // Cuantía mínima de muros (E.060 11.10)
Pu = 0.9*(Wcuba + Wfus + WL) // Carga axial mínima concomitante (0.9 D)
Mu = Mbase // Momento último (sismo a nivel de resistencia)
thetaf = (Pu + Asf*fy)/(1.7*fc*tf*rm + 2*Asf*fy/pi) // Semiángulo comprimido θ (rad)
Mn = 1.7*fc*tf*rm^2*sin(thetaf) + 2*Asf*fy*rm*sin(thetaf)/pi -> tonf*m // Mn de anillo delgado (bloque plástico)
phif = max(0.70, min(0.90, 0.90 - 0.20*Pu/(0.1*fc*Ag))) // φ: 0.9 → 0.7 según Pu/(0.1 f'c Ag) (E.060 9.3.2.2)
check phif*Mn >= Mu // Flexocompresión del fuste (E.060 10.2 y 9.3.2.2; anillo plástico ≈ compatibilidad ±2 %)
Vuf = Vs // Cortante último
Acw = pi*rm*tf // Área efectiva de corte del tubo (A/2)
barh = 4 // Refuerzo horizontal (dos capas) [4 : 1/2"|5 : 5/8"]
shf = 20 cm // Espaciamiento vertical del refuerzo horizontal [10..30]
rhoh = 2*Ab(barh)/(shf*tf) // Cuantía horizontal
check rhoh >= 0.0025 // Cuantía horizontal mínima (E.060 11.10.7)
phiVf = 0.85*Acw*(0.53*sqrtfc(fc) + rhoh*fy) -> tonf // φVn = φ Acw (0.53√f'c + ρh fy) (E.060 11.10)
check Vuf <= phiVf // Cortante en el fuste (E.060 11.10)
sigma_gc = (1.25*(Wcuba + Wfus + WL))/Ag -> kgf/cm^2 // Compresión por gravedad
check sigma_gc <= 0.1*fc // Esfuerzo axial bajo: validez de la fórmula de anillo plástico (hipótesis de esta memoria)`),
      summary(),
    ],
  },
];
