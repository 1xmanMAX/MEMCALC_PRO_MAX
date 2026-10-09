// Empaqueta src/data/normas/*.json → src/data/normas.pack.js (gzip + base64; se descomprime al abrir la biblioteca)
import fs from 'fs';
import path from 'path';
import { gzipSync, strToU8 } from 'fflate';
const dir = new URL('../src/data/normas/', import.meta.url).pathname;
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort() : [];
const docs = [];
for (const f of files) {
  const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  for (const k of ['id', 'titulo', 'pais', 'tipo']) if (!d[k]) throw new Error(f + ': falta ' + k);
  if (!Array.isArray(d.secciones)) throw new Error(f + ': secciones debe ser lista');
  docs.push(d);
}
const json = JSON.stringify(docs);
const b64 = Buffer.from(gzipSync(strToU8(json), { level: 9 })).toString('base64');
const index = docs.map(d => ({ id: d.id, titulo: d.titulo, pais: d.pais, tipo: d.tipo, version: d.version || '', n: d.secciones.length }));
fs.writeFileSync(new URL('../src/data/normas.pack.js', import.meta.url),
  `// Generado por tools/pack-normas.mjs — no editar a mano\nexport const NORMAS_INDEX = ${JSON.stringify(index)};\nexport const NORMAS_GZ = ${JSON.stringify(b64)};\n`);
console.log(`normas: ${docs.length} documentos, ${(json.length / 1024).toFixed(0)} KB de texto → ${(b64.length / 1024).toFixed(0)} KB empaquetado`);
