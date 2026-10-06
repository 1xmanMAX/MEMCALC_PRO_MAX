# Módulo «extras» — auditoría de cobertura y plantillas complementarias

Archivos: `src/norms/extras.js`, `src/blocks/extras.js`, `src/templates/extras.js`, `tests/extras.test.mjs`.

## 1. Auditoría de cobertura (octubre 2026)

Se revisaron las ~140 plantillas existentes frente a lo que necesita una consultora estructural peruana
(pedido del usuario: «columnas, vigas, placas, zapatas, geotecnia, puentes, muros de contención,
estructuras metálicas, casas en estructura metálica, vigas en voladizo, todo lo estructural»).

| Tema | Plantillas existentes | Estado antes | Agregado por «extras» |
|---|---|---|---|
| Columnas | `columna`, `co-colesbelta`, `co-biaxial`, `co-colductil`, `jp-aij-columna`, `st-columna` | Bien cubierto | `ex-encamisado` (reforzamiento), P–M de sección **circular** (`exPMcirc`, `phiMnCirc`) |
| Vigas | `viga`, `vigacont`, `co-vigat`, `co-vigadoble`, `co-torsion`, `co-deflexion`, `co-vigaductil`, `co-stm`, `aci`, `ec2` | Bien cubierto | `ex-frp` (reforzamiento con FRP) |
| Voladizos | `co-voladizo`, `an-voladizo` | Cubierto | — |
| Placas / muros de C°A° | `co-placa`, `cl-muro-ds60` | Faltaba el acoplamiento | `ex-viga-acople` (diagonales ACI 18.10.7) |
| Losas | `aligerado`, `co-losa1d`, `co-losa2d`, `co-aligerado2d`, `co-punzonamiento` | Faltaba el diafragma | `ex-diafragma` (cuerdas, colectores, Ω0, rigidez) |
| Escaleras | `escalera` (un tramo) | Faltaba la de dos tramos con descanso (la más común) | `ex-escalera-2t` |
| Zapatas y cimentaciones | `zapata`, `ge-combinada`, `ge-conectada`, `ge-medianera`, `ge-platea`, `ge-winkler`, `ge-corrido`, `ge-pilote`, `ge-grupo` | Faltaba el diseño estructural del pilote, losas sobre terreno y equipos | `ex-pilote-fuste`, `ex-piso-ind`, `ex-cim-maquina` |
| Pavimentos | — | No existía | `ex-pav-rigido` (AASHTO 93 / MTC 2014) |
| Geotecnia | `portante`, `ge-portante`, `ge-spt`, `ge-licuacion`, `ge-talud` | Bien cubierto | — |
| Muros de contención | `muro`, `wa-*` (9 plantillas) | Faltaba el muro anclado de sótanos (práctica habitual en Lima) | `ex-muro-anclado` |
| Puentes | `puente`, `br-*` (9 plantillas) | Faltaban estructuras de cable | `ex-pase-aereo` (pase aéreo de tubería) |
| Acero / casas metálicas | `acero`, `st-*` (11 plantillas, incluida `st-casa`) | Bien cubierto | `ex-letrero` (panel monoposte: viento, tubo, pernos, zapata) |
| Estructuras especiales | `ma-reservorio`, `ma-cisterna`, `ma-elevado`, `pe-e031-aislamiento` | — | `ex-cim-maquina` |
| Sismo, cargas, análisis, dinámica, albañilería, madera | numerosas | Bien cubierto | — |

### Brechas que siguen abiertas (candidatos para una siguiente iteración)

Escalera autoportante y helicoidal; losa postensada (balanceo de cargas y pérdidas); vigas presforzadas de
edificación; cobertura liviana con correas de madera (parcialmente: `ma-tijeral`, `st-correas`); torre metálica
autosoportada / chimenea (viento en celosía); estructuras de soporte de paneles solares; caja de ascensor como
núcleo; apoyos deslizantes de edificación; puente colgante peatonal (el pase aéreo cubre la mecánica del cable);
FRP a cortante y confinamiento de columnas (ACI 440.2R-17 Cap. 11 y 12).

## 2. Plantillas agregadas

