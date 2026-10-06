// =====================================================================
//  Plantillas — módulo «peru»  (RNE: E.020, E.030-2026, E.031)
//  Fuentes y criterios: docs/referencias/peru.md
// =====================================================================
import { calc, text, summary } from './_h.js';

// ---------------------------------------------------------------------
//  Datos comunes del edificio de ejemplo (5 pisos, oficinas, dual C°A°)
// ---------------------------------------------------------------------
const SITIO = `# Peligro sísmico y parámetros de sitio
zona = 4 // Zona sísmica (Art. 10, Anexo II) [4 : Zona 4|3 : Zona 3|2 : Zona 2|1 : Zona 1]
Z = ZE030(zona) // Factor de zona (Art. 11, Tabla N° 1)
Vs30 = 400 m/s // Velocidad promedio de ondas de corte en 30 m (Art. 15.2, del EMS)
S = SE030(zona, Vs30) // Factor de suelo, interpolado por Vs30 (Art. 17, Tabla N° 4)
Tp = TpE030(Vs30) // Periodo TP de la plataforma (Tabla N° 5)
Tl = TlE030(Vs30) // Periodo TL de inicio de desplazamiento constante (Tabla N° 5)
"Perfil de suelo **S{si(Vs30 >= 800 m/s, 0, si(Vs30 >= 550 m/s, 1, si(Vs30 >= 350 m/s, 2, si(Vs30 >= 200 m/s, 3, 4))))}** según la Tabla N° 3 (S0 ≥ 800 m/s; S1 550–800; S2 350–550; S3 200–350; S4 < 200 m/s).`;

const SISTEMA = `# Categoría, sistema estructural y regularidad
categoria = 4 // Categoría de la edificación (Art. 19, Tabla N° 7) [2 : A2 Esencial|3 : B Importante|4 : C Común]
U = UE030(categoria) // Factor de uso (Tabla N° 7)
sistema = 8 // Sistema estructural en la dirección de análisis (Tabla N° 10) [7 : C°A° pórticos|8 : C°A° dual|9 : C°A° muros estructurales|10 : C°A° muros de ductilidad limitada|11 : Albañilería armada o confinada|1 : Acero SMF|4 : Acero SCBF|6 : Acero EBF]
check sisE030(categoria, zona, sistema) == 1 // Sistema estructural permitido para la categoría y la zona (Art. 21, Tabla N° 9)
Ts = 0.30 s // Periodo predominante del terreno por razón espectral H/V (Art. 15.3; obligatorio en categorías A y B de la zona 4, Art. 14.2)
check Ts < 0.65*Tp or categoria == 4 or zona < 4 // Categorías A y B en zona 4: Ts < 0.65 TP; si no, se toma el perfil siguiente más desfavorable o un estudio de sitio (Art. 14.8)
R0 = R0E030(sistema) // Coeficiente básico de reducción (Art. 22, Tabla N° 10)
Ia = 1.0 // Factor de irregularidad en altura supuesto (Art. 24, Tabla N° 11) — se verifica en la sección de irregularidades
Ip = 1.0 // Factor de irregularidad en planta supuesto (Art. 24, Tabla N° 12)
R = R0*Ia*Ip // Coeficiente de reducción de las fuerzas sísmicas (Art. 26)`;

const PESOS = `# Peso sísmico por nivel (E.020 y E.030 Art. 31)
"Planta típica de $20 \\times 15$ m (oficinas). Metrado por nivel con los pesos unitarios del Anexo 1 de la NTE E.020; la carga viva se toma con el porcentaje del Art. 31 según la categoría.
Lx = 20 m // Dimensión en planta en X
Ly = 15 m // Dimensión en planta en Y
A = Lx*Ly // Área techada por nivel
n = 5 // Número de pisos
hei = [3.5, 2.9, 2.9, 2.9, 2.9] m // Altura de entrepiso (1 → n)
hc = [3.2, 2.9, 2.9, 2.9, 1.45] m // Altura tributaria de columnas y placas por nivel (½ inferior + ½ superior)
## Cargas por unidad de área
wl = pAligE020(0.20 m) -> kgf/m^2 // Aligerado h = 0.20 m (E.020 Anexo 1)
wa = 100 kgf/m^2 // Piso terminado / acabados (5 cm, E.020 Anexo 1)
wt = 1350 kgf/m^3*0.15 m*2.6 m*60 m/A -> kgf/m^2 // Tabiquería fija: pandereta hueca 1350 kgf/m³ (Anexo 1), e = 0.15 m, h = 2.6 m, 60 m por piso
Lo = 250 kgf/m^2 // Carga viva oficinas (E.020 Tabla 1)
Lt = 100 kgf/m^2 // Carga viva de azotea (E.020 Art. 7.1a)
## Elementos lineales por nivel
Pv = 2.4 tonf/m^3*0.30 m*(0.60 m - 0.20 m)*155 m // Vigas 0.30 × 0.60 (parte colgante), 155 m por piso
nc = 12 // Número de columnas 0.50 × 0.50
wc = 2.4 tonf/m^3*nc*0.50 m*0.50 m // Peso de columnas por metro de altura
wm = 2.4 tonf/m^3*16 m*0.25 m // Placas de C°A°: 16 m de longitud total, e = 0.25 m
## Pesos por nivel
Dp = (wl + wa + wt)*A -> tonf // Losa, acabados y tabiquería de un piso típico
Dt = (wl + wa)*A -> tonf // Losa y acabados de la azotea (sin tabiquería)
@modo corto
CM = [Dp, Dp, Dp, Dp, Dt] + Pv + (wc + wm)*hc // Carga muerta por nivel (vigas, columnas y placas incluidas)
CV = [Lo, Lo, Lo, Lo, Lt]*A // Carga viva por nivel
@modo completo
pCV = si(U >= 1.3, 0.50, 0.25) // Fracción de carga viva: 50 % categorías A y B; 25 % categoría C (Art. 31 a, b)
fCV = [pCV, pCV, pCV, pCV, 0.25] // Fracción por nivel; azotea 25 % (Art. 31 d)
@modo corto
P_i = CM + fCV .* CV // Peso sísmico por nivel (Art. 31)
@modo completo
P = sum(P_i) // Peso sísmico total
P/(n*A) -> tonf/m^2 // Peso por unidad de área (usual 0.8–1.2 tonf/m²)
h_i = cumsum(hei) // Altura de cada nivel desde la base
hn = sum(hei) // Altura total de la edificación`;

