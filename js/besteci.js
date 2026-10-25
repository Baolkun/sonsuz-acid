// Besteci: TikTok'taki altı bölümü örnek alıp bitmeyen "yolculuklar" yazar.
// Her sayfa 16 vuruş (x = −8 … 8) ve tek bir formül. Sayfadan sayfaya formüle yeni bir terim girer
// ya da bir sayı değişir; yolculuk bitince ton, mod ve desen değişir, yenisi başlar.
// Desen bir ritim kalıbından gelir (3+3+2, ara vuruş, üçlü …): acid baslarında sık duyulan, ölçüye oturan ve
// tekrar eden 16 adımlık desenler. Değişiklik acid'deki gibi birer birer ve cümle sonlarında gelir: bölüm değişince
// yeni terim girer, desen oynamaz; aynı bölüm tekrar ederken (sekiz ölçülük cümlenin ikinci yarısı) kalıbın içinde
// kalan bir çeşitleme olur. İlk yolculuk videodaki sayılarla çalar; orada kalıp yok, 5'li desen ölçünün üstünde kayar.
// Her sayfa yazıldığı andaki durumu saklar: bir ayar ya da formüldeki bir sayı değişince çalan sayfa o durumdan
// yeniden yazılır, sonraki sayfalar da oradan devam eder. Kilitliyken aynı sayfa tekrar eder.

import { createRng } from './rng.js?v=baee4ba4';
import { MODE_NAMES, TURLER, mod } from './formula.js?v=41d748e7';

