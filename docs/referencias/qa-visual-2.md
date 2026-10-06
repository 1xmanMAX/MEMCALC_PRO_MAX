# QA visual 2: bloques gráficos, dynamics y masonry

Fecha: 2026-10-06. Herramientas: `node build.mjs && node tools/qa-render.mjs [--figs]` (130 plantillas), hojas de contacto
de las capturas por figura (`--figs`, montadas con PIL) y una auditoría estática de los SVG por tipo de bloque
(tamaños de letra, familia tipográfica y colores fuera de la paleta `C`, ejecutando las plantillas en Node).

## Resultado

| | Antes | Después |
|---|---|---|
| `svg/E` (textos superpuestos o fuera del viewBox) | 2 (dy-pushover-n2, dy-momcurv-col) | **0** en las 130 plantillas |
| `valor/W` (notación e) | 13 (dy-aislamiento 12, dy-momcurv-col 1) | **0** |
| `glifo/W` («‰») | 2 (dy-momcurv-col) | **0** |
| `unidad/W` de dynamics/masonry | 3 (ma-cerco) | **0** |
| Tamaños de letra en SVG fuera de 9–11 px | 8, 8.5, 11.5 y 12 en 15 tipos de bloque | **0** (todo entre 9 y 11) |

`node tests/run.mjs`: todo verde. No cambia ningún resultado de ingeniería ni ningún nombre de variable exportada
(en ma-cerco se agrega `ecc_lim`).

Lo que queda en el informe no corresponde a esta área: ecuaciones anchas (`ancho`) y unidades poco legibles en
plantillas de otros módulos (pe-e020-viento, co-voladizo, ge-portante, ge-combinada, wa-contrafuertes, wa-sotano,
st-casa), que dependen de las plantillas o del motor (ver qa-visual.md, «Pendiente fuera del área»). Además hay 3
memorias sin resumen que no lo llevan a propósito (espectros, combos, blanco).

## Correcciones

### dynamics (`src/blocks/dynamics.js`)
- **dy-pushover-n2**: los rótulos de fluencia «y1», «y2»… que caen a menos de 16 px se agrupan en uno solo («y1, y2»).
- **dy-momcurv-col**: la leyenda del gráfico σ–ε del concreto se movió a la zona libre, abajo a la derecha, y ya no tapa
  «εcu». El perfil de deformaciones muestra 0.0221 / −0.0336 en lugar de «22.07‰» (el glifo ‰ falta en algunas fuentes).
- **Notación e**: `sg()` y `fe()` ya no usan `toExponential`. Entre 10⁻⁵ y 10⁶ muestran decimales fijos y fuera de ese
  intervalo usan mantisa ×10ⁿ con superíndices Unicode. El nuevo `feT()` hace lo mismo en LaTeX (`\times 10^{n}`) y se usa
  para a₀/a₁ de Rayleigh y los coeficientes de Nigam-Jennings. Así se corrigen los 12 valores de dy-aislamiento (tabla de
  los primeros pasos de `thsdof`) y φ = 9.776e-4 de la tabla M–φ.

### masonry
- **ma-cerco** (plantilla): `ecc = … -> cm` y nueva `ecc_lim = Bc/6 -> cm`. La verificación queda en cm (0.664 cm ≤ 10 cm).
- **wallplan** (ma-edificio): ex y ey en cm (antes «0.006781 m»).

### frame2d (`src/blocks/analysis.js`)
- **Envolventes (máx./mín.)**: cada extremo de barra lleva un solo rótulo, el valor gobernante de las dos curvas, y se
  rotulan los máximos interiores de cada curva. En pórticos grandes (`dense`) queda el valor gobernante de la barra más su
  máximo interior si es de al menos el 30 % del máximo. En an-modal-pdelta, fig. 5, los rótulos bajan de unos 50 a unos 25
  y se leen sin superposiciones.
- **Valores por defecto vs. textos de ejemplo** (pedido de la prueba de usabilidad): los valores por defecto reales están en
  `def` (`deflim: 360`, `deriva_caso: CS`, `deriva_f: 0.75*8`, `deriva_lim: 0.007`, `modos: 3`). Los textos de ejemplo
  dicen «p. ej. …» y no se aplican en silencio. Si se indica un límite o un factor de deriva sin caso o combinación, sale el
  aviso «Derivas no verificadas: indique «Caso/combinación para derivas»…» y `deriva_1…`/`derivamax` no se definen. Si hay
  caso pero no límite, sale un aviso equivalente y ya no se aplica un 0.007 oculto. `deriva_f` vacío = 1, como dice la
  etiqueta. Todas las plantillas existentes indican los tres campos, así que sus resultados no cambian.
