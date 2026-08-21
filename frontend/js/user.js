/* ==========================================================================
   INTELLIGENT COGNITIVE ALARM PLATFORM - USER PORTAL CONTROLLER
   ========================================================================== */

// 1. Data Store / State Managers
let alarms = [];
let alarmMonitorInterval = null;
let alarmTriggerCache = new Set();
// API Base URL is globally configured in window.API_BASE_URL


function getAuthHeaders() {
    const session = JSON.parse(localStorage.getItem('sessionUser') || '{}');
    return {
        'Content-Type': 'application/json',
        'Authorization': session.accessToken ? `Bearer ${session.accessToken}` : ''
    };
}

async function fetchAlarmsFromServer() {
    try {
        const response = await fetch(`${window.API_BASE_URL}/api/alarms/`, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        if (response.ok) {
            alarms = await response.json();
            renderAlarms();
            startAlarmMonitor();
        } else {
            console.error('Failed to fetch alarms from server:', response.status);
            renderAlarms();
        }
    } catch (e) {
        console.error('Network error fetching alarms:', e);
        renderAlarms();
    }
}

function getChallengeLabel(challenge) {
    if (challenge === 'math') return 'Math Formulas';
    if (challenge === 'tap') return 'Precision Taps';
    if (challenge === 'none') return 'None';
    return challenge || 'None';
}

function getAlarmAudioElement() {
    let audio = document.getElementById('alarm-audio');
    if (!audio) {
        audio = document.createElement('audio');
        audio.id = 'alarm-audio';
        audio.loop = true;
        audio.preload = 'auto';

        const src1 = document.createElement('source');
        src1.src = '../assets/sounds/radar.mp3';
        src1.type = 'audio/mpeg';

        const src2 = document.createElement('source');
        src2.src = '/assets/sounds/radar.mp3';
        src2.type = 'audio/mpeg';

        audio.appendChild(src1);
        audio.appendChild(src2);
        document.body.appendChild(audio);
    }
    return audio;
}

let currentRingingAlarm = null;
let activeCognitiveChallenge = null;
let selectedChallengeOption = null;
let memoryTimer = null;
let synthPulseInterval = null;

window.stopAlarmSound = () => {
    const audio = getAlarmAudioElement();
    if (audio) {
        audio.pause();
        audio.currentTime = 0;
    }
    if (synthPulseInterval) {
        clearInterval(synthPulseInterval);
        synthPulseInterval = null;
    }
    currentRingingAlarm = null;
    activeCognitiveChallenge = null;
    selectedChallengeOption = null;
    stopChallengeTimer();
};

function triggerAlarmSound(alarm) {
    if (!alarm) return;

    // Prevent duplicate triggers if an alarm is already actively ringing
    if (currentRingingAlarm) {
        console.log("⚠️ Alarm already ringing. Ignoring duplicate trigger for:", alarm.title || alarm.id);
        return;
    }

    currentRingingAlarm = alarm;

    console.log("🔔 ALARM TRIGGERED:", alarm.title || alarm.id);

    const audio = getAlarmAudioElement();

    if (audio) {
        audio.loop = true;
        audio.volume = 1.0;
        audio.currentTime = 0;

        audio.play()
            .then(() => {
                console.log("🔊 ALARM AUDIO PLAYING SUCCESSFULLY");
            })
            .catch(error => {
                console.error("❌ ALARM AUDIO FAILED:", error.name, error.message);

                Toast.show(
                    'Alarm Sound Blocked',
                    'Click anywhere on the page to start the alarm sound.',
                    'warning',
                    6000
                );

                const unlockAudio = async () => {
                    try {
                        audio.currentTime = 0;
                        audio.loop = true;
                        audio.volume = 1.0;

                        await audio.play();

                        console.log("🔊 ALARM AUDIO UNLOCKED AND PLAYING");

                        document.removeEventListener('click', unlockAudio);
                        document.removeEventListener('keydown', unlockAudio);
                    } catch (err) {
                        console.error("❌ Audio still blocked:", err);
                    }
                };

                document.addEventListener('click', unlockAudio);
                document.addEventListener('keydown', unlockAudio);
            });
    }

    // Set alarm title
    const modalTitle = document.getElementById('alarm-modal-title');
    if (modalTitle) {
        modalTitle.textContent = `Wake-Up: ${alarm.title || 'Alarm'}`;
    }

    // Generate/display single cognitive challenge
    if (
        alarm.challenge &&
        typeof alarm.challenge === 'object' &&
        alarm.challenge.question
    ) {
        displayCognitiveChallenge(alarm.challenge);
    } else {
        const chType = alarm.challenge_type || (typeof alarm.challenge === 'string' && alarm.challenge !== 'none' ? alarm.challenge : 'Math Problems');
        const diff = alarm.difficulty || alarm.difficulty_level || 'Medium';
        const alarmIdParam = alarm.id ? `&alarm_id=${encodeURIComponent(alarm.id)}` : '';

        fetch(
            `${window.API_BASE_URL}/api/challenges/generate?challenge_type=${encodeURIComponent(chType)}&difficulty=${encodeURIComponent(diff)}${alarmIdParam}`,
            {
                headers: getAuthHeaders()
            }
        )
            .then(res => res.json())
            .then(data => {
                displayCognitiveChallenge(data);
            })
            .catch(err => {
                console.error('Error fetching cognitive challenge:', err);

                displayCognitiveChallenge({
                    type: chType || 'Math Problems',
                    difficulty: diff,
                    question: 'What is 15 + 28?',
                    options: ['33', '43', '45', '53'],
                    answer: '43',
                    explanation: '15 + 28 = 43.'
                });
            });
    }

    Toast.show(
        'Wake-Up Alarm',
        `${alarm.title || 'Alarm'} is ringing! Solve the challenge to silence it.`,
        'warning',
        10000
    );
}

let currentAttemptNumber = 1;
let challengeStartTime = 0;
let challengeTimerInterval = null;

const COMMON_CHALLENGE_TIME_LIMIT = 30;

function getDifficultyTimeLimit(difficulty) {
    return COMMON_CHALLENGE_TIME_LIMIT;
}

function startChallengeTimer(timeLimitSeconds) {
    if (challengeTimerInterval) {
        clearInterval(challengeTimerInterval);
        challengeTimerInterval = null;
    }

    challengeStartTime = Date.now();
    let secondsLeft = timeLimitSeconds;

    const timerDisplay = document.getElementById('challenge-timer-display');
    const updateUI = () => {
        const mins = Math.floor(secondsLeft / 60);
        const secs = secondsLeft % 60;
        const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        if (timerDisplay) {
            timerDisplay.textContent = formatted;
            if (secondsLeft <= 5) {
                timerDisplay.style.color = '#ef4444';
            } else if (secondsLeft <= 10) {
                timerDisplay.style.color = '#f59e0b';
            } else {
                timerDisplay.style.color = '#10b981';
            }
        }
    };

    updateUI();

    challengeTimerInterval = setInterval(async () => {
        secondsLeft--;
        updateUI();

        if (secondsLeft <= 0) {
            clearInterval(challengeTimerInterval);
            challengeTimerInterval = null;
            await handleChallengeTimeout();
        }
    }, 1000);
}

function stopChallengeTimer() {
    if (challengeTimerInterval) {
        clearInterval(challengeTimerInterval);
        challengeTimerInterval = null;
    }
}

async function handleChallengeTimeout() {
    const timeTaken = Math.round((Date.now() - challengeStartTime) / 1000);
    const feedback = document.getElementById('challenge-feedback');

    try {
        const response = await fetch(`${window.API_BASE_URL}/api/challenges/validate`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                challenge_id: activeCognitiveChallenge ? activeCognitiveChallenge.id : null,
                user_answer: '',
                correct_answer: activeCognitiveChallenge ? activeCognitiveChallenge.answer : null,
                challenge_type: activeCognitiveChallenge ? activeCognitiveChallenge.type : null,
                difficulty: activeCognitiveChallenge ? activeCognitiveChallenge.difficulty : null,
                question: activeCognitiveChallenge ? activeCognitiveChallenge.question : null,
                alarm_id: currentRingingAlarm ? currentRingingAlarm.id : null,
                attempt_number: currentAttemptNumber,
                time_taken: timeTaken,
                time_limit: COMMON_CHALLENGE_TIME_LIMIT,
                is_timeout: true
            })
        });

        if (response.ok) {
            const resData = await response.json();
            currentAttemptNumber++;

            if (resData.next_challenge) {
                displayCognitiveChallenge(resData.next_challenge, currentAttemptNumber);
                if (feedback) {
                    feedback.style.color = '#f59e0b';
                    feedback.textContent = resData.message || '⏱️ Time expired! Lowering difficulty. Solve this new question:';
                }
            } else {
                const attemptBadge = document.getElementById('challenge-attempt-badge');
                if (attemptBadge) attemptBadge.textContent = `Attempt ${currentAttemptNumber}`;
                if (feedback) {
                    feedback.style.color = 'var(--color-danger)';
                    feedback.textContent = '⏱️ Time expired! Attempt recorded as failed. Try again!';
                }
                startChallengeTimer(COMMON_CHALLENGE_TIME_LIMIT);
            }
            Toast.show('Time Expired', 'Lowering difficulty. Try this new question!', 'danger', 3000);
        }
    } catch (err) {
        console.error('Error handling challenge timeout:', err);
    }
}

