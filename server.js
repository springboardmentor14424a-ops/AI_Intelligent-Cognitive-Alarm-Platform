require('dotenv').config();
const http = require('node:http');
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');
const { validateRegistrationInput, hashPassword, createToken, verifyToken, isValidEmail } = require('./auth');

const PORT = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET || 'dev-secret';
const dbName = process.env.DB_NAME || 'ai_cognitive_alarm';
const userStorePath = path.join(__dirname, 'users.json');
let memoryUsers = [];

function loadUserStore() {
  try {
    if (fs.existsSync(userStorePath)) {
      const raw = fs.readFileSync(userStorePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        memoryUsers = parsed;
      }
    }
  } catch (error) {
    memoryUsers = [];
  }
}

function saveUserStore() {
  try {
    fs.writeFileSync(userStorePath, JSON.stringify(memoryUsers, null, 2));
  } catch (error) {
    console.warn('Could not persist auth users:', error.message);
  }
}

loadUserStore();

let pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: dbName,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || ''
});
let dbReady = false;
let dbInitPromise = null;

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (error) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function getGoogleRedirectUri(req) {
  const hostHeader = req.headers.host || 'localhost:3000';
  const forwardedProto = (req.headers['x-forwarded-proto'] || 'http').split(',')[0];
  const protocol = forwardedProto === 'https' ? 'https' : 'http';
  const runtimeRedirectUri = `${protocol}://${hostHeader}/api/auth/google/callback`;

  if (!process.env.GOOGLE_REDIRECT_URI) {
    return runtimeRedirectUri;
  }

  try {
    const configuredUrl = new URL(process.env.GOOGLE_REDIRECT_URI);
    if (configuredUrl.pathname === '/api/auth/google/callback') {
      return process.env.GOOGLE_REDIRECT_URI;
    }
  } catch (error) {
    console.warn('Invalid GOOGLE_REDIRECT_URI in .env:', error.message);
  }

  return runtimeRedirectUri;
}

function buildGoogleAuthUrl(req) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = getGoogleRedirectUri(req);
  const scope = encodeURIComponent('openid email profile');
  return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId || '')}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
}

function getMimeType(filePath) {
  switch (path.extname(filePath)) {
    case '.html': return 'text/html; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.js': return 'application/javascript; charset=utf-8';
    default: return 'application/octet-stream';
  }
}

function serveStatic(req, res) {
  const requestPath = req.url.split('?')[0] || '/';
  const normalizedPath = requestPath === '/' ? '/index.html' : requestPath;

  if (normalizedPath === '/favicon.ico') {
    res.writeHead(204, { 'Content-Type': 'image/x-icon' });
    res.end();
    return;
  }

  const filePath = path.join(__dirname, normalizedPath);

  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403); res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404); res.end('Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': getMimeType(filePath) });
    res.end(content);
  });
}

