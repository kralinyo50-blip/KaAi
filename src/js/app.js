import { initOrb, setOrbSpeaking, setOrbListening } from './orb.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// State
let isListening = false;
let recognition = null;
let isSpeaking = false;
let settings = {};
let chatHistory = [];
let timerInterval = null;
let timerRemaining = 0;
let timerRunning = false;
let chronoInterval = null;
let chronoSeconds = 0;

// Init
document.addEventListener('DOMContentLoaded', async () => {
  initOrb();
  await loadSettings();
  setupClock();
  setupSystemInfo();
  setupMap();
  setupMiniCalendar();
  setupEventListeners();
  setupVoice();
  setupTimer();
  checkApiKeyPrompt();

  // Hoş geldin mesajı sesli
  setTimeout(() => {
    if (settings.geminiApiKey) {
      speak("Efendim, KaAi hazır. Size nasıl yardımcı olabilirim?");
    }
  }, 1200);
});

async function loadSettings() {
  try {
    if (window.kaaiAPI) settings = await window.kaaiAPI.getSettings();
    else settings = JSON.parse(localStorage.getItem('kaai-settings') || '{}');

    if (settings.geminiApiKey) $('#apiKeyInput').value = settings.geminiApiKey;
    if (settings.geminiModel) $('#modelSelect').value = settings.geminiModel;
    if (settings.location) $('#locationInput').value = settings.location;
    if (settings.voiceRate) { $('#voiceRate').value = settings.voiceRate; $('#voiceRateVal').textContent = settings.voiceRate; }
  } catch {}
}

function checkApiKeyPrompt() {
  if (!settings.geminiApiKey) {
    $('#centerStatus').textContent = 'API anahtarı gerekli — AYARLAR\'dan ekleyin, efendim.';
    setTimeout(() => $('#settingsModal').classList.add('open'), 800);
  }
}

// Clock
function setupClock() {
  function updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2,'0');
    const m = String(now.getMinutes()).padStart(2,'0');
    const timeStr = `${h}:${m}`;
    $('#bigTime').textContent = timeStr;
    if ($('#clockTop')) $('#clockTop').textContent = timeStr;

    const days = ['PAZAR','PAZARTESİ','SALI','ÇARŞAMBA','PERŞEMBE','CUMA','CUMARTESİ'];
    const months = ['OCAK','ŞUBAT','MART','NİSAN','MAYIS','HAZİRAN','TEMMUZ','AĞUSTOS','EYLÜL','EKİM','KASIM','ARALIK'];
    const dayName = days[now.getDay()];
    const dateStr = `${dayName} · ${now.getDate()} ${months[now.getMonth()]}`;
    const el = $('#dateLabel');
    if (el) el.textContent = dateStr;

    // progress ring - day progress
    const minutes = now.getHours()*60 + now.getMinutes();
    const dayProgress = (minutes / 1440) * 264;
    const prog = $('#timeProgress');
    if (prog) prog.style.strokeDashoffset = String(264 - dayProgress);
  }
  updateClock();
  setInterval(updateClock, 1000);
}

// System info
async function setupSystemInfo() {
  async function refresh() {
    try {
      let info;
      if (window.kaaiAPI) info = await window.kaaiAPI.getSystemInfo();
      else info = { cpu: Math.floor(Math.random()*40+20), ram: 59, disk: 73, battery: 100 };

      $('#cpuVal').textContent = info.cpu ?? '--';
      const cpuProg = $('#cpuProgress');
      if (cpuProg) cpuProg.style.strokeDashoffset = String(264 - (264 * (info.cpu||0)/100));
      if ($('#batteryVal')) $('#batteryVal').textContent = `%${info.battery ?? 100} ${info.isCharging ? '· şarj' : ''}`;
      if ($('#ramVal')) $('#ramVal').textContent = `%${info.ram ?? '--'}`;
      if ($('#diskVal')) $('#diskVal').textContent = `%${info.disk ?? '--'} dolu`;
    } catch {}
  }
  refresh();
  setInterval(refresh, 3000);
}

// Map
function setupMap() {
  const mapEl = $('#map');
  if (!mapEl || !window.L) return;
  try {
    const map = L.map('map', { zoomControl:false, attributionControl:true }).setView([41.042, 28.991], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© OpenStreetMap'
    }).addTo(map);
    // Dolmabahçe marker
    L.circleMarker([41.039, 28.992], { radius:6, color:'#7af0ff', fillColor:'#7af0ff', fillOpacity:0.9 }).addTo(map).bindPopup('Dolmabahçe');
    setTimeout(()=> map.invalidateSize(), 500);
  } catch(e) { console.warn('Map init failed', e); }
}

