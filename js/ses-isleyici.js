// Ses işçisi: formülün iki satırı, TikTok'taki gibi iki ayrı ses olarak aynı anda çalar.
// Melodi satırı: testere dalgası, rezonanslı alçak geçiren filtreden geçer (acid). Perde sıçradığında (yeni nota)
// filtre açılır ve ~70 ms'de kapanır; aynı nota sürerken ya da perde kayarken açılmaz, ses koyulaşmaya devam eder.
// Kick satırı: ayrı bir sinüs; perdesi satırı izleyip ~250 Hz'den köke iner. 909'daki gibi başında kısa bir tık var,
// sesi satır sürerken söner (düz kalıp birden kesilince kutu gibi duyuluyordu) ve hafifçe doyurulur, küçük
// hoparlörde de duyulsun.
// Sayılar TikTok sesinden ölçüldü: filtre bölüm birde ~250–470 Hz, bölüm beşte ~600–1000 Hz arasında gidip geliyor.
// Ekrandaki ses ayarları ('params' iletisi) bu sayıların üstüne çalarken biner; ani değişim tık yapmasın diye yumuşatılır.
// 303'ten: vurgulu adımda (j = acc) nota daha yüksek, filtre daha açık ve keskin çalar; art arda vurgularda filtre
// tam kapanmadan yeniden açıldığı için giderek yükselir ("accent sweep"). Dalga testereden kareye kaydırılabilir;
// yankı tempoya oturur (noktalı sekizlik) ve yalnızca melodiye uygulanır.
// Pompalama (sidechain): kick her vurduğunda melodi bir anlığına kısılır ve ~150 ms'de geri gelir; techno'nun
// "nefes alan" hissi. Hat ve clap pompalanmaz.
// Oda yankısı (reverb): sekiz gecikme hattı birbirine karışarak geri beslenir (FDN). Clap'e çok, hat'e biraz, melodiye
// az gider; yankının altı kesilir, bas çamurlaşmasın; her dönüşte tizi koyulaşır.
// Hat satırı: 808'deki gibi altı kare dalga (uyumsuz frekanslarda, metalik) ve biraz gürültü, tizi süzülerek. Satır
// tanımlı olmaya başlayınca vurulur (swing de satırda), şiddeti satırdaki v; açık hat uzun söner, sonraki hat onu keser.
// Clap satırı: gürültü, ortada süzülür; başı birkaç milisaniye arayla üç kez çarpar (eller), ardından kısa bir kuyruk.

import { kickY, melodyY, accentAt, hatAt, hatY, clapAt, clapY, HAT_Y, REF_HZ, KICK_HZ } from './formula.js';

