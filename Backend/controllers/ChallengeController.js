// =====================================================
// CHALLENGE CONTROLLER
// =====================================================

// Import all challenge generators
const pool = require("../config/db");

const { generateMath } =
    require("../generators/mathGenerator");

const { generateLogic } =
    require("../generators/logicGenerator");

const { generateMemory } =
    require("../generators/memoryGenerator");

const { generateWord } =
    require("../generators/wordGenerator");

const { generatePattern } =
    require("../generators/patternGenerator");

const { generateRiddle } =
    require("../generators/riddleGenerator");

const { generateQuiz } =
    require("../generators/quizGenerator");


// =====================================================
// Store recently generated questions
// =====================================================

// This prevents the same question from being
// returned repeatedly during the current server run.

const recentQuestions = [];

const MAX_HISTORY = 30;


// =====================================================
// Generate Challenge
// =====================================================

async function generateChallenge(req, res) {

    try {

        const {
            challengeType,
            difficulty
        } = req.body;


        // ---------------------------------------------
        // Validate input
        // ---------------------------------------------

        if (!challengeType || !difficulty) {

            return res.status(400).json({

                success: false,

                message:
                    "Challenge type and difficulty are required."

            });
        }


        // ---------------------------------------------
        // Normalize input
        // ---------------------------------------------

        const type =
            challengeType.trim().toLowerCase();

        const level =
            difficulty.trim();


        // ---------------------------------------------
        // Validate difficulty
        // ---------------------------------------------

        const validDifficulties = [

            "Beginner",
            "Easy",
            "Medium",
            "Hard",
            "Expert"

        ];


        if (!validDifficulties.includes(level)) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid difficulty. Use Beginner, Easy, Medium, Hard or Expert."

            });
        }


        // ---------------------------------------------
        // Generate challenge
        // ---------------------------------------------

        let result;

        switch (type) {

            case "math":

                result =
                    generateMath(level);

                break;


            case "logic":

                result =
                    generateLogic(level);

                break;


            case "memory":

                result =
                    generateMemory(level);

                break;


            case "word":

                result =
                    generateWord(level);

                break;


            case "pattern":

                result =
                    generatePattern(level);

                break;


            case "riddle":

                result =
                    generateRiddle(level);

                break;


            case "quiz":

                result =
                    generateQuiz(level);

                break;


            default:

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid challenge type. Use Math, Logic, Memory, Word, Pattern, Riddle or Quiz."

                });

        }


        // ---------------------------------------------
        // Prevent immediate repetition
        // ---------------------------------------------

        const questionKey =
            `${type}|${level}|${result.question}`;


        if (recentQuestions.includes(questionKey)) {

            // Try generating one more time

            switch (type) {

                case "math":
                    result = generateMath(level);
                    break;

                case "logic":
                    result = generateLogic(level);
                    break;

                case "memory":
                    result = generateMemory(level);
                    break;

                case "word":
                    result = generateWord(level);
                    break;

                case "pattern":
                    result = generatePattern(level);
                    break;

                case "riddle":
                    result = generateRiddle(level);
                    break;

                case "quiz":
                    result = generateQuiz(level);
                    break;

            }
        }


        // ---------------------------------------------
        // Save question in history
        // ---------------------------------------------

        const finalQuestionKey =
            `${type}|${level}|${result.question}`;


        recentQuestions.push(finalQuestionKey);


        // Keep only the latest 30 questions

        if (recentQuestions.length > MAX_HISTORY) {

            recentQuestions.shift();

        }


        // ---------------------------------------------
        // Send response
        // ---------------------------------------------

        return res.json({

            success: true,

            challengeType:
                challengeType,

            difficulty:
                difficulty,

            question:
                result.question,

            answer:
                result.answer,

            explanation:
                result.explanation,

            // Quiz only
            ...(result.options && {

                options:
                    result.options

            })

        });


    } catch (error) {

        console.error(
            "Challenge Generation Error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                error.message ||
                "Failed to generate challenge."

        });

    }

}
// =====================================================
// Save Challenge Performance
// =====================================================

async function savePerformance(req, res) {

    try {

        const {
            userId,
            challengeType,
            difficulty,
            correct,
            timeTaken,
            attempts,
            completionStatus,
            score
        } = req.body;


        // Basic validation
        if (
            !challengeType ||
            !difficulty ||
            correct === undefined ||
            !completionStatus
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Required performance data is missing."

            });

        }


        const result = await pool.query(

            `INSERT INTO challenge_performance
            (
                user_id,
                challenge_type,
                difficulty,
                correct,
                time_taken,
                attempts,
                completion_status,
                score
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            RETURNING *`,

            [
                userId || null,
                challengeType,
                difficulty,
                correct,
                timeTaken || 0,
                attempts || 1,
                completionStatus,
                score || 0
            ]

        );


        return res.status(201).json({

            success: true,

            message:
                "Challenge performance saved successfully.",

            performance:
                result.rows[0]

        });


    } catch (error) {

        console.error(
            "Save Performance Error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Failed to save challenge performance."

        });

    }

}

