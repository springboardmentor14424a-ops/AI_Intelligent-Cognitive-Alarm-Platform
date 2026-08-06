// ── Read token from URL if coming from Google OAuth ──────────
const urlParams = new URLSearchParams(window.location.search);
const urlToken  = urlParams.get('token');
const urlName   = urlParams.get('name');
const urlRole   = urlParams.get('role');

if (urlToken) {
    localStorage.setItem('token', urlToken);
    localStorage.setItem('user', JSON.stringify({
        id:        parseInt(urlParams.get('id') || '0'),
        full_name: decodeURIComponent(urlName || ''),
        role:      urlRole || 'user'
    }));
    window.history.replaceState({}, document.title, 'dashboard.html');
}

// ── Step 1: Check login on every dashboard page load ─────────
const user = JSON.parse(localStorage.getItem('user'));
const token = localStorage.getItem('token');if (!token || !user) {
    window.location.href = 'index.html';
}

// ── Step 3: Sign out function ─────────────────────────────────
function signOut() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

document.addEventListener('DOMContentLoaded', () => {
  const roleTabs = document.querySelectorAll('.role-tab');

  // ── Step 2: Show user name + auto-open correct panel by role ──
  if (user) {
    // Display the logged-in user's name in the header if element exists
    const userNameEl = document.getElementById('loggedInUser');
    if (userNameEl) userNameEl.textContent = user.full_name;

    // Auto-open the panel that matches the user's role
    let targetPanelId = 'user-panel'; // default
    if (user.role === 'admin')           targetPanelId = 'admin-panel';
    else if (user.role === 'wellness_coach') targetPanelId = 'coach-panel';

    // Deactivate all panels and tabs
    document.querySelectorAll('.panel-section').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.role-tab').forEach(t => t.classList.remove('active'));

    // Activate the correct panel and its matching tab
    const correctPanel = document.getElementById(targetPanelId);
    const correctTab   = document.querySelector(`[data-target="${targetPanelId}"]`);
    if (correctPanel) correctPanel.classList.add('active');
    if (correctTab)   correctTab.classList.add('active');

    // Init sidebar for this role
    const sidebarRole = user.role === 'wellness_coach' ? 'coach' : user.role === 'admin' ? 'admin' : 'user';
    initSidebar(sidebarRole);
  }

  // ── Load alarms from database on page load ───────────────────
  if (user && user.id && user.id > 0) {
    fetch(`http://localhost:8000/alarms/${user.id}`)
      .then(res => res.json())
      .then(alarms => {
        const historyTable = document.querySelector('.data-table tbody');
        if (!historyTable || !alarms.length) return;
        historyTable.innerHTML = '';
        alarms.forEach(alarm => {
          const row = document.createElement('tr');
          row.setAttribute('data-alarm-id', alarm.id);

          const challengeLabels = { math: 'Math Problems', logic: 'Logic Puzzles', memory: 'Memory Challenges', word: 'Word Games' };
          const challengeDisplay = challengeLabels[alarm.challenge] || alarm.challenge;
          const [h, m] = alarm.alarm_time.split(':');
          const hr = parseInt(h);
          const ampm = hr >= 12 ? 'PM' : 'AM';
          const hr12 = hr % 12 || 12;
          const formattedTime = `${String(hr12).padStart(2,'0')}:${m} ${ampm}`;

          // Format date from created_at
          const d = new Date(alarm.created_at);
          const dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

          row.innerHTML = `
            <td>${dateStr}</td>
            <td>${formattedTime}</td>
            <td>${alarm.title}</td>
            <td>${alarm.alarm_type}</td>
            <td>--</td>
            <td>--</td>
            <td>${challengeDisplay} · ${alarm.difficulty_level}</td>
            <td><span class="badge ${alarm.is_active ? 'badge-success' : 'badge-warning'}">
              ${alarm.is_active ? 'Active' : 'Disabled'}
            </span></td>
            <td class="kebab-cell">
              <button class="kebab-btn" onclick="toggleKebab(this)">
                <span></span><span></span><span></span>
              </button>
              <div class="kebab-menu">
                <button onclick="editAlarm(${alarm.id},'${alarm.alarm_time}','${alarm.title}',true);closeKebab()">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Edit
                </button>
                <button onclick="toggleAlarm(${alarm.id},this);closeKebab()">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                  ${alarm.is_active ? 'Disable' : 'Enable'}
                </button>
                <button class="kebab-danger" onclick="deleteAlarm(${alarm.id},this);closeKebab()">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                  Remove
                </button>
              </div>
            </td>
          `;
          historyTable.appendChild(row);
        });
      })
      .catch(() => {});
  }
  roleTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetPanelId = tab.getAttribute('data-target');
      const targetPanel = document.getElementById(targetPanelId);

      if (!targetPanel || tab.classList.contains('active')) return;

      document.querySelectorAll('.role-tab.active').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.panel-section.active').forEach(p => p.classList.remove('active'));

      tab.classList.add('active');

      setTimeout(() => {
        targetPanel.classList.add('active');
        // Update sidebar for the switched role
        const roleMap = { 'user-panel': 'user', 'coach-panel': 'coach', 'admin-panel': 'admin' };
        const newRole = roleMap[targetPanelId];
        if (newRole) initSidebar(newRole);
      }, 150);
    });
  });

  // 2. CHECK URL PARAMETER FOR ROLE INTERCONNECTION
  const urlParams = new URLSearchParams(window.location.search);
  const roleParam = urlParams.get('role');
  if (roleParam) {
    let targetTab = null;
    if (roleParam === 'user') targetTab = document.querySelector('[data-target="user-panel"]');
    if (roleParam === 'coach') targetTab = document.querySelector('[data-target="coach-panel"]');
    if (roleParam === 'admin') targetTab = document.querySelector('[data-target="admin-panel"]');
    
    if (targetTab) {
      targetTab.click();
    }
  }

  // 3. TABLE BUTTON CLICK INTERACTION (For mock interactive feedback)
  const actionButtons = document.querySelectorAll('.btn-action, .btn-download, .btn-table-edit');
  actionButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      const originalText = button.textContent;
      if (button.classList.contains('btn-download')) {
        button.textContent = 'Downloading...';
        button.disabled = true;
        setTimeout(() => {
          button.textContent = 'Downloaded';
          button.style.backgroundColor = '#22c55e';
          button.style.color = '#ffffff';
        }, 1200);
      } else if (button.classList.contains('btn-action')) {
        button.textContent = 'Done!';
        button.style.borderColor = '#22c55e';
        button.style.color = '#22c55e';
        button.disabled = true;
      }
    });
  });

  // 4. ALARM SETTER FORM SUBMISSION — wired to backend
  const alarmForm = document.getElementById('alarm-setter-form');
  if (alarmForm) {
    alarmForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const timeVal      = document.getElementById('alarm-time').value;
      const challengeVal = document.getElementById('alarm-challenge').value;
      const repeatVal    = [...document.querySelectorAll('.ac-day:not(.ac-never).active')].length > 0;
      const challengeText = document.getElementById('alarm-challenge').options[document.getElementById('alarm-challenge').selectedIndex].text;

      const saveBtn = alarmForm.querySelector('.btn-alarm-set');
      const btnText = saveBtn.querySelector('.btn-text');

      try {
        const res = await fetch('http://localhost:8000/alarms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id:          user.id,
            title:            document.getElementById('alarm-label').value || 'My Alarm',
            alarm_time:       timeVal,
            alarm_type:       document.getElementById('alarm-type')?.value || 'daily',
            repeat_days:      [...document.querySelectorAll('.ac-day:not(.ac-never).active')].map(d => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getAttribute('data-day')]).join(',') || 'Never',
            challenge:        document.getElementById('alarm-challenge')?.value || 'math',
            difficulty_level: document.getElementById('alarm-difficulty')?.value || 'medium',
            sound:            document.getElementById('alarm-sound')?.value || 'default',
            vibration:        true,
            snooze_enabled:   document.getElementById('alarm-snooze')?.checked ?? true
          })
        });
        const alarm = await res.json();

        btnText.textContent = 'SAVED!';
        saveBtn.style.background = 'linear-gradient(90deg, #22c55e, #15803d)';
        setTimeout(() => {
          btnText.textContent = 'Save Alarm';
          saveBtn.style.background = '';
          acReset(); // clear form after save
          document.getElementById('alarmModalOverlay').classList.remove('open');
        }, 1500);

        // Add row to alarm history table
        const historyTable = document.querySelector('.data-table tbody');
        if (historyTable && alarm.id) {
          // Format time properly with AM/PM
          const [nh, nm] = timeVal.split(':');
          const nhr = parseInt(nh);
          const nampm = nhr >= 12 ? 'PM' : 'AM';
          const nhr12 = nhr % 12 || 12;
          const displayTime = `${String(nhr12).padStart(2,'0')}:${nm} ${nampm}`;
          const diffVal = document.getElementById('alarm-difficulty')?.value || 'medium';
          const today = new Date().toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });

          const newRow = document.createElement('tr');
          newRow.setAttribute('data-alarm-id', alarm.id);
          newRow.innerHTML = `
            <td>${today}</td>
            <td>${displayTime}</td>
            <td>${document.getElementById('alarm-label')?.value || 'My Alarm'}</td>
            <td>${document.getElementById('alarm-type')?.value || 'daily'}</td>
            <td>--</td>
            <td>--</td>
            <td>${challengeText} · ${diffVal}</td>
            <td><span class="badge badge-success">Active</span></td>
            <td class="kebab-cell">
              <button class="kebab-btn" onclick="toggleKebab(this)">
                <span></span><span></span><span></span>
              </button>
              <div class="kebab-menu">
                <button onclick="editAlarm(${alarm.id},'${timeVal}','${document.getElementById('alarm-challenge').value}',true);closeKebab()">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Edit
                </button>
                <button onclick="toggleAlarm(${alarm.id},this);closeKebab()">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                  Disable
                </button>
                <button class="kebab-danger" onclick="deleteAlarm(${alarm.id},this);closeKebab()">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                  Remove
                </button>
              </div>
            </td>
          `;
          historyTable.insertBefore(newRow, historyTable.firstChild);
        }

      } catch (err) {
        alert('Cannot connect to server. Make sure the backend is running.');
      }
    });
  }

  // Helper to format HTML5 24h time value (e.g. 06:30 -> 06:30 AM)
  function formatTime(timeString) {
    if (!timeString) return '';
    const [hourStr, minStr] = timeString.split(':');
    let hour = parseInt(hourStr, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    hour = hour ? hour : 12; // the hour '0' should be '12'
    const formattedHour = hour < 10 ? '0' + hour : hour;
    return `${formattedHour}:${minStr} ${ampm}`;
  }
  // 5. HABIT SCORE INTERACTION
  const habitCheckboxes = document.querySelectorAll('.habit-checkbox');
  const progressPercentText = document.getElementById('habit-progress-percent');
  const progressPercentFill = document.getElementById('habit-progress-fill');

  if (habitCheckboxes.length > 0 && progressPercentText && progressPercentFill) {
    const updateHabitProgress = () => {
      const totalHabits = habitCheckboxes.length;
      const checkedHabits = document.querySelectorAll('.habit-checkbox:checked').length;
      const percentage = Math.round((checkedHabits / totalHabits) * 100);
      
      progressPercentText.textContent = `${percentage}%`;
      progressPercentFill.style.width = `${percentage}%`;
    };

    habitCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', updateHabitProgress);
    });
  }
});

