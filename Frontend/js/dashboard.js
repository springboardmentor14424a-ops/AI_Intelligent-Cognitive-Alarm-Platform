const question = document.getElementById("question");
const answerInput = document.getElementById("answerInput");
let correctAnswer = 0;
let wrongAttempts = 0;
let snoozeCount = 0;

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

    snooze: Number(document.getElementById("alarmSnooze").value),

    difficulty: document.getElementById("alarmDifficulty").value,

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

function checkAlarms(){

    const now = new Date();

    const currentTime = now.toTimeString().slice(0,5);

    alarms.forEach(alarm=>{

        if(

            alarm.enabled &&

            canRingToday(alarm.type) &&

            alarm.time===currentTime &&

            alarm.lastTriggeredDate !== getToday()

        ){

            alarm.lastTriggeredDate = getToday();

            // Add alarm to queue
            const alreadyQueued = alarmQueue.some(a => a.id === alarm.id);

if (!alreadyQueued) {
    alarmQueue.push(alarm);
}

        }

    });

function showNextAlarm(){

    if(alarmQueue.length===0){

        activeAlarm=null;

        return;

    }

    activeAlarm = alarmQueue.shift();

    stats.totalRings++;

    stats.successfulWakeups++;

localStorage.setItem(
    "alarmStats",
    JSON.stringify(stats)
);

updateDashboardStats();

localStorage.setItem(
    "alarmStats",
    JSON.stringify(stats)
);

updateDashboardStats();

    popupLabel.innerText = activeAlarm.label;

    generateQuestion(activeAlarm.difficulty);
    answerInput.value="";

    alarmPopup.style.display="flex";

    alarmSound.currentTime=0;

    alarmSound.play();

}

    // Show next alarm only if no popup is open
    if(activeAlarm===null && alarmQueue.length>0){

        showNextAlarm();

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

function generateQuestion(difficulty){

    let a,b;

    switch(difficulty){

        case "Easy":

            a=Math.floor(Math.random()*10)+1;
            b=Math.floor(Math.random()*10)+1;

            question.innerText=`${a} + ${b} = ?`;

            correctAnswer=a+b;

            break;

        case "Medium":

            a=Math.floor(Math.random()*20)+1;
            b=Math.floor(Math.random()*10)+1;

            question.innerText=`${a} × ${b} = ?`;

            correctAnswer=a*b;

            break;

        case "Hard":

            a=Math.floor(Math.random()*50)+20;
            b=Math.floor(Math.random()*30)+10;

            question.innerText=`${a} + ${b} - 5 = ?`;

            correctAnswer=a+b-5;

            break;

    }

}

function getToday(){

    return new Date().toISOString().split("T")[0];

}
function checkAnswer(){

    const answer = Number(answerInput.value);

    if(answer === correctAnswer){

        wrongAttempts = 0;

        dismissAlarm();

    }else{

        wrongAttempts++;

        stats.wrongAnswers++;

localStorage.setItem(
    "alarmStats",
    JSON.stringify(stats)
);

updateDashboardStats();

        alert("❌ Wrong Answer!");

        if(wrongAttempts >= 3){

            alert("⚠ Too many wrong answers! Difficulty increased.");

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

    if(todayAlarms){

        todayAlarms.innerText = stats.totalRings;

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