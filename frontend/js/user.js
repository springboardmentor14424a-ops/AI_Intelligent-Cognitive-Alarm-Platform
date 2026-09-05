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

// Wake-Up Verification Session State
window.isWakeUpVerified = false;
let currentVerificationState = {
    sessionId: null,
    status: 'in_progress', // pending, in_progress, passed, failed, timeout
    method: 'puzzle_completion',
    currentStep: 1,
    totalSteps: 1,
    correctCount: 0,
    requiredAccuracy: 100,
    consecutiveCorrect: 0,
    consecutiveRequired: 1,
    timeLimit: 20,
    timeRemaining: 20
};

function renderVerificationHUD(state) {
    if (!state) state = currentVerificationState;

    // 1. Status Badge
    const statusBadge = document.getElementById('verification-status-badge');
    if (statusBadge) {
        statusBadge.className = `verification-status-badge status-${state.status || 'in_progress'}`;
        if (state.status === 'in_progress') {
            statusBadge.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> In Progress';
        } else if (state.status === 'passed') {
            statusBadge.innerHTML = '<i class="fas fa-check-circle"></i> Passed';
        } else if (state.status === 'failed') {
            statusBadge.innerHTML = '<i class="fas fa-times-circle"></i> Failed';
        } else if (state.status === 'timeout') {
            statusBadge.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Timeout';
        } else {
            statusBadge.innerHTML = '<i class="fas fa-clock"></i> Pending';
        }
    }

    // 2. Progress
    const progressVal = document.getElementById('hud-progress-val');
    const progressBar = document.getElementById('hud-progress-bar');
    const currStep = state.currentStep || 1;
    const totSteps = state.totalSteps || 1;
    if (progressVal) {
        progressVal.textContent = `${currStep}/${totSteps}`;
    }
    if (progressBar) {
        const pct = Math.min(100, Math.round((currStep / totSteps) * 100));
        progressBar.style.width = `${pct}%`;
    }

    // 3. Correct Answers
    const correctVal = document.getElementById('hud-correct-val');
    if (correctVal) {
        correctVal.textContent = state.correctCount || 0;
    }

    // 4. Required Accuracy
    const accuracyVal = document.getElementById('hud-accuracy-val');
    if (accuracyVal) {
        if (state.method === 'accuracy_check' || state.method === 'multi_step') {
            const minNeeded = Math.ceil(((state.requiredAccuracy || 67) / 100) * totSteps);
            accuracyVal.textContent = `${minNeeded}/${totSteps} (${state.requiredAccuracy || 67}%)`;
        } else if (state.method === 'consecutive_correct') {
            accuracyVal.textContent = `Streak: ${state.consecutiveRequired || 2} in a row`;
        } else {
            accuracyVal.textContent = `1/1 (100%)`;
        }
    }

    // 5. Consecutive Correct
    const consecutiveVal = document.getElementById('hud-consecutive-val');
    if (consecutiveVal) {
        consecutiveVal.textContent = `${state.consecutiveCorrect || 0}/${state.consecutiveRequired || 1}`;
    }

    // 6. Time Remaining
    const timerDisplay = document.getElementById('challenge-timer-display');
    if (timerDisplay && state.timeRemaining !== undefined) {
        timerDisplay.textContent = `${state.timeRemaining}s`;
    }
}

