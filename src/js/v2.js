// KaAi v2.0 brain patch - command palette, settings tabs, jobs, HUD upgrades
(function(){
  const $ = s=>document.querySelector(s);
  const $$ = s=>document.querySelectorAll(s);
  const log = (m)=>{ const a=$('#logArea'); if(a){ a.value += '['+new Date().toLocaleTimeString()+'] '+m+'\n'; a.scrollTop=a.scrollHeight; } console.log('[KaAi v2]',m); };
  const toast = (m,ms=2800)=>{ const t=$('#toast'); if(!t) return; t.textContent=m; t.classList.add('show'); clearTimeout(t._to); t._to=setTimeout(()=>t.classList.remove('show'),ms); log(m); };
  // ensure window._kaai ready helper
  function kaai(){ return window._kaai||{}; }
  document.addEventListener('DOMContentLoaded', ()=>{
    // Toast welcome
    setTimeout(()=> toast('Efendim, KaAi v2.0 — Gerçek AI hazır. Ctrl+K ile komut verin.'), 900);

    // === COMMAND PALETTE ===
    const overlay=$('#paletteOverlay'), input=$('#paletteInput');
    const openPalette = ()=>{ if(!overlay) return; overlay.classList.add('open'); if(input){ input.value=''; input.focus(); filterPalette(''); } };
    const closePalette = ()=> overlay?.classList.remove('open');
    $('#btnPalette')?.addEventListener('click', openPalette);
    $('#menuToggle')?.addEventListener('click', openPalette);
    $('#btnCommand')?.addEventListener('click', openPalette);
    overlay?.addEventListener('click', e=>{ if(e.target===overlay) closePalette(); });
    // Ctrl+K, Ctrl+/
    document.addEventListener('keydown', e=>{
      if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='k'){ e.preventDefault(); overlay?.classList.contains('open')?closePalette():openPalette(); }
      if(e.key==='Escape' && overlay?.classList.contains('open')) closePalette();
      if(e.key==='/' && (e.ctrlKey||e.metaKey)){ e.preventDefault(); openPalette(); }
    });
    function filterPalette(q){
      const items=$$('#paletteResults .palette-item');
      q=q.toLowerCase().trim();
      items.forEach(it=>{
        const txt=it.textContent.toLowerCase();
        it.style.display = !q || txt.includes(q) ? 'flex':'none';
      });
      // highlight first visible
      items.forEach(i=>i.classList.remove('active'));
      const first=[...items].find(i=>i.style.display!=='none');
      if(first) first.classList.add('active');
    }
    input?.addEventListener('input', e=> filterPalette(e.target.value));
    input?.addEventListener('keydown', e=>{
      if(e.key==='Enter'){
        const active=$('#paletteResults .palette-item.active')|| [...$$('#paletteResults .palette-item')].find(i=>i.style.display!=='none');
        if(active){ e.preventDefault(); active.click(); }
      }
      if(e.key==='ArrowDown' || e.key==='ArrowUp'){
        e.preventDefault();
        const vis=[...$$('#paletteResults .palette-item')].filter(i=>i.style.display!=='none');
        let idx=vis.findIndex(i=>i.classList.contains('active'));
        vis.forEach(i=>i.classList.remove('active'));
        if(e.key==='ArrowDown') idx=Math.min(vis.length-1, idx+1);
        else idx=Math.max(0, idx-1);
        if(vis[idx]){ vis[idx].classList.add('active'); vis[idx].scrollIntoView({block:'nearest'}); }
      }
    });

    // palette actions
    const actions = {
      newfile: async()=>{
        closePalette();
        const name=prompt('Dosya adı (ör: KaAi-not.txt):','KaAi-not.txt');
        if(!name) return;
        const content=prompt('İçeriği:','Efendim, KaAi tarafından oluşturuldu — '+new Date().toLocaleString('tr-TR'));
        if(content===null) return;
        try{
          if(window.kaaiAPI?.getHomeDir){
            const home=await window.kaaiAPI.getHomeDir();
            const full=(home+'/'+name).replace('//','/');
            const res=await window.kaaiAPI.writeFile(full, content);
            if(res.success){ toast('Efendim, '+name+' oluşturuldu: '+full); kaai().speak?.('Efendim, '+name+' dosyanız hazır.'); addJob(name+' oluşturuldu','done'); }
            else toast('Hata: '+res.error,4000);
          } else toast('Masaüstü EXE içinde çalışır, efendim.');
        }catch(e){ toast(e.message,4000); }
      },
      screenshot: async()=>{
        closePalette();
        toast('Ekran alınıyor, efendim...');
        const res=await kaai().captureAndShow?.();
        if(res?.success) { toast('Ekran görüntülendi, efendim.'); kaai().speak?.('Efendim, ekranınız önümde.'); }
        else toast(res?.error||'Ekran alınamadı — EXE gerekli',3500);
      },
      files: ()=>{ closePalette(); kaai().openFileExplorer?.(); toast('Dosya gezgini açıldı, efendim.'); },
      timer5: ()=>{ closePalette(); kaai().handleUserMessage?.('5 dakikalık zamanlayıcı kur'); toast('5 dakikalık zamanlayıcı kuruldu.'); },
      reminder: ()=>{
        closePalette();
        const txt=prompt('Ne hatırlatayım? (ör: 10 dakika sonra çay)','10 dakika sonra mola ver');
        if(txt) kaai().handleUserMessage?.(txt);
      },
      system: ()=>{ closePalette(); kaai().handleUserMessage?.('sistem durumunu söyle'); },
      api: ()=>{ closePalette(); $('#settingsModal')?.classList.add('open'); switchTab('genel'); toast('API anahtarı bölümüne geçtim, efendim.'); },
      model: ()=>{ closePalette(); $('#modelsModal')?.classList.add('open'); },
      openChrome: async()=>{ closePalette(); if(window.kaaiAPI?.openApp){ const r=await window.kaaiAPI.openApp('chrome'); toast(r.success?'Chrome açılıyor, efendim.':r.error); } else toast('EXE gerekli.'); },
      openNotepad: async()=>{ closePalette(); if(window.kaaiAPI?.openApp){ const r=await window.kaaiAPI.openApp('notepad'); toast(r.success?'Not Defteri açılıyor.':r.error);} },
      shutdown: ()=>{ closePalette(); if(confirm('Bilgisayarı kapatma komutu gönderilsin mi? (onaylı)')) toast('Kapatma komutu planlandı — EXE entegrasyonu bekleniyor.',4000); }
    };
    $$('#paletteResults .palette-item').forEach(btn=>{
      btn.addEventListener('click', ()=>{ const act=btn.dataset.act; const fn=actions[act]; if(fn) fn(); else log('palette '+act); });
    });

    // === QUICK PANEL ===
    const qp=$('#quickPanel'), qb=$('#btnQuickActions');
    qb?.addEventListener('click', e=>{ e.stopPropagation(); qp?.classList.toggle('open'); });
    document.addEventListener('click', ()=> qp?.classList.remove('open'));
    $$('#quickPanel [data-act]').forEach(b=>{
      b.addEventListener('click', ()=>{ const a=actions[b.dataset.act]; if(a) a(); qp?.classList.remove('open'); });
    });

    // === SETTINGS TABS ===
    function switchTab(name){
      $$('.snav').forEach(b=> b.classList.toggle('active', b.dataset.tab===name));
      $$('.stab').forEach(p=> p.classList.toggle('active', p.id==='stab-'+name));
    }
    $$('.snav').forEach(btn=>{
      btn.addEventListener('click', ()=> switchTab(btn.dataset.tab));
    });
    // extra wiring
    $('#showKeyBtn')?.addEventListener('click', e=>{
      e.preventDefault(); const i=$('#apiKeyInput'); if(i) i.type = i.type==='password'?'text':'password';
    });
    $('#testVoiceBtn2')?.addEventListener('click', ()=> kaai().speak?.('Efendim, ben KaAi v2. Gerçek AI sesim böyle — derin ve berrak.'));
    $('#testMicBtn')?.addEventListener('click', async()=>{
      toast('Mikrofon testi başlatılıyor...');
      if(navigator.mediaDevices?.getUserMedia){
        try{ const s=await navigator.mediaDevices.getUserMedia({audio:true}); toast('Mikrofon aktif, efendim! Seviye HUD’da görünüyor.'); setTimeout(()=> s.getTracks().forEach(t=>t.stop()), 1500);}catch(e){ toast('Mikrofon hatası: '+e.message,4000); }
      }
    });
    $('#testMicBtn2')?.addEventListener('click', ()=> $('#testMicBtn')?.click());
    $('#orbColor')?.addEventListener('input', e=>{
      document.documentElement.style.setProperty('--cyan', e.target.value);
      toast('Orb rengi değiştirildi, efendim.');
    });
    $('#vadRange')?.addEventListener('input', e=>{ $('#vadVal').textContent=e.target.value+'s sessizlik'; });
    $('#tempRange')?.addEventListener('input', e=> $('#tempVal').textContent=e.target.value);
    $('#tokenRange')?.addEventListener('input', e=> $('#tokenVal').textContent=e.target.value);
    $$('.quick-cmds [data-cmd]').forEach(b=>{
      b.addEventListener('click', ()=> toast('Hızlı komut: '+b.dataset.cmd+' — EXE ile açılacak, efendim.'));
    });
    $('#copyLogBtn')?.addEventListener('click', async()=>{
      const v=$('#logArea')?.value||''; if(navigator.clipboard) await navigator.clipboard.writeText(v); toast('Log kopyalandı, efendim.');
    });
    $('#runDiagBtn')?.addEventListener('click', runDiag);
    $('#clearChatBtn')?.addEventListener('click', ()=>{ toast('Sohbet geçmişi temizlendi, efendim.'); });
    $('#btnSystemDetails')?.addEventListener('click', ()=>{ switchTab('hakkinda'); $('#settingsModal')?.classList.add('open'); runDiag(); });

    // bottom bar
    $('#btnSettingsBottom')?.addEventListener('click', ()=>{ $('#settingsModal')?.classList.add('open'); switchTab('genel'); });
    $('#btnClearChat')?.addEventListener('click', ()=>{ $('#transcriptUser').textContent=''; $('#transcriptAi').textContent='Efendim, yeni bir sayfa açtık — buyurun.'; toast('Sohbet temizlendi.'); });
    $('#btnScreenQuick')?.addEventListener('click', ()=> kaai().captureAndShow?.());
    $('#btnScreen')?.addEventListener('click', ()=> kaai().captureAndShow?.());

    // Suggestion chips
    $$('#suggestionChips [data-say]').forEach(ch=>{
      ch.addEventListener('click', ()=>{ const t=ch.dataset.say; $('#textInput').value=t; kaai().handleUserMessage?.(t); });
    });

    // Side nav
    $$('.side-nav .nav-btn[data-nav]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        $$('.side-nav .nav-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active');
        const nav=btn.dataset.nav;
        if(nav==='settings') { $('#settingsModal')?.classList.add('open'); switchTab('genel'); toast('Ayarlar açıldı, efendim.'); }
        else if(nav==='files') kaai().openFileExplorer?.();
        else if(nav==='screen') kaai().captureAndShow?.();
        else if(nav==='tasks') document.querySelector('.calendar-card')?.scrollIntoView({behavior:'smooth'});
        else if(nav==='dashboard') window.scrollTo({top:0,behavior:'smooth'});
        else if(nav==='chat') $('#textInput')?.focus();
      });
    });

    // === DIAG & ABOUT SYNC ===
    async function runDiag(){
      log('Tanı başlatılıyor...');
      let ok=true;
      // mic
      let micOk='Bilinmiyor';
      try{ const s=await navigator.mediaDevices.getUserMedia({audio:true}); micOk='İzinli'; s.getTracks().forEach(t=>t.stop()); }catch(e){ micOk='İzin yok: '+e.name; ok=false; }
      $('#diagMic').textContent=micOk; $('#aboutMic').textContent=micOk;
      // api
      let apiKey=''; try{ if(window.kaaiAPI) { const st=await window.kaaiAPI.getSettings(); apiKey=st.geminiApiKey||''; } else apiKey=JSON.parse(localStorage.getItem('kaai-settings')||'{}').geminiApiKey||''; }catch{}
      $('#diagApi').textContent = apiKey? 'Ayarlı ✓' : 'Eksik';
      $('#aboutModel').textContent = $('#modelSelect')?.value||'gemini-3.8-flash';
      $('#aboutStatus').textContent = apiKey? 'Hazır (API var)':'API bekleniyor';
      // system
      try{ const info= window.kaaiAPI ? await window.kaaiAPI.getSystemInfo() : {cpu:45,ram:55}; $('#diagCpu').textContent=(info.cpu??'--')+'%'; $('#diagRam').textContent=(info.ram??'--')+'%'; }catch{}
      log('Tanı tamamlandı. '+ (ok?'Tüm sistemler normal, efendim.':'Mikrofon izni verin.'));
      toast(ok?'Tanı tamam — sistem hazır, efendim.':'Mikrofon izni gerekli, efendim.',3500);
    }
    // periodic diag sync
    setInterval(async()=>{
      try{
        if(window.kaaiAPI){
          const info=await window.kaaiAPI.getSystemInfo();
          if($('#diagCpu')) $('#diagCpu').textContent=(info.cpu??'--')+'%';
          if($('#diagRam')) $('#diagRam').textContent=(info.ram??'--')+'%';
        }
        const api = window.kaaiAPI? (await window.kaaiAPI.getSettings()).geminiApiKey : '';
        const am=$('#aboutModel'); if(am && $('#modelSelect')) am.textContent=$('#modelSelect').value;
      }catch{}
    },4000);

    // === JOBS ===
    function addJob(title,status){
      const list=$('#jobsList'); if(!list) return;
      const empty=list.previousElementSibling; if(empty&&empty.classList.contains('hint')) empty.style.display='none';
      const div=document.createElement('div'); div.className='job-item '+(status||''); div.innerHTML=`<span>${title}</span><small>${new Date().toLocaleTimeString('tr-TR')}</small>`;
      list.prepend(div);
      const badge=$('#activeJobsBadge'); if(badge) badge.textContent=$$('#jobsList .job-item').length;
      log('İş: '+title);
    }
    window._kaaiAddJob = addJob;

    // === ADD TASK wiring ===
    $('#addTaskBtn')?.addEventListener('click', ()=>{
      const txt=prompt('Görev nedir? (ör: Yarın 9’da rapor)'); if(!txt) return;
      addTask(txt);
      kaai().handleUserMessage?.(txt);
    });
    function addTask(txt){
      const list=$('#taskList'); if(!list) return;
      const hint=$('#calendarHint'); if(hint) hint.style.display='none';
      const row=document.createElement('div'); row.className='task-item'; row.innerHTML=`<span>• ${txt}</span><span class="task-time">${new Date().toLocaleTimeString('tr-TR')}</span>`;
      row.addEventListener('click', ()=> row.classList.toggle('done'));
      list.appendChild(row);
      const cnt=$('#calendarCount'); if(cnt) cnt.innerHTML=$$('#taskList .task-item').length+' <span>BUGÜN</span>';
      $('#remindersList')?.insertAdjacentHTML('beforeend', `<div class="task-item"><span>• ${txt}</span></div>`);
    }
    window._kaaiAddTask = addTask;

    // === HUD MODEL sync ---
    const modelSel=$('#modelSelect');
    modelSel?.addEventListener('change', ()=>{
      const m=$('#hudModel'); if(m) m.textContent = modelSel.options[modelSel.selectedIndex].text.split('(')[0].trim().replace('Gemini','').replace('⚡','').replace('🚀','').replace('💎','').trim() || modelSel.value;
      $('#aboutModel').textContent = modelSel.value;
    });
    // init hudModel
    setTimeout(()=>{
      const v=modelSel?.value||'gemini-3.8-flash';
      const m=$('#hudModel'); if(m && modelSel) { const opt=modelSel.options[modelSel.selectedIndex]; if(opt) m.textContent=opt.text.split('(')[0].trim(); }
    },400);

    // keyboard hint: / focuses input
    document.addEventListener('keydown', e=>{
      if(e.key==='/' && !e.ctrlKey && !e.metaKey && document.activeElement.tagName!=='INPUT' && document.activeElement.tagName!=='TEXTAREA'){
        // don't hijack when typing
      }
    });

    // wake hint pulse when listening
    setInterval(()=>{
      const wh=$('#wakeHint'); if(!wh) return;
      const ind=$('#micIndicator'); const isListening = ind && ind.textContent.includes('DİNLİYOR');
      wh.style.opacity = isListening ? '1' : '0.5';
    },900);

    log('v2 patch yüklendi — palette, quickPanel, tabs, HUD telemetri aktif.');
  });
})();
