# Módulo «analysis» — análisis estructural

## Bloques

### `frame2d` — Pórtico / armadura 2D (método de rigidez directa)
Formulación de Kassimali (*Matrix Analysis of Structures*, 2.ª ed., caps. 3–7) y McGuire–Gallagher–Ziemian
(*Matrix Structural Analysis*, 2.ª ed., caps. 4–5):

- Elemento de pórtico plano de 6 GDL, `k` local (Kassimali Ec. 6.6), `T` (Ec. 6.19), `K = TᵀkT`.
- Rótulas (`ri`, `rj`, `rij`): condensación estática de los giros liberados en `k` y en las fuerzas de
  empotramiento (equivale a los tipos MT = 1, 2, 3 de Kassimali 7.2). En armaduras todas las barras son
  biarticuladas y los giros de nudos sin rigidez se eliminan automáticamente.
- Fuerzas de empotramiento `−∫Nᵀp dx` con funciones de Hermite (Gauss 3 puntos, exacta para cargas lineales):
  uniformes parciales, trapezoidales, puntuales y momentos, en dirección global, proyectada o local.
- Apoyos: restricciones por GDL, resortes (kx, ky, kθ), desplazamientos impuestos (partición `K_ff u_f = F_f − K_fr u_r`).
  Reacciones `R = K u − F`; se verifica el equilibrio global (fila Σ de la tabla de reacciones).
- Esfuerzos internos por equilibrio (N + tracción, V = dM/dx, M + tracción en la cara −y local); deformada por
  doble integración de M/EI con los desplazamientos nodales como condiciones de borde.
- Casos, combinaciones lineales (`± ` genera dos combinaciones a/b; se valida la linealidad) y envolvente por estación.
- Verificaciones opcionales: deflexión relativa de vigas (L/n) y deriva de entrepiso Δ·f/h (E.030-2018 Art. 31, f = 0.75R).

Sintaxis (m, t por defecto; acepta variables y unidades; expresiones sin espacios o entre paréntesis):
```
Nudos       1 0 0                      id x y
Secciones   V rect bv hv Ec | C circ 0.5 Ec | S 2e7 12.3 cm^2 [I] [w=0.4]
Barras      7 4 5 V [ri|rj|rij]
Apoyos      1,2,3 E | 4 A | 5 Ry | 6 Rx | 7 G | 8 101 | 9 K kx ky kθ
Cargas      CM: U 7,8 wD [a b] [grav|proy|horiz|hproy|perp|axial]
            CV: T 3 0 2 [a b]  ·  P 3 5 2.5  ·  M 3 2 50%  ·  N 4 F1 0 [M]  ·  D 1 0 -0.01
Combinac.   U1 = 1.4 CM + 1.7 CV ; U2 = 1.25(CM + CV) ± CS
Peso propio CM gammac
Grupos      VIG 7-10
```
Exporta `Mmax_k Mpos_k Mneg_k Vmax_k Nmax_k Nt_k Nc_k L_k`, `Mmax Vmax Nmax Nt Nc deltamax`,
`deltax_n deltay_n theta_n`, `Rnx Rny Rnm` y `Rny_U1` por caso/combinación, grupos `Mmax_G Nc_G Lc_G NcL_G…`,
`delta_k`, `deriva_i`, `derivamax`.

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
deltaEEu deltaEAu deltaVu deltaVp MSAu MSAp bloque comp`.

## Plantillas (Análisis estructural)
`an-portico-ca`, `an-armadura`, `an-nave`, `an-voladizo`, `an-influencia`, `an-matricial`, `an-cross`.

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
Elástico lineal de primer orden (sin P-Δ), sin deformación por cortante, sin zonas rígidas, sin apoyos inclinados
ni temperatura; secciones prismáticas; derivas con columnas verticales; deflexión relativa a la cuerda de la barra;
`influence` con EI constante; `cross` sin ladeo.
