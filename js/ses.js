// Ses: formülü çalan işçiyi (AudioWorklet) kurar, sesi hafif bir sıkıştırıcıdan geçirip hoparlöre verir.

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
    await ctx.audioWorklet.addModule(new URL('./ses-isleyici.js?v=0213a6eb', import.meta.url));
    return new Ses(ctx);
  }

  constructor(ctx) {
    this.ctx = ctx;
    this.node = new AudioWorkletNode(ctx, 'formul-ses', { numberOfInputs: 0, outputChannelCount: [1] });
    this.out = ctx.createGain();
    this.out.gain.value = 0;
    this.node.connect(this.out).connect(squeeze(ctx)).connect(ctx.destination);
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
