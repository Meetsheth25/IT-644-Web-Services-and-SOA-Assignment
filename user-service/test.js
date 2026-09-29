const assert = require('assert');

console.log('--- User Service Unit Tests ---');

function validateUser(data) {
  const errors = [];
  if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
    errors.push('Name is required and cannot be empty.');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!data.email || typeof data.email !== 'string' || !emailRegex.test(data.email.trim())) {
    errors.push('A valid email address is required.');
  }

  return errors;
}

// Test 1: Valid user
const validUser = { name: 'Alice Smith', email: 'alice@example.com', role: 'Student' };
const errors1 = validateUser(validUser);
assert.strictEqual(errors1.length, 0, 'Valid user should produce zero validation errors');

// Test 2: Missing name
const noNameUser = { name: '   ', email: 'alice@example.com' };
const errors2 = validateUser(noNameUser);
assert.ok(errors2.length > 0, 'Missing name must fail validation');

// Test 3: Invalid email format
const badEmailUser = { name: 'Alice', email: 'invalid-email-address' };
const errors3 = validateUser(badEmailUser);
assert.ok(errors3.length > 0, 'Invalid email format must fail validation');

console.log('[PASS] All User Service unit tests passed successfully.');
