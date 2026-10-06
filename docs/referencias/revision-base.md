# Revisión independiente de las plantillas base (`src/templates.js`)

Revisor: supervisor independiente. Fecha: octubre de 2026. Alcance: las 22 plantillas originales (viga, vigacont,
columna, zapata, aci, ec2, portante, muro, aligerado, sismo, asce7, japon, espectros, sismo2018, puente, acero,
predim, combos, albanileria, escalera, guia, blanco). Solo se modificaron `src/templates.js` (sin tocar los exports
`CATEGORIES`/`TEMPLATES` ni la lógica final) y `tests/verify.mjs`.

## Fuentes contrastadas

* **NTE E.030-2018**, RM N° 355-2018-VIVIENDA, *El Peruano* 7 dic. 2018 (texto oficial, leído con `pdftotext`):
  Tablas N° 3–11, Art. 17, 21.1, 28.1.2, 28.2.2, 28.3.2, 28.4.1, 31.1–31.2, 32.
* **NTE E.030-2026** (RM N° 183-2026-VIVIENDA) a través de la revisión del módulo Perú (`revision-peru.md`) y de las
  funciones ya validadas `ZE030`, `SE030`, `UE030`, `R0E030`, `CTE030`, `sisE030`, `dlimE030`, `kE030`.
* **NTE E.060-2009** (DS 010-2009-VIVIENDA, texto oficial gob.pe): 7.6.1, 8.11.8, 9.6.2, 9.7.2–9.7.3, 10.3.4, 10.5.2,
  10.5.4, 10.9.1, 11.5.5, 11.5.6, 11.5.7.9, 11.12.2.1, 12.2.2 (Tabla 12.1), 12.3.2, 14.3, 15.4, 15.7, 21.4.4,
  21.5.1, 21.6.1, 21.6.3, 21.6.4.
* **NTE E.050-2018** (Art. 20.4, 21, 22.2, 23.1, 26.2, 39.13.6) según `docs/referencias/geotech.md` y `walls.md`.
* ACI 318-19 (9.3.3.1, 9.6.1.2, 9.6.3.4, 9.7.6.2.2, 21.2.2, 22.2.2.4.3, 22.5); EN 1992-1-1 (3.1, 5.5(4), 6.1, 6.2,
  9.2.1.1, 9.5N, 9.6N); ASCE 7-22 (Tablas 1.5-2, 12.2-1, 12.6-1, 12.8-1, 12.8-2, 12.12-1; 12.8.1–12.8.6);
  AASHTO LRFD 9.ª ed. (2.5.2.6.3, 4.6.2.3, 5.6.2.1, 5.6.3.3, 5.6.7, 5.10.3.2, 5.10.6, 5.12.2.1); AISC 360-16 (B4.1b,
  F2, G2.1); BSL / Notificación MOC 1792–1793.

## Hallazgos y correcciones

