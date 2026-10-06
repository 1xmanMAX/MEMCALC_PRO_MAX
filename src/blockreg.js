// =====================================================================
//  Registro de bloques gráficos/analíticos (módulos en src/blocks/*)
//  registerBlock('tipo', { render(b, ctx) -> html, name, icon, fields, hint, def, group })
//   - render: igual que los bloques de blocks.js (lee parámetros con evalParam,
//     escribe resultados en ctx.scope, agrega verificaciones en ctx.checks)
//   - icon: clave de icono de la interfaz (beam, column, footing, wall, bridge,
//     steel, soil, quake, spectrum, plot, table, slab, grid, section, pm...) o SVG propio en iconSvg
//   - fields: [F(clave, etiqueta, ejemplo, 'text'|'area'|'check'|'select', opciones)]
// =====================================================================
export const BLOCKS = {};
export const F = (k, l, ph = '', t = 'text', opt) => ({ k, l, ph, t, opt });
export function registerBlock(type, def) {
  if (!def || typeof def.render !== 'function') throw new Error('registerBlock: falta render para ' + type);
  BLOCKS[type] = { group: 'Análisis', ...def };
}
