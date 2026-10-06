# Módulo «steel» — Acero estructural: referencias, fórmulas y validación

Archivos: `src/norms/steel_shapes.js` (base de perfiles, generada), `src/norms/steel.js` (funciones),
`src/blocks/steel.js` (bloques `steelsec`, `basepl`, `boltgroup`), `src/templates/steel.js` (10 plantillas),
`tests/steel.test.mjs` (validación).

## 1. Fuentes

| Fuente | Uso |
|---|---|
| ANSI/AISC 360-16 y 360-22, *Specification for Structural Steel Buildings* | Caps. B4 (clasificación), D, E (E3, E4, E5, E7), F (F1, F2, F3, F6, F7, F8), G (G2, G4, G5), H1, I (I2.1b, I3, I8), J (J2, J3, J4, J8, J10), Apéndices 7 y 8 |
| AISC *Steel Construction Manual* 15.ª/16.ª ed. — **AISC Shapes Database v15.0/v16.0** | Propiedades de W, HP, M, S, C, MC, L, HSS y Pipe (archivo `aisc-shapes-database-v15.0`, distribuido en el paquete npm `aisc` 0.1.0; para los perfiles incluidos los valores coinciden con la v16.0) |
| AISC *Design Examples* v16 (Companion Vol. 1) | Ej. E.1A (φcPn = 893 kip), F.1-1A (φMp = 379 kip·ft), F.1-3A (φMn = 288 kip·ft), G.1A (φVn = 306 kip), H.1A (0.928), D.2 (φPn = 122/125 kip) |
| AISC Manual, Partes 7, 8 y 10 | Tabla 7-1 (corte en pernos), Parte 8 (1.392 kip/in por 1/16" de filete E70), Parte 10 (placa simple, configuración convencional, Ec. 10-5) |
| AISC Design Guide 1, 2.ª ed. (Fisher y Kloiber) | Placa base: m, n, λn′, X, λ, tp = ℓ√(2Pu/(0.9FyBN)), fricción |
| AISI S100-16 | Ancho efectivo (Apéndice 1, Ec. 1.1-1 a 1.1-4, 1.2-1), cortante G2.1, H1.2, H2, método R (I6.2.1) |
| NTE E.090 (2006, basada en AISC-LRFD 1999) | Combinaciones 1.4.1; F1 (Lp = 300ry/√Fy, Lr con X1, X2, FL = Fy − Fr, Fr = 69 MPa); Fcr con λc (E2) |
| NTE E.020 | Carga viva de techo liviano 30 kgf/m² (Art. 7.1 b); viento: Vh = V(h/10)^0.22, ph = 0.005·C·Vh², Tabla 4 de factores de forma, presión interior ±0.3 |
| NTE E.030-2018 | Verificación sísmica del pórtico (ZUCS/R, C, 0.75R, deriva 0.010 para acero) |
| Perfiles europeos IPE/HEA/HEB/HEM | Dimensiones, A, I, W, i de tablas ArcelorMittal / EN 10365 (vía `eurocodepy`); It e Iw con las fórmulas de ArcelorMittal: It = 2/3(b − 0.63tf)tf³ + 1/3(h − 2tf)tw³ + 2(tw/tf)(0.145 + 0.1r/tf)·D⁴, Iw = tf·b³(h − tf)²/24. Verificado: IPE300 It = 20.12 cm⁴, Iw = 125.9×10³ cm⁶; HEB200 It = 59.28, Iw = 171.1×10³ |
| McCormac & Csernak, *Diseño de estructuras de acero*; Segui, *Steel Design*; Zapata Baglietto, *Diseño estructural en acero* | Procedimientos de tracción (bloque de cortante), armaduras (método de nudos y secciones), pórticos simples |

## 2. Base de datos (`sec(perfil, propiedad)`)

- AISC (in, in², in³, in⁴, in⁶, lb/ft): W (283), HP, M, S, C, MC, L (137), HSS rectangulares (388), HSS redondos y Pipe (179).
- Europeos (cm): IPE 80–600, HEA/HEB/HEM 100–1000.
- Conformados en frío `CF H×B×D×t` (mm, p. ej. `CF150X50X15X2`): canal atiesado por el **método lineal con esquinas rectas** (AISI Design Manual). A, Ix, Sx, Iy, Sy (fibra del labio), x̄, J = Σbt³/3.
- `sec()` devuelve `Unit` convertido a la unidad de longitud del documento (in / mm / cm). Llamado con un solo número conserva la secante trigonométrica de math.js.
- Nombres flexibles: `"w12x26"`, `"HSS6X6X.375"`, `"HSS6.625X.280"`, `"HE 200 B"`, `"IPE 300"`.
- Propiedades: A, d, bf, tw, tf, kdes, kdet, k1, h (= h/tw·tw), bf/2tf, h/tw, Ix, Zx, Sx, rx, Iy, Zy, Sy, ry, J, Cw, rts, ho, W (peso); C/MC: x, eo, xp, ro, H3; L: b2, t, x, y, Iz, rz, Sz, ro, tan(α); HSS: Ht, B, tnom, tdes, h, b2, b/tdes, h/tdes, C; redondos: OD, ID, D/t. Alias: Ag, peso, lambdaf, lambdaw, b_t, h_t, D_t.

## 3. Funciones (categoría «Acero»)

| Función | Fórmula / artículo |
|---|---|
| `FeE3(Lc/r, E)` | Fe = π²E/(Lc/r)² (E3-4) |
| `FcrE3(Fy, Lc/r, E)`, `FcrFe(Fy, Fe)` | Fcr = 0.658^(Fy/Fe)·Fy si Fy/Fe ≤ 2.25; si no 0.877Fe (E3-2, E3-3) |
| `FcrE090(Fy, KL/r, E)` | λc = (KL/rπ)√(Fy/E); Fcr = 0.658^λc²·Fy (λc ≤ 1.5) o 0.877Fy/λc² (E.090 E2) |
| `beE7(b, t, λr, Fy, Fcr, caso)` | E7-2/E7-3 con c1, c2 de la Tabla E7.1 (a: 0.18/1.31, b: 0.20/1.38, c: 0.22/1.49) |
| `PnE3(perfil, Fy, Lcx, Lcy, E)` | E3 + E7 (I, C, HSS, tubos); canales con pandeo flexo-torsional E4 |
| `LpF2`, `LrF2` | F2-5, F2-6 (c = 1; canales c = (ho/2)√(Iy/Cw)) |
| `MnW(perfil, Fy, Lb, Cb, E)` | F2 (fluencia y PLT) + F3 (pandeo local de ala no compacta/esbelta); alma no compacta → error (F4/F5 no implementadas) |
| `MnyW(perfil, Fy, E)` | F6: min(FyZy, 1.6FySy) y F6-2/F6-3 |
| `MnHSS(perfil, Fy, E)` | F7 (compacto, F7-2, F7-3 aprox.) y F8 (tubos redondos) |
| `CbF1(Mmax, MA, MB, MC)` | Cb = 12.5Mmax/(2.5Mmax + 3MA + 4MB + 3MC) (F1-1) |
| `Cv1G2`, `Cv2G2`, `VnG2`, `phivG2` | G2-3/G2-4, G2-9 a G2-11, G2-1; φv = 1.0 si h/tw ≤ 2.24√(E/Fy) en laminados (G2.1a); HSS G4 (kv = 5), redondos G5 aprox. Ag/2 |
| `H1(Pr, Pc, Mrx, Mcx, Mry, Mcy)` | H1-1a / H1-1b |
| `FnvJ3`, `FntJ3`, `FntpJ3`, `Abolt`, `dhJ3` | Tabla J3.2 (A307 27/45; Grupo A 54/68/90; Grupo B 68/84/113 ksi), J3-3a, Tabla J3.3 y J3.3M |
| `RnAplast`, `RnDesg` | 2.4dtFu (J3-6a), 1.2lctFu (J3-6c) |
| `RnFilete(w, L, FEXX, θ)` | 0.6FEXX(1 + 0.5sin^1.5θ)·0.707w·L (J2-4, J2-5) |
| `wminJ2`, `wmaxJ2` | Tabla J2.4, J2.2b |
| `RnBloque(Agv, Anv, Ant, Fy, Fu, Ubs)` | J4-5 |
| `UD3(x̄, l)` | U = 1 − x̄/l (Tabla D3.1 caso 2) |
| `RnJ10y`, `RnJ10c` | J10-2/J10-3; J10-4/J10-5a/J10-5b (Qf = 1) |
| `QnI8`, `EcAISC` | I8-1; Ec = wc^1.5√f′c (ksi) |
| `rhoAISI(w/t, f, E, k)` | λ = (1.052/√k)(w/t)√(f/E); ρ = (1 − 0.22/λ)/λ ≤ 1 (S100 Ap. 1) |

## 4. Bloques

- **`steelsec`**: dibujo a escala (I con filetes, canal, ángulo, HSS con radios 2t/t, tubo, canal atiesado), ejes x–y, cotas y tabla de propiedades. Exporta `perfil` (texto) y las propiedades de la familia con sufijo opcional (`Zx_c`…).
- **`basepl`**: planta (pedestal, placa, columna, líneas 0.95d × 0.8bf, pernos, cotas N, B, m, n) y elevación (grout, placa, pernos con tuerca y placa de anclaje, hef). Exporta `m_pl`, `n_pl`, `lambdanp`, `A1`, `A2`.
- **`boltgroup`**: método elástico, r_x = Px/n − M·y/Ip, r_y = Py/n + M·x/Ip; vectores de fuerza, tabla por perno, perno crítico y verificación opcional con φrn. Exporta `nb`, `Ip`, `Mo`, `Rmax`, `Cel`.

## 5. Plantillas y validación

| Id | Contenido | Validación (tests/steel.test.mjs) |
|---|---|---|
| `st-columna` | W14×132, E3 + E7 (ancho efectivo), curva φPn–Lc | AISC E.1A φcPn = 893 kip |
| `st-vigacolumna` | W14×99, E3, F2/F3/F6, H1-1 | AISC H.1A 0.928; φMnx = 642, φMny = 311, φPn = 1130 kip |
| `st-traccion` | L4×4×½, D2/D3, pernos J3, bloque de cortante J4.3, `boltgroup` | AISC D.2: 121.5 / 125 kip, An = 3.31 in² |
| `st-shear-tab` | Placa simple convencional (Parte 10), grupo excéntrico, J3.10, J4, Ec. 10-5, soldadura J2 | Método elástico frente a cálculo manual |
| `st-placa-base` | DG1 (Thornton), J8, anclajes, fricción, `basepl` | Fórmulas DG1 recalculadas en la prueba |
| `st-correas` | AISI S100: CF150×50×15×2, viento E.020, ρ, R = 0.70, cortante, flecha, templadores, `beam` | Mux y ph recalculados |
| `st-armadura` | Pratt de cuerdas paralelas, nudos y secciones, HSS (E3) y ángulos (E5), levante | F = M/h, diagonal (R − P/2)/sen α |
| `st-nave` | Pórtico biarticulado (Kleinlogel), viento E.020, correas, B2, K (Dumonteil), viga y columnas W, deriva por viento y sismo E.030 | cg = 1/(4(2k+3)), K ≈ 2.16 |
| `st-compuesta` | W12×19 + losa colaborante, I3.1a, I8-1 (Rg, Rp), compuesta parcial, ILB | Qn = 7.82 t, φMn = 28.7 t·m (manual) |
| `st-viga-ipe` | IPE300 S275, F2 con Cb, comparación E.090 (X1, X2, FL), G2, J10, flechas | Lp = 1.59 m, Lr = 5.10 m, Cb = 1.30 |

### Fórmulas de Kleinlogel (pórtico biarticulado de viga horizontal), deducidas por el método de las fuerzas

Con k = (Iviga/Icol)(h/L):
- Carga vertical w en la viga: H = wL²/(4h(2k + 3)); M_esquina = −wL²/(4(2k + 3)); M_centro = wL²/8 + M_esquina.
- Carga lateral uniforme q en una columna (hacia adentro): X = q·h·(5k + 6)/(8(2k + 3)) (reacción horizontal en la base opuesta); M_esquina cargada = qh²/2 − Xh; M_esquina opuesta = −Xh.
- Desplazamiento por carga P en la cabeza: Δ = Ph³/(6EIc) + Ph²L/(12EIv).

## 6. Limitaciones

- No se implementan F4/F5 (almas no compactas/esbeltas en flexión), E5 como función (se usa en la plantilla de armadura), ángulos dobles 2L, perfiles T, ni el Apéndice 6 de arriostramiento.
- `MnHSS` para ala esbelta (F7-3) usa una inercia efectiva aproximada sin redistribuir el eje neutro.
- El ancho efectivo de conformados en frío es simplificado (ala con labio tratada con k = 4 si D/w ≤ 0.8); no se evalúa el pandeo distorsional (S100 F4) ni el método de resistencia directa.
- La base AISC proviene de la v15.0 (idéntica a la v16.0 para los perfiles incluidos; la v16 añade perfiles nuevos que no figuran).
- El análisis del pórtico de la nave idealiza el techo como horizontal y concentra la carga de viento de muros para la deriva; para techos de mayor pendiente o pórticos de varios vanos use el bloque de análisis de pórticos.
