const question = document.getElementById("question");
const answerInput = document.getElementById("answerInput");

let wrongAttempts = 0;
let snoozeCount = 0;

let currentChallenge = null;
let currentChallengeType = null;
let currentDifficulty = null;

// ==========================================
// WAKE-UP VERIFICATION
// ==========================================

let wakeUpVerification = {
    active: false,

    // Current verification stage
    phase: "wakefulness",

    // Wakefulness rating
    wakefulnessRating: 0,

    // Consecutive correct answers required
    requiredConsecutive: 3,
    consecutiveCorrect: 0,

    // Question tracking
    totalQuestions: 0,
    requiredQuestions: 3,

    // Accuracy tracking
    correctAnswers: 0,
    wrongAnswers: 0,

    // Extra questions caused by wrong answers
    extraQuestions: 0,

    // Time tracking
    verificationStartTime: null,

    timeLimit: 0,
    verificationTimer: null,
    timeRemaining: 0,
    timeChallengeActive: false,

    // Final status
    verified: false
};

// ==========================================
// CHALLENGE PERFORMANCE TRACKING
// ==========================================

let challengeHistory =
    JSON.parse(localStorage.getItem("challengeHistory")) || [];

let challengeStartTime = null;

const addAlarmBtn = document.getElementById("addAlarmBtn");
const saveAlarmBtn = document.getElementById("saveAlarmBtn");
const alarmForm = document.getElementById("alarmForm");
const alarmList = document.getElementById("alarmList");

const alarmSound = document.getElementById("alarmSound");

let audioUnlocked = false;

document.addEventListener("click", () => {

    if (audioUnlocked) return;

    alarmSound.play()
        .then(() => {
            alarmSound.pause();
            alarmSound.currentTime = 0;
            audioUnlocked = true;
            console.log("Alarm sound unlocked.");
        })
        .catch(() => {
            console.log("Waiting for user interaction to unlock alarm sound.");
        });

}, { once: true });

const alarmPopup = document.getElementById("alarmPopup");
const popupLabel = document.getElementById("popupLabel");

let activeAlarm = null;
let alarmQueue = [];

let alarms = JSON.parse(localStorage.getItem("alarms")) || [];

let stats = JSON.parse(localStorage.getItem("alarmStats")) || {

    totalRings: 0,

    successfulWakeups: 0,

    totalSnoozes: 0,

    wrongAnswers: 0,

    noSnoozeStreak: 0

};

addAlarmBtn.addEventListener("click", () => {

    if(alarmForm.style.display==="none"){

        alarmForm.style.display="flex";

    }else{

        alarmForm.style.display="none";

    }

});

saveAlarmBtn.addEventListener("click",()=>{

    const time=document.getElementById("alarmTime").value;

    const label=document.getElementById("alarmLabel").value;

    const type=document.getElementById("alarmType").value;

    const sound = document.getElementById("alarmSoundSelect").value;

    const vibration = document.getElementById("alarmVibration").checked;

    const snooze = Number(document.getElementById("alarmSnooze").value);

    const difficulty = document.getElementById("alarmDifficulty").value;

    const challengeType = document.getElementById("alarmChallengeType").value;

    if(time==="" || label===""){

        alert("Please fill all fields.");

        return;

    }

  const alarm = {

    id: Date.now(),

    time,

    label,

    type,

    enabled: true,

    sound: document.getElementById("alarmSoundSelect").value,

    vibration: document.getElementById("alarmVibration").checked,

    snooze: Number(
        document.getElementById("alarmSnooze").value
    ),

    difficulty:
        document.getElementById("alarmDifficulty").value,
        
    challengeType:document.getElementById("alarmChallengeType").value,

    lastTriggeredDate: null,

    createdAt: new Date().toISOString()

};

    alarms.push(alarm);

    localStorage.setItem("alarms",JSON.stringify(alarms));

    displayAlarms();

    alarmForm.style.display="none";

    document.getElementById("alarmTime").value="";
    document.getElementById("alarmLabel").value="";

});

function displayAlarms() {
    

    alarmList.innerHTML = "";

    alarms.forEach(alarm => {

        alarmList.innerHTML += `

        <div class="alarm-item">

            <h4>${alarm.time}</h4>

            <p><strong>Label:</strong> ${alarm.label}</p>

            <p><strong>Type:</strong> ${alarm.type}</p>

            <p><strong>Sound:</strong> ${alarm.sound}</p>

            <p><strong>Snooze:</strong> ${alarm.snooze} min</p>

            <p><strong>Difficulty:</strong> ${alarm.difficulty}</p>

            <p><strong>Challenge:</strong> ${getChallengeName(alarm.challengeType)}</p>

            <p><strong>Vibration:</strong> ${alarm.vibration ? "ON" : "OFF"}</p>

            <p>
                <strong>Status:</strong>
                ${alarm.enabled ? "Enabled ✅" : "Disabled ❌"}
            </p>

            <div class="alarm-buttons">

                <button onclick="editAlarm(${alarm.id})">
                    ✏ Edit
                </button>

                <button onclick="deleteAlarm(${alarm.id})">
                    🗑 Delete
                </button>

                <button onclick="toggleAlarm(${alarm.id})">

                    ${alarm.enabled ? "Disable" : "Enable"}

                </button>

            </div>

        </div>

        `;

    });

}

displayAlarms();

function deleteAlarm(id){

    const confirmDelete = confirm("Delete this alarm?");

    if(!confirmDelete) return;

    alarms = alarms.filter(alarm => alarm.id !== id);

    localStorage.setItem("alarms", JSON.stringify(alarms));

    displayAlarms();

}

function toggleAlarm(id){

    alarms = alarms.map(alarm => {

        if(alarm.id === id){

            alarm.enabled = !alarm.enabled;

        }

        return alarm;

    });

    localStorage.setItem("alarms", JSON.stringify(alarms));

    displayAlarms();

}

function editAlarm(id){

    const alarm = alarms.find(a => a.id === id);

    if(!alarm) return;

    const newTime = prompt("Enter Alarm Time", alarm.time);

    if(newTime === null) return;

    const newLabel = prompt("Enter Label", alarm.label);

    if(newLabel === null) return;

    const newType = prompt(

        "Type (Daily / Weekday / Weekend / One-Time / Smart Adaptive)",

        alarm.type);
    const newSound = prompt(
    "Sound (Default / Bell / Bird)",
    alarm.sound
    );

    if(newSound === null) return;

    const newSnooze = prompt(
    "Snooze Minutes",
    alarm.snooze
    );

    if(newSnooze === null) return;

    const newDifficulty = prompt(
    "Difficulty (Easy / Medium / Hard)",
    alarm.difficulty
    );

    if(newDifficulty === null) return;

    const vibrationInput = prompt(
    "Vibration (ON / OFF)",
    alarm.vibration ? "ON" : "OFF"
    );

    if(vibrationInput === null) return;

    if(newType === null) return;

    alarm.time = newTime;
    alarm.label = newLabel;
    alarm.type = newType;

    alarm.sound = newSound;

    alarm.snooze = Number(newSnooze);

    alarm.difficulty = newDifficulty;

    alarm.vibration =
    vibrationInput.toUpperCase() === "ON";

    localStorage.setItem("alarms", JSON.stringify(alarms));

    displayAlarms();

}

setInterval(checkAlarms,1000);
function canRingToday(type){

    const day = new Date().getDay();

    switch(type){

        case "Daily":

            return true;

        case "Weekday":

            return day >= 1 && day <= 5;

        case "Weekend":

            return day === 0 || day === 6;

        case "One-Time":

            return true;

        case "Smart Adaptive":

            return true;

    }

}

function checkAlarms() {

    const now = new Date();

    const currentTime =
        now.toTimeString().slice(0, 5);

    alarms.forEach(alarm => {

        if (
            alarm.enabled &&
            canRingToday(alarm.type) &&
            alarm.time === currentTime &&
            alarm.lastTriggeredDate !== getToday()
        ) {

            alarm.lastTriggeredDate = getToday();

            const alreadyQueued =
                alarmQueue.some(
                    a => a.id === alarm.id
                );

            if (!alreadyQueued) {
                alarmQueue.push(alarm);
            }
        }

    });

    // Show the alarm if no other alarm is currently open
    if (
        activeAlarm === null &&
        alarmQueue.length > 0
    ) {
        showNextAlarm();
    }

}


// ==========================================
// SHOW NEXT ALARM
// ==========================================