| # | Plantilla | Hallazgo | Gravedad | Fuente | Corrección |
|---|---|---|---|---|---|
| 1 | sismo | No verificaba sistema permitido (Tabla 9), Ts < 0.65 TP, restricciones de irregularidad (Tabla 13) ni aplicabilidad del estático (Art. 33.2); la deriva se controlaba en el centro de masas. | Alta | E.030-2026 Art. 14.2, 14.8, 21, 25, 33.2, 51 | Reescrita como **versión rápida**: `categoria`, `sistema` (códigos de `R0E030`), `check sisE030(...) == 1`, `Ts`, Tabla 13 con Ia/Ip, Art. 33.2, `CT = CTE030(sistema)` (opción muros en cajas → 45), `k = kE030(T)`, `rt` → `deriva_max`, `dlim` según el material del sistema, `fCR` (Art. 50.3). Remite a *pe-e030-estatico*. |
| 2 | sismo | `C/R ≥ 0.11` correcto como mínimo (no check); el 100 % + 30 % citaba Art. 28.1 (numeración 2018). | Baja | Art. 33.3, 34.2 | Citas actualizadas a la numeración 2026. |
| 3 | sismo2018 | Aplicabilidad del estático citada como 28.1.1 y verificada solo `hn ≤ 30` (sin regularidad ni muros portantes); sin Tabla 6 ni Tabla 10; deriva en el centro de masas (con el extremo, los datos por defecto daban D/C 1.04). | Alta | E.030-2018 Art. 17, 21.1, 28.1.2, 31, 32 | Zona y perfil S0–S3 por código (Tablas 3 y 4 exactas), `sisE030` (la Tabla 6 de 2018 coincide con la Tabla 9 de 2026; verificado en el texto oficial: A sin OCBF, B con SMF/IMF/SCBF/OCBF/EBF, pórticos, dual, muros, albañilería y madera), R0 EMDL = 4, Tabla 10, Art. 28.1.2, `rt`, Tabla 11 (EMDL 0.005), Art. 31.2. Desplazamientos por defecto ajustados (0.22–0.28 cm). Se aclara que la E.030-2018 no exige Ts. |
| 4 | columna | Espaciamiento fuera de Lo con 7.10.5 (16db, 48de, b, 30 cm): **no conservador** para columnas sísmicas. | Media | E.060 21.6.4.5 | `s_fuera = min(10 db, 25 cm)`. |
| 5 | columna | so con b/4 (ACI) en vez de b/3; `bc` medido al exterior del estribo; `48*db(4)` fijo; `est` usado antes de definirse; faltaban 21.6.1 y hx. | Baja | 21.6.1.2–3, 21.6.4.1 b, 21.6.4.2, 21.6.4.3, 21.4.5.3 | so = min(b/3, 6db, 10 cm); bc centro a centro; checks de dimensión, relación, diámetro de estribo y hx ≤ 35 cm. `DCpm` infinito (Pu > φPn,máx) ya no produce error. Remite a *co-colductil*, *co-biaxial*, *co-colesbelta*. |
| 6 | viga | so en zona confinada sin el mínimo de 15 cm para d/4; faltaba s ≤ 0.5d (21.4.4.5); Av,min citado como 11.5.6.3. | Baja | E.060 21.4.4.4–5, 11.5.6.1–2 | Corregido; check de sección suficiente (evita raíz negativa); `s` nunca 0. |
| 7 | zapata | «Para sismo la presión admisible puede incrementarse 30 %»: la E.050-2018 usa FS = 2.5 en lugar de 3.0 → **1.20 qa**. | Media | E.050-2018 Art. 21 | Verificación con sismo (`PS`, `MS`, `qaSismoE050`), resultante en el núcleo. |
| 8 | zapata | ld con constantes ACI (6.7/5.4); la Tabla 12.1 de E.060 da 8.2/6.6 (MKS). Faltaban Df ≥ 0.80 m, altura ≥ 300 mm (15.7), αs por posición y γs (15.4.4.2). | Baja | E.060 12.2.2, 12.3.2, 15.4.4.2, 15.7; E.050 26.2 | `ldE060`, `ldcE060`, checks y γs; `qn ≤ 0` ya no da NaN. |
| 9 | portante | Nγ de Vesic con FS fijo, sin verificación ni resumen; φ = 0 daba NaN (cot 0). | Baja | E.050 Art. 20.4, 21, 22.2, 23.1, 26.2 | **Versión rápida**: Nγ Meyerhof (E.050) o Vesic, FS 3.0/2.5, Df ≥ 0.80 m, Df/B ≤ 5, `qserv ≤ qadm`, Nc = 5.14 si φ = 0. Remite a *ge-portante*. |
| 10 | muro | FS volteo 2.0 y deslizamiento 1.5 como «criterio usual» sin norma; sin control de espaciamiento ni talón; e negativa mal tratada. | Baja | E.050 39.13.6; E.060 14.3.1, 14.3.3, 9.2.4 | **Versión rápida**: `FSv_min` (1.5 E.050 / 2.0 usual), `FSd_min = FSminE050(0)`, |e|, talón > 0, s ≤ 3t y 40 cm, acero colocado, refuerzo horizontal 0.002. Remite a *wa-voladizo* y al bloque *retwall*. |
| 11 | vigacont | Sin As,máx, sin diseño de estribos; deflexión con Ig presentada sin advertencia. | Baja | E.060 10.3.4, 11.5, 9.6.2.4 | Check 0.75 Asb, Vs ≤ 2.1√f'c bd y espaciamiento de estribos; nota a *co-deflexion*. |
| 12 | aligerado | Peso propio con `si` anidado; sin control de alma para M⁻; sin referencia a la Tabla 9.1. | Baja | E.020 Anexo 1; E.060 9.6.2.1 | `pAligE020(h)`, check de alma, hmin = L/18.5 informativo (con la práctica L/25 debe calcularse la deflexión). |
| 13 | aci, ec2 | Raíz negativa con momentos grandes; EC2 no verificaba M_Ed ≤ M_Rd con la armadura dispuesta. | Media (EC2) | EN 1992-1-1 6.1, 5.5(4) | Checks de sección suficiente; EC2: `xp/d ≤ 0.45`, `MRd`. |
| 14 | asce7 | R, Cd, Ct, x, Ie y deriva admisible eran listas independientes (combinaciones incoherentes posibles); T = Ta sin límite Cu·Ta para el periodo del modelo; sin aplicabilidad del ELF. | Media | ASCE 7-22 Tablas 12.2-1, 12.8-2, 1.5-2, 12.12-1, 12.6-1; 12.8.2 | `sistema` y `riesgo` por código derivan R, Cd, Ct, x, Ie y Δa; `T = min(Tmod, Cu·Ta)`; check Tabla 12.6-1 (regular con T < 3.5 Ts, o hn ≤ 160 ft con irregularidades permitidas). |
| 15 | puente | Sin verificación de sección controlada por tracción (φ = 0.9) ni espaciamiento máximo. | Baja | AASHTO 5.6.2.1, 5.5.4.2, 5.10.3.2 | `epst ≥ 0.005`, s ≤ 1.5h y 450 mm; nota de η = 1 y referencias al módulo de puentes. |
| 16 | japon | Equivalente a *jp-bsl-ruta12/ruta3* pero más simple. | — | — | Renombrada **(versión rápida)**; descripción de Fs·Fe. |
| 17 | espectros | La curva peruana usaba C del estático (sin rama T < 0.2 TP) mientras ASCE/EC8 incluyen la rampa. | Baja | E.030-2026 Art. 41, Tabla 6 | `CE030d` en curva y tabla. |
| 18 | albanileria | t ≥ h/20 aplicado también a zona 1 (h/25); listas Z/U sin etiquetas; faltaba el criterio de refuerzo horizontal. | Baja | E.070 Art. 19.1 a, 27.1 | Corregido; texto calculado del Art. 27.1; remite a *ma-edificio*, *ma-armada*. |
| 19 | escalera | Faltaban paso ≥ 25 cm y contrapaso ≤ 18 cm; raíz negativa con luces grandes. | Baja | RNE A.010; E.060 10.5.4 | Checks añadidos, acero colocado ≥ requerido. |
| 20 | predim, combos | Sin resumen ni checks; combos sin Pu mín. ni otras combinaciones. | Baja | E.060 9.2, 21.5.1.2–3 | predim: b ≥ 0.25h y ≥ 25 cm, Ln ≥ 4h, h de Tabla 9.1; combos: Pu,mín y nota 9.2.2–9.2.5 y 21.4.3. |
| 21 | acero | Correcta (Lp, Lr, φMp contra la Tabla 3-2). | — | AISC 360-16 F2/G2 | Texto de alcance (360-22 sin cambios en F2/G2), uso de `sec()` y *steelsec*. |
| 22 | guia | No mostraba funciones normativas, textos, matrices ni bloques registrados. | — | — | Reescrita: listas con etiquetas, checks lógicos, funciones de Perú/Chile/Japón/EE. UU./E.060/muros/geotecnia, `perfil = "W12X26"` con `sec()`, bloque *steelsec*, vectores, matrices (`lusolve`, `det`), tabla de todos los bloques por grupo, ejemplos vivos de *frame2d* y *modal* con variables exportadas (`Mmax`, `T1`, `Vdin`, `deriva_din`). |