const ESTATICO = [
  text(`# Generalidades
**Proyecto:** edificio de oficinas de cinco pisos de concreto armado (sistema dual: pórticos y placas), con planta típica de 20 m × 15 m y losas aligeradas que actúan como diafragma rígido, ubicado en la zona sísmica 4 sobre suelo S2.

**Objetivo:** determinar las fuerzas sísmicas de diseño por el **método estático o de fuerzas equivalentes** de la NTE E.030 *Diseño Sismorresistente* (texto modificado por la RM N° 183-2026-VIVIENDA), verificar el periodo, el cortante basal, la distribución en altura con el exponente $k$, la torsión accidental, las derivas de entrepiso y la regularidad estructural.

**Normas:** RNE — NTE E.020 Cargas (2006); NTE E.030 Diseño Sismorresistente (2018, mod. RM 183-2026-VIVIENDA); NTE E.060 Concreto Armado.
**Materiales:** concreto $f'_c = 210$ kgf/cm², $E_c = 15000\\sqrt{f'_c}$; acero ASTM A615 Gr. 60, $f_y = 4200$ kgf/cm².
**Método:** el análisis estático es aplicable a estructuras regulares de no más de 30 m de altura en las zonas 2, 3 y 4 (Art. 33.2). Las rigideces de entrepiso provienen del modelo con diafragma rígido e inercias brutas (Art. 30.2).`),
  calc(SITIO),
  calc(SISTEMA),
  calc(PESOS),
  { type: 'stackbar', etiquetas: 'Piso 1; Piso 2; Piso 3; Piso 4; Azotea', series: 'Losa aligerada = [1,1,1,1,1]*wl*A\nAcabados = [1,1,1,1,1]*wa*A\nTabiquería = [1,1,1,1,0]*wt*A\nVigas = [1,1,1,1,1]*Pv\nColumnas y placas = (wc + wm)*hc\nCV (fracción Art. 31) = P_i - CM', unidad: 'tonf', titulo: 'Composición del peso sísmico por nivel' },
  calc(`# Periodo fundamental y factor de amplificación
CT = CTE030(sistema) // Coeficiente para estimar el periodo (Art. 36.1: 35 pórticos, 45 pórticos con muros en cajas, 60 duales/muros/albañilería)
T = hn/CT*1 s/m -> s // Periodo fundamental aproximado, hn en metros (Art. 36.1)
C = CE030(T, Tp, Tl) // Factor de amplificación sísmica; C = 2.5 para T ≤ TP en el análisis estático (Art. 18.3 y 34.1)
CR = max(C/R, 0.11) // Relación C/R con el valor mínimo de 0.11 (Art. 34.2)
k = kE030(T) // Exponente de distribución en altura (Art. 35.2)
# Fuerza cortante en la base
check hn <= 30 m // Aplicabilidad del método estático: estructura regular con hn ≤ 30 m (Art. 33.2; la regularidad se verifica más adelante)
V = Z*U*S*CR*P -> tonf // Fuerza cortante en la base V = Z·U·C·S·P/R con C/R ≥ 0.11 (Art. 34.1 y 34.2)
V/P // Cortante basal como fracción del peso
## Distribución de la fuerza sísmica en altura
@modo corto
alpha_i = P_i .* h_i.^k / sum(P_i .* h_i.^k) // Factor de distribución αi (Art. 35.1)
Fi = alpha_i*V // Fuerza sísmica en cada nivel (Art. 35.1)
Vi = V - cumsum(Fi) + Fi // Fuerza cortante de entrepiso
@modo completo
## Excentricidad accidental
ei = 0.05*Ly // Excentricidad accidental para sismo en X: 5 % de la dimensión perpendicular (Art. 37 a)
Mti = Fi*ei -> tonf*m // Momento torsor accidental en el centro de masas de cada nivel (Art. 37 a)
"Las fuerzas $F_i$ y los momentos $\\pm M_{ti}$ se aplican en el centro de masas de cada nivel, con el mismo signo en todos los niveles (Art. 37 b). Para los elementos verticales se combina 100 % de una dirección con 30 % de la perpendicular, sumando valores absolutos (Art. 33.3); la excentricidad se aplica solo en la dirección perpendicular a la del 100 % (Art. 28.3).`),
  { type: 'storyforces', P: 'P_i', hi: 'h_i', V: 'V', T: 'T', B: 'Ly', titulo: 'Fuerzas sísmicas estáticas, cortantes y momentos de volteo (sismo en X)' },
  calc(`# Desplazamientos laterales y distorsiones
"Rigidez lateral de cada entrepiso $K_i = V_i/\\Delta_i$ obtenida del modelo (diafragma rígido, secciones brutas, traslación pura). Los desplazamientos inelásticos se obtienen multiplicando por $0.75R$ (regular) o $0.85R$ (irregular) los del análisis lineal con fuerzas reducidas, **sin** considerar el mínimo $C/R$ (Art. 50.3). La distorsión que se compara con la Tabla N° 14 es la **máxima** del entrepiso, en el extremo del edificio, incluyendo la excentricidad accidental: se obtiene con la relación $\\Delta_{max}/\\Delta_{CM}$ del modelo tridimensional.
Ki = [72000, 61000, 56000, 50000, 41000] tonf/m // Rigidez lateral de entrepiso en X (del modelo)
irr = 0 // Condición de regularidad para el factor de desplazamientos [0 : Regular (0.75R)|1 : Irregular (0.85R)]
fd = fdespE030(irr)*R // Factor de amplificación de desplazamientos (Art. 50.1 y 50.2)
De = Vi ./ Ki -> cm // Desplazamiento relativo elástico de entrepiso bajo las fuerzas Fi
fCR = (C/R)/CR // Corrección por el mínimo C/R, que no se aplica a los desplazamientos (Art. 50.3)
Delta_e = fCR*De // Desplazamiento relativo elástico para el control de derivas
Delta_i = fd*Delta_e // Desplazamiento relativo inelástico en el centro de masas
deriva = Delta_i ./ hei // Distorsión de entrepiso en el centro de masas Δi/hei
rt = [1.12, 1.14, 1.15, 1.16, 1.18] // Relación Δmax/Δprom ≈ Δextremo/ΔCM por entrepiso (del modelo 3D con excentricidad accidental)
deriva_max = rt .* deriva // Distorsión máxima de entrepiso en el extremo del edificio
mat = 1 // Material predominante (Tabla N° 14) [1 : Concreto armado 0.007|2 : Acero 0.010|3 : Albañilería 0.005|4 : Madera 0.010|5 : Muros de ductilidad limitada 0.004]
dlim = dlimE030(mat) // Distorsión máxima permitida (Art. 51, Tabla N° 14)
check max(deriva_max) <= dlim // Distorsión máxima de entrepiso, en el extremo del edificio (Art. 51)
u_i = cumsum(Delta_i) // Desplazamiento lateral inelástico de cada nivel (centro de masas)
umax = max(rt .* u_i) -> cm // Desplazamiento inelástico máximo de la azotea en el extremo (para la junta sísmica, Art. 52)
## Verificación del periodo con la fórmula de Rayleigh
di = cumsum(De) // Desplazamiento elástico de cada nivel bajo Fi (traslación pura)
g0 = 9.81 m/s^2 // Aceleración de la gravedad
TR = 2*pi*sqrt(sum(P_i .* di.^2)/(g0*sum(Fi .* di))) -> s // Periodo por Rayleigh (Art. 36.2)
TR85 = 0.85*TR // Reducción por rigidez de elementos no estructurales no aislados (Art. 36.3)
CR_ = CE030(TR85, Tp, Tl) // Factor C con el periodo de Rayleigh
check CR_ <= C // El periodo aproximado hn/CT no subestima la demanda (C de Rayleigh ≤ C adoptado)
# Fuerzas sísmicas verticales
Fv = 2/3*Z*U*S // Fracción del peso para la fuerza sísmica vertical (Art. 38.1), en voladizos, elementos de gran luz y pre/postensados (Art. 28.4)`),
  { type: 'table', columnas: 'Nivel = 1:5\n$h_i$ [m] = h_i\n$P_i$ [tonf] = P_i\n$\\alpha_i$ = alpha_i\n$F_i$ [tonf] = Fi\n$V_i$ [tonf] = Vi\n$K_i$ [tonf/m] = Ki\n$\\Delta_i$ inelástico CM [cm] = Delta_i\n$\\Delta_i/h_{ei}$ CM = deriva\n$\\Delta_{max}/h_{ei}$ extremo = deriva_max', dec: '4', titulo: 'Resumen del análisis estático en la dirección X' },
  calc(`# Verificación de la regularidad estructural
Dprom = Delta_e // Desplazamiento relativo promedio de los extremos (≈ centro de masas, del modelo con excentricidad accidental)
Dmax = rt .* Dprom // Desplazamiento relativo máximo en el extremo del edificio`),
  { type: 'irregE030', K: 'Ki', P: 'P_i', Dmax: 'Dmax', Dprom: 'Dprom', deriva: 'deriva_max', dlim: 'dlim', disc: '0', esq: false, diaf: false, nopar: false, cat: 'categoria', zona: 'zona' },
  calc(`check Ia <= Ia_ev // El factor Ia supuesto no excede el evaluado (Art. 24.1)
check Ip <= Ip_ev // El factor Ip supuesto no excede el evaluado (Art. 24.2)
check Ia_ev*Ip_ev == 1 or zona == 1 or ((sistema == 9 or sistema == 10 or sistema == 11) and hn <= 15 m) // Análisis estático permitido: estructura regular, zona 1, o muros portantes de C°A°/albañilería de hasta 15 m (Art. 33.2)`),
  { type: 'spectrum', Z: 'Z', U: 'U', S: 'S', Tp: 'Tp', Tl: 'Tl', R: 'R', T: 'T', titulo: 'Espectro de diseño ZUCS/R (E.030-2026 Art. 18 y 41) y periodo fundamental' },
  text(`> **Notas.** (1) El análisis se repite en la dirección Y con $e_i = 0.05\\,L_x$. (2) Si la estructura resultara irregular, el método estático solo se permite en la zona 1 o para muros portantes de C°A° y albañilería de hasta 15 m (Art. 33.2); en otro caso use el análisis dinámico modal espectral. (3) Para verificaciones por esfuerzos admisibles las fuerzas sísmicas se multiplican por 0.8 (Art. 29).`),
  summary(),
];

