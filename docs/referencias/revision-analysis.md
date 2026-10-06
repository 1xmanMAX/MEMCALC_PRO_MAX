# Revisión independiente del módulo «analysis»

Fecha: 2026-10-06 · Alcance: `src/blocks/analysis.js` (frame2d, beamcase, influence, cross), `src/norms/analysis.js`,
`src/templates/analysis.js`, `tests/analysis.test.mjs`, `docs/referencias/analysis.md`.

## 1. Corrección del solver `frame2d`

### Contraste numérico independiente
Se instaló **PyNiteFEA 3.2** (y anaStruct) en `/tmp` y se generaron 11 modelos aleatorios: pórticos de 2 a 5 pisos
con rótulas aleatorias en vigas, cargas uniformes parciales, trapezoidales, puntuales y perpendiculares (locales);
pórticos a dos aguas; armaduras; vigas continuas con resorte rotacional y asentamiento impuesto. PyNite se usó
en 3D restringiendo los GDL fuera del plano.

| Modelo | Error relativo máx. (reacciones / desplazamientos / \|M\|máx) |
|---|---|
| 4 pórticos aleatorios (lineal) | ≤ 3·10⁻⁵ (limitado por el redondeo a 6 cifras de los datos) |
| 2 pórticos a dos aguas | ≤ 3·10⁻⁵ |
| 3 armaduras | ≤ 3·10⁻⁶ |
| 2 vigas continuas (resorte + asentamiento) | ≤ 2·10⁻⁵ |
| 6 pórticos con P-Δ (`analyze_PDelta`) | ≤ 2·10⁻⁴ |

Cuatro de estos modelos (lineal y P-Δ) quedaron incrustados en `tests/analysis.test.mjs` como regresión.

**Conclusión:** la formulación original (transformaciones, condensación de rótulas, cargas en barras inclinadas,
asentamientos, resortes, combinaciones y envolventes) era **correcta**. Equilibrio global verificado también en
momento (ΣM respecto del origen ≈ 10⁻¹³).

### Defectos encontrados y corregidos
1. **Carga puntual con `dir = proy`/`hproy`** se multiplicaba por |cos θ| (o |sen θ|) como si fuera distribuida:
   una carga puntual no tiene «proyección». Corregido (se trata como gravitatoria / horizontal).
2. **Tolerancia de posición demasiado estricta**: `U 5 2 0 7.65` en una barra de 7.6485 m daba error
   («el tramo [0, 7.65] debe estar dentro de 0…7.65»). Ahora se acepta un exceso de hasta 0.2 % de L (se recorta
   e interpola la intensidad).
3. **M máximo interior** se tomaba solo en las estaciones (40 divisiones): error de hasta 0.06 % en el pico de
   la parábola. Ahora se calcula el extremo exacto donde V cambia de signo.
4. **Deformada**: integración trapezoidal de θ (error O(h²) ≈ 0.7 % con cargas puntuales). Ahora es exacta para
   M lineal entre estaciones.
5. **Detección de mecanismos**: tolerancia de pivote relativa al máximo global de la diagonal (falsos positivos con
   barras muy rígidas, p. ej. E·10⁴) y mensaje que señalaba un GDL arbitrario. Ahora: pivote relativo a la suma de
   contribuciones de la fila (10⁻¹²) y cálculo del **vector nulo** (modo del mecanismo): «los nudos 3, 2 se
   desplazan en x sin oponer rigidez — apoyos insuficientes o rótulas que forman un mecanismo».
6. **Mensajes**: «nudo inexistente» no decía cuál; ahora «el nudo «3» no existe (nudos definidos: 1, 2)». Se
   restituyó el aviso de nudo sin barras.
7. **`±` múltiple**: `1.2CM ± SX ± 0.3SY` generaba solo 2 combinaciones (todas + / todas −); ahora genera las
   2ⁿ variantes (a, b, c, d…).
8. **Rendimiento**: Gauss denso O(n³) por cada solución. Ahora RCM + LDLᵀ en banda: pórtico de 210 barras con 5
   combinaciones ≈ 0.26 s; con P-Δ y modal ≈ 0.6 s (antes de la optimización 2.2 s, por recrear diagramas en cada
   iteración).

