# Prueba de usabilidad — usuario nuevo (ingeniero civil recién egresado)

Fecha: 2026-10-06 · Build: `node build.mjs` → `dist/MemoriaCalc.html` · Playwright + Chromium, 1400×900 y 390×844 (táctil).
Método: tareas reales con clics y tecleo (sin inyectar código; solo se anuló `showSaveFilePicker` para poder
capturar la descarga en modo headless, y `window.print` para no abrir el diálogo). `docs/DESARROLLO.md` se leyó
**después** de las tareas. Capturas: `scratchpad/ux4-*.png` (`ux4-t*` / `ux4-m-*` = antes; `ux4-after-*` = después).

Escala de gravedad: **Alta** (bloquea o lleva a error técnico), **Media** (confunde o cuesta pasos), **Baja** (pulido).

## Impresión general

La app es muy descubrible: la pantalla de Inicio explica qué es en 3 pasos, el recorrido guiado (7 pasos) es
breve y acertado, la plantilla de zapata se encuentra en un clic, el D/C se actualiza al instante y la exportación
(PDF / Word / HTML / .mcalc) es evidente. Sin leer la documentación logré las 5 tareas. Las fricciones se
concentran en **escribir cálculos desde cero** (editor) y en **bloques de análisis con muchos campos**.

## Tareas y resultado

| # | Tarea | Resultado | Tiempo/pasos |
|---|-------|-----------|--------------|
| 1 | Abrir, entender, zapata aislada, cambiar PD, ver D/C, exportar Word y PDF | Completada sin ayuda | ~6 clics |
| 2 | Documento en blanco: viga simplemente apoyada, Mu, As (E.060), check, viga continua, sección | Completada; hubo que adivinar los argumentos de `asFlex` | ~15 líneas |
| 3 | Pórtico 2D 1 vano/1 piso con carga lateral y uso de resultados | Completada (el bloque trae ese pórtico por defecto); `deriva_1` no existía | — |
| 4 | Buscar función de espectro E.030 e insertarla | Completada; el primer resultado era el Eurocódigo | 3 pasos |
| 5 | Guardar/reabrir .mcalc, deshacer/rehacer, móvil 390×844 | Completada; Ctrl+Z dentro de un dato no hacía nada | — |

## Fricciones encontradas

