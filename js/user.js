/* ==========================================================================
   INTELLIGENT COGNITIVE ALARM PLATFORM - USER PORTAL CONTROLLER
   ========================================================================== */

// 1. Data Store / State Managers
let alarms = JSON.parse(localStorage.getItem('user_alarms')) || [
    { id: 1, label: 'Early Sync', time: '07:30', challenge: 'Math Formulas', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], active: true },
    { id: 2, label: 'Mindful Morning', time: '08:45', challenge: 'Precision Taps', days: ['Sat', 'Sun'], active: true },
    { id: 3, label: 'Wind-down Check', time: '22:30', challenge: 'None', days: ['Mon', 'Wed', 'Fri'], active: false }
];

let habits = JSON.parse(localStorage.getItem('user_habits')) || [
    { id: 'h1', label: 'Hydrate (500ml Water)', completed: false, pts: 10 },
    { id: 'h2', label: '5 Mins Deep Breathing', completed: false, pts: 15 },
    { id: 'h3', label: 'No Screen Time 30 mins before sleep', completed: false, pts: 20 },
    { id: 'h4', label: 'Log morning sleep quality score', completed: false, pts: 10 }
];

let challengeHistory = JSON.parse(localStorage.getItem('user_challenges')) || [
    { mode: 'Mental Arithmetic', score: '100% (Pass)', date: 'Today, 07:34 AM' }
];

let notifications = JSON.parse(localStorage.getItem('user_notifications')) || [
    { icon: 'fa-user-md', color: 'blue', title: 'Coach Sarah sent a message', text: 'Great sleep pattern yesterday. Keep pushing the morning exercises!', time: '10 minutes ago' },
    { icon: 'fa-puzzle-piece', color: 'purple', title: 'New Challenge drill unlocked', text: 'Arithmetic Speed Run is now available.', time: '2 hours ago' },
    { icon: 'fa-bell', color: 'yellow', title: 'Hydration reminder', text: 'Time to drink water and log your progress score.', time: '4 hours ago' }
];

// Tracks daily challenge completion for the progress bar
let dailyChallengeCompleted = false;

// 2. Tab Navigation Switcher
window.switchTab = (tabId) => {
    // Hide all tabs
    document.querySelectorAll('.tab-content-section').forEach(section => {
        section.classList.remove('active');
    });

    // Show selected tab
    const activeSection = document.getElementById(tabId);
    if (activeSection) {
        activeSection.classList.add('active');
    }

    // Update active sidebar item styling
    document.querySelectorAll('.sidebar-menu-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.tab === tabId) {
            item.classList.add('active');
        }
    });

    // Update Breadcrumb Text
    const crumbText = document.getElementById('breadcrumb-current');
    if (crumbText) {
        const item = document.querySelector(`.sidebar-menu-item[data-tab="${tabId}"] span`);
        crumbText.textContent = item ? item.textContent : 'Profile';
    }

    // Close sidebar on mobile after tab switches
    document.body.classList.remove('sidebar-open');
};

// Bind sidebar click navigation
document.querySelectorAll('.sidebar-menu-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const tabId = item.dataset.tab;
        switchTab(tabId);
    });
});

// 3. Render Charts
let performanceChart, habitRadarChart, detailedSleepChart;