// ── Alarm CRUD functions ──────────────────────────────────────

async function editAlarm(alarmId, currentTime, currentLabel, currentRepeat) {
  const newTime  = prompt('New alarm time (HH:MM):', currentTime);
  if (!newTime) return;
  const newLabel = prompt('New label:', currentLabel);
  if (newLabel === null) return;

  try {
    const res = await fetch(`http://localhost:8000/alarms/${alarmId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title:            newLabel,
        alarm_time:       newTime + ':00',
        alarm_type:       'daily',
        repeat_days:      'Mon-Fri',
        difficulty_level: 'medium',
        sound:            'default',
        vibration:        true,
        snooze_enabled:   true
      })
    });
    if (res.ok) {
      // Update the row in the table
      const row = document.querySelector(`tr[data-alarm-id="${alarmId}"]`);
      if (row) {
        const cells = row.querySelectorAll('td');
        const [nh, nm] = newTime.split(':');
        const nhr = parseInt(nh);
        const nampm = nhr >= 12 ? 'PM' : 'AM';
        const nhr12 = nhr % 12 || 12;
        cells[1].textContent = `${String(nhr12).padStart(2,'0')}:${nm} ${nampm}`;
        cells[2].textContent = newLabel;
      }
    }
  } catch (err) {
    alert('Cannot connect to server.');
  }
}

async function toggleAlarm(alarmId, btn) {
  try {
    const res  = await fetch(`http://localhost:8000/alarms/${alarmId}/toggle`, { method: 'PATCH' });
    const data = await res.json();
    if (res.ok) {
      btn.textContent = data.is_active ? 'Disable' : 'Enable';
      btn.style.color = data.is_active ? '#EF4444' : '#22C55E';
    }
  } catch (err) {
    alert('Cannot connect to server.');
  }
}

async function deleteAlarm(alarmId, btn) {
  if (!confirm('Delete this alarm?')) return;
  try {
    const res = await fetch(`http://localhost:8000/alarms/${alarmId}`, { method: 'DELETE' });
    if (res.ok) {
      // Remove the row from the table
      btn.closest('tr').remove();
    }
  } catch (err) {
    alert('Cannot connect to server.');
  }
}

// ── Alarm Creator — time picker & day chips ───────────────────

let acNow = new Date();
let acHour = acNow.getHours() % 12 || 12;
let acMin  = acNow.getMinutes();
let acAMPM = acNow.getHours() >= 12 ? 'PM' : 'AM';

// Init drum display on page load
window.addEventListener('load', () => {
  acSyncDrum();
  // Update clock every minute to stay current
  setInterval(() => {
    const now = new Date();
    acHour = now.getHours() % 12 || 12;
    acMin  = now.getMinutes();
    acAMPM = now.getHours() >= 12 ? 'PM' : 'AM';
    acSyncDrum();
  }, 60000);
});

function acPad(n) { return String(n).padStart(2, '0'); }

function acSyncHidden() {
  let h24 = acHour % 12;
  if (acAMPM === 'PM') h24 += 12;
  document.getElementById('alarm-time').value = `${acPad(h24)}:${acPad(acMin)}`;
}

function acSyncDrum() {
  // Hour
  const hPrev = ((acHour - 2 + 12) % 12) + 1;
  const hNext = (acHour % 12) + 1;
  document.getElementById('ac-hour').textContent      = acPad(acHour);
  document.getElementById('ac-hour-prev').textContent = acPad(hPrev);
  document.getElementById('ac-hour-next').textContent = acPad(hNext);
  // Min
  const mPrev = (acMin - 1 + 60) % 60;
  const mNext = (acMin + 1) % 60;
  document.getElementById('ac-min').textContent      = acPad(acMin);
  document.getElementById('ac-min-prev').textContent = acPad(mPrev);
  document.getElementById('ac-min-next').textContent = acPad(mNext);
  // AM/PM
  document.getElementById('ac-ampm-cur').textContent   = acAMPM;
  document.getElementById('ac-ampm-other').textContent = acAMPM === 'AM' ? 'PM' : 'AM';
  acSyncHidden();
}

function acAdjust(part, delta) {
  if (part === 'hour') {
    acHour = ((acHour - 1 + delta + 12) % 12) + 1;
  } else {
    acMin = (acMin + delta + 60) % 60;
  }
  acSyncDrum();
}

function acSetAMPM(val) {
  acAMPM = val;
  acSyncDrum();
}

function acToggleAMPM() {
  acSetAMPM(acAMPM === 'AM' ? 'PM' : 'AM');
}

function acToggleNever() {
  const neverBtn = document.getElementById('ac-never');
  const isNever  = neverBtn.classList.toggle('active');
  // When Never is active, deactivate all day chips
  document.querySelectorAll('.ac-day:not(.ac-never)').forEach(d => {
    d.classList.toggle('active', !isNever);
  });
}

// Day chip toggle
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.ac-day:not(.ac-never)').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('active');
      // If any day is selected, Never should be inactive
      const anyActive = [...document.querySelectorAll('.ac-day:not(.ac-never)')].some(d => d.classList.contains('active'));
      document.getElementById('ac-never').classList.toggle('active', !anyActive);
    });
  });
});

