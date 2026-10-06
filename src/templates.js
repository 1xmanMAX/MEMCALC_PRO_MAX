// Plantillas de memorias de cálculo (NTE E.020 / E.030 / E.050 / E.060, ACI 318, AASHTO LRFD, AISC 360)
const calc = (src) => ({ type: 'calc', src: src.trim() });
const text = (src) => ({ type: 'text', src: src.trim() });

import { EXTRA_TEMPLATES } from './templates/index.js';

const BASE_TEMPLATES = [
  // ------------------------------------------------------------------
  {
    id: 'viga', normas: 'RNE — NTE E.060 Concreto Armado', cat: 'Concreto armado', name: 'Viga — flexión y cortante', icon: 'beam',
    desc: 'Diseño de viga rectangular a flexión simple y cortante según NTE E.060. Cuantías, ductilidad, espaciamientos y sección dibujada.',
    titulo: 'Diseño de viga de concreto armado',
    validacion: {
      fuente: 'Control: NTE E.060 (flexión simple y cortante, Art. 10 y 11)',
      nota: 'Los datos por defecto no reproducen un ejemplo publicado: son valores de control de esta implementación (regresión). d = 60 − 4 − 0.95 − 1.905/2 cm y As = ρbd se comprueban a mano.',
      valores: [
        { var: 'd', unidad: 'cm', esperado: 54.0945, tol: 0.0005, desc: 'Peralte efectivo' },
        { var: 'As', unidad: 'cm^2', esperado: 11.76, tol: 0.002, desc: 'Acero requerido' },
        { var: 'phiMn', unidad: 'tonf*m', esperado: 26.05, tol: 0.002, desc: 'Momento resistente' },
        { var: 'Vc', unidad: 'tonf', esperado: 12.46, tol: 0.002, desc: 'Resistencia del concreto 0.53√f′c·b·d' },
        { var: 's', unidad: 'cm', esperado: 25, tol: 0.0001, desc: 'Espaciamiento de estribos' },
      ],
    },
    blocks: [
      text(`# Generalidades
La presente memoria desarrolla el diseño por resistencia de una viga rectangular de concreto armado sometida a flexión simple y fuerza cortante, conforme a la **Norma Técnica E.060 Concreto Armado** (2009) del Reglamento Nacional de Edificaciones. Las solicitaciones últimas provienen del análisis estructural con la envolvente de las combinaciones del Art. 9.2 ($U = 1.4\\,CM + 1.7\\,CV$; $1.25(CM + CV) \\pm CS$; $0.9\\,CM \\pm CS$).

> Diseño por resistencia de una sección. Para vigas de pórticos sismorresistentes con cortante por capacidad ($M_{pr}$, Art. 21.5) use *co-vigaductil*; para secciones T o doblemente reforzadas, *co-vigat* y *co-vigadoble*; para deflexiones, *co-deflexion*.`),
      calc(`# Datos de diseño
fc = 210 kgf/cm^2 // Resistencia a compresión del concreto [175 kgf/cm^2|210 kgf/cm^2|280 kgf/cm^2|350 kgf/cm^2]
fy = 4200 kgf/cm^2 // Esfuerzo de fluencia del acero (ASTM A615 Gr. 60) [2800..4200]
Es = 2000000 kgf/cm^2 // Módulo de elasticidad del acero [1900000..2100000]
b = 30 cm // Ancho de la sección [25..60]
h = 60 cm // Peralte total [30..100]
rec = 4 cm // Recubrimiento libre al estribo [3..5]
bar = 6 // Varilla longitudinal [4 : 1/2"|5 : 5/8"|6 : 3/4"|8 : 1"]
est = 3 // Varilla del estribo [3 : 3/8"|4 : 1/2"]
Mu = 22 tonf*m // Momento último de diseño [1..100]
Vu = 18 tonf // Cortante último a una distancia "d" de la cara [1..100]
## Parámetros de la sección
dr = rec + db(est) + db(bar)/2 // Distancia del borde al centroide del acero
d = h - dr // Peralte efectivo
beta1 = si(fc <= 280 kgf/cm^2, 0.85, max(0.65, 0.85 - 0.05*(fc - 280 kgf/cm^2)/(70 kgf/cm^2))) // E.060 Art. 10.2.7.3
phif = 0.90 // Factor de reducción por flexión (E.060 9.3.2.1)`),
      calc(`## Diseño por flexión
Rn = Mu/(phif*b*d^2) // Parámetro de resistencia
check Rn <= 0.85*fc/2 // Sección suficiente como simplemente reforzada (si no cumple, aumentar la sección o usar acero en compresión)
rho = 0.85*fc/fy*(1 - sqrt(max(1 - 2*Rn/(0.85*fc), 0))) // Cuantía requerida
As = rho*b*d // Acero requerido
Asmin = 0.7*sqrtfc(fc)/fy*b*d // Acero mínimo (E.060 Art. 10.5.2)
rhob = 0.85*beta1*fc/fy*(0.003*Es/(0.003*Es + fy)) // Cuantía balanceada
Asmax = 0.75*rhob*b*d // Acero máximo (E.060 Art. 10.3.4)
Asd = max(As, Asmin) // Acero de diseño
n = max(2, ceil(Asd/Ab(bar))) // Número de varillas (mín. 2)
Asc = n*Ab(bar) // Acero colocado
check Asc >= Asd // Acero colocado ≥ acero requerido
check Asc <= Asmax // Falla dúctil (As ≤ 0.75 Asb)
a = Asc*fy/(0.85*fc*b) // Profundidad del bloque equivalente
c = a/beta1 // Profundidad del eje neutro
epst = 0.003*(d - c)/c // Deformación unitaria del acero en tracción
"Deformación $\\varepsilon_t$ = {epst}: referencial ACI 318 (E.060 controla la ductilidad con $\\rho \\le 0.75\\rho_b$).
phiMn = phif*Asc*fy*(d - a/2) -> tonf*m // Momento resistente de diseño
check Mu <= phiMn // Resistencia a flexión
sl = (b - 2*rec - 2*db(est) - n*db(bar))/max(n - 1, 1) // Espaciamiento libre entre varillas
check sl >= max(2.5 cm, db(bar)) // Espaciamiento mínimo (E.060 Art. 7.6.1)`),
      calc(`## Diseño por cortante
phiv = 0.85 // Factor de reducción por cortante (E.060 9.3.2.3)
Vc = 0.53*sqrtfc(fc)*b*d // Resistencia del concreto (E.060 11.3.1.1)
Vs = max(Vu/phiv - Vc, 0 tonf) // Resistencia requerida del refuerzo
Vsmax = 2.1*sqrtfc(fc)*b*d // Límite (E.060 11.5.7.9)
check Vs <= Vsmax // Dimensiones de la sección adecuadas
Av = 2*Ab(est) // Área de refuerzo por cortante (2 ramas)
s1 = si(Vs > 0 tonf, Av*fy*d/Vs, 100 cm) // Espaciamiento requerido por resistencia
smax = si(Vs <= 1.1*sqrtfc(fc)*b*d, min(d/2, 60 cm), min(d/4, 30 cm)) // Espaciamiento máximo (E.060 11.5.5)
s = rounddown(max(min(s1, smax), 2.5 cm), 2.5 cm) // Espaciamiento adoptado (múltiplo de 2.5 cm)
phiVn = phiv*(Vc + Av*fy*d/s) -> tonf // Resistencia de diseño a cortante
check Vu <= phiVn // Resistencia a cortante
Avmin = max(0.2*sqrtfc(fc)*b*s/fy, 3.5 kgf/cm^2*b*s/fy) // Refuerzo mínimo por cortante (E.060 11.5.6.2; exigido si Vu > 0.5 φVc, 11.5.6.1)
check Av >= Avmin // Área mínima de estribos
## Confinamiento en vigas sísmicas (E.060 21.4.4.4 — muros estructurales o dual tipo I)
so = rounddown(min(max(d/4, 15 cm), 10*db(bar), 24*db(est), 30 cm), 2.5 cm) // Zona confinada: d/4 (no menor de 15 cm), 10 db, 24 de, 30 cm
Lconf = 2*h // Longitud de confinamiento desde la cara del apoyo (21.4.4.4)
check s <= d/2 // Fuera de la zona confinada s ≤ 0.5 d (21.4.4.5)
"Distribución de estribos #{est}: 1 @ 5 cm (≤ 10 cm de la cara), resto @ {min(so, s)} en {Lconf} a cada extremo; resto @ {s}. El cortante de diseño de vigas sísmicas debe además cumplir 21.4.3 (capacidad o 2.5 CS).`),
      { type: 'section', b: 'b', h: 'h', recub: 'rec', estribo: 'est', inf: '{min(n, 12)}#{bar}', sup: '2#4', lat: '0', sest: '@ {s}', titulo: 'Sección de diseño de la viga' },
      { type: 'summary' },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'vigacont', normas: 'RNE — NTE E.020 Cargas, E.060 Concreto Armado', cat: 'Concreto armado', name: 'Viga continua — análisis y diseño', icon: 'beam',
    desc: 'Metrado de cargas, análisis por rigidez con alternancia de carga viva, diagramas V-M-δ y diseño del acero positivo y negativo.',
    titulo: 'Análisis y diseño de viga continua',
    validacion: {
      fuente: 'Control: viga continua de 3 tramos por rigidez (bloque beam, validado con coeficientes clásicos en tests/verify.mjs) y NTE E.060',
      nota: 'Los datos por defecto no reproducen un ejemplo publicado: son valores de control de esta implementación (regresión).',
      valores: [
        { var: 'wD', unidad: 'tonf/m', esperado: 2.032, tol: 0.0005, desc: 'Carga muerta lineal' },
        { var: 'Mneg', unidad: 'tonf*m', esperado: -13.37, tol: 0.002, desc: 'Momento negativo máximo' },
        { var: 'Mpos', unidad: 'tonf*m', esperado: 8.543, tol: 0.002, desc: 'Momento positivo máximo' },
        { var: 'R2', unidad: 'tonf', esperado: 26.24, tol: 0.002, desc: 'Reacción en el apoyo interior' },
        { var: 'phiMn_neg', unidad: 'tonf*m', esperado: 15.31, tol: 0.002, desc: 'Resistencia negativa' },
      ],
    },
    blocks: [
      calc(`# Metrado de cargas (NTE E.020)
L1 = 5.0 m // Luz del tramo 1 [3..8]
L2 = 6.0 m // Luz del tramo 2 [3..8]
L3 = 5.0 m // Luz del tramo 3 [3..8]
At = 4.0 m // Ancho tributario [3..8]
b = 30 cm // Ancho de viga [25..50]
h = 60 cm // Peralte de viga [40..80]
gammac = 2.4 tonf/m^3 // Peso específico del concreto armado [2.2..2.5]
wal = 0.30 tonf/m^2 // Peso propio losa aligerada h = 20 cm [0.28..0.42]
wpt = 0.10 tonf/m^2 // Piso terminado [0.05..0.15]
sc = 0.20 tonf/m^2 // Sobrecarga (vivienda) [0.20 tonf/m^2|0.25 tonf/m^2|0.30 tonf/m^2|0.40 tonf/m^2|0.50 tonf/m^2]
fc = 210 kgf/cm^2 // Resistencia del concreto [175..420]
fy = 4200 kgf/cm^2 // Fluencia del acero [2800..4200]
wpp = gammac*b*h -> tonf/m // Peso propio de la viga
wD = wpp + (wal + wpt)*At -> tonf/m // Carga muerta total
wL = sc*At -> tonf/m // Carga viva total
Ec = 15000*sqrtfc(fc) // Módulo de elasticidad (E.060 8.5.1)
Ig = b*h^3/12 // Inercia bruta`),
      text(`## Análisis estructural
Se analiza la viga por el método de rigidez considerando la combinación $U = 1.4\\,CM + 1.7\\,CV$ con **alternancia de la carga viva** en todos los tramos para obtener la envolvente de esfuerzos.`),
      { type: 'beam', tramos: 'L1, L2, L3', apoyos: 'A, A, A, A', E: 'Ec', I: 'Ig', cargas: 'CM: U * 1.4*wD\nCV: U * 1.7*wL', alternancia: true, titulo: 'Envolvente de esfuerzos de la viga continua' },
      calc(`## Diseño del refuerzo longitudinal
d = h - 6 cm // Peralte efectivo
phif = 0.9 // Factor de reducción por flexión
Asreq(M) = 0.85*fc*b*d/fy*(1 - sqrt(max(1 - 2*M/(0.85*phif*fc*b*d^2), 0)))
check max(Mpos, abs(Mneg)) <= 0.85*phif*fc*b*d^2/2 // Sección suficiente como simplemente reforzada
Asmin = 0.7*sqrtfc(fc)/fy*b*d // Acero mínimo (E.060 10.5.2)
Asmax = 0.75*0.85*0.85*fc/fy*6000 kgf/cm^2/(6000 kgf/cm^2 + fy)*b*d -> cm^2 // 0.75 Asb con β1 = 0.85 (E.060 10.3.4)
As_pos = max(Asreq(Mpos), Asmin) // Acero positivo (máximo de tramos)
As_neg = max(Asreq(abs(Mneg)), Asmin) // Acero negativo (apoyo crítico)
n_pos = ceil(As_pos/Ab(5)) // Varillas de 5/8" (positivo)
n_neg = ceil(As_neg/Ab(5)) // Varillas de 5/8" (negativo)
phiMn_pos = phif*n_pos*Ab(5)*fy*(d - n_pos*Ab(5)*fy/(1.7*fc*b)) -> tonf*m
phiMn_neg = phif*n_neg*Ab(5)*fy*(d - n_neg*Ab(5)*fy/(1.7*fc*b)) -> tonf*m
check Mpos <= phiMn_pos // Flexión positiva
check abs(Mneg) <= phiMn_neg // Flexión negativa
check max(n_pos, n_neg)*Ab(5) <= Asmax // Falla dúctil: As ≤ 0.75 Asb (E.060 10.3.4)
## Control de cortante (E.060 11.3 y 11.5)
phiVc = 0.85*0.53*sqrtfc(fc)*b*d -> tonf // Resistencia del concreto
Vsr = max(Vmax/0.85 - 0.53*sqrtfc(fc)*b*d, 0 tonf) // Resistencia requerida del refuerzo (Vmax en el eje, conservador)
check Vsr <= 2.1*sqrtfc(fc)*b*d // Vs ≤ 0.66√f'c bw d (11.5.7.9)
sv = rounddown(max(min(si(Vsr > 0 tonf, 2*Ab(3)*fy*d/max(Vsr, 0.01 tonf), 60 cm), si(Vsr <= 1.1*sqrtfc(fc)*b*d, min(d/2, 60 cm), min(d/4, 30 cm))), 2.5 cm), 2.5 cm) // Estribos #3 de 2 ramas (11.5.5)
"Cortante máximo de la envolvente: {Vmax}. Estribos de 3/8\" @ {sv} en la zona de cortante máximo; en vigas sismorresistentes complete con el confinamiento de 21.4.4 (plantilla *viga*) o 21.5 (*co-vigaductil*).
## Momentos en la cara de apoyos
"Los momentos y cortantes provienen de ejes de apoyo; el diseño en la cara del apoyo (y el cortante a "d") resulta igual o menos exigente.`),
      text(`## Deflexión inmediata por carga viva de servicio
Se analiza la viga con la carga viva **sin factorar** para controlar la deflexión inmediata según la Tabla 9.2 de la NTE E.060.`),
      { type: 'beam', tramos: 'L1, L2, L3', apoyos: 'A, A, A, A', E: 'Ec', I: 'Ig', cargas: 'U * wL', alternancia: false, sufijo: 'CV', titulo: 'Deflexión inmediata por carga viva de servicio' },
      calc(`deltaadm = (L2/360) -> mm // Límite por carga viva inmediata (E.060 9.6.2.6, Tabla 9.2)
check deltamax_CV <= deltaadm // Deflexión inmediata por CV (sección bruta)
"La deflexión con la inercia bruta $I_g$ es un **control rápido**: la E.060 9.6.2.4 exige la inercia efectiva $I_e$ de la sección fisurada y 9.6.2.5 la deflexión diferida. Para ese cálculo use la plantilla *co-deflexion*.`),
      { type: 'summary' },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'columna', normas: 'RNE — NTE E.060 Concreto Armado (Cap. 10 y 21)', cat: 'Concreto armado', name: 'Columna — flexocompresión', icon: 'column',
    desc: 'Diagrama de interacción P–M por compatibilidad de deformaciones, verificación de combinaciones, cuantía y confinamiento sísmico.',
    titulo: 'Diseño de columna de concreto armado',
    validacion: {
      fuente: 'Control: NTE E.060 Cap. 10 y 21 (diagrama P-M y confinamiento)',
      nota: 'Los datos por defecto no reproducen un ejemplo publicado: son valores de control de esta implementación (regresión). so = min(b/3, 6db, 10 cm) = 10 cm y s fuera de Lo = min(10db, 25 cm) se comprueban a mano (tests/verify.mjs).',
      valores: [
        { var: 'phiPnmax', unidad: 'tonf', esperado: 329.6, tol: 0.002, desc: 'φPn,máx = 0.7·0.8·P0' },
        { var: 'rhog', esperado: 0.0142, tol: 0.001, desc: 'Cuantía de acero' },
        { var: 'so', unidad: 'cm', esperado: 10, tol: 0.0001, desc: 'Espaciamiento en Lo' },
        { var: 's_fuera', unidad: 'cm', esperado: 17.5, tol: 0.0001, desc: 'Espaciamiento fuera de Lo' },
        { var: 'DCpm', esperado: 0.7096, tol: 0.002, desc: 'D/C en el diagrama P-M' },
      ],
    },
    blocks: [
      calc(`# Datos de la columna
b = 40 cm // Dimensión perpendicular al plano de flexión [25..100]
h = 50 cm // Dimensión en el plano de flexión [25..100]
fc = 280 kgf/cm^2 // Resistencia del concreto [210 kgf/cm^2|280 kgf/cm^2|350 kgf/cm^2]
fy = 4200 kgf/cm^2 // Fluencia del acero [2800..4200]
rd = 6 cm // Recubrimiento al centro de las barras [5..8]
nx = 3 // Barras por cara (paralelas a b) [2..8]
ny = 2 // Barras intermedias por cara lateral [0..6]
bar = 6 // Varilla longitudinal [5 : 5/8"|6 : 3/4"|8 : 1"]
ln = 2.70 m // Luz libre de la columna [2..6]`),
      text(`## Combinaciones de diseño (E.060 Art. 9.2)
Las cargas axiales y momentos últimos se ingresan en el diagrama como pares $(P_u, M_u)$, uno por línea. Los momentos ya deben incluir los efectos de esbeltez (E.060 10.10–10.13).

> Verificación rápida de una dirección. Para flexión biaxial use *co-biaxial*; para esbeltez, *co-colesbelta*; para el diseño por capacidad (columna fuerte–viga débil y cortante con $M_{pr}$, Art. 21.6.2 y 21.6.5) use *co-colductil*; para secciones arbitrarias (L, T, placas) el bloque **pmgen**.`),
      { type: 'pm', b: 'b', h: 'h', fc: 'fc', fy: 'fy', dp: 'rd', nx: 'nx', ny: 'ny', barra: 'bar', norma: 'E060', demandas: '180 tonf, 12 tonf*m // 1.4CM+1.7CV\n140 tonf, 22 tonf*m // 1.25(CM+CV)+CS\n95 tonf, 20 tonf*m // 0.9CM+CS', titulo: '' },
      calc(`## Verificaciones complementarias
Ag = b*h // Área bruta
Ast = (2*nx + 2*ny)*Ab(bar) // Acero longitudinal total
rhog = Ast/Ag // Cuantía
check rhog >= 0.01 // Cuantía mínima (E.060 10.9.1 y 21.6.3.1)
check rhog <= 0.06 // Cuantía máxima (E.060 10.9.1 y 21.6.3.1)
check min(DCpm, 99) <= 1.0 // Todas las combinaciones dentro del diagrama (D/C = 99 si alguna Pu excede φPn,máx)
check min(b, h) >= 25 cm // Dimensión menor de la sección ≥ 250 mm (E.060 21.6.1.2)
check min(b, h)/max(b, h) >= 0.25 // Relación entre dimensiones ≥ 0.25 (E.060 21.6.1.3)
## Confinamiento sísmico — pórticos y dual tipo II (E.060 Art. 21.6.4)
est = 4 // Varilla de estribos [3 : 3/8"|4 : 1/2"]
check est >= si(bar <= 8, 3, 4) // Estribo mínimo: 3/8" para barras hasta 1", 1/2" para barras mayores (E.060 21.4.5.3)
recl = 4 cm // Recubrimiento libre al estribo [3..5]
Lo = max(ln/6, max(b, h), 50 cm) -> cm // Longitud de la zona de confinamiento (21.6.4.4)
so = rounddown(min(min(b, h)/3, 6*db(bar), 10 cm), 2.5 cm) // Espaciamiento en la zona confinada: b/3, 6 db, 100 mm (21.6.4.2)
s_fuera = rounddown(min(10*db(bar), 25 cm), 2.5 cm) // Espaciamiento fuera de Lo: 10 db y 250 mm (21.6.4.5)
n_ramas = 3 // Ramas de estribo perpendiculares a bc (estribo + grapa) [2..6]
bc = b - 2*recl - db(est) // Dimensión del núcleo, centro a centro del estribo exterior (21.6.4.1 b)
Ach = (b - 2*recl)*(h - 2*recl) // Área del núcleo al exterior del estribo
Ash_req = max(0.3*so*bc*fc/fy*(Ag/Ach - 1), 0.09*so*bc*fc/fy) // Refuerzo de confinamiento (ec. 21-3 y 21-4)
Ash = n_ramas*Ab(est) // Refuerzo colocado
check Ash >= Ash_req // Confinamiento (E.060 21.6.4.1 b)
hx = bc/(n_ramas - 1) // Separación entre ramas
check hx <= 35 cm // hx ≤ 350 mm (21.6.4.3)
"Estribos #{est}: 1 @ 5 cm, resto @ {so} en {roundup(Lo, 5 cm)} desde cada extremo, resto @ {s_fuera}. El espaciamiento también debe cumplir el requerido por el cortante de diseño por capacidad (21.6.5, ver *co-colductil*).`),
      { type: 'summary' },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'zapata', normas: 'RNE — NTE E.050 Suelos y Cimentaciones, E.060 Concreto Armado', cat: 'Cimentaciones', name: 'Zapata aislada', icon: 'footing',
    desc: 'Dimensionamiento por presión admisible, excentricidad, punzonamiento, cortante unidireccional y flexión en ambas direcciones (E.060 / E.050).',
    titulo: 'Diseño de zapata aislada',
    validacion: {
      fuente: 'Control: NTE E.050-2018 (Art. 21: qa sísmica = 1.20 qa) y E.060 Cap. 11 y 15',
      nota: 'Los datos por defecto no reproducen un ejemplo publicado: son valores de control de esta implementación (regresión). qn = qa − γm·Df − s/c = 25 − 3 − 0.25 t/m² se comprueba a mano.',
      valores: [
        { var: 'qn', unidad: 'tonf/m^2', esperado: 21.75, tol: 0.0005, desc: 'Presión neta' },
        { var: 'B', unidad: 'm', esperado: 2.05, tol: 0.002, desc: 'Ancho adoptado' },
        { var: 'L', unidad: 'm', esperado: 2.15, tol: 0.002, desc: 'Largo adoptado' },
        { var: 'Vup', unidad: 'tonf', esperado: 100.2, tol: 0.002, desc: 'Cortante de punzonamiento' },
        { var: 'phiVcp', unidad: 'tonf', esperado: 255, tol: 0.002, desc: 'Resistencia al punzonamiento' },
        { var: 'As_L', unidad: 'cm^2', esperado: 22.14, tol: 0.002, desc: 'Acero en la dirección L' },
      ],
    },
    blocks: [
      calc(`# Datos
PD = 60 tonf // Carga muerta de servicio [5..500]
PL = 25 tonf // Carga viva de servicio [0..300]
MD = 2.0 tonf*m // Momento de servicio por carga muerta (dirección L) [0..50]
ML = 1.0 tonf*m // Momento de servicio por carga viva (dirección L) [0..50]
PS = 5 tonf // Axial por sismo (servicio, del análisis con E.030) [0..100]
MS = 4.0 tonf*m // Momento por sismo (servicio, dirección L) [0..100]
qa = 2.5 kgf/cm^2 // Presión admisible del suelo (Estudio de Mecánica de Suelos, E.050 Art. 22) [0.5..6]
Df = 1.50 m // Profundidad de desplante [0.8..3]
gammam = 2.0 tonf/m^3 // Peso unitario promedio suelo-concreto [1.8..2.2]
spiso = 0.25 tonf/m^2 // Sobrecarga sobre el piso [0..0.5]
c1 = 50 cm // Dimensión de la columna en dirección L [25..100]
c2 = 40 cm // Dimensión de la columna en dirección B [25..100]
fc = 210 kgf/cm^2 // Resistencia del concreto [175..420]
fy = 4200 kgf/cm^2 // Fluencia del acero [2800..4200]
hz = 60 cm // Peralte de la zapata [30..120]
bar = 5 // Varilla de refuerzo [4 : 1/2"|5 : 5/8"|6 : 3/4"]
barcol = 6 // Varilla longitudinal de la columna [5 : 5/8"|6 : 3/4"|8 : 1"]
check Df >= 0.80 m // Profundidad mínima de cimentación (E.050 Art. 26.2)
## Dimensionamiento en planta
qn = qa - gammam*Df - spiso -> tonf/m^2 // Capacidad portante neta
check qn > 0 tonf/m^2 // Capacidad neta positiva
P = PD + PL // Carga de servicio
M = MD + ML // Momento de servicio
e = M/P -> m // Excentricidad
A0 = P/max(qn, 1 tonf/m^2) -> m^2 // Área por carga axial
Areq = A0*(1 + 6*e/sqrt(A0)) -> m^2 // Área requerida incluyendo excentricidad
Dc = c1 - c2 // Diferencia de lados (volados iguales)
B = roundup((-Dc + sqrt(Dc^2 + 4*Areq))/2, 0.05 m) // Ancho adoptado
L = B + Dc -> m // Largo adoptado
check e <= L/6 // Resultante dentro del núcleo central
q1 = P/(B*L) + 6*M/(B*L^2) -> tonf/m^2 // Presión máxima
q2 = P/(B*L) - 6*M/(B*L^2) -> tonf/m^2 // Presión mínima
check q1 <= qn // Presión máxima ≤ capacidad neta
## Condición con sismo (E.050 Art. 21: FS = 2.5 en lugar de 3.0)
qns = qaSismoE050(qa) - gammam*Df - spiso -> tonf/m^2 // Presión neta admisible con sismo (1.20 qa)
es = (M + MS)/(P + PS) -> m // Excentricidad con sismo
q1s = (P + PS)/(B*L)*(1 + 6*es/L) -> tonf/m^2 // Presión máxima con sismo (resultante en el núcleo central)
check es <= L/6 // Resultante con sismo dentro del núcleo central
check q1s <= qns // Presión máxima con sismo ≤ 1.20 qa neta`),
      calc(`## Presión última de diseño
Pu = 1.4*PD + 1.7*PL // Carga última (E.060 9.2.1)
Mu = 1.4*MD + 1.7*ML // Momento último
qu = Pu/(B*L) + 6*Mu/(B*L^2) -> tonf/m^2 // Presión última (máxima, conservadora)
d = hz - 7.5 cm - db(bar) // Peralte efectivo (al centro de la malla, conservador)
check d >= 30 cm // Altura sobre el refuerzo inferior ≥ 300 mm (E.060 15.7)
## Verificación por punzonamiento (E.060 11.12)
bo = 2*(c1 + d) + 2*(c2 + d) // Perímetro crítico a d/2
Vup = Pu - Pu/(B*L)*(c1 + d)*(c2 + d) -> tonf // Cortante último de punzonamiento (presión media)
betac = max(c1, c2)/min(c1, c2) // Relación de lados de la columna
alphas = 40 // Posición de la columna (E.060 11.12.2.1 b) [40 : Interior|30 : Borde|20 : Esquina]
Vc1 = 0.53*(1 + 2/betac)*sqrtfc(fc)*bo*d -> tonf
Vc2 = 0.27*(alphas*d/bo + 2)*sqrtfc(fc)*bo*d -> tonf
Vc3 = 1.06*sqrtfc(fc)*bo*d -> tonf
phiVcp = 0.85*min(Vc1, Vc2, Vc3) -> tonf // Resistencia de diseño
check Vup <= phiVcp // Punzonamiento
## Cortante por flexión (a "d" de la cara)
lv_L = (L - c1)/2 -> m // Volado en dirección L
lv_B = (B - c2)/2 -> m // Volado en dirección B
Vud_L = qu*B*(lv_L - d) -> tonf
phiVc_L = 0.85*0.53*sqrtfc(fc)*B*d -> tonf
check Vud_L <= phiVc_L // Cortante dirección L
Vud_B = qu*L*(lv_B - d) -> tonf
phiVc_B = 0.85*0.53*sqrtfc(fc)*L*d -> tonf
check Vud_B <= phiVc_B // Cortante dirección B
## Diseño por flexión
phif = 0.9 // Factor de reducción por flexión (E.060 9.3.2.1)
Asreq(Mx, bx) = 0.85*fc*bx*d/fy*(1 - sqrt(max(1 - 2*Mx/(0.85*phif*fc*bx*d^2), 0)))
Mu_L = qu*B*lv_L^2/2 -> tonf*m // Momento en la cara (dirección L, E.060 15.4.2)
Mu_B = qu*L*lv_B^2/2 -> tonf*m // Momento en la cara (dirección B)
check max(Mu_L/B, Mu_B/L) <= 0.85*phif*fc*d^2/2 // Peralte suficiente por flexión
As_L = max(Asreq(Mu_L, B), 0.0018*B*hz) // Acero dirección L (mín. 0.0018 b h)
n_L = max(2, ceil(As_L/Ab(bar))) // Número de varillas
sep_L = rounddown(max((B - 15 cm)/(n_L - 1), 2.5 cm), 2.5 cm) // Espaciamiento
As_B = max(Asreq(Mu_B, L), 0.0018*L*hz) // Acero dirección B
n_B = max(2, ceil(As_B/Ab(bar)))
sep_B = rounddown(max((L - 15 cm)/(n_B - 1), 2.5 cm), 2.5 cm)
check max(sep_L, sep_B) <= min(3*hz, 40 cm) // Espaciamiento máximo: 3h y 400 mm (E.060 10.5.4)
gammas = 2/(L/B + 1) // Fracción del acero de la dirección corta en la franja central de ancho B (E.060 15.4.4.2)
## Longitud de desarrollo
ld = ldE060(bar, fc, fy) // Longitud de desarrollo en tracción, barra recta (E.060 12.2.2, Tabla 12.1)
check ld <= min(lv_L, lv_B) - 7.5 cm // Longitud disponible
ldc = ldcE060(barcol, fc, fy) // Anclaje en compresión de las barras de la columna (E.060 12.3.2)
check d >= ldc // Peralte suficiente para el anclaje de la columna
"En zapatas rectangulares, una fracción $\\gamma_s$ = {gammas} del acero de la dirección corta se concentra en la franja central de ancho B (15.4.4.2). Para zapatas combinadas, conectadas, medianeras o con presión no uniforme (Winkler) vea las plantillas *ge-combinada*, *ge-conectada*, *ge-medianera* y *ge-winkler*.`),
      { type: 'footing', B: 'B', L: 'L', hz: 'hz', c1: 'c1', c2: 'c2', Df: 'Df', d: 'd', q1: 'q1', q2: 'q2', acero: 'Malla #{bar} @ {sep_L} (dir. L)  /  #{bar} @ {sep_B} (dir. B)', titulo: '' },
      { type: 'summary' },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'aci', settings: { sys: 'si' }, normas: 'ACI 318-19 / ACI 318-25 Building Code Requirements for Structural Concrete (SI)', cat: 'Concreto — normas extranjeras', name: 'Viga — ACI 318-19/25 (SI)', icon: 'beam',
    desc: 'Flexión con φ variable según εt, deformación mínima 0.004, Vc con efecto de tamaño λs (Tabla 22.5.5.1) y refuerzo mínimo por cortante, en MPa y mm.',
    titulo: 'Diseño de viga — ACI 318-19/25 (unidades SI)',
    validacion: {
      fuente: 'Control: ACI 318-19 (SI), 22.2 y 22.5 (Tabla 22.5.5.1)',
      nota: 'Los datos por defecto no reproducen un ejemplo publicado: son valores de control de esta implementación (regresión). d = 600 − 40 − 10 − 10 = 540 mm se comprueba a mano.',
      valores: [
        { var: 'd', unidad: 'mm', esperado: 540, tol: 0.0005, desc: 'Peralte efectivo' },
        { var: 'As', unidad: 'mm^2', esperado: 1320, tol: 0.002, desc: 'Acero requerido' },
        { var: 'phiMn', unidad: 'kN*m', esperado: 293.2, tol: 0.002, desc: 'Momento resistente' },
        { var: 'Vc', unidad: 'kN', esperado: 145.7, tol: 0.002, desc: 'Resistencia del concreto' },
        { var: 'phiVn', unidad: 'kN', esperado: 216.2, tol: 0.002, desc: 'Resistencia a cortante' },
      ],
    },
    blocks: [
      calc(`# Datos (ACI 318-19 / 318-25)
fc = 28 MPa // Resistencia especificada del concreto [21 MPa|28 MPa|35 MPa|42 MPa]
fy = 420 MPa // Fluencia del refuerzo (Grado 60) [420 MPa|520 MPa]
Es = 200000 MPa // Módulo del acero [190000..210000]
fyt = min(fy, 420 MPa) // Fluencia para refuerzo de cortante (Tabla 20.2.2.4a)
lambda = 1.0 // Factor de concreto liviano (1.0 = peso normal) [0.75..1.0]
b = 300 mm // Ancho del alma [200..600]
h = 600 mm // Peralte total [300..1200]
cover = 40 mm // Recubrimiento libre [25..75]
dbl = 20 mm // Diámetro de barra longitudinal [16 mm|20 mm|22 mm|25 mm|28 mm]
dbs = 10 mm // Diámetro de estribo [10 mm|12 mm]
Mu = 250 kN*m // Momento último [10..1500]
Vu = 180 kN // Cortante último en la sección crítica [10..1000]
## Flexión (Cap. 9 y 22)
d = h - cover - dbs - dbl/2 // Peralte efectivo
beta1 = si(fc <= 28 MPa, 0.85, max(0.65, 0.85 - 0.05*(fc - 28 MPa)/(7 MPa))) // Tabla 22.2.2.4.3
Rn = Mu/(0.9*b*d^2) // Supone sección controlada por tracción
check Rn <= 0.85*fc/2 // Sección suficiente como simplemente reforzada
rho = 0.85*fc/fy*(1 - sqrt(max(1 - 2*Rn/(0.85*fc), 0))) // Cuantía requerida
As = rho*b*d // Acero requerido
Asmin = max(0.25*sqrtMPa(fc)/fy, 1.4 MPa/fy)*b*d // Acero mínimo (9.6.1.2)
Ab1 = pi*dbl^2/4 // Área de una barra
n = max(2, ceil(max(As, Asmin)/Ab1)) // Número de barras
Asc = n*Ab1 // Acero colocado
a = Asc*fy/(0.85*fc*b) // Bloque de compresión
c = a/beta1 // Eje neutro
epst = 0.003*(d - c)/c // Deformación en el acero extremo
epsty = fy/Es // Deformación de fluencia
check epst >= 0.004 // Deformación mínima en vigas (9.3.3.1)
phif = si(epst >= epsty + 0.003, 0.90, 0.65 + 0.25*(epst - epsty)/0.003) // Factor φ (Tabla 21.2.2)
phiMn = phif*Asc*fy*(d - a/2) -> kN*m // Resistencia de diseño
check Mu <= phiMn // Resistencia a flexión
## Cortante (22.5 y 9.6.3)
Av = 2*pi*dbs^2/4 // Estribo de 2 ramas
avmin = max(0.062*sqrtMPa(fc)*b/fyt, 0.35 MPa*b/fyt) // Refuerzo mínimo Av/s (9.6.3.4)
rhow = Asc/(b*d) // Cuantía longitudinal
lambdas = lambdasACI(d) // Factor de efecto de tamaño (22.5.5.1.3)
Vca = 0.17*lambda*sqrtMPa(fc)*b*d -> kN // Tabla 22.5.5.1 (a), con Av ≥ Av,min
Vcb = 0.66*lambda*rhow^(1/3)*sqrtMPa(fc)*b*d -> kN // Tabla 22.5.5.1 (b), con Av ≥ Av,min
Vc = min(max(Vca, Vcb), 0.42*lambda*sqrtMPa(fc)*b*d) -> kN // Resistencia del concreto
Vcc = min(0.66*lambdas*lambda*rhow^(1/3)*sqrtMPa(fc)*b*d, 0.42*lambda*sqrtMPa(fc)*b*d) -> kN // Caso (c): sin refuerzo mínimo
phiv = 0.75 // Factor de reducción por cortante
check Vu <= phiv*(Vc + 0.66*sqrtMPa(fc)*b*d) // Dimensiones de la sección (22.5.1.2)
Vs = max(Vu/phiv - Vc, 0 kN) // Resistencia requerida del refuerzo
s1 = si(Vs > 0 kN, Av*fyt*d/Vs, 600 mm) // Espaciamiento por resistencia
smax = si(Vs <= 0.33*sqrtMPa(fc)*b*d, min(d/2, 600 mm), min(d/4, 300 mm)) // Espaciamiento máximo (9.7.6.2.2)
s2 = Av/avmin // Espaciamiento por refuerzo mínimo
s = rounddown(max(min(s1, smax, s2), 25 mm), 25 mm) // Espaciamiento adoptado (múltiplo de 25 mm)
phiVn = phiv*(Vc + Av*fyt*d/s) -> kN // Resistencia de diseño
check Vu <= phiVn // Resistencia a cortante
"Si no se coloca el refuerzo mínimo por cortante, la resistencia del concreto se reduce a $V_c$ = {Vcc} por efecto de tamaño (caso c). Las referencias de artículos son de ACI 318-19 (en SI); verifique la numeración si aplica ACI 318-25. Para diseño por puntal-tensor (regiones D) vea *co-stm*.`),
      { type: 'summary' },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'ec2', settings: { sys: 'si' }, normas: 'EN 1992-1-1 Eurocódigo 2 (valores recomendados; verificar el Anexo Nacional)', cat: 'Concreto — normas extranjeras', name: 'Viga — Eurocódigo 2 (EN 1992-1-1)', icon: 'beam',
    desc: 'Flexión con bloque rectangular (λ = 0.8, η = 1), límite x/d, cuantías mínima y máxima, cortante VRd,c sin estribos y bielas con cot θ variable.',
    titulo: 'Diseño de viga — Eurocódigo 2',
    validacion: {
      fuente: 'Control: EN 1992-1-1 (6.1 y 6.2) con valores recomendados',
      nota: 'Los datos por defecto no reproducen un ejemplo publicado: son valores de control de esta implementación (regresión). fcd = 30/1.5 = 20 MPa, fyd = 500/1.15 y μ = MEd/(b·d²·fcd) se comprueban a mano.',
      valores: [
        { var: 'fcd', unidad: 'MPa', esperado: 20, tol: 0.0005, desc: 'fcd = αcc·fck/γc' },
        { var: 'fyd', unidad: 'MPa', esperado: 434.783, tol: 0.0005, desc: 'fyd = fyk/γs' },
        { var: 'mu_Ed', esperado: 0.13774, tol: 0.001, desc: 'Momento reducido' },
        { var: 'As', unidad: 'mm^2', esperado: 1129, tol: 0.002, desc: 'Armadura requerida' },
        { var: 'VRdc', unidad: 'kN', esperado: 90.06, tol: 0.002, desc: 'Cortante sin armadura' },
        { var: 'VRds', unidad: 'kN', esperado: 180.3, tol: 0.002, desc: 'Cortante con estribos' },
      ],
    },
    blocks: [
      calc(`# Datos (EN 1992-1-1)
fck = 30 MPa // Resistencia característica [25 MPa|30 MPa|35 MPa|40 MPa|45 MPa|50 MPa]
fyk = 500 MPa // Acero B500 [400..600]
gammac = 1.5 // Coeficiente parcial del concreto
gammas = 1.15 // Coeficiente parcial del acero
alphacc = 1.0 // Coef. de cansancio (recomendado 1.0; algunos Anexos Nacionales 0.85) [0.85..1.0]
b = 300 mm // Ancho [200..600]
h = 600 mm // Canto total [300..1200]
d = 550 mm // Canto útil [250..1150]
MEd = 250 kN*m // Momento de diseño [10..1500]
VEd = 180 kN // Cortante de diseño [10..1000]
## Resistencias de cálculo
fcd = alphacc*fck/gammac // Resistencia de cálculo del concreto
fyd = fyk/gammas // Resistencia de cálculo del acero
fctm = 0.30*(fck/(1 MPa))^(2/3)*1 MPa // Resistencia media a tracción (Tabla 3.1)
## Flexión (6.1)
mu_Ed = MEd/(fcd*b*d^2) // Momento reducido
check mu_Ed <= 0.5 // Sección suficiente con bloque rectangular sin armadura de compresión
a = d*(1 - sqrt(max(1 - 2*mu_Ed, 0))) // Profundidad del bloque (λx)
x = a/0.8 // Profundidad del eje neutro
check x/d <= 0.45 // Sin redistribución, δ = 1 (5.5(4), valores recomendados)
z = min(d - a/2, 0.95*d) // Brazo mecánico
As = MEd/(fyd*z) // Armadura requerida
Asmin = max(0.26*fctm/fyk, 0.0013)*b*d // Armadura mínima (9.2.1.1)
Asmax = 0.04*b*h // Armadura máxima
Asreq = max(As, Asmin)
n = max(2, ceil(Asreq/(pi*(20 mm)^2/4))) // Barras de 20 mm
Asprov = n*pi*(20 mm)^2/4 // Armadura dispuesta
check Asprov <= Asmax // Armadura máxima (9.2.1.1(3))
xp = Asprov*fyd/(0.8*fcd*b) // Eje neutro con la armadura dispuesta
check xp/d <= 0.45 // Ductilidad con la armadura dispuesta (5.5(4))
MRd = Asprov*fyd*(d - 0.4*xp) -> kN*m // Momento resistente
check MEd <= MRd // Resistencia a flexión (6.1)
## Cortante (6.2)
k = min(1 + sqrt(200 mm/d), 2.0) // Factor de canto
rhol = min(Asprov/(b*d), 0.02) // Cuantía longitudinal
CRdc = 0.18/gammac
vmin = 0.035*k^1.5*sqrt(fck/(1 MPa))*1 MPa // Resistencia mínima
VRdc = max(CRdc*k*(100*rhol*fck/(1 MPa))^(1/3)*1 MPa, vmin)*b*d -> kN // Resistencia sin armadura de cortante (6.2.2)
cot_theta = 2.5 // Inclinación de bielas (1 ≤ cot θ ≤ 2.5) [1..2.5]
nu1 = 0.6*(1 - fck/(250 MPa)) // Coef. de reducción por fisuración
zv = 0.9*d // Brazo para cortante (6.2.3(1))
VRdmax = b*zv*nu1*fcd/(cot_theta + 1/cot_theta) -> kN // Resistencia de bielas (6.9)
check VEd <= VRdmax // Compresión en bielas
fywd = fyd // Acero de estribos
Asw_s = max(VEd/(zv*fywd*cot_theta), 0.08*sqrt(fck/(1 MPa))/(fyk/(1 MPa))*b) -> mm^2/m // Armadura transversal (6.8) y mínima (9.5N)
smax = 0.75*d // Separación longitudinal máxima (9.6N)
sw = rounddown(max(min(2*pi*(8 mm)^2/4/Asw_s, smax), 25 mm), 25 mm) // Estribos de 8 mm, 2 ramas
VRds = 2*pi*(8 mm)^2/4/sw*zv*fywd*cot_theta -> kN // Resistencia con estribos
check VEd <= max(VRdc, VRds) // Resistencia a cortante`),
      { type: 'summary' },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'portante', normas: 'RNE — NTE E.050 Suelos y Cimentaciones (RM 406-2018-VIVIENDA)', cat: 'Geotecnia', name: 'Capacidad portante del suelo (versión rápida)', icon: 'soil',
    desc: 'Versión rápida: ecuación general con Nγ de Meyerhof (E.050) o Vesic, factores de forma y profundidad, FS = 3.0 / 2.5 y gráfico qadm vs B. Memoria completa con N.F., excentricidad y asentamientos: «ge-portante».',
    titulo: 'Capacidad portante admisible del terreno',
    validacion: {
      fuente: 'Factores de capacidad de carga tabulados para φ = 28°: Nc = 25.80, Nq = 14.72 (Das, Principios de Ing. de Cimentaciones, Tabla 3.3) y Nγ de Meyerhof = 11.19 (Bowles, Tabla 4-4); demás valores de control',
      nota: 'Solo Nc, Nq y Nγ son valores publicados; qu y qadm son valores de control (Meyerhof con factores de forma y profundidad de la E.050).',
      valores: [
        { var: 'Nc', esperado: 25.8, tol: 0.002, desc: 'Das Tabla 3.3: Nc (φ = 28°)' },
        { var: 'Nq', esperado: 14.72, tol: 0.002, desc: 'Das Tabla 3.3: Nq (φ = 28°)' },
        { var: 'Ngamma', esperado: 11.19, tol: 0.003, desc: 'Meyerhof: Nγ (φ = 28°)' },
        { var: 'qu', unidad: 'tonf/m^2', esperado: 136.9, tol: 0.002, desc: 'Control: capacidad última' },
        { var: 'qadm', unidad: 'kgf/cm^2', esperado: 4.563, tol: 0.002, desc: 'Control: capacidad admisible' },
      ],
    },
    blocks: [
      text(`# Alcance
Estimación **rápida** de la presión admisible por resistencia al corte de una cimentación superficial con carga vertical centrada y sin nivel freático, mediante la ecuación general de capacidad de carga (E.050 Art. 20) con factores de forma de De Beer y de profundidad de Hansen (Das, *Principios de ingeniería de cimentaciones*, cap. 3).

> La presión admisible de diseño es la **menor** entre la obtenida por corte y la que produce el asentamiento tolerable (E.050 Art. 22.2). Para la memoria completa (nivel freático, carga excéntrica e inclinada con área efectiva, asentamientos elástico y por consolidación) use *ge-portante*.`),
      calc(`# Parámetros del suelo y la cimentación
phi = 28 deg // Ángulo de fricción interna [0..45]
c = 1.0 tonf/m^2 // Cohesión [0..10]
gamma = 1.75 tonf/m^3 // Peso unitario del suelo [1.4..2.2]
Df = 1.50 m // Profundidad de desplante [0.8..3]
B = 2.0 m // Ancho de la cimentación [0.6..5]
L = 2.0 m // Largo de la cimentación [0.6..10]
FS = 3.0 // Factor de seguridad por corte (E.050 Art. 21) [3.0 : Cargas estáticas|2.5 : Sismo o viento]
metodo = 1 // Factor Nγ [1 : Meyerhof (E.050 Art. 20.4)|2 : Vesic (1973)]
check Df >= 0.80 m // Profundidad mínima de cimentación (E.050 Art. 26.2)
check Df/B <= 5 // Cimentación superficial (E.050 Art. 23.1)
## Factores de capacidad de carga
Nq = e^(pi*tan(phi))*tan(45 deg + phi/2)^2
Nc = si(phi >= 0.5 deg, (Nq - 1)*cot(max(phi, 0.5 deg)), 5.14) // Nc (φ = 0: Prandtl 5.14)
Ngamma = si(metodo == 1, (Nq - 1)*tan(1.4*phi), 2*(Nq + 1)*tan(phi))
## Factores de forma (De Beer) y profundidad (Hansen)
Fcs = 1 + B/L*Nq/Nc
Fqs = 1 + B/L*tan(phi)
Fgs = 1 - 0.4*B/L
kD = si(Df/B <= 1, Df/B, atan(Df/B)) // Parámetro de profundidad de Hansen (rad si Df/B > 1)
Fcd = 1 + 0.4*kD
Fqd = 1 + 2*tan(phi)*(1 - sin(phi))^2*kD
q = gamma*Df -> tonf/m^2 // Sobrecarga al nivel de desplante
## Capacidad última y admisible
qu = c*Nc*Fcs*Fcd + q*Nq*Fqs*Fqd + 0.5*gamma*B*Ngamma*Fgs -> tonf/m^2
qadm = qu/FS -> kgf/cm^2 // Presión admisible por corte (E.050 Art. 22.2)
qserv = 1.5 kgf/cm^2 // Presión de servicio de la cimentación (P/(B·L)) [0.3..5]
check qserv <= qadm // Presión de servicio ≤ presión admisible por corte`),
      { type: 'plot', expr: '(c*Nc*(1+(x m)/L*Nq/Nc)*(1+0.4*(Df/(x m) <= 1 ? Df/(x m) : atan(Df/(x m)))) + q*Nq*(1+(x m)/L*tan(phi))*(1+2*tan(phi)*(1-sin(phi))^2*(Df/(x m) <= 1 ? Df/(x m) : atan(Df/(x m)))) + 0.5*gamma*(x m)*Ngamma*(1-0.4*(x m)/L))/FS', var: 'x', desde: '1', hasta: '4', puntos: '120', xlabel: 'Ancho B [m] (B = L)', ylabel: 'qadm [kg/cm²]', titulo: 'Variación de la capacidad admisible con el ancho de la cimentación' },
      text(`> Nota: la capacidad admisible por resistencia debe compararse con la presión que produce el asentamiento tolerable indicado en el Estudio de Mecánica de Suelos (NTE E.050 Art. 22.2); ver *ge-portante*.`),
      { type: 'summary' },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'muro', normas: 'RNE — NTE E.020, E.050 (Art. 39.13), E.060', cat: 'Muros de contención', name: 'Muro de contención en voladizo (versión rápida)', icon: 'wall',
    desc: 'Versión rápida estática: empuje de Rankine con sobrecarga, volteo, deslizamiento, presiones en la base y pantalla. Memoria completa con sismo (M-O), dentellón, punta y talón: «wa-voladizo».',
    titulo: 'Diseño de muro de contención en voladizo',
    validacion: {
      fuente: 'Control: Rankine (Das cap. 7) y E.050 39.13; versión rápida de wa-voladizo',
      nota: 'Los datos por defecto no reproducen un ejemplo publicado: son valores de control de esta implementación (regresión). Ka = 1/3, Ea = ½·Ka·γ·H² = 4.8 t/m y Eq = Ka·q·H se comprueban a mano.',
      valores: [
        { var: 'Ka', esperado: 0.33333, tol: 0.0005, desc: 'Ka de Rankine, φ = 30°' },
        { var: 'Ea', unidad: 'tonf/m', esperado: 4.8, tol: 0.0005, desc: 'Empuje del relleno ½KaγH²' },
        { var: 'Eq', unidad: 'tonf/m', esperado: 1.33333, tol: 0.0005, desc: 'Empuje de la sobrecarga Ka·q·H' },
        { var: 'FSv', esperado: 3.104, tol: 0.002, desc: 'FS al volteo' },
        { var: 'FSd', esperado: 1.507, tol: 0.002, desc: 'FS al deslizamiento' },
        { var: 'As', unidad: 'cm^2', esperado: 8.576, tol: 0.002, desc: 'Acero de la pantalla por metro' },
      ],
    },
    blocks: [
      text(`# Alcance
Predimensionamiento y verificación **rápida** de un muro de contención en voladizo en condición **estática**: empuje activo de Rankine con relleno horizontal y sobrecarga, estabilidad al volteo y al deslizamiento (E.050 Art. 39.13.6: FS ≥ 1.5), presiones en la base y diseño de la pantalla (E.060, $U = 1.7\\,E$, Art. 9.2.4).

> Para la memoria **completa** (sismo con Mononobe–Okabe, dentellón, empuje pasivo, diseño de punta y talón, corte de barras) use *wa-voladizo*; el bloque **retwall** permite además Coulomb, talud del relleno y nivel freático.`),
      calc(`# Geometría y materiales
H = 4.0 m // Altura total del muro [2..8]
hz = 0.50 m // Espesor de la zapata [0.3..1.0]
B = 2.80 m // Ancho de la base [1..6]
Lp = 0.70 m // Longitud de la punta [0.2..2]
t1 = 0.25 m // Espesor de la pantalla en la corona [0.20..0.40]
t2 = 0.40 m // Espesor de la pantalla en la base [0.25..0.80]
gammas = 1.80 tonf/m^3 // Peso unitario del relleno [1.5..2.2]
phis = 30 deg // Ángulo de fricción del relleno [20..40]
ws = 1.0 tonf/m^2 // Sobrecarga sobre el relleno [0..2]
mu = 0.55 // Coeficiente de fricción base-suelo (≈ tan(2φf/3), del EMS) [0.30..0.70]
qa = 2.5 kgf/cm^2 // Capacidad admisible del suelo [0.5..6]
gammac = 2.4 tonf/m^3 // Peso unitario del concreto [2.2..2.5]
fc = 210 kgf/cm^2 // Resistencia del concreto [175..420]
fy = 4200 kgf/cm^2 // Acero ASTM A615 Grado 60 [2800..4200]
FSv_min = 2.0 // FS mínimo al volteo [1.5 : Mínimo E.050 Art. 39.13.6|2.0 : Criterio usual de diseño]
FSd_min = FSminE050(0) // FS mínimo al deslizamiento, condición estática (E.050 Art. 39.13.6)
## Empujes (Rankine)
Ka = (1 - sin(phis))/(1 + sin(phis)) // Coeficiente de empuje activo
Ea = 0.5*Ka*gammas*H^2 -> tonf/m // Empuje del relleno
Eq = Ka*ws*H -> tonf/m // Empuje de la sobrecarga
Ma = Ea*H/3 + Eq*H/2 -> tonf*m/m // Momento de volteo`),
      { type: 'wall', H: 'H', B: 'B', hz: 'hz', punta: 'Lp', t1: 't1', t2: 't2', Df: '1.0 m', Ka: 'Ka', gs: 'gammas', sc: 'ws' },
      calc(`## Fuerzas estabilizantes (por metro de muro)
hp = H - hz // Altura de la pantalla
Lt = B - Lp - t2 // Longitud del talón
check Lt > 0 m // Geometría: el talón existe
W1 = gammac*t1*hp -> tonf/m // Pantalla (rectángulo)
W2 = gammac*0.5*(t2 - t1)*hp -> tonf/m // Pantalla (triángulo)
W3 = gammac*B*hz -> tonf/m // Zapata
W4 = gammas*Lt*hp -> tonf/m // Relleno sobre el talón
W5 = ws*Lt -> tonf/m // Sobrecarga sobre el talón
SW = W1 + W2 + W3 + W4 + W5 // Fuerza vertical total
SWr = W1 + W2 + W3 + W4 // Fuerza vertical estabilizante (sin sobrecarga, conservador)
xW1 = Lp + t2 - t1/2 // Brazo de W1 respecto a la punta
xW2 = Lp + 2/3*(t2 - t1) // Brazo de W2 (centroide del triángulo)
xW4 = Lp + t2 + Lt/2 // Brazo de W4
Mr = W1*xW1 + W2*xW2 + W3*B/2 + W4*xW4 -> tonf*m/m // Momento resistente (sin sobrecarga)
## Estabilidad
FSv = Mr/Ma // Factor de seguridad al volteo
check FSv >= FSv_min // Volteo (E.050 39.13.6: FS ≥ 1.5)
FSd = mu*SWr/(Ea + Eq) // Factor de seguridad al deslizamiento (sin empuje pasivo)
check FSd >= FSd_min // Deslizamiento (E.050 39.13.6: FS ≥ 1.5)
xr = (Mr + W5*(Lp + t2 + Lt/2) - Ma)/SW -> m // Ubicación de la resultante desde la punta (con sobrecarga)
e = B/2 - xr -> m // Excentricidad
check abs(e) <= B/6 // Resultante en el tercio central
q1 = SW/B*(1 + 6*abs(e)/B) -> tonf/m^2 // Presión máxima
q2 = SW/B*(1 - 6*abs(e)/B) -> tonf/m^2 // Presión mínima
check q1 <= qa // Presión máxima admisible
## Diseño de la pantalla (sección crítica en la base)
Mu = 1.7*(Ka*gammas*hp^3/6 + Ka*ws*hp^2/2) -> tonf*m/m // Momento último
Vu = 1.7*(Ka*gammas*hp^2/2 + Ka*ws*hp) -> tonf/m // Cortante último
bw = 100 cm // Franja de diseño
d = t2 - 5 cm - 0.8 cm // Peralte efectivo
Rn = Mu*1 m/(0.9*bw*d^2) // Parámetro de resistencia
check Rn <= 0.85*fc/2 // Espesor de pantalla suficiente por flexión
rho = 0.85*fc/fy*(1 - sqrt(max(1 - 2*Rn/(0.85*fc), 0)))
As = max(rho*bw*d, 0.0015*bw*t2) // Acero vertical, cara interior (mín. 0.0015, E.060 14.3.1)
s = rounddown(max(min(Ab(5)/As*bw, 3*t2, 40 cm), 2.5 cm), 2.5 cm) // Espaciamiento con 5/8": ≤ 3t y 400 mm (E.060 14.3.3)
check Ab(5)/s*bw >= As // Acero colocado ≥ requerido
phiVc = 0.85*0.53*sqrtfc(fc)*bw*d/(1 m) -> tonf/m // Resistencia al corte por metro
check Vu <= phiVc // Cortante en la pantalla
"Refuerzo vertical interior: varilla de 5/8\" @ {s}. Refuerzo horizontal mínimo 0.0020 (E.060 14.3.1 a): {0.002*bw*t2} por metro, repartido en ambas caras. Completar con el diseño de punta y talón y, en zonas 3–4, el empuje sísmico (Mononobe–Okabe, FS ≥ 1.25): ver *wa-voladizo*.`),
      { type: 'summary' },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'aligerado', normas: 'RNE — NTE E.020 Cargas, E.060 Concreto Armado', cat: 'Concreto armado', name: 'Losa aligerada en una dirección', icon: 'slab',
    desc: 'Metrado por vigueta, análisis continuo con alternancia, diseño de acero positivo (sección T) y negativo, cortante con ensanche.',
    titulo: 'Diseño de losa aligerada unidireccional h = 20 cm',
    validacion: {
      fuente: 'Control: vigueta continua de 3 tramos por rigidez (bloque beam) y NTE E.020/E.060',
      nota: 'Los datos por defecto no reproducen un ejemplo publicado: son valores de control de esta implementación (regresión). wD = 0.40·(0.30 + 0.10 + 0.10) = 0.20 t/m se comprueba a mano.',
      valores: [
        { var: 'wD', unidad: 'tonf/m', esperado: 0.2, tol: 0.0005, desc: 'Carga muerta por vigueta' },
        { var: 'Mneg', unidad: 'tonf*m', esperado: -0.8388, tol: 0.002, desc: 'Momento negativo máximo' },
        { var: 'Mpos', unidad: 'tonf*m', esperado: 0.6135, tol: 0.002, desc: 'Momento positivo máximo' },
        { var: 'Asneg', unidad: 'cm^2', esperado: 1.451, tol: 0.002, desc: 'Acero negativo' },
        { var: 'phiVc', unidad: 'tonf', esperado: 1.221, tol: 0.002, desc: 'Resistencia al cortante de la vigueta' },
      ],
    },
    blocks: [
      calc(`# Metrado de cargas por vigueta
La1 = 4.20 m // Luz libre tramo 1 [2.5..6]
La2 = 4.50 m // Luz libre tramo 2 [2.5..6]
La3 = 3.80 m // Luz libre tramo 3 [2.5..6]
h = 20 cm // Espesor del aligerado [17 cm|20 cm|25 cm|30 cm]
bv = 40 cm // Ancho tributario de vigueta [40..50]
bw = 10 cm // Ancho del alma [10..12]
hf = 5 cm // Espesor de la losa superior [5..8]
fc = 210 kgf/cm^2 // Resistencia del concreto [175..420]
fy = 4200 kgf/cm^2 // Acero ASTM A615 Grado 60 [2800..4200]
pal = pAligE020(h) -> tonf/m^2 // Peso propio del aligerado con ladrillo de arcilla (E.020 Anexo 1: 17 cm 280, 20 cm 300, 25 cm 350, 30 cm 420 kgf/m²)
wpt = 0.10 tonf/m^2 // Piso terminado [0.05..0.15]
wtab = 0.10 tonf/m^2 // Tabiquería repartida [0..0.30]
sc = 0.20 tonf/m^2 // Sobrecarga (E.020 Tabla 1) [0.20 tonf/m^2|0.25 tonf/m^2|0.30 tonf/m^2|0.40 tonf/m^2|0.50 tonf/m^2]
wD = (pal + wpt + wtab)*bv -> tonf/m // Carga muerta por vigueta
wL = sc*bv -> tonf/m // Carga viva por vigueta
Ec = 15000*sqrtfc(fc)
Ig = bw*h^3/12 // Inercia del alma (conservador)`),
      { type: 'beam', tramos: 'La1, La2, La3', apoyos: 'A, A, A, A', E: 'Ec', I: 'Ig', cargas: 'CM: U * 1.4*wD\nCV: U * 1.7*wL', alternancia: true, deflexion: false, titulo: 'Envolvente de esfuerzos por vigueta' },
      calc(`## Diseño por flexión
d = h - 3 cm // Peralte efectivo
phif = 0.9 // Factor de reducción por flexión (E.060 9.3.2.1)
Asreq(M, bx) = 0.85*fc*bx*d/fy*(1 - sqrt(max(1 - 2*M/(0.85*phif*fc*bx*d^2), 0)))
check abs(Mneg) <= 0.85*phif*fc*bw*d^2/2 // Alma suficiente para el momento negativo (si no, ensanche alternado o macizado)
Aspos = Asreq(Mpos, bv) // Acero positivo (ancho bv)
apos = Aspos*fy/(0.85*fc*bv) // Bloque de compresión
check apos <= hf // Bloque dentro del ala (sección rectangular)
Asneg = Asreq(abs(Mneg), bw) // Acero negativo (ancho bw)
Asmin = 0.7*sqrtfc(fc)/fy*bw*d // Acero mínimo
rhob = 0.85*0.85*fc/fy*(6000 kgf/cm^2/(6000 kgf/cm^2 + fy)) // Cuantía balanceada
check Asneg <= 0.75*rhob*bw*d // Acero máximo en el alma (E.060 10.3.4)
"Acero positivo: {max(Aspos, Asmin)} → 1 #4 + 1 #3 = {Ab(4) + Ab(3)}
"Acero negativo: {max(Asneg, Asmin)} → 1 #4 + 1 #3 = {Ab(4) + Ab(3)}
check max(Aspos, Asmin) <= Ab(4) + Ab(3) // Acero positivo colocado
check max(Asneg, Asmin) <= Ab(4) + Ab(3) // Acero negativo colocado
## Cortante (E.060 Art. 8.11.8)
phiVc = 0.85*1.1*0.53*sqrtfc(fc)*bw*d -> tonf // Incremento 10 % para viguetas
check Vmax <= phiVc // Sin ensanche de vigueta (Vmax en el eje del apoyo, conservador)
## Peralte para no verificar deflexiones (E.060 9.6.2.1, Tabla 9.1)
hmin = max(La1, La3)/18.5 -> cm // Tramos extremos (un extremo continuo); interiores Ln/21
"El peralte adoptado h = {h} se compara con $h_{min}$ = {hmin}. Si $h < h_{min}$ —caso usual con la práctica $h \\approx L_n/25$— debe calcularse la deflexión (E.060 9.6.2.2 a 9.6.2.6), por ejemplo con la plantilla *co-deflexion*; para aligerados en dos direcciones vea *co-aligerado2d*.
## Acero de temperatura
Ast = 0.0025*100 cm*hf -> cm^2 // Por metro de losa (barras lisas, E.060 9.7.2)
st = min(5*hf, 40 cm) // Espaciamiento máximo
"Usar varilla de 1/4\" @ {rounddown(min(Ab(2)/Ast*100 cm, st), 2.5 cm)}`),
      { type: 'summary' },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'sismo', normas: 'RNE — NTE E.030 Diseño Sismorresistente (modificada por RM 183-2026-VIVIENDA)', cat: 'Sismo — Perú', name: 'Sismo estático E.030-2026 (versión rápida)', icon: 'quake',
    desc: 'Versión rápida con pesos por nivel ingresados: suelo por Vs30, sistema permitido (Tabla 9), Ts < 0.65 TP, aplicabilidad del método, C/R ≥ 0.11, distribución con k y derivas en el extremo. Memoria completa: «pe-e030-estatico».',
    titulo: 'Análisis sísmico estático — NTE E.030 (2026)',
    validacion: {
      fuente: 'Control: NTE E.030-2026 (RM 183-2026-VIVIENDA), método estático',
      nota: 'Los datos por defecto no reproducen un ejemplo publicado: son valores de control de esta implementación (regresión). V = 0.45·1·2.5·S/8·790 t con S(300 m/s) = 1.133 se comprueba a mano (tests/verify.mjs).',
      valores: [
        { var: 'S', esperado: 1.13333, tol: 0.0005, desc: 'Factor de suelo (Vs30 = 300 m/s, zona 4)' },
        { var: 'Tp', unidad: 's', esperado: 0.7, tol: 0.0005, desc: 'TP (Vs30 = 300 m/s)' },
        { var: 'T', unidad: 's', esperado: 0.342857, tol: 0.0005, desc: 'Periodo hn/CT' },
        { var: 'V', unidad: 'tonf', esperado: 125.906, tol: 0.001, desc: 'Cortante basal' },
        { var: 'max(deriva_max)', esperado: 0.00616, tol: 0.002, desc: 'Deriva máxima en el extremo' },
      ],
    },
    blocks: [
      text(`# Alcance
Análisis sísmico estático **rápido** según la Norma Técnica E.030 *Diseño Sismorresistente* del RNE, con las modificaciones aprobadas por la **RM N° 183-2026-VIVIENDA** (clasificación de suelos por $\\bar V_{s30}$, factores $S$, $T_P$, $T_L$ interpolados, nuevos coeficientes $R_0$ y numeración de artículos 2026). Los pesos por nivel, los desplazamientos elásticos y la relación $\\Delta_{extremo}/\\Delta_{CM}$ se toman del modelo estructural.

> Para la memoria **completa** (metrado de pesos, periodo de Rayleigh, torsión accidental, evaluación automática de irregularidades con el bloque *irregE030*) use la plantilla **«Análisis sísmico estático E.030-2026 — edificio de 5 pisos»** (*pe-e030-estatico*); para el análisis modal espectral, *pe-e030-dinamico*. Para proyectos con expediente iniciado con la E.030-2018 use la plantilla de transición *sismo2018*.`),
      calc(`# Peligro sísmico y condiciones de sitio
zona = 4 // Zona sísmica (Art. 10, Anexo II) [4 : Zona 4|3 : Zona 3|2 : Zona 2|1 : Zona 1]
Z = ZE030(zona) // Factor de zona (Art. 11, Tabla N° 1)
Vs30 = 300 m/s // Velocidad promedio de ondas de corte en 30 m (Art. 15.2, del Estudio de Mecánica de Suelos) [180..1500]
S = SE030(zona, Vs30) // Factor de suelo, interpolado por Vs30 (Art. 17, Tabla N° 4)
Tp = TpE030(Vs30) // Periodo TP de la plataforma (Tabla N° 5)
Tl = TlE030(Vs30) // Periodo TL (Tabla N° 5)
# Categoría y sistema estructural
categoria = 4 // Categoría de la edificación (Art. 19, Tabla N° 7) [2 : A2 Esencial|3 : B Importante|4 : C Común]
U = UE030(categoria) // Factor de uso (Tabla N° 7)
sistema = 7 // Sistema estructural en la dirección de análisis (Tabla N° 10) [7 : C°A° pórticos|8 : C°A° dual|9 : C°A° muros estructurales|10 : C°A° muros de ductilidad limitada|11 : Albañilería armada o confinada|1 : Acero SMF|2 : Acero IMF|3 : Acero OMF|4 : Acero SCBF|5 : Acero OCBF|6 : Acero EBF|12 : Madera]
check sisE030(categoria, zona, sistema) == 1 // Sistema estructural permitido para la categoría y la zona (Art. 21, Tabla N° 9)
Ts = 0.30 s // Periodo predominante del terreno por razón espectral H/V (Art. 15.3; exigido en categorías A y B de la zona 4) [0.05..1.5]
check Ts < 0.65*Tp or categoria == 4 or zona < 4 // Categorías A y B en zona 4: Ts < 0.65 TP; si no, perfil siguiente más desfavorable o estudio de sitio (Art. 14.2 y 14.8)
R0 = R0E030(sistema) // Coeficiente básico de reducción (Art. 22, Tabla N° 10)
Ia = 1.0 // Irregularidad en altura (Tabla N° 11) [1.0 : Regular|0.90 : Masa o geometría vertical|0.80 : Discontinuidad en sistemas resistentes|0.75 : Piso blando o piso débil|0.60 : Discontinuidad extrema|0.50 : Rigidez o resistencia extrema]
Ip = 1.0 // Irregularidad en planta (Tabla N° 12) [1.0 : Regular|0.90 : Esquinas entrantes / sistemas no paralelos|0.85 : Discontinuidad del diafragma|0.75 : Torsión|0.60 : Torsión extrema]
regular = si(Ia*Ip == 1, 1, 0) // 1 = estructura regular
extrema = si(min(Ia, Ip) <= 0.60, 1, 0) // 1 = existe alguna irregularidad extrema
npisos = 4 // Número de pisos [1..20]
hn = 12.0 m // Altura total de la edificación [3..60]
check (categoria == 2 and (regular == 1 or (zona == 1 and extrema == 0))) or (categoria == 3 and (extrema == 0 or zona == 1)) or (categoria == 4 and (extrema == 0 or zona == 1 or (zona == 2 and (npisos <= 2 or hn <= 8 m)))) // Restricciones a la irregularidad según categoría y zona (Art. 25, Tabla N° 13)
check zona == 1 or (regular == 1 and hn <= 30 m) or ((sistema == 9 or sistema == 10 or sistema == 11) and hn <= 15 m) // Método estático aplicable: zona 1, regular ≤ 30 m, o muros portantes ≤ 15 m (Art. 33.2); si no, análisis dinámico
## Periodo y factor de amplificación
R = R0*Ia*Ip // Coeficiente de reducción de las fuerzas sísmicas (Art. 26)
muroscaja = 0 // Pórticos de C°A° con muros en las cajas de ascensores y escaleras [0 : No|1 : Sí (CT = 45)]
CT = si(sistema == 7 and muroscaja == 1, 45, CTE030(sistema)) // Coeficiente para estimar el periodo (Art. 36.1)
T = hn/CT*1 s/m -> s // Periodo fundamental aproximado, hn en metros (Art. 36.1)
C = CE030(T, Tp, Tl) // Factor de amplificación; en el análisis estático C = 2.5 para T ≤ TP (Art. 18.3 y 34.1)
CR = max(C/R, 0.11) // C/R con su valor mínimo 0.11 (Art. 34.2): es un mínimo que se aplica, no una verificación
k = kE030(T) // Exponente de distribución en altura (Art. 35.2)
## Cortante basal y distribución
wi = [210, 210, 210, 160] tonf // Peso sísmico por nivel 1 → n, con el % de carga viva del Art. 31
hi = [3, 6, 9, 12] m // Altura de cada nivel desde la base
P = sum(wi) // Peso sísmico total
V = Z*U*S*CR*P -> tonf // Fuerza cortante en la base V = Z·U·C·S·P/R (Art. 34.1)
alpha_i = wi .* hi.^k / sum(wi .* hi.^k) // Factor de distribución (Art. 35.1)
Fi = alpha_i*V // Fuerza en cada nivel
Vi = V - cumsum(Fi) + Fi // Cortante de entrepiso
"Las fuerzas $F_i$ se aplican en el centro de masas con la excentricidad accidental de 0.05 veces la dimensión perpendicular (Art. 37). Para los elementos verticales se combina el **100 %** de una dirección con el **30 %** de la perpendicular (Art. 33.3).
## Control de derivas (Art. 50 y 51)
Di = [0.22, 0.28, 0.26, 0.19] cm // Desplazamiento relativo elástico de cada entrepiso en el centro de masas (del modelo, con las fuerzas Fi)
hei = [3, 3, 3, 3] m // Altura de cada entrepiso
rt = [1.10, 1.10, 1.12, 1.12] // Relación Δextremo/ΔCM por entrepiso (modelo 3D con excentricidad accidental)
fR = si(regular == 1, 0.75, 0.85) // Factor de desplazamiento inelástico: 0.75 R regular, 0.85 R irregular (Art. 50.1 y 50.2)
fCR = (C/R)/CR // Los desplazamientos no consideran el mínimo C/R (Art. 50.3)
deriva = fR*R*fCR*Di ./ hei // Distorsión inelástica en el centro de masas
deriva_max = rt .* deriva // Distorsión máxima de entrepiso, en el extremo del edificio
material = si(sistema <= 6, 2, si(sistema == 10, 5, si(sistema == 11, 3, si(sistema == 12, 4, 1)))) // Material predominante según el sistema
dlim = dlimE030(material) // Distorsión máxima (Tabla N° 14): C°A° 0.007, acero 0.010, albañilería 0.005, madera 0.010, EMDL 0.004
check max(deriva_max) <= dlim // Distorsión máxima de entrepiso en el extremo del edificio (Art. 51)`),
      { type: 'table', columnas: 'Nivel = 1:4\nAltura $h_i$ [m] = hi\nPeso $w_i$ [tonf] = wi\n$\\alpha_i$ = alpha_i\nFuerza $F_i$ [tonf] = Fi\nCortante $V_i$ [tonf] = Vi\n$\\Delta_i/h_{ei}$ CM = deriva\n$\\Delta_{max}/h_{ei}$ extremo = deriva_max', dec: '4', titulo: 'Distribución de la fuerza sísmica en altura y derivas' },
      { type: 'spectrum', Z: 'Z', U: 'U', S: 'S', Tp: 'Tp', Tl: 'Tl', R: 'R', T: 'T', corto: true, titulo: 'Espectro de pseudo-aceleraciones E.030-2026 (incluye rama T < 0.2 TP para análisis dinámico)' },
      text(`> **Notas.** (1) Si la estructura es irregular, verifique las irregularidades con el bloque *irregE030* (plantilla *pe-e030-irregularidades*) y use el análisis dinámico cuando el Art. 33.2 no permita el estático. (2) En el análisis dinámico la cortante basal no será menor que el 80 % (regular) o el 90 % (irregular) de la estática (Art. 44.1). (3) La fuerza sísmica vertical es 2/3 Z·U·S (Art. 38).`),
      { type: 'summary' },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'asce7', settings: { sys: 'si' }, normas: 'ASCE/SEI 7-22 Minimum Design Loads (Cap. 11 y 12)', cat: 'Sismo — Internacional', name: 'Sismo ELF — ASCE 7-22 (EE. UU.)', icon: 'quake',
    desc: 'Fuerza lateral equivalente: Ta = Ct·hn^x, límite Cu·Ta, Cs con límites mínimos, distribución con exponente k, derivas con Cd e Ie.',
    titulo: 'Análisis sísmico ELF — ASCE 7-22',
    validacion: {
      fuente: 'Control: ASCE/SEI 7-22 Cap. 12 (ELF)',
      nota: 'Los datos por defecto no reproducen un ejemplo publicado: son valores de control de esta implementación (regresión). Ta = Ct·hn^x = 0.0466·15^0.9 m y T = min(Tmod, Cu·Ta) se comprueban a mano (tests/verify.mjs).',
      valores: [
        { var: 'Ta', esperado: 0.53317, tol: 0.001, desc: 'Periodo aproximado (12.8-7)' },
        { var: 'T', esperado: 0.74644, tol: 0.001, desc: 'T = min(Tmod, Cu·Ta)' },
        { var: 'Cs', esperado: 0.10047, tol: 0.001, desc: 'Coeficiente sísmico' },
        { var: 'V', unidad: 'kN', esperado: 964.6, tol: 0.002, desc: 'Cortante basal' },
        { var: 'k', esperado: 1.123, tol: 0.002, desc: 'Exponente de distribución vertical' },
      ],
    },
    blocks: [
      calc(`# Parámetros sísmicos (ASCE 7-22)
SDS = 1.00 // Aceleración espectral de diseño, periodo corto [g] (del espectro multiperiodo, 11.4.8) [0.1..2.0]
SD1 = 0.60 // Aceleración espectral de diseño a 1 s [g] [0.05..1.5]
S1 = 0.60 // Aceleración MCER a 1 s [g] [0.04..1.5]
TL = 8 // Periodo de transición largo [s] [4..16]
sistema = 1 // Sistema sísmico resistente (Tabla 12.2-1) [1 : C.1 Pórtico especial de C°A° (SMF)|2 : C.6 Pórtico intermedio de C°A°|3 : C.7 Pórtico ordinario de C°A°|4 : D.3 Dual con SMF y muros especiales de C°A°|5 : B.4 Muros especiales de C°A° (pórtico de edificación)|6 : C.1 Pórtico especial de acero (SMF)|7 : B.1 Acero EBF]
R = si(sistema == 1 or sistema == 6 or sistema == 7, 8, si(sistema == 2, 5, si(sistema == 3, 3, si(sistema == 4, 7, 6)))) // Coeficiente de modificación de respuesta (Tabla 12.2-1)
Cd = si(sistema == 1 or sistema == 4 or sistema == 6, 5.5, si(sistema == 2, 4.5, si(sistema == 3, 2.5, si(sistema == 5, 5, 4)))) // Factor de amplificación de deflexiones (Tabla 12.2-1)
riesgo = 2 // Categoría de riesgo (Tabla 1.5-1) [2 : I o II|3 : III|4 : IV]
Ie = si(riesgo == 4, 1.5, si(riesgo == 3, 1.25, 1.0)) // Factor de importancia sísmica (Tabla 1.5-2)
hn = 15 // Altura estructural [m] [3..80]
Ct = si(sistema == 1 or sistema == 2 or sistema == 3, 0.0466, si(sistema == 6, 0.0724, si(sistema == 7, 0.0731, 0.0488))) // Tabla 12.8-2 (unidades SI)
x = si(sistema <= 3, 0.9, si(sistema == 6, 0.8, 0.75)) // Exponente (Tabla 12.8-2)
## Periodo fundamental (12.8.2)
Ta = Ct*hn^x // Periodo aproximado [s] (12.8-8)
Cu = CuASCE7(SD1) // Coeficiente del límite superior (Tabla 12.8-1)
Tmod = 0.90 // Periodo fundamental del modelo analítico [s] (0 si no se dispone) [0..4]
T = si(Tmod > 0, min(Tmod, Cu*Ta), Ta) // Periodo adoptado: el del modelo, no mayor que Cu·Ta (12.8.2)
## Aplicabilidad del procedimiento ELF (12.6, Tabla 12.6-1)
Ts = SD1/SDS // Periodo de esquina del espectro [s]
configuracion = 1 // Configuración (12.3) [1 : Regular|2 : Solo irregularidades H2–H5 / V4–V5 (hn ≤ 160 ft)|3 : Otras irregularidades]
check (configuracion == 1 and T < 3.5*Ts) or (configuracion == 2 and hn <= 48.8) // ELF permitido en SDC D–F (Tabla 12.6-1); si no, análisis modal (12.9)
## Coeficiente de respuesta sísmica (12.8.1.1)
Cs1 = SDS/(R/Ie) // Valor base
Cs2 = si(T <= TL, SD1/(T*R/Ie), SD1*TL/(T^2*R/Ie)) // Límite superior
Csmin = max(0.044*SDS*Ie, 0.01) // Límite inferior (12.8-5)
Cs3 = si(S1 >= 0.6, 0.5*S1/(R/Ie), 0) // Límite adicional si S1 ≥ 0.6 g (12.8-6)
Cs = max(min(Cs1, Cs2), Csmin, Cs3) // Coeficiente de diseño
## Cortante basal y distribución vertical (12.8.3)
wx = [2000, 2000, 2000, 2000, 1600] kN // Peso sísmico por nivel
hx = [3, 6, 9, 12, 15] // Altura de cada nivel [m]
W = sum(wx) // Peso sísmico efectivo
V = Cs*W // Cortante basal (12.8-1)
k = si(T <= 0.5, 1, si(T >= 2.5, 2, 1 + (T - 0.5)/2)) // Exponente de distribución
Cvx = wx .* hx.^k / sum(wx .* hx.^k) // Factor de distribución vertical
Fx = Cvx*V // Fuerza por nivel
Vx = V - cumsum(Fx) + Fx // Cortante de entrepiso
## Derivas (12.8.6 y Tabla 12.12-1)
Dxe = [5, 6, 6, 5, 4] mm // Deriva elástica de entrepiso (del modelo)
hsx = [3, 3, 3, 3, 3] m // Altura de entrepiso
Delta = Cd*Dxe/Ie // Deriva de diseño
Dlim = si(riesgo == 4, 0.010, si(riesgo == 3, 0.015, 0.020)) // Deriva admisible Δa/hsx, «todas las demás estructuras» (Tabla 12.12-1)
check max(Delta ./ hsx) <= Dlim // Deriva de entrepiso`),
      { type: 'text', src: '> ASCE 7-22 obtiene $S_{DS}$ y $S_{D1}$ del espectro multiperiodo del sitio (11.4.8); el espectro de dos periodos se usa como alternativa. En pórticos especiales de SDC D–F la deriva admisible se divide entre ρ (12.12.1.1). Los desplazamientos para derivas pueden calcularse con el periodo del modelo sin el límite Cu·Ta (12.8.6.2).' },
      { type: 'table', columnas: 'Nivel = 1:5\nAltura $h_x$ [m] = hx\nPeso $w_x$ [kN] = wx\n$C_{vx}$ = Cvx\nFuerza $F_x$ [kN] = Fx\nCortante $V_x$ [kN] = Vx', dec: '3', titulo: 'Distribución vertical de fuerzas sísmicas (ASCE 7-22)' },
      { type: 'plot', expr: 'SaASCE7(x, SDS, SD1, TL); SaASCE7(x, SDS, SD1, TL)/(R/Ie)', var: 'x', desde: '0', hasta: '4', puntos: '300', xlabel: 'Periodo T [s]', ylabel: 'Sa [g]', leyenda: true, nombres: 'Espectro de diseño Sa; Sa/(R/Ie)', titulo: 'Espectro de respuesta de diseño (ASCE 7-22, 11.4.6)' },
      { type: 'summary' },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'japon', settings: { sys: 'si' }, normas: 'Building Standard Law of Japan (Orden de Aplicación, Art. 88) · Notificación MOC 1793', cat: 'Sismo — Japón', name: 'Sismo — Norma japonesa BSL (versión rápida)', icon: 'quake',
    desc: 'Versión rápida: Ci = Z·Rt·Ai·Co, primera fase (Co = 0.2, deriva ≤ 1/200) y Qun = Ds·Fes·Qud (Co = 1.0). Memorias completas: «jp-bsl-ruta12» y «jp-bsl-ruta3».',
    titulo: 'Fuerza sísmica según la Building Standard Law de Japón',
    validacion: {
      fuente: 'Control: Building Standard Law (Orden Art. 88, Notificación MOC 1793): Rt, Ai, Ci = Z·Rt·Ai·Co',
      nota: 'Los datos por defecto no reproducen un ejemplo publicado: son valores de control de esta implementación (regresión). T = 0.02·H = 0.24 s < Tc → Rt = 1 y C₁ = Co = 0.2 se comprueban a mano.',
      valores: [
        { var: 'T', esperado: 0.24, tol: 0.0005, desc: 'T = h(0.02 + 0.01α)' },
        { var: 'Rt', esperado: 1, tol: 0.0005, desc: 'Rt (T < Tc)' },
        { var: 'Ci[1]', esperado: 0.2, tol: 0.0005, desc: 'Coeficiente de corte del 1.er piso' },
        { var: 'Qi[1]', unidad: 'kN', esperado: 1580, tol: 0.002, desc: 'Cortante del 1.er piso' },
        { var: 'Qun[1]', unidad: 'kN', esperado: 2370, tol: 0.002, desc: 'Resistencia requerida del 1.er piso' },
      ],
    },
    blocks: [
      text(`# Método de diseño japonés
La Building Standard Law (BSL) de Japón verifica dos niveles: **primera fase** (sismo moderado, $C_o = 0.2$, esfuerzos admisibles y deriva ≤ 1/200) y **segunda fase** (sismo severo, $C_o = 1.0$), donde la resistencia lateral última de cada entrepiso debe superar $Q_{un} = D_s F_{es} Q_{ud}$. Es una referencia muy útil para comparar con la E.030, que comparte la filosofía de diseño por ductilidad.

> Versión rápida con datos del modelo. Las memorias completas del módulo Japón desarrollan la Ruta 1–2 (rigidez relativa $R_s \\ge 0.6$, excentricidad $R_e \\le 0.15$, cantidad de muros, *jp-bsl-ruta12*), la Ruta 3 con $D_s$ y $F_{es}$ por entrepiso (*jp-bsl-ruta3*) y el espectro de la Notificación 1461 (*jp-bsl-n1461*).`),
      calc(`# Parámetros
Zj = 1.0 // Coeficiente de zona sísmica [1.0 : Zona general|0.9 : Zona reducida|0.8 : Zona reducida|0.7 : Okinawa]
Tc = 0.6 // Periodo característico del suelo [s] [0.4 : Tipo 1 (roca, grava dura)|0.6 : Tipo 2 (intermedio)|0.8 : Tipo 3 (aluvial, blando)]
H = 12 // Altura del edificio [m] [3..60]
alfa = 0 // Fracción de la altura con estructura de acero o madera [0..1]
wi = [2100, 2100, 2100, 1600] kN // Peso por piso (1 → n)
## Periodo y coeficientes
T = H*(0.02 + 0.01*alfa) // Periodo fundamental de diseño [s]
Rt = RtBSL(T, Tc) // Coeficiente espectral
W = sum(wi) // Peso total
Wsup = W - cumsum(wi) + wi // Peso sobre cada entrepiso
alpha_i = Wsup/W // Relación de pesos αi
Ai = AiBSL(alpha_i, T) // Distribución en altura
## Primera fase: sismo moderado (Co = 0.2)
Co = 0.2 // Coeficiente de corte basal estándar (0.2 daño; 1.0 última) [0.2..1.0]
Ci = Zj*Rt*Co*Ai // Coeficiente de corte de entrepiso
Qi = Ci .* Wsup // Cortante sísmico de entrepiso
di = [9, 11, 11, 9] mm // Deriva elástica de entrepiso (del modelo, con Qi)
hs = [3, 3, 3, 3] m // Altura de entrepiso
check max(di ./ hs) <= 1/200 // Deriva de entrepiso ≤ 1/200
## Segunda fase: resistencia última (Co = 1.0)
Ds = 0.30 // Coef. de características estructurales (C°A°) [0.30 : Muy dúctil (FA)|0.35 : Dúctil (FB)|0.40 : Moderada (FC)|0.45 : Baja (FD)|0.55 : Muros / frágil]
Rs = 0.8 // Rigidez relativa del entrepiso (rs/r̄s) [0.3..1.5]
Re = 0.10 // Excentricidad relativa (e/re) [0..0.5]
Fes = FsBSL(Rs)*FeBSL(Re) // Factor de forma Fs·Fe (Notificación MOC 1792): Fs = 1 si Rs ≥ 0.6; Fe = 1 si Re ≤ 0.15, 1.5 si Re ≥ 0.30
Qud = Zj*Rt*1.0*Ai .* Wsup // Cortante elástico último
Qun = Ds*Fes*Qud // Resistencia lateral requerida
Qu = [3100, 2600, 1900, 1050] kN // Resistencia lateral última de cada entrepiso (pushover)
check min(Qu ./ Qun) >= 1 // Qu ≥ Qun en todos los entrepisos`),
      { type: 'table', columnas: 'Piso = 1:4\n$\\alpha_i$ = alpha_i\n$A_i$ = Ai\n$C_i$ = Ci\n$Q_i$ [kN] = Qi\n$Q_{un}$ [kN] = Qun\n$Q_u$ [kN] = Qu', dec: '3', titulo: 'Coeficientes y cortantes por entrepiso (BSL)' },
      { type: 'plot', expr: 'Zj*RtBSL(x, 0.4); Zj*RtBSL(x, 0.6); Zj*RtBSL(x, 0.8)', var: 'x', desde: '0', hasta: '4', puntos: '300', xlabel: 'Periodo T [s]', ylabel: 'Z·Rt', leyenda: true, nombres: 'Suelo tipo 1 (Tc = 0.4 s); Suelo tipo 2 (Tc = 0.6 s); Suelo tipo 3 (Tc = 0.8 s)', titulo: 'Coeficiente espectral Rt según el tipo de suelo' },
      { type: 'summary' },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'espectros', normas: 'NTE E.030-2026 · ASCE 7-22 · EN 1998-1 (Eurocódigo 8) · Building Standard Law (Japón)', cat: 'Sismo — Internacional', name: 'Comparativo de espectros (Perú · EE. UU. · Europa · Japón)', icon: 'spectrum',
    desc: 'Grafica en un mismo eje los espectros de diseño reducidos de cuatro normas y compara la demanda para el periodo de la estructura.',
    titulo: 'Comparación de espectros de diseño sísmico',
    validacion: {
      fuente: 'Control: ordenadas espectrales de diseño de E.030-2026, ASCE 7-22, EN 1998-1 y BSL en la meseta',
      nota: 'Los datos por defecto no reproducen un ejemplo publicado: son valores de control de esta implementación (regresión), todos comprobados a mano: ZUCS/R = 0.45·2.5·1.133/8, SDS/(R/Ie) = 1/8, ag·S·2.5/q = 0.3·1.15·2.5/3.9 y Ds·Co·Rt.',
      valores: [
        { var: 'SaPE', esperado: 0.159375, tol: 0.001, desc: 'E.030-2026: ZUCS/R' },
        { var: 'SaUS', esperado: 0.125, tol: 0.0005, desc: 'ASCE 7-22: SDS/(R/Ie)' },
        { var: 'SaEU', esperado: 0.221154, tol: 0.0005, desc: 'EC8: ag·S·2.5/q' },
        { var: 'SaJP', esperado: 0.3, tol: 0.0005, desc: 'BSL: Ds·Z·Rt·Co' },
      ],
    },
    blocks: [
      calc(`# Periodo de la estructura
Te = 0.40 // Periodo fundamental [s] [0.05..4]
## Perú — NTE E.030-2026
Z = 0.45 // Zona 4 [0.10..0.45]
U = 1.0 // Factor de uso (categoría C) [1.0..1.5]
S = SE030(4, 300 m/s) // Suelo con Vs30 = 300 m/s
Tp = TpE030(300 m/s)
Tl = TlE030(300 m/s)
R = 8 // Pórticos de C°A° regulares [3..8]
SaPE = Z*U*CE030d(Te, Tp, Tl)*S/R // Sa/g de diseño, espectro del análisis dinámico con rama T < 0.2 TP (Art. 41, Tabla N° 6)
## EE. UU. — ASCE 7-22
SDS = 1.0 // Aceleración espectral de diseño a periodo corto [g] [0.1..2.0]
SD1 = 0.6 // Aceleración espectral de diseño a 1 s [g] [0.05..1.5]
TL = 8 // Periodo de transición largo [s] [4..16]
Rus = 8 // Pórtico especial [3..8]
Ie = 1.0 // Factor de importancia sísmica (Tabla 1.5-2) [1.0..1.5]
SaUS = SaASCE7(Te, SDS, SD1, TL)/(Rus/Ie) // Sa/g de diseño
## Europa — Eurocódigo 8 (espectro tipo 1, suelo C)
ag = 0.30 // Aceleración de diseño en roca [g] [0.05..0.5]
Sec = 1.15 // Factor de suelo S (suelo C) [1.0..1.8]
TB = 0.20 // Inicio de la meseta TB [s] [0.05..0.3]
TC = 0.60 // Fin de la meseta TC [s] [0.25..1.2]
TD = 2.0 // Inicio de la rama de desplazamiento TD [s] [1.2..2.5]
q = 3.9 // Coef. de comportamiento (pórtico DCM, 3·αu/α1) [1.5..6.5]
SaEU = SdEC8(Te, ag, Sec, TB, TC, TD, q) // Sd/g de diseño
## Japón — BSL (resistencia última, Co = 1.0)
Zj = 1.0 // Coeficiente de zona sísmica Z [0.7..1.0]
Tc = 0.6 // Suelo tipo 2 [0.4..0.8]
Ds = 0.30 // Pórtico de C°A° dúctil [0.25..0.55]
SaJP = Ds*Zj*RtBSL(Te, Tc)*1.0 // Coeficiente de corte último requerido`),
      { type: 'plot', expr: 'Z*U*CE030d(x, Tp, Tl)*S/R; SaASCE7(x, SDS, SD1, TL)/(Rus/Ie); SdEC8(x, ag, Sec, TB, TC, TD, q); Ds*Zj*RtBSL(x, Tc)', var: 'x', desde: '0.01', hasta: '3', puntos: '300', xlabel: 'Periodo T [s]', ylabel: 'Sa/g de diseño', leyenda: true, nombres: 'Perú E.030-2026; EE. UU. ASCE 7-22; Europa EC8; Japón BSL (Ds·Z·Rt)', titulo: 'Espectros de diseño reducidos de cuatro normas' },
      { type: 'table', columnas: 'Norma = ["E.030-2026 (Perú)", "ASCE 7-22 (EE. UU.)", "EN 1998-1 (Europa)", "BSL (Japón)"]\nSa/g de diseño para Te = [SaPE, SaUS, SaEU, SaJP]', dec: '3', titulo: 'Demanda sísmica de diseño para el periodo de la estructura' },
      text(`> La curva japonesa ($D_s Z R_t$) es una demanda de **resistencia última** del entrepiso; las demás son demandas de **resistencia de diseño**. Los espectros parten de amenazas sísmicas distintas (Z, SDS/SD1, ag) y de filosofías de reducción distintas (R, R/Ie, q, Ds). La comparación es ilustrativa: cada proyecto se diseña con la norma vigente del lugar. Para Chile (NCh433) vea *cl-nch433-estatico* y *cl-nch433-modal*; para Japón, *jp-bsl-n1461*.`),
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'sismo2018', normas: 'RNE — NTE E.030-2018 Diseño Sismorresistente (DS 003-2016 mod. RM 355-2018-VIVIENDA)', cat: 'Sismo — Perú', name: 'Sismo estático E.030-2018 (proyectos en transición)', icon: 'quake',
    desc: 'Para expedientes iniciados con la E.030-2018: perfiles S0–S3 (Tablas 3 y 4), sistema permitido (Tabla 6), restricciones (Tabla 10), aplicabilidad (28.1.2), C/R ≥ 0.11, distribución con k y derivas en el extremo (Tabla 11).',
    titulo: 'Análisis sísmico estático — NTE E.030-2018',
    validacion: {
      fuente: 'Control: NTE E.030-2018 (DS 003-2016 mod. RM 355-2018-VIVIENDA), método estático',
      nota: 'Los datos por defecto no reproducen un ejemplo publicado: son valores de control de esta implementación (regresión). V = 0.35·1·2.5·1.15/8·790 t se comprueba a mano (tests/verify.mjs).',
      valores: [
        { var: 'V', unidad: 'tonf', esperado: 99.3672, tol: 0.001, desc: 'Cortante basal ZUCS·P/R' },
        { var: 'T', unidad: 's', esperado: 0.342857, tol: 0.0005, desc: 'Periodo hn/CT' },
        { var: 'C', esperado: 2.5, tol: 0.0005, desc: 'Factor de amplificación sísmica' },
        { var: 'max(deriva_max)', esperado: 0.00616, tol: 0.002, desc: 'Deriva máxima en el extremo' },
      ],
    },
    blocks: [
      text(`# Alcance
Análisis sísmico estático según la **NTE E.030-2018** (RM N° 355-2018-VIVIENDA), aplicable **solo a proyectos en transición** cuyo expediente se inició antes de la vigencia de la RM N° 183-2026-VIVIENDA. Para proyectos nuevos use la plantilla *sismo* (E.030-2026, versión rápida) o la memoria completa *pe-e030-estatico*.

La numeración de artículos y tablas de esta memoria es la de la versión 2018: zonificación (Tabla N° 1), perfiles de suelo S0–S3 (Tablas N° 3 y 4), categoría (Tabla N° 5), sistemas permitidos (Tabla N° 6), $R_0$ (Tabla N° 7), irregularidades (Tablas N° 8 y 9), restricciones (Tabla N° 10) y distorsiones (Tabla N° 11). La E.030-2018 **no** exige la verificación del periodo $T_s$ del terreno (requisito introducido en 2026).`),
      calc(`# Parámetros sísmicos (NTE E.030-2018)
zona = 3 // Zona sísmica (Art. 10) [4 : Zona 4|3 : Zona 3|2 : Zona 2|1 : Zona 1]
Z = ZE030(zona) // Factor de zona (Tabla N° 1): 0.45 / 0.35 / 0.25 / 0.10
suelo = 2 // Perfil de suelo (Art. 12) [0 : S0 roca dura|1 : S1 roca o suelo muy rígido|2 : S2 suelo intermedio|3 : S3 suelo blando]
S = si(suelo == 0, 0.80, si(suelo == 1, 1.00, si(suelo == 2, si(zona == 4, 1.05, si(zona == 3, 1.15, si(zona == 2, 1.20, 1.60))), si(zona == 4, 1.10, si(zona == 3, 1.20, si(zona == 2, 1.40, 2.00)))))) // Factor de suelo (Tabla N° 3)
Tp = si(suelo == 0, 0.3, si(suelo == 1, 0.4, si(suelo == 2, 0.6, 1.0)))*1 s // Periodo TP (Tabla N° 4)
Tl = si(suelo == 0, 3.0, si(suelo == 1, 2.5, si(suelo == 2, 2.0, 1.6)))*1 s // Periodo TL (Tabla N° 4)
categoria = 4 // Categoría de la edificación (Art. 15, Tabla N° 5) [2 : A2 Esencial|3 : B Importante|4 : C Común]
U = UE030(categoria) // Factor de uso (Tabla N° 5): A2 1.5, B 1.3, C 1.0
sistema = 7 // Sistema estructural (Tabla N° 7) [7 : C°A° pórticos|8 : C°A° dual|9 : C°A° muros estructurales|10 : C°A° muros de ductilidad limitada|11 : Albañilería armada o confinada|1 : Acero SMF|2 : Acero IMF|3 : Acero OMF|4 : Acero SCBF|5 : Acero OCBF|6 : Acero EBF|12 : Madera]
check sisE030(categoria, zona, sistema) == 1 // Sistema permitido para la categoría y la zona (Art. 17, Tabla N° 6: igual a la Tabla N° 9 de 2026)
R0 = si(sistema == 10, 4, R0E030(sistema)) // Coeficiente básico de reducción (Tabla N° 7 de 2018: EMDL R0 = 4)
Ia = 1.0 // Irregularidad en altura (Tabla N° 8) [1.0 : Regular|0.90 : Masa o geometría vertical|0.80 : Discontinuidad en sistemas resistentes|0.75 : Piso blando o piso débil|0.60 : Discontinuidad extrema|0.50 : Rigidez o resistencia extrema]
Ip = 1.0 // Irregularidad en planta (Tabla N° 9) [1.0 : Regular|0.90 : Esquinas entrantes / sistemas no paralelos|0.85 : Discontinuidad del diafragma|0.75 : Torsión|0.60 : Torsión extrema]
regular = si(Ia*Ip == 1, 1, 0) // 1 = estructura regular (Art. 19)
extrema = si(min(Ia, Ip) <= 0.60, 1, 0) // 1 = existe alguna irregularidad extrema
npisos = 4 // Número de pisos [1..20]
hn = 12.0 m // Altura total de la edificación [3..60]
check (categoria == 2 and (regular == 1 or (zona == 1 and extrema == 0))) or (categoria == 3 and (extrema == 0 or zona == 1)) or (categoria == 4 and (extrema == 0 or zona == 1 or (zona == 2 and (npisos <= 2 or hn <= 8 m)))) // Restricciones a la irregularidad (Art. 21.1, Tabla N° 10)
check zona == 1 or (regular == 1 and hn <= 30 m) or ((sistema == 9 or sistema == 10 or sistema == 11) and hn <= 15 m) // Método estático aplicable: zona 1, regular ≤ 30 m, o muros portantes de C°A°/albañilería ≤ 15 m (Art. 28.1.2)
## Periodo y factor de amplificación
R = R0*Ia*Ip // Coeficiente de reducción (Art. 22)
muroscaja = 0 // Pórticos de C°A° con muros en las cajas de ascensores y escaleras [0 : No|1 : Sí (CT = 45)]
CT = si(sistema == 7 and muroscaja == 1, 45, CTE030(sistema)) // Coeficiente para el periodo (Art. 28.4.1)
T = hn/CT*1 s/m -> s // Periodo fundamental aproximado (Art. 28.4.1)
C = si(T < Tp, 2.5, si(T <= Tl, 2.5*Tp/T, 2.5*Tp*Tl/T^2)) // Factor de amplificación sísmica (Art. 14)
CR = max(C/R, 0.11) // C/R no menor que 0.11 (Art. 28.2.2): mínimo que se aplica, no una verificación
k = si(T <= 0.5 s, 1.0, min(0.75 + 0.5*T/(1 s), 2.0)) // Exponente de distribución (Art. 28.3.2)
## Cortante basal
wi = [210, 210, 210, 160] tonf // Peso sísmico por nivel 1 → n, con el % de carga viva del Art. 26
hi = [3, 6, 9, 12] m // Altura de cada nivel desde la base
P = sum(wi) // Peso sísmico total
V = Z*U*S*CR*P -> tonf // Fuerza cortante en la base (Art. 28.2.1)
alpha_i = wi .* hi.^k / sum(wi .* hi.^k) // Factor de distribución (Art. 28.3.1)
Fi = alpha_i*V // Fuerza en cada nivel
Vi = V - cumsum(Fi) + Fi // Cortante de entrepiso
"Las fuerzas se aplican en el centro de masas con una excentricidad accidental de 0.05 veces la dimensión perpendicular a la dirección de análisis (Art. 28.5).
## Control de derivas (Art. 31 y 32)
Di = [0.22, 0.28, 0.26, 0.19] cm // Desplazamiento relativo elástico de cada entrepiso en el centro de masas (del modelo)
hei = [3, 3, 3, 3] m // Altura de cada entrepiso
rt = [1.10, 1.10, 1.12, 1.12] // Relación Δextremo/ΔCM por entrepiso (modelo 3D con excentricidad accidental)
fR = si(regular == 1, 0.75, 0.85) // 0.75 R regular, 0.85 R irregular (Art. 31.1)
fCR = (C/R)/CR // Sin el mínimo C/R para los desplazamientos (Art. 31.2)
deriva = fR*R*fCR*Di ./ hei // Distorsión inelástica en el centro de masas
deriva_max = rt .* deriva // Máximo desplazamiento relativo de entrepiso, en el extremo (Art. 32)
dlim = si(sistema <= 6 or sistema == 12, 0.010, si(sistema == 10 or sistema == 11, 0.005, 0.007)) // Tabla N° 11: C°A° 0.007, acero y madera 0.010, albañilería y EMDL 0.005
check max(deriva_max) <= dlim // Distorsión máxima de entrepiso (Art. 32, Tabla N° 11)`),
      { type: 'table', columnas: 'Nivel = 1:4\nAltura $h_i$ [m] = hi\nPeso $w_i$ [tonf] = wi\n$\\alpha_i$ = alpha_i\nFuerza $F_i$ [tonf] = Fi\nCortante $V_i$ [tonf] = Vi\n$\\Delta_i/h_{ei}$ CM = deriva\n$\\Delta_{max}/h_{ei}$ extremo = deriva_max', total: false, dec: '4', titulo: 'Distribución de la fuerza sísmica en altura y derivas' },
      { type: 'spectrum', Z: 'Z', U: 'U', S: 'S', Tp: 'Tp', Tl: 'Tl', R: 'R', T: 'T', titulo: 'Espectro de pseudo-aceleraciones E.030-2018' },
      { type: 'summary' },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'puente', normas: 'AASHTO LRFD Bridge Design Specifications · Manual de Puentes MTC', cat: 'Puentes', name: 'Puente losa (AASHTO LRFD)', icon: 'bridge',
    desc: 'Puente tipo losa simplemente apoyado: espesor mínimo, ancho equivalente, carga HL-93 (camión, tándem, carril, IM), Resistencia I y refuerzo.',
    titulo: 'Diseño de puente tipo losa — AASHTO LRFD',
    validacion: {
      fuente: 'Control: AASHTO LRFD 3.6.1 (HL-93), 4.6.2.3 (ancho de franja) y 5.6 (losa maciza)',
      nota: 'Los datos por defecto no reproducen un ejemplo publicado: son valores de control de esta implementación (regresión). Tándem 2·11.34·(L/2 − 0.30)²/L y carril 0.952·L²/8 con L = 10 m se comprueban a mano.',
      valores: [
        { var: 'Mta', unidad: 'tonf*m', esperado: 50.1, tol: 0.002, desc: 'Momento del tándem' },
        { var: 'Mln', unidad: 'tonf*m', esperado: 11.9, tol: 0.002, desc: 'Momento del carril' },
        { var: 'E', unidad: 'm', esperado: 3.2, tol: 0.002, desc: 'Ancho de franja, varios carriles' },
        { var: 'Mu', unidad: 'tonf*m/m', esperado: 68.78, tol: 0.002, desc: 'Momento último por metro' },
        { var: 'phiMn', unidad: 'tonf*m/m', esperado: 73.46, tol: 0.002, desc: 'Resistencia a flexión por metro' },
      ],
    },
    blocks: [
      calc(`# Datos del puente
L = 10.0 m // Luz de cálculo (simplemente apoyado) [4..12]
W = 8.40 m // Ancho total del tablero [4..15]
NL = 2 // Número de carriles de diseño [1..4]
fc = 280 kgf/cm^2 // Resistencia del concreto [175..420]
fy = 4200 kgf/cm^2 // Fluencia del acero [2800..4200]
gammac = 2.5 tonf/m^3 // Peso unitario del concreto armado [2.2..2.5]
gammaw = 2.25 tonf/m^3 // Peso unitario del asfalto [2.0..2.4]
ta = 0.05 m // Espesor de la carpeta asfáltica [0.025..0.075]
wbar = 0.60 tonf/m // Peso de cada barrera / baranda [0.3..0.8]
bar = 8 // Varilla principal [6 : 3/4"|8 : 1"|9 : 1 1/8"|10 : 1 1/4"]
## Predimensionamiento (AASHTO Tabla 2.5.2.6.3-1)
hmin = 1.2*(L + 3 m)/30 -> m // Espesor mínimo losa simplemente apoyada
h = roundup(hmin, 0.05 m) // Espesor adoptado
## Cargas permanentes (franja de 1 m)
wDC = gammac*h + 2*wbar/W -> tonf/m^2 // Peso propio + barreras repartidas
wDW = gammaw*ta -> tonf/m^2 // Superficie de rodadura
MDC = wDC*L^2/8 -> tonf*m/m
MDW = wDW*L^2/8 -> tonf*m/m
## Carga viva vehicular HL-93
Mtr = MtruckHL93(L) // Momento máx. por camión de diseño (por carril)
Mta = MtandemHL93(L) // Momento máx. por tándem de diseño
Mln = MlaneHL93(L) // Momento por carga de carril (0.952 t/m)
IM = 0.33 // Incremento por carga dinámica [0.15..0.33]
MLL = max(Mtr, Mta)*(1 + IM) + Mln -> tonf*m // Momento por carril
## Ancho de franja equivalente (AASHTO 4.6.2.3)
L1 = min(L, 18 m)
W1 = min(W, 9 m)
E1 = 250 mm + 0.42*sqrt(L1*W1) -> m // Un carril cargado
E2 = min(2100 mm + 0.12*sqrt(L1*min(W, 18 m)), W/NL) -> m // Múltiples carriles
E = min(E1, E2) // Ancho de franja que controla
MLLu = MLL/E -> tonf*m/m // Momento por metro de ancho
## Resistencia I
Mu = 1.25*MDC + 1.50*MDW + 1.75*MLLu -> tonf*m/m
## Diseño del refuerzo principal
d = h - 2.5 cm - db(bar)/2 // Peralte efectivo
Rn = Mu*1 m/(0.9*100 cm*d^2) // Parámetro de resistencia
check Rn <= 0.85*fc/2 // Espesor suficiente como sección simplemente reforzada
rho = 0.85*fc/fy*(1 - sqrt(max(1 - 2*Rn/(0.85*fc), 0)))
As = rho*100 cm*d // Acero por metro
s = rounddown(max(min(Ab(bar)/As*100 cm, 1.5*h, 45 cm), 2.5 cm), 2.5 cm) // Espaciamiento: ≤ 1.5 h y 450 mm (5.10.3.2)
Asc = Ab(bar)*100 cm/s // Acero colocado
a = Asc*fy/(0.85*fc*100 cm)
beta1 = si(fc <= 280 kgf/cm^2, 0.85, max(0.65, 0.85 - 0.05*(fc - 280 kgf/cm^2)/(70 kgf/cm^2))) // 5.6.2.2
epst = 0.003*(d - a/beta1)/(a/beta1) // Deformación neta del acero
check epst >= 0.005 // Sección controlada por tracción, φ = 0.90 (5.5.4.2 y 5.6.2.1)
phiMn = 0.9*Asc*fy*(d - a/2)/(1 m) -> tonf*m/m // Resistencia de diseño
check Mu <= phiMn // Resistencia a flexión
fr = 2.01*sqrtfc(fc) // Módulo de rotura (0.63√f'c MPa)
Mcr = 1.6*0.67*fr*h^2/6 -> tonf*m/m // Momento de agrietamiento (5.6.3.3)
check phiMn >= min(1.33*Mu, Mcr) // Acero mínimo
## Refuerzo de distribución y temperatura
pdist = min(1750/sqrt(L/(1 mm)), 50)/100 // Porcentaje de distribución (5.12.2.1)
Asd = pdist*Asc // Refuerzo de distribución (inferior, transversal)
As1 = 0.75*W*h/(2*(W + h))*(1 MPa)/fy -> cm^2/m // 0.75·b·h/[2(b+h)·fy] (b, h en mm; fy en MPa)
Astem = min(max(As1, 2.33 cm^2/m), 12.7 cm^2/m) // Temperatura por cara (AASHTO 5.10.6)
"Usar #{bar} @ {s} como refuerzo principal; #5 @ {rounddown(Ab(5)/Asd*100 cm, 2.5 cm)} de distribución y #4 @ {rounddown(min(Ab(4)/Astem, 3*h, 45 cm), 2.5 cm)} de temperatura.
## Control de fisuración — Estado Límite de Servicio I (5.6.7)
Ms = MDC + MDW + MLLu -> tonf*m/m // Momento de servicio
fss = Ms*1 m/(Asc*0.875*d) -> kgf/cm^2 // Esfuerzo en el acero en servicio (j ≈ 0.875)
check fss <= 0.6*fy // Esfuerzo de servicio ≤ 0.6 fy
dc = h - d // Recubrimiento al centro de la barra
betas = 1 + dc/(0.7*(h - dc))
smaxcr = 123000*0.75/(betas*fss/(1 MPa))*1 mm - 2*dc -> cm // Espaciamiento máximo (γe = 0.75)
check s <= smaxcr // Control de fisuración
"Además: diseñar la franja de borde (4.6.2.1.4) y, opcionalmente, verificar la deflexión por carga viva ≤ L/800 (2.5.2.6.2). Se omiten los modificadores de carga $\\eta$ (1.3.2), que se toman iguales a 1. Para puentes viga-losa, estribos, pilares, apoyos y sismo vea las plantillas del módulo *Puentes* (*br-vigalosa*, *br-estribo*, *br-pilar*, *br-neopreno*, *br-sismo*).`),
      { type: 'plot', expr: 'MtruckHL93(x)*1.33 + MlaneHL93(x); MtandemHL93(x)*1.33 + MlaneHL93(x)', var: 'x', desde: '4', hasta: '25', puntos: '60', xlabel: 'Luz L [m]', ylabel: 'M_LL+IM [t·m/carril]', titulo: 'Momento HL-93 por carril (camión vs. tándem) en función de la luz', leyenda: true, nombres: 'Camión + carril; Tándem + carril' },
      text(`> Las losas diseñadas por momento según 4.6.2.3 se consideran satisfactorias por cortante (AASHTO LRFD 5.12.2.1).`),
      { type: 'summary' },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'acero', settings: { sys: 'us' }, normas: 'ANSI/AISC 360-16 (LRFD; F2 y G2 sin cambios en 360-22) · RNE — NTE E.090', cat: 'Acero estructural', name: 'Viga de acero W (AISC 360)', icon: 'steel',
    desc: 'Flexión con pandeo lateral-torsional (F2), compacidad de la sección y cortante (G2) por LRFD, con propiedades ingresadas a mano. Unidades inglesas.',
    titulo: 'Verificación de viga de acero — AISC 360-16 (LRFD)',
    validacion: {
      fuente: 'AISC Steel Construction Manual, Tabla 3-2: W12×26, Fy = 50 ksi → Lp = 5.33 ft, Lr = 14.9 ft, φbMp = 140 kip·ft',
      nota: 'Datos de la sección = W12×26 del Manual; Lp, Lr y φMp son valores tabulados. φMn (Lb = 10 ft, Cb = 1.14) y φVn son valores de control.',
      valores: [
        { var: 'Lp', unidad: 'ft', esperado: 5.33, tol: 0.003, desc: 'Tabla 3-2: Lp' },
        { var: 'Lr', unidad: 'ft', esperado: 14.9, tol: 0.005, desc: 'Tabla 3-2: Lr' },
        { var: '0.9*Mp', unidad: 'kip*ft', esperado: 140, tol: 0.005, desc: 'Tabla 3-2: φbMp' },
        { var: 'phiMn', unidad: 'kip*ft', esperado: 130.2, tol: 0.002, desc: 'Control: φMn con Lb = 10 ft' },
        { var: 'phiVn', unidad: 'kip', esperado: 84.18, tol: 0.002, desc: 'Control: φvVn (G2)' },
      ],
    },
    blocks: [
      text(`# Alcance
Verificación LRFD de una viga laminada W de sección compacta, flectada alrededor del eje fuerte (AISC 360-16 Cap. F2 y G2.1; las mismas expresiones se mantienen en AISC 360-22). Las propiedades se ingresan a mano (AISC *Manual*, Tabla 1-1); también pueden leerse de la base de datos con \`sec("W12X26", "Zx")\` o dibujarse con el bloque **steelsec**. Para columnas, vigas-columna, conexiones y placas base vea *st-columna*, *st-vigacolumna*, *st-shear-tab* y *st-placa-base*.`),
      calc(`# Sección W12x26 — ASTM A992
Fy = 50 ksi // Esfuerzo de fluencia [36..65]
Es = 29000 ksi // Módulo de elasticidad [28000..30000]
d = 12.2 in // Peralte [4..44]
bf = 6.49 in // Ancho del ala [3..17]
tf = 0.38 in // Espesor del ala [0.2..3]
tw = 0.23 in // Espesor del alma [0.15..2]
Zx = 37.2 in^3 // Módulo plástico
Sx = 33.4 in^3 // Módulo elástico
ry = 1.51 in // Radio de giro eje débil
rts = 1.75 in // Radio de giro efectivo
J = 0.30 in^4 // Constante torsional
ho = 11.8 in // Distancia entre centroides de alas
Lb = 10 ft // Longitud no arriostrada [0..40]
Cb = 1.14 // Factor de gradiente de momento [1.0..3.0]
Mu = 90 kip*ft // Momento último [0..1500]
Vu = 35 kip // Cortante último [0..500]
## Compacidad (Tabla B4.1b)
lambdaf = bf/(2*tf)
check lambdaf <= 0.38*sqrt(Es/Fy) // Ala compacta
lambdaw = (d - 2*tf)/tw
check lambdaw <= 3.76*sqrt(Es/Fy) // Alma compacta
## Pandeo lateral-torsional (F2)
Mp = Fy*Zx -> kip*ft // Momento plástico
Lp = 1.76*ry*sqrt(Es/Fy) -> ft
Lr = 1.95*rts*Es/(0.7*Fy)*sqrt(J/(Sx*ho) + sqrt((J/(Sx*ho))^2 + 6.76*(0.7*Fy/Es)^2)) -> ft
Fcr = Cb*pi^2*Es/(Lb/rts)^2*sqrt(1 + 0.078*J/(Sx*ho)*(Lb/rts)^2) -> ksi
Mn = si(Lb <= Lp, Mp, si(Lb <= Lr, min(Cb*(Mp - (Mp - 0.7*Fy*Sx)*(Lb - Lp)/(Lr - Lp)), Mp), min(Fcr*Sx, Mp))) -> kip*ft
phiMn = 0.9*Mn -> kip*ft
check Mu <= phiMn // Resistencia a flexión
## Cortante (G2.1)
Aw = d*tw // Área del alma
check (d - 2*tf)/tw <= 2.24*sqrt(Es/Fy) // Cv1 = 1.0, φv = 1.0
phiVn = 1.0*0.6*Fy*Aw -> kip
check Vu <= phiVn // Resistencia a cortante`),
      { type: 'plot', expr: 'si(x <= Lp/(1 ft), Mp/(1 kip*ft), si(x <= Lr/(1 ft), min(Cb*(Mp - (Mp - 0.7*Fy*Sx)*(x ft - Lp)/(Lr - Lp)), Mp)/(1 kip*ft), min(Cb*pi^2*Es/((x ft)/rts)^2*sqrt(1 + 0.078*J/(Sx*ho)*((x ft)/rts)^2)*Sx, Mp)/(1 kip*ft)))*0.9', var: 'x', desde: '1', hasta: '30', puntos: '200', xlabel: 'Lb [ft]', ylabel: 'φMn [kip·ft]', titulo: 'Curva de capacidad φMn vs. longitud no arriostrada' },
      { type: 'summary' },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'predim', normas: 'RNE — NTE E.060 Concreto Armado (práctica de predimensionamiento)', cat: 'Concreto armado', name: 'Predimensionamiento', icon: 'grid',
    desc: 'Peraltes de losas y vigas, y sección de columnas por carga axial de servicio (práctica peruana con E.060).',
    titulo: 'Predimensionamiento de elementos estructurales',
    validacion: {
      fuente: 'Control: reglas de predimensionamiento (E.060 Tabla 9.1, Ln/12, P/(0.45 f′c) y P/(0.35 f′c))',
      nota: 'Los datos por defecto no reproducen un ejemplo publicado: son valores de control de esta implementación (regresión), todos comprobados a mano.',
      valores: [
        { var: 'h_91', unidad: 'cm', esperado: 29.7297, tol: 0.0005, desc: 'h = Ln/18.5 (E.060 Tabla 9.1)' },
        { var: 'h_v', unidad: 'cm', esperado: 50, tol: 0.0001, desc: 'Peralte de viga adoptado' },
        { var: 'Ac_c', unidad: 'cm^2', esperado: 846.56, tol: 0.001, desc: 'Área de columna central P/(0.45 f′c)' },
        { var: 'Ac_e', unidad: 'cm^2', esperado: 544.217, tol: 0.001, desc: 'Área de columna perimetral P/(0.35 f′c)' },
      ],
    },
    blocks: [
      calc(`# Datos generales
fc = 210 kgf/cm^2 // Resistencia del concreto [175..420]
Ln = 5.50 m // Luz libre mayor entre apoyos [3..10]
N = 4 // Número de pisos [1..20]
wpiso = 1.0 tonf/m^2 // Peso por piso (categoría C, aprox.) [0.8 tonf/m^2|1.0 tonf/m^2|1.2 tonf/m^2|1.5 tonf/m^2]
Atc = 20 m^2 // Área tributaria de la columna central [5..60]
Ate = 10 m^2 // Área tributaria de la columna perimetral [3..40]
## Losas
h_al = roundup(Ln/25, 0.05 m) -> cm // Aligerado en una dirección: práctica h ≈ Ln/25
h_91 = Ln/18.5 -> cm // Aligerado que no requiere verificar deflexiones, tramo con un extremo continuo (E.060 Tabla 9.1)
h_mz = roundup(Ln/40, 0.01 m) -> cm // Losa maciza en dos direcciones: h ≈ Ln/40 o perímetro/180 (práctica)
## Vigas principales
h_v = roundup(Ln/11, 0.05 m) -> cm // Peralte h = Ln/10 a Ln/12
b_v = max(roundup(h_v/2, 5 cm), 25 cm) // Ancho b ≈ h/2 (práctica)
check b_v >= max(0.25*h_v, 25 cm) // Vigas sísmicas: b ≥ 0.25 h y ≥ 250 mm (E.060 21.5.1.3)
check Ln >= 4*h_v // Luz libre ≥ 4 h (E.060 21.5.1.2); si no, viga de gran peralte
## Columnas
Pc = wpiso*Atc*N // Carga de servicio, columna central
Ac_c = Pc/(0.45*fc) -> cm^2 // Área requerida (columna central)
lc_c = max(roundup(sqrt(Ac_c), 5 cm), 25 cm) // Lado de columna cuadrada
Pe = wpiso*Ate*N // Carga de servicio, columna perimetral
Ac_e = Pe/(0.35*fc) -> cm^2 // Área requerida (columna perimetral / esquina)
lc_e = max(roundup(sqrt(Ac_e), 5 cm), 25 cm)
"Resultado: aligerado h = {h_al}, vigas {b_v} × {h_v}, columnas centrales {lc_c} × {lc_c} y perimetrales {lc_e} × {lc_e}.`),
      text(`> El peralte Ln/25 del aligerado es práctica usual pero menor que el de la Tabla 9.1 de E.060 ($h_{91}$), por lo que debe verificarse la deflexión (*co-deflexion*). Las áreas de columnas $P/(0.45 f'_c)$ y $P/(0.35 f'_c)$ son criterios prácticos para edificios con muros (Blanco Blasco); en sistemas aporticados conviene verificar la rigidez lateral desde el inicio. El predimensionamiento es referencial: las dimensiones finales deben confirmarse con el análisis sísmico (derivas E.030-2026, Art. 51) y el diseño por resistencia.`),
      { type: 'summary' },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'combos', normas: 'RNE — NTE E.060 Art. 9.2', cat: 'Cargas y combinaciones', name: 'Combinaciones de carga E.060', icon: 'table',
    desc: 'Cinco combinaciones de diseño de la NTE E.060 (Art. 9.2) para P, M y V, con la envolvente.',
    titulo: 'Combinaciones de carga — NTE E.060',
    validacion: {
      fuente: 'Control: NTE E.060 Art. 9.2 (U = 1.4CM + 1.7CV; 1.25(CM + CV) ± CS; 0.9CM ± CS)',
      nota: 'Los datos por defecto no reproducen un ejemplo publicado: son valores de control de esta implementación (regresión), comprobados a mano: Pu,máx = 1.4·45 + 1.7·15 = 88.5 t; Pu,mín = 0.9·45 − 8 = 32.5 t.',
      valores: [
        { var: 'Pumax', unidad: 'tonf', esperado: 88.5, tol: 0.0005, desc: 'Pu máximo' },
        { var: 'Pu_min', unidad: 'tonf', esperado: 32.5, tol: 0.0005, desc: 'Pu mínimo' },
        { var: 'Mumax', unidad: 'tonf*m', esperado: 14.875, tol: 0.0005, desc: 'Mu máximo 1.25(3.2 + 1.1) + 9.5' },
        { var: 'Vumax', unidad: 'tonf', esperado: 8.2, tol: 0.0005, desc: 'Vu máximo 1.25(1.8 + 0.6) + 5.2' },
      ],
    },
    blocks: [
      calc(`# Esfuerzos de servicio por tipo de carga
PD = 45 tonf // Axial por carga muerta [0..500]
PL = 15 tonf // Axial por carga viva [0..300]
PS = 8 tonf // Axial por sismo [0..200]
MD = 3.2 tonf*m // Momento por carga muerta [0..100]
ML = 1.1 tonf*m // Momento por carga viva [0..100]
MS = 9.5 tonf*m // Momento por sismo [0..100]
VD = 1.8 tonf // Cortante por carga muerta [0..50]
VL = 0.6 tonf // Cortante por carga viva [0..50]
VS = 5.2 tonf // Cortante por sismo [0..50]
## Combinaciones (E.060 Art. 9.2.1 y 9.2.3)
cD = [1.4, 1.25, 1.25, 0.9, 0.9] // Factores de carga muerta
cL = [1.7, 1.25, 1.25, 0, 0] // Factores de carga viva
cS = [0, 1, -1, 1, -1] // Factores de sismo
Pu = cD*PD + cL*PL + cS*PS // Carga axial última
Mu = cD*MD + cL*ML + cS*MS // Momento último
Vu = cD*VD + cL*VL + cS*VS // Cortante último
Pumax = max(Pu) // Máxima carga axial
Pu_min = min(Pu) // Mínima carga axial (crítica para tracción, volteo y flexocompresión con poca carga)
Mumax = max(abs(Mu)) // Máximo momento
Vumax = max(abs(Vu)) // Máximo cortante`),
      { type: 'table', columnas: 'Combinación = ["1.4CM+1.7CV", "1.25(CM+CV)+CS", "1.25(CM+CV)−CS", "0.9CM+CS", "0.9CM−CS"]\nPu [tonf] = Pu\nMu [tonf*m] = Mu\nVu [tonf] = Vu', dec: '2', titulo: 'Combinaciones de diseño' },
      text(`> Combinaciones de la NTE E.060 Art. 9.2.1 y 9.2.3 con las fuerzas de sismo de la E.030 (resistencia). Si hay viento se usan 1.25(CM + CV ± CVi) y 0.9 CM ± 1.25 CVi (9.2.2); con empuje lateral del suelo, 1.4 CM + 1.7 CV + 1.7 CE (9.2.4); con fluidos, 1.4 CF (9.2.5). Para elementos de sistemas con muros o dual tipo I el cortante de diseño se amplifica según 21.4.3 (2.5 CS). El metrado de cargas por E.020 se desarrolla en *pe-e020-metrado*.`),
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'albanileria', normas: 'RNE — NTE E.070 Albañilería, E.030', cat: 'Albañilería', name: 'Muro de albañilería confinada E.070', icon: 'wall',
    desc: 'Densidad de muros, esfuerzo axial admisible, control de fisuración y resistencia al corte Vm (NTE E.070).',
    titulo: 'Verificación de muro de albañilería confinada — NTE E.070',
    validacion: {
      fuente: 'Control: NTE E.070 (Art. 19, 26 y 27)',
      nota: 'Los datos por defecto no reproducen un ejemplo publicado: son valores de control de esta implementación (regresión). Densidad ΣLt/Ap = 3.6/120 y mínima ZUSN/56 = 0.35·1·1.15·4/56 se comprueban a mano.',
      valores: [
        { var: 'dens', esperado: 0.03, tol: 0.0005, desc: 'Densidad de muros ΣLt/Ap' },
        { var: 'dmin', esperado: 0.02875, tol: 0.0005, desc: 'Densidad mínima ZUSN/56' },
        { var: 'sigmam', unidad: 'kgf/cm^2', esperado: 4.0293, tol: 0.001, desc: 'Esfuerzo axial Pm/(L·t)' },
        { var: 'Vm', unidad: 'tonf', esperado: 26.25, tol: 0.002, desc: 'Resistencia al agrietamiento diagonal (26.3)' },
        { var: 'factor', esperado: 2.763, tol: 0.002, desc: 'Factor de amplificación Vm/Ve' },
      ],
    },
    blocks: [
      calc(`# Datos del muro y de la edificación
L = 4.20 m // Longitud total del muro (incluye columnas) [1..8]
t = 13 cm // Espesor efectivo del muro (soga) [9..25]
h = 2.40 m // Altura libre del muro [2.2..3.0]
fm = 65 kgf/cm^2 // Resistencia a compresión f'm (ladrillo King Kong industrial) [35..100]
vm = 8.1 kgf/cm^2 // Resistencia al corte v'm [5..10]
Pm = 22 tonf // Carga de gravedad máxima de servicio (CM + CV) [0..100]
Pg = 18 tonf // Carga de gravedad con 25 % de sobrecarga [0..100]
Ve = 9.5 tonf // Cortante del sismo moderado (análisis elástico) [0..50]
Me = 26 tonf*m // Momento del sismo moderado [0..100]
## Densidad mínima de muros (Art. 19.2.b) — dirección analizada
Z = 0.35 // Factor de zona (E.030 Tabla N° 1) [0.45 : Zona 4|0.35 : Zona 3|0.25 : Zona 2|0.10 : Zona 1]
U = 1.0 // Factor de uso (E.030) [1.0 : C Común|1.3 : B Importante|1.5 : A2 Esencial]
S = 1.15 // Factor de suelo (E.030-2026: SE030(zona, Vs30); E.030-2018: Tabla N° 3) [0.8..2.0]
N = 4 // Número de pisos [1..6]
SumLt = 3.60 m^2 // Σ L·t de muros portantes en la dirección [0.5..20]
Ap = 120 m^2 // Área de la planta típica [20..500]
dens = SumLt/Ap // Densidad de muros
dmin = Z*U*S*N/56 // Densidad mínima
check dens >= dmin // Densidad de muros suficiente
check t >= si(Z > 0.10, h/20, h/25) // Espesor efectivo mínimo: h/20 en zonas 2–4, h/25 en zona 1 (Art. 19.1.a)
## Esfuerzo axial máximo (Art. 19.1.b)
sigmam = Pm/(L*t) -> kgf/cm^2 // Esfuerzo axial actuante
Fa = min(0.2*fm*(1 - (h/(35*t))^2), 0.15*fm) // Esfuerzo admisible
check sigmam <= Fa // Esfuerzo axial
## Resistencia al agrietamiento diagonal (Art. 26.3)
alpha = min(max(Ve*L/Me, 1/3), 1) // Factor de esbeltez 1/3 ≤ α ≤ 1
Vm = 0.5*vm*alpha*t*L + 0.23*Pg -> tonf // Resistencia al corte (unidades de arcilla)
check Ve <= 0.55*Vm // Control de fisuración ante sismo moderado (Art. 26.2)
## Fuerzas internas ante sismo severo (Art. 26.4 y 27)
factor = min(max(Vm/Ve, 2), 3) // Factor Vm1/Ve1 (2 a 3), válido para muro del primer piso
Vu = factor*Ve // Cortante último ante sismo severo
Mu = factor*Me // Momento último
## Refuerzo horizontal (Art. 27.1)
"Requiere refuerzo horizontal continuo ($\\rho \\ge 0.001$) si $V_u \\ge V_m$ ({si(Vu >= Vm, "sí", "no")}), si $\\sigma_m \\ge 0.05 f'_m$ ({si(sigmam >= 0.05*fm, "sí", "no")}: $\\sigma_m/f'_m$ = {sigmam/fm}) o, en edificios de más de tres pisos, en todos los muros portantes del primer nivel ({si(N > 3, "sí", "no")}).`),
      text(`> La resistencia global del entrepiso ($\\Sigma V_m \\ge V_E$, Art. 26.4) debe verificarse con todos los muros del piso. El diseño de los elementos de confinamiento (columnas y vigas soleras, Art. 27) debe completarse con las fuerzas $V_u$ y $M_u$ obtenidas, considerando todos los muros del piso. Esta plantilla es la verificación **rápida de un muro**; el edificio completo (planta de muros, centro de rigidez, torsión, resistencia global y diseño de confinamientos) se desarrolla en *ma-edificio* y la albañilería armada en *ma-armada*.`),
      { type: 'summary' },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'escalera', normas: 'RNE — NTE E.020, E.060, A.010', cat: 'Concreto armado', name: 'Escalera de un tramo', icon: 'slab',
    desc: 'Garganta, metrado con peso de pasos, momento de diseño y refuerzo longitudinal y de temperatura (E.060 / E.020).',
    titulo: 'Diseño de escalera de concreto armado',
    validacion: {
      fuente: 'Control: NTE E.020, E.060 y RNE A.010 (escalera de un tramo, losa inclinada)',
      nota: 'Los datos por defecto no reproducen un ejemplo publicado: son valores de control de esta implementación (regresión). θ = atan(17.5/25) y hm = t/cosθ + cp/2 se comprueban a mano.',
      valores: [
        { var: 'theta', unidad: 'deg', esperado: 34.992, tol: 0.0005, desc: 'Inclinación atan(cp/p)' },
        { var: 'hm', unidad: 'cm', esperado: 27.0598, tol: 0.0005, desc: 'Espesor medio t/cosθ + cp/2' },
        { var: 'Mu', unidad: 'tonf*m/m', esperado: 2.251, tol: 0.002, desc: 'Momento último' },
        { var: 'As', unidad: 'cm^2', esperado: 5.061, tol: 0.002, desc: 'Acero requerido en el ancho B' },
        { var: 'phiVc', unidad: 'tonf/m', esperado: 8.069, tol: 0.002, desc: 'Resistencia a cortante' },
      ],
    },
    blocks: [
      calc(`# Geometría
Ln = 3.60 m // Luz horizontal del tramo (entre apoyos) [2..6]
p = 25 cm // Paso [25..30]
cp = 17.5 cm // Contrapaso [15..18]
t = 15 cm // Espesor de la garganta [10..25]
B = 1.20 m // Ancho de la escalera [0.9..2.4]
fc = 210 kgf/cm^2 // Resistencia del concreto [175..420]
fy = 4200 kgf/cm^2 // Acero ASTM A615 Grado 60 [2800..4200]
gammac = 2.4 tonf/m^3 // Peso específico del concreto [2.2..2.5]
wac = 0.10 tonf/m^2 // Acabados [0.05..0.15]
sc = 0.20 tonf/m^2 // Sobrecarga (E.020: viviendas) [0.20 tonf/m^2|0.40 tonf/m^2|0.50 tonf/m^2]
alfa = 1.0 // Coef. de momento (1.0 apoyos simples; 0.8 semiempotrado) [1.0|0.9|0.8]
## Verificación de geometría
check 2*cp + p >= 60 cm // Regla 2cp + p ≥ 60 cm (RNE A.010)
check 2*cp + p <= 64 cm // Regla 2cp + p ≤ 64 cm (RNE A.010)
check p >= 25 cm // Paso mínimo 25 cm (RNE A.010)
check cp <= 18 cm // Contrapaso máximo 18 cm (RNE A.010)
check t >= Ln/25 // Espesor de garganta: práctica Ln/20 – Ln/25 (control de deflexiones)
## Metrado (por metro de ancho)
theta = atan(cp/p) -> deg // Inclinación
hm = t/cos(theta) + cp/2 // Altura media equivalente
wD = gammac*hm + wac -> tonf/m^2 // Carga muerta
wu = 1.4*wD + 1.7*sc -> tonf/m^2 // Carga última (E.060 9.2.1)
Mu = alfa*wu*Ln^2/8 -> tonf*m/m // Momento último
## Diseño del refuerzo longitudinal
d = t - 2 cm - 0.64 cm // Peralte efectivo (varilla 1/2")
Rn = Mu*1 m/(0.9*100 cm*d^2)
check Rn <= 0.85*fc/2 // Garganta suficiente por flexión
rho = 0.85*fc/fy*(1 - sqrt(max(1 - 2*Rn/(0.85*fc), 0)))
As = max(rho*100 cm*d, 0.0018*100 cm*t) // Acero por metro (mín. 0.0018 b h, E.060 10.5.4 y 9.7.2)
s = rounddown(max(min(Ab(4)/As*100 cm, 3*t, 40 cm), 2.5 cm), 2.5 cm) // Espaciamiento con 1/2": ≤ 3h y 400 mm (E.060 10.5.4)
check Ab(4)/s*100 cm >= As // Acero colocado ≥ requerido
Ast = 0.0018*100 cm*t // Acero de temperatura (transversal)
st = rounddown(min(Ab(3)/Ast*100 cm, 5*t, 40 cm), 2.5 cm) // Espaciamiento con 3/8"
phiVc = 0.85*0.53*sqrtfc(fc)*100 cm*d/(1 m) -> tonf/m // Resistencia al corte por metro
Vu = wu*(Ln/2 - d)*cos(theta) -> tonf/m // Cortante último a "d"
check Vu <= phiVc // Cortante
Asneg = As/3 // Acero negativo en los apoyos (práctica: As/3)
"Refuerzo longitudinal: varilla de 1/2\" @ {s}; negativo en apoyos {Asneg} por metro; refuerzo transversal: 3/8\" @ {st}.`),
      { type: 'summary' },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'guia', normas: '—', cat: 'General', name: 'Guía rápida (ejemplos de sintaxis)', icon: 'book',
    desc: 'Aprende en pocos minutos: variables con unidades, fórmulas, verificaciones, listas, funciones normativas de varios países, vectores, matrices, textos ("W12X26") y bloques de análisis (pórtico 2D, modal, perfiles).',
    titulo: 'Guía rápida de MemoriaCalc',
    validacion: {
      fuente: 'Control: ejemplos de sintaxis con fórmulas cerradas (wL²/8, Ka de Rankine, Nq de Prandtl-Reissner)',
      nota: 'Memoria de demostración: M = wL²/8 = 11.25 t·m, Ka (30°) = 1/3 y Nq (30°) = 18.40 (Das Tabla 3.3) son valores exactos o tabulados.',
      valores: [
        { var: 'M', unidad: 'tonf*m', esperado: 11.25, tol: 0.0005, desc: 'wL²/8 = 2.5·36/8' },
        { var: 'Ka', esperado: 0.33333, tol: 0.0005, desc: 'Ka de Rankine (30°)' },
        { var: 'Nq', esperado: 18.4, tol: 0.002, desc: 'Das Tabla 3.3: Nq (30°)' },
        { var: 'sigma', unidad: 'kgf/cm^2', esperado: 75, tol: 0.0005, desc: 'Esfuerzo de flexión M/S' },
      ],
    },
    blocks: [
      text(`# Cómo escribir una memoria
Cada **bloque de cálculo** se escribe como en una hoja: \`nombre = expresión\`. El programa genera automáticamente la fórmula simbólica, la sustitución de valores y el resultado con unidades.

| Escribe | Obtienes |
|---|---|
| \`b = 30 cm // Ancho\` | Dato de entrada (aparece en la pestaña **Datos**) |
| \`A = b*h\` | Fórmula + sustitución + resultado |
| \`M = w*L^2/8 -> tonf*m\` | Resultado convertido a la unidad indicada |
| \`check Mu <= phiMn // Flexión\` | Verificación ✔ CUMPLE / ✘ NO CUMPLE con D/C |
| \`check a == 1 or zona < 4\` | Verificación lógica (\`and\`, \`or\`, \`not\`, \`==\`) |
| \`# Título\`, \`## Subtítulo\` | Títulos numerados automáticamente |
| \`"Texto con {A} y $\\\\alpha$\` | Párrafo con valores y LaTeX |
| \`@modo corto\` / \`@ocultar\` / \`@dec 3\` / \`@salto\` | Directivas de presentación |
| \`fc = 210 kgf/cm^2 // f'c [175 kgf/cm^2\\|210 kgf/cm^2]\` | Dato con lista desplegable |
| \`zona = 4 // Zona [4 : Zona 4\\|3 : Zona 3]\` | Lista con etiquetas (valor : texto) |
| \`perfil = "W12X26"\` | Variable de texto (perfiles, nombres) |

**Nombres → símbolos:** \`Mu\` → $M_u$, \`phiMn\` → $\\\\phi M_n$, \`As_min\` → $A_{s,min}$, \`beta1\` → $\\\\beta_1$, \`fc\` → $f'_c$. No use como variable el nombre de una unidad que se use después (\`m\`, \`s\`, \`N\`, \`t\`, \`g\`): use \`sep\`, \`esp\`, \`hz\`…`),
      calc(`## Variables, unidades y fórmulas
b = 25 cm // Ancho [20..60]
h = 60 cm // Altura [30..100]
fc = 210 kgf/cm^2 // Resistencia del concreto [175 kgf/cm^2|210 kgf/cm^2|280 kgf/cm^2]
w = 2.5 tonf/m // Carga distribuida [0..10]
L = 6 m // Luz [2..12]
A = b*h // Área
Ig = b*h^3/12 // Inercia
M = w*L^2/8 -> tonf*m // Momento máximo
sigma = M*(h/2)/Ig -> kgf/cm^2 // Esfuerzo de flexión
fadm = 0.45*fc // Esfuerzo admisible en compresión
check sigma <= fadm // Esfuerzo de servicio
## Funciones y condicionales
beta1 = si(fc <= 280 kgf/cm^2, 0.85, 0.80) // si(condición, valor_si, valor_no)
n = ceil(5.3) // ceil, floor, round, max, min, abs, sqrt, sin, cos, tan, log...
As1 = Ab(5) // Área de varilla #5 (5/8"); db(5) da el diámetro
sep = rounddown(0.27 m, 2.5 cm) // roundup / rounddown a un múltiplo
f(x) = 3*x^2 + 2 // Función definida por el usuario
y = f(2)`),
      calc(`## Funciones normativas de varios países
"Cada módulo normativo agrega funciones con el nombre de la norma al final (lista completa en el menú **Funciones**):
zona = 4 // Zona sísmica E.030 [4 : Zona 4|3 : Zona 3|2 : Zona 2|1 : Zona 1]
Z = ZE030(zona) // Perú — E.030-2026, Tabla N° 1
S = SE030(zona, 300 m/s) // Perú — factor de suelo interpolado por Vs30
Tp = TpE030(300 m/s) // Perú — periodo TP
Tl = TlE030(300 m/s) // Perú — periodo TL
U = UE030(4) // Perú — categoría C
R = R0E030(7) // Perú — pórticos de C°A° (R0 = 8)
check sisE030(4, zona, 7) == 1 // Perú — sistema permitido (Tabla N° 9)
Ao = AoNCh433(3) // Chile — NCh433, aceleración efectiva zona 3
Rt = RtBSL(0.6, 0.6) // Japón — BSL, coeficiente espectral Rt(T, Tc)
Sa_us = SaASCE7(0.6, 1.0, 0.6, 8) // EE. UU. — ASCE 7-22, Sa(T, SDS, SD1, TL)
ld = ldE060(5, fc, 4200 kgf/cm^2) // Concreto — E.060 Tabla 12.1, ld de una barra #5
Ka = KaRankine(30 deg) // Muros — empuje activo de Rankine
Nq = NqBC(30 deg) // Geotecnia — factor de capacidad de carga Nq
## Textos y perfiles de acero
perfil = "W12X26" // Perfil de la base AISC / europea (W, HSS, C, L, IPE, HEB…)
Zx = sec(perfil, "Zx") // Módulo plástico leído de la base de datos
ry = sec(perfil, "ry") // Radio de giro
Fy = 345 MPa // Acero A992 [250..485]
phiMp = 0.9*Fy*Zx -> kN*m // Momento plástico de diseño`),
      { type: 'steelsec', perfil: 'W12X26', sufijo: 'w', tabla: false, titulo: 'Bloque «Perfil de acero»: dibujo y propiedades exportadas (A_w, Zx_w, rts_w…)' },
      calc(`## Vectores y matrices
x_i = [1, 2, 3, 4] m // Vector fila con unidades
total = sum(x_i) // sum, cumsum, max, min, mean
x2 = x_i .^ 2 // Operaciones elemento a elemento: .*  ./  .^
niv = 1:4 // Rango 1, 2, 3, 4
Km = [[2, -1, 0], [-1, 2, -1], [0, -1, 1]] // Matriz (filas entre corchetes)
Fv = [1; 0; 0] // Vector columna (filas separadas por ;)
ud = lusolve(Km, Fv) // Solución de Km·u = F
dK = det(Km) // Determinante; también inv(), transpose(), comp(v, i)`),
      { type: 'plot', expr: 'w*x*(6 - x)/2', var: 'x', desde: '0', hasta: '6', xlabel: 'x [m]', ylabel: 'M(x) [t·m]', titulo: 'Bloque «Gráfico»: momento en viga simplemente apoyada' },
      text(`## Bloques de análisis y dibujo
Además de los bloques de cálculo y texto, la barra **Insertar** ofrece bloques registrados que calculan, dibujan y **exportan variables** a los cálculos siguientes (por ejemplo \`Mmax\`, \`T1\`, \`DCpmg\`):

| Grupo | Bloques |
|---|---|
| Análisis | \`beam\` viga continua, \`frame2d\` pórtico / armadura 2D, \`beamcase\`, \`influence\`, \`cross\` |
| Sismo | \`spectrum\`, \`modal\` análisis modal espectral, \`storyforces\`, \`irregE030\`, \`junta\`, \`lrb\` (E.031), \`spectrumCL\`, \`aidist\`, \`qunqu\` |
| Concreto | \`section\`, \`pm\`, \`pmgen\` P–M de secciones arbitrarias, \`slab2way\`, \`stmbeam\`, \`mensula\`, \`muroCL\`, \`secjp\` |
| Cimentaciones y geotecnia | \`footing\`, \`winkler\` viga sobre lecho elástico, \`stripfooting\`, \`pilegroup\`, \`soilprofile\`, \`slope\`, \`liqchart\` |
| Muros | \`wall\`, \`retwall\` estabilidad (Rankine/Coulomb, M-O), \`wallrebar\`, \`gabionwall\`, \`msewall\`, \`sheetpile\` |
| Acero | \`steelsec\` perfil de la base AISC/europea, \`basepl\`, \`boltgroup\`, \`armadura\` |
| Puentes | \`hl93env\`, \`bridgesec\`, \`estribo\`, \`pmLRFD\` |
| Otros | \`plot\`, \`table\`, \`stackbar\`, \`wallplan\`, \`windgable\`, \`galponCL\`, \`tanque\`, \`cilindro\`, \`tankwall\`, \`kaberyo\`, \`tijeral\` |

A continuación, un pórtico de un vano resuelto por rigidez (bloque **frame2d**) y un edificio de cortante de tres pisos con análisis modal espectral E.030 (bloque **modal**), ambos alimentados por variables del documento.`),
      { type: 'frame2d', tipo: 'portico', unidades: 't', nudos: '1 0 0\n2 0 3\n3 6 3\n4 6 0', secciones: 'C rect 0.40 0.40 2.17e6\nV rect 0.30 0.60 2.17e6', barras: '1 1 2 C\n2 2 3 V\n3 4 3 C', apoyos: '1 E\n4 E', cargas: 'CM: U 2 w\nCS: N 2 3 0', combinaciones: 'U1 = 1.4 CM\nU2 = 1.25 CM ± CS', graficos: 'C M D', deflim: '', deriva_caso: '', titulo: 'Bloque «Pórtico 2D»: diagrama de momentos y deformada' },
      calc(`"Resultados exportados por el pórtico: momento máximo {Mmax}, cortante máximo {Vmax}.
P_i = [120, 120, 90] tonf // Peso por nivel
Ki = [30000, 26000, 20000] tonf/m // Rigidez lateral de entrepiso
hei = [3, 3, 3] m // Altura de entrepiso`),
      { type: 'modal', masas: 'P_i', rigideces: 'Ki', alturas: 'hei', Sa: 'Z*U*CE030d(T, Tp, Tl)*S/R', comb: 'CQC', beta: '0.05', modos: '', fdesp: '0.75*R', dlim: '0.007', titulo: 'Bloque «Análisis modal espectral»: modos, cortantes y derivas' },
      calc(`"Periodo fundamental exportado por el bloque modal: $T_1$ = {T1}; cortante basal dinámico {Vdin}.
check max(deriva_din) <= 0.007 // Las variables exportadas se usan en verificaciones`),
      text(`> **Más ejemplos:** cada plantilla de la galería es una memoria completa y editable. Las de nombre «(versión rápida)» son cálculos breves; sus versiones completas se indican en el texto de cada una.`),
      { type: 'summary' },
    ],
  },
  // ------------------------------------------------------------------
  {
    id: 'blanco', normas: 'RNE', cat: 'General', name: 'Documento en blanco', icon: 'blank',
    desc: 'Empieza desde cero con un bloque de texto y uno de cálculo.',
    titulo: 'Memoria de cálculo',
    blocks: [
      text(`# Introducción
Describa aquí el alcance de la memoria de cálculo, normas aplicadas y materiales.`),
      calc(`# Datos
fc = 210 kgf/cm^2 // Resistencia del concreto [175..420]
fy = 4200 kgf/cm^2 // Fluencia del acero [2800..4200]`),
    ],
  },
];

// Orden de categorías en la galería de plantillas
export const CATEGORIES = [
  'General', 'Cargas y combinaciones', 'Análisis estructural', 'Dinámica estructural',
  'Sismo — Perú', 'Sismo — Chile', 'Sismo — Japón', 'Sismo — Internacional',
  'Concreto armado', 'Concreto — normas extranjeras', 'Cimentaciones', 'Geotecnia', 'Muros de contención',
  'Puentes', 'Acero estructural', 'Albañilería', 'Madera y tierra', 'Estructuras especiales',
];
const BASE_PAIS = { aci: 'US', ec2: 'EU', asce7: 'US', japon: 'JP', espectros: 'INT', acero: 'US', puente: 'US', guia: 'INT', blanco: 'INT' };
for (const t of BASE_TEMPLATES) if (!t.pais) t.pais = BASE_PAIS[t.id] || 'PE';
export const TEMPLATES = [...BASE_TEMPLATES, ...EXTRA_TEMPLATES];
{
  const seen = new Set();
  for (const t of TEMPLATES) { if (seen.has(t.id)) throw new Error('Plantilla duplicada: ' + t.id); seen.add(t.id); }
}
