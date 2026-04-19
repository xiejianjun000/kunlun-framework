# Example: Debugging Slow Database Queries

## Problem Report

**User message**:
"Our dashboard takes forever to load. The page just spins for 20-30 seconds before showing anything. This used to load in under 2 seconds."

---

## Troubleshooting Process

### Step 1: Gather Information

**Symptom**: Dashboard page load time increased from <2s to 20-30s

**When it occurs**:
- Every page load
- Started gradually over the past week
- Affects all users

**Context**:
- Dashboard shows user statistics, recent activity, and charts
- Uses PostgreSQL database
- Deployed 3 months ago, worked fine until recently

---

### Step 2: Classify the Problem

**Problem type**: Performance

**Likely cause areas**:
- Database query performance
- N+1 query problems
- Missing database indexes
- Data volume increase

---

### Step 3: Investigate Database Queries

**Enable query logging**:

```python
# settings.py
LOGGING = {
    'version': 1,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'django.db.backends': {
            'level': 'DEBUG',
            'handlers': ['console'],
        },
    },
}
```

**Check what queries are running**:

```sql
-- Enable slow query log
ALTER DATABASE mydb SET log_min_duration_statement = 1000;

-- Check current queries
SELECT pid, now() - query_start as duration, query
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY duration DESC;
```

---

### Step 4: Identify the Problem Query

**Found problematic query**:

```python
# Dashboard view
def dashboard(request):
    # User stats
    user = User.objects.get(id=request.user.id)

    # Recent activity (THE PROBLEM)
    activities = Activity.objects.filter(
        user=user
    ).order_by('-created_at')[:50]

    # For each activity, fetch related objects
    for activity in activities:
        activity.target_type  # Each causes a query!
        activity.target       # Another query!
        activity.actor        # Yet another query!
```

**Query analysis**:

```
Page load causes:
1 initial query to fetch activities
+ 50 queries for target_type
+ 50 queries for target
+ 50 queries for actor
= 151 queries total!
```

**This is the classic N+1 query problem.**

---

### Step 5: Verify with EXPLAIN ANALYZE

```sql
EXPLAIN ANALYZE
SELECT * FROM activity
WHERE user_id = 123
ORDER BY created_at DESC
LIMIT 50;

-- Result:
-- Index Scan using activity_user_id_idx on activity  (cost=0.42..1234.56 rows=50 width=234) (actual time=0.123..456.789 rows=50 loops=1)
--   Index Cond: (user_id = 123)
-- Planning Time: 0.234 ms
-- Execution Time: 456.789 ms  ← Nearly 500ms just for this query!
```

---

### Step 6: Check Indexes

```sql
-- Check existing indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'activity';

-- Result:
-- "activity_pkey" PRIMARY KEY, btree (id)
-- "activity_user_id_idx" btree (user_id)  ← Index exists
```

**Index exists**, but queries are still slow because:
1. Query fetches 50 rows (not too many)
2. But then makes 3 additional queries PER ROW
3. 50 rows × 3 queries = 150 extra queries

---

### Step 7: Solutions

**Solution 1: Use select_related() for ForeignKeys**

```python
# BEFORE: 151 queries
activities = Activity.objects.filter(
    user=user
).order_by('-created_at')[:50]

# AFTER: 3 queries (1 for activities, 1 for targets, 1 for actors)
activities = Activity.objects.filter(
    user=user
).select_related(
    'target',      # ForeignKey
    'actor'        # ForeignKey
).order_by('-created_at')[:50]
```

**Result**: Page load time reduced from 25s to 4s

---

**Solution 2: Use prefetch_related() for ManyToMany**

```python
# For reverse relationships or ManyToMany
activities = Activity.objects.filter(
    user=user
).select_related('target', 'actor').prefetch_related(
    'tags',              # ManyToMany
    'comments'           # Reverse ForeignKey
).order_by('-created_at')[:50]
```

**Result**: Page load time reduced to 2s

---

**Solution 3: Add database indexes for filtering**

```sql
-- Add composite index for user + created_at
CREATE INDEX CONCURRENTLY activity_user_created_idx
ON activity(user_id, created_at DESC);

-- Now EXPLAIN ANALYZE shows:
-- Index Scan using activity_user_created_idx on activity
-- Execution Time: 12.345 ms  ← Down from 456ms!
```

**Result**: Page load time reduced to <1s

