# Módulo «walls» — muros de contención y estructuras de retención

Archivos: `src/norms/walls.js` (funciones), `src/blocks/walls.js` (bloques), `src/templates/walls.js`
(plantillas, prefijo `wa-`), `tests/walls.test.mjs` (validación). El módulo es el **dueño de los
coeficientes de empuje**; capacidad portante, taludes, pilotes y licuación pertenecen a «geotech».

## 1. Convenciones

- Ángulos con unidades (`30 deg`); un número sin unidad se interpreta en radianes (math.js).
- φ fricción del relleno, δ fricción muro–suelo, β talud del relleno sobre la horizontal.
- **θ**: inclinación del trasdós respecto a la vertical, **positiva cuando el relleno apoya sobre el
  trasdós** (muro más ancho en la base), convención de Das. Se verificó con una cuña de prueba
  independiente (tests): θ = +10° da Ka = 0.3769 y θ = −10° da 0.2317 (φ = 30°, δ = 20°).
- El empuje de Coulomb actúa a δ + θ bajo la horizontal; el de Rankine con talud, paralelo al talud (β).
- kh, kv coeficientes sísmicos; kv > 0 hacia arriba; ψ = atan(kh/(1 − kv)).

## 2. Funciones (`defineFns(..., 'Empujes de tierra')`)

| Función | Fórmula / fuente |
|---|---|
| `K0Jaky(φ, OCR=1)` | (1 − sen φ)·OCR^sen φ — Jaky (1944), Mayne y Kulhawy (1982) |
| `K0Talud(φ, β, OCR)` | K0·(1 + sen β) — Kézdi; AASHTO 3.11.5.2 (comentario) |
| `KaRankine(φ, β=0)`, `KpRankine(φ, β=0)` | cos β (cos β ∓ √(cos²β − cos²φ))/(cos β ± √(…)) — Das cap. 7 |
| `zcRankine(c, γ, φ)` | 2c/(γ√Ka) |
| `KaCoulomb(φ, δ, β, θ)` | cos²(φ−θ)/[cos²θ cos(δ+θ)(1+√(sen(φ+δ)sen(φ−β)/(cos(δ+θ)cos(θ−β))))²] — Das ec. 7.26 |
| `KpCoulomb(φ, δ, β, θ)` | cos²(φ+θ)/[cos²θ cos(δ−θ)(1−√(sen(φ+δ)sen(φ+β)/(cos(δ−θ)cos(β−θ))))²] |
| `psiMO(kh, kv)` | ψ = atan(kh/(1−kv)) |
| `MOequil(φ, kh, kv, β)` | φ − β − ψ (≥ 0 para que M-O tenga solución; si es < 0, `KaeMO`/`KpeMO` anulan la raíz como EN 1998-5 Anexo E y la plantilla marca NO CUMPLE) |
| `KaeMO(φ, δ, kh, kv, β, θ)` | cos²(φ−θ−ψ)/[cos ψ cos²θ cos(δ+θ+ψ)(1+√(sen(φ+δ)sen(φ−β−ψ)/(cos(δ+θ+ψ)cos(β−θ))))²]; Pae = ½γH²(1−kv)Kae — Mononobe–Okabe; Kramer (1996); AASHTO A11.3 |
| `KpeMO(φ, δ, kh, kv, β, θ)` | cos²(φ+θ−ψ)/[cos ψ cos²θ cos(δ−θ+ψ)(1−√(sen(φ+δ)sen(φ+β−ψ)/(cos(δ−θ+ψ)cos(β−θ))))²] |
| `DKaeSW(kh)`, `DPaeSW(kh, γ, H)` | ΔKae ≈ ¾kh; ΔPae = ⅜ kh γH² a 0.6H — Seed y Whitman (1970) |
| `khWall(PGA, desplaza=1)` | kh = 0.5·PGA si el muro admite 25–50 mm — AASHTO 11.6.5.2.2 |
| `sigmaHstrip`, `PStrip`, `yStrip` | franja: σh = (2q/π)(β − sen β cos 2α) (Boussinesq ×2, muro rígido); P y altura por integración de Simpson = Jarquio (1981) |
| `sigmaHline`, `PLine`, `sigmaHpoint` | Terzaghi (1954) / NAVFAC DM-7.2: m ≤ 0.4 y m > 0.4 |
| `PwHidro(hw, γw)` | ½γw hw² |
| `FSminE050(sismo)` | 1.50 estático, 1.25 pseudodinámico (volteo y deslizamiento) — **E.050-2018 Art. 39.13.6** |
| `qaSismoE050(qa)` | qa·3.0/2.5 = 1.20 qa — E.050 Art. 21 (FS 3.0 estático, 2.5 sismo) |
| `muBase(φ, k=2/3)` | tan(kφ) — Das cap. 8 |
| `D0Blum(H, γ, Ka, Kp, q)` | ⅙Kpγ D0³ = ⅙Kaγ(H+D0)³ + ½Ka q(H+D0)² (bisección); D = 1.2 D0 |
| `DFreeEarth(H, a, γ, Ka, Kp, q)` | ΣM respecto al anclaje = 0 (apoyo libre) — USS Sheet Piling Manual; Das cap. 9 |
| `KrKaAASHTO(z, tipo)` | Kr/Ka: tiras 1.7→1.2, mallas metálicas 2.5→1.2 a 6 m, geosintéticos 1.0 — AASHTO Fig. 11.10.6.2.1-3 |
| `FstarAASHTO(z, φ, tipo, Cu)` | tiras 1.2 + log Cu (≤ 2) → tan φ a 6 m; geosintéticos 0.67 tan φ — AASHTO 11.10.6.3.2 |
| `alphaAASHTO(tipo)` | α = 1.0 metálicos, 0.8 geomallas, 0.6 geotextiles — Tabla 11.10.6.3.2-1 |