function triggerAlarmSound(alarm) {
    if (!alarm) return;

    resetChallengeModalDisplay();

    // Prevent duplicate triggers if an alarm is already actively ringing
    if (currentRingingAlarm) {
        console.log("⚠️ Alarm already ringing. Ignoring duplicate trigger for:", alarm.title || alarm.id);
        return;
    }

    currentRingingAlarm = alarm;
    window.isWakeUpVerified = false;

    console.log("🔔 ALARM TRIGGERED:", alarm.title || alarm.id);

    // Extract or default verification configuration (Default to 3-question Multi-Step)
    let vMethod = alarm.verification_method;
    if (!vMethod || vMethod === 'puzzle_completion' || vMethod === 'none' || vMethod === '') {
        vMethod = 'multi_step';
    }
    let vSteps = parseInt(alarm.verification_steps) || 3;
    let reqAcc = alarm.required_accuracy ? parseFloat(alarm.required_accuracy) : 67;
    let consecReq = alarm.consecutive_required ? parseInt(alarm.consecutive_required) : 2;
    let timeLim = alarm.time_limit ? parseInt(alarm.time_limit) : 20;

    if (vMethod === 'multi_step') {
        vSteps = Math.max(3, vSteps || 3);
        reqAcc = reqAcc || 67;
    } else if (vMethod === 'consecutive_correct') {
        consecReq = Math.max(2, consecReq || 2);
        vSteps = consecReq;
    } else if (vMethod === 'accuracy_check') {
        vSteps = Math.max(3, vSteps || 3);
        reqAcc = reqAcc || 67;
    } else if (vMethod === 'time_based') {
        timeLim = Math.min(30, Math.max(5, timeLim || 15));
    }

    currentVerificationState = {
        sessionId: null,
        status: 'in_progress',
        method: vMethod,
        currentStep: 1,
        totalSteps: vSteps,
        correctCount: 0,
        requiredAccuracy: reqAcc,
        consecutiveCorrect: 0,
        consecutiveRequired: consecReq,
        timeLimit: timeLim,
        timeRemaining: timeLim
    };

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

    // Render HUD and start verification session
    renderVerificationHUD(currentVerificationState);

    const chType = alarm.challenge_type || (typeof alarm.challenge === 'string' && alarm.challenge !== 'none' ? alarm.challenge : 'Math Problems');
    const diff = alarm.difficulty || alarm.difficulty_level || 'Medium';

    fetch(`${window.API_BASE_URL}/api/challenges/verification/start`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
            alarm_id: alarm.id || null,
            challenge_type: chType,
            difficulty: diff,
            verification_method: vMethod,
            verification_steps: vSteps,
            required_accuracy: reqAcc,
            consecutive_required: consecReq,
            time_limit: timeLim,
            first_challenge: alarm.challenge && typeof alarm.challenge === 'object' ? alarm.challenge : null
        })
    })
    .then(res => res.json())
    .then(data => {
        currentVerificationState.sessionId = data.session_id;
        currentVerificationState.status = data.status || 'in_progress';
        currentVerificationState.currentStep = data.current_step || 1;
        currentVerificationState.totalSteps = data.total_steps || vSteps;
        currentVerificationState.correctCount = data.correct_count || 0;
        currentVerificationState.requiredAccuracy = data.required_accuracy || reqAcc;
        currentVerificationState.consecutiveCorrect = data.consecutive_correct || 0;
        currentVerificationState.consecutiveRequired = data.consecutive_required || consecReq;
        currentVerificationState.timeLimit = data.time_limit || timeLim;
        currentVerificationState.timeRemaining = data.time_limit || timeLim;

        renderVerificationHUD(currentVerificationState);

        if (data.current_challenge) {
            displayCognitiveChallenge(data.current_challenge, 1);
        } else if (alarm.challenge && typeof alarm.challenge === 'object' && alarm.challenge.question) {
            displayCognitiveChallenge(alarm.challenge, 1);
        } else {
            displayCognitiveChallenge({
                type: chType,
                difficulty: diff,
                question: 'What is 15 + 28?',
                options: ['33', '43', '45', '53'],
                answer: '43',
                explanation: '15 + 28 = 43.'
            }, 1);
        }
    })
    .catch(err => {
        console.error('Error starting verification session:', err);
        renderVerificationHUD(currentVerificationState);
        displayCognitiveChallenge({
            type: chType,
            difficulty: diff,
            question: 'What is 15 + 28?',
            options: ['33', '43', '45', '53'],
            answer: '43',
            explanation: '15 + 28 = 43.'
        }, 1);
    });

    Toast.show(
        'Wake-Up Verification',
        `${alarm.title || 'Alarm'} is ringing! Complete the verification to silence it.`,
        'warning',
        10000
    );
}

let currentAttemptNumber = 1;
let challengeStartTime = 0;
let challengeTimerInterval = null;
let verificationRequestInFlight = false;

function resetChallengeModalDisplay() {
    const challengeQuestion = document.getElementById('challenge-question');
    const challengeOptions = document.getElementById('challenge-options-container');
    const challengeInput = document.getElementById('challenge-input-group');
    const submitButton = document.getElementById('submit-challenge-btn');
    const challengeFeedback = document.getElementById('challenge-feedback');
    const wakefulnessPanel = document.getElementById('wakefulness-panel');

    if (wakefulnessPanel) wakefulnessPanel.remove();
    if (challengeQuestion) challengeQuestion.style.display = 'block';
    if (challengeOptions) challengeOptions.style.display = 'flex';
    if (challengeInput) challengeInput.style.display = 'block';
    if (submitButton) submitButton.style.display = 'inline-block';
    if (challengeFeedback) {
        challengeFeedback.textContent = '';
        challengeFeedback.style.color = '';
    }
}

