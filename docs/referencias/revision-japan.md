# Revisión independiente del módulo «japan»

Archivos revisados: `src/norms/japan.js`, `src/blocks/japan.js`, `src/templates/japan.js`, `tests/japan.test.mjs`, `docs/referencias/japan.md`.
Método: contraste de cada fórmula y tabla con fuentes primarias o con documentos oficiales que las reproducen, lectura completa de las
9 plantillas como revisor, pruebas con datos extremos y revisión visual de las figuras (Playwright).

Gravedad: **A** = resultado normativo incorrecto (puede dar un diseño inseguro), **B** = procedimiento incompleto o mal aplicado,
**C** = presentación, claridad o robustez.

## 1. Hallazgos y correcciones

| # | Grav. | Qué estaba mal | Fuente | Corrección |
|---|---|---|---|---|
| 1 | A | **Arakawa «mínima» con el coeficiente de la versión media.** `QsuAIJ` usaba 0.068 (荒川mean式) y lo rotulaba como «mínima». La fórmula mínima, que es la que se usa en el diseño de garantía, lleva **0.053**. Sobrestimaba Qsu en ≈ 15–30 %. | kenchik.info, «RC梁のせん断強度式まとめ» (荒川min式 0.053 / mean 0.068); 技術基準解説書 | Coeficiente 0.053; prueba recalculada (430.3 kN en lugar de 493.5 kN). |
| 2 | A | **Gs simplificado del suelo tipo 1 multiplicado por 0.9.** Se usaba 1.35 / 0.778/T / 1.215; el valor correcto es **1.5 / 0.864/T / 1.35**. Subestimaba la demanda en roca/grava 10 %. | Ejemplos publicados: denmoku-db (2024): Te = 0.636 s → Gs = 1.358, 0.916 s → 1.350, 0.559 s → 1.500; Pref. de Osaka: «Gs mín. 1.35»; Integral (2007) tabla de la Notif. 1457 | `GsSimp` corregido y validado con los tres puntos publicados. |
| 3 | A | **Tabla Ds de C°A° reconstruida con la regla «rango del menos dúctil»**, que no es la tabla oficial: 13 de 48 celdas diferían (p. ej. FA + WC, βu ≤ 0.3: 0.40 en vez de 0.35; FA + WD: 0.45 en vez de 0.40; FC + WA, βu > 0.7: 0.50 en vez de 0.45). | MEXT, 建築構造設計指針 (2024) tabla 6.1, que reproduce la Notif. 1792 Art. 4 | Tabla completa 4 × 3 × 4 transcrita en `DsTabRC`; 8 pruebas en celdas críticas. La tabla de acero (`DsTabS`) se verificó contra Sato (2011) tabla 2.8 y MEXT tabla 6.2: correcta. |
| 4 | A | **Espectro JRA nivel 2 tipo I de la edición 2002 rotulado como 2012.** La JRA 2012 revisó el tipo I (meseta 1400 / 1300 / 1200 gal) e introdujo el coeficiente regional cIz. El espectro anterior (700 / 850 / 1000) subestima hasta 50 % la demanda de subducción en periodos cortos. | NILIM (2013) «プレート境界型の大規模地震を想定した設計地震動の改定», fig. 1 (H24 tipo I, suelo II: meseta ≈ 1300 gal); manual sísmico de la Pref. de Miyagi, tabla 3-13 | `SJRA2I` con los valores 2012; plantilla con `cIz`. |
| 5 | B | **Puente: el coeficiente sísmico estático se obtenía como S/g del espectro dinámico** (rama larga 1/T en lugar de T^(−2/3) / T^(−4/3)) y el mínimo kh ≥ 0.1 se planteaba como verificación (si kh < 0.1 daba «NO CUMPLE» en vez de usar 0.1). | Manual de la Pref. de Miyagi (JRA V 2012), tablas 3-9, 3-13, 3-14 | Nuevas funciones `kh0JRA` y `khc0JRA`; kh = max(cz·kh0, 0.1); khc = max(cs·cz·khc0, 0.4cz), cs = 1/√(2μa − 1). Espectros dinámicos solo para la figura. Pruebas de valores tabulados y de continuidad en todos los quiebres. |
| 6 | B | **Cortante AIJ incompleto**: faltaba la verificación de **control de daño** de la ed. 2010 (QL + QE ≤ b·j·[(2/3)α·fs + 0.5·wft(pw − 0.002)]), el tope wft ≤ 390 N/mm² y el límite α ≤ 1.5 de columnas. | Borrador AIJ RC 規準 art. 15 (2008), ec. 15.1–15.9 | Nueva `QasAIJ`; tope 390 en `QaAIJ`/`QasAIJ`; verificaciones de control de daño en viga y columna. |
| 7 | B | **Diseño de garantía de columnas con 1.1·Qm**; con la fórmula mínima de Arakawa la columna no cumplía. La práctica japonesa usa ≥ 1.25 para columnas. | Guías de revisión (技術基準解説書; kjhc 2022: columnas 1.25·QM) | Factor `nm` editable (1.25 columnas, 1.1 vigas); columna con estribos de 4 ramas D13@100 para que el ejemplo cumpla. |
| 8 | B | **Rutas 1 y 2 sin la relación de esbeltez H/B ≤ 4** (exigida desde 2007). | MLIT, 国住指第1335号 (2007), §4(1) | Datos Bx, By y verificación `hT/min(Bx, By) ≤ 4`. |
| 9 | B | **Cálculo de límites sin verificación de derivas** (≤ 1/200 en daño y ≤ 1/75 en seguridad) y con Fh aplicado al límite de daño. | 国住指第1335号 §5(1) (1/75, Notif. 1457 Art. 6); Notif. 1457 | Dos verificaciones nuevas; Fh solo en el límite de seguridad. |
| 10 | B | **Viento: presión de la estructura principal comparada con la resistencia de un panel de fachada.** Los cerramientos se verifican con la presión pico de la Notif. 1458, no con q·(Cpe − Cpi). | Notif. 1454 / 1458 | Se eliminó esa verificación; nota explicativa en el texto. |
| 11 | B | Viga de acero secundaria **simplemente apoyada con un momento sísmico** de corto plazo (incoherente). | — | Se eliminó; rige el largo plazo. Deflexión expresada en mm y comparada con la Notif. 1459. |
| 12 | B | Viga AIJ: con 2-D10@150 la nueva verificación de control de daño no cumplía; faltaban la cuantía mínima pt ≥ 0.4 % y la separación ≤ D/2 y ≤ 250 mm. Columna: faltaba la separación ≤ 100 mm. | AIJ RC art. 13 y 15 | Estribos @125; verificaciones añadidas. |
| 13 | B | `MucAIJ` aceptaba N < 0 con la fórmula de compresión. | Fórmula de momento último en tracción 0.8·at·σy·D + 0.4·N·D | Rama de tracción y límite N ≥ −2·at·σy. |
| 14 | C | **Kanji en títulos y etiquetas** (壁量, 保有水平耐力, 多雪区域, 剛性率, nombre del bloque «壁量 / 4分割»…), que pueden salir como cuadros en PDF/Word. | — | Romanizados (kabe-ryo, horyu suihei tairyoku, tasetsu kuiki…). Quedan kanji solo en comentarios de código y en `japan.md`. |
| 15 | C | Ruta 3: verificación global duplicada con la del bloque `qunqu`; nota (2) confusa. | — | Se dejó la verificación por piso; notas reescritas. |
| 16 | C | Variables que el motor convierte en griegas: `pisos` → «πsos», `Cpi` → «Cπ». `Qi[1]` sobre una variable con subíndice se mostraba como LaTeX crudo. | — | Renombradas (`niv`, `Cp_i`); se usa `Qb` exportado por el bloque. |
| 17 | C | Unidades poco legibles: centros de rigidez y radios en mm, q en MPa, TG en «m·s/m», requisitos del 2F en mm. | — | Conversiones `-> m`, `-> N/m^2`, `-> s`. |
| 18 | C | Sección de columna: la etiqueta «5-D25 por cara (total 16)» se cortaba en el borde del SVG; la columna decía «zunchos». | Captura Playwright | Etiqueta en dos líneas y SVG más ancho; «Estribos». |
| 19 | C | Perfiles H JIS: radio r de 16–22 mm en H-400…600×200 (es 13 mm). No afectaba los cálculos (A, I, Z correctos). | JIS G 3192 (A = 2Btf + (H−2tf)tw + 0.858r²) | r = 13 mm. |
| 20 | C | `japan.md` decía que `FeBSL` (engine) interpola hasta Re = 0.45; ya usa 0.30. | — | Documento actualizado. |

