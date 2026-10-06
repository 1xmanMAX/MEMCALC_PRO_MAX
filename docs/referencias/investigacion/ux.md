# UX de software de memorias de cálculo: buenas prácticas y recomendaciones para MemoriaCalc

Investigación del 2026-10-06. Fuentes: documentación oficial y páginas de producto de PTC Mathcad Prime 10/11 (áreas
colapsables, include worksheet, bordes de región), SMath Studio, Calcpad (ayuda *Input forms*, readme VM 7.6),
ClearCalcs/Calcs.com (structural report, load linking, revisión de permisos), SkyCiv, Tekla Tedds (Tedds for Word,
Engineering Library, Data Tables), CYPE (CYPECAD y Elementos Estructurales) y CalcBook. También se revisó el código
actual de la app (`src/ui.js`).

## 1. Qué hace bien cada producto (lo transferible)

| Producto | Patrón clave | Detalle |
|---|---|---|
| **Mathcad Prime** | Hoja libre con regiones matemáticas reales y unidades en todas partes | Las **áreas colapsables** agrupan y ocultan cálculos largos. Desde Prime 10 el borde se puede ocultar, también al imprimir. **Include worksheet** reutiliza otra hoja y enlaza a una sección concreta. Se puede cambiar la unidad mostrada de un resultado con un clic en el *placeholder*. Las etiquetas distinguen variable de unidad. Hay componentes de Excel y de gráficos. |
| **SMath Studio** | Clon ligero de Mathcad | Áreas plegables y bloqueables. Unidades. **Plugins** para tablas de perfiles y materiales. Funciona sin conexión. |
| **Calcpad** | Texto plano → informe HTML profesional | **`?` convierte la hoja en un formulario de entrada.** En modo *Input Form* el código fuente no se ve: solo campos y texto. Se crean listas y radios con HTML que apuntan a un `id`. `v?`/`M?` crean tablas editables. `#hide/#show`, `#if`, `#repeat` y `#val`/`#equ`/`#noc` controlan cuánto detalle se imprime. Los archivos `.cpd`/`.cpdz` protegen el código. Exporta a Word y PDF. |
| **handcalcs / efficalc** | Fórmula simbólica → sustitución → resultado | Modos `params` (tres columnas, solo resultados), `long`, `short` y `symbolic`, y precisión por celda. efficalc añade objetos *Input*, *Assumption* y *Comparison* (verificación con D/C) e informes cortos o largos. |
| **ClearCalcs** | Calculadoras web por elemento, con revisores en mente | **Semáforo** de verificaciones. **Resumen de una página** pensado para el revisor municipal. Varios niveles de impresión. **Load linking**: la reacción de una viga se convierte en carga de la columna o zapata y se actualiza sola. En el informe cada fórmula indica qué cláusula de qué norma gobierna, y la portada lleva norma, versión y logo. |
| **SkyCiv** | Plataforma web con modelo 3D y módulos de diseño | Panel de propiedades contextual. Tabla de *utilization ratio* con barras. Informe con *pass/fail* por miembro. Documentación técnica con ejemplos de verificación publicados para cada calculadora (p. ej. zapata combinada ACI 318-14). |
| **Tekla Tedds** | Biblioteca de cálculos + documento Word | **Diálogo de entrada con esquema dibujado** (cotas rotuladas) seguido de salida a documento. **Referencias de la norma en el margen derecho** del informe. *Data Tables* con búsqueda e interpolación. Se pueden encadenar varios cálculos en un solo documento con índice. Revisiones de cálculo. API para automatizar. |
| **CYPE** | Programas por elemento | Plantillas por norma y país. **Listados de comprobación** con el artículo de la norma y "cumple / no cumple" con su aprovechamiento (%). El asistente de datos lleva la figura de cada parámetro. Genera planos de armado. |
| **CalcBook** | Calculadoras ligeras listas para entregar | Videos por calculadora con capítulos (problema → cálculo → resultado). Publica correcciones transparentes, por ejemplo la erratum sobre la presión pasiva sin Df. |

## 2. Lo que MemoriaCalc ya tiene

