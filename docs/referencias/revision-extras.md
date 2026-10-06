# Revisión independiente del módulo «extras» (supervisor)

Alcance: `src/norms/extras.js`, `src/blocks/extras.js`, `src/templates/extras.js` (12 plantillas `ex-*`),
`tests/extras.test.mjs`, `docs/referencias/extras.md`.

Resultado final: `node tests/run.mjs` todo en verde (extras 154/154, antes 124; engine 863/863; verify 245/245).
`node tools/qa-render.mjs --no-shot mod:extras`: 12 plantillas, 0 errores, 0 avisos. Capturas `--paper` revisadas
(cimentación de máquina con la figura nueva y panel publicitario).

Gravedad: **A** = error que cambia el resultado o deja del lado inseguro; **M** = verificación normativa faltante o
cita equivocada que puede inducir a error; **B** = forma, trazabilidad o robustez.

## 1. Hallazgos y correcciones

| # | Plantilla / archivo | Hallazgo | Grav. | Fuente | Corrección |
|---|---|---|---|---|---|
| 1 | `ex-cim-maquina` | El cabeceo se calculaba alrededor de un eje paralelo a B (fuerza en la dirección L). La fuerza de desbalance de una máquina rotativa gira en el plano **perpendicular al eje**, así que su componente horizontal actúa según B y produce cabeceo alrededor del eje longitudinal, que es la dirección más flexible. Se calculaba el modo más rígido y no el que gobierna. | A | Richart, Hall y Woods (1970); ACI 351.3R | r0ψ = (L·B³/3π)^¼ e Iψ con (B² + hb²)/12; texto, datos y figura (`exMaquina` dibuja ahora el corte transversal, con el eje ⊙) actualizados. |
| 2 | `ex-cim-maquina` | Faltaba la regla de proporción del ACI 351.3R: ancho ≥ 1 a 1.5 veces la altura del eje sobre la base. Con los datos originales (B = 2.0 m frente a hb + hm = 2.3 m) **no cumplía**. | M | ACI 351.3R, reglas prácticas de bloques | `check B >= hb + hm`; B por defecto 2.0 → 2.4 m; nuevos valores de `validacion` (r0z, kz, fz, r0ψ, fψ). |
| 3 | `ex-escalera-2t` | La garganta ℓ/25 se citaba como «E.060 9.6.2, Tabla 9.1». La Tabla 9.1 pide ℓ/20 para losas simplemente apoyadas si **no** se calculan las deflexiones (3.7 m/20 = 18.5 cm > 15 cm), y la deflexión no se calculaba. | M | E.060 9.6.2, Tablas 9.1 y 9.2 | Se rotula ℓ/25 como práctica y se agrega el cálculo de deflexiones con Ie de Branson (Mcr con fr = 2√f'c, Icr transformada, ξ = 2) y `check` ΔLP + ΔL ≤ ℓ/240 (Tabla 9.2). |
| 4 | `ex-escalera-2t` | Faltaban paso ≥ 25 cm y contrapaso ≤ 18 cm. | M | RNE A.010 Art. 29 | Dos `check` nuevos. |
| 5 | `ex-piso-ind` | Pasadores subdimensionados: 5/8" para h ≤ 15 cm y 3/4" para h ≤ 20 cm. La tabla del ACI 302.1R / 360R da 3/4" (5–6 in), 1" (7–8 in), 1 1/4" (9–11 in), con longitudes de 14, 16 y 18 in. | A | ACI 360R-10 6.2; ACI 302.1R Tabla 3.1 | Diámetro y longitud según la tabla. |
| 6 | `ex-piso-ind` | En el punzonamiento de concreto simple se usaba el espesor completo. Para concreto vaciado contra el terreno, h se reduce 50 mm. | M | ACI 318-19 14.5.1.7 | `hp = hl − 5 cm` en bo y en la resistencia (D/C 0.37 → 0.57). |
| 7 | `ex-piso-ind` | Las citas «ACI 360R-10 Cap. 5 / 6 / 7 / 9» no correspondían al índice real: FS en 5.9, cálculo del espesor en 7.2, juntas en 7.4, transferencia en 6.2 y acero por arrastre en 8.3. | B | Índice del ACI 360R-10 (vista previa oficial) | Citas corregidas. |
| 8 | `ex-pav-rigido` | La fuente del ejemplo se atribuía a Garber y Hoel. El ejemplo con k = 72 pci … W18 = 5.1×10⁶ → D = 9.75 in es el **Ej. 12.6 de Huang** (nomograma Fig. 12.17). Además había tolerancias ad hoc (Dreq − 2 mm; 0.95·W18). | B | Huang, *Pavement Analysis and Design*, Ej. 12.6 y 12.7 | Fuente corregida; `check Dd ≥ Dreq` y `W18adm ≥ W18` sin tolerancias (siguen cumpliendo). Prueba nueva término a término del Ej. 12.7 (ZR·So = −0.477; 7.35 log(D+1) = 7.581; último término −0.088). Nota: Huang usa log(ΔPSI/2.7) y obtiene 5.8×10⁶; con 4.5 − 1.5 = 3.0 de la Guía resulta ≈ 5.3×10⁶, cerca de los 5.2×10⁶ del nomograma. |
| 9 | `ex-viga-acople` | `check Vu > Vlim` y `check ℓn/h < 2` marcaban NO CUMPLE en diseños válidos con Vu bajo o ℓn/h entre 2 y 4, donde las diagonales son opcionales. Se citaba 18.10.7.3 en lugar de 18.10.7.2 para la obligatoriedad. | M | ACI 318-19 18.10.7.1–18.10.7.3 | `check ℓn/h < 4` (diagonales permitidas) y párrafo de clasificación obligatorio/opcional. |
| 10 | `ex-viga-acople` | `check Vn,diag ≤ 1.25 Vn,máx` no existe en el ACI y rechazaba diseños válidos. | M | ACI 318-19 18.10.7.4 | Eliminado. |
| 11 | `ex-viga-acople` | El número de ramas solo cumplía con Ash; en el ancho (bc1 = 22 cm, 2 ramas) se violaba la separación ≤ 200 mm entre grapas. | M | ACI 318-19 18.10.7.4(d) | nr = máx(Ash, ⌈bc/20 cm⌉ + 1) y `check` en ambas direcciones (2 → 3 ramas en el ancho). |
| 12 | `ex-diafragma` | Faltaba la transferencia del cortante de la losa al muro. | M | ACI 318-19 12.5.3.7 y 22.9 | Avf = (Vu/lw)/(φ·μ·fy), μ = 1.0, φ = 0.75; dowels #3 adicionales a la malla; límite min(0.2f'c, 5.5 MPa)·Acv. |
| 13 | `ex-diafragma` | La flecha por cortante omitía el factor de forma 1.2 de la sección rectangular. | B | Resistencia de materiales (Timoshenko) | 1.2·wL²/(8GA). |
| 14 | `ex-pase-aereo` | φMn de la torre con **Ast/2** en tracción: con 8 barras repartidas en 4 caras solo hay 3 en la cara traccionada, así que el resultado quedaba del lado inseguro (+33 % de acero). | A | E.060 10.2 (compatibilidad) | Atr = (nbt/4 + 1)·Ab; nbt como lista [4\|8\|12\|16]. |
| 15 | `ex-pase-aereo` | No se consideraba el viento transversal sobre la tubería que llega a la cabeza de la torre (flexión transversal). La inclinación del cable usaba atan(4f/L) aunque hay carga puntual. | M | E.020 / E.060 9.2.2; estática del cable | Mut = 1.25(wh·L/2·ht + qt·ht²/2); interacción biaxial lineal δ(Mul + Mut)/φMn ≤ 1; α = atan(V/H). Se agregó `check Pu < 0.75Pc` y se evitó la división entre cero en δ. |
| 16 | `ex-pase-aereo`, `ex-letrero` | Factores de seguridad citados como «E.050 39.13.6 / Art. 39 / Art. 21», artículos que no existen con ese contenido. La NTE E.020 fija volteo ≥ 1.5 (Art. 21) y deslizamiento ≥ 1.25 (Art. 22). | M | NTE E.020 Art. 21 y 22 | Letrero: deslizamiento ≥ 1.25 (E.020 Art. 22); cámara de anclaje: se mantiene 1.5 como práctica, citando que la E.020 exige 1.25. |
| 17 | `ex-letrero` | La compresión se tomaba «sin pandeo»: el poste en voladizo tiene KL/r ≈ 91, así que φPn bajaba de 0.9Fy·Ag a 0.9·0.658^(Fy/Fe)·Fy·Ag. Fcr de torsión y de cortante se fijaban en 0.6Fy sin comprobar H3-2 y G5-2. Faltaba el cortante y la interacción tracción–cortante de los pernos. No se trataba el anclaje en el concreto (Cap. 17 citado). | M | AISC 360-16 E3, G5, H3-2, J3.6, J3.7; ACI 318-19 17.5.2.1 | Cálculos y `check` agregados (KL/r ≤ 200, Fcr E3, Fcr H3-2a/b, G5-2a/b, frv ≤ φFnv, F'nt J3-3a); refuerzo de anclaje Asar = N/(0.75fy) para la tracción del grupo. Citas a ASCE 7-22 Fig. 29.3-1 caso B (antes «29.3.4»). |
| 18 | `ex-pilote-fuste` | La espiral en la zona de 3D se verificaba solo con 0.12f'c/fyt. La Tabla 18.13.5.7.1 (igual que el IBC 1810.3.9.4.2) exige el refuerzo de 18.7.5.2 a 18.7.5.4 con ρs ≥ ½ de la Tabla 18.10.6.4(g) = ½·máx[0.45(Ag/Ach − 1), 0.12]·f'c/fyt. Con D = 60 cm y recubrimiento de 7.5 cm el término 0.45(Ag/Ach − 1) gobierna (0.00875 > 0.0063 colocada): **la espiral 3/8" @ 10 cm no cumplía**. Fuera de la zona se usaba un «0.06f'c/fyt (18.13.5.6)» sin respaldo. | A | ACI 318-19 Tabla 18.13.5.7.1; IBC 1810.3.9.4.2 | ρs requerida corregida; espiral por defecto #4 (≥ #4 para D > 50 cm); paso ≤ D/4, 6db y 150 mm; fuera de la zona, paso ≤ 12db, D/2 y 300 mm; longitud mínima reforzada máx(L/2, 3 m, 3D). |
| 19 | `ex-encamisado` | `check Pu > φPn0` («la columna existente NO resiste») marcaba NO CUMPLE justamente cuando la columna no necesita reforzamiento. El límite de cortante-fricción omitía 55 kgf/cm²·Ac. El texto atribuía al EC8-3 el uso del f'c existente (el EC8-3 permite el de la camisa). | M | E.060 11.7.5; EN 1998-3 A.4.2.2 | Relación D/C informativa en un párrafo; límite min(0.2f'c, 55 kgf/cm²); texto aclarado (criterio conservador propio). |
| 20 | `src/norms/extras.js` `cFRP440` | El esfuerzo del acero no se acotaba a −fy en compresión (c > d con datos extremos). | B | ACI 440.2R-17 10.2.10 | `fs = máx(−fy, mín(Es·εs, fy))`. |

## 2. Verificado sin cambios (correcto frente a las fuentes)

- **AASHTO 93**: ecuación de diseño, ZR(95 %) = −1.645, inversión por bisección; juntas ≤ 24D (FHWA), pasadores D/8,
  barras de amarre As = b·f·w/fs y t = ½(fs·d/350 psi) + 3 in.
- **Westergaard** (`lrelWest`, `sigIntWest`, `sigBordeWest`, `sigEsqWest`): reproducen los **Ej. 4.1–4.3 de Huang**
  (ℓ = 42.97 in, σc = 186.6 psi, σi = 143.7 psi, σe = 279.4 psi; prueba nueva). La forma de 1948 de σe equivale
  exactamente a 0.803P/h²[4 log(ℓ/a) + 0.666a/ℓ − 0.034] (Ioannides 1985). PCA para pasillos: w = 257.876·s·√(kh/E).
- **Richart–Hall–Woods**: kz, Bz, Dz = 0.425/√Bz, kx, Bx, Dx = 0.2875/√Bx, kψ, Bψ, Dψ = 0.15/[(1 + Bψ)√Bψ].
- **ACI 318-19 18.10.7.4**: Vn = 2Avd·fy·sen α ≤ 0.83√f'c·Acw (2.65√f'c en kgf/cm²), φ = 0.85 (21.2.4.4), Ash de
  la opción (d) y paso ≤ mín(6db, 150 mm).
