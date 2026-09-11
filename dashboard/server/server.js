import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'cogniwell_super_secret_jwt_key_2026';


// ─── JWT AUTH MIDDLEWARE ───────────────────────────────────────────────────────
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.userId = decoded.id;
      req.userRole = decoded.role;
      return next();
    } catch (err) {
      // Token expired or invalid signature, fallback seamlessly to query/body userId
    }
  }
  const fallbackId = req.query.userId || req.body?.user_id || req.body?.userId;
  req.userId = await getValidUserId(fallbackId);
  next();
};

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});
app.use(express.json());

// PostgreSQL Pool Connection Setup
const pool = new pg.Pool({
  user: process.env.PGUSER || 'postgres',
  host: process.env.PGHOST || 'localhost',
  database: process.env.PGDATABASE || 'cogniwell_db',
  password: process.env.PGPASSWORD || 'postgres',
  port: process.env.PGPORT || 5432,
  connectionTimeoutMillis: 1500
});

// In-Memory Database Fallback for smooth execution if DB offline
let inMemoryUsers = [
  { id: 1, name: 'John Doe', email: 'user@cogniwell.com', password: bcrypt.hashSync('user123', 10), role: 'User', provider: 'LOCAL', created_at: new Date() },
  { id: 2, name: 'Dr. Sarah Wilson', email: 'coach@cogniwell.com', password: bcrypt.hashSync('coach123', 10), role: 'Wellness Coach', provider: 'LOCAL', created_at: new Date() },
  { id: 3, name: 'Admin User', email: 'admin@cogniwell.com', password: bcrypt.hashSync('admin123', 10), role: 'Administrator', provider: 'LOCAL', created_at: new Date() }
];

// Helper Functions
const findUserByEmail = async (email) => {
  try {
    const res = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    return res.rows[0];
  } catch (err) {
    return inMemoryUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
  }
};

const saveUserToPostgres = async ({ name, email, hashedPassword, role, provider = 'LOCAL' }) => {
  const normalizedRole = role === 'admin' ? 'Administrator' : role === 'coach' ? 'Wellness Coach' : (role || 'User');
  try {
    const res = await pool.query(
      `INSERT INTO users (name, email, password, role, provider, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING *`,
      [name, email, hashedPassword, normalizedRole, provider]
    );
    console.log(`💾 Saved new user [${email}] to PostgreSQL database with BCrypt encrypted password!`);
    const createdUser = res.rows[0];
    try {
      await pool.query(
        `INSERT INTO "Weighted Scoring Model" (user_id, alarm_name, habit_score, wake_up_consistency, challenge_completion_success, snooze_reduction, sleep_schedule_adherence)
         VALUES ($1, 'Morning Alarm', 85.00, 85.00, 90.00, 88.00, 92.00)
         ON CONFLICT (user_id, alarm_name) DO NOTHING`,
        [createdUser.id]
      );
    } catch (_) {}
    return createdUser;
  } catch (err) {
    console.log(`💡 PostgreSQL offline or table missing. Saving user [${email}] into secure local state...`);
    const newUser = {
      id: inMemoryUsers.length + 1,
      name,
      email,
      password: hashedPassword,
      role: normalizedRole,
      provider,
      created_at: new Date()
    };
    inMemoryUsers.push(newUser);
    return newUser;
  }
};

// Helper: randomly assign a new user (role='User') to one of the coaches in DB
const autoAssignUserToCoach = async (userId) => {
  try {
    const coachRes = await pool.query(`SELECT id FROM users WHERE LOWER(role) IN ('wellness coach', 'coach') ORDER BY id`);
    const coaches = coachRes.rows;
    if (coaches.length === 0) return;
    const randomCoach = coaches[Math.floor(Math.random() * coaches.length)];
    await pool.query(
      `INSERT INTO coach_assignments (user_id, coach_id) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING`,
      [userId, randomCoach.id]
    );
    console.log(`🎯 Auto-assigned user ${userId} to coach ${randomCoach.id}`);
  } catch (err) {
    console.log('⚠️ Could not auto-assign user to coach:', err.message);
  }
};

// Auto-sync a user's Weighted Scoring Model per alarm from real alarm_sessions
// Sync a user's daily Weighted Scoring Model row for a given date (default: today).
// Called on every alarm dismissal — aggregates ALL that day's sessions across all alarms.
const syncUserWeightedScoringModel = async (userId, targetDate = null) => {
  try {
    const scoreDate = targetDate || new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // Fetch all sessions for this user on scoreDate
    const sRes = await pool.query(
      `SELECT status, challenge_solved, snooze_count
       FROM alarm_sessions
       WHERE user_id = $1
         AND DATE(created_at AT TIME ZONE 'Asia/Kolkata') = $2`,
      [userId, scoreDate]
    );
    const sessions = sRes.rows;
    const totalSessions = sessions.length;
    const dismissedCount = sessions.filter(s => s.status === 'Dismissed').length;
    const solvedCount = sessions.filter(s => s.challenge_solved).length;
    const totalSnoozes = sessions.reduce((sum, s) => sum + (s.snooze_count || 0), 0);

    let wakeUpConsistency = 85.0;
    let challengeSuccess = 90.0;
    let snoozeReduction = 88.0;
    let sleepAdherence = 92.0;

    if (totalSessions > 0) {
      wakeUpConsistency = Math.round((dismissedCount / totalSessions) * 100);
      challengeSuccess = Math.round((solvedCount / totalSessions) * 100);
      snoozeReduction = Math.max(20, Math.round(100 - (totalSnoozes * 15)));
      sleepAdherence = 92.0;
    }

    const habitScore = Math.round(
      (wakeUpConsistency * 0.35) +
      (challengeSuccess * 0.25) +
      (snoozeReduction * 0.20) +
      (sleepAdherence * 0.20)
    );

    const upsertRes = await pool.query(
      `INSERT INTO "Weighted Scoring Model"
        (user_id, score_date, habit_score, wake_up_consistency, challenge_completion_success,
         snooze_reduction, sleep_schedule_adherence, total_sessions, total_snoozes, solved_count, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
       ON CONFLICT (user_id, score_date) DO UPDATE SET
         habit_score = EXCLUDED.habit_score,
         wake_up_consistency = EXCLUDED.wake_up_consistency,
         challenge_completion_success = EXCLUDED.challenge_completion_success,
         snooze_reduction = EXCLUDED.snooze_reduction,
         sleep_schedule_adherence = EXCLUDED.sleep_schedule_adherence,
         total_sessions = EXCLUDED.total_sessions,
         total_snoozes = EXCLUDED.total_snoozes,
         solved_count = EXCLUDED.solved_count,
         updated_at = NOW()
       RETURNING *`,
      [userId, scoreDate, habitScore, wakeUpConsistency, challengeSuccess, snoozeReduction, sleepAdherence, totalSessions, totalSnoozes, solvedCount]
    );

    return upsertRes.rows[0];
  } catch (err) {
    console.warn(`⚠️ Error syncing daily Weighted Scoring Model for user ${userId}:`, err.message);
    return null;
  }
};


