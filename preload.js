const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('kaaiAPI', {
  // Ayarlar
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (s) => ipcRenderer.invoke('save-settings', s),
  getSetting: (k) => ipcRenderer.invoke('get-setting', k),
  setSetting: (k, v) => ipcRenderer.invoke('set-setting', k, v),

  // Sistem
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getHomeDir: () => ipcRenderer.invoke('get-home-dir'),

  // Dosya sistemi - TAM ERİŞİM
  listDir: (p) => ipcRenderer.invoke('fs-list-dir', p),
  readFile: (p) => ipcRenderer.invoke('fs-read-file', p),
  writeFile: (p, c) => ipcRenderer.invoke('fs-write-file', p, c),
  createDir: (p) => ipcRenderer.invoke('fs-create-dir', p),
  deleteEntry: (p) => ipcRenderer.invoke('fs-delete', p),
  renameEntry: (o, n) => ipcRenderer.invoke('fs-rename', o, n),
  openPath: (p) => ipcRenderer.invoke('fs-open', p),
  openExternal: (u) => ipcRenderer.invoke('fs-open-external', u),
  selectFile: () => ipcRenderer.invoke('fs-select-file'),
  saveDialog: (p) => ipcRenderer.invoke('fs-save-dialog', p),

  // Komutlar
  execCommand: (cmd, cwd) => ipcRenderer.invoke('exec-command', cmd, cwd),
  openApp: (name) => ipcRenderer.invoke('open-app', name),

  // AI
  geminiChat: (msgs, key) => ipcRenderer.invoke('gemini-chat', msgs, key),
  fetchUrl: (url) => ipcRenderer.invoke('fetch-url', url),

  // Pencere
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),

  // Events
  onToggleMic: (cb) => ipcRenderer.on('toggle-mic-shortcut', cb)
});
