# Módulo «japan» — referencias normativas

Archivos: `src/norms/japan.js`, `src/blocks/japan.js`, `src/templates/japan.js`, `tests/japan.test.mjs`.
Unidades SI (kN, m, N/mm²). Las explicaciones están en español; los nombres de normas, en inglés o japonés romanizado.

## 1. Normas usadas

| Tema | Documento | Uso en el módulo |
|---|---|---|
| Sismo, primera fase | Building Standard Law (建築基準法), Enforcement Order (施行令) Art. 82, 82-2, 88 | `Ci = Z·Rt·Ai·Co`, deriva ≤ 1/200 |
| Z, Rt, Ai, Tc, T | Notif. MOC n.º 1793 (1980) | `ZBSL`, `TcBSL`, `TBSL`; `RtBSL`, `AiBSL` (engine.js); bloque `aidist` |
| Regularidad (Ruta 2) | Order Art. 82-6 (Rs ≥ 0.6, Re ≤ 0.15); Notif. 1791 (H/B ≤ 4, reforma 2007) | plantilla `jp-bsl-ruta12` |
| Cantidad de muros/columnas de C°A° | Notif. MOC n.º 1791 (1980), Art. 3 | Σ2.5αAw + 0.7αAc ≥ 0.75·Z·W·Ai (Ruta 2-1) |
| Capacidad última (Ruta 3) | Order Art. 82-3; Notif. MOC n.º 1792 (1980, mod. Notif. 596 de 2007) | `DsRC`, `DsS`, `FsN1792`, `FeN1792`, `FesBSL`; bloque `qunqu` |
| Cálculo de límites / espectro | Order Art. 82-5; Notif. MOC n.º 1457 (2000) y n.º 1461 (2000) | `S0N1461`, `GsN1457`, `FhBSL` |
| Viento | Order Art. 87; Notif. MOC n.º 1454 (2000) | `ErBSL`, `GfBSL`, `qBSL`, `kzBSL` |
| Nieve | Order Art. 86; Notif. MOC n.º 1455 (2000) | `mubBSL` |
| Madera (壁量計算) | Order Art. 46 (tablas 1–3); Notif. MOC n.º 1352 (2000, 四分割法); Notif. n.º 1100 (multiplicadores) | `kabeBSL`; bloque `kaberyo` |
| C°A°, esfuerzos admisibles | AIJ *Standard for Structural Calculation of Reinforced Concrete Structures* (2010/2018), arts. 5, 6, 13, 14 y 15 | `fcaAIJ`, `fsaAIJ`, `ftAIJ`, `wftAIJ`, `nAIJ`, `alphaAIJ`, `QaAIJ`, `QasAIJ`, `MaColAIJ` |
| C°A°, resistencia última | Fórmula mínima de Arakawa (coef. 0.053) y de momento último (guía técnica de la BSL, Notif. 594) | `QsuAIJ`, `MuAIJ`, `MucAIJ` |
| Acero | AIJ *Design Standard for Steel Structures*; Notif. MLIT n.º 1024 (2001); Notif. n.º 2464 (valores F) | `ftsAIJ`, `fssAIJ`, `LambdaAIJ`, `fcAIJ`, `fbAIJ`, `CbAIJ` |
| Perfiles y barras | JIS G 3192 (perfiles H), JIS G 3112 (barras SD) | `hHJIS`…`ibHJIS`, `AbJIS` |
| Puentes | JRA *Specifications for Highway Bridges*, Part V Seismic Design (道路橋示方書 V, ed. 2012) | `SJRA1`, `SJRA2I`, `SJRA2II`, `kh0JRA`, `khc0JRA`, `cDJRA`, `czJRA`, `sueloJRA` |

## 2. Fórmulas y tablas implementadas

### 2.1 Sismo BSL
- `T = h(0.02 + 0.01α)`; `Tc` = 0.4 / 0.6 / 0.8 s (suelos 1/2/3); `Z` = 1.0 / 0.9 / 0.8 / 0.7.
- `Ai = 1 + (1/√αi − αi)·2T/(1+3T)`, αi = ΣW sobre el piso / W total.
- `Fs = 1` (Rs ≥ 0.6) o `2 − Rs/0.6`; `Fe = 1.0` (Re ≤ 0.15) → interpolación lineal → `1.5` (Re ≥ 0.30).
  Tabla verificada en el texto oficial de la Notif. 1792, Art. 2 (antes «第二 Fesを算出する方法»).
- **Ds acero** (Notif. 1792 Art. 3, tabla transcrita de Sato, *技術基準による鋼構造の設計*, 2011):