function showNextAlarm() {

    if (alarmQueue.length === 0) {

        activeAlarm = null;

        return;
    }

    activeAlarm =
    alarmQueue.shift();

// Count the alarm ring
stats.totalRings++;

// Record behavioral event
logBehaviorEvent("alarm_ring", {
    label: activeAlarm.label,
    alarmTime: activeAlarm.time,
    challengeType: activeAlarm.challengeType,
    difficulty: activeAlarm.difficulty
});

    localStorage.setItem(
        "alarmStats",
        JSON.stringify(stats)
    );

    updateDashboardStats();

    popupLabel.innerText =
        activeAlarm.label;

    // Use the difficulty selected by the user
    generateQuestion(
        activeAlarm.challengeType,
        activeAlarm.difficulty
    );

    

    answerInput.value = "";

    alarmPopup.style.display = "flex";

    // Start wake-up verification
    startWakeUpVerification();

    // Play alarm sound
    alarmSound.currentTime = 0;

    alarmSound.play().catch(error => {

        console.warn(
            "Alarm sound was blocked by the browser:",
            error
        );

    });

}
function displayQuizOptions(options) {

    removeQuizOptions();


    const optionsContainer =
        document.createElement("div");

    optionsContainer.id =
        "quizOptions";

    optionsContainer.style.marginTop =
        "15px";


    options.forEach((option, index) => {

        const button =
            document.createElement("button");

        button.innerText =
            option;

        button.type =
            "button";

        button.className =
            "quiz-option";


        button.style.display =
            "block";

        button.style.width =
            "100%";

        button.style.margin =
            "8px 0";

        button.style.padding =
            "10px";

        button.style.cursor =
            "pointer";


        button.addEventListener(
            "click",
            () => {

                answerInput.value =
                    option;

            }
        );


        optionsContainer.appendChild(
            button
        );

    });


    answerInput.parentElement.insertBefore(
        optionsContainer,
        answerInput
    );
}


function removeQuizOptions() {

    const existing =
        document.getElementById("quizOptions");

    if (existing) {

        existing.remove();

    }
}

function dismissAlarm() {

    // ==========================================
    // ANTI-SNOOZE / DISMISS VALIDATION
    // ==========================================

    if (
        !wakeUpVerification.verified
    ) {

        console.log(
            "🚫 Alarm dismissal blocked - verification required"
        );

        alert(
            "🧠 Complete the wake-up verification before dismissing the alarm."
        );

        return;
    }


    console.log(
        "✅ Alarm dismissal authorized"
    );

logBehaviorEvent("alarm_dismiss", {
    alarmLabel: activeAlarm?.label || null,
    totalSnoozes: stats.totalSnoozes
});

    alarmSound.pause();

    alarmSound.currentTime=0;

    alarmPopup.style.display="none";

    if(activeAlarm){
        activeAlarm.lastTriggeredDate = getToday();

        if(activeAlarm.type==="One-Time"){

            alarms = alarms.filter(

                alarm=>alarm.id!==activeAlarm.id

            );

        }

        localStorage.setItem(

            "alarms",

            JSON.stringify(alarms)

        );

        displayAlarms();

        activeAlarm=null;

        // Automatically show next alarm
        showNextAlarm();

    }

}


function snoozeAlarm(){

if (
    wakeUpVerification.active &&
    !wakeUpVerification.verified
) {

    console.log(
        "🚫 Snooze blocked during wake-up verification"
    );

    alert(
        "🧠 Snooze is disabled until wake-up verification is completed."
    );
logBehaviorEvent("snooze_attempt_blocked", {
    reason: "wake_up_verification_required",
    alarmLabel: activeAlarm?.label || null
});
    return;
}

    snoozeCount++;

    stats.totalSnoozes++;

    logBehaviorEvent("snooze", {
    snoozeNumber: stats.totalSnoozes,
    alarmLabel: activeAlarm?.label || null,
    snoozeMinutes: activeAlarm?.snooze || 5
});

localStorage.setItem(
    "alarmStats",
    JSON.stringify(stats)
);

updateDashboardStats();

    if(
    activeAlarm &&
    activeAlarm.type === "Smart Adaptive" &&
    snoozeCount >= 3
){

    alert("⚠ Smart Adaptive: Tomorrow this alarm will ring 5 minutes earlier.");

    snoozeCount = 0;

}

    if(!activeAlarm) return;

    const now=new Date();

    now.setMinutes(now.getMinutes()+5);

    activeAlarm.time=now.toTimeString().slice(0,5);

    activeAlarm.lastTriggeredDate = null;

    localStorage.setItem(

        "alarms",

        JSON.stringify(alarms)

    );

    displayAlarms();

    alarmSound.pause();

    alarmSound.currentTime=0;

    alarmPopup.style.display="none";

    activeAlarm=null;

    showNextAlarm();
}

function getToday(){
    return new Date().toISOString().split("T")[0];
}

/* ==========================================
   COGNITIVE CHALLENGE GENERATOR
========================================== */

let currentChallengeAnswer = "";
let currentMemorySequence = "";


/* ------------------------------------------
   MAIN CHALLENGE GENERATOR
------------------------------------------ */
async function generateQuestion(challengeType, difficulty) {

    try {

        currentChallengeType = challengeType;
        currentDifficulty = difficulty;

        const difficultyBadge =
            document.getElementById("challengeDifficultyBadge");

        if (difficultyBadge) {
            difficultyBadge.innerText = difficulty;
}

        question.innerText = "Generating challenge...";
        answerInput.value = "";

        const response = await fetch(
            "http://localhost:5000/api/challenges/generate",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    challengeType: challengeType,
                    difficulty: difficulty
                })
            }
        );


        const data = await response.json();


        if (!response.ok || !data.success) {

            throw new Error(
                data.message ||
                "Failed to generate challenge."
            );
        }


        // Store complete challenge
        currentChallenge = data;

        // Store correct answer
        currentChallengeAnswer = String(data.answer);


        // Display question
        question.innerText = data.question;

        challengeStartTime = Date.now();


        // ---------------------------------------------
        // QUIZ OPTIONS
        // ---------------------------------------------

        if (
            challengeType.toLowerCase() === "quiz" &&
            data.options
        ) {

            displayQuizOptions(data.options);

        } else {

            removeQuizOptions();

        }


    } catch (error) {

        console.error(
            "Challenge generation error:",
            error
        );

        question.innerText =
            "Unable to generate challenge.";

        alert(
            "Could not generate the cognitive challenge. " +
            "Please check whether the backend is running."
        );
    }
}

// ==========================================
// PERSONALIZED CHALLENGE GENERATION
// ==========================================