## 2. Mejoras implementadas (todas validadas)
| Mejora | Sintaxis | Validación |
|---|---|---|
| P-Δ (matriz geométrica, iterativo, P-δ dentro de la barra) | casilla «Efecto P-Δ» | PyNite P-Δ (≤ 2·10⁻⁴); voladizo exacto Timoshenko–Gere δ y M (0.2 %); P > Pcr → verificación NO CUMPLE sin NaN |
| Deformación por cortante (Timoshenko, MEP exactas) | campo ν; `As=` `G=` en secciones | δ = PL³/3EI + PL/GAs exacto; MEP = modelo subdividido (10⁻⁹) |
| Zonas rígidas | `zi= zj=` o factor automático | = barras rígidas explícitas (10⁻⁴); esfuerzos de diseño en las caras |
| Apoyo inclinado | `RI 30` | R normal al plano: Rx = −(P/2)tan α |
| Análisis modal (masas concentradas) | `nudos peso [x|y]`, `= CM + 0.25 CV` | voladizo T = 2π√(m/k) exacto; edificio de cortante de 3 pisos (3 periodos, 2·10⁻⁴); Σ masa efectiva = 100 % |
| Funciones | `PeEuler B1AISC B2Q TSdof` | pruebas unitarias |

## 3. Usabilidad
- Ayuda (`hint`) reescrita: sintaxis de cada opción nueva, significado exacto de `grav/proy/horiz/hproy`.
- Errores en español con la línea, el nudo o la barra y la causa probable.
- Etiquetas de diagramas: N con un solo rótulo por barra; se omiten extremos < 6 % del máximo; en pórticos
  grandes solo el valor gobernante por barra; con zonas rígidas los rótulos de extremo se ponen en la cara.

## 4. Plantillas
- `an-portico-ca`: con cargas ×10 o vigas de 25 cm el diseño producía **raíz de negativo → 7 errores en cascada**.
  Corregido (`sqrt(max(0, …))` + verificación «Rn ≤ 0.425 f'c»): ahora NO CUMPLE sin errores. Se eliminó una
  verificación sin sentido (`Pu ≤ 0.1f'cAg + 0.9φPn`, siempre cierta) y se reemplazó por la carga axial
  normalizada con la indicación de diseño P-M.
- `an-nave`: ahora usa **análisis de 2.º orden** (requisito de AISC 360-16 C1 para el método de longitud efectiva
  con K = 1.5). Observación: K = 1.5 es estimado; lo riguroso sería el método de análisis directo (C2) con
  rigidez reducida y cargas ficticias, o K del nomograma.
- Nueva `an-modal-pdelta`: pórtico de 4 pisos × 3 vanos con modal (fuente de masa), T = 0.85·T₁ (E.030 28.4.2),
  zonas rígidas, P-Δ, derivas, índice de estabilidad Q y ≥ 90 % de masa (E.030 29.1.2).
- Pruebas de datos extremos (21 mutaciones en las 8 plantillas): todas terminan en CUMPLE/NO CUMPLE sin errores
  ni NaN. `an-armadura` (diagonales a compresión en la «Pratt» a dos aguas) es correcto físicamente.

## 5. Visual
Capturas con Playwright de todas las figuras: modelo, estados de carga, M/V/N (envolventes), deformada, armadura,
formas modales. Se corrigió el amontonamiento de rótulos en N y en pórticos grandes; los rodillos inclinados y las
zonas rígidas se dibujan; las formas modales usan las funciones de forma con los giros nodales.

## 6. Pendiente / fuera del módulo
- `tools/shot.mjs` no puede abrir plantillas: el panel de bienvenida intercepta el clic en `[data-t=ID]`
  (se requiere `element.click()` vía `evaluate` o cerrar el panel antes).
- Los `<marker id>` de las figuras SVG (anB, anR…) se repiten en cada figura del documento (válido porque son
  idénticos, pero conviene un prefijo por bloque si algún día cambian de color).
- `src/templates/steel.js` (otro agente) también usa `frame2d`; sigue pasando `tests/verify.mjs`.
- Limitaciones vigentes: sin no linealidad del material, sin espectro de respuesta en `frame2d` (usar los bloques
  sísmicos con los T exportados), masas sin inercia rotacional, `influence` con EI constante, `cross` sin ladeo.