| Columnas/vigas | BA o βu = 0 | BB βu ≤ 0.3 | BB 0.3–0.7 | BB > 0.7 | BC βu ≤ 0.3 | BC 0.3–0.5 | BC > 0.5 |
|---|---|---|---|---|---|---|---|
| FA | 0.25 | 0.25 | 0.30 | 0.35 | 0.30 | 0.35 | 0.40 |
| FB | 0.30 | 0.30 | 0.30 | 0.35 | 0.30 | 0.35 | 0.40 |
| FC | 0.35 | 0.35 | 0.35 | 0.40 | 0.35 | 0.40 | 0.45 |
| FD | 0.40 | 0.40 | 0.45 | 0.50 | 0.40 | 0.45 | 0.50 |

- **Ds concreto armado** (Notif. 1792 Art. 4, pórticos con muros). Tabla oficial transcrita de MEXT, *建築構造設計指針* (2024), tabla 6.1
  (filas: grupo de muros y βu; columnas: grupo de vigas y columnas FA–FD). Con βu = 0 (sin muros): 0.30 / 0.35 / 0.40 / 0.45.
  **No** equivale a «el rango menos dúctil» (p. ej. FA + WC con βu ≤ 0.3 → 0.35; FC + WA con βu > 0.7 → 0.45).

| Muros | βu | FA | FB | FC | FD |
|---|---|---|---|---|---|
| WA | ≤ 0.3 | 0.30 | 0.35 | 0.40 | 0.45 |
| WA | 0.3–0.7 | 0.35 | 0.40 | 0.45 | 0.50 |
| WA | > 0.7 | 0.40 | 0.45 | 0.45 | 0.55 |
| WB | ≤ 0.3 | 0.35 | 0.35 | 0.40 | 0.45 |
| WB | 0.3–0.7 | 0.40 | 0.40 | 0.45 | 0.50 |
| WB | > 0.7 | 0.45 | 0.45 | 0.50 | 0.55 |
| WC | ≤ 0.3 | 0.35 | 0.35 | 0.40 | 0.45 |
| WC | 0.3–0.7 | 0.40 | 0.45 | 0.45 | 0.50 |
| WC | > 0.7 | 0.50 | 0.50 | 0.50 | 0.55 |
| WD | ≤ 0.3 | 0.40 | 0.40 | 0.45 | 0.45 |
| WD | 0.3–0.7 | 0.45 | 0.50 | 0.50 | 0.50 |
| WD | > 0.7 | 0.55 | 0.55 | 0.55 | 0.55 |

- Espectro en la roca de ingeniería (Notif. 1461 / 1457), m/s²: `0.64 + 6T` (T < 0.16), `1.6` (≤ 0.64), `1.024/T`; sismo muy raro ×5.
  Gs simplificado (Notif. 1457 Art. 10): suelo 1 → 1.5 (T < 0.576) / 0.864/T / 1.35 (T ≥ 0.64); suelos 2–3 → 1.5 / 1.5·T/0.64 / gv (2.025; 2.7), Tu = 0.64·gv/1.5. `Fh = 1.5/(1+10h)` (solo en el límite de seguridad).
  Derivas: límite de daño ≤ 1/200; límite de seguridad ≤ 1/75 (Notif. 1457 Art. 6, mod. 2007).

### 2.2 Viento y nieve
- `q = 0.6·Er²·Gf·V0²`, `Er = 1.7(max(H, Zb)/ZG)^α`; (Zb, ZG, α) = I (5, 250, 0.10), II (5, 350, 0.15), III (5, 450, 0.20), IV (10, 550, 0.27);
  Gf (H ≤ 10 / H ≥ 40 m, interpolado): I 2.0/1.8, II 2.2/2.0, III 2.5/2.1, IV 3.1/2.3. `kz = (max(Z, Zb)/H)^(2α)`.
- Nieve `S = ρ·ds·μb`, ρ = 20 N/m²/cm (general) o 30 (nieve intensa), `μb = √cos(1.5β)` (0 si β > 60°).

### 2.3 Concreto armado AIJ
- Concreto: compresión Fc/3 (largo), 2Fc/3 (corto); cortante `min(Fc/30, 0.49 + Fc/100)`, ×1.5 a corto plazo.
- Barras: largo plazo SR235 155; SD295 195; SD345/SD390 215 (195 si D ≥ 29); corto plazo = F. Estribos: 195 (largo), F ≤ 390 (corto).
- n = 15 (Fc ≤ 27), 13 (≤ 36), 11 (≤ 48), 9.
- Flexión de viga `Ma = at·ft·j`, `j = 7d/8`. Cortante (AIJ 2010 art. 15, `α = 4/(M/(Qd)+1)`, vigas 1 ≤ α ≤ 2, columnas 1 ≤ α ≤ 1.5):
  largo plazo `QAL = b·j·α·fs`; control de daño (QL + QE) `QAS = b·j·((2/3)α·fs + 0.5·wft·(pw − 0.002))`;
  seguridad (QL + n·QE) `QA = b·j·(α·fs + 0.5·wft·(pw − 0.002))` (columnas con α = 1); 0.2 % ≤ pw ≤ 1.2 %, wft ≤ 390 N/mm².
