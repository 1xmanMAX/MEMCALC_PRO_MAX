# Revisión independiente del módulo «peru» (E.020, E.030-2026, E.031)

Revisor: supervisor independiente (auditoría de `src/norms/peru.js`, `src/blocks/peru.js`, `src/templates/peru.js`,
`tests/peru.test.mjs`, `docs/referencias/peru.md`). Fecha: octubre de 2026.

## Fuentes contrastadas (texto oficial)

* **RM N° 183-2026-VIVIENDA**, separata de *El Peruano* del 3 de mayo de 2026 (68 p.),
  https://cdn-web.construccion.org/normas/files/vivienda/RM_183-2026-VIVIENDA.pdf. Se leyeron Art. 7–74 y el Anexo I.
* **NTE E.020 Cargas**, *El Peruano*, 9 de junio de 2006 (texto oficial, ICG).
* **NTE E.031 Aislamiento Sísmico**, DS N° 030-2019-VIVIENDA, *El Peruano*, 6 de noviembre de 2019.
* Chopra, A. K., *Dynamics of Structures*: pórtico de cortante uniforme de 5 pisos (m = 100 kips/g, k = 31.54 kips/in,
  Tn = 2.0, 0.6852, 0.4346, 0.3383, 0.2966 s) y pórtico de 2 pisos con m1 = 2m, k1 = 2k.
* Rupay Vargas, M. J. et al. (2022), «Análisis sísmico de fuerzas estáticas equivalentes de un pórtico de 3 niveles»,
  *Yotantsipanko* 2(2): 88–100 (ejemplo E.030 resuelto con V, Fi, Δi y derivas).
* Cálculo independiente con numpy (autovalores generalizados y CQC de Der Kiureghian) del edificio de la plantilla dinámica.

## Hallazgos y correcciones

