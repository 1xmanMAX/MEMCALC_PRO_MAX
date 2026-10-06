# Revisión independiente del módulo «bridges» (AASHTO LRFD 9.ª/10.ª ed. · Manual de Puentes MTC 2018)

Alcance: `src/norms/bridges.js`, `src/blocks/bridges.js`, `src/templates/bridges.js`, `tests/bridges.test.mjs`, `docs/referencias/bridges.md`.
Método: lectura línea por línea contra AASHTO LRFD (artículos citados), ejecución de las 9 plantillas con datos por defecto y con
datos extremos, comprobación independiente de `hl93env` y revisión visual (Playwright).
Resultado final: `node tests/bridges.test.mjs` 98/98 correctas; `node tests/verify.mjs`: todas las plantillas de puentes OK.

## 1. Errores corregidos

| # | Archivo / plantilla | Hallazgo | Corrección |
|---|---|---|---|
| 1 | `NpctLRFD` | Zona sísmica 2 devolvía 100 % de N. La Tabla 4.7.4.4-1 exige **150 %** en zonas 2, 3 y 4 (solo la zona 1 usa 75/100 %). | Zona ≥ 2 → 1.5. |
| 2 | `br-estribo` | `EQw` (altura de la resultante de inercias) estaba multiplicada por `kh`, de modo que el momento de vuelco sísmico `Fi·EQw` era `kh` veces menor (8.5 t·m en lugar de 38.5 t·m: −78 %). | Se quita `kh`; prueba `Fi·EQw = kh·ΣWi·yi`. |
| 3 | `br-estribo` | Evento Extremo I con todas las cargas permanentes a γ = 1.0. La Tabla 3.4.1-1 asigna γp a las permanentes en EE I. | Mínimos (0.90/0.65/1.00) para excentricidad y deslizamiento; máximos (1.25/1.50/1.35) para la presión de contacto. E_AE con factor 1.0. |
| 4 | `br-estribo` | Resistencia Ia contaba la reacción de carga viva (1.75·PLL) como **estabilizadora** en excentricidad y deslizamiento. | Se omite la LL estabilizadora (BR se mantiene). |
| 5 | `br-estribo` | Presión en la punta con fórmula trapecial aunque e > B/6. | Distribución triangular `2V/[3(B/2 − e)]` cuando e > B/6. |
| 6 | `br-vigalosa` | Deflexión: `(1+IM)·máx(d1, d2/(1+IM))` dejaba sin IM el 25 % del camión. | `máx[(1+IM)Δcamión, 0.25(1+IM)Δcamión + Δcarril]` (3.6.1.3.2). |
| 7 | `br-vigalosa` | Colisión: TL-5 = 53.4 tonf (= 524 kN, la tabla da 550 kN = 56.1 tonf) y `Lt` fijo en 1.07 m aunque se eligiera otro nivel. | Nuevas funciones `FtLRFD`, `LtLRFD`, `HbminLRFD` (Tabla A13.2-1) y verificación de la altura mínima de la barrera. |
| 8 | `br-vigalosa` | Momento de colisión con DC a γ = 1.0; en Evento Extremo II las permanentes llevan γp. | `Mcol = Mc + 1.25·MDCv`. |
| 9 | `br-vigalosa` | Σx² de la sección rígida escrito para 4 vigas; el modelo de franja tampoco admite otro número. | Σx² = S²·Nb(Nb² − 1)/12 y `check Nb == 4`, `check NL <= 2` (honestidad del modelo). |
| 10 | `br-vigalosa` | Con S o calzada distintos las vigas no cabían → 27 errores en cascada. | Datos de entrada: S, voladizo y Nb; B y calzada se derivan. `check −0.30 ≤ de ≤ 0.91 m`. |
| 11 | `br-pilar` | Evento Extremo I con PD/PW a γ = 1.0 (máx.) y 0.9 PD sin DW (mín.). | γp: 1.25/1.50 y 0.90/0.65. |
| 12 | `br-pilar` | Espaciamiento máximo en la rótula = mín(b/4, 6db, 150 mm) (es ACI 318). AASHTO 5.10.11.4.1e: **mín(b/4, 100 mm)**. | Corregido. |
| 13 | `br-pilar` | Cortante solo longitudinal (FeL), aunque FeT es mayor (pórtico más rígido, T en la meseta). | `VuL = máx(FeL, FeT)/ncol`. |
| 14 | `br-alcantarilla` | Cortante con φ = 0.90; la Tabla 12.5.5-1 da φ = 0.85 para cajones vaciados in situ. Muros sin verificación de flexión; losa inferior sin acero mínimo. | φv = 0.85; checks de muro (cara interior y exterior) y mínimo de la losa inferior. Nota de carril corregida (3.6.1.3.3: luz ≤ 4.6 m → solo ejes). |
| 15 | Todas (losas, estribo, alcantarilla) | `As = …(d − √(d² − 2Mu/…))` produce raíz negativa si Mu supera la capacidad máxima, y `rounddown(…)` podía dar espaciamiento 0 (→ As infinita, D/C no finito). | `√máx(…, 0)`, espaciamiento ≥ 5 cm y verificación de separación libre mínima (5.10.3.1.1). |
| 16 | `hl93env` | Barrido del doble camión de momento negativo cada máx(1 m, L/10) (4.3 m en el ejemplo de 2 × 140 ft). | Paso máx(0.5 m, L/30). |
| 17 | `br-presforzada`, `br-acero` | El dibujo de la sección fallaba si (Nb − 1)·S excedía el ancho fijo. | Ancho dibujado = máx(calzada + barreras, (Nb − 1)S + ala). |

