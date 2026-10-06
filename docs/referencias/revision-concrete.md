# Revisión independiente del módulo «concrete» (E.060-2009 / ACI 318-19)

Revisor: supervisor independiente · Fecha: 2026-10-06
Archivos revisados y corregidos: `src/norms/concrete.js`, `src/blocks/concrete.js`, `src/templates/concrete.js`,
`tests/concrete.test.mjs`, `docs/referencias/concrete.md`.

## 1. Fuentes usadas para la verificación

| Fuente | Uso en la revisión |
|---|---|
| NTE E.060-2009, PDF oficial SENCICO (205 p.; copia en hebmerma.com indicada en `concrete.md`), texto extraído con `pdftotext` y páginas renderizadas | Comparación artículo por artículo (9.3, 9.6, 10.3, 10.5, 10.11–10.13, 10.18, 11.6, 11.9, 11.10, 11.12, 12.2–12.16, 13.7, 21.5–21.9, Anexo II). |
| E.060 Tablas 13.1–13.3, **incluidas las figuras de los casos** (p. 130) | Comparación celda por celda (198 valores, 0 diferencias) y lectura de los 9 croquis de casos. |
| StructurePoint, *Interaction Diagram – Tied RC Column Design Strength (ACI 318-19)* (resultados spColumn) | Validación del bloque `pmgen` (uniaxial). |
| StructurePoint, *Biaxial Bending Interaction Diagrams for Rectangular RC Column (ACI 318-19)* (Pincheira et al., Ex. 10.20.1; spColumn) | Validación del contorno biaxial. |
| StructurePoint, *The Role of γf in Two-way Slab Punching Shear (ACI 318)* | Jc, γv, vu, vc de la plantilla de punzonamiento. |
| StructurePoint, *Slender Concrete Columns – Non-Sway Frame (ACI 318-19)* (Wang Ex. 13.17.3) | Factor k del nomograma arriostrado. |
| StructurePoint, *Equilibrium Torsion (ACI 318-14, spBeam)* | Plantilla de torsión (Aoh, esfuerzo combinado, At/s, Av/s, Aℓ, Tth). |
| ACI 318-19 | φ (Tabla 21.2.2), ℓd, ℓdh, Bischoff, puntal-tensor (βs, βn, 23.8.3), Ash de bordes (18.10.6.4). |

## 2. Puntos débiles declarados por el autor — resultado

| Punto | Resultado |
|---|---|
| Casos 1–9 del método de coeficientes "deducidos" | **Confirmados** con las figuras de la propia E.060 (Tabla 13.1, p. 130): A es la luz vertical (corta), B la horizontal; 3 = bordes cortos continuos, 4 = adyacentes, 5 = bordes largos, 6 = un borde largo, 7 = un borde corto, 8 = tres continuos con el largo superior discontinuo, 9 = tres continuos con el corto discontinuo. La convención del bloque `slab2way` (bordes sup/inf = largos) coincide. Valores de las tres tablas: 0 diferencias con el PDF. |
| Ningún ejemplo numérico de libro | Se agregaron 33 comprobaciones; 20 reproducen ejemplos publicados con resultados de spColumn/spBeam/spSlab (ver §4). |
| Empalme en compresión 0.007 fy db | **Correcto.** E.060 12.16.1 (SI): 0.071 fy db con fy en MPa → 0.071/10.197 = 0.00696 en kgf/cm²; el "0,071" del Anexo II es errata. 0.007 queda 0.5 % del lado seguro. |
| Elementos de borde: Ash referencial ACI | La E.060 21.9.7.6(c) **no exige** las ecuaciones (21-3)/(21-4) en elementos de borde (solo 21.6.4.1c y 21.6.4.3, diámetros (d) y espaciamiento (e)). Se mantiene Ash ≥ 0.09 s bc f'c/fyt como buena práctica, ahora en **ambas direcciones** del núcleo y rotulado "referencial", con bc medido centro a centro (definición propia de la E.060 21.6.4.1 b; el ACI 318-19 mide al borde exterior). |

## 3. Hallazgos y correcciones

