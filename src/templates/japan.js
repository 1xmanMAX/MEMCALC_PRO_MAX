// =====================================================================
//  Plantillas — módulo «japan»
//  Building Standard Law (BSL), AIJ y JRA. Unidades SI (kN, N/mm², m).
// =====================================================================
import { calc, text, summary } from './_h.js';

const ZONA = `zona = 1 // Zona sísmica (Notif. 1793 Art. 1) [1 : Z = 1.0 (Tokio, Osaka, Nagoya, Sendai)|2 : Z = 0.9 (Sapporo, Hiroshima, Kumamoto)|3 : Z = 0.8 (Fukuoka, Yamaguchi, Saga)|4 : Z = 0.7 (Okinawa)]
suelo = 2 // Tipo de suelo (Notif. 1793 Art. 2) [1 : Tipo 1 — roca o grava dura|2 : Tipo 2 — intermedio|3 : Tipo 3 — aluvial blando]`;

export default [
  // ------------------------------------------------------------------
  //  1) Diseño sísmico BSL — Rutas 1 y 2 (esfuerzos admisibles)
  // ------------------------------------------------------------------
  {
    id: 'jp-bsl-ruta12', pais: 'JP', cat: 'Sismo — Japón', icon: 'quake', settings: { sys: 'si' },
    name: 'Diseño sísmico BSL — Rutas 1 y 2 (Ai, derivas, Rs, Re)',
    normas: 'Building Standard Law · Enforcement Order Art. 82, 82-2, 82-6, 88 · Notif. MOC 1793 (1980) · Notif. MOC 1791 (1980)',
    desc: 'Primera fase (Co = 0.2): Ci = Z·Rt·Ai·Co por piso, deriva ≤ 1/200, rigidez relativa Rs ≥ 0.6, excentricidad Re ≤ 0.15 y cantidad de muros y columnas de C°A° (Ruta 2-1).',
    titulo: 'Diseño sísmico de edificio de concreto armado de 5 pisos — BSL Japón, Rutas 1 y 2',
    blocks: [
      text(`# Generalidades
La **Building Standard Law** (建築基準法, BSL) de Japón y su **Enforcement Order** (施行令) establecen el diseño sísmico en dos fases:

- **Primera fase** (sismo moderado, $C_o = 0.2$, Order Art. 88): se calculan los esfuerzos por el **método de esfuerzos admisibles** (許容応力度計算, Order Art. 82) y se limita la deriva de entrepiso a **1/200** (Art. 82-2).
- **Segunda fase** (sismo severo, $C_o = 1.0$): según la ruta de cálculo, se verifica la regularidad (Ruta 2: $R_s \\ge 0.6$, $R_e \\le 0.15$, Art. 82-6) o la resistencia lateral última $Q_u \\ge Q_{un}$ (Ruta 3, Art. 82-3).

Esta memoria corresponde a un edificio de oficinas de **5 pisos de concreto armado** (pórticos con muros de corte) de altura menor a 31 m, verificado por la **Ruta 2-1** (Notif. 1791 Art. 3): cantidad mínima de muros y columnas, deriva, rigidez relativa y excentricidad. El coeficiente de corte del entrepiso $i$ es
$$C_i = Z\\,R_t\\,A_i\\,C_o, \\qquad Q_i = C_i \\sum_{j \\ge i} w_j$$
con $A_i = 1 + \\left(\\dfrac{1}{\\sqrt{\\alpha_i}} - \\alpha_i\\right)\\dfrac{2T}{1+3T}$ (Notif. 1793 Art. 3).

**Unidades:** kN, m, N/mm². **Normas:** BSL, Enforcement Order, Notificaciones del MOC/MLIT 1791, 1792 y 1793.`),
      calc(`# Datos del edificio
${ZONA}
alpha_h = 0 // Fracción de la altura con estructura de acero o madera (Notif. 1793 Art. 2)
Fc = 24 N/mm^2 // Resistencia de diseño del concreto [21 N/mm^2|24 N/mm^2|27 N/mm^2|30 N/mm^2|36 N/mm^2]
wi = [5600, 5300, 5300, 5200, 4300] kN // Peso sísmico por piso, del 1F al 5F (Order Art. 88: G + P sísmica)
hs = [4.0, 3.5, 3.5, 3.5, 3.5] m // Altura de cada entrepiso
## Coeficientes sísmicos (Order Art. 88; Notif. 1793)
Z = ZBSL(zona) // Coeficiente de zona (Notif. 1793 Art. 1)
Tc = TcBSL(suelo) // Periodo característico del suelo (Notif. 1793 Art. 2)
hT = sum(hs) // Altura total del edificio
check hT <= 31 m // Ruta 2: altura ≤ 31 m (Order Art. 81-2; Notif. 593)
T = TBSL(hT, alpha_h) // Periodo fundamental de diseño T = h(0.02 + 0.01α) (Notif. 1793 Art. 2)
Co = 0.2 // Coeficiente de corte estándar, primera fase (Order Art. 88-2)`),
      { type: 'aidist', wi: 'wi', hi: 'hs', T: 'T', Z: 'Z', Tc: 'Tc', Co: 'Co', titulo: 'Distribución Ai, coeficiente de corte Ci y cortante de entrepiso Qi (primera fase, Co = 0.2)' },
      calc(`## Fuerza sísmica de diseño (Order Art. 88-1)
Qb = Qi[1] // Cortante basal de primera fase (del bloque Ai)
CB = Qb/sum(wi) // Coeficiente de corte basal C1 = Z·Rt·Co (A1 = 1)
# Deriva de entrepiso (Order Art. 82-2)
di = [8.6, 8.9, 8.4, 7.3, 5.5] mm // Desplazamiento relativo de entrepiso bajo Qi (análisis elástico)
theta = di ./ hs // Deriva de entrepiso δi/hi
check max(theta) <= 1/200 // Deriva ≤ 1/200 (Order Art. 82-2)
# Rigidez relativa Rs (Order Art. 82-6, inc. 2 (a))
rs = hs ./ di // Inversa de la deriva rs = hi/δi
rsm = mean(rs) // Promedio de rs en todos los pisos
Rs = rs/rsm // Rigidez relativa (剛性率) Rs = rs/r̄s
check min(Rs) >= 0.6 // Rs ≥ 0.6 en todos los pisos (Order Art. 82-6, inc. 2 (a))
# Excentricidad Re del 1F (Order Art. 82-6, inc. 2 (b))
xY = [0, 6, 12, 18, 24] m // Posición x de los ejes resistentes en Y
KY = [0.9, 1.2, 1.2, 1.2, 1.0] kN/mm // Rigidez lateral de cada eje en Y
yX = [0, 7, 14] m // Posición y de los ejes resistentes en X
KX = [1.5, 1.2, 1.4] kN/mm // Rigidez lateral de cada eje en X
gx = 12.0 m // Centro de masas, coordenada x
gy = 7.0 m // Centro de masas, coordenada y
lx = sum(KY .* xY)/sum(KY) // Centro de rigidez, coordenada x
ly = sum(KX .* yX)/sum(KX) // Centro de rigidez, coordenada y
KR = sum(KY .* (xY - lx).^2) + sum(KX .* (yX - ly).^2) // Rigidez torsional respecto al centro de rigidez
rex = sqrt(KR/sum(KX)) // Radio elástico para sismo en X
rey = sqrt(KR/sum(KY)) // Radio elástico para sismo en Y
Rex = abs(gy - ly)/rex // Excentricidad relativa, sismo en X
Rey = abs(gx - lx)/rey // Excentricidad relativa, sismo en Y
check Rex <= 0.15 // Re ≤ 0.15, sismo en X (Order Art. 82-6, inc. 2 (b))
check Rey <= 0.15 // Re ≤ 0.15, sismo en Y (Order Art. 82-6, inc. 2 (b))
# Cantidad de muros y columnas — Ruta 2-1 (Notif. 1791 Art. 3)
alpha_F = min(sqrt(Fc/(18 N/mm^2)), sqrt(2)) // Factor por resistencia del concreto α = √(Fc/18) ≤ √2
Aw = [7.2, 6.6, 6.0, 5.4, 4.2] m^2 // Área horizontal de muros de corte en la dirección analizada
Ac = [6.4, 5.8, 5.8, 5.2, 5.2] m^2 // Área horizontal de columnas
Qr = alpha_F*(2.5 N/mm^2*Aw + 0.7 N/mm^2*Ac) // Resistencia convencional Σ2.5αAw + 0.7αAc
Qreq = 0.75*Z*Ai .* Wi // Demanda 0.75·Z·W·Ai (Ruta 2-1)
check min(Qr ./ Qreq) >= 1 // Σ2.5αAw + 0.7αAc ≥ 0.75·Z·W·Ai en todos los pisos (Notif. 1791 Art. 3)
"Además, en la Ruta 2-1 el cortante de diseño de vigas y columnas se amplifica: $Q_D = Q_L + n\\,Q_E$ con $n \\ge 2$, o $Q_D = Q_L + Q_y$ (Notif. 1791 Art. 3), y los esfuerzos de primera fase deben cumplir los esfuerzos admisibles de corto plazo (Order Art. 82).`),
      { type: 'table', columnas: 'Piso = 1:5\n$h_i$ [m] = hs\n$\\delta_i$ [mm] = di\n$\\delta_i/h_i$ = theta\n$R_s$ = Rs\n$Q_r$ [kN] = Qr\n$0.75ZWA_i$ [kN] = Qreq', dec: '4', titulo: 'Deriva, rigidez relativa y cantidad de muros por entrepiso' },
      { type: 'plot', expr: 'Z*RtBSL(x, 0.4); Z*RtBSL(x, 0.6); Z*RtBSL(x, 0.8)', var: 'x', desde: '0', hasta: '3', puntos: '300', xlabel: 'Periodo T [s]', ylabel: 'Z·Rt', leyenda: true, nombres: 'Suelo tipo 1 (Tc = 0.4 s); Suelo tipo 2 (Tc = 0.6 s); Suelo tipo 3 (Tc = 0.8 s)', titulo: 'Coeficiente espectral Z·Rt (Notif. 1793 Art. 2)' },
      summary(),
    ],
  },
  // ------------------------------------------------------------------
  //  2) Ruta 3 — Capacidad lateral última Qu ≥ Qun
  // ------------------------------------------------------------------
  {
    id: 'jp-bsl-ruta3', pais: 'JP', cat: 'Sismo — Japón', icon: 'quake', settings: { sys: 'si' },
    name: 'Capacidad lateral última BSL — Ruta 3 (Qun = Ds·Fes·Qud)',
    normas: 'Building Standard Law · Enforcement Order Art. 82-3 · Notif. MOC 1792 (1980, mod. 2007) · Notif. MOC 1793',
    desc: 'Segunda fase (Co = 1.0): Qud con distribución Ai, Ds por rango de miembros (FA–FD, WA–WD) y βu, Fes = Fs·Fe por piso, y comparación con la resistencia de un análisis pushover.',
    titulo: 'Verificación de la resistencia lateral última (保有水平耐力) — Ruta 3 BSL',
    blocks: [
      text(`# Generalidades
En la **Ruta 3** (保有水平耐力計算, Order Art. 82-3) se exige que la **resistencia lateral última** $Q_u$ de cada entrepiso, obtenida de un análisis incremental (pushover) hasta formar el mecanismo, sea mayor o igual que la **resistencia lateral requerida**
$$Q_{un} = D_s\\,F_{es}\\,Q_{ud}, \\qquad Q_{ud} = Z\\,R_t\\,A_i\\,C_o \\sum_{j \\ge i} w_j \\;\\; (C_o = 1.0)$$

- $D_s$: **coeficiente de características estructurales** (Notif. 1792 Art. 4), según el rango de ductilidad de vigas y columnas (FA–FD), de los muros (WA–WD) y la fracción $\\beta_u$ del cortante último resistida por los muros.
- $F_{es} = F_s\\,F_e$: **factor de forma** por rigidez relativa $R_s$ y excentricidad $R_e$ (Notif. 1792 Art. 7): $F_s = 2 - R_s/0.6$ si $R_s < 0.6$; $F_e$ crece linealmente de 1.0 ($R_e \\le 0.15$) a 1.5 ($R_e \\ge 0.30$).

Edificio de concreto armado de 5 pisos (pórticos FB con muros WA). Los valores $Q_u$ provienen del análisis pushover del proyecto.`),
      calc(`# Datos
${ZONA}
alpha_h = 0 // Fracción de altura de acero o madera
wi = [5600, 5300, 5300, 5200, 4300] kN // Peso sísmico por piso (1F → 5F)
hs = [4.0, 3.5, 3.5, 3.5, 3.5] m // Altura de entrepiso
Z = ZBSL(zona) // Coeficiente de zona (Notif. 1793 Art. 1)
Tc = TcBSL(suelo) // Periodo del suelo (Notif. 1793 Art. 2)
T = TBSL(sum(hs), alpha_h) // Periodo de diseño (Notif. 1793 Art. 2)
Co = 1.0 // Coeficiente de corte estándar para sismo severo (Order Art. 88-3)`),
      { type: 'aidist', wi: 'wi', hi: 'hs', T: 'T', Z: 'Z', Tc: 'Tc', Co: 'Co', titulo: 'Cortante elástico último Qud = Z·Rt·Ai·Co·ΣW con Co = 1.0' },
      calc(`# Resistencia lateral requerida Qun (Order Art. 82-3)
Qud = Qi // Cortante sísmico último por piso (bloque Ai, Co = 1.0)
## Coeficiente Ds (Notif. 1792 Art. 4)
rF = 2 // Rango del grupo de vigas y columnas [1 : FA|2 : FB|3 : FC|4 : FD]
rW = 1 // Rango del grupo de muros de corte [1 : WA|2 : WB|3 : WC|4 : WD]
bu = [0.55, 0.52, 0.48, 0.40, 0.28] // Fracción βu del cortante último tomada por los muros (pushover)
Ds = DsRC(rF, rW, bu) // Ds por piso (Notif. 1792 Art. 4, tabla)
## Factor de forma Fes (Notif. 1792 Art. 7)
Rs = [0.82, 1.03, 1.00, 1.02, 1.13] // Rigidez relativa por piso (Order Art. 82-6)
Re = [0.06, 0.08, 0.10, 0.17, 0.21] // Excentricidad relativa por piso (Order Art. 82-6)
Fes = FesBSL(Rs, Re) // Fes = Fs·Fe
## Resistencia requerida y resistencia última
Qun = Ds .* Fes .* Qud // Qun = Ds·Fes·Qud (Order Art. 82-3)
Qu = [11300, 10050, 8350, 6450, 3700] kN // Resistencia lateral última por piso (análisis pushover)
check min(Qu ./ Qun) >= 1 // Qu ≥ Qun en todos los pisos (Order Art. 82-3)`),
      { type: 'qunqu', Qu: 'Qu', Qun: 'Qun', titulo: 'Resistencia lateral última Qu vs. requerida Qun por entrepiso' },
      { type: 'table', columnas: 'Piso = 1:5\n$A_i$ = Ai\n$Q_{ud}$ [kN] = Qud\n$\\beta_u$ = bu\n$D_s$ = Ds\n$F_{es}$ = Fes\n$Q_{un}$ [kN] = Qun\n$Q_u$ [kN] = Qu\n$Q_u/Q_{un}$ = QuQun', dec: '3', titulo: 'Resumen de la verificación de capacidad última por piso' },
      text(`> **Notas.** (1) En cada piso, el rango del grupo de miembros se obtiene de las relaciones $h_0/D$, $\\sigma_0/F_c$, $p_t$ y $\\tau_u/F_c$ (C°A°) o de las relaciones ancho/espesor (acero), Notif. 1792 Arts. 3 y 4. (2) Si se usa $F_e$ con interpolación hasta $R_e = 0.30$, se reproduce la tabla 2 del Art. 7 de la Notif. 1792 (función \`FesBSL\`).`),
      summary(),
    ],
  },
  // ------------------------------------------------------------------
  //  3) Viga de concreto armado AIJ
  // ------------------------------------------------------------------
  {
    id: 'jp-aij-viga', pais: 'JP', cat: 'Concreto — normas extranjeras', icon: 'beam', settings: { sys: 'si' },
    name: 'Viga de concreto armado AIJ (esfuerzos admisibles + Arakawa)',
    normas: 'AIJ Standard for Structural Calculation of Reinforced Concrete Structures (2018) · Notif. MLIT 594 · Notif. MOC 1791',
    desc: 'Flexión at = M/(ft·j), cortante admisible de largo y corto plazo con α = 4/(M/(Qd)+1), y resistencia última Mu = 0.9·at·σy·d y Qsu de Arakawa con margen frente al mecanismo.',
    titulo: 'Diseño de viga de concreto armado — AIJ (esfuerzos admisibles y resistencia última)',
    blocks: [
      text(`# Generalidades
El **AIJ Standard for Structural Calculation of Reinforced Concrete Structures** (鉄筋コンクリート構造計算規準) aplica **esfuerzos admisibles** de largo plazo (cargas permanentes $G + P$) y de corto plazo ($G + P + K$, sismo con $C_o = 0.2$):

| Material | Largo plazo | Corto plazo |
|---|---|---|
| Concreto, compresión | $F_c/3$ | $2F_c/3$ |
| Concreto, cortante | $\\min(F_c/30,\\ 0.49 + F_c/100)$ | 1.5 × largo plazo |
| SD345 (≤ D25) | 215 N/mm² | 345 N/mm² |
| Estribos SD295/SD345 | 195 N/mm² | 295 / 345 N/mm² |

Flexión (art. 13): $a_t = M/(f_t\\,j)$ con $j = 7d/8$. Cortante (art. 15): $Q_A = b\\,j\\,[\\alpha f_s + 0.5\\,{}_wf_t\\,(p_w - 0.002)]$, $\\alpha = 4/(M/(Qd) + 1)$, $1 \\le \\alpha \\le 2$.
Para garantizar la falla dúctil se compara la resistencia a cortante de **Arakawa** $Q_{su}$ con el cortante del mecanismo $Q_m = Q_L + 2M_u/l_0$.

Viga de pórtico de 7.0 m (luz libre 6.3 m), sección 400 × 700 mm, Fc = 24 N/mm², SD345.`),
      calc(`# Materiales y sección
Fc = 24 N/mm^2 // Resistencia de diseño del concreto [21 N/mm^2|24 N/mm^2|27 N/mm^2|30 N/mm^2]
SD = 345 // Acero longitudinal [295 : SD295|345 : SD345|390 : SD390]
SD_w = 295 // Acero de estribos [295 : SD295|345 : SD345]
b = 400 mm // Ancho de la viga
D = 700 mm // Peralte total
dt = 65 mm // Distancia del borde al centroide del acero en tracción
nb = 4 // Número de barras en tracción
db = 25 // Diámetro de las barras [19 : D19|22 : D22|25 : D25|29 : D29]
nw = 2 // Ramas de estribo
dw = 10 // Diámetro de estribo [10 : D10|13 : D13]
sw = 150 mm // Espaciamiento de estribos
l0 = 6.3 m // Luz libre de la viga
## Propiedades
d = D - dt // Peralte efectivo
j = 7/8*d // Brazo de palanca (AIJ RC art. 13)
at = nb*AbJIS(db) // Área de acero en tracción
pt = at/(b*d) // Cuantía de tracción
aw = nw*AbJIS(dw) // Área de un juego de estribos
pw = aw/(b*sw) // Cuantía de estribos
check pw >= 0.002 // pw ≥ 0.2 % (AIJ RC art. 15)
# Esfuerzos admisibles (AIJ RC art. 6)
ft_L = ftAIJ(SD, 1, db) // Tracción, largo plazo
ft_S = ftAIJ(SD, 2, db) // Tracción, corto plazo
fs_L = fsaAIJ(Fc, 1) // Cortante del concreto, largo plazo
fs_S = fsaAIJ(Fc, 2) // Cortante del concreto, corto plazo
wft_S = wftAIJ(SD_w, 2) // Tracción en estribos, corto plazo
# Solicitaciones en el extremo de la viga
M_L = 165 kN*m // Momento de largo plazo (G + P)
Q_L = 120 kN // Cortante de largo plazo
M_E = 175 kN*m // Momento sísmico (Co = 0.2)
Q_E = 55 kN // Cortante sísmico
n = 2 // Factor de amplificación del cortante sísmico [1.5 : Ruta 1|2 : Ruta 2-1 / 2-2]
M_S = M_L + M_E // Momento de corto plazo
# Flexión (AIJ RC art. 13)
Ma_L = at*ft_L*j -> kN*m // Momento admisible de largo plazo Ma = at·ft·j
check M_L <= Ma_L // Flexión de largo plazo
Ma_S = at*ft_S*j -> kN*m // Momento admisible de corto plazo
check M_S <= Ma_S // Flexión de corto plazo
# Cortante (AIJ RC art. 15)
alpha_L = alphaAIJ(M_L, Q_L, d, 2) // α = 4/(M/(Qd) + 1), 1 ≤ α ≤ 2
Qa_L = b*j*alpha_L*fs_L -> kN // Cortante admisible de largo plazo
check Q_L <= Qa_L // Cortante de largo plazo
Q_D = Q_L + n*Q_E // Cortante de diseño de corto plazo (Notif. 1791 Art. 3)
alpha_S = alphaAIJ(M_S, Q_D, d, 2) // Factor α para corto plazo
Qa_S = QaAIJ(b, j, alpha_S, fs_S, wft_S, pw) // QA = b·j·(α·fs + 0.5·wft·(pw − 0.002))
check Q_D <= Qa_S // Cortante de corto plazo
# Resistencia última y falla dúctil (Notif. 594; AIJ)
sy = 1.1*SD*1 N/mm^2 // Resistencia de fluencia esperada 1.1·F (Notif. 2464)
Mu = MuAIJ(at, sy, d) // Momento último Mu = 0.9·at·σy·d
Qm = Q_L + 2*Mu/l0 // Cortante en el mecanismo de flexión
MQd = l0/(2*d) // Relación de corte M/(Q·d) (1 ≤ M/Qd ≤ 3)
swy = SD_w*1 N/mm^2 // Fluencia de estribos
Qsu = QsuAIJ(pt, Fc, MQd, pw, swy, 0 N/mm^2, b, j) // Resistencia a cortante de Arakawa (mín.)
check Qsu >= 1.1*Qm // Qsu ≥ 1.1·Qm: falla por flexión antes que por cortante (rango FA, Notif. 1792)`),
      { type: 'secjp', b: 'b', D: 'D', dt: 'dt', tipo: 'viga', sup: '{nb}-D{db}', inf: '3-D{db}', est: '{nw}-D{dw}@150', titulo: 'Sección de la viga en el apoyo (barras corrugadas JIS)' },
      { type: 'plot', expr: 'QsuAIJ(pt, Fc, x, pw, swy, 0 N/mm^2, b, j)/(1 kN); QaAIJ(b, j, min(max(4/(x + 1), 1), 2), fs_S, wft_S, pw)/(1 kN)', var: 'x', desde: '1', hasta: '3', puntos: '100', xlabel: 'M/(Q·d)', ylabel: 'Cortante [kN]', leyenda: true, nombres: 'Qsu de Arakawa (resistencia última); QA admisible de corto plazo', titulo: 'Cortante resistente en función de la relación M/(Qd)' },
      summary(),
    ],
  },
  // ------------------------------------------------------------------
  //  4) Columna de concreto armado AIJ
  // ------------------------------------------------------------------
  {
    id: 'jp-aij-columna', pais: 'JP', cat: 'Concreto — normas extranjeras', icon: 'column', settings: { sys: 'si' },
    name: 'Columna de concreto armado AIJ (flexocompresión y cortante)',
    normas: 'AIJ Standard for Structural Calculation of Reinforced Concrete Structures (2018) · Notif. MLIT 594 · Notif. MOC 1791',
    desc: 'Momento admisible para la carga axial (sección fisurada, n = 15) a largo y corto plazo, cortante admisible, y resistencia última Mu y Qsu (Arakawa) con margen frente al mecanismo.',
    titulo: 'Diseño de columna de concreto armado — AIJ (esfuerzos admisibles y resistencia última)',
    blocks: [
      text(`# Generalidades
La columna se verifica a **flexocompresión** con esfuerzos admisibles (AIJ RC art. 14): para la carga axial $N$ se busca la posición del eje neutro de la sección fisurada (relación de módulos $n$) tal que se alcance primero el esfuerzo admisible del concreto $f_c$ o del acero $f_t$; el momento resultante es el **momento admisible** $M_A$. El **cortante** de corto plazo se verifica con $Q_A = b\\,j\\,[f_s + 0.5\\,{}_wf_t\\,(p_w - 0.002)]$ (art. 15, se adopta $\\alpha = 1$, del lado de la seguridad).

Para la resistencia última se usa (Notif. 594 / guía técnica de la BSL):
$$M_u = 0.8\\,a_t\\,\\sigma_y\\,D + 0.5\\,N\\,D\\left(1 - \\frac{N}{b\\,D\\,F_c}\\right) \\quad (0 \\le N \\le 0.4\\,bDF_c)$$
y la fórmula de **Arakawa** incluyendo el efecto de la compresión $0.1\\,\\sigma_0$.

Columna interior del 1F de 600 × 600 mm, 16-D25 (5 por cara), zunchos 2-D13@100, Fc = 24 N/mm², SD345.`),
      calc(`# Materiales y sección
Fc = 24 N/mm^2 // Resistencia de diseño del concreto [21 N/mm^2|24 N/mm^2|27 N/mm^2|30 N/mm^2]
SD = 345 // Acero longitudinal [295 : SD295|345 : SD345|390 : SD390]
SD_w = 345 // Acero de zunchos [295 : SD295|345 : SD345]
b = 600 mm // Ancho de la columna
D = 600 mm // Peralte en la dirección analizada
dt = 65 mm // Distancia del borde al centroide de las barras de la cara
nc = 5 // Barras por cara (armadura simétrica)
db = 25 // Diámetro de barras [22 : D22|25 : D25|29 : D29]
nw = 2 // Ramas de zuncho
dw = 13 // Diámetro de zuncho [10 : D10|13 : D13]
sw = 100 mm // Espaciamiento de zunchos
h0 = 3.2 m // Altura libre de la columna
## Propiedades
d = D - dt // Peralte efectivo
j = 7/8*d // Brazo de palanca
at = nc*AbJIS(db) // Acero en la cara traccionada
pt = at/(b*d) // Cuantía de tracción
pg = (4*nc - 4)*AbJIS(db)/(b*D) // Cuantía total
check pg >= 0.008 // Cuantía total ≥ 0.8 % (AIJ RC art. 14)
aw = nw*AbJIS(dw) // Área de un juego de zunchos
pw = aw/(b*sw) // Cuantía de zunchos
check pw >= 0.002 // pw ≥ 0.2 % (AIJ RC art. 15)
n = nAIJ(Fc) // Relación de módulos de Young (AIJ RC art. 5)
# Esfuerzos admisibles (AIJ RC art. 6)
fca_L = fcaAIJ(Fc, 1) // Compresión, largo plazo Fc/3
fca_S = fcaAIJ(Fc, 2) // Compresión, corto plazo 2Fc/3
ft_L = ftAIJ(SD, 1, db) // Acero, largo plazo
ft_S = ftAIJ(SD, 2, db) // Acero, corto plazo
fs_L = fsaAIJ(Fc, 1) // Cortante concreto, largo plazo
fs_S = fsaAIJ(Fc, 2) // Cortante concreto, corto plazo
wft_S = wftAIJ(SD_w, 2) // Zunchos, corto plazo
# Solicitaciones
N_L = 1650 kN // Carga axial de largo plazo
M_L = 45 kN*m // Momento de largo plazo
Q_L = 25 kN // Cortante de largo plazo
N_E = 380 kN // Carga axial sísmica (variación)
M_E = 330 kN*m // Momento sísmico (Co = 0.2)
Q_E = 160 kN // Cortante sísmico
nQ = 2 // Amplificación del cortante sísmico (Notif. 1791 Art. 3) [1.5 : Ruta 1|2 : Ruta 2-1 / 2-2]
check N_L/(b*D*Fc) <= 1/3 // Compresión de largo plazo N/(bDFc) ≤ 1/3 (AIJ RC art. 14, comentario)
# Flexocompresión (AIJ RC art. 14)
Ma_L = MaColAIJ(N_L, b, D, at, dt, fca_L, ft_L, n) // Momento admisible de largo plazo para N_L
check M_L <= Ma_L // Flexocompresión de largo plazo (AIJ RC art. 14)
N1 = N_L + N_E // Carga axial de corto plazo, máxima
N2 = N_L - N_E // Carga axial de corto plazo, mínima
M_S = M_L + M_E // Momento de corto plazo
Ma_S1 = MaColAIJ(N1, b, D, at, dt, fca_S, ft_S, n) // Momento admisible para N1
Ma_S2 = MaColAIJ(N2, b, D, at, dt, fca_S, ft_S, n) // Momento admisible para N2
check M_S <= Ma_S1 // Flexocompresión de corto plazo con N máx. (AIJ RC art. 14)
check M_S <= Ma_S2 // Flexocompresión de corto plazo con N mín. (AIJ RC art. 14)
# Cortante (AIJ RC art. 15)
Qa_L = b*j*fs_L -> kN // Cortante admisible de largo plazo (α = 1)
check Q_L <= Qa_L // Cortante de largo plazo (AIJ RC art. 15)
Q_D = Q_L + nQ*Q_E // Cortante de diseño de corto plazo
Qa_S = QaAIJ(b, j, 1, fs_S, wft_S, pw) // QA = b·j·(fs + 0.5·wft·(pw − 0.002))
check Q_D <= Qa_S // Cortante de corto plazo (AIJ RC art. 15)
# Resistencia última y falla dúctil
sy = 1.1*SD*1 N/mm^2 // Fluencia esperada 1.1·F
check N1 <= 0.4*b*D*Fc // Rango de validez de la fórmula de Mu (N ≤ 0.4bDFc)
Mu = MucAIJ(at, sy, D, N1, b, Fc) // Momento último con N máx.
Qm = 2*Mu/h0 // Cortante en el mecanismo (rótulas en ambos extremos)
s0 = N1/(b*D) -> N/mm^2 // Esfuerzo axial medio σ0
MQd = h0/(2*d) // Relación de corte M/(Qd)
Qsu = QsuAIJ(pt, Fc, MQd, pw, SD_w*1 N/mm^2, s0, b, j) // Arakawa con 0.1·σ0
check Qsu >= 1.1*Qm // Qsu ≥ 1.1·Qm: falla por flexión (Notif. 1792)`),
      { type: 'secjp', b: 'b', D: 'D', dt: 'dt', tipo: 'columna', sup: '{nc}-D{db}', est: '{nw}-D{dw}@100', titulo: 'Sección de la columna (armadura simétrica, barras JIS)' },
      { type: 'plot', expr: 'MaColAIJ(x kN, b, D, at, dt, fca_L, ft_L, n)/(1 kN*m); MaColAIJ(x kN, b, D, at, dt, fca_S, ft_S, n)/(1 kN*m)', var: 'x', desde: '-800', hasta: '6000', puntos: '120', xlabel: 'Carga axial N [kN] (compresión +)', ylabel: 'Momento admisible MA [kN·m]', leyenda: true, nombres: 'Largo plazo (Fc/3, ft = 215); Corto plazo (2Fc/3, ft = F)', titulo: 'Diagrama de momento admisible – carga axial (AIJ RC art. 14). Demandas (N; M) en kN y kN·m: largo plazo (1650; 45), corto plazo (2030; 375) y (1270; 375)' },
      summary(),
    ],
  },
  // ------------------------------------------------------------------
  //  5) Viga de acero AIJ (perfil H JIS)
  // ------------------------------------------------------------------
  {
    id: 'jp-aij-acero', pais: 'JP', cat: 'Acero estructural', icon: 'steel', settings: { sys: 'si' },
    name: 'Viga de acero AIJ — perfil H JIS (esfuerzos admisibles)',
    normas: 'AIJ Design Standard for Steel Structures · Notif. MLIT 1024 (2001) · Notif. MOC 2464 (2000) · Notif. MOC 1792 (relaciones ancho-espesor) · Notif. MOC 1459',
    desc: 'Flexión con pandeo lateral fb = máx{(1 − 0.4(lb/i)²/(CΛ²))ft ; 89000/(lb·h/Af)}, cortante, rango FA por relaciones ancho-espesor y deflexión.',
    titulo: 'Diseño de viga de acero con perfil H JIS — esfuerzos admisibles AIJ',
    blocks: [
      text(`# Generalidades
El **AIJ Design Standard for Steel Structures** (鋼構造設計規準) y la Notif. MLIT 1024 definen los esfuerzos admisibles de largo plazo a partir del valor de diseño $F$ (Notif. 2464; SN400B: $F = 235$ N/mm²):

- Tracción $f_t = F/1.5$; cortante $f_s = F/(1.5\\sqrt{3})$.
- Flexión con **pandeo lateral-torsional**: $f_b = \\max\\left\\{\\left[1 - 0.4\\dfrac{(l_b/i)^2}{C\\,\\Lambda^2}\\right] f_t\\ ;\\ \\dfrac{89\\,000}{l_b\\,h/A_f}\\right\\} \\le f_t$, con $\\Lambda = \\sqrt{\\pi^2 E/(0.6F)}$ e $i$ el radio de giro del ala comprimida más 1/6 del alma.
- Corto plazo: 1.5 × largo plazo.

Viga secundaria de piso de oficina, luz 7.2 m, arriostrada lateralmente cada 2.4 m por vigas menores, perfil laminado **H-400×200×8×13** (JIS G 3192).`),
      calc(`# Material y perfil
F = 235 N/mm^2 // Valor F de diseño (Notif. 2464) [235 N/mm^2 : SN400B / SS400 (t ≤ 40)|325 N/mm^2 : SN490B / SM490 (t ≤ 40)]
Es = 205000 N/mm^2 // Módulo de elasticidad del acero
sec = 400200 // Perfil H JIS G 3192 [300150 : H-300×150×6.5×9|350175 : H-350×175×7×11|400200 : H-400×200×8×13|450200 : H-450×200×9×14|500200 : H-500×200×10×16|600200 : H-600×200×11×17]
H = hHJIS(sec) // Altura
B = bHJIS(sec) // Ancho de ala
tw = twHJIS(sec) // Espesor de alma
tf = tfHJIS(sec) // Espesor de ala
Ix = IxHJIS(sec) // Momento de inercia
Zx = ZxHJIS(sec) // Módulo de sección elástico
ib = ibHJIS(sec) // Radio de giro para pandeo lateral
Af = B*tf // Área del ala comprimida
## Relaciones ancho-espesor, rango FA (Notif. 1792 Art. 3)
check (B/2)/tf <= 9*sqrt(235 N/mm^2/F) // Ala de viga: b/t ≤ 9√(235/F)
check (H - 2*tf)/tw <= 60*sqrt(235 N/mm^2/F) // Alma de viga: d/tw ≤ 60√(235/F)
# Cargas y solicitaciones
L = 7.2 m // Luz de la viga (simplemente apoyada)
lb = 2.4 m // Longitud no arriostrada del ala comprimida
wL = 17.5 kN/m // Carga de largo plazo (G + P)
M_E = 40 kN*m // Momento adicional de corto plazo (sismo, Co = 0.2)
M_L = wL*L^2/8 -> kN*m // Momento de largo plazo
Q_L = wL*L/2 -> kN // Cortante de largo plazo
M_S = M_L + M_E // Momento de corto plazo
# Esfuerzos admisibles (AIJ acero art. 5)
ft = ftsAIJ(F) // Tracción ft = F/1.5
fs = fssAIJ(F) // Cortante fs = F/(1.5√3)
Lambda = LambdaAIJ(F) // Esbeltez límite Λ
M2M1 = -1 // Relación M2/M1 en el tramo arriostrado (−1: curvatura simple uniforme)
C = CbAIJ(M2M1) // Factor de gradiente de momento (≥ 1.0)
fb_L = fbAIJ(lb, ib, H, Af, F, C) // Flexión admisible de largo plazo con pandeo lateral
fb_S = 1.5*fb_L // Flexión admisible de corto plazo
# Verificaciones
sb_L = M_L/Zx -> N/mm^2 // Esfuerzo de flexión de largo plazo
check sb_L <= fb_L // Flexión de largo plazo (AIJ acero art. 5)
sb_S = M_S/Zx -> N/mm^2 // Esfuerzo de flexión de corto plazo
check sb_S <= fb_S // Flexión de corto plazo
tau = Q_L/(tw*(H - 2*tf)) -> N/mm^2 // Esfuerzo cortante en el alma
check tau <= fs // Cortante (AIJ acero art. 5)
delta = 5*wL*L^4/(384*Es*Ix) -> mm // Deflexión por carga de largo plazo
check delta <= L/300 // Deflexión ≤ L/300 (AIJ; Notif. 1459 exige ≤ L/250 con fluencia)`),
      { type: 'plot', expr: 'fbAIJ(x m, ib, H, Af, F, C)/(1 N/mm^2); sb_L/(1 N/mm^2) + 0*x', var: 'x', desde: '0.5', hasta: '10', puntos: '200', xlabel: 'Longitud no arriostrada lb [m]', ylabel: 'Esfuerzo [N/mm²]', leyenda: true, nombres: 'fb admisible de largo plazo (AIJ); σb actuante de largo plazo', titulo: 'Esfuerzo de flexión admisible en función de la longitud no arriostrada (perfil H JIS)' },
      summary(),
    ],
  },
  // ------------------------------------------------------------------
  //  6) Casa de madera — cantidad de muros (kabe-ryō) + yonbun-wari
  // ------------------------------------------------------------------
  {
    id: 'jp-madera-kaberyo', pais: 'JP', cat: 'Madera y tierra', icon: 'wall', settings: { sys: 'si' },
    name: 'Casa de madera — cantidad de muros (壁量) y balance 1/4',
    normas: 'Building Standard Law · Enforcement Order Art. 46 · Notif. MOC 1352 (2000, yonbun-wari) · Notif. MOC 1100 (multiplicadores de muro)',
    desc: 'Método de cantidad de muros por sismo (longitud por m² de planta) y por viento (50 cm/m² de área proyectada), con multiplicadores de muro y balance por cuartos (yonbun-wari).',
    titulo: 'Verificación de muros resistentes de casa de madera de 2 pisos (método 壁量計算)',
    blocks: [
      text(`# Generalidades
Las viviendas de madera con entramado (在来軸組工法) de hasta 2 pisos se verifican con el **método de cantidad de muros** (壁量計算, Enforcement Order Art. 46):

1. **Longitud efectiva** de muros por dirección: $L_e = \\sum k \\cdot L$, con $k$ el **multiplicador de muro** (壁倍率): arriostre 45×90 simple 2.0, doble 4.0; tablero estructural de 9 mm (N50 @ 150) 2.5; placa de yeso 12.5 mm 0.9 (Order Art. 46 tabla 1; Notif. 1100). La suma por muro no excede 5.0.
2. **Requisito sísmico**: $L_{req} = c_w\\,A_{piso}$, con $c_w$ según el tipo de techo y el número de pisos (Art. 46-4, tabla 2).
3. **Requisito por viento**: $L_{req} = 50\\ \\text{cm/m}^2 \\times$ área de fachada proyectada por encima de 1.35 m del nivel del piso (Art. 46-4, tabla 3).
4. **Balance por cuartos** (四分割法, Notif. 1352): en las franjas extremas de 1/4 de la planta, la **suficiencia** (longitud efectiva/requerida) debe superar 1.0 en ambas, o la relación entre la menor y la mayor debe ser ≥ 0.5.

Vivienda de 2 pisos, techo ligero de lámina metálica, planta del 1F de 10.92 × 7.28 m (módulo 910 mm).
> Desde abril de 2025 la reforma de la BSL reemplazó la tabla de $c_w$ por valores en función del peso real (paneles solares, aislamiento). El valor $c_w$ de esta memoria es editable.`),
      calc(`# Datos de la vivienda
techo = 1 // Tipo de techo [1 : Ligero (lámina metálica, pizarra)|2 : Pesado (teja cerámica)]
pisos = 2 // Número de pisos [1 : 1 piso|2 : 2 pisos|3 : 3 pisos]
Lx = 10.92 m // Largo de la planta del 1F (dirección X)
Ly = 7.28 m // Ancho de la planta del 1F (dirección Y)
A1 = Lx*Ly // Área de piso del 1F
cw1 = kabeBSL(techo, pisos, 1) // Longitud requerida por sismo, 1F (Order Art. 46-4, tabla 2)
cw2 = kabeBSL(techo, pisos, 2) // Longitud requerida por sismo, 2F
cv = 50 cm/m^2 // Longitud requerida por viento (Order Art. 46-4, tabla 3) [50 cm/m^2 : Zona general|75 cm/m^2 : Zona de vientos fuertes]
AvX = 31.0 m^2 // Área de fachada proyectada que recibe viento en X (por encima de 1.35 m del 1F)
AvY = 49.5 m^2 // Área de fachada proyectada que recibe viento en Y
## Longitudes requeridas en el 1F
LsX = cw1*A1 -> m // Requisito sísmico (igual en X e Y)
LwX = cv*AvX -> m // Requisito por viento en X
LwY = cv*AvY -> m // Requisito por viento en Y
LreqX = max(LsX, LwX) // Longitud requerida en X
LreqY = max(LsX, LwY) // Longitud requerida en Y`),
      { type: 'kaberyo', Lx: 'Lx', Ly: 'Ly', coef: 'cw1', coefLado: 'cw1', muros: '0 0 2.73 0 2.5 // fachada sur, tablero 9 mm\n8.19 0 10.92 0 2.5\n0 7.28 3.64 7.28 2.5 // fachada norte\n7.28 7.28 10.92 7.28 2.5\n5.46 3.64 7.28 3.64 2.0 // muro interior, arriostre 45×90\n0 0 0 2.73 2.5 // fachada oeste\n0 4.55 0 7.28 2.5\n10.92 0 10.92 1.82 2.5 // fachada este\n10.92 4.55 10.92 7.28 2.5\n4.55 3.64 4.55 7.28 2.0 // tabique interior, arriostre 45×90\n7.28 0 7.28 1.82 2.0', titulo: 'Planta del 1F: muros resistentes y franjas de 1/4 (yonbun-wari, Notif. 1352)' },
      calc(`# Verificación de cantidad de muros del 1F (Order Art. 46-4)
check LeX >= LreqX // Longitud efectiva en X ≥ requerida (sismo y viento)
check LeY >= LreqY // Longitud efectiva en Y ≥ requerida (sismo y viento)
# Verificación simplificada del 2F
A2 = 7.28 m*7.28 m // Área de piso del 2F
Le2X = 21.8 m // Longitud efectiva de muros del 2F en X (Σk·L)
Le2Y = 23.7 m // Longitud efectiva de muros del 2F en Y (Σk·L)
Av2X = 14.5 m^2 // Área de fachada del 2F que recibe viento en X
Av2Y = 21.0 m^2 // Área de fachada del 2F que recibe viento en Y
check Le2X >= max(cw2*A2, cv*Av2X) // 2F en X (Order Art. 46-4)
check Le2Y >= max(cw2*A2, cv*Av2Y) // 2F en Y (Order Art. 46-4)
"Complementariamente deben verificarse los herrajes de columnas (Notif. 1460, método del valor N) y, para 3 pisos o más de 500 m², el cálculo estructural (Order Art. 82).`),
      summary(),
    ],
  },
  // ------------------------------------------------------------------
  //  7) Viento y nieve BSL
  // ------------------------------------------------------------------
  {
    id: 'jp-bsl-viento-nieve', pais: 'JP', cat: 'Cargas y combinaciones', icon: 'calc', settings: { sys: 'si' },
    name: 'Presión de viento y carga de nieve BSL (Japón)',
    normas: 'Building Standard Law · Enforcement Order Art. 86 (nieve) y 87 (viento) · Notif. MOC 1454 (viento) · Notif. MOC 1455 (nieve)',
    desc: 'q = 0.6·E·V0² con E = Er²·Gf por categoría de rugosidad, coeficientes de presión de muros y fuerza de viento global; carga de nieve S = ρ·ds·μb para zona general o de nieve intensa.',
    titulo: 'Cargas de viento y nieve según la Building Standard Law de Japón',
    blocks: [
      text(`# Generalidades
**Viento** (Order Art. 87; Notif. 1454): la presión de velocidad es $q = 0.6\\,E\\,V_0^2$ [N/m²] con $V_0$ la velocidad básica de la región (30–46 m/s) y $E = E_r^2\\,G_f$. Para la altura media $H$ del edificio:
$$E_r = 1.7\\left(\\frac{\\max(H, Z_b)}{Z_G}\\right)^{\\alpha}$$
| Rugosidad | $Z_b$ [m] | $Z_G$ [m] | $\\alpha$ | $G_f$ ($H \\le 10$) | $G_f$ ($H \\ge 40$) |
|---|---|---|---|---|---|
| I (mar, sin obstáculos) | 5 | 250 | 0.10 | 2.0 | 1.8 |
| II (campo abierto) | 5 | 350 | 0.15 | 2.2 | 2.0 |
| III (suburbano) | 5 | 450 | 0.20 | 2.5 | 2.1 |
| IV (urbano denso) | 10 | 550 | 0.27 | 3.1 | 2.3 |

La fuerza es $W = q\\,C_f\\,A$, con $C_f = C_{pe} - C_{pi}$: barlovento $C_{pe} = 0.8\\,k_z$, sotavento $C_{pe} = -0.4$, interior $C_{pi} = 0$ o $-0.2$.

**Nieve** (Order Art. 86; Notif. 1455): $S = \\rho\\,d_s\\,\\mu_b$ con $\\rho = 20$ N/m²/cm (zona general) o 30 N/m²/cm en zonas de nieve intensa (多雪区域), y $\\mu_b = \\sqrt{\\cos(1.5\\beta)}$ ($\\beta \\le 60°$).

Edificio de 3 pisos en Tokio ($V_0 = 34$ m/s), zona suburbana, techo a dos aguas de 20°.`),
      calc(`# Presión de viento (Order Art. 87)
V0 = 34 m/s // Velocidad básica del viento (Notif. 1454 Art. 2) [30 m/s|32 m/s|34 m/s : Tokio|36 m/s|38 m/s|40 m/s|42 m/s|44 m/s|46 m/s : Okinawa]
cat = 3 // Categoría de rugosidad del terreno (Notif. 1454 Art. 1) [1 : I — mar o lago|2 : II — campo abierto|3 : III — suburbano|4 : IV — urbano denso]
Hb = 10.0 m // Altura media del edificio (promedio entre alero y cumbrera)
Bw = 20.0 m // Ancho de la fachada expuesta
Er = ErBSL(Hb, cat) // Factor de distribución vertical (Notif. 1454 Art. 1)
Gf = GfBSL(Hb, cat) // Factor de ráfaga (Notif. 1454 Art. 1)
E = Er^2*Gf // Factor de exposición E = Er²·Gf
q = 0.6*E*V0^2*1 N*s^2/m^4 // Presión de velocidad q = 0.6·E·V0² (Order Art. 87-2)
kz = kzBSL(Hb, Hb, cat) // Factor de altura en la cumbre (Notif. 1454 Art. 3)
Cpe1 = 0.8*kz // Coeficiente de presión exterior, barlovento
Cpe2 = -0.4 // Coeficiente de presión exterior, sotavento
Cpi = -0.2 // Coeficiente de presión interior (edificio cerrado) [0|-0.2]
## Presión sobre el cerramiento y fuerza global
pw = q*(Cpe1 - Cpi) -> N/m^2 // Presión neta de diseño en el muro de barlovento
pcap = 1500 N/m^2 // Resistencia de diseño del panel de fachada (ensayo del fabricante)
check pw <= pcap // Presión de viento ≤ resistencia del panel
Qw = q*(Cpe1 - Cpe2)*Bw*Hb -> kN // Fuerza global de viento sobre el edificio
QE1 = 1450 kN // Cortante sísmico basal de primera fase (Co = 0.2) del mismo edificio
check Qw <= QE1 // El sismo controla el diseño lateral (si no, diseñar por viento)
# Carga de nieve (Order Art. 86)
reg = 1 // Región (Order Art. 86-2) [1 : Zona general|2 : Zona de nieve intensa (多雪区域)]
ds = 30 cm // Profundidad de nieve de diseño (Notif. 1455; reglamento de la prefectura)
beta = 20 deg // Pendiente del techo
rho = si(reg == 1, 20, 30)*1 N/m^2/cm // Peso unitario de la nieve por cm (Order Art. 86-2)
mub = mubBSL(beta) // Coeficiente de forma del techo (Order Art. 86-4)
S = rho*ds*mub -> N/m^2 // Carga de nieve de diseño S = ρ·ds·μb
SL = si(reg == 1, 0, 0.7)*S // Nieve en combinación de largo plazo (solo zona de nieve intensa: 0.7S, Order Art. 82)
scap = 1200 N/m^2 // Capacidad de carga variable de la cubierta (correas y paneles)
check S <= scap // Carga de nieve ≤ capacidad de la cubierta`),
      { type: 'plot', expr: 'qBSL(x m, 1, V0)/(1 N/m^2); qBSL(x m, 2, V0)/(1 N/m^2); qBSL(x m, 3, V0)/(1 N/m^2); qBSL(x m, 4, V0)/(1 N/m^2)', var: 'x', desde: '3', hasta: '100', puntos: '200', xlabel: 'Altura media del edificio H [m]', ylabel: 'q [N/m²]', leyenda: true, nombres: 'Rugosidad I; Rugosidad II; Rugosidad III; Rugosidad IV', titulo: 'Presión de velocidad q = 0.6·Er²·Gf·V0² según la rugosidad del terreno (V0 del proyecto)' },
      { type: 'plot', expr: 'si(x <= 60, sqrt(cos(1.5*x*pi/180)), 0)', var: 'x', desde: '0', hasta: '70', puntos: '200', xlabel: 'Pendiente del techo β [°]', ylabel: 'μb', titulo: 'Coeficiente de forma del techo para nieve μb = √cos(1.5β) (Order Art. 86-4)' },
      summary(),
    ],
  },
  // ------------------------------------------------------------------
  //  8) Espectros JRA para puentes (nivel 1 y 2)
  // ------------------------------------------------------------------
  {
    id: 'jp-jra-espectro', pais: 'JP', cat: 'Puentes', icon: 'spectrum', settings: { sys: 'si' },
    name: 'Espectros sísmicos JRA para puentes (nivel 1 y nivel 2)',
    normas: 'JRA Specifications for Highway Bridges, Part V Seismic Design (道路橋示方書 V 耐震設計編, 2012)',
    desc: 'Clasificación del suelo por TG, espectros estándar de nivel 1 y nivel 2 (tipo I subducción y tipo II cortical), coeficientes cz y cD, y verificación de la pila por el método de capacidad de carga horizontal.',
    titulo: 'Espectros de diseño sísmico de puentes — JRA Parte V',
    blocks: [
      text(`# Generalidades
Las **Specifications for Highway Bridges** de la Japan Road Association (JRA, 道路橋示方書) Parte V definen dos niveles de movimiento sísmico:

- **Nivel 1**: sismo de alta probabilidad durante la vida útil; el puente debe permanecer elástico (diseño por esfuerzos admisibles).
- **Nivel 2**: sismo severo de baja probabilidad, con dos tipos: **tipo I**, de gran magnitud en zonas de subducción (p. ej. 2011 Tohoku), y **tipo II**, cortical de corta distancia (p. ej. 1995 Hyogo-ken Nanbu, Kobe).

La aceleración espectral es $S = c_z\\,c_D\\,S_0(T)$ [gal], con $c_z$ el coeficiente de zona (A: 1.0, B: 0.85, C: 0.7) y $c_D = \\dfrac{1.5}{40h + 1} + 0.5$ la corrección por amortiguamiento. El tipo de suelo se clasifica con el periodo característico $T_G = 4\\sum H_i/V_{si}$: tipo I ($T_G < 0.2$ s), II ($0.2 \\le T_G < 0.6$ s), III ($T_G \\ge 0.6$ s).

Para nivel 2 se usa el **método de capacidad de carga horizontal**: $k_{he} = c_z\\,k_{hc0}/\\sqrt{2\\mu_a - 1} \\ge 0.4\\,c_z$ y debe cumplirse $P_a \\ge k_{he}\\,W$.`),
      calc(`# Suelo de cimentación (JRA V 4.5)
Hi = [3.0, 5.0, 4.0] m // Espesor de cada estrato hasta la base sísmica
Vsi = [130, 190, 260] m/s // Velocidad de onda de corte de cada estrato
TG = 4*sum(Hi ./ Vsi) // Periodo característico del suelo TG = 4ΣHi/Vsi
suelo = sueloJRA(TG) // Tipo de suelo (I, II o III)
# Parámetros del puente
zona = 1 // Zona sísmica JRA [1 : A (cz = 1.0)|2 : B (cz = 0.85)|3 : C (cz = 0.7)]
cz = czJRA(zona) // Coeficiente de zona
h = 0.05 // Amortiguamiento del sistema
cD = cDJRA(h) // Corrección por amortiguamiento
T = 0.80 s // Periodo natural de la pila en la dirección analizada
g0 = 980 // Gravedad en gal
# Nivel 1 (JRA V 4.2)
S1 = cz*cD*SJRA1(T, suelo) // Aceleración espectral nivel 1 [gal]
kh1 = S1/g0 // Coeficiente sísmico horizontal nivel 1
check kh1 >= 0.1 // kh ≥ 0.1 (mínimo nivel 1)
khA1 = 0.30 // Coeficiente sísmico resistido a esfuerzos admisibles por la pila (análisis)
check kh1 <= khA1 // Nivel 1: respuesta elástica (esfuerzos admisibles)
# Nivel 2 (JRA V 4.3 y 6.4)
SI = cz*cD*SJRA2I(T, suelo) // Nivel 2 tipo I (subducción) [gal]
SII = cz*cD*SJRA2II(T, suelo) // Nivel 2 tipo II (cortical) [gal]
muA = 3.0 // Ductilidad admisible de la pila (JRA V 10.2)
kheI = max(SI/g0/sqrt(2*muA - 1), 0.4*cz) // Coef. sísmico equivalente tipo I
kheII = max(SII/g0/sqrt(2*muA - 1), 0.4*cz) // Coef. sísmico equivalente tipo II
W = 9800 kN // Peso equivalente (superestructura + 1/2 pila)
Pa = 8200 kN // Capacidad de carga horizontal de la pila (curva de capacidad)
check kheI*W <= Pa // Nivel 2 tipo I: Pa ≥ khe·W
check kheII*W <= Pa // Nivel 2 tipo II: Pa ≥ khe·W`),
      { type: 'plot', expr: 'cz*cD*SJRA1(x, suelo); cz*cD*SJRA2I(x, suelo); cz*cD*SJRA2II(x, suelo)', var: 'x', desde: '0.02', hasta: '4', puntos: '300', xlabel: 'Periodo T [s]', ylabel: 'S [gal]', leyenda: true, nombres: 'Nivel 1; Nivel 2 tipo I (subducción); Nivel 2 tipo II (cortical)', titulo: 'Espectros de diseño JRA para el tipo de suelo del sitio (h = 5 %)' },
      { type: 'plot', expr: 'SJRA2II(x, 1); SJRA2II(x, 2); SJRA2II(x, 3)', var: 'x', desde: '0.02', hasta: '4', puntos: '300', xlabel: 'Periodo T [s]', ylabel: 'S_II0 [gal]', leyenda: true, nombres: 'Suelo tipo I; Suelo tipo II; Suelo tipo III', titulo: 'Espectro estándar nivel 2 tipo II según el tipo de suelo' },
      summary(),
    ],
  },
  // ------------------------------------------------------------------
  //  9) Espectro de la Notificación 1461 / cálculo de límites
  // ------------------------------------------------------------------
  {
    id: 'jp-bsl-n1461', pais: 'JP', cat: 'Sismo — Japón', icon: 'spectrum', settings: { sys: 'si' },
    name: 'Espectro BSL de la roca de ingeniería (Notif. 1461 / cálculo de límites)',
    normas: 'Building Standard Law · Enforcement Order Art. 82-5 (限界耐力計算) · Notif. MOC 1457 (2000) · Notif. MOC 1461 (2000)',
    desc: 'Espectro de aceleración en la roca de ingeniería para sismo raro y muy raro, amplificación simplificada del suelo Gs, reducción por amortiguamiento Fh y verificación de un sistema equivalente de 1 GDL.',
    titulo: 'Espectro de respuesta BSL y verificación por el método de cálculo de límites',
    blocks: [
      text(`# Generalidades
El **cálculo de límites de resistencia** (限界耐力計算, Order Art. 82-5) y el análisis dinámico de edificios altos (Notif. 1461) definen el sismo mediante un **espectro de aceleración en la roca de ingeniería** (Vs ≥ 400 m/s), con 5 % de amortiguamiento [m/s²]:
$$S_0(T) = \\begin{cases} 0.64 + 6T & T < 0.16 \\\\ 1.6 & 0.16 \\le T < 0.64 \\\\ 1.024/T & T \\ge 0.64 \\end{cases} \\quad \\text{(sismo raro, 稀)}$$
y 5 veces estos valores para el **sismo muy raro** (極めて稀). En superficie, $S_a = Z\\,G_s\\,S_0$, con $G_s$ la amplificación del suelo (método simplificado de la Notif. 1457 Art. 10) y la reducción por amortiguamiento $F_h = 1.5/(1 + 10h)$.

Se verifica un edificio de 4 pisos idealizado como sistema equivalente de 1 GDL: en el **límite de daño** (sismo raro) y en el **límite de seguridad** (sismo muy raro).`),
      calc(`# Datos
${ZONA}
Z = ZBSL(zona) // Coeficiente de zona (Notif. 1793)
M = 1450 tonne // Masa equivalente del sistema de 1 GDL
Td = 0.55 s // Periodo equivalente en el límite de daño
Ts = 1.05 s // Periodo equivalente (secante) en el límite de seguridad
hd = 0.05 // Amortiguamiento en el límite de daño
hs = 0.15 // Amortiguamiento equivalente en el límite de seguridad (histerético + 5 %)
# Límite de daño — sismo raro (Notif. 1457 Art. 9)
Sad = Z*GsN1457(Td, suelo)*S0N1461(Td, 1)*FhBSL(hd)*1 m/s^2 // Aceleración de respuesta
Qdem1 = M*Sad -> kN // Cortante basal demandado
Qd = 4200 kN // Resistencia en el límite de daño (primer elemento que alcanza el esfuerzo admisible de corto plazo)
check Qdem1 <= Qd // Límite de daño (Order Art. 82-5-3)
# Límite de seguridad — sismo muy raro (Notif. 1457 Art. 7)
Sas = Z*GsN1457(Ts, suelo)*S0N1461(Ts, 2)*FhBSL(hs)*1 m/s^2 // Aceleración de respuesta reducida
Qdem2 = M*Sas -> kN // Cortante basal demandado
Qs = 9800 kN // Resistencia en el límite de seguridad (curva de capacidad)
check Qdem2 <= Qs // Límite de seguridad (Order Art. 82-5-5)`),
      { type: 'plot', expr: 'S0N1461(x, 1); S0N1461(x, 2); Z*GsN1457(x, suelo)*S0N1461(x, 2); Z*GsN1457(x, suelo)*S0N1461(x, 2)*FhBSL(hs)', var: 'x', desde: '0.02', hasta: '3', puntos: '300', xlabel: 'Periodo T [s]', ylabel: 'Sa [m/s²]', leyenda: true, nombres: 'Roca de ingeniería, sismo raro; Roca de ingeniería, sismo muy raro; Superficie Z·Gs·S0 (muy raro); Con reducción Fh (h = 15 %)', titulo: 'Espectros de aceleración de la Notif. 1461 / 1457 (h = 5 %)' },
      summary(),
    ],
  },
];
