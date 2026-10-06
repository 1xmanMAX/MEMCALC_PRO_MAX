# Revisión independiente del módulo «masonry» (E.070, E.080, E.010, ACI 350/350.3, PCA)

Revisor: supervisor independiente. Fecha: octubre de 2026. Alcance: `src/norms/masonry.js`, `src/blocks/masonry.js`,
`src/templates/masonry.js`, `tests/masonry.test.mjs`, `docs/referencias/masonry.md`.

## 1. Fuentes primarias consultadas

| Fuente | Uso |
|---|---|
| NTE E.070 (DS 011-2006-VIVIENDA, *El Peruano* 10/06/2006), texto oficial con Artículos 1–33 (waltervillavicencio.com/…/E.070.pdf) y texto SENCICO por secciones (jjlsac.com/rnc/Albanileria.pdf) | Tabla 9, Art. 17, 19, 22, 24, 26, 27 (Tabla 11), 28, 29 (Tabla 12), 31 |
| NTE E.080 (RM 121-2017-VIVIENDA, *El Peruano* 07/04/2017) | Art. 4.2, 6, 7.3.1, 8, 9; Tablas 1–3; Fig. 2 |
| NTE E.010 Madera, texto vigente publicado en gob.pe (firmado 11/08/2021) y versión 2006 | Tablas 3, 5, 8, 9; Art. 16–20, 23, 27–31, 41–44 |
| E.030-2003 (Tabla N° 9 de C1), E.030-2018 (Art. 41, 43) y E.030 modificada por RM 183-2026-VIVIENDA (Art. 7.3, 29, 31, 34–37, 57–60, Tablas N° 7 y 15) | C1, cercos, numeración vigente, reservorios |
| ACI 350.3-06 (texto de la norma y comentario) | Ec. 4-1 a 4-15, Tabla 4.1.1(a)/(b), Cap. 5–7, Ec. 9-15 a 9-40, R5.3.3, R6.2 |
| A. San Bartolomé (2006), *Ejemplo de aplicación de la Norma E.070…* (PUCP, 38 p.) | Tablas 8, 16 y 21 (valores publicados) |
| U. de Colorado (2008), *A Design Example for a Circular Concrete Tank — PCA Design Method* | Mu, Vu, fct, φMn |
| An-Najah National University, *A Concise Structural Design Procedure of a Multi-Cell-Tank* | Wi/WL, Wc/WL, hi, hc (rectangular) |

## 2. Puntos declarados por el autor — veredicto

