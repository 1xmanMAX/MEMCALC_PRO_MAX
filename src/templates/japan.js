// =====================================================================
//  Plantillas — módulo «japan»
//  Building Standard Law (BSL), AIJ y JRA. Unidades SI (kN, N/mm², m).
// =====================================================================
import { calc, text, summary } from './_h.js';

const ZONA = `zona = 1 // Zona sísmica (Notif. 1793 Art. 1) [1 : Z = 1.0 (Tokio, Osaka, Nagoya, Sendai)|2 : Z = 0.9 (Sapporo, Hiroshima, Kumamoto)|3 : Z = 0.8 (Fukuoka, Yamaguchi, Saga)|4 : Z = 0.7 (Okinawa)]
suelo = 2 // Tipo de suelo (Notif. 1793 Art. 2) [1 : Tipo 1 — roca o grava dura|2 : Tipo 2 — intermedio|3 : Tipo 3 — aluvial blando] [1..3]`;

export default [
  // ------------------------------------------------------------------
  //  1) Diseño sísmico BSL — Rutas 1 y 2 (esfuerzos admisibles)
  // ------------------------------------------------------------------
  {
    id: 'jp-bsl-ruta12', pais: 'JP', cat: 'Sismo — Japón', icon: 'quake', settings: { sys: 'si' },
    validacion: {
      fuente: 'BSL — Notif. 1793 (Z, Rt, Ai) y Order Art. 88 — valores de control calculados a mano (tests/japan.test.mjs)',
      nota: 'Los datos por defecto no reproducen un ejemplo publicado: los valores esperados son de control (calculados con la plantilla y comprobados a mano donde se indica) para detectar cambios. T = h(0.02 + 0.01α) = 18·0.02 = 0.36 s; Rt = 1 (T < Tc = 0.6 s); Qb = Co·ΣW = 0.2·25700 kN; A5 con α = 4300/25700.',
      valores: [
        { var: 'T', unidad: 's', esperado: 0.36, tol: 0.001, desc: 'Notif. 1793: T = 0.02·18 m' },
        { var: 'Rt', esperado: 1, tol: 0.001, desc: 'Notif. 1793: Rt = 1 (T < Tc)' },
        { var: 'Qb', unidad: 'kN', esperado: 5140, tol: 0.001, desc: 'Control: Q1 = 0.2·ΣW = 5140 kN' },
        { var: 'Ai[5]', esperado: 1.7883, tol: 0.002, desc: 'Control: Ai del 5F (cálculo manual)' },
        { var: 'Rex', esperado: 0.015434, tol: 0.002, desc: 'Control: excentricidad Re en X' },
        { var: 'Rey', esperado: 0.022844, tol: 0.002, desc: 'Control: excentricidad Re en Y' },
      ],
    },
    name: 'Diseño sísmico BSL — Rutas 1 y 2 (Ai, derivas, Rs, Re)',
    normas: 'Building Standard Law · Enforcement Order Art. 81, 82, 82-2, 82-6, 88 · Notif. MOC 1793 (1980) · Notif. MOC 1791 (1980, mod. 2007)',
    desc: 'Primera fase (Co = 0.2): Ci = Z·Rt·Ai·Co por piso, deriva ≤ 1/200, rigidez relativa Rs ≥ 0.6, excentricidad Re ≤ 0.15, esbeltez H/B ≤ 4 y cantidad de muros y columnas de C°A° (Ruta 2-1).',
    titulo: 'Diseño sísmico de edificio de concreto armado de 5 pisos — BSL Japón, Rutas 1 y 2',
    blocks: [
      text(`# Generalidades
La **Building Standard Law** (*Kenchiku Kijun-ho*, BSL) de Japón y su **Enforcement Order** (*Shiko-rei*) establecen el diseño sísmico en dos fases:

- **Primera fase** (sismo moderado, $C_o = 0.2$, Order Art. 88): se calculan los esfuerzos por el **método de esfuerzos admisibles** (*kyoyo oryokudo keisan*, Order Art. 82) y se limita la deriva de entrepiso a **1/200** (Art. 82-2).
- **Segunda fase** (sismo severo, $C_o = 1.0$): según la ruta de cálculo, se verifica la regularidad (Ruta 2: $R_s \\ge 0.6$, $R_e \\le 0.15$, Art. 82-6) o la resistencia lateral última $Q_u \\ge Q_{un}$ (Ruta 3, Art. 82-3).

Esta memoria corresponde a un edificio de oficinas de **5 pisos de concreto armado** (pórticos con muros de corte) de altura menor a 31 m, verificado por la **Ruta 2-1** (Notif. 1791 Art. 3): cantidad mínima de muros y columnas, deriva, rigidez relativa, excentricidad y relación de esbeltez del edificio (*tojo-hi* ≤ 4, exigida desde la reforma de 2007). El coeficiente de corte del entrepiso $i$ es
$$C_i = Z\\,R_t\\,A_i\\,C_o, \\qquad Q_i = C_i \\sum_{j \\ge i} w_j$$
con $A_i = 1 + \\left(\\dfrac{1}{\\sqrt{\\alpha_i}} - \\alpha_i\\right)\\dfrac{2T}{1+3T}$ (Notif. 1793 Art. 3).

**Unidades:** kN, m, N/mm². **Normas:** BSL, Enforcement Order, Notificaciones del MOC/MLIT 1791, 1792 y 1793.`),
      calc(`# Datos del edificio
${ZONA}
alpha_h = 0 // Fracción de la altura con estructura de acero o madera (Notif. 1793 Art. 2) [0..1]
Fc = 24 N/mm^2 // Resistencia de diseño del concreto [21 N/mm^2|24 N/mm^2|27 N/mm^2|30 N/mm^2|36 N/mm^2] [18..60]
wi = [5600, 5300, 5300, 5200, 4300] kN // Peso sísmico por piso, del 1F al 5F (Order Art. 88: G + P sísmica)
hs = [4.0, 3.5, 3.5, 3.5, 3.5] m // Altura de cada entrepiso
Bx = 24.0 m // Dimensión en planta en X [5..100]
By = 14.0 m // Dimensión en planta en Y [5..100]
## Coeficientes sísmicos (Order Art. 88; Notif. 1793)
Z = ZBSL(zona) // Coeficiente de zona (Notif. 1793 Art. 1)
Tc = TcBSL(suelo) // Periodo característico del suelo (Notif. 1793 Art. 2)
hT = sum(hs) // Altura total del edificio
check hT <= 31 m // Ruta 2: altura ≤ 31 m (Order Art. 81-2)
check hT/min(Bx, By) <= 4 // Relación de esbeltez H/B ≤ 4 para Rutas 1 y 2 (Notif. 1791 Art. 3, reforma 2007)
T = TBSL(hT, alpha_h) // Periodo fundamental de diseño T = h(0.02 + 0.01α) (Notif. 1793 Art. 2)
Co = 0.2 // Coeficiente de corte estándar, primera fase (Order Art. 88-2) [0.2..0.3]`),
      { type: 'aidist', wi: 'wi', hi: 'hs', T: 'T', Z: 'Z', Tc: 'Tc', Co: 'Co', titulo: 'Distribución Ai, coeficiente de corte Ci y cortante de entrepiso Qi (primera fase, Co = 0.2)' },
      calc(`## Fuerza sísmica de diseño (Order Art. 88-1)
CB = Qb/sum(wi) // Coeficiente de corte basal C1 = Z·Rt·Co (A1 = 1); Qb = cortante basal exportado por el bloque Ai
# Deriva de entrepiso (Order Art. 82-2)
di = [8.6, 8.9, 8.4, 7.3, 5.5] mm // Desplazamiento relativo de entrepiso bajo Qi (análisis elástico)
theta = di ./ hs // Deriva de entrepiso δi/hi
check max(theta) <= 1/200 // Deriva ≤ 1/200 (Order Art. 82-2)
# Rigidez relativa Rs (Order Art. 82-6, inc. 2 (a))
"Se muestra la dirección X; el procedimiento se repite en la dirección Y con sus propios desplazamientos.
rs = hs ./ di // Inversa de la deriva rs = hi/δi
rsm = mean(rs) // Promedio de rs en todos los pisos
Rs = rs/rsm // Rigidez relativa (gosei-ritsu) Rs = rs/r̄s
check min(Rs) >= 0.6 // Rs ≥ 0.6 en todos los pisos (Order Art. 82-6, inc. 2 (a))
# Excentricidad Re del 1F (Order Art. 82-6, inc. 2 (b))
"Se muestra el 1F; la verificación se repite en cada piso con las rigideces de sus ejes.
xY = [0, 6, 12, 18, 24] m // Posición x de los ejes resistentes en Y
KY = [0.9, 1.2, 1.2, 1.2, 1.0] kN/mm // Rigidez lateral de cada eje en Y
yX = [0, 7, 14] m // Posición y de los ejes resistentes en X
KX = [1.5, 1.2, 1.4] kN/mm // Rigidez lateral de cada eje en X
gx = 12.0 m // Centro de masas, coordenada x [0..100]
gy = 7.0 m // Centro de masas, coordenada y [0..100]
lx = sum(KY .* xY)/sum(KY) -> m // Centro de rigidez, coordenada x
ly = sum(KX .* yX)/sum(KX) -> m // Centro de rigidez, coordenada y
KR = sum(KY .* (xY - lx).^2) + sum(KX .* (yX - ly).^2) -> kN*m // Rigidez torsional respecto al centro de rigidez
rex = sqrt(KR/sum(KX)) -> m // Radio elástico para sismo en X
rey = sqrt(KR/sum(KY)) -> m // Radio elástico para sismo en Y
Rex = abs(gy - ly)/rex // Excentricidad relativa, sismo en X
Rey = abs(gx - lx)/rey // Excentricidad relativa, sismo en Y
check Rex <= 0.15 // Re ≤ 0.15, sismo en X (Order Art. 82-6, inc. 2 (b))
check Rey <= 0.15 // Re ≤ 0.15, sismo en Y (Order Art. 82-6, inc. 2 (b))
# Cantidad de muros y columnas — Ruta 2-1 (Notif. 1791 Art. 3)
alpha_F = min(sqrt(Fc/(18 N/mm^2)), sqrt(2)) // Factor por resistencia del concreto α = √(Fc/18) ≤ √2
Aw = [7.2, 6.6, 6.0, 5.4, 4.2] m^2 // Área horizontal de muros de corte en la dirección analizada
Ac = [6.4, 5.8, 5.8, 5.2, 5.2] m^2 // Área horizontal de columnas
Qr = alpha_F*(2.5 N/mm^2*Aw + 0.7 N/mm^2*Ac) -> kN // Resistencia convencional Σ2.5αAw + 0.7αAc
Qreq = 0.75*Z*Ai .* Wi // Demanda 0.75·Z·W·Ai (Ruta 2-1)
check min(Qr ./ Qreq) >= 1 // Σ2.5αAw + 0.7αAc ≥ 0.75·Z·W·Ai en todos los pisos (Notif. 1791 Art. 3)
"Además, en la Ruta 2-1 el cortante de diseño de vigas y columnas se amplifica: $Q_D = Q_L + n\\,Q_E$ con $n \\ge 2$, o $Q_D = Q_L + Q_y$ (Notif. 1791 Art. 3), y los esfuerzos de primera fase deben cumplir los esfuerzos admisibles de corto plazo (Order Art. 82); véanse las plantillas de viga y columna AIJ.`),
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
    validacion: {
      fuente: 'BSL — Notif. 1792 (Ds de C°A.°, MEXT 2024 tabla 6.1; Fes) — valores de control',
      nota: 'Los datos por defecto no reproducen un ejemplo publicado: los valores esperados son de control (calculados con la plantilla y comprobados a mano donde se indica) para detectar cambios. Qun1 = Ds·Fes·Qud = 0.40·1.0·25700 kN; Ds del 5F (FB + WA, βu = 0.28) = 0.35 según la tabla oficial.',
      valores: [
        { var: 'Qb', unidad: 'kN', esperado: 25700, tol: 0.001, desc: 'Control: Qud1 = 1.0·ΣW' },
        { var: 'Ds[1]', esperado: 0.4, tol: 0.001, desc: 'Notif. 1792 / MEXT tabla 6.1: Ds del 1F' },
        { var: 'Ds[5]', esperado: 0.35, tol: 0.001, desc: 'Notif. 1792 / MEXT tabla 6.1: Ds del 5F (FB + WA, βu ≤ 0.3)' },
        { var: 'Qun[1]', unidad: 'kN', esperado: 10280, tol: 0.001, desc: 'Control: Qun1 = 0.40·25700 kN' },
        { var: 'rmin', esperado: 1.0992, tol: 0.002, desc: 'Control: menor relación Qu/Qun' },
      ],
    },
    name: 'Capacidad lateral última BSL — Ruta 3 (Qun = Ds·Fes·Qud)',
    normas: 'Building Standard Law · Enforcement Order Art. 82-3 · Notif. MOC 1792 (1980, mod. 2007) · Notif. MOC 1793',
    desc: 'Segunda fase (Co = 1.0): Qud con distribución Ai, Ds por rango de miembros (FA–FD, WA–WD) y βu, Fes = Fs·Fe por piso, y comparación con la resistencia de un análisis pushover.',
    titulo: 'Verificación de la resistencia lateral última (horyu suihei tairyoku) — Ruta 3 BSL',
    blocks: [
      text(`# Generalidades
En la **Ruta 3** (*horyu suihei tairyoku keisan*, Order Art. 82-3) se exige que la **resistencia lateral última** $Q_u$ de cada entrepiso, obtenida de un análisis incremental (pushover) hasta formar el mecanismo, sea mayor o igual que la **resistencia lateral requerida**
$$Q_{un} = D_s\\,F_{es}\\,Q_{ud}, \\qquad Q_{ud} = Z\\,R_t\\,A_i\\,C_o \\sum_{j \\ge i} w_j \\;\\; (C_o = 1.0)$$

- $D_s$: **coeficiente de características estructurales** (Notif. 1792 Art. 4, tabla para pórticos con muros), según el rango del grupo de vigas y columnas (FA–FD), el rango del grupo de muros (WA–WD) y la fracción $\\beta_u$ de la resistencia lateral última tomada por los muros.
- $F_{es} = F_s\\,F_e$: **factor de forma** por rigidez relativa $R_s$ y excentricidad $R_e$ (Notif. 1792 Art. 7): $F_s = 2 - R_s/0.6$ si $R_s < 0.6$; $F_e$ crece linealmente de 1.0 ($R_e \\le 0.15$) a 1.5 ($R_e \\ge 0.30$).

Edificio de concreto armado de 5 pisos (pórticos FB con muros WA). Los valores $Q_u$, $\\beta_u$, $R_s$ y $R_e$ provienen del análisis incremental y del análisis elástico de primera fase del proyecto. La Ruta 3 no exime de la primera fase (esfuerzos admisibles y deriva ≤ 1/200).`),
      calc(`# Datos
${ZONA}
alpha_h = 0 // Fracción de altura de acero o madera [0..1]
wi = [5600, 5300, 5300, 5200, 4300] kN // Peso sísmico por piso (1F → 5F)
hs = [4.0, 3.5, 3.5, 3.5, 3.5] m // Altura de entrepiso
Z = ZBSL(zona) // Coeficiente de zona (Notif. 1793 Art. 1)
Tc = TcBSL(suelo) // Periodo del suelo (Notif. 1793 Art. 2)
T = TBSL(sum(hs), alpha_h) // Periodo de diseño (Notif. 1793 Art. 2)
Co = 1.0 // Coeficiente de corte estándar para sismo severo (Order Art. 88-3) [1.0..1.5]`),
      { type: 'aidist', wi: 'wi', hi: 'hs', T: 'T', Z: 'Z', Tc: 'Tc', Co: 'Co', titulo: 'Cortante elástico último Qud = Z·Rt·Ai·Co·ΣW con Co = 1.0' },
      calc(`# Resistencia lateral requerida Qun (Order Art. 82-3)
Qud = Qi // Cortante sísmico último por piso (bloque Ai, Co = 1.0)
## Coeficiente Ds (Notif. 1792 Art. 4)
rF = 2 // Rango del grupo de vigas y columnas [1 : FA|2 : FB|3 : FC|4 : FD] [1..4]
rW = 1 // Rango del grupo de muros de corte [1 : WA|2 : WB|3 : WC|4 : WD] [1..4]
bu = [0.55, 0.52, 0.48, 0.40, 0.28] // Fracción βu del cortante último tomada por los muros (pushover)
Ds = DsRC(rF, rW, bu) // Ds por piso (Notif. 1792 Art. 4, tabla)
## Factor de forma Fes (Notif. 1792 Art. 7)
Rs = [0.82, 1.03, 1.00, 1.02, 1.13] // Rigidez relativa por piso (Order Art. 82-6)
Re = [0.06, 0.08, 0.10, 0.17, 0.21] // Excentricidad relativa por piso (Order Art. 82-6)
Fes = FesBSL(Rs, Re) // Fes = Fs·Fe
## Resistencia requerida y resistencia última
Qun = Ds .* Fes .* Qud // Qun = Ds·Fes·Qud (Order Art. 82-3)
Qu = [11300, 10050, 8350, 6450, 3700] kN // Resistencia lateral última por piso (análisis pushover)
"La verificación $Q_u \\ge Q_{un}$ se hace piso por piso en la figura siguiente (Order Art. 82-3).`),
      { type: 'qunqu', Qu: 'Qu', Qun: 'Qun', titulo: 'Resistencia lateral última Qu vs. requerida Qun por entrepiso' },
      { type: 'table', columnas: 'Piso = 1:5\n$A_i$ = Ai\n$Q_{ud}$ [kN] = Qud\n$\\beta_u$ = bu\n$D_s$ = Ds\n$F_{es}$ = Fes\n$Q_{un}$ [kN] = Qun\n$Q_u$ [kN] = Qu\n$Q_u/Q_{un}$ = QuQun', dec: '3', titulo: 'Resumen de la verificación de capacidad última por piso' },
      text(`> **Notas.** (1) En cada piso, el rango de cada miembro se obtiene de $h_0/D$, $\\sigma_0/F_c$, $p_t$ y $\\tau_u/F_c$ (C°A°) o de las relaciones ancho/espesor (acero), y el rango del grupo resulta de las proporciones de miembros A, B y C (Notif. 1792 Arts. 3 y 4). (2) $F_e$ se interpola linealmente entre 1.0 ($R_e \\le 0.15$) y 1.5 ($R_e \\ge 0.30$) y $F_s = 2 - R_s/0.6$ si $R_s < 0.6$ (Notif. 1792 Art. 7). (3) Los miembros que pueden fallar por cortante deben tener una resistencia a cortante mayor que la del mecanismo con un margen (diseño de garantía); ver las plantillas de viga y columna AIJ.`),
      summary(),
    ],
  },
  // ------------------------------------------------------------------
  //  3) Viga de concreto armado AIJ
  // ------------------------------------------------------------------
  {
    id: 'jp-aij-viga', pais: 'JP', cat: 'Concreto — normas extranjeras', icon: 'beam', settings: { sys: 'si' },
    validacion: {
      fuente: 'AIJ, Normas de C°A.° (2010) art. 13 y 15; fórmula mínima de Arakawa — valores de control',
      nota: 'Los datos por defecto no reproducen un ejemplo publicado: los valores esperados son de control (calculados con la plantilla y comprobados a mano donde se indica) para detectar cambios. fs = 0.49 + Fc/100 = 0.73 N/mm² (largo plazo) y ft = 215 N/mm² (SD345 D25) son valores de la norma.',
      valores: [
        { var: 'fs_L', unidad: 'N/mm^2', esperado: 0.73, tol: 0.001, desc: 'AIJ: fs largo plazo Fc 24 = 0.73' },
        { var: 'ft_L', unidad: 'N/mm^2', esperado: 215, tol: 0.001, desc: 'AIJ: ft largo plazo SD345 D25 = 215' },
        { var: 'Ma_S', unidad: 'kN*m', esperado: 388.52, tol: 0.002, desc: 'Control: momento admisible de corto plazo' },
        { var: 'Qa_S', unidad: 'kN', esperado: 320.48, tol: 0.002, desc: 'Control: cortante admisible de corto plazo' },
        { var: 'Mu', unidad: 'kN*m', esperado: 439.58, tol: 0.002, desc: 'Control: momento último 0.9·at·σy·d' },
        { var: 'Qsu', unidad: 'kN', esperado: 323.86, tol: 0.002, desc: 'Control: Qsu (Arakawa mín.)' },
      ],
    },
    name: 'Viga de concreto armado AIJ (esfuerzos admisibles + Arakawa)',
    normas: 'AIJ Standard for Structural Calculation of Reinforced Concrete Structures (2010/2018) · Notif. MLIT 594 · Notif. MOC 1791',
    desc: 'Flexión at = M/(ft·j), cortante admisible de largo plazo, de corto plazo con control de daño y de seguridad (AIJ 2010 art. 15), y resistencia última Mu = 0.9·at·σy·d y Qsu de Arakawa (mín.) frente al mecanismo.',
    titulo: 'Diseño de viga de concreto armado — AIJ (esfuerzos admisibles y resistencia última)',
    blocks: [
      text(`# Generalidades
El **AIJ Standard for Structural Calculation of Reinforced Concrete Structures** (*RC kozo keisan kijun*) aplica **esfuerzos admisibles** de largo plazo (cargas permanentes $G + P$) y de corto plazo ($G + P + K$, sismo con $C_o = 0.2$):

| Material | Largo plazo | Corto plazo |
|---|---|---|
| Concreto, compresión | $F_c/3$ | $2F_c/3$ |
| Concreto, cortante | $\\min(F_c/30,\\ 0.49 + F_c/100)$ | 1.5 × largo plazo |
| SD345 (≤ D25) | 215 N/mm² | 345 N/mm² |
| Estribos SD295/SD345 | 195 N/mm² | 295 / 345 N/mm² |

Flexión (art. 13): $M_a = a_t\\,f_t\\,j$ con $j = 7d/8$. Cortante (art. 15, ed. 2010), con $\\alpha = 4/(M/(Qd) + 1)$, $1 \\le \\alpha \\le 2$:

- largo plazo: $Q_{AL} = b\\,j\\,\\alpha f_s$;
- corto plazo, **control de daño** con $Q_{DS} = Q_L + Q_E$: $Q_{AS} = b\\,j\\,[\\tfrac{2}{3}\\alpha f_s + 0.5\\,{}_wf_t\\,(p_w - 0.002)]$;
- corto plazo, **seguridad** con $Q_D = Q_L + n\\,Q_E$: $Q_A = b\\,j\\,[\\alpha f_s + 0.5\\,{}_wf_t\\,(p_w - 0.002)]$, con $p_w \\le 1.2\\%$ y $\\,{}_wf_t \\le 390$ N/mm².

Para garantizar la falla dúctil (diseño de garantía) se compara la resistencia a cortante de **Arakawa** (fórmula mínima) $Q_{su}$ con el cortante del mecanismo amplificado $Q_L + n_m\\cdot 2M_u/l_0$.

Viga de pórtico de 7.0 m (luz libre 6.3 m), sección 400 × 700 mm, 4-D25, estribos 2-D10@125, Fc = 24 N/mm², SD345.`),
      calc(`# Materiales y sección
Fc = 24 N/mm^2 // Resistencia de diseño del concreto [21 N/mm^2|24 N/mm^2|27 N/mm^2|30 N/mm^2] [18..60]
SD = 345 // Acero longitudinal [295 : SD295|345 : SD345|390 : SD390]
SD_w = 295 // Acero de estribos [295 : SD295|345 : SD345]
b = 400 mm // Ancho de la viga [200..1200]
D = 700 mm // Peralte total [300..1500]
dt = 65 mm // Distancia del borde al centroide del acero en tracción [40..120]
nb = 4 // Número de barras en tracción [2..12]
db = 25 // Diámetro de las barras [19 : D19|22 : D22|25 : D25|29 : D29]
nw = 2 // Ramas de estribo [2..6]
dw = 10 // Diámetro de estribo [10 : D10|13 : D13]
sw = 125 mm // Espaciamiento de estribos [50..250]
l0 = 6.3 m // Luz libre de la viga [2..15]
## Propiedades
d = D - dt // Peralte efectivo
j = 7/8*d // Brazo de palanca (AIJ RC art. 13)
at = nb*AbJIS(db) // Área de acero en tracción
pt = at/(b*d) // Cuantía de tracción
aw = nw*AbJIS(dw) // Área de un juego de estribos
pw = aw/(b*sw) // Cuantía de estribos
check pt >= 0.004 // Cuantía mínima de tracción pt ≥ 0.4 % (AIJ RC art. 13)
check pw >= 0.002 // pw ≥ 0.2 % (AIJ RC art. 15)
check sw <= min(D/2, 250 mm) // Separación de estribos ≤ D/2 y ≤ 250 mm (AIJ RC art. 15)
# Esfuerzos admisibles (AIJ RC art. 6)
ft_L = ftAIJ(SD, 1, db) // Tracción, largo plazo
ft_S = ftAIJ(SD, 2, db) // Tracción, corto plazo
fs_L = fsaAIJ(Fc, 1) // Cortante del concreto, largo plazo
fs_S = fsaAIJ(Fc, 2) // Cortante del concreto, corto plazo
wft_S = wftAIJ(SD_w, 2) // Tracción en estribos, corto plazo
# Solicitaciones en el extremo de la viga
M_L = 165 kN*m // Momento de largo plazo (G + P) [0..2000]
Q_L = 120 kN // Cortante de largo plazo [0..2000]
M_E = 175 kN*m // Momento sísmico (Co = 0.2) [0..3000]
Q_E = 55 kN // Cortante sísmico [0..2000]
n = 2 // Factor de amplificación del cortante sísmico [1.5 : Ruta 1|2 : Ruta 2-1 / 2-2] [1.5..2.0]
M_S = M_L + M_E // Momento de corto plazo
Q_S = Q_L + Q_E // Cortante de corto plazo sin amplificar
# Flexión (AIJ RC art. 13)
Ma_L = at*ft_L*j -> kN*m // Momento admisible de largo plazo Ma = at·ft·j
check M_L <= Ma_L // Flexión de largo plazo
Ma_S = at*ft_S*j -> kN*m // Momento admisible de corto plazo
check M_S <= Ma_S // Flexión de corto plazo
# Cortante (AIJ RC art. 15)
alpha_L = alphaAIJ(M_L, Q_L, d, 2) // α = 4/(M/(Qd) + 1), 1 ≤ α ≤ 2
Qa_L = b*j*alpha_L*fs_L -> kN // Cortante admisible de largo plazo
check Q_L <= Qa_L // Cortante de largo plazo
alpha_DS = alphaAIJ(M_S, Q_S, d, 2) // Factor α para control de daño
Qas_S = QasAIJ(b, j, alpha_DS, fs_S, wft_S, pw) // QAS = b·j·((2/3)·α·fs + 0.5·wft·(pw − 0.002))
check Q_S <= Qas_S // Cortante de corto plazo, control de daño QDS = QL + QE (AIJ RC art. 15, ec. 15.3)
Q_D = Q_L + n*Q_E // Cortante de diseño de seguridad (AIJ RC ec. 15.9; Notif. 1791 Art. 3)
alpha_S = alphaAIJ(M_S, Q_D, d, 2) // Factor α para corto plazo
Qa_S = QaAIJ(b, j, alpha_S, fs_S, wft_S, pw) // QA = b·j·(α·fs + 0.5·wft·(pw − 0.002))
check Q_D <= Qa_S // Cortante de corto plazo, seguridad (AIJ RC art. 15, ec. 15.5)
# Resistencia última y falla dúctil (Notif. 594; AIJ)
Fy = SD*1 N/mm^2 // Valor F del acero longitudinal (Notif. 2464)
sy = 1.1*Fy // Resistencia de fluencia para resistencia última: 1.1·F en barras JIS (Notif. 2464)
Mu = MuAIJ(at, sy, d) // Momento último Mu = 0.9·at·σy·d
nm = 1.1 // Factor de amplificación del cortante del mecanismo (diseño de garantía) [1.1|1.2|1.25] [1.0..1.5]
Qm = Q_L + nm*2*Mu/l0 // Cortante de diseño en el mecanismo de flexión (rótulas en ambos extremos)
MQd = l0/(2*d) // Relación de corte M/(Q·d) (se limita a 1 ≤ M/Qd ≤ 3 dentro de Qsu)
swy = SD_w*1 N/mm^2 // Fluencia de estribos
Qsu = QsuAIJ(pt, Fc, MQd, pw, swy, 0 N/mm^2, b, j) // Resistencia a cortante de Arakawa (fórmula mínima)
check Qsu >= Qm // Qsu ≥ QL + nm·2Mu/l0: falla por flexión antes que por cortante (rango FA, Notif. 1792)`),
      { type: 'secjp', b: 'b', D: 'D', dt: 'dt', tipo: 'viga', sup: '{nb}-D{db}', inf: '3-D{db}', est: '{nw}-D{dw}@{sw/(1 mm)}', titulo: 'Sección de la viga en el apoyo (barras corrugadas JIS)' },
      { type: 'plot', expr: 'QsuAIJ(pt, Fc, x, pw, swy, 0 N/mm^2, b, j)/(1 kN); QaAIJ(b, j, min(max(4/(x + 1), 1), 2), fs_S, wft_S, pw)/(1 kN)', var: 'x', desde: '1', hasta: '3', puntos: '100', xlabel: 'M/(Q·d)', ylabel: 'Cortante [kN]', leyenda: true, nombres: 'Qsu de Arakawa (resistencia última); QA admisible de corto plazo', titulo: 'Cortante resistente en función de la relación M/(Qd)' },
      summary(),
    ],
  },
  // ------------------------------------------------------------------
  //  4) Columna de concreto armado AIJ
  // ------------------------------------------------------------------
  {
    id: 'jp-aij-columna', pais: 'JP', cat: 'Concreto — normas extranjeras', icon: 'column', settings: { sys: 'si' },
    validacion: {
      fuente: 'AIJ, Normas de C°A.° (2010) art. 13–15; Notif. 1791 — valores de control',
      nota: 'Los datos por defecto no reproducen un ejemplo publicado: los valores esperados son de control (calculados con la plantilla y comprobados a mano donde se indica) para detectar cambios. fc = Fc/3 = 8 N/mm² (largo plazo) es valor de la norma.',
      valores: [
        { var: 'fca_L', unidad: 'N/mm^2', esperado: 8, tol: 0.001, desc: 'AIJ: fc largo plazo = Fc/3' },
        { var: 'Ma_L', unidad: 'kN*m', esperado: 209.97, tol: 0.002, desc: 'Control: momento admisible de largo plazo' },
        { var: 'Ma_S1', unidad: 'kN*m', esperado: 494.51, tol: 0.002, desc: 'Control: momento admisible con N máx.' },
        { var: 'Qa_S', unidad: 'kN', esperado: 619.91, tol: 0.002, desc: 'Control: cortante admisible de corto plazo' },
        { var: 'Mu', unidad: 'kN*m', esperado: 927.42, tol: 0.002, desc: 'Control: momento último' },
        { var: 'Qsu', unidad: 'kN', esperado: 756.28, tol: 0.002, desc: 'Control: Qsu (Arakawa mín.)' },
      ],
    },
    name: 'Columna de concreto armado AIJ (flexocompresión y cortante)',
    normas: 'AIJ Standard for Structural Calculation of Reinforced Concrete Structures (2018) · Notif. MLIT 594 · Notif. MOC 1791',
    desc: 'Momento admisible para la carga axial (sección fisurada, n = 15) a largo y corto plazo, cortante admisible de largo plazo, de control de daño y de seguridad, y resistencia última Mu y Qsu (Arakawa mín.) con margen frente al mecanismo.',
    titulo: 'Diseño de columna de concreto armado — AIJ (esfuerzos admisibles y resistencia última)',
    blocks: [
      text(`# Generalidades
La columna se verifica a **flexocompresión** con esfuerzos admisibles (AIJ RC art. 14): para la carga axial $N$ se busca la posición del eje neutro de la sección fisurada (relación de módulos $n$) tal que se alcance primero el esfuerzo admisible del concreto $f_c$ o del acero $f_t$; el momento resultante es el **momento admisible** $M_A$. El **cortante** se verifica a largo plazo ($Q_{AL} = b\\,j\\,\\alpha f_s$, se adopta $\\alpha = 1$), a corto plazo con **control de daño** ($Q_L + Q_E \\le b\\,j\\,[\\tfrac{2}{3}\\alpha f_s + 0.5\\,{}_wf_t\\,(p_w - 0.002)]$, $1 \\le \\alpha \\le 1.5$) y con **seguridad** ($Q_L + n\\,Q_E \\le b\\,j\\,[f_s + 0.5\\,{}_wf_t\\,(p_w - 0.002)]$), AIJ RC 2010 art. 15.

Para la resistencia última se usa (Notif. 594 / guía técnica de la BSL):
$$M_u = 0.8\\,a_t\\,\\sigma_y\\,D + 0.5\\,N\\,D\\left(1 - \\frac{N}{b\\,D\\,F_c}\\right) \\quad (0 \\le N \\le 0.4\\,bDF_c)$$
y la fórmula **mínima de Arakawa** incluyendo el efecto de la compresión $0.1\\,\\sigma_0$, comparada con el cortante del mecanismo amplificado $n_m\\cdot 2M_u/h_0$.

Columna interior del 1F de 600 × 600 mm, 16-D25 (5 por cara), estribos cerrados de 4 ramas D13@100, Fc = 24 N/mm², SD345.`),
      calc(`# Materiales y sección
Fc = 24 N/mm^2 // Resistencia de diseño del concreto [21 N/mm^2|24 N/mm^2|27 N/mm^2|30 N/mm^2] [18..60]
SD = 345 // Acero longitudinal [295 : SD295|345 : SD345|390 : SD390]
SD_w = 345 // Acero de estribos [295 : SD295|345 : SD345]
b = 600 mm // Ancho de la columna [200..1200]
D = 600 mm // Peralte en la dirección analizada [300..1500]
dt = 65 mm // Distancia del borde al centroide de las barras de la cara [40..120]
nc = 5 // Barras por cara (armadura simétrica) [2..12]
db = 25 // Diámetro de barras [22 : D22|25 : D25|29 : D29]
nw = 4 // Ramas de estribo en la dirección analizada [2|3|4] [2..6]
dw = 13 // Diámetro de estribo [10 : D10|13 : D13]
sw = 100 mm // Espaciamiento de estribos [50..250]
h0 = 3.2 m // Altura libre de la columna [1.5..6]
## Propiedades
d = D - dt // Peralte efectivo
j = 7/8*d // Brazo de palanca
at = nc*AbJIS(db) // Acero en la cara traccionada
pt = at/(b*d) // Cuantía de tracción
pg = (4*nc - 4)*AbJIS(db)/(b*D) // Cuantía total
check pg >= 0.008 // Cuantía total ≥ 0.8 % (AIJ RC art. 14)
aw = nw*AbJIS(dw) // Área de un juego de estribos
pw = aw/(b*sw) // Cuantía de estribos
check pw >= 0.002 // pw ≥ 0.2 % (AIJ RC art. 15)
check sw <= 100 mm // Separación de estribos ≤ 100 mm en los extremos (AIJ RC art. 15)
n = nAIJ(Fc) // Relación de módulos de Young (AIJ RC art. 5)
# Esfuerzos admisibles (AIJ RC art. 6)
fca_L = fcaAIJ(Fc, 1) // Compresión, largo plazo Fc/3
fca_S = fcaAIJ(Fc, 2) // Compresión, corto plazo 2Fc/3
ft_L = ftAIJ(SD, 1, db) // Acero, largo plazo
ft_S = ftAIJ(SD, 2, db) // Acero, corto plazo
fs_L = fsaAIJ(Fc, 1) // Cortante concreto, largo plazo
fs_S = fsaAIJ(Fc, 2) // Cortante concreto, corto plazo
wft_S = wftAIJ(SD_w, 2) // Estribos, corto plazo
# Solicitaciones
N_L = 1650 kN // Carga axial de largo plazo [0..20000]
M_L = 45 kN*m // Momento de largo plazo [0..2000]
Q_L = 25 kN // Cortante de largo plazo [0..2000]
N_E = 380 kN // Carga axial sísmica (variación) [0..10000]
M_E = 330 kN*m // Momento sísmico (Co = 0.2) [0..3000]
Q_E = 160 kN // Cortante sísmico [0..2000]
nQ = 2 // Amplificación del cortante sísmico (Notif. 1791 Art. 3) [1.5 : Ruta 1|2 : Ruta 2-1 / 2-2] [1.5..2.0]
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
Q_S = Q_L + Q_E // Cortante de corto plazo sin amplificar (control de daño)
alpha_DS = alphaAIJ(M_S, Q_S, d, 1.5) // α = 4/(M/(Qd) + 1), 1 ≤ α ≤ 1.5 en columnas
Qas_S = QasAIJ(b, j, alpha_DS, fs_S, wft_S, pw) // QAS = b·j·((2/3)·α·fs + 0.5·wft·(pw − 0.002))
check Q_S <= Qas_S // Cortante de corto plazo, control de daño (AIJ RC art. 15, ec. 15.3)
Q_D = Q_L + nQ*Q_E // Cortante de diseño de seguridad
Qa_S = QaAIJ(b, j, 1, fs_S, wft_S, pw) // QA = b·j·(fs + 0.5·wft·(pw − 0.002))
check Q_D <= Qa_S // Cortante de corto plazo, seguridad (AIJ RC art. 15, ec. 15.6)
# Resistencia última y falla dúctil
Fy = SD*1 N/mm^2 // Valor F del acero longitudinal (Notif. 2464)
sy = 1.1*Fy // Resistencia de fluencia para resistencia última: 1.1·F (Notif. 2464)
check N1 <= 0.4*b*D*Fc // Rango de validez de la fórmula de Mu (N ≤ 0.4bDFc)
Mu = MucAIJ(at, sy, D, N1, b, Fc) // Momento último con N máx.
nm = 1.25 // Factor de amplificación del cortante del mecanismo en columnas (diseño de garantía) [1.1|1.2|1.25] [1.0..1.5]
Qm = nm*2*Mu/h0 // Cortante de diseño en el mecanismo (rótulas en ambos extremos)
s0 = N1/(b*D) -> N/mm^2 // Esfuerzo axial medio σ0
MQd = h0/(2*d) // Relación de corte M/(Qd)
swy = SD_w*1 N/mm^2 // Fluencia de estribos
Qsu = QsuAIJ(pt, Fc, MQd, pw, swy, s0, b, j) // Arakawa (fórmula mínima) con 0.1·σ0
check Qsu >= Qm // Qsu ≥ nm·2Mu/h0: falla por flexión antes que por cortante (Notif. 1792)`),
      { type: 'secjp', b: 'b', D: 'D', dt: 'dt', tipo: 'columna', sup: '{nc}-D{db}', est: '{nw} ramas D{dw}@{sw/(1 mm)}', titulo: 'Sección de la columna (armadura simétrica, barras JIS)' },
      { type: 'plot', expr: 'MaColAIJ(x kN, b, D, at, dt, fca_L, ft_L, n)/(1 kN*m); MaColAIJ(x kN, b, D, at, dt, fca_S, ft_S, n)/(1 kN*m)', var: 'x', desde: '-800', hasta: '6000', puntos: '120', xlabel: 'Carga axial N [kN] (compresión +)', ylabel: 'Momento admisible MA [kN·m]', leyenda: true, nombres: 'Largo plazo (Fc/3, ft = 215); Corto plazo (2Fc/3, ft = F)', titulo: 'Diagrama de momento admisible – carga axial (AIJ RC art. 14). Demandas (N; M) en kN y kN·m: largo plazo (1650; 45), corto plazo (2030; 375) y (1270; 375)' },
      summary(),
    ],
  },
  // ------------------------------------------------------------------
  //  5) Viga de acero AIJ (perfil H JIS)
  // ------------------------------------------------------------------
  {
    id: 'jp-aij-acero', pais: 'JP', cat: 'Acero estructural', icon: 'steel', settings: { sys: 'si' },
    validacion: {
      fuente: 'AIJ, Normas de acero (2005) art. 5; perfil JIS G 3192 H-400×200×8×13 (Ix = 23 500 cm⁴, Zx = 1 170 cm³)',
      nota: 'Ix y Zx son los del catálogo JIS (r = 13 mm); Λ = √(π²E/0.6F) = 119.8 (F = 235). Los esfuerzos y la deflexión son valores de control calculados con la plantilla (5wL⁴/384EI).',
      valores: [
        { var: 'Ix', unidad: 'cm^4', esperado: 23500, tol: 0.005, desc: 'JIS G 3192: Ix de H-400×200×8×13' },
        { var: 'Zx', unidad: 'cm^3', esperado: 1170, tol: 0.005, desc: 'JIS G 3192: Zx de H-400×200×8×13' },
        { var: 'Lambda', esperado: 119.8, tol: 0.001, desc: 'AIJ: Λ (F = 235 N/mm²) = 119.8' },
        { var: 'fb_L', unidad: 'N/mm^2', esperado: 156.67, tol: 0.002, desc: 'Control: fb de largo plazo' },
        { var: 'sb_L', unidad: 'N/mm^2', esperado: 96.923, tol: 0.002, desc: 'Control: σb = M/Z' },
        { var: 'delta', unidad: 'mm', esperado: 12.711, tol: 0.002, desc: 'Control: deflexión 5wL⁴/384EI' },
      ],
    },
    name: 'Viga de acero AIJ — perfil H JIS (esfuerzos admisibles)',
    normas: 'AIJ Design Standard for Steel Structures · Notif. MLIT 1024 (2001) · Notif. MOC 2464 (2000) · Notif. MOC 1792 (relaciones ancho-espesor) · Notif. MOC 1459',
    desc: 'Flexión con pandeo lateral fb = máx{(1 − 0.4(lb/i)²/(CΛ²))ft ; 89000/(lb·h/Af)}, cortante, rango FA por relaciones ancho-espesor y deflexión (Notif. 1459).',
    titulo: 'Diseño de viga de acero con perfil H JIS — esfuerzos admisibles AIJ',
    blocks: [
      text(`# Generalidades
El AIJ *Design Standard for Steel Structures* (*Kokozo sekkei kijun*) y la Notif. MLIT 1024 definen los esfuerzos admisibles de largo plazo a partir del valor de diseño $F$ (Notif. 2464; SN400B: $F = 235$ N/mm²):

- Tracción $f_t = F/1.5$; cortante $f_s = F/(1.5\\sqrt{3})$.
- Flexión con **pandeo lateral-torsional**: $f_b = \\max\\left\\{\\left[1 - 0.4\\dfrac{(l_b/i)^2}{C\\,\\Lambda^2}\\right] f_t\\ ;\\ \\dfrac{89\\,000}{l_b\\,h/A_f}\\right\\} \\le f_t$, con $\\Lambda = \\sqrt{\\pi^2 E/(0.6F)}$ e $i$ el radio de giro del ala comprimida más 1/6 del alma.
- Corto plazo: 1.5 × largo plazo.

Viga secundaria de piso de oficina, simplemente apoyada, luz 7.2 m, arriostrada lateralmente cada 2.4 m por vigas menores, perfil laminado **H-400×200×8×13** (JIS G 3192). Por ser una viga secundaria articulada no recibe momentos sísmicos: rige la combinación de largo plazo $G + P$ (en zonas de nieve intensa se agrega la combinación con nieve).

Deflexión: la Notif. 1459 exige $\\delta/L \\le 1/250$ cuando el peralte es menor que $L/15$ (acero); aquí se adopta el límite más estricto $L/300$ recomendado por el AIJ.`),
      calc(`# Material y perfil
F = 235 N/mm^2 // Valor F de diseño (Notif. 2464) [235 N/mm^2 : SN400B / SS400 (t ≤ 40)|325 N/mm^2 : SN490B / SM490 (t ≤ 40)]
Es = 205000 N/mm^2 // Módulo de elasticidad del acero [200000..210000]
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
L = 7.2 m // Luz de la viga (simplemente apoyada) [2..20]
lb = 2.4 m // Longitud no arriostrada del ala comprimida [0.5..20]
wL = 17.5 kN/m // Carga de largo plazo (G + P) [1..100]
M_L = wL*L^2/8 -> kN*m // Momento de largo plazo
Q_L = wL*L/2 -> kN // Cortante de largo plazo
# Esfuerzos admisibles (AIJ acero art. 5)
ft = ftsAIJ(F) // Tracción ft = F/1.5
fs = fssAIJ(F) // Cortante fs = F/(1.5√3)
Lambda = LambdaAIJ(F) // Esbeltez límite Λ
M2M1 = -1 // Relación M2/M1 en el tramo arriostrado (−1: curvatura simple uniforme) [-1..1]
C = CbAIJ(M2M1) // Factor de gradiente de momento (≥ 1.0)
fb_L = fbAIJ(lb, ib, H, Af, F, C) // Flexión admisible de largo plazo con pandeo lateral
# Verificaciones
sb_L = M_L/Zx -> N/mm^2 // Esfuerzo de flexión de largo plazo
check sb_L <= fb_L // Flexión de largo plazo (AIJ acero art. 5)
tau = Q_L/(tw*(H - 2*tf)) -> N/mm^2 // Esfuerzo cortante en el alma
check tau <= fs // Cortante (AIJ acero art. 5)
delta = 5*wL*L^4/(384*Es*Ix) -> mm // Deflexión por carga de largo plazo (factor de fluencia del acero = 1)
dlim = L/300 -> mm // Deflexión admisible L/300 (AIJ; más estricta que L/250 de la Notif. 1459)
check delta <= dlim // Deflexión de largo plazo`),
      { type: 'plot', expr: 'fbAIJ(x m, ib, H, Af, F, C)/(1 N/mm^2); sb_L/(1 N/mm^2) + 0*x', var: 'x', desde: '0.5', hasta: '10', puntos: '200', xlabel: 'Longitud no arriostrada lb [m]', ylabel: 'Esfuerzo [N/mm²]', leyenda: true, nombres: 'fb admisible de largo plazo (AIJ); σb actuante de largo plazo', titulo: 'Esfuerzo de flexión admisible en función de la longitud no arriostrada (perfil H JIS)' },
      summary(),
    ],
  },
  // ------------------------------------------------------------------
  //  6) Casa de madera — cantidad de muros (kabe-ryō) + yonbun-wari
  // ------------------------------------------------------------------
  {
    id: 'jp-madera-kaberyo', pais: 'JP', cat: 'Madera y tierra', icon: 'wall', settings: { sys: 'si' },
    validacion: {
      fuente: 'BSL Order Art. 46-4 (cantidad de muros, tablas 1 y 3) y Notif. 1352 (yonbun-wari) — valores de control',
      nota: 'Los datos por defecto no reproducen un ejemplo publicado: los valores esperados son de control (calculados con la plantilla y comprobados a mano donde se indica) para detectar cambios. Coeficientes de piso de la tabla del Art. 46-4 (techo ligero, 2 pisos): 29 cm/m² en el 1F y 15 cm/m² en el 2F.',
      valores: [
        { var: 'cw1', unidad: 'cm/m^2', esperado: 29, tol: 0.001, desc: 'Order Art. 46-4: 1F, techo ligero, 2 pisos' },
        { var: 'cw2', unidad: 'cm/m^2', esperado: 15, tol: 0.001, desc: 'Order Art. 46-4: 2F, techo ligero, 2 pisos' },
        { var: 'LreqX', unidad: 'm', esperado: 23.054, tol: 0.002, desc: 'Control: longitud requerida en X' },
        { var: 'LeX', unidad: 'm', esperado: 35.49, tol: 0.002, desc: 'Control: longitud efectiva en X' },
        { var: 'LreqY', unidad: 'm', esperado: 24.75, tol: 0.002, desc: 'Control: longitud requerida en Y (rige viento)' },
        { var: 'bX', esperado: 0.75, tol: 0.002, desc: 'Control: relación de balance en X' },
      ],
    },
    name: 'Casa de madera — cantidad de muros (kabe-ryo) y balance 1/4',
    normas: 'Building Standard Law · Enforcement Order Art. 46 · Notif. MOC 1352 (2000, yonbun-wari) · Notif. MOC 1100 (multiplicadores de muro)',
    desc: 'Método de cantidad de muros por sismo (longitud por m² de planta) y por viento (50 cm/m² de área proyectada), con multiplicadores de muro y balance por cuartos (yonbun-wari).',
    titulo: 'Verificación de muros resistentes de casa de madera de 2 pisos (método de cantidad de muros, kabe-ryo keisan)',
    blocks: [
      text(`# Generalidades
Las viviendas de madera de entramado de postes y vigas (*zairai jikugumi koho*) de hasta 2 pisos se verifican con el **método de cantidad de muros** (*kabe-ryo keisan*, Enforcement Order Art. 46):

1. **Longitud efectiva** de muros por dirección: $L_e = \\sum k \\cdot L$, con $k$ el **multiplicador de muro** (*kabe-bairitsu*): arriostre 45×90 simple 2.0, doble 4.0; tablero estructural de 9 mm (N50 @ 150) 2.5; placa de yeso 12.5 mm 0.9 (Order Art. 46 tabla 1; Notif. 1100). La suma por muro no excede 5.0.
2. **Requisito sísmico**: $L_{req} = c_w\\,A_{piso}$, con $c_w$ según el tipo de techo y el número de pisos (Art. 46-4, tabla 2).
3. **Requisito por viento**: $L_{req} = 50\\ \\text{cm/m}^2 \\times$ área de fachada proyectada por encima de 1.35 m del nivel del piso (Art. 46-4, tabla 3).
4. **Balance por cuartos** (*yonbun-wari-ho*, Notif. 1352): en las franjas extremas de 1/4 de la planta, la **suficiencia** (longitud efectiva/requerida) debe superar 1.0 en ambas, o la relación entre la menor y la mayor debe ser ≥ 0.5. La longitud requerida de cada franja usa su propia área y el coeficiente $c_w$ que corresponde al número de pisos **de esa franja** (si sobre la franja no hay 2F, se usa el valor de 1 piso).

Vivienda de 2 pisos, techo ligero de lámina metálica, planta del 1F de 10.92 × 7.28 m (módulo 910 mm).
> **Vigencia.** Desde abril de 2025 la reforma de la BSL reemplazó la tabla de $c_w$ por valores que dependen del peso real de la edificación (cubierta, aislamiento, paneles solares) y elevó el límite del multiplicador de muro. La tabla anterior, que es la que reproduce la función *kabeBSL*, solo se admite en el régimen transitorio de la reforma. En un expediente nuevo ingrese en $c_{w1,v}$ y $c_{w2,v}$ los valores obtenidos con el procedimiento vigente; la memoria usa el mayor de ambos.`),
      calc(`# Datos de la vivienda
techo = 1 // Tipo de techo [1 : Ligero (lámina metálica, pizarra)|2 : Pesado (teja cerámica)]
niv = 2 // Número de pisos [1 : 1 piso|2 : 2 pisos|3 : 3 pisos]
Lx = 10.92 m // Largo de la planta del 1F (dirección X) [3..30]
Ly = 7.28 m // Ancho de la planta del 1F (dirección Y) [3..30]
A1 = Lx*Ly // Área de piso del 1F
cw1v = 0 cm/m^2 // c_w del 1F según el procedimiento vigente (reforma de 2025); 0 = solo la tabla anterior [0..100]
cw2v = 0 cm/m^2 // c_w del 2F según el procedimiento vigente (reforma de 2025); 0 = solo la tabla anterior [0..100]
cw1 = max(kabeBSL(techo, niv, 1), cw1v) // Longitud requerida por sismo, 1F (Order Art. 46-4, tabla 2, o valor vigente si es mayor)
cw2 = max(kabeBSL(techo, niv, 2), cw2v) // Longitud requerida por sismo, 2F
cv = 50 cm/m^2 // Longitud requerida por viento (Order Art. 46-4, tabla 3) [50 cm/m^2 : Zona general|75 cm/m^2 : Zona de vientos fuertes]
AvX = 31.0 m^2 // Área de fachada proyectada que recibe viento en X (por encima de 1.35 m del 1F) [5..300]
AvY = 49.5 m^2 // Área de fachada proyectada que recibe viento en Y [5..300]
## Longitudes requeridas en el 1F
LsX = cw1*A1 -> m // Requisito sísmico (igual en X e Y)
LwX = cv*AvX -> m // Requisito por viento en X
LwY = cv*AvY -> m // Requisito por viento en Y
LreqX = max(LsX, LwX) // Longitud requerida en X
LreqY = max(LsX, LwY) // Longitud requerida en Y`),
      { type: 'kaberyo', Lx: 'Lx', Ly: 'Ly', coef: 'cw1', coefLado: 'cw1', muros: '0 0 2.73 0 2.5 // fachada sur, tablero 9 mm\n8.19 0 10.92 0 2.5\n0 7.28 3.64 7.28 2.5 // fachada norte\n7.28 7.28 10.92 7.28 2.5\n5.46 3.64 7.28 3.64 2.0 // muro interior, arriostre 45×90\n0 0 0 2.73 2.5 // fachada oeste\n0 4.55 0 7.28 2.5\n10.92 0 10.92 1.82 2.5 // fachada este\n10.92 4.55 10.92 7.28 2.5\n4.55 3.64 4.55 7.28 2.0 // tabique interior, arriostre 45×90\n7.28 0 7.28 1.82 2.0', titulo: 'Planta del 1F: muros resistentes y franjas de 1/4 (yonbun-wari, Notif. 1352)' },
      calc(`# Verificación de cantidad de muros del 1F (Order Art. 46-4)
"El 2F (7.28 × 7.28 m) no cubre toda la planta del 1F; en las cuatro franjas se usó del lado de la seguridad $c_w$ de 2 pisos ({cw1}). Si sobre una franja no hay 2F puede usarse el valor de 1 piso.
check LeX >= LreqX // Longitud efectiva en X ≥ requerida (sismo y viento)
check LeY >= LreqY // Longitud efectiva en Y ≥ requerida (sismo y viento)
# Verificación simplificada del 2F
A2 = 7.28 m*7.28 m // Área de piso del 2F
Le2X = 21.8 m // Longitud efectiva de muros del 2F en X (Σk·L) [0..200]
Le2Y = 23.7 m // Longitud efectiva de muros del 2F en Y (Σk·L) [0..200]
Av2X = 14.5 m^2 // Área de fachada del 2F que recibe viento en X [0..200]
Av2Y = 21.0 m^2 // Área de fachada del 2F que recibe viento en Y [0..200]
Lreq2X = max(cw2*A2, cv*Av2X) -> m // Longitud requerida del 2F en X (sismo o viento)
Lreq2Y = max(cw2*A2, cv*Av2Y) -> m // Longitud requerida del 2F en Y (sismo o viento)
check Le2X >= Lreq2X // 2F en X (Order Art. 46-4)
check Le2Y >= Lreq2Y // 2F en Y (Order Art. 46-4)
"Complementariamente deben verificarse los herrajes de columnas (Notif. 1460, método del valor N) y, para 3 pisos o más de 500 m², el cálculo estructural (Order Art. 82).`),
      summary(),
    ],
  },
  // ------------------------------------------------------------------
  //  7) Viento y nieve BSL
  // ------------------------------------------------------------------
  {
    id: 'jp-bsl-viento-nieve', pais: 'JP', cat: 'Cargas y combinaciones', icon: 'calc', settings: { sys: 'si' },
    validacion: {
      fuente: 'Ejemplo difundido de la Notif. 1454 (kentiku-kouzou.jp): V0 = 34 m/s, rugosidad III, H = 10 m → Er = 0.794, E = 1.58, q ≈ 1095 N/m²',
      nota: 'Datos de viento por defecto = datos del ejemplo publicado (la fuente redondea E = 1.58, por eso q = 1093 frente a 1095 N/m²). Gf = 2.5 es valor de tabla; μb = √cos(1.5β) = 0.9306 para β = 20°. Las cargas totales (Qw, S) son valores de control.',
      valores: [
        { var: 'Er', esperado: 0.794, tol: 0.001, desc: 'Notif. 1454: Er (H = 10 m, rugosidad III)' },
        { var: 'Gf', esperado: 2.5, tol: 0.001, desc: 'Notif. 1454: Gf rugosidad III, H ≤ 10 m' },
        { var: 'E', esperado: 1.58, tol: 0.004, desc: 'Ejemplo: E = Er²·Gf = 1.58' },
        { var: 'q', unidad: 'N/m^2', esperado: 1095, tol: 0.004, desc: 'Ejemplo: q = 0.6·E·V0² ≈ 1095 N/m²' },
        { var: 'mub', esperado: 0.9306, tol: 0.001, desc: 'Notif. 1455: μb = √cos(30°)' },
        { var: 'Qw', unidad: 'kN', esperado: 262.35, tol: 0.002, desc: 'Control: fuerza de viento' },
        { var: 'S', unidad: 'N/m^2', esperado: 558.36, tol: 0.002, desc: 'Control: carga de nieve de diseño' },
      ],
    },
    name: 'Presión de viento y carga de nieve BSL (Japón)',
    normas: 'Building Standard Law · Enforcement Order Art. 86 (nieve) y 87 (viento) · Notif. MOC 1454 (viento) · Notif. MOC 1455 (nieve)',
    desc: 'q = 0.6·E·V0² con E = Er²·Gf por categoría de rugosidad, coeficientes de presión de muros y fuerza de viento global sobre la estructura; carga de nieve S = ρ·ds·μb para zona general o de nieve intensa.',
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

La fuerza sobre la estructura principal es $W = q\\,C_f\\,A$, con $C_f = C_{pe} - C_{pi}$: barlovento $C_{pe} = 0.8\\,k_z$, sotavento $C_{pe} = -0.4$, interior $C_{pi} = 0$ o $-0.2$ (edificio cerrado). Los **cerramientos y techos** no se diseñan con este $q$: usan la presión pico $\\hat q = 0.6\\,E_r^2\\,V_0^2$ y los coeficientes pico $\\hat C_f$ de la Notif. 1458.

**Nieve** (Order Art. 86; Notif. 1455): $S = \\rho\\,d_s\\,\\mu_b$ con $\\rho = 20$ N/m²/cm (zona general) o 30 N/m²/cm en zonas de nieve intensa (*tasetsu kuiki*), y $\\mu_b = \\sqrt{\\cos(1.5\\beta)}$ ($\\beta \\le 60°$).

Edificio de 3 pisos en Tokio ($V_0 = 34$ m/s), zona suburbana, techo a dos aguas de 20°.`),
      calc(`# Presión de viento (Order Art. 87)
V0 = 34 m/s // Velocidad básica del viento (Notif. 1454 Art. 2) [30 m/s|32 m/s|34 m/s : Tokio|36 m/s|38 m/s|40 m/s|42 m/s|44 m/s|46 m/s : Okinawa] [30..46]
cat = 3 // Categoría de rugosidad del terreno (Notif. 1454 Art. 1) [1 : I — mar o lago|2 : II — campo abierto|3 : III — suburbano|4 : IV — urbano denso]
Hb = 10.0 m // Altura media del edificio (promedio entre alero y cumbrera) [3..100]
Bw = 20.0 m // Ancho de la fachada expuesta [3..200]
Er = ErBSL(Hb, cat) // Factor de distribución vertical (Notif. 1454 Art. 1)
Gf = GfBSL(Hb, cat) // Factor de ráfaga (Notif. 1454 Art. 1)
E = Er^2*Gf // Factor de exposición E = Er²·Gf
q = 0.6 kg/m^3*E*V0^2 -> N/m^2 // Presión de velocidad q = 0.6·E·V0² (Order Art. 87-2)
kz = kzBSL(Hb, Hb, cat) // Factor de altura en la cumbre (Notif. 1454 Art. 3)
Cpe1 = 0.8*kz // Coeficiente de presión exterior, barlovento
Cpe2 = -0.4 // Coeficiente de presión exterior, sotavento [-0.8..0]
Cp_i = -0.2 // Coeficiente de presión interior (edificio cerrado) [0|-0.2] [-0.5..0.2]
## Presiones y fuerza global sobre la estructura principal
pw = q*(Cpe1 - Cp_i) -> N/m^2 // Presión neta en el muro de barlovento (estructura principal)
Qw = q*(Cpe1 - Cpe2)*Bw*Hb -> kN // Fuerza global de viento sobre el edificio
QE1 = 1450 kN // Cortante sísmico basal de primera fase (Co = 0.2) del mismo edificio [10..100000]
check Qw <= QE1 // El sismo controla el diseño lateral (si no, diseñar por viento)
# Carga de nieve (Order Art. 86)
reg = 1 // Región (Order Art. 86-2) [1 : Zona general|2 : Zona de nieve intensa (tasetsu kuiki)]
ds = 30 cm // Profundidad de nieve de diseño (Notif. 1455; reglamento de la prefectura) [0..400]
beta = 20 deg // Pendiente del techo [0..60]
rho = si(reg == 1, 20, 30)*1 N/m^2/cm // Peso unitario de la nieve por cm (Order Art. 86-2)
mub = mubBSL(beta) // Coeficiente de forma del techo (Order Art. 86-4)
S = rho*ds*mub -> N/m^2 // Carga de nieve de diseño S = ρ·ds·μb
SL = si(reg == 1, 0, 0.7)*S // Nieve en combinación de largo plazo (solo zona de nieve intensa: 0.7S, Order Art. 82)
scap = 1200 N/m^2 // Capacidad de carga variable de la cubierta (correas y paneles) [300..10000]
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
    validacion: {
      fuente: 'JRA, Especificaciones de puentes V (2012), tablas de S0, kh0 y khc0 (manual de la Pref. de Miyagi, tablas 3-9, 3-13 y 3-14; NILIM 2013, fig. 1)',
      nota: 'Con T = 0.8 s en suelo tipo II las ordenadas caen en las mesetas tabuladas: nivel 1 = 250 gal (kh0 = 0.25), nivel 2 tipo I (2012) = 1300 gal, nivel 2 tipo II = 1750 gal. TG y los coeficientes con cs son valores de control.',
      valores: [
        { var: 'TG', unidad: 's', esperado: 0.25911, tol: 0.002, desc: 'Control: periodo característico del suelo' },
        { var: 'suelo', esperado: 2, tol: 0.001, desc: 'Control: suelo tipo II' },
        { var: 'kh0', esperado: 0.25, tol: 0.001, desc: 'JRA: kh0 suelo II, meseta 0.2–1.3 s' },
        { var: 'S1', esperado: 250, tol: 0.001, desc: 'JRA: S0 nivel 1, suelo II = 250 gal' },
        { var: 'SI', esperado: 1300, tol: 0.001, desc: 'JRA 2012 / NILIM 2013: tipo I, suelo II = 1300 gal' },
        { var: 'SII', esperado: 1750, tol: 0.001, desc: 'JRA: tipo II, suelo II = 1750 gal' },
        { var: 'khcI', esperado: 0.58138, tol: 0.002, desc: 'Control: khc tipo I con cs' },
        { var: 'khcII', esperado: 0.78262, tol: 0.002, desc: 'Control: khc tipo II con cs' },
      ],
    },
    name: 'Espectros sísmicos JRA para puentes (nivel 1 y nivel 2)',
    normas: 'JRA Specifications for Highway Bridges, Part V Seismic Design (Doro-kyo Shiho-sho V, ed. 2012)',
    desc: 'Clasificación del suelo por TG, espectros estándar de nivel 1 y nivel 2 (tipo I subducción, revisado en 2012, y tipo II cortical), coeficientes sísmicos kh0 y khc0 del método estático y verificación de la pila por capacidad de carga horizontal.',
    titulo: 'Espectros de diseño sísmico de puentes — JRA Parte V',
    blocks: [
      text(`# Generalidades
Las **Specifications for Highway Bridges** de la Japan Road Association (JRA, *Doro-kyo Shiho-sho*) Parte V definen dos niveles de movimiento sísmico:

- **Nivel 1**: sismo de alta probabilidad durante la vida útil; el puente debe permanecer elástico (diseño por esfuerzos admisibles).
- **Nivel 2**: sismo severo de baja probabilidad, con dos tipos: **tipo I**, de gran magnitud en zonas de subducción (revisado en la edición 2012 tras el sismo de Tohoku de 2011), y **tipo II**, cortical de corta distancia (p. ej. 1995 Hyogo-ken Nanbu, Kobe).

Para el **análisis dinámico** se usa el espectro $S = c_z\\,c_D\\,S_0(T)$ [gal], con $c_D = \\dfrac{1.5}{40h + 1} + 0.5$; para el tipo I se usa el coeficiente regional $c_{Iz}$ (1.2 / 1.0 / 0.8) y para el nivel 1 y el tipo II, $c_z$ (A: 1.0, B: 0.85, C: 0.7). El tipo de suelo se clasifica con el periodo característico $T_G = 4\\sum H_i/V_{si}$: tipo I ($T_G < 0.2$ s), II ($0.2 \\le T_G < 0.6$ s), III ($T_G \\ge 0.6$ s).

Para el **método estático** de una pila de un solo grado de libertad:

- nivel 1 (6.3): $k_h = c_z\\,k_{h0}(T) \\ge 0.1$, que la pila debe resistir con esfuerzos admisibles;
- nivel 2 (6.4, método de capacidad de carga horizontal): $k_{hc} = c_s\\,c_{z}\\,k_{hc0}(T) \\ge 0.4\\,c_z$, con $c_s = 1/\\sqrt{2\\mu_a - 1}$, y debe cumplirse $P_a \\ge k_{hc}\\,W$.`),
      calc(`# Suelo de cimentación y tipo de suelo (JRA V)
Hi = [3.0, 5.0, 4.0] m // Espesor de cada estrato hasta la superficie de diseño sísmico
Vsi = [130, 190, 260] m/s // Velocidad de onda de corte de cada estrato
TG = 4*sum(Hi ./ Vsi) -> s // Periodo característico del suelo TG = 4ΣHi/Vsi
suelo = sueloJRA(TG) // Tipo de suelo (1 = I, 2 = II, 3 = III)
# Parámetros del puente
zona = 1 // Zona sísmica JRA para nivel 1 y nivel 2 tipo II [1 : A (cz = 1.0)|2 : B (cz = 0.85)|3 : C (cz = 0.7)]
cz = czJRA(zona) // Coeficiente de zona cz
cIz = 1.0 // Coeficiente regional para nivel 2 tipo I (JRA 2012, mapa de cIz) [1.2|1.0|0.8] [0.8..1.2]
h = 0.05 // Amortiguamiento del sistema (para el espectro dinámico) [0.02..0.20]
cD = cDJRA(h) // Corrección por amortiguamiento
T = 0.80 s // Periodo natural de la pila en la dirección analizada [0.1..5]
W = 9800 kN // Peso equivalente (superestructura + 1/2 pila) [100..100000]
# Nivel 1 — método estático (JRA V 6.3)
kh0 = kh0JRA(T, suelo) // Coeficiente sísmico estándar de nivel 1
kh = max(cz*kh0, 0.1) // Coeficiente sísmico de diseño kh = cz·kh0 ≥ 0.1
khA = 0.30 // Coeficiente sísmico que la pila resiste con esfuerzos admisibles (análisis de la pila) [0.1..1.0]
check kh <= khA // Nivel 1: respuesta elástica con esfuerzos admisibles
# Nivel 2 — capacidad de carga horizontal (JRA V 6.4 y 10.2)
muA = 3.0 // Ductilidad admisible de la pila μa (JRA V 10.2) [1..8]
cs = 1/sqrt(2*muA - 1) // Coeficiente de características estructurales cs
khcI = max(cs*cIz*khc0JRA(T, suelo, 1), 0.4*cIz) // Coeficiente sísmico de diseño, tipo I
khcII = max(cs*cz*khc0JRA(T, suelo, 2), 0.4*cz) // Coeficiente sísmico de diseño, tipo II
Pa = 8200 kN // Capacidad de carga horizontal de la pila (curva de capacidad) [100..100000]
check khcI*W <= Pa // Nivel 2 tipo I: Pa ≥ khc·W
check khcII*W <= Pa // Nivel 2 tipo II: Pa ≥ khc·W
## Desplazamiento residual (JRA V 6.4.6)
dy = 0.040 m // Desplazamiento de fluencia en el centro de inercia de la superestructura (curva de capacidad) [0.005..0.5]
Hp = 10.0 m // Altura desde la base de la pila al centro de inercia de la superestructura [2..60]
rpos = 0 // Relación entre la rigidez posfluencia y la elástica r (0 en pilas de C°A°) [0..0.5]
cR = 0.6 // Coeficiente de desplazamiento residual (pilas de C°A°, JRA V 6.4.6) [0.5..0.6]
muR = 0.5*((max(cIz*khc0JRA(T, suelo, 1), cz*khc0JRA(T, suelo, 2))*W/Pa)^2 + 1) // Ductilidad de respuesta por igual energía, sismo que gobierna (JRA V 6.4.6)
check muR <= muA // Ductilidad de respuesta ≤ ductilidad admisible μa (equivale a Pa ≥ cs·khc0·W sin el mínimo 0.4cz)
dR = cR*(muR - 1)*(1 - rpos)*dy -> mm // Desplazamiento residual δR = cR(μr − 1)(1 − r)δy (JRA V 6.4.6)
check dR <= Hp/100 // Desplazamiento residual ≤ h/100 (JRA V 6.4.6)
# Espectros de aceleración en el sitio (análisis dinámico, JRA V 4.2 y 4.3)
S1 = cz*cD*SJRA1(T, suelo) // Nivel 1 [gal]
SI = cIz*cD*SJRA2I(T, suelo) // Nivel 2 tipo I [gal]
SII = cz*cD*SJRA2II(T, suelo) // Nivel 2 tipo II [gal]`),
      { type: 'plot', expr: 'cz*cD*SJRA1(x, suelo); cIz*cD*SJRA2I(x, suelo); cz*cD*SJRA2II(x, suelo)', var: 'x', desde: '0.02', hasta: '4', puntos: '300', xlabel: 'Periodo T [s]', ylabel: 'S [gal]', leyenda: true, nombres: 'Nivel 1; Nivel 2 tipo I (subducción, 2012); Nivel 2 tipo II (cortical)', titulo: 'Espectros de aceleración JRA 2012 para el tipo de suelo del sitio' },
      { type: 'plot', expr: 'SJRA2II(x, 1); SJRA2II(x, 2); SJRA2II(x, 3)', var: 'x', desde: '0.02', hasta: '4', puntos: '300', xlabel: 'Periodo T [s]', ylabel: 'S_II0 [gal]', leyenda: true, nombres: 'Suelo tipo I; Suelo tipo II; Suelo tipo III', titulo: 'Espectro estándar nivel 2 tipo II según el tipo de suelo' },
      summary(),
    ],
  },
  // ------------------------------------------------------------------
  //  9) Espectro de la Notificación 1461 / cálculo de límites
  // ------------------------------------------------------------------
  {
    id: 'jp-bsl-n1461', pais: 'JP', cat: 'Sismo — Japón', icon: 'spectrum', settings: { sys: 'si' },
    validacion: {
      fuente: 'BSL — Notif. 1461 (espectro en roca de ingeniería) y Notif. 1457 (Gs) — valores de control; las funciones se validan con NILIM TN 1084 y denmoku 2024 (tests/japan.test.mjs)',
      nota: 'Los datos por defecto no reproducen un ejemplo publicado: los valores esperados son de control (calculados con la plantilla y comprobados a mano donde se indica) para detectar cambios. Los ejemplos publicados (NILIM TN 1084: S0 = 4.71 m/s², Gs = 2.025 para Ts = 1.09 s; denmoku 2024: Gs = 1.358/1.350/1.500) se comprueban en las pruebas del módulo con otros periodos.',
      valores: [
        { var: 'Sad', unidad: 'm/s^2', esperado: 2.4, tol: 0.002, desc: 'Control: Sa en el límite de daño' },
        { var: 'Qdem1', unidad: 'kN', esperado: 3480, tol: 0.002, desc: 'Control: demanda en el límite de daño' },
        { var: 'Sas', unidad: 'm/s^2', esperado: 5.9246, tol: 0.002, desc: 'Control: Sa en el límite de seguridad' },
        { var: 'Qdem2', unidad: 'kN', esperado: 8590.6, tol: 0.002, desc: 'Control: demanda en el límite de seguridad' },
        { var: 'thd', esperado: 0.0038462, tol: 0.002, desc: 'Control: deriva en el límite de daño' },
        { var: 'ths', esperado: 0.011111, tol: 0.002, desc: 'Control: deriva en el límite de seguridad' },
      ],
    },
    name: 'Espectro BSL de la roca de ingeniería (Notif. 1461 / cálculo de límites)',
    normas: 'Building Standard Law · Enforcement Order Art. 82-5 (cálculo de límites, genkai tairyoku keisan) · Notif. MOC 1457 (2000, mod. 2007) · Notif. MOC 1461 (2000)',
    desc: 'Espectro de aceleración en la roca de ingeniería para sismo raro y muy raro, amplificación simplificada del suelo Gs, reducción por amortiguamiento Fh y verificación de un sistema equivalente de 1 GDL.',
    titulo: 'Espectro de respuesta BSL y verificación por el método de cálculo de límites',
    blocks: [
      text(`# Generalidades
El **cálculo de límites de resistencia** (*genkai tairyoku keisan*, Order Art. 82-5) y el análisis dinámico de edificios altos (Notif. 1461) definen el sismo mediante un **espectro de aceleración en la roca de ingeniería** (Vs ≥ 400 m/s), con 5 % de amortiguamiento [m/s²]:
$$S_0(T) = \\begin{cases} 0.64 + 6T & T < 0.16 \\\\ 1.6 & 0.16 \\le T < 0.64 \\\\ 1.024/T & T \\ge 0.64 \\end{cases} \\quad \\text{(sismo raro)}$$
y 5 veces estos valores para el **sismo muy raro**. En superficie, para el límite de daño $S_a = Z\\,G_s\\,S_0$ y para el límite de seguridad $S_a = Z\\,G_s\\,F_h\\,S_0$, con $G_s$ la amplificación del suelo (método simplificado de la Notif. 1457 Art. 10: suelo tipo 1: 1.5 → 0.864/T → 1.35; tipos 2 y 3: 1.5 → 1.5T/0.64 → 2.025 o 2.7) y la reducción por amortiguamiento $F_h = 1.5/(1 + 10h)$.

Se verifica un edificio de 4 pisos idealizado como sistema equivalente de 1 GDL: en el **límite de daño** (sismo raro: fuerza ≤ resistencia de daño y deriva ≤ 1/200) y en el **límite de seguridad** (sismo muy raro: fuerza ≤ resistencia última y deriva de seguridad ≤ 1/75, Notif. 1457 Art. 6).`),
      calc(`# Datos
${ZONA}
Z = ZBSL(zona) // Coeficiente de zona (Notif. 1793)
M = 1450 tonne // Masa equivalente del sistema de 1 GDL [10..100000]
Td = 0.55 s // Periodo equivalente en el límite de daño [0.05..5]
Ts = 1.05 s // Periodo equivalente (secante) en el límite de seguridad [0.05..5]
hs = 0.15 // Amortiguamiento equivalente en el límite de seguridad (histerético + 5 %) [0.05..0.25]
# Límite de daño — sismo raro (Notif. 1457 Art. 9)
Sad = Z*GsN1457(Td, suelo)*S0N1461(Td, 1)*1 m/s^2 // Aceleración de respuesta Sa = Z·Gs·S0 (h = 5 %)
Qdem1 = M*Sad -> kN // Cortante basal demandado
Qd = 4200 kN // Resistencia en el límite de daño (primer elemento que alcanza el esfuerzo admisible de corto plazo) [100..1000000]
check Qdem1 <= Qd // Límite de daño: fuerza (Order Art. 82-5, inc. 3)
thd = 1/260 // Deriva máxima de entrepiso en el límite de daño (análisis incremental)
check thd <= 1/200 // Límite de daño: deriva ≤ 1/200 (Order Art. 82-5, inc. 3)
# Límite de seguridad — sismo muy raro (Notif. 1457 Art. 7)
Sas = Z*GsN1457(Ts, suelo)*S0N1461(Ts, 2)*FhBSL(hs)*1 m/s^2 // Aceleración de respuesta reducida
Qdem2 = M*Sas -> kN // Cortante basal demandado
Qs = 9800 kN // Resistencia en el límite de seguridad (curva de capacidad) [100..1000000]
check Qdem2 <= Qs // Límite de seguridad: fuerza (Order Art. 82-5, inc. 5)
ths = 1/90 // Deriva máxima de entrepiso en el límite de seguridad (análisis incremental)
check ths <= 1/75 // Límite de seguridad: deriva ≤ 1/75 (Notif. 1457 Art. 6, mod. 2007)`),
      { type: 'plot', expr: 'S0N1461(x, 1); S0N1461(x, 2); Z*GsN1457(x, suelo)*S0N1461(x, 2); Z*GsN1457(x, suelo)*S0N1461(x, 2)*FhBSL(hs)', var: 'x', desde: '0.02', hasta: '3', puntos: '300', xlabel: 'Periodo T [s]', ylabel: 'Sa [m/s²]', leyenda: true, nombres: 'Roca de ingeniería, sismo raro; Roca de ingeniería, sismo muy raro; Superficie Z·Gs·S0 (muy raro, h = 5 %); Con reducción Fh (h del proyecto)', titulo: 'Espectros de aceleración de la Notif. 1461 / 1457' },
      summary(),
    ],
  },
];