| # | Fricción | Dónde | Gravedad | Estado |
|---|----------|-------|----------|--------|
| F1 | Sin ayuda de parámetros: al escribir `asFlex(` no se sabe qué argumentos ni en qué orden (hay que ir a la biblioteca o a la documentación) | Editor | **Alta** | Corregida |
| F2 | El autocompletado inserta `asFlex(`; quien escribe `(` por costumbre obtiene `asFlex((` y un error | Editor | Media | Corregida |
| F3 | Errores rojos a media palabra: al teclear `As` o `Mm` aparece «Variable no definida…» o un mensaje largo sobre unidades antes de terminar la línea | Editor | Media | Corregida (en el panel; ver P1) |
| F4 | Mensaje con jerga interna: «math.js la interpretaría como una unidad» | Editor / hoja | Media | Corregida en el editor; queda en la hoja (P1) |
| F5 | Al insertar un bloque gráfico (viga continua, sección, pórtico) la vista previa se queda en la portada: no se ve el resultado | Vista previa | **Alta** | Corregida |
| F6 | Pórtico 2D: 13 campos de opciones avanzadas (peso propio, derivas, L/…, zonas rígidas…) aparecen **antes** que nudos/barras/cargas | Bloque frame2d | Media | Corregida (agrupación genérica) |
| F7 | Ejemplos grises (`360`, `CS`, `0.75*8`, `0.007`, `3`) parecen valores ya cargados; uno cree que se verifican derivas | Campos de bloques | Media | Mitigada (estilo cursiva/atenuado); ver P3 |
| F8 | Barra de estado incorrecta: con un `check` que falla por error mostraba «1 verificaciones cumplen · D/C 0.00» | Barra de estado | Media | Corregida |
| F9 | Biblioteca de funciones: al buscar «espectro» el primer resultado era EN 1998 (Eurocódigo) y había dos categorías «Sismo — Perú» y «Sismo — Perú (E.030)» | Biblioteca | Media | Corregida |
| F10 | Ctrl+Z con el foco en un dato de la pestaña Datos no hacía nada (el valor se aplica al instante pero el deshacer nativo del campo está vacío) | Deshacer | Media | Corregida |
| F11 | El icono de carpeta abre «Mis memorias», que no tenía «Abrir archivo» ni «Guardar»; abrir un .mcalc solo estaba en Inicio, menú «Más» o Ctrl+O | Mis memorias | Media | Corregida |
| F12 | Eliminar una memoria en «Mis memorias» era inmediato, sin confirmación ni deshacer (pérdida de datos con un clic) | Mis memorias | **Alta** | Corregida (toast con «Deshacer») |
| F13 | Esc no cerraba el selector de bloques si el foco no estaba en su buscador (en móvil nunca lo está); en móvil tapa la barra inferior | Selector de bloques | Baja | Corregida (Esc global) |
| F14 | Zapata: duplicar PD solo sube el D/C de 0.97 a 0.99 porque B y L se redimensionan solos; no se explica junto a los datos | Plantilla zapata | Baja | Pendiente (P4) |
| F15 | La hoja muestra `A_s = A_s(M_u, b, d, f'c, f_y)`: el símbolo de la función es igual al de la variable | Render de funciones | Baja | Pendiente (P2) |
| F16 | `check deriva_1 <= 0.007` da «Variable no definida» sin pista de que hay que llenar «Caso/combinación para derivas» | frame2d / motor | Media | Pendiente (P3) |
| F17 | Autocompletado de `As` propone primero `AseACI` (ACI) antes que `asFlex` (E.060) | Editor | Baja | Pendiente |
| F18 | Sintaxis útil oculta: rangos `[175..420]`, listas `[a|b]`, `@modo`. Solo está en Ayuda (F1)/DESARROLLO; nada lo sugiere al escribir un dato | Editor | Baja | Pendiente |
| F19 | Insertar una función desde la biblioteca deja los argumentos de ejemplo (`T, Z, U…`) y un error inmediato (el toast lo explica) | Biblioteca | Baja | Pendiente |
| F20 | DESARROLLO advierte no usar `b` (unidad) como variable, pero la app no avisa nada al escribir `b = 30 cm` | Motor | Baja | Pendiente (P5) |

## Correcciones aplicadas (solo `src/ui.js` y `src/style.css`)

1. **Ayuda de parámetros** (F1): con el cursor dentro de `f( … )` aparece una ficha sobre la línea con la firma,
   el argumento actual resaltado y la descripción (`asFlex(Mu, b, d, fc, fy, [φ]) — As requerido…`). Usa
   `FN_DOCS`/`BUILTIN_FNS`; se actualiza al escribir, con flechas o clic; se cierra con Esc, al desplazar o al
   salir del editor. No se imprime.
2. **Paréntesis duplicado** (F2): si tras aceptar una función del autocompletado se escribe `(`, se ignora.
3. **Errores diferidos en la línea en curso** (F3): el error de la línea donde está el cursor (texto rojo bajo el
   bloque y resaltado de la línea) espera ~1.1 s sin teclear; los demás errores se muestran como antes.
4. **Mensaje sin jerga** (F4): en el panel del editor «math.js la interpretaría como una unidad» → «se
   confundiría con una unidad».
5. **La vista previa sigue al bloque insertado** (F5): `insertBlock` usa el mecanismo `follow` existente.
6. **Opciones avanzadas plegables** (F6): regla genérica en el render de campos: si un bloque tiene ≥3 áreas de
   texto y ≥6 campos de texto, primero van los desplegables y el modelo (áreas) y los campos de texto quedan en
   «Opciones de análisis · N campos · k con valor» (plegable, recuerda su estado). Hoy afecta a frame2d y a bloques
   con forma similar; el `titulo` sigue al final.
