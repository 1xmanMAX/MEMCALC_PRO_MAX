# Módulo «dynamics» — dinámica estructural y análisis sísmico

Algoritmos de análisis sísmico de software de código abierto (OpenSees, eqsig, pyrotd, SeismoSignal) llevados a
JavaScript puro (`Float64Array` y bucles, sin dependencias). Unidades internas SI (m, s, kg, N); las conversiones
se hacen solo en la entrada (`evalParam`, `vecSI`) y en la salida (según `settings.sys`: tec → cm/tonf,
si → mm/kN, us → in/kip).

| Archivo | Contenido |
|---|---|
| `src/norms/dynamics.js` | Núcleo numérico exportado + funciones del editor (`defineFns(…, 'Dinámica')`) |
| `src/blocks/dynamics.js` | Bloques `thsdof`, `respspec`, `thmdof`, `pushover`, `momcurv`, `simqke` |
| `src/templates/dynamics.js` | 6 plantillas de la categoría «Dinámica estructural» |
| `src/data/elcentro.js` | El Centro 1940 N-S (1560 puntos, Δt = 0.02 s), enteros de 1e-6 g en base 36 (7.5 KB) |
| `tests/dynamics.test.mjs` | 104 pruebas contra Chopra, ATC-40/SOFiSTiK, N2, Mander y casos de algoritmos.md |

## Núcleo numérico (`src/norms/dynamics.js`)

| Función | Algoritmo | Fuente |
|---|---|---|
| `pwExact(ag, dt, ω, ζ)` | Recurrencia exacta por tramos lineales (coef. A…D′) | Nigam y Jennings (1968); Chopra §5.2 |
| `newmarkLin` / `newmarkP` | Newmark-β (γ = ½; β = ¼ o ⅙); subdivide Δt si Δt > Tn/20 | Chopra Tabla 5.4.2 |
| `newmarkNL` / `newmarkNLP` | Newmark + Newton-Raphson; resorte bilineal con endurecimiento cinemático (α = 0: elastoplástico); subdivide Δt > Tn/40 | Chopra Tabla 5.7.1; OpenSees `Steel01` sin transición |
| `spectrumNJ` | Espectro D, PSV, PSA, SA (abs.), SV con ≈ Tn de vibración libre posterior | Chopra §6.6; eqsig |
| `recordParams` | PGA, PGV, intensidad de Arias, D5-95 | SeismoSignal |
| `shearModes` | Jacobi sobre M^-½ K M^-½; φ normalizada al techo; Γn, Mn* | Chopra cap. 10–13; Bathe §11 |
| `rhoCQCw`, `combCQC` | CQC con amortiguamientos distintos | Der Kiureghian (1981) |
| `rayleighCoef` | a0, a1 para ζi, ζj en dos periodos | Chopra §11.4 |
| `pushoverShear` | Resortes bi/trilineales; control de desplazamiento por bisección; eventos de fluencia | algoritmos.md §10 |
| `n2Method` | Bilineal de áreas iguales, T*, qu, dt* iterando dm* = dt* | Fajfar (2000); EC8-1 Anexo B |
| `atc40CSM` | Procedimiento A; κ tipo A/B/C; SRA/SRV con mínimos de la Tabla 8-3; espectro reducido general `min(Sa(Ts)·SRA, Sa(T)·SRV)` | ATC-40 §8.2.2.1 |
| `fema440ELM` | βeff y Teff/T0 de FEMA 440 §6.2; B = 4/(5.6 − ln βeff); MADRS (M = (Teff/Tsec)²) | FEMA 440 cap. 6 |
| `coefMethod` | δt = C0·C1·C2·Sa·Te²g/4π² con Te = T1 | ASCE 41-17 §7.4.3.3.2 |
| `manderFcc`, `manderCurve`, `manderCover`, `confinementRect` | f′cc, εcc, r, ke rectangular, εcu de Priestley | Mander, Priestley y Park (1988) |
| `hognestad`, `steelModel` | Hognestad; acero EPP, bilineal y Park-Paulay | Hognestad (1951); Park y Paulay (1975) |
| `momentCurvature` | Fibras (120 franjas + barras, concreto desplazado), bisección de ε0 para N = P | algoritmos.md §14 |
| `simqke` | Senoides con fases aleatorias (LCG con semilla), envolvente de Jennings, ajuste iterativo, corrección de línea base (v y d finales nulos), conserva la mejor iteración | Gasparini y Vanmarcke (1976) |

