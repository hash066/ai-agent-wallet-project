import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const intentCreationTrend = new Trend('intent_creation_duration');
const intentListTrend = new Trend('intent_list_duration');

// Test configuration
export const options = {
  scenarios: {
    // Ramp up test - gradually increase load
    ramp_up: {
      executor: 'ramping-vus',
      stages: [
        { duration: '30s', target: 10 },   // Ramp up to 10 users over 30s
        { duration: '1m', target: 50 },    // Ramp up to 50 users over 1m
        { duration: '2m', target: 100 },   // Ramp up to 100 users over 2m
        { duration: '1m', target: 100 },   // Stay at 100 users for 1m
        { duration: '30s', target: 0 },    // Ramp down to 0 users
      ],
      tags: { test_type: 'ramp_up' },
    },

    // Stress test - high load for short duration
    stress_test: {
      executor: 'constant-vus',
      vus: 200,
      duration: '30s',
      tags: { test_type: 'stress' },
    },

    // Spike test - sudden load increase
    spike_test: {
      executor: 'ramping-vus',
      stages: [
        { duration: '10s', target: 10 },   // Normal load
        { duration: '10s', target: 500 },  // Spike to 500 users
        { duration: '10s', target: 10 },   // Back to normal
      ],
      tags: { test_type: 'spike' },
    },

    // Endurance test - sustained load
    endurance_test: {
      executor: 'constant-vus',
      vus: 50,
      duration: '5m',
      tags: { test_type: 'endurance' },
    },
  },

  thresholds: {
    // Overall thresholds
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% of requests should be below 500ms, 99% below 1000ms
    http_req_failed: ['rate<0.1'], // Error rate should be below 10%

    // Custom metrics
    errors: ['rate<0.1'], // Custom error rate below 10%
    intent_creation_duration: ['p(95)<1000'], // Intent creation should be fast
    intent_list_duration: ['p(95)<300'], // Intent listing should be very fast
  },
};

