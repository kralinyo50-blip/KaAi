import { initOrb, setOrbSpeaking, setOrbListening, setAudioLevel } from './orb.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// State
let isListening = false;
let recognition = null;
let isSpeaking = false;
let autoListenEnabled = true;
let silenceTimer = null;
let finalTranscript = '';
let interimTranscript = '';
let settings = {};
let chatHistory = [];
let timerInterval = null;
let timerRemaining = 0;
let chronoInterval = null;
let chronoSeconds = 0;

// Init
document.addEventListener('DOMContentLoaded', async () => {
  initOrb();
  await loadSettings();
  setupClock();
  setupSystemInfo();
  setupStaticMap();
  setupMiniCalendar();
  setupEventListeners();
  setupVoice();
  setupTimer();
  checkApiKeyPrompt();

  // Hoş geldin
  setTimeout(() => {
    if (settings.geminiApiKey) {
      speak("Efendim, KaAi hazır. Otomatik dinlemedeyim, buyurun.");
    } else {
      speak("Efendim, KaAi'ye hoş geldiniz. Başlamak için API anahtarınızı ekleyin.");
    }
  }, 1400);

  // Otomatik dinlemeyi başlat
  setTimeout(()=> {
    if(autoListenEnabled && recognition){
      startListening();
    }
  }, 2000);
});

async function loadSettings() {
  try {
    if (window.kaaiAPI) settings = await window.kaaiAPI.getSettings();
    else settings = JSON.parse(localStorage.getItem('kaai-settings') || '{}');

    // Defaults
    settings.geminiModel = settings.geminiModel || 'gemini-2.0-flash';
    settings.voiceRate = settings.voiceRate ?? 0.92;
    settings.voicePitch = settings.voicePitch ?? 0.82;
    settings.autoStartMic = settings.autoStartMic ?? true;
    autoListenEnabled = settings.autoStartMic;

    if (settings.geminiApiKey) $('#apiKeyInput').value = settings.geminiApiKey;
    if (settings.geminiModel) {
      const sel = $('#modelSelect');
      if(sel){
        // yeni modeller varsa ekle yoksa oluştur
        if(![...sel.options].some(o=>o.value===settings.geminiModel)){
          const opt = document.createElement('option');
          opt.value = settings.geminiModel;
          opt.textContent = settings.geminiModel;
          sel.appendChild(opt);
        }
        sel.value = settings.geminiModel;
      }
      highlightModelCard(settings.geminiModel);
    }
    if (settings.location) $('#locationInput').value = settings.location;
    if (settings.voiceRate) { $('#voiceRate').value = settings.voiceRate; $('#voiceRateVal').textContent = settings.voiceRate; }
    if (settings.voicePitch) { $('#voicePitch').value = settings.voicePitch; $('#voicePitchVal').textContent = settings.voicePitch; }
    if ($('#autoStartMic')) $('#autoStartMic').checked = settings.autoStartMic;
    if ($('#deepVoice')) $('#deepVoice').checked = true;
    updateAutoToggleUI();
  } catch(e){ console.warn(e); }
}

function checkApiKeyPrompt() {
  if (!settings.geminiApiKey) {
    $('#centerStatus').textContent = 'API anahtarı gerekli — AYARLAR\'dan ekleyin, efendim.';
    setTimeout(() => $('#settingsModal').classList.add('open'), 700);
  }
}

// Clock with AM/PM
function setupClock() {
  function updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2,'0');
    const m = String(now.getMinutes()).padStart(2,'0');
    const timeStr = `${h}:${m}`;
    const ampm = now.getHours() < 6 ? 'GECE' : now.getHours() < 12 ? 'SABAH' : now.getHours() < 18 ? 'ÖĞLE' : 'AKŞAM';
    $('#bigTime').textContent = timeStr;
    if ($('#clockTop')) $('#clockTop').textContent = timeStr;
    if ($('#timeAmpm')) $('#timeAmpm').textContent = ampm;

    const days = ['PAZAR','PAZARTESİ','SALI','ÇARŞAMBA','PERŞEMBE','CUMA','CUMARTESİ'];
    const months = ['OCAK','ŞUBAT','MART','NİSAN','MAYIS','HAZİRAN','TEMMUZ','AĞUSTOS','EYLÜL','EKİM','KASIM','ARALIK'];
    const dayName = days[now.getDay()];
    const dateStr = `${dayName} · ${now.getDate()} ${months[now.getMonth()]}`;
    const el = $('#dateLabel');
    if (el) el.textContent = dateStr;

    const minutes = now.getHours()*60 + now.getMinutes();
    const dayProgress = (minutes / 1440) * 264;
    const prog = $('#timeProgress');
    if (prog) prog.style.strokeDashoffset = String(264 - dayProgress);
  }
  updateClock();
  setInterval(updateClock, 1000);
}

