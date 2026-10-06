// =====================================================================
//  Plantillas — módulo «bridges» (puentes, AASHTO LRFD / Manual de Puentes MTC 2018)
//  Fuentes, fórmulas y ejemplos de validación: docs/referencias/bridges.md
// =====================================================================
import { calc, text, summary } from './_h.js';

const CAT = 'Puentes';
// Secciones de la franja de losa en las caras de las almas de las vigas (diseño del momento negativo, 4.6.2.1.6)
const SEC_CARAS = 'vol + bw/2, vol + S - bw/2, vol + S + bw/2, vol + 2*S - bw/2, vol + 2*S + bw/2, vol + 3*S - bw/2';
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

**Versión de las fórmulas de distribución.** La 9.ª/10.ª ed. de AASHTO solo se publica en unidades de EE. UU. (S, L en ft; ts en in; Kg en in⁴); el Manual de Puentes MTC 2018 reproduce la versión SI de ediciones anteriores, con constantes redondeadas al convertir: $0.06 + (S/4300)^{0.4}(S/L)^{0.3}(K_g/Lt_s^3)^{0.1}$, $0.36 + S/7600$, $0.2 + S/3600 - (S/10700)^2$, $e = 0.77 + d_e/2800$, $e = 0.6 + d_e/3000$ y regla de la palanca con ruedas a 1.80 m y 0.60 m de la barrera. El dato **verDF** permite elegir: 1 = AASHTO 9.ª ed. (conversión exacta), 2 = MTC 2018 (SI). Las diferencias son del orden de 0.5–1.5 %; para expedientes que se revisan en el MTC se recomienda la opción 2.

Modificador de cargas $\\eta = \\eta_D\\,\\eta_R\\,\\eta_I = 1.00$ (puente típico, componentes dúctiles y redundantes, 1.3.2).`),
    calc(`# Datos de diseño
## Geometría
L = 20.00 m // Luz de cálculo entre ejes de apoyos
Nb = 4 // Número de vigas longitudinales (la franja de losa se modela con 4 vigas)
S = 2.10 m // Separación entre ejes de vigas
vol = 0.85 m // Longitud del voladizo, desde el eje de la viga exterior
bbar = 0.40 m // Ancho de la barrera en su base
B = (Nb - 1)*S + 2*vol // Ancho total del tablero
wc = B - 2*bbar // Ancho de calzada entre caras de barreras
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
verDF = 2 // Fórmulas de distribución [1 : AASHTO 9.ª ed. (US, conversión exacta)|2 : Manual MTC 2018 (SI)]
# Predimensionamiento
hmin = 0.070*L // Peralte mínimo de vigas T simplemente apoyadas (Tabla 2.5.2.6.3-1)
h = roundup(hmin, 0.05 m) + 0.10 m // Peralte total adoptado (incluye la losa)
tsmin = max((S + 3 m)/30, 175 mm) -> m // Espesor mínimo de losa: (S + 3000)/30 ≥ 165 mm y 175 mm (Tabla 2.5.2.6.3-1, 9.7.1.1)
ts = roundup(tsmin, 0.05 m) // Espesor de la losa adoptado
bw = 0.50 m // Ancho del alma: aloja 6 barras por capa (5.10.3.1)
hv = h - ts // Altura del alma bajo la losa
de = vol - bbar // Distancia del eje de la viga exterior a la cara interior de la barrera (4.6.2.2.1)
check de >= -0.30 m and de <= 0.91 m // −0.30 ≤ de ≤ 1.70 m (Tabla 4.6.2.2.2d-1) y parte de calzada del voladizo ≤ 0.91 m (4.6.2.2.1)
check Nb == 4 // El modelo de la franja de losa y de la sección rígida está planteado para 4 vigas
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
    { type: 'hl93env', tramos: 'vol, S, S, S, vol', apoyos: 'L A A A A L', vehiculo: 'Ejes', ejes: '7.26 0; 7.26 1.8', IM: 'IM', g: 'mpLRFD(1)', carril: '0', Epos: 'Epos', Eneg: 'Eneg', xmin: 'bbar + 0.30 m', xmax: 'B - bbar - 0.30 m', DC: 'U * wlosa\nP 0.17 Pbar\nP B-0.17m Pbar', DW: 'UP bbar B-bbar wasf', gLL: '1.75', secciones: SEC_CARAS, sufijo: 'L1', titulo: 'Franja transversal de losa de 1 m: un camión (m = 1.20), cargas DC y DW, Resistencia I' },
    { type: 'hl93env', tramos: 'vol, S, S, S, vol', apoyos: 'L A A A A L', vehiculo: 'Ejes', ejes: '7.26 0; 7.26 1.8; 7.26 3.0; 7.26 4.8', IM: 'IM', g: 'mpLRFD(2)', carril: '0', Epos: 'Epos', Eneg: 'Eneg', xmin: 'bbar + 0.30 m', xmax: 'B - bbar - 0.30 m', secciones: SEC_CARAS, sufijo: 'L2', titulo: 'Franja transversal de losa: dos camiones adyacentes (m = 1.00)' },
    calc(`## Momentos de diseño de la losa (por metro de ancho)
MLLpos = max(MLLpL1, MLLpL2)/(1 m) -> tonf*m/m // M⁺ por carga viva + IM (ya dividido entre E⁺ en el análisis)
MLLneg = min(MLLnL1, MLLnL2)/(1 m) -> tonf*m/m // M⁻ por carga viva + IM en el eje de las vigas (dividido entre E⁻), solo referencial
MDCpos = MDCpL1/(1 m) -> tonf*m/m // M⁺ máximo por DC
MDWpos = MDWpL1/(1 m) -> tonf*m/m // M⁺ máximo por DW
Mupos = 1.25*MDCpos + 1.50*MDWpos + 1.75*MLLpos // Resistencia I (Tabla 3.4.1-1), M⁺ (máximos de cada carga, conservador)
"Momento negativo en la **sección de diseño**: para vigas T monolíticas se toma en la cara del alma (4.6.2.1.6); se evalúan las seis caras interiores (las caras exteriores de las vigas de borde se diseñan con el voladizo).
Mneg1 = 1.25*abs(MDCx1L1) + 1.50*abs(MDWx1L1) + 1.75*max(abs(MLLnx1L1), abs(MLLnx1L2)) // Resistencia I en la cara 1 (efectos concomitantes en la sección)
Mneg2 = 1.25*abs(MDCx2L1) + 1.50*abs(MDWx2L1) + 1.75*max(abs(MLLnx2L1), abs(MLLnx2L2)) // Resistencia I en la cara 2 (efectos concomitantes en la sección)
Mneg3 = 1.25*abs(MDCx3L1) + 1.50*abs(MDWx3L1) + 1.75*max(abs(MLLnx3L1), abs(MLLnx3L2)) // Resistencia I en la cara 3 (efectos concomitantes en la sección)
Mneg4 = 1.25*abs(MDCx4L1) + 1.50*abs(MDWx4L1) + 1.75*max(abs(MLLnx4L1), abs(MLLnx4L2)) // Resistencia I en la cara 4 (efectos concomitantes en la sección)
Mneg5 = 1.25*abs(MDCx5L1) + 1.50*abs(MDWx5L1) + 1.75*max(abs(MLLnx5L1), abs(MLLnx5L2)) // Resistencia I en la cara 5 (efectos concomitantes en la sección)
Mneg6 = 1.25*abs(MDCx6L1) + 1.50*abs(MDWx6L1) + 1.75*max(abs(MLLnx6L1), abs(MLLnx6L2)) // Resistencia I en la cara 6 (efectos concomitantes en la sección)
Muneg = max(Mneg1, Mneg2, Mneg3, Mneg4, Mneg5, Mneg6)/(1 m) -> tonf*m/m // Resistencia I, M⁻ de diseño en la cara de las vigas
## Refuerzo de la losa
barL = 5 // Varilla principal de la losa [4 : 1/2"|5 : 5/8"|6 : 3/4"]
rinf = 2.5 cm // Recubrimiento inferior (Tabla 5.10.1-1)
rsup = 5.0 cm // Recubrimiento superior, superficie expuesta (Tabla 5.10.1-1)
dpos = ts - rinf - db(barL)/2 // Peralte efectivo para M⁺
dneg = ts - rsup - db(barL)/2 // Peralte efectivo para M⁻
phif = 0.90 // Flexión, sección controlada por tracción (5.5.4.2)
Asp = 0.85*fc*100 cm/fy*(dpos - sqrt(max(dpos^2 - 2*Mupos*1 m/(0.85*phif*fc*100 cm), 0 cm^2))) // Acero requerido M⁺ por metro
spos = max(rounddown(min(Ab(barL)*100 cm/Asp, 1.5*ts, 45 cm), 2.5 cm), 5 cm) // Espaciamiento (máx. 1.5 ts ≤ 450 mm, 5.10.3.2)
Asn = 0.85*fc*100 cm/fy*(dneg - sqrt(max(dneg^2 - 2*Muneg*1 m/(0.85*phif*fc*100 cm), 0 cm^2))) // Acero requerido M⁻ por metro
sneg = max(rounddown(min(Ab(barL)*100 cm/Asn, 1.5*ts, 45 cm), 2.5 cm), 5 cm) // Espaciamiento del acero superior
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
sdist = max(rounddown(min(Ab(4)*100 cm/Asdist, 45 cm), 2.5 cm), 5 cm) // Espaciamiento de varillas #4
Astem = max(0.75*(B/(1 mm))*(ts/(1 mm))/(2*((B + ts)/(1 mm))*fy/(1 MPa))*1 mm^2/mm, 0.233 mm^2/mm) -> cm^2/m // Temperatura 0.75bh/[2(b+h)fy] ≥ 0.233 mm²/mm (5.10.6)
stem = max(rounddown(min(Ab(3)/Astem, 3*ts, 45 cm), 2.5 cm), 5 cm) // Varillas #3 de temperatura (superior, longitudinal)
check min(spos, sneg) >= db(barL) + max(1.5*db(barL), 3.8 cm) // Separación libre mínima entre barras (5.10.3.1.1)
"Losa: #{barL} @ {spos} inferior transversal, #{barL} @ {sneg} superior transversal, #4 @ {sdist} de distribución y #3 @ {stem} de temperatura.
## Voladizo — Resistencia I (cara del alma de la viga exterior)
Xv = vol - bw/2 // Longitud del voladizo hasta la cara del alma
MDCv = wlosa*Xv^2/2 + Pbar*(Xv - 0.17 m) -> tonf*m // Losa + barrera
MDWv = wasf*max(Xv - bbar, 0 m)^2/2 -> tonf*m // Asfalto
xLL = max(Xv - bbar - 0.30 m, 0 m) // Brazo de la carga lineal de 1.49 t/m a 0.30 m de la barrera (3.6.1.3.4)
MLLv = 1.2*1.49 tonf/m*1 m*xLL*(1 + IM) -> tonf*m // Carga lineal 14.6 N/mm × m × (1 + IM)
Muv = (1.25*MDCv + 1.50*MDWv + 1.75*MLLv)/(1 m) -> tonf*m/m // Resistencia I en el voladizo
## Voladizo — Evento Extremo II: colisión sobre la barrera (A13.4.1, caso 1)
TL = 4 // Nivel de contención (Tabla A13.2-1, base NCHRP 350) [2 : TL-2|3 : TL-3|4 : TL-4|5 : TL-5]
Ft = FtLRFD(TL) // Fuerza transversal de diseño (Tabla A13.2-1)
Lt = LtLRFD(TL) // Longitud de distribución de Ft (Tabla A13.2-1)
Hb = 0.85 m // Altura de la barrera
check Hb >= HbminLRFD(TL) // Altura mínima de la barrera para el nivel de contención (Tabla A13.2-1)
### Resistencias de la barrera (sección rectangular equivalente de espesor medio)
tbt = 0.15 m // Espesor de la barrera en la corona
tbm = (bbar + tbt)/2 // Espesor medio equivalente de la barrera New Jersey
barv = 4 // Varilla vertical de la barrera [4 : 1/2"|5 : 5/8"]
svb = 0.20 m // Espaciamiento del acero vertical
barh = 4 // Varilla horizontal de la barrera [3 : 3/8"|4 : 1/2"]
nhb = 4 // Barras horizontales por cara
rbar = 5.0 cm // Recubrimiento de la barrera
Asvb = Ab(barv)*1 m/svb // Acero vertical por metro (cara del tráfico)
dvb = tbm - rbar - db(barv)/2 // Peralte medio del acero vertical
Mc = Asvb*fy*(dvb - Asvb*fy/(2*0.85*fc*1 m))/(1 m) -> tonf*m/m // Resistencia a flexión alrededor del eje horizontal (por metro)
Ashb = nhb*Ab(barh) // Acero horizontal de una cara
dhb = tbm - rbar - db(barv) - db(barh)/2 // Peralte del acero horizontal
MwH = Ashb*fy*(dhb - Ashb*fy/(2*0.85*fc*Hb)) -> tonf*m // Resistencia total alrededor del eje vertical Mw·H (A13.3.1)
Mb = 0 tonf*m // Resistencia de la viga superior (no hay)
Lc = Lt/2 + sqrt((Lt/2)^2 + 8*Hb*(Mb + MwH)/Mc) // Longitud crítica del mecanismo de líneas de fluencia (A13.3.1-2)
Rw = 2/(2*Lc - Lt)*(8*Mb + 8*MwH + Mc*Lc^2/Hb) -> tonf // Resistencia transversal de la barrera (A13.3.1-1)
check Ft <= Rw // La barrera resiste la colisión (A13.3.1)
Tcol = Rw/(Lc + 2*Hb) -> tonf/m // Tracción en el voladizo (A13.4.2-1)
Mcol = Mc + 1.25*MDCv/(1 m) -> tonf*m/m // Momento en la base de la barrera + DC con γp = 1.25 (Evento Extremo II, Tabla 3.4.1-1)
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
check Nb > 3 // Nb ≥ 4
## Viga interior
gM1 = gMi1LRFD(S, L, ts, Kg, verDF) // Momento, un carril cargado (incluye m)
gM2 = gMi2LRFD(S, L, ts, Kg, verDF) // Momento, dos o más carriles
gMi = max(gM1, gM2) // Factor de momento, viga interior
gV1 = gVi1LRFD(S, verDF) // Cortante, un carril (Tabla 4.6.2.2.3a-1)
gV2 = gVi2LRFD(S, verDF) // Cortante, dos o más carriles
gVi = max(gV1, gV2) // Factor de cortante, viga interior
## Viga exterior
Rlev = leverLRFD(S, de, si(verDF == 2, 0.60 m, 0.61 m), verDF) // Regla de la palanca, un carril (rueda a 0.60/0.61 m de la barrera, ruedas a 1.80/1.83 m)
gMe1 = mpLRFD(1)*Rlev // Un carril, con m = 1.20 (Tabla 4.6.2.2.2d-1)
gMe2 = eMLRFD(de, verDF)*gM2 // Dos carriles: e = 0.77 + de/2800 mm (de/9.1 ft)
gVe2 = eVLRFD(de, verDF)*gV2 // Cortante dos carriles: e = 0.6 + de/3000 mm (de/10 ft) (Tabla 4.6.2.2.3b-1)
xext = (Nb - 1)*S/2 // Distancia del eje del puente a la viga exterior
sumx2 = S^2*Nb*(Nb^2 - 1)/12 // Σx² de las vigas respecto al eje del puente
e1 = B/2 - bbar - 0.60 m - 0.90 m // Excentricidad del primer camión (ruedas a 0.60 m de la barrera)
check NL <= 2 // La sección rígida considera uno y dos carriles cargados
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
dln = 5*0.952 tonf/m*L^4/(384*EIv) -> mm // Carril de diseño
DeltaLL = DFd*max((1 + IM)*d1, 0.25*(1 + IM)*d1 + dln) -> mm // Camión + IM, o 25 % (camión + IM) + carril (3.6.1.3.2); IM no se aplica al carril
check DeltaLL <= L/800 // Límite L/800 para carga vehicular (2.5.2.6.2)`),
    text(`> **Notas.** (1) El momento negativo de la losa se diseña en la cara de las almas (4.6.2.1.6) con efectos concomitantes; el voladizo se diseña aparte. (2) Mc y Mw se estiman con una sección rectangular equivalente de espesor medio; para barreras de geometría variable conviene el cálculo por segmentos de A13.3.1 y, si el proyecto exige MASH (10.ª ed.), Ft = 80 kip (356 kN) para TL-4. (3) Verificar adicionalmente los dispositivos de apoyo, la longitud de apoyo $N$ (4.7.4.4) y el diseño de los estribos.`),
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
    { type: 'bridgesec', tipo: 'I', B: 'max(wcc + 2*1.5 ft, (Nb - 1)*S + 26 in)', ts: 'ts', nv: 'Nb', S: 'S', hv: 'h + hh', bw: 'bw', bf: '26 in', tf: '8 in', barrera: '1.5 ft', hbarrera: '32 in', tasf: '0', titulo: 'Sección transversal: seis vigas AASHTO Tipo IV @ 8.0 ft, losa de 8 in' },
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
xh = 0.40*L // Punto de desvío (harping point) de los torones desviados
Vp = Pe*(ybse - ybsm)/xh -> kip // Componente vertical del presfuerzo efectivo: Pe·tanψ del centroide (x ≤ xh) (5.7.3.3)
fpo = 0.7*fpu // Parámetro fpo (5.7.3.4.2)
epsx = max((Mux/dv + abs(Vux - Vp) - Aps*fpo)/(Ep*Aps), 0) // εs; si resulta negativo se toma 0 (conservador)
beta = betaMCFT(epsx) // β = 4.8/(1 + 750 εs)
theta = thetaMCFT(epsx) // θ = 29 + 3500 εs
Vc = 0.0316*beta*sqrt(fc/(1 ksi))*1 ksi*bw*dv -> kip // Vc = 0.0316 β λ √f'c bv dv (5.7.3.3-3)
Avs = 2*0.20 in^2 // Estribos #4 de dos ramas
sv = 12 in // Espaciamiento de estribos en la zona de apoyo
Vs = Avs*fy*dv*cot(theta)/sv -> kip // (5.7.3.3-4)
Vn = min(Vc + Vs + Vp, 0.25*fc*bw*dv + Vp) -> kip // (5.7.3.3-1, -2)
check Vux <= 0.90*Vn // Resistencia a cortante, φ = 0.90
vu = abs(Vux - 0.90*Vp)/(0.90*bw*dv) -> ksi // (5.7.2.8-1)
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

