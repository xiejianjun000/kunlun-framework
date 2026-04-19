---
name: mece-principle
description: This skill should be used when the user asks to "use MECE", "apply MECE principle", "break down problems", "mutually exclusive collectively exhaustive", "McKinsey problem solving", "structure thinking", or needs to ensure comprehensive, non-overlapping analysis.
version: 1.0.0
author: OpenClaw Community
tags: [thinking, analysis, problem-solving, structure, consulting]
---

# MECE Principle

A problem-solving framework ensuring that categories are Mutually Exclusive and Collectively Exhaustive, eliminating overlap and omission in analysis and communication.

## Purpose

MECE (pronounced "me-see") is the foundation of structured problem-solving developed at McKinsey & Company. It ensures that when you break down a problem, the pieces:
- Don't overlap (Mutually Exclusive)
- Cover everything (Collectively Exhaustive)

This prevents double-counting, ensures completeness, and creates clarity in complex analysis.

## The Two Components

### Mutually Exclusive (ME)

Categories don't overlap—each item belongs to one and only one category.

**Examples:**
- Age groups: 0-18, 19-35, 36-50, 51+ (no overlap, clear boundaries)
- Customer types: New customers, Returning customers (distinct)
- Revenue sources: Product sales, Service revenue, Licensing fees (separate)

**Non-examples:**
- Age groups: Young, Middle-aged, Mature (overlapping and subjective)
- Customer types: Happy customers, Loyal customers (happy customers can be loyal)

### Collectively Exhaustive (CE)

Categories cover all possibilities—nothing is left out.

**Examples:**
- Profitability: Profit, Break-even, Loss (covers all outcomes)
- Product life cycle: Development, Growth, Maturity, Decline (all stages)
- Time: Past, Present, Future (all time periods)

**Non-examples:**
- Profitability: Profit, Loss (missing break-even)
- Product life cycle: Growth, Maturity (missing development and decline)

## Usage

### Problem Decomposition

```
Complex Problem
  ↓
MECE Breakdown
  ├─ Branch 1 (non-overlapping)
  ├─ Branch 2 (non-overlapping)
  ├─ Branch 3 (non-overlapping)
  └─ Branch 4 (non-overlapping)
    (all possibilities covered)
```

### Issue Trees

```
Question: How can we increase profits?
  └─ Increase Revenue
      ├─ Sell more units
      │   ├─ Acquire new customers
      │   └─ Increase purchase frequency
      └─ Increase price per unit
          ├─ Raise prices
          └─ Sell premium products
  └─ Reduce Costs
      ├─ Fixed costs
      │   ├─ Rent
      │   └─ Salaries
      └─ Variable costs
          ├─ Materials
          └─ Labor
```

**Check:**
- ME? Yes, branches don't overlap
- CE? Yes, covers all profit components

### Market Segmentation

```
Total Addressable Market (TAM)
  └─ By Geography
      ├─ North America
      ├─ Europe
      ├─ Asia Pacific
      └─ Rest of World
```

Or:

```
Total Addressable Market (TAM)
  └─ By Customer Type
      ├─ Enterprise
      ├─ Mid-market
      └─ Small business
```

