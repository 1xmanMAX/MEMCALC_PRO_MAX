// Pruebas de validación — módulo «walls» (empujes de tierra y muros de contención)
// Fuentes: docs/referencias/walls.md
import { near, truthy, calc, block, runTemplate, section, done, TEMPLATES } from './helpers.mjs';

const r = (d) => d * Math.PI / 180;

// ---------------------------------------------------------------------
// Solución independiente: cuña de prueba (Coulomb / pseudoestática) por barrido
// del ángulo de la superficie de falla. Trasdós desde (0,0) hasta (−H·tanθ, H):
// θ > 0 → el relleno apoya sobre el trasdós (convención de Das).
// ---------------------------------------------------------------------
function wedgeK(phi, delta, beta, theta, kh = 0, kv = 0) {
  [phi, delta, beta, theta] = [phi, delta, beta, theta].map(r);
  const H = 1, xt = -H * Math.tan(theta);
  const L = Math.hypot(xt, H), nx = H / L, ny = -xt / L;
  const ang = Math.atan2(ny, nx) + delta, Px = Math.cos(ang), Py = Math.sin(ang);
  let best = 0;
  for (let a = 0.02; a < Math.PI / 2; a += 0.0002) {
    const den = Math.tan(a) - Math.tan(beta); if (den <= 0) continue;
    const x = (H - xt * Math.tan(beta)) / den; if (x <= xt) continue;
    const y = x * Math.tan(a), W = Math.abs(xt * y - H * x) / 2;
    const ra = Math.atan2(Math.cos(a), -Math.sin(a)) - phi, Rx = Math.cos(ra), Ry = Math.sin(ra);
    const det = Px * Ry - Rx * Py;
    const P = (kh * W * Ry - Rx * (1 - kv) * W) / det;
    if (P > best) best = P;
  }
  return 2 * best / (1 - kv);
}

section('Coeficientes de reposo y Rankine');
let g = calc(`phi = 30 deg
K0 = K0Jaky(phi)
K0oc = K0Jaky(phi, 4)
KaR = KaRankine(phi)
KpR = KpRankine(phi)
KaB = KaRankine(phi, 10 deg)
KaB20 = KaRankine(phi, 20 deg)
zc = zcRankine(1 tonf/m^2, 1.8 tonf/m^3, 30 deg)`);
near('K0 Jaky φ=30° = 0.500', g('K0'), 0.5);
near('K0 sobreconsolidado OCR=4 (Mayne–Kulhawy) = 0.5·4^0.5', g('K0oc'), 1.0);
near('Ka Rankine φ=30° = 1/3', g('KaR'), 1 / 3);
near('Kp Rankine φ=30° = 3', g('KpR'), 3);
near('Ka Rankine con talud α=10° (Das, tabla Rankine) = 0.3495', g('KaB'), 0.3495, 0.001);
near('Ka Rankine con talud α=20° (Das, tabla Rankine) = 0.4142', g('KaB20'), 0.4142, 0.002);
near('Grieta de tracción zc = 2c/(γ√Ka)', g('zc', 'm'), 2 / (1.8 * Math.sqrt(1 / 3)));

section('Coulomb — Das, tabla de Ka (θ = 0, α = 0), φ = 30°');
const tablaKa = [[0, 0.3333], [5, 0.3189], [10, 0.3085], [15, 0.3014], [20, 0.2973], [25, 0.2956]];
for (const [d, k] of tablaKa) { const v = calc(`K = KaCoulomb(30 deg, ${d} deg)`)('K'); near(`Ka Coulomb φ=30°, δ=${d}° = ${k}`, v, k, 0.002); }
section('Coulomb — Das, tabla de Kp (θ = 0, α = 0), φ = 30°');
for (const [d, k] of [[0, 3.0], [10, 4.1433], [15, 4.9765], [20, 6.1054]]) { const v = calc(`K = KpCoulomb(30 deg, ${d} deg)`)('K'); near(`Kp Coulomb φ=30°, δ=${d}° = ${k}`, v, k, 0.002); }
section('Coulomb con trasdós inclinado y talud — contra cuña de prueba independiente');
for (const [p, d, b, t] of [[30, 20, 0, 10], [30, 20, 0, -10], [34, 17, 15, 5], [32, 21.3, 10, 20]]) {
  const v = calc(`K = KaCoulomb(${p} deg, ${d} deg, ${b} deg, ${t} deg)`)('K');
  near(`Ka Coulomb φ=${p} δ=${d} β=${b} θ=${t} = cuña de prueba`, v, wedgeK(p, d, b, t), 0.002);
}

