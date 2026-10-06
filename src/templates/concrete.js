// =====================================================================
//  Plantillas — módulo «concrete» (NTE E.060-2009 · ACI 318-19)
//  Unidades técnicas (kgf/cm², tonf, cm) en las plantillas peruanas.
//  Ejemplos validados en tests/concrete.test.mjs · fuentes en docs/referencias/concrete.md
// =====================================================================
import { calc, text, summary } from './_h.js';

const E060 = 'RNE — NTE E.060 Concreto Armado (2009)';
const CAT = 'Concreto armado';

// ---------------------------------------------------------------------
// 1) PLACA (MURO ESTRUCTURAL) — E.060 Cap. 11.10 y 21.9
// ---------------------------------------------------------------------
const placa = {
  id: 'co-placa', pais: 'PE', cat: CAT, icon: 'wall', normas: E060 + ' — Art. 11.10 y 21.9 · NTE E.030',
  validacion: {
    fuente: 'NTE E.060-2009 Art. 11.10 y 21.9 — valores de control',
    nota: 'Los datos por defecto no reproducen un ejemplo publicado: los valores esperados son de control (calculados con la plantilla y comprobados a mano donde se indica) para detectar cambios. αc = 0.53 (hm/lm ≥ 2); Vn = Acw(αc√f\'c + ρh·fy) se comprueba a mano en las pruebas. Los algoritmos se validan con ejemplos publicados de StructurePoint (spColumn/spBeam) en tests/concrete.test.mjs.',
    valores: [
      { var: 'alphac', esperado: 0.53, tol: 0.001, desc: 'E.060 11.10.5: αc = 0.53 para hm/lm ≥ 2' },
      { var: 'Vu', unidad: 'tonf', esperado: 98.298, tol: 0.002, desc: 'Control: Vu = Vua·Mn/Mua' },
      { var: 'Vn', unidad: 'tonf', esperado: 171.57, tol: 0.002, desc: 'Control: Vn = Acw(αc√f\'c + ρh fy)' },
      { var: 'phiVn', unidad: 'tonf', esperado: 145.84, tol: 0.002, desc: 'Control: φVn' },
      { var: 'clim', unidad: 'cm', esperado: 76.563, tol: 0.002, desc: 'Control: c límite para elementos de borde' },
      { var: 'DCpmg', esperado: 0.98881, tol: 0.002, desc: 'Control: D/C del diagrama P–M' },
    ],
  },
  name: 'Placa (muro estructural) — flexocompresión, cortante y bordes',
  desc: 'Diagrama P–M por compatibilidad (fibras) con núcleos de borde y refuerzo distribuido, cortante amplificado Vu ≥ Vua·Mn/Mua, cuantías, elementos de borde por desplazamientos y esfuerzos, confinamiento y corte por fricción.',
  titulo: 'Diseño de placa de concreto armado (muro estructural)',
  blocks: [
    text(`# Generalidades
La presente memoria desarrolla el diseño del primer piso (sección crítica en la base) de una **placa de concreto armado** que forma parte del sistema sismorresistente de muros estructurales de una edificación de 7 pisos, de acuerdo con la **NTE E.060 Concreto Armado** (Cap. 10, 11.10 y 21.9) y la **NTE E.030 Diseño Sismorresistente**.

Se verifica: (1) flexocompresión mediante el diagrama de interacción obtenido por compatibilidad de deformaciones con todo el refuerzo de núcleos y alma (E.060 21.9.6.1), (2) la resistencia a cortante con la fuerza amplificada por capacidad (E.060 21.9.5.3), (3) las cuantías y espaciamientos mínimos (E.060 11.10 y 21.9.4), (4) la necesidad de elementos de borde confinados (E.060 21.9.7.4 y 21.9.7.5) y su detallado, y (5) el corte por fricción en la junta de construcción (E.060 21.9.8).

**Convención:** la placa se orienta en la dirección X (sismo X–X); el momento positivo comprime el extremo derecho.`),
    calc(`# Datos
## Materiales
fc = 210 kgf/cm^2 // Resistencia del concreto (E.060 21.3.2.1: f'c ≥ 21 MPa) [210 kgf/cm^2|280 kgf/cm^2|350 kgf/cm^2] [175..420]
fy = 4200 kgf/cm^2 // Fluencia del acero ASTM A615 Gr. 60 (E.060 21.3.3) [2800..5000]
## Geometría
lm = 350 cm // Longitud de la placa en planta [100..1500]
tw = 25 cm // Espesor del alma [20 cm|25 cm|30 cm] [15..60]
lbe = 60 cm // Longitud de cada núcleo de borde [20..150]
hm = 21 m // Altura total de la placa [3..150]
npis = 7 // Número de pisos [1..50]
hlib = 2.70 m // Altura libre entre losas (apoyo lateral) [2.2..6.0]
recl = 2.5 cm // Recubrimiento libre en los elementos de borde (E.060 21.9.7.3: ≥ 25 mm) [2..7.5]
## Refuerzo
barb = 6 // Barra de los núcleos [5 : 5/8"|6 : 3/4"|8 : 1"]
nbe = 6 // Barras por núcleo (2 filas) [4..20]
barw = 3 // Barra del refuerzo distribuido [3 : 3/8"|4 : 1/2"]
este = 3 // Estribo de confinamiento de los núcleos [3 : 3/8"|4 : 1/2"]
sv = 20 cm // Espaciamiento del refuerzo vertical del alma (dos capas) [10..45]
sh = 20 cm // Espaciamiento del refuerzo horizontal (dos capas) [10..45]
## Fuerzas del análisis (base del muro, E.060 9.2.3)
PD = 190 tonf // Carga muerta de servicio [10..2000]
Pu1 = 270 tonf // 1.25(CM+CV) + CS [0..3000]
Mua1 = 480 tonf*m // Momento con 1.25(CM+CV) ± CS [0..5000]
Pu2 = 170 tonf // 0.9 CM ± CS [0..3000]
Mua2 = 440 tonf*m // Momento con 0.9 CM ± CS [0..5000]
Pu3 = 330 tonf // 1.4 CM + 1.7 CV [0..3000]
Mu3 = 25 tonf*m // Momento de gravedad [0..1000]
Vua = 72 tonf // Cortante del análisis con 1.25(CM+CV) + CS [0..500]
R = 6 // Coeficiente de reducción sísmica empleado (E.030, muros estructurales) [3..8]
du = 16 cm // Desplazamiento inelástico en el nivel superior (E.030 Art. 5.1: 0.75·R·Δelástico) [0..100]
## Comprobaciones geométricas (E.060 21.9.3)
check tw >= max(hlib/25, 15 cm) // Espesor mínimo del alma (E.060 21.9.3.2)
Acw = lm*tw // Área de corte del alma
Ag = lm*tw // Área bruta
rb = recl + db(este) + db(barb)/2 // Distancia del borde al centro de las barras
xb = lm - lbe + rb // Primera barra del núcleo derecho`),
    text(`## Sección transversal y diagrama de interacción
El diagrama se calcula por compatibilidad de deformaciones ($\\varepsilon_{cu} = 0.003$, bloque rectangular equivalente con $\\beta_1$, E.060 10.2), integrando el concreto por fibras e incluyendo **todas** las barras de los núcleos y del alma (E.060 21.9.6.1). El factor $\\phi$ varía de 0.70 a 0.90 según E.060 9.3.2.2 y $\\phi P_{n,max} = 0.80\\,\\phi P_0$ (E.060 10.3.6.2).`),
    { type: 'pmgen', geom: '0 0 lm tw', barras: 'R rb rb lbe-rb tw-rb 3 2 barb\nR xb rb lm-rb tw-rb 3 2 barb\nM lbe+sv rb lm-lbe-sv rb sv barw\nM lbe+sv tw-rb lm-lbe-sv tw-rb sv barw', nucleos: '0 0 lbe tw // núcleo\nlm-lbe 0 lbe tw // núcleo', fc: 'fc', fy: 'fy', norma: 'E060', dir: 'X', demandas: 'Pu1, Mua1 // 1.25(CM+CV)+CS\nPu1, -Mua1 // 1.25(CM+CV)−CS\nPu2, Mua2 // 0.9CM+CS\nPu2, -Mua2 // 0.9CM−CS\nPu3, Mu3 // 1.4CM+1.7CV', titulo: 'Placa {lm} × {tw}: sección y diagrama de interacción (dirección X)' },
    calc(`## Verificación de flexocompresión
check DCpmg <= 1.0 // Todas las combinaciones dentro del diagrama φPn–φMn (E.060 21.9.6.1)
rhoBE = nbe*Ab(barb)/(lbe*tw) // Cuantía de los núcleos
check rhoBE <= 0.06 // Cuantía máxima en núcleos (E.060 10.9.1)
Sm = tw*lm^2/6 // Módulo de sección bruta
fr = 2*sqrtfc(fc) // Módulo de rotura (E.060 9.6.2.3, ec. 9-12 MKS)
Mcr = (fr + Pu2/Ag)*Sm -> tonf*m // Momento de agrietamiento con la carga axial mínima (E.060 21.9.6.5)
check phiMn_X(Pu2) >= Mcr // Resistencia a flexión ≥ momento de agrietamiento (E.060 21.9.6.5)`),
    calc(`# Diseño por cortante (E.060 21.9.5 y 11.10)
## Cortante de diseño por capacidad (E.060 21.9.5.3)
Mn1 = Mn_X(Pu1) // Momento nominal asociado a Pu (aceros realmente colocados)
fa = min(max(Mn1/max(Mua1, 0.001 tonf*m), 1), R) // Factor de amplificación Mn/Mua ≤ R (E.060 21.9.5.3)
Vu = fa*Vua // Cortante de diseño (ec. 21-5)
hcrit = max(lm, Mua1/(4*max(Vua, 0.001 tonf)), 2*hm/npis) -> m // Altura desde la base en la que rige la amplificación: lm, Mu/4Vu o dos primeros pisos (E.060 21.9.5.3)
## Resistencia nominal
rm = hm/lm // Relación de aspecto del muro
alphac = si(rm <= 1.5, 0.80, si(rm >= 2.0, 0.53, 0.80 - 0.54*(rm - 1.5))) // Coeficiente αc (E.060 11.10.5, Anexo II)
Vc = alphac*sqrtfc(fc)*Acw -> tonf // Aporte del concreto (ec. 11-30)
rhoh = 2*Ab(barw)/(tw*sh) // Cuantía horizontal colocada (dos capas)
Vs = Acw*rhoh*fy -> tonf // Aporte del refuerzo horizontal (ec. 11-31)
Vnmax = 2.6*sqrtfc(fc)*Acw -> tonf // Límite (E.060 11.10.4, Anexo II)
Vn = min(Vc + Vs, Vnmax) // Resistencia nominal
phiv = 0.85 // Factor de reducción por cortante (E.060 9.3.2.3) [0.75..0.85]
phiVn = phiv*Vn // Resistencia de diseño
check Vu <= phiVn // Resistencia a cortante en el plano del muro (E.060 11.10)
## Cuantías y espaciamientos
rhoh_req = max((Vu/phiv - Vc)/(Acw*fy), 0.0025) // Cuantía horizontal requerida (E.060 11.10.10.2)
check rhoh >= rhoh_req // Cuantía horizontal
rhov = 2*Ab(barw)/(tw*sv) // Cuantía vertical del alma colocada
rhov_min = max(min(max(0.0025 + 0.5*(2.5 - rm)*(rhoh - 0.0025), 0.0025), rhoh), si(rm <= 2, rhoh, 0)) // ec. 11-32; si hm/lm ≤ 2, ρv ≥ ρh (E.060 21.9.5.2)
check rhov >= rhov_min // Cuantía vertical mínima (E.060 11.10.10.3 y 21.9.5.2)
check max(sv, sh) <= min(3*tw, 40 cm) // Espaciamiento máximo 3t y 400 mm (E.060 11.10.10.2 y 11.10.10.4)
dos_capas = si(tw >= 20 cm or Vu > 0.53*sqrtfc(fc)*Acw, 1, 0) // ¿Se requieren dos capas? (E.060 21.9.4.3)
"Se requieren dos capas de refuerzo (1 = sí): **{dos_capas}** — se colocan dos capas de #{barw} @ {sv} (vertical) y #{barw} @ {sh} (horizontal).`),
    calc(`# Elementos de borde (E.060 21.9.7)
## Método de desplazamientos (E.060 21.9.7.4) — muro continuo con una sección crítica
dr = max(du/hm, 0.005) // δu/hm (no menor que 0.005)
clim = lm/(600*dr) -> cm // Profundidad límite del eje neutro (ec. 21-6)
cmax = c_X(Pu1) // Mayor profundidad del eje neutro para Pu y Mn (compresión en cada extremo)
req_be = si(cmax >= clim, 1, 0) // ¿Se requiere confinar los bordes? (1 = sí)
## Método de esfuerzos (E.060 21.9.7.5) — referencial
Ig = tw*lm^3/12 // Inercia bruta
sigma = Pu1/Ag + Mua1*(lm/2)/Ig -> kgf/cm^2 // Esfuerzo máximo en la fibra extrema (modelo elástico)
"Esfuerzo de compresión máximo: {sigma} frente a 0.2 f'c = {0.2*fc}. Para muros continuos rige el método de desplazamientos (21.9.7.4); se confinan los bordes cuando c ≥ c_lím: **requiere = {req_be}**.
## Dimensiones del elemento de borde (E.060 21.9.7.6)
lbe_req = si(req_be == 1, max(cmax - 0.1*lm, cmax/2), 0 cm) -> cm // Extensión horizontal mínima (21.9.7.6 a), solo si se requiere confinar
check lbe >= lbe_req // Longitud de núcleo suficiente (21.9.7.6 a)
check tw >= 15 cm // Espesor mínimo del elemento de borde (E.060 21.9.7.2)
hbe = max(lm, Mua1/(4*max(Vua, 0.001 tonf))) -> m // Altura mínima del confinamiento desde la base (21.9.7.4 b)
## Refuerzo transversal de confinamiento (E.060 21.9.7.6 c–e)
"La E.060 (21.9.7.6 c) exige que los estribos de borde cumplan 21.6.4.1 c y 21.6.4.3 (estribos cerrados y grapas, hx ≤ 350 mm), los diámetros de (d) y el espaciamiento de (e); no exige las ecuaciones de cuantía (21-3)/(21-4). Como buena práctica se verifica además el área mínima $A_{sh} \ge 0.09\,s\,b_c f'_c/f_{yt}$ en las dos direcciones del núcleo, con $b_c$ medido centro a centro de estribos (definición de E.060 21.6.4.1 b).
check db(este) >= si(barb <= 5, 0.8 cm, si(barb <= 8, db(3), db(4))) - 0.01 cm // Diámetro mínimo del estribo (21.9.7.6 d)
smax_be = min(10*db(barb), min(lbe, tw), 25 cm) // Espaciamiento máximo (21.9.7.6 e)
bc = tw - 2*recl - db(este) // Núcleo en el espesor (c. a c. de estribos, normal a las ramas largas)
bc2 = lbe - 2*recl - db(este) // Núcleo a lo largo del muro (c. a c. de las ramas extremas)
Ash = 2*Ab(este) // Dirección del espesor: dos ramas largas del estribo
Ash2 = 3*Ab(este) // Dirección longitudinal: dos ramas cortas + una grapa central
sbe = rounddown(max(min(smax_be, Ash/(0.09*bc*fc/fy), Ash2/(0.09*bc2*fc/fy)), 2.5 cm), 2.5 cm) // Espaciamiento adoptado
Ash_req = 0.09*sbe*bc*fc/fy // Ash mínimo en el espesor (ec. 21-4; ACI 318-19 Tabla 18.10.6.4 f, referencial)
check Ash >= Ash_req // Área de estribos de confinamiento — dirección del espesor (referencial)
check Ash2 >= 0.09*sbe*bc2*fc/fy // Área de estribos de confinamiento — dirección longitudinal (referencial)
hx = (lbe - 2*rb)/2 // Separación entre ramas o grapas (una grapa central)
check hx <= 35 cm // Distancia entre ramas ≤ 350 mm (E.060 21.6.4.3)
"Núcleos de borde: {nbe} #{barb} con estribos #{este} @ {sbe} en una altura de {hbe} desde la base (incluye una grapa central). Fuera de esa altura: estribos @ 25 cm (21.9.7.7).
# Corte por fricción en la junta de construcción (E.060 21.9.8)
mu = 1.0 // Coeficiente de fricción: superficie intencionalmente rugosa (E.060 11.7.4.3) [1.0|0.6] [0.6..1.4]
Nu = 0.9*PD // Fuerza normal = 0.9 veces la carga muerta
Avf = Ast // Todo el refuerzo vertical que cruza la junta
Vnf = min(mu*(Nu + Avf*fy), 0.2*fc*Ag, 55 kgf/cm^2*Ag) -> tonf // ec. 21-7 con el límite de E.060 11.7.5
phiVnf = phiv*Vnf // Resistencia de diseño por fricción
check Vu <= phiVnf // Resistencia por fricción en la junta`),
    summary(),
  ],
};

