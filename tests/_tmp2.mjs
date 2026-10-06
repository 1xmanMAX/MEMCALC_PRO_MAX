import { runTemplate, math } from './helpers.mjs';
const ev = (id, e, u) => { const S = runTemplate(id).res.ctx.scope; const q = S.has(e) ? S.get(e) : math.evaluate(e, new Map(S)); return math.isUnit(q) ? q.toNumber(u) : +q; };
console.log(ev('ma-edificio', 'min(FaX)', 'tonf/m^2'), ev('ma-edificio', 'FaY[5]', 'tonf/m^2'), ev('ma-edificio','fm','kgf/cm^2'), ev('ma-edificio','vm','kgf/cm^2'));
console.log(ev('ma-reservorio', 'Wi/WL'), ev('ma-reservorio', 'Wc/WL'), ev('ma-reservorio','Tc','s'));
console.log(ev('ma-colmadera','Ck'), ev('ma-tijeral','Ck'), ev('ma-colmadera','fc','kgf/cm^2'), ev('ma-colmadera','Emin','kgf/cm^2'));
console.log(Math.tanh(0.866*2.25)/(0.866*2.25));
