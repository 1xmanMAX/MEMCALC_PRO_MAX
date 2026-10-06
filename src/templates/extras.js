// =====================================================================
//  Plantillas — módulo «extras» (cobertura complementaria para consultoras peruanas)
//   ex-escalera-2t   Escalera de dos tramos con descanso apoyada en vigas (E.060 / E.020 / A.010)
//   ex-piso-ind      Losa de piso industrial sobre terreno (ACI 360R-10 / PCA, Westergaard)
//   ex-pav-rigido    Pavimento rígido AASHTO 93 (MTC 2014 / CE.010)
//   ex-cim-maquina   Bloque de cimentación de máquina rotativa (ACI 351.3R, Richart–Hall–Woods)
//   ex-viga-acople   Viga de acoplamiento con refuerzo diagonal (ACI 318-19 18.10.7)
//   ex-diafragma     Losa como diafragma: cuerdas, colectores, cortante y rigidez
//   ex-pase-aereo    Pase aéreo de tubería: cable parabólico, péndolas, torres y cámaras de anclaje
//   ex-muro-anclado  Muro anclado con anclajes postensados (FHWA GEC-4 / PTI DC35.1)
//   ex-letrero       Panel publicitario monoposte con viento E.020 (AISC 360 / E.090)
//   ex-frp           Refuerzo a flexión de viga con FRP (ACI 440.2R-17, Ej. 16.3)
//   ex-pilote-fuste  Pilote vaciado in situ: diseño estructural del fuste (ACI 318-19 13.4, Matlock–Reese, P–M circular)
//   ex-encamisado    Reforzamiento de columna con encamisado de concreto armado (E.060, EC8-3 A.4.2.2)
// =====================================================================
import { calc, text, summary } from './_h.js';

const E060 = 'NTE E.060-2009 Concreto Armado';

// ---------------------------------------------------------------------
// 1) ESCALERA DE DOS TRAMOS CON DESCANSO
// ---------------------------------------------------------------------
const escalera2 = {
  id: 'ex-escalera-2t', pais: 'PE', cat: 'Concreto armado', icon: 'slab',
  normas: 'NTE E.020 (Tabla 1), ' + E060 + ' (Art. 9.2, 9.7, 10.5, 11), RNE A.010 (Art. 29)',
  name: 'Escalera de dos tramos con descanso (apoyada en vigas)',
  desc: 'Tramo inclinado + descanso como losa simplemente apoyada en vigas: metrado con peso de pasos, análisis con cargas distintas en cada tramo, momento máximo, refuerzo positivo y negativo, cortante y control del espesor.',
  titulo: 'Diseño de escalera de dos tramos con descanso',
  validacion: {
    fuente: 'Control: análisis de viga simplemente apoyada con dos cargas repartidas (equilibrio) y E.060',
    nota: 'Los datos por defecto no reproducen un ejemplo publicado: son valores de control. RA = [wu1·L1·(L2 + L1/2) + wu2·L2²/2]/(L1 + L2); Mmáx = RA²/(2·wu1) cuando el cortante nulo cae en el tramo inclinado; ambos se comparan con el análisis matricial (bloque de viga) en las pruebas.',
    valores: [
      { var: 'wu1', unidad: 'tonf/m', esperado: 1.4 * (2.4 * (0.15 / Math.cos(Math.atan(0.7)) + 0.0875) + 0.10) + 1.7 * 0.20, tol: 0.001, desc: 'Carga última del tramo inclinado' },
      { var: 'RA', unidad: 'tonf', esperado: 2.4912, tol: 0.002, desc: 'Reacción en el apoyo inferior' },
      { var: 'Mmax', unidad: 'tonf*m', esperado: 2.2337, tol: 0.002, desc: 'Momento máximo' },
      { var: 'As', unidad: 'cm^2', esperado: 5.254, tol: 0.003, desc: 'Acero positivo por metro' },
    ],
  },
  blocks: [
    text(`# Generalidades
Escalera de concreto armado de dos tramos en «U» con descanso intermedio. Cada tramo inclinado y su descanso forman una losa que se apoya en las vigas del piso y en la viga del descanso del lado opuesto; se modela como **losa simplemente apoyada** de luz horizontal $L_1 + L_2$, con carga mayor en el tramo inclinado (peso de pasos y garganta) que en el descanso.

- Cargas: NTE E.020 Tabla 1 (escaleras: la sobrecarga de la ocupación; viviendas 200 kgf/m²).
- Combinación: $U = 1.4\\,CM + 1.7\\,CV$ (E.060 9.2.1).
- Diseño por flexión y cortante como losa (E.060 10 y 11); acero mínimo y de temperatura 0.0018 (E.060 9.7.2 y 10.5.4).
- Geometría de pasos según RNE A.010 Art. 29.`),
    calc(`# Datos
L1 = 2.50 m // Proyección horizontal del tramo inclinado [1.0..5.0]
L2 = 1.20 m // Longitud del descanso (hasta el eje de la viga) [0.9..3.0]
p = 25 cm // Paso [25..30]
cp = 17.5 cm // Contrapaso [15..18]
tg = 15 cm // Garganta y espesor del descanso [10..25]
Besc = 1.20 m // Ancho de la escalera [0.9..2.4]
fc = 210 kgf/cm^2 // Concreto [175 kgf/cm^2|210 kgf/cm^2|280 kgf/cm^2] [175..420]
fy = 4200 kgf/cm^2 // Acero ASTM A615 Grado 60 [2800..4200]
gammac = 2.4 tonf/m^3 // Peso específico del concreto armado (E.020 Anexo 1) [2.2..2.5]
wac = 0.10 tonf/m^2 // Acabados (piso terminado) [0.05..0.15]
sc = 0.20 tonf/m^2 // Sobrecarga (E.020 Tabla 1: vivienda 0.20; oficinas y aulas 0.40; comercio 0.50) [0.20 tonf/m^2|0.40 tonf/m^2|0.50 tonf/m^2]
alfa = 1.0 // Coef. del momento positivo (1.0 apoyos simples; 0.9 con continuidad parcial) [1.0|0.9] [0.8..1.0]
bar = 4 // Barra longitudinal [3 : 3/8"|4 : 1/2"|5 : 5/8"]
rec = 2.5 cm // Recubrimiento libre (E.060 7.7.1, losas) [2..4]
## Geometría (RNE A.010 Art. 29)
npas = round(L1/p) // Número de pasos del tramo
check 2*cp + p >= 60 cm // 2cp + p ≥ 60 cm (A.010 Art. 29)
check 2*cp + p <= 64 cm // 2cp + p ≤ 64 cm (A.010 Art. 29)
check npas + 1 <= 17 // Máximo 17 contrapasos por tramo (A.010 Art. 29)
Ltot = L1 + L2 // Luz de cálculo
check tg >= Ltot/25 // Garganta ≥ Ltot/25: práctica Ltot/25 – Ltot/20 (E.060 9.6.2, Tabla 9.1 como referencia)
## Metrado por metro de ancho (E.020)
theta = atan(cp/p) -> deg // Inclinación del tramo
hm = tg/cos(theta) + cp/2 // Espesor medio equivalente (garganta + mitad del paso)
wD1 = gammac*hm + wac -> tonf/m^2 // Carga muerta del tramo inclinado (por m² en planta)
wD2 = gammac*tg + wac -> tonf/m^2 // Carga muerta del descanso
wu1 = (1.4*wD1 + 1.7*sc)*1 m -> tonf/m // Carga última del tramo (E.060 9.2.1)
wu2 = (1.4*wD2 + 1.7*sc)*1 m -> tonf/m // Carga última del descanso
## Análisis (losa simplemente apoyada, por metro de ancho)
RA = (wu1*L1*(L2 + L1/2) + wu2*L2^2/2)/Ltot -> tonf // Reacción en el apoyo inferior (equilibrio de momentos)
RB = wu1*L1 + wu2*L2 - RA -> tonf // Reacción en el apoyo del descanso
x0 = si(RA <= wu1*L1, RA/wu1, L1 + (RA - wu1*L1)/wu2) // Sección de cortante nulo
Mmax = si(x0 <= L1, RA^2/(2*wu1), RA*x0 - wu1*L1*(x0 - L1/2) - wu2*(x0 - L1)^2/2) -> tonf*m // Momento máximo`),
    { type: 'beam', tramos: 'L1, L2', apoyos: 'A, L, A', E: '2.17e6 tonf/m^2', I: '0.0003 m^4', cargas: 'U 1 wu1\nU 2 wu2', deflexion: false, titulo: 'Losa de la escalera por metro de ancho con cargas últimas (análisis matricial de comprobación)' },
    calc(`# Diseño por flexión (E.060 10)
check abs(Mpos - Mmax) <= 0.01*Mmax // El análisis matricial coincide con la solución cerrada (E.060 8.3)
Mu = alfa*Mmax // Momento de diseño positivo
d = tg - rec - db(bar)/2 // Peralte efectivo
As = asFlex(Mu, 100 cm, d, fc, fy) // Acero positivo requerido por metro (φ = 0.9)
Asmin = 0.0018*100 cm*tg // Acero mínimo (E.060 10.5.4 y 9.7.2)
Asd = max(As, Asmin) // Acero de diseño
sep = rounddown(max(min(Ab(bar)/Asd*100 cm, 3*tg, 40 cm), 7.5 cm), 2.5 cm) // Espaciamiento ≤ 3h y ≤ 40 cm (E.060 10.5.4)
check Ab(bar)/sep*100 cm >= Asd // Acero colocado ≥ requerido (E.060 10.5.4)
phiMn = 0.9*Ab(bar)/sep*100 cm*fy*(d - Ab(bar)/sep*100 cm*fy/(2*0.85*fc*100 cm)) -> tonf*m // Resistencia de diseño colocada
check Mu <= phiMn // Resistencia a flexión (E.060 9.3.2.1)
Asneg = max(As/2, Asmin) // Acero negativo en los apoyos (práctica: As/2 a As/3 y no menor que el mínimo)
sepn = rounddown(min(Ab(bar)/Asneg*100 cm, 3*tg, 40 cm), 2.5 cm) // Espaciamiento del negativo
Ast = 0.0018*100 cm*tg // Acero transversal de temperatura (E.060 9.7.2)
sept = rounddown(min(Ab(3)/Ast*100 cm, 5*tg, 40 cm), 2.5 cm) // Espaciamiento con 3/8" (≤ 5h y 40 cm)
## Cortante (E.060 11.3 y 11.1.3.1)
Vu = max((RA - wu1*d)*cos(theta), RB - wu2*d) -> tonf // Cortante último a «d» de la cara (componente normal a la losa)
phiVc = 0.85*0.53*sqrtfc(fc)*100 cm*d -> tonf // Resistencia del concreto por metro
check Vu <= phiVc // Cortante (E.060 11.3.1.1)
"Refuerzo longitudinal inferior: barra #{bar} @ {sep}; negativo en los apoyos #{bar} @ {sepn} (prolongado ℓn/4 desde la cara); transversal 3/8\\" @ {sept}. Para el ancho total de {Besc} se colocan {ceil(Besc/sep) + 1} barras inferiores.`),
    { type: 'exEscalera', L1: 'L1', L2: 'L2', p: 'p', cp: 'cp', t: 'tg', wu1: 'wu1', wu2: 'wu2', acero: 'Inferior #{bar} @ {sep} · negativo #{bar} @ {sepn} · temperatura 3/8" @ {sept}', titulo: '' },
    summary(),
  ],
};