// ---------------------------------------------------------------------
// 2) COLUMNA ESBELTA — E.060 10.10 a 10.13
// ---------------------------------------------------------------------
const colEsbelta = {
  id: 'co-colesbelta', pais: 'PE', cat: CAT, icon: 'column', normas: E060 + ' — Art. 10.10 a 10.13',
  validacion: {
    fuente: 'NTE E.060-2009 Art. 10.10 a 10.13 — valores de control',
    nota: 'Los datos por defecto no reproducen un ejemplo publicado: los valores esperados son de control (calculados con la plantilla y comprobados a mano donde se indica) para detectar cambios. Ec = 15000√280; Cm = 0.6 + 0.4·9/14 = 0.857; δns = Cm/(1 − Pu/0.75Pc) y Q = ΣPu·Δo/(Vus·he) se comprueban a mano en las pruebas. Los algoritmos se validan con ejemplos publicados de StructurePoint (spColumn/spBeam) en tests/concrete.test.mjs. Segunda opinión (tercera tanda B): se agregó la verificación biaxial con δns·M2x y M2y simultáneos (E.060 10.18); con 12 Ø 3/4" daba D/C = 1.12, por lo que la barra por defecto pasó a 1" (DCpmg_y 0.825 → 0.640).',
    valores: [
      { var: 'Ec', unidad: 'kgf/cm^2', esperado: 251000, tol: 0.002, desc: 'Control: Ec = 15000√f\'c' },
      { var: 'Cm', esperado: 0.85714, tol: 0.001, desc: 'Control: Cm = 0.6 + 0.4·M1/M2' },
      { var: 'Pc_x', unidad: 'tonf', esperado: 1199.7, tol: 0.002, desc: 'Control: carga crítica de Euler' },
      { var: 'dns', esperado: 1.0866, tol: 0.002, desc: 'Control: δns' },
      { var: 'Q', esperado: 0.069643, tol: 0.002, desc: 'Control: índice de estabilidad' },
      { var: 'ds', esperado: 1.0749, tol: 0.002, desc: 'Control: δs' },
      { var: 'DCpmg_y', esperado: 0.64034, tol: 0.002, desc: 'Control: D/C en Y (12 Ø 1")' },
        { var: 'DCpmg_xy', esperado: 0.90437, tol: 0.003, desc: 'Control: D/C biaxial con δns·M2x y M2y simultáneos' },
    ],
  },
  name: 'Columna esbelta — magnificación de momentos',
  desc: 'Efectos de esbeltez: índice de estabilidad Q, factores ψ y k (nomogramas), δns en dirección arriostrada, δs en dirección no arriostrada, M2,min, y verificación con diagramas P–M en ambas direcciones.',
  titulo: 'Diseño de columna esbelta — método de magnificación de momentos',
  blocks: [
    text(`# Generalidades
Se diseña una columna rectangular de un pórtico de concreto armado considerando los efectos de esbeltez mediante el **método de magnificación de momentos** de la NTE E.060 (Art. 10.10 a 10.13). En la dirección **X** el entrepiso se encuentra arriostrado por placas (índice de estabilidad $Q \\le 0.06$, E.060 10.11.4.2) y se aplica 10.12; en la dirección **Y** el entrepiso es no arriostrado y se aplica 10.13.

Las rigideces se toman de E.060 10.11.1 (vigas $0.35I_g$, columnas $0.70I_g$) y el factor de longitud efectiva $k$ se obtiene de las ecuaciones de los nomogramas de Jackson–Julian (ACI R6.2.5), las que reproducen numéricamente los gráficos usuales.`),
    calc(`# Datos
fc = 280 kgf/cm^2 // Concreto [210 kgf/cm^2|280 kgf/cm^2|350 kgf/cm^2] [175..420]
fy = 4200 kgf/cm^2 // Acero [2800..5000]
b = 45 cm // Dimensión en X [20 cm..120 cm]
h = 45 cm // Dimensión en Y [20..150]
lu = 4.20 m // Longitud no arriostrada (libre entre vigas, E.060 10.11.3.1) [1..10]
hp = 4.80 m // Altura de entrepiso (piso a piso) [2.4..6.0]
bv = 30 cm // Ancho de vigas [20..80]
hv = 60 cm // Peralte de vigas [30..120]
Lv = 6.0 m // Luz de las vigas que llegan al nudo (ambos lados) [2..15]
bar = 8 // Barra longitudinal [6 : 3/4"|8 : 1"]
## Cargas amplificadas en la columna
Pu = 190 tonf // Carga axial amplificada [0..2000]
betad = 0.60 // Carga axial sostenida / carga axial total (E.060 10.11.1) [0..1]
M1x = 9 tonf*m // Momento menor en X [0..300]
M2x = 14 tonf*m // Momento mayor en X [0..300]
sgn = 1 // Signo de M1/M2: +1 curvatura simple, −1 curvatura doble [1|-1]
M2nsy = 6 tonf*m // Momento mayor en Y por cargas que no producen desplazamiento lateral [0..300]
M2sy = 16 tonf*m // Momento mayor en Y por cargas que producen desplazamiento lateral (sismo) [0..300]
## Datos del entrepiso (para Q)
SPu = 2600 tonf // Suma de cargas verticales amplificadas del entrepiso, combinación con sismo (E.060 10.11.4.2) [100..50000]
SPug = 2900 tonf // Suma de cargas verticales del entrepiso con 1.4CM + 1.7CV (E.060 10.13.6 b) [100..50000]
Vus = 210 tonf // Cortante sísmico amplificado del entrepiso [10..5000]
R = 8 // Coeficiente de reducción sísmica (dirección Y) [3..8]
D0e = 0.45 cm // Deriva elástica del entrepiso por el sismo reducido [0..5]
Q_x = 0.04 // Índice de estabilidad del entrepiso en X (placas), obtenido del análisis [0..0.25]
## Propiedades
Ec = 15000*sqrtfc(fc) // Módulo de elasticidad (E.060 8.5, Anexo II)
Ag = b*h // Área bruta
Ig = b*h^3/12 // Inercia bruta
r = 0.3*h // Radio de giro (E.060 10.11.2)`),
    calc(`# Dirección X — entrepiso sin desplazamiento lateral (E.060 10.12)
check Q_x <= 0.06 // Entrepiso arriostrado: se aplica 10.12 (E.060 10.11.4.2)
kx = 1.0 // Factor de longitud efectiva (E.060 10.12.1, conservador) [0.5..2.0]
esb_x = kx*lu/r // Esbeltez
lim_x = min(34 - 12*sgn*M1x/max(M2x, 0.001 tonf*m), 40) // Límite para despreciar la esbeltez (ec. 10-7)
esbelta_x = si(esb_x > lim_x, 1, 0) // 1 = deben considerarse los efectos de esbeltez (E.060 10.12.2)
EI = 0.4*Ec*Ig/(1 + betad) -> tonf*m^2 // Rigidez efectiva (ec. 10-12)
Pc_x = pi^2*EI/(kx*lu)^2 -> tonf // Carga crítica de pandeo (ec. 10-10)
check Pu < 0.75*Pc_x // Estabilidad del elemento (denominador de la ec. 10-9 positivo)
M2min = Pu*(1.5 cm + 0.03*h) -> tonf*m // Momento mínimo (ec. 10-14, 15 mm + 0.03h)
Cm = si(M2min > M2x, 1.0, max(0.6 + 0.4*sgn*M1x/max(M2x, 0.001 tonf*m), 0.4)) // Factor de corrección (ec. 10-13; Cm = 1 si rige M2,min, 10.12.3.2)
dns = si(esbelta_x == 1, max(Cm/(1 - Pu/(0.75*Pc_x)), 1.0), 1.0) // Magnificador sin desplazamiento (ec. 10-9)
Mcx = dns*max(M2x, M2min) -> tonf*m // Momento magnificado de diseño (ec. 10-8)
"Esbeltez k·lu/r = {esb_x} frente al límite {lim_x} de la ec. 10-7 → efectos de esbeltez considerados (1 = sí): **{esbelta_x}**; δns = {dns}.`),
    calc(`# Dirección Y — entrepiso con desplazamiento lateral (E.060 10.13)
## Índice de estabilidad del entrepiso (E.060 10.11.4.2)
D0 = 0.75*R*D0e // Desplazamiento relativo de primer orden (Δo × 0.75R)
Q = SPu*D0/(max(Vus, 0.001 tonf)*hp) // Índice de estabilidad (ec. 10-6)
"Q = {Q} > 0.06: el entrepiso se considera **con desplazamiento lateral** y se aplica 10.13 (si Q ≤ 0.06 el procedimiento de 10.13 resulta conservador: δs ≈ 1).
## Factor de longitud efectiva (E.060 10.13.1)
Icol = 0.70*Ig // Inercia de columnas (E.060 10.11.1)
Iv = 0.35*bv*hv^3/12 // Inercia de vigas (E.060 10.11.1)
psiA = 2*(Icol/hp)/(2*Iv/Lv) // Nudo superior: dos columnas y dos vigas
psiB = 1.0 // Nudo inferior: base semiempotrada (valor práctico) [0..10]
ky = kSway(psiA, psiB) // k para pórtico no arriostrado (nomograma, ≥ 1.0)
esb_y = ky*lu/r // Esbeltez en Y
esbelta_y = si(esb_y >= 22, 1, 0) // 1 = deben considerarse los efectos de esbeltez (E.060 10.13.2)
check esb_y <= 100 // Esbeltez máxima (E.060 10.11.5)
## Magnificación por desplazamiento lateral (E.060 10.13.4.2)
ds = si(esbelta_y == 1, si(Q < 0.99, 1/(1 - Q), 100), 1.0) // Magnificador δs (ec. 10-17)
check ds <= 1.5 // Límite para usar 10.13.4.2 (si δs > 1.5 se requiere análisis de segundo orden)
M2y0 = M2nsy + ds*M2sy -> tonf*m // Momento mayor magnificado (ec. 10-16)
## Magnificación adicional por curvatura del elemento (E.060 10.13.5)
lim_y = 35/sqrt(max(Pu, 0.001 tonf)/(fc*Ag)) // Límite de la ec. (10-19)
curv_y = si(lu/r > lim_y, 1, 0) // 1 = el elemento se diseña además con 10.12.3 (k = 1)
Pc_y1 = pi^2*EI/lu^2 -> tonf // Carga crítica con k = 1 (10.13.5)
dns_y = si(curv_y == 1, max(1/(1 - Pu/(0.75*Pc_y1)), 1.0), 1.0) // δns con Cm = 1.0 (conservador)
M2y = dns_y*max(M2y0, M2min) -> tonf*m // Momento de diseño en Y
"Esbeltez lu/r = {lu/r} frente a 35/√(Pu/f'cAg) = {lim_y} → magnificación por curvatura (1 = sí): **{curv_y}**, δns = {dns_y}.
## Estabilidad ante cargas de gravedad (E.060 10.13.6 b)
Qg = SPug*D0*(1 + betad)/(max(Vus, 0.001 tonf)*hp) // Q con ΣPu de 1.4CM + 1.7CV y rigideces divididas entre (1 + βd) (10.11.1)
check Qg <= 0.60 // Estabilidad ante cargas de gravedad (E.060 10.13.6 b)`),
    text(`# Verificación de la sección
Se verifica la sección con los momentos magnificados en cada dirección, por separado (E.060 10.11.6). El refuerzo es de 12 barras distribuidas en el perímetro.`),
    { type: 'pmgen', geom: '0 0 b h', barras: 'R 6 6 b-6 h-6 4 4 bar', fc: 'fc', fy: 'fy', norma: 'E060', dir: 'X', sufijo: 'x', demandas: 'Pu, Mcx // δns·M2 (X)', titulo: 'Diagrama de interacción en X (pórtico arriostrado)' },
    { type: 'pmgen', geom: '0 0 b h', barras: 'R 6 6 b-6 h-6 4 4 bar', fc: 'fc', fy: 'fy', norma: 'E060', dir: 'Y', sufijo: 'y', demandas: 'Pu, M2y // M2ns + δs·M2s (Y)', titulo: 'Diagrama de interacción en Y (pórtico no arriostrado)' },
    text(`## Flexión biaxial (E.060 10.18)
En la combinación con sismo en Y la columna conserva el momento de gravedad en X. Se verifica la acción simultánea de $\\delta_{ns}M_{2x}$ y del momento magnificado en Y con el contorno de carga por compatibilidad de deformaciones, que es el método de referencia de 10.18. Se toma el momento en X completo, lo que es conservador: en 1.25(CM + CV) ± CS el momento de gravedad es del orden de 1.25/1.5 del de 1.4CM + 1.7CV.`),
    { type: 'pmgen', geom: '0 0 b h', barras: 'R 6 6 b-6 h-6 4 4 bar', fc: 'fc', fy: 'fy', norma: 'E060', dir: 'XY', sufijo: 'xy', demandas: 'Pu, Mcx, M2y // Biaxial', titulo: 'Contorno de carga biaxial con los momentos magnificados en X e Y' },
    calc(`## Resumen de la sección
check rhog_x >= 0.01 // Cuantía mínima (E.060 10.9.1)
check rhog_x <= 0.06 // Cuantía máxima (E.060 10.9.1)
check DCpmg_x <= 1 // Flexocompresión en X
check DCpmg_y <= 1 // Flexocompresión en Y
check DCpmg_xy <= 1 // Flexocompresión biaxial (E.060 10.18)`),
    summary(),
  ],
};

// ---------------------------------------------------------------------
// 3) COLUMNA CON FLEXIÓN BIAXIAL — E.060 10.18 (Bresler) + compatibilidad
// ---------------------------------------------------------------------
const colBiaxial = {
  id: 'co-biaxial', pais: 'PE', cat: CAT, icon: 'column', normas: E060 + ' — Art. 10.3 y 10.18',
  validacion: {
    fuente: 'NTE E.060-2009 Art. 10.3 y 10.18 (Bresler) — valores de control',
    nota: 'Los datos por defecto no reproducen un ejemplo publicado: los valores esperados son de control (calculados con la plantilla y comprobados a mano donde se indica) para detectar cambios. Se cumple 1/Pn = 1/Pnx + 1/Pny − 1/Pon (comprobado en las pruebas). Los algoritmos se validan con ejemplos publicados de StructurePoint (spColumn/spBeam) en tests/concrete.test.mjs.',
    valores: [
      { var: 'Pon', unidad: 'tonf', esperado: 956.47, tol: 0.002, desc: 'Control: P0' },
      { var: 'Pnx', unidad: 'tonf', esperado: 586.28, tol: 0.002, desc: 'Control: Pnx (ey = 0)' },
      { var: 'Pny', unidad: 'tonf', esperado: 670.34, tol: 0.002, desc: 'Control: Pny (ex = 0)' },
      { var: 'Pn', unidad: 'tonf', esperado: 464.69, tol: 0.002, desc: 'Control: Pn de Bresler' },
      { var: 'DCb', esperado: 0.92226, tol: 0.002, desc: 'Control: D/C de Bresler' },
      { var: 'DCpmg', esperado: 0.85029, tol: 0.002, desc: 'Control: D/C por compatibilidad biaxial' },
    ],
  },
  name: 'Columna con flexión biaxial (Bresler y compatibilidad)',
  desc: 'Método de la carga recíproca de Bresler (ec. 10-22) con Pnx y Pny de los diagramas uniaxiales, contraste con el contorno de carga exacto por fibras y verificación por la ec. 10-23 para carga axial baja.',
  titulo: 'Diseño de columna en flexión biaxial',
  blocks: [
    text(`# Generalidades
Una columna rectangular está sometida a carga axial y momentos en sus dos ejes principales. La NTE E.060 10.18 permite usar la **ecuación de la carga recíproca de Bresler** (ec. 10-22) para secciones rectangulares con refuerzo simétrico cuando $P_u \\ge 0.1\\,\\phi P_{on}$:
$$\\frac{1}{P_n} = \\frac{1}{P_{nx}} + \\frac{1}{P_{ny}} - \\frac{1}{P_{on}}$$
donde $P_{nx}$ es la resistencia nominal con excentricidad solo en X ($e_y = 0$) y $P_{ny}$ con excentricidad solo en Y. El resultado se contrasta con el **cálculo exacto por compatibilidad de deformaciones** (E.060 10.2 y 10.3) con eje neutro inclinado, que proporciona el contorno de carga $\\phi M_{nx}$–$\\phi M_{ny}$ al nivel $P_u$.`),
    calc(`# Datos
fc = 280 kgf/cm^2 // Concreto [210 kgf/cm^2|280 kgf/cm^2|350 kgf/cm^2] [175..420]
fy = 4200 kgf/cm^2 // Acero [2800..5000]
b = 50 cm // Dimensión en X [20 cm..120 cm]
h = 60 cm // Dimensión en Y [20..150]
rec = 6 cm // Recubrimiento al centro de barras [2..10]
bar = 8 // Barra longitudinal [6 : 3/4"|8 : 1"|9 : 1 1/8"]
Pu = 300 tonf // Carga axial amplificada [0..2000]
Mux = 30 tonf*m // Momento que comprime el extremo +X (excentricidad ex) [0..500]
Muy = 27 tonf*m // Momento que comprime el extremo +Y (excentricidad ey) [0..500]
Ag = b*h // Área bruta
ex = Mux/max(Pu, 0.001 tonf) -> cm // Excentricidad en X
ey = Muy/max(Pu, 0.001 tonf) -> cm // Excentricidad en Y`),
    { type: 'pmgen', geom: '0 0 b h', barras: 'R rec rec b-rec h-rec 4 4 bar', fc: 'fc', fy: 'fy', norma: 'E060', dir: 'XY', demandas: 'Pu, Mux, Muy // Combinación crítica', titulo: 'Diagramas uniaxiales y contorno de carga biaxial (compatibilidad de deformaciones)' },
    calc(`# Método de la carga recíproca de Bresler (E.060 10.18)
Pnx = Pn_X(ex) // Resistencia nominal con ex (ey = 0), del diagrama en X
Pny = Pn_Y(ey) // Resistencia nominal con ey (ex = 0), del diagrama en Y
Pon = Pn0 // Resistencia nominal a carga axial pura: 0.85 f'c (Ag − Ast) + fy Ast
phi = 0.70 // Elementos con estribos en compresión (E.060 9.3.2.2) [0.65..0.90]
bres = si(Pu >= 0.1*phi*Pon, 1, 0) // 1 = rige la ec. 10-22 (Pu ≥ 0.1 φ Pon); 0 = carga axial baja, ec. 10-23
Pn = 1/(1/Pnx + 1/Pny - 1/Pon) // Resistencia nominal biaxial (ec. 10-22)
phiPn = min(phi*Pn, phiPnmax) // Resistencia de diseño, limitada por 10.3.6.2
DC1023 = abs(Mux)/max(phiMn_X(Pu), 0.001 tonf*m) + abs(Muy)/max(phiMn_Y(Pu), 0.001 tonf*m) // Ec. 10-23 (carga axial baja): Mux/φMnx + Muy/φMny ≤ 1
DCb = si(bres == 1, Pu/phiPn, DC1023) // Relación demanda/capacidad por la ecuación aproximada aplicable
check DCb <= 1 // Resistencia biaxial — Bresler (10-22) o ec. 10-23 según Pu
## Contraste con el cálculo exacto
"Relación D/C por la ecuación aproximada (10-22 si bres = 1, 10-23 si bres = 0; bres = {bres}): **{DCb}**; por compatibilidad de deformaciones (contorno de carga): **{DCpmg}**. Ambos métodos concuerdan razonablemente; el método exacto es el de referencia (E.060 10.18, primer párrafo).
check DCpmg <= 1 // Resistencia biaxial — compatibilidad de deformaciones
## Cuantía (E.060 10.9.1)
check rhog >= 0.01 // Cuantía mínima
check rhog <= 0.06 // Cuantía máxima`),
    summary(),
  ],
};


