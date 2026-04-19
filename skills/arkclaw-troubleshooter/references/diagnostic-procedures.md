# Systematic Diagnostic Procedures

Step-by-step procedures for diagnosing technical issues systematically.

## General Diagnostic Framework

### The Diagnostic Hierarchy

```
1. INFORMATION GATHERING
   - What exactly is happening?
   - When does it happen?
   - What changed recently?

2. PROBLEM CLASSIFICATION
   - What type of issue is this?
   - Which system/component is affected?

3. HIGH-PROBABILITY CHECKS
   - What are the most common causes?
   - Check these first before deep diving

4. SYSTEMATIC ELIMINATION
   - Test variables one at a time
   - Document what works/doesn't

5. SOLUTION VALIDATION
   - Verify the fix actually works
   - Ensure no side effects
```

---

## Procedure 1: Application Won't Start

### Step 1: Basic Checks

**Check if application is installed**:
```bash
# Verify installation
which app_name
app_name --version

# Check package manager
pip list | grep app_name
npm list -g | grep app_name
```

**Check system resources**:
```bash
# Disk space
df -h

# Memory
free -h  # Linux
vm_stat  # macOS

# CPU
top -n 1
```

### Step 2: Configuration Check

**Verify configuration files**:
```bash
# Check if config exists
ls -la ~/.config/app_name/
ls -la /etc/app_name/

# Validate config syntax
python -c "import json; json.load(open('config.json'))"
```

**Check environment variables**:
```bash
env | grep APP_NAME
printenv | grep -i app
```

### Step 3: Dependencies Check

**Verify all dependencies installed**:
```bash
# Python
pip check

# Node
npm ci

# System packages
ldd app_name  # Linux shared libraries
otool -L app_name  # macOS
```

### Step 4: Log Analysis

**Check application logs**:
```bash
# Application logs
tail -f /var/log/app_name/error.log
tail -f ~/.local/share/app_name/logs/*.log

# System logs
journalctl -u app_name -f
dmesg | tail
```

**Look for patterns**:
- Error keywords: ERROR, FAIL, exception, fatal
- Repeated messages
- Timestamps of failures
- Correlation with other events

### Step 5: Clean Start

**Reset to clean state**:
```bash
# Clear cache
rm -rf ~/.cache/app_name/

# Reset config (backup first!)
cp config.json config.json.bak
rm config.json

# Reinstall
pip install --force-reinstall app_name
```

---

## Procedure 2: Performance Issues

### Step 1: Baseline Measurement

**Establish what "slow" means**:
```bash
# Measure load time
time app_name

# Profile application
python -m cProfile app_name
node --prof app.js

# Check response time
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:8000/api
```

### Step 2: Resource Monitoring

**Monitor during operation**:
```bash
# CPU and memory
top -p $(pgrep app_name)
htop

# Disk I/O
iotop
iostat -x 1

# Network
netstat -an | grep port
tcpdump -i any port 8000
```

### Step 3: Bottleneck Identification

**Profile specific operations**:
```bash
# Python profiling
python -m cProfile -o profile.stats app_name
python -m pstats profile.stats

# Memory profiling
python -m memory_profiler app_name

# Database queries
# Enable query logging
tail -f database/slow.log
```

### Step 4: Common Bottlenecks

**Check for**:
1. **N+1 queries** - Database query in loops
2. **Memory leaks** - Growing memory over time
3. **Lock contention** - Waiting on shared resources
4. **Network latency** - Remote calls in tight loops
5. **Inefficient algorithms** - O(n²) where O(n) possible

### Step 5: Optimization

**Quick wins**:
1. Add indexing to database
2. Cache frequently accessed data
3. Optimize hot paths
4. Lazy load non-critical resources
5. Use connection pooling

---

## Procedure 3: API/Service Failures

### Step 1: Endpoint Testing

**Test basic connectivity**:
```bash
# Health check
curl http://localhost:8000/health

# Ping server
ping api.example.com

# Test port
nc -zv localhost 8000
telnet localhost 8000
```

### Step 2: Authentication Check

**Verify credentials**:
```bash
# Test with curl
curl -H "Authorization: Bearer $TOKEN" http://api.example.com/endpoint

# Decode and verify JWT
echo $TOKEN | jwt decode -

# Check token expiration
echo $TOKEN | jwt decode - | grep exp
```

### Step 3: Request Analysis