// ---------------------------------------------------------------------
// 2) LOSA DE PISO INDUSTRIAL SOBRE TERRENO
// ---------------------------------------------------------------------
const pisoInd = {
  id: 'ex-piso-ind', pais: 'PE', cat: 'Cimentaciones', icon: 'slab',
  normas: 'ACI 360R-10 (losas sobre terreno) · PCA «Concrete Floors on Ground» (EB075) · Westergaard (Huang 2004) · ACI 318-19 Cap. 14 · ' + E060,
  name: 'Losa de piso industrial sobre terreno (montacargas y racks)',
  desc: 'Losa de concreto simple sobre sub-base: radio de rigidez relativa, esfuerzos de Westergaard por rueda de montacargas (interior, borde y esquina) y poste de rack, carga repartida admisible en pasillos (PCA), punzonamiento, juntas, pasadores y acero por arrastre.',
  titulo: 'Diseño de losa de piso industrial sobre terreno',
  validacion: {
    fuente: 'Control: fórmulas de Westergaard (Huang, Pavement Analysis and Design, 2.ª ed., Ec. 4.4, 4.7, 4.11 y 4.13) y PCA',
    nota: 'Valores de control de esta implementación; ℓ, σi y σe se recalculan independientemente en tests/extras.test.mjs.',
    valores: [
      { var: 'lrel', unidad: 'cm', esperado: 74.69, tol: 0.002, desc: 'Radio de rigidez relativa ℓ' },
      { var: 'sigi', unidad: 'kgf/cm^2', esperado: 10.81, tol: 0.003, desc: 'Esfuerzo interior por rueda' },
      { var: 'sige', unidad: 'kgf/cm^2', esperado: 21.59, tol: 0.003, desc: 'Esfuerzo de borde por rueda (sin transferencia)' },
    ],
  },
  blocks: [
    text(`# Generalidades
Losa de piso de concreto **simple** (sin refuerzo estructural) apoyada sobre una sub-base granular compactada, para un almacén con montacargas y estanterías (racks). Se diseña por **esfuerzos de tracción por flexión** con las soluciones de Westergaard en que se basan las cartas de la PCA y el ACI 360R-10, comparando el esfuerzo actuante con el módulo de rotura dividido por un factor de seguridad (ACI 360R-10 Cap. 7). Se verifican además el punzonamiento bajo los postes (ACI 318-19 14.5.5), la carga repartida en pasillos (PCA), las juntas (ACI 360R-10 Cap. 6) y el acero por arrastre de subrasante.

La E.060 no trata las losas sobre terreno; se usan el ACI 360R-10 y la PCA como referencia, y el módulo de rotura se determina con el ensayo NTP 339.078 (viga con cargas a los tercios).`),
    calc(`# Datos
## Concreto y apoyo
fc = 280 kgf/cm^2 // Concreto [210 kgf/cm^2|245 kgf/cm^2|280 kgf/cm^2|350 kgf/cm^2] [175..420]
MR = 2.0*sqrtfc(fc) // Módulo de rotura ≈ 7.5√f'c psi (ACI 360R-10 Cap. 7; ensayo NTP 339.078)
Ec = 15000*sqrtfc(fc) // Módulo de elasticidad (E.060 8.5.2)
nuc = 0.15 // Módulo de Poisson del concreto [0.15..0.20]
hl = 20 cm // Espesor de la losa [12..35]
ks = 5.5 kgf/cm^3 // Módulo de reacción en la superficie de la sub-base (ensayo de placa) [1..15]
gammac = 2.4 tonf/m^3 // Peso específico del concreto [2.2..2.5]
## Montacargas (rueda delantera más cargada)
Peje = 6.0 tonf // Carga del eje delantero con carga (ficha del equipo: ≈ 2.2–2.5 × capacidad; montacargas de 2.5 t) [1..30]
qc = 10 kgf/cm^2 // Presión de contacto (llanta maciza ≈ 10; neumática ≈ 6) [4..20]
FSm = 2.0 // Factor de seguridad para montacargas (ACI 360R-10 Cap. 7, > 400 000 repeticiones) [1.4..2.2]
fLT = 0.75 // Reducción del esfuerzo de borde por transferencia de carga (pasadores 0.75; trabazón 0.80; borde libre 1.0) [0.75|0.80|1.0] [0.7..1.0]
## Racks (estanterías)
Pr = 4.5 tonf // Carga por poste (suma de dos postes adyacentes espalda con espalda) [0.5..15]
cpl = 15 cm // Lado de la placa base del poste [8..30]
FSr = 1.7 // Factor de seguridad para postes de racks (ACI 360R-10 Cap. 7) [1.4..2.2]
## Carga repartida en pasillos
qal = 3.0 tonf/m^2 // Carga repartida almacenada sobre el piso [0..10]
Lj = 4.5 m // Espaciamiento de juntas de contracción [2..6]
fyr = 4200 kgf/cm^2 // Acero (si se refuerza por arrastre) [2800..5000]`),
    { type: 'exCapas', h: 'hl', capas: 'Sub-base granular compactada (CBR ≥ 40 %); 20 cm\nSubrasante mejorada y compactada (95 % Proctor modificado); 30 cm', carga: 'P = {Peje/2} (rueda)', junta: 'Lj', titulo: '' },
    calc(`# Esfuerzos por la rueda del montacargas (Westergaard)
Pw = Peje/2 // Carga de rueda
aw = sqrt(Pw/(pi*qc)) -> cm // Radio del área de contacto equivalente
lrel = lrelWest(Ec, hl, nuc, ks) // Radio de rigidez relativa (Huang Ec. 4.7)
sigi = sigIntWest(Pw, hl, lrel, aw, nuc) // Carga interior (Huang Ec. 4.11, con el radio equivalente b)
sige = sigBordeWest(Pw, hl, Ec, ks, aw, nuc) // Carga en el borde libre (Westergaard 1948, Huang Ec. 4.13)
sigc = sigEsqWest(Pw, hl, lrel, aw) // Carga en la esquina (Huang Ec. 4.4)
sigadm = MR/FSm // Esfuerzo admisible por fatiga (ACI 360R-10 Cap. 7)
check sigi <= sigadm // Carga interior (ACI 360R-10 Cap. 7)
check fLT*sige <= sigadm // Carga en junta con transferencia (ACI 360R-10 Cap. 7)
check fLT*sigc <= sigadm // Carga en esquina con transferencia (ACI 360R-10 Cap. 7)
# Postes de racks
ar = sqrt(cpl^2/pi) -> cm // Radio equivalente de la placa base
sigr = sigIntWest(Pr, hl, lrel, ar, nuc) // Esfuerzo interior bajo el poste
check sigr <= MR/FSr // Flexión bajo postes (ACI 360R-10 Cap. 7)
## Punzonamiento (concreto simple, ACI 318-19 14.5.5.1, φ = 0.60)
bo = 4*(cpl + hl) // Perímetro crítico a h/2 de la placa
phiVn = 0.60*0.70*sqrtfc(fc)*bo*hl -> tonf // φ·0.22√f'c (MPa)·bo·h en kgf/cm²: 0.70√f'c
check 1.6*Pr <= phiVn // Punzonamiento con carga amplificada (1.6 carga almacenada)
check 1.6*Pr <= 0.60*0.85*fc*cpl^2 // Aplastamiento bajo la placa (14.5.6)
# Carga repartida en pasillos (PCA, pasillo crítico sin junta)
wadm = 257.876*(MR/FSr)/(1 psi)*sqrt((ks/(1 lbf/in^3))*(hl/(1 in))/(Ec/(1 psi)))*(1 lbf/ft^2) -> tonf/m^2 // PCA (Packard): w = 257.876·s·√(k·h/E)
check qal <= wadm // Carga repartida admisible (ACI 360R-10 Cap. 7; PCA)
# Juntas y refuerzo
check Lj <= min(30*hl, 4.5 m) // Espaciamiento de juntas 24h–36h y ≤ 4.5 m (ACI 360R-10 Cap. 6)
"Las juntas se cortan a una profundidad de $h/4$ a $h/3$ = {hl/4} – {hl/3} dentro de las 4–12 h del vaciado; los paños deben ser aproximadamente cuadrados (relación de lados ≤ 1.5).
dpas = si(hl <= 15 cm, 5/8, si(hl <= 20 cm, 3/4, 1)) // Pasadores lisos en juntas de construcción (ACI 360R-10 Cap. 5), pulgadas
As_arr = 1.5*Lj*gammac*hl/(2*0.75*fyr)*1 m -> cm^2 // Acero por arrastre de subrasante As = F·L·w/(2fs), F = 1.5 (ACI 360R-10 Cap. 9; PCA)
"Pasadores lisos de {dpas}\\" × 40 cm @ 30 cm en juntas de construcción. Si se desea controlar el ancho de las fisuras entre juntas se puede colocar una malla en el tercio superior de al menos {As_arr} por metro (la losa se diseña como concreto simple; el acero no se considera en la resistencia).`),
    summary(),
  ],
};

// ---------------------------------------------------------------------
// 3) PAVIMENTO RÍGIDO AASHTO 93
// ---------------------------------------------------------------------
const pavRig = {
  id: 'ex-pav-rigido', pais: 'PE', cat: 'Cimentaciones', icon: 'slab', settings: {},
  normas: 'AASHTO Guide for Design of Pavement Structures 1993 (Parte II, Cap. 3) · MTC Manual de Carreteras: Suelos, Geología, Geotecnia y Pavimentos (2014) · NTE CE.010 Pavimentos Urbanos',
  name: 'Pavimento rígido de concreto (AASHTO 93)',
  desc: 'Espesor de losa por la ecuación AASHTO 93 (W18, confiabilidad ZR, So, ΔPSI, S\'c, Ec, k, J, Cd), verificación del tráfico admisible, juntas, pasadores y barras de amarre.',
  titulo: 'Diseño de pavimento rígido por el método AASHTO 93',
  validacion: {
    fuente: 'Garber y Hoel, Traffic and Highway Engineering (ejemplo de diseño AASHTO 93 de pavimento rígido, nomograma AASHTO 93 Fig. 3.7): k = 72 pci, Ec = 5×10⁶ psi, S\'c = 650 psi, J = 3.2, Cd = 1.0, ΔPSI = 1.7, R = 95 %, So = 0.29, W18 = 5.1×10⁶ → D = 9.75 in (≈ 10 in)',
    nota: 'Datos por defecto = datos del ejemplo convertidos a kgf/cm (S\'c = 45.7 kgf/cm², Ec = 351 500 kgf/cm², k = 1.99 kgf/cm³). La ecuación da 9.72 in frente a 9.75 in leídos en el nomograma.',
    valores: [
      { var: 'ZR', esperado: -1.645, tol: 0.001, desc: 'ZR para R = 95 %' },
      { var: 'Dreq', unidad: 'in', esperado: 9.75, tol: 0.01, desc: 'Espesor requerido (nomograma 9.75 in)' },
      { var: 'Dd', unidad: 'cm', esperado: 25, tol: 0.001, desc: 'Espesor adoptado ≈ 10 in' },
    ],
  },
  blocks: [
    text(`# Generalidades
Pavimento rígido de concreto simple con juntas (JPCP) diseñado con el método **AASHTO 93**, adoptado por el *Manual de Carreteras: Suelos, Geología, Geotecnia y Pavimentos* del MTC (2014, Cap. 14) y aceptado por la NTE CE.010 para pavimentos urbanos. El espesor $D$ es el menor que satisface la ecuación de diseño:

$$\\log W_{18} = Z_R S_o + 7.35\\log(D+1) - 0.06 + \\frac{\\log\\left(\\frac{\\Delta PSI}{4.5-1.5}\\right)}{1+\\frac{1.624\\times 10^7}{(D+1)^{8.46}}} + (4.22-0.32p_t)\\log\\left[\\frac{S'_c C_d (D^{0.75}-1.132)}{215.63 J\\left(D^{0.75}-\\frac{18.42}{(E_c/k)^{0.25}}\\right)}\\right]$$

con $D$ en pulgadas, $S'_c$ y $E_c$ en psi y $k$ en pci (la memoria convierte las unidades).`),
    calc(`# Datos
## Tráfico y serviciabilidad
W18 = 5.1e6 // Ejes equivalentes de 8.2 t en el periodo de diseño (estudio de tráfico) [1e4..1e8]
R = 95 // Confiabilidad % (AASHTO 93 Tabla 2.2; MTC 2014 Cap. 14 según el tráfico) [50..99.9]
So = 0.29 // Desviación estándar combinada (AASHTO: 0.30–0.40; MTC 0.35) [0.25..0.45]
po = 4.2 // Serviciabilidad inicial (AASHTO Road Test: 4.5 en rígidos; MTC 4.1–4.3) [3.5..5]
pt = 2.5 // Serviciabilidad final (MTC: 2.0–2.5 según tráfico) [1.5..3.0]
## Materiales y apoyo
Sc = 45.7 kgf/cm^2 // Módulo de rotura a 28 días S'c (MTC: ≥ 40 kgf/cm²; NTP 339.078) [35..55]
Ec = 351500 kgf/cm^2 // Módulo de elasticidad del concreto (≈ 57 000√f'c psi) [200000..450000]
kef = 1.99 kgf/cm^3 // Módulo de reacción efectivo (corregido por sub-base y pérdida de soporte) [1..15]
J = 3.2 // Transferencia de carga (pasadores, berma de asfalto: 3.2; berma de concreto atada: 2.7) [2.5..4.4]
Cd = 1.0 // Coeficiente de drenaje (AASHTO Tabla 2.5) [0.7..1.25]
fyb = 4200 kgf/cm^2 // Acero de barras de amarre [2800..4200]
bcarril = 3.6 m // Ancho de carril (distancia a la junta libre) [2.7..4.0]
Lj = 4.5 m // Espaciamiento de juntas transversales [3..6]
# Espesor de la losa (AASHTO 93)
dPSI = po - pt // Pérdida de serviciabilidad
ZR = ZRconf(R) // Desviación normal estándar (AASHTO Tabla 4.1)
Dreq = DAASHTO93(W18, ZR, So, dPSI, pt, Sc, Cd, J, Ec, kef) // Espesor requerido (ecuación AASHTO 93, Fig. 3.7)
Dd = roundup(Dreq - 0.2 cm, 1 cm) // Espesor adoptado (redondeo constructivo a 1 cm)
W18adm = W18AASHTO93(Dd, ZR, So, dPSI, pt, Sc, Cd, J, Ec, kef) // Ejes admisibles con el espesor adoptado
check W18adm >= 0.95*W18 // Tráfico admisible (tolerancia del 5 % por redondeo, práctica AASHTO)
check Dd >= 15 cm // Espesor mínimo (MTC; CE.010 vías locales 15 cm)
# Juntas, pasadores y barras de amarre
check Lj <= min(24*Dd, 4.5 m) // Espaciamiento de juntas L ≤ 24D y ≤ 4.5 m (FHWA TA 5040.30; MTC)
check Lj/bcarril <= 1.25 // Paños aproximadamente cuadrados (relación ≤ 1.25)
dpas = Dd/8 -> mm // Diámetro de pasadores ≈ D/8 (AASHTO 93 Parte II 2.4.2; MTC 2014 Cap. 14)
dpasd = si(dpas <= 25.4 mm, 1, si(dpas <= 31.75 mm, 1.25, 1.5)) // Pasador liso adoptado (pulgadas): 1", 1 1/4" o 1 1/2"
Atie = bcarril*1.5*(2.4 tonf/m^3*Dd)/(0.67*fyb) -> cm^2/m // Barras de amarre As = b·f·w/fs (AASHTO 93 Parte II 3.3.2), f = 1.5, fs = 0.67 fy
septie = rounddown(min(Ab(4)/Atie, 75 cm), 5 cm) // Espaciamiento con 1/2"
Ltie = 0.5*0.67*fyb*db(4)/(24.6 kgf/cm^2) + 7.5 cm -> cm // Longitud t = ½(fs·d/350 psi) + 3 in (AASHTO 93)
"Pasadores lisos de {dpasd}\\" × 45 cm @ 30 cm en las juntas transversales (engrasados en una mitad); barras de amarre corrugadas de 1/2\\" @ {septie} con longitud {roundup(Ltie, 5 cm)} en la junta longitudinal.`),
    { type: 'exCapas', h: 'Dd', capas: 'Sub-base granular (CBR ≥ 40 %, MTC); 20 cm\nSubrasante compactada; 20 cm', carga: 'Eje equivalente 8.2 t', junta: 'Lj', titulo: 'Sección típica del pavimento rígido' },
    { type: 'plot', expr: 'log10(W18AASHTO93(x*1 cm, ZR, So, dPSI, pt, Sc, Cd, J, Ec, kef)); log10(W18)', var: 'x', desde: '15', hasta: '35', puntos: '120', xlabel: 'Espesor D [cm]', ylabel: 'log W18', leyenda: true, nombres: 'log W18 admisible (AASHTO 93); log W18 de diseño', titulo: 'Tráfico admisible en función del espesor de la losa' },
    summary(),
  ],
};