const PAGE = 16; // vuruş
const TAU = 2 * Math.PI;
const GLIDE = 0.003; // s: perde sıçramaları bu sürede kayar, tık olmasın
const JUMP = 0.02; // oktav: tek örnekte bundan büyük sıçrama yeni nota sayılır
const FC = 240; // Hz: filtrenin yolculuk başındaki tabanı
const OPEN = 2.2; // oktav: taban yolculuk boyunca bu kadar açılır
const ENV = 1.4; // oktav: yeni notada filtre bu kadar açılır…
const DECAY = 0.07; // s: …ve bu sürede kapanır
const RES = 0.25; // 1/Q: rezonans
const TAIL = 1; // bant geçirenden bir pay: rezonansın üstündeki tizler daha yavaş söner, sesin "dişi"
const TOP = 4; // ×kesim: bunun üstünü ikinci bir filtre dik keser, cızırtı kalmasın
const HP = 150; // Hz: melodinin en altı inceltilir; tok bas kick'ten gelir
const MEL = 0.22;
const KICK = 0.18;
// ayarların başlangıç değerleri: cut kesimi oktav olarak kaydırır, drive doygunluk, accent vurgu, wave kare payı,
// echo yankı (hepsi 0 … 1)
const KICK_DECAY = 0.17; // s: kick'in sönüşü
const KICK_DRIVE = 1.8; // tanh doygunluğu: üst harmonikler, tok vuruş
const CLICK = 0.35; // başındaki tık…
const CLICK_TIME = 0.0015; // …bu sürede söner
const PUMP_DEPTH = 0.7; // tam pompada melodi bu kadar kısılır…
const PUMP_TIME = 0.1; // s: …ve bu süreyle geri gelir
const ROOM_MS = [29.7, 37.1, 41.1, 43.7, 53.3, 59.9, 67.3, 73.1]; // gecikme hatları
const ROOM_SEND = { mel: 0.12, hat: 0.3, clap: 0.7 };
const ROOM_HP = 250; // Hz: yankıya giden sesin altı kesilir
const ROOM_DAMP = 5000; // Hz: hatların içinde tizi koyulaştırır
const ROOM_OUT = 0.6;
const HAT = 0.18;
const CLAP = 0.24;
const HAT_DECAY = [0.022, 0.13]; // s: kapalı, açık
const METAL = [205.3, 304.4, 369.6, 522.7, 540, 800]; // Hz: 808 hat'inin altı osilatörü
const METAL_MIX = 0.75; // metal / gürültü
const HAT_OCT = 3.3; // hat satırının y'sinden kesim: REF_HZ · 2^(y + bu) ≈ 8 kHz
const CLAP_OCT = 5.2; // clap: ≈ 1,5 kHz
const CLAP_Q = 0.8; // 1/Q
const CLAP_GAP = 0.011; // s: ellerin çarpma arası
const CLAP_TAIL = 0.11; // s
const DEFAULTS = { cut: 0, res: RES, env: ENV, decay: DECAY, drive: 0, kick: KICK, accent: 0, wave: 0, echo: 0, hat: HAT, clap: CLAP, pump: 0.5, room: 0.35 };
const DRIVE_GAIN = 2; // doygunlukta kırpma eşiği (filtre çıkışı 3,5'e kadar çıkıyor)
const DRIVE_POW = 0.4; // sürüş arttıkça düzey bu üsle geri alınır, açınca ses patlamasın ya da kısılmasın
const ACC_ENV = 1.2; // oktav: tam vurguda filtre zarfına eklenen
const ACC_GAIN = 0.5; // tam vurguda notanın başı bu kadar yüksek…
const ACC_TIME = 0.2; // s: …ve bu sürede normale döner; rezonans da o süre keskinleşir
const ACC_RES = 0.3; // tam vurguda 1/Q bu oranda azalır
const SWEEP = 0.5; // oktav: her vurgu filtreyi bu kadar iter, birikir…
const SWEEP_MAX = 1.5;
const SWEEP_FALL = 0.3; // s: …ve bu sürede geri iner; arada gelen vurgu daha yukarıdan başlar
const SQ = 0.7; // kare dalganın düzeyi (testereyle aynı yükseklikte duyulsun)
const ECHO_BEATS = 0.75; // yankı gecikmesi: noktalı sekizlik
const ECHO_LP = 2500; // Hz: yankılar her dönüşte koyulaşır…
const ECHO_HP = 300; // …ve altı incelir, bas çamurlaşmasın

// testere dalgasının köşesini yumuşatır (PolyBLEP), böylece yüksek perdelerde de cızırdamaz
function blep(t, dt) {
  if (t < dt) {
    t /= dt;
    return t + t - t * t - 1;
  }
  if (t > 1 - dt) {
    t = (t - 1) / dt;
    return t * t + t + t + 1;
  }
  return 0;
}

function pageAt(pages, beat) {
  for (const p of pages) if (beat >= p.beat && beat < p.beat + PAGE) return p;
  return null;
}

