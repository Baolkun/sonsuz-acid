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
// Sub-bas: akorun kökünde bir sinüs (41 … 82 Hz), acid basın altını doldurur; her yeni notada hafifçe vurulur, kick
// gelince pompadan daha derin kısılır, bas kick'le çakışıp çamurlaşmasın.
// Glitch: sesin tamamı son iki saniyesiyle bir halkada tutulur; formüldeki kesik çalarken çıkış oradan okunur:
// tekrar (son ½ … ⅛ vuruş döner, uçları yumuşatılarak), ters (geçmiş tersine), bant durur (okuma hızı sıfıra iner),
// kırık (örnek n'de bir tutulur, 4 bite iner). Girişte ve çıkışta birkaç milisaniyelik geçiş: tık olmasın.
// Pompalama (sidechain): kick her vurduğunda melodi bir anlığına kısılır ve ~150 ms'de geri gelir; techno'nun
// "nefes alan" hissi. Hat ve clap pompalanmaz.
// Pad satırı: akorun üç notası, her biri hafifçe ayrık iki testere (koro gibi), yumuşak bir filtreden geçer; filtre
// yavaşça nefes alır. Yavaş açılır, pompaya en çok o uyar, odaya çok gider.
// Oda yankısı (reverb): sekiz gecikme hattı birbirine karışarak geri beslenir (FDN). Clap'e çok, hat'e biraz, melodiye
// az gider; yankının altı kesilir, bas çamurlaşmasın; her dönüşte tizi koyulaşır.
// Hat satırı: 808'deki gibi altı kare dalga (uyumsuz frekanslarda, metalik) ve biraz gürültü, tizi süzülerek. Satır
// tanımlı olmaya başlayınca vurulur (swing de satırda), şiddeti satırdaki v; açık hat uzun söner, sonraki hat onu keser.
// Clap satırı: gürültü, ortada süzülür; başı birkaç milisaniye arayla üç kez çarpar (eller), ardından kısa bir kuyruk.

// Ek vurmalı satırı: shaker (gürültü, tizde bir bantta, kısa), rim (808'deki gibi iki kısa çınlayan sinüs, biraz
// kırpılmış: tahta "tok"), tom (perdesi hızla inen sinüs; iki ölçünün sonunda akorun beşlisinden köküne iner).
// Tom, rim ve snare'in perdesi tona oturur (drumHz).
// Tür satırı (Amen, gabber …): kendi davul takımı, otuz ikiliğe girerken satır tanımlıysa vurulur. Kick perdesi hızla
// inen sinüs (pompayı o da tetikler), türün kick'iyle doyurulur (gabber'da neredeyse kare: uzun, perdeli "bum"); snare
// iki kısa sinüs ve süzülmüş gürültü (hayalet snare kısık ve kısa), ride hat'in metali alçak bir bantta uzun söner,
// crash tizde uzun gürültü. Clap ve hat'ler clap ve hat satırının sesiyle çalar. Düzeyleri Kick, Clap ve Hat
// ayarlarından gelir. Türün davul sesleri (örnekler) yüklendiyse sentezin yerine onlar çalar: her davulun bir kanalı
// var, aynı kanalda yeni vuruş eskisini birkaç milisaniyede keser; Amen kaydı kalıbın her vuruşunda kaydın o on
// altılığından başlar (tempoya göre hızlanır, jungle'daki gibi perdesi de kalkar), sonraki vuruşa kadar akar.

