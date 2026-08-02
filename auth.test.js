const test = require('node:test');
const assert = require('node:assert/strict');
const { validateRegistrationInput, createToken, verifyToken, isValidEmail } = require('../auth');

test('validateRegistrationInput rejects weak passwords', () => {
  const result = validateRegistrationInput({
    name: 'John Doe',
    email: 'john@example.com',
    password: 'weakpass',
    role: 'USER'
  });

  assert.equal(result.ok, false);
  assert.match(result.error, /Password/);
});

test('validateRegistrationInput accepts valid coach role', () => {
  const result = validateRegistrationInput({
    name: 'Jane Doe',
    email: 'jane@example.com',
    password: 'StrongPass123!',
    role: 'WELLNESS_COACH'
  });

  assert.equal(result.ok, true);
  assert.equal(result.error, null);
});

test('isValidEmail rejects invalid email formats', () => {
  assert.equal(isValidEmail('not-an-email'), false);
  assert.equal(isValidEmail('user@example.com'), true);
});

test('createToken and verifyToken round trip a user payload', () => {
  const token = createToken({ id: 7, email: 'test@example.com', role: 'ADMIN' }, 'test-secret');
  const payload = verifyToken(token, 'test-secret');

  assert.equal(payload.email, 'test@example.com');
  assert.equal(payload.role, 'ADMIN');
});