function showWakefulnessScreen() {
    stopChallengeTimer();
    const modal = document.querySelector('#challenge-modal .modal-container');
    if (!modal) return;
    const challengeQuestion = document.getElementById('challenge-question');
    const challengeOptions = document.getElementById('challenge-options-container');
    const challengeInput = document.getElementById('challenge-input-group');
    const submitButton = document.getElementById('submit-challenge-btn');
    const challengeFeedback = document.getElementById('challenge-feedback');
    if (challengeQuestion) challengeQuestion.style.display = 'none';
    if (challengeOptions) challengeOptions.style.display = 'none';
    if (challengeInput) challengeInput.style.display = 'none';
    if (submitButton) submitButton.style.display = 'none';
    if (challengeFeedback) {
        challengeFeedback.textContent = '';
        challengeFeedback.style.color = '';
    }

    let panel = document.getElementById('wakefulness-panel');
    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'wakefulness-panel';
        panel.style.cssText = 'text-align:center;padding:18px 8px;';
        modal.querySelector('.modal-body').appendChild(panel);
    }
    panel.innerHTML = `
        <h3>How awake do you feel?</h3>
        <div id="wakefulness-ratings" style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin:18px 0 8px;">
            ${['1 - Very sleepy', '2 - Sleepy', '3 - Somewhat awake', '4 - Awake', '5 - Fully awake'].map((label, index) => `<button type="button" class="btn btn-secondary wakefulness-rating" data-rating="${index + 1}">${label}</button>`).join('')}
        </div>
        <button type="button" class="btn btn-primary" id="submit-wakefulness-btn" disabled>Submit rating</button>
        <div id="wakefulness-feedback" style="margin-top:10px;"></div>`;
    panel.style.display = 'block';
    let selectedRating = null;
    panel.querySelectorAll('.wakefulness-rating').forEach(button => {
        button.addEventListener('click', () => {
            selectedRating = Number(button.dataset.rating);
            panel.querySelectorAll('.wakefulness-rating').forEach(item => item.classList.remove('btn-primary'));
            button.classList.add('btn-primary');
            panel.querySelector('#submit-wakefulness-btn').disabled = false;
        });
    });
    panel.querySelector('#submit-wakefulness-btn').addEventListener('click', async () => {
        const alarm = currentRingingAlarm;
        const feedback = panel.querySelector('#wakefulness-feedback');
        try {
            const response = await fetch(`${window.API_BASE_URL}/api/alarms/${alarm.id}/wakefulness`, {
                method: 'POST', headers: getAuthHeaders(),
                body: JSON.stringify({ rating: selectedRating, session_id: currentVerificationState.sessionId })
            });
            if (!response.ok) throw new Error('Wakefulness rating could not be saved');
            showAlarmActionScreen();
        } catch (error) {
            feedback.textContent = error.message;
            feedback.style.color = 'var(--color-danger)';
        }
    });
}

function showAlarmActionScreen() {
    const challengeQuestion = document.getElementById('challenge-question');
    const challengeOptions = document.getElementById('challenge-options-container');
    const challengeInput = document.getElementById('challenge-input-group');
    const submitButton = document.getElementById('submit-challenge-btn');
    if (challengeQuestion) challengeQuestion.style.display = 'none';
    if (challengeOptions) challengeOptions.style.display = 'none';
    if (challengeInput) challengeInput.style.display = 'none';
    if (submitButton) submitButton.style.display = 'none';

    const panel = document.getElementById('wakefulness-panel');
    if (!panel || !currentRingingAlarm) return;
    const alarm = currentRingingAlarm;
    const snoozeCount = Number(alarm.snooze_count || 0);
    const maxSnoozes = Number(alarm.max_snoozes ?? 3);
    panel.innerHTML = `<h3>You're awake! What would you like to do?</h3>
        <div style="display:flex;gap:10px;justify-content:center;margin-top:18px;flex-wrap:wrap;">
            <button type="button" class="btn btn-primary" id="dismiss-alarm-btn">Dismiss Alarm</button>
            <button type="button" class="btn btn-secondary" id="snooze-alarm-btn" ${snoozeCount >= maxSnoozes ? 'disabled' : ''}>Snooze ${alarm.snooze_duration || 5} min</button>
        </div><div id="alarm-action-feedback" style="margin-top:10px;"></div>`;
    panel.querySelector('#dismiss-alarm-btn').addEventListener('click', async () => {
        const sessionId = currentVerificationState.sessionId;
        const response = await fetch(`${window.API_BASE_URL}/api/alarms/${alarm.id}/dismiss`, {
            method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ session_id: sessionId })
        });
        if (!response.ok) return;
        stopAlarmSound();
        Modal.close('challenge-modal');
        fetchAlarmsFromServer();
    });
    const snoozeButton = panel.querySelector('#snooze-alarm-btn');
    if (snoozeButton && !snoozeButton.disabled) {
        snoozeButton.addEventListener('click', async () => {
            const response = await fetch(`${window.API_BASE_URL}/api/alarms/${alarm.id}/snooze`, {
                method: 'POST', headers: getAuthHeaders(),
                body: JSON.stringify({ session_id: currentVerificationState.sessionId, snooze_count: snoozeCount })
            });
            if (!response.ok) return;
            stopAlarmSound();
            Modal.close('challenge-modal');
            fetchAlarmsFromServer();
        });
    }
}

