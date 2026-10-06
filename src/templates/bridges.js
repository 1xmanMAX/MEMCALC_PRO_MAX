// =====================================================================
//  Plantillas — módulo «bridges» (puentes, AASHTO LRFD / Manual de Puentes MTC 2018)
//  Fuentes, fórmulas y ejemplos de validación: docs/referencias/bridges.md
// =====================================================================
import { calc, text, summary } from './_h.js';

const CAT = 'Puentes';
const NORMAS_PE = 'AASHTO LRFD Bridge Design Specifications 9.ª ed. (2020) · Manual de Puentes MTC (2018) · RNE E.030/E.060 (complementarias)';

// =====================================================================
//  1) PUENTE VIGA-LOSA DE CONCRETO ARMADO (VIGAS T)
// =====================================================================
const vigaT = {
  id: 'br-vigalosa', pais: 'PE', cat: CAT, icon: 'bridge', settings: {},
  name: 'Puente viga-losa de concreto armado (vigas T)',
  normas: NORMAS_PE,
  desc: 'Superestructura simplemente apoyada L = 20 m con 4 vigas T: predimensionamiento, losa del tablero (franjas, voladizo y colisión de barrera), factores de distribución, HL-93, Resistencia I, Servicio I, fatiga, flexión, cortante y deflexión.',
  titulo: 'Diseño de puente viga-losa de concreto armado L = 20.00 m — AASHTO LRFD / MTC 2018',
  blocks: [
    text(`# Generalidades
## Descripción
Puente de un tramo simplemente apoyado de **20.00 m** de luz entre ejes de apoyos, con tablero de concreto armado vaciado in situ sobre **cuatro vigas T** de concreto armado. La calzada de 7.20 m aloja **dos carriles de diseño** y está limitada por barreras de concreto tipo New Jersey (nivel de contención TL-4). Superficie de rodadura de asfalto de 5 cm.

## Normas y referencias
- **AASHTO LRFD Bridge Design Specifications**, 9.ª ed. (2020): Secc. 2 (predimensionamiento, deflexiones), 3 (cargas y combinaciones), 4 (análisis y distribución), 5 (concreto), 13 y Apéndice A13 (barreras).
- **Manual de Puentes**, MTC – Dirección General de Caminos y Ferrocarriles (Perú, 2018): adopta la carga HL-93, los factores de carga y la metodología AASHTO LRFD.
- A. Rodríguez Serquén, *Puentes con AASHTO-LRFD* (Lima, 2020), cap. II–IV (ejemplo de puente viga-losa); R. Barker y J. Puckett, *Design of Highway Bridges: An LRFD Approach*, 3.ª ed., cap. 7.

## Metodología
1. Predimensionamiento (Tabla 2.5.2.6.3-1) y sección transversal.
2. Losa del tablero por el **método aproximado de franjas** (4.6.2.1): franja continua sobre vigas analizada con ruedas móviles y anchos equivalentes; voladizo para Resistencia I y para **colisión de vehículos** (Evento Extremo II, A13.4).
3. Vigas: factores de distribución de carga viva (4.6.2.2), envolventes HL-93 con IM = 33 % (3.6.2), combinaciones Resistencia I, Servicio I y Fatiga I (Tabla 3.4.1-1), diseño a flexión, fisuración, fatiga del refuerzo, cortante por el método simplificado (5.7.3.4.1) y deflexión por carga viva (2.5.2.6.2).

Modificador de cargas $\\eta = \\eta_D\\,\\eta_R\\,\\eta_I = 1.00$ (puente típico, componentes dúctiles y redundantes, 1.3.2).`),
    calc(`# Datos de diseño
## Geometría
L = 20.00 m // Luz de cálculo entre ejes de apoyos
wc = 7.20 m // Ancho de calzada entre caras de barreras
bbar = 0.40 m // Ancho de la barrera en su base
B = wc + 2*bbar // Ancho total del tablero
Nb = 4 // Número de vigas longitudinales
S = 2.10 m // Separación entre ejes de vigas
ta = 0.05 m // Espesor de la carpeta asfáltica
bsup = 0.40 m // Longitud de apoyo (dispositivo de neopreno) en el sentido longitudinal
## Materiales
fc = 280 kgf/cm^2 // Resistencia del concreto f'c [280 kgf/cm^2|315 kgf/cm^2|350 kgf/cm^2]
fy = 4200 kgf/cm^2 // Acero de refuerzo ASTM A615 Gr. 60
Es = 200000 MPa // Módulo de elasticidad del acero (5.4.3.2)
gammac = 2.50 tonf/m^3 // Peso unitario del concreto armado (Tabla 3.5.1-1)
gammaw = 2.25 tonf/m^3 // Peso unitario del asfalto (Tabla 3.5.1-1)
wbar = 0.50 tonf/m // Peso de cada barrera New Jersey (área ≈ 0.20 m²)
Ec = EcLRFD(fc) -> kgf/cm^2 // Módulo de elasticidad del concreto, K1 = 1, wc = 0.145 kcf (5.4.2.4-1)
nmod = Es/Ec // Relación modular
## Carriles de diseño
NL = NLLRFD(wc) // Número de carriles de diseño INT(w/3.60 m) (3.6.1.1.1)
IM = IMLRFD(1) // Incremento por carga dinámica, estados distintos de fatiga (Tabla 3.6.2.1-1)
IMf = IMLRFD(2) // Incremento por carga dinámica para fatiga
# Predimensionamiento
hmin = 0.070*L // Peralte mínimo de vigas T simplemente apoyadas (Tabla 2.5.2.6.3-1)
h = roundup(hmin, 0.05 m) + 0.10 m // Peralte total adoptado (incluye la losa)
tsmin = max((S + 3 m)/30, 175 mm) -> m // Espesor mínimo de losa: (S + 3000)/30 ≥ 165 mm y 175 mm (Tabla 2.5.2.6.3-1, 9.7.1.1)
ts = roundup(tsmin, 0.05 m) // Espesor de la losa adoptado
bw = 0.50 m // Ancho del alma: aloja 6 barras por capa (5.10.3.1)
hv = h - ts // Altura del alma bajo la losa
vol = (B - (Nb - 1)*S)/2 // Longitud del voladizo, desde el eje de la viga exterior
de = vol - bbar // Distancia del eje de la viga exterior a la cara interior de la barrera (4.6.2.2.1)
check de <= 0.91 m // Límite de de para la regla e (−0.30 ≤ de ≤ 1.70 m) y voladizo ≤ 0.91 m (4.6.2.2.1)
check hv >= hmin - ts // Peralte del alma suficiente`),
    { type: 'bridgesec', tipo: 'T', B: 'B', ts: 'ts', nv: 'Nb', S: 'S', hv: 'hv', bw: 'bw', barrera: 'bbar', hbarrera: '0.85', tasf: 'ta', titulo: 'Sección transversal del puente (dimensiones en m)' },
    calc(`# Diseño de la losa del tablero
## Cargas permanentes en la franja transversal de 1 m
wlosa = gammac*ts*1 m // Peso propio de la losa (DC)
wasf = gammaw*ta*1 m // Superficie de rodadura (DW)
Pbar = wbar*1 m // Barrera concentrada a 0.17 m del borde (DC)
## Anchos de franja equivalente (Tabla 4.6.2.1.3-1)
Epos = EposLRFD(S) // Momento positivo: 660 + 0.55 S (mm)
Eneg = EnegLRFD(S) // Momento negativo: 1220 + 0.25 S (mm)
"La franja se analiza como viga continua sobre las vigas, con ruedas de 7.26 t (eje de 14.52 t del camión de diseño) a 1.80 m, a no menos de 0.30 m de la cara de la barrera (3.6.1.3.1). Para luces transversales ≤ 4.60 m solo se consideran los ejes del camión, sin carga de carril (3.6.1.3.3). Se evalúan uno ($m$ = 1.20) y dos camiones ($m$ = 1.00, ruedas adyacentes a 1.20 m).`),
    { type: 'hl93env', tramos: 'vol, S, S, S, vol', apoyos: 'L A A A A L', vehiculo: 'Ejes', ejes: '7.26 0; 7.26 1.8', IM: 'IM', g: 'mpLRFD(1)', carril: '0', xmin: 'bbar + 0.30 m', xmax: 'B - bbar - 0.30 m', DC: 'U * wlosa\nP 0.17 Pbar\nP B-0.17m Pbar', DW: 'UP bbar B-bbar wasf', gLL: '1.75', sufijo: '1', titulo: 'Franja transversal de losa: un camión (m = 1.20), cargas DC y DW' },
    { type: 'hl93env', tramos: 'vol, S, S, S, vol', apoyos: 'L A A A A L', vehiculo: 'Ejes', ejes: '7.26 0; 7.26 1.8; 7.26 3.0; 7.26 4.8', IM: 'IM', g: 'mpLRFD(2)', carril: '0', xmin: 'bbar + 0.30 m', xmax: 'B - bbar - 0.30 m', sufijo: '2', titulo: 'Franja transversal de losa: dos camiones adyacentes (m = 1.00)' },
    calc(`## Momentos de diseño de la losa (por metro de ancho)
MLLpos = max(MLLp1, MLLp2)/Epos -> tonf*m/m // M⁺ por carga viva + IM en la franja positiva
MLLneg = min(MLLn1, MLLn2)/Eneg -> tonf*m/m // M⁻ por carga viva + IM sobre vigas interiores
MDCpos = MDCp1/(1 m) -> tonf*m/m // M⁺ máximo por DC
MDWpos = MDWp1/(1 m) -> tonf*m/m // M⁺ máximo por DW
MDCneg = MDCn1/(1 m) -> tonf*m/m // M⁻ máximo por DC
MDWneg = MDWn1/(1 m) -> tonf*m/m // M⁻ máximo por DW
Mupos = 1.25*MDCpos + 1.50*MDWpos + 1.75*MLLpos // Resistencia I (Tabla 3.4.1-1), M⁺
Muneg = 1.25*abs(MDCneg) + 1.50*abs(MDWneg) + 1.75*abs(MLLneg) // Resistencia I, M⁻ (máximos simultáneos, conservador)
## Refuerzo de la losa
barL = 5 // Varilla principal de la losa [4 : 1/2"|5 : 5/8"|6 : 3/4"]
rinf = 2.5 cm // Recubrimiento inferior (Tabla 5.10.1-1)
rsup = 5.0 cm // Recubrimiento superior, superficie expuesta (Tabla 5.10.1-1)
dpos = ts - rinf - db(barL)/2 // Peralte efectivo para M⁺
dneg = ts - rsup - db(barL)/2 // Peralte efectivo para M⁻
phif = 0.90 // Flexión, sección controlada por tracción (5.5.4.2)
Asp = 0.85*fc*100 cm/fy*(dpos - sqrt(dpos^2 - 2*Mupos*1 m/(0.85*phif*fc*100 cm))) // Acero requerido M⁺ por metro
spos = rounddown(min(Ab(barL)*100 cm/Asp, 1.5*ts, 45 cm), 2.5 cm) // Espaciamiento (máx. 1.5 ts ≤ 450 mm, 5.10.3.2)
Asn = 0.85*fc*100 cm/fy*(dneg - sqrt(dneg^2 - 2*Muneg*1 m/(0.85*phif*fc*100 cm))) // Acero requerido M⁻ por metro
sneg = rounddown(min(Ab(barL)*100 cm/Asn, 1.5*ts, 45 cm), 2.5 cm) // Espaciamiento del acero superior
phiMpos = phif*Ab(barL)*100 cm/spos*fy*(dpos - Ab(barL)*100 cm/spos*fy/(2*0.85*fc*100 cm))/(1 m) -> tonf*m/m
check Mupos <= phiMpos // Flexión positiva de la losa
phiMneg = phif*Ab(barL)*100 cm/sneg*fy*(dneg - Ab(barL)*100 cm/sneg*fy/(2*0.85*fc*100 cm))/(1 m) -> tonf*m/m
check Muneg <= phiMneg // Flexión negativa de la losa
frL = frLRFD(fc) -> kgf/cm^2 // Módulo de rotura 0.24√f'c ksi (5.4.2.6)
McrL = 1.6*0.67*frL*100 cm*ts^2/6/(1 m) -> tonf*m/m // γ3·γ1·fr·S (γ1 = 1.6, γ3 = 0.67) (5.6.3.3)
check phiMpos >= min(McrL, 1.33*Mupos) // Refuerzo mínimo M⁺ (5.6.3.3)
check phiMneg >= min(McrL, 1.33*Muneg) // Refuerzo mínimo M⁻ (5.6.3.3)
pdist = min(3840/sqrt((S - bw)/(1 mm)), 67)/100 // Refuerzo de distribución: 3840/√S ≤ 67 % (9.7.3.2)
Asdist = pdist*Ab(barL)*100 cm/spos // Acero de distribución inferior, longitudinal
sdist = rounddown(min(Ab(4)*100 cm/Asdist, 45 cm), 2.5 cm) // Espaciamiento de varillas #4
Astem = max(0.75*(B/(1 mm))*(ts/(1 mm))/(2*((B + ts)/(1 mm))*fy/(1 MPa))*1 mm^2/mm, 0.233 mm^2/mm) -> cm^2/m // Temperatura 0.75bh/[2(b+h)fy] ≥ 0.233 mm²/mm (5.10.6)
stem = rounddown(min(Ab(3)/Astem, 3*ts, 45 cm), 2.5 cm) // Varillas #3 de temperatura (superior, longitudinal)
"Losa: #{barL} @ {spos} inferior transversal, #{barL} @ {sneg} superior transversal, #4 @ {sdist} de distribución y #3 @ {stem} de temperatura.
## Voladizo — Resistencia I (cara del alma de la viga exterior)
Xv = vol - bw/2 // Longitud del voladizo hasta la cara del alma
MDCv = wlosa*Xv^2/2 + Pbar*(Xv - 0.17 m) -> tonf*m // Losa + barrera
MDWv = wasf*max(Xv - bbar, 0 m)^2/2 -> tonf*m // Asfalto
xLL = max(Xv - bbar - 0.30 m, 0 m) // Brazo de la carga lineal de 1.49 t/m a 0.30 m de la barrera (3.6.1.3.4)
MLLv = 1.2*1.49 tonf/m*1 m*xLL*(1 + IM) -> tonf*m // Carga lineal 14.6 N/mm × m × (1 + IM)
Muv = (1.25*MDCv + 1.50*MDWv + 1.75*MLLv)/(1 m) -> tonf*m/m // Resistencia I en el voladizo
## Voladizo — Evento Extremo II: colisión sobre la barrera (A13.4.1, caso 1)
Ft = 24.5 tonf // Fuerza transversal TL-4 (240 kN) [24.5 tonf : TL-4 (240 kN)|12.2 tonf : TL-2 (120 kN)|53.4 tonf : TL-5 (550 kN)]
Lt = 1.07 m // Longitud de distribución de Ft (Tabla A13.2-1)
Hb = 0.85 m // Altura de la barrera
Mc = 6.00 tonf*m/m // Resistencia a flexión de la barrera alrededor del eje horizontal (diseño de la barrera)
Mw = 3.00 tonf*m/m // Resistencia a flexión de la barrera alrededor del eje vertical, por metro de altura
Mb = 0 tonf*m // Resistencia de la viga superior (no hay)
Lc = Lt/2 + sqrt((Lt/2)^2 + 8*Hb*(Mb + Mw*Hb)/Mc) // Longitud crítica del mecanismo de líneas de fluencia (A13.3.1-2)
Rw = 2/(2*Lc - Lt)*(8*Mb + 8*Mw*Hb + Mc*Lc^2/Hb) -> tonf // Resistencia transversal de la barrera (A13.3.1-1)
check Ft <= Rw // La barrera resiste la colisión (A13.3.1)
Tcol = Rw/(Lc + 2*Hb) -> tonf/m // Tracción en el voladizo (A13.4.2-1)
Mcol = Mc + MDCv/(1 m) -> tonf*m/m // Momento en la base de la barrera + peso propio (γ = 1.0)
sv = 12.5 cm // Espaciamiento del acero superior en el voladizo (se reduce respecto al tramo)
Asv = Ab(barL)*100 cm/sv // Acero superior colocado en el voladizo por metro
Cv = Asv*fy - Tcol*1 m // Compresión en el concreto tras descontar la tracción
av = Cv/(0.85*fc*100 cm) // Profundidad del bloque comprimido
Mnv = (Asv*fy*(dneg - ts/2) + Cv*(ts/2 - av/2))/(1 m) -> tonf*m/m // Momento nominal respecto al eje medio con tracción axial
check Mcol <= 1.0*Mnv // Colisión, φ = 1.0 en Evento Extremo (1.3.2.1, A13.4.2)
check Muv <= phif*Mnv // Resistencia I en el voladizo`),
    calc(`# Vigas — cargas permanentes
## Viga interior
wDCi = gammac*(S*ts + bw*hv) + 2*wbar/Nb -> tonf/m // Losa + alma + barreras repartidas por igual (4.6.2.2.1)
Pdiaf = gammac*0.25 m*(hv - 0.20 m)*(S - bw) -> tonf // Diafragma intermedio en el centro de la luz (b = 0.25 m)
wDWi = gammaw*ta*S -> tonf/m // Asfalto (ancho tributario)
MDCi = wDCi*L^2/8 + Pdiaf*L/4 -> tonf*m // Momento DC en el centro de la luz
MDWi = wDWi*L^2/8 -> tonf*m // Momento DW en el centro de la luz
## Viga exterior
wDCe = gammac*((vol + S/2)*ts + bw*hv) + 2*wbar/Nb -> tonf/m // Ancho tributario vol + S/2
wDWe = gammaw*ta*(de + S/2) -> tonf/m // Asfalto sobre la viga exterior
MDCe = wDCe*L^2/8 + Pdiaf/2*L/4 -> tonf*m
MDWe = wDWe*L^2/8 -> tonf*m
# Factores de distribución de carga viva (4.6.2.2)
## Parámetro de rigidez longitudinal
nvl = 1 // Relación de módulos viga/losa (mismo concreto)
Iv = bw*hv^3/12 -> m^4 // Inercia del alma (viga sin losa)
Av = bw*hv -> m^2 // Área del alma
eg = hv/2 + ts/2 // Distancia entre centroides de la viga y de la losa
Kg = nvl*(Iv + Av*eg^2) -> m^4 // Kg = n(I + A eg²) (4.6.2.2.1-1)
check S >= 1.10 m and S <= 4.90 m // Rango de aplicación 1100 ≤ S ≤ 4900 mm (Tabla 4.6.2.2.2b-1)
check L >= 6 m and L <= 73 m // 6000 ≤ L ≤ 73000 mm
check ts >= 110 mm and ts <= 300 mm // 110 ≤ ts ≤ 300 mm
check Kg >= 4e9 mm^4 and Kg <= 3e12 mm^4 // 4×10⁹ ≤ Kg ≤ 3×10¹² mm⁴
check Nb >= 4 // Nb ≥ 4
## Viga interior
gM1 = gMi1LRFD(S, L, ts, Kg) // Momento, un carril cargado (incluye m)
gM2 = gMi2LRFD(S, L, ts, Kg) // Momento, dos o más carriles
gMi = max(gM1, gM2) // Factor de momento, viga interior
gV1 = gVi1LRFD(S) // Cortante, un carril (Tabla 4.6.2.2.3a-1)
gV2 = gVi2LRFD(S) // Cortante, dos o más carriles
gVi = max(gV1, gV2) // Factor de cortante, viga interior
## Viga exterior
Rlev = leverLRFD(S, de) // Regla de la palanca, un carril (rueda a 0.60 m de la barrera)
gMe1 = mpLRFD(1)*Rlev // Un carril, con m = 1.20 (Tabla 4.6.2.2.2d-1)
gMe2 = eMLRFD(de)*gM2 // Dos carriles: e = 0.77 + de/2800
gVe2 = eVLRFD(de)*gV2 // Cortante dos carriles: e = 0.6 + de/3000 (Tabla 4.6.2.2.3b-1)
xext = (Nb - 1)*S/2 // Distancia del eje del puente a la viga exterior
sumx2 = 2*((S/2)^2 + (3*S/2)^2) // Σx² de las vigas (Nb = 4)
e1 = B/2 - bbar - 0.60 m - 0.90 m // Excentricidad del primer camión (ruedas a 0.60 m de la barrera)
e2 = e1 - 3.60 m // Excentricidad del segundo camión (carril adyacente)
Rr1 = mpLRFD(1)*(1/Nb + xext*e1/sumx2) // Sección rígida, un carril (4.6.2.2.2d-1)
Rr2 = mpLRFD(2)*(2/Nb + xext*(e1 + e2)/sumx2) // Sección rígida, dos carriles
gMe = max(gMe1, gMe2, Rr1, Rr2) // Factor de momento, viga exterior
gVe = max(gMe1, gVe2, Rr1, Rr2) // Factor de cortante, viga exterior
gfat = gM1/mpLRFD(1) // Fatiga: un carril, sin factor de presencia múltiple (3.6.1.1.2)
# Carga viva vehicular HL-93 por carril
xv = bsup/2 + 0.72*h // Sección crítica por cortante a dv de la cara del apoyo (dv ≥ 0.72h, 5.7.3.2)`),
    { type: 'hl93env', tramos: 'L', apoyos: 'A A', vehiculo: 'HL-93', IM: 'IM', g: '1', secciones: 'xv', titulo: 'Envolventes HL-93 por carril (camión o tándem con IM + carril)' },
    calc(`## Solicitaciones por carga viva en las vigas
MLLi = gMi*MLLp // M LL+IM, viga interior
MLLe = gMe*MLLp // M LL+IM, viga exterior
Mf = 1.75*gfat*MfatLRFD(L)*(1 + IMf) -> tonf*m // Fatiga I: γ = 1.75, camión con ejes a 9.0 m (Tabla 3.4.1-1, 3.6.1.4)
## Combinaciones de carga (Tabla 3.4.1-1), η = 1.00
Mui = 1.25*MDCi + 1.50*MDWi + 1.75*MLLi // Resistencia I, viga interior
Mue = 1.25*MDCe + 1.50*MDWe + 1.75*MLLe // Resistencia I, viga exterior
Mu = max(Mui, Mue) // Momento de diseño (ambas vigas con igual refuerzo)
Msi = MDCi + MDWi + MLLi // Servicio I, viga interior
Mse = MDCe + MDWe + MLLe // Servicio I, viga exterior
Ms = max(Msi, Mse)
# Diseño de las vigas a flexión
## Refuerzo longitudinal
bar = 8 // Varilla longitudinal [8 : 1"|9 : 1 1/8"|10 : 1 1/4"]
est = 4 // Estribo [3 : 3/8"|4 : 1/2"]
rec = 5.0 cm // Recubrimiento libre al estribo (Tabla 5.10.1-1)
sl = max(1.5*db(bar), 3.8 cm, 1.5*2.54 cm) // Separación libre mínima: 1.5 db, 1.5 TMA (1"), 38 mm (5.10.3.1.1)
nmax = rounddown((bw - 2*rec - 2*db(est) + sl)/(db(bar) + sl), 1) // Barras por capa que caben en el alma
nb = 18 // Número de barras adoptado
ncap = roundup(nb/nmax, 1) // Número de capas
sv2 = max(2.5 cm, db(bar)) // Separación libre entre capas (5.10.3.1.3)
ycg = rec + db(est) + db(bar)/2 + (ncap - 1)*(db(bar) + sv2)/2 // Centroide del acero (capas iguales)
d = h - ycg // Peralte efectivo
dt = h - rec - db(est) - db(bar)/2 // Peralte a la capa extrema en tracción
beff = S // Ancho efectivo del ala: ancho tributario (4.6.2.6.1)
As = nb*Ab(bar) // Acero colocado
a = As*fy/(0.85*fc*beff) // Bloque de compresión (α1 = 0.85)
check a <= ts // El bloque queda dentro del ala: sección rectangular (5.6.3.2.3)
beta1 = beta1LRFD(fc) // Factor β1 (5.6.2.2)
c = a/beta1 // Profundidad del eje neutro
epst = 0.003*(dt - c)/c // Deformación neta en el acero extremo
check epst >= 0.005 // Sección controlada por tracción, φ = 0.90 (5.5.4.2)
phiMn = phif*As*fy*(d - a/2) -> tonf*m // Resistencia de diseño a flexión
check Mu <= phiMn // Resistencia I a flexión (5.6.3.2)
## Refuerzo mínimo (5.6.3.3)
At = beff*ts + bw*hv // Área de la sección T bruta
yt = (beff*ts^2/2 + bw*hv*(ts + hv/2))/At // Centroide desde la fibra superior
Ig = beff*ts^3/12 + beff*ts*(yt - ts/2)^2 + bw*hv^3/12 + bw*hv*(ts + hv/2 - yt)^2 -> m^4 // Inercia bruta de la sección T
Sb = Ig/(h - yt) -> m^3 // Módulo resistente de la fibra inferior
fr = frLRFD(fc) -> kgf/cm^2 // Módulo de rotura
Mcr = 0.67*1.6*fr*Sb -> tonf*m // Mcr = γ3·γ1·fr·Sc
check phiMn >= min(Mcr, 1.33*Mu) // Acero mínimo
## Servicio I — control de fisuración (5.6.7)
xr = (-nmod*As + sqrt((nmod*As)^2 + 2*beff*nmod*As*d))/beff // Eje neutro fisurado si cae en el ala (sección rectangular)
kT = ts*(beff - bw) + nmod*As // Coeficiente auxiliar de la sección T fisurada
xT = (-kT + sqrt(kT^2 + 2*bw*((beff - bw)*ts^2/2 + nmod*As*d)))/bw // Eje neutro fisurado en el alma (sección T)
x = si(xr <= ts, xr, xT) // Eje neutro de la sección fisurada transformada
xo = max(x - ts, 0 m) // Parte comprimida del alma bajo el ala
Cf1 = beff*x^2/2 // Volumen de esfuerzos del rectángulo b·x (por unidad de σ0/x)
Cf2 = (beff - bw)*xo^2/2 // Volumen a descontar bajo el ala
ycomp = (Cf1*x/3 - Cf2*(ts + xo/3))/(Cf1 - Cf2) // Posición de la resultante de compresión
jd = d - ycomp // Brazo de palanca elástico
fss = min(Ms/(As*jd), 0.60*fy) -> kgf/cm^2 // Esfuerzo de tracción en servicio, sin exceder 0.6 fy (5.6.7)
dc = rec + db(est) + db(bar)/2 // Recubrimiento al centro de la barra extrema
betas = 1 + dc/(0.7*(h - dc)) // βs (5.6.7-2)
sbar = (bw - 2*rec - 2*db(est) - db(bar))/(nmax - 1) // Separación entre ejes de barras de una capa
smaxf = 123000*1.00/(betas*fss/(1 MPa))*1 mm - 2*dc -> cm // Espaciamiento máximo, exposición clase 1 (γe = 1.00)
check sbar <= smaxf // Control de fisuración
Ask = 0.001*(d/(1 mm) - 760)*1 mm^2/mm -> cm^2/m // Refuerzo de piel por cara si de > 900 mm (5.6.7-3)
nsk = roundup(Ask*d/2/Ab(4), 1) // Varillas #4 por cara en la mitad traccionada del alma
"Refuerzo de piel: {nsk} varillas #4 por cara, distribuidas en la mitad inferior del alma (≤ d/6 y 300 mm).
## Fatiga del refuerzo (5.5.3.2)
fminf = (MDCi + MDWi)/(As*jd) -> kgf/cm^2 // Esfuerzo mínimo (permanente) en el acero
Dff = Mf/(As*jd) -> kgf/cm^2 // Rango de esfuerzos por Fatiga I
DFTH = 26 ksi - 22*fminf/fy*(1 ksi) -> kgf/cm^2 // Umbral (ΔF)TH = 26 − 22 fmin/fy (ksi) (5.5.3.2-1)
check Dff <= DFTH // Fatiga del acero de refuerzo
# Diseño de las vigas a cortante (método simplificado, 5.7.3.4.1)
dv = max(d - a/2, 0.9*d, 0.72*h) // Peralte efectivo de corte (5.7.2.8)
xcr = bsup/2 + dv // Sección crítica real (xv ≤ xcr: se usan los cortantes en xv, conservador)
VDCi = wDCi*(L/2 - xv) + Pdiaf/2 -> tonf // Cortante DC en xv
VDWi = wDWi*(L/2 - xv) -> tonf
VDCe = wDCe*(L/2 - xv) + Pdiaf/4 -> tonf
VDWe = wDWe*(L/2 - xv) -> tonf
Vui = 1.25*VDCi + 1.50*VDWi + 1.75*gVi*VLLx1 // Resistencia I, viga interior
Vue = 1.25*VDCe + 1.50*VDWe + 1.75*gVe*VLLx1 // Resistencia I, viga exterior
Vu = max(Vui, Vue) -> tonf // Cortante de diseño
phiv = 0.90 // Cortante (5.5.4.2)
betav = 2.0 // β simplificado, sección no presforzada con refuerzo mínimo (5.7.3.4.1)
Vc = 0.083*betav*sqrtMPa(fc)*bw*dv -> tonf // Vc = 0.083β√f'c bv dv (MPa)
Avs = 2*Ab(est) // Estribo cerrado de 2 ramas
Vsr = max(Vu/phiv - Vc, 0 tonf) // Resistencia requerida del refuerzo
s1 = si(Vsr > 0 tonf, Avs*fy*dv/Vsr, 60 cm) // Espaciamiento por resistencia (θ = 45°)
vu = Vu/(phiv*bw*dv) -> kgf/cm^2 // Esfuerzo cortante (5.7.2.8-1)
smaxv = si(vu < 0.125*fc, min(0.8*dv, 60 cm), min(0.4*dv, 30 cm)) // Espaciamiento máximo (5.7.2.6)
sest = rounddown(min(s1, smaxv), 2.5 cm) // Espaciamiento adoptado en el apoyo
Vs = Avs*fy*dv/sest -> tonf // Resistencia del refuerzo transversal (5.7.3.3-4)
Vn = min(Vc + Vs, 0.25*fc*bw*dv) -> tonf // Resistencia nominal (5.7.3.3-1, -2)
check Vu <= phiv*Vn // Resistencia a cortante
Avmin = 0.083*sqrtMPa(fc)*bw*sest/fy -> cm^2 // Refuerzo transversal mínimo (5.7.2.5-1)
check Avs >= Avmin // Área mínima de estribos
Mux = 1.25*(wDCi*xv*(L - xv)/2) + 1.50*(wDWi*xv*(L - xv)/2) + 1.75*gMi*MLLx1 -> tonf*m // Momento concomitante en xv
check 0.5*As*fy >= Mux/(dv*phif) + (Vu/phiv - 0.5*Vs) // Acero longitudinal en el apoyo (50 % de As prolongado) (5.7.3.5-1, cot θ = 1)
"Estribos #{est} de 2 ramas @ {sest} en la zona de apoyo; el espaciamiento puede aumentarse hacia el centro de la luz hasta {rounddown(smaxv, 2.5 cm)}.
# Deflexión por carga viva (2.5.2.6.2)
mdef = mpLRFD(NL) // Todos los carriles cargados, todas las vigas con igual deflexión
DFd = NL*mdef/Nb // Factor de distribución para deflexión
Ma = Msi // Momento de servicio de la viga interior
Icr = beff*x^3/3 - (beff - bw)*xo^3/3 + nmod*As*(d - x)^2 -> m^4 // Inercia fisurada de la sección T
Ie = min((Mcr/Ma)^3*Ig + (1 - (Mcr/Ma)^3)*Icr, Ig) -> m^4 // Inercia efectiva (5.6.3.5.2)
EIv = Ec*Ie -> tonf*m^2
a1 = L/2 - 4.30 m // Posición del eje delantero (3.63 t) con el eje central en L/2
d1 = 14.52 tonf*L^3/(48*EIv) + (14.52 tonf + 3.63 tonf)*a1*(3*L^2 - 4*a1^2)/(48*EIv) -> mm // Camión: ejes a L/2 y L/2 ± 4.30 m
d2 = 0.25*d1 + 5*0.952 tonf/m*L^4/(384*EIv) -> mm // 25 % del camión + carril (3.6.1.3.2)
DeltaLL = DFd*(1 + IM)*max(d1, d2/(1 + IM)) -> mm // Deflexión por viga (IM no se aplica al carril)
check DeltaLL <= L/800 // Límite L/800 para carga vehicular (2.5.2.6.2)`),
    text(`> **Notas.** (1) El momento negativo de la losa se toma en el eje de las vigas (conservador respecto a la sección de diseño de 4.6.2.1.6). (2) El diseño de la barrera (Mc, Mw) debe justificarse con su propio cálculo de líneas de fluencia; los valores adoptados corresponden a una barrera New Jersey de 0.85 m con varillas #4 @ 0.20 m. (3) Verificar adicionalmente los dispositivos de apoyo, la longitud de apoyo $N$ (4.7.4.4) y el diseño de los estribos.`),
    summary(),
  ],
};


