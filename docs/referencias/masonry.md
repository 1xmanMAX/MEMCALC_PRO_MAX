# Módulo «masonry» — referencias, fórmulas y validación

Albañilería (NTE E.070), madera (NTE E.010 / JUNAC), tierra reforzada (NTE E.080) y estructuras
contenedoras de líquidos (ACI 350-06, ACI 350.3-06, PCA). Archivos:

| Archivo | Contenido |
|---|---|
| `src/norms/masonry.js` | Funciones normativas (E.070, E.010, E.080, ACI 350.3, PCA) + solucionadores `shellPCA` (cáscara cilíndrica) y `plateFD` / `tankWall` (placa rectangular por diferencias finitas) |
| `src/blocks/masonry.js` | Bloques `wallplan`, `tanque`, `cilindro`, `tankwall`, `tijeral` |
| `src/templates/masonry.js` | 10 plantillas (`ma-edificio`, `ma-armada`, `ma-cerco`, `ma-adobe`, `ma-vigamadera`, `ma-colmadera`, `ma-tijeral`, `ma-reservorio`, `ma-cisterna`, `ma-elevado`) |
| `tests/masonry.test.mjs` | Validación contra ejemplos resueltos y tablas |

## 1. Fuentes consultadas

1. **NTE E.070 Albañilería** (DS 011-2006-VIVIENDA; texto SENCICO con numeración 1.x–10.x). Se usó la versión
   publicada (https://jjlsac.com/rnc/Albanileria.pdf). Correspondencia de numeración usada en las plantillas
   (numeración del RNE entre paréntesis la del texto SENCICO): Art. 19 (7.1), 20 (7.2), 24 (8.3), 26 (8.5),
   27 (8.6), 28 (8.7), 29 (9.1), 30 (9.2), 31 (9.3).
2. **San Bartolomé, A.**, *Comentarios a la Norma E.070* y «Ejemplo de aplicación de la Norma E.070 en el diseño de
   un edificio de albañilería confinada» (edificio de 4 pisos, PUCP; blog http://blog.pucp.edu.pe/blog/albanileria).
   San Bartolomé, Quiun y Silva, *Diseño y construcción de estructuras sismorresistentes de albañilería*, Fondo
   Editorial PUCP.
3. **NTE E.080 Diseño y construcción con tierra reforzada** (RM 121-2017-VIVIENDA, El Peruano 07/04/2017).
4. **NTE E.010 Madera** (DS 005-2014-VIVIENDA) y **Manual de Diseño para Maderas del Grupo Andino** (JUNAC, 1984).
5. **ACI 350.3-06** *Seismic Design of Liquid-Containing Concrete Structures and Commentary* y **ACI 350-06**.
6. **PCA**, *Circular Concrete Tanks without Prestressing* (IS072) y *Rectangular Concrete Tanks* (IS003);
   ejemplo resuelto «A Design Example for a Circular Concrete Tank — PCA Design Method» (U. de Colorado, CVEN 4830,
   2008), que transcribe los coeficientes de las Tablas A-1, A-2, A-5 y A-12 para H²/Dt = 3 y 0.4.
7. Timoshenko & Woinowsky-Krieger, *Theory of Plates and Shells* (cáscara cilíndrica, §114–117; placas, Cap. 5–6).
8. E.030-2003 Tabla 12 (C1 = 1.3 / 0.9 / 0.6 citado por E.070 Art. 29.6).

## 2. NTE E.070 — fórmulas implementadas

| Función | Fórmula | Referencia |
|---|---|---|
| `fbE070(u)`, `fmE070(u)`, `vmE070(u)` | Tabla 9 (kg/cm²): KK artesanal 55/35/5.1; KK industrial 145/65/8.1; rejilla 215/85/9.2; sílice-cal KK 160/110/9.7, dédalo 145/95/9.7, estándar 145/110/9.2; bloque P 50/74/8.6, 65/85/9.2, 75/95/9.7, 85/120/10.9 | Tabla 9 (5.1.7) |
| `EmE070(fm, mat)` | Em = 500 f'm (arcilla), 600 f'm (sílice-cal), 700 f'm (concreto); Gm = 0.4 Em | Art. 24.7 (8.3.7) |
| `FaE070(fm, h, t)` | Fa = 0.2 f'm [1 − (h/35t)²] ≤ 0.15 f'm (acepta vectores) | Art. 19.1.b |
| `alphaE070(Ve, L, Me)` | α = Ve L/Me, 1/3 ≤ α ≤ 1 | Art. 26.3 |
| `VmE070(vm, α, t, L, Pg, mat)` | Vm = 0.5 v'm α t L + 0.23 Pg (0.35 v'm para sílice-cal) | Art. 26.3 |
| `factE070(Vm1, Ve1)` | 2 ≤ Vm1/Ve1 ≤ 3 | Art. 27 (8.6) |
| `dminE070(Z,U,S,N)` | ΣLt/Ap ≥ ZUSN/56 | Art. 19.2.b |
| `mE070(caso, b/a)` | Tabla 12 (caso 1: 0.0479…0.125; caso 2: 0.060…0.133; caso 3: 0.125; caso 4: 0.5), interpolación lineal y en a/b hacia ∞ | Art. 29.7 |
| `ftE070(tipo)` | f't = 1.5 kg/cm² (simple), 3.0 kg/cm² (armada rellena) | Art. 29.8 |
| `C1E030a(tipo)` | 1.3 (precipitarse fuera / peligro), 0.9 (muros interiores, tanques), 0.6 (cercos, diafragmas) | E.030-2003 Tabla 12 |

Otras expresiones usadas directamente en las plantillas:
- Sismo severo R = 3 y moderado = ½ severo (Art. 23).  Fisuración Ve ≤ 0.55 Vm (Art. 26.2).  ΣVm ≥ VE (Art. 26.4).
- Confinamientos (Art. 27.3, Tabla 11): columna extrema Vc = 1.5 Vm1 Lm/(L(Nc+1)), M = Mu1 − ½Vm1 h, F = M/L,
  T = F − Pc, C = Pc + F; Acf = Vc/(0.2 f'c φ) ≥ 15t, φ = 0.85; Asf = Vc/(fy μ φ), Ast = T/(φ fy),
  As ≥ 0.1 f'c Ac/fy; An = As + (C/φ − As fy)/(0.85 δ f'c), φ = 0.7; s1 = Av fy/(0.3 tn f'c (Ac/An − 1)),
  s2 = Av fy/(0.12 tn f'c), s3 = d/4 ≥ 5 cm, s4 = 10 cm; solera Ts = Vm1 Lm/(2L), As = Ts/(0.9 fy) ≥ 0.1 f'c Acs/fy.
- Armada (Art. 28): Mu = 1.25 Me, Vu = 1.25 Ve; φ = 0.85 − 0.2 Pu/Po (0.65–0.85), Po = 0.1 f'm t L;
  Mn = As fy D + Pu L/2 (D = 0.8L); Vuf1 = 1.25 Vu1 (Mn1/Mu1) ≥ Vm1; vi ≤ 0.10 f'm; Ash = Vuf s/(fy D);
  σu = Pu/A + Mu y/I ≥ 0.3 f'm → confinar bordes.
- Cargas ortogonales (Art. 29–31): w = 0.8 Z U C1 γ e; Ms = m w a²; fm = 6Ms/t² ≤ f't; FS volteo ≥ 2, deslizamiento ≥ 1.5.

### Validación — ejemplo de San Bartolomé (edificio de 4 pisos, muro X1, primer piso)
Datos del ejemplo: f'm = 65, v'm = 8.1 kg/cm², t = 0.13 m, h = 2.40 m, Z = 0.4, U = S = 1, N = 4, f'c = 175.

| Magnitud | San Bartolomé | MemoriaCalc |
|---|---|---|
| Fa = 0.2 f'm [1 − (h/35t)²] | 93.8 t/m² | 93.83 t/m² |
| ZUSN/56 | 0.0286 | 0.02857 |
| Vc (columna extrema, Vm1 = 12.82 t) | 6.41 t | 6.41 t |
| M = Mu1 − ½Vm1 h (Mu1 = 69.81, h = 2.52 m) | 53.66 t·m | 53.66 t·m |
| F = M/L (L = 3.13 m) | 17.14 t | 17.14 t |
| T = F − Pc − Pt (Pc = 7.10, Pt = 3.23) | 6.81 t | 6.81 t |
| C = Pc + F | 24.24 t | 24.24 t |
| As = Asf + Ast (μ = 1.0, φ = 0.85) | 3.70 cm² | 3.70 cm² |
| Solera Ts = Vm1/2, As = Ts/(0.9 fy) | 6.41 t, 1.70 cm² | 6.41 t, 1.70 cm² |
| Estribos 13×20 cm, núcleo 9×16, [] ¼" | 5 cm (s3 = d/4 rige) | 5 cm |

## 3. NTE E.010 Madera / JUNAC

| Grupo | Emin | Eprom | fm | fc∥ | fc⊥ | ft | fv | Ck = 0.7025√(Emin/fc) |
|---|---|---|---|---|---|---|---|---|
| A | 95 000 | 130 000 | 210 | 145 | 40 | 145 | 15 | 17.98 |
| B | 75 000 | 100 000 | 150 | 110 | 28 | 105 | 12 | 18.34 |
| C | 55 000 | 90 000 | 100 | 80 | 15 | 75 | 8 | 18.42 |

(kg/cm², madera con CH ≤ 22 %). Columnas: λ < 10 → Nadm = fc A; 10 ≤ λ ≤ Ck → Nadm = fc A [1 − ⅓(λ/Ck)⁴];
Ck < λ ≤ 50 → Nadm = 0.329 E A/λ²; flexocompresión N/Nadm + km|M|/(Z fm) < 1, km = 1/(1 − 1.5 N/Ncr),
Ncr = π² E I/lef². Vigas: deflexión con 1.8 wD + wL (deformaciones diferidas), L/300 con cielo raso de yeso,
L/250 sin él; corte a una distancia h del apoyo τ = 1.5 V/(bh). Validación: los Ck tabulados por JUNAC (17.98,
18.34, 18.42) y la continuidad Nadm(λ = Ck) = ⅔ fc A entre columna intermedia y larga.

## 4. NTE E.080 (2017)

| Parámetro | Valor | Artículo |
|---|---|---|
| S (Tabla 1) | 1.0 (roca/suelo resistente), 1.4 (intermedio/blando) | 6.8 |
| U y densidad mínima (Tabla 2) | 1.4 / 15 % (educación, salud…), 1.2 / 12 % (comercio, oficinas), 1.0 / 8 % (vivienda) | 6.3 |
| C (Tabla 3) | zona 4: 0.25; 3: 0.20; 2: 0.15; 1: 0.10 | 6.8 |
| H = S U C P | P = peso total con 50 % de CV | 6.8 |
| fo ≥ 1.0 MPa (10.2 kg/cm²) cubos; f'm ≥ 0.6 MPa (6.12) muretes; f't ≥ 0.025 MPa (0.25) | resistencias últimas mínimas | 8.1, 8.4, 8.5 |
| fm = 0.40 f'm; aplastamiento 1.25 fm; vm = 0.40 f't; tracción por flexión 0.14 MPa (1.42 kg/cm²) última | admisibles (FS 2.5; 3 sin ensayos) | 8.4–8.6, 9 |
| Límites: e ≥ 0.40 m; a ≤ L/3; 3e ≤ b ≤ 5e; L + 1.25H ≤ 17.5e; H/e ≤ 6 (8 con IV); L/e ≤ 10 | Fig. 2 | 6.1, 6.6 |
| Pisos: 1 en zonas 3 y 4; hasta 2 en zonas 1 y 2 | | 4.2 |

## 5. ACI 350.3-06 (modelo de Housner)

Circular (r = D/HL): Wi/WL = tanh(0.866r)/(0.866r); Wc/WL = 0.230 r tanh(3.68/r); hi/HL = 0.5 − 0.09375r
(r < 1.333) o 0.375; hc/HL = 1 − [cosh(3.68/r) − 1]/[(3.68/r) sinh(3.68/r)]; h'i/HL = 0.45 (r < 0.75) o
0.866r/(2 tanh 0.866r) − 1/8; h'c/HL = 1 − [cosh(3.68/r) − 2.01]/[(3.68/r) sinh(3.68/r)];
Tc = 2π√(D/(3.68 g tanh(3.68 HL/D))); ωi = Cl √(Ec g/γc)/HL con Cl = 10 Cw √(tw/r) y Cw polinomio de la
Fig. 9.3.4(a); ε = 0.0151r² − 0.1908r + 1.021 ≤ 1. Rectangular (r = L/HL): coeficientes 0.264 y 3.16.
Ci = SDS (Ti ≤ Ts) o SD1/Ti ≤ SDS; Cc = 1.5 SD1/Tc ≤ 1.5 SDS (Tc ≤ 1.6/Ts) o 2.4 SDS/Tc²;
Pw = Ci I ε Ww/Ri, Pr = Ci I Wr/Ri, Pi = Ci I Wi/Ri, Pc = Cc I Wc/Rc; V = √((Pi + Pw + Pr)² + Pc²);
dmax = (D/2) Cc I. Ri = 2.0 (base fija o articulada, sobre el terreno; también pedestal), 3.25 (anclado flexible),
1.5 (no anclado); Rc = 1.0. Distribución vertical (Cap. 5): Piy = (Pi/2)[4HL − 6hi − (6HL − 12hi) y/HL]/HL².

Validación (`tests/masonry.test.mjs`): Wi/WL(D/HL = 3) = 0.3807, Wc/WL = 0.5808, valores de la Fig. 9.3.1;
continuidad de Cc en Tc = 1.6/Ts; hi/HL continuo en D/HL = 1.333.

Con el espectro E.030 se adopta SDS = 2.5 Z S y SD1 = SDS·TP (TS = TP), I = U = 1.5 (reservorios, categoría A).
En el tanque elevado se usa directamente Sa = Z U C S/Ri (impulsiva) y 1.5 Z U C S/Rc (convectiva).

## 6. PCA — tanques circulares (solución exacta de la cáscara)

Las tablas PCA (A-1 … A-12) se obtienen de la ecuación de la cáscara cilíndrica
D w'''' + (E t/R²) w = p con β⁴ = 3(1 − ν²)/(R²t²), (βH)⁴ = 12(1 − ν²)(H²/Dt)². `shellPCA(k, base, carga)` resuelve
la ecuación con borde superior libre y base empotrada o articulada (4 constantes, funciones e^{−βx} y e^{−β(H−x)}
para estabilidad numérica). Con **ν = 0.2** reproduce las tablas:

| H²/Dt = 3, base empotrada | 0.0H | 0.2H | 0.4H | 0.5H | 0.6H | 0.8H | 0.9H |
|---|---|---|---|---|---|---|---|
| PCA Tabla A-1 (tensión) | 0.134 | 0.267 | 0.357 | 0.362 | 0.330 | 0.157 | 0.052 |
| MemoriaCalc | 0.136 | 0.267 | 0.356 | 0.362 | 0.330 | 0.157 | 0.052 |
| PCA Tabla A-2 (momento) | — | 0.0024 | 0.0071 | 0.0090 | 0.0097 | 0.0012 | −0.0119 |
| MemoriaCalc | — | 0.0023 | 0.0071 | 0.0092 | 0.0098 | 0.0012 | −0.0118 |

Momento en la base −0.0333 (PCA) vs −0.0332; cortante en la base 0.262 (Tabla A-12) vs 0.262; base articulada
(Tabla A-5) 0.074 / 0.281 / 0.449 / 0.519 / 0.210 vs 0.078 / 0.281 / 0.453 / 0.518 / 0.209. Para tanques muy bajos
(H²/Dt = 0.4) la diferencia absoluta con la Tabla A-1 es ≤ 0.005 (0.134 / 0.101 / 0.066 vs 0.133 / 0.097 / 0.062).

## 7. Placas rectangulares (PCA *Rectangular Concrete Tanks*)

`plateFD(a, b, bordes, q, ν, nx, ny)` resuelve ∇⁴w = q/D por diferencias finitas (molécula de 13 puntos) con nudos
ficticios: empotrado (w = 0, ∂w/∂n = 0), articulado (w = 0, ∂²w/∂n² = 0) y libre (Mn = 0 y Vn = 0, dos filas de
nudos ficticios). Validación (malla 24 × 24): placa simplemente apoyada cuadrada w = 0.00406 qa⁴/D y M = 0.0478 qa²
(Timoshenko 0.00406, 0.0479); empotrada w = 0.00128 (0.00126), Mc = 0.0230 (0.0231), Mborde = −0.0509 (−0.0513);
tres bordes apoyados y uno libre (E.070 Tabla 12 caso 2): b/a = 0.5 → 0.0601 (0.060), 1.0 → 0.1116 (0.112),
2.0 → 0.1316 (0.132); franja empotrada–libre bajo carga triangular My = −0.166 qH² (−1/6) y empotrada–articulada
−0.066 qH² (−1/15).

## 8. Limitaciones

- La distribución del cortante en `wallplan` supone diafragma rígido y muros en voladizo por entrepiso (o doble
  empotramiento), sin la contribución de alas (Art. 24.6 se puede incluir aumentando t o mediante n) ni acoplamiento;
  Me = Ve·(M1/V1) es conservador para muros acoplados por las losas.
- La torsión se suma sin reducir fuerzas (excentricidad real + 0.05 B). No sustituye un análisis tridimensional.
- `plateFD` usa una malla uniforme (≈ 20 divisiones); los momentos en bordes empotrados tienen errores ~1 %.
  No admite dos bordes libres adyacentes.
- El modelo del tanque elevado usa una masa equivalente del fuste de ¼ de su peso y la rigidez de un voladizo; no
  considera la flexibilidad de la cimentación ni efectos P-Δ. La resistencia del fuste se estima con la fórmula plástica
  de anillo delgado (válida para compresión axial baja).
- El diseño de refuerzo de tanques usa los coeficientes sanitarios del PCA/ACI 350R (1.65 y 1.30); ACI 350-06
  los sustituye por el factor de durabilidad Sd, que puede adoptarse editando las líneas correspondientes.
- No se transcribieron literalmente las tablas PCA de tanques rectangulares: los coeficientes se calculan
  numéricamente para la geometría y bordes del caso.
- En E.080 la verificación de corte usa el área de muros + 20 % (Art. 7.3.1.a.iii) y el peso total del muro; con los
  valores mínimos de la norma (f't = 0.25 kg/cm²) las zonas 3 y 4 exigen densidades altas o ensayos con mayor f't.
