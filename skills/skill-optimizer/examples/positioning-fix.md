# Example: Fixing Unclear Positioning

## Problem Identification

### Original Skill

```yaml
---
name: helper
description: I help you with stuff
version: 1.0.0
---
```

### Issues

1. **Generic name**: "helper" could be anything
2. **First-person**: Uses "I" instead of third-person
3. **Vague description**: "help with stuff" is meaningless
4. **No triggers**: No indication of when to use this
5. **No scope**: Unclear what it actually does

---

## Analysis

### What Does This Skill Actually Do?

Let's say we examine the content and find it's about:
- Creating automated workflows
- Scheduling tasks
- Setting up cron jobs
- Designing batch processes

### What's the Core Purpose?

**Purpose**: Help users design and implement automated workflows and scheduled tasks.

### Who Would Use This?

- Developers automating repetitive tasks
- DevOps engineers setting up scheduled jobs
- Productivity enthusiasts creating workflows
- Anyone wanting to automate manual processes

### When Would They Use It?

- When they have a repetitive task
- When they need to schedule something
- When they want to create a workflow
- When they're designing automation

---

## Solution: Redefine Positioning

### Step 1: Rename the Skill

**Bad names**:
- helper (too generic)
- automation (too broad)
- workflow-skill (vague)

**Better names**:
- task-automation-helper
- workflow-automation-designer
- scheduled-job-creator
- automation-workflow-architect

**Chosen name**: `workflow-automation-helper`

**Why**:
- "workflow" indicates the domain
- "automation" indicates the purpose
- "helper" indicates the role
- Clear and descriptive

### Step 2: Rewrite Description

**Before**:
```yaml
description: I help you with stuff
```

**After**:
```yaml
description: This skill should be used when the user asks to "automate a task", "create a workflow", "schedule a job", "set up automation", "design a batch process", or needs help designing and implementing automated workflows and scheduled tasks.
```

**Why this works**:
- Third-person: "This skill should be used when..."
- Specific triggers: "automate a task", "create a workflow", etc.
- Multiple variations: Covers different ways users might ask
- Clear scope: "designing and implementing automated workflows"
- Comprehensive: Ends with general capability description

### Step 3: Add Metadata

```yaml
---
name: workflow-automation-helper
description: This skill should be used when the user asks to "automate a task", "create a workflow", "schedule a job", "set up automation", "design a batch process", or needs help designing and implementing automated workflows and scheduled tasks.
version: 1.0.0
author: OpenClaw Community
tags: [automation, workflow, scheduling, productivity, cron]
---
```

**Why**:
- **author**: Credits the creator
- **tags**: Helps with discovery via ClawHub
- **version**: Follows semantic versioning

### Step 4: Expand Content

**Before** (problematic):
```markdown
# Helper

I can help you do things. Just ask me what you need.

## Usage

Use me when you need help.

## Instructions

Tell me what to do and I'll do it.
```

**After** (fixed):
```markdown
# Workflow Automation Helper

A workflow automation and scheduling skill that helps users design, implement, and manage automated tasks and workflows. This skill transforms manual processes into efficient, repeatable automations.

## Purpose

Many tasks are performed manually despite being repetitive and rule-based. This skill exists to identify automation opportunities, design efficient workflows, and implement reliable automation solutions.

## Usage

This skill activates when users need automation help:

- "Help me automate this task"
- "Create a workflow for [process]"
- "Schedule this job to run daily"
- "Set up automated reminders"
- "Design a batch process"

## Core Framework

### Automation Assessment

Evaluate tasks for automation potential:

1. **Frequency**: How often is the task performed?
2. **Complexity**: How complex is the task?
3. **Variability**: Does the task change each time?
4. **Volume**: What's the volume of items processed?
5. **Error Rate**: How error-prone is the manual process?

### Workflow Design

Design automation workflows:

```
Trigger → Condition Check → Actions → Error Handling → Logging
```

## Instructions

### Step 1: Understand the Task
Gather requirements: inputs, outputs, decision points

### Step 2: Assess Automation Potential
Use the assessment criteria

### Step 3: Design the Workflow
Map out the automation flow

### Step 4: Implement
Create the automation

### Step 5: Test and Monitor
Verify and track performance

## Key Principles

1. Start Simple
2. Error Handling
3. Monitoring
4. Iterative
5. Documentation

## Additional Resources

### Scripts
- **`scripts/workflow_builder.py`** - Build workflow definitions
- **`scripts/scheduler.py`** - Schedule automation jobs

### References
- **`references/automation-patterns.md`** - Common automation patterns
- **`references/tools-guide.md`** - Automation tool comparisons

### Examples
- **`examples/email_automation.md`** - Email workflow automation
- **`examples/data_sync.md`** - Data synchronization

### Assets
- **`templates/workflow_template.md`** - Workflow design template
- **`templates/checklist.md`** - Automation readiness checklist
```

---

## Impact Assessment

### Before Redesign

**Positioning Score**: 2/10
- Generic name
- Vague description
- No clear triggers
- Unclear purpose

**User Experience**:
- Users wouldn't know when to use this
- Activation would be unpredictable
- Overlap with other skills
- Low discoverability

### After Redesign

**Positioning Score**: 9/10
- Specific, descriptive name
- Clear, detailed description
- Multiple trigger phrases
- Well-defined scope

**User Experience**:
- Clear when to use this skill
- Reliable activation
- Distinct from other skills
- Easy to discover

---

## Key Takeaways

### Positioning Matters

A well-positioned skill:
1. Has a clear, descriptive name
2. Uses third-person descriptions
3. Includes specific trigger phrases
4. Defines a focused scope
5. Stands apart from other skills

### The Fix Process

1. **Identify**: What does the skill actually do?
2. **Define**: What's the core purpose?
3. **Rename**: Choose a descriptive name
4. **Rewrite**: Create proper description with triggers
5. **Expand**: Add comprehensive content
6. **Test**: Verify positioning is clear

### Testing Your Positioning

Ask these questions:
- Would someone know what this does from the name?
- Would they know when to use it from the description?
- Is it clear how this differs from similar skills?
- Are the triggers natural phrases users would say?
- Is the scope focused or too broad?

If any answer is "no", keep refining.

---

## Before/After Comparison

| Aspect | Before | After |
|--------|--------|-------|
| Name | helper | workflow-automation-helper |
| Description | "I help with stuff" | Specific triggers + scope |
| Person | First-person | Third-person |
| Triggers | None | 5 specific phrases |
| Purpose | Unclear | Automate workflows |
| Scope | Everything | Workflow automation |
| Content | 50 words | 1500+ words |
| Resources | None | Scripts, refs, examples, assets |
| Score | 15/100 | 92/100 |

**Positioning isn't just marketing—it's fundamental to skill usability.**