function startChallengeTimer(timeLimitSeconds) {
    if (challengeTimerInterval) {
        clearInterval(challengeTimerInterval);
        challengeTimerInterval = null;
    }

    const limit = timeLimitSeconds || currentVerificationState.timeLimit || 20;
    challengeStartTime = Date.now();
    let secondsLeft = limit;
    currentVerificationState.timeRemaining = secondsLeft;

    const timerBanner = document.getElementById('challenge-timer-container');
    const timerDisplay = document.getElementById('challenge-timer-display');

    const updateTimerUI = () => {
        if (timerDisplay) {
            timerDisplay.textContent = `${secondsLeft}s`;
        }
        if (timerBanner) {
            if (secondsLeft <= 5) {
                timerBanner.classList.add('timer-critical');
                if (timerDisplay) timerDisplay.style.color = '#ef4444';
            } else if (secondsLeft <= 10) {
                timerBanner.classList.remove('timer-critical');
                if (timerDisplay) timerDisplay.style.color = '#f59e0b';
            } else {
                timerBanner.classList.remove('timer-critical');
                if (timerDisplay) timerDisplay.style.color = '#10b981';
            }
        }
    };

    updateTimerUI();

    challengeTimerInterval = setInterval(async () => {
        secondsLeft--;
        currentVerificationState.timeRemaining = secondsLeft;
        updateTimerUI();

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
    if (verificationRequestInFlight) return;
    verificationRequestInFlight = true;
    const timeTaken = Math.round((Date.now() - challengeStartTime) / 1000);
    const feedback = document.getElementById('challenge-feedback');

    currentVerificationState.status = 'timeout';
    currentVerificationState.consecutiveCorrect = 0; // Streak reset on timeout
    renderVerificationHUD(currentVerificationState);

    const modalContainer = document.querySelector('#challenge-modal .modal-container');
    if (modalContainer) {
        modalContainer.classList.add('challenge-shake');
        setTimeout(() => modalContainer.classList.remove('challenge-shake'), 600);
    }

    try {
        const response = await fetch(`${window.API_BASE_URL}/api/challenges/verification/step`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                session_id: currentVerificationState.sessionId || (activeCognitiveChallenge ? activeCognitiveChallenge.id : ''),
                step_number: currentVerificationState.currentStep,
                challenge_id: activeCognitiveChallenge ? activeCognitiveChallenge.id : null,
                user_answer: '',
                time_taken: timeTaken,
                is_timeout: true,
                alarm_id: currentRingingAlarm ? currentRingingAlarm.id : null
            })
        });

        if (response.ok) {
            const resData = await response.json();
            currentAttemptNumber++;

            currentVerificationState.status = resData.verification_status;
            currentVerificationState.currentStep = resData.current_step;
            currentVerificationState.totalSteps = resData.total_steps;
            currentVerificationState.correctCount = resData.correct_count;
            currentVerificationState.consecutiveCorrect = resData.consecutive_correct;
            currentVerificationState.consecutiveRequired = resData.consecutive_required;
            renderVerificationHUD(currentVerificationState);

            if (resData.next_challenge) {
                displayCognitiveChallenge(resData.next_challenge, currentAttemptNumber);
                if (feedback) {
                    feedback.style.color = '#ef4444';
                    feedback.textContent = resData.message || '⏱️ Time expired! Attempt recorded as timed out. Solve this new question:';
                }
            } else {
                if (feedback) {
                    feedback.style.color = '#ef4444';
                    feedback.textContent = '⏱️ Time expired! Attempt recorded. Retrying...';
                }
                startChallengeTimer(currentVerificationState.timeLimit || 20);
            }
            Toast.show('Time Expired', 'Attempt recorded as timed out. Solve new challenge!', 'danger', 3000);
        }
    } catch (err) {
        console.error('Error handling challenge timeout:', err);
    } finally {
        verificationRequestInFlight = false;
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

    const typeBadge = document.getElementById('challenge-type-badge');
    const diffBadge = document.getElementById('challenge-difficulty-badge');
    const attemptBadge = document.getElementById('challenge-attempt-badge');
    const questionElem = document.getElementById('challenge-question');
    const subtitleElem = document.getElementById('challenge-subtitle');
    const optionsContainer = document.getElementById('challenge-options-container');
    const inputGroup = document.getElementById('challenge-input-group');
    const answerInput = document.getElementById('challenge-answer');
    const feedbackElem = document.getElementById('challenge-feedback');

    if (typeBadge) typeBadge.textContent = challenge.type || 'Math Problems';
    if (diffBadge) {
        diffBadge.textContent = challenge.difficulty || 'Medium';
        diffBadge.className = `badge ${challenge.difficulty === 'Beginner' || challenge.difficulty === 'Easy' ? 'badge-success' : challenge.difficulty === 'Difficult' || challenge.difficulty === 'Advanced' || challenge.difficulty === 'Hard' || challenge.difficulty === 'Expert' ? 'badge-danger' : 'badge-warning'}`;
    }
    if (attemptBadge) attemptBadge.textContent = `Attempt ${currentAttemptNumber}`;

    if (feedbackElem) {
        feedbackElem.textContent = '';
        feedbackElem.style.color = '';
    }

    if (answerInput) answerInput.value = '';

    renderVerificationHUD(currentVerificationState);

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

                const timeLimit = challenge.time_limit || currentVerificationState.timeLimit || 20;
                startChallengeTimer(timeLimit);
            }
        }, 1000);
    } else {
        if (subtitleElem) subtitleElem.textContent = 'Solve the challenge to silence the wake-up alarm!';
        if (questionElem) questionElem.textContent = challenge.question;
        renderChallengeControls(challenge, optionsContainer, inputGroup);

        const timeLimit = challenge.time_limit || currentVerificationState.timeLimit || 20;
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
    const snoozeDurationElem = document.getElementById('alarm-snooze-duration');
    if (snoozeDurationElem) snoozeDurationElem.value = alarm.snooze_duration || 5;
    const maxSnoozesElem = document.getElementById('alarm-max-snoozes');
    if (maxSnoozesElem) maxSnoozesElem.value = alarm.max_snoozes ?? 3;

    // Verification fields
    const verifMethodElem = document.getElementById('alarm-verification-method');
    if (verifMethodElem) verifMethodElem.value = alarm.verification_method || 'puzzle_completion';
    const verifStepsElem = document.getElementById('alarm-verif-steps');
    if (verifStepsElem) verifStepsElem.value = alarm.verification_steps || 3;
    const verifConsecElem = document.getElementById('alarm-verif-consecutive');
    if (verifConsecElem) verifConsecElem.value = alarm.consecutive_required || 2;
    const verifAccElem = document.getElementById('alarm-verif-accuracy');
    if (verifAccElem) verifAccElem.value = alarm.required_accuracy || 67;
    const verifTimeElem = document.getElementById('alarm-verif-time');
    if (verifTimeElem) verifTimeElem.value = alarm.time_limit || 20;

    updateVerificationFormFields();

    const activeDays = alarm.repeat_days ? alarm.repeat_days.split(',') : [];
    document.querySelectorAll('#custom-days-container input[type="checkbox"]').forEach(cb => {
        cb.checked = activeDays.includes(cb.value);
    });
    updateCustomDaysVisibility();

    const modalTitle = document.getElementById('alarm-modal-title');
    if (modalTitle) modalTitle.textContent = 'Update Cognitive Alarm';

    Modal.open('add-alarm-modal');
};

