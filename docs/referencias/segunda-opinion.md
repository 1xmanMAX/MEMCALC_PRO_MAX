# Segunda opinión transversal: 20 plantillas de mayor riesgo y uso

Revisor: ingeniero jefe (segunda opinión, criterio de revisor de expedientes municipales y del MTC). Fecha: octubre de 2026.
Alcance: 20 plantillas que ya tenían una revisión por módulo (`revision-*.md`). Cada una se ejecutó con los datos por
defecto (`tests/helpers.mjs` → `runTemplate`) y con cambios realistas de datos: otra zona, otro suelo, cargas mayores,
geometría rectangular y nivel freático alto. Las memorias de *zapata*, *columna* y *an-portico-ca* se revisaron además
renderizadas (`node build.mjs` + `tools/shot.mjs --paper`).

Solo se editaron `src/templates.js`, `src/templates/{peru,concrete,geotech,analysis}.js` y las pruebas
(`tests/verify.mjs`, `tests/{concrete,geotech,analysis,peru}.test.mjs`). Al final, `node tests/run.mjs` pasa completo.

**Gravedad.** **Alta**: no conservador, o puede aprobar un diseño que no cumple. **Media**: falta un requisito
normativo que puede gobernar. **Baja**: coherencia, presentación o buena práctica.

## Resumen

| Plantilla | Veredicto | Hallazgos principales | Corregido |
|---|---|---|---|
| pe-e030-estatico | Apta, con correcciones | Sin control P-Δ; `irr` no se contrastaba con Ia·Ip evaluados | Sí |
| pe-e030-dinamico | Apta, con correcciones | `irr` independiente de Ia·Ip (0.75R y 80 % con estructura irregular) | Sí |
| sismo | Apta | `hn` y `hi` podían ser incoherentes | Sí |
| viga | Apta, con corrección | Dibujo con 2#4 superior < As,mín | Sí |
| columna | **Corregida (Alta)** | φ por deformación del bloque `pm`: φMn hasta 19 % mayor que con E.060 9.3.2.2 | Sí (bloque `pmgen`) |
| zapata | **Corregida (Media)** | Diseño solo con 1.4CM+1.7CV; faltaba 1.25(CM+CV)±CS; faltaba aplastamiento | Sí |
| co-placa | Apta | Sin observaciones relevantes | — |
| co-colductil (pedida como «co-colsismica») | **Corregida (Alta)** | Vc ≠ 0 con Pu < Ag f'c/20; d y núcleo con la dimensión equivocada en secciones rectangulares | Sí |
| co-nudo | Apta | Supone vigas centradas (bj) | Nota |
| co-losa2d | Apta | — | — |
| ge-portante | Apta | — | — |
| ge-combinada | Apta, con observación | Sin combinaciones sísmicas (como la zapata aislada) | No (recomendación) |
| ge-conectada | **Corregida (Media)** | La zapata interior se diseñaba con todo el alivio de la viga de conexión | Sí |
| wa-voladizo | Apta | S por la tabla de la E.030-2018 (no por Vs30 de 2026) | No (observación) |
| br-vigalosa | Apta | — | — |
| br-estribo | Apta, con observación | Faltan el diseño del parapeto y de la cajuela | No (recomendación) |
| st-nave | Apta | — | — |
| st-casa | Apta, con observación | Conexiones de OCBF/OMF con Ω0 solo como nota | No |
| ma-edificio | Apta | Me = Ve·hM en voladizo (conservador, declarado) | — |
| an-portico-ca | **Corregida (Alta)** | Pórtico con R = 8 sin cortante por capacidad (E.060 21.5.4.1); so sin 8db/24de | Sí |

## Detalle por plantilla

### 1. pe-e030-estatico (E.030-2026, edificio dual de 5 pisos)
**Veredicto: apta para firma, con dos correcciones.** Con los datos por defecto: peso de 0.84 t/m², V/P = 0.173,
TR = 0.44 s frente a hn/CT = 0.25 s y deriva máxima en el extremo de 0.0067, con D/C 0.96 frente a 0.007. Estos valores
coinciden con la práctica para un dual de 5 pisos en Lima. Cambios probados: zona 2; Vs30 = 180 m/s (en zona 4 da
error de sitio, ver M3); Vs30 = 900 m/s; categoría A2/B; sistema de pórticos; Ia = 0.75. En todos los casos la
respuesta es coherente: la deriva no cumple cuando debe.

| Hallazgo | Gravedad | Cita | Corrección |
|---|---|---|---|
| No se evaluaba el índice de estabilidad (efectos P-Δ). | Media | E.030, índice Q = Ni·Δi/(Vi·hei·R) ≤ 0.10; ASCE 7-22 §12.8.7 | `Ni`, `Q` (vector) y `check max(Q) <= 0.10`. Valor por defecto: Q = 0.004. |
| `irr` (0.75R / 0.85R) es un dato independiente. Si *irregE030* evalúa la estructura como irregular y el usuario deja «Regular», las derivas quedan sin conservadurismo. | Media | E.030-2026 Art. 50.1–50.2 | `check irr >= si(Ia_ev*Ip_ev < 1, 1, 0)`. |

### 2. pe-e030-dinamico
**Veredicto: apta.** T1 = 0.441 s, Vdin = 185.8 t ≥ 0.80·Vest y deriva en el extremo de 0.0058. El CQC está validado
con numpy.

| Hallazgo | Gravedad | Cita | Corrección |
|---|---|---|---|
| Con Ia o Ip < 1 y `irr = 0` se usaban 0.75R y el 80 % del cortante estático, cuando corresponden 0.85R y el 90 %. | Media | E.030-2026 Art. 44.1 y 50.2 | `check irr >= si(Ia*Ip < 1, 1, 0)`, con prueba en `peru.test.mjs`. |
| No incluye P-Δ (modelo plano). | Baja | — | Queda en las notas; el modelo 3D lo cubre. |

### 3. sismo (versión rápida)
**Veredicto: apta.** V = 125.9 t para 790 t (V/P = 0.159) con pórticos, R = 8 y deriva de 0.0062.

| Hallazgo | Gravedad | Cita | Corrección |
|---|---|---|---|
| `hn` es un dato y `hi` es un vector aparte. Si no coinciden, T, la aplicabilidad (Art. 33.2) y la Tabla 13 se calculan con otra altura. | Baja | Art. 33.2, 36.1 | `check abs(max(hi) - hn) <= 0.05 m`, con prueba de dato extremo. |

### 4. viga
**Veredicto: apta.** Con Mu = 22 t·m en una sección de 30×60, ρ = 0.72 %, 5Ø3/4" y estribos #3 @ 25. Con
Mu = 40 t·m y Vu = 35 t avisa de que las 9 barras no caben en una capa (7.6.1), lo que es correcto.

| Hallazgo | Gravedad | Cita | Corrección |
|---|---|---|---|
| La figura dibujaba siempre 2#4 superiores (2.58 cm²) con As,mín = 3.92 cm²: el plano saldría por debajo del refuerzo continuo mínimo. | Media (plano) | E.060 10.5.2, 21.4.4.1 | `barsup` (lista), `nsup = max(2, ceil(Asmin/Ab))`, check y figura `{nsup}#{barsup}`. |
| `s1` se mostraba en «cm²/m» (ver M2). | Baja | — | `-> cm`. |

### 5. columna
**Veredicto: corregida.** El bloque gráfico `pm` (motor, `src/blocks.js`) aplica a la E.060 la transición de φ por
deformación (de εy a 0.005, como ACI 318-08 en adelante). La **E.060-2009 Art. 9.3.2.2** solo permite subir φ de 0.70
a 0.90 cuando φPn baja de min(0.1 f'c Ag, φPb) a cero. Para la combinación 0.9CM+CS por defecto (Pu = 95 t > 0.1 f'c
Ag = 56 t), el bloque `pm` daba φMn = 33.9 t·m; con la E.060 corresponde 28.6 t·m. **Es no conservador en 19 %.**

| Hallazgo | Gravedad | Cita | Corrección |
|---|---|---|---|
| φ por deformación en el diagrama P-M. | **Alta** | E.060 9.3.2.2 | La plantilla usa ahora el bloque `pmgen` (que implementa la regla de la E.060) con la misma armadura (`R rd rd h-rd b-rd ny+2 nx bar`); `DCpm = DCpmg` mantiene el nombre. La validación DCpm pasa de 0.7096 a 0.7254 (pmgen toma D/C = máx(Mu/φMn, Pu/φPn,máx)). Se añade una prueba en `verify.mjs`: D/C(0.9CM+CS) = 0.699. |

### 6. zapata
**Veredicto: corregida.** B×L = 2.05×2.15 m con hz = 60 cm para 85 t de servicio y qa = 2.5 kg/cm². Esto es razonable.

| Hallazgo | Gravedad | Cita | Corrección |
|---|---|---|---|
| El diseño estructural (punzonamiento, cortante, flexión) usaba solo 1.4CM+1.7CV. Con momentos sísmicos usuales en duales (MS = 20 t·m), U2 da qu = 42.5 t/m² frente a 31.6 t/m²: el refuerzo quedaba subdiseñado alrededor de 35 %. | **Media-Alta** | E.060 9.2.3 | `Pu1/Mu1`, `Pu2 = 1.25(CM+CV)+CS`, `qu = max(qu1, qu2)` y `Pu = max(Pu1, Pu2)`. La nota explica que CS entra con 1.0 y que 0.9CM±CS se cubre con la verificación del núcleo. Los valores por defecto no cambian (gobierna U1). |
| Faltaba el aplastamiento en la unión columna–zapata. | Baja | E.060 10.17, φ = 0.70 (9.3.2.4) | `A1`, `A2`, `phiPnb` y check. |
| La presión de servicio con sismo usa PS completo. Es conservador frente al 0.8 de la E.030; queda indicado en la memoria. | — | E.030 (esfuerzos admisibles) | Nota. |

### 7. co-placa
**Veredicto: apta.** αc, Vn ≤ 2.6√f'c Acw, Vu = Vua·Mn/Mua ≤ R·Vua, c_lím = lm/(600 δu/hm) con δu/hm ≥ 0.005,
extensión del borde, s ≤ min(10db, b, 25 cm) y corte por fricción con Nu = 0.9 CM coinciden con la E.060 21.9 y 11.10.
D/C P-M = 0.99, porque los datos por defecto están ajustados. Usa `pmgen`, que tiene el φ correcto. Única nota: `du`
cita «E.030 Art. 5.1», que es la numeración de 2003; corresponde al Art. 50 (2026). Es solo de redacción.

### 8. co-colductil («co-colsismica» no existe; es esta)
**Veredicto: corregida.**

| Hallazgo | Gravedad | Cita | Corrección |
|---|---|---|---|
| Vc se tomaba siempre. En columnas de pórtico con poca compresión (exteriores con 0.9CM−CS) debe ser Vc = 0 en Lo. Con Pumin = 20 t, φVn pasaba de 63.6 t a 44.4 t. | **Alta** | E.060 21.6.5.2 | `Vc0` y `Vc = si(Pumin < Ag*fc/20, 0, Vc0)`, con prueba. |
| `b` es la dimensión paralela al pórtico (`pmgen` flexiona en X = b), pero `d` se medía en `hc` y el alma era `b`. Además, el Ash y el hx se calculaban solo en `hc`. En secciones rectangulares el cortante y el confinamiento quedaban en la dirección equivocada. | **Alta** (solo secciones no cuadradas) | E.060 11.1, 21.6.4.1 b | `d = b − …`, alma `hc`; `bc` y `hx` con max(b, hc). Los valores por defecto (50×50) no cambian. Con 40×60 la plantilla detecta ahora Ash insuficiente (D/C 1.19). |
| `s_v` en «cm²/m» (M2). | Baja | — | `-> cm`. |

### 9. co-nudo
**Veredicto: apta.** Vu = 1.25fy(As1+As2) − Vcol = 87.3 t ≤ φ·3.2√f'c·Aj = 98.5 t. Los coeficientes 5.3/4.0/3.2 y φ =
0.85 son correctos. Nota: `bj = min(bc, bv + hc, …)` supone vigas centradas en la columna; si la viga es excéntrica,
el ancho efectivo es bv + 2x (21.7.4.1). No se cambió.

### 10. co-losa2d
**Veredicto: apta.** Método de coeficientes (Tabla 13.1 validada), hmin con la ec. 9-17, Asmin 0.0018bh en cada capa
(conservador) y s ≤ 2h. Sin observaciones.

### 11. ge-portante
**Veredicto: apta.** qadm = 2.20 kg/cm² (φ = 30°, B = 2.6 m, Df = 1.5 m), asentamiento de 17.6 mm y α = 1/530.
Con el nivel freático a 0.50 m: q′ = 1.9 t/m², γ2 = γ′ y qadm = 1.58 kg/cm². La plantilla dice NO CUMPLE y el
resultado es coherente. Sin observaciones.

### 12. ge-combinada
**Veredicto: apta para gravedad.** Recomendación (Media, no corregida): igual que en la zapata aislada, el diseño
estructural usa solo 1.4CM+1.7CV. En pórticos con momentos sísmicos en la base se debe evaluar también
1.25(CM+CV)±CS (E.060 9.2.3) con presión no uniforme. Se dejó así porque el método rígido con la resultante en el
centroide deja de valer y requiere el bloque *winkler* con cargas excéntricas; queda pendiente para el módulo.

### 13. ge-conectada
**Veredicto: corregida.**

| Hallazgo | Gravedad | Cita | Corrección |
|---|---|---|---|
| La zapata interior se dimensionaba y se diseñaba con R2 = P2 − alivio. El alivio solo existe cuando la columna exterior está cargada (construcción, carga viva asimétrica). | Media | Práctica (Calavera, *Cálculo de estructuras de cimentación*, cap. 4; Morales, ICG) | `R2d = max(R2, P2)` y `Ru2d = max(Ru2, Pu2)` en presión, punzonamiento, cortante y flexión. La validación de Vup pasa de 112.27 t a 115.66 t; Bz2 sigue en 2.40 m. |
| La viga de conexión no se verifica con los momentos sísmicos de la base de las columnas. | Baja | E.060 9.2.3 | Recomendación. |