### 3.1 Algoritmo `pmgen` (bloques)
- **Verificado:** compatibilidad, bloque de Whitney sobre la fracción de fibra correcta (también con eje neutro inclinado), descuento del concreto desplazado por barras comprimidas, P0, Pn,máx = 0.80/0.85 P0, φ de la E.060 9.3.2.2 (texto del PDF: "φ puede incrementarse… a medida que **φPn** disminuye desde 0.1 f'c Ag ó **φPb**") y φ del ACI según εt. Contra recorte exacto de polígonos: error < 0.04 t.
- **Corregido – error de interpolación:** las capacidades (`Mn_X`, `phiMn_X`, `c_X`, `Pn_X`, D/C) se interpolaban linealmente entre 150 puntos de la curva; cerca de quiebres (fluencia del acero comprimido) el error llegaba a 0.8 % en el punto balanceado de spColumn. Ahora se resuelve c por bisección exacta en el tramo que contiene P (o e): error ≤ 0.15 % frente a spColumn.
- **Corregido – D/C engañoso:** el D/C a P constante (|Mu|/φMn) daba 0.04 para una combinación de gravedad con Pu = 34 % de φPn,máx. Ahora D/C = máx(|Mu|/φMn(Pu), Pu/φPn,máx) (ambos ≤ 1 ⇔ punto dentro del diagrama); igual en biaxial.
- **Corregido – errores con datos extremos:** `phiMn_X`, `Mn_X` lanzaban error si Pu salía del diagrama (la memoria quedaba con errores en lugar de NO CUMPLE). Ahora devuelven capacidad 0; `c_X` devuelve una profundidad fuera de la sección.
- `slab2way`: m < 0.5 ya no lanza error: registra una verificación NO CUMPLE (13.7.1.2) y usa los coeficientes de m = 0.5; el cortante de 13-10 usa el m real. Se documentó que Vub (bordes cortos) es el análogo triangular de 13-10 (la norma solo da la ecuación para los bordes largos).
- `stmbeam`: nuevo campo `lext` (prolongación más allá del apoyo). `mensula`: rótulos desplazados para no superponerse a la cota del borde.

### 3.2 Funciones normativas
- `asFlex`: lanzaba error si Mu excedía la capacidad de la sección, cortando la memoria. Ahora devuelve un área creciente mayor que 0.85 f'c b d/fy (≈ 2ρb) que ninguna verificación de resistencia/cuantía acepta → NO CUMPLE sin errores.
- Verificados sin cambios: β1, ρb, ℓd (Tabla 12.1: 8.2/6.6 √f'c MKS = 2.6/2.1 √f'c MPa, con √f'c ≤ 26.4), ec. 12-1 (3.5√f'c), ℓdg (0.075 = 0.24 SI), ℓdc, empalmes A/B, ℓd/ℓdh ACI 318-19 (ψg, ψc), Icr con 2n, Branson, Bischoff, ξ, γv, Jc, k de los nomogramas.
- Observación: la E.060 12.5.1 dice "no menor que el **menor** valor entre 8db y 150 mm" (traducción defectuosa; el ACI dice "mayor"). Se mantiene el mayor (lado seguro).

