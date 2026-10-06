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

- **Datos del ejemplo:** AISC *Design Examples* v16, Ejemplo **E.1A** (W14×132, ASTM A992, L = 30 ft, D = 140 kip, L = 420 kip). Resultado de referencia: φcPn = 893 kip (Tabla 4-1a).
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
P_D = 140 kip // Carga axial muerta de servicio
P_L = 420 kip // Carga axial viva de servicio
## Resistencia requerida
Pu = max(1.4*P_D, 1.2*P_D + 1.6*P_L) // ASCE 7 §2.3.1 / E.090 1.4.1 (LRFD)
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
P_D = 15 kip // Carga muerta de servicio
P_L = 45 kip // Carga viva de servicio
Pu = max(1.4*P_D, 1.2*P_D + 1.6*P_L) // Resistencia requerida (ASCE 7 §2.3.1)
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
P_D = 50 tonf // Carga axial muerta
P_L = 40 tonf // Carga axial viva
V_D = 1.5 tonf // Cortante por carga muerta
V_L = 1.0 tonf // Cortante por carga viva
## Materiales
fc = 210 kgf/cm^2 // Resistencia del concreto del pedestal (E.060) [175 kgf/cm^2|210 kgf/cm^2|280 kgf/cm^2]
Fyp = 2530 kgf/cm^2 // Fluencia de la placa, ASTM A36
## Placa y pedestal
Np = 45 cm // Longitud de la placa (paralela al peralte d)
Bp = 35 cm // Ancho de la placa (paralelo a bf)
tp = 31.75 mm // Espesor de la placa [19.05 mm : 3/4"|22.23 mm : 7/8"|25.4 mm : 1"|31.75 mm : 1 1/4"|38.1 mm : 1 1/2"]
Np2 = 60 cm // Pedestal: dimensión paralela a N
Bp2 = 50 cm // Pedestal: dimensión paralela a B
na = 4 // Número de pernos de anclaje [4|6|8]
da = 19.05 mm // Diámetro de los pernos de anclaje [19.05 mm : 3/4"|22.23 mm : 7/8"|25.4 mm : 1"]
ed = 5 cm // Distancia del eje del perno al borde de la placa
hef = 30 cm // Longitud de empotramiento
## Solicitaciones de diseño
Pu = max(1.4*P_D, 1.2*P_D + 1.6*P_L) // Compresión factorizada (E.090 1.4.1)
Vu = 1.2*V_D + 1.6*V_L // Cortante factorizado
Pumin = 0.9*P_D // Compresión mínima concomitante (0.9D)`),
      { type: 'basepl', perfil: 'W10X49', N: 'Np', B: 'Bp', tp: 'tp', na: 'na', da: 'da', ed: 'ed', N2: 'Np2', B2: 'Bp2', hef: 'hef', titulo: '' },
      calc(`# Aplastamiento del concreto (AISC 360 J8)
phic = 0.65 // Factor de resistencia al aplastamiento (J8)
check A1 >= d*bf // La placa cubre la huella de la columna
rA = min(sqrt(A2/A1), 2) // Factor de confinamiento √(A2/A1) ≤ 2 (J8-2)
fpmax = phic*0.85*fc*rA // Esfuerzo de aplastamiento de diseño (J8-2)
phiPp = fpmax*A1 -> tonf // Resistencia de diseño al aplastamiento
check Pu <= phiPp // Aplastamiento del concreto bajo la placa
check Np/2 - ed >= d/2 + 4 cm // Pernos fuera de las alas con holgura para tuerca y arandela
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
  // ------------------------------------------------------------------
  //  6) Correas de techo conformadas en frío — AISI S100 + E.020
  // ------------------------------------------------------------------
  {
    id: 'st-correas', pais: 'PE', cat: CAT, icon: 'beam', settings: TEC,
    name: 'Correas de techo de perfil conformado en frío (AISI S100, viento E.020)',
    normas: 'AISI S100-16 (Apéndice 1, F, G, H, I6.2.1) · NTE E.020 (cargas y viento) · NTE E.090 1.4 (combinaciones)',
    desc: 'Correa C atiesada simplemente apoyada entre pórticos: metrado de cobertura, viento E.020 con succión, ancho efectivo, flexión biaxial, método R por levante, cortante, deflexión y templadores.',
    titulo: 'Diseño de correas de techo de perfil conformado en frío',
    blocks: [
      text(`# Generalidades
Las correas soportan la cobertura liviana (plancha de acero aluzinc / TR-4) y apoyan sobre los pórticos principales. Se diseñan como vigas **simplemente apoyadas** de perfil **C atiesado conformado en frío**, con el ala superior arriostrada por la cobertura atornillada (*through-fastened*) y **templadores** (tirantes) a los tercios de la luz para tomar la componente de la carga paralela a la pendiente.

- **Normas:** AISI S100-16 *North American Specification for the Design of Cold-Formed Steel Structural Members* (LRFD); NTE E.020 Cargas (carga viva de techo Art. 7.1 y viento Art. 12); combinaciones NTE E.090 Art. 1.4.1.
- **Ancho efectivo simplificado:** se calcula el factor ρ de cada elemento comprimido (Apéndice 1); el ala con labio se trata como elemento atiesado (k = 4) verificando la proporción del labio; si el alma no resultase totalmente efectiva se requiere un análisis más detallado.
- **Levante por viento:** el ala inferior (comprimida) no está arriostrada; se usa el **método R** de AISI S100 §I6.2.1 para correas con cobertura atornillada.`),
      { type: 'steelsec', perfil: 'CF150X50X15X2', tabla: true, titulo: 'Correa C 150×50×15×2 mm (esquinas rectas)' },
      calc(`# Datos
## Geometría
Lc = 6 m // Luz de la correa (separación entre pórticos)
sc = 1.20 m // Separación entre correas (medida en la pendiente)
theta = 10 deg // Pendiente del techo
nt = 2 // Número de líneas de templadores por tramo [1|2]
ncw = 5 // Correas por agua que cuelgan de un templador
hz = 7 m // Altura de la edificación
## Material (plancha laminada en caliente ASTM A36)
Fy = 2530 kgf/cm^2 // Esfuerzo de fluencia [2320 kgf/cm^2|2530 kgf/cm^2|3515 kgf/cm^2]
Fu = 4080 kgf/cm^2 // Resistencia a tracción
E = 2070000 kgf/cm^2 // Módulo de elasticidad (AISI: 29 500 ksi)
## Cargas (E.020)
wcob = 5 kgf/m^2 // Cobertura de acero aluzinc TR-4 e = 0.40 mm (catálogo)
wacc = 5 kgf/m^2 // Accesorios, luminarias e instalaciones
WLr = 30 kgf/m^2 // Carga viva de techo liviano, cualquier pendiente (E.020 Art. 7.1 b)
Vv = 75 km/h // Velocidad básica de viento a 10 m (E.020 Anexo 2; mínimo 75 km/h)
Cext = -0.7 // Factor de forma exterior, superficie inclinada ≤ 15°, succión (E.020 Tabla 4)
Cint = 0.3 // Presión interior por aberturas (E.020 Art. 12.5, ±0.3)
# Presión de viento (E.020 Art. 12)
Vh = Vv*max(1, (hz/(10 m))^0.22) // Velocidad de diseño Vh = V(h/10)^0.22 ≥ V (E.020 12.3)
ph = 0.005*abs(Cext - Cint)*(Vh/(1 km/h))^2*1 kgf/m^2 // Presión de succión neta ph = 0.005·C·Vh² (E.020 12.4)
# Metrado por metro de correa
wD = (wcob + wacc)*sc + peso -> kgf/m // Carga muerta (incluye peso propio)
wLr = WLr*sc*cos(theta) -> kgf/m // Carga viva sobre la proyección horizontal
wW = ph*sc -> kgf/m // Viento normal a la cubierta (levante)
# Combinaciones de diseño (E.090 1.4.1)
wu = max(1.4*wD, 1.2*wD + 1.6*wLr) -> kgf/m // Gravedad: 1.2D + 1.6Lr
wun = wu*cos(theta) -> kgf/m // Componente normal a la cubierta (eje x de la correa)
wut = wu*sin(theta) -> kgf/m // Componente paralela a la pendiente (eje y)
wup = 1.3*wW - 0.9*wD*cos(theta) -> kgf/m // Levante neto: 0.9D − 1.3W
# Solicitaciones
Mux = wun*Lc^2/8 -> kgf*m // Momento eje mayor (simplemente apoyada)
cty = si(nt == 1, 0.125, 0.10) // Coeficiente de viga continua sobre templadores
Muy = cty*wut*(Lc/(nt + 1))^2 -> kgf*m // Momento eje menor entre templadores
Vu = wun*Lc/2 -> kgf // Cortante máximo
Mup = wup*Lc^2/8 -> kgf*m // Momento por levante (ala inferior comprimida)`),
      { type: 'beam', tramos: 'Lc', apoyos: 'A A', E: 'E', I: 'Ix', cargas: 'U 1 wun', titulo: 'Correa simplemente apoyada bajo 1.2D + 1.6Lr (componente normal)' },
      calc(`# Anchos efectivos (AISI S100-16, Apéndice 1)
wf = bf - 2*t // Ancho plano del ala comprimida (aprox. esquinas rectas)
rho_f = rhoAISI(wf/t, Fy, E, 4) // Ala con labio tratada como atiesada, k = 4 (Ap. 1, 1.1-1 a 1.1-4)
check D/wf <= 0.8 // Proporción del labio D/w ≤ 0.8 (Ap. 1, §1.3)
rho_l = rhoAISI((D - t)/t, Fy, E, 0.43) // Labio (no atiesado, k = 0.43, Ap. 1 §1.4)
psi = 1 // |f2/f1| en el alma (flexión simétrica)
kw = 4 + 2*(1 + psi)^3 + 2*(1 + psi) // Coeficiente de pandeo del alma con gradiente (Ap. 1, Ec. 1.2-1)
rho_w = rhoAISI((d - 2*t)/t, Fy, E, kw) // Alma
check rho_w == 1 // Alma totalmente efectiva (hipótesis del cálculo simplificado)
check rho_l == 1 // Labio totalmente efectivo
check (d - 2*t)/t <= 200 // Límite h/t ≤ 200 (B4.2)
dA = (1 - rho_f)*wf*t // Área no efectiva del ala comprimida
ey = dA*(d/2 - t/2)/(A - dA) // Desplazamiento del eje neutro
Ie = Ix - dA*(d/2 - t/2)^2 - (A - dA)*ey^2 // Inercia efectiva
Se = Ie/(d/2 + ey) -> cm^3 // Módulo efectivo a la fibra comprimida
# Resistencia a flexión (AISI S100-16 F2, F3, H1.2)
phib = 0.90 // Factor de resistencia a flexión
phiMnx = phib*Se*Fy -> kgf*m // Ala superior arriostrada por la cobertura: Mnl = Se·Fy (F3.1)
phiMny = phib*Sy*Fy -> kgf*m // Eje menor (conservador, sección completa)
check Mux/phiMnx + Muy/phiMny <= 1.0 // Flexión biaxial (H1.2)
## Levante por viento — método R (I6.2.1)
check d <= 165 mm // R = 0.70 válido para C o Z simplemente apoyada con d ≤ 6.5 in (Tabla I6.2.1-1)
Rr = 0.70 // Factor de reducción R (Tabla I6.2.1-1)
phiMnu = phib*Rr*Se*Fy -> kgf*m // Resistencia con ala inferior libre (I6.2.1-1)
check Mup <= phiMnu // Flexión por levante 0.9D − 1.3W
# Cortante (AISI S100-16 G2.1)
kv = 5.34 // Alma sin atiesadores
ht = (d - 2*t)/t // Esbeltez del alma
Fv = si(ht <= sqrt(E*kv/Fy), 0.6*Fy, si(ht <= 1.51*sqrt(E*kv/Fy), 0.6*sqrt(E*kv*Fy)/ht, 0.904*E*kv/ht^2)) // Esfuerzo nominal de corte (G2.1-2 a G2.1-4)
phiVn = 0.95*(d - 2*t)*t*Fv -> kgf // φv = 0.95
check Vu <= phiVn // Resistencia a cortante
check (Vu/phiVn)^2 + (Mux/phiMnx)^2 <= 1 // Flexión + cortante (H2-1)
# Deflexión en servicio
ds = 5*(wD + wLr)*cos(theta)*Lc^4/(384*E*Ix) -> cm // Flecha D + Lr
check ds <= Lc/180 // Límite L/180, techos sin cielo raso (IBC Tabla 1604.3)
# Templadores (tirantes)
Tr = 1.1*ncw*wut*Lc/(nt + 1) -> kgf // Fuerza acumulada en el templador más cargado
dt = 9.53 mm // Diámetro del templador liso roscado [9.53 mm : 3/8"|12.7 mm : 1/2"|15.88 mm : 5/8"]
phiTr = 0.75*0.75*Fu*pi*dt^2/4 -> kgf // Parte roscada: Fnt = 0.75Fu (AISC 360 Tabla J3.2, J3-1)
check Tr <= phiTr // Resistencia del templador`),
      summary(),
    ],
  },
  // ------------------------------------------------------------------
  //  7) Vigueta / armadura de techo de cuerdas paralelas (tipo Pratt)
  // ------------------------------------------------------------------
  {
    id: 'st-armadura', pais: 'PE', cat: CAT, icon: 'grid', settings: TEC,
    name: 'Vigueta / armadura de techo de cuerdas paralelas (Pratt)',
    normas: 'ANSI/AISC 360-16/22 Cap. D, E (E3, E5) · NTE E.090 · NTE E.020',
    desc: 'Armadura Pratt simplemente apoyada: cargas en nudos, fuerzas por el método de las secciones (cuerdas y montantes) y de los nudos (diagonal), diseño de cuerdas HSS y alma de ángulos (E5), levante por viento y flecha.',
    titulo: 'Diseño de vigueta metálica de techo (armadura Pratt)',
    blocks: [
      text(`# Generalidades
Vigueta metálica de **cuerdas paralelas tipo Pratt** (diagonales traccionadas bajo gravedad), simplemente apoyada en su cuerda inferior, con montantes en cada nudo. Las correas apoyan sobre los nudos de la cuerda superior, de modo que las cargas se aplican como **fuerzas en los nudos** y las barras trabajan a fuerza axial.

- **Análisis:** la fuerza en las cuerdas se obtiene por el **método de las secciones**, F = M/h, con el momento de viga simple en el nudo de corte; la diagonal y el montante extremos, por el **método de los nudos** (el cortante del panel es tomado por la componente vertical de la diagonal).
- **Diseño (LRFD):** cuerdas de tubo HSS cuadrado ASTM A500 Gr. B (E3, D2); diagonales y montantes de ángulo simple ASTM A36 soldado por un ala (E5, D2/D3).
- **Arriostramiento:** la cuerda superior está arriostrada fuera del plano en cada nudo por las correas; la inferior, por arriostres (*bridging*) cada Lbr.`),
      { type: 'steelsec', perfil: 'HSS2X2X1/8', sufijo: 'c', tabla: false, titulo: 'Cuerdas superior e inferior: HSS 2×2×1/8' },
      { type: 'steelsec', perfil: 'L2X2X3/16', sufijo: 'd', tabla: false, titulo: 'Diagonales y montantes: L 2×2×3/16' },
      calc(`# Datos
## Geometría
Lt = 12 m // Luz de la vigueta
ht = 0.80 m // Peralte entre ejes de cuerdas
np = 8 // Número de paneles (par)
st = 5 m // Separación entre viguetas (ancho tributario)
Lbr = 3 m // Separación de arriostres de la cuerda inferior
lw = 6 cm // Longitud de soldadura longitudinal de cada ángulo
## Materiales
Fyc = 3235 kgf/cm^2 // Fluencia HSS ASTM A500 Gr. B (46 ksi) [3235 kgf/cm^2|3515 kgf/cm^2]
Fya = 2530 kgf/cm^2 // Fluencia de ángulos ASTM A36
Fua = 4080 kgf/cm^2 // Resistencia a tracción de ángulos ASTM A36
E = 2039000 kgf/cm^2 // Módulo de elasticidad (29 000 ksi)
## Cargas sobre la proyección horizontal (E.020)
wD = 20 kgf/m^2 // Muerta: cobertura, correas, vigueta y arriostres
wLr = 30 kgf/m^2 // Viva de techo liviano (E.020 7.1 b)
pW = 28 kgf/m^2 // Succión neta de viento sobre la cubierta (E.020 12.4, ver memoria de correas)
# Cargas de diseño (E.090 1.4.1)
wu = (1.2*wD + 1.6*wLr)*st -> tonf/m // 1.2D + 1.6Lr por metro de vigueta
wup = (1.3*pW - 0.9*wD)*st -> tonf/m // Levante neto 0.9D − 1.3W
a = Lt/np // Longitud de panel
P = wu*a -> tonf // Carga en cada nudo interior de la cuerda superior
R = wu*Lt/2 -> tonf // Reacción en cada apoyo
alpha = atan(ht/a) -> deg // Inclinación de las diagonales
Ld = sqrt(a^2 + ht^2) // Longitud de la diagonal
# Fuerzas en las barras
Mt(x) = wu*x*(Lt - x)/2 // Momento de viga simple en los nudos (cargas nodales equivalentes)
Fcs = Mt(Lt/2)/ht -> tonf // Cuerda superior central: secciones, momento en el nudo inferior central (compresión)
Fci = Mt(Lt/2 - a)/ht -> tonf // Cuerda inferior central: momento en el nudo superior adyacente (tracción)
Fd = (R - P/2)/sin(alpha) -> tonf // Diagonal extrema: nudo superior extremo, ΣFy = 0 (tracción)
Fv0 = R // Montante extremo sobre el apoyo: nudo inferior, ΣFy = 0 (compresión)
Fciu = Mt(Lt/2 - a)/ht*wup/wu -> tonf // Cuerda inferior bajo levante (compresión)
Fdu = Fd*wup/wu -> tonf // Diagonal extrema bajo levante (compresión)
# Cuerda superior — compresión (E3)
check lambdaf_c <= 1.40*sqrt(E/Fyc) // Pared HSS no esbelta (Tabla B4.1a caso 6)
esbc = a/rx_c // Lc/r con Lc = a en ambos planos (nudos arriostrados por correas)
Fec = pi^2*E/esbc^2 // Pandeo elástico (E3-4)
Fcrc = si(Fyc/Fec <= 2.25, 0.658^(Fyc/Fec)*Fyc, 0.877*Fec) // E3-2 / E3-3
phiPcs = 0.90*Fcrc*A_c -> tonf // Resistencia de diseño
check Fcs <= phiPcs // Cuerda superior a compresión
# Cuerda inferior — tracción y compresión por levante
phiPti = 0.90*Fyc*A_c -> tonf // Fluencia en el área bruta (D2-1); cuerda continua, sin agujeros
check Fci <= phiPti // Cuerda inferior a tracción
esbi = Lbr/rx_c // Esbeltez fuera del plano entre arriostres
check esbi <= 200 // Lc/r ≤ 200 (E2)
Fei = pi^2*E/esbi^2
Fcri = si(Fyc/Fei <= 2.25, 0.658^(Fyc/Fei)*Fyc, 0.877*Fei) // E3-2 / E3-3
phiPci = 0.90*Fcri*A_c -> tonf
check Fciu <= phiPci // Cuerda inferior a compresión por levante
# Diagonal extrema — ángulo simple
phiPdy = 0.90*Fya*A_d -> tonf // Fluencia (D2-1)
Ud = 1 - xc_d/lw // Retraso de cortante, soldadura longitudinal (Tabla D3.1 caso 2)
phiPdr = 0.75*Fua*Ud*A_d -> tonf // Rotura (D2-2)
check Fd <= min(phiPdy, phiPdr) // Diagonal a tracción
Lrd = Ld/rx_d // L/ra de la diagonal (ra respecto al eje paralelo al ala conectada)
esbd = si(Lrd <= 80, 72 + 0.75*Lrd, 32 + 1.25*Lrd) // Esbeltez efectiva de ángulo simple en armadura plana (E5-1 / E5-2)
check esbd <= 200 // Límite de E5
Fed = pi^2*E/esbd^2
Fcrd = si(Fya/Fed <= 2.25, 0.658^(Fya/Fed)*Fya, 0.877*Fed)
phiPdc = 0.90*Fcrd*A_d -> tonf
check Fdu <= phiPdc // Diagonal a compresión por levante (E5)
# Montante extremo — compresión (E5)
Lrv = ht/rx_d
esbv = si(Lrv <= 80, 72 + 0.75*Lrv, 32 + 1.25*Lrv) // E5-1 / E5-2
Fev = pi^2*E/esbv^2
Fcrv = si(Fya/Fev <= 2.25, 0.658^(Fya/Fev)*Fya, 0.877*Fev)
phiPv = 0.90*Fcrv*A_d -> tonf
check Fv0 <= phiPv // Montante a compresión
check lambdaf_d <= 0.45*sqrt(E/Fya) // Ala del ángulo no esbelta (Tabla B4.1a caso 3)
# Flecha (servicio D + Lr)
Ieq = 2*A_c*(ht/2)^2 -> cm^4 // Inercia equivalente de las cuerdas
dv = 1.15*5*(wD + wLr)*st*Lt^4/(384*E*Ieq) -> cm // Incremento de 15 % por deformación de las barras del alma
check dv <= Lt/240 // Flecha admisible L/240`),
      { type: 'armadura', L: 'Lt', h: 'ht', np: 'np', w: 'wu', tipo: 'pratt', titulo: 'Fuerzas axiales en la vigueta bajo 1.2D + 1.6Lr — método de los nudos [t]' },
      calc(`## Comprobación: método de las secciones frente al método de los nudos
check abs(Ncs - Fcs) <= 0.001*Fcs // Cuerda superior: ambos métodos coinciden
check abs(Ndt - Fd) <= 0.001*Fd // Diagonal extrema: ambos métodos coinciden
check abs(Nv - Fv0) <= 0.001*Fv0 // Montante extremo: ambos métodos coinciden`),
      { type: 'plot', expr: 'Mt(x m)/ht/(1 tonf); -Mt(x m)/ht/(1 tonf)', var: 'x', desde: '0', hasta: 'Lt/(1 m)', puntos: '100', xlabel: 'x [m]', ylabel: 'Fuerza en cuerdas [t]', nombres: 'Cuerda inferior (tracción, +); Cuerda superior (compresión, −)', leyenda: true, titulo: 'Fuerza axial en las cuerdas F = M(x)/h bajo 1.2D + 1.6Lr' },
      { type: 'table', titulo: 'Resumen de barras críticas (fuerza última y resistencia de diseño)', columnas: 'Barra = ["Cuerda superior", "Cuerda inferior", "Cuerda inferior (levante)", "Diagonal extrema", "Diagonal (levante)", "Montante extremo"]\nPu [tonf] = [Fcs, Fci, Fciu, Fd, Fdu, Fv0]\nφPn [tonf] = [phiPcs, phiPti, phiPci, min(phiPdy, phiPdr), phiPdc, phiPv]\nD/C = [Fcs/phiPcs, Fci/phiPti, Fciu/phiPci, Fd/min(phiPdy, phiPdr), Fdu/phiPdc, Fv0/phiPv]', dec: '2' },
      summary(),
    ],
  },
  // ------------------------------------------------------------------
  //  8) Nave / vivienda de un piso en estructura metálica
  // ------------------------------------------------------------------
  {
    id: 'st-nave', pais: 'PE', cat: CAT, icon: 'steel', settings: TEC,
    name: 'Nave / vivienda en estructura metálica: correas, viga y columnas de pórtico',
    normas: 'NTE E.020 (cargas, viento) · NTE E.090 1.4 · ANSI/AISC 360-16/22 (C, E, F, H, App. 7 y 8) · AISI S100-16 · NTE E.030 (verificación sísmica)',
    desc: 'Pórtico simple biarticulado de techo liviano: metrado de cobertura, viento E.020 en muros y techo, correas conformadas en frío, análisis de Kleinlogel, amplificación B2, diseño de viga y columnas W, flecha y deriva.',
    titulo: 'Memoria de cálculo — nave metálica de un piso (pórticos simples)',
    blocks: [
      text(`# Generalidades
Edificación metálica de un piso (vivienda, taller o almacén) con **pórticos simples biarticulados** de perfiles W, espaciados *sf*, con **techo liviano** de plancha aluzinc sobre **correas conformadas en frío**. En la dirección longitudinal la estabilidad se confía a arriostres en cruz (no incluidos en esta memoria).

**Hipótesis de análisis.** Techo de pendiente baja (≤ 10 %) idealizado con viga horizontal; bases articuladas; uniones viga–columna rígidas. Las solicitaciones se obtienen con las **fórmulas cerradas de Kleinlogel** para el pórtico biarticulado (deducidas por el método de las fuerzas), y los efectos de segundo orden con el **método de amplificación de momentos B1–B2** (AISC 360 Apéndice 8) junto con el **método de la longitud efectiva** (Apéndice 7).

**Normas:** NTE E.020 Cargas (carga viva de techo Art. 7.1; viento Art. 12); NTE E.090 combinaciones LRFD (Art. 1.4.1); ANSI/AISC 360-16/22; AISI S100-16 (correas); NTE E.030 para comparar el cortante sísmico con el de viento.

**Materiales:** perfiles W ASTM A36 (Fy = 2530 kgf/cm²); correas de plancha A36 conformada en frío; cobertura TR-4 aluzinc 0.40 mm.`),
      { type: 'steelsec', perfil: 'W12X26', sufijo: 'v', tabla: false, titulo: 'Viga del pórtico W12×26' },
      { type: 'steelsec', perfil: 'W12X26', sufijo: 'c', tabla: false, titulo: 'Columnas del pórtico W12×26' },
      calc(`# Datos generales
## Geometría
Lf = 10 m // Luz del pórtico (entre ejes de columnas)
hc = 4.5 m // Altura de columnas (base a eje de la viga)
sf = 6 m // Separación entre pórticos
sc = 1.20 m // Separación de correas
lfb = 2.0 m // Separación de tornapuntas (arriostre del ala inferior de la viga)
## Materiales
Fy = 2530 kgf/cm^2 // Fluencia ASTM A36 [2530 kgf/cm^2|3515 kgf/cm^2]
E = 2039000 kgf/cm^2 // Módulo de elasticidad (29 000 ksi)
## Cargas de techo (E.020)
wcob = 5 kgf/m^2 // Cobertura TR-4 aluzinc e = 0.40 mm
wcor = 5 kgf/m^2 // Correas y templadores
wacc = 10 kgf/m^2 // Arriostres, instalaciones y luminarias
WLr = 30 kgf/m^2 // Carga viva de techo liviano (E.020 Art. 7.1 b)
## Viento (E.020 Art. 12)
Vv = 75 km/h // Velocidad básica a 10 m (E.020 Anexo 2; mínimo 75 km/h)
Vh = Vv*max(1, (hc/(10 m))^0.22) // Velocidad de diseño (E.020 12.3)
p0 = 0.005*(Vh/(1 km/h))^2*1 kgf/m^2 // Presión dinámica 0.005·Vh² (E.020 12.4)
Cbar = 0.8 // Muro a barlovento, presión (E.020 Tabla 4)
Csot = 0.6 // Muro a sotavento, succión (E.020 Tabla 4)
Ctec = 0.7 // Techo ≤ 15°, succión (E.020 Tabla 4)
Cpi = 0.3 // Presión interior ± (E.020 12.5)
# Metrado de cargas sobre el pórtico
wD = (wcob + wcor + wacc)*sf + peso_v -> tonf/m // Carga muerta sobre la viga (incluye peso propio)
wLr = WLr*sf -> tonf/m // Carga viva de techo
q1 = Cbar*p0*sf -> tonf/m // Viento sobre la columna de barlovento (hacia sotavento)
q2 = Csot*p0*sf -> tonf/m // Succión sobre la columna de sotavento (hacia sotavento)
wr1 = (Ctec - Cpi)*p0*sf -> tonf/m // Succión neta del techo con succión interior (combinaciones de gravedad)
wr2 = (Ctec + Cpi)*p0*sf -> tonf/m // Succión neta del techo con presión interior (levante)
# Correas (AISI S100-16) — perfil CF 150×50×15×2
pc = "CF150X50X15X2" // Perfil de la correa (ver plantilla de correas para el detalle)
wuc = (1.2*((wcob + wacc/2)*sc + sec(pc, "peso")) + 1.6*WLr*sc) -> kgf/m // 1.2D + 1.6Lr por metro de correa
Muc = wuc*sf^2/8 -> kgf*m // Correa simplemente apoyada entre pórticos
phiMc = 0.90*sec(pc, "Sx")*Fy -> kgf*m // Sección totalmente efectiva (AISI Ap. 1), ala superior arriostrada
check Muc <= phiMc // Flexión de la correa por gravedad
wupc = 1.3*(Ctec + Cpi)*p0*sc - 0.9*((wcob + wacc/2)*sc + sec(pc, "peso")) -> kgf/m // Levante 0.9D − 1.3W
check wupc*sf^2/8 <= 0.90*0.70*sec(pc, "Sx")*Fy // Levante: método R = 0.70 (AISI I6.2.1)
dcor = 5*((wcob + wacc/2 + WLr)*sc + sec(pc, "peso"))*sf^4/(384*E*sec(pc, "Ix")) -> cm // Flecha de servicio
check dcor <= sf/180 // Flecha L/180`),
      { type: 'beam', tramos: 'sf', apoyos: 'A A', E: 'E', I: 'sec(pc, "Ix")', cargas: 'U 1 wuc', deflexion: false, titulo: 'Correa entre pórticos bajo 1.2D + 1.6Lr' },
      calc(`# Análisis del pórtico biarticulado (Kleinlogel)
kf = Ix_v/Ix_c*hc/Lf // Rigidez relativa k = (Iv/Ic)(h/L)
cg = 1/(4*(2*kf + 3)) // Carga vertical w: M esquina = −w·L²/(4(2k+3))
cq = (5*kf + 6)/(8*(2*kf + 3)) // Carga q en una columna: reacción redundante X = q·h·(5k+6)/(8(2k+3))
## Momentos en las esquinas por caso de carga (− tracción exterior)
MD = -cg*wD*Lf^2 -> tonf*m // Carga muerta
MLr = -cg*wLr*Lf^2 -> tonf*m // Carga viva de techo
MWr = cg*wr1*Lf^2 -> tonf*m // Succión del techo (reduce el momento)
MCw = -(cq*q1*hc)*hc - (q2*hc^2/2 - cq*q2*hc*hc) -> tonf*m // Viento en muros, esquina de sotavento (crítica)
MBw = q1*hc^2/2 - cq*q1*hc*hc + cq*q2*hc*hc -> tonf*m // Viento en muros, esquina de barlovento
Pw = (q1 + q2)*hc^2/(2*Lf) -> tonf // Fuerza axial por volteo (compresión en la columna de sotavento)
## Amplificación de segundo orden (AISC Apéndices 7 y 8)
GA = 10 // Base articulada (comentario App. 7)
GB = (Ix_c/hc)/(Ix_v/Lf) // Nudo superior
Kx = sqrt((1.6*GA*GB + 4*(GA + GB) + 7.5)/(GA + GB + 7.5)) // K de pórtico no arriostrado (aproximación del nomograma, Comentario App. 7)
Pstory = (1.2*wD + 1.6*wLr)*Lf + 2*1.2*peso_c*hc -> tonf // Carga vertical total del piso
Pestory = 2*pi^2*E*Ix_c/(Kx*hc)^2 -> tonf // Carga crítica del piso (A-8-7, RM = 1)
B2 = 1/(1 - Pstory/Pestory) // Multiplicador P-Δ (A-8-6, α = 1)
## Combinaciones LRFD (E.090 1.4.1) — esquina de sotavento
Mr2 = abs(1.2*MD + 1.6*MLr) -> tonf*m // 1.2D + 1.6Lr
Mr3 = abs(1.2*MD + 1.6*MLr + 0.8*MWr) + B2*abs(0.8*MCw) -> tonf*m // 1.2D + 1.6Lr + 0.8W (Mr = B1·Mnt + B2·Mlt, B1 = 1)
Mr4 = abs(1.2*MD + 0.5*MLr + 1.3*MWr) + B2*abs(1.3*MCw) -> tonf*m // 1.2D + 1.3W + 0.5Lr
Mu = max(Mr2, Mr3, Mr4) -> tonf*m // Momento de diseño en la esquina
Pu = max((1.2*wD + 1.6*wLr)*Lf/2, (1.2*wD + 1.6*wLr - 0.8*wr1)*Lf/2 + 0.8*Pw, (1.2*wD + 0.5*wLr - 1.3*wr1)*Lf/2 + 1.3*Pw) + 1.2*peso_c*hc -> tonf // Axial máxima en la columna
Hu = Mu/hc -> tonf // Empuje horizontal en la base (compresión en la viga)
Mpos = (1.2*wD + 1.6*wLr)*Lf^2/8 + (1.2*MD + 1.6*MLr) -> tonf*m // Momento positivo en el centro de la viga
# Diseño de la viga (AISC 360 F2, H1)
Lpv = LpF2(ry_v, Fy, E) -> m // Longitud límite plástica (F2-5)
Lrv = LrF2(rts_v, Fy, J_v, Sx_v, ho_v, E) -> m // Longitud límite inelástica (F2-6)
phiMnv = 0.90*MnW(perfil_v, Fy, lfb, 1.0, E) -> tonf*m // Zona de esquina: ala inferior comprimida, Lb = tornapuntas, Cb = 1
phiMpv = 0.90*MnW(perfil_v, Fy, sc, 1.0, E) -> tonf*m // Centro: ala superior arriostrada por las correas (Lb = sc)
phiPnv = 0.90*PnE3(perfil_v, Fy, Lf, lfb, E) -> tonf // Compresión por el empuje horizontal
check H1(Hu, phiPnv, Mu, phiMnv) <= 1.0 // Viga en la esquina: flexocompresión (H1-1)
check Mpos <= phiMpv // Viga en el centro de luz (F2)
phiVnv = phivG2(perfil_v, Fy, E)*VnG2(perfil_v, Fy, E) -> tonf // Cortante (G2.1)
check (1.2*wD + 1.6*wLr)*Lf/2 <= phiVnv // Cortante en la viga
dLr = 5*wLr*Lf^4/(384*E*Ix_v) + MLr*Lf^2/(8*E*Ix_v) -> cm // Flecha por Lr (viga con momentos de extremo)
check dLr <= Lf/240 // Flecha de la viga L/240
# Diseño de las columnas (AISC 360 E3, F2, H1)
Lcx = Kx*hc -> m // Longitud efectiva en el plano del pórtico (App. 7)
Lcy = hc/2 // Fuera del plano: riostra a media altura (viga de muro + arriostre)
check max(Lcx/rx_c, Lcy/ry_c) <= 200 // Esbeltez (E2)
phiPnc = 0.90*PnE3(perfil_c, Fy, Lcx, Lcy, E) -> tonf // Resistencia a compresión (E3)
phiMnc = 0.90*MnW(perfil_c, Fy, Lcy, 1.0, E) -> tonf*m // Flexión con Lb = hc/2, Cb = 1 (F2)
ratioc = H1(Pu, phiPnc, Mu, phiMnc) // Interacción H1-1
check ratioc <= 1.0 // Columna: flexocompresión (H1-1)
# Deriva por viento (servicio)
Peq = (q1 + q2)*hc/2 -> tonf // Resultante de viento en muros llevada a la cabeza de las columnas
Dw = Peq*hc^3/(6*E*Ix_c) + Peq*hc^2*Lf/(12*E*Ix_v) -> cm // Desplazamiento lateral del pórtico biarticulado
check Dw <= hc/100 // Deriva de servicio h/100 (AISC Design Guide 3)
# Verificación sísmica (NTE E.030-2018, análisis estático)
Kl = Peq/Dw -> tonf/cm // Rigidez lateral del pórtico
Psis = (wD + 0.25*wLr)*Lf + 2*peso_c*hc/2 -> tonf // Peso sísmico por pórtico: CM + 25 % CV de techo + mitad de columnas (E.030 Art. 26)
Tf = 2*pi*sqrt(Psis/(9.81 m/s^2*Kl)) -> s // Período fundamental T = 2π√(m/k)
Zs = 0.45 // Factor de zona (Zona 4) [0.10|0.25|0.35|0.45]
Us = 1.0 // Factor de uso (categoría C) [1.0|1.3|1.5]
Ss = 1.05 // Factor de suelo (S2, Zona 4)
Tp = 0.6 s // Período TP (S2)
Tl = 2.0 s // Período TL (S2)
Rs = 4 // Coeficiente de reducción: pórtico ordinario resistente a momentos de acero, R0 = 4 (regular)
Cs = CE030(Tf, Tp, Tl) // Factor de amplificación sísmica (E.030 Art. 14)
Vsis = Zs*Us*Cs*Ss/Rs*Psis -> tonf // Cortante basal V = ZUCS·P/R (E.030 Art. 28)
Vw = (q1 + q2)*hc/2 -> tonf // Cortante de viento por pórtico (servicio)
check Vsis <= 1.3*Vw // Resistencia lateral: el cortante sísmico no excede el de viento factorizado (gobierna el viento)
Dsis = 0.75*Rs*Vsis/Kl -> cm // Desplazamiento inelástico 0.75·R·Δelástico (E.030 Art. 31, regular)
check Dsis/hc <= 0.010 // Distorsión máxima de entrepiso para acero (E.030 Tabla N.º 11)`),
      { type: 'plot', expr: '((1.2*wD + 1.6*wLr)*(x m)*(Lf - x m)/2 - Mr2)/(1 tonf*m); ((1.2*wD + 1.6*wLr - 0.8*wr1)*(x m)*(Lf - x m)/2 - Mr3)/(1 tonf*m)', var: 'x', desde: '0', hasta: 'Lf/(1 m)', puntos: '100', xlabel: 'x [m]', ylabel: 'M [t·m]', nombres: '1.2D + 1.6Lr; 1.2D + 1.6Lr + 0.8W (momento de esquina crítico en ambos extremos, envolvente)', leyenda: true, titulo: 'Momento flector en la viga del pórtico (positivo: tracción en el ala inferior)' },
      summary(),
    ],
  },
  // ------------------------------------------------------------------
  //  9) Viga compuesta acero–concreto con losa colaborante
  // ------------------------------------------------------------------
  {
    id: 'st-compuesta', pais: 'PE', cat: CAT, icon: 'slab', settings: TEC,
    name: 'Viga compuesta acero–concreto con losa colaborante (AISC I3, I8)',
    normas: 'ANSI/AISC 360-16/22 Cap. I (I3.1, I3.2, I8.2) · Comentario I3 (inercia de límite inferior) · NTE E.090 · NTE E.020',
    desc: 'Viga W no apuntalada con losa sobre placa colaborante perpendicular: etapa constructiva, ancho efectivo, conectores tipo perno (Qn), compuesta parcial con eje neutro plástico, cortante y flecha con ILB.',
    titulo: 'Diseño de viga compuesta acero–concreto — AISC 360 Cap. I',
    blocks: [
      text(`# Generalidades
Viga secundaria de entrepiso, simplemente apoyada, de perfil W **no apuntalado** durante el vaciado, que actúa en sección compuesta con una losa de concreto sobre **placa colaborante** (tipo Acero-Deck) con nervios **perpendiculares** a la viga. La conexión de corte se materializa con **conectores tipo perno** (*headed studs*) de ¾" soldados a través de la placa, uno por nervio.

- **Etapa constructiva:** el perfil solo resiste el peso del concreto fresco y una carga de construcción de 50 kgf/m² (ASCE 37), con el ala superior arriostrada por la placa.
- **Etapa compuesta:** resistencia plástica a flexión (AISC I3.2a) con compuesta parcial ΣQn < AsFy; el concreto por debajo de la cresta de los nervios se desprecia (I3.2c).
- **Servicio:** flecha por carga viva con la **inercia de límite inferior** ILB (Comentario I3, Ec. C-I3-1).`),
      { type: 'steelsec', perfil: 'W12X19', tabla: true, titulo: 'Perfil de acero W12×19 (ASTM A992)' },
      calc(`# Datos
## Geometría
Lv = 9 m // Luz de la viga
sv = 3 m // Separación entre vigas
hr = 6 cm // Altura del nervio de la placa colaborante
tc = 6 cm // Espesor de concreto sobre la cresta
wr = 15 cm // Ancho medio del nervio
ss = 30 cm // Separación de conectores (uno por nervio)
## Materiales
Fy = 3515 kgf/cm^2 // Fluencia ASTM A992 (50 ksi)
E = 2039000 kgf/cm^2 // Módulo de elasticidad del acero
fc = 210 kgf/cm^2 // Resistencia del concreto [210 kgf/cm^2|280 kgf/cm^2]
wc = 145 lbf/ft^3 // Peso unitario del concreto (≈ 2320 kgf/m³)
dsa = 19.05 mm // Diámetro del conector [15.88 mm : 5/8"|19.05 mm : 3/4"]
Fusa = 4570 kgf/cm^2 // Resistencia a tracción del conector (ASTM A108, 65 ksi)
## Cargas (E.020)
wdeck = 10 kgf/m^2 // Placa colaborante calibre 22
wcon = 2400 kgf/m^3*(tc + hr/2) -> kgf/m^2 // Concreto de la losa (nervios de sección media)
wsd = 100 kgf/m^2 // Muerta sobreimpuesta: acabados y tabiquería móvil
wL = 250 kgf/m^2 // Carga viva de oficinas (E.020 Tabla 1)
wcons = 50 kgf/m^2 // Carga de construcción (ASCE 37)
# Etapa constructiva (perfil solo, AISC F2)
wu1 = 1.2*((wdeck + wcon)*sv + peso) + 1.6*wcons*sv -> tonf/m // 1.2D + 1.6Lc
Mu1 = wu1*Lv^2/8 -> tonf*m
phiMp = 0.90*Fy*Zx -> tonf*m // Ala comprimida arriostrada por la placa: Lb ≈ 0, Mn = Mp (F2-1)
check lambdaf <= 0.38*sqrt(E/Fy) // Ala compacta (Tabla B4.1b)
check Mu1 <= phiMp // Resistencia en la etapa constructiva
dpre = 5*((wdeck + wcon)*sv + peso)*Lv^4/(384*E*Ix) -> cm // Flecha por concreto fresco (se compensa con contraflecha)
camber = roundup(0.8*dpre, 0.5 cm) // Contraflecha recomendada ≈ 80 % de la flecha por peso propio
# Etapa compuesta — resistencia requerida
wu2 = 1.2*((wdeck + wcon + wsd)*sv + peso) + 1.6*wL*sv -> tonf/m // 1.2D + 1.6L (E.090 1.4.1)
Mu = wu2*Lv^2/8 -> tonf*m
Vu = wu2*Lv/2 -> tonf
# Ancho efectivo (I3.1a)
beff = min(Lv/4, sv) -> cm // Suma de L/8 a cada lado, sin exceder la separación entre vigas
# Conectores de corte (I8.2a)
Ec = EcAISC(fc, wc) // Ec = wc^1.5 √f'c (I2.1b)
Asa = pi*dsa^2/4 -> cm^2 // Área del conector
check hr <= 7.5 cm // Altura del nervio hr ≤ 3 in (I3.2c)
check wr >= 5 cm // Ancho medio del nervio ≥ 2 in (I3.2c)
check tc >= 5 cm // Concreto sobre la placa ≥ 2 in (I3.2c)
Rg = 1.0 // Un conector por nervio, placa perpendicular (Tabla I8.1)
Rp = 0.6 // Conector en posición débil, placa perpendicular (Tabla I8.1)
Qn = min(0.5*Asa*sqrt(fc*Ec), Rg*Rp*Asa*Fusa) -> tonf // Resistencia de un conector (I8-1)
nq = floor((Lv/2)/ss) // Conectores entre el apoyo y el centro de luz
SQn = nq*Qn -> tonf // Fuerza de corte horizontal transferida
Cc = 0.85*fc*beff*tc -> tonf // Compresión máxima del concreto sobre la placa (I3-1b)
AsFy = A*Fy -> tonf // Tracción máxima del acero (I3-1a)
Cf = min(Cc, AsFy, SQn) -> tonf // Fuerza de compresión en el concreto (I3.2d)
check Cf >= 0.25*AsFy // Grado de acción compuesta ≥ 25 % (recomendación del Comentario I3.2d)
# Momento resistente plástico (I3.2a)
af = Cf/(0.85*fc*beff) // Profundidad del bloque de compresión
check af <= tc // El bloque de compresión queda sobre la placa
Cs = (AsFy - Cf)/2 -> tonf // Compresión en el perfil
yf = si(Cs <= bf*tf*Fy, Cs/(bf*Fy), tf + (Cs - bf*tf*Fy)/(tw*Fy)) // Profundidad del ENP en el perfil (ala o alma)
check Cs <= bf*tf*Fy // ENP dentro del ala superior (la fórmula siguiente supone este caso)
Mn = Cf*(d/2 + hr + tc - af/2) + 2*Cs*(d/2 - yf/2) -> tonf*m // Momento de las fuerzas respecto al centroide del perfil
phiMn = 0.90*Mn -> tonf*m // φb = 0.90 (I3.2a)
check Mu <= phiMn // Resistencia a flexión de la sección compuesta
# Cortante (I4.2, G2.1)
check lambdaw <= 2.24*sqrt(E/Fy) // φv = 1.0 y Cv1 = 1 (G2.1a)
phiVn = 1.0*0.6*Fy*d*tw -> tonf // Solo el alma del perfil (I4.2)
check Vu <= phiVn // Resistencia a cortante
# Flecha por carga viva (Comentario I3.2)
d1 = hr + tc - af/2 // Distancia de la fuerza en el concreto a la cara superior del acero
YENA = (A*d/2 + SQn/Fy*(d + d1))/(A + SQn/Fy) // Eje neutro elástico desde la cara inferior del acero (C-I3-2)
ILB = Ix + A*(YENA - d/2)^2 + SQn/Fy*(d + d1 - YENA)^2 -> cm^4 // Inercia de límite inferior (C-I3-1)
dL = 5*wL*sv*Lv^4/(384*E*ILB) -> cm // Flecha por carga viva
check dL <= Lv/360 // Límite L/360 para carga viva (IBC Tabla 1604.3)
"Contraflecha recomendada del perfil: {camber}. Conectores ¾\\" × 4\\": {nq} entre el apoyo y el centro de luz (total {2*nq}).`),
      { type: 'plot', expr: 'wu2*(x m)*(Lv - x m)/2/(1 tonf*m); phiMn/(1 tonf*m)', var: 'x', desde: '0', hasta: 'Lv/(1 m)', puntos: '80', xlabel: 'x [m]', ylabel: 'M [t·m]', nombres: 'Mu (1.2D + 1.6L); φMn sección compuesta', leyenda: true, titulo: 'Momento solicitante y resistencia de la sección compuesta' },
      summary(),
    ],
  },
  // ------------------------------------------------------------------
  //  10) Viga con perfil europeo IPE — AISC 360 y NTE E.090
  // ------------------------------------------------------------------
  {
    id: 'st-viga-ipe', pais: 'PE', cat: CAT, icon: 'beam', settings: TEC,
    name: 'Viga de perfil europeo IPE (AISC 360 y NTE E.090)',
    normas: 'ANSI/AISC 360-16/22 F2, G2, J10 · NTE E.090 (Cap. F, LRFD 1999) · NTE E.020',
    desc: 'Viga IPE simplemente apoyada con arriostre lateral intermedio: pandeo lateral-torsional por AISC 360 F2 y por E.090 (X1, X2, FL), cortante, cargas concentradas en el alma (J10) y flecha.',
    titulo: 'Diseño de viga de acero IPE — AISC 360-16 / NTE E.090',
    blocks: [
      text(`# Generalidades
Viga de entrepiso de **perfil europeo IPE** (EN 10365), acero S275JR, simplemente apoyada sobre vigas principales y arriostrada lateralmente en el centro de la luz por una viga secundaria. Se verifica la flexión con pandeo lateral-torsional según **AISC 360-16/22 Sección F2** y, como comparación, según la **NTE E.090 (2006)** — basada en AISC LRFD 1999 —, que usa los parámetros X1, X2 y FL = Fy − Fr.

- **Propiedades:** tablas ArcelorMittal (EN 10365); It e Iw con las fórmulas del fabricante.
- **Cargas:** D = 1.2 t/m (losa, acabados y peso propio), L = 1.0 t/m (E.020); combinación 1.2D + 1.6L (E.090 1.4.1).`),
      { type: 'steelsec', perfil: 'IPE300', tabla: true, titulo: '' },
      calc(`# Datos
Fy = 2804 kgf/cm^2 // Fluencia S275 (275 MPa) [2396 kgf/cm^2|2804 kgf/cm^2|3620 kgf/cm^2]
E = 2039000 kgf/cm^2 // Módulo de elasticidad (200 GPa en EN; 29 000 ksi en AISC)
G = 784000 kgf/cm^2 // Módulo de corte (11 200 ksi)
Lv = 6 m // Luz de la viga
Lb = 3 m // Longitud no arriostrada (arriostre en el centro)
wDs = 1.2 tonf/m // Carga muerta de servicio
wLs = 1.0 tonf/m // Carga viva de servicio
lbr = 10 cm // Longitud de apoyo en los extremos
# Solicitaciones (E.090 1.4.1)
wu = max(1.4*wDs, 1.2*wDs + 1.6*wLs) -> tonf/m
Mu = wu*Lv^2/8 -> tonf*m // Momento máximo (centro)
Vu = wu*Lv/2 -> tonf // Cortante y reacción
Cb = CbF1(1, 0.4375, 0.75, 0.9375) // Segmento entre apoyo y centro, carga uniforme: Mmax = 1, MA, MB, MC (F1-1) ≈ 1.30`),
      { type: 'beam', tramos: 'Lv', apoyos: 'A A', E: 'E', I: 'Ix', cargas: 'CM: U 1 wDs\nCV: U 1 wLs', titulo: 'Diagramas de servicio de la viga (CM + CV)' },
      calc(`# Compacidad (AISC Tabla B4.1b)
check lambdaf <= 0.38*sqrt(E/Fy) // Ala compacta (caso 10)
check lambdaw <= 3.76*sqrt(E/Fy) // Alma compacta (caso 15)
# Flexión — AISC 360-16/22 F2
Mp = Fy*Zx -> tonf*m // Momento plástico (F2-1)
Lp = 1.76*ry*sqrt(E/Fy) -> m // F2-5
Lr = 1.95*rts*E/(0.7*Fy)*sqrt(J/(Sx*ho) + sqrt((J/(Sx*ho))^2 + 6.76*(0.7*Fy/E)^2)) -> m // F2-6
Fcr = Cb*pi^2*E/(Lb/rts)^2*sqrt(1 + 0.078*J/(Sx*ho)*(Lb/rts)^2) // F2-4
Mn = si(Lb <= Lp, Mp, si(Lb <= Lr, min(Cb*(Mp - (Mp - 0.7*Fy*Sx)*(Lb - Lp)/(Lr - Lp)), Mp), min(Fcr*Sx, Mp))) -> tonf*m // F2-1 a F2-3
phiMn = 0.90*Mn -> tonf*m
check Mu <= phiMn // Flexión AISC 360 (F1)
# Flexión — NTE E.090 (F1.1, perfiles compactos)
Fr = 69 MPa // Esfuerzo residual en perfiles laminados (E.090 F1.1)
FL = Fy - Fr // Esfuerzo FL = Fy − Fr
X1 = pi/Sx*sqrt(E*G*J*A/2) // E.090 Ec. F1-8
X2 = 4*Cw/Iy*(Sx/(G*J))^2 // E.090 Ec. F1-9
Lp090 = 1.76*ry*sqrt(E/Fy) -> m // Lp = 300ry/√Fy (ksi) (E.090 F1-4)
Lr090 = ry*X1/FL*sqrt(1 + sqrt(1 + X2*FL^2)) -> m // E.090 F1-6
Mr = FL*Sx -> tonf*m // E.090 F1-7
Mn090 = si(Lb <= Lp090, Mp, min(Cb*(Mp - (Mp - Mr)*(Lb - Lp090)/(Lr090 - Lp090)), Mp)) -> tonf*m // E.090 F1-2 (Lb ≤ Lr)
check Lb <= Lr090 // Zona inelástica (aplica F1-2)
check Mu <= 0.90*Mn090 // Flexión NTE E.090
# Cortante (G2.1)
check lambdaw <= 2.24*sqrt(E/Fy) // φv = 1.0, Cv1 = 1 (G2.1a)
phiVn = 1.0*0.6*Fy*d*tw -> tonf // G2-1
check Vu <= phiVn // Resistencia a cortante
# Reacción en el apoyo: alma (J10)
phiRy = 1.0*RnJ10y(Fy, tw, kdes, lbr, 0 cm, d) -> tonf // Fluencia local del alma, reacción en el extremo (J10-3)
check Vu <= phiRy // Fluencia local del alma
phiRc = 0.75*RnJ10c(tw, tf, d, lbr, Fy, E, 0 cm) -> tonf // Aplastamiento del alma, x < d/2 (J10-5)
check Vu <= phiRc // Aplastamiento (crippling) del alma
# Flecha
dL = 5*wLs*Lv^4/(384*E*Ix) -> cm // Por carga viva
check dL <= Lv/360 // L/360 (IBC 1604.3)
dT = 5*(wDs + wLs)*Lv^4/(384*E*Ix) -> cm // Por carga total
check dT <= Lv/240 // L/240`),
      { type: 'plot', expr: '0.9*MnW(perfil, Fy, x m, Cb, E)/(1 tonf*m); 0.9*MnW(perfil, Fy, x m, 1, E)/(1 tonf*m); Mu/(1 tonf*m)', var: 'x', desde: '0.5', hasta: '10', puntos: '160', xlabel: 'Lb [m]', ylabel: 'φMn [t·m]', nombres: 'φMn con Cb; φMn con Cb = 1; Mu', leyenda: true, titulo: 'Resistencia a flexión del IPE en función de la longitud no arriostrada (AISC F2)' },
      summary(),
    ],
  },
];
