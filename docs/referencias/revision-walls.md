# Revisión independiente del módulo «walls» (supervisor)

Alcance: `src/norms/walls.js`, `src/blocks/walls.js` (retwall, wallrebar, gabionwall, msewall, sheetpile),
`src/templates/walls.js` (9 plantillas `wa-*`), `tests/walls.test.mjs`, `docs/referencias/walls.md`.
Resultado final: `node tests/walls.test.mjs` → 104/104 (antes 65); `node tests/verify.mjs` → plantillas `wa-*` sin errores y
todas cumplen con los datos por defecto.

## 1. Puntos débiles declarados por el autor — veredicto

| Punto | Veredicto | Acción |
|---|---|---|
| Kae de M-O validado solo con cuña | La fórmula es correcta (Kramer/AASHTO A11.3; θ, β, δ con la convención de Das). La cuña pseudoestática del test es independiente y válida. | Se añadió el **Ej. 7.6 de Das (PoFE 7.ª ed.)**: φ = 30°, δ = 15°, kh = 0.2 → Kae = 0.452, Pae = 56.05 kN/m (la app da 0.4520). Se añadió la identidad de ejes rotados para Kpe. No se encontró en línea una tabla AASHTO/Kramer en texto extraíble; el valor de Das se cita de la edición impresa. |
| Ej. 8.1 de Das «de memoria» | Los valores (H' = 7.158 m, Pa = 161.4, ΣV = 470.45, ΣMR = 1128.98, ΣMo = 379.25, FS = 2.98 / 2.73, e = 0.406, q = 189.2 / 45.9) coinciden con la edición impresa que conoce el revisor; el pequeño desfase de ΣMo (−0.12 %) se debe a que Das redondea Ka = 0.350 (exacto 0.3495). | Se añadió un **segundo ejemplo publicado y verificable en línea**: S. Sağlam (Adnan Menderes Univ.), *Retaining wall problems*, P1 (ΣV = 655.5, ΣMr = 1855.75, ΣMo = 832, FSv = 2.23, FSd = 1.20 → el bloque marca NO CUMPLE como el libro) y P2 (Coulomb con trasdós a 75°: Ka = 0.4023, Pa = 157.22 kN/m). |
| U = 1.25 CE + 1.0 CS «por analogía» | **No aceptable como valor por defecto.** E.060-2009 9.2.3 es la combinación de sismo (1.25(CM+CV) ± CS) y **9.2.5** la de empuje (1.4CM + 1.7CV + 1.7CE; 0.9CM + 1.7CE). La E.060 no combina CE con CS; tratar el empuje como carga muerta (1.25) reduce el factor del empuje respecto a 9.2.5 y a toda la práctica extranjera: ACI 318-19 5.3.8 y ASCE 7-16 2.3.6 (1.6H + 1.0E), AASHTO Evento Extremo I (γEH = 1.50 + 1.0EQ). Además el código citaba «E.060 9.2.3» para el empuje (artículo equivocado). | Pantalla, contrafuerte, cuerpo de gravedad y muro de sótano: **U2 = 1.7 CE + 1.0 CS** (50 % de la sobrecarga); `wallrebar` con `fE2 = 1.7` por defecto (editable). Punta/talón: se mantiene 1.25 sobre la reacción sísmica completa, justificado en el texto (la parte sísmica, dominante, queda sobre-mayorada). Todas las citas corregidas a 9.2.5 / 9.2.3. |
| Pasivo completo fp = 1 | **No razonable por defecto.** Movilizar Kp exige giros/desplazamientos grandes, el suelo frente a la punta puede excavarse o erosionarse; AASHTO usa φep = 0.50 (Tabla 11.5.7-1) y muchos autores lo desprecian. | Plantillas con `fp = 0.50` (lista 0 / 0.5 / 1). Para seguir cumpliendo FS sísmico al deslizamiento (≥ 1.25) se rediseñó: voladizo B 4.00 → 4.50 m, dentellón 0.70 → 1.20 m; contrafuertes B 6.00 → 6.50 m, dentellón 1.00 → 1.40 m. |
| Sin nivel freático | Carencia relevante (un dren colmatado es la causa típica de falla). | **Implementado en `retwall`**: `hw`, `gsat`, `gw`; γsat en pesos (polígonos de suelo recortados en el N.F.), γ' en el empuje por tramos, empuje hidrostático ½γw·hw² sobre el plano (con componente vertical en Coulomb), subpresión triangular ½γw·hw·B en 2B/3, y en sismo agua retenida (Matsuzawa 1985 / Kramer §11.6: k'h = kh·γsat/γ'). Dibujo del N.F., diagrama de agua y subpresión. Validado con cálculo manual en los tests. |
| Relleno sin cohesión | Aceptable y conservador (la práctica desprecia c del relleno por grietas y saturación). | Se documenta. |

## 2. Errores encontrados y corregidos

1. **`sigmaHline` (NAVFAC DM-7.2, carga lineal, m ≤ 0.4)**: el numerador era n² en lugar de n
   (σh·H/QL = 0.20 n/(0.16 + n²)²). Comprobado: ∫σh dz = 0.55 QL solo con n. Nuevo test de integración.
2. **Citas E.060**: «9.2.3» para el empuje → **9.2.5** (texto de la norma verificado).
3. **Etiqueta de excentricidad**: decía «AASHTO 11.6.3.3» para e ≤ B/6; B/6 es el núcleo central (sin tracción, Das 8.4);
   la de sismo (≤ B/3, 2/3 centrales) sí corresponde a AASHTO 11.6.5.1.
4. **Robustez con datos extremos** (antes: errores en cascada, `Infinity`, raíces de negativos, números complejos):
   - M-O sin equilibrio (φ − β − ψ < 0) lanzaba error: ahora se anula el término de la raíz (EN 1998-5 Anexo E) y se añade
     la verificación «Equilibrio sísmico del relleno φ − β − ψ ≥ 0» (en `retwall` y nueva función `MOequil`).
   - Resultante fuera de la base: q = ∞ → ahora Lc acotada a 0.03B (valor finito, NO CUMPLE).
   - `sqrt(1 − 2Mu/…)` negativo → `max(0, …)` + verificaciones de cuantía máxima 0.75ρb (punta, talón, pantalla de contrafuertes, sótano).
   - `rounddown(Ab/As)` = 0 → acotado a 2.5 cm (la cuantía marca NO CUMPLE).
   - Gaviones (q sísmica), MSE (Meyerhof L − 2e, Le negativa) acotados.
   - Plantilla voladizo: la hipótesis «e ≥ 0» (estática) fallaba con datos legítimos (e ≈ 0); se verifica sobre la
     resultante sísmica (la estática siempre tiene contacto total si |e| ≤ B/6).
   - Nuevo test: 11 casos extremos → NO CUMPLE sin errores ni D/C no numérico.
5. **MSE sísmico**: solo PIR + 0.5 PAE. Se usa la envolvente con PAE + 0.5 PIR (AASHTO 2012+ 11.6.5.1).
6. **Muro de sótano**: con U2 = 1.7CE + 1.0CS el cortante no cumplía con 25 cm → espesor 0.30 m.
7. Marcadores «Das ec. 7.?» / «Kramer ec. 11.?» sustituidos por referencias reales; ordenada −1.1e−16 del pasivo en la tabla.

## 3. Verificado sin cambios

- Rankine con talud (Ka con cos β, empuje paralelo al talud), Coulomb Ka/Kp (tabla de Das), convención de θ (+ si el relleno
  apoya en el trasdós), Kae/Kpe de M-O (Kramer), ψ = atan(kh/(1 − kv)), Pae = ½γH²(1 − kv)Kae.
- Empuje de sobrecarga en Coulomb, Ka·q·H·cosθcosβ/cos(θ − β): **comprobado con cuña** (nuevo test).
- ΔEae a 0.6H (Seed–Whitman; conservador frente a H/3–0.5H de NCHRP 611), inercia khW del muro y del suelo sobre el talón
  (AASHTO 11.6.5.1). Se combina 100 % ΔEae + 100 % inercia (más severo que AASHTO; se documenta).
- FS E.050-2018 39.13.6 (1.50 / 1.25) y Art. 21 (FS 3.0 / 2.5 → qa sísmica = 1.2 qa; válido solo si qa la gobierna el corte,
  no el asentamiento) — texto de la norma consultado.
- Presiones: trapecio con |e| ≤ B/6 y triángulo Lc = 3(B/2 − e).
- E.060: flexión con φ = 0.90, cortante a d con φVc = 0.85·0.53√f'c·b·d, As,min 0.0018bh (10.5.4), ρmax 0.75ρb (10.3.4),
  refuerzo de muros 14.3 (0.0012/0.0020, 2/3 exterior), ld (12.2.2, 6.6/5.3 en kgf-cm equivalen a 2.1/1.7 de ACI en MPa),
  gancho 12.5, corte de barras max(d, 12db) y ≥ ld (12.10). Concreto simple Cap. 22 (φ = 0.65, 1.3√f'c S, 0.35√f'c bh).
- MSE AASHTO 11.10: Kr/Ka, F*, α, RF, φ, Le ≥ 0.9 m, Meyerhof, L ≥ 0.7H. Blum (D = 1.2D0, z0 de cortante nulo),
  apoyo libre (ΣM en el anclaje), muerto fuera de las cuñas (Das 9.13), 0.65 fy (USS).
- Visual (Playwright, `dist/MemoriaCalc.html`): figuras de las 9 plantillas sin errores; caso con N.F. + sismo revisado.

## 4. Limitaciones que quedan

- N.F. solo en `retwall` (no en `wallrebar` ni en el diseño de punta/talón de las plantillas, que suponen relleno drenado);
  sin flujo ni agua frente al muro.
- MSE sin verificación sísmica interna (11.10.7.2). Contrafuertes con coeficientes de Huntington.
- Kae de Das Ej. 7.6 y Das Ej. 8.1 citados de la edición impresa (no hay copia en línea extraíble); Sağlam sí está en línea:
  https://fakulte.adu.edu.tr/muhendislik/personel/uploads/ssaglam/recitation-5a-1494246312.pdf

## 5. Fuentes consultadas

- NTE E.060 (texto de 9.2: propuesta SENCICO 2019, numeración igual a 2009): https://www.cip.org.pe/publicaciones/2021/enero/portal/e.060-concreto-armado-sencico.pdf
- NTE E.050-2018 (RM 406-2018-VIVIENDA), Art. 21 y 39.13.6.
- ACI 318-19 5.3.8; ASCE 7-16 2.3.6; AASHTO LRFD 3.4.1, 11.5.7, 11.6.5, 11.10; EN 1998-5 Anexo E; Kramer (1996) §11.6;
  NAVFAC DM-7.2; Das, *Principles of Foundation Engineering* 7.ª ed. (Ej. 7.6, 8.1).
