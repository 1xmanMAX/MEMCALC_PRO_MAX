# Módulo «peru» — referencias y criterios

Normas del Reglamento Nacional de Edificaciones (RNE) implementadas en `src/norms/peru.js`,
`src/blocks/peru.js` y `src/templates/peru.js`; validación en `tests/peru.test.mjs`.

## 1. Fuentes normativas (texto oficial consultado)

| Norma | Fuente | Uso |
|---|---|---|
| NTE E.030 *Diseño Sismorresistente*, texto modificado por la **RM N° 183-2026-VIVIENDA** (El Peruano, separata especial del 3 de mayo de 2026) | https://cdn-web.construccion.org/normas/files/vivienda/RM_183-2026-VIVIENDA.pdf · https://www.gob.pe/institucion/vivienda/normas-legales/8081915-183-2026-vivienda | Tablas N° 1–15, Art. 11–61 |
| RM N° 279-2025-VIVIENDA (publicación del proyecto de modificación de la E.030, nov. 2025) | https://www.gob.pe/institucion/vivienda/normas-legales/7356142-279-2025-vivienda | Antecedente: solo dispuso la consulta pública; el texto vigente es el de la RM 183-2026 |
| NTE E.030-2018 (DS 003-2016 / RM 355-2018-VIVIENDA) | texto 2018 | Función `sJunta2018` y plantilla «transición» existente |
| NTE E.020 *Cargas* (2006) | https://cdn.www.gob.pe/uploads/document/file/2366640/50%20E.020%20CARGAS.pdf · https://cdn-web.construccion.org/normas/rne2012/rne2006/files/titulo3/02_E/RNE2006_E_020.pdf (El Peruano, 9 jun. 2006) | Tabla 1, Art. 6, 7, 10, 11, 12, 19, 24, Anexo 1 |
| NTE E.031 *Aislamiento Sísmico* (DS N° 030-2019-VIVIENDA, El Peruano 6 nov. 2019) | https://cdn-web.construccion.org/normas/rne2012/rne2006/files/titulo3/02_E/2019_E031_DS-030-2019-VIVIENDA.pdf | Art. 13, 14, 17, 20–23, Tablas N° 2 y 5 |
| NTE E.070 *Albañilería* (2006), Cap. 9: $f'_t$ = 0.15 MPa (1.5 kgf/cm²) para albañilería simple | http://blog.pucp.edu.pe/blog/wp-content/uploads/sites/82/2008/01/Norma-E-070-MV-2006.pdf | Parapeto (plantilla de no estructurales) |

Bibliografía técnica de apoyo: A. Blanco Blasco, *Estructuración y diseño de edificaciones de concreto armado*
(predimensionamiento de columnas $P_s/0.45f'_c$, metrados); A. K. Chopra, *Dynamics of Structures* (Cap. 10 y 13:
pórtico de cortante de dos pisos con $m_1 = 2m$, $k_1 = 2k$; combinación CQC); ASCE/SEI 7-16 Cap. 17 (origen de las
ecuaciones de la E.031); ACI 318-19 R17.8 (interacción tracción–corte de anclajes).

## 2. Cambios de la E.030-2026 respecto de la 2018 verificados en el texto oficial

* **Numeración nueva:** factor de zona Art. 11; suelos Art. 14–17; C Art. 18 (Tabla N° 6); U Art. 19 (Tabla N° 7);
  R0 Art. 22 (Tabla N° 10); irregularidades Art. 24 (Tablas N° 11 y 12); restricciones Art. 25 (Tabla N° 13);
  peso Art. 31; cortante basal Art. 34; distribución Art. 35; periodo Art. 36; excentricidad Art. 37; vertical Art. 38;
  modal Art. 39–45; desplazamientos Art. 50; derivas Art. 51 (Tabla N° 14); junta Art. 52; no estructurales Art. 55–61.