section('Mononobe–Okabe');
g = calc(`Ka = KaCoulomb(30 deg, 15 deg)
Ke0 = KaeMO(30 deg, 15 deg, 0)
Ke = KaeMO(30 deg, 15 deg, 0.2)
Kev = KaeMO(30 deg, 15 deg, 0.2, 0.1, 5 deg, 10 deg)
ps = psiMO(0.2, 0.1)
Kpe0 = KpeMO(30 deg, 0 deg, 0)
Kpe = KpeMO(30 deg, 0 deg, 0.2)
DK = DKaeSW(0.2)
DP = DPaeSW(0.2, 1.8 tonf/m^3, 5 m)`);
near('Kae con kh = 0 coincide con Ka de Coulomb', g('Ke0'), g('Ka'), 1e-9);
near('Kae φ=30 δ=15 kh=0.2 = cuña pseudoestática', g('Ke'), wedgeK(30, 15, 0, 0, 0.2, 0), 0.002);
near('Kae φ=30 δ=15 kh=0.2 kv=0.1 β=5 θ=10 = cuña pseudoestática', g('Kev'), wedgeK(30, 15, 5, 10, 0.2, 0.1), 0.002);
{ // equivalencia de Arango (1969): Kae = Ka(β+ψ, θ+ψ)·cos²(θ+ψ)/(cosψ cos²θ)
  const psi = Math.atan(0.2 / 0.9), th = r(10);
  const KaRot = calc(`K = KaCoulomb(30 deg, 15 deg, ${5 + psi * 180 / Math.PI} deg, ${10 + psi * 180 / Math.PI} deg)`)('K');
  near('Kae = equivalencia de Arango con ejes rotados ψ', g('Kev'), KaRot * Math.cos(th + psi) ** 2 / (Math.cos(psi) * Math.cos(th) ** 2), 1e-6);
}
near('ψ = atan(kh/(1−kv)) = 12.53°', g('ps', 'deg'), Math.atan(0.2 / 0.9) * 180 / Math.PI);
near('Kpe con kh = 0 = Kp de Rankine (δ = 0)', g('Kpe0'), 3, 1e-6);
truthy('Kpe < Kp con sismo', g('Kpe') < 3, `Kpe = ${g('Kpe').toFixed(3)}`);
near('Seed–Whitman ΔKae = ¾ kh', g('DK'), 0.15);
near('Seed–Whitman ΔPae = 3/8 kh γ H²', g('DP', 'tonf/m'), 0.375 * 0.2 * 1.8 * 25);

section('Sobrecargas (Boussinesq modificado) y tablestacas');
g = calc(`P = PStrip(5 tonf/m^2, 2 m, 1 m, 6 m)
y = yStrip(5 tonf/m^2, 2 m, 1 m, 6 m)
PL = PLine(2 tonf/m, 1 m, 5 m)
D0 = D0Blum(5 m, 1.8 tonf/m^3, 1/3, 3)
Dq = D0Blum(5 m, 1.8 tonf/m^3, 1/3, 3, 1 tonf/m^2)
Df = DFreeEarth(6 m, 1 m, 1.8 tonf/m^3, 1/3, 2)`);
{ // Jarquio (1981), Das ec. 7.?: P = q/90·H(θ2−θ1); z̄ desde la base
  const q = 5, a = 2, b = 1, H = 6, t1 = Math.atan(b / H) * 180 / Math.PI, t2 = Math.atan((a + b) / H) * 180 / Math.PI;
  const Pj = q / 90 * H * (t2 - t1), R = (a + b) ** 2 * (90 - t2), Q = b * b * (90 - t1);
  const zj = H - (H * H * (t2 - t1) + (R - Q) - 57.3 * a * H) / (2 * H * (t2 - t1));
  near('Franja: empuje total = Jarquio (1981)', g('P', 'tonf/m'), Pj, 0.001);
  near('Franja: altura del empuje = Jarquio (1981)', g('y', 'm'), zj, 0.002);
}
near('Carga lineal m ≤ 0.4: P = 0.55 QL (NAVFAC DM-7.2)', g('PL', 'tonf/m'), 1.1);
near('Blum sin sobrecarga: D0 = H/((Kp/Ka)^(1/3) − 1)', g('D0', 'm'), 5 / (Math.cbrt(9) - 1), 1e-6);
truthy('Blum con sobrecarga da mayor D0', g('Dq', 'm') > g('D0', 'm'));
{ // apoyo libre: ΣM respecto al anclaje = 0
  const D = g('Df', 'm'), T = 6 + D, Ka = 1 / 3, Kp = 2, ga = 1.8;
  const M = Kp * ga * D * D / 2 * (6 + 2 * D / 3 - 1) - Ka * ga * T * T / 2 * (2 * T / 3 - 1);
  near('Apoyo libre: ΣM respecto al anclaje = 0 (residuo relativo)', 1 + M / (Ka * ga * T ** 3), 1, 1e-6);
}
{
  const b1 = block('sheetpile', { H: '4 m', D: 'D0Blum(4 m, 1.8 tonf/m^3, 1/3, 2)', gs: '1.8 tonf/m^3', Ka: '1/3', Kp: '2' });
  const H = 4, Ka = 1 / 3, Kp = 2, z = H / (Math.sqrt(Kp / Ka) - 1);
  near('Tablestaca en voladizo: Mmax numérico = solución cerrada', b1('Mmaxn', 'tonf*m/m'), 1.8 / 6 * (Ka * (H + z) ** 3 - Kp * z ** 3), 0.002);
}

