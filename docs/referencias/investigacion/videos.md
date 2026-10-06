# Videos y ejemplos resueltos para validar MemoriaCalc

Investigación del 2026-10-06. Destinatarios: los agentes que escriben normas, bloques y plantillas, y los revisores
que comparan los resultados de la app con valores de referencia.

## 0. Cómo leer este documento (importante)

- **Transcripciones.** YouTube bloquea las transcripciones desde este entorno: `timedtext` responde vacío,
  `get_transcript` devuelve `FAILED_PRECONDITION`, `youtubetranscript.com` está bloqueado y las instancias de Invidious
  están caídas. Sí se pudo leer el **título, canal, fecha, descripción y capítulos** de cada video con el endpoint
  público `youtubei/v1/next` y con la búsqueda `youtubei/v1/search`. Todos los videos listados existen y están
  verificados. Ninguno se inventó.
- Por eso, los **procedimientos paso a paso** combinan los capítulos y descripciones de los videos con el texto de las
  normas (E.030-2018, **E.030-2026**, E.060, E.070, NCh433+DS61, AASHTO LRFD, AISC 360-16). Los **errores comunes**
  son una síntesis del investigador sobre esa práctica. Cuando un error lo dice el propio video, se indica.
- **Ejemplos numéricos (§12).** Se calcularon con implementaciones de referencia en JavaScript puro, escritas para esta
  investigación (ver `algoritmos.md`). Cuando hay una fuente publicada, la coincidencia se indica con ✔:
  - Chopra, *Dynamics of Structures*: ejemplos 5.1, 5.3, 5.4 y 13.x, y el espectro de El Centro de la Fig. 6.4.1.
  - FHWA, *LRFD Steel Girder Design Example*.
  - SOFiSTiK, benchmark BE36 / ATC-40.
  - Valores tabulados del Manual AISC.

  Los demás son casos de control. Las normas se aplican tal cual y la aritmética se puede verificar.

> **AVISO NORMATIVO URGENTE (Perú).** La **R.M. N° 183-2026-VIVIENDA** (El Peruano, 03/05/2026) modificó la
> **E.030**. Cambios que afectan directamente a `src/norms/peru.js`, `src/blocks/peru.js` y `src/templates/peru.js`.
> Todos se verificaron en el texto oficial:
> - **Tabla 3/4/5, suelos.** La clasificación usa V̄s30, N̄60 y S̄u. Aparece el perfil **S4**: Vs<200 m/s. S2 y S3
>   se definen por **intervalos que se interpolan linealmente según Vs30**:
>   - S2 en Z4: S = 1,00–1,10, TP = 0,4–0,6 s, TL = 2,5–2,0 s.
>   - S3 en Z4: S = 1,10–1,20, TP = 0,6–0,9 s, TL = 2,0–1,6 s.
>   - S4: TP = 1,2 s y TL = 1,6 s. En Z4 exige un análisis de respuesta de sitio. En Z3, Z2 y Z1, S = 1,30, 1,70 y 2,40.
>
>   Si no se conoce Vs30, se toma el S mayor del intervalo y, en S2, TP = 0,6 y TL = 2,0. En S3, TP = 0,9 y TL = 1,6.
>   *(En 2018 el S3 era TP = 1,0 s.)*
> - **Art. 14.8, período Ts.** Para categorías A y B en Z4 se debe medir el período del suelo Ts con H/V. Si
>   Ts > 0,65·TP, se pasa al perfil siguiente, más desfavorable.
> - **Tabla 6, factor C.** Incluye la rama corta `C = 1 + 7,5·T/TP` para T < 0,2·TP. En el análisis **estático** se
>   usa C = 2,5 en todo el rango 0 ≤ T ≤ TP (Art. 18.3 y 34.1).
> - **Tabla 10.** Muros de ductilidad limitada (EMDL): **R0 = 3,5**, antes 4, y como máximo **5 pisos**. La deriva de
>   EMDL es **0,004**, antes 0,005. Las demás R0 no cambian: SMF 8, IMF 5, OMF 4, SCBF 7, OCBF 4, EBF 8; concreto con
>   pórticos 8, dual 7, muros 6; albañilería 3; madera 7.
> - **Art. 28, 33.3 y 43, dirección del sismo.** Se usa **100 % + 30 %** de la dirección perpendicular: suma de
>   valores absolutos en el análisis estático y SRSS de las componentes en el dinámico. La excentricidad accidental
>   (0,05·B) se aplica solo en la dirección perpendicular a la del 100 %.
> - **Art. 52, junta sísmica.** Ahora es **s = 0,02·Z·S·h ≥ 0,03 m**; antes era 0,006·h.
> - **Art. 47 y 49, tiempo-historia.** Se usan **7 pares** de registros, escalados en el rango 0,2T–1,5T y comparados
>   con el espectro de R = 1. Las derivas se limitan a 1,25 veces la Tabla 14 y las fuerzas se dividen entre R = 2.
> - **Sin cambios:** Z (0,45/0,35/0,25/0,10), U (A 1,5; B 1,3; C 1,0), k = 0,75+0,5T ≤ 2, CT = 35/45/60,
>   C/R ≥ 0,11, el 80 %/90 % de V estático, las combinaciones CQC o 0,25Σ|r|+0,75√Σr², el 0,75R/0,85R para
>   desplazamientos, Ia/Ip y la redundancia del 125 %.
> - **Disposición transitoria.** Los proyectos con licencia en trámite o expediente aprobado siguen con la E.030-2018.
>   **Recomendación:** que la plantilla tenga una lista `Versión [2018|2026]`.
>
> **Chile.** La **NCh433:2026** quedó oficializada por el D.Ex. N°28 MINVU (D.O. 10/08/2026). Entra en vigencia
> **6 meses después**, alrededor del 10/02/2027, y reemplaza la NCh433 Mod.2009 + DS61. Según AICE y Portal Innova,
> es sobre todo un *refundido* de la NCh433 Mod.2009 con el DS61. Agrega la consideración del período del suelo y los
> sistemas de acero conformado en frío. Además existe la **NCh2369:2025**, que la serie de videos de IGR Ingeniería ya
> aplica. Ninguna de las dos se pudo leer completa aquí; se recomienda marcar las plantillas chilenas como
> "NCh433 Mod.2009 + DS61 (vigente hasta feb-2027)".

---

## 1. Análisis sísmico estático E.030

