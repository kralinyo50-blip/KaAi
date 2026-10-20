// Canvas orb animation - glowing fluid rings
let canvas, ctx;
let animationId;
let time = 0;
let speaking = false;
let listening = false;

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
}

export function setOrbSpeaking(v){ speaking=v; }
export function setOrbListening(v){ listening=v; }

function animate(){
  time += 0.012;
  if(!ctx) return;
  ctx.clearRect(0,0,400,400);
  const cx=200, cy=200;

  // multiple wavy rings
  const rings = [
    { r: 90, wobble: 8, speed: 1.0, color: '122,240,255', alpha: 0.18 },
    { r: 115, wobble: 12, speed: 0.8, color: '122,240,255', alpha: 0.12 },
    { r: 140, wobble: 10, speed: 1.2, color: '122,240,255', alpha: 0.08 },
    { r: 165, wobble: 14, speed: 0.7, color: '122,240,255', alpha: 0.05 }
  ];

  rings.forEach((ring, idx)=>{
    const intensity = speaking ? 1.6 : listening ? 1.3 : 1;
    const wobble = ring.wobble * intensity;
    ctx.beginPath();
    for(let a=0;a<Math.PI*2;a+=0.02){
      const offset = Math.sin(a* (3+idx) + time* ring.speed ) * wobble
                   + Math.cos(a*2 + time*0.7) * (wobble*0.5);
      const r = ring.r + offset;
      const x = cx + Math.cos(a)*r;
      const y = cy + Math.sin(a)*r;
      if(a===0) ctx.moveTo(x,y);
      else ctx.lineTo(x,y);
    }
    ctx.closePath();
    ctx.strokeStyle = `rgba(${ring.color},${ring.alpha * (speaking?1.4:1)})`;
    ctx.lineWidth = speaking ? 1.8 : 1.2;
    ctx.stroke();
    // glow
    ctx.shadowColor = `rgba(${ring.color},0.5)`;
    ctx.shadowBlur = speaking ? 12 : 6;
    ctx.stroke();
    ctx.shadowBlur = 0;
  });

  // inner pulsing glow
  const pulse = 1 + Math.sin(time*2)*0.04 + (speaking ? Math.sin(time*8)*0.08 : 0);
  const grd = ctx.createRadialGradient(cx,cy,0,cx,cy,70*pulse);
  grd.addColorStop(0, speaking ? 'rgba(122,240,255,0.9)' : 'rgba(122,240,255,0.55)');
  grd.addColorStop(0.4, 'rgba(122,240,255,0.2)');
  grd.addColorStop(1, 'transparent');
  ctx.beginPath();
  ctx.arc(cx,cy,70*pulse,0,Math.PI*2);
  ctx.fillStyle = grd;
  ctx.fill();

  animationId = requestAnimationFrame(animate);
}
