# MemoriaCalc — guía de desarrollo (módulos normativos, bloques y plantillas)

MemoriaCalc es una aplicación web (un único HTML) para escribir **memorias de cálculo estructural**
al estilo Mathcad / Calcpad / handcalcs: el usuario escribe líneas de cálculo con unidades y la app
muestra *fórmula simbólica = sustitución numérica = resultado*, con verificaciones ✔/✘, índice,
portada y exportación a PDF / HTML / Word.

## Estructura modular

| Carpeta | Qué contiene | Cómo se registra |
|---|---|---|
| `src/engine.js` | Motor: math.js con unidades, render LaTeX (KaTeX), parser de líneas | — |
| `src/norms/<modulo>.js` | Funciones normativas usables en el editor (p. ej. `SaNCh433(T, ...)`) | `defineFns({...}, 'Categoría')` |
| `src/blocks/<modulo>.js` | Bloques gráficos/analíticos (pórticos, secciones, diagramas) | `registerBlock('tipo', {...})` |
| `src/templates/<modulo>.js` | Plantillas = memorias completas editables | `export default [ ... ]` |
| `tests/<modulo>.test.mjs` | Pruebas de validación contra ejemplos resueltos de libros/normas | `node tests/run.mjs` |

Módulos: `peru`, `chile`, `japan`, `concrete`, `geotech`, `walls`, `bridges`, `steel`, `analysis`, `masonry`.

## Lenguaje de los bloques de cálculo (`calc`)

```
# Título nivel 1           ## Subtítulo (numerados, van al índice)
b = 30 cm // Ancho de la sección              ← dato de entrada (aparece en la pestaña Datos)
fc = 210 kgf/cm^2 // f'c [175 kgf/cm^2|210 kgf/cm^2|280 kgf/cm^2]   ← lista desplegable
bar = 5 // Varilla [4 : 1/2"|5 : 5/8"|6 : 3/4"]                     ← opciones con etiqueta
fc = 210 kgf/cm^2 // Resistencia del concreto [175..420]              ← rango usual (aviso si sale del rango)
Z = 0.45 // Factor de zona [0.10..0.45]   ·   hz = 60 cm // Peralte [0.5 m..1.5 m]   ← rango con unidades
d = h - 6 cm // Peralte efectivo              ← fórmula: se muestra simbólica + sustitución + resultado
Mn = As*fy*(d - a/2) -> tonf*m                ← convierte a unidad
check Mu <= phiMn // Resistencia a flexión (E.060 9.3)   ← verificación con D/C
"Texto con valores {As} y LaTeX $\phi M_n$     ← párrafo
f(x) = 2*x + 1                                ← función de usuario
si(cond, a, b)                                ← condicional (se muestra como llave de casos)
@ocultar … @mostrar   @dec 3   @modo corto|completo|resultado   @salto
```

Reglas importantes:
- Un **dato de entrada** es `nombre = número unidad` (solo un número y unidades). Todo lo demás es fórmula.
- Nombres → símbolos: `Mu`→M_u, `phiMn`→φM_n, `As_min`→A_{s,min}, `beta1`→β_1, `fc`→f'c, `gammac`→γ_c.
  Use nombres cortos y descriptivos. No use como variable un nombre de unidad que se use después
  (`m`, `cm`, `s`, `N`, `t`, `g`, `h` es válido pero ojo con `in`, `ft`, `kip`, `Pa`, `L` sí se puede).