// ---------------------------------------------------------------------
// 4) CIMENTACIÓN DE MÁQUINA ROTATIVA
// ---------------------------------------------------------------------
const maquina = {
  id: 'ex-cim-maquina', pais: 'PE', cat: 'Cimentaciones', icon: 'footing',
  normas: 'ACI 351.3R-18 (cimentaciones de equipos dinámicos) · Richart, Hall y Woods (1970) · ISO 21940-11 (grado de balanceo G) · NTE E.050',
  name: 'Bloque de cimentación de máquina rotativa (vibraciones)',
  desc: 'Bloque rígido sobre suelo: masa mínima, dimensiones, presión estática, rigideces y amortiguamientos del semiespacio elástico (vertical, horizontal y cabeceo), frecuencias naturales, relación de frecuencias y amplitud/velocidad de vibración con la fuerza de desbalance.',
  titulo: 'Diseño de cimentación de máquina rotativa',
  validacion: {
    fuente: 'Control: fórmulas de Richart, Hall y Woods (1970) — Das y Ramana, Principles of Soil Dynamics, 2.ª ed., Cap. 5',
    nota: 'Valores de control de esta implementación; kz = 4Gr0/(1 − ν), Bz = (1 − ν)m/(4ρr0³) y fz = √(kz/m)/2π se recalculan en tests/extras.test.mjs.',
    valores: [
      { var: 'r0z', unidad: 'm', esperado: 1.5958, tol: 0.001, desc: 'Radio equivalente vertical' },
      { var: 'kz', unidad: 'tonf/m', esperado: 69947, tol: 0.002, desc: 'Rigidez vertical' },
      { var: 'fz', unidad: 'Hz', esperado: 22.345, tol: 0.002, desc: 'Frecuencia natural vertical' },
    ],
  },
  blocks: [
    text(`# Generalidades
Bloque macizo de concreto armado que soporta un equipo rotativo (bomba, ventilador o compresor centrífugo acoplado a motor). Se analiza como **cuerpo rígido sobre un semiespacio elástico** con el modelo de parámetros concentrados de Richart, Hall y Woods (1970), recomendado por el ACI 351.3R-18 (Cap. 4): para cada modo (vertical, horizontal y cabeceo) se calcula la rigidez, el amortiguamiento geométrico y la frecuencia natural, que debe alejarse de la frecuencia de operación al menos ±20 % (ACI 351.3R-18, criterio de no resonancia). La amplitud forzada se obtiene con la fuerza de desbalance del rotor según el grado de balanceo G (ISO 21940-11) y se compara con un límite de velocidad de vibración.

Simplificación: modos desacoplados y empotramiento despreciado (conservador para las frecuencias).`),
    calc(`# Datos
## Máquina
Wm = 6.0 tonf // Peso total de la máquina y el motor [0.5..100]
Wr = 2.0 tonf // Peso de las partes rotativas [0.1..50]
rpm = 3600 // Velocidad de operación (rpm) [300..12000]
Gbal = 2.5 mm/s // Grado de balanceo G (ISO 21940-11: G2.5 para turbomáquinas y motores de 3600 rpm) [1..40]
SFd = 2.0 // Factor de servicio de la fuerza de desbalance (ACI 351.3R-18 Cap. 3) [1..3]
hm = 0.80 m // Altura del eje sobre la cara superior del bloque [0.2..3]
## Bloque
B = 2.00 m // Ancho del bloque [0.5..10]
L = 4.00 m // Largo del bloque (dirección del cabeceo) [1..20]
hb = 1.50 m // Altura del bloque [0.5..4]
Df = 1.00 m // Empotramiento en el terreno [0..4]
gammac = 2.4 tonf/m^3 // Concreto armado [2.3..2.5]
## Suelo (estudio de mecánica de suelos, E.050)
Vs = 200 m/s // Velocidad de onda de corte (ensayo MASW o downhole) [80..800]
gammas = 1.8 tonf/m^3 // Peso unitario [1.4..2.3]
nus = 0.33 // Módulo de Poisson [0.2..0.45]
qa = 20 tonf/m^2 // Capacidad admisible (EMS) [5..100]
vlim = 2.5 mm/s // Velocidad de vibración admisible (ACI 351.3R-18, carta de Blake «buena»; ISO 10816) [1..10]
# Masas y verificaciones geométricas (ACI 351.3R-18 Cap. 3 y 4)
Wb = gammac*B*L*hb -> tonf // Peso del bloque
check Wb >= 3*Wm // Masa del bloque ≥ 3 veces la de la máquina rotativa (regla práctica ACI 351.3R)
check hb >= max(0.6 m, B/5, L/10) // Espesor ≥ 0.60 m, ≥ B/5 y ≥ L/10 (ACI 351.3R-18 Cap. 3, bloque rígido)
Wt = Wb + Wm // Peso total vibrante
qs = Wt/(B*L) -> tonf/m^2 // Presión estática en la base
check qs <= 0.5*qa // Presión ≤ 50 % de la admisible (práctica ACI 351.3R; asentamientos dinámicos)
# Parámetros dinámicos del suelo
rhos = gammas/(9.80665 m/s^2) // Densidad
Gs = rhos*Vs^2 -> tonf/m^2 // Módulo de corte G = ρ·Vs²
mt = Wt/(9.80665 m/s^2) // Masa total
omega = 2*pi*rpm/(60 s) // Frecuencia circular de operación (rad/s)
fop = rpm/(60 s) -> Hz // Frecuencia de operación
# Modo vertical (Richart et al. 1970; ACI 351.3R-18 4.4)
r0z = sqrt(B*L/pi) -> m // Radio equivalente para traslación
kz = 4*Gs*r0z/(1 - nus) -> tonf/m // Rigidez vertical
Bz = (1 - nus)/4*mt/(rhos*r0z^3) // Relación de masa
Dz = 0.425/sqrt(Bz) // Amortiguamiento geométrico
fz = sqrt(kz/mt)/(2*pi) -> Hz // Frecuencia natural vertical
rz = fop/fz // Relación de frecuencias
check abs(rz - 1) >= 0.2 // Fuera de la banda de resonancia ±20 % (ACI 351.3R)
## Respuesta forzada
Fo = SFd*Wr/(9.80665 m/s^2)*Gbal*omega -> tonf // Fuerza de desbalance Fo = SF·mr·e·ω² con e·ω = G
Az = Fo/kz/sqrt((1 - rz^2)^2 + (2*Dz*rz)^2) -> mm // Amplitud vertical
vz = Az*omega -> mm/s // Velocidad de vibración
check vz <= vlim // Velocidad vertical admisible (ACI 351.3R-18 Cap. 3)
# Modo horizontal
kx = 32*(1 - nus)*Gs*r0z/(7 - 8*nus) -> tonf/m // Rigidez horizontal
Bx = (7 - 8*nus)/(32*(1 - nus))*mt/(rhos*r0z^3) // Relación de masa
Dx = 0.2875/sqrt(Bx) // Amortiguamiento geométrico
fx = sqrt(kx/mt)/(2*pi) -> Hz // Frecuencia natural horizontal
rx = fop/fx // Relación de frecuencias
check abs(rx - 1) >= 0.2 // Fuera de la banda de resonancia (ACI 351.3R-18 Cap. 3)
Ax = Fo/kx/sqrt((1 - rx^2)^2 + (2*Dx*rx)^2) -> mm // Amplitud horizontal en la base
# Modo de cabeceo (alrededor del eje paralelo a B)
r0p = (B*L^3/(3*pi))^(1/4) -> m // Radio equivalente para cabeceo
kpsi = 8*Gs*r0p^3/(3*(1 - nus)) -> tonf*m // Rigidez al cabeceo
zb = (Wb*hb/2 + Wm*(hb + hm/2))/Wt -> m // Centro de gravedad sobre la base
Ipsi = Wb/(9.80665 m/s^2)*((L^2 + hb^2)/12 + (hb/2)^2) + Wm/(9.80665 m/s^2)*(hb + hm/2)^2 -> tonf*s^2*m // Momento de inercia de masa respecto al eje de giro en la base
Bpsi = 3*(1 - nus)/8*Ipsi/(rhos*r0p^5) // Relación de inercia
Dpsi = 0.15/((1 + Bpsi)*sqrt(Bpsi)) // Amortiguamiento geométrico
fpsi = sqrt(kpsi/Ipsi)/(2*pi) -> Hz // Frecuencia natural de cabeceo
rpsi = fop/fpsi // Relación de frecuencias
check abs(rpsi - 1) >= 0.2 // Fuera de la banda de resonancia (ACI 351.3R-18 Cap. 3)
Mo = Fo*(hb + hm) -> tonf*m // Momento de desbalance respecto a la base
Apsi = Mo/kpsi/sqrt((1 - rpsi^2)^2 + (2*Dpsi*rpsi)^2) // Giro de cabeceo (rad)
Ahe = Ax + Apsi*(hb + hm) -> mm // Amplitud horizontal total al nivel del eje
vh = Ahe*omega -> mm/s // Velocidad horizontal en el eje
check vh <= vlim // Velocidad horizontal admisible (ACI 351.3R-18 Cap. 3)`),
    { type: 'exMaquina', B: 'B', L: 'L', hb: 'hb', Df: 'Df', hm: 'hm', titulo: '' },
    { type: 'table', columnas: 'Modo = ["vertical", "horizontal", "cabeceo"]\nf natural [Hz] = [fz, fx, fpsi]\nf operación / f natural = [rz, rx, rpsi]\nAmortiguamiento D = [Dz, Dx, Dpsi]', dec: '3', titulo: 'Resumen de frecuencias naturales (modos desacoplados)' },
    summary(),
  ],
};

