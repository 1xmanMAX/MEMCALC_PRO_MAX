# Módulo «geotech» — Geotecnia y cimentaciones (Perú, NTE E.050-2018)

Archivos: `src/norms/geotech.js` (funciones), `src/blocks/geotech.js` (bloques), `src/templates/geotech.js`
(plantillas `ge-*`), `tests/geotech.test.mjs` (validación).

## 1. Norma base: NTE E.050 Suelos y Cimentaciones (RM 406-2018-VIVIENDA)

Texto consultado: separata de *El Peruano*, 3 de diciembre de 2018
(<http://www.ipdu.pe/wp-content/uploads/2024/03/RM-406-2018-VIVIENDA-ANEXO.pdf>). Artículos usados:

| Art. | Contenido aplicado |
|---|---|
| 5.23, 5.26 | Pilote: d/b ≥ 10; cimentación superficial Df/B ≤ 5 |
| 5.27 | N60 = N·CR·CB·CS·CE; (N1)60 = CN·N60; CN = (100 kPa/σ′v)^0.5 |
| 5.28, 5.29 | CRRM = FSM·CRR7.5; CSR = 0.65 (amax/g)(σv/σ′v) rd |
| 15 (B c-1) | Profundidad mínima de exploración p = h + Df + z, z = 1.5B, p ≥ 3 m |
| 17 | Cargas de servicio para el FS; carga E.020 para asentamientos |
| 19, Tabla 8 | Asentamiento tolerable; diferencial = 75 % del total en suelos granulares; α = δ/L (1/150 … 1/750) |
| 20 | qd = sc ic c Nc (φ = 0); qd = iq γ1 Df Nq + 0.5 sγ iγ γ2 B′ Nγ (c = 0); Nq = e^(π tanφ) tan²(45+φ/2), Nc = (Nq−1)cotφ (5.14 si φ = 0), **Nγ = (Nq−1) tan(1.4φ)**; sc = 1 + 0.2B/L; sγ = 1 − 0.2B/L; ic = iq = (1 − α/90)²; iγ = (1 − α/φ)² (ref. Bowles 1996) |
| 21 | FS por corte: 3.0 estático; 2.5 sismo o viento |
| 22 | Presión admisible = menor entre (qd/FS) y la presión que causa el asentamiento admisible |
| 23 | Formas; continua si L > 10B |
| 26 | Df ≥ 0.80 m; platea con viga perimetral h ≥ 0.40 m (0.80 m si el relleno > 0.80 m) |
| 28 | Cargas excéntricas: e = M/Q; B′ = B − 2e; L′ = L − 2e |
| 29 | Cargas inclinadas: se consideran en la ecuación de capacidad |
| 30.3 | FS mínimo de taludes: 1.5 estático; 1.25 sísmico |
| 32.3 | Qu = Qp + ΣQf; FS ≥ 2.0 pilote individual; grupos FS ≥ 3.0 (estático) / 2.5 (dinámico); Tabla 9 espaciamiento 3b/4b/5b; fricción ≥ 1.20 m; zapata equivalente a 2/3 de la longitud para el asentamiento del grupo en arcilla |
| 38 | Licuación: método Seed–Idriss/NCEER (Youd et al. 2001); FS_L = CRR_M/CSR; Tabla 13 (PL), Tabla 13A (FS_L mín.: A 1.25, B 1.15, C 1.00); no cimentar sobre suelos con PL > 10 % |

## 2. Funciones (`defineFns(…, 'Geotecnia')`) — todas aceptan vectores

| Función | Fórmula / fuente | Validación |
|---|---|---|
| `NqBC, NcBC` | Prandtl–Reissner; E.050 Art. 20.4 | Nq(30°) = 18.40, Nc = 30.14 (Das, Tabla 3.3) |
| `NgMeyerhof, NgVesic, NgHansen, NgEC7` | (Nq−1)tan1.4φ; 2(Nq+1)tanφ; 1.5(Nq−1)tanφ; 2(Nq−1)tanφ | Nγ(30°) = 15.67 / 22.40 / 15.07 |
| `NcTerzaghi, NqTerzaghi, NgTerzaghi` | Terzaghi (1943); Nγ de Kumbhojkar (1993) tabulado por Das (interpolación log.) | 37.16 / 22.46 / 19.13 (φ = 30°); **Das Ej. 3.1** qu = 520.8 kN/m², Qadm = 293 kN |
| `scDeBeer, sqDeBeer, sgDeBeer` | De Beer (1970) (Das, Vesic) | — |
| `scMeyerhof, sqMeyerhof, dcMeyerhof, dqMeyerhof` | Meyerhof (1963) con Kp | — |
| `scE050, sgE050` | E.050 Art. 20.4 | — |
| `kHansen, dqHansen, dcHansen` | Hansen (1970): k = Df/B ó atan(Df/B) | prueba con atan(1.5) |
| `icMeyerhof, igMeyerhof` | Meyerhof (1963) = E.050 | (1 − 10/90)² |
| `qWT, gammaWT` | Das, efecto del nivel freático (casos I, II, III) | casos I y II |
| `IzCorner, IzRect, IzCircle, dsig21` | Boussinesq–Newmark; círculo; método 2:1 | I(1,1) = 0.1752; I(2,1) = 0.1999 |
| `F1Stein, F2Stein, IsStein, SeFlex` | Steinbrenner (1934) según Bowles (1987, 1996) | F1(1, ∞) = 0.561 (centro: 1.122) |
| `ScCons, CcSkempton, TvU, UTv` | Terzaghi (NC/SC); Cc = 0.009(LL−10); Tv–U (serie exacta y ecuaciones de aproximación) | Tv(50 %) = 0.197; Tv(90 %) = 0.848 |
| `N60SPT, CNLiao, CNSkempton, CRrod` | E.050 Art. 5.27; Liao y Whitman (1986) ≤ 1.7; Youd et al. (2001) Tabla 2 | — |
| `phiPeck, phiHatanaka, phiKulhawy, DrSPT` | Peck-Hanson-Thornburn (Wolff 1989); Hatanaka-Uchida (1996); Kulhawy-Mayne (1990); Idriss-Boulanger (2008) | — |
| `cuSPT, cuHara, EsSPT, EsBowles` | Stroud (1974); Hara et al. (1974); Kulhawy-Mayne (1990); Bowles (1996) | — |
| `qaSPT` | Meyerhof (1965) modificada (Das, cap. 5): 19.16 N60 Fd (Se/25) (B ≤ 1.22 m); 11.98 N60 ((3.28B+1)/3.28B)² Fd (Se/25) | — |
| `ksVesic, ksBowles, ksEs, ksTerzaghi` | Vesic (1961); Bowles (≈ 40·FS·qa); Es/(B(1−μ²)); Terzaghi (1955) | — |
| `NqMeyerhof, qlMeyerhof` | Nq* (Das, Tabla 11.5); ql = 0.5 pa Nq* tanφ | **Das Ej. 11.1**: Qp ≈ 1014 kN (Das usa pa = 100 kPa; aquí 101.3) |
| `NsVesic, NcVesic` | Vesic (1977), expansión de cavidades | Nc*(0, Irr = 50) = 9.12 |
| `alphaAPI, betaBurland, betaFHWA, qpFHWA` | API RP2A (1987); Burland (1973); O'Neill y Reese (1999, FHWA-IF-99-025) | — |
| `qpMeyerhofSPT, fsMeyerhofSPT` | Meyerhof (1976) | — |
| `etaConverse` | Converse–Labarre | 4×3, D/s = 1/3 → 0.710 |
| `rdYoud, rdIB, CSRSeed` | Youd et al. (2001) ec. 2; Idriss (1999) | rd(5 m) = 0.965 |
| `N160cs, N160csIB` | Idriss–Seed en Youd et al. (2001); Idriss–Boulanger (2008) | — |
| `CRR75, CRR75IB, MSFYoud, MSFIB, KsigmaIB` | Youd et al. (2001) ec. 4; Idriss–Boulanger (2008) | CRR(15) = 0.160; MSF(6.5) = 1.44 |
| `FSLiq, PLCetin, liqEstado` | E.050 Art. 38.5.8; Cetin et al. (2004) | PL ≈ 50 % sobre su propia curva de PL = 50 % |

Fórmulas de Cetin et al. (2004) y del resto de procedimientos de licuación verificadas contra el
*Settle3 Liquefaction Theory Manual* (Rocscience, 2025).

## 3. Bloques

| Tipo | Descripción | Exporta |
|---|---|---|
| `winkler` | Viga libre–libre sobre resortes de Winkler por **elementos finitos** (viga de Hermite + matriz consistente de cimentación kB·l/420[…]); opción suelo sin tracción (iterativa); o **método rígido** (presión lineal, triangular si e > L/6). Diagramas de q, w, V y M; verificación q ≤ qadm | `qmax qmin wmax wmin Mpos Mneg Vmax` (+sufijo) |
| `soilprofile` | Columna estratigráfica SUCS con tramas, N-SPT (N, N60, (N1)60) y σv, u, σ′v vs. profundidad; tabla de correcciones | vectores `zSPT NSPT N60v N160v svSPT uSPT svpSPT`; `sv_ref u_ref svp_ref N60prom` |
| `slope` | Dovelas: Fellenius y Bishop simplificado, estratos horizontales, NF horizontal recortado por el terreno, sobrecargas, kh seudoestático, búsqueda en malla de centros + optimización del radio + búsqueda por patrones; tabla de dovelas; FS ≥ 1.5/1.25 | `FS FSb FSf xc yc Rc` (+sufijo) |
| `pilegroup` | Planta y elevación de grupo de pilotes con cabezal, perímetro crítico y zapata equivalente a 2/3 L | `npil Lcab Bcab Lg Bg` |
| `liqchart` | CSR, CRR_M y FS_L vs. profundidad con FS mínimo | — |
| `stripfooting` | Sección de cimiento corrido de concreto ciclópeo | — |

Validación de los bloques (`tests/geotech.test.mjs`):

* **Winkler vs. Hetényi (1946)**, viga infinita (L = 40 m, λL ≈ 16) con carga puntual: w0 = Pλ/2k, M0 = P/4λ,
  M mín. = −P/(4λ)e^(−π/2), V = P/2 — errores < 0.5 %.
* **Taylor (1937)**: φ = 0, β = 60°, número de estabilidad m = 0.191 → FS reproducido con error < 1 %.
* **Talud infinito** en arena (c = 0): FS → tanφ/tanβ (< 2 %).
* **Círculo fijo φ = 0**: FS = c R² θ / Σ W x por integración exacta (< 0.3 %); Fellenius = Bishop.

## 4. Plantillas (`pais: 'PE'`)

| id | Contenido |
|---|---|
| `ge-portante` | Ecuación general (Meyerhof/Vesic/Hansen) + expresión E.050; NF; área efectiva; inclinación; qadm por resistencia y por asentamiento (Meyerhof 1965); asentamiento elástico (Steinbrenner) + consolidación; distorsión angular |
| `ge-combinada` | Zapata combinada, método rígido; diagramas V-M (bloque `winkler` rígido); punzonamiento, cortante y flexión E.060 |
| `ge-conectada` | Zapata medianera + viga de conexión (R1 = P1 l/(l − e)); diseño de viga y zapatas |
| `ge-medianera` | Zapata excéntrica aislada sin/con tensor; presión trapezoidal/triangular; punzonamiento de 3 lados |
| `ge-platea` | Platea 3×3, método rígido convencional (ACI 336.2R), presiones en puntos, franja con cargas modificadas, punzonamiento y flexión |
| `ge-winkler` | Viga de cimentación sobre lecho elástico; ks de Vesic/Bowles; servicio y últimas; diseño E.060 |
| `ge-corrido` | Cimiento corrido de concreto ciclópeo (concreto simple, φ = 0.65) |
| `ge-pilote` | Pilote hincado en suelo estratificado: punta Meyerhof (Nq*, ql, SPT), fuste α y β, FS ≥ 2, asentamiento de Vesic |
| `ge-grupo` | Grupo 3×3 en arcilla: Tabla 9, Converse–Labarre, bloque, FS 3, cargas por pilote, zapata equivalente, cabezal |
| `ge-licuacion` | Licuación por SPT con tabla por profundidad, FS_L, PL de Cetin; gráfico |
| `ge-talud` | Estabilidad estática y seudoestática (Bishop/Fellenius) |
| `ge-spt` | Perfil estratigráfico, correcciones, correlaciones, profundidad de exploración |

## 5. Referencias

* NTE E.050 Suelos y Cimentaciones (2018), RM 406-2018-VIVIENDA, *El Peruano*.
* Das, B. M. *Principios de ingeniería de cimentaciones*, 7.ª ed., Cengage (caps. 2, 3, 5, 6, 11, 15).
* Bowles, J. E. (1996). *Foundation Analysis and Design*, 5th ed., McGraw-Hill (caps. 4, 5, 9, 10).
* Coduto, D. P. (2001). *Foundation Design: Principles and Practices*, Prentice Hall.
* Terzaghi, K., Peck, R. B. y Mesri, G. (1996). *Soil Mechanics in Engineering Practice*, Wiley.
* Meyerhof, G. G. (1963, 1965, 1976); Hansen, J. B. (1970); Vesic, A. S. (1961, 1973, 1977); De Beer (1970).
* Hetényi, M. (1946). *Beams on Elastic Foundation*, Univ. of Michigan Press.
* Taylor, D. W. (1937). Stability of earth slopes. *J. Boston Soc. Civil Eng.*; Bishop, A. W. (1955). *Géotechnique* 5(1).
* Duncan, J. M. y Wright, S. G. (2005). *Soil Strength and Slope Stability*, Wiley.
* O'Neill, M. W. y Reese, L. C. (1999). *Drilled Shafts*, FHWA-IF-99-025. API RP2A (1987).
* Youd, T. L. et al. (2001). Liquefaction resistance of soils (NCEER/NSF). *J. Geotech. Geoenviron. Eng.* 127(10).
* Idriss, I. M. y Boulanger, R. W. (2008). *Soil Liquefaction During Earthquakes*, EERI MNO-12.
* Cetin, K. O. et al. (2004). SPT-based probabilistic and deterministic assessment of seismic soil liquefaction potential. *JGGE* 130(12).
* Kulhawy, F. H. y Mayne, P. W. (1990). *Manual on Estimating Soil Properties for Foundation Design*, EPRI EL-6800.
* Rocscience (2025). *Settle3 Liquefaction Theory Manual* (verificación de las fórmulas de licuación).
* Morales, R. *Diseño en concreto armado*, ICG (zapatas conectadas y medianeras).

## 6. Limitaciones

* Bearing capacity: el factor de profundidad de Fox (If) no se aplica en el asentamiento elástico (If = 1, conservador).
* `qWT/gammaWT` usan los tres casos de Das; no se modela un NF dentro de estratos distintos.
* Taludes: superficies **circulares** solamente; estratos **horizontales**; NF horizontal (recortado por el terreno, sin
  agua libre exterior); el método de Bishop no considera fuerzas entre dovelas horizontales ni refuerzos/anclajes.
  La búsqueda puede hallar mínimos locales: revise la malla.
* Winkler: modelo de resortes independientes (sin acoplamiento lateral del suelo); ks depende del ancho y
  debe calibrarse con el EMS. El método rígido supone presión lineal.
* Licuación: CRR de Youd et al. para (N1)60cs < 30; para ≥ 30 se considera no licuable (CRR = 2). La PL de Cetin et al.
  se calcula con el CSR del método de Youd (Cetin usa su propio rd), lo que es aproximado.
* Pilotes: punta por Meyerhof con Nq* tabulado para 20° ≤ φ ≤ 45°; no se evalúa fricción negativa ni carga lateral.
* Correlaciones SPT: orientativas; deben confirmarse con ensayos de laboratorio del EMS.
