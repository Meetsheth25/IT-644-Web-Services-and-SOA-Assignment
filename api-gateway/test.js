const assert = require('assert');
const { formatServiceUrl, loadConfig } = require('./config');

console.log('--- API Gateway Unit Tests ---');

// Test 1: formatServiceUrl handles protocol
assert.strictEqual(
  formatServiceUrl('localhost:3001', 'http://default:3001'),
  'http://localhost:3001',
  'formatServiceUrl should prepend http:// if missing'
);

// Test 2: formatServiceUrl strips trailing slash
assert.strictEqual(
  formatServiceUrl('http://user-service:3001/', 'http://default:3001'),
  'http://user-service:3001',
  'formatServiceUrl should strip trailing slash'
);

// Test 3: formatServiceUrl falls back to default on empty input
assert.strictEqual(
  formatServiceUrl('', 'http://default:3001'),
  'http://default:3001',
  'formatServiceUrl should fallback to default when empty'
);

// Test 4: loadConfig returns expected structure
const config = loadConfig();
assert.ok(typeof config.port === 'number', 'config.port must be a number');
assert.ok(config.services.user, 'config must define user service');
assert.ok(config.services.product, 'config must define product service');
assert.ok(config.services.order, 'config must define order service');
assert.strictEqual(config.services.user.pathPrefix, '/users');
assert.strictEqual(config.services.product.pathPrefix, '/products');
assert.strictEqual(config.services.order.pathPrefix, '/orders');

console.log('[PASS] All API Gateway unit tests passed successfully.');