const DINAMICO = [
  text(`# Generalidades
**Proyecto:** edificio de oficinas de cinco pisos de concreto armado, sistema dual, planta de 20 m × 15 m con diafragmas rígidos (el mismo de la memoria de análisis estático), en la zona 4 sobre suelo S2.

**Objetivo:** realizar el **análisis dinámico modal espectral** de la NTE E.030 (Subcapítulo 2 del Capítulo IV, texto modificado por la RM N° 183-2026-VIVIENDA) con un modelo de masas concentradas de un grado de libertad traslacional por nivel (edificio de cortante, Art. 30.3): periodos y formas de modo, masas participativas (Art. 40), espectro inelástico de pseudo-aceleraciones (Art. 41), combinación modal CQC (Art. 42), cortante mínimo respecto del estático (Art. 44) y control de derivas (Art. 50 y 51).

**Hipótesis:** las rigideces laterales de entrepiso $K_i$ provienen del modelo tridimensional con secciones brutas (Art. 30.2); la torsión accidental (Art. 45) y la combinación direccional 100 % + 30 % (Art. 43) se consideran en el modelo tridimensional y no se incluyen en este modelo plano.`),
  calc(SITIO),
  calc(SISTEMA),
  calc(PESOS),
  calc(`# Espectro inelástico de pseudo-aceleraciones
Sa(T) = Z*U*CE030d(T, Tp, Tl)*S/R // Sa/g = ZUCS/R con C de la Tabla N° 6, incluye T < 0.2 TP (Art. 41.1)
g0 = 9.81 m/s^2 // Aceleración de la gravedad
Sa(Tp)*g0 // Ordenada de la meseta del espectro
## Cortante estático de referencia (Art. 34)
CT = CTE030(sistema) // Coeficiente CT (Art. 36.1)
T = hn/CT*1 s/m -> s // Periodo fundamental aproximado (Art. 36.1)
C = CE030(T, Tp, Tl) // Factor de amplificación para el análisis estático (Art. 18.3)
Vest = Z*U*S*max(C/R, 0.11)*P -> tonf // Cortante basal estático (Art. 34.1 y 34.2)
## Rigidez lateral y parámetros de control
Ki = [72000, 61000, 56000, 50000, 41000] tonf/m // Rigidez lateral de entrepiso (del modelo 3D, traslación pura)
irr = 0 // Regularidad de la estructura [0 : Regular|1 : Irregular]
fd = fdespE030(irr)*R // Factor de desplazamientos inelásticos 0.75R / 0.85R (Art. 50)
pmin = si(irr == 1, 0.90, 0.80) // Fracción mínima del cortante estático (Art. 44.1)
dlim = dlimE030(1) // Distorsión máxima para concreto armado (Tabla N° 14)`),
  { type: 'plot', expr: 'Sa(x); Z*U*CE030(x, Tp, Tl)*S/R', var: 'x', desde: '0', hasta: '3', puntos: '300', xlabel: 'Periodo T [s]', ylabel: 'Sa/g', leyenda: true, nombres: 'Espectro dinámico (Tabla N° 6, con rama T < 0.2 TP); Factor del análisis estático (C = 2.5 para T ≤ TP)', titulo: 'Espectro inelástico de pseudo-aceleraciones E.030-2026' },
  calc(`# Análisis modal espectral
"Ecuación de movimiento sin amortiguamiento $\\mathbf{K}\\,\\boldsymbol{\\phi}_n = \\omega_n^2\\,\\mathbf{M}\\,\\boldsymbol{\\phi}_n$ con $\\mathbf{M} = \\mathrm{diag}(P_i/g)$ y $\\mathbf{K}$ tridiagonal de entrepisos. Para cada modo: $\\Gamma_n = \\boldsymbol{\\phi}_n^T\\mathbf{M}\\mathbf{1}/\\boldsymbol{\\phi}_n^T\\mathbf{M}\\boldsymbol{\\phi}_n$, masa efectiva $M_n^* = \\Gamma_n^2\\,\\boldsymbol{\\phi}_n^T\\mathbf{M}\\boldsymbol{\\phi}_n$, fuerzas $\\mathbf{f}_n = \\mathbf{M}\\boldsymbol{\\phi}_n\\Gamma_n S_a(T_n)$ y desplazamientos $\\mathbf{u}_n = \\Gamma_n\\boldsymbol{\\phi}_n S_a(T_n)/\\omega_n^2$. Las respuestas se combinan con la **combinación cuadrática completa** (CQC, β = 0.05, Art. 42.2); las derivas se combinan directamente por entrepiso.`),
  { type: 'modal', masas: 'P_i', rigideces: 'Ki', alturas: 'hei', Sa: 'Sa(T)', comb: 'CQC', beta: '0.05', modos: '', fdesp: 'fd', dlim: 'dlim', Vest: 'Vest', pmin: 'pmin', titulo: 'Formas modales, cortantes de entrepiso combinados (CQC) y derivas inelásticas' },
  calc(`# Fuerza cortante mínima en la base (Art. 44)
T1 // Periodo fundamental del modelo
Vdin // Cortante basal dinámico (CQC)
Vmin = pmin*Vest // Cortante mínimo en el primer entrepiso (Art. 44.1)
fesc = max(1, Vmin/Vdin) // Factor de escala de las fuerzas; no se escalan los desplazamientos (Art. 44.2)
Vdis = fesc*Vdin // Cortante basal de diseño
check Vdis >= Vmin // Cortante dinámico de diseño ≥ 80 % (regular) ó 90 % (irregular) del estático (Art. 44.1)
@modo corto
Vi_dis = fesc*Vi_din // Cortantes de entrepiso de diseño (escalados)
Fi_dis = fesc*Fi_din // Fuerzas de diseño por nivel (escaladas)
@modo completo
# Control de desplazamientos laterales (Art. 50 y 51)
"Los desplazamientos del análisis con fuerzas reducidas se multiplican por $0.75R$ (regular) o $0.85R$ (irregular), sin el escalamiento del Art. 44 ni el mínimo C/R (Art. 50.3).
max(deriva_din) // Distorsión inelástica máxima en el centro de masas (modelo plano, bloque modal)
rt = [1.12, 1.14, 1.15, 1.16, 1.18] // Relación Δextremo/ΔCM por entrepiso del modelo 3D con excentricidad accidental (Art. 45)
deriva_max = rt .* deriva_din // Distorsión máxima de entrepiso en el extremo del edificio
check max(deriva_max) <= dlim // Distorsión máxima de entrepiso incluyendo la torsión accidental (Art. 51, Tabla N° 14)
umax = max(rt .* ui_din) // Desplazamiento inelástico máximo en la azotea, en el extremo (para la junta sísmica, Art. 52)`),
  { type: 'table', columnas: 'Nivel = 1:5\n$h_i$ [m] = h_i\n$F_i$ diseño [tonf] = Fi_dis\n$V_i$ dinámico [tonf] = Vi_din\n$V_i$ diseño [tonf] = Vi_dis\n$u_i$ inelástico [cm] = ui_din\n$\\Delta_i/h_{ei}$ CM = deriva_din\n$\\Delta_{max}/h_{ei}$ extremo = deriva_max', dec: '4', titulo: 'Resultados del análisis dinámico por nivel' },
  { type: 'spectrum', Z: 'Z', U: 'U', S: 'S', Tp: 'Tp', Tl: 'Tl', R: 'R', T: 'T1', corto: true, titulo: 'Espectro de diseño y periodo fundamental del modelo dinámico' },
  text(`> **Notas.** (1) Para estructuras con diafragma rígido se usa en el modelo 3D una excentricidad accidental de 0.05 veces la dimensión perpendicular, con el signo más desfavorable (Art. 45). (2) La respuesta por sismo simultáneo se obtiene como la raíz cuadrada de la suma de los cuadrados de los efectos de 100 % en una dirección y 30 % en la perpendicular (Art. 43). (3) Los resultados de fuerzas se escalan con $f_{esc}$; los desplazamientos no (Art. 44.2).`),
  summary(),
];

