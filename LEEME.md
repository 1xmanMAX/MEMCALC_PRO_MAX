# MemoriaCalc — memorias de cálculo estructural

Aplicación de una sola página (un HTML) para escribir **memorias de cálculo estructural** al estilo Mathcad / Calcpad:
fórmula simbólica = sustitución numérica = resultado, con unidades, verificaciones D/C, figuras acotadas, portada,
índice, resumen de verificaciones y exportación a PDF, Word (.docx con ecuaciones editables) y HTML.

## Contenido

- **142 plantillas** completas y editables, cada una con datos de ejemplo, rangos usuales y *ejemplo de validación*:
  - **Perú (RNE):** E.020 (cargas, viento, nieve), E.030-2026 (estático, modal espectral, irregularidades, no estructurales,
    junta), E.031 (aislamiento), E.050 (capacidad portante, asentamientos, zapatas aisladas/combinadas/conectadas/medianeras,
    plateas, pilotes, licuación, taludes), E.060 (vigas, columnas esbeltas y biaxiales, placas, nudos, torsión, losas,
    punzonamiento, ménsulas, puntal-tensor, voladizos, escaleras), E.070, E.080, E.010, E.090.
  - **Chile:** NCh433 + DS61, NCh433:2026, NCh2369, NCh430 + DS60, NCh432, NCh3171.
  - **Japón:** Building Standard Law (Ai, Rt, Ds·Fes, rutas 1–3), AIJ concreto y acero, kabe-ryō, JRA.
  - **EE. UU. / Europa:** ACI 318-19, ACI 350.3, ACI 440.2R, ASCE 7-22, ASCE 41, AISC 360 (base de 1127 perfiles + IPE/HEA/HEB),
    AISI S100, AASHTO LRFD / Manual de Puentes MTC, Eurocódigos 2 y 8.
  - **Análisis y dinámica:** pórticos y armaduras 2D por rigidez (P-Δ, modal, zonas rígidas), líneas de influencia, Cross,
    análisis matricial paso a paso, tiempo-historia lineal y no lineal, espectros de respuesta, pushover (N2, ATC-40,
    FEMA 440, ASCE 41), momento-curvatura (Mander), acelerogramas sintéticos.
- **510 funciones normativas** (biblioteca con buscador) y **78 tipos de bloque** (cálculo, texto, gráficos y análisis).
- **3100+ pruebas automáticas** contra ejemplos publicados (Chopra, AISC Design Examples, FHWA, Das, San Bartolomé,
  StructurePoint, OpenSees/PyNite, Slide2…).

## Estructura del código

| Carpeta / archivo | Contenido |
|---|---|
| `src/engine.js` | Motor: unidades (math.js), render LaTeX (KaTeX), líneas de cálculo, verificaciones |
| `src/norms/*.js` | Funciones normativas por módulo (`defineFns`) |
| `src/blocks.js`, `src/blocks/*.js` | Bloques gráficos y de análisis (`registerBlock`) |
| `src/templates.js`, `src/templates/*.js` | Plantillas |
| `src/docrun.js`, `src/paper.css`, `src/docx.js` | Memoria: portada, índice, resumen; impresión y Word |
| `src/ui.js`, `src/style.css` | Interfaz |
| `tests/` | Pruebas (`node tests/run.mjs`) |
| `tools/` | Capturas (`shot.mjs`) y control de calidad visual (`qa-render.mjs`, `qa-report.mjs`) |
| `docs/DESARROLLO.md` | Guía para agregar normas, bloques y plantillas |
| `docs/referencias/` | Fuentes, revisiones de supervisión y QA por módulo |
| `main.go` | Lanzador de Windows (servidor local + ventana de Edge, asociación .mcalc) |

## Compilar y probar
```
npm install
node build.mjs            # dist/MemoriaCalc.html y dist/artifact.html
node build.mjs --pwa      # dist/pwa/index.html
node tests/run.mjs        # todas las pruebas
node tools/qa-render.mjs --no-shot   # control de calidad visual de todas las plantillas
# Windows (desde cualquier SO con Go):
cp dist/MemoriaCalc.html app.html
GO111MODULE=off GOOS=windows GOARCH=amd64 go build -ldflags "-H windowsgui -s -w" -o MemoriaCalc.exe .
```

> Verifique siempre los resultados: la memoria la firma el profesional responsable.
