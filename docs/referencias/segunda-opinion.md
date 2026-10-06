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
