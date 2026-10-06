# MemoriaCalc — código fuente

## Estructura
- `src/engine.js` — motor de cálculo: unidades (math.js), funciones normativas (E.030-2026, HL-93, BSL, ASCE 7, EC8, ACI), render LaTeX (KaTeX), verificaciones.
- `src/blocks.js` — bloques gráficos: viga continua por método de rigidez (`solveBeam`: momentos, cortantes, deflexiones, envolvente con alternancia), diagrama P–M, sección, zapata, muro, espectro, gráficos y tablas.
- `src/docrun.js` — ejecuta el documento completo (portada, índice, resumen).
- `src/templates.js` — 22 plantillas (E.030, E.060, E.070, ACI, ASCE 7, AISC, AASHTO, EC2, Japón…).
- `src/ui.js` — interfaz (Datos, Editor, Proyecto, autocompletado, deshacer, exportaciones).
- `src/docx.js` — exportación a Word (.docx) con ecuaciones OMML.
- `src/style.css`, `src/paper.css` — estilos de la app y de la memoria.
- `tests/verify.mjs` — pruebas de validación de ingeniería.
- `main.go` — lanzador de Windows (servidor local + ventana de Edge, asociación .mcalc).

## Compilar
```
npm install mathjs katex marked esbuild fflate mathml2omml
node build.mjs            # genera dist/MemoriaCalc.html y dist/artifact.html
node build.mjs --pwa      # genera dist/pwa/index.html
node tests/verify.mjs     # pruebas
# Windows (desde cualquier SO con Go):
cp dist/MemoriaCalc.html app.html
GOOS=windows GOARCH=amd64 go build -ldflags "-H windowsgui -s -w" -o MemoriaCalc.exe .
```
