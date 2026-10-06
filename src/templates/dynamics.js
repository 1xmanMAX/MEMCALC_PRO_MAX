// =====================================================================
//  Plantillas — módulo «dynamics» (categoría «Dinámica estructural»)
//  Validadas en tests/dynamics.test.mjs. Fuentes: docs/referencias/dynamics.md
// =====================================================================
import { calc, text, summary } from './_h.js';

const CAT = 'Dinámica estructural';

// Parámetros de sitio E.030-2026 (RM 183-2026-VIVIENDA) comunes
const SITIO_E030 = `# Peligro sísmico y parámetros de sitio (E.030-2026)
zona = 4 // Zona sísmica (Art. 10, Anexo II) [4 : Zona 4|3 : Zona 3|2 : Zona 2|1 : Zona 1]
Z = ZE030(zona) // Factor de zona (Art. 11, Tabla N° 1)
Vs30 = 400 m/s // Velocidad promedio de ondas de corte en 30 m (Art. 15.2)
S = SE030(zona, Vs30) // Factor de suelo interpolado por Vs30 (Art. 17, Tabla N° 4)
Tp = TpE030(Vs30) // Periodo TP (Tabla N° 5)
Tl = TlE030(Vs30) // Periodo TL (Tabla N° 5)
categoria = 4 // Categoría de la edificación (Tabla N° 7) [2 : A2 Esencial|3 : B Importante|4 : C Común]
U = UE030(categoria) // Factor de uso (Tabla N° 7)`;

