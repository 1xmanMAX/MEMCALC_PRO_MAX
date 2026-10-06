# Revisión independiente del módulo «dynamics»

Fecha: 2026-10-06 · Alcance: `src/norms/dynamics.js`, `src/blocks/dynamics.js` (thsdof, respspec, thmdof, pushover,
momcurv, simqke y el nuevo thnl), `src/templates/dynamics.js`, `src/data/elcentro.js`, `tests/dynamics.test.mjs` y
`docs/referencias/dynamics.md`.

Resultado final: `node tests/dynamics.test.mjs` → **146 correctas, 0 fallidas** (antes 104); `node tests/verify.mjs`
→ 203 correctas, 0 fallidas.

## 1. Contraste numérico con OpenSeesPy 3.7

Se instaló OpenSeesPy en `/tmp` y se reprodujeron los modelos con el mismo registro (El Centro embebido), el mismo
Δt y el mismo subpaso. Los valores de OpenSees quedaron como pruebas de regresión.

| Caso | OpenSees | MemoriaCalc | Diferencia |
|---|---|---|---|
| 1 GDL lineal Tn = 1 s, ζ = 2 % (Newmark promedio) | 0.150680 m | 0.150629 m (Newmark), 0.151588 m (Nigam-Jennings exacto) | 0.03 % |
| 1 GDL EP Tn = 0.5 s, ζ = 5 %, Ry = 4 (Steel01 b = 0) | umax 0.044304; ures −0.030895 m | 0.044304; −0.030894 m | < 0.01 % |
| 1 GDL bilineal Tn = 1 s, α = 0.1, Ry = 2 | 0.086679 m | 0.086699 m | 0.02 % |
| 5 pisos lineal, Rayleigh 1-3, El Centro × 1.5 | techo 0.26193 m | 0.26193 m | 0 |
| 5 pisos bilineal α = 0.03 | 0.23924 m; δ1 = 0.0898 m | 0.23928; 0.0899 m | 0.02 % |
| 5 pisos bilineal + P-Δ (columna ficticia) | 0.33457 m; residual δ1 −0.1420 m | 0.33464; −0.1422 m | 0.02 % |
| 5 pisos EP + P-Δ (colapso, δ/h > 10 %) | t = 11.18 s | t = 11.19 s | 1 paso |
| M–φ Hognestad + Steel01 (P = 0) | 224.74 / 250.30 / 265.64 kN·m | 224.74 / 250.17 / 265.62 | ≤ 0.15 % |
| M–φ Hognestad + EPP (P = 900 kN) | — | ≤ 0.5 % (hasta εcu) | — |
| M–φ Mander (Concrete04 núcleo) + recubrimiento | — | ≤ 0.03 % antes del descascaramiento; 6 % durante él | modelo del recubrimiento |

Notas: (i) los `zeroLength` de OpenSees ignoran Rayleigh salvo `-doRayleigh 1`; (ii) la columna ficticia P-Δ debe ir
en un elemento aparte sin amortiguamiento para que βK_init use la rigidez de la estructura; con el material en paralelo
OpenSees amortigua con k − θ y la respuesta cambia ≈ 2 %. La diferencia de 6 % en M–φ de Mander se debe a que
Concrete04 usa la rama de Popovics para el recubrimiento, mientras que Mander (1988) la reemplaza por una recta de
2εco a εsp = 0.005 (lo implementado); no es un error.

**Conclusión:** Nigam-Jennings (coeficientes verificados contra Chopra Tabla 5.2.1), Newmark lineal y no lineal
(Newton-Raphson con resorte cinemático = Steel01 sin transición), espectros (D, PSV, PSA y aceleración absoluta SA
separados correctamente), CQC de Der Kiureghian, Rayleigh general y la integración por fibras eran correctos.

## 2. Defectos y deficiencias encontrados (corregidos)

1. **Picos en subpasos.** Newmark subdivide Δt (Tn/20, Tn/40) pero el máximo se leía solo en los instantes del
   registro: subestimaba umax hasta 0.3 % (EP Tn = 0.5 s). Ahora `upk` registra el pico en todos los subpasos.
2. **Sin aviso de no convergencia** de Newton-Raphson (60 iteraciones y se seguía). Ahora se cuentan los pasos sin
   convergencia y el bloque emite un ✘.
