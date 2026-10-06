# QA del módulo «dynamics» (Dinámica estructural)

Fecha: 2026-10-06 · Alcance: `src/templates/dynamics.js`, `src/blocks/dynamics.js`, `tests/dynamics.test.mjs`.
Resultado: `node tests/run.mjs` → todo verde (dynamics 167 correctas; engine, que comprueba los campos `validacion`, 128 correctas).

## 1. Campo `validacion` (ejemplo de validación)

Las 7 plantillas tienen ahora el campo `validacion`. No se cambió ningún dato por defecto.

| Plantilla | Fuente | ¿Datos por defecto = ejemplo publicado? | Valores esperados |
|---|---|---|---|
| dy-sdof-elcentro | Chopra Fig. 6.4.1 (El Centro, ζ = 2 %) | **Sí** (sistemas a, b, c) | D = 2.67 / 5.97 / 7.47 in (tol 0.5 %); A/g = 1.09 / 0.610 / 0.191; PGA 0.319 g; control OpenSees del sistema EP: umax 0.044304 m, ures 0.030895 m |
| dy-espectro-e030 | Chopra §6.1 + E.030-2026 | Solo el registro (PGA) | PGA 0.319; control: Sa,E = 1.209375, S = 1.075, Sa(0.5 s; 5 %) = 0.9162, Ia = 1.80 m/s, fesc = 2.071 |
| dy-5pisos-chopra | Chopra §12.8, Ej. 13.2–13.3 | **Sí** | T1 = 2.0007 s, T2 = 0.6854 s, T5 = 0.2967 s, techo 6.840 in, Vb 73.20 kip, RSA-CQC 6.793 in / 66.45 kip |
| dy-nl-cortante | OpenSeesPy 3.7 (revision-dynamics.md) | No (control) | u elástico 0.26193 m (OpenSees); θ1 = 0.1101 (a mano); techo NL 10.728 / 10.912 in; deriva máx. con P-Δ 0.02712 |
| dy-pushover-n2 | Control (bloques validados con algoritmos.md §11 y SOFiSTiK BE36) | No (control) | T1 0.4101 s, Γ 1.2928, dN2 119.45, dATC 99.01, dFEMA 102.52, dC 88.47 mm, deriva 0.01470 |
| dy-momcurv-col | Mander 1988 Fig. 4; Paulay-Priestley / Priestley 2007 | No; se validan las funciones de Mander | f′cc(30; 3) = 46.95 MPa; f′cc(30; 0, 6) = 37.80 MPa; control: ν 0.1786, Lp 46.94 cm (= 0.044·db·fy), f′cc 33.80 MPa, Mn 755.7 kN·m, μφ 11.17 |
| dy-aislamiento | Control (SIMQKE, semilla 20260) | No (control) | PGA del sismo máximo 0.725625 g, T1A = 0.94868 s (a mano); umax fijo 7.053 cm, aislador 28.22 cm, rV 0.1117 |

En las plantillas cuyos datos no son de un ejemplo publicado, la `nota` lo dice explícitamente y separa los valores
publicados de los valores de control.

## 2. Rangos usuales `[mín..máx]`

Se agregaron 48 rangos a los datos escalares (ζ, Tn, Ry, μ, T1, factor de escala, derivas límite, Cy, α, fsc,
fcr, r2, Cm, degradación, f′c, fy, fyh, Es, εsu, b, h, recubrimiento, s, P, L, Tf, peso, T2, αA, CyA, Dcap, Vs30…).
Las listas `[a|b]` no se tocaron (zona y categoría no llevan rango). Los vectores (W_i, k_i…) no admiten rango (el
motor solo lo aplica a datos escalares). Una prueba nueva comprueba que todos los valores por defecto quedan dentro
de su rango.

## 3. QA visual (`tools/shot.mjs --paper`, 1440 × 900) — defectos corregidos