**Inspect request details**:
```bash
# Verbose curl output
curl -v http://api.example.com/endpoint

# Check headers
curl -I http://api.example.com/endpoint

# Time the request
curl -w "@curl-format.txt" http://api.example.com/endpoint
```

### Step 4: Response Analysis

**Check response**:
```bash
# Pretty print JSON
curl http://api.example.com/endpoint | jq .

# Check response headers
curl -I http://api.example.com/endpoint

# Measure size
curl -s http://api.example.com/endpoint | wc -c
```

### Step 5: Rate Limit Check

**Monitor for rate limiting**:
```bash
# Watch for rate limit headers
curl -I http://api.example.com/endpoint | grep -i rate

# Implement exponential backoff
# Initial request: 0ms delay
# After 429: wait 1s, then 2s, then 4s...
```

---

## Procedure 4: Database Issues

### Step 1: Connection Test

**Test database connectivity**:
```bash
# PostgreSQL
psql -h localhost -U user -d database

# MySQL
mysql -h localhost -u user -p database

# MongoDB
mongo --host localhost --port 27017

# Redis
redis-cli ping
```

### Step 2: Query Analysis

**Identify slow queries**:
```sql
-- Enable slow query log
SET slow_query_log = 'ON';
SET long_query_time = 1;

-- Check running queries
SHOW PROCESSLIST;

-- Analyze query plan
EXPLAIN ANALYZE SELECT * FROM table WHERE condition;
```

### Step 3: Index Check

**Verify indexes exist**:
```sql
-- List indexes
SHOW INDEX FROM table;

-- Check index usage
EXPLAIN SELECT * FROM table WHERE condition;

-- Find missing indexes
-- (database-specific tools)
```

### Step 4: Data Integrity

**Check for corruption**:
```bash
# PostgreSQL
REINDEX DATABASE database_name;

# MySQL
REPAIR TABLE table_name;

# MongoDB
db.repairDatabase();
```

---

## Procedure 5: Network Issues

### Step 1: Local Network Check

**Test local connectivity**:
```bash
# Check interface
ifconfig  # macOS/Linux
ipconfig  # Windows

# Check routing
netstat -rn
route -n

# Test DNS
nslookup example.com
dig example.com
```

### Step 2: External Connectivity

**Test internet access**:
```bash
# Basic connectivity
ping 8.8.8.8
ping google.com

# Trace route
traceroute google.com
mtr google.com

# DNS resolution
host example.com
dig example.com ANY
```

### Step 3: Port Accessibility

**Check if ports are open**:
```bash
# Scan local ports
netstat -tuln | grep LISTEN
lsof -i :8000

# Scan remote ports
nmap -p 80,443 example.com

# Test specific port
nc -zv example.com 443
telnet example.com 80
```

### Step 4: Firewall Check

**Verify firewall rules**:
```bash
# Linux (ufw)
sudo ufw status
sudo ufw allow 8000

# Linux (iptables)
sudo iptables -L -n

# macOS (pfctl)
sudo pfctl -s rules

# Windows
netsh advfirewall show allprofiles
```

---

## Diagnostic Checklist

Use this checklist for systematic diagnosis:

### Information Gathering
- [ ] Get exact error message
- [ ] Note when error occurs
- [ ] Document what leads to error
- [ ] Identify what changed recently
- [ ] Check system logs

### Problem Classification
- [ ] Installation issue?
- [ ] Configuration issue?
- [ ] Runtime error?
- [ ] Performance issue?
- [ ] Network/API issue?

### Common Checks (High Probability)
- [ ] Is service running?
- [ ] Are permissions correct?
- [ ] Is disk space available?
- [ ] Are dependencies installed?
- [ ] Is configuration valid?

### Documentation
- [ ] Record what you tried
- [ ] Record results
- [ ] Note what worked/failed
- [ ] Document final solution

---

## Quick Reference Commands

```bash
# System info
uname -a              # OS/kernel version
df -h                 # Disk usage
free -h               # Memory usage
uptime                # System uptime

# Process info
ps aux                # All processes
top                   # Live process view
htop                  # Interactive process view

# Network info
ifconfig              # Network interfaces
netstat -tuln         # Network connections
ping host             # Test connectivity
traceroute host       # Route to host

# Logs
journalctl -u service # Systemd service logs
tail -f file.log      # Follow log file
dmesg                 # Kernel messages

# Package info
pip list              # Python packages
npm list -g           # Global npm packages
apt list --installed  # Debian/Ubuntu packages
```
