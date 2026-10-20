// KaAi Orb - Gelişmiş animasyon, sol menü senkronu
let canvas, ctx;
let time = 0;
let speaking = false;
let listening = false;
let audioLevel = 0;
let audioInterval = null;

export function initOrb(){
  canvas = document.getElementById('orbCanvas');
  if(!canvas) return;
  ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  canvas.width = 400 * dpr;
  canvas.height = 400 * dpr;
  canvas.style.width = '400px';
  canvas.style.height = '400px';
  ctx.scale(dpr,dpr);
  animate();
  // Audio level simulation when speaking
  simulateAudioLevel();
}

export function setOrbSpeaking(v){
  speaking = v;
  document.getElementById('orbCore')?.classList.toggle('speaking', v);
  document.getElementById('leftPanel')?.classList.toggle('speaking', v);
  document.getElementById('voiceWave')?.classList.toggle('active', v);
  document.getElementById('audioBars')?.classList.toggle('active', v);
  if(v) audioLevel = 0.8;
}
export function setOrbListening(v){
  listening = v;
  document.getElementById('orbCore')?.classList.toggle('listening', v);
  document.getElementById('leftPanel')?.classList.toggle('listening', v);
  document.getElementById('topOrbMini')?.classList.toggle('listening', v);
}
export function setAudioLevel(lvl){
  audioLevel = Math.max(0, Math.min(1, lvl));
}

function simulateAudioLevel(){
  // TTS sırasında ses seviyesini taklit et
  setInterval(()=>{
    if(speaking){
      audioLevel = 0.5 + Math.random()*0.5;
      const bars = document.querySelectorAll('#audioBars span, #voiceWave span');
      bars.forEach(b=>{
        const h = 8 + audioLevel * 16 * Math.random();
        b.style.height = h+'px';
      });
      // Sol menü widget'ları da titret
      const cpuWidget = document.getElementById('cpuWidget');
      if(cpuWidget) cpuWidget.style.transform = `scale(${1 + audioLevel*0.03})`;
    } else if(listening){
      audioLevel = 0.2 + Math.random()*0.3;
    } else {
      audioLevel = 0;
    }
  }, 120);
}

function animate(){
  time += 0.010;
  if(!ctx) { requestAnimationFrame(animate); return; }
  ctx.clearRect(0,0,400,400);
  const cx=200, cy=200;

  // Rings - daha canlı, sola senkron
  const rings = [
    { r: 88, wobble: 7, speed: 1.0, color: '122,240,255', alpha: 0.20 },
    { r: 112, wobble: 11, speed: 0.85, color: '122,240,255', alpha: 0.13 },
    { r: 136, wobble: 9, speed: 1.15, color: '122,240,255', alpha: 0.09 },
    { r: 160, wobble: 13, speed: 0.7, color: '122,240,255', alpha: 0.06 },
    { r: 182, wobble: 8, speed: 0.9, color: '122,240,255', alpha: 0.04 }
  ];

  rings.forEach((ring, idx)=>{
    const intensity = speaking ? (1.4 + audioLevel*0.8) : listening ? 1.25 : 1;
    const wobble = ring.wobble * intensity;
    const wave = (speaking || listening) ? Math.sin(time*6 + idx)*2 : 0;
    ctx.beginPath();
    for(let a=0;a<Math.PI*2;a+=0.025){
      const offset = Math.sin(a* (3+idx*0.7) + time* ring.speed * (speaking?1.6:1) ) * wobble
                   + Math.cos(a*2 + time*0.7) * (wobble*0.4)
                   + wave;
      const r = ring.r + offset;
      const x = cx + Math.cos(a)*r;
      const y = cy + Math.sin(a)*r;
      if(a===0) ctx.moveTo(x,y);
      else ctx.lineTo(x,y);
    }
    ctx.closePath();
    const alpha = ring.alpha * (speaking?1.6: listening?1.3:1);
    ctx.strokeStyle = listening ? `rgba(0,230,118,${alpha})` : `rgba(${ring.color},${alpha})`;
    ctx.lineWidth = speaking ? 1.7 : listening ? 1.4 : 1.2;
    ctx.stroke();
    ctx.shadowColor = listening ? `rgba(0,230,118,0.5)` : `rgba(${ring.color},0.5)`;
    ctx.shadowBlur = speaking ? 12 + audioLevel*8 : 6;
    ctx.stroke();
    ctx.shadowBlur = 0;
  });

  // Inner glow - konuşmaya duyarlı
  const pulseBase = 1 + Math.sin(time*1.8)*0.04;
  const pulseSpeak = speaking ? Math.sin(time*7)*0.08 * audioLevel : 0;
  const pulse = pulseBase + pulseSpeak;
  const grd = ctx.createRadialGradient(cx,cy,0,cx,cy,72*pulse);
  if(listening){
    grd.addColorStop(0, 'rgba(0,230,118,0.7)');
    grd.addColorStop(0.4, 'rgba(0,230,118,0.15)');
  } else if(speaking){
    grd.addColorStop(0, `rgba(122,240,255,${0.85 + audioLevel*0.15})`);
    grd.addColorStop(0.4, 'rgba(122,240,255,0.22)');
  } else {
    grd.addColorStop(0, 'rgba(122,240,255,0.55)');
    grd.addColorStop(0.4, 'rgba(122,240,255,0.18)');
  }
  grd.addColorStop(1, 'transparent');
  ctx.beginPath();
  ctx.arc(cx,cy,72*pulse,0,Math.PI*2);
  ctx.fillStyle = grd;
  ctx.fill();

  // Frequency bars around orb when speaking
  if(speaking && audioLevel > 0.3){
    const bars = 16;
    for(let i=0;i<bars;i++){
      const angle = (i / bars) * Math.PI*2 + time*0.5;
      const len = 6 + audioLevel * 12 * Math.random();
      const r1 = 78;
      const r2 = r1 + len;
      const x1 = cx + Math.cos(angle)*r1;
      const y1 = cy + Math.sin(angle)*r1;
      const x2 = cx + Math.cos(angle)*r2;
      const y2 = cy + Math.sin(angle)*r2;
      ctx.beginPath();
      ctx.moveTo(x1,y1);
      ctx.lineTo(x2,y2);
      ctx.strokeStyle = `rgba(122,240,255,${0.3 + audioLevel*0.4})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  requestAnimationFrame(animate);
}
