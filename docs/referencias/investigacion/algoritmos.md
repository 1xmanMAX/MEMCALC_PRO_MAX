# Algoritmos de análisis sísmico y estructural implementables en JavaScript puro

Investigación del 2026-10-06, pensada para `src/norms/analysis.js` y `src/blocks/analysis.js` (los bloques `modal`,
`storyforces` y `frame2d`, y los bloques nuevos).

Todo el código se probó en Node 22. Las implementaciones de referencia están en
[`ref/`](ref/LEEME.txt): `alg.mjs` (Newmark lineal y no lineal, Nigam-Jennings, Jacobi generalizado y CQC) y las
pruebas `t1.mjs`–`t5.mjs` (ATC-40, N2, condensación, Rayleigh, P-Delta, superposición modal, SIMQKE, fibras y
casos normativos). Los resultados de §15 y de `videos.md` §12 son los que esas pruebas producen. Ninguno depende de bibliotecas externas: solo `Float64Array` y bucles. Cada
algoritmo trae sus ecuaciones exactas, el pseudocódigo o JS listo para adaptar, los casos de prueba con resultados
conocidos y la fuente.

**Referencias de código abierto revisadas:**
- **OpenSees / OpenSeesPy.** Los integradores `Newmark γ β` y `HHT`, `eigen` (ARPACK/genBand), el comando
  `responseSpectrumAnalysis` (CQC/SRSS por modo) y los materiales `Concrete01` (Kent-Park modificado),
  `Concrete04` (Popovics/Mander), `Steel01` y `Steel02` (Menegotto-Pinto). La guía de ejemplos RotD de OpenSeesPy está
  en `openseespydoc.readthedocs.io/en/latest/src/exampleRotDSpectra.html`. El taller OSW-6ICEES (V. Ozsarac) trae
  SDOF lineal y no lineal, pushover y RSA.
- **eqsig** (`eqsig/sdof.py`). Su `nigam_and_jennings_response` implementa las matrices A y B de Nigam & Jennings
  (1968), Ec. 2.7d y 2.7e. Se leyó el código fuente y la §3 lo reproduce.
- **pyrotd** (A. Kottke). Calcula el espectro **en el dominio de la frecuencia** con la función de transferencia del
  oscilador, interpola en frecuencia para captar la alta frecuencia y calcula RotDnn.
- **PyNite.** FEM 3D elástico, P-Δ de pórticos, modal, pushover de acero, elementos de solo tracción o solo
  compresión, placas DKMQ y reportes PDF.
- **anaStruct.** Pórticos 2D con rótulas, resortes rotacionales, nodos no lineales, no linealidad geométrica y una
  base de datos de perfiles EU/US/UK.
- **handcalcs / efficalc.** Patrón "fórmula simbólica → sustitución → resultado", con los modos
  `params`/`long`/`short`/`symbolic` y la precisión por celda (handcalcs). efficalc añade objetos `Input`,
  `Calculation`, `Comparison` y `Assumption`.
- **Calcpad.** Solvers `$Root`, `$Find`, `$Integral` y `$Sum`, matrices con `eigenvals`/`eigenvecs`, `#for`/`#loop`
  y formularios con `?`.

Fuentes teóricas:
- Chopra, *Dynamics of Structures*: cap. 5, 6, 10–13 y 18.
- Bathe, *Finite Element Procedures*: cap. 9, sobre Jacobi y subespacio.
- Der Kiureghian (1981).
- Nigam & Jennings (1968).
- Fajfar (2000) y EC8-1, Anexo B.
- ATC-40 (1996), §8.2.2.
- FEMA 440 (2005), cap. 5–6.
- ASCE 41-13/17/23, §7.4.3.
- Mander, Priestley & Park (1988).
- Scott, Park & Priestley (1982).
- Gasparini & Vanmarcke (SIMQKE, 1976).

---

## 1. Newmark-β para 1 GDL lineal (Chopra, Tabla 5.4.2)

Ecuación: m·ü + c·u̇ + k·u = p(t). Para un sismo, p = −m·üg.

- **Aceleración promedio:** γ = ½ y β = ¼. Es incondicionalmente estable y no tiene amortiguamiento numérico.
- **Aceleración lineal:** γ = ½ y β = ⅙. Es estable solo si Δt/Tn ≤ 0,551.

```js
function newmarkLinear({ m, c, k, p, dt, gamma = 0.5, beta = 0.25, u0 = 0, v0 = 0 }) {
  const n = p.length, u = new Float64Array(n), v = new Float64Array(n), a = new Float64Array(n);
  u[0] = u0; v[0] = v0; a[0] = (p[0] - c * v0 - k * u0) / m;
  const a1 = m / (beta * dt * dt) + gamma * c / (beta * dt);
  const a2 = m / (beta * dt) + (gamma / beta - 1) * c;
  const a3 = (1 / (2 * beta) - 1) * m + dt * (gamma / (2 * beta) - 1) * c;
  const kh = k + a1;                                   // rigidez efectiva
  for (let i = 0; i < n - 1; i++) {
    const ph = p[i + 1] + a1 * u[i] + a2 * v[i] + a3 * a[i];
    u[i + 1] = ph / kh;
    v[i + 1] = gamma / (beta * dt) * (u[i + 1] - u[i]) + (1 - gamma / beta) * v[i] + dt * (1 - gamma / (2 * beta)) * a[i];
    a[i + 1] = (u[i + 1] - u[i]) / (beta * dt * dt) - v[i] / (beta * dt) - (1 / (2 * beta) - 1) * a[i];
  }
  return { u, v, a };   // a = aceleración relativa; absoluta = a + ag
}
```

