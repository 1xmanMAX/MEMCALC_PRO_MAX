# Módulo «bridges» — Puentes (AASHTO LRFD / Manual de Puentes MTC 2018)

Archivos: `src/norms/bridges.js` (funciones), `src/blocks/bridges.js` (bloques `hl93env`, `bridgesec`, `estribo`, `pmLRFD`),
`src/templates/bridges.js` (9 plantillas, categoría *Puentes*), `tests/bridges.test.mjs` (validación).

## Fuentes

| Ref. | Documento |
|---|---|
| [AASHTO-9] | AASHTO LRFD Bridge Design Specifications, 9.ª ed. (2020). La 10.ª ed. (2024) mantiene las expresiones usadas aquí salvo donde se indica. |
| [MTC] | Manual de Puentes, MTC – DGCF, Perú (2018). Adopta HL-93, factores de carga, espectro AASHTO (Tr = 1000 años) y longitud de apoyo N. |
| [PED] | AASHTO LRFD Guide Specifications for the Design of Pedestrian Bridges (2009, rev. 2015). |
| [FHWA-PSC] | FHWA, *LRFD Design Example for Prestressed Concrete Girder Superstructure Bridge*, Design Steps 5.1–5.4 (https://www.fhwa.dot.gov/bridge/lrfd/pscus051.cfm, …054.cfm). |
| [CONSPAN] | Bentley CONSPAN, ejemplo «Prestress losses – approximate method (Art. 5.9.5)» (https://prd-aws-docs.bentley.com/LiveContent/web/CONSPAN%20US%20help-v4/en/GUID-C892CC43-F092-4671-8037-64438CD66C9E.html). |
| [RS] | A. Rodríguez Serquén, *Puentes con AASHTO-LRFD* (2020). |
| [BP] | R. Barker y J. Puckett, *Design of Highway Bridges – An LRFD Approach*, 3.ª ed. |
| [PCI] | PCI Bridge Design Manual, 3.ª ed. (2014): propiedades de la viga AASHTO Tipo IV (A = 789 in², I = 260 730 in⁴, yb = 24.73 in). |
| [NCHRP-1109] | NCHRP RR 1109 (2024), apéndice de ejemplos de barreras: confirma que la Tabla A13.2-1 de la 9.ª ed. se basa en NCHRP 350 (TL-4: Ft = 54 kip = 240 kN, Lt = 3.5 ft). |

## Funciones (`defineFns(…, 'Puentes')`, todas con sufijo LRFD)

| Función | Expresión | Artículo |
|---|---|---|
| `gMi1LRFD(S,L,ts,Kg)` | 0.06 + (S/14)^0.4 (S/L)^0.3 (Kg/12Lts³)^0.1 (S, L ft; ts in; Kg in⁴) | Tabla 4.6.2.2.2b-1 (tipos a, e, k) |
| `gMi2LRFD(S,L,ts,Kg)` | 0.075 + (S/9.5)^0.6 (S/L)^0.2 (Kg/12Lts³)^0.1 | idem |
| `gVi1LRFD(S)`, `gVi2LRFD(S)` | 0.36 + S/25; 0.2 + S/12 − (S/35)² | Tabla 4.6.2.2.3a-1 |
| `eMLRFD(de)`, `eVLRFD(de)` | 0.77 + de/9.1; 0.6 + de/10 | Tablas 4.6.2.2.2d-1 y 4.6.2.2.3b-1 |
| `leverLRFD(S,de[,dw])` | regla de la palanca, ruedas a 6 ft (1.83 m), la primera a dw = 2 ft (0.61 m) de la barrera (sin m) | C4.6.2.2.1 |
| `skewMLRFD`, `skewVLRFD` | 1 − c1 tan^1.5θ, c1 = 0.25(Kg/12Lts³)^0.25(S/L)^0.5; 1 + 0.2 (12Lts³/Kg)^0.3 tanθ | Tablas 4.6.2.2.2e-1 y 4.6.2.2.3c-1 |

> Las fórmulas de distribución admiten un último argumento opcional `ver`: 1 (o vacío) = forma de la 9.ª/10.ª ed. (unidades de EE. UU., la única vigente; desde 2014 no existe versión SI) con conversión exacta; **2 = forma SI del Manual MTC 2018** (S/4300, S/2900, Kg/(L·ts³) en mm; 0.36 + S/7600; 0.2 + S/3600 − (S/10700)²; e = 0.77 + de/2800 y 0.6 + de/3000; palanca con ruedas a 1800 mm y 600 mm). Las diferencias son < 1.5 %. La plantilla `br-vigalosa` expone el dato `verDF` (por defecto 2, MTC).
| `mpLRFD(n)`, `NLLRFD(w)` | 1.20 / 1.00 / 0.85 / 0.65; INT(w/3600) | Tabla 3.6.1.1.2-1; 3.6.1.1.1 |
| `EposLRFD`, `EnegLRFD`, `EvolLRFD` | 660 + 0.55S; 1220 + 0.25S; 1140 + 0.833X | Tabla 4.6.2.1.3-1 |
| `E1slabLRFD`, `EmslabLRFD` | 250 + 0.42√(L1W1); 2100 + 0.12√(L1W1) ≤ W/NL | 4.6.2.3-1/-2 |
| `IMLRFD(tipo)`, `IMburLRFD(DE)` | 0.33 / 0.15 / 0.75; 0.33(1 − 4.1×10⁻⁴DE) | Tabla 3.6.2.1-1; 3.6.2.2-1 |
| `MfatLRFD`, `VfatLRFD` | camión de fatiga, ejes de 14.52 t a 9.0 m | 3.6.1.4.1 |
| `MxLRFD(L,x,tipo)`, `VxLRFD` | M y V máximos en la sección x de viga simple (camión, tándem, carril, fatiga) | 3.6.1.2–3.6.1.3 |
| `BRLRFD(L,NL)` | máx(25 % camión/tándem; 5 %(camión o tándem + carril))·NL·m | 3.6.4 |
| `heqLRFD(H)` | 1.2 / 0.9 / 0.6 m para H = 1.5 / 3.0 / ≥ 6.0 m (interpolado) | Tabla 3.11.6.4-1 |
| `FpgaLRFD`, `FaLRFD`, `FvLRFD` | factores de sitio A–E con interpolación lineal (F: error) | Tablas 3.10.3.2-1 a -3 |
| `CsmLRFD(T,As,SDS,SD1)` | As + (SDS − As)T/T0; SDS; SD1/T (acepta vectores) | 3.10.4.2 |
| `zonaLRFD(SD1)` | 1 (≤ 0.15), 2 (≤ 0.30), 3 (≤ 0.50), 4 | Tabla 3.10.6-1 |
| `NapLRFD(L,H,S)`, `NpctLRFD(zona,As)` | (200 + 0.0017L + 0.0067H)(1 + 0.000125S²) mm; zona 1: 75/100 %; zonas 2–4: 150 % | 4.7.4.4-1, Tabla 4.7.4.4-1 |
| `beta1LRFD`, `EcLRFD`, `frLRFD` | β1; 120 000 K1 wc² f′c^0.33 (ksi, kcf); 0.24√f′c (ksi) | 5.6.2.2; 5.4.2.4-1; 5.4.2.6 |
| `gammahLRFD`, `gammastLRFD`, `dfpLTLRFD` | 1.7 − 0.01H; 5/(1 + f′ci); 10 fpi Aps/Ag γhγst + 12γhγst + ΔfpR | 5.9.3.3 |
| `dfpESLRFD` | (Ep/Eci)·fcgp | 5.9.3.2.3a-1 |
| `kpsLRFD`, `cpsLRFD`, `fpsLRFD` | k = 2(1.04 − fpy/fpu); c rectangular/T; fps = fpu(1 − kc/dp) | 5.6.3.1.1 |
| `betaMCFT`, `thetaMCFT` | 4.8/(1 + 750εs); 29 + 3500εs | 5.7.3.4.2 |
| `FtLRFD(TL)`, `LtLRFD(TL)`, `HbminLRFD(TL)` | Ft, Lt y altura mínima de barreras TL-1…TL-6 (60/120/240/240/550/780 kN; 1.22/1.07/2.44 m) | Tabla A13.2-1 (NCHRP 350) |
| `SbearLRFD`, `DaBearLRFD` | LW/[2hri(L + W)]; Da = 1.4 (rect.) | 14.7.5.1-1, 14.7.5.3.3 |

## Bloques

### `hl93env` — envolventes por carga móvil
- Líneas de influencia por el método de rigidez (`solveBeam` de `src/blocks.js`): una carga unitaria en cada nudo de la malla
  (40 elementos por tramo en vigas simples, 20 en continuas); las secciones de interés se agregan a la malla con cargas nulas.
- Como las líneas de influencia son lineales entre nudos, los extremos ocurren con un eje sobre un nudo: se prueban todas
  las posiciones «eje i sobre nudo j» en ambos sentidos (exacto para vigas simples). Los ejes que no contribuyen se desprecian
  (3.6.1.3.1). El cortante incluye el salto unitario de la línea de influencia en la sección.
- HL-93: camión (separación posterior 4.3 m en vigas simples, 4.3–9.0 m en continuas), tándem, carril 0.952 t/m en las zonas
  del signo desfavorable; IM solo al camión/tándem. Momento negativo en continuas: 90 % de dos camiones (separación ≥ 15 m) + 90 % del carril
  (se aplica en toda la viga, conservador fuera de la zona entre puntos de inflexión).
- Opciones: *Fatiga* (camión con ejes a 9.0 m, IM 0.15), *Ejes* (tren propio «P x; P x»), rango de circulación, anchos de franja E⁺/E⁻
  (losas: resultados por metro), cargas DC/DW y combinación Resistencia I (γDC 1.25/0.90, γDW 1.50/0.65, γLL).
- Exporta `MLLp`, `MLLn`, `VLL`, `xMLL`, `Mtr`, `Mta`, `Mln`, y con DC/DW `MDCp`, `MDCn`, `MDWp`, `MDWn`, `VDC`, `VDW`, `Mup`, `Mun`, `Vu`;
  en las secciones de interés `MLLx1`, `MLLnx1`, `VLLx1`, `MDCx1`, `MDWx1`, `VDCx1`, `VDWx1`, `Mux1`, `Vux1` (+ sufijo).

### `pmLRFD` — diagrama P–M con φ de AASHTO
Columna rectangular (barras por cara + intermedias), εcu = 0.003, α1 y β1 de 5.6.2.2, φ = 0.75 (compresión) → 0.90 (tracción) con
transición lineal entre εcl = fy/Es ≤ 0.002 y εtl = 0.005 (5.5.4.2, 5.6.2.1), Pr,max = 0.80φP0 (estribos) o 0.85φP0 (espiral).
Las demandas cuya etiqueta contiene «Evento», «EE» o «sismo» se verifican con φ = `phiEE` (0.90 por defecto, 5.10.11.4.1b para zonas 3 y 4).
Exporta `DCpm`, `phiPnmax`, `Ast`, `rhog` y las funciones `phiMnS(P)`, `phiMnEE(P)`.

### `bridgesec` — sección transversal
Losa, vigas T / I / cajón / acero o losa maciza, veredas, barreras New Jersey o barandas, asfalto, carriles de 3.60 m con camión
(ruedas a 1.80 m, P/2 = 7.26 t) y cotas (B, calzada, voladizos, S, h, ts). Muestra $d_e$.

### `estribo` — elevación del estribo
Zapata, pantalla, cajuela, parapeto, viga apoyada, relleno, reacciones, frenado y diagramas EH (Ka γ H) y LS (Ka γ heq).

## Plantillas

| id | Contenido | Ejemplo de referencia |
|---|---|---|
| `br-vigalosa` | Puente viga-losa CA L = 20 m, 4 vigas T: predimensionamiento (Tabla 2.5.2.6.3-1), losa por franjas (ruedas móviles sobre franja continua, E⁺/E⁻), voladizo con colisión TL-4 por líneas de fluencia (A13.3.1, A13.4.2), DF interior/exterior (incl. sección rígida), HL-93, Resistencia I, Servicio I (fisuración 5.6.7), fatiga (5.5.3.2), cortante simplificado (5.7.3.4.1), acero longitudinal (5.7.3.5), deflexión L/800 | [RS] cap. IV; [BP] ej. 7 |
| `br-presforzada` | Viga AASHTO Tipo IV, L = 100 ft, 30 torones 0.6″: sección compuesta, DF, pérdidas (ES forma cerrada C5.9.3.2.3a + método aproximado 5.9.3.3), esfuerzos en transferencia y servicio (5.9.2.3), fps, Mn, Mcr, cortante MCFT, deflexión | [PCI], [FHWA-PSC] |
| `br-acero` | Viga I armada compuesta L = 100 ft: proporciones (6.10.2), propiedades n y 3n, Mp (D6.1, tres casos), compacidad y ductilidad, Mn (6.10.7.1.2), Servicio II, constructibilidad (6.10.3.2, LTB y pandeo del alma), cortante (6.10.9), deflexión | FHWA Steel Design Example |
| `br-estribo` | Estribo en voladizo H = 7 m: DC, DW, LL+IM, BR, EH, EV, LS (heq), sismo M-O (kh = 0.5As) + inercias; Resistencia Ia/Ib y Evento Extremo I; excentricidad, deslizamiento, capacidad (Meyerhof), N; diseño de pantalla, punta y talón | [RS] cap. X |
| `br-pilar` | Pórtico de dos columnas: espectro (Fpga, Fa, Fv), periodo en dos direcciones (Ie = 0.5Ig), R, 100–30, esbeltez y magnificación (5.6.4.3), diagrama P–M con φ AASHTO (bloque `pmLRFD`), P–Δ (4.7.4.5), cortante con fuerza elástica, confinamiento (5.10.11.4) | [MTC] 2.4.3.11 |
| `br-neopreno` | Apoyo 300 × 450 mm: Método A (14.7.6) y Método B (14.7.5): deformaciones por corte axial/rotación/corte, estabilidad, zunchos, deflexión, anclaje | [AASHTO-9] Secc. 14 |
| `br-sismo` | Factores de sitio, espectro (gráfico + tabla), zona, requisitos de análisis, R, método de carga uniforme, fuerzas de conexión, N | [MTC], [AASHTO-9] 3.10 |
| `br-alcantarilla` | Marco de una celda con relleno 1.5 m: Fe (12.11.2.2), k0, LL a través del relleno (LLDF 1.15, interacción de ruedas), análisis por pendiente-deflexión (simetría), diseño de losas, esquinas, muros, cortante 5.12.7.3, fisuración | [RS] cap. XIII |
| `br-peatonal` | Pasarela de dos vigas I L = 30 m: PL 4.3 kPa, vehículo H5 (bloque `hl93env` con ejes propios), flexión (6.10.8, Rb), cortante, L/360, frecuencias vertical (≥ 3 Hz o W ≥ 180e^−0.35f) y lateral (≥ 1.3 Hz) | [PED] |

## Validación (tests/bridges.test.mjs)
- **FHWA PSC, Design Step 5.1** (S = 9.667 ft, L = 110 ft, ts = 8 in, Kg = 2 984 704 in⁴, esviaje 20°): gM2 = 0.796, gM1 = 0.542,
  gV1·c = 0.782, gV2·c = 0.973, e = 0.971, palanca 0.672 (con ruedas a 1.80 m se obtiene 0.677, dentro del 1 %).
- **Pérdidas aproximadas** [CONSPAN]: γh = 1.00, γst = 0.9091, creep 9.02 + contracción 10.91 + relajación 2.5 = 22.43 ksi; ΔfpES = 7.76 ksi.
- **hl93env** contra soluciones cerradas: MtruckHL93 (L = 20 m), cortante exacto del camión, wL²/8, viga continua 2 × 20 m (−wL²/8 y 0.0957wL²),
  camión de fatiga, combinación Resistencia I.
- Factores de sitio interpolados, Csm por ramas, zona, N, heq, factor de forma, β y θ del MCFT, c y fps.
- Las 9 plantillas se ejecutan sin errores y con todas las verificaciones conformes; datos insuficientes producen «NO CUMPLE».
- **Revisión**: viga continua 2 × 140 ft contra líneas de influencia cerradas de Müller-Breslau (M⁺ 0.4L y M⁻ con doble camión, < 0.2 %), tabla HS20 del Apéndice A (1524.9 kip·ft),
  fórmulas SI del MTC (`ver = 2`), Tabla A13.2-1, `pmLRFD` (Pr,max = 0.75·0.80·P0), momento de inercias del estribo y 14 casos de datos extremos sin errores ni NaN.

## Limitaciones conocidas
- Distribución de carga viva: solo fórmulas para tableros de concreto sobre vigas de acero, concreto T o I (tipos a, e, k); no se incluyen cajones multicelulares ni vigas adyacentes.
- `hl93env`: rigidez EI constante en toda la viga; el doble camión del momento negativo se aplica a todas las secciones (conservador); no considera el par de tándems de C3.6.1.3.1.
- Losa del tablero: momento negativo en las caras de las almas (4.6.2.1.6) con efectos concomitantes; el momento positivo suma los máximos de DC, DW y LL (conservador). La franja y la sección rígida están planteadas para 4 vigas (verificación `Nb == 4`).
- Estribo: empuje sísmico por Mononobe–Okabe con δ = 0 en el plano virtual y el incremento a 0.6H; la fuerza sísmica de la superestructura se toma como kh·RDC.
- Pilar: método unimodal de carga uniforme; P–M con φ de AASHTO 5.5.4.2 y φ = 0.90 en Evento Extremo (zonas 3–4); cortante de diseño con la fuerza elástica no reducida (no se calcula el momento de sobrerresistencia).
- Viga presforzada: Vp = Pe·tanψ del centroide de torones (punto de desvío en 0.4L); se desprecia la relajación antes de la transferencia; εs < 0 se toma 0 (conservador).
- Alcantarilla: reacción del suelo uniforme, sin carga de carril (relleno ≥ 0.60 m) y sin análisis de fatiga.
- Barreras: Mc y Mw se calculan con una sección rectangular equivalente de espesor medio (barras verticales y horizontales dadas); la 10.ª ed./MASH aumenta Ft para TL-4 (80 kip).

Revisión independiente: `docs/referencias/revision-bridges.md`.
