# Módulo «concrete» — referencias y verificación

Archivos: `src/norms/concrete.js`, `src/blocks/concrete.js`, `src/templates/concrete.js`, `tests/concrete.test.mjs`.

## Fuentes normativas consultadas

| Fuente | Uso |
|---|---|
| **NTE E.060 Concreto Armado (2009)**, DS 010-2009-VIVIENDA — texto completo (205 p.), incluido el **Anexo II "Equivalencia de fórmulas en el sistema MKS"**. Copia consultada: <http://hebmerma.com/wp-content/uploads/2020/08/E.060-CONCRETO-ARMADO-1.pdf> | Todas las ecuaciones de las plantillas peruanas (kgf, cm). |
| ACI 318-19 *Building Code Requirements for Structural Concrete* | φ por εt (Tabla 21.2.2), β1 (22.2.2.4.3), ℓd (25.4.2.4), ℓdh (25.4.3.1), Ie de Bischoff (Tabla 24.2.3.5), puntal-tensor (Cap. 23), vigas de gran peralte (9.9), Mpr (18.6.5), Ash de elementos de borde (18.10.6.4). |
| ACI 318-63 (Método 3) / Nilson, *Design of Concrete Structures* | Origen de las Tablas 13.1–13.3 de la E.060 (método de coeficientes). |
| Ottazzi, *Apuntes del curso Concreto Armado 1* (PUCP); Blanco Blasco, *Estructuración y diseño de edificaciones de concreto armado*; Harmsen, *Diseño de estructuras de concreto armado*; Morales, *Diseño en concreto armado* | Convenciones MKS peruanas (0.53√f'c, Es = 2·10⁶ kgf/cm², β1, 0.75ρb), práctica de diseño de placas, losas y aligerados. |
| McCormac & Brown, *Design of Reinforced Concrete*; Wight & MacGregor, *Reinforced Concrete: Mechanics and Design*; Nawy | Bresler, magnificación de momentos, nomogramas de Jackson–Julian, puntal-tensor, deflexiones. |
| PUCP blog, *Principales cambios de la Norma E.060* (Ottazzi, 2009) | Contexto de los cambios 1989 → 2009. |

## Artículos de la E.060 verificados contra el texto de la norma

- **8.5** Ec = 4700√f'c MPa → 15 000√f'c kgf/cm² (Anexo II). **9.6.2.3** fr = 0.62√f'c → 2√f'c; Icr con A's transformado con 2n.
- **9.3.2.2** φ = 0.70 (estribos), 0.75 (espiral); incremento lineal hasta 0.90 cuando φPn disminuye desde min(0.1f'cAg, φPb) hasta cero. En `pmgen` se resuelve la relación implícita φ = 0.9/(1 + (0.9 − φc)Pn/Plím), continua en ambos extremos.
- **9.6.2.5** ξ = 2.0 / 1.4 / 1.2 / 1.0 (5 años / 12 / 6 / 3 meses); λ = ξ/(1+50ρ'). **Tabla 9.2** límites ℓ/180, ℓ/360, ℓ/480, ℓ/240.
- **9.9.3** Z = fs ∛(dc Act) ≤ 26 kN/mm = 26 000 kgf/cm (Anexo II: 1 kN/mm ≈ 1000 kgf/cm).
- **10.3.4/10.3.5** As ≤ 0.75Asb o εt ≥ 0.004. **10.3.6** φPn,máx = 0.80φP0 (0.85 espiral). **10.5.2** As,mín = 0.7√f'c/fy bw d.
- **10.11–10.13** Q = ΣPu·Δo/(Vus·he) con Δo × 0.75R; EI = 0.4EcIg/(1+βd); Cm; δns; M2,mín = Pu(15 mm + 0.03h); δs = 1/(1−Q) ≤ 1.5; lu/r < 35/√(Pu/f'cAg); Q (gravedad) ≤ 0.60.
- **10.18** Bresler 1/Pn = 1/Pnx + 1/Pny − 1/Pon (Pnx con ey = 0) para Pu ≥ 0.1φPon; ec. 10-23 para carga baja.
- **11.6** torsión: umbral φ0.27√f'c Acp²/Pcp, ec. 11-18 con 2.1√f'c, At/s, Aℓ, mínimos 0.2√f'c bw s/fyt ≥ 3.5bw s/fyt, Aℓ,mín = 1.33√f'c Acp/fy − (At/s)Ph, s ≤ Ph/8 y 300 mm.
- **11.7/11.9** ménsulas: av/d ≤ 1, Nuc ≥ 0.2Vu, Vn ≤ min(0.2f'c bw d, 55 bw d), μ = 1.4, Asc ≥ max(Af+An, 2/3Avf+An, 0.04 f'c/fy bd), Ah = 0.5(Asc − An), φ = 0.85.
- **11.10** muros: αc = 0.80 (hm/lm ≤ 1.5) a 0.53 (≥ 2.0), Vn ≤ 2.6√f'c Acw, ρh ≥ 0.0025, ρv (ec. 11-32), s ≤ 3t y 400 mm.
- **11.12** punzonamiento: Vc = mín(0.53(1+2/β), 0.27(αs d/bo + 2), 1.06)√f'c bo d; γv = 1 − γf; Jc de la Fig. 11.12.6.
- **12.2 Tabla 12.1** ℓd = fy ψt ψe λ db/(8.2√f'c) (≤ 3/4") y /(6.6√f'c) (≥ 7/8"), ≥ 300 mm (equivale a 2.6 y 2.1 √f'c en MPa: la E.060 incorpora ψs = 0.8 en las barras pequeñas). Ec. 12-1 con 3.5√f'c. **12.3** ℓdc = máx(0.075fy db/√f'c, 0.0044 fy db) ≥ 200 mm. **12.5** ℓdg = 0.075ψeλ fy db/√f'c ≥ máx(8db, 150 mm). **12.15** clase A = 1.0ℓd, B = 1.3ℓd. **12.16** compresión 0.071 fy db (MPa) → 0.007 fy db en kgf/cm² (el Anexo II reproduce "0,071" por error tipográfico; 0.071/10.197 = 0.00696 ≈ 0.007, +0.5 % del lado seguro).
- **13.7** Método de coeficientes: Ma = Ca wu A², Mb = Cb wu B² con A, B luces libres, m = A/B ∈ [0.5, 1]; M⁻ en bordes discontinuos = M⁺/3; V = wu(A/2 − d)(1 − 0.5m), +15 % con borde continuo opuesto a discontinuo. Tablas 13.1–13.3 transcritas íntegramente; interpolación lineal en m.
  Casos **confirmados con las figuras de la Tabla 13.1 del PDF oficial** (A vertical, B horizontal, borde rayado = continuo): 1 todos discontinuos; 2 todos continuos; 3 bordes cortos continuos; 4 dos bordes adyacentes; 5 bordes largos continuos; 6 un borde largo; 7 un borde corto; 8 tres continuos con un borde largo discontinuo; 9 tres continuos con un borde corto discontinuo. Las 198 celdas de las Tablas 13.1–13.3 se compararon automáticamente con el texto del PDF: 0 diferencias. Revisión: `revision-concrete.md`.
- **21.5** vigas: ln ≥ 4h, bw ≥ 0.25h y 250 mm, ρ ≤ 0.025, M⁺ ≥ M⁻/2, **Mpr = 1.25 Mn** (definición E.060; el ACI usa 1.25fy y φ = 1, se informa como comparación), so ≤ d/4, 8db, 24de, 300 mm, 2h.
- **21.6** columnas: Pu > 0.1f'cAg, ΣMnc ≥ 1.2ΣMnv, ρ 1–6 %, Ash (21-3, 21-4), s ≤ b/3, 6db, 100 mm, hx ≤ 350 mm, Lo ≥ h, hn/6, 500 mm; Vu con Mpr = 1.25Mn sin exceder lo que transmiten las vigas.
- **21.7** nudos: 1.25fy, φ = 0.85, Vn = 5.3/4.0/3.2 √f'c Aj (MKS; 1.7/1.2/1.0 en MPa), hc ≥ 20db.
- **21.9** muros: espesor ≥ hlibre/25 y 150 mm, dos capas si t ≥ 200 mm o Vu > 0.53√f'c Acv, Vu ≥ Vua·Mn/Mua con Mn/Mua ≤ R, φMn ≥ Mcr, elementos de borde si c ≥ lm/(600·δu/hm) (δu/hm ≥ 0.005) o σ > 0.2f'c, extensión máx(c − 0.1lm, c/2), altura máx(lm, Mu/4Vu), estribos s ≤ 10db, dimensión menor, 250 mm; corte por fricción φμ(Nu + Av fy) con Nu = 0.9CM.

ACI 318-19 (plantilla puntal-tensor): φ = 0.75; fce = 0.85βcβs f'c (βs = 1.0 puntal de borde, 0.75 interior con refuerzo de 23.5); nudos βn = 1.0 (CCC), 0.8 (CCT); θ ≥ 25°; ρ ≥ 0.0025 y s ≤ d/5, 300 mm; Vu ≤ φ0.83√f'c bw d.

## Bloque `pmgen` (método de fibras)

- Concreto discretizado en ≈ 2500 fibras rectangulares; las funciones exportadas (`Mn_X`, `phiMn_X`, `c_X`, `Pn_X`) y el D/C resuelven la profundidad c **exactamente** por bisección (sin interpolar entre puntos de la curva); D/C = máx(|Mu|/φMn(Pu), Pu/φPn,máx); fuera del dominio devuelven capacidad 0 (→ NO CUMPLE) en vez de error; bloque de Whitney de profundidad β1c medida perpendicular al eje neutro desde la fibra más comprimida; la fracción de fibra dentro del bloque se integra linealmente (exacto para ejes neutros paralelos a los lados).
- Acero elastoplástico (Es = 2·10⁶ kgf/cm²), εcu = 0.003; se descuenta el concreto desplazado por las barras comprimidas dentro del bloque.
- Momentos respecto del centroide de la sección bruta; P0 = 0.85f'c(Ag − Ast) + fy Ast.
- Biaxial (`dir: XY`): para cada ángulo del eje neutro (cada 5°) se halla por bisección la profundidad c con φPn = Pu y se obtiene el contorno de carga (φMnx, φMny); D/C = |Mu| / radio del contorno en la dirección de Mu.
- Validación (tests): coincide con `blockPM` del núcleo en φPn,máx (0.05 %) y D/C (0.3 %); un punto del diagrama de un muro de 300×25 con núcleos y alma calculado a mano por capas (c = 60 cm) coincide en Mn (0.4 %) y en c (0.5 %); con Muy = 0 el biaxial reproduce el uniaxial; simetría en cuadrantes; Pn(e) devuelve un punto con Mn/Pn = e.

## Validaciones numéricas (tests/concrete.test.mjs, 117 comprobaciones)

As para Mu = 25 t·m en 30×54 (13.59 cm², igual a `verify.mjs`), viga T por equilibrio de ala y alma, doble refuerzo por compatibilidad resuelto a mano, ℓd/ℓdg/ℓdc/empalmes con las fórmulas del Anexo II, ℓd y ℓdh ACI 318-19, Icr rectangular y T, Ie de Branson y Bischoff, ξ, coeficientes de tabla (casos 1, 2, 3, 4, 9) e interpolación, momentos del bloque `slab2way`, k de los nomogramas (0.77 y 1.32 para ψ = 1; 0.5 y 1.0 para ψ → 0), γv y Jc, y resultados clave de las plantillas (αc, c_lím, Vn y Vu de la placa; δns y Q; identidad de Bresler; Vu por capacidad; deflexión por rigidez = 5wL⁴/384EIe; T = Pu/tanθ).

## Validación contra ejemplos publicados (revisión independiente)

- StructurePoint/spColumn, *Interaction Diagram – Tied RC Column (ACI 318-19)*: 5 puntos de control (Mn) con error ≤ 0.15 %, φPn,máx y φMn exactos.
- StructurePoint/spColumn, *Biaxial Bending – Rectangular Column (ACI 318-19)* (Pincheira Ex. 10.20.1): el punto (φPn, φMnx, φMny) de spColumn cae sobre el contorno de `pmgen` (D/C = 0.995).
- StructurePoint, *Role of γf in punching shear*: Jc = 40 131 in⁴, γv = 0.40, vu = 166.7 psi, vc = 253 psi reproducidos con la plantilla `co-punzonamiento`.
- StructurePoint / Wang Ex. 13.17.3: k = 0.959 (ψA = 4.32, base articulada).
- StructurePoint, *Equilibrium Torsion (ACI 318-14)*: Aoh, esfuerzo combinado, At/s, Av/s, Aℓ reproducidos con la plantilla `co-torsion` (φ = 0.75).
- Integración por fibras frente a recorte exacto de polígonos con ejes neutros inclinados: error < 0.04 t.

## Limitaciones

- `pmgen` admite solo secciones formadas por rectángulos (columnas, placas, L, T, I, cajones por rectángulos); no secciones circulares. El D/C uniaxial es a carga axial constante (como `blockPM`); en biaxial es radial a Pu constante.
- Las secciones no simétricas (L, T) se analizan con el eje neutro paralelo al eje global (flexión uniaxial "en X o en Y"); el acoplamiento biaxial solo se considera en `dir: XY`.
- `slab2way` aplica el método de coeficientes solo a paños con 0.5 ≤ A/B ≤ 1 apoyados en vigas o muros (E.060 13.7.1); no reemplaza el método directo ni el pórtico equivalente.
- La amplificación de cortante en placas usa Mn de la curva nominal a Pu (máximo de ambos sentidos); la altura de aplicación se informa pero no se automatiza piso a piso.
- Las deflexiones se calculan para EcIe constante (E.060 9.6.2.4); no incluyen retracción diferencial ni contraflecha.
- La plantilla puntal-tensor modela una viga simétrica con dos cargas (cuatro nudos); otras geometrías requieren adaptar el modelo.