// =====================================================================
//  3) VIGA DE ACERO COMPUESTA (sección compacta en flexión positiva)
// =====================================================================
const acero = {
  id: 'br-acero', pais: 'US', cat: CAT, icon: 'steel', settings: { sys: 'us' },
  name: 'Viga de acero compuesta con losa (AASHTO LRFD Secc. 6)',
  normas: 'AASHTO LRFD Bridge Design Specifications 9.ª ed. (2020), Secc. 3, 4, 6 y Apéndice D6 · FHWA Steel Bridge Design Handbook',
  desc: 'Viga I armada interior de puente simplemente apoyado L = 100 ft compuesta con losa: propiedades n y 3n, momento plástico Mp (D6.1), compacidad y ductilidad, Resistencia I, Servicio II, constructibilidad durante el vaciado de la losa (6.10.3), cortante del alma y deflexión.',
  titulo: 'Diseño de viga de acero compuesta — AASHTO LRFD Sección 6',
  blocks: [
    text(`# Generalidades
## Descripción
Viga **interior** de un puente de un tramo de 100 ft con cinco vigas I armadas de acero ASTM A709 Gr. 50 separadas 9.0 ft, conectores de corte y losa de 8.5 in vaciada in situ. En flexión positiva la sección es **compuesta y compacta**; durante el vaciado la viga de acero sola, arriostrada por diafragmas cada 20 ft, resiste su peso, el del concreto fresco y la carga de construcción.

## Normas y referencias
- AASHTO LRFD Bridge Design Specifications, 9.ª ed. (2020): 6.10.1 (secciones compuestas), 6.10.3 (constructibilidad), 6.10.4 (Servicio II), 6.10.6.2.2 y 6.10.7.1 (sección compacta), 6.10.9 (cortante), Apéndice D6.1 (momento plástico) y D6.3 (Dc).
- FHWA *Steel Bridge Design Handbook* (2015) y *LRFD Design Example for Steel Girder Superstructure Bridge* (FHWA-NHI-04-041); Barker & Puckett, cap. 8.
- Manual de Puentes MTC (2018), Secc. 2.4 (cargas) y diseño en acero según AASHTO.

## Etapas de carga
1. **Construcción** (acero solo): peso del acero, losa fresca y acartelamiento (DC1) + carga de construcción.
2. **Compuesta largo plazo** ($3n$): barreras (DC2) y superficie de rodadura (DW).
3. **Compuesta corto plazo** ($n$): carga viva HL-93 con IM.`),
    calc(`# Datos
## Puente
L = 100 ft // Luz de cálculo
S = 9.0 ft // Separación entre vigas
Nb = 5 // Número de vigas
wcc = 40 ft // Ancho de calzada entre barreras
ts = 8.5 in // Espesor de la losa
th = 2.0 in // Altura del acartelamiento (borde superior del ala a fondo de losa)
Lb = 20 ft // Separación de diafragmas (longitud no arriostrada del ala comprimida)
## Materiales
Fy = 50 ksi // Acero ASTM A709 Gr. 50 [36 ksi|50 ksi|70 ksi]
Es = 29000 ksi // Módulo del acero (6.4.1)
fc = 4.0 ksi // f'c de la losa
gammac = 0.150 kip/ft^3 // Concreto armado
gammas = 0.490 kip/ft^3 // Acero
Ecd = EcLRFD(fc, gammac) // Módulo de la losa
n = roundup(Es/Ecd, 1) // Relación modular (6.10.1.1.1b)
## Sección de acero (viga armada)
bc = 14 in // Ancho del ala superior (comprimida)
tc = 0.875 in // Espesor del ala superior
D = 48 in // Altura del alma
tw = 0.5 in // Espesor del alma
bt = 16 in // Ancho del ala inferior (traccionada)
tt = 1.25 in // Espesor del ala inferior
# Proporciones de la sección (6.10.2)
check D/tw <= 150 // Alma sin rigidizadores longitudinales (6.10.2.1.1)
check bc/(2*tc) <= 12 and bt/(2*tt) <= 12 // Esbeltez de alas bf/2tf ≤ 12 (6.10.2.2-1)
check bc >= D/6 and bt >= D/6 // bf ≥ D/6 (6.10.2.2-2)
check tc >= 1.1*tw // tf ≥ 1.1 tw (6.10.2.2-3)
check (bc*tc^3/12)/(bt*tt^3/12) >= 0.1 and (bc*tc^3/12)/(bt*tt^3/12) <= 10 // 0.1 ≤ Iyc/Iyt ≤ 10 (6.10.2.2-4)
# Propiedades elásticas (desde la fibra inferior)
As = bc*tc + D*tw + bt*tt // Área de acero
ys = (bt*tt^2/2 + D*tw*(tt + D/2) + bc*tc*(tt + D + tc/2))/As // Centroide de la viga de acero
hs = tt + D + tc // Peralte de la viga de acero
Is = bt*tt^3/12 + bt*tt*(ys - tt/2)^2 + tw*D^3/12 + D*tw*(tt + D/2 - ys)^2 + bc*tc^3/12 + bc*tc*(tt + D + tc/2 - ys)^2 -> in^4
Sbs = Is/ys // Módulo inferior (acero solo)
Sts = Is/(hs - ys) // Módulo superior (acero solo)
beff = S // Ancho efectivo de la losa (4.6.2.6.1)
yd = hs + th + ts/2 // Centroide de la losa
Adn = beff*ts/n // Losa transformada, corto plazo
yn = (As*ys + Adn*yd)/(As + Adn) // Centroide compuesto (n)
In = Is + As*(yn - ys)^2 + beff/n*ts^3/12 + Adn*(yd - yn)^2 -> in^4
Sbn = In/yn // Módulo inferior compuesto (n)
Ad3 = beff*ts/(3*n) // Losa transformada, largo plazo (3n)
y3 = (As*ys + Ad3*yd)/(As + Ad3) // Centroide compuesto (3n)
I3 = Is + As*(y3 - ys)^2 + beff/(3*n)*ts^3/12 + Ad3*(yd - y3)^2 -> in^4
Sb3 = I3/y3 // Módulo inferior compuesto (3n)
# Cargas y momentos (viga interior, L/2)
wst = 1.10*gammas*As -> kip/ft // Acero + 10 % por rigidizadores, diafragmas y conexiones
wsl = gammac*(S*ts + bc*th) -> kip/ft // Losa + acartelamiento (DC1)
wb = 2*0.40 kip/ft/Nb // Barreras (DC2), repartidas por igual (4.6.2.2.1)
ww = 0.025 kip/ft^2*wcc/Nb // Superficie de rodadura futura 25 psf (DW)
wcl = 0.020 kip/ft^2*S // Carga viva de construcción 20 psf (3.4.2.1)
MDC1 = (wst + wsl)*L^2/8 -> kip*ft
MDC2 = wb*L^2/8 -> kip*ft
MDW = ww*L^2/8 -> kip*ft
# Factores de distribución (4.6.2.2, tipo a)
eg = hs - ys + th + ts/2 // Distancia entre centroides de viga y losa
Kg = n*(Is + As*eg^2) -> in^4 // Kg = n(I + A eg²)
check Kg >= 10000 in^4 and Kg <= 7000000 in^4 // Rango de aplicación
NL = NLLRFD(wcc) // Carriles de diseño
gM = max(gMi1LRFD(S, L, ts, Kg), gMi2LRFD(S, L, ts, Kg)) // Momento, viga interior
gV = max(gVi1LRFD(S), gVi2LRFD(S)) // Cortante, viga interior`),
    { type: 'bridgesec', tipo: 'acero', B: 'max(wcc + 2*1.5 ft, (Nb - 1)*S + bt)', ts: 'ts', nv: 'Nb', S: 'S', hv: 'hs + th', bw: 'tw', bf: 'bt', tf: 'tt', barrera: '1.5 ft', hbarrera: '32 in', tasf: '0', titulo: 'Sección transversal: cinco vigas de acero @ 9.0 ft con losa de 8.5 in' },
    { type: 'hl93env', tramos: 'L', apoyos: 'A A', vehiculo: 'HL-93', IM: 'IMLRFD(1)', g: 'gM', titulo: 'Envolventes HL-93 × gM, viga interior (IM = 33 %)' },
    calc(`MLL = MLLp // Momento LL+IM en L/2 (distribuido)
VLLv = gV/gM*VLL // Cortante LL+IM en el apoyo (distribuido con gV)
# Momento plástico de la sección compuesta (Apéndice D6.1)
Ps = 0.85*fc*beff*ts -> kip // Fuerza plástica de la losa (se desprecia el refuerzo)
Pc = Fy*bc*tc -> kip // Ala superior
Pw = Fy*D*tw -> kip // Alma
Pt = Fy*bt*tt -> kip // Ala inferior
## Caso PNA en la losa (Pc + Pw + Pt ≤ Ps)
Y1 = ts*(Pc + Pw + Pt)/Ps // Profundidad del PNA desde la cara superior de la losa
Mp1 = (Y1^2*Ps/(2*ts) + Pc*(ts + th + tc/2 - Y1) + Pw*(ts + th + tc + D/2 - Y1) + Pt*(ts + th + tc + D + tt/2 - Y1)) -> kip*ft
## Caso PNA en el ala superior (Pt + Pw < Pc + Ps ≤ …)
Y2 = tc/2*((Pw + Pt - Ps)/Pc + 1) // Desde la cara superior del ala
Mp2 = (Pc/(2*tc)*(Y2^2 + (tc - Y2)^2) + Ps*(Y2 + th + ts/2) + Pw*(tc - Y2 + D/2) + Pt*(tc - Y2 + D + tt/2)) -> kip*ft
## Caso PNA en el alma (Pt + Pw ≥ Pc + Ps)
Y3 = D/2*((Pt - Pc - Ps)/Pw + 1) // Desde el borde superior del alma
Mp3 = (Pw/(2*D)*(Y3^2 + (D - Y3)^2) + Ps*(Y3 + tc + th + ts/2) + Pc*(Y3 + tc/2) + Pt*(D - Y3 + tt/2)) -> kip*ft
caso = si(Pc + Pw + Pt <= Ps, 1, si(Pt + Pw < Pc + Ps, 2, 3)) // 1: losa, 2: ala superior, 3: alma
Mp = si(caso == 1, Mp1, si(caso == 2, Mp2, Mp3)) // Momento plástico
Dp = si(caso == 1, Y1, si(caso == 2, ts + th + Y2, ts + th + tc + Y3)) -> in // Profundidad del PNA desde la cara superior de la losa
Dt = ts + th + hs // Peralte total de la sección compuesta
Dcp = si(caso == 3, Y3, 0 in) // Altura del alma comprimida en el estado plástico
# Resistencia I — flexión positiva (6.10.6.2.2 y 6.10.7.1)
check Fy <= 70 ksi // Sección compacta: Fy ≤ 70 ksi
check 2*Dcp/tw <= 3.76*sqrt(Es/Fy) // Esbeltez del alma 2Dcp/tw ≤ 3.76√(E/Fyc) (6.10.6.2.2-1)
check Dp <= 0.42*Dt // Ductilidad (6.10.7.3-1)
Mn = si(Dp <= 0.1*Dt, Mp, Mp*(1.07 - 0.7*Dp/Dt)) // Resistencia nominal (6.10.7.1.2)
Mu = 1.25*(MDC1 + MDC2) + 1.50*MDW + 1.75*MLL // Resistencia I
check Mu <= 1.00*Mn // φf = 1.00 (6.5.4.2)
# Servicio II — ala inferior (6.10.4.2.2)
ff = MDC1/Sbs + (MDC2 + MDW)/Sb3 + 1.30*MLL/Sbn -> ksi // Esfuerzo en el ala inferior
check ff <= 0.95*1.0*Fy // ff ≤ 0.95 Rh Fyf (Rh = 1)
# Constructibilidad: vaciado de la losa (6.10.3.2)
Mcon = (1.25*(wst + wsl) + 1.50*wcl)*L^2/8 -> kip*ft // Cargas factorizadas de construcción (3.4.2.1)
fbu = Mcon/Sts -> ksi // Esfuerzo en el ala superior (acero solo)
Dc = hs - ys - tc // Alma en compresión (elástico, acero solo)
lamf = bc/(2*tc) // Esbeltez del ala comprimida
lampf = 0.38*sqrt(Es/Fy) // Límite de ala compacta (6.10.8.2.2-4)
check lamf <= lampf // Ala comprimida compacta: Fnc(FLB) = Rb Rh Fyc
rt = bc/sqrt(12*(1 + Dc*tw/(3*bc*tc))) // Radio de giro efectivo (6.10.8.2.3-9)
Lp = 1.0*rt*sqrt(Es/Fy) -> ft // (6.10.8.2.3-4)
Fyr = max(0.7*Fy, 0.5*Fy) // Fyr = 0.7 Fyc ≥ 0.5 Fyw
Lr = pi*rt*sqrt(Es/Fyr) -> ft // (6.10.8.2.3-5)
Cb = 1.0 // Gradiente de momento (segmento central, conservador)
Fnc = si(Lb <= Lp, Fy, si(Lb <= Lr, min(Cb*(1 - (1 - Fyr/Fy)*(Lb - Lp)/(Lr - Lp))*Fy, Fy), min(Cb*pi^2*Es/(Lb/rt)^2, Fy))) -> ksi // Pandeo lateral-torsional (6.10.8.2.3)
check fbu <= 1.00*Fy // Fluencia del ala (6.10.3.2.1-1)
check fbu <= 1.00*Fnc // Pandeo del ala comprimida (6.10.3.2.1-2)
kw = 9/(Dc/D)^2 // Coeficiente de pandeo por flexión del alma (6.10.1.9.1-2)
Fcrw = min(0.9*Es*kw/(D/tw)^2, Fy, Fy/0.7) // Pandeo del alma por flexión (6.10.1.9.1-1)
check fbu <= 1.00*Fcrw // Pandeo del alma durante la construcción (6.10.3.2.1-3)
# Cortante en el apoyo (6.10.9)
Vu = (1.25*(wst + wsl + wb) + 1.50*ww)*L/2 + 1.75*VLLv -> kip // Resistencia I en el apoyo
Vp = 0.58*Fy*D*tw -> kip // Fuerza cortante plástica (6.10.9.2-2)
kv = 5 // Alma sin rigidizadores transversales
Cv = si(D/tw <= 1.12*sqrt(Es*kv/Fy), 1, si(D/tw <= 1.40*sqrt(Es*kv/Fy), 1.12/(D/tw)*sqrt(Es*kv/Fy), 1.57/(D/tw)^2*(Es*kv/Fy))) // Relación C (6.10.9.3.2-4 a -6)
Vn = Cv*Vp // Resistencia nominal del alma no rigidizada (6.10.9.2-1)
check Vu <= 1.00*Vn // φv = 1.00
# Deflexión por carga viva (2.5.2.6.2)
DFd = NL*mpLRFD(NL)/Nb // Todos los carriles cargados
EIn = Es*In -> kip*in^2
a1 = L/2 - 14 ft
dtr = 32 kip*L^3/(48*EIn) + 40 kip*a1*(3*L^2 - 4*a1^2)/(48*EIn) -> in // Camión con el eje central en L/2
dln = 0.25*1.33*dtr + 5*0.64 kip/ft*L^4/(384*EIn) -> in // 25 % camión + carril
DLL = DFd*max(1.33*dtr, dln) -> in
check DLL <= L/800 // Límite L/800`),
    summary(),
  ],
};