* **Suelos por $\bar V_{s30}$** con S, TP y TL **interpolados linealmente** dentro de S2 (350–550 m/s) y S3
  (200–350 m/s) (Tablas N° 4 y 5, nota (*)); S4: TP = 1.2 s, TL = 1.6 s; en zona 4 el suelo S4 requiere análisis de
  respuesta de sitio. (Funciones `SE030`, `TpE030`, `TlE030` del motor, ya confirmadas contra el texto.)
* **Tabla N° 6**: C = 1 + 7.5 T/TP para T < 0.2 TP; en el análisis estático C = 2.5 para 0 ≤ T ≤ TP (Art. 18.3).
* **R0 de muros de ductilidad limitada = 3.5** (antes 4) y **distorsión límite 0.004** (antes 0.005); EMDL hasta 5 pisos.
* **Péndulo invertido R0 = 2.5** (Art. 22.3).
* **Junta sísmica** $s = 0.02\,Z\,S\,h \ge 0.03$ m (antes $0.006\,h$).
* **Discontinuidad del diafragma** (Tabla N° 12, 2026): aberturas > 50 % del área bruta o sección neta < 50 % de la sección total.
* Acción simultánea 100 % + 30 % (Art. 28.1, 33.3 y 43), excentricidad solo en la dirección perpendicular a la del 100 % (Art. 28.3).
* Ts por razón espectral H/V obligatorio para categorías A y B en zona 4 (Art. 14.2 y 14.8).
* Elementos no estructurales: F = (ai/g)·C1·Pe ó (Fi/Pi)·C1·Pe (Art. 57), mínimo 0.5·Z·U·S·Pe (Art. 58), vertical 2/3 (Art. 59),
  base y cercos 0.5·Z·U·S·Pe (Art. 60), antenas y letreros C1 ≥ 3.0 (Art. 61).

## 3. Funciones (`src/norms/peru.js`)

