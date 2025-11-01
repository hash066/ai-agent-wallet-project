# Load Testing Suite

This directory contains comprehensive load testing scripts for the AI Agent Wallet API using [k6](https://k6.io/).

## 🚀 Quick Start

### Prerequisites
```bash
# Install k6 (choose one method):

# Using chocolatey (Windows)
choco install k6

# Using winget (Windows)
winget install k6

# Using npm (global)
npm install -g k6

# Or download from: https://k6.io/docs/get-started/installation/
```

### Running Tests

```bash
# Run ramp-up test (default)
k6 run k6-script.js

# Run specific test scenarios
k6 run --tag test_type=ramp_up k6-script.js
k6 run --tag test_type=stress k6-script.js
k6 run --tag test_type=spike k6-script.js
k6 run --tag test_type=endurance k6-script.js

# Run with custom API URL
k6 run -e API_BASE_URL=http://your-api-url:3000 k6-script.js

# Run with custom output
k6 run --out json=results.json k6-script.js
```

## 📊 Test Scenarios

### 1. Ramp Up Test (`ramp_up`)
- **Duration**: ~5 minutes
- **Load Pattern**: Gradual increase from 0 to 100 users
- **Purpose**: Test system scaling and performance under increasing load

### 2. Stress Test (`stress_test`)
- **Duration**: 30 seconds
- **Load Pattern**: 200 concurrent users
- **Purpose**: Test system limits and breaking points

### 3. Spike Test (`spike_test`)
- **Duration**: ~30 seconds
- **Load Pattern**: Sudden spike from 10 to 500 users
- **Purpose**: Test resilience to traffic spikes

### 4. Endurance Test (`endurance_test`)
- **Duration**: 5 minutes
- **Load Pattern**: 50 concurrent users sustained
- **Purpose**: Test stability over extended periods

## 🎯 Performance Thresholds

| Metric | Threshold | Description |
|--------|-----------|-------------|
| Response Time (95th percentile) | < 500ms | 95% of requests should respond within 500ms |
| Response Time (99th percentile) | < 1000ms | 99% of requests should respond within 1000ms |
| Error Rate | < 10% | Less than 10% of requests should fail |
| Intent Creation | < 1000ms | Intent creation should be fast |
| Intent Listing | < 300ms | Intent listing should be very fast |

## 📈 Test Results

After running tests, you'll get:

1. **Console Output**: Real-time metrics and summary
2. **JSON Results**: `load-test-results.json` - Detailed metrics data
3. **HTML Report**: `summary.html` - Visual report with charts and analysis

### Sample Output:
```
📊 Load Test Summary
==================

Test Duration: 2450ms avg iteration
Total Requests: 15,420
Failed Requests: 2.3%

🚀 Performance Metrics:
- Response Time (95th percentile): 320ms
- Response Time (99th percentile): 650ms
- Error Rate: 2.3%

📈 Custom Metrics:
- Intent Creation (95th percentile): 450ms
- Intent List (95th percentile): 120ms

⚡ Throughput: 1,247 requests/second

Thresholds:
✅ Response Time 95th percentile < 500ms
✅ Response Time 99th percentile < 1000ms
✅ Error Rate < 10%
✅ Custom Error Rate < 10%
```

## 🔧 Configuration

### Environment Variables
- `API_BASE_URL`: Base URL for the API (default: `http://localhost:3000`)

### Test Data
The tests use realistic data:
- **Test Agents**: Pre-defined agent IDs for consistent testing
- **Test Chains**: Ethereum, Polygon, Sepolia, Amoy
- **Random Data**: Generated intent parameters for variety

### User Behavior Simulation
- **Health Checks**: All users (100%)
- **List Intents**: All users (read-heavy)
- **Create Intents**: 30% of users (write operations)
- **Get Specific Intent**: 20% of users
- **Get Agent Intents**: 25% of users

## 🛠️ Troubleshooting

### Common Issues

1. **Connection Refused**
   ```bash
   # Make sure your API is running
   cd backend && npm start
   ```

2. **High Error Rates**
   - Check API logs for errors
   - Verify database connectivity
   - Check rate limiting settings

3. **Slow Response Times**
   - Check database performance
   - Verify network latency
   - Review API optimizations

### Debugging
```bash
# Run with verbose output
k6 run --verbose k6-script.js

# Run with HTTP debug
k6 run --http-debug k6-script.js

# Run single scenario
k6 run --tag test_type=ramp_up --verbose k6-script.js
```

## 📋 Test Coverage

The load tests cover:

### API Endpoints
- ✅ `GET /health` - Health checks
- ✅ `GET /intents` - List intents with pagination
- ✅ `POST /intents` - Create new intents
- ✅ `GET /intents/:id` - Get specific intent
- ✅ `GET /intents/agent/:agentId` - Get agent intents

### Scenarios
- ✅ Authentication (401 responses for unauthenticated users)
- ✅ Authorization (403 responses for unauthorized access)
- ✅ Error handling (404 for non-existent resources)
- ✅ Pagination and filtering
- ✅ Rate limiting behavior

## 🔄 CI/CD Integration

Add to your CI pipeline:

```yaml
# GitHub Actions example
- name: Load Testing
  run: |
    npm install -g k6
    k6 run load-tests/k6-script.js
```

## 📊 Interpreting Results

### Key Metrics to Monitor

1. **Response Time Percentiles**
   - P95: 95% of requests are faster than this
   - P99: 99% of requests are faster than this

2. **Error Rate**
   - Should stay below 10% under normal load
   - Spikes indicate system issues

3. **Throughput**
   - Requests per second the system can handle
   - Compare against expected load

4. **Custom Metrics**
   - Intent creation time: Critical for user experience
   - Intent listing time: Should be very fast

### Performance Benchmarks

| Scenario | Target Users | Expected P95 | Expected Throughput |
|----------|--------------|--------------|-------------------|
| Ramp Up | 100 | < 500ms | 500+ req/sec |
| Stress | 200 | < 1000ms | 1000+ req/sec |
| Spike | 500 | < 2000ms | 2000+ req/sec |
| Endurance | 50 | < 300ms | 300+ req/sec |

## 🤝 Contributing

When adding new tests:

1. Follow the existing pattern for scenarios
2. Add appropriate thresholds
3. Include realistic test data
4. Update this README
5. Test locally before committing

## 📞 Support

For issues with load testing:
1. Check the [k6 documentation](https://k6.io/docs/)
2. Review API logs during test runs
3. Check system resources (CPU, memory, network)
4. Verify test configuration and thresholds