// =====================================================================
//  4) ESTRIBO EN VOLADIZO DE CONCRETO ARMADO
// =====================================================================
const estribo = {
  id: 'br-estribo', pais: 'PE', cat: CAT, icon: 'wall', settings: {},
  name: 'Estribo de concreto armado en voladizo (AASHTO LRFD / MTC)',
  normas: NORMAS_PE,
  desc: 'Estribo en voladizo H = 7.0 m: cargas DC, DW, LL, BR, EH, EV, LS y sismo (Mononobe–Okabe + inercia), Resistencia Ia/Ib y Evento Extremo I, excentricidad, deslizamiento, capacidad portante, longitud de apoyo N y diseño de pantalla, punta y talón.',
  titulo: 'Diseño de estribo de concreto armado en voladizo H = 7.00 m — AASHTO LRFD / MTC 2018',
  blocks: [
    text(`# Generalidades
## Descripción
Estribo de concreto armado tipo **voladizo** (pantalla, cajuela y parapeto sobre zapata corrida) que soporta un extremo del puente viga-losa de 20 m de luz y contiene el relleno de acceso. El análisis se hace por **metro lineal** de estribo, repartiendo las reacciones de la superestructura en el ancho del estribo.

## Normas y referencias
- AASHTO LRFD 9.ª ed.: 3.4.1 (combinaciones y factores, Tablas 3.4.1-1/-2), 3.6.4 (frenado BR), 3.11.5 (empuje EH), 3.11.6.4 (sobrecarga LS, Tabla 3.11.6.4-1), 3.10 y 11.6.5 (sismo, $k_h = 0.5\\,A_s$, Mononobe–Okabe), 10.6.3 (cimentaciones superficiales), 11.6.3 (estabilidad de estribos), 4.7.4.4 (longitud de apoyo $N$), 5 (concreto).
- Manual de Puentes MTC (2018): cap. 2 (cargas, mapas de isoaceleraciones con 1000 años de periodo de retorno).
- Rodríguez Serquén, *Puentes con AASHTO-LRFD*, cap. X (estribos); Das, *Principios de ingeniería de cimentaciones*.

## Criterios
- Estados límite: **Resistencia Ia** (cargas verticales mínimas, para deslizamiento y excentricidad), **Resistencia Ib** (máximas, para presiones y diseño) y **Evento Extremo I** con $\\gamma_{EQ} = 0.5$ para la carga viva (práctica MTC).
- Excentricidad: $e \\le B/3$ en Resistencia (10.6.3.3) y, en Evento Extremo, interpolando entre $B/3$ ($\\gamma_{EQ}=0$) y $0.40B$ ($\\gamma_{EQ}=1$) (11.6.5.1).
- Presión de contacto uniforme de Meyerhof sobre $B' = B - 2e$ (10.6.3.1.5).`),
    calc(`# Datos
## Superestructura (puente viga-losa L = 20 m)
L = 20.00 m // Luz del puente
Ba = 8.00 m // Ancho del estribo (ancho del tablero)
wDCs = 10.20 tonf/m // Peso DC de la superestructura por metro de puente (vigas, losa, barreras, diafragmas)
wDWs = 0.81 tonf/m // Peso DW (asfalto) por metro de puente
NL = 2 // Carriles de diseño
## Geometría del estribo
H = 7.00 m // Altura total, desde el fondo de la zapata hasta la rasante
hz = 0.80 m // Espesor de la zapata
B = 5.20 m // Ancho de la zapata
Lp = 1.40 m // Longitud de la punta
t2 = 0.90 m // Espesor de la pantalla (cuerpo) bajo la cajuela
t1 = 0.30 m // Espesor del parapeto (muro espaldar)
hb = 1.65 m // Altura del parapeto: viga + apoyo + losa (1.50 + 0.15)
Df = 1.50 m // Profundidad de desplante (relleno sobre la punta)
hp = H - hz // Altura de la pantalla
Lt = B - Lp - t2 // Longitud del talón
bc = t2 - t1 // Ancho de la cajuela (asiento de las vigas)
## Suelos y materiales
gammas = 1.90 tonf/m^3 // Peso unitario del relleno
phis = 30 deg // Ángulo de fricción del relleno
phif = 32 deg // Ángulo de fricción del suelo de fundación
qn = 75 tonf/m^2 // Capacidad portante nominal (estudio geotécnico)
gammac = 2.40 tonf/m^3 // Concreto armado del estribo
fc = 280 kgf/cm^2 // f'c del estribo
fy = 4200 kgf/cm^2 // Acero Gr. 60
## Peligro sísmico (MTC 2018 / AASHTO 3.10, Tr = 1000 años)
PGA = 0.40 // Aceleración pico en roca, en g (mapa de isoaceleraciones MTC)
sitio = 4 // Clase de sitio [2 : B roca|3 : C suelo muy denso|4 : D suelo rígido|5 : E suelo blando]
Fpga = FpgaLRFD(PGA, sitio) // Factor de sitio (Tabla 3.10.3.2-1)
As = Fpga*PGA // Coeficiente de aceleración As = Fpga·PGA (3.10.4.2-2)
kh = 0.5*As // Coeficiente sísmico horizontal: el estribo puede desplazarse 25–50 mm (11.6.5.2.2)
gEQ = 0.50 // Factor de carga viva en Evento Extremo I (Tabla 3.4.1-1, práctica MTC)
# Longitud de apoyo en la cajuela (4.7.4.4)
Nap = NapLRFD(L, H, 0 deg) // N = (200 + 0.0017L + 0.0067H)(1 + 0.000125S²)
zona = zonaLRFD(FvLRFD(0.40, sitio)*0.40) // Zona sísmica (Tabla 3.10.6-1) con S1 = 0.40 g
Nreq = NpctLRFD(zona, As)*Nap // Porcentaje de N según la zona (Tabla 4.7.4.4-1)
check Nreq <= bc // Ancho de la cajuela suficiente
# Cargas
## Reacciones de la superestructura (por metro de estribo)
IM = IMLRFD(1) // La pantalla está sobre el terreno: se aplica IM (3.6.2.1)
mp = mpLRFD(NL) // Presencia múltiple
RDC = wDCs*L/2/Ba -> tonf/m // Reacción DC
RDW = wDWs*L/2/Ba -> tonf/m // Reacción DW
RLL = NL*mp*(VtruckHL93(L)*(1 + IM) + VlaneHL93(L))/Ba -> tonf/m // Reacción LL+IM (camión + carril)
BR = BRLRFD(L, NL)/Ba -> tonf/m // Frenado, a 1.80 m sobre la rasante (3.6.4)
xR = Lp + bc/2 // Brazo de las reacciones desde la punta
## Pesos propios (DC) y relleno (EV)
W1 = gammac*B*hz*1 m // Zapata
W2 = gammac*t2*(hp - hb)*1 m // Pantalla
W3 = gammac*t1*hb*1 m // Parapeto
W4 = gammas*Lt*hp*1 m // Relleno sobre el talón (EV)
W5 = gammas*Lp*(Df - hz)*1 m // Relleno sobre la punta (EV)
x1 = B/2 // Brazos respecto a la punta
x2 = Lp + t2/2
x3 = Lp + bc + t1/2
x4 = Lp + t2 + Lt/2
x5 = Lp/2
## Empujes del relleno (EH, LS) — Rankine
Ka = tan(45 deg - phis/2)^2 // Coeficiente de empuje activo (3.11.5.3)
EH = 0.5*Ka*gammas*H^2*1 m // Empuje del relleno, aplicado a H/3
heq = heqLRFD(H) // Altura equivalente por sobrecarga vehicular (Tabla 3.11.6.4-1)
LS = Ka*gammas*heq*H*1 m // Empuje por sobrecarga, aplicado a H/2
LSv = gammas*heq*Lt*1 m // Peso de la sobrecarga sobre el talón
## Sismo (EQ) — Mononobe–Okabe (A11.3.1) e inercias
thq = atan(kh) -> deg // Ángulo sísmico θ = atan[kh/(1 − kv)], kv = 0
KAE = cos(phis - thq)^2/(cos(thq)^2*(1 + sqrt(sin(phis)*sin(phis - thq)/cos(thq)))^2) // KAE con δ = 0, β = 0, i = 0 (paramento virtual)
EAE = 0.5*KAE*gammas*H^2*1 m // Empuje activo sísmico total
DEAE = EAE - EH // Incremento dinámico, aplicado a 0.6H (Seed y Whitman)
EQw = (W1*hz/2 + W2*(hz + (hp - hb)/2) + W3*(H - hb/2) + W4*(hz + hp/2))/(W1 + W2 + W3 + W4) // Altura de la resultante de las fuerzas de inercia
Fi = kh*(W1 + W2 + W3 + W4) // Fuerza de inercia del estribo y del relleno sobre el talón
EQs = kh*RDC*1 m // Fuerza sísmica longitudinal de la superestructura en la cajuela
ys = H - hb // Altura de la cajuela sobre el fondo de la zapata
# Estabilidad
## Momentos respecto a la punta (por metro)
MDCr = W1*x1 + W2*x2 + W3*x3 -> tonf*m // Pesos propios
MEVr = W4*x4 + W5*x5 -> tonf*m // Relleno
WDC = W1 + W2 + W3 // Suma de pesos propios
WEV = W4 + W5
PDC = RDC*1 m // Reacciones de la superestructura
PDW = RDW*1 m
PLL = RLL*1 m
PBR = BR*1 m
MEH = EH*H/3 // Momentos de vuelco
MLS = LS*H/2
MBR = PBR*(H + 1.80 m)
## Resistencia Ia (cargas verticales mínimas)
"La reacción de carga viva es transitoria y estabilizadora: para excentricidad y deslizamiento se omite (caso más desfavorable, C11.5.6), aunque el frenado BR se mantiene.
Va = 0.90*(WDC + PDC) + 0.65*PDW + 1.00*WEV // Fuerza vertical (sin LL estabilizadora)
Ha = 1.50*EH + 1.75*LS + 1.75*PBR // Fuerza horizontal
Mra = 0.90*(MDCr + PDC*xR) + 0.65*PDW*xR + 1.00*MEVr // Momento estabilizador
Mva = 1.50*MEH + 1.75*MLS + 1.75*MBR // Momento de vuelco
ea = B/2 - (Mra - Mva)/Va // Excentricidad
check abs(ea) <= B/3 // Excentricidad (10.6.3.3, 11.6.3.3)
Rta = 0.80*Va*tan(phif) // Resistencia al deslizamiento, φτ = 0.80 (Tabla 10.5.5.2.2-1)
check Ha <= Rta // Deslizamiento (10.6.3.4)
## Resistencia Ib (cargas verticales máximas)
Vb = 1.25*(WDC + PDC) + 1.50*PDW + 1.35*WEV + 1.75*(PLL + LSv) // EV = 1.35 (Tabla 3.4.1-2)
Mrb = 1.25*(MDCr + PDC*xR) + 1.50*PDW*xR + 1.35*MEVr + 1.75*(PLL*xR + LSv*x4)
eb = B/2 - (Mrb - Mva)/Vb
check abs(eb) <= B/3 // Excentricidad
qb = Vb/((B - 2*eb)*1 m) -> tonf/m^2 // Presión uniforme sobre B' (10.6.3.1.5)
check qb <= 0.45*qn // Capacidad portante, φb = 0.45 (Tabla 10.5.5.2.2-1)
## Evento Extremo I
"Cargas permanentes con $\\gamma_p$ (Tabla 3.4.1-1): mínimos (DC 0.90, DW 0.65, EV 1.00) para excentricidad y deslizamiento y máximos (1.25, 1.50, 1.35) para la presión de contacto. El empuje total sísmico $E_{AE}$ (estático + incremento de Mononobe–Okabe) se toma con factor 1.0, como acción EQ (11.6.5).
Hc = EH + DEAE + Fi + EQs + gEQ*(LS + PBR) // EH + incremento M-O + inercias + superestructura
Mvc = MEH + DEAE*0.6*H + Fi*EQw + EQs*ys + gEQ*(MLS + MBR) -> tonf*m // Momento de vuelco
Vee = 0.90*(WDC + PDC) + 0.65*PDW + 1.00*WEV // Cargas verticales mínimas (sin LL estabilizadora)
Mrc = 0.90*(MDCr + PDC*xR) + 0.65*PDW*xR + 1.00*MEVr
ec = B/2 - (Mrc - Mvc)/Vee
emaxc = (2/3 + (0.8 - 2/3)*gEQ)*B/2 // Interpolación entre B/3 (γEQ = 0) y 0.40B (γEQ = 1) (11.6.5.1)
check abs(ec) <= emaxc // Excentricidad en sismo
check Hc <= 1.00*Vee*tan(phif) // Deslizamiento, φ = 1.0 (11.5.8)
Vec = 1.25*(WDC + PDC) + 1.50*PDW + 1.35*WEV + gEQ*PLL // Cargas verticales máximas
Mrcx = 1.25*(MDCr + PDC*xR) + 1.50*PDW*xR + 1.35*MEVr + gEQ*PLL*xR
ecx = B/2 - (Mrcx - Mvc)/Vec
qc = Vec/((B - 2*ecx)*1 m) -> tonf/m^2 // Presión uniforme sobre B' = B − 2e
check qc <= 1.00*qn // Capacidad portante en sismo, φ = 1.0 (10.5.5.3.3)`),
    { type: 'estribo', H: 'H', B: 'B', hz: 'hz', punta: 'Lp', t2: 't2', t1: 't1', hb: 'hb', Df: 'Df', Ka: 'Ka', gs: 'gammas', heq: 'heq', titulo: 'Geometría del estribo, empujes EH y LS y reacciones de la superestructura' },
    calc(`# Diseño estructural
phif1 = 0.90 // Flexión (5.5.4.2)
phiv = 0.90 // Cortante
## Pantalla — sección en la unión con la zapata
hs = hp // Altura de la pantalla
EHs = 0.5*Ka*gammas*hs^2*1 m // Empuje sobre la pantalla
LSs = Ka*gammas*heq*hs*1 m
Mus = max(1.50*EHs*hs/3 + 1.75*LSs*hs/2 + 1.75*PBR*(hs + 1.80 m), EHs*hs/3 + 0.5*Ka*gammas*hs^2*(KAE/Ka - 1)*1 m*0.6*hs + kh*(W2*(hp - hb)/2 + W3*(hp - hb/2)) + EQs*(hp - hb) + gEQ*(LSs*hs/2 + PBR*(hs + 1.80 m))) -> tonf*m // Máx. (Resistencia I; Evento Extremo I)
Vus = max(1.50*EHs + 1.75*LSs + 1.75*PBR, EHs + 0.5*Ka*gammas*hs^2*(KAE/Ka - 1)*1 m + kh*(W2 + W3) + EQs + gEQ*(LSs + PBR)) -> tonf
barP = 8 // Varilla vertical de la pantalla (cara del relleno) [6 : 3/4"|8 : 1"|9 : 1 1/8"]
dps = t2 - 7.5 cm - db(barP)/2 // Peralte efectivo (recubrimiento 75 mm, Tabla 5.10.1-1)
Asps = 0.85*fc*100 cm/fy*(dps - sqrt(max(dps^2 - 2*Mus/(0.85*phif1*fc*100 cm), 0 cm^2))) // Acero requerido por metro
sps = max(rounddown(min(Ab(barP)*100 cm/Asps, 45 cm), 2.5 cm), 5 cm) // Espaciamiento
Asp = Ab(barP)*100 cm/sps
phiMp = phif1*Asp*fy*(dps - Asp*fy/(2*0.85*fc*100 cm)) -> tonf*m
check Mus <= phiMp // Flexión en la base de la pantalla
Mcrp = 1.6*0.67*frLRFD(fc)*100 cm*t2^2/6 -> tonf*m // γ3·γ1·fr·S (5.6.3.3)
check phiMp >= min(Mcrp, 1.33*Mus) // Acero mínimo
Vcp = 0.083*2*sqrtMPa(fc)*100 cm*0.9*dps -> tonf // Vc con β = 2 (5.7.3.3), dv = 0.9d
check Vus <= phiv*Vcp // Cortante sin estribos
## Punta (Resistencia Ib)
qmaxb = si(abs(eb) <= B/6, Vb/(B*1 m)*(1 + 6*abs(eb)/B), 2*Vb/(3*(B/2 - abs(eb))*1 m)) // Presión máxima: trapecial si e ≤ B/6, triangular si no (diseño estructural)
Mut = (qmaxb*Lp^2/2*1 m - 0.90*gammac*hz*Lp^2/2*1 m) -> tonf*m // Momento en la cara de la pantalla
dz = hz - 7.5 cm - db(barP)/2 // Peralte efectivo de la zapata
Aspt = 0.85*fc*100 cm/fy*(dz - sqrt(max(dz^2 - 2*Mut/(0.85*phif1*fc*100 cm), 0 cm^2)))
spt = max(rounddown(min(Ab(barP)*100 cm/Aspt, 45 cm), 2.5 cm), 5 cm)
phiMt = phif1*Ab(barP)*100 cm/spt*fy*(dz - Ab(barP)*100 cm/spt*fy/(2*0.85*fc*100 cm)) -> tonf*m
check Mut <= phiMt // Flexión en la punta
Vut = (qmaxb - 0.90*gammac*hz)*(Lp - dz)*1 m -> tonf // Cortante a dv de la cara
check Vut <= phiv*0.083*2*sqrtMPa(fc)*100 cm*0.9*dz // Cortante en la punta
## Talón (Resistencia Ib, sin reacción del suelo: conservador)
Muh = (1.35*gammas*hp + 1.25*gammac*hz + 1.75*gammas*heq)*Lt^2/2*1 m -> tonf*m // Momento en la cara posterior de la pantalla
Asph = 0.85*fc*100 cm/fy*(dz - sqrt(max(dz^2 - 2*Muh/(0.85*phif1*fc*100 cm), 0 cm^2)))
sph = max(rounddown(min(Ab(barP)*100 cm/Asph, 45 cm), 2.5 cm), 5 cm)
phiMh = phif1*Ab(barP)*100 cm/sph*fy*(dz - Ab(barP)*100 cm/sph*fy/(2*0.85*fc*100 cm)) -> tonf*m
check Muh <= phiMh // Flexión en el talón
Vuh = (1.35*gammas*hp + 1.25*gammac*hz + 1.75*gammas*heq)*(Lt - dz)*1 m -> tonf
check Vuh <= phiv*0.083*2*sqrtMPa(fc)*100 cm*0.9*dz // Cortante en el talón
check min(sps, spt, sph) >= db(barP) + max(1.5*db(barP), 3.8 cm) // Separación libre mínima entre barras (5.10.3.1.1)
"Refuerzo: pantalla #{barP} @ {sps} (cara del relleno); punta #{barP} @ {spt} (inferior); talón #{barP} @ {sph} (superior). Refuerzo de temperatura y contracción en ambas caras según 5.10.6.`),
    summary(),
  ],
};