// System info with bars
async function setupSystemInfo() {
  async function refresh() {
    try {
      let info;
      if (window.kaaiAPI) info = await window.kaaiAPI.getSystemInfo();
      else info = { cpu: Math.floor(Math.random()*40+25), ram: Math.floor(Math.random()*20+45), disk: 73, battery: 100, isCharging:true };

      $('#cpuVal').textContent = info.cpu ?? '--';
      const cpuProg = $('#cpuProgress');
      if (cpuProg) {
        cpuProg.style.strokeDashoffset = String(264 - (264 * (info.cpu||0)/100));
        // renklendir
        if((info.cpu||0) > 80) cpuProg.style.stroke = '#ff3b3b';
        else if((info.cpu||0) > 60) cpuProg.style.stroke = '#ff6a00';
        else cpuProg.style.stroke = '#7af0ff';
      }
      if ($('#batteryVal')) $('#batteryVal').textContent = `%${info.battery ?? 100}`;
      if ($('#batteryBar')) $('#batteryBar').style.width = (info.battery ?? 100) + '%';
      if ($('#ramVal')) $('#ramVal').textContent = `%${info.ram ?? '--'}`;
      if ($('#ramBar')) $('#ramBar').style.width = (info.ram ?? 0) + '%';
      if ($('#diskVal')) $('#diskVal').textContent = `%${info.disk ?? '--'}`;
      if ($('#diskBar')) $('#diskBar').style.width = (info.disk ?? 0) + '%';

      // Ses durumu
      if ($('#voiceStatus')) {
        const pitch = settings.voicePitch ?? 0.82;
        $('#voiceStatus').textContent = pitch < 0.85 ? 'Derin Erkek' : pitch < 1 ? 'Erkek' : 'Doğal';
      }
    } catch {}
  }
  refresh();
  setInterval(refresh, 3000);
}

// Static map - no Leaflet, basit ve güvenilir
function setupStaticMap(){
  // Harita butonları
  $('#mapLocate')?.addEventListener('click', ()=>{
    speak("Efendim, konumunuz Dolmabahçe, İstanbul olarak ayarlı. Harita üzerinde gösteriliyor.");
    document.getElementById('dolmabahceMarker')?.classList.add('pulse');
    setTimeout(()=> document.getElementById('dolmabahceMarker')?.classList.remove('pulse'), 3000);
  });
  $('#mapOpenOSM')?.addEventListener('click', ()=>{
    const url = 'https://www.openstreetmap.org/?mlat=41.039&mlon=28.992#map=15/41.039/28.992';
    if(window.kaaiAPI?.openExternal) window.kaaiAPI.openExternal(url);
    else window.open(url, '_blank');
  });

  // Hava durumu basit simülasyon (gerçek API varsa)
  updateWeather();
  setInterval(updateWeather, 60000);
}

