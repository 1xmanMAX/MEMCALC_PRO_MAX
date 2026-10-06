import { runTemplate, TEMPLATES, math } from './helpers.mjs';
for (const t of TEMPLATES.filter(x => x.id.startsWith('ma-'))) {
  const r = runTemplate(t.id).res; let nr = 0;
  for (const i of r.ctx.inputs) { if (!i.range) continue; nr++;
    let v = parseFloat(i.num ?? i.value); 
    if (i.range.unit && i.unit && i.range.unit !== i.unit) { try { v = math.unit(v, i.unit).toNumber(i.range.unit); } catch (e) { console.log('UNIT?', t.id, i.name, i.unit, i.range.unit); } }
    if (!(v >= i.range.min && v <= i.range.max)) console.log('OUT', t.id, i.name, v, JSON.stringify(i.range), i.unit);
    if (/\.\.|\[/.test(i.label)) console.log('LABEL', t.id, i.name, i.label);
  }
  const opts = r.ctx.inputs.filter(i => i.options).length;
  console.log(t.id, 'inputs', r.ctx.inputs.length, 'con rango', nr, 'listas', opts, 'errores', r.ctx.errors.length);
}
console.log(Object.keys(runTemplate('ma-edificio').res.ctx.inputs[0]));
const g = runTemplate('ma-edificio'); console.log('dmin', g('dmin'), 'Vm1', g('Vm1','tonf'), 'VE', g('VE','tonf'), 'Mu1', g('Mu1','tonf*m'));
const c = runTemplate('ma-cerco'); console.log('w070', c('w070','kgf/m^2'), 'w030', c('w030','kgf/m^2'), 'Ms', c('Ms','kgf*m/m'), 'mc', c('mc'));
const rv = runTemplate('ma-reservorio'); console.log('Wi', rv('Wi','tonf'), 'WL', rv('WL','tonf'), 'Wc', rv('Wc','tonf'), 'Tc', rv('Tc','s'), 'hi', rv('hi','m'), 'eps', rv('eps'));
const cm = runTemplate('ma-colmadera'); console.log('Ck', cm('Ck'), 'lam', cm('lam'), 'Nadm', cm('Nadm','tonf'));