- Columna: momento admisible por equilibrio de la sección fisurada con armadura simétrica (barrido del eje neutro; límites fc, ft y n·σc).
- Arakawa (mínima): `Qsu = [0.053·pt^0.23·(Fc+18)/(M/(Qd)+0.12) + 0.85·√(pw·σwy) + 0.1·σ0]·b·j`, pt en %, 1 ≤ M/(Qd) ≤ 3, pw ≤ 1.2 % (la versión «media» usa 0.068).
- `Mu = 0.9·at·σy·d` (viga); `Mu = 0.8·at·σy·D + 0.5·N·D(1 − N/(bDFc))` (columna, 0 ≤ N ≤ 0.4bDFc); `0.8·at·σy·D + 0.4·N·D` en tracción. σy = 1.1·F (SD).
- Diseño de garantía: `Qsu ≥ QL + nm·ΣMu/l0` (vigas, nm = 1.1 por defecto) y `Qsu ≥ nm·ΣMu/h0` (columnas, nm = 1.25 por defecto); valores editables.

### 2.4 Acero AIJ
- `ft = F/1.5`, `fs = F/(1.5√3)`, `Λ = √(π²E/(0.6F))` (E = 205 000 N/mm²; Λ = 120 para F = 235).
- `fc = (1 − 0.4(λ/Λ)²)F/ν`, `ν = 3/2 + (2/3)(λ/Λ)²` (λ ≤ Λ); `fc = 0.277F/(λ/Λ)²` (λ > Λ).
- `fb = máx{[1 − 0.4(lb/i)²/(CΛ²)]·ft ; 89 000/(lb·h/Af)} ≤ ft`, `C = 1.75 + 1.05(M2/M1) + 0.3(M2/M1)² ≤ 2.3`.

### 2.5 JRA 2012 (puentes)
Espectros estándar para análisis dinámico [gal], h = 5 %:

| Suelo | Nivel 1 | Nivel 2 tipo I (2012) | Nivel 2 tipo II |
|---|---|---|---|
| I | 431T^⅓ ≥ 160 (T<0.1); 200; 220/T (T>1.1) | 2580T^⅓ (T<0.16); 1400; 840/T (T>0.6) | 4463T^⅔ (T<0.3); 2000; 1104/T^(5/3) (T>0.7) |
| II | 427T^⅓ ≥ 200 (T<0.2); 250; 325/T (T>1.3) | 2150T^⅓ (T<0.22); 1300; 1170/T (T>0.9) | 3224T^⅔ (T<0.4); 1750; 2371/T^(5/3) (T>1.2) |
| III | 430T^⅓ ≥ 240 (T<0.34); 300; 450/T (T>1.5) | 1720T^⅓ (T<0.34); 1200; 1680/T (T>1.4) | 2381T^⅔ (T<0.5); 1500; 2948/T^(5/3) (T>1.5) |

Método estático: `kh = cz·kh0 ≥ 0.1` con kh0 = 0.431T^⅓ (≥0.16) / 0.20 / 0.213T^(−2/3) (suelo I), 0.427T^⅓ (≥0.20) / 0.25 / 0.298T^(−2/3) (II),
0.430T^⅓ (≥0.24) / 0.30 / 0.393T^(−2/3) (III); `khc = cs·cz·khc0 ≥ 0.4cz`, `cs = 1/√(2μa − 1)`, khc0 tipo I (2012): 2.58T^⅓ / 1.40 / 0.996T^(−2/3) (I),
2.15T^⅓ / 1.30 / 1.21T^(−2/3) (II), 1.72T^⅓ / 1.20 / 1.50T^(−2/3) (III); tipo II: 4.46T^⅔ / 2.00 / 1.24T^(−4/3), 3.22T^⅔ / 1.75 / 2.23T^(−4/3), 2.38T^⅔ / 1.50 / 2.57T^(−4/3).
Tipo I con coeficiente regional cIz (1.2 / 1.0 / 0.8); nivel 1 y tipo II con cz (1.0 / 0.85 / 0.7). `cD = 1.5/(40h+1) + 0.5`; TG = 4ΣHi/Vsi (I < 0.2 s ≤ II < 0.6 s ≤ III).