function acReset() {
  const now = new Date();
  acHour = now.getHours() % 12 || 12;
  acMin  = now.getMinutes();
  acAMPM = now.getHours() >= 12 ? 'PM' : 'AM';
  acSyncDrum();
  // Clear label
  const label = document.getElementById('alarm-label');
  if (label) label.value = '';
  // Reset dropdowns to placeholder
  const challenge = document.getElementById('alarm-challenge');
  if (challenge) challenge.value = '';
  const difficulty = document.getElementById('alarm-difficulty');
  if (difficulty) difficulty.value = '';
  const alarmType = document.getElementById('alarm-type');
  if (alarmType) alarmType.value = '';
  // Reset snooze
  const snooze = document.getElementById('alarm-snooze');
  if (snooze) snooze.checked = true;
  // Deselect all day chips
  document.querySelectorAll('.ac-day:not(.ac-never)').forEach(d => d.classList.remove('active'));
  document.getElementById('ac-never').classList.remove('active');
}

// ── Kebab menu ────────────────────────────────────────────────
function toggleKebab(btn) {
  const menu = btn.nextElementSibling;
  const isOpen = menu.classList.contains('open');
  closeKebab(); // close any other open menus
  if (!isOpen) menu.classList.add('open');
}

function closeKebab() {
  document.querySelectorAll('.kebab-menu.open').forEach(m => m.classList.remove('open'));
}