async function generatePersonalizedQuestion(challengeType) {

    try {

        currentChallengeType = challengeType;

        question.innerText =
            "Selecting a personalized challenge...";

        answerInput.value = "";

        const response = await fetch(
            `http://localhost:5000/api/challenges/personalized/1?challengeType=${encodeURIComponent(challengeType)}`,
            {
                method: "GET"
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {

            throw new Error(
                data.message ||
                "Failed to generate personalized challenge."
            );

        }

        // Store complete challenge
        currentChallenge = data;

        // Use the difficulty selected by backend
        currentDifficulty = data.difficulty;

        // Store correct answer
        currentChallengeAnswer =
            String(data.answer);

        // Display question
        question.innerText =
            data.question;

        // Start timer
        challengeStartTime =
            Date.now();

        // Display quiz options if available
        if (
            challengeType.toLowerCase() === "quiz" &&
            data.options
        ) {

            displayQuizOptions(
                data.options
            );

        } else {

            removeQuizOptions();

        }

        console.log(
            "✅ Personalized challenge:",
            data
        );

        console.log(
            "🎯 Selected difficulty:",
            data.difficulty
        );

    } catch (error) {

        console.error(
            "Personalized challenge error:",
            error
        );

        question.innerText =
            "Unable to generate personalized challenge.";

        alert(
            "Could not generate the personalized challenge. " +
            "Please check whether the backend is running."
        );

    }
}

// ==========================================
// PERSONALIZED CHALLENGE GENERATION
// ==========================================

async function generatePersonalizedQuestion(challengeType) {

    try {

        currentChallengeType = challengeType;

        question.innerText =
            "Selecting personalized challenge...";

        answerInput.value = "";

        const response = await fetch(
            `http://localhost:5000/api/challenges/personalized/1?challengeType=${encodeURIComponent(challengeType)}`,
            {
                method: "GET"
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {

            throw new Error(
                data.message ||
                "Failed to generate personalized challenge."
            );
        }

        // Store complete challenge
        currentChallenge = data;

        // IMPORTANT:
        // Use difficulty selected by backend
        currentDifficulty = data.difficulty;

        // Store correct answer
        currentChallengeAnswer =
            String(data.answer);

        // Display question
        question.innerText =
            data.question;

        // Start timer
        challengeStartTime =
            Date.now();

        // Quiz options
        if (
            challengeType.toLowerCase() === "quiz" &&
            data.options
        ) {

            displayQuizOptions(data.options);

        } else {

            removeQuizOptions();

        }

        console.log(
            "✅ Personalized challenge:",
            data
        );

        console.log(
            "🎯 Backend selected difficulty:",
            data.difficulty
        );

    } catch (error) {

        console.error(
            "Personalized challenge error:",
            error
        );

        question.innerText =
            "Unable to generate personalized challenge.";

        alert(
            "Could not generate personalized challenge. " +
            "Please check whether the backend is running."
        );
    }
}

function getChallengeName(type) {

    const names = {

        Math: "🧮 Math Problems",

        Logic: "🧩 Logic Puzzles",

        Memory: "🧠 Memory Challenges",

        Word: "🔤 Word Games",

        Pattern: "🔷 Pattern Recognition",

        Riddle: "💡 Riddles",

        Quiz: "❓ Quick Quizzes"

    };

    return names[type] || "🧮 Math Problems";
}

/* ------------------------------------------
   CHALLENGE ICON
------------------------------------------ */

function getChallengeIcon(type) {

    const icons = {

        Math: "🧮",

        Logic: "🧩",

        Memory: "🧠",

        Word: "🔤",

        Pattern: "🔷",

        Riddle: "💡",

        Quiz: "❓"

    };

    return icons[type] || "🧠";
}


/* ==========================================
   1. MATH PROBLEMS
========================================== */

function generateMathChallenge(difficulty) {

    let a;
    let b;
    let operation;

    if (difficulty === "Easy") {

        a = Math.floor(Math.random() * 10) + 1;
        b = Math.floor(Math.random() * 10) + 1;

        operation = Math.random() < 0.5 ? "+" : "-";

    }

    else if (difficulty === "Medium") {

        a = Math.floor(Math.random() * 30) + 10;
        b = Math.floor(Math.random() * 15) + 1;

        operation = Math.random() < 0.5 ? "+" : "*";

    }

    else {

        a = Math.floor(Math.random() * 50) + 20;
        b = Math.floor(Math.random() * 20) + 5;

        operation = Math.random() < 0.5 ? "*" : "+";

    }


    let answer;


    if (operation === "+") {

        answer = a + b;

    }

    else if (operation === "-") {

        answer = a - b;

    }

    else {

        answer = a * b;

    }


    question.innerText =
        `${a} ${operation} ${b} = ?`;

    currentChallengeAnswer =
        String(answer);

}


/* ==========================================
   2. LOGIC PUZZLES
========================================== */

function generateLogicChallenge(difficulty) {

    const puzzles = {

        Easy: [

            {
                q: "If 2 cats catch 2 mice in 2 minutes, how many cats are needed to catch 6 mice in 2 minutes?",
                a: "6"
            },

            {
                q: "What comes next? 1, 2, 3, 4, ?",
                a: "5"
            }

        ],

        Medium: [

            {
                q: "A farmer has 10 sheep. All but 3 run away. How many sheep are left?",
                a: "3"
            },

            {
                q: "If today is Monday, what day will it be after 10 days?",
                a: "Thursday"
            }

        ],

        Hard: [

            {
                q: "A clock shows 3:15. What is the angle between the hour and minute hands?",
                a: "7.5"
            },

            {
                q: "If 5 machines make 5 products in 5 minutes, how many minutes will 100 machines take to make 100 products?",
                a: "5"
            }

        ]

    };


    const list = puzzles[difficulty];

    const selected =
        list[Math.floor(Math.random() * list.length)];


    question.innerText = selected.q;

    currentChallengeAnswer =
        selected.a.toLowerCase();

}


/* ==========================================
   3. MEMORY CHALLENGES
========================================== */

function generateMemoryChallenge(difficulty) {

    let length;


    if (difficulty === "Easy") {

        length = 4;

    }

    else if (difficulty === "Medium") {

        length = 6;

    }

    else {

        length = 8;

    }


    let sequence = "";


    for (let i = 0; i < length; i++) {

        sequence +=
            Math.floor(Math.random() * 10);

    }


    currentMemorySequence = sequence;

    currentChallengeAnswer =
        sequence;


    question.innerText =
        "Memorize the number sequence shown below.";


    const memoryDisplay =
        document.getElementById("memoryDisplay");


    memoryDisplay.innerText =
        sequence;

    memoryDisplay.style.display =
        "block";


    /*
       Hide sequence after 3 seconds.
       User must remember it.
    */

    setTimeout(() => {

        memoryDisplay.style.display =
            "none";

        question.innerText =
            "Enter the sequence you remember.";

    }, 3000);

}


/* ==========================================
   4. WORD GAMES
========================================== */

function generateWordChallenge(difficulty) {

    const words = {

        Easy: [

            {
                word: "TAC",
                answer: "CAT"
            },

            {
                word: "GOD",
                answer: "DOG"
            },

            {
                word: "RAT",
                answer: "ART"
            }

        ],

        Medium: [

            {
                word: "RAEHCET",
                answer: "TEACHER"
            },

            {
                word: "NIPAT",
                answer: "PAINT"
            },

            {
                word: "RTEAW",
                answer: "WATER"
            }

        ],

        Hard: [

            {
                word: "NOITACUDE",
                answer: "EDUCATION"
            },

            {
                word: "TNEMNGANAM",
                answer: "MANAGEMENT"
            },

            {
                word: "YGOLONHCET",
                answer: "TECHNOLOGY"
            }

        ]

    };


    const list = words[difficulty];

    const selected =
        list[Math.floor(Math.random() * list.length)];


    question.innerText =
        `Unscramble this word: ${selected.word}`;


    currentChallengeAnswer =
        selected.answer.toLowerCase();

}


/* ==========================================
   5. PATTERN RECOGNITION
========================================== */

function generatePatternChallenge(difficulty) {

    let sequence;
    let answer;


    if (difficulty === "Easy") {

        sequence =
            "2, 4, 6, 8, ?";

        answer = "10";

    }

    else if (difficulty === "Medium") {

        sequence =
            "3, 6, 12, 24, ?";

        answer = "48";

    }

    else {

        sequence =
            "2, 6, 12, 20, 30, ?";

        answer = "42";

    }


    question.innerText =
        `What comes next? ${sequence}`;


    currentChallengeAnswer =
        answer;

}


/* ==========================================
   6. RIDDLES
========================================== */

function generateRiddleChallenge(difficulty) {

    const riddles = {

        Easy: [

            {
                q: "What has hands but cannot clap?",
                a: "clock"
            },

            {
                q: "What has keys but cannot open locks?",
                a: "keyboard"
            }

        ],

        Medium: [

            {
                q: "What gets wetter the more it dries?",
                a: "towel"
            },

            {
                q: "What has a head and a tail but no body?",
                a: "coin"
            }

        ],

        Hard: [

            {
                q: "I speak without a mouth and hear without ears. What am I?",
                a: "echo"
            },

            {
                q: "The more you take, the more you leave behind. What am I?",
                a: "footsteps"
            }

        ]

    };


    const list =
        riddles[difficulty];


    const selected =
        list[Math.floor(Math.random() * list.length)];


    question.innerText =
        selected.q;


    currentChallengeAnswer =
        selected.a.toLowerCase();

}


/* ==========================================
   7. QUICK QUIZZES
========================================== */

function generateQuizChallenge(difficulty) {

    const quizzes = {

        Easy: [

            {
                q: "What is the capital of India?",
                a: "delhi"
            },

            {
                q: "How many days are there in a week?",
                a: "7"
            }

        ],

        Medium: [

            {
                q: "Which planet is known as the Red Planet?",
                a: "mars"
            },

            {
                q: "How many sides does a hexagon have?",
                a: "6"
            }

        ],

        Hard: [

            {
                q: "What is the largest planet in our solar system?",
                a: "jupiter"
            },

            {
                q: "What is the chemical symbol for gold?",
                a: "au"
            }

        ]

    };


    const list =
        quizzes[difficulty];


    const selected =
        list[Math.floor(Math.random() * list.length)];


    question.innerText =
        selected.q;


    currentChallengeAnswer =
        selected.a.toLowerCase();

}

function getToday(){

    return new Date().toISOString().split("T")[0];

}

async function savePerformanceToDatabase(performanceRecord) {

    try {

        const response = await fetch(
            "http://localhost:5000/api/challenges/performance",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    userId: 1,
                    challengeType: performanceRecord.challengeType,
                    difficulty: performanceRecord.difficulty,
                    correct: performanceRecord.correct,
                    timeTaken: performanceRecord.timeTaken,
                    attempts: performanceRecord.attempts,
                    completionStatus: performanceRecord.completionStatus,
                    score: performanceRecord.score
                })
            }
        );


        const data = await response.json();


        if (!response.ok || !data.success) {

            throw new Error(
                data.message ||
                "Failed to save performance."
            );

        }


        console.log(
            "✅ Performance saved to PostgreSQL:",
            data.performance
        );


    } catch (error) {

        console.error(
            "❌ PostgreSQL performance save failed:",
            error
        );

    }
}

// =====================================================
// LOAD BEHAVIORAL ANALYTICS
// =====================================================

async function loadBehaviorAnalytics() {

    try {

        const userId =
            Number(localStorage.getItem("userId")) || 1;

        const response = await fetch(
            `http://localhost:5000/api/challenges/behavior/analytics/${userId}`
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.message ||
                "Failed to load behavioral analytics."
            );
        }

        console.log("📊 Behavioral Analytics:", data);


        // ==========================================
        // 1. WAKE-UP SUCCESS
        // ==========================================

        const totalAlarms =
            Number(data.wakeUpBehavior.totalAlarms) || 0;

        const successfulWakeups =
            Number(data.wakeUpBehavior.successfulWakeups) || 0;

        const wakeUpSuccess =
            totalAlarms > 0
                ? Math.round(
                    successfulWakeups /
                    totalAlarms *
                    100
                )
                : 0;

        document.getElementById(
            "aiWakeAccuracy"
        ).innerText = `${wakeUpSuccess}%`;


        // ==========================================
        // 2. CHALLENGE ACCURACY
        // ==========================================

        const challengeAccuracy =
            Number(
                data.challengePerformance.accuracy
            ) || 0;

        document.getElementById(
            "challengeAccuracy"
        ).innerText = `${challengeAccuracy}%`;


        // ==========================================
        // 3. ALARM SUCCESS
        // ==========================================
const dismissedAlarms =
    Number(data.wakeUpBehavior.dismissedAlarms);

const alarmSuccess =
    totalAlarms > 0
        ? Math.round(
            (dismissedAlarms / totalAlarms) * 100
        )
        : 0;

const alarmSuccessElement =
    document.getElementById("behaviorAlarmSuccess");

if (alarmSuccessElement) {
    alarmSuccessElement.innerText =
        `${alarmSuccess}%`;
}

        // ==========================================
        // 4. SLEEP SCHEDULE CONSISTENCY
        // ==========================================

        const sleepVariation =
            Number(
                data.sleepPatterns.alarmTimeVariationMinutes
            ) || 0;

        let sleepConsistency = 0;

        if (
            data.sleepPatterns.recordedDays > 0
        ) {

            /*
             * Lower variation = better consistency.
             * 0 minutes variation = 100%.
             */

            sleepConsistency = Math.max(
                0,
                Math.min(
                    100,
                    100 - sleepVariation
                )
            );
        }

        document.getElementById(
            "sleepPrediction"
        ).innerText =
            `${Math.round(sleepConsistency)}%`;


        // ==========================================
        // 5. COGNITIVE PERFORMANCE
        // ==========================================

        const cognitivePerformance =
            Number(
                data.challengePerformance.averageScore
            ) || 0;

        document.getElementById(
            "productivityScore"
        ).innerText =
            `${Math.round(cognitivePerformance)}%`;


        console.log("✅ AI Analytics updated successfully.");

    }
    catch (error) {

        console.error(
            "❌ Behavioral Analytics Load Error:",
            error
        );
    }
}