## 3. Bloques

- **`retwall`** — estabilidad externa de muros en voladizo o de gravedad (geometría por figuras:
  rectángulo y triángulos de la pantalla, zapata, dentellón; suelo sobre el talón, sobre el trasdós
  inclinado y cuña del talud). Teoría `rankine` (plano vertical por el extremo del talón, δ = β) o
  `coulomb` (plano talón–corona, θ = atan(Lb/H)). Sismo: Kae M-O, ΔEae a `ysis`·H (0.6 por defecto,
  Seed–Whitman), inercia khW del muro y del suelo incluido, pesos ×(1−kv), pasivo con Kpe.
  Deslizamiento: μΣV + ca·B + fp·Ep (Ep sobre Df + hk). Presiones trapezoidales o triangulares
  (Lc = 3(B/2 − e); si la resultante sale de la base se acota Lc = 0.03B y se marca NO CUMPLE).
  **Nivel freático** opcional `hw` (altura sobre el fondo de la base), `gsat`, `gw`: suelo bajo el N.F. con
  γsat en los pesos y γ' en el empuje (por tramos), empuje hidrostático ½γw·hw² sobre el plano de empuje,
  subpresión triangular ½γw·hw·B a 2B/3 de la punta (sumada al momento de volteo) y, con sismo, agua
  retenida (Matsuzawa et al. 1985; Kramer §11.6): K'ae con k'h = kh·γsat/γ' bajo el N.F. Con sismo se
  verifica además φ − β − ψ ≥ 0. Exporta `Ka Kp Hv Pa Pah SV SMr SMo FSv FSd xr e qmax qmin qtoe qheel Ep` y con
  sismo `Kae Pae DPae FSvs FSds es qmaxs qmins qtoes qheels`. Checks: FS (E.050), |e| ≤ B/6 (estático),
  ≤ B/3 (sismo), qmax ≤ qa y ≤ 1.2qa.
- **`wallrebar`** — Mu(z) en la pantalla: U1 = 1.7(CE + sobrecarga), U2 = 1.7 CE + 1.0 CS (campo `fE2`) (M-O a 0.6z +
  inercia), capacidad φMn del refuerzo colocado, corte teórico de la mitad de barras y prolongación
  max(d, 12db) (E.060 12.10.3), ld (E.060 12.2.2). Exporta `Mub Vub phiMnb Asv hcorte DCpant`.
- **`gabionwall`**, **`msewall`** — dibujos acotados (hiladas, empuje, presiones; refuerzos, superficie
  de Rankine o bilineal 0.3H, D/C por capa).
- **`sheetpile`** — integración numérica de presiones netas, cortantes y momentos de tablestacas en
  voladizo (contrafuerza de Blum en D0) o ancladas (fuerza T). Exporta `Mmaxn zMn Rn|Tn`.

## 4. Plantillas (cat. «Muros de contención», país PE)