## 2. Mejoras pedidas

- **Versión MTC de la distribución de carga viva.** Todas las funciones de distribución aceptan un último argumento `ver`
  (1 = AASHTO 9.ª ed. en unidades de EE. UU. con conversión exacta; 2 = forma SI del Manual MTC 2018: S/4300, S/2900, Kg/(L ts³) en mm,
  0.36 + S/7600, 0.2 + S/3600 − (S/10700)², e = 0.77 + de/2800, 0.6 + de/3000, palanca con 1800/600 mm). La plantilla viga-losa tiene el dato
  `verDF` (por defecto 2) y un párrafo que explica el origen de la diferencia. En el ejemplo: gM,int 0.6586 (9.ª) vs 0.6581 (MTC); gV,int 0.7354 vs 0.7448.
- **M⁻ de la losa en la sección de diseño** (4.6.2.1.6): el bloque `hl93env` exporta los momentos en las seis caras interiores de las almas
  y la memoria combina DC, DW y LL **concomitantes** en cada cara (Mu⁻ 2.72 t·m/m frente a 4.66 t·m/m en el eje con máximos sumados).
- **Barrera:** Mc y Mw ya no son datos; se calculan con el acero vertical/horizontal de una sección equivalente de espesor medio (Mc = 5.77 t·m/m, Mw·H = 4.35 t·m, Rw = 38.8 t > Ft = 24.5 t).
- **Vp** en la viga presforzada: Vp = Pe·(ybs,ext − ybs,centro)/xh (punto de desvío en 0.4L), usado en εs, en Vn y en vu.
- **Pilar con φ de AASHTO:** nuevo bloque `pmLRFD` (5.6.4.4, φ 0.75 → 0.90 con εcl = fy/Es ≤ 0.002 y εtl = 0.005; Pr,max = 0.80φP0;
  demandas de Evento Extremo con φ = 0.90 de 5.10.11.4.1b en zonas 3–4, 1.0 en zonas 1–2) y exporta `phiMnS(P)`, `phiMnEE(P)`.
  Se añadieron esbeltez/magnificación de momentos (5.6.4.3, 4.5.3.2.2b) y el requisito P–Δ (4.7.4.5: Pu·Δ ≤ 0.25φMn con Rd).
- **Peatonal:** verificación del rango de ancho para el vehículo H5 (Guide Spec 3.2: 7–10 ft; > 10 ft → H10) y nota de barandas
  (13.8.2: 0.73 N/mm en ambas direcciones + 890 N ≈ 91 kgf concentrada; es la «≈ 100 kgf» de la consulta).

## 3. Verificado sin cambios (correcto)