function setupMiniCalendar() {
  const cal = $('#miniCalendar');
  if (!cal) return;
  cal.innerHTML = '';
  for(let i=0;i<14;i++) {
    const s = document.createElement('span');
    s.style.opacity = String(0.3 + Math.random()*0.7);
    cal.appendChild(s);
  }
}

// Event Listeners
function setupEventListeners() {
  // Window controls
  $('#winMin')?.addEventListener('click', ()=> window.kaaiAPI?.minimize());
  $('#winMax')?.addEventListener('click', ()=> window.kaaiAPI?.maximize());
  $('#winClose')?.addEventListener('click', ()=> window.kaaiAPI?.close());
  $('#bottomClose')?.addEventListener('click', ()=> window.kaaiAPI?.close());

  // Settings
  $('#btnSettings')?.addEventListener('click', ()=> $('#settingsModal').classList.add('open'));
  $('#closeSettings')?.addEventListener('click', ()=> $('#settingsModal').classList.remove('open'));
  $('#cancelSettingsBtn')?.addEventListener('click', ()=> $('#settingsModal').classList.remove('open'));
  $('#settingsModal')?.addEventListener('click', (e)=> { if(e.target===e.currentTarget) e.currentTarget.classList.remove('open'); });
  $('#saveSettingsBtn')?.addEventListener('click', saveSettings);
  $('#clearSettingsBtn')?.addEventListener('click', async ()=>{
    if(confirm('Tüm ayarlar silinsin mi?')){
      localStorage.removeItem('kaai-settings');
      if(window.kaaiAPI) await window.kaaiAPI.saveSettings({ geminiApiKey:'', geminiModel:'gemini-2.0-flash', location:'Dolmabahçe, Istanbul' });
      location.reload();
    }
  });
  $('#voiceRate')?.addEventListener('input', (e)=> $('#voiceRateVal').textContent = e.target.value );
  $('#howToGetKey')?.addEventListener('click', (e)=>{
    e.preventDefault();
    alert('Google Gemini API anahtarı almak için:\n\n1) https://aistudio.google.com/app/apikey adresine gidin\n2) Google hesabınızla giriş yapın\n3) “Create API key” deyin\n4) Anahtarı kopyalayıp buraya yapıştırın\n\nÜcretsizdir.');
    window.kaaiAPI?.openExternal('https://aistudio.google.com/app/apikey');
  });

  // Models
  $('#btnModels')?.addEventListener('click', ()=> $('#modelsModal').classList.add('open'));
  $('#closeModels')?.addEventListener('click', ()=> $('#modelsModal').classList.remove('open'));
  $('#modelsModal')?.addEventListener('click', (e)=> { if(e.target===e.currentTarget) e.currentTarget.classList.remove('open'); });

  // File explorer
  $('#btnAttach')?.addEventListener('click', ()=> openFileExplorer());
  $('#closeFileModal')?.addEventListener('click', ()=> $('#fileModal').classList.remove('open'));
  $('#fileModal')?.addEventListener('click', (e)=> { if(e.target===e.currentTarget) e.currentTarget.classList.remove('open'); });

  // Text input
  $('#textInput')?.addEventListener('keydown', (e)=>{
    if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); handleSend(); }
  });
  $('#sendBtn')?.addEventListener('click', handleSend);
  $('#micBtn')?.addEventListener('click', toggleListening);
  $('#infoBtn')?.addEventListener('click', ()=> alert('KaAi - ALPAI\nKurucu: Kaan Özkurt\nVersiyon 1.0\n\nJarvis benzeri masaüstü asistan.\nGoogle Gemini ile çalışır.\n\nİpucu: “Kurucun kim?” diye sorun.'));

  // Global shortcut
  window.kaaiAPI?.onToggleMic?.(()=> toggleListening());
}