### 2.6 Madera (Order Art. 46, tabla clásica)
Longitud requerida por sismo [cm/m²]: techo ligero 11 | 29, 15 | 46, 34, 18; techo pesado 15 | 33, 21 | 50, 39, 24 (1, 2 y 3 pisos; 1F, 2F, 3F).
Viento: 50 cm/m² de fachada proyectada (zonas especiales hasta 75). Yonbun-wari: suficiencia de ambas franjas de 1/4 > 1, o relación menor/mayor ≥ 0.5.

## 3. Ejemplos de validación (`tests/japan.test.mjs`)
- Ai de un edificio de 5 pisos con pesos iguales, T = 0.3 s: 1.000, 1.100, 1.218, 1.373, 1.643 (cálculo manual).
- Tablas Ds (RC y acero) y Fe/Fs en puntos de cada tramo.
- Arakawa (mín.): b = 400, j = 560 mm, pt = 0.8 %, pw = 0.4 %, Fc 24, σwy 295, M/(Qd) = 2 → Qsu = 430.3 kN.
- Ejemplos publicados: Gs (denmoku-db 2024, NILIM TN 1084), S0 (NILIM TN 1084), kh0/khc0 JRA 2012 (manual de la Pref. de Miyagi), S_I0 2012 (NILIM 2013), q de viento (kentiku-kouzou.jp), tablas Ds (MEXT 2024, Sato 2011). Detalle en `revision-japan.md`.
- AIJ acero: Λ(235) = 119.8; fc(λ = 100) = 86.3 N/mm² (tabla AIJ ≈ 0.88 tf/cm² para F = 2.4 tf/cm²).
- Viento: H = 10 m, rugosidad III, V0 = 34 m/s → q = 1093 N/m².
- Espectros JRA en mesetas y Notif. 1461 en sus ramas; continuidad de kh0, khc0 y S_I0.
- Plantillas con datos extremos: las verificaciones pasan a NO CUMPLE sin errores ni NaN.

## 4. Fuentes consultadas
- MLIT, texto de la Notificación n.º 1792 (Ds y Fes): https://arc-structure.sakura.ne.jp/law/1792.pdf (copia del sistema de notificaciones del MLIT).
- Sato, K., *技術基準による鋼構造の設計*, Kajima, 2011 (tabla Ds de acero, Notif. 596/2007): http://nishimura-lab.jp/lecture/earthquake/Ds%E5%80%A4.pdf
- Wikipedia (ja), 構造特性係数: https://ja.wikipedia.org/wiki/構造特性係数
- MLIT, Notificación n.º 1791 (criterios de cálculo por rutas): https://www.mlit.go.jp/notice/noticedata/pdf/201703/00006622.pdf
- MLIT, Notificación n.º 1793 (Z, Rt, Ai): https://www.mlit.go.jp/notice/noticedata/pdf/201703/00006623.pdf
- MEXT, *建築構造設計指針・同解説* (2024), tablas 6.1 y 6.2 (Ds): https://www.mext.go.jp/content/20210409-mxt_bousai-100001899_3.pdf
- AIJ, borrador RC 規準 art. 15 (2008, base de la ed. 2010): https://news-sv.aij.or.jp/kouzou/s22/public/080331-0411/15.pdf
- Building Research Institute / BCJ, *The Building Standard Law of Japan* (traducción oficial al inglés) y *2020 Technical Commentary on Structural Provisions*.
- AIJ, *Standard for Structural Calculation of Reinforced Concrete Structures* (2010, 2018) y *Design Standard for Steel Structures — Based on Allowable Stress Concept* (2005).
- JRA, *Specifications for Highway Bridges, Part V Seismic Design* (2002/2012), traducción PWRI.

## 5. Limitaciones conocidas
- Tabla Ds de C°A° oficial (Art. 4); no se implementa la reducción de hasta 0.05 para SRC (Art. 5).
- `FeBSL` de `engine.js` ya interpola entre 0.15 y 0.30 (igual que `FeN1792`).
- Tabla de cantidad de muros previa a la reforma de abril de 2025 (el valor es editable). No se incluyen herrajes (método del valor N, Notif. 1460).
- JRA edición 2012 (H24). La edición 2017 (H29) pasa a estados límite y modifica coeficientes regionales.
- Momento admisible de columna: armadura simétrica, sección rectangular, sin descontar el área de concreto desplazada.
- Acero: fórmula clásica de fb (Notif. 1024); no se implementa la formulación λb de AIJ 2005.