Funciones del editor: `rayleighA0`, `rayleighA1`, `zetaRayleigh`, `rhoCQC(Ti, Tj, ζi, ζj)`, `SdSa`, `SaSd`, `SvSd`,
`etaEC8`, `BFEMA440`, `SRAATC40`, `SRVATC40`, `C1ASCE41`, `C2ASCE41`, `RmuN2`, `fccMander`, `eccMander`,
`ecuPriestley`, `LpPP`, `SaElCentro(T, ζ)` y `SdElCentro(T, ζ)` (memoizadas).

## Bloques

- **thsdof** — registro (El Centro, SIMQKE con nombre, o pegado: una columna con Δt o dos columnas t–a; unidades g,
  m/s², gal, in/s²; factor de escala), Tn, ζ, masa opcional, modelo lineal/bilineal (Cy o Ry, α), método
  NJ/Newmark. Gráficos üg(t), u(t) (con la respuesta elástica de contraste) y A(t) o el lazo fS–u; coeficientes de
  la recurrencia y tabla de los primeros pasos. Exporta `umax, tumax, vmax, amax, amax_g, An_g, PGA, Vbmax, mu, uy,
  Cy, Ry, ures`.
- **respspec** — lista de ζ, Tmax, n.º de periodos, espectro de diseño (expresión en T) y T1. Gráficos Sa, Sv, Sd;
  tabla de ordenadas; PGA, PGV, Arias, D5-95; factor de escala mínimo para cubrir el espectro de diseño en
  0.2T1–1.5T1. Exporta `PGA, PGV, Ia, D595, Tpk, Samax, SaT, SdT, SvT, SAabsT, SaDisT, fesc`.
- **thmdof** — masas, rigideces y alturas por piso; amortiguamiento modal o Rayleigh (modos i, j); n.º de modos;
  comparación con RSA (CQC/SRSS) usando el espectro del propio registro y, opcionalmente, un espectro de diseño.
  Exporta `T1…Tn, u_techo, t_techo, Vbmax, Mbmax, umax_i, deriva_i, Vmax_i, derivamax, u_rsa, Vb_rsa, CbTH`.
- **pushover** — Vy y α por piso, trilineal opcional (Vcr/Vy, rigidez fisurada), patrón modal/triangular/uniforme,
  espectro elástico y TC, método gobernante, tipo ATC-40, coeficiente a del sitio y Cm de ASCE 41, niveles de
  desempeño editables. Exporta `dobj, dN2, dATC, dFEMA, dC, Vobj, Tstar, Fystar, dystar, mu, derivamax,
  deriva_obj, Gam, mstar, Tpo1, dcap, Vyb, beffATC, beffFEMA`.
- **momcurv** — b, h, recubrimiento, capas «n varilla d» (varilla ASTM `8`/`#8` o `16mm`), estribo, s, ramas en cada
  dirección, P, modelos de concreto (Mander/Hognestad) y acero (Park/bilineal/EPP), L de cortante. Exporta `Mcr,
  phicr, My1, phiy1, Mn, phiy, Mu, phiu, Mmax, muphi, Lp, thetap, muD, fcc, ecu, ke`.
- **simqke** — espectro objetivo, duración, Δt, envolvente, semilla, n.º de frecuencias e iteraciones; registra el
  acelerograma con un nombre para los otros bloques. Exporta `PGAsim, rmin, rmax, rPGA`.