function initCharts() {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#9ca3af' : '#62627a';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(99, 102, 241, 0.08)';

    // Weekly Sleep Performance Chart
    const perfCtx = document.getElementById('performanceChart');
    if (perfCtx) {
        performanceChart = new Chart(perfCtx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [
                    {
                        label: 'Sleep Hours',
                        data: [7.2, 6.8, 7.5, 8.0, 6.5, 8.5, 9.0],
                        borderColor: '#6366f1',
                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Cognitive Score',
                        data: [85, 78, 90, 95, 80, 88, 92],
                        borderColor: '#06b6d4',
                        backgroundColor: 'rgba(6, 182, 212, 0.1)',
                        fill: true,
                        tension: 0.4,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: textColor } }
                },
                scales: {
                    x: { grid: { color: gridColor }, ticks: { color: textColor } },
                    y: { grid: { color: gridColor }, ticks: { color: textColor } },
                    y1: {
                        position: 'right',
                        grid: { drawOnChartArea: false },
                        ticks: { color: textColor }
                    }
                }
            }
        });
    }

    // Habit Radar Chart
    const radarCtx = document.getElementById('habitRadarChart');
    if (radarCtx) {
        habitRadarChart = new Chart(radarCtx, {
            type: 'radar',
            data: {
                labels: ['Cognitive Accuracy', 'Sleep Consistency', 'Hydration Goal', 'Meditation Streak', 'Coach Feedbacks'],
                datasets: [{
                    label: 'User Metric Ratio',
                    data: [92, 85, 70, 60, 90],
                    borderColor: '#a855f7',
                    backgroundColor: 'rgba(168, 85, 247, 0.2)',
                    pointBackgroundColor: '#a855f7'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: textColor } }
                },
                scales: {
                    r: {
                        grid: { color: gridColor },
                        pointLabels: { color: textColor },
                        ticks: { display: false }
                    }
                }
            }
        });
    }

    // Detailed Sleep Phases Chart
    const detailedCtx = document.getElementById('detailedSleepChart');
    if (detailedCtx) {
        detailedSleepChart = new Chart(detailedCtx, {
            type: 'bar',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [
                    {
                        label: 'Deep Sleep (Hrs)',
                        data: [2.1, 1.8, 2.3, 2.5, 1.9, 2.8, 3.0],
                        backgroundColor: '#6366f1'
                    },
                    {
                        label: 'REM Sleep (Hrs)',
                        data: [1.8, 1.6, 2.0, 2.2, 1.5, 2.3, 2.4],
                        backgroundColor: '#a855f7'
                    },
                    {
                        label: 'Light Sleep (Hrs)',
                        data: [3.3, 3.4, 3.2, 3.3, 3.1, 3.4, 3.6],
                        backgroundColor: '#3b82f6'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: textColor } }
                },
                scales: {
                    x: { stacked: true, grid: { color: gridColor }, ticks: { color: textColor } },
                    y: { stacked: true, grid: { color: gridColor }, ticks: { color: textColor } }
                }
            }
        });
    }
}

// Watch for theme toggles to adjust chart colors
document.getElementById('theme-toggle')?.addEventListener('click', () => {
    setTimeout(() => {
        if (performanceChart) performanceChart.destroy();
        if (habitRadarChart) habitRadarChart.destroy();
        if (detailedSleepChart) detailedSleepChart.destroy();
        initCharts();
    }, 100);
});
document.querySelector('.nav-toggle-theme')?.addEventListener('click', () => {
    setTimeout(() => {
        if (performanceChart) performanceChart.destroy();
        if (habitRadarChart) habitRadarChart.destroy();
        if (detailedSleepChart) detailedSleepChart.destroy();
        initCharts();
    }, 100);
});

// 4. Progress Bar and Goal Calculations
function updateGoalProgress() {
    const totalHabits = habits.length;
    const completedHabits = habits.filter(h => h.completed).length;

    // Daily Goals include:
    // - Each habit in checklist (completed is checked)
    // - Math Cognitive drill (completed for today)
    const totalGoalItems = totalHabits + 1;
    const completedGoalItems = completedHabits + (dailyChallengeCompleted ? 1 : 0);

    const percentage = Math.round((completedGoalItems / totalGoalItems) * 100);
    
    const goalBar = document.getElementById('goal-bar');
    const goalPercent = document.getElementById('goal-percent');

    if (goalBar && goalPercent) {
        goalBar.style.width = `${percentage}%`;
        goalPercent.textContent = `${percentage}% Completed`;
        
        if (percentage === 100) {
            goalPercent.className = 'goal-percent-bubble badge-success';
        } else {
            goalPercent.className = 'goal-percent-bubble';
        }
    }
}

