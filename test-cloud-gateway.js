/**
 * Lab 7 - Public Cloud Gateway Automated Verification Script
 * 
 * Tests the live cloud-deployed API Gateway over the public Internet.
 * Confirms that requests route from Public Gateway -> Cloud Containers -> MongoDB Atlas.
 * 
 * Usage:
 *   node test-cloud-gateway.js <PUBLIC_GATEWAY_URL>
 *   or:
 *   $env:CLOUD_GATEWAY_URL="https://your-gateway.onrender.com"; node test-cloud-gateway.js
 */

const targetUrl = process.env.GATEWAY_URL || process.env.CLOUD_GATEWAY_URL || process.argv[2];

if (!targetUrl || targetUrl.trim() === '' || targetUrl.includes('localhost')) {
  console.log('======================================================================');
  console.log('  LAB 7: PUBLIC CLOUD GATEWAY VERIFICATION RUNNER                     ');
  console.log('======================================================================\n');
  console.log('STATUS: PENDING CLOUD URL INPUT (NO MOCK / NO FAKE TEST RESULTS)\n');
  console.log('To run tests against your live cloud deployment:');
  console.log('  1. Deploy your container(s) to Render, Railway, or Fly.io');
  console.log('  2. Copy your public API Gateway URL (e.g., https://campusconnect-gateway.onrender.com)');
  console.log('  3. Execute:');
  console.log('     node test-cloud-gateway.js <YOUR_PUBLIC_GATEWAY_URL>\n');
  console.log('Example:');
  console.log('     node test-cloud-gateway.js https://campusconnect-api-gateway.onrender.com\n');
  process.exit(0);
}

const cleanBaseUrl = targetUrl.replace(/\/+$/, '');

async function makeRequest(path, options = {}) {
  const url = `${cleanBaseUrl}${path}`;
  const fetchOptions = {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  };

  if (options.body) {
    fetchOptions.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
  }

  const res = await fetch(url, fetchOptions);
  let data = null;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch (e) {
    data = text;
  }

  return { status: res.status, data };
}

async function runCloudVerification() {
  console.log('======================================================================');
  console.log('  LAB 7: PUBLIC CLOUD GATEWAY LIVE VERIFICATION TEST                   ');
  console.log(`  Public Gateway URL: ${cleanBaseUrl}`);
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;

  function report(name, isPass, detail) {
    if (isPass) {
      passed++;
      console.log(`[PASS] ${name}`);
      if (detail) console.log(`       -> ${detail}`);
    } else {
      failed++;
      console.log(`[FAIL] ${name}`);
      if (detail) console.log(`       -> ${detail}`);
    }
  }

  try {
    // 1. Public Health Check
    console.log('1. Testing Public Gateway Health Check (/health)...');
    const health = await makeRequest('/health');
    report('GET /health (Public Gateway Alive)', health.status === 200 && health.data?.service === 'api-gateway', 
      `Status: ${health.status}, Response: ${JSON.stringify(health.data)}`);

    // 2. Public Users Route
    console.log('\n2. Testing Public Users Endpoint (/users)...');
    const users = await makeRequest('/users');
    let sampleUserId = 1;
    if (users.status === 200 && Array.isArray(users.data)) {
      if (users.data.length > 0) sampleUserId = users.data[0].id;
      report('GET /users (Gateway -> User Service -> MongoDB Atlas)', true, `Status: 200, User Count: ${users.data.length}`);
    } else {
      report('GET /users (Gateway -> User Service -> MongoDB Atlas)', false, `Status: ${users.status}, Body: ${JSON.stringify(users.data)}`);
    }

    // 3. Public Products Route
    console.log('\n3. Testing Public Products Endpoint (/products)...');
    const products = await makeRequest('/products');
    let sampleProductId = 1;
    if (products.status === 200 && Array.isArray(products.data)) {
      if (products.data.length > 0) sampleProductId = products.data[0].id;
      report('GET /products (Gateway -> Product Service -> MongoDB Atlas)', true, `Status: 200, Product Count: ${products.data.length}`);
    } else {
      report('GET /products (Gateway -> Product Service -> MongoDB Atlas)', false, `Status: ${products.status}, Body: ${JSON.stringify(products.data)}`);
    }

    // 4. Public Orders Route
    console.log('\n4. Testing Public Orders Endpoint (/orders)...');
    const orders = await makeRequest('/orders');
    if (orders.status === 200 && Array.isArray(orders.data)) {
      report('GET /orders (Gateway -> Order Service -> MongoDB Atlas)', true, `Status: 200, Order Count: ${orders.data.length}`);
    } else {
      report('GET /orders (Gateway -> Order Service -> MongoDB Atlas)', false, `Status: ${orders.status}, Body: ${JSON.stringify(orders.data)}`);
    }

    // 5. Public Order Placement (Complete Cross-Service Flow)
    console.log('\n5. Testing Public Complete POST Flow (Order Creation)...');
    const orderPayload = {
      userId: sampleUserId,
      productId: sampleProductId,
      quantity: 1
    };
    const orderRes = await makeRequest('/orders', { method: 'POST', body: orderPayload });
    if (orderRes.status === 201 && orderRes.data?.status === 'CONFIRMED') {
      report('POST /orders (Public Gateway -> Order -> User & Product -> MongoDB Atlas)', true, 
        `Status: 201, Order ID: ${orderRes.data.id}, Total: ₹${orderRes.data.totalPrice}`);
    } else {
      report('POST /orders (Public Gateway -> Order -> User & Product -> MongoDB Atlas)', false, 
        `Status: ${orderRes.status}, Response: ${JSON.stringify(orderRes.data)}`);
    }

    console.log('\n======================================================================');
    console.log(`  CLOUD TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================================\n');
    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Fatal error during cloud verification:', err.message);
    process.exit(1);
  }
}

runCloudVerification();
