const pool = require("../config/db");

// =====================================================
// MODULE 9 — RECOMMENDATION ENGINE
// =====================================================

async function getRecommendations(req, res) {

    try {

        const userId =
            Number(req.params.userId);

        const bedtime =
    req.query.bedtime || null;

const wakeUpTime =
    req.query.wakeUpTime || null;

        if (!userId) {

            return res.status(400).json({

                success: false,

                message: "Invalid user ID"

            });

        }


        // =================================================
        // GET USER BEHAVIOR DATA
        // =================================================

        const result = await pool.query(
            `
            SELECT
                event_type,
                event_time,
                metadata
            FROM behavioral_events
            WHERE user_id = $1
            ORDER BY event_time ASC
            `,
            [userId]
        );


        const events = result.rows;


        // =================================================
        // BASIC COUNTS
        // =================================================

        const alarms =
            events.filter(
                event =>
                    event.event_type === "alarm_ring"
            ).length;


        const wakeups =
            events.filter(
                event =>
                    event.event_type === "wake_verified"
            ).length;


        const snoozes =
            events.filter(
                event =>
                    event.event_type === "snooze"
            ).length;


        // =================================================
        // CHALLENGE DATA
        // =================================================

        let totalQuestions = 0;

        let correctAnswers = 0;


        events
            .filter(
                event =>
                    event.event_type === "wake_verified"
            )
            .forEach(event => {

                let metadata =
                    event.metadata || {};


                if (
                    typeof metadata === "string"
                ) {

                    try {

                        metadata =
                            JSON.parse(metadata);

                    } catch {

                        metadata = {};

                    }

                }


                totalQuestions +=
                    Number(
                        metadata.totalQuestions
                    ) || 0;


                correctAnswers +=
                    Number(
                        metadata.correctAnswers
                    ) || 0;

            });


        const challengeAccuracy =
            totalQuestions > 0

                ? (
                    correctAnswers /
                    totalQuestions
                ) * 100

                : 0;


        // =================================================
        // WAKE-UP CONSISTENCY
        // =================================================

        const wakeUpConsistency =
            alarms > 0

                ? (
                    wakeups /
                    alarms
                ) * 100

                : 0;


        // =================================================
        // SNOOZE SCORE
        // =================================================

        const numberOfDays =
            new Set(
                events.map(event =>
                    new Date(event.event_time)
                        .toISOString()
                        .split("T")[0]
                )
            ).size;


        const averageSnoozes =
            numberOfDays > 0

                ? snoozes / numberOfDays

                : 0;


        const snoozeReduction =
            Math.max(
                0,
                Math.min(
                    100,
                    100 -
                    (averageSnoozes * 10)
                )
            );


        // =================================================
        // HABIT SCORE
        // =================================================

 const sleepEvents =
    events.filter(
        event =>
            event.event_type === "wake_verified"
    );

const scheduledDays =
    new Set(
        events.map(event =>
            new Date(event.event_time)
                .toISOString()
                .split("T")[0]
        )
    ).size;

const adheredDays =
    new Set(
        sleepEvents.map(event =>
            new Date(event.event_time)
                .toISOString()
                .split("T")[0]
        )
    ).size;

const sleepAdherence =
    scheduledDays > 0
        ? Math.min(
            100,
            (adheredDays / scheduledDays) * 100
        )
        : 0;


        const habitScore =

            (wakeUpConsistency * 0.35) +

            (challengeAccuracy * 0.25) +

            (snoozeReduction * 0.20) +

            (sleepAdherence * 0.20);


// =================================================
// SLEEP DURATION ANALYSIS
// =================================================

let sleepDuration = null;

let sleepRecommendation =
    "Set a consistent bedtime and wake-up time to improve your sleep routine.";


if (bedtime && wakeUpTime) {

    const [bedHour, bedMinute] =
        bedtime.split(":").map(Number);

    const [wakeHour, wakeMinute] =
        wakeUpTime.split(":").map(Number);


    let bedtimeMinutes =
        bedHour * 60 + bedMinute;

    let wakeUpMinutes =
        wakeHour * 60 + wakeMinute;


    // Wake-up is normally on the next day
    if (wakeUpMinutes <= bedtimeMinutes) {

        wakeUpMinutes += 24 * 60;

    }


    sleepDuration =
        (wakeUpMinutes - bedtimeMinutes) / 60;


    // =============================================
    // SLEEP RECOMMENDATION
    // =============================================

    if (sleepDuration < 7) {

        sleepRecommendation =
            `Your planned sleep duration is only ${sleepDuration.toFixed(1)} hours. Try going to bed earlier to get at least 7–8 hours of sleep.`;

    }

    else if (sleepDuration > 9) {

        sleepRecommendation =
            `Your planned sleep duration is ${sleepDuration.toFixed(1)} hours. If you still feel tired, consider adjusting your bedtime or wake-up time gradually.`;

    }

    else {

        sleepRecommendation =
            `Your planned sleep duration is ${sleepDuration.toFixed(1)} hours, which is within a healthy range. Try to maintain this schedule consistently.`;

    }

}

        // =================================================
        // RECOMMENDATIONS
        // =================================================

        let wakeUpRecommendation;

        let habitRecommendation;

        let productivityRecommendation;

        let challengeRecommendation;



        // =================================================
        // 2. WAKE-UP OPTIMIZATION
        // =================================================

        if (wakeUpConsistency < 60) {

            wakeUpRecommendation =
                "Try setting a more consistent wake-up time and avoid repeatedly changing your alarm schedule.";

        } else if (wakeUpConsistency < 80) {

            wakeUpRecommendation =
                "Your wake-up consistency can improve. Try waking up at approximately the same time each day.";

        } else {

            wakeUpRecommendation =
                "Your wake-up consistency is strong. Continue maintaining your current wake-up routine.";

        }


        // =================================================
        // 3. HABIT IMPROVEMENT
        // =================================================

        if (snoozeReduction < 60) {

            habitRecommendation =
                "Try reducing the number of times you snooze your alarm. Place your phone away from your bed if necessary.";

        } else if (snoozeReduction < 80) {

            habitRecommendation =
                "Your snooze habit is improving. Try responding to your first alarm without snoozing.";

        } else {

            habitRecommendation =
                "Excellent snooze control. Continue avoiding unnecessary snoozes.";

        }


        // =================================================
        // 4. PRODUCTIVITY
        // =================================================

        if (challengeAccuracy < 60) {

            productivityRecommendation =
                "Start your day with a simple planned task. A consistent morning routine can help improve productivity.";

        } else if (challengeAccuracy < 80) {

            productivityRecommendation =
                "Your performance is moderate. Try planning one important task immediately after waking up.";

        } else {

            productivityRecommendation =
                "Your performance is strong. Continue your current morning routine and gradually increase your daily goals.";

        }


        // =================================================
        // 5. PERSONALIZED CHALLENGE
        // =================================================

        if (challengeAccuracy < 50) {

            challengeRecommendation =
                "Start with easier wake-up challenges and gradually increase the difficulty.";

        } else if (challengeAccuracy < 80) {

            challengeRecommendation =
                "Try medium-level challenges to improve your response accuracy.";

        } else {

            challengeRecommendation =
                "You perform well on challenges. Try slightly more challenging questions to continue improving.";

        }


        // =================================================
        // RESPONSE
        // =================================================

        return res.json({

            sleepSchedule: {

    bedtime,

    wakeUpTime,

    sleepDuration:
        sleepDuration !== null
            ? Number(
                sleepDuration.toFixed(2)
            )
            : null

},

            success: true,

            userId,

            habitScore:
                Math.round(
                    habitScore * 100
                ) / 100,

            recommendations: {

                sleep:
                    sleepRecommendation,

                wakeUp:
                    wakeUpRecommendation,

                habit:
                    habitRecommendation,

                productivity:
                    productivityRecommendation,

                challenge:
                    challengeRecommendation

            },

            metrics: {

                wakeUpConsistency:
                    Math.round(
                        wakeUpConsistency * 100
                    ) / 100,

                challengeAccuracy:
                    Math.round(
                        challengeAccuracy * 100
                    ) / 100,

                snoozeReduction:
                    Math.round(
                        snoozeReduction * 100
                    ) / 100,

                sleepAdherence:
                    Math.round(
                        sleepAdherence * 100
                    ) / 100

            }

        });


    } catch (error) {

        console.error(
            "❌ Recommendation Engine Error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Failed to generate recommendations",

            error:
                error.message

        });

    }

}


module.exports = {

    getRecommendations

};