export default [
  // -------------------------------------------------------------------
  //  1) Respuesta de 1 GDL a El Centro — comparación con Chopra
  // -------------------------------------------------------------------
  {
    id: 'dy-sdof-elcentro', pais: 'INT', cat: CAT, icon: 'quake', settings: { sys: 'us' },
    name: 'Respuesta de 1 GDL a El Centro (Chopra)', normas: 'Chopra, Dynamics of Structures §5.2, §6.4, §7.4 — Nigam-Jennings (1968), Newmark (1959)',
    desc: 'Tiempo-historia de osciladores de 1 GDL lineales (Tn = 0.5, 1 y 2 s; ζ = 2 %) ante El Centro 1940 NS, comparado con Chopra Fig. 6.4.1, y sistema elastoplástico con Ry = 4.',
    titulo: 'Respuesta sísmica de sistemas de un grado de libertad — El Centro 1940',
    blocks: [
      text(`# Generalidades
Se calcula la respuesta tiempo-historia de osciladores de un grado de libertad (1 GDL) sometidos a la componente N-S del registro de **El Centro, Imperial Valley (18 de mayo de 1940)**, el acelerograma de referencia de A. K. Chopra (*Dynamics of Structures*, Fig. 6.1.4). La ecuación de movimiento es
$$m\\ddot u + c\\dot u + f_S(u) = -m\\ddot u_g(t)$$
Para los sistemas lineales se usa el método **exacto por tramos lineales** de Nigam y Jennings (1968), incondicionalmente estable y exacto si la excitación varía linealmente en cada Δt; como contraste se incluye **Newmark-β de aceleración promedio**. El sistema inelástico se integra con Newmark y **Newton-Raphson** (Chopra Tabla 5.7.1), con un resorte elastoplástico.

**Validación:** Chopra (Fig. 6.4.1) reporta, para ζ = 2 %, los desplazamientos máximos D = 2.67, 5.97 y 7.47 in para Tn = 0.5, 1 y 2 s.`),
      calc(`# Datos
zeta = 0.02 // Fracción de amortiguamiento crítico (Chopra Fig. 6.4.1)
Tn_a = 0.5 s // Periodo del sistema a
Tn_b = 1.0 s // Periodo del sistema b
Tn_c = 2.0 s // Periodo del sistema c
D_ch_a = 2.67 in // Chopra Fig. 6.4.1: D para Tn = 0.5 s
D_ch_b = 5.97 in // Chopra Fig. 6.4.1: D para Tn = 1 s
D_ch_c = 7.47 in // Chopra Fig. 6.4.1: D para Tn = 2 s
tol = 0.01 // Tolerancia relativa admitida frente a la solución publicada`),
      calc(`# Sistema a: Tn = 0.5 s`),
      { type: 'thsdof', registro: 'elcentro', T: 'Tn_a', zeta: 'zeta', modelo: 'lineal', metodo: 'nj', sufijo: 'a', escala: '1', titulo: 'Sistema a (Tn = 0.5 s, ζ = 2 %): üg(t), u(t) y A(t)' },
      calc(`# Sistema b: Tn = 1 s`),
      { type: 'thsdof', registro: 'elcentro', T: 'Tn_b', zeta: 'zeta', modelo: 'lineal', metodo: 'nj', sufijo: 'b', escala: '1', titulo: 'Sistema b (Tn = 1 s, ζ = 2 %): üg(t), u(t) y A(t)' },
      calc(`## Contraste con Newmark-β (aceleración promedio)`),
      { type: 'thsdof', registro: 'elcentro', T: 'Tn_b', zeta: 'zeta', modelo: 'lineal', metodo: 'avg', sufijo: 'bN', escala: '1', titulo: 'Sistema b integrado con Newmark (γ = 1/2, β = 1/4)' },
      calc(`# Sistema c: Tn = 2 s`),
      { type: 'thsdof', registro: 'elcentro', T: 'Tn_c', zeta: 'zeta', modelo: 'lineal', metodo: 'nj', sufijo: 'c', escala: '1', titulo: 'Sistema c (Tn = 2 s, ζ = 2 %): üg(t), u(t) y A(t)' },
      calc(`# Comparación con la solución publicada (Chopra Fig. 6.4.1)
e_a = abs(umax_a - D_ch_a)/D_ch_a // Error relativo del sistema a
check e_a <= tol // D(Tn = 0.5 s) coincide con Chopra
e_b = abs(umax_b - D_ch_b)/D_ch_b // Error relativo del sistema b
check e_b <= tol // D(Tn = 1 s) coincide con Chopra
e_c = abs(umax_c - D_ch_c)/D_ch_c // Error relativo del sistema c
check e_c <= tol // D(Tn = 2 s) coincide con Chopra
e_N = abs(umax_bN - umax_b)/umax_b // Diferencia Newmark vs exacto (alargamiento de periodo, Chopra §5.5)
check e_N <= 0.02 // Newmark con Δt/Tn = 0.02 converge a la solución exacta
"Las pseudo-aceleraciones $A/g = \\omega_n^2 D/g$ resultan {An_g_a}, {An_g_b} y {An_g_c} (Chopra: 1.09, 0.610 y 0.191).`),
      calc(`# Sistema elastoplástico (Chopra §7.4)
"Se analiza el sistema de Tn = 0.5 s y ζ = 5 % con resistencia $f_y = f_o/R_y$, donde $f_o$ es la fuerza elástica máxima ($R_y$ = factor de reducción de resistencia, Chopra Ec. 7.3.2).
zetaP = 0.05 // Amortiguamiento del sistema inelástico
Ry = 4 // Factor de reducción de resistencia
mu_disp = 6 // Ductilidad disponible supuesta (sistema dúctil)`),
      { type: 'thsdof', registro: 'elcentro', T: 'Tn_a', zeta: 'zetaP', modelo: 'bilineal', metodo: 'avg', Ry: 'Ry', alpha: '0', mucap: 'mu_disp', sufijo: 'p', escala: '1', titulo: 'Sistema elastoplástico (Tn = 0.5 s, ζ = 5 %, Ry = 4): üg(t), u(t) y lazo fS–u' },
      calc(`## Resultados del sistema inelástico
Cy_p // Coeficiente de fluencia fy/(m·g)
mu_p // Ductilidad de desplazamiento μ = um/uy
"Con Ry = 4 la ductilidad demandada es μ = {mu_p}; la regla de igual desplazamiento ($\\mu \\approx R_y$) no se cumple exactamente para Tn = 0.5 s (zona sensible a la velocidad, Chopra Fig. 7.5.3).`),
      summary(),
    ],
  },
  // -------------------------------------------------------------------
  //  2) Espectro de respuesta vs espectro E.030-2026
  // -------------------------------------------------------------------
  {
    id: 'dy-espectro-e030', pais: 'PE', cat: CAT, icon: 'spectrum', settings: { sys: 'tec' },
    name: 'Espectro de respuesta vs espectro E.030-2026', normas: 'NTE E.030-2026 (RM 183-2026-VIVIENDA) Art. 41 y 47 — Chopra §6.6',
    desc: 'Espectros Sd, Sv y Sa de El Centro para ζ = 2, 5 y 10 % comparados con el espectro elástico ZUCS de la E.030-2026; parámetros del registro y factor de escala.',
    titulo: 'Espectro de respuesta de un acelerograma y comparación con la NTE E.030-2026',
    blocks: [
      text(`# Generalidades
El **espectro de respuesta** de un acelerograma es la gráfica del valor máximo de la respuesta de osciladores de 1 GDL en función de su periodo, para un amortiguamiento fijo. Se calcula con la recurrencia exacta de Nigam-Jennings para 120 periodos (rejilla logarítmica) y tres amortiguamientos, y se compara con el **espectro elástico de la NTE E.030-2026** ($S_a = Z\\,U\\,C\\,S$, con R = 1), tal como exige el Art. 47 para seleccionar y escalar registros en análisis tiempo-historia.

Registro: El Centro 1940 N-S (Imperial Valley), Δt = 0.02 s, PGA = 0.319 g.`),
      calc(SITIO_E030),
      calc(`# Estructura y criterio de escalamiento
T1 = 0.50 s // Periodo fundamental de la estructura en la dirección de análisis
fesc_max = 4 // Factor de escala máximo razonable para un registro (práctica: 0.25–4; NIST GCR 11-917-15)`),
      { type: 'respspec', registro: 'elcentro', zetas: '0.02, 0.05, 0.10', Tmax: '4 s', nT: '120', Sa: 'Z*U*CE030d(T, Tp, Tl)*S', Tref: 'T1', escala: '1', titulo: 'Espectros de respuesta de El Centro 1940 NS (ζ = 2, 5 y 10 %) y espectro elástico E.030-2026' },
      calc(`# Evaluación
SaE = Z*U*CE030d(T1, Tp, Tl)*S // Espectro elástico E.030 en T1 (R = 1, Art. 41.1)
rT1 = SaT/SaE // Razón espectral registro/norma en T1 (ζ = 5 %)
SaEC = SaElCentro(T1, 0.05) // Verificación con la función del editor (Nigam-Jennings)
check abs(SaEC - SaT)/SaT <= 0.01 // Consistencia entre el bloque y la función SaElCentro
check abs(SaElCentro(0.02 s, 0.05) - PGA)/PGA <= 0.05 // Sa(T → 0) ≈ PGA (prueba de consistencia del espectro)
check fesc <= fesc_max // Factor de escala para que el espectro del registro cubra al de diseño en 0.2T1–1.5T1
PGAesc = fesc*PGA // PGA del registro escalado (g)
"El registro escalado por {fesc} tiene PGA = {PGAesc} g frente a ZUS = {Z*U*S}; su contenido de frecuencias (Tpk = {Tpk}) difiere del espectro de diseño, por lo que la E.030-2026 exige al menos tres pares de registros (Art. 47.4).`),
      summary(),
    ],
  },
  // -------------------------------------------------------------------
  //  3) Tiempo-historia de edificio de 5 pisos (Chopra)
  // -------------------------------------------------------------------
  {
    id: 'dy-5pisos-chopra', pais: 'INT', cat: CAT, icon: 'quake', settings: { sys: 'us' },
    name: 'Tiempo-historia modal de edificio de 5 pisos (Chopra)', normas: 'Chopra, Dynamics of Structures §12.8, §13.1–13.2 (Ejemplos 13.2–13.3) — Der Kiureghian (1981)',
    desc: 'Edificio de cortante de 5 pisos (m = 100/g kip, k = 31.54 kip/in) ante El Centro con ζ = 5 %: modos, superposición modal en el tiempo y comparación con el análisis espectral CQC/SRSS.',
    titulo: 'Análisis tiempo-historia por superposición modal — edificio de 5 pisos',
    blocks: [
      text(`# Generalidades
Edificio de cortante uniforme de cinco pisos (Chopra, *Dynamics of Structures*, §12.8 y Ejemplo 13.2): peso por nivel 100 kip, rigidez de entrepiso 31.54 kip/in y altura de entrepiso 12 ft. Se somete a El Centro 1940 N-S con amortiguamiento modal ζn = 5 %.

El análisis tiempo-historia se hace por **superposición modal**: cada coordenada modal $D_n(t)$ se integra exactamente (Nigam-Jennings) y $\\mathbf u(t) = \\sum \\Gamma_n\\boldsymbol\\phi_n D_n(t)$. Las envolventes se comparan con el **análisis espectral** (RSA) combinando las respuestas modales máximas con CQC, usando el espectro del propio registro.

**Validación:** Chopra reporta T1 = 2.0 s, desplazamiento máximo del techo ≈ 6.85 in y cortante basal ≈ 73.3 kip; la implementación de referencia (algoritmos.md §4) da 6.840 in y 73.20 kip.`),
      calc(`# Datos del edificio
n = 5 // Número de pisos
W_i = [100, 100, 100, 100, 100] kip // Peso sísmico por nivel (1 → n)
k_i = [31.54, 31.54, 31.54, 31.54, 31.54] kip/in // Rigidez lateral de entrepiso
h_i = [12, 12, 12, 12, 12] ft // Altura de entrepiso
zeta = 0.05 // Amortiguamiento modal (Chopra Ej. 13.2)
dlim = 0.020 // Deriva límite de entrepiso Δa/hsx (ASCE 7-22 Tabla 12.12-1, categoría de riesgo II)
## Valores publicados (Chopra / referencia)
T1_ch = 2.0007 s // Periodo fundamental (Chopra §12.8)
u5_ch = 6.840 in // Desplazamiento máximo del techo (THA modal, referencia)
Vb_ch = 73.20 kip // Cortante basal máximo (THA modal, referencia)`),
      { type: 'thmdof', masas: 'W_i', rigideces: 'k_i', alturas: 'h_i', registro: 'elcentro', amort: 'modal', zeta: 'zeta', comb: 'CQC', dlim: 'dlim', escala: '1', titulo: 'Edificio de 5 pisos ante El Centro (ζ = 5 %): techo, cortante basal y envolventes TH vs RSA' },
      calc(`# Comparación con la solución publicada
check abs(T1 - T1_ch)/T1_ch <= 0.001 // Periodo fundamental
check abs(u_techo - u5_ch)/u5_ch <= 0.01 // Desplazamiento máximo del techo
check abs(Vbmax - Vb_ch)/Vb_ch <= 0.01 // Cortante basal máximo
ru = u_rsa/u_techo // Razón RSA/THA en el techo (Chopra: el RSA es una estimación)
rV = Vb_rsa/Vbmax // Razón RSA/THA del cortante basal
check abs(ru - 1) <= 0.05 // CQC estima el desplazamiento del techo con error < 5 %
check abs(rV - 1) <= 0.15 // CQC estima el cortante basal con error < 15 % (modos superiores)
"El cortante basal máximo equivale a {CbTH} W. El análisis espectral subestima el cortante porque los máximos modales no ocurren simultáneamente y la combinación CQC es una estimación estadística (Chopra §13.7).
## Amortiguamiento de Rayleigh equivalente (modos 1 y 3)
a0 = rayleighA0(T1, T3, zeta) // Coeficiente proporcional a la masa (Chopra Ec. 11.4.9)
a1 = rayleighA1(T1, T3, zeta) // Coeficiente proporcional a la rigidez
z2 = zetaRayleigh(T2, a0, a1) // Amortiguamiento resultante en el modo 2
z5 = zetaRayleigh(T5, a0, a1) // Amortiguamiento resultante en el modo 5
rho12 = rhoCQC(T1, T2, zeta) // Correlación CQC entre los modos 1 y 2`),
      summary(),
    ],
  },
  // -------------------------------------------------------------------
  //  3b) Tiempo-historia NO LINEAL del edificio de 5 pisos con P-Δ
  // -------------------------------------------------------------------
  {
    id: 'dy-nl-cortante', pais: 'INT', cat: CAT, icon: 'quake', settings: { sys: 'us' },
    name: 'Tiempo-historia no lineal con P-Δ (edificio de 5 pisos)', normas: 'Chopra §16.3 (Tabla 16.3.3), §18.7 — ASCE 7-22 §16.4.1.2 — FEMA P-58 (deriva residual); contrastado con OpenSees',
    desc: 'Edificio de cortante de 5 pisos (Chopra) con resortes de entrepiso bilineales, ante El Centro × 1.5: Newmark + Newton-Raphson, con y sin P-Δ, frente a la respuesta elástica; ductilidad, deriva máxima y residual.',
    titulo: 'Análisis tiempo-historia no lineal de un edificio de cortante con efecto P-Δ',
    blocks: [
      text(`# Generalidades
El edificio de cortante de cinco pisos de Chopra (peso 100 kip por nivel, rigidez 31.54 kip/in, h = 12 ft, T1 = 2.0 s) se dota de **resortes de entrepiso bilineales** con endurecimiento cinemático (el material *Steel01* de OpenSees sin transición). La resistencia de cada entrepiso proviene de un coeficiente de fluencia $C_y = V_{y,1}/W$ distribuido según el patrón triangular de fuerzas: $V_{y,i} = C_y W \\sum_{j\\ge i} j/\\sum j$.

La ecuación de movimiento $\\mathbf M\\ddot{\\mathbf u} + \\mathbf C\\dot{\\mathbf u} + \\mathbf f_S(\\mathbf u) = -\\mathbf M\\boldsymbol\\iota\\ddot u_g$ se integra con **Newmark de aceleración promedio** y **Newton-Raphson** en cada paso (Chopra Tabla 16.3.3). El amortiguamiento es de **Rayleigh** con la rigidez inicial (5 % en los modos 1 y 3). El **efecto P-Δ** se representa con una columna ficticia que resta $P_i/h_i$ a la rigidez de cada entrepiso; para este edificio flexible el coeficiente de estabilidad elástica del primer entrepiso es $\\theta = P/(kh) = 500/(31.54\\cdot 144) = 0.11$, cerca del umbral de 0.10 de ASCE 7-22 §12.8.7.

Excitación: El Centro 1940 N-S × 1.5 (sismo severo). Los resultados se contrastaron con un modelo equivalente en **OpenSeesPy** (zeroLength + Steel01, columna ficticia elástica, Rayleigh con la rigidez inicial): techo y derivas coinciden a < 0.1 % (docs/referencias/revision-dynamics.md).`),
      calc(`# Datos del edificio
W_i = [100, 100, 100, 100, 100] kip // Peso sísmico por nivel (1 → n)
k_i = [31.54, 31.54, 31.54, 31.54, 31.54] kip/in // Rigidez lateral inicial de entrepiso
h_i = [12, 12, 12, 12, 12] ft // Altura de entrepiso
Wt = 500 kip // Peso total
Cy = 0.20 // Coeficiente de fluencia del primer entrepiso V_y1/W
Vy_i = Cy*Wt*[15, 14, 12, 9, 5]/15 // Resistencia de entrepiso con distribución triangular
alpha = 0.03 // Rigidez post-fluencia α = k2/k
zeta = 0.05 // Amortiguamiento de Rayleigh (modos 1 y 3)
fsc = 1.5 // Factor de escala del registro
## Criterios de aceptación
dlim = 0.040 // Deriva máxima: 2 × 0.020 (ASCE 7-22 §16.4.1.2 y Tabla 12.12-1, categoría II)
dres_lim = 0.010 // Deriva residual: estado de daño DS3 de FEMA P-58 (reparación mayor)
theta1 = Wt/(k_i[1]*h_i[1]) // Coeficiente de estabilidad elástica del primer entrepiso`),
      calc(`# Respuesta sin P-Δ`),
      { type: 'thnl', masas: 'W_i', rigideces: 'k_i', Vy: 'Vy_i', alturas: 'h_i', alpha: 'alpha', registro: 'elcentro', escala: 'fsc', zeta: 'zeta', modosR: '1, 3', pdelta: false, dlim: 'dlim', dreslim: 'dres_lim', sufijo: '0', titulo: 'Edificio de 5 pisos no lineal SIN P-Δ ante El Centro × 1.5' },
      calc(`# Respuesta con P-Δ`),
      { type: 'thnl', masas: 'W_i', rigideces: 'k_i', Vy: 'Vy_i', alturas: 'h_i', alpha: 'alpha', registro: 'elcentro', escala: 'fsc', zeta: 'zeta', modosR: '1, 3', pdelta: true, fP: '1.0', dlim: 'dlim', dreslim: 'dres_lim', sufijo: 'PD', titulo: 'Edificio de 5 pisos no lineal CON P-Δ ante El Centro × 1.5' },
      calc(`# Comparación
rPD = derivamax_PD/derivamax_0 // Amplificación de la deriva máxima por P-Δ
rNL = u_techo_PD/u_lin_PD // Techo no lineal / elástico (regla de igual desplazamiento ≈ 1 para T1 = 2 s)
check abs(rNL - 1) <= 0.25 // Igual desplazamiento aproximado en la zona sensible al desplazamiento (Chopra §7.5)
check mumax_PD <= 4 // Demanda de ductilidad de entrepiso moderada
"Con P-Δ la deriva máxima crece {(rPD - 1)*100} %; la deriva residual es {dres_0} sin P-Δ y {dres_PD} con P-Δ. Con una resistencia menor (p. ej. $C_y$ = 0.15) el P-Δ produce un desplazamiento progresivo hacia un lado (*ratcheting*): la deriva máxima llega a ≈ 6 % y la residual a ≈ 5 %, que el análisis elástico no detecta. El cortante basal no lineal es {Vbmax_PD} frente a {Vb_lin_PD} elástico ($R_\\mu$ = {Ry1_PD}).`),
      summary(),
    ],
  },
  // -------------------------------------------------------------------
  //  4) Pushover + N2 de edificio de concreto
  // -------------------------------------------------------------------
  {
    id: 'dy-pushover-n2', pais: 'PE', cat: CAT, icon: 'plot', settings: { sys: 'si' },
    name: 'Pushover y desplazamiento objetivo (N2 / ATC-40 / ASCE 41)', normas: 'EC8-1 Anexo B (N2), ATC-40 §8.2.2, FEMA 440 §6, ASCE 41-17 §7.4.3; espectro NTE E.030-2026',
    desc: 'Edificio de concreto de 4 pisos con resortes de entrepiso trilineales: curva de capacidad, espectro de capacidad ADRS, punto de desempeño por N2, ATC-40, FEMA 440 y coeficientes, y verificación de niveles de desempeño.',
    titulo: 'Análisis estático no lineal (pushover) y evaluación del desempeño sísmico',
    blocks: [
      text(`# Generalidades
Evaluación por desempeño de un edificio aporticado de concreto armado de 4 pisos modelado como **edificio de cortante** con resortes de entrepiso **trilineales** (fisuración, fluencia y endurecimiento). La resistencia de cada entrepiso proviene del mecanismo de columnas/vigas (análisis límite) y la rigidez inicial del modelo elástico con secciones fisuradas.

1. **Pushover** con el patrón modal $\\mathbf s = \\mathbf M\\boldsymbol\\phi_1$ (EC8-1 §4.3.3.4.2) por control de desplazamiento, con **efecto P-Δ** (columna ficticia con el peso de los niveles superiores) y **degradación de resistencia** a partir de una deriva de 3 % (rama descendente hasta la resistencia residual); después del máximo la deformación se concentra en el entrepiso crítico y los demás descargan.
2. **Conversión a 1 GDL** ($\\Gamma$, $m^*$) y formato **ADRS** (ATC-40 §8.2.2.1).
3. **Demanda**: espectro elástico de la **NTE E.030-2026** ($S_a = ZUCS$, R = 1, sismo de diseño de 475 años).
4. **Punto de desempeño** por **N2** (Fajfar 2000; EC8-1 Anexo B, que gobierna), **ATC-40** Procedimiento A (comportamiento tipo B), **FEMA 440** (linealización equivalente) y **ASCE 41-17** (método de coeficientes, con la idealización bilineal de §7.4.3.2.4: $K_e$ secante en $0.6V_y$, $T_e = T_i\\sqrt{K_i/K_e}$, y el límite $\\mu_{max}$ de la Ec. 7-32 por la pendiente negativa).
5. **Niveles de desempeño** por deriva de entrepiso para pórticos de concreto (FEMA 356 Tabla C1-3 / ASCE 41): OP 0.5 %, IO 1 %, LS 2 %, CP 4 %. El objetivo para una edificación común ante el sismo de diseño es **Seguridad de vida (LS)** (SEAOC Visión 2000).`),
      calc(SITIO_E030),
      calc(`# Modelo del edificio (4 pisos, pórticos de C°A°)
W_i = [2400, 2200, 2200, 1800] kN // Peso sísmico por nivel (CM + 25 % CV, E.030 Art. 31)
k_i = [450000, 400000, 360000, 300000] kN/m // Rigidez lateral inicial de entrepiso
Vy_i = [3200, 2800, 2400, 1700] kN // Cortante de fluencia de entrepiso (mecanismo plástico)
h_i = [4.0, 3.2, 3.2, 3.2] m // Altura de entrepiso
alpha = 0.05 // Rigidez post-fluencia α = k2/k1
fcr = 0.40 // Fisuración en Vcr = 0.40 Vy (trilineal)
r2 = 0.50 // Rigidez fisurada / inicial
## Coeficientes del ATC-40 y ASCE 41
Cm = 0.9 // Factor de masa efectiva (ASCE 41-17 Tabla 7-4, pórtico de concreto de 3 o más pisos)
## No linealidad geométrica y degradación
drc = 0.03 // Deriva de inicio de la degradación de resistencia (columnas de C°A° dúctiles, ASCE 41-17 Tabla 10-8: a + θy ≈ 0.03)
ac = 0.10 // Pendiente de la rama descendente −ac·k
resid = 0.20 // Resistencia residual / Vy (ASCE 41-17 Tabla 10-8, c = 0.2)`),
      { type: 'pushover', masas: 'W_i', rigideces: 'k_i', Vy: 'Vy_i', alturas: 'h_i', alpha: 'alpha', fcr: 'fcr', r2: 'r2', patron: 'modal', druEnd: '0.05', pdelta: true, fP: '1.0', drcap: 'drc', acap: 'ac', rescap: 'resid', Sa: 'Z*U*CE030d(T, Tp, Tl)*S', Tc: 'Tp', metodo: 'N2', tipo: 'B', asitio: '130', Cm: 'Cm', niveles: 'OP 0.005 // Operacional\nIO 0.010 // Ocupación inmediata\nLS 0.020 // Seguridad de vida\nCP 0.040 // Prevención del colapso', nivel: 'LS', titulo: 'Curva de capacidad y espectro de capacidad del edificio de 4 pisos con la demanda E.030-2026' },
      calc(`# Resultados del desempeño
Te = Tpo1 // Periodo elástico fundamental
"Desplazamiento objetivo del techo (N2): $u_t$ = {dN2}; ATC-40: {dATC}; FEMA 440: {dFEMA}; ASCE 41: {dC}.
mu // Ductilidad global μ = ut/(Γ·dy*)
derivamax // Deriva máxima de entrepiso en el punto de desempeño
check derivamax <= 0.020 // Seguridad de vida: δ/h ≤ 2 % (FEMA 356 Tabla C1-3, pórticos de concreto)
check mu <= 4 // Demanda de ductilidad global compatible con pórticos de concreto (R0 = 8 → ductilidad moderada)
rN2C = dN2/dC // Razón N2 / método de coeficientes
"Los cuatro métodos dan desplazamientos objetivo del mismo orden; el N2 es el de mayor demanda para este periodo corto (T* < TC), donde la regla de igual desplazamiento no aplica.`),
      summary(),
    ],
  },
  // -------------------------------------------------------------------
  //  5) Momento–curvatura de columna confinada
  // -------------------------------------------------------------------
  {
    id: 'dy-momcurv-col', pais: 'INT', cat: CAT, icon: 'section', settings: { sys: 'si' },
    name: 'Momento–curvatura de columna confinada (Mander)', normas: 'Mander, Priestley y Park (1988); Paulay y Priestley (1992); Priestley, Calvi y Kowalsky (2007); E.060 Cap. 21 / ACI 318-19 §18.7.5',
    desc: 'Diagrama M–φ por fibras de una columna de 40 × 60 cm con núcleo confinado de Mander y acero Park-Paulay: fluencia, nominal, última, ductilidad de curvatura, rótula plástica y ductilidad de desplazamiento.',
    titulo: 'Diagrama momento–curvatura de una columna de concreto armado confinada',
    blocks: [
      text(`# Generalidades
El diagrama **momento–curvatura** (M–φ) de una sección se obtiene con un **modelo de fibras**: la sección se divide en franjas de concreto (núcleo confinado y recubrimiento) y barras de acero, se impone una curvatura φ, se busca la deformación de referencia que equilibra la carga axial y se integra el momento. Es la base de los modelos de rótula plástica usados en pushover y tiempo-historia no lineal (OpenSees *fiber section*).

- Concreto confinado: **Mander, Priestley y Park (1988)**, con el coeficiente de efectividad $k_e$ para estribos rectangulares (barras restringidas por las ramas) y presiones laterales distintas en cada dirección resueltas con la **superficie triaxial de 5 parámetros** (ábaco de la Fig. 4 de Mander); deformación última de **Priestley** por equilibrio de energía.
- Estribos: perímetro Ø 3/8" + un gancho suplementario que restringe las barras intermedias de las caras de 60 cm (3 ramas paralelas a b, 2 ramas paralelas a h; las barras intermedias de las caras de 40 cm quedan a menos de 15 cm de una barra restringida, E.060 21.6.4.3 / ACI 318-19 §18.7.5.2).
- Recubrimiento no confinado: curva de Mander con descascaramiento en $\\varepsilon_{sp} = 0.005$.
- Acero: curva de **Park y Paulay** con meseta de fluencia y endurecimiento.
- Rótula plástica: **Paulay y Priestley (1992)**, $L_p = 0.08L + 0.022d_bf_y$.`),
      calc(`# Materiales
fc = 28 MPa // Resistencia del concreto f'c
fy = 420 MPa // Fluencia del acero longitudinal (ASTM A615 Gr. 60)
fyh = 420 MPa // Fluencia del acero transversal
Es = 200000 MPa // Módulo del acero
esu = 0.09 // Deformación última del acero (ε en fsu)
# Sección y refuerzo
b = 40 cm // Ancho (perpendicular a la flexión)
h = 60 cm // Peralte en la dirección de flexión
rec = 4 cm // Recubrimiento libre hasta el estribo
s = 10 cm // Separación de estribos #3 en la zona de rótula (E.060 21.6.4.4: s ≤ 6db, b/4, 10 cm)
P = 1200 kN // Carga axial de servicio sísmica (CM + 0.25CV)
L = 1.5 m // Longitud de cortante (columna en doble curvatura, hn = 3.0 m)
Ag = b*h // Área bruta
nu = P/(Ag*fc) // Carga axial normalizada
check nu <= 0.35 // Carga axial moderada para comportamiento dúctil (Priestley 2007)
muD_req = 4 // Ductilidad de desplazamiento requerida (pórtico dúctil, R0 = 8)`),
      { type: 'momcurv', b: 'b', h: 'h', rec: 'rec', fc: 'fc', fy: 'fy', Es: 'Es', capas: '4 8 6.7 cm\n2 8 30 cm\n4 8 53.3 cm', estribo: '3', s: 's', nlb: '3', nlh: '2', fyh: 'fyh', confin: 'triaxial', P: 'P', concreto: 'mander', k3: '0.85', acero: 'park', bsh: '0.01', esh: '0.008', esu: 'esu', rsu: '1.35', traccion: true, L: 'L', mureq: '10', titulo: 'Diagrama M–φ de la columna 40 × 60 cm (10 Ø 1", estribos Ø 3/8" @ 10 cm), núcleo confinado de Mander' },
      calc(`# Resultados
Mn -> kN*m // Momento nominal (εc = 0.004 o εs = 0.015)
Mu -> kN*m // Momento último
muphi // Ductilidad de curvatura μφ = φu/φy
fcc -> MPa // Resistencia del concreto confinado
Lp -> cm // Longitud de rótula plástica
thetap // Rotación plástica disponible (rad)
check muD >= muD_req // Ductilidad de desplazamiento del voladizo equivalente ≥ requerida
check Mu >= 0.8*Mn // Sin pérdida excesiva de resistencia en la última (≤ 20 %)
check thetap >= 0.02 // Capacidad de rotación plástica ≥ 0.02 rad (ASCE 41-17 Tabla 10-8, columna condición i, LS)
"La sobrerresistencia de la rótula es $M_{max}/M_n$ = {Mmax/Mn}; para diseño por capacidad se usa $\\phi_o = 1.25$ (E.060 21.6.5).`),
      summary(),
    ],
  },
  // -------------------------------------------------------------------
  //  6) Aislamiento sísmico: base fija vs aislada (1 GDL equivalente)
  // -------------------------------------------------------------------
  {
    id: 'dy-aislamiento', pais: 'PE', cat: CAT, icon: 'quake', settings: { sys: 'tec' },
    name: 'Aislamiento: base fija vs aislada (tiempo-historia)', normas: 'NTE E.031 Aislamiento Sísmico (SaM, Art. 14); E.030-2026; Gasparini-Vanmarcke (SIMQKE)',
    desc: 'Acelerograma sintético compatible con el sismo máximo (E.031) y comparación tiempo-historia de la estructura con base fija (Tn = 0.4 s) y aislada con un sistema bilineal (LRB).',
    titulo: 'Comparación de la respuesta sísmica con base fija y con aislamiento en la base',
    blocks: [
      text(`# Generalidades
Se compara la respuesta de una edificación rígida de baja altura **con base fija** y **con aislamiento sísmico** (aisladores elastoméricos con núcleo de plomo, LRB), representadas como sistemas de 1 GDL. La excitación es un **acelerograma sintético** compatible con el espectro del **sismo máximo considerado** de la NTE E.031 ($S_{aM} = 1.5\\,Z\\,C\\,S$), generado con el método SIMQKE (Gasparini y Vanmarcke 1976). El sistema aislado se modela con un lazo **bilineal** (rigidez elástica $k_1$, post-fluencia $k_2 = \\alpha k_1$ y fuerza característica $Q_d$).`),
      calc(SITIO_E030),
      calc(`# Acelerograma sintético (sismo máximo E.031)
PGAm = 1.5*Z*S // PGA de referencia del sismo máximo (g)`),
      { type: 'simqke', Sa: 'SaME031(T, Z, S, Tp, Tl)', dur: '25 s', dt: '0.01 s', t1: '2 s', t2: '14 s', cdec: '0.25', seed: '20260', nf: '300', iters: '12', Tmin: '0.03 s', Tmax: '4 s', pgaref: 'PGAm', rmin: '0.90', nombre: 'mce', titulo: 'Acelerograma sintético compatible con SaM (E.031 Art. 14.4)' },
      calc(`# Estructura con base fija
Tf = 0.40 s // Periodo de la superestructura con base fija
zf = 0.05 // Amortiguamiento de la superestructura
Wt = 1500 tonf // Peso sísmico total`),
      { type: 'thsdof', registro: 'simqke', nombre: 'mce', T: 'Tf', zeta: 'zf', masa: 'Wt', modelo: 'lineal', metodo: 'nj', sufijo: 'F', escala: '1', titulo: 'Base fija (Tn = 0.40 s, ζ = 5 %) ante el sismo máximo sintético' },
      calc(`# Estructura aislada (sistema bilineal)
T2 = 3.0 s // Periodo post-fluencia del sistema de aislamiento (k2)
alphaA = 0.10 // Razón k2/k1 de los aisladores LRB
T1A = T2*sqrt(alphaA) // Periodo elástico inicial (k1)
CyA = 0.08 // Resistencia de fluencia del sistema fy/W
za = 0.02 // Amortiguamiento viscoso inherente (el resto es histerético)
Dcap = 45 cm // Capacidad de desplazamiento del aislador (ensayo de prototipo, E.031 Art. 29)`),
      { type: 'thsdof', registro: 'simqke', nombre: 'mce', T: 'T1A', zeta: 'za', masa: 'Wt', modelo: 'bilineal', metodo: 'avg', Cy: 'CyA', alpha: 'alphaA', sufijo: 'A', escala: '1', titulo: 'Base aislada bilineal (T2 = 3.0 s, Qd ≈ 0.072 W) ante el sismo máximo sintético' },
      calc(`# Comparación
check umax_A <= Dcap // Desplazamiento máximo del aislador ≤ capacidad
rV = Vbmax_A/Vbmax_F // Razón de cortante basal aislado / fijo
check rV <= 0.25 // El aislamiento reduce el cortante basal a menos de la cuarta parte
ra = amax_g_A/amax_g_F // Razón de aceleraciones absolutas (contenidos y equipos)
"El aislamiento reduce el cortante basal al {rV*100} % y la aceleración absoluta al {ra*100} % de los valores con base fija, a cambio de un desplazamiento de {umax_A} concentrado en la interfaz de aislamiento.`),
      summary(),
    ],
  },
];