// ---------------------------------------------------------------------
// 4) VIGA SÍSMICA — DISEÑO POR CAPACIDAD (E.060 21.5)
// ---------------------------------------------------------------------
const vigaDuctil = {
  id: 'co-vigaductil', pais: 'PE', cat: CAT, icon: 'beam', normas: E060 + ' — Art. 21.5 (pórticos y duales tipo II)',
  validacion: {
    fuente: 'NTE E.060-2009 Art. 21.5 — valores de control',
    nota: 'Los datos por defecto no reproducen un ejemplo publicado: los valores esperados son de control (calculados con la plantilla y comprobados a mano donde se indica) para detectar cambios. Vu = (Mpr⁻ + Mpr⁺)/ln + wu·ln/2 con wu = 1.25(CM + CV) se comprueba en las pruebas.',
    valores: [
      { var: 'Mprn', unidad: 'tonf*m', esperado: 29.605, tol: 0.002, desc: 'Control: Mpr negativo (1.25 fy)' },
      { var: 'Mprp', unidad: 'tonf*m', esperado: 22.702, tol: 0.002, desc: 'Control: Mpr positivo' },
      { var: 'Vu', unidad: 'tonf', esperado: 21.499, tol: 0.002, desc: 'Control: cortante por capacidad' },
      { var: 'phiVn', unidad: 'tonf', esperado: 32.533, tol: 0.002, desc: 'Control: φVn' },
      { var: 'so', unidad: 'cm', esperado: 12.5, tol: 0.001, desc: 'Control: espaciamiento en la zona de confinamiento' },
    ],
  },
  name: 'Viga sísmica — diseño por capacidad (Mpr)',
  desc: 'Requisitos geométricos y de cuantía de 21.5, momentos nominales y probables, cortante de diseño Vu = (Mpr⁻ + Mpr⁺)/ln + Vg, estribos de confinamiento en 2h y fuera de ella.',
  titulo: 'Diseño por capacidad de viga sismorresistente',
  blocks: [
    text(`# Generalidades
Se diseña una viga del sistema sismorresistente de un edificio de **pórticos (o dual tipo II)**, para la cual la NTE E.060 21.5 exige un comportamiento dúctil: refuerzo longitudinal continuo, cuantías limitadas, resistencia a momento positivo en la cara ≥ 1/2 de la negativa y **cortante de diseño por capacidad**, obtenido de las resistencias probables en flexión $M_{pr} = 1.25\\,M_n$ en ambos extremos de la luz libre más el cortante isostático de las cargas de gravedad amplificadas (E.060 21.5.4.1, Fig. 21.5.4.1). Se considera el desplazamiento lateral en ambos sentidos.`),
    calc(`# Datos
fc = 210 kgf/cm^2 // Concreto [210 kgf/cm^2|280 kgf/cm^2] [175..420]
fy = 4200 kgf/cm^2 // Acero [2800..5000]
b = 30 cm // Ancho [20 cm..120 cm]
h = 60 cm // Peralte [20..150]
ln = 5.40 m // Luz libre [1..12]
rec = 4 cm // Recubrimiento libre al estribo [2..10]
est = 3 // Estribo [3 : 3/8"|4 : 1/2"]
bar = 6 // Barra longitudinal [5 : 5/8"|6 : 3/4"|8 : 1"]
nsup = 4 // Barras superiores en la cara del apoyo [2..12]
ninf = 3 // Barras inferiores en la cara del apoyo [2..12]
Mun = 20 tonf*m // Momento negativo último en la cara (envolvente) [0..300]
Mup = 12 tonf*m // Momento positivo último en la cara (envolvente) [0..300]
wD = 2.5 tonf/m // Carga muerta repartida (servicio) [0..20]
wL = 1.0 tonf/m // Carga viva repartida (servicio) [0..10]
Pu = 0 tonf // Carga axial amplificada [0..100]
d = h - rec - db(est) - db(bar)/2 // Peralte efectivo
## Requisitos geométricos (E.060 21.5.1)
check Pu <= 0.1*fc*b*h // Carga axial ≤ 0.1 f'c Ag (21.5.1.1)
check ln >= 4*h // Luz libre ≥ 4 h (21.5.1.2)
check b >= max(0.25*h, 25 cm) // Ancho mínimo (21.5.1.3)`),
    calc(`# Flexión (E.060 10 y 21.5.2)
Asn = nsup*Ab(bar) // Acero negativo colocado
Asp = ninf*Ab(bar) // Acero positivo colocado
check Asn >= asFlex(Mun, b, d, fc, fy) // Acero negativo por resistencia
check Asp >= asFlex(Mup, b, d, fc, fy) // Acero positivo por resistencia
Asmin = 0.7*sqrtfc(fc)/fy*b*d // Acero mínimo (E.060 10.5.2, Anexo II)
check min(Asn, Asp) >= Asmin // Refuerzo continuo mínimo (21.5.2.1)
check Asn/(b*d) <= 0.025 // Cuantía máxima 0.025 (21.5.2.1)
check Asn <= 0.75*rhobE060(fc, fy)*b*d // Acero máximo 0.75 Asb (E.060 10.3.4)
Mnn = mnRect(Asn, b, d, fc, fy) // Momento nominal negativo
Mnp = mnRect(Asp, b, d, fc, fy) // Momento nominal positivo
check Mnp >= 0.5*Mnn // M⁺ en la cara ≥ 1/2 M⁻ (21.5.2.2)
# Cortante de diseño por capacidad (E.060 21.5.4.1)
Mprn = 1.25*Mnn // Momento probable negativo (Mpr = 1.25 Mn)
Mprp = 1.25*Mnp // Momento probable positivo
wu = 1.25*(wD + wL) // Carga de gravedad amplificada concomitante con el sismo (E.060 9.2.3)
Vg = wu*ln/2 -> tonf // Cortante isostático
Vp = (Mprn + Mprp)/ln -> tonf // Cortante por desarrollo de Mpr en ambos extremos
Vu = Vp + Vg // Cortante de diseño (Fig. 21.5.4.1)
"Con la definición alternativa del ACI 318-19 (18.6.5.1, $f_s = 1.25 f_y$, $\\phi = 1$): $M_{pr}^- = $ {mprRect(Asn, b, d, fc, fy)} y $M_{pr}^+ = $ {mprRect(Asp, b, d, fc, fy)}.`),
    { type: 'plot', var: 'x', desde: '0', hasta: 'ln/(1 m)', expr: 'Vp + wu*(ln/2 - x*1 m); -Vp + wu*(ln/2 - x*1 m)', nombres: 'Sismo →; Sismo ←', xlabel: 'x [m]', ylabel: 'Vu [t]', titulo: 'Cortante de diseño por capacidad para ambos sentidos del sismo' },
    calc(`## Refuerzo transversal (E.060 11.5 y 21.5.3)
phiv = 0.85 // Cortante (E.060 9.3.2.3) [0.75..0.85]
Vc = 0.53*sqrtfc(fc)*b*d -> tonf // Aporte del concreto (ec. 11-3, Anexo II)
Vs = max(Vu/phiv - Vc, 0 tonf) // Resistencia requerida del acero
check Vs <= 2.1*sqrtfc(fc)*b*d // Límite de Vs (E.060 11.5.7.9)
Av = 2*Ab(est) // Estribo de dos ramas
s_v = si(Vs > 0 tonf, Av*fy*d/Vs, 60 cm) // Espaciamiento por resistencia
so = rounddown(max(min(d/4, 8*db(bar), 24*db(est), 30 cm, s_v), 2.5 cm), 2.5 cm) // Espaciamiento en la zona de confinamiento (21.5.3.2)
check db(est) >= db(3) - 0.01 cm // Estribo ≥ 3/8" para barras hasta 1" (21.5.3.2)
Lo = 2*h // Longitud de confinamiento en cada extremo (21.5.3.1)
s2 = rounddown(max(min(d/2, s_v), 2.5 cm), 2.5 cm) // Espaciamiento fuera de la zona confinada (21.5.3.4)
phiVn = phiv*(Vc + Av*fy*d/so) -> tonf // Resistencia con el espaciamiento adoptado
check Vu <= phiVn // Resistencia a cortante en la zona confinada
"**Estribos #{est}: 1 @ 5 cm, {ceil((Lo - 5 cm)/so)} @ {so} en cada extremo ({Lo}), resto @ {s2}**.`),
    { type: 'section', b: 'b', h: 'h', recub: 'rec', estribo: 'est', sup: '{nsup}#{bar}', inf: '{ninf}#{bar}', sest: '1@5, rest@{so}', titulo: 'Sección en la cara del apoyo' },
    summary(),
  ],
};

// ---------------------------------------------------------------------
// 5) COLUMNA SÍSMICA — COLUMNA FUERTE, CONFINAMIENTO Y CORTANTE POR CAPACIDAD (E.060 21.6)
// ---------------------------------------------------------------------
const colDuctil = {
  id: 'co-colductil', pais: 'PE', cat: CAT, icon: 'column', normas: E060 + ' — Art. 21.6 (pórticos y duales tipo II)',
  validacion: {
    fuente: 'NTE E.060-2009 Art. 21.6 — valores de control',
    nota: 'Los datos por defecto no reproducen un ejemplo publicado: los valores esperados son de control (calculados con la plantilla y comprobados a mano donde se indica) para detectar cambios.',
    valores: [
      { var: 'Mnc', unidad: 'tonf*m', esperado: 57.336, tol: 0.002, desc: 'Control: Mn de la columna' },
      { var: 'Mprc', unidad: 'tonf*m', esperado: 76.421, tol: 0.002, desc: 'Control: Mpr de la columna' },
      { var: 'Vu', unidad: 'tonf', esperado: 20.082, tol: 0.002, desc: 'Control: cortante de diseño' },
      { var: 'phiVn', unidad: 'tonf', esperado: 63.574, tol: 0.002, desc: 'Control: φVn' },
      { var: 'Ash1', unidad: 'cm^2', esperado: 2.5689, tol: 0.002, desc: 'Control: Ash requerido (21-3)' },
      { var: 'so', unidad: 'cm', esperado: 10, tol: 0.001, desc: 'Control: espaciamiento so' },
    ],
  },
  name: 'Columna sísmica — columna fuerte, confinamiento y cortante',
  desc: 'Criterio columna fuerte–viga débil ΣMnc ≥ 1.2 ΣMnv, flexocompresión, cortante por capacidad con Mpr de la columna limitado por las vigas, refuerzo de confinamiento Ash y longitud Lo.',
  titulo: 'Diseño por capacidad de columna sismorresistente',
  blocks: [
    text(`# Generalidades
Se diseña una columna interior de un pórtico especial (edificio de pórticos o dual tipo II) según la NTE E.060 21.6: dimensiones mínimas (21.6.1), resistencia mínima a flexión — **columna fuerte, viga débil** (21.6.2.2, ec. 21-1), cuantía (21.6.3), refuerzo transversal de confinamiento (21.6.4) y **cortante de diseño por capacidad** (21.6.5.1), en el que las resistencias probables $M_{pr} = 1.25 M_n$ corresponden al rango de cargas axiales amplificadas, sin exceder el cortante que pueden transmitir las vigas que llegan al nudo.`),
    calc(`# Datos
fc = 210 kgf/cm^2 // Concreto [175..420]
fy = 4200 kgf/cm^2 // Acero [2800..5000]
b = 50 cm // Dimensión de la columna (paralela al pórtico) [20 cm..120 cm]
hc = 50 cm // Dimensión de la columna (perpendicular) [25..150]
hn = 2.60 m // Altura libre [1.5..6.0]
bar = 8 // Barra longitudinal [6 : 3/4"|8 : 1"]
est = 3 // Estribo [3 : 3/8"|4 : 1/2"]
nramas = 4 // Ramas de estribo en cada dirección (estribo doble) [2..8]
recl = 4 cm // Recubrimiento libre al estribo [2..7.5]
## Cargas amplificadas (envolvente)
Pumax = 250 tonf // Carga axial máxima [0..2000]
Pumin = 120 tonf // Carga axial mínima (0.9 CM − CS) [0..2000]
Mu = 26 tonf*m // Momento amplificado máximo en el extremo [0..500]
Vua = 14 tonf // Cortante del análisis [0..500]
## Vigas que llegan al nudo (de la memoria de la viga)
Mnv1 = 23.64 tonf*m // Momento nominal negativo de la viga en la cara [0..300]
Mnv2 = 18.13 tonf*m // Momento nominal positivo de la viga en la otra cara [0..300]
Ag = b*hc // Área bruta
## Requisitos geométricos (E.060 21.6.1)
"Pu,máx = {Pumax} frente a 0.1 f'c Ag = {0.1*fc*Ag}: si Pu > 0.1 f'c Ag el elemento se diseña como columna según 21.6 (21.6.1.1); en caso contrario como viga (21.5).
check min(b, hc) >= 25 cm // Dimensión menor ≥ 250 mm (21.6.1.2)
check min(b, hc)/max(b, hc) >= 0.25 // Relación de lados ≥ 0.25 (21.6.1.3)`),
    { type: 'pmgen', geom: '0 0 b hc', barras: 'R 6 6 b-6 hc-6 4 4 bar', fc: 'fc', fy: 'fy', norma: 'E060', dir: 'X', demandas: 'Pumax, Mu // Pu máx\nPumin, Mu // Pu mín\nPumax, -Mu // Pu máx (−)\nPumin, -Mu // Pu mín (−)', titulo: 'Columna {b} × {hc}: diagrama de interacción' },
    calc(`# Verificaciones de flexocompresión y cuantía
check DCpmg <= 1 // Flexocompresión (E.060 10.3)
check rhog >= 0.01 // Cuantía mínima (21.6.3.1)
check rhog <= 0.06 // Cuantía máxima (21.6.3.1)
# Columna fuerte – viga débil (E.060 21.6.2.2)
Mnc = min(Mn_X(Pumin), Mn_X(Pumax)) // Mn de la columna para la carga axial que da la menor resistencia
SMnc = 2*Mnc // Columnas superior e inferior
SMnv = Mnv1 + Mnv2 -> tonf*m // Vigas a ambos lados del nudo
check SMnc >= 1.2*SMnv // ΣMnc ≥ 1.2 ΣMnv (ec. 21-1)
# Cortante de diseño por capacidad (E.060 21.6.5.1)
Mprc = 1.25*max(Mn_X(Pumin), Mn_X(Pumax), Mn_X(min(max(Pb_X, Pumin), Pumax))) // Mpr máximo de la columna en el rango de Pu
Vu1 = 2*Mprc/hn -> tonf // Cortante con Mpr de la columna en ambos extremos
Vu2 = 1.25*SMnv/hn -> tonf // Límite por las vigas: Mpr de vigas repartido a las dos columnas del nudo
Vu = max(min(Vu1, Vu2), Vua) // Cortante de diseño
d = b - recl - db(est) - db(bar)/2 // Peralte efectivo en la dirección del pórtico (dimensión b)
phiv = 0.85 // Cortante [0.75..0.85]
Vc0 = 0.53*sqrtfc(fc)*(1 + Pumin/(140 kgf/cm^2*Ag))*hc*d -> tonf // Vc con compresión axial (ec. 11-4, Anexo II); ancho del alma = hc
Vc = si(Pumin < Ag*fc/20, 0 tonf, Vc0) // En Lo, Vc = 0 si Pu < Ag f'c/20 y el cortante sísmico es ≥ 50 % del total (E.060 21.6.5.2; con Ve por capacidad el sismo domina)
Av = nramas*Ab(est) // Área de estribos
Vs = max(Vu/phiv - Vc, 0 tonf) // Resistencia requerida del acero
s_v = si(Vs > 0 tonf, Av*fy*d/Vs, 30 cm) -> cm // Espaciamiento por cortante
# Refuerzo de confinamiento (E.060 21.6.4)
so = rounddown(max(min(min(b, hc)/3, 6*db(bar), 10 cm, s_v), 2.5 cm), 2.5 cm) // Espaciamiento en Lo (21.6.4.2)
Lo = max(max(b, hc), hn/6, 50 cm) -> cm // Longitud de confinamiento (21.6.4.4)
bc = max(b, hc) - 2*recl - db(est) // Dimensión del núcleo c. a c. de estribos (la mayor de las dos direcciones, conservador si la sección no es cuadrada)
Ach = (b - 2*recl)*(hc - 2*recl) // Área del núcleo al exterior del estribo
Ash1 = 0.3*so*bc*fc/fy*(Ag/Ach - 1) // ec. 21-3
Ash2 = 0.09*so*bc*fc/fy // ec. 21-4
check Av >= max(Ash1, Ash2) // Refuerzo de confinamiento Ash
hx = (max(b, hc) - 2*recl)/(nramas - 1) // Separación entre ramas (dirección más larga)
check hx <= 35 cm // hx ≤ 350 mm (21.6.4.3)
phiVn = phiv*(Vc + Av*fy*d/so) -> tonf // Resistencia de diseño con so
check Vu <= phiVn // Resistencia a cortante
s_fuera = rounddown(max(min(10*db(bar), 25 cm, s_v), 2.5 cm), 2.5 cm) // Fuera de Lo (21.6.4.5)
"**Estribos #{est} (doble estribo, {nramas} ramas): 1 @ 5 cm, resto @ {so} en Lo = {roundup(Lo, 5 cm)} en cada extremo y dentro del nudo; fuera de Lo @ {s_fuera}.** Empalmes por traslape solo en la mitad central de la altura (21.6.3.2), de longitud clase B = {lsE060(bar, fc, fy, 2)}.`),
    summary(),
  ],
};