| # | Hallazgo | Gravedad | Fuente | Corrección |
|---|---|---|---|---|
| 1 | `CTE030`: acero IMF (2) y OMF (3) daban CT = 45. El Art. 36.1 asigna 35 a «pórticos dúctiles de acero con uniones resistentes a momentos, sin arriostramiento»; 45 es solo para acero arriostrado (y C°A° con muros en cajas). | Media (periodo subestimado ~22 %, C y k erróneos) | E.030-2026 Art. 36.1 | CT = 35 para códigos 1–3; prueba añadida. |
| 2 | No se verificaba la **Tabla N° 9** (sistemas permitidos por categoría y zona): p. ej. A2 con pórticos de C°A° o B con EMDL en zona 4 pasaban como conformes. | Alta (verificación normativa faltante) | E.030-2026 Art. 21, Tabla N° 9 | Nueva función `sisE030(cat, zona, sistema)`; `check` en las plantillas estática, dinámica e irregularidades. La categoría se ingresa con código (`categoria`) y `U = UE030(categoria)`. |
| 3 | Las plantillas estática y dinámica comparaban con la Tabla N° 14 la deriva en el **centro de masas** del modelo plano; el Art. 51 limita el **máximo** desplazamiento relativo (extremo del edificio, con excentricidad accidental). Con los datos por defecto la deriva máxima real era 0.0067 (D/C 0.96) en lugar de 0.0050. | Alta (no conservador) | E.030-2026 Art. 45, 50, 51; Tabla N° 12 | Se ingresa `rt = Δextremo/ΔCM` del modelo 3D; `deriva_max = rt .* deriva` y `check max(deriva_max) <= dlim`. La irregularidad torsional usa ahora la deriva máxima para el criterio del 50 %. `umax` (junta) se toma en el extremo. |
| 4 | `check C/R >= 0.11` tratado como verificación: en edificios flexibles daba NO CUMPLE, cuando el Art. 34.2 es un **valor mínimo** a aplicar. Además V no aplicaba el mínimo. | Media | Art. 34.2, 50.3 | `CR = max(C/R, 0.11)`, `V = Z·U·S·CR·P`; los desplazamientos se corrigen con `fCR = (C/R)/CR` (Art. 50.3: sin el mínimo C/R). En la plantilla dinámica se eliminó el `check` y `Vest` ya usa el mínimo. |
| 5 | No se verificaba que el **análisis estático sea aplicable** a la estructura evaluada (regular, o zona 1, o muros portantes ≤ 15 m). | Media | Art. 33.2 | `check Ia_ev*Ip_ev == 1 or zona == 1 or (muros y hn ≤ 15 m)` en la plantilla estática; en la de irregularidades, variable `metodo` y `pmin` (0.90 si es irregular, Art. 44.1). |
| 6 | No se verificaba **Ts < 0.65 TP** (categorías A y B en zona 4). En E.031 el límite de Ts estaba fijo en 0.30 s (S1) aunque se cambiara el suelo. | Media | E.030-2026 Art. 14.2, 14.8; E.031 Art. 14.2, Tabla N° 4 | `check Ts < 0.65*Tp or categoria == 4 or zona < 4`; en E.031 `Tsmax` según el perfil (0.15/0.30/0.40/0.60 s) y `check Ts < 0.65*Tp or zona < 4`. |
| 7 | E.031: `Vst` mezclaba Vb del límite que gobierna con βM del límite superior, y `k` usaba solo βM,sup. | Media | E.031 Art. 19.3, ec. 12 y 15 | `Vst = max(Vst_inf, Vst_sup)` con su propio βM; `k = 14·max(βM)·Tf`. |
| 8 | E.031: fuerza de activación (21.3 c) usaba `1.5·Qd` fijo en lugar de `Qd,sup` (λ). | Baja | E.031 Art. 21.3 c | `Fact = max(Qd_sup + kd_sup·Dy, 1.5·N·(Qd + kd·Dy))`. |
| 9 | E.031 17.7 a se verificaba solo con el límite superior; el Art. 17 pide considerar ambos límites. | Baja | E.031 Art. 17 | Se añadió la verificación con el límite inferior. |
| 10 | Bloque `lrb`: si la iteración no convergía no había aviso. | Baja | — | Bandera de convergencia, aviso en rojo y error si DM no es finito. |
| 11 | Bloque `modal`: no exigía el mínimo de **tres modos** del Art. 40.2. | Baja | E.030-2026 Art. 40.2 | `check` (NO CUMPLE) si se combinan menos de min(3, n) modos. |
| 12 | `irregE030`: con `cat` numérico, un código de categoría (2, 3, 4) se interpretaba como factor U (4 → A2). | Media (Tabla 13 errónea) | Tabla N° 13 | Acepta texto A1/A2/B/C, códigos de `UE030` (11, 2, 3, 4) o el valor de U. |
| 13 | `pAligE020` extrapolaba en silencio (h = 0.12 m → 280 kgf/m²; h = 0.35 m → 420). | Baja | E.020 Anexo 1 (solo 0.17–0.30 m) | Error fuera del rango tabulado. |
| 14 | Metrado: `check Ai > 40 m²` daba NO CUMPLE en columnas pequeñas, cuando solo condiciona la reducción. | Baja | E.020 Art. 10 a | Sustituido por texto; `LrE020` ya aplica la condición. |
| 15 | Junta: el retiro de 2/3 se calculaba con el desplazamiento interpolado linealmente a la altura del vecino (no conservador en pórticos); el Art. 52.3 habla del desplazamiento **máximo**. `d1` no coincidía con la memoria estática. | Media | E.030-2026 Art. 52.3–52.4 | `r1 = max(2/3·d1, s/2)` con d1 = 8.07 cm (desplazamiento máximo en el extremo de la memoria estática). |
| 16 | Viento: la combinación E.060 estaba escrita «1.25(CM + CV ± CV)». Faltaba indicar el viento paralelo a la cumbrera. | Baja (texto) | E.060 Art. 9.2.2; E.020 Art. 12.1, Tabla 4 | Texto corregido: 1.25(CM + CV ± CVi) y 0.9 CM ± 1.25 CVi; nota del caso longitudinal (C = −0.7). |
| 17 | Irregularidades: los Δ elásticos deben provenir del análisis con el mismo R con el que se amplifican (0.85R·Δe es independiente de R solo así). | Baja (claridad) | Art. 50 | Párrafo aclaratorio en la plantilla. |
| 18 | Símbolo de la variable `cat` se mostraba como c_at. | Cosmética | — | Renombrada a `categoria`. |

