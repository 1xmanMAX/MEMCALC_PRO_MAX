# QA visual y editorial de las memorias (revisión global)

Revisión de las memorias que generan las plantillas, con el criterio del jefe de una consultora antes de firmar.
**Alcance:** las 105 plantillas de `src/templates.js` (base) y de `src/templates/{peru,japan,concrete,geotech,walls,bridges,steel,analysis}.js`,
más sus bloques gráficos (`src/blocks.js` y `src/blocks/{…}.js`). Los módulos chile, masonry y dynamics se revisaron solo
con la herramienta automática; sus hallazgos están en «Pendiente fuera del área».

## Herramientas

| Script | Uso |
|---|---|
| `tools/qa-render.mjs` | `node build.mjs && node tools/qa-render.mjs [ID…\|mod:peru…\|mod:base] [--out=/tmp/qa] [--tiles] [--figs] [--no-shot] [--json]` |
| `tools/qa-report.mjs` | `node tools/qa-report.mjs [/tmp/qa/report.json] [--sev=E,W] [--kind=svg,ancho] [--mod=…] [--skip=chile,masonry]` |

`qa-render.mjs` abre `dist/MemoriaCalc.html?plantilla=ID` en Chromium (Playwright), desactiva `content-visibility`
(si no, las secciones fuera de pantalla no se pintan ni se miden), simula la reducción de ecuaciones de impresión
(`fitEquations` de docrun.js) y detecta:

- errores de KaTeX (`.err`, `.katex-error`), del motor (`.lerr`) y valores no disponibles en el texto (`.ierr`);
- LaTeX crudo fuera de fórmulas (`$`, `\comando`, `^{`, `_{`) en párrafos y en figuras SVG;
- `NaN`, `Infinity`, `undefined`, `null`, `[object …]`; restos numéricos absurdos (×10⁻¹² o menores), ceros negativos, notación `e` en texto;
- valores muy pequeños para la unidad mostrada (p. ej. 0.0028 kgf/cm² en vez de 28 kgf/m²);
- textos SVG superpuestos entre sí o fuera del `viewBox`;
- ecuaciones que al imprimir se reducen a menos del 75 % (error) o del 90 % (aviso); tablas y figuras que desbordan la hoja; celdas recortadas;
- kanji/kana, «˚» por «°», «º» tras número, «⌀», «�» y cualquier carácter fuera de un conjunto seguro de fuentes latinas/griegas/matemáticas;
- palabras frecuentes sin tilde, palabras repetidas y anglicismos habituales (informativo);
- figuras sin leyenda, títulos sin contenido, memorias sin resumen de verificaciones, verificaciones que no cumplen, errores de consola.

Guarda una captura de la memoria completa por plantilla (`/tmp/qa/ID.png`), y opcionalmente tramos de 1300 px
(`--tiles`) y cada figura por separado (`--figs`), útiles para la revisión a simple vista.

## Resultado

| | Primera pasada | Final |
|---|---|---|
| Errores (E) en el área | 117 (42 ecuaciones anchas, 12 SVG, 10 valores, 5 JS/KaTeX, 3 tablas, 1 cálculo…) | **8** (solo ecuaciones anchas entre 66 % y 75 %) |
| Avisos (W) | ~100 | 35 (22 ecuaciones anchas 75–90 %, 10 unidades, 3 sin resumen —espectros, combos, blanco, por diseño—) |

Se revisaron a simple vista las 231 figuras del área (92 hojas de contacto) y las capturas completas de una muestra
de más de 40 memorias, priorizando las más complejas (an-modal-pdelta, an-portico-ca, an-nave, an-matricial,
an-armadura, an-influencia, an-cross, an-voladizo, br-vigalosa, br-acero, br-presforzada, br-estribo, br-pilar,
br-peatonal, br-sismo, br-alcantarilla, wa-voladizo, wa-mse, wa-contrafuertes, ge-platea, ge-licuacion, ge-spt,
ge-corrido, ge-portante, pe-e030-estatico, st-nave, st-casa, st-compuesta, co-voladizo, co-deflexion, jp-bsl-ruta3,
jp-bsl-ruta12, jp-madera-kaberyo, aligerado, asce7, acero, etc.). Las pruebas (`node tests/run.mjs`) siguen pasando.

## Corregido

### Bloques (afectan a muchas memorias)
- **Títulos en MAYÚSCULAS con unidades** (`.dt`, `text-transform:uppercase` de paper.css): «M [t·m]» salía «M [T·M]»,
  «÷ E⁺ = 1.81 m» salía «1.81 M», «× g = 1.2» salía «× G». Nuevos `dtx`/`fixDt` en blocks.js protegen unidades, símbolos
  y expresiones «x = valor»; se aplican a todos los bloques de geotech, bridges y analysis (envoltorio de `registerBlock`).