Valores verificados que no requirieron cambio: β1 (E.060 10.2.7.3, ACI 22.2.2.4.3), As,mín 0.7√f'c/fy (E.060 10.5.2,
0.22√f'c MPa), Vc 0.53√f'c, Vs ≤ 2.1√f'c, límites 1.1√f'c (11.5.5.3), punzonamiento 0.53(1+2/β), 0.27(αs d/bo + 2),
1.06 (11.12.2.1), Ash ec. 21-3/21-4, Lo (21.6.4.4), ρ 1–6 %, viguetas 1.1Vc (8.11.8), temperatura 0.0025 lisas y
5h ≤ 40 cm en aligerados (9.7.2–9.7.3), E.070 (19.1 b, 19.2 b, 26.2, 26.3, Tabla 9 King Kong industrial), ACI 318-19
(φ variable, εt ≥ 0.004, Tabla 22.5.5.1 con λs, Av,mín), EC2 (CRd,c, k, vmin, ν1, 9.5N, 9.6N), ASCE 7-22 (12.8-2 a
12.8-6, k, Cd/Ie), AASHTO (h mín, E1/E2, IM, Resistencia I, Mcr con γ1 = 1.6 y γ3 = 0.67, 1750/√L, temperatura
5.10.6, fisuración γe = 0.75), BSL (Rt, Ai, Ci, Qun).