// Close kebab when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.kebab-cell')) closeKebab();
});

// ── Alarm Calendar ────────────────────────────────────────────
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];
const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun',
                      'Jul','Aug','Sep','Oct','Nov','Dec'];

let acCalDate    = new Date();   // currently viewed month
let acSelectedDate = new Date(); // selected date (default today)

// Init date label on load
(function() {
  const d = new Date();
  const label = d.getDate() + ' ' + SHORT_MONTHS[d.getMonth()];
  const el = document.getElementById('ac-date-label');
  if (el) el.textContent = label;
  const hidden = document.getElementById('alarm-date');
  if (hidden) hidden.value = d.toISOString().split('T')[0];
})();

function acToggleCalendar() {
  const cal = document.getElementById('ac-calendar');
  if (!cal) return;
  const isOpen = cal.style.display !== 'none';
  cal.style.display = isOpen ? 'none' : 'block';
  if (!isOpen) acRenderCalendar();
}

function acCalNav(delta) {
  acCalDate.setMonth(acCalDate.getMonth() + delta);
  acRenderCalendar();
}

function acCalSetMonth() {
  const mo = parseInt(document.getElementById('ac-cal-month').value);
  acCalDate.setMonth(mo);
  acRenderCalendar();
}

function acCalSetYear() {
  const yr = parseInt(document.getElementById('ac-cal-year').value);
  acCalDate.setFullYear(yr);
  acRenderCalendar();
}