// Initialize the "Weighted Scoring Model" table — per day per user
const initWeightedScoringModelTable = async () => {
  try {
    // 1. Create table with score_date if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "Weighted Scoring Model" (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        score_date DATE NOT NULL DEFAULT CURRENT_DATE,
        habit_score NUMERIC(5,2) NOT NULL DEFAULT 85.00,
        wake_up_consistency NUMERIC(5,2) NOT NULL DEFAULT 85.00,
        challenge_completion_success NUMERIC(5,2) NOT NULL DEFAULT 90.00,
        snooze_reduction NUMERIC(5,2) NOT NULL DEFAULT 88.00,
        sleep_schedule_adherence NUMERIC(5,2) NOT NULL DEFAULT 92.00,
        total_sessions INTEGER DEFAULT 0,
        total_snoozes INTEGER DEFAULT 0,
        solved_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Migration: Add score_date column if missing (for existing tables)
    try {
      await pool.query(`ALTER TABLE "Weighted Scoring Model" ADD COLUMN IF NOT EXISTS score_date DATE NOT NULL DEFAULT CURRENT_DATE`);
      await pool.query(`ALTER TABLE "Weighted Scoring Model" ADD COLUMN IF NOT EXISTS total_sessions INTEGER DEFAULT 0`);
      await pool.query(`ALTER TABLE "Weighted Scoring Model" ADD COLUMN IF NOT EXISTS total_snoozes INTEGER DEFAULT 0`);
      await pool.query(`ALTER TABLE "Weighted Scoring Model" ADD COLUMN IF NOT EXISTS solved_count INTEGER DEFAULT 0`);
    } catch (_) {}

    // 3. Drop old unique constraints and add UNIQUE(user_id, score_date)
    const oldConstraints = [
      '"Weighted Scoring Model_user_id_key"',
      '"Weighted Scoring Model_user_date_key"',
      '"Weighted Scoring Model_user_alarm_key"'
    ];
    for (const c of oldConstraints) {
      try { await pool.query(`ALTER TABLE "Weighted Scoring Model" DROP CONSTRAINT IF EXISTS ${c}`); } catch (_) {}
    }

    try {
      // Remove duplicate rows for same (user_id, score_date) before adding unique constraint
      await pool.query(`
        DELETE FROM "Weighted Scoring Model" a USING "Weighted Scoring Model" b
        WHERE a.id < b.id AND a.user_id = b.user_id AND a.score_date = b.score_date
      `);
      await pool.query(`ALTER TABLE "Weighted Scoring Model" ADD CONSTRAINT "Weighted Scoring Model_user_date_key" UNIQUE (user_id, score_date)`);
    } catch (_) {}

    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_weighted_scoring_user_date ON "Weighted Scoring Model"(user_id, score_date DESC)`);
    } catch (_) {}

    // 4. Backfill: for every user, compute a daily row for each distinct date that has sessions
    const users = await pool.query(`SELECT id FROM users`);
    for (const u of users.rows) {
      try {
        const dates = await pool.query(
          `SELECT DISTINCT DATE(created_at AT TIME ZONE 'Asia/Kolkata') AS d
           FROM alarm_sessions WHERE user_id = $1 ORDER BY d`,
          [u.id]
        );
        for (const row of dates.rows) {
          await syncUserWeightedScoringModel(u.id, row.d instanceof Date
            ? row.d.toISOString().slice(0, 10)
            : String(row.d).slice(0, 10));
        }
        // Always ensure today's row exists
        await syncUserWeightedScoringModel(u.id);
      } catch (_) {}
    }

    console.log('✅ PostgreSQL "Weighted Scoring Model" table initialized — 1 row per day per user, triggered per alarm dismissal.');
  } catch (err) {
    console.error('⚠️ Could not initialize "Weighted Scoring Model" table:', err);
  }
};


// 1. REGISTRATION ENDPOINT (BCrypt Encrypted Password -> PostgreSQL)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Validation Error: Please provide name, email, and password.' });
    }

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists.' });
    }

    // Encrypt password using BCrypt hashing (10 salt rounds)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save encrypted credentials to PostgreSQL
    const newUser = await saveUserToPostgres({
      name,
      email,
      hashedPassword,
      role: role || 'User',
      provider: 'LOCAL'
    });

    // Auto-assign new users (role=User) to a random coach
    const normalizedRole = (role || 'User').toLowerCase();
    if (normalizedRole === 'user') {
      await autoAssignUserToCoach(newUser.id);
    }

    const token = jwt.sign(
      { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role, provider: newUser.provider },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(201).json({
      message: 'User registered successfully with BCrypt encrypted password in PostgreSQL!',
      token,
      user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role, provider: newUser.provider }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Registration Error: ' + error.message });
  }
});

// 2. LOGIN ENDPOINT (BCrypt Verification against PostgreSQL)

// POST /api/auth/token-refresh — Refresh or generate a token for active user
app.post('/api/auth/token-refresh', async (req, res) => {
  try {
    const { userId, email } = req.body;
    let user = null;
    if (userId) {
      const dbRes = await pool.query('SELECT id, name, email, role, provider FROM users WHERE id = $1', [userId]);
      user = dbRes.rows[0];
    } else if (email) {
      user = await findUserByEmail(email);
    }
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, provider: user.provider },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ message: 'Token refresh error: ' + err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password.' });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ 
        message: '⚠️ User not registered. Please create an account first.' 
      });
    }

    if (user.password) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ 
          message: '❌ Incorrect password. Please try again.' 
        });
      }
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, provider: user.provider },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      message: 'Login successful!',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, provider: user.provider }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Login Error: ' + error.message });
  }
});

// 3. OAUTH 2.0 ENDPOINT (Setting provider = 'GOOGLE')
app.post('/api/auth/oauth', async (req, res) => {
  try {
    const { provider, email, name, role } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required for OAuth.' });
    }

    let user = await findUserByEmail(email);

    if (!user) {
      const dummyPassword = await bcrypt.hash(`oauth_${Date.now()}`, 10);
      user = await saveUserToPostgres({
        name: name || 'Google User',
        email,
        hashedPassword: dummyPassword,
        role: role || 'User',
        provider: provider === 'Google' ? 'GOOGLE' : 'LOCAL'
      });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, provider: user.provider },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      message: `Authenticated via ${provider} OAuth!`,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, provider: user.provider }
    });
  } catch (error) {
    return res.status(500).json({ message: 'OAuth Error: ' + error.message });
  }
});

// 4. GET ALL USERS (Admin Dashboard)
app.get('/api/users', verifyToken, async (req, res) => {
  try {
    const dbRes = await pool.query('SELECT id, name, email, role, provider, created_at FROM users ORDER BY created_at DESC');
    res.json({ users: dbRes.rows });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users: ' + error.message });
  }
});

// 5. GET COACH'S ASSIGNED CLIENTS (Coach Dashboard)
app.get('/api/coach/clients/:coachId', verifyToken, async (req, res) => {
  try {
    const { coachId } = req.params;
    const dbRes = await pool.query(`
      SELECT u.id, u.name, u.email, u.role, u.created_at, ca.assigned_at
      FROM users u
      INNER JOIN coach_assignments ca ON ca.user_id = u.id
      WHERE ca.coach_id = $1
      ORDER BY ca.assigned_at DESC
    `, [coachId]);
    res.json({ clients: dbRes.rows });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching coach clients: ' + error.message });
  }
});

// 6. GET ALL COACH ASSIGNMENTS (Admin view)
app.get('/api/admin/assignments', verifyToken, async (req, res) => {
  try {
    const dbRes = await pool.query(`
      SELECT 
        u.id AS user_id, u.name AS user_name, u.email AS user_email,
        c.id AS coach_id, c.name AS coach_name,
        ca.assigned_at
      FROM coach_assignments ca
      INNER JOIN users u ON ca.user_id = u.id
      INNER JOIN users c ON ca.coach_id = c.id
      ORDER BY ca.assigned_at DESC
    `);
    res.json({ assignments: dbRes.rows });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching assignments: ' + error.message });
  }
});

// 7. GET ALL WELLNESS COACHES (for User Registration coach-selection step)
app.get('/api/coaches', async (req, res) => {
  try {
    const dbRes = await pool.query(`
      SELECT id, name, email FROM users 
      WHERE LOWER(role) IN ('wellness coach', 'coach') 
      ORDER BY name ASC
    `);
    res.json({ coaches: dbRes.rows });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching coaches: ' + error.message });
  }
});

// 8. MANUALLY ASSIGN USER TO SPECIFIC COACH
app.post('/api/coach/assign', verifyToken, async (req, res) => {
  try {
    const { userId, coachId } = req.body;
    if (!userId || !coachId) {
      return res.status(400).json({ message: 'userId and coachId are required.' });
    }
    await pool.query(
      `INSERT INTO coach_assignments (user_id, coach_id) VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET coach_id = $2, assigned_at = NOW()`,
      [userId, coachId]
    );
    const coach = await pool.query('SELECT name FROM users WHERE id = $1', [coachId]);
    res.json({ message: `User successfully assigned to ${coach.rows[0]?.name || 'coach'}!` });
  } catch (error) {
    res.status(500).json({ message: 'Assignment Error: ' + error.message });
  }
});

// ─── COACH & CLIENT BIDIRECTIONAL MESSAGING ENDPOINTS ──────────────────────────

// GET: Assigned coach for a user
app.get('/api/user/coach/:userId', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const dbRes = await pool.query(`
      SELECT ca.coach_id, u.name AS coach_name, u.email AS coach_email
      FROM coach_assignments ca
      JOIN users u ON ca.coach_id = u.id
      WHERE ca.user_id = $1
    `, [userId]);
    if (dbRes.rows.length > 0) {
      return res.json({ coach: dbRes.rows[0] });
    }
    const defCoach = await pool.query(`
      SELECT id AS coach_id, name AS coach_name, email AS coach_email
      FROM users WHERE LOWER(role) IN ('wellness coach', 'coach') LIMIT 1
    `);
    res.json({ coach: defCoach.rows[0] || null });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching assigned coach: ' + err.message });
  }
});

// POST: Send message from coach to client (or broadcast)
app.post('/api/coach/messages', verifyToken, async (req, res) => {
  try {
    const coachId = req.body.coach_id || req.userId;
    const { client_id, subject = 'Wellness Guidance', message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message content is required.' });
    }

    const coachRes = await pool.query('SELECT name FROM users WHERE id = $1', [coachId]);
    const coachName = coachRes.rows[0]?.name || 'Wellness Coach';

    if (!client_id || client_id === 'all') {
      const assigned = await pool.query('SELECT user_id FROM coach_assignments WHERE coach_id = $1', [coachId]);
      if (assigned.rows.length === 0) {
        const ins = await pool.query(`
          INSERT INTO coach_messages (coach_id, client_id, client_name, coach_name, subject, message, sender_type, is_read)
          VALUES ($1, NULL, 'All Clients', $2, $3, $4, 'coach', false) RETURNING *
        `, [coachId, coachName, subject, message]);
        return res.json({ success: true, message: 'Message broadcast to all clients.', data: [ins.rows[0]] });
      }

      const inserted = [];
      for (const row of assigned.rows) {
        const uRes = await pool.query('SELECT name FROM users WHERE id = $1', [row.user_id]);
        const clientName = uRes.rows[0]?.name || `Client #${row.user_id}`;
        const ins = await pool.query(`
          INSERT INTO coach_messages (coach_id, client_id, client_name, coach_name, subject, message, sender_type, is_read)
          VALUES ($1, $2, $3, $4, $5, $6, 'coach', false) RETURNING *
        `, [coachId, row.user_id, clientName, coachName, subject, message]);
        inserted.push(ins.rows[0]);
      }
      return res.json({ success: true, message: `Message sent to ${inserted.length} client(s).`, data: inserted });
    } else {
      const uRes = await pool.query('SELECT name FROM users WHERE id = $1', [client_id]);
      const clientName = uRes.rows[0]?.name || `Client #${client_id}`;
      const ins = await pool.query(`
        INSERT INTO coach_messages (coach_id, client_id, client_name, coach_name, subject, message, sender_type, is_read)
        VALUES ($1, $2, $3, $4, $5, $6, 'coach', false) RETURNING *
      `, [coachId, client_id, clientName, coachName, subject, message]);
      return res.json({ success: true, message: `Message sent to ${clientName}.`, data: [ins.rows[0]] });
    }
  } catch (err) {
    res.status(500).json({ message: 'Error sending coach message: ' + err.message });
  }
});

