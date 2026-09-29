/**
 * Lab 7 - Service Discovery Proof Demonstration Script
 * 
 * Demonstrates that changing a service's target location/port exclusively via
 * environment configuration causes the API Gateway to route to the new target
 * WITHOUT modifying a single line of route-handling code.
 */

const http = require('http');

function createMockService(port, serviceResponse) {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(serviceResponse));
  });
  return new Promise(resolve => server.listen(port, () => resolve(server)));
}

async function runDemo() {
  console.log('======================================================================');
  console.log('  LAB 7: CONFIGURATION-BASED SERVICE DISCOVERY PROOF                 ');
  console.log('======================================================================\n');

  const PORT_A = 59101;
  const PORT_B = 59102;
  const GATEWAY_TEST_PORT = 59100;

  // Step 1: Start Mock Server A and Mock Server B
  const serverA = await createMockService(PORT_A, { 
    instance: 'Server-A', 
    location: `http://localhost:${PORT_A}`, 
    message: 'Hello from Instance A' 
  });
  const serverB = await createMockService(PORT_B, { 
    instance: 'Server-B', 
    location: `http://localhost:${PORT_B}`, 
    message: 'Hello from Instance B' 
  });

  console.log(`[Mock Upstream A] Running on port ${PORT_A}`);
  console.log(`[Mock Upstream B] Running on port ${PORT_B}\n`);

  try {
    // Step 2: Configure environment to point to Server A
    console.log(`--- RUN 1: CONFIGURING USER_SERVICE_URL=http://localhost:${PORT_A} ---`);
    process.env.USER_SERVICE_URL = `http://localhost:${PORT_A}`;
    process.env.PORT = GATEWAY_TEST_PORT;

    // Clear require cache to simulate fresh gateway process startup
    delete require.cache[require.resolve('./api-gateway/config')];
    delete require.cache[require.resolve('./api-gateway/server')];

    const gateway1 = require('./api-gateway/server');
    const runningGateway1 = gateway1.app.listen(GATEWAY_TEST_PORT);

    await new Promise(r => setTimeout(r, 500));
    const resA = await fetch(`http://localhost:${GATEWAY_TEST_PORT}/users`);
    const dataA = await resA.json();
    console.log(`Gateway Response when configured to Instance A:`, dataA);

    await new Promise(r => runningGateway1.close(r));

    // Step 3: Change ONLY configuration to point to Server B (NO GATEWAY CODE CHANGE)
    console.log(`\n--- RUN 2: CHANGING CONFIGURATION TO USER_SERVICE_URL=http://localhost:${PORT_B} ---`);
    console.log('(Gateway route code remains 100% UNTOUCHED)');
    process.env.USER_SERVICE_URL = `http://localhost:${PORT_B}`;

    delete require.cache[require.resolve('./api-gateway/config')];
    delete require.cache[require.resolve('./api-gateway/server')];

    const gateway2 = require('./api-gateway/server');
    const runningGateway2 = gateway2.app.listen(GATEWAY_TEST_PORT);

    await new Promise(r => setTimeout(r, 500));
    const resB = await fetch(`http://localhost:${GATEWAY_TEST_PORT}/users`);
    const dataB = await resB.json();
    console.log(`Gateway Response when configured to Instance B:`, dataB);

    await new Promise(r => runningGateway2.close(r));

    console.log('\n======================================================================');
    console.log('  SERVICE DISCOVERY PROOF RESULT:');
    if (dataA.instance === 'Server-A' && dataB.instance === 'Server-B') {
      console.log('  >>> SUCCESS: Gateway dynamically routed to new upstream instance');
      console.log('      strictly by reading modified environment variables at startup.');
      console.log('      No gateway route definitions or code were modified.');
    } else {
      console.log('  >>> FAILED: Upstream routing did not reflect configuration change.');
    }
    console.log('======================================================================\n');
  } finally {
    serverA.close();
    serverB.close();
  }
}

runDemo();
