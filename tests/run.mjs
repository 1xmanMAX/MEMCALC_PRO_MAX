// Ejecuta todas las pruebas: node tests/run.mjs [filtro]
import { readdirSync } from 'fs';
import { spawnSync } from 'child_process';
const filt = process.argv[2] || '';
const files = ['verify.mjs', ...readdirSync(new URL('.', import.meta.url)).filter(f => f.endsWith('.test.mjs')).sort()].filter(f => f.includes(filt));
let bad = 0;
for (const f of files) {
  const r = spawnSync(process.execPath, [new URL(f, import.meta.url).pathname], { encoding: 'utf8' });
  const out = (r.stdout || '') + (r.stderr || '');
  const last = (out.trim().split('\n').pop() || '');
  const fails = out.split('\n').filter(l => l.includes('✘') || /Error/.test(l));
  console.log((r.status === 0 ? '✔ ' : '✘ ') + f.padEnd(28) + last);
  if (r.status !== 0) { bad++; console.log(fails.slice(0, 30).map(l => '    ' + l).join('\n')); }
}
console.log(bad ? `\n${bad} archivo(s) con fallas` : '\nTodas las pruebas correctas');
process.exit(bad ? 1 : 0);