// =====================================================
// MODULE 7 - SNOOZE PATTERN CHART
// =====================================================

async function loadSnoozePatternChart() {

    try {

        const userId =
            Number(localStorage.getItem("userId")) || 1;

        const response = await fetch(
            `http://localhost:5000/api/challenges/behavior/history/${userId}`
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.message ||
                "Failed to load snooze history."
            );
        }


        const history = data.history || [];


        // ---------------------------------------------
        // Prepare chart data
        // ---------------------------------------------

        const labels = history.map(
            item => item.date
        );

        const snoozeData = history.map(
            item => Number(item.snoozes) || 0
        );


        // ---------------------------------------------
        // Find chart canvas
        // ---------------------------------------------

        const canvas =
            document.getElementById(
                "snoozePatternChart"
            );

        if (!canvas) {
            console.error(
                "❌ snoozePatternChart canvas not found."
            );
            return;
        }


        // ---------------------------------------------
        // Create chart
        // ---------------------------------------------

        new Chart(canvas, {

            type: "line",

            data: {

                labels: labels,

                datasets: [

                    {
                        label: "Snoozes",

                        data: snoozeData,

                        tension: 0.3,

                        fill: false,
                        borderWidth: 3,
                        pointRadius: 5,
                        pointHoverRadius: 7

                    }

                ]

            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                scales: {

                    y: {

                        beginAtZero: true,

                        ticks: {

                            stepSize: 1

                        },

                        title: {

                            display: true,

                            text: "Number of Snoozes"

                        }

                    },

                    x: {

                        title: {

                            display: true,

                            text: "Date"

                        }

                    }

                },

                plugins: {

                    legend: {

                        display: true

                    },

                    tooltip: {

                        callbacks: {

                            label: function(context) {

                                return (
                                    " Snoozes: " +
                                    context.parsed.y
                                );

                            }

                        }

                    }

                }

            }

        });


        console.log(
            "✅ Snooze Pattern Chart loaded."
        );

    }
    catch (error) {

        console.error(
            "❌ Snooze Pattern Chart Error:",
            error
        );

    }

}
async function loadWakeUpBehaviorChart() {
    try {
        const userId =
            Number(localStorage.getItem("userId")) || 1;

        const response = await fetch(
            `http://localhost:5000/api/challenges/behavior/history/${userId}`
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.message ||
                "Failed to load wake-up history."
            );
        }

        // Only use dates where wake-up data actually exists
        const validHistory = (data.history || []).filter(
            item =>
                item.wakeUpSuccess !== null &&
                item.wakeUpSuccess !== undefined
        );

        const labels = validHistory.map(
            item => item.date
        );

        const wakeUpData = validHistory.map(
            item => Number(item.wakeUpSuccess)
        );

        const canvas =
            document.getElementById(
                "wakeUpBehaviorChart"
            );

        if (!canvas) {
            console.error(
                "❌ wakeUpBehaviorChart canvas not found."
            );
            return;
        }

        // Destroy previous chart if it already exists
        if (window.wakeUpBehaviorChartInstance) {
            window.wakeUpBehaviorChartInstance.destroy();
        }

        window.wakeUpBehaviorChartInstance =
            new Chart(canvas, {
                type: "line",

                data: {
                    labels: labels,

                    datasets: [
                        {
                            
    label: "Wake-up Success %",
    data: wakeUpData,
    tension: 0.3,
    fill: false,
    borderWidth: 3,
    pointRadius: 5,
    pointHoverRadius: 7

                        }
                    ]
                },

                options: {
                    responsive: true,
                    maintainAspectRatio: false,

                    layout: {
                        padding: {
                            top: 20,
                            right: 20,
                            bottom: 10,
                            left: 10
                        }
                    },

                    scales: {
                        y: {
                            beginAtZero: true,
                            min: 0,
                            max: 100,

                            ticks: {
                                stepSize: 10,

                                callback: function(value) {
                                    return value + "%";
                                }
                            },

                            title: {
                                display: true,
                                text: "Wake-up Success"
                            }
                        },

                        x: {
                            title: {
                                display: true,
                                text: "Date"
                            }
                        }
                    },

                    plugins: {
                        legend: {
                            display: true
                        },

                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return (
                                        " Wake-up Success: " +
                                        context.parsed.y +
                                        "%"
                                    );
                                }
                            }
                        }
                    }
                }
            });

        console.log(
            "✅ Wake-up Behavior Chart loaded:",
            validHistory
        );

    } catch (error) {
        console.error(
            "❌ Wake-up Behavior Chart Error:",
            error
        );
    }
}

