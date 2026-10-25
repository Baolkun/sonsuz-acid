// Video kaydı: kâğıdı (rengi ve kırışıklarıyla), bölümün adını, grafiği ve formülü TikTok'a uygun dikey bir tuvale
// (1080×1920) çizer, sesle birlikte MediaRecorder'a verir. Bitince dosya indirilir. Yazılar Türkçe ya da İngilizce.
// Her şey TikTok'un güvenli alanında: üstteki sekmeler, sağdaki düğmeler ve alttaki açıklama hiçbir şeyi kapamaz.
// Adresteki ?kanca=… verilirse en üst satırda o yazı çıkar (tanıtım videoları için).
// Formül resim olarak değil, görünmez bir kutuda sayfadaki gibi dizdirilip harflerin yerleri okunarak çizilir.

import { View } from './view.js?v=50032cdf';
import { renderFormula } from './formula.js?v=ae888e31';
import { pageName, infoLine } from './dil.js?v=93257a7a';

const W = 540; // mantıksal boyut; piksel çarpanı S ile 1080×1920
const H = 960;
const S = 2;
const SAFE = { l: 30, r: W - 75, t: 100, b: H - 240 }; // TikTok arayüzünün kapamadığı alan
const CW = SAFE.r - SAFE.l;
const MID = SAFE.l + CW / 2;
const GRAF = { y: 226, h: 290 };
const FORM = { x: SAFE.l, y: 526, w: CW, h: SAFE.b - 4 - 526 };
const INK = '#13140f';
const SOLUK = 'rgba(19, 20, 15, .6)';
const MATH = '"STIX Two Math", "STIX Two Text", "Latin Modern Math", "Times New Roman", serif';
const SANS = '"Helvetica Neue", Helvetica, Arial, sans-serif';
// önce mp4 (TikTok ve telefonlar doğrudan açar), olmazsa webm
const TYPES = ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'];
const BRACE = 'M9 1C4 1 5.5 10 5.5 24S5 47 1 50C5 53 5.5 62 5.5 76S4 99 9 99'; // formula.js'teki küme parantezi

const SOZ = {
  tr: { alt: 'müziğin tamamı tek bir formül' },
  en: { alt: 'the whole track is one formula' },
};

