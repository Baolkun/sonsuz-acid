// Formül dili. TikTok'taki gibi bütün müzik tek bir y(x) formülü:
// x = vuruş (her sayfa x = −8'den 8'e, 16 vuruş), y = perde (oktav). Formülün iki satırı var ve videodaki gibi
// ikisi iki ayrı ses olarak aynı anda çalar: üstteki kick satırı (yalnızca koşulu tutarken) ve alttaki melodi.
// Melodi kendi kaydında kalır: üst kat (hoket) hep kökün bir oktav üstünde, tek oktav içinde gezinir; dolgu ve
// hoket notaları "mod F" ile sınırlı (F = Aralık ayarı).
// Kayma (303'teki slide): işaretli adımda nota bir öncekinden e üssüyle süzülür; perde kopmadığı için filtre yeniden
// açılmaz, notalar bağlanır. Vurgu adımı (j = acc) ses işçisinde 303'teki accent gibi daha yüksek ve parlak çalar;
// perde bir önceki notayla aynı olsa da yeniden vurulur.
// Ritim kalıbı (M): desen her M adımda (8: yarım ölçü, 16: ölçü) baştan başlar, ölçüye oturur ve kaymaz; b = ⌊4x⌋ mod M
// ölçüdeki adım. Kayma ve bükme ölçüde bir kez gelir (b'ye bağlı), dolgu iki ölçüde bir değişir (soru-cevap), akorlu
// vurgu notası ölçü ölçü tırmanır. Videodaki ilk yolculukta kalıp yok (M = null): 5'li desen ölçünün üstünde kayar.

export const REF_HZ = 164.81; // melodide y = 0 → E3; videodaki ses de buna oturuyor (taban −18/12 oktav → A♯1, 58 Hz)
export const KICK_HZ = REF_HZ / 2; // kick bir oktav aşağıda çalar: kuyruğu (base + 12)/12 tam köke (A♯1) düşer
export const MODE_NAMES = ['lokryen', 'frigyen', 'eolyen', 'doryen', 'miksolidyen', 'iyonyen', 'lidyen'];

export const mod = (a, n) => ((a % n) + n) % n;
const frac = (v) => v - Math.floor(v);

// S(m) = ⌊(12m + c)/7⌋ yedi notalı diziyi verir; c = 0…6 karanlıktan aydınlığa modu seçer (lokryen … lidyen)
export const scaleSemi = (c, m) => Math.floor((12 * m + c) / 7);

// ---------- hesap ----------

// kick o an çalıyorsa evresi (u), çalmıyorsa null
function kickPhase(kick, x) {
  if (!kick || x < (kick.from ?? -Infinity) || x >= (kick.to ?? Infinity)) return null;
  let u;
  let gate = 0.5;
  switch (kick.type) {
    case 'bar': u = 4 * frac(x / 4); gate = 1; break;
    case 'four': u = frac(x); break;
    case 'halfFour': { const R = x >= kick.at ? 1 : 2; u = R * frac(x / R); break; }
    case 'roll': u = frac((mod(x, kick.L) >= kick.L - 0.5 ? 4 : 1) * x); break;
    default: return null;
  }
  return u < gate ? u : null;
}

// adım: b ölçüdeki adım (kalıp yoksa ⌊4x⌋), j desendeki yer
function stepAt(sp, x) {
  const s = Math.floor(4 * x);
  const b = sp.M ? mod(s, sp.M) : s;
  return { b, j: mod(b + sp.p, sp.n) };
}

// K: dolgu ve hoket notalarının değiştiği dönem; kalıpta iki ölçüde bir, videoda desenin her turunda
export const PHRASE = 32; // adım
const cycleAt = (sp, x) => Math.floor((4 * x + sp.q) / (sp.M ? PHRASE : sp.n));