## 2. Verificado sin cambios

- Notif. 1793: Z (incluida la lista de regiones), Tc, T = h(0.02 + 0.01α), Rt, Ai (texto oficial MLIT 00006623.pdf).
- Notif. 1792: Fs, Fe (texto oficial); tabla Ds de acero y relaciones ancho-espesor FA (Sato 2011, tablas 2.4 y 2.8).
- Notif. 1791: Σ2.5αAw + 0.7αAc ≥ 0.75·Z·W·Ai (Ruta 2-1), α = √(Fc/18) ≤ √2.
- Espectro en roca de ingeniería 0.64 + 6T / 1.6 / 1.024/T (×5): coincide con el ejemplo del NILIM TN 1084 (S0 = 4.71 m/s² para Ts = 1.09 s; Gs = 2.025 en suelo 2).
- Notif. 1454: Zb, ZG, α y Gf por rugosidad; ejemplo publicado V0 = 34 m/s, rugosidad III, H = 10 m → Er = 0.794, q ≈ 1095 N/m².
- AIJ RC: Fc/3, 2Fc/3, fs = min(Fc/30, 0.49 + Fc/100), ft de barras, n, α = 4/(M/Qd + 1); acero: ft, fs, Λ, fc, fb, C.
- Cantidad de muros (tabla previa a 2025), viento 50 cm/m², yonbun-wari; nieve μb = √cos(1.5β).
- JRA: nivel 1 (S0 y kh0), tipo II (S0 y khc0), cz, cD, TG.