async function saveSettings(){
  const apiKey = $('#apiKeyInput').value.trim();
  const model = $('#modelSelect').value;
  const location = $('#locationInput').value.trim();
  const voiceRate = parseFloat($('#voiceRate').value);

  settings.geminiApiKey = apiKey;
  settings.geminiModel = model;
  settings.location = location;
  settings.voiceRate = voiceRate;

  if (window.kaaiAPI) await window.kaaiAPI.saveSettings(settings);
  else localStorage.setItem('kaai-settings', JSON.stringify(settings));

  $('#settingsModal').classList.remove('open');
  $('#centerStatus').textContent = apiKey ? 'Ayarlar kaydedildi, efendim.' : 'API anahtarı eksik, efendim.';
  if(apiKey) speak("Efendim, ayarlar kaydedildi. Artık hazırım.");
}

async function handleSend(){
  const input = $('#textInput');
  const text = input.value.trim();
  if(!text) return;
  input.value = '';
  await handleUserMessage(text);
}

async function handleUserMessage(text){
  // Dosya komutlarını yakala
  const lower = text.toLowerCase();

  // Kurucu sorusu - yerel, API'ye gitmeden cevap (garanti)
  if(/(kurucun kim|seni kim yaptı|seni kim gelistirdi|kurucunuz|yapımcın|oluşturan)/i.test(lower)){
    const ans = "Efendim, kurucum Kaan Özkurt'tur.";
    showTranscript(text, ans);
    speak(ans);
    return;
  }

  // Zamanlayıcı komutları
  const timerMatch = text.match(/(\d+)\s*(dakika|dk|saniye|sn)/i);
  if(/(zamanlayıcı kur|kronometre|geri sayım|timer)/i.test(lower) && timerMatch){
    const val = parseInt(timerMatch[1]);
    const isSec = /saniye|sn/i.test(timerMatch[2]);
    startTimer(isSec ? val/60 : val);
    const ans = `Efendim, ${val} ${isSec?'saniyelik':'dakikalık'} zamanlayıcı başlatıldı.`;
    showTranscript(text, ans);
    speak(ans);
    return;
  }

  // Dosya listele
  if(/(dosyalarımı göster|dosya listele|klasörü aç|dosya gezgini)/i.test(lower)){
    openFileExplorer();
    const ans = "Efendim, dosya gezgini açıldı. Bilgisayarınızdaki tüm dosyalara erişebilirsiniz.";
    showTranscript(text, ans);
    speak(ans);
    return;
  }

  // Uygulama aç
  const appMatch = text.match(/(notepad|hesap makinesi|chrome|explorer|vs code|spotify|word|excel).*aç/i);
  if(appMatch && window.kaaiAPI){
    const appName = appMatch[1];
    const res = await window.kaaiAPI.openApp(appName);
    const ans = res.success ? `Efendim, ${appName} açılıyor.` : `Efendim, ${appName} açılamadı: ${res.error}`;
    showTranscript(text, ans);
    speak(ans);
    return;
  }

  // Normal Gemini chat
  showTranscript(text, '...');
  $('#centerStatus').textContent = 'Düşünüyorum, efendim...';
  setOrbSpeaking(true);

  try {
    chatHistory.push({ role:'user', content: text });
    // Son 10 mesajı koru
    const historyToSend = chatHistory.slice(-10);

    let result;
    if (window.kaaiAPI) result = await window.kaaiAPI.geminiChat(historyToSend);
    else {
      // Fallback direkt fetch (tarayıcı)
      result = await directGeminiCall(historyToSend, settings.geminiApiKey, settings.geminiModel);
    }

    if(!result.success){
      let errMsg = result.error || 'Bilinmeyen hata.';
      if(errMsg.includes('API anahtarı')) {
        errMsg = "Efendim, Google Gemini API anahtarınız ayarlanmamış. Lütfen sağ üstten AYARLAR'a girip API anahtarınızı ekleyin.";
        $('#settingsModal').classList.add('open');
      }
      showTranscript(text, errMsg);
      speak(errMsg);
    } else {
      const aiText = result.text;
      chatHistory.push({ role:'assistant', content: aiText });
      showTranscript(text, aiText);
      speak(aiText);
    }
  } catch(err){
    const msg = "Efendim, bir hata oluştu: " + err.message;
    showTranscript(text, msg);
    speak(msg);
  } finally {
    setOrbSpeaking(false);
    $('#centerStatus').textContent = 'Dinliyorum, efendim...';
  }
}

