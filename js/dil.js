// Dil: sayfa Türkçe ya da İngilizce. Kaynak yazılar Türkçe; İngilizceleri bu sözlükte. Sayfadaki sabit yazılar ve
// açıklamalar (title) yerinde çevrilir, JavaScript'in yazdıkları t() ile geçer. Video kaydının dili ayrı seçilir.

export const EN = {
  // grafik ve formül
  'hazır': 'ready',
  'x = vuruş · y = perde (oktav)': 'x = beat · y = pitch (octaves)',
  "Çal'a bas; çalan formül burada yazılacak. Müziğin tamamı bu tek formül.": 'Press Play; the formula being played will be written here. The whole track is this one formula.',
  'Altı noktalı sayılar oynar: üstünde tekerleği çevir ya da tıkla (⇧ ya da sağ tık geri alır), seçiliyken ↑ ↓. Değişiklik hemen duyulur; kalıcı olsun istersen Kilitle.':
    'Numbers with a dotted underline can be played: scroll the wheel over them or click (⇧ or right-click goes back), ↑ ↓ while selected. You hear the change right away; press Lock to keep it.',
  '▶ Çal’a bas; formül buraya çizilecek': '▶ Press Play; the formula will be drawn here',
  // ana düğmeler
  '▶ Çal': '▶ Play',
  '❚❚ Durdur': '❚❚ Stop',
  'Kilitle': 'Lock',
  'Çalan desen tekrar etsin; ayarlarla ve formüldeki sayılarla sen oynat': 'The playing pattern repeats; you play with the settings and the numbers in the formula',
  'Yeni melodi': 'New melody',
  'Hemen yeni bir melodi yolculuğu başlar': 'Starts a new melody journey right away',
  'Dolgu': 'Fill',
  'Bu sayfanın son vuruşunda hi-hat dolgusu (geç kaldıysan sonraki sayfada). Kısayol: F': 'A hi-hat fill on the last beat of this page (on the next page if you are late). Shortcut: F',
  'Kırılma': 'Break',
  'Sonraki sayfa kırılma: kick susar; ardından yükseliş ve drop. Kısayol: K': 'The next page is a break: the kick stops; then the build-up and the drop. Shortcut: K',
  'Sonraki sayfa yükseliş, ardından drop: her şey birden geri gelir. Kısayol: D': 'The next page is the build-up, then the drop: everything comes back at once. Shortcut: D',
  '● Video kaydet': '● Record video',
  'Grafiği, formülü ve sesi dikey (TikTok boyu) bir videoya kaydeder; bitirince dosya iner.':
    'Records the graph, the formula and the sound into a vertical (TikTok-size) video; the file downloads when you finish.',
  'Videodaki yazıların ve formülün dili': 'Language of the text and the formula in the video',
  'Türkçe video': 'Turkish video',
  'English video': 'English video',
  'Sayfanın dili': 'Page language',
  'Sarı yazılı ayarları müzik bölüme göre kendisi çevirir. Bir sürgüyü tutarsan bıraktıktan sonra da bir süre sende kalır; bıraktığın yer yeni merkezi olur.':
    'The music turns the settings written in yellow by itself, following the section. If you grab a slider it stays yours for a while after you let go; where you leave it becomes its new center.',
  'Kendi çeviriyor': 'Tweaking itself',
  'Kendi çevirsin': 'Let it tweak',
  'Ses': 'Volume',
  'Bütün ayarlar ilk hâline döner': 'All settings go back to the start',
  'Varsayılana dön': 'Reset',
  // acid sesi
  'Acid sesi': 'Acid sound',
  'Filtrenin kesimi: sola koyu, sağa parlak': 'The filter cutoff: dark to the left, bright to the right',
  'Filtre': 'Filter',
  "Kesimdeki tepe: sağa doğru daha keskin, daha 'vıyk'": "The peak at the cutoff: sharper and more 'squelchy' to the right",
  'Rezonans': 'Resonance',
  'Her yeni notada filtrenin ne kadar açıldığı': 'How far the filter opens on each new note',
  'Zarf': 'Envelope',
  'Açılan filtrenin ne kadar sürede kapandığı': 'How long the opened filter takes to close',
  'Kuyruk': 'Decay',
  "303'teki accent: vurgulu adımdaki nota daha yüksek, daha parlak ve keskin çalar; vurgular art arda gelince filtre giderek açılır":
    "The 303's accent: the note on an accented step plays louder, brighter and sharper; when accents follow each other the filter opens more and more",
  'Vurgu': 'Accent',
  // doku
  'Doku': 'Texture',
  'Testere (sert, vızıltılı) ile kare (yuvarlak, oyuk) arası': 'Between saw (hard, buzzy) and square (round, hollow)',
  'Dalga': 'Wave',
  "303'teki slide: işaretli adımda nota bir öncekinden kayarak gelir ve ona bağlanır; kalıpta ölçüde bir kez, çoğu zaman vurgulu notadan sonra. Sağa doğru daha uzun kayar; sıfırda kayma yok. İlk yolculukta (videodaki) yok":
    "The 303's slide: on the marked step the note glides in from the previous one and ties to it; once a bar in a pattern, usually after the accented note. Longer glide to the right; no slide at zero. None on the first journey (the original)",
  'Kayma': 'Slide',
  'Yumuşak kırpma: sesi kalınlaştırır, sertleştirir': 'Soft clipping: makes the sound thicker and harder',
  'Doygunluk': 'Drive',
  'Tempoya oturan yankı (noktalı sekizlik), yalnızca melodide': 'An echo locked to the tempo (dotted eighth), on the melody only',
  'Yankı': 'Echo',
  'Pompalama (sidechain): kick her vurduğunda melodi bir anlığına kısılıp geri gelir, müzik nefes alıyor gibi duyulur. Sıfırda yok':
    'Pumping (sidechain): every time the kick hits, the melody ducks for a moment and comes back, so the music seems to breathe. Off at zero',
  'Pompa': 'Pump',
  'Oda yankısı: clap\'e çok, hat\'e biraz, basa az gider; sesler bir mekânda çalıyor gibi duyulur. Sağa doğru oda büyür. Sıfırda kuru':
    'Room reverb: a lot on the clap, some on the hat, a little on the bass; the sounds seem to play in a space. The room grows to the right. Dry at zero',
  'Oda': 'Room',
  'Arkadaki akorlar (pad): akorun üç notası yumuşak bir sesle tutulur, üçüncü bölümde girer, kırılmada öne çıkar. Sıfırda yok':
    'Background chords (pad): the three notes of the chord are held with a soft sound; it enters in the third section and comes forward in the break. Off at zero',
  // melodi
  'Melodi': 'Melody',
  'Kendiliğinden: her yolculukta ton değişir': 'Automatic: the key changes every journey',
  'Ton': 'Key',
  'kendiliğinden': 'automatic',
  'Bilinen bir melodiyi nota nota çalar: melodinin ilk yarısı bir sayfa, ikinci yarısı öbür sayfa; drop hep melodinin başına düşer. Davul, akorlar, yükseliş ve ton yine bestecinin. Kendiliğinden: besteci kendi melodisini yazar':
    'Plays a well-known melody note by note: the first half of the melody on one page, the second half on the next; the drop always lands on the start of the melody. Drums, chords, the rise and the key still come from the composer. Automatic: the composer writes its own melody',
  'Şarkı': 'Song',
  'Dizinin rengi: lokryen en karanlık, lidyen en aydınlık': 'The color of the scale: Locrian is the darkest, Lydian the brightest',
  'Ruh hali': 'Mood',
  'Dolgu ve üst kat notalarının kaç basamak içinde gezindiği (formüldeki mod F)': 'How many scale steps the fill and upper-layer notes wander within (mod F in the formula)',
  'Aralık': 'Range',
  'Formülde kaç terimin açık olduğu: dolgu, hoket, blip, oktav': 'How many terms are switched on in the formula: fill, hocket, blip, octave',
  'Yoğunluk': 'Density',
  'Çeşitlemelerin ne sık geldiği: bölüm tekrar ederken (sekiz ölçülük cümlenin ikinci yarısında) desende bir şey değişir; çok açıkken bölüm değişirken de. Sıfırda hiç değişmez':
    'How often variations come: when a section repeats (in the second half of the eight-bar phrase) something in the pattern changes; when turned up high, also when the section changes. Never changes at zero',
  'Değişim': 'Variation',
  // ritim
  'Ritim': 'Rhythm',
  "Basın 16 adımlık ritim kalıbı: vurgulu notalar ölçüde hep aynı yere düşer, desen dört ölçü boyunca tekrar eder. Kendiliğinden: her yolculukta başka bir kalıp. Videodaki: 5'li desen ölçünün üstünde kayar (ilk yolculuk böyle)":
    'The 16-step rhythm pattern of the bass: accented notes always fall on the same place in the bar, and the pattern repeats over four bars. Automatic: a different pattern every journey. Original: a 5-step pattern that shifts over the bar (the first journey is like this)',
  'Kalıp': 'Pattern',
  'ara vuruş': 'offbeat',
  'vuruş öncesi': 'before the beat',
  'vuruş sonrası': 'after the beat',
  'üçlü (ölçü boyu)': 'threes (across the bar)',
  'videodaki (kayan)': 'original (shifting)',
  'Kick deseni': 'Kick pattern',
  'bölüme göre': 'by section',
  'dörtlük': 'four on the floor',
  'ölçü başı': 'bar start',
  'yarım, sonra dörtlük': 'half, then four',
  'yuvarlanan': 'rolling',
  'yok': 'off',
  "Hat'in kuyruğu: azaltınca kısa ve sıkı 'tık', artırınca uzun açık 'tsss'. Eller bunu nefeste ve yükselişte çevirir":
    "The hat's tail: turn down for a short tight 'tick', up for a long open 'tsss'. The auto-tweaking turns it in breaths and build-ups",
  'Hat boyu': 'Hat length',
  "Hi-hat'in kalıbı. Bölüme göre: ikinci bölümde ara vuruşta açık hat girer, yoğun bölümlerde on altılığa çıkar, cümle sonlarında son vuruşta dolgu yapar":
    'The hi-hat pattern. By section: an open hat on the offbeat enters in the second section, it goes up to sixteenths in busy sections, and fills on the last beat at phrase ends',
  'Hat deseni': 'Hat pattern',
  'ara vuruş (açık)': 'offbeat (open)',
  'sekizlik': 'eighths',
  'ara + ardı': 'offbeat + after',
  'dörtnala': 'gallop',
  'on altılık': 'sixteenths',
  'kapalı on altılık': 'closed sixteenths',
  "Clap'in kalıbı. Bölüme göre: üçüncü bölümde girer, kick susunca susar": 'The clap pattern. By section: it enters in the third section and stops when the kick stops',
  'Clap deseni': 'Clap pattern',
  '2 ve 4': '2 and 4',
  '2 ve 4 + ön vuruş': '2 and 4 + pickup',
  'yalnız 4': '4 only',
  'Perküsyon': 'Percussion',
  'Ek vurmalı: shaker, rimshot ya da tom. Bölüme göre: dördüncü bölümde rim ya da tom girer, kırılmada kick susunca shaker ritmi taşır':
    'Extra percussion: shaker, rimshot or tom. By section: rim or tom enters in the fourth section; in the break, when the kick stops, the shaker carries the rhythm',
  'Perküsyon deseni': 'Percussion pattern',
  'shaker (ara)': 'shaker (offbeat)',
  'rim seyrek': 'rim sparse',
  'tom (cümle sonu)': 'tom (phrase end)',
  'tom (yarım ölçü)': 'tom (half bar)',
  'Videodaki altı bölümden birinde kalabilirsin': 'You can stay in one of the six sections of the original video',
  'Bölüm': 'Section',
  'sırayla gezsin': 'go through in order',
  'bir · sade bas': 'one · plain bass',
  'iki · akor': 'two · chords',
  'üç · dolgu': 'three · fill',
  'dört · blip, oktav': 'four · blip, octave',
  'beş · hoket': 'five · hocket',
  'altı · yükseliş': 'six · build-up',
  'kırılma · kick yok': 'break · no kick',
  // JavaScript'in yazdıkları
  'kilitli': 'locked',
  'Bitir': 'Finish',
  'testere': 'saw',
  'kare': 'square',
  'yolculuk': 'journey',
  'renk': 'color',
  'tını': 'tone',
};