// =====================================================
// CHALLENGE PERFORMANCE ANALYSIS
// =====================================================

async function analyzePerformance(req, res) {

    try {

        const userId = Number(req.params.userId);

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "Valid user ID is required."
            });
        }


        // =====================================================
        // 1. OVERALL SUMMARY
        // =====================================================

        const summaryResult = await pool.query(
            `
            SELECT

                COUNT(*) AS total_challenges,

                COUNT(*) FILTER (
                    WHERE correct = true
                ) AS correct_challenges,

                COUNT(*) FILTER (
                    WHERE correct = false
                ) AS failed_challenges,

                COUNT(*) FILTER (
                    WHERE completion_status = 'completed'
                ) AS completed_challenges,

                COALESCE(
                    ROUND(AVG(time_taken)),
                    0
                ) AS average_time,

                COALESCE(
                    ROUND(AVG(score)),
                    0
                ) AS average_score

            FROM challenge_performance

            WHERE user_id = $1
            `,
            [userId]
        );


        const stats = summaryResult.rows[0];


        const totalChallenges =
            Number(stats.total_challenges);

        const correctChallenges =
            Number(stats.correct_challenges);

        const failedChallenges =
            Number(stats.failed_challenges);

        const completedChallenges =
            Number(stats.completed_challenges);

        const averageTime =
            Number(stats.average_time);

        const averageScore =
            Number(stats.average_score);


        const accuracy =
            totalChallenges > 0
                ? Math.round(
                    (correctChallenges /
                        totalChallenges) * 100
                )
                : 0;


        // =====================================================
        // 2. RECOMMENDED DIFFICULTY
        // =====================================================

        let recommendedDifficulty = "Easy";

        if (totalChallenges < 3) {

            recommendedDifficulty = "Easy";

        }
        else if (accuracy >= 85) {

            recommendedDifficulty = "Medium";

        }
        else if (accuracy >= 60) {

            recommendedDifficulty = "Easy";

        }
        else {

            recommendedDifficulty = "Beginner";

        }


        // =====================================================
        // 3. CHALLENGE TYPE PERFORMANCE
        // =====================================================

        const challengeTypeResult = await pool.query(
            `
            SELECT

                challenge_type,

                COUNT(*) AS total,

                COUNT(*) FILTER (
                    WHERE correct = true
                ) AS correct,

                COUNT(*) FILTER (
                    WHERE correct = false
                ) AS failed

            FROM challenge_performance

            WHERE user_id = $1

            GROUP BY challenge_type

            ORDER BY challenge_type
            `,
            [userId]
        );


        // =====================================================
        // 4. DIFFICULTY DISTRIBUTION
        // =====================================================

        const difficultyResult = await pool.query(
            `
            SELECT

                difficulty,

                COUNT(*) AS total

            FROM challenge_performance

            WHERE user_id = $1

            GROUP BY difficulty

            ORDER BY
                CASE difficulty
                    WHEN 'Beginner' THEN 1
                    WHEN 'Easy' THEN 2
                    WHEN 'Medium' THEN 3
                    WHEN 'Hard' THEN 4
                    WHEN 'Expert' THEN 5
                    ELSE 6
                END
            `,
            [userId]
        );


        // =====================================================
        // 5. PERFORMANCE TREND
        // =====================================================

        const trendResult = await pool.query(
            `
            SELECT

                DATE(created_at) AS date,

                COUNT(*) AS total,

                COUNT(*) FILTER (
                    WHERE correct = true
                ) AS correct,

                COALESCE(
                    ROUND(AVG(score)),
                    0
                ) AS average_score

            FROM challenge_performance

            WHERE user_id = $1

            GROUP BY DATE(created_at)

            ORDER BY DATE(created_at)
            `,
            [userId]
        );


        // =====================================================
        // 6. RECENT HISTORY
        // =====================================================

        const historyResult = await pool.query(
            `
            SELECT

                challenge_type,
                difficulty,
                correct,
                time_taken,
                attempts,
                completion_status,
                score,
                created_at

            FROM challenge_performance

            WHERE user_id = $1

            ORDER BY created_at DESC

            LIMIT 10
            `,
            [userId]
        );


        // =====================================================
        // 7. SEND COMPLETE ANALYTICS RESPONSE
        // =====================================================

        return res.json({

            success: true,

            userId: userId,

            analysis: {

                totalChallenges,
                correctChallenges,
                failedChallenges,
                completedChallenges,
                accuracy,
                averageTime,
                averageScore,
                recommendedDifficulty

            },

            challengeTypes:
                challengeTypeResult.rows,

            difficulties:
                difficultyResult.rows,

            trend:
                trendResult.rows,

            recentHistory:
                historyResult.rows

        });


    } catch (error) {

        console.error(
            "Performance Analysis Error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                error.message ||
                "Failed to analyze performance."

        });

    }

}