function updateVerificationFormFields() {
    const methodElem = document.getElementById('alarm-verification-method');
    if (!methodElem) return;
    const method = methodElem.value;
    const stepsGroup = document.getElementById('verif-steps-group');
    const consecutiveGroup = document.getElementById('verif-consecutive-group');
    const accuracyGroup = document.getElementById('verif-accuracy-group');
    const timeGroup = document.getElementById('verif-time-group');

    if (stepsGroup) stepsGroup.style.display = (method === 'multi_step' || method === 'accuracy_check') ? 'block' : 'none';
    if (consecutiveGroup) consecutiveGroup.style.display = (method === 'consecutive_correct') ? 'block' : 'none';
    if (accuracyGroup) accuracyGroup.style.display = (method === 'accuracy_check') ? 'block' : 'none';
    if (timeGroup) timeGroup.style.display = 'block';
}

document.getElementById('alarm-verification-method')?.addEventListener('change', updateVerificationFormFields);

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

const clientFallbackChallenges = [
    {
        type: 'Math Problems',
        difficulty: 'Medium',
        question: 'What is 14 x 6 + 18?',
        options: ['98', '102', '106', '112'],
        answer: '102',
        explanation: '14 x 6 = 84; 84 + 18 = 102.'
    },
    {
        type: 'Logic Puzzles',
        difficulty: 'Medium',
        question: 'If ALL roses are flowers and SOME flowers fade quickly, which is guaranteed?',
        options: ['All roses fade quickly', 'Some flowers are roses', 'No roses fade', 'All flowers are roses'],
        answer: 'Some flowers are roses',
        explanation: 'Because all roses are flowers, some flowers must be roses.'
    },
    {
        type: 'Pattern Recognition',
        difficulty: 'Medium',
        question: 'Complete the pattern: 3, 7, 15, 31, ?',
        options: ['47', '55', '63', '71'],
        answer: '63',
        explanation: 'Each term is (previous x 2) + 1. 31 x 2 + 1 = 63.'
    },
    {
        type: 'Word Games',
        difficulty: 'Medium',
        question: 'Unscramble the morning word: "W A K E U P"',
        options: ['WAKEUP', 'PAUKWE', 'WEAKUP', 'POWAKE'],
        answer: 'WAKEUP',
        explanation: 'The unscrambled word is WAKEUP.'
    }
];