## Decisiones del autor validadas

* **Cs de nieve = 1 − 0.025(θ − 30°)**: confirmado en la publicación oficial de *El Peruano* (9 jun. 2006, p. 320735).
  La versión 0.0025 de algunas reproducciones es una errata. Se mantiene 0.025.
* **Vh = V para h < 10 m**: el Art. 12.3 define V como «velocidad de diseño hasta 10 m de altura», no menor que
  75 km/h; la fórmula (h/10)^0.22 se aplica por encima de 10 m. Correcto.
* **Modal plano sin torsión**: aceptable como modelo simplificado de edificio de cortante (Art. 30.3 admite masas
  concentradas) siempre que la torsión accidental (Art. 45) y la combinación direccional (Art. 43) se tomen del modelo
  3D; por ello se añadió la deriva en el extremo (`rt`). El bloque combina las **derivas modales** (no resta
  desplazamientos combinados): verificado contra numpy (diferencia 0 %; la resta daría 0.0050412 en vez de 0.0050522).
* **Jacobi, Γn, masa efectiva, CQC**: verificados con soluciones cerradas (2 GDL de Chopra, N pisos uniformes),
  con el pórtico de 5 pisos de Chopra (Tn = 2.0 … 0.2966 s; M1* = 87.95 %) y con numpy (T1 = 0.44102 s,
  Vdin = 185.788 tonf). El ρij coincide con la fórmula del Art. 42.2.
* **Tablas de la E.030-2026** (Z, S/TP/TL interpolados, C con rama T < 0.2 TP, U, R0 —EMDL 3.5, péndulo 2.5—,
  Ia/Ip, Tabla 13, Tabla 14 —EMDL 0.004—, k, 0.75R/0.85R, 80/90 %, C1, 0.5ZUS, 2/3 vertical, junta 0.02·Z·S·h ≥ 3 cm):
  conformes al texto de la RM 183-2026.
* **E.031** (ec. 1–2: ambas fórmulas de λ son algebraicamente idénticas; Tabla 2 LRB clase I 1.5/1.3/0.8; Tabla 5 BM;
  ec. 5–15; Ra = 3/8 R0 ∈ [1, 2]; deriva 0.0035 × Ra): conformes.

## Pruebas añadidas (`tests/peru.test.mjs`)

* Ejemplo publicado de Rupay Vargas et al. (2022): V = 12.629 tonf, F = 2.457/4.915/5.256 tonf, Δ = 0.0026/0.0047/0.0058 m,
  deriva inelástica 0.0052.
* Chopra, 5 pisos: cinco periodos y masa efectiva del modo 1; mínimo de 3 modos.
* Plantilla dinámica contra numpy (T1, Vdin, derivas CQC por piso).
* CT de acero, Tabla N° 9 (9 casos), `pAligE020` fuera de rango, categoría por código en `irregE030`.
* Datos extremos en las 7 plantillas: NO CUMPLE en las verificaciones esperadas, sin errores ni NaN.

No se encontró un ejemplo numérico publicado de prediseño E.031 con iteración de DM verificable; el bloque `lrb` se
valida con el punto fijo de las ecuaciones 3–7 y con la iteración de comprobación incluida en la plantilla.

## Limitaciones que permanecen (documentadas)

* El Art. 17.1 de la E.031 no menciona S0; la plantilla lo admite junto con S1 en zona 4 (criterio del revisor: más favorable).
* `CTE030` para madera y péndulo invertido (no listados en el Art. 36.1) adopta 35.
* La irregularidad de masa excluye la comparación con la azotea (interpretación usual de «no se aplica en azoteas»).
* La excepción del Art. 21.2 (cobertura liviana, cualquier sistema) y la nota (*) de la Tabla 9 no se automatizan.