// alt satır: melodi, her an tanımlı
export function melodyY(sp, x) {
  const { b, j } = stepAt(sp, x);
  const K = cycleAt(sp, x);
  // akorlu vurgu notası: kalıpta ölçü ölçü tırmanır, videoda desenin turlarıyla
  const k = sp.M ? mod(Math.floor((x + 8) / 4), 4) : mod(K, 4);
  const r = rootAt(sp, x);
  const R = riseAt(sp, x);
  let y;
  if (sp.hocket && j % 3 > 0) {
    // ikinci kat: kök de "mod F"in içinde, böylece akor değişse de üst kat aynı oktavda kalır; her notanın başında perde zıplar
    y = (scaleSemi(sp.c, mod(r + sp.hocket.u * K + j + sp.hocket.v, sp.F) + R) + 12 + sp.base) / 12 + sp.hocket.chirp * Math.exp(-18 * frac(4 * x));
  } else {
    const here = scaleSemi(sp.c, r + R + degree(sp, j, K, k));
    let semi = here + sp.base;
    // kayma ve bükmenin yeri: kalıpta ölçünün adımı (ölçüde bir kez), videoda desenin adımı
    const at = sp.M ? b : j;
    if (sp.slide && at === sp.slide.j) semi += (scaleSemi(sp.c, r + R + degree(sp, mod(j - 1, sp.n), K, k)) - here) * Math.exp(-sp.slide.k * frac(4 * x));
    // oktav sıçraması: kalıpta vurgudan iki adım sonraki kök notasında (vurgunun üstüne binmez), videoda üç adımda bir
    if (sp.oct && (sp.M ? j === octStep(sp) : mod(b, 3) === 0 && j % 2 === 0)) semi += 12;
    if (at === sp.bend) semi -= 2 * (1 - Math.exp(-2 * frac(4 * x)));
    y = semi / 12;
  }
  if (sp.blip && mod(b, 3) === 0) y += sp.blip * Math.exp(-50 * frac(4 * x));
  if (sp.lift !== null) y += Math.max(0, x - sp.lift) / 2;
  return y;
}

// yükseliş: sayfanın ikinci yarısında melodi her w vuruşta dizide bir basamak çıkar (tonda kalır, vuruşa oturur)
const riseAt = (sp, x) => (sp.riser ? Math.floor(Math.max(0, x) / sp.riser.w) : 0);

const octStep = (sp) => mod(sp.acc + 2, sp.n);

// o ölçünün akor kökü (dizide basamak)
const rootAt = (sp, x) => sp.prog[mod(Math.floor((x + 8) / 4), 4)];

// bas satırında adımın kökten uzaklığı (basamak): vurgu adımında yukarı, tek adımlarda dolgu
function degree(sp, j, K, k) {
  let d = j === sp.acc ? (sp.chord ? Math.min(7, 2 + 2 * k) : 7) : 0;
  if (sp.fill && j % 2 === 1) d += mod(sp.fill.u * K + j + sp.fill.v, sp.F);
  return d;
}

// o an vurgulu adımda mı (303'teki accent); hoketin üst katı vurgulanmaz
export function accentAt(sp, x) {
  const { j } = stepAt(sp, x);
  return j === sp.acc && !(sp.hocket && j % 3 > 0);
}

// üst satır: kick, yalnızca koşulu tutarken tanımlı (yoksa null)
export function kickY(sp, x) {
  const u = kickPhase(sp.kick, x);
  return u === null ? null : 2.1 * Math.exp(-18 * u) + (sp.base + 12) / 12;
}

// hi-hat şiddeti dörtlüğün on altılıklarında: ara vuruş güçlü, vuruşun üstü orta, aradakiler kısık (hayalet)
export const HAT_V = [0.55, 0.35, 1, 0.45];
// swing: tek on altılıklar (vuruşun ikinci ve dördüncüsü) on altılığın bu kadarı geriden gelir (%56 swing)
export const SWING = 0.12;
// hi-hat: o on altılık çalıyorsa { open (açık hat: uzun), vel }, yoksa null. Dolgu: sayfanın son vuruşunda her on altılık
export function hatAt(sp, x) {
  const h = sp.hat;
  if (!h || x < (h.from ?? -Infinity)) return null;
  const i = mod(Math.floor(4 * x), 4);
  if (h.roll && x >= 7) return { open: false, vel: 0.4 + 0.15 * i }; // dolgu yükselerek gelir
  return h.on.includes(i) ? { open: h.open.includes(i), vel: HAT_V[i] } : null;
}

// clap: o on altılıkta çalıyor mu; ölçünün vuruşlarında, "son"da iki ölçüde bir son on altılıkta da
export function clapAt(sp, x) {
  const c = sp.clap;
  if (!c || x < (c.from ?? -Infinity)) return false;
  const s = Math.floor(4 * x);
  return (mod(s, 4) === 0 && c.beats.includes(mod(s / 4, 4))) || (c.son && mod(s, 32) === 31);
}

// ek vurmalı (shaker, rim, tom): m adımlık döngüde (4: her dörtlük, 16: ölçü, 32: iki ölçü) on'daki adımlarda çalar.
// { ses, vel, k (tom'da kaçıncı vuruş: perde iner) } ya da null. Shaker'da vurgu dörtlüğün ikinci ve dördüncü on altılığında
export const SHAKER_V = [0.45, 0.85, 0.55, 1];
export function perkAt(sp, x) {
  const p = sp.perk;
  if (!p || x < (p.from ?? -Infinity)) return null;
  const s = Math.floor(4 * x);
  const k = p.on.indexOf(mod(s, p.m));
  if (k < 0) return null;
  return { ses: p.ses, vel: p.ses === 'shaker' ? SHAKER_V[mod(s, 4)] : 1, k };
}