// Base URL for the API
const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api/v1`;

// Test data
const testAgents = [
  '0x742d35cc6634c0532925a3b844bc454e4438f44e00000000000000000000000000',
  '0x742d35cc6634c0532925a3b844bc454e4438f44e00000000000000000000000001',
  '0x742d35cc6634c0532925a3b844bc454e4438f44e00000000000000000000000002',
];

const testChains = [1, 137, 11155111, 80002]; // Ethereum, Polygon, Sepolia, Amoy

// Helper function to generate random intent data
function generateIntentData() {
  const agentId = testAgents[Math.floor(Math.random() * testAgents.length)];
  const srcChainId = testChains[Math.floor(Math.random() * testChains.length)];
  let destChainId = testChains[Math.floor(Math.random() * testChains.length)];
  while (destChainId === srcChainId) {
    destChainId = testChains[Math.floor(Math.random() * testChains.length)];
  }

  return {
    agentId,
    srcChainId,
    destChainId,
    action: Math.random() > 0.5 ? 'transfer' : 'call',
    params: {
      amount: (Math.random() * 0.1 * 1e18).toString(), // Up to 0.1 ETH in wei
      to: '0x' + Math.random().toString(16).substr(2, 40), // Random address
    },
    expiry: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
  };
}

// Main test function
export default function () {
  // Test 1: Health check
  const healthResponse = http.get(`${API_BASE}/health`);
  check(healthResponse, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 200ms': (r) => r.timings.duration < 200,
  }) || errorRate.add(1);

  // Test 2: List intents (read-heavy operation)
  const listStart = new Date().getTime();
  const listResponse = http.get(`${API_BASE}/intents?page=1&limit=20`);
  const listDuration = new Date().getTime() - listStart;
  intentListTrend.add(listDuration);

  check(listResponse, {
    'list intents status is 200': (r) => r.status === 200,
    'list intents response time < 500ms': (r) => r.timings.duration < 500,
    'list intents has pagination': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.pagination && typeof data.pagination.total === 'number';
      } catch (e) {
        return false;
      }
    },
  }) || errorRate.add(1);

  // Test 3: Create intent (write operation) - only for some users to avoid overwhelming
  if (Math.random() < 0.3) { // 30% of users create intents
    const intentData = generateIntentData();
    const createStart = new Date().getTime();
    const createResponse = http.post(
      `${API_BASE}/intents`,
      JSON.stringify(intentData),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    const createDuration = new Date().getTime() - createStart;
    intentCreationTrend.add(createDuration);

    check(createResponse, {
      'create intent status is 201 or 401': (r) => r.status === 201 || r.status === 401, // 401 is expected for unauthenticated users
      'create intent response time < 1000ms': (r) => r.timings.duration < 1000,
    }) || errorRate.add(1);
  }

  // Test 4: Get specific intent (if we have any)
  if (Math.random() < 0.2) { // 20% of users check specific intents
    const randomIntentId = '0x' + Math.random().toString(16).substr(2, 64);
    const getResponse = http.get(`${API_BASE}/intents/${randomIntentId}`);

    check(getResponse, {
      'get intent status is 200 or 404': (r) => r.status === 200 || r.status === 404, // 404 is expected for non-existent intents
      'get intent response time < 300ms': (r) => r.timings.duration < 300,
    }) || errorRate.add(1);
  }

  // Test 5: Get agent intents
  if (Math.random() < 0.25) { // 25% of users check agent intents
    const agentId = testAgents[Math.floor(Math.random() * testAgents.length)];
    const agentResponse = http.get(`${API_BASE}/intents/agent/${agentId}?page=1&limit=10`);

    check(agentResponse, {
      'get agent intents status is 200 or 403': (r) => r.status === 200 || r.status === 403, // 403 for unauthorized access
      'get agent intents response time < 400ms': (r) => r.timings.duration < 400,
    }) || errorRate.add(1);
  }

  // Simulate realistic user behavior - random sleep between 1-5 seconds
  sleep(Math.random() * 4 + 1);
}

// Setup function - runs before the test starts
export function setup() {
  console.log('Starting load test setup...');

  // Warm up the API with a few requests
  const warmupResponse = http.get(`${API_BASE}/health`);
  if (warmupResponse.status !== 200) {
    console.error('API warmup failed:', warmupResponse.status, warmupResponse.body);
  } else {
    console.log('API warmup successful');
  }

  return { timestamp: new Date().toISOString() };
}

// Teardown function - runs after the test completes
export function teardown(data) {
  console.log('Load test completed at:', new Date().toISOString());
  console.log('Test started at:', data.timestamp);
}

// Handle summary - custom summary output
export function handleSummary(data) {
  const summary = {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'load-test-results.json': JSON.stringify(data, null, 2),
    'summary.html': htmlReport(data),
  };

  return summary;
}

function textSummary(data, options) {
  return `
📊 Load Test Summary
==================

Test Duration: ${data.metrics.iteration_duration.values.avg}ms avg iteration
Total Requests: ${data.metrics.http_reqs.values.count}
Failed Requests: ${data.metrics.http_req_failed.values.rate * 100}%

🚀 Performance Metrics:
- Response Time (95th percentile): ${Math.round(data.metrics.http_req_duration.values['p(95)'])}ms
- Response Time (99th percentile): ${Math.round(data.metrics.http_req_duration.values['p(99)'])}ms
- Error Rate: ${(data.metrics.errors.values.rate * 100).toFixed(2)}%

📈 Custom Metrics:
- Intent Creation (95th percentile): ${Math.round(data.metrics.intent_creation_duration?.values?.['p(95)'] || 0)}ms
- Intent List (95th percentile): ${Math.round(data.metrics.intent_list_duration?.values?.['p(95)'] || 0)}ms

⚡ Throughput: ${Math.round(data.metrics.http_reqs.values.rate)} requests/second