**Prueba:** Chopra, ejemplo 5.4 (ver `videos.md` §12.1). Con aceleración promedio debe dar u(0,1) = 0,0437,
u(0,5) = 1,4309 y u(1,0) = −1,1441 in. Con aceleración lineal: 0,0300, 1,4782 y −1,2208.

**Precisión:** para Δt/Tn ≤ 0,1 el error de período es menor al 3 %. En espectros, si T/Δt < 10, se subdivide el
paso interpolando üg linealmente. eqsig avisa con un comentario: "delta_t should be less than period/20".

## 2. Newmark no lineal (Newton-Raphson; Chopra, Tablas 5.7.1 y 5.7.2)

Se resuelve `p̂(i+1) − fS(u) − a1·u = 0` en cada paso, con la rigidez tangente `kT + a1`. El resorte
elastoplástico (o bilineal, con α·k después de la fluencia) guarda su estado: up, que es la deformación plástica, y
la rama en que está.

```js
// dentro del paso i -> i+1 (a1,a2,a3 como en §1, sin el término k)
let uj = u[i]; const ph = p[i+1] + a1*u[i] + a2*v[i] + a3*a[i];
for (let it = 0; it < 50; it++) {
  const { f, kt } = spring.trial(uj);      // fuerza y rigidez tangente de prueba (no se confirman)
  const R = ph - f - a1*uj; if (Math.abs(R) < tol) break;
  uj += R / (kt + a1);
}
spring.commit(uj);  // actualiza up; luego v, a como en §1
```

Para un resorte **bilineal con endurecimiento** (Steel01 o "modelo de Clough simplificado"), el retorno elástico
usa la fuerza de prueba ftr = fS,i + k(uj − ui). Se acota entre las envolventes ±(fy + α·k·(u ∓ uy)).

**Prueba:** `videos.md` §12.2, con fy = 7,5 kip. u(0,7) = 2,0951 in y fS(0,8) = 5,789 kip, ya en descarga.

## 3. Espectro de respuesta a partir de un acelerograma

### 3.1 Método exacto por tramos lineales (Nigam & Jennings 1968 / Chopra §5.2)
Si üg varía linealmente en cada Δt, la recurrencia es exacta e incondicionalmente estable para cualquier Δt/T. Es el
método recomendado. Con m = 1, k = ω², ωD = ω√(1−ζ²) y E = e^(−ζωΔt):

```
A  = E (ζ/√(1-ζ²) sin ωDΔt + cos ωDΔt)            B  = E sin(ωDΔt)/ωD
C  = 1/k { 2ζ/(ωΔt) + E [ ((1-2ζ²)/(ωDΔt) - ζ/√(1-ζ²)) sin ωDΔt - (1 + 2ζ/(ωΔt)) cos ωDΔt ] }
D  = 1/k [ 1 - 2ζ/(ωΔt) + E ( (2ζ²-1)/(ωDΔt) sin ωDΔt + 2ζ/(ωΔt) cos ωDΔt ) ]
A' = -E ω/√(1-ζ²) sin ωDΔt                        B' = E (cos ωDΔt - ζ/√(1-ζ²) sin ωDΔt)
C' = 1/k { -1/Δt + E [ (ω/√(1-ζ²) + ζ/(Δt√(1-ζ²))) sin ωDΔt + cos(ωDΔt)/Δt ] }
D' = 1/(kΔt) [ 1 - E (ζ/√(1-ζ²) sin ωDΔt + cos ωDΔt) ]
u(i+1) = A u + B u̇ + C p(i) + D p(i+1)      u̇(i+1) = A' u + B' u̇ + C' p(i) + D' p(i+1)     con p = −üg
```

```js
function spectrumNJ(ag, dt, periods, z) {        // ag en m/s² (o in/s²); devuelve D, PSV, PSA, SA (absoluta)
  return periods.map(T => {
    const w = 2*Math.PI/T, sq = Math.sqrt(1-z*z), wd = w*sq, E = Math.exp(-z*w*dt), S = Math.sin(wd*dt), C = Math.cos(wd*dt), k = w*w;
    const A = E*(z/sq*S + C), B = E*S/wd;
    const Cc = (2*z/(w*dt) + E*(((1-2*z*z)/(wd*dt) - z/sq)*S - (1 + 2*z/(w*dt))*C))/k;
    const D  = (1 - 2*z/(w*dt) + E*((2*z*z-1)/(wd*dt)*S + 2*z/(w*dt)*C))/k;
    const Ap = -E*w/sq*S, Bp = E*(C - z/sq*S);
    const Cp = (-1/dt + E*((w/sq + z/(dt*sq))*S + C/dt))/k, Dp = (1 - E*(z/sq*S + C))/(k*dt);
    let u = 0, v = 0, umax = 0, amax = 0;
    for (let i = 0; i < ag.length-1; i++) {
      const p0 = -ag[i], p1 = -ag[i+1], un = A*u + B*v + Cc*p0 + D*p1; v = Ap*u + Bp*v + Cp*p0 + Dp*p1; u = un;
      umax = Math.max(umax, Math.abs(u)); amax = Math.max(amax, Math.abs(2*z*w*v + w*w*u));
    }
    return { T, D: umax, PSV: w*umax, PSA: w*w*umax, SA: amax };
  });
}
```

