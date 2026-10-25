// Video kaydı: kâğıdı (rengi ve kırışıklarıyla), bölümün adını ve grafiği TikTok'a uygun dikey bir tuvale (1080×1920)
// çizer, sesle birlikte MediaRecorder'a verir. Bitince dosya indirilir.

import { View } from './view.js';

const W = 540; // mantıksal boyut; piksel çarpanı S ile 1080×1920
const H = 960;
const S = 2;
const GRAF = { y: 210, h: 620 };
const INK = '#13140f';
const SOLUK = 'rgba(19, 20, 15, .6)';
const MATH = '"STIX Two Math", "STIX Two Text", "Latin Modern Math", "Times New Roman", serif';
// önce mp4 (TikTok ve telefonlar doğrudan açar), olmazsa webm
const TYPES = ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'];

export class Kayit {
  constructor(kagit) {
    this.kagit = kagit;
    this.canvas = document.createElement('canvas');
    this.canvas.width = W * S;
    this.canvas.height = H * S;
    this.g = this.canvas.getContext('2d');
    const graf = document.createElement('canvas');
    this.graf = graf;
    this.view = new View(graf, { width: W, height: GRAF.h, dpr: S });
    // kırışık dokusu sayfanın kendi CSS'inden
    const m = getComputedStyle(kagit).backgroundImage.match(/url\("(data:image\/svg\+xml.+?)"\)/);
    this.doku = new Image();
    if (m) this.doku.src = m[1].replace(/\\"/g, '"');
    this.rec = null;
  }

  get active() {
    return !!this.rec;
  }

  // her karede: çalan sayfa, kalemin konumu, üstteki iki yazı
  draw(page, x, bolum, bilgi) {
    if (!this.rec) return;
    const { g } = this;
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

    g.fillStyle = INK;
    g.textAlign = 'left';
    g.font = `40px ${MATH}`;
    g.fillText(bolum, 30, 130, W - 60);
    g.fillStyle = SOLUK;
    g.font = `16px ${MATH}`;
    g.fillText(bilgi, 30, 165, W - 60);

    this.view.draw(page, x);
    g.drawImage(this.graf, 0, GRAF.y, W, GRAF.h);

    g.fillStyle = SOLUK;
    g.textAlign = 'center';
    g.font = `italic 18px ${MATH}`;
    g.fillText('müziğin tamamı tek bir formül', W / 2, H - 120);
    g.font = `14px ${MATH}`;
    g.fillText('baolkun.github.io/sonsuz-acid', W / 2, H - 92);
  }

  start(audio) {
    const video = this.canvas.captureStream(30);
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