function displayCognitiveChallenge(challenge, attemptNum = 1) {
    activeCognitiveChallenge = challenge;
    selectedChallengeOption = null;
    currentAttemptNumber = attemptNum || 1;

    if (memoryTimer) {
        clearInterval(memoryTimer);
        memoryTimer = null;
    }

    const titleElem = document.getElementById('challenge-modal-title');
    const typeBadge = document.getElementById('challenge-type-badge');
    const diffBadge = document.getElementById('challenge-difficulty-badge');
    const attemptBadge = document.getElementById('challenge-attempt-badge');
    const questionElem = document.getElementById('challenge-question');
    const subtitleElem = document.getElementById('challenge-subtitle');
    const optionsContainer = document.getElementById('challenge-options-container');
    const inputGroup = document.getElementById('challenge-input-group');
    const answerInput = document.getElementById('challenge-answer');
    const feedbackElem = document.getElementById('challenge-feedback');

    if (titleElem) titleElem.textContent = challenge.type || 'Wake-up Challenge';
    if (typeBadge) typeBadge.textContent = challenge.type || 'Math Problems';
    if (diffBadge) {
        diffBadge.textContent = challenge.difficulty || 'Medium';
        diffBadge.className = `badge ${challenge.difficulty === 'Beginner' || challenge.difficulty === 'Easy' ? 'badge-success' : challenge.difficulty === 'Difficult' || challenge.difficulty === 'Advanced' ? 'badge-danger' : 'badge-warning'}`;
    }
    if (attemptBadge) attemptBadge.textContent = `Attempt ${currentAttemptNumber}`;

    if (feedbackElem) {
        feedbackElem.textContent = '';
        feedbackElem.style.color = '';
    }

    if (answerInput) answerInput.value = '';

    // Handle Memory Challenge timing behavior
    const isMemoryChallenge = (challenge.type === 'Memory Challenges' || (challenge.question && challenge.question.toLowerCase().includes('memorize')));

    if (isMemoryChallenge && challenge.question.includes('. What')) {
        const parts = challenge.question.split('. What');
        const memorizeText = parts[0];
        const recallQuestion = 'What' + parts[1];

        if (subtitleElem) subtitleElem.textContent = 'Memorize the items! List will disappear in 5 seconds...';
        if (questionElem) questionElem.textContent = memorizeText;

        if (optionsContainer) optionsContainer.style.display = 'none';
        if (inputGroup) inputGroup.style.display = 'none';

        let countdown = 5;
        memoryTimer = setInterval(() => {
            countdown--;
            if (subtitleElem) subtitleElem.textContent = `Memorize the items! Disappearing in ${countdown}s...`;
            if (countdown <= 0) {
                clearInterval(memoryTimer);
                memoryTimer = null;
                if (subtitleElem) subtitleElem.textContent = 'Recall time! Choose or type the correct item:';
                if (questionElem) questionElem.textContent = recallQuestion;
                renderChallengeControls(challenge, optionsContainer, inputGroup);

                const timeLimit = challenge.time_limit || getDifficultyTimeLimit(challenge.difficulty);
                startChallengeTimer(timeLimit);
            }
        }, 1000);
    } else {
        if (subtitleElem) subtitleElem.textContent = 'Solve the challenge to silence the wake-up alarm!';
        if (questionElem) questionElem.textContent = challenge.question;
        renderChallengeControls(challenge, optionsContainer, inputGroup);

        const timeLimit = challenge.time_limit || getDifficultyTimeLimit(challenge.difficulty);
        startChallengeTimer(timeLimit);
    }

    Modal.open('challenge-modal');
}