// ---------------------------------------------------------------------
// 6) NUDO VIGA–COLUMNA (E.060 21.7 / ACI 318-19 18.8)
// ---------------------------------------------------------------------
const nudo = {
  id: 'co-nudo', pais: 'PE', cat: CAT, icon: 'column', normas: E060 + ' — Art. 21.7 · ACI 318-19 18.8',
  validacion: {
    fuente: 'NTE E.060-2009 Art. 21.7 — valores de control calculados a mano',
    nota: 'Los datos por defecto no reproducen un ejemplo publicado: los valores esperados son de control (calculados con la plantilla y comprobados a mano donde se indica) para detectar cambios. T1 = 1.25·fy·As1 = 1.25·4200·11.36 kgf; Vn = 3.2√f\'c·Aj (nudo de «otros casos», coeficiente 3.2 en kgf/cm²).',
    valores: [
      { var: 'T1', unidad: 'tonf', esperado: 59.64, tol: 0.001, desc: 'Control: T1 = 1.25 fy As1 = 59.64 tonf' },
      { var: 'Vcol', unidad: 'tonf', esperado: 17.057, tol: 0.002, desc: 'Control: cortante en la columna' },
      { var: 'Vu', unidad: 'tonf', esperado: 87.313, tol: 0.002, desc: 'Control: cortante en el nudo' },
      { var: 'Vn', unidad: 'tonf', esperado: 115.93, tol: 0.002, desc: 'Control: Vn = 3.2√f\'c·Aj' },
      { var: 'ldg', unidad: 'cm', esperado: 41.409, tol: 0.002, desc: 'Control: ℓdg = 0.075 fy db/√f\'c' },
    ],
  },
  name: 'Nudo viga–columna (interior y exterior)',
  desc: 'Cortante en el nudo con 1.25 fy, área efectiva Aj, resistencia 5.3/4.0/3.2√f\'c Aj según confinamiento, paso de barras (20 db) y anclaje con gancho en nudos exteriores.',
  titulo: 'Verificación de nudo viga–columna',
  blocks: [
    text(`# Generalidades
Se verifica un nudo de un pórtico especial de concreto armado conforme a la NTE E.060 21.7. Las fuerzas en el refuerzo de las vigas se calculan con $1.25 f_y$ (21.7.2.1), la fuerza cortante horizontal en el nudo se obtiene por equilibrio (Fig. 21.7.4.3): $V_u = 1.25 f_y (A_{s1} + A_{s2}) - V_{col}$, y la resistencia nominal se limita según el confinamiento del nudo (21.7.4.1). Se usa $\\phi = 0.85$ (21.7.2.2).`),
    calc(`# Datos
fc = 210 kgf/cm^2 // Concreto [175..420]
fy = 4200 kgf/cm^2 // Acero [2800..5000]
bc = 50 cm // Ancho de la columna (perpendicular a la dirección de análisis) [25..150]
hc = 50 cm // Profundidad de la columna (dirección de análisis) [25..150]
bv = 30 cm // Ancho de las vigas [20..80]
hv = 60 cm // Peralte de las vigas [30..120]
hp = 3.00 m // Altura de entrepiso (entre puntos de inflexión de columnas) [2.4..6.0]
barv = 6 // Barra de las vigas [5 : 5/8"|6 : 3/4"|8 : 1"]
As1 = 4*Ab(barv) // Acero superior de la viga de un lado (tracción)
As2 = 3*Ab(barv) // Acero inferior de la viga del otro lado (tracción)
dv = hv - 6 cm // Peralte efectivo de las vigas
conf = 3 // Confinamiento: 1 = cuatro caras, 2 = tres caras o dos opuestas, 3 = otros casos [1 : cuatro caras|2 : tres caras o dos opuestas|3 : otros casos]
## Fuerzas en el nudo (E.060 21.7.2.1 y 21.7.4.3)
T1 = 1.25*fy*As1 -> tonf // Tracción en el acero superior
T2 = 1.25*fy*As2 -> tonf // Tracción en el acero inferior (compresión del lado opuesto)
Mpr1 = mprRect(As1, bv, dv, fc, fy) // Momento probable de la viga 1
Mpr2 = mprRect(As2, bv, dv, fc, fy) // Momento probable de la viga 2
Vcol = (Mpr1 + Mpr2)/hp -> tonf // Cortante en la columna
Vu = T1 + T2 - Vcol // Cortante horizontal en el nudo (Fig. 21.7.4.3)
## Resistencia (E.060 21.7.4.1, Anexo II)
check bv >= 0.75*bc or conf == 3 // Las vigas angostas no confinan el nudo: se usa "otros casos"
bj = min(bc, bv + hc, 2*(bc/2)) // Ancho efectivo del nudo
Aj = bj*hc // Área efectiva del nudo
gam = si(conf == 1, 5.3, si(conf == 2, 4.0, 3.2)) // Coeficiente según confinamiento (5.3 / 4.0 / 3.2)
Vn = gam*sqrtfc(fc)*Aj -> tonf // Resistencia nominal
phij = 0.85 // Factor para nudos (21.7.2.2) [0.75..0.85]
check Vu <= phij*Vn // Resistencia a cortante del nudo
## Detalles (E.060 21.7.2.4 y 21.7.5)
check hc >= 20*db(barv) // Barras de viga que atraviesan el nudo: hc ≥ 20 db
ldg = ldgE060(barv, fc, fy) // Desarrollo con gancho de 90° (nudo exterior, 12.5)
check ldg <= hc - 5 cm // El gancho cabe en el núcleo de la columna exterior (21.7.5.1)
ld = 1.6*ldE060(barv, fc, fy, 1.3) // Barra recta superior fuera del núcleo: ×1.6 (21.7.5.2), referencial
"Dentro del nudo se mantiene el refuerzo transversal de confinamiento de la columna (21.7.3.1), con espaciamiento ≤ 150 mm cuando el nudo está confinado en sus cuatro caras (21.7.3.2). Longitud recta de anclaje referencial (barras superiores): {ld}.`),
    summary(),
  ],
};

// ---------------------------------------------------------------------
// 7) VIGA T (E.060 8.10 y 10)
// ---------------------------------------------------------------------
const vigaT = {
  id: 'co-vigat', pais: 'PE', cat: CAT, icon: 'beam', normas: E060 + ' — Art. 8.10, 10.3 y 10.5',
  validacion: {
    fuente: 'NTE E.060-2009 Art. 8.10, 10.3 y 10.5 — valores de control',
    nota: 'Los datos por defecto no reproducen un ejemplo publicado: los valores esperados son de control (calculados con la plantilla y comprobados a mano donde se indica) para detectar cambios.',
    valores: [
      { var: 'bf', unidad: 'cm', esperado: 120, tol: 0.001, desc: 'E.060 8.10.2: bf = ln/4 = 120 cm' },
      { var: 'As_req', unidad: 'cm^2', esperado: 43.989, tol: 0.002, desc: 'Control: acero requerido' },
      { var: 'Mn', unidad: 'tonf*m', esperado: 103.74, tol: 0.002, desc: 'Control: Mn de la viga T' },
      { var: 'phiMn', unidad: 'tonf*m', esperado: 93.369, tol: 0.002, desc: 'Control: φMn' },
      { var: 'McrT', unidad: 'tonf*m', esperado: 8.0598, tol: 0.002, desc: 'Control: Mcr de la sección T' },
    ],
  },
  name: 'Viga T — ancho efectivo y flexión',
  desc: 'Ancho efectivo del ala, diseño con bloque en el ala o en el alma, acero máximo con Asb de sección T, deformación εt ≥ 0.004 y acero mínimo.',
  titulo: 'Diseño de viga T de concreto armado',
  blocks: [
    text(`# Generalidades
Viga interior monolítica con la losa, sometida a momento positivo (ala en compresión). El ancho efectivo del ala se determina con E.060 8.10.2. Si la profundidad del bloque de compresión $a$ no excede el espesor del ala $h_f$, la sección se diseña como rectangular de ancho $b_f$; en caso contrario se separa la compresión del ala sobresaliente y del alma.`),
    calc(`# Datos
fc = 210 kgf/cm^2 // Concreto [175..420]
fy = 4200 kgf/cm^2 // Acero [2800..5000]
bw = 30 cm // Ancho del alma [15..80]
h = 65 cm // Peralte total [20..150]
hf = 8 cm // Espesor de la losa (ala) [5..20]
ln = 4.80 m // Luz libre de la viga [1..12]
sl = 3.50 m // Separación libre a la viga adyacente [0.5..10]
Mu = 85 tonf*m // Momento positivo último [0..500]
bar = 10 // Barra longitudinal [8 : 1"|9 : 1 1/8"|10 : 1 1/4"]
n = 6 // Número de barras (dos capas) [2..20]
d = h - 9.5 cm // Peralte efectivo (centroide de dos capas)
dt = h - 6 cm // Peralte a la capa extrema en tracción
## Ancho efectivo (E.060 8.10.2)
bf = min(ln/4, bw + 2*8*hf, bw + sl) -> cm // Ancho efectivo del ala
## Diseño
As_req = asFlexT(Mu, bw, bf, hf, d, fc, fy) // Acero requerido (sección T)
As = n*Ab(bar) // Acero colocado
check As >= As_req // Acero suficiente
Asf = 0.85*fc*(bf - bw)*hf/fy // Acero equivalente a las alas sobresalientes
aw = (As*fy - Asf*fy)/(0.85*fc*bw) // Bloque de compresión en el alma (si a > hf)
a = si(As*fy/(0.85*fc*bf) <= hf, As*fy/(0.85*fc*bf), aw) // Profundidad del bloque
tipoT = si(As*fy/(0.85*fc*bf) > hf, 1, 0) // 1 = el bloque ingresa al alma (viga T); 0 = rectangular de ancho bf
"Profundidad del bloque a = {a} frente a hf = {hf} → sección trabajando como viga T (1) o rectangular de ancho bf (0): **{tipoT}**.
Mn = si(a <= hf, As*fy*(d - a/2), Asf*fy*(d - hf/2) + (As - Asf)*fy*(d - a/2)) -> tonf*m // Momento nominal
beta1 = beta1E060(fc) // E.060 10.2.7.3
c = a/beta1 // Eje neutro
epsilont = 0.003*(dt - c)/c // Deformación neta en el acero extremo
check epsilont >= 0.004 // Ductilidad: εt ≥ 0.004 (E.060 10.3.5)
phiMn = 0.9*Mn // Resistencia de diseño (E.060 9.3.2.1)
check Mu <= phiMn // Resistencia a flexión
cb = 6000 kgf/cm^2*d/(6000 kgf/cm^2 + fy) // Eje neutro balanceado
Asb = (0.85*fc*(bf - bw)*hf + 0.85*fc*bw*beta1*cb)/fy // Acero balanceado de la sección T
check As <= 0.75*Asb // Acero máximo (E.060 10.3.4)
check As >= 0.7*sqrtfc(fc)/fy*bw*d // Acero mínimo con el ancho del alma (E.060 10.5.2)
yg = (bf*hf^2/2 + bw*(h - hf)*(hf + (h - hf)/2))/(bf*hf + bw*(h - hf)) // Centroide de la sección T bruta desde la fibra superior
Ig_ala = bf*hf^3/12 + bf*hf*(yg - hf/2)^2 // Inercia del ala respecto al centroide (Steiner)
Ig_alma = bw*(h - hf)^3/12 + bw*(h - hf)*(hf + (h - hf)/2 - yg)^2 // Inercia del alma respecto al centroide (Steiner)
IgT = Ig_ala + Ig_alma // Inercia bruta de la sección T
McrT = 2*sqrtfc(fc)*IgT/(h - yg) -> tonf*m // Momento de agrietamiento (fr = 0.62√f'c, E.060 10.5.1)
check phiMn >= 1.2*McrT // φMn ≥ 1.2 Mcr (E.060 10.5.1)
sl_libre = (bw - 2*4 cm - 2*db(3) - 3*db(bar))/2 // Espaciamiento libre entre barras (3 por capa)
check sl_libre >= max(db(bar), 2.5 cm) // Espaciamiento libre mínimo (E.060 7.6.1)`),
    { type: 'section', b: 'bw', h: 'h', bf: 'bf', hf: 'hf', recub: '4', estribo: '3', sup: '2#5', inf: '3#{bar} / 3#{bar}', titulo: 'Sección T: ala de ancho efectivo {bf}' },
    summary(),
  ],
};

// ---------------------------------------------------------------------
// 8) VIGA DOBLEMENTE REFORZADA (E.060 10.3.3 a 10.3.5)
// ---------------------------------------------------------------------
const vigaDoble = {
  id: 'co-vigadoble', pais: 'PE', cat: CAT, icon: 'beam', normas: E060 + ' — Art. 10.2, 10.3',
  validacion: {
    fuente: 'NTE E.060-2009 Art. 10.2 y 10.3 — valores de control',
    nota: 'Los datos por defecto no reproducen un ejemplo publicado: los valores esperados son de control (calculados con la plantilla y comprobados a mano donde se indica) para detectar cambios. ρb = 0.85·β1·f\'c/fy·6000/(6000 + fy) = 0.02125.',
    valores: [
      { var: 'rhob', esperado: 0.02125, tol: 0.001, desc: 'E.060 10.3.4: ρb (f\'c = 210, fy = 4200)' },
      { var: 'phiMn_max', unidad: 'tonf*m', esperado: 41.249, tol: 0.002, desc: 'Control: φMn máximo con acero simple' },
      { var: 'fs2', unidad: 'kgf/cm^2', esperado: 3690.6, tol: 0.002, desc: 'Control: esfuerzo en A\'s por compatibilidad' },
      { var: 'As_req', unidad: 'cm^2', esperado: 25.554, tol: 0.002, desc: 'Control: acero en tracción requerido' },
      { var: 'Mn', unidad: 'tonf*m', esperado: 51.247, tol: 0.002, desc: 'Control: Mn con el acero colocado' },
    ],
  },
  name: 'Viga doblemente reforzada',
  desc: 'Momento resistente máximo con acero simple, acero en compresión con fluencia verificada por compatibilidad, As máximo con la porción equilibrada por A\'s y verificación final por compatibilidad.',
  titulo: 'Diseño de viga doblemente reforzada',
  blocks: [
    text(`# Generalidades
Cuando el peralte está restringido y el momento último excede la resistencia de la sección con acero simple dentro del límite de ductilidad, se coloca **acero en compresión** (E.060 10.3.3). Se adopta para la "viga 1" (acero en tracción equilibrado por el concreto) una cuantía de $0.5\\rho_b$ y la diferencia de momento la resisten el acero en compresión $A'_s$ y un acero adicional en tracción. El esfuerzo en $A'_s$ se obtiene por compatibilidad de deformaciones.`),
    calc(`# Datos
fc = 210 kgf/cm^2 // Concreto [175..420]
fy = 4200 kgf/cm^2 // Acero [2800..5000]
Es = 2000000 kgf/cm^2 // Módulo del acero [1900000..2100000]
b = 30 cm // Ancho [20 cm..120 cm]
h = 60 cm // Peralte total [20..150]
d = 53 cm // Peralte efectivo (dos capas) [10..150]
dp = 6 cm // Recubrimiento al centroide de A's [4..10]
Mu = 45 tonf*m // Momento último [0..500]
beta1 = beta1E060(fc) // E.060 10.2.7.3
rhob = rhobE060(fc, fy) // Cuantía balanceada
## ¿Se requiere acero en compresión?
As_max1 = 0.75*rhob*b*d // Máximo con acero simple (E.060 10.3.4)
a_m = As_max1*fy/(0.85*fc*b) // Bloque asociado
phiMn_max = 0.9*As_max1*fy*(d - a_m/2) -> tonf*m // Momento máximo con acero simple
req_comp = si(Mu > phiMn_max, 1, 0) // 1 = Mu excede φMn con acero simple máximo: se requiere acero en compresión (E.060 10.3.4)
## Viga 1 (ρ1 = 0.5 ρb)
As1 = 0.5*rhob*b*d // Acero en tracción de la viga 1
a1 = As1*fy/(0.85*fc*b) // Bloque de compresión
Mn1 = As1*fy*(d - a1/2) -> tonf*m // Momento nominal de la viga 1
## Viga 2 (acero en compresión)
Mn2 = max(Mu/0.9 - Mn1, 0 tonf*m) // Momento remanente
c1 = a1/beta1 // Eje neutro
eps_s2 = 0.003*(c1 - dp)/c1 // Deformación en A's
fs2 = min(Es*eps_s2, fy) -> kgf/cm^2 // Esfuerzo en A's (compatibilidad)
Asp_req = Mn2/((fs2 - 0.85*fc)*(d - dp)) // Acero en compresión requerido (descontando el concreto desplazado)
As_req = As1 + Asp_req*(fs2 - 0.85*fc)/fy // Acero total en tracción
## Acero colocado
As = 4*Ab(8) + 2*Ab(6) // 4 #8 + 2 #6 en tracción
Asp = 2*Ab(8) + Ab(5) // 2 #8 + 1 #5 en compresión
check As >= As_req // Acero en tracción suficiente
check Asp >= Asp_req // Acero en compresión suficiente
check As - Asp*fs2/fy <= 0.75*rhob*b*d // As máximo: la porción equilibrada por A's no se reduce (E.060 10.3.4)
## Verificación por compatibilidad de deformaciones (E.060 10.2)
Mn = mnRect(As, b, d, fc, fy, Asp, dp) // Momento nominal con As y A's
check Mu <= 0.9*Mn // Resistencia a flexión
"El acero en compresión debe estar confinado por estribos con separación ≤ 16 db longitudinal, 48 db del estribo y la menor dimensión (E.060 7.11.1 y 7.10.5): s ≤ {min(16*db(8), 48*db(3), b)}.`),
    { type: 'section', b: 'b', h: 'h', recub: '4', estribo: '3', sup: '2#8 + 1#5', inf: '2#8 + 2#6 / 2#8', titulo: 'Sección doblemente reforzada' },
    summary(),
  ],
};