### 14. wa-voladizo
**Veredicto: apta.** FS estáticos de 6.1 (volteo) y 3.3 (deslizamiento), y sísmicos de 2.09 y 1.30 con fp = 0.5 en el
pasivo. Las combinaciones (1.7CE; 1.7CE + 1.0CS) están justificadas en el texto. Con sobrecarga de 2 t/m² y H = 6 m,
el volteo, el deslizamiento y la presión sísmica dan NO CUMPLE, lo que es correcto. Observación (Baja, no corregida):
el bloque común `SISMO` usa S de la Tabla 3 de la E.030-2018 (S1–S3), mientras las plantillas peruanas de sismo usan
Vs30 (2026). Conviene unificar con `SE030(zona, Vs30)` (módulo de muros).

### 15. br-vigalosa
**Veredicto: apta.** Mu = 453.7 t·m frente a φMn = 463.3 t·m, fatiga, fisuración, Vu y L/800 (11.4 mm). Los factores de
distribución están validados con FHWA. Con L = 25 m sin cambiar la armadura, la flexión da NO CUMPLE, lo que es
correcto. Sin observaciones.

### 16. br-estribo
**Veredicto: apta.** Resistencia Ia/Ib y Evento Extremo con φ y la interpolación de excentricidad 11.6.5.1. Con
PGA = 0.60 la excentricidad y el deslizamiento sísmicos dan NO CUMPLE, lo que es coherente.

Recomendaciones (Baja, no corregidas):

- Agregar el diseño del parapeto (LS + BR + EQ del parapeto) y de la cajuela o asiento.
- Agregar el refuerzo de temperatura cuantificado de 5.10.6.
- Revisar que en el MTC se acepte γ = 1.0 para EAE en Evento Extremo; es un criterio defendible.

### 17. st-nave
**Veredicto: apta.** Kleinlogel frente a la matriz de rigidez (diferencia del 0.04 %), B2 = 1.03, correas AISI y deriva
sísmica de 0.0081. Las combinaciones E.090 son correctas. Sin observaciones.

### 18. st-casa
**Veredicto: apta.** R0 = 4 para OMF y OCBF (E.030-2018 Tabla 7), CT de 35 y 45 y losa colaborante SDI. Observación
(Baja): las conexiones de los arriostres OCBF y de los OMF se diseñan con Ω0 o con la capacidad esperada (AISC 341);
hoy figura solo como texto y debe quedar en los planos.

### 19. ma-edificio
**Veredicto: apta.** Densidad, σm ≤ Fa, Ve ≤ 0.55Vm, ΣVm ≥ VE, columnas y soleras (Tabla 11, 27.3) coinciden con la
E.070. El momento por muro Me = Ve·hM (voladizo) da tracciones altas en las columnas (T = 23 t para X1). Es
conservador y está declarado. Con Z = 0.25 la densidad mínima baja a 0.021, lo que es coherente. Sin cambios.

### 20. an-portico-ca
**Veredicto: corregida.**

| Hallazgo | Gravedad | Cita | Corrección |
|---|---|---|---|
| Pórtico de C°A° con R = 8 (pórtico especial) cuya viga se diseñaba a cortante con el Vu del análisis: 16.6 t. El cortante por capacidad da 19.5 t. | **Alta** | E.060 21.5.4.1 | `ln`, `Mprn`, `Mprp` (`mprRect`, 1.25fy), `wug = 1.25(CM+CV)`, `Vcap`, `Vu = max(Vu_an, Vcap)`, `phiVn` y check. |
| so = min(d/4, 15 cm): faltaban 8db, 24de y 300 mm. | Baja | E.060 21.5.3.2 | Corregido. Con los datos por defecto no cambia (10 cm). |
| Faltaba M⁺ ≥ ½M⁻ en la cara. | Media | E.060 21.5.2.2 | Check (D/C 0.95). |
| `s_req` en «cm²/m» (M2). | Baja | — | `-> cm`. |
| Las columnas solo tienen verificación axial (resumen). | Baja | E.060 21.6 | Ya remite a *co-colductil* / *pmgen*; se mantiene. |

## Hallazgos en el motor y en los bloques (no editables por este revisor)