// ---------------------------------------------------------------------
// 5) VIGA DE ACOPLAMIENTO CON REFUERZO DIAGONAL
// ---------------------------------------------------------------------
const acople = {
  id: 'ex-viga-acople', pais: 'PE', cat: 'Concreto armado', icon: 'beam',
  normas: 'ACI 318-19 18.10.7 (vigas de acoplamiento) y 18.7.5.4 · ' + E060 + ' Cap. 21',
  name: 'Viga de acoplamiento con refuerzo diagonal (muros acoplados)',
  desc: 'Clasificación ℓn/h y Vu, área de cada grupo diagonal Avd = Vu/(2φfy sen α), límite de Vn, confinamiento de toda la sección (opción 18.10.7.4 d), refuerzo distribuido y anclaje 1.25ℓd en los muros.',
  titulo: 'Diseño de viga de acoplamiento con refuerzo diagonal',
  validacion: {
    fuente: 'Control: ACI 318-19 Ec. 18.10.7.4 (Vn = 2Avd·fy·sen α ≤ 0.83√f\'c Acw)',
    nota: 'Valores de control de esta implementación: α = atan((h − 2yd)/ℓn) = atan(0.60/1.50) = 21.80°; Avd = 70 000/(2·0.85·4200·sen 21.8°) = 26.39 cm².',
    valores: [
      { var: 'alfa', unidad: 'deg', esperado: 21.801, tol: 0.001, desc: 'Inclinación de las diagonales' },
      { var: 'Avd', unidad: 'cm^2', esperado: 26.39, tol: 0.003, desc: 'Área requerida por grupo diagonal' },
      { var: 'Vnmax', unidad: 'tonf', esperado: 119.75, tol: 0.003, desc: 'Límite 0.83√f\'c Acw (2.65√f\'c en kgf/cm²)' },
    ],
  },
  blocks: [
    text(`# Generalidades
Viga que acopla dos muros de concreto armado (placas) en un sistema de muros acoplados. Cuando $\\ell_n/h < 2$ y $V_u > 0.33\\lambda\\sqrt{f'_c}A_{cw}$ (MPa), el ACI 318-19 18.10.7.3 exige **dos grupos de barras diagonales** que se cruzan en el centro de la luz; la resistencia la aportan solo las diagonales:

$$V_n = 2A_{vd} f_y \\operatorname{sen}\\alpha \\le 0.83\\sqrt{f'_c}\\,A_{cw}\\ \\text{(MPa)} = 2.65\\sqrt{f'_c}\\,A_{cw}\\ \\text{(kgf/cm²)}$$

La NTE E.060 (Cap. 21) no desarrolla este detalle, por lo que se aplica el ACI 318-19 con las equivalencias en kgf/cm². Se adopta el confinamiento de **toda la sección** (18.10.7.4 d), más fácil de construir que el confinamiento de cada grupo, con $\\phi = 0.85$ (ACI 318-19 21.2.4.4).`),
    calc(`# Datos
fc = 280 kgf/cm^2 // Concreto [210..420]
fy = 4200 kgf/cm^2 // Acero [4200..5000]
bw = 30 cm // Ancho (espesor de los muros) [20..60]
hv = 90 cm // Peralte de la viga [40..250]
ln = 1.50 m // Luz libre [0.6..4]
yd = 15 cm // Distancia de la cara al centroide de cada grupo diagonal en el apoyo [8..30]
Vu = 70 tonf // Cortante último del análisis sísmico [0..400]
bard = 8 // Barra diagonal [6 : 3/4"|8 : 1"|9 : 1 1/8"|10 : 1 1/4"]
bare = 4 // Estribo y grapas de confinamiento [3 : 3/8"|4 : 1/2"]
sst = 10 cm // Espaciamiento del confinamiento [5..15]
rec = 4 cm // Recubrimiento al estribo [3..5]
phi = 0.85 // ACI 318-19 21.2.4.4 [0.75..0.85]
# Clasificación (ACI 318-19 18.10.7)
Acw = bw*hv // Área de la sección
check ln/hv < 2 // ℓn/h < 2: viga corta (ACI 318-19 18.10.7.3)
Vlim = 1.06*sqrtfc(fc)*Acw -> tonf // 0.33√f'c Acw en kgf/cm²
check Vu > Vlim // Se requieren diagonales (18.10.7.3); si no, puede diseñarse como viga
# Refuerzo diagonal (18.10.7.4 a)
alfa = atan((hv - 2*yd)/ln) -> deg // Ángulo de las diagonales con el eje
Avd = Vu/(2*phi*fy*sin(alfa)) -> cm^2 // Área por grupo
nd = max(4, 2*ceil(Avd/Ab(bard)/2)) // Número de barras por grupo (mínimo 4, par)
check nd*Ab(bard) >= Avd // Acero colocado por grupo (18.10.7.4 a)
Vnmax = 2.65*sqrtfc(fc)*Acw -> tonf // Límite 0.83√f'c Acw
Vn = min(2*nd*Ab(bard)*fy*sin(alfa), Vnmax) -> tonf // Resistencia nominal
check Vu <= phi*Vn // Resistencia a cortante (ACI 318-19 18.10.7.4)
check 2*nd*Ab(bard)*fy*sin(alfa) <= 1.25*Vnmax // Diagonales no excesivas: Vn,diag ≤ 1.25 Vn,máx (criterio de capacidad, ACI 318-19 R18.10.7)
# Confinamiento de toda la sección (18.10.7.4 d y 18.7.5.4)
bc1 = bw - 2*rec // Núcleo perpendicular a la altura
bc2 = hv - 2*rec // Núcleo en la dirección de la altura
Ach = bc1*bc2 // Área del núcleo
check sst <= min(6*db(bard), 15 cm) // Espaciamiento ≤ 6 db de la diagonal y ≤ 150 mm (18.10.7.4 d)
Ash1 = max(0.09*sst*bc1*fc/fy, 0.3*sst*bc1*(Acw/Ach - 1)*fc/fy) // Área requerida paralela a h (cortes horizontales)
Ash2 = max(0.09*sst*bc2*fc/fy, 0.3*sst*bc2*(Acw/Ach - 1)*fc/fy) // Área requerida paralela a bw (cortes verticales)
nr1 = max(2, ceil(Ash1/Ab(bare))) // Ramas verticales (en el ancho)
nr2 = max(2, ceil(Ash2/Ab(bare))) // Ramas horizontales (en la altura)
check nr1*Ab(bare) >= Ash1 // Confinamiento en el ancho (18.7.5.4)
check nr2*Ab(bare) >= Ash2 // Confinamiento en la altura (18.7.5.4)
check bc2/(nr2 - 1) <= 20 cm // Grapas a no más de 200 mm (18.10.7.4 d)
# Refuerzo distribuido y anclaje
Asd = 0.002*bw*sst // Refuerzo longitudinal y transversal distribuido mínimo por espaciamiento (18.10.7.4 c iv)
ldd = 1.25*ldE060(bard, fc, fy) // Anclaje de las diagonales en los muros 1.25 ℓd (18.10.7.4 b)
"Cada grupo diagonal: {nd} barras #{bard} con anclaje de {roundup(ldd, 5 cm)} dentro de cada muro; confinamiento de toda la sección con estribos #{bare} @ {sst}: {nr1} ramas en el ancho y {nr2} ramas en la altura (grapas). Refuerzo longitudinal adicional distribuido ≥ {Asd} por cada {sst}, sin anclaje en los muros (solo se prolonga 15 cm).`),
    { type: 'exAcople', ln: 'ln', h: 'hv', yd: 'yd', diag: '2 grupos de {nd} #{bard} (α = {alfa})', conf: 'estribos #{bare} @ {sst}, {nr1} × {nr2} ramas', titulo: '' },
    summary(),
  ],
};

// ---------------------------------------------------------------------
// 6) LOSA COMO DIAFRAGMA
// ---------------------------------------------------------------------
const diafragma = {
  id: 'ex-diafragma', pais: 'PE', cat: 'Concreto armado', icon: 'grid',
  normas: 'NTE E.030-2026 (fuerzas de piso) · ASCE/SEI 7-22 12.3.1 y 12.10 (diafragmas, colectores, Ω0) · ACI 318-19 Cap. 12 y 18.12 · ' + E060,
  name: 'Losa como diafragma: cuerdas, colectores y cortante',
  desc: 'Fuerza de diseño del diafragma Fpx con límites 0.5ZUS–ZUS (equivalencia con ASCE 7), análisis como viga horizontal, cortante de la losa (o losa superior del aligerado), cuerdas, colectores amplificados con Ω0 y clasificación rígido/flexible por deformación.',
  titulo: 'Diseño de la losa como diafragma',
  validacion: {
    fuente: 'Control: viga horizontal simplemente apoyada (V = wL/2, M = wL²/8) y ACI 318-19 12.5.3.3',
    nota: 'Valores de control: Fpx = 0.5·ZUS·wpx = 0.5·0.45·1.0·1.05·288 = 68.04 tonf; w = Fpx/L = 2.835 t/m; M = wL²/8 = 204.1 t·m.',
    valores: [
      { var: 'Fpx', unidad: 'tonf', esperado: 68.04, tol: 0.002, desc: 'Fuerza de diseño del diafragma' },
      { var: 'Mud', unidad: 'tonf*m', esperado: 204.12, tol: 0.002, desc: 'Momento en el diafragma' },
      { var: 'Tu', unidad: 'tonf', esperado: 17.905, tol: 0.003, desc: 'Fuerza en la cuerda' },
    ],
  },
  blocks: [
    text(`# Generalidades
La losa de cada piso transmite las fuerzas sísmicas a los elementos verticales (muros y pórticos). Se analiza como una **viga horizontal de gran peralte** apoyada en los muros extremos: el cortante lo toma la losa, el momento lo toman las **cuerdas** (vigas de borde) como un par tracción–compresión, y los **colectores** recogen el cortante de la losa y lo entregan a los muros cuando estos no ocupan todo el ancho.

La NTE E.030-2026 exige diafragmas capaces de transmitir las fuerzas de piso pero no define fuerzas mínimas de diafragma; se adopta el criterio del ASCE 7-22 12.10.1.1 ($0.2S_{DS}I_e w_{px} \\le F_{px} \\le 0.4 S_{DS} I_e w_{px}$) con la equivalencia $S_{DS} \\approx 2.5\\,Z U S$ (meseta del espectro elástico E.030), es decir $0.5\\,ZUS\\,w_{px} \\le F_{px} \\le ZUS\\,w_{px}$. Los colectores se amplifican con $\\Omega_0$ (ASCE 7-22 12.10.2.1). La resistencia de la losa se calcula con el ACI 318-19 12.5.3.3 (equivalente en kgf/cm²).`),
    calc(`# Datos
Ld = 24 m // Longitud del diafragma entre muros (luz) [5..80]
Bd = 12 m // Profundidad del diafragma (dirección del sismo) [4..40]
lw = 6 m // Longitud de cada muro extremo [1..40]
wpiso = 1.0 tonf/m^2 // Peso sísmico del piso (CM + 25 % CV) [0.5..1.5]
Cx = 0.20 // Fx/wx del análisis estático del piso (E.030 Art. 35) [0.02..0.6]
Z = 0.45 // Zona 4 (E.030 Tabla 1) [0.45|0.35|0.25|0.10]
U = 1.0 // Categoría C (E.030 Tabla 7) [1.0|1.3|1.5]
S = 1.05 // Suelo S2 en zona 4 (E.030 Tabla 3) [0.8..2.0]
Omega0 = 2.5 // Sobrerresistencia de colectores (ASCE 7-22 Tabla 12.2-1, muros de C°A°) [2..3]
te = 5 cm // Espesor de losa que resiste el cortante (losa superior de 5 cm en aligerados) [5..30]
fc = 210 kgf/cm^2 // Concreto [175..420]
fy = 4200 kgf/cm^2 // Acero [2800..5000]
rhot = 0.0018 // Cuantía de la malla de la losa en la dirección del sismo [0.0012..0.01]
phiv = 0.75 // φ de cortante del diafragma ≤ φ de cortante de los muros (ACI 318-19 21.2.4.2) [0.60|0.75]
Acol = 25 cm*50 cm // Sección del colector (viga en el eje del muro) [200..5000]
Ddrift = 15 mm // Desplazamiento relativo de entrepiso promedio (análisis sísmico) [1..100]
# Fuerza de diseño del diafragma
wpx = wpiso*Ld*Bd -> tonf // Peso del piso
Fpx = min(max(Cx, 0.5*Z*U*S), Z*U*S)*wpx -> tonf // Fpx con límites 0.5ZUS y ZUS (equivalencia ASCE 7-22 12.10.1.1)
wd = Fpx/Ld -> tonf/m // Carga distribuida en el diafragma
check Ld/Bd <= 3 // Relación de aspecto ≤ 3 (ASCE 7-22 12.3.1.2, diafragma de concreto idealizable como rígido)
# Análisis como viga horizontal
Vud = wd*Ld/2 -> tonf // Cortante en los apoyos (muros)
Mud = wd*Ld^2/8 -> tonf*m // Momento máximo al centro
vu = Vud/Bd -> tonf/m // Cortante por unidad de longitud en la línea del muro
# Resistencia a cortante de la losa (ACI 318-19 12.5.3.3)
phivn = phiv*te*(0.53*sqrtfc(fc) + rhot*fy)*1 m -> tonf // φVn por metro: Acv(0.17√f'c + ρt·fy) en kgf/cm²
check vu*1 m <= phivn // Cortante del diafragma (ACI 318-19 12.5.3.3)
check vu*1 m <= phiv*2.12*sqrtfc(fc)*te*1 m // Límite superior 0.66√f'c Acv (12.5.3.4)
# Cuerdas (12.5.2)
jd = 0.95*Bd // Brazo entre cuerdas (ejes de las vigas de borde)
Tu = Mud/jd -> tonf // Fuerza de tracción/compresión en las cuerdas
Asc = Tu/(0.9*fy) -> cm^2 // Acero adicional de cuerda (φ = 0.90)
nch = max(2, ceil(Asc/Ab(5))) // Barras #5 adicionales continuas en la viga de borde
check nch*Ab(5) >= Asc // Acero de cuerda colocado (ACI 318-19 12.5.2.3)
# Colectores (ASCE 7-22 12.10.2.1; ACI 318-19 12.5.4 y 18.12.7)
Fc = vu*(Bd - lw)/2 -> tonf // Fuerza en el colector al llegar al muro
Fcm = Omega0*Fc -> tonf // Amplificada por Ω0
Ascol = Fcm/(0.9*fy) -> cm^2 // Acero del colector (ACI 318-19 12.5.4)
ncol = max(2, ceil(Ascol/Ab(5))) // Barras #5 continuas a lo largo del colector y ancladas en el muro
check ncol*Ab(5) >= Ascol // Acero del colector (ACI 318-19 12.5.4)
check Fcm/Acol <= 0.5*fc // Compresión con Ω0 ≤ 0.5 f'c: no requiere confinamiento especial (18.12.7.6)
# Rigidez del diafragma (ASCE 7-22 12.3.1.3)
Ecd = 15000*sqrtfc(fc) // Módulo del concreto
Id = te*Bd^3/12 -> m^4 // Inercia de la losa como viga horizontal
deltad = (5*wd*Ld^4/(384*Ecd*Id) + wd*Ld^2/(8*Ecd/2.4*te*Bd)) -> mm // Flecha por flexión + cortante
check deltad <= 2*Ddrift // Diafragma no flexible (δ ≤ 2Δ): se acepta la hipótesis de diafragma rígido
"Cuerdas: {nch} #5 continuas en cada viga de borde (empalmes clase B); colectores: {ncol} #5 en la prolongación del eje de cada muro, anclados ℓd dentro del muro.`),
    { type: 'exDiafragma', L: 'Ld', B: 'Bd', lw: 'lw', w: 'wd', Tu: 'Tu', Fc: 'Fcm', titulo: '' },
    summary(),
  ],
};

