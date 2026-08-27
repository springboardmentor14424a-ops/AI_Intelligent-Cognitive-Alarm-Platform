import { Request, Response } from 'express';
import { generateChallenge, ChallengeType, ChallengeDifficulty } from '../services/challengeGenerator.service.js';
import { isDbConnected, db } from '../db/index.js';
import { challenges } from '../db/schema/challenges.js';
import { challengeAttempts } from '../db/schema/challengeAttempts.js';
import { updateWakeUpSession } from '../services/wakeUpVerification.service.js';
import { eq, desc } from 'drizzle-orm';

// In-memory fallback challenge attempts store
interface InMemoryAttempt {
  id: string;
  userId: string;
  challengeId: string | null;
  answer: string;
  isCorrect: boolean;
  timeTaken: number;
  difficulty: string;
  challengeType: string;
  completedAt: string;
}

const inMemoryAttempts: InMemoryAttempt[] = [];

// Seed challenge pool stored in memory
const staticChallengePool: any[] = [
  {
    id: 'static_1',
    challengeType: 'math',
    difficulty: 'medium',
    question: 'Solve: 14 × 6 + 18',
    options: JSON.stringify(['102', '96', '108', '112']),
    correctAnswer: '102',
    explanation: '14 × 6 = 84. 84 + 18 = 102.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'static_2',
    challengeType: 'logic',
    difficulty: 'easy',
    question: 'Complete sequence: 3, 6, 12, 24, [?]',
    options: JSON.stringify(['48', '36', '42', '50']),
    correctAnswer: '48',
    explanation: 'Multiply preceding term by 2.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'static_3',
    challengeType: 'riddle',
    difficulty: 'easy',
    question: 'I have hands but cannot clap. What am I?',
    options: JSON.stringify(['A Clock / Alarm', 'A Mirror', 'A Bell', 'A Book']),
    correctAnswer: 'A Clock / Alarm',
    explanation: 'A clock has hands to indicate time.',
    createdAt: new Date().toISOString(),
  },
];

