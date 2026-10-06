// Pruebas del motor: detección de variables que math.js confundiría con unidades, símbolos y LaTeX
import { ctxOf, truthy, done, math } from './helpers.mjs';
import { runCalc, symTex, tex } from '../src/engine.js';
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
done();
