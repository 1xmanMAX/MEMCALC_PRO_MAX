// =====================================================================
//  Plantillas — módulo «walls» (muros de contención y estructuras de retención)
//  Fuentes, fórmulas y ejemplos de validación: docs/referencias/walls.md
// =====================================================================
import { calc, text, summary } from './_h.js';

const CAT = 'Muros de contención';

// Bloque común de peligro sísmico (E.030-2018/2026, coeficiente pseudoestático)
const SISMO = `## Coeficientes sísmicos (método pseudoestático)
zona = 4 // Zona sísmica (E.030 Art. 10) [4 : Zona 4|3 : Zona 3|2 : Zona 2|1 : Zona 1]
Z = si(zona == 4, 0.45, si(zona == 3, 0.35, si(zona == 2, 0.25, 0.10))) // Aceleración máxima en roca, en g (E.030 Tabla N° 1)
S = 1.05 // Factor de amplificación del suelo (E.030 Tabla N° 3, zona 4) [1.00 : S1 roca o suelo muy rígido|1.05 : S2 suelo intermedio|1.10 : S3 suelo blando]
PGA = Z*S // Aceleración máxima del terreno en la superficie (AASHTO 11.6.5.2: kh0 = Fpga·PGA)
kh = khWall(PGA) // kh = 0.5·kh0: el muro puede desplazarse 25–50 mm (AASHTO 11.6.5.2.2)
kv = 0 // Coeficiente vertical: se desprecia (AASHTO 11.6.5.2.2)`;