---

**Solution 4: Implement pagination**

```python
# Don't load all activities at once
from django.core.paginator import Paginator

def dashboard(request):
    activities_qs = Activity.objects.filter(
        user=user
    ).select_related('target', 'actor')

    paginator = Paginator(activities_qs, 20)  # 20 per page
    page = request.GET.get('page')
    activities = paginator.get_page(page)

    # ... rest of view
```

**Result**: Initial page load <500ms

---

## Root Cause Analysis

**What happened**:

1. **Initially**: Small dataset, queries ran fast enough
2. **Over time**: Activity table grew to 1M+ rows
3. **Problem surfaced**: N+1 queries became noticeable with more data
4. **Why gradual**: Performance degraded linearly with data growth

**The N+1 Problem**:
- 1 initial query fetches 50 activities
- 50 queries for target_type
- 50 queries for target
- 50 queries for actor
- Total: 151 queries for one page load

---

## Prevention

### 1. Query Monitoring

**Add query count monitoring**:

```python
# middleware.py
import logging
from django.db import connection

class QueryLoggingMiddleware:
    def __init__(get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Log query count
        query_count = len(connection.queries)
        if query_count > 50:  # Alert threshold
            logging.warning(
                f"High query count: {query_count} for {request.path}"
            )

        return response
```

### 2. Performance Testing

**Add to CI/CD**:

```python
# tests.py
from django.test import TestCase
from django.test.utils import override_settings
import django.db.connection

class PerformanceTestCase(TestCase):
    @override_settings(DEBUG=True)
    def test_dashboard_query_count(self):
        self.client.login(username='user', password='pass')

        with self.assertNumQueries(5):  # Should be ≤5 queries
            response = self.client.get('/dashboard/')
            self.assertEqual(response.status_code, 200)
```

### 3. Regular Index Review

**Query to find missing indexes**:

```sql
-- Find tables with missing indexes
SELECT schemaname, tablename,
       seq_scan, seq_tup_read,
       idx_scan, idx_tup_fetch
FROM pg_stat_user_tables
WHERE seq_scan > 1000  -- High sequential scans
  AND idx_scan < seq_scan / 10  -- Low index usage
ORDER BY seq_scan DESC;
```

### 4. Load Testing

**Before deployment**:

```python
# load_test.py
from locust import HttpUser, task

class DashboardUser(HttpUser):
    @task
    def view_dashboard(self):
        self.client.get("/dashboard/")

# Run: locust -f load_test.py --users=100 --spawn-rate=10
```

---

## Troubleshooting Report

# Slow Dashboard - Troubleshooting Report

## Problem Classification
**Type**: Performance (Database)
**Symptom**: Page load time increased from <2s to 20-30s

## Diagnostic Path
1. **Check**: Application code for obvious issues
   - **Result**: No obvious problems
2. **Check**: Database query logs
   - **Result**: 151 queries for single page load
3. **Check**: Query execution plans
   - **Result**: N+1 query problem identified
4. **Check**: Database indexes
   - **Result**: Indexes exist but don't help N+1 problem

## Root Cause
Classic N+1 query problem: 1 initial query + 50 rows × 3 related queries = 151 total queries. Performance degraded linearly as dataset grew from thousands to millions of rows.

## Recommended Solutions
1. **Use select_related()** - Reduce queries by fetching ForeignKeys in initial query
2. **Add composite index** - Speed up the filtering query (user_id, created_at)
3. **Implement pagination** - Reduce per-page query count
4. **Add query monitoring** - Alert when query count exceeds threshold

## Results
| Solution | Page Load Time | Query Count |
|----------|---------------|-------------|
| Before | 25s | 151 |
| After select_related | 4s | 3 |
| After indexes | 2s | 3 |
| After pagination | <1s | 3 |

## Prevention
- Enable query logging in development
- Add query count assertions to tests
- Use django-debug-toolbar for query inspection
- Implement query count monitoring in production
- Regular performance audits with growing datasets

---

## Key Takeaways

1. **N+1 is silent at small scale** - Works fine with 100 rows, fails at 1M rows
2. **Measure before optimizing** - Query logs revealed the exact problem
3. **Use the right tools** - select_related/prefetch_related exist for this reason
4. **Test at scale** - Performance tests with realistic data catch issues early
5. **Monitor continuously** - Add query count alerts to catch regressions