Thresholds:
${data.metrics.http_req_duration.thresholds['p(95)<500'] ? '✅' : '❌'} Response Time 95th percentile < 500ms
${data.metrics.http_req_duration.thresholds['p(99)<1000'] ? '✅' : '❌'} Response Time 99th percentile < 1000ms
${data.metrics.http_req_failed.thresholds['rate<0.1'] ? '✅' : '❌'} Error Rate < 10%
${data.metrics.errors.thresholds['rate<0.1'] ? '✅' : '❌'} Custom Error Rate < 10%
`;
}

function htmlReport(data) {
  return `
<!DOCTYPE html>
<html>
<head>
    <title>AI Agent Wallet Load Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .metric { background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 5px; }
        .pass { color: green; }
        .fail { color: red; }
        h1, h2 { color: #333; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>🚀 AI Agent Wallet Load Test Report</h1>
    <p><strong>Generated:</strong> ${new Date().toISOString()}</p>

    <h2>📊 Key Metrics</h2>
    <div class="metric">
        <strong>Total Requests:</strong> ${data.metrics.http_reqs.values.count}<br>
        <strong>Failed Requests:</strong> ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%<br>
        <strong>Average Response Time:</strong> ${Math.round(data.metrics.http_req_duration.values.avg)}ms<br>
        <strong>95th Percentile:</strong> ${Math.round(data.metrics.http_req_duration.values['p(95)'])}ms<br>
        <strong>99th Percentile:</strong> ${Math.round(data.metrics.http_req_duration.values['p(99)'])}ms<br>
        <strong>Throughput:</strong> ${Math.round(data.metrics.http_reqs.values.rate)} req/sec
    </div>

    <h2>🎯 Threshold Results</h2>
    <table>
        <tr>
            <th>Threshold</th>
            <th>Status</th>
            <th>Value</th>
        </tr>
        <tr>
            <td>Response Time (95th percentile) < 500ms</td>
            <td class="${data.metrics.http_req_duration.thresholds['p(95)<500'] ? 'pass' : 'fail'}">
                ${data.metrics.http_req_duration.thresholds['p(95)<500'] ? '✅ PASS' : '❌ FAIL'}
            </td>
            <td>${Math.round(data.metrics.http_req_duration.values['p(95)'])}ms</td>
        </tr>
        <tr>
            <td>Response Time (99th percentile) < 1000ms</td>
            <td class="${data.metrics.http_req_duration.thresholds['p(99)<1000'] ? 'pass' : 'fail'}">
                ${data.metrics.http_req_duration.thresholds['p(99)<1000'] ? '✅ PASS' : '❌ FAIL'}
            </td>
            <td>${Math.round(data.metrics.http_req_duration.values['p(99)'])}ms</td>
        </tr>
        <tr>
            <td>Error Rate < 10%</td>
            <td class="${data.metrics.http_req_failed.thresholds['rate<0.1'] ? 'pass' : 'fail'}">
                ${data.metrics.http_req_failed.thresholds['rate<0.1'] ? '✅ PASS' : '❌ FAIL'}
            </td>
            <td>${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%</td>
        </tr>
    </table>

    <h2>📈 Detailed Metrics</h2>
    <table>
        <tr><th>Metric</th><th>Value</th></tr>
        <tr><td>HTTP Requests</td><td>${data.metrics.http_reqs.values.count}</td></tr>
        <tr><td>HTTP Request Rate</td><td>${data.metrics.http_reqs.values.rate}/s</td></tr>
        <tr><td>Iteration Duration (avg)</td><td>${Math.round(data.metrics.iteration_duration.values.avg)}ms</td></tr>
        <tr><td>Intent Creation Duration (95th)</td><td>${Math.round(data.metrics.intent_creation_duration?.values?.['p(95)'] || 0)}ms</td></tr>
        <tr><td>Intent List Duration (95th)</td><td>${Math.round(data.metrics.intent_list_duration?.values?.['p(95)'] || 0)}ms</td></tr>
    </table>
</body>
</html>`;
}
