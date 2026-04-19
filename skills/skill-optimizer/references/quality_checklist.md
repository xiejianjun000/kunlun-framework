# Skill Quality Checklist

Complete checklist for evaluating skill quality and completeness.

## Frontmatter (YAML)

### Required Fields
- [ ] **name**: lowercase-with-hyphens
- [ ] **description**: Clear, specific description
- [ ] **version**: Semantic version (e.g., 1.0.0)

### Optional but Recommended
- [ ] **author**: Author name or handle
- [ ] **tags**: Relevant discovery tags
- [ ] **gated**: Whether installation required (default: false)

### Description Quality
- [ ] Uses third person ("This skill should be used when...")
- [ ] Includes specific trigger phrases
- [ ] Describes what the skill does
- [ ] Mentions key capabilities
- [ ] 50+ characters long

## Body Content

### Required Sections
- [ ] **Title/Header**: Clear skill name
- [ ] **Brief Description**: 2-3 sentence overview
- [ ] **Purpose**: Why this skill exists
- [ ] **Usage**: How to use the skill

### Recommended Sections
- [ ] **Core Framework**: Methodology or approach
- [ ] **Instructions**: Step-by-step guidance
- [ ] **Key Principles**: Guiding principles
- [ ] **Output Format**: Expected output structure
- [ ] **Additional Resources**: References to supporting files

### Content Quality
- [ ] 1000+ words total
- [ ] Clear headings and structure
- [ ] Concrete examples
- [ ] Actionable instructions
- [ ] No placeholder content

## Triggers

### Trigger Phrases
- [ ] Specific phrases users would say
- [ ] Multiple variations covered
- [ ] Natural language patterns
- [ ] Question formats included
- [ ] Command formats included

### Trigger Scenarios
- [ ] Direct requests covered
- [ ] Implicit needs covered
- [ ] Edge cases considered

## Supporting Files

### Scripts (Optional)
- [ ] Executable permissions set
- [ ] Clear usage instructions
- [ ] Error handling
- [ ] Documentation in comments

### References (Optional)
- [ ] Detailed documentation
- [ ] Framework explanations
- [ ] Methodology guides
- [ ] External resources cited

### Examples (Optional)
- [ ] Real usage scenarios
- [ ] Input/output examples
- [ ] Complete demonstrations
- [ ] Edge cases covered

### Assets (Optional)
- [ ] Templates provided
- [ ] Checklists included
- [ ] Worksheets available
- [ ] Clear formatting

## Integration

### Compatibility
- [ ] Works with other skills
- [ ] Clear handoff points
- [ ] No conflicts with existing skills
- [ ] Complementary to skill ecosystem

### Usability
- [ ] Clear when to use
- [ ] Easy to invoke
- [ ] Predictable behavior
- [ ] Helpful error messages

## Quality Metrics

### Score Calculation
- **Positioning**: /25
- **Content**: /25
- **Triggers**: /20
- **Structure**: /15
- **Value**: /15

**Total**: /100

### Quality Levels
- **90-100**: Excellent - production ready
- **75-89**: Good - minor improvements needed
- **60-74**: Fair - needs work
- **Below 60**: Poor - significant revision needed

## Common Issues to Avoid

### Description Problems
- First-person ("I help you...")
- Too vague ("helps with tasks")
- Missing trigger phrases
- Too brief

### Content Problems
- Too short (<500 words)
- All in one file (no references)
- Placeholder text
- Missing examples

### Structural Problems
- Invalid YAML
- Missing required fields
- Poor organization
- Inconsistent formatting

### Trigger Problems
- No specific phrases
- Unrealistic phrases
- Missing common use cases
- Too narrow or broad

## Improvement Checklist

### High Priority (Must Fix)
- [ ] Fix invalid YAML
- [ ] Add missing required fields
- [ ] Improve description to third-person with triggers
- [ ] Add body content if too short

### Medium Priority (Should Fix)
- [ ] Add examples
- [ ] Improve instructions clarity
- [ ] Add reference documentation
- [ ] Expand trigger coverage

### Low Priority (Nice to Have)
- [ ] Add scripts/tools
- [ ] Create templates
- [ ] Add more examples
- [ ] Enhance documentation
