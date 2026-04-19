# Common Error Messages and Solutions

A comprehensive guide to interpreting and resolving common error messages.

## Python Errors

### ModuleNotFoundError

**Error message**:
```
ModuleNotFoundError: No module named 'xxx'
```

**Causes**:
- Package not installed
- Installed in different Python environment
- Typo in module name

**Solutions**:
1. Check package is installed: `pip list | grep xxx`
2. Install package: `pip install xxx`
3. Verify Python environment: `which python` vs `which pip`
4. Use `python -m pip install xxx` to ensure consistency

---

### ImportError

**Error message**:
```
ImportError: cannot import name 'xxx' from 'yyy'
```

**Causes**:
- Function/class doesn't exist in module
- Module version mismatch
- Circular import

**Solutions**:
1. Check module documentation for correct import
2. Upgrade/downgrade module: `pip install yyy --upgrade`
3. Check for circular imports and restructure code

---

### PermissionError

**Error message**:
```
PermissionError: [Errno 13] Permission denied: 'xxx'
```

**Causes**:
- File/directory permissions
- File in use by another process
- Trying to write to read-only location

**Solutions**:
1. Check permissions: `ls -la file`
2. Change permissions: `chmod +x file`
3. Run with appropriate permissions: `sudo` (use carefully)
4. Check if file is locked: `lsof file`

---

### FileNotFoundError

**Error message**:
```
FileNotFoundError: [Errno 2] No such file or directory: 'xxx'
```

**Causes**:
- File doesn't exist
- Wrong path (relative vs absolute)
- Case sensitivity (Linux)

**Solutions**:
1. Verify file exists: `ls file`
2. Use absolute path
3. Check current directory: `pwd`
4. Check for typos in filename

---

## Network Errors

### ConnectionRefusedError

**Error message**:
```
ConnectionRefusedError: [Errno 61] Connection refused
```

**Causes**:
- Service not running
- Wrong port
- Firewall blocking

**Solutions**:
1. Check service is running: `systemctl status service`
2. Verify port: `netstat -an | grep port`
3. Check firewall rules
4. Test connection: `telnet host port`

---

### TimeoutError

**Error message**:
```
TimeoutError: [Errno 60] Connection timed out
```

**Causes**:
- Network latency
- Server overloaded
- Request taking too long

**Solutions**:
1. Increase timeout duration
2. Check network connectivity: `ping host`
3. Verify server status
4. Optimize request or break into smaller requests

---

## Configuration Errors

### KeyError

**Error message**:
```
KeyError: 'xxx'
```

**Causes**:
- Missing key in dictionary
- Wrong config file format
- Environment variable not set

**Solutions**:
1. Check config file syntax
2. Verify all required keys exist
3. Set environment variable: `export KEY=value`
4. Use `.get()` method with default value

---

### ValidationError

**Error message**:
```
ValidationError: xxx
```

**Causes**:
- Invalid data type
- Value out of range
- Missing required field

**Solutions**:
1. Check data types match expected format
2. Validate value ranges
3. Ensure all required fields are present
4. Check schema documentation

---

## Memory Errors

### MemoryError

**Error message**:
```
MemoryError: Unable to allocate array
```

**Causes**:
- Processing too much data at once
- Memory leak
- System out of memory

**Solutions**:
1. Process data in chunks
2. Close unused files/connections
3. Increase available memory
4. Use generators instead of lists

---

### OutOfMemoryError

**Error message**:
```
java.lang.OutOfMemoryError: Java heap space
```

**Causes**:
- Java heap size too small
- Memory leak in application

**Solutions**:
1. Increase heap size: `-Xmx2g`
2. Profile for memory leaks
3. Optimize memory usage
4. Restart application

---

## API Errors

### 401 Unauthorized

**Error message**:
```
HTTP Error 401: Unauthorized
```

**Causes**:
- Invalid API key
- Expired token
- Wrong authentication method

**Solutions**:
1. Verify API key/token
2. Check token expiration
3. Use correct authentication method
4. Regenerate credentials if needed

---

### 404 Not Found

**Error message**:
```
HTTP Error 404: Not Found
```

**Causes**:
- Wrong endpoint URL
- Resource doesn't exist
- API version changed

**Solutions**:
1. Verify endpoint URL
2. Check API documentation
3. Confirm resource exists
4. Test with API explorer

---

### 500 Internal Server Error

**Error message**:
```
HTTP Error 500: Internal Server Error
```

**Causes**:
- Server-side bug
- Database connection issue
- Server overload

**Solutions**:
1. Check server logs
2. Try again later
3. Report issue to API provider
4. Use fallback endpoint if available

---

## Database Errors

### OperationalError

**Error message**:
```
sqlalchemy.exc.OperationalError: (psycopg2.OperationalError) could not connect to server
```

**Causes**:
- Database not running
- Wrong connection parameters
- Network issue

**Solutions**:
1. Check database status
2. Verify connection string
3. Test network connectivity
4. Check database logs

---

### IntegrityError

**Error message**:
```
sqlalchemy.exc.IntegrityError: (psycopg2.IntegrityError) duplicate key value violates unique constraint
```

**Causes**:
- Duplicate record
- Foreign key violation
- Constraint violation

**Solutions**:
1. Check for duplicates before insert
2. Verify foreign key exists
3. Handle constraint violations
4. Use upsert instead of insert

---

## Diagnostic Quick Reference

| Error Type | First Check | Common Fix |
|------------|-------------|------------|
| ModuleNotFoundError | pip list | pip install |
| PermissionError | ls -la | chmod |
| ConnectionRefused | systemctl status | Start service |
| KeyError | config file | Add key |
| 401 Unauthorized | API key | Refresh token |
| 404 Not Found | URL | Check docs |
| 500 Internal Server | Status page | Retry later |

---

## When to Escalate

**Escalate to senior developer if**:
- Error persists after 3 systematic attempts
- Error message is unclear or cryptic
- Multiple users affected
- Production system down
- Security concern

**Information to gather**:
1. Full error message and stack trace
2. Steps to reproduce
3. System environment details
4. What you've already tried
5. Expected vs actual behavior