// POST /challenges
export const createChallenge = async (req: Request, res: Response): Promise<void> => {
  try {
    const { challengeType, difficulty, question, options, correctAnswer, explanation } = req.body;

    if (!challengeType || !question || !correctAnswer) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: challengeType, question, correctAnswer are required',
      });
      return;
    }

    const optionsJson = Array.isArray(options) ? JSON.stringify(options) : options || '[]';

    const newChallenge = {
      id: `ch_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      challengeType,
      difficulty: difficulty || 'medium',
      question,
      options: optionsJson,
      correctAnswer,
      explanation: explanation || '',
      createdAt: new Date().toISOString(),
    };

    if (await isDbConnected()) {
      try {
        const [inserted] = await db
          .insert(challenges)
          .values({
            challengeType,
            difficulty: difficulty || 'medium',
            question,
            options: optionsJson,
            correctAnswer,
            explanation: explanation || '',
          })
          .returning();
        if (inserted) {
          res.status(201).json({
            success: true,
            message: 'Challenge created successfully',
            data: inserted,
          });
          return;
        }
      } catch (err) {
        console.warn('⚠️ DB insert error for challenge, returning in-memory:', err);
      }
    }

    staticChallengePool.unshift(newChallenge);
    res.status(201).json({
      success: true,
      message: 'Challenge created successfully (In-Memory Fallback)',
      data: newChallenge,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error while creating challenge',
    });
  }
};

// GET /challenges
export const getChallenges = async (req: Request, res: Response): Promise<void> => {
  try {
    const { challenge_type, difficulty } = req.query;

    if (await isDbConnected()) {
      try {
        let query = db.select().from(challenges);
        const results = await query;
        let filtered = results;
        if (challenge_type) {
          filtered = filtered.filter(
            (c) => c.challengeType.toLowerCase() === (challenge_type as string).toLowerCase()
          );
        }
        if (difficulty) {
          filtered = filtered.filter(
            (c) => c.difficulty.toLowerCase() === (difficulty as string).toLowerCase()
          );
        }
        res.status(200).json({
          success: true,
          message: 'Challenges retrieved successfully',
          data: filtered.map((c) => ({
            ...c,
            options: typeof c.options === 'string' ? JSON.parse(c.options) : c.options,
          })),
        });
        return;
      } catch (err) {
        console.warn('⚠️ DB get challenges error, fallback to static pool:', err);
      }
    }

    let filtered = staticChallengePool;
    if (challenge_type) {
      filtered = filtered.filter(
        (c) => c.challengeType.toLowerCase() === (challenge_type as string).toLowerCase()
      );
    }
    if (difficulty) {
      filtered = filtered.filter(
        (c) => c.difficulty.toLowerCase() === (difficulty as string).toLowerCase()
      );
    }

    res.status(200).json({
      success: true,
      message: 'Challenges retrieved successfully (Fallback Pool)',
      data: filtered.map((c) => ({
        ...c,
        options: typeof c.options === 'string' ? JSON.parse(c.options) : c.options,
      })),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error while fetching challenges',
    });
  }
};

// GET /challenges/:id
export const getChallengeById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (await isDbConnected()) {
      try {
        const rows = await db.select().from(challenges).where(eq(challenges.id, id));
        if (rows.length > 0) {
          const item = rows[0];
          res.status(200).json({
            success: true,
            message: 'Challenge retrieved successfully',
            data: {
              ...item,
              options: typeof item.options === 'string' ? JSON.parse(item.options) : item.options,
            },
          });
          return;
        }
      } catch (err) {
        console.warn('⚠️ DB get challenge by ID error:', err);
      }
    }

    const found = staticChallengePool.find((c) => c.id === id);
    if (found) {
      res.status(200).json({
        success: true,
        message: 'Challenge retrieved successfully',
        data: {
          ...found,
          options: typeof found.options === 'string' ? JSON.parse(found.options) : found.options,
        },
      });
      return;
    }

    res.status(404).json({
      success: false,
      message: `Challenge with ID '${id}' not found`,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

// POST /challenges/generate
export const generateChallengeEndpoint = async (req: Request, res: Response): Promise<void> => {
  try {
    const { challenge_type, difficulty, challengeType } = req.body;
    const type = (challenge_type || challengeType || 'math') as ChallengeType;
    const diff = (difficulty || 'medium') as ChallengeDifficulty;

    const generated = generateChallenge(type, diff);

    res.status(200).json({
      success: true,
      message: 'Challenge generated successfully',
      data: generated,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error generating challenge',
    });
  }
};

// POST /challenges/validate
export const validateChallengeAnswer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { challenge_id, answer, time_taken, challenge_type, difficulty, correct_answer, session_id } = req.body;
    const userId = req.user?.userId || req.body.user_id || 'demo_user_id';

    if (answer === undefined || answer === null) {
      res.status(400).json({
        success: false,
        message: 'Answer is required for validation',
      });
      return;
    }

    let isCorrect = false;
    let expectedAnswer = correct_answer || '';
    let explanationText = 'Explanation evaluated.';

    // Normalization logic for checking answer correctness
    const cleanUser = String(answer).trim().toLowerCase().replace(/\s+/g, ' ');

    if (challenge_id && !correct_answer) {
      if (await isDbConnected()) {
        try {
          const rows = await db.select().from(challenges).where(eq(challenges.id, challenge_id));
          if (rows.length > 0) {
            expectedAnswer = rows[0].correctAnswer;
            explanationText = rows[0].explanation;
          }
        } catch (err) {
          console.warn('⚠️ DB lookup error for challenge validation:', err);
        }
      }
      if (!expectedAnswer) {
        const found = staticChallengePool.find((c) => c.id === challenge_id);
        if (found) {
          expectedAnswer = found.correctAnswer;
          explanationText = found.explanation;
        }
      }
    }

    const cleanExpected = String(expectedAnswer).trim().toLowerCase().replace(/\s+/g, ' ');
    isCorrect = cleanUser === cleanExpected || cleanUser.includes(cleanExpected) || cleanExpected.includes(cleanUser);

    const timeTakenSec = parseInt(time_taken, 10) || 5;

    // Record challenge attempt history
    const attemptRecord: InMemoryAttempt = {
      id: `att_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      userId,
      challengeId: challenge_id || null,
      answer: String(answer),
      isCorrect,
      timeTaken: timeTakenSec,
      difficulty: difficulty || 'medium',
      challengeType: challenge_type || 'math',
      completedAt: new Date().toISOString(),
    };

    inMemoryAttempts.unshift(attemptRecord);

    if (await isDbConnected()) {
      try {
        await db.insert(challengeAttempts).values({
          userId: attemptRecord.userId,
          challengeId: attemptRecord.challengeId,
          answer: attemptRecord.answer,
          isCorrect: attemptRecord.isCorrect,
          timeTaken: attemptRecord.timeTaken,
          difficulty: attemptRecord.difficulty,
          challengeType: attemptRecord.challengeType,
        });
      } catch (err) {
        console.warn('⚠️ DB write error for challenge attempt:', err);
      }
    }

    // Update Wake-Up verification session if session_id provided
    let wakeUpSession = null;
    if (session_id) {
      wakeUpSession = await updateWakeUpSession(session_id, isCorrect);
    }

    res.status(200).json({
      success: true,
      message: isCorrect ? 'Correct answer! Challenge passed.' : 'Incorrect answer. Try again!',
      data: {
        is_correct: isCorrect,
        correct_answer: expectedAnswer,
        user_answer: answer,
        explanation: explanationText,
        time_taken: timeTakenSec,
        wake_up_session: wakeUpSession,
        wake_up_verified: wakeUpSession ? wakeUpSession.wakeUpVerified : isCorrect,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error validating challenge answer',
    });
  }
};