- **Tabla de resultados (`table`)**: las unidades del encabezado se muestran legibles («tonf*m» → «tonf·m», «m^2» → «m²», «deg» → «°»).
- **Formato `f2`** (tablas y figuras): sin notación «e» para valores pequeños (−3.52e-5 → −0.0000352) y restos |x| < 10⁻¹⁰ → 0
  (tabla de la franja de losa de br-vigalosa).
- **Viga continua (`beam`)**: M⁺/M⁻ exportados y rotulados se anulan cuando son restos de coma flotante
  (co-voladizo mostraba M_pos = 6.87×10⁻¹² tonf·m; st-correas M_neg = −3.85×10⁻¹⁵).
- **Pórtico 2D (`frame2d`)**:
  - rótulos de los diagramas N/V/M: caja centrada en la altura real del texto, los ejes de las barras son obstáculos,
    se omiten valores repetidos o casi iguales (±3 %) en el mismo nudo y los extremos secundarios en nudos ya rotulados,
    más posiciones candidatas y control de que el rótulo no salga de la figura (an-portico-ca fig. 3, an-matricial, an-modal-pdelta);
  - estados de carga: la altura del bloque de carga distribuida se limita al 40 % de la separación entre niveles
    (en pórticos de varios pisos la carga y su rótulo invadían el piso superior: an-modal-pdelta, an-portico-ca);
  - la combinación automática de un único caso se imprimía «CM_»; ahora «CM»;
  - tabla de reacciones dividida en grupos de 8 columnas y con un solo «residuo de equilibrio máx.» por combinación
    (desbordaba la hoja en st-nave, 907 px, y st-casa);
  - módulo E en la tabla de secciones con separador de miles (antes «2e7»).
- **Sección de puente (`bridgesec`)**: cotas con unidad (h, ts, bw); en el sistema US los espesores en pulgadas
  (antes «bw = 0.0417», «ts = 0.708» sin unidad, en ft); `\text{voladizo}` y `w_{\text{calzada}}` en lugar de cursiva matemática.
- **Estribo (`estribo`)**: el rótulo «cajuela» ya no tapa el apoyo; «hb = …».
- **Licuación (`liqchart`)**: los rótulos de profundidad del panel derecho se dibujaban dos veces (7 superposiciones al 100 %);
  subíndices reales (CRR<sub>M</sub>, FS<sub>L</sub>, (N₁)₆₀cs) en lugar de «CRR_M», «FS_L».
- **Perfil SPT (`soilprofile`)**: la línea de γ se reserva al pie del estrato y la descripción sube; en estratos delgados se omite
  (se superponía con «restos de ladrillo» en ge-spt). «γ=» → «γ = ».
- **Cimiento corrido (`stripfooting`)**: el texto del material iba dentro del cimiento sobre la cota hc; ahora bajo la cota B.
- **Diagramas de geotecnia (`xDiagram`)**: el rótulo del extremo izquierdo no invade los números del eje (ge-platea).
- **Bloques japoneses (`aidist`, `kaberyo`)**: las tablas que acompañan a la figura tenían marco de figura sin leyenda; ahora «Tabla N: …».

