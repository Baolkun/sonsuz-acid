// Eller: acid ayarlarını canlı çalan biri gibi kendiliğinden çevirir (303'le çalanların "tweaking" dediği şey).
// Hareketler acid'de sık duyulan çevirme kalıplarından gelir ve ölçülere oturur (bir sayfa dört ölçü):
//   tırmanış: filtre sayfa boyunca yavaşça açılır (giriş)
//   basamak: her ölçünün başında bir basamak açılır, geçiş yarım vuruşta
//   nefes: filtre bir ya da iki ölçüde bir açılıp kapanır, ölçü başında kapalı, ortasında açık; zarf ters yöne gider
//   son ölçü: üç ölçü yerinde durur, dördüncü ölçüde itilir
//   yükseliş: filtre, rezonans ve doygunluk sayfa sonuna doğru hızlanarak tırmanır
//   düşüş: yeni yolculuğun ilk vuruşunda filtre kapanır (yükselişten iniş), sonra yeniden açılmaya başlar
//   drop: yükselişten sonra her şey geri gelince de düşüş
//   kırılma: kick susunca filtre kapanır, rezonans keskinleşir, kuyruk uzar, yankı açılır
// Bölümün ilk sayfasında bir hareket, tekrarında öteki gelir. İtişten (son ölçü, yükseliş) sonra yeni sayfanın ilk
// vuruşunda geri inilir. Yankı cümle sonunda (son iki vuruş) fırlatılır, yeni ölçüde söner. Rastgele olan yalnızca
// birkaç birimlik sapma ve yankının fırlatılıp fırlatılmadığı.
// Sürgüler kullanıcının yerleştirdiği yerin ("ev") çevresinde gezinir. Kullanıcı bir sürgüyü tutarsa sürgü
// bırakıldıktan sonra da bir süre onda kalır, sonra hareket yavaşça geri gelir; yeni ev bırakıldığı yerdir.

export const KNOBS = {
  filtre: [-100, 100], rezonans: [0, 100], zarf: [0, 100], kuyruk: [0, 100], vurgu: [0, 100], doygunluk: [0, 100], yanki: [0, 100],
};
const HOLD = 8; // vuruş: bırakılan sürgü bu kadar elde kalır
const ENERGY = [0.1, 0.3, 0.5, 0.7, 0.8, 1, 0.35]; // bölüm bir … altı, kırılma
const DECAY_BY_STAGE = [-8, -2, 8, 4, -6, 10, 14]; // kuyruk: dolguda ve yükselişte uzun, hokette kısa
// bölüm → filtrenin hareketleri: bölümün ilk sayfasında ilki, tekrarında sonraki
export const GESTURES = [['tirmanis'], ['basamak', 'nefes8'], ['nefes8', 'nefes4'], ['son', 'basamak'], ['nefes4', 'son'], ['yukselis'], ['kirilma']];
const PUSH = new Set(['son', 'yukselis']); // ardından ilk vuruşta geri inilir

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const ease = (t) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(t, 0, 1));
const rand = (a, b) => a + Math.random() * (b - a);
const jit = (d) => rand(-d, d);
const breath = (u, P) => Math.sin((Math.PI * u) / P) ** 2; // nefes: ölçü başında 0, ortasında (P = 8: ikinci ölçüde) 1
const stairs = (u) => Math.min(1, (Math.floor(u / 4) + ease(2 * (u % 4))) / 4); // her ölçü başında yarım vuruşta bir basamak
const rise = (u) => (u / 16) ** 2; // yükseliş: sona doğru hızlanır

export class Eller {
  constructor() {
    this.home = {}; // kullanıcının yerleştirdiği değerler
    this.off = {}; // şimdiki sapma: sürgü = ev + sapma
    this.moves = {}; // sürgü → { from, b0, T }: hareketin başladığı sapma, vuruş ve sayfanın eğrisine varış süresi
    this.held = {}; // vuruş: sürgü bu ana kadar kullanıcıda (Infinity: parmağı üstünde)
    this.page = null; // hareketlerin seçildiği sayfa
    this.plans = null; // o sayfanın eğrileri
    this.last = null; // önceki sayfada filtrenin hareketi
  }

  // eller işe başlar: sürgülerin şimdiki yerleri ev olur
  start(values) {
    for (const id in KNOBS) {
      this.home[id] = values[id];
      this.off[id] = 0;
      this.held[id] = -Infinity;
    }
    this.moves = {};
    this.page = null;
    this.plans = null;
    this.last = null;
  }

  // kullanıcı sürgüyü oynattı; down: parmağı hâlâ üstünde
  touch(id, value, beat, down) {
    this.home[id] = value;
    this.off[id] = 0;
    this.held[id] = down ? Infinity : beat + HOLD;
    this.moves[id] = null;
  }

  isHeld(id, beat) {
    return beat < this.held[id];
  }

  // bölümün enerjisi; yolculuk ilerledikçe biraz artar
  energy({ stage, index, count }) {
    return ENERGY[stage] + (0.15 * (index - 1)) / Math.max(1, count - 1);
  }