export const PAGE = 16; // vuruş
// yedinci bölüm kırılma (breakdown): kick ve clap susar, filtre kapanır; ardından yükseliş (altı) ve drop (beş, her şey
// birden geri gelir)
export const NAMES = ['bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'kırılma'];
// yolculuğun sonu: kırılma → yükseliş → drop (beşinci bölüm iki sayfa, sekiz ölçü)
const ENDING = [6, 5, 4, 4];
const NOTES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
// akor kökleri, dizide basamak olarak; her ölçüye bir tane. Hepsi −2 … 4 arasında, bas tonikten fazla uzaklaşmaz
const PROGS = [[0, 0, -2, -2], [0, -2, 2, -1], [0, -1, -2, -1], [0, 0, 3, 4], [0, -2, -1, 0], [0, 3, -2, 4], [0, 0, 0, 0]];
// Ritim kalıpları. n desenin boyu, M kaç adımda bir baştan başladığı (8: yarım ölçü, 16: ölçü), p başlangıcı; vurgu
// adımı 0, hoket varken de bas katında kalır. Aynı n ve M'deki kalıplar kardeş: çeşitlemede birinden ötekine geçilir,
// vurgu ölçüde başka yere oturur. w: yeni yolculukta seçilme ağırlığı; videodaki kendiliğinden seçilmez
export const KALIPLAR = {
  tresillo: { ad: '3+3+2', n: 3, M: 8, p: 0, w: 3 },
  ikiuc: { ad: '2+3+3', n: 3, M: 8, p: 1, w: 2 },
  ara: { ad: 'ara vuruş', n: 4, M: 16, p: 2, w: 3 },
  once: { ad: 'vuruş öncesi', n: 4, M: 16, p: 1, w: 2 },
  sonra: { ad: 'vuruş sonrası', n: 4, M: 16, p: 3, w: 1 },
  uclu: { ad: 'üçlü', n: 3, M: 16, p: 1, w: 2 },
  altili: { ad: '6+6+4', n: 6, M: 16, p: 0, w: 2 },
  besuc: { ad: '5+3', n: 5, M: 8, p: 0, w: 2 },
  yedili: { ad: '7+7+2', n: 7, M: 16, p: 0, w: 1 },
  video: { ad: 'videodaki', n: 5, M: null, p: 2, acc: 2, bend: 4, w: 0 },
};
const family = (a, b) => a.n === b.n && a.M === b.M;
// Hi-hat kalıpları: her dörtlüğün on altılıklarından (0: vuruşun üstü, 2: ara vuruş) hangileri çalar, hangileri açık
// (uzun) çalar. Techno'nun en sık kalıpları. kat 1: hat bölüme ilk girerken (sade), kat 2: yoğun bölümler; aynı kattakiler
// kardeş, çeşitlemede birinden ötekine geçilir. w: yeni yolculukta seçilme ağırlığı
export const HATLAR = {
  ara: { ad: 'ara vuruş', on: [2], open: [2], kat: 1, w: 3 },
  sekiz: { ad: 'sekizlik', on: [0, 2], open: [2], kat: 1, w: 2 },
  ardi: { ad: 'ara + ardı', on: [2, 3], open: [2], kat: 1, w: 2 },
  dortnala: { ad: 'dörtnala', on: [0, 2, 3], open: [2], kat: 2, w: 2 },
  onalti: { ad: 'on altılık', on: [0, 1, 2, 3], open: [2], kat: 2, w: 3 },
  kapali: { ad: 'kapalı on altılık', on: [0, 1, 2, 3], open: [], kat: 2, w: 1 },
};
// Clap kalıpları: ölçünün hangi vuruşlarında (0 … 3); son: iki ölçüde bir, ölçünün son on altılığında bir clap daha
// (cümleyi bağlayan "ön vuruş")
export const CLAPLAR = {
  geri: { ad: '2 ve 4', beats: [1, 3], son: false, w: 3 },
  son: { ad: '2 ve 4 + ön vuruş', beats: [1, 3], son: true, w: 2 },
  dort: { ad: 'yalnız 4', beats: [3], son: false, w: 1 },
};
// Ek vurmalı kalıpları: m adımlık döngüde (4: her dörtlük, 16: ölçü, 32: iki ölçü) hangi on altılıklarda çalar.
// kat 1 shaker (kırılmada kick yokken ritmi taşır), kat 2 rim ve tom (yoğun bölümler): rim kick'in arasına senkoplu
// düşer, tom iki ölçünün sonunda inerek cümleyi bağlar
export const PERKLER = {
  shaker: { ad: 'shaker', ses: 'shaker', m: 4, on: [0, 1, 2, 3], kat: 1, w: 3 },
  shakerAra: { ad: 'shaker (ara)', ses: 'shaker', m: 4, on: [1, 3], kat: 1, w: 2 },
  rim: { ad: 'rim 3+3+5', ses: 'rim', m: 16, on: [3, 6, 11, 14], kat: 2, w: 3 },
  rimSeyrek: { ad: 'rim seyrek', ses: 'rim', m: 16, on: [6, 13], kat: 2, w: 2 },
  tom: { ad: 'tom (cümle sonu)', ses: 'tom', m: 32, on: [26, 29, 30], kat: 2, w: 2 },
  tomIki: { ad: 'tom (yarım ölçü)', ses: 'tom', m: 16, on: [10, 14], kat: 2, w: 1 },
};
// Şarkılar: bilinen bir melodi notası notasına çalar (bas satırının yerine). Notalar dizide basamak (0 tonik), her biri
// [basamak, kaç sekizlik]; iki sayfa: 1. sayfa melodinin ilk dört ölçüsü, 2. sayfa son dört ölçüsü. prog her sayfanın
// akor kökleri (pad ve kick'in altı), c dizinin modu (melodi o modda yazıldı). Telifi dolmuş melodiler
export const SARKILAR = {
  tetris: {
    ad: 'Tetris (Korobeiniki)', c: 2,
    sayfalar: [
      [[4, 2], [1, 1], [2, 1], [3, 2], [2, 1], [1, 1], [0, 2], [0, 1], [2, 1], [4, 2], [3, 1], [2, 1],
        [1, 3], [2, 1], [3, 2], [4, 2], [2, 2], [0, 2], [0, 4]],
      [[3, 3], [5, 1], [7, 2], [6, 1], [5, 1], [4, 3], [2, 1], [4, 2], [3, 1], [2, 1],
        [1, 2], [1, 1], [2, 1], [3, 2], [4, 2], [2, 2], [0, 2], [0, 4]],
    ],
    prog: [[4, 0, 4, 0], [3, 2, 4, 0]],
  },
};
// Doğramalar (breakcore, jungle, mathcore): σ sayfanın sekiz yarım ölçüsünde kalıbın hangi yarım ölçüsü çalar, ρ tekrarın boyu (otuz ikilik;
// 16 düz). Hepsi ölçü başını kick'le açar, ikinci ve dördüncü vuruşta snare kalır: doğrama oynar ama ritim dağılmaz
export const DOGRAMALAR = [
  { sig: [0, 1, 0, 1, 4, 5, 6, 7], rho: [16, 16, 16, 16, 16, 16, 16, 16] },
  { sig: [0, 1, 2, 3, 0, 1, 6, 7], rho: [16, 16, 16, 8, 16, 16, 16, 16] },
  { sig: [0, 3, 2, 1, 4, 7, 6, 5], rho: [16, 16, 16, 16, 16, 16, 16, 16] },
  { sig: [0, 1, 6, 7, 0, 1, 6, 7], rho: [16, 16, 16, 16, 16, 8, 16, 16] },
  { sig: [0, 0, 2, 2, 4, 5, 6, 6], rho: [16, 8, 16, 8, 16, 16, 16, 8] },
  { sig: [4, 5, 0, 1, 6, 1, 6, 7], rho: [16, 16, 16, 16, 16, 16, 16, 16] },
];
export const AMEN_DUZ = { sig: [0, 1, 2, 3, 4, 5, 6, 7], rho: [16, 16, 16, 16, 16, 16, 16, 16] };
export const RHO = [16, 8, 4, 2, 1];
// şarkının bir sayfası: T her sekizliğin basamağı (32), A notanın başladığı sekizliklerden yeniden vurulanlar (ölçü başı ya
// da bir öncekiyle aynı perde: 303'te perde değişmeden nota ancak vurguyla yeniden vurulur)
function tunePage(song, half) {
  const T = [];
  const A = [];
  for (const [d, len] of song.sayfalar[half]) {
    if (T.length % 8 === 0 || T[T.length - 1] === d) A.push(T.length);
    for (let i = 0; i < len; i++) T.push(d);
  }
  return { T, A };
}
// tema: melodiyi yapan sayılar. Yolculuğun üçüncü bölümünde (melodi ilk kez tam otururken) saklanır, desen sonra
// değişe değişe başka yerlere gider; kırılma ve yükselişten sonra drop'ta tema olduğu gibi geri döner (parçanın
// "kanca"sı), ardından yine çeşitlenir
const TEMA = ['kalip', 'M', 'n', 'p', 'acc', 'bend', 'slide', 'prog', 'fill', 'hocket'];
const perkIds = (kat) => Object.keys(PERKLER).filter((id) => PERKLER[id].kat === kat);
// ağırlığa göre seçer; not: seçilmeyecek olan
function weighted(rng, table, ids, not) {
  const pool = ids.filter((id) => id !== not);
  let r = rng.next() * pool.reduce((t, id) => t + table[id].w, 0);
  return pool.find((id) => (r -= table[id].w) < 0) ?? pool[0];
}
const hatIds = (kat) => Object.keys(HATLAR).filter((id) => HATLAR[id].kat === kat);

const noteName = (midi) => NOTES[mod(midi, 12)] + (Math.floor(midi / 12) - 1);
const clone = (o) => structuredClone(o);
// Kayma ayarı (1 … 100) ↔ formüldeki üs: 12 hızlı … 2 uzun, sürüklenen; 50'de 5, 303'ün kayması kadar (~60 ms)
export const slideK = (v) => Math.round(12 * (1 / 6) ** (v / 100));
export const kaymaFor = (k) => Math.max(1, Math.round((100 * Math.log(12 / k)) / Math.log(6)));

// bölüm → formülde açık olan terimler (videodaki one … six)
function features(stage, density) {
  // hat ve clap techno'daki gibi sırayla girer: önce sade hat (iki), sonra clap (üç), yoğun bölümlerde sık hat (dört …)
  const f = {
    kick: 'four', chord: stage > 0, fill: false, hocket: false, blip: false, oct: false, riser: false, lift: false,
    hat: [0, 1, 1, 2, 2, 2, 1][stage], clap: stage >= 2 && stage !== 6,
    // arkada akorlar üçüncü bölümde girer; kırılmada öne çıkar
    pad: [0, 0, 1, 1, 1, 1, 1.8][stage],
    // ek vurmalı dördüncü bölümde girer (rim ya da tom); kırılmada shaker
    perk: [0, 0, 0, 2, 2, 2, 1][stage],
  };
  if (stage === 0) {
    f.kick = 'bar';
    f.lift = true;
  } else if (stage === 1) {
    f.kick = 'halfFour';
  } else if (stage === 6) {
    f.kick = 'none';
    f.fill = true;
  } else if (stage <= 3) {
    f.kick = 'roll';
    f.fill = true;
    f.blip = stage === 3 || density > 0.5;
    f.oct = stage === 3 && density > 0.4;
  } else {
    f.hocket = density > 0.2;
    f.fill = !f.hocket;
    f.blip = density > 0.75;
    f.riser = stage === 5;
  }
  return f;
}

export class Besteci {
  constructor(seed) {
    this.rng = createRng(seed);
    // kullanıcının ayarları; stage, kick ve key null ise besteci kendisi seçer
    this.settings = { mood: 0.35, density: 0.6, change: 0.4, F: 7, slide: 50, stage: null, kick: null, key: null, kalip: null, hat: null, clap: null, perk: null, sarki: null, amen: null };
    this.locked = false;
    this.newWanted = false;
    this.wantRoll = false; // elle istenen dolgu: sonraki sayfada
    this.no = 0; // kaçıncı sayfa
    this.journey = 0;
    this.plan = [];
    this.at = 0; // plan içindeki sıra
    this.prev = null;
    this.last = null; // son yazılan sayfa
    // ilk yolculuk TikTok'taki sayılarla başlar (videoda kayma yok)
    this.s = {
      kalip: 'video', M: null, n: 5, p: 2, q: 32, acc: 2, bend: 4, slide: null, base: -18, c: 2, prog: [0, 0, 0, 0],
      fill: { u: 3, v: 6 }, hocket: { u: 3, v: 1, chirp: 0.4 }, kick: { at: 4, L: 4 }, lift: 6, riser: 3, blip: 0.25,
      hat: ['ara', 'onalti'], clap: 'geri', perk: ['shaker', 'rim'], enter: {}, roll: false, tema: null, geri: false,
      amen: clone(AMEN_DUZ), son: false,
    };
  }

  moodC() {
    return Math.round(this.settings.mood * 6);
  }

  // perde sınıfı (0 = C) → taban; bas F1 … E2 arasında kalır
  keyBase(pc) {
    const b = mod(pc - 52, 12) - 24;
    return b < -23 ? b + 12 : b;
  }

  // kayan adım; s o sayfanın durumu. Kalıpta ölçünün bir adımı b (1 … M − 1, önceki adım aynı turda), videoda desenin
  // adımı j (1 … n − 1). Vurgulu adım olmaz (yeniden vurulur), bükmenin üstüne ve hemen sonrasına gelmez (perde orada
  // kopuk). Kalıpta vurgudan hemen sonraki adım: tiz vurgulu nota köke süzülür, 303'teki en tanıdık kayma; dolgusuz
  // bölümlerde başka yerde iki kök notası arasında kalır, duyulmaz. Blip'in adımlarına (b mod 3 = 0) denk gelmeyenler
  // önde. Yer yoksa null
  slideStep(s, not = null) {
    const L = s.M ?? s.n;
    const busy = [s.bend, s.bend === null ? null : s.M ? s.bend + 1 : mod(s.bend + 1, s.n), not];
    const jOf = (i) => (s.M ? mod(i + s.p, s.n) : i);
    const free = Array.from({ length: L - 1 }, (_, i) => i + 1).filter((i) => jOf(i) !== s.acc && !busy.includes(i));
    if (!s.M) return free.length ? this.rng.pick(free) : null;
    const after = free.filter((b) => jOf(b) === mod(s.acc + 1, s.n));
    const pool = [after.filter((b) => b % 3 > 0), after, free].find((a) => a.length) ?? [];
    return pool.length ? this.rng.pick(pool) : null;
  }

  // bükülen adım: vurgusuz, kaymanın üstüne ve hemen öncesine gelmez. Kalıpta ölçünün ikinci yarısında (cümle sonunda
  // perde aşağı süzülür), videoda desenin herhangi bir adımında
  bendStep(s, not = null) {
    const L = s.M ?? s.n;
    const free = [];
    for (let i = s.M ? s.M / 2 : 0; i < L; i++) {
      const j = s.M ? mod(i + s.p, s.n) : i;
      if (j !== s.acc && i !== s.slide && mod(i + 1, L) !== s.slide && i !== not) free.push(i);
    }
    return free.length ? this.rng.pick(free) : null;
  }

  // kalıbı duruma koyar: desenin boyu, başlangıcı, vurgusu; kayma ve bükmenin yerleri kalıba göre yeniden seçilir
  useKalip(s, id) {
    const k = KALIPLAR[id];
    Object.assign(s, { kalip: id, M: k.M, n: k.n, p: k.p, acc: k.acc ?? 0, q: 32, bend: null, slide: null });
    if (!k.M) {
      s.bend = k.bend; // videodaki sayılar; videoda kayma yok
      return;
    }
    s.bend = this.rng.chance(0.6) ? this.bendStep(s) : null;
    s.slide = this.rng.chance(0.8) ? this.slideStep(s) : null;
  }

  // kalıbın doğraması: doğranan türde şimdikinden başka bir doğrama, ötekilerde düz
  useDograma(s) {
    if (!TURLER[this.settings.amen]?.dogra) {
      s.amen = clone(AMEN_DUZ);
      return;
    }
    const now = JSON.stringify(s.amen.sig);
    s.amen = clone(this.rng.pick(DOGRAMALAR.filter((d) => JSON.stringify(d.sig) !== now)));
  }

  // yeni yolculuğun kalıbı: ağırlığına göre; bir öncekinden ve onun kardeşlerinden başka
  pickKalip(prev) {
    const old = KALIPLAR[prev];
    const ids = Object.keys(KALIPLAR).filter((id) => KALIPLAR[id].w && !(old && family(KALIPLAR[id], old)));
    let r = this.rng.next() * ids.reduce((t, id) => t + KALIPLAR[id].w, 0);
    return ids.find((id) => (r -= KALIPLAR[id].w) < 0) ?? ids[0];
  }

  // durum hâlâ kalıbın kendisiyse (sayıları elle değişmediyse) kardeş kalıpları
  siblings(s) {
    const k = KALIPLAR[s.kalip];
    if (!k || !k.M || k.n !== s.n || k.M !== s.M || k.p !== s.p) return [];
    return Object.keys(KALIPLAR).filter((id) => id !== s.kalip && KALIPLAR[id].w && family(KALIPLAR[id], k));
  }

  startJourney(changed) {
    const { rng, s, settings } = this;
    this.journey++;
    this.newWanted = false;
    this.at = 0;
    s.tema = null;
    if (TURLER[settings.amen]?.dogra) this.useDograma(s);
    if (this.journey === 1) {
      this.plan = [0, 1, 2, 3, ...ENDING];
      // kalıp seçildiyse ilk yolculuk da onunla çalar
      if (settings.kalip && settings.kalip !== s.kalip) this.useKalip(s, settings.kalip);
      return;
    }
    // ton dörtlü/beşli çemberinde bir adım atar ya da yerinde kalır; ton seçildiyse hiç oynamaz
    if (settings.key === null) {
      s.base += rng.pick([5, 7, 5, 7, 0, 0, 3, -3]);
      while (s.base > -12) s.base -= 12;
      while (s.base < -23) s.base += 12;
    }
    s.c = this.moodC();
    this.useKalip(s, settings.kalip ?? this.pickKalip(s.kalip));
    s.prog = rng.pick(PROGS).slice();
    s.fill = { u: rng.pick([1, 2, 3, 5]), v: rng.int(0, 6) };
    s.hocket = { u: rng.pick([1, 2, 3]), v: rng.int(0, 6), chirp: rng.pick([0.2, 0.3, 0.4]) };
    s.hat = [weighted(rng, HATLAR, hatIds(1), s.hat[0]), weighted(rng, HATLAR, hatIds(2), s.hat[1])];
    s.clap = weighted(rng, CLAPLAR, Object.keys(CLAPLAR), s.clap);
    s.perk = [weighted(rng, PERKLER, perkIds(1), s.perk[0]), weighted(rng, PERKLER, perkIds(2), s.perk[1])];
    s.riser = rng.pick([3, 4]); // yükseliş: her kaç vuruşta bir basamak (3: iki basamak, 4: son ölçüde bir); daha sık olursa tavanı aşar
    for (const k of ['base', 'c', 'M', 'n', 'p', 'acc', 'bend', 'slide', 'prog', 'fill', 'hocket', 'hat', 'clap', 'perk']) changed.add(k);
    // altı bölüm; ikisi tekrar edip değişerek uzar
    const order = [0, 1, 2, 3, 4, 5];
    for (const e of rng.shuffle(settings.density > 0.5 ? [2, 3, 4] : [1, 2, 4]).slice(0, 2)) order.splice(order.indexOf(e) + 1, 0, e);
    // yolculuk kırılma, yükseliş ve drop'la biter (yükseliş sona taşınır)
    order.splice(order.indexOf(5), 1);
    this.plan = [...order, ...ENDING];
  }

  // küçük bir değişiklik, tek bir şey; desen kalıbın içinde kalır: kayma ya da bükme yer değiştirir (ya da gelip
  // gider), bir ölçünün akoru, dolgu ya da hoket notaları değişir, arada bir kardeş kalıba geçilir (kalıp elle
  // seçildiyse geçilmez). Videodaki desende kayma yoktur, sonradan da gelmez
  mutate(f, changed) {
    const { rng, s, settings } = this;
    const keys = ['bend', 'prog', 'prog'];
    if (!f.hocket && settings.slide > 0 && (s.M || s.slide !== null)) keys.push('slide', 'slide');
    if (f.fill) keys.push('fill', 'fill');
    if (f.hocket) keys.push('hocket', 'hocket');
    const kin = settings.kalip ? [] : this.siblings(s);
    if (kin.length) keys.push('kalip');
    if (f.hat && !settings.hat) keys.push('hat');
    if (f.clap && !settings.clap && s.clap !== 'dort') keys.push('clap');
    if (f.perk && !settings.perk) keys.push('perk');
    if (TURLER[settings.amen]?.dogra) keys.push('amen', 'amen', 'amen');
    const k = rng.pick(keys);
    if (k === 'amen') this.useDograma(s);
    if (k === 'slide') s.slide = s.M && s.slide !== null && rng.chance(0.25) ? null : this.slideStep(s, s.slide) ?? s.slide;
    if (k === 'bend') s.bend = s.bend !== null && rng.chance(0.3) ? null : this.bendStep(s, s.bend) ?? s.bend;
    if (k === 'prog') this.moveChord(s);
    if (k === 'fill') s.fill = { ...s.fill, v: mod(s.fill.v + rng.int(1, 6), 7) };
    if (k === 'hocket') s.hocket = { ...s.hocket, v: mod(s.hocket.v + rng.int(1, 6), 7) };
    // hat kardeşine geçer (aynı kat), clap ön vuruşu alır ya da bırakır
    if (k === 'hat') s.hat = s.hat.map((id, i) => (i === f.hat - 1 ? weighted(rng, HATLAR, hatIds(f.hat), id) : id));
    if (k === 'clap') s.clap = s.clap === 'son' ? 'geri' : 'son';
    if (k === 'perk') s.perk = s.perk.map((id, i) => (i === f.perk - 1 ? weighted(rng, PERKLER, perkIds(f.perk), id) : id));
    if (k === 'kalip') {
      const id = rng.pick(kin);
      s.kalip = id;
      s.p = KALIPLAR[id].p;
      // vurgu kayan ya da bükülen adımın üstüne geldiyse onlar başka yere geçer
      if (s.slide !== null && mod(s.slide + s.p, s.n) === s.acc) {
        s.slide = this.slideStep(s);
        changed.add('slide');
      }
      if (s.bend !== null && mod(s.bend + s.p, s.n) === s.acc) {
        s.bend = this.bendStep(s);
        changed.add('bend');
      }
    }
    changed.add(k === 'kalip' ? 'p' : k);
  }

  // bir ölçünün (ikinci … dördüncü) akor kökü başka bir köke geçer
  moveChord(s) {
    const i = this.rng.int(1, 3);
    s.prog = s.prog.slice();
    s.prog[i] = this.rng.pick([-2, -1, 1, 2, 3, 4].filter((d) => d !== s.prog[i]));
  }

  // sayfanın formülü: durum + bölümün terimleri + kullanıcının seçtikleri. half: şarkı çalarken melodinin hangi yarısı
  build(stage, s, half = 0) {
    const st = this.settings;
    const f = features(stage, st.density);
    const type = st.kick ?? f.kick;
    let kick = { type };
    if (type === 'none') kick = null;
    if (type === 'halfFour') kick.at = s.kick.at;
    if (type === 'roll') kick.L = s.kick.L;
    // drop öncesi: yükselişin son ölçüsünde kick susar, drop'ta bütün gücüyle geri gelir
    if (kick && s.gap) kick.to = 4;
    // oktav sıçraması yüksek bir akor kökünün üstüne binerse melodi iki buçuk oktava fırlar; o ölçülerde yok
    const oct = f.oct && Math.max(...s.prog) <= 2;
    // kayma yalnızca bas satırında; hoket ya da oktav sıçraması varken önceki nota başka yerde, kayma yok
    const slide = st.slide > 0 && s.slide !== null && !f.hocket && !oct ? { j: s.slide, k: slideK(st.slide) } : null;
    // hat ve clap: elle seçildiyse hep o (yok: hiç), bölüme göreyse bölümün katından. Bölüme yeni giren sayfanın ikinci
    // yarısında başlar; kick susunca clap da susar (kırılma), hat sürer
    const H = HATLAR[st.hat ?? (f.hat ? s.hat[f.hat - 1] : null)];
    const C = CLAPLAR[st.clap ?? (f.clap && kick ? s.clap : null)];
    const P = PERKLER[st.perk ?? (f.perk ? s.perk[f.perk - 1] : null)];
    const enter = (key) => (!st[key] && s.enter?.[key] ? 0 : null);
    const sp = {
      kick, M: s.M, n: s.n, p: s.p, q: s.q, acc: s.acc, bend: s.bend, slide, base: s.base, c: s.c, F: st.F, prog: s.prog.slice(),
      chord: f.chord, fill: f.fill ? { ...s.fill } : null, hocket: f.hocket ? { ...s.hocket } : null,
      blip: f.blip ? s.blip : 0, oct, riser: f.riser ? { w: s.riser } : null, lift: f.lift ? s.lift : null,
      // dolgu hat'siz bölümde de çalar (yalnızca son vuruş)
      hat: H ? { on: H.on.slice(), open: H.open.slice(), from: enter('hat'), roll: !!s.roll } : s.roll && !st.hat ? { on: [], open: [], from: null, roll: true } : null,
      clap: C ? { beats: C.beats.slice(), son: C.son, from: enter('clap') } : null,
      perk: P ? { ses: P.ses, m: P.m, on: P.on.slice(), from: enter('perk') } : null,
      gap: !!s.gap,
      pad: f.pad ? { lvl: f.pad } : null,
    };
    // Tür (Amen, gabber …): kick çalacak bölümlerde kick'in, clap'in, hat'in ve ek vurmalının yerine (elle seçilenler
    // kalır; rim ve tom Amen'in senkopunun üstüne binince karışıyordu). Doğranan türde drop'ta düz kalıp döner;
    // cümle sonunda son yarım ölçü dolgu (sert türlerde roll), yükselişin son ölçüsünde roll hızlanarak gelir
    if (st.amen && kick) {
      const T = TURLER[st.amen];
      const a = { ...clone(T.dogra && s.drop ? AMEN_DUZ : s.amen), tur: st.amen };
      if (s.gap) a.rho = T.sert ? [16, 16, 16, 16, 8, 4, 2, 1] : [16, 16, 16, 16, 16, 16, 8, 4];
      else if (s.roll || s.son) {
        a.rho[7] = T.sert ? 1 : 8;
        if (T.sert) a.rho[6] = 8;
      }
      Object.assign(sp, { amen: a, kick: null, clap: st.clap ? sp.clap : null, hat: st.hat ? sp.hat : null, perk: st.perk ? sp.perk : null });
    }
    // şarkı: melodi notaları listeden okur; bas satırının kalıbı, dolgusu, hoketi, kayması susar, akorlar şarkınınki
    const song = SARKILAR[st.sarki];
    if (song) {
      Object.assign(sp, { c: song.c, prog: song.prog[half].slice(), tune: tunePage(song, half), bend: null, slide: null,
        chord: false, fill: null, hocket: null, blip: 0, oct: false });
    }
    return sp;
  }

  // sayfanın formülünü ve yazılarını sakladığı durumdan (yeniden) kurar
  dress(page) {
    const stage = this.settings.stage ?? page.stage;
    const { s } = page.snap;
    // şarkıda yolculuğun son sayfası melodinin ikinci yarısı: drop hep melodinin başına düşer
    page.sp = this.build(stage, s, mod(page.count - page.index + 1, 2));
    page.name = NAMES[stage] + (s.drop ? ' · drop' : '') + (s.geri ? ' · tema geri' : '');
    page.drop = !!s.drop;
    page.key = noteName(52 + s.base);
    page.mode = MODE_NAMES[s.c];
    // kalıbın adı; desenin sayıları elle değiştiyse yok
    const k = KALIPLAR[s.kalip];
    page.kalip = page.sp.tune ? SARKILAR[this.settings.sarki].ad : k && k.n === s.n && k.M === s.M && k.p === s.p ? k.ad : null;
    page.hat = page.sp.hat ? HATLAR[this.settings.hat ?? s.hat[features(stage, this.settings.density).hat - 1]]?.ad ?? null : null;
    page.clap = page.sp.clap ? CLAPLAR[this.settings.clap ?? s.clap].ad : null;
    page.perk = page.sp.perk ? PERKLER[this.settings.perk ?? s.perk[features(stage, this.settings.density).perk - 1]]?.ad ?? null : null;
  }

  next() {
    if (this.locked && this.last && !this.newWanted) return this.repeat();
    const changed = new Set();
    const fresh = this.newWanted || this.at >= this.plan.length;
    if (fresh) this.startJourney(changed);
    const { rng, s, settings, prev } = this;
    const stage = this.plan[this.at];
    const eff = settings.stage ?? stage; // çalan bölüm
    const f = features(eff, settings.density);
    // aynı bölüm kaçıncı sayfadır çalıyor
    const run = !fresh && prev && prev.eff === eff ? prev.run + 1 : 1;
    // hat dolgusu cümle sonunda: bölüm değişmeden önceki çift sayfada (sekiz ölçü bitti), yolculuğun son sayfasında ya da
    // kırılmadan önce (en büyük düşüş habersiz gelince kesik gibi duyuluyor)
    const after = this.plan[this.at + 1];
    const kirilmaOncesi = settings.stage === null && after === 6 && eff !== 6;
    s.roll = this.wantRoll || (f.hat > 1 && (after === undefined || kirilmaOncesi || (run % 2 === 0 && (settings.stage ?? after) !== eff)));
    // Amen'in dolgusu her sekiz ölçünün sonunda (bölüm sürerken de)
    s.son = this.wantRoll || after === undefined || kirilmaOncesi || run % 2 === 0;
    this.wantRoll = false;
    // drop: yükselişten sonra beşinci bölüm; yükselişin son yarım vuruşu sessiz kalır (drop öncesi boşluk)
    s.drop = settings.stage === null && !fresh && prev?.eff === 5 && eff === 4;
    s.gap = settings.stage === null && eff === 5 && after === 4;
    // yeni giren hat ya da clap sayfanın ikinci yarısında başlar
    s.enter = {
      hat: f.hat > 0 && !(prev && !fresh && prev.f.hat), clap: f.clap && !(prev && !fresh && prev.f.clap),
      perk: f.perk > 0 && !(prev && !fresh && prev.f.perk === f.perk),
    };
    if (this.at === 0) s.enter = { hat: false, clap: false, perk: false }; // yolculuk başında hepsi birden: düşüş
    if (!fresh && prev) {
      // çeşitleme sekiz ölçülük cümlenin ikinci yarısında: aynı bölümün ikinci (dördüncü …) sayfasında. Bölüm
      // değişirken yeni terim zaten giriyor, desen yalnızca Değişim çok açıksa oynar; sıfırda hiç oynamaz
      const k = settings.change;
      if (rng.chance(run % 2 === 0 ? 2 * k : k - 0.6)) this.mutate(f, changed);
      if (f.kick !== prev.f.kick) changed.add('kick');
      for (const key of ['fill', 'hocket', 'blip', 'oct', 'riser', 'lift']) if (f[key] && !prev.f[key]) changed.add(key);
      if (f.hat !== prev.f.hat) changed.add('hat');
      if (f.clap !== prev.f.clap) changed.add('clap');
      if (f.perk !== prev.f.perk) changed.add('perk');
      if (f.pad && !prev.f.pad) changed.add('pad');
      if (f.chord && !prev.f.chord) changed.add('acc');
    }
    // tema: üçüncü bölümün ilk sayfasında saklanır, drop'ta geri döner
    s.geri = false;
    if (settings.stage === null && !s.tema && eff === 2) s.tema = clone(Object.fromEntries(TEMA.map((k) => [k, s[k]])));
    if (s.drop && s.tema) {
      // kalıp elle seçildiyse desen onda kalır, yalnızca akorlar ve notalar döner
      const keys = settings.kalip && settings.kalip !== s.tema.kalip ? ['prog', 'fill', 'hocket'] : TEMA;
      const back = keys.filter((k) => JSON.stringify(s[k]) !== JSON.stringify(s.tema[k]));
      for (const k of keys) s[k] = clone(s.tema[k]);
      for (const k of back) changed.add(k === 'kalip' ? 'p' : k);
      s.geri = back.length > 0;
    }
    // filtre yolculuk boyunca açılır, yeni yolculukta yeniden kapanır
    const count = this.plan.length;
    const arc = (t) => 0.04 + 0.9 * t;
    this.prev = { stage, eff, run, f };
    this.at++;
    const page = {
      no: this.no, beat: this.no * PAGE, stage, journey: this.journey, index: this.at, count, fresh: this.at === 1,
      b0: arc((this.at - 1) / count), b1: arc(this.at / count), changed: [...changed],
      snap: { s: clone(s), plan: this.plan, at: this.at, journey: this.journey, prev: this.prev },
    };
    this.dress(page);
    this.last = page;
    this.no++;
    return page;
  }

  // kilitliyken son sayfa olduğu gibi tekrar eder; filtre o sayfanın sonundaki açıklıkta kalır
  repeat() {
    const l = this.last;
    const page = { ...l, no: this.no, beat: this.no * PAGE, b0: l.b1, b1: l.b1, fresh: false, changed: [], snap: { ...l.snap, s: clone(l.snap.s) } };
    this.dress(page);
    this.last = page;
    this.no++;
    return page;
  }

  // besteciyi verilen sayfanın hemen sonrasına döndürür; sonraki sayfalar o sayfanın durumundan yeniden yazılır
  rewindTo(page) {
    const k = page.snap;
    this.s = clone(k.s);
    this.plan = k.plan;
    this.at = k.at;
    this.journey = k.journey;
    this.prev = k.prev;
    this.no = page.no + 1;
    this.last = page;
  }

  // elle hamle: verilen sayfadan sonra yolculuğun sonu gelir. 'kirilma': kırılma → yükseliş → drop; 'drop': yükseliş →
  // drop (çalan sayfa yükselişse doğrudan drop). Bölüm elle seçiliyken ya da kilitliyken olmaz
  jump(page, kind) {
    if (this.locked || this.settings.stage !== null) return false;
    this.rewindTo(page);
    const seq = kind === 'kirilma' ? ENDING : page.stage === 5 ? ENDING.slice(2) : ENDING.slice(1);
    this.plan = [...this.plan.slice(0, this.at), ...seq];
    return true;
  }

  // yeni yolculuk verilen sayfanın yerine hemen başlar
  restartAt(page) {
    this.rewindTo(page);
    this.no = page.no;
    this.newWanted = true;
  }

  // formüldeki bir sayıyı bir adım oynatır (dir = +1 / −1); s o sayfanın durumu
  nudge(s, path, dir) {
    const step = (v, lo, hi, d = 1) => +Math.min(hi, Math.max(lo, Math.round(v / d + dir) * d)).toFixed(2);
    const wrap = (v, n) => mod(v + dir, n);
    const [a, b] = path.split('.');
    switch (a) {
      case 'p': s.p = wrap(s.p, s.n); break;
      case 'acc': s.acc = wrap(s.acc, s.n); break;
      // kayma ve bükme kalıpta ölçünün adımında (b), videoda desenin adımında (j)
      case 'bend': if (s.bend !== null) s.bend = wrap(s.bend, s.M ?? s.n); break;
      case 'M':
        // kalıbın boyu: yarım ölçü ↔ ölçü; kayma ve bükme yeni boya sığar
        s.M = s.M === 8 ? 16 : 8;
        if (s.slide !== null) s.slide = 1 + mod(s.slide - 1, s.M - 1);
        if (s.bend !== null) s.bend = mod(s.bend, s.M);
        break;
      case 'n':
        s.n = step(s.n, 3, 9);
        s.p = mod(s.p, s.n);
        s.acc = mod(s.acc, s.n);
        if (!s.M && s.bend !== null) s.bend = mod(s.bend, s.n);
        if (!s.M && s.slide !== null) s.slide = Math.min(s.slide, s.n - 1);
        break;
      case 'slide':
        // kayan adım 1 … M − 1 (videoda n − 1) arasında döner, önceki adımı olmalı; k kayma ayarıyla aynı şey
        if (b === 'k') this.settings.slide = kaymaFor(step(slideK(this.settings.slide), 2, 12));
        else if (s.slide !== null) s.slide = 1 + mod(s.slide - 1 + dir, (s.M ?? s.n) - 1);
        break;
      case 'q': s.q = step(s.q, 0, 64); break;
      case 'base': s.base = -step(-s.base, 6, 24); break; // ekranda −base yazıyor: o sayı büyüdükçe perde iner
      case 'c': s.c = step(s.c, 0, 6); break;
      case 'F': this.settings.F = step(this.settings.F, 2, 12); break;
      case 'prog': s.prog[b] = step(s.prog[b], -3, 5); break;
      case 'fill': case 'hocket':
        if (b === 'u') s[a].u = step(s[a].u, 0, 6);
        if (b === 'v') s[a].v = wrap(s[a].v, 7);
        if (b === 'chirp') s[a].chirp = step(s[a].chirp, 0, 1, 0.05);
        break;
      case 'blip': s.blip = step(s.blip, 0.05, 1, 0.05); break;
      case 'lift': s.lift = step(s.lift, 4, 8, 0.5); break;
      case 'riser': s.riser = step(s.riser, 2, 8); break;
      case 'amen': {
        // σ yarım ölçü 0 … 7 döner; ρ 16 → 8 → 4 → 2 → 1 → 16 döner (tık kısaltır)
        const [, w, i] = path.split('.');
        if (w === 's') s.amen.sig[i] = wrap(s.amen.sig[i], 8);
        else s.amen.rho[i] = RHO[mod(RHO.indexOf(s.amen.rho[i]) + dir, RHO.length)];
        break;
      }
      case 'kick': s.kick[b] = b === 'at' ? step(s.kick.at, -8, 8) : step(s.kick.L, 2, 8); break;
    }
  }
}