async function loadChallengePerformanceChart() {
    try {
        const userId =
            Number(localStorage.getItem("userId")) || 1;

        const response = await fetch(
            `http://localhost:5000/api/challenges/behavior/history/${userId}`
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.message ||
                "Failed to load challenge history."
            );
        }

        const history = data.history || [];

        const labels = history.map(
            item => item.date
        );

        const accuracyData = history.map(
            item => item.challengeAccuracy
        );

        const scoreData = history.map(
            item => item.averageScore
        );

        const canvas =
            document.getElementById(
                "challengePerformanceChart"
            );

        if (!canvas) {
            console.error(
                "❌ challengePerformanceChart canvas not found."
            );
            return;
        }

        new Chart(canvas, {
            type: "line",

            data: {
                labels: labels,

                datasets: [
                    {
                        label: "Challenge Accuracy %",
                        data: accuracyData,
                        tension: 0.3,
                        fill: false,
                        borderWidth: 3,
                        pointRadius: 5,
                        pointHoverRadius: 7
                    },
                    {
                        label: "Average Score",
                        data: scoreData,
                        tension: 0.3,
                        fill: false,
                        borderWidth: 3,
                        pointRadius: 5,
                        pointHoverRadius: 7
                    }
                ]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,

                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,

                        title: {
                            display: true,
                            text: "Performance (%)"
                        }
                    },

                    x: {
                        title: {
                            display: true,
                            text: "Date"
                        }
                    }
                },

                plugins: {
                    legend: {
                        display: true
                    },

                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return (
                                    " " +
                                    context.dataset.label +
                                    ": " +
                                    context.parsed.y +
                                    "%"
                                );
                            }
                        }
                    }
                }
            }
        });

        console.log(
            "✅ Challenge Performance Chart loaded."
        );

    } catch (error) {

        console.error(
            "❌ Challenge Performance Chart Error:",
            error
        );
    }
}

async function loadSleepScheduleChart() {
    try {
        const userId =
            Number(localStorage.getItem("userId")) || 1;

        const response = await fetch(
            `http://localhost:5000/api/challenges/behavior/history/${userId}`
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.message ||
                "Failed to load sleep schedule history."
            );
        }

        const history = data.history || [];

        const labels = history.map(
            item => item.date
        );

        const alarmTimeData = history.map(
            item => {
                if (
                    item.averageAlarmMinutes === null ||
                    item.averageAlarmMinutes === undefined
                ) {
                    return null;
                }

                return Number(
                    item.averageAlarmMinutes
                );
            }
        );

        const canvas =
            document.getElementById(
                "sleepScheduleChart"
            );

        if (!canvas) {
            console.error(
                "❌ sleepScheduleChart canvas not found."
            );
            return;
        }

        new Chart(canvas, {
            type: "line",

            data: {
                labels: labels,

                datasets: [
                    {
                        label: "Average Alarm Time",
                        data: alarmTimeData,
                        tension: 0.3,
                        fill: false,
                        borderWidth: 3,
                        pointRadius: 5,
                        pointHoverRadius: 7
                    }
                ]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,

                scales: {
                    y: {
                        beginAtZero: false,

                        title: {
                            display: true,
                            text: "Alarm Time (Minutes)"
                        }
                    },

                    x: {
                        title: {
                            display: true,
                            text: "Date"
                        }
                    }
                },

                plugins: {
                    legend: {
                        display: true
                    },

                    tooltip: {
                        callbacks: {
                            label: function(context) {

                                const totalMinutes =
                                    Math.round(
                                        context.parsed.y
                                    );

                                const hours =
                                    Math.floor(
                                        totalMinutes / 60
                                    ) % 24;

                                const minutes =
                                    totalMinutes % 60;

                                const formattedTime =
                                    String(hours).padStart(2, "0") +
                                    ":" +
                                    String(minutes).padStart(2, "0");

                                return (
                                    " Alarm Time: " +
                                    formattedTime
                                );
                            }
                        }
                    }
                }
            }
        });

        console.log(
            "✅ Sleep Schedule Chart loaded."
        );

    } catch (error) {

        console.error(
            "❌ Sleep Schedule Chart Error:",
            error
        );
    }
}

async function loadProductivityCorrelationChart() {
    try {
        const userId =
            Number(localStorage.getItem("userId")) || 1;

        const response = await fetch(
            `http://localhost:5000/api/challenges/behavior/history/${userId}`
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.message ||
                "Failed to load productivity history."
            );
        }

        const history = data.history || [];

        const correlationData = history
            .filter(item =>
                Number(item.snoozes) >= 0 &&
                item.averageScore !== null &&
                item.averageScore !== undefined
            )
            .map(item => ({
                x: Number(item.snoozes) || 0,
                y: Number(item.averageScore) || 0,
                date: item.date
            }));

        const canvas =
            document.getElementById(
                "productivityCorrelationChart"
            );

        if (!canvas) {
            console.error(
                "❌ productivityCorrelationChart canvas not found."
            );
            return;
        }

        new Chart(canvas, {
            type: "scatter",

            data: {
                datasets: [
                    {
                        label: "Cognitive Performance",
                        data: correlationData,
                        pointRadius: 7,
                        pointHoverRadius: 9
                    }
                ]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,

                scales: {
                    x: {
                        beginAtZero: true,

                        title: {
                            display: true,
                            text: "Number of Snoozes"
                        },

                        ticks: {
                            stepSize: 1
                        }
                    },

                    y: {
                        beginAtZero: true,
                        max: 100,

                        title: {
                            display: true,
                            text: "Average Cognitive Score"
                        }
                    }
                },

                plugins: {
                    legend: {
                        display: true
                    },

                    tooltip: {
                        callbacks: {
                            label: function(context) {

                                const point =
                                    context.raw;

                                return [
                                    " Snoozes: " +
                                    point.x,

                                    " Cognitive Score: " +
                                    point.y,

                                    " Date: " +
                                    point.date
                                ];
                            }
                        }
                    }
                }
            }
        });

        console.log(
            "✅ Productivity Correlation Chart loaded."
        );

    } catch (error) {

        console.error(
            "❌ Productivity Correlation Chart Error:",
            error
        );
    }
}

// =====================================================
// BEHAVIORAL ANALYTICS EVENT LOGGER
// =====================================================

async function logBehaviorEvent(eventType, metadata = {}) {

    try {

        const userId =
            Number(localStorage.getItem("userId")) || 1;

        const alarmId =
            activeAlarm?.id ?? null;

        const response = await fetch(
            "http://localhost:5000/api/challenges/behavior/event",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    userId: userId,
                    alarmId: alarmId,
                    eventType: eventType,
                    metadata: metadata
                })
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.message ||
                "Failed to save behavioral event."
            );
        }

        console.log(
            "📊 Behavioral event saved:",
            eventType,
            data.event
        );

    } catch (error) {

        console.error(
            "❌ Behavioral event save failed:",
            error
        );
    }
}