// bölüm adlarının parçaları, diziler, kalıplar, renkler ve tınılar
const WORDS = {
  bir: 'one', iki: 'two', üç: 'three', dört: 'four', beş: 'five', altı: 'six', kırılma: 'break', drop: 'drop', 'tema geri': 'theme returns',
  lokryen: 'Locrian', frigyen: 'Phrygian', eolyen: 'Aeolian', doryen: 'Dorian', miksolidyen: 'Mixolydian', iyonyen: 'Ionian', lidyen: 'Lydian',
  'ara vuruş': 'offbeat', 'vuruş öncesi': 'before the beat', 'vuruş sonrası': 'after the beat', üçlü: 'threes', videodaki: 'original',
  kuru: 'dry', derin: 'deep', parlak: 'bright', sıkı: 'tight', geniş: 'wide',
  kesik: 'clipped', karışık: 'mixed', kayan: 'sliding', oyuk: 'hollow', testere: 'saw', kare: 'square',
};

export let lang = 'tr';
export const t = (s, l = lang) => (l === 'en' ? EN[s] ?? WORDS[s] ?? s : s);
export const word = (s, l = lang) => (l === 'en' ? WORDS[s] ?? s : s);
export const pageName = (name, l = lang) => name.split(' · ').map((w) => word(w, l)).join(' · ');

