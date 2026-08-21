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
// Export
// =====================================================
module.exports = {
    generateChallenge,
    savePerformance,
    analyzePerformance,
    getPersonalizedChallenge,
    getAnalytics
};