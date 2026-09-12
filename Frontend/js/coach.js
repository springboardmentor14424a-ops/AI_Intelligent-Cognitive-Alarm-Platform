const API = "http://localhost:5000/api";


// =====================================================
// SAFE NUMBER
// =====================================================

function num(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}


// =====================================================
// UPDATE TEXT
// =====================================================

function setText(id, value) {

    const element = document.getElementById(id);

    if (element) {
        element.innerText = value;
    }
}


// =====================================================
// UPDATE PROGRESS BAR
// =====================================================

function setProgress(id, value) {

    const element = document.getElementById(id);

    if (!element) return;

    const score = Math.max(0, Math.min(100, Math.round(num(value))));

    element.style.width = `${score}%`;
}


// =====================================================
// CALCULATE USER ANALYTICS
// =====================================================

function calculateUserMetrics(data) {

    const wake = data.wakeUpBehavior || {};
    const challenge = data.challengePerformance || {};
    const snooze = data.snoozePatterns || {};
    const habit = data.habitConsistency || {};
    const sleep = data.sleepPatterns || {};
    const productivity = data.productivityCorrelation || {};


    // -------------------------------
    // WAKE-UP SUCCESS
    // -------------------------------

    const totalAlarms = num(wake.totalAlarms);
    const successfulWakeups = num(wake.successfulWakeups);

    const wakeScore =
        totalAlarms > 0
            ? Math.round(
                (successfulWakeups / totalAlarms) * 100
            )
            : 0;


    // -------------------------------
    // CHALLENGE ACCURACY
    // -------------------------------

    const challengeScore =
        num(challenge.accuracy);


    // -------------------------------
    // SNOOZE SCORE
    // -------------------------------

    const totalSnoozes =
        num(snooze.totalSnoozes);

    const snoozeScore =
        totalSnoozes === 0
            ? 100
            : Math.max(
                0,
                100 - (totalSnoozes * 10)
            );


    // -------------------------------
    // HABIT CONSISTENCY
    // -------------------------------

    const habitScore =
        num(habit.consistency);


// -------------------------------
// PRODUCTIVITY
// Use the official Habit Score
// productivity calculation
// -------------------------------

const productivityScore =
    num(data.productivityScore);

    // -------------------------------
    // SLEEP
    // -------------------------------

    const recordedDays =
        num(sleep.recordedDays);

    const variation =
        num(sleep.alarmTimeVariationMinutes);


    const sleepConsistency =
        recordedDays > 0
            ? Math.max(
                0,
                Math.min(
                    100,
                    Math.round(
                        100 - ((variation / 180) * 100)
                    )
                )
            )
            : 0;


    return {

        wakeScore,
        challengeScore,
        snoozeScore,
        habitScore,
        productivityScore,

        recordedDays,
        variation,
        sleepConsistency,

        missedAlarms:
            num(wake.failedVerifications)

    };

}


// =====================================================
// LOAD COMPLETE COACH DASHBOARD
// =====================================================