class FormulSes extends AudioWorkletProcessor {
  constructor() {
    super();
    this.clocks = []; // { time, beat, bpm }: bu andan itibaren vuruşlar bu hızla sayılır
    this.pages = []; // { beat, sp, b0, b1 }
    this.raw = null; // melodi satırının son değeri (oktav)
    this.st = null; // çalan on altılık adım
    this.y = null; // kaydırılmış perde
    this.phase = 0;
    this.age = 1; // s: son yeni notadan beri
    this.acc = 0; // çalan notanın vurgusu (0 … 1)
    this.sweepT = 0; // vurguların biriktirdiği itiş (oktav) ve onu izleyen yumuşak hâli
    this.sweep = 0;
    this.s1 = 0; // alçak geçiren filtrenin durumu
    this.s2 = 0;
    this.t1 = 0; // tepe filtresinin durumu
    this.t2 = 0;
    this.h1 = 0; // yüksek geçirenin durumu
    this.h2 = 0;
    this.kPhase = 0;
    this.kHz = 0;
    this.kAmp = 0;
    this.kOn = false;
    this.kAge = 1; // s: kick vurulalı
    this.kc1 = 0; // tık süzgeci
    this.level = 0;
    this.hAge = 1; // s: son hattan beri
    this.hDecay = HAT_DECAY[0];
    this.hVel = 1;
    this.hOn = false; // hat satırı az önce tanımlı mıydı
    this.mPh = new Float64Array(METAL.length);
    this.hG = 0; // hat filtresi
    this.hs1 = 0;
    this.hs2 = 0;
    this.cAge = 1; // s: son clap'ten beri
    this.cG = 0;
    this.cs1 = 0;
    this.cs2 = 0;
    this.seed = 22222; // gürültü
    this.gapG = 1; // drop öncesi boşlukta 0
    // oda
    this.rLines = ROOM_MS.map((ms) => new Float32Array(Math.round((ms * sampleRate) / 1000)));
    this.rPos = new Int32Array(ROOM_MS.length);
    this.rLp = new Float64Array(ROOM_MS.length);
    this.rHp = 0;
    this.rHpA = 1 - Math.exp((-TAU * ROOM_HP) / sampleRate);
    this.rDampA = 1 - Math.exp((-TAU * ROOM_DAMP) / sampleRate);
    this.rOut = new Float64Array(ROOM_MS.length);
    this.prm = { ...DEFAULTS }; // istenen ayarlar
    this.now = { ...DEFAULTS }; // yumuşatılmış hâlleri
    const per = (s) => 1 - Math.exp(-1 / (s * sampleRate));
    this.fade = per(0.004);
    this.smooth = per(0.02);
    this.glide = per(GLIDE);
    this.kUp = per(0.0003);
    this.kDown = per(0.006);
    this.sweepFall = per(SWEEP_FALL);
    this.sweepRise = per(0.02);
    const g = Math.tan((Math.PI * HP) / sampleRate);
    const k = Math.SQRT2;
    const a1 = 1 / (1 + g * (g + k));
    this.hp = { k, a1, a2: g * a1, a3: g * g * a1 };
    // yankı: halka tampon (en yavaş tempoda bile gecikme sığsın diye 1,6 s)
    this.dbuf = new Float32Array(Math.ceil(sampleRate * 1.6));
    this.dw = 0;
    this.dlen = 0; // örnek: gecikme, tempo değişince kaymadan yeni yerine kayar
    this.dSmooth = per(0.08);
    this.e1 = 0;
    this.e2 = 0;
    this.eLp = 1 - Math.exp((-TAU * ECHO_LP) / sampleRate);
    this.eHp = 1 - Math.exp((-TAU * ECHO_HP) / sampleRate);
    this.port.onmessage = ({ data }) => {
      if (data.type === 'clock') this.clocks.push(data);
      else if (data.type === 'params') Object.assign(this.prm, data.values);
      else {
        // aynı vuruştan başlayan sayfa yeniden yazıldıysa eskisi ve ardındakiler atılır
        const i = this.pages.findIndex((p) => p.beat >= data.beat);
        if (i >= 0) this.pages.length = i;
        this.pages.push(data);
      }
    };
  }