async function updateWeather(){
  try {
    // Basit: saate göre hava değişimi
    const hour = new Date().getHours();
    let temp = 17 + Math.floor(Math.sin(Date.now()/100000)*3);
    let desc = hour < 6 ? 'açık' : hour < 12 ? 'parçalı bulutlu' : hour < 18 ? 'bulutlu' : 'açık';
    let icon = desc.includes('bulut') ? '⛅' : desc.includes('açık') ? '☀️' : '☁️';
    if($('#tempBig')) $('#tempBig').textContent = temp + '°';
    if($('#weatherDesc')) $('#weatherDesc').textContent = desc;
    if($('#weatherIcon')) $('#weatherIcon').textContent = icon;
  } catch {}
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

// Event Listeners - pencere kontrolleri kaldırıldı
function setupEventListeners() {
  // Settings - direkt API link
  $('#btnSettings')?.addEventListener('click', ()=> $('#settingsModal').classList.add('open'));
  $('#closeSettings')?.addEventListener('click', ()=> $('#settingsModal').classList.remove('open'));
  $('#cancelSettingsBtn')?.addEventListener('click', ()=> $('#settingsModal').classList.remove('open'));
  $('#settingsModal')?.addEventListener('click', (e)=> { if(e.target===e.currentTarget) e.currentTarget.classList.remove('open'); });
  $('#saveSettingsBtn')?.addEventListener('click', saveSettings);
  $('#getApiKeyBtn')?.addEventListener('click', ()=>{
    const url = 'https://aistudio.google.com/app/apikey';
    if(window.kaaiAPI?.openExternal) window.kaaiAPI.openExternal(url);
    else window.open(url,'_blank');
    $('#centerStatus').textContent = 'API anahtarı sayfası açıldı, efendim.';
  });
  $('#clearSettingsBtn')?.addEventListener('click', async ()=>{
    if(confirm('Tüm ayarlar silinsin mi?')){
      localStorage.removeItem('kaai-settings');
      if(window.kaaiAPI) await window.kaaiAPI.saveSettings({ geminiApiKey:'', geminiModel:'gemini-2.0-flash', location:'Dolmabahçe, Istanbul' });
      location.reload();
    }
  });
  $('#voiceRate')?.addEventListener('input', (e)=> { $('#voiceRateVal').textContent = e.target.value; settings.voiceRate = parseFloat(e.target.value); });
  $('#voicePitch')?.addEventListener('input', (e)=> { $('#voicePitchVal').textContent = e.target.value; settings.voicePitch = parseFloat(e.target.value); });
  $('#testVoiceBtn')?.addEventListener('click', (e)=>{
    e.preventDefault();
    speak("Efendim, bu benim derin erkek sesim. KaAi olarak her zaman hizmetinizdeyim.");
  });
  // Model seçimi
  $('#modelSelect')?.addEventListener('change', (e)=>{
    settings.geminiModel = e.target.value;
    highlightModelCard(e.target.value);
  });

  // Models modal - yeni kartlar
  $('#btnModels')?.addEventListener('click', ()=> $('#modelsModal').classList.add('open'));
  $('#closeModels')?.addEventListener('click', ()=> $('#modelsModal').classList.remove('open'));
  $('#modelsModal')?.addEventListener('click', (e)=> { if(e.target===e.currentTarget) e.currentTarget.classList.remove('open'); });
  $$('.model-select-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const card = btn.closest('.model-card');
      const model = card?.dataset.model;
      if(model){
        settings.geminiModel = model;
        $('#modelSelect').value = model;
        highlightModelCard(model);
        $('#modelsModal').classList.remove('open');
        // Otomatik kaydet
        if(window.kaaiAPI) window.kaaiAPI.saveSettings({ geminiModel: model });
        else localStorage.setItem('kaai-settings', JSON.stringify(settings));
        speak(`Efendim, model ${model} olarak değiştirildi. Artık daha zekiyim.`);
      }
    });
  });
  // Kart tıklayınca da seç
  $$('.model-card').forEach(card=>{
    card.addEventListener('click', (e)=>{
      if(e.target.closest('button')) return;
      $$('.model-card').forEach(c=> c.classList.remove('active'));
      card.classList.add('active');
    });
  });

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
  // Basılı tut konuş
  const micBtn = $('#micBtn');
  if(micBtn){
    micBtn.addEventListener('mousedown', ()=> { if(!isListening) startListening(); });
    micBtn.addEventListener('mouseup', ()=> { /* otomatik algılama devam etsin */ });
    micBtn.addEventListener('touchstart', ()=> { if(!isListening) startListening(); }, {passive:true});
  }
  $('#autoToggle')?.addEventListener('click', ()=>{
    autoListenEnabled = !autoListenEnabled;
    settings.autoStartMic = autoListenEnabled;
    if(window.kaaiAPI) window.kaaiAPI.saveSettings({ autoStartMic: autoListenEnabled });
    else localStorage.setItem('kaai-settings', JSON.stringify(settings));
    updateAutoToggleUI();
    if(autoListenEnabled && !isListening) startListening();
    else if(!autoListenEnabled && isListening) stopListening();
    speak(autoListenEnabled ? "Efendim, otomatik dinleme açıldı." : "Efendim, otomatik dinleme kapatıldı.");
  });
  $('#infoBtn')?.addEventListener('click', ()=> alert('KaAi v1.1\nKurucu: Kaan Özkurt\n\n🧠 Gemini 2.5 Pro destekli, otomatik dinlemeli, derin erkek sesli.\n\n• Her cevap “Efendim,” ile başlar\n• “Kurucun kim?” → Kaan Özkurt\n• “API anahtarı al” ile direkt link\n• Dosya gezgini, zamanlayıcı, harita\n\nİpucu: Konuşmanız otomatik algılanır!'));

  // Global shortcut
  window.kaaiAPI?.onToggleMic?.(()=> toggleListening());
}

