const express = require("express");
const pool = require("../config/db");
const bcrypt = require("bcrypt");

const router = express.Router();


// ===============================
// ADMIN TEST
// ===============================
router.get("/test", (req, res) => {
    res.json({
        success: true,
        message: "Admin routes working"
    });
});


// ===============================
// GET ALL USERS
// ===============================
router.get("/users", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                id,
                name,
                email,
                role,
                COALESCE(status, 'active') AS status,
                created_at
            FROM users
            ORDER BY id ASC
        `);

        res.json({
            success: true,
            users: result.rows
        });

    } catch (error) {
        console.error("Admin users error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to load users"
        });
    }
});


// ===============================
// BLOCK / UNBLOCK USER
// ===============================
router.patch("/users/:id/status", async (req, res) => {
    try {
        const userId = Number(req.params.id);
        const { status } = req.body;

        if (!Number.isInteger(userId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID"
            });
        }

        if (!["active", "blocked"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Status must be active or blocked"
            });
        }

        const result = await pool.query(
            `
            UPDATE users
            SET status = $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING id, name, email, role, status
            `,
            [status, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.json({
            success: true,
            message: `User ${status === "blocked" ? "blocked" : "activated"} successfully`,
            user: result.rows[0]
        });

    } catch (error) {
        console.error("Update user status error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to update user status"
        });
    }
});

// ========================================
// PLATFORM ANALYTICS
// ========================================
router.get("/analytics", async (req, res) => {
    try {

        // -----------------------------
        // USER COUNTS
        // -----------------------------
        const usersResult = await pool.query(`
            SELECT
                COUNT(*) FILTER (WHERE role = 'user') AS total_users,
                COUNT(*) FILTER (WHERE role = 'coach') AS total_coaches,
                COUNT(*) FILTER (WHERE status = 'active') AS active_accounts,
                COUNT(*) FILTER (WHERE status = 'blocked') AS blocked_accounts
            FROM users
        `);

        // -----------------------------
        // ALARM ANALYTICS
        // -----------------------------
        const alarmResult = await pool.query(`
            SELECT
                COUNT(*) FILTER (
                    WHERE event_type = 'alarm_ring'
                ) AS total_alarms,

                COUNT(*) FILTER (
                    WHERE event_type = 'wake_verified'
                ) AS successful_wakeups,

                COUNT(*) FILTER (
                    WHERE event_type = 'snooze'
                ) AS total_snoozes,

                ROUND(
                    AVG(
                        CASE
                            WHEN event_type = 'wake_verified'
                            THEN (metadata->>'wakefulnessRating')::numeric
                        END
                    ),
                    2
                ) AS average_wakefulness,

                COUNT(*) FILTER (
                    WHERE event_type = 'alarm_ring'
                    AND event_time >= CURRENT_DATE
                ) AS todays_alarms

            FROM behavioral_events
        `);

        // -----------------------------
        // CHALLENGE / AI ANALYTICS
        // -----------------------------
        const challengeResult = await pool.query(`
            SELECT
                COUNT(*) AS total_challenges,

                COUNT(*) FILTER (
                    WHERE correct = true
                ) AS correct_challenges,

                ROUND(
                    AVG(score)::numeric,
                    2
                ) AS average_score

            FROM challenge_performance
        `);

        const users = usersResult.rows[0];
        const alarms = alarmResult.rows[0];
        const challenges = challengeResult.rows[0];

        const totalAlarms = Number(alarms.total_alarms) || 0;
        const successfulWakeups =
            Number(alarms.successful_wakeups) || 0;

        const totalChallenges =
            Number(challenges.total_challenges) || 0;

        const correctChallenges =
            Number(challenges.correct_challenges) || 0;

        const challengeAccuracy =
            totalChallenges > 0
                ? Math.round(
                    (correctChallenges / totalChallenges) * 100
                )
                : 0;

        const alarmSuccessRate =
            totalAlarms > 0
                ? Math.round(
                    (successfulWakeups / totalAlarms) * 100
                )
                : 0;

        const totalSnoozes =
            Number(alarms.total_snoozes) || 0;

        const snoozeRate =
            totalAlarms > 0
                ? Math.round(
                    (totalSnoozes / totalAlarms) * 100
                )
                : 0;

        const averageWakefulness =
            Number(alarms.average_wakefulness) || 0;

        const averageScore =
            Number(challenges.average_score) || 0;

        // Platform health is based on actual platform behavior.
        const platformHealth =
            Math.round(
                (
                    challengeAccuracy * 0.4 +
                    alarmSuccessRate * 0.4 +
                    Math.min(100, averageWakefulness * 10) * 0.2
                )
            );

        res.json({
            success: true,

            users: {
                totalUsers: Number(users.total_users) || 0,
                totalCoaches: Number(users.total_coaches) || 0,
                activeAccounts: Number(users.active_accounts) || 0,
                blockedAccounts: Number(users.blocked_accounts) || 0
            },

            alarms: {
                totalAlarms,
                todaysAlarms: Number(alarms.todays_alarms) || 0,
                successfulWakeups,
                alarmSuccessRate,
                totalSnoozes,
                snoozeRate,
                averageWakefulness
            },

            challenges: {
                totalChallenges,
                correctChallenges,
                challengeAccuracy,
                averageScore
            },

            platformHealth
        });

    } catch (error) {

        console.error(
            "Platform analytics error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to load platform analytics"
        });
    }
});

// ========================================
// RECOMMENDATION MONITORING
// ========================================
router.get("/recommendations-monitoring", async (req, res) => {

    try {

        // Get all normal users
        const usersResult = await pool.query(`
            SELECT id, name, email
            FROM users
            WHERE role = 'user'
            ORDER BY id ASC
        `);

        const users = usersResult.rows;

        const monitoring = [];

        for (const user of users) {

            // --------------------------------
            // BEHAVIOR DATA
            // --------------------------------
            const behaviorResult = await pool.query(`
                SELECT
                    event_type,
                    event_time,
                    metadata
                FROM behavioral_events
                WHERE user_id = $1
            `, [user.id]);

            const events = behaviorResult.rows;


            const alarms = events.filter(
                e => e.event_type === "alarm_ring"
            ).length;

            const wakeups = events.filter(
                e => e.event_type === "wake_verified"
            ).length;

            const snoozes = events.filter(
                e => e.event_type === "snooze"
            ).length;


            // --------------------------------
            // WAKE-UP CONSISTENCY
            // --------------------------------
            const wakeUpConsistency =
                alarms > 0
                    ? Math.round(
                        (wakeups / alarms) * 100
                    )
                    : 0;


            // --------------------------------
            // CHALLENGE ACCURACY
            // --------------------------------
            let totalQuestions = 0;
            let correctAnswers = 0;

            events
                .filter(
                    e =>
                        e.event_type ===
                        "wake_verified"
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
                    ? Math.round(
                        (
                            correctAnswers /
                            totalQuestions
                        ) * 100
                    )
                    : 0;


            // --------------------------------
            // SNOOZE REDUCTION
            // --------------------------------
            const activeDays =
                new Set(
                    events.map(event =>
                        new Date(
                            event.event_time
                        )
                            .toISOString()
                            .split("T")[0]
                    )
                ).size;


            const averageSnoozes =
                activeDays > 0
                    ? snoozes / activeDays
                    : 0;


            const snoozeReduction =
                Math.max(
                    0,
                    Math.min(
                        100,
                        Math.round(
                            100 -
                            (averageSnoozes * 10)
                        )
                    )
                );


            // --------------------------------
            // SLEEP ADHERENCE
            // --------------------------------
            const scheduledDays =
                activeDays;

            const sleepEvents =
                events.filter(
                    e =>
                        e.event_type ===
                        "wake_verified"
                );

            const sleepDays =
                new Set(
                    sleepEvents.map(event =>
                        new Date(
                            event.event_time
                        )
                            .toISOString()
                            .split("T")[0]
                    )
                ).size;


            const sleepAdherence =
                scheduledDays > 0
                    ? Math.round(
                        Math.min(
                            100,
                            (
                                sleepDays /
                                scheduledDays
                            ) * 100
                        )
                    )
                    : 0;


            // --------------------------------
            // HABIT SCORE
            // --------------------------------
            const habitScore =
                Math.round(
                    (
                        wakeUpConsistency * 0.35 +
                        challengeAccuracy * 0.25 +
                        snoozeReduction * 0.20 +
                        sleepAdherence * 0.20
                    ) * 100
                ) / 100;


            // --------------------------------
            // DETERMINE RECOMMENDATION FOCUS
            // --------------------------------
            const recommendations = [];

            if (sleepAdherence < 80) {
                recommendations.push(
                    "Sleep Improvement"
                );
            }

            if (wakeUpConsistency < 80) {
                recommendations.push(
                    "Wake-up Optimization"
                );
            }

            if (snoozeReduction < 80) {
                recommendations.push(
                    "Habit Improvement"
                );
            }

            if (challengeAccuracy < 80) {
                recommendations.push(
                    "Challenge Difficulty"
                );
            }

            if (
                challengeAccuracy >= 80 &&
                wakeUpConsistency >= 80 &&
                snoozeReduction >= 80 &&
                sleepAdherence >= 80
            ) {
                recommendations.push(
                    "Productivity Optimization"
                );
            }


            // --------------------------------
            // PRIORITY
            // --------------------------------
            let priority = "Low";

            if (habitScore < 50) {
                priority = "High";
            }
            else if (habitScore < 75) {
                priority = "Medium";
            }


            monitoring.push({

                userId: user.id,

                name:
                    user.name || "Unknown",

                email:
                    user.email || "—",

                habitScore,

                wakeUpConsistency,

                challengeAccuracy,

                snoozeReduction,

                sleepAdherence,

                recommendationCount:
                    recommendations.length,

                recommendations,

                priority
            });
        }


        // --------------------------------
        // SUMMARY
        // --------------------------------
        const totalRecommendations =
            monitoring.reduce(
                (sum, user) =>
                    sum + user.recommendationCount,
                0
            );

        const highPriority =
            monitoring.filter(
                user =>
                    user.priority === "High"
            ).length;

        const mediumPriority =
            monitoring.filter(
                user =>
                    user.priority === "Medium"
            ).length;

        const lowPriority =
            monitoring.filter(
                user =>
                    user.priority === "Low"
            ).length;


        res.json({

            success: true,

            summary: {

                usersMonitored:
                    monitoring.length,

                totalRecommendations,

                highPriority,

                mediumPriority,

                lowPriority
            },

            users: monitoring

        });

    }
    catch (error) {

        console.error(
            "Recommendation monitoring error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Failed to load recommendation monitoring"
        });
    }

});

// ========================================
// SYSTEM REPORT
// ========================================
router.get("/system-report", async (req, res) => {

    try {

        // --------------------------------
        // DATABASE CONNECTION
        // --------------------------------
        await pool.query("SELECT 1");

        // --------------------------------
        // USER STATISTICS
        // --------------------------------
        const usersResult = await pool.query(`
            SELECT
                COUNT(*) AS total_users,
                COUNT(*) FILTER (
                    WHERE role = 'user'
                ) AS normal_users,
                COUNT(*) FILTER (
                    WHERE role = 'coach'
                ) AS coaches,
                COUNT(*) FILTER (
                    WHERE role = 'admin'
                ) AS admins,
                COUNT(*) FILTER (
                    WHERE status = 'active'
                ) AS active_users,
                COUNT(*) FILTER (
                    WHERE status = 'blocked'
                ) AS blocked_users
            FROM users
        `);

        // --------------------------------
        // BEHAVIOR EVENT STATISTICS
        // --------------------------------
        const eventsResult = await pool.query(`
            SELECT
                COUNT(*) AS total_events,

                COUNT(*) FILTER (
                    WHERE event_type = 'alarm_ring'
                ) AS alarms,

                COUNT(*) FILTER (
                    WHERE event_type = 'wake_verified'
                ) AS wakeups,

                COUNT(*) FILTER (
                    WHERE event_type = 'snooze'
                ) AS snoozes,

                COUNT(*) FILTER (
                    WHERE event_time >= CURRENT_DATE
                ) AS today_events

            FROM behavioral_events
        `);

        // --------------------------------
        // CHALLENGE STATISTICS
        // --------------------------------
        const challengeResult = await pool.query(`
            SELECT
                COUNT(*) AS total_attempts,
                COUNT(*) FILTER (
                    WHERE correct = true
                ) AS correct_attempts
            FROM challenge_performance
        `);

        // --------------------------------
        // RECENT SYSTEM ACTIVITY
        // --------------------------------
        const activityResult = await pool.query(`
            SELECT
                event_type,
                event_time,
                user_id
            FROM behavioral_events
            ORDER BY event_time DESC
            LIMIT 10
        `);

        // --------------------------------
        // SERVER UPTIME
        // --------------------------------
        const uptimeSeconds =
            Math.floor(process.uptime());

        const uptimeHours =
            Math.floor(uptimeSeconds / 3600);

        const uptimeMinutes =
            Math.floor(
                (uptimeSeconds % 3600) / 60
            );

        // --------------------------------
        // RESPONSE
        // --------------------------------
        res.json({

            success: true,

            generatedAt:
                new Date().toISOString(),

            system: {

                database:
                    "Connected",

                server:
                    "Running",

                uptime:
                    `${uptimeHours}h ${uptimeMinutes}m`

            },

            users: usersResult.rows[0],

            behavior: eventsResult.rows[0],

            challenges:
                challengeResult.rows[0],

            recentActivity:
                activityResult.rows

        });

    }
    catch (error) {

        console.error(
            "System report error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Failed to generate system report"
        });

    }

});

// ========================================
// CREATE USER / COACH
// ========================================
router.post("/users", async (req, res) => {

    try {

        const {
            name,
            email,
            password,
            role
        } = req.body;


        // --------------------------------
        // VALIDATION
        // --------------------------------
        if (!name || !email || !password || !role) {

            return res.status(400).json({
                success: false,
                message: "Name, email, password and role are required"
            });

        }


        if (!["user", "coach"].includes(role)) {

            return res.status(400).json({
                success: false,
                message: "Only user or coach accounts can be created"
            });

        }


        if (password.length < 6) {

            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters"
            });

        }


        // --------------------------------
        // CHECK EMAIL
        // --------------------------------
        const existingUser = await pool.query(
            `
            SELECT id
            FROM users
            WHERE LOWER(email) = LOWER($1)
            `,
            [email.trim()]
        );


        if (existingUser.rows.length > 0) {

            return res.status(409).json({
                success: false,
                message: "An account with this email already exists"
            });

        }


        // --------------------------------
        // HASH PASSWORD
        // --------------------------------
        const passwordHash =
            await bcrypt.hash(password, 10);


        // --------------------------------
        // CREATE ACCOUNT
        // --------------------------------
        const result = await pool.query(
            `
            INSERT INTO users
                (
                    name,
                    email,
                    password_hash,
                    role,
                    provider,
                    status
                )
            VALUES
                ($1, $2, $3, $4, 'local', 'active')
            RETURNING
                id,
                name,
                email,
                role,
                status,
                created_at
            `,
            [
                name.trim(),
                email.trim().toLowerCase(),
                passwordHash,
                role
            ]
        );


        res.status(201).json({

            success: true,

            message:
                `${role === "coach" ? "Coach" : "User"} created successfully`,

            user:
                result.rows[0]

        });

    }
    catch (error) {

        console.error(
            "Create account error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Failed to create account"

        });

    }

});

module.exports = router;