# Biblioteca de normas — Perú (RNE, estructuras)

Texto completo y literal de las normas técnicas del Reglamento Nacional de Edificaciones (RNE)
del área estructural, en `src/data/normas/pe-*.json` (un archivo por norma, formato de
`_ejemplo.json.txt`). `node tools/pack-normas.mjs` los empaqueta en `src/data/normas.pack.js`.

**Licencia:** son normas legales publicadas oficialmente por el Estado peruano (El Peruano,
gob.pe, MVCS y SENCICO). El D. Leg. 822, Art. 9, excluye de la protección del derecho de autor a
las disposiciones legales y reglamentarias. La leyenda «Derechos reservados» de las ediciones
digitales del SENCICO cubre la edición, no el texto normativo.

## Normas incluidas (versión vigente a octubre de 2026)

| Archivo | Norma | Versión | Secciones | JSON |
|---|---|---|---|---|
| pe-e010.json | E.010 Madera | DS 011-2006-VIVIENDA, Anexo 3 modificado por DS 005-2014-VIVIENDA. No hay versión 2021 aprobada: la RM 240-2021-VIVIENDA solo publicó el proyecto. | 135 | 152 KB |
| pe-e020.json | E.020 Cargas | DS 011-2006-VIVIENDA | 51 | 44 KB |
| pe-e030.json | E.030 Diseño Sismorresistente | RM 183-2026-VIVIENDA (texto completo de 2026, precedido de la RM) | 95 | 260 KB |
| pe-e031.json | E.031 Aislamiento Sísmico | DS 030-2019-VIVIENDA (incluye el texto del DS) | 57 | 129 KB |
| pe-e040.json | E.040 Vidrio | RM 139-2025-VIVIENDA (norma y anexos, con el texto de la RM) | 28 | 155 KB |
| pe-e050.json | E.050 Suelos y Cimentaciones | RM 406-2018-VIVIENDA (incluye el texto de la RM) | 120 | 180 KB |
| pe-e060.json | E.060 Concreto Armado | DS 010-2009-VIVIENDA, con los Anexos I y II (incluye el texto del DS) | 386 | 583 KB |
| pe-e070.json | E.070 Albañilería | DS 011-2006-VIVIENDA, con el índice de fórmulas | 50 | 118 KB |
| pe-e080.json | E.080 Diseño y construcción con tierra reforzada | RM 121-2017-VIVIENDA, Anexos 1 a 6 y la fe de erratas del 20-4-2017 | 40 | 69 KB |
| pe-e090.json | E.090 Estructuras Metálicas | DS 011-2006-VIVIENDA, con los símbolos y los Apéndices 2, 5, 6 y 10 | 226 | 368 KB |
| pe-a010.json | A.010 Condiciones Generales de Diseño, **solo el Cap. V** (escaleras, ascensores, aberturas) | RM 191-2021-VIVIENDA | 17 | 23 KB |

El paquete completo pesa 1965 KB de texto y ocupa 682 KB comprimido (11 documentos). La G.050 no se incluyó, como se pidió.

### Fuentes (URL oficiales)

- **Índice del RNE (MVCS):** https://www.gob.pe/institucion/vivienda/informes-publicaciones/2309793-reglamento-nacional-de-edificaciones-rne
- **Normas del RNE (SENCICO):** https://www.gob.pe/institucion/sencico/informes-publicaciones/887225-normas-del-reglamento-nacional-de-edificaciones-rne
  - Desde esta página se enlazan las ediciones digitales en Google Drive.
