# Trigger Phrasing Guide

How to write effective trigger phrases that ensure skills activate when they should.

## What Are Trigger Phrases?

Trigger phrases are specific expressions that, when used by users, should activate a skill. They're the primary mechanism for skill discovery and activation.

**Good trigger phrases**:
- Are natural language users actually say
- Are specific to the skill's purpose
- Cover multiple variations
- Include both question and command formats

## The Anatomy of a Good Trigger Phrase

```
[Action Verb] + [Object/Topic] + [Context/Modifier]
```

**Examples**:
- "design [API authentication]" → clear action + topic
- "create [workflow] for [data processing]" → action + object + context
- "help me [choose between] [options]" → action + specific task

---

## Trigger Phrase Patterns

### Pattern 1: Direct Commands

**Format**: `[Verb] [object]`

**Examples**:
- "create a workflow"
- "design an API"
- "analyze this code"
- "optimize the query"

**Use when**: The user is giving a direct instruction

### Pattern 2: Help Requests

**Format**: `help [verb] [object]` or `help me [verb] [object]`

**Examples**:
- "help design a workflow"
- "help me analyze this code"
- "help optimize the query"

**Use when**: The user is requesting assistance

### Pattern 3: Questions

**Format**: `how [verb] [object]?` or `what [verb] [object]?`

**Examples**:
- "how do I design an API?"
- "what's the best approach for authentication?"
- "how can I optimize this query?"

**Use when**: The user is asking for guidance

### Pattern 4: Problem Statements

**Format**: `I need [solution] for [problem]`

**Examples**:
- "I need authentication for my API"
- "I need a workflow for data processing"
- "I need to optimize my database queries"

**Use when**: The user is describing a problem

### Pattern 5: Capability Requests

**Format**: `can you [verb] [object]?`

**Examples**:
- "can you design an API?"
- "can you create a workflow?"
- "can you help me choose?"

**Use when**: The user is checking capability

---

## Trigger Phrase Quality Checklist

For each trigger phrase, check:

- [ ] **Natural**: Would a real person actually say this?
- [ ] **Specific**: Clear what the user wants
- [ ] **Relevant**: Matches the skill's purpose
- [ ] **Distinct**: Not overlapping with other skills
- [ ] **Complete**: Contains enough context to activate

---

## Examples by Skill Type

### Design Skills

**Good triggers**:
- "design [system/component]"
- "create architecture for [purpose]"
- "plan the structure of [project]"
- "help me design [something]"

**Bad triggers**:
- "design help" (too vague)
- "make something" (too generic)
- "I'm designing" (incomplete thought)

### Analysis Skills

**Good triggers**:
- "analyze [data/code/system]"
- "evaluate [options/approach]"
- "assess the [quality/feasibility]"
- "review [code/design]"

**Bad triggers**:
- "look at this" (vague)
- "check it" (unclear what to check)
- "analysis" (not a natural phrase)

### Creation Skills

**Good triggers**:
- "create [document/content/code]"
- "write [document/content]"
- "generate [output/format]"
- "build [structure/system]"

**Bad triggers**:
- "make" (too generic)
- "create stuff" (too vague)
- "do creation" (unnatural)

### Decision Skills

**Good triggers**:
- "choose between [options]"
- "decide on [approach/option]"
- "compare [alternatives]"
- "help me decide [what/which/how]"

**Bad triggers**:
- "decide" (incomplete)
- "choose" (no context)
- "I need to choose" (missing object)

---

## Trigger Phrase Variations

Cover multiple ways users might express the same need:

**For a "workflow design" skill**:
- "design a workflow"
- "create a workflow"
- "plan a process"
- "structure this task"
- "turn this into steps"
- "create a process for [task]"
- "how should I approach [task]?"

**For an "API design" skill**:
- "design an API"
- "create API endpoints"
- "define API contracts"
- "specify API interface"
- "plan the API structure"
- "help with API design"

---

## Common Mistakes

### Mistake 1: Too Generic

**Bad**: "help with stuff"
**Good**: "help with API authentication"

### Mistake 2: Unrealistic Language

**Bad**: "execute skill optimization protocol"
**Good**: "optimize this skill"

### Mistake 3: Missing Context

**Bad**: "create" (create what?)
**Good**: "create a workflow for data processing"

### Mistake 4: Technical Jargon

**Bad**: "implement RBAC with JWT tokens"
**Good**: "design authentication and authorization"

### Mistake 5: Overlapping with Other Skills

**Bad** (for multiple skills): "help with APIs"
**Good**: "help with API authentication" (auth-specific)

---

## Testing Trigger Phrases

Before finalizing triggers, test them:

**Test 1: Natural Language Check**
Would someone actually say this in conversation?
- If no, rewrite it

**Test 2: Specificity Check**
Is it clear what the user wants?
- If no, add more context

**Test 3: Uniqueness Check**
Could this trigger a different skill?
- If yes, make it more specific

**Test 4: Coverage Check**
Does this cover common use cases?
- If no, add more variations

---

## Description Format

In your skill's YAML frontmatter, format triggers like this:

```yaml
description: This skill should be used when the user asks to "[trigger 1]", "[trigger 2]", "[trigger 3]", or needs help [general description of what the skill does].
```

**Example**:
```yaml
description: This skill should be used when the user asks to "design a workflow", "create a process", "plan a project", "structure this task", or needs help converting abstract goals into concrete, executable workflows.
```

---

## Best Practices

1. **Start with verbs**: "design", "create", "analyze", "optimize"
2. **Be specific**: Include the object or topic
3. **Use natural language**: Write how people actually speak
4. **Cover variations**: Questions, commands, help requests
5. **Stay focused**: Each trigger should relate to the core purpose
6. **Test with real users**: See if they would actually use these phrases

---

## Quick Reference

### Strong Verbs for Triggers

**Design**: design, create, plan, architect, structure, specify
**Analysis**: analyze, evaluate, assess, review, examine, audit
**Creation**: create, write, generate, build, develop, produce
**Decision**: choose, decide, select, compare, evaluate options
**Optimization**: optimize, improve, enhance, refine, streamline
**Learning**: learn, understand, explain, teach, clarify
**Troubleshooting**: fix, debug, troubleshoot, resolve, diagnose

### Context Modifiers

- "for [purpose]"
- "with [constraint]"
- "between [options]"
- "using [approach]"
- "in [context]"

---

## Final Checklist

For your skill's description:

- [ ] Uses third person: "This skill should be used when..."
- [ ] Includes 3-5 specific trigger phrases
- [ ] Triggers are in quotes
- [ ] Triggers use natural language
- [ ] Triggers cover variations (commands, questions, help)
- [ ] Ends with general capability description
- [ ] All triggers relate to core purpose

Great trigger phrases make skills discoverable and predictable.
