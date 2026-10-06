# Módulo «chile» — fuentes, verificación y alcance

Archivos: `src/norms/chile.js`, `src/blocks/chile.js`, `src/templates/chile.js`, `tests/chile.test.mjs`.
Unidades de las plantillas: sistema técnico (tonf, m, cm, kgf/m²), habitual en la práctica chilena;
materiales de hormigón y acero en MPa (NCh170, NCh204, DS60 basado en ACI 318-08 SI).

## Fuentes consultadas (texto normativo verificado)

| Norma | Fuente | Qué se verificó |
|---|---|---|
| NCh433.Of1996 Mod.2009 + D.S. N° 61 (V. y U.) 2011, **texto refundido** | <https://ingenieria-civil.github.io/chile/normas/00-NCh-433-Of-1996-Mod-2009-DS-61-2011-refundido.pdf> | Tablas 4.2, 4.3, 5.1, 6.1–6.5; ec. 6-1 a 6-14; 5.5.1, 5.9, 6.2.1, 6.2.3.1.1–6.2.3.1.3, 6.2.8, 6.3.4, 6.3.7 (la ec. 6-12 se leyó de la imagen de la página: $S_{de} = T_n^2/(4\pi^2)\,\alpha\,A_0\,C_d^*$, sin $S$) |
| NCh2369.Of2003 | Copia de la norma en U-Cursos (U. de Chile, CI3201): <https://www.u-cursos.cl/ingenieria/2014/2/CI3201/1/material_docente/> | 4.3.2 (I), 5.1.3, 5.2.2, ec. 5-1 a 5-8, Tablas 5.2–5.7, 6.1, 6.2, 6.3, 6.4 |
| NCh2369:2023 (consulta pública acotada 2024; oficializada como NCh2369:2025 por D.Ex. N° 12 MINVU, D.O. 9-mar-2026, vigente 6 meses después) | <https://www.consultapublica.cl/PdfDoc/NCh02369-2024-043.pdf> · <https://www.carey.cl/minvu-aprueba-nueva-norma-chilena-de-diseno-sismico-para-estructuras-e-instalaciones-industriales> | 5.4.1 (ec. 1 y 1.1), 5.4.2 (ec. 3), Tabla 5 (S, T0, p, T1), 5.5.1, 5.12 (Cmín = 0,25·I·S·Ao/g) |
| D.S. N° 60 (V. y U.) 2011 — hormigón armado | MINVU: <https://www.minvu.gob.cl/elementos-tecnicos/decretos/d-s-n-60-v-y-u-2011/> (PDF escaneado, leído página a página) | 9.1.4 (factor 1,4 para sismo), 21.1.5.2, 21.9.1.1 (lu/16), 21.9.2.2 (doble malla), 21.9.2.4, 21.9.5.3 (0,35 f'c Ag), 21.9.5.4 (ec. 21-7a/b, εc ≤ 0,008), 21.9.6.2 (ec. 21-8 sin 0,007), 21.9.6.4 (ec. 21-8a, espesor ≥ 300 mm), 21.9.6.5, 21.9.7.1 |
| NCh432.Of71 | U-Cursos (CI3201): <https://www.u-cursos.cl/ingenieria/2014/2/CI3201/2/material_docente/> | Tabla 1 (presión básica vs. altura, ciudad y campo abierto), 9.2.1 (C = 1,2 sen α) |
| NCh432:2010 | Dlubal (mapa de velocidades 30–55 m/s, qz = 0,613·Kz·Kzt·Kd·V²·I): <https://www.dlubal.com/es/zonas-de-cargas-para-nieve-viento-y-sismos/viento-nch-432.html> | Forma de qz y rango de V. Kz, G, Cp y GCpi se tomaron de ASCE 7-05 cap. 6 (Tabla 6-3, Fig. 6-6), del cual NCh432:2010 es adaptación |
| NCh432:2025 (base ASCE 7-22) | <https://logistica360chile.cl/actualizan-norma-chilena-nch-432-cargas-de-viento/> | Solo existencia y fecha (17-jul-2025). **No implementada** |
| NCh3171.Of2010 | Tesis UACh 2014 (Ing. Civil), cap. 3.2: <http://cybertesis.uach.cl/tesis/uach/2014/bmfcip171c/doc/bmfcip171c.pdf>; DS60 9.1.4 | Combinaciones por resistencia (1,4D; 1,2D+1,6L+0,5Lr; …; 1,2D+1,4E+L; 0,9D+1,4E) |

## Tablas implementadas (valores literales)