// 5. Alarms Table Rendering & Switch Controls
function renderAlarms() {
    const alarmsTable = document.getElementById('alarms-table-body')?.querySelector('tbody');
    const managerTable = document.getElementById('alarms-manager-table')?.querySelector('tbody');
    
    localStorage.setItem('user_alarms', JSON.stringify(alarms));
    
    // Quick metric update
    const activeAlarmsCount = alarms.filter(a => a.active).length;
    const totalAlarmsElem = document.getElementById('stat-total-alarms');
    if (totalAlarmsElem) totalAlarmsElem.textContent = alarms.length;

    const todayAlarmElem = document.getElementById('stat-today-alarm');
    if (todayAlarmElem) {
        const nextActive = alarms.find(a => a.active);
        todayAlarmElem.textContent = nextActive ? `${formatTime12(nextActive.time)}` : 'None Active';
    }

    if (alarmsTable) {
        alarmsTable.innerHTML = '';
        alarms.forEach(a => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${a.label}</strong></td>
                <td><i class="far fa-clock text-muted" style="margin-right:8px;"></i> ${formatTime12(a.time)}</td>
                <td><span class="badge ${a.challenge !== 'None' ? 'badge-info' : 'badge-warning'}">${a.challenge}</span></td>
                <td>${a.active ? '<span class="badge badge-success">Standby</span>' : '<span class="badge badge-danger">Disabled</span>'}</td>
                <td>
                    <label class="switch">
                        <input type="checkbox" ${a.active ? 'checked' : ''} onchange="toggleAlarmActive(${a.id})">
                        <span class="slider"></span>
                    </label>
                </td>
            `;
            alarmsTable.appendChild(tr);
        });
    }

    if (managerTable) {
        managerTable.innerHTML = '';
        alarms.forEach(a => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${a.label}</strong></td>
                <td><i class="far fa-clock text-muted"></i> ${formatTime12(a.time)}</td>
                <td><span class="badge badge-info">${a.challenge}</span></td>
                <td><span style="font-size: 0.8rem; color: var(--text-secondary);">${a.days.join(', ')}</span></td>
                <td>
                    <label class="switch">
                        <input type="checkbox" ${a.active ? 'checked' : ''} onchange="toggleAlarmActive(${a.id})">
                        <span class="slider"></span>
                    </label>
                </td>
                <td>
                    <button class="table-action-btn delete-btn" onclick="deleteAlarm(${a.id})" title="Delete Alarm"><i class="fas fa-trash-alt"></i></button>
                </td>
            `;
            managerTable.appendChild(tr);
        });
    }
    
    updateGoalProgress();
}

window.toggleAlarmActive = (id) => {
    const index = alarms.findIndex(a => a.id === id);
    if (index !== -1) {
        alarms[index].active = !alarms[index].active;
        renderAlarms();
        Toast.show('Alarm Updated', `${alarms[index].label} is now ${alarms[index].active ? 'active' : 'inactive'}.`, 'success', 2000);
    }
};

window.deleteAlarm = (id) => {
    alarms = alarms.filter(a => a.id !== id);
    renderAlarms();
    Toast.show('Alarm Removed', 'The alarm configuration was deleted.', 'danger', 2000);
};

// Format time 24H -> 12H
function formatTime12(timeString) {
    const [hoursStr, minutesStr] = timeString.split(':');
    const hours = parseInt(hoursStr);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutesStr} ${ampm}`;
}

// 6. Habit Checklist Rendering
function renderHabits() {
    const listContainer = document.getElementById('habits-list-container');
    if (!listContainer) return;

    localStorage.setItem('user_habits', JSON.stringify(habits));

    listContainer.innerHTML = '';
    habits.forEach(h => {
        const div = document.createElement('div');
        div.className = 'action-card';
        div.style.gap = '15px';
        div.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px; flex-grow: 1;">
                <input type="checkbox" ${h.completed ? 'checked' : ''} onchange="toggleHabitCompleted('${h.id}')" style="width: 18px; height: 18px; cursor: pointer;">
                <div class="action-info">
                    <h4 style="${h.completed ? 'text-decoration: line-through; opacity: 0.6;' : ''}">${h.label}</h4>
                    <p style="color: var(--color-primary); font-weight: 600;">+${h.pts} Habit Points</p>
                </div>
            </div>
            <span class="badge ${h.completed ? 'badge-success' : 'badge-warning'}">${h.completed ? 'Completed' : 'Pending'}</span>
        `;
        listContainer.appendChild(div);
    });

    // Update habit score metric
    const habitScore = 65 + (habits.filter(h => h.completed).length * 8);
    const scoreElem = document.getElementById('stat-habit-score');
    if (scoreElem) scoreElem.textContent = Math.min(habitScore, 100);

    updateGoalProgress();
}

window.toggleHabitCompleted = (id) => {
    const index = habits.findIndex(h => h.id === id);
    if (index !== -1) {
        habits[index].completed = !habits[index].completed;
        renderHabits();
        
        if (habits[index].completed) {
            Toast.show('Habit Logged!', `Earned +${habits[index].pts} points. Streak updated!`, 'success', 2500);
        } else {
            Toast.show('Habit Revoked', 'Habit task marked pending.', 'warning', 2000);
        }
    }
};

