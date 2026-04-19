# Skill Design Principles

Core principles for designing effective, useful, and maintainable OpenClaw skills.

## Principle 1: Single Responsibility

**Each skill should do one thing well.**

A skill should have a clear, focused purpose. When a skill tries to do too much, it becomes confusing and less effective.

**Good**: A skill focused on "API authentication design"
**Bad**: A skill that handles "API design, testing, documentation, and deployment"

**How to apply**:
- Define the skill's core purpose in one sentence
- If you need "and" in the purpose, consider splitting
- Remove anything outside the core purpose

---

## Principle 2: Trigger Clarity

**Skills should activate in predictable, understandable ways.**

Users should know when a skill will be invoked. Triggers should be specific phrases that users naturally say.

**Good trigger**: "When the user asks to 'design an API', 'create endpoints', 'define API contract'"
**Bad trigger**: "When the user needs help with APIs"

**How to apply**:
- Include 3-5 specific trigger phrases
- Use exact language users would say
- Cover both question and command formats
- Test: Would a user actually say this?

---

## Principle 3: Progressive Disclosure

**Reveal information at the right depth at the right time.**

Not all information is equally important. Structure content so users get what they need first, with details available on demand.

**Levels**:
1. **Metadata** (always loaded): Name + description (~100 words)
2. **Core Content** (when triggered): Main SKILL.md body (<5000 words)
3. **Supporting Resources** (as needed): References, examples, scripts

**How to apply**:
- Keep SKILL.md focused on essentials
- Move detailed explanations to references/
- Put comprehensive examples in examples/
- Use assets/ for templates and tools

---

## Principle 4: Action-Oriented Output

**Skills should produce actionable outputs, not just explanations.**

Users interact with skills to get things done. Outputs should be concrete, specific, and immediately useful.

**Good output**: "Create a file at `/config/api.yaml` with these settings..."
**Bad output**: "You should probably configure the API somehow"

**How to apply**:
- Be specific about what to do
- Provide concrete steps
- Include examples and templates
- Make outputs copy-pasteable when possible

---

## Principle 5: Error Resilience

**Skills should handle edge cases and errors gracefully.**

Things will go wrong. Good skills anticipate problems and provide helpful guidance.

**How to apply**:
- Define what happens when inputs are invalid
- Provide troubleshooting guidance
- Include common error messages and solutions
- Suggest fallback approaches

---

## Principle 6: Composability

**Skills should work well with other skills.**

Skills are part of an ecosystem. Design for integration and coordination with other capabilities.

**How to apply**:
- Define clear input/output contracts
- Document handoff points
- Avoid overlap with other skills
- Design for sequential or parallel use

---

## Principle 7: Maintainability

**Skills should be easy to understand, modify, and extend.**

Skills evolve over time. Design for future maintainers (including yourself).

**How to apply**:
- Use clear, consistent naming
- Document design decisions
- Structure content logically
- Separate concerns (SKILL.md vs references vs examples)

---

## Principle 8: Context Awareness

**Skills should adapt to the user's context and expertise.**

Different users have different needs. Skills should be flexible enough to accommodate various scenarios.

**How to apply**:
- Offer multiple approaches (quick vs. thorough)
- Provide beginner and advanced paths
- Ask clarifying questions when needed
- Adapt output depth based on user expertise

---

## Principle 9: Version Management

**Skills should evolve in a controlled, backward-compatible way.**

Users depend on skills. Changes shouldn't break existing workflows.

**How to apply**:
- Use semantic versioning (MAJOR.MINOR.PATCH)
- Document breaking changes
- Maintain backward compatibility when possible
- Provide migration guides for major changes

---

## Principle 10: Documentation Quality

**Skills should be their own best documentation.**

The SKILL.md and supporting files should be comprehensive enough that users understand how to use the skill without external help.

**How to apply**:
- Write clear, concise descriptions
- Include concrete examples
- Explain the "why" not just the "what"
- Keep documentation in sync with functionality

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: The "Kitchen Sink" Skill

Trying to do everything. Results in confusion and poor execution.

**Solution**: Split into focused, single-purpose skills

### Anti-Pattern 2: The "Mystery" Skill

Vague description and triggers. Users don't know when it activates.

**Solution**: Be explicit about purpose and triggers

### Anti-Pattern 3: The "Monolith" Skill

Everything in SKILL.md with no supporting resources. Hard to navigate and maintain.

**Solution**: Use references/, examples/, assets/ for detailed content

### Anti-Pattern 4: The "I" Skill

First-person descriptions ("I help you..."). Breaks the third-person convention.

**Solution**: Use third-person ("This skill should be used when...")

### Anti-Pattern 5: The "One-Off" Skill

Designed for a single specific task without broader applicability.

**Solution**: Extract generalizable patterns and make it reusable

---

## Design Checklist

Use this checklist when designing new skills:

**Purpose**:
- [ ] Clear, focused purpose
- [ ] Single responsibility
- [ ] Distinct from other skills

**Triggers**:
- [ ] Specific trigger phrases (3-5)
- [ ] Natural language patterns
- [ ] Covers common use cases

**Content**:
- [ ] Substantial SKILL.md (1000+ words)
- [ ] Clear framework/methodology
- [ ] Actionable instructions
- [ ] Concrete examples

**Structure**:
- [ ] Valid YAML frontmatter
- [ ] Logical organization
- [ ] Consistent formatting
- [ ] Progressive disclosure

**Resources**:
- [ ] Supporting references
- [ ] Working examples
- [ ] Useful assets/templates
- [ ] Functional scripts (if applicable)

**Integration**:
- [ ] Works with other skills
- [ ] Clear input/output contracts
- [ ] Defined handoff points
- [ ] Error handling

---

## Example: Good vs. Bad Design

### Bad Design

```yaml
---
name: helper
description: I help with technical stuff
version: 1.0.0
---
```

**Problems**:
- Generic name
- First-person description
- No trigger phrases
- Unclear purpose

### Good Design

```yaml
---
name: api-authentication-designer
description: This skill should be used when the user asks to "design API authentication", "choose an auth strategy", "implement OAuth", "secure API endpoints", or needs help designing, implementing, or improving API authentication and authorization systems.
version: 1.0.0
author: OpenClaw Community
tags: [api, authentication, security, authorization]
---
```

**Strengths**:
- Specific, descriptive name
- Third-person description
- Multiple trigger phrases
- Clear purpose
- Author and tags for discovery

---

## Key Takeaways

1. **Focus**: Do one thing well
2. **Clarity**: Be explicit about purpose and triggers
3. **Structure**: Use progressive disclosure
4. **Action**: Produce actionable outputs
5. **Quality**: Make it maintainable and composable

Great skills are focused, clear, actionable, and work well with others.
