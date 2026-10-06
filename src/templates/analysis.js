// Plantillas — módulo «analysis» (análisis estructural)
import { calc, text, summary } from './_h.js';

const CAT = 'Análisis estructural';

export default [
  // ------------------------------------------------------------------
  //  1) Pórtico de concreto armado 2 pisos × 2 vanos (E.060 / E.030)
  // ------------------------------------------------------------------
  {
    id: 'an-portico-ca', pais: 'PE', cat: CAT, icon: 'grid', normas: 'NTE E.020, E.030-2018, E.060 (RNE)',
    name: 'Pórtico de C°A° 2 pisos × 2 vanos (rigidez)',
    desc: 'Análisis matricial de un pórtico plano con cargas de gravedad y sismo estático, combinaciones E.060, envolvente, derivas y diseño de la viga más esforzada.',
    titulo: 'Análisis y diseño de pórtico de concreto armado — 2 pisos, 2 vanos',
    blocks: [
      text(`# Generalidades
La presente memoria desarrolla el **análisis estructural por el método de rigidez directa** de un pórtico plano interior de concreto armado de dos pisos y dos vanos, sometido a cargas de gravedad (muerta CM y viva CV) y a la fuerza sísmica estática equivalente (CS). Con la envolvente de las combinaciones de la NTE E.060 se diseña a flexión y cortante la viga más esforzada del primer nivel.

**Hipótesis del modelo:** elementos prismáticos con secciones brutas, nudos rígidos sin zonas de rigidez infinita, bases empotradas, comportamiento elástico lineal (análisis de primer orden), deformaciones por flexión y axiales (sin cortante).

## Normas y referencias
- NTE E.020 Cargas · NTE E.030-2018 Diseño Sismorresistente · NTE E.060 Concreto Armado (RNE, Perú).
- A. Kassimali, *Matrix Analysis of Structures*, 2.ª ed., Cengage (2012), caps. 6–7 (pórticos planos).
- R. C. Hibbeler, *Análisis estructural*, 8.ª ed., Pearson (2012), cap. 16.
- W. McGuire, R. Gallagher, R. Ziemian, *Matrix Structural Analysis*, 2.ª ed. (2000).`),
      calc(`# Datos
## Materiales
fc = 210 kgf/cm^2 // Resistencia del concreto [175 kgf/cm^2|210 kgf/cm^2|280 kgf/cm^2]
fy = 4200 kgf/cm^2 // Fluencia del acero ASTM A615 Gr. 60
gammac = 2.4 tonf/m^3 // Peso específico del concreto armado (E.020 Anexo 1)
Ec = 15000*sqrtfc(fc) -> tonf/m^2 // Módulo de elasticidad (E.060 8.5.2)
## Geometría
L1 = 6.0 m // Luz del vano 1
L2 = 5.0 m // Luz del vano 2
h1 = 3.5 m // Altura del primer entrepiso (a ejes)
h2 = 3.0 m // Altura del segundo entrepiso
bc = 40 cm // Ancho de columnas
hc = 40 cm // Peralte de columnas (dirección del pórtico)
bv = 30 cm // Ancho de vigas
hv = 55 cm // Peralte de vigas
## Cargas de gravedad (ancho tributario)
At = 4.5 m // Ancho tributario del pórtico
wlosa = 0.30 tonf/m^2 // Losa aligerada h = 20 cm (E.020 Anexo 1)
wacab = 0.10 tonf/m^2 // Piso terminado
wtab = 0.10 tonf/m^2 // Tabiquería repartida
sc1 = 0.20 tonf/m^2 // Sobrecarga de vivienda (E.020 Tabla 1)
sc2 = 0.10 tonf/m^2 // Sobrecarga de azotea (E.020 7.1)
wD1 = (wlosa + wacab + wtab)*At // Carga muerta en vigas del 1.er piso (sin peso propio)
wD2 = (wlosa + wacab)*At // Carga muerta en vigas de azotea (sin peso propio)
wL1 = sc1*At // Carga viva en vigas del 1.er piso
wL2 = sc2*At // Carga viva en vigas de azotea
"El peso propio de vigas y columnas se incluye automáticamente en el caso CM ($\\gamma_c A$ por metro).`),
      calc(`## Fuerza sísmica estática equivalente (E.030-2018, Art. 28)
Z = 0.45 // Factor de zona [0.45 : Zona 4|0.35 : Zona 3|0.25 : Zona 2|0.10 : Zona 1]
U = 1.0 // Factor de uso (categoría C, vivienda)
S = 1.05 // Factor de suelo (S2, zona 4)
Tp = 0.6 s // Periodo TP del suelo
hn = h1 + h2 // Altura total
CT = 35 // Coeficiente para pórticos de concreto armado (E.030 28.4.1)
Ta = hn/CT*(1 s/m) // Periodo fundamental aproximado T = hn/CT
C = si(Ta < Tp, 2.5, 2.5*Tp/Ta) // Factor de amplificación sísmica (E.030 14)
R = 8 // Coeficiente de reducción, pórticos de C°A° regulares (E.030 Tabla 7)
check C/R >= 0.11 // Valor mínimo de C/R (E.030 28.2.2)
P1 = (wD1 + 0.25*wL1 + gammac*bv*hv)*(L1 + L2) + 3*gammac*bc*hc*(h1 + h2)/2 -> tonf // Peso sísmico del nivel 1 (CM + 25 % CV)
P2 = (wD2 + 0.25*wL2 + gammac*bv*hv)*(L1 + L2) + 3*gammac*bc*hc*h2/2 -> tonf // Peso sísmico del nivel 2
V = Z*U*C*S/R*(P1 + P2) // Fuerza cortante en la base
F1 = V*P1*h1/(P1*h1 + P2*hn) // Fuerza en el nivel 1 (k = 1, T < 0.5 s)
F2 = V*P2*hn/(P1*h1 + P2*hn) // Fuerza en el nivel 2`),
      text(`# Análisis matricial del pórtico
El pórtico se modela con 9 nudos y 10 barras; los casos de carga CM, CV y CS se resuelven por el método de rigidez directa ($\\mathbf{K}\\,\\mathbf{u} = \\mathbf{F}$) y se combinan según la NTE E.060 (9.2): $U_1 = 1.4\\,CM + 1.7\\,CV$, $U_2 = 1.25(CM + CV) \\pm CS$, $U_3 = 0.9\\,CM \\pm CS$. Las derivas se controlan con los desplazamientos elásticos del caso CS multiplicados por $0.75R$ (E.030 31.1), y la deflexión de vigas con la combinación de servicio $CM + CV$.`),
      {
        type: 'frame2d', tipo: 'portico',
        nudos: '1 0 0\n2 L1 0\n3 L1+L2 0\n4 0 h1\n5 L1 h1\n6 L1+L2 h1\n7 0 hn\n8 L1 hn\n9 L1+L2 hn',
        secciones: 'C rect bc hc Ec\nV rect bv hv Ec',
        barras: '1 1 4 C\n2 2 5 C\n3 3 6 C\n4 4 7 C\n5 5 8 C\n6 6 9 C\n7 4 5 V\n8 5 6 V\n9 7 8 V\n10 8 9 V',
        apoyos: '1,2,3 E',
        cargas: 'CM: U 7,8 wD1\nCM: U 9,10 wD2\nCV: U 7,8 wL1\nCV: U 9,10 wL2\nCS: N 4 F1 0\nCS: N 7 F2 0',
        casos: 'CM Carga muerta (incluye peso propio)\nCV Carga viva\nCS Sismo estático en X',
        pp: 'CM gammac',
        combinaciones: 'U1 = 1.4 CM + 1.7 CV\nU2 = 1.25(CM + CV) ± CS\nU3 = 0.9 CM ± CS',
        grupos: 'VIG1 7,8\nVIG2 9,10\nCOL 1-6',
        servicio: 'CM + CV', graficos: 'C M V N D', deflim: '480', deflbarras: '7-10',
        deriva_caso: 'CS', deriva_f: '0.75*R', deriva_lim: '0.007',
        titulo: 'Pórtico de concreto armado (eje típico)',
      },
      calc(`# Diseño de la viga del primer nivel (barra 7)
"Esfuerzos de la envolvente exportados por el análisis: $M^-$ = {Mneg_7}, $M^+$ = {Mpos_7}, $V$ = {Vmax_7}.
Mu_n = -Mneg_7 // Momento negativo último (envolvente E.060)
Mu_p = Mpos_7 // Momento positivo último (envolvente E.060)
Vu = Vmax_7 // Cortante último (conservador: en el eje del nudo)
bar = 6 // Varilla longitudinal [5 : 5/8"|6 : 3/4"|8 : 1"]
est = 3 // Estribo [3 : 3/8"|4 : 1/2"]
d = hv - 4 cm - db(est) - db(bar)/2 // Peralte efectivo
phif = 0.9 // Factor de reducción por flexión (E.060 9.3.2.1)
## Acero negativo (apoyo interior)
Rn = Mu_n/(phif*bv*d^2) // Parámetro de resistencia
rho = 0.85*fc/fy*(1 - sqrt(max(0, 1 - 2*Rn/(0.85*fc)))) // Cuantía requerida (si 2Rn > 0.85f'c la sección es insuficiente: ρ = 0.85f'c/fy y las verificaciones no cumplen)
Asmin = 0.7*sqrtfc(fc)/fy*bv*d // Acero mínimo (E.060 10.5.2)
As_n = max(rho*bv*d, Asmin) // Acero requerido
n_n = max(2, ceil(As_n/Ab(bar))) // Número de varillas
a_n = n_n*Ab(bar)*fy/(0.85*fc*bv) // Bloque de compresiones
phiMn_n = phif*n_n*Ab(bar)*fy*(d - a_n/2) -> tonf*m // Momento resistente
check Rn <= 0.85*fc/2 // La sección admite solución con acero simple (Rn ≤ 0.425 f'c)
check Mu_n <= phiMn_n // Flexión negativa (E.060 10)
rhob = 0.85*0.85*fc/fy*6000/(6000 + fy/(1 kgf/cm^2)) // Cuantía balanceada (β1 = 0.85)
check n_n*Ab(bar) <= 0.75*rhob*bv*d // Acero máximo 0.75ρb (E.060 10.3.4)
## Acero positivo (centro de luz)
Rp = Mu_p/(phif*bv*d^2) // Parámetro de resistencia
As_p = max(0.85*fc/fy*(1 - sqrt(max(0, 1 - 2*Rp/(0.85*fc))))*bv*d, Asmin) // Acero requerido
n_p = max(2, ceil(As_p/Ab(bar))) // Número de varillas
phiMn_p = phif*n_p*Ab(bar)*fy*(d - n_p*Ab(bar)*fy/(0.85*fc*bv)/2) -> tonf*m // Momento resistente
check Mu_p <= phiMn_p // Flexión positiva (E.060 10)
## Cortante
phiv = 0.85 // Factor de reducción por cortante (E.060 9.3.2.3)
Vc = 0.53*sqrtfc(fc)*bv*d // Aporte del concreto (E.060 11.3.1.1)
Vs = max(Vu/phiv - Vc, 0 tonf) // Aporte requerido del acero
check Vs <= 2.1*sqrtfc(fc)*bv*d // Límite de Vs (E.060 11.5.7.9)
s_req = si(Vs > 0 tonf, 2*Ab(est)*fy*d/Vs, 60 cm) // Espaciamiento requerido
s = rounddown(min(s_req, d/4, 15 cm), 2.5 cm) // Espaciamiento en zona de confinamiento (E.060 21.4.4.4)
check s <= d/4 // Espaciamiento máximo en zona de confinamiento
"Viga {bv} × {hv}: refuerzo superior {n_n} Ø #{bar}, inferior {n_p} Ø #{bar}, estribos Ø #{est} @ {s} en zona confinada.`),
      calc(`## Verificación de columnas (resumen)
Pu_c = Nc_COL // Máxima compresión última en columnas (envolvente)
Ag = bc*hc // Área bruta de la columna
phiPn = 0.7*0.8*(0.85*fc*(Ag - 0.01*Ag) + fy*0.01*Ag) -> tonf // Resistencia axial máxima con ρ = 1 % (E.060 10.3.6.2)
check Pu_c <= phiPn // Compresión axial máxima en columnas
nu_c = Pu_c/(fc*Ag) // Carga axial normalizada (si > 0.1 el elemento se diseña como columna en flexocompresión, E.060 21.6.1)
"Las columnas deben diseñarse en flexocompresión con el diagrama de interacción P-M usando las combinaciones exportadas ($M$ y $N$ de cada barra) y verificarse por capacidad (columna fuerte – viga débil, E.060 21.6.2).`),
      summary(),
    ],
  },

  // ------------------------------------------------------------------
  //  2) Armadura de techo Pratt (acero) — análisis y verificación AISC 360
  // ------------------------------------------------------------------
  {
    id: 'an-armadura', pais: 'INT', cat: CAT, icon: 'steel', normas: 'AISC 360-16 (E3, D2), NTE E.020, E.090',
    name: 'Armadura de techo de acero (Pratt a dos aguas)',
    desc: 'Armadura a dos aguas analizada por rigidez (barras articuladas): fuerzas axiales, tracción/compresión, y verificación de cordones, montantes y diagonales con AISC 360.',
    titulo: 'Análisis y verificación de armadura de techo tipo Pratt',
    blocks: [
      text(`# Generalidades
Se analiza una armadura de techo a dos aguas tipo **Pratt** de 12 m de luz, con seis paneles de 2.0 m y flecha de 2.0 m, que soporta correas en los nudos del cordón superior. El modelo es de **barras biarticuladas** (solo fuerza axial) y se resuelve por el método de rigidez directa; la estructura es isostática ($b + r = 2n$: 21 + 3 = 2·12). Las barras se verifican a tracción (AISC 360-16, cap. D) y a compresión (cap. E, Art. E3) con la envolvente de las combinaciones LRFD.

## Normas y referencias
- AISC 360-16 *Specification for Structural Steel Buildings* · NTE E.090 Estructuras metálicas · NTE E.020 Cargas (7.1, techos).
- R. C. Hibbeler, *Análisis estructural*, cap. 3 (armaduras: método de los nudos).
- A. Kassimali, *Matrix Analysis of Structures*, cap. 3–4 (armaduras planas por rigidez).`),
      calc(`# Datos
## Geometría
Lt = 12 m // Luz de la armadura
f = 2.0 m // Flecha (altura en la cumbrera)
p = Lt/6 // Longitud de panel
st = 5.0 m // Separación entre armaduras
## Material y secciones (ángulos dobles, ASTM A36)
Es = 200000 MPa // Módulo de elasticidad
Fy = 250 MPa // Esfuerzo de fluencia A36
Fu = 400 MPa // Resistencia a tracción A36
A_c = 15.35 cm^2 // Cordones: 2L 2½×2½×¼" — área
r_c = 1.96 cm // Cordones: radio de giro mínimo (eje x de la sección)
A_w = 9.23 cm^2 // Montantes y diagonales: 2L 2×2×3/16" — área
r_w = 1.57 cm // Montantes y diagonales: radio de giro mínimo
## Cargas
wD = 30 kgf/m^2 // Cubierta + correas + instalaciones (E.020)
theta = atan(f/(Lt/2)) -> deg // Inclinación del techo
wLr = max(100 kgf/m^2 - 5 kgf/m^2*(theta/(1 deg) - 3), 50 kgf/m^2) -> kgf/m^2 // Sobrecarga de techo inclinado (E.020 7.1)
PD = wD*st*p -> tonf // Carga muerta por nudo interior
PL = wLr*st*p -> tonf // Carga viva de techo por nudo interior
"El peso propio de la armadura ($\\gamma_s = 7.85$ t/m³ por el área de cada barra) se agrega al caso CM; en las barras genera flexión local despreciable y se transmite a los nudos.`),
      {
        type: 'frame2d', tipo: 'armadura',
        nudos: '1 0 0\n2 p 0\n3 2*p 0\n4 3*p 0\n5 4*p 0\n6 5*p 0\n7 6*p 0\n8 p f/3\n9 2*p 2*f/3\n10 3*p f\n11 4*p 2*f/3\n12 5*p f/3',
        secciones: 'CO Es A_c\nWE Es A_w',
        barras: '1 1 2 CO\n2 2 3 CO\n3 3 4 CO\n4 4 5 CO\n5 5 6 CO\n6 6 7 CO\n7 1 8 CO\n8 8 9 CO\n9 9 10 CO\n10 10 11 CO\n11 11 12 CO\n12 12 7 CO\n13 2 8 WE\n14 3 9 WE\n15 4 10 WE\n16 5 11 WE\n17 6 12 WE\n18 8 3 WE\n19 9 4 WE\n20 11 4 WE\n21 12 5 WE',
        apoyos: '1 A\n7 Ry',
        cargas: 'CM: N 8-12 0 -PD\nCM: N 1,7 0 -PD/2\nCV: N 8-12 0 -PL\nCV: N 1,7 0 -PL/2',
        casos: 'CM Carga muerta\nCV Carga viva de techo',
        pp: 'CM 7.85 tonf/m^3',
        combinaciones: 'U1 = 1.4 CM\nU2 = 1.2 CM + 1.6 CV',
        grupos: 'CS 7-12\nCI 1-6\nMON 13-17\nDIA 18-21',
        servicio: 'CM + CV', graficos: 'C N D',
        titulo: 'Armadura Pratt de 12 m',
      },
      calc(`# Verificación de barras (AISC 360-16, LRFD)
phit = 0.90 // Fluencia en tracción (D2)
phic = 0.90 // Compresión (E1)
K = 1.0 // Factor de longitud efectiva (barras biarticuladas)
lim = 4.71*sqrt(Es/Fy) // Límite de esbeltez inelástica (E3)
## Cordón superior (compresión)
Pu_cs = Nc_CS // Compresión máxima del grupo
KLr_cs = K*Lc_CS/r_c // Esbeltez de la barra que gobierna
check KLr_cs <= 200 // Esbeltez recomendada (E2, nota)
Fe_cs = pi^2*Es/KLr_cs^2 // Esfuerzo de pandeo elástico (E3-4)
Fcr_cs = si(KLr_cs <= lim, 0.658^(Fy/Fe_cs)*Fy, 0.877*Fe_cs) // Esfuerzo crítico (E3-2, E3-3)
phiPn_cs = phic*Fcr_cs*A_c -> tonf // Resistencia de diseño a compresión
check NcL_CS <= phiPn_cs // Compresión en el cordón superior
## Cordón inferior (tracción)
Pu_ci = Nt_CI // Tracción máxima del grupo
phiPn_ci = phit*Fy*A_c -> tonf // Fluencia en el área bruta (D2-1)
phiPr_ci = 0.75*Fu*0.85*A_c -> tonf // Rotura en el área neta efectiva, U = 0.85 (D2-2, D3)
check Pu_ci <= min(phiPn_ci, phiPr_ci) // Tracción en el cordón inferior
check Lmax_CI/r_c <= 300 // Esbeltez de barras en tracción (D1)
## Montantes y diagonales (perfil 2L 2×2×3/16")
"Por la pendiente del cordón superior, bajo cargas de gravedad las diagonales de esta configuración trabajan a compresión y los montantes a tracción; se verifican ambos estados.
phiPt_w = min(phit*Fy*A_w, 0.75*Fu*0.85*A_w) -> tonf // Resistencia a tracción (D2)
check Nt_MON <= phiPt_w // Tracción en montantes
check Lmax_MON/r_w <= 300 // Esbeltez de montantes (D1)
KLr_di = K*Lc_DIA/r_w // Esbeltez de la diagonal que gobierna
check KLr_di <= 200 // Esbeltez recomendada de diagonales
Fe_di = pi^2*Es/KLr_di^2 // Pandeo elástico
Fcr_di = si(KLr_di <= lim, 0.658^(Fy/Fe_di)*Fy, 0.877*Fe_di) // Esfuerzo crítico
phiPn_di = phic*Fcr_di*A_w -> tonf // Resistencia de diseño a compresión
check NcL_DIA <= phiPn_di // Compresión en diagonales
## Deflexión de servicio
dmax = -deltay_10 // Deflexión vertical en la cumbrera (CM + CV)
check dmax <= Lt/360 // Deflexión admisible de la armadura`),
      summary(),
    ],
  },

  // ------------------------------------------------------------------
  //  3) Nave industrial — pórtico a dos aguas con viento
  // ------------------------------------------------------------------
  {
    id: 'an-nave', pais: 'PE', cat: CAT, icon: 'steel', normas: 'NTE E.020 (Art. 12 viento), E.090, AISC 360-16',
    name: 'Nave industrial: pórtico a dos aguas con viento',
    desc: 'Pórtico de acero a dos aguas con carga muerta, viva de techo y viento E.020; envolvente LRFD, desplazamiento lateral, deflexión y verificación flexocompresión AISC H1.',
    titulo: 'Análisis de pórtico a dos aguas de nave industrial',
    blocks: [
      text(`# Generalidades
Se analiza el pórtico principal de una nave industrial de acero: columnas de 6.0 m, luz de 20 m y cumbrera a 8.0 m (pendiente 20 %), con pórticos cada 6.0 m y bases empotradas. Las cargas de viento se determinan con la **NTE E.020, Art. 12** ($p_h = 0.005\\,C\\,V_h^2$) para el viento transversal de izquierda a derecha, actuando perpendicular a cada superficie. Las combinaciones de la NTE E.090 se resuelven con un **análisis elástico de segundo orden** (efectos P-Δ y P-δ con la matriz geométrica, iterativo), como exige AISC 360-16 C1 para usar el método de la longitud efectiva (Anexo 7).

## Normas y referencias
- NTE E.020 Cargas (Art. 7 techos, Art. 12 viento) · NTE E.090 Estructuras metálicas (1.4) · AISC 360-16 (cap. H).
- A. Kassimali, *Matrix Analysis of Structures*, cap. 6 (pórticos planos, cargas en barras inclinadas).
- AISC Design Guide 3 *Serviceability Design Considerations* (desplazamiento lateral H/100–H/200 en naves).`),
      calc(`# Datos
## Geometría
Lb = 20 m // Luz de la nave
hcol = 6.0 m // Altura de columnas
hr = 2.0 m // Altura de la cumbrera sobre los aleros
sp = 6.0 m // Separación entre pórticos
## Perfiles (ASTM A992)
Es = 200000 MPa // Módulo de elasticidad
Fy = 345 MPa // Fluencia
A_col = 64.5 cm^2 // Columna W14×34: área
I_col = 14150 cm^4 // Columna W14×34: inercia Ix
Z_col = 895 cm^3 // Columna W14×34: módulo plástico Zx
r_col = 14.8 cm // Columna W14×34: radio de giro rx
A_vig = 64.5 cm^2 // Viga W14×34: área
I_vig = 14150 cm^4 // Viga W14×34: inercia Ix
## Cargas de gravedad
wcub = 25 kgf/m^2 // Cubierta + correas + instalaciones
pend = atan(hr/(Lb/2)) -> deg // Pendiente del techo
wlr = max(100 kgf/m^2 - 5 kgf/m^2*(pend/(1 deg) - 3), 50 kgf/m^2) -> kgf/m^2 // Carga viva de techo (E.020 7.1)
qD = wcub*sp -> tonf/m // Carga muerta sobre las vigas (por longitud de barra)
qL = wlr*sp -> tonf/m // Carga viva (por proyección horizontal)
## Viento (E.020 Art. 12)
V = 75 // Velocidad básica a 10 m [km/h] (mapa eólico, mín. 75 km/h)
hv = hcol + hr // Altura de la edificación
Vh = V*(hv/(10 m))^0.22 // Velocidad de diseño (E.020 12.3)
ph = 0.005*Vh^2 kgf/m^2 -> kgf/m^2 // Presión dinámica con C = 1 (E.020 12.4)
qw1 = 0.8*ph*sp -> tonf/m // Muro a barlovento, C = +0.8 (presión)
qw2 = 0.6*ph*sp -> tonf/m // Muro a sotavento, C = −0.6 (succión)
qw3 = 0.7*ph*sp -> tonf/m // Techo a barlovento, C = −0.7 (succión, pendiente < 15°)
qw4 = 0.6*ph*sp -> tonf/m // Techo a sotavento, C = −0.6 (succión)`),
      {
        type: 'frame2d', tipo: 'portico',
        nudos: '1 0 0\n2 0 hcol\n3 Lb/2 hcol+hr\n4 Lb hcol\n5 Lb 0',
        secciones: 'COL Es A_col I_col\nVIG Es A_vig I_vig',
        barras: '1 1 2 COL\n2 2 3 VIG\n3 3 4 VIG\n4 5 4 COL',
        apoyos: '1,5 E',
        cargas: 'CM: U 2,3 qD\nCV: U 2,3 qL proy\nW: U 1 qw1 horiz\nW: U 4 qw2 horiz\nW: U 2 qw3 perp\nW: U 3 qw4 perp',
        casos: 'CM Carga muerta (incluye peso propio)\nCV Carga viva de techo\nW Viento transversal (izquierda → derecha)',
        pp: 'CM 7.85 tonf/m^3',
        combinaciones: 'U1 = 1.4 CM\nU2 = 1.2 CM + 1.6 CV\nU3 = 1.2 CM + 0.5 CV + 1.3 W\nU4 = 0.9 CM + 1.3 W',
        grupos: 'COL 1,4\nVIG 2,3',
        servicio: 'CM + CV', graficos: 'C M V N D',
        deriva_caso: 'W', deriva_f: '1', deriva_lim: '1/100', pdelta: true,
        titulo: 'Pórtico a dos aguas de la nave',
      },
      calc(`# Verificación de columnas (AISC 360-16, cap. H)
Pu = Nc_COL // Compresión máxima en columnas
Mu = Mmax_COL // Momento máximo en columnas
K = 1.5 // Longitud efectiva en el plano (pórtico no arriostrado, estimado)
KLr = K*hcol/r_col // Esbeltez en el plano del pórtico
Fe = pi^2*Es/KLr^2 // Pandeo elástico (E3-4)
Fcr = si(KLr <= 4.71*sqrt(Es/Fy), 0.658^(Fy/Fe)*Fy, 0.877*Fe) // Esfuerzo crítico (E3)
phiPn = 0.9*Fcr*A_col -> tonf // Resistencia a compresión
phiMn = 0.9*Fy*Z_col -> tonf*m // Resistencia a flexión (Lb ≤ Lp por arriostres de correas y vigas de fachada)
ra = Pu/phiPn // Relación axial
IH = si(ra >= 0.2, ra + 8/9*Mu/phiMn, ra/2 + Mu/phiMn) // Interacción (H1-1a / H1-1b)
check IH <= 1.0 // Flexocompresión en columnas
# Desplazamientos de servicio
dcum = -deltay_3 // Descenso de la cumbrera con CM + CV
check dcum <= Lb/240 // Deflexión vertical de la cubierta ≤ L/240 (E.090 / AISC DG3)
# Verificación de la viga del techo
Mu_v = Mmax_VIG // Momento máximo en vigas
check Mu_v <= phiMn // Flexión en vigas (perfil compacto)
check Vmax_VIG <= 1.0*0.6*Fy*(35.5 cm*0.724 cm) // Cortante en el alma, φv = 1.0 (G2.1a): d·tw de W14×34`),
      summary(),
    ],
  },

  // ------------------------------------------------------------------
  //  4) Vigas en voladizo y simples (biblioteca de casos)
  // ------------------------------------------------------------------
  {
    id: 'an-voladizo', pais: 'INT', cat: CAT, icon: 'beam', normas: 'AISC Manual Tabla 3-23, Roark Tabla 8.1, NTE E.060',
    name: 'Viga en voladizo y viga simple (casos tabulados)',
    desc: 'Voladizo de balcón con carga uniforme y puntual (superposición) y dintel simplemente apoyado: fórmulas cerradas, diagramas V-M-δ y verificación de deflexiones.',
    titulo: 'Vigas en voladizo y simplemente apoyadas — casos tabulados',
    blocks: [
      text(`# Generalidades
Esta memoria resuelve vigas isostáticas e hiperestáticas simples con **fórmulas cerradas** de la Tabla 3-23 del *AISC Steel Construction Manual* y de la Tabla 8.1 de *Roark's Formulas for Stress and Strain*. Para cada caso se muestran las fórmulas, su valor numérico y los diagramas de cortante, momento y deflexión (obtenidos además por el método de rigidez, con los que coinciden). Las solicitaciones de cargas combinadas se obtienen por **superposición** (análisis elástico lineal).

## Referencias
- AISC *Steel Construction Manual*, 15.ª ed., Tabla 3-23 «Shears, Moments and Deflections».
- W. C. Young, R. G. Budynas, A. M. Sadegh, *Roark's Formulas for Stress and Strain*, 8.ª ed., Tabla 8.1.
- NTE E.060 Concreto Armado, Tabla 9.2 (deflexiones máximas admisibles).`),
      calc(`# Voladizo de balcón
fc = 210 kgf/cm^2 // Concreto
Ec = 15000*sqrtfc(fc) -> tonf/m^2 // Módulo de elasticidad (E.060 8.5.2)
b = 25 cm // Ancho de la viga en voladizo
h = 50 cm // Peralte en el empotramiento
Ig = b*h^3/12 -> m^4 // Inercia bruta
Lv = 1.80 m // Longitud del voladizo
wv = 1.20 tonf/m // Carga uniforme de servicio (losa + acabados + s/c)
Pv = 0.60 tonf // Parapeto en el extremo libre (carga puntual de servicio)`),
      { type: 'beamcase', apoyo: 'V', carga: 'U', L: 'Lv', w: 'wv', E: 'Ec', I: 'Ig', sufijo: 'w', titulo: 'Voladizo con carga uniforme' },
      { type: 'beamcase', apoyo: 'V', carga: 'P', L: 'Lv', P: 'Pv', a: 'Lv', E: 'Ec', I: 'Ig', sufijo: 'P', titulo: 'Voladizo con carga puntual en el extremo' },
      calc(`## Superposición y verificación
Ms = -(MA_w + MA_P) // Momento de servicio en el empotramiento
Mu = 1.5*Ms // Momento último aproximado (factor promedio 1.4–1.7)
delta = deltamax_w + deltamax_P // Deflexión inmediata en el extremo libre (superposición)
check delta <= 2*Lv/360 // Deflexión inmediata ≤ ℓ/360 con ℓ = 2Lv (E.060 Tabla 9.2)
d = h - 6 cm // Peralte efectivo
fy = 4200 kgf/cm^2 // Acero
As = 3*Ab(5) // Refuerzo superior colocado: 3 Ø 5/8"
a = As*fy/(0.85*fc*b) // Bloque equivalente de compresiones
phiMn = 0.9*As*fy*(d - a/2) -> tonf*m // Momento resistente de diseño
check Mu <= phiMn // Flexión en el empotramiento`),
      calc(`# Dintel simplemente apoyado
Ld = 3.5 m // Luz del dintel
Pd = 2.0 tonf // Carga puntual de una viga que apoya en el dintel
ad = 1.5 m // Posición de la carga desde el apoyo A
Id = 0.25 m*(0.40 m)^3/12 // Inercia del dintel 25 × 40 cm`),
      { type: 'beamcase', apoyo: 'SA', carga: 'P', L: 'Ld', P: 'Pd', a: 'ad', E: 'Ec', I: 'Id', deflim: '480', sufijo: 'd', titulo: 'Dintel con carga puntual' },
      calc(`check Mmax_d <= MSAp(Pd, ad, Ld)*1.0001 // Coincidencia con la fórmula Pab/L`),
      summary(),
    ],
  },

  // ------------------------------------------------------------------
  //  5) Líneas de influencia
  // ------------------------------------------------------------------
  {
    id: 'an-influencia', pais: 'INT', cat: CAT, icon: 'plot', normas: 'Hibbeler cap. 6 y 10 · NTE E.060',
    name: 'Líneas de influencia de viga continua',
    desc: 'Líneas de influencia de momento en el tramo, momento en apoyo, cortante y reacción de una viga continua de 3 tramos; posición desfavorable de la carga viva y diseño.',
    titulo: 'Líneas de influencia de viga continua de tres tramos',
    blocks: [
      text(`# Generalidades
Las **líneas de influencia** representan la variación de un efecto (reacción, cortante o momento en una sección fija) cuando una carga unitaria recorre la estructura. Según el **principio de Müller-Breslau**, la línea de influencia es la deformada de la estructura cuando se libera el vínculo asociado al efecto y se le impone un desplazamiento unitario. En vigas continuas (hiperestáticas) las líneas son curvas; aquí se obtienen resolviendo la viga por el método de rigidez para cada posición de la carga.

Con ellas se determina la **disposición desfavorable de la carga viva** (alternancia): la carga viva se coloca solo en las zonas de ordenada del mismo signo que el efecto buscado ($E_{max} = w_D \\Sigma A + w_L A^+$).

## Referencias
- R. C. Hibbeler, *Análisis estructural*, 8.ª ed., cap. 6 (líneas de influencia de estructuras isostáticas) y cap. 10 (hiperestáticas).
- A. Ghali, A. Neville, *Structural Analysis: A Unified Classical and Matrix Approach*, cap. 12.`),
      calc(`# Datos
La1 = 8 m // Tramo 1
La2 = 10 m // Tramo 2
La3 = 8 m // Tramo 3
wD = 2.0 tonf/m // Carga muerta de servicio
wL = 1.2 tonf/m // Carga viva de servicio
xs = 0.4*La1 // Sección de estudio en el tramo 1 (0.4 L, cerca del M+ máximo)`),
      { type: 'influence', tramos: 'La1, La2, La3', apoyos: 'A, A, A, A', efecto: 'M', x: 'xs', wD: '1.4*wD', wL: '1.7*wL', sufijo: 'M1', titulo: 'Línea de influencia del momento en la sección s (x = 0.4 L₁)' },
      { type: 'influence', tramos: 'La1, La2, La3', apoyos: 'A, A, A, A', efecto: 'M', x: 'La1', wD: '1.4*wD', wL: '1.7*wL', sufijo: 'MB', titulo: 'Línea de influencia del momento en el apoyo B' },
      { type: 'influence', tramos: 'La1, La2, La3', apoyos: 'A, A, A, A', efecto: 'V', x: 'La1', lado: 'der', wD: '1.4*wD', wL: '1.7*wL', sufijo: 'VB', titulo: 'Línea de influencia del cortante a la derecha del apoyo B' },
      { type: 'influence', tramos: 'La1, La2, La3', apoyos: 'A, A, A, A', efecto: 'R', x: '2', wD: '1.4*wD', wL: '1.7*wL', sufijo: 'RB', titulo: 'Línea de influencia de la reacción en B' },
      calc(`# Esfuerzos de diseño y verificación de la viga (30 × 70 cm)
Mu_p = Emax_M1 // Momento positivo último en la sección s
Mu_n = -Emin_MB // Momento negativo último en el apoyo B
Vu = Emax_VB // Cortante último a la derecha de B
fc = 210 kgf/cm^2 // Concreto
fy = 4200 kgf/cm^2 // Acero
bw = 30 cm // Ancho
d = 64 cm // Peralte efectivo (h = 70 cm)
Asp = 5*Ab(6) // Refuerzo inferior: 5 Ø 3/4"
phiMn_p = 0.9*Asp*fy*(d - Asp*fy/(0.85*fc*bw)/2) -> tonf*m // Momento resistente positivo
check Mu_p <= phiMn_p // Flexión positiva en el tramo 1
Asn = 4*Ab(8) // Refuerzo superior: 4 Ø 1"
phiMn_n = 0.9*Asn*fy*(d - Asn*fy/(0.85*fc*bw)/2) -> tonf*m // Momento resistente negativo
check Mu_n <= phiMn_n // Flexión negativa en el apoyo B
phiVn = 0.85*(0.53*sqrtfc(fc)*bw*d + 2*Ab(3)*fy*d/(15 cm)) -> tonf // Ø 3/8" @ 15 cm
check Vu <= phiVn // Cortante junto al apoyo B
"Las ordenadas máximas permiten verificar las fórmulas clásicas: por ejemplo, para una carga puntual móvil el momento máximo en s es $P\\,\\eta^+$ = {etamax_M1} × P.`),
      summary(),
    ],
  },

  // ------------------------------------------------------------------
  //  6) Análisis matricial paso a paso (didáctico)
  // ------------------------------------------------------------------
  {
    id: 'an-matricial', pais: 'INT', cat: CAT, icon: 'calc', normas: 'Kassimali (2012) caps. 6–7',
    name: 'Análisis matricial paso a paso (pórtico)',
    desc: 'Didáctico: matrices de rigidez local, transformación, global, ensamblaje, solución K·u = F y fuerzas en extremos de un pórtico simple, comparado con el bloque Pórtico 2D.',
    titulo: 'Análisis matricial paso a paso de un pórtico plano',
    blocks: [
      text(`# Generalidades
Se resuelve paso a paso, con todas las matrices a la vista, un **pórtico plano de un vano** con columnas empotradas en la base, una carga lateral $H$ en el nudo 2 y carga uniforme $w$ en la viga. El procedimiento es el del **método de rigidez directa** (Kassimali, cap. 6):

1. Matriz de rigidez de cada barra en coordenadas locales $\\mathbf{k}$.
2. Matriz de transformación $\\mathbf{T}$ y matriz global de la barra $\\mathbf{K} = \\mathbf{T}^T \\mathbf{k}\\,\\mathbf{T}$.
3. Ensamblaje de la matriz de la estructura $\\mathbf{S}$ con los grados de libertad libres (nudos 2 y 3: $u, v, \\theta$).
4. Vector de cargas $\\mathbf{P} - \\mathbf{P}_f$ (cargas en nudos menos fuerzas de empotramiento).
5. Solución $\\mathbf{d} = \\mathbf{S}^{-1}(\\mathbf{P} - \\mathbf{P}_f)$ y fuerzas en extremos $\\mathbf{Q} = \\mathbf{k}\\,\\mathbf{T}\\,\\mathbf{v} + \\mathbf{Q}_f$.

Unidades consistentes: **t y m** (las matrices se escriben sin unidades). Convención: ejes globales $x$ → derecha, $y$ ↑, giros antihorarios positivos.

## Referencias
- A. Kassimali, *Matrix Analysis of Structures*, 2.ª ed., Cengage (2012): Ec. 6.6 (k local), 6.19 (T), 6.29 (K global).
- W. McGuire, R. Gallagher, R. Ziemian, *Matrix Structural Analysis*, cap. 4–5.`),
      calc(`# Datos (t, m)
E = 2170000 // Módulo de elasticidad [t/m²]
h = 4.0 // Altura de columnas [m]
L = 6.0 // Luz de la viga [m]
Ac = 0.40*0.40 // Área de columnas 40 × 40 [m²]
Ic = 0.40*0.40^3/12 // Inercia de columnas [m⁴]
Av = 0.30*0.60 // Área de la viga 30 × 60 [m²]
Iv = 0.30*0.60^3/12 // Inercia de la viga [m⁴]
H = 5.0 // Carga lateral en el nudo 2 [t]
w = 3.0 // Carga uniforme en la viga, hacia abajo [t/m]
# Matrices de las barras
## Matriz de rigidez local (Kassimali Ec. 6.6)
kl(A, I, Lm) = [[E*A/Lm, 0, 0, -E*A/Lm, 0, 0], [0, 12*E*I/Lm^3, 6*E*I/Lm^2, 0, -12*E*I/Lm^3, 6*E*I/Lm^2], [0, 6*E*I/Lm^2, 4*E*I/Lm, 0, -6*E*I/Lm^2, 2*E*I/Lm], [-E*A/Lm, 0, 0, E*A/Lm, 0, 0], [0, -12*E*I/Lm^3, -6*E*I/Lm^2, 0, 12*E*I/Lm^3, -6*E*I/Lm^2], [0, 6*E*I/Lm^2, 2*E*I/Lm, 0, -6*E*I/Lm^2, 4*E*I/Lm]]
Tr(cx, sx) = [[cx, sx, 0, 0, 0, 0], [-sx, cx, 0, 0, 0, 0], [0, 0, 1, 0, 0, 0], [0, 0, 0, cx, sx, 0], [0, 0, 0, -sx, cx, 0], [0, 0, 0, 0, 0, 1]]
@dec 1
## Barra 1: columna 1 → 2 (θ = 90°)
k1 = kl(Ac, Ic, h) // Rigidez local
T1 = Tr(0, 1) // Transformación: cos θ = 0, sen θ = 1
K1 = transpose(T1) * k1 * T1 // Rigidez global de la barra 1
## Barra 2: viga 2 → 3 (θ = 0°)
k2 = kl(Av, Iv, L) // Rigidez local (T = I, K2 = k2)
K2 = k2 // Rigidez global de la barra 2
## Barra 3: columna 4 → 3 (θ = 90°)
k3 = kl(Ac, Ic, h) // Rigidez local
T3 = Tr(0, 1) // Transformación
K3 = transpose(T3) * k3 * T3 // Rigidez global de la barra 3`),
      calc(`# Ensamblaje de la matriz de la estructura
"Grados de libertad libres: $d_1, d_2, d_3$ = $u_2, v_2, \\theta_2$ y $d_4, d_5, d_6$ = $u_3, v_3, \\theta_3$. La barra 1 aporta su submatriz del extremo j, la barra 3 la de su extremo j y la barra 2 completa.
@dec 1
S11 = bloque(K1, 2, 2) + bloque(K2, 1, 1) // Bloque del nudo 2 (submatrices 3×3)
S12 = bloque(K2, 1, 2) // Acoplamiento nudos 2–3
S22 = bloque(K2, 2, 2) + bloque(K3, 2, 2) // Bloque del nudo 3
@modo corto
Ss = concat(concat(S11, S12, 2), concat(transpose(S12), S22, 2), 1) // Matriz de rigidez de la estructura (6 × 6)
@modo completo
# Vector de cargas
@dec 3
Qf2 = [0; w*L/2; w*L^2/12; 0; w*L/2; -w*L^2/12] // Fuerzas de empotramiento de la viga (locales = globales)
Pn = [H; 0; 0; 0; 0; 0] // Cargas aplicadas en los nudos
Pf = Qf2 // Fuerzas de empotramiento ensambladas (solo la barra 2 tiene carga)
Pt = Pn - Pf // Vector de cargas efectivo
# Solución
@dec 5
@modo corto
dd = lusolve(Ss, Pt) // Desplazamientos de los nudos libres [m, rad]
u2 = comp(dd, 1) // Desplazamiento horizontal del nudo 2 [m]
v2 = comp(dd, 2) // Desplazamiento vertical del nudo 2 [m]
t2 = comp(dd, 3) // Giro del nudo 2 [rad]
u3 = comp(dd, 4) // Desplazamiento horizontal del nudo 3 [m]
# Fuerzas en los extremos de las barras
@dec 3
v1 = [0; 0; 0; u2; v2; t2] // Desplazamientos globales de la barra 1
Q1 = k1 * T1 * v1 // Fuerzas locales en la barra 1 [t, t·m]
Q2 = k2 * dd + Qf2 // Fuerzas locales en la barra 2
v3 = [0; 0; 0; u3; comp(dd, 5); comp(dd, 6)] // Desplazamientos globales de la barra 3
Q3 = k3 * T3 * v3 // Fuerzas locales en la barra 3
@modo completo
## Reacciones y equilibrio
R1x = -comp(Q1, 2) // Reacción horizontal en 1 (cortante local de la columna, eje y local = −x global)
R4x = -comp(Q3, 2) // Reacción horizontal en 4
R1y = comp(Q1, 1) // Reacción vertical en 1
R4y = comp(Q3, 1) // Reacción vertical en 4
M1 = comp(Q1, 3) // Momento de empotramiento en 1 [t·m]
check round(abs(R1x + R4x + H), 9) <= 0.001 // Equilibrio horizontal ΣFx = 0 (residuo redondeado a 10⁻⁹)
check round(abs(R1y + R4y - w*L), 9) <= 0.001 // Equilibrio vertical ΣFy = 0 (residuo redondeado a 10⁻⁹)
@dec 2`),
      text(`# Comprobación con el bloque «Pórtico 2D»
El mismo modelo se resuelve con el bloque automático; los desplazamientos deben coincidir con los obtenidos paso a paso.`),
      {
        type: 'frame2d', tipo: 'portico', nudos: '1 0 0\n2 0 h\n3 L h\n4 L 0', secciones: 'C E Ac Ic\nV E Av Iv', barras: '1 1 2 C\n2 2 3 V\n3 4 3 C', apoyos: '1,4 E',
        cargas: 'CM: N 2 H 0\nCM: U 2 w', graficos: 'C M V N D', titulo: 'Pórtico del ejemplo (bloque automático)',
      },
      calc(`check round(abs(u2*1000 - deltax_2/(1 mm)), 9) <= 0.001 // Coincidencia de u₂ (paso a paso vs. bloque) [mm]
check round(abs(t2 - theta_2), 12) <= 1e-7 // Coincidencia del giro θ₂`),
      summary(),
    ],
  },

  // ------------------------------------------------------------------
  //  7) Método de Cross
  // ------------------------------------------------------------------
  {
    id: 'an-cross', pais: 'PE', cat: CAT, icon: 'table', normas: 'Hardy Cross (1930) · Hibbeler cap. 12',
    name: 'Método de Cross (viga continua)',
    desc: 'Distribución de momentos paso a paso en tabla (rigideces, factores de distribución, MEP, distribución y transporte), comparada con el método de rigidez.',
    titulo: 'Análisis de viga continua por el método de Cross',
    blocks: [
      text(`# Generalidades
El **método de Cross** (distribución de momentos, H. Cross 1930) resuelve estructuras sin desplazamiento lateral por aproximaciones sucesivas: se bloquean los nudos (momentos de empotramiento perfecto, MEP), se liberan uno a uno distribuyendo el momento desequilibrado según los **factores de distribución** $FD = K/\\Sigma K$ con $K = 4EI/L$, y se **transporta** la mitad del momento distribuido al extremo opuesto. Se itera hasta que los momentos transportados sean despreciables.

Convención: momentos en los extremos de barra **positivos en sentido horario**.

## Referencias
- H. Cross, «Analysis of continuous frames by distributing fixed-end moments», *Proc. ASCE* (1930).
- R. C. Hibbeler, *Análisis estructural*, 8.ª ed., cap. 12.
- J. McCormac, *Análisis de estructuras*, cap. 21.`),
      calc(`# Datos
L1 = 6 m // Tramo AB (A empotrado)
L2 = 8 m // Tramo BC
L3 = 6 m // Tramo CD (D articulado)
w = 2.0 tonf/m // Carga uniforme en tramos 1 y 2
P = 6.0 tonf // Carga puntual al centro del tramo 3
"MEP de referencia: $wL_1^2/12$ = {MEPu(w, L1)}, $wL_2^2/12$ = {MEPu(w, L2)}, $PL_3/8$ = {MEPpi(P, L3/2, L3)}.`),
      { type: 'cross', tramos: 'L1, L2, L3', apoyos: 'E, A, A, A', I: '1, 1, 1', E: '1', cargas: 'U 1 w\nU 2 w\nP 3 P L3/2', ciclos: '12', titulo: 'Distribución de momentos (t·m), convención horaria +' },
      calc(`# Resultados
check errCross <= 0.01 // Error del método iterativo frente a la solución exacta ≤ 1 %
"Momentos flectores en los apoyos: $M_B$ = {Mapo2}, $M_C$ = {Mapo3}; momentos positivos máximos: tramo 1 {Mpos1}, tramo 2 {Mpos2}, tramo 3 {Mpos3}.`),
      { type: 'beam', tramos: 'L1, L2, L3', apoyos: 'E, A, A, A', E: '2.17e6 tonf/m^2', I: '0.0054 m^4', cargas: 'U 1-2 w\nP L1+L2+L3/2 P', deflexion: false, titulo: 'Diagramas de la viga continua (método de rigidez)' },
      summary(),
    ],
  },

  // ------------------------------------------------------------------
  //  8) Análisis modal, zonas rígidas y efectos P-Δ (pórtico de 4 pisos)
  // ------------------------------------------------------------------
  {
    id: 'an-modal-pdelta', pais: 'PE', cat: CAT, icon: 'quake', normas: 'NTE E.030-2018, E.060 · Chopra (2012) · AISC 360-16 C2',
    name: 'Pórtico de 4 pisos: análisis modal, zonas rígidas y P-Δ',
    desc: 'Periodos y formas de modo con masas concentradas, fuerzas sísmicas E.030 con el periodo del modelo, análisis de segundo orden P-Δ con zonas rígidas en nudos, derivas e índice de estabilidad.',
    titulo: 'Pórtico de concreto armado de 4 pisos — análisis modal y de segundo orden',
    blocks: [
      text(`# Generalidades
Se analiza un pórtico plano interior de concreto armado de **cuatro pisos y tres vanos** con un modelo de barras que incluye **zonas rígidas** en los nudos (brazos rígidos iguales a la mitad del peralte de los elementos que concurren, factor 0.5) y deformaciones por flexión y axiales. El estudio se realiza en tres etapas:

1. **Análisis modal** con masas concentradas en los nudos obtenidas de las cargas de gravedad ($CM + 0.25\,CV$, E.030 Art. 26): periodos, formas de modo y fracciones de masa efectiva.
2. **Fuerzas sísmicas estáticas** (E.030 Art. 28) con el periodo fundamental del modelo ($T = 0.85\,T_1$, Art. 28.4.2).
3. **Análisis de segundo orden P-Δ** de las combinaciones E.060 (matriz geométrica, iterativo), control de derivas (Art. 31–32) e **índice de estabilidad** $Q$.

## Normas y referencias
- NTE E.030-2018 Diseño Sismorresistente · NTE E.060 Concreto Armado · NTE E.020 Cargas.
- A. K. Chopra, *Dynamics of Structures*, 4.ª ed., Pearson (2012), caps. 9–10 (análisis modal, masa modal efectiva).
- W. McGuire, R. Gallagher, R. Ziemian, *Matrix Structural Analysis*, 2.ª ed. (2000), cap. 9 (matriz geométrica) y 4.5 (brazos rígidos).
- AISC 360-16, cap. C (análisis de segundo orden); ASCE/SEI 7-16 §12.8.7 (coeficiente de estabilidad θ).`),
      calc(`# Datos
## Materiales
fc = 280 kgf/cm^2 // Resistencia del concreto [210 kgf/cm^2|280 kgf/cm^2|350 kgf/cm^2]
gammac = 2.4 tonf/m^3 // Peso específico del concreto armado
Ec = 15000*sqrtfc(fc) -> tonf/m^2 // Módulo de elasticidad (E.060 8.5.2)
## Geometría
L1 = 6.0 m // Vano 1
L2 = 5.0 m // Vano 2
L3 = 6.0 m // Vano 3
h1 = 4.0 m // Altura del primer piso
h = 3.0 m // Altura de los pisos típicos
bc = 60 cm // Columnas: ancho
hc = 60 cm // Columnas: peralte en la dirección del pórtico
bv = 30 cm // Vigas: ancho
hv = 60 cm // Vigas: peralte
## Cargas por metro de viga (ancho tributario 5 m)
At = 5.0 m // Ancho tributario
wD = (0.30 tonf/m^2 + 0.10 tonf/m^2 + 0.10 tonf/m^2)*At // CM pisos: aligerado h = 20 cm, acabados y tabiquería (E.020 Anexo 1)
wL = 0.25 tonf/m^2*At // CV pisos: oficinas (E.020 Tabla 1)
wDa = (0.30 tonf/m^2 + 0.10 tonf/m^2)*At // CM azotea
wLa = 0.10 tonf/m^2*At // CV azotea (E.020 7.1)
X1 = L1 // Abscisa del eje B
X2 = L1 + L2 // Abscisa del eje C
X3 = L1 + L2 + L3 // Abscisa del eje D
Y1 = h1 // Nivel 1
Y2 = h1 + h // Nivel 2
Y3 = h1 + 2*h // Nivel 3
Y4 = h1 + 3*h // Nivel 4 (azotea)`),
      text(`# Análisis modal
Las masas se concentran en los nudos a partir de las cargas verticales del modelo (fuente de masa $CM + 0.25\,CV$, que incluye el peso propio de vigas y columnas) y se asignan solo a la traslación horizontal (diafragma rígido en su plano). El problema $\\mathbf{K}\\boldsymbol{\\phi} = \\omega^2\\mathbf{M}\\boldsymbol{\\phi}$ se resuelve condensando exactamente los grados de libertad sin masa.`),
      {
        type: 'frame2d', tipo: 'portico',
        nudos: '1 0 0\n2 X1 0\n3 X2 0\n4 X3 0\n5 0 Y1\n6 X1 Y1\n7 X2 Y1\n8 X3 Y1\n9 0 Y2\n10 X1 Y2\n11 X2 Y2\n12 X3 Y2\n13 0 Y3\n14 X1 Y3\n15 X2 Y3\n16 X3 Y3\n17 0 Y4\n18 X1 Y4\n19 X2 Y4\n20 X3 Y4',
        secciones: 'C rect bc hc Ec\nV rect bv hv Ec',
        barras: '1 1 5 C\n2 2 6 C\n3 3 7 C\n4 4 8 C\n5 5 9 C\n6 6 10 C\n7 7 11 C\n8 8 12 C\n9 9 13 C\n10 10 14 C\n11 11 15 C\n12 12 16 C\n13 13 17 C\n14 14 18 C\n15 15 19 C\n16 16 20 C\n17 5 6 V\n18 6 7 V\n19 7 8 V\n20 9 10 V\n21 10 11 V\n22 11 12 V\n23 13 14 V\n24 14 15 V\n25 15 16 V\n26 17 18 V\n27 18 19 V\n28 19 20 V',
        apoyos: '1-4 E', brazos: '0.5',
        cargas: 'CM: U 17-25 wD\nCM: U 26-28 wDa\nCV: U 17-25 wL\nCV: U 26-28 wLa',
        casos: 'CM Carga muerta (incluye peso propio)\nCV Carga viva',
        pp: 'CM gammac', combinaciones: 'G = CM + 0.25 CV',
        masas: '= CM + 0.25 CV x', modos: '4', graficos: '-', sufijo: 'M',
        titulo: 'Modelo para el análisis modal',
      },
      calc(`# Fuerzas sísmicas estáticas (E.030-2018, Art. 28)
Z = 0.45 // Factor de zona [0.45 : Zona 4|0.35 : Zona 3|0.25 : Zona 2|0.10 : Zona 1]
U = 1.0 // Categoría C (oficinas)
S = 1.05 // Suelo S2 en zona 4 (Tabla 3)
Tp = 0.6 s // Periodo TP (Tabla 4)
TL = 2.0 s // Periodo TL (Tabla 4)
R = 8 // Pórticos de concreto armado regulares (Tabla 7)
T1 = T1_M // Periodo fundamental del modelo (modo 1)
T = 0.85*T1 // Periodo de diseño (E.030 28.4.2: periodo del análisis con las rigideces del modelo × 0.85)
C = si(T < Tp, 2.5, si(T < TL, 2.5*Tp/T, 2.5*Tp*TL/T^2)) // Factor de amplificación sísmica (E.030 Art. 14)
check C/R >= 0.11 // Valor mínimo de C/R (E.030 28.2.2)
check SMPx_M >= 0.90 // Los modos considerados reúnen al menos el 90 % de la masa (E.030 29.1.2)
Ltot = L1 + L2 + L3 // Longitud del pórtico
Pv = gammac*bv*hv // Peso propio de vigas por metro
Pc = gammac*bc*hc // Peso propio de columnas por metro
P1 = (wD + 0.25*wL + Pv)*Ltot + 4*Pc*(h1 + h)/2 -> tonf // Peso del nivel 1 (CM + 25 % CV, E.030 Art. 26)
P2 = (wD + 0.25*wL + Pv)*Ltot + 4*Pc*h -> tonf // Peso del nivel 2
P3 = P2 // Peso del nivel 3
P4 = (wDa + 0.25*wLa + Pv)*Ltot + 4*Pc*h/2 -> tonf // Peso del nivel 4 (azotea)
Pt = P1 + P2 + P3 + P4 // Peso sísmico total
V = Z*U*C*S/R*Pt // Fuerza cortante en la base (E.030 28.2.1)
k = si(T <= 0.5 s, 1, min(0.75 + 0.5*T/(1 s), 2)) // Exponente de distribución en altura (E.030 28.3.2)
D = P1*(Y1/(1 m))^k + P2*(Y2/(1 m))^k + P3*(Y3/(1 m))^k + P4*(Y4/(1 m))^k // Σ Pj·hj^k
F1 = V*P1*(Y1/(1 m))^k/D // Fuerza en el nivel 1
F2 = V*P2*(Y2/(1 m))^k/D // Fuerza en el nivel 2
F3 = V*P3*(Y3/(1 m))^k/D // Fuerza en el nivel 3
F4 = V*P4*(Y4/(1 m))^k/D // Fuerza en el nivel 4`),
      text(`# Análisis de segundo orden con zonas rígidas
Las combinaciones de la NTE E.060 (9.2) se resuelven con la **matriz de rigidez geométrica** actualizada con las fuerzas axiales hasta converger (efecto P-Δ global y P-δ dentro de cada barra). Los esfuerzos de diseño de vigas y columnas se toman en las **caras de los nudos** (fin de las zonas rígidas). Las derivas se calculan con los desplazamientos elásticos del caso CS multiplicados por $0.75R$ (E.030 31.1).`),
      {
        type: 'frame2d', tipo: 'portico',
        nudos: '1 0 0\n2 X1 0\n3 X2 0\n4 X3 0\n5 0 Y1\n6 X1 Y1\n7 X2 Y1\n8 X3 Y1\n9 0 Y2\n10 X1 Y2\n11 X2 Y2\n12 X3 Y2\n13 0 Y3\n14 X1 Y3\n15 X2 Y3\n16 X3 Y3\n17 0 Y4\n18 X1 Y4\n19 X2 Y4\n20 X3 Y4',
        secciones: 'C rect bc hc Ec\nV rect bv hv Ec',
        barras: '1 1 5 C\n2 2 6 C\n3 3 7 C\n4 4 8 C\n5 5 9 C\n6 6 10 C\n7 7 11 C\n8 8 12 C\n9 9 13 C\n10 10 14 C\n11 11 15 C\n12 12 16 C\n13 13 17 C\n14 14 18 C\n15 15 19 C\n16 16 20 C\n17 5 6 V\n18 6 7 V\n19 7 8 V\n20 9 10 V\n21 10 11 V\n22 11 12 V\n23 13 14 V\n24 14 15 V\n25 15 16 V\n26 17 18 V\n27 18 19 V\n28 19 20 V',
        apoyos: '1-4 E', brazos: '0.5', pdelta: true,
        cargas: 'CM: U 17-25 wD\nCM: U 26-28 wDa\nCV: U 17-25 wL\nCV: U 26-28 wLa\nCS: N 5 F1 0\nCS: N 9 F2 0\nCS: N 13 F3 0\nCS: N 17 F4 0',
        casos: 'CM Carga muerta (incluye peso propio)\nCV Carga viva\nCS Sismo estático en X',
        pp: 'CM gammac',
        combinaciones: 'U1 = 1.4 CM + 1.7 CV\nU2 = 1.25(CM + CV) ± CS\nU3 = 0.9 CM ± CS',
        grupos: 'VIG 17-28\nCOL1 1-4\nCOL 1-16',
        servicio: 'CM + CV', graficos: 'C M V D',
        deriva_caso: 'CS', deriva_f: '0.75*R', deriva_lim: '0.007',
        titulo: 'Pórtico de 4 pisos con zonas rígidas (análisis P-Δ)',
      },
      calc(`# Estabilidad global y efectos de segundo orden
"Índice de estabilidad del primer entrepiso (E.030; equivalente al coeficiente θ de ASCE 7-16 §12.8.7): $Q = N_i\\,\\Delta_i/(V_i\\,h_{ei}\\,R)$, con $\\Delta_i$ el desplazamiento relativo inelástico. Si $Q \\le 0.10$ los efectos P-Δ pueden despreciarse; aquí, además, ya están incluidos en las combinaciones.
Ni = Pt // Carga de gravedad sobre el primer entrepiso (CM + 25 % CV)
Di = deriva_1*h1 // Desplazamiento relativo inelástico del primer entrepiso (0.75R·Δe)
Q = Ni*Di/(V*h1*R) // Índice de estabilidad
check Q <= 0.10 // Efectos de segundo orden no significativos (Q ≤ 0.10)
check ampPD <= 1.10 // Amplificación P-Δ de los desplazamientos de las combinaciones ≤ 10 %
B2 = 1/(1 - Q) // Factor de amplificación aproximado 1/(1 − Q)
"El factor aproximado $B_2 = 1/(1-Q)$ = {B2} se compara con la amplificación obtenida en el análisis no lineal geométrico, {ampPD} (la combinación U2 tiene más carga de gravedad que $CM + 0.25CV$).
## Esfuerzos de diseño en las caras (envolvente de 2.º orden)
Mu_v = Mmax_VIG // Momento máximo en vigas (cara de columna)
Vu_v = Vmax_VIG // Cortante máximo en vigas (cara de columna)
Pu_c = Nc_COL1 // Compresión máxima en columnas del primer piso
Mu_c = Mmax_COL1 // Momento máximo en columnas del primer piso
phiPn = 0.7*0.8*(0.85*fc*(bc*hc*(1 - 0.01)) + 4200 kgf/cm^2*0.01*bc*hc) -> tonf // Resistencia axial máxima con ρ = 1 % (E.060 10.3.6.2)
check Pu_c <= phiPn // Compresión axial máxima en columnas del primer piso
check Vu_v <= 0.85*2.6*sqrtfc(fc)*bv*(hv - 6 cm) // Límite de la sección de la viga por cortante: Vc + Vs,máx (E.060 11.5.7.9)`),
      summary(),
    ],
  },
];
