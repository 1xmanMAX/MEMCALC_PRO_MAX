// Ayudantes compartidos para las pruebas de validación de ingeniería
import '../src/norms/index.js';
import '../src/blocks/index.js';
import { runCalc, math } from '../src/engine.js';
import { runDoc } from '../src/docrun.js';
import { TEMPLATES } from '../src/templates.js';
import { BLOCKS } from '../src/blockreg.js';

export const stats = { pass: 0, fail: 0 };
export function section(t) { console.log(t); }
export function near(name, got, exp, tol = 0.01) {
  const ok = Number.isFinite(+got) && Math.abs(got - exp) <= Math.abs(exp) * tol + 1e-9;
  ok ? stats.pass++ : stats.fail++;
  console.log((ok ? '  ✔ ' : '  ✘ ') + name.padEnd(58) + ' obtenido ' + (+got).toFixed(4) + '   esperado ' + (+exp).toFixed(4));
  return ok;
}
export function truthy(name, cond, info = '') {
  cond ? stats.pass++ : stats.fail++;
  console.log((cond ? '  ✔ ' : '  ✘ ') + name + (info ? '  ' + info : ''));
  return cond;
}
export const ctxOf = () => ({ scope: new Map(), checks: [], inputs: [], toc: [], errors: [], state: { mode: 'completo', hidden: false, dec: 2 }, blockId: 'x', prevVals: new Map(), heading: () => '', fig: 0, tab: 0 });
// Ejecuta líneas de cálculo y devuelve un lector get(nombre, unidad)
export function calc(src) {
  const c = ctxOf(); runCalc(src, c);
  if (c.errors.length) throw new Error(JSON.stringify(c.errors));
  const get = (n, u) => { const v = c.scope.get(n); if (v === undefined) throw new Error('Variable no definida en la prueba: ' + n); return math.isUnit(v) ? v.toNumber(u) : v; };
  get.ctx = c; return get;
}
// Ejecuta un bloque registrado (o de blocks.js) con un scope previo opcional
export function block(type, params, pre = '') {
  const c = ctxOf(); if (pre) runCalc(pre, c);
  const B = BLOCKS[type]; if (!B) throw new Error('Bloque no registrado: ' + type);
  const html = B.render(params, c);
  const get = (n, u) => { const v = c.scope.get(n); if (v === undefined) throw new Error('Variable no exportada por el bloque: ' + n); return math.isUnit(v) ? v.toNumber(u) : v; };
  get.ctx = c; get.html = html; return get;
}
// Ejecuta una plantilla completa
export function runTemplate(id, mutate) {
  const t = TEMPLATES.find(x => x.id === id); if (!t) throw new Error('Plantilla inexistente: ' + id);
  const d = { meta: {}, settings: t.settings || {}, blocks: t.blocks.map((b, i) => ({ ...JSON.parse(JSON.stringify(b)), id: id + i })) };
  if (mutate) mutate(d);
  const r = runDoc(d);
  const get = (n, u) => { const v = r.ctx.scope.get(n); if (v === undefined) throw new Error('Variable no definida en la plantilla: ' + n); return math.isUnit(v) ? v.toNumber(u) : v; };
  get.res = r; return get;
}
export function done() {
  console.log(`\nResultado: ${stats.pass} correctas, ${stats.fail} fallidas`);
  process.exitCode = stats.fail ? 1 : 0;
}
export { math, TEMPLATES, BLOCKS, runDoc };
