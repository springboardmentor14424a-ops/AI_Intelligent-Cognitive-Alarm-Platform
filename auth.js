const crypto = require('node:crypto');

const ROLE_VALUES = ['USER', 'WELLNESS_COACH', 'ADMIN'];
const PROVIDER_VALUES = ['LOCAL', 'GOOGLE'];

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function validateRegistrationInput(payload) {
  const { name, email, password, role, provider } = payload || {};

  if (!name || !name.toString().trim()) {
    return { ok: false, error: 'Name is required.' };
  }

  if (!isValidEmail(email)) {
    return { ok: false, error: 'Please provide a valid email address.' };
  }

  if (!password || password.length < 8) {
    return { ok: false, error: 'Password must be at least 8 characters long.' };
  }

  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { ok: false, error: 'Password must include uppercase, lowercase, number, and special characters.' };
  }

  if (role && !ROLE_VALUES.includes(role)) {
    return { ok: false, error: 'Role must be USER, WELLNESS_COACH, or ADMIN.' };
  }

  if (provider && !PROVIDER_VALUES.includes(provider)) {
    return { ok: false, error: 'Provider must be LOCAL or GOOGLE.' };
  }

  return { ok: true, error: null };
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function createToken(payload, secret) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyToken(token, secret) {
  if (!token) {
    throw new Error('Token is required.');
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token format.');
  }

  const [header, body, signature] = parts;
  const expectedSignature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    throw new Error('Invalid token signature.');
  }

  return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
}

module.exports = {
  ROLE_VALUES,
  PROVIDER_VALUES,
  isValidEmail,
  validateRegistrationInput,
  hashPassword,
  createToken,
  verifyToken
};