- **E.010:** edición digital del SENCICO (https://drive.google.com/file/d/1g8gduNJSHHRkBp0Ls08sC8pk4Sizucav/view).
  - En el PDF del MVCS (`.../2366639/49 E.010 MADERA DS N° 005-2014.pdf`), las páginas 55 a 71 son imagen: se pierden el resto del Art. 12 y los anexos.
- **E.020:** https://cdn.www.gob.pe/uploads/document/file/2366640/50%20E.020%20CARGAS.pdf
- **E.030:**
  - Norma: https://cdn.www.gob.pe/uploads/document/file/9902957/8081915-nt-e-030-diseno-sismorresistente-2026.pdf
  - RM: https://cdn.www.gob.pe/uploads/document/file/9902956/8081915-rm-183-2026-vivienda-modifica-norma-tecnica-e-030.pdf
  - Ficha de la RM: https://www.gob.pe/institucion/vivienda/normas-legales/8081915-183-2026-vivienda
- **E.031:** edición digital del SENCICO (https://drive.google.com/file/d/1IZ22Z1h3jfZpp4GKdsLLFQ1FIVSUVUso/view).
  - El DS en gob.pe (https://cdn.www.gob.pe/uploads/document/file/421564/DS_030-2019-VIVIENDA.pdf) está escaneado, sin texto.
  - El archivo «52 E.031» del índice del MVCS contiene en realidad la E.040-2006.
- **E.040:**
  - Ficha de la RM: https://www.gob.pe/institucion/vivienda/normas-legales/6803614-139-2025-vivienda
  - Norma: https://cdn.www.gob.pe/uploads/document/file/8119377/6803614-norma-tecnica-e040-vidrio.pdf
  - Anexos: https://cdn.www.gob.pe/uploads/document/file/8119378/6803614-anexos-nt-e040_vidrio.pdf
  - El archivo «53 E.040» del índice del MVCS repite el PDF de la E.040-2006 (el mismo de «52»).
- **E.050:** edición digital del SENCICO (https://drive.google.com/file/d/1XdLUkwUqDXsuIQgSbFsJ-J9BTt4u3Hp5/view).
  - La separata de El Peruano (`.../2366655/54 E.050 ...`) incluye además la EM.020.
  - En esa separata, las fuentes de las ecuaciones no se pueden leer como texto (caracteres siríacos o tamiles).
- **E.060:** edición digital del SENCICO (https://drive.google.com/file/d/19EYUVMgwvm6rDs47GV374avco2ylU5Kz/view).
  - En el PDF del MVCS (`.../2366660/55 E.060 ...`) hay renglones enteros y los símbolos φ y εcu insertados como imagen. Ejemplo: en 10.3.2 falta «utilizable εcu de 0,003. Este criterio es general…».
- **E.070:** https://cdn.www.gob.pe/uploads/document/file/2366661/56%20E.070%20ALBA%C3%91ILERIA.pdf
  - Se usa el texto del MVCS porque la edición del SENCICO **renumera** los artículos (p. ej. el Art. 31.3 pasa a 9.3.3) y las memorias citan la numeración oficial.
- **E.080:** separata especial de El Peruano del 7-4-2017 con la fe de erratas, enlazada por el SENCICO (https://drive.google.com/file/d/1qwhciKqJ8todPjE8OcwEAvSpy_Btq-Qr/view).
  - Ficha de la RM: https://www.gob.pe/institucion/vivienda/normas-legales/12310-121-2017-vivienda
  - El PDF del MVCS está escaneado, sin texto.
- **E.090:** https://cdn.www.gob.pe/uploads/document/file/2366673/58%20E.090%20ESTRUCTURAS%20METALICAS.pdf
- **A.010:** https://cdn.www.gob.pe/uploads/document/file/2366528/35%20A.010%20CONDICIONES%20GENERALES%20DE%20DISE%C3%91O%20-%20RM%20N%C2%B0%20191-2021-VIVIENDA.pdf

## Convenciones del texto

- **Secciones:**
  - Las normas por artículos (E.020, E.030, E.031, E.040, E.050, E.070, E.080 y A.010) usan:
    - `Cap. I` (nivel 1);
    - `Art. 28` (nivel 2);
    - numerales con título, p. ej. `14.2.1` (nivel 3 o 4).
  - Las normas por numerales (E.060 y E.090) usan:
    - `Cap. 9` (nivel 1);
    - `9.3` (nivel 2);
    - `9.3.2` (nivel 3).
  - Solo los numerales **con título** abren sección. Los párrafos numerados (p. ej. 9.3.2.1 de la E.060) quedan en el texto de su sección.
  - Los anexos usan `Anexo I` o `Anexo 3`. Sus numerales llevan prefijo (`Anexo 6 – 6.2`, `Apéndice 6.3`).
  - Los dispositivos de aprobación van como primera sección (`RM 183-2026-VIVIENDA`, `DS 010-2009-VIVIENDA`…).
- **Particularidades de numeración:**
  - E.010: el Capítulo 1 y sus comentarios usan el prefijo `Cap. 1 …`, porque en el Capítulo 2 la numeración de artículos vuelve a empezar.
  - E.030: los subcapítulos se identifican como `Cap. IV Subcap. 1`.
- **Párrafos:** una línea por párrafo. Las líneas cortadas se unen y se quitan los guiones de corte de palabra.
- **Listas:** se conservan con su viñeta o literal (`a)`, `(b)`, `-`, `•`, `●`).
- **Tablas y ecuaciones:** las tablas multicolumna y las ecuaciones compuestas se guardan como bloques de líneas que empiezan por `| `, con el alineamiento de `pdftotext -layout`. Conviene verlas en una fuente monoespaciada.
- **Marcas añadidas** (lo único que no es texto del original):
  - `[Figura/tabla en imagen en el original: ver fuente]`: la página tiene figuras raster sin texto. La marca va tras la leyenda «Figura…» o al final de la página.
  - `[Nota de extracción: … expresiones matemáticas …]`: secciones de la E.030-2026 con ecuaciones de Word cuyos subíndices o barras no están en la capa de texto, p. ej. 𝐹 = 𝑎/𝑔·𝐶·𝑃 por F = (ai/g)·C1·Pe.
  - `[símbolo no reconocido]`: un glifo de la fuente Symbol sin equivalente; aparece una sola vez, en la E.050.
- **Encabezados y pies quitados:**
  - números de página;
  - encabezados repetidos («N.T.E. E.060 CONCRETO ARMADO», «El Peruano / … NORMAS LEGALES n», códigos «1506719-1»);
  - sellos de firma digital («Firmado digitalmente…», «Motivo: Doy V° B°»);
  - en la E.090, las etiquetas de margen «[Cap. n» y «Secc. n.n]» que el PDF intercala en el texto.
- **Caracteres:**
  - las ligaduras (ﬁ, ﬂ) se normalizan;
  - los glifos de la fuente Symbol en la zona privada (U+F0xx) se convierten a su carácter: φ, ε, ≤, ≥, ′, ×, √ y las piezas de corchete ⎛⎜⎝.
  - En la A.010, dos leyendas de figuras con codificación desplazada de El Peruano se decodifican, p. ej. «(6&$/(5$6 0,;7$6» → «ESCALERAS MIXTAS».

## Verificación

Script propio, con PDF y scripts en el scratchpad y sin ejecutar nada de los directorios descargados:

1. **Conteo global por página:** se comparan las palabras de cada página extraídas con `pdftotext` sin `-layout` (extracción independiente) con las palabras del JSON, más las de encabezados y pies quitados.
2. **Muestreo de 15 secciones por norma** (14 en la A.010):
   - (a) proporción de palabras del JSON que existen en las páginas del PDF que abarca la sección;
   - (b) trozos de 8 palabras consecutivas del JSON hallados literalmente en el PDF.

| Norma | Palabras PDF | No halladas en el JSON | Muestreo (a) mín. | Muestreo (b) |
|---|---|---|---|---|
| E.010 | 21 579 | 5 (0,02 %) | 98 % | 362/405 |
| E.020 | 5 386 | 1 | 96 % | 193/239 |
| E.030 | 20 433 | 0 | 94 % | 267/301 |
| E.031 | 17 649 | 14 (0,08 %) | 98 % | 547/655 |
| E.040 | 29 375 | 5 | 83 % | 796/877 |
| E.050 | 26 143 | 1 | 98 % | 281/325 |
| E.060 | 90 030 | 7 | 100 % | 619/825 |
| E.070 | 16 177 | 2 | 100 % | 492/619 |
| E.080 | 10 756 | 3 | 85 % | 537/687 |
| E.090 | 52 267 | 7 | 100 % | 337/411 |
| A.010 (Cap. V) | 5 239 de las págs. 8–19 | 472, todas de los capítulos IV y VI de las páginas límite | 90 % | 308/417 |

- **Por qué hay palabras «no halladas»:**
  - el extractor sin `-layout` une palabras partidas o celdas vecinas («zinccoated», «amortiguaplomo», «2019vivienda»);
  - algunas palabras de portada quedan fuera del rango, p. ej. «070» de «NORMA E.070».
  - No se detectó ningún renglón de prosa perdido.
- **Por qué (a) baja de 100 %:** las marcas añadidas (`[Figura…]`, `[Nota…]`) y las leyendas decodificadas no existen en el PDF.
- **Por qué (b) no es 100 %:** en tablas y ecuaciones, el orden de lectura de `-layout` difiere del de la extracción sin layout. La prosa coincide literalmente.

## Problemas conocidos

- **Ecuaciones:** son objetos de ecuación de Word en E.020, E.070, E.090 y E.060, y de MathType u Office en la E.030-2026.
  - El texto sale en bloques `|` con las fracciones en 2 o 3 líneas.
  - En la E.070 (PDF del MVCS) quedan intercaladas en la prosa. Ejemplo: «( Vui , M ui )».
  - En la E.030 se pierden subíndices (se señala en cada sección).
- **Figuras raster:** quedan señaladas, sin descripción. Afecta, entre otros, a:
  - los ábacos de los Anexos I y II de la E.040;
  - el mapa eólico (Anexo 2 de la E.020);
  - las figuras de la E.050 y la E.080.
  - El mapa de zonificación de la E.030 tampoco tiene texto, pero la tabla de distritos del Anexo II sí está completa como texto.
- **Figuras vectoriales:** sus rótulos sueltos aparecen como texto o en bloques `|`.
- **Tablas complejas:** las de celdas largas, como la Tabla N° 8 de la E.030 o la Tabla 4.2 de la E.060, alternan líneas `|` y párrafos. El contenido está completo, pero hay que leerlas con cuidado.
- **Títulos sin sección propia:** algunos numerales con título no se detectaron como sección, porque el título era largo o empezaba con artículo. Su texto está dentro de la sección superior, sin pérdida.
- **Fe de erratas de la E.080:** está al final, no integrada en el articulado.
- **Para regenerar:** los scripts de extracción (`normlib.py`, `seg.py` y uno por norma) quedaron en el scratchpad de la sesión del 9-10-2026 y no se versionaron. Si hay que regenerar:
  1. descargar los PDF de las URL anteriores;
  2. pasarlos por `pdftotext -layout`;
  3. aplicar las reglas descritas.
