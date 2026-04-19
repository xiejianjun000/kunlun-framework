# Example: Solving Installation Issues

## Problem Report

**User message**:
"I've been trying to install ArkClaw for the last hour and nothing works. I keep getting 'ModuleNotFoundError: No module named 'arkclaw' and I don't know what to do. I already ran pip install arkclaw."

---

## Troubleshooting Process

### Step 1: Gather Information

**Error message**:
```
ModuleNotFoundError: No module named 'arkclaw'
```

**When it occurs**:
- When running: `python -m arkclaw`
- After running: `pip install arkclaw`

**What were you doing**:
- Trying to run ArkClaw for the first time
- Fresh installation on Windows 11

**What changed recently**:
- New Python installation
- Created new virtual environment

---

### Step 2: Classify the Problem

**Problem type**: Installation/Configuration

**Reasoning**:
- Error indicates module not found
- Occurs during first run after installation
- Related to Python environment setup

---

### Step 3: Check Common Causes

**Check 1: Python environment mismatch**

**What to check**: Which Python is being used?

**Command**:
```bash
python --version
which python  # or where python on Windows
pip --version
which pip  # or where pip on Windows
```

**Result**:
- Python: 3.11.0
- pip: 23.1 (attached to Python 3.11)
- BUT: `python` command points to different location than `pip`

**Issue identified**: Multiple Python installations, pip and python are using different environments.

---

**Check 2: Virtual environment activation**

**What to check**: Is virtual environment active?

**Command**:
```bash
echo $VIRTUAL_ENV  # or echo %VIRTUAL_ENV% on Windows
```

**Result**:
- Virtual environment is NOT active
- User installed arkclaw in global env but trying to run from venv

---

### Step 4: Apply Solutions

**Solution 1: Activate virtual environment and reinstall**

```bash
# Activate the virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Verify you're in the right environment
which python
which pip

# Install arkclaw in the active environment
pip install arkclaw

# Test the installation
python -m arkclaw --version
```

**Result**: ✓ Success! ArkClaw now runs correctly.

---

### Alternative Solution 2: Use explicit Python path

If virtual environment setup is complex, specify Python directly:

```bash
# Use the Python that pip is associated with
/path/to/specific/python -m arkclaw
```

---

## Root Cause Analysis

**What went wrong**:
User had multiple Python installations and was installing with one Python but trying to run with another.

**Why it happened**:
- Windows had both system Python and venv Python
- Virtual environment wasn't activated
- pip installed to system Python, python command ran venv Python (without arkclaw)

---

## Prevention

**How to avoid this in the future**:

1. **Always activate venv first** before installing or running
2. **Verify environment** before installing:
   ```bash
   python -m pip --version
   ```
3. **Use python -m pip** instead of direct pip to ensure consistency:
   ```bash
   python -m pip install arkclaw
   ```
4. **Check installations**:
   ```bash
   python -m pip list | grep arkclaw
   ```

---

## Output Format

# Troubleshooting Report

## Problem Classification
**Type**: Installation/Configuration
**Symptom**: ModuleNotFoundError when running arkclaw

## Diagnostic Path
1. Check: Python environment consistency
   - **Result**: Multiple Python installations detected, pip/python mismatch
2. Check: Virtual environment status
   - **Result**: Venv exists but not activated
3. Check: Installation location
   - **Result**: arkclaw installed in system Python, not venv

## Likely Cause
Module installed in one Python environment but being called from another.

## Recommended Solutions
1. **Activate virtual environment** - Use `venv\Scripts\activate` before installing/running
2. **Reinstall in correct environment** - After activation, run `pip install arkclaw`
3. **Verify before running** - Use `python -m pip list` to confirm package is installed

## Prevention
Always activate virtual environments before any package operations. Use `python -m pip` instead of direct `pip` commands to ensure consistency.
