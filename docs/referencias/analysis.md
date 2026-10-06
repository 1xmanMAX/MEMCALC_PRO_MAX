# Módulo «analysis» — análisis estructural

## Bloques

### `frame2d` — Pórtico / armadura 2D (método de rigidez directa)
Formulación de Kassimali (*Matrix Analysis of Structures*, 2.ª ed., caps. 3–7) y McGuire–Gallagher–Ziemian
(*Matrix Structural Analysis*, 2.ª ed., caps. 4–5):

- Elemento de pórtico plano de 6 GDL, `k` local (Kassimali Ec. 6.6), `T` (Ec. 6.19), `K = TᵀkT`.
- Rótulas (`ri`, `rj`, `rij`): condensación estática de los giros liberados en `k` y en las fuerzas de
  empotramiento (equivale a los tipos MT = 1, 2, 3 de Kassimali 7.2). En armaduras todas las barras son
  biarticuladas y los giros de nudos sin rigidez se eliminan automáticamente.
- Fuerzas de empotramiento `−∫Nᵀp dx` (Gauss 3 puntos, exacta para cargas lineales): uniformes parciales,
  trapezoidales, puntuales y momentos, en dirección global, proyectada o local. Con cortante se usan las funciones
  de forma exactas de la viga de Timoshenko (MEP exactas; verificado contra modelos subdivididos).
- **Deformación por cortante** opcional (campo ν): Φ = 12EI/(G·As·L²), `k` de Przemieniecki/McGuire Ec. 4.34;
  As = 5/6·A (rect), 0.9·A (circ) o `As=`; G = E/2(1+ν) o `G=`.
- **Zonas rígidas** (`zi=`, `zj=` o factor automático × medio peralte de las barras transversales):
  `k_nudo = Hᵀ k_cara H`; las cargas sobre los brazos pasan al nudo por estática; rótulas en la cara; los
  esfuerzos de diseño exportados se toman en las caras.
- **Apoyos inclinados** (`RI α`): rotación de los GDL del nudo `K' = TᵀKT`; reacciones devueltas en ejes globales.
- Apoyos: restricciones por GDL, resortes (kx, ky, kθ), desplazamientos impuestos (partición `K_ff u_f = F_f − K_fr u_r`).
  Reacciones `R = K u − F`; se verifica el equilibrio global ΣFx, ΣFy y ΣM respecto del origen.
- Solución: reordenamiento Cuthill-McKee inverso de los nudos y factorización LDLᵀ en banda (≈ 0.3 s para 210
  barras con 5 combinaciones; 0.7 s con P-Δ y modal). Un pivote nulo identifica el mecanismo: se calcula el vector
  nulo y el mensaje indica qué nudos se desplazan y en qué dirección.
- **P-Δ** (opción): cada combinación se resuelve como caso propio con `K + K_G(N)` (matriz geométrica consistente,
  McGuire Ec. 9.18), iterando sobre N hasta |Δu| ≤ 10⁻⁷·|u|. Dentro de cada barra M(x) = M₀(x) + N·(v(x) − vᵢ)
  (P-δ). Si la carga supera la crítica (pivote negativo o divergencia) se agrega una verificación «NO CUMPLE» y
  se muestran los resultados de 1.er orden. Exporta `ampPD` (99 si alguna combinación es inestable).
- **Análisis modal**: masas concentradas (pesos por nudo o «fuente de masa» `= CM + 0.25 CV` con las cargas
  verticales). Condensación exacta a los GDL con masa vía flexibilidad `F = (K⁻¹)ₘₘ`, problema simétrico
  `M^½FM^½ψ = ψ/ω²` (Jacobi). Periodos, Γ, masas efectivas y formas modales completas `u = K⁻¹Mφω²`.
- Esfuerzos internos por equilibrio (N + tracción, V = dM/dx, M + tracción en la cara −y local); M máx./mín.
  interiores exactos donde V cambia de signo (parábola entre estaciones). Deformada por doble integración exacta
  para M lineal entre estaciones (+ ∫V/GAs con cortante), con los desplazamientos nodales como condiciones de borde.
- Casos, combinaciones lineales (cada `±` duplica: a, b, c, d…; se valida la linealidad) y envolvente por estación.
- Verificaciones opcionales: deflexión relativa de vigas (L/n) y deriva de entrepiso Δ·f/h (E.030-2018 Art. 31, f = 0.75R).

Sintaxis (m, t por defecto; acepta variables y unidades; expresiones sin espacios o entre paréntesis):
```
Nudos       1 0 0                      id x y
Secciones   V rect bv hv Ec | C circ 0.5 Ec | S 2e7 12.3 cm^2 [I] [w=0.4] [As=..] [G=..] [h=..]
Barras      7 4 5 V [ri|rj|rij] [zi=0.3 zj=0.25]
Apoyos      1,2,3 E | 4 A | 5 Ry | 6 Rx | 7 G | 8 101 | 9 K kx ky kθ | 10 RI 30
Cargas      CM: U 7,8 wD [a b] [grav|proy|horiz|hproy|perp|axial]
            CV: T 3 0 2 [a b]  ·  P 3 5 2.5  ·  M 3 2 50%  ·  N 4 F1 0 [M]  ·  D 1 0 -0.01
Combinac.   U1 = 1.4 CM + 1.7 CV ; U2 = 1.25(CM + CV) ± CS ; U3 = 1.2CM + CV ± SX ± 0.3SY (→ U3a…U3d)
Peso propio CM gammac
Grupos      VIG 7-10
P-Δ         [x]           Cortante ν   0.2        Zonas rígidas   0.5
Masas       3-8 25 x   |   = CM + 0.25 CV x       Modos   4
```
Exporta `Mmax_k Mpos_k Mneg_k Vmax_k Nmax_k Nt_k Nc_k L_k`, `Mmax Vmax Nmax Nt Nc deltamax`,
`deltax_n deltay_n theta_n`, `Rnx Rny Rnm` y `Rny_U1` por caso/combinación, grupos `Mmax_G Nc_G Lc_G NcL_G…`,
`delta_k`, `deriva_i`, `derivamax`, `ampPD`, `T1…Tn`, `MPx1… MPy1…`, `SMPx SMPy`.