// POST: Send message from client/user to coach
app.post('/api/user/messages', verifyToken, async (req, res) => {
  try {
    const userId = req.body.user_id || req.userId;
    const { coach_id, subject = 'Question for Coach', message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message content is required.' });
    }

    const uRes = await pool.query('SELECT name FROM users WHERE id = $1', [userId]);
    const clientName = uRes.rows[0]?.name || 'Client';

    let cId = coach_id;
    if (!cId) {
      const ca = await pool.query('SELECT coach_id FROM coach_assignments WHERE user_id = $1', [userId]);
      cId = ca.rows[0]?.coach_id;
    }
    if (!cId) {
      const defCoach = await pool.query("SELECT id FROM users WHERE LOWER(role) IN ('wellness coach', 'coach') LIMIT 1");
      cId = defCoach.rows[0]?.id;
    }
    const cRes = await pool.query('SELECT name FROM users WHERE id = $1', [cId]);
    const coachName = cRes.rows[0]?.name || 'Wellness Coach';

    const ins = await pool.query(`
      INSERT INTO coach_messages (coach_id, client_id, client_name, coach_name, subject, message, sender_type, is_read)
      VALUES ($1, $2, $3, $4, $5, $6, 'client', false) RETURNING *
    `, [cId, userId, clientName, coachName, subject, message]);

    res.json({ success: true, message: `Message sent to Coach ${coachName}!`, data: ins.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Error sending user message: ' + err.message });
  }
});

// GET: All messages for a coach (both sent by coach and received from clients) + unread count
app.get('/api/coach/messages/:coachId', verifyToken, async (req, res) => {
  try {
    const { coachId } = req.params;
    const dbRes = await pool.query(`
      SELECT * FROM coach_messages
      WHERE coach_id = $1
      ORDER BY created_at DESC
    `, [coachId]);
    const unreadCount = dbRes.rows.filter(m => m.sender_type === 'client' && !m.is_read).length;
    res.json({ messages: dbRes.rows, count: dbRes.rows.length, unread_count: unreadCount });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching coach messages: ' + err.message });
  }
});

// GET: All messages for a user (both received from coach and sent by user) + unread count
app.get('/api/user/messages/:userId', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const dbRes = await pool.query(`
      SELECT * FROM coach_messages
      WHERE client_id = $1 OR client_id IS NULL
      ORDER BY created_at DESC
    `, [userId]);
    const unreadCount = dbRes.rows.filter(m => m.sender_type === 'coach' && !m.is_read).length;
    res.json({ messages: dbRes.rows, count: dbRes.rows.length, unread_count: unreadCount });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching user messages: ' + err.message });
  }
});

// PUT: Mark messages as read
app.put('/api/messages/mark-read', verifyToken, async (req, res) => {
  try {
    const { role, id, messageId } = req.body;
    if (messageId) {
      await pool.query('UPDATE coach_messages SET is_read = true WHERE id = $1', [messageId]);
    } else if (role === 'coach') {
      await pool.query('UPDATE coach_messages SET is_read = true WHERE coach_id = $1 AND sender_type = \'client\'', [id]);
    } else if (role === 'user' || role === 'client') {
      await pool.query('UPDATE coach_messages SET is_read = true WHERE (client_id = $1 OR client_id IS NULL) AND sender_type = \'coach\'', [id]);
    }
    res.json({ success: true, message: 'Messages marked as read' });
  } catch (err) {
    res.status(500).json({ message: 'Error marking messages as read: ' + err.message });
  }
});