- Unidades: `mm cm m in ft`, `kgf tonf N kN kip lbf`, `kgf/cm^2 tonf/m^2 Pa kPa MPa psi ksi`, `deg rad`, `s`.
- **Nunca** nombre una variable igual a una unidad que se use después en el documento (`s`, `m`, `N`, `t`, `g`, `h`, `kg`, `Pa`, `b`…): la variable tapa la unidad y las expresiones como `0.5 s` dejan de funcionar. Use `sep`, `esp`, `hz`, etc.
- Nombres con prefijo griego corto (`pi`, `mu`, `nu`, `xi`, `eta`, `rho`, `tau`, `phi`, `psi`, `chi`) seguidos de 3+ minúsculas no se convierten a griego salvo sufijos comunes (`max`, `min`, `req`, `adm`…): `phimax`→φ_max, `pisos`→pisos.
- `sqrtfc(fc)` devuelve √f'c en kgf/cm² (fórmulas empíricas E.060/ACI en kgf-cm). `sqrtMPa(fc)` en MPa.
- `Ab(n)`, `db(n)`: área/diámetro de varilla #n (ASTM). `Abmm(12)`.
- `roundup(x, 5 cm)`, `rounddown(x, 2.5 cm)`.
- Vectores: `[1, 2, 3]`, `1:5`, operaciones elemento a elemento `.*`, `./`, `.^`, `sum(v)`, `cumsum(v)`, `max(v)`.
- **Ojo:** entre dos vectores `*` es producto matricial/escalar; para elemento a elemento use `.*`, `./`, `.^`.
- **Rango usual** `[mín..máx]` al final del comentario de un dato de entrada. Sin unidad, el rango está en la
  unidad del dato; con unidad (`[175..420 kgf/cm^2]` o `[0.5 m..1.5 m]`) se convierte. Si el valor sale del rango,
  la pestaña Datos y la edición en la hoja muestran «⚠ Valor fuera del rango usual 175–420 kgf/cm²» y la línea se
  resalta en pantalla; **no** impide el cálculo y **no** se imprime. Se combina con listas:
  `fc = 210 kgf/cm^2 // f'c [175 kgf/cm^2|210 kgf/cm^2] [175..420]`. Úselo en datos con rango físico/normativo
  conocido (f'c, fy, qa, Z, espesores, factores). Si no hay rango, la app usa una tabla interna de respaldo (`RANGES`).
- `check` crea una verificación; su D/C se calcula automáticamente para `<, <=, >, >=`.
- Tras un error en una línea, la variable asignada se elimina (los errores no se propagan en silencio).

## Funciones normativas (`src/norms/*.js`)

```js
import { defineFns, math, toNum, mkUnit, interp1 } from '../engine.js';
defineFns({
  SaNCh433: { fn: (T, S, To, p, Ao, R) => {...número...}, tex: 'S_a', desc: 'Sa NCh433 (g)', args: 'T, S, To, p, Ao, R' },
}, 'Sismo — Chile');
```
- Los argumentos llegan como números o `Unit` de math.js: use `toNum(x, 's')` para obtener número en una unidad.
- Devuelva números adimensionales o `mkUnit(valor, 'unidad')`.
- `interp1(x, xs, ys)` interpola en tablas.
- Al sustituir valores la memoria muestra el **resultado** de la función, y en forma simbólica muestra `tex(args)`.

## Bloques (`src/blocks/*.js`)

```js
import { registerBlock, F } from '../blockreg.js';
import { evalParam, evalList, interp, esc, math, fmtPlain } from '../engine.js';
import { C, T, Lne, svgWrap, arrowDefs, dimH, dimV, niceTicks, caption, setVar, pos, f2 } from '../blocks.js';
registerBlock('frame2d', {
  name: 'Pórtico 2D', icon: 'beam', group: 'Análisis',
  fields: [F('nudos', 'Nudos: id x y', '1 0 0\n2 0 3', 'area'), F('titulo', 'Título', '')],
  hint: 'Ayuda HTML corta', def: { nudos: '...' },
  render(b, ctx) { const S = ctx.scope; const L = evalParam(b.L, S, 'm', 5); ...
    setVar(ctx, 'Mmax', math.unit(x, 'tonf*m'));                  // exportar resultados
    ctx.checks.push({ ok, label: 'texto', ratio: dc, block: ctx.blockId });   // verificación
    return `<div class="figure">${svgWrap(W, H, g)}${caption(ctx, b.titulo || '...')}</div>`; },
});
```
- `evalParam(texto, scope, 'unidad', porDefecto)` evalúa un campo (acepta variables y unidades).
- Los resultados exportados quedan disponibles para los bloques de cálculo siguientes.
- Para tablas HTML use `<table class="tbl">`.

## Plantillas (`src/templates/*.js`)

```js
import { calc, text, summary } from './_h.js';
export default [{
  id: 'cl-nch433', pais: 'CL', cat: 'Sismo — Chile', icon: 'quake', settings: { sys: 'si' },
  name: 'Análisis sísmico estático NCh433', normas: 'NCh433.Of1996 Mod.2009 + DS61 (2011)',
  desc: 'Descripción de 1–2 líneas para la galería.', titulo: 'Título en la portada',
  blocks: [ text(`# Generalidades ...`), calc(`# Datos ...`), { type: 'beam', ... }, summary() ],
}];
```
### Ejemplo de validación (campo opcional `validacion`)

Si los datos por defecto de la plantilla vienen de un ejemplo resuelto, declárelo para que la app muestre el botón
**«Ejemplo de validación»** (pestaña Datos, Proyecto y Ctrl K) con la tabla *esperado vs. calculado* (✔/✘):

```js
{ id: 'din-1gdl', ...,
  validacion: {
    fuente: 'Chopra, Dinámica de estructuras, 4.ª ed., Ej. 6.4',      // obligatorio
    nota: 'Datos por defecto = datos del ejemplo',                       // opcional
    valores: [
      { var: 'umax', unidad: 'in', esperado: 2.67, tol: 0.01 },          // tol relativa (0.01 = 1 %; por defecto 0.02)
      { var: 'Vb', unidad: 'kip', esperado: 13.1, tolAbs: 0.1, desc: 'Cortante basal' },   // tolAbs: absoluta, en `unidad`
      { var: 'Ki[2]', unidad: 'kip/in', esperado: 120 },                 // `var` puede ser una expresión
    ],
  },
}
```
- `var` es una variable del documento (o expresión math.js evaluada en el scope final); `unidad` es la unidad en la
  que está `esperado` (omítala si es adimensional).
- Los valores esperados corresponden a los **datos por defecto**; si el usuario cambió la memoria, la ventana lo avisa y
  ofrece «Restaurar datos del ejemplo». La app guarda el id de la plantilla en el documento (`doc.tpl`).
- `tests/engine.test.mjs` comprueba automáticamente todas las plantillas con `validacion` (`node tests/run.mjs engine`).

### Modo formulario (código bloqueado)

En **Proyecto › Entrega › Bloquear código** se ocultan Editor y Variables y solo se editan los Datos (y en la hoja).
Se guarda en `doc.settings.locked`; sirve para entregar una plantilla a un asistente. No es una protección de seguridad.

Categorías válidas: `General`, `Cargas y combinaciones`, `Análisis estructural`, `Sismo — Perú`, `Sismo — Chile`,
`Sismo — Japón`, `Sismo — Internacional`, `Concreto armado`, `Concreto — normas extranjeras`, `Cimentaciones`,
`Geotecnia`, `Muros de contención`, `Puentes`, `Acero estructural`, `Albañilería`, `Madera y tierra`, `Estructuras especiales`.

Iconos: `beam column footing wall bridge steel soil quake spectrum plot table slab grid section pm book blank calc`.

Calidad exigida en cada plantilla:
1. Memoria **completa y profesional**: generalidades, normas, materiales, datos, cálculos paso a paso con artículo
   de la norma en el comentario de cada línea, verificaciones `check`, figura(s) y `summary()` al final.
2. Con los datos por defecto **todas las verificaciones cumplen** y no hay errores (lo comprueba `tests/verify.mjs`).
3. Valores por defecto realistas tomados de un **ejemplo resuelto** (libro, norma o manual) y validados en `tests/<modulo>.test.mjs`.
4. Datos editables con listas `[..|..]` donde haya opciones normativas (zona, suelo, categoría, perfil…).

## Comandos
```
npm install
node build.mjs                 # dist/MemoriaCalc.html
node tests/run.mjs             # todas las pruebas  (node tests/run.mjs chile  → filtra)
node tools/shot.mjs $PWD/dist/MemoriaCalc.html salida.png 1440 900 "[data-t=ID]"   # captura con Playwright
#   opciones: --scroll=SEL  --fig=N (solo la figura N)  --el=SEL  --paper (memoria completa)  --dark
#   la app acepta ?plantilla=ID en la URL para abrir una plantilla directamente
```