// 7. Dynamic Cognitive Challenge Drill & Verification
window.triggerChallenge = (method = 'multi_step', steps = 3, challengeType = 'Math Problems', diff = 'Medium') => {
    const timeLimit = method === 'time_based' ? 15 : 20;
    const reqAcc = method === 'accuracy_check' ? 67 : (method === 'multi_step' ? 67 : 100);
    const consecReq = method === 'consecutive_correct' ? 2 : 1;
    const totalSteps = method === 'multi_step' || method === 'accuracy_check' ? Math.max(2, steps || 3) : (method === 'consecutive_correct' ? 2 : 1);

    fetch(`${window.API_BASE_URL}/api/challenges/verification/start`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
            verification_method: method || 'multi_step',
            verification_steps: totalSteps,
            required_accuracy: reqAcc,
            consecutive_required: consecReq,
            time_limit: timeLimit,
            challenge_type: challengeType || 'Math Problems',
            difficulty: diff || 'Medium'
        })
    })
    .then(res => res.json())
    .then(data => {
        currentVerificationState = {
            sessionId: data.session_id,
            status: data.status || 'in_progress',
            method: data.verification_method || method || 'multi_step',
            currentStep: data.current_step || 1,
            totalSteps: data.total_steps || totalSteps,
            correctCount: data.correct_count || 0,
            requiredAccuracy: data.required_accuracy || reqAcc,
            consecutiveCorrect: data.consecutive_correct || 0,
            consecutiveRequired: data.consecutive_required || consecReq,
            timeLimit: data.time_limit || timeLimit,
            timeRemaining: data.time_limit || timeLimit
        };
        renderVerificationHUD(currentVerificationState);
        displayCognitiveChallenge(data.current_challenge, 1);
    })
    .catch(err => {
        console.warn('Backend verification session unavailable, running client-side multi-step drill:', err);
        currentVerificationState = {
            sessionId: 'client_drill_' + Date.now(),
            status: 'in_progress',
            method: method || 'multi_step',
            currentStep: 1,
            totalSteps: totalSteps,
            correctCount: 0,
            requiredAccuracy: reqAcc,
            consecutiveCorrect: 0,
            consecutiveRequired: consecReq,
            timeLimit: timeLimit,
            timeRemaining: timeLimit
        };
        renderVerificationHUD(currentVerificationState);
        displayCognitiveChallenge(clientFallbackChallenges[0], 1);
    });
};

window.triggerMathChallenge = () => {
    window.triggerChallenge('multi_step', 3, 'Math Problems', 'Easy');
};