// GEMINI AI CHALLENGE GENERATOR FOR ALARM DISMISSAL (EXCLUDES PREVIOUSLY SOLVED CHALLENGES)
app.post('/api/gemini/challenge', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { theme = 'Math Challenge', difficulty = 'Medium' } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    // 1. Fetch questions previously solved by this user within 3 attempts
    let solvedQuestions = [];
    if (userId) {
      try {
        const prevRes = await pool.query(
          `SELECT question FROM alarm_sessions 
           WHERE user_id = $1 AND challenge_solved = true AND (snooze_count <= 3 OR snooze_count IS NULL)
           ORDER BY id DESC LIMIT 50`,
          [userId]
        );
        solvedQuestions = prevRes.rows.map(r => r.question).filter(Boolean);
      } catch (err) {
        console.warn('Error fetching previous solved challenges:', err.message);
      }
    }

    const excludeNote = solvedQuestions.length > 0
      ? `\nCRITICAL REQUIREMENT: Do NOT repeat or generate any of the following questions that the user has already solved previously:\n${solvedQuestions.slice(0, 20).map(q => `- "${q}"`).join('\n')}\nEnsure the new question is completely fresh, unique, and has never been solved before.`
      : '';

    // ── Try real Gemini API if key is present ──
    if (apiKey && !apiKey.includes('Demo')) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const geminiPrompt = `Generate a single short cognitive wake-up challenge for the theme: "${theme}" at difficulty level "${difficulty}" (one of Beginner, Easy, Medium, Hard, Expert). ${excludeNote}
Return ONLY a valid JSON object (no markdown, no explanation) with exactly these keys:
{
  "title": "short title with emoji",
  "prompt": "the question or task shown to user",
  "answer": "the exact expected answer as a string",
  "hint": "one short hint"
}
Difficulty scaling guidance:
- Beginner: Very simple single-step questions (e.g., 7 + 8 or 3-digit memory)
- Easy: Basic two-step arithmetic (e.g., (12 + 6) - 4 or 4-digit sequence)
- Medium: Standard multiplication and subtraction (e.g., (14 * 4) - 8 or 5-digit sequence)
- Hard: Challenging two-step math or 6-digit sequence
- Expert: Multi-step mental math (e.g., (28 * 14) - 39 or 7-digit sequence)
Make the challenge fun, solvable in under 30 seconds, and themed around ${theme}.`;
        const result = await model.generateContent(geminiPrompt);
        const text = result.response.text().trim();
        const jsonStart = text.indexOf('{');
        const jsonEnd = text.lastIndexOf('}');
        const jsonStr = text.slice(jsonStart, jsonEnd + 1);
        const challengeData = JSON.parse(jsonStr);
        challengeData.title = challengeData.title || `🤖 Gemini AI ${theme}`;
        return res.json({ success: true, challenge: challengeData, source: 'gemini' });
      } catch (geminiErr) {
        console.warn('Gemini API error, falling back to local generator:', geminiErr.message);
      }
    }

    // ── Local fallback challenge generator with unrepeated generation ──
    let challengeData = {};
    const diff = (difficulty || 'Medium').toLowerCase();

    for (let attempt = 0; attempt < 25; attempt++) {
      if (theme.includes('Math')) {
        let prompt = '', answer = '', hint = '';
        if (diff === 'beginner') {
          const a = Math.floor(5 + Math.random() * 25);
          const b = Math.floor(3 + Math.random() * 20);
          prompt = `Solve: ${a} + ${b} = ?`;
          answer = (a + b).toString();
          hint = `Add ${a} and ${b}.`;
        } else if (diff === 'easy') {
          const a = Math.floor(10 + Math.random() * 30);
          const b = Math.floor(4 + Math.random() * 15);
          const c = Math.floor(2 + Math.random() * 12);
          prompt = `Solve: (${a} + ${b}) − ${c} = ?`;
          answer = (a + b - c).toString();
          hint = `Add ${a} + ${b} = ${a + b}, then subtract ${c}.`;
        } else if (diff === 'hard') {
          const a = Math.floor(20 + Math.random() * 40);
          const b = Math.floor(6 + Math.random() * 15);
          const c = Math.floor(15 + Math.random() * 45);
          prompt = `Solve: (${a} × ${b}) − ${c} = ?`;
          answer = (a * b - c).toString();
          hint = `Multiply ${a} × ${b} = ${a * b}, then subtract ${c}.`;
        } else if (diff === 'expert') {
          const a = Math.floor(30 + Math.random() * 50);
          const b = Math.floor(11 + Math.random() * 18);
          const c = Math.floor(25 + Math.random() * 60);
          prompt = `Solve: (${a} × ${b}) − ${c} = ?`;
          answer = (a * b - c).toString();
          hint = `Multiply ${a} × ${b} = ${a * b}, then subtract ${c}.`;
        } else {
          // Medium
          const a = Math.floor(12 + Math.random() * 30);
          const b = Math.floor(3 + Math.random() * 11);
          const c = Math.floor(5 + Math.random() * 25);
          prompt = `Solve: (${a} × ${b}) − ${c} = ?`;
          answer = (a * b - c).toString();
          hint = `Multiply ${a} × ${b} = ${a * b}, then subtract ${c}.`;
        }
        challengeData = { title: `🤖 Gemini AI Math Challenge (${difficulty})`, prompt, answer, hint };
      } else if (theme.includes('Memory')) {
        const len = diff === 'beginner' ? 3 : diff === 'easy' ? 4 : diff === 'hard' ? 6 : diff === 'expert' ? 7 : 5;
        const nums = Array.from({ length: len }, () => Math.floor(1 + Math.random() * 9));
        challengeData = {
          title: `🧠 Gemini AI Memory Matrix (${difficulty})`,
          prompt: `Memorize & type the sequence: ${nums.join(' − ')}`,
          answer: nums.join(''),
          hint: `Type all ${len} digits continuously, no spaces.`
        };
      } else if (theme.includes('Stroop')) {
        const colors = ['RED', 'BLUE', 'GREEN', 'ORANGE', 'YELLOW', 'PURPLE', 'MAGENTA', 'TURQUOISE', 'CYAN', 'VIOLET', 'SCARLET'];
        const c = colors[Math.floor(Math.random() * colors.length)];
        challengeData = {
          title: `🎨 Gemini AI Stroop Focus (${difficulty})`,
          prompt: `How many letters are in the word "${c}"?`,
          answer: c.length.toString(),
          hint: `Count the letters in ${c}.`
        };
      } else if (theme.includes('Logic') || theme.includes('Pattern')) {
        const patterns = diff === 'beginner' ? [
          { prompt: 'Next in: 2, 4, 6, 8, ?', answer: '10', hint: 'Add 2 each time.' },
          { prompt: 'Next in: 5, 10, 15, 20, ?', answer: '25', hint: 'Add 5 each time.' },
          { prompt: 'Next in: 3, 6, 9, 12, ?', answer: '15', hint: 'Add 3 each time.' }
        ] : diff === 'expert' ? [
          { prompt: 'Next in: 3, 9, 27, 81, ?', answer: '243', hint: 'Multiply by 3 each time.' },
          { prompt: 'Next in: 2, 6, 18, 54, ?', answer: '162', hint: 'Multiply by 3 each time.' },
          { prompt: 'Next in: 4, 12, 36, 108, ?', answer: '324', hint: 'Multiply by 3 each time.' }
        ] : [
          { prompt: 'Next in: 2, 4, 8, 16, ?', answer: '32', hint: 'Each number doubles.' },
          { prompt: 'Next in: 1, 3, 6, 10, ?', answer: '15', hint: 'Add 2, 3, 4, 5...' },
          { prompt: 'Next in: 5, 10, 20, 40, ?', answer: '80', hint: 'Multiply by 2 each time.' },
          { prompt: 'Next in: 7, 14, 21, 28, ?', answer: '35', hint: 'Add 7 each time.' }
        ];
        const p = patterns[Math.floor(Math.random() * patterns.length)];
        challengeData = { title: `🔢 Gemini AI Logic & Pattern (${difficulty})`, ...p };
      } else if (theme.includes('Quick') || theme.includes('Reflex')) {
        const max = diff === 'beginner' ? 25 : diff === 'easy' ? 45 : diff === 'hard' ? 120 : diff === 'expert' ? 250 : 70;
        const a = Math.floor(5 + Math.random() * max);
        const b = Math.floor(3 + Math.random() * max);
        challengeData = {
          title: `⚡ Gemini AI Quick Reflexes (${difficulty})`,
          prompt: `Quick! Type the SUM: ${a} + ${b} = ?`,
          answer: (a + b).toString(),
          hint: `Add ${a} and ${b} together.`
        };
      } else {
        challengeData = {
          title: `🤖 Gemini AI Cognitive Challenge (${difficulty})`,
          prompt: 'Solve: (15 × 3) − 10 = ?',
          answer: '35',
          hint: '15 × 3 = 45, then subtract 10.'
        };
      }

      // If prompt is not in solvedQuestions list, break and use this challenge
      if (!solvedQuestions.includes(challengeData.prompt)) {
        break;
      }
    }

    res.json({ success: true, challenge: challengeData, source: 'local' });
  } catch (error) {
    res.status(500).json({ message: 'Error generating challenge: ' + error.message });
  }
});

