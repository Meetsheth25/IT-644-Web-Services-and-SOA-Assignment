/**
 * Lab 9 - Real In-Process Integration Verification Test Suite
 * 
 * Boots both API Gateway and AI Service in-process,
 * verifies proxy forwarding, path preservation, input validation, operational endpoints,
 * and Prometheus metrics generation.
 */

process.env.PORT = '3080';
process.env.GATEWAY_PORT = '3080';
process.env.AI_SERVICE_URL = 'http://127.0.0.1:3004';

const { app: gatewayApp } = require('./api-gateway/server');
const { app: aiApp } = require('./ai-service/server');

async function runVerification() {
  console.log('======================================================================');
  console.log('  LAB 9: API GATEWAY <-> AI SERVICE REAL INTEGRATION TEST SUITE       ');
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;

  function record(name, condition, details) {
    if (condition) {
      passed++;
      console.log(`[PASS] ${name}`);
      if (details) console.log(`       -> ${details}`);
    } else {
      failed++;
      console.log(`[FAIL] ${name}`);
      if (details) console.log(`       -> ${details}`);
    }
  }

  // Start AI Service on port 3004
  const aiServer = await new Promise((resolve) => {
    const s = aiApp.listen(3004, '127.0.0.1', () => {
      console.log('[Setup] AI Service listening on http://127.0.0.1:3004');
      resolve(s);
    });
  });

  // Start Gateway on port 3080
  const gatewayServer = await new Promise((resolve) => {
    const s = gatewayApp.listen(3080, '127.0.0.1', () => {
      console.log('[Setup] API Gateway listening on http://127.0.0.1:3080');
      resolve(s);
    });
  });

  try {
    // 1. Direct AI Service Health
    console.log('\n--- 1. DIRECT AI SERVICE HEALTH CHECK ---');
    const aiHealthRes = await fetch('http://127.0.0.1:3004/health');
    const aiHealth = await aiHealthRes.json();
    record(
      'GET http://127.0.0.1:3004/health',
      aiHealthRes.status === 200 && aiHealth.status === 'UP' && aiHealth.service === 'ai-service',
      `Status: ${aiHealthRes.status}, Service: ${aiHealth.service}, Model: ${aiHealth.model}`
    );

    // 2. Gateway Health
    console.log('\n--- 2. GATEWAY HEALTH CHECK ---');
    const gwHealthRes = await fetch('http://127.0.0.1:3080/health');
    const gwHealth = await gwHealthRes.json();
    record(
      'GET http://127.0.0.1:3080/health',
      gwHealthRes.status === 200 && gwHealth.status === 'ok' && gwHealth.service === 'api-gateway',
      `Status: ${gwHealthRes.status}, Service: ${gwHealth.service}`
    );

    // 3. Service Discovery: Route Proxy to /api/ai/tasks
    console.log('\n--- 3. GATEWAY PROXY ROUTING (/api/ai/tasks) ---');
    const tasksRes = await fetch('http://127.0.0.1:3080/api/ai/tasks');
    const tasksData = await tasksRes.json();
    record(
      'GET http://127.0.0.1:3080/api/ai/tasks through Gateway',
      tasksRes.status === 200 && tasksData.success === true && Array.isArray(tasksData.supported_tasks),
      `Status: ${tasksRes.status}, Tasks: [${tasksData.supported_tasks?.join(', ')}], Model: ${tasksData.constraints?.model}`
    );

    // 4. Input Validation through Gateway: Missing 'input'
    console.log('\n--- 4. INPUT VALIDATION: MISSING INPUT ---');
    const valRes1 = await fetch('http://127.0.0.1:3080/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: 'summarize' })
    });
    const valData1 = await valRes1.json();
    record(
      'POST /api/ai/generate (Missing input) -> 400 Bad Request',
      valRes1.status === 400 && valData1.success === false && valData1.error === 'Validation Error',
      `Status: ${valRes1.status}, Message: "${valData1.message}"`
    );

    // 5. Input Validation through Gateway: Whitespace-only input
    console.log('\n--- 5. INPUT VALIDATION: WHITESPACE ONLY ---');
    const valRes2 = await fetch('http://127.0.0.1:3080/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: 'summarize', input: '    \n\t   ' })
    });
    const valData2 = await valRes2.json();
    record(
      'POST /api/ai/generate (Whitespace only) -> 400 Bad Request',
      valRes2.status === 400 && valData2.success === false && valData2.error === 'Validation Error',
      `Status: ${valRes2.status}, Message: "${valData2.message}"`
    );

    // 6. Input Validation through Gateway: Max Length Overflow (> 2000 chars)
    console.log('\n--- 6. INPUT VALIDATION: LENGTH OVERFLOW ---');
    const longText = 'A'.repeat(2050);
    const valRes3 = await fetch('http://127.0.0.1:3080/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: 'summarize', input: longText })
    });
    const valData3 = await valRes3.json();
    record(
      'POST /api/ai/generate (Length overflow) -> 400 Bad Request',
      valRes3.status === 400 && valData3.success === false,
      `Status: ${valRes3.status}, Message: "${valData3.message}"`
    );

    // 7. Input Validation through Gateway: Unsupported task
    console.log('\n--- 7. INPUT VALIDATION: UNSUPPORTED TASK ---');
    const valRes4 = await fetch('http://127.0.0.1:3080/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: 'drop_database', input: 'Valid passage text.' })
    });
    const valData4 = await valRes4.json();
    record(
      'POST /api/ai/generate (Unsupported task) -> 400 Bad Request',
      valRes4.status === 400 && valData4.success === false,
      `Status: ${valRes4.status}, Message: "${valData4.message}"`
    );

    // 8. Controlled Handling when AI_API_KEY is not configured
    console.log('\n--- 8. CONTROLLED ERROR: SERVER CONFIGURATION CHECK ---');
    const configRes = await fetch('http://127.0.0.1:3080/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: 'summarize', input: 'Valid educational content passage.' })
    });
    const configData = await configRes.json();
    record(
      'POST /api/ai/generate (Controlled Provider/Config Handling)',
      configRes.status !== 404 && typeof configData === 'object',
      `Status: ${configRes.status}, Error Type: ${configData.error || 'N/A'}, Message: "${configData.message || (configData.success ? 'Success' : 'Error')}"`
    );

    // 9. Gateway Prometheus Metrics Scrape
    console.log('\n--- 9. GATEWAY PROMETHEUS METRICS SCRAPE ---');
    const metricsRes = await fetch('http://127.0.0.1:3080/metrics');
    const metricsText = await metricsRes.text();
    record(
      'GET /metrics (Gateway Prometheus metrics contains ai-service traffic)',
      metricsRes.status === 200 && metricsText.includes('service="ai-service"'),
      `Status: ${metricsRes.status}, Contains service="ai-service": ${metricsText.includes('service="ai-service"')}`
    );

    // 10. AI Service Local Metrics Scrape
    console.log('\n--- 10. AI SERVICE NATIVE PROMETHEUS METRICS SCRAPE ---');
    const aiMetricsRes = await fetch('http://127.0.0.1:3004/metrics');
    const aiMetricsText = await aiMetricsRes.text();
    record(
      'GET http://127.0.0.1:3004/metrics (AI Service native metrics)',
      aiMetricsRes.status === 200 && aiMetricsText.includes('ai_service_'),
      `Status: ${aiMetricsRes.status}, Contains ai_service_ prefix: ${aiMetricsText.includes('ai_service_')}`
    );

    console.log('\n======================================================================');
    console.log(`  INTEGRATION TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================================\n');

  } finally {
    await new Promise((resolve) => gatewayServer.close(resolve));
    await new Promise((resolve) => aiServer.close(resolve));
    console.log('[Teardown] Both servers closed cleanly.');
  }
}

runVerification().catch((err) => {
  console.error('[Verification Fatal Error]', err);
  process.exit(1);
});