| Función | Fórmula / tabla | Referencia |
|---|---|---|
| `ZE030(zona)` | 0.45 / 0.35 / 0.25 / 0.10 | E.030 Tabla N° 1 |
| `UE030(cat)` | 1 → A1 aislada 1.0; 11 → A1 sin aislamiento (zonas 1–2) 1.5; 2 → A2 1.5; 3 → B 1.3; 4 → C 1.0 | Tabla N° 7 |
| `R0E030(sis)` | 1 SMF 8, 2 IMF 5, 3 OMF 4, 4 SCBF 7, 5 OCBF 4, 6 EBF 8, 7 C°A° pórticos 8, 8 dual 7, 9 muros 6, 10 EMDL 3.5, 11 albañilería 3, 12 madera 7, 13 péndulo invertido 2.5 | Tabla N° 10, Art. 22.3 |
| `CTE030(sis)` | 35 (C°A° pórticos, acero SMF/IMF/OMF) / 45 (acero arriostrado) / 60 (dual, muros, EMDL, albañilería) | Art. 36.1 |
| `sisE030(cat,zona,sis)` | 1 si el sistema está permitido para la categoría y zona, 0 si no (cat: 1 A1 aislada, 11 A1 sin aislamiento, 2 A2, 3 B, 4 C) | Tabla N° 9, Art. 21 |
| `dlimE030(mat)` | 1 C°A° 0.007; 2 acero 0.010; 3 albañilería 0.005; 4 madera 0.010; 5 EMDL 0.004 | Tabla N° 14 |
| `kE030(T)` | 1.0 (T ≤ 0.5 s); 0.75 + 0.5T ≤ 2.0 | Art. 35.2 |
| `SaE030(T,Z,U,S,Tp,Tl,R)` | ZUCS/R (g) con C de la Tabla N° 6 | Art. 41.1 |
| `VE030(Z,U,C,S,R,P)` | Z·U·S·max(C/R, 0.11)·P | Art. 34 |
| `alphaE030(Pi,hi,k)` | Pi·hi^k / ΣPj·hj^k | Art. 35.1 |
| `fdespE030(irr)` | 0.75 / 0.85 (× R) | Art. 50 |
| `sJuntaE030(Z,S,h)` · `sJunta2018(h)` | 0.02·Z·S·h ≥ 3 cm · 0.006·h ≥ 3 cm | Art. 52.2 (2026) · Art. 33 (2018) |
| `C1E030(tipo)` · `FneE030(ai,C1,Pe,Z,U,S)` | Tabla N° 15 · max(ai·C1, 0.5ZUS)·Pe | Art. 57, 58 |
| `IaRigE030`, `IaResE030`, `IaMasE030`, `IpTorE030` | criterios de la Tabla N° 11 y 12 (rigidez 0.70/0.80 y 0.60/0.70; resistencia 0.80/0.65; masa 1.5; torsión 1.3/1.5 con el criterio del 50 % de la deriva) | Tablas N° 11, 12 |
| `VhE020(V,h)` | V(h/10)^0.22, V ≥ 75 km/h; h ≤ 10 m → V | E.020 Art. 12.3 |
| `PhE020(C,Vh)` | 0.005·C·Vh² [kgf/m²] | Art. 12.4 |
| `LrE020(Lo,At,k)` | Lo(0.25 + 4.6/√Ai), Ai = k·At > 40 m², ≥ 0.5·Lo | Art. 10 |
| `QtE020(Qs,θ)` | Qs; 0.8Qs; Cs·0.8Qs con Cs = 1 − 0.025(θ − 30°) | Art. 11.3 |
| `pAligE020(h)` | 280 / 300 / 350 / 420 kgf/m² (h = 0.17/0.20/0.25/0.30); error fuera de 0.17–0.30 m | Anexo 1 |
| `CVtechoE020(θ)` | 100 kgf/m² hasta 3°, −5 por grado, mín. 50 | Art. 7.1 |
| `BME031(β)` | 0.8 / 1.0 / 1.2 / 1.5 / 1.7 / 1.9 para 2/5/10/20/30/≥40 % | E.031 Tabla N° 5 |
| `SaME031(T,Z,S,Tp,Tl)` | 1.5·Z·C·S (U = 1) | ec. 5 |
| `DME031(SaM,TM,BM)` · `TME031(P,kM)` | SaM·TM²/(4π²BM) · 2π√(P/(kM·g)) | ec. 6, 7 |
| `DTME031(DM,y,e,b,d,PT)` | DM[1 + (y/PT²)·12e/(b² + d²)] ≥ 1.15·DM | ec. 8 |
| `RaE031(R0)` · `VstE031(Vb,Ps,P,β)` · `kE031(β,Tf)` | 3/8·R0 ∈ [1, 2] · Vb(Ps/P)^(1 − 2.5β) · 14βTf | Art. 21, 22 |
| `keffLRB`, `betaLRB`, `lambdaE031` | Qd/D + kd · 4Qd(D − Dy)/(2π keff D²) · [1 + 0.75(λae − 1)]λtvs·λfab | ec. 1–4 |

## 4. Bloques (`src/blocks/peru.js`)

* **`modal`** — edificio de cortante (1 GDL por nivel, diafragma rígido): matriz K tridiagonal (o matriz K condensada
  ingresada), autovalores por **Jacobi** sobre $M^{-1/2}KM^{-1/2}$, periodos, formas normalizadas (techo = 1), Γn,
  masas efectivas, fuerzas $f_n = M\phi_n\Gamma_n S_a$, cortantes, momentos de volteo, desplazamientos y derivas
  modales; combinación **CQC** (β = 5 %, ρij del Art. 42.2), SRSS o 0.25Σ|r| + 0.75√Σr² (Art. 42.3). El espectro es
  cualquier expresión en `T` (Sa/g o aceleración), de modo que sirve para NCh433, BSL, ASCE 7, etc. Exporta
  `T1…Tn`, `Vdin`, `Vi_din`, `Fi_din`, `Mi_din`, `ui_din` (inelástico), `ue_din`, `deriva_din`, `Mpart`, `fesc`.
  Verifica masa participativa ≥ 90 % y deriva ≤ límite.
* **`storyforces`** — αi, Fi, Vi, momentos de volteo y torsores accidentales 0.05·B·Fi con figura (elevación,
  cortantes y momentos).
