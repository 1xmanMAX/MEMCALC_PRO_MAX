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
U = 1.0 // Factor de uso (Art. 19, Tabla N° 7) [1.5 : A2 Esencial|1.3 : B Importante|1.0 : C Común]
sistema = 8 // Sistema estructural en la dirección de análisis (Tabla N° 10) [7 : C°A° pórticos|8 : C°A° dual|9 : C°A° muros estructurales|10 : C°A° muros de ductilidad limitada|11 : Albañilería armada o confinada|1 : Acero SMF|4 : Acero SCBF|6 : Acero EBF]
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
check C/R >= 0.11 // Relación mínima C/R (Art. 34.2)
k = kE030(T) // Exponente de distribución en altura (Art. 35.2)
# Fuerza cortante en la base
check hn <= 30 m // Aplicabilidad del método estático: estructura regular con hn ≤ 30 m (Art. 33.2)
V = Z*U*C*S/R*P -> tonf // Fuerza cortante en la base (Art. 34.1)
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
"Rigidez lateral de cada entrepiso $K_i = V_i/\\Delta_i$ obtenida del modelo (diafragma rígido, secciones brutas, traslación pura). Los desplazamientos inelásticos se obtienen multiplicando por $0.75R$ (regular) o $0.85R$ (irregular) los del análisis lineal con fuerzas reducidas, sin considerar el mínimo $C/R$ (Art. 50).
Ki = [72000, 61000, 56000, 50000, 41000] tonf/m // Rigidez lateral de entrepiso en X (del modelo)
irr = 0 // Condición de regularidad para el factor de desplazamientos [0 : Regular (0.75R)|1 : Irregular (0.85R)]
fd = fdespE030(irr)*R // Factor de amplificación de desplazamientos (Art. 50.1 y 50.2)
Delta_e = Vi ./ Ki -> cm // Desplazamiento relativo elástico de entrepiso
Delta_i = fd*Delta_e // Desplazamiento relativo inelástico
deriva = Delta_i ./ hei // Distorsión de entrepiso Δi/hei
mat = 1 // Material predominante (Tabla N° 14) [1 : Concreto armado 0.007|2 : Acero 0.010|3 : Albañilería 0.005|4 : Madera 0.010|5 : Muros de ductilidad limitada 0.004]
dlim = dlimE030(mat) // Distorsión máxima permitida (Art. 51, Tabla N° 14)
check max(deriva) <= dlim // Distorsión máxima de entrepiso (Art. 51)
u_i = cumsum(Delta_i) // Desplazamiento lateral inelástico de cada nivel
## Verificación del periodo con la fórmula de Rayleigh
di = cumsum(Delta_e) // Desplazamiento elástico de cada nivel bajo Fi (traslación pura)
g0 = 9.81 m/s^2 // Aceleración de la gravedad
TR = 2*pi*sqrt(sum(P_i .* di.^2)/(g0*sum(Fi .* di))) -> s // Periodo por Rayleigh (Art. 36.2)
TR85 = 0.85*TR // Reducción por rigidez de elementos no estructurales no aislados (Art. 36.3)
CR_ = CE030(TR85, Tp, Tl) // Factor C con el periodo de Rayleigh
check CR_ <= C // El periodo aproximado hn/CT no subestima la demanda (C de Rayleigh ≤ C adoptado)
# Fuerzas sísmicas verticales
Fv = 2/3*Z*U*S // Fracción del peso para la fuerza sísmica vertical (Art. 38.1), en voladizos, elementos de gran luz y pre/postensados (Art. 28.4)`),
  { type: 'table', columnas: 'Nivel = 1:5\n$h_i$ [m] = h_i\n$P_i$ [tonf] = P_i\n$\\alpha_i$ = alpha_i\n$F_i$ [tonf] = Fi\n$V_i$ [tonf] = Vi\n$K_i$ [tonf/m] = Ki\n$\\Delta_i$ inelástico [cm] = Delta_i\n$\\Delta_i/h_{ei}$ = deriva', dec: '3', titulo: 'Resumen del análisis estático en la dirección X' },
  calc(`# Verificación de la regularidad estructural
Dprom = Delta_e // Desplazamiento relativo promedio de los extremos (del modelo con excentricidad accidental)
rt = [1.12, 1.14, 1.15, 1.16, 1.18] // Relación Δmax/Δprom por entrepiso (del modelo 3D)
Dmax = rt .* Dprom // Desplazamiento relativo máximo en el extremo del edificio`),
  { type: 'irregE030', K: 'Ki', P: 'P_i', Dmax: 'Dmax', Dprom: 'Dprom', deriva: 'deriva', dlim: 'dlim', disc: '0', esq: false, diaf: false, nopar: false, cat: 'C', zona: '4' },
  calc(`check Ia <= Ia_ev // El factor Ia supuesto no excede el evaluado (Art. 24.1)
check Ip <= Ip_ev // El factor Ip supuesto no excede el evaluado (Art. 24.2)`),
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
check C/R >= 0.11 // C/R mínimo del análisis estático de referencia (Art. 34.2)
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
max(deriva_din) // Distorsión inelástica máxima (verificada en el bloque modal, Art. 51)
umax = max(ui_din) // Desplazamiento inelástico máximo en la azotea (para la junta sísmica, Art. 52)`),
  { type: 'table', columnas: 'Nivel = 1:5\n$h_i$ [m] = h_i\n$F_i$ diseño [tonf] = Fi_dis\n$V_i$ dinámico [tonf] = Vi_din\n$V_i$ diseño [tonf] = Vi_dis\n$u_i$ inelástico [cm] = ui_din\n$\\Delta_i/h_{ei}$ = deriva_din', dec: '3', titulo: 'Resultados del análisis dinámico por nivel' },
  { type: 'spectrum', Z: 'Z', U: 'U', S: 'S', Tp: 'Tp', Tl: 'Tl', R: 'R', T: 'T1', corto: true, titulo: 'Espectro de diseño y periodo fundamental del modelo dinámico' },
  text(`> **Notas.** (1) Para estructuras con diafragma rígido se usa en el modelo 3D una excentricidad accidental de 0.05 veces la dimensión perpendicular, con el signo más desfavorable (Art. 45). (2) La respuesta por sismo simultáneo se obtiene como la raíz cuadrada de la suma de los cuadrados de los efectos de 100 % en una dirección y 30 % en la perpendicular (Art. 43). (3) Los resultados de fuerzas se escalan con $f_{esc}$; los desplazamientos no (Art. 44.2).`),
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
];
