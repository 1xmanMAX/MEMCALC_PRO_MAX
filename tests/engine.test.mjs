// Pruebas del motor: detección de variables que math.js confundiría con unidades, símbolos y LaTeX
import { ctxOf, truthy, done, math, TEMPLATES, runTemplate } from './helpers.mjs';
import { runCalc, symTex, tex, parseOptions } from '../src/engine.js';
import katex from 'katex';
const run = (src) => { const c = ctxOf(); runCalc(src, c); return c; };
let c = run('P = 10 tonf\nV = Ts*P');
truthy('Variable no definida con nombre de unidad (Ts) → error claro', c.errors.length === 1 && /unidad/.test(c.errors[0].msg), c.errors[0]?.msg);
c = run('Ts = 0.1\nP = 10 tonf\nV = Ts*P');
truthy('Ts definida como variable → sin error', c.errors.length === 0);
c = run('f(T) = 2*T\ny = f(3)\nt0 = 2 s\nL = 3 m\nA = 2 cm^2');
truthy('Parámetros de función y unidades comunes no se marcan', c.errors.length === 0, JSON.stringify(c.errors));
truthy('pisos no se convierte en π', symTex('pisos') === '\\mathrm{pisos}');
truthy('Cpi no se convierte en C_π', !/pi\b/.test(symTex('Cpi').replace('\\mathrm{pi}', '')) || symTex('Cpi') === 'C_{\\mathrm{pi}}');
truthy('phiMn → φM_n', symTex('phiMn') === '\\phi M_{n}');
const S = new Map([['Ki', math.matrix([1, 2, 3])], ['K1', math.ones(6, 6)]]);
for (const e of ['Ki[1]*2', 'K1[4:6,4:6]', '0.6*(34 m/s)^2']) {
  let ok = true; try { katex.renderToString(tex(math.parse(e), { mode: 'sym', scope: S, dec: 2 }), { throwOnError: true }); } catch (er) { ok = false; }
  truthy('LaTeX válido: ' + e, ok);
}
truthy('(34 m/s)^2 conserva paréntesis', /\\left\(34/.test(tex(math.parse('0.6*(34 m/s)^2'), { mode: 'sym', scope: S, dec: 2 })));
// Rangos usuales en el comentario de un dato: [mín..máx] (compatibles con las listas [a|b|c])
{
  let p = parseOptions('Resistencia del concreto [175..420]');
  truthy('Rango [175..420]: etiqueta sin el rango', p.label === 'Resistencia del concreto' && !p.options, p.label);
  truthy('Rango [175..420]: mín y máx', p.range && p.range.min === 175 && p.range.max === 420 && p.range.unit === '', JSON.stringify(p.range));
  p = parseOptions('Z [0.10..0.45]');
  truthy('Rango decimal [0.10..0.45]', p.range && p.range.min === 0.1 && p.range.max === 0.45);
  p = parseOptions('Peralte [1 m..3 m]');
  truthy('Rango con unidades [1 m..3 m]', p.range && p.range.min === 1 && p.range.max === 3 && p.range.unit === 'm', JSON.stringify(p.range));
  p = parseOptions("f'c [175 kgf/cm^2|210 kgf/cm^2|280 kgf/cm^2] [175..420 kgf/cm^2]");
  truthy('Lista + rango: opciones intactas', p.options && p.options.length === 3 && p.options[1] === '210 kgf/cm^2' && p.label === "f'c", JSON.stringify(p));
  truthy('Lista + rango: rango con unidad', p.range && p.range.max === 420 && p.range.unit === 'kgf/cm^2');
  p = parseOptions("f'c [175..420] [175 kgf/cm^2|210 kgf/cm^2]");
  truthy('Rango antes de la lista', p.options && p.options.length === 2 && p.range && p.range.min === 175 && p.label === "f'c", JSON.stringify(p));
  p = parseOptions('Varilla [4 : 1/2"|5 : 5/8"]');
  truthy('Lista con etiquetas sin rango', p.options && p.optLabels[1] === '5/8"' && p.range === null);
  p = parseOptions('Sin rango (E.060 9.3)');
  truthy('Comentario sin rango ni lista', p.label === 'Sin rango (E.060 9.3)' && !p.options && p.range === null);
  const c2 = ctxOf(); c2.html = runCalc('fc = 500 kgf/cm^2 // Resistencia del concreto [175..420]\nZ = 0.45 // Factor de zona [0.10..0.45]', c2);
  const i0 = c2.inputs[0];
  truthy('El dato recibe el rango en ctx.inputs', i0 && i0.range && i0.range.min === 175 && i0.label === 'Resistencia del concreto', JSON.stringify(i0));
  truthy('El rango no se imprime en la memoria', /Resistencia del concreto/.test(c2.html) && !/175\.\.420|\[0\.10/.test(c2.html));
  truthy('Fuera de rango no impide el cálculo', c2.errors.length === 0 && c2.scope.get('fc'));
}
// Plantillas con `validacion` (ejemplo resuelto): con los datos por defecto cada valor debe coincidir
for (const t of TEMPLATES.filter(x => x.validacion)) {
  const v = t.validacion;
  truthy(`[${t.id}] validacion tiene fuente y valores`, typeof v.fuente === 'string' && Array.isArray(v.valores) && v.valores.length > 0);
  const S = runTemplate(t.id).res.ctx.scope;
  for (const x of v.valores || []) {
    let got = NaN;
    try { const q = S.has(x.var) ? S.get(x.var) : math.evaluate(String(x.var), new Map(S)); got = math.isUnit(q) ? q.toNumber(x.unidad) : +q; } catch (e) { /* */ }
    const d = got - x.esperado;
    const ok = Number.isFinite(got) && (x.tolAbs != null ? Math.abs(d) <= x.tolAbs + 1e-12 : Math.abs(d) <= Math.abs(x.esperado) * (x.tol ?? 0.02) + 1e-12);
    truthy(`[${t.id}] ${v.fuente}: ${x.var} = ${x.esperado} ${x.unidad || ''}`, ok, 'calculado ' + got);
  }
}

{
  const { valTex, fmtNum } = await import('../src/engine.js');
  truthy('Restos de coma flotante (6.87e-12) se muestran como 0', fmtNum(6.87e-12) === '0');
  truthy('Área por metro se muestra en cm²/m', /cm\^\{2\}\/m/.test(valTex(math.evaluate('0.000555 m^2/m'))));
}
done();
