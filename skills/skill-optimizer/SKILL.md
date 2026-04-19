---
name: skill-optimizer
description: This skill should be used when the user asks to "improve this skill", "optimize my skill", "review my skill design", "analyze this skill's effectiveness", or needs help evaluating and improving existing skill definitions and implementations.
version: 1.0.0
author: OpenClaw Community
tags: [optimization, improvement, analysis, quality, review]
---

# Skill Optimizer

A skill analysis and optimization framework that evaluates existing skills to identify weaknesses, suggest improvements, and enhance effectiveness. Rather than rewriting from scratch, this skill diagnoses what's working and what needs refinement.

## Purpose

Many skills are created but never refined. They work but could work better. Issues like unclear positioning, weak descriptions, or missing resources hold skills back from their potential. This skill exists to transform "good enough" skills into excellent ones through systematic analysis and targeted improvements.

## Usage

This skill activates when users need skill evaluation:

- "Review my skill and tell me how to improve it"
- "This skill isn't working as well as I hoped"
- "Analyze this skill's design"
- "Help me optimize this skill"
- "What's wrong with my skill?"

## Core Framework

### The Five Dimensions of Skill Quality

#### Dimension 1: Positioning Clarity
**Is the skill's purpose crystal clear?**

**Checks**:
- Can someone immediately understand when to use this?
- Is the description specific with trigger phrases?
- Does the name match the function?
- Is the category clear?

**Red Flags**:
- Vague descriptions ("helps with tasks")
- Generic names ("helper", "assistant")
- Unclear use cases
- Overlapping purpose with other skills

#### Dimension 2: Content Completeness
**Does the skill have what it needs to work?**

**Checks**:
- Is the body substantial (not just frontmatter)?
- Are instructions clear and actionable?
- Are examples provided?
- are references/bundled resources included?

**Red Flags**:
- SKILL.md < 500 words
- No usage examples
- Missing key information
- Incomplete instructions

#### Dimension 3: Trigger Effectiveness
**Will the right situations activate this skill?**

**Checks**:
- Are trigger phrases specific and natural?
- Does description use third person properly?
- Are trigger patterns covered?
- Is activation reliable?

**Red Flags**:
- First-person descriptions ("I help you...")
- Vague triggers ("when you need help")
- Missing common use cases
- Confusing with other skills

#### Dimension 4: Structural Soundness
**Is the skill well-organized?**

**Checks**:
- Is frontmatter valid and complete?
- Is structure logical?
- Are sections properly ordered?
- Is formatting consistent?

**Red Flags**:
- Invalid YAML
- Missing required fields
- Inconsistent formatting
- Confusing organization

#### Dimension 5: User Value Delivery
**Does the skill actually deliver value?**

**Checks**:
- Does it solve a real problem?
- Is the output useful?
- Is it efficient (not too verbose)?
- Is it reliable?

**Red Flags**:
- Doesn't solve the stated problem
- Outputs are generic/unhelpful
- Too long/verbose
- Inconsistent behavior

## Diagnosis Process

### Step 1: Positioning Analysis
```
Current Positioning:
- Name: [Evaluation]
- Description: [Evaluation]
- Category: [Evaluation]

Issues Found:
- [Issue 1]
- [Issue 2]

Recommendations:
- [Improvement 1]
- [Improvement 2]
```

### Step 2: Content Audit
```
Content Analysis:
- Word count: [X words]
- Sections present: [List]
- Completeness: [Rating]

Gaps Identified:
- [Missing content]
- [Weak areas]
```

### Step 3: Trigger Review
```
Trigger Analysis:
- Current triggers: [List]
- Effectiveness: [Rating]
- Missing triggers: [List]

Improvements:
- [New trigger suggestions]
```

### Step 4: Output Quality Check
```
Output Evaluation:
- Typical output quality: [Rating]
- Consistency: [Rating]
- Actionability: [Rating]

Issues:
- [Output problems]

Improvements:
- [How to fix]
```

### Step 5: Overall Assessment
```
Skill Quality Score: [X/100]

Strengths:
- [What works]

Weaknesses:
- [What doesn't]

Priority Improvements:
1. [Most important fix]
2. [Second important]
3. [Third important]
```

## Optimization Recommendations

### High-Impact Improvements

**1. Strengthen the Description**
```
Before: "This skill helps with writing"
After: "This skill should be used when the user asks to 'write an email', 'draft a document', 'create content', or needs assistance with written communication."
```

**2. Add Concrete Examples**
```
Add: Examples section with 2-3 real usage scenarios
```

**3. Clarify the Output Format**
```
Add: Expected output format and structure
```

**4. Tighten the Scope**
```
Remove: Anything outside the skill's core purpose
```

**5. Improve Instructions**
```
Make: Steps more actionable and specific
```

## Output Format

```markdown
# Skill Analysis Report

## Skill: [Skill Name]

## Overall Quality Score: [X/100]

## Dimension Scores
- Positioning: [X/20]
- Content: [X/20]
- Triggers: [X/20]
- Structure: [X/20]
- Value Delivery: [X/20]

## Strengths
[What works well]

## Issues Found
[Problems identified]

## Recommended Improvements

### Priority 1 (Critical)
1. [Issue] → [Fix]

### Priority 2 (Important)
1. [Issue] → [Fix]

### Priority 3 (Nice to Have)
1. [Issue] → [Fix]

## Revised Description (Suggested)
[Better description]

## Revised Triggers (Suggested]
[Additional triggers]
```

## Key Principles

1. **Specific Over General**: Clear, narrow focus beats broad vagueness
2. **Third-Person Voice**: "This skill should be used when..." not "I help..."
3. **Trigger Phrases Matter**: Include exact phrases users would say
4. **Content Completeness**: SKILL.md should be substantial (1000+ words)
5. **Output Focus**: The skill should actually solve its stated problem

## Additional Resources

### References
- **`references/skill-design-principles.md`** - Principles of good skill design
- **`references/skill-quality-checklist.md`** - Complete quality checklist
- **`references/trigger-phrasing.md`** - How to write effective triggers

### Templates
- **`templates/skill-review-template.md`** - Template for reviewing skills
- **`templates/improvement-plan.md`** - Template for planning improvements

### Examples
- **`examples/skill-before-after.md`** - Example: Skill optimization comparison
- **`examples/positioning-fix.md`** - Example: Fixing unclear positioning

## Memory Anchor

**Most skills don't need to be rewritten—they need to be clarified, tightened, and completed.**
