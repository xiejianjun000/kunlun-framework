# Example: Debugging API Connection Issues

## Problem Report

**User message**:
"Our API calls to the payment service keep timing out. About 50% of requests fail with 'Connection timeout after 30s'. This started happening yesterday afternoon."

---

## Troubleshooting Process

### Step 1: Gather Information

**Exact error**:
```
requests.exceptions.ConnectionError: HTTPConnectionPool(host='api.payment.com', port=443): Max retries exceeded with url: /v1/charge (Caused by ConnectTimeoutError(<urllib3.connection.HTTPConnection object at 0x7f8a3c4d5e80>, 'Connection to api.payment.com timed out. (connect timeout=30)'))
```

**When it occurs**:
- Intermittent - about 50% of requests
- Started yesterday around 3 PM
- Affects all endpoints of payment service
- Other APIs work fine

**What changed**:
- "We deployed a new version yesterday at 2 PM"
- "Nothing changed in our payment service integration"

---

### Step 2: Classify the Problem

**Problem type**: Integration/Performance

**Reasoning**:
- Network connectivity issue
- Intermittent (timing-related)
- Started after deployment
- Affects specific external service

---

### Step 3: High-Probability Checks

**Check 1: Can we reach the service at all?**

**Test**:
```bash
# Basic connectivity
ping api.payment.com
# Result: Host reachable, ping times normal (15-30ms)

# Port connectivity
nc -zv api.payment.com 443
# Result: Connection to port 443 succeeded
```

**Conclusion**: Basic network connectivity is fine.

---

**Check 2: Is it a timeout configuration issue?**

**Investigation**:
```python
# Check timeout setting in code
response = requests.post(
    "https://api.payment.com/v1/charge",
    json=charge_data,
    timeout=30  # ← 30 second timeout
)
```

**Analysis**: 30 seconds is reasonable for API calls. This shouldn't be causing 50% failures.

---

**Check 3: What changed in the deployment?**

**Git diff analysis**:
```diff
+ async def process_payment(order_id):
+     # Fetch order details
+     order = await fetch_order(order_id)
+
+     # NEW: Also fetch user loyalty status
+     loyalty = await fetch_loyalty_status(order.user_id)
+
+     # Process payment
+     result = await charge_payment(order)
```

**Found it!** The new version now makes multiple API calls in parallel (fetching loyalty status), potentially causing connection pool exhaustion.

---

**Check 4: Check connection pool settings**

**Current code**:
```python
import requests

session = requests.Session()
# No explicit connection pool configuration
```

**Default behavior**: `requests.Session` has default connection pool of 10 connections.

---

### Step 4: Root Cause Analysis

**The Problem**:

1. Before deployment: Sequential calls to payment API
2. After deployment: Parallel calls (payment + loyalty)
3. When processing multiple orders simultaneously:
   - Each "process_payment" task opens multiple connections
   - Connection pool (10) gets exhausted
   - New connections wait or timeout

**Timeline correlation**:
- 2 PM: Deployment with parallel calls
- 3 PM: Traffic increased (peak hours)
- Result: Connection pool exhausted → timeouts

---

### Step 5: Solutions Applied

**Solution 1: Increase connection pool size**

```python
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

session = requests.Session()

# Configure retry strategy
retry_strategy = Retry(
    total=3,
    backoff_factor=1,
    status_forcelist=[429, 500, 502, 503, 504]
)

# Mount with larger pool
adapter = HTTPAdapter(
    max_retries=retry_strategy,
    pool_connections=50,  # Increased from 10
    pool_maxsize=50       # Increased from 10
)
session.mount("https://", adapter)
session.mount("http://", adapter)
```

**Result**: Reduced timeouts from 50% to 10%

---

**Solution 2: Implement proper async HTTP client**

```python
import aiohttp
import asyncio

async def process_payment(order_id):
    async with aiohttp.ClientSession(
        connector=aiohttp.TCPConnector(
            limit=100,  # Max connections
            limit_per_host=20  # Per-host limit
        ),
        timeout=aiohttp.ClientTimeout(total=30)
    ) as session:
        # Parallel calls with proper async handling
        order, loyalty = await asyncio.gather(
            fetch_order(session, order_id),
            fetch_loyalty_status(session, order.user_id)
        )
        result = await charge_payment(session, order)
        return result
```

**Result**: Timeouts eliminated completely

---

## Prevention Measures

### 1. Load Testing

**Before deployment**:
```bash
# Load test with parallel requests
ab -n 1000 -c 50 https://api.example.com/process

# Or use locust
locust -f load_test.py --host=https://api.example.com
```

### 2. Connection Pool Monitoring

**Add metrics**:
```python
from prometheus_client import Gauge

connection_pool_gauge = Gauge(
    'http_connection_pool_size',
    'Current connection pool usage'
)

# Update periodically
connection_pool_gauge.set(pool.pool.qsize())
```

### 3. Circuit Breaker

**Implement circuit breaker**:
```python
from circuitbreaker import circuit

@circuit(failure_threshold=5, recovery_timeout=60)
async def call_payment_api(data):
    async with aiohttp.ClientSession() as session:
        async with session.post(url, json=data) as response:
            return await response.json()
```

### 4. Deployment Checklist

Add to pre-deployment checklist:
- [ ] Load test with 2x expected traffic
- [ ] Check connection pool settings
- [ ] Verify external service rate limits
- [ ] Monitor error rates during rollout
- [ ] Have rollback plan ready

---

## Troubleshooting Report

# API Connection Timeout - Troubleshooting Report

## Problem Classification
**Type**: Integration/Performance
**Symptom**: Intermittent connection timeouts to payment API (50% failure rate)

## Diagnostic Path
1. **Check**: Basic network connectivity
   - **Result**: ✓ Normal - ping and port tests pass
2. **Check**: Timeout configuration
   - **Result**: ✓ Appropriate - 30 seconds is reasonable
3. **Check**: Recent deployment changes
   - **Result**: ✗ Issue found - Added parallel API calls without adjusting connection pool
4. **Check**: Connection pool capacity
   - **Result**: ✗ Insufficient - Default pool of 10 exhausted by parallel calls

## Root Cause
New deployment introduced parallel API calls without increasing HTTP connection pool size. Default pool (10 connections) exhausted during peak traffic, causing connection timeouts.

## Recommended Solutions
1. **Immediate**: Increase connection pool size to 50+ connections
2. **Proper fix**: Use async HTTP client (aiohttp) with appropriate connection limits
3. **Prevention**: Implement load testing before deployments
4. **Monitoring**: Add connection pool metrics and alerting

## Prevention
- Always load test API integrations before deployment
- Monitor connection pool usage in production
- Use circuit breakers for external service calls
- Include connection capacity in deployment checklists

---

## Lessons Learned

1. **Parallel ≠ Free**: Parallel calls increase resource consumption
2. **Defaults aren't always enough**: Default connection pools may be too small
3. **Test realistic load**: Unit tests don't catch connection exhaustion
4. **Monitor the right metrics**: Connection pool usage should be visible
5. **Rollback is valuable**: Could have reverted to serial processing immediately