// =====================================================
// PERSONALIZED CHALLENGE SELECTION
// =====================================================

async function getPersonalizedChallenge(req, res) {

    try {

        const userId = Number(req.params.userId);

        let challengeType =
    req.query.challengeType;


        if (!userId) {

            return res.status(400).json({
                success: false,
                message: "Valid user ID is required."
            });

        }


        // ---------------------------------------------
        // Get user's performance
        // ---------------------------------------------

        const result = await pool.query(
            `
            SELECT
                COUNT(*) AS total_challenges,

                COUNT(*) FILTER (
                    WHERE correct = true
                ) AS correct_challenges,

                COALESCE(
                    ROUND(AVG(time_taken)),
                    0
                ) AS average_time,

                COALESCE(
                    ROUND(AVG(score)),
                    0
                ) AS average_score,

                COALESCE(
                    SUM(attempts),
                    0
                ) AS total_attempts

            FROM challenge_performance

            WHERE user_id = $1
            `,
            [userId]
        );


        const stats = result.rows[0];


        const totalChallenges =
            Number(stats.total_challenges);

        const correctChallenges =
            Number(stats.correct_challenges);

        const averageTime =
            Number(stats.average_time);

        const averageScore =
            Number(stats.average_score);

        const totalAttempts =
            Number(stats.total_attempts);

        // ---------------------------------------------
// Learning Pattern Analysis
// ---------------------------------------------

const patternResult = await pool.query(
    `
    SELECT
        challenge_type,
        COUNT(*) AS total,
        COUNT(*) FILTER (
            WHERE correct = true
        ) AS correct,
        COALESCE(
            ROUND(AVG(time_taken)),
            0
        ) AS average_time,
        COALESCE(
            ROUND(AVG(score)),
            0
        ) AS average_score

    FROM challenge_performance

    WHERE user_id = $1

    GROUP BY challenge_type

    ORDER BY challenge_type
    `,
    [userId]
);


const learningPatterns =
    patternResult.rows.map(item => {

        const total =
            Number(item.total);

        const correct =
            Number(item.correct);

        const typeAccuracy =
            total > 0
                ? Math.round(
                    (correct / total) * 100
                )
                : 0;


        let performanceLevel = "Needs Improvement";


        if (typeAccuracy >= 85) {

            performanceLevel = "Strong";

        }
        else if (typeAccuracy >= 65) {

            performanceLevel = "Moderate";

        }


        return {

            challengeType:
                item.challenge_type,

            totalChallenges:
                total,

            correctChallenges:
                correct,

            accuracy:
                typeAccuracy,

            averageTime:
                Number(item.average_time),

            averageScore:
                Number(item.average_score),

            performance:
                performanceLevel

        };

    });


        // ---------------------------------------------
        // Calculate accuracy
        // ---------------------------------------------

        const accuracy =
            totalChallenges > 0
                ? Math.round(
                    (correctChallenges /
                        totalChallenges) * 100
                )
                : 0;


        // ---------------------------------------------
        // Select difficulty
        // ---------------------------------------------
// ---------------------------------------------
// ADAPTIVE DIFFICULTY ENGINE
// ---------------------------------------------

let difficulty = "Beginner";


// ---------------------------------------------
// 1. New user
// ---------------------------------------------

if (totalChallenges < 3) {

    difficulty = "Beginner";

}


// ---------------------------------------------
// 2. Very low performance
// ---------------------------------------------

else if (
    accuracy < 50 ||
    averageScore < 50
) {

    difficulty = "Beginner";

}


// ---------------------------------------------
// 3. Low / developing performance
// ---------------------------------------------

else if (
    accuracy < 65 ||
    averageScore < 65
) {

    difficulty = "Easy";

}


// ---------------------------------------------
// 4. Good performance
// ---------------------------------------------

else if (
    accuracy < 80 ||
    averageScore < 75
) {

    difficulty = "Medium";

}


// ---------------------------------------------
// 5. Very good performance
// ---------------------------------------------

else if (
    accuracy < 90 ||
    averageScore < 85
) {

    difficulty = "Hard";

}


// ---------------------------------------------
// 6. Excellent and consistent performance
// ---------------------------------------------

else {

    difficulty = "Expert";

}
// ---------------------------------------------
// Engagement Optimization
// Select challenge type adaptively
// ---------------------------------------------

if (!challengeType) {

    const weakPatterns =
        learningPatterns
            .filter(
                item => item.accuracy < 80
            )
            .sort(
                (a, b) =>
                    a.accuracy - b.accuracy
            );

    if (weakPatterns.length > 0) {

        challengeType =
            weakPatterns[0].challengeType;

    } else {

        const availableTypes =
            learningPatterns.map(
                item => item.challengeType
            );

        if (availableTypes.length > 0) {

            const randomIndex =
                Math.floor(
                    Math.random() *
                    availableTypes.length
                );

            challengeType =
                availableTypes[randomIndex];

        } else {

            challengeType = "math";

        }

    }

}
        // ---------------------------------------------
        // Generate challenge
        // ---------------------------------------------

        const type =
            challengeType.trim().toLowerCase();


        let challenge;


        switch (type) {

            case "math":
                challenge = generateMath(difficulty);
                break;

            case "logic":
                challenge = generateLogic(difficulty);
                break;

            case "memory":
                challenge = generateMemory(difficulty);
                break;

            case "word":
                challenge = generateWord(difficulty);
                break;

            case "pattern":
                challenge = generatePattern(difficulty);
                break;

            case "riddle":
                challenge = generateRiddle(difficulty);
                break;

            case "quiz":
                challenge = generateQuiz(difficulty);
                break;

            default:

                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid challenge type."
                });
        }


        // ---------------------------------------------
        // Return personalized challenge
        // ---------------------------------------------

        return res.json({

            success: true,

            userId,

            challengeType: type,

            difficulty,

            personalization: {

                totalChallenges,

                accuracy,

                averageTime,

                averageScore,

                totalAttempts,

                learningPatterns

            },
            

            question: challenge.question,

            answer: challenge.answer,

            explanation: challenge.explanation,

            ...(challenge.options && {
                options: challenge.options
            })

        });


    } catch (error) {

        console.error(
            "Personalized Challenge Error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                error.message ||
                "Failed to generate personalized challenge."

        });

    }

}