// pad: akorun üç notası (dizide kök, üçlü, beşli; i = 0, 1, 2), basın iki oktav üstünde, ölçü boyunca tutulur
export function padY(sp, x, i) {
  return sp.pad ? (scaleSemi(sp.c, rootAt(sp, x) + 2 * i) + 24 + sp.base) / 12 : null;
}

// hat ve clap satırları: adımın ilk yarısında tanımlı; y sesin parlaklığı (gürültünün süzüldüğü yer), başta parlak
// şeritler perdelerin (kick, pad, melodi: aşağı yukarı −2 … 2,2) dışında: hat ve perküsyon üstte, clap altta
export const HAT_Y = 3;
export const CLAP_Y = -2.7;
const GATE = 0.5;
export function hatY(sp, x) {
  const u = frac(4 * x) - SWING * mod(Math.floor(4 * x), 2);
  const hit = u >= 0 && u < GATE && hatAt(sp, x);
  return hit ? HAT_Y + 0.3 * hit.vel * Math.exp(-(hit.open ? 8 : 30) * u) : null;
}
// ek vurmalı satırı hat'in altında; söner: shaker orta, rim hızlı, tom yavaş
export const PERK_Y = 2.5;
export const PERK_K = { shaker: 18, rim: 40, tom: 6 };
export function perkY(sp, x) {
  const u = frac(4 * x) - (sp.perk?.ses === 'shaker' ? SWING * mod(Math.floor(4 * x), 2) : 0);
  return u >= 0 && u < GATE && perkAt(sp, x) ? PERK_Y + 0.25 * Math.exp(-PERK_K[sp.perk.ses] * u) : null;
}
export function clapY(sp, x) {
  const u = frac(4 * x);
  return u < GATE && clapAt(sp, x) ? CLAP_Y + 0.3 * Math.exp(-12 * u) : null;
}

// ---------- yazım: formül, videodaki gibi tek bir parçalı fonksiyon olarak ----------

const V = (t) => `<i>${t}</i>`;
const X = V('x');
const op = (t) => `<span class="op">${t}</span>`;
const fr = (a, b) => `<span class="kesir"><span>${a}</span><span>${b}</span></span>`;
const ex = (t) => `<i>e</i><sup>${t}</sup>`;
const HALF = fr('1', '2');
const FRAC = op('frac');
const MOD = op('mod');
const IF = op('if');
// değişebilen her sayı işaretli: değiştiğinde ekranda kırmızı yanar. e verilenler elle de oynatılır (tekerlek, tık, ↑↓)
const N = (key, v, e) => `<span class="p${e ? ' e' : ''}" data-k="${key}"${e ? ` data-e="${e}" tabindex="0"` : ''}>${String(v).replace('-', '−')}</span>`;
const BRACE = '<svg class="kume" viewBox="0 0 10 100" preserveAspectRatio="none" aria-hidden="true"><path d="M9 1C4 1 5.5 10 5.5 24S5 47 1 50C5 53 5.5 62 5.5 76S4 99 9 99" fill="none" stroke="currentColor" stroke-width="1.1" vector-effect="non-scaling-stroke"/></svg>';
const brace = (rows) => `<span class="parca">${BRACE}<span class="satirlar">${rows.map(([e, c]) => `<span>${e}</span><span class="kosul">${c || ''}</span>`).join('')}</span></span>`;

function kickRow(sp) {
  const { kick } = sp;
  const n = (v, e) => N('kick', v, e);
  let u;
  let gate = HALF;
  switch (kick.type) {
    case 'bar': u = `${n(4)}${FRAC}(${fr(X, n(4))})`; gate = '1'; break;
    case 'four': u = `${FRAC}(${X})`; break;
    case 'halfFour': { const R = `(2 − (${X} ≥ ${n(kick.at, 'kick.at')}))`; u = `${R}${FRAC}(${fr(X, R)})`; break; }
    case 'roll': u = `${FRAC}((1 + 3(${X} ${MOD} ${n(kick.L, 'kick.L')} ≥ ${fr(n(2 * kick.L - 1), 2)}))${X})`; break;
  }
  const from = (kick.from !== undefined ? `${X} ≥ ${n(kick.from)}, ` : '') + (kick.to !== undefined ? `${X} &lt; ${n(kick.to)}, ` : '');
  const t = sp.base + 12;
  const tail = t === -6 ? ` − ${HALF}` : t === 0 ? '' : ` − ${fr(N('base', -t), 12)}`;
  return [`2.1${ex(`−18${kick.type === 'bar' ? '·' : ''}${u}`)}${tail}`, `${IF} ${from}${u} &lt; ${gate}`];
}

