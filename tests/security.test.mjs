// Seguridad: un .mcalc de terceros no debe poder inyectar HTML/JS en la memoria
import { truthy, done, runDoc } from './helpers.mjs';
import { richText } from '../src/engine.js';
// HTML activo = etiquetas reales (no texto escapado) peligrosas, manejadores on* o URLs javascript:
const bad = (h) => /<(script|iframe|object|embed)\b/i.test(h) || /<[a-z][^>]*\son\w+\s*=/i.test(h) || /<[a-z][^>]*(href|src)\s*=\s*["']?\s*javascript:/i.test(h);
const cases = [
  '<img src=x onerror=alert(1)>', '<script>alert(1)</script>', '[clic](javascript:alert(1))', '![x](javascript:alert(1))',
  '<iframe src="https://evil"></iframe>', '<svg onload=alert(1)></svg>', '<a href="javascript:alert(1)">a</a>',
];
for (const c of cases) { const h = richText(c, new Map()); truthy('richText neutraliza: ' + c, !bad(h), h); }
const ok = richText('**negrita** y $x^2$ y [web](https://example.com) {1+1}', new Map());
truthy('Markdown legítimo se mantiene (negrita, KaTeX, enlace https)', /<strong>negrita<\/strong>/.test(ok) && /katex/.test(ok) && /href="https:\/\/example.com"/.test(ok));
const r = runDoc({ meta: { titulo: '<img src=x onerror=alert(1)>', proyecto: '<script>x</script>' }, settings: {}, blocks: [
  { id: 'a', type: 'text', src: '# Título <img src=x onerror=alert(1)>\nTexto <script>alert(1)</script>' },
  { id: 'b', type: 'calc', src: 'b = 30 cm // Ancho <img src=x onerror=alert(2)>\n"Párrafo <svg onload=alert(3)>' },
] });
truthy('Documento con portada/títulos/comentarios maliciosos no contiene HTML activo', !bad(r.html));
const r2 = runDoc({ meta: { logo: 'x" onerror="alert(1)' }, settings: {}, blocks: [{ id: 'i', type: 'image', data: 'javascript:alert(1)" onerror="alert(1)', width: '50%;background:url(x)' }] });
truthy('Logo e imagen con URL maliciosa no se insertan', !bad(r2.html) && !/onerror/.test(r2.html));
const png = 'data:image/png;base64,iVBORw0KGgo=';
const r3 = runDoc({ meta: {}, settings: {}, blocks: [{ id: 'i', type: 'image', data: png, width: 60 }] });
truthy('Imagen PNG embebida legítima se muestra', r3.html.includes(png));
done();