function checkAnswer() {

    // Get user's answer
    const userAnswer = answerInput.value.trim();

    // Don't allow empty answers
    if (userAnswer === "") {

        alert("Please enter your answer.");

        answerInput.focus();

        return;
    }

    // ==========================================
// WAKE-UP VERIFICATION FLOW
// ==========================================

if (
    wakeUpVerification.active &&
    wakeUpVerification.phase === "wakefulness"
) {

    const rating =
        Number(userAnswer);

    // Validate rating
    if (
        !Number.isInteger(rating) ||
        rating < 1 ||
        rating > 10
    ) {

        alert(
            "Please enter a wakefulness rating from 1 to 10."
        );

        answerInput.focus();

        return;
    }


    wakeUpVerification.wakefulnessRating =
        rating;


    console.log(
        "Wakefulness rating:",
        rating
    );


    // ------------------------------------------
    // LOW WAKEFULNESS
    // ------------------------------------------

    if (rating <= 5) {

        // User needs more verification
        wakeUpVerification.requiredConsecutive = 4;

        wakeUpVerification.requiredQuestions = 4;


        console.log(
            "⚠ Low wakefulness. Additional challenges required."
        );


        const result =
            document.getElementById(
                "challengeResult"
            );

        if (result) {

            result.innerText =
                "😴 You appear to be sleepy. " +
                "Complete additional challenges to confirm wakefulness.";

            result.style.display = "block";
        }

    }


    // ------------------------------------------
    // GOOD WAKEFULNESS
    // ------------------------------------------

    else {

        wakeUpVerification.requiredConsecutive = 3;

        wakeUpVerification.requiredQuestions = 3;


        console.log(
            "✅ Wakefulness level acceptable."
        );


        const result =
            document.getElementById(
                "challengeResult"
            );

        if (result) {

            result.innerText =
                "✅ Wakefulness confirmed. " +
                "Now complete the cognitive verification.";

            result.style.display = "block";
        }

    }


    // Move to cognitive challenges
    setTimeout(() => {

        startVerificationChallenges();

    }, 700);


    return;
}

// ==========================================
// MULTI-STEP COGNITIVE VERIFICATION
// ==========================================

if (
    wakeUpVerification.active &&
    wakeUpVerification.phase === "challenge"
) {

    const userAnswer =
        answerInput.value.trim();


    const normalizeAnswer =
        answer => {

            return String(answer)
                .trim()
                .toLowerCase()
                .replace(/\s+/g, "")
                .replace(/[.,!?;:]+$/g, "");

        };


    const userAnswerNormalized =
        normalizeAnswer(userAnswer);


    const correctAnswerNormalized =
        normalizeAnswer(
            currentChallengeAnswer
        );


    wakeUpVerification.totalQuestions++;


    // ==========================================
    // CORRECT
    // ==========================================

    if (
        userAnswerNormalized ===
        correctAnswerNormalized
    ) {

        wakeUpVerification.correctAnswers++;

        wakeUpVerification.consecutiveCorrect++;


        console.log(
            "✅ Verification answer correct"
        );

        console.log(
            "Consecutive correct:",
            wakeUpVerification.consecutiveCorrect
        );


        updateVerificationProgress();


        // --------------------------------------
        // VERIFICATION COMPLETE
        // --------------------------------------

        if (
    wakeUpVerification.consecutiveCorrect >=
    wakeUpVerification.requiredConsecutive
) {

    startTimeBasedChallenge();

    return;
}


        // --------------------------------------
        // NEXT QUESTION
        // --------------------------------------

        answerInput.value = "";

        generateQuestion(
            activeAlarm.challengeType,
            activeAlarm.difficulty
        );

        return;
    }


    // ==========================================
    // WRONG
    // ==========================================

    wakeUpVerification.wrongAnswers++;

    wakeUpVerification.consecutiveCorrect = 0;

    wakeUpVerification.extraQuestions++;

    // Every wrong answer adds another question
    wakeUpVerification.requiredQuestions++;


    console.log(
        "❌ Verification answer incorrect"
    );

    console.log(
        "Extra question added."
    );

    console.log(
        "New required question count:",
        wakeUpVerification.requiredQuestions
    );


    const result =
        document.getElementById(
            "challengeResult"
        );

    if (result) {

        result.innerText =
            "❌ Incorrect answer.\n" +
            "Your consecutive streak has been reset.\n" +
            "An additional question has been added.";

        result.style.display = "block";
    }


    updateVerificationProgress();


    // Generate another challenge
    answerInput.value = "";

    setTimeout(() => {

        generateQuestion(
            activeAlarm.challengeType,
            activeAlarm.difficulty
        );

    }, 700);


    return;
}

// ==========================================
// TIME-BASED CHALLENGE ANSWER
// ==========================================

if (
    wakeUpVerification.active &&
    wakeUpVerification.phase === "timeChallenge"
) {

    const userAnswer =
        answerInput.value.trim();


    if (userAnswer === "") {

        alert(
            "Please enter your answer."
        );

        answerInput.focus();

        return;
    }


    // Stop timer
    if (
        wakeUpVerification.verificationTimer
    ) {

        clearInterval(
            wakeUpVerification.verificationTimer
        );

        wakeUpVerification.verificationTimer =
            null;
    }


    wakeUpVerification.timeChallengeActive =
        false;


    wakeUpVerification.totalQuestions++;


    const normalizeAnswer =
        answer => {

            return String(answer)
                .trim()
                .toLowerCase()
                .replace(/\s+/g, "")
                .replace(/[.,!?;:]+$/g, "");

        };


    const userAnswerNormalized =
        normalizeAnswer(userAnswer);


    const correctAnswerNormalized =
        normalizeAnswer(
            currentChallengeAnswer
        );


    // ======================================
    // CORRECT
    // ======================================

    if (
        userAnswerNormalized ===
        correctAnswerNormalized
    ) {

        wakeUpVerification.correctAnswers++;

        console.log(
            "✅ Time-based challenge completed correctly"
        );


        const result =
            document.getElementById(
                "challengeResult"
            );


        if (result) {

            result.innerText =
                "✅ Time-based challenge completed!";

            result.style.display = "block";
        }


        setTimeout(() => {

            completeWakeUpVerification();

        }, 700);


        return;
    }


    // ======================================
    // WRONG
    // ======================================

    wakeUpVerification.wrongAnswers++;


    wakeUpVerification.consecutiveCorrect =
        0;


    wakeUpVerification.extraQuestions++;


    const result =
        document.getElementById(
            "challengeResult"
        );


    if (result) {

        result.innerText =
            "❌ Incorrect answer. " +
            "Another verification challenge is required.";

        result.style.display = "block";
    }


    setTimeout(() => {

        startVerificationChallenges();

    }, 1000);


    return;
}

// ==========================================
// COMPLETE WAKE-UP VERIFICATION
// ==========================================

// ==========================================
// COMPLETE WAKE-UP VERIFICATION
// ==========================================

async function completeWakeUpVerification() {

    // ------------------------------------------
    // Mark verification as passed
    // ------------------------------------------

    wakeUpVerification.verified = true;

    wakeUpVerification.active = false;


    // ------------------------------------------
    // Calculate final accuracy
    // ------------------------------------------

    const accuracy =
        getVerificationAccuracy();


    // ------------------------------------------
    // Calculate total verification time
    // ------------------------------------------

    const verificationTime =
        wakeUpVerification.verificationStartTime
            ? Math.round(
                (Date.now() -
                    wakeUpVerification.verificationStartTime) / 1000
            )
            : 0;

logBehaviorEvent("wake_verified", {
    wakefulnessRating:
        wakeUpVerification.wakefulnessRating,

    totalQuestions:
        wakeUpVerification.totalQuestions,

    correctAnswers:
        wakeUpVerification.correctAnswers,

    wrongAnswers:
        wakeUpVerification.wrongAnswers,

    accuracy:
        accuracy,

    verificationTime:
        verificationTime
});
    // ------------------------------------------
    // Final verification information
    // ------------------------------------------

    console.log(
        "🎉 WAKE-UP VERIFICATION PASSED"
    );

    console.log(
        "Wakefulness:",
        wakeUpVerification.wakefulnessRating
    );

    console.log(
        "Questions:",
        wakeUpVerification.totalQuestions
    );

    console.log(
        "Correct:",
        wakeUpVerification.correctAnswers
    );

    console.log(
        "Wrong:",
        wakeUpVerification.wrongAnswers
    );

    console.log(
        "Accuracy:",
        accuracy + "%"
    );

    console.log(
        "Verification time:",
        verificationTime + " seconds"
    );


    // ==========================================
    // SAVE VERIFICATION TO POSTGRESQL
    // ==========================================

    try {

        const response =
            await fetch(
                "http://localhost:5000/api/challenges/wake-up-verification",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({

                        userId:
                            Number(
                                localStorage.getItem("userId")
                            ) || 1,

                        alarmId: null,

                        wakefulnessRating:
                            wakeUpVerification.wakefulnessRating,

                        totalQuestions:
                            wakeUpVerification.totalQuestions,

                        correctAnswers:
                            wakeUpVerification.correctAnswers,

                        wrongAnswers:
                            wakeUpVerification.wrongAnswers,

                        accuracy:
                            accuracy,

                        verificationTime:
                            verificationTime,

                        verificationStatus:
                            "passed"

                    })
                }
            );


        const data =
            await response.json();


        if (!response.ok || !data.success) {

            throw new Error(
                data.message ||
                "Failed to save wake-up verification."
            );

        }


        console.log(
            "✅ Wake-up verification saved to PostgreSQL:",
            data.verification
        );


    } catch (error) {

        console.error(
            "❌ Failed to save wake-up verification:",
            error
        );

    }


    // ==========================================
    // SHOW SUCCESS MESSAGE
    // ==========================================

    const result =
        document.getElementById(
            "challengeResult"
        );


    if (result) {

        result.innerText =
            "🎉 Wake-up verification successful!\n" +
            "Cognitive accuracy: " +
            accuracy +
            "%\n" +
            "Alarm dismissed.";

        result.style.display = "block";
    }


    // ==========================================
    // STOP ALARM
    // ==========================================

    setTimeout(() => {

        dismissAlarm();

    }, 1000);

}
    // Normalize answers
    function normalizeAnswer(answer) {

        return String(answer)
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "")
            .replace(/[.,!?;:]+$/g, "");
    }

    const userAnswerNormalized =
        normalizeAnswer(userAnswer);

    const correctAnswerNormalized =
        normalizeAnswer(currentChallengeAnswer);

    console.log("User answer:", userAnswerNormalized);
    console.log("Correct answer:", correctAnswerNormalized);

    // Calculate time taken
    const timeTaken = challengeStartTime
        ? Math.round(
            (Date.now() - challengeStartTime) / 1000
        )
        : 0;


    // ==========================================
    // CORRECT ANSWER
    // ==========================================

    if (
        userAnswerNormalized ===
        correctAnswerNormalized
    ) {

        // Number of attempts including this attempt
        const totalAttempts = wrongAttempts + 1;

        // Calculate score
        let score = 100;

        if (totalAttempts === 2) {
            score = 80;
        }
        else if (totalAttempts === 3) {
            score = 60;
        }

        // Create performance record
        const performanceRecord = {

            challengeType:
                currentChallengeType,

            difficulty:
                currentDifficulty,

            correct: true,

            timeTaken:
                timeTaken,

            attempts:
                totalAttempts,

            completionStatus:
                "completed",

            score:
                score,

            timestamp:
                new Date().toISOString()
        };


        // Save performance
        challengeHistory.push(
            performanceRecord
        );

        localStorage.setItem(
            "challengeHistory",
            JSON.stringify(challengeHistory)
        );

        savePerformanceToDatabase(performanceRecord);


        console.log(
            "Challenge performance saved:",
            performanceRecord
        );


        // Reset wrong attempts
        wrongAttempts = 0;


        // Show success message
        const result =
            document.getElementById(
                "challengeResult"
            );

        if (result) {

            result.innerText =
                "✅ Correct! Alarm dismissed.";

            result.style.display =
                "block";
        }


        // Dismiss alarm
        setTimeout(() => {

            dismissAlarm();

        }, 500);

    }


    // ==========================================
    // WRONG ANSWER
    // ==========================================

    else {

        wrongAttempts++;

        stats.wrongAnswers++;

        localStorage.setItem(
            "alarmStats",
            JSON.stringify(stats)
        );

        updateDashboardStats();


        const result =
            document.getElementById(
                "challengeResult"
            );

        if (result) {

            result.innerText =
                "❌ Incorrect! Try again.";

            result.style.display =
                "block";
        }


        console.log(
            "Wrong attempt:",
            wrongAttempts
        );


        // ==========================================
        // AFTER 3 WRONG ATTEMPTS
        // ==========================================

        if (wrongAttempts >= 3) {

            // Save failed challenge
            const performanceRecord = {

                challengeType:
                    currentChallengeType,

                difficulty:
                    currentDifficulty,

                correct: false,

                timeTaken:
                    timeTaken,

                attempts:
                    wrongAttempts,

                completionStatus:
                    "failed",

                score:
                    0,

                timestamp:
                    new Date().toISOString()
            };


            challengeHistory.push(
                performanceRecord
            );

            localStorage.setItem(
                "challengeHistory",
                JSON.stringify(challengeHistory)
            );

            savePerformanceToDatabase(performanceRecord);


            console.log(
                "Failed challenge saved:",
                performanceRecord
            );


            alert(
                "⚠ Too many wrong answers! Difficulty increased."
            );


            increaseDifficulty();


            wrongAttempts = 0;
        }
    }
}
function increaseDifficulty(){

    if(!activeAlarm || activeAlarm.type !== "Smart Adaptive"){

    return;

}

    switch(activeAlarm.difficulty){

        case "Easy":

            activeAlarm.difficulty = "Medium";

            break;

        case "Medium":

            activeAlarm.difficulty = "Hard";

            break;

        case "Hard":

            break;

    }

    localStorage.setItem(
        "alarms",
        JSON.stringify(alarms)
    );

    displayAlarms();

    updateDashboardStats();

}

