// Plantillas de memorias de cálculo (NTE E.020 / E.030 / E.050 / E.060, ACI 318, AASHTO LRFD, AISC 360)
const calc = (src) => ({ type: 'calc', src: src.trim() });
const text = (src) => ({ type: 'text', src: src.trim() });

import { EXTRA_TEMPLATES } from './templates/index.js';

const BASE_TEMPLATES = [
  // ------------------------------------------------------------------
  {
    id: 'viga', normas: 'RNE — NTE E.060 Concreto Armado', cat: 'Concreto armado', name: 'Viga — flexión y cortante', icon: 'beam',
    desc: 'Diseño de viga rectangular a flexión simple y cortante según NTE E.060. Cuantías, ductilidad, espaciamientos y sección dibujada.',
    titulo: 'Diseño de viga de concreto armado',
    blocks: [
      text(`# Generalidades
La presente memoria desarrolla el diseño por resistencia de una viga rectangular de concreto armado sometida a flexión simple y fuerza cortante, conforme a la **Norma Técnica E.060 Concreto Armado** del Reglamento Nacional de Edificaciones. Las solicitaciones últimas provienen del análisis estructural con la combinación $U = 1.4\\,CM + 1.7\\,CV$.`),
      calc(`# Datos de diseño
fc = 210 kgf/cm^2 // Resistencia a compresión del concreto [175 kgf/cm^2|210 kgf/cm^2|280 kgf/cm^2|350 kgf/cm^2]
fy = 4200 kgf/cm^2 // Esfuerzo de fluencia del acero (ASTM A615 Gr. 60)
Es = 2000000 kgf/cm^2 // Módulo de elasticidad del acero
b = 30 cm // Ancho de la sección
h = 60 cm // Peralte total
rec = 4 cm // Recubrimiento libre al estribo
bar = 6 // Varilla longitudinal [4 : 1/2"|5 : 5/8"|6 : 3/4"|8 : 1"]
est = 3 // Varilla del estribo [3 : 3/8"|4 : 1/2"]
Mu = 22 tonf*m // Momento último de diseño
Vu = 18 tonf // Cortante último a una distancia "d" de la cara
## Parámetros de la sección
dr = rec + db(est) + db(bar)/2 // Distancia del borde al centroide del acero
d = h - dr // Peralte efectivo
beta1 = si(fc <= 280 kgf/cm^2, 0.85, max(0.65, 0.85 - 0.05*(fc - 280 kgf/cm^2)/(70 kgf/cm^2))) // E.060 Art. 10.2.7.3
phif = 0.90 // Factor de reducción por flexión (E.060 9.3.2.1)`),
      calc(`## Diseño por flexión
Rn = Mu/(phif*b*d^2) // Parámetro de resistencia
rho = 0.85*fc/fy*(1 - sqrt(1 - 2*Rn/(0.85*fc))) // Cuantía requerida
As = rho*b*d // Acero requerido
Asmin = 0.7*sqrtfc(fc)/fy*b*d // Acero mínimo (E.060 Art. 10.5.2)
rhob = 0.85*beta1*fc/fy*(0.003*Es/(0.003*Es + fy)) // Cuantía balanceada
Asmax = 0.75*rhob*b*d // Acero máximo (E.060 Art. 10.3.4)
Asd = max(As, Asmin) // Acero de diseño
n = max(2, ceil(Asd/Ab(bar))) // Número de varillas (mín. 2)
Asc = n*Ab(bar) // Acero colocado
check Asc >= Asd // Acero colocado ≥ acero requerido
check Asc <= Asmax // Falla dúctil (As ≤ 0.75 Asb)
a = Asc*fy/(0.85*fc*b) // Profundidad del bloque equivalente
c = a/beta1 // Profundidad del eje neutro
epst = 0.003*(d - c)/c // Deformación unitaria del acero en tracción
"Deformación $\\varepsilon_t$ = {epst}: referencial ACI 318 (E.060 controla la ductilidad con $\\rho \\le 0.75\\rho_b$).
phiMn = phif*Asc*fy*(d - a/2) -> tonf*m // Momento resistente de diseño
check Mu <= phiMn // Resistencia a flexión
sl = (b - 2*rec - 2*db(est) - n*db(bar))/max(n - 1, 1) // Espaciamiento libre entre varillas
check sl >= max(2.5 cm, db(bar)) // Espaciamiento mínimo (E.060 Art. 7.6.1)`),
      calc(`## Diseño por cortante
phiv = 0.85 // Factor de reducción por cortante (E.060 9.3.2.3)
Vc = 0.53*sqrtfc(fc)*b*d // Resistencia del concreto (E.060 11.3.1.1)
Vs = max(Vu/phiv - Vc, 0 tonf) // Resistencia requerida del refuerzo
Vsmax = 2.1*sqrtfc(fc)*b*d // Límite (E.060 11.5.7.9)
check Vs <= Vsmax // Dimensiones de la sección adecuadas
Av = 2*Ab(est) // Área de refuerzo por cortante (2 ramas)
s1 = si(Vs > 0 tonf, Av*fy*d/Vs, 100 cm) // Espaciamiento requerido por resistencia
smax = si(Vs <= 1.1*sqrtfc(fc)*b*d, min(d/2, 60 cm), min(d/4, 30 cm)) // Espaciamiento máximo (E.060 11.5.5)
s = rounddown(min(s1, smax), 2.5 cm) // Espaciamiento adoptado
phiVn = phiv*(Vc + Av*fy*d/s) -> tonf // Resistencia de diseño a cortante
check Vu <= phiVn // Resistencia a cortante
Avmin = max(0.2*sqrtfc(fc)*b*s/fy, 3.5 kgf/cm^2*b*s/fy) // Refuerzo mínimo por cortante (E.060 11.5.6.3)
check Av >= Avmin // Área mínima de estribos
## Confinamiento en vigas sísmicas (E.060 21.4.4)
so = rounddown(min(d/4, 10*db(bar), 24*db(est), 30 cm), 2.5 cm) // Espaciamiento en zona confinada
Lconf = 2*h // Longitud de confinamiento desde la cara del apoyo
"Distribución de estribos #{est}: 1 @ 5 cm, resto @ {so} en {Lconf} a cada extremo; resto @ {s}.`),
      { type: 'section', b: 'b', h: 'h', recub: 'rec', estribo: 'est', inf: '{n}#{bar}', sup: '2#4', lat: '0', sest: '@ {s}', titulo: 'Sección de diseño de la viga' },
      { type: 'summary' },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'vigacont', normas: 'RNE — NTE E.020 Cargas, E.060 Concreto Armado', cat: 'Concreto armado', name: 'Viga continua — análisis y diseño', icon: 'beam',
    desc: 'Metrado de cargas, análisis por rigidez con alternancia de carga viva, diagramas V-M-δ y diseño del acero positivo y negativo.',
    titulo: 'Análisis y diseño de viga continua',
    blocks: [
      calc(`# Metrado de cargas (NTE E.020)
L1 = 5.0 m // Luz del tramo 1
L2 = 6.0 m // Luz del tramo 2
L3 = 5.0 m // Luz del tramo 3
At = 4.0 m // Ancho tributario
b = 30 cm // Ancho de viga
h = 60 cm // Peralte de viga
gammac = 2.4 tonf/m^3 // Peso específico del concreto armado
wal = 0.30 tonf/m^2 // Peso propio losa aligerada h = 20 cm
wpt = 0.10 tonf/m^2 // Piso terminado
sc = 0.20 tonf/m^2 // Sobrecarga (vivienda) [0.20 tonf/m^2|0.25 tonf/m^2|0.30 tonf/m^2|0.40 tonf/m^2|0.50 tonf/m^2]
fc = 210 kgf/cm^2 // Resistencia del concreto
fy = 4200 kgf/cm^2 // Fluencia del acero
wpp = gammac*b*h -> tonf/m // Peso propio de la viga
wD = wpp + (wal + wpt)*At -> tonf/m // Carga muerta total
wL = sc*At -> tonf/m // Carga viva total
Ec = 15000*sqrtfc(fc) // Módulo de elasticidad (E.060 8.5.1)
Ig = b*h^3/12 // Inercia bruta`),
      text(`## Análisis estructural
Se analiza la viga por el método de rigidez considerando la combinación $U = 1.4\\,CM + 1.7\\,CV$ con **alternancia de la carga viva** en todos los tramos para obtener la envolvente de esfuerzos.`),
      { type: 'beam', tramos: 'L1, L2, L3', apoyos: 'A, A, A, A', E: 'Ec', I: 'Ig', cargas: 'CM: U * 1.4*wD\nCV: U * 1.7*wL', alternancia: true, titulo: 'Envolvente de esfuerzos de la viga continua' },
      calc(`## Diseño del refuerzo longitudinal
d = h - 6 cm // Peralte efectivo
phif = 0.9 // Factor de reducción por flexión
Asreq(M) = 0.85*fc*b*d/fy*(1 - sqrt(1 - 2*M/(0.85*phif*fc*b*d^2)))
Asmin = 0.7*sqrtfc(fc)/fy*b*d // Acero mínimo
As_pos = max(Asreq(Mpos), Asmin) // Acero positivo (máximo de tramos)
As_neg = max(Asreq(abs(Mneg)), Asmin) // Acero negativo (apoyo crítico)
n_pos = ceil(As_pos/Ab(5)) // Varillas de 5/8" (positivo)
n_neg = ceil(As_neg/Ab(5)) // Varillas de 5/8" (negativo)
phiMn_pos = phif*n_pos*Ab(5)*fy*(d - n_pos*Ab(5)*fy/(1.7*fc*b)) -> tonf*m
phiMn_neg = phif*n_neg*Ab(5)*fy*(d - n_neg*Ab(5)*fy/(1.7*fc*b)) -> tonf*m
check Mpos <= phiMn_pos // Flexión positiva
check abs(Mneg) <= phiMn_neg // Flexión negativa
## Control de cortante
phiVc = 0.85*0.53*sqrtfc(fc)*b*d -> tonf // Resistencia del concreto
"Cortante máximo de la envolvente: {Vmax}. Se requieren estribos por resistencia en las zonas donde $V_u > \\phi V_c$.
## Momentos en la cara de apoyos
"Los momentos y cortantes provienen de ejes de apoyo; el diseño en la cara del apoyo (y el cortante a "d") resulta igual o menos exigente.`),
      text(`## Deflexión inmediata por carga viva de servicio
Se analiza la viga con la carga viva **sin factorar** para controlar la deflexión inmediata según la Tabla 9.2 de la NTE E.060.`),
      { type: 'beam', tramos: 'L1, L2, L3', apoyos: 'A, A, A, A', E: 'Ec', I: 'Ig', cargas: 'U * wL', alternancia: false, sufijo: 'CV', titulo: 'Deflexión inmediata por carga viva de servicio' },
      calc(`deltaadm = (L2/360) -> mm // Límite por carga viva inmediata (E.060 Tabla 9.2)
check deltamax_CV <= deltaadm // Deflexión inmediata por CV (sección bruta)`),
      { type: 'summary' },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'columna', normas: 'RNE — NTE E.060 Concreto Armado (Cap. 10 y 21)', cat: 'Concreto armado', name: 'Columna — flexocompresión', icon: 'column',
    desc: 'Diagrama de interacción P–M por compatibilidad de deformaciones, verificación de combinaciones, cuantía y confinamiento sísmico.',
    titulo: 'Diseño de columna de concreto armado',
    blocks: [
      calc(`# Datos de la columna
b = 40 cm // Dimensión perpendicular al plano de flexión
h = 50 cm // Dimensión en el plano de flexión
fc = 280 kgf/cm^2 // Resistencia del concreto [210 kgf/cm^2|280 kgf/cm^2|350 kgf/cm^2]
fy = 4200 kgf/cm^2 // Fluencia del acero
rd = 6 cm // Recubrimiento al centro de las barras
nx = 3 // Barras por cara (paralelas a b)
ny = 2 // Barras intermedias por cara lateral
bar = 6 // Varilla longitudinal [5 : 5/8"|6 : 3/4"|8 : 1"]
ln = 2.70 m // Luz libre de la columna`),
      text(`## Combinaciones de diseño (E.060 Art. 9.2)
Las cargas axiales y momentos últimos se ingresan en el diagrama como pares $(P_u, M_u)$, uno por línea.`),
      { type: 'pm', b: 'b', h: 'h', fc: 'fc', fy: 'fy', dp: 'rd', nx: 'nx', ny: 'ny', barra: 'bar', norma: 'E060', demandas: '180 tonf, 12 tonf*m // 1.4CM+1.7CV\n140 tonf, 22 tonf*m // 1.25(CM+CV)+CS\n95 tonf, 20 tonf*m // 0.9CM+CS', titulo: '' },
      calc(`## Verificaciones complementarias
Ag = b*h // Área bruta
Ast = (2*nx + 2*ny)*Ab(bar) // Acero longitudinal total
rhog = Ast/Ag // Cuantía
check rhog >= 0.01 // Cuantía mínima (E.060 10.9.1)
check rhog <= 0.06 // Cuantía máxima (E.060 21.6.3.1)
check DCpm <= 1.0 // Todas las combinaciones dentro del diagrama
## Confinamiento sísmico — sistema de pórticos (E.060 Art. 21.6.4)
Lo = max(ln/6, max(b, h), 50 cm) -> cm // Longitud de la zona de confinamiento
so = rounddown(min(6*db(bar), min(b, h)/4, 10 cm), 2.5 cm) // Espaciamiento máximo en zona confinada
s_fuera = min(16*db(bar), 48*db(4), min(b, h), 30 cm) // Espaciamiento máximo fuera de la zona
est = 4 // Varilla de estribos [3 : 3/8"|4 : 1/2"]
n_ramas = 3 // Ramas de estribo en la dirección analizada
bc = b - 2*4 cm // Ancho del núcleo confinado (a ejes de estribo exterior)
Ach = (b - 2*4 cm)*(h - 2*4 cm) // Área del núcleo
Ash_req = max(0.3*so*bc*fc/fy*(Ag/Ach - 1), 0.09*so*bc*fc/fy) // Refuerzo transversal de confinamiento
Ash = n_ramas*Ab(est) // Refuerzo colocado
check Ash >= Ash_req // Confinamiento (E.060 21.6.4.2)
"Estribos #{est}: 1 @ 5 cm, resto @ {so} en {roundup(Lo, 5 cm)} desde cada extremo, resto @ {rounddown(s_fuera, 2.5 cm)}.`),
      { type: 'summary' },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'zapata', normas: 'RNE — NTE E.050 Suelos y Cimentaciones, E.060 Concreto Armado', cat: 'Cimentaciones', name: 'Zapata aislada', icon: 'footing',
    desc: 'Dimensionamiento por presión admisible, excentricidad, punzonamiento, cortante unidireccional y flexión en ambas direcciones (E.060 / E.050).',
    titulo: 'Diseño de zapata aislada',
    blocks: [
      calc(`# Datos
PD = 60 tonf // Carga muerta de servicio
PL = 25 tonf // Carga viva de servicio
MD = 2.0 tonf*m // Momento de servicio por carga muerta (dirección L)
ML = 1.0 tonf*m // Momento de servicio por carga viva (dirección L)
qa = 2.5 kgf/cm^2 // Capacidad admisible del suelo (Estudio de Mecánica de Suelos)
Df = 1.50 m // Profundidad de desplante
gammam = 2.0 tonf/m^3 // Peso unitario promedio suelo-concreto
spiso = 0.25 tonf/m^2 // Sobrecarga sobre el piso
c1 = 50 cm // Dimensión de la columna en dirección L
c2 = 40 cm // Dimensión de la columna en dirección B
fc = 210 kgf/cm^2 // Resistencia del concreto
fy = 4200 kgf/cm^2 // Fluencia del acero
hz = 60 cm // Peralte de la zapata
bar = 5 // Varilla de refuerzo [4 : 1/2"|5 : 5/8"|6 : 3/4"]
barcol = 6 // Varilla longitudinal de la columna [5 : 5/8"|6 : 3/4"|8 : 1"]
## Dimensionamiento en planta
qn = qa - gammam*Df - spiso -> tonf/m^2 // Capacidad portante neta
check qn > 0 tonf/m^2 // Capacidad neta positiva
P = PD + PL // Carga de servicio
M = MD + ML // Momento de servicio
e = M/P -> m // Excentricidad
A0 = P/qn -> m^2 // Área por carga axial
Areq = A0*(1 + 6*e/sqrt(A0)) -> m^2 // Área requerida incluyendo excentricidad
Dc = c1 - c2 // Diferencia de lados (volados iguales)
B = roundup((-Dc + sqrt(Dc^2 + 4*Areq))/2, 0.05 m) // Ancho adoptado
L = B + Dc -> m // Largo adoptado
check e <= L/6 // Resultante dentro del núcleo central
q1 = P/(B*L) + 6*M/(B*L^2) -> tonf/m^2 // Presión máxima
q2 = P/(B*L) - 6*M/(B*L^2) -> tonf/m^2 // Presión mínima
check q1 <= qn // Presión máxima ≤ capacidad neta`),
      calc(`## Presión última de diseño
Pu = 1.4*PD + 1.7*PL // Carga última (E.060 9.2.1)
Mu = 1.4*MD + 1.7*ML // Momento último
qu = Pu/(B*L) + 6*Mu/(B*L^2) -> tonf/m^2 // Presión última (máxima, conservadora)
d = hz - 7.5 cm - db(bar) // Peralte efectivo
## Verificación por punzonamiento (E.060 11.12)
bo = 2*(c1 + d) + 2*(c2 + d) // Perímetro crítico a d/2
Vup = Pu - Pu/(B*L)*(c1 + d)*(c2 + d) -> tonf // Cortante último de punzonamiento (presión media)
betac = max(c1, c2)/min(c1, c2) // Relación de lados de la columna
alphas = 40 // Columna interior
Vc1 = 0.53*(1 + 2/betac)*sqrtfc(fc)*bo*d -> tonf
Vc2 = 0.27*(alphas*d/bo + 2)*sqrtfc(fc)*bo*d -> tonf
Vc3 = 1.06*sqrtfc(fc)*bo*d -> tonf
phiVcp = 0.85*min(Vc1, Vc2, Vc3) -> tonf // Resistencia de diseño
check Vup <= phiVcp // Punzonamiento
## Cortante por flexión (a "d" de la cara)
lv_L = (L - c1)/2 -> m // Volado en dirección L
lv_B = (B - c2)/2 -> m // Volado en dirección B
Vud_L = qu*B*(lv_L - d) -> tonf
phiVc_L = 0.85*0.53*sqrtfc(fc)*B*d -> tonf
check Vud_L <= phiVc_L // Cortante dirección L
Vud_B = qu*L*(lv_B - d) -> tonf
phiVc_B = 0.85*0.53*sqrtfc(fc)*L*d -> tonf
check Vud_B <= phiVc_B // Cortante dirección B
## Diseño por flexión
phif = 0.9
Asreq(Mx, bx) = 0.85*fc*bx*d/fy*(1 - sqrt(1 - 2*Mx/(0.85*phif*fc*bx*d^2)))
Mu_L = qu*B*lv_L^2/2 -> tonf*m // Momento en la cara (dirección L)
As_L = max(Asreq(Mu_L, B), 0.0018*B*hz) // Acero dirección L (mín. 0.0018 b h)
n_L = max(2, ceil(As_L/Ab(bar))) // Número de varillas
sep_L = rounddown((B - 15 cm)/(n_L - 1), 2.5 cm) // Espaciamiento
Mu_B = qu*L*lv_B^2/2 -> tonf*m // Momento en la cara (dirección B)
As_B = max(Asreq(Mu_B, L), 0.0018*L*hz) // Acero dirección B
n_B = max(2, ceil(As_B/Ab(bar)))
sep_B = rounddown((L - 15 cm)/(n_B - 1), 2.5 cm)
check max(sep_L, sep_B) <= min(3*hz, 40 cm) // Espaciamiento máximo (3h y 40 cm, E.060)
## Longitud de desarrollo
ld = max(fy*db(bar)/(si(bar <= 6, 6.7, 5.4)*sqrtfc(fc)), 30 cm) // Longitud de desarrollo en tracción (E.060 12.2.2)
check ld <= min(lv_L, lv_B) - 7.5 cm // Longitud disponible
ldc = max(0.075*fy*db(barcol)/sqrtfc(fc), 0.0044*fy*db(barcol)/(1 kgf/cm^2)) // Anclaje en compresión de barras de columna (E.060 12.3)
check d >= ldc // Peralte suficiente para el anclaje de la columna
"Para la condición con sismo la presión admisible puede incrementarse en 30 % (E.050), verificando $q \\le 1.3\\,q_a$ con las cargas de sismo.`),
      { type: 'footing', B: 'B', L: 'L', hz: 'hz', c1: 'c1', c2: 'c2', Df: 'Df', d: 'd', q1: 'q1', q2: 'q2', acero: 'Malla #{bar} @ {sep_L} (dir. L)  /  #{bar} @ {sep_B} (dir. B)', titulo: '' },
      { type: 'summary' },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'aci', settings: { sys: 'si' }, normas: 'ACI 318-19 / ACI 318-25 Building Code Requirements for Structural Concrete (SI)', cat: 'Concreto — normas extranjeras', name: 'Viga — ACI 318-19/25 (SI)', icon: 'beam',
    desc: 'Flexión con φ variable según εt, deformación mínima 0.004, Vc con efecto de tamaño λs (Tabla 22.5.5.1) y refuerzo mínimo por cortante, en MPa y mm.',
    titulo: 'Diseño de viga — ACI 318-19/25 (unidades SI)',
    blocks: [
      calc(`# Datos (ACI 318-19 / 318-25)
fc = 28 MPa // Resistencia especificada del concreto [21 MPa|28 MPa|35 MPa|42 MPa]
fy = 420 MPa // Fluencia del refuerzo (Grado 60) [420 MPa|520 MPa]
Es = 200000 MPa // Módulo del acero
fyt = min(fy, 420 MPa) // Fluencia para refuerzo de cortante (Tabla 20.2.2.4a)
lambda = 1.0 // Factor de concreto liviano (1.0 = peso normal)
b = 300 mm // Ancho del alma
h = 600 mm // Peralte total
cover = 40 mm // Recubrimiento libre
dbl = 20 mm // Diámetro de barra longitudinal [16 mm|20 mm|22 mm|25 mm|28 mm]
dbs = 10 mm // Diámetro de estribo [10 mm|12 mm]
Mu = 250 kN*m // Momento último
Vu = 180 kN // Cortante último en la sección crítica
## Flexión (Cap. 9 y 22)
d = h - cover - dbs - dbl/2 // Peralte efectivo
beta1 = si(fc <= 28 MPa, 0.85, max(0.65, 0.85 - 0.05*(fc - 28 MPa)/(7 MPa))) // Tabla 22.2.2.4.3
Rn = Mu/(0.9*b*d^2) // Supone sección controlada por tracción
rho = 0.85*fc/fy*(1 - sqrt(1 - 2*Rn/(0.85*fc))) // Cuantía requerida
As = rho*b*d // Acero requerido
Asmin = max(0.25*sqrtMPa(fc)/fy, 1.4 MPa/fy)*b*d // Acero mínimo (9.6.1.2)
Ab1 = pi*dbl^2/4 // Área de una barra
n = max(2, ceil(max(As, Asmin)/Ab1)) // Número de barras
Asc = n*Ab1 // Acero colocado
a = Asc*fy/(0.85*fc*b) // Bloque de compresión
c = a/beta1 // Eje neutro
epst = 0.003*(d - c)/c // Deformación en el acero extremo
epsty = fy/Es // Deformación de fluencia
check epst >= 0.004 // Deformación mínima en vigas (9.3.3.1)
phif = si(epst >= epsty + 0.003, 0.90, 0.65 + 0.25*(epst - epsty)/0.003) // Factor φ (Tabla 21.2.2)
phiMn = phif*Asc*fy*(d - a/2) -> kN*m // Resistencia de diseño
check Mu <= phiMn // Resistencia a flexión
## Cortante (22.5 y 9.6.3)
Av = 2*pi*dbs^2/4 // Estribo de 2 ramas
avmin = max(0.062*sqrtMPa(fc)*b/fyt, 0.35 MPa*b/fyt) // Refuerzo mínimo Av/s (9.6.3.4)
rhow = Asc/(b*d) // Cuantía longitudinal
lambdas = lambdasACI(d) // Factor de efecto de tamaño (22.5.5.1.3)
Vca = 0.17*lambda*sqrtMPa(fc)*b*d -> kN // Tabla 22.5.5.1 (a), con Av ≥ Av,min
Vcb = 0.66*lambda*rhow^(1/3)*sqrtMPa(fc)*b*d -> kN // Tabla 22.5.5.1 (b), con Av ≥ Av,min
Vc = min(max(Vca, Vcb), 0.42*lambda*sqrtMPa(fc)*b*d) -> kN // Resistencia del concreto
Vcc = min(0.66*lambdas*lambda*rhow^(1/3)*sqrtMPa(fc)*b*d, 0.42*lambda*sqrtMPa(fc)*b*d) -> kN // Caso (c): sin refuerzo mínimo
phiv = 0.75 // Factor de reducción por cortante
check Vu <= phiv*(Vc + 0.66*sqrtMPa(fc)*b*d) // Dimensiones de la sección (22.5.1.2)
Vs = max(Vu/phiv - Vc, 0 kN) // Resistencia requerida del refuerzo
s1 = si(Vs > 0 kN, Av*fyt*d/Vs, 600 mm) // Espaciamiento por resistencia
smax = si(Vs <= 0.33*sqrtMPa(fc)*b*d, min(d/2, 600 mm), min(d/4, 300 mm)) // Espaciamiento máximo (9.7.6.2.2)
s2 = Av/avmin // Espaciamiento por refuerzo mínimo
s = rounddown(min(s1, smax, s2), 25 mm) // Espaciamiento adoptado
phiVn = phiv*(Vc + Av*fyt*d/s) -> kN // Resistencia de diseño
check Vu <= phiVn // Resistencia a cortante
"Si no se coloca el refuerzo mínimo por cortante, la resistencia del concreto se reduce a $V_c$ = {Vcc} por efecto de tamaño (caso c).`),
      { type: 'summary' },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'ec2', settings: { sys: 'si' }, normas: 'EN 1992-1-1 Eurocódigo 2 (valores recomendados; verificar el Anexo Nacional)', cat: 'Concreto — normas extranjeras', name: 'Viga — Eurocódigo 2 (EN 1992-1-1)', icon: 'beam',
    desc: 'Flexión con bloque rectangular (λ = 0.8, η = 1), límite x/d, cuantías mínima y máxima, cortante VRd,c sin estribos y bielas con cot θ variable.',
    titulo: 'Diseño de viga — Eurocódigo 2',
    blocks: [
      calc(`# Datos (EN 1992-1-1)
fck = 30 MPa // Resistencia característica [25 MPa|30 MPa|35 MPa|40 MPa|45 MPa|50 MPa]
fyk = 500 MPa // Acero B500
gammac = 1.5 // Coeficiente parcial del concreto
gammas = 1.15 // Coeficiente parcial del acero
alphacc = 1.0 // Coef. de cansancio (recomendado 1.0; algunos Anexos Nacionales 0.85)
b = 300 mm // Ancho
h = 600 mm // Canto total
d = 550 mm // Canto útil
MEd = 250 kN*m // Momento de diseño
VEd = 180 kN // Cortante de diseño
## Resistencias de cálculo
fcd = alphacc*fck/gammac // Resistencia de cálculo del concreto
fyd = fyk/gammas // Resistencia de cálculo del acero
fctm = 0.30*(fck/(1 MPa))^(2/3)*1 MPa // Resistencia media a tracción (Tabla 3.1)
## Flexión (6.1)
a = d*(1 - sqrt(1 - 2*MEd/(fcd*b*d^2))) // Profundidad del bloque (λx)
x = a/0.8 // Profundidad del eje neutro
check x/d <= 0.45 // Sin redistribución, δ = 1 (5.5(4), valores recomendados)
z = min(d - a/2, 0.95*d) // Brazo mecánico
As = MEd/(fyd*z) // Armadura requerida
Asmin = max(0.26*fctm/fyk, 0.0013)*b*d // Armadura mínima (9.2.1.1)
Asmax = 0.04*b*h // Armadura máxima
Asreq = max(As, Asmin)
n = max(2, ceil(Asreq/(pi*(20 mm)^2/4))) // Barras de 20 mm
Asprov = n*pi*(20 mm)^2/4 // Armadura dispuesta
check Asprov <= Asmax // Armadura máxima
## Cortante (6.2)
k = min(1 + sqrt(200 mm/d), 2.0) // Factor de canto
rhol = min(Asprov/(b*d), 0.02) // Cuantía longitudinal
CRdc = 0.18/gammac
vmin = 0.035*k^1.5*sqrt(fck/(1 MPa))*1 MPa // Resistencia mínima
VRdc = max(CRdc*k*(100*rhol*fck/(1 MPa))^(1/3)*1 MPa, vmin)*b*d -> kN // Resistencia sin armadura de cortante (6.2.2)
cot_theta = 2.5 // Inclinación de bielas (1 ≤ cot θ ≤ 2.5)
nu1 = 0.6*(1 - fck/(250 MPa)) // Coef. de reducción por fisuración
zv = 0.9*d // Brazo para cortante (6.2.3(1))
VRdmax = b*zv*nu1*fcd/(cot_theta + 1/cot_theta) -> kN // Resistencia de bielas (6.9)
check VEd <= VRdmax // Compresión en bielas
fywd = fyd // Acero de estribos
Asw_s = max(VEd/(zv*fywd*cot_theta), 0.08*sqrt(fck/(1 MPa))/(fyk/(1 MPa))*b) -> mm^2/m // Armadura transversal (6.8) y mínima (9.5N)
smax = 0.75*d // Separación longitudinal máxima (9.6N)
sw = rounddown(min(2*pi*(8 mm)^2/4/Asw_s, smax), 25 mm) // Estribos de 8 mm, 2 ramas
VRds = 2*pi*(8 mm)^2/4/sw*zv*fywd*cot_theta -> kN // Resistencia con estribos
check VEd <= max(VRdc, VRds) // Resistencia a cortante`),
      { type: 'summary' },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'portante', normas: 'RNE — NTE E.050 Suelos y Cimentaciones', cat: 'Geotecnia', name: 'Capacidad portante del suelo', icon: 'soil',
    desc: 'Ecuación general de capacidad de carga (Meyerhof/Vesic) con factores de forma y profundidad; gráfico qadm vs ancho B.',
    titulo: 'Capacidad portante admisible del terreno',
    blocks: [
      calc(`# Parámetros del suelo y la cimentación
phi = 28 deg // Ángulo de fricción interna
c = 1.0 tonf/m^2 // Cohesión
gamma = 1.75 tonf/m^3 // Peso unitario del suelo
Df = 1.50 m // Profundidad de desplante
B = 2.0 m // Ancho de la cimentación
L = 2.0 m // Largo de la cimentación
FS = 3.0 // Factor de seguridad (E.050)
## Factores de capacidad de carga
Nq = e^(pi*tan(phi))*tan(45 deg + phi/2)^2
Nc = (Nq - 1)*cot(phi)
Ngamma = 2*(Nq + 1)*tan(phi)
## Factores de forma (De Beer) y profundidad (Hansen)
Fcs = 1 + B/L*Nq/Nc
Fqs = 1 + B/L*tan(phi)
Fgs = 1 - 0.4*B/L
kD = si(Df/B <= 1, Df/B, atan(Df/B)) // Parámetro de profundidad de Hansen (rad si Df/B > 1)
Fcd = 1 + 0.4*kD
Fqd = 1 + 2*tan(phi)*(1 - sin(phi))^2*kD
q = gamma*Df -> tonf/m^2 // Sobrecarga al nivel de desplante
## Capacidad última y admisible
qu = c*Nc*Fcs*Fcd + q*Nq*Fqs*Fqd + 0.5*gamma*B*Ngamma*Fgs -> tonf/m^2
qadm = qu/FS -> kgf/cm^2 // Capacidad admisible`),
      { type: 'plot', expr: '(c*Nc*(1+(x m)/L*Nq/Nc)*(1+0.4*(Df/(x m) <= 1 ? Df/(x m) : atan(Df/(x m)))) + q*Nq*(1+(x m)/L*tan(phi))*(1+2*tan(phi)*(1-sin(phi))^2*(Df/(x m) <= 1 ? Df/(x m) : atan(Df/(x m)))) + 0.5*gamma*(x m)*Ngamma*(1-0.4*(x m)/L))/FS', var: 'x', desde: '1', hasta: '4', puntos: '120', xlabel: 'Ancho B [m] (B = L)', ylabel: 'qadm [kg/cm²]', titulo: 'Variación de la capacidad admisible con el ancho de la cimentación' },
      text(`> Nota: la capacidad admisible por resistencia debe compararse con la presión que produce el asentamiento tolerable indicado en el Estudio de Mecánica de Suelos (NTE E.050).`),
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'muro', normas: 'RNE — NTE E.020, E.050, E.060', cat: 'Muros de contención', name: 'Muro de contención en voladizo', icon: 'wall',
    desc: 'Empuje de Rankine con sobrecarga, estabilidad al volteo y deslizamiento, presiones en la base y diseño de la pantalla.',
    titulo: 'Diseño de muro de contención en voladizo',
    blocks: [
      calc(`# Geometría y materiales
H = 4.0 m // Altura total del muro
hz = 0.50 m // Espesor de la zapata
B = 2.80 m // Ancho de la base
Lp = 0.70 m // Longitud de la punta
t1 = 0.25 m // Espesor de la pantalla en la corona
t2 = 0.40 m // Espesor de la pantalla en la base
gammas = 1.80 tonf/m^3 // Peso unitario del relleno
phis = 30 deg // Ángulo de fricción del relleno
ws = 1.0 tonf/m^2 // Sobrecarga sobre el relleno
mu = 0.55 // Coeficiente de fricción base-suelo
qa = 2.5 kgf/cm^2 // Capacidad admisible del suelo
gammac = 2.4 tonf/m^3 // Peso unitario del concreto
fc = 210 kgf/cm^2
fy = 4200 kgf/cm^2
## Empujes (Rankine)
Ka = (1 - sin(phis))/(1 + sin(phis)) // Coeficiente de empuje activo
Ea = 0.5*Ka*gammas*H^2 -> tonf/m // Empuje del relleno
Eq = Ka*ws*H -> tonf/m // Empuje de la sobrecarga
Ma = Ea*H/3 + Eq*H/2 -> tonf*m/m // Momento de volteo`),
      { type: 'wall', H: 'H', B: 'B', hz: 'hz', punta: 'Lp', t1: 't1', t2: 't2', Df: '1.0 m', Ka: 'Ka', gs: 'gammas', sc: 'ws' },
      calc(`## Fuerzas estabilizantes (por metro de muro)
hp = H - hz // Altura de la pantalla
Lt = B - Lp - t2 // Longitud del talón
W1 = gammac*t1*hp -> tonf/m // Pantalla (rectángulo)
W2 = gammac*0.5*(t2 - t1)*hp -> tonf/m // Pantalla (triángulo)
W3 = gammac*B*hz -> tonf/m // Zapata
W4 = gammas*Lt*hp -> tonf/m // Relleno sobre el talón
W5 = ws*Lt -> tonf/m // Sobrecarga sobre el talón
SW = W1 + W2 + W3 + W4 + W5 // Fuerza vertical total
SWr = W1 + W2 + W3 + W4 // Fuerza vertical estabilizante (sin sobrecarga, conservador)
Mr = W1*(Lp + t2 - t1/2) + W2*(Lp + 2/3*(t2 - t1)) + W3*B/2 + W4*(Lp + t2 + Lt/2) -> tonf*m/m // Momento resistente (sin sobrecarga)
## Estabilidad
FSv = Mr/Ma // Factor de seguridad al volteo
check FSv >= 2.0 // Volteo (criterio usual FS ≥ 2.0)
FSd = mu*SWr/(Ea + Eq) // Factor de seguridad al deslizamiento
check FSd >= 1.5 // Deslizamiento (criterio usual FS ≥ 1.5)
xr = (Mr + W5*(Lp + t2 + Lt/2) - Ma)/SW -> m // Ubicación de la resultante desde la punta (con sobrecarga)
e = B/2 - xr -> m // Excentricidad
check e <= B/6 // Resultante en el tercio central
q1 = SW/B*(1 + 6*e/B) -> tonf/m^2 // Presión en la punta
q2 = SW/B*(1 - 6*e/B) -> tonf/m^2 // Presión en el talón
check q1 <= qa // Presión máxima admisible
## Diseño de la pantalla (sección crítica en la base)
Mu = 1.7*(Ka*gammas*hp^3/6 + Ka*ws*hp^2/2) -> tonf*m/m // Momento último
Vu = 1.7*(Ka*gammas*hp^2/2 + Ka*ws*hp) -> tonf/m // Cortante último
bw = 100 cm // Franja de diseño
d = t2 - 5 cm - 0.8 cm // Peralte efectivo
Rn = Mu*1 m/(0.9*bw*d^2) // Parámetro de resistencia
rho = 0.85*fc/fy*(1 - sqrt(1 - 2*Rn/(0.85*fc)))
As = max(rho*bw*d, 0.0015*bw*t2) // Acero vertical (cara interior)
s = rounddown(Ab(5)/As*bw, 2.5 cm) // Espaciamiento con varilla de 5/8"
phiVc = 0.85*0.53*sqrtfc(fc)*bw*d/(1 m) -> tonf/m // Resistencia al corte por metro
check Vu <= phiVc // Cortante en la pantalla
"Refuerzo vertical interior: varilla de 5/8\" @ {s}. Completar con el diseño de punta y talón, refuerzo horizontal (s ≤ 3t, 40 cm) y, en zonas 3–4, el empuje sísmico (Mononobe–Okabe).`),
      { type: 'summary' },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'aligerado', normas: 'RNE — NTE E.020 Cargas, E.060 Concreto Armado', cat: 'Concreto armado', name: 'Losa aligerada en una dirección', icon: 'slab',
    desc: 'Metrado por vigueta, análisis continuo con alternancia, diseño de acero positivo (sección T) y negativo, cortante con ensanche.',
    titulo: 'Diseño de losa aligerada unidireccional h = 20 cm',
    blocks: [
      calc(`# Metrado de cargas por vigueta
La1 = 4.20 m // Luz libre tramo 1
La2 = 4.50 m // Luz libre tramo 2
La3 = 3.80 m // Luz libre tramo 3
h = 20 cm // Espesor del aligerado [17 cm|20 cm|25 cm|30 cm]
bv = 40 cm // Ancho tributario de vigueta
bw = 10 cm // Ancho del alma
hf = 5 cm // Espesor de la losa superior
fc = 210 kgf/cm^2
fy = 4200 kgf/cm^2
pal = si(h <= 17 cm, 0.28, si(h <= 20 cm, 0.30, si(h <= 25 cm, 0.35, 0.42)))*1 tonf/m^2 // Peso propio del aligerado (E.020)
wpt = 0.10 tonf/m^2 // Piso terminado
wtab = 0.10 tonf/m^2 // Tabiquería repartida
sc = 0.20 tonf/m^2 // Sobrecarga
wD = (pal + wpt + wtab)*bv -> tonf/m // Carga muerta por vigueta
wL = sc*bv -> tonf/m // Carga viva por vigueta
Ec = 15000*sqrtfc(fc)
Ig = bw*h^3/12 // Inercia del alma (conservador)`),
      { type: 'beam', tramos: 'La1, La2, La3', apoyos: 'A, A, A, A', E: 'Ec', I: 'Ig', cargas: 'CM: U * 1.4*wD\nCV: U * 1.7*wL', alternancia: true, deflexion: false, titulo: 'Envolvente de esfuerzos por vigueta' },
      calc(`## Diseño por flexión
d = h - 3 cm // Peralte efectivo
phif = 0.9
Asreq(M, bx) = 0.85*fc*bx*d/fy*(1 - sqrt(1 - 2*M/(0.85*phif*fc*bx*d^2)))
Aspos = Asreq(Mpos, bv) // Acero positivo (ancho bv)
apos = Aspos*fy/(0.85*fc*bv) // Bloque de compresión
check apos <= hf // Bloque dentro del ala (sección rectangular)
Asneg = Asreq(abs(Mneg), bw) // Acero negativo (ancho bw)
Asmin = 0.7*sqrtfc(fc)/fy*bw*d // Acero mínimo
rhob = 0.85*0.85*fc/fy*(6000 kgf/cm^2/(6000 kgf/cm^2 + fy)) // Cuantía balanceada
check Asneg <= 0.75*rhob*bw*d // Acero máximo en el alma (E.060 10.3.4)
"Acero positivo: {max(Aspos, Asmin)} → 1 #4 + 1 #3 = {Ab(4) + Ab(3)}
"Acero negativo: {max(Asneg, Asmin)} → 1 #4 + 1 #3 = {Ab(4) + Ab(3)}
check max(Aspos, Asmin) <= Ab(4) + Ab(3) // Acero positivo colocado
check max(Asneg, Asmin) <= Ab(4) + Ab(3) // Acero negativo colocado
## Cortante (E.060 Art. 8.11.8)
phiVc = 0.85*1.1*0.53*sqrtfc(fc)*bw*d -> tonf // Incremento 10 % para viguetas
check Vmax <= phiVc // Sin ensanche de vigueta
## Acero de temperatura
Ast = 0.0025*100 cm*hf -> cm^2 // Por metro de losa (barras lisas, E.060 9.7.2)
st = min(5*hf, 40 cm) // Espaciamiento máximo
"Usar varilla de 1/4\" @ {rounddown(min(Ab(2)/Ast*100 cm, st), 2.5 cm)}`),
      { type: 'summary' },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'sismo', normas: 'RNE — NTE E.030 Diseño Sismorresistente (modificada por RM 183-2026-VIVIENDA)', cat: 'Sismo — Perú', name: 'Análisis sísmico estático E.030-2026', icon: 'quake',
    desc: 'Versión vigente 2026: suelo por Vs30 con S, TP y TL interpolados, R0 actualizados (EMDL 3.5), irregularidades extremas, C/R ≥ 0.11, distribución en altura y derivas por material.',
    titulo: 'Análisis sísmico estático — NTE E.030 (2026)',
    blocks: [
      text(`# Alcance
Análisis sísmico estático según la Norma Técnica E.030 *Diseño Sismorresistente* del RNE, con las modificaciones aprobadas por la **RM N° 183-2026-VIVIENDA** (clasificación de suelos por $\\bar V_{s30}$, factores $S$, $T_P$, $T_L$ interpolados y nuevos coeficientes $R_0$). Para proyectos con expediente aprobado antes de su vigencia aplica la versión 2018 (plantilla «transición»).`),
      calc(`# Parámetros sísmicos
zona = 4 // Zona sísmica [4 : Zona 4|3 : Zona 3|2 : Zona 2|1 : Zona 1]
Z = si(zona == 4, 0.45, si(zona == 3, 0.35, si(zona == 2, 0.25, 0.10))) // Factor de zona (Tabla N° 1)
Vs30 = 300 m/s // Velocidad promedio de ondas de corte (Estudio de Mecánica de Suelos)
S = SE030(zona, Vs30) // Factor de suelo (Tabla N° 4, interpolación lineal)
Tp = TpE030(Vs30) // Periodo TP (Tabla N° 5)
Tl = TlE030(Vs30) // Periodo TL (Tabla N° 5)
U = 1.0 // Factor de uso [1.5 : Cat. A2 esencial|1.3 : Cat. B importante|1.0 : Cat. C común]
R0 = 8 // Coeficiente básico de reducción (Tabla N° 10) [8 : C°A° pórticos|7 : C°A° dual|6 : C°A° muros estructurales|3.5 : Muros de ductilidad limitada|3 : Albañilería|8 : Acero SMF / EBF|5 : Acero IMF|4 : Acero OMF / OCBF|7 : Acero SCBF / Madera]
Ia = 1.0 // Irregularidad en altura (Tabla N° 11) [1.0 : Regular|0.90 : Masa o geometría vertical|0.80 : Discontinuidad en sistemas resistentes|0.75 : Rigidez – piso blando|0.60 : Discontinuidad extrema|0.50 : Rigidez extrema]
Ip = 1.0 // Irregularidad en planta (Tabla N° 12) [1.0 : Regular|0.90 : Esquinas entrantes / sistemas no paralelos|0.85 : Discontinuidad del diafragma|0.75 : Torsión|0.60 : Torsión extrema]
hn = 12.0 // Altura total de la edificación [m]
CT = 35 // Coeficiente para el periodo [35 : Pórticos de C°A° o acero|45 : Pórticos con muros en ascensores y escaleras|60 : Albañilería, dual, muros, EMDL]
## Periodo y factor de amplificación
R = R0*Ia*Ip // Coeficiente de reducción de fuerzas sísmicas
T = hn/CT // Periodo fundamental aproximado [s]
C = CE030(T, Tp, Tl) // Factor de amplificación (análisis estático: C = 2.5 para T ≤ TP)
CR = max(C/R, 0.11) // C/R no menor que 0.11 (Art. 34.2)
k = si(T <= 0.5, 1.0, min(0.75 + 0.5*T, 2.0)) // Exponente de distribución en altura
## Cortante basal y distribución
wi = [210, 210, 210, 160] tonf // Peso sísmico por nivel (1 → n)
hi = [3, 6, 9, 12] // Altura de cada nivel desde la base [m]
P = sum(wi) // Peso sísmico total
V = Z*U*S*CR*P -> tonf // Fuerza cortante en la base
alpha_i = wi .* hi.^k / sum(wi .* hi.^k) // Factor de distribución
Fi = alpha_i*V // Fuerza en cada nivel
Vi = V - cumsum(Fi) + Fi // Cortante de entrepiso
"Las fuerzas se aplican en cada dirección; los elementos verticales se diseñan con el **100 %** de las solicitaciones en una dirección más el **30 %** de la dirección perpendicular (Art. 28.1).
## Control de derivas
Di = [0.25, 0.33, 0.30, 0.22] cm // Desplazamiento relativo elástico de cada entrepiso (del modelo)
hei = [3, 3, 3, 3] m // Altura de cada entrepiso
fR = 0.75 // Factor de desplazamiento inelástico [0.75 : Estructura regular|0.85 : Estructura irregular]
dlim = 0.007 // Distorsión máxima (Tabla N° 14) [0.007 : Concreto armado|0.010 : Acero / Madera|0.005 : Albañilería|0.004 : Muros de ductilidad limitada]
deriva = fR*R*Di ./ hei // Deriva inelástica de entrepiso
check max(deriva) <= dlim // Distorsión de entrepiso`),
      { type: 'table', columnas: 'Nivel = 1:4\nAltura $h_i$ [m] = hi\nPeso $w_i$ [tonf] = wi\n$\\alpha_i$ = alpha_i\nFuerza $F_i$ [tonf] = Fi\nCortante $V_i$ [tonf] = Vi\nDeriva = deriva', dec: '4', titulo: 'Distribución de la fuerza sísmica en altura y derivas' },
      { type: 'spectrum', Z: 'Z', U: 'U', S: 'S', Tp: 'Tp', Tl: 'Tl', R: 'R', T: 'T', corto: true, titulo: 'Espectro de pseudo-aceleraciones E.030-2026 (incluye rama T < 0.2 TP para análisis dinámico)' },
      text(`> En **zona 4**, para edificaciones de categorías A y B, la E.030-2026 exige determinar el periodo predominante del terreno $T_s$ (razón espectral H/V). En el análisis dinámico, la cortante basal no será menor que el 80 % (regular) o 90 % (irregular) de la estática.`),
      { type: 'summary' },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'asce7', settings: { sys: 'si' }, normas: 'ASCE/SEI 7-22 Minimum Design Loads (Cap. 11 y 12)', cat: 'Sismo — Internacional', name: 'Sismo ELF — ASCE 7-22 (EE. UU.)', icon: 'quake',
    desc: 'Fuerza lateral equivalente: Ta = Ct·hn^x, límite Cu·Ta, Cs con límites mínimos, distribución con exponente k, derivas con Cd e Ie.',
    titulo: 'Análisis sísmico ELF — ASCE 7-22',
    blocks: [
      calc(`# Parámetros sísmicos (ASCE 7-22)
SDS = 1.00 // Aceleración espectral de diseño, periodo corto [g] (del espectro multiperiodo, 11.4.8)
SD1 = 0.60 // Aceleración espectral de diseño a 1 s [g]
S1 = 0.60 // Aceleración MCER a 1 s [g]
TL = 8 // Periodo de transición largo [s]
R = 8 // Coeficiente de modificación de respuesta (Tabla 12.2-1) [8 : Pórtico especial C°A°|5 : Pórtico intermedio C°A°|3 : Pórtico ordinario C°A°|7 : Dual con pórtico especial|6 : Muros especiales C°A°|8 : Pórtico especial de acero]
Cd = 5.5 // Factor de amplificación de deflexiones [5.5 : Pórtico especial|4.5 : Pórtico intermedio|2.5 : Pórtico ordinario|5 : Muros especiales]
Ie = 1.0 // Factor de importancia sísmica [1.0 : Riesgo I–II|1.25 : Riesgo III|1.5 : Riesgo IV]
hn = 15 // Altura [m]
Ct = 0.0466 // Tabla 12.8-2 [0.0466 : Pórtico de concreto|0.0724 : Pórtico de acero|0.0731 : Acero EBF / BRBF|0.0488 : Otros sistemas]
x = 0.9 // Exponente (Tabla 12.8-2) [0.9 : Pórtico de concreto|0.8 : Pórtico de acero|0.75 : EBF / otros]
## Periodo fundamental (12.8.2)
Ta = Ct*hn^x // Periodo aproximado [s]
Cu = CuASCE7(SD1) // Coeficiente del límite superior (Tabla 12.8-1)
T = Ta // Periodo adoptado (si se usa el del modelo, no mayor que Cu·Ta)
## Coeficiente de respuesta sísmica (12.8.1.1)
Cs1 = SDS/(R/Ie) // Valor base
Cs2 = si(T <= TL, SD1/(T*R/Ie), SD1*TL/(T^2*R/Ie)) // Límite superior
Csmin = max(0.044*SDS*Ie, 0.01) // Límite inferior (12.8-5)
Cs3 = si(S1 >= 0.6, 0.5*S1/(R/Ie), 0) // Límite adicional si S1 ≥ 0.6 g (12.8-6)
Cs = max(min(Cs1, Cs2), Csmin, Cs3) // Coeficiente de diseño
## Cortante basal y distribución vertical (12.8.3)
wx = [2000, 2000, 2000, 2000, 1600] kN // Peso sísmico por nivel
hx = [3, 6, 9, 12, 15] // Altura de cada nivel [m]
W = sum(wx) // Peso sísmico efectivo
V = Cs*W // Cortante basal (12.8-1)
k = si(T <= 0.5, 1, si(T >= 2.5, 2, 1 + (T - 0.5)/2)) // Exponente de distribución
Cvx = wx .* hx.^k / sum(wx .* hx.^k) // Factor de distribución vertical
Fx = Cvx*V // Fuerza por nivel
Vx = V - cumsum(Fx) + Fx // Cortante de entrepiso
## Derivas (12.8.6 y Tabla 12.12-1)
Dxe = [5, 6, 6, 5, 4] mm // Deriva elástica de entrepiso (del modelo)
hsx = [3, 3, 3, 3, 3] m // Altura de entrepiso
Delta = Cd*Dxe/Ie // Deriva de diseño
Dlim = 0.020 // Deriva admisible / hsx [0.020 : Riesgo I–II|0.015 : Riesgo III|0.010 : Riesgo IV]
check max(Delta ./ hsx) <= Dlim // Deriva de entrepiso`),
      { type: 'text', src: '> ASCE 7-22 obtiene $S_{DS}$ y $S_{D1}$ del espectro multiperiodo del sitio (11.4.8); el espectro de dos periodos se usa como alternativa. En pórticos especiales de SDC D–F la deriva admisible se divide entre ρ (12.12.1.1).' },
      { type: 'table', columnas: 'Nivel = 1:5\nAltura $h_x$ [m] = hx\nPeso $w_x$ [kN] = wx\n$C_{vx}$ = Cvx\nFuerza $F_x$ [kN] = Fx\nCortante $V_x$ [kN] = Vx', dec: '3', titulo: 'Distribución vertical de fuerzas sísmicas (ASCE 7-22)' },
      { type: 'plot', expr: 'SaASCE7(x, SDS, SD1, TL); SaASCE7(x, SDS, SD1, TL)/(R/Ie)', var: 'x', desde: '0', hasta: '4', puntos: '300', xlabel: 'Periodo T [s]', ylabel: 'Sa [g]', leyenda: true, nombres: 'Espectro de diseño Sa; Sa/(R/Ie)', titulo: 'Espectro de respuesta de diseño (ASCE 7-22, 11.4.6)' },
      { type: 'summary' },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'japon', settings: { sys: 'si' }, normas: 'Building Standard Law of Japan (Orden de Aplicación, Art. 88) · Notificación MOC 1793', cat: 'Sismo — Japón', name: 'Sismo — Norma japonesa (BSL)', icon: 'quake',
    desc: 'Ci = Z·Rt·Ai·Co con distribución Ai, primera fase (Co = 0.2, deriva ≤ 1/200) y resistencia última Qun = Ds·Fes·Qud (Co = 1.0).',
    titulo: 'Fuerza sísmica según la Building Standard Law de Japón',
    blocks: [
      text(`# Método de diseño japonés
La Building Standard Law (BSL) de Japón verifica dos niveles: **primera fase** (sismo moderado, $C_o = 0.2$, esfuerzos admisibles y deriva ≤ 1/200) y **segunda fase** (sismo severo, $C_o = 1.0$), donde la resistencia lateral última de cada entrepiso debe superar $Q_{un} = D_s F_{es} Q_{ud}$. Es una referencia muy útil para comparar con la E.030, que comparte la filosofía de diseño por ductilidad.`),
      calc(`# Parámetros
Zj = 1.0 // Coeficiente de zona sísmica [1.0 : Zona general|0.9 : Zona reducida|0.8 : Zona reducida|0.7 : Okinawa]
Tc = 0.6 // Periodo característico del suelo [s] [0.4 : Tipo 1 (roca, grava dura)|0.6 : Tipo 2 (intermedio)|0.8 : Tipo 3 (aluvial, blando)]
H = 12 // Altura del edificio [m]
alfa = 0 // Fracción de la altura con estructura de acero o madera
wi = [2100, 2100, 2100, 1600] kN // Peso por piso (1 → n)
## Periodo y coeficientes
T = H*(0.02 + 0.01*alfa) // Periodo fundamental de diseño [s]
Rt = RtBSL(T, Tc) // Coeficiente espectral
W = sum(wi) // Peso total
Wsup = W - cumsum(wi) + wi // Peso sobre cada entrepiso
alpha_i = Wsup/W // Relación de pesos αi
Ai = AiBSL(alpha_i, T) // Distribución en altura
## Primera fase: sismo moderado (Co = 0.2)
Co = 0.2
Ci = Zj*Rt*Co*Ai // Coeficiente de corte de entrepiso
Qi = Ci .* Wsup // Cortante sísmico de entrepiso
di = [9, 11, 11, 9] mm // Deriva elástica de entrepiso (del modelo, con Qi)
hs = [3, 3, 3, 3] m // Altura de entrepiso
check max(di ./ hs) <= 1/200 // Deriva de entrepiso ≤ 1/200
## Segunda fase: resistencia última (Co = 1.0)
Ds = 0.30 // Coef. de características estructurales (C°A°) [0.30 : Muy dúctil (FA)|0.35 : Dúctil (FB)|0.40 : Moderada (FC)|0.45 : Baja (FD)|0.55 : Muros / frágil]
Rs = 0.8 // Rigidez relativa del entrepiso (rs/r̄s)
Re = 0.10 // Excentricidad relativa (e/re)
Fes = FsBSL(Rs)*FeBSL(Re) // Factor de forma
Qud = Zj*Rt*1.0*Ai .* Wsup // Cortante elástico último
Qun = Ds*Fes*Qud // Resistencia lateral requerida
Qu = [3100, 2600, 1900, 1050] kN // Resistencia lateral última de cada entrepiso (pushover)
check min(Qu ./ Qun) >= 1 // Qu ≥ Qun en todos los entrepisos`),
      { type: 'table', columnas: 'Piso = 1:4\n$\\alpha_i$ = alpha_i\n$A_i$ = Ai\n$C_i$ = Ci\n$Q_i$ [kN] = Qi\n$Q_{un}$ [kN] = Qun\n$Q_u$ [kN] = Qu', dec: '3', titulo: 'Coeficientes y cortantes por entrepiso (BSL)' },
      { type: 'plot', expr: 'Zj*RtBSL(x, 0.4); Zj*RtBSL(x, 0.6); Zj*RtBSL(x, 0.8)', var: 'x', desde: '0', hasta: '4', puntos: '300', xlabel: 'Periodo T [s]', ylabel: 'Z·Rt', leyenda: true, nombres: 'Suelo tipo 1 (Tc = 0.4 s); Suelo tipo 2 (Tc = 0.6 s); Suelo tipo 3 (Tc = 0.8 s)', titulo: 'Coeficiente espectral Rt según el tipo de suelo' },
      { type: 'summary' },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'espectros', normas: 'NTE E.030-2026 · ASCE 7-22 · EN 1998-1 (Eurocódigo 8) · Building Standard Law (Japón)', cat: 'Sismo — Internacional', name: 'Comparativo de espectros (Perú · EE. UU. · Europa · Japón)', icon: 'spectrum',
    desc: 'Grafica en un mismo eje los espectros de diseño reducidos de cuatro normas y compara la demanda para el periodo de la estructura.',
    titulo: 'Comparación de espectros de diseño sísmico',
    blocks: [
      calc(`# Periodo de la estructura
Te = 0.40 // Periodo fundamental [s]
## Perú — NTE E.030-2026
Z = 0.45 // Zona 4
U = 1.0
S = SE030(4, 300 m/s) // Suelo con Vs30 = 300 m/s
Tp = TpE030(300 m/s)
Tl = TlE030(300 m/s)
R = 8 // Pórticos de C°A° regulares
SaPE = Z*U*CE030(Te, Tp, Tl)*S/R // Sa/g de diseño
## EE. UU. — ASCE 7-22
SDS = 1.0 // [g]
SD1 = 0.6 // [g]
TL = 8 // [s]
Rus = 8 // Pórtico especial
Ie = 1.0
SaUS = SaASCE7(Te, SDS, SD1, TL)/(Rus/Ie) // Sa/g de diseño
## Europa — Eurocódigo 8 (espectro tipo 1, suelo C)
ag = 0.30 // Aceleración de diseño en roca [g]
Sec = 1.15
TB = 0.20 // [s]
TC = 0.60 // [s]
TD = 2.0 // [s]
q = 3.9 // Coef. de comportamiento (pórtico DCM, 3·αu/α1)
SaEU = SdEC8(Te, ag, Sec, TB, TC, TD, q) // Sd/g de diseño
## Japón — BSL (resistencia última, Co = 1.0)
Zj = 1.0
Tc = 0.6 // Suelo tipo 2
Ds = 0.30 // Pórtico de C°A° dúctil
SaJP = Ds*Zj*RtBSL(Te, Tc)*1.0 // Coeficiente de corte último requerido`),
      { type: 'plot', expr: 'Z*U*CE030(x, Tp, Tl)*S/R; SaASCE7(x, SDS, SD1, TL)/(Rus/Ie); SdEC8(x, ag, Sec, TB, TC, TD, q); Ds*Zj*RtBSL(x, Tc)', var: 'x', desde: '0.01', hasta: '3', puntos: '300', xlabel: 'Periodo T [s]', ylabel: 'Sa/g de diseño', leyenda: true, nombres: 'Perú E.030-2026; EE. UU. ASCE 7-22; Europa EC8; Japón BSL (Ds·Z·Rt)', titulo: 'Espectros de diseño reducidos de cuatro normas' },
      { type: 'table', columnas: 'Norma = ["E.030-2026 (Perú)", "ASCE 7-22 (EE. UU.)", "EN 1998-1 (Europa)", "BSL (Japón)"]\nSa/g de diseño para Te = [SaPE, SaUS, SaEU, SaJP]', dec: '3', titulo: 'Demanda sísmica de diseño para el periodo de la estructura' },
      text(`> La curva japonesa ($D_s Z R_t$) es una demanda de **resistencia última** del entrepiso; las demás son demandas de **resistencia de diseño**. Los espectros parten de amenazas sísmicas distintas (Z, SDS/SD1, ag) y de filosofías de reducción distintas (R, R/Ie, q, Ds). La comparación es ilustrativa: cada proyecto se diseña con la norma vigente del lugar.`),
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'sismo2018', normas: 'RNE — NTE E.030-2018 Diseño Sismorresistente', cat: 'Sismo — Perú', name: 'Sismo estático E.030-2018 (proyectos en transición)', icon: 'quake',
    desc: 'Parámetros sísmicos, periodo fundamental, cortante basal, distribución de fuerzas por nivel y espectro de diseño (NTE E.030-2018).',
    titulo: 'Análisis sísmico estático — NTE E.030',
    blocks: [
      calc(`# Parámetros sísmicos (NTE E.030-2018)
Z = 0.35 // Factor de zona [0.45 : Zona 4|0.35 : Zona 3|0.25 : Zona 2|0.10 : Zona 1]
U = 1.0 // Factor de uso [1.5 : Cat. A2 esencial|1.3 : Cat. B importante|1.0 : Cat. C común]
S = 1.15 // Factor de suelo (Tabla N° 3) [0.80 : S0|1.00 : S1|1.05 : S2 zona 4|1.15 : S2 zona 3|1.20 : S2 zona 2|1.10 : S3 zona 4|1.20 : S3 zona 3|1.40 : S3 zona 2|1.60 : S2 zona 1|2.00 : S3 zona 1]
Tp = 0.6 // Periodo Tp del suelo [s] [0.3 : S0|0.4 : S1|0.6 : S2|1.0 : S3]
Tl = 2.0 // Periodo TL del suelo [s] [3.0 : S0|2.5 : S1|2.0 : S2|1.6 : S3]
R0 = 8 // Coeficiente básico de reducción [8 : Pórticos C°A°|7 : Dual C°A°|6 : Muros estructurales|4 : Muros duct. limitada|3 : Albañilería]
Ia = 1.0 // Factor de irregularidad en altura
Ip = 1.0 // Factor de irregularidad en planta
hn = 12.0 // Altura total de la edificación [m]
CT = 35 // Coeficiente para el periodo [35 : Pórticos|45 : Pórticos + escaleras/ascensores|60 : Muros / albañilería]
check hn <= 30 // Método estático: regulares ≤ 30 m, irregulares ≤ 15 m (Art. 28.1.1)
## Periodo y factor de amplificación
R = R0*Ia*Ip // Coeficiente de reducción
T = hn/CT // Periodo fundamental aproximado [s] (Art. 28.4)
C = si(T < Tp, 2.5, si(T <= Tl, 2.5*Tp/T, 2.5*Tp*Tl/T^2)) // Factor de amplificación sísmica (Art. 14)
k = si(T <= 0.5, 1.0, min(0.75 + 0.5*T, 2.0)) // Exponente de distribución
## Cortante basal
wi = [210, 210, 210, 160] tonf // Peso sísmico por nivel (1 → n)
hi = [3, 6, 9, 12] // Altura de cada nivel desde la base [m]
P = sum(wi) // Peso sísmico total
CR = max(C/R, 0.11) // C/R no menor que 0.11 (Art. 28.2.1)
V = Z*U*S*CR*P -> tonf // Fuerza cortante en la base
alpha_i = wi .* hi.^k / sum(wi .* hi.^k) // Factor de distribución
Fi = alpha_i*V // Fuerza en cada nivel
Vi = V - cumsum(Fi) + Fi // Cortante de entrepiso
## Control de derivas (Art. 31 y 32)
Di = [0.25, 0.33, 0.30, 0.22] cm // Desplazamiento relativo elástico de cada entrepiso (del modelo)
hei = [3, 3, 3, 3] m // Altura de cada entrepiso
fR = 0.75 // Factor de desplazamiento inelástico (Art. 31.1) [0.75 : Estructura regular|0.85 : Estructura irregular]
deriva = fR*R*Di ./ hei // Deriva inelástica de entrepiso
check max(deriva) <= 0.007 // Deriva máxima concreto armado (Tabla N° 11)`),
      { type: 'table', columnas: 'Nivel = 1:4\nAltura $h_i$ [m] = hi\nPeso $w_i$ [tonf] = wi\n$\\alpha_i$ = alpha_i\nFuerza $F_i$ [tonf] = Fi\nCortante $V_i$ [tonf] = Vi\nDeriva = deriva', total: false, dec: '4', titulo: 'Distribución de la fuerza sísmica en altura y derivas' },
      { type: 'spectrum', Z: 'Z', U: 'U', S: 'S', Tp: 'Tp', Tl: 'Tl', R: 'R', T: 'T' },
      { type: 'summary' },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'puente', normas: 'AASHTO LRFD Bridge Design Specifications · Manual de Puentes MTC', cat: 'Puentes', name: 'Puente losa (AASHTO LRFD)', icon: 'bridge',
    desc: 'Puente tipo losa simplemente apoyado: espesor mínimo, ancho equivalente, carga HL-93 (camión, tándem, carril, IM), Resistencia I y refuerzo.',
    titulo: 'Diseño de puente tipo losa — AASHTO LRFD',
    blocks: [
      calc(`# Datos del puente
L = 10.0 m // Luz de cálculo (simplemente apoyado)
W = 8.40 m // Ancho total del tablero
NL = 2 // Número de carriles de diseño
fc = 280 kgf/cm^2 // Resistencia del concreto
fy = 4200 kgf/cm^2 // Fluencia del acero
gammac = 2.5 tonf/m^3 // Peso unitario del concreto armado
gammaw = 2.25 tonf/m^3 // Peso unitario del asfalto
ta = 0.05 m // Espesor de la carpeta asfáltica
wbar = 0.60 tonf/m // Peso de cada barrera / baranda
bar = 8 // Varilla principal [6 : 3/4"|8 : 1"|9 : 1 1/8"|10 : 1 1/4"]
## Predimensionamiento (AASHTO Tabla 2.5.2.6.3-1)
hmin = 1.2*(L + 3 m)/30 -> m // Espesor mínimo losa simplemente apoyada
h = roundup(hmin, 0.05 m) // Espesor adoptado
## Cargas permanentes (franja de 1 m)
wDC = gammac*h + 2*wbar/W -> tonf/m^2 // Peso propio + barreras repartidas
wDW = gammaw*ta -> tonf/m^2 // Superficie de rodadura
MDC = wDC*L^2/8 -> tonf*m/m
MDW = wDW*L^2/8 -> tonf*m/m
## Carga viva vehicular HL-93
Mtr = MtruckHL93(L) // Momento máx. por camión de diseño (por carril)
Mta = MtandemHL93(L) // Momento máx. por tándem de diseño
Mln = MlaneHL93(L) // Momento por carga de carril (0.952 t/m)
IM = 0.33 // Incremento por carga dinámica
MLL = max(Mtr, Mta)*(1 + IM) + Mln -> tonf*m // Momento por carril
## Ancho de franja equivalente (AASHTO 4.6.2.3)
L1 = min(L, 18 m)
W1 = min(W, 9 m)
E1 = 250 mm + 0.42*sqrt(L1*W1) -> m // Un carril cargado
E2 = min(2100 mm + 0.12*sqrt(L1*min(W, 18 m)), W/NL) -> m // Múltiples carriles
E = min(E1, E2) // Ancho de franja que controla
MLLu = MLL/E -> tonf*m/m // Momento por metro de ancho
## Resistencia I
Mu = 1.25*MDC + 1.50*MDW + 1.75*MLLu -> tonf*m/m
## Diseño del refuerzo principal
d = h - 2.5 cm - db(bar)/2 // Peralte efectivo
Rn = Mu*1 m/(0.9*100 cm*d^2) // Parámetro de resistencia
rho = 0.85*fc/fy*(1 - sqrt(1 - 2*Rn/(0.85*fc)))
As = rho*100 cm*d // Acero por metro
s = rounddown(Ab(bar)/As*100 cm, 2.5 cm) // Espaciamiento
Asc = Ab(bar)*100 cm/s // Acero colocado
a = Asc*fy/(0.85*fc*100 cm)
phiMn = 0.9*Asc*fy*(d - a/2)/(1 m) -> tonf*m/m // Resistencia de diseño
check Mu <= phiMn // Resistencia a flexión
fr = 2.01*sqrtfc(fc) // Módulo de rotura (0.63√f'c MPa)
Mcr = 1.6*0.67*fr*h^2/6 -> tonf*m/m // Momento de agrietamiento (5.6.3.3)
check phiMn >= min(1.33*Mu, Mcr) // Acero mínimo
## Refuerzo de distribución y temperatura
pdist = min(1750/sqrt(L/(1 mm)), 50)/100 // Porcentaje de distribución (5.12.2.1)
Asd = pdist*Asc // Refuerzo de distribución (inferior, transversal)
As1 = 0.75*W*h/(2*(W + h))*(1 MPa)/fy -> cm^2/m // 0.75·b·h/[2(b+h)·fy] (b, h en mm; fy en MPa)
Astem = min(max(As1, 2.33 cm^2/m), 12.7 cm^2/m) // Temperatura por cara (AASHTO 5.10.6)
"Usar #{bar} @ {s} como refuerzo principal; #5 @ {rounddown(Ab(5)/Asd*100 cm, 2.5 cm)} de distribución y #4 @ {rounddown(min(Ab(4)/Astem, 3*h, 45 cm), 2.5 cm)} de temperatura.
## Control de fisuración — Estado Límite de Servicio I (5.6.7)
Ms = MDC + MDW + MLLu -> tonf*m/m // Momento de servicio
fss = Ms*1 m/(Asc*0.875*d) -> kgf/cm^2 // Esfuerzo en el acero en servicio (j ≈ 0.875)
check fss <= 0.6*fy // Esfuerzo de servicio ≤ 0.6 fy
dc = h - d // Recubrimiento al centro de la barra
betas = 1 + dc/(0.7*(h - dc))
smaxcr = 123000*0.75/(betas*fss/(1 MPa))*1 mm - 2*dc -> cm // Espaciamiento máximo (γe = 0.75)
check s <= smaxcr // Control de fisuración
"Además: diseñar la franja de borde (4.6.2.1.4) y, opcionalmente, verificar la deflexión por carga viva ≤ L/800 (2.5.2.6.2).`),
      { type: 'plot', expr: 'MtruckHL93(x)*1.33 + MlaneHL93(x); MtandemHL93(x)*1.33 + MlaneHL93(x)', var: 'x', desde: '4', hasta: '25', puntos: '60', xlabel: 'Luz L [m]', ylabel: 'M_LL+IM [t·m/carril]', titulo: 'Momento HL-93 por carril (camión vs. tándem) en función de la luz', leyenda: true, nombres: 'Camión + carril; Tándem + carril' },
      text(`> Las losas diseñadas por momento según 4.6.2.3 se consideran satisfactorias por cortante (AASHTO LRFD 5.12.2.1).`),
      { type: 'summary' },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'acero', settings: { sys: 'us' }, normas: 'ANSI/AISC 360-16 (LRFD) · RNE — NTE E.090', cat: 'Acero estructural', name: 'Viga de acero W (AISC 360)', icon: 'steel',
    desc: 'Flexión con pandeo lateral-torsional (F2), compacidad de la sección y cortante (G2) por LRFD. Unidades inglesas.',
    titulo: 'Verificación de viga de acero — AISC 360-16 (LRFD)',
    blocks: [
      calc(`# Sección W12x26 — ASTM A992
Fy = 50 ksi // Esfuerzo de fluencia
Es = 29000 ksi // Módulo de elasticidad
d = 12.2 in // Peralte
bf = 6.49 in // Ancho del ala
tf = 0.38 in // Espesor del ala
tw = 0.23 in // Espesor del alma
Zx = 37.2 in^3 // Módulo plástico
Sx = 33.4 in^3 // Módulo elástico
ry = 1.51 in // Radio de giro eje débil
rts = 1.75 in // Radio de giro efectivo
J = 0.30 in^4 // Constante torsional
ho = 11.8 in // Distancia entre centroides de alas
Lb = 10 ft // Longitud no arriostrada
Cb = 1.14 // Factor de gradiente de momento
Mu = 90 kip*ft // Momento último
Vu = 35 kip // Cortante último
## Compacidad (Tabla B4.1b)
lambdaf = bf/(2*tf)
check lambdaf <= 0.38*sqrt(Es/Fy) // Ala compacta
lambdaw = (d - 2*tf)/tw
check lambdaw <= 3.76*sqrt(Es/Fy) // Alma compacta
## Pandeo lateral-torsional (F2)
Mp = Fy*Zx -> kip*ft // Momento plástico
Lp = 1.76*ry*sqrt(Es/Fy) -> ft
Lr = 1.95*rts*Es/(0.7*Fy)*sqrt(J/(Sx*ho) + sqrt((J/(Sx*ho))^2 + 6.76*(0.7*Fy/Es)^2)) -> ft
Fcr = Cb*pi^2*Es/(Lb/rts)^2*sqrt(1 + 0.078*J/(Sx*ho)*(Lb/rts)^2) -> ksi
Mn = si(Lb <= Lp, Mp, si(Lb <= Lr, min(Cb*(Mp - (Mp - 0.7*Fy*Sx)*(Lb - Lp)/(Lr - Lp)), Mp), min(Fcr*Sx, Mp))) -> kip*ft
phiMn = 0.9*Mn -> kip*ft
check Mu <= phiMn // Resistencia a flexión
## Cortante (G2.1)
Aw = d*tw // Área del alma
check (d - 2*tf)/tw <= 2.24*sqrt(Es/Fy) // Cv1 = 1.0, φv = 1.0
phiVn = 1.0*0.6*Fy*Aw -> kip
check Vu <= phiVn // Resistencia a cortante`),
      { type: 'plot', expr: 'si(x <= Lp/(1 ft), Mp/(1 kip*ft), si(x <= Lr/(1 ft), min(Cb*(Mp - (Mp - 0.7*Fy*Sx)*(x ft - Lp)/(Lr - Lp)), Mp)/(1 kip*ft), min(Cb*pi^2*Es/((x ft)/rts)^2*sqrt(1 + 0.078*J/(Sx*ho)*((x ft)/rts)^2)*Sx, Mp)/(1 kip*ft)))*0.9', var: 'x', desde: '1', hasta: '30', puntos: '200', xlabel: 'Lb [ft]', ylabel: 'φMn [kip·ft]', titulo: 'Curva de capacidad φMn vs. longitud no arriostrada' },
      { type: 'summary' },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'predim', normas: 'RNE — NTE E.060 Concreto Armado (práctica de predimensionamiento)', cat: 'Concreto armado', name: 'Predimensionamiento', icon: 'grid',
    desc: 'Peraltes de losas y vigas, y sección de columnas por carga axial de servicio (práctica peruana con E.060).',
    titulo: 'Predimensionamiento de elementos estructurales',
    blocks: [
      calc(`# Datos generales
fc = 210 kgf/cm^2 // Resistencia del concreto
Ln = 5.50 m // Luz libre mayor entre apoyos
N = 4 // Número de pisos
wpiso = 1.0 tonf/m^2 // Peso por piso (categoría C, aprox.) [0.8 tonf/m^2|1.0 tonf/m^2|1.2 tonf/m^2|1.5 tonf/m^2]
Atc = 20 m^2 // Área tributaria de la columna central
Ate = 10 m^2 // Área tributaria de la columna perimetral
## Losas
h_al = roundup(Ln/25, 0.05 m) -> cm // Aligerado en una dirección (h ≥ Ln/25)
h_mz = roundup(Ln/40, 0.01 m) -> cm // Losa maciza en dos direcciones (perímetro/180 aprox.)
## Vigas principales
h_v = roundup(Ln/11, 0.05 m) -> cm // Peralte h = Ln/10 a Ln/12
b_v = max(roundup(h_v/2, 5 cm), 25 cm) // Ancho b ≈ h/2 (práctica); E.060 21.5.1.3 exige b ≥ 0.25h y ≥ 25 cm
## Columnas
Pc = wpiso*Atc*N // Carga de servicio, columna central
Ac_c = Pc/(0.45*fc) -> cm^2 // Área requerida (columna central)
lc_c = max(roundup(sqrt(Ac_c), 5 cm), 25 cm) // Lado de columna cuadrada
Pe = wpiso*Ate*N // Carga de servicio, columna perimetral
Ac_e = Pe/(0.35*fc) -> cm^2 // Área requerida (columna perimetral / esquina)
lc_e = max(roundup(sqrt(Ac_e), 5 cm), 25 cm)
"Resultado: aligerado h = {h_al}, vigas {b_v} × {h_v}, columnas centrales {lc_c} × {lc_c} y perimetrales {lc_e} × {lc_e}.`),
      text(`> El peralte Ln/25 del aligerado es práctica usual pero menor que el de la Tabla 9.1 de E.060, por lo que debe verificarse la deflexión. El predimensionamiento es referencial: las dimensiones finales deben confirmarse con el análisis sísmico (control de derivas E.030) y el diseño por resistencia.`),
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'combos', normas: 'RNE — NTE E.060 Art. 9.2', cat: 'Cargas y combinaciones', name: 'Combinaciones de carga E.060', icon: 'table',
    desc: 'Cinco combinaciones de diseño de la NTE E.060 (Art. 9.2) para P, M y V, con la envolvente.',
    titulo: 'Combinaciones de carga — NTE E.060',
    blocks: [
      calc(`# Esfuerzos de servicio por tipo de carga
PD = 45 tonf // Axial por carga muerta
PL = 15 tonf // Axial por carga viva
PS = 8 tonf // Axial por sismo
MD = 3.2 tonf*m // Momento por carga muerta
ML = 1.1 tonf*m // Momento por carga viva
MS = 9.5 tonf*m // Momento por sismo
VD = 1.8 tonf // Cortante por carga muerta
VL = 0.6 tonf // Cortante por carga viva
VS = 5.2 tonf // Cortante por sismo
## Combinaciones (E.060 Art. 9.2.1 y 9.2.3)
cD = [1.4, 1.25, 1.25, 0.9, 0.9] // Factores de carga muerta
cL = [1.7, 1.25, 1.25, 0, 0] // Factores de carga viva
cS = [0, 1, -1, 1, -1] // Factores de sismo
Pu = cD*PD + cL*PL + cS*PS // Carga axial última
Mu = cD*MD + cL*ML + cS*MS // Momento último
Vu = cD*VD + cL*VL + cS*VS // Cortante último
Pumax = max(Pu) // Máxima carga axial
Mumax = max(abs(Mu)) // Máximo momento
Vumax = max(abs(Vu)) // Máximo cortante`),
      { type: 'table', columnas: 'Combinación = ["1.4CM+1.7CV", "1.25(CM+CV)+CS", "1.25(CM+CV)−CS", "0.9CM+CS", "0.9CM−CS"]\nPu [tonf] = Pu\nMu [tonf*m] = Mu\nVu [tonf] = Vu', dec: '2', titulo: 'Combinaciones de diseño' },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'albanileria', normas: 'RNE — NTE E.070 Albañilería, E.030', cat: 'Albañilería', name: 'Muro de albañilería confinada E.070', icon: 'wall',
    desc: 'Densidad de muros, esfuerzo axial admisible, control de fisuración y resistencia al corte Vm (NTE E.070).',
    titulo: 'Verificación de muro de albañilería confinada — NTE E.070',
    blocks: [
      calc(`# Datos del muro y de la edificación
L = 4.20 m // Longitud total del muro (incluye columnas)
t = 13 cm // Espesor efectivo del muro (soga)
h = 2.40 m // Altura libre del muro
fm = 65 kgf/cm^2 // Resistencia a compresión f'm (ladrillo King Kong industrial)
vm = 8.1 kgf/cm^2 // Resistencia al corte v'm
Pm = 22 tonf // Carga de gravedad máxima de servicio (CM + CV)
Pg = 18 tonf // Carga de gravedad con 25 % de sobrecarga
Ve = 9.5 tonf // Cortante del sismo moderado (análisis elástico)
Me = 26 tonf*m // Momento del sismo moderado
## Densidad mínima de muros (Art. 19.2.b) — dirección analizada
Z = 0.35 // Factor de zona [0.45|0.35|0.25|0.10]
U = 1.0 // Factor de uso
S = 1.15 // Factor de suelo
N = 4 // Número de pisos
SumLt = 3.60 m^2 // Σ L·t de muros portantes en la dirección
Ap = 120 m^2 // Área de la planta típica
dens = SumLt/Ap // Densidad de muros
dmin = Z*U*S*N/56 // Densidad mínima
check dens >= dmin // Densidad de muros suficiente
check t >= h/20 // Espesor efectivo mínimo, zonas 2–4 (Art. 19.1.a)
## Esfuerzo axial máximo (Art. 19.1.b)
sigmam = Pm/(L*t) -> kgf/cm^2 // Esfuerzo axial actuante
Fa = min(0.2*fm*(1 - (h/(35*t))^2), 0.15*fm) // Esfuerzo admisible
check sigmam <= Fa // Esfuerzo axial
## Resistencia al agrietamiento diagonal (Art. 26.3)
alpha = min(max(Ve*L/Me, 1/3), 1) // Factor de esbeltez 1/3 ≤ α ≤ 1
Vm = 0.5*vm*alpha*t*L + 0.23*Pg -> tonf // Resistencia al corte (unidades de arcilla)
check Ve <= 0.55*Vm // Control de fisuración ante sismo moderado (Art. 26.2)
## Fuerzas internas ante sismo severo (Art. 26.4 y 27)
factor = min(max(Vm/Ve, 2), 3) // Factor Vm1/Ve1 (2 a 3), válido para muro del primer piso
Vu = factor*Ve // Cortante último ante sismo severo
Mu = factor*Me // Momento último`),
      text(`> La resistencia global del entrepiso ($\\Sigma V_m \\ge V_E$, Art. 26.4) debe verificarse con todos los muros del piso. El diseño de los elementos de confinamiento (columnas y vigas soleras, Art. 27) debe completarse con las fuerzas $V_u$ y $M_u$ obtenidas, considerando todos los muros del piso.`),
      { type: 'summary' },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'escalera', normas: 'RNE — NTE E.020, E.060, A.010', cat: 'Concreto armado', name: 'Escalera de un tramo', icon: 'slab',
    desc: 'Garganta, metrado con peso de pasos, momento de diseño y refuerzo longitudinal y de temperatura (E.060 / E.020).',
    titulo: 'Diseño de escalera de concreto armado',
    blocks: [
      calc(`# Geometría
Ln = 3.60 m // Luz horizontal del tramo (entre apoyos)
p = 25 cm // Paso
cp = 17.5 cm // Contrapaso
t = 15 cm // Espesor de la garganta
B = 1.20 m // Ancho de la escalera
fc = 210 kgf/cm^2
fy = 4200 kgf/cm^2
gammac = 2.4 tonf/m^3 // Peso específico del concreto
wac = 0.10 tonf/m^2 // Acabados
sc = 0.20 tonf/m^2 // Sobrecarga (E.020: viviendas) [0.20 tonf/m^2|0.40 tonf/m^2|0.50 tonf/m^2]
alfa = 1.0 // Coef. de momento (1.0 apoyos simples; 0.8 semiempotrado) [1.0|0.9|0.8]
## Verificación de geometría
check 2*cp + p >= 60 cm // Regla 2cp + p ≥ 60 cm (RNE A.010)
check 2*cp + p <= 64 cm // Regla 2cp + p ≤ 64 cm
check t >= Ln/25 // Espesor mínimo de garganta (Ln/25)
## Metrado (por metro de ancho)
theta = atan(cp/p) -> deg // Inclinación
hm = t/cos(theta) + cp/2 // Altura media equivalente
wD = gammac*hm + wac -> tonf/m^2 // Carga muerta
wu = 1.4*wD + 1.7*sc -> tonf/m^2 // Carga última (E.060 9.2.1)
Mu = alfa*wu*Ln^2/8 -> tonf*m/m // Momento último
## Diseño del refuerzo longitudinal
d = t - 2 cm - 0.64 cm // Peralte efectivo (varilla 1/2")
Rn = Mu*1 m/(0.9*100 cm*d^2)
rho = 0.85*fc/fy*(1 - sqrt(1 - 2*Rn/(0.85*fc)))
As = max(rho*100 cm*d, 0.0018*100 cm*t) // Acero por metro (mín. 0.0018 b t)
s = rounddown(min(Ab(4)/As*100 cm, 3*t, 40 cm), 2.5 cm) // Espaciamiento con 1/2"
Ast = 0.0018*100 cm*t // Acero de temperatura (transversal)
st = rounddown(min(Ab(3)/Ast*100 cm, 5*t, 40 cm), 2.5 cm) // Espaciamiento con 3/8"
phiVc = 0.85*0.53*sqrtfc(fc)*100 cm*d/(1 m) -> tonf/m // Resistencia al corte por metro
Vu = wu*(Ln/2 - d)*cos(theta) -> tonf/m // Cortante último a "d"
check Vu <= phiVc // Cortante
Asneg = As/3 // Acero negativo en los apoyos (práctica: As/3)
"Refuerzo longitudinal: varilla de 1/2\" @ {s}; negativo en apoyos {Asneg} por metro; refuerzo transversal: 3/8\" @ {st}.`),
      { type: 'summary' },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'guia', normas: '—', cat: 'General', name: 'Guía rápida (ejemplos de sintaxis)', icon: 'book',
    desc: 'Aprende en 2 minutos: variables con unidades, fórmulas, verificaciones, texto, funciones, vectores y gráficos.',
    titulo: 'Guía rápida de MemoriaCalc',
    blocks: [
      text(`# Cómo escribir una memoria
Cada **bloque de cálculo** se escribe como en una hoja: \`nombre = expresión\`. El programa genera automáticamente la fórmula simbólica, la sustitución de valores y el resultado con unidades.

| Escribe | Obtienes |
|---|---|
| \`b = 30 cm // Ancho\` | Dato de entrada (aparece en la pestaña **Datos**) |
| \`A = b*h\` | Fórmula + sustitución + resultado |
| \`M = w*L^2/8 -> tonf*m\` | Resultado convertido a la unidad indicada |
| \`check Mu <= phiMn // Flexión\` | Verificación ✔ CUMPLE / ✘ NO CUMPLE con D/C |
| \`# Título\`, \`## Subtítulo\` | Títulos numerados automáticamente |
| \`"Texto con {A} y $\\\\alpha$\` | Párrafo con valores y LaTeX |
| \`@modo corto\` / \`@ocultar\` / \`@dec 3\` | Directivas de presentación |
| \`fc = 210 kgf/cm^2 // f'c [175 kgf/cm^2\\|210 kgf/cm^2]\` | Dato con lista desplegable |`),
      calc(`## Variables, unidades y fórmulas
b = 25 cm // Ancho
h = 60 cm // Altura
fc = 210 kgf/cm^2 // Resistencia del concreto
w = 2.5 tonf/m // Carga distribuida
L = 6 m // Luz
A = b*h // Área
Ig = b*h^3/12 // Inercia
M = w*L^2/8 -> tonf*m // Momento máximo
sigma = M*(h/2)/Ig // Esfuerzo de flexión
fadm = 0.45*fc // Esfuerzo admisible en compresión
check sigma <= fadm // Esfuerzo de servicio
## Funciones y condicionales
beta1 = si(fc <= 280 kgf/cm^2, 0.85, 0.80) // si(condición, valor_si, valor_no)
n = ceil(5.3) // ceil, floor, round, max, min, abs, sqrt, sin, cos, tan, log...
As1 = Ab(5) // Área de varilla #5 (5/8")
f(x) = 3*x^2 + 2 // Función definida por el usuario
y = f(2)
## Vectores
x_i = [1, 2, 3, 4] m
total = sum(x_i)`),
      { type: 'plot', expr: 'w*x*(6 - x)/2', var: 'x', desde: '0', hasta: '6', xlabel: 'x [m]', ylabel: 'M(x) [t·m]', titulo: 'Gráfico de una función: momento en viga simplemente apoyada' },
      { type: 'summary' },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'blanco', normas: 'RNE', cat: 'General', name: 'Documento en blanco', icon: 'blank',
    desc: 'Empieza desde cero con un bloque de texto y uno de cálculo.',
    titulo: 'Memoria de cálculo',
    blocks: [
      text(`# Introducción
Describa aquí el alcance de la memoria de cálculo, normas aplicadas y materiales.`),
      calc(`# Datos
fc = 210 kgf/cm^2 // Resistencia del concreto
fy = 4200 kgf/cm^2 // Fluencia del acero`),
    ],
  },
];

// Orden de categorías en la galería de plantillas
export const CATEGORIES = [
  'General', 'Cargas y combinaciones', 'Análisis estructural',
  'Sismo — Perú', 'Sismo — Chile', 'Sismo — Japón', 'Sismo — Internacional',
  'Concreto armado', 'Concreto — normas extranjeras', 'Cimentaciones', 'Geotecnia', 'Muros de contención',
  'Puentes', 'Acero estructural', 'Albañilería', 'Madera y tierra', 'Estructuras especiales',
];
export const TEMPLATES = [...BASE_TEMPLATES, ...EXTRA_TEMPLATES];
{
  const seen = new Set();
  for (const t of TEMPLATES) { if (seen.has(t.id)) throw new Error('Plantilla duplicada: ' + t.id); seen.add(t.id); }
}