## 3. Problemas fuera del módulo (para el coordinador)

1. **Motor (`engine.js`), sustitución de potencias de unidades:** `(34 m/s)^2` se muestra en la línea de sustitución como `34 m²/s²`
   (desaparece el cuadrado del número); el resultado numérico es correcto.
2. **Motor, indexación de variables con subíndice:** `Qb = Qi[1]` produce `Q_{i}_{[1]}` (doble subíndice), que KaTeX no renderiza y se ve
   como texto crudo. `v[1]` funciona con nombres sin subíndice.
3. **Motor, nombres que empiezan o terminan en «pi»** (`pisos`, `Cpi`) se convierten en π. Conviene documentarlo en `DESARROLLO.md`
   o limitar la conversión a nombres exactos.
4. Existe una plantilla `japon` (pais: 'JP', fuera de `src/templates/japan.js`) que las pruebas del módulo también recorren; revisar
   si duplica contenido de este módulo.
5. `tests/verify.mjs`: 156 correctas, 0 fallidas al cierre de esta revisión.

## 4. Fuentes consultadas

- MLIT, Notif. 1793 (texto vigente): https://www.mlit.go.jp/notice/noticedata/pdf/201703/00006623.pdf
- MLIT, Notif. 1792 (versión 1995, Fs/Fe): https://arc-structure.sakura.ne.jp/law/1792.pdf
- MLIT, 国住指第1335号 (2007), notas de aplicación de las Notif. 1791/1792/1793/1457: https://www.mlit.go.jp/jutakukentiku/build/kensetu.files/18kaisei/jogen03.pdf
- MEXT, 文部科学省建築構造設計指針・同解説 (2024), tablas 6.1 y 6.2: https://www.mext.go.jp/content/20210409-mxt_bousai-100001899_3.pdf
- Sato K., 技術基準による鋼構造の設計 (2011), extracto: http://nishimura-lab.jp/lecture/earthquake/Ds%E5%80%A4.pdf
- AIJ, RC 規準 15 条 (borrador 2008 de la ed. 2010): https://news-sv.aij.or.jp/kouzou/s22/public/080331-0411/15.pdf
- kenchik.info, fórmulas de Arakawa: https://kenchik.info/2022/08/04/rchari_sendantairyokusiki/
- denmoku-db, 限界耐力計算例 (2024): http://www.denmoku-db.jp/files/libs/244/202404081606485603.pdf
- NILIM, Nota Técnica 1084, ejemplo de cálculo de límites: https://www.nilim.go.jp/lab/bcg/siryou/tnn/tnn1084pdf/ks108406.pdf
- Integral (2007), «よくわかる限界耐力計算»: https://jutaku.homeskun.com/assets/media/contents/yokuwakaru/genkai.pdf
- Pref. de Osaka, observaciones de revisión (madera, cálculo de límites): https://www.pref.osaka.lg.jp/documents/35034/07_a43-4kakusyukouzounosekkei_1.pdf
- Pref. de Miyagi, manual de diseño sísmico de puentes (JRA 2012): https://www.pref.miyagi.jp/documents/11795/283937.pdf
- NILIM (2013), revisión del sismo de nivel 2 tipo I: https://www.nilim.go.jp/lab/bcg/siryou/2013report/2013nilim13.pdf
- kjhc (2022), 判定事例による質疑事項と設計者の対応集: https://www.kjhc.co.jp/download/pdf/hantei_taiousyuu_20220824.pdf
- MLIT, Notif. 1454 (rugosidad, reforma 2022): https://www.mlit.go.jp/jutakukentiku/build/content/H12-1454.pdf

## 5. Limitaciones que siguen abiertas

- No se encontró el texto oficial vigente de la Notif. 1457 Art. 10 en el sitio del MLIT; la corrección de Gs se apoya en tres
  ejemplos publicados coincidentes y en una tabla de terceros.
- Los coeficientes de amplificación del diseño de garantía (1.1 / 1.25) son valores habituales de las guías de revisión, no del texto
  de la Notif.; quedan como dato editable.
- La designación de las zonas del mapa cIz de la JRA 2012 no se transcribió; la plantilla ofrece los valores 1.2 / 1.0 / 0.8.
- El cálculo de límites se presenta como sistema de 1 GDL simplificado (sin Bdi, p, q ni Mu efectiva por piso).