// =====================================================================
//  5) PILAR (PÓRTICO DE DOS COLUMNAS) CON SISMO AASHTO / MTC
// =====================================================================
const pilar = {
  id: 'br-pilar', pais: 'PE', cat: CAT, icon: 'column', settings: {},
  name: 'Pilar de puente con sismo (pórtico de dos columnas)',
  normas: NORMAS_PE + ' · AASHTO Guide Specifications for LRFD Seismic Bridge Design (referencial)',
  desc: 'Pilar intermedio de puente continuo 2 × 25 m: masa sísmica, rigidez y periodo en ambas direcciones, espectro AASHTO/MTC (Fpga, Fa, Fv), R (Tabla 3.10.7.1-1), combinación 100 %–30 %, diagrama P–M de las columnas, cortante y confinamiento.',
  titulo: 'Diseño sísmico de pilar de dos columnas — AASHTO LRFD 3.10 / MTC 2018',
  blocks: [
    text(`# Generalidades
## Descripción
Pilar central de un puente continuo de dos tramos de 25 m, formado por **dos columnas** de concreto armado de 1.20 × 1.20 m y 8.0 m de altura libre, empotradas en la cimentación y unidas por una viga cabezal. La superestructura se apoya en el pilar con apoyos fijos (transmite la fuerza sísmica longitudinal) y en los estribos con apoyos móviles.

## Normas y referencias
- AASHTO LRFD 9.ª ed., 3.10 (sismo: 3.10.3 factores de sitio, 3.10.4 espectro, 3.10.6 zonas, 3.10.7 factor $R$, 3.10.8 combinación de efectos, 3.10.9 fuerzas de diseño), 4.7.4.3 (método de carga uniforme), 5.10.11 (detallado sísmico de columnas).
- Manual de Puentes MTC (2018), 2.4.3.11: espectro con Tr = 1000 años (PGA, Ss, S1 de los mapas de isoaceleraciones).
- Priestley, Seible y Calvi, *Seismic Design and Retrofit of Bridges*; Rodríguez Serquén, cap. XI.

## Modelo
Método de un modo con carga uniforme (4.7.4.3.2c): superestructura rígida, masa concentrada en el cabezal, rigidez lateral de las columnas con inercia fisurada $I_e = 0.5\\,I_g$.`),
    calc(`# Datos
## Superestructura y pilar
L1 = 25.0 m // Luz de cada tramo (puente continuo 2 × 25 m)
wDCs = 10.20 tonf/m // Peso DC de la superestructura por metro
wDWs = 0.81 tonf/m // Peso DW por metro
NL = 2 // Carriles de diseño
ncol = 2 // Número de columnas
bcol = 1.20 m // Lado de la columna (sección cuadrada)
Hc = 8.00 m // Altura libre de la columna (empotramiento a eje del cabezal)
Wcab = 2.40 tonf/m^3*1.2 m*1.4 m*7.0 m -> tonf // Peso de la viga cabezal 1.20 × 1.40 × 7.00 m
fc = 280 kgf/cm^2 // f'c de las columnas
fy = 4200 kgf/cm^2 // Acero Gr. 60
Ec = EcLRFD(fc) -> kgf/cm^2 // Módulo de elasticidad (5.4.2.4-1)
## Peligro sísmico (mapas MTC, Tr = 1000 años)
PGA = 0.40 // Aceleración pico del terreno en roca, g
Ss = 0.95 // Aceleración espectral a 0.2 s en roca, g
S1 = 0.38 // Aceleración espectral a 1.0 s en roca, g
sitio = 4 // Clase de sitio (Tabla 3.10.3.1-1) [2 : B roca|3 : C suelo muy denso|4 : D suelo rígido|5 : E suelo blando]
imp = 2 // Categoría operativa (3.10.5) [1 : Crítico|2 : Esencial|3 : Otros]
# Espectro de diseño (3.10.4)
Fpga = FpgaLRFD(PGA, sitio) // Tabla 3.10.3.2-1
Fa = FaLRFD(Ss, sitio) // Tabla 3.10.3.2-2
Fv = FvLRFD(S1, sitio) // Tabla 3.10.3.2-3
As = Fpga*PGA // (3.10.4.2-2)
SDS = Fa*Ss // (3.10.4.2-3)
SD1 = Fv*S1 // (3.10.4.2-6)
Ts = SD1/SDS*1 s // Periodo de esquina
T0 = 0.2*Ts
zona = zonaLRFD(SD1) // Zona sísmica (Tabla 3.10.6-1)
R = si(imp == 1, 1.5, si(imp == 2, 3.5, 5.0)) // Pórtico de varias columnas (Tabla 3.10.7.1-1)
# Masa, rigidez y periodo
W = 1.25*(wDCs + wDWs)*L1 + Wcab + ncol*2.40 tonf/m^3*bcol^2*Hc/2 -> tonf // Reacción continua 1.25wL + cabezal + mitad de columnas
Ig = bcol^4/12 -> m^4 // Inercia bruta de una columna
Ie = 0.5*Ig // Inercia fisurada efectiva
KL = ncol*3*Ec*Ie/Hc^3 -> tonf/m // Rigidez longitudinal: columnas en voladizo
KT = ncol*12*Ec*Ie/Hc^3 -> tonf/m // Rigidez transversal: pórtico con cabezal rígido
TL = 2*pi*sqrt(W/(9.81 m/s^2*KL)) -> s // Periodo longitudinal (4.7.4.3.2c)
TT = 2*pi*sqrt(W/(9.81 m/s^2*KT)) -> s // Periodo transversal
CsL = CsmLRFD(TL, As, SDS, SD1) // Coeficiente sísmico elástico longitudinal (3.10.4.2)
CsT = CsmLRFD(TT, As, SDS, SD1) // Coeficiente sísmico elástico transversal
FeL = CsL*W // Fuerza elástica longitudinal
FeT = CsT*W // Fuerza elástica transversal
DeltaL = FeL/KL -> cm // Desplazamiento elástico longitudinal
"Espectro: $A_s$ = {As}, $S_{DS}$ = {SDS}, $S_{D1}$ = {SD1}; zona sísmica {zona}; periodos $T_L$ = {TL} y $T_T$ = {TT}.`),
    { type: 'plot', expr: 'CsmLRFD(x, As, SDS, SD1); CsmLRFD(x, As, SDS, SD1)/R', var: 'x', desde: '0', hasta: '3', puntos: '300', xlabel: 'Periodo T [s]', ylabel: 'Csm [g]', leyenda: true, nombres: 'Espectro elástico Csm (5 %); Csm/R (diseño de columnas)', titulo: 'Espectro de respuesta AASHTO LRFD 3.10.4 con factores de sitio (MTC 2018)' },
    calc(`# Fuerzas de diseño en las columnas
## Momentos sísmicos reducidos (3.10.7.1)
MLc = FeL/R/ncol*Hc -> tonf*m // Longitudinal: voladizo, momento en la base
MTc = FeT/R/ncol*Hc/2 -> tonf*m // Transversal: doble curvatura
M1 = sqrt(MLc^2 + (0.3*MTc)^2) // 100 % L + 30 % T (3.10.8)
M2 = sqrt((0.3*MLc)^2 + MTc^2) // 30 % L + 100 % T
MEQ = max(M1, M2) -> tonf*m // Momento sísmico resultante de diseño
## Cargas axiales por columna
PD = (1.25*wDCs*L1 + Wcab)/ncol + 2.40 tonf/m^3*bcol^2*Hc -> tonf // Permanente DC
PW = 1.25*wDWs*L1/ncol // DW
PLL = NL*mpLRFD(NL)*(VtruckHL93(2*L1)*1.33 + 1.25*0.952 tonf/m*L1)/ncol -> tonf // LL+IM aproximada (reacción del apoyo central)
PEQe = MTc*2/(7.0 m - bcol)*1.0 // Variación axial por volteo transversal del pórtico (aprox.)
## Combinaciones
Pu1 = 1.25*PD + 1.50*PW + 1.75*PLL // Resistencia I
Mu1 = 1.75*BRLRFD(2*L1, NL)/ncol*(Hc + 2.5 m) -> tonf*m // Resistencia I: frenado a 1.80 m sobre la rasante
Pu2 = 1.25*PD + 1.50*PW + 0.5*PLL + PEQe // Evento Extremo I (máx. compresión): γp máximos, γEQ = 0.5 (Tabla 3.4.1-1)
Pu3 = 0.90*PD + 0.65*PW - PEQe // Evento Extremo I (mín. compresión): γp mínimos, sin carga viva
## Esbeltez y magnificación de momentos en Resistencia I (5.6.4.3)
Kcol = 2.0 // Factor de longitud efectiva longitudinal: columna en voladizo con desplazamiento lateral
rcol = 0.30*bcol // Radio de giro de la sección rectangular (5.6.4.3)
KLr = Kcol*Hc/rcol // Esbeltez
check KLr <= 100 // Método aproximado aplicable (KLu/r < 100); si no, análisis de segundo orden (5.6.4.3)
EIcol = Ec*Ig/2.5 -> tonf*m^2 // EI = Ec Ig/2.5 (5.6.4.3-2), βd ≈ 0 para la carga lateral de frenado
Pe = pi^2*EIcol/(Kcol*Hc)^2 -> tonf // Carga de pandeo de Euler de una columna
check Pu1 < 0.75*Pe // Estabilidad del pórtico (φK = 0.75)
deltas = 1/(1 - ncol*Pu1/(0.75*ncol*Pe)) // Magnificador de momentos con desplazamiento lateral (4.5.3.2.2b-2)
Mu1m = deltas*Mu1 // Momento magnificado de Resistencia I
"Se verifican las columnas con el diagrama de interacción de AASHTO LRFD 5.6.4 con los factores $\\phi$ de 5.5.4.2 (0.75 en secciones controladas por compresión → 0.90 controladas por tracción) para Resistencia I y, para Evento Extremo I, $\\phi = 0.90$ (5.10.11.4.1b, zonas sísmicas 3 y 4). La resistencia axial máxima es $0.80\\,\\phi P_0$ (5.6.4.4-3).`),
    { type: 'pmLRFD', b: 'bcol', h: 'bcol', fc: 'fc', fy: 'fy', dp: '7.5', nx: '8', ny: '6', barra: '10', phiEE: 'si(zona >= 3, 0.90, 1.00)', demandas: 'Pu1, Mu1m // Resistencia I\nPu2, MEQ // Evento Extremo I (Pmáx)\nPu3, MEQ // Evento Extremo I (Pmín)', titulo: 'Diagrama de interacción de la columna 1.20 × 1.20 m (28 #10)' },
    calc(`## Requisito de desplazamiento P–Δ (4.7.4.5)
Rd = si(TL < 1.25*Ts, (1 - 1/R)*1.25*Ts/TL + 1/R, 1) // Amplificación de desplazamientos para periodos cortos (4.7.4.5-2)
DeltaD = Rd*DeltaL -> cm // Desplazamiento de diseño longitudinal
check Pu2*DeltaD <= 0.25*phiMnEE(Pu2) // ΔPu ≤ 0.25 φMn (4.7.4.5-1)
# Detallado sísmico de las columnas (5.10.11.4)
check rhog >= 0.01 and rhog <= 0.04 // Cuantía longitudinal 1 % – 4 % (5.10.11.4.1a)
## Cortante (3.10.9.4.3 y 5.10.11.4.1c)
VuL = max(FeL, FeT)/ncol // Cortante con la fuerza elástica no reducida (R = 1) en la dirección más desfavorable, cota superior de la rótula plástica (3.10.9.4.3)
Ag = bcol^2
Vc = si(Pu3 > 0.10*fc*Ag, 0.083*2*sqrtMPa(fc)*bcol*0.9*(bcol - 7.5 cm), 0 tonf) -> tonf // Vc en zona de rótula (Vc = 0 si Pu < 0.10 f'c Ag)
est = 5 // Estribo / gancho [4 : 1/2"|5 : 5/8"]
nr = 5 // Ramas de estribo en cada dirección (estribo perimetral + ganchos)
se = 10 cm // Espaciamiento en la zona de rótula plástica
dvc = 0.9*(bcol - 7.5 cm) // Peralte efectivo de corte
Vs = nr*Ab(est)*fy*dvc/se -> tonf
check VuL <= 0.90*min(Vc + Vs, 0.25*fc*bcol*dvc) // Resistencia a cortante
## Confinamiento (5.10.11.4.1d)
hcn = bcol - 2*5 cm // Núcleo confinado
Acn = hcn^2 // Área del núcleo
Ash1 = 0.30*se*hcn*fc/fy*(Ag/Acn - 1) // (5.10.11.4.1d-3)
Ash2 = 0.12*se*hcn*fc/fy // (5.10.11.4.1d-4)
check nr*Ab(est) >= max(Ash1, Ash2) // Refuerzo transversal de confinamiento
check se <= min(0.25*bcol, 10 cm) // Espaciamiento máximo en la rótula: ≤ b/4 y 100 mm (5.10.11.4.1e)
Lrot = max(bcol, Hc/6, 45 cm) // Longitud de la zona de rótula plástica (5.10.11.4.1e)
"Estribos #{est} con {nr} ramas por dirección @ {se} en {Lrot} desde la base y bajo el cabezal; en el resto, el espaciamiento puede duplicarse sin exceder 30 cm.
# Longitud de apoyo en los estribos (4.7.4.4)
Nmin = NpctLRFD(zona, As)*NapLRFD(2*L1, Hc, 0 deg) // N por zona sísmica
"La cajuela de los estribos debe tener al menos {Nmin} de longitud de apoyo.`),
    summary(),
  ],
};