// ---------------------------------------------------------------------
// 9) TORSIÓN (E.060 11.6)
// ---------------------------------------------------------------------
const torsion = {
  id: 'co-torsion', pais: 'PE', cat: CAT, icon: 'beam', normas: E060 + ' — Art. 11.6 (Anexo II MKS) · ACI 318-19 22.7',
  validacion: {
    fuente: 'NTE E.060-2009 Art. 11.6 (Anexo II MKS) — valores de control',
    nota: 'Los datos por defecto no reproducen un ejemplo publicado: los valores esperados son de control (calculados con la plantilla y comprobados a mano donde se indica) para detectar cambios. El procedimiento reproduce el ejemplo publicado de StructurePoint «Equilibrium Torsion» (Aoh, At/s, Av/s, Aℓ) con los datos de ese ejemplo en tests/concrete.test.mjs.',
    valores: [
      { var: 'Aoh', unidad: 'cm^2', esperado: 1329.6, tol: 0.002, desc: 'Control: área encerrada por el estribo' },
      { var: 'Tth', unidad: 'tonf*m', esperado: 0.77193, tol: 0.002, desc: 'Control: torsión umbral' },
      { var: 'At_s', unidad: 'cm^2/m', esperado: 4.3373, tol: 0.002, desc: 'Control: At/s' },
      { var: 'Av_s', unidad: 'cm^2/m', esperado: 2.9367, tol: 0.002, desc: 'Control: Av/s' },
      { var: 'Al', unidad: 'cm^2', esperado: 6.6877, tol: 0.002, desc: 'Control: acero longitudinal por torsión' },
    ],
  },
  name: 'Viga con torsión, cortante y flexión',
  desc: 'Umbral de torsión, torsión de equilibrio, verificación de la sección sólida (11-18), estribos combinados (Av + 2At)/s, acero longitudinal Aℓ y mínimos, espaciamientos.',
  titulo: 'Diseño de viga sometida a torsión',
  blocks: [
    text(`# Generalidades
Viga de borde que soporta un volado: el momento torsor es necesario para el equilibrio (**torsión de equilibrio**, E.060 11.6.2.1) y debe resistirse íntegramente. Se aplica la analogía del tubo de pared delgada y de la armadura espacial con $\\theta = 45°$ (E.060 11.6.3.6). Las ecuaciones se expresan en el sistema MKS según el Anexo II de la norma.`),
    calc(`# Datos
fc = 210 kgf/cm^2 // Concreto [175..420]
fy = 4200 kgf/cm^2 // Acero longitudinal [2800..5000]
fyt = 4200 kgf/cm^2 // Acero de estribos (≤ 4200, E.060 11.6.3.4) [2800..4200]
b = 35 cm // Ancho [20 cm..120 cm]
h = 60 cm // Peralte [20..150]
recl = 4 cm // Recubrimiento libre [2..7.5]
est = 3 // Estribo cerrado [3 : 3/8"|4 : 1/2"]
Tu = 3.5 tonf*m // Momento torsor último a "d" de la cara [0..50]
Vu = 18 tonf // Cortante último a "d" [0..300]
Mu = 20 tonf*m // Momento flector concomitante [0..500]
phi = 0.85 // Cortante y torsión (E.060 9.3.2.3) [0.65..0.90]
d = h - 6 cm // Peralte efectivo
## Propiedades de la sección
Acp = b*h // Área encerrada por el perímetro exterior
Pcp = 2*(b + h) // Perímetro exterior
x1 = b - 2*recl - db(est) // Ancho a ejes del estribo
y1 = h - 2*recl - db(est) // Alto a ejes del estribo
Aoh = x1*y1 // Área encerrada por el eje del estribo
Ph = 2*(x1 + y1) // Perímetro del eje del estribo
Ao = 0.85*Aoh // Área del flujo de cortante (11.6.3.6)
## Umbral de torsión (E.060 11.6.1 a)
Tth = phi*0.27*sqrtfc(fc)*Acp^2/Pcp -> tonf*m // Torsión despreciable
tors = si(Tu > Tth, 1, 0) // 1 = Tu > φTth: debe diseñarse por torsión (si 0, puede despreciarse; el diseño siguiente resulta conservador)
## Dimensiones de la sección (ec. 11-18, Anexo II)
Vc = 0.53*sqrtfc(fc)*b*d -> tonf // Aporte del concreto al cortante
tau = sqrt((Vu/(b*d))^2 + (Tu*Ph/(1.7*Aoh^2))^2) -> kgf/cm^2 // Esfuerzo combinado
check tau <= phi*(Vc/(b*d) + 2.1*sqrtfc(fc)) // Sección adecuada (11-18)
## Refuerzo transversal
At_s = Tu/(phi*2*Ao*fyt*cot(45 deg)) -> cm^2/m // Una rama, por torsión (11-21)
Av_s = max(Vu/phi - Vc, 0 tonf)/(fyt*d) -> cm^2/m // Dos ramas, por cortante
Avt_s = Av_s + 2*At_s // Requerido total (11.6.3.8)
s_req = 2*Ab(est)/max(Avt_s, 0.001 cm^2/m) -> cm // Espaciamiento por resistencia
s = rounddown(max(min(s_req, Ph/8, 30 cm, d/2), 2.5 cm), 2.5 cm) // Espaciamiento adoptado: torsión Ph/8 y 300 mm (11.6.6.1), cortante d/2 (11.5.5.1)
check 2*Ab(est)/s >= Avt_s // Estribos colocados ≥ (Av + 2At)/s requerido (11.6.3.8)
check 2*Ab(est) >= max(0.2*sqrtfc(fc)*b*s/fyt, 3.5 kgf/cm^2*b*s/fyt) // Mínimo (Av + 2At) (11.6.5.2, Anexo II)
## Refuerzo longitudinal por torsión
Al = At_s*Ph*fyt/fy*cot(45 deg)^2 -> cm^2 // ec. 11-22
Al_min = 1.33*sqrtfc(fc)*Acp/fy - max(At_s, 1.75 kgf/cm^2*b/fyt)*Ph*fyt/fy // ec. 11-24 (Anexo II)
Al_d = max(Al, Al_min) // Acero longitudinal de torsión de diseño
As_f = asFlex(Mu, b, d, fc, fy) // Acero por flexión (cara inferior)
As_inf = As_f + Al_d/3 // Inferior: flexión + 1/3 de Aℓ
As_sup = Al_d/3 // Superior: 1/3 de Aℓ
As_lat = Al_d/3 // Laterales: 1/3 de Aℓ (barras a media altura)
"Distribución: inferior {As_inf} → 3 #8 = {3*Ab(8)}; superior {As_sup} (mínimo de flexión {0.7*sqrtfc(fc)/fy*b*d}) → 2 #6 = {2*Ab(6)}; laterales {As_lat} → 2 #4 = {2*Ab(4)}.
check 3*Ab(8) >= As_inf // Acero inferior
check 2*Ab(6) >= max(As_sup, 0.7*sqrtfc(fc)/fy*b*d) // Acero superior (incluye mínimo de flexión)
check 2*Ab(4) >= As_lat // Barras laterales
check db(4) >= max(0.042*s, db(3)) // Diámetro mínimo de barras longitudinales (11.6.6.2)
"**Estribos cerrados #{est} con ganchos a 135° @ {s}** (11.6.4.2), extendidos (b + d) = {b + d} más allá del punto en que se requieren (11.6.6.3).`),
    { type: 'section', b: 'b', h: 'h', recub: 'recl', estribo: 'est', sup: '2#6', inf: '3#8', lat: '1', sest: '@ {s}', titulo: 'Sección con refuerzo de torsión' },
    summary(),
  ],
};

// ---------------------------------------------------------------------
// 10) DEFLEXIONES Y FISURACIÓN (E.060 9.6 y 9.9)
// ---------------------------------------------------------------------
const deflexion = {
  id: 'co-deflexion', pais: 'PE', cat: CAT, icon: 'beam', normas: E060 + ' — Art. 9.6 y 9.9 · ACI 318-19 24.2',
  validacion: {
    fuente: 'NTE E.060-2009 Art. 9.6 (Branson) y ACI 318-19 24.2 (Bischoff) — valores de control',
    nota: 'Los datos por defecto no reproducen un ejemplo publicado: los valores esperados son de control (calculados con la plantilla y comprobados a mano donde se indica) para detectar cambios. ξ = 2.0 para 5 años (E.060 9.6.2.5).',
    valores: [
      { var: 'Icr', unidad: 'cm^4', esperado: 304920, tol: 0.002, desc: 'Control: inercia fisurada' },
      { var: 'IeDL', unidad: 'cm^4', esperado: 315760, tol: 0.002, desc: 'Control: Ie de Branson (D + L)' },
      { var: 'dDL', unidad: 'cm', esperado: 1.2868, tol: 0.002, desc: 'Control: deflexión inmediata D + L' },
      { var: 'xi', esperado: 2, tol: 0.001, desc: 'E.060 9.6.2.5: ξ (5 años) = 2.0' },
      { var: 'dlp', unidad: 'cm', esperado: 1.7269, tol: 0.002, desc: 'Control: deflexión diferida' },
      { var: 'dpost', unidad: 'cm', esperado: 2.193, tol: 0.002, desc: 'Control: deflexión posterior a los no estructurales' },
    ],
  },
  name: 'Deflexiones inmediatas y diferidas, y fisuración',
  desc: 'Mcr, Icr con acero en compresión (2n), Ie de Branson (y Bischoff ACI 318-19), deflexiones por CM y CV, factor ξ/(1+50ρ\'), límites de la Tabla 9.2 y parámetro Z de fisuración.',
  titulo: 'Control de deflexiones y fisuración de viga',
  blocks: [
    text(`# Generalidades
Se calculan las deflexiones de una viga simplemente apoyada bajo cargas de servicio (E.060 9.6.2). La deflexión inmediata se obtiene con $E_c$ (E.060 8.5) y el momento de inercia efectivo $I_e$ de Branson (E.060 9.6.2.3), y la deflexión diferida por flujo plástico y retracción se estima con el factor $\\lambda_\\Delta = \\xi/(1+50\\rho')$ (E.060 9.6.2.5). Se compara con la expresión de Bischoff adoptada por el ACI 318-19 (Tabla 24.2.3.5). El control de la fisuración se realiza con el parámetro $Z$ (E.060 9.9.3).`),
    calc(`# Datos
fc = 210 kgf/cm^2 // Concreto [175..420]
fy = 4200 kgf/cm^2 // Acero [2800..5000]
Es = 2000000 kgf/cm^2 // Módulo del acero [1900000..2100000]
b = 30 cm // Ancho [20 cm..120 cm]
h = 65 cm // Peralte [20..150]
d = 59 cm // Peralte efectivo [10..150]
dp = 6 cm // Recubrimiento de A's [4..10]
As = 3*Ab(8) // Acero en tracción (3 #8)
Asp = 2*Ab(5) // Acero en compresión (2 #5)
L = 6.5 m // Luz de cálculo (simplemente apoyada) [2..15]
wD = 2.6 tonf/m // Carga muerta de servicio (incluye peso propio) [0..20]
wL = 1.2 tonf/m // Carga viva de servicio [0..10]
fsost = 0.30 // Fracción de la carga viva que actúa en forma sostenida [0..1]
meses = 60 // Duración de la carga sostenida (meses) [3|6|12|60] [3..60]
lim = 240 // Límite de la Tabla 9.2 para elementos no estructurales [240 : no susceptibles de daño|480 : susceptibles de daño] [240..480]
## Peralte mínimo sin cálculo de deflexiones (E.060 Tabla 9.1)
"Peralte mínimo para vigas simplemente apoyadas: ℓ/16 = {L/16}; con h = {h} se calculan las deflexiones (Tabla 9.1 es referencial).
## Propiedades de la sección
Ec = 15000*sqrtfc(fc) // Módulo de elasticidad (E.060 8.5, Anexo II)
n = Es/Ec // Relación modular
Ig = b*h^3/12 // Inercia bruta
yt = h/2 // Distancia a la fibra extrema en tracción
fr = 2*sqrtfc(fc) // Módulo de rotura (ec. 9-12, Anexo II)
Mcr = fr*Ig/yt -> tonf*m // Momento de agrietamiento (ec. 9-11)
kd = kdRect(b, d, As, n, dp, Asp) // Eje neutro de la sección agrietada (A's transformado con 2n)
Icr = icrRect(b, d, As, n, dp, Asp) // Inercia agrietada transformada (E.060 9.6.2.3)
## Momentos de servicio
MD = wD*L^2/8 -> tonf*m // Momento por carga muerta
MDL = (wD + wL)*L^2/8 -> tonf*m // Momento por carga muerta + viva
## Inercias efectivas de Branson (sección central, E.060 9.6.2.4 c)
IeD = ieBranson(Mcr, MD, Ig, Icr) // Con carga muerta
IeDL = ieBranson(Mcr, MDL, Ig, Icr) // Con carga total
## Deflexiones inmediatas: δ = 5wL⁴/(384 EcIe)
dD = 5*wD*L^4/(384*Ec*IeD) -> cm // Por carga muerta
dDL = 5*(wD + wL)*L^4/(384*Ec*IeDL) -> cm // Por carga total
dL = dDL - dD // Por carga viva
check dL <= L/360 // Deflexión inmediata por carga viva ≤ ℓ/360 (Tabla 9.2, pisos)
## Deflexión diferida (E.060 9.6.2.5)
xi = xiDef(meses) // Factor dependiente del tiempo
rhop = Asp/(b*d) // Cuantía de A's al centro de la luz
lamD = lambdaDef(xi, rhop) // ξ/(1 + 50ρ')
dLs = fsost*dL // Parte sostenida de la carga viva
dlp = lamD*(dD + dLs) // Deflexión diferida por cargas sostenidas
dpost = dlp + dL // Deflexión que ocurre después de colocar los elementos no estructurales
check dpost <= L/lim // Límite de la Tabla 9.2
## Comparación: Ie de Bischoff (ACI 318-19 Tabla 24.2.3.5)
IeDL_B = ieBischoff(Mcr, MDL, Ig, Icr) // Inercia efectiva ACI 318-19
dDL_B = 5*(wD + wL)*L^4/(384*Ec*IeDL_B) -> cm // Deflexión total inmediata con Bischoff
"Con la expresión de Bischoff la deflexión inmediata total es {dDL_B} frente a {dDL} con Branson (Bischoff es más conservadora para cuantías bajas).`),
    calc(`# Control de la fisuración (E.060 9.9.3)
Ms = MDL // Momento en servicio
fs = Ms/(0.9*d*As) -> kgf/cm^2 // Esfuerzo en el acero (ec. 9-19)
dc = 4 cm + db(3) + db(8)/2 // Recubrimiento al centro de la barra extrema
Act = 2*dc*b/3 // Área efectiva en tracción por barra (3 barras)
Z = fs*(dc*Act)^(1/3) -> kgf/cm // Parámetro Z (ec. 9-18)
check Z <= 26000 kgf/cm // Z ≤ 26 kN/mm (Anexo II: 26 000 kgf/cm)
"Por el criterio del ACI 318-19 (24.3.2), el espaciamiento máximo con $f_s = 2/3 f_y$ y $c_c$ = 5 cm resulta $s_{max}$ = {min(38 cm*(2800 kgf/cm^2/(2/3*fy)) - 2.5*5 cm, 30 cm*(2800 kgf/cm^2/(2/3*fy)))}.`),
    { type: 'beam', tramos: 'L', apoyos: 'A A', E: 'Ec', I: 'IeDL', cargas: 'U 1 wD + wL', titulo: 'Viga en servicio (CM + CV) con EcIe: comprobación de la deflexión inmediata', sufijo: 's' },
    calc(`check abs(deltamax_s - dDL) <= 0.02*dDL // El análisis por rigidez reproduce 5wL⁴/384EIe`),
    summary(),
  ],
};

// ---------------------------------------------------------------------
// 11) VIGA EN VOLADIZO (análisis + diseño + deflexión)
// ---------------------------------------------------------------------
const voladizo = {
  id: 'co-voladizo', pais: 'PE', cat: CAT, icon: 'beam', normas: E060 + ' — Art. 9, 10, 11 y 9.6',
  validacion: {
    fuente: 'NTE E.060-2009 Art. 9, 10, 11 y 9.6 — valores de control calculados a mano',
    nota: 'Los datos por defecto no reproducen un ejemplo publicado: los valores esperados son de control (calculados con la plantilla y comprobados a mano donde se indica) para detectar cambios. U1 = 1.4(1.6·2.5²/2 + 1.2·2.5) + 1.7·0.8·2.5²/2 = 15.45 tonf·m; con el sismo vertical de la E.030 (Art. 28.4 y 38.1, 2/3·Z·U·S = 0.34) gobierna U2 = 1.25(8.0 + 2.5) + 0.34·(8.0 + 0.25·2.5) = 16.06 tonf·m (segunda opinión, 2026).',
    valores: [
      { var: 'Mu1', unidad: 'tonf*m', esperado: 15.45, tol: 0.001, desc: 'Control: U1 = 1.4CM + 1.7CV en el empotramiento = 15.45' },
      { var: 'Mu', unidad: 'tonf*m', esperado: 16.06, tol: 0.002, desc: 'Control: Mu = U2 con sismo vertical (E.030 Art. 38.1)' },
      { var: 'As_req', unidad: 'cm^2', esperado: 8.3596, tol: 0.002, desc: 'Control: acero requerido (gobierna U2)' },
      { var: 'phiMn', unidad: 'tonf*m', esperado: 16.345, tol: 0.002, desc: 'Control: φMn con 3 barras de 3/4"' },
      { var: 'phiVn', unidad: 'tonf', esperado: 21.564, tol: 0.002, desc: 'Control: φVn' },
      { var: 'dDL', unidad: 'cm', esperado: 0.4041, tol: 0.002, desc: 'Control: deflexión inmediata D + L' },
    ],
  },
  name: 'Viga en voladizo — análisis, diseño y deflexión',
  desc: 'Análisis del voladizo con carga repartida y carga en la punta (parapeto), sismo vertical 2/3·ZUS (E.030), flexión con acero superior, cortante a "d", anclaje en el apoyo, deflexión inmediata y diferida con Ie en el empotramiento.',
  titulo: 'Diseño de viga en voladizo',
  blocks: [
    text(`# Generalidades
Viga en voladizo empotrada en una columna/placa, que soporta una losa en volado y un parapeto en el extremo libre. Se realiza el análisis (método de rigidez), el diseño por flexión con refuerzo superior, el diseño por cortante (E.060 11.1.3.1) y el control de deflexiones con la inercia efectiva en la sección del apoyo (E.060 9.6.2.4 d).`),
    calc(`# Datos
fc = 210 kgf/cm^2 // Concreto [175..420]
fy = 4200 kgf/cm^2 // Acero [2800..5000]
Es = 2000000 kgf/cm^2 // Módulo del acero [1900000..2100000]
b = 30 cm // Ancho [20 cm..120 cm]
h = 60 cm // Peralte en el empotramiento [20..150]
Lv = 2.50 m // Longitud del voladizo [0.5..5.0]
wD = 1.6 tonf/m // Carga muerta repartida (incluye peso propio) [0..20]
wL = 0.8 tonf/m // Carga viva repartida [0..10]
PD = 1.2 tonf // Parapeto en la punta (carga muerta) [0..10]
zona = 4 // Zona sísmica (E.030 Tabla N° 1) [4 : Zona 4|3 : Zona 3|2 : Zona 2|1 : Zona 1]
U = 1.0 // Factor de uso (E.030 Tabla N° 7) [1.0|1.3|1.5]
Vs30 = 300 m/s // Velocidad de ondas de corte del sitio (E.030 Tabla N° 3) [100..1500]
Fv = 2/3*ZE030(zona)*U*SE030(zona, Vs30) // Fuerza sísmica vertical como fracción del peso: 2/3·Z·U·S (E.030 Art. 38.1; obligatoria en voladizos, Art. 28.4)
rec = 4 cm // Recubrimiento libre [2..10]
bar = 6 // Barra superior [5 : 5/8"|6 : 3/4"|8 : 1"]
est = 3 // Estribo [3 : 3/8"|4 : 1/2"]
d = h - rec - db(est) - db(bar)/2 // Peralte efectivo
## Peralte mínimo (E.060 Tabla 9.1, voladizos ℓ/8)
check h >= Lv/8 // No se requiere calcular deflexiones (se calculan como verificación)`),
    { type: 'beam', tramos: 'Lv', apoyos: 'E L', E: '2.17e6 tonf/m^2', I: '0.0054 m^4', cargas: 'U 1 1.4*wD + 1.7*wL\nP Lv 1.4*PD', deflexion: false, titulo: 'Voladizo con cargas amplificadas (1.4 CM + 1.7 CV)' },
    calc(`# Diseño por flexión (E.060 10)
MDs = wD*Lv^2/2 + PD*Lv -> tonf*m // Momento de servicio por carga muerta
MLs = wL*Lv^2/2 -> tonf*m // Momento de servicio por carga viva
Mu1 = abs(Mneg) // U1 = 1.4 CM + 1.7 CV (análisis anterior, E.060 9.2.1)
Mu2 = 1.25*(MDs + MLs) + Fv*(MDs + 0.25*MLs) // U2 = 1.25(CM + CV) + CSv, con CSv sobre el peso sísmico CM + 25 % CV (E.060 9.2.3; E.030 Art. 31 y 38.1)
Mu = max(Mu1, Mu2) // Momento último en el empotramiento
As_req = asFlex(Mu, b, d, fc, fy) // Acero superior requerido
As_min = 0.7*sqrtfc(fc)/fy*b*d // Acero mínimo (10.5.2)
n = min(max(2, ceil(max(As_req, As_min)/Ab(bar))), 10) // Número de barras (máximo 10 en dos capas)
As = n*Ab(bar) // Acero colocado
a = As*fy/(0.85*fc*b) // Bloque de compresión
phiMn = 0.9*As*fy*(d - a/2) -> tonf*m // Resistencia de diseño
check As >= max(As_req, As_min) // Acero colocado ≥ requerido y mínimo (10.5.2)
check Mu <= phiMn // Resistencia a flexión
epsilont = 0.003*(d - a/beta1E060(fc))/(a/beta1E060(fc)) // Deformación neta del acero
check epsilont >= 0.004 // Ductilidad (E.060 10.3.5)
## Anclaje en el apoyo (E.060 12.5)
ldg = ldgE060(bar, fc, fy) // Desarrollo con gancho estándar en el elemento de apoyo
"Las {n} barras #{bar} superiores se anclan en el apoyo con gancho de 90°: ℓdg = {ldg}; en el voladizo se prolongan hasta el extremo (barras superiores, ψt = 1.3: ℓd = {ldE060(bar, fc, fy, 1.3)}).
# Diseño por cortante (E.060 11)
Vud1 = Vmax - (1.4*wD + 1.7*wL)*d // U1: cortante a "d" de la cara (11.1.3.1)
Vud2 = 1.25*((wD + wL)*(Lv - d) + PD) + Fv*(wD*(Lv - d) + PD + 0.25*wL*(Lv - d)) -> tonf // U2 con sismo vertical, a "d" de la cara
Vud = max(Vud1, Vud2) // Cortante de diseño
phiVc = 0.85*0.53*sqrtfc(fc)*b*d -> tonf // Resistencia del concreto
Av = 2*Ab(est) // Estribo de dos ramas
Vs = max(Vud/0.85 - phiVc/0.85, 0 tonf) // Resistencia requerida del acero
s = rounddown(max(min(d/2, 60 cm, si(Vs > 0 tonf, Av*fy*d/Vs, 60 cm), Av*fy/(3.5 kgf/cm^2*b)), 2.5 cm), 2.5 cm) // Espaciamiento (11.5.5 y 11.5.6)
phiVn = phiVc + 0.85*Av*fy*d/s // Resistencia de diseño
check Vud <= phiVn // Resistencia a cortante
# Deflexión (E.060 9.6)
Ec = 15000*sqrtfc(fc) // Módulo de elasticidad
nr = Es/Ec // Relación modular
Ig = b*h^3/12 // Inercia bruta
Mcr = 2*sqrtfc(fc)*Ig/(h/2) -> tonf*m // Momento de agrietamiento
Icr = icrRect(b, d, As, nr, 6 cm, 2*Ab(5)) // Inercia agrietada (2 #5 inferiores)
MD = wD*Lv^2/2 + PD*Lv -> tonf*m // Momento de servicio por CM
MDL = (wD + wL)*Lv^2/2 + PD*Lv -> tonf*m // Momento de servicio total
IeD = ieBranson(Mcr, MD, Ig, Icr) // Ie con CM (sección del apoyo, 9.6.2.4 d)
IeDL = ieBranson(Mcr, MDL, Ig, Icr) // Ie con CM + CV
dD = (wD*Lv^4/8 + PD*Lv^3/3)/(Ec*IeD) -> cm // Deflexión inmediata por CM
dDL = ((wD + wL)*Lv^4/8 + PD*Lv^3/3)/(Ec*IeDL) -> cm // Deflexión inmediata total
dL = dDL - dD // Por carga viva
lam = lambdaDef(2.0, 2*Ab(5)/(b*d)) // ξ/(1+50ρ') con ξ = 2 (5 años), ρ' en el apoyo
check dL <= Lv/360 // Deflexión por carga viva (Tabla 9.2)
check lam*dD + dL <= Lv/240 // Deflexión después de unir elementos no estructurales (no susceptibles)`),
    { type: 'section', b: 'b', h: 'h', recub: 'rec', estribo: 'est', sup: '{n}#{bar}', inf: '2#5', sest: '@ {s}', titulo: 'Sección en el empotramiento' },
    summary(),
  ],
};