function renderChallengeControls(challenge, optionsContainer, inputGroup) {
    if (optionsContainer) optionsContainer.innerHTML = '';

    if (challenge.options && Array.isArray(challenge.options) && challenge.options.length > 0) {
        if (optionsContainer) optionsContainer.style.display = 'flex';
        if (inputGroup) inputGroup.style.display = 'none';

        challenge.options.forEach(opt => {
            const optBtn = document.createElement('button');
            optBtn.type = 'button';
            optBtn.className = 'btn';
            optBtn.style.cssText = 'background: rgba(255,255,255,0.08); color: var(--text-primary); border: 1px solid var(--glass-border); padding: 12px 16px; border-radius: 8px; text-align: left; font-size: 1rem; transition: all 0.2s ease; cursor: pointer; display: flex; align-items: center; justify-content: space-between;';
            optBtn.innerHTML = `<span>${opt}</span><i class="far fa-circle text-muted"></i>`;

            optBtn.addEventListener('click', () => {
                selectedChallengeOption = opt;
                optionsContainer.querySelectorAll('button').forEach(b => {
                    b.style.background = 'rgba(255,255,255,0.08)';
                    b.style.borderColor = 'var(--glass-border)';
                    b.querySelector('i').className = 'far fa-circle text-muted';
                });
                optBtn.style.background = 'rgba(79, 70, 229, 0.25)';
                optBtn.style.borderColor = 'var(--color-primary)';
                optBtn.querySelector('i').className = 'fas fa-check-circle text-success';
            });

            optionsContainer.appendChild(optBtn);
        });
    } else {
        if (optionsContainer) optionsContainer.style.display = 'none';
        if (inputGroup) inputGroup.style.display = 'block';
    }
}

function startAlarmMonitor() {
    if (alarmMonitorInterval) return;

    // Single unified alarm monitor polling backend scheduler queue
    alarmMonitorInterval = setInterval(checkAlarmTriggers, 2000);
    checkAlarmTriggers();
}

async function checkAlarmTriggers() {
    // If an alarm is already ringing, do not poll or trigger another one
    if (currentRingingAlarm) return;

    // Backend Scheduler is the single source of truth for triggered alarms
    try {
        const response = await fetch(`${window.API_BASE_URL}/api/alarms/triggered`, {
            headers: getAuthHeaders()
        });
        if (response.ok) {
            const triggered = await response.json();
            if (Array.isArray(triggered) && triggered.length > 0) {
                const alarmItem = triggered[0];
                const now = new Date();
                const cacheKey = `alarm-${alarmItem.id}-${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}-${now.getHours()}:${now.getMinutes()}`;
                if (!alarmTriggerCache.has(cacheKey) && !currentRingingAlarm) {
                    alarmTriggerCache.add(cacheKey);
                    triggerAlarmSound(alarmItem);
                }
            }
        }
    } catch (e) {
        // Backend not reachable or no session, keep waiting
    }
}

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

    // Persist active tab state for later page visits
    if (typeof window.setDashboardActiveTab === 'function') {
        window.setDashboardActiveTab(tabId);
    }

    // Close sidebar on mobile after tab switches
    document.body.classList.remove('sidebar-open');
};

const attachDashboardUserEvents = () => {
    document.querySelectorAll('.sidebar-menu-item a').forEach(anchor => {
        anchor.addEventListener('click', (event) => {
            event.preventDefault();
            const item = anchor.closest('.sidebar-menu-item');
            if (!item) return;
            const tabId = item.dataset.tab;
            if (!tabId) return;
            if (typeof window.switchTab === 'function') {
                window.switchTab(tabId);
            }
        });
    });
};

const restoreUserDashboardTab = () => {
    if (typeof window.restoreDashboardActiveTab === 'function') {
        window.restoreDashboardActiveTab();
    }
};