**Validación** (tests/analysis.test.mjs, 122 pruebas): soluciones clásicas de vigas y pórticos; contraste con
**PyNite 3.2** (pórtico de 3 pisos con rótulas y cargas parciales, pórtico a dos aguas, armadura, viga continua con
resorte y asentamiento; lineal y P-Δ; error < 10⁻⁴); voladizo P-Δ contra la solución exacta de Timoshenko–Gere;
Timoshenko (δ = PL³/3EI + PL/GAs); zonas rígidas contra barras rígidas explícitas; rodillo inclinado; periodos de un
edificio de cortante de 3 pisos (ω² = k/m·[2 − 2cos((2j−1)π/7)]).

### `beamcase`
4 condiciones de apoyo × 5 cargas. Fórmulas AISC Manual Tabla 3-23 y Roark Tabla 8.1; diagramas por rigidez.
La prueba compara 50+ fórmulas con la solución numérica (0.2 %; 0.6 % para coeficientes redondeados 1/185, 1/764, 0.00652).
Nota: wL⁴/768EI es la flecha al centro de la biempotrada con carga triangular; la máxima es ≈ wL⁴/764EI (x ≈ 0.525L).

### `influence`
Carga unitaria móvil resuelta por rigidez (~240 posiciones, equivalente a Müller-Breslau); áreas A⁺/A⁻ y
`Emax = wD·ΣA + wL·A⁺ + P·η⁺` (Hibbeler caps. 6 y 10). Validado: R_B (2 tramos, carga en L/2) = 11/16.

### `cross`
Tabla de Cross completa, rigidez modificada 3EI/L opcional, voladizos extremos y comparación con la solución exacta.

## Funciones (`src/norms/analysis.js`)
`kLatEE kLatEA kRotEE kRotEA kAxial aMuto aMutoBase MEPu MEPuA MEPpi MEPpj MEPti MEPtj MEPdelta deltaSAu deltaSAp
deltaEEu deltaEAu deltaVu deltaVp MSAu MSAp PeEuler B1AISC B2Q TSdof bloque comp`.

## Plantillas (Análisis estructural)
`an-portico-ca`, `an-armadura`, `an-nave` (con P-Δ), `an-voladizo`, `an-influencia`, `an-matricial`, `an-cross`,
`an-modal-pdelta` (pórtico de 4 pisos: modal con fuente de masa, T = 0.85·T₁ para E.030, zonas rígidas, P-Δ,
derivas e índice de estabilidad Q).

## Fuentes
- A. Kassimali, *Matrix Analysis of Structures*, 2.ª ed., Cengage, 2012.
- W. McGuire, R. H. Gallagher, R. D. Ziemian, *Matrix Structural Analysis*, 2.ª ed., Wiley, 2000.
- R. C. Hibbeler, *Análisis estructural*, 8.ª ed., Pearson, 2012.
- Young, Budynas, Sadegh, *Roark's Formulas for Stress and Strain*, 8.ª ed., Tabla 8.1.
- AISC *Steel Construction Manual*, 15.ª ed., Tabla 3-23; AISC 360-16.
- NTE E.020 (viento, Art. 12): https://cdn-web.construccion.org/normas/rne2012/rne2006/files/titulo3/02_E/RNE2006_E_020.pdf
- MEP carga triangular: https://mathalino.com/reviewer/strength-materials/fixed-end-moments-fully-restrained-beam
- H. Cross, Proc. ASCE, 1930.

## Limitaciones
Elástico lineal (P-Δ geométrico opcional; sin no linealidad del material); secciones prismáticas; sin temperatura
ni pretensado; derivas con columnas verticales; deflexión relativa a la cuerda de la barra; masas solo de traslación
(sin inercia rotacional) y sin espectro de respuesta (use los bloques sísmicos); con P-Δ los casos individuales
se muestran en 1.er orden; `influence` con EI constante; `cross` sin ladeo.

## Fuentes adicionales
- R. D. Cook et al., *Concepts and Applications of FEA*, 4.ª ed. (2002) — condensación estática.
- J. S. Przemieniecki, *Theory of Matrix Structural Analysis* (1968) — elemento de Timoshenko.
- S. P. Timoshenko, J. M. Gere, *Theory of Elastic Stability*, 2.ª ed. (1961) §1.11 — viga-columna.
- A. K. Chopra, *Dynamics of Structures*, 4.ª ed. (2012), caps. 9–10, 12 — análisis modal y masa efectiva.
- E. Cuthill, J. McKee (1969) — reducción del ancho de banda.
- PyNiteFEA 3.2 (https://github.com/JWock82/Pynite) — referencia numérica independiente.