function updateDashboardStats(){

    const todayAlarms =
        document.getElementById("todayAlarms");

    const wakeAccuracy =
        document.getElementById("wakeAccuracy");

    const alarmSuccess =
        document.getElementById("alarmSuccess");

    const noSnooze =
        document.getElementById("noSnooze");

    if (todayAlarms) {

    const today = getToday();

    const todayTriggeredAlarms = alarms.filter(
        alarm => alarm.lastTriggeredDate === today
    ).length;

    todayAlarms.innerText = todayTriggeredAlarms;
}


    if(wakeAccuracy){

        let accuracy = 0;

        if(stats.totalRings > 0){

            accuracy = Math.round(

                (stats.successfulWakeups / stats.totalRings) * 100

            );

        }

        wakeAccuracy.innerText = accuracy + "%";

    }

    if(alarmSuccess){

        alarmSuccess.innerText = stats.successfulWakeups;

    }

    if(noSnooze){

        noSnooze.innerText = stats.noSnoozeStreak;

    }

}

function updateCurrentDate() {

    const dateElement =
        document.getElementById("currentDate");

    if (!dateElement) return;

    const today = new Date();

    const day = today.toLocaleDateString("en-IN", {
        weekday: "long"
    });

    const date = today.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });

    dateElement.innerText =
        `${day} • ${date}`;
}

updateCurrentDate();

/* =====================================================
   VISUAL ANALYTICS
   ===================================================== */

let challengeTypeAnalyticsChart = null;
let difficultyAnalyticsChart = null;
let performanceTrendAnalyticsChart = null;


/* LOAD ANALYTICS FROM BACKEND */

async function loadAnalytics() {

    try {

        const userId =
            localStorage.getItem("userId") || 1;

        const response = await fetch(
            `http://localhost:5000/api/challenges/performance/analysis/${userId}`
        );

        const data = await response.json();

        if (!response.ok || !data.success) {

            throw new Error(
                data.message || "Failed to load analytics."
            );

        }

        console.log("Analytics data:", data);

        renderAnalytics(data);

    } catch (error) {

        console.error(
            "Analytics loading error:",
            error
        );

    }

}


/* RENDER ANALYTICS */