if (document.readyState !== 'loading') {
    attachDashboardUserEvents();
    restoreUserDashboardTab();
} else {
    window.addEventListener('DOMContentLoaded', () => {
        attachDashboardUserEvents();
        restoreUserDashboardTab();
    });
}

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
function getAlarmScheduleLabel(alarm) {
    const alarmType = alarm.alarm_type || 'One-Time';
    if (alarmType === 'One-Time') return 'One-Time';
    if (alarmType === 'Daily') return 'Daily';
    if (alarmType === 'Weekdays' || alarmType === 'Weekday') return 'Weekdays';
    if (alarmType === 'Weekends' || alarmType === 'Weekend') return 'Weekends';
    if (alarmType === 'Custom') return alarm.repeat_days ? alarm.repeat_days.split(',').join(', ') : 'Custom';
    if (alarmType === 'Smart Adaptive') return 'Smart Adaptive';
    return alarm.repeat_days ? alarm.repeat_days.split(',').join(', ') : alarmType;
}

function updateCustomDaysVisibility() {
    const alarmType = document.getElementById('alarm-type')?.value;
    const container = document.getElementById('custom-days-container');
    if (container) {
        container.style.display = alarmType === 'Custom' ? 'block' : 'none';
    }
}

function getTbody(elementId) {
    const elem = document.getElementById(elementId);
    if (!elem) return null;
    if (elem.tagName.toLowerCase() === 'tbody') return elem;
    return elem.querySelector('tbody') || elem;
}