import { kickY, melodyY, accentAt, hatAt, hatY, clapAt, clapY, padY, perkAt, perkY, breakAt, drumHz, subHz, HAT_Y, CLAP_Y, REF_HZ, KICK_HZ, TURLER } from './formula.js?v=c2f8e7f5';

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
const HP = 90; // Hz: melodinin en altı inceltilir; en alttaki gövdeyi sub-bas ve kick taşır
const MEL = 0.22;
const SUB_DECAY = 0.15; // s: notanın başındaki vuruş…
const SUB_HOLD = 0.5; // …ardından bu kadarı sürer
const G_FADE = 0.004; // s: glitch'e giriş, çıkış ve tekrarın uçları
const KICK = 0.18;
// ayarların başlangıç değerleri: cut kesimi oktav olarak kaydırır, drive doygunluk, accent vurgu, wave kare payı,
// echo yankı (hepsi 0 … 1)
const KICK_DECAY = 0.17; // s: kick'in sönüşü
const KICK_DRIVE = 1.8; // tanh doygunluğu: üst harmonikler, tok vuruş
const CLICK = 0.35; // başındaki tık…
const CLICK_TIME = 0.0015; // …bu sürede söner
const PUMP_DEPTH = 0.7; // tam pompada melodi bu kadar kısılır…
const PUMP_TIME = 0.1; // s: …ve bu süreyle geri gelir
const PAD = 0.2;
const PAD_DETUNE = 0.005; // oktav: iki testere arası (~6 sent)
const PAD_LP = 1300; // Hz
const PAD_LFO = 0.07; // Hz: filtrenin nefesi
const PAD_IN = 0.4; // s: açılış…
const PAD_OUT = 0.8; // s: …kapanış
const ROOM_MS = [29.7, 37.1, 41.1, 43.7, 53.3, 59.9, 67.3, 73.1]; // gecikme hatları
const PERK = 0.2;
const SHAKER_BP = 7000; // Hz
const SHAKER_DECAY = 0.03; // s
const RIM_RATIO = 3.66; // 808'in rim'i: 455 ve 1667 Hz; ilki tona oturur, ikincisi aynı oranda
const RIM_DECAY = [0.012, 0.007]; // s
const TOM_DECAY = 0.22; // s
const SN_RATIO = 1.78; // snare'in gövdesi: tona oturan sinüs ve onun bu katı
const SN_DECAY = [0.05, 0.13]; // s: gövde, gürültü (hayalet snare'de yarısı)
const SN_HP = 900; // Hz: snare gürültüsünün altı
const RIDE_DECAY = 0.45; // s
const RIDE_HP = 4500; // Hz
const CRASH_DECAY = 1.1; // s
const SMP_GAIN = { K: 1.8, S: 1.5, C: 2.2, h: 1.2, o: 1.1, r: 0.9, X: 0.9, B: 2.1 }; // örneklerin düzeyi (tepe 1)
const SMP_CUT = 0.003; // s: kesilen sesin sönüşü
const ROOM_SEND = { mel: 0.12, hat: 0.3, clap: 0.7, pad: 0.6, perk: 0.4, brk: 0.35 };
const ROOM_HP = 250; // Hz: yankıya giden sesin altı kesilir
const ROOM_DAMP = 5000; // Hz: hatların içinde tizi koyulaştırır
const ROOM_OUT = 0.6;
const HAT = 0.18;
const CLAP = 0.24;
const HAT_DECAY = [0.022, 0.09]; // s: kapalı, açık
const METAL = [205.3, 304.4, 369.6, 522.7, 540, 800]; // Hz: 808 hat'inin altı osilatörü
const METAL_MIX = 0.6; // metal / gürültü
const HAT_BP = 9000; // Hz: metalin bandı (808'deki gibi kareler önce burada süzülür)
const HAT_TOP = 13000; // Hz: tavan; üstü cızırtı
const HAT_OCT = 2; // hat satırının y'sinden kesim: REF_HZ · 2^(y + bu) ≈ 6,5 kHz (şerit taşınırsa bu da taşınır)
const CLAP_OCT = 5.6; // clap: ≈ 1,5 kHz (şerit taşınırsa bu da taşınır)
const CLAP_Q = 0.8; // 1/Q
const CLAP_GAP = 0.011; // s: ellerin çarpma arası
const CLAP_TAIL = 0.11; // s
const DEFAULTS = { cut: 0, res: RES, env: ENV, decay: DECAY, drive: 0, kick: KICK, accent: 0, wave: 0, echo: 0, hat: HAT, clap: CLAP, pump: 0.5, room: 0.35, pad: PAD, hatLen: 1, perk: PERK, sub: 0.2 };
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
    this.hs3 = 0; // ikinci yüksek geçiren
    this.hs4 = 0;
    this.hb1 = 0; // metalin bant geçireni
    this.hb2 = 0;
    this.ht = 0; // tavan
    this.ht2 = 0;
    this.cAge = 1; // s: son clap'ten beri
    this.cG = 0;
    this.cs1 = 0;
    this.cs2 = 0;
    this.seed = 22222; // gürültü
    this.gapG = 1; // drop öncesi boşlukta 0
    // ek vurmalı
    this.qOn = false;
    this.qAge = 1;
    this.qSes = null;
    this.qVel = 1;
    this.qHz = 150;
    this.snHz = 190;
    this.qPh = new Float64Array(2);
    this.qs1 = 0;
    this.qs2 = 0;
    // Amen
    this.bt = null; // çalan otuz ikilik
    this.bkAge = 1;
    this.bkPh = 0;
    this.bkHz = KICK_HZ;
    this.bkVel = 1;
    this.bkK = TURLER.amen.kik;
    // örnekler: ad → Float32Array; kanallar: K kick, S snare, C clap, M metal, X crash, B Amen kaydı
    this.smp = {};
    this.vox = {};
    this.olds = [];
    this.snAge = 1;
    this.snVel = 1;
    this.snPh = new Float64Array(2);
    this.snHp = 0;
    this.snLp = 0;
    this.rdAge = 1;
    this.rdVel = 0;
    this.rd1 = 0;
    this.rd2 = 0;
    this.crAge = 9;
    this.crHp = 0;
    this.snHpA = 1 - Math.exp((-TAU * SN_HP) / sampleRate);
    this.snLpA = 1 - Math.exp((-TAU * 7000) / sampleRate);
    this.rdHpA = 1 - Math.exp((-TAU * RIDE_HP) / sampleRate);
    // sub-bas
    this.subPh = 0;
    this.subF = 0;
    this.subT = 0;
    // glitch: çıkışın halkası, çalan kesik ve onun içindeki zaman
    this.gBuf = new Float32Array(Math.ceil(sampleRate * 2));
    this.gW = 0;
    this.gEv = null;
    this.gKey = null;
    this.gT = 0;
    this.gS0 = 0;
    this.gPos = 0;
    this.gRate = 1;
    this.gHold = 0;
    this.gMix = 0;
    // pad
    this.pPh = new Float64Array(6);
    this.pHz = new Float64Array(3);
    this.pAmp = 0;
    this.p1 = 0;
    this.p2 = 0;
    this.pLfo = 0;
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
    this.hBp = Math.tan((Math.PI * Math.min(HAT_BP, 0.45 * sampleRate)) / sampleRate);
    this.hTop = 1 - Math.exp((-TAU * HAT_TOP) / sampleRate);
    this.qBp = Math.tan((Math.PI * SHAKER_BP) / sampleRate);
    this.pIn = per(PAD_IN);
    this.pOut = per(PAD_OUT);
    this.pGlide = per(0.015);
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
      else if (data.type === 'sample') this.smp[data.name] = data.data;
      else if (data.type === 'params') Object.assign(this.prm, data.values);
      else {
        // aynı vuruştan başlayan sayfa yeniden yazıldıysa eskisi ve ardındakiler atılır
        const i = this.pages.findIndex((p) => p.beat >= data.beat);
        if (i >= 0) this.pages.length = i;
        this.pages.push(data);
      }
    };
  }

  // vuruşu türün örnekleriyle çalar; takımın sesleri yüklenmediyse false (sentez çalar)
  sampled(h, bpm) {
    const S = h.T.ses;
    const smp = this.smp;
    if (!S || !(S.brk ? smp[S.brk] : smp[S.K] && smp[S.S])) return false;
    if (S.brk) {
      const buf = smp[S.brk];
      this.play('B', buf, h.vel, bpm / S.bpm, Math.floor(((h.i % S.n) * buf.length) / S.n));
      return true;
    }
    const ch = h.ch;
    if ('KXBZ'.includes(ch)) this.play('K', smp[S.K], S.kg ?? 1, 1, 0, S.bozuk);
    if (ch === 'K' && h.vel < 1) this.vox.K.gain *= h.vel; // kick roll
    if ('SsZ'.includes(ch)) this.play('S', smp[S.S], h.vel, ch === 's' ? 1.06 : 1);
    if ('CB'.includes(ch)) this.play('C', smp[S.C], 1);
    if (ch === 'X') this.play('X', smp[S.X], 1);
    if (h.met) this.play('M', smp[S[h.met]], h.met === 'r' ? (h.i % 4 === 0 ? 1 : 0.6) : h.i % 4 === 2 ? 1 : 0.7, 1, 0, 0, h.met);
    return true;
  }

  // kanalda yeni ses; öncekisi kısa bir sönüşle kesilir
  play(ch, buf, gain, rate = 1, from = 0, drive = 0, kind = ch) {
    if (!buf) return;
    const old = this.vox[ch];
    if (old) this.olds.push(old);
    this.vox[ch] = { ch, buf, pos: from, rate, gain: gain * SMP_GAIN[kind], drive, cut: 1, end: false };
  }

  // bir örneğin bu andaki değeri (doğrusal ara değer); kesilen ses söner
  voice(v, cutStep) {
    const i = Math.floor(v.pos);
    if (i + 1 >= v.buf.length || v.cut < 0.001) {
      v.end = true;
      return 0;
    }
    let y = v.buf[i] + (v.buf[i + 1] - v.buf[i]) * (v.pos - i);
    v.pos += v.rate;
    if (v.drive) y = Math.tanh(v.drive * y) / Math.tanh(v.drive);
    y *= v.gain;
    if (cutStep) v.cut -= v.cut * cutStep;
    return y * v.cut;
  }

  // glitch: çıkış halkaya yazılır; kesik çalıyorsa çıkış halkadan okunur
  glitch(v, g, bpm) {
    const sr = sampleRate;
    const buf = this.gBuf;
    const N = buf.length;
    buf[this.gW] = v;
    const w = this.gW;
    if (++this.gW === N) this.gW = 0;
    const fade = 1 / (G_FADE * sr);
    this.gMix += ((g ? 1 : 0) - this.gMix) * Math.min(1, 2 * fade);
    if (!g && this.gMix < 0.001) {
      this.gKey = null;
      return v;
    }
    const at = (p) => {
      p = ((p % N) + N) % N;
      const i = Math.floor(p);
      const j = i + 1 === N ? 0 : i + 1;
      return buf[i] + (buf[j] - buf[i]) * (p - i);
    };
    const t = this.gT;
    let y = v;
    if (g) {
      if (g.k === 'tekrar') {
        // son L vuruş döner; ilk turda canlı ses, sonra halkadan; her turun uçları yumuşatılır
        const L = Math.max(64, Math.round((g.L * 60 * sr) / bpm));
        const u = t % L;
        y = t < L ? v : at(this.gS0 + u);
        const edge = Math.min(1, u * fade, (L - u) * fade);
        if (t >= L) y *= edge;
      } else if (g.k === 'ters') {
        y = at(this.gS0 - t) * Math.min(1, t * fade + 0.5);
      } else if (g.k === 'dur') {
        // okuma hızı kesik boyunca sıfıra iner
        const D = (g.d * 60 * sr) / bpm;
        this.gRate = Math.max(0, 1 - t / D);
        y = this.gRate > 0 ? at(this.gPos) * Math.min(1, 4 * this.gRate) : 0;
        this.gPos += this.gRate;
      } else if (g.k === 'kir') {
        if (t % g.n === 0) this.gHold = Math.round(v * 8) / 8;
        y = this.gHold;
      }
      this.gT++;
    } else {
      y = v;
    }
    return v + (y - v) * this.gMix;
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
      now.pad += (prm.pad - now.pad) * sm;
      now.hatLen += (prm.hatLen - now.hatLen) * sm;
      now.perk += (prm.perk - now.perk) * sm;
      now.sub += (prm.sub - now.sub) * sm;
      if (!page || beat < page.beat || beat >= page.beat + PAGE) page = pageAt(pages, beat);
      let mel = 0;
      let kickOn = false;
      let gapT = 1;
      let padT = 0;
      let gEv = null;
      if (page) {
        const { sp } = page;
        const x = beat - page.beat - 8;
        this.subT = subHz(sp, x);
        if (sp.glitch) {
          for (const g of sp.glitch) if (x >= g.x && x < g.x + g.d) gEv = g;
          if (gEv && this.gKey !== page.beat + gEv.x) {
            this.gKey = page.beat + gEv.x;
            this.gT = 0;
            this.gS0 = this.gW;
            this.gPos = this.gW;
            this.gRate = 1;
            this.gHold = 0;
          }
        }
        if (sp.pad) {
          padT = sp.pad.lvl;
          for (let k = 0; k < 3; k++) {
            const hz = REF_HZ * 2 ** padY(sp, x, k);
            this.pHz[k] = this.pHz[k] ? this.pHz[k] + (hz - this.pHz[k]) * this.pGlide : hz;
          }
        }
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
          this.hDecay = HAT_DECAY[h.open ? 1 : 0] * (h.open ? now.hatLen : Math.sqrt(now.hatLen));
          this.hG = Math.tan((Math.PI * Math.min(REF_HZ * 2 ** (HAT_Y + 0.3 + HAT_OCT), 0.45 * sr)) / sr);
        }
        this.hOn = yh !== null;
        const yq = perkY(sp, x);
        if (yq !== null && !this.qOn) {
          const q = perkAt(sp, x);
          this.qAge = 0;
          this.qSes = q.ses;
          this.qVel = q.vel;
          this.qHz = drumHz(sp, x, q.ses, q.k);
          this.qPh.fill(0);
        }
        this.qOn = yq !== null;
        if (stepIn) {
          if (clapAt(sp, x) && clapY(sp, x) !== null) {
            this.cAge = 0;
            this.cG = Math.tan((Math.PI * REF_HZ * 2 ** (clapY(sp, x) + CLAP_OCT)) / sr);
          }
        }

        // Amen: otuz ikiliğe girerken
        const bt = Math.floor(8 * beat);
        if (bt !== this.bt) {
          this.bt = bt;
          const h = breakAt(sp, x);
          if (h && this.sampled(h, clock.bpm)) {
            // pompa örnek kick'le de çalışır; sentez kick'i sessiz
            if ('KXBZ'.includes(h.ch)) {
              this.bkAge = 0;
              this.bkVel = 0;
            }
          } else if (h) {
            if ('KXBZ'.includes(h.ch)) {
              this.bkAge = 0;
              this.bkPh = 0;
              this.bkVel = h.vel;
              this.bkK = h.T.kik;
              this.bkHz = KICK_HZ * 2 ** ((sp.base + 12) / 12);
            }
            if ('SsZ'.includes(h.ch)) {
              this.snAge = 0;
              this.snVel = h.vel;
              this.snHz = drumHz(sp, x, 'snare');
              this.snPh.fill(0);
            }
            if ('CB'.includes(h.ch)) {
              this.cAge = 0;
              this.cG = Math.tan((Math.PI * REF_HZ * 2 ** (CLAP_Y + 0.3 + CLAP_OCT)) / sr);
            }
            if (h.ch === 'X') this.crAge = 0;
            else if (h.met === 'r') {
              this.rdAge = 0;
              this.rdVel = h.i % 4 === 0 ? 1 : 0.6;
            } else if (h.met) {
              const open = h.met === 'o';
              this.hAge = 0;
              this.hVel = h.i % 4 === 2 ? 1 : 0.7;
              this.hDecay = HAT_DECAY[open ? 1 : 0] * (open ? now.hatLen : Math.sqrt(now.hatLen));
              this.hG = Math.tan((Math.PI * Math.min(REF_HZ * 2 ** (HAT_Y + 0.3 + HAT_OCT), 0.45 * sr)) / sr);
            }
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
      if (this.hAge < 8 * this.hDecay) {
        // altı kare (bant sınırlı, cızırtısız) ve gürültü birlikte bir bantta süzülür: metalin çınlaması
        let metal = 0;
        for (let k = 0; k < METAL.length; k++) {
          const dt = METAL[k] / sr;
          let ph = this.mPh[k] + dt;
          if (ph >= 1) ph -= 1;
          this.mPh[k] = ph;
          let ph2 = ph + 0.5;
          if (ph2 >= 1) ph2 -= 1;
          metal += (ph < 0.5 ? 1 : -1) + blep(ph, dt) - blep(ph2, dt);
        }
        let g = this.hBp;
        let a1 = 1 / (1 + g * (g + 1.4));
        let a2 = g * a1;
        let v3 = METAL_MIX * metal / 3 + (1 - METAL_MIX) * noise - this.hb2;
        let v1 = a1 * this.hb1 + a2 * v3;
        let v2 = this.hb2 + a2 * this.hb1 + g * a2 * v3;
        this.hb1 = 2 * v1 - this.hb1;
        this.hb2 = 2 * v2 - this.hb2;
        let x = 2 * v1 + 0.15 * noise; // biraz da ham gürültü: hava
        // dört kutuplu yüksek geçiren (iki Simper art arda): altı tamamen temiz
        g = this.hG;
        a1 = 1 / (1 + g * (g + 1.4));
        a2 = g * a1;
        v3 = x - this.hs2;
        v1 = a1 * this.hs1 + a2 * v3;
        v2 = this.hs2 + a2 * this.hs1 + g * a2 * v3;
        this.hs1 = 2 * v1 - this.hs1;
        this.hs2 = 2 * v2 - this.hs2;
        x = x - 1.4 * v1 - v2;
        v3 = x - this.hs4;
        v1 = a1 * this.hs3 + a2 * v3;
        v2 = this.hs4 + a2 * this.hs3 + g * a2 * v3;
        this.hs3 = 2 * v1 - this.hs3;
        this.hs4 = 2 * v2 - this.hs4;
        x = x - 1.4 * v1 - v2;
        // tavan: iki tek kutuplu alçak geçiren
        this.ht += (x - this.ht) * this.hTop;
        this.ht2 += (this.ht - this.ht2) * this.hTop;
        hat = 2.8 * this.hVel * this.ht2 * Math.exp(-this.hAge / this.hDecay) * (1 - Math.exp(-this.hAge / 0.0005));
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
      let perk = 0;
      if (this.qAge < 1) {
        const a = this.qAge;
        const att = 1 - Math.exp(-a / 0.0005);
        if (this.qSes === 'shaker') {
          const g = this.qBp;
          const a1 = 1 / (1 + g * (g + 0.9));
          const a2 = g * a1;
          const v3 = noise - this.qs2;
          const v1 = a1 * this.qs1 + a2 * v3;
          const v2 = this.qs2 + a2 * this.qs1 + g * a2 * v3;
          this.qs1 = 2 * v1 - this.qs1;
          this.qs2 = 2 * v2 - this.qs2;
          perk = 1.6 * v1 * Math.exp(-a / SHAKER_DECAY) * (1 - Math.exp(-a / 0.004));
        } else if (this.qSes === 'rim') {
          let s = 0;
          for (let k = 0; k < 2; k++) {
            this.qPh[k] += (this.qHz * (k ? RIM_RATIO : 1)) / sr;
            s += Math.sin(TAU * this.qPh[k]) * Math.exp(-a / RIM_DECAY[k]);
          }
          perk = 1.6 * Math.tanh(2.5 * s) * att;
        } else if (this.qSes === 'tom') {
          this.qPh[0] += (this.qHz * (1 + 0.6 * Math.exp(-a / 0.03))) / sr;
          perk = 1.5 * Math.sin(TAU * this.qPh[0]) * Math.exp(-a / TOM_DECAY) * att;
        }
        perk *= this.qVel;
      }
      this.qAge += 1 / sr;
      // Amen
      let bk = 0;
      if (this.bkAge < 1) {
        const a = this.bkAge;
        const K = this.bkK;
        this.bkPh += (this.bkHz * (1 + K.sweep * Math.exp(-a / K.st))) / sr;
        if (this.bkPh >= 1) this.bkPh -= 1;
        bk = (Math.tanh(K.drive * Math.sin(TAU * this.bkPh)) / Math.tanh(K.drive)) * K.gain * this.bkVel * Math.exp(-a / K.decay) * (1 - Math.exp(-a / 0.0005));
      }
      this.bkAge += 1 / sr;
      let brk = 0;
      if (this.snAge < 1) {
        const a = this.snAge;
        const ghost = this.snVel < 0.5 ? 0.5 : 1;
        let body = 0;
        for (let k = 0; k < 2; k++) {
          this.snPh[k] += (this.snHz * (k ? SN_RATIO : 1)) / sr;
          body += Math.sin(TAU * this.snPh[k]);
        }
        this.snHp += (noise - this.snHp) * this.snHpA;
        this.snLp += (noise - this.snHp - this.snLp) * this.snLpA;
        const att = 1 - Math.exp(-a / 0.0007);
        brk += this.snVel * att * (0.5 * body * Math.exp(-a / (SN_DECAY[0] * ghost)) + 1.4 * this.snLp * Math.exp(-a / (SN_DECAY[1] * ghost)));
      }
      this.snAge += 1 / sr;
      let ride = 0;
      if (this.rdAge < 3 * RIDE_DECAY || this.crAge < 3 * CRASH_DECAY) {
        if (this.rdAge < 3 * RIDE_DECAY) {
          let metal = 0;
          for (let k = 0; k < METAL.length; k++) metal += this.mPh[k] < 0.5 ? 1 : -1;
          // hat çalmıyorsa metalin evresi burada ilerler
          if (this.hAge >= 8 * this.hDecay) {
            for (let k = 0; k < METAL.length; k++) {
              this.mPh[k] += (1.7 * METAL[k]) / sr;
              if (this.mPh[k] >= 1) this.mPh[k] -= 1;
            }
          }
          const m = metal / 6 + 0.3 * noise;
          this.rd1 += (m - this.rd1) * this.rdHpA;
          this.rd2 += (m - this.rd1 - this.rd2) * this.rdHpA;
          ride = 0.5 * this.rdVel * (m - this.rd1 - this.rd2) * Math.exp(-this.rdAge / RIDE_DECAY);
        }
        if (this.crAge < 3 * CRASH_DECAY) {
          this.crHp += (noise - this.crHp) * this.rdHpA;
          ride += 0.6 * (noise - this.crHp) * Math.exp(-this.crAge / CRASH_DECAY);
        }
      }
      this.rdAge += 1 / sr;
      this.crAge += 1 / sr;
      // örnekler: kick kick'e, snare, clap ve kayıt clap düzeyine, metal hat düzeyine
      let smpK = 0;
      for (const ch in this.vox) {
        const v = this.vox[ch];
        const y = this.voice(v, 0);
        if (ch === 'K') smpK += y;
        else if (ch === 'M' || ch === 'X') ride += y;
        else brk += y;
        if (v.end) delete this.vox[ch];
      }
      if (this.olds.length) {
        const cutStep = 1 / (SMP_CUT * sr);
        for (const v of this.olds) {
          const y = this.voice(v, cutStep);
          if (v.ch === 'K') smpK += y;
          else if (v.ch === 'M' || v.ch === 'X') ride += y;
          else brk += y;
        }
        this.olds = this.olds.filter((v) => !v.end);
      }
      bk += smpK;
      // pompa: kick'in vurduğu an kısılır (başı 4 ms'de iner, tık olmasın), sonra geri gelir; kick yoksa düz
      const kA = Math.min(this.kAge, this.bkAge);
      const duck = 1 - now.pump * PUMP_DEPTH * Math.exp(-kA / PUMP_TIME) * (1 - Math.exp(-kA / 0.004));
      this.gapG += (gapT - this.gapG) * this.fade;
      // pad: altı testere, yumuşak filtre; pompa ona daha derin
      this.pAmp += (padT - this.pAmp) * (padT > this.pAmp ? this.pIn : this.pOut);
      let padOut = 0;
      if (this.pAmp > 0.0005) {
        let osc = 0;
        for (let k = 0; k < 6; k++) {
          const dt = (this.pHz[k >> 1] * 2 ** (k & 1 ? PAD_DETUNE : -PAD_DETUNE)) / sr;
          let ph = this.pPh[k] + dt;
          if (ph >= 1) ph -= 1;
          this.pPh[k] = ph;
          osc += 2 * ph - 1 - blep(ph, dt);
        }
        this.pLfo += PAD_LFO / sr;
        if (this.pLfo >= 1) this.pLfo -= 1;
        const g = Math.tan((Math.PI * PAD_LP * 2 ** (0.5 * Math.sin(TAU * this.pLfo))) / sr);
        const a1 = 1 / (1 + g * (g + 1.1));
        const a2 = g * a1;
        const v3 = osc - this.p2;
        const v1 = a1 * this.p1 + a2 * v3;
        const v2 = this.p2 + a2 * this.p1 + g * a2 * v3;
        this.p1 = 2 * v1 - this.p1;
        this.p2 = 2 * v2 - this.p2;
        const padDuck = 1 - Math.min(1, 1.25 * now.pump) * PUMP_DEPTH * Math.exp(-kA / (1.6 * PUMP_TIME)) * (1 - Math.exp(-kA / 0.004));
        padOut = (v2 / 6) * this.pAmp * now.pad * padDuck * this.gapG;
      }
      // sub-bas: kök değişince kısa bir kaymayla geçer
      let subOut = 0;
      if (this.subT && now.sub > 0.0005) {
        this.subF = this.subF ? this.subF + (this.subT - this.subF) * this.pGlide : this.subT;
        this.subPh += this.subF / sr;
        if (this.subPh >= 1) this.subPh -= 1;
        const env = SUB_HOLD + (1 - SUB_HOLD) * Math.exp(-this.age / SUB_DECAY);
        const subDuck = 1 - Math.min(1, 0.4 + now.pump) * 0.95 * Math.exp(-kA / 0.13) * (1 - Math.exp(-kA / 0.004));
        subOut = Math.sin(TAU * this.subPh) * env * now.sub * subDuck * this.gapG;
      }
      const melOut = mel * MEL * comp * duck * this.gapG;
      const hatOut = hat * now.hat * this.gapG;
      const clapOut = clap * now.clap * this.gapG;
      const perkOut = perk * now.perk * this.gapG;
      const brkOut = (brk * now.clap + ride * now.hat) * this.gapG;
      // oda: sönme süresi (RT60) 0,8 … 2,2 s, Oda ayarıyla uzar
      let wet = 0;
      if (now.room > 0.001) {
        let send = ROOM_SEND.mel * melOut + ROOM_SEND.hat * hatOut + ROOM_SEND.clap * clapOut + ROOM_SEND.pad * padOut + ROOM_SEND.perk * perkOut + ROOM_SEND.brk * brkOut;
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
      let v = (melOut + subOut + padOut + (kick + bk) * now.kick * this.gapG + hatOut + clapOut + perkOut + brkOut + wet) * this.level;
      v = this.glitch(v, gEv, clock.bpm);
      // tavan: 0,8'e kadar dokunmaz, üstünü yumuşakça 1'in altında tutar; uç ayarlarda bile ses patlamaz
      const a = Math.abs(v);
      out[i] = a <= 0.8 ? v : Math.sign(v) * (0.8 + 0.2 * Math.tanh((a - 0.8) / 0.2));
    }
    return true;
  }
}

registerProcessor('formul-ses', FormulSes);