const setOf = (a) => `{${a.join(', ')}}`;
const IN = op('∈');
const from = (o) => (o.from !== null && o.from !== undefined ? `${X} ≥ ${N('from', o.from)}, ` : '');

function hatRow(sp) {
  const h = sp.hat;
  const i = `⌊4${X}⌋ ${MOD} 4`;
  const lam = h.open.length ? `(30 − 22(${i} ${IN} ${N('hat', setOf(h.open))}))` : '30';
  const on = h.roll ? `(${i} ${IN} ${N('hat', setOf(h.on))} ∨ ${X} ≥ 7)` : `${i} ${IN} ${N('hat', setOf(h.on))}`;
  return [`${HAT_Y} + 0.3${V('v')}${ex(`−${lam}${V('u')}`)}`, `${IF} ${from(h)}${on}, 0 ≤ ${V('u')} &lt; ${HALF}`];
}

function clapRow(sp) {
  const c = sp.clap;
  let on = `(⌊4${X}⌋ ${MOD} 4 = 0)(⌊${X}⌋ ${MOD} 4 ${IN} ${N('clap', setOf(c.beats))})`;
  if (c.son) on = `(${on} ∨ ⌊4${X}⌋ ${MOD} 32 = ${N('clap', 31)})`;
  return [`−${-CLAP_Y} + 0.3${ex(`−12${FRAC}(4${X})`)}`, `${IF} ${from(c)}${on}, ${FRAC}(4${X}) &lt; ${HALF}`];
}

function perkRow(sp) {
  const p = sp.perk;
  const sh = p.ses === 'shaker';
  const u = sh ? V('u') : `${FRAC}(4${X})`;
  const all = p.m === 4 && p.on.length === 4;
  const on = all ? '' : `⌊4${X}⌋ ${MOD} ${p.m} ${IN} ${N('perk', setOf(p.on))}, `;
  return [`${PERK_Y} + 0.25${ex(`−${PERK_K[p.ses]}${u}`)}`, `${IF} ${from(p)}${on}${sh ? `0 ≤ ${u}` : u} &lt; ${HALF} <span class="op">(${p.ses})</span>`];
}

// dolgu ve hoketin ortak parçası: (uK + j + v) mod F
const walk = (key, u, v, sp, r = '') => `(${r}${N(key, u, `${key}.u`)}${V('K')} + ${V('j')} + ${N(key, v, `${key}.v`)}) ${MOD} ${N('F', sp.F, 'F')}`;

function degreeExpr(sp) {
  const at = `(${V('j')} = ${N('acc', sp.acc, 'acc')})`;
  let d = sp.chord ? `${op('min')}(7, 2 + 2${V('k')})${at}` : `7${at}`;
  if (sp.fill) d += ` + (${walk('fill', sp.fill.u, sp.fill.v, sp)})(${V('j')} ${MOD} 2)`;
  return d;
}

// kayma varken basamak d(j) adıyla tanımlarda yazılır, çünkü kayma bir önceki adımınkini de kullanır
const rr = (sp) => (sp.riser ? `${V('r')} + ${V('R')}` : V('r'));
const dj = (sp, t) => `${V('S')}(${rr(sp)} + ${V('d')}(${t}))`;
// ölçüdeki adım ve kayma ile bükmenin bağlandığı adım: kalıpta b, videoda ⌊4x⌋ ve j
const stepVar = (sp) => (sp.M ? V('b') : `⌊4${X}⌋`);
const atVar = (sp) => V(sp.M ? 'b' : 'j');

function bassFrac(sp) {
  let top = sp.slide ? dj(sp, V('j')) : `${V('S')}(${rr(sp)} + ${degreeExpr(sp)})`;
  if (sp.slide) top += ` + Δ(${atVar(sp)} = ${N('slide', sp.slide.j, 'slide')})${ex(`−${N('slide', sp.slide.k, 'slide.k')}${FRAC}(4${X})`)}`;
  if (sp.oct) top += ` + ${N('oct', 12)}${sp.M ? `(${V('j')} = ${N('oct', octStep(sp))})` : `(⌊4${X}⌋ ${MOD} 3 = 0)(${V('j')} ${MOD} 2 = 0)`}`;
  if (sp.bend !== null) top += ` − 2(${atVar(sp)} = ${N('bend', sp.bend, 'bend')})(1 − ${ex(`−2${FRAC}(4${X})`)})`;
  top += ` − ${N('base', -sp.base, 'base')}`;
  return fr(top, 12);
}

