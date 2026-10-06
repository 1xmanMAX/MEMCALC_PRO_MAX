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
{ // Jarquio (1981), Das cap. 7: P = q/90·H(θ2−θ1); z̄ desde la base
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


section('Revisión — ejemplos publicados y comprobaciones adicionales');
{ // Das, Principles of Foundation Engineering (7.ª ed.), Ejemplo 7.6: φ = 30°, δ = 15°, θ = α = 0, kv = 0, kh = 0.2,
  // γ = 15.5 kN/m³, H = 4 m → Kae = 0.452, Pae = ½γH²Kae = 56.05 kN/m; Ka (Coulomb) = 0.3014
  const d = calc(`Kae = KaeMO(30 deg, 15 deg, 0.2)
Pae = 0.5*15.5 kN/m^3*(4 m)^2*Kae
Ka = KaCoulomb(30 deg, 15 deg)`);
  near('Das Ej. 7.6: Kae = 0.452', d('Kae'), 0.452, 0.002);
  near('Das Ej. 7.6: Pae = 56.05 kN/m', d('Pae', 'kN/m'), 56.05, 0.003);
  near('Das Ej. 7.6: Ka Coulomb = 0.3014', d('Ka'), 0.3014, 0.002);
}
{ // Adnan Menderes Univ. (S. Sağlam), «Retaining wall problems», P1 — muro en voladizo, sin pasivo:
  // H = 8 m, B = 5 m, base 1 m, punta 1 m, pantalla 0.5→1.0 m (trasdós inclinado), γ = 18, γc = 24 kN/m³,
  // φ = 30°, q = 30 kPa (no estabiliza), tan δb = 0.5 → ΣV = 655.5 kN/m, ΣMr = 1855.75, ΣMo = 832, FSv = 2.23, FSd = 1.20
  const p1 = block('retwall', { H: '8 m', B: '5 m', hz: '1 m', punta: '1 m', t1: '0.5 m', t2: '1.0 m', ie: '0 m', q: '30 kPa', gs: '18 kN/m^3', gc: '24 kN/m^3', phi: '30 deg', Ka: '0.333', mu: '0.5', qa: '0', fsv: '2', fsd: '1.5' });
  near('Sağlam P1: ΣV = 655.5 kN/m', p1('SV', 'kN/m'), 655.5, 0.001);
  near('Sağlam P1: ΣMr = 1855.75 kN·m/m', p1('SMr', 'kN*m/m'), 1855.75, 0.001);
  near('Sağlam P1: ΣMo = 832 kN·m/m', p1('SMo', 'kN*m/m'), 832, 0.002);
  near('Sağlam P1: FS volteo = 2.23', p1('FSv'), 2.23, 0.003);
  near('Sağlam P1: FS deslizamiento = 1.20 (< 1.5: NO CUMPLE)', p1('FSd'), 1.205, 0.003);
  truthy('Sağlam P1: el bloque marca NO CUMPLE el deslizamiento', p1.ctx.checks.some(c => !c.ok && /Deslizamiento/.test(c.label)));
  // P2 — muro de gravedad, Coulomb: φ = 32°, δ = 21.3°, trasdós a 75° de la horizontal (θ = 15°) → Ka = 0.4023,
  // Pa = ½·18.5·6.5²·Ka = 157.22 kN/m, Ph = Pa cos 36.3° = 126.65 kN/m
  const p2 = calc(`Ka = KaCoulomb(32 deg, 21.3 deg, 0 deg, 15 deg)
Pa = 0.5*18.5 kN/m^3*(6.5 m)^2*Ka
Ph = Pa*cos(36.3 deg)`);
  near('Sağlam P2: Ka Coulomb (θ = 15°) = 0.4023', p2('Ka'), 0.4023, 0.002);
  near('Sağlam P2: Pa = 157.22 kN/m', p2('Pa', 'kN/m'), 157.22, 0.003);
  near('Sağlam P2: Ph = 126.65 kN/m', p2('Ph', 'kN/m'), 126.65, 0.003);
}
{ // NAVFAC DM-7.2 (Terzaghi): la integral de σh de la carga lineal en la altura H debe dar PL (0.55 QL si m ≤ 0.4; 0.64 QL/(m²+1) si m > 0.4)
  for (const x of [1, 4]) {
    let P = 0; const N = 2000, H = 5; for (let i = 0; i < N; i++) { const z = (i + 0.5) * H / N; P += calc(`s = sigmaHline(2 tonf/m, ${x} m, ${z} m, ${H} m)`)('s', 'tonf/m^2') * H / N; }
    near(`Carga lineal m = ${x / 5}: ∫σh dz = PL (NAVFAC)`, P, calc(`P = PLine(2 tonf/m, ${x} m, 5 m)`)('P', 'tonf/m'), 0.03);
  }
}
{ // Kpe: identidad de Arango con ejes rotados −ψ (pasivo): Kpe(φ,δ,β,θ) = Kp(φ,δ,β−ψ,θ−ψ)·cos²(θ−ψ)/(cosψ cos²θ)
  const psi = Math.atan(0.15), th = r(5), ps = psi * 180 / Math.PI;
  const k = calc(`A = KpeMO(32 deg, 10 deg, 0.15, 0, 5 deg, 5 deg)
B = KpCoulomb(32 deg, 10 deg, ${5 - ps} deg, ${5 - ps} deg)`);
  near('Kpe = Kp de Coulomb con ejes rotados −ψ (Arango)', k('A'), k('B') * Math.cos(th - psi) ** 2 / (Math.cos(psi) * Math.cos(th) ** 2), 1e-6);
}
{ // M-O sin equilibrio (φ − β − ψ < 0): valor acotado (EN 1998-5 E.4) y el bloque marca NO CUMPLE, sin errores
  const k = calc(`K = KaeMO(20 deg, 10 deg, 0.45)
m = MOequil(20 deg, 0.45)`);
  truthy('KaeMO con φ − ψ < 0 devuelve un valor finito', Number.isFinite(k('K')) && k('K') > 0.5, `K = ${k('K').toFixed(3)}`);
  truthy('MOequil < 0 cuando no hay equilibrio', k('m', 'deg') < 0);
  const w = block('retwall', { H: '5 m', B: '3.5 m', hz: '0.5 m', punta: '0.8 m', t1: '0.25 m', t2: '0.45 m', phi: '20 deg', gs: '1.8 tonf/m^3', q: '0', kh: '0.45', qa: '2 kgf/cm^2' });
  truthy('retwall con sismo excesivo: NO CUMPLE sin errores ni NaN', w.ctx.errors.length === 0 && w.ctx.checks.some(c => !c.ok) && w.ctx.checks.every(c => c.ratio === null || Number.isFinite(c.ratio)));
}
{ // Coulomb con sobrecarga: Eq = Ka·q·H·cosθ·cosβ/cos(θ − β) — cuña de prueba con q por unidad de área horizontal
  const p = 32, d = 21.33, b = 10, t = 15; const [P, D, Bt, Tt] = [p, d, b, t].map(r);
  let best = 0; const H = 1, xt = -H * Math.tan(Tt), L = Math.hypot(xt, H), ang = Math.atan2(-xt / L, H / L) + D;
  for (let a = 0.02; a < Math.PI / 2; a += 0.0002) {
    const den = Math.tan(a) - Math.tan(Bt); if (den <= 0) continue; const x = (H - xt * Math.tan(Bt)) / den; if (x <= xt) continue;
    const Wq = x - xt, ra = Math.atan2(Math.cos(a), -Math.sin(a)) - P; // sobrecarga q = 1 sobre el ancho horizontal de la cuña
    const Px = Math.cos(ang), Py = Math.sin(ang), Rx = Math.cos(ra), Ry = Math.sin(ra), det = Px * Ry - Rx * Py;
    const Pq = (-Rx * Wq) / det; if (Pq > best) best = Pq;
  }
  const Ka = calc(`K = KaCoulomb(${p} deg, ${d} deg, ${b} deg, ${t} deg)`)('K');
  near('Coulomb: empuje de la sobrecarga = Ka·q·H·cosθcosβ/cos(θ−β) (cuña)', Ka * Math.cos(Tt) * Math.cos(Bt) / Math.cos(Tt - Bt), best, 0.003);
}
{ // Nivel freático en retwall — cálculo manual independiente (Rankine, β = 0)
  // H = 6, B = 4, hz = 0.6, punta = 1, t = 0.4, γ = 1.8, γsat = 2.0, γw = 1, hw = 2 m, φ = 30°, μ = 0.5
  const w = block('retwall', { H: '6 m', B: '4 m', hz: '0.6 m', punta: '1 m', t1: '0.4 m', t2: '0.4 m', ie: '0 m', q: '0', gs: '1.8 tonf/m^3', gsat: '2 tonf/m^3', gc: '2.4 tonf/m^3', phi: '30 deg', mu: '0.5', hw: '2 m', qa: '0', fsv: '1.5', fsd: '1.2' });
  const Ka = 1 / 3, P1 = 0.5 * Ka * 1.8 * 16, y1 = 2 + 4 / 3, a = Ka * 7.2, c = Ka * 9.2, P2 = (a + c), y2 = 2 * (c + 2 * a) / (3 * (a + c));
  const Pa = P1 + P2, Pw = 2, U = 4, W = 0.4 * 5.4 * 2.4 + 4 * 0.6 * 2.4 + 2.6 * 1.4 * 2.0 + 2.6 * 4 * 1.8;
  const Mr = 0.4 * 5.4 * 2.4 * 1.2 + 4 * 0.6 * 2.4 * 2 + (2.6 * 1.4 * 2.0 + 2.6 * 4 * 1.8) * 2.7, Mo = P1 * y1 + P2 * y2 + Pw * 2 / 3 + U * 8 / 3;
  near('N.F.: empuje efectivo Ka[½γd² + γd·hw + ½γ\'hw²] = 10.27 t/m', w('Pa', 'tonf/m'), Pa, 1e-6);
  near('N.F.: empuje hidrostático ½γw·hw² = 2.00 t/m', w('Pw', 'tonf/m'), Pw, 1e-9);
  near('N.F.: subpresión ½γw·hw·B = 4.00 t/m', w('Uw', 'tonf/m'), U, 1e-9);
  near('N.F.: ΣV = W − U', w('SV', 'tonf/m'), W - U, 1e-6);
  near('N.F.: FS volteo = ΣMr/(ΣMo + U·2B/3)', w('FSv'), Mr / Mo, 1e-6);
  near('N.F.: FS deslizamiento = μ(W − U)/(Ea + Ew)', w('FSd'), 0.5 * (W - U) / (Pa + Pw), 1e-6);
  const w0 = block('retwall', { H: '6 m', B: '4 m', hz: '0.6 m', punta: '1 m', t1: '0.4 m', t2: '0.4 m', ie: '0 m', q: '0', gs: '1.8 tonf/m^3', gc: '2.4 tonf/m^3', phi: '30 deg', mu: '0.5', qa: '0' });
  truthy('El nivel freático reduce FS de volteo y deslizamiento', w('FSv') < w0('FSv') && w('FSd') < w0('FSd'), `FSd ${w0('FSd').toFixed(2)} → ${w('FSd').toFixed(2)}`);
  const ws = block('retwall', { H: '6 m', B: '4 m', hz: '0.6 m', punta: '1 m', t1: '0.4 m', t2: '0.4 m', ie: '0 m', q: '0', gs: '1.8 tonf/m^3', gsat: '2 tonf/m^3', gc: '2.4 tonf/m^3', phi: '30 deg', mu: '0.5', hw: '2 m', kh: '0.1', qa: '0' });
  truthy('N.F. con sismo: sin errores y FS sísmico menor', ws.ctx.errors.length === 0 && ws('FSds') < ws('FSd'));
}
{ // Combinación sísmica del refuerzo de la pantalla: por defecto U2 = 1.7 CE + 1.0 CS
  const pr = { hp: '4 m', t1: '0.25 m', t2: '0.40 m', Ka: '0.3', gs: '1.8 tonf/m^3', q: '0', DKae: '0.15', kh: '0', fc: '210 kgf/cm^2', fy: '4200 kgf/cm^2', barra: '6', s: '15 cm', corte: '0' };
  const wr = block('wallrebar', pr);
  near('wallrebar: Mu base = 1.7·Ka·γ·h³/6 + 1.0·ΔKae·γ·h²/2·0.6h', wr('Mub', 'tonf*m/m'), 1.7 * 0.3 * 1.8 * 64 / 6 + 0.15 * 1.8 * 16 / 2 * 2.4, 1e-6);
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
  const bad = runTemplate('wa-voladizo', d => { d.blocks[1].src = d.blocks[1].src.replace('B = 4.50 m', 'B = 2.20 m'); });
  truthy('Voladizo con base insuficiente (B = 2.2 m) no cumple', bad.res.ctx.checks.some(c => !c.ok));
  const gr = runTemplate('wa-gravedad');
  truthy('Gravedad: sin tracción excesiva en la base del cuerpo', gr('ft1', 'kgf/cm^2') <= gr('ftadm', 'kgf/cm^2'));
  const ts = runTemplate('wa-tablestaca');
  near('Tablestaca: D = 1.2·D0 redondeado', ts('D', 'm'), Math.ceil(1.2 * ts('D0', 'm') / 0.25 - 1e-9) * 0.25, 1e-6);
}

section('Plantillas con datos extremos: NO CUMPLE sin errores ni NaN');
for (const [id, a, b] of [['wa-voladizo', 'B = 4.50 m', 'B = 2.00 m'], ['wa-voladizo', 'phis = 32 deg', 'phis = 15 deg'], ['wa-gravedad', 'phis = 32 deg', 'phis = 12 deg'],
  ['wa-contrafuertes', 'B = 6.50 m', 'B = 3.00 m'], ['wa-sotano', 'tw = 0.30 m', 'tw = 0.12 m'], ['wa-sotano', 'hs = 3.20 m', 'hs = 6.00 m'], ['wa-gaviones', 'b1 = 3.00 m', 'b1 = 1.50 m'],
  ['wa-mse', 'L = 4.50 m', 'L = 2.00 m'], ['wa-tablestaca', 'Sx = 1300', 'Sx = 300'], ['wa-tablestaca-anclada', 'phis = 32 deg', 'phis = 20 deg'], ['wa-coeficientes', 'kh = 0.20', 'kh = 0.70']]) {
  const rr = runTemplate(id, d => d.blocks.forEach(bl => { if (bl.src) bl.src = bl.src.replace(a, b); })).res;
  const okNum = rr.ctx.checks.every(c => c.ratio === null || c.ratio === undefined || Number.isFinite(c.ratio));
  truthy(`${id} con ${b}: NO CUMPLE, sin errores ni D/C no numérico`, rr.ctx.errors.length === 0 && okNum && rr.ctx.checks.some(c => !c.ok), rr.ctx.errors.map(e => e.msg).join('; '));
}
section('QA de plantillas: «validacion» y rangos usuales [mín..máx] de los datos');
for (const t of TEMPLATES.filter(x => x.id.startsWith('wa-'))) {
  const v = t.validacion;
  truthy(`${t.id}: tiene «validacion» con fuente, nota y valores`, !!(v && v.fuente && v.nota && Array.isArray(v.valores) && v.valores.length >= 3));
  const r = runTemplate(t.id).res, ins = r.ctx.inputs.filter(i => i.range);
  const fuera = ins.filter(i => { const x = parseFloat(i.num); return !(x >= i.range.min && x <= i.range.max); });
  truthy(`${t.id}: ${ins.length} datos con rango usual, valores por defecto dentro del rango`, ins.length >= 3 && fuera.length === 0, fuera.map(i => i.name + ' = ' + i.num).join(', '));
  const sinEtq = r.ctx.inputs.filter(i => !i.label);
  truthy(`${t.id}: todos los datos tienen etiqueta`, sinEtq.length === 0, sinEtq.map(i => i.name).join(', '));
}
done();
