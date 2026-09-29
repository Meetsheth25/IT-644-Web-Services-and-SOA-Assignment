/**
 * Lab 7 - API Gateway Automated Verification Test Suite
 * 
 * Verifies that the API Gateway serves as the single public entry point,
 * routing requests to User, Product, and Order services over Docker internal network,
 * supporting configuration-based service discovery, request logging,
 * and centralized 502/503 error handling for unreachable services.
 */

const { execSync } = require('child_process');

const GATEWAY_URL = (process.env.GATEWAY_URL || process.argv[2] || 'http://localhost:3000').replace(/\/+$/, '');

async function request(path, options = {}) {
  const url = `${GATEWAY_URL}${path}`;
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

  return {
    status: res.status,
    headers: res.headers,
    data
  };
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runTests() {
  console.log('======================================================================');
  console.log('  LAB 7: API GATEWAY & SERVICE DISCOVERY AUTOMATED TEST SUITE        ');
  console.log(`  Target Gateway URL: ${GATEWAY_URL}`);
  console.log('======================================================================\n');

  const results = [];
  let passedCount = 0;
  let failedCount = 0;

  function record(testId, name, passed, details) {
    if (passed) {
      passedCount++;
      console.log(`[PASS] ${testId}. ${name}`);
      if (details) console.log(`       -> ${details}`);
    } else {
      failedCount++;
      console.log(`[FAIL] ${testId}. ${name}`);
      if (details) console.log(`       -> ${details}`);
    }
    results.push({ testId, name, passed, details });
  }

  try {
    const timestamp = Date.now();

    // 1. Health check
    console.log('--- PHASE 1: GATEWAY HEALTH CHECK ---');
    try {
      const res = await request('/health');
      const pass = res.status === 200 && res.data && res.data.status === 'ok' && res.data.service === 'api-gateway';
      record(1, 'GET /health (Gateway native health check)', pass, `Status: ${res.status}, Service: ${res.data?.service}`);
    } catch (err) {
      record(1, 'GET /health (Gateway native health check)', false, err.message);
    }

    // 2. User Service via Gateway
    console.log('\n--- PHASE 2: USER SERVICE VIA GATEWAY ---');
    let sampleUserId = 1;
    try {
      const res = await request('/users');
      const pass = res.status === 200 && Array.isArray(res.data);
      if (pass && res.data.length > 0) sampleUserId = res.data[0].id;
      record(2, 'GET /users (List all users)', pass, `Status: ${res.status}, Count: ${Array.isArray(res.data) ? res.data.length : 'N/A'}`);
    } catch (err) {
      record(2, 'GET /users (List all users)', false, err.message);
    }

    try {
      const res = await request(`/users/${sampleUserId}`);
      const pass = res.status === 200 && res.data && res.data.id === sampleUserId;
      record(3, `GET /users/${sampleUserId} (Retrieve single user by ID)`, pass, `Status: ${res.status}, Name: ${res.data?.name}`);
    } catch (err) {
      record(3, `GET /users/${sampleUserId} (Retrieve single user by ID)`, false, err.message);
    }

    let createdUserId = null;
    try {
      const newUser = {
        name: `Gateway Test User ${timestamp}`,
        email: `gw.user.${timestamp}@example.com`,
        role: 'Researcher',
        department: 'Information Technology'
      };
      const res = await request('/users', { method: 'POST', body: newUser });
      const pass = res.status === 201 && res.data && res.data.email === newUser.email;
      if (pass) createdUserId = res.data.id;
      record(4, 'POST /users (Create new user through gateway)', pass, `Status: ${res.status}, Generated ID: ${res.data?.id}`);
    } catch (err) {
      record(4, 'POST /users (Create new user through gateway)', false, err.message);
    }

    // 3. Product Service via Gateway
    console.log('\n--- PHASE 3: PRODUCT SERVICE VIA GATEWAY ---');
    let sampleProductId = 1;
    try {
      const res = await request('/products');
      const pass = res.status === 200 && Array.isArray(res.data);
      if (pass && res.data.length > 0) sampleProductId = res.data[0].id;
      record(5, 'GET /products (List all products)', pass, `Status: ${res.status}, Count: ${Array.isArray(res.data) ? res.data.length : 'N/A'}`);
    } catch (err) {
      record(5, 'GET /products (List all products)', false, err.message);
    }

    try {
      const res = await request(`/products/${sampleProductId}`);
      const pass = res.status === 200 && res.data && res.data.id === sampleProductId;
      record(6, `GET /products/${sampleProductId} (Retrieve single product by ID)`, pass, `Status: ${res.status}, Title: ${res.data?.name}`);
    } catch (err) {
      record(6, `GET /products/${sampleProductId} (Retrieve single product by ID)`, false, err.message);
    }

    let createdProductId = null;
    try {
      const newProduct = {
        name: `Gateway Cloud Server ${timestamp}`,
        price: 4999,
        category: 'Cloud Hardware',
        stock: 25
      };
      const res = await request('/products', { method: 'POST', body: newProduct });
      const pass = res.status === 201 && res.data && res.data.name === newProduct.name;
      if (pass) createdProductId = res.data.id;
      record(7, 'POST /products (Create new product through gateway)', pass, `Status: ${res.status}, Generated ID: ${res.data?.id}`);
    } catch (err) {
      record(7, 'POST /products (Create new product through gateway)', false, err.message);
    }

    // 4. Order Service via Gateway (Inter-Service verification)
    console.log('\n--- PHASE 4: ORDER SERVICE VIA GATEWAY (FULL-STACK FLOW) ---');
    let sampleOrderId = 1;
    try {
      const res = await request('/orders');
      const pass = res.status === 200 && Array.isArray(res.data);
      if (pass && res.data.length > 0) sampleOrderId = res.data[0].id;
      record(8, 'GET /orders (List all orders)', pass, `Status: ${res.status}, Count: ${Array.isArray(res.data) ? res.data.length : 'N/A'}`);
    } catch (err) {
      record(8, 'GET /orders (List all orders)', false, err.message);
    }

    try {
      const orderPayload = {
        userId: createdUserId || sampleUserId,
        productId: createdProductId || sampleProductId,
        quantity: 3
      };
      const res = await request('/orders', { method: 'POST', body: orderPayload });
      const pass = res.status === 201 && res.data && res.data.status === 'CONFIRMED' && res.data.totalPrice > 0;
      record(9, 'POST /orders (Gateway -> Order -> User & Product inter-service flow)', pass, 
        `Status: ${res.status}, Order ID: ${res.data?.id}, Total: ₹${res.data?.totalPrice}`);
    } catch (err) {
      record(9, 'POST /orders (Gateway -> Order -> User & Product inter-service flow)', false, err.message);
    }

    // 5. Negative / Edge cases
    console.log('\n--- PHASE 5: NEGATIVE & ERROR HANDLING TESTS ---');
    try {
      const res = await request('/unknown-gateway-resource');
      const pass = res.status === 404 && res.data && res.data.error === 'Not Found';
      record(10, 'GET /unknown-gateway-resource (Nonexistent gateway route -> 404)', pass, `Status: ${res.status}, Message: ${res.data?.message}`);
    } catch (err) {
      record(10, 'GET /unknown-gateway-resource (Nonexistent gateway route -> 404)', false, err.message);
    }

    try {
      const res = await request('/users/9999999');
      const pass = res.status === 404;
      record(11, 'GET /users/9999999 (Nonexistent backend entity -> 404 from upstream)', pass, `Status: ${res.status}`);
    } catch (err) {
      record(11, 'GET /users/9999999 (Nonexistent backend entity -> 404 from upstream)', false, err.message);
    }

    // 6. Resilience & Centralized 502/503 Handling
    console.log('\n--- PHASE 6: FAULT TOLERANCE & RECOVERY TESTS ---');
    let canRunDocker = false;
    try {
      execSync('docker compose ps --services', { stdio: 'pipe' });
      canRunDocker = true;
    } catch (e) {
      canRunDocker = false;
    }

    if (canRunDocker && GATEWAY_URL.includes('localhost')) {
      console.log('Stopping user-service container to test 502 Bad Gateway response...');
      execSync('docker compose stop user-service', { stdio: 'pipe' });
      await sleep(1500);

      try {
        const res = await request('/users');
        const pass = (res.status === 502 || res.status === 503) && res.data && 
          (res.data.error === 'Bad Gateway' || res.data.error === 'Service Unavailable');
        record(12, 'GET /users with user-service STOPPED (Unreachable service -> 502 Bad Gateway)', pass, 
          `Status: ${res.status}, Response: ${JSON.stringify(res.data)}`);
      } catch (err) {
        record(12, 'GET /users with user-service STOPPED (Unreachable service -> 502 Bad Gateway)', false, err.message);
      }

      console.log('Restarting user-service container to verify automatic recovery...');
      execSync('docker compose start user-service', { stdio: 'pipe' });
      console.log('Waiting for user-service to re-establish MongoDB connection...');
      await sleep(4000);

      try {
        const res = await request('/users');
        const pass = res.status === 200 && Array.isArray(res.data);
        record(13, 'GET /users after user-service RESTARTED (Service recovery verified)', pass, 
          `Status: ${res.status}, User Count: ${Array.isArray(res.data) ? res.data.length : 'N/A'}`);
      } catch (err) {
        record(13, 'GET /users after user-service RESTARTED (Service recovery verified)', false, err.message);
      }
    } else if (GATEWAY_URL.includes('localhost')) {
      console.log('Testing 502/503 fault tolerance and recovery via local test harness...');
      const http = require('http');
      const TEST_MOCK_PORT = 59881;
      const TEST_GW_PORT = 59880;

      // 1. Point gateway to an unreachable port (no server running on TEST_MOCK_PORT)
      process.env.USER_SERVICE_URL = `http://localhost:${TEST_MOCK_PORT}`;
      process.env.PORT = TEST_GW_PORT;
      delete require.cache[require.resolve('./api-gateway/config')];
      delete require.cache[require.resolve('./api-gateway/server')];
      const gwModule = require('./api-gateway/server');
      const tempGw = gwModule.app.listen(TEST_GW_PORT);
      await sleep(400);

      try {
        const res = await fetch(`http://localhost:${TEST_GW_PORT}/users`);
        let data = null;
        try { data = await res.json(); } catch (e) {}
        const pass = (res.status === 502 || res.status === 503) && data && 
          (data.error === 'Bad Gateway' || data.error === 'Service Unavailable');
        record(12, 'GET /users with unreachable upstream (Unreachable service -> 502 Bad Gateway)', pass, 
          `Status: ${res.status}, Response: ${JSON.stringify(data)}`);
      } catch (err) {
        record(12, 'GET /users with unreachable upstream (Unreachable service -> 502 Bad Gateway)', false, err.message);
      }

      // 2. Bring mock server online on TEST_MOCK_PORT to verify recovery
      console.log('Starting mock upstream service on target port to verify recovery...');
      const mockServer = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([{ id: 1, name: 'Recovered User' }]));
      });
      await new Promise(r => mockServer.listen(TEST_MOCK_PORT, r));
      await sleep(300);

      try {
        const res = await fetch(`http://localhost:${TEST_GW_PORT}/users`);
        let data = null;
        try { data = await res.json(); } catch (e) {}
        const pass = res.status === 200 && Array.isArray(data) && data.length > 0;
        record(13, 'GET /users after upstream becomes reachable (Service recovery verified)', pass, 
          `Status: ${res.status}, Recovered entity: ${data?.[0]?.name}`);
      } catch (err) {
        record(13, 'GET /users after upstream becomes reachable (Service recovery verified)', false, err.message);
      } finally {
        await new Promise(r => mockServer.close(r));
        await new Promise(r => tempGw.close(r));
      }
    } else {
      console.log('Skipping container stop/restart test against remote cloud URL.');
    }

    // Print Final Summary
    console.log('\n======================================================================');
    console.log('  TEST SUMMARY');
    console.log('======================================================================');
    console.log(`  TOTAL TESTS: ${passedCount + failedCount}`);
    console.log(`  PASSED:      ${passedCount}`);
    console.log(`  FAILED:      ${failedCount}`);
    console.log('======================================================================\n');

    await sleep(200);
    if (failedCount > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (globalErr) {
    console.error('Fatal test error:', globalErr);
    process.exit(1);
  }
}

runTests();