// ---------------------------------------------------------------------
// 7) PASE AÉREO DE TUBERÍA
// ---------------------------------------------------------------------
const paseAereo = {
  id: 'ex-pase-aereo', pais: 'PE', cat: 'Puentes', icon: 'bridge',
  normas: 'Teoría del cable parabólico (Irvine 1981) · NTE E.020 (viento) · ' + E060 + ' (torres y cámaras) · Guías de pases aéreos del PNSR / MVCS · NTE E.050',
  name: 'Pase aéreo de tubería (cable, péndolas, torres y cámaras de anclaje)',
  desc: 'Cable principal parabólico: tensión horizontal, tensión máxima, longitud, selección del cable 6×19 por factor de seguridad, péndolas, torres de concreto con flexocompresión y esbeltez, fiadores y cámaras de anclaje por deslizamiento y arrancamiento.',
  titulo: 'Diseño estructural de pase aéreo de tubería',
  validacion: {
    fuente: 'Control: cable parabólico H = (wL²/8 + PL/4)/f, V = wL/2 + P/2, Tmáx = √(H² + V²)',
    nota: 'Valores de control de esta implementación (comprobados a mano en tests/extras.test.mjs).',
    valores: [
      { var: 'Hc', unidad: 'tonf', esperado: 1.6886, tol: 0.002, desc: 'Tensión horizontal' },
      { var: 'Tmax', unidad: 'tonf', esperado: 1.8007, tol: 0.002, desc: 'Tensión máxima en la torre' },
      { var: 'Trot', unidad: 'tonf', esperado: 12.07, tol: 0.003, desc: 'Rotura del cable 1/2" EIPS' },
    ],
  },
  blocks: [
    text(`# Generalidades
Pase aéreo para una tubería de agua (línea de conducción) que cruza una quebrada. La tubería cuelga de **péndolas** fijadas a un **cable principal** que forma una parábola entre dos **torres** de concreto armado; detrás de cada torre el cable continúa como **fiador** hasta una **cámara de anclaje** (bloque de concreto) enterrada. Es una solución muy usada en saneamiento rural (PNSR) y en canales y líneas de conducción en sierra y selva.

Hipótesis: carga uniforme por unidad de luz → el cable adopta una **parábola** con $H = wL^2/(8f)$; el cable pasa por una silla en la torre (misma tensión a ambos lados) y la diferencia de componentes horizontales flexiona la torre. El viento sobre la tubería (E.020) inclina el plano del cable; se combina vectorialmente con la carga vertical.`),
    calc(`# Datos
## Geometría
Lc = 40 m // Luz entre ejes de torres [10..150]
fcab = 4.0 m // Flecha del cable (L/9 a L/11) [0.5..20]
ht = 5.5 m // Altura de la torre sobre el terreno [2..15]
Lf = 9 m // Distancia horizontal torre–cámara de anclaje [3..30]
sp = 2.0 m // Separación de péndolas [1..4]
## Cargas
wtub = 25 kgf/m // Tubería llena de agua (p. ej. HG 4" + agua) [2..200]
wacc = 3 kgf/m // Péndolas, abrazaderas y accesorios [0..30]
Pm = 100 kgf // Carga puntual de mantenimiento al centro (una persona con herramientas) [0..300]
Dtub = 11.4 cm // Diámetro exterior de la tubería [2..60]
V = 75 km/h // Velocidad básica del viento (E.020 Anexo 2; ≥ 75 km/h) [75..130]
## Cable principal y péndolas (6×19 alma de acero)
dcab = 0.5 in // Cable principal [0.5 in|0.625 in|0.75 in|0.875 in|1 in] [0.25 in..1.25 in]
dpen = 0.25 in // Péndolas [0.25 in|0.375 in] [0.25 in..0.5 in]
FSc = 3.0 // Factor de seguridad mínimo de cables (práctica 3–5) [2..6]
## Torre de concreto armado (columna cuadrada)
bt = 40 cm // Lado de la columna [25..100]
fc = 210 kgf/cm^2 // Concreto [175..420]
fy = 4200 kgf/cm^2 // Acero [2800..4200]
nbt = 8 // Barras longitudinales [4..16]
bart = 6 // Barra [5 : 5/8"|6 : 3/4"|8 : 1"]
## Cámara de anclaje
BA = 1.8 m // Ancho [0.5..5]
LA = 1.8 m // Largo [0.5..5]
HA = 1.5 m // Altura [0.5..4]
mu = 0.55 // Coeficiente de fricción concreto–suelo (E.050; tan δ) [0.3..0.7]
# Cargas sobre el cable
wcab = cablePeso(dcab) // Peso del cable principal
wv = wtub + wacc + wcab -> kgf/m // Carga vertical uniforme
Vh = VhE020(V, ht) // Velocidad de diseño (E.020 Art. 12.3)
wh = PhE020(0.7, Vh)*Dtub -> kgf/m // Viento sobre la tubería, C = 0.7 (superficies cilíndricas, E.020 Tabla 4)
wr = sqrt(wv^2 + wh^2) -> kgf/m // Carga resultante en el plano del cable
# Cable principal (parábola)
nfl = fcab/Lc // Relación flecha/luz
check nfl >= 1/12 // Flecha ≥ L/12 (tensiones moderadas; práctica de puentes colgantes, Irvine 1981)
check nfl <= 1/8 // Flecha ≤ L/8 (altura de torres razonable; Irvine 1981)
Hc = (wr*Lc^2/8 + Pm*Lc/4)/fcab -> tonf // Tensión horizontal
Vc = wr*Lc/2 + Pm/2 -> tonf // Componente vertical en la torre
Tmax = sqrt(Hc^2 + Vc^2) -> tonf // Tensión máxima (en la torre)
Scab = Lc*(1 + 8/3*nfl^2 - 32/5*nfl^4) // Longitud del cable entre torres
Trot = cableRot(dcab) // Carga de rotura mínima 6×19 IWRC EIPS
FSp = Trot/Tmax // Factor de seguridad del cable principal
check FSp >= FSc // Cable principal (FS mínimo de cables, guías PNSR)
## Péndolas
Tpen = wv*sp + Pm -> kgf // Tensión en la péndola más cargada
check cableRot(dpen)/Tpen >= FSc // Péndola (FS mínimo de cables, guías PNSR)
# Fiador y torre
a1 = atan(4*fcab/Lc) -> deg // Inclinación del cable en la torre
a2 = atan((ht - 0.3 m)/Lf) -> deg // Inclinación del fiador
check abs(a2 - a1) <= 15 deg // Ángulos similares: fuerza horizontal pequeña sobre la torre (práctica de diseño de torres con silla)
Hd = Tmax*abs(cos(a1) - cos(a2)) -> tonf // Desequilibrio horizontal en la silla
Pv = Tmax*(sin(a1) + sin(a2)) -> tonf // Carga vertical de los cables sobre la torre
Wt = 2.4 tonf/m^3*bt^2*ht -> tonf // Peso propio de la torre
qt = PhE020(1.5, Vh)*bt -> kgf/m // Viento sobre la torre, C = 1.5 (elemento con dimensión corta, E.020 Tabla 4)
Pu = 1.4*(Pv + Wt) -> tonf // Carga axial última (E.060 9.2.1, cables como CM)
Mu = max(1.4*Hd*ht, 1.25*(Hd*ht + qt*ht^2/2)) -> tonf*m // Momento en la base (E.060 9.2.1 y 9.2.2)
## Esbeltez de la torre en voladizo (E.060 10.11 y 10.13)
kl = 2*ht // Longitud efectiva (k = 2, voladizo)
check kl/(0.3*bt) <= 100 // klu/r ≤ 100 (E.060 10.11.5)
EIt = 0.4*15000*sqrtfc(fc)*bt^4/12/(1 + 0.6) -> tonf*m^2 // EI = 0.4EcIg/(1 + βd) (E.060 10.12.3)
Pc = pi^2*EIt/kl^2 -> tonf // Carga crítica
dlt = max(1, 1/(1 - Pu/(0.75*Pc))) // Magnificación de momentos (Cm = 1)
Mc = dlt*Mu -> tonf*m // Momento amplificado
## Resistencia de la sección (flexocompresión simplificada)
Ast = nbt*Ab(bart) // Acero longitudinal
check Ast/bt^2 >= 0.01 // Cuantía mínima 1 % (E.060 10.9.1)
phiPn = 0.70*0.80*(0.85*fc*(bt^2 - Ast) + fy*Ast) -> tonf // φPn,máx (E.060 10.3.6.2)
check Pu <= 0.1*fc*bt^2 // Carga axial baja (Pu ≤ 0.1f'cAg): se verifica como elemento en flexión (E.060 10.3.5; conservador)
dt = bt - 6 cm // Peralte efectivo
phiMn = 0.9*Ast/2*fy*(dt - Ast/2*fy/(1.7*fc*bt)) -> tonf*m // φMn con la mitad del acero en tracción (despreciando P, conservador)
check Mc <= phiMn // Flexión en la base de la torre (E.060 10.13)
check Pu <= phiPn // Compresión (E.060 10.3.6.2)
# Cámara de anclaje (estabilidad)
WA = 2.3 tonf/m^3*BA*LA*HA -> tonf // Peso de concreto ciclópeo
T2 = Tmax // Tensión del fiador (silla sin fricción)
FSdes = mu*(WA - T2*sin(a2))/(T2*cos(a2)) // Deslizamiento (sin empuje pasivo, conservador)
check FSdes >= 1.5 // FS al deslizamiento ≥ 1.5 (E.050 39.13.6)
FSarr = WA/(T2*sin(a2)) // Arrancamiento vertical
check FSarr >= 2.0 // FS al arrancamiento ≥ 2.0 (práctica para bloques de anclaje, E.050 Art. 39)
check T2 <= 0.5*fy*Ab(8) // Barra de anclaje de 1" (lisa con ojo): σ ≤ 0.5 fy (esfuerzo admisible ≈ 0.5 fy, práctica)`),
    { type: 'exCable', L: 'Lc', f: 'fcab', ht: 'ht', Lf: 'Lf', sp: 'sp', H: 'Hc', Tmax: 'Tmax', titulo: '' },
    summary(),
  ],
};

// ---------------------------------------------------------------------
// 8) MURO ANCLADO
// ---------------------------------------------------------------------
const muroAnclado = {
  id: 'ex-muro-anclado', pais: 'PE', cat: 'Muros de contención', icon: 'wall',
  normas: 'FHWA-IF-99-015 (GEC-4) Ground Anchors and Anchored Systems · PTI DC35.1-14 · NTE E.050 Art. 39 · ' + E060,
  name: 'Muro anclado para sótanos (anclajes postensados)',
  desc: 'Envolvente aparente trapezoidal (Terzaghi–Peck / GEC-4), cargas por anclaje por áreas tributarias, número de torones, longitud libre más allá de la cuña activa, longitud de bulbo por adherencia, pantalla de concreto a flexión y punzonamiento bajo la placa.',
  titulo: 'Diseño de muro anclado con anclajes postensados',
  validacion: {
    fuente: 'Control: FHWA GEC-4 (Sabatini et al. 1999) Fig. 26 (carga total 0.65·Ka·γ·H², método del área tributaria)',
    nota: 'Valores de control: Ka(35°) = 0.2710; Pt = 0.65·0.271·2.0·9² = 28.53 t/m; p = Pt/(H − H1/3 − Hn+1/3) = 3.566 t/m² (+ Ka·q).',
    valores: [
      { var: 'Ka', esperado: 0.27099, tol: 0.001, desc: 'Ka de Rankine φ = 35°' },
      { var: 'pe', unidad: 'tonf/m^2', esperado: 3.5666, tol: 0.003, desc: 'Presión aparente máxima del suelo' },
      { var: 'Ti', unidad: 'tonf/m', esperado: 11.513, tol: 0.003, desc: 'Carga horizontal en fila intermedia' },
      { var: 'DL', unidad: 'tonf', esperado: 35.76, tol: 0.003, desc: 'Carga de diseño del anclaje' },
    ],
  },
  blocks: [
    text(`# Generalidades
Muro pantalla de concreto armado construido por paños descendentes (método típico de Lima para sótanos) y sostenido temporalmente por **anclajes postensados** de torones con bulbo inyectado. Se sigue la FHWA GEC-4 (Sabatini, Pass y Bachus 1999) y el PTI DC35.1:

1. Envolvente **aparente trapezoidal** de presiones para suelos granulares: carga total $P_t = 0.65\\,K_a\\gamma H^2$ (1.3 veces el empuje de Rankine) y $p = P_t/(H - H_1/3 - H_{n+1}/3)$.
2. Cargas por anclaje por el **método de las áreas tributarias** (GEC-4 Fig. 26).
3. Longitud libre que sobrepasa la cuña activa $45° + \\phi/2$ en $\\max(1.5\\,m,\\,0.2H)$ y ≥ 4.5 m; bulbo por adherencia con FS = 2.0 y entre 4.5 y 12 m.
4. Torones de 0.6": carga de diseño ≤ 0.60 $f_{pu}$, bloqueo ≤ 0.70 $f_{pu}$, prueba 1.33 DL ≤ 0.80 $f_{pu}$.

La estabilidad global (Kranz, superficie profunda) y el empotramiento bajo el fondo se verifican aparte con el estudio de suelos (E.050 Art. 39).`),
    calc(`# Datos
## Suelo (EMS, E.050)
gammas = 2.0 tonf/m^3 // Peso unitario (grava arenosa de Lima ≈ 2.0–2.2) [1.5..2.3]
phis = 35 deg // Ángulo de fricción [25..45]
qsc = 1.0 tonf/m^2 // Sobrecarga de vecinos y tránsito [0..5]
tau = 40 tonf/m^2 // Adherencia última bulbo–suelo (GEC-4 Tabla 7: grava densa inyectada 0.3–0.6 MPa) [5..100]
## Geometría
H = 9.0 m // Profundidad de excavación (3 sótanos) [3..25]
nf = 3 // Número de filas de anclajes [2..6]
H1 = 1.5 m // Profundidad de la primera fila [1..3]
Hb = 1.5 m // Distancia de la última fila al fondo [0.5..3]
sh = 3.0 m // Separación horizontal de anclajes [1.5..4]
theta = 15 deg // Inclinación bajo la horizontal [10..30]
Db = 15 cm // Diámetro de la perforación (bulbo) [10..30]
## Torones y pantalla
Fpu = 26.6 tonf // Rotura de un torón de 0.6" grado 270 (260.7 kN, ASTM A416) [18..30]
tw = 30 cm // Espesor de la pantalla [20..60]
fc = 210 kgf/cm^2 // Concreto [175..350]
fy = 4200 kgf/cm^2 // Acero [2800..4200]
cpl = 30 cm // Lado de la placa de apoyo del anclaje [20..50]
# Envolvente aparente de presiones (GEC-4 5.2)
Ka = KaRankine(phis) // Coeficiente activo de Rankine
sv = (H - H1 - Hb)/(nf - 1) // Separación vertical entre filas
check sv <= 3.5 m // Separación vertical usual ≤ 3.5 m (GEC-4 Cap. 5, control de la flexión de la pantalla)
Pt = 0.65*Ka*gammas*H^2 -> tonf/m // Carga total (1.3 × Rankine)
pe = Pt/(H - H1/3 - Hb/3) -> tonf/m^2 // Ordenada máxima de la envolvente trapezoidal
pq = Ka*qsc -> tonf/m^2 // Presión por sobrecarga (uniforme)
pt = pe + pq // Presión total de diseño
# Cargas horizontales por metro (áreas tributarias, GEC-4 Fig. 26)
T1 = (2/3*H1 + sv/2)*pt -> tonf/m // Primera fila
Ti = sv*pt -> tonf/m // Filas intermedias
Tn = (sv/2 + 23/48*Hb)*pt -> tonf/m // Última fila
Rb = 3/16*Hb*pt -> tonf/m // Reacción en el fondo (la toma el empotramiento)
Th = max(T1, Ti, Tn) // Fila más cargada
DL = Th*sh/cos(theta) -> tonf // Carga de diseño del anclaje (en la dirección del tendón)
# Tendón (PTI DC35.1-14; GEC-4 Tabla 8)
nto = ceil(DL/(0.60*Fpu)) // Número de torones
check DL <= 0.60*nto*Fpu // Carga de diseño ≤ 0.60 fpu (PTI DC35.1; GEC-4 Tabla 8)
check 1.33*DL <= 0.80*nto*Fpu // Carga de prueba 1.33 DL ≤ 0.80 fpu (PTI DC35.1; GEC-4 Tabla 8)
LO = DL // Carga de bloqueo (lock-off) = 1.0 DL
check LO <= 0.70*nto*Fpu // Bloqueo ≤ 0.70 fpu (PTI DC35.1; GEC-4 Tabla 8)
# Longitud libre (GEC-4 Fig. 33)
beta = 45 deg + phis/2 // Inclinación del plano de falla activa
xs1 = (H - H1)/(cos(theta)*tan(beta) + sin(theta)) -> m // Distancia hasta la cuña desde la fila 1 (a lo largo del anclaje)
Lfree = max(roundup(xs1 + max(1.5 m, 0.2*H), 0.5 m), 4.5 m) // Libre ≥ cuña + máx(1.5 m, 0.2H) y ≥ 4.5 m
xsn = (Hb)/(cos(theta)*tan(beta) + sin(theta)) -> m // Distancia hasta la cuña desde la última fila
Lfreen = max(roundup(xsn + max(1.5 m, 0.2*H), 0.5 m), 4.5 m) // Libre de la última fila
# Bulbo (adherencia, FS = 2.0)
Lbreq = 2.0*DL/(pi*Db*tau) -> m // Longitud requerida
Lbd = max(roundup(Lbreq, 0.5 m), 4.5 m) // Bulbo adoptado (≥ 4.5 m para torones)
check Lbd <= 12 m // Bulbo ≤ 12 m (GEC-4: más allá la transferencia no es eficiente)
check pi*Db*tau*Lbd/DL >= 2.0 // FS de adherencia ≥ 2.0 (GEC-4 Cap. 5)
# Pantalla de concreto armado (E.060)
Mu = 1.7*pt*max(sv, sh)^2/10*1 m -> tonf*m // Momento por metro, losa continua sobre anclajes (E.060 9.2.4: empuje 1.7)
dw = tw - 5 cm - 0.8 cm // Peralte efectivo
Asw = max(asFlex(Mu, 100 cm, dw, fc, fy), 0.0018*100 cm*tw) // Acero por metro, cada cara y dirección
sepw = rounddown(min(Ab(5)/Asw*100 cm, 30 cm), 2.5 cm) // Espaciamiento con 5/8"
check Ab(5)/sepw*100 cm >= Asw // Acero colocado (E.060 10.5.4)
## Punzonamiento bajo la placa (E.060 11.12)
Pu = 1.7*DL -> tonf // Carga de diseño amplificada con el factor de empuje (E.060 9.2.4)
bo = 4*(cpl + dw) // Perímetro crítico
phiVc = 0.85*1.06*sqrtfc(fc)*bo*dw -> tonf // Resistencia al punzonamiento (11.12.2.1 c)
check Pu <= phiVc // Punzonamiento (E.060 11.12.2.1)
"Anclajes de {nto} torones de 0.6\\" @ {sh} en {nf} filas; longitud libre {Lfree} (fila 1) y {Lfreen} (última fila); bulbo {Lbd} de Ø {Db}. Pantalla de {tw} con 5/8\\" @ {sepw} en ambas caras y direcciones (refuerzo adicional en las zonas de anclaje).`),
    { type: 'exAnclado', H: 'H', H1: 'H1', n: 'nf', sv: 'sv', theta: 'theta', phi: 'phis', Lf: 'Lfree', Lb: 'Lbd', p: 'pt', titulo: '' },
    { type: 'table', columnas: 'Fila = [1, "intermedias", nf]\nProfundidad [m] = [H1, "—", H - Hb]\nT horizontal [tonf/m] = [T1, Ti, Tn]\nCarga por anclaje [tonf] = [T1*sh/cos(theta), Ti*sh/cos(theta), Tn*sh/cos(theta)]', dec: '2', titulo: 'Cargas en los anclajes por áreas tributarias' },
    summary(),
  ],
};