**NCh433 + DS61** — Ao: zona 1/2/3 = 0,20/0,30/0,40 g. I (DS61): cat. I = 0,6; II = 1,0; III = IV = 1,2.
Tabla 6.3 (S, To, T', n, p): A 0,90/0,15/0,20/1,00/2,0 · B 1,00/0,30/0,35/1,33/1,5 · C 1,05/0,40/0,45/1,40/1,6 · D 1,20/0,75/0,85/1,80/1,0 · E 1,30/1,20/1,35/1,80/1,0 (F: estudio especial → error).
Tabla 6.4 Cmáx/(S·Ao/g): R = 2 → 0,90; 3 → 0,60; 4 → 0,55; 5,5 → 0,40; 6 → 0,35; 7 → 0,35 (interpolación lineal para R intermedios, criterio propio).
Tabla 6.5 Cd*: A, B, C, D por tramos (suelo E: estudio especial → error).

**NCh2369.Of2003** — I: C1 1,20; C2 1,00; C3 0,80. Tabla 5.4 T'/n: I 0,20/1,00 · II 0,35/1,33 · III 0,62/1,80 · IV 1,35/1,80.
Tabla 5.7 (zona 3; ×0,75 zona 2, ×0,50 zona 1): R=1: 0,79/0,68/0,55 · R=2: 0,60/0,49/0,42 · R=3: 0,40/0,34/0,28 · R=4: 0,32/0,27/0,22 · R=5: 0,26/0,23/0,18 para ξ = 0,02/0,03/0,05 (interpolación lineal en R y ξ, criterio propio).

**NCh2369:2023** — Tabla 5: A 0,90/0,15/1,85 · B 1,00/0,30/1,60 · C 1,05/0,40/1,50 · D 1,20/0,75/1,00 (S/T0/p). Sa = 0,7·I·SaH/R·(0,05/ξ)^0,4 con SaH = 1,4·S·Ao·α(T0, p); meseta Smáx = 2,75·I·S·Ao/(R+1)·(0,05/ξ)^0,4 desde T = 0 hasta la intersección con la rama descendente.

## Funciones (`defineFns`, categorías «Sismo — Chile» y «Viento — Chile»)

`AoNCh433, INCh433, SNCh433, ToNCh433, TpNCh433, nNCh433, pNCh433, alphaNCh433, SaNCh433, RstarNCh433, RstarNNCh433, CNCh433, CmaxNCh433, CminNCh433, fNCh433, AkNCh433, CdNCh433, SdeNCh433`,
`TpNCh2369, nNCh2369, INCh2369, CNCh2369, CmaxNCh2369, CminNCh2369, SaNCh2369, SaNCh2369v23`,
análisis modal de edificio de cortante (NCh433 6.3): `TmodosCL, phiModosCL, GammaModosCL, MeffModosCL, FmodalCL, UmodalCL, cortesCL, entrepisoCL, cqcNCh433` (ρij de la ec. 6-14, ξ = 0,05),
viento: `KzNCh432, qzNCh432, CpTechoNCh432, CpTechoSotNCh432, CpMuroSotNCh432, qNCh432Of71`.
Suelo NCh433: código 1..5 (= A..E) o texto `"A"`…`"E"`. Suelo NCh2369.Of2003: 1..4 (= I..IV).

## Validación (tests/chile.test.mjs)

- Valores de tabla literales; α(To) = 2,75 exacto; R* y C contra cálculo manual; Σ Ak = 1.
- Sde contra la ec. 6-12 evaluada a mano (suelo B, T = 1,125 s, zona 2 → 9,57 cm; δu = 1,3·Sde = 12,44 cm).
- Modal: sistema de 2 GDL con masas y rigideces iguales (ω² = (3 ∓ √5)/2·k/m, Γ1 = 1,1708, M1* = 94,7 %);
  coeficiente CQC contra la fórmula de Der Kiureghian (r = 0,8 → ρ = 0,1656).
- Kz contra ASCE 7-05 Tabla 6-3 (caso 2): B 0,70, C 0,98, D 1,16 a 9,1 m; C 0,85 bajo 4,6 m.
- NCh432.Of71 Tabla 1 (75 kgf/m² a 15 m en ciudad; 106 kgf/m² a 10 m en campo abierto).
- Bloques: Sa exportado, Mn de muro acotado, cc según ec. 21-8a; plantillas sin errores y con todas las verificaciones conformes; datos absurdos producen fallas.

## Limitaciones conocidas

1. **NCh432:2010**: no se tuvo acceso al texto completo; Kz, G, Cp (techo según ASCE 7-05 Fig. 6-6, θ < 10° se toma como 10°), GCpi y el factor de importancia (0,87/1,00/1,15) provienen de ASCE 7-05, base declarada de la norma. La carga mínima 0,48 kN/m² se cita de ASCE 7-05 6.1.4.1. Verificar con la versión exigida (NCh432:2025 ya publicada).
2. **NCh3171**: las combinaciones por tensiones admisibles (factor 1,0 para E, 0,75 en combinaciones con varias cargas eventuales, 0,6D) se basan en ASCE 7-05 adaptado; se recomienda contrastarlas con el texto oficial (existe edición NCh3171:2017).
3. **NCh2369:2023/2025**: solo se implementa el espectro horizontal de diseño (comparación). Sus tablas de R/ξ (Tabla 6), espectro vertical y requisitos de espectro de sitio para suelos D/E no se implementan.
4. El análisis modal es de **edificio de cortante plano** (un GDL por piso). La torsión accidental 3D (±0,05 b) debe hacerse en el modelo completo.
5. `muroCL`: sección rectangular con barras de borde en dos capas y malla en el alma; εcu = 0,003, bloque de Whitney, acero elastoplástico (Es = 200 GPa). No cubre muros T/L (DS60 21.9.5.2: ancho efectivo del ala).
6. Interpolaciones lineales en Tablas 6.4 (NCh433) y 5.7 (NCh2369) para valores no tabulados: criterio del módulo, no de la norma.