// Helper to ensure valid foreign key user_id
const getValidUserId = async (reqUserId) => {
  if (reqUserId) {
    const check = await pool.query('SELECT id FROM users WHERE id = $1', [reqUserId]);
    if (check.rows.length > 0) return check.rows[0].id;
  }
  const firstUser = await pool.query('SELECT id FROM users ORDER BY id ASC LIMIT 1');
  return firstUser.rows.length > 0 ? firstUser.rows[0].id : 15;
};

// ─── ALARM SESSIONS (HISTORY) APIS ───

// GET /api/alarm-sessions?userId=X — Fetch alarm history for a specific user
app.get('/api/alarm-sessions', verifyToken, async (req, res) => {
  try {
    const userId = req.userId || req.query.userId || 20;
    const dbRes = await pool.query(`
      SELECT
        s.id, s.alarm_id, s.user_id,
        COALESCE(s.alarm_title, a.title, 'Cognitive Alarm') AS alarm_title,
        COALESCE(s.alarm_time, a.alarm_time, '06:30 AM') AS alarm_time,
        COALESCE(s.alarm_type, a.alarm_type, 'Daily') AS alarm_type,
        s.snooze_count, s.status,
        s.question, s.correct_answer, s.user_answer,
        s.challenge_theme, s.difficulty,
        s.challenge_solved, s.completion_time,
        s.wakefulness_rating,
        s.created_at
      FROM alarm_sessions s
      LEFT JOIN alarms a ON s.alarm_id = a.id
      WHERE s.user_id = $1
      ORDER BY s.created_at DESC
      LIMIT 100
    `, [userId]);
    res.json({ sessions: dbRes.rows, count: dbRes.rows.length });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching alarm sessions: ' + error.message });
  }
});

// GET /api/alarm-sessions/all — Fetch ALL users' alarm sessions (coach/admin view — real-time platform-wide)
app.get('/api/alarm-sessions/all', verifyToken, async (req, res) => {
  try {
    const dbRes = await pool.query(`
      SELECT
        s.id, s.alarm_id, s.user_id,
        u.name  AS user_name,
        u.email AS user_email,
        COALESCE(s.alarm_title, a.title, 'Cognitive Alarm') AS alarm_title,
        COALESCE(s.alarm_time, a.alarm_time, '06:30 AM') AS alarm_time,
        COALESCE(s.alarm_type, a.alarm_type, 'Daily') AS alarm_type,
        s.snooze_count, s.status,
        s.question, s.correct_answer, s.user_answer,
        s.challenge_theme, s.difficulty,
        s.challenge_solved, s.completion_time,
        s.created_at
      FROM alarm_sessions s
      JOIN  users u ON s.user_id  = u.id
      LEFT JOIN alarms a ON s.alarm_id = a.id
      ORDER BY s.created_at DESC
      LIMIT 100
    `);
    res.json({ sessions: dbRes.rows, count: dbRes.rows.length });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching all alarm sessions: ' + error.message });
  }
});

// POST /api/alarm-sessions — Record an alarm session (dismiss/snooze event)
app.post('/api/alarm-sessions', verifyToken, async (req, res) => {
  try {
    const {
      alarm_id, user_id,
      alarm_title, alarm_time, alarm_type,
      snooze_count = 0, status = 'Dismissed',
      question, correct_answer, user_answer,
      challenge_theme, difficulty, challenge_solved, completion_time,
      wakefulness_rating
    } = req.body;

    const targetUserId = req.userId || user_id || 20;

    // Try to add wakefulness_rating column if it doesn't exist yet
    try {
      await pool.query(`ALTER TABLE alarm_sessions ADD COLUMN IF NOT EXISTS wakefulness_rating INTEGER`);
    } catch (_) {}

    const dbRes = await pool.query(
      `INSERT INTO alarm_sessions
        (alarm_id, user_id, alarm_title, alarm_time, alarm_type, snooze_count, status,
         question, correct_answer, user_answer,
         challenge_theme, difficulty, challenge_solved, completion_time, wakefulness_rating)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING *`,
      [
        alarm_id || null, targetUserId,
        alarm_title || 'Cognitive Alarm',
        alarm_time || '06:30 AM',
        alarm_type || 'Daily',
        snooze_count, status,
        question, correct_answer, user_answer,
        challenge_theme, difficulty, challenge_solved, completion_time,
        wakefulness_rating || null
      ]
    );
    let difficultyAdjusted = false;
    let newDifficulty = null;
    let adjustmentReason = null;

    if (challenge_solved && alarm_id) {
      try {
        // Fetch last 3 solved sessions for this alarm
        const pastSessions = await pool.query(
          `SELECT completion_time, snooze_count, difficulty
           FROM alarm_sessions
           WHERE alarm_id = $1 AND challenge_solved = true
           ORDER BY id DESC LIMIT 3`,
          [alarm_id]
        );
        
        if (pastSessions.rows.length === 3) {
          const avgTime = pastSessions.rows.reduce((sum, row) => sum + (parseInt(row.completion_time) || 0), 0) / 3;
          const totalSnoozes = pastSessions.rows.reduce((sum, row) => sum + (parseInt(row.snooze_count) || 0), 0);
          const currentDiff = pastSessions.rows[0].difficulty;

          // Upgrade if very fast and no snoozes
          if (avgTime < 15 && totalSnoozes === 0) {
            const diffMap = { 'Beginner': 'Easy', 'Easy': 'Medium', 'Medium': 'Hard', 'Hard': 'Expert' };
            if (diffMap[currentDiff]) {
              newDifficulty = diffMap[currentDiff];
              difficultyAdjusted = true;
              adjustmentReason = `Upgraded to ${newDifficulty} (Fast average solve time: ${avgTime.toFixed(1)}s)`;
            }
          }
          // Downgrade if struggling (e.g., avg time > 60s or total snoozes > 3)
          else if (avgTime > 60 || totalSnoozes > 3) {
             const downDiffMap = { 'Expert': 'Hard', 'Hard': 'Medium', 'Medium': 'Easy', 'Easy': 'Beginner' };
             if (downDiffMap[currentDiff]) {
               newDifficulty = downDiffMap[currentDiff];
               difficultyAdjusted = true;
               adjustmentReason = `Downgraded to ${newDifficulty} (Struggling to solve, take it easy!)`;
             }
          }

          if (difficultyAdjusted) {
            await pool.query('UPDATE alarms SET difficulty_level = $1 WHERE id = $2', [newDifficulty, alarm_id]);
          }
        }
      } catch (err) {
        console.warn('Difficulty adjustment failed:', err.message);
      }
    }

    // Auto-sync Weighted Scoring Model for this user in PostgreSQL
    try {
      await syncUserWeightedScoringModel(targetUserId);
    } catch (_) {}

    res.status(201).json({ success: true, session: dbRes.rows[0], difficultyAdjusted, newDifficulty, adjustmentReason });
  } catch (error) {
    res.status(500).json({ message: 'Error recording alarm session: ' + error.message });
  }
});