function renderAlarms() {
    const alarmsTable = getTbody('alarms-table-body');
    const managerTable = getTbody('alarms-manager-table');

    // Quick metric update
    const activeAlarms = alarms.filter(a => a.is_active);
    const totalAlarmsElem = document.getElementById('stat-total-alarms');
    if (totalAlarmsElem) totalAlarmsElem.textContent = alarms.length;

    const todayAlarmElem = document.getElementById('stat-today-alarm');
    if (todayAlarmElem) {
        const nextActive = activeAlarms[0];
        todayAlarmElem.textContent = nextActive ? `${formatTime12(nextActive.alarm_time)}` : 'None Active';
    }

    if (alarmsTable) {
        alarmsTable.innerHTML = '';
        if (alarms.length === 0) {
            alarmsTable.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 20px; color: var(--text-secondary);">No alarms configured.</td></tr>`;
        } else {
            alarms.forEach(a => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${a.title}</strong></td>
                    <td><i class="far fa-clock text-muted" style="margin-right:8px;"></i> ${formatTime12(a.alarm_time)}</td>
                    <td><span class="badge ${a.challenge && a.challenge.toLowerCase() !== 'none' ? 'badge-info' : 'badge-warning'}">${getChallengeLabel(a.challenge)}</span></td>
                    <td>${a.is_active ? '<span class="badge badge-success">Standby</span>' : '<span class="badge badge-danger">Disabled</span>'}</td>
                    <td>
                        <label class="switch">
                            <input type="checkbox" ${a.is_active ? 'checked' : ''} onchange="toggleAlarmActive(${a.id})">
                            <span class="slider"></span>
                        </label>
                    </td>
                `;
                alarmsTable.appendChild(tr);
            });
        }
    }

    if (managerTable) {
        managerTable.innerHTML = '';
        if (alarms.length === 0) {
            managerTable.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 24px; color: var(--text-secondary);"><i class="fas fa-clock" style="font-size: 2rem; margin-bottom: 10px; display: block; opacity: 0.5;"></i>No alarms set yet. Click "Set New Alarm" above to create one.</td></tr>`;
        } else {
            alarms.forEach(a => {
                const daysDisplay = getAlarmScheduleLabel(a);
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${a.title}</strong></td>
                    <td><i class="far fa-clock text-muted"></i> ${formatTime12(a.alarm_time)}</td>
                    <td><span class="badge badge-info">${getChallengeLabel(a.challenge)}</span></td>
                    <td><span style="font-size: 0.8rem; color: var(--text-secondary);">${daysDisplay}</span></td>
                    <td>
                        <label class="switch">
                            <input type="checkbox" ${a.is_active ? 'checked' : ''} onchange="toggleAlarmActive(${a.id})">
                            <span class="slider"></span>
                        </label>
                    </td>
                    <td>
                        <button class="table-action-btn edit-btn" onclick="editAlarm(${a.id})" title="Edit Alarm" style="margin-right:8px; background:var(--color-primary); color:white;"><i class="fas fa-edit"></i></button>
                        <button class="table-action-btn delete-btn" onclick="deleteAlarm(${a.id})" title="Delete Alarm"><i class="fas fa-trash-alt"></i></button>
                    </td>
                `;
                managerTable.appendChild(tr);
            });
        }
    }

    updateGoalProgress();
}

window.toggleAlarmActive = async (id) => {
    const alarm = alarms.find(a => a.id === id);
    if (!alarm) return;
    const action = alarm.is_active ? 'disable' : 'enable';
    try {
        const response = await fetch(`${window.API_BASE_URL}/api/alarms/${id}/${action}`, {
            method: 'PATCH',
            headers: getAuthHeaders()
        });
        if (response.ok) {
            const updated = await response.json();
            alarm.is_active = updated.is_active;
            renderAlarms();
            Toast.show('Alarm Updated', `"${alarm.title}" is now ${alarm.is_active ? 'active' : 'inactive'}.`, 'success', 2000);
        } else {
            Toast.show('Error', 'Failed to update alarm status.', 'danger', 2500);
        }
    } catch (e) {
        console.error('Error toggling alarm active state:', e);
        Toast.show('Error', 'Could not sync update with server.', 'danger', 2500);
    }
};

window.deleteAlarm = async (id) => {
    try {
        const response = await fetch(`${window.API_BASE_URL}/api/alarms/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        if (response.ok) {
            alarms = alarms.filter(a => a.id !== id);
            renderAlarms();
            Toast.show('Alarm Removed', 'The alarm configuration was deleted.', 'danger', 2000);
        } else {
            Toast.show('Error', 'Failed to delete alarm.', 'danger', 2500);
        }
    } catch (e) {
        console.error('Error deleting alarm:', e);
        Toast.show('Error', 'Could not delete alarm.', 'danger', 2500);
    }
};

window.editAlarm = (id) => {
    const alarm = alarms.find(a => a.id === id);
    if (!alarm) return;

    document.getElementById('edit-alarm-id').value = alarm.id;
    document.getElementById('alarm-label').value = alarm.title;
    document.getElementById('alarm-time').value = alarm.alarm_time;
    document.getElementById('alarm-type').value = alarm.alarm_type;
    document.getElementById('alarm-challenge').value = alarm.challenge;
    document.getElementById('alarm-difficulty').value = alarm.difficulty_level || 'Medium';
    document.getElementById('alarm-sound').value = alarm.sound || 'Radar';
    document.getElementById('alarm-vibration').value = alarm.vibration || 'Standard';

    const activeDays = alarm.repeat_days ? alarm.repeat_days.split(',') : [];
    document.querySelectorAll('#custom-days-container input[type="checkbox"]').forEach(cb => {
        cb.checked = activeDays.includes(cb.value);
    });
    updateCustomDaysVisibility();

    const modalTitle = document.getElementById('alarm-modal-title');
    if (modalTitle) modalTitle.textContent = 'Update Cognitive Alarm';

    Modal.open('add-alarm-modal');
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

// 7. Dynamic Cognitive Challenge Drill & Verification
window.triggerChallenge = () => {
    fetch(`${window.API_BASE_URL}/api/challenges/generate?challenge_type=Math%20Problems&difficulty=Medium`, {
        headers: getAuthHeaders()
    })
        .then(res => res.json())
        .then(data => {
            displayCognitiveChallenge(data);
        })
        .catch(() => triggerMathChallenge());
};

window.triggerMathChallenge = () => {
    fetch(`${window.API_BASE_URL}/api/challenges/generate?challenge_type=Math%20Problems&difficulty=Easy`, {
        headers: getAuthHeaders()
    })
        .then(res => res.json())
        .then(data => {
            displayCognitiveChallenge(data);
        })
        .catch(err => console.error('Error generating math challenge:', err));
};

// Handle checking answer via backend API
const submitChallengeBtn = document.getElementById('submit-challenge-btn');
if (submitChallengeBtn) {
    submitChallengeBtn.addEventListener('click', async () => {
        let userAnswer = '';
        if (activeCognitiveChallenge && activeCognitiveChallenge.options && activeCognitiveChallenge.options.length > 0) {
            userAnswer = selectedChallengeOption || '';
        } else {
            const inputElem = document.getElementById('challenge-answer');
            userAnswer = inputElem ? inputElem.value.trim() : '';
        }

        const feedback = document.getElementById('challenge-feedback');

        if (!userAnswer) {
            if (feedback) {
                feedback.style.color = 'var(--color-danger)';
                feedback.textContent = 'Please select or enter an answer first!';
            }
            return;
        }

        const timeTaken = Math.round((Date.now() - challengeStartTime) / 1000);
        stopChallengeTimer();

        try {
            const response = await fetch(`${window.API_BASE_URL}/api/challenges/validate`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    challenge_id: activeCognitiveChallenge ? activeCognitiveChallenge.id : null,
                    user_answer: userAnswer,
                    correct_answer: activeCognitiveChallenge ? activeCognitiveChallenge.answer : null,
                    challenge_type: activeCognitiveChallenge ? activeCognitiveChallenge.type : null,
                    difficulty: activeCognitiveChallenge ? activeCognitiveChallenge.difficulty : null,
                    question: activeCognitiveChallenge ? activeCognitiveChallenge.question : null,
                    alarm_id: currentRingingAlarm ? currentRingingAlarm.id : null,
                    attempt_number: currentAttemptNumber,
                    time_taken: timeTaken,
                    time_limit: activeCognitiveChallenge ? (activeCognitiveChallenge.time_limit || 20) : 20,
                    is_timeout: false
                })
            });

            if (response.ok) {
                const resData = await response.json();
                if (resData.correct) {
                    feedback.style.color = 'var(--color-success)';
                    feedback.textContent = resData.message || '✓ Correct! Neural wakeup sequence confirmed.';

                    stopAlarmSound();
                    stopChallengeTimer();

                    dailyChallengeCompleted = true;
                    challengeHistory.unshift({
                        mode: activeCognitiveChallenge ? activeCognitiveChallenge.type : 'Cognitive Challenge',
                        score: '100% (Pass)',
                        date: 'Just Now'
                    });
                    localStorage.setItem('user_challenges', JSON.stringify(challengeHistory));
                    renderHistoryLog();

                    if (currentRingingAlarm && currentRingingAlarm.id) {
                        const alarmType = currentRingingAlarm.alarm_type || 'One-Time';
                        if (alarmType === 'One-Time') {
                            fetch(`${window.API_BASE_URL}/api/alarms/${currentRingingAlarm.id}/disable`, {
                                method: 'PATCH',
                                headers: getAuthHeaders()
                            }).then(() => fetchAlarmsFromServer()).catch(console.error);
                        }
                    }

                    Toast.show('Wakeup Drill Clear!', 'Prefrontal cortex activated successfully! +10 Points.', 'success', 3000);
                    updateGoalProgress();
                    fetchAnalyticsData();

                    setTimeout(() => {
                        Modal.close('challenge-modal');
                    }, 1200);
                } else {
                    currentAttemptNumber++;
                    const modalContainer = document.querySelector('#challenge-modal .modal-container');
                    if (modalContainer) {
                        modalContainer.style.border = '2px solid var(--color-danger)';
                        setTimeout(() => {
                            modalContainer.style.border = '1px solid var(--glass-border)';
                        }, 800);
                    }

                    if (resData.next_challenge) {
                        // Render fresh question with lowered difficulty
                        displayCognitiveChallenge(resData.next_challenge, currentAttemptNumber);
                        feedback.style.color = 'var(--color-danger)';
                        feedback.textContent = resData.message || '✗ Incorrect! Lowering difficulty. Solve this new question:';
                    } else {
                        const attemptBadge = document.getElementById('challenge-attempt-badge');
                        if (attemptBadge) attemptBadge.textContent = `Attempt ${currentAttemptNumber}`;
                        feedback.style.color = 'var(--color-danger)';
                        feedback.textContent = resData.message || '✗ Incorrect answer. Try again!';
                        startChallengeTimer(COMMON_CHALLENGE_TIME_LIMIT);
                    }
                }
            } else {
                feedback.style.color = 'var(--color-danger)';
                feedback.textContent = 'Server validation failed. Try again.';
            }
        } catch (e) {
            console.error('Error validating challenge answer:', e);
            feedback.style.color = 'var(--color-danger)';
            feedback.textContent = 'Network error validating answer. Try again.';
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
    // Intercept clicks to "Add Alarm" button to reset form to creation mode
    document.querySelectorAll('[onclick="Modal.open(\'add-alarm-modal\')"]').forEach(btn => {
        btn.removeAttribute('onclick');
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('edit-alarm-id').value = '';
            addAlarmForm.reset();
            const alarmTypeSelect = document.getElementById('alarm-type');
            if (alarmTypeSelect) {
                alarmTypeSelect.value = 'One-Time';
            }
            updateCustomDaysVisibility();
            const modalTitle = document.getElementById('alarm-modal-title');
            if (modalTitle) modalTitle.textContent = 'Set Cognitive Alarm';
            Modal.open('add-alarm-modal');
        });
    });

    document.getElementById('alarm-type')?.addEventListener('change', updateCustomDaysVisibility);

    function getInputValue(idCandidates, fallback = '') {
        for (const id of idCandidates) {
            const elem = document.getElementById(id);
            if (elem && elem.value !== undefined && elem.value !== null && elem.value !== '') {
                return elem.value;
            }
        }
        return fallback;
    }

    addAlarmForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const alarmId = getInputValue(['edit-alarm-id'], '');
        const rawTitle = getInputValue(['alarm-label', 'alarm-title-input'], 'Wakeup Alarm');
        const title = rawTitle.trim() || 'Wakeup Alarm';
        const alarm_time = getInputValue(['alarm-time', 'alarm-time-input'], '07:00');
        const alarm_type = getInputValue(['alarm-type', 'alarm-repeat-select'], 'Daily');
        const challenge = getInputValue(['alarm-challenge', 'alarm-challenge-select'], 'Math Problems');
        const difficulty_level = getInputValue(['alarm-difficulty'], 'Medium');
        const sound = getInputValue(['alarm-sound'], 'Radar');
        const vibration = getInputValue(['alarm-vibration'], 'Standard');

        const checkedDays = [];
        addAlarmForm.querySelectorAll('#custom-days-container input[type="checkbox"]:checked').forEach(cb => {
            checkedDays.push(cb.value);
        });

        let repeat_days = '';
        switch (alarm_type) {
            case 'One-Time':
                repeat_days = '';
                break;
            case 'Daily':
                repeat_days = 'Mon,Tue,Wed,Thu,Fri,Sat,Sun';
                break;
            case 'Weekdays':
                repeat_days = 'Mon,Tue,Wed,Thu,Fri';
                break;
            case 'Weekends':
                repeat_days = 'Sat,Sun';
                break;
            case 'Custom':
                repeat_days = checkedDays.join(',');
                if (!repeat_days) {
                    Toast.show('Error', 'Please select at least one repeating day for a custom alarm.', 'danger', 2500);
                    return;
                }
                break;
            case 'Weekday':
                repeat_days = 'Mon,Tue,Wed,Thu,Fri';
                break;
            case 'Weekend':
                repeat_days = 'Sat,Sun';
                break;
            default:
                repeat_days = '';
        }

        const payload = {
            title,
            alarm_time,
            alarm_type,
            repeat_days,
            is_active: true,
            challenge,
            difficulty_level,
            sound,
            vibration
        };

        try {
            let response;
            if (alarmId) {
                response = await fetch(`${window.API_BASE_URL}/api/alarms/${alarmId}`, {
                    method: 'PUT',
                    headers: getAuthHeaders(),
                    body: JSON.stringify(payload)
                });
            } else {
                response = await fetch(`${window.API_BASE_URL}/api/alarms/`, {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify(payload)
                });
            }

            if (response.ok) {
                const savedAlarm = await response.json();
                if (alarmId) {
                    const idx = alarms.findIndex(a => a.id === parseInt(alarmId));
                    if (idx !== -1) alarms[idx] = savedAlarm;
                    Toast.show('Alarm Updated', `"${title}" was saved successfully.`, 'success', 3000);
                } else {
                    alarms.push(savedAlarm);
                    Toast.show('Alarm Created', `"${title}" alarm set for ${formatTime12(alarm_time)}`, 'success', 3000);
                }

                renderAlarms();
                Modal.close('add-alarm-modal');
                addAlarmForm.reset();
                document.getElementById('edit-alarm-id').value = '';
            } else {
                const errData = await response.json().catch(() => ({}));
                const errMsg = errData.detail ? (Array.isArray(errData.detail) ? errData.detail.map(e => e.msg).join(', ') : errData.detail) : 'Failed to save alarm.';
                Toast.show('Error', errMsg, 'danger', 3000);
            }
        } catch (e) {
            console.error('Error saving alarm:', e);
            Toast.show('Error', 'Network error. Check backend connection.', 'danger', 3000);
        }
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
    fetchAlarmsFromServer();
    fetchAnalyticsData();
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

// (Duplicate checkTriggeredAlarm removed; unified in startAlarmMonitor)

// ==========================================================================
// REAL PERFORMANCE & ANALYTICS DATA CONTROLLER
// ==========================================================================
let analyticsChartInstance = null;
let dbAnalyticsChartInstance = null;

async function fetchAnalyticsData() {
    try {
        const headers = getAuthHeaders();

        // 1. Summary Metrics
        const summaryRes = await fetch(`${window.API_BASE_URL}/api/analytics/summary`, { headers });
        let strongTypes = [];
        let weakTypes = [];

        if (summaryRes.ok) {
            const summary = await summaryRes.json();
            strongTypes = summary.strong_types || [];
            weakTypes = summary.weak_types || [];

            const accStr = `${summary.overall_accuracy}%`;
            const passedStr = summary.passed_challenges;
            const failedStr = summary.failed_challenges;
            const timeStr = `${summary.average_completion_time}s`;
            const streakStr = `${summary.current_streak} Days 🔥`;
            const diffStr = `Recommended: ${summary.recommended_difficulty}`;
            const cognitiveScore = summary.cognitive_score != null ? Math.round(summary.cognitive_score) : 50;
            const rawTrend = (summary.trend || 'stable').toLowerCase();
            const trendLabel = rawTrend === 'improving' ? 'Improving 🚀' : (rawTrend === 'declining' ? 'Declining 📉' : 'Stable ⚖️');
            const reasonText = summary.recommendation_reason || 'Calibrating personalized challenge difficulty.';

            ['analytics-accuracy', 'db-analytics-accuracy'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.textContent = accStr;
            });

            ['analytics-passed', 'db-analytics-passed'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.textContent = passedStr;
            });

            ['analytics-failed', 'db-analytics-failed'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.textContent = failedStr;
            });

            ['analytics-avg-time', 'db-analytics-avg-time'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.textContent = timeStr;
            });

            ['analytics-streak', 'db-analytics-streak'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.textContent = streakStr;
            });

            ['recommended-diff-badge', 'db-recommended-diff-badge'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.textContent = diffStr;
            });

            // Populate Cognitive Score & Trend
            ['cognitive-score-val', 'db-cognitive-score-val'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.textContent = cognitiveScore;
            });

            ['performance-trend-val', 'db-performance-trend-val'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.textContent = trendLabel;
            });

            // Populate Adaptive Recommendation Reason
            ['adaptive-reason-text', 'db-adaptive-reason-text'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.textContent = reasonText;
            });

            // Populate Strong Types List
            const strongHtml = strongTypes.length > 0
                ? strongTypes.map(t => `<span style="background: rgba(34, 197, 94, 0.18); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.4); padding: 4px 10px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; display: inline-flex; align-items: center; gap: 6px;"><i class="fas fa-check-circle"></i> ${t}</span>`).join('')
                : '<span style="color: var(--text-muted); font-size: 0.82rem;">Complete more sessions with &ge;85% accuracy to unlock domain mastery.</span>';

            ['strong-types-list', 'db-strong-types-list'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.innerHTML = strongHtml;
            });

            // Populate Weak Types List
            const weakHtml = weakTypes.length > 0
                ? weakTypes.map(t => `<span style="background: rgba(239, 68, 68, 0.18); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); padding: 4px 10px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; display: inline-flex; align-items: center; gap: 6px;"><i class="fas fa-exclamation-triangle"></i> ${t}</span>`).join('')
                : '<span style="color: #4ade80; font-size: 0.82rem;"><i class="fas fa-shield-alt"></i> No weak challenge domains detected (&ge;70% across domains).</span>';

            ['weak-types-list', 'db-weak-types-list'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.innerHTML = weakHtml;
            });
        }

        // 2. Performance by Type (with strong/weak domain badges)
        const byTypeRes = await fetch(`${window.API_BASE_URL}/api/analytics/by-type`, { headers });
        if (byTypeRes.ok) {
            const typeData = await byTypeRes.json();
            renderAnalyticsBreakdown('by-type', typeData, strongTypes, weakTypes);
        }

        // 3. Performance by Difficulty
        const byDiffRes = await fetch(`${window.API_BASE_URL}/api/analytics/by-difficulty`, { headers });
        if (byDiffRes.ok) {
            const diffData = await byDiffRes.json();
            renderAnalyticsBreakdown('by-difficulty', diffData);
        }

        // 4. Daily History & Recent Attempt Logs
        const historyRes = await fetch(`${window.API_BASE_URL}/api/analytics/history`, { headers });
        if (historyRes.ok) {
            const historyData = await historyRes.json();
            renderAnalyticsChart(historyData.daily_history || []);
            renderAnalyticsHistoryTable(historyData.recent_logs || []);
        }

    } catch (e) {
        console.error('Error fetching analytics data:', e);
    }
}

