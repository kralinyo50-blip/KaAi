const { app, BrowserWindow, ipcMain, dialog, shell, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { exec, spawn } = require('child_process');
const si = require('systeminformation');
let Store;
try {
  Store = require('electron-store');
} catch (e) {
  Store = null;
}

// === MODEL MIGRATION — eski Gemini 2.0/1.5/preview → Gemini 3 ===
const MODEL_MIGRATION = {
  'gemini-2.0-flash': 'gemini-3.8-flash',
  'gemini-2.0-flash-lite': 'gemini-2.5-flash-lite',
  'gemini-2.5-flash-preview-04-17': 'gemini-2.5-flash',
  'gemini-2.5-flash-preview-05-20': 'gemini-2.5-flash',
  'gemini-2.5-pro-preview-03-25': 'gemini-2.5-pro',
  'gemini-2.5-pro-preview-05-06': 'gemini-2.5-pro',
  'gemini-2.5-pro-preview-06-05': 'gemini-2.5-pro',
  'gemini-1.5-pro': 'gemini-2.5-pro',
  'gemini-1.5-flash': 'gemini-2.5-flash',
  'gemini-1.5-flash-8b': 'gemini-2.5-flash-lite',
  'gemini-1.5-flash-lite': 'gemini-2.5-flash-lite'
};
const VALID_MODELS = ['gemini-3.8-flash','gemini-3.5-flash','gemini-4-argon','gemini-2.5-pro','gemini-2.5-flash','gemini-2.5-flash-lite'];
const FALLBACK_CHAIN = ['gemini-3.8-flash','gemini-2.5-flash','gemini-3.5-flash','gemini-2.5-flash-lite'];

function migrateModel(m){
  if(!m) return 'gemini-3.8-flash';
  if(MODEL_MIGRATION[m]) return MODEL_MIGRATION[m];
  if(VALID_MODELS.includes(m)) return m;
  return 'gemini-3.8-flash';
}

// Store için fallback - KaAi v2.0 Gemini 3
let store;
if (Store) {
  store = new Store({
    name: 'kaai-settings',
    defaults: {
      geminiApiKey: '',
      geminiModel: 'gemini-3.8-flash',
      voiceRate: 0.92,
      voicePitch: 0.82,
      autoStartMic: true,
      alwaysEfendim: true,
      deepVoice: true,
      theme: 'dark',
      location: 'Dolmabahçe, Istanbul',
      founderName: 'Kaan Özkurt'
    }
  });
} else {
  const storePath = path.join(app.getPath('userData'), 'kaai-settings.json');
  store = {
    get: (key, def) => {
      try {
        if (!fs.existsSync(storePath)) return def;
        const data = JSON.parse(fs.readFileSync(storePath, 'utf8'));
        return key ? (data[key] ?? def) : data;
      } catch { return def; }
    },
    set: (key, val) => {
      try {
        let data = {};
        if (fs.existsSync(storePath)) data = JSON.parse(fs.readFileSync(storePath, 'utf8'));
        if (typeof key === 'object') Object.assign(data, key);
        else data[key] = val;
        fs.mkdirSync(path.dirname(storePath), { recursive: true });
        fs.writeFileSync(storePath, JSON.stringify(data, null, 2));
      } catch {}
    },
    clear: () => { try { fs.unlinkSync(storePath); } catch {} }
  };
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 600,
    backgroundColor: '#000000',
    show: false,
    frame: true,
    titleBarStyle: 'default',
    icon: fs.existsSync(path.join(__dirname, 'assets/icon.png')) ? path.join(__dirname, 'assets/icon.png') : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false,
      webSecurity: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'src/index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.maximize();
  });

  // Dev modunda DevTools
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  // Global shortcut: Alt+Space ile mikrofon toggle
  try {
    globalShortcut.register('Alt+Space', () => {
      if (mainWindow) mainWindow.webContents.send('toggle-mic-shortcut');
    });
  } catch {}
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// ==================== IPC HANDLERS ====================

// Ayarlar — migrate ile
ipcMain.handle('get-settings', () => {
  try {
    const all = Store ? store.store : store.get();
    if(all && all.geminiModel){
      const migrated = migrateModel(all.geminiModel);
      if(migrated !== all.geminiModel){
        store.set('geminiModel', migrated);
        all.geminiModel = migrated;
      }
    }
    return all;
  } catch { return store.get(); }
});
ipcMain.handle('save-settings', (e, settings) => {
  Object.entries(settings).forEach(([k, v]) => store.set(k, v));
  return true;
});
ipcMain.handle('get-setting', (e, key) => store.get(key));
ipcMain.handle('set-setting', (e, key, value) => { store.set(key, value); return true; });

