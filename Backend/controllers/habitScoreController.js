const pool = require("../config/db");

// =====================================================
// MODULE 8 — HABIT SCORING ENGINE
// =====================================================

// Convert a value safely to a number
function safeNumber(value, defaultValue = 0) {
    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : defaultValue;
}


// =====================================================
// 1. WAKE-UP CONSISTENCY SCORE — 35%
// =====================================================

function calculateWakeUpConsistency(
    successfulWakeups,
    totalAlarms
) {
    successfulWakeups = safeNumber(successfulWakeups);
    totalAlarms = safeNumber(totalAlarms);

    if (totalAlarms <= 0) {
        return 0;
    }

    return Math.min(
        100,
        (successfulWakeups / totalAlarms) * 100
    );
}


// =====================================================
// 2. CHALLENGE COMPLETION SCORE — 25%
// =====================================================

function calculateChallengeCompletion(
    completedChallenges,
    totalChallenges
) {
    completedChallenges =
        safeNumber(completedChallenges);

    totalChallenges =
        safeNumber(totalChallenges);

    if (totalChallenges <= 0) {
        return 0;
    }

    return Math.min(
        100,
        (completedChallenges / totalChallenges) * 100
    );
}


// =====================================================
// 3. SNOOZE REDUCTION SCORE — 20%
// =====================================================

function calculateSnoozeReduction(
    currentSnoozes,
    baselineSnoozes
) {
    currentSnoozes =
        safeNumber(currentSnoozes);

    baselineSnoozes =
        safeNumber(baselineSnoozes);

    // No historical snooze baseline
    if (baselineSnoozes <= 0) {

        return currentSnoozes === 0
            ? 100
            : 0;
    }

    const reduction =
        ((baselineSnoozes - currentSnoozes)
            / baselineSnoozes) * 100;

    return Math.max(
        0,
        Math.min(100, reduction)
    );
}


// =====================================================
// 4. SLEEP SCHEDULE ADHERENCE — 20%
// =====================================================

function calculateSleepAdherence(
    adheredDays,
    scheduledDays
) {
    adheredDays =
        safeNumber(adheredDays);

    scheduledDays =
        safeNumber(scheduledDays);

    if (scheduledDays <= 0) {
        return 0;
    }

    return Math.min(
        100,
        (adheredDays / scheduledDays) * 100
    );
}


// =====================================================
// 5. WEIGHTED HABIT SCORE
// =====================================================

function calculateHabitScore({
    wakeUpConsistency,
    challengeCompletion,
    snoozeReduction,
    sleepAdherence
}) {

    const score =
        (wakeUpConsistency * 0.35) +
        (challengeCompletion * 0.25) +
        (snoozeReduction * 0.20) +
        (sleepAdherence * 0.20);

    return Math.round(
        Math.max(0, Math.min(100, score))
        * 100
    ) / 100;
}


// =====================================================
// GET HABIT SCORE
// =====================================================