function renderAnalyticsBreakdown(mode, items, strongTypes = [], weakTypes = []) {
    const isType = mode === 'by-type';
    const containers = isType
        ? ['analytics-by-type-container', 'db-analytics-by-type-container']
        : ['analytics-by-diff-container', 'db-analytics-by-diff-container'];

    let html = '';
    if (!items || items.length === 0) {
        html = '<p style="color: var(--text-muted); font-size: 0.85rem;">No attempt records found yet.</p>';
    } else {
        items.forEach(item => {
            const title = isType ? item.challenge_type : item.difficulty;
            const accuracy = item.accuracy_percentage || 0;
            const total = item.total_attempts || 0;
            const passed = item.passed || 0;
            const avgTime = item.avg_time_taken || 0;

            let barColor = '#a855f7';
            if (accuracy >= 80) barColor = '#22c55e';
            else if (accuracy >= 50) barColor = '#f59e0b';
            else if (total > 0) barColor = '#ef4444';

            let typeBadgeHtml = '';
            if (isType) {
                if (strongTypes.includes(title)) {
                    typeBadgeHtml = `<span style="background: rgba(34, 197, 94, 0.15); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.35); font-size: 0.72rem; padding: 2px 8px; border-radius: 4px; font-weight: 600; margin-left: 6px;">💪 Strong Domain</span>`;
                } else if (weakTypes.includes(title)) {
                    typeBadgeHtml = `<span style="background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.35); font-size: 0.72rem; padding: 2px 8px; border-radius: 4px; font-weight: 600; margin-left: 6px;">⚠️ Needs Practice</span>`;
                }
            }

            html += `
                <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 8px; border: 1px solid var(--glass-border);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; flex-wrap: wrap; gap: 4px;">
                        <div style="display: flex; align-items: center;">
                            <span style="font-weight: 600; font-size: 0.9rem;">${title}</span>
                            ${typeBadgeHtml}
                        </div>
                        <span style="font-weight: 700; color: ${barColor}; font-size: 0.9rem;">${accuracy}% (${passed}/${total})</span>
                    </div>
                    <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden; margin-bottom: 6px;">
                        <div style="width: ${accuracy}%; height: 100%; background: ${barColor}; transition: width 0.4s ease;"></div>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-muted);">
                        <span>Avg Speed: ${avgTime}s</span>
                        <span>Attempts: ${total}</span>
                    </div>
                </div>
            `;
        });
    }

    containers.forEach(cid => {
        const el = document.getElementById(cid);
        if (el) el.innerHTML = html;
    });
}

