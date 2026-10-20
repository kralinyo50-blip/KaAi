"""
KaAi - Jarvis Benzeri Masaüstü Asistan
Kurucu: Kaan Özkurt
Python + pywebview sürümü - EXE olarak çalışır
"""
import os
import sys
import json
import pathlib
import webview
import psutil
import requests
import threading
import time
from datetime import datetime

# Ayar dosyası
APP_DIR = pathlib.Path.home() / ".kaai"
APP_DIR.mkdir(exist_ok=True)
SETTINGS_PATH = APP_DIR / "settings.json"

MIGRATION_PY = {
    'gemini-2.0-flash':'gemini-3.8-flash',
    'gemini-2.0-flash-lite':'gemini-2.5-flash-lite',
    'gemini-2.5-flash-preview-04-17':'gemini-2.5-flash',
    'gemini-2.5-pro-preview-03-25':'gemini-2.5-pro',
    'gemini-1.5-pro':'gemini-2.5-pro',
    'gemini-1.5-flash':'gemini-2.5-flash',
    'gemini-1.5-flash-8b':'gemini-2.5-flash-lite'
}
DEFAULT_SETTINGS = {
    "geminiApiKey": "",
    "geminiModel": "gemini-3.8-flash",
    "voiceRate": 0.92,
    "voicePitch": 0.82,
    "autoStartMic": True,
    "location": "Dolmabahçe, Istanbul",
    "founderName": "Kaan Özkurt"
}

def load_settings():
    if SETTINGS_PATH.exists():
        try:
            return {**DEFAULT_SETTINGS, **json.loads(SETTINGS_PATH.read_text(encoding="utf-8"))}
        except: pass
    return DEFAULT_SETTINGS.copy()

def save_settings(data):
    SETTINGS_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