const IRREG = [
  text(`# Generalidades
**Proyecto:** edificio de seis pisos de concreto armado (sistema dual), primer piso comercial de 4.0 m de altura con menor densidad de muros y cinco pisos típicos de oficinas de 2.8 m; planta de 24 m × 16 m, zona sísmica 4, categoría C.

**Objetivo:** evaluar la **regularidad estructural** según la NTE E.030 (Art. 23 a 26, texto modificado por la RM N° 183-2026-VIVIENDA): irregularidades en altura (Tabla N° 11), en planta (Tabla N° 12), restricciones por categoría y zona (Tabla N° 13), los factores $I_a$, $I_p$ y el coeficiente $R = R_0\\,I_a\\,I_p$, así como sus consecuencias en el procedimiento de análisis (Art. 33.2) y en el cálculo de desplazamientos (Art. 50).

**Datos del modelo:** rigideces laterales de entrepiso $K_i = V_i/\\Delta_i$ en el centro de masas (traslación pura), resistencias de entrepiso y desplazamientos relativos en los extremos con excentricidad accidental, obtenidos del modelo tridimensional con secciones brutas (Art. 30).`),
  calc(`# Datos generales
zona = 4 // Zona sísmica [4 : Zona 4|3 : Zona 3|2 : Zona 2|1 : Zona 1]
categoria = 4 // Categoría de la edificación (Tabla N° 7) [2 : A2 Esencial|3 : B Importante|4 : C Común]
U = UE030(categoria) // Factor de uso (Tabla N° 7)
sistema = 8 // Sistema estructural (Tabla N° 10) [7 : C°A° pórticos|8 : C°A° dual|9 : C°A° muros estructurales|11 : Albañilería confinada]
check sisE030(categoria, zona, sistema) == 1 // Sistema estructural permitido para la categoría y la zona (Art. 21, Tabla N° 9)
R0 = R0E030(sistema) // Coeficiente básico de reducción (Tabla N° 10)
Lx = 24 m // Dimensión total en planta en X
Ly = 16 m // Dimensión total en planta en Y
n = 6 // Número de pisos
hei = [4.0, 2.8, 2.8, 2.8, 2.8, 2.8] m // Altura de entrepiso (1 → n)
hn = sum(hei) // Altura total
# Irregularidades en altura (Tabla N° 11)
## Rigidez — piso blando
"Existe irregularidad de rigidez si $K_i < 0.70\\,K_{i+1}$ o $K_i < 0.80\\,\\bar K_{i+1,i+2,i+3}$; es **extrema** si $K_i < 0.60\\,K_{i+1}$ o $K_i < 0.70\\,\\bar K$ (Tabla N° 11).
K1 = 38000 tonf/m // Rigidez lateral del entrepiso 1 en X (del modelo)
K2 = 52000 tonf/m // Rigidez lateral del entrepiso 2
K3 = 50000 tonf/m // Rigidez lateral del entrepiso 3
K4 = 47000 tonf/m // Rigidez lateral del entrepiso 4
K5 = 42000 tonf/m // Rigidez lateral del entrepiso 5
K6 = 33000 tonf/m // Rigidez lateral del entrepiso 6
Ki = [K1, K2, K3, K4, K5, K6] // Vector de rigideces de entrepiso (1 → n)
r1 = K1/K2 // Relación del primer entrepiso con el inmediato superior (≥ 0.70; extrema < 0.60)
r3 = K1/((K2 + K3 + K4)/3) // Relación con el promedio de los tres entrepisos superiores (≥ 0.80; extrema < 0.70)
Ia_K = IaRigE030(Ki) // Factor por rigidez evaluado en todos los entrepisos (0.75 piso blando; 0.50 extrema)
## Resistencia — piso débil
Vr = [620, 700, 680, 610, 520, 400] tonf // Resistencia al corte de cada entrepiso (suma de capacidades de columnas y muros)
Ia_V = IaResE030(Vr) // Factor por resistencia: Vr,i < 0.80 Vr,i+1 → 0.75; < 0.65 → 0.50
## Masa o peso
P_i = [380, 330, 330, 330, 330, 250] tonf // Peso sísmico por nivel (Art. 31)
Ia_M = IaMasE030(P_i) // Pi > 1.5 P adyacente → 0.90 (no se aplica a la azotea ni sótanos)
## Geometría vertical y discontinuidad de los sistemas resistentes
Dx = [24, 24, 24, 24, 24, 24] m // Dimensión en planta del sistema resistente por nivel
fdesal = 0 // Fracción del cortante tomada por elementos con desalineamiento vertical > 25 % de su dimensión
discont = si(fdesal > 0.25, 2, si(fdesal > 0.10, 1, 0)) // 0 regular, 1 discontinuidad (0.80), 2 extrema (0.60)
# Irregularidades en planta (Tabla N° 12)
## Esquinas entrantes
a_e = 6 m // Dimensión de la esquina entrante en X
b_e = 3 m // Dimensión de la esquina entrante en Y
a_e/Lx // Relación en X (irregular si ambas > 0.20)
b_e/Ly // Relación en Y
esquina = (a_e/Lx > 0.20) and (b_e/Ly > 0.20) // Esquinas entrantes en ambas direcciones
## Discontinuidad del diafragma
Aab = 18 m^2 // Área de aberturas (escalera y ascensor)
Aab/(Lx*Ly) // Relación de aberturas (irregular si > 0.50)
bnet = 12 m // Ancho neto mínimo de diafragma en la sección más debilitada
bnet/Ly // Sección neta / sección total (irregular si < 0.50)
diafrag = (Aab/(Lx*Ly) > 0.50) or (bnet/Ly < 0.50) // Discontinuidad del diafragma
## Sistemas no paralelos
noparal = 0 // Elementos resistentes no paralelos con ángulo ≥ 30° y ≥ 10 % del cortante [0 : No|1 : Sí]
## Torsión
"Se evalúa con $\\Delta_{max}/\\Delta_{prom}$ calculado incluyendo la excentricidad accidental; solo aplica con diafragma rígido y si la deriva máxima supera el 50 % de la permitida (Tabla N° 12).
Ia1 = min(Ia_K, Ia_V, Ia_M) // Factor Ia preliminar con el que se corrió el modelo (Ip = 1, conservador para las derivas)
fd = 0.85*R0*Ia1 // Desplazamientos de estructura irregular: 0.85 R (Art. 50.2)
"Los desplazamientos elásticos siguientes provienen del análisis con las fuerzas reducidas con $R = R_0 I_{a1}$ (el producto $0.85R\\cdot\\Delta_e$ es independiente de $R$ solo si ambos corresponden al mismo análisis).
Dprom = [0.40, 0.33, 0.31, 0.28, 0.23, 0.17] cm // Desplazamiento relativo elástico promedio de los extremos
rt = [1.18, 1.20, 1.22, 1.24, 1.26, 1.27] // Δmax/Δprom por entrepiso (del modelo)
@modo corto
Dmax = rt .* Dprom // Desplazamiento relativo elástico máximo en el extremo
deriva = fd*Dmax ./ hei // Distorsión inelástica máxima de entrepiso
@modo completo
dlim = dlimE030(1) // Límite para concreto armado (Tabla N° 14)`),
  { type: 'irregE030', K: 'Ki', Vr: 'Vr', P: 'P_i', D: 'Dx', Dmax: 'Dmax', Dprom: 'Dprom', deriva: 'deriva', dlim: 'dlim', disc: 'discont', esq: 'esquina', diaf: 'diafrag', nopar: 'noparal', cat: 'categoria', zona: 'zona', npisos: '[n, hn]' },
  calc(`# Coeficiente de reducción y consecuencias
Ia = Ia_ev // Factor de irregularidad en altura: menor valor de la Tabla N° 11 (Art. 24.1)
Ip = Ip_ev // Factor de irregularidad en planta: menor valor de la Tabla N° 12 (Art. 24.2)
R = R0*Ia*Ip // Coeficiente de reducción de las fuerzas sísmicas (Art. 26)
check max(deriva) <= dlim // Distorsión máxima con 0.85 R (Art. 50.2 y 51)
pmin = si(Ia*Ip < 1, 0.90, 0.80) // Cortante dinámico mínimo respecto del estático (Art. 44.1)
metodo = si(Ia*Ip == 1 or zona == 1 or ((sistema == 9 or sistema == 11) and hn <= 15 m), 1, 2) // Procedimiento admisible (Art. 33.2): 1 = estático o dinámico; 2 = solo dinámico modal espectral
"Producto $I_a I_p$ = {Ia*Ip}. Si $I_a I_p < 1$ la estructura es **irregular**: fuera de la zona 1 el análisis estático solo se permite para muros portantes de C°A° o albañilería de hasta 15 m (Art. 33.2); en los demás casos se emplea el análisis dinámico modal espectral con un cortante mínimo del 90 % del estático (Art. 44.1) y desplazamientos calculados con $0.85R$ (Art. 50.2).`),
  text(`> **Recomendación.** La irregularidad de rigidez del primer piso puede corregirse prolongando hasta la cimentación los muros de los pisos superiores o aumentando la rigidez del primer entrepiso, de modo que $K_1 \\ge 0.70\\,K_2$ y $K_1 \\ge 0.80\\,\\bar K_{2,3,4}$. En zonas 4, 3 y 2 no se permiten sistemas de transferencia en los que más del 25 % de las cargas sean soportadas por elementos verticales no continuos hasta la cimentación (Art. 25.2).`),
  summary(),
];