// =====================================================
// VISUAL ANALYTICS
// =====================================================

async function getAnalytics(req, res) {

    try {

        const userId = Number(req.params.userId);

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "Valid user ID is required."
            });
        }

        // Overall statistics
        const summaryResult = await pool.query(`
            SELECT
                COUNT(*) AS total_challenges,

                COUNT(*) FILTER (
                    WHERE correct = true
                ) AS correct_challenges,

                COUNT(*) FILTER (
                    WHERE correct = false
                ) AS failed_challenges,

                COUNT(*) FILTER (
                    WHERE completion_status = 'completed'
                ) AS completed_challenges,

                COALESCE(
                    ROUND(AVG(time_taken)),
                    0
                ) AS average_time,

                COALESCE(
                    ROUND(AVG(score)),
                    0
                ) AS average_score

            FROM challenge_performance

            WHERE user_id = $1
        `, [userId]);

        const summary = summaryResult.rows[0];

        const totalChallenges =
            Number(summary.total_challenges);

        const correctChallenges =
            Number(summary.correct_challenges);

        const accuracy =
            totalChallenges > 0
                ? Math.round(
                    (correctChallenges / totalChallenges) * 100
                )
                : 0;


        // Performance by challenge type
        const typeResult = await pool.query(`
            SELECT
                challenge_type,
                COUNT(*) AS total,
                COUNT(*) FILTER (
                    WHERE correct = true
                ) AS correct,
                COUNT(*) FILTER (
                    WHERE correct = false
                ) AS failed

            FROM challenge_performance

            WHERE user_id = $1

            GROUP BY challenge_type

            ORDER BY challenge_type
        `, [userId]);


        // Difficulty distribution
        const difficultyResult = await pool.query(`
            SELECT
                difficulty,
                COUNT(*) AS total

            FROM challenge_performance

            WHERE user_id = $1

            GROUP BY difficulty

            ORDER BY
                CASE difficulty
                    WHEN 'Beginner' THEN 1
                    WHEN 'Easy' THEN 2
                    WHEN 'Medium' THEN 3
                    WHEN 'Hard' THEN 4
                    WHEN 'Expert' THEN 5
                    ELSE 6
                END
        `, [userId]);


        // Performance over time
        const trendResult = await pool.query(`
            SELECT
                DATE(created_at) AS date,
                COUNT(*) AS total,
                COUNT(*) FILTER (
                    WHERE correct = true
                ) AS correct,
                COALESCE(
                    ROUND(AVG(score)),
                    0
                ) AS average_score

            FROM challenge_performance

            WHERE user_id = $1

            GROUP BY DATE(created_at)

            ORDER BY DATE(created_at)
        `, [userId]);


        // Recent challenge history
        const historyResult = await pool.query(`
            SELECT
                challenge_type,
                difficulty,
                correct,
                time_taken,
                attempts,
                completion_status,
                score,
                created_at

            FROM challenge_performance

            WHERE user_id = $1

            ORDER BY created_at DESC

            LIMIT 10
        `, [userId]);


        return res.json({

            success: true,

            userId: userId,

            summary: {

                totalChallenges,

                correctChallenges,

                failedChallenges:
                    Number(summary.failed_challenges),

                completedChallenges:
                    Number(summary.completed_challenges),

                accuracy,

                averageTime:
                    Number(summary.average_time),

                averageScore:
                    Number(summary.average_score)

            },

            challengeTypes:
                typeResult.rows,

            difficulties:
                difficultyResult.rows,

            trend:
                trendResult.rows,

            recentHistory:
                historyResult.rows

        });

    } catch (error) {

        console.error(
            "Visual Analytics Error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                error.message ||
                "Failed to load visual analytics."

        });

    }

}
// =====================================================
// SAVE WAKE-UP VERIFICATION
// =====================================================

