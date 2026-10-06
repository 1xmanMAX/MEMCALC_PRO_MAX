// Resume /tmp/qa/report.json (generado por tools/qa-render.mjs).
//   node tools/qa-report.mjs [informe.json] [--sev=E,W] [--kind=svg,ancho] [--mod=peru,base] [--skip=chile,masonry,dynamics]
import fs from 'node:fs';
const args = process.argv.slice(2);
const opts = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => { const [k, v] = a.slice(2).split('='); return [k, (v ?? '').split(',')]; }));
const file = args.find(a => !a.startsWith('--')) || '/tmp/qa/report.json';
const rep = JSON.parse(fs.readFileSync(file, 'utf8'));
for (const r of rep) {
  if (opts.mod && !opts.mod.includes(r.mod)) continue;
  if (opts.skip && opts.skip.includes(r.mod)) continue;
  const iss = r.issues.filter(i => (!opts.sev || opts.sev.includes(i.sev)) && (!opts.kind || opts.kind.includes(i.kind)));
  if (!iss.length) continue;
  console.log(`\n## ${r.id} (${r.mod})`);
  for (const i of iss) console.log(`  ${i.sev} ${i.kind.padEnd(10)} ${i.msg}${i.at ? '  @ ' + i.at : ''}`);
}
