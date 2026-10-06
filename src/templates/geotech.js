// =====================================================================
//  Plantillas — módulo «geotech»: geotecnia y cimentaciones (Perú)
//  NTE E.050 Suelos y Cimentaciones (RM 406-2018-VIVIENDA) + E.060
//  Referencias: Das, Bowles, Terzaghi-Peck, Meyerhof, Hansen, Vesic,
//  Coduto, FHWA, Youd et al. (2001), Idriss y Boulanger (2008), Cetin (2004)
// =====================================================================
import { calc, text, summary } from './_h.js';

const E050 = 'RM 406-2018-VIVIENDA — NTE E.050 Suelos y Cimentaciones';

export default [
  // ------------------------------------------------------------------
  //  1) CAPACIDAD PORTANTE Y ASENTAMIENTOS
  // ------------------------------------------------------------------
  {
    id: 'ge-portante', pais: 'PE', cat: 'Geotecnia', icon: 'soil',
    name: 'Capacidad portante y asentamientos (E.050)',
    normas: E050 + ' (Art. 17–23, 26, 28, 29) · Meyerhof (1963) · Vesic (1973) · Hansen (1970) · Bowles (1996)',
    desc: 'Ecuación general con nivel freático, carga excéntrica e inclinada (área efectiva), asentamiento elástico (Steinbrenner) y por consolidación; qadm por resistencia y por asentamiento.',
    titulo: 'Capacidad portante admisible y asentamientos de una zapata aislada',
    blocks: [
      text(`# Generalidades
La presente memoria determina la **presión admisible** de una cimentación superficial rectangular según la NTE E.050 Suelos y Cimentaciones (2018). De acuerdo con el Art. 22.2 la presión admisible es **la menor** de:

1. la capacidad de carga por corte afectada por el factor de seguridad (Art. 20 y 21), y
2. la presión que produce el asentamiento tolerable (Art. 19).

La capacidad última se evalúa con la ecuación general de Meyerhof (1963) con factores de forma de De Beer, de profundidad de Hansen e inclinación de Meyerhof (Das, *Principios de ingeniería de cimentaciones*, cap. 3), y se contrasta con la expresión simplificada del Art. 20 de la E.050 (Bowles 1996), adoptándose el menor valor. La excentricidad se trata con el **área efectiva** $B' \\times L'$ (Art. 28) y la inclinación de la carga con los factores $i_c, i_q, i_\\gamma$ (Art. 29). El efecto del nivel freático se considera según los tres casos de Das (cap. 3).

Los asentamientos se estiman como la suma del asentamiento elástico inmediato del estrato granular (Bowles 1987, factores de Steinbrenner) y la consolidación primaria del estrato arcilloso subyacente (Terzaghi), con el incremento de esfuerzos de Boussinesq (Newmark).`),
      calc(`# Datos
## Cargas de servicio (E.050 Art. 17.1)
P = 110 tonf // Carga vertical de servicio (CM + CV) de la columna
ML = 6 tonf*m // Momento de servicio en la dirección L
MB = 3 tonf*m // Momento de servicio en la dirección B
Hh = 5 tonf // Fuerza horizontal de servicio (carga inclinada, Art. 29)
gammam = 2.0 tonf/m^3 // Peso unitario promedio zapata + relleno sobre ella
## Geometría de la cimentación
B = 2.60 m // Ancho de la zapata
L = 3.00 m // Largo de la zapata
Df = 1.50 m // Profundidad de desplante
## Parámetros del suelo (Estudio de Mecánica de Suelos)
phi = 30 deg // Ángulo de fricción interna efectivo φ' [28 deg|30 deg|32 deg|34 deg|36 deg]
c = 0 tonf/m^2 // Cohesión efectiva c'
gamma1 = 1.80 tonf/m^3 // Peso unitario sobre el nivel freático
gammasat = 2.00 tonf/m^3 // Peso unitario saturado
gammaw = 1.00 tonf/m^3 // Peso unitario del agua
Dw = 2.50 m // Profundidad del nivel freático desde la superficie
N60 = 20 // N-SPT corregido (N60) promedio en la zona activa (≈ B bajo la base)
metodo = 1 // Factor $N_\\gamma$ [1 : Meyerhof (E.050 Art. 20.4)|2 : Vesic (1973)|3 : Hansen (1970)]
FS = 3.0 // Factor de seguridad por corte para cargas estáticas (E.050 Art. 21.1)
check Df >= 0.80 m // Profundidad mínima de cimentación (E.050 Art. 26.2)
check Df/B <= 5 // Cimentación superficial: Df/B ≤ 5 (E.050 Art. 23.1)
## Excentricidad y área efectiva (E.050 Art. 28)
Wz = gammam*B*L*Df -> tonf // Peso propio de la zapata y del relleno sobre ella
Q = P + Wz // Carga vertical total en la base Q (Art. 28.1)
eL = ML/Q -> m // Excentricidad en la dirección L: e = M/Q (Art. 28.1)
eB = MB/Q -> m // Excentricidad en la dirección B
check eL/L + eB/B <= 1/6 // Resultante dentro del núcleo central (sin tracciones)
Bp = B - 2*eB // B' = B − 2e (Art. 28.2)
Lp = L - 2*eL // L' = L − 2e (Art. 28.2)
B1 = min(Bp, Lp) // Ancho efectivo (lado menor del área efectiva)
L1 = max(Bp, Lp) // Largo efectivo
alpha = atan(Hh/Q) -> deg // Inclinación de la resultante respecto a la vertical (Art. 29)`),
      calc(`# Capacidad de carga por corte
## Factores de capacidad de carga (E.050 Art. 20.4)
Nq = NqBC(phi) // $N_q = e^{\\pi\\tan\\phi}\\tan^2(45° + \\phi/2)$ (Prandtl–Reissner)
Nc = NcBC(phi) // Nc = (Nq − 1)·cot φ
Ngamma = si(metodo == 1, NgMeyerhof(phi), si(metodo == 2, NgVesic(phi), NgHansen(phi))) // Nγ según el método elegido
## Efecto del nivel freático (Das, cap. 3)
qs = qWT(gamma1, gammasat, Dw, Df, gammaw) -> tonf/m^2 // Sobrecarga efectiva q' al nivel de desplante (caso I si Dw < Df)
gamma2 = gammaWT(gamma1, gammasat, Dw, Df, B1, gammaw) -> tonf/m^3 // γ efectivo bajo la base: γ' + (d/B)(γ − γ') si 0 ≤ d ≤ B (caso II)
## Factores de forma, profundidad e inclinación
Fcs = scDeBeer(B1, L1, phi) // Forma: 1 + (B'/L')(Nq/Nc) (De Beer 1970)
Fqs = sqDeBeer(B1, L1, phi) // Forma: 1 + (B'/L') tan φ
Fgs = sgDeBeer(B1, L1) // Forma: 1 − 0.4 B'/L'
Fcd = dcHansen(Df, B, phi) // Profundidad: Fqd − (1 − Fqd)/(Nc tan φ) (Hansen 1970)
Fqd = dqHansen(Df, B, phi) // Profundidad: 1 + 2 tanφ (1 − sinφ)² (Df/B)
Fgd = 1 // Profundidad: Fγd = 1
Fci = icMeyerhof(alpha) // Inclinación: (1 − α°/90°)² (Meyerhof 1963; E.050 Art. 20.4)
Fqi = Fci // Inclinación: Fqi = Fci
Fgi = igMeyerhof(alpha, phi) // Inclinación: (1 − α/φ)²
## Capacidad última — ecuación general (Meyerhof 1963; Das, cap. 3)
qu1 = c*Nc*Fcs*Fcd*Fci + qs*Nq*Fqs*Fqd*Fqi + 0.5*gamma2*B1*Ngamma*Fgs*Fgd*Fgi -> tonf/m^2 // Área efectiva B'×L'
## Capacidad última — expresión de la E.050 (Art. 20.2: φ = 0 → qd = sc ic c Nc; Art. 20.3: c = 0 → qd = iq γ1 Df Nq + 0.5 sγ iγ γ2 B' Nγ; aquí se suman ambos términos)
sc = scE050(B1, L1) // sc = 1 + 0.2 B'/L' (Art. 20.4)
sg = sgE050(B1, L1) // sγ = 1 − 0.2 B'/L' (Art. 20.4)
qu2 = sc*Fci*c*Nc + Fqi*qs*Nq + 0.5*sg*Fgi*gamma2*B1*Ngamma -> tonf/m^2 // qd = sc ic c Nc + iq q' Nq + 0.5 sγ iγ γ2 B' Nγ (q' efectiva ≤ γ1 Df)
qult = min(qu1, qu2) -> tonf/m^2 // Se adopta el menor valor (criterio conservador)
qadm1 = qult/FS -> kgf/cm^2 // Presión admisible por corte (Art. 22.2.1)
## Presión admisible por asentamiento (Meyerhof 1965 modificada; Das, cap. 5)
Sadm = 25 mm // Asentamiento tolerable adoptado en el EMS (Art. 19.1)
qn_s = qaSPT(N60, B, Df, Sadm) -> tonf/m^2 // Presión neta que produce Sadm en arena (N60, Fd = 1 + 0.33 Df/B ≤ 1.33)
qadm2 = qn_s + gamma1*min(Dw, Df) + gammasat*max(Df - Dw, 0 m) -> kgf/cm^2 // Presión bruta admisible por asentamiento: neta + σv total en Df (Art. 22.2.2)
qadm = min(qadm1, qadm2) -> kgf/cm^2 // Presión admisible: la menor (Art. 22.2)
## Presiones de contacto
q0 = Q/(B*L) -> tonf/m^2 // Presión media (incluye zapata y relleno)
q1 = Q/(B*L)*(1 + 6*eL/L + 6*eB/B) -> tonf/m^2 // Presión máxima (esquina más cargada)
q2 = Q/(B*L)*(1 - 6*eL/L - 6*eB/B) -> tonf/m^2 // Presión mínima
qe = Q/(B1*L1) -> tonf/m^2 // Presión uniforme sobre el área efectiva (Art. 23.3)
FSc = qult/qe // Factor de seguridad real frente a falla por corte
check FSc >= FS // Factor de seguridad por corte ≥ 3.0 (E.050 Art. 21.1)
check q1 <= qadm // Presión máxima de contacto ≤ presión admisible (Art. 22.2)`),
      { type: 'footing', B: 'B', L: 'L', hz: '0.60 m', c1: '0.50 m', c2: '0.50 m', Df: 'Df', q1: 'q1', q2: 'q2', titulo: 'Zapata analizada y distribución de presiones de contacto en la dirección L' },
      calc(`# Asentamientos (E.050 Art. 18 y 19)
## Asentamiento elástico inmediato (Bowles 1987 — Steinbrenner 1934)
Es = EsSPT(N60, 10) -> kgf/cm^2 // Módulo de elasticidad: Es = 10·pa·N60, arena limpia NC (Kulhawy y Mayne 1990)
mu = 0.30 // Coeficiente de Poisson de la arena
Hs = 5.0 m // Espesor del estrato granular bajo la base (hasta la arcilla)
qn = q0 - (gamma1*min(Dw, Df) + gammasat*max(Df - Dw, 0 m)) -> tonf/m^2 // Presión neta aplicada (descuenta el σv total excavado)
mp = L/B // m' = L/B (centro: cuatro rectángulos B/2 × L/2)
np = Hs/(B/2) // n' = H/(B/2)
Is = IsStein(mp, np, mu) // Is = F1 + (1 − 2μ)/(1 − μ)·F2 (Steinbrenner)
Se = 0.93*qn*4*(B/2)*(1 - mu^2)/Es*Is -> mm // Se = 0.93·q·(4·B/2)(1 − μ²)/Es·Is (zapata rígida; If = 1, conservador)
## Consolidación primaria del estrato de arcilla (Terzaghi)
Hc = 3.0 m // Espesor del estrato de arcilla
Cc = 0.28 // Índice de compresión
Cr = 0.05 // Índice de recompresión
e0 = 0.90 // Relación de vacíos inicial
gammac = 1.85 tonf/m^3 // Peso unitario saturado de la arcilla
OCR = 1.5 // Razón de sobreconsolidación
zc = Hs + Hc/2 // Profundidad del centro de la arcilla bajo la base
sigma0 = gamma1*Dw + (gammasat - gammaw)*(Df + Hs - Dw) + (gammac - gammaw)*Hc/2 -> tonf/m^2 // Esfuerzo efectivo inicial σ'0 en el centro
sigmac = OCR*sigma0 // Presión de preconsolidación σ'c
Iz = IzRect(B, L, zc) // Factor de influencia bajo el centro (Boussinesq–Newmark)
sigmaz = qn*Iz -> tonf/m^2 // Incremento de esfuerzo Δσ
Sc = ScCons(Cc, Cr, e0, Hc, sigma0, sigmaz, sigmac) -> mm // Cr·H/(1+e0)·log(σ'f/σ'0) si σ'f ≤ σ'c; si no, se agrega el tramo virgen con Cc
## Asentamiento total y distorsión angular
St = Se + Sc -> mm // Asentamiento total
check St <= Sadm // Asentamiento total ≤ asentamiento tolerable (Art. 19.1)
Lc = 7.0 m // Distancia entre columnas adyacentes
dd = 0.75*St -> mm // Asentamiento diferencial: 75 % del total en suelos granulares (Art. 19.2)
dist = dd/Lc // Distorsión angular α = δ/L
check dist <= 1/500 // α ≤ 1/500: límite seguro para edificios en los que no se permiten grietas (Tabla 8)
"La presión admisible de diseño es $q_{adm}$ = {qadm}, gobernada por {si(qadm1 <= qadm2, 1, 2)} (1 = resistencia al corte, 2 = asentamiento). Para solicitación sísmica el factor de seguridad mínimo es 2.5 (Art. 21.2).`),
      { type: 'plot', expr: 'IzRect(B, L, x m); B*L/((B + x m)*(L + x m))', var: 'x', desde: '0.1', hasta: '10', puntos: '120', nombres: 'Boussinesq (centro, Newmark); Método 2:1', leyenda: true, xlabel: 'Profundidad bajo la base z [m]', ylabel: 'Δσ/q', titulo: 'Bulbo de presiones: incremento de esfuerzo normalizado bajo el centro de la zapata' },
      summary(),
    ],
  },
  // ------------------------------------------------------------------
  //  2) ZAPATA COMBINADA
  // ------------------------------------------------------------------
  {
    id: 'ge-combinada', pais: 'PE', cat: 'Cimentaciones', icon: 'footing',
    name: 'Zapata combinada (método rígido)',
    normas: E050 + ' · NTE E.060 Concreto Armado (Cap. 9, 11, 15) · ACI 336.2R',
    desc: 'Dimensionamiento con la resultante en el centroide, diagrama de presiones, V y M en la viga longitudinal, punzonamiento, cortante y flexión longitudinal y transversal.',
    titulo: 'Diseño de zapata combinada de dos columnas',
    blocks: [
      text(`# Generalidades
Zapata combinada rectangular que soporta dos columnas cuando las zapatas aisladas se superponen o una columna está próxima al límite de propiedad. Se aplica el **método rígido convencional** (ACI 336.2R; Das, cap. 6; Bowles, cap. 10): la longitud se elige de modo que la resultante de las cargas de servicio coincida con el centroide del área, lo que produce una presión uniforme. Las presiones, fuerzas cortantes y momentos flectores en la dirección longitudinal se obtienen por equilibrio estático considerando la zapata como una viga invertida apoyada en las columnas.

El diseño estructural sigue la NTE E.060: combinación $1.4\\,CM + 1.7\\,CV$ (Art. 9.2.1), punzonamiento (Art. 11.12), cortante por flexión a $d$ de la cara (Art. 11.3) y flexión con acero mínimo $0.0018\\,b\\,h$ (Art. 9.7). La presión admisible proviene del EMS (E.050 Art. 22).`),
      calc(`# Datos
## Cargas de servicio
PD1 = 55 tonf // Carga muerta de la columna 1 (exterior)
PL1 = 20 tonf // Carga viva de la columna 1
PD2 = 80 tonf // Carga muerta de la columna 2 (interior)
PL2 = 30 tonf // Carga viva de la columna 2
## Geometría
t1 = 0.40 m // Lado de la columna 1 en la dirección longitudinal
b1 = 0.40 m // Lado de la columna 1 en la dirección transversal
t2 = 0.50 m // Lado de la columna 2 (longitudinal)
b2 = 0.50 m // Lado de la columna 2 (transversal)
l12 = 5.00 m // Distancia entre ejes de columnas
a1 = 0.60 m // Distancia del borde izquierdo al eje de la columna 1 (límite de propiedad)
## Suelo y materiales
qa = 2.0 kgf/cm^2 // Presión admisible del suelo (EMS, E.050 Art. 22)
Df = 1.50 m // Profundidad de desplante
gammam = 2.0 tonf/m^3 // Peso unitario promedio suelo–concreto
spiso = 0.40 tonf/m^2 // Sobrecarga sobre el piso
fc = 210 kgf/cm^2 // Resistencia del concreto [175 kgf/cm^2|210 kgf/cm^2|280 kgf/cm^2]
fy = 4200 kgf/cm^2 // Fluencia del acero
hz = 0.80 m // Peralte de la zapata
bar = 6 // Varilla longitudinal [5 : 5/8"|6 : 3/4"|8 : 1"]
bart = 5 // Varilla transversal [4 : 1/2"|5 : 5/8"|6 : 3/4"]
## Dimensionamiento (resultante en el centroide)
qn = qa - gammam*Df - spiso -> tonf/m^2 // Presión neta (E.050 Art. 22)
P1 = PD1 + PL1 // Carga de servicio columna 1
P2 = PD2 + PL2 // Carga de servicio columna 2
R = P1 + P2 // Resultante de servicio
xR = a1 + P2*l12/R -> m // Posición de la resultante desde el borde izquierdo
Lz = roundup(2*xR, 0.05 m) // Longitud: centroide = resultante (L = 2 x̄)
Bz = roundup(R/(qn*Lz), 0.05 m) // Ancho requerido por presión
a2 = Lz - a1 - l12 -> m // Volado derecho desde el eje de la columna 2
check a2 >= t2/2 // La columna 2 queda dentro de la zapata
q = R/(Bz*Lz) -> tonf/m^2 // Presión de servicio (uniforme)
check q <= qn // Presión de servicio ≤ presión neta admisible
## Cargas últimas (E.060 Art. 9.2.1)
Pu1 = 1.4*PD1 + 1.7*PL1
Pu2 = 1.4*PD2 + 1.7*PL2
x1 = a1 // Abscisa del eje de la columna 1
x2 = a1 + l12 // Abscisa del eje de la columna 2`),
      { type: 'winkler', metodo: 'rigido', L: 'Lz', B: 'Bz', E: '2.17e6 tonf/m^2', I: 'Bz*hz^3/12', ks: '', cargas: 'P x1 Pu1\nP x2 Pu2', sufijo: 'u', titulo: 'Zapata combinada (cargas últimas): presión del suelo, fuerza cortante y momento flector longitudinal' },
      calc(`# Diseño estructural (E.060)
d = hz - 7.5 cm - db(bar) // Peralte efectivo
## Punzonamiento (E.060 Art. 11.12)
quav = (Pu1 + Pu2)/(Bz*Lz) -> tonf/m^2 // Presión última media
bo1 = 2*(t1 + d) + 2*(b1 + d) // Perímetro crítico de la columna 1 (a d/2; a1 − t1/2 ≥ d/2)
check a1 - t1/2 >= d/2 // El perímetro crítico de la columna 1 cabe en la zapata
Vu1 = Pu1 - quav*(t1 + d)*(b1 + d) -> tonf // Cortante de punzonamiento columna 1
phiVc1 = 0.85*min(0.53*(1 + 2/(max(t1, b1)/min(t1, b1)))*sqrtfc(fc)*bo1*d, 0.27*(40*d/bo1 + 2)*sqrtfc(fc)*bo1*d, 1.06*sqrtfc(fc)*bo1*d) -> tonf // φVc (Art. 11.12.2.1)
check Vu1 <= phiVc1 // Punzonamiento columna 1
bo2 = 2*(t2 + d) + 2*(b2 + d) // Perímetro crítico de la columna 2
Vu2 = Pu2 - quav*(t2 + d)*(b2 + d) -> tonf
phiVc2 = 0.85*min(0.53*(1 + 2/(max(t2, b2)/min(t2, b2)))*sqrtfc(fc)*bo2*d, 0.27*(40*d/bo2 + 2)*sqrtfc(fc)*bo2*d, 1.06*sqrtfc(fc)*bo2*d) -> tonf
check Vu2 <= phiVc2 // Punzonamiento columna 2
## Cortante por flexión (a d de la cara, E.060 Art. 11.3)
Vud = Vmax_u - qmin_u*Bz*(min(t1, t2)/2 + d) -> tonf // Cortante máximo reducido a d de la cara (conservador)
phiVc = 0.85*0.53*sqrtfc(fc)*Bz*d -> tonf
check Vud <= phiVc // Cortante unidireccional
## Flexión longitudinal
phif = 0.9
Asreq(Mx, bx) = 0.85*fc*bx*d/fy*(1 - sqrt(1 - 2*Mx/(0.85*phif*fc*bx*d^2)))
Asmin = 0.0018*Bz*hz // Acero mínimo (E.060 Art. 9.7.2)
Mus = abs(Mneg_u) // Momento negativo entre columnas (acero superior)
As_sup = max(Asreq(Mus, Bz), Asmin) // Acero superior
n_sup = ceil(As_sup/Ab(bar)) // Número de varillas superiores
s_sup = rounddown((Bz - 15 cm)/max(n_sup - 1, 1), 2.5 cm) // Espaciamiento
As_inf = max(Asreq(Mpos_u, Bz), Asmin) // Acero inferior (bajo columnas)
n_inf = ceil(As_inf/Ab(bar))
s_inf = rounddown((Bz - 15 cm)/max(n_inf - 1, 1), 2.5 cm)
check max(s_sup, s_inf) <= min(3*hz, 40 cm) // Espaciamiento máximo (E.060 Art. 9.8)
## Flexión transversal (vigas transversales bajo cada columna)
lvt = (Bz - min(b1, b2))/2 -> m // Volado transversal
bt1 = b1 + d/2 + min(d/2, a1 - b1/2) // Ancho de la viga transversal en la columna 1 (exterior)
bt2 = b2 + d // Ancho de la viga transversal en la columna 2
Mut1 = Pu1/Bz*((Bz - b1)/2)^2/2 -> tonf*m // Momento en la cara (columna 1)
Mut2 = Pu2/Bz*((Bz - b2)/2)^2/2 -> tonf*m // Momento en la cara (columna 2)
Ast1 = max(Asreq(Mut1, bt1), 0.0018*bt1*hz) // Acero transversal bajo columna 1
Ast2 = max(Asreq(Mut2, bt2), 0.0018*bt2*hz) // Acero transversal bajo columna 2
nt1 = ceil(Ast1/Ab(bart)) // Varillas transversales bajo la columna 1
st1 = rounddown(max(bt1/nt1, 2.5 cm), 2.5 cm) // Espaciamiento en la franja de la columna 1
nt2 = ceil(Ast2/Ab(bart)) // Varillas transversales bajo la columna 2
st2 = rounddown(max(bt2/nt2, 2.5 cm), 2.5 cm) // Espaciamiento en la franja de la columna 2
check max(st1, st2) <= min(3*hz, 40 cm) // Espaciamiento transversal en las franjas de columna
check min(st1, st2) >= db(bart) + 2.5 cm // Espaciamiento mínimo: libre ≥ db y ≥ 25 mm (E.060 Art. 7.6.1)
"Fuera de las franjas de columna se coloca refuerzo transversal mínimo $0.0018\\,b\\,h$ = {0.0018*1 m*hz -> cm^2} por metro.`),
      summary(),
    ],
  },
  // ------------------------------------------------------------------
  //  3) ZAPATA CONECTADA
  // ------------------------------------------------------------------
  {
    id: 'ge-conectada', pais: 'PE', cat: 'Cimentaciones', icon: 'footing',
    name: 'Zapata conectada (medianera + viga de conexión)',
    normas: E050 + ' · NTE E.060 Concreto Armado · Morales, R. «Diseño en concreto armado» (ICG)',
    desc: 'Zapata excéntrica en límite de propiedad unida a la zapata interior con viga de cimentación: reacciones, presiones, diseño de la viga y de las zapatas.',
    titulo: 'Diseño de zapata conectada con viga de cimentación',
    blocks: [
      text(`# Generalidades
Cuando una columna se ubica en el límite de propiedad, la zapata no puede centrarse bajo ella (E.050 Art. 15, nota: «las zapatas ubicadas en el límite de propiedad no deben invadir el terreno vecino»). La excentricidad se equilibra con una **viga de conexión** (viga de cimentación) que la une a la zapata interior. La viga se idealiza simplemente apoyada en el centro de la zapata exterior y en la columna interior, con un voladizo hasta el eje de la columna exterior; por estática la reacción en la zapata exterior es

$$R_1 = \\frac{P_1\\,l}{l - e}$$

y la zapata interior se descarga en $R_1 - P_1$. La viga se diseña a flexión y cortante (E.060) y las zapatas como voladizos transversales.`),
      calc(`# Datos
PD1 = 40 tonf // Carga muerta de la columna exterior
PL1 = 15 tonf // Carga viva de la columna exterior
PD2 = 70 tonf // Carga muerta de la columna interior
PL2 = 25 tonf // Carga viva de la columna interior
t1 = 0.40 m // Columna exterior: lado perpendicular al lindero
b1 = 0.40 m // Columna exterior: lado paralelo al lindero
c2 = 0.50 m // Columna interior (cuadrada)
l12 = 6.00 m // Distancia entre ejes de columnas
qa = 2.0 kgf/cm^2 // Presión admisible (EMS)
Df = 1.50 m // Profundidad de desplante
gammam = 2.0 tonf/m^3 // Peso unitario promedio suelo–concreto
spiso = 0.40 tonf/m^2 // Sobrecarga sobre el piso
fc = 210 kgf/cm^2 // Resistencia del concreto
fy = 4200 kgf/cm^2 // Fluencia del acero
hz = 0.60 m // Peralte de las zapatas
## Zapata exterior
qn = qa - gammam*Df - spiso -> tonf/m^2 // Presión neta
P1 = PD1 + PL1
P2 = PD2 + PL2
A1 = 1.25*P1/qn -> m^2 // Área tentativa (incremento por excentricidad ≈ 25 %)
Bz1 = roundup(sqrt(A1/2), 0.05 m) // Lado perpendicular al lindero (T ≈ 2B)
Tz1 = roundup(2*Bz1, 0.05 m) // Lado paralelo al lindero
ec = Bz1/2 - t1/2 -> m // Excentricidad de la columna respecto al centro de la zapata
## Viga de conexión (predimensionamiento)
hv = roundup(l12/7, 0.05 m) // Peralte h ≈ l/7
bv = max(roundup(P1/(31*l12)*1 m/(1 tonf/m), 0.05 m), hv/2, t1) // Ancho b ≈ P1/(31 l) ≥ h/2
wv = bv*hv*2.4 tonf/m^3 // Peso propio de la viga
## Reacciones (estática)
R1 = (P1*l12 + wv*l12^2/2)/(l12 - ec) -> tonf // Reacción en la zapata exterior
q1 = R1/(Bz1*Tz1) -> tonf/m^2 // Presión en la zapata exterior
check q1 <= qn // Presión zapata exterior ≤ qn
R2 = P2 + P1 + wv*l12 - R1 -> tonf // Reacción en la zapata interior
Bz2 = roundup(sqrt(R2/qn), 0.05 m) // Lado de la zapata interior (cuadrada)
q2 = R2/Bz2^2 -> tonf/m^2
check q2 <= qn // Presión zapata interior ≤ qn
## Cargas últimas
Pu1 = 1.4*PD1 + 1.7*PL1
Pu2 = 1.4*PD2 + 1.7*PL2
wvu = 1.4*wv
Ru1 = (Pu1*l12 + wvu*l12^2/2)/(l12 - ec) -> tonf // Reacción última en la zapata exterior
Ru2 = Pu1 + Pu2 + wvu*l12 - Ru1 -> tonf`),
      { type: 'beam', tramos: 'ec, l12 - ec', apoyos: 'L, A, A', E: '2.17e6 tonf/m^2', I: 'bv*hv^3/12', cargas: 'P 0 Pu1\nU * wvu', deflexion: false, convencion: 'arriba', sufijo: 'v', titulo: 'Viga de conexión: modelo con apoyo en el centro de la zapata exterior (cargas últimas)' },
      calc(`# Diseño de la viga de conexión (E.060)
dv = hv - 6 cm // Peralte efectivo
Muv = abs(Mneg_v) // Momento último máximo (sobre la zapata exterior, conservador: reacción puntual)
phif = 0.9
Asv = 0.85*fc*bv*dv/fy*(1 - sqrt(1 - 2*Muv/(0.85*phif*fc*bv*dv^2))) // Acero superior requerido
Asvmin = 0.7*sqrtfc(fc)/fy*bv*dv // Acero mínimo (E.060 Art. 10.5.2)
Asvd = max(Asv, Asvmin) // Acero de diseño
nv = ceil(Asvd/Ab(8)) // Varillas de 1"
rhob = 0.85*0.85*fc/fy*6000/(6000 + fy/(1 kgf/cm^2)) // Cuantía balanceada
check Asvd/(bv*dv) <= 0.75*rhob // Cuantía máxima 0.75 ρb (E.060 Art. 10.3.4)
Vuv = Ru1 - Pu1 - wvu*ec -> tonf // Cortante último en el tramo de la viga (fuera de la zapata exterior)
phiVcv = 0.85*0.53*sqrtfc(fc)*bv*dv -> tonf // Resistencia del concreto
Vsv = max(Vuv/0.85 - phiVcv/0.85, 0 tonf) // Resistencia requerida de estribos
sv = rounddown(min(si(Vsv > 0 tonf, 2*Ab(3)*fy*dv/Vsv, dv/2), dv/2, 60 cm), 2.5 cm) // Espaciamiento de estribos #3
check Vsv <= 2.1*sqrtfc(fc)*bv*dv // Límite de la sección (E.060 Art. 11.5.7.9)
"Viga de conexión {bv} × {hv}: acero superior {nv} varillas de 1\\" y estribos #3 @ {sv}.
# Diseño de las zapatas
d = hz - 7.5 cm - db(5) // Peralte efectivo (varillas de 5/8")
## Zapata exterior (voladizo paralelo al lindero)
qu1 = Ru1/(Bz1*Tz1) -> tonf/m^2 // Presión última
lv1 = (Tz1 - bv)/2 -> m // Volado desde la cara de la viga
Vud1 = qu1*Bz1*(lv1 - d) -> tonf
phiVc1 = 0.85*0.53*sqrtfc(fc)*Bz1*d -> tonf
check Vud1 <= phiVc1 // Cortante en la zapata exterior
Mu1 = qu1*Bz1*lv1^2/2 -> tonf*m
As1 = max(0.85*fc*Bz1*d/fy*(1 - sqrt(1 - 2*Mu1/(0.85*phif*fc*Bz1*d^2))), 0.0018*Bz1*hz) // Acero perpendicular a la viga
n1 = ceil(As1/Ab(5))
s1 = rounddown((Bz1 - 15 cm)/max(n1 - 1, 1), 2.5 cm)
check s1 <= min(3*hz, 40 cm) // Espaciamiento zapata exterior
## Zapata interior (cuadrada, columna centrada)
qu2 = (Ru2)/Bz2^2 -> tonf/m^2 // Presión última
bo = 4*(c2 + d) // Perímetro crítico
Vup = Ru2 - qu2*(c2 + d)^2 -> tonf // Cortante de punzonamiento (carga neta transmitida)
phiVcp = 0.85*1.06*sqrtfc(fc)*bo*d -> tonf
check Vup <= phiVcp // Punzonamiento zapata interior
lv2 = (Bz2 - c2)/2 -> m
Vud2 = qu2*Bz2*(lv2 - d) -> tonf
phiVc2 = 0.85*0.53*sqrtfc(fc)*Bz2*d -> tonf
check Vud2 <= phiVc2 // Cortante zapata interior
Mu2 = qu2*Bz2*lv2^2/2 -> tonf*m
As2 = max(0.85*fc*Bz2*d/fy*(1 - sqrt(1 - 2*Mu2/(0.85*phif*fc*Bz2*d^2))), 0.0018*Bz2*hz)
n2 = ceil(As2/Ab(5))
s2 = rounddown((Bz2 - 15 cm)/max(n2 - 1, 1), 2.5 cm)
check s2 <= min(3*hz, 40 cm) // Espaciamiento zapata interior`),
      summary(),
    ],
  },
  // ------------------------------------------------------------------
  //  4) ZAPATA MEDIANERA (EXCÉNTRICA) AISLADA
  // ------------------------------------------------------------------
  {
    id: 'ge-medianera', pais: 'PE', cat: 'Cimentaciones', icon: 'footing',
    name: 'Zapata excéntrica (medianera) aislada',
    normas: E050 + ' (Art. 28) · NTE E.060 Concreto Armado (Art. 11.12, 15)',
    desc: 'Zapata en lindero sin viga de conexión: presión trapezoidal/triangular o uniforme con tensor en el primer techo; fricción, punzonamiento con perímetro de 3 lados y flexión.',
    titulo: 'Diseño de zapata medianera (excéntrica)',
    blocks: [
      text(`# Generalidades
Zapata de columna ubicada en el límite de propiedad. La carga actúa con excentricidad $e = B/2 - t/2$ respecto al centro de la zapata (E.050 Art. 28). Se consideran dos esquemas:

- **Caso 1 – sin restricción**: el momento $P\\,e$ lo resiste el suelo; la presión es trapezoidal si $e \\le B/6$ o triangular si $e > B/6$ (redistribución sin tracción).
- **Caso 2 – con tensor**: el par $P\\,e$ se equilibra con una fuerza horizontal $T = P\\,e/h$ entre la losa del primer techo y la base (fricción), lográndose presión uniforme. La columna y el diafragma deben diseñarse para $T$ y el momento correspondiente.

El diseño estructural sigue la NTE E.060 (punzonamiento con perímetro crítico de tres lados y $\\alpha_s = 30$).`),
      calc(`# Datos
PD = 35 tonf // Carga muerta de servicio
PL = 12 tonf // Carga viva de servicio
t = 0.40 m // Lado de la columna perpendicular al lindero
bc = 0.40 m // Lado de la columna paralelo al lindero
qa = 2.5 kgf/cm^2 // Presión admisible (EMS)
Df = 1.50 m // Profundidad de desplante
gammam = 2.0 tonf/m^3 // Peso unitario promedio suelo–concreto
caso = 2 // Esquema estructural [1 : Sin restricción (presión variable)|2 : Con tensor en el primer techo]
hs = 4.0 m // Distancia de la base al primer techo (brazo del par)
muf = 0.45 // Coeficiente de fricción suelo–concreto (tan δ)
fc = 210 kgf/cm^2 // Resistencia del concreto
fy = 4200 kgf/cm^2 // Fluencia del acero
hz = 0.60 m // Peralte de la zapata
bar = 5 // Varilla [4 : 1/2"|5 : 5/8"|6 : 3/4"]
## Dimensionamiento
qn = qa - gammam*Df -> tonf/m^2 // Presión neta
P = PD + PL // Carga de servicio
Bz = roundup(sqrt(P/(2*qn)), 0.05 m) // Lado perpendicular al lindero (L ≈ 2B)
Lz = roundup(P/(qn*Bz), 0.05 m) // Lado paralelo al lindero
ec = Bz/2 - t/2 -> m // Excentricidad de la carga
Mt = si(caso == 2, P*ec, 0 tonf*m) // Par equilibrado por el tensor
T = Mt/hs -> tonf // Fuerza en el tensor (losa / viga del primer techo)
er = max(ec - Mt/P, 0 m) -> m // Excentricidad remanente sobre el suelo
q1 = si(er <= Bz/6, P/(Bz*Lz)*(1 + 6*er/Bz), 2*P/(3*Lz*(Bz/2 - er))) -> tonf/m^2 // Presión máxima (Art. 28; triangular si e > B/6)
check q1 <= qn // Presión máxima ≤ presión neta admisible
check muf*P >= 1.5*T // Deslizamiento: fricción en la base ≥ 1.5 T
x0 = t/2 // Eje de la columna medido desde el lindero
## Cargas últimas
Pu = 1.4*PD + 1.7*PL
Mtu = si(caso == 2, Pu*ec, 0 tonf*m)`),
      { type: 'winkler', metodo: 'rigido', L: 'Bz', B: 'Lz', E: '2.17e6 tonf/m^2', I: 'Lz*hz^3/12', ks: '', cargas: 'P x0 Pu\nM x0 Mtu', sufijo: 'u', titulo: 'Zapata medianera (dirección perpendicular al lindero): presión última, cortante y momento' },
      calc(`# Diseño estructural (E.060)
d = hz - 7.5 cm - db(bar) // Peralte efectivo
## Punzonamiento — perímetro de 3 lados (E.060 Art. 11.12)
bo = 2*(t + d/2) + (bc + d) // Perímetro crítico
Vu = Pu - qmax_u*(t + d/2)*(bc + d) -> tonf // Cortante de punzonamiento
betac = max(t, bc)/min(t, bc)
phiVc = 0.85*min(0.53*(1 + 2/betac)*sqrtfc(fc)*bo*d, 0.27*(30*d/bo + 2)*sqrtfc(fc)*bo*d, 1.06*sqrtfc(fc)*bo*d) -> tonf // αs = 30 (columna de borde)
check Vu <= phiVc // Punzonamiento
## Cortante por flexión
VudB = qmax_u*Lz*(Bz - t - d) -> tonf // Dirección perpendicular al lindero
phiVcB = 0.85*0.53*sqrtfc(fc)*Lz*d -> tonf
check VudB <= phiVcB // Cortante perpendicular al lindero
lvL = (Lz - bc)/2 -> m // Volado paralelo al lindero
quav = Pu/(Bz*Lz) -> tonf/m^2
VudL = quav*Bz*(lvL - d) -> tonf
phiVcL = 0.85*0.53*sqrtfc(fc)*Bz*d -> tonf
check VudL <= phiVcL // Cortante paralelo al lindero
## Flexión
phif = 0.9
Asreq(Mx, bx) = 0.85*fc*bx*d/fy*(1 - sqrt(1 - 2*Mx/(0.85*phif*fc*bx*d^2)))
MuB = qmax_u*Lz*(Bz - t)^2/2 -> tonf*m // Momento en la cara (dirección B, conservador)
AsB = max(Asreq(MuB, Lz), 0.0018*Lz*hz)
nB = ceil(AsB/Ab(bar))
sB = rounddown((Lz - 15 cm)/max(nB - 1, 1), 2.5 cm)
MuL = quav*Bz*lvL^2/2 -> tonf*m // Momento en la cara (dirección L)
AsL = max(Asreq(MuL, Bz), 0.0018*Bz*hz)
nL = ceil(AsL/Ab(bar))
sL = rounddown((Bz - 15 cm)/max(nL - 1, 1), 2.5 cm)
check max(sB, sL) <= min(3*hz, 40 cm) // Espaciamiento máximo
"Refuerzo: #{bar} @ {sB} perpendicular al lindero y #{bar} @ {sL} paralelo al lindero. Tensor del primer techo para $T_u$ = {Mtu/hs -> tonf}.`),
      summary(),
    ],
  },
  // ------------------------------------------------------------------
  //  5) LOSA / PLATEA DE CIMENTACIÓN
  // ------------------------------------------------------------------
  {
    id: 'ge-platea', pais: 'PE', cat: 'Cimentaciones', icon: 'slab',
    name: 'Platea de cimentación (método rígido)',
    normas: E050 + ' (Art. 23, 26.3) · ACI 336.2R · Das, cap. 6 · NTE E.060',
    desc: 'Resultante y excentricidades, presiones en puntos q = Q/A ± My·x/Iy ± Mx·y/Ix, franja de diseño con cargas modificadas, punzonamiento y flexión.',
    titulo: 'Diseño de platea de cimentación por el método rígido convencional',
    blocks: [
      text(`# Generalidades
Platea (losa) de cimentación de 3 × 3 columnas analizada por el **método rígido convencional** (ACI 336.2R; Das, cap. 6). La presión de contacto en cualquier punto $(x, y)$ medido desde el centroide es

$$q = \\frac{Q}{A} \\pm \\frac{M_y\\,x}{I_y} \\pm \\frac{M_x\\,y}{I_x}$$

con $M_x = Q\\,e_y$, $M_y = Q\\,e_x$. La losa se divide en franjas; en cada franja se promedian la carga de columnas y la reacción del suelo, y las cargas de columna se modifican para lograr el equilibrio. La E.050 (Art. 26.3) exige que la platea tenga una **viga perimetral** de peralte mínimo 0.40 m (0.80 m si el relleno controlado supera 0.80 m).`),
      calc(`# Datos
Lx = 13.0 m // Dimensión de la platea en x
Ly = 13.0 m // Dimensión de la platea en y
xc = [0.5, 6.5, 12.5, 0.5, 6.5, 12.5, 0.5, 6.5, 12.5] m // Coordenadas x de las columnas desde el borde
yc = [0.5, 0.5, 0.5, 6.5, 6.5, 6.5, 12.5, 12.5, 12.5] m // Coordenadas y de las columnas
Pc = [120, 200, 140, 190, 320, 220, 110, 180, 130] tonf // Cargas de servicio de las columnas
qa = 1.2 kgf/cm^2 // Presión admisible (EMS)
hpl = 0.90 m // Espesor de la losa
hvp = 0.80 m // Peralte de la viga perimetral (E.050 Art. 26.3)
c = 0.60 m // Lado de las columnas (cuadradas)
fc = 280 kgf/cm^2 // Resistencia del concreto
fy = 4200 kgf/cm^2 // Fluencia del acero
fu = 1.55 // Factor de carga promedio (1.4 CM + 1.7 CV)/(CM + CV)
check hvp >= 0.40 m // Peralte mínimo de la viga perimetral (E.050 Art. 26.3)
## Resultante y excentricidades
@modo corto
Q = sum(Pc) // Carga total de servicio
A = Lx*Ly // Área de la platea
xb = sum(Pc.*xc)/Q -> m // Abscisa de la resultante
yb = sum(Pc.*yc)/Q -> m // Ordenada de la resultante
@modo completo
ex = xb - Lx/2 -> m // Excentricidad en x
ey = yb - Ly/2 -> m // Excentricidad en y
Ix = Lx*Ly^3/12 // Inercia respecto al eje x
Iy = Ly*Lx^3/12 // Inercia respecto al eje y
Mx = Q*ey -> tonf*m // Momento respecto al eje x
My = Q*ex -> tonf*m // Momento respecto al eje y
## Presiones en las esquinas y bajo las columnas
@modo corto
xs = xc - Lx/2 // Coordenadas relativas al centroide
ys = yc - Ly/2
qcol = Q/A + My*xs/Iy + Mx*ys/Ix // Presión bajo cada columna
@modo completo
qA = Q/A - My*(Lx/2)/Iy - Mx*(Ly/2)/Ix -> tonf/m^2 // Esquina (0, 0)
qB = Q/A + My*(Lx/2)/Iy - Mx*(Ly/2)/Ix -> tonf/m^2 // Esquina (Lx, 0)
qC = Q/A + My*(Lx/2)/Iy + Mx*(Ly/2)/Ix -> tonf/m^2 // Esquina (Lx, Ly)
qD = Q/A - My*(Lx/2)/Iy + Mx*(Ly/2)/Ix -> tonf/m^2 // Esquina (0, Ly)
qmx = max(qA, qB, qC, qD) // Presión máxima
qmn = min(qA, qB, qC, qD) // Presión mínima
check qmx <= qa // Presión máxima ≤ presión admisible (E.050 Art. 22)
check qmn > 0 tonf/m^2 // Toda la platea en compresión`),
      { type: 'table', columnas: 'Columna = 1:9\nx [m] = xc\ny [m] = yc\nP [tonf] = Pc\nq [tonf/m^2] = qcol', titulo: 'Presión de contacto bajo cada columna (método rígido)' },
      calc(`# Franja central en la dirección x (y = 3.5 a 9.5 m)
B1 = 6.0 m // Ancho de la franja
Fs = Pc[4] + Pc[5] + Pc[6] // Suma de cargas de columnas en la franja
qav = (qcol[4] + qcol[5] + qcol[6])/3 -> tonf/m^2 // Presión promedio en la franja
Rs = qav*B1*Lx -> tonf // Reacción del suelo en la franja
Pav = (Fs + Rs)/2 // Carga promedio de la franja (Das, cap. 6)
Fm = Pav/Fs // Factor de modificación de cargas de columna
qmod = Pav/(B1*Lx) -> tonf/m^2 // Presión modificada
Pm4 = fu*Fm*Pc[4] // Carga última modificada — columna 4
Pm5 = fu*Fm*Pc[5] // Carga última modificada — columna 5
Pm6 = fu*Fm*Pc[6] // Carga última modificada — columna 6
x4 = xc[4]
x5 = xc[5]
x6 = xc[6]`),
      { type: 'winkler', metodo: 'rigido', L: 'Lx', B: 'B1', E: '2.5e6 tonf/m^2', I: 'B1*hpl^3/12', ks: '', cargas: 'P x4 Pm4\nP x5 Pm5\nP x6 Pm6', sufijo: 'f', titulo: 'Franja central (cargas últimas modificadas): presión, cortante y momento' },
      calc(`# Diseño de la losa (E.060)
d = hpl - 7.5 cm - 2.5 cm // Peralte efectivo (varillas de 1")
## Punzonamiento de la columna central
Pu5 = fu*Pc[5] // Carga última de la columna central
qu5 = fu*qcol[5] -> tonf/m^2
bo = 4*(c + d) // Perímetro crítico
Vu = Pu5 - qu5*(c + d)^2 -> tonf
phiVc = 0.85*1.06*sqrtfc(fc)*bo*d -> tonf // βc = 1, αs = 40
check Vu <= phiVc // Punzonamiento columna interior
## Punzonamiento de la columna de borde más cargada (3 lados)
Pu6 = fu*Pc[6]
bo6 = 2*(c + d/2 + 0.5 m - c/2) + (c + d) // Perímetro crítico (columna a 0.5 m del borde)
Vu6 = Pu6 - fu*qcol[6]*(c + d/2 + 0.5 m - c/2)*(c + d) -> tonf
phiVc6 = 0.85*min(0.27*(30*d/bo6 + 2), 1.06)*sqrtfc(fc)*bo6*d -> tonf // αs = 30
check Vu6 <= phiVc6 // Punzonamiento columna de borde
## Punzonamiento de la columna de esquina más cargada (2 lados)
Pu3 = fu*Pc[3] // Columna 3, esquina (12.5; 0.5)
a3 = 0.5 m + c/2 + d/2 // Lado de la sección crítica (desde los bordes libres hasta d/2 de la cara)
bo3 = 2*a3 // Perímetro crítico de esquina
Vu3 = Pu3 - fu*qcol[3]*a3^2 -> tonf
phiVc3 = 0.85*min(0.27*(20*d/bo3 + 2), 1.06)*sqrtfc(fc)*bo3*d -> tonf // αs = 20 (columna de esquina, E.060 Art. 11.12.2.1 b)
check Vu3 <= phiVc3 // Punzonamiento columna de esquina
## Flexión por metro de ancho
phif = 0.9
bm = 1 m
Asreq(Mx) = 0.85*fc*bm*d/fy*(1 - sqrt(1 - 2*Mx/(0.85*phif*fc*bm*d^2)))
Mneg1 = abs(Mneg_f)/B1*bm // Momento negativo por metro (acero superior entre columnas)
Mpos1 = Mpos_f/B1*bm // Momento positivo por metro (acero inferior bajo columnas)
Assup = max(Asreq(Mneg1), 0.0018*bm*hpl) -> cm^2 // Acero superior por metro
Asinf = max(Asreq(Mpos1), 0.0018*bm*hpl) -> cm^2 // Acero inferior por metro
ssup = rounddown(Ab(8)/Assup*bm, 2.5 cm) // Espaciamiento de varillas de 1" (superior)
sinf = rounddown(Ab(8)/Asinf*bm, 2.5 cm) // Espaciamiento (inferior)
check max(ssup, sinf) <= min(3*hpl, 40 cm) // Espaciamiento máximo
## Cortante por flexión en la franja
Vudf = Vmax_f - qmin_f*B1*(c/2 + d) -> tonf
phiVcf = 0.85*0.53*sqrtfc(fc)*B1*d -> tonf
check Vudf <= phiVcf // Cortante unidireccional`),
      summary(),
    ],
  },
  // ------------------------------------------------------------------
  //  6) VIGA DE CIMENTACIÓN SOBRE SUELO ELÁSTICO (WINKLER)
  // ------------------------------------------------------------------
  {
    id: 'ge-winkler', pais: 'PE', cat: 'Cimentaciones', icon: 'beam',
    name: 'Viga de cimentación sobre suelo elástico (Winkler)',
    normas: E050 + ' · Hetényi (1946) · Vesic (1961) · Bowles (1996, cap. 9) · NTE E.060',
    desc: 'Cimiento corrido / viga de cimentación con varias columnas sobre lecho de Winkler (elementos finitos): presiones, asentamientos, V y M; comparación con el método rígido y diseño E.060.',
    titulo: 'Viga de cimentación sobre lecho elástico (modelo de Winkler)',
    blocks: [
      text(`# Generalidades
La viga de cimentación se modela como una viga de Euler–Bernoulli apoyada en un **lecho de resortes independientes** (Winkler) de rigidez $k = k_s\\,B$ por unidad de longitud. La ecuación diferencial es $EI\\,w'''' + k_s B\\,w = p(x)$, cuya solución analítica para la viga infinita es la de **Hetényi (1946)** con el parámetro $\\lambda = \\sqrt[4]{k_s B/(4EI)}$. Aquí se resuelve por **elementos finitos** (elementos viga de Hermite con matriz consistente de cimentación), lo que admite longitudes finitas, cargas y momentos de columnas arbitrarios y la opción de suelo sin tracción.

El coeficiente de balasto se estima con la expresión de **Vesic (1961)** a partir del módulo de elasticidad del suelo y se contrasta con la recomendación de **Bowles (1996)** $k_s \\approx 40\\,(FS)\\,q_a$. Las presiones de servicio se comparan con la presión admisible (E.050 Art. 22) y los momentos y cortantes últimos se usan en el diseño E.060.`),
      calc(`# Datos
Lv = 13.0 m // Longitud de la viga de cimentación
Bv = 1.60 m // Ancho de contacto (ala de la zapata)
hv = 0.90 m // Peralte de la viga (sección rectangular equivalente)
fc = 210 kgf/cm^2 // Resistencia del concreto
fy = 4200 kgf/cm^2 // Fluencia del acero
PD1 = 40 tonf // Columna A (x = 0.5 m): carga muerta
PL1 = 15 tonf // Columna A: carga viva
PD2 = 75 tonf // Columna B (x = 6.5 m): carga muerta
PL2 = 30 tonf // Columna B: carga viva
PD3 = 45 tonf // Columna C (x = 12.5 m): carga muerta
PL3 = 18 tonf // Columna C: carga viva
MD1 = 3 tonf*m // Momento de servicio en la columna A (horario)
xA = 0.5 m // Posición de la columna A
xB = 6.5 m // Posición de la columna B
xC = 12.5 m // Posición de la columna C
qa = 1.5 kgf/cm^2 // Presión admisible (EMS)
Es = 250 kgf/cm^2 // Módulo de elasticidad del suelo (EMS)
mu = 0.30 // Coeficiente de Poisson del suelo
ksop = 1 // Coeficiente de balasto [1 : Vesic (1961)|2 : Bowles 40·FS·qa]
## Rigidez de la viga y del suelo
Ec = 15000*sqrtfc(fc) // Módulo del concreto (E.060 Art. 8.5)
Iv = Bv*hv^3/12 // Inercia de la sección
ks1 = ksVesic(Es, mu, Bv, Ec*Iv) -> kgf/cm^3 // Vesic: $0.65\\,(E_s B^4/EI)^{1/12}\\,E_s/(B(1-\\mu^2))$
ks2 = ksBowles(qa, 3) -> kgf/cm^3 // Bowles: ks ≈ FS·qa/25.4 mm
ks = si(ksop == 1, ks1, ks2) -> kgf/cm^3 // Coeficiente de balasto adoptado
lambda = sqrt(sqrt(ks*Bv/(4*Ec*Iv))) -> m^-1 // Parámetro de Hetényi
lambdaL = lambda*Lv // Rigidez relativa λL (rígida < π/4, flexible > π)
## Cargas
P1 = PD1 + PL1
P2 = PD2 + PL2
P3 = PD3 + PL3
Pu1 = 1.4*PD1 + 1.7*PL1
Pu2 = 1.4*PD2 + 1.7*PL2
Pu3 = 1.4*PD3 + 1.7*PL3
Mu1 = 1.4*MD1`),
      { type: 'winkler', metodo: 'winkler', L: 'Lv', B: 'Bv', E: 'Ec', I: 'Iv', ks: 'ks', cargas: 'P xA P1\nP xB P2\nP xC P3\nM xA MD1', qadm: 'qa', sintraccion: true, sufijo: 's', nel: '160', titulo: 'Viga sobre lecho de Winkler — cargas de servicio (verificación de presiones)' },
      { type: 'winkler', metodo: 'winkler', L: 'Lv', B: 'Bv', E: 'Ec', I: 'Iv', ks: 'ks', cargas: 'P xA Pu1\nP xB Pu2\nP xC Pu3\nM xA Mu1', sintraccion: true, sufijo: 'u', nel: '160', titulo: 'Viga sobre lecho de Winkler — cargas últimas (diseño)' },
      calc(`# Comparación con el método rígido
qrig = (P1 + P2 + P3)/(Bv*Lv) -> tonf/m^2 // Presión media del método rígido
"El modelo elástico concentra la presión bajo las columnas: $q_{max}$ = {qmax_s} frente a la presión media {qrig}; el asentamiento máximo es {wmax_s}.
check wmax_s <= 25 mm // Asentamiento máximo ≤ 25 mm (E.050 Art. 19, EMS)
# Diseño de la viga (E.060)
d = hv - 7.5 cm - db(8) // Peralte efectivo
phif = 0.9
Asreq(Mx, bx) = 0.85*fc*bx*d/fy*(1 - sqrt(1 - 2*Mx/(0.85*phif*fc*bx*d^2)))
Asmin = max(0.0018*Bv*hv, 0.7*sqrtfc(fc)/fy*Bv*d) // Acero mínimo
As_inf = max(Asreq(Mpos_u, Bv), Asmin) // Acero inferior (momento positivo bajo columnas)
As_sup = max(Asreq(abs(Mneg_u), Bv), Asmin) // Acero superior (momento negativo entre columnas)
ninf = ceil(As_inf/Ab(8)) // Varillas de 1" inferiores
nsup = ceil(As_sup/Ab(8)) // Varillas de 1" superiores
sinf = rounddown((Bv - 15 cm)/max(ninf - 1, 1), 2.5 cm)
check sinf <= min(3*hv, 40 cm) // Espaciamiento máximo
Vud = Vmax_u -> tonf // Cortante último máximo (conservador, en el eje)
phiVc = 0.85*0.53*sqrtfc(fc)*Bv*d -> tonf
check Vud <= phiVc + 0.85*2.1*sqrtfc(fc)*Bv*d // Límite de la sección
Vs = max(Vud/0.85 - phiVc/0.85, 0 tonf) // Resistencia requerida de estribos
sest = rounddown(min(si(Vs > 0 tonf, 4*Ab(4)*fy*d/Vs, d/2), d/2, 60 cm), 2.5 cm) // Estribos de 4 ramas #4
"Refuerzo: {nsup} φ1\\" superiores, {ninf} φ1\\" inferiores y estribos #4 de 4 ramas @ {sest}.`),
      summary(),
    ],
  },
  // ------------------------------------------------------------------
  //  7) CIMIENTO CORRIDO PARA MUROS DE ALBAÑILERÍA
  // ------------------------------------------------------------------
  {
    id: 'ge-corrido', pais: 'PE', cat: 'Cimentaciones', icon: 'wall',
    name: 'Cimiento corrido para muros de albañilería',
    normas: E050 + ' (Art. 23, 26) · NTE E.070 Albañilería · NTE E.060 Cap. 22 (concreto estructural simple)',
    desc: 'Ancho por presión admisible, profundidad mínima 0.80 m, verificación del concreto ciclópeo a flexión y cortante y presión en la base.',
    titulo: 'Diseño de cimiento corrido de concreto ciclópeo',
    blocks: [
      text(`# Generalidades
Cimiento corrido continuo ($L > 10B$, E.050 Art. 23.3) de **concreto ciclópeo** (concreto simple con 30 % de piedra grande) bajo un muro portante de albañilería. Se analiza por metro lineal: el ancho se fija con la presión admisible neta y el peralte se verifica como **concreto estructural simple** (NTE E.060 Cap. 22) a flexión (ec. 22-2, $M_n = 0.42\\sqrt{f'_c}\\,S_m$ en MPa) y cortante como viga (ec. 22-9, $V_n = 0.11\\sqrt{f'_c}\\,b\\,h$), con $\\phi = 0.65$ (Art. 9.3.2.8) y un peralte de cálculo 50 mm menor que el real por estar vaciado contra el suelo (Art. 22.4.8). La resistencia mínima del concreto simple estructural es 14 MPa (Art. 22.2.4). La profundidad mínima de cimentación es 0.80 m (E.050 Art. 26.2).`),
      calc(`# Datos (por metro lineal de muro)
wD = 8.5 tonf/m // Carga muerta de servicio del muro y techos
wL = 2.0 tonf/m // Carga viva de servicio
tm = 0.25 m // Espesor del muro (aparejo de cabeza/soga)
bs = 0.25 m // Ancho del sobrecimiento
hs = 0.50 m // Altura del sobrecimiento (sobre el cimiento)
qa = 1.2 kgf/cm^2 // Presión admisible (EMS)
Df = 1.00 m // Profundidad de desplante
gammas = 1.80 tonf/m^3 // Peso unitario del suelo
gammacc = 2.30 tonf/m^3 // Peso unitario del concreto ciclópeo
fc = 140 kgf/cm^2 // Resistencia del concreto ciclópeo (≥ 14 MPa, E.060 Art. 22.2.4)
hc = 0.80 m // Peralte del cimiento
check Df >= 0.80 m // Profundidad mínima (E.050 Art. 26.2)
check bs >= tm // El sobrecimiento es al menos tan ancho como el muro
check fc >= 140 kgf/cm^2 // Resistencia mínima del concreto simple estructural: 14 MPa ≈ 140 kgf/cm² (E.060 Art. 22.2.4)
## Ancho del cimiento
qn = qa - gammas*(Df - hc) - gammacc*hc -> tonf/m^2 // Presión neta (descuenta relleno y cimiento)
w = wD + wL + gammacc*bs*hs // Carga de servicio más sobrecimiento
Bc = roundup(max(w/qn, 0.40 m), 0.05 m) // Ancho del cimiento (mín. 0.40 m)
qs = w/Bc + gammas*(Df - hc) + gammacc*hc -> tonf/m^2 // Presión bruta en la base
check qs <= qa // Presión en la base ≤ presión admisible
## Verificación del concreto simple (E.060 Cap. 22)
wu = 1.4*(wD + gammacc*bs*hs) + 1.7*wL // Carga última por metro
qu = wu/Bc -> tonf/m^2 // Presión última neta
v = (Bc - bs)/2 -> m // Volado desde la cara del sobrecimiento
Mu = qu*v^2/2*1 m -> tonf*m // Momento en la cara (por metro)
hcal = hc - 5 cm // Peralte de cálculo: 50 mm menos por vaciarse contra el suelo (E.060 Art. 22.4.8)
Sm = 1 m*hcal^2/6 // Módulo de sección
phiMn = 0.65*1.34*sqrtfc(fc)*Sm -> tonf*m // φMn = φ·0.42√f'c(MPa)·Sm = φ·1.34√f'c(kgf/cm²)·Sm (E.060 ec. 22-2)
check Mu <= phiMn // Flexión en concreto simple
Vu = qu*max(v - hcal, 0 m)*1 m -> tonf // Cortante a una distancia h de la cara
phiVn = 0.65*0.35*sqrtfc(fc)*1 m*hcal -> tonf // φVn = φ·0.11√f'c(MPa)·b·h = φ·0.35√f'c(kgf/cm²)·b·h (E.060 ec. 22-9)
check Vu <= phiVn // Cortante en concreto simple
check hc >= v // Proporción recomendada: peralte ≥ volado (ángulo de difusión ≥ 45°)`),
      { type: 'stripfooting', B: 'Bc', hc: 'hc', bs: 'bs', hs: 'hs', tm: 'tm', Df: 'Df', npt: '0.20 m', q: 'qs', material: "Concreto ciclópeo f'c = 140 kgf/cm² + 30 % P.G.", titulo: 'Sección del cimiento corrido y presión de servicio en la base' },
      summary(),
    ],
  },
  // ------------------------------------------------------------------
  //  8) PILOTE INDIVIDUAL
  // ------------------------------------------------------------------
  {
    id: 'ge-pilote', pais: 'PE', cat: 'Cimentaciones', icon: 'column',
    name: 'Pilote individual: capacidad por punta y fuste',
    normas: E050 + ' (Art. 15, 32) · Meyerhof (1976) · API RP2A (método α) · Burland (1973, método β) · Vesic (1977) · Broms (1964) · Das cap. 11',
    desc: 'Pilote hincado en suelo estratificado: punta por Meyerhof (Nq*, límite ql) y SPT, fuste por métodos α y β, fricción negativa, FS ≥ 2, asentamiento elástico (Vesic) y capacidad lateral (Broms).',
    titulo: 'Capacidad de carga y asentamiento de pilote individual',
    blocks: [
      text(`# Generalidades
Capacidad última de un pilote hincado de concreto según la E.050 Art. 32.3: $Q_u = Q_p + \\sum Q_f$. La **punta** se evalúa con la teoría de Meyerhof (1976) $q_p = q'\\,N_q^* \\le q_l = 0.5\\,p_a\\,N_q^*\\tan\\phi$ y con la correlación SPT de Meyerhof, adoptando el menor valor. La **fricción lateral** en arcilla se calcula con el método α (API RP2A, $\\alpha$ función de $\\psi = c_u/\\sigma'_v$) y en arena con el método β ($\\beta = (1-\\sin\\phi)\\tan\\phi$, Burland 1973) y la correlación SPT de Meyerhof, adoptando el menor. Si la arcilla blanda se consolida (relleno nuevo o descenso del nivel freático) se produce **fricción negativa** (E.050 Art. 32.3.4 e): se calcula con el método β hasta el plano neutro (tope de la arena), no se cuenta la fricción positiva de la arcilla y el arrastre $Q_n$ se suma a la carga (Art. 32.3.4 f). La capacidad admisible usa $FS \\ge 2.0$ para pilotes individuales (E.050 Art. 32.3.4 c-1). El asentamiento se estima con el método de Vesic (1977; Das, cap. 11): acortamiento elástico, punta y fuste. La **capacidad lateral última** se evalúa con el método de Broms (1964) para suelo cohesivo, como el menor entre los mecanismos de pilote corto, intermedio y largo (rótula plástica con el momento de fluencia $M_y$).`),
      { type: 'soilprofile', estratos: '2.0 CL 1.75 1.80 Arcilla blanda gris\n4.0 CL 1.80 1.80 Arcilla blanda saturada\n14.0 SP 1.95 2.00 Arena densa pobremente gradada', nf: '2.0 m', spt: '1.0 4\n3.0 3\n5.0 4\n7.0 26\n9.0 29\n11.0 30\n13.0 32\n15.0 34\n17.0 36\n19.0 38', ER: '60', zref: '14 m', zona: '6 16', tabla: false, titulo: 'Perfil estratigráfico del sondeo y ensayos SPT' },
      calc(`# Datos
Dp = 0.40 m // Lado del pilote cuadrado de concreto hincado
Lpil = 14.0 m // Longitud del pilote (punta en la arena densa)
P = 45 tonf // Carga de servicio por pilote
fc = 350 kgf/cm^2 // Resistencia del concreto del pilote
H1 = 2.0 m // Arcilla sobre el NF
H2 = 4.0 m // Arcilla bajo el NF
cu1 = 3.0 tonf/m^2 // Resistencia no drenada de la arcilla 1
cu2 = 3.0 tonf/m^2 // Resistencia no drenada de la arcilla 2
gammac1 = 1.75 tonf/m^3 // γ arcilla 1
gammac2 = 1.80 tonf/m^3 // γsat arcilla 2
gammas3 = 2.00 tonf/m^3 // γsat arena
gammaw = 1.0 tonf/m^3 // Peso unitario del agua
phis = 34 deg // φ' de la arena densa
FSp = 2.0 // Factor de seguridad, pilote individual (E.050 Art. 32.3.4 c-1)
pexp = 20.0 m // Profundidad alcanzada por el sondeo
check pexp >= Lpil + 6 m // Profundidad mínima de exploración p = Df + z, z = 6 m (E.050 Art. 15, c-2)
fneg = 1 // Fricción negativa [1 : No — la arcilla no se consolida|2 : Sí — relleno nuevo o descenso del NF]
qrel = 2.0 tonf/m^2 // Sobrecarga del relleno sobre la arcilla (solo si hay fricción negativa)
phic = 22 deg // φ' de la arcilla blanda (método β para la fricción negativa)
Ap = Dp^2 // Área de la punta
per = 4*Dp // Perímetro
Lb = Lpil - H1 - H2 // Empotramiento en la arena
## Esfuerzos efectivos
sigmav1 = gammac1*H1/2 -> tonf/m^2 // σ'v en el centro de la arcilla 1
sigmav2 = gammac1*H1 + (gammac2 - gammaw)*H2/2 -> tonf/m^2 // σ'v en el centro de la arcilla 2
sigmav3 = gammac1*H1 + (gammac2 - gammaw)*H2 + (gammas3 - gammaw)*Lb/2 -> tonf/m^2 // σ'v en el centro del tramo en arena
sigmavp = gammac1*H1 + (gammac2 - gammaw)*H2 + (gammas3 - gammaw)*Lb -> tonf/m^2 // σ'v en la punta (q')
# Resistencia por punta
## Meyerhof (1976) — teoría
Nqs = NqMeyerhof(phis) // Nq* de Meyerhof (Das, Tabla 11.5)
qp1 = sigmavp*Nqs -> tonf/m^2 // q'·Nq*
ql = qlMeyerhof(Nqs, phis) -> tonf/m^2 // Resistencia de punta límite 0.5·pa·Nq*·tanφ
qp_a = min(qp1, ql) -> tonf/m^2 // Punta unitaria (Meyerhof)
## Meyerhof (1976) — correlación SPT
N60p = N60prom // N60 promedio en la zona de la punta (perfil SPT)
qp_b = qpMeyerhofSPT(N60p, Lb, Dp) -> tonf/m^2 // 0.4·pa·N60·Lb/D ≤ 4·pa·N60
qp = min(qp_a, qp_b) -> tonf/m^2 // Se adopta el menor
Qp = qp*Ap -> tonf // Capacidad por punta
# Resistencia por fricción lateral
## Arcilla — método α (API RP2A)
alpha1 = alphaAPI(cu1, sigmav1) // α = 0.5ψ^(−0.5) (ψ ≤ 1) ó 0.5ψ^(−0.25) (ψ > 1)
alpha2 = alphaAPI(cu2, sigmav2)
Qs1 = alpha1*cu1*per*H1 -> tonf // Fricción en la arcilla 1
Qs2 = alpha2*cu2*per*H2 -> tonf // Fricción en la arcilla 2
## Arena — método β y correlación SPT
beta3 = betaBurland(phis, 1) // β = (1 − sinφ)·tanφ (arena NC)
fs_a = beta3*sigmav3 -> tonf/m^2 // Fricción unitaria (β)
fs_b = fsMeyerhofSPT(N60p, 0.02) -> tonf/m^2 // 0.02·pa·N60 (pilote de gran desplazamiento)
fs3 = min(fs_a, fs_b) -> tonf/m^2
Qs3 = fs3*per*Lb -> tonf // Fricción en la arena
## Fricción negativa en la arcilla (E.050 Art. 32.3.4 e y f)
betan = betaBurland(phic, 1) // β = (1 − sinφ')tanφ' ≈ 0.20–0.30 en arcillas (Burland 1973; Fellenius)
Qn = si(fneg == 2, betan*per*((qrel + sigmav1)*H1 + (qrel + sigmav2)*H2), 0 tonf) -> tonf // Arrastre hacia abajo; plano neutro en el tope de la arena (pilote de punta)
Qsc = si(fneg == 2, 0 tonf, Qs1 + Qs2) -> tonf // Con fricción negativa la arcilla no aporta fricción positiva (Art. 32.3.4 f-1)
Qs = Qsc + Qs3 // Fricción total ΣQf
# Capacidad admisible (E.050 Art. 32.3)
Qu = Qp + Qs -> tonf // Capacidad última Qu = Qp + ΣQf
Qadm = Qu/FSp -> tonf // Capacidad admisible
Pt = P + Qn // Carga de diseño: la fricción negativa es una carga adicional (Art. 32.3.4 f-2)
check Pt <= Qadm // Carga de servicio (+ fricción negativa) ≤ capacidad admisible (FS ≥ 2.0)
check Pt <= 0.25*fc*Ap // Esfuerzo estructural de servicio ≤ 0.25 f'c (práctica usual, pilote de concreto)
check Lpil/Dp >= 10 // Cimentación por pilotes: d/b ≥ 10 (E.050 Art. 5.23)
# Asentamiento del pilote (Vesic 1977; E.050 Art. 32.3.5 b)
Ep = 15000*sqrtfc(fc) // Módulo del concreto
Esb = EsSPT(N60p, 10) -> tonf/m^2 // Es de la arena bajo la punta (Kulhawy y Mayne)
mus = 0.30 // Poisson de la arena
xi = 0.62 // Distribución de la fricción (Vesic: 0.5 uniforme – 0.67 triangular)
Qwp = P*Qp/Qu // Carga de trabajo por punta (proporcional)
Qws = P - Qwp // Carga de trabajo por fuste
Se1 = (Qwp + xi*Qws)*Lpil/(Ap*Ep) -> mm // Acortamiento elástico del pilote
Se2 = Qwp/Ap*Dp/Esb*(1 - mus^2)*0.85 -> mm // Asentamiento por la punta (Iwp = 0.85)
Iws = 2 + 0.35*sqrt(Lpil/Dp) // Factor de influencia del fuste
Se3 = Qws/(per*Lpil)*Dp/Esb*(1 - mus^2)*Iws -> mm // Asentamiento por el fuste
Se = Se1 + Se2 + Se3 -> mm // Asentamiento total del pilote
check Se <= 25 mm // Asentamiento ≤ tolerable (EMS)
# Capacidad lateral (Broms 1964; E.050 Art. 32.1: cargas sísmicas)
Hs = 1.5 tonf // Fuerza horizontal de servicio por pilote (sismo)
cab = 2 // Condición de la cabeza [1 : Libre|2 : Empotrada en el cabezal]
ebr = 0 m // Altura de aplicación de la carga sobre el terreno (cabeza libre)
Myp = 8.0 tonf*m // Momento de fluencia de la sección del pilote (diagrama de interacción con P)
cul = min(cu1, cu2) // cu de la arcilla superior (la reacción lateral se moviliza en los primeros diámetros)
Hu = HuBromsC(cul, Dp, Lpil, ebr, Myp, cab) -> tonf // Carga lateral última de Broms en suelo cohesivo (9·cu·D bajo 1.5D)
fH = Hu/(9*cul*Dp) -> m // Profundidad de la reacción plástica bajo 1.5D
check 1.5*Dp + fH <= H1 + H2 // La zona de reacción lateral queda dentro de la arcilla (hipótesis de suelo homogéneo)
FSH = 2.5 // Factor de seguridad lateral (sismo, criterio del Art. 21.2)
check Hs <= Hu/FSH // Carga lateral de servicio ≤ Hu/FS
"Mecanismo de Broms que gobierna: pilote {modoBromsC(cul, Dp, Lpil, ebr, Myp, cab)} ({si(cab == 2, 1, 0)} = cabeza empotrada). La respuesta lateral en servicio (desplazamientos) debe verificarse con un modelo de reacción horizontal p–y o de Winkler lateral.`),
      summary(),
    ],
  },
  // ------------------------------------------------------------------
  //  9) GRUPO DE PILOTES Y CABEZAL
  // ------------------------------------------------------------------
  {
    id: 'ge-grupo', pais: 'PE', cat: 'Cimentaciones', icon: 'grid',
    name: 'Grupo de pilotes y diseño del cabezal',
    normas: E050 + ' (Art. 32.3.4 b–d, Tabla 9, 32.3.5 d) · Converse–Labarre · Das cap. 11 · NTE E.060 (Art. 11.12, 15.5)',
    desc: 'Pilotes de fricción en arcilla: eficiencia de Converse–Labarre, falla en bloque, FS de grupo, cargas por pilote con momentos, consolidación por zapata equivalente y diseño del cabezal.',
    titulo: 'Grupo de pilotes de fricción y cabezal',
    blocks: [
      text(`# Generalidades
Grupo de pilotes de fricción hincados en arcilla (E.050 Art. 32.3.4 b-1: «se analiza el efecto de grupo»). La capacidad del grupo es la menor entre la suma de capacidades individuales afectada por la **eficiencia de Converse–Labarre** y la capacidad como **bloque** (Terzaghi y Peck 1967; Das, cap. 11). La admisible usa $FS \\ge 3.0$ para cargas estáticas (Art. 32.3.4 c-1). El asentamiento por consolidación se estima con una **zapata equivalente a 2/3 de la longitud** (Art. 32.3.5 d). El espaciamiento mínimo es el de la Tabla 9 y no menor que 1.20 m para pilotes de fricción. El cabezal se diseña a punzonamiento (columna y pilote), cortante y flexión (E.060).`),
      calc(`# Datos
n1 = 3 // Pilotes en la dirección x
n2 = 3 // Pilotes en la dirección y
Dp = 0.60 m // Diámetro del pilote (vaciado)
sp = 2.40 m // Espaciamiento entre ejes
Lp = 20.0 m // Longitud de los pilotes
cu = 6.0 tonf/m^2 // Resistencia no drenada promedio en el fuste
cub = 8.0 tonf/m^2 // Resistencia no drenada bajo la punta
gammac = 1.85 tonf/m^3 // Peso unitario saturado de la arcilla
gammaw = 1.0 tonf/m^3
Dw = 0.0 m // Nivel freático en la superficie (desfavorable)
PD = 180 tonf // Carga muerta de la columna
PL = 60 tonf // Carga viva de la columna
Mx = 20 tonf*m // Momento de servicio alrededor de x
My = 15 tonf*m // Momento de servicio alrededor de y
## Separación mínima (E.050 Tabla 9)
smin = si(Lp < 10 m, 3*Dp, si(Lp < 25 m, 4*Dp, 5*Dp)) // 3b, 4b o 5b según la longitud
check sp >= max(smin, 1.20 m) // Espaciamiento ≥ Tabla 9 y ≥ 1.20 m (pilotes de fricción, Art. 32.3.4 d-2)
## Capacidad de un pilote (método α, punta 9 cu)
Ap = pi*Dp^2/4
per = pi*Dp
svm = (gammac - gammaw)*Lp/2 -> tonf/m^2 // σ'v a media longitud
alpha = alphaAPI(cu, svm) // API RP2A
Qs1 = alpha*cu*per*Lp -> tonf // Fricción
Qp1 = 9*cub*Ap -> tonf // Punta: Nc* = 9 (Skempton)
Qu1 = Qs1 + Qp1 -> tonf // Capacidad última individual
## Capacidad del grupo
np = n1*n2 // Número de pilotes
eta = etaConverse(n1, n2, Dp, sp) // Eficiencia de Converse–Labarre
Qg1 = eta*np*Qu1 -> tonf // Suma de individuales con eficiencia
Lg = (n1 - 1)*sp + Dp // Lado del bloque en x
Bg = (n2 - 1)*sp + Dp // Lado del bloque en y
Ncs = 5*(1 + 0.2*min(Lp/Bg, 2.5))*(1 + 0.2*Bg/Lg) // Nc* del bloque (Skempton 1951): D/B ≤ 2.5 → máx. 7.5(1 + 0.2B/L) ≤ 9
Qg2 = Lg*Bg*cub*Ncs + 2*(Lg + Bg)*cu*Lp -> tonf // Falla en bloque (Terzaghi y Peck)
Qgu = min(Qg1, Qg2) -> tonf // Capacidad última del grupo
FSg = 3.0 // FS de grupo, cargas estáticas (E.050 Art. 32.3.4 c-1)
Qga = Qgu/FSg -> tonf // Capacidad admisible del grupo
## Cabezal y cargas por pilote
ed = 0.45 m // Distancia del eje del pilote al borde del cabezal
hc = 1.20 m // Peralte del cabezal
Lc = (n1 - 1)*sp + 2*ed // Largo del cabezal
Bc = (n2 - 1)*sp + 2*ed // Ancho del cabezal
Wc = Lc*Bc*hc*2.4 tonf/m^3 // Peso del cabezal
Ptot = PD + PL + Wc // Carga total de servicio
check Ptot <= Qga // Carga del grupo ≤ capacidad admisible (FS = 3)
xmax = (n1 - 1)*sp/2 // Coordenada del pilote más alejado
ymax = (n2 - 1)*sp/2
Sx2 = n2*sp^2*n1*(n1^2 - 1)/12 // Σx² = n2·s²·n1(n1² − 1)/12
Sy2 = n1*sp^2*n2*(n2^2 - 1)/12 // Σy²
Pmax = Ptot/np + My*xmax/Sx2 + Mx*ymax/Sy2 -> tonf // Pilote más cargado
Pmin = Ptot/np - My*xmax/Sx2 - Mx*ymax/Sy2 -> tonf
check Pmax <= Qu1/2 // Pilote más cargado ≤ Qu/2 (FS individual ≥ 2.0)
check Pmin >= 0 tonf // Sin tracción en los pilotes
## Asentamiento por consolidación (zapata equivalente a 2/3 L, Art. 32.3.5 d)
Hcl = 12.0 m // Espesor de arcilla compresible bajo la zapata equivalente
Cc = 0.25 // Índice de compresión
Cr = 0.04 // Índice de recompresión
e0 = 0.95 // Relación de vacíos inicial
OCR = 1.3 // Razón de sobreconsolidación (arcilla rígida)
zeq = 2/3*Lp // Profundidad de la zapata equivalente
zm = Hcl/2 // Profundidad del centro de la capa bajo la zapata equivalente
sigma0 = (gammac - gammaw)*(zeq + zm) -> tonf/m^2 // σ'0 en el centro de la capa
sigmaz = (PD + PL)/((Lg + zm)*(Bg + zm)) -> tonf/m^2 // Δσ por el método 2:1 desde la zapata equivalente
Scg = ScCons(Cc, Cr, e0, Hcl, sigma0, sigmaz, OCR*sigma0) -> mm // Consolidación primaria
check Scg <= 50 mm // Asentamiento del grupo ≤ tolerable (EMS)`),
      { type: 'pilegroup', n1: 'n1', n2: 'n2', s: 'sp', D: 'Dp', borde: 'ed', hc: 'hc', Lp: 'Lp', c1: '0.70 m', c2: '0.70 m', d: 'hc - 15 cm', Df: '1.6 m', estratos: '22 Arcilla limosa rígida (cu = 6 t/m²)', titulo: 'Grupo de 3 × 3 pilotes y cabezal' },
      calc(`# Diseño del cabezal (E.060)
fc = 280 kgf/cm^2 // Resistencia del concreto del cabezal
fy = 4200 kgf/cm^2
cc = 0.70 m // Lado de la columna (cuadrada)
dc = hc - 15 cm // Peralte efectivo (pilotes empotrados 10 cm + recubrimiento)
Pu = 1.4*PD + 1.7*PL // Carga última de la columna
Pup = Pu/np + 1.5*(My*xmax/Sx2 + Mx*ymax/Sy2) // Reacción última del pilote más cargado (momentos de sismo/servicio × 1.5)
## Punzonamiento por la columna
boc = 4*(cc + dc) // Perímetro crítico a d/2
Vuc = Pu -> tonf // Cortante de punzonamiento: todos los pilotes quedan fuera del perímetro crítico
check sp - Dp/2 >= (cc + dc)/2 // Los pilotes están fuera del perímetro crítico de la columna
phiVcc = 0.85*1.06*sqrtfc(fc)*boc*dc -> tonf
check Vuc <= phiVcc // Punzonamiento por la columna
## Punzonamiento por un pilote de esquina
bop = pi*(Dp + dc)/4 + 2*ed // Perímetro crítico de esquina (cuarto de círculo + bordes)
phiVcp = 0.85*min(0.27*(20*dc/bop + 2), 1.06)*sqrtfc(fc)*bop*dc -> tonf // αs = 20 (esquina, E.060 Art. 11.12.2.1)
check Pup <= phiVcp // Punzonamiento por el pilote de esquina
## Cortante y flexión (sección en la cara de la columna)
Vud = n2*Pup -> tonf // Fila de pilotes más cargada fuera de la sección a d de la cara (conservador)
phiVc = 0.85*0.53*sqrtfc(fc)*Bc*dc -> tonf
check Vud <= phiVc*max(1, 3.5 - 2.5*(sp - cc/2)/dc) // Cortante (incremento por cabezal corto, E.060 Art. 11.8 / ACI 15.5.3)
Mu = n2*Pup*(sp - cc/2) -> tonf*m // Momento en la cara de la columna
phif = 0.9
As = max(0.85*fc*Bc*dc/fy*(1 - sqrt(1 - 2*Mu/(0.85*phif*fc*Bc*dc^2))), 0.0018*Bc*hc) // Acero inferior en cada dirección
nb = ceil(As/Ab(8)) // Varillas de 1"
sb = rounddown((Bc - 20 cm)/max(nb - 1, 1), 2.5 cm)
check sb <= min(3*hc, 40 cm) // Espaciamiento máximo`),
      summary(),
    ],
  },
  // ------------------------------------------------------------------
  // 10) POTENCIAL DE LICUACIÓN
  // ------------------------------------------------------------------
  {
    id: 'ge-licuacion', pais: 'PE', cat: 'Geotecnia', icon: 'quake',
    name: 'Potencial de licuación por SPT (E.050 Art. 38)',
    normas: E050 + ' (Art. 5.27–5.29, 38) · Youd et al. (2001, NCEER) · Idriss y Boulanger (2008) · Cetin et al. (2004)',
    desc: 'Método simplificado Seed–Idriss/NCEER por profundidad: N60, (N1)60, corrección por finos, rd, CSR, CRR7.5, MSF, FS_L y probabilidad de licuación PL.',
    titulo: 'Evaluación del potencial de licuación de suelos (método simplificado SPT)',
    blocks: [
      text(`# Generalidades
Según la E.050 Art. 38.5.1 el potencial de licuación de suelos granulares sumergidos se evalúa con el **método simplificado de Seed e Idriss** actualizado por el NCEER (Youd et al. 2001). Para cada ensayo SPT bajo el nivel freático:

- Resistencia normalizada: $(N_1)_{60} = C_N N_{60}$, $N_{60} = N\\,C_E C_B C_S C_R$, $C_N = (100\\,\\mathrm{kPa}/\\sigma'_v)^{0.5} \\le 1.7$ (Art. 5.27), corregida por finos a $(N_1)_{60cs}$.
- Demanda sísmica: $CSR = 0.65\\,(a_{max}/g)(\\sigma_v/\\sigma'_v)\\,r_d$ (Art. 5.29).
- Resistencia: $CRR_{7.5}$ (Youd et al. 2001) y $CRR_M = MSF \\cdot K_\\sigma \\cdot CRR_{7.5}$ (Art. 5.28), con la corrección por sobrecarga $K_\\sigma$ de Hynes y Olsen recomendada por Youd et al. (2001).
- Factor de seguridad $FS_L = CRR_M/CSR$ con el mínimo de la Tabla 13A según la categoría E.030, y probabilidad de licuación $P_L$ (Cetin et al. 2004, con su propio $r_d$ función de $V^*_{s,12}$, Art. 38.5.3) que debe ser $\\le 10\\,\\%$ para cimentar (Art. 38.6.2).`),
      { type: 'soilprofile', estratos: '1.5 RELL 1.70 1.85 Relleno arenoso compactado\n4.5 SP 1.85 2.00 Arena pobremente gradada densa\n5.0 SM 1.85 1.95 Arena limosa densa\n4.0 GP 2.00 2.15 Grava arenosa muy densa', nf: '3.0 m', spt: '1.0 14\n2.0 18\n3.0 26\n4.0 25\n5.0 27\n6.0 32\n7.0 32\n8.0 34\n9.0 35\n10.0 37\n11.0 38\n12.0 40\n13.0 42\n14.0 45\n15.0 48', ER: '60', CB: '1.0', CS: '1.0', barra: '1.0 m', zref: '3 m', tabla: true, titulo: 'Perfil estratigráfico, SPT y correcciones (E.050 Art. 5.27)' },
      calc(`# Parámetros sísmicos
amax = 0.30 // Aceleración máxima horizontal en la superficie amax/g (Art. 38.5.4)
Mw = 8.0 // Magnitud momento del sismo de diseño
Dw = 3.0 m // Profundidad del nivel freático (la del perfil)
FSreq = 1.25 // FS_L mínimo según la categoría E.030 [1.25 : A (esencial)|1.15 : B (importante)|1.00 : C (común)]
FC = [10, 10, 10, 8, 6, 6, 6, 18, 20, 20, 22, 22, 5, 5, 5] // Contenido de finos (% < 75 μm) por ensayo
Vs12 = 250 m/s // Velocidad media de ondas de corte en los 12 m superiores V*s,12 (Art. 38.5.3)
# Cálculo por profundidad
z = zSPT // Profundidades de los ensayos
rd = rdYoud(z) // Coeficiente de reducción de esfuerzos (Youd et al. 2001)
CSR = CSRSeed(amax, svSPT, svpSPT, rd) // CSR = 0.65(amax/g)(σv/σ'v)rd (Art. 5.29)
N1 = N160v // (N1)60 (perfil: CN·N60, Art. 5.27)
Ncs = N160cs(N1, FC) // (N1)60cs = α + β(N1)60 (corrección por finos)
CRR = CRR75(Ncs) // CRR7.5 (Youd et al. 2001); N ≥ 30: no licuable
MSF = MSFYoud(Mw) // Factor de escala de magnitud 10^2.24/Mw^2.56
Ks = KsigmaYoud(svpSPT, N1) // Kσ = (σ'v/pa)^(f−1) ≤ 1 por sobrecarga (Hynes y Olsen 1999; Youd et al. 2001)
CRRM = MSF*Ks.*CRR // CRR_M = FSM·Kσ·CRR7.5 (Art. 5.28; Youd et al. 2001)
FSL = FSLiq(CRRM, CSR, z, Dw) // FS_L = CRR_M/CSR (Art. 38.5.8); 3 = no licuable / sobre el NF
rdC = rdCetin(z, amax, Mw, Vs12) // rd de Cetin et al. (2004) con V*s,12
CSReq = CSRSeed(amax, svSPT, svpSPT, rdC) // CSR de Cetin (sin MSF ni Kσ: Mw y σ'v entran en la ecuación de PL)
PL = PLCetin(N1, CSReq, Mw, svpSPT, FC) // Probabilidad de licuación (Cetin et al. 2004, Art. 38.5.6)
@modo corto
PLs = PL.*(z >= Dw) // Solo estratos sumergidos (Art. 38.2 b)
@modo completo
# Verificaciones
FSLmin = min(FSL) // FS_L mínimo del perfil
PLmax = max(PLs) // Probabilidad máxima de licuación
check FSLmin >= FSreq // FS_L ≥ mínimo de la Tabla 13A (E.050 Art. 38.5.8)
check PLmax <= 0.10 // P_L ≤ 10 %: potencial de licuación bajo, se permite cimentar (Art. 38.6.2, Tabla 13)
"Clasificación del potencial de licuación (Tabla 13): $P_L$ máx = {100*PLmax} % → {si(PLmax > 0.5, 4, si(PLmax > 0.1, 3, si(PLmax > 0.05, 2, 1)))} (1 = muy baja, 2 = baja, 3 = moderada, 4 = alta).`),
      { type: 'table', columnas: 'z [m] = z\n(N1)60 = N1\nFC [%] = FC\n(N1)60cs = Ncs\nrd = rd\nCSR = CSR\nCRR7.5 = CRR\nKσ = Ks\nCRR_M = CRRM\nFS_L = FSL\nP_L = PL\nEstado = liqEstado(FSL, FSreq, z, Dw, Ncs)', dec: '3', titulo: 'Evaluación de licuación por ensayo SPT (FS_L = 3 indica no licuable o sobre el NF)' },
      { type: 'liqchart', z: 'z', CSR: 'CSR', CRR: 'CRRM', FS: 'FSL', FSmin: 'FSreq', nf: 'Dw', titulo: 'CSR, CRR_M y factor de seguridad frente a licuación con la profundidad' },
      summary(),
    ],
  },
  // ------------------------------------------------------------------
  // 11) ESTABILIDAD DE TALUDES
  // ------------------------------------------------------------------
  {
    id: 'ge-talud', pais: 'PE', cat: 'Geotecnia', icon: 'soil',
    name: 'Estabilidad de taludes (Fellenius / Bishop)',
    normas: E050 + ' (Art. 30) · Fellenius (1936) · Bishop (1955) · Das cap. 15 · Duncan y Wright (2005)',
    desc: 'Método de dovelas con búsqueda del círculo crítico en malla de centros, estratos, nivel freático y sobrecarga; condición estática (FS ≥ 1.5) y seudoestática (FS ≥ 1.25).',
    titulo: 'Análisis de estabilidad global de talud',
    blocks: [
      text(`# Generalidades
La E.050 Art. 30.2 exige analizar la **estabilidad global** del talud cuando una cimentación se ubica sobre o cerca de él, considerando las cargas de la estructura, con factores de seguridad mínimos de **1.5 en condición estática y 1.25 en condición sísmica** (Art. 30.3).

Se emplea el **método de las dovelas** con superficies de falla circulares: el método ordinario de **Fellenius (1936)**

$$FS = \\frac{\\sum \\left[c\\,l + (W\\cos\\alpha - k_h W \\sin\\alpha - u\\,l)\\tan\\phi\\right]}{\\sum \\left[W \\sin\\alpha + k_h W\\,(y_c - y_g)/R\\right]}$$

y el método simplificado de **Bishop (1955)**, que satisface el equilibrio vertical de cada dovela:

$$FS = \\frac{\\sum \\left[c\\,b + (W - u\\,b)\\tan\\phi\\right]/m_\\alpha}{\\sum \\left[W \\sin\\alpha + k_h W\\,(y_c - y_g)/R\\right]},\\qquad m_\\alpha = \\cos\\alpha + \\frac{\\sin\\alpha \\tan\\phi}{FS}$$

El círculo crítico se busca en una malla de centros, optimizando el radio en cada centro y refinando por búsqueda de patrones. La condición seudoestática aplica una fuerza horizontal $k_h W$ en el centro de gravedad de cada dovela.`),
      calc(`# Parámetros
## Estrato 1: arcilla arenosa (CL)
c1 = 3.5 tonf/m^2 // Cohesión efectiva
phi1 = 29 deg // Ángulo de fricción efectivo
g1 = 1.85 tonf/m^3 // Peso unitario natural
gs1 = 1.95 tonf/m^3 // Peso unitario saturado
## Estrato 2: arena densa (SP), desde la cota 2.0 m
c2 = 0.5 tonf/m^2 // Cohesión efectiva (estrato 2)
phi2 = 33 deg // Ángulo de fricción efectivo (estrato 2)
g2 = 1.95 tonf/m^3 // Peso unitario natural (estrato 2)
gs2 = 2.05 tonf/m^3 // Peso unitario saturado (estrato 2)
## Nivel freático, sobrecarga y sismo
ynf = 3.0 m // Cota del nivel freático
qsc = 2.0 tonf/m^2 // Sobrecarga de la edificación en la corona (E.050 Art. 30.2)
kh = 0.15 // Coeficiente sísmico horizontal (≈ 0.5·amax/g)
"Geometría: talud de 10 m de altura con inclinación 2H:1V entre las abscisas 12 m y 32 m; la edificación (sobrecarga $q$) se ubica entre 2 m y 10 m.`),
      { type: 'slope', superficie: '0 10\n12 10\n32 0\n50 0', estratos: '10 c1 phi1 g1 gs1 Arcilla arenosa (CL)\n2 c2 phi2 g2 gs2 Arena densa (SP)', nf: 'ynf', kh: '0', sobrecarga: '2 10 qsc', malla: '14 36 12 34 10', ybase: '-4', metodo: 'bishop', ndov: '30', unidades: 't', tabla: true, sufijo: 'est', titulo: 'Condición estática — círculo crítico (Bishop simplificado)' },
      { type: 'slope', superficie: '0 10\n12 10\n32 0\n50 0', estratos: '10 c1 phi1 g1 gs1 Arcilla arenosa (CL)\n2 c2 phi2 g2 gs2 Arena densa (SP)', nf: 'ynf', kh: 'kh', sobrecarga: '2 10 qsc', malla: '14 36 12 34 10', ybase: '-4', metodo: 'bishop', ndov: '30', unidades: 't', tabla: false, sufijo: 'sis', titulo: 'Condición seudoestática (kh) — círculo crítico (Bishop simplificado)' },
      calc(`# Resumen de factores de seguridad
FSe = FS_est // FS estático (Bishop)
FSs = FS_sis // FS seudoestático (Bishop)
dFS = FSb_est/FSf_est // Relación Bishop/Fellenius (habitualmente 1.0–1.15)
check FSe >= 1.5 // FS estático ≥ 1.5 (E.050 Art. 30.3)
check FSs >= 1.25 // FS sísmico ≥ 1.25 (E.050 Art. 30.3)
"El método de Fellenius es conservador (desprecia las fuerzas entre dovelas); el de Bishop simplificado es el recomendado para superficies circulares (Duncan y Wright 2005).`),
      summary(),
    ],
  },
  // ------------------------------------------------------------------
  // 12) CORRELACIONES SPT Y PERFIL ESTRATIGRÁFICO
  // ------------------------------------------------------------------
  {
    id: 'ge-spt', pais: 'PE', cat: 'Geotecnia', icon: 'table',
    name: 'Correlaciones SPT y perfil estratigráfico',
    normas: E050 + ' (Art. 5.27, 15, Anexo) · Peck-Hanson-Thornburn (1974) · Hatanaka y Uchida (1996) · Kulhawy y Mayne (1990) · Meyerhof (1965)',
    desc: 'Perfil estratigráfico SUCS con N-SPT y esfuerzos efectivos; N60, (N1)60, φ\', Dr, Es y cu por correlaciones; profundidad mínima de exploración y qadm por asentamiento.',
    titulo: 'Interpretación de ensayos SPT y parámetros geotécnicos',
    blocks: [
      text(`# Generalidades
Se interpreta el sondeo con ensayos de penetración estándar (SPT, NTP 339.133) del Estudio de Mecánica de Suelos. Las correcciones siguen la E.050 Art. 5.27: $N_{60} = N\\,C_E C_B C_S C_R$ con $C_E = ER/60$ y $(N_1)_{60} = C_N N_{60}$, $C_N = (100\\,\\mathrm{kPa}/\\sigma'_v)^{0.5}$. A partir de ellas se estiman parámetros por correlaciones de uso extendido (Das cap. 2; Kulhawy y Mayne 1990): ángulo de fricción, densidad relativa y módulo de elasticidad de arenas, resistencia no drenada de arcillas y la presión neta admisible por asentamiento (Meyerhof 1965). Se verifica también la **profundidad mínima de exploración** $p = D_f + 1.5B$ (E.050 Art. 15).`),
      { type: 'soilprofile', estratos: '0.8 RELL 1.60 1.80 Relleno limoso con restos de ladrillo\n2.2 SM 1.75 1.95 Arena limosa medianamente densa\n4.0 SP 1.85 2.00 Arena pobremente gradada densa\n3.0 GP 2.05 2.15 Grava arenosa muy densa', nf: '4.0 m', spt: '1.0 7\n2.0 10\n3.0 14\n4.0 17\n5.0 22\n6.0 25\n7.0 28\n8.0 36\n9.0 45\n10.0 50', ER: '70', CB: '1.0', CS: '1.0', barra: '1.0 m', zref: '1.5 m', zona: '1.5 4.5', tabla: true, titulo: 'Perfil estratigráfico del sondeo SPT-1' },
      calc(`# Parámetros de diseño
Bz = 2.0 m // Ancho de la cimentación prevista de mayor área
Df = 1.50 m // Profundidad de desplante
pexp = 10.0 m // Profundidad alcanzada por el sondeo
check pexp >= max(Df + 1.5*Bz, 3 m) // Profundidad mínima de exploración p = Df + 1.5B ≥ 3 m (E.050 Art. 15)
check Df >= 0.80 m // Profundidad mínima de cimentación (Art. 26.2)
## Correlaciones en la zona activa (Df a Df + 1.5B)
N60a = N60prom // N60 promedio en la zona activa (perfil)
sigmava = svp_ref + 1.75 tonf/m^3*0.75*Bz -> tonf/m^2 // σ'v a Df + 0.75B (centro de la zona activa, sobre el NF)
N160a = CNLiao(sigmava)*N60a // (N1)60 promedio
phiP = phiPeck(N60a) // φ' = 27.1 + 0.3N60 − 0.00054N60² (Peck et al.)
phiH = phiHatanaka(N160a) // φ' = √(20(N1)60) + 20° (Hatanaka y Uchida)
phiK = phiKulhawy(N60a, sigmava) // φ' = atan[N60/(12.2 + 20.3σ'v/pa)]^0.34 (Kulhawy y Mayne)
phid = min(phiP, phiH, phiK) // Ángulo de fricción de diseño (menor valor)
Dr = DrSPT(N160a) // Densidad relativa √((N1)60/46) (Idriss y Boulanger)
Esa = EsSPT(N60a, 10) -> kgf/cm^2 // Es = 10·pa·N60 (Kulhawy y Mayne, arena NC)
Esb = EsBowles(N60a) -> kgf/cm^2 // Es = 500(N + 15) kPa (Bowles)
ksb = ksEs(min(Esa, Esb), 0.3, Bz) -> kgf/cm^3 // Coeficiente de balasto Es/(B(1 − μ²))
## Presión neta admisible por asentamiento (Meyerhof 1965; Das)
qn25 = qaSPT(N60a, Bz, Df, 25 mm) -> kgf/cm^2 // Presión neta para Se = 25 mm
"Para una arcilla con $N_{60}$ = 8 la resistencia no drenada sería $c_u$ ≈ {cuSPT(8, 5 kPa) -> tonf/m^2} (Stroud 1974) o {cuHara(8) -> tonf/m^2} (Hara et al. 1974).
check phid >= 28 deg // Arena de compacidad media o mayor (φ' ≥ 28°) para apoyar la cimentación
check Dr >= 0.35 // Compacidad: no se cimenta en arena suelta (Dr ≥ 35 %)`),
      { type: 'table', columnas: 'z [m] = zSPT\nN = NSPT\nN60 = N60v\n(N1)60 = N160v\nφ Peck [deg] = phiPeck(N60v)\nφ H-U [deg] = phiHatanaka(N160v)\nφ K-M [deg] = phiKulhawy(N60v, svpSPT)\nDr = DrSPT(N160v)\nEs [kgf/cm^2] = EsSPT(N60v, 10)', dec: '1', titulo: 'Correlaciones por ensayo SPT (válidas para suelos granulares)' },
      summary(),
    ],
  },
];