function renderAnalyticsChart(dailyHistory) {
    if (typeof Chart === 'undefined') return;

    const labels = dailyHistory.length > 0 ? dailyHistory.map(d => d.date) : ['No Data'];
    const accuracyPoints = dailyHistory.length > 0 ? dailyHistory.map(d => d.accuracy_percentage) : [0];
    const passedPoints = dailyHistory.length > 0 ? dailyHistory.map(d => d.passed) : [0];

    const chartConfig = {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Accuracy (%)',
                    data: accuracyPoints,
                    borderColor: '#a855f7',
                    backgroundColor: 'rgba(168, 85, 247, 0.15)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.35,
                    pointRadius: 4,
                    pointBackgroundColor: '#a855f7'
                },
                {
                    label: 'Passed Count',
                    data: passedPoints,
                    borderColor: '#22c55e',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.35,
                    pointRadius: 3,
                    pointBackgroundColor: '#22c55e'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#e2e8f0', font: { family: 'Inter' } }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#94a3b8' },
                    grid: { color: 'rgba(255,255,255,0.05)' }
                },
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: { color: '#94a3b8' },
                    grid: { color: 'rgba(255,255,255,0.05)' }
                }
            }
        }
    };

    const canvas1 = document.getElementById('analyticsAccuracyChart');
    if (canvas1) {
        if (analyticsChartInstance) analyticsChartInstance.destroy();
        analyticsChartInstance = new Chart(canvas1, chartConfig);
    }

    const canvas2 = document.getElementById('detailedSleepChart');
    if (canvas2) {
        if (dbAnalyticsChartInstance) dbAnalyticsChartInstance.destroy();
        dbAnalyticsChartInstance = new Chart(canvas2, chartConfig);
    }
}

function renderAnalyticsHistoryTable(logs) {
    const tableIds = ['analytics-history-table', 'db-analytics-history-table'];

    let rowsHtml = '';
    if (!logs || logs.length === 0) {
        rowsHtml = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 20px;">No challenge attempt logs recorded yet.</td></tr>';
    } else {
        logs.forEach(log => {
            const resBadge = log.is_correct
                ? '<span class="badge badge-success">✓ Pass</span>'
                : '<span class="badge badge-danger">✗ Fail</span>';

            rowsHtml += `
                <tr>
                    <td>${log.date || 'Just Now'}</td>
                    <td><span class="badge badge-info">${log.challenge_type || 'Math'}</span></td>
                    <td><span class="badge badge-warning">${log.difficulty || 'Medium'}</span></td>
                    <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${log.question || '-'}</td>
                    <td>${log.user_answer || '-'}</td>
                    <td>${resBadge}</td>
                    <td>${log.time_taken || 0}s / ${log.time_limit || 20}s</td>
                </tr>
            `;
        });
    }

    tableIds.forEach(tid => {
        const table = document.getElementById(tid);
        if (table) {
            const tbody = table.querySelector('tbody');
            if (tbody) tbody.innerHTML = rowsHtml;
        }
    });
}