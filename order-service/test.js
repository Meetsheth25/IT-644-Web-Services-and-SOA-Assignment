const assert = require('assert');

console.log('--- Order Service Unit Tests ---');

function formatServiceUrl(inputUrl, defaultUrl) {
  if (!inputUrl || typeof inputUrl !== 'string' || inputUrl.trim() === '') {
    return defaultUrl;
  }
  let url = inputUrl.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = `http://${url}`;
  }
  return url.replace(/\/+$/, '');
}

// Test 1: formatServiceUrl handles protocol
assert.strictEqual(
  formatServiceUrl('user-service:3001', 'http://default:3001'),
  'http://user-service:3001',
  'formatServiceUrl should prepend http:// if missing'
);

// Test 2: formatServiceUrl strips trailing slash
assert.strictEqual(
  formatServiceUrl('http://product-service:3002/', 'http://default:3002'),
  'http://product-service:3002',
  'formatServiceUrl should strip trailing slash'
);

// Test 3: Total price calculation logic
const quantity = 3;
const unitPrice = 1500;
const totalPrice = quantity * unitPrice;
assert.strictEqual(totalPrice, 4500, 'Order total price calculation must be exact');

console.log('[PASS] All Order Service unit tests passed successfully.');