// ---------------------------------------------------------------------
// 12) LOSA MACIZA EN DOS DIRECCIONES (E.060 13.7)
// ---------------------------------------------------------------------
const losa2d = {
  id: 'co-losa2d', pais: 'PE', cat: CAT, icon: 'slab', normas: E060 + ' — Art. 9.6.3, 13.7 · E.020',
  validacion: {
    fuente: 'NTE E.060-2009 Art. 13.7, Tabla 13.1 (método de coeficientes): caso 4, m = 0.80 → Ca,neg = 0.071, Cb,neg = 0.029; m = 0.85 → 0.066 y 0.034',
    nota: 'Los coeficientes negativos se interpolan en la Tabla 13.1 para m = A/B = 4.50/5.60 = 0.8036 (Ca = 0.071 − 0.005·0.0714 = 0.07064; Cb = 0.02936). Los momentos y aceros son valores de control.',
    valores: [
      { var: 'caso', esperado: 4, tol: 0.001, desc: 'E.060 Tabla 13.1: caso 4 (dos bordes adyacentes continuos)' },
      { var: 'mAB', esperado: 0.80357, tol: 0.001, desc: 'm = A/B = 4.50/5.60' },
      { var: 'Ma_neg/((wud+wul)*A^2)', esperado: 0.070643, tol: 0.001, desc: 'Tabla 13.1: Ca,neg interpolado' },
      { var: 'Mb_neg/((wud+wul)*B^2)', esperado: 0.029357, tol: 0.001, desc: 'Tabla 13.1: Cb,neg interpolado' },
      { var: 'Ma_pos', unidad: 'tonf*m/m', esperado: 1.0258, tol: 0.002, desc: 'Control: momento positivo en A' },
      { var: 'As_an', unidad: 'cm^2', esperado: 3.9587, tol: 0.002, desc: 'Control: acero negativo en A' },
    ],
  },
  name: 'Losa maciza en dos direcciones — método de coeficientes',
  desc: 'Paño apoyado en vigas: espesor mínimo (9-17), caso según bordes continuos, coeficientes de las Tablas 13.1–13.3, momentos negativos y positivos, acero por metro, cortante (13-10) y espaciamientos.',
  titulo: 'Diseño de losa maciza en dos direcciones',
  blocks: [
    text(`# Generalidades
Paño de esquina de una losa maciza apoyada en vigas peraltadas en todo su perímetro, diseñado con el **Método de Coeficientes** de la NTE E.060 13.7 (equivalente al Método 3 del ACI 318-63). Los momentos en las franjas centrales se calculan con $M_a = C_a\\,w_u\\,A^2$ y $M_b = C_b\\,w_u\\,B^2$, donde $A$ y $B$ son las luces libres corta y larga; en los bordes discontinuos se considera un momento negativo igual a 1/3 del positivo (13.7.3.5). Los momentos en las franjas de columna se reducen gradualmente hasta 1/3 en el borde del paño (13.7.3.3).`),
    calc(`# Datos
fc = 210 kgf/cm^2 // Concreto [175..420]
fy = 4200 kgf/cm^2 // Acero [2800..5000]
A = 4.50 m // Luz libre corta [2..10]
B = 5.60 m // Luz libre larga [2..10]
h = 15 cm // Espesor de la losa [12 cm|15 cm|17 cm|20 cm] [12..30]
rec = 2.5 cm // Recubrimiento libre [2..10]
bar = 3 // Barra [3 : 3/8"|4 : 1/2"]
gc = 2.4 tonf/m^3 // Peso unitario del concreto armado (E.020) [2.3..2.5]
wpt = 0.10 tonf/m^2 // Piso terminado [0.05..0.20]
wtab = 0.10 tonf/m^2 // Tabiquería repartida [0..0.30]
sc = 0.25 tonf/m^2 // Sobrecarga (oficinas, E.020) [0.1..1.0]
## Metrado (E.020) y cargas amplificadas (E.060 9.2.1)
wD = gc*h + wpt + wtab -> tonf/m^2 // Carga muerta
wL = sc // Carga viva
wud = 1.4*wD // Carga muerta amplificada
wul = 1.7*wL // Carga viva amplificada
## Limitaciones del método (E.060 13.7.1)
check B/A <= 2 // Relación de luces ≤ 2 (13.7.1.2)
check wL <= 2*wD // Carga viva ≤ 2 veces la carga muerta (13.7.1.4)
## Espesor mínimo (E.060 9.6.3.3 c, αfm > 2)
beta = B/A // Relación de luces libres
hmin = max(B*(0.8 + fy/(14000 kgf/cm^2))/(36 + 9*beta), 9 cm) -> cm // ec. 9-17 (Anexo II)
check h >= hmin // Espesor mínimo
d = h - rec - db(bar)/2 // Peralte efectivo (capa exterior)`),
    { type: 'slab2way', A: 'A', B: 'B', bordes: 'C D D C', wud: 'wud', wul: 'wul', d: 'd', titulo: 'Paño de esquina (caso {caso}): coeficientes y momentos (t·m/m)' },
    calc(`# Diseño del refuerzo (por metro de ancho)
bm = 100 cm // Ancho de diseño [50..100]
Asmin = 0.0018*bm*h // Acero mínimo (E.060 10.5.4 y 9.7.2)
smax = min(2*h, 40 cm) // Espaciamiento máximo en losas en dos direcciones (E.060 13.3.2)
## Dirección corta A
As_an = max(asFlex(Ma_neg*1 m, bm, d, fc, fy), Asmin) // Negativo en borde continuo
As_ap = max(asFlex(Ma_pos*1 m, bm, d, fc, fy), Asmin) // Positivo
s_an = rounddown(max(min(Ab(bar)/As_an*bm, smax), 2.5 cm), 2.5 cm) // Espaciamiento negativo
s_ap = rounddown(max(min(Ab(bar)/As_ap*bm, smax), 2.5 cm), 2.5 cm) // Espaciamiento positivo
## Dirección larga B (segunda capa: d − db)
db2 = d - db(bar) // Peralte efectivo de la segunda capa
As_bn = max(asFlex(Mb_neg*1 m, bm, db2, fc, fy), Asmin) // Negativo en borde continuo
As_bp = max(asFlex(Mb_pos*1 m, bm, db2, fc, fy), Asmin) // Positivo
s_bn = rounddown(max(min(Ab(bar)/As_bn*bm, smax), 2.5 cm), 2.5 cm) // Espaciamiento negativo
s_bp = rounddown(max(min(Ab(bar)/As_bp*bm, smax), 2.5 cm), 2.5 cm) // Espaciamiento positivo
## Bordes discontinuos (M⁻ = M⁺/3)
As_disc = max(asFlex(max(Ma_disc, Mb_disc)*1 m, bm, db2, fc, fy), Asmin) // Acero en bordes discontinuos
check Ab(bar)/s_an*bm >= As_an // Verificación del acero negativo A
check Ab(bar)/s_ap*bm >= As_ap // Verificación del acero positivo A
check Ab(bar)/s_bn*bm >= As_bn // Verificación del acero negativo B
check Ab(bar)/s_bp*bm >= As_bp // Verificación del acero positivo B
"**Refuerzo:** dirección corta: inferior #{bar} @ {s_ap}, superior en borde continuo #{bar} @ {s_an}; dirección larga: inferior #{bar} @ {s_bp}, superior en borde continuo #{bar} @ {s_bn}; bordes discontinuos #{bar} @ {rounddown(max(min(Ab(bar)/As_disc*bm, smax), 2.5 cm), 2.5 cm)}.
# Cortante (E.060 13.7.4, ec. 13-10)
phiVc = 0.85*0.53*sqrtfc(fc)*bm*d -> tonf // Resistencia por metro
check Vua*1 m <= phiVc // Cortante en la dirección corta (incluye +15 % si corresponde)
check Vub*1 m <= phiVc // Cortante en la dirección larga
"Carga sobre las vigas: áreas tributarias con líneas a 45° (13.7.3.2); para la viga corta puede usarse $w_u A/3$ = {(wud + wul)*A/3}.`),
    summary(),
  ],
};

// ---------------------------------------------------------------------
// 13) LOSA MACIZA EN UNA DIRECCIÓN (E.060 8.3.3, 9.6, 9.7, 10.5)
// ---------------------------------------------------------------------
const losa1d = {
  id: 'co-losa1d', pais: 'PE', cat: CAT, icon: 'slab', normas: E060 + ' — Art. 8.3.3, 9.6, 9.7 y 10.5',
  validacion: {
    fuente: 'NTE E.060-2009 Art. 8.3.3 (coeficientes): wu·ln²/24, /14, /10, /16 y cortante 1.15·wu·ln/2',
    nota: 'Las relaciones wu·ln²/M reproducen exactamente los coeficientes de la norma (24, 14, 10 y 16); los aceros son valores de control.',
    valores: [
      { var: 'wu*ln^2/Mext', esperado: 24, tol: 0.0005, desc: 'E.060 8.3.3: apoyo exterior, 1/24' },
      { var: 'wu*ln^2/Mp1', esperado: 14, tol: 0.0005, desc: 'E.060 8.3.3: tramo exterior, 1/14' },
      { var: 'wu*ln^2/Mi1', esperado: 10, tol: 0.0005, desc: 'E.060 8.3.3: primer apoyo interior, 1/10' },
      { var: 'wu*ln^2/Mp2', esperado: 16, tol: 0.0005, desc: 'E.060 8.3.3: tramo interior, 1/16' },
      { var: 'Vu1/(wu*ln)', esperado: 0.575, tol: 0.0005, desc: 'E.060 8.3.3: cortante 1.15/2' },
      { var: 'Asn', unidad: 'cm^2', esperado: 4.314, tol: 0.002, desc: 'Control: acero negativo' },
    ],
  },
  name: 'Losa maciza en una dirección',
  desc: 'Franja de 1 m de losa continua: espesor mínimo (Tabla 9.1), coeficientes de 8.3.3 contrastados con análisis con alternancia de CV, acero principal, mínimo y de temperatura, cortante.',
  titulo: 'Diseño de losa maciza armada en una dirección',
  blocks: [
    text(`# Generalidades
Losa maciza continua de tres tramos apoyada en vigas, armada en una dirección (relación de lados del paño mayor que 2). Se diseña una franja de 1.00 m de ancho. Los momentos se obtienen con los **coeficientes aproximados de E.060 8.3.3** y se contrastan con un análisis elástico con alternancia de carga viva (E.060 8.9).`),
    calc(`# Datos
fc = 210 kgf/cm^2 // Concreto [175..420]
fy = 4200 kgf/cm^2 // Acero [2800..5000]
ln = 3.60 m // Luz libre de cada tramo [1..12]
h = 15 cm // Espesor [12 cm|15 cm|17 cm|20 cm] [12..30]
rec = 2.5 cm // Recubrimiento libre [2..10]
bar = 3 // Barra principal [3 : 3/8"|4 : 1/2"]
wpt = 0.10 tonf/m^2 // Piso terminado [0.05..0.20]
wtab = 0.15 tonf/m^2 // Tabiquería repartida [0..0.30]
sc = 0.30 tonf/m^2 // Sobrecarga [0.1..1.0]
bm = 100 cm // Ancho de diseño [50..100]
## Espesor mínimo (E.060 Tabla 9.1)
check h >= ln/24 // Losa maciza con un extremo continuo (tramo extremo)
## Cargas por metro de ancho
wD = (2.4 tonf/m^3*h + wpt + wtab)*1 m -> tonf/m // Carga muerta
wL = sc*1 m -> tonf/m // Carga viva
wu = 1.4*wD + 1.7*wL // Carga amplificada (E.060 9.2.1)
check wL <= 3*wD // Condición (d) de 8.3.3
## Momentos con los coeficientes de E.060 8.3.3 (apoyo exterior: viga de borde)
Mext = wu*ln^2/24 -> tonf*m // Negativo en apoyo exterior
Mp1 = wu*ln^2/14 -> tonf*m // Positivo en tramo extremo (monolítico)
Mi1 = wu*ln^2/10 -> tonf*m // Negativo en primer apoyo interior (más de dos tramos)
Mp2 = wu*ln^2/16 -> tonf*m // Positivo en tramo interior
Vu1 = 1.15*wu*ln/2 -> tonf // Cortante en la cara exterior del primer apoyo interior`),
    { type: 'beam', tramos: 'ln, ln, ln', apoyos: 'A, A, A, A', E: '2.17e6 tonf/m^2', I: 'bm*h^3/12', cargas: 'CM: U * 1.4*wD\nCV: U * 1.7*wL', alternancia: true, deflexion: false, titulo: 'Análisis elástico con alternancia de carga viva (franja de 1 m)' },
    calc(`"El análisis con apoyos simples da M⁺ máx = {Mpos} y M⁻ = {abs(Mneg)}; los coeficientes de 8.3.3 dan {Mp1} y {Mi1}. Se diseña con el mayor valor de cada sección.
# Diseño por flexión
d = h - rec - db(bar)/2 // Peralte efectivo
Mup = max(Mp1, Mpos) // Momento positivo de diseño
Mun = max(Mi1, abs(Mneg)) // Momento negativo de diseño
rhot = si(fy < 4200 kgf/cm^2, 0.0020, max(0.0018*4200 kgf/cm^2/fy, 0.0014)) // Cuantía de contracción y temperatura: 0.0020 (fy < 4200), 0.0018 (fy = 4200), 0.0018·4200/fy ≥ 0.0014 (E.060 9.7.2; ACI 318-19 24.4.3.2)
Asmin = rhot*bm*h // Acero mínimo (E.060 10.5.4, 9.7.2)
Asp = max(asFlex(Mup, bm, d, fc, fy), Asmin) // Acero positivo
Asn = max(asFlex(Mun, bm, d, fc, fy), Asmin) // Acero negativo interior
Ase = max(asFlex(Mext, bm, d, fc, fy), Asmin) // Acero negativo exterior
smax = min(3*h, 40 cm) // Espaciamiento máximo (E.060 9.8.1)
sp = rounddown(max(min(Ab(bar)/Asp*bm, smax), 2.5 cm), 2.5 cm) // Espaciamiento positivo
sn = rounddown(max(min(Ab(bar)/Asn*bm, smax), 2.5 cm), 2.5 cm) // Espaciamiento negativo
se = rounddown(max(min(Ab(bar)/Ase*bm, smax), 2.5 cm), 2.5 cm) // Espaciamiento negativo exterior
check Ab(bar)/sp*bm >= Asp // Acero positivo colocado
check Ab(bar)/sn*bm >= Asn // Acero negativo colocado
check Ab(bar)/se*bm >= Ase // Acero negativo exterior colocado
a = Asn*fy/(0.85*fc*bm) // Bloque de compresión
check 0.003*(d - a/0.85)/(a/0.85) >= 0.004 // Ductilidad εt ≥ 0.004 (E.060 10.3.5)
## Acero de temperatura (E.060 9.7)
Ast = rhot*bm*h // Acero de temperatura con la cuantía ρt
st = rounddown(max(min(Ab(3)/Ast*bm, 3*h, 40 cm), 2.5 cm), 2.5 cm) // Espaciamiento ≤ 3h y 400 mm (9.7.3; 5h solo en aligerados)
"**Refuerzo:** inferior #{bar} @ {sp}; superior en apoyos interiores #{bar} @ {sn}; en apoyos exteriores #{bar} @ {se}; temperatura #3 @ {st} (perpendicular).
# Cortante (E.060 11.3)
phiVc = 0.85*0.53*sqrtfc(fc)*bm*d -> tonf // Resistencia del concreto
Vud = Vu1 - wu*d // Cortante a "d" de la cara
check Vud <= phiVc // No requiere refuerzo por cortante`),
    summary(),
  ],
};