| id | Categoría | Contenido principal | Validación |
|---|---|---|---|
| `ex-escalera-2t` | Concreto armado | Tramo + descanso simplemente apoyados, cargas distintas, Mmáx en forma cerrada contrastada con el análisis matricial (bloque `beam`), As+, As−, temperatura, cortante, A.010 | Control (equilibrio) |
| `ex-piso-ind` | Cimentaciones | Westergaard interior/borde/esquina, montacargas y racks, FS de ACI 360R, punzonamiento de concreto simple (ACI 318-19 14.5.5, h − 50 mm), carga repartida PCA, juntas, pasadores (ACI 302.1R), acero por arrastre | Funciones validadas con Huang Ej. 4.1–4.3 (publicados) |
| `ex-pav-rigido` | Cimentaciones | Ecuación AASHTO 93 resuelta por bisección, ZR por confiabilidad, W18 admisible, juntas, pasadores D/8, barras de amarre | **Ejemplo publicado**: Huang Ej. 12.6 (nomograma AASHTO 93), D = 9.75 in; la ecuación da 9.72 in; Ej. 12.7 término a término |
| `ex-cim-maquina` | Cimentaciones | Masa mínima, presiones, rigideces y amortiguamientos de Richart–Hall–Woods (vertical, horizontal, cabeceo), frecuencias y relaciones de frecuencia, amplitud y velocidad con la fuerza de desbalance ISO 21940-11 | Control (fórmulas recalculadas) |
| `ex-viga-acople` | Concreto armado | ℓn/h y Vu, Avd = Vu/(2φfy sen α), límite 0.83√f'c Acw (2.65√f'c kgf/cm²), confinamiento de toda la sección (18.10.7.4 d), anclaje 1.25ℓd | Control |
| `ex-diafragma` | Concreto armado | Fpx con límites 0.5ZUS–ZUS (equivalencia con ASCE 7-22 12.10.1.1, SDS ≈ 2.5ZUS), viga horizontal, cortante ACI 12.5.3.3, cuerdas, colectores con Ω0, δ diafragma ≤ 2Δ | Control |
| `ex-pase-aereo` | Puentes | Cable parabólico (H, V, Tmáx, longitud), cable 6×19 IWRC con FS, péndolas, viento E.020, torre con magnificación de momentos, cámara de anclaje (deslizamiento y arrancamiento) | Control + tabla de cables de catálogo |
| `ex-muro-anclado` | Muros de contención | Envolvente aparente 0.65KaγH² (GEC-4), áreas tributarias, torones 0.6", longitud libre más allá de la cuña, bulbo por adherencia FS 2, pantalla y punzonamiento | Control (equilibrio del trapecio verificado) |
| `ex-letrero` | Acero estructural | E.020 (C = 1.5 anuncios), torsión 0.2B (ASCE 7-22 29.3.4), tubo AISC F8/G5/H3, deflexión, pernos, zapata (volteo, tercio central, presiones, deslizamiento) | Control |
| `ex-frp` | Concreto — normas extranjeras | ACI 440.2R-17 completo a flexión: límite de reforzamiento, εbi, εfd, equilibrio con bloque parabólico, ψf, φ por ductilidad, servicio, creep-rupture, ℓdf | **Ejemplo publicado**: ACI 440.2R-17 Ej. 16.3 (c = 5.17 in, Mns ≈ 292 kip-ft, Mnf = 85 kip-ft, fs,s = 40.4 ksi) |
| `ex-pilote-fuste` | Cimentaciones | φPn con φ = 0.55 (ACI 13.4.3), T = (EI/nh)^(1/5), Matlock–Reese cabeza empotrada, P–M circular, cortante, espiral | Control + integración independiente por franjas |
| `ex-encamisado` | Concreto armado | Capacidad existente, sección monolítica con f'c existente (EC8-3 A.4.2.2: 0.9 en cortante), diagrama `pmgen`, confinamiento, conectores por cortante-fricción | Control |

## 3. Funciones normativas nuevas (`src/norms/extras.js`)

`ZRconf`, `W18AASHTO93`, `DAASHTO93` (AASHTO 93); `lrelWest`, `sigIntWest`, `sigBordeWest`, `sigEsqWest`
(Westergaard, Huang 2004 Ec. 4.4, 4.7, 4.11, 4.13); `cFRP440`, `b1FRP`, `a1FRP` (ACI 440.2R-17 10.2.10);
`cableRot`, `cablePeso`, `cableArea` (cable 6×19 IWRC, EIPS/IPS); `phiMnCirc`, `phiPnCirc` (sección circular,
compatibilidad de deformaciones, φ 0.75 → 0.90).

Bloques (`src/blocks/extras.js`): `exEscalera`, `exCapas`, `exMaquina`, `exAcople`, `exDiafragma`, `exCable`,
`exAnclado`, `exLetrero`, `exFRP`, `exPMcirc` (este último verifica las demandas y agrega sus `check`).

## 4. Notas y decisiones

