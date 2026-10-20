# KaAi — ALPAI | Jarvis Benzeri Masaüstü AI Asistanı

> **Kurucu: Kaan Özkurt** — Her soruda “Efendim,” ile başlayan, Google Gemini destekli, sesli masaüstü asistan.

![KaAi](assets/icon.png)

Örnek arayüz ekran görüntüsündeki tasarıma sadık kalınarak geliştirilmiştir: ortada nefes alan cyan orb, solda zaman/sistem/zamanlayıcı, sağda hava durumu/takvim/ harita, altta sesli sohbet barı.

---

## ✨ Özellikler

- **Google Gemini API ile çalışır** — `gemini-2.0-flash` varsayılan, model seçilebilir
- **Sadece sesli sohbet** — Mikrofon (Alt+Space) + Türkçe STT + Erkek TTS sesi
- **Her cevap “Efendim,” ile başlar**
- **Kurucu sorulduğunda:** “Kurucum Kaan Özkurt'tur.”
- **Bilgisayarına tam erişim:**
  - Dosya gezgini (listele, oku, yaz, oluştur, sil, yeniden adlandır, aç)
  - Uygulama açma, komut çalıştırma
  - Sistem bilgileri (CPU, RAM, Disk, Pil)
- **Zaman & Zamanlayıcı & Kronometre** — Sesli “5 dakikalık zamanlayıcı kur” komutu
- **Hava Durumu, Takvim, Anımsatıcılar, Harita (Leaflet + OSM)**
- **Güzel Jarvis UI** — Siyah + cyan + turuncu, grid arkaplan, glow efektleri
- **EXE olarak çalışır** — Electron + Python iki ayrı build seçeneği

---

## 📦 Kurulum — Windows (Önerilen: Electron)

### Gereksinimler
- Node.js 18+ — https://nodejs.org
- Google Gemini API anahtarı — https://aistudio.google.com/app/apikey (ücretsiz)

### Adımlar
```bat
# 1) Projeyi indir
git clone https://github.com/kralinyo50-blip/KaAi.git
cd KaAi

# 2) Bağımlılıkları yükle
npm install

# 3) Çalıştır (geliştirme)
npm start
# veya
npm run dev   // DevTools açık

# 4) EXE oluştur
npm run build:win
# Çıktı: dist/KaAi-Setup-1.0.0-x64.exe  ve  KaAi-Portable.exe

# Çift tıkla kur → API anahtarını AYARLAR'dan gir → Konuş!
```

> API anahtarı yalnızca cihazınızda saklanır (`electron-store`), dışarı gönderilmez.

---

## 🐍 Alternatif: Python Sürümü (PyInstaller)

Python yüklü Windows'lar için, tek dosya EXE:

```bat
pip install -r requirements.txt
python app.py              # Çalıştır

# EXE yap:
build_python_exe.bat       # veya manuel:
pyinstaller --name KaAi --windowed --icon=assets/icon.ico --add-data "src;src" --add-data "assets;assets" app.py
# Çıktı: dist/KaAi/KaAi.exe
```

Mac/Linux:
```bash
pip install -r requirements.txt --break-system-packages
python3 app.py
```

---

## 🔑 API Anahtarı Nasıl Alınır?

1. https://aistudio.google.com/app/apikey adresine git
2. Google hesabınla giriş yap
3. **Create API key** → Kopyala
4. KaAi'yi aç → sağ üst **AYARLAR** → yapıştır → **KAYDET**

Model seçenekleri: `gemini-2.0-flash` (önerilen), `1.5-flash`, `1.5-pro`

---

## 🎙️ Sesli Kullanım

- **Mikrofona bas** (🎤) veya **Alt+Space**
- Örnek komutlar:
  - “Merhaba, nasılsın?”
  - “Kurucun kim?”
  - “Kurucun kim sorusuna ne cevap veriyorsun?” → *Efendim, kurucum Kaan Özkurt'tur.*
  - “On dakikalık zamanlayıcı kur”
  - “Dosyalarımı göster”
  - “Notepad aç”
  - “Sistem durumum ne?”
- Her cevap **erkek sesi** ile okunur. Ayarlardan hız değiştirilebilir.

> Tarayıcı STT/TTS kullanır. Windows Türkçe ses paketi yüklüyse (Tolga) daha doğal erkek sesi.

---

## 📁 Dosya Erişimi

- Alttaki 📎 → **Dosya Gezgini** açılır
- Çift tık klasöre gir, dosyayı aç
- Sağ panel: Yeni dosya, sil, aç
- Sesli: “Dosyalarımı göster” de

Güvenlik: Uygulama, kullanıcının sahip olduğu dosyalara tam erişir (Electron `fs` + Python `pathlib`). İzin dışı işlem yapmaz.

---

## 🎨 Arayüz

- **Sol:** Saat (02:49), tarih (SALI · 20 EKİM), CPU/RAM/Disk/Pil, Zamanlayıcı (1/5/10/25 DK + Kronometre)
- **Orta:** Nefes alan orb + konuşma dalgası (canvas), dinleme/konuşma animasyonu
- **Sağ:** Hava (Dolmabahçe 17° bulutlu), Takvim, Anımsatıcılar, Harita (41.033° 28.983°)
- **Alt:** KONUŞ YA DA YAZ + mikrofon + gönder

---

## 🛠️ Proje Yapısı

```
KaAi/
├── main.js              # Electron ana süreç (IPC, fs, Gemini proxy)
├── preload.js           # Güvenli köprü
├── package.json         # Electron + builder config
├── src/
│   ├── index.html       # Ana arayüz
│   ├── styles/main.css  # Jarvis teması
│   └── js/
│       ├── app.js       # Uygulama mantığı, chat, timer, dosya gezgini
│       ├── orb.js       # Canvas orb animasyonu
│       └── bridge.js    # Python/Electron uyum katmanı
├── app.py               # Python + pywebview alternatif
├── requirements.txt
├── assets/
│   ├── icon.png
│   └── icon.ico
├── build.bat / build.sh
├── build_python_exe.bat
└── README.md
```

---

## ❓ Sık Sorulanlar

**Q: Kurucusu kim?**
A: *Efendim, kurucum Kaan Özkurt'tur.* — Bu cevap hem yerel kural hem de Gemini sistem promptunda sabitlenmiştir.

**Q: Her cevap neden “Efendim,” ile başlıyor?**
A: Jarvis tarzı saygı için. Ayarlardan kapatılabilir.

**Q: İnternetsiz çalışır mı?**
A: Arayüz ve dosya işlemleri evet; AI cevapları için internet + API anahtarı gerekir.

**Q: EXE boyutu ne kadar?**
A: Electron ~80-120 MB (kurulum), Python ~40-60 MB.

**Q: Kamerayı açıyor mu?**
A: Hayır. Varsayılan “KAMERA KAPALI”. Gelecekte eklenebilir.

---

## 📜 Lisans

MIT — © 2025 Kaan Özkurt

---

## 🙏 Katkı

PR ve issue'lar açıktır. `arena/02fb1b4d-kaai` branch'i üzerinde geliştirildi.

**İyi kullanımlar, efendim!** 🎤✨