// =====================================================================
//  6) APOYO ELASTOMÉRICO REFORZADO CON ACERO (NEOPRENO ZUNCHADO)
// =====================================================================
const neopreno = {
  id: 'br-neopreno', pais: 'PE', cat: CAT, icon: 'bridge', settings: { sys: 'si' },
  name: 'Apoyo elastomérico reforzado (neopreno zunchado) — Métodos A y B',
  normas: 'AASHTO LRFD 9.ª ed. Secc. 14 (14.4, 14.6, 14.7.5 Método B, 14.7.6 Método A) · Manual de Puentes MTC 2018 · AASHTO M 251',
  desc: 'Apoyo de 300 × 450 mm con 4 capas internas de 12 mm: factor de forma, compresión (Método A), deformaciones por corte (Método B: axial, rotación y corte, estáticas y cíclicas), estabilidad, zunchos de acero, deflexión y anclaje.',
  titulo: 'Diseño de apoyo elastomérico reforzado con acero — AASHTO LRFD Sección 14',
  blocks: [
    text(`# Generalidades
Apoyo de **neopreno zunchado** (elastómero con láminas de acero vulcanizadas) bajo una viga interior del puente viga-losa de 20 m. El apoyo permite la rotación de la viga y los desplazamientos longitudinales por temperatura, contracción y flujo plástico mediante deformación por corte del elastómero.

## Normas y referencias
- AASHTO LRFD Bridge Design Specifications, 9.ª ed., Secc. 14: 14.4.2.1 (rotaciones de diseño, +0.005 rad de tolerancia), 14.7.5 (**Método B**), 14.7.6 (**Método A**), 14.8.3 (anclaje). Especificación de materiales AASHTO M 251.
- Manual de Puentes MTC (2018) y Rodríguez Serquén, *Puentes con AASHTO-LRFD*, cap. XII (dispositivos de apoyo).
- NCHRP Report 596, *Rotation Limits for Elastomeric Bearings* (base de las ecuaciones del Método B).

## Criterio
Estado límite de **Servicio** (γ = 1.0). Las cargas estáticas (st) son DC + DW; las cíclicas (cy) corresponden a la carga viva. Para las verificaciones de compresión se toma el módulo de corte mínimo del rango de dureza y, para las fuerzas transmitidas, el máximo (14.7.5.2).`),
    calc(`# Datos
## Cargas de servicio por apoyo (viga interior, L = 20 m)
PDC = 255 kN // Reacción por carga muerta DC
PDW = 23 kN // Reacción por superficie de rodadura DW
PLL = 342 kN // Reacción por carga viva LL+IM (con factor de distribución de cortante)
thst = 0.0030 // Rotación estática por cargas permanentes y contraflecha (rad)
thcy = 0.0020 // Rotación por carga viva (rad)
Lexp = 10.0 m // Longitud de dilatación (desde el punto fijo, mitad de la luz)
DT = 35 // Rango de temperatura de diseño (°C, Método A / MTC costa)
alfa = 10.8e-6 // Coeficiente de dilatación del concreto (1/°C, 5.4.2.2)
## Apoyo
Lb = 300 mm // Dimensión paralela al eje del puente
Wb = 450 mm // Dimensión transversal
hri = 12 mm // Espesor de cada capa interior de elastómero
nint = 4 // Número de capas interiores
hrc = 6 mm // Espesor de las capas exteriores (≤ 0.7 hri)
hs = 3 mm // Espesor de los zunchos de acero
Fys = 250 MPa // Fluencia de los zunchos (ASTM A36)
dur = 60 // Dureza Shore A [50 : 50|60 : 60|70 : 70]
Gmin = si(dur == 50, 0.66 MPa, si(dur == 60, 0.90 MPa, 1.38 MPa)) // Módulo de corte mínimo (14.7.6.2)
Gmax = si(dur == 50, 0.90 MPa, si(dur == 60, 1.38 MPa, 2.07 MPa)) // Módulo de corte máximo
# Propiedades del apoyo
check hrc <= 0.7*hri // Capas exteriores ≤ 70 % de las interiores (14.7.5.1)
hrt = nint*hri + 2*hrc // Espesor total de elastómero
Hbt = hrt + (nint + 1)*hs // Altura total del apoyo
Ab = Lb*Wb -> mm^2 // Área en planta
Si = SbearLRFD(Lb, Wb, hri) // Factor de forma de la capa interior (14.7.5.1-1)
n = nint + 0.5*2 // Número de capas para rotación: interiores + mitad de cada exterior gruesa (14.7.5.3.3)
## Esfuerzos de compresión
sst = (PDC + PDW)/Ab -> MPa // Esfuerzo estático
scy = PLL/Ab -> MPa // Esfuerzo cíclico
ss = sst + scy // Esfuerzo total de servicio
## Desplazamiento de diseño por corte
Ds = 1.2*alfa*DT*Lexp + 0.0002*Lexp -> mm // TU con γ = 1.2 + contracción y flujo plástico (0.0002)
# Método A (14.7.6)
check Si^2/nint < 22 // Límite de aplicabilidad S²/n < 22, apoyo rectangular (14.7.6.1)
check ss <= 1.25*Gmin*Si // Compresión σs ≤ 1.25 G S (14.7.6.3.2-7)
check ss <= 8.6 MPa // σs ≤ 1.25 ksi (8.6 MPa)
check hrt >= 2*Ds // Deformación por corte hrt ≥ 2Δs (14.7.6.3.4-1)
check Hbt <= min(Lb, Wb)/3 // Estabilidad: espesor total ≤ L/3 y W/3 (14.7.6.3.6)
# Método B (14.7.5)
Da = 1.4 // Coeficiente para apoyo rectangular (14.7.5.3.3)
Dr = 0.5
thsd = thst + 0.005 // Rotación estática + tolerancia de construcción (14.4.2.1)
gast = Da*sst/(Gmin*Si) // Deformación por carga axial estática (14.7.5.3.3-3)
gacy = Da*scy/(Gmin*Si) // Deformación por carga axial cíclica
grst = Dr*(Lb/hri)^2*thsd/n // Deformación por rotación estática (14.7.5.3.3-6)
grcy = Dr*(Lb/hri)^2*thcy/n // Deformación por rotación cíclica
gsst = Ds/hrt // Deformación por corte estática (14.7.5.3.3-9)
gscy = 0 // Sin desplazamientos cíclicos significativos (frenado absorbido por el apoyo fijo)
check gast <= 3.0 // γa,st ≤ 3.0 (14.7.5.3.3-1)
check gast + grst + gsst + 1.75*(gacy + grcy + gscy) <= 5.0 // Suma de deformaciones ≤ 5.0 (14.7.5.3.3-2)
check gsst <= 0.5 // γs ≤ 0.5 (14.7.5.3.3-10)
## Estabilidad (14.7.5.3.4)
Ast = 1.92*(hrt/Lb)/sqrt(1 + 2*Lb/Wb) // A (14.7.5.3.4-2)
Bst = 2.67/((Si + 2)*(1 + Lb/(4*Wb))) // B (14.7.5.3.4-3)
scr = si(2*Ast <= Bst, 100 MPa, Gmin*Si/(2*Ast - Bst)) // Estable si 2A ≤ B; si no, σs ≤ GS/(2A − B) (tablero libre de trasladarse)
check ss <= scr // Estabilidad del apoyo (14.7.5.3.4-1 y -4)
## Refuerzo de acero (14.7.5.3.5)
check hs >= 3*hri*ss/Fys // Servicio (14.7.5.3.5-1)
check hs >= 2*hri*scy/(165 MPa) // Fatiga, ΔFTH = 165 MPa (24 ksi, categoría A) (14.7.5.3.5-2)
## Deflexión instantánea por carga viva (14.7.5.3.6, C14.7.5.3.6)
epsLL = scy/(6*Gmin*Si^2) // Deformación axial aproximada de la capa
dLL = epsLL*(nint*hri + 2*hrc) -> mm // Deflexión por carga viva
check epsLL <= 0.07 // Deflexión de cada capa ≤ 0.07 hri (práctica recomendada)
# Fuerza horizontal y anclaje (14.6.3.1, 14.8.3.1)
Hbu = Gmax*Ab*Ds/hrt -> kN // Fuerza de corte transmitida a la subestructura (G máx.)
check Hbu <= 0.2*(PDC + PDW) // Sin deslizamiento: Hbu ≤ 0.2 P permanente (no requiere anclaje)
"Apoyo adoptado: {Lb} × {Wb} con {nint} capas interiores de {hri}, capas exteriores de {hrc} y {nint + 1} zunchos de {hs}; altura total {Hbt}. Fuerza horizontal transmitida {Hbu}.`),
    summary(),
  ],
};