async function saveWakeUpVerification(req, res) {

    try {

        const {
            userId,
            alarmId,
            wakefulnessRating,
            totalQuestions,
            correctAnswers,
            wrongAnswers,
            accuracy,
            verificationTime,
            verificationStatus
        } = req.body;


        // ---------------------------------------------
        // Validate required data
        // ---------------------------------------------

        if (!userId) {

            return res.status(400).json({

                success: false,

                message:
                    "User ID is required."

            });

        }


        // ---------------------------------------------
        // Insert verification record
        // ---------------------------------------------

        const result = await pool.query(
    `
    INSERT INTO wake_up_verification (

        user_id,
        alarm_id,
        wakefulness_rating,
        total_questions,
        correct_answers,
        wrong_answers,
        accuracy,
        verification_time,
        verification_status,
        verified_at

    )

    VALUES (

        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9::varchar,
        CASE
            WHEN $9::varchar = 'passed'
            THEN CURRENT_TIMESTAMP
            ELSE NULL
        END

    )

    RETURNING *
    `,
    [
        userId,
        alarmId || null,
        wakefulnessRating || 0,
        totalQuestions || 0,
        correctAnswers || 0,
        wrongAnswers || 0,
        accuracy || 0,
        verificationTime || 0,
        verificationStatus || "failed"
    ]
);

        // ---------------------------------------------
        // Success response
        // ---------------------------------------------

        return res.status(201).json({

            success: true,

            message:
                "Wake-up verification saved successfully.",

            verification:
                result.rows[0]

        });


    } catch (error) {

        console.error(
            "Wake-up verification save error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                error.message ||
                "Failed to save wake-up verification."

        });

    }

}

// =====================================================
// SAVE BEHAVIORAL EVENT
// =====================================================
// =====================================================
// BEHAVIORAL ANALYTICS ENGINE
// =====================================================

async function getBehaviorAnalytics(req, res) {

    try {

        const userId = Number(req.params.userId);

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID."
            });
        }


        // =================================================
        // 1. SNOOZE PATTERNS
        // =================================================

        const snoozeResult = await pool.query(
            `
            SELECT

                COUNT(*) FILTER (
                    WHERE event_type = 'snooze'
                ) AS total_snoozes,

                COUNT(*) FILTER (
                    WHERE event_type = 'snooze_attempt_blocked'
                ) AS blocked_snoozes

            FROM behavioral_events

            WHERE user_id = $1
            `,
            [userId]
        );


        // =================================================
        // 2. WAKE-UP BEHAVIOR
        // =================================================

        const wakeResult = await pool.query(`
    SELECT
        COUNT(*) FILTER (
            WHERE event_type = 'alarm_ring'
        ) AS total_alarms,

        COUNT(*) FILTER (
            WHERE event_type = 'wake_verified'
        ) AS successful_wakeups,

        COUNT(*) FILTER (
            WHERE event_type = 'alarm_dismiss'
        ) AS dismissed_alarms,

        COUNT(*) FILTER (
            WHERE event_type = 'verification_failed'
        ) AS failed_verifications,

        ROUND(
            AVG(
                CASE
                    WHEN event_type = 'wake_verified'
                    THEN (metadata->>'wakefulnessRating')::numeric
                END
            ), 2
        ) AS average_wakefulness,

        ROUND(
            AVG(
                CASE
                    WHEN event_type = 'wake_verified'
                    THEN (metadata->>'verificationTime')::numeric
                END
            ), 2
        ) AS average_verification_time

    FROM behavioral_events
    WHERE user_id = $1
`, [userId]);


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
    WHERE user_id = $1
