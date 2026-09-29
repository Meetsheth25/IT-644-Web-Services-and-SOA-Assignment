/**
 * Lab 8 - Traffic Generation & Monitoring Verification Script
 * 
 * Generates continuous or batched valid API traffic across /users, /products,
 * /orders, and controlled invalid requests through the API Gateway,
 * allowing instant observation of Prometheus metrics and Grafana charts.
 */

const GATEWAY_URL = (process.env.GATEWAY_URL || process.argv[2] || 'http://localhost:3000').replace(/\/+$/, '');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function hit(endpoint, options = {}) {
  const url = `${GATEWAY_URL}${endpoint}`;
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: options.method || 'GET',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    const dur = Date.now() - start;
    console.log(`[${res.status}] ${options.method || 'GET'} ${endpoint} (${dur}ms)`);
    return { status: res.status, dur };
  } catch (err) {
    const dur = Date.now() - start;
    console.error(`[ERR] ${options.method || 'GET'} ${endpoint} (${dur}ms): ${err.message}`);
    return { error: err.message, dur };
  }
}

async function generateTraffic(iterations = 5) {
  console.log('======================================================================');
  console.log(`  LAB 8: TRAFFIC GENERATOR TARGETING ${GATEWAY_URL}`);
  console.log(`  Running ${iterations} iterations of mixed traffic...`);
  console.log('======================================================================\n');

  for (let i = 1; i <= iterations; i++) {
    console.log(`--- Iteration ${i}/${iterations} ---`);
    await hit('/health');
    await hit('/users');
    await hit('/users/1');
    await hit('/products');
    await hit('/products/1');
    await hit('/orders');
    
    // Controlled failure test (404 Nonexistent route)
    await hit('/unknown-endpoint-for-monitoring-test');

    await sleep(400);
  }

  console.log('\n[DONE] Traffic generation complete! Inspect Prometheus and Grafana dashboards.');
}

const count = parseInt(process.argv[3] || '5', 10);
generateTraffic(count);
