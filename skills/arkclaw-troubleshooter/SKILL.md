---
name: arkclaw-troubleshooter
description: This skill should be used when the user encounters "deployment errors", "installation problems", "configuration issues", "compatibility problems", "API failures", or needs systematic help diagnosing and resolving technical issues with ArkClaw or related systems.
version: 1.0.0
author: OpenClaw Community
tags: [troubleshooting, debugging, technical, support, diagnostics]
---

# ArkClaw Troubleshooter

A systematic technical diagnosis and problem-resolution framework that helps users identify, classify, and resolve technical issues with ArkClaw and related systems. Rather than random attempts, this skill provides structured paths from symptom to solution.

## Purpose

Technical problems trigger panic and random troubleshooting. Users try fixes without understanding the root cause, making things worse. This skill exists to bring order to technical chaos—classifying problems, identifying likely causes, and providing systematic resolution paths.

## Usage

This skill activates when users face technical issues:

- "I'm getting this error and don't know what to do"
- "ArkClaw won't start after installation"
- "This API keeps failing"
- "Something's broken but I can't figure out what"
- "Help me debug this issue systematically"

## Core Framework

### The Troubleshooting Hierarchy

```
Symptom → Problem Type → Root Cause → Solution
   ↓            ↓               ↓            ↓
What you    Category of    What's        How to fix
see         problem        actually      it
                          wrong
```

### Problem Classification

#### Class 1: Installation/Setup Issues
- Won't install
- Install completes but won't run
- Missing dependencies
- Permission errors

#### Class 2: Configuration Issues
- Wrong settings
- Environment variables
- Path problems
- File location issues

#### Class 3: Runtime Errors
- Crashes on startup
- Crashes during operation
- Error messages
- Unexpected behavior

#### Class 4: Performance Issues
- Slow response times
- High resource usage
- Timeout errors
- Memory issues

#### Class 5: Integration/Compatibility
- API failures
- Version conflicts
- Platform-specific issues
- Third-party conflicts

### Systematic Diagnosis Process

#### Step 1: Gather Information
```
What happened?
- Exact error message?
- When did it occur?
- What were you doing?
- What changed recently?
```

#### Step 2: Classify the Problem
```
What type of issue is this?
- Installation/Setup
- Configuration
- Runtime Error
- Performance
- Integration/Compatibility
```

#### Step 3: Check Common Causes
```
For this problem type, check:
- [Most common cause]
- [Second most common]
- [Third most common]
```

#### Step 4: Apply Solutions in Order
```
Try solutions from most to least likely:
1. [Solution 1]
2. [Solution 2]
3. [Solution 3]
```

## Instructions

### When Troubleshooting

1. **Collect the Exact Error**
   - Copy the complete error message
   - Note when it occurs
   - Document what leads to it

2. **Classify the Problem Type**
   - Use the hierarchy above
   - This determines your diagnostic path

3. **Start with High-Probability Checks**
   - Every problem type has common causes
   - Check these first before diving deep

4. **Document Your Attempts**
   - What you've tried
   - What the result was
   - This prevents going in circles

5. **Know When to Escalate**
   - If you've tried 3 systematic solutions
   - If the problem is blocking critical work
   - If you're unfamiliar with the domain

## Output Format

```markdown
# Troubleshooting Report

## Problem Classification
**Type**: [Problem class]
**Symptom**: [What the user is experiencing]

## Diagnostic Path
1. Check: [First thing to verify]
   - Result: [What we found]
2. Check: [Second thing to verify]
   - Result: [What we found]

## Likely Cause
[Most probable root cause]

## Recommended Solutions
1. [Solution 1] - [Why this first]
2. [Solution 2] - [Why this second]
3. [Solution 3] - [If above don't work]

## Prevention
[How to avoid this in the future]
```

## Common Issues & Quick Fixes

### Installation Won't Complete
- Check: Python version compatibility
- Check: Sufficient disk space
- Check: Write permissions
- Fix: Use virtual environment

### Module Not Found
- Check: Package installed?
- Check: Right Python environment?
- Fix: pip install [package]

### Permission Denied
- Check: File permissions
- Fix: chmod +x [file]
- Fix: Run with appropriate permissions

### Port Already in Use
- Check: What's using the port
- Fix: Kill existing process
- Fix: Use different port

## Key Principles

1. **Diagnosis Before Treatment**: Understand before fixing
2. **High Probability First**: Check common causes first
3. **Document Everything**: Track what you've tried
4. **Isolate Variables**: Change one thing at a time
5. **Know When to Stop**: Don't spiral endlessly

## Additional Resources

### References
- **`references/common-errors.md`** - Common error messages and solutions
- **`references/diagnostic-procedures.md`** - Systematic diagnostic procedures
- **`references/arkclaw-architecture.md`** - How ArkClaw works (helps debugging)

### Examples
- **`examples/installation-fix.md`** - Example: Solving installation issues
- **`examples/api-debug.md`** - Example: Debugging API problems

## Memory Anchor

**Troubleshooting isn't about trying everything—it's about trying the right things in the right order.**
