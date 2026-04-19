# Common ArkClaw Errors and Solutions

Quick reference for resolving common ArkClaw issues.

## Installation Issues

### Error: "Module not found: arkclaw"

**Cause**: ArkClaw is not installed or not in Python path

**Solutions**:
```bash
# Install ArkClaw
pip install arkclaw

# Or if using local copy
pip install -e /path/to/arkclaw

# Verify installation
python -c "import arkclaw; print(arkclaw.__version__)"
```

### Error: "Permission denied" during install

**Cause**: Insufficient permissions to install packages

**Solutions**:
```bash
# Use user directory
pip install --user arkclaw

# Or use virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install arkclaw
```

### Error: "Python version too old"

**Cause**: ArkClaw requires Python 3.8+

**Solutions**:
```bash
# Check Python version
python --version

# Update Python if needed
# Visit python.org to download latest version
```

---

## Configuration Issues

### Error: "Config file not found"

**Cause**: ArkClaw cannot locate configuration file

**Solutions**:
```bash
# Create default config
mkdir -p ~/.arkclaw
arkclaw --init-config

# Or specify config location
arkclaw --config /path/to/config.json
```

### Error: "Invalid configuration format"

**Cause**: config.json has syntax errors

**Solutions**:
```bash
# Validate JSON
python -c "import json; json.load(open('config.json'))"

# Fix syntax errors
# Common issues: missing commas, trailing commas, unmatched brackets
```

### Error: "Environment variable not set"

**Cause**: Required environment variable is missing

**Solutions**:
```bash
# Set environment variable
export ARKCLAW_API_KEY="your-key"

# Or add to ~/.bashrc or ~/.zshrc
echo 'export ARKCLAW_API_KEY="your-key"' >> ~/.bashrc
source ~/.bashrc

# Windows PowerShell
setx ARKCLAW_API_KEY "your-key"
```

---

## Runtime Issues

### Error: "Port already in use"

**Cause**: Another process is using the configured port

**Solutions**:
```bash
# Find process using the port
lsof -i :8000  # Linux/Mac
netstat -ano | findstr :8000  # Windows

# Kill the process
kill -9 <PID>  # Linux/Mac
taskkill /PID <PID> /F  # Windows

# Or use different port
arkclaw --port 8001
```

### Error: "Insufficient memory"

**Cause**: ArkClaw is running out of RAM

**Solutions**:
```bash
# Check memory usage
arkclaw --stats

# Clear cache
arkclaw --clear-cache

# Reduce memory usage in config
# Set "max_memory": "2GB" in config.json
```

### Error: "Connection refused"

**Cause**: Cannot connect to required service

**Solutions**:
```bash
# Check if service is running
arkclaw --status

# Restart service
arkclaw --restart

# Verify network connectivity
ping api.arkclaw.ai
```

---

## Performance Issues

### Slow response times

**Diagnosis**:
```bash
# Check response time
arkclaw --benchmark

# View resource usage
arkclaw --stats
```

**Solutions**:
- Clear cache: `arkclaw --clear-cache`
- Reduce batch size
- Upgrade hardware resources
- Check for background processes

### High CPU usage

**Diagnosis**:
```bash
# Monitor CPU
top -p $(pgrep arkclaw)
```

**Solutions**:
- Reduce concurrent operations
- Optimize workflow
- Check for infinite loops
- Update to latest version

---

## Integration Issues

### API authentication failed

**Solutions**:
```bash
# Test API credentials
arkclaw --test-api

# Regenerate API key
# Visit ArkClaw dashboard to create new key

# Update config with new key
arkclaw --config-set api_key YOUR_NEW_KEY
```

### Skill not loading

**Solutions**:
```bash
# List available skills
arkclaw --list-skills

# Verify skill file exists
ls ~/.arkclaw/skills/

# Reload skills
arkclaw --reload-skills

# Validate skill syntax
arkclaw --validate-skill skill-name
```

---

## Getting Help

If these solutions don't resolve your issue:

1. **Enable debug mode**:
   ```bash
   arkclaw --debug
   ```

2. **Check logs**:
   ```bash
   tail -f ~/.arkclaw/logs/arkclaw.log
   ```

3. **Get system info**:
   ```bash
   arkclaw --system-info
   ```

4. **Report issue**: Include debug output and system info

---

## Prevention

### Regular Maintenance

```bash
# Update ArkClaw
pip install --upgrade arkclaw

# Clean old logs
arkclaw --clean-logs --older-than 30d

# Verify installation
arkclaw --health-check
```

### Best Practices

- Use virtual environments
- Keep dependencies updated
- Monitor resource usage
- Regular backups of config
- Document custom configurations