- La E.060 no trata losas sobre terreno, FRP, vigas de acoplamiento con diagonales ni pilotes en detalle: se usan
  ACI 360R-10, ACI 440.2R-17 y ACI 318-19 con equivalencias en kgf/cm² (0.83√f'c MPa = 2.65√f'c kgf/cm²;
  0.17√f'c = 0.53√f'c; 0.22√f'c = 0.70√f'c; 0.33√f'c = 1.06√f'c).
- AASHTO 93: el valor del ejemplo se reproduce con datos convertidos a kgf/cm (S'c = 45.7 kgf/cm², Ec = 351 500
  kgf/cm², k = 1.99 kgf/cm³). Fuera de rango (> 60 in) `DAASHTO93` devuelve 152 cm para que la verificación no cumpla
  sin producir error.
- FRP: la guía redondea εfd a 0.009; la fórmula da 0.00878, por eso Mnf resulta 2.6 % menor (tolerancia 3 %). Los
  factores α1 y β1 parabólicos se aplican con εc hasta 0.003 (como en el ejemplo, donde εc > ε'c).
- La fuerza mínima/máxima de diafragma no está en la E.030: se documenta la equivalencia adoptada con el ASCE 7-22.
- En `ex-encamisado` se usa `pmgen` (y no `pm`) porque el bloque `pm` dibuja la etiqueta «M» fuera del SVG cuando la
  sección es cuadrada (defecto del bloque base, detectado por `tools/qa-render.mjs`).
- `tests/engine.test.mjs` comprueba «Área por metro se muestra en cm²/m» después de ejecutar todas las plantillas; si la
  última plantilla de la lista usa `settings: { sys: 'si' }` la prueba falla (dependencia de orden del sistema de unidades
  global). Por eso `ex-frp` (SI) no es la última del módulo.

## 5. Fuentes

- AASHTO (1993). *Guide for Design of Pavement Structures*, Parte II Cap. 3. Ejemplo del nomograma (k = 72 pci,
  Ec = 5×10⁶ psi, S'c = 650 psi, J = 3.2, Cd = 1.0, ΔPSI = 1.7, R = 95 %, So = 0.29, W18 = 5.1×10⁶ → D = 9.75 in) en
  Huang, *Pavement Analysis and Design*, 2.ª ed., Ej. 12.6 y 12.7; ecuación de diseño en pavementinteractive.org.
- MTC (2014). *Manual de Carreteras: Suelos, Geología, Geotecnia y Pavimentos*, Sección Pavimentos, Cap. 14.
- Huang, Y. H. (2004). *Pavement Analysis and Design*, 2.ª ed., Cap. 4 (Westergaard).
- ACI 360R-10 *Guide to Design of Slabs-on-Ground*; PCA EB075 *Concrete Floors on Ground* (Packard).
- ACI 351.3R-18 *Foundations for Dynamic Equipment*; Richart, Hall y Woods (1970) *Vibrations of Soils and
  Foundations*; Das y Ramana, *Principles of Soil Dynamics*; ISO 21940-11.
- ACI 318-19 (13.4, 14.5, 18.7.5, 18.10.7, 18.12, 18.13); NTE E.060-2009; NTE E.020; NTE E.030-2026; NTE E.050.
- ASCE/SEI 7-22, 12.3.1, 12.10 y 29.3.4; AISC 360-16 F8, G5, H3, J3.
- FHWA-IF-99-015 (GEC-4) Sabatini, Pass y Bachus (1999) *Ground Anchors and Anchored Systems*; PTI DC35.1-14.
- Irvine, H. M. (1981) *Cable Structures*; catálogos de cable 6×19 IWRC (EIPS/IPS, RR-W-410).
- ACI 440.2R-17 *Guide for the Design and Construction of Externally Bonded FRP Systems*, Ej. 16.3 (Tabla 16.3c).
- Matlock y Reese (1960); Reese y Van Impe (2011) *Single Piles and Pile Groups Under Lateral Loading*.
- Eurocódigo 8-3 (EN 1998-3) Anexo A.4.2.2; ACI 369.1-17.

## 6. Revisión del supervisor (octubre 2026)

Ver `docs/referencias/revision-extras.md`: cabeceo de la cimentación de máquina alrededor del eje de la máquina,
deflexiones de la escalera, cortante-fricción losa–muro en el diafragma, momento transversal y flexión biaxial de la
torre del pase aéreo, pandeo/torsión/pernos combinados en el letrero, cuantía de espiral de pilotes según la Tabla
18.13.5.7.1, citas corregidas (ACI 360R-10, ACI 318-19 18.10.7.2, E.020 Art. 21–22) y ejemplos publicados nuevos
(Huang Ej. 4.1–4.3 y 12.7; ACI 440.2R-17 Ej. 16.3: k, kd, ff,s, Mnf en SI).