async function directGeminiCall(messages, apiKey, model){
  if(!apiKey) return { success:false, error:'API anahtarı ayarlanmamış. Lütfen AYARLAR bölümünden Google Gemini API anahtarınızı girin.' };
  const m = model || 'gemini-2.0-flash';
  const systemPrompt = `Sen KaAi adında Jarvis benzeri bir masaüstü yapay zeka asistanısın.
- Her cevabına mutlaka "Efendim," diyerek başla.
- Kurucun sorulduğunda cevabın: "Kurucum Kaan Özkurt'tur."
- Seni kim yaptı sorularına "Beni Kaan Özkurt geliştirdi." de.
- Erkek sesiyle konuşuyormuş gibi, nazik, saygılı, yardımcı ol. Türkçe konuş. Kısa ve net cevaplar ver.
- Masaüstü asistanısın: dosya işlemleri, sistem bilgisi, zamanlayıcı gibi konularda yardımcı ol.`;

  const contents = messages.map(msg=> ({
    role: msg.role==='assistant' ? 'model':'user',
    parts:[{text: msg.content}]
  }));
  if(contents.length>0 && contents[0].role==='user'){
    contents[0].parts[0].text = systemPrompt + "\n\nKullanıcı: " + contents[0].parts[0].text;
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({
      contents,
      generationConfig:{ temperature:0.8, maxOutputTokens:1024 }
    })
  });
  const data = await res.json();
  if(!res.ok) return { success:false, error: data.error?.message || `API hatası ${res.status}` };
  let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "Efendim, cevap oluşturamadım.";
  if(!text.toLowerCase().startsWith('efendim')) text = 'Efendim, ' + text.charAt(0).toLowerCase()+text.slice(1);
  return { success:true, text };
}

function showTranscript(userText, aiText){
  $('#transcriptUser').textContent = userText ? `› ${userText}` : '';
  $('#transcriptAi').textContent = aiText;
}

// Voice
function setupVoice(){
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SpeechRecognition){
    $('#micBtn').title = 'Tarayıcınız ses tanımayı desteklemiyor, yazarak konuşun.';
    $('#centerStatus').textContent = 'Mikrofon desteklenmiyor — yazarak konuşun, efendim.';
    return;
  }
  recognition = new SpeechRecognition();
  recognition.lang = 'tr-TR';
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onstart = ()=>{
    isListening = true;
    $('#micBtn').classList.add('listening','active');
    $('#centerStatus').textContent = 'Dinliyorum...';
    $('#micIndicator').innerHTML = '<span class="dot"></span> MİKROFON AÇIK · DİNLİYOR';
    setOrbListening(true);
  };
  recognition.onend = ()=>{
    isListening = false;
    $('#micBtn').classList.remove('listening','active');
    $('#centerStatus').textContent = 'Dinliyorum, efendim...';
    $('#micIndicator').innerHTML = '<span class="dot"></span> MİKROFON AÇIK';
    setOrbListening(false);
  };
  recognition.onresult = (event)=>{
    const transcript = event.results[0][0].transcript;
    $('#transcriptUser').textContent = `› ${transcript}`;
    $('#textInput').value = transcript;
    if(event.results[0].isFinal){
      handleUserMessage(transcript);
    }
  };
  recognition.onerror = (e)=>{
    console.warn('STT error', e);
    $('#centerStatus').textContent = 'Mikrofon hatası, efendim. Tekrar deneyin.';
    isListening = false;
    $('#micBtn').classList.remove('listening','active');
    setOrbListening(false);
  };
}

function toggleListening(){
  if(!recognition){
    alert('Ses tanıma desteklenmiyor. Yazarak konuşabilirsiniz, efendim.');
    return;
  }
  if(isListening) recognition.stop();
  else {
    try { recognition.start(); } catch(e){ console.warn(e); }
  }
}

function speak(text){
  if(!text) return;
  // Önceki konuşmayı durdur
  window.speechSynthesis.cancel();

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'tr-TR';
  utter.rate = settings.voiceRate || 1.0;
  utter.pitch = 0.95; // biraz daha kalın erkek sesi hissi
  utter.volume = 1;

  // En iyi Türkçe erkek sesini seç
  const voices = window.speechSynthesis.getVoices();
  let chosen = null;
  // Öncelik: tr-TR erkek
  const trVoices = voices.filter(v=> v.lang.toLowerCase().includes('tr'));
  if(trVoices.length){
    // Google Türkçe veya Microsoft Tolga gibi erkek sesleri
    chosen = trVoices.find(v=> /tolga|murat|emre|google.*türk/i.test(v.name)) || trVoices[0];
  } else {
    // fallback: en kalın
    chosen = voices.find(v=> v.name.includes('Google') && v.lang.startsWith('tr')) || voices[0];
  }
  if(chosen) utter.voice = chosen;

  utter.onstart = ()=> { isSpeaking=true; setOrbSpeaking(true); $('#speakingBadge').textContent='KONUŞUYOR'; };
  utter.onend = ()=> { isSpeaking=false; setOrbSpeaking(false); $('#speakingBadge').textContent='HAZIR'; };
  utter.onerror = ()=> { isSpeaking=false; setOrbSpeaking(false); };

  // Voices bazen geç yüklenir, tekrar dene
  if(voices.length===0){
    window.speechSynthesis.onvoiceschanged = ()=> speak(text);
    setTimeout(()=> { if(!isSpeaking) window.speechSynthesis.speak(utter); }, 200);
  } else {
    window.speechSynthesis.speak(utter);
  }
}