// 7. Dynamic Math Challenge Drill
let mathAnswer = 0;

window.triggerChallenge = () => {
    triggerMathChallenge();
};

window.triggerMathChallenge = () => {
    // Generate arithmetic puzzle
    const val1 = Math.floor(Math.random() * 12) + 2;
    const val2 = Math.floor(Math.random() * 12) + 2;
    const val3 = Math.floor(Math.random() * 20) + 5;
    
    const operand = Math.random() > 0.5 ? '+' : '-';
    
    mathAnswer = operand === '+' ? (val1 * val2) + val3 : (val1 * val2) - val3;
    
    const questionElem = document.getElementById('challenge-question');
    const answerInput = document.getElementById('challenge-answer');
    const feedbackElem = document.getElementById('challenge-feedback');

    if (questionElem && answerInput && feedbackElem) {
        questionElem.textContent = `${val1} x ${val2} ${operand} ${val3}`;
        answerInput.value = '';
        feedbackElem.textContent = '';
        Modal.open('challenge-modal');
    }
};

// Handle checking answer
const submitChallengeBtn = document.getElementById('submit-challenge-btn');
if (submitChallengeBtn) {
    submitChallengeBtn.addEventListener('click', () => {
        const userAnswer = parseInt(document.getElementById('challenge-answer').value);
        const feedback = document.getElementById('challenge-feedback');

        if (userAnswer === mathAnswer) {
            feedback.style.color = 'var(--color-success)';
            feedback.textContent = 'Correct! Neural wakeup sequence confirmed.';
            
            // Log challenge pass
            dailyChallengeCompleted = true;
            challengeHistory.unshift({
                mode: 'Mental Arithmetic',
                score: '100% (Pass)',
                date: 'Just Now'
            });
            localStorage.setItem('user_challenges', JSON.stringify(challengeHistory));
            
            // Reload historical tables
            renderHistoryLog();
            
            // Give habit points
            Toast.show('Wakeup Drill Clear!', 'Prefrontal cortex activated successfully! +10 Points.', 'success', 3000);
            
            // Recalculate goal bars
            updateGoalProgress();

            setTimeout(() => {
                Modal.close('challenge-modal');
            }, 1200);
        } else {
            feedback.style.color = 'var(--color-danger)';
            feedback.textContent = 'Incorrect answer. Try again to sync alarm.';
            
            // Shake effect simulation
            const modalContainer = document.querySelector('#challenge-modal .modal-container');
            if (modalContainer) {
                modalContainer.style.animation = 'none';
                void modalContainer.offsetHeight; // reflow
                modalContainer.style.border = '2px solid var(--color-danger)';
                setTimeout(() => {
                    modalContainer.style.border = '1px solid var(--glass-border)';
                }, 800);
            }
        }
    });
}