  // sayfanın hareketleri: her sürgüye sayfadaki vuruşa (u = 0 … 16) bağlı bir eğri (evden sapma; from: hareketin
  // başladığı sapma) ve oraya varış süresi T (vuruş). Tavanlar ölçülü: rezonans ve doygunluk birlikte en uca gidince
  // ses cızırdıyor
  // info: { stage, sp, index, count, fresh (yolculuğun ilk sayfası), variant (bölümün kaçıncı sayfası, 0'dan),
  //         next (sıradaki bölüm; null: yolculuk bitiyor), change (sıradaki bölüm başka) }
  design(info) {
    const { stage, sp, fresh, variant = 0, next, change, drop } = info;
    const e = this.energy(info);
    const quiet = !sp.kick; // kick susuyor: kırılma
    const list = GESTURES[stage];
    // drop'ta da düşüş: filtre ilk vuruşta kapanır, sonra açılır
    const kind = quiet ? 'kirilma' : (fresh && this.last) || drop ? 'dusus' : sp.riser ? 'yukselis' : list[variant % list.length];
    const back = PUSH.has(this.last); // itişten sonra ilk vuruşta geri inilir
    const A = 10 + 12 * e; // filtrenin hareket genişliği
    const lvl = -25 + 40 * e + jit(4); // bölümün filtre seviyesi
    const top = lvl + A / 2;
    const low = lvl - A / 2;
    // tırmanış ve basamak bulunduğu yerden başlar; tırmanacak yer yoksa (ya da itişten sonra) önce aşağı iner
    const start = (from) => (back || from > top - 5 ? low : from);
    const wah = kind === 'nefes4' ? (u) => breath(u, 4) : kind === 'nefes8' ? (u) => breath(u, 8) : () => 0;
    const T = back ? 1 : 4;
    const filtre = {
      tirmanis: { T, at: (u, from) => start(from) + (top - start(from)) * ease(u / 16) },
      basamak: { T, at: (u, from) => start(from) + (top - start(from)) * stairs(u) },
      nefes4: { T, at: (u) => lvl - A / 3 + A * wah(u) },
      nefes8: { T, at: (u) => lvl - A / 3 + A * wah(u) },
      son: { T, at: (u) => lvl + A * ease((u - 12) / 4) },
      yukselis: { T: 1, at: (u) => low + (30 + 10 * e - low) * rise(u) },
      dusus: { T: 0.5, at: (u) => -40 + (top + 40) * ease(u / 16) },
      kirilma: { T: 4, at: () => -45 },
    }[kind];
    const climb = kind === 'yukselis';
    const reset = kind === 'dusus' ? 0.5 : null; // düşüşte hepsi ilk vuruşta yerine iner
    const rez = -8 + 18 * e + (quiet ? 12 : 0) + jit(3);
    const zarf = -12 + 20 * e - 0.25 * lvl + jit(4); // filtre kapalıyken zarf daha çok açar: "vıyk"
    const kuyruk = DECAY_BY_STAGE[stage] + (quiet ? 20 : 0) + jit(4);
    const vurgu = -15 + 30 * e + jit(3);
    const doy = Math.max(0, 50 * (e - 0.45)) - (quiet ? 30 : 0) + jit(3);
    // yankı cümle sonunda fırlatılır: yolculuk biterken çoğu zaman, bölüm değişirken ya da sekiz ölçülük cümle biterken arada bir
    const toss = Math.random() < (next === null ? 0.75 : change ? 0.4 : variant % 2 ? 0.25 : 0) ? rand(30, 40) : 0;
    return {
      kind,
      filtre,
      rezonans: { T: reset ?? 4, at: (u) => rez + (climb ? 10 * rise(u) : 0) },
      zarf: { T: reset ?? 4, at: (u) => zarf - 0.4 * A * wah(u) },
      kuyruk: { T: reset ?? 8, at: () => kuyruk },
      vurgu: { T: reset ?? 16, at: () => vurgu },
      doygunluk: { T: reset ?? 8, at: (u) => doy + (climb ? 12 * rise(u) : 0) },
      yanki: { T: 2, at: (u) => (quiet ? 22 : 0) + toss * ease((u - 14) / 2) },
    };
  }

  // sürgülerin şu an olması gereken yerleri
  step(beat, page, info) {
    const fresh = page !== this.page;
    if (fresh) {
      this.page = page;
      this.last = this.plans?.kind ?? null;
      this.plans = this.design(info);
      this.moves = {};
    }
    const u = beat - page.beat; // sayfadaki vuruş
    const out = {};
    for (const id in KNOBS) {
      const [lo, hi] = KNOBS[id];
      if (beat < this.held[id]) {
        out[id] = clamp(Math.round(this.home[id]), lo, hi);
        continue;
      }
      const p = this.plans[id];
      // hareket bulunduğu yerden başlar, sayfanın eğrisine T vuruşta varır; sürgü bırakıldıktan sonra yavaşça
      this.moves[id] ??= { from: this.off[id], b0: beat, T: fresh ? p.T : Math.max(p.T, 4) };
      const m = this.moves[id];
      const off = m.from + (p.at(u, m.from) - m.from) * ease((beat - m.b0) / m.T);
      this.off[id] = off;
      out[id] = clamp(Math.round(this.home[id] + off), lo, hi);
    }
    return out;
  }
}
