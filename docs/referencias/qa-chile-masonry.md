# QA de las plantillas «chile» y «masonry» (rangos, validación y revisión visual)

Fecha: 2026-10-06. Herramientas: `node build.mjs`, `tools/qa-render.mjs mod:chile mod:masonry --tiles` (capturas `--paper` en tramos), revisión manual de las capturas.
Resultado final: `qa-render` sin hallazgos en las 18 plantillas (antes: 9 E y 3 W); `node tests/run.mjs` todo verde (chile 185, masonry 210, engine 75).

## 1. Chile: rangos usuales y `validacion`

- Rangos `[mín..máx]` en los datos principales de las 8 plantillas (pisos, altura de entrepiso, cargas, periodos, q, b, Vs30, Tg, R/Ro, ξ, geometría y armaduras del muro, parámetros de viento, cargas NCh3171). Las listas `[a|b]` siguen intactas y el rango va detrás. Todos los valores por defecto quedan dentro del rango. No se cambió ningún dato por defecto.
- Prueba nueva en `tests/chile.test.mjs`: cada plantilla `cl-` tiene ≥ 4 datos con rango, los valores por defecto están dentro y las etiquetas quedan limpias; las listas de zona, suelo y R no se alteran.
- `validacion`:

| Plantilla | Fuente publicada | Cómo se reproduce |
|---|---|---|
| cl-nch433-estatico | Meriño Sepúlveda (UBB), Anexo A: Cmáx R = 4/7, Cmín, CY = 11,193, Qb = 241,45 tonf, A5 | Los datos por defecto **no** son los de la tesis: se evalúan expresiones con los datos de la tesis. P y Qox son valores de control (se indica en `nota`) |
| cl-nch433-2026 | prNCh433 C4.2.3.1 (Vs30 = 520 m/s, Tg = 0,51 s → B no ratificada → C) | Se evalúa con expresión; suelo, Qox, Qmín y Sa(T*x) son de control |
| cl-nch433-comparacion | ídem C4.2.3.1 | Más valores de control suelo26, Qo61, Qo26 y rQ |
| cl-nch2369 | NCh2369.Of2003, Tablas 5.4 y 5.7 (valores tabulados) | Más valores de control P, Qo y Qmarco |
| cl-viento-galpon | ASCE 7-05 Tabla 6-3 (Kz) y NCh432.Of71 Tabla 1 | Más valores de control Kh y qh |

  Sin `validacion` (no hay un ejemplo publicado): cl-nch433-modal, cl-muro-ds60 y cl-nch3171. Sus valores de control siguen en las pruebas.

## 2. Hallazgos visuales y correcciones

| Plantilla / bloque | Hallazgo | Corrección |
|---|---|---|
| `spectrumCL` (modal, 2026) | La etiqueta «T* = … → Sa/g» se superponía a las curvas de otros suelos; Sa con 6 cifras | Se coloca automáticamente en la posición candidata con menos curvas cruzadas, con halo blanco y línea guía si queda lejos; Sa con 3 decimales |
| `spectrumCL` | Espectro elástico gris casi igual al del suelo D | Trazo negro de raya y punto, con el suelo en la leyenda |
| cl-nch3171 | Vectores U y Ua con 13 y 15 combinaciones (reducción al 42–46 %) | Una línea por combinación (U1…U13, Ua1…Ua15); vector oculto; Pu_max y Pu_min en modo corto |
| cl-viento-galpon | Ecuación de Rup reducida al 62 %; título «PRESIONES DE DISEÑO P = Q·G·CP − QH…» pasado a mayúsculas | Se separa en Rv, Mmur, Mtec y Rup; la fórmula pasa a un párrafo |
| cl-nch2369 | T* con unidades «tonf^0.5·m^0.5…»; sep en m; glifo «ⱼ»; `cat23` se mostraba como c_at23; ^n y ^0.4 en el comentario | `-> s`, `-> mm`, texto sin subíndices Unicode, `uso23` y `Cmin_23`, ⁿ y ⁰·⁴ |
| cl-nch433-estatico, cl-nch433-2026, cl-nch433-comparacion | Tablas de derivas con 9 decimales; `derx` se mostraba como d_erx; `Cmin61` y `dlim26` sin subíndice; verificación con la etiqueta «C ≥ Cmín (DS61)» | dec 3; `thetax` (θx); `Cmin_61` y similares; etiquetas completas con artículo |
| cl-nch433-modal | `alfa` se mostraba como a_lfa | `alpha` (α) |
| cl-muro-ds60 | `epsy`, `reqb`, `Ashreq`, `Vnmax` y `hxmax` mal simbolizados; c_lím en m; φu2 < 0 sin explicación | `epsilony`, `EB`, `Ash_req`, `Vn_max` y `hx_max`; `-> cm`; nota «si δu < δy no controla» |
| ma-edificio | Vectores por muro (σ, Fa, Ve, Me, Vu, Mu) reducidos al 64–89 %; `uni` se mostraba como u_ni; texto «Estribos: [] 6 mm»; `Assreq` | Las fórmulas pasan a un párrafo LaTeX, los vectores se ocultan (valores en las tablas) y las relaciones máximas se muestran en modo corto; `unid`; redacción corregida; comentarios para s1, s2 y s4; `Ass_req` |
| ma-reservorio / `cilindro` | Tabla PCA desbordaba la hoja; etiquetas 0H…1H recortadas; «C_T» crudo en el SVG; `Pi` se mostraba como Π y `eps` como e_ps; párrafo con `{si(…)}` sin ajuste de línea (cortado); verificación 2Asv con unidades «cm ≥ m»; hie en cm | Tabla compacta (y/H, 10,5 px, signo −); dibujo desplazado; `P_i`, `P_iy`, `epsilon`; texto estático con ambos casos; `2*Asv/tw >= 0.003`; `-> m` |
| `tanque` | Rótulo «Pc = 0: Wc restringida → impulsiva» invadía el diagrama de presiones; unidad «t» | Rótulo en dos líneas; «tonf» |
| ma-elevado | `Pi` se mostraba como Π, `thf` y `sigc` mal simbolizados; párrafo con `{si(…)}` | `P_i`, `thetaf` y `sigma_gc`; texto estático |
| ma-cisterna | Wtot reducida al 72 %; «As(M) = 0.0297 cm = 2.97 cm²/m»; verificaciones «≤ 0.305 cm»; wt en kgf/cm² | Wcon + Wag + Wsc; modo corto; Asmax y Astmax en cm²/m; wt en tonf/m² |
| ma-colmadera, ma-tijeral | `lam`, `lam1` y `lam3` se mostraban como l_am | `lambda` (λ) |

Sin hallazgos de NaN, undefined, kanji ni LaTeX crudo en las demás plantillas (armada, cerco, adobe, viga y columna de madera).

## Pendientes

- La columna «Referencia» del resumen queda vacía cuando el comentario cita el artículo sin el prefijo de la norma. Es un comportamiento del motor y no se tocó.
- En el muro DS60 φu2 sale negativo con los datos por defecto (δu < δy). Se documenta y no controla.