// ─── MODULE 8: WEIGHTED SCORING MODEL APIS (PER DAY ROWS) ───

// GET /api/user/weighted-scoring-model — Fetch user's daily rows from PostgreSQL
app.get('/api/user/weighted-scoring-model', verifyToken, async (req, res) => {
  try {
    const userId = req.userId || req.query.userId || 20;

    // Ensure today's row exists
    await syncUserWeightedScoringModel(userId);

    const dbRes = await pool.query(
      `SELECT * FROM "Weighted Scoring Model" WHERE user_id = $1 ORDER BY score_date DESC LIMIT 30`,
      [userId]
    );

    const dailyHistory = dbRes.rows;
    const todayRow = dailyHistory[0] || null;

    res.json({
      success: true,
      dailyHistory,
      today: todayRow,
      model: todayRow
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching Weighted Scoring Model: ' + error.message });
  }
});

// POST /api/user/weighted-scoring-model/sync — Re-calculate today & save to PostgreSQL
app.post('/api/user/weighted-scoring-model/sync', verifyToken, async (req, res) => {
  try {
    const userId = req.userId || req.body?.userId || req.query.userId || 20;

    // Recalculate today
    await syncUserWeightedScoringModel(userId);

    const dbRes = await pool.query(
      `SELECT * FROM "Weighted Scoring Model" WHERE user_id = $1 ORDER BY score_date DESC LIMIT 30`,
      [userId]
    );

    const dailyHistory = dbRes.rows;
    const todayRow = dailyHistory[0] || null;

    res.json({
      success: true,
      message: 'Daily Weighted Scoring Model successfully recalculated and saved to PostgreSQL table "Weighted Scoring Model"!',
      dailyHistory,
      today: todayRow,
      model: todayRow
    });
  } catch (error) {
    res.status(500).json({ message: 'Error syncing Weighted Scoring Model: ' + error.message });
  }
});

// Helper: Generate tailored recommendations dynamically based on Weekly Analysis of Weighted Scoring Model
const generateRecommendationsFromModel = (model) => {
  const habitScore = Number(model?.habit_score || 85);
  const wakeUpConsistency = Number(model?.wake_up_consistency || 85);
  const challengeSuccess = Number(model?.challenge_completion_success || 90);
  const snoozeReduction = Number(model?.snooze_reduction || 88);
  const sleepAdherence = Number(model?.sleep_schedule_adherence || 92);
  const totalSessions = Number(model?.total_sessions || 0);
  const totalSnoozes = Number(model?.total_snoozes || 0);
  const solvedCount = Number(model?.solved_count || 0);

  const pool = [];

  // 1. Wake-Up Consistency (35% weight in Weighted Scoring Model)
  if (wakeUpConsistency < 80) {
    pool.push({
      id: 'rec-wake-anchor',
      category: 'wake_up',
      icon: '⏰',
      title: 'Circadian Wake Anchor Protocol',
      description: `Your 7-day wake-up consistency is currently ${Math.round(wakeUpConsistency)}%. Establishing a fixed wake-up time within a 15-minute window daily stabilizes circadian rhythms and eliminates morning brain fog.`,
      metricBadge: `Weekly Wake: ${Math.round(wakeUpConsistency)}% (Target: ≥85%)`,
      analysisTag: 'Weekly Weighted Scoring',
      priority: 1
    });
  } else {
    pool.push({
      id: 'rec-peak-focus',
      category: 'wake_up',
      icon: '🎯',
      title: 'Peak Focus Window Allocation (09:00 AM – 11:30 AM)',
      description: `With an impressive ${Math.round(wakeUpConsistency)}% 7-day wake-up consistency, your post-wakeup cognitive curve peaks 2.5 hours after waking. Block your most demanding deep work, coding, and architectural design tasks inside this 09:00 AM – 11:30 AM window.`,
      metricBadge: `Weekly Wake: ${Math.round(wakeUpConsistency)}% (Peak Tier)`,
      analysisTag: 'Weekly Weighted Scoring',
      priority: 4
    });
  }

  // 2. Snooze Reduction (20% weight in Weighted Scoring Model)
  if (snoozeReduction < 80 || totalSnoozes >= 2) {
    pool.push({
      id: 'rec-snooze-barrier',
      category: 'snooze',
      icon: '💤',
      title: 'Snooze Elimination & Barrier Protocol',
      description: `Weekly snooze resistance is at ${Math.round(snoozeReduction)}% (${totalSnoozes} total snoozes in past 7 days). Place your alarm across the room to force physical movement before solving the cognitive challenge.`,
      metricBadge: `Weekly Snooze Red.: ${Math.round(snoozeReduction)}% (${totalSnoozes} snoozes)`,
      analysisTag: 'Weekly Weighted Scoring',
      priority: 2
    });
  } else {
    pool.push({
      id: 'rec-sunlight-hydration',
      category: 'snooze',
      icon: '☀️',
      title: 'Early Sunlight & Neural Hydration Protocol',
      description: `Exceptional weekly snooze resistance (${Math.round(snoozeReduction)}%)! Get 10–15 minutes of natural sunlight within 20 minutes of waking and drink 500ml of water. This terminates residual melatonin and boosts puzzle reaction speed by 18%.`,
      metricBadge: `Weekly Snooze Red.: ${Math.round(snoozeReduction)}% (Optimal)`,
      analysisTag: 'Weekly Weighted Scoring',
      priority: 5
    });
  }

  // 3. Challenge Completion Success (25% weight in Weighted Scoring Model)
  if (challengeSuccess < 80) {
    pool.push({
      id: 'rec-challenge-calibrate',
      category: 'challenge',
      icon: '🧩',
      title: 'Adaptive Cognitive Challenge Calibration',
      description: `Your 7-day challenge solve rate is ${Math.round(challengeSuccess)}%. Switch to Math or Memory challenges on 'Easy' difficulty to build quick dopamine reinforcement upon waking.`,
      metricBadge: `Weekly Solve Rate: ${Math.round(challengeSuccess)}%`,
      analysisTag: 'Weekly Weighted Scoring',
      priority: 3
    });
  } else {
    pool.push({
      id: 'rec-challenge-tier',
      category: 'challenge',
      icon: '🧠',
      title: 'Progressive Challenge Tier Optimization',
      description: `Your high ${Math.round(challengeSuccess)}% weekly solve rate (${solvedCount} puzzles solved) indicates readiness for 'Hard' or 'Expert' difficulty. Increasing challenge complexity in Create Alarm eliminates sleep inertia in under 2 minutes.`,
      metricBadge: `Weekly Solve Rate: ${Math.round(challengeSuccess)}%`,
      analysisTag: 'Weekly Weighted Scoring',
      priority: 6
    });
  }

  // 4. Sleep Adherence / Habit Score Support (20% weight)
  if (sleepAdherence < 88) {
    pool.push({
      id: 'rec-sleep-buffer',
      category: 'sleep',
      icon: '🌙',
      title: 'Pre-Sleep Digital Wind-Down Buffer',
      description: `Weekly sleep schedule adherence is ${Math.round(sleepAdherence)}%. Dim screens and engage night mode 45 minutes before bedtime to foster deep restorative sleep cycles.`,
      metricBadge: `Weekly Sleep Adherence: ${Math.round(sleepAdherence)}%`,
      analysisTag: 'Weekly Weighted Scoring',
      priority: 2.5
    });
  }

  if (habitScore < 70) {
    pool.push({
      id: 'rec-habit-acceleration',
      category: 'habit',
      icon: '🚀',
      title: 'Habit Score Acceleration Sprint',
      description: `Weekly Habit Score average is ${Math.round(habitScore)}/100. Dismissing your first alarm tomorrow on time without snoozing will trigger a significant upward swing in your Weighted Scoring Model.`,
      metricBadge: `Weekly Habit Score: ${Math.round(habitScore)}/100`,
      analysisTag: 'Weekly Weighted Scoring',
      priority: 0.5
    });
  }

  // Sort by priority (lower number = more urgent / higher relevance)
  pool.sort((a, b) => a.priority - b.priority);

  const styles = [
    { bgColor: '#ebf8ff', borderColor: '#3182ce', titleColor: '#1a365d', textColor: '#2b6cb0' },
    { bgColor: '#f0fff4', borderColor: '#38a169', titleColor: '#22543d', textColor: '#2f855a' },
    { bgColor: '#faf5ff', borderColor: '#805ad5', titleColor: '#553c9e', textColor: '#6b46c1' }
  ];

  return pool.slice(0, 3).map((rec, idx) => ({
    ...rec,
    stepNumber: idx + 1,
    titleWithStep: `${idx + 1}. ${rec.title}`,
    style: styles[idx] || styles[0]
  }));
};

// GET /api/user/recommendations — Fetch dynamic recommendations triggered by Weekly Analysis of Weighted Scoring Model
app.get('/api/user/recommendations', verifyToken, async (req, res) => {
  try {
    const userId = req.userId || req.query.userId || 20;

    // 1. Query past 7 days of raw alarm sessions
    const weeklySessionsRes = await pool.query(
      `SELECT 
         COUNT(*) as total_sessions,
         COUNT(*) FILTER (WHERE status = 'Dismissed') as dismissed_count,
         COUNT(*) FILTER (WHERE challenge_solved = true) as solved_count,
         COALESCE(SUM(snooze_count), 0) as total_snoozes
       FROM alarm_sessions
       WHERE user_id = $1
         AND created_at >= NOW() - INTERVAL '7 days'`,
      [userId]
    );

    // 2. Query past 7 days from "Weighted Scoring Model" table
    const weeklyWsmRes = await pool.query(
      `SELECT 
         AVG(habit_score) as avg_habit,
         AVG(wake_up_consistency) as avg_wake,
         AVG(challenge_completion_success) as avg_challenge,
         AVG(snooze_reduction) as avg_snooze,
         AVG(sleep_schedule_adherence) as avg_sleep,
         SUM(total_sessions) as sum_sessions,
         SUM(total_snoozes) as sum_snoozes,
         SUM(solved_count) as sum_solved,
         COUNT(*) as row_count
       FROM "Weighted Scoring Model"
       WHERE user_id = $1
         AND score_date >= CURRENT_DATE - INTERVAL '7 days'`,
      [userId]
    );

    const sRow = weeklySessionsRes.rows[0];
    const wRow = weeklyWsmRes.rows[0];
    const totalSessions = parseInt(sRow?.total_sessions || 0, 10);

    let weeklyModel = null;

    if (totalSessions > 0) {
      const dismissed = parseInt(sRow.dismissed_count || 0, 10);
      const solved = parseInt(sRow.solved_count || 0, 10);
      const snoozes = parseInt(sRow.total_snoozes || 0, 10);

      const wakeUpConsistency = Math.round((dismissed / totalSessions) * 100);
      const challengeSuccess = Math.round((solved / totalSessions) * 100);
      const snoozeReduction = Math.max(20, Math.round(100 - (snoozes * 15)));
      const sleepAdherence = 92.0;
      const habitScore = Math.round(
        (wakeUpConsistency * 0.35) +
        (challengeSuccess * 0.25) +
        (snoozeReduction * 0.20) +
        (sleepAdherence * 0.20)
      );

      weeklyModel = {
        habit_score: habitScore,
        wake_up_consistency: wakeUpConsistency,
        challenge_completion_success: challengeSuccess,
        snooze_reduction: snoozeReduction,
        sleep_schedule_adherence: sleepAdherence,
        total_sessions: totalSessions,
        total_snoozes: snoozes,
        solved_count: solved,
        analysis_basis: '7-Day Weekly Alarm Sessions'
      };
    } else if (wRow && wRow.row_count > 0 && wRow.avg_habit !== null) {
      weeklyModel = {
        habit_score: Math.round(Number(wRow.avg_habit)),
        wake_up_consistency: Math.round(Number(wRow.avg_wake)),
        challenge_completion_success: Math.round(Number(wRow.avg_challenge)),
        snooze_reduction: Math.round(Number(wRow.avg_snooze)),
        sleep_schedule_adherence: Math.round(Number(wRow.avg_sleep)),
        total_sessions: parseInt(wRow.sum_sessions || 0, 10),
        total_snoozes: parseInt(wRow.sum_snoozes || 0, 10),
        solved_count: parseInt(wRow.sum_solved || 0, 10),
        analysis_basis: '7-Day Weighted Scoring Model History'
      };
    } else {
      let modelRes = await pool.query(
        `SELECT * FROM "Weighted Scoring Model" WHERE user_id = $1 ORDER BY score_date DESC LIMIT 1`,
        [userId]
      );
      weeklyModel = modelRes.rows[0] || await syncUserWeightedScoringModel(userId);
      weeklyModel.analysis_basis = 'Latest Weighted Scoring Baseline';
    }

    const recommendations = generateRecommendationsFromModel(weeklyModel);

    res.json({
      success: true,
      analysisPeriod: 'Weekly Analysis (Last 7 Days)',
      recommendations,
      count: recommendations.length,
      weeklyModel,
      model: weeklyModel
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching weekly recommendations: ' + err.message });
  }
});




// ─── MODULE 3: ALARM SCHEDULING SYSTEM APIS ───

// 1. GET /api/alarms — List alarms for user
app.get('/api/alarms', verifyToken, async (req, res) => {
  try {
    const userId = req.userId || req.query.userId || 20;
    const dbRes = await pool.query('SELECT * FROM alarms WHERE user_id = $1 ORDER BY id DESC', [userId]);
    res.json({ alarms: dbRes.rows, count: dbRes.rows.length });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching alarms: ' + error.message });
  }
});

// 2. POST /api/alarms — Create new alarm
app.post('/api/alarms', verifyToken, async (req, res) => {
  try {
    const { title, alarm_time, alarm_type, repeat_days, is_active, difficulty_level, sound, vibration, snooze_interval, challenge_theme } = req.body;
    const targetUserId = req.userId;
    const dbRes = await pool.query(
      `INSERT INTO alarms (user_id, title, alarm_time, alarm_type, repeat_days, is_active, difficulty_level, sound, vibration, snooze_interval, challenge_theme, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()) RETURNING *`,
      [
        targetUserId,
        title || 'Morning Alarm',
        alarm_time || '06:30 AM',
        alarm_type || 'One-Time',
        repeat_days || 'Mon,Tue,Wed,Thu,Fri',
        is_active !== undefined ? is_active : true,
        difficulty_level || 'Medium',
        sound || 'REM Sync',
        vibration !== undefined ? vibration : true,
        snooze_interval || 5,
        challenge_theme || 'Math Challenge'
      ]
    );
    res.status(201).json({ message: 'Alarm created successfully', alarm: dbRes.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'Error creating alarm: ' + error.message });
  }
});

// 3. GET /api/alarms/today — Active alarms for today
app.get('/api/alarms/today', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const dbRes = await pool.query('SELECT * FROM alarms WHERE user_id = $1 AND is_active = TRUE', [userId]);
    res.json({ today_alarms: dbRes.rows, count: dbRes.rows.length });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching today alarms: ' + error.message });
  }
});

// 4. GET /api/alarms/upcoming — Upcoming active alarms
app.get('/api/alarms/upcoming', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const dbRes = await pool.query('SELECT * FROM alarms WHERE user_id = $1 AND is_active = TRUE ORDER BY alarm_time ASC', [userId]);
    res.json({ upcoming_alarms: dbRes.rows, count: dbRes.rows.length });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching upcoming alarms: ' + error.message });
  }
});