Factores de carga de Resistencia I (1.25/0.90 DC, 1.50/0.65 DW, 1.75 LL), Servicio I, Servicio III (0.80 LL), Servicio II (1.30 LL), Fatiga I (1.75, IM 15 %, camión con 9.0 m);
IM 33/15/75 %; IM enterrado 33(1 − 4.1×10⁻⁴DE); presencia múltiple 1.20/1.00/0.85/0.65; fórmulas de distribución tipo a/e/k (9.ª ed.), esviaje, e, palanca
(FHWA PSC 5.1 reproducido); franjas 660 + 0.55S, 1220 + 0.25S, 1140 + 0.833X; losas 250 + 0.42√(L1W1) y 2100 + 0.12√(L1W1) ≤ W/NL; carga lineal del voladizo
14.6 N/mm (3.6.1.3.4); líneas de fluencia A13.3.1-1/-2 y tracción A13.4.2-1; MCFT β = 4.8/(1 + 750εs), θ = 29 + 3500εs; pérdidas 5.9.3.3 y ΔfpES de C5.9.3.2.3a;
límites de esfuerzos 0.65f′ci, 0.24√f′ci, 0.45/0.60 f′c, 0.19√f′c ≤ 0.6 ksi; fps y c (rectangular/T, α1); Mcr (γ1 1.6, γ2 1.1, γ3 0.67/1.0); viga de acero:
proporciones 6.10.2, Mp de D6.1 (tres casos), Dp ≤ 0.42Dt, Mn de 6.10.7.1.2, 2Dcp/tw, Servicio II 0.95Fy, constructibilidad (Lp, Lr, rt, Fcrw), C de 6.10.9.3.2;
estribo: heq de la Tabla 3.11.6.4-1, KAE de Mononobe–Okabe, interpolación B/3–0.40B de 11.6.5.1, φτ = 0.80, φb = 0.45; sismo: Fpga/Fa/Fv (Tablas 3.10.3.2-1 a -3),
Csm, zonas, R (Tabla 3.10.7.1-1), N (4.7.4.4-1), fuerzas mínimas de conexión 0.15/0.25; neopreno: S, Da, Dr, γa ≤ 3, suma ≤ 5 con 1.75 cíclico, γs ≤ 0.5, estabilidad A/B,
zunchos (servicio y fatiga 165 MPa), G por dureza (Tabla 14.7.6.2-1), anclaje 0.2P; alcantarilla: Fe ≤ 1.15, LLDF 1.15, Hint, γEV 1.30, γEH 1.35, 50 % (3.11.7),
Vc 5.12.7.3; peatonal: 90 psf, L/360, f ≥ 3 Hz o W ≥ 180e^(−0.35f), f_lat ≥ 1.3 Hz, H5 (2 + 8 kip a 14 ft).

## 4. Validación de `hl93env` (pruebas nuevas)

- Viga continua 2 × 140 ft (geometría del ejemplo FHWA de viga de acero) contra un cálculo **independiente** con las líneas de influencia
  cerradas de Müller-Breslau, M_B(a) = −a(L² − a²)/(4L²), y barrido fino de los ejes: M⁺(0.4L) = 3615.8 vs 3614.3 kip·ft (0.04 %);
  M⁻(pilar) con 90 % de dos camiones + 90 % del carril = −3681.6 vs −3686.4 kip·ft (0.13 %, error de interpolación lineal de la malla de 20 elementos por tramo);
  se confirma que el doble camión gobierna en el pilar.
- La Tabla 3-10 del ejemplo FHWA (viga **no prismática**, valores ya distribuidos) no se puede comparar directamente con un análisis de EI constante:
  los cocientes implícitos entre secciones no corresponden a un único factor de distribución; por eso se usó la solución cerrada.
- Viga simple de 100 ft, camión: 1522.3 kip·ft vs 1524.9 kip·ft de la tabla HS20 del Apéndice A de las AASHTO Standard Specifications (0.17 %, por la conversión
  4.30 m ≠ 14 ft y 14.52 t ≠ 32 kip); carril wL²/8 = 800 kip·ft exacto.

## 5. Datos extremos

Se ejecutaron 40 variantes (luces ×2, separación, f′c, nivel TL-5, voladizo, número de torones, f′ci, Fy, tw, H del estribo = 12 m, B = 3 m, qn bajo,
PGA 0.6–0.7, sitio E, columnas de 0.60 m o 30 m de altura, carga viva 1500 kN en el neopreno, relleno de 6 m, luz peatonal de 60 m…).
Tras las correcciones, todas terminan sin errores ni D/C no finitos y, cuando corresponde, con «NO CUMPLE»; 14 de ellas quedaron como prueba permanente.

## 6. Pendientes / limitaciones que se mantienen

- La 10.ª ed. (2024) adopta MASH para barreras (TL-4: 80 kip, Lt 5 ft); se mantiene la Tabla A13.2-1 de la 9.ª ed. con una nota.
- Fatiga de la viga de acero (categorías de detalle), conectores de corte y rigidizadores no se diseñan en `br-acero`.
- La viga-losa mantiene la franja de 4 vigas y la sección rígida de 1–2 carriles (hay verificaciones explícitas que lo advierten).
- Estribo: cortante de la pantalla con β = 2 sin estribos (sería más riguroso el método general con sxe).
- Neopreno: falta la verificación de rotación del Método A (14.7.6.3.5).

## 7. Observaciones fuera del módulo (no modificadas)

- `tests/verify.mjs` reporta fallos intermitentes en plantillas de **madera** (Viga de madera / Tijeral E.010), ajenas a este módulo (otros agentes trabajan en paralelo).
- El bloque general `pm` (`src/blocks.js`) y `pmgen` (`src/blocks/concrete.js`) solo ofrecen φ de E.060/ACI; por eso se creó `pmLRFD` en este módulo.
- La plantilla «Puente losa (AASHTO LRFD)» de `src/templates.js` (núcleo) no se revisó; podría usar `verDF` y las funciones `E1slabLRFD/EmslabLRFD` de este módulo.