// =====================================================================
//  7) ANÁLISIS SÍSMICO AASHTO LRFD / MTC 2018
// =====================================================================
const sismo = {
  id: 'br-sismo', pais: 'PE', cat: CAT, icon: 'spectrum', settings: {},
  name: 'Análisis sísmico de puentes AASHTO LRFD / MTC (espectro, zona y N)',
  normas: 'AASHTO LRFD 9.ª ed. Art. 3.10, 4.7.4 · Manual de Puentes MTC (2018) 2.4.3.11',
  desc: 'Factores de sitio Fpga, Fa, Fv con interpolación, espectro de diseño Csm (gráfico y tabla), zona sísmica, método de análisis mínimo, factores R, método de carga uniforme para un puente continuo y longitud mínima de apoyo N.',
  titulo: 'Análisis sísmico de puente — AASHTO LRFD 3.10 / Manual de Puentes MTC 2018',
  blocks: [
    text(`# Generalidades
El Manual de Puentes del MTC (2018) adopta el procedimiento de AASHTO LRFD: los parámetros de peligro **PGA**, **S_s** (0.2 s) y **S_1** (1.0 s) en roca (clase B) se obtienen de los mapas de isoaceleraciones para un periodo de retorno de **1000 años** (7 % de probabilidad de excedencia en 75 años) y se corrigen por la clase de sitio.

## Clasificación del sitio (Tabla 3.10.3.1-1)
| Clase | Descripción | $\\bar v_s$ (m/s) |
|---|---|---|
| A | Roca dura | > 1500 |
| B | Roca | 760 – 1500 |
| C | Suelo muy denso y roca blanda | 360 – 760 |
| D | Suelo rígido | 180 – 360 |
| E | Suelo blando | < 180 |
| F | Requiere evaluación específica | — |

## Método
1. Factores de sitio (Tablas 3.10.3.2-1 a -3) con interpolación lineal.
2. Espectro de respuesta elástico (5 % de amortiguamiento, 3.10.4.2): $C_{sm} = A_s + (S_{DS} - A_s)\\,T/T_0$ para $T < T_0$; $C_{sm} = S_{DS}$ para $T_0 \\le T \\le T_S$; $C_{sm} = S_{D1}/T$ para $T > T_S$.
3. Zona sísmica (Tabla 3.10.6-1), método mínimo de análisis (Tabla 4.7.4.3.1-1) y factores de modificación de respuesta $R$ (Tabla 3.10.7.1-1).
4. **Método de carga uniforme** (4.7.4.3.2c) en dirección longitudinal y longitud mínima de apoyo $N$ (4.7.4.4).`),
    calc(`# Peligro sísmico y espectro
PGA = 0.45 // Aceleración pico del terreno en roca (g), mapa MTC Tr = 1000 años
Ss = 1.05 // Aceleración espectral a 0.2 s en roca (g)
S1 = 0.42 // Aceleración espectral a 1.0 s en roca (g)
sitio = 4 // Clase de sitio [1 : A roca dura|2 : B roca|3 : C suelo muy denso|4 : D suelo rígido|5 : E suelo blando]
imp = 2 // Categoría operativa del puente (3.10.5) [1 : Crítico|2 : Esencial|3 : Otros]
Fpga = FpgaLRFD(PGA, sitio) // Factor de sitio para PGA (Tabla 3.10.3.2-1)
Fa = FaLRFD(Ss, sitio) // Factor de sitio de periodo corto (Tabla 3.10.3.2-2)
Fv = FvLRFD(S1, sitio) // Factor de sitio de periodo largo (Tabla 3.10.3.2-3)
As = Fpga*PGA // Coeficiente de aceleración efectiva (3.10.4.2-2)
SDS = Fa*Ss // Aceleración espectral de periodo corto (3.10.4.2-3)
SD1 = Fv*S1 // Aceleración espectral a 1.0 s (3.10.4.2-6)
Ts = SD1/SDS*1 s // Periodo de esquina TS
T0 = 0.2*Ts // Periodo T0
zona = zonaLRFD(SD1) // Zona sísmica: 1 (SD1 ≤ 0.15), 2 (≤ 0.30), 3 (≤ 0.50), 4 (> 0.50) (Tabla 3.10.6-1)
Tv = [0, 0.05, T0/(1 s), Ts/(1 s), 0.75, 1.0, 1.5, 2.0, 3.0, 4.0] // Periodos para la tabla (s)
Cv = CsmLRFD(Tv, As, SDS, SD1) // Ordenadas espectrales (g)`),
    { type: 'plot', expr: 'CsmLRFD(x, As, SDS, SD1)', var: 'x', desde: '0', hasta: '4', puntos: '400', xlabel: 'Periodo T [s]', ylabel: 'Csm [g]', titulo: 'Espectro de respuesta elástico de diseño (AASHTO LRFD 3.10.4, MTC 2018)' },
    { type: 'table', columnas: 'Periodo T [s] = Tv\nCsm [g] = Cv', dec: '3', titulo: 'Ordenadas del espectro de diseño' },
    text(`## Requisitos por zona sísmica
- **Método mínimo de análisis** (Tabla 4.7.4.3.1-1): los puentes de un solo tramo no requieren análisis sísmico (4.7.4.1), pero sí la longitud mínima de apoyo y la fuerza de conexión mínima; en zona 1 no se requiere análisis; en zonas 2 a 4, puentes regulares: método **unimodal (SM/UL)**; irregulares: **multimodal (MM)**, y para puentes críticos en zonas 3–4, historia de tiempo o multimodal.
- **Factores R** para subestructuras (Tabla 3.10.7.1-1) — crítico / esencial / otros: pilares tipo muro (dirección mayor) 1.5 / 1.5 / 2.0; pilotes verticales de concreto 1.5 / 2.0 / 3.0; columnas simples 1.5 / 2.0 / 3.0; pilotes de acero o compuestos 1.5 / 3.5 / 5.0; **pórticos de varias columnas 1.5 / 3.5 / 5.0**. Conexiones: superestructura–estribo 0.8; juntas de expansión 0.8; columnas–viga cabezal o superestructura 1.0; columnas–cimentación 1.0.
- **Combinación direccional** (3.10.8): 100 % de una dirección + 30 % de la ortogonal.`),
    calc(`# Método de carga uniforme — dirección longitudinal (4.7.4.3.2c)
## Puente continuo de dos tramos
Ltot = 50.0 m // Longitud total del puente (2 × 25 m)
wsup = 11.0 tonf/m // Peso de la superestructura por metro (DC + DW)
Wsub = 40 tonf // Peso participante de la subestructura (cabezal y mitad de columnas)
Klong = 4600 tonf/m // Rigidez longitudinal total de los apoyos (pilar con apoyos fijos)
po = 1 tonf/m // Carga uniforme de referencia
vsmax = po*Ltot/Klong -> m // Desplazamiento bajo po (todas las secciones se desplazan igual)
Kb = po*Ltot/vsmax -> tonf/m // Rigidez lateral del puente (4.7.4.3.2c-1)
W = wsup*Ltot + Wsub // Peso total (4.7.4.3.2c-2)
Tm = 2*pi*sqrt(W/(9.81 m/s^2*Kb)) -> s // Periodo fundamental (4.7.4.3.2c-3)
Csm = CsmLRFD(Tm, As, SDS, SD1) // Coeficiente de respuesta elástico (3.10.4.2)
pe = Csm*W/Ltot -> tonf/m // Carga sísmica uniforme equivalente (4.7.4.3.2c-4)
Fe = pe*Ltot // Fuerza sísmica elástica total
De = pe*Ltot/Kb -> cm // Desplazamiento elástico
R = si(imp == 1, 1.5, si(imp == 2, 3.5, 5.0)) // Pórtico de varias columnas (Tabla 3.10.7.1-1)
FR = Fe/R // Fuerza de diseño de la subestructura
check zona >= 1 and zona <= 4 // Zona sísmica definida
"Periodo $T_m$ = {Tm}: $C_{sm}$ = {Csm}; fuerza elástica {Fe} y de diseño {FR} con $R$ = {R}.
# Fuerzas mínimas en conexiones (3.10.9)
Fcon1 = si(As < 0.05, 0.15, 0.25)*W // Zona 1: 0.15 o 0.25 de la carga permanente tributaria (3.10.9.2)
Fcon = si(zona == 1, Fcon1, Fe/0.8) // Zonas 2–4: fuerza elástica / R de conexión (0.8)
# Longitud mínima de apoyo (4.7.4.4)
Hpil = 8.0 m // Altura promedio de las columnas que soportan el tramo hasta la junta
skew = 0 deg // Esviaje del apoyo [0 deg|15 deg|30 deg|45 deg]
Nap = NapLRFD(Ltot, Hpil, skew) // N = (200 + 0.0017L + 0.0067H)(1 + 0.000125S²) mm (4.7.4.4-1)
pctN = NpctLRFD(zona, As) // Porcentaje de N (Tabla 4.7.4.4-1)
Nreq = pctN*Nap // Longitud de apoyo requerida en los estribos
bseat = 0.60 m // Ancho de cajuela disponible
check Nreq <= bseat // Longitud de apoyo suficiente`),
    summary(),
  ],
};