// 5. POST /api/alarms/check-next — Smart Adaptive Alarm rule calculation
app.post('/api/alarms/check-next', verifyToken, async (req, res) => {
  try {
    const { userId, sleep_quality_score = 85 } = req.body;
    const targetUserId = userId || 1;
    const dbRes = await pool.query('SELECT * FROM alarms WHERE user_id = $1 AND is_active = TRUE ORDER BY alarm_time ASC LIMIT 1', [targetUserId]);
    
    if (dbRes.rows.length === 0) {
      return res.json({ has_active_alarm: false, message: 'No active alarms found.' });
    }
    
    const alarm = dbRes.rows[0];
    let offset = 0;
    if (sleep_quality_score < 60) offset = 10;
    else if (sleep_quality_score > 90) offset = -10;
    
    res.json({
      has_active_alarm: true,
      alarm_id: alarm.id,
      title: alarm.title,
      base_alarm_time: alarm.alarm_time,
      sleep_quality_score,
      smart_adaptive_offset_minutes: offset,
      rule_applied: `Sleep score ${sleep_quality_score}% -> ${offset > 0 ? '+10 min extra rest' : offset < 0 ? '-10 min peak window' : 'Standard trigger'}`
    });
  } catch (error) {
    res.status(500).json({ message: 'Error calculating next alarm: ' + error.message });
  }
});

