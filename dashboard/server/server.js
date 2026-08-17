import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'cogniwell_super_secret_jwt_key_2026';

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
    return res.rows[0];
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
app.get('/api/users', async (req, res) => {
  try {
    const dbRes = await pool.query('SELECT id, name, email, role, provider, created_at FROM users ORDER BY created_at DESC');
    res.json({ users: dbRes.rows });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users: ' + error.message });
  }
});

// 5. GET COACH'S ASSIGNED CLIENTS (Coach Dashboard)
app.get('/api/coach/clients/:coachId', async (req, res) => {
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
app.get('/api/admin/assignments', async (req, res) => {
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
app.post('/api/coach/assign', async (req, res) => {
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

// GEMINI AI CHALLENGE GENERATOR FOR ALARM DISMISSAL
app.post('/api/gemini/challenge', async (req, res) => {
  try {
    const { theme = 'Math Challenge', difficulty = 'Medium' } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    // ── Try real Gemini API if key is present ──
    if (apiKey && !apiKey.includes('Demo')) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const geminiPrompt = `Generate a single short cognitive wake-up challenge for the theme: "${theme}" at difficulty "${difficulty}". 
Return ONLY a valid JSON object (no markdown, no explanation) with exactly these keys:
{
  "title": "short title with emoji",
  "prompt": "the question or task shown to user",
  "answer": "the exact expected answer as a string",
  "hint": "one short hint"
}
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

    // ── Local fallback challenge generator ──
    let challengeData = {};
    if (theme.includes('Math')) {
      const num1 = Math.floor(12 + Math.random() * 25);
      const num2 = Math.floor(3 + Math.random() * 12);
      const num3 = Math.floor(5 + Math.random() * 20);
      const ans = (num1 * num2) - num3;
      challengeData = {
        title: '🤖 Gemini AI Math Challenge',
        prompt: `Solve: (${num1} × ${num2}) − ${num3} = ?`,
        answer: ans.toString(),
        hint: `Multiply ${num1} × ${num2} = ${num1 * num2}, then subtract ${num3}.`
      };
    } else if (theme.includes('Memory')) {
      const nums = Array.from({ length: 5 }, () => Math.floor(1 + Math.random() * 9));
      challengeData = {
        title: '🧠 Gemini AI Memory Matrix',
        prompt: `Memorize & type the sequence: ${nums.join(' − ')}`,
        answer: nums.join(''),
        hint: 'Type all 5 digits continuously, no spaces.'
      };
    } else if (theme.includes('Stroop')) {
      const colors = ['RED', 'BLUE', 'GREEN', 'ORANGE', 'YELLOW', 'PURPLE'];
      const c = colors[Math.floor(Math.random() * colors.length)];
      challengeData = {
        title: '🎨 Gemini AI Stroop Focus',
        prompt: `How many letters are in the word "${c}"?`,
        answer: c.length.toString(),
        hint: `Count the letters in ${c}.`
      };
    } else if (theme.includes('Logic') || theme.includes('Pattern')) {
      const patterns = [
        { prompt: 'Next in: 2, 4, 8, 16, ?', answer: '32', hint: 'Each number doubles.' },
        { prompt: 'Next in: 1, 3, 6, 10, ?', answer: '15', hint: 'Add 2, 3, 4, 5...' },
        { prompt: 'Next in: 5, 10, 20, 40, ?', answer: '80', hint: 'Multiply by 2 each time.' }
      ];
      const p = patterns[Math.floor(Math.random() * patterns.length)];
      challengeData = { title: '🔢 Gemini AI Logic & Pattern', ...p };
    } else if (theme.includes('Quick') || theme.includes('Reflex')) {
      const a = Math.floor(10 + Math.random() * 50);
      const b = Math.floor(5 + Math.random() * 30);
      challengeData = {
        title: '⚡ Gemini AI Quick Reflexes',
        prompt: `Quick! Type the SUM: ${a} + ${b} = ?`,
        answer: (a + b).toString(),
        hint: `Add ${a} and ${b} together.`
      };
    } else {
      challengeData = {
        title: '🤖 Gemini AI Cognitive Challenge',
        prompt: 'Solve: (15 × 3) − 10 = ?',
        answer: '35',
        hint: '15 × 3 = 45, then subtract 10.'
      };
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
app.get('/api/alarm-sessions', async (req, res) => {
  try {
    const userId = await getValidUserId(req.query.userId);
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
        s.created_at
      FROM alarm_sessions s
      LEFT JOIN alarms a ON s.alarm_id = a.id
      WHERE s.user_id = $1
      ORDER BY s.created_at DESC
      LIMIT 50
    `, [userId]);
    res.json({ sessions: dbRes.rows, count: dbRes.rows.length });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching alarm sessions: ' + error.message });
  }
});

// GET /api/alarm-sessions/all — Fetch ALL users' alarm sessions (coach/admin view — real-time platform-wide)
app.get('/api/alarm-sessions/all', async (req, res) => {
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
app.post('/api/alarm-sessions', async (req, res) => {
  try {
    const {
      alarm_id, user_id,
      alarm_title, alarm_time, alarm_type,
      snooze_count = 0, status = 'Dismissed',
      question, correct_answer, user_answer,
      challenge_theme, difficulty, challenge_solved, completion_time
    } = req.body;

    const targetUserId = await getValidUserId(user_id);

    const dbRes = await pool.query(
      `INSERT INTO alarm_sessions
        (alarm_id, user_id, alarm_title, alarm_time, alarm_type, snooze_count, status,
         question, correct_answer, user_answer,
         challenge_theme, difficulty, challenge_solved, completion_time)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        alarm_id || null, targetUserId,
        alarm_title || 'Cognitive Alarm',
        alarm_time || '06:30 AM',
        alarm_type || 'Daily',
        snooze_count, status,
        question, correct_answer, user_answer,
        challenge_theme, difficulty, challenge_solved, completion_time
      ]
    );
    res.status(201).json({ success: true, session: dbRes.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'Error recording alarm session: ' + error.message });
  }
});

// ─── MODULE 3: ALARM SCHEDULING SYSTEM APIS ───

// 1. GET /api/alarms — List alarms for user
app.get('/api/alarms', async (req, res) => {
  try {
    const userId = await getValidUserId(req.query.userId);
    const dbRes = await pool.query('SELECT * FROM alarms WHERE user_id = $1 ORDER BY id DESC', [userId]);
    res.json({ alarms: dbRes.rows, count: dbRes.rows.length });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching alarms: ' + error.message });
  }
});

// 2. POST /api/alarms — Create new alarm
app.post('/api/alarms', async (req, res) => {
  try {
    const { user_id, title, alarm_time, alarm_type, repeat_days, is_active, difficulty_level, sound, vibration, snooze_interval, challenge_theme } = req.body;
    const targetUserId = await getValidUserId(user_id);
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
app.get('/api/alarms/today', async (req, res) => {
  try {
    const userId = req.query.userId || 1;
    const dbRes = await pool.query('SELECT * FROM alarms WHERE user_id = $1 AND is_active = TRUE', [userId]);
    res.json({ today_alarms: dbRes.rows, count: dbRes.rows.length });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching today alarms: ' + error.message });
  }
});

// 4. GET /api/alarms/upcoming — Upcoming active alarms
app.get('/api/alarms/upcoming', async (req, res) => {
  try {
    const userId = req.query.userId || 1;
    const dbRes = await pool.query('SELECT * FROM alarms WHERE user_id = $1 AND is_active = TRUE ORDER BY alarm_time ASC', [userId]);
    res.json({ upcoming_alarms: dbRes.rows, count: dbRes.rows.length });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching upcoming alarms: ' + error.message });
  }
});

// 5. POST /api/alarms/check-next — Smart Adaptive Alarm rule calculation
app.post('/api/alarms/check-next', async (req, res) => {
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
app.get('/api/alarms/:id', async (req, res) => {
  try {
    const dbRes = await pool.query('SELECT * FROM alarms WHERE id = $1', [req.params.id]);
    if (dbRes.rows.length === 0) return res.status(404).json({ message: 'Alarm not found' });
    res.json({ alarm: dbRes.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching alarm: ' + error.message });
  }
});

// 7. PUT /api/alarms/:id — Update alarm
app.put('/api/alarms/:id', async (req, res) => {
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
app.delete('/api/alarms/:id', async (req, res) => {
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

app.listen(PORT, () => {
  console.log(`🚀 CogniWell Auth Server connected to PostgreSQL running on http://localhost:${PORT}`);
});