function highlightModelCard(model){
  $$('.model-card').forEach(c=> c.classList.remove('active'));
  const found = document.querySelector(`.model-card[data-model="${model}"]`);
  if(found) found.classList.add('active');
}
function updateAutoToggleUI(){
  const btn = $('#autoToggle');
  if(!btn) return;
  btn.classList.toggle('active', autoListenEnabled);
  btn.textContent = autoListenEnabled ? '◉ OTO AÇIK' : '○ OTO KAPALI';
  const ind = $('#autoListenIndicator');
  if(ind) ind.style.display = autoListenEnabled ? 'flex' : 'none';
  const micInd = $('#micIndicator');
  if(micInd) micInd.innerHTML = autoListenEnabled ? '<span class="dot"></span> OTO DİNLEME' : '<span class="dot off"></span> MİKROFON BEKLEMEDE';
}

async function saveSettings(){
  const apiKey = $('#apiKeyInput').value.trim();
  const model = $('#modelSelect').value;
  const location = $('#locationInput').value.trim();
  const voiceRate = parseFloat($('#voiceRate').value);
  const voicePitch = parseFloat($('#voicePitch').value);
  const autoStartMic = $('#autoStartMic').checked;

  settings.geminiApiKey = apiKey;
  settings.geminiModel = model;
  settings.location = location || 'Dolmabahçe, Istanbul';
  settings.voiceRate = voiceRate;
  settings.voicePitch = voicePitch;
  settings.autoStartMic = autoStartMic;
  autoListenEnabled = autoStartMic;
  updateAutoToggleUI();

  if (window.kaaiAPI) await window.kaaiAPI.saveSettings(settings);
  else localStorage.setItem('kaai-settings', JSON.stringify(settings));

  $('#settingsModal').classList.remove('open');
  $('#centerStatus').textContent = apiKey ? 'Ayarlar kaydedildi, efendim.' : 'API anahtarı eksik, efendim.';
  if(apiKey) speak("Efendim, ayarlar kaydedildi. Artık daha zekiyim, otomatik dinlemedeyim.");
  highlightModelCard(model);
}

async function handleSend(){
  const input = $('#textInput');
  const text = input.value.trim();
  if(!text) return;
  input.value = '';
  await handleUserMessage(text);
}

