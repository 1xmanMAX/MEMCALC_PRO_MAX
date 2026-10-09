# Biblioteca de normas: Chile, Japón, EE. UU., Europa y otros

Documentos de `src/data/normas/{cl,jp,us,eu,int}-*.json`, empaquetados con `node tools/pack-normas.mjs`. Recopilados el 2026-10-09.

**Criterio legal.** Se incluye el texto completo (`tipo: "texto"`) solo de leyes y reglamentos oficiales, que son de dominio público o de uso expresamente permitido. Las normas técnicas con derechos de autor se incluyen como índice (`tipo: "indice"`): número y título oficial, sin texto, y el enlace a la fuente oficial. El campo `licencia` de cada JSON detalla el motivo.

| Archivo | Documento (id) | Tipo | Versión | Fuente | Motivo legal |
|---|---|---|---|---|---|
| cl-ds61.json | DS 61 (V. y U.) 2011, diseño sísmico de edificios (`DS61`) | texto | DO 13-12-2011, versión única | https://www.bcn.cl/leychile/navegar?idNorma=1034101 | Decreto supremo publicado en el Diario Oficial; texto de LeyChile (BCN, CC BY-SA 3.0 CL) |
| cl-ds60.json | DS 60 (V. y U.) 2011, hormigón armado (`DS60`) | texto | DO 13-12-2011, versión única | https://www.bcn.cl/leychile/navegar?idNorma=1034100 | Ídem. Solo se transcriben las adecuaciones del decreto, no el texto del ACI 318S-08 |
| cl-nch433.json | NCh433 Diseño sísmico de edificios | índice | Of1996 Mod. 2009 + DS 61 (índice de la ed. Mod. 2012) | https://www.inn.cl/ | Norma INN con derechos de autor |
| cl-nch2369.json | NCh2369 Estructuras e instalaciones industriales | índice (mínimo) | Of2003; :2025 rige desde el 10-09-2027 | https://www.inn.cl/ | Norma INN; índice no verificado contra la fuente oficial, por eso no se listan capítulos |
| cl-nch430.json | NCh430 Hormigón armado | índice (mínimo) | Of2008 | https://www.inn.cl/ | Ídem |
| cl-nch432.json | NCh432 Cargas de viento | índice (mínimo) | :2025 (reemplaza Of1971) | https://www.inn.cl/ | Ídem |
| cl-nch3171.json | NCh3171 Disposiciones generales y combinaciones de carga | índice (mínimo) | edición oficializada por D. Ex. 54/2024 (reemplaza :2010) | https://www.inn.cl/ | Ídem |
| jp-bsl.json | Building Standards Act, Ley 201 de 1950, caps. I–II en inglés (`BSL`) | texto | Traducción JLT (tentativa) de la versión de 2020 (Ley 43 de 2020) | https://www.japaneselawtranslation.go.jp/en/laws/view/4024 | Public Data License 1.0 (Ministerio de Justicia), con cita de la fuente; las leyes no tienen derecho de autor (Art. 13) |
| jp-bsl-ja.json | 建築基準法, caps. 1–2, texto oficial japonés (`建築基準法`) | texto | Vigente en e-Gov (reforma 令和8年法律第23号, 27-05-2026) | https://laws.e-gov.go.jp/law/325AC0000000201 | Ley oficial; 著作権法 第13条 |
| jp-enforcement-order.json | 建築基準法施行令, Orden 338 de 1950, cap. III Arts. 36–106 (`Enforcement Order`) | texto | Vigente en e-Gov (reforma 令和7年政令第377号, 01-12-2025) | https://laws.e-gov.go.jp/law/325CO0000000338 | Orden de gabinete; 著作権法 第13条. No hay traducción oficial al inglés |
| jp-mlit-notificaciones.json | Notificaciones 告示 1791, 1792, 1793, 594, 593, 1461, 1457, 1459, 1454, 1455, 1347, 1113, 2464, 1450, 1024, 1352, 1100 (`Notif. MLIT`) | índice | Títulos oficiales | https://www.mlit.go.jp/notice/ | Libres de derecho de autor (Art. 13), pero llenas de tablas y figuras: por ahora solo índice y enlace |
| us-aci318.json | ACI 318-19 | índice | 318-19 | https://www.concrete.org/store/ | © ACI |
| us-aisc360.json | ANSI/AISC 360-22 | índice | 360-22 | https://www.aisc.org/publications/steel-standards/ | © AISC (descarga gratuita, pero sin permiso de redistribución) |
| us-asce7.json | ASCE/SEI 7-22, caps. 11–12 | índice | 7-22 | https://www.asce.org/publications-and-news/asce-7 | © ASCE |
| us-aashto-lrfd.json | AASHTO LRFD BDS 9.ª ed., secciones 1–15 (detalle de 3, 4, 5, 11 y 14) | índice | 9.ª ed. (2020) | https://store.transportation.org/ | © AASHTO |
| us-aci350-3.json | ACI 350.3-06 | índice | 350.3-06 (la vigente es la -20) | https://www.concrete.org/store/ | © ACI |
| us-aci440-2r.json | ACI 440.2R-17 | índice | 440.2R-17 | https://www.concrete.org/store/ | © ACI |
| us-aisi-s100.json | AISI S100-16 | índice | S100-16 (2020) | https://www.steel.org/ | © AISI |
| eu-en1992.json | EN 1992-1-1, Eurocódigo 2 | índice | :2004 + A1:2014 | https://eurocodes.jrc.ec.europa.eu/ | © CEN / organismos nacionales |
| eu-en1998.json | EN 1998-1, Eurocódigo 8 | índice | :2004 + A1:2013 | https://eurocodes.jrc.ec.europa.eu/ | © CEN / organismos nacionales |
| int-mtc-puentes.json | Manual de Puentes MC-04-16, MTC Perú (`Manual de Puentes MTC`, país PE) | índice | RD N.º 19-2018-MTC/14 (27-12-2018) | https://portal.mtc.gob.pe/transportes/caminos/normas_carreteras/manuales.html | Es de libre uso (documento oficial; D. Leg. 822, Art. 9). Se deja como índice porque el PDF oficial está escaneado: 631 páginas sin capa de texto y llenas de fórmulas y tablas, así que no se puede garantizar un texto literal |