function hocketPart(sp) {
  const h = sp.hocket;
  const top = `${V('S')}(${walk('hocket', h.u, h.v, sp, `${V('r')} + `)}${sp.riser ? ` + ${V('R')}` : ''}) + 12 − ${N('base', -sp.base, 'base')}`;
  return `${fr(top, 12)} + ${N('hocket', h.chirp, 'hocket.chirp')}${ex(`−18${FRAC}(4${X})`)}`;
}

function extras(sp) {
  let s = '';
  if (sp.blip) s += ` + ${N('blip', sp.blip, 'blip')}(${stepVar(sp)} ${MOD} 3 = 0)${ex(`−50${FRAC}(4${X})`)}`;
  if (sp.lift !== null) s += ` + ${fr(`${op('max')}(0, ${X} − ${N('lift', sp.lift, 'lift')})`, 2)}`;
  return s;
}

// en: İngilizce (video kaydı için)
export function renderFormula(sp, en = false) {
  let mel = bassFrac(sp);
  if (sp.hocket) mel = brace([[hocketPart(sp), `${IF} ${V('j')} ${MOD} 3 &gt; 0`], [mel]]);
  mel += extras(sp);
  const pad = sp.pad && [fr(`${V('S')}(${V('r')} + 2${V('i')}) + ${N('pad', 24)} − ${N('base', -sp.base, 'base')}`, 12), `${V('i')} ${IN} {0, 1, 2}`];
  const rows = [sp.kick && kickRow(sp), sp.hat && hatRow(sp), sp.perk && perkRow(sp), sp.clap && clapRow(sp), pad].filter(Boolean);
  const main = rows.length ? brace([...rows, [mel]]) : mel;
  const defs = sp.M
    ? [`${V('b')} = ⌊4${X}⌋ ${MOD} ${N('M', sp.M, 'M')}`, `${V('j')} = (${V('b')} + ${N('p', sp.p, 'p')}) ${MOD} ${N('n', sp.n, 'n')}`]
    : [`${V('j')} = (⌊4${X}⌋ + ${N('p', sp.p, 'p')}) ${MOD} ${N('n', sp.n, 'n')}`];
  if (sp.fill || sp.hocket || (sp.chord && !sp.M)) defs.push(`${V('K')} = ⌊${fr(`4${X} + ${N('q', sp.q, 'q')}`, sp.M ? PHRASE : N('n', sp.n, 'n'))}⌋`);
  if (sp.chord) defs.push(sp.M ? `${V('k')} = ⌊${fr(`${X} + 8`, 4)}⌋` : `${V('k')} = ${V('K')} ${MOD} 4`);
  if (sp.slide) defs.push(`${V('d')}(${V('j')}) = ${degreeExpr(sp)}`, `Δ = ${dj(sp, `${V('j')} − 1`)} − ${dj(sp, V('j'))}`);
  if (sp.hat || sp.perk?.ses === 'shaker') defs.push(`${V('u')} = ${FRAC}(4${X}) − ${SWING}(⌊4${X}⌋ ${MOD} 2)`);
  if (sp.hat) {
    defs.push(`${V('v')} = (${HAT_V.join(', ')})[⌊4${X}⌋ ${MOD} 4]${sp.hat.roll ? ` (${X} ≥ 7: ${V('v')} = 0.4 + 0.15(⌊4${X}⌋ ${MOD} 4))` : ''}`);
  }
  if (sp.riser) defs.push(`${V('R')} = ⌊${fr(`${op('max')}(0, ${X})`, N('riser', sp.riser.w, 'riser'))}⌋`);
  defs.push(`${V('r')} = (${sp.prog.map((d, i) => N('prog', d, `prog.${i}`)).join(', ')})[⌊${fr(`${X} + 8`, 4)}⌋]`);
  if (sp.gap) defs.push(`${X} ≥ 7.5: ${V('y')} ${en ? 'undefined (gap before the drop)' : 'tanımsız (drop öncesi boşluk)'}`);
  defs.push(`${V('S')}(${V('m')}) = ⌊${fr(`12${V('m')} + ${N('c', sp.c, 'c')}`, 7)}⌋`);
  return `<div class="denklem">${V('y')} = ${main}</div><div class="tanimlar">${defs.map((d) => `<span>${d}</span>`).join('')}</div>`;
}