// 6. GET /api/alarms/:id — Get alarm details by ID
app.get('/api/alarms/:id', verifyToken, async (req, res) => {
  try {
    const dbRes = await pool.query('SELECT * FROM alarms WHERE id = $1', [req.params.id]);
    if (dbRes.rows.length === 0) return res.status(404).json({ message: 'Alarm not found' });
    res.json({ alarm: dbRes.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching alarm: ' + error.message });
  }
});

// 7. PUT /api/alarms/:id — Update alarm
app.put('/api/alarms/:id', verifyToken, async (req, res) => {
  try {
    const { title, alarm_time, alarm_type, repeat_days, is_active, difficulty_level, sound, vibration, snooze_interval } = req.body;
    const dbRes = await pool.query(
      `UPDATE alarms 
       SET title = COALESCE($1, title),
           alarm_time = COALESCE($2, alarm_time),
           alarm_type = COALESCE($3, alarm_type),
           repeat_days = COALESCE($4, repeat_days),
           is_active = COALESCE($5, is_active),
           difficulty_level = COALESCE($6, difficulty_level),
           sound = COALESCE($7, sound),
           vibration = COALESCE($8, vibration),
           snooze_interval = COALESCE($9, snooze_interval),
           updated_at = NOW()
       WHERE id = $10 RETURNING *`,
      [title, alarm_time, alarm_type, repeat_days, is_active, difficulty_level, sound, vibration, snooze_interval, req.params.id]
    );
    if (dbRes.rows.length === 0) return res.status(404).json({ message: 'Alarm not found' });
    res.json({ message: 'Alarm updated successfully', alarm: dbRes.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'Error updating alarm: ' + error.message });
  }
});

// 8. DELETE /api/alarms/:id — Delete alarm
app.delete('/api/alarms/:id', verifyToken, async (req, res) => {
  try {
    const dbRes = await pool.query('DELETE FROM alarms WHERE id = $1 RETURNING id', [req.params.id]);
    if (dbRes.rows.length === 0) return res.status(404).json({ message: 'Alarm not found' });
    res.json({ message: `Alarm #${req.params.id} deleted successfully`, id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting alarm: ' + error.message });
  }
});

// 9. PATCH /api/alarms/:id/enable — Enable alarm
app.patch('/api/alarms/:id/enable', async (req, res) => {
  try {
    const dbRes = await pool.query('UPDATE alarms SET is_active = TRUE, updated_at = NOW() WHERE id = $1 RETURNING *', [req.params.id]);
    if (dbRes.rows.length === 0) return res.status(404).json({ message: 'Alarm not found' });
    res.json({ message: `Alarm #${req.params.id} enabled`, alarm: dbRes.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'Error enabling alarm: ' + error.message });
  }
});

// 10. PATCH /api/alarms/:id/disable — Disable alarm
app.patch('/api/alarms/:id/disable', async (req, res) => {
  try {
    const dbRes = await pool.query('UPDATE alarms SET is_active = FALSE, updated_at = NOW() WHERE id = $1 RETURNING *', [req.params.id]);
    if (dbRes.rows.length === 0) return res.status(404).json({ message: 'Alarm not found' });
    res.json({ message: `Alarm #${req.params.id} disabled`, alarm: dbRes.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'Error disabling alarm: ' + error.message });
  }
});


// ─── MODULE: ANALYTICS & ENGAGEMENT ───

// GET /api/analytics/learning-patterns
app.get('/api/analytics/learning-patterns', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const dbRes = await pool.query(`
      SELECT challenge_theme, 
             COUNT(*) as total_attempts,
             SUM(CASE WHEN challenge_solved = true THEN 1 ELSE 0 END) as solved_count,
             AVG(CASE WHEN challenge_solved = true THEN completion_time ELSE NULL END) as avg_time
      FROM alarm_sessions
      WHERE user_id = $1 AND challenge_theme IS NOT NULL
      GROUP BY challenge_theme
    `, [userId]);
    
    // Add insights
    const insights = [];
    const stats = dbRes.rows;
    if (stats.length > 0) {
      const best = stats.reduce((prev, curr) => (curr.solved_count/curr.total_attempts) > (prev.solved_count/prev.total_attempts) ? curr : prev);
      insights.push(`Your strongest area is ${best.challenge_theme} with ${(best.solved_count/best.total_attempts*100).toFixed(0)}% accuracy.`);
      
      const fastest = stats.filter(s => s.avg_time).sort((a,b) => a.avg_time - b.avg_time)[0];
      if (fastest) {
        insights.push(`You solve ${fastest.challenge_theme} fastest, averaging ${parseFloat(fastest.avg_time).toFixed(1)}s.`);
      }
    }
    
    res.json({ stats: dbRes.rows, insights });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching learning patterns' });
  }
});

// GET /api/analytics/engagement
app.get('/api/analytics/engagement', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    // Simplified streak: just check if they solved an alarm in the last 24h
    const recentRes = await pool.query(`
      SELECT MAX(created_at) as last_solve 
      FROM alarm_sessions 
      WHERE user_id = $1 AND challenge_solved = true
    `, [userId]);
    
    const lastSolve = recentRes.rows[0].last_solve;
    let streak = 0;
    if (lastSolve) {
       const daysSince = (new Date() - new Date(lastSolve)) / (1000 * 60 * 60 * 24);
       if (daysSince < 2) streak = 3; // mock streak for demo purposes based on recent activity
    }

    // Check if they have an active alarm for tomorrow
    const nextAlarm = await pool.query(`
      SELECT id FROM alarms WHERE user_id = $1 AND is_active = true LIMIT 1
    `, [userId]);
    
    const hasNextAlarm = nextAlarm.rows.length > 0;
    const nudge = hasNextAlarm ? null : "Keep your streak alive! Set an active alarm for tomorrow.";
    
    res.json({ streak, nudge, lastSolve });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching engagement stats' });
  }
});

app.listen(PORT, async () => {
  console.log(`🚀 CogniWell Auth Server connected to PostgreSQL running on http://localhost:${PORT}`);
  await initWeightedScoringModelTable();
});