// =====================================================================
//  8) ALCANTARILLA MARCO (BOX CULVERT) CON RELLENO
// =====================================================================
// Bloque reutilizable de análisis de un combo (pendiente-deflexión con simetría)
const boxCombo = (k, gDC, gEV, gEH, gLS, gLL) => `## Combinación ${k}
qt${k} = ${gDC}*wtop + ${gEV}*pEV // Carga uniforme sobre la losa superior
qL${k} = ${gLL}*pLL // Carga viva sobre la longitud c (centrada)
qb${k} = (qt${k}*Lc + qL${k}*cL + ${gDC}*2*wwall)/Lc // Reacción uniforme del suelo bajo la losa inferior
pA${k} = (${gEH}*k0*gammas*(Hf + tt/2) + ${gLS}*k0*gammas*heq)*1 m // Presión lateral en el eje de la losa superior
pB${k} = (${gEH}*k0*gammas*(Hf + tt/2 + Hcl) + ${gLS}*k0*gammas*heq)*1 m // Presión lateral en el eje de la losa inferior
FEt${k} = -(qt${k}*Lc^2/12 + qL${k}*cL*(3*Lc^2 - cL^2)/(24*Lc)) // Momento de empotramiento, losa superior (horario +)
FEb${k} = qb${k}*Lc^2/12 // Losa inferior (carga hacia arriba)
FEab${k} = pA${k}*Hcl^2/12 + (pB${k} - pA${k})*Hcl^2/30 // Muro, extremo superior
FEba${k} = -(pA${k}*Hcl^2/12 + (pB${k} - pA${k})*Hcl^2/20) // Muro, extremo inferior
thA${k} = thA(-(FEt${k} + FEab${k}), -(FEb${k} + FEba${k})) // Giro del nudo superior
thB${k} = thB(-(FEt${k} + FEab${k}), -(FEb${k} + FEba${k})) // Giro del nudo inferior
MA${k} = kt*thA${k} + FEt${k} // Momento en la esquina superior (losa)
MB${k} = kb*thB${k} + FEb${k} // Momento en la esquina inferior (losa)
Mt${k} = qt${k}*Lc^2/8 + qL${k}*cL*(2*Lc - cL)/8 + MA${k} -> tonf*m // Momento en el centro de la losa superior (tracción abajo +)
Mb${k} = qb${k}*Lc^2/8 - MB${k} -> tonf*m // Momento en el centro de la losa inferior (tracción arriba +)
Mw${k} = (pA${k} + pB${k})*Hcl^2/16 - (abs(MA${k}) + abs(MB${k}))/2 -> tonf*m // Momento a media altura del muro (tracción interior +)`;

const alcantarilla = {
  id: 'br-alcantarilla', pais: 'PE', cat: CAT, icon: 'section', settings: {},
  name: 'Alcantarilla marco de concreto armado (box culvert) con relleno',
  normas: 'AASHTO LRFD 9.ª ed. Art. 3.6.1.2.6, 3.11, 12.11 y 5.12.7.3 · Manual de Puentes MTC (2018)',
  desc: 'Alcantarilla de una celda 3.00 × 2.50 m bajo 1.50 m de relleno: cargas EV con interacción suelo-estructura, EH en reposo, LS, HL-93 distribuida a través del relleno (LLDF = 1.15), análisis del marco cerrado por pendiente-deflexión y diseño de losas y muros.',
  titulo: 'Diseño de alcantarilla marco de concreto armado 3.00 × 2.50 m — AASHTO LRFD',
  blocks: [
    text(`# Generalidades
Alcantarilla tipo **marco cerrado** de una celda, de concreto armado vaciado in situ, con luz libre de 3.00 m, altura libre de 2.50 m y **1.50 m de relleno** compactado sobre la losa superior, bajo una vía con tránsito HL-93. Se analiza una franja de 1 m en el sentido longitudinal de la alcantarilla.

## Normas y referencias
- AASHTO LRFD 9.ª ed.: 3.6.1.2.6 (distribución de la carga de rueda a través del relleno, $LLDF = 1.15$), 3.6.2.2 (IM en estructuras enterradas), 3.11.5.2 (empuje en reposo $k_0 = 1 - \\sin\\phi'_f$), 3.11.7 (reducción del 50 % del empuje lateral para momento positivo en la losa superior), 12.11.2.2 (factor de interacción suelo-estructura $F_e$), 5.12.7.3 (cortante en losas de alcantarillas), Tabla 3.4.1-2 ($\\gamma_{EV} = 1.30$ estructura rígida enterrada, $\\gamma_{EH} = 1.35$ en reposo).
- Manual de Puentes MTC (2018); Rodríguez Serquén, cap. XIII (alcantarillas).

## Modelo
Marco cerrado simétrico con ejes en el centro de los elementos. Por simetría solo hay dos giros desconocidos (esquinas superior e inferior); se resuelve por **pendiente-deflexión** sin desplazamiento lateral. Reacción del suelo uniforme bajo la losa inferior.`),
    calc(`# Datos
Bi = 3.00 m // Luz libre interior
Hi = 2.50 m // Altura libre interior
tt = 0.30 m // Espesor de la losa superior
tb = 0.30 m // Espesor de la losa inferior
tw = 0.30 m // Espesor de los muros
Hf = 1.50 m // Altura del relleno sobre la losa superior
gammas = 1.90 tonf/m^3 // Peso unitario del relleno compactado
phis = 30 deg // Ángulo de fricción del relleno
gammac = 2.40 tonf/m^3 // Concreto armado
fc = 280 kgf/cm^2 // f'c
fy = 4200 kgf/cm^2 // Acero Gr. 60
Ec = EcLRFD(fc) -> kgf/cm^2
# Geometría de cálculo
Lc = Bi + tw // Luz entre ejes de muros
Hcl = Hi + (tt + tb)/2 // Altura entre ejes de losas
Bc = Bi + 2*tw // Ancho exterior
# Cargas por metro
wtop = gammac*tt*1 m -> tonf/m // Peso propio de la losa superior (DC)
wwall = gammac*tw*Hcl*1 m -> tonf // Peso de cada muro (DC)
Fe = min(1 + 0.20*Hf/Bc, 1.15) // Interacción suelo-estructura, relleno compactado (12.11.2.2.1-2)
pEV = Fe*gammas*Hf*1 m -> tonf/m // Carga vertical de tierra (EV)
k0 = 1 - sin(phis) // Coeficiente en reposo (3.11.5.2-1)
heq = 0.60 m // Sobrecarga vehicular equivalente sobre los muros (3.11.6.4)
## Carga viva a través del relleno (3.6.1.2.6)
LLDF = 1.15 // Factor de distribución en relleno granular (Tabla 3.6.1.2.6a-1)
IMb = IMburLRFD(Hf) // IM = 33(1 − 4.1×10⁻⁴ DE) % (3.6.2.2-1)
check Hf >= 0.60 m // Relleno ≥ 0.60 m: distribución a través del suelo (3.6.1.2.6)
Di = Bi // Luz libre interior
Hintt = (1.80 m - 0.51 m - 0.06*Di)/LLDF // Profundidad de interacción entre ruedas (3.6.1.2.6b-1)
ww = si(Hf > Hintt, 0.51 m + 1.80 m + LLDF*Hf + 0.06*Di, 0.51 m + LLDF*Hf + 0.06*Di) // Ancho de la huella a la profundidad H (perpendicular a la luz)
lwt = 0.25 m + LLDF*Hf // Longitud de la huella de un eje del camión (paralela a la luz)
lwd = si(Hf > (1.20 m - 0.25 m)/LLDF, 0.25 m + 1.20 m + LLDF*Hf, 0.25 m + LLDF*Hf) // Longitud de la huella del tándem
pLLt = mpLRFD(1)*(1 + IMb)*14.52 tonf/(ww*lwt)*1 m // Presión por eje del camión
pLLd = mpLRFD(1)*(1 + IMb)*22.68 tonf/(ww*lwd)*1 m // Presión por el tándem
pLL = max(pLLt, pLLd) -> tonf/m // Presión viva de diseño (por metro de franja)
cL = min(si(pLLt >= pLLd, lwt, lwd), Lc) // Longitud cargada sobre la luz
"Luz de la losa superior ≤ 4.60 m: solo se aplican los ejes del camión o del tándem, sin carga de carril (3.6.1.3.3).
# Análisis del marco (pendiente-deflexión, simetría)
It = 1 m*tt^3/12 -> m^4
Ib = 1 m*tb^3/12 -> m^4
Iw = 1 m*tw^3/12 -> m^4
kt = 2*Ec*It/Lc -> tonf*m // Rigidez de la losa superior con giros simétricos (2EI/L)
kb = 2*Ec*Ib/Lc -> tonf*m
kw = 2*Ec*Iw/Hcl -> tonf*m // Rigidez de los muros (2EI/H)
det = (kt + 2*kw)*(kb + 2*kw) - kw^2
thA(r1, r2) = (r1*(kb + 2*kw) - kw*r2)/det
thB(r1, r2) = ((kt + 2*kw)*r2 - kw*r1)/det
${boxCombo(1, '1.25', '1.30', '0.5*0.90', '0', '1.75')}
${boxCombo(2, '1.25', '1.30', '1.35', '1.75', '1.75')}
${boxCombo(3, '1.00', '1.00', '1.00', '1.00', '1.00')}
"Combinación 1: Resistencia I con empuje lateral reducido al 50 % (3.11.7) para el momento positivo de la losa superior; combinación 2: Resistencia I con empujes máximos (esquinas y muros); combinación 3: Servicio I.
# Diseño (franja de 1 m)
phif = 0.90 // Flexión (5.5.4.2)
bar = 5 // Varilla [5 : 5/8"|6 : 3/4"]
rec = 5.0 cm // Recubrimiento (Tabla 5.10.1-1, contacto con suelo)
## Losa superior — centro de la luz (acero inferior)
Mu1 = max(Mt1, Mt2) -> tonf*m
dts = tt - rec - db(bar)/2
As1 = 0.85*fc*100 cm/fy*(dts - sqrt(max(dts^2 - 2*Mu1/(0.85*phif*fc*100 cm), 0 cm^2)))
s1 = max(rounddown(min(Ab(bar)*100 cm/As1, 45 cm), 2.5 cm), 5 cm)
phiM1 = phif*Ab(bar)*100 cm/s1*fy*(dts - Ab(bar)*100 cm/s1*fy/(2*0.85*fc*100 cm)) -> tonf*m
check Mu1 <= phiM1 // Flexión positiva losa superior
## Esquinas (acero exterior)
Mu2 = max(abs(MA1), abs(MA2), abs(MB1), abs(MB2)) -> tonf*m
As2 = 0.85*fc*100 cm/fy*(dts - sqrt(max(dts^2 - 2*Mu2/(0.85*phif*fc*100 cm), 0 cm^2)))
s2 = max(rounddown(min(Ab(bar)*100 cm/As2, 45 cm), 2.5 cm), 5 cm)
phiM2 = phif*Ab(bar)*100 cm/s2*fy*(dts - Ab(bar)*100 cm/s2*fy/(2*0.85*fc*100 cm)) -> tonf*m
check Mu2 <= phiM2 // Flexión negativa en las esquinas
## Losa inferior — centro (acero superior)
Mu3 = max(Mb1, Mb2) -> tonf*m
dbs = tb - rec - db(bar)/2
As3 = 0.85*fc*100 cm/fy*(dbs - sqrt(max(dbs^2 - 2*Mu3/(0.85*phif*fc*100 cm), 0 cm^2)))
s3 = max(rounddown(min(Ab(bar)*100 cm/As3, 45 cm), 2.5 cm), 5 cm)
phiM3 = phif*Ab(bar)*100 cm/s3*fy*(dbs - Ab(bar)*100 cm/s3*fy/(2*0.85*fc*100 cm)) -> tonf*m
check Mu3 <= phiM3 // Flexión en la losa inferior
## Muros — media altura (acero interior)
Mu4 = max(Mw1, Mw2, 0.1 tonf*m) -> tonf*m
dws = tw - rec - db(bar)/2
As4 = max(0.85*fc*100 cm/fy*(dws - sqrt(max(dws^2 - 2*Mu4/(0.85*phif*fc*100 cm), 0 cm^2))), 0.0015*100 cm*tw)
s4 = max(rounddown(min(Ab(bar)*100 cm/As4, 45 cm), 2.5 cm), 5 cm)
phiM4 = phif*Ab(bar)*100 cm/s4*fy*(dws - Ab(bar)*100 cm/s4*fy/(2*0.85*fc*100 cm)) -> tonf*m
check Mu4 <= phiM4 // Flexión en los muros (se desprecia la compresión axial, conservador)
check max(-Mw1, -Mw2, 0 tonf*m) <= phiM2 // Muros, cara exterior a media altura (acero exterior de las esquinas prolongado)
## Acero mínimo (5.6.3.3)
Mcr = 1.6*0.67*frLRFD(fc)*100 cm*tt^2/6 -> tonf*m
check phiM1 >= min(Mcr, 1.33*Mu1) // Mínimo, losa superior
check phiM2 >= min(Mcr, 1.33*Mu2) // Mínimo, esquinas
check phiM3 >= min(1.6*0.67*frLRFD(fc)*100 cm*tb^2/6, 1.33*Mu3) // Mínimo, losa inferior
## Cortante en la losa superior a dv de la cara del muro (5.12.7.3)
dv = max(0.9*dts, 0.72*tt)
Vu = (1.25*wtop + 1.30*pEV)*(Bi/2 - dv) + 1.75*pLL*min(cL/2, Bi/2 - dv) -> tonf // Resistencia I
Mux = max(abs(MA2), Vu*dts) // Momento concomitante
Vc = min((0.178*sqrtMPa(fc) + 32*Ab(bar)/(s1*dts)*min(Vu*dts/Mux, 1)*1 MPa)*100 cm*dts, 0.332*sqrtMPa(fc)*100 cm*dts) -> tonf // Losas de alcantarillas monolíticas (5.12.7.3-1, SI)
phiv = 0.85 // Cortante en alcantarillas cajón vaciadas in situ (Tabla 12.5.5-1)
check Vu <= phiv*Vc // Cortante sin estribos
## Servicio I — fisuración en el centro de la losa superior (5.6.7)
Ms = Mt3 -> tonf*m
nmod = 200000 MPa/Ec
Asx = Ab(bar)*100 cm/s1
rhox = Asx/(100 cm*dts)
kx = sqrt(2*rhox*nmod + (rhox*nmod)^2) - rhox*nmod
fss = min(Ms/(Asx*dts*(1 - kx/3)), 0.6*fy) -> kgf/cm^2
dc = rec + db(bar)/2
betas = 1 + dc/(0.7*(tt - dc))
check s1 <= 123000*1.0/(betas*fss/(1 MPa))*1 mm - 2*dc // Espaciamiento máximo, exposición clase 1
check min(s1, s2, s3, s4) >= db(bar) + max(1.5*db(bar), 3.8 cm) // Separación libre mínima entre barras (5.10.3.1.1)
"Refuerzo: losa superior #{bar} @ {s1} inferior; esquinas y cara exterior #{bar} @ {s2}; losa inferior #{bar} @ {s3} superior; muros #{bar} @ {s4} interior; el acero exterior de las esquinas se prolonga en toda la altura de los muros (el momento a media altura del muro produce tracción exterior). Distribución y temperatura según 5.10.6 y 9.7.3.2.`),
    { type: 'table', columnas: 'Combinación = [1, 2, 3]\nM esquina sup. [tonf*m] = [MA1, MA2, MA3]\nM esquina inf. [tonf*m] = [MB1, MB2, MB3]\nM centro losa sup. [tonf*m] = [Mt1, Mt2, Mt3]\nM centro losa inf. [tonf*m] = [Mb1, Mb2, Mb3]\nM muro [tonf*m] = [Mw1, Mw2, Mw3]', dec: '2', titulo: 'Momentos flectores por metro (convención: + tracción interior en losas y muros; esquinas: horario +)' },
    summary(),
  ],
};