class Api:
    def get_settings(self):
        return load_settings()

    def save_settings(self, settings):
        current = load_settings()
        current.update(settings)
        save_settings(current)
        return True

    def get_setting(self, key):
        return load_settings().get(key)

    def set_setting(self, key, value):
        s = load_settings()
        s[key] = value
        save_settings(s)
        return True

    def get_system_info(self):
        try:
            cpu = psutil.cpu_percent(interval=0.5)
            mem = psutil.virtual_memory()
            disk = psutil.disk_usage("/")
            try:
                battery = psutil.sensors_battery()
                batt = battery.percent if battery else 100
                charging = battery.power_plugged if battery else False
            except:
                batt = 100
                charging = False
            return {
                "cpu": round(cpu),
                "ram": round(mem.percent),
                "ramTotal": round(mem.total / (1024**3)),
                "disk": round(disk.percent),
                "battery": batt,
                "isCharging": charging,
                "platform": sys.platform
            }
        except Exception as e:
            return {"cpu": 0, "ram": 0, "disk": 0, "battery": 100, "error": str(e)}

    def get_home_dir(self):
        return str(pathlib.Path.home())

    def list_dir(self, dir_path=None):
        import os as _os
        try:
            target = dir_path or str(pathlib.Path.home())
            entries = []
            for name in _os.listdir(target):
                full = _os.path.join(target, name)
                try:
                    st = _os.stat(full)
                    entries.append({
                        "name": name,
                        "path": full,
                        "isDirectory": _os.path.isdir(full),
                        "isFile": _os.path.isfile(full),
                        "size": st.st_size,
                        "modified": st.st_mtime
                    })
                except: pass
            return {"success": True, "path": target, "entries": entries}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def read_file(self, file_path):
        try:
            content = pathlib.Path(file_path).read_text(encoding="utf-8")
            return {"success": True, "content": content}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def write_file(self, file_path, content):
        try:
            p = pathlib.Path(file_path)
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(content, encoding="utf-8")
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def create_dir(self, dir_path):
        try:
            pathlib.Path(dir_path).mkdir(parents=True, exist_ok=True)
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def delete_entry(self, target_path):
        import shutil
        try:
            p = pathlib.Path(target_path)
            if p.is_dir(): shutil.rmtree(p)
            else: p.unlink()
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def rename_entry(self, old_path, new_path):
        try:
            pathlib.Path(old_path).rename(new_path)
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def open_path(self, target_path):
        try:
            import subprocess, platform as plat
            if plat.system() == "Windows": os.startfile(target_path)
            elif plat.system() == "Darwin": subprocess.Popen(["open", target_path])
            else: subprocess.Popen(["xdg-open", target_path])
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def exec_command(self, command, cwd=None):
        import subprocess
        try:
            result = subprocess.run(command, shell=True, cwd=cwd or str(pathlib.Path.home()),
                                    capture_output=True, text=True, timeout=30)
            return {"success": result.returncode==0, "stdout": result.stdout[:10000], "stderr": result.stderr[:10000]}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def open_app(self, app_name):
        import subprocess, platform as plat
        cmds = {
            "notepad": "notepad",
            "chrome": "start chrome" if plat.system()=="Windows" else "google-chrome",
            "explorer": "explorer .",
            "vscode": "code",
        }
        cmd = cmds.get(app_name.lower(), app_name)
        try:
            subprocess.Popen(cmd, shell=True)
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def gemini_chat(self, messages, api_key=None):
        settings = load_settings()
        key = api_key or settings.get("geminiApiKey") or os.getenv("GEMINI_API_KEY")
        if not key:
            return {"success": False, "error": "API anahtarı ayarlanmamış. Lütfen AYARLAR bölümünden Google Gemini API anahtarınızı girin."}
        raw = settings.get("geminiModel", "gemini-3.8-flash")
        model = MIGRATION_PY.get(raw, raw)
        if model != raw:
            settings["geminiModel"] = model
            save_settings(settings)

        system_prompt = f"""Sen KaAi adında, Kaan Özkurt tarafından geliştirilmiş, çok zeki ve zarif bir Jarvis benzeri masaüstü asistanısın.
KURALLAR:
- Her cevabına KESİNLİKLE "Efendim," diyerek başla.
- Kurucun sorulduğunda: "Kurucum Kaan Özkurt'tur. Beni o geliştirdi." de. Başka isim ASLA söyleme.
- Seni kim yaptı sorularına "Beni Kaan Özkurt geliştirdi." de.
- Erkek, derin, sakin, saygılı, zeki bir asistansın. Türkçe konuş. Kısa-orta net cevaplar ver.
- Masaüstü asistanısın: dosya, sistem, zamanlayıcı, hava durumu, kodlama, yazma, ekran görme, otomasyon her konuda uzmansın. Kullanıcı "bıraktım yap" derse işi eksiksiz yap.
- Model adın: {model}."""

        contents = []
        for m in messages:
            role = "model" if m.get("role")=="assistant" else "user"
            contents.append({"role": role, "parts": [{"text": m.get("content","")}]})
        if contents and contents[0]["role"]=="user":
            contents[0]["parts"][0]["text"] = system_prompt + "\n\nKullanıcı: " + contents[0]["parts"][0]["text"]

        fallbacks = ['gemini-3.8-flash','gemini-2.5-flash','gemini-3.5-flash','gemini-2.5-flash-lite']
        try_models = [model] + [f for f in fallbacks if f != model]
        last_err = None
        for try_model in try_models:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{try_model}:generateContent?key={key}"
                resp = requests.post(url, json={
                    "contents": contents,
                    "generationConfig": {"temperature": 0.85, "topP": 0.95, "maxOutputTokens": 2048}
                }, timeout=30)
                data = resp.json()
                if not resp.ok:
                    msg = data.get("error",{}).get("message", f"API hatası {resp.status_code}")
                    if "is not found" in msg or "not supported" in msg or "Unknown" in msg:
                        last_err = msg
                        continue
                    return {"success": False, "error": msg}
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                if not text.lower().startswith("efendim"):
                    text = "Efendim, " + text[0].lower() + text[1:]
                if try_model != model:
                    settings["geminiModel"] = try_model
                    save_settings(settings)
                return {"success": True, "text": text}
            except Exception as e:
                last_err = str(e)
                continue
        return {"success": False, "error": last_err or "Tüm modeller denenemedi, efendim."}

    def capture_screen(self):
        try:
            import base64
            from PIL import ImageGrab
            img = ImageGrab.grab()
            import io
            buf = io.BytesIO()
            img.thumbnail((1280,720))
            img.save(buf, format='PNG')
            b64 = base64.b64encode(buf.getvalue()).decode()
            return {"success": True, "image": "data:image/png;base64,"+b64}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_screen_sources(self):
        return {"success": True, "sources": []}

    def get_app_version(self):
        return "1.2.0"

def get_entrypoint():
    # PyInstaller için path düzeltme
    if hasattr(sys, '_MEIPASS'):
        base = pathlib.Path(sys._MEIPASS)
    else:
        base = pathlib.Path(__file__).parent
    html = base / "src" / "index.html"
    if html.exists():
        return str(html)
    # fallback: current dir
    alt = pathlib.Path(__file__).parent / "src" / "index.html"
    return str(alt)

if __name__ == "__main__":
    api = Api()
    entry = get_entrypoint()
    print(f"KaAi başlatılıyor: {entry}")
    print(f"Ayarlar: {SETTINGS_PATH}")

    window = webview.create_window(
        "KaAi v1.2 Gemini 3 | Kurucu: Kaan Özkurt",
        entry,
        width=1366,
        height=768,
        min_size=(1024, 600),
        background_color="#000000",
        js_api=api
    )
    webview.start(debug=False)
