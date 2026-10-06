# Revisión independiente — módulo «chile»

Revisor: agente supervisor (revisión escéptica). Fecha: 2026-10-06.
Archivos revisados: `src/norms/chile.js`, `src/blocks/chile.js`, `src/templates/chile.js`, `tests/chile.test.mjs`, `docs/referencias/chile.md`.
Resultado final: `node tests/chile.test.mjs` → 136 correctas, 0 fallidas (antes 98); `node tests/verify.mjs` → 156 correctas, 0 fallidas.

## Fuentes primarias contrastadas

| Fuente | Uso en la revisión |
|---|---|
| NCh433.Of1996 Mod.2009 + DS61, texto refundido (ingenieria-civil.github.io/chile/normas/00-NCh-433-Of-1996-Mod-2009-DS-61-2011-refundido.pdf) | Tablas 4.2, 5.1, 6.1–6.5; 5.5.1, 5.9, 5.10, 6.2.1, 6.2.3, 6.2.5, 6.2.7, 6.2.8, 6.3.5, 6.3.6, 6.3.7. La ec. 6-12 se revisó en la imagen de la página (Sde = Tn²/(4π²)·α·A0·Cd*, sin S). |
| NCh2369.Of2003 (copia en idoc.tips) | 4.3.2, 5.1.3, 5.2.2, 5.3.3, 5.5.1 (vertical), 6.1 (R1), 6.2.1 (separación), 6.3; Tablas 5.5, 5.6, 5.7. |
| NCh2369:2023, consulta pública (consultapublica.cl/PdfDoc/NCh02369-2024-043.pdf) | 4.3.2, 5.4.1, 5.4.2 (ec. 1 a 4, revisada en la imagen de la página), 5.5.1, 5.12, Tablas 3–6. |
| Apunte CI3201 U. de Chile (u-cursos, 2016) | Combinaciones NCh3171.Of2010 LRFD y ASD. |
| E. Meriño Sepúlveda, memoria de título, U. del Bío-Bío (repobib.ubiobio.cl) | Ejemplo numérico publicado de análisis estático (Anexo A, Tablas 1–4) y forma de las ec. 21-7a/b del DS60 usada en la práctica. |

## Hallazgos y correcciones

