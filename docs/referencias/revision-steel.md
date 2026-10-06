# Revisión independiente del módulo «steel» (octubre 2026)

Alcance: `src/norms/steel.js`, `src/norms/steel_shapes.js`, `src/blocks/steel.js`, `src/templates/steel.js`,
`tests/steel.test.mjs`, `docs/referencias/steel.md`. Resultado final: `node tests/steel.test.mjs` → **234 correctas, 0 fallidas**
(antes 160); `node tests/verify.mjs` → las 11 plantillas de acero sin errores y cumpliendo con los datos por defecto
(el único ✘ del verificador global es de otro módulo: «Tiempo-historia modal… (Chopra)»).

## 1. Exactitud de las ecuaciones

Revisadas contra AISC 360-16 (y cambios conocidos de 360-22), AISC DG1, AISI S100-16, ACI 318-19 Cap. 17, NTE E.020/E.030-2018/E.090.

| Tema | Estado encontrado | Acción |
|---|---|---|
| E3 (E3-2/E3-3/E3-4), E7 (E7-2/E7-3, Tabla E7.1, E7-6) | Correctas | — (E.1A 893 kip; E.10 Fcr = 29.1 ksi, Ae = 5.77 in² añadidos) |
| E4 canales (Fex acoplado) | Correcta | Generalizada a WT y 2L (eje y) y E4-2 torsional para I con Lcz (AISC E.8: Fe = 10.5, Fcr = 9.21 ksi, 24.4 kip ✔) |
| E5 ángulos simples | Solo en la plantilla; `PnE3` daba error | Nueva `PnE5`/`compE5` (E5-1 a E5-4, ala corta, E7 con 0.45√(E/Fy)); `PnE3` de un L usa E5 |
| E6 | No existía | 2L con conectores: (Lc/r)m = √((Lc/r)o² + (0.5a/ri)²) si a/ri > 40 |
| F2, F3, F6 | Correctas | — |
| F4/F5 | `MnW` lanzaba error | Implementadas (Rpc, rt, F4-2…F4-14; Rpg, F5-1…F5-9) + `MnPG` para vigas armadas. Validado con cálculo manual (50×16×1×5/16, Fy 50) y continuidad F4 → Mp en λw = λpw |
| F7 | F7-3 con Ie sin desplazar el eje neutro; sin F7.3 ni F7.4 | Se con eje neutro desplazado; alma no compacta F7-6 y esbelta F7-7 (Rpg); PLT F7-10/F7-11 con `Lb` opcional |
| F8 | Correcta | — |
| F9 (WT, 2L) | No existía | `MnT` (F9-2/4/5, F9-6…F9-12, F9-14/15, F9-17…19) |
| G2 | Correcta | — |
| G3 ángulos | Cv2 = 1 fijo | Cv2 con kv = 1.2 y b/t (AISC G.4: 24.3 kip ✔); WT y 2L añadidos |
| G5 tubos | 0.6FyAg/2 | Fcr = máx(G5-2a, G5-2b) ≤ 0.6Fy con Lv opcional |
| H1, J2 (J2-4/J2-5, Tabla J2.4), J3 (Tabla J3.2, J3.3, J3-3a, J3-6a/c), J4-5, J8, J10-2…J10-5, I8-1 | Correctas | — |
| DG1 (m, n, λn′, X, λ, tp) | Correcto; con Pu > φPp el término √(1 − X) daba número complejo y error | `max(1 − X, 0)`: ahora reporta NO CUMPLE sin error |
| Anclajes DG1/ACI 318-19 Cap. 17 | Solo reglas prácticas | Añadidos: futa ≤ 1.9fya, Ase, φNsa (0.75), arrancamiento del grupo con h′ef por 4 bordes (17.6.2.1.2), ANc/ANco, ψed,N, ψc,N = 1, Nb (kc = 10 SI), φ = 0.70 (cond. B), pullout 8·Abrg·f′c (Abrg de tuerca pesada = 0.91 in², DG1 Tabla 3.2 ✔), desprendimiento lateral, corte en acero con grout (0.8). Funciones `AseACI`, `NbACI` |
| AISI ancho efectivo | ρ correcto; ala con labio con k = 4 fijo | `kLabioAISI`/`RIAISI` (Ap. 1 §1.3: S, Ia, RI, n, k) y ds = ρ·d′·RI en la plantilla; límites geométricos del método R (I6.2.1) |
| E.020 viento | Vh = V(h/10)^0.22 ≥ V, ph = 0.005CVh², Tabla 4 (0.8/−0.6/−0.7/−0.6), ±0.3 interior | Correcto. En la nave se separan W1 (succión interior) y W2 (presión interior), aplicados a muros y techo |
| E.030-2018 | R0 = 4 OMF correcto | Confirmado en el PDF oficial (El Peruano, 7-12-2018): SMF 8, IMF 5, OMF 4, SCBF 7, OCBF 4, EBF 8; CT = 35/45; 25 % CV en techos; 0.75R; distorsión 0.010. Se añadió C/R ≥ 0.11. **Bug:** la variable `Cs` coincidía con la unidad «centisegundo» de math.js cuando `Ts` fallaba (V = 0.115 t en silencio); renombrada `Csis` y corregido `Ts = hn/(35 m)·1 s` |