// ---------------------------------------------------------------------
// 9) PANEL PUBLICITARIO MONOPOSTE
// ---------------------------------------------------------------------
const letrero = {
  id: 'ex-letrero', pais: 'PE', cat: 'Acero estructural', icon: 'column',
  normas: 'NTE E.020 Art. 12 (viento) · ASCE/SEI 7-22 29.3.4 (excentricidad en letreros) · AISC 360-16 F8, G5, H3 / NTE E.090 · ACI 318-19 Cap. 17 · NTE E.050',
  name: 'Panel publicitario monoposte (viento, poste tubular y zapata)',
  desc: 'Presión de viento E.020 sobre el panel (C = 1.5) y el poste, momento y torsión por excentricidad 0.2B, poste tubular (flexión F8, torsión H3, interacción), deflexión, pernos de anclaje y zapata por volteo y presiones.',
  titulo: 'Diseño de panel publicitario monoposte',
  validacion: {
    fuente: 'Control: E.020 Art. 12 (Vh = V(h/10)^0.22, Ph = 0.005·C·Vh²) y AISC 360-16 F8',
    nota: 'Valores de control: Vh = 75·(12/10)^0.22 = 78.08 km/h; Ph = 0.005·1.5·78.08² = 45.72 kgf/m²; F = Ph·12·4 = 2.195 tonf.',
    valores: [
      { var: 'Vh', unidad: 'km/h', esperado: 78.082, tol: 0.001, desc: 'Velocidad de diseño' },
      { var: 'Fp', unidad: 'tonf', esperado: 2.1947, tol: 0.002, desc: 'Fuerza sobre el panel' },
      { var: 'phiMn', unidad: 'tonf*m', esperado: 52.38, tol: 0.005, desc: 'φMn del tubo 20" × 9.53 mm' },
    ],
  },
  blocks: [
    text(`# Generalidades
Panel publicitario (letrero) sostenido por un solo poste tubular de acero empotrado en una zapata aislada. La acción dominante es el **viento**: la NTE E.020 Art. 12 da la velocidad de diseño $V_h = V(h/10)^{0.22}$ y la presión $P_h = 0.005\\,C\\,V_h^2$ con $C = 1.5$ para anuncios (Tabla 4). Para la torsión del poste se considera la resultante desplazada $0.2B$ del eje (ASCE 7-22 29.3.4, caso B). El poste se diseña con el AISC 360-16 (igual a la NTE E.090) y la combinación $1.2D + 1.6W$; la estabilidad de la zapata se verifica con cargas de servicio.`),
    calc(`# Datos
## Panel y viento
Bp = 12.0 m // Ancho del panel [2..20]
Hp = 4.0 m // Altura del panel [1..8]
hc = 8.0 m // Altura libre bajo el panel [2..20]
V = 75 km/h // Velocidad básica (E.020 Anexo 2, ≥ 75 km/h) [75..130]
Cp = 1.5 // Factor de forma de anuncios (E.020 Tabla 4) [1.2..2.0]
wpan = 40 kgf/m^2 // Peso de la estructura del panel y la lona [10..100]
gW = 1.6 // Factor de carga de viento (ASCE 7 / AISC: 1.6 con velocidad de servicio) [1.3|1.6]
## Poste (tubo ASTM A53 Gr. B / A500)
Dp = 508 mm // Diámetro exterior [168 mm|219 mm|273 mm|324 mm|406 mm|508 mm|610 mm] [100..1000]
tp = 9.53 mm // Espesor [4..25]
Fy = 2460 kgf/cm^2 // Fluencia (A53 Gr. B: 35 ksi) [2400..3600]
Es = 2040000 kgf/cm^2 // Módulo del acero [2000000..2100000]
## Pernos de anclaje (ASTM F1554 Gr. 55)
nb = 8 // Número de pernos en círculo [4..16]
dbp = 1.5 in // Diámetro del perno [1 in|1.25 in|1.5 in|1.75 in|2 in] [0.75 in..2.5 in]
Fub = 5273 kgf/cm^2 // Resistencia última (75 ksi) [4000..8800]
Dbc = 75 cm // Diámetro del círculo de pernos [30..150]
## Zapata
Bz = 3.5 m // Lado de la zapata cuadrada [1.5..8]
hz = 0.70 m // Peralte [0.4..1.5]
Df = 2.0 m // Profundidad de desplante [1..4]
gammas = 1.8 tonf/m^3 // Relleno [1.4..2.2]
qa = 15 tonf/m^2 // Capacidad admisible (EMS) [5..60]
# Viento (E.020 Art. 12)
Ht = hc + Hp // Altura total
Vh = VhE020(V, Ht) // Velocidad de diseño en la parte superior
Ph = PhE020(Cp, Vh) // Presión sobre el panel
Ap = Bp*Hp // Área expuesta
Fp = Ph*Ap -> tonf // Fuerza resultante sobre el panel
zp = hc + Hp/2 // Altura de aplicación
Fpo = PhE020(0.7, Vh)*Dp*hc -> tonf // Viento sobre el poste (C = 0.7, cilindro)
Mw = Fp*zp + Fpo*hc/2 -> tonf*m // Momento de servicio en la base
Tw = Fp*0.2*Bp -> tonf*m // Torsión por excentricidad 0.2B (ASCE 7-22 29.3.4 caso B)
# Poste (AISC 360-16)
Ag = pi*(Dp - tp)*tp -> cm^2 // Área
Zp = (Dp - tp)^2*tp -> cm^3 // Módulo plástico de tubo delgado
Sp = pi*(Dp - tp)^2*tp/4 -> cm^3 // Módulo elástico
Ip = pi*(Dp - tp)^3*tp/8 -> cm^4 // Inercia
check Dp/tp <= 0.45*Es/Fy // Límite D/t ≤ 0.45E/Fy (F8.1)
lam = Dp/tp // Esbeltez de la pared
check lam <= 0.07*Es/Fy // Sección compacta en flexión (Tabla B4.1b caso 20): Mn = Mp
phiMn = 0.9*Fy*Zp -> tonf*m // φMn (F8-1)
Wd = (wpan*Ap + 7850 kgf/m^3*Ag*hc) -> tonf // Peso propio del panel y el poste
Pu = 1.2*Wd // Carga axial última
Mu = gW*Mw // Momento último
Vu = gW*(Fp + Fpo) // Cortante último
Tu = gW*Tw // Torsión última
check Mu <= phiMn // Flexión del poste (AISC 360-16 F8.1)
phiTn = 0.9*0.6*Fy*pi*(Dp - tp)^2*tp/2 -> tonf*m // φTn, fluencia por cortante (H3-1, Fcr = 0.6Fy para tubos robustos)
phiVn = 0.9*0.6*Fy*Ag/2 -> tonf // φVn (G5)
phiPn = 0.9*Fy*Ag -> tonf // Compresión (sección compacta, esbeltez baja; conservador sin pandeo)
IH3 = Pu/phiPn + Mu/phiMn + (Vu/phiVn + Tu/phiTn)^2 // Interacción AISC H3-6
check IH3 <= 1.0 // Flexión + axial + cortante + torsión (H3.2)
## Deflexión de servicio
dtop = Fp*zp^2*(3*Ht - zp)/(6*Es*Ip) -> cm // Desplazamiento en la cima por la fuerza del panel
check dtop <= Ht/100 // Límite usual H/100 para letreros (criterio de servicio, ASCE 7-22 C.1.2)
# Pernos de anclaje
Tb = 4*Mu/(nb*Dbc) - Pu/nb -> tonf // Tracción en el perno más esforzado
Abp = pi*dbp^2/4 -> cm^2 // Área nominal
phiRt = 0.75*0.75*Fub*Abp -> tonf // φRn = 0.75·Fnt·Ab con Fnt = 0.75Fu (AISC J3)
check Tb <= phiRt // Tracción en pernos (AISC 360-16 J3.6)
# Zapata (estabilidad con cargas de servicio)
Wz = 2.4 tonf/m^3*Bz^2*hz + gammas*Bz^2*(Df - hz) + Wd -> tonf // Peso de zapata, relleno, poste y panel
Mo = Mw + (Fp + Fpo)*Df -> tonf*m // Momento de volteo en la base de la zapata
FSv = Wz*Bz/2/Mo // Factor de seguridad al volteo
check FSv >= 1.5 // Volteo (E.020 Art. 21; E.050)
ez = Mo/Wz -> m // Excentricidad
check ez <= Bz/6 // Resultante en el tercio central, sin levantamiento (E.050 Art. 21)
qmax = Wz/Bz^2*(1 + 6*ez/Bz) -> tonf/m^2 // Presión máxima
check qmax <= qa // Presión admisible (E.050 Art. 21)
FSd = 0.5*Wz/(Fp + Fpo) // Deslizamiento (μ = 0.5, sin pasivo)
check FSd >= 1.5 // Deslizamiento (E.050 Art. 39)`),
    { type: 'exLetrero', Bp: 'Bp', Hp: 'Hp', hc: 'hc', Bz: 'Bz', Df: 'Df', F: 'Fp', tubo: 'Tubo Ø {Dp} × {tp}', titulo: '' },
    summary(),
  ],
};