Notas:
- Los coeficientes dependen solo de T, ζ y Δt. Se precalculan una vez por período.
- Hay que analizar unos 1,5·Tmax segundos de vibración libre después del registro, rellenando con ceros. Si no, en
  períodos largos el máximo se subestima.
- Sa(T→0) debe coincidir con el PGA. Es una buena prueba de humo.
- La rejilla de períodos se recomienda logarítmica: unos 100 puntos entre 0,01 y 10 s, más los puntos TP y TL de la
  norma.
- **Prueba ✔:** El Centro NS, ζ = 2 %. D(0,5) = 2,67 in, D(1) = 5,97 in y D(2) = 7,47 in (Chopra, Fig. 6.4.1;
  `videos.md` §12.3).

### 3.2 Alternativa en el dominio de la frecuencia (pyrotd)
Se aplica la FFT al registro, con ceros hasta 2ⁿ. La función de transferencia de aceleración absoluta es
H(f) = (fn² + 2iζ·fn·f)/(fn² − f² + 2iζ·fn·f). Luego se hace la IFFT y se toma el máximo. pyrotd también interpola en
frecuencia para subir la frecuencia de muestreo. Conviene solo cuando hay muchos períodos y el registro es largo, y
requiere una FFT radix-2 en JS (~40 líneas). Para RotD50/RotD100 se rotan las dos componentes con θ entre 0 y 180°.

### 3.3 Preproceso y parámetros (como SeismoSignal)
- **Corrección de línea base.** Se ajusta un polinomio de grado 1–3 por mínimos cuadrados a la aceleración, o a la
  velocidad integrada, y se resta. Opcionalmente se aplica un filtro Butterworth pasabanda de 0,1–25 Hz,
  bidireccional para no introducir fase.
- **Integración.** Trapecios: v(i+1) = v(i) + (a(i) + a(i+1))Δt/2, y de la misma forma el desplazamiento.
- **Intensidad de Arias:** Ia = π/(2g)·∫a²dt. La duración significativa D5-95 es el tiempo entre el 5 % y el 95 % de Ia.
- **Escalamiento E.030-2026 Art. 47.5:** un solo factor por par de componentes, tal que el promedio SRSS ≥ el
  espectro con R = 1 en 0,2T–1,5T. Con NCh433 o ASCE 7 se usan los mismos pasos.

## 4. MDOF: modos y superposición modal (Chopra, cap. 10, 12 y 13)

1. **Matrices.** K y M. Para un edificio de cortante, K es tridiagonal con ki + ki+1 en la diagonal y −ki+1 fuera
   de ella. Con diafragmas rígidos se usan 3 GDL por piso (ux, uy, θz): M = diag(m, m, J = m(a²+b²)/12) y K se
   ensambla con transformaciones de cada pórtico.
2. **Problema de autovalores.** K·φ = ω²·M·φ (§5). Los modos se normalizan en masa: φᵀMφ = 1.
3. **Participación.** Ln = φnᵀ·M·ι y Γn = Ln/Mn, que es igual a Ln si Mn = 1. La masa efectiva es Mn* = Ln²/Mn y
   Σ Mn* = Σ m.
4. **Respuesta en el tiempo.** Dn(t) es la respuesta de un 1 GDL (ωn, ζn) a −üg, calculada con §3.1 o §1.
   u(t) = Σ Γn·φn·Dn(t). La fuerza equivalente es fn(t) = Γn·M·φn·ωn²·Dn(t), el cortante basal
   Vbn(t) = Mn*·ωn²·Dn(t) y el momento de volteo Mbn = Σ hj·fjn.
5. **Espectro de respuesta.** rn,max = Γn·(respuesta estática a M·φn)·Sa(Tn)/ωn². La combinación se ve en §6.

**Prueba ✔:** Chopra, edificio de 5 pisos (m = 100/g, k = 31,54 kip/in). T = 2,0007, 0,6854, 0,4348, 0,3385 y
0,2967 s. Con El Centro y ζ = 5 %: u5,max = 6,840 in y Vb,max = 73,20 kip (`videos.md` §12.4).

**Integración directa MDOF** (no lineal, por ejemplo un edificio de cortante con resortes bilineales): se usa §1 o
§2 en forma matricial, con K̂ = K_T + a1·M + (γ/βΔt)·C, y se resuelve K̂·Δu = R̂ por Newton. Para n ≤ 50 basta con
Cholesky denso. Para un edificio de cortante la matriz es tridiagonal y se resuelve con Thomas en O(n).

## 5. Autovalores: Jacobi y subespacio

### 5.1 Reducción a problema estándar + Jacobi clásico (n ≤ ~60, recomendado en la app)
Se factoriza M = L·Lᵀ (Cholesky) y se forma A = L⁻¹·K·L⁻ᵀ, que es simétrica. Con Jacobi se obtienen A·y = λ·y y
φ = L⁻ᵀ·y. Si M es diagonal (masas concentradas), basta con L = diag(√mi). Si hay GDL sin masa (rotaciones), primero
se condensan estáticamente (§8).