## Coherencia con los módulos

Se conservaron todos los `id` (memorias guardadas). Renombradas con «(versión rápida)» y con referencia explícita a la
plantilla completa: **sismo** → *pe-e030-estatico/dinamico/irregularidades*; **portante** → *ge-portante*;
**muro** → *wa-voladizo*; **japon** → *jp-bsl-ruta12/ruta3/n1461*. Las demás (viga, vigacont, columna, zapata,
aligerado, albanileria, combos, predim, puente, acero, espectros) no tienen un equivalente directo y se mantienen como
plantillas generales, con remisión a las plantillas especializadas pertinentes. *sismo2018* sigue siendo la única
plantilla estática con la E.030-2018 (transición).

## Pruebas (`tests/verify.mjs`)

* Valores de control: V E.030-2018 y 2026 a mano; deriva en el extremo; C/R = 0.11 aplicado con fCR = (C/R)/0.11 y V
  correspondiente; so y s fuera de Lo de la columna; T = min(Tmod, Cu·Ta) ASCE 7-22; qa sísmica 1.20 qa; Nγ Meyerhof.
* Datos extremos en 27 casos de 17 plantillas: NO CUMPLE en la verificación esperada, sin errores ni NaN y sin
  «TODAS CUMPLEN».
* Con los datos por defecto las 22 plantillas base cumplen todas sus verificaciones (`node tests/verify.mjs`: 194/194).

## Limitaciones que permanecen

* `SE030` (motor) lanza un error en suelo S4 (Vs30 < 200 m/s) en zona 4: es intencional (la norma exige estudio de
  sitio), pero la memoria muestra errores en cascada. No se modificó el motor (fuera del alcance).
* En *sismo*/*sismo2018* las irregularidades se eligen a mano (Ia, Ip); la evaluación automática está en *irregE030*.
  La excepción de la Tabla 9 para cobertura liviana (nota *) no se automatiza.
* Las restricciones de la Tabla 13 para categoría A1 no se incluyen (las listas solo ofrecen A2, B y C).
* *vigacont* y *aligerado* diseñan con momentos y cortantes en ejes (conservador).
* El paso ≥ 25 cm y el contrapaso ≤ 18 cm de *escalera* corresponden a la RNE A.010 vigente; verificar si el
  proyecto exige valores distintos (p. ej. escaleras de evacuación).
