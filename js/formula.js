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
// şarkı: sekizliğin notası (dizide basamak), bas satırının bir oktav üstünde
const tuneAt = (sp, x) => mod(Math.floor(2 * (x + 8)), 32);

export function melodyY(sp, x) {
  if (sp.tune) {
    let y = (scaleSemi(sp.c, riseAt(sp, x) + sp.tune.T[tuneAt(sp, x)]) + 12 + sp.base) / 12;
    if (sp.lift !== null) y += Math.max(0, x - sp.lift) / 2;
    return y;
  }
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
  // şarkıda: notanın başladığı on altılıkta, ölçü başıysa ya da perde bir öncekiyle aynıysa
  if (sp.tune) return mod(Math.floor(4 * (x + 8)), 2) === 0 && sp.tune.A.includes(tuneAt(sp, x));
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

// Türler: her biri dört ölçülük bir davul (A) ve metal (Q) kalıbı, on altılık on altılık. A: K kick, S snare, s hayalet
// snare, C clap, X kick ve crash, B kick ve clap, Z kick ve snare. Q: r ride, h kapalı hat, o açık hat. Sayfa dört ölçü:
// kalıp sayfaya tam oturur. Amen: The Winstons'ın "Amen, Brother"ındaki davul (1969). kik: türün kick'i (drive
// doygunluk, decay sönüş, sweep başındaki perde katı ve st onun inişi; gabber'ın kick'i kırpılmış, uzun ve perdeli):
// sesler yüklenene kadar davul formülden sentezlenir, sonra takımın sesleri çalar.
// subG: sub-basın katı (gerçek jungle ve gabber kayıtlarında alt bizimkinden doluydu)
// dogra: besteci yarım ölçüleri karıştırır; sert: cümle sonunda ve yükselişte roll (roll: hangi davulla); tempo: seçince
// Amen'in ilk iki ölçüsü (ikisi aynı); kayıt da bu iki ölçü, sayfada iki kez döner
const AMEN = 'K.K.S..s.sKKS..s'.repeat(4);
const RIDE = 'r.'.repeat(32);
// Davul sesleri (samples/ klasöründe): uzu: tidalcycles/uzu-drumkit (Unlicense), 808: tidalcycles/sounds-tr808-fischer
// (CC0). Her türün takımı: K kick, S snare, C clap, h kapalı hat, o açık hat, r ride, X crash; brk varsa Amen kaydı (brk:
// dosya, bpm: kaydın temposu, n: kaç on altılık), kalıbın her vuruşunda kaydın o on altılığından çalar. bozuk: kick'in
// kırpılması (gabber kick'i: sıradan bir kick'in sonuna kadar sürülmüş hâli), kg: kick'in düzeyi (kırpılan kick daha dolu)
const UZU = { K: 'uzu/11_bd_mot4i', S: 'uzu/11_sd_switchangel_3', C: 'uzu/11_cp_mot4i', h: 'uzu/11_hh_mot4i', o: 'uzu/12_oh_switchangel', r: 'uzu/10_rd_switchangel', X: 'uzu/10_cr_switchangel' };
// Amen kaydının dilimleri: her on altılığın vuruşunun gerçekte başladığı yer (ms, 165 BPM'de). Davulcu ızgaranın 2 … 24 ms
// gerisinde çalıyor; ızgaradan kesilince her vuruş başka miktarda geç düşüyor, davul acid'den kaçıyordu. Jungle'da
// break vuruşların başından kesilir (ReCycle), her dilim ızgaraya oturur. Hayalet notalar sezilmezse iki yanındaki
// vuruşun ortası. Vuruştan 1,5 ms önce: başı kırpılmasın
const DILIM = [5.2, 102.6, 185.8, 279.5, 373.2, 469.3, 565.4, 632.2, 747.2, 834, 920.7, 1003.2, 1096.5, 1193.7, 1290.8, 1391.3,
  1476.7, 1563.4, 1650.1, 1739, 1827.8, 1922.5, 2017.1, 2107.4, 2197.6, 2306.3, 2373.2, 2462.1, 2550.9, 2639.2, 2727.5, 2856];
const REC = { ...UZU, brk: 'uzu/10_break_amen_pprocessed', bpm: 165, n: 32, dilim: DILIM };
const SEKIZ = { kg: 0.75, K: '808/bd0050', S: '808/sd0050', C: '808/cp', h: '808/ch', o: '808/oh25', r: '808/cy0000', X: '808/cy0000' };
const SERT = (bozuk, kg) => ({ ...UZU, K: 'uzu/10_bd_switchangel', S: 'uzu/12_sd_switchangel_2', bozuk, kg });
// davul seslerinin dosyaları (ses.js yükler)
export const SES_DOSYALARI = () => [...new Set([...Object.values(TURLER), ...KIRIKLAR].flatMap((T) => Object.entries(T.ses).filter(([k]) => !['bpm', 'n', 'bozuk', 'kg', 'dilim', 'son', 'g', 'kat'].includes(k)).map(([, v]) => v)))];
const KIK = { drive: 1.8, decay: 0.16, sweep: 3, st: 0.012, gain: 1.2 };
// mathcore: yedi adımlık hücre (kick, snare, hayalet) ve beş adımda bir hat; 7'ye 5 dört ölçü boyunca kayar
// mathcore: ölçü tek sayılı gruplara bölünür (7 + 5 + 4, 5 + 5 + 6, 3 + 3 + 3 + 3 + 4); her grup vurguyla açılır, her ölçü
// yeniden kick'le başlar. Döngü ölçüyü aşınca (7'lik hücre dört ölçü boyunca) ölçü başı kayboluyor, ritim kaçıyordu
const GRUP = { 3: ['K.s', 'h..'], 4: ['K.S.', 'h.h.'], 5: ['K..S.', 'h.h..'], 6: ['K..S.s', 'h..h..'], 7: ['K..S.s.', 'h.h.h..'] };
const groups = (bars, j) => bars.map((b) => b.map((n) => GRUP[n][j]).join('')).join('');
const MATH = [[7, 5, 4], [7, 5, 4], [5, 5, 6], [3, 3, 3, 3, 4]];
export const TURLER = {
  amen: { ad: 'Amen', A: AMEN, Q: RIDE, ses: REC, kik: KIK, roll: 'S', dogra: false, sert: false, tempo: 0 },
  jungle: { ad: 'jungle', A: AMEN, Q: RIDE, ses: REC, kik: KIK, roll: 'S', dogra: true, sert: false, tempo: 165, subG: 1.35 },
  core: { ad: 'breakcore', A: AMEN, Q: RIDE, ses: REC, kik: KIK, roll: 'S', dogra: true, sert: true, tempo: 172, subG: 1.35 },
  dnb: {
    ad: 'drum & bass', A: 'K...S.....K.S...' + 'K...S..s..K.S..s' + 'K...S.....KKS...' + 'K...S..s.sK.S.s.',
    Q: 'h.h.h.o.h.h.h.h.'.repeat(4), ses: UZU, kik: KIK, roll: 'S', dogra: false, sert: false, tempo: 174,
  },
  footwork: {
    ad: 'footwork', A: 'K..K..K.C.K..K..' + 'K..K..K.C.K..KK.' + 'K..K..K.C.K..K..' + 'K..K..K.C.KKKCCC',
    Q: 'h..h..h.h..h..h.'.repeat(4), ses: SEKIZ, kik: { drive: 1.2, decay: 0.4, sweep: 2, st: 0.02, gain: 0.85 }, roll: 'K', dogra: false, sert: false, tempo: 160,
  },
  happy: {
    ad: 'happy hardcore', A: 'X...B...K...B...' + 'K...B...K...B...' + 'K...B...K...B...' + 'K...B...K...B.CC',
    Q: 'h.o.'.repeat(16), ses: { ...UZU, K: 'uzu/14_bd_switchangel', bozuk: 1.5, kg: 0.6 }, kik: { drive: 4, decay: 0.2, sweep: 4, st: 0.02, gain: 0.9 }, roll: 'S', dogra: false, sert: true, tempo: 175,
  },
  gabber: {
    ad: 'gabber', A: 'X...K...K...K...' + 'K...K...K...K...' + 'K...K...K...K...' + 'K...K...K...K.K.',
    Q: '..o.'.repeat(16), ses: SERT(6, 0.6), kik: { drive: 10, decay: 0.32, sweep: 5, st: 0.035, gain: 0.75 }, roll: 'K', dogra: false, sert: true, tempo: 190, subG: 1.25,
  },
  french: {
    ad: 'frenchcore', A: 'X...K...K...K...' + 'K...Z...K...Z...' + 'K...K...K...K...' + 'K...Z...K..KZ.KK',
    Q: '..h.'.repeat(16), ses: SERT(5, 0.6), kik: { drive: 8, decay: 0.28, sweep: 5, st: 0.03, gain: 0.8 }, roll: 'K', dogra: false, sert: true, tempo: 200,
  },
  terror: {
    ad: 'terrorcore', A: 'X..K..K.Z..K..K.' + 'K..K..K.Z..K.KKK' + 'K..K..K.Z..K..K.' + 'K.KK.KK.Z.ZZKKKK',
    Q: '.h.h'.repeat(16), ses: SERT(9, 0.45), kik: { drive: 14, decay: 0.18, sweep: 6, st: 0.02, gain: 0.7 }, roll: 'K', dogra: false, sert: true, tempo: 200,
  },
  speed: {
    ad: 'speedcore', A: 'X.K.K.K.K.K.K.K.' + 'K.K.Z.K.K.K.Z.K.' + 'K.K.K.K.K.K.K.K.' + 'K.K.Z.K.KKKKKKKK',
    Q: '.'.repeat(64), ses: SERT(7, 0.42), kik: { drive: 12, decay: 0.1, sweep: 5, st: 0.015, gain: 0.7 }, roll: 'K', dogra: false, sert: true, tempo: 220,
  },
  math: {
    ad: 'mathcore', A: groups(MATH, 0), Q: groups(MATH, 1), ses: UZU, kik: KIK, roll: 'S', dogra: true, sert: true, tempo: 160,
  },
};
// Jungle ve breakcore'da her yolculuk bir break çalar (KIRIKLAR[0] Amen). Dördü tidalcycles/Dirt-Samples'tan; her biri
// ölçülüp (tempo, ölçü başı, her on altılığın vuruşunun başladığı yer, ms) Amen gibi vuruşlarından kesildi. A ölçülen
// vuruşlar: K kick, S snare, s hayalet, h hat (yalnız kaydı yeniden başlatır, kayıt ızgaradan kaymasın). g: düzey (tepesi
// eşit ama ortalaması düşük kayıtlar), kat: kaydın kick'i yok, K'lerde türün kick'i de vurur. son: dilimin söndüğü
// yer, kalıbın sıradaki vuruşu (davulcu bir vuruşu geç çalınca kayıt akarken sonrakine ızgaradan önce varıyor, ikileniyordu);
// son dilim, son on altılığın dörtte üçünde (kaydın sonraki ölçüsünün kick'i erken gelebilir)
const kirik = (ad, brk, bpm, A, dilim, g = 1, kat = false) => {
  const n = A.length;
  const son = dilim.map((_, i) => { let j = i + 1; while (j < n && A[j] === '.') j++; return j < n ? dilim[j] : dilim[n - 1] + 11250 / bpm; });
  return { ad, A: A.repeat(64 / n), Q: '.'.repeat(64), ses: { brk, bpm, n, dilim, son, g, kat }, kik: KIK, roll: 'S' };
};
export const KIRIKLAR = [
  TURLER.amen,
  // Amen'in başka bir çalınışı (152 BPM, ilk iki ölçü)
  kirik('Amen 152', 'dirt/breaks152_000_amen', 151.35, 'K.KsS.hshsKKSshh' + 'K.K.SshshsK.hhSS',
    [23, 106, 194.1, 299, 397.5, 507.4, 608.4, 724.8, 806.4, 894.7, 995.6, 1080, 1187.1, 1312.6, 1396.7, 1460.9, 1590.6,
      1680.9, 1793, 1896.1, 1990, 2120.3, 2192.1, 2302.5, 2391.6, 2510.5, 2574.6, 2685.9, 2783.2, 2875.1, 2971.8, 3085.6], 1.1),
  kirik('plead', 'dirt/breaks157_000_plead', 157.9, 'K.hsShh.K.S.h.hh',
    [2.9, 84.1, 188.9, 250.5, 382.6, 463.6, 576.8, 665.7, 766.7, 860.6, 959.5, 1051.5, 1144.5, 1241, 1330.5, 1437.5]),
  // 125'lik hip-hop break'i: kick 1'de ve 3'ün çevresinde, snare 2 ve 4'te; jungle'da hızlandırılıp çalınır
  kirik('stomp', 'dirt/breaks125_016_bllstmp', 124.7, 'K...S.hsh.K.SKh.',
    [36.4, 137.6, 256.3, 359, 492.1, 579, 739.7, 877.9, 988, 1133.3, 1215.8, 1351.3, 1452.3, 1604, 1687.5, 1826.2], 1.7),
  kirik('rawcln', 'dirt/breaks165_000_rawcln', 162.4, 'KhhhShhhhhKhShhh',
    [0, 81.7, 179, 272.2, 353.3, 426.1, 525.8, 613.9, 712.2, 808.5, 887, 983.7, 1077.5, 1201, 1264.9, 1355.5], 1.4, true),
];
export const kitOf = (a) => KIRIKLAR[a.brk] ?? TURLER[a.tur] ?? TURLER.amen;
export const AMEN_H = { K: 0.5, X: 0.5, B: 0.5, Z: 0.5, S: 0.35, C: 0.35, s: 0.15, h: 0.08, r: 0.08 }; // grafikte vuruşun boyu (r: yalnız metal)
// Doğrama: sayfa sekiz yarım ölçü (c); her biri kalıbın σ[c]'inci yarım ölçüsünü çalar. ρ[c] tekrarın boyu (otuz
// ikilik): 16 düz, 8 yarım ölçünün son yarısı iki kez, 1 son adımı her otuz ikilikte (roll).
// { ch, vel, met, i, T } ya da null; otuz ikiliğin başında, kaynakta yeni bir on altılık başlıyorsa
export function breakAt(sp, x) {
  const a = sp.amen;
  if (!a) return null;
  const T = kitOf(a);
  const t = mod(Math.floor(8 * (x + 8)), 128);
  const c = t >> 4;
  const r = a.rho[c];
  const k = (t & 15) % r;
  if (k % 2 && r > 1) return null;
  const i = mod(8 * a.sig[c] + 8 - Math.ceil(r / 2) + Math.floor(k / 2), 64);
  // roll: türün roll davulu, yarım ölçü boyunca yükselerek
  if (r <= 2) return { ch: T.roll, vel: 0.35 + 0.65 * ((t & 15) / 15), met: null, i, T };
  const ch = T.A[i];
  const met = T.Q[i] === '.' ? null : T.Q[i];
  if (ch === '.' && !met) return null;
  return { ch, vel: ch === 's' ? 0.35 : 1, met, i, T };
}
export const BREAK_Y = -2;
export function breakY(sp, x) {
  const u = frac(8 * x);
  if (u >= GATE) return null;
  const b = breakAt(sp, x);
  return b ? BREAK_Y + (AMEN_H[b.ch] ?? AMEN_H.r) * Math.exp(-30 * u) : null;
}

// Perdeli davullar tona oturur (sabit perdede her tonda falso duyuluyordu): o ölçünün akorundan, istenen perdeye en
// yakın oktavda. Tom akorun beşlisinden üçlüsüne, köke iner (k: kaçıncı vuruş); rim akorun hedefine en yakın notası,
// snare gövdesi tonun kökü ya da beşlisi (akorla oynamaz)
const nearHz = (sp, semis, target) => {
  let best = 0;
  for (const s of semis) {
    const f = REF_HZ * 2 ** ((s + sp.base) / 12);
    const g = f * 2 ** Math.round(Math.log2(target / f));
    if (!best || Math.abs(Math.log2(g / target)) < Math.abs(Math.log2(best / target))) best = g;
  }
  return best;
};
// sub-bas: o ölçünün akor kökü, 41 … 82 Hz arasındaki oktavda (E1 … E2); acid basın altını doldurur
export function subHz(sp, x) {
  let f = REF_HZ * 2 ** ((scaleSemi(sp.c, rootAt(sp, x)) + sp.base) / 12);
  while (f > 82.5) f /= 2;
  while (f < 41.2) f *= 2;
  return f;
}
// Shepard tonu: oktav aralıklı sekiz sinüs birlikte kayar, f_k = f₀ · 2^(k + frac p). Her birinin gücü perdesinin çanı
// (400 Hz'de en güçlü, iki yana sönen); en tizdeki sönerken en pesteki doğar, ses hiç varmadan yükselir. f₀ tonun kökü
// (27,5 … 55 Hz). Yükselişte p = ((x + 8)/8)²: hızlanarak dört oktav, drop'ta p tam sayı, tonun köküne oturur; ses
// sayfa boyunca dörtte birden tama açılır. Kırılmada sayfada bir oktav yavaşça iner
export const SHEP = { K: 8, C: 400, SIG: 1.1 };
export function shepAt(sp, x) {
  if (!sp.shep) return null;
  let f0 = REF_HZ * 2 ** (sp.base / 12);
  while (f0 >= 55) f0 /= 2;
  while (f0 < 27.5) f0 *= 2;
  const u = (x + 8) / 8;
  return sp.shep > 0 ? { f0, p: u * u, a: 0.25 + 0.375 * u } : { f0, p: -u / 2, a: 0.6 };
}
export function drumHz(sp, x, kind, k = 0) {
  const r = rootAt(sp, x);
  if (kind === 'tom') {
    const root = nearHz(sp, [scaleSemi(sp.c, r)], 120);
    return root * 2 ** ((scaleSemi(sp.c, r + [4, 2, 0][Math.min(k, 2)]) - scaleSemi(sp.c, r)) / 12);
  }
  if (kind === 'rim') return nearHz(sp, [0, 2, 4].map((d) => scaleSemi(sp.c, r + d)), 455);
  return nearHz(sp, [0, scaleSemi(sp.c, 4)], 190); // snare
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

function breakRow(sp) {
  const k = `(⌊8${X}⌋ ${MOD} 16 ${MOD} ${V('ρ')})`;
  return [`−${-BREAK_Y} + ${V('h')}(${V('A')}<sub>${V('a')}</sub>)${ex(`−30${FRAC}(8${X})`)}`, `${IF} ${k} ${MOD} 2 = 0, ${FRAC}(8${X}) &lt; ${HALF} <span class="op">(${(TURLER[sp.amen.tur] ?? TURLER.amen).ad}${sp.amen.brk ? ` · ${KIRIKLAR[sp.amen.brk].ad}` : ''})</span>`];
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

// glitch: tekrar son ½, ¼ ya da ⅛ vuruşu döndürür (stutter), ters geçmişi tersine çalar, dur bandı yavaşlatıp durdurur
// (tape stop), kir örnekleri n'de bir tutar ve kabalaştırır (bitcrush)
const GLITCH_TR = { tekrar: 'tekrar', ters: 'ters', dur: 'bant durur', kir: 'kırık' };
const GLITCH_EN = { tekrar: 'stutter', ters: 'reverse', dur: 'tape stop', kir: 'crush' };

// en: İngilizce (video kaydı için)
export function renderFormula(sp, en = false) {
  let mel = sp.tune ? fr(`${V('S')}(${sp.riser ? `${V('R')} + ` : ''}${V('T')}) + 12 − ${N('base', -sp.base, 'base')}`, 12) : bassFrac(sp);
  if (sp.hocket) mel = brace([[hocketPart(sp), `${IF} ${V('j')} ${MOD} 3 &gt; 0`], [mel]]);
  mel += extras(sp);
  const pad = sp.pad && [fr(`${V('S')}(${V('r')} + 2${V('i')}) + ${N('pad', 24)} − ${N('base', -sp.base, 'base')}`, 12), `${V('i')} ${IN} {0, 1, 2}`];
  const rows = [sp.kick && kickRow(sp), sp.amen && breakRow(sp), sp.hat && hatRow(sp), sp.perk && perkRow(sp), sp.clap && clapRow(sp), pad].filter(Boolean);
  const main = rows.length ? brace([...rows, [mel]]) : mel;
  const defs = sp.tune
    ? [`${V('T')} = (${sp.tune.T.join(', ')})[⌊2(${X} + 8)⌋]`]
    : sp.M
    ? [`${V('b')} = ⌊4${X}⌋ ${MOD} ${N('M', sp.M, 'M')}`, `${V('j')} = (${V('b')} + ${N('p', sp.p, 'p')}) ${MOD} ${N('n', sp.n, 'n')}`]
    : [`${V('j')} = (⌊4${X}⌋ + ${N('p', sp.p, 'p')}) ${MOD} ${N('n', sp.n, 'n')}`];
  if (sp.fill || sp.hocket || (sp.chord && !sp.M && !sp.tune)) defs.push(`${V('K')} = ⌊${fr(`4${X} + ${N('q', sp.q, 'q')}`, sp.M ? PHRASE : N('n', sp.n, 'n'))}⌋`);
  if (sp.chord && !sp.tune) defs.push(sp.M ? `${V('k')} = ⌊${fr(`${X} + 8`, 4)}⌋` : `${V('k')} = ${V('K')} ${MOD} 4`);
  if (sp.slide) defs.push(`${V('d')}(${V('j')}) = ${degreeExpr(sp)}`, `Δ = ${dj(sp, `${V('j')} − 1`)} − ${dj(sp, V('j'))}`);
  if (sp.hat || sp.perk?.ses === 'shaker') defs.push(`${V('u')} = ${FRAC}(4${X}) − ${SWING}(⌊4${X}⌋ ${MOD} 2)`);
  if (sp.hat) {
    defs.push(`${V('v')} = (${HAT_V.join(', ')})[⌊4${X}⌋ ${MOD} 4]${sp.hat.roll ? ` (${X} ≥ 7: ${V('v')} = 0.4 + 0.15(⌊4${X}⌋ ${MOD} 4))` : ''}`);
  }
  if (sp.amen) {
    const a = sp.amen;
    const T = kitOf(a);
    defs.push(
      `${V('a')} = 8${V('σ')} + 8 − ⌈${fr(V('ρ'), 2)}⌉ + ⌊${fr(`⌊8${X}⌋ ${MOD} 16 ${MOD} ${V('ρ')}`, 2)}⌋`,
      `${V('σ')} = (${a.sig.map((d, i) => N('amen', d, `amen.s.${i}`)).join(', ')})[⌊${fr(`${X} + 8`, 2)}⌋]`,
      `${V('ρ')} = (${a.rho.map((d, i) => N('amen', d, `amen.r.${i}`)).join(', ')})[⌊${fr(`${X} + 8`, 2)}⌋]`,
      `${V('A')} = ${T.A.match(/.{16}/g).join(' ')}`,
    );
    if (/[^.]/.test(T.Q)) defs.push(`${V('Q')} = ${T.Q.match(/.{16}/g).join(' ')}`);
    defs.push(
      `${V('h')}: K X B Z ${AMEN_H.K}, S C ${AMEN_H.S}, s ${AMEN_H.s}${/h/.test(T.A) ? `, h ${AMEN_H.h}` : ''}${/[^.]/.test(T.Q) ? `, ${V('Q')} ${AMEN_H.r}` : ''}`,
    );
  }
  if (sp.glitch) {
    const ad = en ? GLITCH_EN : GLITCH_TR;
    const span = (g) => `${X} ∈ [${g.x}, ${g.x + g.d})`;
    const how = (g) => (g.k === 'tekrar' ? ` ${fr('1', 1 / g.L)}` : g.k === 'kir' ? ` ÷${g.n}` : '');
    defs.push(`${V('G')}: ${sp.glitch.map((g) => `${span(g)} ${ad[g.k]}${how(g)}`).join(', ')}`);
  }
  if (sp.shep) {
    const p = sp.shep > 0 ? `(${fr(`${X} + 8`, 8)})²` : `−${fr(`${X} + 8`, 16)}`;
    defs.push(`${V('Ş')}: ${V('f')}<sub>${V('k')}</sub> = ${V('f')}<sub>0</sub> · 2<sup>${V('k')} + ${FRAC}(${V('p')})</sup>, ${V('p')} = ${p}, ${V('k')} = 0 … ${SHEP.K - 1}, ${en ? 'weight' : 'ağırlık'} ${ex(`−log₂²(${V('f')}<sub>${V('k')}</sub>/${SHEP.C}) / ${(2 * SHEP.SIG * SHEP.SIG).toFixed(1).replace('.', ',')}`)}`);
  }
  if (sp.riser) defs.push(`${V('R')} = ⌊${fr(`${op('max')}(0, ${X})`, N('riser', sp.riser.w, 'riser'))}⌋`);
  defs.push(`${V('r')} = (${sp.prog.map((d, i) => N('prog', d, `prog.${i}`)).join(', ')})[⌊${fr(`${X} + 8`, 4)}⌋]`);
  if (sp.gap) defs.push(`${X} ≥ 7.5: ${V('y')} ${en ? 'undefined (gap before the drop)' : 'tanımsız (drop öncesi boşluk)'}`);
  defs.push(`${V('S')}(${V('m')}) = ⌊${fr(`12${V('m')} + ${N('c', sp.c, 'c')}`, 7)}⌋`);
  return `<div class="denklem">${V('y')} = ${main}</div><div class="tanimlar">${defs.map((d) => `<span>${d}</span>`).join('')}</div>`;
}