```js
function jacobiSym(A0, tol = 1e-12) {           // A simétrica n×n -> {vals, vecs (columnas)}
  const n = A0.length, A = A0.map(r => r.slice()), V = A.map((r, i) => r.map((_, j) => +(i === j)));
  for (let sweep = 0; sweep < 100; sweep++) {
    let off = 0; for (let i = 0; i < n; i++) for (let j = i+1; j < n; j++) off += A[i][j]**2;
    if (Math.sqrt(off) < tol) break;
    for (let p = 0; p < n; p++) for (let q = p+1; q < n; q++) {
      if (Math.abs(A[p][q]) < 1e-300) continue;
      const th = (A[q][q] - A[p][p]) / (2*A[p][q]);
      const t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th*th + 1)), c = 1/Math.sqrt(t*t + 1), s = t*c;
      for (let k = 0; k < n; k++) { const x = A[k][p], y = A[k][q]; A[k][p] = c*x - s*y; A[k][q] = s*x + c*y; }
      for (let k = 0; k < n; k++) { const x = A[p][k], y = A[q][k]; A[p][k] = c*x - s*y; A[q][k] = s*x + c*y; }
      for (let k = 0; k < n; k++) { const x = V[k][p], y = V[k][q]; V[k][p] = c*x - s*y; V[k][q] = s*x + c*y; }
    }
  }
  return { vals: A.map((r, i) => r[i]), vecs: V };
}
```

Bathe (§11.3) también describe el **Jacobi generalizado**, que trabaja directamente con K y M sin Cholesky. Es útil
si M no es definida positiva tras condensar.

### 5.2 Iteración en subespacio (Bathe §11.6), para modelos grandes con q modos
```
p = min(2q, q+8); X = [diag(M)/max | vectores unitarios en GDL con mayor m/k]  (n×p)
factorizar K = LDLᵀ una vez
repetir:
   K·X̄ = M·X                  (p solves)
   K* = X̄ᵀKX̄ ;  M* = X̄ᵀMX̄    (p×p)
   resolver K*Q = M*QΛ con Jacobi generalizado; ordenar
   X = X̄·Q
hasta |λi(k) − λi(k−1)| / λi(k) ≤ 1e-6 para i = 1..q
verificación de Sturm: nº de pivotes negativos de (K − μM) con μ ligeramente > λq debe ser q
```
La iteración inversa con desplazamiento (μ) sirve para refinar un solo modo.

## 6. Combinación modal y direccional

- **SRSS:** r = √Σrn².
- **CQC** (Der Kiureghian 1981): r = √ΣΣ ri·ρij·rj, con β = ωj/ωi.
  ρij = 8√(ζiζj)·(ζi + β·ζj)·β^1,5 / [(1−β²)² + 4ζiζj·β(1+β²) + 4(ζi²+ζj²)β²].
  Con ζi = ζj = ζ se reduce a 8ζ²(1+β)β^1,5 / [(1−β²)² + 4ζ²β(1+β)²], que es la forma de la E.030 Art. 42.2.
  **Los ri deben llevar su signo** (Γn·φn), no el valor absoluto.
- **E.030 Art. 42.3:** r = 0,25·Σ|ri| + 0,75·√Σri².
- **Direccional:**
  - E.030-2026 Art. 43: √[(r100x + r30y)²…], es decir, SRSS de las componentes 100 % y 30 %.
  - Análisis estático E.030-2026 Art. 33.3: suma de valores absolutos.
  - NCh433 no exige la combinación ortogonal en edificios regulares.
  - ASCE 7: 100 % + 30 %.
- **Prueba ✔:** ρ(β = 0,9, ζ = 5 %) = 0,4730 y ρ(0,8; 5 %) = 0,1656 (`videos.md` §12.5).

**Importante:** derivas, cortantes de entrepiso y fuerzas internas se calculan **por modo** y después se combinan.
Nunca se calculan a partir de desplazamientos ya combinados.

## 7. Amortiguamiento de Rayleigh

C = a0·M + a1·K, con ζ(ω) = a0/(2ω) + a1·ω/2. Para fijar ζ en ωi y ωj:
a0 = 2ζ·ωi·ωj/(ωi + ωj) y a1 = 2ζ/(ωi + ωj).

**Prueba:** T = 1,0 y 0,2 s con ζ = 5 % dan a0 = 0,52360 y a1 = 0,002653. En T = 0,5 s resulta ζ = 3,75 %.

Para superposición modal no hace falta C: se usa ζn directamente. En análisis no lineal se recomienda una C
proporcional a la rigidez **inicial** o a la tangente, y documentar la elección.

## 8. Análisis de pórticos 2D (rigidez directa) y condensación estática

Elemento de pórtico 2D (E, A, I, L) en coordenadas locales: u1, v1, θ1, u2, v2, θ2.
```
k = [ EA/L    0          0        -EA/L    0          0
      0       12EI/L³    6EI/L²    0      -12EI/L³    6EI/L²
      0       6EI/L²     4EI/L     0      -6EI/L²     2EI/L
      ...simétrica... ]               K_global = Tᵀ k T   (T rotación con c = cos α, s = sen α)
```
- Cargas de empotramiento: wL/2 y wL²/12. Rótulas por liberación y condensación del GDL. Brazos rígidos en las
  uniones con muros.
