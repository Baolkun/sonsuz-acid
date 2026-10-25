# Dosyaların yüklenme adreslerine içerikten türeyen bir sürüm etiketi (?v=…) yazar. GitHub Pages dosyaları 10 dakika
# önbellekte tuttuğu için yüklemeden hemen sonra tarayıcı yeni main.js'i eski formula.js ile birleştirebiliyordu (ses
# işçisi olmayan bir fonksiyonu arayınca Çal sessizce takılıyordu). Etiket bağımlılıkların etiketini de içerir: bir dosya
# değişince onu yükleyen bütün dosyaların etiketi değişir, eskisi önbellekte kalsa da kullanılmaz.
# Her commit'ten önce çalışır (.git/hooks/pre-commit); elle: python3 surum.py
import hashlib, os, re, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
JS = os.path.join(ROOT, 'js')
REF = re.compile(r"""(['"])(\./|js/)([\w-]+\.js)(?:\?v=[0-9a-f]*)?\1""")

def deps(text):
    return {m.group(3) for m in REF.finditer(text)}

def stamp(text, tags):
    return REF.sub(lambda m: f"{m.group(1)}{m.group(2)}{m.group(3)}?v={tags[m.group(3)]}{m.group(1)}", text)

def main():
    files = {f: open(os.path.join(JS, f), encoding='utf-8').read() for f in os.listdir(JS) if f.endswith('.js')}
    tags = {}
    def tag(f, seen=()):
        if f not in tags:
            if f in seen:
                sys.exit(f'döngülü yükleme: {f}')
            for d in deps(files[f]):
                tag(d, seen + (f,))
            files[f] = stamp(files[f], tags)
            tags[f] = hashlib.sha1(files[f].encode()).hexdigest()[:8]
        return tags[f]
    for f in sorted(files):
        tag(f)
    changed = []
    for f, text in files.items():
        p = os.path.join(JS, f)
        if open(p, encoding='utf-8').read() != text:
            open(p, 'w', encoding='utf-8').write(text)
            changed.append(f'js/{f}')
    p = os.path.join(ROOT, 'index.html')
    html = open(p, encoding='utf-8').read()
    new = stamp(html, tags)
    if new != html:
        open(p, 'w', encoding='utf-8').write(new)
        changed.append('index.html')
    print('\n'.join(changed))

main()