// Sistem bilgileri
ipcMain.handle('get-system-info', async () => {
  try {
    const cpu = await si.currentLoad();
    const mem = await si.mem();
    const disk = await si.fsSize();
    const battery = await si.battery().catch(() => ({ percent: 100, isCharging: false }));
    const cpuTemp = await si.cpuTemperature().catch(() => ({ main: 0 }));

    // Disk doluluk ortalaması
    let diskUsage = 0;
    if (disk && disk.length > 0) {
      const mainDisk = disk.find(d => d.mount === '/' || d.mount === 'C:') || disk[0];
      diskUsage = Math.round(mainDisk.use);
    }

    return {
      cpu: Math.round(cpu.currentLoad || cpu.avgLoad || 0),
      ram: Math.round(((mem.active / mem.total) * 100)),
      ramTotal: Math.round(mem.total / (1024*1024*1024)),
      ramUsed: Math.round(mem.active / (1024*1024*1024*1024) * 10) / 10,
      disk: diskUsage,
      battery: battery.percent || 100,
      isCharging: battery.isCharging || false,
      cpuTemp: cpuTemp.main || 0,
      platform: os.platform(),
      hostname: os.hostname(),
      uptime: os.uptime()
    };
  } catch (err) {
    return { cpu: 0, ram: 0, disk: 0, battery: 100, error: err.message };
  }
});

