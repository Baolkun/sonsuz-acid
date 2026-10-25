// Ses: formülü çalan işçiyi (AudioWorklet) kurar, sesi hafif bir sıkıştırıcıdan geçirip hoparlöre verir. Türlerin davul
// seslerini (samples/) arkada yükleyip tek kanala indirerek işçiye verir; gelene kadar davul sentezlenir.
import { SES_DOSYALARI } from './formula.js?v=cc1b4452';

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
    await ctx.audioWorklet.addModule(new URL('./ses-isleyici.js?v=a70e78a4', import.meta.url));
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