| Video | Canal / fecha | Contenido (descripción o capítulos) |
|---|---|---|
| [ANÁLISIS SÍSMICO ESTÁTICO EN EXCEL PASO A PASO / E.030 2018, ETABS](https://www.youtube.com/watch?v=Sr6NIsIgwIs) | D ENG_21 · 9 jun 2021 · 1:10 h | Plantilla Excel de análisis estático. Capítulos: 0:00 inicio, 1:09:00 hoja Excel. Hojas: predimensionamiento y metrado, estático y dinámico, irregularidades y sistema estructural. |
| [EN VIVO · ANÁLISIS SÍSMICO ESTÁTICO EJEMPLO](https://www.youtube.com/watch?v=4HOIJXM16Oo) | UNIENSEÑA · 22 ago 2023 | Ejemplo en vivo. Lo acompaña el blog [uniensena.com/analisis-estatico-4-niveles](https://uniensena.com/analisis-estatico-4-niveles/): metrado, peso por nivel, V basal, fuerzas por nivel y desplazamientos de un edificio de 4 niveles. |
| [ANÁLISIS SÍSMICO CÁLCULO MANUAL · Video 05 · Estático](https://www.youtube.com/watch?v=wVjL8zJsFmQ) | UNIENSEÑA · 24 nov 2021 | Cálculo manual, parte de un curso. |
| [INGENIERÍA SÍSMICA · ANÁLISIS SÍSMICO ESTÁTICO · RESUMEN](https://www.youtube.com/watch?v=9GNnwwekPLk) | UNIENSEÑA · 6 min | Resumen conceptual. |
| [ETABS + Norma E.030-2026 · Estático y Dinámico](https://www.youtube.com/watch?v=Lzjigj7whAQ) | Yhonatan Cieza · 2 jul 2026 | Primer recorrido completo con la **E.030-2026**: materiales, masas, estático y dinámico, combinaciones y verificación. |
| [NORMA E.030 DISEÑO SISMORRESISTENTE DEL 2026](https://www.youtube.com/watch?v=-ELhfHhm69E) | EMEQ Ingenieros · 6 may 2026 · 1:53 h | Explicación de los cambios de la norma 2026. |
| [16. ANÁLISIS SÍSMICO LINEAL ELÁSTICO - E.030](https://www.youtube.com/watch?v=fz8x5Tmrwt8) | EMEQ Ingenieros (Ing. E. Enríquez) · 2019 | Clase de un curso. Las diapositivas y manuales se pueden descargar desde los enlaces de la descripción. |
| [Espectro de Diseño Sísmico E.030-2026 (Excel)](https://www.youtube.com/watch?v=Qd4oQ2EvNwI) | LixMath · 10 jul 2026 | Pasos ①–⑩: Z → U → **Vs30** → perfil y S → TP, TL → R0 → Ia, Ip → R → Sa → espectro inelástico. Confirma que en 2026 S, TP y TL dependen de Vs30. |
| [Análisis Sísmico Estático y dinámico Espectral E030 en ETABS v18](https://www.youtube.com/watch?v=GlMNsh1qdDY) | Smart E. · 1:11 h | ETABS. |

**Procedimiento (E.030-2018 y 2026)**
1. **Peso sísmico P (Art. 26 de 2018 / Art. 31 de 2026).** CM + 50 % de la CV en categorías A y B, CM + 25 % en C y
   en azoteas, 80 % en depósitos y 100 % en tanques.
2. **Parámetros.** Z de la Tabla 1. Suelo: S, TP y TL; en 2026 se interpolan con Vs30. U de la categoría. R0 del
   sistema. Ia e Ip de las irregularidades. Luego **R = R0·Ia·Ip**.
3. **Período.** T = hn/CT, con CT = 35, 45 o 60. Como alternativa, Rayleigh T = 2π√(ΣPi·di²/(g·Σfi·di)), multiplicado
   por 0,85 si el modelo no incluye la tabiquería no aislada.
4. **Factor C.** C = 2,5 si T ≤ TP, 2,5·TP/T si TP < T < TL, y 2,5·TP·TL/T² si T > TL. Se verifica **C/R ≥ 0,11**.
5. **Cortante basal.** V = Z·U·C·S·P/R.
6. **Distribución en altura.** k = 1 si T ≤ 0,5 s; si no, k = 0,75 + 0,5T ≤ 2. αi = Pi·hi^k / Σ(Pj·hj^k) y Fi = αi·V.
7. **Torsión accidental.** Mti = ±Fi·0,05·B, con B la dimensión perpendicular a la dirección de análisis.
8. **Desplazamientos.** Inelásticos = 0,75R (regular) o 0,85R (irregular) por el elástico. Para este cálculo no se
   aplican los mínimos de C/R. La deriva Δi/hei se compara con la Tabla 14: concreto 0,007, acero 0,010,
   albañilería 0,005, madera 0,010, EMDL 0,005 en 2018 y **0,004** en 2026.
9. **Comprobaciones finales.** Irregularidad torsional (Δmax/Δprom > 1,3, solo si Δmax > 50 % del permisible), piso
   blando (k < 70 % del superior), junta s y redundancia (si un elemento toma ≥ 30 % de V, se diseña para 125 %).

**Errores comunes**
- Usar CT = 60 en un edificio de pórticos con algunos muros. CT = 60 solo aplica a duales, muros y EMDL.
- Usar la rama C = 1+7,5T/TP en el análisis **estático**. La E.030-2026 (Art. 18.3) prohíbe explícitamente
  bajar de 2,5 para T ≤ TP.
- Olvidar C/R ≥ 0,11 o aplicarlo también a los desplazamientos (Art. 50.3).
- Calcular k con el período de la otra dirección.
- Tomar el peso con el 100 % de la CV, o con el 25 % en una edificación de categoría B.
- Multiplicar el desplazamiento elástico por R en lugar de 0,75R o 0,85R.
- Medir la deriva con desplazamientos del centro de masas cuando la irregularidad torsional pide los extremos.
- En 2026: no interpolar S, TP y TL por Vs30, o seguir usando TP = 1,0 para S3. El máximo es 0,9 y sin Vs30 se usa 0,9.

## 2. Análisis dinámico modal espectral (E.030 / NCh433)

| Video | Canal | Contenido |
|---|---|---|
| [ANÁLISIS DINÁMICO MODAL ESPECTRAL · Plantilla Excel y Mathcad · Clase 7](https://www.youtube.com/watch?v=ewWMXR4Z4cg) | Ingenio Brillante · 2022 | **Cálculo manual frente a Mathcad**: autovalores y autovectores, períodos, espectro, modos y desplazamientos. Es una serie (clases 1–7: predimensionamiento → metrado → rigidez lateral de pórtico → rigidez del edificio → espectro → estático → dinámico) que sirve de guía para una cadena de plantillas en MemoriaCalc. |
| [EN VIVO · ANÁLISIS SÍSMICO MODAL ESPECTRAL](https://www.youtube.com/watch?v=Zv87Aq_i1xM) | UNIENSEÑA · 1:41 h | Webinar. |
| [Análisis dinámico Modal Espectral (1/2)](https://www.youtube.com/watch?v=9MRqMzH-HuA) | Oswald Casaverde | Clase. |
| [IIO527 NCh433 e ingreso de Espectro en ETABS](https://www.youtube.com/watch?v=woOueFa51AI) | Felipe Castilla (U. de La Frontera) · 2020 | Curso universitario *Proyecto de Diseño en Hormigón Armado*. Incluye una planilla descargable. |
| [¿ESPECTRO DE DISEÑO NCH 433?](https://www.youtube.com/watch?v=zsz98TEO_oU) | Ingenierillo Chile · 2023 | α(Tn), R* y espectro. |
| [Análisis Modal Espectral (21/12/20)](https://www.youtube.com/watch?v=KvdC-8RAW14) | Fundación Extensus | Clase de 1:36 h. |
| [How to Perform RSA in ETABS · SRSS & CQC Explained](https://www.youtube.com/watch?v=ahGVQBHzZiM) · [CQC OR SRSS?](https://www.youtube.com/watch?v=BKVZx_bAyx8) | Real civil · STRUCTURIST | Combinación modal. |

**Procedimiento**
1. Matrices M y K, con 3 GDL por diafragma o con un modelo de cortante.
2. Problema de autovalores: ωn, Tn y φn.
3. Factores de participación Γn = φnᵀM·1 / φnᵀMφn. Masa efectiva Mn* = (φnᵀM·1)²/φnᵀMφn. Se suman modos hasta llegar
   a **≥ 90 %** de la masa, con un mínimo de 3 modos.
4. Sa(Tn) del espectro. En E.030: ZUCS·g/R. En NCh433: S·A0·α/(R*/I).
5. Respuestas modales: un = Γn·φn·Sa/ωn² y fuerzas fn = Γn·M·φn·Sa.
6. **CQC** con ρij de Der Kiureghian (ζ = 5 %), o bien 0,25Σ|r| + 0,75√Σr² en E.030.
7. Cortante dinámico ≥ 80 % (regular) o 90 % (irregular) del estático. Si no se cumple, **se escalan las fuerzas
   pero no los desplazamientos**.
8. Dirección (2026): 100 % + 30 % combinados con SRSS. Excentricidad accidental.

**Errores comunes**
- Combinar con CQC los **cortantes de entrepiso obtenidos de fuerzas ya combinadas**. Hay que combinar cada respuesta
  modal: cortante, deriva, etc.
- Calcular las derivas como diferencia de desplazamientos ya combinados. La deriva se combina modo a modo.
- Escalar también los desplazamientos al 80 % o 90 % del estático.
- No revisar la suma de masas efectivas.
- En NCh433, olvidar que **R\*** depende de T\* del modo con mayor masa traslacional en esa dirección, y que el
  corte basal se lleva a Qmin = I·S·A0·P/(6g) y Qmax = I·Cmax·P.

## 3. Muros estructurales (placas)

| Video | Canal | Contenido |
|---|---|---|
| [Diseño de Muros Estructurales de Concreto Armado (Placas)](https://www.youtube.com/watch?v=aatWmITrxNw) | LixMath · 2022 · 90 k vistas | ① ¿hacen falta elementos de borde? ② diseño de borde: predimensión y acero ③ corte ④ acero horizontal y vertical ⑤ detalle. |
| [Diseño de Placas Rectangulares - NTP E.060 - Parte 01](https://www.youtube.com/watch?v=33Vu-d7amjY) | JZ Ingeniería · 2022 | Placa de **9 niveles**: solicitaciones y flexión. |
| [Diseño de muros E060 y ACI 318-19 - Elementos de borde](https://www.youtube.com/watch?v=nxAEgclwD-Q) | Rolando Miguel · 2024 | Eje neutro c, longitud y ancho del borde, cuantía y altura crítica. |
| [ELEMENTOS DE BORDE en Muros Estructurales](https://www.youtube.com/watch?v=XQEbTeaprbg) · [ELEMENTOS DE BORDE](https://www.youtube.com/watch?v=9yNQ0df-314) | — | Conceptos. |
| [Diseño Sismorresistente de Muros con ETABS (ACI 318-19)](https://www.youtube.com/watch?v=kmTdrrcMYwA) | Sismica Institute · 41 k vistas | ACI 318-19. |
| [Ejercicio Muro de Corte ACI 318-14](https://www.youtube.com/watch?v=tFaGV90nxh4) | L. M. Padilla · 1:24 h | Ejercicio en clase. |

**Procedimiento (E.060 cap. 21 / ACI 318-19 §18.10)**
1. Cargas Pu, Mu y Vu por combinación, con 1,25(CM+CV) ± CS en E.060.
2. **Flexocompresión.** Diagrama de interacción con acero distribuido y concentrado.
3. **Elementos de borde.** Hacen falta si c ≥ lm/(600·(δu/hm)), con δu/hm ≥ 0,005 (E.060 21.9.7.4 y ACI 18.10.6.2).
   Por esfuerzos: σ = Pu/A + Mu·y/I > 0,2f'c. La longitud del borde es ≥ max(c − 0,1lm, c/2).
4. **Corte.** Vn = Acv(αc·√f'c + ρh·fy), con αc = 0,80 para hm/lm ≤ 1,5 y 0,53 para ≥ 2 (en kgf/cm²; se
   interpola entre ambos). Límite 2,6√f'c·Acv. En E.060 el cortante de diseño se amplifica:
   Vu ≥ Vua·(Mn/Mua) ≤ R·Vua (21.9.5.3).
5. Cuantías mínimas: ρh, ρv ≥ 0,0025. Dos capas si Vu > 0,53√f'c·Acv o t ≥ 20 cm.

**Errores comunes**
- No amplificar el cortante por Mn/Mu.
- Usar en la verificación del borde la deriva **elástica** en lugar de la inelástica (0,75R·Δe).
- Detallar el borde solo en el primer piso. Se requiere en la altura crítica ≥ max(lm, Mu/4Vu).
- Ignorar las alas (muros T o L): la E.030-2026 Art. 30.7 obliga a modelar la interacción entre muros perpendiculares.

## 4. Columnas (diagrama de interacción)

| Video | Canal | Contenido |
|---|---|---|
| [Diagrama de Interacción de Columnas Rectangulares - NTP E.060 - Parte 03](https://www.youtube.com/watch?v=Aw7xBdI3T9U) | JZ Ingeniería | Columna de **0,70 × 0,40 m**. |
| [Diagrama de Interacción en Columnas Cuadradas - E.060](https://www.youtube.com/watch?v=K0QKS5Ch7iE) | JZ Ingeniería | Columna cuadrada. |
| [CONCRETO ARMADO · DIAGRAMA DE INTERACCIÓN P1 · CÁLCULO MANUAL](https://www.youtube.com/watch?v=vY2jrhGtSPY) · [PASO A PASO (en vivo 2:12 h)](https://www.youtube.com/watch?v=HRsSEKkb_3k) | UNIENSEÑA | Cálculo manual. |
| [Introducción de resistencia de columnas a flexocompresión](https://www.youtube.com/watch?v=6Bcs5iulmB8) | marcelo pardo · 65 k vistas | Teoría. Tiene un programa web asociado (marcelopardo.com) para ACI 318-25. |
| [Diseño de columna rectangular BIAXIAL](https://www.youtube.com/watch?v=xMuSQ4ve1_c) | jhon muchica sillo | Diseño biaxial. |

**Procedimiento**
1. Se recorre c desde ∞ (compresión pura) hasta tracción pura. Para cada c: εs,i = 0,003(c−di)/c,
   fs,i = Es·εs,i ≤ fy, a = β1·c, Cc = 0,85f'c·a·b, Pn = Cc + ΣAs,i·fs,i y Mn = Cc(h/2−a/2) + ΣAs,i·fs,i(h/2−di).
2. Factor φ según εt. E.060: 0,70 (estribos) / 0,75 (espiral) → 0,90. ACI 318-19: 0,65 → 0,90 entre εty y εty+0,003.
3. Tope Pn,max = 0,80·φ·Po (estribos) o 0,85·φ·Po (espiral).
4. Puntos clave: compresión pura, εs = 0 (fisuración inicial), falla balanceada (εs = εy), flexión pura y tracción
   pura.
5. Biaxial: Bresler 1/Pn = 1/Pnx + 1/Pny − 1/Po, o contorno de carga.
6. Esbeltez: δns = Cm/(1−Pu/0,75Pc) ≥ 1.

**Errores comunes**
- No descontar el concreto desplazado por las barras en compresión: debe usarse (fs − 0,85f'c).
- Usar φ constante.
- Olvidar el tope 0,8φPo.
- Un signo inconsistente del momento respecto al centroide plástico en secciones asimétricas.

## 5. Vigas (flexión y corte)

| Video | Canal | Contenido |
|---|---|---|
| [Diseño de Vigas - NTP E.060 - Parte I (Flexión y Corte)](https://www.youtube.com/watch?v=vBecWYogwXQ) | JZ Ingeniería · 2021 | Viga de **5 tramos**. |
| [ANÁLISIS Y DISEÑO DE VIGAS EN PERÚ · E.060 · Semana 03](https://www.youtube.com/watch?v=qaWrMqx1a1I) | C6S · 2022 | Tipos de falla, requisitos E.060 y ejercicios. Trae un Excel adjunto. |
| [Diseño por Flexión de Vigas (Cálculo de Acero) - Método ACI](https://www.youtube.com/watch?v=0FAKd3BFWTg) | LixMath · 93 k vistas | ① predimensión ② metrado ③ Mu resistente ④ momentos actuantes ⑤ As en apoyos y tramos ⑥ diámetros ⑦ cortes de acero ⑧ detalle. |
| [Diseño de Vigas · E.060 y ACI 318-25: Flexión y Cortante](https://www.youtube.com/watch?v=d5xtJQOEAe0) | Rolando Miguel | Ya con ACI 318-25. |
| [Diseño de VIGA DE CONCRETO ARMADO - Cálculo de Acero](https://www.youtube.com/watch?v=R8eNB6R2j0M) | Alda Structural | — |

**Procedimiento (E.060)**
1. h ≈ L/10–L/12 y b ≈ h/2 ≥ 25 cm (sistemas sísmicos).
2. **Flexión.** Mu = φAs·fy(d − a/2) y a = As·fy/(0,85f'c·b). Se despeja As de la cuadrática.
3. **Cuantías.** As,min = 0,7√f'c·b·d/fy (E.060 10.5.2) y As,max = 0,75ρb·b·d (E.060 10.3.4).
4. **Corte.** Vc = 0,53√f'c·b·d, φ = 0,85, Vs = Vu/φ − Vc y s = Av·fy·d/Vs. Se verifica Vs ≤ 2,1√f'c·b·d.
5. **Requisitos sísmicos (E.060 21.4 / 21.5).** Corte por capacidad Vu = (Mn,izq + Mn,der)/ln + Vu,isostático.
   Zona de confinamiento 2h. s0 ≤ min(d/4, 10db, 24de, 30 cm) para vigas de pórticos especiales.

**Errores comunes**
- Usar φ = 0,75 para corte. Es el valor del ACI. En la E.060 es **0,85**.
- No hacer el diseño por capacidad en sistemas de pórticos y duales.
- Tomar d = h − 4 cm cuando hay dos capas de acero.
- Olvidar que el As mínimo del refuerzo negativo y positivo es por cara.

## 6. Zapatas aisladas, combinadas y conectadas

| Video | Canal | Contenido |
|---|---|---|
| [Diseño de Zapata Aislada - NTE E.060](https://www.youtube.com/watch?v=lcLo0KiBJyA) | GEOCI UNT · 2023 | **Capítulos:** 0:00 datos · 1:37 dimensiones · 5:29 peralte · 7:26 cargas amplificadas · 9:15 momentos · 14:41 cortantes · 20:04 punzonamiento · 24:11 acero longitudinal · 28:57 acero transversal · 30:49 aplastamiento · 33:17 detalle. |
| [DISEÑO DE ZAPATAS AISLADAS / CÁLCULO DEL ACERO](https://www.youtube.com/watch?v=AlYx0Nuy5k0) | FerNAN Civil · 129 k vistas | Carga concéntrica, corte en una dirección, punzonamiento, acero en dos direcciones y uso de ganchos. Trae una hoja libre en libreingenieriacivil.com. |
| [Diseño de Zapata Aislada PASO A PASO ACI318S-14](https://www.youtube.com/watch?v=z1SMgAmClF0) · [Parte #1](https://www.youtube.com/watch?v=vj5GAvnpkfI) · [Punzonamiento](https://www.youtube.com/watch?v=e220H9mYmSo) | — | — |
| [¿Cómo diseño Zapata Aislada a Flexocompresión Biaxial?](https://www.youtube.com/watch?v=ALfadcpqq_k) | EstructuraTEC21 · 64 k vistas | Carga axial con momentos en dos direcciones. |
| [INTERPRETANDO LA E.060 - "PERALTE MÍNIMO EN ZAPATAS"](https://www.youtube.com/watch?v=YTW89oWRSWs) | MADAVI | Peralte mínimo por anclaje de las barras de la columna. |
| [Concrete Spread Footing Design (ACI 318-19)](https://www.youtube.com/watch?v=rXOpLhd-1OE) | CalcBook · 2024 | **Error que admite el propio video:** "At ~13:00 the passive bearing pressure does not include multiplication by the footing depth Df". |
| [DISEÑO DE ZAPATAS COMBINADAS](https://www.youtube.com/watch?v=NrSGdvuSHo4) | FerNAN Civil | Espesor, verificaciones y acero. |
| [Diseño de Zapatas Combinadas](https://www.youtube.com/watch?v=JRJn0w6UNtA) | LixMath | Columna excéntrica más columna central. |
| [Diseño de Zapatas Combinadas](https://www.youtube.com/watch?v=0tL9EjTArsU) | marcelo pardo | — |
| [Diseño de Zapatas Conectadas](https://www.youtube.com/watch?v=jAIbgMwpeOw) | LixMath | ① cargas ② esfuerzo neto ③ zapata exterior en planta ④–⑤ viga de conexión ⑥–⑦ zapata exterior ⑧–⑨ zapata interior ⑩ detalle. |
| [DIMENSIONAMIENTO Y DISEÑO DE ZAPATAS CONECTADAS - E.060](https://www.youtube.com/watch?v=oA3tYrP4l6g) | Tania Chavarria | Corte, punzonamiento, flexión y plano. |
| [11. DISEÑO SÍSMICO DE CIMENTACIONES - ZAPATAS CONECTADAS](https://www.youtube.com/watch?v=sD2E9kHmQeY) | EMEQ Ingenieros | Teoría. |
| [VIGAS DE CONEXIÓN y VIGAS DE CIMENTACIÓN](https://www.youtube.com/watch?v=14icRmOLrNE) | GREAL · 84 k vistas | Diferencias conceptuales. |

**Procedimiento, zapata aislada (E.060 cap. 15)**
1. qneta = qa − γprom·Df − s/c. Az = (P + Pp)/qneta, con Pp entre 5 % y 10 % de P. Volados iguales: B − b = L − t.
2. Pu = 1,4CM + 1,7CV, o las combinaciones con sismo con qa,sismo = 1,3qa (E.050). qu = Pu/Az.
3. **Punzonamiento** a d/2 de la columna. Vc = min[0,53(1+2/β), 0,27(αs·d/bo + 2), 1,06]·√f'c·bo·d, con φ = 0,85
   y αs = 40/30/20 para columna interior, de borde o de esquina.
4. **Corte en una dirección** a una distancia d: Vc = 0,53√f'c·B·d.
5. **Flexión** en la cara de la columna: Mu = qu·B·m²/2. As ≥ 0,0018·B·h (temperatura).
6. Aplastamiento: φ·0,85f'c·A1·√(A2/A1) ≤ 2. Longitud de desarrollo de las barras de la columna (ldg) ≤ d.

**Zapata combinada.** Se busca que la resultante coincida con el centroide: x̄ = ΣPi·xi/ΣPi y L = 2x̄ cuando hay
un lindero. Se diseña como viga invertida, longitudinal, con qu·B. La dirección transversal se diseña con franjas
bajo cada columna de ancho c + d (o c + 1,5d).

**Zapata conectada.** La viga de conexión toma el momento P1·e de la zapata excéntrica. La reacción de la zapata
exterior es R1 = P1·L/(L−e). La zapata interior se descarga con P2 − (R1 − P1). La viga se diseña con h ≈ L/7 y
debe ser rígida.

**Errores comunes**
- Dimensionar con qa bruta en lugar de qneta.
- Calcular el punzonamiento con el área total y no con B·L − (c1+d)(c2+d).
- Usar φ = 0,75 (ACI) en lugar de 0,85 (E.060).
- No verificar el As mínimo: en el ejemplo §12.9 controla As,min.
- Olvidar que en la zapata conectada la zapata interior se descarga, y que la descarga **no** debe usarse si
  disminuye la seguridad. Muchos autores recomiendan despreciarla o considerarla solo parcialmente; el criterio debe quedar declarado en la memoria.

## 7. Muros de contención

| Video | Canal | Contenido |
|---|---|---|
| [DISEÑO DE MURO DE CONTENCIÓN EN VOLADIZO PASO A PASO](https://www.youtube.com/watch?v=8NlCmqOyrEQ) · [parte 2/2](https://www.youtube.com/watch?v=rjuHpTd28cE) | CSI Caribe Bolivia | Diseño geotécnico y estructural, comparado con SAP y ETABS. |
| [Diseño de Muros de Contención en Voladizo (Con Sobrecarga)](https://www.youtube.com/watch?v=jfP-OZfIx7s) | LixMath · 158 k vistas | β = 0°. ① predimensión ② pantalla ③ corte en la base ④ fuerzas y momentos ⑤ deslizamiento, volteo y presiones ⑥ acero en pantalla y zapata ⑦–⑧ resumen. |
| [Ejemplo COMPLETO de muro en voladizo · Parte 1](https://www.youtube.com/watch?v=PhJ4ICHp1Ko) · [Parte 4 refuerzo](https://www.youtube.com/watch?v=0ukYaRCWUfM) · [Parte 5 corte](https://www.youtube.com/watch?v=tY_CifXs-N8) | Kestävä (R. Racz, PE) | Serie completa ACI. Parte 1: parámetros y vuelco. |
| [DISEÑO SÍSMICO DE MUROS DE CONTENCIÓN · Mononobe Okabe](https://www.youtube.com/watch?v=weeoBtv8Ifk) · [Parte 2](https://www.youtube.com/watch?v=HRrFTWkiyyo) | Ingeniería Civil | Método M-O paso a paso. |
| [Diseño Sísmico de Muros con CONTRAFUERTES (M-O)](https://www.youtube.com/watch?v=y4a8azHddss) · [por GRAVEDAD](https://www.youtube.com/watch?v=Pw2MoAWF0Xw) | jhon muchica sillo | — |
| [VERIFICACIÓN AL VUELCO - Curso muros - Video #12](https://www.youtube.com/watch?v=WYHhmIsVCXI) | — | — |

**Procedimiento**
1. Predimensión: B ≈ 0,5–0,7H, punta ≈ B/3, zapata ≈ H/10–H/12 y corona ≥ 25–30 cm.
2. **Empuje activo.** Rankine Ka = tan²(45−φ/2), o Coulomb con δ y β. Ea = ½·Ka·γ·H² a H/3, más Ka·q·H a H/2 si hay
   sobrecarga.
3. **Sismo.** Mononobe-Okabe con KAE, kh ≈ A/2 (AASHTO 11.6.5: kh = 0,5·As si el muro puede desplazarse) y
   ΔEAE ≈ 0,6H (Seed-Whitman) o H/2.
4. **Estabilidad.**
   - FSvolteo = ΣMr/ΣMo ≥ 2,0 estático y ≥ 1,5 sísmico. En E.020/E.050 se usan valores de práctica de 1,5–2.
   - FSdesliz = μΣV(+Ep)/ΣH ≥ 1,5 estático y ≥ 1,25 sísmico.
   - Excentricidad e ≤ B/6, presiones qmax ≤ qa.
5. **Diseño.** Pantalla como voladizo con Mu y Vu en la base (a d). Talón con el peso del relleno menos la presión
   del suelo. Punta con la presión del suelo.

**Errores comunes**
- Contar el relleno sobre la punta como resistente al volteo.
- Usar el empuje pasivo completo. Se suele despreciar o reducir, y en el video de CalcBook faltaba multiplicar por Df.
- Aplicar el incremento sísmico a H/3.
- Olvidar el agua (drenaje).
- Factores de mayoración: el empuje de suelo se mayora con 1,7 en E.060, no con 1,4.

## 8. Albañilería confinada (E.070)

| Video | Canal | Contenido |
|---|---|---|
| [Análisis y Diseño de Muros de Albañilería Confinada - Norma E070](https://www.youtube.com/watch?v=bKjY43MuAeo) | Grupo Ingenia AIC · 2023 · 36 k vistas | Descripción: análisis en ETABS → **densidad mínima de muros** → diseño por carga vertical → **control de fisuración** → resistencia al corte del edificio y necesidad de refuerzo horizontal → **elementos de confinamiento**. |
| [CI5223 - Diseño de muros de albañilería confinada](https://www.youtube.com/watch?v=rD1UH6vPuGg) | Thomas Sturm (**U. de Chile**, FCFM) · 2021 | Clase universitaria, módulo 8 de *Diseño de Albañilería Estructural* (NCh2123). |
| [05. DISEÑO SÍSMICO EN ALBAÑILERÍA CONFINADA - ETABS](https://www.youtube.com/watch?v=Dt8DKUkGk3w) | EMEQ Ingenieros · 2 h | Modelamiento. |
| [DISEÑO DE UN MURO DE ALBAÑILERÍA E.070 Parte 1](https://www.youtube.com/watch?v=l5x7rtmkABE) | INEC Structural · dic 2025 | Ejemplo académico de un muro. |
| [ALBAÑILERÍA CONFINADA - Semana 3 Diseño por carga vertical](https://www.youtube.com/watch?v=hOsOeqJ_G_g) | — | Carga vertical. |

Referencia escrita principal: el ejemplo de Á. San Bartolomé (PUCP), *Ejemplo de aplicación de la Norma E.070 en el
diseño de un edificio de albañilería confinada* de 4 pisos (2006), que está en
[blog.pucp.edu.pe/albanileria](http://blog.pucp.edu.pe/blog/albanileria/). También la
[norma E.070 con comentarios](http://blog.pucp.edu.pe/blog/wp-content/uploads/sites/82/2008/01/Norma-E-070-MV-2006.pdf).

**Procedimiento (E.070)**
1. **Densidad mínima** (Art. 19.2b): ΣL·t/Ap ≥ Z·U·S·N/56, con t efectivo y solo muros con L ≥ 1,2 m.
2. **Esfuerzo axial máximo** (19.1b): σm = Pm/(L·t) ≤ 0,2f'm·[1 − (h/35t)²] ≤ 0,15f'm.
3. **Sismo moderado** (R = 6, que equivale a la mitad del severo). Control de fisuración: **Ve ≤ 0,55·Vm**.
4. **Resistencia al corte.** Vm = 0,5·v'm·α·t·L + 0,23·Pg, con α = Ve·L/Me entre 1/3 y 1 (arcilla).
   La misma fórmula vale para unidades de arcilla y de concreto. Para unidades sílico-calcáreas: Vm = 0,35v'm·α·t·L + 0,23Pg.
5. **Resistencia del entrepiso.** ΣVm ≥ VE (sismo severo). Si ΣVm > 3VE se puede omitir el diseño por corte.
6. **Factor de amplificación.** Vu = Ve·(Vm1/Ve1) entre 2 y 3. Mu = Me·(Vm1/Ve1).
7. **Confinamientos** (Art. 27). Columnas: Vc = 1,5·Vm·Lm/(L(Nc+1)), F = Mu/L, Pc, T = F − Pc, As ≥ T/(φfy) y
   Acf ≥ Vc/(0,2f'c·φ). Estribos: s1, s2, s3, s4. Viga solera: Ts = Vm·Lm/(2L).

**Errores comunes**
- Contar en la densidad los muros con L < 1,2 m o los no confinados.
- Usar el espesor bruto en lugar del efectivo, que descuenta el tarrajeo.
- Tomar Pg con CM + 100 % de la CV. Se usa CM + 25 % de la CV.
- Olvidar el factor 1/3 ≤ α ≤ 1.
- Diseñar las columnas con el sismo moderado en lugar del severo (Vm1/Ve1).

## 9. Puentes viga-losa AASHTO LRFD (y MTC)

| Video | Canal | Contenido |
|---|---|---|
| [DISEÑO DE PUENTE TIPO VIGA LOSA CON AASHTO LRFD](https://www.youtube.com/watch?v=SaiO1KbvHa0) | jhon muchica sillo · 2023 · 56 k vistas | 4 vigas, interiores y exteriores. |
| [DISEÑO DE PUENTES TIPO LOSA parte 1](https://www.youtube.com/watch?v=_uno3KIvhOk) | jhon muchica sillo · 100 k vistas | Introducción, predimensión y metrado. |
| [Diseño de puente viga (parte I)](https://www.youtube.com/watch?v=DhY1A-7_Ki4) | Ayuda Ingeniería | — |
| [DISEÑO DE SUPERESTRUCTURA DE PUENTE VIGA LOSA 8 de 8](https://www.youtube.com/watch?v=pLDSCLu3v10) | J. A. Loyo | Serie de 8 videos. |
| [Bridge Engineering Course - Lecture 04b Live Load Distribution Factors](https://www.youtube.com/watch?v=ZbXE1m1JtMQ) · [04a Live Loads](https://www.youtube.com/watch?v=tMXTJi3aaN4) | Structure Tutor · 2025 | Factores de distribución y carga viva. |
| [Precast Concrete - Example 2 - Live Load Distribution Factors](https://www.youtube.com/watch?v=KNuzaHoTGyk) | David Garber (curso universitario) | Tablas AASHTO 8.ª ed. y lever rule, en vigas interiores y exteriores. |
| [CURSO PUENTES - FILOSOFÍA DE DISEÑO AASHTO LRFD #1](https://www.youtube.com/watch?v=6kYRJ08VBrQ) | Kiketeenseña | Filosofía de diseño. |

Referencias escritas. Para comparar números:
[FHWA LRFD Steel Girder Design Example](https://www.fhwa.dot.gov/bridge/lrfd/us_ds3.cfm), cuyos factores de
distribución se reproducen exactamente en §12.12. En Perú: A. Rodríguez Serquén, *Puentes con AASHTO-LRFD*, y el
Manual de Puentes del MTC.

**Procedimiento**
1. Predimensión: losa tmin = (S+3000)/30 ≥ 165 mm y viga h ≈ 0,07L (Tabla 2.5.2.6.3-1).
2. **Carga viva HL-93.** Camión 35 + 145 + 145 kN (4,3 m; el segundo eje a 4,3–9,0 m) o tándem 2 × 110 kN a 1,2 m,
   más el carril de 9,3 kN/m. **IM = 33 %** solo para camión o tándem; para fatiga se usa 15 %.
3. **Factores de distribución** (4.6.2.2), sin el factor de presencia múltiple m porque ya está incluido.
   - Momento en viga interior, un carril: 0,06+(S/4300)^0,4(S/L)^0,3(Kg/(L·ts³))^0,1.
   - Momento en viga interior, dos o más carriles: 0,075+(S/2900)^0,6(S/L)^0,2(Kg/L·ts³)^0,1.
   - Corte: 0,36+S/7600 y 0,2+S/3600−(S/10700)².
   - Viga exterior: ley de palanca con m = 1,2, o g = e·g_int con e = 0,77+de/2800.
4. Combinaciones. Resistencia I: 1,25DC + 1,50DW + 1,75(LL+IM). Servicio I. Fatiga I: 1,75 (desde la 7.ª ed., 2014).
5. Diseño a flexión de la viga T (ancho efectivo), corte (método simplificado β = 2, θ = 45° o MCFT), losa por el
   método de franjas y volado con la carga de colisión.

**Errores comunes**
- Aplicar el IM a la carga de carril.
- Usar el factor de presencia múltiple junto con las fórmulas de g, que ya lo incluyen. Con la ley de palanca sí
  se aplica m.
- Kg sin el factor n (Kg = n(I + A·eg²)).
- Unidades mezcladas: las fórmulas US llevan S y L en ft y las SI en mm.

## 10. Estructuras metálicas, naves y galpones (AISC 360 / E.090 / NCh2369)

| Video | Canal | Contenido |
|---|---|---|
| [Diseño de Nave Industrial con ETABS v19 · Verificaciones AISC · Sesión 1](https://www.youtube.com/watch?v=89gRF8dqwmA) · Sesión 2 | Ingeniería Responsable Global · 61 k vistas | Modelo de pórticos, perfiles, apoyos y cargas. Verificación con AISC 360. |
| [DISEÑO DE ESTRUCTURAS DE ACERO CON AISC 360 (1/11)](https://www.youtube.com/watch?v=lsUZsRyXYLc) … [(11/11)](https://www.youtube.com/watch?v=Kshc0ERF86o) | Academia Estructural | Curso de 11 sesiones. |
| [Diseño de columna de acero con carga axial AISC-360-16](https://www.youtube.com/watch?v=okkanm-uzGQ) | Ronald Soto | Trae un PDF del ejemplo en Mega. |
| [¿Cómo diseño una columna de acero en Compresión?](https://www.youtube.com/watch?v=_NzvuDjRLzo) | EstructuraTEC21 · 79 k vistas | Pandeo flexional y flexotorsional. |
| [Pandeo lateral-torsional y su influencia en la resistencia de vigas](https://www.youtube.com/watch?v=QtyGWZDPtCI) | **AISC Education** (webinar en español) | Pandeo lateral-torsional. |
| [Lateral-Torsional Buckling (AISC 360)](https://www.youtube.com/watch?v=euEbFro70uI) | CalcBook | — |
| [NCh2369:2025 en la práctica · Ejemplo real · Parte 3](https://www.youtube.com/watch?v=0E3SgupJMsw) · [Parte 1 marcos arriostrados](https://www.youtube.com/watch?v=lxnuPHlJ9kg) | IGR Ingeniería · 2026 | **NCh2369:2025**: parámetros, espectro, cálculo a mano e interpretación. |
| [NCh2369-2023 Diseño de Estructuras Industriales: Cambios](https://www.youtube.com/watch?v=o0euvzT6ouI) | CPL Ingeniería · 2:12 h | Cambios de la norma. |

**Procedimiento (AISC 360-16, LRFD)**
1. **Compresión (cap. E).** Fe = π²E/(Lc/r)². Si Fy/Fe ≤ 2,25: Fcr = 0,658^(Fy/Fe)·Fy; si no, Fcr = 0,877Fe.
   φPn = 0,9·Fcr·Ag. Con elementos esbeltos se usa Ae (E7).
2. **Flexión (F2).** Mp = Fy·Zx y Lp = 1,76·ry·√(E/Fy).
   Lr = 1,95·rts·(E/0,7Fy)·√(J·c/(Sx·ho) + √((J·c/(Sx·ho))² + 6,76(0,7Fy/E)²)).
   Entre Lp y Lr se interpola linealmente con Cb. Más allá de Lr: Fcr = Cb·π²E/(Lb/rts)²·√(1+0,078·J·c/(Sx·ho)·(Lb/rts)²).
3. **Interacción (H1).** Pr/Pc ≥ 0,2 → Pr/Pc + 8/9(Mrx/Mcx + Mry/Mcy) ≤ 1. Si no, Pr/2Pc + (...) ≤ 1.
4. **Estabilidad (cap. C).** Método de análisis directo con 0,8τb·EI y 0,8EA, más cargas ficticias de 0,002Yi.
5. **Nave.** Viento (E.020, ASCE 7 o NCh432), pórticos a dos aguas, correas, arriostres y deflexiones L/180–L/240.

**Errores comunes**
- Usar K = 1 en un pórtico no arriostrado sin hacer análisis de segundo orden.
- Olvidar Cb, o usar Cb > 1 en voladizos sin arriostrar.
- No revisar la esbeltez local (λ > λr).
- En naves: no considerar la succión del viento en el ala inferior no arriostrada.

## 11. Dinámica estructural, espectros y pushover (en inglés)

| Video | Canal | Contenido |
|---|---|---|
| [Unit 5.4 - Numerical Methods: Newmark's Method](https://www.youtube.com/watch?v=LR2QLA73NSc) | VIBEs Lab | Basado en Chopra. |
| [W05M04 Numerical Methods based on Variation of Acceleration - Newmark's Method](https://www.youtube.com/watch?v=doVJg4F264I) | NPTEL *Structural Dynamics* | Curso universitario. Usa Chopra como texto. |
| [Dynamics of Structures - lecture 11: Newmark time integration](https://www.youtube.com/watch?v=DfjKJHqmRNE) | **DTU** · 1:22 h | Clase universitaria. |
| [Nonlinear Dynamic Analysis - Newmark Method](https://www.youtube.com/watch?v=wG7kbJc8h5w) | Dremph | Caso no lineal. |
| [Building response spectrum by Newmark Method](https://www.youtube.com/watch?v=Xldzdm9amek) | — | El Centro 1940. |
| [Python: Plot Pseudo Response Spectrum for El Centro Data](https://www.youtube.com/watch?v=LEZgqRfecFE) | Engineer Hunter · 42 min | Espectro en Python. |
| [DirectionalitySpectra](https://www.youtube.com/watch?v=EFnHXJhjlhE) | Luis A. Montejo | Autor de herramientas abiertas de espectros (RotD) y de ajuste espectral. |
| [Introduction to pushover analysis and capacity spectrum method](https://www.youtube.com/watch?v=Ev_-RNjoQfU) | Mohamed Adel | — |
| [Capacity Spectrum Method](https://www.youtube.com/watch?v=edo0bPfPPh0) | Seismic Design - Performance-Based and Codal | — |
| [Performance Based Seismic Evaluation in ETABS · FEMA 440 EL and ASCE 41-13 NSP](https://www.youtube.com/watch?v=IpYnvH86-cw) | Real civil | FEMA 440 y ASCE 41-13. |
| [6 - Métodos para determinar el desplazamiento objetivo o punto de desempeño](https://www.youtube.com/watch?v=qzgZ_DJtEU0) | Fawad Najam | Desplazamiento objetivo. |
| [KB 001829 · Bilinearization for Pushover Curve (N2 Method)](https://www.youtube.com/watch?v=yhkeZytECDo) | Dlubal | Bilinealización N2. |
| [Pushover Curve Analysis According to Eurocode 8 – Step-by-Step](https://www.youtube.com/watch?v=oj1o8NwG9qo) | SeismiC-Structures | EC8 paso a paso. |
| [Learning OpenSees - Monotonic Pushovers](https://www.youtube.com/watch?v=n6Ju3OIsdxM) · [Introduction to OpenSees - steel moment frames](https://www.youtube.com/watch?v=-CDqsb8HyPI) | C. Slotboom · Ahmed Elkady | OpenSees. |
| [Guía de análisis de marcos de OpenSeesPy](https://www.youtube.com/watch?v=ngPCqvl-5dA) | EngineeringSkills | OpenSeesPy. |

**Japón (BSL).**
- [高さ方向の分布係数Ａiを征服！](https://www.youtube.com/watch?v=-LHgK-hi5b4) (ミカオ建築館): distribución Ai.
- [層せん断力係数Ｃiって何？](https://www.youtube.com/watch?v=1i_692jvOPI): coeficiente de cortante Ci.
- [RCラーメン構造の保有水平耐力計算の手順](https://www.youtube.com/watch?v=HocX6AxbuVk): procedimiento de capacidad lateral última (保有水平耐力) de pórticos RC, Qu ≥ Qun = Ds·Fes·Qud.
- [崩壊形について](https://www.youtube.com/watch?v=bFsRuOPOGUE): mecanismos de colapso.

**Chile, otros.**
- [Actualización NCh433:2026](https://www.youtube.com/watch?v=RCerVDCGXd4) (Colegio de Ingenieros de Chile, 1 sep 2026, 3:19 h).
- [CALCULO DE Esfuerzo de corte Basal NCH 433](https://www.youtube.com/watch?v=vYURI2aYC5c) y [ESFUERZO DE CORTE BASAL // ANÁLISIS ESTÁTICO NCH433](https://www.youtube.com/watch?v=i1sAYtKBHCY) (Ciencias con Samu).
- [Ejercicio Fuerzas Sísmicas NCh433 Parte 1](https://www.youtube.com/watch?v=7ziOTV5bHg0) (D. Quezada): CESFAM de 3 pisos con muros de HA, masa sísmica y coeficiente sísmico.
- [SEPARACIÓN entre EDIFICACIONES NCh433+DS61](https://www.youtube.com/watch?v=RGkiitGCZQE).

---

## 12. Ejemplos numéricos para validar

Tolerancia sugerida para los tests: 0,5 % o la última cifra mostrada.

- **✔ = coincide con una fuente publicada.** La fuente se indica en cada caso.
- **◆ = caso de control calculado por el investigador** con fórmulas normativas. Es reproducible a mano.

### 12.1 SDOF lineal, Newmark ✔ (Chopra, ejemplos 5.1, 5.3 y 5.4)
- **Datos:** m = 0,2533 kip·s²/in, k = 10 kip/in, c = 0,1592 kip·s/in. Con eso Tn = 1,0 s y ζ = 5 %.
  Carga p(t) = 10·sin(πt/0,6) kip para t ≤ 0,6 s y 0 después. Δt = 0,1 s, con u0 = v0 = 0.
- **Resultados de u (in):**

| t (s) | 0,1 | 0,2 | 0,3 | 0,4 | 0,5 | 0,6 | 0,7 | 0,8 | 0,9 | 1,0 |
|---|---|---|---|---|---|---|---|---|---|---|
| Aceleración promedio (γ=½, β=¼) | 0,0437 | 0,2326 | 0,6121 | 1,0825 | 1,4309 | 1,4230 | 0,9622 | 0,1908 | −0,6043 | −1,1441 |
| Aceleración lineal (γ=½, β=⅙) | 0,0300 | 0,2193 | 0,6166 | 1,1130 | 1,4782 | 1,4625 | 0,9514 | 0,1273 | −0,6954 | −1,2208 |
| Interpolación exacta de la excitación (Chopra 5.2) | 0,0318 | 0,2274 | 0,6336 | 1,1339 | 1,4895 | 1,4480 | 0,9036 | 0,0579 | −0,7577 | −1,2432 |
| Solución teórica (Δt → 0) | 0,0328 | 0,2332 | 0,6487 | 1,1605 | 1,5241 | 1,4813 | 0,9245 | 0,0593 | −0,7751 | −1,2717 |

- **Coeficientes de recurrencia de Chopra 5.2** con estos datos: A = 0,8129, B = 0,0907, C = 0,0124, D = 0,0064,
  A' = −3,5796, B' = 0,7559, C' = 0,1709, D' = 0,1871.

### 12.2 SDOF elastoplástico, Newmark + Newton-Raphson ◆ (mismos datos que el 12.1, fy = 7,5 kip)
- **u (in):** 0, 0,0437, 0,2326, 0,6121, 1,1143, 1,6214, 1,9891, 2,0951, 1,9240, 1,5602, 1,1415.
- **fS (kip):** 0, 0,437, 2,326, 6,121, 7,500, 7,500, 7,500, 7,500, 5,789, 2,151, −2,037.
- La fluencia empieza entre 0,3 y 0,4 s y la descarga elástica a partir de 0,8 s. Se usó una tolerancia de
  1e-3 kip. Este caso reproduce el planteamiento de Chopra, ejemplo 5.5.

### 12.3 Espectro de respuesta de El Centro 1940 NS ✔ (Chopra, Fig. 6.4.1)
- **Registro:** [vibrationdata.com/elcentro.dat](https://www.vibrationdata.com/elcentro.dat), Δt = 0,02 s,
  1 562 puntos y PGA = 0,3188 g. Se usó g = 386,09 in/s².
- **ζ = 2 %**, método de Nigam-Jennings:

| Tn | D (in) | PSA/g |
|---|---|---|
| 0,5 s | **2,67** | 1,094 |
| 1,0 s | **5,97** | 0,610 |
| 2,0 s | **7,47** | 0,191 |
| 3,0 s | 15,54 | — |

  Los valores de D coinciden con Chopra: 2,67, 5,97 y 7,47 in. Newmark de aceleración promedio con el mismo Δt da
  2,68, 5,93 y 7,47.
- **ζ = 5 %**: D = 2,24, 4,44, 5,37 y 10,81 in, y PSA/g = 0,916, 0,454, 0,137 y 0,123 (Tn = 0,5, 1, 2 y 3 s).

### 12.4 Edificio de cortante de 5 pisos ✔ (Chopra, cap. 12 y 13)
- **Datos:** m = 100 kip/g por piso, k = 31,54 kip/in por entrepiso y h = 12 ft.
- **Períodos (s):** 2,0007, 0,6854, 0,4348, 0,3385 y 0,2967. Chopra da 2,0, 0,685, 0,435, 0,338 y 0,297.
- **Modo 1:** φ (techo = 1) = 0,285, 0,546, 0,764, 0,919 y 1,000. Γ1 = 1,0674 (normalizado en masa) y M1*/M = 0,8795.
- **Masa efectiva:** 87,95 %, 8,72 %, 2,42 %, 0,75 % y 0,16 %.
- **El Centro, ζ = 5 %, tiempo-historia por superposición modal exacta:**
  - u5,max = **6,840 in** y Vb,max = **73,20 kip**, con Vb/W = 0,146. Chopra reporta u5 ≈ 6,85 in y
    Vb ≈ 73,3 kip.
  - Contribución modal al techo: 6,732, 0,936, 0,237, 0,055 y 0,010 in.
  - Contribución modal a Vb: 60,43, 24,52, 9,80, 2,90 y 0,59 kip.
- **RSA con el espectro exacto del registro:**
  - Techo: SRSS 6,801 in y CQC 6,793 in.
  - Vb: SRSS 66,02 kip y CQC 66,45 kip.
  - Dn = 5,378, 2,584, 1,497, 0,866 y 0,644 in. An/g = 0,137, 0,563, 0,810, 0,773 y 0,747.

### 12.5 Coeficiente CQC ρij ✔ (Der Kiureghian 1981, ζi = ζj)

| β = ωj/ωi | 0,5 | 0,8 | 0,9 | 0,95 | 1,0 |
|---|---|---|---|---|---|
| ζ = 5 % | 0,0185 | 0,1656 | 0,4730 | 0,7914 | 1 |
| ζ = 2 % | 0,0030 | 0,0308 | 0,1257 | 0,3780 | 1 |

### 12.6 Punto de desempeño ATC-40 (Procedimiento A) ✔ (SOFiSTiK BE36, que reproduce ATC-40 §8.3.3.3)
- **Datos:**
  - Capacidad (Sd en mm, Sa en m/s²): O(0,0), A(48,77; 2,49), B(71,37; 3,03), C(96,01; 3,39) y D(199,14; 3,73).
  - Demanda: espectro UBC al 5 %, Z = 0,40, suelo SB (Ca = Cv = 0,40) y suelo SD (Ca = 0,44, Cv = 0,64).
  - **Comportamiento estructural tipo C (κ = 0,33)**. El benchmark solo se reproduce con este tipo; con κ = 1 sale
    otro resultado.
- **Resultados:**

| Suelo | βeff | SRA | SRV | Sdy | Say | Sdp | Sap |
|---|---|---|---|---|---|---|---|
| SB, referencia | 9,2 % | 0,80 | 0,85 | 53,34 mm | 2,65 | 83,36 mm | 3,24 |
| SB, SOFiSTiK | 9,4 % | — | — | — | — | 85,04 mm | 3,23 |
| SB, implementación JS (§algoritmos) | 9,41 % | 0,795 | 0,843 | 51,40 mm | 2,624 | 85,55 mm | 3,237 |
| SD, referencia | 14,2 % | 0,66 | 0,74 | 58,42 mm | 3,04 | 149,86 mm | 3,63 |
| SD, SOFiSTiK | 14,6 % | — | — | — | — | 149,34 mm | 3,57 |
| SD, implementación JS | 14,63 % | 0,654 | 0,733 | 59,87 mm | 3,057 | 150,32 mm | 3,569 |

- **Tolerancia:** ±3 %. La bilinealización gráfica de ATC-40 es aproximada.

### 12.7 Pushover de cortante de 3 pisos + N2 (EC8 Anexo B) ◆
- **Datos:**
  - Masas 100, 100 y 80 t (del piso 1 al 3).
  - Rigidez de entrepiso 80 000, 70 000 y 60 000 kN/m.
  - Vy de entrepiso 1 500, 1 300 y 1 000 kN, con α = 0,05.
  - Alturas 3,5, 3 y 3 m.
- **Modal:** T1 = 0,4899 s y T2 = 0,1866 s. φ1 normalizado al techo = 0,4092, 0,7807 y 1,0000.
  m* = Σmiφi = 198,98 t y Γ = 1,2619.
- **Patrón de carga** s = m·φ. La primera fluencia ocurre en el entrepiso 1, con Vb = 1 500 kN y δtecho = 45,82 mm.
- **Espectro:** EC8 tipo 1, ag = 0,30g, suelo C (S = 1,15, TB = 0,20, TC = 0,60, TD = 2,0).
- **N2 (iterado, bilineal EPP de áreas iguales hasta dm):**
  - Fy* = 1 260,3 kN, dy* = 39,47 mm, T* = 0,4960 s y Se(T*) = 0,8625 g.
  - qu = 1,336, det* = 52,72 mm y **dt* = 55,50 mm**. Por eso **δtecho = 70,04 mm**.
  - Cortante en el objetivo: Vb = 1 590 kN.
  - Derivas: 41,34, 18,05 y 10,66 mm, es decir 0,0118, 0,0060 y 0,0036.

### 12.8 Otros algoritmos ◆ / ✔
- **Condensación estática de un pórtico.** k·h³/EIc = 24(12ρ+1)/(12ρ+4), con ρ = (EIb/L)/(2EIc/h) (✔ Chopra,
  Ec. 1.3.5). Para ρ = 0, 0,125, 0,5, 1 y ∞ da 6, 10,909, 16,8, 19,5 y 24.
- **Rayleigh.** Con ζ = 5 % en T = 1,0 s y T = 0,2 s: a0 = 0,52360 s⁻¹ y a1 = 0,002653 s. En T = 0,5 s la
  ζ resultante es 3,75 %.
- **P-Delta** (mismo edificio que el 12.7, con P = Σmg acumulado = 2 746,8, 1 765,8 y 784,8 kN).
  - T1 pasa de 0,4899 a 0,4920 s.
  - Con F = 100, 200 y 300 kN, las derivas pasan de 7,500, 7,143 y 5,000 mm a 7,574, 7,203 y 5,022 mm.
  - θ = 0,0098, 0,0084 y 0,0044. La amplificación 1/(1−θ) = 1,0099, 1,0085 y 1,0044 coincide con el cociente exacto.
- **Mander** (fco = 30 MPa, f'l = 3 MPa en ambas direcciones, Ec = 5000√fco):
  - f'cc = 46,95 MPa, εcc = 0,00765 y r = 1,289.
  - σ(0,002) = 33,93 MPa y σ(0,010) = 46,50 MPa.
- **Momento-curvatura por fibras.**
  - Sección b = 300 mm, h = 500 mm, f'c = 28 MPa (Hognestad), fy = 420 MPa con acero EPP. As inferior = 1 530 mm²
    a d = 440 mm y As superior = 398 mm² a 60 mm.
  - Resultados: φy = 7,75e-6 1/mm, My = 246,9 kN·m, φu = 4,40e-5 1/mm con εcu = 0,0038 y Mu = 257,3 kN·m.
  - Comparación a mano, sección fisurada sin acero superior: k = 0,3485, My = 249,9 kN·m y φy = 7,33e-6.
    Mn de Whitney (ACI) = 253,8 kN·m.
- **Acelerograma compatible con el espectro** (tipo SIMQKE, semilla 12345). Objetivo: E.030 elástico con Z4, S2
  (S = 1,05, TP = 0,6 s, TL = 2,0 s), R = 1 y ζ = 5 %.
  - Iteración 0: razón espectro/objetivo entre 0,99 y 5,07.
  - Tras 12 iteraciones: entre 0,947 y 1,188, con media 1,018, en el rango 0,03–4 s.
  - PGA sintético = 0,526 g, frente a ZUS = 0,473 g.

### 12.9 Normativos Perú (E.030 / E.060 / E.070) ◆
- **E.030-2018, estático.** Pórticos de concreto (R0 = 8, regular), Lima Z4, S1 (S = 1,0, TP = 0,4, TL = 2,5),
  U = 1,0.
  - Datos: 5 pisos con alturas 3,5 + 4 × 3 m (hn = 15,5 m) y pesos Pi = 420, 400, 400, 400 y 300 t
    (P = 1 920 t).
  - T = 15,5/35 = **0,4429 s** > TP, así que C = 2,5·0,4/0,4429 = **2,2581** y C/R = 0,2823 ≥ 0,11.
  - ZUCS/R = 0,12702, V = **243,87 t** y k = 1.
  - **Fi (t) = 20,46, 36,19, 52,89, 69,60 y 64,73.**
- **Caso 2, T = 0,70 s con S2 de 2018** (S = 1,05, TP = 0,6): C = 2,1429, k = 1,100 y ZUCS/R (R = 6) = 0,16875.
- **E.030-2026, mismo edificio con S2 y Vs30 = 450 m/s.**
  - Interpolando: S = 1,05, TP = 0,50 s y TL = 2,25 s. Se supone que S = 1,00, TP = 0,4 y TL = 2,5 corresponden a
    Vs = 550 m/s, y S = 1,10, TP = 0,6 y TL = 2,0 a Vs = 350 m/s.
  - T = 0,4429 < TP, así que C = 2,5 y **V = 0,45·1·2,5·1,05/8·1 920 = 283,5 t**.
- **E.030-2026, junta sísmica:** s = 0,02·0,45·1,0·15,5 = **0,140 m**. Con la fórmula de 2018 daba 0,006·15,5 = 0,093 m.
- **E.060, viga** (b = 25 cm, h = 50 cm, d = 44 cm, f'c = 210, fy = 4200 kgf/cm², Mu = 15 t·m).
  - **As = 10,11 cm²** con a = 9,52 cm. As,min = 2,66 cm², ρb = 0,02125 y As,max = 17,53 cm².
  - Con 3 φ1" (15,21 cm²): φMn = 21,18 t·m.
  - Corte: Vc = 8 448 kgf y φVc = 7 181 kgf. Con Vu = 14 t, Vs = 8 022 kgf y estribos φ3/8" de 2 ramas,
    s = 32,7 cm. **Controla smax = d/2 = 22 cm.**
- **E.060, zapata aislada** (PD = 60 t, PL = 25 t, qa = 20 t/m², columna 40 × 40 cm, f'c = 210, fy = 4200).
  - Az = 85·1,05/20 = 4,463 m², así que **B = L = 2,15 m**. Pu = 126,5 t y qu = 27,366 t/m².
  - d mínimo por punzonamiento = **0,31 m**: Vu = 112,7 t ≤ φVc = 114,95 t.
  - Con h = 0,60 m y d = 0,50 m: punzonamiento Vu = 104,33 t ≤ φVc = 235,02 t. Corte en una dirección
    Vu = 22,06 t ≤ φVc = 70,18 t.
  - Flexión: Mu = 22,52 t·m y As = 12,08 cm². **Controla As,min = 0,0018·215·60 = 23,22 cm².**
- **Zapata combinada, dimensionamiento.**
  - Columna exterior P1 = 60 t en el lindero (eje en x = 0,20 m) y P2 = 90 t en x = 5,20 m, con qa = 20 t/m².
  - x̄ = (60·0,2 + 90·5,2)/150 = 3,20 m, así que L = 6,40 m. B = 150/(20·6,40) = 1,17, que se redondea a **1,20 m**.
- **E.070** (Z4, U = 1, S = 1,05, N = 4 pisos): densidad mínima ΣLt/Ap ≥ **0,03375**.
  - Muro con v'm = 81 t/m², t = 0,13 m, L = 4 m, Pg = 20 t y α = 1: **Vm = 25,66 t**. Fisuración: Ve ≤ 0,55Vm = 14,11 t.
  - Con f'm = 650 t/m² y h = 2,4 m: σadm = 93,83 t/m², así que Pm,max = 48,79 t.

### 12.10 Chile (NCh433 Mod.2009 + DS61) ◆
- **Datos:** zona 3 (A0 = 0,40g), suelo C (S = 1,05, T0 = 0,40, T' = 0,45, n = 1,40, p = 1,6), categoría II
  (I = 1,0), muros de HA (R = 7, R0 = 11) y T* = 0,50 s.
- **Coeficiente sísmico.** C = 2,75·S·A0/R·(T'/T*)^n = **0,14237**. Cmin = A0·S/6 = 0,0700 y
  Cmax = 0,35·S·A0 = 0,1470, así que se usa C = 0,14237.
- **Peso y corte basal.** 8 pisos de 3 m, con P = 7 × 500 + 420 = 3 920 t. **Q0 = 558,10 t**.
- **Ak** (Ak = √(1−Zk−1/H) − √(1−Zk/H), suman 1): 0,0646, 0,0694, 0,0755, 0,0835, 0,0947, 0,1124, 0,1464 y 0,3536.
- **Fk (t):** 38,21, 41,05, 44,64, 49,37, 56,04, 66,48, 86,63 y 175,68.
- **Espectro.** α(T) = (1 + 4,5(T/T0)^p)/(1 + (T/T0)³). α(0,5) = 2,5163 y α(0) = 1. El máximo es 2,7773, en T = 0,360 s.
- **Factor de reducción y Sa.** R* = 1 + T*/(0,10·T0 + T*/R0) = 6,8511 para T* = 0,5. Sa/g(0,5) = S·A0·α/(R*/I) = 0,1543.

### 12.11 Japón (BSL / 建築基準法施行令 88条) ◆
- **Datos:** 5 pisos, h = 17,5 m, concreto (T = 0,02h = 0,35 s), suelo tipo 2 (Tc = 0,6 s), Z = 1,0 y C0 = 0,2.
  Pesos Wi = 600, 600, 600, 600 y 500 kN, de abajo arriba.
- **Rt = 1,0** porque T < Tc.

| Piso | αi | Ai | Ci | Qi (kN) |
|---|---|---|---|---|
| 1 | 1,000 | 1,0000 | 0,2000 | 580,0 |
| 2 | 0,793 | 1,1126 | 0,2225 | 511,8 |
| 3 | 0,586 | 1,2458 | 0,2492 | 423,6 |
| 4 | 0,379 | 1,4249 | 0,2850 | 313,5 |
| 5 | 0,172 | 1,7635 | 0,3527 | 176,3 |

  con Ai = 1 + (1/√αi − αi)·2T/(1+3T).
- **Rt en otros períodos:** Rt(T = 1,0; Tc = 0,6) = 1 − 0,2(T/Tc − 1)² = 0,9111 y Rt(T = 1,5) = 1,6Tc/T = 0,6400.

### 12.12 AASHTO LRFD ✔ / ◆
- **Factores de distribución del ejemplo FHWA de vigas de acero** (S = 9,75 ft, L = 120 ft, Kg = 818 611 in⁴,
  ts = 8 in). Coinciden exactamente con FHWA (✔):
  - Momento, un carril **0,472** y dos carriles **0,696**.
  - Corte, un carril **0,750** y dos carriles **0,935**.
  - Viga exterior, ley de palanca con m = 1,2: 0,892. Dos carriles: 0,727 (momento) y 0,795 (corte).
  - IM = 0,33 y 0,15 para fatiga.
- **HL-93, viga simplemente apoyada, momento máximo por carril (kN·m)** ◆:

| L | Camión | Tándem | Carril | 1,33·max + carril |
|---|---|---|---|---|
| 10 m | 446,8 | **486,0** | 116,3 | 762,6 |
| 20 m | **1 246,6** | 1 035,0 | 465,0 | 2 123,0 |
| 30 m | **2 056,2** | 1 584,7 | 1 046,3 | 3 781,0 |

  En luces cortas controla el tándem.

### 12.13 AISC 360-16 ✔ / ◆
- **W18×50, A992.** ✔ Coincide con el ejemplo F.1-1A y las tablas del Manual AISC.
  - Lp = **5,83 ft**, Lr = **16,9 ft** y φbMp = **379 kip·ft**.
  - Mu de F.1-1A (L = 35 ft, wu = 1,2·0,45 + 1,6·0,75 = 1,74 klf) = **266,4 kip·ft**.
  - ◆ Con Lb = 11,67 ft y Cb = 1,01: φMn = 305,4 kip·ft. Con Lb = 35 ft y Cb = 1,14: φMn = 94,4 kip·ft
    (pandeo elástico).
- **W14×90, columna** (A = 26,5 in², ry = 3,70 in) ◆:
  - Lc = 20 ft: KL/r = 64,9, Fe = 68,03 ksi, Fcr = 36,76 ksi y φPn = **877 kips**.
  - Lc = 30 ft: KL/r = 97,3, Fcr = 25,02 ksi y φPn = **597 kips**.

### 12.14 Muro de contención en voladizo ◆
- **Datos:**
  - H = 4,0 m, relleno con γ = 1,8 t/m³ y φ = 30° (Ka = 1/3), sin sobrecarga, μ = 0,5.
  - Geometría: B = 2,6 m, punta 0,6 m, pantalla 0,30 m (constante), zapata 0,40 m y γc = 2,4.
- **Empuje:** Ea = 4,800 t/m y Mo = 6,400 t·m/m.
- **Estabilidad:**
  - W = 16,104 t/m y Mr = 24,467 t·m/m. Así **FSvolteo = 3,82** y **FSdesliz = 1,68**.
  - e = 0,178 m < B/6. qmax = 8,74 t/m² y qmin = 3,65 t/m².
- **Mononobe-Okabe** (kh = 0,15, kv = 0, δ = 0): KAE = 0,4329, EAE = 6,234 t/m y ΔEAE = 1,434 t/m.