async function getHabitScore(req, res) {

    try {

        const userId =
            Number(req.params.userId);

        if (!userId) {

            return res.status(400).json({
                success: false,
                message: "Invalid user ID"
            });
        }


        // -------------------------------------------------
        // Get historical behavioral analytics
        // -------------------------------------------------

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


        // -------------------------------------------------
        // WAKE-UP SCORE
        // -------------------------------------------------

        const alarmEvents =
            events.filter(
                event =>
                    event.event_type === "alarm_ring"
            );

        const wakeupEvents =
            events.filter(
                event =>
                    event.event_type === "wake_verified"
            );

        const totalAlarms =
            alarmEvents.length;

        const successfulWakeups =
            wakeupEvents.length;

        const wakeUpConsistency =
            calculateWakeUpConsistency(
                successfulWakeups,
                totalAlarms
            );


 // -------------------------------------------------
// CHALLENGE COMPLETION SCORE
// -------------------------------------------------

const wakeVerificationEvents =
    events.filter(
        event =>
            event.event_type === "wake_verified"
    );

let totalChallenges = 0;
let completedChallenges = 0;

wakeVerificationEvents.forEach(event => {

    let metadata = event.metadata || {};

    // PostgreSQL JSON may be returned as a string
    if (typeof metadata === "string") {

        try {
            metadata = JSON.parse(metadata);
        } catch (error) {

            console.error(
                "Invalid event metadata:",
                metadata
            );

            metadata = {};
        }
    }

    const questions =
        safeNumber(
            metadata.totalQuestions
        );

    const correct =
        safeNumber(
            metadata.correctAnswers
        );

    totalChallenges += questions;

    completedChallenges += correct;
});

const challengeCompletion =
    calculateChallengeCompletion(
        completedChallenges,
        totalChallenges
    );

// -------------------------------------------------
// PRODUCTIVITY SCORE
// -------------------------------------------------

let productivityScore = 0;

if (totalChallenges > 0) {

    productivityScore =
        Math.min(
            100,
            (completedChallenges / totalChallenges) * 100
        );
}

productivityScore =
    Math.round(
        productivityScore * 100
    ) / 100;

// -------------------------------------------------
// SNOOZE REDUCTION SCORE
// -------------------------------------------------

const snoozeEvents =
    events.filter(
        event =>
            event.event_type === "snooze"
    );

const currentSnoozes =
    snoozeEvents.length;

// Average snoozes per day

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
        ? currentSnoozes / numberOfDays
        : 0;


// Score based on snooze frequency
//
// 0 snoozes  = 100
// 1 snooze   = 90
// 2 snoozes  = 80
// 3 snoozes  = 70
// etc.

const snoozeReduction =
    Math.max(
        0,
        Math.min(
            100,
            100 - (averageSnoozes * 10)
        )
    );
        // -------------------------------------------------
        // SLEEP SCORE
        // -------------------------------------------------

        /*
         * Sleep adherence will use recorded
         * sleep schedule events when available.
         */

        // -------------------------------------------------
// SLEEP ROUTINE ADHERENCE
// -------------------------------------------------

        // -------------------------------------------------
// SLEEP ROUTINE ADHERENCE
// -------------------------------------------------

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
    calculateSleepAdherence(
        adheredDays,
        scheduledDays
    );

        // -------------------------------------------------
        // FINAL WEIGHTED SCORE
        // -------------------------------------------------

        const habitScore =
            calculateHabitScore({
                wakeUpConsistency,
                challengeCompletion,
                snoozeReduction,
                sleepAdherence
            });


        // -------------------------------------------------
        // RESPONSE
        // -------------------------------------------------
return res.json({

    success: true,

    userId,

    scores: {

        wakeUpConsistency:
            Math.round(
                wakeUpConsistency * 100
            ) / 100,

        challengeCompletion:
            Math.round(
                challengeCompletion * 100
            ) / 100,

        snoozeReduction:
            Math.round(
                snoozeReduction * 100
            ) / 100,

        sleepAdherence:
            Math.round(
                sleepAdherence * 100
            ) / 100,

        productivityScore:
            productivityScore
    },

    weights: {

        wakeUpConsistency: 35,

        challengeCompletion: 25,

        snoozeReduction: 20,

        sleepAdherence: 20
    },

    habitScore,

    rating:
        habitScore >= 90
            ? "Excellent"
            : habitScore >= 75
            ? "Good"
            : habitScore >= 60
            ? "Moderate"
            : "Needs Improvement"
    });

} catch (error) {

    console.error(
        "❌ Habit Score Error:",
        error
    );

    return res.status(500).json({

        success: false,

        message:
            "Failed to calculate habit score",

        error:
            error.message
    });
}
}

module.exports = {

    getHabitScore,

    calculateWakeUpConsistency,

    calculateChallengeCompletion,

    calculateSnoozeReduction,

    calculateSleepAdherence,

    calculateHabitScore
};