async function loadCoachDashboard() {

    try {

        console.log("Loading coach dashboard...");


        // =================================================
        // 1. GET ALL USERS
        // =================================================

        const usersResponse =
            await fetch(`${API}/users`);

        const usersData =
            await usersResponse.json();


        if (!usersResponse.ok || !usersData.success) {

            throw new Error(
                usersData.message ||
                "Failed to load users"
            );

        }


        const users =
            usersData.users || [];


        console.log("Coach users:", users);


        // =================================================
        // 2. ASSIGNED USERS COUNT
        // =================================================

        setText(
            "assignedUsersCount",
            users.length
        );


        // =================================================
        // 3. GET ANALYTICS FOR EVERY USER
        // =================================================

        const analyticsResults =
            await Promise.all(

                users.map(async user => {

                    try {

                        const response =
                            await fetch(
                                `${API}/challenges/behavior/analytics/${user.id}`
                            );


                        const data =
                            await response.json();
                        
                        const habitResponse =
    await fetch(
        `${API}/habit-score/${user.id}`
    );

const habitData =
    await habitResponse.json();


                        if (
                            !response.ok ||
                            !data.success
                        ) {

                            console.warn(
                                `No analytics for user ${user.id}`
                            );

                            return {

                                user,
                                data: null,
                                metrics: null

                            };

                        }


                        return {
    user,
    data: {
        ...data,
        productivityScore:
            habitData.success
                ? habitData.scores?.productivityScore || 0
                : 0
    },
    habitData,
    metrics:
        calculateUserMetrics({
            ...data,
            productivityScore:
                habitData.success
                    ? habitData.scores?.productivityScore || 0
                    : 0
        })
};

                    }
                    catch (error) {

                        console.error(
                            `Analytics error for user ${user.id}:`,
                            error
                        );


                        return {

                            user,
                            data: null,
                            metrics: null

                        };

                    }

                })

            );


        // =================================================
        // 4. REMOVE OLD TABLE ROWS
        // =================================================

        const table =
            document.getElementById(
                "assignedUsersTable"
            );


        if (table) {

            table
                .querySelectorAll(
                    "tr:not(:first-child)"
                )
                .forEach(row => row.remove());

        }


        // =================================================
        // AGGREGATE VALUES
        // =================================================

        let wakeTotal = 0;
        let challengeTotal = 0;
        let productivityTotal = 0;
        let habitTotal = 0;

        let healthySleep = 0;
        let missedAlarms = 0;

        let metricUsers = 0;

        // =================================================
        // 5. PROCESS EVERY USER
        // =================================================

        analyticsResults.forEach(result => {

            const user =
                result.user;

            const metrics =
                result.metrics;


            // ---------------------------------------------
            // USER TABLE
            // ---------------------------------------------

            if (table) {

                const row =
                    document.createElement("tr");


                let sleepDisplay = "No data";
                let accuracyDisplay = "0%";
                let statusDisplay = "No data";


                if (metrics) {

                    // Sleep status
                    if (metrics.recordedDays === 0) {

                        sleepDisplay =
                            "No sleep data";

                    }
                    else if (metrics.variation <= 60) {

                        sleepDisplay =
                            "Healthy";

                    }
                    else if (metrics.variation <= 120) {

                        sleepDisplay =
                            "Needs Improvement";

                    }
                    else {

                        sleepDisplay =
                            "Unhealthy";

                    }


                    accuracyDisplay =
                        `${metrics.challengeScore}%`;


                    statusDisplay =
                        metrics.challengeScore >= 80
                            ? "Healthy"
                            : "Needs Improvement";

                }


                row.innerHTML = `

                    <td>
                        ${user.name || "User"}
                    </td>

                    <td>
                        ${sleepDisplay}
                    </td>

                    <td>
                        ${accuracyDisplay}
                    </td>

                    <td>
                        ${statusDisplay}
                    </td>

                `;


                table.appendChild(row);

            }


            // ---------------------------------------------
            // AGGREGATE ANALYTICS
            // ---------------------------------------------

            if (!metrics) return;


            wakeTotal +=
                metrics.wakeScore;


            challengeTotal +=
                metrics.challengeScore;


            productivityTotal +=
                metrics.productivityScore;


            habitTotal +=
                metrics.habitScore;


            missedAlarms +=
                metrics.missedAlarms;


            if (
                metrics.recordedDays > 0 &&
                metrics.variation <= 60
            ) {

                healthySleep++;

            }


            metricUsers++;

        });


        // =================================================
        // 6. AVERAGES
        // =================================================

        const averageWake =
            metricUsers > 0
                ? Math.round(
                    wakeTotal / metricUsers
                )
                : 0;


        const averageChallenge =
            metricUsers > 0
                ? Math.round(
                    challengeTotal / metricUsers
                )
                : 0;


        const averageProductivity =
            metricUsers > 0
                ? Math.round(
                    productivityTotal / metricUsers
                )
                : 0;


        const averageHabit =
            metricUsers > 0
                ? Math.round(
                    habitTotal / metricUsers
                )
                : 0;


        // =================================================
        // 6b. SLEEP AGGREGATES
        // Only include users who actually have recorded
        // sleep data — otherwise a user with zero data
        // (variation/consistency both default to 0) drags
        // the average down and can flip the verdict (e.g.
        // showing "Healthy" while consistency reads ~20%).
        // =================================================

        const sleepResults =
            analyticsResults
                .filter(r => r.metrics && r.metrics.recordedDays > 0);


        const averageSleepConsistency =
            sleepResults.length > 0
                ? Math.round(
                    sleepResults.reduce(
                        (sum, r) =>
                            sum +
                            r.metrics.sleepConsistency,
                        0
                    ) /
                    sleepResults.length
                )
                : 0;


        const totalRecordedDays =
            sleepResults.reduce(
                (sum, r) =>
                    sum +
                    r.metrics.recordedDays,
                0
            );


        const averageVariation =
            sleepResults.length > 0
                ? Math.round(
                    sleepResults.reduce(
                        (sum, r) =>
                            sum +
                            r.metrics.variation,
                        0
                    ) /
                    sleepResults.length
                )
                : 0;


        // =================================================
        // 7. KPI CARDS
        // =================================================

        setText(
            "healthySleepCount",
            healthySleep
        );


        setText(
            "missedAlarmsCount",
            missedAlarms
        );


        setText(
            "averageAccuracy",
            `${averageChallenge}%`
        );


        // =================================================
        // 8. USER BEHAVIOR INSIGHTS
        // =================================================

        setText(
            "coachWakeSuccess",
            `${averageWake}%`
        );


        setText(
            "coachChallenges",
            `${averageChallenge}%`
        );


        setText(
            "coachProductivity",
            `${averageProductivity}%`
        );


        setText(
            "coachHabitScore",
            `${averageHabit}%`
        );


// =================================================
// 9. HABIT ADHERENCE
// =================================================

// Alarm Routine = official Sleep Schedule Adherence
const averageAlarmRoutine =
    analyticsResults.filter(
        r => r.habitData?.success
    ).length > 0
        ? Math.round(
            analyticsResults
                .filter(r => r.habitData?.success)
                .reduce(
                    (sum, r) =>
                        sum +
                        num(r.habitData.scores?.sleepAdherence),
                    0
                ) /
            analyticsResults.filter(
                r => r.habitData?.success
            ).length
        )
        : 0;

setText(
    "coachWakeAdherence",
    analyticsResults.some(
        r => r.habitData?.success
    )
        ? `${averageAlarmRoutine}%`
        : "No data"
);

setProgress(
    "coachWakeAdherenceBar",
    averageAlarmRoutine
);


// Wake-up Consistency = official Habit Score
const habitScoreUsers =
    analyticsResults.filter(
        r => r.habitData?.success
    );

const averageWakeUpConsistency =
    habitScoreUsers.length > 0
        ? Math.round(
            habitScoreUsers.reduce(
                (sum, r) =>
                    sum +
                    num(r.habitData.scores?.wakeUpConsistency),
                0
            ) / habitScoreUsers.length
        )
        : 0;

setText(
    "coachChallengeAdherence",
    habitScoreUsers.length > 0
        ? `${averageWakeUpConsistency}%`
        : "No data"
);

setProgress(
    "coachChallengeAdherenceBar",
    averageWakeUpConsistency
);


// Challenge Completion
const averageChallengeCompletion =
    analyticsResults
        .filter(r => r.habitData?.success)
        .length > 0
        ? Math.round(
            analyticsResults
                .filter(r => r.habitData?.success)
                .reduce(
                    (sum, r) =>
                        sum +
                        num(r.habitData.scores?.challengeCompletion),
                    0
                ) /
            analyticsResults.filter(
                r => r.habitData?.success
            ).length
        )
        : 0;

setText(
    "coachSnoozeAdherence",
    analyticsResults.some(
        r => r.habitData?.success
    )
        ? `${averageChallengeCompletion}%`
        : "No data"
);

setProgress(
    "coachSnoozeAdherenceBar",
    averageChallengeCompletion
);

        // =================================================
        // 10. SLEEP TREND
        // (sleepResults / averageSleepConsistency /
        //  totalRecordedDays / averageVariation are computed
        //  in section 6b, above, so both this section and the
        //  Habit Adherence section stay in sync)
        // =================================================

     setText(
    "coachAverageSleep",
    totalRecordedDays > 0
        ? `${totalRecordedDays} recorded days`
        : "No data"
);


        let sleepStatus =
            "No sleep data";


        if (sleepResults.length > 0) {

            if (averageVariation <= 60) {

                sleepStatus =
                    "Healthy";

            }
            else if (averageVariation <= 120) {

                sleepStatus =
                    "Needs Improvement";

            }
            else {

                sleepStatus =
                    "Unhealthy";

            }

        }



setText(
    "coachSleepStatus",
    averageAlarmRoutine > 0
        ? averageAlarmRoutine >= 80
            ? "Healthy"
            : averageAlarmRoutine >= 60
                ? "Needs Improvement"
                : "Unhealthy"
        : "No data"
);


        setText(
            "coachSleepConsistency",
            `${averageSleepConsistency}%`
        );


        let recommendation =
            "Complete more sleep records.";


        if (sleepResults.length > 0) {

            if (averageVariation <= 60) {

                recommendation =
                    "Maintain current routine.";

            }
            else {

                recommendation =
                    "Try to keep a consistent sleep and wake-up time.";

            }

        }


        setText(
            "coachSleepRecommendation",
            recommendation
        );


        // =================================================
        // 11. PROGRESS MONITORING
        // =================================================

        const overallProgress =
            metricUsers > 0
                ? Math.round(
                    (
                        averageWake +
                        averageChallenge +
                        averageProductivity +
                        averageHabit
                    ) / 4
                )
                : 0;


        setText(
            "coachOverallProgress",
            `${overallProgress}%`
        );


        setProgress(
            "coachOverallProgressBar",
            overallProgress
        );


        // Sleep improvement
        setText(
            "coachSleepImprovement",
            `${averageSleepConsistency}%`
        );


        setProgress(
            "coachSleepImprovementBar",
            averageSleepConsistency
        );


        // Productivity
        setText(
            "coachProductivityProgress",
            `${averageProductivity}%`
        );


        setProgress(
            "coachProductivityProgressBar",
            averageProductivity
        );


        console.log(
            "================================="
        );

        console.log(
            "COACH DASHBOARD UPDATED"
        );

        console.log({

            users:
                users.length,

            healthySleep,

            missedAlarms,

            averageWake,

            averageChallenge,

            averageProductivity,

            averageHabit,

            averageSleepConsistency,

            overallProgress

        });

        console.log(
            "================================="
        );


    }
    catch (error) {

        console.error(
            "Coach dashboard error:",
            error
        );

    }

}

function showAssignedUsers() {
    const table = document.getElementById("assignedUsersTable");

    if (table) {
        table.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }
}

function coachLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("userId");

    window.location.href = "login.html";
}

// =====================================================
// COACH USER SEARCH
// =====================================================

const coachUserSearch =
    document.getElementById("coachUserSearch");

if (coachUserSearch) {

    coachUserSearch.addEventListener("input", function () {

        const searchText =
            this.value.toLowerCase().trim();

        const table =
            document.getElementById("assignedUsersTable");

        if (!table) return;

        const rows =
            table.querySelectorAll("tr:not(:first-child)");

        rows.forEach(row => {

            const rowText =
                row.innerText.toLowerCase();

            row.style.display =
                rowText.includes(searchText)
                    ? ""
                    : "none";
        });
    });
}

// =====================================================
// START
// =====================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadCoachDashboard();

    }
);