## 2. Base de perfiles

- **Transcripción:** los 1127 perfiles AISC se compararon campo a campo (22 774 valores) con el archivo oficial `aisc-shapes-database-v15.0` → 0 diferencias (kdet/k1 en fracciones excluidos).
- **Error encontrado:** en los 76 **ángulos desiguales** `d` era el ala corta y `b` la larga, pero Ix/ȳ corresponden al ala larga vertical: el dibujo y E5 quedaban incoherentes. Corregido al cargar (d = ala larga).
- **Muestra al azar de 20 perfiles** (W44X335, W33X201, W8X10, S4X9.5, C6X10.5, MC4X13.8, L3X3X1/2, HSS16X12X3/8 [contrastado en web: A 18.7, Ix 702, Zx 104, J 862], HSS6X3X3/8, HSS8X2X1/4, HSS7X5X1/8, HSS4.500X0.188, W12X26…): coinciden con el Manual (v15/v16 iguales en estos casos). Consistencia interna r = √(I/A), Sx = 2Ix/d en toda la base: 0 discrepancias > 2 %.
- **5 europeos vs ArcelorMittal:** IPE200, IPE400, HEB160, HEB300, HEA240 (A, Iy, Wpl,y, It, Iw) coinciden al 0.2 %.
- Limitación vigente: base v15.0 (los perfiles nuevos de v16 no figuran).

## 3. Ejemplos resueltos añadidos a `tests/steel.test.mjs`

AISC Design Examples: E.1A, E.8 (WT7×15), E.10 (HSS12×8×3/16), F.1, G.1A, G.4 (L5×3×¼), H.1A, D.2; propiedades WT6×13 (AISC), 2L4×4×½ (Tabla 1-15); DG1 Tabla 3.2; E5-1/E5-2; F4/F5 manual; F9; AISI §1.3; Kleinlogel a dos aguas frente al modelo matricial; E.030 V = ZUCS·P/R.

## 4. Plantillas

- **st-nave**: rehecha. El pórtico ahora es **a dos aguas** y se resuelve con `frame2d` (peso propio automático, casos CM, CV, W1, W2, CS; 10 combinaciones E.090); la fórmula de Kleinlogel queda como **control** (empuje bajo CM, diferencia 0.04 %). B2 con la rigidez lateral del modelo (A-8-7) y comprobación Δ2/Δ1 ≤ 1.5; deriva por viento con un segundo bloque; deriva sísmica 0.75R en el bloque. Se eliminó la verificación incorrecta «Vsis ≤ 1.3Vw» (no es un requisito) y el sismo pasa a las combinaciones. Se retiró la línea `Pu = max(...)` (1500 px).
- **st-casa** (nueva): vivienda de 2 pisos con losa colaborante (SDI), pórtico X OMF (frame2d con CM, CV, W, CS y torsión accidental), columnas HSS7×7×¼, vigas W8×18, arriostres HSS3×3×¼ en cruz (OCBF), derivas X e Y ≤ 0.010.
- **st-placa-base**: anclajes ACI 318-19 Cap. 17. **st-correas**: k del ala con labio (AISI §1.3) y límites del método R. **st-armadura**: control con `PnE5`.
- Ecuaciones demasiado anchas partidas (Mltb/Mn de F2, H1 de control, Fv de AISI).
- **Datos extremos** (11 plantillas, una mutación cada una): todas terminan sin errores ni NaN y con al menos una verificación NO CUMPLE.

## 5. Visual

`node build.mjs` + capturas de st-nave (geometría a dos aguas, estados de carga W1/W2 con levante y presiones en muros, momentos) y st-casa; `steelsec` dibuja WT y 2L (se movió la etiqueta de separación s que se superponía a la cota).

## 6. Pendiente / recomendaciones

- Base v16.0 completa (descarga bloqueada desde aisc.org).
- AISC 341: relación ancho/espesor de arriostres y conexiones (se citan, no se verifican).
- F10 (ángulo simple en flexión) y Apéndice 6.