Rendimiento medido (Node 22): espectro de 120 periodos × 3 ζ ≈ 20–50 ms; thsdof bilineal ≈ 10 ms; thmdof 5 pisos
≈ 30 ms; pushover + 4 métodos ≈ 90 ms; momcurv Mander ≈ 170 ms; SIMQKE (300 frecuencias × 12 iteraciones ×
2000 pasos) ≈ 110 ms. Todos los bloques memoizan por hash de las entradas.

## Plantillas

| id | Contenido | Validación |
|---|---|---|
| `dy-sdof-elcentro` | 1 GDL Tn = 0.5/1/2 s, ζ = 2 % (NJ y Newmark) + elastoplástico Ry = 4 | D = 2.67/5.97/7.47 in (Chopra Fig. 6.4.1) |
| `dy-espectro-e030` | Espectros de El Centro (2/5/10 %) vs E.030-2026 (Z4, Vs30 = 400 m/s) | Sa(T→0) = PGA; consistencia con `SaElCentro` |
| `dy-5pisos-chopra` | Edificio de cortante de 5 pisos, THA modal vs RSA CQC, Rayleigh | T1 = 2.0007 s; u5 = 6.840 in; Vb = 73.20 kip |
| `dy-pushover-n2` | Pórtico de C°A° de 4 pisos trilineal, demanda E.030-2026, N2/ATC-40/FEMA 440/ASCE 41, niveles OP-IO-LS-CP | caso N2 de algoritmos.md en las pruebas |
| `dy-momcurv-col` | Columna 40 × 60 confinada (Mander + Park), Lp, θp, μΔ | f′cc de Mander; M–φ de algoritmos.md §14 |
| `dy-aislamiento` | SIMQKE compatible con SaM (E.031) y 1 GDL fijo vs aislado bilineal (LRB) | razón espectral ≥ 0.90 |

## Validación (tests/dynamics.test.mjs)

| Caso | Esperado | Obtenido |
|---|---|---|
| Chopra Ej. 5.4/5.5 Newmark | u(1.0) = −1.1441 / −1.2208 in | exacto a 4 cifras |
| Chopra Ej. 5.1 exacto por tramos | u(1.0) = −1.2432 in; A = 0.8129 | exacto |
| Chopra Ej. 5.7 elastoplástico | u(0.7) = 2.0951 in; fS(0.8) = 5.789 kip | exacto |
| El Centro ζ = 2 % (Fig. 6.4.1) | D = 2.67, 5.97, 7.47 in | 2.675, 5.968, 7.467 |
| 5 pisos Chopra, ζ = 5 % | T1 = 2.0007 s; u5 = 6.840 in; Vb = 73.20 kip | 2.0004; 6.8403; 73.198 |
| RSA CQC con el espectro del registro | 6.793 in; 66.45 kip | igual |
| CQC ρ(β = 0.9; 0.8) | 0.4730; 0.1656 | igual |
| Rayleigh T = 1.0/0.2 s | a0 = 0.52360; a1 = 0.002653; ζ(0.5 s) = 3.75 % | igual |
| ATC-40 SOFiSTiK BE36 tipo C, SB | βeff = 9.41 %; PP = (85.55 mm; 3.237 m/s²) (ref. 83.36; 3.24) | igual |
| ATC-40 BE36 tipo C, SD | βeff = 14.63 %; PP = (150.32; 3.569) (ref. 149.86; 3.63) | igual |
| N2 3 pisos (algoritmos.md §11) | Γ = 1.2619; Fy* = 1260.3 kN; dy* = 39.47 mm; T* = 0.4960 s; d_techo = 70.04 mm | 70.01 mm |
| Mander f′co = 30, f′l = 3 MPa | f′cc = 46.95 MPa; εcc = 0.00765; r = 1.289 | igual |
| M–φ 300 × 500 (algoritmos.md §14) | M′y = 246.9 kN·m; Mu = 257.3 kN·m | 246.4; 257.3 |
| SIMQKE E.030 Z4-S2 | razón 0.947–1.188; PGA/ZUS ≈ 1.11 | 0.928–1.137; 1.17 |

