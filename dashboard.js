document.addEventListener('DOMContentLoaded', () => {
  const roleTabs = document.querySelectorAll('.role-tab');
  const panelSections = document.querySelectorAll('.panel-section');

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

  // 4. ALARM SETTER FORM SUBMISSION
  const alarmForm = document.getElementById('alarm-setter-form');
  if (alarmForm) {
    alarmForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const timeVal = document.getElementById('alarm-time').value;
      const challengeText = document.getElementById('alarm-challenge').options[document.getElementById('alarm-challenge').selectedIndex].text;
      
      const saveBtn = alarmForm.querySelector('.btn-alarm-set');
      const btnText = saveBtn.querySelector('.btn-text');
      
      btnText.textContent = 'SAVED!';
      saveBtn.style.background = 'linear-gradient(90deg, #22c55e, #15803d)';
      saveBtn.style.boxShadow = '0 4px 12px rgba(34, 197, 94, 0.2)';
      
      setTimeout(() => {
        btnText.textContent = 'SAVE ALARM';
        saveBtn.style.background = '';
        saveBtn.style.boxShadow = '';
      }, 2000);

      // Add a mock entry to the alarm history table!
      const historyTable = document.querySelector('.data-table tbody');
      if (historyTable) {
        const newRow = document.createElement('tr');
        newRow.innerHTML = `
          <td>Tomorrow (Scheduled)</td>
          <td>${formatTime(timeVal)}</td>
          <td>--</td>
          <td>--</td>
          <td>${challengeText}</td>
          <td><span class="badge" style="background-color: #e0f2fe; color: #0369a1; font-weight: 500;">Active</span></td>
        `;
        // Insert as the first row
        historyTable.insertBefore(newRow, historyTable.firstChild);
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