// ---------------------------------------------------------------------
// 14) LOSA ALIGERADA EN DOS DIRECCIONES (E.060 8.11 y 13.7)
// ---------------------------------------------------------------------
const aligerado2d = {
  id: 'co-aligerado2d', pais: 'PE', cat: CAT, icon: 'slab', normas: E060 + ' — Art. 8.11, 13.7 · E.020',
  validacion: {
    fuente: 'NTE E.060-2009 Art. 8.11 y 13.7 (Tablas 13.1–13.3) — valores de control',
    nota: 'Los datos por defecto no reproducen un ejemplo publicado: los valores esperados son de control (calculados con la plantilla y comprobados a mano donde se indica) para detectar cambios. Caso 9 de la Tabla 13.1 (tres bordes continuos), m = 5.20/6.00.',
    valores: [
      { var: 'caso', esperado: 9, tol: 0.001, desc: 'E.060 Tabla 13.1: caso 9' },
      { var: 'mAB', esperado: 0.86667, tol: 0.001, desc: 'm = A/B = 5.20/6.00' },
      { var: 'Ma_neg', unidad: 'tonf*m/m', esperado: 2.2013, tol: 0.002, desc: 'Control: momento negativo en A' },
      { var: 'Ma_pos', unidad: 'tonf*m/m', esperado: 0.9495, tol: 0.002, desc: 'Control: momento positivo en A' },
      { var: 'Asan', unidad: 'cm^2', esperado: 1.1267, tol: 0.002, desc: 'Control: acero negativo por vigueta' },
      { var: 'phiVc', unidad: 'tonf', esperado: 1.5799, tol: 0.002, desc: 'Control: φVc de la vigueta' },
    ],
  },
  name: 'Losa aligerada en dos direcciones',
  desc: 'Aligerado con viguetas en ambas direcciones (bloques 30×30): metrado, momentos por coeficientes (13.7) por metro y por vigueta, acero positivo como sección T, negativo en el alma, cortante con 1.1Vc.',
  titulo: 'Diseño de losa aligerada en dos direcciones',
  blocks: [
    text(`# Generalidades
Losa nervada (aligerada) en dos direcciones con viguetas de 10 cm de ancho espaciadas a 40 cm en ambos sentidos, bloques de relleno de 30 × 30 cm y losa superior de 5 cm, apoyada en vigas peraltadas en su perímetro. Cumple las proporciones de E.060 8.11 y se analiza con el **Método de Coeficientes** (E.060 13.7); los momentos por metro se convierten a momentos por vigueta multiplicando por la separación entre ejes de nervios.`),
    calc(`# Datos
fc = 210 kgf/cm^2 // Concreto [175..420]
fy = 4200 kgf/cm^2 // Acero [2800..5000]
A = 5.20 m // Luz libre corta [2..10]
B = 6.00 m // Luz libre larga [2..10]
h = 25 cm // Peralte total [20 cm|25 cm|30 cm] [17..50]
hf = 5 cm // Losa superior [5..20]
bw = 10 cm // Ancho de vigueta [8..15]
sv = 40 cm // Separación entre ejes de viguetas [40..100]
pal = 0.38 tonf/m^2 // Peso propio del aligerado bidireccional h = 25 cm [0.25..0.60]
wpt = 0.10 tonf/m^2 // Piso terminado [0.05..0.20]
wtab = 0.10 tonf/m^2 // Tabiquería repartida [0..0.30]
sc = 0.20 tonf/m^2 // Sobrecarga (vivienda) [0.1..1.0]
## Requisitos geométricos (E.060 8.11)
check bw >= 10 cm // Ancho de nervio ≥ 100 mm (8.11.2)
check h - hf <= 3.5*bw // Altura del nervio ≤ 3.5 bw (8.11.2)
check sv - bw <= 75 cm // Espaciamiento libre ≤ 750 mm (8.11.3)
check hf >= max((sv - bw)/12, 5 cm) // Losa superior ≥ 1/12 de la luz libre entre nervios y ≥ 50 mm (8.11.5)
## Cargas amplificadas por m²
wD = pal + wpt + wtab // Carga muerta
wL = sc // Carga viva
wud = 1.4*wD // Muerta amplificada
wul = 1.7*wL // Viva amplificada
check B/A <= 2 // Límite del método (13.7.1.2)
d = h - 3 cm // Peralte efectivo de las viguetas`),
    { type: 'slab2way', A: 'A', B: 'B', bordes: 'C C D C', wud: 'wud', wul: 'wul', d: 'd', titulo: 'Paño de borde (caso {caso}): momentos por metro de ancho' },
    calc(`# Diseño por vigueta
## Momentos por vigueta (M por metro × separación)
Mvap = Ma_pos*sv // Positivo dirección A
Mvan = Ma_neg*sv // Negativo dirección A (bordes continuos)
Mvbp = Mb_pos*sv // Positivo dirección B
Mvbn = Mb_neg*sv // Negativo dirección B
## Acero positivo (sección T, ancho bf = sv)
Asap = asFlexT(Mvap, bw, sv, hf, d, fc, fy) // Dirección A
Asbp = asFlexT(Mvbp, bw, sv, hf, d - 1.3 cm, fc, fy) // Dirección B (segunda capa)
Asmin = 0.7*sqrtfc(fc)/fy*bw*d // Acero mínimo en el alma (E.060 10.5.2)
check Ab(4) >= max(Asap, Asmin) // 1 #4 positivo en dirección A
check Ab(4) >= max(Asbp, Asmin) // 1 #4 positivo en dirección B
## Acero negativo (sección rectangular de ancho bw)
Asan = asFlex(Mvan, bw, d, fc, fy) // Dirección A
Asbn = asFlex(Mvbn, bw, d, fc, fy) // Dirección B
check Ab(4) + Ab(3) >= max(Asan, Asmin) // 1 #4 + 1 #3 negativo en A
check Ab(4) + Ab(3) >= max(Asbn, Asmin) // 1 #4 + 1 #3 negativo en B
check Asan <= 0.75*rhobE060(fc, fy)*bw*d // Acero máximo en el alma (E.060 10.3.4)
## Cortante en las viguetas (E.060 8.11.8: 1.1 Vc)
phiVc = 0.85*1.1*0.53*sqrtfc(fc)*bw*d -> tonf // Resistencia por vigueta
check Vua*sv <= phiVc // Cortante dirección A
check Vub*sv <= phiVc // Cortante dirección B
## Acero de temperatura en la losa superior (E.060 9.7)
Ast = 0.0018*100 cm*hf // Por metro
"Temperatura: #3 @ {rounddown(min(Ab(3)/Ast*100 cm, 5*hf, 40 cm), 2.5 cm)} o malla equivalente, en ambas direcciones.`),
    summary(),
  ],
};

// ---------------------------------------------------------------------
// 15) LOSA PLANA — PUNZONAMIENTO CON TRANSFERENCIA DE MOMENTO (E.060 11.12)
// ---------------------------------------------------------------------
const punzonamiento = {
  id: 'co-punzonamiento', pais: 'PE', cat: CAT, icon: 'slab', normas: E060 + ' — Art. 11.12, 13.5.3 y 21.8 · ACI 318-19 22.6 y 8.4.4',
  validacion: {
    fuente: 'NTE E.060-2009 Art. 11.12 (ec. 11-33 a 11-35, γv) — valores de control',
    nota: 'Los datos por defecto no reproducen un ejemplo publicado: los valores esperados son de control (calculados con la plantilla y comprobados a mano donde se indica) para detectar cambios. γv = 1 − 1/(1 + 2/3) = 0.40 (columna cuadrada). Con los datos de StructurePoint «The Role of γf in Two-way Slab Punching Shear» la plantilla reproduce vu = 166.7 psi y vc = 253 psi (tests/concrete.test.mjs).',
    valores: [
      { var: 'gv', esperado: 0.4, tol: 0.001, desc: 'E.060 11.12.6: γv columna cuadrada = 0.40' },
      { var: 'bo', unidad: 'cm', esperado: 284, tol: 0.001, desc: 'Control: perímetro crítico 4·(50 + 21)' },
      { var: 'Jc', unidad: 'cm^4', esperado: 5120300, tol: 0.002, desc: 'Control: Jc' },
      { var: 'vu', unidad: 'kgf/cm^2', esperado: 14.239, tol: 0.002, desc: 'Control: esfuerzo cortante máximo' },
      { var: 'vc', unidad: 'kgf/cm^2', esperado: 17.737, tol: 0.002, desc: 'Control: vc = 1.06√f\'c' },
    ],
  },
  name: 'Losa plana — punzonamiento con transferencia de momento',
  desc: 'Sección crítica a d/2 de columna interior, Vc mínimo de (11-33/34/35), fracciones γf y γv, Jc, esfuerzo máximo vu = Vu/Ac + γv Mu c/Jc, refuerzo por flexión en el ancho c2 + 3h e integridad.',
  titulo: 'Verificación de punzonamiento en losa plana',
  blocks: [
    text(`# Generalidades
Se verifica la conexión losa–columna interior de una losa plana sin vigas. Además de la fuerza cortante $V_u$, la conexión transfiere un momento no balanceado $M_u$: la fracción $\\gamma_f M_u$ se transfiere por flexión en un ancho $c_2 + 3h$ (E.060 13.5.3) y la fracción $\\gamma_v M_u = (1-\\gamma_f) M_u$ por excentricidad del cortante (E.060 11.12.6.1, ec. 11-39). El esfuerzo cortante máximo en la sección crítica, que varía linealmente (Fig. 11.12.6), no debe exceder $\\phi v_n = \\phi V_c/(b_o d)$ (ec. 11-40).

Recuérdese que la NTE E.060 21.8.2 limita el uso de losas planas a edificios de hasta 5 pisos con muros que tomen al menos el 80 % del cortante sísmico.`),
    calc(`# Datos
fc = 280 kgf/cm^2 // Concreto [210 kgf/cm^2|280 kgf/cm^2|350 kgf/cm^2] [175..420]
fy = 4200 kgf/cm^2 // Acero [2800..5000]
h = 25 cm // Espesor de la losa [15..50]
d = 21 cm // Peralte efectivo promedio [10..150]
c1 = 50 cm // Dimensión de la columna en la dirección del momento [20..150]
c2 = 50 cm // Dimensión perpendicular [20..150]
Vu = 75 tonf // Fuerza cortante amplificada transferida [0..300]
Mu = 6 tonf*m // Momento no balanceado amplificado [0..500]
alphas = 40 // Columna interior (40), de borde (30), esquina (20) [40|30|20] [20..40]
## Sección crítica a d/2 (E.060 11.12.1.2)
b1 = c1 + d // Lado paralelo al momento
b2 = c2 + d // Lado perpendicular
bo = 2*(b1 + b2) // Perímetro crítico
Ac = bo*d // Área de la sección crítica
cAB = b1/2 // Distancia del centroide a la cara AB
Jc = jcInterior(c1, c2, d) // Propiedad análoga al momento polar de inercia (Fig. 11.12.6 a)
## Fracciones del momento (E.060 13.5.3.2 y 11.12.6.1)
gf = 1/(1 + 2/3*sqrt(b1/b2)) // Fracción por flexión γf
gv = 1 - gf // Fracción por excentricidad del cortante γv (ec. 11-39)
## Esfuerzo cortante máximo
vu = Vu/Ac + gv*Mu*cAB/Jc -> kgf/cm^2 // Fig. 11.12.6 a
## Resistencia (E.060 11.12.2.1, Anexo II)
betac = max(c1, c2)/min(c1, c2) // Relación de lados de la columna
vc1 = 0.53*(1 + 2/betac)*sqrtfc(fc) // ec. 11-33
vc2 = 0.27*(alphas*d/bo + 2)*sqrtfc(fc) // ec. 11-34
vc3 = 1.06*sqrtfc(fc) // ec. 11-35
vc = min(vc1, vc2, vc3) // Esfuerzo resistente del concreto
phi = 0.85 // Cortante (E.060 9.3.2.3) [0.65..0.90]
check vu <= phi*vc // Punzonamiento con transferencia de momento (ec. 11-40)
check Vu <= phi*vc*Ac // Punzonamiento por cortante directo
## Compatibilidad de deriva de la conexión losa–columna (ACI 318-08 21.13.6; ACI 318-19 18.14.5.1)
"La losa plana no forma parte del sistema sismorresistente (los muros toman el cortante sísmico), pero acompaña su deriva. Si la deriva de diseño del entrepiso supera $0.035 - \\tfrac{1}{20}\\,v_{ug}/(\\phi v_c)$ (y en todo caso 0.005), la conexión requiere refuerzo por cortante (estribos o pernos de cortante) que cumpla $v_s \\ge 0.93\\sqrt{f'_c}$ extendido 4h desde la cara de la columna.
Vug = 60 tonf // Cortante de gravedad de la conexión 1.25(CM + CV) (E.060 9.2.3, sin sismo) [0..300]
deriva = 0.004 // Deriva inelástica de diseño del entrepiso (E.030 Art. 50) [0..0.010]
vug = Vug/Ac -> kgf/cm^2 // Esfuerzo de cortante por gravedad
derivalim = max(0.035 - vug/(20*phi*vc), 0.005) // Deriva límite sin refuerzo por cortante
check deriva <= derivalim // Conexión sin refuerzo por cortante por compatibilidad de deriva
"Según ACI 318-19 (22.6.5.2) el esfuerzo $v_c$ se afecta además por el factor de tamaño $\\lambda_s$ = {lambdasACI(d)} cuando no hay refuerzo mínimo por cortante (aquí $d$ ≤ 25 cm, efecto despreciable).
# Transferencia de momento por flexión (E.060 13.5.3)
bt = c2 + 3*h // Ancho efectivo para γf Mu
Mf = gf*Mu // Momento transferido por flexión
As_f = asFlex(Mf, bt, d, fc, fy) // Acero requerido en el ancho bt
nb = 6 // Barras superiores #5 concentradas en el ancho bt (adicionales a las de la franja) [0..30]
check nb*Ab(5) >= As_f // Refuerzo de transferencia
"Se concentran {nb} #5 en un ancho de {bt} centrado en la columna, además del refuerzo de la franja de columna.
# Integridad estructural (E.060 13.3.8 / 7.13)
"Al menos dos barras inferiores continuas en cada dirección deben atravesar el núcleo de la columna (integridad).`),
    summary(),
  ],
};

// ---------------------------------------------------------------------
// 16) MÉNSULA (E.060 11.9 / ACI 318-19 16.5)
// ---------------------------------------------------------------------
const mensula = {
  id: 'co-mensula', pais: 'PE', cat: CAT, icon: 'column', normas: E060 + ' — Art. 11.7 y 11.9 · ACI 318-19 16.5',
  validacion: {
    fuente: 'NTE E.060-2009 Art. 11.7 y 11.9 — valores de control calculados a mano',
    nota: 'Los datos por defecto no reproducen un ejemplo publicado: los valores esperados son de control (calculados con la plantilla y comprobados a mano donde se indica) para detectar cambios. Mu = Vu·av + Nuc·(h − d) = 30·0.15 + 6.5·0.05 = 4.825 tonf·m; Vn,máx = 55 kgf/cm²·bw·d = 77 tonf.',
    valores: [
      { var: 'Vnmax', unidad: 'tonf', esperado: 77, tol: 0.001, desc: 'Control: Vn máximo = 77 tonf' },
      { var: 'Mu', unidad: 'tonf*m', esperado: 4.825, tol: 0.001, desc: 'Control: Mu = 4.825 tonf·m' },
      { var: 'Avf', unidad: 'cm^2', esperado: 6.0024, tol: 0.002, desc: 'Control: acero de corte-fricción' },
      { var: 'Af', unidad: 'cm^2', esperado: 3.454, tol: 0.002, desc: 'Control: acero por flexión' },
      { var: 'Asc', unidad: 'cm^2', esperado: 5.8223, tol: 0.002, desc: 'Control: acero principal' },
    ],
  },
  name: 'Ménsula (braquete) — cortante por fricción',
  desc: 'Límites av/d y Nuc, Vn máximo, Avf por cortante–fricción, Af por flexión, An por tracción, Asc mínimo, estribos Ah en 2/3 d, aplastamiento y dibujo de la ménsula.',
  titulo: 'Diseño de ménsula de concreto armado',
  blocks: [
    text(`# Generalidades
Ménsula corta que soporta la reacción de una viga prefabricada. Se aplica la NTE E.060 11.9 (equivalente al ACI 318-19 16.5): la sección en la cara del apoyo se diseña para el cortante $V_u$, el momento $M_u = V_u a_v + N_{uc}(h-d)$ y la tracción horizontal $N_{uc}$, con $\\phi = 0.85$ en todos los cálculos (11.9.3.1).`),
    calc(`# Datos
fc = 280 kgf/cm^2 // Concreto [175..420]
fy = 4200 kgf/cm^2 // Acero [2800..5000]
bw = 35 cm // Ancho de la ménsula (= ancho de la columna) [15..80]
bc = 40 cm // Dimensión de la columna en la elevación [25..150]
lc = 30 cm // Proyección de la ménsula [15..100]
h = 45 cm // Peralte en la cara de la columna [20..150]
hext = 25 cm // Peralte en el borde exterior [10..100]
d = 40 cm // Peralte efectivo [10..150]
av = 15 cm // Distancia de la carga a la cara [5..60]
Vu = 30 tonf // Reacción vertical amplificada [0..300]
Nuc = 6.5 tonf // Tracción horizontal amplificada (restricción de retracción, ≥ 0.2Vu) [0..100]
mu = 1.4 // Concreto monolítico (E.060 11.7.4.3) [1.4|1.0] [0.6..1.4]
lp = 15 cm // Longitud de la placa de apoyo (en la dirección de av) [5 cm..60 cm]
bp = 30 cm // Ancho de la placa de apoyo [10..100]
phi = 0.85 // E.060 11.9.3.1 [0.65..0.90]
## Límites de aplicación (E.060 11.9.1 y 11.9.2)
check av/d <= 1 // av/d ≤ 1
check Nuc <= Vu // Nuc ≤ Vu
check Nuc >= 0.2*Vu // Nuc ≥ 0.2 Vu (11.9.3.4)
check hext >= 0.5*d // Altura en el borde exterior ≥ 0.5 d (11.9.2)
## Resistencia máxima a cortante (E.060 11.9.3.2.1, Anexo II)
Vnmax = min(0.2*fc*bw*d, 55 kgf/cm^2*bw*d) -> tonf // Límite de Vn
check Vu <= phi*Vnmax // Sección suficiente
## Refuerzo
Avf = Vu/(phi*fy*mu) // Cortante por fricción (11-25)
Mu = Vu*av + Nuc*(h - d) -> tonf*m // Momento en la cara (11.9.3)
Af = asFlex(Mu, bw, d, fc, fy, phi) // Acero por flexión (11.9.3.3)
phiMnf = phi*Af*fy*(d - Af*fy/(2*0.85*fc*bw)) -> tonf*m // Resistencia a flexión con Af
check Mu <= phiMnf // La sección de la ménsula resiste Mu con Af (bloque de compresión dentro de d)
An = Nuc/(phi*fy) // Acero por tracción directa (11.9.3.4)
Asc = max(Af + An, 2/3*Avf + An, 0.04*fc/fy*bw*d) // Acero principal (11.9.3.5 y 11.9.5)
nsc = ceil(Asc/Ab(5)) // Barras #5
check nsc*Ab(5) >= Asc // Acero principal colocado
Ah = 0.5*(Asc - An) // Estribos cerrados paralelos a Asc (11.9.4)
neh = ceil(Ah/(2*Ab(3))) // Estribos #3 de dos ramas
check neh*2*Ab(3) >= Ah // Estribos colocados en los 2/3 d superiores
## Aplastamiento bajo la placa (E.060 10.17, φ = 0.70)
check Vu <= 0.70*0.85*fc*lp*bp // Resistencia al aplastamiento
"El refuerzo principal se ancla en el borde exterior soldándolo a una barra transversal de igual diámetro (11.9.6 a) y en la columna con gancho estándar: ℓdg = {ldgE060(5, fc, fy)}.`),
    { type: 'mensula', bc: 'bc', lc: 'lc', h: 'h', hext: 'hext', av: 'av', d: 'd', Vu: 'Vu', Nuc: 'Nuc', asc: '{nsc} #5', ah: '{neh} estribos #3', titulo: '' },
    summary(),
  ],
};