Según `src/ui.js`, la app ya cuenta con:
- una galería de plantillas con buscador, categorías y chips por país;
- una paleta **Ctrl K** que busca plantillas, acciones, funciones, secciones y variables;
- las pestañas Datos, Editor, Variables y Proyecto;
- **edición en el lugar** del dato sobre la vista previa: Enter, Esc, ↑/↓ para cambiar el valor y Tab para pasar al siguiente;
- la franja de verificaciones y el bloque `summary()`;
- los modos `@modo corto|completo|resultado` y `@ocultar/@mostrar`;
- portada con logo e índice;
- exportación a PDF, HTML y DOCX;
- biblioteca en IndexedDB, deshacer y rehacer, zoom, tema y un selector del sistema de unidades.

En lo esencial está a la par de Calcpad y handcalcs. Las brechas están en **flujo entre memorias, revisión, versiones
normativas, esquemas de entrada y validación**.

## 3. Recomendaciones priorizadas

Prioridades: **P0** = alto impacto y bajo esfuerzo (hacer ya), **P1** = alto impacto y esfuerzo medio,
**P2** = deseable.

### P0
1. **Versión de la norma visible y seleccionable.**
   - Cada plantilla declara su versión (`normas: 'E.030-2018'`) y la galería la muestra como insignia.
   - Las plantillas E.030 ofrecen la lista `Versión [2018|2026]`. La E.030-2026 está vigente desde el 03/05/2026 y
     su disposición transitoria permite usar la 2018 en proyectos en trámite.
   - Si se abre una memoria guardada con una norma ya modificada, se muestra un aviso no bloqueante:
     "La E.030 fue modificada por la R.M. 183-2026-VIVIENDA; esta memoria usa 2018".
   - Lo mismo para la NCh433:2026, en vigencia desde ~feb-2027, y la NCh2369:2025.
2. **Referencia normativa en el margen**, al estilo Tedds y CYPE.
   - El texto del artículo que hoy va en el comentario (`// ... (E.060 9.3)`) se separa con una regla simple: el
     paréntesis final del comentario.
   - Se imprime en una columna estrecha a la derecha: "E.060 §9.3". También en DOCX.
   - El revisor lo ve sin leer la línea completa, y el índice puede listar "artículos citados".
3. **Resumen de una página para el revisor**, al estilo ClearCalcs.
   - `summary()` ordena las verificaciones por D/C, de mayor a menor, y muestra una barra de aprovechamiento con
     color: verde < 0,9, ámbar de 0,9 a 1,0 y rojo > 1.
   - Marca la verificación **que gobierna** y repite datos clave: norma, versión, materiales y cargas.
   - Opción de imprimir solo la portada y el resumen.
4. **Esquema acotado en los datos de entrada**, al estilo Tedds, CYPE y SkyCiv.
   - Las plantillas de elementos (zapata, muro, viga, placa, puente) llevan junto a la pestaña Datos un SVG con
     cada dato rotulado con su nombre de variable (B, L, h, d, punta, talón, etc.).
   - Al enfocar un campo, se resalta la cota correspondiente.
   - Se reutilizan `dimH`/`dimV` de `blocks.js`.
5. **Validación de rango y alcance.** Rangos opcionales en los datos, por ejemplo con la sintaxis
   `fc = 210 kgf/cm^2 // f'c {175..700}`. Fuera de rango se muestra una advertencia (⚠), que no es un error.
   Advertencias de alcance normativo:
   - "Análisis estático no permitido: estructura irregular con h > 30 m (E.030 Art. 33.2)".
   - "EMDL > 5 pisos no permitido (E.030-2026)".

   Este es el tipo de mensaje que ClearCalcs y SkyCiv muestran junto al semáforo.
6. **"Ejemplo de validación" en cada plantilla.** Un botón carga los datos del ejemplo resuelto (libro o norma) y
   muestra una tabla *esperado vs. calculado*, con los valores de `videos.md` §12. Es el equivalente de los
   manuales de verificación de SOFiSTiK y SkyCiv. Genera confianza y se alimenta de los mismos
   `tests/<modulo>.test.mjs`.

### P1
7. **Enlace entre memorias**, como el *load linking* de ClearCalcs o los cálculos encadenados de Tedds.
   - Una función `ref("Viga V-101", "R1")`, o un bloque "Importar resultado", lee una variable exportada de otra
     memoria de la biblioteca (IndexedDB).
   - La memoria muestra el origen y la fecha, y avisa si el origen cambió ("dato desactualizado, recalcular").
   - Cadenas típicas: viga → columna → zapata, análisis sísmico → placa, y metrado → E.030.