  process(inputs, outputs) {
    const out = outputs[0][0];
    while (this.clocks.length > 1 && this.clocks[1].time <= currentTime) this.clocks.shift();
    const clock = this.clocks[0];
    if (!clock) return true;
    const sr = sampleRate;
    const perSample = clock.bpm / 60 / sr;
    const beat0 = clock.beat + ((currentTime - clock.time) * clock.bpm) / 60;
    const pages = this.pages;
    while (pages.length > 1 && beat0 >= pages[0].beat + PAGE) pages.shift();
    const hp = this.hp;
    const prm = this.prm;
    const now = this.now;
    const sm = this.smooth;
    const dbuf = this.dbuf;
    const L = dbuf.length;
    const dTarget = ((ECHO_BEATS * 60) / clock.bpm) * sr;
    if (!this.dlen) this.dlen = dTarget;

    let page = null;
    for (let i = 0; i < out.length; i++) {
      const beat = beat0 + i * perSample;
      now.cut += (prm.cut - now.cut) * sm;
      now.res += (prm.res - now.res) * sm;
      now.env += (prm.env - now.env) * sm;
      now.drive += (prm.drive - now.drive) * sm;
      now.kick += (prm.kick - now.kick) * sm;
      now.wave += (prm.wave - now.wave) * sm;
      now.echo += (prm.echo - now.echo) * sm;
      now.hat += (prm.hat - now.hat) * sm;
      now.clap += (prm.clap - now.clap) * sm;
      now.pump += (prm.pump - now.pump) * sm;
      now.room += (prm.room - now.room) * sm;
      if (!page || beat < page.beat || beat >= page.beat + PAGE) page = pageAt(pages, beat);
      let mel = 0;
      let kickOn = false;
      let gapT = 1;
      if (page) {
        const { sp } = page;
        const x = beat - page.beat - 8;
        if (sp.gap && x >= 7.5) gapT = 0; // drop öncesi boşluk: son yarım vuruş sessiz, yalnızca oda yankısı kalır

        // melodi: perde sıçrayınca yeni nota; vurgulu adıma girince perde aynı kalsa da nota yeniden vurulur (303'teki gibi)
        const y = melodyY(sp, x);
        const st = Math.floor(4 * beat);
        const stepIn = st !== this.st;
        this.st = st;
        if (this.raw === null || Math.abs(y - this.raw) > JUMP || (stepIn && accentAt(sp, x))) {
          this.age = 0;
          this.acc = accentAt(sp, x) ? prm.accent : 0;
          if (this.acc) this.sweepT = Math.min(SWEEP_MAX, this.sweepT + SWEEP * this.acc);
        }
        this.raw = y;
        this.y = this.y === null ? y : this.y + (y - this.y) * this.glide;
        const dt = Math.min(REF_HZ * 2 ** this.y, 0.45 * sr) / sr;
        this.phase += dt;
        if (this.phase >= 1) this.phase -= 1;
        const saw = 2 * this.phase - 1 - blep(this.phase, dt);
        let osc = saw;
        if (now.wave > 0.0005) {
          // kare, testereyle aynı yöne basar (temel tonları birbirini silmesin): döngü başında iner, ortada çıkar
          const sq = (this.phase < 0.5 ? -1 : 1) - blep(this.phase, dt) + blep((this.phase + 0.5) % 1, dt);
          osc += now.wave * (SQ * sq - saw);
        }
        const b = page.b0 + ((page.b1 - page.b0) * (x + 8)) / PAGE;
        const acc = this.acc * Math.exp(-this.age / ACC_TIME);
        const env = (now.env + ACC_ENV * this.acc) * Math.exp(-this.age / prm.decay) * (1 - Math.exp(-this.age / 0.001));
        this.age += 1 / sr;
        this.sweepT -= this.sweepT * this.sweepFall;
        this.sweep += (this.sweepT - this.sweep) * this.sweepRise;
        const fc = Math.min(FC * 2 ** (OPEN * b + now.cut + env + this.sweep), 0.4 * sr);
        // durum değişkenli filtre (Simper): kesim örnek örnek değişse de kararlı kalır, tık yapmaz
        const g = Math.tan((Math.PI * fc) / sr);
        const a1 = 1 / (1 + g * (g + now.res * (1 - ACC_RES * acc)));
        const a2 = g * a1;
        const v3 = osc - this.s2;
        const v1 = a1 * this.s1 + a2 * v3;
        const v2 = this.s2 + a2 * this.s1 + g * a2 * v3;
        this.s1 = 2 * v1 - this.s1;
        this.s2 = 2 * v2 - this.s2;
        // tepe: rezonanssız ikinci alçak geçiren
        const gt = Math.tan((Math.PI * Math.min(TOP * fc, 0.45 * sr)) / sr);
        const t1 = 1 / (1 + gt * (gt + Math.SQRT2));
        const t2 = gt * t1;
        let lp = v2 + TAIL * v1;
        // doygunluk: rezonanslı sesi yumuşakça kırpar; tizini arkadaki tepe filtresi alır
        if (now.drive > 0.0005) {
          const k = 1 + 7 * now.drive;
          lp += Math.min(1, 4 * now.drive) * ((DRIVE_GAIN * Math.tanh((k * lp) / DRIVE_GAIN)) / k ** DRIVE_POW - lp);
        }
        const u3 = lp - this.t2;
        const u1 = t1 * this.t1 + t2 * u3;
        const f = this.t2 + t2 * this.t1 + gt * t2 * u3;
        this.t1 = 2 * u1 - this.t1;
        this.t2 = 2 * f - this.t2;
        const w3 = f - this.h2;
        const w1 = hp.a1 * this.h1 + hp.a2 * w3;
        const w2 = this.h2 + hp.a2 * this.h1 + hp.a3 * w3;
        this.h1 = 2 * w1 - this.h1;
        this.h2 = 2 * w2 - this.h2;
        mel = (f - hp.k * w1 - w2) * (1 + ACC_GAIN * acc);

        // hat ve clap: on altılığa girerken satır tanımlıysa vurulur
        const yh = hatY(sp, x);
        if (yh !== null && !this.hOn) {
          const h = hatAt(sp, x);
          this.hAge = 0;
          this.hVel = h.vel;
          this.hDecay = HAT_DECAY[h.open ? 1 : 0];
          this.hG = Math.tan((Math.PI * Math.min(REF_HZ * 2 ** (HAT_Y + 0.3 + HAT_OCT), 0.45 * sr)) / sr);
        }
        this.hOn = yh !== null;
        if (stepIn) {
          if (clapAt(sp, x) && clapY(sp, x) !== null) {
            this.cAge = 0;
            this.cG = Math.tan((Math.PI * REF_HZ * 2 ** (clapY(sp, x) + CLAP_OCT)) / sr);
          }
        }

        // kick: sinüs sıfırdan başlar, böylece vuruş tık değil tok bir "bum" olur
        const yk = kickY(sp, x);
        if (yk !== null) {
          if (!this.kOn) {
            if (this.kAmp < 0.05) this.kPhase = 0;
            this.kAge = 0;
          }
          this.kHz = KICK_HZ * 2 ** yk;
          kickOn = true;
        }
      }
      // yankı: gecikmiş melodi koyulaşıp incelerek geri beslenir
      this.dlen += (dTarget - this.dlen) * this.dSmooth;
      let rp = this.dw - this.dlen;
      if (rp < 0) rp += L;
      const i0 = Math.floor(rp);
      const i1 = i0 + 1 === L ? 0 : i0 + 1;
      const tap = dbuf[i0] + (dbuf[i1] - dbuf[i0]) * (rp - i0);
      this.e1 += (tap - this.e1) * this.eLp;
      this.e2 += (this.e1 - this.e2) * this.eHp;
      const echo = this.e1 - this.e2;
      dbuf[this.dw] = mel + echo * (0.25 + 0.4 * now.echo);
      if (++this.dw === L) this.dw = 0;
      mel += echo * 0.7 * now.echo;

      this.kOn = kickOn;
      this.kAmp += ((kickOn ? 1 : 0) - this.kAmp) * (kickOn ? this.kUp : this.kDown);
      this.kPhase += this.kHz / sr;
      if (this.kPhase >= 1) this.kPhase -= 1;
      const kEnv = 1.2 * this.kAmp * Math.exp(-this.kAge / KICK_DECAY);
      this.kAge += 1 / sr;
      let kick = (Math.tanh(KICK_DRIVE * Math.sin(TAU * this.kPhase)) / Math.tanh(KICK_DRIVE)) * kEnv;
      this.level += ((page ? 1 : 0) - this.level) * this.fade;
      // rezonans arttıkça tepe yükselir; ses düzeyi kabaca sabit kalsın (doygunluk tepeyi zaten kırpar)
      const comp = (now.res / RES) ** (0.35 * (1 - now.drive));
      // gürültü (xorshift)
      let r = this.seed;
      r ^= r << 13;
      r ^= r >>> 17;
      r ^= r << 5;
      this.seed = r;
      const noise = (r >>> 0) / 2147483648 - 1;
      // kick'in tığı: gürültünün tizi, birkaç milisaniye
      if (this.kAge < 10 * CLICK_TIME) {
        this.kc1 += (noise - this.kc1) * 0.5;
        kick += CLICK * (noise - this.kc1) * Math.exp(-this.kAge / CLICK_TIME) * this.kAmp;
      }
      let hat = 0;
      let metal = 0;
      for (let k = 0; k < METAL.length; k++) {
        this.mPh[k] += METAL[k] / sr;
        if (this.mPh[k] >= 1) this.mPh[k] -= 1;
        metal += this.mPh[k] < 0.5 ? 1 : -1;
      }
      if (this.hAge < 8 * this.hDecay) {
        const src = METAL_MIX * metal / 3 + (1 - METAL_MIX) * noise;
        // iki kutuplu yüksek geçiren (Simper)
        const g = this.hG;
        const a1 = 1 / (1 + g * (g + 1.2));
        const a2 = g * a1;
        const v3 = src - this.hs2;
        const v1 = a1 * this.hs1 + a2 * v3;
        const v2 = this.hs2 + a2 * this.hs1 + g * a2 * v3;
        this.hs1 = 2 * v1 - this.hs1;
        this.hs2 = 2 * v2 - this.hs2;
        hat = 2.8 * this.hVel * (src - 1.2 * v1 - v2) * Math.exp(-this.hAge / this.hDecay) * (1 - Math.exp(-this.hAge / 0.0005));
      }
      this.hAge += 1 / sr;
      let clap = 0;
      if (this.cAge < 1) {
        const g = this.cG;
        const a1 = 1 / (1 + g * (g + CLAP_Q));
        const a2 = g * a1;
        const v3 = noise - this.cs2;
        const v1 = a1 * this.cs1 + a2 * v3;
        const v2 = this.cs2 + a2 * this.cs1 + g * a2 * v3;
        this.cs1 = 2 * v1 - this.cs1;
        this.cs2 = 2 * v2 - this.cs2;
        const a = this.cAge;
        // üç çarpma, sonra kuyruk
        const burst = a < 3 * CLAP_GAP ? Math.exp(-(a % CLAP_GAP) / 0.004) : 0;
        const tail = a >= 2 * CLAP_GAP ? 0.7 * Math.exp(-(a - 2 * CLAP_GAP) / CLAP_TAIL) : 0;
        clap = 2.5 * v1 * Math.max(burst, tail);
      }
      this.cAge += 1 / sr;
      // pompa: kick'in vurduğu an kısılır (başı 4 ms'de iner, tık olmasın), sonra geri gelir; kick yoksa düz
      const duck = 1 - now.pump * PUMP_DEPTH * Math.exp(-this.kAge / PUMP_TIME) * (1 - Math.exp(-this.kAge / 0.004));
      this.gapG += (gapT - this.gapG) * this.fade;
      const melOut = mel * MEL * comp * duck * this.gapG;
      const hatOut = hat * now.hat * this.gapG;
      const clapOut = clap * now.clap * this.gapG;
      // oda: sönme süresi (RT60) 0,8 … 2,2 s, Oda ayarıyla uzar
      let wet = 0;
      if (now.room > 0.001) {
        let send = ROOM_SEND.mel * melOut + ROOM_SEND.hat * hatOut + ROOM_SEND.clap * clapOut;
        this.rHp += (send - this.rHp) * this.rHpA;
        send -= this.rHp;
        const rt = 0.8 + 1.4 * now.room;
        const lines = this.rLines;
        const o = this.rOut;
        let sum = 0;
        for (let k = 0; k < 8; k++) {
          o[k] = lines[k][this.rPos[k]];
          sum += o[k];
          wet += o[k];
        }
        const mix = sum / 4; // Householder: x − 2/N · Σ
        for (let k = 0; k < 8; k++) {
          const line = lines[k];
          const g = 10 ** ((-3 * line.length) / (sr * rt));
          this.rLp[k] += (o[k] - mix - this.rLp[k]) * this.rDampA;
          line[this.rPos[k]] = send + g * this.rLp[k];
          if (++this.rPos[k] === line.length) this.rPos[k] = 0;
        }
        wet *= (ROOM_OUT / 8) * now.room * (0.6 + 0.4 * duck);
      }
      const v = (melOut + kick * now.kick * this.gapG + hatOut + clapOut + wet) * this.level;
      // tavan: 0,8'e kadar dokunmaz, üstünü yumuşakça 1'in altında tutar; uç ayarlarda bile ses patlamaz
      const a = Math.abs(v);
      out[i] = a <= 0.8 ? v : Math.sign(v) * (0.8 + 0.2 * Math.tanh((a - 0.8) / 0.2));
    }
    return true;
  }
}

registerProcessor('formul-ses', FormulSes);