// =====================================================================
//  1) MURO EN VOLADIZO CON SISMO
// =====================================================================
const voladizo = {
  id: 'wa-voladizo', pais: 'PE', cat: CAT, icon: 'wall', settings: {},
  name: 'Muro en voladizo con sismo (M-O) — diseño completo',
  normas: 'RNE — NTE E.020, E.030, E.050 (39.13), E.060; AASHTO LRFD 11.6',
  desc: 'Estabilidad estática y sísmica (Mononobe–Okabe + inercia) con dentellón, diseño de pantalla, punta y talón por flexión y cortante (E.060), corte de barras y refuerzo de temperatura.',
  titulo: 'Diseño de muro de contención en voladizo H = 5.00 m con sismo',
  blocks: [
    text(`# Generalidades
## Descripción
Muro de contención de concreto armado en voladizo (T invertida) que sostiene un relleno granular compactado de 4.40 m sobre la zapata. Incluye un **dentellón** (llave de corte) bajo la pantalla para movilizar empuje pasivo adicional frente al deslizamiento. Se analiza por metro lineal de muro.

## Normas y referencias
- RNE **NTE E.020** Cargas (sobrecarga sobre el relleno); **NTE E.030** Diseño Sismorresistente (factor de zona $Z$ y de suelo $S$).
- RNE **NTE E.050** Suelos y Cimentaciones: Art. 39.13 (muros de contención, FS mínimos 1.50 estático y 1.25 pseudodinámico) y Art. 21 (FS de capacidad portante 3.0 / 2.5).
- RNE **NTE E.060** Concreto Armado: 9.2.3 (combinación con empuje lateral $U = 1.4CM + 1.7CV + 1.7CE$), 9.3 (factores $\\phi$), 10.5 (acero mínimo), 11.3 (cortante), 12.5 y 12.10 (anclaje y corte de barras), 14.3 (refuerzo de muros).
- AASHTO LRFD Bridge Design Specifications, Secc. 3.11 y 11.6 (método pseudoestático, $k_h = 0.5\\,k_{h0}$, inercia del muro y del suelo sobre el talón).
- B. M. Das, *Principios de ingeniería de cimentaciones*, cap. 7 y 8; J. Calavera, *Muros de contención y muros de sótano*; R. Morales, *Diseño en concreto armado*; R. Torres Belandria, *Análisis y diseño de muros de contención de concreto armado*.

## Metodología
1. Empuje activo de **Rankine** sobre el plano vertical que pasa por el extremo del talón (el suelo sobre el talón forma parte del muro).
2. Empuje sísmico total por **Mononobe–Okabe** con $\\delta = \\beta$ en el plano virtual; el incremento dinámico $\\Delta E_{ae} = E_{ae} - E_a$ se aplica a $0.6H$ (Seed y Whitman, 1970) y se añade la inercia $k_h W$ del muro y del suelo sobre el talón.
3. Estabilidad: volteo, deslizamiento (fricción + empuje pasivo frente a la punta y el dentellón), excentricidad y presiones de contacto.
4. Diseño por resistencia (E.060) de la pantalla, la punta y el talón; corte de barras y refuerzo mínimo.`),
    calc(`# Datos de diseño
## Geometría (por metro lineal)
H = 5.00 m // Altura total: fondo de cimentación a corona (E.050 39.13.5)
hz = 0.60 m // Espesor de la zapata (predimensionado ≈ H/10 a H/12)
B = 4.00 m // Ancho de la base (0.5H a 0.8H, Das 8.2; aumentado por sismo)
Lp = 0.90 m // Longitud de la punta (≈ B/4 a B/3)
t1 = 0.25 m // Espesor de la pantalla en la corona (≥ 0.20 m)
t2 = 0.50 m // Espesor de la pantalla en la base (≈ H/10)
bk = 0.50 m // Ancho del dentellón (bajo la pantalla)
hk = 0.70 m // Profundidad del dentellón bajo la zapata
Df = 1.20 m // Altura del suelo frente a la punta, desde el fondo de la zapata
hp = H - hz // Altura de la pantalla
Lt = B - Lp - t2 // Longitud del talón
## Relleno (parámetros del EMS, E.050 16.2.9)
gammas = 1.90 tonf/m^3 // Peso unitario del relleno granular compactado
phis = 32 deg // Ángulo de fricción interna del relleno
beta = 0 deg // Inclinación de la superficie del relleno
ws = 1.00 tonf/m^2 // Sobrecarga sobre el relleno (tránsito peatonal y vehicular liviano, E.020)
## Suelo de cimentación
gammaf = 1.85 tonf/m^3 // Peso unitario del suelo frente al muro
phif = 30 deg // Ángulo de fricción del suelo de cimentación
mu = 0.55 // Coeficiente de fricción concreto–suelo tan δ (EMS, E.050 16.2.9 k)
qa = 2.50 kgf/cm^2 // Presión admisible (FS = 3.0, E.050 Art. 21–22)
## Materiales
fc = 210 kgf/cm^2 // Resistencia del concreto [175 kgf/cm^2|210 kgf/cm^2|280 kgf/cm^2]
fy = 4200 kgf/cm^2 // Acero ASTM A615 Grado 60
gammac = 2.40 tonf/m^3 // Peso unitario del concreto armado (E.020 Anexo 1)
rec = 5 cm // Recubrimiento de la pantalla, concreto expuesto al suelo (E.060 7.7.1 b)
recz = 7.5 cm // Recubrimiento de la zapata vaciada contra el suelo (E.060 7.7.1 a)
${SISMO}
## Coeficientes de empuje
Ka = KaRankine(phis, beta) // Activo de Rankine (Das ec. 7.?; β = 0 → tan²(45° − φ/2))
Kae = KaeMO(phis, beta, kh, kv, beta) // Activo sísmico de Mononobe–Okabe, δ = β en el plano virtual (AASHTO 11.6.5.3)
DKae = Kae - Ka // Incremento dinámico del coeficiente
DKsw = DKaeSW(kh) // Comparación: Seed–Whitman ΔKae ≈ ¾ kh
Kp = KpRankine(phif) // Pasivo de Rankine del suelo frente a la punta
qas = qaSismoE050(qa) // Presión admisible sísmica: FS 2.5 en lugar de 3.0 (E.050 Art. 21)`),
    text(`# Estabilidad externa
Se consideran todas las fuerzas por metro de muro respecto a la arista exterior de la punta. La sobrecarga sobre el talón **no** se toma como fuerza estabilizante en el volteo y el deslizamiento (conservador), pero sí en las presiones de contacto. El empuje pasivo se calcula en toda la altura $D_f + h_k$ frente a la punta y el dentellón (en sismo con $K_{pe}$ de Mononobe–Okabe); el relleno frente al muro debe colocarse compactado y protegerse de la erosión y de excavaciones futuras.`),
    { type: 'retwall', tipo: 'voladizo', metodo: 'rankine', H: 'H', B: 'B', hz: 'hz', punta: 'Lp', t1: 't1', t2: 't2', bk: 'bk', hk: 'hk', xk: 'Lp', beta: 'beta', q: 'ws', gs: 'gammas', phi: 'phis', gc: 'gammac', gf: 'gammaf', phif: 'phif', mu: 'mu', Df: 'Df', fp: '1', kh: 'kh', kv: 'kv', qa: 'qa', qas: 'qas', fsv: '2.0', fsd: '1.5', fsvs: '1.5', fsds: '1.25', titulo: 'Muro en voladizo: fuerzas actuantes, empujes estático y sísmico y presiones en la base (condición estática)' },
    calc(`# Diseño de la pantalla
"La pantalla trabaja como un voladizo empotrado en la zapata. Combinaciones: $U_1 = 1.7\\,(CE + CV_{sc})$ (E.060 9.2.3) y, con sismo, $U_2 = 1.25\\,CE + 1.0\\,CS$, con el 50 % de la sobrecarga; $CS$ incluye el incremento de Mononobe–Okabe a $0.6\\,h_p$ y la inercia de la pantalla.
## Flexión en la base de la pantalla
Mus = 1.7*(Ka*gammas*hp^3/6 + Ka*ws*hp^2/2) -> tonf*m/m // U = 1.7 CE (E.060 9.2.3)
Mue = 1.25*(Ka*gammas*hp^3/6 + Ka*0.5*ws*hp^2/2) + 1.0*(DKae*gammas*hp^2/2*0.6*hp + kh*gammac*(t1 + t2)/2*hp^2/2) -> tonf*m/m // U = 1.25 CE + 1.0 CS
Mu = max(Mus, Mue) // Momento último de diseño
bar = 6 // Varilla vertical interior [5 : 5/8"|6 : 3/4"|8 : 1"]
d = t2 - rec - db(bar)/2 // Peralte efectivo
Rn = Mu/(0.9*d^2) -> kgf/cm^2 // φ = 0.90 (E.060 9.3.2.1)
rho = 0.85*fc/fy*(1 - sqrt(1 - 2*Rn/(0.85*fc))) // Cuantía requerida
As_req = rho*d -> cm^2/m // Acero requerido por metro
As_min = 0.0018*t2 -> cm^2/m // Acero mínimo de losas y muros en flexión (E.060 10.5.4 y 9.7.2)
As = max(As_req, As_min)
s = rounddown(Ab(bar)/As, 2.5 cm) // Espaciamiento de la varilla elegida
check s <= min(3*t2, 40 cm) // Espaciamiento máximo del refuerzo principal (E.060 10.5.4)
rhob = 0.85*0.85*fc/fy*6000 kgf/cm^2/(6000 kgf/cm^2 + fy) // Cuantía balanceada (β1 = 0.85)
check rho <= 0.75*rhob // Cuantía máxima (E.060 10.3.4)
## Cortante a una distancia d de la base (E.060 11.1.3)
zv = hp - d // Profundidad de la sección crítica desde la corona
Vus = 1.7*(Ka*gammas*zv^2/2 + Ka*ws*zv) -> tonf/m
Vue = 1.25*(Ka*gammas*zv^2/2 + Ka*0.5*ws*zv) + 1.0*(DKae*gammas*zv^2/2 + kh*gammac*(t1 + t2)/2*zv) -> tonf/m
Vu = max(Vus, Vue)
phiVc = 0.85*0.53*sqrtfc(fc)*d -> tonf/m // φVc = 0.85·0.53√f'c·b·d (E.060 11.3.1.1, φ = 0.85)
check Vu <= phiVc // Cortante en la pantalla (sin estribos)`),
    { type: 'wallrebar', hp: 'hp', t1: 't1', t2: 't2', Ka: 'Ka', gs: 'gammas', q: 'ws', DKae: 'DKae', kh: 'kh', gc: 'gammac', fc: 'fc', fy: 'fy', rec: 'rec', barra: 'bar', s: 's', corte: '0.5' },
    calc(`## Refuerzo horizontal y de la cara exterior (E.060 14.3)
tm = (t1 + t2)/2 // Espesor medio de la pantalla
Ash = 0.0020*tm -> cm^2/m // Cuantía horizontal mínima 0.0020 (barras ≤ 5/8", fy ≥ 4200; E.060 14.3.3)
sh_ext = rounddown(Ab(4)/(2/3*Ash), 2.5 cm) // 2/3 en la cara exterior expuesta, varilla de 1/2" (E.060 14.3.4)
sh_int = rounddown(Ab(3)/(1/3*Ash), 2.5 cm) // 1/3 en la cara en contacto con el relleno, varilla de 3/8"
check max(sh_ext, sh_int) <= min(3*tm, 40 cm) // Espaciamiento máximo (E.060 14.3.5)
Asv_ext = 0.0012*t2 -> cm^2/m // Refuerzo vertical mínimo de la cara exterior (E.060 14.3.2)
sv_ext = rounddown(Ab(4)/Asv_ext, 2.5 cm) // Varilla de 1/2" en la cara exterior
check sv_ext <= min(3*t2, 40 cm) // Espaciamiento del refuerzo vertical exterior
## Anclaje del refuerzo vertical en la zapata (E.060 12.5)
ldg = max(0.075*fy*db(bar)/sqrtfc(fc), 8*db(bar), 15 cm) // Longitud de desarrollo con gancho estándar
check ldg <= hz - recz // El gancho cabe en el peralte de la zapata
"Refuerzo de la pantalla: cara interior varilla {bar} (Ø según lista) @ {s} con la mitad de las barras cortadas a {hcorte} sobre la zapata; cara exterior 1/2\\" @ {sv_ext} vertical; horizontal 1/2\\" @ {sh_ext} (exterior) y 3/8\\" @ {sh_int} (interior).
# Diseño de la zapata
"Presiones de contacto de servicio obtenidas en la estabilidad. La longitud de contacto es $L_c = \\min\\left[B,\\ 3\\left(B/2 - e\\right)\\right]$ y la presión varía linealmente con pendiente $m = (q_{talón} - q_{punta})/L_c$. Mayoración: estático $1.7$ (E.060 9.2.3) y sísmico $1.25$; el peso propio de la punta se reduce con $0.9$ (E.060 9.2.3, carga muerta favorable).
check e >= 0 m // Resultante hacia la punta (hipótesis de las fórmulas siguientes)
Lcs = min(B, 3*(B/2 - e)) // Longitud de contacto, estático
Lce = min(B, 3*(B/2 - es)) // Longitud de contacto, sismo
slS = (qheel - qtoe)/Lcs // Pendiente del diagrama estático
slE = (qheels - qtoes)/Lce // Pendiente del diagrama sísmico
## Punta (voladizo desde la cara de la pantalla)
Mp(q0, m) = q0*Lp^2/2 + m*Lp^3/6
Mwp = gammac*hz*Lp^2/2 -> tonf*m/m // Momento del peso propio de la punta (relleno sobre la punta despreciado)
Mup = max(1.7*Mp(qtoe, slS), 1.25*Mp(qtoes, slE)) - 0.9*Mwp -> tonf*m/m // Momento último en la cara de la pantalla
dz = hz - recz - db(5)/2 // Peralte efectivo de la zapata (varilla de 5/8")
Asp = max(0.85*fc/fy*(1 - sqrt(1 - 2*Mup/(0.9*0.85*fc*dz^2)))*dz, 0.0018*hz) -> cm^2/m // Acero inferior (mínimo E.060 10.5.4)
sp = rounddown(Ab(5)/Asp, 2.5 cm) // Varilla de 5/8"
check sp <= min(3*hz, 40 cm) // Espaciamiento máximo
Lv = Lp - dz // Tramo a d de la cara (E.060 11.1.3)
Vp(q0, m) = q0*Lv + m*Lv^2/2
Vup = max(1.7*Vp(qtoe, slS), 1.25*Vp(qtoes, slE)) - 0.9*gammac*hz*Lv -> tonf/m
phiVcz = 0.85*0.53*sqrtfc(fc)*dz -> tonf/m
check Vup <= phiVcz // Cortante en la punta
## Talón (voladizo desde la cara posterior de la pantalla)
xb = Lp + t2 // Abscisa de la cara posterior de la pantalla
wds = gammas*hp + gammac*hz + ws // Carga descendente, estático
wde = gammas*hp + gammac*hz + 0.5*ws // Carga descendente, sismo
Mq(q0, m, Lc) = si(Lc > xb, (q0 + m*xb)*(min(Lc, B) - xb)^2/2 + m*(min(Lc, B) - xb)^3/6, 0 tonf*m/m) // Momento de la reacción del suelo bajo el talón
Vq(q0, m, Lc) = si(Lc > xb, (q0 + m*xb)*(min(Lc, B) - xb) + m*(min(Lc, B) - xb)^2/2, 0 tonf/m) // Resultante de la reacción bajo el talón
Mut = max(1.7*(wds*Lt^2/2 - Mq(qtoe, slS, Lcs)), 1.25*(wde*Lt^2/2 - Mq(qtoes, slE, Lce))) -> tonf*m/m // Momento último (tracción arriba)
Ast = max(0.85*fc/fy*(1 - sqrt(1 - 2*Mut/(0.9*0.85*fc*dz^2)))*dz, 0.0018*hz) -> cm^2/m // Acero superior del talón
sth = rounddown(Ab(5)/Ast, 2.5 cm) // Varilla de 5/8"
check sth <= min(3*hz, 40 cm) // Espaciamiento máximo
Vut = max(1.7*(wds*Lt - Vq(qtoe, slS, Lcs)), 1.25*(wde*Lt - Vq(qtoes, slE, Lce))) -> tonf/m // Cortante en la cara (reacción que tracciona: sección en la cara)
check Vut <= phiVcz // Cortante en el talón
## Refuerzo transversal de temperatura (E.060 9.7.2)
Astemp = 0.0018*hz -> cm^2/m // Repartido en ambas caras
stemp = rounddown(Ab(4)/(Astemp/2), 2.5 cm) // Varilla de 1/2" en cada cara
check stemp <= min(3*hz, 40 cm) // Espaciamiento máximo del refuerzo por temperatura
"Zapata: inferior 5/8\\" @ {sp} (punta), superior 5/8\\" @ {sth} (talón), transversal 1/2\\" @ {stemp} en ambas caras. Dentellón con el refuerzo vertical de la pantalla prolongado y estribos mínimos.`),
    text(`> **Drenaje (E.050 39.13.8):** colocar filtro de grava graduada o geodren detrás de la pantalla, lloraderos de PVC Ø 3" @ 1.50 m y tubería perforada en el talón para evitar presiones de agua, que no se han considerado en este cálculo. Juntas verticales de contracción cada 6–9 m.`),
    summary(),
  ],
};

export default [voladizo];
