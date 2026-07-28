/* ============================================================
   script.js — logic for index.html (landing / role picker)
   ============================================================ */

const ROLES = {
  admin:   { label:'Admin',   color:'#9098ff', desc:'Oversee every user, device and alarm on the platform. Manage accounts and system-wide settings.',
             icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z"/></svg>' },
  student: { label:'Student',  color:'#5eeacd', desc:'Track your own focus, fatigue and sleep alarms, and manage personal reminders.',
             icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/></svg>' },
  doctor:  { label:'Doctor',   color:'#ff6b6b', desc:'Monitor patient cognitive health, review escalated alarms and log recommendations.',
             icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 2v4M15 2v4M6 6h12v6a6 6 0 01-12 0V6z"/><path d="M12 14v6M9 20h6"/></svg>' },
  coach:   { label:'Coach',    color:'#ffb454', desc:'Watch alertness and fatigue across your roster and send focus alerts to athletes.',
             icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v6M12 2l-3 3M12 2l3 3"/><circle cx="12" cy="14" r="8"/></svg>' },
};

const SESSION_KEY = 'cogniAlarmSession';

function showToast(msg, type){
  const wrap = document.getElementById('toastWrap');
  if(!wrap) return;
  const el = document.createElement('div');
  el.className = 'toast' + (type ? ' '+type : '');
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(()=>{ el.style.opacity='0'; el.style.transition='opacity .3s'; setTimeout(()=>el.remove(),300); }, 3200);
}

function buildRoleGrid(){
  const grid = document.getElementById('roleGrid');
  grid.innerHTML = Object.keys(ROLES).map(key=>{
    const r = ROLES[key];
    return `<button class="role-card" style="--rc:${r.color}" onclick="loginAs('${key}')">
      <div class="icon-badge">${r.icon}</div>
      <h3>${r.label}</h3>
      <p>${r.desc}</p>
      <span class="go">Continue as ${r.label}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
      </span>
    </button>`;
  }).join('');
}

/* Role-based access flow: store the chosen role + name for dashboard.html to read,
   then navigate there. dashboard.js re-checks this on load and bounces back here
   if nothing (or something invalid) is stored. */
function loginAs(role){
  const nameVal = document.getElementById('nameInput').value.trim();
  const session = { role, name: nameVal || (ROLES[role].label + ' User') };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  window.location.href = 'dashboard.html';
}

/* If dashboard.html redirected back here because of a missing/invalid session,
   it appends ?denied=1 so we can explain why the user landed back on this page. */
function checkDeniedFlag(){
  const params = new URLSearchParams(window.location.search);
  if(params.get('denied') === '1'){
    showToast('Please choose a role to sign in before opening a dashboard.', 'crit');
  }
  if(params.get('signedout') === '1'){
    showToast('Signed out.', 'ok');
  }
}

/* ============================================================
   WAVEFORM (signature element on landing)
   ============================================================ */
function initWave(){
  const canvas = document.getElementById('waveCanvas');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  let t = 0;
  function resize(){
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * devicePixelRatio;
    canvas.height = rect.height * devicePixelRatio;
    ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
  }
  window.addEventListener('resize', resize);
  resize();

  function draw(){
    const w = canvas.getBoundingClientRect().width;
    const h = canvas.getBoundingClientRect().height;
    ctx.clearRect(0,0,w,h);
    // grid
    ctx.strokeStyle = 'rgba(255,255,255,.04)';
    ctx.lineWidth = 1;
    for(let x=0;x<w;x+=30){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke(); }
    for(let y=0;y<h;y+=25){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }

    // cognitive signal wave (cyan)
    ctx.beginPath();
    for(let x=0;x<=w;x+=2){
      const y = h/2 + Math.sin(x*0.03 + t)*14 + Math.sin(x*0.008 + t*0.5)*10;
      x===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
    }
    ctx.strokeStyle = '#5eeacd';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(94,234,205,.6)';
    ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // occasional alarm spike (violet)
    ctx.beginPath();
    for(let x=0;x<=w;x+=2){
      const spike = (Math.sin(x*0.02 - t*1.3) > 0.97) ? 30*Math.random() : 0;
      const y = h/2 + Math.sin(x*0.05 - t*0.8)*6 - spike;
      x===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
    }
    ctx.strokeStyle = 'rgba(144,152,255,.55)';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    t += 0.035;
    requestAnimationFrame(draw);
  }
  draw();

  function tick(){
    document.getElementById('wvFocus').textContent = (70 + Math.round(Math.sin(Date.now()/2000)*8)) ;
    document.getElementById('wvFatigue').textContent = (30 + Math.round(Math.cos(Date.now()/2500)*10));
    document.getElementById('wvAlarms').textContent = (2 + Math.round(Math.abs(Math.sin(Date.now()/4000))*4));
  }
  tick();
  setInterval(tick, 1800);
}

/* ============================================================
   INIT
   ============================================================ */
function initLanding(){
  buildRoleGrid();
  initWave();
  checkDeniedFlag();
}
initLanding();