// ---------------------------------------------------------------------
// 10) REFUERZO CON FRP (ACI 440.2R-17)
// ---------------------------------------------------------------------
const frp = {
  id: 'ex-frp', pais: 'US', cat: 'Concreto — normas extranjeras', icon: 'section', settings: { sys: 'si' },
  normas: 'ACI 440.2R-17 Cap. 10 y 14 (Ej. 16.3) · ACI 318-14/19',
  name: 'Refuerzo a flexión de viga con FRP (ACI 440.2R-17)',
  desc: 'Límite de reforzamiento, deformación inicial εbi, deformación de despegue εfd, equilibrio iterativo del eje neutro con bloque parabólico, Mns, Mnf con ψf = 0.85, φ por ductilidad, esfuerzos de servicio en acero y FRP (creep-rupture) y longitud de desarrollo.',
  titulo: 'Reforzamiento a flexión de viga de concreto armado con FRP',
  validacion: {
    fuente: 'ACI 440.2R-17, Ejemplo 16.3 «Flexural strengthening of an interior reinforced concrete beam with FRP laminates» (Tabla 16.3c)',
    nota: 'Datos por defecto = datos del ejemplo convertidos a SI (b = 12 in, d = 21.5 in, h = 24 in, 3 #9, f\'c = 5000 psi, fy = 60 ksi, 2 capas de CFRP de 0.040 in × 12 in, ffu* = 90 ksi, εfu* = 0.015, Ef = 5360 ksi). Publicado: εbi = 0.00061, εfd = 0.009 (redondeado; la fórmula da 0.00878, por eso Mnf resulta 2.6 % menor), c = 5.17 in, Mnf = 85 kip-ft, Mns ≈ 292 kip-ft, fs,s = 40.4 ksi.',
    valores: [
      { var: 'ebi', esperado: 0.00061, tolAbs: 0.00002, desc: 'Deformación inicial en la fibra inferior' },
      { var: 'efd', esperado: 0.009, tolAbs: 0.0003, desc: 'Deformación de diseño por despegue' },
      { var: 'cna', unidad: 'in', esperado: 5.17, tol: 0.02, desc: 'Profundidad del eje neutro' },
      { var: 'Mnf', unidad: 'kip*ft', esperado: 85, tol: 0.03, desc: 'Contribución del FRP' },
      { var: 'Mns', unidad: 'kip*ft', esperado: 292, tol: 0.02, desc: 'Contribución del acero' },
      { var: 'fss', unidad: 'ksi', esperado: 40.4, tol: 0.02, desc: 'Esfuerzo de servicio del acero' },
    ],
  },
  blocks: [
    text(`# Generalidades
Viga simplemente apoyada de un almacén cuya sobrecarga aumenta 50 %; tiene cortante y serviciabilidad suficientes pero su resistencia a flexión es insuficiente. Se refuerza con **dos capas de tejido de fibra de carbono (CFRP)** adheridas en la cara inferior por el sistema de laminado húmedo (ACI 440.2R-17 Ej. 16.3). En el Perú este procedimiento es la referencia habitual para reforzamientos (la E.060 no trata el FRP).

Procedimiento ACI 440.2R-17: propiedades de diseño con $C_E$ (Tabla 9.4), deformación inicial $\\varepsilon_{bi}$ por carga muerta, deformación de despegue $\\varepsilon_{fd} = 0.41\\sqrt{f'_c/(nE_ft_f)} \\le 0.9\\varepsilon_{fu}$ (10.1.1), equilibrio del eje neutro con el bloque de esfuerzos parabólico (10.2.10), $\\phi M_n = \\phi(M_{ns} + \\psi_f M_{nf})$ con $\\psi_f = 0.85$ (10.2.10) y comprobaciones de servicio (10.2.8 y 10.2.9).`),
    calc(`# Datos (SI; equivalentes del ejemplo en unidades inglesas)
bv = 304.8 mm // Ancho de la viga (12 in) [150..1000]
hv = 609.6 mm // Peralte total (24 in) [200..1500]
d = 546.1 mm // Peralte efectivo (21.5 in) [150..1450]
Lv = 7.315 m // Luz (24 ft) [2..20]
fc = 34.47 MPa // f'c (5000 psi) [17..55]
fy = 413.7 MPa // fy (60 ksi) [280..520]
Es = 199950 MPa // Módulo del acero (29 000 ksi) [190000..210000]
As = 3*645.16 mm^2 // 3 barras #9 [100..10000]
wD = 14.594 kN/m // Carga muerta (1.00 kip/ft) [0..200]
wL = 26.269 kN/m // Carga viva nueva (1.80 kip/ft) [0..200]
## Sistema FRP (datos del fabricante)
tf = 1.016 mm // Espesor por capa (0.040 in) [0.1..2]
wf = 304.8 mm // Ancho del laminado (12 in) [50..1000]
nly = 2 // Número de capas [1..5]
ffus = 620.5 MPa // Resistencia última garantizada ffu* (90 ksi) [300..4000]
efus = 0.015 // Deformación de rotura εfu* [0.005..0.025]
Ef = 36956 MPa // Módulo del FRP (5360 ksi) [20000..250000]
CE = 0.95 // Factor ambiental: interior, carbono (Tabla 9.4) [0.95|0.85|0.75|0.65|0.50]
psif = 0.85 // Reducción adicional de la contribución del FRP (10.2.10) [0.85]
# Cargas y límite de reforzamiento (9.2)
MDL = wD*Lv^2/8 -> kN*m // Momento por carga muerta
MLL = wL*Lv^2/8 -> kN*m // Momento por carga viva nueva
Ms = MDL + MLL // Momento de servicio
Mu = 1.2*MDL + 1.6*MLL // Momento último requerido
a0 = As*fy/(0.85*fc*bv) // Bloque de compresión sin FRP
phiMn0 = 0.9*As*fy*(d - a0/2) -> kN*m // Resistencia existente
check phiMn0 >= 1.1*MDL + 0.75*MLL // Límite de reforzamiento: la viga sin FRP resiste 1.1D + 0.75L (9.2, Ec. 9.2)
# Propiedades de diseño del FRP (9.4)
ffu = CE*ffus // ffu = CE·ffu*
efu = CE*efus // εfu = CE·εfu*
Af = nly*tf*wf // Área del FRP
df = hv // Profundidad del FRP (cara inferior)
# Estado inicial (10.2.5)
Ec = 4700*sqrtMPa(fc) -> MPa // Módulo del concreto (ACI 318 19.2.2)
nm = Es/Ec // Relación modular
rhos = As/(bv*d) // Cuantía del acero
kcr = sqrt(2*rhos*nm + (rhos*nm)^2) - rhos*nm // Eje neutro agrietado
Icr = bv*(kcr*d)^3/3 + nm*As*(d - kcr*d)^2 -> mm^4 // Inercia agrietada
ebi = MDL*(df - kcr*d)/(Icr*Ec) // Deformación inicial en la cara inferior
# Deformación de diseño del FRP (10.1.1, Ec. 10.1.1)
efd = min(0.41*sqrt(fc/(1 MPa)/(nly*Ef/(1 MPa)*tf/(1 mm))), 0.9*efu) // Despegue intermedio (SI)
# Equilibrio del eje neutro (10.2.10)
cna = cFRP440(As, fy, Es, Af, Ef, d, df, bv, fc, Ec, ebi, efd) // Profundidad del eje neutro por iteración
efe = min(0.003*(df - cna)/cna - ebi, efd) // Deformación efectiva del FRP (Ec. 10.2.5)
ecc = min((efe + ebi)*cna/(df - cna), 0.003) // Deformación del concreto
es = (efe + ebi)*(d - cna)/(df - cna) // Deformación del acero (Ec. 10.2.10 d)
fs = min(Es*es, fy) // Esfuerzo del acero
ffe = Ef*efe // Esfuerzo del FRP
b1 = si(ecc >= 0.003, beta1ACI(fc), b1FRP(ecc, fc, Ec)) // β1 (parabólico si falla el FRP)
a1 = si(ecc >= 0.003, 0.85, a1FRP(ecc, fc, Ec)) // α1
check abs(a1*fc*b1*bv*cna - (As*fs + Af*ffe)) <= 0.005*As*fs // Equilibrio de fuerzas (ACI 440.2R-17 10.2.10)
# Resistencia a flexión (10.2.10)
Mns = As*fs*(d - b1*cna/2) -> kN*m // Contribución del acero
Mnf = Af*ffe*(df - b1*cna/2) -> kN*m // Contribución del FRP
phif = si(es >= 0.005, 0.90, si(es <= fy/Es, 0.65, 0.65 + 0.25*(es - fy/Es)/(0.005 - fy/Es))) // φ por ductilidad (Ec. 10.2.7)
phiMn = phif*(Mns + psif*Mnf) // Resistencia de diseño
check Mu <= phiMn // Flexión con FRP (ACI 440.2R-17 Cap. 10)
# Servicio (10.2.8 y 10.2.9)
rhof = Af/(bv*d) // Cuantía del FRP
ks1 = rhos*Es/Ec + rhof*Ef/Ec // Término auxiliar
ks2 = rhos*Es/Ec + rhof*Ef/Ec*df/d // Término auxiliar con df/d
ksv = sqrt(ks1^2 + 2*ks2) - ks1 // Eje neutro elástico (sección agrietada con FRP)
kd = ksv*d // Profundidad
Mse = Ms + ebi*Af*Ef*(df - kd/3) -> kN*m // Momento de servicio más el efecto de εbi
Kas = As*Es*(d - kd/3)*(d - kd) -> kN*m^2 // Aporte del acero a la rigidez
Kaf = Af*Ef*(df - kd/3)*(df - kd) -> kN*m^2 // Aporte del FRP a la rigidez
Kss = Kas + Kaf // Rigidez de la sección agrietada
fss = Mse*(d - kd)*Es/Kss -> MPa // Esfuerzo del acero en servicio (Ec. 10.2.8 b)
check fss <= 0.80*fy // Acero en servicio ≤ 0.80 fy (Ec. 10.2.8 a)
ffs = fss*Ef/Es*(df - kd)/(d - kd) - ebi*Ef // Esfuerzo del FRP en servicio (Ec. 10.2.9)
check ffs <= 0.55*ffu // Creep-rupture del CFRP ≤ 0.55 ffu (Tabla 10.2.9)
# Detalle (14.1.3)
ldf = sqrt(nly*Ef/(1 MPa)*tf/(1 mm)/sqrtMPa(fc)*1 MPa)*1 mm -> mm // Longitud de desarrollo ℓdf = √(nEftf/√f'c) (Ec. 14.1.3, SI)
"El FRP debe prolongarse al menos ℓdf = {ldf} más allá del punto donde el momento iguala al de fisuración; en los extremos se recomiendan bandas en U de anclaje (14.1.3).`),
    { type: 'exFRP', b: 'bv', h: 'hv', d: 'd', c: 'cna', ec: 'ecc', es: 'es', efe: 'efe', ebi: 'ebi', frp: '{nly} capas de CFRP de {tf} × {wf}', titulo: '' },
    summary(),
  ],
};

