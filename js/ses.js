// Ses: formülü çalan işçiyi (AudioWorklet) kurar, sesi hafif bir sıkıştırıcıdan geçirip hoparlöre verir. Türlerin davul
// seslerini (samples/) arkada yükleyip tek kanala indirerek işçiye verir; gelene kadar davul sentezlenir.
import { SES_DOSYALARI } from './formula.js?v=2f6cff6a';

function squeeze(ctx) {
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -12;
  comp.knee.value = 8;
  comp.ratio.value = 3;
  comp.attack.value = 0.004;
  comp.release.value = 0.15;
  return comp;
}

export class Ses {
  static async create(ctx) {
    await ctx.audioWorklet.addModule(new URL('./ses-isleyici.js?v=2ee8009f', import.meta.url));
    return new Ses(ctx);
  }

  constructor(ctx) {
    this.ctx = ctx;
    this.node = new AudioWorkletNode(ctx, 'formul-ses', { numberOfInputs: 0, outputChannelCount: [1] });
    this.out = ctx.createGain();
    this.out.gain.value = 0;
    this.node.connect(this.out).connect(squeeze(ctx)).connect(ctx.destination);
    for (const name of SES_DOSYALARI()) this.load(name);
  }

  async load(name) {
    try {
      const res = await fetch(new URL(`../samples/${name}.wav`, import.meta.url));
      const buf = await this.ctx.decodeAudioData(await res.arrayBuffer());
      const data = new Float32Array(buf.length);
      for (let c = 0; c < buf.numberOfChannels; c++) {
        const ch = buf.getChannelData(c);
        for (let i = 0; i < data.length; i++) data[i] += ch[i] / buf.numberOfChannels;
      }
      // tepe 1'e çekilir: türler arasında düzeyi kazançlar belirler
      let pk = 0;
      for (const v of data) pk = Math.max(pk, Math.abs(v));
      if (pk) for (let i = 0; i < data.length; i++) data[i] /= pk;
      this.node.port.postMessage({ type: 'sample', name, data }, [data.buffer]);
    } catch {
      // yüklenemeyen ses: o davul sentezle çalmaya devam eder
    }
  }

  // video kaydı için ayrı kol: ses sürgüsünden bağımsız, varsayılan ses düzeyinde
  stream() {
    if (!this.rec) {
      const g = this.ctx.createGain();
      g.gain.value = 0.75 ** 2;
      this.rec = this.ctx.createMediaStreamDestination();
      this.node.connect(g).connect(squeeze(this.ctx)).connect(this.rec);
    }
    return this.rec.stream;
  }

  // WAV kaydı: video kaydıyla aynı kol (ses sürgüsünden bağımsız)
  wavStart() {
    const g = this.ctx.createGain();
    g.gain.value = 0.75 ** 2;
    const k = new AudioWorkletNode(this.ctx, 'kaydedici');
    const parts = [];
    const done = new Promise((ok) => {
      k.port.onmessage = ({ data }) => (data ? parts.push(data) : ok());
    });
    this.node.connect(g).connect(squeeze(this.ctx)).connect(k).connect(this.ctx.destination);
    this.wav = { g, k, parts, done, t0: this.ctx.currentTime };
  }

  // kaydı bitirir; 16 bit tek kanal WAV
  async wavStop() {
    const { g, k, parts, done } = this.wav;
    this.wav = null;
    k.port.postMessage('dur');
    await done;
    this.node.disconnect(g);
    k.disconnect();
    const n = parts.reduce((a, p) => a + p.length, 0);
    const sr = this.ctx.sampleRate;
    const v = new DataView(new ArrayBuffer(44 + 2 * n));
    const str = (o, t) => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    str(0, 'RIFF');
    v.setUint32(4, 36 + 2 * n, true);
    str(8, 'WAVEfmt ');
    v.setUint32(16, 16, true);
    v.setUint16(20, 1, true);
    v.setUint16(22, 1, true);
    v.setUint32(24, sr, true);
    v.setUint32(28, 2 * sr, true);
    v.setUint16(32, 2, true);
    v.setUint16(34, 16, true);
    str(36, 'data');
    v.setUint32(40, 2 * n, true);
    let o = 44;
    for (const p of parts) {
      for (const x of p) {
        v.setInt16(o, Math.round(32767 * Math.max(-1, Math.min(1, x))), true);
        o += 2;
      }
    }
    return new Blob([v], { type: 'audio/wav' });
  }

  get wavSeconds() {
    return this.wav ? this.ctx.currentTime - this.wav.t0 : 0;
  }

  clock(c) {
    this.node.port.postMessage({ type: 'clock', ...c });
  }

  // aynı vuruştan başlayan bir sayfa yeniden gönderilirse işçi eskisini (ve ardındakileri) atar
  page(p) {
    this.node.port.postMessage({ type: 'page', beat: p.beat, sp: p.sp, b0: p.b0, b1: p.b1 });
  }

  // filtre, rezonans, zarf, kuyruk, kayma, doygunluk, kick: anında işler
  params(values) {
    this.node.port.postMessage({ type: 'params', values });
  }

  setVolume(v) {
    this.out.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02);
  }
}