- **Condensación estática:** se separan los GDL t (con masa o laterales) de los o (sin masa o rotaciones).
  K̂tt = Ktt − Kto·Koo⁻¹·Kot.
- **Prueba ✔ (Chopra, Ec. 1.3.5):** pórtico de un vano con columnas empotradas.
  k = (24EIc/h³)·(12ρ+1)/(12ρ+4), con ρ = (EIb/L)/(2EIc/h). Para ρ = 0,125 da 10,909·EIc/h³ (`videos.md` §12.8).
- Con la rigidez lateral condensada de cada pórtico y su posición, se arma la K del diafragma de 3 GDL por piso:
  Kdiaf = Σ Tᵢᵀ·K̂ᵢ·Tᵢ, con Tᵢ = [cos α, sen α, rᵢ].

## 9. P-Delta

- **Edificio de cortante:** k_G,i = Pi/hi, con Pi = peso acumulado sobre el entrepiso i. Se ensambla como K, con
  Pi/hi en lugar de ki, y se usa K − KG para la estática y para los modos.
- **Elemento de pórtico** (consistente): KG = (P/L)·[[6/5, L/10, −6/5, L/10], [L/10, 2L²/15, −L/10, −L²/30], …]
  en v1, θ1, v2, θ2. P es positivo en compresión y se resta de K. La estática se itera hasta que P se estabiliza
  (2–3 iteraciones).
- **Índice de estabilidad:** θ = P·Δ/(V·h). Con θ ≤ 0,1 el efecto se puede despreciar (ASCE 7 §12.8.7 usa
  Δ·Ie/Cd). La amplificación aproximada es 1/(1−θ).
- **Prueba ◆:** en el edificio de 3 pisos, θ = 0,0098, 0,0084 y 0,0044. La amplificación 1/(1−θ) coincide con el
  resultado exacto K − KG, con derivas de 7,574, 7,203 y 5,022 mm frente a 7,500, 7,143 y 5,000 mm. T1 pasa de 0,4899
  a 0,4920 s.

## 10. Pushover simplificado (edificio de cortante con resortes bilineales)

- **Resorte de entrepiso i:** ki, Vy,i y α (endurecimiento). Deriva: δi(V) = V/ki si V ≤ Vy; si no,
  Vy/ki + (V−Vy)/(α·ki).
- **Patrón de carga:** s = M·φ1 (modal, el que requiere N2), uniforme s = M·1, o el de la E.030 (Pi·hi^k).
- **Control de carga** (vale con α > 0): λ creciente, cortante de entrepiso Vi = λ·Σ(j≥i) sj y desplazamiento de
  techo Σδi. La curva es (u_techo, λ·Σs).
- **Control de desplazamiento / event-to-event** (necesario con α ≤ 0): se resuelve λ para un desplazamiento de
  techo dado por bisección, o se avanza de un evento de fluencia al siguiente con la rigidez tangente.
- **Pórtico general:** rótulas plásticas concentradas, con M-θ bilineal o del ASCE 41, en los extremos. Se recorre
  evento a evento con K tangente o se usa Newton con control de desplazamiento. Los eventos son las fluencias y las
  rótulas que alcanzan los puntos B, C, D y E. PyNite y anaStruct son buenas referencias de estructura de código.
- **Prueba ◆** (`videos.md` §12.7): la primera fluencia ocurre en el entrepiso 1 con Vb = 1 500 kN y
  u_techo = 45,82 mm.

## 11. Método N2 (Fajfar 2000; EC8-1 Anexo B)

1. **Conversión a 1 GDL:** φ normalizado con φ_techo = 1, m* = Σmi·φi y Γ = m*/Σmi·φi². Así F* = Vb/Γ y d* = d_techo/Γ.
2. **Bilineal elastoplástico** de igual energía hasta dm*: dy* = 2(dm* − Em*/Fy*), con Fy* = F*(dm*). El período
   es T* = 2π√(m*·dy*/Fy*).
3. **Demanda elástica:** det* = Se(T*)·(T*/2π)².
4. **Si T* < TC:** qu = Se(T*)·m*/Fy*. Si qu > 1, dt* = (det*/qu)·[1 + (qu−1)·TC/T*] ≥ det*; si no, dt* = det*.
   **Si T* ≥ TC:** dt* = det*, la regla de igual desplazamiento.
5. Se itera haciendo dm* = dt* hasta converger (5 iteraciones en la prueba). El desplazamiento objetivo es
   d_techo = Γ·dt*. Con él se leen las derivas y la demanda de rótulas en el estado del pushover.

**Prueba ◆:** Fy* = 1 260,3 kN, dy* = 39,47 mm, T* = 0,4960 s, qu = 1,336, dt* = 55,50 mm y d_techo = 70,04 mm
(EC8 tipo 1, ag = 0,3g, suelo C). Para aplicarlo a la E.030 o la NCh433, el espectro elástico es la norma con
R = 1. En la E.030, Sa = Z·U·C·S·g y TC equivale a TP.

## 12. Espectro de capacidad ATC-40 y FEMA 440