### Plantillas
- **Ecuaciones demasiado anchas** (se imprimían al 42–65 %): se separaron en términos intermedios con comentario y
  referencia, sin cambiar resultados: wa-contrafuertes (Mce, Mcw, Mcs, Vce, Vcw, Vcs), wa-voladizo (MeE, MeS, VeE, VeS),
  br-estribo (MusR, MsAE, MsIn, MusE, VusR, VsAE, VusE), br-acero (IsT, IsW, IsC; Mp1a/b, Mp2a/b, Mp3a/b),
  br-presforzada (MDx), ge-combinada (βc1, βc2 y factorización de √f'c·bo·d en φVc). Ninguna variable exportada se renombró.
- **Restos numéricos en verificaciones de coincidencia** (|a − b| = 5.55×10⁻¹⁷ ≤ 0.001): se usa `round(…, 9)` o la
  diferencia relativa redondeada (wa-coeficientes, st-armadura, an-matricial ×4).
- **ge-medianera**: `er = max(ec − Mt/P, 0)` daba 10⁻¹² con tensor; ahora `er = si(caso == 2, 0 m, ec)` (mismo valor exacto).
- **co-deflexion**: el valor de s_max ACI 24.3.2 en el texto fallaba por unidades (38·(…) − 2.5·5 cm); ahora con «38 cm», «30 cm».
- **st-compuesta**: `floor((Lv/2)/ss)` generaba un corchete alto con un trazo SVG inválido de KaTeX (errores de consola);
  ahora `floor(Lv/(2*ss))`.
- **br-alcantarilla**: encabezados «[tonf*m]» → «[tonf·m]» (vía el bloque table).
- **ge-licuacion / ge-spt**: encabezados de tabla con notación correcta ($(N_1)_{60}$, $CRR_{7.5}$, $K_\sigma$, $FS_L$, $P_L$, $N_{60}$)
  y aclaración de que CRR = 2 y FS = 3 son valores convencionales (estrato no licuable o sobre el NF).
- **wa-mse**: el título «Sismo (Evento Extremo I)» quedaba vacío (seguido de otro título del mismo nivel); se reordenó.
- **Unidades legibles**: presiones de viento y sobrecargas de techo que se mostraban en kgf/cm² (0.0028 kgf/cm²) ahora en kgf/m²
  (st-nave p0 y ph, st-casa pw, an-armadura wLr, an-nave wlr y ph, pe-e030-noestructurales Fv,t).

## Pendiente en el área (menor)
- 8 ecuaciones entre el 66 % y el 75 % al imprimir (muro Mr, pe-e020-metrado pd, co-vigat IgT, wa-gravedad Vu2, wa-mse e_be y
  tres líneas vectoriales sigH/Tmax/Pr con 5 componentes) y 22 entre el 75 % y el 90 %. Las vectoriales se resolverían mejor en el
  motor (ver abajo) o con una tabla.
- Diagramas de envolvente de pórticos grandes (an-modal-pdelta, an-portico-ca): legibles, pero densos; si se quiere más
  limpieza, dibujar solo la envolvente máxima en M y rotular solo extremos gobernantes.
- Unidades de fuerza en bloques gráficos: «t», «t·m» (práctica peruana) frente a «tonf» en las fórmulas. Es coherente dentro de
  cada elemento pero conviene unificar.
- br-vigalosa: E_s se ingresa en MPa en una memoria en kgf/cm² y E_c(f'c) se muestra en ksi; br-neopreno no tiene figura.
- Tabla de Cross (an-cross) con cifras significativas variables (0.6667, −0.07653, 0.0004795): preferir decimales fijos.
- jp-*: los términos japoneses van en romaji (correcto, no hay kanji); «AIJ Design Standard…» y «Bridge Design Specifications» son
  títulos de normas (anglicismos aceptables).

## Pendiente fuera del área
**Motor (`src/engine.js`)**
- `fmtNum` imprime restos de coma flotante (5.55×10⁻¹⁷, 1.85×10⁻¹⁶): sugerencia, anular |x| < 10⁻¹² relativo a los operandos o
  absoluto si la línea es una diferencia/verificación de coincidencia.
- La sustitución numérica muestra resultados de funciones en unidades base: `max(Asreq(M), Asmin)` → «0.000555 m» (debería ser
  cm²/m) en wa-contrafuertes y wa-sotano; `pnet_tb − 0.9 wcob` → 0.00262 kgf/cm² en pe-e020-viento; L/360 = 0.00694 m en co-voladizo.
  Sugerencia: elegir la unidad de presentación (kgf/m², cm²/m, mm) según la magnitud o la del lado izquierdo de la verificación.
- Ecuaciones con vectores largos (`\begin{bmatrix}` de 5+ componentes) no se parten: sugerencia, partir la matriz en varias filas
  o mostrar «[…] (ver tabla)» al imprimir.
- Ecuaciones inline que se cortan tras «=» (p. ej. w_t en pe-e030-estatico): la línea debería pasar a `aligned` antes.
**UI / estilos (`src/paper.css`)**
- `.dt` y `h2.hd` aplican `text-transform:uppercase`: cualquier unidad o símbolo en esos títulos cambia de significado
  (t → T, m → M, g → G). En los bloques del área ya se protegen (dtx/fixDt); conviene que paper.css no transforme `.dt` o que
  las plantillas eviten unidades en títulos de nivel 1.
**chile / masonry / dynamics** (salida de `qa-render.mjs`, sin capturas revisadas)
- dy-pushover-n2: rótulos «y1» / «y2» superpuestos en la curva de capacidad.
- dy-momcurv-col: «εcu» superpuesto con «confinado (Mander)»; «9.7760e-4» en notación e; «‰» (U+2030) puede faltar en algunas fuentes.
- dy-aislamiento: 12 valores en notación e (7.061e-8 …) en tablas de las secciones 4 y 5 (usar f2 de blocks.js o decimales fijos).
- ma-cerco: excentricidad 0.00664 m (mostrar en cm o mm).
- masonry.js estuvo temporalmente sin cargar en Node durante la revisión (edición en curso de otro agente): `qa-render.mjs`
  lo tolera extrayendo los id con una expresión regular.