3. **Mander con f′lx ≠ f′ly promediado.** El promedio sobrestima f′cc hasta 24 % (f′l1 = 0, f′l2 = 0.2f′co: 1.565 vs
   1.260). Se implementó la **superficie de falla de 5 parámetros** (William-Warnke con la calibración de Elwi-Murray)
   que Mander usó para el ábaco de la Fig. 4: se resuelve σ3 tal que (−f′lx, −f′ly, σ3) quede sobre la superficie
   (bisección). Comprobaciones: con f′l1 = f′l2 reproduce la fórmula cerrada a 4 cifras (0.02 → 1.1324; 0.1 → 1.5651;
   0.3 → 2.2912) y en compresión uniaxial τoct = √2/3 exacto; la aproximación explícita de Chang y Mander (1994) queda a
   ≤ 1 % (también exportada). Opciones del bloque: triaxial (por defecto), promedio, mínimo. Función nueva
   `fccMander2(f′co, f′lx, f′ly)`.
4. **ke con todas las barras restringidas.** Σw′² usaba la separación entre todas las barras aunque las ramas no las
   restringieran. Ahora en cada cara se cuentan como restringidas a lo sumo tantas barras como ramas perpendiculares.
5. **Plantilla de columna con ramas invertidas** (nlb = 2, nlh = 3): una columna 40 × 60 con 3 barras por cara de
   60 cm necesita el gancho paralelo a b; se corrigió a nlb = 3, nlh = 2 y se documentó el detalle.
6. **ASCE 41 con Te = T1 y bilineal de pendiente inicial.** ASCE 41-17 §7.4.3.2.4 exige Ke secante en 0.6Vy, rama
   post-fluencia por (Δd, Vd) y áreas iguales; Te = Ti√(Ki/Ke). Se implementó `idealizeASCE41` (iterativa) y el
   límite de inestabilidad dinámica μmax = Δd/Δy + |αe|^(−h)/4 (Ec. 7-32) cuando hay pendiente negativa; para curvas
   trilineales (fisuración) Te era hasta 10 % menor.
7. **N2:** faltaba el tope d*t ≤ 3d*et (EC8-1 B.5) y, con rama descendente, F*y debe ser el máximo hasta d*m (no la
   fuerza en d*m). Demanda nula (Sa = 0) producía NaN: ahora da d = 0.
8. **Datos extremos producían errores en lugar de ✘:** pushover sin punto de desempeño (ATC-40/FEMA 440) lanzaba una
   excepción; con P-Δ mayor que la rigidez no había mensaje; la columna sin fluencia (P enorme) lanzaba «no alcanzó la
   fluencia». Ahora se emite ✘ NO CUMPLE y se exportan valores finitos (centinelas documentados) para que las
   verificaciones posteriores de la plantilla también den NO CUMPLE sin errores ni NaN.
9. **Deriva en el punto de desempeño** se verificaba con el estado del final de la curva aunque el objetivo la
   excediera (podía dar ✔). Ahora exige además que el objetivo esté dentro de la curva.
10. **Registros del usuario:** cualquier línea de texto (encabezados SMC, PEER, CISMID) abortaba el cálculo. Ahora se
    omiten las líneas no numéricas, se admite «Líneas de encabezado a omitir» (para encabezados enteros como los de
    SMC) y números Fortran `1.0D-02`.

## 3. Mejoras implementadas

- **Tiempo-historia no lineal de edificio de cortante** (`nlShearTH`, bloque `thnl`, plantilla `dy-nl-cortante`):
  Newmark promedio + Newton-Raphson con K̂T tridiagonal (Thomas), resortes bilineales cinemáticos por entrepiso, P-Δ
  con columna ficticia, Rayleigh con K inicial, subpasos ≤ Tn/20, vibración libre posterior (max(3 s, 5T1)) y deriva
  residual como media de los últimos 2T1, detección de colapso (δ/h > 10 %). Es robusto: 0 pasos sin convergencia en
  todos los casos probados (incluido el colapso), 2 iteraciones típicas; 30–60 ms para 5 pisos × 3 100 pasos.
- **P-Δ y degradación de resistencia en el pushover.** La solución con Newton-Raphson incremental fallaba en la
  bifurcación (dos entrepisos alcanzando la rama descendente). Se reemplazó por la **solución exacta del sistema en
  serie**: (1) Vb creciente, invirtiendo la envolvente neta G(δ) = F(δ) − θδ (lineal por tramos, inversión analítica);
  (2) tras el máximo, control de la deriva del entrepiso crítico (el primero con tangente neta ≤ 0) con descarga
  elástica (k − θ) de los demás. Con θ = 0 y sin degradación reproduce la curva anterior a 1e-12. La degradación sigue
  la envolvente tipo ASCE 41 (deriva de inicio, pendiente −ac·k, resistencia residual).