// =====================================================================
//  2) VIGA PRETENSADA AASHTO TIPO IV (unidades inglesas)
// =====================================================================
const presf = {
  id: 'br-presforzada', pais: 'US', cat: CAT, icon: 'bridge', settings: { sys: 'us' },
  name: 'Viga de concreto presforzado AASHTO Tipo IV (pretensada)',
  normas: 'AASHTO LRFD Bridge Design Specifications 9.ª ed. (2020), Secc. 3, 4 y 5 · PCI Bridge Design Manual (2014)',
  desc: 'Viga interior pretensada AASHTO Tipo IV compuesta con losa, L = 100 ft: propiedades, factores de distribución, pérdidas aproximadas (5.9.3), esfuerzos en transferencia y servicio (5.9.2.3), resistencia a flexión con fps, refuerzo mínimo, cortante (MCFT) y deflexión.',
  titulo: 'Diseño de viga pretensada AASHTO Tipo IV compuesta — AASHTO LRFD',
  blocks: [
    text(`# Generalidades
## Descripción
Viga **interior** de un puente de un tramo simplemente apoyado de 100 ft, con seis vigas pretensadas **AASHTO Tipo IV** separadas 8.0 ft y losa de concreto armado de 8 in vaciada in situ que trabaja en sección compuesta. El presfuerzo consiste en 30 torones de 0.6 in, grado 270, de baja relajación; parte de ellos se desvían (*harped*) para controlar los esfuerzos en los extremos.

## Normas y referencias
- AASHTO LRFD Bridge Design Specifications, 9.ª ed. (2020): 3.6 (HL-93), 4.6.2.2 (distribución), 5.4 (materiales), 5.9.2 (límites de esfuerzos), 5.9.3 (pérdidas), 5.6.3 (flexión), 5.7.3 (cortante, método general).
- PCI Bridge Design Manual, 3.ª ed. (2014), cap. 8 y ejemplos 9.1–9.4; FHWA, *LRFD Design Example for Prestressed Concrete Girder Superstructure Bridge* (2003/2015).
- Barker & Puckett, *Design of Highway Bridges*, cap. 7; Rodríguez Serquén, *Puentes con AASHTO-LRFD*, cap. VI.

## Convenciones
Esfuerzos de **compresión positivos**. Etapas: (1) transferencia, viga sola con peso propio; (2) servicio, viga + losa (sección simple) y cargas sobreimpuestas + carga viva (sección compuesta).`),
    calc(`# Datos
## Geometría del puente
L = 100 ft // Luz de cálculo (eje a eje de apoyos)
S = 8.0 ft // Separación entre vigas
Nb = 6 // Número de vigas
wcc = 44 ft // Ancho de calzada entre barreras
ts = 8.0 in // Espesor de la losa
hh = 0.5 in // Espesor del acartelamiento (solo carga)
## Viga AASHTO Tipo IV (PCI BDM Tabla 8.10.1-1)
h = 54 in // Peralte de la viga
Ag = 789 in^2 // Área
Ig = 260730 in^4 // Momento de inercia
yb = 24.73 in // Centroide desde la fibra inferior
bw = 8 in // Ancho del alma
btf = 20 in // Ancho del ala superior
## Materiales
fci = 5.5 ksi // f'ci del concreto de la viga en la transferencia
fc = 7.0 ksi // f'c del concreto de la viga [6.0 ksi|7.0 ksi|8.0 ksi]
fcd = 4.0 ksi // f'c de la losa
gammac = 0.150 kip/ft^3 // Peso unitario del concreto (Tabla 3.5.1-1)
fpu = 270 ksi // Torón grado 270, baja relajación (5.4.4.1)
fpy = 0.90*fpu // Fluencia del torón de baja relajación
Ep = 28500 ksi // Módulo del acero de presfuerzo (5.4.4.2)
Es = 29000 ksi // Módulo del acero de refuerzo
fy = 60 ksi // Refuerzo pasivo Gr. 60
Eci = EcLRFD(fci, gammac) // Módulo en la transferencia (5.4.2.4-1)
Ec = EcLRFD(fc, gammac) // Módulo de la viga
Ecd = EcLRFD(fcd, gammac) // Módulo de la losa
## Presfuerzo
Ns = 30 // Número de torones de 0.6 in
Ap1 = 0.217 in^2 // Área de un torón de 0.6 in
dbs = 0.6 in // Diámetro del torón
Aps = Ns*Ap1 // Área total de presfuerzo
fpj = 0.75*fpu // Esfuerzo de tensado (Tabla 5.9.2.2-1: ≤ 0.75 fpu)
ybsm = 4.0 in // Centroide de torones desde la base, en el centro de la luz
ybse = 10.0 in // Centroide de torones en el extremo (torones desviados)
em = yb - ybsm // Excentricidad en el centro de la luz
ee = yb - ybse // Excentricidad en el extremo
H = 70 // Humedad relativa media anual (%) (Fig. 5.4.2.3.3-1)
# Propiedades de la sección
St = Ig/(h - yb) // Módulo resistente superior, viga sola
Sb = Ig/yb // Módulo resistente inferior, viga sola
beff = S // Ancho efectivo de losa: ancho tributario (4.6.2.6.1)
nd = Ecd/Ec // Relación modular losa/viga
btr = nd*beff // Ancho transformado de la losa
Ad = btr*ts // Área transformada de la losa
ydk = h + hh + ts/2 // Centroide de la losa desde la base de la viga
Ac = Ag + Ad // Área compuesta
ybc = (Ag*yb + Ad*ydk)/Ac -> in // Centroide de la sección compuesta
Ic = Ig + Ag*(ybc - yb)^2 + btr*ts^3/12 + Ad*(ydk - ybc)^2 -> in^4 // Inercia compuesta
Sbc = Ic/ybc // Módulo inferior de la viga, sección compuesta
Stc = Ic/(h - ybc) // Módulo superior de la viga, sección compuesta
Sdk = Ic/(h + hh + ts - ybc)/nd // Módulo de la fibra superior de la losa (en esfuerzos de losa)
# Cargas y momentos (viga interior)
wg = gammac*Ag -> kip/ft // Peso propio de la viga (DC1)
ws = gammac*(S*ts + btf*hh) -> kip/ft // Losa y acartelamiento (DC1)
wb = 2*0.40 kip/ft/Nb // Barreras de 0.40 kip/ft repartidas entre las vigas (DC2, 4.6.2.2.1)
ww = 0.025 kip/ft^2*wcc/Nb // Superficie de rodadura futura 25 psf (DW)
Mg = wg*L^2/8 -> kip*ft // Momento por peso propio en L/2
Ms = ws*L^2/8 -> kip*ft // Momento por losa en L/2
Mb = wb*L^2/8 -> kip*ft // Momento por barreras en L/2
Mw = ww*L^2/8 -> kip*ft // Momento por superficie de rodadura en L/2
# Factores de distribución (4.6.2.2, tipo k)
nvl = Ec/Ecd // n = EB/ED
egk = h - yb + hh + ts/2 // Distancia entre centroides de viga y losa
Kg = nvl*(Ig + Ag*egk^2) -> in^4 // Kg = n(I + A eg²) (4.6.2.2.1-1)
check S >= 3.5 ft and S <= 16 ft and L >= 20 ft and L <= 240 ft // Rango de aplicación (Tabla 4.6.2.2.2b-1)
check Kg >= 10000 in^4 and Kg <= 7000000 in^4 // 10 000 ≤ Kg ≤ 7 000 000 in⁴
NL = NLLRFD(wcc) // Número de carriles de diseño
gM = max(gMi1LRFD(S, L, ts, Kg), gMi2LRFD(S, L, ts, Kg)) // Momento, viga interior
gV = max(gVi1LRFD(S), gVi2LRFD(S)) // Cortante, viga interior
hc = h + hh + ts // Peralte de la sección compuesta
xv = 0.72*hc + 9 in // Sección de cortante: dv ≥ 0.72 h desde la cara del apoyo (apoyo de 18 in)`),
    { type: 'bridgesec', tipo: 'I', B: 'wcc + 2*1.5 ft', ts: 'ts', nv: 'Nb', S: 'S', hv: 'h + hh', bw: 'bw', bf: '26 in', tf: '8 in', barrera: '1.5 ft', hbarrera: '32 in', tasf: '0', titulo: 'Sección transversal: seis vigas AASHTO Tipo IV @ 8.0 ft, losa de 8 in' },
    { type: 'hl93env', tramos: 'L', apoyos: 'A A', vehiculo: 'HL-93', IM: 'IMLRFD(1)', g: 'gM', secciones: 'xv', titulo: 'Envolventes HL-93 × gM en la viga interior (IM = 33 %, carril sin IM)' },
    calc(`MLL = MLLp // Momento LL+IM máximo en la viga interior (distribuido)
# Pérdidas de presfuerzo (5.9.3)
## Acortamiento elástico (C5.9.3.2.3a-1, forma cerrada)
fpbt = fpj // Esfuerzo antes de la transferencia (se desprecia la relajación previa)
dfpES = (Aps*fpbt*(Ig + em^2*Ag) - em*Mg*Ag)/(Aps*(Ig + em^2*Ag) + Ag*Ig*Eci/Ep) -> ksi // ΔfpES
Pi = Aps*(fpj - dfpES) -> kip // Fuerza de presfuerzo inmediatamente después de la transferencia
fcgp = Pi/Ag + Pi*em^2/Ig - Mg*em/Ig -> ksi // Esfuerzo en el centroide de torones (comprobación)
dfpESc = dfpESLRFD(Ep, Eci, fcgp) -> ksi // ΔfpES = (Ep/Eci)·fcgp (5.9.3.2.3a-1)
## Pérdidas diferidas — método aproximado (5.9.3.3)
gh = gammahLRFD(H) // γh = 1.7 − 0.01H
gst = gammastLRFD(fci) // γst = 5/(1 + f'ci)
dfpLT = dfpLTLRFD(fpj, Aps, Ag, H, fci, 2.4 ksi) // 10 fpi Aps/Ag γh γst + 12 γh γst + 2.4 ksi
dfpT = dfpES + dfpLT // Pérdida total
fpe = fpj - dfpT // Esfuerzo efectivo final
Pe = Aps*fpe -> kip // Fuerza efectiva final
"Pérdida total: {dfpT} = {100*dfpT/fpj} % del esfuerzo de tensado.
check fpe <= 0.80*fpy // Esfuerzo en servicio tras pérdidas (Tabla 5.9.2.2-1)
check abs(dfpESc - dfpES) <= 0.02*dfpES // Coherencia de la forma cerrada con fcgp
# Esfuerzos en la transferencia (5.9.2.3.1)
fcia = 0.65*fci // Compresión admisible (5.9.2.3.1a)
ftia = 0.24*sqrt(fci/(1 ksi))*1 ksi // Tracción admisible con refuerzo adherido (Tabla 5.9.2.3.1b-1)
## Extremo de la viga (a la longitud de transferencia 60 db)
lt = 60*dbs -> ft // Longitud de transferencia (5.9.4.3.1)
Mgt = wg*lt*(L - lt)/2 -> kip*ft // Peso propio en x = lt
fte = Pi/Ag - Pi*ee/St + Mgt/St -> ksi // Fibra superior
fbe = Pi/Ag + Pi*ee/Sb - Mgt/Sb -> ksi // Fibra inferior
check -fte <= ftia // Tracción superior en el extremo
check fbe <= fcia // Compresión inferior en el extremo
## Centro de la luz
ftm = Pi/Ag - Pi*em/St + Mg/St -> ksi // Fibra superior
fbm = Pi/Ag + Pi*em/Sb - Mg/Sb -> ksi // Fibra inferior
check fbm <= fcia // Compresión inferior en L/2
check ftm >= -ftia // Tracción superior en L/2
# Esfuerzos en servicio en L/2 (5.9.2.3.2)
## Servicio I — compresión
fc1 = Pe/Ag - Pe*em/St + (Mg + Ms)/St + (Mb + Mw)/Stc -> ksi // Presfuerzo + cargas permanentes
check fc1 <= 0.45*fc // Compresión por cargas permanentes (Tabla 5.9.2.3.2a-1)
fc2 = fc1 + MLL/Stc -> ksi // + carga viva
check fc2 <= 0.60*fc // Compresión total (φw = 1.0)
fdk = (Mb + Mw + MLL)/Sdk -> ksi // Fibra superior de la losa
check fdk <= 0.60*fcd // Compresión en la losa
## Servicio III — tracción en la fibra inferior
fb3 = Pe/Ag + Pe*em/Sb - (Mg + Ms)/Sb - (Mb + Mw + 0.8*MLL)/Sbc -> ksi // γLL = 0.80 (Tabla 3.4.1-1)
fta = 0.19*sqrt(fc/(1 ksi))*1 ksi // Tracción admisible, corrosión moderada: 0.19λ√f'c ≤ 0.6 ksi (Tabla 5.9.2.3.2b-1)
check -fb3 <= min(fta, 0.6 ksi) // Tracción en la fibra precomprimida
# Resistencia a flexión — Resistencia I (5.6.3)
Mu = 1.25*(Mg + Ms + Mb) + 1.50*Mw + 1.75*MLL // Momento último en L/2
dp = h + hh + ts - ybsm // Peralte al centroide de torones
c = cpsLRFD(Aps, fpu, fpy, dp, fcd, beff, btf, ts) // Eje neutro (5.6.3.1.1-4; rectangular si a ≤ hf)
fps = fpsLRFD(fpu, fpy, c, dp) // Esfuerzo medio en los torones (5.6.3.1.1-1)
a = beta1LRFD(fcd)*c // Bloque de compresión
check a <= ts // Comportamiento rectangular (bloque en la losa)
Mn = Aps*fps*(dp - a/2) -> kip*ft // Resistencia nominal (5.6.3.2.2-1)
epst = 0.003*(dp - c)/c // Deformación neta en tracción
check epst >= 0.005 // Sección controlada por tracción: φ = 1.00 (5.5.4.2)
check Mu <= 1.00*Mn // Resistencia a flexión
## Refuerzo mínimo (5.6.3.3)
fr = frLRFD(fc) // Módulo de rotura
fcpe = Pe/Ag + Pe*em/Sb -> ksi // Compresión por presfuerzo efectivo en la fibra inferior
Mdnc = Mg + Ms // Momento de cargas permanentes en la sección simple
Mcr = 1.0*((1.6*fr + 1.1*fcpe)*Sbc - Mdnc*(Sbc/Sb - 1)) -> kip*ft // γ3 = 1.0, γ1 = 1.6, γ2 = 1.1 (5.6.3.3-1)
check 1.00*Mn >= min(Mcr, 1.33*Mu) // Refuerzo mínimo
# Cortante en la sección crítica (método general, 5.7.3.4.2)
de = dp // Peralte efectivo (solo torones)
dv = max(de - a/2, 0.9*de, 0.72*hc) // Peralte efectivo de corte (5.7.2.8)
Vux = 1.25*(wg + ws + wb)*(L/2 - xv) + 1.50*ww*(L/2 - xv) + 1.75*gV/gM*VLLx1 -> kip // VLL distribuido con gV
Mux = max(1.25*(wg + ws + wb)*xv*(L - xv)/2 + 1.50*ww*xv*(L - xv)/2 + 1.75*MLLx1, Vux*dv) -> kip*ft // |Mu| ≥ |Vu|dv
fpo = 0.7*fpu // Parámetro fpo (5.7.3.4.2)
epsx = max((Mux/dv + Vux - Aps*fpo)/(Ep*Aps), 0) // εs; si resulta negativo se toma 0 (conservador)
beta = betaMCFT(epsx) // β = 4.8/(1 + 750 εs)
theta = thetaMCFT(epsx) // θ = 29 + 3500 εs
Vc = 0.0316*beta*sqrt(fc/(1 ksi))*1 ksi*bw*dv -> kip // Vc = 0.0316 β λ √f'c bv dv (5.7.3.3-3)
Avs = 2*0.20 in^2 // Estribos #4 de dos ramas
sv = 12 in // Espaciamiento de estribos en la zona de apoyo
Vs = Avs*fy*dv*cot(theta)/sv -> kip // (5.7.3.3-4)
Vn = min(Vc + Vs, 0.25*fc*bw*dv) -> kip // Vp = 0 (conservador)
check Vux <= 0.90*Vn // Resistencia a cortante, φ = 0.90
vu = Vux/(0.90*bw*dv) -> ksi
check sv <= si(vu < 0.125*fc, min(0.8*dv, 24 in), min(0.4*dv, 12 in)) // Espaciamiento máximo (5.7.2.6)
check Avs >= 0.0316*sqrt(fc/(1 ksi))*1 ksi*bw*sv/fy // Refuerzo transversal mínimo (5.7.2.5-1)
# Deflexión por carga viva (2.5.2.6.2)
DFd = NL*mpLRFD(NL)/Nb // Todos los carriles cargados
EIc = Ec*Ic -> kip*in^2
a1 = L/2 - 14 ft // Eje delantero con el eje central en L/2
dtr = 32 kip*L^3/(48*EIc) + 40 kip*a1*(3*L^2 - 4*a1^2)/(48*EIc) -> in // Camión: 32 k en L/2; 32 k y 8 k a ±14 ft
dln = 0.25*dtr*1.33 + 5*0.64 kip/ft*L^4/(384*EIc) -> in // 25 % camión + carril
DLL = DFd*max(1.33*dtr, dln) -> in // Deflexión de la viga interior
check DLL <= L/800 // Límite L/800`),
    summary(),
  ],
};

export default [vigaT, presf];
