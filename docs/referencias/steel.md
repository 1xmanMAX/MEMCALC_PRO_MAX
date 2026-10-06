# Módulo «steel» — Acero estructural: referencias, fórmulas y validación

Archivos: `src/norms/steel_shapes.js` (base de perfiles, generada), `src/norms/steel.js` (funciones),
`src/blocks/steel.js` (bloques `steelsec`, `basepl`, `boltgroup`, `armadura`), `src/templates/steel.js` (11 plantillas),
`tests/steel.test.mjs` (validación).

## 1. Fuentes

| Fuente | Uso |
|---|---|
| ANSI/AISC 360-16 y 360-22, *Specification for Structural Steel Buildings* | Caps. B4 (clasificación), D, E (E3, E4, E5, E7), F (F1, F2, F3, F6, F7, F8), G (G2, G4, G5), H1, I (I2.1b, I3, I8), J (J2, J3, J4, J8, J10), Apéndices 7 y 8 |
| AISC *Steel Construction Manual* 15.ª/16.ª ed. — **AISC Shapes Database v15.0/v16.0** | Propiedades de W, HP, M, S, C, MC, L, HSS y Pipe (archivo oficial `aisc-shapes-database-v15.0` distribuido en el paquete npm `aisc` 0.1.0; la descarga directa de la v16.0 desde aisc.org estaba bloqueada. Los valores verificados de los ejemplos v16 coinciden) |
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
- **WT** (`"WT6X13"`): T cortada del W padre (W12X26), propiedades calculadas (rectángulos + filetes del W; Iy, Zy, J = ½ del W; Cw = bf³tf³/144 + (d − tf/2)³tw³/36; ȳ, yp, Ix, Zx, Sx (punta del alma), Sxc, r̄o, H). Contrastado con AISC (WT6×13: ȳ 1.242/1.25, Ix 11.63/11.7, Zx 4.19/4.20, H 0.827/0.827).
- **2L** (`"2L4X4X1/2"` separación 3/8 in por defecto, `"2L6X4X1/2X3/4"`, sufijo `LLBB`/`SLBB`): A, Ix, ȳ, Iy con separación, Zy, ry, rz (de un ángulo, para E6), J, r̄o, H (centro de corte en la intersección de las alas salientes). 2L4×4×½: ry = 1.83 in (Tabla 1-15).
- Ángulos L desiguales: el archivo de origen trae `d` = ala corta y `b` = ala larga, pero Ix/ȳ referidos al ala larga vertical; al cargar se ordena **d = ala larga (vertical)**, b2 = ala corta (corrige el dibujo y E5).
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
| `PnE3(perfil, Fy, Lcx, Lcy, E, Lcz, a)` | E3 + E7 (I, C, HSS, tubos, WT, 2L); E4-3 flexo-torsional en canales (eje x de simetría), WT y 2L (eje y); E4-2 torsional en perfiles I si se da Lcz; E6-2b (2L con conectores a, Ki = 0.5); ángulos simples → E5 |
| `PnE5(perfil, Fy, L, tipo, conex, E)`, `LcrE5` | E5-1/E5-2 (tipo "a": individual o alma de armadura plana), E5-3/E5-4 ("b": armadura espacial); ala corta conectada: +4[(bl/bs)² − 1] ≥ 0.95L/rz; E7 con λr = 0.45√(E/Fy) |
| `LpF2`, `LrF2` | F2-5, F2-6 (c = 1; canales c = (ho/2)√(Iy/Cw)) |
| `MnW(perfil, Fy, Lb, Cb, E)` | F2 (fluencia y PLT) + F3 (ala no compacta/esbelta); alma no compacta → **F4** (Rpc, rt, FL = 0.7Fy, F4-2/F4-3/F4-13/F4-14); alma esbelta → **F5** (Rpg, F5-3/F5-4/F5-8/F5-9); WT/2L → F9 |
| `MnPG(d, bf, tf, tw, Fy, Lb, Cb, E)` | Viga armada de planchas doblemente simétrica, F4/F5 |
| `MnT(perfil, Fy, Lb, alma, E)` | F9 (360-16): fluencia F9-2/F9-4/F9-5, PLT F9-6 a F9-12, pandeo local del ala F9-14/F9-15 y del alma F9-17 a F9-19; 2L: pandeo local de alas por F10-6 a F10-8 |
| `MnyW(perfil, Fy, E)` | F6: min(FyZy, 1.6FySy) y F6-2/F6-3 |
| `MnHSS(perfil, Fy, E, Lb, Cb)` | F7: ala F7-2/F7-3 (Se con eje neutro desplazado), alma F7-6 (no compacta) y F7-7 (Rpg), PLT F7-10/F7-11 si se da Lb; F8 tubos redondos |
| `CbF1(Mmax, MA, MB, MC)` | Cb = 12.5Mmax/(2.5Mmax + 3MA + 4MB + 3MC) (F1-1) |
| `Cv1G2`, `Cv2G2`, `VnG2(perfil, Fy, E, Lv)`, `phivG2` | G2-3/G2-4, G2-9 a G2-11, G2-1; φv = 1.0 si h/tw ≤ 2.24√(E/Fy) en laminados (G2.1a); G3 ángulos/WT/2L (kv = 1.2, Cv2); G4 HSS (kv = 5); G5 tubos (Fcr = máx(1.60E/(√(Lv/D)(D/t)^1.25), 0.78E/(D/t)^1.5) ≤ 0.6Fy) |
| `H1(Pr, Pc, Mrx, Mcx, Mry, Mcy)` | H1-1a / H1-1b |
| `FnvJ3`, `FntJ3`, `FntpJ3`, `Abolt`, `dhJ3` | Tabla J3.2 (A307 27/45; Grupo A 54/68/90; Grupo B 68/84/113 ksi), J3-3a, Tabla J3.3 y J3.3M |
| `RnAplast`, `RnDesg` | 2.4dtFu (J3-6a), 1.2lctFu (J3-6c) |
| `RnFilete(w, L, FEXX, θ)` | 0.6FEXX(1 + 0.5sin^1.5θ)·0.707w·L (J2-4, J2-5) |
| `wminJ2`, `wmaxJ2` | Tabla J2.4, J2.2b |
| `RnBloque(Agv, Anv, Ant, Fy, Fu, Ubs)` | J4-5 |
| `UD3(x̄, l)` | U = 1 − x̄/l (Tabla D3.1 caso 2) |
| `RnJ10y`, `RnJ10c` | J10-2/J10-3; J10-4/J10-5a/J10-5b (Qf = 1) |
| `QnI8`, `EcAISC` | I8-1; Ec = wc^1.5√f′c (ksi) |
| `kLabioAISI(w/t, D/w, d/t, f, E)`, `RIAISI` | AISI S100-16 Ap. 1 §1.3: S = 1.28√(E/f), Ia, RI = Is/Ia, n, k = (4.82 − 5D/w)RI^n + 0.43 ≤ 4 |
| `AseACI(da, nt)`, `NbACI(f′c, hef, kc)` | ACI 318-19: Ase = π/4(da − 0.9743/nt)²; Nb = kc√f′c·hef^1.5 (SI, kc = 10 preinstalado) |
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
| `st-nave` | Pórtico biarticulado **a dos aguas** resuelto con el bloque `frame2d` (CM con peso propio, CV, W1/W2 con presión interior ±0.3, CS), combinaciones E.090, B2 con la rigidez del modelo (A-8-7), viga y columnas W, flecha de cumbrera, deriva por viento (2.º bloque) y sísmica | Empuje bajo CM = Kleinlogel a dos aguas H = wL²(3+5m)/(16hN) (diferencia < 0.1 %); K ≈ 2.16; V = ZUCS·P/R |
| `st-casa` | Vivienda de 2 pisos: losa colaborante (SDI), pórtico X OMF con `frame2d` (CM, CV, W, CS con torsión accidental), vigas W, columnas HSS (E3, F7, H1), arriostres HSS en cruz en Y (OCBF), derivas E.030 | V = ZUCS·P/R, fracción de borde 0.295, Fbr = V/(2cos θ) |
| `st-compuesta` | W12×19 + losa colaborante, I3.1a, I8-1 (Rg, Rp), compuesta parcial, ILB | Qn = 7.82 t, φMn = 28.7 t·m (manual) |
| `st-viga-ipe` | IPE300 S275, F2 con Cb, comparación E.090 (X1, X2, FL), G2, J10, flechas | Lp = 1.59 m, Lr = 5.10 m, Cb = 1.30 |