// bilgi satırı: ton, dizi, tempo, yolculuk, kalıp, renk, tını
export function infoLine(page, { bpm, renk, tini }, l = lang) {
  const kalip = page.kalip ? ` · ${word(page.kalip, l)}` : '';
  const r = renk ? ` · ${t('renk', l)}: ${word(renk, l)}` : '';
  const q = tini ? ` · ${t('tını', l)}: ${word(tini, l)}` : '';
  return `${page.key} ${word(page.mode, l)} · ${bpm} BPM · ${t('yolculuk', l)} ${page.journey}${kalip}${r}${q}`;
}

// sayfadaki sabit yazılar: her metin düğümünün ve açıklamanın Türkçe aslı saklanır, dil değişince yeniden yazılır.
// Değeri JavaScript'in yazdığı yerler (değer yazıları, formül) atlanır; onları çağıran yeniden yazar.
const orig = new WeakMap();
const attrs = new WeakMap();
const SKIP = 'output, script, style, #sayac';
export function setLang(l, root = document.body) {
  lang = l;
  document.documentElement.lang = l;
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n; (n = walk.nextNode()); ) {
    if (!n.data.trim() || n.parentElement.closest(SKIP)) continue;
    if (!orig.has(n)) orig.set(n, n.data);
    const src = orig.get(n);
    const key = src.trim();
    n.data = l === 'en' && EN[key] ? src.replace(key, EN[key]) : src;
  }
  for (const el of root.querySelectorAll('[title]')) {
    if (!attrs.has(el)) attrs.set(el, el.title);
    const src = attrs.get(el);
    el.title = l === 'en' ? EN[src] ?? src : src;
  }
}