const METRADO = [
  text(`# Generalidades
**Proyecto:** edificio multifamiliar de cuatro pisos de concreto armado, planta rectangular de 12 m × 18 m, losas aligeradas en una dirección, vigas peraltadas y columnas de 0.30 m × 0.50 m; azotea no transitable con parapeto perimetral.

**Objetivo:** realizar el **metrado de cargas de gravedad** según la NTE E.020 *Cargas* (2006): carga muerta con los pesos unitarios del Anexo 1 (Art. 3), tabiquería con su peso real (Art. 4.1), carga viva mínima repartida de la Tabla 1 (Art. 6) y de techos (Art. 7), reducción de carga viva (Art. 10), peso sísmico por nivel (E.030 Art. 31) y cargas sobre una columna interior para su predimensionamiento.

**Normas:** RNE — NTE E.020 Cargas; NTE E.030 Diseño Sismorresistente (Art. 31); NTE E.060 Concreto Armado (Art. 9.2).`),
  calc(`# Datos generales
Lx = 12 m // Dimensión en planta en X
Ly = 18 m // Dimensión en planta en Y
A = Lx*Ly // Área techada por nivel
n = 4 // Número de pisos (el último es la azotea)
he = 2.70 m // Altura de entrepiso
categoria = 4 // Categoría de la edificación (E.030 Tabla N° 7) [2 : A2 Esencial|3 : B Importante|4 : C Común]
gc = 2400 kgf/m^3 // Peso unitario del concreto armado (E.020 Anexo 1: concreto simple de grava 2300 + 100)
# Cargas por unidad de área
## Losa
tipo = 1 // Sistema de techo [1 : Aligerado en una dirección|2 : Losa maciza]
hl = 0.20 m // Espesor de la losa [0.17 m|0.20 m|0.25 m|0.30 m]
wlosa = si(tipo == 1, pAligE020(hl), gc*hl) -> kgf/m^2 // Peso propio: aligerado E.020 Anexo 1 (viguetas 0.10 m @ 0.40 m) o maciza γc·h
wa = 100 kgf/m^2 // Piso terminado (contrapiso 5 cm, ≈ 20 kgf/m² por cm, E.020 Anexo 1)
## Tabiquería (peso real, E.020 Art. 4.1)
gt = 1800 kgf/m^3 // Peso unitario de la albañilería (E.020 Anexo 1) [1800 kgf/m^3 : Unidades de arcilla sólidas|1350 kgf/m^3 : Unidades de arcilla huecas|1600 kgf/m^3 : Adobe]
et = 0.13 m // Espesor del muro (soga)
gm = 2000 kgf/m^3 // Mortero de cemento para tarrajeo (E.020 Anexo 1)
ht = he - hl // Altura libre de los tabiques
wtab = (gt*et + gm*2*0.015 m)*ht -> kgf/m // Peso por metro lineal de tabique tarrajeado en ambas caras
Ltab = 42 m // Longitud de tabiques por piso típico (de los planos de arquitectura)
wteq = wtab*Ltab/A -> kgf/m^2 // Carga muerta equivalente repartida de tabiquería
## Carga viva (E.020 Tabla 1 y Art. 7)
Lo = 200 kgf/m^2 // Carga viva mínima repartida del piso típico (Tabla 1) [200 kgf/m^2 : Viviendas|250 kgf/m^2 : Oficinas|300 kgf/m^2 : Hospitales — salas de operación y laboratorios|400 kgf/m^2 : Corredores y escaleras|500 kgf/m^2 : Tiendas]
th = 2 deg // Inclinación del techo
Lt = CVtechoE020(th) // Carga viva de techo: 100 kgf/m² hasta 3°, −5 kgf/m² por grado, mín. 50 kgf/m² (Art. 7.1 a, b)
# Elementos lineales por nivel
bv = 0.25 m // Ancho de vigas
hv = 0.50 m // Peralte de vigas
Lvig = 2*Lx + 3*Ly + 4*Lx // Longitud total de vigas por nivel (2 ejes + 3 ejes + 4 ejes)
Dvig = gc*bv*(hv - hl)*Lvig -> tonf // Peso de vigas (parte colgante)
nc = 12 // Número de columnas
bc = 0.30 m // Dimensión de columna
dc = 0.50 m // Dimensión de columna
Dcol = gc*nc*bc*dc*he -> tonf // Peso de columnas por nivel
Dpar = (gt*0.13 m + gm*0.03 m)*1.0 m*2*(Lx + Ly) -> tonf // Parapeto de azotea h = 1.0 m en el perímetro
# Carga muerta, carga viva y peso sísmico por nivel
Dt = (wlosa + wa + wteq)*A -> tonf // Losa, acabados y tabiques de un piso típico
Dz = (wlosa + wa)*A -> tonf // Losa y acabados (impermeabilización) de la azotea
@modo corto
CM = [Dt, Dt, Dt, Dz] + Dvig + [Dcol, Dcol, Dcol, Dcol/2] + [0, 0, 0, 1]*Dpar // Carga muerta por nivel (azotea: ½ columna superior)
CV = [Lo, Lo, Lo, Lt]*A // Carga viva por nivel
@modo completo
pCV = si(categoria <= 3, 0.50, 0.25) // Fracción de CV para el peso sísmico (E.030 Art. 31 a, b)
fCV = [pCV, pCV, pCV, 0.25] // Azotea: 25 % de la carga viva (E.030 Art. 31 d)
@modo corto
P_i = CM + fCV .* CV // Peso sísmico por nivel
@modo completo
CM_t = sum(CM) // Carga muerta total
CV_t = sum(CV) // Carga viva total
P = sum(P_i) // Peso sísmico total (E.030 Art. 31)
q = P/(n*A) -> tonf/m^2 // Peso sísmico por m² de área techada
qmax = 1.2 tonf/m^2 // Valor usual máximo del peso por m² de edificaciones de C°A° aporticadas
check q <= qmax // Control del orden de magnitud del metrado (usual 0.8–1.2 tonf/m²)`),
  { type: 'stackbar', etiquetas: 'Piso 1; Piso 2; Piso 3; Azotea', series: 'Losa = [1,1,1,1]*wlosa*A\nAcabados = [1,1,1,1]*wa*A\nTabiquería = [1,1,1,0]*wteq*A\nVigas = [1,1,1,1]*Dvig\nColumnas = [Dcol, Dcol, Dcol, Dcol/2]\nParapeto = [0,0,0,1]*Dpar\nCarga viva = CV', unidad: 'tonf', titulo: 'Metrado de cargas por nivel: carga muerta por componente y carga viva' },
  { type: 'table', columnas: 'Nivel = ["Piso 1", "Piso 2", "Piso 3", "Azotea"]\nCM [tonf] = CM\nCV [tonf] = CV\nFracción CV = fCV\nPeso sísmico $P_i$ [tonf] = P_i', total: true, dec: '2', titulo: 'Resumen del metrado por nivel' },
  calc(`# Cargas sobre una columna interior
a1 = 4.50 m // Ancho tributario en X
a2 = 5.00 m // Ancho tributario en Y
At = a1*a2 // Área tributaria por nivel
pd = (wlosa + wa + wteq)*At + gc*bv*(hv - hl)*(a1 + a2) + gc*bc*dc*he -> tonf // Carga muerta por piso típico
pdz = (wlosa + wa)*At + gc*bv*(hv - hl)*(a1 + a2) + gc*bc*dc*he/2 -> tonf // Carga muerta de la azotea
PD = (n - 1)*pd + pdz // Carga muerta acumulada en la base de la columna
## Reducción de carga viva (E.020 Art. 10)
kLL = 2 // Factor de carga viva sobre el elemento: columnas y muros (Tabla 3)
Ai = kLL*(n - 1)*At // Área de influencia: suma de los pisos típicos (Art. 10 c)
"La reducción solo se aplica si $A_i > 40$ m² (Art. 10 a); en caso contrario $L_r = L_o$ (la función lo aplica automáticamente). No se reduce en asambleas, depósitos, tiendas ni sobrecargas ≥ 500 kgf/m², salvo 20 % en columnas de dos o más pisos (Art. 10 f).
Lr = LrE020(Lo, (n - 1)*At, kLL) -> kgf/m^2 // Lr = Lo(0.25 + 4.6/√Ai) (Art. 10)
check Lr >= 0.5*Lo // Carga viva reducida no menor que 0.5 Lo (Art. 10 b)
Lrt = LrE020(Lt, At, kLL) -> kgf/m^2 // Carga viva reducida del techo (Art. 10 g: ≥ 0.50 Lo)
PL = (n - 1)*Lr*At + Lrt*At -> tonf // Carga viva reducida acumulada
## Cargas de diseño y predimensionamiento
Ps = PD + PL // Carga de servicio
Pu = 1.4*PD + 1.7*PL // Carga última (E.060 Art. 9.2.1)
fc = 210 kgf/cm^2 // Resistencia del concreto [175 kgf/cm^2|210 kgf/cm^2|280 kgf/cm^2]
Areq = Ps/(0.45*fc) -> cm^2 // Área requerida de columna interior, criterio Ps/(0.45 f'c) (Blanco Blasco, predimensionamiento)
Ac = bc*dc -> cm^2 // Área de la columna propuesta
check Ac >= Areq // Sección de columna suficiente para el predimensionamiento`),
  text(`> **Notas.** (1) Las sobrecargas de la Tabla 1 se verifican promediando la carga real sobre una región de 15 m² sin lados menores de 3 m (Art. 6.4). (2) No se reduce la carga viva en lugares de asamblea, depósitos, tiendas ni en áreas con sobrecarga ≥ 500 kgf/m², salvo 20 % en columnas que soportan dos o más pisos (Art. 10 f). (3) Si se prevé tabiquería móvil se añade como carga viva equivalente de al menos 50 kgf/m² (media altura) o 100 kgf/m² (altura completa) (Art. 6.3).`),
  summary(),
];

const VIENTO = [
  text(`# Generalidades
**Proyecto:** nave industrial de acero de un solo cuerpo, con pórticos a dos aguas de 20 m de luz espaciados a 6 m, 40 m de longitud, altura de alero de 9 m y pendiente de techo de 20 %; cerramientos laterales y cobertura de calamina metálica.

**Objetivo:** determinar las **cargas de viento** según la NTE E.020 *Cargas* (Art. 12): velocidad de diseño en altura, presiones y succiones exteriores con los factores de forma de la Tabla 4, cargas interiores sobre elementos de cierre (Tabla 5), cargas lineales sobre el pórtico típico, desplazamiento lateral admisible (Art. 24) y, cuando corresponda, la carga de nieve (Art. 11).

**Convención:** presión (+) hacia la superficie, succión (−) saliendo de ella. El viento actúa en las dos direcciones ortogonales (Art. 12.1): aquí se desarrolla el viento perpendicular a la cumbrera; con viento paralelo a la cumbrera los muros laterales y ambas aguas del techo quedan en succión con $C = -0.7$ (Tabla 4, superficies paralelas al viento) y los hastiales con +0.8 / −0.6.`),
  calc(`# Velocidad de diseño (E.020 Art. 12.3)
V = 80 km/h // Velocidad básica hasta 10 m de altura según el mapa eólico del Anexo 2 (no menor que 75 km/h)
B = 20 m // Luz de la nave (dirección del viento)
Ln = 40 m // Longitud de la nave
Ha = 9 m // Altura de alero
pend = 0.20 // Pendiente del techo
theta = atan(pend) -> deg // Inclinación del techo
Hc = Ha + B/2*pend // Altura de cumbrera
Vh = VhE020(V, Hc) // Velocidad de diseño a la altura de cumbrera: Vh = V(h/10)^0.22 (conservador para toda la nave)
ftipo = 1.0 // Clasificación de la edificación (Art. 12.2) [1.0 : Tipo 1 (poco sensible a ráfagas)|1.2 : Tipo 2 (esbelta, sensible a ráfagas)]
q0 = ftipo*PhE020(1, Vh) -> kgf/m^2 // Presión de referencia 0.005·Vh² (C = 1, Art. 12.4)
# Presiones exteriores (E.020 Art. 12.4, Tabla 4)
C_mb = 0.8 // Superficie vertical a barlovento
C_ms = -0.6 // Superficie vertical a sotavento
C_ml = -0.7 // Superficies paralelas a la dirección del viento (muros laterales)
C_tb1 = 0.3 // Techo a barlovento, inclinación ≤ 15°: caso de presión
C_tb2 = -0.7 // Techo a barlovento, inclinación ≤ 15°: caso de succión
C_ts = -0.6 // Techo a sotavento, inclinación ≤ 15°
check theta <= 15 deg // Factores de forma válidos para superficies inclinadas a 15° o menos
p_mb = ftipo*PhE020(C_mb, Vh) -> kgf/m^2 // Muro a barlovento
p_ms = ftipo*PhE020(C_ms, Vh) -> kgf/m^2 // Muro a sotavento
p_ml = ftipo*PhE020(C_ml, Vh) -> kgf/m^2 // Muros laterales
p_tb = ftipo*PhE020(C_tb2, Vh) -> kgf/m^2 // Techo a barlovento (caso de succión, gobierna la cobertura)
p_tb1 = ftipo*PhE020(C_tb1, Vh) -> kgf/m^2 // Techo a barlovento (caso de presión)
p_ts = ftipo*PhE020(C_ts, Vh) -> kgf/m^2 // Techo a sotavento
# Presión interior y presiones netas en elementos de cierre (Art. 12.5, Tabla 5)
C_pi = 0.3 // Factor de presión interior: aberturas uniformes ±0.3 [0.3 : Aberturas uniformes (±0.3)|0.8 : Aberturas principales a barlovento (+0.8)|0.6 : Aberturas principales a sotavento o costados (−0.6)]
p_i = ftipo*PhE020(C_pi, Vh) -> kgf/m^2 // Magnitud de la presión interior
pnet_tb = abs(p_tb) + p_i -> kgf/m^2 // Succión neta máxima en la cobertura a barlovento (succión exterior + presión interior)
pnet_mb = p_mb + p_i -> kgf/m^2 // Presión neta máxima en el cerramiento a barlovento (presión exterior + succión interior)
## Cobertura de calamina
wcob = 8 kgf/m^2 // Peso propio de la cobertura y accesorios
qadm = 60 kgf/m^2 // Resistencia admisible a succión de la cobertura con sus fijaciones (dato del fabricante, correas @ 1.5 m)
check pnet_tb - 0.9*wcob <= qadm // Levantamiento neto de la cobertura (E.020 Art. 12.5 y 20.1: solo cargas muertas estabilizan)
check pnet_mb <= qadm // Presión neta en los paneles de cerramiento
# Cargas sobre el pórtico típico
s_p = 6 m // Espaciamiento entre pórticos
w_mb = p_mb*s_p -> kgf/m // Columna a barlovento (presión)
w_tb = p_tb*s_p -> kgf/m // Viga a barlovento (succión)
w_ts = p_ts*s_p -> kgf/m // Viga a sotavento (succión)
w_ms = p_ms*s_p -> kgf/m // Columna a sotavento (succión)
Fh = (p_mb - p_ms)*Ha*s_p -> tonf // Fuerza horizontal neta de muros sobre un pórtico
## Desplazamiento lateral por viento (E.020 Art. 24)
d_v = 3.2 cm // Desplazamiento lateral del alero bajo cargas de viento de servicio (del modelo)
check d_v/Ha <= 0.01 // Desplazamiento relativo máximo por viento: 1 % de la altura (Art. 24)
# Carga de nieve (E.020 Art. 11) — solo en zonas con nevadas
Qs = 40 kgf/m^2 // Carga básica de nieve sobre el suelo, mínima 40 kgf/m² (Art. 11.2)
Qt = QtE020(Qs, theta) -> kgf/m^2 // Carga de nieve sobre el techo (Art. 11.3)
Lcob = 30 kgf/m^2 // Carga viva mínima de techos con cobertura liviana (Art. 7.1 d)
Lroof = max(Qt, Lcob) -> kgf/m^2 // Carga viva de techo de diseño (la nieve se considera carga viva y no actúa con viento, Art. 11.1)`),
  { type: 'windgable', B: 'B', H: 'Ha', th: 'theta', p1: 'p_mb', p2: 'p_tb', p3: 'p_ts', p4: 'p_ms', pi: '±0.3 · 0.005·Vh² (Tabla 5)', titulo: 'Presiones exteriores de viento sobre el pórtico típico (caso de succión en el techo)' },
  { type: 'table', columnas: 'Superficie = ["Muro barlovento", "Techo barlovento (presión)", "Techo barlovento (succión)", "Techo sotavento", "Muro sotavento", "Muros laterales"]\nFactor C = [C_mb, C_tb1, C_tb2, C_ts, C_ms, C_ml]\nPresión exterior [kgf/m^2] = [p_mb, p_tb1, p_tb, p_ts, p_ms, p_ml]\nCarga en pórtico [kgf/m] = [p_mb, p_tb1, p_tb, p_ts, p_ms, p_ml]*s_p', dec: '1', titulo: 'Factores de forma (E.020 Tabla 4) y presiones de diseño' },
  text(`> **Combinaciones.** Para diseño por esfuerzos admisibles: D + W, α(D + L + W) con α ≥ 0.75 (E.020 Art. 19). Para diseño por resistencia se emplean los factores de la norma de cada material: concreto armado E.060 Art. 9.2.2, $U = 1.25(CM + CV \\pm CVi)$ y $U = 0.9\\,CM \\pm 1.25\\,CVi$ ($CVi$ = carga de viento); acero E.090 (LRFD). La estabilidad al volteo y al deslizamiento debe tener factores de seguridad de 1.5 y 1.25 con las cargas muertas (Art. 21 y 22).`),
  summary(),
];