// ---------------------------------------------------------------------
// 17) VIGA DE GRAN PERALTE — PUNTAL-TENSOR (ACI 318-19 Cap. 23)
// ---------------------------------------------------------------------
const stm = {
  id: 'co-stm', pais: 'US', cat: 'Concreto — normas extranjeras', icon: 'beam', settings: { sys: 'si' }, normas: 'ACI 318-19 Cap. 9.9 y 23 (puntal-tensor) · NTE E.060 10.7 y 11.8',
  validacion: {
    fuente: 'ACI 318-19 Cap. 23 (puntal-tensor) — valores de control',
    nota: 'Los datos por defecto no reproducen un ejemplo publicado: los valores esperados son de control (calculados con la plantilla y comprobados a mano donde se indica) para detectar cambios. T = Pu/tan θ se comprueba en las pruebas.',
    valores: [
      { var: 'theta', unidad: 'deg', esperado: 48.208, tol: 0.002, desc: 'Control: ángulo del puntal' },
      { var: 'Fd', unidad: 'kN', esperado: 1207.1, tol: 0.002, desc: 'Control: fuerza en el puntal diagonal' },
      { var: 'Ft', unidad: 'kN', esperado: 804.47, tol: 0.002, desc: 'Control: fuerza en el tensor' },
      { var: 'Ast_req', unidad: 'mm^2', esperado: 2553.9, tol: 0.002, desc: 'Control: área requerida del tensor' },
      { var: 'wd_b', unidad: 'mm', esperado: 431.51, tol: 0.002, desc: 'Control: ancho del puntal en el apoyo' },
    ],
  },
  name: 'Viga de gran peralte — modelo puntal-tensor (ACI 318-19)',
  desc: 'Viga de transferencia con dos cargas: geometría del modelo, ancho del puntal superior por equilibrio, puntales, nudos CCC y CCT (βs, βn), tensor, refuerzo distribuido mínimo y anclaje.',
  titulo: 'Diseño de viga de gran peralte por el método puntal-tensor',
  blocks: [
    text(`# Generalidades
Viga de transferencia simplemente apoyada con dos cargas concentradas simétricas; con $\\ell_n/h \\le 4$ y cargas a menos de $2h$ del apoyo es una **viga de gran peralte** (ACI 318-19 9.9.1.1; NTE E.060 10.7.1) y se diseña con el **método puntal-tensor** del ACI 318-19 Cap. 23 (la NTE E.060 no incluye este método; lo permite 10.7.2 al exigir considerar la distribución no lineal de deformaciones). Se usa $\\phi = 0.75$ para puntales, tensores y nudos (ACI 318-19 Tabla 21.2.1).

Resistencias efectivas: puntales $f_{ce} = 0.85\\,\\beta_c\\,\\beta_s\\,f'_c$ (23.4.3) y nudos $f_{ce} = 0.85\\,\\beta_c\\,\\beta_n\\,f'_c$ (23.9.2).`),
    calc(`# Datos (unidades SI)
fc = 28 MPa // Resistencia del concreto [17..42]
fy = 420 MPa // Acero [280..550]
b = 400 mm // Ancho de la viga [20 cm..120 cm]
h = 1500 mm // Peralte total [500..3000]
L = 3600 mm // Luz entre ejes de apoyos [1000..15000]
a = 1200 mm // Distancia del apoyo a cada carga [300..5000]
lb = 400 mm // Longitud de la placa de apoyo [100..1000]
lp = 400 mm // Longitud de la placa de carga [5 cm..60 cm]
Pu = 900 kN // Cada carga amplificada [0..5000]
wt = 200 mm // Altura efectiva del tensor (dos capas, centroide a 100 mm) [50..500]
lext = 400 mm // Prolongación de la viga más allá del eje del apoyo [100..1000]
rext = 50 mm // Recubrimiento en el extremo de la viga [25..100]
phi = 0.75 // ACI 318-19 Tabla 21.2.1 [0.65..0.90]
## Clasificación (ACI 318-19 9.9.1.1)
ln = L - lb // Luz libre
check ln/h <= 4 // Viga de gran peralte
Vu = Pu // Cortante en el tramo de corte
check Vu <= phi*0.83*sqrtMPa(fc)*b*(h - wt/2) // Límite de cortante (9.9.2.1)
## Puntal superior y geometría (nudo CCC, βn = 1.0)
kc = phi*0.85*1.0*fc*b // Resistencia por unidad de ancho del puntal horizontal
hp = h - wt/2 // Distancia del tensor a la cara superior
check 2*Pu*a/kc <= hp^2 // El puntal superior puede equilibrar el momento Pu·a (existe solución para ws)
ws = roundup(hp - sqrt(max(hp^2 - 2*Pu*a/kc, 0 mm^2)), 5 mm) // Ancho del puntal horizontal por equilibrio (redondeado)
jd = hp - ws/2 // Brazo del par interno
theta = atan(jd/a) -> deg // Ángulo del puntal diagonal
check theta >= 25 deg // Ángulo mínimo puntal–tensor (23.2.7)
## Fuerzas en los elementos
Fd = Pu/sin(theta) // Puntal diagonal
Ft = Pu/tan(theta) // Tensor (= puntal horizontal)
## Puntales
wd_b = lb*sin(theta) + wt*cos(theta) // Ancho del puntal diagonal en el nudo inferior
wd_t = lp*sin(theta) + ws*cos(theta) // Ancho del puntal diagonal en el nudo superior
betas = 0.75 // Puntal interior con refuerzo distribuido según 23.5 (Tabla 23.4.3 a) [0.4..1.0]
check Fd <= phi*0.85*betas*fc*b*min(wd_b, wd_t) // Resistencia del puntal diagonal
check Ft <= phi*0.85*1.0*fc*b*ws // Puntal horizontal (de borde, βs = 1.0)
## Nudos (ACI 318-19 23.9)
check Pu <= phi*0.85*0.8*fc*b*lb // Nudo CCT: aplastamiento en la placa de apoyo (βn = 0.8)
check Fd <= phi*0.85*0.8*fc*b*wd_b // Nudo CCT: cara del puntal diagonal
check Pu <= phi*0.85*1.0*fc*b*lp // Nudo CCC: placa de carga (βn = 1.0)
## Tensor (ACI 318-19 23.7)
Ast_req = Ft/(phi*fy) // Acero requerido del tensor
nt = 6 // Barras del tensor (dos capas) [2..20]
dbt = 25 mm // Diámetro de las barras del tensor [22 mm|25 mm|28 mm] [19..36]
Ast = nt*pi*dbt^2/4 // Acero colocado
check Ast >= Ast_req // Resistencia del tensor
ldh = ldhACI(dbt, fc, fy) // Anclaje con gancho (25.4.3)
lanc = lb/2 + wt/2*cot(theta) + lext - rext // Longitud disponible desde el punto en que el eje del tensor sale de la zona nodal extendida hasta el extremo de la barra (23.8.3)
check ldh <= lanc // Anclaje del tensor en la zona nodal extendida (23.8.3)
## Refuerzo distribuido mínimo (ACI 318-19 9.9.3 y 23.5)
dbw = 12 mm // Barras del refuerzo distribuido [10..20]
sw = 200 mm // Espaciamiento en cada cara [100..300]
rhow = 2*pi*dbw^2/4/(b*sw) // Cuantía vertical y horizontal
check rhow >= 0.0025 // Cuantía mínima en cada dirección
check sw <= min((h - wt/2)/5, 300 mm) // Espaciamiento máximo d/5 y 300 mm (9.9.3.1), d = h − wt/2`),
    { type: 'stmbeam', L: 'L', h: 'h', a: 'a', lb: 'lb', lp: 'lp', ws: 'ws', wt: 'wt', lext: 'lext', Fd: 'Fd', Ft: 'Ft', Pu: 'Pu', titulo: '' },
    summary(),
  ],
};

// ---------------------------------------------------------------------
// 18) LONGITUDES DE DESARROLLO, GANCHOS Y EMPALMES (E.060 Cap. 12)
// ---------------------------------------------------------------------
const anclajes = {
  id: 'co-anclajes', pais: 'PE', cat: CAT, icon: 'table', normas: E060 + ' — Cap. 7 y 12 (Anexo II MKS)',
  validacion: {
    fuente: 'NTE E.060-2009 Cap. 7 y 12 (Anexo II MKS) — valores de control calculados a mano',
    nota: 'Los datos por defecto no reproducen un ejemplo publicado: los valores esperados son de control (calculados con la plantilla y comprobados a mano donde se indica) para detectar cambios. ℓdg = 0.075·fy·db/√f\'c = 41.41 cm y diámetro de doblez 6db = 11.43 cm para 3/4".',
    valores: [
      { var: 'ldg6', unidad: 'cm', esperado: 41.409, tol: 0.001, desc: 'E.060 12.5.2: ℓdg 3/4" = 41.41 cm' },
      { var: 'Ddob', unidad: 'cm', esperado: 11.43, tol: 0.001, desc: 'E.060 Tabla 7.1: doblez 6db de 3/4"' },
      { var: 'ld6', unidad: 'cm', esperado: 87.531, tol: 0.002, desc: 'Control: ℓd de 3/4", barra superior (Tabla 12.1)' },
      { var: 'ld6g', unidad: 'cm', esperado: 65.624, tol: 0.002, desc: 'Control: ℓd de 3/4" con la ec. 12-1' },
      { var: 'ls6', unidad: 'cm', esperado: 113.79, tol: 0.002, desc: 'Control: empalme clase B, barra superior' },
    ],
  },
  name: 'Longitudes de desarrollo, ganchos y empalmes (tabla)',
  desc: 'Tabla de ℓd (barras inferiores y superiores), ℓd por la ec. 12-1, ℓdg con gancho estándar, ℓdc en compresión y empalmes clase A, B y en compresión para barras de 3/8" a 1".',
  titulo: 'Longitudes de desarrollo y empalmes del refuerzo',
  blocks: [
    text(`# Generalidades
Se tabulan las longitudes de anclaje y de empalme por traslape de barras corrugadas según la NTE E.060 Cap. 12, con las ecuaciones en el sistema MKS del Anexo II:
- **Tracción, Tabla 12.1** (espaciamiento libre ≥ db, recubrimiento ≥ db y estribos mínimos): $\\ell_d = \\dfrac{f_y\\,\\psi_t\\,\\psi_e\\,\\lambda}{8.2\\sqrt{f'_c}}\\,d_b$ para barras de 3/4" y menores y $\\dfrac{f_y\\,\\psi_t\\,\\psi_e\\,\\lambda}{6.6\\sqrt{f'_c}}\\,d_b$ para 7/8" y mayores, $\\ge 300$ mm.
- **Gancho estándar, 12.5.2:** $\\ell_{dg} = 0.075\\,\\psi_e\\,\\lambda\\,f_y\\,d_b/\\sqrt{f'_c} \\ge \\max(8d_b, 150\\text{ mm})$.
- **Compresión, 12.3.2:** $\\ell_{dc} = \\max(0.075 f_y d_b/\\sqrt{f'_c},\\ 0.0044 f_y d_b) \\ge 200$ mm.
- **Empalmes, 12.15 y 12.16:** clase A = 1.0 $\\ell_d$, clase B = 1.3 $\\ell_d$ (≥ 300 mm); compresión $0.007 f_y d_b$ (≥ 300 mm).

Barras superiores: $\\psi_t = 1.3$ (con más de 300 mm de concreto fresco debajo).`),
    calc(`# Datos
fc = 210 kgf/cm^2 // Concreto [175 kgf/cm^2|210 kgf/cm^2|280 kgf/cm^2|350 kgf/cm^2] [175..420]
fy = 4200 kgf/cm^2 // Acero [2800..5000]
psie = 1.0 // Sin recubrimiento epóxico (Tabla 12.2) [1.0|1.2|1.5] [1.0..1.5]
lambda = 1.0 // Concreto de peso normal [1.0|1.3] [1.0..1.3]
## Ejemplo de cálculo: barra de 3/4" superior
ld6 = ldE060(6, fc, fy, 1.3, psie, lambda) // ℓd en tracción, barra superior (Tabla 12.1)
ld6g = ldGenE060(6, fc, fy, 2.5, 1.3, psie, lambda) // Con la ec. 12-1 y (cb+Ktr)/db = 2.5
ldg6 = ldgE060(6, fc, fy, psie, lambda) // Gancho estándar de 90° (12.5.2)
l_ext = 12*db(6) // Extensión recta del gancho de 90° (7.1.2)
Ddob = 6*db(6) // Diámetro mínimo de doblado (Tabla 7.1)
ls6 = lsE060(6, fc, fy, 2, 1.3, psie, lambda) // Empalme clase B, barra superior
check ld6g <= ld6 // La ecuación general con confinamiento favorable reduce ℓd`),
    { type: 'table', columnas: 'Barra = ["3/8\\"", "1/2\\"", "5/8\\"", "3/4\\"", "7/8\\"", "1\\""]\ndb [cm] = [db(3), db(4), db(5), db(6), db(7), db(8)]\nℓd inferior [cm] = [ldE060(3, fc, fy, 1, psie, lambda), ldE060(4, fc, fy, 1, psie, lambda), ldE060(5, fc, fy, 1, psie, lambda), ldE060(6, fc, fy, 1, psie, lambda), ldE060(7, fc, fy, 1, psie, lambda), ldE060(8, fc, fy, 1, psie, lambda)]\nℓd superior [cm] = [ldE060(3, fc, fy, 1.3, psie, lambda), ldE060(4, fc, fy, 1.3, psie, lambda), ldE060(5, fc, fy, 1.3, psie, lambda), ldE060(6, fc, fy, 1.3, psie, lambda), ldE060(7, fc, fy, 1.3, psie, lambda), ldE060(8, fc, fy, 1.3, psie, lambda)]\nℓdg gancho [cm] = [ldgE060(3, fc, fy, psie, lambda), ldgE060(4, fc, fy, psie, lambda), ldgE060(5, fc, fy, psie, lambda), ldgE060(6, fc, fy, psie, lambda), ldgE060(7, fc, fy, psie, lambda), ldgE060(8, fc, fy, psie, lambda)]\nℓdc compresión [cm] = [ldcE060(3, fc, fy), ldcE060(4, fc, fy), ldcE060(5, fc, fy), ldcE060(6, fc, fy), ldcE060(7, fc, fy), ldcE060(8, fc, fy)]\nEmpalme B inf. [cm] = [lsE060(3, fc, fy, 2), lsE060(4, fc, fy, 2), lsE060(5, fc, fy, 2), lsE060(6, fc, fy, 2), lsE060(7, fc, fy, 2), lsE060(8, fc, fy, 2)]\nEmpalme B sup. [cm] = [lsE060(3, fc, fy, 2, 1.3), lsE060(4, fc, fy, 2, 1.3), lsE060(5, fc, fy, 2, 1.3), lsE060(6, fc, fy, 2, 1.3), lsE060(7, fc, fy, 2, 1.3), lsE060(8, fc, fy, 2, 1.3)]\nEmpalme compr. [cm] = [lscE060(3, fc, fy), lscE060(4, fc, fy), lscE060(5, fc, fy), lscE060(6, fc, fy), lscE060(7, fc, fy), lscE060(8, fc, fy)]', dec: '1', titulo: 'Longitudes de desarrollo y empalme para f\'c = {fc} y fy = {fy}' },
    text(`## Notas
1. Los empalmes en tracción son clase B salvo que $A_{s,prov}/A_{s,req} \\ge 2$ y se empalme a lo más el 50 % del acero (clase A, Tabla 12.3).
2. En elementos con responsabilidad sísmica no se permite reducir $\\ell_d$ por refuerzo en exceso (12.2.5) y los empalmes deben ubicarse fuera de las zonas de confinamiento (21.5.2.3, 21.6.3.2).
3. En muros estructurales, en las zonas de posible fluencia, las longitudes de desarrollo se multiplican por 1.25 (21.9.4.5 c).
4. Para concreto liviano $\\lambda = 1.3$; para barras con recubrimiento epóxico $\\psi_e = 1.2$ ó 1.5 ($\\psi_t\\psi_e \\le 1.7$).`),
    summary(),
  ],
};
export default [placa, colEsbelta, colBiaxial, vigaDuctil, colDuctil, nudo, vigaT, vigaDoble, torsion, deflexion, voladizo, losa2d, losa1d, aligerado2d, punzonamiento, mensula, stm, anclajes];