### Fórmulas de Kleinlogel (pórtico biarticulado de viga horizontal), deducidas por el método de las fuerzas

Con k = (Iviga/Icol)(h/L):
- Carga vertical w en la viga: H = wL²/(4h(2k + 3)); M_esquina = −wL²/(4(2k + 3)); M_centro = wL²/8 + M_esquina.
- Carga lateral uniforme q en una columna (hacia adentro): X = q·h·(5k + 6)/(8(2k + 3)) (reacción horizontal en la base opuesta); M_esquina cargada = qh²/2 − Xh; M_esquina opuesta = −Xh.
- Desplazamiento por carga P en la cabeza: Δ = Ph³/(6EIc) + Ph²L/(12EIv).

## 6. Limitaciones

- No se implementa el Apéndice 6 (arriostramiento), F10 completo de ángulos simples en flexión, F11–F13, ni el método directo (DM) de AISI ni el pandeo distorsional (S100 F4).
- `MnHSS` F7-7 (alma esbelta) usa Rpg con Fy (no se reduce el esfuerzo del ala esbelta en ese caso); pocas secciones HSS comerciales lo requieren.
- WT y 2L: propiedades calculadas (no tabuladas); diferencias < 1 % con AISC en los casos contrastados. 2L: Cw ≈ 2Cw del ángulo.
- La nave y la casa amplifican conservadoramente el momento total de la envolvente por B2 y usan P y M máximos de la envolvente como simultáneos.
- Revisión independiente: ver `docs/referencias/revision-steel.md`.