async function initDb() {
  if (dbReady) {
    return;
  }

  if (dbInitPromise) {
    return dbInitPromise;
  }

  dbInitPromise = (async () => {
    const password = process.env.DB_PASSWORD || '';

    try {
      const adminPool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT || 5432),
        database: 'postgres',
        user: process.env.DB_USER || 'postgres',
        password
      });

      try {
        await adminPool.query('SELECT 1');
        const dbExists = await adminPool.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
        if (dbExists.rowCount === 0) {
          await adminPool.query(`CREATE DATABASE "${dbName}"`);
        }
      } finally {
        await adminPool.end();
      }

      if (pool) {
        await pool.end();
      }

      pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT || 5432),
        database: dbName,
        user: process.env.DB_USER || 'postgres',
        password
      });

      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          role VARCHAR(30) NOT NULL DEFAULT 'USER',
          provider VARCHAR(20) NOT NULL DEFAULT 'LOCAL',
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);

      for (const user of memoryUsers) {
        const existing = await pool.query('SELECT id FROM users WHERE lower(email) = lower($1)', [user.email]);
        if (existing.rowCount === 0) {
          await pool.query(
            `INSERT INTO users (name, email, password, role, provider, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [user.name, user.email, user.password, user.role, user.provider]
          );
        }
      }

      dbReady = true;
    } catch (error) {
      console.warn('PostgreSQL unavailable, using in-memory fallback:', error.message);
      dbReady = false;
    }
  })();

  return dbInitPromise;
}

async function ensureAuthStoreReady() {
  await initDb();
}

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (!token) {
    sendJson(res, 401, { error: 'Authorization token missing.' });
    return;
  }

  try {
    const payload = verifyToken(token, SECRET);
    req.user = payload;
    await next();
  } catch (error) {
    sendJson(res, 401, { error: error.message });
  }
}

const server = http.createServer(async (req, res) => {
  if (!server.dbInitialized) {
    server.dbInitialized = true;
    initDb().catch(() => {});
  }

  if (req.url.startsWith('/api/auth/')) {
    await ensureAuthStoreReady();
    const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = requestUrl.pathname;

    if (pathname === '/api/auth/register' && req.method === 'POST') {
      try {
        const body = await readBody(req);
        const validation = validateRegistrationInput(body);
        if (!validation.ok) {
          sendJson(res, 400, { error: validation.error });
          return;
        }

        if (dbReady) {
          const existing = await pool.query('SELECT id FROM users WHERE lower(email) = lower($1)', [body.email.trim()]);
          if (existing.rowCount > 0) {
            sendJson(res, 409, { error: 'An account with that email already exists.' });
            return;
          }

          const insertResult = await pool.query(
            `INSERT INTO users (name, email, password, role, provider, created_at, updated_at)
             VALUES ($1, $2, $3, $4, 'LOCAL', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
             RETURNING id, name, email, role, provider`,
            [body.name.trim(), body.email.trim().toLowerCase(), hashPassword(body.password), body.role || 'USER']
          );

          const user = insertResult.rows[0];
          const token = createToken({ id: user.id, email: user.email, role: user.role }, SECRET);
          sendJson(res, 201, { message: 'Registration successful', token, user: { id: user.id, name: user.name, email: user.email, role: user.role, provider: user.provider } });
          return;
        }

        const existing = memoryUsers.find((user) => user.email.toLowerCase() === body.email.trim().toLowerCase());
        if (existing) {
          sendJson(res, 409, { error: 'An account with that email already exists.' });
          return;
        }

        const user = {
          id: memoryUsers.length + 1,
          name: body.name.trim(),
          email: body.email.trim().toLowerCase(),
          password: hashPassword(body.password),
          role: body.role || 'USER',
          provider: 'LOCAL'
        };
        memoryUsers.push(user);
        saveUserStore();
        const token = createToken({ id: user.id, email: user.email, role: user.role }, SECRET);
        sendJson(res, 201, { message: 'Registration successful', token, user: { id: user.id, name: user.name, email: user.email, role: user.role, provider: user.provider } });
      } catch (error) {
        sendJson(res, 400, { error: error.message });
      }
      return;
    }

    if (pathname === '/api/auth/login' && req.method === 'POST') {
      try {
        const body = await readBody(req);
        if (dbReady) {
          const result = await pool.query('SELECT id, name, email, password, role, provider FROM users WHERE lower(email) = lower($1)', [body.email?.toLowerCase()]);
          const user = result.rows[0];
          if (!user || user.password !== hashPassword(body.password)) {
            sendJson(res, 401, { error: 'Invalid email or password.' });
            return;
          }

          const token = createToken({ id: user.id, email: user.email, role: user.role }, SECRET);
          sendJson(res, 200, { message: 'Login successful', token, user: { id: user.id, name: user.name, email: user.email, role: user.role, provider: user.provider } });
          return;
        }

        const user = memoryUsers.find((entry) => entry.email === body.email?.toLowerCase());
        if (!user || user.password !== hashPassword(body.password)) {
          sendJson(res, 401, { error: 'Invalid email or password.' });
          return;
        }

        const token = createToken({ id: user.id, email: user.email, role: user.role }, SECRET);
        sendJson(res, 200, { message: 'Login successful', token, user: { id: user.id, name: user.name, email: user.email, role: user.role, provider: user.provider } });
      } catch (error) {
        sendJson(res, 400, { error: error.message });
      }
      return;
    }

    if (pathname === '/api/auth/google/start' && req.method === 'GET') {
      const authUrl = buildGoogleAuthUrl(req);
      if (!process.env.GOOGLE_CLIENT_ID) {
        sendJson(res, 500, { error: 'Google OAuth is not configured yet. Set GOOGLE_CLIENT_ID in .env.' });
        return;
      }
      sendJson(res, 200, { authUrl });
      return;
    }

    if (pathname.startsWith('/api/auth/google/callback') && req.method === 'GET') {
      const code = requestUrl.searchParams.get('code');
      const errorParam = requestUrl.searchParams.get('error');
      if (!code) {
        console.warn('Google callback missing code.', { error: errorParam, search: requestUrl.search });
        const redirectLocation = '/?google=cancelled' + (errorParam ? `&error=${encodeURIComponent(errorParam)}` : '');
        res.writeHead(302, { Location: redirectLocation });
        res.end();
        return;
      }

      const redirectUri = getGoogleRedirectUri(req);
      const params = new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      });

      const tokenReq = https.request({
        host: 'oauth2.googleapis.com',
        port: 443,
        path: '/token',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(params.toString())
        }
      }, (tokenRes) => {
        let tokenData = '';
        tokenRes.on('data', (chunk) => { tokenData += chunk; });
        tokenRes.on('end', () => {
          try {
            const tokenPayload = JSON.parse(tokenData);
            if (tokenPayload.error) {
              console.warn('Google token exchange failed.', tokenPayload);
              const location = '/?google=error&error=' + encodeURIComponent(tokenPayload.error_description || tokenPayload.error || 'token_exchange_failed');
              res.writeHead(302, { Location: location });
              res.end();
              return;
            }

            const userReq = https.request({
              host: 'www.googleapis.com',
              port: 443,
              path: '/oauth2/v3/userinfo',
              method: 'GET',
              headers: {
                Authorization: `Bearer ${tokenPayload.access_token}`
              }
            }, (userRes) => {
              let userData = '';
              userRes.on('data', (chunk) => { userData += chunk; });
              userRes.on('end', async () => {
                try {
                  const profile = JSON.parse(userData);
                  const email = profile.email?.trim();
                  const name = profile.name?.trim() || profile.given_name?.trim() || 'Google User';

                  if (!email || !isValidEmail(email)) {
                    res.writeHead(302, { Location: '/?google=invalid&error=' + encodeURIComponent('invalid_email') });
                    res.end();
                    return;
                  }

                  if (dbReady) {
                    let result = await pool.query('SELECT id, name, email, role, provider FROM users WHERE lower(email) = lower($1)', [email.toLowerCase()]);
                    let user = result.rows[0];
                    if (!user) {
                      const insertResult = await pool.query(
                        `INSERT INTO users (name, email, password, role, provider, created_at, updated_at)
                        VALUES ($1, $2, $3, 'USER', 'GOOGLE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                        RETURNING id, name, email, role, provider`,
                        [name, email.toLowerCase(), hashPassword('google-oauth')]
                      );
                      user = insertResult.rows[0];
                    }

                    const token = createToken({ id: user.id, name: user.name, email: user.email, role: user.role }, SECRET);
                    res.writeHead(302, { Location: `/?google=success&token=${encodeURIComponent(token)}` });
                    res.end();
                    return;
                  }

                  let user = memoryUsers.find((entry) => entry.email === email.toLowerCase());
                  if (!user) {
                    user = {
                      id: memoryUsers.length + 1,
                      name,
                      email: email.toLowerCase(),
                      password: hashPassword('google-oauth'),
                      role: 'USER',
                      provider: 'GOOGLE'
                    };
                    memoryUsers.push(user);
                    saveUserStore();
                  }

                  const token = createToken({ id: user.id, name: user.name, email: user.email, role: user.role }, SECRET);
                  res.writeHead(302, { Location: `/?google=success&token=${encodeURIComponent(token)}` });
                  res.end();
                } catch (error) {
                  res.writeHead(302, { Location: '/?google=error' });
                  res.end();
                }
              });
            });

            userReq.on('error', () => {
              res.writeHead(302, { Location: '/?google=error' });
              res.end();
            });
            userReq.end();
          } catch (error) {
            res.writeHead(302, { Location: '/?google=error' });
            res.end();
          }
        });
      });

      tokenReq.on('error', () => {
        const location = '/?google=error&error=' + encodeURIComponent('network_error');
        res.writeHead(302, { Location: location });
        res.end();
      });
      tokenReq.write(params.toString());
      tokenReq.end();
      return;
    }

    if (pathname === '/api/auth/google' && req.method === 'POST') {
      try {
        const body = await readBody(req);
        const email = body.email?.trim();
        const name = body.name?.trim();

        if (!name || !email || !isValidEmail(email)) {
          sendJson(res, 400, { error: 'Please provide a valid Google name and email.' });
          return;
        }

        if (dbReady) {
          let result = await pool.query('SELECT id, name, email, role, provider FROM users WHERE lower(email) = lower($1)', [email.toLowerCase()]);
          let user = result.rows[0];
          if (!user) {
            const insertResult = await pool.query(
              `INSERT INTO users (name, email, password, role, provider, created_at, updated_at)
               VALUES ($1, $2, $3, 'USER', 'GOOGLE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
               RETURNING id, name, email, role, provider`,
              [name, email.toLowerCase(), hashPassword('google-oauth')]
            );
            user = insertResult.rows[0];
          }

          const token = createToken({ id: user.id, email: user.email, role: user.role }, SECRET);
          sendJson(res, 200, { message: 'Google sign-in successful', token, user: { id: user.id, name: user.name, email: user.email, role: user.role, provider: user.provider } });
          return;
        }

        let user = memoryUsers.find((entry) => entry.email === email.toLowerCase());
        if (!user) {
          user = {
            id: memoryUsers.length + 1,
            name,
            email: email.toLowerCase(),
            password: hashPassword('google-oauth'),
            role: 'USER',
            provider: 'GOOGLE'
          };
          memoryUsers.push(user);
          saveUserStore();
        }

        const token = createToken({ id: user.id, email: user.email, role: user.role }, SECRET);
        sendJson(res, 200, { message: 'Google sign-in successful', token, user: { id: user.id, name: user.name, email: user.email, role: user.role, provider: user.provider } });
      } catch (error) {
        sendJson(res, 400, { error: error.message });
      }
      return;
    }

    if (pathname === '/api/auth/profile' && req.method === 'GET') {
      await authMiddleware(req, res, async () => {
        if (dbReady) {
          const result = await pool.query('SELECT id, name, email, role, provider FROM users WHERE id = $1', [req.user.id]);
          const user = result.rows[0];
          if (!user) {
            sendJson(res, 404, { error: 'User not found.' });
            return;
          }
          sendJson(res, 200, { user: { id: user.id, name: user.name, email: user.email, role: user.role, provider: user.provider } });
          return;
        }

        const user = memoryUsers.find((entry) => entry.id === req.user.id);
        if (!user) {
          sendJson(res, 404, { error: 'User not found.' });
          return;
        }
        sendJson(res, 200, { user: { id: user.id, name: user.name, email: user.email, role: user.role, provider: user.provider } });
      });
      return;
    }

    if (pathname === '/api/auth/profile' && req.method === 'PUT') {
      await authMiddleware(req, res, async () => {
        try {
          const body = await readBody(req);
          if (dbReady) {
            const result = await pool.query('SELECT id, name, email, role, provider FROM users WHERE id = $1', [req.user.id]);
            const user = result.rows[0];
            if (!user) {
              sendJson(res, 404, { error: 'User not found.' });
              return;
            }

            const updated = await pool.query(
              `UPDATE users
               SET name = $1, email = $2, updated_at = CURRENT_TIMESTAMP
               WHERE id = $3
               RETURNING id, name, email, role, provider`,
              [body.name?.trim() || user.name, body.email?.trim().toLowerCase() || user.email, req.user.id]
            );
            sendJson(res, 200, { user: updated.rows[0] });
            return;
          }

          const user = memoryUsers.find((entry) => entry.id === req.user.id);
          if (!user) {
            sendJson(res, 404, { error: 'User not found.' });
            return;
          }

          user.name = body.name?.trim() || user.name;
          user.email = body.email?.trim().toLowerCase() || user.email;
          sendJson(res, 200, { user: { id: user.id, name: user.name, email: user.email, role: user.role, provider: user.provider } });
        } catch (error) {
          sendJson(res, 400, { error: error.message });
        }
      });
      return;
    }
  }

  serveStatic(req, res);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    const fallbackPort = Number(process.env.PORT || 3001);
    server.close(() => {
      server.listen(fallbackPort, () => {
        console.log(`Auth server running at http://localhost:${fallbackPort}`);
      });
    });
    return;
  }
  throw error;
});

server.listen(PORT, () => {
  console.log(`Auth server running at http://localhost:${PORT}`);
});
