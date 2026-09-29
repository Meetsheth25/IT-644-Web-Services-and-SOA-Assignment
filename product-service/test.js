const assert = require('assert');

console.log('--- Product Service Unit Tests ---');

function validateProduct(data) {
  const errors = [];
  if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
    errors.push('Product name is required and cannot be empty.');
  }

  if (data.price === undefined || data.price === null || typeof data.price !== 'number' || data.price <= 0) {
    errors.push('Price is required and must be a positive number.');
  }

  if (!data.category || typeof data.category !== 'string' || data.category.trim() === '') {
    errors.push('Category is required and cannot be empty.');
  }

  if (data.stock !== undefined && (typeof data.stock !== 'number' || !Number.isInteger(data.stock) || data.stock < 0)) {
    errors.push('Stock must be a non-negative integer.');
  }

  return errors;
}

// Test 1: Valid product
const validProduct = { name: 'Mechanical Keyboard', price: 79.99, category: 'Electronics', stock: 25 };
const errors1 = validateProduct(validProduct);
assert.strictEqual(errors1.length, 0, 'Valid product should produce zero errors');

// Test 2: Missing name
const badName = { name: '', price: 50, category: 'Electronics' };
const errors2 = validateProduct(badName);
assert.ok(errors2.length > 0, 'Empty product name must fail validation');

// Test 3: Invalid price (<= 0)
const badPrice = { name: 'Notebook', price: -5, category: 'Stationery' };
const errors3 = validateProduct(badPrice);
assert.ok(errors3.length > 0, 'Negative price must fail validation');

// Test 4: Invalid stock
const badStock = { name: 'Pen', price: 2.5, category: 'Stationery', stock: -1 };
const errors4 = validateProduct(badStock);
assert.ok(errors4.length > 0, 'Negative stock must fail validation');

console.log('[PASS] All Product Service unit tests passed successfully.');
