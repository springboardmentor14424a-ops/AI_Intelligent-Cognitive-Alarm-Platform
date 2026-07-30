/* ==========================================================================
   Intelligent Cognitive Alarm Platform - Master Application Script
   Features: 3 Dashboards, Alarm Engine, Web Audio Alarm Synthesizer,
             Playable Puzzles, Chart.js Analytics, Coach Portal & RBAC Admin
   ========================================================================== */

// --- Global Application State ---
const state = {
    currentRole: 'user',
    userProfile: {
        name: 'Alex Rivera',
        role: 'Student / Standard User',
        img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
        habitScore: 84,
        difficultyLevel: 'Medium'
    },
    alarms: [
        {
            id: 1,
            time: '06:30 AM',
            rawTime: '06:30',
            title: 'Morning Focus & Cognitive Prep',
            days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
            type: 'Smart Adaptive Alarm',
            challengeType: 'math',
            challengeLabel: 'Math Problems',
            difficulty: 'Medium',
            enabled: true,
            snoozeSteps: '3 Steps (Strict)',
            category: 'smart'
        },
        {
            id: 2,
            time: '07:15 AM',
            rawTime: '07:15',
            title: 'Gym & Physical Energy Alarm',
            days: ['Mon', 'Wed', 'Fri'],
            type: 'Weekday Alarm',
            challengeType: 'memory',
            challengeLabel: 'Memory Matrix',
            difficulty: 'Easy',
            enabled: true,
            snoozeSteps: '2 Steps (Moderate)',
            category: 'weekday'
        },
        {
            id: 3,
            time: '08:30 AM',
            rawTime: '08:30',
            title: 'Weekend Recovery & Reading Routine',
            days: ['Sat', 'Sun'],
            type: 'Weekend Alarm',
            challengeType: 'riddles',
            challengeLabel: 'Cognitive Riddles',
            difficulty: 'Medium',
            enabled: false,
            snoozeSteps: '1 Step (Standard)',
            category: 'weekend'
        }
    ],
    clients: [
        { id: 101, name: 'Alex Rivera', wakeTime: '06:30 AM', score: 84, snoozeRate: '0.4 / day', pref: 'Math Exercises', status: 'Optimal', img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80' },
        { id: 102, name: 'Sarah Jenkins', wakeTime: '07:00 AM', score: 62, snoozeRate: '3.2 / day', pref: 'Memory Grid', status: 'High Snooze Risk', img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80' },
        { id: 103, name: 'Marcus Chen', wakeTime: '06:00 AM', score: 95, snoozeRate: '0.1 / day', pref: 'Logic Puzzles', status: 'Top Performer', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80' },
        { id: 104, name: 'Elena Rostova', wakeTime: '08:00 AM', score: 58, snoozeRate: '3.8 / day', pref: 'Riddles', status: 'High Snooze Risk', img: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80' },
        { id: 105, name: 'David Vance', wakeTime: '06:45 AM', score: 78, snoozeRate: '1.1 / day', pref: 'Word Games', status: 'Moderate', img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80' }
    ],
    adminUsers: [
        { id: 1, name: 'Alex Rivera', role: 'User', auth: 'OAuth2 (Google)', device: 'Android App', status: 'Active' },
        { id: 2, name: 'Dr. Aris Thorne', role: 'Wellness Coach', auth: 'JWT Token', device: 'Web Portal', status: 'Active' },
        { id: 3, name: 'System Administrator', role: 'Administrator', auth: 'MFA + JWT', device: 'Web Console', status: 'Active' },
        { id: 4, name: 'Sarah Jenkins', role: 'User', auth: 'Email / Password', device: 'iOS App', status: 'Active' },
        { id: 5, name: 'Marcus Chen', role: 'User', auth: 'OAuth2 (Apple)', device: 'iOS App', status: 'Active' }
    ],
    // Simulator Interactive Challenge state
    simulator: {
        active: false,
        timerInterval: null,
        elapsedSeconds: 0,
        currentStep: 1,
        totalSteps: 3,
        challengeType: 'math',
        selectedAnswer: null,
        memoryPattern: [],
        userPattern: []
    },
    audioCtx: null,
    alarmOscillator: null,
    charts: {}
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    renderAlarms('all');
    renderClientsTable();
    renderAdminUsersTable();
    initCharts();
    startLiveTelemetryLoop();
});

// --- Web Audio API Alarm Synthesizer ---
function playAlarmSound() {
    try {
        if (!state.audioCtx) {
            state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        stopAlarmSound();

        const osc = state.audioCtx.createOscillator();
        const gain = state.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, state.audioCtx.currentTime); // 880Hz pitch

        const now = state.audioCtx.currentTime;
        gain.gain.setValueAtTime(0, now);
        // Beeping pattern
        for (let i = 0; i < 40; i++) {
            gain.gain.setValueAtTime(0.15, now + i * 0.7);
            gain.gain.setValueAtTime(0, now + i * 0.7 + 0.35);
        }

        osc.connect(gain);
        gain.connect(state.audioCtx.destination);
        osc.start();
        state.alarmOscillator = osc;
    } catch (e) {
        console.log('Audio playback prevented or unsupported', e);
    }
}

function stopAlarmSound() {
    if (state.alarmOscillator) {
        try { state.alarmOscillator.stop(); } catch (e) {}
        state.alarmOscillator = null;
    }
}

// --- Role Switcher Logic ---
function switchRole(role) {
    state.currentRole = role;
    
    // Update active tab buttons
    document.querySelectorAll('.role-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.role === role);
    });

    // Update section visibility
    document.querySelectorAll('.dashboard-section').forEach(sec => {
        sec.classList.remove('active');
    });

    const targetSection = document.getElementById(`dashboard-${role}`);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // Update Top Header User Info depending on role
    const userNameEl = document.getElementById('current-user-name');
    const userRoleEl = document.getElementById('current-role-badge');
    const userImgEl = document.getElementById('current-user-img');

    if (role === 'user') {
        userNameEl.textContent = 'Alex Rivera';
        userRoleEl.textContent = 'Student / Standard User';
        userImgEl.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80';
        showToast('Switched to User Dashboard', 'info');
    } else if (role === 'coach') {
        userNameEl.textContent = 'Dr. Aris Thorne';
        userRoleEl.textContent = 'Certified Sleep Coach';
        userImgEl.src = 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=100&auto=format&fit=crop&q=80';
        showToast('Switched to Wellness Coach Dashboard', 'info');
    } else if (role === 'admin') {
        userNameEl.textContent = 'Ops Admin Lead';
        userRoleEl.textContent = 'System Infrastructure';
        userImgEl.src = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80';
        showToast('Switched to Administrator Console', 'info');
    }

    // Trigger Chart resize
    setTimeout(() => {
        Object.values(state.charts).forEach(chart => chart.resize());
    }, 150);
}

// --- Alarm Manager Functions ---
function renderAlarms(filter = 'all', clickedBtn = null) {
    if (clickedBtn) {
        document.querySelectorAll('.filter-pills .pill').forEach(p => p.classList.remove('active'));
        clickedBtn.classList.add('active');
    }

    const container = document.getElementById('alarm-cards-container');
    container.innerHTML = '';

    const filtered = state.alarms.filter(a => {
        if (filter === 'all') return true;
        if (filter === 'daily') return a.type === 'Daily Alarm';
        if (filter === 'weekday') return a.type === 'Weekday Alarm';
        if (filter === 'weekend') return a.type === 'Weekend Alarm';
        if (filter === 'smart') return a.type === 'Smart Adaptive Alarm';
        return true;
    });

    if (filtered.length === 0) {
        container.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--text-muted);">
            <i class="fa-solid fa-clock-slash" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
            <p>No alarms found for this filter.</p>
        </div>`;
        return;
    }

    filtered.forEach(alarm => {
        const daysStr = alarm.days.join(' • ');
        const card = document.createElement('div');
        card.className = `alarm-card ${alarm.enabled ? '' : 'disabled'}`;
        card.innerHTML = `
            <div class="alarm-time-group">
                <div class="alarm-time">${alarm.time}</div>
                <div class="alarm-meta">
                    <span class="alarm-title">${alarm.title}</span>
                    <span class="alarm-days">${daysStr}</span>
                    <div class="alarm-badges">
                        <span class="badge badge-purple"><i class="fa-solid fa-brain"></i> ${alarm.challengeLabel}</span>
                        <span class="badge badge-cyan"><i class="fa-solid fa-layer-group"></i> ${alarm.difficulty}</span>
                        <span class="badge badge-amber"><i class="fa-solid fa-shield"></i> ${alarm.snoozeSteps}</span>
                    </div>
                </div>
            </div>
            <div class="alarm-controls">
                <label class="switch">
                    <input type="checkbox" ${alarm.enabled ? 'checked' : ''} onchange="toggleAlarm(${alarm.id})">
                    <span class="slider"></span>
                </label>
                <button class="delete-alarm-btn" onclick="deleteAlarm(${alarm.id})" title="Delete Alarm">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

function filterAlarms(filterType, btnEl) {
    renderAlarms(filterType, btnEl);
}

function toggleAlarm(id) {
    const alarm = state.alarms.find(a => a.id === id);
    if (alarm) {
        alarm.enabled = !alarm.enabled;
        showToast(`Alarm "${alarm.title}" set to ${alarm.enabled ? 'ENABLED' : 'DISABLED'}`, alarm.enabled ? 'success' : 'warning');
        renderAlarms('all');
    }
}

function deleteAlarm(id) {
    state.alarms = state.alarms.filter(a => a.id !== id);
    showToast('Alarm deleted successfully', 'warning');
    renderAlarms('all');
}

function openAlarmModal() {
    document.getElementById('alarm-modal').classList.add('active');
}

function closeAlarmModal() {
    document.getElementById('alarm-modal').classList.remove('active');
}

function handleCreateAlarm(e) {
    e.preventDefault();
    const timeVal = document.getElementById('alarm-time-input').value;
    const labelVal = document.getElementById('alarm-label-input').value;
    const typeVal = document.getElementById('alarm-type-select').value;
    const challengeVal = document.getElementById('alarm-challenge-select').value;
    const diffVal = document.getElementById('alarm-diff-select').value;
    const snoozeVal = document.getElementById('alarm-snooze-select').value;

    const [h, m] = timeVal.split(':');
    const hourNum = parseInt(h);
    const ampm = hourNum >= 12 ? 'PM' : 'AM';
    const formattedHour = hourNum % 12 || 12;
    const formattedTime = `${formattedHour.toString().padStart(2, '0')}:${m} ${ampm}`;

    const challengeLabels = {
        math: 'Math Problems',
        memory: 'Memory Matrix',
        logic: 'Logic Puzzles',
        riddles: 'Cognitive Riddles'
    };

    const newAlarm = {
        id: Date.now(),
        time: formattedTime,
        rawTime: timeVal,
        title: labelVal,
        days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        type: typeVal,
        challengeType: challengeVal,
        challengeLabel: challengeLabels[challengeVal] || 'Math',
        difficulty: diffVal,
        enabled: true,
        snoozeSteps: snoozeVal,
        category: 'custom'
    };

    state.alarms.unshift(newAlarm);
    closeAlarmModal();
    renderAlarms('all');
    showToast(`New Cognitive Alarm created for ${formattedTime}`, 'success');
}

// --- Interactive Simulator Engine (Playable Cognitive Puzzles & Sound) ---
function openSimulatorModal() {
    const modal = document.getElementById('simulator-modal');
    modal.classList.add('active');
    
    state.simulator.active = true;
    state.simulator.elapsedSeconds = 0;
    state.simulator.currentStep = 1;
    state.simulator.challengeType = 'math';

    playAlarmSound();
    startSimulatorTimer();
    renderCurrentPuzzleStep();
}

function closeSimulatorModal() {
    const modal = document.getElementById('simulator-modal');
    modal.classList.remove('active');
    
    stopAlarmSound();
    if (state.simulator.timerInterval) {
        clearInterval(state.simulator.timerInterval);
    }
    state.simulator.active = false;
}

function startSpecificChallenge(type) {
    openSimulatorModal();
    state.simulator.challengeType = type;
    renderCurrentPuzzleStep();
}

function startSimulatorTimer() {
    if (state.simulator.timerInterval) clearInterval(state.simulator.timerInterval);
    state.simulator.timerInterval = setInterval(() => {
        state.simulator.elapsedSeconds++;
        const mins = String(Math.floor(state.simulator.elapsedSeconds / 60)).padStart(2, '0');
        const secs = String(state.simulator.elapsedSeconds % 60).padStart(2, '0');
        document.getElementById('sim-timer').textContent = `${mins}:${secs}s`;
    }, 1000);
}

function renderCurrentPuzzleStep() {
    document.getElementById('sim-current-step').textContent = state.simulator.currentStep;
    const container = document.getElementById('challenge-container');
    container.innerHTML = '';

    const type = state.simulator.challengeType;
    const typeBadge = document.getElementById('sim-challenge-type-badge');
    
    if (type === 'math') {
        typeBadge.textContent = 'Math Challenge';
        renderMathPuzzle(container);
    } else if (type === 'memory') {
        typeBadge.textContent = 'Memory Matrix';
        renderMemoryPuzzle(container);
    } else if (type === 'logic') {
        typeBadge.textContent = 'Logic Deduction';
        renderLogicPuzzle(container);
    } else if (type === 'riddles') {
        typeBadge.textContent = 'Cognitive Riddle';
        renderRiddlePuzzle(container);
    }
}

// Puzzle Renderer 1: Math
function renderMathPuzzle(container) {
    const step = state.simulator.currentStep;
    let questionText = '';
    let choices = [];
    let correct = 0;

    if (step === 1) {
        questionText = 'Solve: (17 × 4) - 23 = ?';
        correct = 45;
        choices = [39, 45, 51, 48];
    } else if (step === 2) {
        questionText = 'Solve: 144 ÷ 12 + (8 × 7) = ?';
        correct = 68;
        choices = [62, 68, 74, 56];
    } else {
        questionText = 'Solve: (9 × 9) - (7 × 6) = ?';
        correct = 39;
        choices = [39, 41, 35, 45];
    }

    state.simulator.correctAnswer = correct;

    container.innerHTML = `
        <div class="puzzle-question">${questionText}</div>
        <div class="puzzle-options-grid">
            ${choices.map(c => `<button class="puzzle-option-btn" onclick="selectMathOption(${c}, this)">${c}</button>`).join('')}
        </div>
    `;
}

function selectMathOption(val, btn) {
    document.querySelectorAll('.puzzle-option-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    state.simulator.selectedAnswer = val;
}

// Puzzle Renderer 2: Memory Grid Matrix
function renderMemoryPuzzle(container) {
    container.innerHTML = `
        <div class="puzzle-question" style="font-size: 1.1rem; margin-bottom: 8px;">Recall the 4 highlighted tiles in sequence:</div>
        <div class="memory-grid" id="memory-grid-tiles">
            ${Array.from({ length: 12 }).map((_, i) => `<div class="memory-tile" data-index="${i}" onclick="clickMemoryTile(${i}, this)"></div>`).join('')}
        </div>
        <p id="memory-instruction" style="text-align: center; margin-top: 10px; font-size: 0.75rem; color: var(--accent-cyan);">Memorizing pattern...</p>
    `;

    state.simulator.memoryPattern = [1, 5, 8, 10];
    state.simulator.userPattern = [];

    setTimeout(() => {
        state.simulator.memoryPattern.forEach(idx => {
            const tile = document.querySelector(`.memory-tile[data-index="${idx}"]`);
            if (tile) tile.classList.add('highlighted');
        });

        setTimeout(() => {
            document.querySelectorAll('.memory-tile').forEach(t => t.classList.remove('highlighted'));
            document.getElementById('memory-instruction').textContent = 'Click the 4 tiles in memory pattern!';
        }, 1200);
    }, 300);
}

function clickMemoryTile(idx, tileEl) {
    tileEl.classList.toggle('active-user');
    if (state.simulator.userPattern.includes(idx)) {
        state.simulator.userPattern = state.simulator.userPattern.filter(i => i !== idx);
    } else {
        state.simulator.userPattern.push(idx);
    }
}

// Puzzle Renderer 3: Logic Deduction
function renderLogicPuzzle(container) {
    container.innerHTML = `
        <div class="puzzle-question">If ▲ = 6 and ■ = 9, what is (■ × ▲) - 14?</div>
        <div class="puzzle-options-grid">
            <button class="puzzle-option-btn" onclick="selectMathOption(40, this)">40</button>
            <button class="puzzle-option-btn" onclick="selectMathOption(42, this)">42</button>
            <button class="puzzle-option-btn" onclick="selectMathOption(54, this)">54</button>
            <button class="puzzle-option-btn" onclick="selectMathOption(38, this)">38</button>
        </div>
    `;
    state.simulator.correctAnswer = 40;
}

// Puzzle Renderer 4: Cognitive Riddle
function renderRiddlePuzzle(container) {
    container.innerHTML = `
        <div class="puzzle-question" style="font-size: 1.1rem; line-height: 1.4;">"I have keys but no locks. I have space but no room. You can enter, but you can't go outside. What am I?"</div>
        <div class="puzzle-options-grid mt-3">
            <button class="puzzle-option-btn" onclick="selectMathOption('keyboard', this)">Keyboard</button>
            <button class="puzzle-option-btn" onclick="selectMathOption('piano', this)">Piano</button>
            <button class="puzzle-option-btn" onclick="selectMathOption('map', this)">Map</button>
            <button class="puzzle-option-btn" onclick="selectMathOption('clock', this)">Clock</button>
        </div>
    `;
    state.simulator.correctAnswer = 'keyboard';
}

function submitChallengeStep() {
    if (state.simulator.challengeType === 'memory') {
        const correctPattern = state.simulator.memoryPattern.sort().join(',');
        const userPattern = state.simulator.userPattern.sort().join(',');
        if (correctPattern !== userPattern) {
            showToast('Incorrect Memory Grid selection! Try again.', 'warning');
            return;
        }
    } else if (state.simulator.selectedAnswer !== state.simulator.correctAnswer) {
        showToast('Incorrect answer! Anti-Snooze Verification prevents disarming.', 'warning');
        return;
    }

    if (state.simulator.currentStep < state.simulator.totalSteps) {
        state.simulator.currentStep++;
        state.simulator.selectedAnswer = null;
        showToast(`Step ${state.simulator.currentStep - 1} Passed! Step ${state.simulator.currentStep} Loading...`, 'info');
        renderCurrentPuzzleStep();
    } else {
        stopAlarmSound();
        if (state.simulator.timerInterval) clearInterval(state.simulator.timerInterval);
        
        if (window.confetti) {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });
        }

        state.userProfile.habitScore = Math.min(100, state.userProfile.habitScore + 2);
        document.getElementById('habit-score-value').textContent = state.userProfile.habitScore;
        document.getElementById('top-habit-score').textContent = `${state.userProfile.habitScore} / 100`;

        showToast(`🎉 ALARM DISARMED! Anti-Snooze Verification Passed in ${state.simulator.elapsedSeconds}s. +2 Habit Score!`, 'success');
        closeSimulatorModal();
    }
}

// --- Wellness Coach Portal Functions ---
function renderClientsTable() {
    const tbody = document.getElementById('client-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    state.clients.forEach(client => {
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        const isRisk = client.status === 'High Snooze Risk';
        tr.innerHTML = `
            <td><strong>${client.name}</strong></td>
            <td>${client.wakeTime}</td>
            <td><span class="badge ${client.score >= 80 ? 'badge-emerald' : 'badge-amber'}">${client.score} / 100</span></td>
            <td>${client.snoozeRate}</td>
            <td>${client.pref}</td>
            <td><span class="badge ${isRisk ? 'badge-amber' : 'badge-emerald'}">${client.status}</span></td>
            <td>
                <button class="btn btn-xs btn-outline" onclick="event.stopPropagation(); selectClientForIntervention('${client.name}')">
                    <i class="fa-solid fa-paper-plane"></i> Intervene
                </button>
            </td>
        `;
        tr.onclick = () => openClientDetailModal(client.name);
        tbody.appendChild(tr);
    });
}

function openClientDetailModal(clientName) {
    const client = state.clients.find(c => c.name === clientName);
    if (!client) return;

    document.getElementById('detail-client-name').textContent = client.name;
    document.getElementById('detail-client-img').src = client.img;
    document.getElementById('detail-client-status').textContent = `${client.status} • Target: ${client.wakeTime}`;
    document.getElementById('detail-client-score').textContent = `${client.score} / 100`;
    document.getElementById('detail-client-snooze').textContent = client.snoozeRate;

    document.getElementById('client-detail-modal').classList.add('active');
}

function closeClientDetailModal() {
    document.getElementById('client-detail-modal').classList.remove('active');
}

function openInterventionFromModal() {
    const clientName = document.getElementById('detail-client-name').textContent;
    closeClientDetailModal();
    selectClientForIntervention(clientName);
}

function filterClients() {
    const query = document.getElementById('client-search').value.toLowerCase();
    const rows = document.querySelectorAll('#client-table-body tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(query) ? '' : 'none';
    });
}

function selectClientForIntervention(clientName) {
    const select = document.getElementById('coach-target-client');
    if (select) {
        select.value = clientName;
        select.scrollIntoView({ behavior: 'smooth' });
        showToast(`Selected ${clientName} for Coach Intervention`, 'info');
    }
}

function handleCoachIntervention(e) {
    e.preventDefault();
    const client = document.getElementById('coach-target-client').value;
    const challenge = document.getElementById('coach-rec-challenge').value;
    const diff = document.getElementById('coach-rec-diff').value;

    showToast(`Intervention & Recommendation dispatched to ${client}!`, 'success');
    addAdminLog('COACH_ACTION', `Dr. Aris Thorne set ${diff} ${challenge} challenge target for client ${client}.`);
    document.getElementById('coach-note').value = '';
}

// --- Admin Portal Functions ---
function renderAdminUsersTable() {
    const tbody = document.getElementById('admin-user-table');
    if (!tbody) return;
    tbody.innerHTML = '';

    state.adminUsers.forEach(u => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${u.name}</strong></td>
            <td><span class="badge badge-purple">${u.role}</span></td>
            <td>${u.auth}</td>
            <td>${u.device}</td>
            <td><span class="badge badge-emerald">${u.status}</span></td>
            <td>
                <button class="btn btn-xs btn-secondary" onclick="toggleUserRole(${u.id})">Change Role</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openAddUserModal() {
    document.getElementById('add-user-modal').classList.add('active');
}

function closeAddUserModal() {
    document.getElementById('add-user-modal').classList.remove('active');
}

function handleCreateUser(e) {
    e.preventDefault();
    const name = document.getElementById('new-user-name').value;
    const role = document.getElementById('new-user-role').value;
    const auth = document.getElementById('new-user-auth').value;

    const newUser = {
        id: Date.now(),
        name: name,
        role: role,
        auth: auth,
        device: 'Web Client',
        status: 'Active'
    };

    state.adminUsers.unshift(newUser);
    renderAdminUsersTable();
    closeAddUserModal();
    showToast(`Created account for ${name} (${role})`, 'success');
    addAdminLog('USER_MGMT', `Created user ${name} with role: ${role}.`);
}

function toggleUserRole(id) {
    const user = state.adminUsers.find(u => u.id === id);
    if (user) {
        user.role = user.role === 'User' ? 'Wellness Coach' : 'User';
        renderAdminUsersTable();
        showToast(`Role updated for ${user.name} -> ${user.role}`, 'success');
    }
}

function addAdminLog(tag, message, type = 'info') {
    const box = document.getElementById('admin-logs-box');
    if (!box) return;
    const timeStr = new Date().toLocaleTimeString();
    const div = document.createElement('div');
    div.className = `log-line ${type}`;
    div.innerHTML = `<span class="time">[${timeStr}]</span> <span class="tag">[${tag}]</span> ${message}`;
    box.prepend(div);
}

function clearLogs() {
    const box = document.getElementById('admin-logs-box');
    if (box) box.innerHTML = '';
}

function startLiveTelemetryLoop() {
    setInterval(() => {
        if (state.currentRole === 'admin') {
            const lat = Math.floor(38 + Math.random() * 8);
            addAdminLog('TELEMETRY', `FastAPI Gateway microservice latency ping: ${lat}ms. Engine health 100%.`, 'info');
        }
    }, 12000);
}

// --- Export System ---
function triggerFullExportModal() {
    document.getElementById('export-modal').classList.add('active');
}

function closeExportModal() {
    document.getElementById('export-modal').classList.remove('active');
}

function exportCoachReport() {
    triggerFullExportModal();
}

function downloadReport(reportName, format) {
    showToast(`Generating ${reportName} (${format.toUpperCase()})...`, 'info');
    
    setTimeout(() => {
        const dummyContent = `Intelligent Cognitive Alarm Platform - Report Export\nReport: ${reportName}\nFormat: ${format.toUpperCase()}\nGenerated: ${new Date().toISOString()}\n\nStatus: Verified`;
        const blob = new Blob([dummyContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportName.toLowerCase().replace(/\s+/g, '_')}_export.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast(`Downloaded: ${reportName} (${format.toUpperCase()})`, 'success');
        closeExportModal();
    }, 1200);
}

function upgradeDifficulty(level) {
    state.userProfile.difficultyLevel = level;
    document.getElementById('user-difficulty-level').textContent = level;
    showToast(`Difficulty Level auto-escalated to ${level}!`, 'success');
}

// --- Toast System ---
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'fa-circle-info';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'warning') icon = 'fa-triangle-exclamation';

    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// --- Chart.js Initializations ---
function initCharts() {
    // 1. User Cognitive Performance Bar Chart
    const ctxUserCognitive = document.getElementById('userCognitiveChart');
    if (ctxUserCognitive) {
        state.charts.userCognitive = new Chart(ctxUserCognitive, {
            type: 'bar',
            data: {
                labels: ['Math Problems', 'Memory Matrix', 'Logic Puzzles', 'Cognitive Riddles'],
                datasets: [
                    {
                        label: 'Solve Speed (sec)',
                        data: [14.2, 18.5, 22.1, 16.8],
                        backgroundColor: 'rgba(0, 242, 254, 0.6)',
                        borderColor: '#00f2fe',
                        borderWidth: 1,
                        borderRadius: 6
                    },
                    {
                        label: 'Accuracy Rate (%)',
                        data: [94, 88, 82, 90],
                        backgroundColor: 'rgba(139, 92, 246, 0.6)',
                        borderColor: '#8b5cf6',
                        borderWidth: 1,
                        borderRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans' } } }
                },
                scales: {
                    x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' } }
                }
            }
        });
    }

    // 2. User 7-Day Wakeup Trend Chart
    const ctxUserTrend = document.getElementById('userWakeupTrendChart');
    if (ctxUserTrend) {
        state.charts.userTrend = new Chart(ctxUserTrend, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [
                    {
                        label: 'Habit Consistency Score',
                        data: [78, 80, 82, 85, 84, 88, 90],
                        borderColor: '#00f2fe',
                        backgroundColor: 'rgba(0, 242, 254, 0.1)',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Snooze Count',
                        data: [2, 1, 1, 0, 0, 1, 0],
                        borderColor: '#f43f5e',
                        backgroundColor: 'transparent',
                        borderDash: [5, 5],
                        tension: 0.2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#94a3b8' } } },
                scales: {
                    x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' } }
                }
            }
        });
    }

    // 3. Wellness Coach Radar Chart
    const ctxCoachRadar = document.getElementById('coachRadarChart');
    if (ctxCoachRadar) {
        state.charts.coachRadar = new Chart(ctxCoachRadar, {
            type: 'radar',
            data: {
                labels: [
                    'Wake-up Consistency (35%)',
                    'Challenge Success (25%)',
                    'Snooze Reduction (20%)',
                    'Sleep Adherence (20%)'
                ],
                datasets: [
                    {
                        label: 'Cohort Average',
                        data: [82, 79, 74, 83],
                        backgroundColor: 'rgba(0, 242, 254, 0.2)',
                        borderColor: '#00f2fe',
                        pointBackgroundColor: '#00f2fe'
                    },
                    {
                        label: 'Target Goal',
                        data: [90, 85, 85, 90],
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        borderColor: '#10b981',
                        borderDash: [4, 4]
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        angleLines: { color: 'rgba(255,255,255,0.08)' },
                        grid: { color: 'rgba(255,255,255,0.08)' },
                        pointLabels: { color: '#94a3b8', font: { size: 10 } },
                        ticks: { display: false, max: 100 }
                    }
                },
                plugins: { legend: { labels: { color: '#94a3b8' } } }
            }
        });
    }

    // 4. Wellness Coach Compliance Bar Chart
    const ctxCoachComp = document.getElementById('coachComplianceChart');
    if (ctxCoachComp) {
        state.charts.coachComp = new Chart(ctxCoachComp, {
            type: 'bar',
            data: {
                labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                datasets: [
                    {
                        label: 'On-Time Wakeups',
                        data: [28, 32, 36, 38],
                        backgroundColor: '#10b981'
                    },
                    {
                        label: 'Snoozed Alarms',
                        data: [14, 10, 6, 4],
                        backgroundColor: '#f59e0b'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { stacked: true, ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { stacked: true, ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' } }
                },
                plugins: { legend: { labels: { color: '#94a3b8' } } }
            }
        });
    }

    // 5. Admin Telemetry Line Chart
    const ctxAdminTelemetry = document.getElementById('adminTelemetryChart');
    if (ctxAdminTelemetry) {
        state.charts.adminTelemetry = new Chart(ctxAdminTelemetry, {
            type: 'line',
            data: {
                labels: ['12:00', '12:05', '12:10', '12:15', '12:20', '12:25', '12:30'],
                datasets: [
                    {
                        label: 'API Gateway Latency (ms)',
                        data: [45, 42, 48, 41, 43, 39, 42],
                        borderColor: '#00f2fe',
                        backgroundColor: 'rgba(0, 242, 254, 0.1)',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Puzzle Gen Latency (ms)',
                        data: [20, 18, 22, 19, 17, 18, 18],
                        borderColor: '#8b5cf6',
                        backgroundColor: 'transparent',
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#94a3b8' } } },
                scales: {
                    x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' } }
                }
            }
        });
    }

    // 6. Admin Puzzle Distribution Doughnut Chart
    const ctxAdminPuzzle = document.getElementById('adminPuzzleDistChart');
    if (ctxAdminPuzzle) {
        state.charts.adminPuzzle = new Chart(ctxAdminPuzzle, {
            type: 'doughnut',
            data: {
                labels: ['Math Problems (35%)', 'Memory Matrix (25%)', 'Logic Puzzles (20%)', 'Cognitive Riddles (20%)'],
                datasets: [{
                    data: [35, 25, 20, 20],
                    backgroundColor: ['#00f2fe', '#8b5cf6', '#10b981', '#f59e0b'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right', labels: { color: '#94a3b8' } }
                }
            }
        });
    }
}