## Limitaciones

- **Registros:** solo El Centro 1940 N-S está embebido (dominio público). No se encontró en formato digital libre el
  registro de Lima 1974 (USGS OFR 77-587 solo trae gráficos; los datos estaban en cinta) ni de Pisco 2007 / Maule
  2010 con licencia clara; se sustituyen por el generador SIMQKE compatible con E.030/E.031 o por registros pegados
  por el usuario (p. ej. descargados de CISMID/REDACIS o del CSN de Chile).
- **thmdof** es lineal elástico (superposición modal). El tiempo-historia no lineal de varios pisos no está
  implementado; el pushover usa resortes de entrepiso (edificio de cortante), no rótulas en pórticos generales.
- **Pushover:** sin degradación de resistencia (la curva termina en la deriva `druEnd`); sin P-Δ. ASCE 41 usa
  Te = T1 (Ki = Ke, válido si la rama inicial es lineal hasta 0.6Vy). ATC-40 con espectro general usa
  `min(Sa(Ts)·SRA, Sa(T)·SRV)`, equivalente a la forma Ca/Cv de la norma. Con κ tipo A el benchmark de SOFiSTiK no se
  reproduce (como indica algoritmos.md); para tipo A el punto fijo convergido (13.89 %) difiere 0.6 % del de la
  referencia (13.81 %, iteración no relajada).
- **FEMA 440:** coeficientes «para cualquier curva de capacidad», sin distinguir el tipo de histéresis.
- **momcurv:** confinamiento con f′l promedio de las dos direcciones (simplificación documentada de Mander); sin
  pandeo de barras ni corte; sección rectangular; la ductilidad de desplazamiento usa el voladizo equivalente.
- **SIMQKE:** la razón espectral mínima suele quedar en 0.90–0.95 y el PGA entre 1.1 y 1.3 veces ZUS (frecuencias
  altas sin control por encima de 1/Tmin); se reporta siempre PGA/ZUS.

## Fuentes

- Chopra, A. K., *Dynamics of Structures*, 4.ª/5.ª ed. (§5.2, 5.4, 5.7, 6.4–6.6, 7.4–7.5, 11.4, 12.8, 13.1–13.8).
- Nigam, N. C. y Jennings, P. C. (1968), *Digital calculation of response spectra from strong-motion earthquake
  records*, Caltech EERL.
- Der Kiureghian, A. (1981), *A response spectrum method for random vibration analysis of MDF systems*, EESD 9.
- Fajfar, P. (2000), *A nonlinear analysis method for performance-based seismic design*, Earthquake Spectra 16(3);
  EN 1998-1 Anexo B.
- ATC-40 (1996) §8.2.2; SOFiSTiK *Verification Manual* BE36 (ATC-40 §8.3.3.3).
- FEMA 440 (2005) cap. 5–6; ASCE 41-17 §7.4.3; FEMA 356 Tabla C1-3 (derivas por nivel de desempeño).
- Mander, J. B., Priestley, M. J. N. y Park, R. (1988), *Theoretical stress-strain model for confined concrete*, J.
  Struct. Eng. 114(8); Priestley, Seible y Calvi (1996); Paulay y Priestley (1992) Ec. 4.30; Priestley, Calvi y
  Kowalsky (2007).
- Gasparini, D. y Vanmarcke, E. (1976), *SIMQKE*, MIT.
- NTE E.030-2026 (RM 183-2026-VIVIENDA) Art. 41 y 47; NTE E.031 Art. 14.
- El Centro 1940: https://www.vibrationdata.com/elcentro.dat (registro USGS/Caltech de dominio público).
- Implementaciones de referencia: `docs/referencias/investigacion/ref/` (alg.mjs, t1–t5.mjs).