// ---------------------------------------------------------------------
// 11) PILOTE DE CONCRETO VACIADO IN SITU — DISEÑO ESTRUCTURAL DEL FUSTE
// ---------------------------------------------------------------------
const piloteFuste = {
  id: 'ex-pilote-fuste', pais: 'PE', cat: 'Cimentaciones', icon: 'column',
  normas: 'ACI 318-19 13.4 y 18.13.5 (pilotes) · ' + E060 + ' (10.2, 10.9, 11) · NTE E.050 · Matlock y Reese (1960) · Reese y Van Impe (2011)',
  name: 'Pilote de concreto: diseño estructural del fuste (axial, lateral y P–M)',
  desc: 'Pilote vaciado in situ con cabeza empotrada en el cabezal: resistencia axial con φ = 0.55 (ACI 318-19 13.4.3), longitud característica T = (EI/nh)^(1/5), momento y desplazamiento por carga lateral (Matlock–Reese), diagrama P–M circular, cortante y espiral de confinamiento.',
  titulo: 'Diseño estructural del fuste de pilote de concreto armado',
  validacion: {
    fuente: 'Control: Matlock y Reese (1960) para pilote largo con cabeza empotrada (M = 0.93·H·T; y = 0.93·H·T³/EI) y ACI 318-19 13.4.3',
    nota: 'Valores de control de esta implementación; T, M y y se recalculan en tests/extras.test.mjs y el φMn circular se contrasta con una integración independiente por fibras.',
    valores: [
      { var: 'Tch', unidad: 'm', esperado: 1.8088, tol: 0.002, desc: 'Longitud característica T' },
      { var: 'Mlat', unidad: 'tonf*m', esperado: 13.457, tol: 0.002, desc: 'Momento en la cabeza por carga lateral' },
      { var: 'phiPn', unidad: 'tonf', esperado: 327.84, tol: 0.002, desc: 'Resistencia axial φPn (φ = 0.55)' },
    ],
  },
  blocks: [
    text(`# Generalidades
Pilote de concreto armado **vaciado in situ sin camisa** (perforado), de cabeza empotrada en un cabezal rígido. La capacidad geotécnica (punta y fuste) se determina con el estudio de suelos y la plantilla «Pilote individual»; aquí se diseña la **sección estructural** del fuste:

- Resistencia axial: $\\phi P_n = \\phi[0.85f'_c(A_g-A_{st}) + f_yA_{st}]$ con $\\phi = 0.55$ para pilotes vaciados sin camisa (ACI 318-19 13.4.3.2).
- Carga lateral sísmica: pilote largo en suelo granular con módulo de reacción creciente $k_h = n_h z$; longitud característica $T = (EI/n_h)^{1/5}$ y coeficientes de Matlock y Reese para cabeza empotrada.
- Flexocompresión: diagrama P–M de la sección circular por compatibilidad de deformaciones (E.060 10.2).
- Cortante (E.060 11, sección circular con $d = 0.8D$) y espiral de confinamiento en la zona de $3D$ bajo el cabezal (ACI 318-19 18.13.5).`),
    calc(`# Datos
D = 60 cm // Diámetro del pilote [30..200]
Lp = 15 m // Longitud del pilote [5..60]
fc = 210 kgf/cm^2 // Concreto (vaciado bajo agua: ≥ 280 recomendado) [210..420]
fy = 4200 kgf/cm^2 // Acero [4200..5000]
nb = 8 // Número de barras longitudinales [6..30]
bar = 6 // Barra longitudinal [5 : 5/8"|6 : 3/4"|8 : 1"]
bare = 3 // Espiral [3 : 3/8"|4 : 1/2"]
rec = 7.5 cm // Recubrimiento libre (concreto contra el terreno, E.060 7.7.1) [7..10]
sesp = 10 cm // Paso de la espiral en la zona confinada [5..15]
## Cargas en la cabeza (del análisis del cabezal, por pilote)
Pu = 120 tonf // Carga axial última máxima [0..1000]
Pmin = 40 tonf // Carga axial última mínima (sismo) [-200..1000]
Vh = 8 tonf // Cortante último en la cabeza (sismo) [0..100]
## Suelo
nh = 500 tonf/m^3 // Constante del módulo de reacción horizontal (arena medianamente densa; Terzaghi 1955) [100..3000]
ylim = 25 mm // Desplazamiento lateral admisible de la cabeza [5..50]
# Propiedades de la sección
Ag = pi*D^2/4 // Área bruta
Ast = nb*Ab(bar) // Acero longitudinal
rhol = Ast/Ag // Cuantía longitudinal
check rhol >= 0.005 // Cuantía mínima de pilotes en zonas sísmicas (ACI 318-19 18.13.5.7.1)
check nb >= 6 // Al menos 6 barras en sección circular (E.060 10.9.2)
dc = rec + db(bare) + db(bar)/2 // Recubrimiento al centro de las barras
# Resistencia axial (ACI 318-19 13.4.3)
phiPn = 0.55*(0.85*fc*(Ag - Ast) + fy*Ast) -> tonf // φ = 0.55 pilote vaciado sin camisa (Tabla 13.4.3.2)
check Pu <= phiPn // Compresión axial
# Carga lateral (Matlock y Reese 1960, pilote largo, cabeza empotrada)
Ec = 15000*sqrtfc(fc) // Módulo del concreto (E.060 8.5.2)
EIp = 0.7*Ec*pi*D^4/64 -> tonf*m^2 // Rigidez a flexión (0.70 EcIg, sección parcialmente fisurada)
Tch = (EIp/nh)^(1/5) -> m // Longitud característica T = (EI/nh)^(1/5)
check Lp >= 4*Tch // Pilote largo (L ≥ 4T): son válidos los coeficientes adimensionales (Matlock y Reese)
Mlat = 0.93*Vh*Tch -> tonf*m // Momento máximo, en la cabeza (coef. Fm = 0.93)
ylat = 0.93*Vh*Tch^3/EIp -> mm // Desplazamiento de la cabeza (coef. Fy = 0.93)
check ylat <= ylim // Desplazamiento lateral admisible (E.050)
# Flexocompresión (E.060 10.2)
phiMn1 = phiMnCirc(Pu, D, dc, nb, bar, fc, fy) // φMn para Pu máximo
phiMn2 = phiMnCirc(Pmin, D, dc, nb, bar, fc, fy) // φMn para Pu mínimo
check Mlat <= phiMn1 // Flexocompresión con Pu máximo (E.060 10.2)
check Mlat <= phiMn2 // Flexocompresión con Pu mínimo (E.060 10.2)`),
    { type: 'exPMcirc', D: 'D', dc: 'dc', nb: 'nb', barra: 'bar', fc: 'fc', fy: 'fy', demandas: 'Pu, Mlat // Pu máx\nPmin, Mlat // Pu mín', titulo: '' },
    calc(`# Cortante (E.060 11.3; ACI 318-19 22.5.2.2, sección circular)
dv = 0.8*D // Peralte efectivo de sección circular
phiVc = 0.85*0.53*sqrtfc(fc)*D*dv -> tonf // φVc con bw = D
Vs = 2*Ab(bare)*fy*dv/sesp -> tonf // Aporte de la espiral (dos ramas por paso)
check Vh <= phiVc + 0.85*Vs // Cortante (E.060 11.1.1)
# Espiral de confinamiento (ACI 318-19 18.13.5.7.1 y 18.7.5.4)
Dcn = D - 2*rec // Diámetro del núcleo
rhosp = 4*Ab(bare)/(Dcn*sesp) // Cuantía volumétrica de la espiral
check rhosp >= 0.12*fc/fy // ρs ≥ 0.12 f'c/fyt en la zona de 3D bajo el cabezal (18.7.5.4 b)
check sesp <= min(6*db(bar), 15 cm) // Paso ≤ 6 db y ≤ 150 mm (18.7.5.3)
Lconf = max(3*D, 1.2 m) // Longitud de la zona confinada bajo el cabezal (ACI 318-19 18.13.5.7.1)
sesp2 = rounddown(4*Ab(bare)/(Dcn*0.06*fc/fy), 2.5 cm) // Paso fuera de la zona confinada (ρs ≥ 0.06 f'c/fyt, 18.13.5.6)
"Refuerzo: {nb} barras #{bar} en toda la longitud (o hasta 2/3 L con la mitad del acero si el momento lo permite); espiral #{bare} con paso {sesp} en los primeros {Lconf} y paso {min(sesp2, 30 cm)} en el resto. Anclar las barras en el cabezal con ℓdg = {ldgE060(bar, fc, fy)}.`),
    summary(),
  ],
};

// ---------------------------------------------------------------------
// 12) REFORZAMIENTO DE COLUMNA CON ENCAMISADO DE CONCRETO ARMADO
// ---------------------------------------------------------------------
const encamisado = {
  id: 'ex-encamisado', pais: 'PE', cat: 'Concreto armado', icon: 'column',
  normas: E060 + ' (10.3.6, 11.7, 21.4) · Eurocódigo 8-3 Anexo A.4.2.2 (elementos encamisados) · ACI 369.1-17 · NTE E.030-2026',
  name: 'Reforzamiento de columna con encamisado de concreto armado',
  desc: 'Columna existente insuficiente: capacidad original, sección encamisada como monolítica con f\'c del concreto existente y factor 0.9 en cortante (EC8-3 A.4.2.2), diagrama P–M, cortante, confinamiento y conectores en la interfaz por cortante-fricción.',
  titulo: 'Reforzamiento de columna con encamisado de concreto armado',
  validacion: {
    fuente: 'Control: E.060 10.3.6.2 (φPn,máx = 0.8·0.7·P0) y 11.7 (cortante-fricción)',
    nota: 'Valores de control: columna existente 30×30, 4 #5, f\'c = 175 → φPn,máx = 0.56·[0.85·175·(900 − 7.96) + 4200·7.96] = 93.03 tonf.',
    valores: [
      { var: 'phiPn0', unidad: 'tonf', esperado: 93.03, tol: 0.002, desc: 'Capacidad axial de la columna existente' },
      { var: 'dPu', unidad: 'tonf', esperado: 56.97, tol: 0.003, desc: 'Carga a transferir por la interfaz' },
      { var: 'Avf', unidad: 'cm^2', esperado: 15.96, tol: 0.003, desc: 'Acero de conectores (cortante-fricción)' },
    ],
  },
  blocks: [
    text(`# Generalidades
Columna existente de un edificio que, por cambio de uso o por la evaluación sísmica con la E.030-2026, no resiste las nuevas cargas. Se refuerza con un **encamisado de concreto armado** en las cuatro caras (vaciado o lanzado), con barras longitudinales que pasan a través de las losas y estribos cerrados.

Criterios: la sección encamisada se diseña como **monolítica** usando el $f'_c$ del concreto existente (el menor) y despreciando las barras existentes (conservador); el Eurocódigo 8-3 (Anexo A.4.2.2) permite tomar la resistencia a flexión del elemento monolítico y reduce la resistencia a cortante a $0.9 V_R$. La transferencia de carga entre el núcleo existente y la camisa se asegura con conectores epóxicos dimensionados por **cortante-fricción** (E.060 11.7, superficie rugosa intencional $\\mu = 1.0$).`),
    calc(`# Datos
## Columna existente
b0 = 30 cm // Lado de la columna existente [20..80]
fc0 = 175 kgf/cm^2 // f'c existente (núcleos diamantinos, NTP 339.059) [100..350]
n0b = 4 // Barras existentes [4..16]
bar0 = 5 // Barra existente [4 : 1/2"|5 : 5/8"|6 : 3/4"]
## Camisa
tj = 10 cm // Espesor de la camisa [7.5..20]
fcj = 210 kgf/cm^2 // f'c de la camisa [175..350]
fy = 4200 kgf/cm^2 // Acero [4200..5000]
barj = 6 // Barra longitudinal de la camisa [5 : 5/8"|6 : 3/4"|8 : 1"]
barc = 4 // Conector epóxico [4 : 1/2"|5 : 5/8"]
bare = 3 // Estribos de la camisa [3 : 3/8"|4 : 1/2"]
hcol = 2.60 m // Altura libre de la columna [2..5]
## Demandas (nuevo análisis)
Pu = 150 tonf // Carga axial última [0..1000]
Mu = 12 tonf*m // Momento último [0..200]
Vu = 15 tonf // Cortante último [0..200]
# Capacidad de la columna existente (E.060 10.3.6.2)
Ast0 = n0b*Ab(bar0) // Acero existente
phiPn0 = 0.80*0.70*(0.85*fc0*(b0^2 - Ast0) + fy*Ast0) -> tonf // Resistencia axial máxima existente
check Pu > phiPn0 // La columna existente NO resiste: se requiere reforzamiento
# Sección encamisada
bj = b0 + 2*tj // Lado de la sección reforzada
check tj >= 7.5 cm // Espesor mínimo práctico de camisa vaciada (ACI 369.1; ≥ 3 in)
fceq = min(fc0, fcj) // f'c de diseño de la sección monolítica (el menor)
dpj = 4 cm + db(bare) + db(barj)/2 // Recubrimiento al centro de las barras de la camisa
Astj = 12*Ab(barj) // 12 barras: 4 por cara (se desprecian las barras existentes)
check Astj/bj^2 >= 0.01 // Cuantía mínima 1 % sobre la sección total (E.060 10.9.1)
phiPnj = 0.80*0.70*(0.85*fceq*(bj^2 - Astj) + fy*Astj) -> tonf // Resistencia axial máxima reforzada
check Pu <= phiPnj // Compresión axial (E.060 10.3.6.2)`),
    { type: 'pm', b: 'bj', h: 'bj', fc: 'fceq', fy: 'fy', dp: 'dpj', nx: '4', ny: '2', barra: 'barj', norma: 'E060', demandas: 'Pu, Mu // Demanda', titulo: 'Diagrama de interacción de la sección encamisada (monolítica, f\'c existente)' },
    calc(`# Cortante (E.060 11.3; EC8-3 A.4.2.2)
dj = bj - dpj // Peralte efectivo
Vc = 0.53*sqrtfc(fceq)*(1 + Pu/(140 kgf/cm^2*bj^2))*bj*dj -> tonf // Aporte del concreto con carga axial (E.060 11-4)
sj = 10 cm // Espaciamiento de estribos en la zona de confinamiento
Vs = 2*Ab(bare)*fy*dj/sj -> tonf // Aporte de los estribos de la camisa
phiVnj = 0.85*0.9*(Vc + Vs) // φVn con la reducción 0.9 de elementos encamisados
check Vu <= phiVnj // Cortante
# Confinamiento (E.060 21.4.5)
check sj <= min(8*db(barj), bj/2, 10 cm) // Espaciamiento en la zona de confinamiento ℓo
Lo = max(bj, hcol/6, 50 cm) // Longitud de la zona de confinamiento
# Conectores en la interfaz (cortante-fricción, E.060 11.7)
dPu = Pu - phiPn0 // Carga que debe transferirse a la camisa
Avf = dPu/(0.85*fy*1.0) -> cm^2 // Avf = Vu/(φ·fy·μ), μ = 1.0 (concreto endurecido rugoso, 11.7.4.3)
nlv = max(ceil(Avf/(4*Ab(barc))), ceil(hcol/(50 cm))) // Niveles de conectores (uno por cara en cada nivel; separación ≤ 50 cm)
nc = 4*nlv // Número total de conectores
check nc*Ab(barc) >= Avf // Acero de conectores
sc = rounddown(hcol/nlv, 5 cm) // Separación vertical de los niveles de conectores
check sc <= 50 cm // Separación máxima práctica de conectores (≤ 50 cm, ACI 369.1 como referencia)
check dPu <= 0.85*0.2*fc0*4*b0*hcol // Límite de cortante-fricción 0.2 f'c Ac en la interfaz (11.7.5)
"Camisa de {tj} con f'c = {fcj}: 12 barras #{barj} continuas a través de las losas (perforaciones rellenas con epóxico), estribos #{bare} @ {sj} en ℓo = {Lo} y @ 20 cm en el resto; {nc} conectores #{barc} con epóxico (un nivel por cada {sc}, uno por cara), anclados 10 db en el núcleo. La superficie existente se escarifica hasta una rugosidad de 6 mm (E.060 11.7.9).`),
    summary(),
  ],
};

export default [escalera2, pisoInd, pavRig, maquina, acople, diafragma, paseAereo, muroAnclado, frp, letrero, piloteFuste, encamisado];