### 3.3 Plantillas
- **Clasificaciones que estaban como `check`** (fallaban al cambiar los datos aunque el diseño fuera válido): "la esbeltez excede el límite", "Q > 0.06", "k lu/r ≥ 22", "lu/r < 35/√(Pu/f'cAg)", "Pu ≥ 0.1φPon", "se requiere acero en compresión", "Tu > φTth", "Pu > 0.1 f'c Ag". Se convirtieron en indicadores 1/0 que **cambian el procedimiento**: δns = 1 si la columna no es esbelta; δs = 1 si k lu/r < 22; magnificación adicional por curvatura (10.13.5) aplicada cuando lu/r > 35/√(Pu/f'cAg) (antes solo se verificaba que no ocurriera).
- **Biaxial:** la descripción anunciaba la ec. 10-23 para carga axial baja, pero no estaba implementada. Ahora D/C = Pu/φPn (10-22) si Pu ≥ 0.1φPon y Mux/φMnx + Muy/φMny (10-23) en caso contrario.
- **Columna esbelta:** Q de 10.13.6(b) se estimaba como 1.25 Q sísmico; ahora usa ΣPu de 1.4CM + 1.7CV (nuevo dato `SPug`) y rigideces divididas entre (1 + βd) (10.11.1). Cm = 1.0 cuando rige M2,min (10.12.3.2).
- **Placa:** altura de amplificación con "dos primeros pisos" real (`npis`), Mn/Mua ≥ 1, ρv ≥ ρh cuando hm/lm ≤ 2 (21.9.5.2, faltaba), longitud del elemento de borde exigida solo si se requiere confinar, Ash en las dos direcciones.
- **Torsión:** s ≤ d/2 por cortante (faltaba) y verificación explícita 2Ab/s ≥ (Av + 2At)/s.
- **Viga T:** texto dinámico (antes afirmaba siempre que el bloque entra al alma) y verificación φMn ≥ 1.2 Mcr de E.060 10.5.1 con la inercia bruta de la T.
- **Losa en una dirección:** acero de temperatura con s ≤ 3h y 400 mm (9.7.3; usaba 5h, que es solo para aligerados); verificación del acero negativo exterior.
- **Ménsula:** verificación de flexión con Af (antes el número de barras se derivaba de Asc y la verificación siempre pasaba).
- **Puntal-tensor:** longitud disponible de anclaje con la prolongación real de la viga (antes 300 mm fijos) y d = h − wt/2 en el espaciamiento d/5; verificación de existencia del ancho del puntal superior (antes raíz de negativo → NaN).
- Guardas contra división entre cero y redondeos a cero (cargas nulas, espaciamientos < 2.5 cm): con cargas × 20, dimensiones × 0.35, f'c y fy × 0.05, cargas = 0, ninguna plantilla produce errores ni NaN; las sobrecargadas muestran NO CUMPLE.

### 3.4 Artículos verificados sin observaciones
Flexión (10.2, 10.3.4/10.3.5, 10.5.2), cortante (11-3, 11-4, Vs ≤ 2.1√f'c bw d), torsión (11-18, 11-21, 11-22, 11-24, mínimos), confinamiento de columnas (21.6.4: 21-3/21-4, s ≤ b/3, 6db, 100 mm, hx ≤ 350 mm, Lo), vigas 21.5 (Mpr = 1.25Mn, so, 2h), nudos 21.7 (1.25fy, φ = 0.85, 1.7/1.2/1.0 √f'c MPa = 5.3/4.0/3.2 MKS), muros 11.10 (αc 0.80–0.53, 2.6√f'c, ec. 11-32, 3t y 400 mm), corte por fricción 21.9.8 (Nu = 0.9CM, φ = 0.85), punzonamiento 11.12 (11-33/34/35, γv, 11-40), ménsulas 11.9 (av/d ≤ 1, Nuc ≥ 0.2Vu, 0.2f'c y 55 kgf/cm², μ = 1.4, Asc, Ah, 0.04 f'c/fy), deflexiones (Tabla 9.2, ξ, λ = ξ/(1+50ρ'), Z ≤ 26 000 kgf/cm), espesor de losas (9-17), aligerados (8.11), puntal-tensor ACI 318-19 (βs = 0.75/1.0, βn = 1.0/0.8, θ ≥ 25°, ρ ≥ 0.0025).

## 4. Pruebas agregadas (`tests/concrete.test.mjs`, 84 → 117)
Tablas 13.1–13.3 y los 9 casos según las figuras; m < 0.5; empalme en compresión SI↔MKS; `pmgen` contra recorte exacto de polígonos; 5 puntos + φPn,máx + φMn de spColumn (uniaxial); punto spColumn sobre el contorno biaxial; Jc, γv, vu y vc de StructurePoint con la plantilla de punzonamiento; k = 0.959 (Wang); torsión de equilibrio de StructurePoint con la plantilla de torsión; ramas de las plantillas (columna no esbelta, ec. 10-23, torsión bajo el umbral); datos extremos sin errores/NaN.

## 5. Revisión visual
`node build.mjs` y capturas con Playwright de placa, biaxial, losa 2D, puntal-tensor y ménsula: figuras completas, sin elementos de error. Se corrigió la superposición del rótulo de Asc con la cota del borde de la ménsula.

## 6. Observaciones fuera del módulo (no corregidas: no son archivos de este módulo)
- `tests/verify.mjs` estaba en 154/156 al inicio por la plantilla chilena "Sismo industrial NCh2369 — nave de acero" (1 error); al final de la revisión pasaba 156/156 (corregido por otro agente).
- La galería cambió durante la revisión (`tools/shot.mjs` con `[data-t=ID]` ya no encuentra las tarjetas sin pulsar antes "Explorar plantillas"); el script de captura del repositorio debería abrir primero la galería completa.
- El bloque núcleo `section` (src/blocks.js) lanza error con más de ~30 barras; en lugar de error convendría dibujar y advertir.