function acRenderCalendar() {
  const grid      = document.getElementById('ac-cal-grid');
  const moSelect  = document.getElementById('ac-cal-month');
  const yrSelect  = document.getElementById('ac-cal-year');
  if (!grid) return;

  const yr = acCalDate.getFullYear();
  const mo = acCalDate.getMonth();

  // Populate month dropdown
  moSelect.innerHTML = MONTHS.map((m, i) =>
    `<option value="${i}" ${i === mo ? 'selected' : ''}>${m}</option>`
  ).join('');

  // Populate year dropdown — 5 years back to 5 years forward
  const currentYr = new Date().getFullYear();
  yrSelect.innerHTML = '';
  for (let y = currentYr - 5; y <= currentYr + 5; y++) {
    yrSelect.innerHTML += `<option value="${y}" ${y === yr ? 'selected' : ''}>${y}</option>`;
  }

  const today    = new Date();
  const firstDay = new Date(yr, mo, 1).getDay();
  const daysInMo = new Date(yr, mo + 1, 0).getDate();

  let html = '';
  ['S','M','T','W','T','F','S'].forEach(d => {
    html += `<span class="ac-cal-day-name">${d}</span>`;
  });
  for (let i = 0; i < firstDay; i++) {
    html += `<button class="ac-cal-day empty" disabled></button>`;
  }
  for (let d = 1; d <= daysInMo; d++) {
    const isToday    = d === today.getDate() && mo === today.getMonth() && yr === today.getFullYear();
    const isSelected = d === acSelectedDate.getDate() && mo === acSelectedDate.getMonth() && yr === acSelectedDate.getFullYear();
    const cls = `ac-cal-day${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}`;
    html += `<button type="button" class="${cls}" onclick="acSelectDate(${yr},${mo},${d})">${d}</button>`;
  }
  grid.innerHTML = html;
}