**Check:**
- Each segmentation is ME (regions don't overlap, customer types are distinct)
- Each is CE (covers entire market)

### Communication Structure

```
Executive Summary
  ├─ Situation
  ├─ Complication
  ├─ Key Question
  └─ Answer
      ├─ Reason 1
      │   ├─ Supporting point 1.1
      │   └─ Supporting point 1.2
      ├─ Reason 2
      │   ├─ Supporting point 2.1
      │   └─ Supporting point 2.2
      └─ Reason 3
          ├─ Supporting point 3.1
          └─ Supporting point 3.2
```

## Instructions

### Creating MECE Frameworks

**Step 1: Start with the whole**
- Define what you're breaking down
- Set clear boundaries

**Step 2: Choose a splitting principle**
- 2x2 matrices
- Process steps
- Mathematical breakdowns
- Part-to-whole relationships

**Step 3: Generate categories**
- Brainstorm potential categories
- Apply the splitting principle consistently
- Ensure mutual exclusivity

**Step 4: Check for exhaustiveness**
- Have you covered everything?
- Are there missing categories?
- Does the whole equal the sum of parts?

**Step 5: Refine and test**
- Test each item: Does it fit only one category?
- Test the whole: Are there any gaps?
- Adjust boundaries as needed

### Common MECE Frameworks

**1. The 2x2 Matrix**
```
          High X
             │
    Q1       │    Q2
             │
─────────────┼─────────────
             │
    Q3       │    Q4
             │
          Low X
    Low Y        High Y
```

Always MECE and CE.

**2. The Process Flow**
```
Input → Process 1 → Process 2 → Output
```
Steps are sequential and cover the full process.

**3. Part-to-Whole**
```
Total = Part 1 + Part 2 + Part 3 + ... + Part n
```
Mathematical relationships are inherently MECE.

**4. Decision Tree**
```
Yes → Branch A
No  → Branch B
```
Binary splits are always MECE.

**5. Time-Based**
```
Past → Present → Future
```
Sequential time periods (if boundaries are clear).

### Common Splitting Principles

| Principle | Example | MECE Check |
|-----------|---------|------------|
| **Binary** | Internal vs. External | ✓ Inherently MECE |
| **Process** | Input → Process → Output | ✓ Sequential |
| **Mathematical** | Revenue = Price × Quantity | ✓ Definition |
| **Geography** | Continents, Countries | ✓ Physical boundaries |
| **Hierarchy** | Level 1, Level 2, Level 3 | ✓ Organizational |
| **Timeline** | Q1, Q2, Q3, Q4 | ✓ Calendar |

### Testing for MECE

**Mutually Exclusive Test:**
For each item, ask:
- Could this item belong to more than one category?
- Are there any gray areas?
- Are boundaries clear?

**Collectively Exhaustive Test:**
Ask:
- Are there any items that don't fit any category?
- Do the categories sum to the whole?
- Are there any missing dimensions?

## Common Challenges

### Challenge 1: Overlapping Categories

**Problem:** "We'll segment customers by age and income."

**Issue:** Age and income are correlated but distinct—a 30-year-old could be high or low income.

**Solution:** Choose one dimension or create proper subcategories:

```
By Age:
├─ 18-25
├─ 26-35
├─ 36-50
└─ 51+

By Income:
├─ <$30k
├─ $30k-$60k
├─ $60k-$100k
└─ $100k+
```

### Challenge 2: Missing Categories

**Problem:** "Sales channels: Online, Retail"

**Test:** Is that all sales? What about wholesale? What about direct sales to large accounts?

**Solution:**

```
Sales Channels:
├─ Direct to Consumer
│   ├─ Online
│   └─ Retail stores
└─ B2B
    ├─ Wholesale
    └─ Enterprise direct
```

### Challenge 3: Unclear Boundaries

**Problem:** "Product categories: Cheap, Affordable, Expensive"

**Issue:** What's the difference between "cheap" and "affordable"?

**Solution:** Use numerical ranges:

```
Price Points:
├─ Budget (<$50)
├─ Mid-range ($50-$200)
├─ Premium ($200-$500)
└─ Luxury (>$500)
```

### Challenge 4: Forgetting "Other" or "N/A"

**Problem:** Analysis frames assume every item must fit somewhere.

**Solution:** Include "Other" or "Not Applicable" categories to ensure CE.

```
Response Options:
├─ Yes
├─ No
└─ Not Applicable
```

## MECE in Communication

### Pyramid Principle

MECE structures support the Pyramid Principle:

```
                    Main Point
                   /    |    \
                  /     |     \
             Reason 1  Reason 2  Reason 3
               / \       / \       / \
              A   B     C   D     E   F
```

- Each branch is MECE
- Supporting points are MECE within their branch
- The whole is CE (all supporting the main point)

### Slide Structure

Each slide should present one level of a MECE breakdown:

**Slide 1: Overview**
```
Total Market = $100B
├─ Segment A: $40B (40%)
├─ Segment B: $35B (35%)
└─ Segment C: $25B (25%)
```

**Slide 2: Deep Dive on Segment A**
```
Segment A = $40B
├─ Sub-segment A1: $25B
├─ Sub-segment A2: $10B
└─ Sub-segment A3: $5B
```

## Tips for Success

- **Start simple** - 2x2 is often enough
- **Be rigorous** - Don't accept "good enough"
- **Draw it out** - Visuals reveal overlaps and gaps
- **Test with examples** - Run actual items through the framework
- **Iterate** - First attempt is rarely perfect
- **Choose your dimension wisely** - What's most relevant to the problem?
- **Beware of "and"** - If you're saying "A and B," you might have overlap

## Common Mistakes to Avoid

- Using subjective categories without clear boundaries
- Creating so many categories that MECE becomes meaningless
- Choosing splitting principles that don't match the problem
- Forgetting to test for exhaustiveness
- Overlapping categories (especially with subjective dimensions)
- Mixing splitting principles within one framework
- Creating categories that aren't actionable

## When to Use MECE

**Ideal for:**
- Complex problem decomposition
- Strategic analysis
- Market segmentation
- Root cause analysis
- Presentation structure
- Data categorization
- Process mapping

**Not ideal for:**
- Situations with inherent ambiguity
- Creative exploration (MECE can constrain)
- Simple problems (overkill)
- Situations where overlap is natural (ecosystems)

## Additional Resources

### Scripts
- **`scripts/mece-validator.py`** - Checks if categories are MECE
- **`scripts/mece-generator.py`** - Generates MECE frameworks from problems
- **`scripts/issue-tree-builder.py`** - Creates MECE issue trees

### References
- **`references/mckinsey-method.md`** - McKinsey problem-solving approach
- **`references/pyramid-principle.md`** - MECE in communication structures
- **`references/advanced-mece.md`** - Complex MECE applications

### Examples
- **`examples/issue-trees/`** - Various issue tree examples
- **`examples/market-segmentation.md`** - MECE segmentation examples
- **`examples/communication-structures.md`** - MECE in presentations

### Assets
- **`assets/templates/issue-tree.md`** - Issue tree template
- **`assets/worksheets/mece-practice.md`** - Practice exercises
- **`assets/checklists/mece-verification.md`** - MECE quality checklist