Bloques (`src/blocks/dynamics.js`):
1. **LaTeX con `\;` simple** dentro de plantillas JS (thnl y pushover): se imprimía «Δt = 0.01; s», «10.728; in»,
   «a0 = 0.258 s⁻¹;;». Corregido a `\\;` (8 sitios).
2. **Recurrencia de Nigam-Jennings** demasiado ancha y con «1.31995e−4»: ahora es una ecuación en bloque (dos
   líneas) más una tabla de coeficientes con notación ×10ⁿ.
3. **Lp de Paulay-Priestley** mostraba `0.08(1500) + 0.022(25.4)(420) = 469 mm`, aritmética falsa (la suma da 355 mm;
   rige el mínimo 0.044·db·fy = 469 mm). Ahora muestra los dos términos y cuál rige. La plantilla cita el mínimo.
4. **Descripción del pushover**: decía «Newton-Raphson incremental» cuando el algoritmo es la solución exacta del
   sistema en serie (ver revision-dynamics.md). Redacción corregida.
5. Subíndices `_{max}`, `_{b,max}`, `_{res}` en cursiva → `\max`, `\mathrm{res}`.
6. Rótulo «μ = …» de los lazos V–δ de `thnl` se superponía a la línea de Vy: se movió al cuadrante superior izquierdo.
7. Etiqueta «T* = … s» del ADRS se superponía a la recta radial y al título: se movió a la izquierda de la recta.
8. Unidades que faltaban en la tabla de métodos (d*y, d*et, d*t, dy de ATC-40 y punto de desempeño).
9. Gráfico de convergencia de SIMQKE: eje «Sa_sint/Sa_obj» con guiones bajos crudos y curvas sin leyenda → «Sa,sint /
   Sa,obj» y leyenda máx./mín.
10. «ε_cu» crudo (viene de la norma) en la tabla de M–φ → «εcu».
11. Verificaciones de `thnl` repetidas con el mismo texto en las respuestas sin y con P-Δ: ahora llevan «, sin P-Δ» o
    «, con P-Δ».

Plantillas (`src/templates/dynamics.js`):
- Títulos «Sistema a: Tn = 0.5 s» se imprimían en mayúsculas como «TN = 0.5 S» (unidad alterada): ahora «Sistema a
  (periodo corto)», etc.
- Nombres de variables que se veían mal: `zetaP`→`zeta_p` (ζp), `z2/z5`→`zeta_2/zeta_5`, `SaE/SaEC/PGAesc`→`Sa_E/Sa_EC/PGA_esc`
  (+ `Sa_T`), `PGAm`→`PGA_M`, `zf/za`→`zeta_f/zeta_a`, `esu`→`epsilon_su` (ε_su), `muD_req`→`mu_D_req` (+ `mu_D`, `mu_curv`),
  `rN2C`→`r_N2C`, `deriva_max`. Comentario «V_y1/W» → «Vy1/W». Solo cambian nombres, no valores.

Revisado sin defectos: leyendas de figuras, ejes con unidades (u [in], Vb [kip], Sa/g, Sd [mm], σ [MPa], φ [1/m],
Altura [ft], Tiempo t [s]), ausencia de NaN/undefined, ortografía y tildes.

## 4. Limitaciones observadas (fuera del alcance de este módulo)

- En el sistema `us` el motor muestra los vectores en kip/in convertidos a kip/ft (`k_i = [...] kip/in =
  [378.48 kip/ft …]`), y `-> kip/in` no se aplica a vectores. Es un comportamiento de `src/engine.js`.
- Las variables que exporta un bloque con nombre compuesto (`SaT`, `derivamax`, `muphi`) se ven en romanas; en la
  plantilla se reasignan con un nombre legible cuando aparecen en una verificación.

## 5. Pruebas nuevas (`tests/dynamics.test.mjs`)

Sección «QA de plantillas»: cada plantilla tiene `validacion`; tiene al menos 3 datos con rango y todos los valores
por defecto dentro del rango; la memoria no contiene NaN, undefined, «ε_», «;\mathrm», «Sa_sint» ni «V_y1/W».