## Procedimiento y verificación

- **DS 61 y DS 60.** Texto tomado del servicio HTML de LeyChile (`get_norma_json`). La versión XML (`obtxml`) corta el texto que sigue a cada imagen.
  - LeyChile publica como imágenes JPG del Diario Oficial: en el DS 61, las fórmulas y tablas de los Arts. 5, 6, 9, 12, 13 y 15; en el DS 60, todo el artículo 3º.
  - Las imágenes del DS 60 suman unos 19 500 px de alto: es la tabla CÓDIGO/COMENTARIO con las adecuaciones a los capítulos 1–5, 7–9, 12, 21 y al Anexo A.
  - Todas se transcribieron leyendo cada imagen y se contrastaron palabra por palabra con OCR (tesseract, spa). No hay omisiones.
  - Se restituyeron los símbolos que el HTML perdió: δu, εqu y α.
  - Los epígrafes de los artículos sin título oficial son descriptivos.
- **BSL en inglés.** Extraído de la vista bilingüe de JLT, solo las oraciones en inglés. El texto de los capítulos I–II coincide carácter a carácter con la fuente (128 017 caracteres alfanuméricos).
- **BSL y Orden 338 en japonés.** Extraídos de la API v1 de e-Gov. Se comprobó la cobertura con un recuento de caracteres: solo faltan los paréntesis （） de los epígrafes. Las tablas usan «|» y las celdas combinadas verticalmente se repiten.
- **Índices.** Se usaron títulos oficiales:
  - NCh433: del índice de la edición refundida.
  - Manual MTC: transcrito de las páginas del índice del PDF oficial.
  - Normas de EE. UU. y Europa: capítulos y secciones principales.
  - NCh2369, NCh430, NCh432 y NCh3171: no se pudo verificar su índice contra una fuente oficial, así que solo llevan la referencia y el enlace.
- Las ediciones vigentes de NCh433, NCh2369 y NCh432 cambian en 2025–2027; ver `chile-2026.md`.