- Títulos de los diagramas a 11 px (antes 11.5) y familia tipográfica «Inter,Segoe UI,Arial» en todos los textos (el rótulo
  de nudos usaba «Inter,Arial»).

### Consistencia de estilo entre módulos
- **Tamaño de letra 9–11 px** en todos los bloques: se subieron a 9 px los textos de 8 y 8.5 px de analysis, dynamics,
  geotech (soilprofile, talud, pilote, licuación), japan (aidist, kaberyo), masonry (cilindro, tijeral) y peru
  (storyforces). Los ejes x/y del perfil de acero (steelsec) bajaron de 12 a 11 px. Después del cambio, qa-render no
  encuentra superposiciones.
- **Unidades en las cotas**: los muros `wall` (blocks.js) y `retwall` (walls) mostraban «t1 = 0.25», «punta 0.7»,
  «talón 1.7» y «hz 0.5» sin unidad, junto a «B = 2.8 m». Ahora todas las cotas llevan « m». La excentricidad de la
  resultante de `retwall` va en cm («R (e = 3.5 cm)»). La altura de la figura `wall` se ajusta al dibujo (antes sobraban
  unos 80 px en blanco).
- **Viento**: `windgable` (peru) usaba rojo = presión y azul = succión, y `galponCL` (chile) lo contrario. Se unificó a
  azul = presión, rojo = succión, como dice la leyenda de la plantilla chilena.
- **Título de steelsec**: «· 132 lb/ft» y «· 72.92 kg/m» salían en mayúsculas («LB/FT», «KG/M») por `.dt`. La unidad ahora
  se protege con `text-transform:none`.
- **Winkler (geotech `xDiagram`)**: el rótulo de la línea de referencia («qadm = 15») pasa al extremo izquierdo; a la derecha
  chocaba con el valor extremo del diagrama.

## Revisión a simple vista (más de 40 figuras)
viga, vigacont, zapata, muro, pe-e030-estatico (2), pe-e030-dinamico, pe-e031-aislamiento, ge-spt, ge-talud, ge-licuacion,
ge-pilote, ge-winkler, dy-sdof-elcentro (2), dy-5pisos-chopra, dy-nl-cortante, dy-aislamiento, dy-espectro-e030,
dy-pushover-n2, dy-momcurv-col, ma-edificio (2), ma-reservorio, ma-cisterna, ma-elevado, ma-tijeral, st-columna,
st-placa-base, st-shear-tab, co-placa, co-losa2d, co-stm, columna, co-vigaductil, wa-mse, wa-voladizo, pe-e020-viento,
jp-aij-columna, cl-nch433-modal, cl-muro-ds60, cl-viento-galpon, jp-bsl-ruta3, jp-madera-kaberyo, an-armadura,
an-influencia, an-nave, an-matricial, an-portico-ca, an-modal-pdelta (M y V), st-nave.

La paleta es coherente: los esfuerzos y curvas principales van en `C.blue`, las cargas, los límites y las solicitaciones
en `C.red`, el cortante en `C.green` y el suelo o las presiones laterales en `C.orange`/`C.soil`. Las series extra
`#8250df` y `#0a7e8c` se repiten igual en dynamics, chile y peru. Las flechas usan `arrowDefs` y las cotas
`dimH`/`dimV`, y las leyendas son líneas de 18 px con texto de 9 px.

## Pendiente (menor, fuera de lo editable o de bajo impacto)
- bridges.js (fuera del área editable): las cotas del estribo «punta 0.6», «talón …» y «t1 = …» siguen sin unidad.
- Unidad de fuerza «t» en los bloques gráficos frente a «tonf» en las fórmulas (práctica peruana; ver qa-visual.md).
- jp-bsl-ruta3: los rótulos de Qᵢ se apoyan sobre el escalón del diagrama; jp-madera-kaberyo: un rótulo de longitud «2»
  queda sobre su muro. Se leen, pero conviene desplazarlos.
- co-stm: los rótulos «CCT/CCC» en gris claro quedan bajo los puntales semitransparentes.
- Las cifras significativas de `sg()` en las tablas de dynamics son variables (0.0004142 / 0.00111). Es intencional para
  los primeros pasos de la integración.
