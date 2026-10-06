# Revisión independiente del módulo «geotech»

Archivos revisados: `src/norms/geotech.js`, `src/blocks/geotech.js`, `src/templates/geotech.js`, `tests/geotech.test.mjs`,
`docs/referencias/geotech.md`.
Método: se contrastó cada fórmula con el texto oficial de la NTE E.050-2018 (separata de *El Peruano*, 3-12-2018, RM 406-2018-VIVIENDA),
la NTE E.060-2009 (Cap. 9, 11 y 22) y fuentes primarias o manuales de verificación. Además se leyeron las 12 plantillas como revisor,
se corrieron con datos extremos, se resolvieron problemas publicados (Das, Hetényi, Rocscience Slide2) y se revisaron las figuras con Playwright.

Gravedad: **A** = resultado normativo incorrecto o inseguro; **B** = procedimiento incompleto o mal aplicado; **C** = presentación, robustez o rendimiento.

## 1. Hallazgos y correcciones

| # | Grav. | Qué estaba mal | Fuente | Corrección |
|---|---|---|---|---|
| 1 | A | **Cimiento corrido de concreto simple con f′c = 100 kgf/cm²**. La E.060 exige como mínimo **14 MPa** para el concreto estructural simple, y el cálculo usaba el peralte completo; para concreto vaciado contra el suelo hay que usar **h − 50 mm**. | E.060-2009 Art. 22.2.4 y 22.4.8; ec. 22-2 (Mn = 0.42√f′c·Sm) y 22-9 (Vn = 0.11√f′c·b·h); φ = 0.65 (Art. 9.3.2.8) | f′c = 140 kgf/cm² con su verificación; `hcal = hc − 5 cm` en flexión y cortante; coeficientes 1.34 y 0.35 (kgf/cm²) con la ecuación de la E.060 citada. |
| 2 | A | **Licuación sin Kσ.** Youd et al. (2001) aplican la corrección por sobrecarga de Hynes y Olsen cuando σ′v > 100 kPa. Sin ella CRR_M quedaba sobrestimado hasta en 20 % a 15 m. | Youd et al. (2001); Settle3 Liquefaction Theory Manual, ec. 38 | Nueva función `KsigmaYoud` (f = 0.8 → 0.6 según Dr); CRR_M = MSF·Kσ·CRR7.5, con la columna Kσ en la tabla. |
| 3 | A | **Falla en bloque del grupo de pilotes: Nc\* de Skempton sin limitar D/B ≤ 2.5.** `min(9, 5(1 + 0.2L/B)(1 + 0.2B/L))` da hasta 9 en bloques rectangulares profundos, cuando el valor correcto es 7.5(1 + 0.2B/L). | Skempton (1951); Das cap. 11 | `5(1 + 0.2·min(L/B, 2.5))(1 + 0.2B/L)`. |
| 4 | B | **Capacidad portante: las presiones no incluían el peso de la zapata ni del relleno**, y la presión admisible por asentamiento sumaba la sobrecarga *efectiva* (Meyerhof da una presión neta, y la bruta se obtiene sumando σv total). | E.050 Art. 28.1 (Q = carga vertical total); Das cap. 5 | Q = P + γm·B·L·Df en excentricidades, inclinación, q0, q1, q2 y qe; presión neta y bruta con σv total en Df. Los datos de ejemplo (B × L = 2.6 × 3.0 m, luz 7 m) se ajustaron para que la memoria siga cumpliendo con el criterio más exigente. |
| 5 | B | **E.050 Art. 20 mal descrito.** La norma da dos expresiones separadas: φ = 0 → qd = sc·ic·c·Nc (Art. 20.2), y c = 0 → qd = iq·γ1·Df·Nq + 0.5·sγ·iγ·γ2·B′·Nγ (Art. 20.3), con Nγ = (Nq − 1)·tan(1.4φ). La plantilla las sumaba sin advertirlo. | Texto de la E.050-2018 Art. 20 | Título y comentarios aclaran que la plantilla suma ambos términos (generalización a suelos c–φ). Los factores Nq, Nc, Nγ, sc, sγ, ic, iq e iγ son correctos. |
| 6 | B | **Platea sin punzonamiento de la columna de esquina** (αs = 20, perímetro de 2 lados). Solo se verificaban la columna interior y la de borde. | E.060 Art. 11.12.2.1 (b) | Verificación de la columna 3 (esquina más cargada). |
| 7 | B | **Cabezal: punzonamiento del pilote de esquina con 1.06√f′c sin el límite αs = 20.** | E.060 Art. 11.12.2.1 | `min(0.27(20d/bo + 2), 1.06)`. |
| 8 | B | **Pilote sin fricción negativa** (la E.050 la exige en suelos compresibles y manda sumarla como carga) y **sin capacidad lateral** (Art. 32.1: los pilotes deben resistir las cargas sísmicas). | E.050 Art. 32.1 y 32.3.4 e–f; Broms (1964a, b) | Fricción negativa opcional con el método β (Burland) hasta el plano neutro; con ella no se cuenta la fricción positiva de la arcilla y P + Qn ≤ Qadm. Nuevas funciones `HuBromsC/HuBromsS` (cabeza libre o empotrada; pilote corto, intermedio o largo) y `modoBromsC/S`. Sección lateral en la plantilla: Hs ≤ Hu/2.5 y la zona de reacción dentro de la arcilla. |
| 9 | B | **Probabilidad de licuación de Cetin calculada con el rd de Youd y el CSR con MSF.** Cetin et al. (2004) usan su propio rd, función de V\*s,12. La E.050 Art. 38.5.3 nombra precisamente esa variable. | Settle3 Liquefaction Theory Manual, ec. 6 y 28 | Nueva `rdCetin(z, amax, Mw, Vs12)`; dato `Vs12`; PL con CSReq (rd de Cetin, sin MSF ni Kσ). |
| 10 | B | **Pilote: no se verificaba la profundidad de exploración** p = Df + z, z = 6 m (cimentación profunda), y el sondeo del ejemplo (16 m) era insuficiente para un pilote de 14 m. | E.050 Art. 15, c-2 | Sondeo de ejemplo prolongado a 20 m (SPT a 17 m y 19 m) y verificación `pexp ≥ Lpil + 6 m`. |
| 11 | B | **Zapata combinada: el refuerzo transversal de la columna 1 se calculaba pero no se verificaba**, y con presiones admisibles bajas los espaciamientos producían errores (`rounddown` de cero, división entre `n − 1 = 0`). | E.060 Art. 7.6.1 y 9.8 | Espaciamiento st1, espaciamiento mínimo libre ≥ db y ≥ 25 mm; `max(n − 1, 1)` en todos los espaciamientos de las plantillas. |
| 12 | C | **Taludes: NF solo horizontal.** No se podía modelar el caso habitual de un NF que sube bajo la corona. | — | El campo «nf» admite una cota o una polilínea «x y»; validado con Arai y Tagyo ej. 3 (Slide #16). |
| 13 | C | **Rendimiento de taludes**: la plantilla tardaba 0.8 s. Cada círculo muestreaba 240 puntos y hacía dos bisecciones. | — | Intersección analítica círculo–poligonal (exacta) y 24 dovelas durante la búsqueda (el círculo final se recalcula con n). La plantilla baja a ≈ 0.23 s (en caliente) y los FS cambian < 0.1 %. |
| 14 | C | Tabla de licuación demasiado ancha al agregar Kσ. | Captura Playwright | Se quitó la columna N de campo (ya figura en la tabla del perfil). |

## 2. Ejemplos resueltos agregados a `tests/geotech.test.mjs` (159 pruebas, 0 fallidas)

| Ejemplo | Publicado | App |
|---|---|---|
| Das, Ej. 3.7 (área efectiva, B = 1.5 m, e = 0.15 m, φ = 30°) | q′u = 549.2 kN/m², Qult = 988.6 kN | 549.1 / 988.4 |
| Hetényi (1946), viga finita libre con carga central, λL = 1 y 3 | w y M en forma cerrada | error < 0.01 % |
| ACADS 1(a) (Giam y Donald 1989), Slide #1 | Bishop 0.987 (referencia 1.00) | 0.985 |
| Arai y Tagyo (1985) ej. 1, Slide #14 | Bishop 1.409 | 1.404 |
| Arai y Tagyo (1985) ej. 3 con NF poligonal, Slide #16 | Bishop 1.118 | 1.113 |
| Yamagami y Ueta (1988), Slide #17, círculo (8.672; 13.934; 9.695) | Bishop 1.344 / 1.348, Fellenius 1.282 (Y-U), 1.278 (Slide) | 1.343 / 1.284 |
| Yamagami y Ueta, búsqueda automática | FS 1.344, xc = 8.67 m | 1.343, xc = 8.57 m |
| Broms: 8 casos (cohesivo y granular, libre y empotrado, corto, intermedio y largo) | Soluciones cerradas de equilibrio | exactas |
| rd de Cetin (z = 0, 10, 25 m) y Kσ de Hynes y Olsen | Ecuaciones publicadas | exactas |
| Fricción negativa del pilote, Kσ en la plantilla y 14 plantillas con datos extremos | — | NO CUMPLE sin errores ni NaN |

Ya existían, y se comprobaron: Das Ej. 3.1 (Terzaghi), Das Ej. 11.1 (Meyerhof), Hetényi con viga infinita, Taylor (1937) y el talud infinito.

## 3. Verificado sin cambios

- E.050: Nq, Nc (5.14 si φ = 0), Nγ = (Nq − 1)·tan 1.4φ, sc = 1 + 0.2B/L, sγ = 1 − 0.2B/L, ic = iq = (1 − α/90)², iγ = (1 − α/φ)²
  (Art. 20); FS 3.0 y 2.5 (Art. 21); presión admisible como el menor valor (Art. 22); Df ≥ 0.80 m y viga perimetral de platea
  ≥ 0.40 m (Art. 26); B′ = B − 2e (Art. 28); FS de taludes 1.5 y 1.25 (Art. 30.3); Tabla 8 de distorsión angular; 75 % del
  asentamiento total como diferencial en suelos granulares (Art. 19.2); pilotes FS 2.0 individual y 3.0/2.5 de grupo, Tabla 9,
  1.20 m, zapata equivalente a 2/3 L (Art. 32); N60, (N1)60 y CN (Art. 5.27); Tablas 13 y 13A (Art. 38).
- E.060: punzonamiento 0.53(1 + 2/β), 0.27(αs·d/bo + 2) y 1.06 (kgf/cm²) = ec. 11-33 a 11-35; φ = 0.85 en cortante y 0.90 en flexión.
- Das/Meyerhof: factores de forma de De Beer, de profundidad de Hansen con B (no B′), qneta de Meyerhof (1965) modificada,
  Nq\* tabulado, ql = 0.5·pa·Nq\*·tanφ, correlaciones SPT de punta y fuste, Vesic (1977) para el asentamiento del pilote,
  Converse–Labarre. Steinbrenner (Bowles) para Is. API α. Youd et al. (2001): rd, CRR7.5, MSF, finos y CR.
- Bishop: el numerador con kh no cambia (equilibrio vertical) y en Fellenius N = W cosα − kh W sinα − u·l; ambos son correctos.
- Winkler: k = ks·B, balasto de Vesic (k′/B) y de Bowles (40·FS·qa).

## 4. Problemas fuera del módulo (para el coordinador)

1. **Bloque `table` (genérico):** las tablas con más de unas 12 columnas desbordan el ancho de la hoja; no hay desplazamiento horizontal
   ni reducción de la letra.
2. **Motor: `a*b` entre dos vectores es un producto escalar** (sintaxis de math.js). Es fácil equivocarse en plantillas con vectores
   (aquí `MSF*Ks*CRR` daba un escalar y el error aparecía lejos, en otro bloque). Conviene advertirlo en `DESARROLLO.md`
   (usar `.*`), o avisar cuando un `*` entre vectores del mismo tamaño se usa en una asignación.
3. **`rounddown(x, paso)` lanza un error cuando el resultado es cero.** En plantillas de espaciamiento convierte un «NO CUMPLE»
   en un error de cálculo. Sería mejor devolver 0 y dejar que lo detecte el `check`.
4. Durante la revisión `src/blocks/concrete.js` tuvo, por un momento, un error de sintaxis que rompía todas las pruebas
   (edición en curso de otro agente); se resolvió solo.
5. Al cierre: `node tests/geotech.test.mjs` da 159 correctas y 0 fallidas; `node tests/verify.mjs`, 156 correctas y 0 fallidas.

## 5. Fuentes consultadas

- NTE E.050 Suelos y Cimentaciones (2018), separata de *El Peruano*: http://www.ipdu.pe/wp-content/uploads/2024/03/RM-406-2018-VIVIENDA-ANEXO.pdf
- NTE E.060 Concreto Armado (2009), Cap. 9, 11 y 22: https://waltervillavicencio.com/wp-content/uploads/2019/10/E.060.pdf
- Rocscience, *Slide2 Slope Stability Verification Manual* (problemas 1, 3, 14, 16 y 17): https://static.rocscience.cloud/assets/verification-and-theory/Slide2/Slide_SlopeStabilityVerification.pdf
- Rocscience (2025), *Settle3 Liquefaction Theory Manual* (rd de Cetin, Kσ de Hynes y Olsen, PL de Cetin): https://static.rocscience.cloud/assets/verification-and-theory/Settle3/Settle3-Liquefaction-Theory-Manual.pdf
- Das, B. M., *Principios de ingeniería de cimentaciones*, 7.ª ed. (Ej. 3.1, 3.7, 11.1; Broms; Skempton).
- Hetényi, M. (1946), *Beams on Elastic Foundation* (viga finita con carga central).
- Broms, B. B. (1964a, b), Lateral resistance of piles in cohesive / cohesionless soils, *JSMFD ASCE* 90(SM2, SM3).

## 6. Limitaciones que siguen abiertas

- Asentamiento elástico sin el factor de profundidad de Fox (If = 1, conservador).
- Taludes: solo superficies circulares y estratos horizontales. Los problemas ACADS 1(c) y 1(d), de estratos inclinados, no se
  pueden modelar.
- Broms supone suelo homogéneo y no da desplazamientos laterales. La fricción negativa supone el plano neutro en el tope del estrato portante.
- La plantilla de capacidad portante no evalúa la condición sísmica (FS = 2.5, Art. 21.2).