const NOESTRUCT = [
  text(`# Generalidades
**Proyecto:** edificio de oficinas de cinco pisos de concreto armado (sistema dual) en la zona 4, suelo S2, categoría C, cuyo análisis estático proporciona las fuerzas $F_i$ y pesos $P_i$ por nivel. En la azotea hay un parapeto de albañilería y un tanque elevado de agua; en los pisos hay tabiques de albañilería; en el lindero, un cerco perimétrico. El edificio colinda con otro existente de tres pisos.

**Objetivo:** determinar las fuerzas sísmicas de diseño de **elementos no estructurales** (E.030-2026, Capítulo VI, Art. 55 a 61) y la **separación sísmica** mínima entre edificios y al límite de propiedad (Art. 52).`),
  calc(`# Parámetros sísmicos y respuesta del edificio
Z = ZE030(4) // Factor de zona, zona 4 (Tabla N° 1)
U = 1.0 // Factor de uso, categoría C (Tabla N° 7)
Vs30 = 400 m/s // Velocidad de ondas de corte del sitio
S = SE030(4, Vs30) // Factor de suelo (Tabla N° 4)
hei = [3.5, 2.9, 2.9, 2.9, 2.9] m // Alturas de entrepiso
h_i = cumsum(hei) // Altura de cada nivel
P_i = [268.7, 263.7, 263.7, 263.7, 196.5] tonf // Peso sísmico por nivel (análisis estático)
Fi = [18.12, 32.52, 47.25, 61.99, 57.17] tonf // Fuerza sísmica estática por nivel (Art. 35)
ai = Fi ./ P_i // Aceleración de cada nivel ai/g = Fi/Pi (Art. 57.2)
a5 = sum(ai .* [0, 0, 0, 0, 1]) // Aceleración de la azotea (nivel 5)
a2 = sum(ai .* [0, 1, 0, 0, 0]) // Aceleración del nivel 2
a3 = sum(ai .* [0, 0, 1, 0, 0]) // Aceleración del nivel 3
amin = 0.5*Z*U*S // Coeficiente mínimo 0.5·Z·U·S (Art. 58)
# Parapeto de azotea (C1 = 3.0)
C1p = C1E030(3) // Parapetos en la azotea (Tabla N° 15)
gal = 1800 kgf/m^3 // Albañilería de unidades sólidas (E.020 Anexo 1)
tp = 0.23 m // Espesor del parapeto (cabeza)
hp = 0.80 m // Altura del parapeto
Pe = gal*tp*hp -> kgf/m // Peso del parapeto por metro de longitud
F_p = FneE030(a5, C1p, Pe, Z, U, S) // F = (Fi/Pi)·C1·Pe ≥ 0.5·Z·U·S·Pe (Art. 57.2 y 58)
w_p = F_p/hp -> kgf/m^2 // Carga uniformemente distribuida por unidad de área (Art. 57.3)
Mp = w_p*hp^2/2 -> kgf*m/m // Momento en la base del parapeto en voladizo, por metro
sigma_t = 6*Mp/tp^2 -> kgf/cm^2 // Esfuerzo de tracción por flexión en la base
ft = 1.5 kgf/cm^2 // Esfuerzo admisible en tracción por flexión de albañilería simple (E.070 Cap. 9)
check 0.8*sigma_t <= ft // Fuerzas sísmicas × 0.8 para verificación por esfuerzos admisibles (Art. 29)
# Tabique interior del tercer piso (C1 = 2.0)
C1t = C1E030(2) // Muros y tabiques dentro de la edificación (Tabla N° 15)
at = (a2 + a3)/2 // Promedio de las aceleraciones de los niveles de apoyo superior e inferior (Art. 57.4)
gtab = 1350 kgf/m^3 // Albañilería de unidades huecas (E.020 Anexo 1)
et = 0.15 m // Espesor del tabique tarrajeado
w_t = max(at*C1t, amin)*gtab*et -> kgf/m^2 // Fuerza sísmica por unidad de área del tabique (Art. 57 y 58)
Fv_t = 2/3*w_t // Fuerza sísmica vertical asociada (Art. 59.1)
# Tanque elevado de agua sobre la azotea (C1 = 3.0)
Pe_tq = 6.0 tonf // Peso del tanque lleno (100 % del contenido)
F_tq = FneE030(a5, C1p, Pe_tq, Z, U, S) // Fuerza horizontal en el centro de masas (Art. 57 y 58)
Fv_tq = 2/3*F_tq // Fuerza sísmica vertical (Art. 59.1)
hcg = 1.2 m // Altura del centro de masas sobre los anclajes
bt = 2.0 m // Separación entre líneas de anclajes
na = 4 // Número de anclajes (2 por línea)
Va = F_tq/na // Cortante por anclaje
Ta = max((F_tq*hcg - (Pe_tq - Fv_tq)*bt/2)/bt, 0 tonf)/(na/2) // Tracción por anclaje por volteo, con la sísmica vertical desfavorable (Art. 28.5)
phiVa = 1.8 tonf // Resistencia de diseño a corte del anclaje (dato del fabricante / ACI 318 Cap. 17)
phiTa = 2.5 tonf // Resistencia de diseño a tracción del anclaje
check (Ta/phiTa)^(5/3) + (Va/phiVa)^(5/3) <= 1 // Interacción tracción–corte del anclaje (ACI 318-19 R17.8)
# Cerco perimétrico (Art. 60)
gce = 1800 kgf/m^3 // Albañilería sólida
ece = 0.13 m // Espesor del muro del cerco
w_c = 0.5*Z*U*S*gce*ece -> kgf/m^2 // F = 0.5·Z·U·S·Pe por unidad de área (Art. 60)`),
  { type: 'table', columnas: 'Nivel = 1:5\n$h_i$ [m] = h_i\n$F_i$ [tonf] = Fi\n$P_i$ [tonf] = P_i\n$a_i/g$ = ai\n$F/P_e$ con C1 3.0 = 3*ai\n$F/P_e$ con C1 2.0 = 2*ai', dec: '3', titulo: 'Coeficientes sísmicos de elementos no estructurales por nivel (mínimo 0.5·Z·U·S = {amin})' },
  calc(`# Separación sísmica entre edificios (Art. 52)
h1 = sum(hei) // Altura del edificio desde el terreno natural
d1 = 8.07 cm // Desplazamiento inelástico máximo de la azotea, en el extremo del edificio (memoria de análisis estático, Art. 50)
h2 = 8.4 m // Altura del edificio vecino existente (3 pisos)
smin = sJuntaE030(Z, S, h2) -> cm // s = 0.02·Z·S·h ≥ 0.03 m evaluado a la altura del edificio vecino (Art. 52.2)
"El edificio vecino existente **no** cuenta con junta sísmica reglamentaria; su desplazamiento se desconoce, por lo que se usa el criterio del Art. 52.4: separación igual a $s/2$ del proyecto más $s/2$ que le corresponde a la estructura vecina.
s_2 = sJuntaE030(Z, S, h2)/2 -> cm // s/2 correspondiente a la estructura vecina (Art. 52.4)
r1 = max(2/3*d1, smin/2) -> cm // Retiro del proyecto respecto del lindero: ≥ 2/3 del desplazamiento máximo (Art. 52.3) y ≥ s/2 (Art. 52.4)
s_req = r1 + s_2 -> cm // Separación total requerida respecto del edificio existente (Art. 52.4)
s = 10 cm // Junta proyectada
check s >= s_req // Junta sísmica proyectada suficiente (Art. 52)`),
  { type: 'junta', h1: 'h1', h2: 'h2', d1: 'd1', d2: 'smin/2', s: 's', titulo: 'Junta sísmica con el edificio colindante (deformadas exageradas)' },
  text(`> **Notas.** (1) Para letreros, antenas y torres sobre el edificio la fuerza se determina con las propiedades dinámicas del conjunto y no menos que con $C_1 = 3.0$ (Art. 61). (2) Los equipos soportados por elementos de gran luz o voladizos requieren análisis dinámico con el espectro vertical (Art. 59.2). (3) Los profesionales de cada especialidad son responsables de la resistencia y rigidez sísmica de los elementos no estructurales (Art. 56).`),
  summary(),
];