function acSelectDate(yr, mo, d) {
  acSelectedDate = new Date(yr, mo, d);
  // Update label
  const label = d + ' ' + SHORT_MONTHS[mo];
  document.getElementById('ac-date-label').textContent = label;
  // Update hidden input
  const pad = n => String(n).padStart(2,'0');
  document.getElementById('alarm-date').value = `${yr}-${pad(mo+1)}-${pad(d)}`;
  // Close calendar
  document.getElementById('ac-calendar').style.display = 'none';
  // Re-render to show selected state
  acCalDate = new Date(yr, mo, 1);
}

// ── Alarm Modal ───────────────────────────────────────────────
function openAlarmModal() {
  // Show selected time from card clock in modal header
  const timeEl = document.getElementById('modal-time-display');
  const dateEl = document.getElementById('modal-date-display');
  if (timeEl) timeEl.textContent = `${acPad(acHour)}:${acPad(acMin)} ${acAMPM}`;
  if (dateEl) dateEl.textContent = document.getElementById('ac-date-label')?.textContent || 'Today';
  // Reset form fields
  const challenge = document.getElementById('alarm-challenge');
  if (challenge) challenge.value = '';
  const difficulty = document.getElementById('alarm-difficulty');
  if (difficulty) difficulty.value = '';
  const alarmType = document.getElementById('alarm-type');
  if (alarmType) alarmType.value = '';
  const label = document.getElementById('alarm-label');
  if (label) label.value = '';
  document.querySelectorAll('.ac-day:not(.ac-never)').forEach(d => d.classList.remove('active'));
  document.getElementById('ac-never')?.classList.remove('active');
  document.getElementById('alarmModalOverlay').classList.add('open');
}

function closeAlarmModal(e) {
  // Close only if clicking the overlay background, not the modal itself
  if (e && e.target !== document.getElementById('alarmModalOverlay')) return;
  document.getElementById('alarmModalOverlay').classList.remove('open');
}

// ── Sidebar ───────────────────────────────────────────────────

function initSidebar(role) {
  // Hide all sidebars, show the right one
  document.querySelectorAll('.sidebar-nav').forEach(n => n.style.display = 'none');
  const nav = document.getElementById(`sidebar-${role}`);
  if (nav) nav.style.display = 'flex';
}