`, [userId]);

        // =================================================
        // 3. HABIT CONSISTENCY
        // =================================================

        const consistencyResult = await pool.query(
            `
            SELECT

                COUNT(
                    DISTINCT DATE(event_time)
                ) FILTER (
                    WHERE event_type = 'alarm_ring'
                ) AS alarm_days,

                COUNT(
                    DISTINCT DATE(event_time)
                ) FILTER (
                    WHERE event_type = 'wake_verified'
                ) AS successful_days

            FROM behavioral_events

            WHERE user_id = $1
            `,
            [userId]
        );


        // =================================================
        // 4. WAKE / SLEEP PATTERN
        // =================================================

        const sleepResult = await pool.query(
            `
            SELECT

                COUNT(*) AS recorded_days,

                ROUND(
                    AVG(
                        (
                            split_part(
                                metadata->>'alarmTime',
                                ':',
                                1
                            )::numeric * 60
                            +
                            split_part(
                                metadata->>'alarmTime',
                                ':',
                                2
                            )::numeric
                        )
                    ),
                    2
                ) AS average_alarm_minutes,

                ROUND(
                    STDDEV(
                        (
                            split_part(
                                metadata->>'alarmTime',
                                ':',
                                1
                            )::numeric * 60
                            +
                            split_part(
                                metadata->>'alarmTime',
                                ':',
                                2
                            )::numeric
                        )
                    ),
                    2
                ) AS alarm_time_variation

            FROM behavioral_events

            WHERE user_id = $1

            AND event_type = 'alarm_ring'

            AND metadata->>'alarmTime' IS NOT NULL
            `,
            [userId]
        );


        // =================================================
        // 5. PRODUCTIVITY CORRELATION
        // =================================================

        const productivityResult = await pool.query(
            `
            WITH daily_snoozes AS (

                SELECT
                    DATE(event_time) AS day,
                    COUNT(*) AS snooze_count

                FROM behavioral_events

                WHERE user_id = $1

                AND event_type = 'snooze'

                GROUP BY DATE(event_time)
            ),

            daily_performance AS (

                SELECT
                    DATE(created_at) AS day,

                    AVG(score) AS average_score,

                    AVG(
                        CASE
                            WHEN correct = true
                            THEN 100
                            ELSE 0
                        END
                    ) AS accuracy

                FROM challenge_performance

                WHERE user_id = $1

                GROUP BY DATE(created_at)
            )

            SELECT

                COUNT(*) AS comparable_days,

                ROUND(
                    CORR(
                        ds.snooze_count,
                        dp.average_score
                    )::numeric,
                    2
                ) AS snooze_score_correlation,

                ROUND(
                    AVG(dp.average_score)::numeric,
                    2
                ) AS average_cognitive_score,

                ROUND(
                    AVG(dp.accuracy)::numeric,
                    2
                ) AS average_cognitive_accuracy

            FROM daily_snoozes ds

            INNER JOIN daily_performance dp
                ON ds.day = dp.day
            `,
            [userId]
        );


        // =================================================
        // EXTRACT RESULTS
        // =================================================

        const snooze = snoozeResult.rows[0],
      wake = wakeResult.rows[0],
      challenge = challengeResult.rows[0],
      consistency = consistencyResult.rows[0],
      sleep = sleepResult.rows[0],
      productivity = productivityResult.rows[0];

        // =================================================
        // HABIT CONSISTENCY %
        // =================================================

        const alarmDays =
            Number(consistency.alarm_days) || 0;

        const successfulDays =
            Number(consistency.successful_days) || 0;

        const habitConsistency =
            alarmDays > 0
                ? Math.round(
                    (successfulDays / alarmDays) * 100
                )
                : 0;


        // =================================================
        // FORMAT AVERAGE ALARM TIME
        // =================================================

        let averageAlarmTime = null;

        if (
            sleep.average_alarm_minutes !== null
        ) {

            const totalMinutes =
                Math.round(
                    Number(
                        sleep.average_alarm_minutes
                    )
                );

            const hours =
                Math.floor(totalMinutes / 60) % 24;

            const minutes =
                totalMinutes % 60;

            averageAlarmTime =
                `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
        }


        // =================================================
        // PRODUCTIVITY CORRELATION
        // =================================================

        const correlation =
            productivity.snooze_score_correlation !== null
                ? Number(
                    productivity.snooze_score_correlation
                )
                : null;


        // =================================================
        // FINAL RESPONSE
        // =================================================

        return res.json({

            success: true,

            userId: userId,


            // ---------------------------------------------
            // SNOOZE PATTERNS
            // ---------------------------------------------

            snoozePatterns: {

                totalSnoozes:
                    Number(
                        snooze.total_snoozes
                    ) || 0,

                blockedSnoozeAttempts:
                    Number(
                        snooze.blocked_snoozes
                    ) || 0
            },


            // ---------------------------------------------
            // WAKE-UP BEHAVIOR
            // ---------------------------------------------

        wakeUpBehavior: {
    totalAlarms: Number(wake.total_alarms) || 0,
    successfulWakeups: Number(wake.successful_wakeups) || 0,
    dismissedAlarms: Number(wake.dismissed_alarms) || 0,
    failedVerifications: Number(wake.failed_verifications) || 0,
    averageWakefulness: Number(wake.average_wakefulness) || 0,
    averageVerificationTime: Number(wake.average_verification_time) || 0
},

challengePerformance: {
    totalChallenges: Number(challenge.total_challenges) || 0,

    accuracy:
        Number(challenge.total_challenges) > 0
            ? Math.round(
                Number(challenge.correct_challenges) /
                Number(challenge.total_challenges) *
                100
            )
            : 0,

    averageScore:
        Number(challenge.average_score) || 0
},


            // ---------------------------------------------
            // HABIT CONSISTENCY
            // ---------------------------------------------

            habitConsistency: {

                alarmDays:
                    alarmDays,

                successfulDays:
                    successfulDays,

                consistency:
                    habitConsistency
            },


            // ---------------------------------------------
            // SLEEP / WAKE PATTERNS
            // ---------------------------------------------

            sleepPatterns: {

                recordedDays:
                    Number(
                        sleep.recorded_days
                    ) || 0,

                averageAlarmTime:
                    averageAlarmTime,

                alarmTimeVariationMinutes:
                    Number(
                        sleep.alarm_time_variation
                    ) || 0
            },


            // ---------------------------------------------
            // PRODUCTIVITY CORRELATION
            // ---------------------------------------------

            productivityCorrelation: {

                comparableDays:
                    Number(
                        productivity.comparable_days
                    ) || 0,

                snoozeScoreCorrelation:
                    correlation,

                averageCognitiveScore:
                    Number(
                        productivity.average_cognitive_score
                    ) || 0,

                averageCognitiveAccuracy:
                    Number(
                        productivity.average_cognitive_accuracy
                    ) || 0,

                interpretation:
                    correlation === null
                        ? "Not enough snooze and performance data yet."
                        : correlation < -0.3
                            ? "Higher snoozing is associated with lower cognitive performance."
                            : correlation > 0.3
                                ? "Higher snoozing is associated with higher cognitive performance."
                                : "No strong relationship detected between snoozing and cognitive performance."
            }

        });

    } catch (error) {

        console.error(
            "Behavior Analytics Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to calculate behavioral analytics."
        });
    }
}
// =====================================================
// SAVE BEHAVIORAL EVENT
// =====================================================

