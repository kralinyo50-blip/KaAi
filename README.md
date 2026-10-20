# KaAi v1.1 — Kaan Özkurt imzalı Jarvis Asistan

> **Kurucu: Kaan Özkurt** — Otomatik dinlemeli, derin erkek sesli, her cevabı “Efendim,” ile başlayan masaüstü AI.

![KaAi](assets/icon.png)

**Yenilik (v1.1):** Adı **KaAi** olarak birleştirildi, API anahtarı direkt linkle tek tıkta alınıyor, menüler özgünleştirildi, pencere kromu kaldırıldı, yeni modeller eklendi, animasyonlar sol menüyle senkron, harita basitleştirildi, otomatik konuşma algılama ve daha derin erkek sesi.

---

## ✨ Özellikler

- **Google Gemini** — 7 model: `2.5 Pro (en zeki)`, `2.5 Flash (yeni)`, `2.0 Flash (önerilen)`, `2.0 Lite`, `1.5 Pro`, `1.5 Flash`, `1.5 8B`
- **Otomatik dinleme** — Konuşunca algılar, 1.4sn sessizlikte otomatik gönderir. `◉ OTO` ile aç/kapat. Başlangıçta otomatik başlar.
- **Derin erkek sesi** — Hız 0.92 + Perde 0.82 + Tolga/Murat öncelikli. Ayarlardan test edilebilir.
- **Her cevap “Efendim,”** + **Kurucu Kaan Özkurt** sabit
- **Tam dosya erişimi** — gezgin, okuma/yazma/silme/uygulama açma/komut
- **Sol menü senkron** — CPU/RAM/Disk ve zaman widget'ları orb ile birlikte nabız atar, konuşurken titrer
- **Basit harita** — Leaflet kaldırıldı, SVG mini harita (Dolmabahçe vurgulu, Boğaz çizgili), bozulmaz
- **KaAi özgün tasarım** — Üstte pencere butonları yok (native OS kullanır), KaAi logosu + “Kaan Özkurt” alt başlık, cam efektler

---

## 📦 Kurulum — Windows

### Gereksinimler
- Node.js 18+ — https://nodejs.org
- Google Gemini API anahtarı — KaAi içinden **“API ANAHTARI AL →”** butonuna tıkla (https://aistudio.google.com/app/apikey)

### Adımlar
```bat
git clone https://github.com/kralinyo50-blip/KaAi.git
cd KaAi
npm install
npm start              # dene
# AYARLAR → API Anahtarı Al → yapıştır → KAYDET → konuş!
npm run build:win       # → dist/KaAi-Setup-1.1.0-x64.exe
```

**Python alternatif:**
```bat
pip install -r requirements.txt
python app.py
build_python_exe.bat   # → dist/KaAi/KaAi.exe
```

---

## 🔑 API Anahtarı — Tek Tık

KaAi → **AYARLAR** → üstte **API ANAHTARI AL →** butonu → Google AI Studio açılır → *Create API key* → kopyala → KaAi’ye yapıştır → **KAYDET**. Ücretsiz.

---

## 🎙️ Sesli Kullanım (Otomatik)

- **Otomatik mod açıkken** sadece konuş: “Merhaba KaAi”, “Kurucun kim?”, “Beş dakikalık zamanlayıcı kur”, “Dosyalarımı göster”, “Notepad aç”
- KaAi 1.4sn sessizlikte cevaba geçer, konuşması bitince yeniden dinlemeye döner.
- Mikrofon butonuna basarak manuel de tetikleyebilirsin. `Alt+Space` kısayolu da var.

---

## 🧠 Modeller

| Model | Açıklama |
|---|---|
| **Gemini 2.5 Pro Preview** | En zeki, muhakeme/kodlama |
| **Gemini 2.5 Flash** | Yeni nesil, dengeli |
| **Gemini 2.0 Flash** | Önerilen, hızlı |
| **Gemini 2.0 Flash Lite** | Ekonomik |
| **Gemini 1.5 Pro** | 2M token uzun bağlam |
| **Gemini 1.5 Flash / 8B** | Hız odaklı |

Seçim hem **AYARLAR** hem **◈ MODELLER** modalından.

---

## 🎨 Arayüz (Özgünleştirildi)

- **Üst:** KaAi + Kaan Özkurt logosu, HAZIR/DİNLİYOR/KONUŞUYOR badge, mini orb, OTO göstergesi — *pencere kapat/min/max butonları yok, işletim sistemi çerçevesi kullanılır*
- **Sol:** Zaman (AM/PM), Sistem (CPU halka + RAM/Disk bar + SES durumu, CANLI nabız), Zamanlayıcı (halka pulse) — orb konuşurken hepsi senkron titrer
- **Orta:** 5 halkalı orb + çift glow + konuşma barları + dalga + KaAi etiketi
- **Sağ:** Hava kartı, takvim, anımsatıcılar, **basit SVG harita** (Boğaz, ilçeler, Dolmabahçe pin, koordinat)
- **Alt:** OTO aç/kapat, dosya gezgini, giriş, mikrofon (halka animasyonlu), v1.1 etiketi

---

## 📁 Proje Yapısı

```
KaAi/
├── main.js, preload.js, package.json  # Electron 1.1.0
├── src/index.html, styles/main.css, js/app.js, js/orb.js, js/bridge.js
├── app.py, requirements.txt
├── assets/icon.png, icon.ico
└── build.bat / build.sh / build_python_exe.bat
```

---

## 📜 Lisans

MIT © 2025 Kaan Özkurt — v1.1

**İyi kullanımlar, efendim!**