const AISLAMIENTO = [
  text(`# Generalidades
**Proyecto:** hospital (categoría A1) de cuatro pisos de concreto armado sobre un sistema de aislamiento en la base de 30 aisladores elastoméricos con núcleo de plomo (LRB), planta de 30 m × 24 m, ubicado en la zona 4 sobre suelo S1. La Tabla N° 7 de la E.030 exige aislamiento sísmico a las nuevas edificaciones A1 en las zonas 4 y 3, con $U = 1$.

**Objetivo:** diseño **preliminar** del sistema de aislamiento por el **procedimiento de fuerzas estáticas equivalentes** de la NTE E.031 *Aislamiento Sísmico* (DS N° 030-2019-VIVIENDA): espectro del sismo máximo considerado (Art. 14), propiedades límite inferior y superior (Art. 13), periodo y amortiguamiento efectivos, desplazamientos $D_M$ y $D_{TM}$ (Art. 20), fuerzas $V_b$, $V_{st}$ y $V_s$ (Art. 21), distribución vertical (Art. 22) y derivas (Art. 23). El diseño final requiere análisis dinámico y ensayos de prototipos (Cap. VI y VIII).

**Modelo del aislador:** bilineal con resistencia característica $Q_d$, rigidez post-fluencia $k_d$ y desplazamiento de fluencia $D_y$; $k_{eff} = Q_d/D + k_d$ y $\\beta_{eff} = 4Q_d(D - D_y)/(2\\pi k_{eff} D^2)$ (ecuaciones 3 y 4 con la energía del lazo bilineal).`),
  calc(`# Peligro sísmico y espectro del sismo máximo considerado
zona = 4 // Zona sísmica [4 : Zona 4|3 : Zona 3|2 : Zona 2|1 : Zona 1]
Z = ZE030(zona) // Factor de zona (E.030 Tabla N° 1)
Vs30 = 600 m/s // Velocidad de ondas de corte: perfil S1 (E.030 Tabla N° 3)
S = SE030(zona, Vs30) // Factor de suelo (E.030 Tabla N° 4)
Tp = TpE030(Vs30) // Periodo TP (E.030 Tabla N° 5)
Tl = TlE030(Vs30) // Periodo TL (E.030 Tabla N° 5)
Ts = 0.22 s // Periodo predominante del terreno por razón espectral H/V (E.031 Art. 14.2)
Tsmax = si(Vs30 >= 800 m/s, 0.15 s, si(Vs30 >= 550 m/s, 0.30 s, si(Vs30 >= 350 m/s, 0.40 s, 0.60 s))) // Ts máximo del perfil: S0 0.15, S1 0.30, S2 0.40, S3 0.60 s (E.031 Tabla N° 4)
check Ts < Tsmax // Ts compatible con el perfil de suelo adoptado (E.031 Art. 14.2; si Ts > 0.6 s, estudio de sitio, Art. 14.3)
check Ts < 0.65*Tp or zona < 4 // Categoría A en zona 4: Ts < 0.65 TP de la Tabla N° 5 (E.030-2026 Art. 14.8)
U = 1.0 // Para estructuras aisladas U = 1 en todos los casos (E.031 Art. 14.4)
SaM(T) = SaME031(T, Z, S, Tp, Tl) // SaM = 1.5·Z·U·C·S (en g), C de la E.030 Tabla N° 6 (E.031 ec. 5)
# Estructura sobre la interfaz de aislamiento
b_p = 24 m // Dimensión menor en planta
d_p = 30 m // Dimensión mayor en planta
hei = [4.0, 3.6, 3.6, 3.6] m // Alturas de entrepiso sobre el nivel de base
h_i = cumsum(hei) // Altura de cada nivel sobre el nivel de base
hn = sum(hei) // Altura de la superestructura
npis = 4 // Número de pisos sobre la interfaz
Pb = 900 tonf // Peso del nivel de base (losa y vigas sobre los aisladores)
P_i = [850, 850, 850, 650] tonf // Peso sísmico de los niveles 1 → 4 (E.030 Art. 31: CM + 50 % CV)
Ps = sum(P_i) // Peso sísmico efectivo sobre la interfaz sin el nivel de base
P = Pb + Ps // Peso sísmico total sobre la interfaz de aislamiento
sistema = 7 // Sistema de la superestructura (E.030 Tabla N° 10) [7 : C°A° pórticos|8 : C°A° dual|9 : C°A° muros estructurales|4 : Acero SCBF|6 : Acero EBF]
R0 = R0E030(sistema) // Coeficiente básico de reducción de la estructura con base fija
Tf = hn/CTE030(sistema)*1 s/m -> s // Periodo de la superestructura con base fija (E.030 Art. 36.1)
# Sistema de aislamiento (LRB)
N = 30 // Número de aisladores
Qd = 7.0 tonf // Resistencia característica nominal de un aislador
kd = 40 tonf/m // Rigidez post-fluencia nominal de un aislador
Dy = 2.0 cm // Desplazamiento de fluencia
"Factores de modificación de propiedades para aisladores LRB clase I (E.031 Tabla N° 2): $\\lambda_{max}$ = 1.5 para $Q_d$ y 1.3 para $k_d$; $\\lambda_{min}$ = 0.8.`),
  { type: 'lrb', N: 'N', Qd: 'Qd', kd: 'kd', Dy: 'Dy', W: 'P', SaM: 'SaM(T)', lQmax: '1.5', lQmin: '0.8', lkmax: '1.3', lkmin: '0.8', titulo: 'Lazos histeréticos de un aislador (límites inferior y superior) y espectro de desplazamientos del SMC' },
  calc(`# Verificación de la iteración (límite inferior, gobierna DM)
k_eff = Qd_inf/D_M_inf + kd_inf // Rigidez efectiva del sistema (E.031 ec. 3)
beta_eff = betaLRB(Qd_inf, kd_inf, D_M_inf, Dy) // Amortiguamiento efectivo (E.031 ec. 4)
T_Mc = TME031(P, k_eff) // Periodo efectivo TM = 2π√(P/(kM·g)) (E.031 ec. 7)
B_Mc = BME031(beta_eff) // Factor de amortiguamiento (E.031 Tabla N° 5)
D_Mc = DME031(SaM(T_Mc), T_Mc, B_Mc) // DM = SaM·TM²/(4π²BM) (E.031 ec. 6)
check abs(D_Mc - D_M_inf) <= 0.005*D_M_inf // Convergencia de la iteración de DM
# Requisitos para el procedimiento estático (E.031 Art. 17)
check zona <= 2 or (zona == 3 and Vs30 >= 350 m/s) or (zona == 4 and Vs30 >= 550 m/s) // Zona 1–2, zona 3 en S1/S2 o zona 4 en S1 (17.1)
check T_M_inf <= 5 s // Periodo efectivo TM ≤ 5.0 s (17.2)
check npis <= 4 // No más de 4 pisos sobre la interfaz (17.3)
check hn <= 20 m // Altura no mayor que 20 m sobre el nivel de base (17.3)
check max(beta_M_inf, beta_M_sup) <= 0.30 // Amortiguamiento efectivo βM ≤ 30 % (17.4)
check T_M_sup > 3*Tf // TM mayor que tres veces el periodo de base fija (17.5)
k20 = Qd_sup/(0.2*D_M_sup) + kd_sup // Rigidez efectiva al 20 % del desplazamiento máximo
check kM_sup >= k20/3 // Rigidez efectiva en DM mayor que 1/3 de la rigidez al 20 % de DM, límite superior (17.7 a)
k20i = Qd_inf/(0.2*D_M_inf) + kd_inf // Rigidez efectiva al 20 % de DM, límite inferior
check kM_inf >= k20i/3 // Criterio 17.7 a con las propiedades del límite inferior (Art. 17, ambos límites)
# Desplazamiento total (E.031 Art. 20.3)
D_M = max(D_M_inf, D_M_sup) // Desplazamiento traslacional de diseño (límite inferior)
y = d_p/2 // Distancia del centro de rigidez al aislador de esquina, perpendicular al sismo
e = 0.50 m + 0.05*d_p // Excentricidad real + accidental de 5 % de la mayor dimensión
P_T = 1.0 // Razón de periodos traslacional/rotacional (ec. 9, no menor que 1)
D_TM = DTME031(D_M, y, e, b_p, d_p, P_T) // DTM = DM[1 + (y/PT²)·12e/(b² + d²)] ≥ 1.15·DM (E.031 ec. 8)
Dcap = 55 cm // Desplazamiento de capacidad del aislador (ensayos de prototipos, Art. 39)
check D_TM <= Dcap // Capacidad de desplazamiento del aislador ≥ DTM (Art. 17.7 c y 20.3)
# Fuerzas laterales mínimas (E.031 Art. 21)
Vb = max(Vb_inf, Vb_sup) // Fuerza en el sistema de aislamiento y la subestructura Vb = kM·DM (ec. 10), mayor de ambos límites (Art. 19.3)
Vst_inf = VstE031(Vb_inf, Ps, P, beta_M_inf) // Cortante no reducido con el límite inferior (ec. 12)
Vst_sup = VstE031(Vb_sup, Ps, P, beta_M_sup) // Cortante no reducido con el límite superior (ec. 12)
Vst = max(Vst_inf, Vst_sup) // Cortante no reducido de diseño sobre el nivel de base (Art. 19.3: el más desfavorable)
beta_s = si(Vst_sup >= Vst_inf, beta_M_sup, beta_M_inf) // Amortiguamiento del límite que gobierna Vst
Ra = RaE031(R0) // Ra = 3/8·R0 con 1 ≤ Ra ≤ 2 (Art. 21.2)
Vs1 = Vst/Ra // Cortante de diseño sobre la interfaz (ec. 11)
## Límites de Vs (Art. 21.3)
Ca = CE030(T_M_sup, Tp, Tl) // Factor C de base fija con TM del límite superior
Va = VE030(Z, 1, Ca, S, R0, Ps) // (a) Cortante E.030 de base fija con Ps, TM y U = 1 (C/R ≥ 0.11)
Fact = max(Qd_sup + kd_sup*Dy, 1.5*N*(Qd + kd*Dy)) -> tonf // Fuerza de activación (fluencia) del sistema: límite superior o 1.5 × propiedades nominales (Art. 21.3 c)
Vc = VstE031(Fact, Ps, P, beta_s) // (c) Vst con Vb igual a la fuerza de activación
Vs = max(Vs1, Va, Vc) // Cortante de diseño de la superestructura
# Distribución vertical de la fuerza (E.031 Art. 22)
F1 = (Vb - Vst)/Ra // Fuerza en el nivel de base (ec. 13)
kv = kE031(max(beta_M_inf, beta_M_sup), Tf) // Exponente k = 14·βM·Tf (ec. 15), con el mayor βM (distribución más cargada hacia arriba)
@modo corto
Fi = P_i .* h_i.^kv/sum(P_i .* h_i.^kv)*Vs // Fuerzas en los niveles sobre la interfaz (ec. 14)
Vi = Vs - cumsum(Fi) + Fi // Cortante de entrepiso
@modo completo
# Derivas de la superestructura (E.031 Art. 23)
Ki = [80000, 70000, 60000, 45000] tonf/m // Rigidez lateral de entrepiso de la superestructura (del modelo)
@modo corto
deriva = Ra*(Vi ./ Ki) ./ hei // Deriva = Ra × deriva elástica bajo Vs (Art. 23.2)
@modo completo
check max(deriva) <= 0.0035 // Deriva máxima sobre el nivel de base (Art. 23.1)`),
  { type: 'storyforces', P: 'P_i', hi: 'h_i', V: 'Vs', k: 'kv', titulo: 'Distribución de la fuerza Vs sobre la interfaz de aislamiento (E.031 Art. 22)' },
  { type: 'table', columnas: 'Nivel = 1:4\n$h_i$ [m] = h_i\n$P_i$ [tonf] = P_i\n$F_i$ [tonf] = Fi\n$V_i$ [tonf] = Vi\n$K_i$ [tonf/m] = Ki\nDeriva $R_a\\,\\Delta_i/h_i$ = deriva', dec: '4', titulo: 'Fuerzas y derivas de la superestructura aislada' },
  text(`> **Alcance.** Este cálculo es de prediseño. La E.031 exige: análisis con propiedades límite inferior y superior (Art. 13 y 19.3), análisis dinámico cuando no se cumplan las condiciones del Art. 17 (Art. 16 y 18), revisión del diseño por un especialista independiente (Cap. VII), ensayos de prototipos y de obra con sus criterios de aceptación (Cap. VIII) y la verificación de la fuerza de restitución lateral (Art. 9.4).`),
  summary(),
];

