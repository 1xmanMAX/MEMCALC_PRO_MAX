# Seguridad — archivos .mcalc de terceros y lanzador local

| Hallazgo | Gravedad | Corrección |
|---|---|---|
| El markdown de bloques de texto, comentarios y títulos se insertaba como HTML sin filtrar: un .mcalc malicioso podía ejecutar JavaScript (`<img onerror>`, `<script>`, `javascript:`) | Alta | `engine.js`: el HTML crudo del markdown se muestra como texto; enlaces e imágenes solo con `https:`, `mailto:`, `#` o `data:image/...` |
| Logo de portada e imagen de bloque insertados con su URL tal cual (inyección de atributos) | Alta | `imgSrc()`: solo se aceptan imágenes `data:image/(png|jpeg|gif|webp|svg+xml);base64`; ancho de imagen acotado a 10–100 % |
| Servidor local del lanzador sin validar `Host` (DNS rebinding) ni `Origin` en `/stash` (CSRF) | Media | `main.go`: `guard()` exige Host `127.0.0.1:47613`/`localhost:47613`, rechaza POST de otros orígenes y agrega `nosniff`/`DENY` |

Pruebas: `tests/security.test.mjs` (XSS en richText, portada, títulos, comentarios, imágenes). Verificado el servidor: 200 normal, 403 con Host ajeno y con POST desde otro origen.