- **Diafragma**: 0.2SDS·Ie·wpx ≤ Fpx ≤ 0.4SDS·Ie·wpx con SDS ≈ 2.5ZS → 0.5ZUS–ZUS; 12.5.3.3 (0.53√f'c + ρt·fy),
  12.5.3.4 (2.12√f'c), colectores con Ω0 y 0.5f'c (18.12.7.6).
- **GEC-4**: 0.65KaγH², p = Pt/(H − H1/3 − Hn+1/3), áreas tributarias (2/3H1, 23/48Hn+1, R = 3/16Hn+1); longitud libre
  ≥ máx(1.5 m, H/5) más allá de la cuña 45° + φ/2 y ≥ 4.5 m; límites del tendón 0.60/0.70/0.80 fpu.
- **Cable 6×19 IWRC**: la tabla EIPS (1/2" = 13.3 t cortas; 3/4" = 29.4; 1" = 51.7; 1 1/4" = 79.9) coincide con los
  catálogos (p. ej., US Cargo Control: 1" = 103 400 lb).
- **ACI 440.2R-17 Ej. 16.3** (verificado en el texto de la guía): εbi = 0.00061 (k = 0.334, Icr = 2471×10⁶ mm⁴),
  c = 5.17 in, Mnf = 85 kip-ft (114 kN·m), servicio k = 0.343 (kd = 187 mm), fs,s = 40.4 ksi, ff,s = 38 N/mm². Se
  agregaron k, kd, ff,s y Mnf (SI) a las pruebas y k, ksv y ff,s a `validacion`.
- **Matlock–Reese** (cabeza empotrada, pilote largo): M = 0.93HT, y = 0.93HT³/EI; φ = 0.55 (ACI 318-19 13.4.3.2).
- **E.020**: Vh = V(h/10)^0.22, Ph = 0.005·C·Vh², C = 1.5 para anuncios.

## 3. Pruebas nuevas (tests/extras.test.mjs)

Huang Ej. 4.1–4.3 (Westergaard) y Ej. 12.7 (AASHTO 93); deflexión de la escalera y contrapaso/paso fuera de A.010;
cabeceo de la máquina (r0ψ, fψ, Dψ) y regla B ≥ hb + hm; ramas de confinamiento ≤ 200 mm y Vu bajo sin NO CUMPLE en la
viga de acoplamiento; cortante-fricción y flecha del diafragma; α = atan(V/H), Mut y la cara traccionada de la torre;
pandeo del poste, Fcr de torsión y F'nt de los pernos; ρs requerida del pilote y el caso con espiral 3/8" → NO CUMPLE;
valores adicionales del ACI 440.2R-17 Ej. 16.3.

## 4. Limitaciones que siguen (documentadas, no corregidas)

- Pantalla del muro anclado: momento wL²/10 con la mayor separación (simplificación de losa continua; los anclajes
  puntuales generan momentos de franja de columna mayores). Se recomienda un modelo de placa para pantallas delgadas.
- Pase aéreo: FS de cable 3.0 (práctica); la cámara de anclaje no considera el empuje pasivo (conservador).
- Diafragma: fuerza Fpx por equivalencia con ASCE 7 (la E.030-2026 no la define).
- Encamisado: los conectores se dimensionan para Pu − φPn0 (criterio simplificado de transferencia).