7. **Ejemplos visualmente distintos** (F7): placeholders de los campos de bloque en cursiva y atenuados.
8. **Barra de estado correcta** (F8): «1 de 1 no cumple», «2 de 3 cumplen · 1 sin verificar», singular/plural.
9. **Biblioteca de funciones** (F9): se fusiona «X (…)» con «X» cuando ambas existen; al buscar, las categorías
   del país elegido en Inicio (`mc_hpais`, Perú por defecto) van primero → «espectro» muestra `SaE030` primero.
10. **Ctrl+Z / Ctrl+Y en la pestaña Datos** (F10) deshacen/rehacen en la memoria.
11. **Mis memorias** (F11, F12): botones «Abrir archivo .mcalc…» y «Guardar la memoria actual (.mcalc)»; borrar
    muestra un toast con «Deshacer» que restaura la memoria; texto aclara «solo en este navegador».
12. **Esc** cierra cualquier menú/selector abierto (F13).

Verificación: 0 `pageerror` y 0 errores de consola en todas las tareas (escritorio y móvil);
`node tests/run.mjs` → todas las pruebas correctas.

## Pendiente fuera de mi área (para otros agentes)

- **P1 — `engine.js`/`docrun.js`**: el mensaje ««X» no está definida como variable y math.js la interpretaría como
  una unidad…» sigue saliendo en la hoja (recuadro amarillo). Reemplazar por «… y se confundiría con la unidad
  «m»; defínala antes o use otro nombre». Además, mientras se teclea, la hoja también muestra el error de la línea
  en curso (el panel ya lo difiere); docrun podría recibir una línea «en edición» para no pintarla.
- **P2 — `norms/concrete.js` (tex de `asFlex`)**: `tex: T1('A_{s}')` hace que la hoja muestre
  `A_s = A_s(M_u, …)`. Sugerido `A_{s,req}` o el nombre `\operatorname{asFlex}`; revisar el resto de funciones
  cuyo tex coincide con el nombre típico de la variable de destino.
- **P3 — `blocks/analysis.js` (frame2d y similares)**: los `ph` mezclan *valor por defecto* (`deriva_lim`
  0.007, que se usa si está vacío) con *ejemplo* (`deriva_caso` CS, `deflim` 360, que no se aplican). Separar
  `def` (se muestra «por defecto: 0.007») de `ph` («p. ej. CS»). Además, cuando una variable exportada no existe
  porque falta activar la opción (p. ej. `deriva_1` sin «Caso/combinación para derivas»), el motor podría sugerir
  «¿Activó las derivas en el bloque Pórtico 2D?» (lista de exportaciones condicionales por bloque).
- **P4 — `templates` (zapata)**: indicar junto a los datos que B y L se dimensionan automáticamente, o mostrar
  B×L calculados en el resumen de Datos; si no, el usuario espera que el D/C crezca con la carga.
- **P5 — `engine.js`**: avisar (advertencia, no error) cuando una variable tapa una unidad usada después
  (`b`, `s`, `m`, `t`, `g`, `N`…), como recomienda DESARROLLO.md.
- **Autocompletado por país** (F17, en `ui.js`, menor): ordenar funciones normativas del país elegido primero.

## Qué tan intuitiva es (tras leer DESARROLLO.md)

Todo lo necesario para las 5 tareas se descubrió sin documentación, salvo: argumentos de funciones normativas
(ahora resuelto con la ayuda de parámetros), la sintaxis de rangos/listas en comentarios (F18) y qué variables
exporta cada bloque (está en «Ayuda: formato y resultados exportados» del bloque y en la pestaña Variables, que
sí lo muestran bien; el autocompletado también las ofrece).