async function saveBehaviorEvent(req, res) {

    try {

        const {
            userId,
            alarmId,
            eventType,
            metadata
        } = req.body;


        // Validate required fields
        if (!userId || !eventType) {

            return res.status(400).json({
                success: false,
                message:
                    "userId and eventType are required."
            });
        }


        const result = await pool.query(
            `
            INSERT INTO behavioral_events
                (
                    user_id,
                    alarm_id,
                    event_type,
                    metadata
                )
            VALUES
                ($1, $2, $3, $4)
            RETURNING *
            `,
            [
                Number(userId),
                alarmId
                    ? String(alarmId)
                    : null,
                eventType,
                metadata || null
            ]
        );


        return res.status(201).json({

            success: true,

            event:
                result.rows[0]

        });


    } catch (error) {

        console.error(
            "Save Behavior Event Error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Failed to save behavioral event."

        });

    }
}

// =====================================================
// BEHAVIORAL ANALYTICS HISTORY
// =====================================================

async function getBehaviorHistory(req, res) {

    try {

        const userId = Number(req.params.userId);

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID."
            });
        }

        // =================================================
        // DAILY BEHAVIOR DATA
        // =================================================

        const behaviorResult = await pool.query(`
            SELECT
                TO_CHAR(event_time, 'YYYY-MM-DD') AS day,

                COUNT(*) FILTER (
                    WHERE event_type = 'alarm_ring'
                ) AS total_alarms,

                COUNT(*) FILTER (
                    WHERE event_type = 'snooze'
                ) AS snoozes,

                COUNT(*) FILTER (
                    WHERE event_type = 'wake_verified'
                ) AS successful_wakeups,

                COUNT(*) FILTER (
                    WHERE event_type = 'alarm_dismiss'
                ) AS dismissed_alarms,

                ROUND(
                    AVG(
                        CASE
                            WHEN event_type = 'wake_verified'
                            THEN (metadata->>'wakefulnessRating')::numeric
                        END
                    ),
                    2
                ) AS average_wakefulness,

                ROUND(
                    AVG(
                        CASE
                            WHEN event_type = 'alarm_ring'
                            AND metadata->>'alarmTime' IS NOT NULL
                            THEN
                                split_part(
                                    metadata->>'alarmTime',
                                    ':',
                                    1
                                )::numeric * 60
                                +
                                split_part(
                                    metadata->>'alarmTime',
                                    ':',
                                    2
                                )::numeric
                        END
                    ),
                    2
                ) AS average_alarm_minutes

            FROM behavioral_events

            WHERE user_id = $1

            GROUP BY TO_CHAR(event_time, 'YYYY-MM-DD')

            ORDER BY TO_CHAR(event_time, 'YYYY-MM-DD')
        `, [userId]);


        // =================================================
        // DAILY CHALLENGE PERFORMANCE
        // =================================================

        const challengeResult = await pool.query(`
            SELECT
                TO_CHAR(created_at, 'YYYY-MM-DD') AS day,

                COUNT(*) AS total_challenges,

                COUNT(*) FILTER (
                    WHERE correct = true
                ) AS correct_challenges,

                ROUND(
                    AVG(score)::numeric,
                    2
                ) AS average_score

            FROM challenge_performance

            WHERE user_id = $1

            GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')

            ORDER BY TO_CHAR(created_at, 'YYYY-MM-DD')
        `, [userId]);


        // =================================================
        // CREATE MAPS
        // =================================================

        const behaviorMap = new Map();

        behaviorResult.rows.forEach(row => {
            behaviorMap.set(String(row.day), row);
        });


        const challengeMap = new Map();

        challengeResult.rows.forEach(row => {
            challengeMap.set(String(row.day), row);
        });


        // =================================================
        // COMBINE ALL DAYS
        // =================================================

        const allDays = new Set([
            ...behaviorMap.keys(),
            ...challengeMap.keys()
        ]);


        const history = Array.from(allDays)
            .sort()
            .map(day => {

                const behavior =
                    behaviorMap.get(day) || {};

                const challenge =
                    challengeMap.get(day) || {};


                const totalAlarms =
                    Number(behavior.total_alarms) || 0;

                const successfulWakeups =
                    Number(behavior.successful_wakeups) || 0;

                const dismissedAlarms =
                    Number(behavior.dismissed_alarms) || 0;

                const totalChallenges =
                    Number(challenge.total_challenges) || 0;

                const correctChallenges =
                    Number(challenge.correct_challenges) || 0;


                const wakeUpSuccess =
                    totalAlarms > 0
                        ? Math.round(
                            successfulWakeups /
                            totalAlarms *
                            100
                        )
                        : null;


                const alarmSuccess =
                    totalAlarms > 0
                        ? Math.round(
                            dismissedAlarms /
                            totalAlarms *
                            100
                        )
                        : null;


                const challengeAccuracy =
                    totalChallenges > 0
                        ? Math.round(
                            correctChallenges /
                            totalChallenges *
                            100
                        )
                        : null;


                return {

                    date: day,

                    snoozes:
                        Number(behavior.snoozes) || 0,

                    totalAlarms,

                    successfulWakeups,

                    dismissedAlarms,

                    wakeUpSuccess,

                    alarmSuccess,

                    averageWakefulness:
                        Number(
                            behavior.average_wakefulness
                        ) || 0,

                    averageAlarmMinutes:
                        behavior.average_alarm_minutes !== null &&
                        behavior.average_alarm_minutes !== undefined
                            ? Number(
                                behavior.average_alarm_minutes
                            )
                            : null,

                    totalChallenges,

                    correctChallenges,

                    challengeAccuracy,

                    averageScore:
                        challenge.average_score !== undefined
                            ? Number(
                                challenge.average_score
                            )
                            : null

                };

            });


        // =================================================
        // SEND HISTORY
        // =================================================

        return res.json({

            success: true,

            userId,

            history

        });


    } catch (error) {

        console.error(
            "Behavior History Error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Failed to load behavioral analytics history."

        });

    }

}

// =====================================================
// Export
// =====================================================
module.exports = {
    generateChallenge,
    savePerformance,
    analyzePerformance,
    getPersonalizedChallenge,
    getAnalytics,
    saveWakeUpVerification,
    saveBehaviorEvent,
    getBehaviorAnalytics,
    getBehaviorHistory
};