export default [
  {
    id: 'pe-e030-estatico', pais: 'PE', cat: 'Sismo — Perú', icon: 'quake',
    name: 'Análisis sísmico estático E.030-2026 — edificio de 5 pisos',
    normas: 'RNE — NTE E.030 Diseño Sismorresistente (mod. RM 183-2026-VIVIENDA) · NTE E.020 Cargas',
    desc: 'Metrado de pesos por nivel, periodo hn/CT y Rayleigh, C/R ≥ 0.11, cortante basal, distribución con k, torsión accidental 5 %, derivas por piso e irregularidades (Ia, Ip, Tabla 13).',
    titulo: 'Análisis sísmico estático — NTE E.030 (2026)',
    blocks: ESTATICO,
  },
  {
    id: 'pe-e030-dinamico', pais: 'PE', cat: 'Sismo — Perú', icon: 'spectrum',
    name: 'Análisis dinámico modal espectral E.030-2026',
    normas: 'RNE — NTE E.030 Diseño Sismorresistente (mod. RM 183-2026-VIVIENDA), Subcapítulo 2 del Cap. IV',
    desc: 'Edificio de cortante de 5 pisos: autovalores (Jacobi), periodos, formas de modo, masa participativa ≥ 90 %, espectro ZUCS/R, CQC, escalamiento al 80/90 % del cortante estático y derivas.',
    titulo: 'Análisis dinámico modal espectral — NTE E.030 (2026)',
    blocks: DINAMICO,
  },
  {
    id: 'pe-e030-irregularidades', pais: 'PE', cat: 'Sismo — Perú', icon: 'table',
    name: 'Irregularidades estructurales E.030 (Tablas 11, 12 y 13)',
    normas: 'RNE — NTE E.030 Diseño Sismorresistente (mod. RM 183-2026-VIVIENDA), Art. 23 a 26 y 33',
    desc: 'Piso blando, piso débil, masa, geometría vertical, discontinuidad, torsión (con criterio del 50 %), esquinas entrantes, diafragma y sistemas no paralelos; Ia, Ip, R y restricciones de la Tabla 13.',
    titulo: 'Evaluación de irregularidades estructurales — NTE E.030',
    blocks: IRREG,
  },
  {
    id: 'pe-e020-metrado', pais: 'PE', cat: 'Cargas y combinaciones', icon: 'slab',
    name: 'Metrado de cargas E.020 — edificio de 4 pisos',
    normas: 'RNE — NTE E.020 Cargas (2006) · NTE E.030 Art. 31 · NTE E.060 Art. 9.2',
    desc: 'Losas aligeradas o macizas (Anexo 1), acabados, tabiquería real, vigas, columnas, parapeto, carga viva por uso (Tabla 1), techo, reducción de carga viva (Art. 10), peso sísmico y carga en columna.',
    titulo: 'Metrado de cargas — NTE E.020',
    blocks: METRADO,
  },
  {
    id: 'pe-e020-viento', pais: 'PE', cat: 'Cargas y combinaciones', icon: 'plot',
    name: 'Cargas de viento E.020 — nave industrial a dos aguas',
    normas: 'RNE — NTE E.020 Cargas (2006), Art. 11, 12 y 24',
    desc: 'Velocidad de diseño Vh = V(h/10)^0.22, presiones Ph = 0.005·C·Vh² en barlovento, sotavento, techo y muros laterales, presión interior, cargas en el pórtico, deriva por viento y nieve.',
    titulo: 'Cargas de viento sobre nave industrial — NTE E.020',
    blocks: VIENTO,
  },
  {
    id: 'pe-e030-noestructurales', pais: 'PE', cat: 'Sismo — Perú', icon: 'wall',
    name: 'Elementos no estructurales y junta sísmica E.030',
    normas: 'RNE — NTE E.030 (mod. RM 183-2026-VIVIENDA), Cap. VI Art. 55–61 y Art. 52 · NTE E.070',
    desc: 'Fuerzas F = (Fi/Pi)·C1·Pe ≥ 0.5·ZUS·Pe en parapeto, tabique y tanque elevado (anclajes), cerco, fuerza vertical 2/3, y separación sísmica s = 0.02·Z·S·h ≥ 3 cm.',
    titulo: 'Elementos no estructurales y separación sísmica — NTE E.030',
    blocks: NOESTRUCT,
  },
  {
    id: 'pe-e031-aislamiento', pais: 'PE', cat: 'Sismo — Perú', icon: 'spectrum',
    name: 'Aislamiento sísmico preliminar E.031 (LRB)',
    normas: 'RNE — NTE E.031 Aislamiento Sísmico (DS 030-2019-VIVIENDA) · NTE E.030-2026',
    desc: 'Hospital A1 aislado con LRB: espectro SMC, límites inferior/superior (λ), iteración keff–βM–TM–BM–DM, DTM, Vb, Vst, Vs con límites, distribución con k = 14βTf y deriva ≤ 0.0035.',
    titulo: 'Sistema de aislamiento sísmico — prediseño NTE E.031',
    blocks: AISLAMIENTO,
  },
];