// GET /challenges/attempts
export const getChallengeAttempts = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || 'demo_user_id';

    if (await isDbConnected()) {
      try {
        const rows = await db
          .select()
          .from(challengeAttempts)
          .where(eq(challengeAttempts.userId, userId))
          .orderBy(desc(challengeAttempts.completedAt));

        res.status(200).json({
          success: true,
          message: 'Challenge attempt history retrieved successfully',
          data: rows,
        });
        return;
      } catch (err) {
        console.warn('⚠️ DB query error for attempts, fallback to in-memory:', err);
      }
    }

    const userAttempts = inMemoryAttempts.filter((a) => a.userId === userId || userId === 'demo_user_id');

    res.status(200).json({
      success: true,
      message: 'Challenge attempt history retrieved successfully (Fallback)',
      data: userAttempts,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching challenge attempt history',
    });
  }
};

// GET /challenges/analytics
export const getChallengeAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || 'demo_user_id';
    let attemptsList: any[] = [];

    if (await isDbConnected()) {
      try {
        attemptsList = await db
          .select()
          .from(challengeAttempts)
          .where(eq(challengeAttempts.userId, userId));
      } catch (err) {
        console.warn('⚠️ DB error fetching analytics, using in-memory attempts:', err);
        attemptsList = inMemoryAttempts.filter((a) => a.userId === userId || userId === 'demo_user_id');
      }
    } else {
      attemptsList = inMemoryAttempts.filter((a) => a.userId === userId || userId === 'demo_user_id');
    }

    // Default mock stats if empty
    if (attemptsList.length === 0) {
      attemptsList = [
        { isCorrect: true, timeTaken: 6, challengeType: 'math', difficulty: 'easy' },
        { isCorrect: true, timeTaken: 9, challengeType: 'logic', difficulty: 'medium' },
        { isCorrect: false, timeTaken: 12, challengeType: 'memory', difficulty: 'hard' },
        { isCorrect: true, timeTaken: 5, challengeType: 'riddle', difficulty: 'beginner' },
        { isCorrect: true, timeTaken: 7, challengeType: 'word', difficulty: 'medium' },
      ];
    }

    const totalChallenges = attemptsList.length;
    const correctAnswers = attemptsList.filter((a) => a.isCorrect).length;
    const incorrectAnswers = totalChallenges - correctAnswers;
    const accuracy = totalChallenges > 0 ? Math.round((correctAnswers / totalChallenges) * 100) : 0;
    const totalTime = attemptsList.reduce((acc, curr) => acc + (curr.timeTaken || 0), 0);
    const avgCompletionTime = totalChallenges > 0 ? Math.round(totalTime / totalChallenges) : 0;

    // Type performance breakdown
    const typeBreakdown: Record<string, { total: number; correct: number }> = {};
    attemptsList.forEach((a) => {
      const t = a.challengeType || 'math';
      if (!typeBreakdown[t]) typeBreakdown[t] = { total: 0, correct: 0 };
      typeBreakdown[t].total += 1;
      if (a.isCorrect) typeBreakdown[t].correct += 1;
    });

    res.status(200).json({
      success: true,
      message: 'Challenge analytics calculated successfully',
      data: {
        total_challenges: totalChallenges,
        completed_challenges: totalChallenges,
        correct_answers: correctAnswers,
        incorrect_answers: incorrectAnswers,
        accuracy_percentage: accuracy,
        average_completion_time_seconds: avgCompletionTime,
        type_performance: typeBreakdown,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error generating challenge analytics',
    });
  }
};