### 12.1 Conversión a formato ADRS
- Factor de participación: PF1 = Σ(wi·φi/g) / Σ(wi·φi²/g).
- Coeficiente de masa modal: α1 = [Σwiφi/g]² / [Σwi/g · Σwiφi²/g].
- Conversión: Sa = (V/W)/α1 y Sd = Δ_techo/(PF1·φ_techo,1).

### 12.2 Procedimiento A (iterativo, ATC-40 §8.2.2.1)
```
dpi = intersección capacidad–espectro elástico (5 %)       // punto de prueba
repetir:
  api = Sa_cap(dpi); bilineal: pendiente inicial k0, segunda rama hasta (dpi, api) con igual área:
        dy = (2·Area(0..dpi) − api·dpi) / (k0·dpi − api);  ay = k0·dy
  β0 = 63,7·(ay·dpi − dy·api)/(api·dpi)          [%]
  κ: Tipo A: 1,0 si β0≤16,25, si no 1,13 − 0,51·(ay·dpi−dy·api)/(api·dpi)
     Tipo B: 0,67 si β0≤25,   si no 0,845 − 0,446·(…)
     Tipo C: 0,33
  βeff = κ·β0 + 5
  SRA = (3,21 − 0,68 ln βeff)/2,12 ≥ {0,33 A; 0,44 B; 0,56 C}
  SRV = (2,31 − 0,41 ln βeff)/1,65 ≥ {0,50 A; 0,56 B; 0,67 C}
  espectro reducido: Sa = min(2,5·Ca·SRA, Cv·SRV/T),  Sd = Sa·g·T²/4π²
  dnuevo = intersección capacidad–espectro reducido (bisección sobre f(d) = Sa_cap(d) − Sa_dem(T_sec(d)))
hasta |dnuevo − dpi| ≤ 0,05·dpi (ATC) o 1 % (SOFiSTiK)
```
**Prueba ✔ (SOFiSTiK BE36 = ATC-40 §8.3.3.3), tipo C.** Suelo SB: βeff = 9,41 % y PP = (85,55 mm; 3,237 m/s²); la
referencia da (83,36; 3,24). Suelo SD: βeff = 14,63 % y PP = (150,32; 3,569); la referencia da (149,86; 3,63).
**Con κ = 1 (tipo A) el benchmark no se reproduce.** El tipo de comportamiento estructural debe ser un dato
explícito de la plantilla.

### 12.3 FEMA 440: linealización equivalente mejorada (§6.2), con μ = dpi/dy y T0 el período inicial
| μ | βeff (%) | Teff / T0 |
|---|---|---|
| 1 < μ < 4 | 4,9(μ−1)² − 1,1(μ−1)³ + β0 | 0,20(μ−1)² − 0,038(μ−1)³ + 1 |
| 4 ≤ μ ≤ 6,5 | 14,0 + 0,32(μ−1) + β0 | 0,28 + 0,13(μ−1) + 1 |
| μ > 6,5 | 19·[(0,64(μ−1) − 1)/(0,64(μ−1))²]·(Teff/T0)² + β0 | 0,89·[√((μ−1)/(1+0,05(μ−2))) − 1] + 1 |

- Reducción espectral: B(βeff) = 4/(5,6 − ln βeff), con βeff en %, y Sa,β = Sa,5%/B.
- Se construye el MADRS multiplicando por M = (Teff/Tsec)² = [(1+α(μ−1))/μ]·(Teff/T0)². El punto de desempeño es la
  intersección del MADRS con la capacidad, buscada con el procedimiento iterativo de FEMA 440 §6.4.
- Estos son los coeficientes "para cualquier curva de capacidad", sin distinguir el tipo de histéresis.

### 12.4 Método de coeficientes (FEMA 440 cap. 5 / ASCE 41 §7.4.3.3)
- Desplazamiento objetivo: δt = C0·C1·C2·Sa·Te²/(4π²)·g.
- C1 = 1 + (μstrength − 1)/(a·Te²). El coeficiente a vale 130 (suelos A, B y C), 90 (D) y 60 (E y F). Se toma
  C1(Te = 0,2 s) si Te < 0,2 s y C1 = 1 si Te > 1,0 s.
- C2 = 1 + (1/800)·((μstrength − 1)/Te)² si Te < 0,7 s. Si no, C2 = 1.
- C0 es el factor de forma modal: Γ1·φ_techo o los valores de la tabla.
- μstrength = Sa/(Vy/W)·Cm.
- Te = Ti·√(Ki/Ke), con la bilinealización del ASCE 41: secante al 60 % de Vy y áreas iguales, iterando.

## 13. Generación de acelerogramas compatibles con un espectro

### 13.1 Sintético (Gasparini & Vanmarcke, SIMQKE)
```
x(t) = I(t)·Σk Ak·sin(ωk t + φk),   φk ~ U(0, 2π) (semilla fija para reproducibilidad)
I(t): trapezoidal/Jennings  (t/t1)² si t<t1; 1 si t1≤t≤t2; e^{−c(t−t2)} si t>t2   (p. ej. 2 s, 12 s, c=0,25)
Ak(0) ∝ Sa_obj(ωk)  (o desde la PSD de Vanmarcke)
iterar 8–15 veces:  Ak ← Ak·Sa_obj(Tk)/Sa_calc(Tk)   (Sa_calc con §3.1, ζ = 5 %)
```
- Se recomiendan unas 300 frecuencias logarítmicas entre 0,1 Hz y unos 45 Hz (menos que Nyquist), con Δt = 0,01 s.
- Después se corrige la línea base (§3.3) para que la velocidad y el desplazamiento finales sean casi nulos.

