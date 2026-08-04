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

  // 1. DYNAMIC TAB SWITCHING LOGIC
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
            user_id:      user.id || 1,
            alarm_time:   timeVal + ':00',
            challenge:    challengeVal,
            repeat_daily: repeatVal
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
            <td>
              <button class="btn-table-edit" onclick="editAlarm(${alarm.id}, '${timeVal}', '${challengeVal}', ${repeatVal})">Edit</button>
              <button class="btn-table-edit" style="color:#EF4444;margin-left:6px" onclick="toggleAlarm(${alarm.id}, this)">Disable</button>
              <button class="btn-table-edit" style="color:#EF4444;margin-left:6px" onclick="deleteAlarm(${alarm.id}, this)">Delete</button>
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
  // Convert to 24h for the backend
  let h24 = acHour % 12;
  if (acAMPM === 'PM') h24 += 12;
  document.getElementById('alarm-time').value = `${acPad(h24)}:${acPad(acMin)}`;
}

function acAdjust(part, delta) {
  if (part === 'hour') {
    acHour = ((acHour - 1 + delta + 12) % 12) + 1;
    document.getElementById('ac-hour').textContent = acPad(acHour);
  } else {
    acMin = (acMin + delta + 60) % 60;
    document.getElementById('ac-min').textContent = acPad(acMin);
  }
  acSyncHidden();
}

function acSetAMPM(val) {
  acAMPM = val;
  document.getElementById('ac-am').classList.toggle('active', val === 'AM');
  document.getElementById('ac-pm').classList.toggle('active', val === 'PM');
  acSyncHidden();
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
  document.getElementById('ac-hour').textContent = '06';
  document.getElementById('ac-min').textContent  = '30';
  acSetAMPM('AM');
  document.getElementById('alarm-label').value = '';
  document.getElementById('alarm-snooze').checked = true;
  document.querySelectorAll('.ac-day:not(.ac-never)').forEach((d, i) => {
    d.classList.toggle('active', i >= 1 && i <= 5); // Mon–Fri default
  });
  document.getElementById('ac-never').classList.remove('active');
}