| id | contenido |
|---|---|
| `wa-voladizo` | Muro en voladizo H = 5 m, zona 4: estabilidad estática y M-O, pantalla (flexión, cortante, corte de barras), refuerzo horizontal/exterior (E.060 14.3), anclaje con gancho, punta y talón con diagrama de presiones estático y sísmico, temperatura |
| `wa-gravedad` | Concreto ciclópeo H = 4 m: Coulomb + M-O, estabilidad, esfuerzos de tracción/compresión/corte en 2 secciones del cuerpo y en la punta (E.060 Cap. 22, φ = 0.65, Mn = 1.3√f'c S, Vn = 0.35√f'c bh) |
| `wa-contrafuertes` | H = 8 m, zona 3: pantalla en franjas (pL²/12, pL²/16), momento vertical de Huntington 0.03 p hp L, contrafuerte T con acero inclinado, cortante neto, tirantes, talón y punta |
| `wa-sotano` | K0 de Jaky, viga apoyada–empotrada (bloque `beam`) con U1 y U2 (Wood 1973: Δp = PGA·γH), diseño de ambas caras, cortante-fricción con la losa |
| `wa-gaviones` | 4 hiladas (vectores), porosidad, estabilidad estática/sísmica, junta entre hiladas con φ* = 25γg − 10 y σadm = 50γg − 30 (Maccaferri) |
| `wa-mse` | AASHTO 11.10 LRFD con geomallas: externa (deslizamiento, e ≤ L/3, Meyerhof con φb = 0.65, sismo PIR + 50 % PAE) e interna por capa (rotura con RF, arranque con F*, α, C, Le) |
| `wa-tablestaca` | Voladizo en arena, Blum (Kp/1.5, D = 1.2D0), cortante nulo, Mmax, módulo resistente (0.65 fy) con perfiles PZ/AZ |
| `wa-tablestaca-anclada` | Apoyo libre, fuerza de anclaje, Mmax, tirante (0.6fy), viga de reparto (wL²/10), muerto fuera de la cuña activa con FS ≥ 2 |
| `wa-coeficientes` | Comparativo K0, Rankine, Coulomb, M-O, Seed–Whitman con 3 gráficos (`plot`) |

Criterios de carga adoptados (revisados, ver `revision-walls.md`): **E.060 9.2.5** (U = 1.4CM + 1.7CV + 1.7CE;
con peso favorable U = 0.9CM + 1.7CE). La E.060 no combina CE con sismo (9.2.3 solo da U = 1.25(CM+CV) ± CS):
para elementos cuyo esfuerzo proviene del empuje (pantalla, contrafuerte, cuerpo de gravedad, muro de sótano)
se adopta **U = 1.7 CE + 1.0 CS** con 50 % de la sobrecarga, equivalente a ACI 318-19 5.3.8 / ASCE 7-16 2.3.6
(1.6H + 1.0E) y AASHTO Evento Extremo I (1.5EH + 1.0EQ). Para la punta y el talón se mayora la reacción
sísmica completa con 1.25 (su parte sísmica, dominante, queda sobre-mayorada). kh = 0.5·Z·S (AASHTO
11.6.5.2.2 con PGA = Z·S de la E.030), kv = 0. Empuje pasivo frente a la punta y el dentellón: se cuenta
**fp = 0.50** por defecto en las plantillas (AASHTO Tabla 11.5.7-1, φep = 0.50), editable (0 / 0.5 / 1).

## 5. Validación (tests/walls.test.mjs — 104 comprobaciones; revisión independiente en `revision-walls.md`)

- **Das, PoFE 7.ª ed., Ej. 7.6** (M-O): φ = 30°, δ = 15°, kh = 0.2 → Kae = 0.452, Pae = 56.05 kN/m.
- **S. Sağlam (Adnan Menderes Univ.), *Retaining wall problems*** P1 (voladizo: ΣV = 655.5 kN/m, ΣMr = 1855.75,
  ΣMo = 832, FSv = 2.23, FSd = 1.20 → NO CUMPLE) y P2 (Coulomb θ = 15°: Ka = 0.4023, Pa = 157.22 kN/m).
- Nivel freático contra cálculo manual; carga lineal NAVFAC (∫σh = PL); empuje de sobrecarga de Coulomb
  contra cuña; Kpe con ejes rotados; plantillas con datos extremos → NO CUMPLE sin errores.

