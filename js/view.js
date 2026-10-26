// Grafik: TikTok'taki gibi buruşuk limon yeşili kâğıtta formülün satırları: üstte hat ve kick, ortada melodi, altta clap.
// Her sayfa x = −8'de başlar; kalemler (kırmızı noktalar) ilerledikçe eğriler çizilir, sayfa bitince kâğıt temizlenir.

import { kickY, melodyY, hatY, clapY, padY, perkY, breakY } from './formula.js?v=cbd8f3e6';
import { t } from './dil.js?v=c99e5e88';

const X_MIN = -10.5;
const X_MAX = 11.5;
const Y_MIN = -3.1;
const Y_MAX = 3.6;
const INK = '#13140f';
const RED = '#e2332a';
const STEP = 1 / 64; // eğri bu sıklıkta örneklenir (vuruş)

export class View {
  // size: sayfada olmayan tuval için sabit boyut { width, height, dpr } (video kaydı)
  // frame: { xMin, xMax, top }: görünen x aralığı ve üstte yazıya bırakılan pay
  constructor(canvas, size = null, frame = {}) {
    this.canvas = canvas;
    this.g = canvas.getContext('2d');
    this.size = size;
    this.frame = { xMin: X_MIN, xMax: X_MAX, top: 64, ...frame };
    this.resize();
    if (!size) new ResizeObserver(() => this.resize()).observe(canvas.parentElement);
  }

  resize() {
    const r = this.size || this.canvas.getBoundingClientRect();
    const dpr = this.size ? this.size.dpr : window.devicePixelRatio || 1;
    this.w = r.width;
    this.h = r.height;
    this.canvas.width = Math.round(r.width * dpr);
    this.canvas.height = Math.round(r.height * dpr);
    this.g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // page: çalan sayfa (yoksa boş kâğıt), x: kalemin konumu (−8 … 8)
  draw(page, x) {
    const { g, w, h } = this;
    g.clearRect(0, 0, w, h);
    const { xMin, xMax, top } = this.frame;
    const bottom = h - 6;
    const X = (v) => ((v - xMin) / (xMax - xMin)) * w;
    const Y = (v) => top + ((Y_MAX - v) / (Y_MAX - Y_MIN)) * (bottom - top);
    this.axes(X, Y);
    if (!page) {
      g.fillStyle = 'rgba(19, 20, 15, .55)';
      g.font = 'italic 17px "STIX Two Text", "Times New Roman", serif';
      g.textAlign = 'center';
      g.fillText(t('▶ Çal’a bas; formül buraya çizilecek'), X(0), Y(1.2));
      g.textAlign = 'left';
      return;
    }
    const end = Math.min(x, 8 - 1e-6);
    if (end < -8) return;
    const { sp } = page;
    // drop öncesi boşlukta (son yarım vuruş) satırlar tanımsız
    const pads = [0, 1, 2].map((i) => (s, v) => padY(s, v, i));
    const rows = [melodyY, kickY, breakY, hatY, perkY, clapY, ...pads].map((f) => (v) => (sp.gap && v >= 7.5 ? null : f(sp, v)));
    for (const row of rows) this.curve(row, end, X, Y);
    g.fillStyle = RED;
    for (const row of rows) {
      const y = row(end);
      if (y === null) continue;
      g.beginPath();
      g.arc(X(end), Y(y), 5, 0, Math.PI * 2);
      g.fill();
    }
  }

  // bir satırı x = −8'den kaleme kadar çizer; satır tanımsızken (kick susarken) kalem kalkar
  curve(row, end, X, Y) {
    const { g } = this;
    g.strokeStyle = INK;
    g.lineWidth = 1.7;
    g.lineJoin = 'round';
    g.lineCap = 'round';
    g.beginPath();
    let down = false;
    let prev = -8;
    for (let k = 0; ; k++) {
      const last = -8 + k * STEP >= end;
      const v = last ? end : -8 + k * STEP;
      // otuz ikilik sınırı geçildiyse ve eğri orada sıçrıyorsa kalemi kaldır, videodaki gibi kopuk kalsın
      const edge = Math.floor(v * 8) / 8;
      if (down && edge > prev) {
        const before = row(edge - 1e-7);
        const after = row(edge);
        if (before !== null) g.lineTo(X(edge), Y(before));
        if (after !== null && (before === null || Math.abs(after - before) > 1e-3)) g.moveTo(X(edge), Y(after));
      }
      const y = row(v);
      if (y === null) down = false;
      else if (!down) {
        g.moveTo(X(v), Y(y));
        down = true;
      } else g.lineTo(X(v), Y(y));
      prev = v;
      if (last) break;
    }
    g.stroke();
  }

  axes(X, Y) {
    const { g } = this;
    g.strokeStyle = INK;
    g.fillStyle = INK;
    g.lineWidth = 1.1;
    const y0 = Y(0);
    const x0 = X(0);
    const { xMin, xMax } = this.frame;
    const right = X(xMax - 0.6);
    const up = Y(Y_MAX - 0.2);
    line(g, X(xMin + 0.25), y0, right, y0);
    line(g, x0, Y(Y_MIN + 0.1), x0, up);
    // ok uçları
    g.beginPath();
    g.moveTo(right + 7, y0);
    g.lineTo(right - 1, y0 - 3.5);
    g.lineTo(right - 1, y0 + 3.5);
    g.moveTo(x0, up - 7);
    g.lineTo(x0 - 3.5, up + 1);
    g.lineTo(x0 + 3.5, up + 1);
    g.fill();
    g.font = 'italic 14px "STIX Two Text", "Times New Roman", serif';
    g.fillText('x', right + 2, y0 + 16);
    g.fillText('y', x0 + 7, up + 4);
  }
}

function line(g, x1, y1, x2, y2) {
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  g.stroke();
}