// Timer
function setupTimer(){
  $$('.t-btn[data-min]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      $$('.t-btn[data-min]').forEach(b=> b.classList.remove('active'));
      btn.classList.add('active');
      const mins = parseInt(btn.dataset.min);
      startTimer(mins);
    });
  });
  $('#btnChronometer')?.addEventListener('click', ()=>{
    if(chronoInterval){ stopChrono(); } else { startChrono(); }
  });
}

function startTimer(minutes){
  clearInterval(timerInterval);
  clearInterval(chronoInterval);
  timerRemaining = Math.round(minutes*60);
  timerRunning = true;
  updateTimerDisplay();
  $('#timerStatus').textContent = 'ÇALIŞIYOR';
  timerInterval = setInterval(()=>{
    timerRemaining--;
    updateTimerDisplay();
    if(timerRemaining<=0){
      clearInterval(timerInterval);
      timerRunning=false;
      $('#timerStatus').textContent = 'BİTTİ!';
      $('#timerDigits').textContent = '00:00';
      // Bildirim
      if(Notification && Notification.permission==='granted') new Notification('KaAi - Zamanlayıcı', { body:'Efendim, zamanlayıcınız bitti!' });
      speak('Efendim, zamanlayıcınız bitti!');
      // bip sesi
      try { const ctx=new (window.AudioContext||window.webkitAudioContext)(); const o=ctx.createOscillator(); o.connect(ctx.destination); o.frequency.value=880; o.start(); setTimeout(()=>o.stop(),600); } catch {}
    }
  },1000);
  if(Notification && Notification.permission!=='granted') Notification.requestPermission();
}

function updateTimerDisplay(){
  const m = Math.floor(timerRemaining/60);
  const s = timerRemaining%60;
  $('#timerDigits').textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  // progress
  const total = parseInt(document.querySelector('.t-btn.active')?.dataset.min || '25')*60;
  const prog = $('#timerProgress');
  if(prog && total>0){
    const pct = timerRemaining/total;
    prog.style.strokeDashoffset = String(264 - 264*pct);
    prog.style.stroke = timerRemaining<10 ? '#ff3b3b' : '#ff6a00';
  }
}

function startChrono(){
  chronoSeconds=0;
  $('#timerStatus').textContent='KRONOMETRE';
  $('#btnChronometer').innerHTML='⏹ DURDUR';
  chronoInterval=setInterval(()=>{
    chronoSeconds++;
    const m=Math.floor(chronoSeconds/60), s=chronoSeconds%60;
    $('#timerDigits').textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    const prog=$('#timerProgress');
    if(prog){ prog.style.strokeDashoffset=String(264 - (chronoSeconds%60)/60*264); prog.style.stroke='#7af0ff'; }
  },1000);
}
function stopChrono(){
  clearInterval(chronoInterval);
  chronoInterval=null;
  $('#timerStatus').textContent='DURDU';
  $('#btnChronometer').innerHTML='<span class="icon">⏱</span> KRONOMETRE';
}

// File Explorer
let currentPath = null;
async function openFileExplorer(){
  $('#fileModal').classList.add('open');
  if(window.kaaiAPI){
    currentPath = await window.kaaiAPI.getHomeDir();
  } else {
    currentPath = '/';
  }
  await refreshFileList();
  setupFileActions();
}