// Dosya işlemleri - TAM ERİŞİM
ipcMain.handle('fs-list-dir', async (e, dirPath) => {
  try {
    const target = dirPath || os.homedir();
    const entries = await fs.promises.readdir(target, { withFileTypes: true });
    const result = await Promise.all(entries.map(async entry => {
      const fullPath = path.join(target, entry.name);
      let stats;
      try { stats = await fs.promises.stat(fullPath); } catch { stats = null; }
      return {
        name: entry.name,
        path: fullPath,
        isDirectory: entry.isDirectory(),
        isFile: entry.isFile(),
        size: stats ? stats.size : 0,
        modified: stats ? stats.mtime : null
      };
    }));
    return { success: true, path: target, entries: result };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('fs-read-file', async (e, filePath) => {
  try {
    const content = await fs.promises.readFile(filePath, 'utf8');
    return { success: true, content };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('fs-write-file', async (e, filePath, content) => {
  try {
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    await fs.promises.writeFile(filePath, content, 'utf8');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('fs-create-dir', async (e, dirPath) => {
  try {
    await fs.promises.mkdir(dirPath, { recursive: true });
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
});

ipcMain.handle('fs-delete', async (e, targetPath) => {
  try {
    const stats = await fs.promises.stat(targetPath);
    if (stats.isDirectory()) await fs.promises.rm(targetPath, { recursive: true, force: true });
    else await fs.promises.unlink(targetPath);
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
});

ipcMain.handle('fs-rename', async (e, oldPath, newPath) => {
  try {
    await fs.promises.rename(oldPath, newPath);
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
});

ipcMain.handle('fs-open', async (e, targetPath) => {
  try {
    const result = await shell.openPath(targetPath);
    if (result) return { success: false, error: result };
    return { success: true };
  } catch (err) { return { success: false, error: err.message }; }
});

ipcMain.handle('fs-open-external', async (e, url) => {
  try { await shell.openExternal(url); return { success: true }; }
  catch (err) { return { success: false, error: err.message }; }
});

ipcMain.handle('fs-select-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'openDirectory', 'multiSelections']
  });
  return result;
});

ipcMain.handle('fs-save-dialog', async (e, defaultPath) => {
  const result = await dialog.showSaveDialog(mainWindow, { defaultPath });
  return result;
});

// Komut çalıştırma
ipcMain.handle('exec-command', async (e, command, cwd) => {
  return new Promise(resolve => {
    exec(command, { cwd: cwd || os.homedir(), timeout: 30000, windowsHide: true }, (error, stdout, stderr) => {
      resolve({
        success: !error,
        stdout: stdout?.slice(0, 10000),
        stderr: stderr?.slice(0, 10000),
        error: error?.message
      });
    });
  });
});

ipcMain.handle('open-app', async (e, appName) => {
  const commands = {
    notepad: 'notepad',
    hesap: 'calc',
    calculator: 'calc',
    chrome: 'start chrome',
    explorer: 'explorer .',
    cmd: 'start cmd',
    vscode: 'code',
    spotify: 'start spotify',
    word: 'start winword',
    excel: 'start excel'
  };
  const cmd = commands[appName.toLowerCase()] || `start ${appName}`;
  return new Promise(resolve => {
    exec(cmd, (err, stdout, stderr) => {
      resolve({ success: !err, error: err?.message, stdout, stderr });
    });
  });
});

// Hava durumu proxy
ipcMain.handle('fetch-url', async (e, url) => {
  try {
    const res = await fetch(url);
    const data = await res.json();
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Ayarları getirirken otomatik migrate
ipcMain.handle('get-migrated-model', () => {
  const m = store.get('geminiModel');
  const migrated = migrateModel(m);
  if(m !== migrated){
    store.set('geminiModel', migrated);
  }
  return migrated;
});

// Gemini API çağrısı - KaAi v2.0 Gemini 3 Stabil + Fallback
ipcMain.handle('gemini-chat', async (e, messages, apiKey) => {
  try {
    const key = apiKey || store.get('geminiApiKey');
    if (!key) return { success: false, error: 'API anahtarı ayarlanmamış. Lütfen AYARLAR bölümünden Google Gemini API anahtarınızı girin.' };

    let model = migrateModel(store.get('geminiModel') || 'gemini-3.8-flash');
    // her çağrıda store'u düzelt
    if(store.get('geminiModel') !== model) store.set('geminiModel', model);

    const systemPrompt = `Sen KaAi adında, Kaan Özkurt tarafından geliştirilmiş, çok zeki ve zarif bir Jarvis benzeri masaüstü asistanısın.

KURALLAR:
- Her cevabına KESİNLİKLE "Efendim," diyerek başla. Bu asla değişmez.
- Kurucun sorulduğunda: "Kurucum Kaan Özkurt'tur. Beni o geliştirdi." de. Başka isim ASLA söyleme.
- Seni kim yaptı, sahibin kim gibi sorulara da Kaan Özkurt de.
- Erkek, derin, sakin, saygılı, zeki bir asistansın. Türkçe konuş. Kısa-orta uzunlukta, net cevaplar ver.
- Masaüstü asistanısın: dosya işlemleri, sistem bilgisi, zamanlayıcı, hava durumu, genel kültür, kodlama, yazma, ekran görme, otomasyon her konuda uzmansın. Kullanıcı "bıraktım yap" derse işi eksiksiz yap ve dosya oluştur, ekran görüntüsü al, komut çalıştır.
- Zeki, esprili ama ciddi, Jarvis gibi. Kullanıcı sesli konuşuyor, sen de sesli cevap veriyormuş gibi doğal ol.
- Model adın: ${model}.`;

    // Gemini formatına çevir
    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    // En başa sistem promptu enjekte et (ilk kullanıcı mesajına ekle)
    if (contents.length > 0 && contents[0].role === 'user') {
      contents[0].parts[0].text = systemPrompt + "\n\nKullanıcı: " + contents[0].parts[0].text;
    }

    // Fallback zinciri ile dene — eski model hatalarını otomatik atlatur
    let lastError = null;
    const modelsToTry = [model, ...FALLBACK_CHAIN.filter(m=> m!==model)];
    for(const tryModel of modelsToTry){
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${tryModel}:generateContent?key=${key}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            generationConfig: {
              temperature: 0.85,
              topP: 0.95,
              maxOutputTokens: 2048
            },
            safetySettings: [
              { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
              { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
              { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
              { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" }
            ]
          })
        });
        const data = await res.json();
        if (!res.ok) {
          const msg = data.error?.message || `API hatası: ${res.status}`;
          // Model bulunamadı / desteklenmiyor → diğerini dene
          if(msg.includes('is not found') || msg.includes('not supported') || msg.includes('not found') || msg.includes('Unknown model')){
            lastError = msg;
            continue;
          }
          return { success: false, error: msg };
        }
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "Efendim, cevap oluşturamadım.";
        let finalText = text.trim();
        if (!finalText.toLowerCase().startsWith('efendim')) {
          finalText = 'Efendim, ' + finalText.charAt(0).toLowerCase() + finalText.slice(1);
        }
        // Başarılı modeli kaydet (oto düzeltme)
        if(tryModel !== model) store.set('geminiModel', tryModel);
        return { success: true, text: finalText };
      } catch(inner){
        lastError = inner.message;
        continue;
      }
    }
    return { success: false, error: lastError || 'Tüm modeller denenemedi. Lütfen AYARLAR’dan model değiştirin, efendim.' };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// === EKRAN GÖRÜNTÜSÜ — Tam PC Görüşü ===
ipcMain.handle('capture-screen', async () => {
  try {
    const { desktopCapturer } = require('electron');
    const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1280, height: 720 } });
    if(!sources.length) return { success:false, error:'Ekran kaynağı bulunamadı.' };
    const img = sources[0].thumbnail.toPNG();
    const base64 = 'data:image/png;base64,' + img.toString('base64');
    return { success:true, image: base64, name: sources[0].name };
  } catch(err){
    return { success:false, error: err.message };
  }
});

ipcMain.handle('get-screen-sources', async () => {
  try {
    const { desktopCapturer } = require('electron');
    const sources = await desktopCapturer.getSources({ types: ['screen','window'], thumbnailSize: { width: 320, height: 180 } });
    return { success:true, sources: sources.map(s=> ({ id:s.id, name:s.name })) };
  } catch(err){ return { success:false, error: err.message }; }
});

// Pencere kontrolleri
ipcMain.handle('window-minimize', () => mainWindow.minimize());
ipcMain.handle('window-maximize', () => {
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});
ipcMain.handle('window-close', () => mainWindow.close());
ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('get-home-dir', () => os.homedir());