- Rankine: Ka(30°) = 1/3, Kp = 3; con talud 10° → 0.3495, 20° → 0.4142 (tabla de Das).
- **Coulomb — tabla de Das (θ = 0, α = 0), φ = 30°**: Ka = 0.3333, 0.3189, 0.3085, 0.3014, 0.2973,
  0.2956 para δ = 0…25°; Kp = 3.000, 4.1433, 4.9765, 6.1054 para δ = 0, 10, 15, 20°.
- Coulomb con θ ≠ 0 y β ≠ 0 contra una **cuña de prueba** numérica independiente (error < 0.2 %).
- **Mononobe–Okabe**: kh = 0 ⇒ Coulomb; contra cuña pseudoestática independiente (kh, kv, β, θ);
  equivalencia exacta de Arango (1969) con ejes rotados ψ; Kpe(kh = 0) = Kp.
- Franja: P y altura = fórmulas cerradas de Jarquio (1981) (Das).
- Blum: D0 = H/((Kp/Ka)^⅓ − 1); Mmax numérico del bloque = solución cerrada.
- **Das, *Principios de Ingeniería de Cimentaciones*, Ejemplo 8.1** (muro en voladizo, α = 10°,
  φ1 = 30°, φ2 = 20°, c2 = 40 kPa): H' = 7.158 m, Pa = 161.4 kN/m, ΣV = 470.45 kN/m,
  ΣMR = 1128.98 kN·m/m, ΣMo = 379.25, **FS volteo = 2.98**, Pp = 215 kN/m, **FS deslizamiento = 2.73**,
  e = 0.406 m, q punta = 189.2 kPa, q talón = 45.9 kPa — reproducidos por `retwall` (< 0.5 %).
- Todas las plantillas `wa-*`: sin errores y todas las verificaciones cumplen; un muro con base
  insuficiente (B = 2.2 m) no cumple.

## 6. Fuentes

- RNE NTE E.050 Suelos y Cimentaciones (RM 406-2018-VIVIENDA): Art. 16.2.9, 21, 22, 39.13
  (texto consultado en https://cdn-web.construccion.org/normas/rne2012/rne2006/files/titulo3/02_E/2018_E050_RM-406-2018-VIVIENDA.pdf).
- RNE NTE E.020, E.030 (2018/2026: Z, S), E.060 (9.2, 9.3, 10.5, 11, 12, 14.3, 22).
- AASHTO LRFD Bridge Design Specifications, 3.11, 11.5, 11.6, 11.10, Apéndice A11.
- B. M. Das, *Principios de ingeniería de cimentaciones* (cap. 7, 8, 9); J. E. Bowles, *Foundation
  Analysis and Design* (cap. 11–13); J. Calavera, *Muros de contención y muros de sótano*;
  R. Morales, *Diseño en concreto armado*; T. Harmsen, *Diseño de estructuras de concreto armado*;
  R. Torres Belandria, *Análisis y diseño de muros de contención de concreto armado*;
  S. Kramer, *Geotechnical Earthquake Engineering* (1996); Seed y Whitman (1970); Wood (1973);
  USS Steel Sheet Piling Design Manual; Maccaferri, *Estructuras flexibles en gaviones*; FHWA-NHI-10-024.

## 7. Limitaciones

- Nivel freático solo en `retwall` (no en `wallrebar` ni en las fórmulas de punta/talón de las plantillas, que
  suponen relleno drenado, E.050 39.13.8); agua frente al muro y flujo (subpresión no lineal) no se modelan.
  En tablestacas usar pesos sumergidos y presión neta del agua manualmente.
- `retwall` combina 100 % de ΔEae con 100 % de la inercia (conservador frente a AASHTO 11.6.5.1, que
  permite 100 % PAE + 50 % PIR y 50 % PAE + 100 % PIR). MSE: envolvente de ambas combinaciones.
- MSE: sin verificación sísmica interna (AASHTO 11.10.7.2) ni compuesta; ΔEae a 0.6H.
- Relleno granular sin cohesión (la cohesión solo se considera en el suelo de cimentación).
- La estabilidad global (círculos de falla) y la capacidad portante última corresponden al módulo
  «geotech»; aquí se compara con qa del EMS.
- Muro con contrafuertes: coeficientes aproximados de Huntington; para diseño fino usar placas (FEM).
- MSE: método simplificado de AASHTO con geosintéticos; para refuerzos metálicos usar `KrKaAASHTO`
  y `FstarAASHTO` (tipo 1) y verificar corrosión.
- No se aplica la reducción de momentos de Rowe en tablestacas ancladas (conservador).