function renderHistoryLog() {
    const tableBody = document.querySelector('#tab-dashboard table:nth-of-type(2) tbody') || 
                      document.querySelector('table tbody'); // Fallback lookup
    if (tableBody) {
        // Find challenge history table body specifically
        const tables = document.querySelectorAll('table');
        tables.forEach(table => {
            const header = table.querySelector('th');
            if (header && header.textContent.includes('CHALLENGE')) {
                const tbody = table.querySelector('tbody');
                tbody.innerHTML = '';
                challengeHistory.slice(0, 3).forEach(c => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td><i class="fas fa-calculator text-muted" style="margin-right:8px;"></i> ${c.mode}</td>
                        <td><span class="badge badge-success">${c.score}</span></td>
                        <td>${c.date}</td>
                    `;
                    tbody.appendChild(tr);
                });
            }
        });
    }
}

// 8. Notifications Manager
function renderNotifications() {
    const list = document.getElementById('full-notifications-list');
    if (!list) return;

    localStorage.setItem('user_notifications', JSON.stringify(notifications));

    list.innerHTML = '';
    if (notifications.length === 0) {
        list.innerHTML = '<p style="color:var(--text-secondary); text-align:center; padding:20px;">No new alerts.</p>';
        return;
    }

    notifications.forEach(n => {
        const item = document.createElement('div');
        item.className = 'notification-item';
        item.innerHTML = `
            <div class="notification-item-icon ${n.color}"><i class="fas ${n.icon}"></i></div>
            <div class="notification-text">
                <h4>${n.title}</h4>
                <p>${n.text}</p>
                <span>${n.time}</span>
            </div>
        `;
        list.appendChild(item);
    });
}

window.clearNotifications = () => {
    notifications = [];
    renderNotifications();
    Toast.show('Logs Flushed', 'Cleared all alerts.', 'info', 2000);
};

// 9. Add Alarm Form Submission
const addAlarmForm = document.getElementById('add-alarm-form');
if (addAlarmForm) {
    addAlarmForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const label = document.getElementById('alarm-label').value;
        const time = document.getElementById('alarm-time').value;
        const challengeVal = document.getElementById('alarm-challenge').value;
        
        let challengeLabel = 'None';
        if (challengeVal === 'math') challengeLabel = 'Math Formulas';
        if (challengeVal === 'tap') challengeLabel = 'Precision Taps';

        // Read checked days
        const checkedDays = [];
        addAlarmForm.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
            checkedDays.push(cb.value);
        });

        if (checkedDays.length === 0) {
            Toast.show('Error', 'Please select at least one repeating day.', 'danger', 2500);
            return;
        }

        const newId = alarms.length > 0 ? Math.max(...alarms.map(a => a.id)) + 1 : 1;
        alarms.push({
            id: newId,
            label: label,
            time: time,
            challenge: challengeLabel,
            days: checkedDays,
            active: true
        });

        renderAlarms();
        Modal.close('add-alarm-modal');
        addAlarmForm.reset();
        
        Toast.show('Alarm Created', `"${label}" alarm set for ${formatTime12(time)}`, 'success', 3000);
    });
}

// 10. Profile Settings Form
const profileForm = document.getElementById('profile-settings-form');
if (profileForm) {
    // Fill session data on load
    const session = JSON.parse(localStorage.getItem('sessionUser') || '{}');
    if (session.name) document.getElementById('profile-name').value = session.name;
    if (session.email) document.getElementById('profile-email').value = session.email;

    profileForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const nameVal = document.getElementById('profile-name').value;
        const emailVal = document.getElementById('profile-email').value;

        // Update session
        session.name = nameVal;
        session.email = emailVal;
        localStorage.setItem('sessionUser', JSON.stringify(session));

        // Update navbar visual elements
        if (typeof updateHeaderUserInfo === 'function') updateHeaderUserInfo();

        Toast.show('Profile Settings Saved', 'Your workspace details were compiled successfully.', 'success', 2500);
    });
}

// 11. Mock PDF report builder download
window.simulateReportDownload = () => {
    Toast.show('Preparing Report...', 'Assembling sleep log and cognitive matrix scores.', 'info', 2000);
    setTimeout(() => {
        const text = `WAKEWISE AI - SLEEP PERFORMANCE REPORT
--------------------------------------
REPORT FOR: Alex Mercer
DATE GENERATED: ${new Date().toLocaleDateString()}
SLEEP CONSISTENCY RATIO: 94%
AVERAGE COGNITIVE ACCURACY: 92%
WAKE STREAK ACHIEVED: 14 Days
--------------------------------------
RECOMMENDATIONS FROM DR. SARAH JENKINS:
"Great sleep pattern yesterday. Keep pushing the morning exercises!"
--------------------------------------
Report generated dynamically by WakeWise AI Platform.`;
        
        const blob = new Blob([text], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `WakeWiseAI-AlexMercer-Report.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        Toast.show('Report Downloaded', 'The text sleep analysis file was saved.', 'success', 2500);
    }, 1500);
};

// 12. Run setup on load
document.addEventListener('DOMContentLoaded', () => {
    if (typeof updateHeaderUserInfo === 'function') updateHeaderUserInfo();
    initCharts();
    renderAlarms();
    renderHabits();
    renderHistoryLog();
    renderNotifications();

    // Setup background dynamic toast reminders to simulate coach feedback
    setTimeout(() => {
        Toast.show('Coach Alert', 'Sarah Jenkins: Hydration is key. Log your water intake!', 'info', 4000);
    }, 8000);

    setTimeout(() => {
        Toast.show('Routine Notice', 'Time to start wind-down routines. Sleep triggers in 1 Hour.', 'warning', 4500);
    }, 20000);
});