* **`irregE030`** — tabla de indicadores por entrepiso, tabla de irregularidades (Tablas 11 y 12), Ia, Ip y
  verificación de la Tabla N° 13 (excepción de zona 2 para ≤ 2 pisos u 8 m).
* **`lrb`** — iteración de punto fijo D → keff → βeff → TM → BM → DM para los límites inferior, nominal y superior,
  lazos histeréticos y espectro de desplazamientos.
* **`windgable`**, **`stackbar`**, **`junta`** — figuras de presiones de viento, metrados por nivel y junta sísmica.

## 5. Validación (`tests/peru.test.mjs`)

* Tablas de la E.030-2026 (Z, U, R0, CT, distorsiones, S/TP/TL interpolados, C de la Tabla N° 6, C/R ≥ 0.11, junta).
* Irregularidades con casos límite de cada criterio.
* E.020: Ph = 0.005·0.8·75² = 22.5 kgf/m²; Vh; reducción Lr; nieve; aligerados del Anexo 1.
* E.031: BM interpolado, ecuaciones 5–8, 10–12, 15; convergencia de la iteración del bloque `lrb`.
* Modal: matriz 3×3 con autovalores 2 ∓ √2; pórtico de dos pisos de Chopra ($m_1 = 2m$, $k_1 = 2k$:
  $\omega_1 = \sqrt{k/2m}$, $\omega_2 = \sqrt{2k/m}$, φ1 = [½, 1], Γ1 = 4/3, masa efectiva 8/9); dos pisos
  iguales ($\omega^2 = (3 \mp \sqrt5)/2 \cdot k/m$, masa efectiva 94.72 %); edificio uniforme de N pisos
  ($\omega_j = 2\sqrt{k/m}\,\sin\frac{(2j-1)\pi}{2(2N+1)}$); CQC ≈ SRSS para modos separados; periodo de Rayleigh
  del análisis estático ≈ T1 modal (diferencia < 0.5 %).
* Plantillas: sin errores y todas las verificaciones conformes con los datos por defecto.

## 6. Criterios adoptados y limitaciones

* `VhE020`: la norma fija V «hasta 10 m de altura»; para h < 10 m se toma Vh = V (no se reduce).
* `QtE020`: el texto republicado en gob.pe dice «Cs = 1 − 0.0025(θ − 30°)», pero la publicación oficial de El Peruano
  (9 jun. 2006) dice **0.025**; se adopta 0.025 (Cs = 0 a 70°).
* E.020-2006 ya no contiene la tabla de «tabiquería equivalente» de la versión 1985: el metrado usa el peso real de
  los tabiques (Art. 4.1) y, para tabiquería móvil, 50/100 kgf/m² (Art. 6.3).
* Irregularidad de masa y geométrica: no se aplican a la azotea (último nivel) ni a sótanos (parámetro interno `nsot`).
* El bloque `modal` es plano (traslación en una dirección); la torsión accidental (Art. 45) y la combinación
  direccional (Art. 43) se realizan en el modelo 3D. No incluye efectos P-Δ ni interacción suelo-estructura.
* El bloque `lrb` modela el sistema como bilineal equivalente; dispositivos viscosos, deslizadores y la verificación
  de la fuerza de restitución (E.031 Art. 9.4) quedan fuera del alcance. La plantilla E.031 es un **prediseño** por el
  procedimiento estático (Art. 17); el diseño final exige análisis dinámico, revisión por pares y ensayos.
* En la plantilla E.031 el límite (a) del Art. 21.3 se evalúa con la fórmula de la E.030 (incluido C/R ≥ 0.11) y R0
  de base fija; el límite (b) por viento no se calcula.
* Mapa eólico (E.020 Anexo 2) y mapa de zonificación (E.030 Anexo II) no están digitalizados: V y la zona son datos.

## 7. Revisión independiente

Ver `docs/referencias/revision-peru.md` (hallazgos, gravedad, fuente y corrección de la auditoría del módulo).