// =====================================================================
//  9) PUENTE PEATONAL (VIGAS DE ACERO) — CARGA PEATONAL Y VIBRACIÓN
// =====================================================================
const peatonal = {
  id: 'br-peatonal', pais: 'PE', cat: CAT, icon: 'steel', settings: { sys: 'si' },
  name: 'Puente peatonal de vigas de acero (carga peatonal y vibración)',
  normas: 'AASHTO LRFD Guide Specifications for the Design of Pedestrian Bridges (2009) · AASHTO LRFD 9.ª ed. Secc. 6 · Manual de Puentes MTC (2018)',
  desc: 'Pasarela simplemente apoyada L = 30 m con dos vigas I armadas y losa de concreto: carga peatonal 4.3 kPa, vehículo de mantenimiento H5, Resistencia I, flexión y cortante (AASHTO Secc. 6), deflexión L/360 y frecuencias vertical (≥ 3.0 Hz) y lateral (≥ 1.3 Hz).',
  titulo: 'Diseño de puente peatonal de vigas de acero L = 30.00 m — AASHTO LRFD Pedestrian Bridges',
  blocks: [
    text(`# Generalidades
Puente peatonal de un tramo simplemente apoyado de **30.00 m** con dos vigas I armadas de acero ASTM A709 Gr. 50 separadas 2.00 m y losa de concreto de 0.12 m (no compuesta) con barandas metálicas. El ancho libre es de 2.50 m.

## Normas y referencias
- AASHTO, *LRFD Guide Specifications for the Design of Pedestrian Bridges* (2009, rev. 2015): 3.1 (carga peatonal 90 psf = 4.3 kPa sin reducción por área), 3.2 (vehículo de mantenimiento H5 para anchos de 2.1 a 3.0 m), 5 (deflexión L/360), 6 (vibraciones: $f_v \\ge 3.0$ Hz o $W \\ge 180\\,e^{-0.35 f}$ kip; $f_{lat} \\ge 1.3$ Hz).
- AASHTO LRFD 9.ª ed., Secc. 6 (6.10.8 flexión con ala comprimida arriostrada continuamente, 6.10.9 cortante) y Tabla 3.4.1-1 (Resistencia I).
- Manual de Puentes MTC (2018), 2.4.3.7 (carga peatonal) y Rodríguez Serquén, cap. XIV.`),
    calc(`# Datos
L = 30.0 m // Luz de cálculo
wb = 2.50 m // Ancho libre del tablero
nv = 2 // Número de vigas
## Viga I armada (acero A709 Gr. 50)
Fy = 345 MPa // Fluencia
Es = 200000 MPa // Módulo de elasticidad (6.4.1)
D = 1400 mm // Altura del alma
tw = 12 mm // Espesor del alma
bf = 350 mm // Ancho de las alas (sección doblemente simétrica)
tf = 25 mm // Espesor de las alas
## Tablero
tl = 0.12 m // Espesor de la losa de concreto
gammac = 23.5 kN/m^3 // Concreto armado
wbar = 0.50 kN/m // Barandas (cada lado)
PL = 4.3 kPa // Carga peatonal 90 psf, sin reducción por área ni IM (Guide Spec 3.1)
check wb >= 2.10 m and wb <= 3.05 m // Vehículo de mantenimiento H5 para anchos libres de 7 a 10 ft; > 10 ft: H10 (Guide Spec 3.2)
# Propiedades de la viga
Av = 2*bf*tf + D*tw -> mm^2 // Área
d = D + 2*tf // Peralte total
Ix = tw*D^3/12 + 2*bf*tf*((D + tf)/2)^2 + 2*bf*tf^3/12 -> mm^4 // Inercia
Sx = Ix/(d/2) -> mm^3 // Módulo elástico
check D/tw <= 150 // Esbeltez del alma (6.10.2.1.1)
check bf/(2*tf) <= 12 and bf >= D/6 and tf >= 1.1*tw // Proporciones de alas (6.10.2.2)
# Cargas por viga
wDCs = 78.5 kN/m^3*Av -> kN/m // Peso propio de la viga
wDCd = (gammac*tl*(wb + 0.30 m) + 2*wbar)/nv -> kN/m // Losa y barandas
wDC = 1.10*wDCs + wDCd // DC total (+10 % de arriostres y conexiones)
wPL = PL*wb/nv -> kN/m // Carga peatonal por viga
MDC = wDC*L^2/8 -> kN*m
MPL = wPL*L^2/8 -> kN*m
VDC = wDC*L/2 -> kN
VPL = wPL*L/2 -> kN`),
    { type: 'hl93env', tramos: 'L', apoyos: 'A A', vehiculo: 'Ejes', ejes: '8.9kN 0; 35.6kN 4.27', IM: '0', g: '0.5', carril: '0', sufijo: 'H5', titulo: 'Vehículo de mantenimiento H5 (2 + 8 kip, ejes a 4.27 m), sin impacto, ½ por viga' },
    calc(`# Resistencia I
MLL = max(MPL, MLLpH5) // La carga peatonal y el vehículo no actúan simultáneamente (Guide Spec 3.2)
VLL = max(VPL, VLLH5)
Mu = 1.25*MDC + 1.75*MLL // Resistencia I (Tabla 3.4.1-1)
Vu = 1.25*VDC + 1.75*VLL
## Flexión — ala superior arriostrada continuamente por la losa (6.10.8.1)
Dc = D/2 // Alma en compresión (sección simétrica)
lamrw = 5.7*sqrt(Es/Fy) // Esbeltez límite del alma no compacta (6.10.1.10.2-4)
awc = 2*Dc*tw/(bf*tf) // (6.10.1.10.2-5)
Rb = si(2*Dc/tw <= lamrw, 1, min(1, 1 - awc/(1200 + 300*awc)*(2*Dc/tw - lamrw))) // Factor de pandeo del alma (6.10.1.10.2)
lamf = bf/(2*tf)
lampf = 0.38*sqrt(Es/Fy)
lamrf = 0.56*sqrt(Es/(0.7*Fy))
Fnc = si(lamf <= lampf, Rb*Fy, Rb*Fy*(1 - (1 - 0.7)*(lamf - lampf)/(lamrf - lampf))) // Pandeo local del ala (6.10.8.2.2)
fbu = Mu/Sx -> MPa
check fbu <= 1.00*Fnc // Ala comprimida (6.10.8.1.1-1, φf = 1.0)
check fbu <= 1.00*Fy // Ala traccionada (6.10.8.1.2-1)
## Cortante (6.10.9)
Vp = 0.58*Fy*D*tw -> kN
kv = 5 // Alma sin rigidizadores intermedios
Cv = si(D/tw <= 1.12*sqrt(Es*kv/Fy), 1, si(D/tw <= 1.40*sqrt(Es*kv/Fy), 1.12/(D/tw)*sqrt(Es*kv/Fy), 1.57/(D/tw)^2*(Es*kv/Fy)))
check Vu <= 1.00*Cv*Vp // Resistencia a cortante, φv = 1.0
# Servicio
## Deflexión por carga peatonal (Guide Spec 5)
dPL = 5*wPL*L^4/(384*Es*Ix) -> mm
check dPL <= L/360 // L/360
## Vibración vertical (Guide Spec 6.2)
wv = wDC // Peso por unidad de longitud de la viga (sin carga peatonal)
fv = pi/(2*L^2)*sqrt(Es*Ix*9.81 m/s^2/wv) -> Hz // Primera frecuencia vertical de viga simple
Wtot = nv*wv*L -> kN // Peso total del puente
check fv >= 3.0 Hz or Wtot >= 180 kip*e^(-0.35*fv/(1 Hz)) // f ≥ 3.0 Hz, o W ≥ 180e^(−0.35f) kip (Guide Spec 6.2)
## Vibración lateral (Guide Spec 6.2)
Ilat = tl*(wb + 0.30 m)^3/12 -> m^4 // Inercia lateral del tablero (diafragma de concreto)
Elat = 4700*sqrtMPa(28 MPa) // Módulo del concreto de la losa
flat = pi/(2*L^2)*sqrt(Elat*Ilat*9.81 m/s^2/(nv*wv)) -> Hz // Frecuencia lateral fundamental
check flat >= 1.3 Hz // f lateral ≥ 1.3 Hz (Guide Spec 6.2)
"Frecuencias: vertical {fv}, lateral {flat}. Se recomienda verificar la aceleración vertical con el criterio de HIVOSS/Sétra si $f_v$ < 5 Hz.
"Barandas peatonales (AASHTO LRFD 13.8.2): carga de diseño $w = 0.73$ N/mm (50 lbf/ft) transversal y vertical simultáneas sobre cada riel longitudinal, más una carga concentrada de 890 N (200 lbf ≈ 91 kgf) en cualquier punto y dirección; los postes se diseñan para $P_{LL} = 890 + 0.73L$ N. Su diseño se hace por separado.`),
    summary(),
  ],
};

export default [vigaT, presf, acero, estribo, pilar, neopreno, sismo, alcantarilla, peatonal];