| Punto | Veredicto | Acción |
|---|---|---|
| Oleaje dmax > borde libre sin verificación | **Confirmado (alto).** Reservorio: dmax = 1.80 m frente a 0.60 m; elevado: 1.39 m frente a 0.60 m. Un borde libre de 1.8 m no es realista para un reservorio de 4 m. | Si dmax > borde libre, la masa convectiva se trata como impulsiva (cota superior del método de Malhotra 2005; ACI 350.3 R7.1) en ambos tanques, y en el reservorio se verifica el anclaje de la cubierta a una presión ascendente estimada γ(dmax − borde libre). Con un borde libre suficiente (prueba con Hw = 6 m) el cálculo vuelve a ser el convectivo normal. El bloque `tanque` dibuja la cubierta y rotula «Wc restringida → impulsiva». |
| E.080 en zona 2 con f't de ensayo | **Razonable**, pero no basta como ejemplo general. En zona 4 fallan el corte en X/Y (D/C 1.55/1.63) y la flexión fuera del plano (1.33). Este resultado es correcto: con la norma, la tierra sin refuerzo no cumple el criterio de resistencia en zonas altas. | Se mantiene la zona 2 (la sierra sur y central tiene zonas 2–3). Se agrega una nota que explica el resultado en zonas 3–4 y el criterio de desempeño (Art. 7.3.3). Se agrega FS = 2.5/3.0 (Art. 9, con o sin ensayos). Una prueba confirma NO CUMPLE en zona 4 sin errores. |
| Me = Ve·(M1/V1) | **Aceptable y conservador** para α y para Mu de las columnas. Para muros acoplados por losas, San Bartolomé obtiene Me menores con un modelo elástico. | Se documenta en la memoria y se recomienda usar los Me del modelo elástico cuando haya acoplamiento. |
| Coeficientes sanitarios PCA 1.65/1.30 frente a Sd de ACI 350-06 | El código citaba ACI 350-06 pero usaba los coeficientes de ACI 350R-89/PCA. | El reservorio ofrece una opción (por defecto ACI 350-06): Sd = φfy/(γ fs) con fs = 20 ksi en tracción anular, la Ec. 10-4 en flexión y 24 ksi en corte. Factores totales: 2.70 frente a 2.81 (anular) y 2.11 frente a 2.21 (flexión). Hay prueba. |
| Fuste con fórmula plástica aproximada | **Verificado.** Se comparó con un análisis de fibras por compatibilidad de deformaciones (εcu = 0.003, bloque de Whitney): la fórmula de anillo da +1 a +2 % (3 casos y la plantilla). | Prueba añadida (≤ 3 %). Se corrigió φ = 0.9: ahora φ = 0.9 − 0.2·Pu/(0.1 f'c Ag) ≥ 0.7 (E.060 9.3.2.2). El fuste pasó a De = 3.5 m y #6 @ 10 cm para cumplir con la masa convectiva restringida. |
| Numeración de artículos E.070 | El texto oficial (DS 011-2006) usa Artículos 1–33 y coincide con la tabla de correspondencia del autor. Había errores puntuales. | Se corrigió: f't → Art. 29.8 (se citaba 30.8); C1 → Art. 29.6; sismo severo y moderado → Art. 22 (se citaba 23); armada: 28.1 a/d/k, 28.2 a, 28.3 a/b/f, 28.4 b (se citaban «28.1.11», «28.2.1.g», etc.); L ≥ 1.20 m → Art. 17 c. |
| C1 de la E.030-2003 | Los valores son correctos (1.3/0.9/0.6), pero están en la **Tabla N° 9** (Art. 23), no en la Tabla 12. La E.030 vigente (2018 y RM 183-2026) usa otra escala (C1 = 3.0/2.0/1.5, Tabla N° 15) y, para cercos, F = 0.5·Z·U·S·Pe (Art. 60), × 0.8 en esfuerzos admisibles (Art. 29). | La plantilla del cerco calcula ambas cargas y usa la mayor: w = máx(0.8ZUC1γe; 0.4ZUSγe). Con C1 = 0.6 ambas coinciden para S = 1.2. fu = 1.25 queda justificado como 1/0.8 (Art. 29). |

## 3. Otros hallazgos (corregidos)

| # | Hallazgo | Severidad | Corrección |
|---|---|---|---|
| 1 | Albañilería armada: «φMn ≥ Mu» usaba Mn1 con Pu = 1.25 Pm. La norma dimensiona As con Pu = 0.9 Pg (28.3 b); Mn1 (1.25 Pm) solo sirve para Vuf (28.3 f). La verificación no era conservadora. | Alta | Ahora Mn se calcula con 0.9 Pg y Mn1 se usa en Vuf. |
| 2 | Columna de confinamiento: con T < 0, Ast negativo reducía Asf. | Media | Ast = max(T, 0)/(φ fy). |
| 3 | Faltaban los límites del Art. 27 a (hasta 5 pisos o 15 m). | Media | Se agregaron dos `check`. |
| 4 | ACI 350.3 R6.2: la tensión anular convectiva es Ncy = 16 Pcy/(9π), no 2 Pcy/π. | Baja (era conservador) | Corregido. |
| 5 | La aceleración vertical suponía Ct = SDS sin calcular Tv. | Baja | Nuevas funciones `TvACIc` (Ec. 9-31) y `CtACI` (Ec. 9-39/40; 0.4 SDS en rectangulares); üv = Ct I b/Ri ≥ 0.2 SDS. |
| 6 | No se verificaba el espesor mínimo de 12 in en muros de 10 ft o más en contacto con líquido (ACI 350-06 14.6.2); los tanques tenían tw = 0.25 y 0.20 m. | Media | Se agregó el check; tw = 0.30 m en reservorio y cuba. |
| 7 | Las raíces √(1 − 2Rn/0.85f'c) daban número complejo/NaN con secciones insuficientes (cisterna con tw = 0.10 m daba error). | Media (robustez) | √(máx(0, …)) más el check ρ ≤ 0.75ρb (E.060 10.3.4) en el cerco, la cisterna y el reservorio. |
| 8 | `NadmE010` lanzaba error con λ > 50 y `kmE010` con N ≥ Ncr/1.5: errores en cadena en vez de NO CUMPLE. | Media (robustez) | Ya no lanzan error; km devuelve 1000 y hay checks explícitos λ ≤ 50 y N < Ncr/1.5. |
| 9 | E.010: el texto vigente (2021) añade el grupo D, admite lef = 0.9 l en armaduras (antes JUNAC 0.8), fija L/350 ≤ 13 mm para carga viva, h/b hasta 5, +10 % con acción de conjunto a ≤ 60 cm, contraflecha L/300 para L > 8 m, λ ≤ 80 en tracción y la regla de correas λfuera ≤ λplano. Las columnas circulares usan 0.2467 y λ < 9 / ≤ 43. | Media | Se incorporaron a las funciones y plantillas. La viga pasa a 3"×10" (h/b = 3.7) con luz de 4.20 m. La diagonal del tijeral usa λ = máx(0.9 l/d, l/b), antes 0.8 l/b. |
| 10 | Citas a la E.030-2018 (Art. 26, 28.x; Tablas 3, 4, 5). | Baja | Se actualizaron a la E.030 vigente (RM 183-2026): Art. 31, 34–37; Tablas N° 1, 4, 5, 6 y 7. Reservorios: categoría A2 y Art. 7.3. |
| 11 | La importancia ACI (Tabla 4.1.1(a): 1.25 para líneas vitales) se mezcla con U = 1.5 de la E.030. | Informativa | Se documenta y se ofrece una lista [1.0, 1.25, 1.5]; se mantiene 1.5 (conservador). |
| 12 | Visual: la tabla del bloque `cilindro` mostraba «−2.196e-18» y «−0.0000». El reservorio apoyado se dibujaba sin cubierta. | Baja | Se redondea el cero numérico; nuevo campo `cubierta`. |

Verificado sin cambios: Tabla 9 de la E.070 (los 10 valores); Em = 500/600/700 f'm; Fa; ZUSN/56; Vm (0.5 y 0.35); α;
2 ≤ Vm1/Ve1 ≤ 3 (la E.070-2006 no contiene un límite «1.25 ≤ Vm1/Ve1»; el 1.25 corresponde a Mu = 1.25 Me y
Vu = 1.25 Ve de la albañilería armada); Tabla 11; Ec. 27.3; Tabla 12; Tablas 1–3 de la E.080 y los límites de la Fig. 2;
ecuaciones de Housner 9-1 a 9-30; Ri = 2.0 / 3.25 / 1.5 / pedestal 2.0, Rc = 1.0; Ci, Cc (continuidad en 1.6/Ts);
Eq. 4-5, 4-10, 4-13; Ec. 7-2; teoría de cáscaras (Tablas PCA A-1, A-2, A-5, A-12); placas por diferencias finitas.

## 4. Ejemplos publicados añadidos a las pruebas

* **San Bartolomé (2006):** VE = 144.0 t (Tabla 8); muro X1: α = 0.58, Vm = 12.82 t, Vm1/Ve1 = 2.04. Muro X3: α = 0.80,
  Vm = 17.76 t, factor 3.10 → 3.00, Vu = 17.16 t, Mu = 67.53 t·m (Tabla 16). Columna C3: Vc = 8.88 t, Acf = 298 cm²,
  T = 4.47 t, C = 24.37 t, An = 155 cm², s1 = 7.91 cm y s2 = 14.22 cm (Tabla 21). Todos coinciden en ≤ 0.5 %.
  San Bartolomé redondea α a dos decimales; con α exacto, Vm(X1) = 12.75 t.
* **PCA / Colorado:** Mu = 19 642 lb·ft/ft, Vu = 7 445 lb/ft, fct = 233 psi y φMn = 35 553 lb·ft/ft reproducidos.
  El ejemplo redondea H²/Dt = 2.84 a 3.0; con 2.84 el coeficiente exacto de momento es algo mayor.
* **An-Najah (ACI 350.3, rectangular L/HL = 1.72):** Wi/WL = 0.60, hi/HL = 0.37 y hc/HL = 0.60 coinciden. Para Wc/WL
  el artículo lee 0.40 en el gráfico, mientras que la Ec. 9-2 da 0.43.
* **Datos extremos:** 15 variantes (más carga o pisos, Me alto, cerco alto, adobe en zona 4, luces largas, columnas
  esbeltas, muros delgados, fuste alto o delgado) dan NO CUMPLE sin errores ni NaN.

## 5. Pendientes y limitaciones

* La presión ascendente del oleaje sobre la cubierta es una estimación (columna de agua no acomodada). Tratar toda
  Wc como impulsiva es una cota superior. Para un diseño definitivo de la losa de cubierta conviene aplicar
  Malhotra (2005) completo.
* Sd se aplica también a la combinación sísmica y a Vc del concreto, lo que es conservador.
* ACI 350-06 14.6.2 (12 in) se verificó solo en fuentes secundarias, igual que el «8 in» de ACI 371R para pedestales,
  que se presenta como criterio de la memoria. Se recomienda contrastarlos con el texto ACI.
* `wallplan` usa h/20 en todas las zonas: la E.070 admite h/25 en la zona 1, así que el cálculo es conservador.
* La E.070-2006 cita la zonificación de 3 zonas de la E.030-2003; se interpretó «zonas 2 y 3» como zonas 2–4 del mapa vigente.