export class Kayit {
  constructor(kagit) {
    this.kagit = kagit;
    this.canvas = document.createElement('canvas');
    this.canvas.width = W * S;
    this.canvas.height = H * S;
    this.g = this.canvas.getContext('2d');
    const graf = document.createElement('canvas');
    this.graf = graf;
    // videoda grafik geniş ve uzun: x yalnız sayfanın aralığı, üstte yazı payı yok (başlık grafiğin üstünde)
    this.view = new View(graf, { width: CW, height: GRAF.h, dpr: S }, { xMin: -8.7, xMax: 9.3, top: 8 });
    // kırışık dokusu sayfanın kendi CSS'inden
    const m = getComputedStyle(kagit).backgroundImage.match(/url\("(data:image\/svg\+xml.+?)"\)/);
    this.doku = new Image();
    if (m) this.doku.src = m[1].replace(/\\"/g, '"');
    // formülün dizildiği görünmez kutu
    this.box = document.createElement('div');
    this.box.className = 'formul';
    this.box.setAttribute('aria-hidden', 'true');
    this.box.style.cssText = 'position:fixed;left:-20000px;top:0;width:640px;height:auto;flex:none;overflow:visible;visibility:hidden;pointer-events:none';
    kagit.append(this.box);
    this.rec = null;
    this.lang = 'tr';
    this.sp = null; // dizilmiş formülün sayfası
    this.kanca = new URLSearchParams(location.search).get('kanca');
  }

  get active() {
    return !!this.rec;
  }

  // formülü kutuda dizdirir; yazı parçalarını (aynı satırdaki harfler bir arada), kesir çizgilerini ve parantezleri toplar
  layout(sp) {
    const { box, g } = this;
    box.innerHTML = renderFormula(sp, this.lang === 'en');
    const o = box.getBoundingClientRect();
    const texts = [];
    const range = document.createRange();
    const walk = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
    for (let n; (n = walk.nextNode()); ) {
      if (!n.data.trim()) continue;
      const el = n.parentElement;
      const cs = getComputedStyle(el);
      const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const color = el.closest('.tanimlar') ? SOLUK : INK;
      let run = null;
      for (let i = 0; i < n.data.length; i++) {
        range.setStart(n, i);
        range.setEnd(n, i + 1);
        const r = range.getClientRects()[0];
        if (!r) continue;
        if (run && Math.abs(r.top - run.top) < 1) run.text += n.data[i];
        else {
          if (run) texts.push(run);
          run = { text: n.data[i], x: r.left - o.left, top: r.top - o.top, h: r.height, font, color };
        }
      }
      if (run) texts.push(run);
    }
    // taban çizgisi: harfin kutusu yazı tipinin üst ve alt payı kadar
    for (const t of texts) {
      g.font = t.font;
      const m = g.measureText('x');
      const a = m.fontBoundingBoxAscent ?? t.h * 0.8;
      const d = m.fontBoundingBoxDescent ?? t.h * 0.2;
      t.y = t.top + (t.h - a - d) / 2 + a;
      t.right = t.x + g.measureText(t.text).width;
    }
    const lines = [];
    const braces = [];
    for (const el of box.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (el.classList.contains('kume')) braces.push({ x: r.left - o.left, y: r.top - o.top, w: r.width, h: r.height });
      const cs = getComputedStyle(el);
      if (cs.borderBottomStyle === 'solid' && parseFloat(cs.borderBottomWidth) > 0) {
        lines.push({ x: r.left - o.left, y: r.bottom - o.top - parseFloat(cs.borderBottomWidth) / 2, w: r.width });
      }
    }
    // kutunun değil yazının genişliği: koşullar sütunu dar kalınca formül büyüyebilir
    const w = Math.max(...texts.map((t) => t.right), ...lines.map((l) => l.x + l.w), 1);
    this.formula = { texts, lines, braces, w, h: box.scrollHeight };
    this.sp = sp;
  }

  drawFormula(sp) {
    if (sp !== this.sp || this.langOf !== this.lang) {
      this.layout(sp);
      this.langOf = this.lang;
    }
    const { g } = this;
    const f = this.formula;
    const k = Math.min(FORM.w / f.w, FORM.h / f.h, 1.3);
    g.save();
    g.translate(FORM.x, FORM.y);
    g.scale(k, k);
    g.textAlign = 'left';
    g.textBaseline = 'alphabetic';
    for (const t of f.texts) {
      g.font = t.font;
      g.fillStyle = t.color;
      g.fillText(t.text, t.x, t.y);
    }
    g.strokeStyle = INK;
    g.lineWidth = 1;
    for (const l of f.lines) {
      g.beginPath();
      g.moveTo(l.x, l.y);
      g.lineTo(l.x + l.w, l.y);
      g.stroke();
    }
    g.lineWidth = 1.1;
    for (const b of f.braces) {
      const p = new Path2D();
      p.addPath(new Path2D(BRACE), new DOMMatrix().translate(b.x, b.y).scale(b.w / 10, b.h / 100));
      g.stroke(p);
    }
    g.restore();
  }

  // her karede: çalan sayfa, kalemin konumu; info: { bpm, renk, tini } (bilgi satırı için)
  draw(page, x, info) {
    if (!this.rec) return;
    const { g } = this;
    const bolum = pageName(page.name, this.lang);
    const bilgi = infoLine(page, info, this.lang);
    g.setTransform(S, 0, 0, S, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = getComputedStyle(this.kagit).backgroundColor;
    g.fillRect(0, 0, W, H);
    if (this.doku.complete && this.doku.naturalWidth) {
      g.globalCompositeOperation = 'multiply';
      g.drawImage(this.doku, 0, 0, W, H);
      g.globalCompositeOperation = 'source-over';
    }
    // ortadaki kat izi
    const fold = g.createLinearGradient(0, 0, 0, H);
    fold.addColorStop(0, 'rgba(255, 255, 225, .18)');
    fold.addColorStop(0.45, 'rgba(255, 255, 225, 0)');
    fold.addColorStop(0.456, 'rgba(60, 80, 0, .12)');
    fold.addColorStop(0.64, 'rgba(60, 80, 0, 0)');
    g.fillStyle = fold;
    g.fillRect(0, 0, W, H);

    // en üstte kanca ya da alt yazı, altında adres
    g.textAlign = 'center';
    if (this.kanca) {
      g.fillStyle = INK;
      g.font = `bold 23px ${SANS}`;
      g.fillText(this.kanca, MID, 128, CW);
    } else {
      g.fillStyle = SOLUK;
      g.font = `italic 19px ${MATH}`;
      g.fillText(SOZ[this.lang].alt, MID, 128, CW);
    }
    g.fillStyle = SOLUK;
    g.font = `13px ${MATH}`;
    g.fillText('baolkun.github.io/sonsuz-acid', MID, 150, CW);

    g.textAlign = 'left';
    g.fillStyle = INK;
    g.font = `32px ${MATH}`;
    g.fillText(bolum, SAFE.l, 196, CW);
    g.fillStyle = SOLUK;
    g.font = `12px ${MATH}`;
    g.fillText(bilgi, SAFE.l, 216, CW);

    this.view.draw(page, x);
    g.drawImage(this.graf, SAFE.l, GRAF.y, CW, GRAF.h);
    this.drawFormula(page.sp);
    this.track.requestFrame?.();
  }

  start(audio) {
    // hiç boyanmamış tuvalden alınan görüntü izi boş kalıyor (Chrome): önce kâğıt
    this.g.fillStyle = getComputedStyle(this.kagit).backgroundColor;
    this.g.fillRect(0, 0, this.canvas.width, this.canvas.height);
    // kare hızı 0: kareyi her çizimden sonra biz isteriz (arka plandaki sekmede kendiliğinden yakalanmıyor)
    const video = this.canvas.captureStream(0);
    this.track = video.getVideoTracks()[0];
    const stream = new MediaStream([...video.getVideoTracks(), ...audio.getAudioTracks()]);
    const mimeType = TYPES.find((t) => MediaRecorder.isTypeSupported(t)) || '';
    this.rec = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8e6, audioBitsPerSecond: 192e3 });
    this.parts = [];
    this.rec.ondataavailable = (e) => e.data.size && this.parts.push(e.data);
    this.rec.start(1000);
    this.ms = 0; // kayıtta geçen süre (duraklamalar hariç)
    this.from = performance.now();
  }

  // çal duraklayınca kayıt da durur, devam edince sürer
  pause(on) {
    if (!this.rec) return;
    if (on && this.rec.state === 'recording') {
      this.rec.pause();
      this.ms += performance.now() - this.from;
    } else if (!on && this.rec.state === 'paused') {
      this.rec.resume();
      this.from = performance.now();
    }
  }

  get seconds() {
    if (!this.rec) return 0;
    return (this.ms + (this.rec.state === 'recording' ? performance.now() - this.from : 0)) / 1000;
  }

  // kaydı bitirir, dosyayı indirir
  stop() {
    const rec = this.rec;
    if (!rec) return Promise.resolve();
    this.rec = null;
    return new Promise((done) => {
      rec.onstop = () => {
        const type = rec.mimeType || 'video/webm';
        const blob = new Blob(this.parts, { type });
        const d = new Date();
        const p = (n) => String(n).padStart(2, '0');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `sonsuz-acid-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.${type.includes('mp4') ? 'mp4' : 'webm'}`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 60e3);
        rec.stream.getTracks().forEach((t) => t.kind === 'video' && t.stop());
        done(blob);
      };
      if (rec.state === 'paused') rec.resume();
      rec.stop();
    });
  }
}