| # | Dónde | Hallazgo | Gravedad | Propuesta |
|---|---|---|---|---|
| M1 | `src/blocks.js`, `blockPM` (tipo `pm`), cálculo de `phi` (≈ líneas 388–411) | Con `norma: 'E060'` usa la transición por deformación `et` entre εy y 0.005. La E.060-2009 9.3.2.2 exige la transición por carga axial (φ = 0.70 hasta que φPn < min(0.1 f'c Ag, φPb)). `pmgen` (`src/blocks/concrete.js`, `phiOf`) ya lo hace bien. Ejemplo: sección de 40×50, 10Ø3/4", f'c = 280 y Pu = 95 t: φMn = 33.9 t·m con `pm` frente a 28.6 t·m con la E.060 (+19 %). | **Alta** | Reutilizar `phiOf` de `pmgen` en `blockPM` para la E060. Ninguna plantilla usa ya el bloque `pm`, pero los usuarios lo insertan desde la paleta. |
| M2 | Motor: formato de unidades de resultados | Una longitud obtenida como `Av·fy·d/Vs` (cm²·kgf/cm²·cm/tonf) se muestra como «2514.62 cm²/m» en lugar de «25.15 cm»: la heurística de unidades elige área/longitud para una dimensión L. Aparece en espaciamientos de estribos sin `->`. | Media (presentación, puede confundir al revisor) | Para dimensión pura de longitud, preferir siempre `cm`/`m`. Se forzó `-> cm` en *viga*, *co-colductil* y *an-portico-ca*. |
| M3 | `SE030` (`src/norms/peru.js`) | Con Vs30 < 200 m/s en zona 4 lanza una excepción, intencional por exigir estudio de sitio, que produce decenas de errores en cascada en *pe-e030-estatico*. | Baja | Devolver un valor marcado y una verificación «Se requiere estudio de sitio (Art. 14.x)» que no cumple, en lugar de una excepción. |

## Pruebas añadidas

- `tests/verify.mjs`: barras superiores corridas de la viga ≥ As,mín; U2 gobierna qu con MS = 20 t·m; φPnb de
  aplastamiento; incoherencia hn/hi (dato extremo); φ de la E.060 en la columna (D/C 0.699).
- `tests/concrete.test.mjs`: Vc = 0 con Pu < Ag f'c/20; d y bc en una columna de 40×60.
- `tests/geotech.test.mjs`: zapata interior sin alivio (R2d, Ru2d).
- `tests/analysis.test.mjs`: Vcap = (Mpr⁻ + Mpr⁺)/ln + wu·ln/2 y Vu = max(Vu_an, Vcap).
- `tests/peru.test.mjs`: Q del primer entrepiso a mano; coherencia de `irr` con Ia = 0.75 en el dinámico.

Validaciones modificadas, con su justificación arriba: `columna.DCpm` 0.7096 → 0.72544 (E.060 9.3.2.2) y
`ge-conectada.Vup` 112.27 → 115.66 t (zapata interior sin alivio).

---

# Segunda tanda: otras 20 plantillas de uso frecuente

Revisor: ingeniero jefe (misma metodología). Fecha: octubre de 2026. Cada plantilla se ejecutó con los datos por defecto
(`runTemplate`) y con cambios realistas: otra zona sísmica, suelo blando, más carga viva, luces mayores, nivel de agua
y garganta o peralte menor. Se revisaron renderizadas (`build.mjs` + `shot.mjs --paper`) *aligerado*, *escalera*,
*ma-armada*, *co-voladizo*, *ge-medianera*, *ge-platea* y *st-placa-base*.

Solo se editaron `src/templates.js` (*vigacont*, *aligerado*, *escalera*) y `src/templates/{concrete,geotech,walls,steel,masonry,peru}.js`.
En los archivos compartidos con el otro agente (`geotech.js`, `walls.js`, `steel.js`) solo se tocaron *ge-medianera*, *ge-platea*,
*ge-licuacion*, *wa-sotano* y *st-placa-base*, con reemplazos puntuales. Pruebas: `tests/verify.mjs` y
`tests/{concrete,geotech,masonry,steel,peru}.test.mjs`. Al final, `node tests/run.mjs` pasa completo.

## Resumen

| # | Plantilla | Veredicto | Hallazgo principal | Corregido |
|---|---|---|---|---|
| 1 | vigacont | Apta, con corrección | Asmax con β1 = 0.85 fijo (no conservador con f'c > 280) | Sí |
| 2 | aligerado | **Corregida (Media)** | h = 20 < hmín = 22.7 cm y no se calculaba la deflexión | Sí |
| 3 | escalera | **Corregida (Media)** | Sin cálculo de deflexiones; con t = 15 cm y ℓ = 4.39 m excede ℓ/240 | Sí (t = 17 cm) |
| 4 | co-losa1d | Apta, con corrección | ρ de temperatura fija en 0.0018 para cualquier fy; cita 8.3.4/8.3.3 | Sí |
| 5 | co-punzonamiento | **Corregida (Media)** | Faltaba la compatibilidad de deriva de la conexión losa–columna | Sí |
| 6 | co-torsion | Apta | — | — |
| 7 | co-voladizo | **Corregida (Media)** | Sin sismo vertical en el voladizo (E.030 Art. 28.4 y 38.1) | Sí |
| 8 | ge-medianera | **Corregida (Media)** | Punzonamiento de borde sin transferencia de momento | Sí |
| 9 | ge-platea | **Corregida (Alta)** | Presión sin el peso de la platea; sin validar el método rígido | Sí |
| 10 | ge-pilote | Apta | — | — |
| 11 | ge-licuacion | Apta, con advertencia | amáx = 0.30 g por defecto es bajo para la costa | Nota en la memoria |
| 12 | wa-gravedad | Apta | — | — |
| 13 | wa-sotano | Apta, con observación | No considera NF ni la etapa constructiva | Nota en la memoria |
| 14 | br-pilar | Apta | Recomendaciones menores | No |
| 15 | br-neopreno | Apta | — | — |
| 16 | st-placa-base | **Corregida (Media)** | Sin el factor 0.75 de anclajes con sismo (ACI 318-19 17.10) | Sí |
| 17 | ma-armada | Apta | — | — |
| 18 | ma-cerco | **Corregida (Media)** | La excentricidad del cimiento usaba el 100 % del pasivo como fuerza activa | Sí |
| 19 | pe-e020-metrado | Apta, con corrección | Solo se controlaba q ≤ 1.2 t/m²; el riesgo real es q bajo | Sí |
| 20 | pe-e030-noestructurales | Apta | — | — |

## Detalle por plantilla

### 1. vigacont
**Veredicto: apta, con corrección.** Los valores por defecto son razonables: viga de 30×60 con luces de 5, 6 y 5 m,
M⁻ = 13.4 t·m, 4Ø5/8" y D/C de 0.87. El cortante se toma en el eje (conservador) y la deflexión con Ig se declara
como control rápido.

| Hallazgo | Gravedad | Cita | Corrección |
|---|---|---|---|
| `Asmax` usaba β1 = 0.85 fijo. Con f'c = 350–420, el límite 0.75ρb quedaba sobrestimado hasta 12 % (β1 = 0.75 frente a 0.85 con f'c = 420). | Media (solo f'c > 280) | E.060 10.2.7.3 y 10.3.4 | `Asmax = 0.75·rhobE060(fc, fy)·b·d`. |
| No se verificaba que las barras cupieran en una capa. | Baja | E.060 7.6.1 | Check de separación libre ≥ 2.5 cm (D/C 0.55). |

### 2. aligerado
**Veredicto: corregida.** La memoria calculaba hmín = ℓ/18.5 = 22.7 cm y luego solo decía que, si no se cumplía, «debe
calcularse la deflexión», sin calcularla. Con h = 20 cm, que es el caso usual, la memoria salía firmada sin el requisito
de la E.060 9.6.2.1.

| Hallazgo | Gravedad | Cita | Corrección |
|---|---|---|---|
| No se calculaba la deflexión aunque h < hmín. | **Media** | E.060 9.6.2.1–9.6.2.5, Tablas 9.1 y 9.2 | Ig de la sección T (11 801 cm⁴), Mcr, Icr (`icrT`, 1#4 + 1#3), Ie de Branson al centro del tramo, bloque `beam` en servicio con EcIe, Δ_L ≤ ℓ/360 y λΔ_D + Δ_L ≤ ℓ/480 (tabiques). Con los datos por defecto: 7.4 mm frente a 9.4 mm (D/C 0.79). Con una luz de 6 m da NO CUMPLE (prueba). |
| La deflexión se compara con la luz mayor; la flecha máxima puede estar en el tramo extremo, más corto. | Baja | — | Aproximación declarada; con la luz menor el D/C sería 0.93. |

### 3. escalera
**Veredicto: corregida.** La única «verificación» de rigidez era t ≥ Ln/25, que es una regla práctica. La Tabla 9.1 de la
E.060 pide ℓ/20 = 22 cm, con ℓ medida en la inclinación (4.39 m), para no calcular deflexiones.

| Hallazgo | Gravedad | Cita | Corrección |
|---|---|---|---|
| No se calculaban deflexiones. Con la garganta por defecto de 15 cm, la deflexión diferida más la viva es 19.3 mm frente a ℓ/240 = 18.3 mm, es decir, **no cumple**. Los pasos se desprecian, que es lo conservador. | **Media** | E.060 9.6.2.1, 9.6.2.3–9.6.2.5, Tablas 9.1 y 9.2 | Sección de deflexiones: ℓ inclinada, hmín, Ig, Mcr, Icr con el acero colocado, Ie y carga perpendicular w·cos²θ. **Dato por defecto t = 15 → 17 cm** (D/C 0.53). Validación: hm 27.06 → 29.50 cm, Mu 2.251 → 2.383 t·m/m, As 5.061 → 4.561 cm², φVc 8.069 → 9.375 t/m. |
| Con α = 0.8 (semiempotrado) el positivo baja 20 %, pero el negativo seguía en As/3, sin relación con el momento descontado. | Baja | Equilibrio; E.060 8.4 | `Mneg = máx(1/3, 1 − α)·wu·Ln²/8` y `Asneg = máx(As/3, As(Mneg))`. |
| La variable `alfa` se imprimía como «a_lfa». | Baja (presentación) | — | Renombrada a `alpha` (α); no la usaba ninguna prueba. |
| El dato B (ancho) no se usa; el diseño es por metro. | Baja | — | Se dejó; la descripción de la validación ya dice «por metro». |

### 4. co-losa1d
**Veredicto: apta, con corrección.** Los coeficientes y la envolvente con alternancia están bien.

| Hallazgo | Gravedad | Cita | Corrección |
|---|---|---|---|
| ρ de temperatura y mínimo fija en 0.0018 aunque el rango de fy admite 2800 (0.0020) y hasta 5000 (0.0018·4200/fy ≥ 0.0014). | Baja | E.060 9.7.2; ACI 318-19 24.4.3.2 | `rhot` según fy en `Asmin` y `Ast`. |
| El texto citaba 8.3.4 y la validación 8.3.3 para el método de coeficientes. | Baja | E.060 8.3.3 | Unificado a 8.3.3. |

### 5. co-punzonamiento
**Veredicto: corregida.** γv, Jc, vc (11-33/34/35) y el ancho c2 + 3h coinciden con StructurePoint.

| Hallazgo | Gravedad | Cita | Corrección |
|---|---|---|---|
| La losa plana acompaña la deriva de los muros (E.060 21.8.2 la permite con muros que tomen el 80 %). No se verificaba la compatibilidad de deriva de la conexión: con vug/φvc = 0.67 y deriva 0.007 la conexión requiere estribos o pernos de cortante. | **Media** | ACI 318-08 21.13.6; ACI 318-19 18.14.5.1 | Datos `Vug` (1.25(CM+CV)) y `deriva`; `derivalim = máx(0.035 − vug/(20φvc), 0.005)` y check (D/C 0.80 con 0.004). La prueba con 0.007 da NO CUMPLE. |

### 6. co-torsion
**Veredicto: apta.** Tth, la sección (11-18) en MKS, At/s con Ao = 0.85Aoh, Aℓ y Aℓ,mín (11-24), s ≤ Ph/8 y 30 cm y el
mínimo (Av + 2At) son correctos y están validados con StructurePoint. Con Tu = 7 t·m da NO CUMPLE la sección y las barras
laterales, lo que es coherente. Observación (Baja): no se verifica la separación ≤ 30 cm del acero longitudinal alrededor
del perímetro (11.6.6.2). Con h = 60 cm cumple con la barra lateral dibujada.

### 7. co-voladizo
**Veredicto: corregida.**

| Hallazgo | Gravedad | Cita | Corrección |
|---|---|---|---|
| El voladizo se diseñaba solo con 1.4CM + 1.7CV. La E.030 exige la fuerza sísmica vertical en voladizos (2/3·Z·U·S del peso). En la costa, U2 = 1.25(CM+CV) + CSv gobierna: 16.06 frente a 15.45 t·m. | **Media** | E.030-2026 Art. 28.4 y 38.1; E.060 9.2.3 | Datos `zona`, `U`, `Vs30`; `Fv = 2/3·ZE030·U·SE030`; `Mu = máx(Mu1, Mu2)` y `Vud = máx(Vud1, Vud2)` con el peso CM + 25 % CV. Validación: `Mu` 15.45 → 16.06 t·m (se agregó `Mu1` = 15.45) y `As_req` 8.022 → 8.360 cm². φMn = 16.35 t·m (D/C 0.98). |

### 8. ge-medianera
**Veredicto: corregida.** Dimensionamiento, tensor T = P·e/h y fricción ≥ 1.5T son correctos.

| Hallazgo | Gravedad | Cita | Corrección |
|---|---|---|---|
| El punzonamiento de la columna de borde solo verificaba el cortante directo. En el caso 2 (tensor), la columna transmite a la zapata Mtu = Pu·e = 22.6 t·m. | **Media** | E.060 11.12.6; ACI 318-19 R8.4.4.2.3 (Jc de borde) | Sección de 3 lados: `cAB`, `Jcb`, `eg`, `Mug = |Mtu − Vu·eg|` respecto al centroide, γv y `vub ≤ φvc` (D/C 0.42). |
| `Mtu` se imprimía en kJ. | Baja | — | `-> tonf*m`. |
| Igual que en la zapata y en *ge-combinada*: no se evalúa 1.25(CM+CV) ± CS. | Media | E.060 9.2.3 | Recomendación. No se corrigió para no reescribir el esquema del tensor. |

### 9. ge-platea
**Veredicto: corregida.**

| Hallazgo | Gravedad | Cita | Corrección |
|---|---|---|---|
| Se comparaba q = ΣPcol/A ± M·c/I directamente con qa, sin el peso de la losa de 0.90 m (2.16 t/m²) ni del relleno. Es inconsistente con las zapatas, que usan qn = qa − γm·Df. Con qa = 1.2 kg/cm² la platea pasaba (11.3 ≤ 12); con su peso, la presión es 13.5 t/m². | **Alta** | E.050 Art. 22; criterio de las plantillas de zapatas | Datos `Df = 1.0 m` y `γm = 2.0 t/m³`; `qn = qa − γm·Df`; check `qmx ≤ qn`. **Dato por defecto qa = 1.2 → 1.4 kg/cm²** (no hay validación sobre qa; qmx no cambia). La prueba con qa = 1.2 da NO CUMPLE. |
| No se comprobaba si la losa puede tratarse como rígida. | Media | ACI 336.2R §6.1.2 (separación ≤ 1.75/β) | Dato `ks`, β = (ks·B1/4EcI)^¼, `Lrig` = 7.31 m frente a 6.0 m (D/C 0.82). Con ks = 12 kg/cm³ da NO CUMPLE y remite a *winkler*. |

### 10. ge-pilote
**Veredicto: apta.** Qp con el límite ql de Meyerhof (400 t/m²) y la correlación SPT, α de API, β y fricción negativa como
carga, FS = 2, Vesic y Broms. Con fricción negativa activada la carga da NO CUMPLE (D/C 1.14), lo que es coherente.

### 11. ge-licuacion
**Veredicto: apta, con advertencia.** El procedimiento NCEER, MSF, Kσ y PL de Cetin está bien implementado.

| Hallazgo | Gravedad | Cita | Corrección |
|---|---|---|---|
| amáx = 0.30 g por defecto es inferior a Z·S de cualquier sitio de la costa (≈ 0.47 g). Con 0.45 g el mismo perfil da FS_L = 0.92 a 4 m y PL = 52 %. | Media (dato) | E.050 Art. 38.5.4; E.030 | Advertencia en la memoria con los valores numéricos. No se cambió el dato porque es el de la validación y de las pruebas. |

### 12. wa-gravedad
**Veredicto: apta.** Coulomb y M-O con δ = 2φ/3, FS de la E.050 39.13 y esfuerzos del cuerpo con E.060 Cap. 22
(1.3√f'c S, 0.35√f'c bh). Con zona 2 cumple; con ws = 2 t/m² da NO CUMPLE el deslizamiento sísmico. Nota (Baja): la E.060 Cap. 22
es para concreto simple; aplicarla al ciclópeo (30 % de piedra) con f'c = 140 de la matriz es práctica aceptada, pero
conviene declararlo en las especificaciones.

### 13. wa-sotano
**Veredicto: apta, con observación.** K0, Wood (kh = PGA), viga apoyada-empotrada, 1.7CE + 1.0CS, mínimos de muro y
pasadores por cortante-fricción.

| Hallazgo | Gravedad | Cita | Corrección |
|---|---|---|---|
| No considera NF detrás del muro, la etapa constructiva (relleno antes de la losa = voladizo) ni la carga axial. | Media | E.060 9.2.4–9.2.5, 14.2 | Párrafo de hipótesis que deben figurar en los planos. |

### 14. br-pilar
**Veredicto: apta.** R por categoría (Tabla 3.10.7.1-1), 100 %–30 %, PEQ por volteo = 2MTc/s, φ de Evento Extremo, P–Δ
(4.7.4.5), Vc = 0 en la rótula y Ash (5.10.11.4.1d). El cortante elástico (212.8 t) es menor que el de la rótula con
sobrerresistencia (≈ 217 t), por lo que el mínimo de 3.10.9.4.3 está bien tomado. Recomendaciones (Baja): diseño por
capacidad del cabezal y de la cimentación con 1.3Mn, y combinaciones de viento sobre la subestructura.

### 15. br-neopreno
**Veredicto: apta.** Métodos A y B de la Secc. 14 con G mínimo para compresión y máximo para fuerzas, rotación más
0.005 de tolerancia, estabilidad, zunchos (servicio y fatiga) y Hbu ≤ 0.2P. Con PLL = 700 kN sigue cumpliendo
(σs = 7.2 MPa < 8.4 MPa). Recomendación (Baja): en zona 4, topes sísmicos o restrictores (AASHTO 3.10.9.2) en el plano.

### 16. st-placa-base
**Veredicto: corregida.** Thornton/DG1, J8, Cap. 17 (Ncbg con h′ef, pullout, desprendimiento lateral) y fricción con 0.9D.

| Hallazgo | Gravedad | Cita | Corrección |
|---|---|---|---|
| Nua puede venir del sismo (el propio dato lo sugiere), pero no se aplicaba el factor 0.75 a las resistencias gobernadas por el concreto ni se exigía un mecanismo dúctil. | **Media** | ACI 318-19 17.10.5.3 y 17.10.5.4 | Dato `sis`, `fsis = 0.75`, checks de arrancamiento y extracción con sismo, y nota sobre 17.10.5.3 (tramo libre ≥ 8da u Ω0). La prueba con Nua = 7.5 t pasa sin sismo y da NO CUMPLE con sismo. |
| Solo compresión concéntrica; las columnas de pórticos con momento en la base requieren DG1 §3.3–3.4. | Baja | AISC DG1 | El alcance ya está declarado. |

### 17. ma-armada
**Veredicto: apta.** Mu = 1.25Me, φ = 0.85 − 0.2Pu/Po, As = (Mu/φ − Pu·L/2)/(fy·D), σu < 0.3f'm, Vuf = 1.25Vu·Mn1/Mu ≥ Vm y
vi ≤ 0.1f'm coinciden con la E.070 Art. 28. En la memoria renderizada, Mu sale en t·m. Con Me = 150 t·m da NO CUMPLE.

### 18. ma-cerco
**Veredicto: corregida.**

| Hallazgo | Gravedad | Cita | Corrección |
|---|---|---|---|
| La excentricidad del cimiento se calculaba con Mr, que incluye el 100 % del pasivo como momento estabilizante: e = (Mv − Ep·hc/3)/P. El pasivo es una reacción, no una fuerza aplicada. Con sismo pequeño (zona 1) daba excentricidades negativas grandes y una falsa falla (D/C 1.48). Con sismo grande ocultaba la excentricidad real. | **Media** | Equilibrio; AASHTO Tabla 11.5.7-1 (φep = 0.5) y 11.6.3.3 | `Mpas = mín(½Ep·hc/3, Mv)`, `e = (Mv − Mpas)/P`, presión trapecial o triangular y e ≤ B/3 (criterio sísmico de *wa-*). Por defecto: e = 12.7 cm, qmáx = 0.74 kg/cm² ≤ 1.33qa. |
| `cs` del cimiento usaba solo 0.8·Z·U·C1, mientras la carga del paño w toma el mayor entre E.070 y E.030 Art. 60. En zonas 1–2 con S alto era no conservador. | Baja | E.030 Art. 60; E.070 Art. 29.6 | `cs = máx(0.8ZUC1, 0.8·0.5·ZUS)`. |
| El volteo con FS ≥ 2 solo cumple contando el 100 % del pasivo. Sin él, FS = 1.22. Es el método de San Bartolomé y se mantiene. | Observación | E.070 Art. 31.6 | Exigir en obra el cimiento vaciado contra terreno natural, sin sobreexcavación. |

### 19. pe-e020-metrado
**Veredicto: apta, con corrección.** Pesos del Anexo 1, tabiquería real, reducción del Art. 10 y fracciones de la
E.030 Art. 31 correctos.

| Hallazgo | Gravedad | Cita | Corrección |
|---|---|---|---|
| El «control del orden de magnitud» solo verificaba q ≤ 1.2 t/m². Lo no conservador es subestimar P. El ejemplo da 0.72 t/m², bajo el rango usual que la propia memoria declara (0.8–1.2). | Baja | E.030 Art. 31 | Check `q ≥ qmin = 0.6 t/m²`. Sin tabiquería ni acabados da NO CUMPLE (prueba). |

### 20. pe-e030-noestructurales
**Veredicto: apta.** Fi/Pi·C1 ≥ 0.5ZUS, vertical 2/3, ×0.8 en esfuerzos admisibles y junta del Art. 52.4. Con Vs30 = 180 m/s
en zona 4 aparece el problema M3 del motor: la excepción de `SE030` produce 20 errores en cascada. Es el mismo caso de la
primera tanda, ahora también en *co-voladizo* (usa `SE030`).

## Hallazgos en el motor y en los bloques (no editables por este revisor)

| # | Dónde | Hallazgo | Gravedad | Propuesta |
|---|---|---|---|---|
| M2 (bis) | Motor: formato de unidades | Persiste en `cAB = b1²/(2b1 + b2)`, que salía como «1931.48 cm²/m», y en momentos sin `->`, que salían como «kJ». | Media (presentación) | Igual que en M2. Se forzaron las unidades en *ge-medianera*. |
| M3 (bis) | `SE030` | Además de *pe-e030-estatico*, la excepción con Vs30 < 200 m/s en zona 4 rompe *pe-e030-noestructurales* y *co-voladizo*. | Baja | Ver M3. |
| M4 | Render de sustituciones | Las sustituciones largas (inercias con Steiner, `max(…, fórmula de As)`) se desbordan a la derecha de la hoja en lugar de partirse. | Baja | Partir las líneas en operadores + y ·. Se mitigó en las plantillas dividiendo las fórmulas (`Igf + Igw`, `Jl + Jp`, `asFlex`). |

## Pruebas añadidas (segunda tanda)

- `tests/verify.mjs`: Asmax con β1(420); Ig y Mcr del aligerado; deflexión del aligerado y NO CUMPLE con luz de 6 m;
  escalera con t = 15 cm y NO CUMPLE ℓ/240; negativo de la escalera semiempotrada; datos extremos de la escalera.
- `tests/concrete.test.mjs`: U2 del voladizo con Fv = 0.34 y zona 1; deriva límite del punzonamiento y NO CUMPLE con 0.007;
  ρt según fy en la losa 1D.
- `tests/geotech.test.mjs`: qn y 1.75/β de la platea, NO CUMPLE con qa = 1.2; Jc y vu de la medianera; dato extremo ks = 12.
- `tests/masonry.test.mjs`: excentricidad del cerco con pasivo movilizado; zona 1 sin falsas fallas.
- `tests/steel.test.mjs`: factor 0.75 y NO CUMPLE con sismo en la placa base.
- `tests/peru.test.mjs`: control inferior de q en el metrado.

Validaciones modificadas, con su justificación arriba:

- `escalera`: hm, Mu, As y φVc, porque t pasó de 15 a 17 cm (E.060 9.6.2, Tabla 9.2).
- `co-voladizo`: Mu 15.45 → 16.06 t·m y As_req 8.022 → 8.360 cm² (E.030 Art. 28.4 y 38.1). Se agregó `Mu1` = 15.45 t·m.

## Recomendaciones aplicadas (octubre de 2026, segunda tanda)

Se implementaron las cuatro recomendaciones que habían quedado abiertas. Archivos editados:
`src/templates/{geotech,bridges,walls,steel}.js`, `src/blocks/geotech.js` y `tests/{geotech,bridges,walls,steel}.test.mjs`.
Con los datos por defecto todo cumple; `node tests/run.mjs`, `node build.mjs` y
`node tools/qa-render.mjs --no-shot ge-combinada br-estribo wa-voladizo st-casa` terminan sin fallas ni hallazgos.
Las memorias se revisaron renderizadas con `tools/shot.mjs --paper`.

| Plantilla | Qué se implementó | Validación |
|---|---|---|
| ge-combinada (§ 12) | Datos de sismo por columna: $P_S$, $M_S$ y $V_S$ longitudinales y $M_T$, $V_T$ transversales, con momentos llevados a la base ($M_b = M_S + V_S h_z$). **Servicio con sismo**: $CM + CV \pm CS$ (±X) con el método rígido con excentricidad (bloque `winkler`); se verifica $q_{max} \le 1.20\,q_a$ neta (E.050 Art. 21, `qaSismoE050`) y $\lvert e\rvert \le L/6$. El sismo transversal se verifica por separado ($e_T \le B/6$, $q \le 1.20\,q_a$). **Diseño por la envolvente** U1 = 1.4CM + 1.7CV y U2–U5 = 1.25(CM + CV) ± CS y 0.9CM ± CS (E.060 9.2.3), con presión trapecial o triangular sin tracción. Flexión longitudinal con $M^\pm$ de la envolvente. Cortante a $d$ de la cara con `Vd_u`, que es el valor exacto de V en $x_i \pm d_v$ y reemplaza la aproximación anterior. Punzonamiento con sismo y transferencia de momento $\gamma_v M_S c/J_c$ (E.060 11.12.6). Flexión transversal con la máxima axial con sismo y con la presión lineal del sismo transversal, integrada a mano en la memoria. | Validación sin cambios: con los datos por defecto gobierna U1. Se agregan `qmax_s` = 19.18 t/m² y `e_R_s` = −0.2215 m, ambos calculados a mano, y `Vd_u` = 68.91 t como valor de control. Pruebas nuevas: envolvente frente a casos aislados del bloque, qns, e y qmax a mano, y sismo fuerte (MS2 = 60 t·m, PS2 = 40 t), que da NO CUMPLE y hace que la envolvente sísmica gobierne la flexión. |
| Bloque `winkler` | Nuevo soporte de **varios estados de carga** (`CASO nombre`): exporta la envolvente (`qmax`, `qmin`, `Mpos`, `Mneg`, `Vmax`, `e_R` del caso más excéntrico), una tabla por caso y diagramas superpuestos con leyenda. Opciones nuevas: `dcrit`, que exporta `Vd` (\|V\| a esa distancia de cada carga puntual), y `solopresion`. Un solo caso conserva el comportamiento anterior: *ge-medianera*, *ge-platea* y *ge-winkler* no cambian. | Prueba del bloque: qmax del caso B = R/L·(1 + 6e/L) con e = 1 m. |
| br-estribo (§ 16) | **Parapeto (muro espaldar)**: EH, LS con $h_{eq}(h_b)$ de la Tabla 3.11.6.4-1 y BR a $h_b + 1.80$ m (3.6.4), en Resistencia I y en Evento Extremo I (incremento de M-O a 0.6$h_b$ más la inercia). Incluye flexión, control por tracción ($c/d \le 0.375$), acero mínimo 5.6.3.3, cortante y separación. **Cajuela** (asiento sobre la pantalla de espesor completo, no ménsula): longitud $N$ disponible = $b_c$ − junta (4.7.4.4); neopreno por el Método A (σs ≤ 1.25GS y ≤ 8.6 MPa, $h_{rt} \ge 2\Delta_s$, estabilidad); distancias al borde; aplastamiento 5.6.5 con $m = \sqrt{A_2/A_1} \le 2$; horquillas del borde para $N_{uc} = \max(0.2V_u, k_hR_{DC}/\text{apoyo})$. Se agrega además el **acero de temperatura 5.10.6** del parapeto y de la pantalla, que era otra recomendación de § 16. | Validación: se agregan `Mup` = 14.80 t·m y `ssb` = 4.54 MPa, comprobados a mano en la prueba; los valores anteriores no cambian. Datos extremos con NO CUMPLE: hb = 2.40 m con t1 = 0.25 m, Lb = 550 mm y junta de 15 cm. |
| wa-voladizo (§ 14) | El bloque sísmico pasa a la **E.030-2026**: `Z = ZE030(zona)` y `S = SE030(zona, Vs30)` (Tabla N° 4), con el perfil S0–S4 indicado en la memoria. `PGA = Z·S` y `kh = 0.5·PGA` (AASHTO 11.6.5.2.2) quedan coherentes con ese S. En zona 4 con Vs30 < 200 m/s (S4) aparece la verificación «se requiere análisis de respuesta de sitio», que da NO CUMPLE sin generar errores en cascada (ver M3). Se eliminó la opción de la tabla de 2018, porque solo servía para expedientes antiguos y agregaba un dato que no se usa. | Vs30 = 450 m/s da S = 1.05, el mismo valor que S2 en 2018. Por eso los valores de validación no cambian; se agrega `S` a la validación. Pruebas: Vs30 = 250 m/s, zona 3 con roca y S4 en zona 4. |
| st-casa (§ 18) | Nueva sección **Conexiones sísmicas con sobrerresistencia**. Ω0 de ASCE 7-16 Tabla 12.2-1: OMF 3 y OCBF 2. Se agrega un segundo pórtico `frame2d` con 1.2CM + 0.5CV ± Ω0CS y 0.9CM ± Ω0CS (ASCE 7-16 12.4.3). **OMF**: $M_{uc} = \min(1.1R_yM_p, M_{\Omega_0})$ (AISC 341-16 E1.6b), con planchas de ala empernadas (BFP) a diafragmas pasantes. Se verifican los pernos (corte, aplastamiento y desgarramiento), la fluencia y rotura de la plancha, la plancha comprimida (J4.4), el bloque de cortante de la plancha y del ala, la viga con agujeros (F13.1) y la placa de alma (pernos, fluencia, filetes y pared del HSS). **OCBF**: $T_u = \min(\Omega_0 E, R_yF_yA_g)$ y $C_u = \min(\Omega_0E, R_yF_yA_g, 1.14F_{cre}A_g)$ (F1.6a), con b/t de ductilidad moderada. Se verifican los filetes HSS–cartela y el metal base, la sección neta en la ranura (U = 1 − x̄/l, D3.1 caso 6), la **sección de Whitmore** en tracción, el **pandeo de la cartela** (Thornton, K = 0.65, J4.4 y cap. E), el bloque de cortante y los filetes a la viga y a la columna con el factor 1.25. | Validación: se agregan `Tye` = 71.30 t (RyFyAg) y `Tu_b` = 9.00 t, ambos a mano; los valores anteriores no cambian. Pruebas de Whitmore, U, KL/r, Ffu y Ω0 = 1, y datos extremos (2 pernos por ala, lw = 5 cm y Lg = 80 cm). |

Pendiente (fuera de alcance): las otras plantillas de muros (*wa-gravedad*, *wa-contrafuertes*, *wa-sotano*,
*wa-gaviones* y *wa-mse*) siguen con el bloque `SISMO` de la E.030-2018. Pasarlas a `SISMO26` cambia sus valores de
validación de kh, por lo que debe hacerse plantilla por plantilla, eligiendo Vs30.

---

# Tercera tanda A: puentes, acero, albañilería y tanques, y extras (32 plantillas)

Revisor: ingeniero jefe (misma metodología). Fecha: octubre de 2026. Alcance: todas las plantillas de
`src/templates/{bridges,steel,masonry,extras}.js` que no se habían revisado en las tandas anteriores. Cada plantilla
se ejecutó con los datos por defecto (`runTemplate`) y con cambios realistas: otra luz, otra zona, suelo blando, nivel
freático alto, perno de 1 in, Vs del suelo mayor, perfil más liviano y cargas mayores. Se revisaron renderizadas
(`build.mjs` + `shot.mjs --paper`) *br-presforzada*, *br-acero*, *st-correas*, *st-compuesta*, *ma-cisterna*, *ma-adobe* y
*ex-pase-aereo*, y se pasó `tools/qa-render.mjs --no-shot` por las 14 plantillas modificadas.

Solo se editaron `src/templates/{bridges,steel,masonry,extras}.js` y `tests/{bridges,steel,masonry,extras}.test.mjs`.
Al final, `node tests/run.mjs` pasa completo.

## Resumen

| # | Plantilla | Veredicto | Hallazgo principal | Corregido |
|---|---|---|---|---|
| 1 | br-presforzada | **Corregida (Media)** | Sin cortante de interfaz, sin refuerzo longitudinal en el apoyo, sin hendimiento y sin el refuerzo que exige la tracción de transferencia | Sí |
| 2 | br-acero | **Corregida (Media)** | Viga armada sin rigidizadores de apoyo, sin fatiga y sin conectores de corte | Sí |
| 3 | br-sismo | **Corregida (Media)** | R fijo de «pórtico de varias columnas»: con columna simple la fuerza de diseño correcta es 75 % mayor | Sí |
| 4 | br-alcantarilla | Apta, con corrección | Sin cortante en la losa inferior (la más cargada) ni presión de contacto | Sí |
| 5 | br-peatonal | **Corregida (Media)** | Sin constructibilidad: el ala superior no está arriostrada por la losa durante el vaciado | Sí |
| 6 | st-columna | Apta | — | — |
| 7 | st-vigacolumna | Apta | — | — |
| 8 | st-traccion | Apta, con corrección | Distancia mínima al borde fija para ⅞ in | Sí |
| 9 | st-shear-tab | Apta, con observación | Desgarramiento horizontal en el alma de la viga | No (observación) |
| 10 | st-correas | **Corregida (Alta)** | Faltaba 1.2D + 1.6Lr + 0.8W: Mux subestimado 22 % | Sí |
| 11 | st-armadura | **Corregida (Media)** | Faltaba 0.8W y la soldadura de los ángulos del alma | Sí |
| 12 | st-compuesta | **Corregida (Media)** | W12×19 de 9 m para oficinas no cumple la vibración por caminar (DG11) | Sí (W16×31) |
| 13 | st-viga-ipe | Apta | — | — |
| 14 | ma-adobe | Apta | Densidad y esfuerzos en el límite; desempeño no cuantificado (declarado) | — |
| 15 | ma-vigamadera | Apta | — | — |
| 16 | ma-colmadera | Apta | — | — |
| 17 | ma-tijeral | Apta, con observación | No verifica viento sobre la cobertura | No (observación) |
| 18 | ma-reservorio | Apta, con corrección | Mb y Mo se calculaban pero no se usaban | Sí |
| 19 | ma-cisterna | **Corregida (Alta)** | Sin sismo, sin losa de fondo y sin flotación; con sismo, la cara exterior quedaba 43 % corta | Sí |
| 20 | ma-elevado | Apta, con observación | No considera la puerta del fuste | Nota en la memoria |
| 21 | ex-escalera-2t | Apta | — | — |
| 22 | ex-piso-ind | Apta | — | — |
| 23 | ex-pav-rigido | Apta | — | — |
| 24 | ex-cim-maquina | Apta, con corrección | Sin variación del módulo G; «empotramiento despreciado = conservador» es falso cuando fop > fn | Sí |
| 25 | ex-viga-acople | Apta | — | — |
| 26 | ex-diafragma | Apta | — | — |
| 27 | ex-pase-aereo | Apta, con observación | No incluye la zapata de las torres | No (observación) |
| 28 | ex-muro-anclado | Apta, con observación | No verifica la componente vertical de los anclajes en la base de la pantalla | No (observación) |
| 29 | ex-letrero | Apta, con corrección | La tracción de los pernos se aliviaba con 1.2D en lugar de 0.9D | Sí |
| 30 | ex-frp | Apta | — | — |
| 31 | ex-pilote-fuste | Apta | — | — |
| 32 | ex-encamisado | Apta | — | — |

## Detalle por plantilla

### 1. br-presforzada (viga AASHTO Tipo IV, 100 ft)
**Veredicto: corregida.** Pérdidas (20 % de fpj), esfuerzos en transferencia y servicio, fps, Mcr con γ1 = 1.6 y
γ3 = 1.0, y MCFT coinciden con el método de la 9.ª ed. Con L = 140 ft da NO CUMPLE en compresión, Servicio III y
flexión, lo que es coherente. Faltaban cuatro requisitos que un revisor del MTC exige en toda viga pretensada:

| Hallazgo | Gravedad | Cita | Corrección |
|---|---|---|---|
| La tracción superior en el extremo (0.309 ksi) supera 0.0948√f'ci ≤ 0.20 ksi. El límite 0.24√f'ci que usaba la plantilla solo vale con refuerzo adherido que tome toda la tracción, y ese refuerzo no se calculaba. | Media | AASHTO 9.ª ed. Tabla 5.9.2.3.1b-1 | `ftr0`, profundidad `ytz`, fuerza `Ttz`, `As_tz` con fs = 0.5fy ≤ 30 ksi (0.50 in²) y check con 4#5 (D/C 0.41). |
| No se verificaba el refuerzo longitudinal en la cara del apoyo, donde el torón no está desarrollado (fpx = fpe·lpx/60db = 81 ksi). | Media | 5.7.3.5-2, 5.9.4.3.2 | `lpx`, `ldv`, `fpx`, `Treq = (Vu/φ − 0.5Vs − Vp)cot θ` = 339.6 kip ≤ Aps·fpx = 529.1 kip (D/C 0.64). |
| Faltaba el cortante de interfaz viga–losa de la sección compuesta. | Media | 5.7.4.3, 5.7.4.2-1 | `Vui = Vu/dv`, `Vni = c·Acv + μAvf fy ≤ K1f'c Acv, K2 Acv` (D/C 0.71) y Avf mínimo. |
| Faltaba el refuerzo de hendimiento en la zona de anclaje. | Media | 5.9.4.4.1 | `Prq = 0.04Aps fpj`, As = 2.64 in² frente a 5 estribos #5 dentro de h/4 (D/C 0.85). |
| El punto de desvío de los torones (0.4L) no se verifica en la transferencia. | Baja | 5.9.2.3.1 | Observación: con em igual y Mg(0.4L) = 0.96Mg, la diferencia es menor al 2 %. |

### 2. br-acero (viga I armada compuesta, 100 ft)
**Veredicto: corregida.** Mp por los tres casos de la ENP, ductilidad Dp ≤ 0.42Dt, Servicio II con 1.30LL y
constructibilidad con Lb = 20 ft coinciden con 6.10 y D6.1.

| Hallazgo | Gravedad | Cita | Corrección |
|---|---|---|---|
| En vigas armadas los rigidizadores de apoyo son obligatorios. La reacción es de 283 kip con un alma de D/tw = 96 sin rigidizar. | Media | 6.10.11.2 | Par de platinas 6 × ¾ in: bt/tp ≤ 0.48√(E/Fys), aplastamiento 1.4·Apn·Fy (D/C 0.54) y columna con 9tw y KL = 0.75D, φc = 0.95 (D/C 0.45). |
| No se verificaba la fatiga del ala inferior traccionada. | Media | 6.6.1.2, Tabla 6.6.1.2.5-3 | Fatiga I: γΔf = 1.75·(gM1/1.2)·1.15·Mfat/Sbn = 7.76 ksi ≤ 12 ksi (categoría C′, D/C 0.65). |
| La sección «compuesta» no tenía conectores de corte. | Media | 6.10.10.1, 6.10.10.2, 6.10.10.4 | Pernos de ⅞ in: H/d ≥ 4, 6d ≤ p ≤ 24 in, penetración y recubrimiento, paso por fatiga p ≤ nZr·I/(Vsr·Q) = 9.27 in con p = 9 in (D/C 0.97) y número por resistencia 198 ≥ 92. |
| `ww` y `wcl` sin conversión explícita. | Baja | — | `-> kip/ft`. |

### 3. br-sismo (espectro, carga uniforme y N)
**Veredicto: corregida.** Factores de sitio con interpolación, espectro, zona, método de carga uniforme y N coinciden con
3.10 y 4.7.4.

| Hallazgo | Gravedad | Cita | Corrección |
|---|---|---|---|
| R era siempre el de «pórtico de varias columnas» (3.5 esencial, 5.0 otros). En el Perú el pilar más común es la columna simple (2.0 / 3.0) o el pilar tipo muro (1.5 / 2.0). Con columna simple la fuerza de diseño era 155.7 t en lugar de 272.5 t (−43 %). | Media | Tabla 3.10.7.1-1 | Lista `sub` con los cinco tipos de subestructura y R según la categoría operativa. |
| `check zona >= 1 and zona <= 4` no verifica nada. | Baja | — | Eliminado. |
| Solo dirección longitudinal; no hay transversal ni 100 %–30 %, ni amplificación de desplazamientos para periodos cortos. | Baja | 3.10.8; 4.7.4.3 | Observación: la memoria es un cálculo de fuerzas de la subestructura en una dirección. |

### 4. br-alcantarilla (marco 3.00 × 2.50 m)
**Veredicto: apta, con corrección.** Fe, LLDF = 1.15, IM enterrado, EH en reposo con 50 % para M⁺ y pendiente-deflexión
están bien.

| Hallazgo | Gravedad | Cita | Corrección |
|---|---|---|---|
| Solo se verificaba el cortante de la losa superior. La inferior recibe la reacción del suelo de toda la estructura (qb = 8.9 t/m frente a qt = 4.9 t/m). | Media | 5.12.7.3 | `Vu3`, `vcs3`, `Vc3` y check (D/C 0.55). Con Hf = 6 m da NO CUMPLE. |
| No se verificaba la presión de contacto. | Baja | E.050 | Dato `qadm = 1.0 kg/cm²` y check en Servicio I (0.72 kg/cm², D/C 0.72). |
| Presiones del combo sin unidad forzada. | Baja | — | `-> tonf/m` en qb, pA, pB, pLLt y pLLd. |

### 5. br-peatonal (pasarela de 30 m)
**Veredicto: corregida.** Carga peatonal de 4.3 kPa, H5, L/360 y frecuencias de 3.06 Hz y 3.32 Hz son correctas.

| Hallazgo | Gravedad | Cita | Corrección |
|---|---|---|---|
| La flexión suponía el ala superior «arriostrada continuamente por la losa», pero la losa no es compuesta y durante el vaciado el ala solo está arriostrada por los diafragmas. Faltaba la constructibilidad. | Media | 6.10.3.2.1, 6.10.8.2.3 | Datos `Lb = 5 m` y `wcon = 0.96 kPa`; Mcon = (1.25DC + 1.5C)L²/8, Lp, Lr, pandeo lateral-torsional con Cb = 1 (fbc = 79 MPa frente a 294 MPa, D/C 0.27). Texto: la losa debe fijarse al ala. |
| Faltan los rigidizadores de apoyo y el viento sobre la pasarela. | Baja | 6.10.11.2; Guide Spec 3.4 | Observación. |

### 6–7. st-columna y st-vigacolumna
**Veredicto: aptas.** Reproducen E.1A (φPn = 893 kip) y H.1A (0.928). E7 con c1/c2 de la Tabla E7.1, F2/F3/F6 y H1-1 son
correctos. Con Mux = 900 kip·ft da NO CUMPLE.

### 8. st-traccion
**Veredicto: apta, con corrección.** D2, U = 0.869, J3 y J4.3 son correctos.

| Hallazgo | Gravedad | Cita | Corrección |
|---|---|---|---|
| La distancia mínima al borde era 1⅛ in fija («para ⅞ in»). Con un perno de 1 in (opción de la lista), le = 1⅛ in pasaba, pero se exige 1¼ in. | Baja | AISC 360 Tabla J3.4 | `lemin` según el diámetro. Prueba: con 1 in y le = 1⅛ in da NO CUMPLE. |

### 9. st-shear-tab
**Veredicto: apta, con observación.** Configuración convencional, método elástico con e = a (conservador), J3, J4 y la
soldadura 5/8·tp son correctos. Observación (Baja): el perno crítico tiene una componente horizontal hacia el extremo de la
viga; en vigas con extremo cercano (≤ 1½ in) debe verificarse el desgarramiento del alma con esa componente (Manual AISC,
Parte 10).

### 10. st-correas
**Veredicto: corregida.**

| Hallazgo | Gravedad | Cita | Corrección |
|---|---|---|---|
| La flexión por gravedad solo usaba 1.4D y 1.2D + 1.6Lr. La E.090 1.4-3 es **1.2D + 1.6Lr + 0.8W** con el viento en presión (barlovento +0.3 y succión interior −0.3, 16.9 kg/m²), y 1.4-4 es 1.2D + 1.3W + 0.5Lr. Con ellas Mux pasa de 337.9 a 410.8 kgf·m (+21.6 %) y la flexión biaxial de D/C 0.65 a 0.78. Con una luz de 7 m la plantilla anterior aprobaba una correa que no cumple. | **Alta** | E.090 1.4.1 (1.4-3, 1.4-4); E.020 Tabla 4 y 12.5 | Dato `Cextp = 0.3`, `phd`, `wWd`, `wun3`, `wun4` y `wun = máx(…)`. El viento no tiene componente tangencial (`wut` no cambia). |

### 11. st-armadura
**Veredicto: corregida.**

| Hallazgo | Gravedad | Cita | Corrección |
|---|---|---|---|
| Mismo caso que las correas: faltaba el 0.8W en presión. wu pasa de 0.360 a 0.428 t/m (+19 %) y la cuerda superior de D/C 0.77 a 0.915. | Media | E.090 1.4-3, 1.4-4 | Dato `pWp = 17 kg/m²`, `wu3`, `wu4` y `wu = máx(1.4D, wu3, wu4)`. |
| No se verificaba la soldadura de los ángulos del alma (lw = 6 cm es un dato). | Media | AISC 360 J2.2b, J2.4, Tabla J2.4 | Filete de ⅛ in: mínimo de la Tabla J2.4, lw ≥ 4w y φRn = 0.75·0.6·FEXX·0.707w·2lw ≥ máx(Fd, Fdu, Fv0) (D/C 0.79). Nota sobre la plastificación de la pared del HSS (Cap. K). |
| La validación describía `dv` como «deflexión por carga viva», pero es D + Lr. | Baja | — | Descripción corregida. |

### 12. st-compuesta (viga de 9 m, oficinas)
**Veredicto: corregida.** I3.2a con compuesta parcial, Qn con Rp = 0.6 e ILB son correctos.

| Hallazgo | Gravedad | Cita | Corrección |
|---|---|---|---|
| No se verificaba la vibración por caminar. Para una oficina de 9 m de luz con W12×19 (L/d = 29) la aceleración del modo de viga es ap/g = 0.69 % > 0.5 %, y con vigas principales flexibles sería mayor. | Media (servicio; es el reclamo más frecuente en losas colaborantes) | AISC Design Guide 11, 2.ª ed., Ec. 3-3, 4-1 a 4-3 y Tablas 4-1 y 4-2 | Sección DG11: Ec dinámico 1.35Ec, Itr, fn = 0.18√(g/Δ), Ds, Dj, Bj ≤ ⅔ del ancho del piso, W y ap/g ≤ 0.5 %. **Perfil por defecto W12×19 → W16×31** (fn = 5.9 Hz, ap/g = 0.42 %). |
| Faltaban la longitud del conector sobre la cresta y el recubrimiento, y la separación máxima. | Baja | I3.2c(2), I8.2d | Dato `Hsa = 4 in` y tres checks. |

### 13. st-viga-ipe
**Veredicto: apta.** F2, Cb del segmento, comparación con la E.090 (X1, X2, FL), J10 y flechas son correctos. Si Lb > Lr
la verificación «zona inelástica» da NO CUMPLE en lugar de calcular el pandeo elástico; es una limitación declarada.

### 14. ma-adobe (E.080-2017)
**Veredicto: apta.** Límites de la Fig. 2, densidad, H = SUCP, corte con +20 % por muros transversales, compresión y
flexión fuera del plano con 3 bordes. Con los datos por defecto varias relaciones geométricas quedan exactamente en el
límite (D/C = 1.00) y el corte en 0.98; es correcto, pero cualquier vano adicional saca la vivienda de la norma. En zonas
3 y 4 da NO CUMPLE, como advierte la nota. El desempeño del refuerzo (Art. 7.3.3) no se cuantifica y así está declarado.

### 15–16. ma-vigamadera y ma-colmadera (E.010)
**Veredicto: aptas.** Esfuerzos admisibles con +10 % de acción de conjunto, corte a h del apoyo, 1.8CM + CV en flechas,
h/b, λ, Ck = 18.34 (grupo B), Nadm y km son correctos.

### 17. ma-tijeral
**Veredicto: apta, con observación.** Howe con 0.9l en el plano, flexocompresión de la cuerda superior, tracción con área
neta y diagonales. Observación (Baja): con teja de fibrocemento (60 kg/m² de carga muerta) el viento de barlovento en
pendientes de 15° a 60° es de presión (+0.7) y debe combinarse con la carga muerta (E.020 Tabla 4). No gobierna con los
datos por defecto, pero debe evaluarse en coberturas más livianas.

### 18. ma-reservorio (250 m³)
**Veredicto: apta, con corrección.** Cáscara PCA, Sd de ACI 350-06, Housner con convectiva restringida si dmax > borde
libre, tensión anular sísmica y corte-fricción son correctos. Ti = 0.019 s se comprobó a mano: es correcto para un tanque
achatado con D/HL = 2.25.

| Hallazgo | Gravedad | Cita | Corrección |
|---|---|---|---|
| El momento sísmico de la base (Mb = 661 t·m) y el de volteo se calculaban pero no se usaban. La tracción vertical de membrana Mb/(πr²) no se verificaba. | Baja (no gobierna aquí) | ACI 350.3-06 R5.3; ACI 350-06 9.2.1 | `Nvm`, `Nvd`, `Nvu = Nvm − 0.9Nvd` = 5.9 t/m y check con el acero vertical (D/C 0.08). |
| No incluye la losa de fondo, el anillo de cimentación ni la estabilidad al volteo (Mo = 998 t·m). | Baja | — | Observación: se diseñan aparte. |

### 19. ma-cisterna (26 m³ enterrada)
**Veredicto: corregida.**

| Hallazgo | Gravedad | Cita | Corrección |
|---|---|---|---|
| Sin sismo. Una cisterna enterrada en zona 4 recibe el incremento dinámico del suelo sobre muros rígidos. Con Wood (Δp = Z·S·γ·H = 2.36 t/m², el mismo criterio que *wa-sotano*) y U = 1.7CE + 1.0CS, el momento vertical exterior pasa de 1.16 a 2.14 t·m/m y el acero de 4.87 a 9.35 cm²/m. Con 1/2" @ 20 (6.45 cm²/m) la cara exterior quedaba con D/C 1.43. | **Alta** | E.030 (PGA = Z·S); Wood (1973); E.060 9.2 | Datos `Z` y `S`, bloque `tankwall` con el sismo (sufijo e), momentos de diseño `Ms + Me/1.7` (el factor 1.7 × 1.30 se aplica después) y Vu = 1.7Vbs + Vbe. **Varilla por defecto 1/2" → 5/8" @ 20** (D/C 0.94 en la cara exterior y en el cortante). |
| No se diseñaba la losa de fondo, que recibe el momento de la base de las paredes y la presión neta del suelo. | Media | ACI 350-06; PCA | Placa empotrada con qn = (Wcon − Wfo + Wsc)/A (`tankwall`, sufijo f), acero inferior ≥ máx(MyNf, Mve) y superior ≥ máx(MyPf, Mvi) (D/C 0.68). |
| Sin flotación ni nivel freático. | Media | Práctica ACI 350.4R / USACE (FS ≥ 1.25) | Dato `Hnf`, check «NF bajo el fondo (hipótesis de suelo seco)» y FS a la flotación con 0.9 del peso propio. Con NF a 1.0 m ambas dan NO CUMPLE. |

### 20. ma-elevado (85 m³ sobre fuste)
**Veredicto: apta, con observación.** Dos masas de Housner, convectiva con 1.5 (0.5 %), masa restringida, φ de la E.060
9.3.2.2 en el anillo y cortante 11.10 son correctos.

| Hallazgo | Gravedad | Cita | Corrección |
|---|---|---|---|
| El fuste se verifica con la sección anular completa; la puerta de acceso en la base reduce la sección donde el momento es máximo. | Media | ACI 371R-16 4.4.3 y 4.4.5 | Nota en la memoria: verificar la sección neta, las pilastras de borde y el dintel. La cimentación se diseña aparte. |

### 21–23. ex-escalera-2t, ex-piso-ind y ex-pav-rigido
**Veredicto: aptas.** Escalera: RA y Mmáx cerrados frente al análisis matricial, Branson y ℓ/240. Piso: Westergaard
(Huang 4.1–4.3), punzonamiento de concreto simple con h − 50 mm y φ = 0.60, Packard. Pavimento: la ecuación AASHTO 93
reproduce el Ej. 12.6 de Huang. Observación (Baja) en el piso: los postes de racks junto a juntas deben verificarse con el
esfuerzo de borde.

### 24. ex-cim-maquina
**Veredicto: apta, con corrección.** Richart–Hall–Woods, Fo = SF·mr·G·ω y las tres frecuencias son correctos.

| Hallazgo | Gravedad | Cita | Corrección |
|---|---|---|---|
| La no resonancia se verificaba solo con G nominal. Además, la memoria decía que despreciar el empotramiento es «conservador para las frecuencias». Eso es falso cuando la máquina opera sobre la frecuencia natural (sintonía baja): el empotramiento sube fn hacia fop. | Media | ACI 351.3R-18 Cap. 4 (variación de las propiedades del suelo) | Texto corregido y tres checks con G entre 0.5G y 1.5G. Con Vs = 410 m/s, rz = 1.35 pasa ±20 % pero da NO CUMPLE con 1.5G (prueba). |

### 25–26. ex-viga-acople y ex-diafragma
**Veredicto: aptas.** Acople: Avd con φ = 0.85, límite 0.83√f'c Acw, confinamiento de toda la sección y 1.25ℓd. Diafragma:
la equivalencia 0.2SDS ↔ 0.5ZUS es correcta para la E.030 (Z de diseño, no MCE), con colectores con Ω0, cortante-fricción
en la unión y flexibilidad del diafragma.

### 27. ex-pase-aereo
**Veredicto: apta, con observación.** Cable parabólico con la carga de mantenimiento, péndolas, silla con desequilibrio
horizontal, magnificación de la torre en voladizo y cámara de anclaje. Observación (Baja): falta la zapata de las torres
(Pu y Mu en la base) y el sismo de las torres. En la sierra conviene subir el FS del cable a 3.5–4.

### 28. ex-muro-anclado
**Veredicto: apta, con observación.** Envolvente 0.65KaγH², áreas tributarias, PTI (0.60/0.70/0.80 fpu), longitud libre
más allá de la cuña y bulbo ≥ 4.5 m. Observación (Media, no corregida): la componente vertical de los anclajes
(Σ T·tan 15° ≈ 7.9 t/m) más el peso de la pantalla (6.5 t/m) se transmite a la base de la pantalla. Debe verificarse la
capacidad portante de la base o de la zapata corrida y el asentamiento durante la excavación (FHWA GEC-4, cap. 5). Falta el dato de
capacidad de la base, por eso no se agregó el check.

### 29. ex-letrero
**Veredicto: apta, con corrección.**

| Hallazgo | Gravedad | Cita | Corrección |
|---|---|---|---|
| La tracción del perno se aliviaba con Pu = 1.2D. Para el levantamiento la carga muerta entra con 0.9. | Baja | E.090 1.4-6; ASCE 7 2.3 | `Tb = 4Mu/(n·Dbc) − 0.9·Wd/n` (prueba). |
| No se diseña la zapata a flexión ni la placa base. | Baja | — | Observación. |

### 30–32. ex-frp, ex-pilote-fuste y ex-encamisado
**Veredicto: aptas.** FRP: reproduce el Ej. 16.3 del ACI 440.2R-17, con el límite 1.1D + 0.75L, εfd, ψf = 0.85 y
creep-rupture. Pilote: φ = 0.55, Matlock–Reese con cabeza empotrada, P–M circular y espiral de 18.13.5.7.1. Encamisado:
la sección monolítica con el f'c existente y sin las barras antiguas, la reducción 0.9 en cortante y el cortante-fricción
de la carga en exceso son conservadores.

## Hallazgos en el motor y en los bloques (no editables por este revisor)

| # | Dónde | Hallazgo | Gravedad | Propuesta |
|---|---|---|---|---|
| M5 | Render KaTeX (motor) | Un `floor()` cuyo argumento contiene una fracción anidada (`floor(L/2/pst)`) o una `sqrt` muy alta generan en el navegador un `<path d="…MM…">` inválido (error de consola en `qa-render`). | Baja | Normalizar el path de los delimitadores altos o evitar `\dfrac` anidados dentro de `\left\lfloor`. Se mitigó en *br-acero* (`floor(L/(2*pst))` y radio de giro en dos líneas). |
| M6 | Bloque `armadura` (`src/blocks/steel.js`) | Las etiquetas de fuerza de la diagonal y del montante extremos se superponen (16 %) cuando las fuerzas pasan de ~0.9 t con tres decimales. Aparece en *st-armadura* con el 0.8W. | Baja | Detectar colisiones y desplazar la etiqueta, o redondear a dos decimales. |
| M7 | Resumen de verificaciones | Cuando la cita va entre paréntesis en la etiqueta del `check` («… (5.9.4.4.1)»), la columna «Referencia» queda en «—». | Baja | Extraer la cita final entre paréntesis como referencia. |
| M8 | `VfatLRFD`, `MfatLRFD` | Devuelven tonf o tonf·m también en memorias en unidades inglesas, y la sustitución muestra «26.8 tonf» en medio de kip. | Baja | Devolver en la unidad del sistema del documento o en kip si `settings.sys = 'us'`. |
| M4 (bis) | Render de sustituciones | Persiste el desborde de `max(…)` largos (combinaciones de correas y vigueta). | Baja | Ver M4. Se mitigó dividiendo en `wun3/wun4` y `wu3/wu4`. |

## Pruebas añadidas (tercera tanda A)

- `tests/bridges.test.mjs`: Treq de 5.7.3.5-2 y fpx = fpe·lpx/60db; Vni de interfaz; hendimiento 0.04Aps fpj/20; refuerzo de
  transferencia; Fatiga I del ala; Qn = Asc·Fu; paso por fatiga; aplastamiento del rigidizador; R de columna simple
  (2.0) frente a pórtico (3.5); cortante de la losa inferior de la alcantarilla; Lp de la pasarela.
- `tests/steel.test.mjs`: Mux de las correas con 0.8W; fuerzas de la vigueta con wu = 0.428 t/m y soldadura; φMn de la viga
  compuesta W16×31 a mano; W12×19 con ap/g > 0.5 % (NO CUMPLE); fn = 0.18√(g/Δ).
- `tests/masonry.test.mjs`: Δp de Wood en la cisterna; Mve = máx(MyPa, MyNs + MyNe/1.7); NF a 1.0 m con NO CUMPLE en
  flotación y en la hipótesis de suelo seco; 1/2" @ 20 con NO CUMPLE en la cara exterior; Nvm = Mb/(πr²) del reservorio.
- `tests/extras.test.mjs`: máquina con Vs = 410 m/s (pasa ±20 % y no pasa con 1.5G); tracción de los pernos del letrero
  con 0.9D.

Validaciones modificadas, con la justificación de arriba:

- `st-correas.Mux`: 337.9 → 410.8 kgf·m (E.090 1.4-3, 0.8W).
- `st-armadura.Fcs`: 8.10 → 9.63 t y `Fd`: 4.016 → 4.775 t (E.090 1.4-3).
- `st-compuesta`: perfil W12×19 → W16×31 (AISC DG11). `phiMn` 28.7 → 48.38 t·m, `Mu` 24.38 → 24.59 t·m y `dL`
  1.834 → 0.880 cm; se agregó `apg` = 0.0042.
- `ma-cisterna` no tiene `validacion`; su varilla por defecto pasó de 1/2" a 5/8" @ 20 (sismo del suelo).

---

# Tercera tanda B: plantillas aún no revisadas de base, Chile, Japón, dinámica, análisis, Perú, concreto, geotecnia y muros

Revisor: ingeniero jefe (misma metodología y escala de gravedad). Fecha: octubre de 2026. Alcance: las 70 plantillas de
`src/templates.js` y de `src/templates/{chile,japan,dynamics,analysis,peru,concrete,geotech,walls}.js` que no figuraban en
las dos tandas anteriores. Los módulos *bridges*, *steel*, *masonry* y *extras* los revisa otro agente en paralelo.

**Método.** Cada plantilla se ejecutó con `runTemplate` y se leyó la memoria línea por línea: fórmula, valor y artículo
citado. Luego se probaron cambios realistas de datos: otra zona, suelo blando, más carga, luces mayores, otra barra u otro
sistema. Se revisaron renderizadas (`build.mjs` + `shot.mjs --paper`) *puente*, *asce7*, *co-colesbelta* y *wa-mse*, y las
100 plantillas de estos módulos pasaron por `tools/qa-render.mjs --no-shot`. No quedan errores de render en estas
plantillas; solo persisten tres avisos «sin resumen» en *espectros*, *combos* y *blanco*, que son plantillas sin
verificaciones.

**Archivos editados:** `src/templates.js`, `src/templates/{analysis,japan,peru,concrete,geotech,walls}.js`,
`tests/verify.mjs` y `tests/{analysis,japan,concrete,geotech,walls,peru}.test.mjs`. Al final, `node tests/run.mjs` pasa
completo.

## Resumen

| Plantilla | Veredicto | Hallazgo principal | Corregido |
|---|---|---|---|
| aci | Apta, con corrección | 5 Ø 20 mm en un alma de 300 mm dejaban 25.0 mm libres, menos que 4/3·dagg = 25.3 mm | Sí (barra 22 mm y check 25.2.1) |
| ec2 | Apta | x/d ≤ 0.45 frente a 0.448 exacto (k1 = 0.44, k2 = 1.25) | No (diferencia de 0.4 %) |
| portante | Apta | Sin advertencia de corte local en suelos sueltos | No (observación) |
| muro | Apta | — | — |
| asce7 | **Corregida (Media)** | Sin SDC, sin limitaciones del sistema (Tabla 12.2-1) y sin P-Δ (12.8.7) | Sí |
| japon | Apta | — | — |
| espectros | Apta, con corrección | Z editable, pero S calculado siempre con la zona 4 | Sí |
| sismo2018 | Apta | Sin P-Δ: el texto de la E.030-2018 no lo exige | No (observación) |
| puente | **Corregida (Media)** | Faltaba la franja de borde, que gobierna (73.7 > 73.5 t·m/m) | Sí |
| acero | Apta | Sin control de deflexión (no hay luz en los datos) | No |
| predim, combos, albanileria, guia, blanco | Aptas | — | — |
| cl-nch433-estatico, cl-nch433-modal, cl-nch433-2026, cl-nch433-comparacion, cl-nch2369, cl-nch3171 | Aptas | — | — |
| cl-muro-ds60 | Apta, con observación | δu/hw sin el mínimo de 0.007 de ACI 318-08 21.9.6.2 | No (verificar con el DS60) |
| cl-viento-galpon | Apta, con observación | Presión interior con signo distinto en el muro de barlovento | No (conservador) |
| jp-bsl-ruta12, jp-bsl-ruta3, jp-aij-viga, jp-aij-columna, jp-aij-acero, jp-bsl-viento-nieve, jp-bsl-n1461 | Aptas | — | — |
| jp-madera-kaberyo | **Corregida (Media)** | c_w de la tabla anterior a la reforma de 2025, sin forma de ingresar el vigente | Sí |
| jp-jra-espectro | **Corregida (Media)** | Faltaba el desplazamiento residual de nivel 2 (JRA V 6.4.6) | Sí |
| dy-sdof-elcentro, dy-espectro-e030, dy-5pisos-chopra, dy-nl-cortante, dy-pushover-n2, dy-momcurv-col | Aptas (didácticas) | — | — |
| dy-aislamiento | Apta (didáctica), con observación | Un solo registro y sin DTM ni λ: no sirve para diseñar | No (remite a *pe-e031*) |
| an-armadura | **Corregida (Media)** | Sin viento: no se verificaba la inversión de esfuerzos | Sí |
| an-nave | **Corregida (Media)** | Se suponía Mn = Mp (Lb ≤ Lp) sin dato de arriostramiento del ala interior | Sí |
| an-voladizo | **Corregida (Media)** | Mu = 1.5·Ms (factor «promedio») y sin sismo vertical | Sí |
| an-influencia, an-matricial, an-cross | Aptas | — | — |
| an-modal-pdelta | Apta, con observación | Usa la E.030-2018 | No |
| pe-e030-irregularidades, pe-e031-aislamiento | Aptas | — | — |
| pe-e020-viento | Apta, con corrección | El levantamiento de la cobertura se estabilizaba con 0.9 CM frente a un viento de servicio | Sí (0.6 CM) |
| co-colesbelta | **Corregida (Media-Alta)** | Sin verificación biaxial: con 12 Ø 3/4" la D/C biaxial era 1.12 | Sí |
| co-biaxial, co-vigat, co-vigadoble, co-deflexion, co-aligerado2d, co-mensula, co-stm, co-anclajes | Aptas | — | — |
| co-vigaductil | Apta, con observación | Vc en Lo: la E.060 no lo anula; el ACI 318-19 18.6.5.2 sí | No |
| co-voladizo (ya revisada) | Corrección de presentación | Ecuación de Vud2 al 68 % del ancho de la hoja | Sí |
| ge-winkler | Apta, con corrección | No se verificaba Av,mín cuando Vu > 0.5 φVc | Sí |
| ge-corrido, ge-spt | Aptas | — | — |
| ge-grupo | Apta, con observación | No se verifica la capacidad estructural del pilote | No |
| ge-talud | **Corregida (Media)** | kh = 0.15 fijo, sin relación con la zona ni con el suelo | Sí |
| wa-contrafuertes | **Corregida (Alta)** | Talón y tirantes verticales diseñados solo en condición estática; con sismo la carga neta es 2.6 veces mayor | Sí |
| wa-mse | **Corregida (Media-Alta)** | Sin estabilidad interna con sismo (11.10.7.2) | Sí |
| wa-coeficientes, wa-gaviones | Aptas | — | — |
| wa-tablestaca, wa-tablestaca-anclada | Aptas para obra provisional | Cálculo solo estático | Nota en la memoria |

## Detalle por plantilla

### Plantillas base (`src/templates.js`)

**aci — apta, con corrección.** φ por εt, εt ≥ 0.004, Asmín, Vc según la Tabla 22.5.5.1, λs y smáx están bien.

| Hallazgo | Gravedad | Cita | Corrección |
|---|---|---|---|
| Con Ø 20 mm resultaban 5 barras en 300 mm: separación libre de 25.0 mm, menor que máx(25 mm, db, 4/3·19 mm) = 25.3 mm. La memoria supone una sola capa en *d*. | Baja-Media (constructibilidad; con dos capas *d* baja) | ACI 318-19 25.2.1 | Dato `dagg`, `sl` y check. **Barra por defecto 20 → 22 mm** (4 barras, 37.3 mm). Validación: d 540 → 539 mm, As 1320 → 1322.5 mm², φMn 293.2 → 284.1 kN·m, Vc 145.7 → 145.5 kN y φVn 216.2 → 215.8 kN. |

**ec2 — apta.** Observación (Baja): el límite x/d ≤ 0.45 redondea el valor exacto de 5.5(4) con δ = 1, que es
(1 − 0.44)/1.25 = 0.448. Con los datos por defecto x/d = 0.21.

**portante — apta.** Ecuación general con De Beer y Hansen. Observación (Baja): con φ ≤ 30° y arena suelta la falla puede
ser por corte local (Terzaghi c′ = 2c/3, φ′ = atan(2/3 tan φ)). La memoria remite a *ge-portante* y al EMS.

**muro — apta.** Sobrecarga excluida de los momentos y fuerzas estabilizantes (conservador), 1.7E en la pantalla y
mínimos de 14.3.

**asce7 — corregida.**

| Hallazgo | Gravedad | Cita | Corrección |
|---|---|---|---|
| No se determinaba la categoría de diseño sísmico. Con SDS = 1.0 (SDC D) se podía elegir «C.7 pórtico ordinario de C°A°» con R = 3, que **no está permitido** (NP) en SDC C–F, o «C.6 pórtico intermedio», NP en D–F. | Media | ASCE 7-22 11.6 (Tablas 11.6-1 y 11.6-2), Tabla 12.2-1 | `cSDS`, `cSD1`, `SDC` (con S1 ≥ 0.75 → E/F) y check del sistema con los límites de altura de B.4 y B.1. |
| La opción «solo irregularidades H2–H5/V4–V5» se aceptaba con hn ≤ 48.8 m (criterio de la edición 2010). Desde la edición 2016 la condición es T < 3.5 Ts. En SDC A–C la Tabla 12.6-1 no restringe. | Baja | ASCE 7-22 Tabla 12.6-1 | Check reescrito. |
| No se evaluaba el efecto P-Δ. | Media | ASCE 7-22 12.8.7 | `Px`, `theta`, `thetamax` = 0.5/Cd ≤ 0.25 y check θ ≤ mín(0.10, θmáx). Por defecto, θ = 0.017. |

**japon — apta.** Ci = Z·Rt·Ai·Co, deriva de 1/200 y Qun = Ds·Fes·Qud coinciden con la Orden Art. 88 y la Notif. 1793.

**espectros — apta, con corrección.** Z era editable, pero `S = SE030(4, …)` quedaba fijo en la zona 4. Al cambiar Z a 0.25,
el espectro peruano mezclaba la zona 2 con el S de la zona 4 (Baja). Se agregaron los datos `zona` y `Vs30`, con
`Z = ZE030(zona)` y `S`, `TP` y `TL` del mismo Vs30. La validación no cambia.

**sismo2018 — apta.** La restricción de irregularidades de la Tabla 10, la aplicabilidad 28.1.2, C/R ≥ 0.11 y 0.75R/0.85R
están conformes con el texto de 2018. El texto de la norma confirma que el mínimo de C/R no se aplica a los
desplazamientos. Observación: la E.030-2018 no contiene un artículo de P-Δ. Para concreto conviene el Q de la E.060
10.11.4.2.

**puente — corregida.**

| Hallazgo | Gravedad | Cita | Corrección |
|---|---|---|---|
| Solo se diseñaba la franja interior; el texto decía «diseñar la franja de borde». La franja de borde (Eb = 1.80 m) soporta una barrera completa, media línea de ruedas y el carril tributario con m = 1.2: **Mu = 73.7 t·m/m frente a φMn = 73.5 t·m/m** de la armadura interior #8 @ 12.5. Los bordes del plano quedaban subarmados. | **Media** | AASHTO LRFD 4.6.2.1.4, 3.6.1.1.2 y 3.6.1.2.4 | Dato `bb`; `Eb`, `MDCb`, `MDWb`, `MLLb`, `Mub`; diseño propio con `sb` = 10 cm, εt ≥ 0.005 y φMn,b = 90.1 t·m/m. La validación no cambia. |

**acero — apta.** F2 y G2.1(a) correctos; validado con la Tabla 3-2. Observación (Baja): no verifica la deflexión
porque no hay luz en los datos.

**predim, combos, albanileria, guia, blanco — aptas.** Las combinaciones 9.2.1 a 9.2.3 y las de viento 9.2.2 están bien.
Fa, Vm, α y Ve ≤ 0.55Vm coinciden con la E.070. Las reglas de *predim* se declaran como referenciales.

### Chile

**cl-nch433-estatico y cl-nch433-2026 — aptas.** Aplicabilidad 6.2.1, Cmín y Cmáx·f, Ak, torsión accidental
±0.10·b·Zk/H y derivas de 5.9.2 y 5.9.3. La versión 2026 declara que cita el proyecto de consulta y marca como «por
confirmar» la deriva absoluta de 0.003. Eso es correcto.

**cl-nch433-modal — apta.** R*, Sa, CQC, ΣM* ≥ 90 % y el factor de corte mínimo aplicado también a los desplazamientos
(6.3.7.1). Qmáx sin f es conservador y está declarado.

**cl-nch433-comparacion — apta.** La degradación de C a D por Tg = 0.45 s es coherente (S de 1.05 a 1.20, Q × 1.14).

**cl-nch2369 — apta.** Cmáx según la Tabla 5.7, R1, deformación ≤ 0.015h y separación 6.2.1.

**cl-muro-ds60 — apta, con observación.** Pu ≤ 0.35 f′c Ag, εc ≤ 0.008, el borde y el corte con φ = 0.60 (conservador)
están bien. Observación (Media, por confirmar): `clim = lw/(600·δu/hw)` usa el δu de la NCh433 5.9.5 sin el mínimo
δu/hw ≥ 0.007 de ACI 318-08 21.9.6.2(a). Con los datos por defecto no cambia el resultado: c = 1.21 m, menor que los 1.43 m
que da 0.007. Se debe confirmar si el DS60 mantiene ese mínimo. No se cambió.

**cl-viento-galpon — apta, con observación.** El equilibrio del marco para el levantamiento es correcto: 3B/8, B/8 y las
componentes horizontales del techo. Observación (Baja, conservadora): `pmb` usa succión interior (+qh·GCpi) y las demás
superficies usan presión interior. La presión interior es única en todo el edificio, por lo que deben evaluarse dos casos
(±GCpi en todas las caras). La mezcla sobrestima en 2·qh·GCpi la fuerza horizontal del marco.

**cl-nch3171 — apta.** Combinaciones LRFD con 1.4E y combinaciones ASD.

### Japón

**jp-bsl-ruta12, jp-bsl-ruta3, jp-aij-viga, jp-aij-columna, jp-aij-acero, jp-bsl-viento-nieve, jp-bsl-n1461 — aptas.** Son
correctos: Rs ≥ 0.6, Re ≤ 0.15, ΣαAw y Ac de la Ruta 2-1, Ds y Fes de la Notif. 1792, Ma = at·ft·j, QA y QAS, Arakawa
mínima con Qm amplificado, rango FA, fb con pandeo lateral, L/300, q = 0.6·Er²·Gf·V0², μb y Gs·S0·Fh. Las cuatro
plantillas de C°A° declaran que sus valores son de control.

**jp-madera-kaberyo — corregida.**

| Hallazgo | Gravedad | Cita | Corrección |
|---|---|---|---|
| `cw` salía de la tabla anterior a la reforma de abril de 2025, que ahora exige c_w según el peso real. La nota decía «editable», pero c_w era una fórmula sin dato de entrada. Un expediente nuevo podía firmarse con la tabla derogada. | Media (vigencia) | BSL, Orden Art. 46 (reforma vigente desde abril de 2025) | Datos `cw1v` y `cw2v` (c_w vigentes), con `cw = máx(tabla anterior, vigente)`, y nota de vigencia. Por defecto (0) no cambia. **Pendiente:** cargar la tabla vigente en `kabeBSL` (`src/norms/japan.js`). |

**jp-jra-espectro — corregida.**

| Hallazgo | Gravedad | Cita | Corrección |
|---|---|---|---|
| El nivel 2 solo comparaba Pa ≥ khc·W; faltaba el desplazamiento residual δR ≤ h/100, que gobierna con frecuencia en pilas altas. | Media | JRA V (2012) 6.4.6 | `dy`, `Hp`, `rpos` y `cR`; μr = ½[(khc0·W/Pa)² + 1] con el sismo que gobierna; checks μr ≤ μa y δR ≤ h/100. Por defecto δR = 40 mm. Observación: la edición vigente del JRA es la de 2017, con estados límite. |

### Dinámica

**dy-sdof-elcentro, dy-espectro-e030, dy-5pisos-chopra, dy-nl-cortante, dy-pushover-n2, dy-momcurv-col — aptas, con fines
didácticos.** Están validadas con Chopra, OpenSees, Mander y ATC-40. Observación (Baja): *dy-nl-cortante* calcula θ1 = 0.11
y no lo comenta. Con θ > 0.10 se justifica el análisis con P-Δ, que es justamente lo que hace la plantilla.

**dy-aislamiento — apta como comparación, con observación.** Usa un solo acelerograma sintético, sin DTM ni los factores
λ. No sirve para dimensionar aisladores; para eso está *pe-e031-aislamiento*. La memoria ya lo presenta como comparación.

### Análisis

**an-armadura — corregida.**

| Hallazgo | Gravedad | Cita | Corrección |
|---|---|---|---|
| Con una cubierta liviana (30 kg/m²) no había caso de viento. Con 0.9CM + 1.3W el cordón inferior pasa a compresión, y solo está arriostrado en las riostras (L ≫ panel). Los montantes también pasan a compresión. | **Media** | E.020 Art. 12 (Tabla 4, 15° < θ ≤ 60°, y 12.5); E.090 (0.9D + 1.3W); AISC 360-16 E3 | Datos `V`, `he`, `Cup` (0.6 + 0.3 interior) y `PW`; caso W y U3 en el bloque; compresión del cordón inferior con `Lbci` y de los montantes. Con V = 130 km/h y Lbci = 6 m da NO CUMPLE (prueba). |

**an-nave — corregida.**

| Hallazgo | Gravedad | Cita | Corrección |
|---|---|---|---|
| φMn = 0.9·Fy·Z «por arriostres de correas». En el nudo de esquina se comprime el ala **interior**, que las correas no arriostran. Lp del W14×34 es 1.65 m: sin tornapuntas a ≤ 1.65 m la resistencia baja (con Lb = 4 m, IH = 1.01). | **Media** | AISC 360-16 F2 | Datos `S_x`, `ry`, `rts`, `Jt`, `ho`, `Lbr` = 1.50 m y `Cb`; Mn con F2. Por defecto Mn = Mp (validación sin cambios). |
| El cortante usaba d·tw del W14×34 escrito en la fórmula; al cambiar el perfil no se actualizaba. | Baja | AISC 360-16 G2.1(a) | Datos `d_vig` y `tw_vig` y check de h/tw. |

**an-voladizo — corregida.**

| Hallazgo | Gravedad | Cita | Corrección |
|---|---|---|---|
| Mu = 1.5·Ms («factor promedio»), que no es normativo: con carga viva dominante es no conservador. Tampoco había sismo vertical en el voladizo. | Media | E.060 9.2.1 y 9.2.3; E.030-2026 Art. 28.4 | `wvL` y `Fv`; Mu = máx(1.4CM + 1.7CV; 1.25(CM + CV) + CSv). Se agregaron el acero mínimo y el cortante. Validación: Mu 4.536 → 4.592 t·m. |

**an-influencia, an-matricial, an-cross — aptas.** **an-modal-pdelta — apta**, con la observación de que usa la E.030-2018
y lo declara.

### Perú

**pe-e030-irregularidades — apta.** Detecta el piso blando por el promedio de los tres entrepisos superiores (0.765 < 0.80).
Ia1 es coherente con el modelo y la torsión se evalúa con la condición del 50 % de la deriva.

**pe-e031-aislamiento — apta.** Considera los límites inferior y superior, los requisitos 17.1 a 17.7, DTM, Vb, Vst, Ra, los
límites de Vs y la deriva de 0.0035.

**pe-e020-viento — apta, con corrección.** El levantamiento neto de la cobertura se estabilizaba con 0.9·CM frente a
presiones de **servicio** y a una resistencia **admisible** del fabricante. En esfuerzos admisibles corresponde 0.6·CM
(ASCE 7-05 2.4.1, combinación 0.6D + W, porque la E.020 no da una combinación). Gravedad baja. Se cambió el check; la D/C
pasa de 0.44 a 0.48.

### Concreto

**co-colesbelta — corregida.**

| Hallazgo | Gravedad | Cita | Corrección |
|---|---|---|---|
| La columna se verificaba por separado en X (δns·M2x) y en Y (M2ns + δs·M2s) con la misma Pu. En la combinación con sismo en Y el momento de gravedad en X está presente. Con 12 Ø 3/4", las D/C uniaxiales eran 0.55 y 0.83, pero **la biaxial por compatibilidad era 1.12**. | **Media-Alta** | E.060 10.18 | Tercer bloque `pmgen` en XY con (Pu, Mcx, M2y) y check `DCpmg_xy`. **Barra por defecto 3/4" → 1"** (D/C biaxial 0.90). Validación: DCpmg_y 0.825 → 0.640; se agregó DCpmg_xy = 0.904. |
| Q = ΣPu·(0.75R·Δe)/(Vus·hp). La E.060 10.11.4.2 define Δo como el desplazamiento de primer orden bajo Vus, que es elástico. Multiplicar por 0.75R aumenta Q unas 6 veces. | Observación (conservador) | E.060 10.11.4.2 | No se cambió. Puede llevar a exigir un análisis de segundo orden innecesario (δs > 1.5). |

**co-vigaductil — apta, con observación.** Mpr = 1.25Mn (conservador frente a fs = 1.25fy), so ≤ mín(d/4, 8db, 24de,
300 mm) y Vu por capacidad conforme a la E.060 21.5.4.1 y 21.5.3.2, comprobado con el texto oficial. Observación (Media,
no normativa en Perú): el ACI 318-19 18.6.5.2 anula Vc en Lo cuando Vp ≥ ½Vu y Pu < Ag f′c/20. La E.060 no lo exige. Con
los datos por defecto no aplica (Vp = 9.7 < 10.7 t).

**co-biaxial, co-vigat, co-vigadoble, co-deflexion, co-aligerado2d, co-mensula, co-stm, co-anclajes — aptas.** Son
correctos Bresler y el contorno, bf, Asb de la T, 10.3.4 con A′s, Branson y Bischoff, Z ≤ 26 000 kgf/cm, 8.11 y 1.1Vc,
11.9 (Asc, Ah, Vn máx.), βs y βn del ACI 318-19 y 23.8.3. *co-anclajes* usa 8.2 y 6.6 (MKS), que coinciden con la Tabla
12.1 del texto oficial de la E.060 (2.6 y 2.1 en MPa). Son menos exigentes que el ACI 318 (2.1 y 1.7), pero corresponden a
la norma peruana.

**co-voladizo (presentación).** Vud2 se partió en `Wd` y `Wl` porque la ecuación salía al 68 % del ancho de la hoja. Los
resultados no cambian.

### Geotecnia

**ge-winkler — apta, con corrección.** Con Vu = 80.6 t > 0.5φVc no se verificaba Av,mín (E.060 11.5.6.1 y 11.5.6.3). Se
agregó el check (D/C 0.97). Gravedad baja.

**ge-corrido — apta.** Usa qn y el concreto simple con φ = 0.65 y h − 5 cm (E.060 22). **ge-spt — apta.** El φ de Peck
con N60 es conservador.

**ge-grupo — apta, con observación.** Converse–Labarre, bloque de Skempton, Pmáx ≤ Qu/2, consolidación desde 2L/3 y
punzonamiento del cabezal están bien. Observación (Baja): no se verifica la capacidad estructural del pilote; con los datos
por defecto Pmáx = 39.5 t, muy por debajo de 0.25·f′c·Ap ≈ 198 t.

**ge-talud — corregida.**

| Hallazgo | Gravedad | Cita | Corrección |
|---|---|---|---|
| kh = 0.15 era un dato libre sin relación con la zona. En la costa (zona 4, Vs30 = 400 m/s) 0.5·PGA = 0.24; con ese valor el mismo talud da FS = 1.08 < 1.25. La E.050 30.3 fija el FS, pero no kh. | **Media** | E.050 Art. 30.3; Hynes-Griffin y Franklin (1984) | Datos `zona` y `Vs30`, `PGA = Z·S` y check kh ≥ 0.5·PGA. Valores por defecto: zona 2 y Vs30 = 450 m/s (0.5·PGA = 0.144). En zona 4 da NO CUMPLE (prueba). |

### Muros

**wa-contrafuertes — corregida.**

| Hallazgo | Gravedad | Cita | Corrección |
|---|---|---|---|
| La carga neta del talón (losa entre contrafuertes y tirantes verticales talón–contrafuerte) se calculaba solo con la presión estática mínima (12.0 t/m²). Con sismo, la presión en el talón cae a 0 y la carga neta es 1.25(γs·hp + γc·hz + 0.5q) = **20.1 t/m² frente a 7.7 t/m²**. Los tirantes verticales #4 @ 30 cm (8.6 cm²/m) cubrían solo el 54 % de los 15.9 cm²/m necesarios. La punta sí usaba la envolvente. | **Alta** | E.060 9.2.3; equilibrio del talón (Huntington) | `wn1` (estático), `wn2` (sismo, con `qheels`) y `wn = máx`. Los tirantes verticales pasan a #4 @ 15 cm. El acero del talón sigue gobernado por el mínimo. La validación no cambia. |

**wa-mse — corregida.**

| Hallazgo | Gravedad | Cita | Corrección |
|---|---|---|---|
| La estabilidad interna solo era estática, aunque la plantilla tiene zona 4 (kh = 0.236). Faltaban la fuerza de inercia de la zona activa, su reparto por capa y las verificaciones de rotura (sin el factor de fluencia lenta en la parte dinámica) y de arranque (F* al 80 %). | **Media-Alta** | AASHTO LRFD 11.10.7.2; Tabla 11.5.7-1 (φ = 1.20 en Evento Extremo) | `Wa`, `Pi = kh·Wa`, `Tmd` proporcional a Le, `Tmaxe` (γEV = 1.0, γLS = 0.5), `DCre` y `DCpe` con sus checks. Valores por defecto: 0.49 y 0.71. |

**wa-coeficientes, wa-gaviones — aptas.** Reproducen Das Ej. 7.6, M-O con su condición de equilibrio, la junta entre
hiladas y el criterio de Maccaferri.

**wa-tablestaca, wa-tablestaca-anclada — aptas para entibación provisional.** Blum y apoyo libre con FS sobre Kp,
0.65fy (USS), tirante, viga de reparto y muerto con FS ≥ 2. Observación (Media si la obra es permanente): no tienen
sismo. Se agregó una nota que limita el cálculo a obra provisional y que, para obra permanente, pide M-O con kh = 0.5·Z·S,
Kpe y la reducción del pasivo del muerto.

## Hallazgos en el motor y en los bloques (no editables por este revisor)

| # | Dónde | Hallazgo | Gravedad | Propuesta |
|---|---|---|---|---|
| M5 | `src/norms/japan.js`, `kabeBSL` | Contiene la tabla de c_w anterior a la reforma de la BSL de abril de 2025. | Media (vigencia) | Agregar el procedimiento vigente (c_w según el peso de la cubierta, los muros y los paneles) y el límite del multiplicador; mientras tanto, la plantilla admite el valor vigente como dato. |
| M6 | Bloque `frame2d` (dibujo de cargas nodales) | Las cargas nodales aplicadas en los nudos de apoyo dibujan su rótulo fuera del área de la figura (qa-render: «0.115 t» a 11 px). | Baja | Recortar o desplazar los rótulos al borde; en *an-armadura* se quitaron las cargas de viento en los apoyos, que no afectan los esfuerzos. |
| M7 | Bloque `pmgen` | El rótulo de la demanda (texto después de `//`) no se recorta y sale de la figura si es largo. | Baja | Truncar el rótulo con elipsis o partirlo en dos líneas. |
| M8 | `SE030` / plantillas con Vs30 | Sigue vigente M3: con Vs30 < 200 m/s en zona 4 se lanza una excepción. *espectros* y *ge-talud* usan ahora `SE030(zona, Vs30)`. Los rangos de los datos (Vs30 ≥ 200 y 180 m/s) avisan, pero no impiden el error. | Baja | Ver M3. |

## Pruebas añadidas (tercera tanda B)

- `tests/verify.mjs`: separación libre de *aci* y NO CUMPLE con Ø 20 mm; SDC D con los datos por defecto y SDC E con S1 = 0.80;
  θ del primer entrepiso calculado a mano; NO CUMPLE «Sistema permitido» con el pórtico intermedio en SDC D; MLL de la
  franja de borde a mano; la franja de borde gobierna; NO CUMPLE εt de la franja de borde con h = 0.35 m.
- `tests/analysis.test.mjs`: PW a mano; cordón inferior en compresión con V = 130 km/h y Lbci = 6 m (NO CUMPLE); Lp (F2-5) y
  NO CUMPLE de la nave con Lbr = 4 m; Mu del voladizo con la envolvente E.060/E.030.
- `tests/japan.test.mjs`: μr y δR de la JRA a mano; NO CUMPLE δR con δy = 0.12 m; c_w vigente en el kabe-ryo.
- `tests/concrete.test.mjs`: D/C biaxial ≤ 1 con 12 Ø 1" y NO CUMPLE biaxial con 12 Ø 3/4" (las uniaxiales cumplen).
- `tests/geotech.test.mjs`: PGA = Z·S; NO CUMPLE kh en zona 4; check de Av,mín presente en *ge-winkler*.
- `tests/walls.test.mjs`: wn2 a mano y envolvente del talón; Pi, ΣTmd = Pi y D/C de rotura sísmica de la capa inferior a mano.
- `tests/peru.test.mjs`: D/C del levantamiento con 0.6 CM.

Validaciones modificadas, con su justificación arriba: `aci` (d, As, φMn, Vc y φVn, por la barra de 22 mm, ACI 25.2.1),
`an-voladizo` (Mu 4.536 → 4.592 t·m, E.060 9.2.1 y 9.2.3, E.030 Art. 28.4) y `co-colesbelta` (DCpmg_y 0.825 → 0.640, más
DCpmg_xy, por la barra de 1" y E.060 10.18). Cada `validacion.nota` deja constancia del cambio.
