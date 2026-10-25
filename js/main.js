// Sayfayı bağlar: besteci formül sayfaları yazar, ses işçisi o formülü çalar, grafik kalemle çizer.
// Ayarlar ve formüldeki sayılar anında işler: çalan sayfa yeni durumla yeniden yazılıp ses işçisine gider,
// sonraki sayfalar da oradan devam eder. "Kendi çeviriyor" açıkken acid ayarlarını eller çevirir (eller.js).
// Ayarlar tarayıcıda saklanır.

import { Besteci, PAGE, slideK } from './besteci.js';
import { Eller, KNOBS, RENKLER, TINILAR } from './eller.js';
import { renderFormula, MODE_NAMES, mod } from './formula.js';
import { Ses } from './ses.js';
import { View } from './view.js';
import { Kayit } from './kayit.js';
import { t, word, setLang, infoLine, pageName, lang } from './dil.js';

const LEAD = 6; // vuruş: sıradaki sayfa en geç bu kadar önceden yazılıp ses işçisine gider
const STORE = 'sonsuz-acid-ayarlar';
const $ = (id) => document.getElementById(id);
const num = (id) => Number($(id).value);
const besteci = new Besteci((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0);
const view = new View($('grafik'));
const eller = new Eller();
const kayit = new Kayit(document.querySelector('.kagit'));
let oto = true; // acid ayarlarını eller çeviriyor

let ctx = null;
let ses = null;
let playing = false;
let busy = false;
let bpm = num('tempo');
let frozenT = 0;
const clocks = []; // { time, beat, bpm }: bu andan itibaren vuruşlar bu hızla sayılır
const pages = [];
let shown = null;

function beatAt(t) {
  let c = clocks[0];
  for (const k of clocks) if (k.time <= t) c = k;
  return c.beat + ((t - c.time) * c.bpm) / 60;
}

function compose() {
  if (!playing) return;
  const now = beatAt(ctx.currentTime);
  while (!pages.length || pages[pages.length - 1].beat + PAGE < now + LEAD) {
    const page = besteci.next();
    pages.push(page);
    ses.page(page);
  }
  // ekran sesten biraz geride kalır; bitmiş sayfayı bir vuruş sonra at
  while (pages.length > 1 && pages[1].beat < now - 1) pages.shift();
}

// sekme arka plandayken de düzgün çalsın diye zamanlayıcı ayrı bir işçide
const ticker = new Worker(URL.createObjectURL(new Blob(
  ['let id; onmessage = (e) => { clearInterval(id); if (e.data) id = setInterval(() => postMessage(0), 25); };'],
  { type: 'text/javascript' },
)));
ticker.onmessage = () => {
  compose();
  automate();
  shoot();
};

const beatNow = () => (ctx && clocks.length ? beatAt(ctx.currentTime) : 0);
const knobValues = () => Object.fromEntries(Object.keys(KNOBS).map((id) => [id, num(id)]));

// eller sürgüleri çevirir: sayfanın bölümüne, sıradaki bölüme ve kick'in olup olmadığına göre
function automate() {
  if (!oto || !playing) return;
  const page = livePage();
  if (!page) return;
  const st = besteci.settings;
  const stage = st.stage ?? page.stage;
  // sıradaki bölüm; null: yolculuk bitiyor. Kilitliyken aynı sayfa döner
  let next = page.index < page.count ? st.stage ?? page.snap.plan[page.index] : null;
  if (besteci.locked) next = stage;
  const beat = beatAt(ctx.currentTime);
  const values = eller.step(beat, page, {
    stage, sp: page.sp, index: page.index, count: page.count, fresh: page.fresh && !besteci.locked, next, change: next !== stage, drop: page.drop && !besteci.locked,
    // bölümün kaçıncı sayfası (tekrarında başka hareket); kilitliyken sayfa döndükçe hareketler sırayla değişir
    variant: besteci.locked ? page.no : (page.snap.prev?.run ?? 1) - 1,
  });
  if (eller.plans.renk !== renk || eller.plans.tini !== tini) {
    renk = eller.plans.renk;
    tini = eller.plans.tini;
    showInfo(page);
  }
  let moved = false;
  for (const id in values) {
    const el = $(id);
    el.closest('.ayar').classList.toggle('oto', !eller.isHeld(id, beat));
    if (Number(el.value) === values[id]) continue;
    el.value = values[id];
    showValue(el);
    moved = true;
  }
  if (moved) ses.params(soundParams());
  // kayma formüle yazılır: çalan sayfa değişmez, sıradaki sayfa yeni kaymayla yazılır
  besteci.settings.slide = num('kayma');
}

function setOto(on) {
  oto = on;
  if (!on) {
    renk = null;
    tini = null;
    if (shown) showInfo(shown);
  }
  $('oto').setAttribute('aria-pressed', String(on));
  $('oto').textContent = t(on ? 'Kendi çeviriyor' : 'Kendi çevirsin');
  if (on) eller.start(knobValues());
  for (const id in KNOBS) $(id).closest('.ayar').classList.toggle('oto', on);
}

// şu an hoparlörden çıkan sesin zamanı
function audioNow() {
  const ts = ctx.getOutputTimestamp ? ctx.getOutputTimestamp() : null;
  if (ts && ts.contextTime > 0) {
    return Math.min(ctx.currentTime, ts.contextTime + (performance.now() - ts.performanceTime) / 1000);
  }
  return ctx.currentTime - (ctx.baseLatency || 0);
}

// ses işçisinin şu an yazdığı sayfa (hoparlörden biraz önde); daha başlamadıysa ilk sayfa
function livePage() {
  if (!ctx || !clocks.length) return null;
  const now = beatAt(ctx.currentTime);
  return pages.find((p) => now < p.beat + PAGE) || null;
}

const liveState = () => livePage()?.snap.s ?? besteci.s;

// çalan sayfayı değişiklikle yeniden yazar; sıradaki sayfalar atılır, besteci onları bu durumdan yeniden yazar
function liveEdit(fn, keys = []) {
  const cur = livePage();
  if (!cur) {
    fn(besteci.s);
    return;
  }
  fn(cur.snap.s);
  besteci.rewindTo(cur);
  besteci.dress(cur);
  cur.changed = keys;
  while (pages.length && pages[pages.length - 1] !== cur) pages.pop();
  ses.page(cur);
  compose();
  if (shown === cur) showPage(cur);
}

// yeni yolculuk sayfa sonunu beklemeden, çalan sayfanın yerine başlar
function newJourney() {
  const cur = livePage();
  if (!cur) {
    besteci.newWanted = true;
    return;
  }
  besteci.restartAt(cur);
  while (pages.length && pages[pages.length - 1].beat >= cur.beat) pages.pop();
  const page = besteci.next();
  pages.push(page);
  ses.page(page);
  compose();
}

// elle hamleler: dolgu çalan sayfanın son vuruşunda (geç kalındıysa sonraki sayfada); kırılma ve drop sonraki sayfada
// başlar. Düğme hamle gerçekleşene kadar kırmızı yanar
function flash(id, beats) {
  const el = $(id);
  el.setAttribute('aria-pressed', 'true');
  const until = beatNow() + beats;
  const off = () => (beatNow() >= until || !playing ? el.setAttribute('aria-pressed', 'false') : setTimeout(off, 100));
  off();
}
function dolgu() {
  const cur = livePage();
  if (!cur) return;
  const x = beatNow() - cur.beat - 8;
  if (x < 6.75) {
    liveEdit((s) => { s.roll = true; }, ['hat']);
    flash('dolguBtn', 8 - x);
  } else {
    while (pages.length && pages[pages.length - 1] !== cur) pages.pop();
    besteci.rewindTo(cur);
    besteci.wantRoll = true;
    compose();
    flash('dolguBtn', 8 - x + PAGE);
  }
}
function hamle(kind) {
  const cur = livePage();
  if (!cur || !besteci.jump(cur, kind)) return;
  while (pages.length && pages[pages.length - 1] !== cur) pages.pop();
  compose();
  flash(`${kind}Btn`, cur.beat + PAGE - beatNow());
}

let renk = null; // ellerin bu sayfaya verdiği renk
let tini = null; // ve acid sesinin tınısı
// bilgi satırına giden renk ve tını adları (Türkçe asılları; dil.js çevirir)
const looks = () => ({ bpm, renk: oto && renk ? RENKLER[renk].ad : null, tini: oto && tini ? TINILAR[tini].ad : null });
function showInfo(page) {
  // kâğıt da sayfanın rengini alır
  if (oto && renk) document.querySelector('.kagit').style.setProperty('--kagit', RENKLER[renk].kagit);
  else document.querySelector('.kagit').style.removeProperty('--kagit');
  $('bilgi').textContent = infoLine(page, looks());
}

function showPage(page) {
  shown = page;
  $('bolum').textContent = pageName(page.name);
  $('sayac').textContent = `${besteci.locked ? `${t('kilitli')} · ` : ''}${page.index}/${page.count}`;
  showInfo(page);
  const box = $('formul');
  // yeniden yazılınca elle oynatılan sayı seçili kalsın
  const focused = box.contains(document.activeElement) ? document.activeElement.dataset.e : null;
  box.innerHTML = renderFormula(page.sp, lang === 'en');
  for (const el of box.querySelectorAll('.p')) if (page.changed.includes(el.dataset.k) || page.changed.includes(el.dataset.e)) el.classList.add('degisti');
  if (focused) box.querySelector(`[data-e="${focused}"]`)?.focus({ preventScroll: true });
  $('oyna').hidden = false;
  fitFormula();
}

// formül kutusuna sığana kadar yazı küçülür; satırlar çoğalınca grafik ezilmez, sayfa kaymaz. Dar ekranda okunmayacak
// kadar küçülmez, kutu kaydırılır
function fitFormula() {
  const box = $('formul');
  const over = () => box.scrollHeight > box.clientHeight + 1 || box.scrollWidth > box.clientWidth + 1;
  box.style.fontSize = '';
  box.style.overflow = '';
  let size = parseFloat(getComputedStyle(box).fontSize);
  while (size > 11 && over()) {
    size -= 0.5;
    box.style.fontSize = `${size}px`;
  }
  if (over()) box.style.overflow = 'auto';
}
new ResizeObserver(() => { if (shown) fitFormula(); }).observe($('formul').parentElement);

function frame() {
  requestAnimationFrame(frame);
  if (!ctx || !clocks.length || !pages.length) {
    view.draw(null, 0);
    return;
  }
  const beat = beatAt(playing ? audioNow() : frozenT);
  const page = pages.find((p) => beat >= p.beat && beat < p.beat + PAGE) || pages[0];
  if (page !== shown) showPage(page);
  view.draw(page, beat - page.beat - 8);
}

// videonun karesi: ekran çiziminden (requestAnimationFrame) değil işçinin zamanlayıcısından, çünkü sekme arka plandayken
// tarayıcı ekran çizimini durdurur, ses ise sürer
let shot = 0;
function shoot() {
  if (!kayit.active || !pages.length) return;
  const now = performance.now();
  if (now - shot < 30) return; // saniyede ~30 kare
  shot = now;
  const beat = beatAt(audioNow());
  const page = pages.find((p) => beat >= p.beat && beat < p.beat + PAGE) || pages[0];
  if (page !== shown) showPage(page);
  kayit.lang = $('kayitDil').value;
  kayit.draw(page, beat - page.beat - 8, looks());
  const s = Math.floor(kayit.seconds);
  $('kayitBtn').textContent = `■ ${t('Bitir')} ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
requestAnimationFrame(frame);

async function toggle() {
  if (busy) return;
  busy = true;
  if (!ctx) {
    ctx = new AudioContext({ latencyHint: 'playback' });
    ses = await Ses.create(ctx);
    ses.setVolume(volume());
    ses.params(soundParams());
    const c = { time: ctx.currentTime + 0.25, beat: 0, bpm };
    clocks.push(c);
    ses.clock(c);
  }
  if (playing) {
    playing = false;
    frozenT = audioNow();
    ticker.postMessage(false);
    kayit.pause(true);
    await ctx.suspend();
  } else {
    await ctx.resume();
    playing = true;
    ticker.postMessage(true);
    compose();
    kayit.pause(false);
  }
  busy = false;
  $('cal').textContent = t(playing ? '❚❚ Durdur' : '▶ Çal');
}

const volume = () => (num('ses') / 100) ** 2;

// ses ayarları: sürgünün yerinden işçinin sayısına
function soundParams() {
  return {
    cut: num('filtre') * 0.015, // ±1,5 oktav
    res: 0.7 * (1 / 7) ** (num('rezonans') / 100), // 0,7 yumuşak … 0,1 keskin
    env: num('zarf') * 0.03, // 0 … 3 oktav
    decay: 0.025 * 20 ** (num('kuyruk') / 100), // 25 ms … 0,5 s
    accent: num('vurgu') / 100,
    wave: num('dalga') / 100,
    drive: num('doygunluk') / 100,
    echo: num('yanki') / 100,
    kick: num('kick') * 0.0036, // 0 … 0,36
    hat: num('hat') * 0.0036, // 0 … 0,36
    clap: num('clap') * 0.0048, // 0 … 0,48
    pump: num('pompa') / 100,
    room: num('oda') / 100,
    pad: num('pad') * 0.004, // 0 … 0,4
    hatLen: 2 ** ((num('hatboyu') - 50) / 40), // açık hat kuyruğunun çarpanı: 0,42 … 2,4
    perk: num('perk') * 0.004, // 0 … 0,4
  };
}

// sürgünün yanındaki değer
const ms = (s) => `${Math.round(s * 1000)} ms`;
const SHOW = {
  filtre: (v) => (v > 0 ? `+${v}` : String(v).replace('-', '−')),
  kuyruk: () => ms(soundParams().decay),
  // kaymanın neredeyse bittiği süre: e üssü 3'e varınca (%95)
  kayma: (v) => (v ? ms((3 * 60) / (bpm * 4) / slideK(v)) : t('yok')),
  dalga: (v) => (v === 0 ? t('testere') : v === 100 ? t('kare') : lang === 'en' ? `${v}% square` : `%${v} kare`),
  yanki: (v) => (v ? String(v) : t('yok')),
  ruh: (v) => word(MODE_NAMES[Math.round((v / 100) * 6)]),
  aralik: (v) => `mod ${v}`,
};
function showValue(input) {
  const out = input.parentElement.querySelector('output');
  if (out) out.textContent = (SHOW[input.id] || String)(Number(input.value));
}

// ---------- ayarlar ----------

$('cal').addEventListener('click', toggle);
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'SELECT') {
    e.preventDefault();
    toggle();
  }
  // kısayollar: F dolgu, K kırılma, D drop (Cmd/Ctrl'lü olanlar tarayıcının)
  if (e.metaKey || e.ctrlKey || e.altKey || e.repeat || !playing) return;
  const act = { KeyF: dolgu, KeyK: () => hamle('kirilma'), KeyD: () => hamle('drop') }[e.code];
  if (act) {
    e.preventDefault();
    act();
  }
});
$('dolguBtn').addEventListener('click', () => playing && dolgu());
$('kirilmaBtn').addEventListener('click', () => playing && hamle('kirilma'));
$('dropBtn').addEventListener('click', () => playing && hamle('drop'));
// sayfanın dili: sabit yazılar dil.js'te çevrilir, JavaScript'in yazdıkları burada yeniden yazılır
function applyLang() {
  setLang($('dil').value);
  $('cal').textContent = t(playing ? '❚❚ Durdur' : '▶ Çal');
  $('oto').textContent = t(oto ? 'Kendi çeviriyor' : 'Kendi çevirsin');
  if (!kayit.active) $('kayitBtn').textContent = t('● Video kaydet');
  for (const el of controls) if (el.type === 'range') showValue(el);
  if (shown) showPage(shown);
}
$('dil').addEventListener('change', () => {
  $('kayitDil').value = $('dil').value; // video da sayfanın dilinde; istenirse ayrıca değişir
  applyLang();
  save();
});
// video: çalmıyorsa çalmaya da başlar; ikinci basış kaydı bitirip dosyayı indirir
$('kayitBtn').addEventListener('click', async () => {
  if (busy) return;
  const btn = $('kayitBtn');
  if (kayit.active) {
    await kayit.stop();
    btn.setAttribute('aria-pressed', 'false');
    btn.textContent = t('● Video kaydet');
    return;
  }
  if (!playing) await toggle();
  kayit.start(ses.stream());
  btn.setAttribute('aria-pressed', 'true');
});
$('tempo').addEventListener('input', () => {
  bpm = num('tempo');
  if (shown) showInfo(shown);
  showValue($('kayma'));
  if (!ctx) return;
  // yeni hız, şimdiki vuruştan kopmadan biraz sonra devreye girer
  const time = ctx.currentTime + 0.05;
  const c = { time, beat: beatAt(time), bpm };
  clocks.push(c);
  ses.clock(c);
  while (clocks.length > 1 && clocks[1].time < ctx.currentTime - 3) clocks.shift();
});
$('ses').addEventListener('input', () => ses?.setVolume(volume()));
for (const id of ['filtre', 'rezonans', 'zarf', 'kuyruk', 'vurgu', 'dalga', 'doygunluk', 'yanki', 'kick', 'hat', 'clap', 'pompa', 'oda', 'pad', 'hatboyu', 'perk']) {
  $(id).addEventListener('input', () => ses?.params(soundParams()));
}
// eller çevirirken kullanıcı bir sürgüyü tutarsa sürgü onda kalır; bıraktıktan bir süre sonra eller sürdürür
const fingers = new Set();
for (const id in KNOBS) {
  const el = $(id);
  el.addEventListener('pointerdown', () => {
    fingers.add(id);
    if (oto) eller.touch(id, num(id), beatNow(), true);
  });
  el.addEventListener('input', () => {
    if (oto) eller.touch(id, num(id), beatNow(), fingers.has(id));
  });
}
const letGo = () => {
  for (const id of fingers) if (oto) eller.touch(id, num(id), beatNow(), false);
  fingers.clear();
};
document.addEventListener('pointerup', letGo);
document.addEventListener('pointercancel', letGo);
$('oto').addEventListener('click', () => {
  setOto(!oto);
  save();
});
$('kayma').addEventListener('input', () => {
  besteci.settings.slide = num('kayma');
  liveEdit(() => {}, ['slide']);
});

$('ruh').addEventListener('input', () => {
  besteci.settings.mood = num('ruh') / 100;
  const c = besteci.moodC();
  if (liveState().c !== c) liveEdit((s) => { s.c = c; }, ['c']);
});
$('aralik').addEventListener('input', () => {
  if (besteci.settings.F === num('aralik')) return;
  besteci.settings.F = num('aralik');
  liveEdit(() => {}, ['F']);
});
$('yogunluk').addEventListener('input', () => {
  besteci.settings.density = num('yogunluk') / 100;
  liveEdit(() => {});
});
$('degisim').addEventListener('input', () => { besteci.settings.change = num('degisim') / 100; });
$('ton').addEventListener('change', () => {
  const v = $('ton').value;
  besteci.settings.key = v === '' ? null : Number(v);
  if (v !== '') liveEdit((s) => { s.base = besteci.keyBase(Number(v)); }, ['base']);
});
// hat, clap ve ek vurmalı deseni: bölüme göre (boş), bir kalıp ya da yok
for (const id of ['hat', 'clap', 'perk']) {
  $(`${id}Desen`).addEventListener('change', () => {
    besteci.settings[id] = $(`${id}Desen`).value || null;
    liveEdit(() => {}, [id]);
  });
}
$('desen').addEventListener('change', () => {
  besteci.settings.kick = $('desen').value || null;
  liveEdit(() => {}, ['kick']);
});
// kalıp seçilince çalan sayfa o kalıpla yeniden yazılır, sonraki yolculuklar da onunla çalar; kendiliğinden: şimdiki
// kalıp sürer, yeni yolculukta besteci seçer
$('kalip').addEventListener('change', () => {
  const id = $('kalip').value || null;
  besteci.settings.kalip = id;
  if (id) liveEdit((s) => besteci.useKalip(s, id), ['M', 'n', 'p', 'acc', 'bend', 'slide']);
});
$('bolumSec').addEventListener('change', () => {
  const v = $('bolumSec').value;
  besteci.settings.stage = v === '' ? null : Number(v);
  liveEdit(() => {});
});
$('kilit').addEventListener('click', () => {
  besteci.locked = !besteci.locked;
  $('kilit').setAttribute('aria-pressed', String(besteci.locked));
  $('kilit').textContent = besteci.locked ? 'Kilitli' : 'Kilitle';
  liveEdit(() => {});
});
$('yeni').addEventListener('click', newJourney);
$('sifirla').addEventListener('click', () => {
  for (const el of controls) {
    if (el.id === 'dil' || el.id === 'kayitDil') continue; // dil sıfırlanmaz
    const def = el.tagName === 'SELECT' ? ([...el.options].find((o) => o.defaultSelected) || el.options[0]).value : el.defaultValue;
    if (el.value === def) continue;
    el.value = def;
    el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  }
  setOto(true); // eller de baştan: merkezler varsayılan değerler olur
  save();
});

// her değişiklikte değer yazısı tazelenir ve ayarlar saklanır
const controls = [...document.querySelectorAll('.kontroller input, .kontroller select')];
const panel = document.querySelector('.kontroller');
panel.addEventListener('input', (e) => {
  if (e.target.type === 'range') showValue(e.target);
  save();
});
panel.addEventListener('change', save);

// eller çevirirken sürgünün o anki yeri değil, kullanıcının yerleştirdiği yer saklanır
function save() {
  try {
    const v = Object.fromEntries(controls.map((el) => [el.id, oto && el.id in KNOBS ? String(eller.home[el.id] ?? el.value) : el.value]));
    v.oto = oto;
    localStorage.setItem(STORE, JSON.stringify(v));
  } catch {}
}

function load() {
  try {
    const v = JSON.parse(localStorage.getItem(STORE)) || {};
    for (const el of controls) if (typeof v[el.id] === 'string') el.value = v[el.id];
    if (typeof v.oto === 'boolean') oto = v.oto;
  } catch {}
}

// ---------- formüldeki sayılar: tekerlek, tık (⇧ ya da sağ tık geri), seçiliyken ↑ ↓ ----------

function nudge(path, dir) {
  liveEdit((s) => besteci.nudge(s, path, dir), [path]);
  // formülle aynı şeyi söyleyen ayarlar da kayar
  const st = besteci.settings;
  const s = liveState();
  if (path === 'c') {
    st.mood = s.c / 6;
    $('ruh').value = Math.round(st.mood * 100);
    showValue($('ruh'));
  }
  if (path === 'F') {
    $('aralik').value = st.F;
    showValue($('aralik'));
  }
  if (path === 'slide.k') {
    $('kayma').value = st.slide;
    showValue($('kayma'));
  }
  if (path === 'base' && st.key !== null) {
    st.key = mod(52 + s.base, 12);
    $('ton').value = st.key;
  }
  save();
}

const box = $('formul');
const editable = (e) => e.target.closest?.('.e');
let wheel = 0;
box.addEventListener('wheel', (e) => {
  const el = editable(e);
  if (!el) return;
  e.preventDefault();
  wheel += e.deltaMode ? e.deltaY * 40 : e.deltaY;
  if (Math.abs(wheel) < 30) return;
  nudge(el.dataset.e, wheel < 0 ? 1 : -1);
  wheel = 0;
}, { passive: false });
box.addEventListener('click', (e) => {
  const el = editable(e);
  if (el) nudge(el.dataset.e, e.shiftKey || e.altKey ? -1 : 1);
});
box.addEventListener('contextmenu', (e) => {
  const el = editable(e);
  if (!el) return;
  e.preventDefault();
  nudge(el.dataset.e, -1);
});
box.addEventListener('keydown', (e) => {
  const el = editable(e);
  const dir = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[e.key];
  if (!el || !dir) return;
  e.preventDefault();
  nudge(el.dataset.e, dir);
});

// ---------- başlangıç ----------

load();
// kayıtlı dil yoksa tarayıcının dili: Türkçe değilse İngilizce
const saved = (() => { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; } })();
if (!saved.dil) $('dil').value = (navigator.language || '').startsWith('tr') ? 'tr' : 'en';
if (!saved.kayitDil) $('kayitDil').value = $('dil').value;
applyLang();
for (const el of controls) if (el.type === 'range') showValue(el);
const st = besteci.settings;
st.mood = num('ruh') / 100;
st.F = num('aralik');
st.slide = num('kayma');
st.density = num('yogunluk') / 100;
st.change = num('degisim') / 100;
st.key = $('ton').value === '' ? null : num('ton');
st.kick = $('desen').value || null;
st.hat = $('hatDesen').value || null;
st.clap = $('clapDesen').value || null;
st.perk = $('perkDesen').value || null;
st.stage = $('bolumSec').value === '' ? null : num('bolumSec');
st.kalip = $('kalip').value || null;
besteci.s.c = besteci.moodC();
if (st.key !== null) besteci.s.base = besteci.keyBase(st.key);
bpm = num('tempo');
showValue($('kayma'));
setOto(oto);

// test için
window.__app = { besteci, pages, clocks, liveEdit, newJourney, eller, get oto() { return oto; }, get ctx() { return ctx; }, get ses() { return ses; } };
