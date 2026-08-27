import { Request, Response } from 'express';
import {
  createWakeUpSession,
  updateWakeUpSession,
  getWakeUpSession,
} from '../services/wakeUpVerification.service.js';
import { generateChallenge, ChallengeType, ChallengeDifficulty } from '../services/challengeGenerator.service.js';

// POST /api/wakeup/start
export const startWakeUpVerification = async (req: Request, res: Response): Promise<void> => {
  try {
    const { alarm_id, verification_method, challenge_type, difficulty } = req.body;
    const userId = req.user?.userId || req.body.user_id || 'demo_user_id';

    const session = await createWakeUpSession(
      userId,
      alarm_id,
      verification_method || 'puzzle_completion'
    );

    // Initial challenge for this session
    const challenge = generateChallenge(
      (challenge_type || 'math') as ChallengeType,
      (difficulty || 'medium') as ChallengeDifficulty
    );

    res.status(201).json({
      success: true,
      message: 'Wake-up verification session initialized',
      data: {
        session,
        current_challenge: challenge,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error starting wake-up verification',
    });
  }
};

// POST /api/wakeup/submit
export const submitWakeUpAttempt = async (req: Request, res: Response): Promise<void> => {
  try {
    const { session_id, is_correct, challenge_type, difficulty } = req.body;

    if (!session_id) {
      res.status(400).json({
        success: false,
        message: 'session_id is required',
      });
      return;
    }

    const updatedSession = await updateWakeUpSession(session_id, Boolean(is_correct));

    if (!updatedSession) {
      res.status(404).json({
        success: false,
        message: `Wake-up session '${session_id}' not found`,
      });
      return;
    }

    let nextChallenge = null;
    if (!updatedSession.wakeUpVerified) {
      nextChallenge = generateChallenge(
        (challenge_type || 'math') as ChallengeType,
        (difficulty || 'medium') as ChallengeDifficulty
      );
    }

    res.status(200).json({
      success: true,
      message: updatedSession.wakeUpVerified
        ? '🎉 Wake-up verified! Alarm dismissed successfully.'
        : 'Challenge result logged. Verification in progress.',
      data: {
        session: updatedSession,
        wake_up_verified: updatedSession.wakeUpVerified,
        next_challenge: nextChallenge,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error processing wake-up attempt',
    });
  }
};

// GET /api/wakeup/status/:id
export const getWakeUpStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const session = await getWakeUpSession(id);

    if (!session) {
      res.status(404).json({
        success: false,
        message: `Wake-up session '${id}' not found`,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Wake-up session status retrieved',
      data: session,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching wake-up session status',
    });
  }
};
