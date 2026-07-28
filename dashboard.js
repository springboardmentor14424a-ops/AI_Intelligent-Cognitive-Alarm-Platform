
const SESSION_KEY = 'cogniAlarmSession';

const ROLES = {
  admin:   { label:'Admin',   color:'#9098ff' },
  student: { label:'Student', color:'#5eeacd' },
  doctor:  { label:'Doctor',  color:'#ff6b6b' },
  coach:   { label:'Coach',   color:'#ffb454' },
};

const NAVS = {
  admin:[
    {id:'overview',label:'Overview',icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>'},
    {id:'users',label:'Manage users',icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-4 3-6 7-6s7 2 7 6"/><path d="M17 8a3.5 3.5 0 010 7"/><path d="M22 20c0-3-2-5-4-5.5"/></svg>'},
    {id:'alerts',label:'All alerts',icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a6 6 0 00-6 6v3l-2 4h16l-2-4V8a6 6 0 00-6-6z"/><path d="M9 19a3 3 0 006 0"/></svg>'},
    {id:'system',label:'System',icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.6 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.9.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9V9a1.7 1.7 0 001.5 1h.1a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>'},
  ],
  student:[
    {id:'overview',label:'Overview',icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>'},
    {id:'alarms',label:'Alarm settings',icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a6 6 0 00-6 6v3l-2 4h16l-2-4V8a6 6 0 00-6-6z"/><path d="M9 19a3 3 0 006 0"/></svg>'},
    {id:'reminders',label:'Reminders',icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>'},
  ],
  doctor:[
    {id:'overview',label:'Patients',icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-4 3-6 7-6s7 2 7 6"/></svg>'},
    {id:'alerts',label:'Alerts',icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a6 6 0 00-6 6v3l-2 4h16l-2-4V8a6 6 0 00-6-6z"/><path d="M9 19a3 3 0 006 0"/></svg>'},
    {id:'log',label:'Recommendation log',icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16v16H4z"/><path d="M8 9h8M8 13h5"/></svg>'},
  ],
  coach:[
    {id:'overview',label:'Roster',icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-4 3-6 7-6s7 2 7 6"/></svg>'},
    {id:'schedule',label:'Schedule',icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>'},
    {id:'log',label:'Alerts sent',icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16v16H4z"/><path d="M8 9h8M8 13h5"/></svg>'},
  ],
};

let users = [
  {name:'Ananya Sharma', role:'Student', status:'Active', last:'2 min ago'},
  {name:'Rohit Verma',   role:'Student', status:'Active', last:'14 min ago'},
  {name:'Dr. Priya Rao', role:'Doctor',  status:'Active', last:'1 hr ago'},
  {name:'Coach Vikram Iyer', role:'Coach', status:'Active', last:'3 hr ago'},
  {name:'Meera Nair',    role:'Student', status:'Idle',   last:'1 day ago'},
  {name:'Admin Kavya',   role:'Admin',   status:'Active', last:'5 min ago'},
];

let allAlerts = [
  {user:'Ananya Sharma', role:'Student', type:'Focus drop',      sev:'warn', time:'09:14 AM', status:'ok'},
  {user:'Rohit Verma',   role:'Student', type:'Sleep deficit',   sev:'crit', time:'07:40 AM', status:'warn'},
  {user:'Rahul Menon',   role:'Coach roster', type:'Fatigue spike', sev:'crit', time:'06:55 AM', status:'warn'},
  {user:'Meera Nair',    role:'Student', type:'Stress spike',    sev:'warn', time:'Yesterday', status:'ok'},
  {user:'Device #A1102', role:'System',  type:'Sensor offline',  sev:'warn', time:'Yesterday', status:'ok'},
  {user:'Devika Singh',  role:'Patient', type:'Cognitive decline flag', sev:'crit', time:'2 days ago', status:'warn'},
];

let patients = [
  {name:'Devika Singh', risk:'crit', lastAlarm:'Cognitive decline flag', trend:'↓ declining',
   detail:{focus:44, fatigue:82, sleep:'4.2 hrs avg', notes:'Reports persistent brain fog and poor sleep for 5 days.'}},
  {name:'Arjun Kapoor', risk:'warn', lastAlarm:'Stress spike', trend:'→ stable',
   detail:{focus:61, fatigue:58, sleep:'6.1 hrs avg', notes:'Elevated stress around exam period, sleep improving slowly.'}},
  {name:'Sana Sheikh',  risk:'ok',  lastAlarm:'None in 5 days', trend:'↑ improving',
   detail:{focus:84, fatigue:22, sleep:'7.6 hrs avg', notes:'Consistent routine, no flags this week.'}},
  {name:'Karan Malhotra', risk:'warn', lastAlarm:'Sleep deficit', trend:'↓ declining',
   detail:{focus:58, fatigue:66, sleep:'5.0 hrs avg', notes:'New alarm triggered twice this week around late-night study.'}},
];

let athletes = [
  {name:'Rahul Menon',  alert:38, fatigue:81, status:'crit'},
  {name:'Neha Joshi',   alert:64, fatigue:48, status:'warn'},
  {name:'Vikas Chauhan',alert:88, fatigue:14, status:'ok'},
  {name:'Priya Das',    alert:91, fatigue:9,  status:'ok'},
  {name:'Farhan Ali',   alert:70, fatigue:33, status:'warn'},
];

let recLog = [];
let coachLog = [];
let selectedPatientIdx = null;

/* ============================================================
   HELPERS
   ============================================================ */
function badgeClass(sev){ return {crit:'crit', warn:'warn', ok:'ok'}[sev] || 'mut'; }
function badgeLabel(sev){ return {crit:'Critical', warn:'Warning', ok:'Resolved'}[sev] || sev; }

function showToast(msg, type){
  const wrap = document.getElementById('toastWrap');
  const el = document.createElement('div');
  el.className = 'toast' + (type ? ' '+type : '');
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(()=>{ el.style.opacity='0'; el.style.transition='opacity .3s'; setTimeout(()=>el.remove(),300); }, 3200);
}

/* ============================================================
   SESSION GUARD / ROLE-BASED ACCESS
   ============================================================ */
function getSession(){
  try{
    const raw = sessionStorage.getItem(SESSION_KEY);
    if(!raw) return null;
    const s = JSON.parse(raw);
    if(!s || !ROLES[s.role]) return null;
    return s;
  }catch(e){ return null; }
}

function logout(){
  sessionStorage.removeItem(SESSION_KEY);
  window.location.href = 'index.html?signedout=1';
}

function applySession(session){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  const topbar = document.getElementById('topbar');

  if(!session){
    // no valid role-session found -> bounce back to landing to sign in
    window.location.href = 'index.html?denied=1';
    return false;
  }

  const role = session.role;
  document.getElementById('page-' + role).classList.add('active');
  topbar.classList.add('show');
  document.documentElement.style.setProperty('--role-color', ROLES[role].color);
  document.getElementById('topbarAvatar').textContent = (session.name||'?').trim()[0].toUpperCase();
  document.getElementById('topbarAvatar').style.background = ROLES[role].color;
  document.getElementById('topbarName').textContent = session.name;
  document.getElementById('topbarRole').textContent = ROLES[role].label + ' access';
  document.getElementById('topbarRole').style.color = ROLES[role].color;

  if(role === 'student'){
    document.getElementById('studentGreeting').textContent = 'Welcome back, ' + session.name.split(' ')[0] + '.';
  }
  return true;
}

/* ============================================================
   SIDEBAR NAV BUILD + VIEW SWITCHING
   ============================================================ */
function buildSidebars(){
  Object.keys(NAVS).forEach(role=>{
    const nav = document.getElementById(role+'Nav');
    NAVS[role].forEach((item,i)=>{
      const btn = document.createElement('div');
      btn.className = 'nav-item' + (i===0 ? ' active':'');
      btn.innerHTML = item.icon + '<span>'+item.label+'</span>';
      btn.addEventListener('click', ()=>switchView(role, item.id, btn));
      nav.appendChild(btn);
    });
  });
}
function switchView(role, viewId, btnEl){
  document.querySelectorAll('#'+role+'Nav .nav-item').forEach(n=>n.classList.remove('active'));
  btnEl.classList.add('active');
  document.querySelectorAll('#page-'+role+' .view').forEach(v=>v.classList.remove('active'));
  document.getElementById(role+'-'+viewId).classList.add('active');
}

/* ============================================================
   MINI BAR CHARTS (admin / coach) — built with plain divs
   ============================================================ */
function renderMiniBars(containerId, data){
  const el = document.getElementById(containerId);
  const max = Math.max(...data.map(d=>d.v));
  el.innerHTML = data.map(d=>{
    const pct = Math.max(6, Math.round((d.v/max)*100));
    return `<div class="mini-bar" style="height:${pct}%;"><span class="lbl">${d.l}</span></div>`;
  }).join('');
  el.style.marginBottom = '22px';
}

/* ============================================================
   ADMIN VIEW RENDERING
   ============================================================ */
function renderAdminOverviewAlerts(){
  const body = document.getElementById('admAlertsBody');
  body.innerHTML = allAlerts.slice(0,6).map((a,i)=>`
    <tr>
      <td>${a.user}</td><td>${a.role}</td><td>${a.type}</td>
      <td><span class="badge ${badgeClass(a.sev)}">${badgeLabel(a.sev)}</span></td>
      <td>${a.time}</td>
      <td><span class="badge ${a.status==='ok'?'ok':'warn'}">${a.status==='ok'?'Resolved':'Open'}</span></td>
      <td><button class="btn btn-sm" onclick="resolveAlert(${i})">Mark resolved</button></td>
    </tr>`).join('');
  document.getElementById('admCritCount').textContent = allAlerts.filter(a=>a.sev==='crit' && a.status!=='ok').length;
  document.getElementById('admActiveAlarms').textContent = allAlerts.filter(a=>a.status!=='ok').length;
}
function resolveAlert(i){
  allAlerts[i].status = 'ok';
  renderAdminOverviewAlerts();
  renderAdminAllAlerts();
  showToast('Alert marked resolved.', 'ok');
}
let admAlertFilterState = 'all';
function renderAdminAllAlerts(){
  const body = document.getElementById('admAllAlertsBody');
  let list = allAlerts;
  if(admAlertFilterState !== 'all'){
    list = allAlerts.filter(a => admAlertFilterState==='ok' ? a.status==='ok' : (a.sev===admAlertFilterState && a.status!=='ok'));
  }
  body.innerHTML = list.length ? list.map((a)=>{
    const idx = allAlerts.indexOf(a);
    return `<tr>
      <td>${a.user}</td><td>${a.role}</td><td>${a.type}</td>
      <td><span class="badge ${badgeClass(a.sev)}">${badgeLabel(a.sev)}</span></td>
      <td>${a.time}</td>
      <td><span class="badge ${a.status==='ok'?'ok':'warn'}">${a.status==='ok'?'Resolved':'Open'}</span></td>
      <td>${a.status==='ok' ? '' : `<button class="btn btn-sm" onclick="resolveAlert(${idx})">Mark resolved</button>`}</td>
    </tr>`;
  }).join('') : `<tr><td colspan="7"><div class="empty-state">No alerts match this filter.</div></td></tr>`;
}
document.getElementById('admAlertFilter').addEventListener('click', (e)=>{
  const btn = e.target.closest('button'); if(!btn) return;
  document.querySelectorAll('#admAlertFilter button').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  admAlertFilterState = btn.dataset.f;
  renderAdminAllAlerts();
});

function renderUsers(filter){
  const body = document.getElementById('usersBody');
  const f = (filter||'').toLowerCase();
  const list = users.filter(u => u.name.toLowerCase().includes(f) || u.role.toLowerCase().includes(f));
  body.innerHTML = list.length ? list.map((u)=>{
    const idx = users.indexOf(u);
    return `<tr>
      <td>${u.name}</td>
      <td><span class="badge info">${u.role}</span></td>
      <td><span class="badge ${u.status==='Active'?'ok':'mut'}">${u.status}</span></td>
      <td>${u.last}</td>
      <td><button class="btn btn-sm btn-danger" onclick="removeUser(${idx})">Remove</button></td>
    </tr>`;
  }).join('') : `<tr><td colspan="5"><div class="empty-state">No users match "${filter}".</div></td></tr>`;
}
function removeUser(idx){
  const u = users[idx];
  users.splice(idx,1);
  renderUsers(document.getElementById('userSearch').value);
  showToast(`Removed ${u.name}.`, 'crit');
}
document.getElementById('userSearch').addEventListener('input', (e)=>renderUsers(e.target.value));
document.getElementById('addUserBtn').addEventListener('click', ()=>{
  const nameEl = document.getElementById('newUserName');
  const roleEl = document.getElementById('newUserRole');
  const name = nameEl.value.trim();
  if(!name){ showToast('Enter a name first.', 'crit'); return; }
  users.unshift({name, role:roleEl.value, status:'Active', last:'just now'});
  nameEl.value='';
  renderUsers(document.getElementById('userSearch').value);
  showToast(`Added ${name} as ${roleEl.value}.`, 'ok');
});

const sysSens = document.getElementById('sysSensitivity');
sysSens.addEventListener('input', ()=>{ document.getElementById('sysSensitivityVal').textContent = sysSens.value+'%'; });

/* ============================================================
   STUDENT VIEW RENDERING
   ============================================================ */
let tasks = [
  {text:'Complete focus check-in', done:true, time:'8:00 AM'},
  {text:'30-min study block review', done:true, time:'11:00 AM'},
  {text:'Take a 10-min screen break', done:false, time:'3:30 PM'},
  {text:'Log sleep hours for last night', done:false, time:'9:00 PM'},
];
let studentAlarms = [
  {title:'Focus drop detected', meta:'During afternoon study block · 2:14 PM', color:'var(--amber)'},
  {title:'Stress spike detected', meta:'Before exam review · 10:05 AM', color:'var(--red)'},
  {title:'Good rest streak — 3 days', meta:'Positive signal · this morning', color:'var(--green)'},
];
function renderTasks(){
  const list = document.getElementById('taskList');
  list.innerHTML = tasks.map((t,i)=>`
    <div class="checklist-item ${t.done?'done':''}">
      <input type="checkbox" ${t.done?'checked':''} onchange="toggleTask(${i})">
      <span class="cl-text">${t.text}</span>
      <span class="cl-time">${t.time}</span>
    </div>`).join('');
  const doneCount = tasks.filter(t=>t.done).length;
  document.getElementById('taskTag').textContent = `${doneCount}/${tasks.length}`;
  document.getElementById('taskProgress').style.width = Math.round(doneCount/tasks.length*100)+'%';
}
function toggleTask(i){ tasks[i].done = !tasks[i].done; renderTasks(); }

function renderStudentAlarms(){
  const wrap = document.getElementById('studentAlarms');
  wrap.innerHTML = studentAlarms.length ? studentAlarms.map((a,i)=>`
    <div class="alarm-item">
      <span class="dot" style="background:${a.color};"></span>
      <div class="body"><div class="title">${a.title}</div><div class="meta">${a.meta}</div></div>
      <button class="btn btn-sm" onclick="dismissAlarm(${i})">Dismiss</button>
    </div>`).join('') : `<div class="empty-state">No alarms — you're all clear.</div>`;
}
function dismissAlarm(i){ studentAlarms.splice(i,1); renderStudentAlarms(); showToast('Alarm dismissed.', 'ok'); }

const stuSens = document.getElementById('stuSensitivity');
stuSens.addEventListener('input', ()=>{ document.getElementById('stuSensitivityVal').textContent = stuSens.value+'%'; });

/* ============================================================
   DOCTOR VIEW RENDERING
   ============================================================ */
function renderPatients(){
  const body = document.getElementById('patientsBody');
  body.innerHTML = patients.map((p,i)=>`
    <tr class="patient-row ${selectedPatientIdx===i?'selected':''}" onclick="selectPatient(${i})">
      <td>${p.name}</td>
      <td><span class="badge ${badgeClass(p.risk)}">${p.risk==='crit'?'High':p.risk==='warn'?'Moderate':'Low'}</span></td>
      <td>${p.lastAlarm}</td>
      <td>${p.trend}</td>
    </tr>`).join('');
}
function selectPatient(i){
  selectedPatientIdx = i;
  renderPatients();
  const p = patients[i];
  const panel = document.getElementById('patientDetail');
  panel.innerHTML = `
    <div class="panel-head"><h3>${p.name}</h3><span class="badge ${badgeClass(p.risk)}">${p.risk==='crit'?'High risk':p.risk==='warn'?'Moderate risk':'Low risk'}</span></div>
    <div class="row-flex" style="gap:18px;margin-bottom:14px;">
      <div><div class="k-value" style="font-size:20px;">${p.detail.focus}</div><div class="k-label">Focus idx</div></div>
      <div><div class="k-value" style="font-size:20px;color:var(--amber);">${p.detail.fatigue}</div><div class="k-label">Fatigue idx</div></div>
      <div><div class="k-value" style="font-size:14px;">${p.detail.sleep}</div><div class="k-label">Sleep</div></div>
    </div>
    <p style="font-size:12.5px;color:var(--text-dim);line-height:1.6;">${p.detail.notes}</p>
    <hr class="sep">
    <label style="font-size:12px;color:var(--text-dim);">Add recommendation</label>
    <textarea id="recText" placeholder="e.g. Recommend earlier bedtime and reduced screen time after 9pm..."></textarea>
    <div style="margin-top:8px;"><button class="btn btn-accent btn-sm" onclick="saveRecommendation(${i})">Save recommendation</button></div>
  `;
}
function saveRecommendation(i){
  const text = document.getElementById('recText').value.trim();
  if(!text){ showToast('Write a recommendation first.', 'crit'); return; }
  const p = patients[i];
  recLog.unshift({patient:p.name, text, time:new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})});
  renderRecLog();
  showToast(`Recommendation saved for ${p.name}.`, 'ok');
  selectPatient(i);
}
function renderRecLog(){
  const el = document.getElementById('recLog');
  el.innerHTML = recLog.length ? recLog.map(r=>`
    <div class="log-entry"><b>${r.patient}</b> · ${r.time}<br>${r.text}</div>
  `).join('') : `<div class="empty-state">No recommendations saved yet. Add one from a patient's detail panel.</div>`;
}
function renderDoctorAlerts(){
  const body = document.getElementById('doctorAlertsBody');
  const list = allAlerts.filter(a=>a.role==='Patient' || a.role==='Student');
  body.innerHTML = list.map((a)=>{
    const idx = allAlerts.indexOf(a);
    return `<tr>
      <td>${a.user}</td><td>${a.type}</td>
      <td><span class="badge ${badgeClass(a.sev)}">${badgeLabel(a.sev)}</span></td>
      <td>${a.time}</td>
      <td><span class="badge ${a.status==='ok'?'ok':'warn'}">${a.status==='ok'?'Resolved':'Open'}</span></td>
      <td>${a.status==='ok' ? '' : `<button class="btn btn-sm" onclick="resolveAlert(${idx})">Mark resolved</button>`}</td>
    </tr>`;
  }).join('');
}

/* ============================================================
   COACH VIEW RENDERING
   ============================================================ */
function renderAthletes(){
  const body = document.getElementById('athletesBody');
  body.innerHTML = athletes.map((a,i)=>`
    <tr>
      <td>${a.name}</td>
      <td>${a.alert}</td>
      <td>${a.fatigue}</td>
      <td><span class="badge ${badgeClass(a.status)}">${a.status==='crit'?'At risk':a.status==='warn'?'Fatigued':'Ready'}</span></td>
      <td><button class="btn btn-sm" onclick="sendFocusAlert(${i})">Send focus alert</button></td>
    </tr>`).join('');
}
function sendFocusAlert(i){
  const a = athletes[i];
  coachLog.unshift({athlete:a.name, time:new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}), msg:'Focus/rest alert sent — recommended recovery break.'});
  renderCoachLog();
  showToast(`Focus alert sent to ${a.name}.`, 'ok');
}
function renderCoachLog(){
  const el = document.getElementById('coachLog');
  el.innerHTML = coachLog.length ? coachLog.map(c=>`
    <div class="log-entry"><b>${c.athlete}</b> · ${c.time}<br>${c.msg}</div>
  `).join('') : `<div class="empty-state">No alerts sent yet. Send one from the athlete roster.</div>`;
}

/* ============================================================
   INIT
   ============================================================ */
function initDashboard(){
  const session = getSession();
  const ok = applySession(session);
  if(!ok) return; // redirected to index.html already

  document.getElementById('logoutBtn').addEventListener('click', logout);
  buildSidebars();

  renderAdminOverviewAlerts();
  renderAdminAllAlerts();
  renderUsers('');
  renderMiniBars('adminChart', [
    {l:'Mon',v:18},{l:'Tue',v:22},{l:'Wed',v:14},{l:'Thu',v:27},{l:'Fri',v:20},{l:'Sat',v:9},{l:'Sun',v:12}
  ]);

  renderTasks();
  renderStudentAlarms();

  renderPatients();
  renderDoctorAlerts();
  renderRecLog();

  renderAthletes();
  renderCoachLog();
  renderMiniBars('coachChart', athletes.map(a=>({l:a.name.split(' ')[0], v:a.alert})));
}
initDashboard();