function renderAnalytics(data) {

    const summary = data.analysis || {};


    /* ==========================
       KPI CARDS
       ========================== */

    const total =
        document.getElementById("analyticsTotal");

    const accuracy =
        document.getElementById("analyticsAccuracy");

    const completed =
        document.getElementById("analyticsCompleted");

    const failed =
        document.getElementById("analyticsFailed");

    const averageTime =
        document.getElementById("analyticsTime");

    const averageScore =
        document.getElementById("analyticsScore");


    if (total) {

        total.innerText =
            summary.totalChallenges ?? 0;

    }


    if (accuracy) {

        accuracy.innerText =
            `${summary.accuracy ?? 0}%`;

    }


    if (completed) {

        completed.innerText =
            summary.completedChallenges ?? 0;

    }


    if (failed) {

        failed.innerText =
            summary.failedChallenges ?? 0;

    }


    if (averageTime) {

        averageTime.innerText =
            `${summary.averageTime ?? 0}s`;

    }


    if (averageScore) {

        averageScore.innerText =
            summary.averageScore ?? 0;

    }


    /* ==========================
       CHALLENGE TYPE CHART
       ========================== */

    const challengeCanvas =
        document.getElementById("challengeTypeChart");


    if (challengeCanvas) {

        if (challengeTypeAnalyticsChart) {

            challengeTypeAnalyticsChart.destroy();

        }


        const types =
            data.challengeTypes || [];


        challengeTypeAnalyticsChart =
            new Chart(challengeCanvas, {

                type: "bar",

                data: {

                    labels: types.map(
                        item => item.challenge_type
                    ),

                    datasets: [

                        {
                            label: "Total Challenges",

                            data: types.map(
                                item => Number(item.total)
                            )
                        },

                        {
                            label: "Correct",

                            data: types.map(
                                item => Number(item.correct)
                            )
                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    scales: {

                        y: {

                            beginAtZero: true

                        }

                    }

                }

            });

    }


    /* ==========================
       DIFFICULTY CHART
       ========================== */

    const difficultyCanvas =
        document.getElementById("difficultyChart");


    if (difficultyCanvas) {

        if (difficultyAnalyticsChart) {

            difficultyAnalyticsChart.destroy();

        }


        const difficulties =
            data.difficulties || [];


        const difficultyOrder = [

            "Beginner",
            "Easy",
            "Medium",
            "Hard",
            "Expert"

        ];


        const difficultyData =
            difficultyOrder.map(level => {

                const item =
                    difficulties.find(
                        d => d.difficulty === level
                    );

                return item
                    ? Number(item.total)
                    : 0;

            });


        difficultyAnalyticsChart =
            new Chart(difficultyCanvas, {

                type: "doughnut",

                data: {

                    labels: difficultyOrder,

                    datasets: [

                        {

                            data: difficultyData

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    plugins: {

                        legend: {

                            position: "bottom"

                        }

                    }

                }

            });

    }


    /* ==========================
       PERFORMANCE TREND
       ========================== */

    const trendCanvas =
        document.getElementById(
            "performanceTrendChart"
        );


    if (trendCanvas) {

        if (performanceTrendAnalyticsChart) {

            performanceTrendAnalyticsChart.destroy();

        }


        const trend =
            data.trend || [];


        performanceTrendAnalyticsChart =
            new Chart(trendCanvas, {

                type: "line",

                data: {

                    labels: trend.map(item => {

                        return new Date(
                            item.date
                        ).toLocaleDateString(
                            "en-IN",
                            {
                                day: "numeric",
                                month: "short"
                            }
                        );

                    }),

                    datasets: [

                        {

                            label: "Average Score",

                            data: trend.map(
                                item =>
                                    Number(
                                        item.average_score
                                    )
                            ),

                            tension: 0.3,

                            fill: false

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    scales: {

                        y: {

                            beginAtZero: true,

                            max: 100

                        }

                    }

                }

            });

    }


    /* ==========================
       RECENT HISTORY
       ========================== */

    const historyBody =
        document.getElementById(
            "analyticsHistoryBody"
        );


    if (historyBody) {

        const history =
            data.recentHistory || [];


        if (history.length === 0) {

            historyBody.innerHTML = `

                <tr>

                    <td colspan="6">
                        No challenge history available.
                    </td>

                </tr>

            `;

        } else {

            historyBody.innerHTML =
                history.map(item => `

                    <tr>

                        <td>
                            ${item.challenge_type}
                        </td>

                        <td>
                            ${item.difficulty}
                        </td>

                        <td>
                            ${
                                item.correct
                                ? "✅ Correct"
                                : "❌ Failed"
                            }
                        </td>

                        <td>
                            ${item.score}
                        </td>

                        <td>
                            ${item.time_taken}s
                        </td>

                        <td>
                            ${item.attempts}
                        </td>

                    </tr>

                `).join("");

        }

    }

}


/* =====================================================
   LOAD ANALYTICS WHEN ANALYTICS MENU IS CLICKED
   ===================================================== */

const visualAnalyticsMenu =
    document.getElementById("analyticsMenu");


if (visualAnalyticsMenu) {

    visualAnalyticsMenu.addEventListener(
        "click",
        function () {

            loadAnalytics();

        }
    );

}

// ==========================================
// START WAKE-UP VERIFICATION
// ==========================================

function startWakeUpVerification() {

    wakeUpVerification = {

        active: true,

        phase: "wakefulness",

        wakefulnessRating: 0,

        requiredConsecutive: 3,

        consecutiveCorrect: 0,

        totalQuestions: 0,

        requiredQuestions: 3,

        correctAnswers: 0,

        wrongAnswers: 0,

        extraQuestions: 0,

        verificationStartTime: Date.now(),

        verified: false

    };

    console.log(
        "🧠 Wake-up verification started"
    );

    console.log(
        "Required consecutive correct:",
        wakeUpVerification.requiredConsecutive
    );

    showWakefulnessAssessment();

logBehaviorEvent("verification_started", {
    challengeType: activeAlarm?.challengeType || null,
    difficulty: activeAlarm?.difficulty || null
});

}
// ==========================================
// WAKEFULNESS ASSESSMENT
// ==========================================

function showWakefulnessAssessment() {

    question.innerText =
        "How awake are you right now?";

    answerInput.value = "";

    answerInput.placeholder =
        "Enter a number from 1 to 10";

    const result =
        document.getElementById("challengeResult");

    if (result) {

        result.innerText =
            "🧠 Wakefulness Check: Rate yourself from 1 to 10.";

        result.style.display = "block";
    }

    console.log(
        "Waiting for wakefulness rating..."
    );
}

// ==========================================
// TIME-BASED WAKE-UP CHALLENGE
// ==========================================

async function startTimeBasedChallenge() {

    wakeUpVerification.phase =
        "timeChallenge";

    wakeUpVerification.timeChallengeActive =
        true;

    // Select time based on difficulty
    switch (currentDifficulty) {

        case "Easy":
            wakeUpVerification.timeLimit = 30;
            break;

        case "Medium":
            wakeUpVerification.timeLimit = 45;
            break;

        case "Hard":
            wakeUpVerification.timeLimit = 60;
            break;

        case "Expert":
            wakeUpVerification.timeLimit = 60;
            break;

        default:
            wakeUpVerification.timeLimit = 30;
    }

    wakeUpVerification.timeRemaining =
        wakeUpVerification.timeLimit;


    console.log(
        "⏱ Time-based challenge started"
    );

    console.log(
        "Time limit:",
        wakeUpVerification.timeLimit,
        "seconds"
    );


    // Generate a thought-provoking challenge
    const timeChallengeTypes = [
        "riddle",
        "word",
        "logic",
        "pattern"
    ];

    const randomIndex =
        Math.floor(
            Math.random() *
            timeChallengeTypes.length
        );

    const challengeType =
        timeChallengeTypes[randomIndex];


    await generateQuestion(
        challengeType,
        currentDifficulty
    );


    startVerificationCountdown();
}

// ==========================================
// VERIFICATION COUNTDOWN
// ==========================================

function startVerificationCountdown() {

    // Clear any previous timer
    if (wakeUpVerification.verificationTimer) {

        clearInterval(
            wakeUpVerification.verificationTimer
        );
    }


    wakeUpVerification.verificationTimer =
        setInterval(() => {

            wakeUpVerification.timeRemaining--;


            updateTimeDisplay();


            if (
                wakeUpVerification.timeRemaining <= 0
            ) {

                clearInterval(
                    wakeUpVerification.verificationTimer
                );

                wakeUpVerification.verificationTimer =
                    null;

                handleTimeChallengeTimeout();

            }

        }, 1000);
}

// ==========================================
// TIME DISPLAY
// ==========================================

function updateTimeDisplay() {

    const result =
        document.getElementById(
            "challengeResult"
        );

    if (!result) {
        return;
    }


    const minutes =
        Math.floor(
            wakeUpVerification.timeRemaining / 60
        );

    const seconds =
        wakeUpVerification.timeRemaining % 60;


    const formattedTime =
        `${String(minutes).padStart(2, "0")}:` +
        `${String(seconds).padStart(2, "0")}`;


    result.innerText =
        `⏱ Time remaining: ${formattedTime}`;

    result.style.display = "block";
}

// ==========================================
// TIMEOUT
// ==========================================

function handleTimeChallengeTimeout() {

    wakeUpVerification.timeChallengeActive =
        false;


    wakeUpVerification.wrongAnswers++;


    console.log(
        "⏰ Time-based challenge expired"
    );


    const result =
        document.getElementById(
            "challengeResult"
        );


    if (result) {

        result.innerText =
            "⏰ Time expired!\n" +
            "The challenge was not completed.";

        result.style.display = "block";
    }


    // Reset consecutive streak
    wakeUpVerification.consecutiveCorrect =
        0;


    // Add another challenge
    wakeUpVerification.extraQuestions++;


    setTimeout(() => {

        startVerificationChallenges();

    }, 1000);
}

// ==========================================
// START VERIFICATION CHALLENGES
// ==========================================

function startVerificationChallenges() {

    wakeUpVerification.phase =
        "challenge";

    wakeUpVerification.consecutiveCorrect =
        0;

    wakeUpVerification.requiredQuestions =
        wakeUpVerification.requiredConsecutive;

    console.log(
        "🧠 Cognitive verification started"
    );

    console.log(
        "Required consecutive correct:",
        wakeUpVerification.requiredConsecutive
    );

    generateQuestion(
        activeAlarm.challengeType,
        activeAlarm.difficulty
    );

    updateVerificationProgress();
}

// ==========================================
// VERIFICATION PROGRESS
// ==========================================

function updateVerificationProgress() {

    const result =
        document.getElementById(
            "challengeResult"
        );

    if (!result) {
        return;
    }

    result.innerText =
        `🧠 Wake-up Verification\n` +
        `Consecutive Correct: ` +
        `${wakeUpVerification.consecutiveCorrect} / ` +
        `${wakeUpVerification.requiredConsecutive}\n` +
        `Questions: ` +
        `${wakeUpVerification.totalQuestions} / ` +
        `${wakeUpVerification.requiredQuestions}\n` +
        `Accuracy: ` +
        `${getVerificationAccuracy()}%`;

    result.style.display = "block";
}
function getVerificationAccuracy() {

    if (
        wakeUpVerification.totalQuestions === 0
    ) {
        return 0;
    }

    return Math.round(
        (
            wakeUpVerification.correctAnswers /
            wakeUpVerification.totalQuestions
        ) * 100
    );
}

document.addEventListener(
    "DOMContentLoaded",
    () => {
        loadBehaviorAnalytics();
        loadSnoozePatternChart();
        loadWakeUpBehaviorChart();
        loadChallengePerformanceChart();
        loadSleepScheduleChart();
        loadProductivityCorrelationChart();
    }
);