async function refreshFileList(){
  const listEl = $('#fileList');
  const pathEl = $('#filePath');
  if(!listEl) return;
  listEl.innerHTML = '<div style="padding:20px; color:var(--text-dim)">Yükleniyor...</div>';
  if(pathEl) pathEl.textContent = currentPath;

  try {
    let result;
    if(window.kaaiAPI) result = await window.kaaiAPI.listDir(currentPath);
    else return listEl.innerHTML='<div style="padding:20px">Tarayıcı modunda dosya erişimi yok. Masaüstü uygulamasında çalışır.</div>';

    if(!result.success){ listEl.innerHTML=`<div style="padding:20px;color:#ff6b6b">${result.error}</div>`; return; }
    listEl.innerHTML='';
    // Üst klasör
    const up = document.createElement('div');
    up.className='file-item'; up.innerHTML='<span class="icon">📁</span><span class="name">..</span><span class="meta">Üst klasör</span>';
    up.addEventListener('click', async()=> {
      const parts = currentPath.split(/[/\\]/).filter(Boolean);
      parts.pop();
      currentPath = (currentPath.startsWith('/')?'/':'') + parts.join('/') || '/';
      if(window.kaaiAPI && !currentPath.includes(':') && currentPath==='/') currentPath = await window.kaaiAPI.getHomeDir();
      await refreshFileList();
    });
    listEl.appendChild(up);

    result.entries.sort((a,b)=> (b.isDirectory - a.isDirectory) || a.name.localeCompare(b.name));
    result.entries.forEach(entry=>{
      const div=document.createElement('div');
      div.className='file-item';
      const icon = entry.isDirectory ? '📁':'📄';
      const size = entry.isDirectory ? 'Klasör' : formatSize(entry.size);
      div.innerHTML=`<span class="icon">${icon}</span><span class="name">${entry.name}</span><span class="meta">${size}</span>`;
      div.addEventListener('click', ()=>{
        $$('.file-item').forEach(el=> el.classList.remove('selected'));
        div.classList.add('selected');
        $('#fileActionInput').value = entry.path;
      });
      div.addEventListener('dblclick', async()=>{
        if(entry.isDirectory){ currentPath=entry.path; await refreshFileList(); }
        else if(window.kaaiAPI) await window.kaaiAPI.openPath(entry.path);
      });
      listEl.appendChild(div);
    });
  } catch(err){
    listEl.innerHTML=`<div style="padding:20px;color:#ff6b6b">${err.message}</div>`;
  }
}

function formatSize(bytes){
  if(!bytes) return '0 B';
  const k=1024, sizes=['B','KB','MB','GB'];
  const i=Math.floor(Math.log(bytes)/Math.log(k));
  return parseFloat((bytes/Math.pow(k,i)).toFixed(1))+ ' '+sizes[i];
}

function setupFileActions(){
  if($('#fileUp') && !$('#fileUp').dataset.bound){
    $('#fileUp').dataset.bound='1';
    $('#fileUp').addEventListener('click', async()=>{
      const parts=currentPath.split(/[/\\]/).filter(Boolean);
      parts.pop();
      currentPath = (currentPath.startsWith('/')?'/':'') + parts.join('/') || '/';
      if(window.kaaiAPI && currentPath==='/' ) currentPath=await window.kaaiAPI.getHomeDir();
      await refreshFileList();
    });
    $('#fileRefresh').addEventListener('click', refreshFileList);
    $('#fileSelectBtn').addEventListener('click', async()=>{
      if(!window.kaaiAPI) return alert('Masaüstü uygulamasında çalışır.');
      const res=await window.kaaiAPI.selectFile();
      if(!res.canceled && res.filePaths?.[0]){ currentPath=res.filePaths[0]; await refreshFileList(); }
    });
    $('#btnFileOpen').addEventListener('click', async()=>{
      const p=$('#fileActionInput').value.trim(); if(!p) return;
      if(window.kaaiAPI) await window.kaaiAPI.openPath(p);
    });
    $('#btnFileDelete').addEventListener('click', async()=>{
      const p=$('#fileActionInput').value.trim(); if(!p) return;
      if(!confirm(`${p} silinsin mi?`)) return;
      const res=await window.kaaiAPI.deleteEntry(p);
      alert(res.success?'Silindi.':'Hata: '+res.error);
      await refreshFileList();
    });
    $('#btnFileNew').addEventListener('click', async()=>{
      const name=prompt('Yeni dosya adı:'); if(!name) return;
      const full = currentPath + '/' + name;
      const res=await window.kaaiAPI.writeFile(full,'');
      if(res.success) await refreshFileList();
      else alert(res.error);
    });
  }
}