| # | Hallazgo | Gravedad | Fuente | Corrección |
|---|---|---|---|---|
| 1 | NCh433, NCh2369.Of2003: tablas (Ao, I, S/To/T'/n/p, Cmáx 6.4, Cd* 6.5, T'/n 5.4, Cmáx 5.7, I, ξ, R), fórmulas C, Cmín, f, Ak, α, R*, Sde, CQC, R1 y límites 6.2.1/6.3.7 | — (correcto) | NCh433 refundido; NCh2369.Of2003 | Sin cambios. Se confirmó continuidad de las ramas de Cd*. |
| 2 | Tabla 6.4 no tabula R = 5 (acero IMF, que sí está en la Tabla 5.1): la interpolación lineal da 0,45·S·Ao/g. Es criterio del módulo, no de la norma | Baja | NCh433 Tablas 5.1 y 6.4 | Documentado en el código y probado; el usuario puede preferir 0,55 (R = 4), más conservador. |
| 3 | NCh2369:2023: faltaban espectro vertical (ec. 2 y 4), I por categoría I–IV y Cmín = 0,25·I·S·Ao/g; no se validaba ξ ∈ [0,02; 0,05]; suelo D usado sin advertir que exige espectro de sitio salvo R = 1 | Media | NCh2369:2023 5.4, 4.3.2, 5.12, Tabla 5 nota 2 | Nuevas funciones `SaVNCh2369v23`, `INCh2369v23`, `CminNCh2369v23`; errores explícitos para ξ y R; advertencia de suelo D en `spectrumCL`; opción «espectro vertical» en el bloque. |
| 4 | NCh2369:2023 Tabla 6 (R y ξ) no estaba revisada | Media | Tabla 6 | Leída completa. La plantilla usa el ítem 5.5 (R = 5, ξ = 0,03 empernado), que coincide con la versión 2003 (Tabla 5.6 ítem 3.4). Se añadió a la plantilla un cálculo comparativo del corte basal 2023 (C = Sa(T*)/g con I incluido; Cmín 2023). |
| 5 | Plantilla NCh2369: corte por marco Qo/11 (promedio de 11 marcos) subestima el marco interior (tributario 6/60 = Qo/10) | Media | Estática | `Qmarco = Qo·s/L`. |
| 6 | Plantilla NCh2369: separación con 0,002·H, pero 6.2.1 usa 0,002·(hᵢ + hⱼ); no había verificación | Media | NCh2369.Of2003 6.2.1 | Altura de la estructura vecina, fórmula corregida y `check` de la separación proyectada. |
| 7 | Plantilla NCh2369: la variable nueva `s` rompía los gráficos con `x s` (sombra de la unidad «s») | Baja (detectada en revisión) | — | Renombrada a `sm`. |
| 8 | Viento NCh432 (función `CpTechoNCh432`): para θ < 10° usaba los Cp de θ = 10° (−0,7), menos severos que los de ASCE 7-05 Fig. 6-6 para techos planos (−0,9 / −1,3 en el borde de barlovento) — **no conservador** | Alta | ASCE 7-05 Fig. 6-6 (base de NCh432:2010) | Envolvente: barlovento −0,9 (h/L ≤ 0,5) a −1,3 (h/L ≥ 1); sotavento −0,5 a −0,7; caso 2: −0,18. Probado. |
| 9 | Plantilla viento: levantamiento en anclajes con reparto «B/4 por faldón» (no es equilibrio): subestimaba ~7 % la tracción y omitía las componentes horizontales del techo | Media | Estática del marco | Equilibrio global respecto de la base de sotavento: −(3w_tb + w_ts)B/8 + [(w_mb − w_ms)he²/2 + (w_tb − w_ts)r(he + r/2)]/B. Probado. Nota: falta verificar el anclaje en el hormigón (ACI 318 Ap. D). |
| 10 | DS60 elementos de borde: longitud a confinar solo c − lw/(600δu/hw). No se pudo leer el DS60 oficial (servidor MINVU bloquea la descarga); ACI 318-08 21.9.6.4 a) exige máx(c − 0,1lw; c/2) | Media (incertidumbre normativa) | ACI 318-08 21.9.6.4 a | Envolvente conservadora máx(c − c_lím; c − 0,1lw; c/2) en plantilla y bloque `muroCL`. Confirmar con el texto oficial del DS60. |
| 11 | DS60 21.9.5.4: solo φu = 2δu/(lw·Ht); la práctica (memoria UBB) evalúa también φu = φy + (δu − δy)/(lp(Ht − lp/2)) con δy = 11/40·φy·Ht² | Media (incertidumbre normativa) | Meriño (UBB), tablas de confinamiento | Se calculan ambas y se adopta la mayor. El texto ya no afirma «Ht/lw ≥ 3» si no se cumple. |
| 12 | Muro: cuando se requiere elemento de borde faltaban espaciamiento 21.6.4.3 (b/3, 6db, so), hx y Ash ≥ 0,09·s·bc·f'c/fyt | Media | ACI 318-08 21.9.6.4 c, 21.6.4 | Agregados con `si(...)`, activos solo si c ≥ c_lím. hx ≤ mín(200 mm; e/2) en borde según la nota del autor (DS60), 350 mm en otro caso. |
| 13 | Estático NCh433: `Pk` con 5 elementos fijos y tablas `1:5`: al cambiar N el documento daba errores en vez de NO CUMPLE | Media | DESARROLLO.md (datos extremos) | `Pk = concat(Pp·ones(N−1), [Pt])`, tablas `1:N`; prueba con N = 8. Se añadió `Cdy ≥ Cmín` y una nota sobre cuándo es aplicable el factor f. |
| 14 | Modal NCh433: no advertía que 5.9.3 y la torsión accidental (6.3.4) requieren el modelo 3D; Qmáx sin f | Baja | NCh433 5.9.3, 6.3.4, 6.3.7.2 | Notas agregadas (Qmáx sin f = criterio conservador). |
| 15 | NCh3171 LRFD: faltaba 1,2D + 1,6(Lr o S) − 0,8W | Baja | NCh3171 / ASCE 7-05 | Agregada (13 combinaciones). ASD confirmado con el apunte CI3201 U. de Chile. |
| 16 | Ejemplo publicado no estaba en las pruebas | Media | Meriño (UBB) Tablas 1–4 | Pruebas: Cmáx R = 4 y 7, Cmín, CY = 11,193, Qb = 241,45/153,65 tonf, Ak, Fkx, momentos torsores: todos coinciden (≤ 0,2 %). El CX publicado (24,876) no se reproduce (fórmula da 23,22, sin efecto porque controla Cmáx): probable error de la tesis. |

## Pendientes (no resueltos en esta revisión)

- **NCh432:2010 / NCh432:2025**: no se obtuvo el texto oficial; Kz, Cp, G, GCpi siguen tomados de ASCE 7-05. La versión vigente desde 2025 (base ASCE 7-22) cambia Ke, Cp y la forma del mapa; la plantilla lo advierte.
- **DS60** (puntos 10–12): confirmar 21.9.5.4, 21.9.6.4 a) y c) con el PDF oficial (descarga bloqueada desde este entorno).
- **NCh3171:2017**: no contrastada.
- `muroCL`: solo sección rectangular (sin alas T/L, DS60 21.9.5.2).
- Interpolaciones en Tablas 6.4 y 5.7 para R/ξ no tabulados: criterio del módulo.

## Revisión visual

Capturas de las 16 figuras de las 6 plantillas (Playwright, 1440×900): legibles, sin textos superpuestos ni NaN. En la comparación NCh2369 el espectro vertical 2023 (RV = 2) supera al horizontal en periodos cortos, lo que es coherente con la norma (R = 5 frente a RV = 2).
