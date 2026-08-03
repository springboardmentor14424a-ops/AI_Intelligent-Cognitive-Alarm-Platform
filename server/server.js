import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'cogniwell_super_secret_jwt_key_2026';

app.use(cors());
app.use(express.json());

// PostgreSQL Pool Connection Configuration with fast 1s timeout to prevent hanging if DB is offline
const pool = new pg.Pool({
  user: process.env.PGUSER || 'postgres',
  host: process.env.PGHOST || 'localhost',
  database: process.env.PGDATABASE || 'cogniwell_db',
  password: process.env.PGPASSWORD || 'postgres',
  port: process.env.PGPORT || 5432,
  connectionTimeoutMillis: 1000, // 1 second timeout
  idleTimeoutMillis: 1000
});

// In-Memory Database Fallback for smooth execution
let inMemoryUsers = [
  { id: 1, name: 'John Doe', email: 'user@cogniwell.com', password_hash: bcrypt.hashSync('user123', 10), role: 'user', oauth_provider: null, oauth_id: null, avatar_url: 'JD' },
  { id: 2, name: 'Dr. Sarah Wilson', email: 'coach@cogniwell.com', password_hash: bcrypt.hashSync('coach123', 10), role: 'coach', oauth_provider: null, oauth_id: null, avatar_url: 'SW' },
  { id: 3, name: 'Admin User', email: 'admin@cogniwell.com', password_hash: bcrypt.hashSync('admin123', 10), role: 'admin', oauth_provider: null, oauth_id: null, avatar_url: 'AU' }
];

// Helper Functions with instant fallback
const findUserByEmail = async (email) => {
  try {
    const res = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return res.rows[0];
  } catch (err) {
    return inMemoryUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
  }
};

const createUser = async ({ name, email, password, role = 'user', oauthProvider = null, oauthId = null, avatarUrl = null }) => {
  const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
  const avatar = avatarUrl || name.split(' ').map(n => n[0]).join('').toUpperCase();

  try {
    const res = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, oauth_provider, oauth_id, avatar_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, email, hashedPassword, role, oauthProvider, oauthId, avatar]
    );
    return res.rows[0];
  } catch (err) {
    const newUser = {
      id: inMemoryUsers.length + 1,
      name,
      email,
      password_hash: hashedPassword,
      role,
      oauth_provider: oauthProvider,
      oauth_id: oauthId,
      avatar_url: avatar
    };
    inMemoryUsers.push(newUser);
    return newUser;
  }
};

// JWT Middleware
const verifyJWT = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Access token missing or unauthorized' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired JWT token' });
    req.user = user;
    next();
  });
};

// 1. JWT Registration Endpoint
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please fill in all fields (name, email, password).' });
    }

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists.' });
    }

    const user = await createUser({ name, email, password, role: role || 'user' });

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(201).json({
      message: 'Registration successful',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar_url }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Registration failed: ' + error.message });
  }
});

// 2. JWT Login Endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    if (user.password_hash) {
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid email or password.' });
      }
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar_url }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Login failed: ' + error.message });
  }
});

// 3. OAuth Endpoint
app.post('/api/auth/oauth', async (req, res) => {
  try {
    const { provider, providerId, email, name, avatarUrl, role } = req.body;

    if (!email || !provider) {
      return res.status(400).json({ message: 'OAuth provider and email are required.' });
    }

    let user = await findUserByEmail(email);

    if (!user) {
      user = await createUser({
        name: name || 'OAuth User',
        email,
        password: null,
        role: role || 'user',
        oauthProvider: provider,
        oauthId: providerId,
        avatarUrl
      });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, authType: 'OAuth' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      message: `Authenticated via ${provider} OAuth`,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar_url, provider }
    });
  } catch (error) {
    return res.status(500).json({ message: 'OAuth authentication failed: ' + error.message });
  }
});

// 4. Get Current User Profile
app.get('/api/auth/me', verifyJWT, async (req, res) => {
  try {
    const user = await findUserByEmail(req.user.email);
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar_url }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile' });
  }
});

// 5. Get Users List (Admin)
app.get('/api/users', verifyJWT, async (req, res) => {
  try {
    let allUsers = [];
    try {
      const dbRes = await pool.query('SELECT id, name, email, role, oauth_provider, created_at FROM users ORDER BY created_at DESC');
      allUsers = dbRes.rows;
    } catch {
      allUsers = inMemoryUsers;
    }
    res.json({ users: allUsers });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users list' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 CogniWell Auth Server running on http://localhost:${PORT}`);
});
