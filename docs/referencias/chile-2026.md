# Módulo «chile»: actualización normativa 2025–2027 (NCh433:2026, NCh2369:2025, NCh432:2025)

Investigación del 2026-10-06. Archivos afectados: `src/norms/chile.js`, `src/blocks/chile.js`, `src/templates/chile.js` y
`tests/chile.test.mjs`.

## 1. Estado normativo (confirmado)

| Norma | Oficialización | Entrada en vigencia | Reemplaza a | Fuente |
|---|---|---|---|---|
| **NCh433:2026** *Diseño sísmico de edificios* | INN, aprobación técnica en marzo de 2026. **D.Ex. N° 28 MINVU**, D.O. 10-08-2026 | 6 meses después del D.O. → **≈ 10-02-2027** | NCh433.Of1996 Mod.2009 + D.S. N° 61 (2011) | [AICE](https://aice.cl/web/minvu-oficializara-la-nch4332026-para-el-diseno-sismico-de-edificios/), [Portal Innova](https://portalinnova.cl/chile-actualiza-su-norma-sismica-que-cambia-para-los-proyectos-en-desarrollo/), [ICHA](https://icha.cl/ministerio-de-vivienda-oficializa-la-nch4332026-para-el-diseno-sismico-de-edificios-no-industriales/) |
| **NCh2369:2025** *Estructuras e instalaciones industriales* | INN, 28-05-2025. **D.Ex. N° 12 MINVU**, D.O. 09-03-2026 | **10-09-2027**. El D.Ex. N° 36 (2026) amplió el plazo de 6 a 18 meses. Las solicitudes de permiso anteriores a esa fecha siguen con la NCh2369.Of2003 | NCh2369.Of2003 | [ICHA](https://icha.cl/nch23692025-minvu-aplaza-su-entrada-en-vigencia-para-el-10-de-septiembre-de-2027/), [Carey](https://www.carey.cl/minvu-aprueba-nueva-norma-chilena-de-diseno-sismico-para-estructuras-e-instalaciones-industriales) |
| **NCh432:2025** *Cargas de viento* (basada en ASCE 7-22) | Decreto MOP, D.O. 18-08-2025 | 6 meses después (≈ feb-2026) | NCh432.Of71 | [Madera21](https://www.madera21.cl/publican-nch4322025-que-actualiza-los-criterios-para-el-diseno-frente-a-cargas-de-viento/), [Colegio de Ingenieros](https://www.ingenieros.cl/consejos-de-especialidades/articulos-ingenieria-civil/nueva-actualizacion-de-la-norma-nch-432-un-hito-para-la-ingenieria-estructural-en-chile/) |

**Nota sobre la investigación previa.** `investigacion/videos.md` indica que el D.Ex. N° 12/2026 oficializó la
NCh2369:2025, y eso es correcto. Lo que no dice es que su entrada en vigencia **se aplazó al 10-09-2027**.

## 2. NCh433:2026: contenido técnico

El texto oficial **no se pudo leer** porque es de venta en el INN (ecommerce.inn.cl/nch433202688560). La fuente técnica
principal es el **proyecto prNCh433 en consulta pública** (INN, vencimiento 26-12-2022):
<https://sochige.cl/wp-content/uploads/2023/03/NCh00433-2022-043.pdf>, también en consultapublica.cl. Se leyó completo
y sus tablas se revisaron en la imagen de cada página. Las diferencias entre ese proyecto y la versión final se
contrastaron con estas fuentes públicas de 2026:
- [Seminario UANDES/AICE/ACHISINA/SOCHIGE (R&V)](https://www.ryv.cl/seminario-sobre-la-nch433-reunio-miradas-tecnicas-sobre-el-nuevo-proceso-normativo-del-diseno-sismico-de-edificios/), con exposiciones de C. Peña, M. Medalla, F. Ruz y C. Urzúa.
- [Instituto de la Construcción](https://www.iconstruccion.cl/2026/07/14/nch4332026-que-cambio-y-que-no-cambio-en-el-diseno-sismico-de-edificios/).
- [ICHA, acero conformado en frío](https://icha.cl/la-nueva-edicion-de-la-norma-chilena-de-diseno-sismico-de-edificios-nch4332026-incorpora-sistemas-constructivos-en-acero-conformado-en-frio/).
- [Centro UC de Innovación en Madera](https://madera.uc.cl/noticias/nch433-2026-que-cambia-en-el-diseno-sismico-y-que-implica-para-la-construccion-en-madera).
- [AICE](https://aice.cl/web/nch4332026-actualiza-el-diseno-sismico-de-edificios-sin-modificar-de-forma-radical-los-criterios-vigentes/).
- Paper ISSMGE 2024, *Evolución normativa para clasificación sísmica…* (Reñaca y Concón), que reproduce la Tabla 2 del proyecto.

### 2.1 Qué se mantiene (confirmado)

| Tema | Valor | Respaldo |
|---|---|---|
| Ao por zona (Tabla 6 del proyecto) | 0,20 / 0,30 / 0,40 g | prNCh433 Tabla 6. La zonificación **por comuna** cambió en algunas localidades (Instituto de la Construcción) |
| Parámetros del suelo (Tabla 7) | Idénticos a DS61 Tabla 6.3: S, To, T', n, p | prNCh433 Tabla 7. C. Urzúa (seminario 2026): «se mantienen los espectros de diseño del DS61 para suelos A–E» |
| Espectro Sa = S·Ao·α/(R\*/I), α y R\* = 1 + T\*/(0,10To + T\*/Ro) | Sin cambios | prNCh433 ec. 10–12 |
| I (Tabla 5 del proyecto) | 0,6 / 1,0 / 1,2 / 1,2 | prNCh433 |
| C = 2,75·S·Ao/(gR)·(T'/T\*)^n; Cmín = Ao·S/6g; Cmáx (Tabla 8) 0,90…0,35·S·Ao/g; f = 1,25 − 0,5q | Sin cambios | prNCh433 6.2.3 y Tabla 8 |
| Ak, torsión accidental ±0,10·b·Zk/H o ±0,05·b, CQC | Sin cambios | prNCh433 6.2.5, 6.2.8, 6.3.4 y 6.3.6 |
| Qmín = I·S·Ao·P/6g y Qmáx = I·Cmáx·P en el análisis modal | Sin cambios | prNCh433 6.3.7 |
| δu = 1,3·Sde(Tag) y Cd\* (Tabla 9) | Sin cambios | prNCh433 5.9.5 y Tabla 9 |
| Deriva en el CM 0,002h y exceso ≤ 0,001h en cualquier punto | Se mantienen como regla general | prNCh433 5.9.2 y 5.9.3. M. Medalla: «el edificio chileno de muros de H.A. tiene esencialmente los mismos requisitos» |
| Método estático: ≤ 5 pisos y ≤ 20 m; 6–15 pisos con H/T ≥ 40 m/s; cat. I–II en zona 1 | Sin cambios | prNCh433 6.2.1 |

### 2.2 Qué cambia (confirmado)

1. **Clasificación sísmica del sitio con Vs30 y Tg** (prNCh433 4.2.2–4.2.3 y Tabla 2; confirmado por F. Ruz,
   SOCHIGE, en el seminario de 2026). Ver la tabla siguiente.
2. **Sondaje de 30 m obligatorio.** Ya no se permite clasificar con información parcial «castigando un nivel», como
   hacía el DS61 (Instituto de la Construcción). Los casos especiales de 4.2.1.3 del proyecto pueden omitirlo y usar el
   Cmáx del suelo E: obras de ≤ 500 m², ≤ 2 niveles y < 8 m, y conjuntos de viviendas en terrenos < 8 000 m².
3. **Suelo F ampliado.** Incluye suelos licuables, suelos especiales, topografía irregular y, según F. Ruz, sitios con
   contrastes de rigidez importantes en los primeros 25 m. El último criterio **no está cuantificado** en las fuentes.
4. **Fallas activas.** Construir sobre ellas exige estudios adicionales.
5. **Acero conformado en frío** (NCh427/2 con AISI S400). Hay cuatro tipologías nuevas en la tabla de R (**Tabla 5**
   de la versión final): marcos de momento apernados y tres configuraciones de muros de corte. **Sus R/Ro no están
   publicados** en las fuentes abiertas.
6. **Madera, marco plataforma.** R = **6,5**, antes 5,5 (Centro UC; R&V).
7. **Deriva admisible 0,0025h** (antes 0,002h) para **estructuras de acero** y **marco plataforma de madera**. Lo dijo C.
   Peña en el seminario de 2026; el punto lo resolvió el Consejo del INN tras disenso.
8. **Separación entre edificios.** El proyecto dice «2R1/3» donde la versión 2009 decía «2R\*/3». Puede ser una
   errata del proyecto; **no se implementó**.

**Tabla 2 del proyecto (Vs30 y Tg).** El símbolo «<» indica límite exclusivo.

| Suelo | Vs30 [m/s] | Tg [s] |
|---|---|---|
| A | ≥ 900 | < 0,15 o H/V plano |
| B | ≥ 500 | < 0,30 o H/V plano |
| C | ≥ 350 | < 0,40 o H/V plano |
| D | ≥ 180 | < 1,00 |
| E | < 180 | — |

Si el sitio no cumple el límite de Tg, la clase obtenida con Vs30 **baja un nivel** (4.2.3.1). El ejemplo publicado en
C4.2.3.1 es Vs30 = 520 m/s y Tg = 0,51 s, que resulta en suelo C. Ese ejemplo está en las pruebas.

### 2.3 Qué quedó SIN confirmar (no se inventó; queda editable o documentado)

| Tema | Tratamiento en MemoriaCalc |
|---|---|
| Numeración final de artículos y tablas. Las plantillas citan la del proyecto 2022, pero la tabla de R es la Tabla 5 en la versión final y la Tabla 4 en el proyecto | Advertencia en la memoria |
| Alcance exacto de 0,0025h: ¿todo el acero o solo los marcos de momento? (ICHA habla de «marcos resistentes a momento») | Lista editable `dlim` con «por confirmar» |
| Límite absoluto 0,003h en cualquier punto (prNCh433 5.9.3). No se sabe si quedó en la versión final | Dato editable `dabs = 0.003` con advertencia |
| Ro del marco plataforma de madera (R = 6,5 confirmado) | Ro editable. La lista ofrece 7 (valor 2009) con advertencia |
| R/Ro de los sistemas de acero conformado en frío | No se incluyen en las listas |
| Cmáx para R no tabulados (5 y 6,5) | Interpolación lineal, criterio del módulo (R = 6,5 da 0,35·S·Ao/g) |
| Criterio cuantitativo de suelo F por contraste de rigidez | Solo se documenta |
| Tratamiento de un sitio D con H/V plano | Se acepta como D: Tg = 0 cumple. Criterio del módulo |
| Cambios de comunas en la zonificación (Tabla 1) | No se tabularon. La zona es dato de entrada |

## 3. Implementación

**Funciones nuevas** (`src/norms/chile.js`, categoría «Sismo — Chile»):
- `sueloVsNCh433v26(Vs30)` y `sueloNCh433v26(Vs30, Tg)`: devuelven 1..5 (A..E). Tg = 0 s representa H/V plano.
  Vs30 ≤ 0 da error explícito.
- `TgLimNCh433v26(suelo)`.
- Alias v26 con la misma implementación que la versión DS61, porque esos valores no cambiaron: `AoNCh433v26, INCh433v26,
  SNCh433v26, ToNCh433v26, TpNCh433v26, nNCh433v26, pNCh433v26, alphaNCh433v26, SaNCh433v26, RstarNCh433v26,
  CNCh433v26, CmaxNCh433v26, CminNCh433v26, fNCh433v26, AkNCh433v26, SdeNCh433v26`.

**Bloque.** `spectrumCL` tiene una opción nueva `norma: 'NCh433:2026'`. Usa el mismo espectro y cambia el subtítulo.

**Plantillas nuevas:**
- `cl-nch433-2026`, «Análisis sísmico NCh433:2026 (vigente desde 2027)». Incluye la clasificación del sitio, los
  parámetros, el método estático con Cmín/Cmáx·f, Ak, la torsión, el espectro con R\*, Qmín/Qmáx modal y las derivas
  con `dlim` y `dabs` editables. Lleva advertencias explícitas.
- `cl-nch433-comparacion`, «Comparación NCh433 + DS61 vs NCh433:2026». Usa el mismo edificio con suelo C según DS61 y
  suelo D según 2026 (Tg = 0,45 s), compara cortes, espectros y derivas escaladas. El corte aumenta en 1,20/1,05 = 1,143.

**Plantillas existentes.** Se agregaron notas de «Vigencia»:
- `cl-nch433-estatico` y `cl-nch433-modal`: NCh433+DS61 rige hasta la vigencia de la 2026.
- `cl-nch2369`: la 2025 entra en vigencia el 10-09-2027.
- `cl-viento-galpon`: la NCh432:2025 es oficial; sus mapas y velocidades no están implementados.
- `cl-muro-ds60`: δu no cambia con la versión 2026.

**Pruebas.** `tests/chile.test.mjs` tiene 36 pruebas nuevas, con 174 correctas en total. Cubren:
- La Tabla 2 en sus bordes y el ejemplo publicado C4.2.3.1.
- La igualdad de las funciones v26 con las DS61.
- Qox de la plantilla 2026, que debe ser igual al de la plantilla DS61 cuando el suelo es el mismo.
- Los cortes de la comparación contra cálculo manual.
- Tres casos de datos extremos que dan NO CUMPLE sin errores ni NaN.

## 4. NCh2369:2025 y NCh432:2025

- **NCh2369:2025.** El módulo ya implementa el texto de la consulta pública acotada **NCh2369:2023**: espectros
  horizontal y vertical, I y Cmín (ver `chile.md`). No se encontró una fuente abierta que diga si el texto final 2025
  difiere en S, T0, p, R/ξ o en las ecuaciones 1–4. **Pendiente** confirmarlo con la norma oficial. Las funciones
  conservan el sufijo `v23`.
- **NCh432:2025.** Las fuentes abiertas (Colegio de Ingenieros, Madera21, programa del curso SDA de C. Peña) solo
  describen los cambios:
  - Nueva zonificación hecha por climatólogos con 36 estaciones.
  - Nuevas velocidades básicas.
  - Alineación con ASCE 7-22 y EN 1991-1-4.
  - Método simplificado para construcciones pequeñas.
  - Estudios de viento para proyectos complejos.

  **No se publican** velocidades, factores ni fórmulas, así que **no se implementó** nada nuevo. Las funciones
  `KzNCh432`/`qzNCh432` siguen el procedimiento 2010 (ASCE 7-05) y la plantilla lo advierte.

## 5. Fuentes no accesibles

- Texto oficial NCh433:2026: venta en el INN.
- Catálogo CChC (22951-2.pdf): HTTP 403.
- madera.uc.cl desde curl: 403. Se leyó con WebFetch.
- Video del Colegio de Ingenieros (RCerVDCGXd4, 1-sep-2026): no tiene descripción ni capítulos, y la transcripción
  está bloqueada.
