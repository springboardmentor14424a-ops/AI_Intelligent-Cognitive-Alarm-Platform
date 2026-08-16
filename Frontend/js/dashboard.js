const question = document.getElementById("question");
const answerInput = document.getElementById("answerInput");

let wrongAttempts = 0;
let snoozeCount = 0;

let currentChallenge = null;
let currentChallengeType = null;
let currentDifficulty = null;

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

function dismissAlarm(){

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
    snoozeCount++;

    stats.totalSnoozes++;

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



function checkAnswer() {

    // Get user's answer
    const userAnswer = answerInput.value.trim();

    // Don't allow empty answers
    if (userAnswer === "") {

        alert("Please enter your answer.");

        answerInput.focus();

        return;
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