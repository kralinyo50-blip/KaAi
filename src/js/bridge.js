// Evrensel köprü - Electron, Python pywebview ve tarayıcı için
(function(){
  // Zaten Electron'da kaaiAPI var, dokunma
  if (window.kaaiAPI) return;

  // Python pywebview köprüsü
  // pywebview api yüklendiğinde window.pywebview.api hazır olur
  function createPythonBridge() {
    if (!window.pywebview || !window.pywebview.api) return false;

    const py = window.pywebview.api;

    window.kaaiAPI = {
      getSettings: () => py.get_settings(),
      saveSettings: (s) => py.save_settings(s),
      getSetting: (k) => py.get_setting(k),
      setSetting: (k,v) => py.set_setting(k,v),
      getSystemInfo: () => py.get_system_info(),
      getAppVersion: () => py.get_app_version(),
      getHomeDir: () => py.get_home_dir(),
      listDir: (p) => py.list_dir(p),
      readFile: (p) => py.read_file(p),
      writeFile: (p,c) => py.write_file(p,c),
      createDir: (p) => py.create_dir(p),
      deleteEntry: (p) => py.delete_entry(p),
      renameEntry: (o,n) => py.rename_entry(o,n),
      openPath: (p) => py.open_path(p),
      openExternal: (u) => { window.open(u,'_blank'); return Promise.resolve({success:true}) },
      selectFile: () => Promise.resolve({canceled:true}),
      saveDialog: () => Promise.resolve({canceled:true}),
      execCommand: (cmd,cwd) => py.exec_command(cmd,cwd),
      openApp: (name) => py.open_app(name),
      geminiChat: (msgs) => py.gemini_chat(msgs),
      captureScreen: () => py.capture_screen(),
      getScreenSources: () => py.get_screen_sources(),
      fetchUrl: (url) => fetch(url).then(r=>r.json()).then(d=>({success:true,data:d})).catch(e=>({success:false,error:e.message})),
      minimize: () => {},
      maximize: () => {},
      close: () => window.close(),
      onToggleMic: () => {}
    };
    console.log('[KaAi] Python köprüsü aktif');
    return true;
  }

  // Hemen dene
  if (createPythonBridge()) return;

  // pywebview geç yüklenebilir - bekle
  let attempts = 0;
  const iv = setInterval(()=>{
    attempts++;
    if (createPythonBridge() || attempts>20) clearInterval(iv);
  }, 250);

  // pywebview yüklendi eventi
  window.addEventListener('pywebviewready', ()=>{
    createPythonBridge();
    // UI'yi yeniden tetikle
    window.dispatchEvent(new Event('kaai-bridge-ready'));
  });
})();
