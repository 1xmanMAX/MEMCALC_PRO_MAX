// =====================================================================
//  Plantillas — módulo «steel» (Acero estructural)
//  AISC 360-16/22 (LRFD), NTE E.090, AISI S100-16, AISC Design Guide 1,
//  NTE E.020 (cargas y viento). Ver docs/referencias/steel.md
// =====================================================================
import { calc, text, summary } from './_h.js';

const CAT = 'Acero estructural';
const US = { sys: 'us' }, TEC = { sys: 'tec' };

export default [
  // ------------------------------------------------------------------
  //  1) Columna a compresión — AISC Design Example E.1A
  // ------------------------------------------------------------------
  {
    id: 'st-columna', pais: 'US', cat: CAT, icon: 'column', settings: US,
    name: 'Columna de acero a compresión (AISC E3, E7)',
    normas: 'ANSI/AISC 360-16/22 Cap. E (LRFD) · AISC Design Examples v16, Ej. E.1A',
    desc: 'Perfil W articulado: esbeltez, pandeo por flexión (E3), elementos esbeltos por ancho efectivo (E7) y curva φPn–Lc.',
    titulo: 'Diseño de columna de acero a compresión — AISC 360 (LRFD)',
    blocks: [
      text(`# Generalidades
Se verifica una columna de perfil laminado W de un pórtico arriostrado, **articulada en ambos extremos** y en ambos ejes, sometida a carga axial de gravedad. El procedimiento sigue el **Capítulo E de ANSI/AISC 360-16/22** por el método LRFD; la NTE E.090 (Perú) adopta el mismo enfoque de diseño por factores de carga y resistencia.

- **Datos del ejemplo:** AISC *Design Examples* v16, Ejemplo **E.1A** (W14×132, ASTM A992, L = 30 ft, PD = 140 kip, PL = 420 kip). Resultado de referencia: φcPn = 893 kip (Tabla 4-1a).
- **Combinación de carga:** ASCE/SEI 7 §2.3.1 — 1.4D; 1.2D + 1.6L (coincide con NTE E.090 1.4.1).
- **Propiedades del perfil:** AISC Shapes Database (bloque *Perfil de acero*).`),
      { type: 'steelsec', perfil: 'W14X132', tabla: true, titulo: '' },
      calc(`# Datos de diseño
## Materiales
Fy = 50 ksi // Esfuerzo de fluencia, ASTM A992 (AISC Tabla 2-4) [36 ksi|50 ksi|65 ksi]
E = 29000 ksi // Módulo de elasticidad del acero (AISC 360 B4.1)
## Geometría y cargas
L = 30 ft // Longitud no arriostrada de la columna
Kx = 1.0 // Factor de longitud efectiva eje x (articulado–articulado, App. 7) [0.65|0.8|1.0|1.2|2.0]
Ky = 1.0 // Factor de longitud efectiva eje y [0.65|0.8|1.0|1.2|2.0]
PD = 140 kip // Carga axial muerta de servicio
PL = 420 kip // Carga axial viva de servicio
## Resistencia requerida
Pu = max(1.4*PD, 1.2*PD + 1.6*PL) // ASCE 7 §2.3.1 / E.090 1.4.1 (LRFD)
# Pandeo local de los elementos (Tabla B4.1a)
lambdarf = 0.56*sqrt(E/Fy) // Límite λr del ala (caso 1, elemento no atiesado)
lambdarw = 1.49*sqrt(E/Fy) // Límite λr del alma (caso 5, elemento atiesado)
"Ala: $\\lambda_f = b_f/2t_f$ = {lambdaf}; alma: $\\lambda_w = h/t_w$ = {lambdaw}. Si λ > λr el elemento es esbelto y se aplica E7.
# Esbeltez del miembro (E2)
Lcx = Kx*L -> ft // Longitud efectiva respecto al eje x (E2)
Lcy = Ky*L -> ft // Longitud efectiva respecto al eje y
esb = max(Lcx/rx, Lcy/ry) // Relación de esbeltez que controla
check esb <= 200 // Esbeltez recomendada Lc/r ≤ 200 (Nota de usuario E2)
# Pandeo por flexión (E3)
Fe = pi^2*E/esb^2 -> ksi // Esfuerzo de pandeo elástico (E3-4)
Fcr = si(Fy/Fe <= 2.25, 0.658^(Fy/Fe)*Fy, 0.877*Fe) -> ksi // Esfuerzo crítico (E3-2 si Fy/Fe ≤ 2.25; si no E3-3)
# Elementos esbeltos — área efectiva (E7.1)
Fel_f = (1.49*lambdarf/lambdaf)^2*Fy -> ksi // Esfuerzo de pandeo local elástico del ala, c2 = 1.49 (E7-5, Tabla E7.1 c)
be = si(lambdaf <= lambdarf*sqrt(Fy/Fcr), bf/2, bf/2*(1 - 0.22*sqrt(Fel_f/Fcr))*sqrt(Fel_f/Fcr)) // Ancho efectivo de medio ala (E7-2 / E7-3, c1 = 0.22)
Fel_w = (1.31*lambdarw/lambdaw)^2*Fy -> ksi // Pandeo local elástico del alma, c2 = 1.31 (Tabla E7.1 a)
he = si(lambdaw <= lambdarw*sqrt(Fy/Fcr), h, h*(1 - 0.18*sqrt(Fel_w/Fcr))*sqrt(Fel_w/Fcr)) // Altura efectiva del alma (E7-2 / E7-3, c1 = 0.18)
Ae = A - 4*(bf/2 - be)*tf - (h - he)*tw // Área efectiva (E7.1)
# Resistencia de diseño (E1, E3)
Pn = Fcr*Ae -> kip // Resistencia nominal a compresión (E3-1 / E7-1)
phic = 0.90 // Factor de resistencia a compresión (E1)
phiPn = phic*Pn -> kip // Resistencia de diseño
check Pu <= phiPn // Resistencia a compresión Pu ≤ φcPn (E1)
Pn_lib = PnE3(perfil, Fy, Lcx, Lcy, E) -> kip // Control: función de librería PnE3 (E3 + E7)
"Resultado de referencia AISC E.1A: φcPn = 893 kip para W14×132 con Lc = 30 ft.`),
      { type: 'plot', expr: '0.9*PnE3(perfil, Fy, x ft, x ft, E)/(1 kip); Pu/(1 kip)', var: 'x', desde: '5', hasta: '50', puntos: '120', xlabel: 'Longitud efectiva Lc [ft]', ylabel: 'φcPn [kip]', nombres: 'φcPn (E3 + E7); Pu', leyenda: true, titulo: 'Curva de resistencia de diseño φcPn en función de la longitud efectiva' },
      text(`> **Notas.** (1) Para perfiles W con Lcz = Lcy no controla el pandeo torsional (E4). (2) La limitación Lc/r ≤ 200 es una recomendación. (3) Cuando Lcx/rx controle, el pandeo es respecto al eje fuerte; la tabla de propiedades permite revisar ambos ejes.`),
      summary(),
    ],
  },
  // ------------------------------------------------------------------
  //  2) Viga-columna — AISC Design Example H.1A
  // ------------------------------------------------------------------
  {
    id: 'st-vigacolumna', pais: 'US', cat: CAT, icon: 'column', settings: US,
    name: 'Viga-columna de acero (flexocompresión AISC H1)',
    normas: 'ANSI/AISC 360-16/22 Cap. E, F, H (LRFD) · AISC Design Examples v16, Ej. H.1A',
    desc: 'Perfil W en pórtico arriostrado con P, Mx y My: compresión E3, flexión F2/F3/F6 y ecuación de interacción H1-1.',
    titulo: 'Verificación de viga-columna de acero — AISC 360 Cap. H (LRFD)',
    blocks: [
      text(`# Generalidades
Se verifica un perfil W de un **pórtico arriostrado** sometido a carga axial de compresión y flexión biaxial. Las solicitaciones provienen de un **análisis de segundo orden** (incluye efectos P-δ y P-Δ, AISC Cap. C), por lo que no se amplifican nuevamente.

- **Ejemplo:** AISC *Design Examples* v16, **H.1A**: W14×99 ASTM A992, Lc = 14 ft, Pu = 400 kip, Mux = 250 kip·ft, Muy = 80 kip·ft. Resultado de referencia: relación de interacción **0.928**.
- **Normas:** AISC 360-16/22 secciones E3, F2, F3 (ala no compacta), F6 (eje menor) y H1.1.`),
      { type: 'steelsec', perfil: 'W14X99', tabla: true, titulo: '' },
      calc(`# Datos
Fy = 50 ksi // Fluencia ASTM A992 [36 ksi|50 ksi]
E = 29000 ksi // Módulo de elasticidad (B4.1)
L = 14 ft // Longitud no arriostrada (Lb = Lc)
K = 1.0 // Factor de longitud efectiva (pórtico arriostrado)
Cb = 1.0 // Factor de gradiente de momento (F1), conservador
Pu = 400 kip // Carga axial requerida (análisis de 2.º orden)
Mux = 250 kip*ft // Momento requerido eje mayor
Muy = 80 kip*ft // Momento requerido eje menor
# Resistencia a compresión (E3)
Lc = K*L -> ft // Longitud efectiva (E2)
esb = max(Lc/rx, Lc/ry) // Esbeltez que controla
Fe = pi^2*E/esb^2 -> ksi // Pandeo elástico (E3-4)
Fcr = si(Fy/Fe <= 2.25, 0.658^(Fy/Fe)*Fy, 0.877*Fe) -> ksi // E3-2 / E3-3
check lambdaf <= 0.56*sqrt(E/Fy) // Ala no esbelta en compresión (Tabla B4.1a caso 1)
check lambdaw <= 1.49*sqrt(E/Fy) // Alma no esbelta en compresión (Tabla B4.1a caso 5)
phiPn = 0.90*Fcr*A -> kip // Resistencia de diseño a compresión (E1, E3-1)
# Flexión respecto al eje mayor (F2, F3)
lambdapf = 0.38*sqrt(E/Fy) // Límite compacto del ala (Tabla B4.1b caso 10)
lambdarf = 1.0*sqrt(E/Fy) // Límite no compacto del ala
check lambdaw <= 3.76*sqrt(E/Fy) // Alma compacta en flexión (caso 15) → F2/F3 aplicables
Mp = Fy*Zx -> kip*ft // Momento plástico (F2-1)
Lp = 1.76*ry*sqrt(E/Fy) -> ft // Longitud límite plástica (F2-5)
Lr = 1.95*rts*E/(0.7*Fy)*sqrt(J/(Sx*ho) + sqrt((J/(Sx*ho))^2 + 6.76*(0.7*Fy/E)^2)) -> ft // Longitud límite inelástica, c = 1 (F2-6)
Fcrb = Cb*pi^2*E/(L/rts)^2*sqrt(1 + 0.078*J/(Sx*ho)*(L/rts)^2) -> ksi // Esfuerzo crítico de PLT elástico (F2-4)
Mltb = si(L <= Lp, Mp, si(L <= Lr, min(Cb*(Mp - (Mp - 0.7*Fy*Sx)*(L - Lp)/(Lr - Lp)), Mp), min(Fcrb*Sx, Mp))) -> kip*ft // Pandeo lateral-torsional (F2-1 a F2-3)
Mflb = si(lambdaf <= lambdapf, Mp, Mp - (Mp - 0.7*Fy*Sx)*(lambdaf - lambdapf)/(lambdarf - lambdapf)) -> kip*ft // Pandeo local del ala (F3-1)
phiMnx = 0.90*min(Mltb, Mflb) -> kip*ft // Resistencia de diseño eje mayor (F1)
# Flexión respecto al eje menor (F6)
Mpy = min(Fy*Zy, 1.6*Fy*Sy) -> kip*ft // Fluencia (F6-1)
Mny = si(lambdaf <= lambdapf, Mpy, Mpy - (Mpy - 0.7*Fy*Sy)*(lambdaf - lambdapf)/(lambdarf - lambdapf)) -> kip*ft // Pandeo local del ala (F6-2)
phiMny = 0.90*Mny -> kip*ft // Resistencia de diseño eje menor
# Interacción flexión y compresión (H1.1)
Pr_Pc = Pu/phiPn // Relación de carga axial
ratio = si(Pr_Pc >= 0.2, Pr_Pc + 8/9*(Mux/phiMnx + Muy/phiMny), Pr_Pc/2 + Mux/phiMnx + Muy/phiMny) // H1-1a si Pr/Pc ≥ 0.2; si no H1-1b
check ratio <= 1.0 // Ecuación de interacción H1-1
ratio_lib = H1(Pu, 0.9*PnE3(perfil, Fy, Lc, Lc, E), Mux, 0.9*MnW(perfil, Fy, L, Cb, E), Muy, 0.9*MnyW(perfil, Fy, E)) // Control con funciones de librería
"Referencia AISC H.1A (con valores de tablas redondeados φPn = 1130 kip, φMnx = 642 kip·ft, φMny = 311 kip·ft): relación = 0.928.`),
      summary(),
    ],
  },
  // ------------------------------------------------------------------
  //  3) Miembro en tracción con conexión empernada — AISC D.2 + J3, J4
  // ------------------------------------------------------------------
  {
    id: 'st-traccion', pais: 'US', cat: CAT, icon: 'steel', settings: US,
    name: 'Miembro en tracción con conexión empernada (AISC D2, D3, J4)',
    normas: 'ANSI/AISC 360-16/22 Cap. D, J3, J4 (LRFD) · AISC Design Examples v16, Ej. D.2',
    desc: 'Ángulo L conectado por un ala con una línea de pernos: fluencia y rotura (U de la Tabla D3.1), pernos, aplastamiento y bloque de cortante.',
    titulo: 'Diseño de miembro en tracción con conexión empernada — AISC 360',
    blocks: [
      text(`# Generalidades
Diagonal de arriostramiento formada por un **ángulo simple** conectado por un ala a una plancha gusset mediante una línea de pernos en agujeros estándar. Se verifican los estados límite del miembro (Cap. D) y de la conexión (J3 pernos, J4 bloque de cortante).

- **Geometría del ejemplo AISC D.2:** L4×4×½ ASTM A36, una línea de 4 pernos a 3 in. Allí se obtiene φtPn = 122 kip (fluencia) y 125 kip (rotura con U = 0.869, pernos de ¾ in).
- En esta memoria se usan **pernos de ⅞ in ASTM F3125 Gr. A325-N** y una carga LRFD Pu = 90 kip para que la conexión completa (pernos y bloque de cortante) sea adecuada.`),
      { type: 'steelsec', perfil: 'L4X4X1/2', tabla: true, titulo: '' },
      calc(`# Datos
## Materiales
Fy = 36 ksi // Fluencia del ángulo, ASTM A36 [36 ksi|50 ksi]
Fu = 58 ksi // Resistencia a la tracción, ASTM A36 [58 ksi|65 ksi]
grupo = "A325" // Grupo de pernos (Tabla J3.2): "A325", "A490" o "A307"
## Cargas
PD = 15 kip // Carga muerta de servicio
PL = 45 kip // Carga viva de servicio
Pu = max(1.4*PD, 1.2*PD + 1.6*PL) // Resistencia requerida (ASCE 7 §2.3.1)
## Conexión
db = 7/8 in // Diámetro nominal del perno [3/4 in|7/8 in|1 in]
nb = 4 // Número de pernos en la línea
sp = 3 in // Separación entre pernos (≥ 3d recomendado, J3.3)
le = 1.5 in // Distancia al borde extremo en la dirección de la carga
g = 2.5 in // Gramil del ala conectada (desde el talón)
Lm = 10 ft // Longitud del miembro
# Tracción en el área bruta y neta (D2, D3)
check Lm/rz <= 300 // Esbeltez recomendada L/r ≤ 300 (D1)
phiPy = 0.90*Fy*A -> kip // Fluencia en el área bruta (D2-1)
dh = dhJ3(db) // Agujero estándar (Tabla J3.3)
dhc = dh + 0.0625 in // Diámetro de cálculo del agujero dh + 1/16 in (B4.3b)
An = A - dhc*t // Área neta (B4.3b)
lcon = (nb - 1)*sp // Longitud de la conexión
U = 1 - xc/lcon // Retraso de cortante, Tabla D3.1 caso 2
Ae = U*An // Área neta efectiva (D3-1)
phiPr = 0.75*Fu*Ae -> kip // Rotura en el área neta efectiva (D2-2)
check Pu <= min(phiPy, phiPr) // Resistencia a tracción del ángulo (D2)
# Pernos (J3)
check sp >= 2.67*db // Separación mínima (J3.3)
check le >= 1.125 in // Distancia mínima al borde, Tabla J3.4 para ⅞ in
Fnv = FnvJ3(grupo, "N") // Esfuerzo nominal de corte, roscas incluidas (Tabla J3.2)
Abp = pi*db^2/4 // Área nominal del perno
phirnv = 0.75*Fnv*Abp -> kip // Corte simple por perno (J3-1)
check Pu <= nb*phirnv // Resistencia al corte de los pernos
## Aplastamiento y desgarramiento en el ángulo (J3.10)
lc1 = le - dh/2 // Distancia libre al borde, perno extremo
lc2 = sp - dh // Distancia libre entre agujeros
rn1 = min(1.2*lc1*t*Fu, 2.4*db*t*Fu) -> kip // Perno extremo (J3-6a, J3-6c)
rn2 = min(1.2*lc2*t*Fu, 2.4*db*t*Fu) -> kip // Pernos interiores
phiRnb = 0.75*(rn1 + (nb - 1)*rn2) -> kip // Resistencia de diseño al aplastamiento
check Pu <= phiRnb // Aplastamiento / desgarramiento
# Bloque de cortante en el ángulo (J4.3)
Agv = (le + (nb - 1)*sp)*t // Área bruta en corte
Anv = Agv - (nb - 0.5)*dhc*t // Área neta en corte
Ant = (d - g - 0.5*dhc)*t // Área neta en tracción (ala conectada, del gramil al borde)
Ubs = 1.0 // Esfuerzo de tracción uniforme (J4.3)
Rnbs = min(0.6*Fu*Anv + Ubs*Fu*Ant, 0.6*Fy*Agv + Ubs*Fu*Ant) -> kip // J4-5
check Pu <= 0.75*Rnbs // Bloque de cortante φ = 0.75`),
      { type: 'boltgroup', filas: '1', columnas: 'nb', sy: 'sp', sx: 'sp', P: 'Pu', ang: '90', ex: '0 in', ey: '0 in', phiRn: 'phirnv', db: 'db', titulo: 'Línea de pernos en el ala conectada: carga axial concéntrica (fuerza igual en cada perno)' },
      text(`> **Referencia AISC D.2** (L4×4×½, pernos de ¾ in, An = 3.31 in², U = 0.869): φtPn = 122 kip por fluencia y 125 kip por rotura. Las pruebas automáticas de esta memoria verifican esos valores.`),
      summary(),
    ],
  },
  // ------------------------------------------------------------------
  //  4) Conexión simple de corte — placa simple (shear tab)
  // ------------------------------------------------------------------
  {
    id: 'st-shear-tab', pais: 'PE', cat: CAT, icon: 'steel', settings: TEC,
    name: 'Conexión de corte con placa simple (shear tab) empernada y soldada',
    normas: 'ANSI/AISC 360-16/22 J2, J3, J4 · AISC Manual Parte 10 (configuración convencional) · NTE E.090',
    desc: 'Placa soldada a la columna y empernada al alma de la viga: grupo de pernos excéntrico (método elástico), aplastamiento, corte, bloque de cortante, flexión de la placa y soldadura.',
    titulo: 'Diseño de conexión simple de corte — placa simple (shear tab)',
    blocks: [
      text(`# Generalidades
Conexión simple (articulada) de una viga secundaria al ala de una columna mediante una **placa simple** soldada en taller con filetes a ambos lados y empernada en obra al alma de la viga con pernos ASTM F3125 Gr. A325 en agujeros estándar (conexión tipo aplastamiento, roscas incluidas en el plano de corte, *N*).

- **Normas:** AISC 360-16/22 (J2 soldaduras, J3 pernos, J4 elementos de conexión); procedimiento del AISC *Steel Construction Manual*, Parte 10, **configuración convencional** (Tabla 10-9); RNE NTE E.090.
- **Método:** LRFD. La excentricidad del grupo de pernos se considera conservadoramente igual a la distancia *a* de la línea de pernos a la soldadura (método elástico, Manual Parte 7).
- **Materiales:** placa ASTM A36; viga ASTM A992; electrodo E70XX.`),
      { type: 'steelsec', perfil: 'W16X26', tabla: false, titulo: 'Viga soportada W16×26 (ASTM A992)' },
      calc(`# Datos
## Solicitación
Vu = 18 tonf // Reacción factorizada de la viga (1.2D + 1.6L)
## Materiales
Fyp = 2530 kgf/cm^2 // Fluencia de la placa, ASTM A36
Fup = 4080 kgf/cm^2 // Resistencia a tracción de la placa, ASTM A36
Fyb = 3515 kgf/cm^2 // Fluencia de la viga, ASTM A992 (50 ksi)
Fub = 4570 kgf/cm^2 // Resistencia a tracción de la viga, ASTM A992 (65 ksi)
FEXX = 4920 kgf/cm^2 // Resistencia del electrodo E70XX (70 ksi)
grupo = "A325" // Grupo de pernos (Tabla J3.2): "A325" o "A490"
## Geometría
db = 19.05 mm // Diámetro del perno [15.88 mm : 5/8"|19.05 mm : 3/4"|22.23 mm : 7/8"|25.4 mm : 1"]
nb = 4 // Número de pernos (una línea vertical)
sp = 7.5 cm // Separación vertical entre pernos
lev = 3.75 cm // Distancia vertical del perno extremo al borde de la placa
leh = 4 cm // Distancia horizontal del perno al borde de la placa
a = 7.5 cm // Distancia de la línea de pernos a la soldadura (cara del apoyo)
tp = 9.5 mm // Espesor de la placa [6.35 mm : 1/4"|7.9 mm : 5/16"|9.5 mm : 3/8"|12.7 mm : 1/2"]
w = 6 mm // Tamaño del filete (a cada lado de la placa)
Lp = (nb - 1)*sp + 2*lev // Altura de la placa
# Configuración convencional (Manual AISC, Parte 10)
check nb <= 12 // Número de pernos 2 a 12
check a <= 8.89 cm // a ≤ 3½ in
check tp <= db/2 + 1.59 mm // tp ≤ db/2 + 1/16 in (ductilidad rotacional)
check leh >= 2*db // Distancia horizontal al borde ≥ 2db
check lev >= 25.4 mm // Distancia mínima al borde, Tabla J3.4 (¾ in → 1 in)
check sp >= 2.67*db // Separación mínima (J3.3)
check Lp <= d - 2*kdes // La placa cabe en la altura plana del alma T
check w >= 0.625*tp // Filete ≥ 5/8 tp: la placa fluye antes que la soldadura
# Resistencia de un perno (J3.6)
Fnv = FnvJ3(grupo, "N") // Esfuerzo nominal de corte (Tabla J3.2)
Abp = pi*db^2/4 -> cm^2 // Área nominal del perno
phirn = 0.75*Fnv*Abp -> tonf // Resistencia de diseño al corte simple (J3-1)`),
      { type: 'boltgroup', filas: 'nb', columnas: '1', sy: 'sp', sx: 'sp', P: 'Vu', ang: '0', ex: 'a', ey: '0 cm', phiRn: 'phirn', db: 'db', titulo: 'Grupo de pernos con excentricidad e = a (método elástico)' },
      calc(`# Aplastamiento y desgarramiento (J3.10)
dh = dhJ3(db) // Agujero estándar (Tabla J3.3)
lc = lev - dh/2 // Distancia libre al borde de la placa (perno extremo)
phirp = 0.75*min(1.2*lc*tp*Fup, 2.4*db*tp*Fup) -> tonf // Placa, perno extremo (J3-6a, J3-6c)
check Rmax <= phirp // Aplastamiento en la placa
phirw = 0.75*2.4*db*tw*Fub -> tonf // Alma de la viga (sin borde en la dirección de la fuerza) (J3-6a)
check Rmax <= phirw // Aplastamiento en el alma de la viga
# Resistencia de la placa (J4)
phiVy = 1.00*0.6*Fyp*Lp*tp -> tonf // Fluencia por cortante (J4-3)
check Vu <= phiVy // Fluencia por cortante de la placa
dhc = dh + 1.59 mm // Diámetro de cálculo del agujero (B4.3b)
Anv = (Lp - nb*dhc)*tp // Área neta en corte
phiVr = 0.75*0.6*Fup*Anv -> tonf // Rotura por cortante (J4-4)
check Vu <= phiVr // Rotura por cortante de la placa
Agv = (Lp - lev)*tp // Bloque: área bruta en corte
Anvb = Agv - (nb - 0.5)*dhc*tp // Bloque: área neta en corte
Ant = (leh - 0.5*dhc)*tp // Bloque: área neta en tracción
phiRbs = 0.75*min(0.6*Fup*Anvb + Fup*Ant, 0.6*Fyp*Agv + Fup*Ant) -> tonf // Bloque de cortante, Ubs = 1 (J4-5)
check Vu <= phiRbs // Bloque de cortante en la placa
## Flexión de la placa en la línea de soldadura
Mu = Vu*a -> tonf*m // Momento por excentricidad
Zp = tp*Lp^2/4 -> cm^3 // Módulo plástico de la placa
phiMn = 0.90*Fyp*Zp -> tonf*m // Fluencia por flexión
check (Vu/phiVy)^2 + (Mu/phiMn)^2 <= 1 // Interacción corte–flexión (Manual Ec. 10-5)
# Soldadura de filete placa–columna (J2.4)
check w >= wminJ2(tp) // Tamaño mínimo (Tabla J2.4)
phiRw = 0.75*2*0.6*FEXX*0.707*w*Lp -> tonf // Dos filetes de longitud Lp (J2-4)
check Vu <= phiRw // Resistencia de la soldadura
phiRw_lib = 0.75*2*RnFilete(w, Lp, FEXX, 0 deg) -> tonf // Control con la función de librería`),
      summary(),
    ],
  },
  // ------------------------------------------------------------------
  //  5) Placa base de columna — AISC Design Guide 1
  // ------------------------------------------------------------------
  {
    id: 'st-placa-base', pais: 'PE', cat: CAT, icon: 'footing', settings: TEC,
    name: 'Placa base de columna con pernos de anclaje (AISC DG1)',
    normas: 'AISC Design Guide 1 (2.ª ed.) · ANSI/AISC 360-16/22 J8 · ACI 318-19 Cap. 17 · NTE E.090, E.060',
    desc: 'Placa base de columna W con carga axial de compresión y cortante: aplastamiento del concreto (J8), espesor por flexión (método de Thornton, DG1), anclajes y fricción.',
    titulo: 'Diseño de placa base de columna — AISC Design Guide 1',
    blocks: [
      text(`# Generalidades
Placa base de una columna de acero apoyada sobre un pedestal de concreto armado mediante mortero de nivelación (*grout*), sometida a compresión axial concéntrica y a un cortante horizontal pequeño. El diseño sigue la **AISC Design Guide 1 — Base Connection Design for Steel Structures** (2.ª ed., §3.1 «cargas axiales de compresión concéntricas»), con la resistencia al aplastamiento del concreto de **AISC 360 J8** y el espesor de la placa por el **método unificado de Thornton** (voladizos *m*, *n* y λn').

- **Materiales:** columna ASTM A992; placa ASTM A36; pernos de anclaje ASTM F1554 Gr. 36; concreto f'c = 210 kgf/cm² (NTE E.060).
- **Combinación crítica (E.090 1.4.1):** 1.2D + 1.6L. El cortante se transmite por fricción bajo la carga permanente mínima 0.9D (DG1 §3.5, coeficiente μ = 0.55 para placa sobre grout, ACI 318-19 Tabla 22.9.4.2).`),
      { type: 'steelsec', perfil: 'W10X49', tabla: false, titulo: 'Columna W10×49 (ASTM A992)' },
      calc(`# Datos
## Cargas de servicio
PD = 50 tonf // Carga axial muerta
PL = 40 tonf // Carga axial viva
VD = 1.5 tonf // Cortante por carga muerta
VL = 1.0 tonf // Cortante por carga viva
## Materiales
fc = 210 kgf/cm^2 // Resistencia del concreto del pedestal (E.060) [175 kgf/cm^2|210 kgf/cm^2|280 kgf/cm^2]
Fyp = 2530 kgf/cm^2 // Fluencia de la placa, ASTM A36
## Placa y pedestal
Np = 35 cm // Longitud de la placa (paralela al peralte d)
Bp = 35 cm // Ancho de la placa (paralelo a bf)
tp = 25.4 mm // Espesor de la placa [19.05 mm : 3/4"|22.23 mm : 7/8"|25.4 mm : 1"|31.75 mm : 1 1/4"|38.1 mm : 1 1/2"]
Np2 = 50 cm // Pedestal: dimensión paralela a N
Bp2 = 50 cm // Pedestal: dimensión paralela a B
na = 4 // Número de pernos de anclaje [4|6|8]
da = 19.05 mm // Diámetro de los pernos de anclaje [19.05 mm : 3/4"|22.23 mm : 7/8"|25.4 mm : 1"]
ed = 5 cm // Distancia del eje del perno al borde de la placa
hef = 30 cm // Longitud de empotramiento
## Solicitaciones de diseño
Pu = max(1.4*PD, 1.2*PD + 1.6*PL) // Compresión factorizada (E.090 1.4.1)
Vu = 1.2*VD + 1.6*VL // Cortante factorizado
Pumin = 0.9*PD // Compresión mínima concomitante (0.9D)`),
      { type: 'basepl', perfil: 'W10X49', N: 'Np', B: 'Bp', tp: 'tp', na: 'na', da: 'da', ed: 'ed', N2: 'Np2', B2: 'Bp2', hef: 'hef', titulo: '' },
      calc(`# Aplastamiento del concreto (AISC 360 J8)
phic = 0.65 // Factor de resistencia al aplastamiento (J8)
check A1 >= d*bf // La placa cubre la huella de la columna
rA = min(sqrt(A2/A1), 2) // Factor de confinamiento √(A2/A1) ≤ 2 (J8-2)
fpmax = phic*0.85*fc*rA // Esfuerzo de aplastamiento de diseño (J8-2)
phiPp = fpmax*A1 -> tonf // Resistencia de diseño al aplastamiento
check Pu <= phiPp // Aplastamiento del concreto bajo la placa
# Espesor de la placa (DG1 §3.1.2, método de Thornton)
Xt = 4*d*bf/(d + bf)^2*Pu/phiPp // Parámetro X (DG1 §3.1.2)
lam = min(2*sqrt(Xt)/(1 + sqrt(1 - Xt)), 1) // Factor λ (DG1 §3.1.2)
lnp = lam*lambdanp // λn' (DG1 §3.1.2)
lmax = max(m_pl, n_pl, lnp) // Voladizo crítico ℓ = máx(m, n, λn')
fpu = Pu/A1 // Presión de contacto bajo la placa
tpreq = lmax*sqrt(2*Pu/(0.90*Fyp*Bp*Np)) -> mm // Espesor requerido tp = ℓ√(2Pu/(0.9FyBN)) (DG1 §3.1.2)
check tp >= tpreq // Espesor de la placa
# Pernos de anclaje
check na >= 4 // Mínimo 4 pernos de anclaje (OSHA 29 CFR 1926.755, DG1 §2.9)
check da >= 19.05 mm // Diámetro mínimo recomendado ¾ in (DG1 §2.5)
check ed >= 1.5*da // Distancia del perno al borde de la placa ≥ 1.5da (práctica recomendada DG1 §2.6)
check hef >= 12*da // Empotramiento ≥ 12da (práctica recomendada DG1 §2.5)
check (Np2 - Np)/2 + ed >= 6*da // Distancia del anclaje al borde del pedestal ≥ 6da (ACI 318-19 17.9.2, anclajes con torque)
# Transferencia del cortante por fricción (DG1 §3.5)
mu = 0.55 // Coeficiente de fricción acero–grout (ACI 318-19 Tabla 22.9.4.2)
phiVf = 0.75*mu*Pumin -> tonf // Resistencia de diseño por fricción
check Vu <= phiVf // Cortante resistido por fricción (no se requiere llave de corte)
# Soldadura columna–placa
wcol = max(wminJ2(tf), 5 mm) // Filete perimetral mínimo (Tabla J2.4): la compresión se transmite por contacto (M2.6)
"Se especifica soldadura de filete de {wcol} alrededor del perfil (alas y alma), E70XX. La carga axial se transmite por contacto directo con la placa, cuya superficie debe quedar plana (AISC 360 M2.6).`),
      summary(),
    ],
  },
];