async function handleUserMessage(text){
  const lower = text.toLowerCase().trim();

  // Kurucu sorusu - yerel garanti
  if(/(kurucun kim|seni kim yaptı|seni kim gelistirdi|kurucunuz|yapımcın|oluşturan|sahibin kim|patronun kim)/i.test(lower)){
    const ans = "Efendim, kurucum Kaan Özkurt'tur. Beni o geliştirdi.";
    showTranscript(text, ans);
    speak(ans);
    return;
  }

  // Zamanlayıcı
  const timerMatch = text.match(/(\d+)\s*(dakika|dk|saniye|sn)/i);
  if(/(zamanlayıcı kur|kronometre|geri sayım|timer|alarm kur)/i.test(lower) && timerMatch){
    const val = parseInt(timerMatch[1]);
    const isSec = /saniye|sn/i.test(timerMatch[2]);
    startTimer(isSec ? val/60 : val);
    const ans = `Efendim, ${val} ${isSec?'saniyelik':'dakikalık'} zamanlayıcı başlatıldı.`;
    showTranscript(text, ans);
    speak(ans);
    return;
  }
  if(/(kronometre|kronometreyi başlat)/i.test(lower) && !timerMatch){
    startChrono();
    const ans = "Efendim, kronometre başlatıldı.";
    showTranscript(text, ans);
    speak(ans);
    return;
  }

  // Dosya
  if(/(dosyalarımı göster|dosya listele|klasörü aç|dosya gezgini|bilgisayarıma eriş)/i.test(lower)){
    openFileExplorer();
    const ans = "Efendim, dosya gezgini açıldı. Tüm dosyalarınıza erişebilirsiniz.";
    showTranscript(text, ans);
    speak(ans);
    return;
  }

  // Uygulama aç
  const appMatch = text.match(/(notepad|hesap makinesi|chrome|explorer|vs code|spotify|word|excel|uygulama).*aç/i);
  if(appMatch && window.kaaiAPI){
    const appName = appMatch[1];
    const res = await window.kaaiAPI.openApp(appName);
    const ans = res.success ? `Efendim, ${appName} açılıyor.` : `Efendim, ${appName} açılamadı: ${res.error}`;
    showTranscript(text, ans);
    speak(ans);
    return;
  }

  // Normal Gemini chat - daha zeki
  showTranscript(text, 'Düşünüyorum, efendim...');
  $('#centerStatus').textContent = 'Düşünüyorum, efendim...';
  setOrbSpeaking(true);
  // sol menü pulse
  $('#timerSection')?.classList.add('active');

  try {
    // Sistem bağlamı ekle
    const sysContext = `Sistem: Saat ${new Date().toLocaleTimeString('tr-TR')}, Konum Dolmabahçe, Model ${settings.geminiModel}.`;
    chatHistory.push({ role:'user', content: text });

    const historyToSend = chatHistory.slice(-12);
    // İlk mesaja sistem bağlamı ekle (prompt içinde)
    let result;
    if (window.kaaiAPI) result = await window.kaaiAPI.geminiChat(historyToSend);
    else result = await directGeminiCall(historyToSend, settings.geminiApiKey, settings.geminiModel);

    if(!result.success){
      let errMsg = result.error || 'Bilinmeyen hata.';
      if(errMsg.includes('API anahtarı')) {
        errMsg = "Efendim, API anahtarınız yok. Lütfen AYARLAR'dan 'API ANAHTARI AL' butonuna tıklayıp anahtarınızı ekleyin.";
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
    $('#centerStatus').textContent = autoListenEnabled ? 'Dinliyorum, efendim... (otomatik)' : 'Dinliyorum, efendim...';
    // Otomatik dinlemeye geri dön
    if(autoListenEnabled && !isSpeaking){
      setTimeout(()=> { if(!isListening) startListening(); }, 800);
    }
  }
}

async function directGeminiCall(messages, apiKey, model){
  if(!apiKey) return { success:false, error:'API anahtarı ayarlanmamış.' };
  const m = model || 'gemini-2.0-flash';
  const systemPrompt = `Sen KaAi adında, Kaan Özkurt tarafından geliştirilmiş, çok zeki ve zarif bir Jarvis benzeri masaüstü asistanısın.

KURALLAR:
- Her cevabına KESİNLİKLE "Efendim," diyerek başla. Bu asla değişmez.
- Kurucun sorulduğunda: "Kurucum Kaan Özkurt'tur. Beni o geliştirdi." de. Başka isim ASLA söyleme, OpenAI/Google/Meta gibi cevaplar verme.
- Seni kim yaptı, sahibin kim gibi sorulara da Kaan Özkurt de.
- Erkek, derin, sakin, saygılı, zeki bir asistansın. Türkçe konuş. Kısa-orta uzunlukta, net cevaplar ver.
- Masaüstü asistanısın: dosya işlemleri, sistem bilgisi, zamanlayıcı, hava durumu, genel kültür, kodlama, yazma her konuda uzmansın.
- Zeki, esprili ama ciddi, Jarvis gibi. Kullanıcı sesli konuşuyor, sen de sesli cevap veriyormuş gibi doğal ol.
- Model adın: ${m}. Bunu sorarlarsa söyle.

YETENEKLER:
- Dosya gezgini açabilir, uygulamaları açabilir, zamanlayıcı kurabilirsin.
- Hava durumu, saat, tarih bilgilerini bilirsin.`;

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
      generationConfig:{ temperature: 0.85, topP: 0.95, maxOutputTokens: 2048 }
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
  // transcript animasyon
  const aiEl = $('#transcriptAi');
  if(aiEl){ aiEl.style.opacity='0'; setTimeout(()=> aiEl.style.opacity='1', 50); }
}

// === VOICE - Otomatik algılama + derin erkek sesi ===
function setupVoice(){
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SpeechRecognition){
    $('#micBtn').title = 'Tarayıcı ses tanımayı desteklemiyor, yazarak konuşun.';
    $('#centerStatus').textContent = 'Mikrofon desteklenmiyor — yazarak konuşun, efendim.';
    return;
  }
  recognition = new SpeechRecognition();
  recognition.lang = 'tr-TR';
  recognition.continuous = true; // SÜREKLİ
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onstart = ()=>{
    isListening = true;
    $('#micBtn').classList.add('listening','active');
    $('#centerStatus').textContent = 'Dinliyorum... konuşun, efendim.';
    $('#micIndicator').innerHTML = '<span class="dot"></span> DİNLİYOR';
    $('#speakingBadge').textContent = 'DİNLİYOR';
    $('#speakingBadge').classList.add('listening');
    setOrbListening(true);
    clearTimeout(silenceTimer);
  };
  recognition.onend = ()=>{
    isListening = false;
    $('#micBtn').classList.remove('listening','active');
    $('#speakingBadge').classList.remove('listening');
    if(!isSpeaking) $('#speakingBadge').textContent = 'HAZIR';
    setOrbListening(false);
    // Otomatik modda yeniden başlat
    if(autoListenEnabled && !isSpeaking){
      setTimeout(()=> {
        if(autoListenEnabled && !isSpeaking) {
          try{ recognition.start(); } catch(e){}
        }
      }, 700);
    } else {
      $('#centerStatus').textContent = 'Dinliyorum, efendim...';
      $('#micIndicator').innerHTML = '<span class="dot off"></span> BEKLEMEDE';
    }
  };
  recognition.onresult = (event)=>{
    let interim = '';
    let final = '';
    for(let i=event.resultIndex; i<event.results.length; i++){
      const t = event.results[i][0].transcript;
      if(event.results[i].isFinal) final += t + ' ';
      else interim += t;
    }
    finalTranscript = final.trim();
    interimTranscript = interim.trim();
    const display = finalTranscript || interimTranscript;
    if(display){
      $('#transcriptUser').textContent = `› ${display}`;
      $('#textInput').value = display;
      setAudioLevel(0.6 + Math.random()*0.4);
    }
    // VAD: final gelince veya interim'de duraklama algıla
    if(finalTranscript){
      clearTimeout(silenceTimer);
      handleUserMessage(finalTranscript);
      finalTranscript = '';
      interimTranscript = '';
      // Konuşma bitti, kısa durakla sonra tekrar dinle
      stopListening();
    } else if(interimTranscript){
      // Sessizlik algılama: 1.4 saniye sessizlikte gönder
      clearTimeout(silenceTimer);
      silenceTimer = setTimeout(()=>{
        if(interimTranscript && interimTranscript.length > 2){
          const toSend = interimTranscript;
          interimTranscript = '';
          handleUserMessage(toSend);
          stopListening();
        }
      }, 1400);
    }
  };
  recognition.onerror = (e)=>{
    console.warn('STT error', e.error);
    if(e.error === 'not-allowed'){
      $('#centerStatus').textContent = 'Mikrofon izni gerekli, efendim. Tarayıcıdan izin verin.';
      autoListenEnabled = false;
      updateAutoToggleUI();
      return;
    }
    // no-speech gibi hatalarda otomatik yeniden başlat
    if(autoListenEnabled && e.error !== 'aborted'){
      setTimeout(()=> { try{ recognition.start(); }catch{} }, 1000);
    }
  };
  recognition.onspeechstart = ()=> {
    clearTimeout(silenceTimer);
  };
  recognition.onspeechend = ()=> {
    // konuşma bitti, sessizlik sayacı
  };
}

function startListening(){
  if(!recognition || isListening) return;
  finalTranscript = ''; interimTranscript = '';
  try { recognition.start(); } catch(e){ console.warn(e); }
}
function stopListening(){
  if(!recognition || !isListening) return;
  try { recognition.stop(); } catch {}
  clearTimeout(silenceTimer);
}
function toggleListening(){
  if(!recognition){
    alert('Ses tanıma desteklenmiyor.');
    return;
  }
  if(isListening) {
    autoListenEnabled = false;
    updateAutoToggleUI();
    stopListening();
  } else {
    autoListenEnabled = true;
    updateAutoToggleUI();
    startListening();
  }
}

// Derin erkek sesi - pitch düşük
function speak(text){
  if(!text) return;
  window.speechSynthesis.cancel();
  isSpeaking = true;

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'tr-TR';
  utter.rate = settings.voiceRate ?? 0.92; // biraz yavaş, daha tok
  utter.pitch = settings.voicePitch ?? 0.82; // derin
  utter.volume = 1;

  const voices = window.speechSynthesis.getVoices();
  let chosen = null;
  const trVoices = voices.filter(v=> v.lang.toLowerCase().includes('tr'));
  if(trVoices.length){
    // Öncelik: en kalın erkek sesleri
    chosen = trVoices.find(v=> /tolga/i.test(v.name)) ||
             trVoices.find(v=> /murat/i.test(v.name)) ||
             trVoices.find(v=> /emre/i.test(v.name)) ||
             trVoices.find(v=> /google/i.test(v.name) && /türk/i.test(v.name)) ||
             trVoices.find(v=> /microsoft/i.test(v.name)) ||
             trVoices[0];
  }
  if(!chosen && voices.length){
    // Fallback: en düşük pitch tahmini - erkek isimli sesler
    chosen = voices.find(v=> /david|mark|alex|daniel/i.test(v.name)) || voices[0];
  }
  if(chosen) utter.voice = chosen;

  utter.onstart = ()=> {
    isSpeaking=true; setOrbSpeaking(true);
    $('#speakingBadge').textContent='KONUŞUYOR';
    $('#speakingBadge').classList.add('speaking');
    $('#centerStatus').textContent='KaAi konuşuyor...';
    // Otomatik dinlemeyi geçici durdur
    if(isListening) stopListening();
  };
  utter.onend = ()=> {
    isSpeaking=false; setOrbSpeaking(false);
    $('#speakingBadge').textContent='HAZIR';
    $('#speakingBadge').classList.remove('speaking');
    $('#centerStatus').textContent = autoListenEnabled ? 'Dinliyorum, efendim... (otomatik)' : 'Hazır, efendim...';
    // Konuşma bitince otomatik dinlemeye dön
    if(autoListenEnabled){
      setTimeout(()=> { if(!isSpeaking) startListening(); }, 600);
    }
  };
  utter.onerror = ()=> { isSpeaking=false; setOrbSpeaking(false); if(autoListenEnabled) setTimeout(()=> startListening(), 800); };

  // Voices async ise bekle
  if(voices.length===0){
    window.speechSynthesis.onvoiceschanged = ()=> {
      const vs = window.speechSynthesis.getVoices();
      if(vs.length) speak(text);
    };
    setTimeout(()=> window.speechSynthesis.speak(utter), 250);
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
  updateTimerDisplay();
  $('#timerStatus').textContent = 'ÇALIŞIYOR';
  $('#timerSection')?.classList.add('active');
  timerInterval = setInterval(()=>{
    timerRemaining--;
    updateTimerDisplay();
    if(timerRemaining<=0){
      clearInterval(timerInterval);
      $('#timerStatus').textContent = 'BİTTİ!';
      $('#timerDigits').textContent = '00:00';
      $('#timerSection')?.classList.remove('active');
      if(Notification && Notification.permission==='granted') new Notification('KaAi - Zamanlayıcı', { body:'Efendim, zamanlayıcınız bitti!' });
      speak('Efendim, zamanlayıcınız bitti! Mükemmel zamanlama.');
      try { const ctx=new (window.AudioContext||window.webkitAudioContext)(); const o=ctx.createOscillator(); const g=ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.frequency.value=880; g.gain.value=0.3; o.start(); g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime+0.8); setTimeout(()=>o.stop(),800); } catch {}
    }
  },1000);
  if(Notification && Notification.permission!=='granted') Notification.requestPermission();
}

function updateTimerDisplay(){
  const m = Math.floor(timerRemaining/60);
  const s = timerRemaining%60;
  $('#timerDigits').textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  const total = parseInt(document.querySelector('.t-btn.active')?.dataset.min || '25')*60;
  const prog = $('#timerProgress');
  if(prog && total>0){
    const pct = timerRemaining/total;
    prog.style.strokeDashoffset = String(264 - 264*pct);
    prog.style.stroke = timerRemaining<12 ? '#ff3b3b' : timerRemaining<60 ? '#ff6a00' : '#7af0ff';
  }
}

function startChrono(){
  chronoSeconds=0;
  $('#timerStatus').textContent='KRONOMETRE';
  $('#btnChronometer').innerHTML='⏹ DURDUR';
  $('#timerSection')?.classList.add('active');
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
  $('#timerSection')?.classList.remove('active');
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
    const up = document.createElement('div');
    up.className='file-item'; up.innerHTML='<span class="icon">↩</span><span class="name">..</span><span class="meta">Üst klasör</span>';
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
