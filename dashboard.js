// ── Read token from URL if coming from Google OAuth ──────────
const urlParams = new URLSearchParams(window.location.search);
const urlToken  = urlParams.get('token');
const urlName   = urlParams.get('name');
const urlRole   = urlParams.get('role');

if (urlToken) {
    localStorage.setItem('token', urlToken);
    localStorage.setItem('user', JSON.stringify({
        full_name: decodeURIComponent(urlName || ''),
        role: urlRole || 'user'
    }));
    // Clean the token out of the URL
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
  }

  // ── Load alarms from database on page load ───────────────────
  if (user && user.id) {
    fetch(`http://localhost:8000/alarms/${user.id}`)
      .then(res => res.json())
      .then(alarms => {
        const historyTable = document.querySelector('.data-table tbody');
        if (!historyTable || !alarms.length) return;
        // Clear static hardcoded rows
        historyTable.innerHTML = '';
        alarms.forEach(alarm => {
          const row = document.createElement('tr');
          row.setAttribute('data-alarm-id', alarm.id);
          row.innerHTML = `
            <td>Scheduled</td>
            <td>${alarm.alarm_time}</td>
            <td>--</td>
            <td>--</td>
            <td>${alarm.title} (${alarm.difficulty_level})</td>
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
      .catch(() => {}); // silently fail if backend is off
  }
  roleTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetPanelId = tab.getAttribute('data-target');
      const targetPanel = document.getElementById(targetPanelId);

      if (!targetPanel || tab.classList.contains('active')) return;

      // Deactivate current tab and panel
      document.querySelectorAll('.role-tab.active').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.panel-section.active').forEach(p => p.classList.remove('active'));

      // Activate clicked tab
      tab.classList.add('active');

      // Small delay to allow the slide out animation to play out nicely
      setTimeout(() => {
        targetPanel.classList.add('active');
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
            user_id:          user.id || 1,
            title:            document.getElementById('alarm-label').value || 'My Alarm',
            alarm_time:       timeVal,
            alarm_type:       'daily',
            repeat_days:      [...document.querySelectorAll('.ac-day:not(.ac-never).active')].map(d => d.textContent).join(''),
            difficulty_level: document.getElementById('alarm-difficulty')?.value || 'medium',
            sound:            'default',
            vibration:        true,
            snooze_enabled:   document.getElementById('alarm-snooze')?.checked ?? true
          })
        });
        const alarm = await res.json();

        btnText.textContent = 'SAVED!';
        saveBtn.style.background = 'linear-gradient(90deg, #22c55e, #15803d)';
        setTimeout(() => {
          btnText.textContent = 'SAVE ALARM';
          saveBtn.style.background = '';
        }, 2000);

        // Add row to alarm history table
        const historyTable = document.querySelector('.data-table tbody');
        if (historyTable && alarm.id) {
          const newRow = document.createElement('tr');
          newRow.setAttribute('data-alarm-id', alarm.id);
          newRow.innerHTML = `
            <td>Scheduled</td>
            <td>${timeVal}</td>
            <td>--</td>
            <td>--</td>
            <td>${challengeText}</td>
            <td><span class="badge" style="background:#e0f2fe;color:#0369a1;">Active</span></td>
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

async function editAlarm(alarmId, currentTime, currentChallenge, currentRepeat) {
  const newTime      = prompt('New alarm time (HH:MM):', currentTime);
  if (!newTime) return;
  const newChallenge = prompt('Challenge (math/memory/tap/pattern):', currentChallenge);
  if (!newChallenge) return;

  try {
    const res = await fetch(`http://localhost:8000/alarms/${alarmId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alarm_time:   newTime + ':00',
        challenge:    newChallenge,
        repeat_daily: currentRepeat
      })
    });
    if (res.ok) {
      alert(`Alarm updated to ${newTime} — ${newChallenge}`);
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

let acHour = 6, acMin = 30, acAMPM = 'AM';

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
  acHour = 6; acMin = 30; acAMPM = 'AM';
  acSyncDrum();
  document.getElementById('alarm-label').value = '';
  document.getElementById('alarm-snooze').checked = true;
  document.querySelectorAll('.ac-day:not(.ac-never)').forEach((d, i) => {
    d.classList.toggle('active', i >= 1 && i <= 5); // Mon–Fri default
  });
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