function showSubSection(role, sub, btn) {
  // Update active button
  const nav = document.getElementById(`sidebar-${role}`);
  if (nav) nav.querySelectorAll('.sidebar-item').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  // Show/hide alarm history card for user
  if (role === 'user') {
    const historyCard = document.querySelector('.sub-card[data-role="user"][data-sub="alarm-history"]');
    if (sub === 'alarm-history') {
      if (historyCard) historyCard.classList.add('sub-visible');
      // Scroll to it
      if (historyCard) historyCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      if (historyCard) historyCard.classList.remove('sub-visible');
    }

    // Show/hide alarm setter card
    const alarmCard = document.querySelector('.alarm-setter-card');
    if (alarmCard) alarmCard.style.display = sub === 'my-alarms' ? 'flex' : (sub === 'overview' ? 'flex' : 'none');
  }

  // For coach — highlight relevant cards
  if (role === 'coach') {
    const cardMap = {
      'overview':  null,
      'clients':   document.querySelector('#coach-panel .grid-col-span-2'),
      'habits':    document.querySelector('#coach-panel .habit-chart-list')?.closest('.dashboard-card'),
      'sleep':     document.querySelector('#coach-panel .line-chart-svg')?.closest('.dashboard-card'),
    };
    if (sub !== 'overview' && cardMap[sub]) {
      cardMap[sub].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // For admin — scroll to relevant card
  if (role === 'admin') {
    const cardMap = {
      'users':           document.querySelector('.user-management'),
      'analytics':       document.querySelector('.platform-analytics'),
      'reports':         document.querySelector('.system-reports'),
      'recommendations': document.querySelector('.recommendation-monitoring'),
    };
    if (sub !== 'overview' && cardMap[sub]) {
      cardMap[sub].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}

// Init sidebar when panel opens — hook into existing tab switching
const _origRoleTabClick = document.querySelectorAll('.role-tab');
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.role-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.getAttribute('data-target');
      const roleMap = { 'user-panel': 'user', 'coach-panel': 'coach', 'admin-panel': 'admin' };
      const role = roleMap[target];
      if (role) initSidebar(role);
    });
  });
});

// ── Sidebar navigation ────────────────────────────────────────

function showSubSection(role, sub, btn) {
  const nav = document.getElementById(`sidebar-${role}`);
  if (nav) {
    nav.querySelectorAll('.sidebar-item').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
  }

  const panelMap = { user: 'user-panel', coach: 'coach-panel', admin: 'admin-panel' };
  const panel = document.getElementById(panelMap[role]);
  if (!panel) return;

  const grid = panel.querySelector('.dashboard-grid');
  const allSubCards = panel.querySelectorAll('.sub-card');

  if (sub === 'overview') {
    // Show all regular cards, hide sub-cards
    if (grid) {
      grid.querySelectorAll('.dashboard-card:not(.sub-card)').forEach(c => c.style.display = '');
    }
    allSubCards.forEach(c => {
      c.classList.remove('sub-visible');
      c.style.display = 'none';
    });
  } else {
    // Hide all regular cards
    if (grid) {
      grid.querySelectorAll('.dashboard-card:not(.sub-card)').forEach(c => c.style.display = 'none');
    }
    // Hide all sub-cards, show the target one
    allSubCards.forEach(c => {
      c.classList.remove('sub-visible');
      c.style.display = 'none';
    });
    const target = panel.querySelector(`.sub-card[data-sub="${sub}"]`);
    if (target) {
      target.style.display = 'flex';
      target.classList.add('sub-visible');
      // Make it span full width
      target.style.gridColumn = '1 / -1';
    }
  }
}

function initSidebar(role) {
  // Hide all sidebars, show the one for this role
  ['user','coach','admin'].forEach(r => {
    const nav = document.getElementById(`sidebar-${r}`);
    if (nav) nav.style.display = r === role ? 'flex' : 'none';
  });
  // Default to overview (Dashboard) on role switch
  showSubSection(role, 'overview', document.querySelector(`#sidebar-${role} .sidebar-item`));
}