**Prueba ◆ (E.030 Z4-S2, R = 1):** tras 12 iteraciones la razón está entre 0,947 y 1,188 en 0,03–4 s.
- **Cuidado:** las frecuencias altas sin controlar inflan el PGA. Con fmax = 25 Hz el PGA salió 0,685 g, frente a
  ZUS = 0,473. Con 45 Hz y controlando T desde 0,03 s salió 0,526 g.
- Hay que incluir períodos muy cortos en el control y reportar PGA/ZUS.

### 13.2 Ajuste espectral de un registro real (dominio de la frecuencia)
Se calcula la FFT del registro. Para cada iteración, cada coeficiente Fourier de frecuencia f se escala por
R(1/f) = Sa_obj/Sa_calc, interpolado. Después se aplica la IFFT, la corrección de línea base y se recalcula el
espectro, de 5 a 10 veces. Conserva la fase, y con ella la no estacionariedad del registro.

La alternativa de mayor calidad es el método de wavelets en el dominio del tiempo (RspMatch / Al Atik-Abrahamson,
2010). Es más complejo. Para la E.030-2026 Art. 47.6 cada componente se ajusta por separado, el promedio SRSS debe
ser ≥ 100 % y cada registro ≥ 90 % en 0,2T–1,5T.

## 14. Sección de fibras: momento-curvatura

### 14.1 Algoritmo
```
discretizar concreto en nf franjas (rectangular: 100–200; circular: anillos×sectores) y acero en barras
para φ = φ1, φ2, … (paso pequeño cerca de la fluencia):
   encontrar ε0 (deformación en la fibra superior o en el centroide) tal que N(ε0, φ) = P   (bisección o Newton/secante)
       ε(y) = ε0 − φ·y ;  N = Σ σc(εi)·Ai + Σ (σs(εj) − σc(εj))·Asj    (restar concreto desplazado)
   M = Σ σ·A·(yc − y)
   parar cuando εc,max ≥ εcu (o la barra alcanza εsu)
salidas: (φcr, Mcr), (φy, My) primera fluencia, (φu, Mu), ductilidad μφ = φu/φy, bilineal equivalente
```
- Para el confinado se usan dos materiales: el núcleo (Mander o Kent-Park) dentro de los estribos y el recubrimiento
  sin confinar, que se descascara después de unos 2εco.
- Longitud de rótula plástica: Lp = 0,08L + 0,022·db·fy, con fy en MPa (Paulay-Priestley).

### 14.2 Modelos de material (compresión positiva)
- **Hognestad:** f = f''c·[2ε/ε0 − (ε/ε0)²] para ε ≤ ε0, donde ε0 = 2f''c/Ec. Después baja linealmente hasta
  0,85f''c en εcu = 0,0038. f''c = 0,85f'c en elementos (Hognestad, 1951). En la prueba se usó f''c = f'c.