// Handle checking answer via backend API and verification step engine
const submitChallengeBtn = document.getElementById('submit-challenge-btn');
if (submitChallengeBtn) {
    submitChallengeBtn.addEventListener('click', async () => {
        if (verificationRequestInFlight) return;
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
        verificationRequestInFlight = true;

        try {
            const response = await fetch(`${window.API_BASE_URL}/api/challenges/verification/step`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    session_id: currentVerificationState.sessionId || (activeCognitiveChallenge ? activeCognitiveChallenge.id : ''),
                    step_number: currentVerificationState.currentStep,
                    challenge_id: activeCognitiveChallenge ? activeCognitiveChallenge.id : null,
                    user_answer: userAnswer,
                    time_taken: timeTaken,
                    is_timeout: false,
                    alarm_id: currentRingingAlarm ? currentRingingAlarm.id : null
                })
            });

            if (response.ok) {
                const resData = await response.json();
                currentVerificationState.status = resData.verification_status;
                currentVerificationState.currentStep = resData.current_step;
                currentVerificationState.totalSteps = resData.total_steps;
                currentVerificationState.correctCount = resData.correct_count;
                currentVerificationState.consecutiveCorrect = resData.consecutive_correct;
                currentVerificationState.consecutiveRequired = resData.consecutive_required;
                renderVerificationHUD(currentVerificationState);

                if (resData.verification_status === 'passed') {
                    // Verification passed; rating and the alarm action are still required.
                    window.isWakeUpVerified = false;
                    feedback.style.color = 'var(--color-success)';
                    feedback.textContent = resData.message || 'Wake-up verified. Rate your wakefulness.';
                    showWakefulnessScreen();
                } else if (resData.verification_status === 'in_progress') {
                    currentAttemptNumber++;
                    feedback.style.color = resData.is_step_correct ? 'var(--color-success)' : 'var(--color-warning)';
                    feedback.textContent = resData.message;

                    if (resData.next_challenge) {
                        setTimeout(() => {
                            displayCognitiveChallenge(resData.next_challenge, currentAttemptNumber);
                        }, 400);
                    } else {
                        startChallengeTimer(currentVerificationState.timeLimit || 20);
                    }
                } else {
                    currentAttemptNumber++;
                    const modalContainer = document.querySelector('#challenge-modal .modal-container');
                    if (modalContainer) {
                        modalContainer.classList.add('challenge-shake');
                        setTimeout(() => modalContainer.classList.remove('challenge-shake'), 600);
                    }

                    feedback.style.color = 'var(--color-danger)';
                    feedback.textContent = resData.message || '✗ Incorrect answer. Streak reset! Try again:';

                    if (resData.next_challenge) {
                        setTimeout(() => {
                            displayCognitiveChallenge(resData.next_challenge, currentAttemptNumber);
                        }, 500);
                    } else {
                        startChallengeTimer(currentVerificationState.timeLimit || 20);
                    }
                }
            } else {
                throw new Error('Server response error');
            }
        } catch (e) {
            console.warn('Advancing verification step in client mode:', e);
            // Client-side multi-step fallback progression
            const isCorrect = (activeCognitiveChallenge && activeCognitiveChallenge.answer && 
                userAnswer.trim().toLowerCase() === activeCognitiveChallenge.answer.trim().toLowerCase());

            if (isCorrect) {
                currentVerificationState.correctCount = (currentVerificationState.correctCount || 0) + 1;
                currentVerificationState.consecutiveCorrect = (currentVerificationState.consecutiveCorrect || 0) + 1;
            } else {
                currentVerificationState.consecutiveCorrect = 0;
            }

            if (currentVerificationState.currentStep < currentVerificationState.totalSteps) {
                currentVerificationState.currentStep += 1;
                currentVerificationState.status = 'in_progress';
                renderVerificationHUD(currentVerificationState);

                feedback.style.color = isCorrect ? 'var(--color-success)' : 'var(--color-warning)';
                feedback.textContent = `${isCorrect ? '✓ Correct!' : '✗ Incorrect.'} Moving to Question ${currentVerificationState.currentStep}/${currentVerificationState.totalSteps}:`;

                const nextChalIndex = (currentVerificationState.currentStep - 1) % clientFallbackChallenges.length;
                setTimeout(() => {
                    displayCognitiveChallenge(clientFallbackChallenges[nextChalIndex], currentAttemptNumber + 1);
                }, 400);
            } else {
                // Final Step Reached
                const acc = Math.round((currentVerificationState.correctCount / currentVerificationState.totalSteps) * 100);
                const passed = acc >= (currentVerificationState.requiredAccuracy || 67);

                if (passed) {
                    window.isWakeUpVerified = true;
                    currentVerificationState.status = 'passed';
                    renderVerificationHUD(currentVerificationState);

                    feedback.style.color = 'var(--color-success)';
                    feedback.textContent = `✓ Multi-Step Wake-Up Verified! (${currentVerificationState.correctCount}/${currentVerificationState.totalSteps} correct)`;

                    stopAlarmSound();
                    stopChallengeTimer();
                    Toast.show('Wake-Up Verified!', 'Neural activation complete! +10 Points.', 'success', 3000);

                    setTimeout(() => {
                        Modal.close('challenge-modal');
                    }, 1400);
                } else {
                    currentVerificationState.totalSteps += 1;
                    currentVerificationState.currentStep += 1;
                    currentVerificationState.status = 'failed';
                    renderVerificationHUD(currentVerificationState);

                    feedback.style.color = 'var(--color-danger)';
                    feedback.textContent = `✗ Accuracy ${acc}% below required. Additional question required:`;
                    const nextChalIndex = (currentVerificationState.currentStep - 1) % clientFallbackChallenges.length;
                    setTimeout(() => {
                        displayCognitiveChallenge(clientFallbackChallenges[nextChalIndex], currentAttemptNumber + 1);
                    }, 500);
                }
            }
        } finally {
            verificationRequestInFlight = false;
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
            const verifMethodSelect = document.getElementById('alarm-verification-method');
            if (verifMethodSelect) {
                verifMethodSelect.value = 'multi_step';
            }
            const verifStepsSelect = document.getElementById('alarm-verif-steps');
            if (verifStepsSelect) {
                verifStepsSelect.value = '3';
            }
            updateCustomDaysVisibility();
            updateVerificationFormFields();
            const modalTitle = document.getElementById('alarm-modal-title');
            if (modalTitle) modalTitle.textContent = 'Set Cognitive Alarm';
            Modal.open('add-alarm-modal');
        });
    });

    document.getElementById('alarm-type')?.addEventListener('change', updateCustomDaysVisibility);
    document.getElementById('alarm-verification-method')?.addEventListener('change', updateVerificationFormFields);

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
        const snooze_duration = parseInt(getInputValue(['alarm-snooze-duration'], '5')) || 5;
        const max_snoozes = parseInt(getInputValue(['alarm-max-snoozes'], '3')) || 0;

        const verification_method = getInputValue(['alarm-verification-method'], 'multi_step');
        const verification_steps = parseInt(getInputValue(['alarm-verif-steps'], '3')) || 3;
        const consecutive_required = parseInt(getInputValue(['alarm-verif-consecutive'], '2')) || 2;
        const required_accuracy = parseFloat(getInputValue(['alarm-verif-accuracy'], '67')) || 67.0;
        const time_limit = parseInt(getInputValue(['alarm-verif-time'], '20')) || 20;

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
            vibration,
            snooze_duration,
            max_snoozes,
            verification_method,
            verification_steps,
            required_accuracy,
            consecutive_required,
            time_limit
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
    fetchBehavioralAnalyticsData();
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