- αP-Δ para la Ec. 7-32 se obtiene de un segundo pushover elastoplástico solo con P-Δ.

## 4. Plantillas (lectura de revisor)

| Plantilla | Observaciones | Datos extremos (prueba) |
|---|---|---|
| dy-sdof-elcentro | Correcta; cita Chopra Fig. 6.4.1 | μdisp = 1.2 → ✘ |
| dy-espectro-e030 | Correcta; el criterio de escala es para una componente | fesc,max = 0.5 → ✘ |
| dy-5pisos-chopra | Correcta (6.840 in, 73.20 kip) | dlim = 0.0005 → ✘ |
| dy-nl-cortante (nueva) | Contrastada con OpenSees; θ1 = 0.11 | Cy = 0.03 → colapso ✘ |
| dy-pushover-n2 | Ahora con P-Δ y degradación desde 3 % y Ec. 7-32 | k = 2000 kN/m → inestable P-Δ ✘ |
| dy-momcurv-col | Ramas corregidas; confinamiento triaxial | P = 20 000 kN → sin fluencia ✘ |
| dy-aislamiento | Correcta | Dcap = 5 cm → ✘ |

Todas sin errores ni NaN; tiempos por bloque < 200 ms (la plantilla no lineal completa, 4 integraciones, ≈ 70 ms en
caliente). Revisión visual con `tools/shot.mjs` de la figura de `thnl` (techo NL vs elástico, lazos V–δ, envolventes)
y del pushover con rama descendente.

## 5. Registros peruanos y chilenos

| Registro | Disponibilidad | Licencia | Decisión |
|---|---|---|---|
| Lima 1966 / 1974 (IGP, Parque de la Reserva) | Solo en bases con registro (PEER NGA-Sub, COSMOS VDC) o gráficos (USGS OFR 77-587) | PEER/COSMOS prohíben redistribuir | No embebido |
| Pisco 2007 ICA2 (CISMID) | Portal de CISMID/REDACIS | Sin licencia explícita | No embebido |
| Maule 2010 Concepción (CCSP) | USGS-NSMP `ca.water.usgs.gov/nsmp/20100227_0634/corrected/` (datos de U. de Chile / Núcleo Milenio, formato SMC) | Sin licencia explícita (no son de autoría USGS) | No embebido; probado |
| CSN Chile (evtdb.csn.uchile.cl) | miniSEED / evt | «uso público» con atribución al CSN, sin licencia formal | No embebido |

Cómo usarlos: descargar el archivo y pegarlo completo en «Datos del usuario». Para SMC de USGS-NSMP: «Líneas de
encabezado a omitir» = 27, unidad cm/s², Δt = 0.005 s (200 muestras/s; ver el encabezado). Con
`CCSP.HNN.._a.smc` (Concepción, Maule 2010) el bloque `respspec` da PGA = 0.651 g (el encabezado indica 638 cm/s²) en
97 ms para 20 200 puntos. Para AT2 de PEER: omitir 4 líneas, unidad g, Δt del encabezado. Para CISMID/CSN en texto:
las líneas con texto se omiten solas. Se debe citar la fuente (CSN pide atribución explícita).

## 6. Pendiente / limitaciones aceptadas

- Degradación cíclica (Ibarra-Medina-Krawinkler) y pinching no implementados en `thnl` (solo bilineal cinemático).
- Pushover con patrón fijo (no adaptativo) y localización en un único entrepiso.
- Rayleigh con rigidez inicial puede sobreamortiguar tras la fluencia (Charney 2008); se documenta.

## Fuentes

Chopra, *Dynamics of Structures* (Tablas 5.2.1, 5.7.1, 16.3.3); Mander, Priestley y Park (1988); Elwi y Murray (1979);
Chang y Mander (1994) NCEER-94-0006; ASCE 41-17 §7.4.3; EN 1998-1 Anexo B; FEMA P-58; OpenSeesPy 3.7 (Steel01,
Concrete01, Concrete04, zeroLength, zeroLengthSection); USGS-NSMP; política de datos del CSN
(csn.uchile.cl/centro-sismologico-nacional/politica-datos).