- **Kent-Park modificado** (Scott, Park & Priestley 1982; OpenSees `Concrete01` con estos parámetros):
  - K = 1 + ρs·fyh/f'c y ε0 = 0,002K.
  - f = K·f'c·[2ε/ε0 − (ε/ε0)²] para ε ≤ ε0.
  - f = K·f'c·[1 − Zm(ε − ε0)] ≥ 0,2K·f'c para ε > ε0.
  - Zm = 0,5 / [ (3 + 0,29f'c)/(145f'c − 1000) + 0,75ρs·√(h'/sh) − 0,002K ], con f'c en MPa, h' el ancho del núcleo
    y sh la separación de estribos.
- **Mander** (1988):
  - Ecuaciones principales: f'cc = f'co·(−1,254 + 2,254·√(1 + 7,94f'l/f'co) − 2f'l/f'co) y
    εcc = εco·[1 + 5(f'cc/f'co − 1)]. La curva es f = f'cc·x·r/(r − 1 + x^r), con x = ε/εcc, r = Ec/(Ec − Esec),
    Esec = f'cc/εcc y Ec = 5000√f'co (MPa).
  - Sección rectangular: ke = [1 − Σ(w'i)²/(6bc·dc)]·(1 − s'/2bc)·(1 − s'/2dc)/(1 − ρcc), y f'lx = ke·ρx·fyh con
    ρx = Asx/(s·dc). Con f'lx ≠ f'ly hay que usar el ábaco de Mander (Fig. 4) o la solución de 5 parámetros. En la
    app se puede ofrecer f'l = min, o el promedio, como simplificación documentada.
  - Sección circular: ke = (1 − s'/2ds)²/(1 − ρcc) para aros y (1 − s'/2ds)/(1 − ρcc) para espiral, con
    f'l = ½·ke·ρs·fyh.
  - Deformación última (Priestley): εcu = 0,004 + 1,4ρs·fyh·εsu/f'cc.
  - **Prueba ◆:** f'co = 30 MPa y f'l = 3 MPa dan f'cc = 46,95 MPa, εcc = 0,00765 y r = 1,289.
- **Acero:**
  - EPP: σ = Es·ε acotado a ±fy.
  - Bilineal: b = Esh/Es.
  - Menegotto-Pinto (Steel02): σ* = b·ε* + (1−b)·ε*/(1 + ε*^R)^(1/R).
  - Park y Paulay: curva parabólica de endurecimiento desde εsh.

**Prueba ◆ (§12.8 de videos.md):** sección de 300 × 500 mm con 1 530 mm² abajo. φy = 7,75e-6 1/mm, My = 246,9 kN·m
y Mu = 257,3 kN·m. La comparación a mano con sección fisurada da My = 249,9 kN·m y φy = 7,33e-6, y Whitney da
Mn = 253,8 kN·m. Para que la primera fluencia salga con ±2 % de error, el paso de φ debe ser menor o igual a φy/30.

## 15. Resumen de pruebas automatizables (para `tests/analysis.test.mjs`)

| # | Función sugerida | Entrada | Esperado | Fuente |
|---|---|---|---|---|
| 1 | `newmark(m,c,k,p,dt,'avg')` | Chopra Ej. 5.4 | u(1,0) = −1,1441 in | ✔ Chopra |
| 2 | `newmark(...,'lin')` | idem | u(0,5) = 1,4782 | ✔ Chopra Ej. 5.5 |
| 3 | `pwexact(...)` | idem | u(1,0) = −1,2432 | ✔ Chopra Ej. 5.1 |
| 4 | `spectrumNJ(elcentro, .02, [0.5,1,2], .02)` | El Centro NS | D = 2,67, 5,97 y 7,47 in | ✔ Chopra Fig. 6.4.1 |
| 5 | `eig(K,M)` | 5 pisos (Chopra) | T1 = 2,0007 s y M1*/M = 0,8795 | ✔ |
| 6 | `modalTHA` | 5 pisos + El Centro, ζ = 5 % | u5 = 6,840 in y Vb = 73,20 kip | ✔ (Chopra ≈ 6,85 y 73,3) |
| 7 | `rhoCQC(1,0.9,.05,.05)` | — | 0,4730 | ✔ Der Kiureghian |
| 8 | `atc40(cap, Ca, Cv, 'C')` | SOFiSTiK BE36 SB | Sdp ≈ 83–86 mm, βeff ≈ 9,2–9,4 % | ✔ |
| 9 | `n2(...)` | 3 pisos (§12.7) | d_techo = 70,04 mm | ◆ |
| 10 | `portalK(rho)` | ρ = 0,125 | 10,909·EI/h³ | ✔ Chopra 1.3.5 |
| 11 | `mander(30, 3)` | — | f'cc = 46,95 MPa | ◆ (ecuación de Mander) |
| 12 | `rayleigh(1.0, 0.2, .05)` | — | a0 = 0,5236, a1 = 0,002653 | ◆ |

Para que el test 4 corra en `node tests/run.mjs` sin red, se sugiere embeber el registro de El Centro (1 562
valores, ~20 KB) en `tests/data/elcentro.js` o en la propia plantilla.

## 16. Recomendaciones de implementación en MemoriaCalc

1. **Funciones en `src/norms/analysis.js`** con `defineFns`. Los resultados escalares se muestran en la memoria y
   los vectores alimentan bloques gráficos:
   - `Sd_NJ(T, ζ)` y `Sa_NJ(T, ζ)` sobre un registro guardado.
   - `rhoCQC(wi, wj, ζ)`.
   - `rayleighA0(Ti, Tj, ζ)` y `rayleighA1(Ti, Tj, ζ)`.
   - `C1_FEMA(μ, Te, sitio)` y `C2_FEMA(μ, Te)`.
   - `N2_target(...)`.
   - `fcc_Mander(fco, fl)`.
2. **Bloques nuevos en `src/blocks/analysis.js`.** Comparten el mismo núcleo numérico y todos llevan
   `setVar(ctx, …)` para exportar los picos:
   - `acelerograma`: pegar t–a, PGA, Arias, D5-95, línea base y gráfico.
   - `espectroRespuesta`: espectro con la superposición del espectro de norma E.030/NCh433 y R = 1.
   - `thaSDOF`: Newmark lineal o no lineal.
   - `modalTHA`.
   - `pushoverCortante`.
   - `n2` y `csmATC40`: curvas de capacidad y demanda en formato ADRS.
   - `mphiFibras`.
   - `espectroCompatible`.
3. **Rendimiento.** El espectro de 100 períodos × 3 000 pasos corre en menos de 50 ms en JS. El SIMQKE completo,
   con 12 iteraciones de 300 frecuencias × 2 000 pasos × 300 períodos, tarda ~0,3 s en Node. Se puede ejecutar
   sin Web Worker, pero conviene memoizar por hash de las entradas para no recalcular en cada tecla.
4. **Unidades.** Internamente se trabaja en SI (m, s, kN, t). Las conversiones solo se hacen en la entrada y la
   salida (`toNum`, `mkUnit`).
5. **Transparencia, al estilo handcalcs y efficalc.** Para cada algoritmo, la memoria debe mostrar:
   - las ecuaciones de la recurrencia, con sus coeficientes A–D' numéricos;
   - una tabla de los primeros pasos;
   - el pico y en qué instante ocurre.

   Así un revisor puede verificar a mano, como en Chopra, Tabla E5.1.