section('Muro en voladizo resuelto — Das, Principios de Ing. de Cimentaciones, Ejemplo 8.1');
// H' = 7.158 m, α = 10°, φ1 = 30°, γ1 = 18 kN/m³; φ2 = 20°, c2 = 40 kPa, γ2 = 19 kN/m³, D = 1.5 m; γc = 23.58 kN/m³
const das = block('retwall', { H: '6.7 m', B: '4 m', hz: '0.7 m', punta: '0.7 m', t1: '0.5 m', t2: '0.7 m', beta: '10 deg', phi: '30 deg', gs: '18 kN/m^3', gc: '23.58 kN/m^3', gf: '19 kN/m^3', phif: '20 deg', cf: '40 kPa', Df: '1.5 m', fp: '1', fsv: '2', fsd: '1.5' });
near('H\' = 6.7 + 2.6·tan10° = 7.158 m', das('Hv', 'm'), 7.158, 0.001);
near('Pa = ½·0.350·18·7.158² = 161.4 kN/m', das('Pa', 'kN/m'), 161.4, 0.003);
near('ΣV = 470.45 kN/m', das('SV', 'kN/m'), 470.45, 0.002);
near('ΣMR = 1128.98 kN·m/m', das('SMr', 'kN*m/m'), 1128.98, 0.002);
near('ΣMo = 379.25 kN·m/m', das('SMo', 'kN*m/m'), 379.25, 0.003);
near('FS volteo = 2.98', das('FSv'), 2.98, 0.003);
near('Pp = 215 kN/m (Kp = 2.04, c = 40 kPa)', das('Ep', 'kN/m'), 215.0, 0.003);
near('FS deslizamiento = 2.73', das('FSd'), 2.73, 0.003);
near('Excentricidad e = 0.406 m', das('e', 'm'), 0.406, 0.005);
near('q punta = 189.2 kPa', das('qtoe', 'kPa'), 189.2, 0.003);
near('q talón = 45.9 kPa', das('qheel', 'kPa'), 45.9, 0.005);
truthy('Das 8.1: sin errores y todas las verificaciones cumplen', das.ctx.errors.length === 0 && das.ctx.checks.every(c => c.ok));
{ // sismo con kh = 0 reproduce el caso estático; con kh > 0 FS disminuye
  const s = block('retwall', { H: '6.7 m', B: '4 m', hz: '0.7 m', punta: '0.7 m', t1: '0.5 m', t2: '0.7 m', beta: '10 deg', phi: '30 deg', gs: '18 kN/m^3', gc: '23.58 kN/m^3', gf: '19 kN/m^3', phif: '20 deg', cf: '40 kPa', Df: '1.5 m', fp: '1', kh: '0.1' });
  truthy('Con kh = 0.1: FS sísmicos menores que los estáticos', s('FSvs') < s('FSv') && s('FSds') < s('FSd'), `FSvs = ${s('FSvs').toFixed(2)}, FSds = ${s('FSds').toFixed(2)}`);
  near('Kae (Rankine-virtual, δ = β) = KaeMO directo', s('Kae'), calc('K = KaeMO(30 deg, 10 deg, 0.1, 0, 10 deg)')('K'), 1e-9);
}

section('Plantillas del módulo');
for (const t of TEMPLATES.filter(x => x.id.startsWith('wa-'))) {
  const rr = runTemplate(t.id).res;
  truthy(`${t.name}: ${rr.ctx.checks.length} verificaciones, sin errores, todas cumplen`, rr.ctx.errors.length === 0 && rr.ctx.checks.length > 0 && rr.ctx.checks.every(c => c.ok),
    rr.ctx.errors.map(e => e.msg).concat(rr.ctx.checks.filter(c => !c.ok).map(c => c.label)).join('; '));
}
{
  const v = runTemplate('wa-voladizo');
  near('Voladizo: kh = 0.5·Z·S = 0.5·0.45·1.05', v('kh'), 0.23625);
  truthy('Voladizo: FS volteo estático ≥ 2 y sísmico ≥ 1.5', v('FSv') >= 2 && v('FSvs') >= 1.5);
  const bad = runTemplate('wa-voladizo', d => { d.blocks[1].src = d.blocks[1].src.replace('B = 4.00 m', 'B = 2.20 m'); });
  truthy('Voladizo con base insuficiente (B = 2.2 m) no cumple', bad.res.ctx.checks.some(c => !c.ok));
  const gr = runTemplate('wa-gravedad');
  truthy('Gravedad: sin tracción excesiva en la base del cuerpo', gr('ft1', 'kgf/cm^2') <= gr('ftadm', 'kgf/cm^2'));
  const ts = runTemplate('wa-tablestaca');
  near('Tablestaca: D = 1.2·D0 redondeado', ts('D', 'm'), Math.ceil(1.2 * ts('D0', 'm') / 0.25 - 1e-9) * 0.25, 1e-6);
}
done();