async function fetchBehavioralAnalyticsData() {
    try {
        const headers = getAuthHeaders();
        const response = await fetch(`${window.API_BASE_URL}/api/analytics/behavioral`, { headers });
        if (!response.ok) {
            const msg = 'Insufficient data';
            const ids = ['behavior-consistency', 'behavior-snoozes', 'behavior-wakefulness', 'behavior-wake-time', 'behavior-streak', 'db-behavior-consistency', 'db-behavior-snoozes', 'db-behavior-wakefulness', 'db-behavior-wake-time', 'db-behavior-streak'];
            ids.forEach(id => { const el = document.getElementById(id); if (el) el.textContent = msg; });
            ['behavior-patterns-list', 'behavior-insights-list', 'db-behavior-patterns-list', 'db-behavior-insights-list'].forEach(id => {
                const el = document.getElementById(id); if (el) el.innerHTML = '<li>Insufficient data.</li>';
            });
            return;
        }

        const data = await response.json();
        const snoozePattern = data.snooze_pattern || {};
        const habit = data.habit_consistency || {};
        const wakeUp = data.wake_up_behavior || {};
        const insights = data.insights || [];

        const labels = [
            ['behavior-consistency', 'db-behavior-consistency'],
            ['behavior-snoozes', 'db-behavior-snoozes'],
            ['behavior-wakefulness', 'db-behavior-wakefulness'],
            ['behavior-wake-time', 'db-behavior-wake-time'],
            ['behavior-streak', 'db-behavior-streak']
        ];

        const consistency = Number(habit.wake_up_consistency_percentage || 0);
        const avgSnoozes = Number(snoozePattern.average_snoozes_per_alarm || 0);
        const avgWakefulness = Number(wakeUp.average_wakefulness_rating || 0);
        const avgWakeTime = habit.average_wake_up_time || '--:--';
        const streak = Number(habit.wake_up_streak || 0);

        const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
        setText('behavior-consistency', `${consistency.toFixed(0)}%`);
        setText('behavior-snoozes', avgSnoozes.toFixed(1));
        setText('behavior-wakefulness', `${avgWakefulness.toFixed(1)}/5`);
        setText('behavior-wake-time', avgWakeTime);
        setText('behavior-streak', `${streak} day${streak === 1 ? '' : 's'}`);

        ['db-behavior-consistency', 'db-behavior-snoozes', 'db-behavior-wakefulness', 'db-behavior-wake-time', 'db-behavior-streak'].forEach((id, index) => {
            const target = labels[index];
            if (target && target[1] === id) {
                const val = [
                    `${consistency.toFixed(0)}%`,
                    avgSnoozes.toFixed(1),
                    `${avgWakefulness.toFixed(1)}/5`,
                    avgWakeTime,
                    `${streak} day${streak === 1 ? '' : 's'}`
                ][index];
                setText(id, val);
            }
        });

        const patterns = [
            `Total snoozes: ${snoozePattern.total_snoozes ?? 0}`,
            `Most snoozed day: ${snoozePattern.most_frequently_snoozed_days?.[0] || 'Insufficient data'}`,
            `Successful verification days: ${habit.successful_wake_up_days ?? 0}`,
            `Failed/missed days: ${habit.missed_or_failed_verification_days ?? 0}`
        ];

        const listRenderer = (listId, items) => {
            const el = document.getElementById(listId);
            if (!el) return;
            el.innerHTML = items.length ? items.map(item => `<li>${item}</li>`).join('') : '<li>Insufficient data.</li>';
        };

        listRenderer('behavior-patterns-list', patterns);
        listRenderer('db-behavior-patterns-list', patterns);
        listRenderer('behavior-insights-list', insights.length ? insights : ['Insufficient data to generate a behavioral trend insight yet.']);
        listRenderer('db-behavior-insights-list', insights.length ? insights : ['Insufficient data to generate a behavioral trend insight yet.']);
    } catch (e) {
        console.error('Error fetching behavioral analytics:', e);
    }
}

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

// Anti-bypass window guard: prevent closing/reloading while verification is active
window.addEventListener('beforeunload', (e) => {
    if (window.currentRingingAlarm && window.isWakeUpVerified !== true) {
        e.preventDefault();
        e.returnValue = 'Wake-Up Verification in progress! Complete the challenge to silence the alarm.';
        return e.returnValue;
    }
});