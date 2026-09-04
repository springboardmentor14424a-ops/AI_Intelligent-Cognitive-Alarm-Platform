import { pool, db, isDbConnected } from '../db/index.js';
import { wakeUpVerifications } from '../db/schema/wakeUpVerifications.js';
import { challengeAttempts } from '../db/schema/challengeAttempts.js';
import { eq, and } from 'drizzle-orm';
import { isUuid } from '../utils/uuid.js';

export interface WakeUpSession {
  id: string;
  alarmId: string | null;
  userId: string;
  verificationStarted: string;
  verificationCompleted: string | null;
  attempts: number;
  correctAnswers: number;
  wakeUpVerified: boolean;
  verificationMethod: string;
  requiredCorrect: number;
}

// In-memory store fallback
const inMemorySessions: Map<string, WakeUpSession> = new Map();

export const createWakeUpSession = async (
  userId: string,
  alarmId?: string,
  verificationMethod = 'puzzle_completion'
): Promise<WakeUpSession> => {
  const session: WakeUpSession = {
    id: `wuv_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    alarmId: alarmId || null,
    userId,
    verificationStarted: new Date().toISOString(),
    verificationCompleted: null,
    attempts: 0,
    correctAnswers: 0,
    wakeUpVerified: false,
    verificationMethod,
    requiredCorrect: verificationMethod === 'multi_step' ? 3 : verificationMethod === 'consecutive_correct' ? 2 : 1,
  };

  inMemorySessions.set(session.id, session);

  if (await isDbConnected() && isUuid(userId)) {
    try {
      const validAlarmId = isUuid(alarmId) ? alarmId! : null;
      const [newRow] = await db
        .insert(wakeUpVerifications)
        .values({
          userId,
          alarmId: validAlarmId,
          verificationMethod: session.verificationMethod,
          attempts: 0,
          correctAnswers: 0,
          wakeUpVerified: false,
        })
        .returning();
      if (newRow) {
        // Map in-memory key to real PostgreSQL UUID
        inMemorySessions.delete(session.id);
        session.id = newRow.id;
        inMemorySessions.set(session.id, session);
      }
    } catch (err) {
      console.warn('⚠️ DB write failed for wakeUpVerification session:', err);
    }
  }

  return session;
};

export const updateWakeUpSession = async (
  sessionId: string,
  isCorrect: boolean
): Promise<WakeUpSession | null> => {
  let session = inMemorySessions.get(sessionId);

  if (!session && (await isDbConnected()) && isUuid(sessionId)) {
    try {
      const rows = await db
        .select()
        .from(wakeUpVerifications)
        .where(eq(wakeUpVerifications.id, sessionId));
      if (rows.length > 0) {
        const r = rows[0];
        session = {
          id: r.id,
          alarmId: r.alarmId,
          userId: r.userId,
          verificationStarted: r.verificationStarted.toISOString(),
          verificationCompleted: r.verificationCompleted ? r.verificationCompleted.toISOString() : null,
          attempts: r.attempts,
          correctAnswers: r.correctAnswers,
          wakeUpVerified: r.wakeUpVerified,
          verificationMethod: r.verificationMethod,
          requiredCorrect: r.verificationMethod === 'multi_step' ? 3 : r.verificationMethod === 'consecutive_correct' ? 2 : 1,
        };
      }
    } catch (err) {
      console.warn('⚠️ DB query error on session lookup:', err);
    }
  }

  if (!session) return null;

  session.attempts += 1;
  if (isCorrect) {
    session.correctAnswers += 1;
  } else if (session.verificationMethod === 'consecutive_correct') {
    session.correctAnswers = 0;
  }

  if (session.correctAnswers >= session.requiredCorrect) {
    session.wakeUpVerified = true;
    session.verificationCompleted = new Date().toISOString();
  }

  inMemorySessions.set(session.id, session);

  if (await isDbConnected() && isUuid(session.id)) {
    try {
      await db
        .update(wakeUpVerifications)
        .set({
          attempts: session.attempts,
          correctAnswers: session.correctAnswers,
          wakeUpVerified: session.wakeUpVerified,
          verificationCompleted: session.verificationCompleted ? new Date(session.verificationCompleted) : null,
        })
        .where(eq(wakeUpVerifications.id, session.id));
    } catch (err) {
      console.warn('⚠️ DB update failed for session:', err);
    }
  }

  return session;
};

export const getWakeUpSession = async (sessionId: string): Promise<WakeUpSession | null> => {
  if (inMemorySessions.has(sessionId)) {
    return inMemorySessions.get(sessionId)!;
  }

  if (await isDbConnected() && isUuid(sessionId)) {
    try {
      const rows = await db
        .select()
        .from(wakeUpVerifications)
        .where(eq(wakeUpVerifications.id, sessionId));
      if (rows.length > 0) {
        const r = rows[0];
        return {
          id: r.id,
          alarmId: r.alarmId,
          userId: r.userId,
          verificationStarted: r.verificationStarted.toISOString(),
          verificationCompleted: r.verificationCompleted ? r.verificationCompleted.toISOString() : null,
          attempts: r.attempts,
          correctAnswers: r.correctAnswers,
          wakeUpVerified: r.wakeUpVerified,
          verificationMethod: r.verificationMethod,
          requiredCorrect: r.verificationMethod === 'multi_step' ? 3 : r.verificationMethod === 'consecutive_correct' ? 2 : 1,
        };
      }
    } catch (err) {
      console.warn('⚠️ DB query error on get session:', err);
    }
  }

  return null;
};