8. **Revisiones y modo revisor.**
   - Una tabla de revisiones en la pestaña Proyecto: Rev., fecha, descripción, autor y revisor. Va en la portada.
   - Al guardar una revisión se toma un *snapshot* y se puede ver un **diff** de datos y resultados entre
     revisiones: qué cambió y qué verificación cambió de estado.
   - En modo revisor se pueden marcar líneas o bloques como ✓ revisado y añadir notas ancladas, que se exportan
     como comentarios en el DOCX.
9. **Áreas colapsables y bloqueo**, como Mathcad y SMath.
   - Los encabezados `##` se pueden plegar en el editor y en la vista.
   - Un bloque puede marcarse **bloqueado** (solo datos editables), lo que hace el papel del `.cpd` de Calcpad.
   - **Modo formulario:** se oculta el editor y queda solo Datos más la vista previa, para usuarios que solo
     cambian datos.
10. **Tablas pegables desde Excel o ETABS.** Los campos `area` de los bloques (`storyforces`, `modal`, `frame2d`,
    `wallplan`) aceptan texto separado por tabuladores pegado desde Excel o desde las tablas de ETABS/SAP (*Story
    Forces*, *Modal Participating Mass Ratios*). Al pegar se detectan las columnas por su encabezado. Así se cubre el
    flujo real que muestran los videos: ETABS → plantilla Excel → memoria.
11. **Estudio paramétrico.** Un bloque que varía un dato, por ejemplo `h = 40:5:80 cm`, y tabula o grafica uno o
    más resultados, y el D/C de las verificaciones. Equivale al `#for` de Calcpad o a las variables de rango de
    Mathcad. Sirve para optimizar el peralte de una zapata, el espesor de un muro o la deriva frente a R.
12. **Multielemento.** Una tabla de casos (C-1…C-12 con Pu y Mu) ejecuta la misma memoria para cada fila y genera un
    **listado de comprobación** tipo CYPE: una fila por elemento con su D/C, más un anexo con el detalle del caso
    crítico.

### P2
13. **Galería enriquecida.**
    - Miniatura de la primera página.
    - Lista de verificaciones que incluye la plantilla y el ejemplo de validación del que viene.
    - Recientes y favoritos.
    - Plantillas de la empresa, guardando una memoria como plantilla con logo y textos estándar.
    - Filtro por norma y versión.
14. **Unidad de visualización por resultado** con clic, como en Mathcad: se elige entre las unidades compatibles y
    se escribe `-> unidad` en la línea.
15. **Imágenes de norma y ábacos.** Bloques "tabla normativa" con búsqueda e interpolación, al estilo de las *Data
    Tables* de Tedds. Por ejemplo, la Tabla 4/5 de la E.030-2026 interpolando por Vs30, la Tabla 6.3 de la NCh433 y
    los factores de distribución AASHTO.
16. **Exportar a `.mcalc` y JSON de resultados** para integrarse con otras herramientas, como la API de Tedds o de
    ClearCalcs.
17. **Accesibilidad e idioma.** Etiquetas `aria` en la edición en el lugar. Las plantillas japonesas pueden llevar
    el término 日本語 entre paréntesis, por ejemplo "Ai (高さ方向分布係数)", como en los videos de ミカオ建築館.

## 4. Pautas de redacción de plantillas (lo que los videos más vistos hacen bien)

- Los videos más vistos (LixMath, FerNAN Civil, GEOCI UNT, Kestävä) usan **pasos numerados y capítulos con
  tiempos**: ① datos → ② dimensionamiento → ③ cargas amplificadas → ④ verificaciones → ⑤ acero → ⑥ detalle. Los `##`
  de cada plantilla deberían seguir esa secuencia, para que el índice sirva de guía didáctica.
- Siempre cierran con un **detalle gráfico de armado**. La plantilla debería terminar con una figura: sección con
  barras o elevación con cortes.
- Se recomienda separar **"Hipótesis y criterios"** como sección propia: φ, combinaciones, qa sísmico, κ de ATC-40,
  cómo se descarga la zapata conectada. Son los puntos donde los videos discrepan entre sí y donde se equivoca el
  revisor.
