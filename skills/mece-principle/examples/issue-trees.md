# MECE Issue Tree Examples

Issue trees (also called hypothesis trees) break down complex questions into MECE components that can be analyzed independently. Here are several examples.

## Example 1: Profit Increase Analysis

**Question**: How can we increase profits?

```
Profits = Revenue - Costs
    │
    ├─ Revenue
    │   ├─ Price per unit
    │   │   ├─ List price
    │   │   ├─ Discounts
    │   │   └─ Price segmentation
    │   │
    │   └─ Units sold
    │       ├─ New customers
    │       │   ├─ Market penetration
    │       │   └─ Market expansion
    │       │
    │       └─ Existing customers
    │           ├─ Purchase frequency
    │           ├─ Basket size
    │           └─ Retention rate
    │
    └─ Costs
        ├─ Fixed costs
        │   ├─ Rent
        │   ├─ Salaries
        │   ├─ Insurance
        │   └─ Depreciation
        │
        └─ Variable costs
            ├─ Cost of goods sold
            │   ├─ Materials
            │   ├─ Labor
            │   └─ Overhead
            │
            └─ Selling costs
                ├─ Commission
                ├─ Shipping
                └─ Transaction fees
```

**MECE Check**:
- Mutually Exclusive? ✓ (No overlap between revenue and cost categories)
- Collectively Exhaustive? ✓ (All profit components covered)

## Example 2: Customer Acquisition

**Question**: Why aren't we acquiring enough customers?

```
Customer Acquisition = Market Size × Conversion Rate
    │
    ├─ Market Size Issues
    │   ├─ Target market too small
    │   │   ├─ Geographic limitation
    │   │   └─ Segment definition too narrow
    │   │
    │   └─ Market penetration insufficient
    │       ├─ Awareness low
    │       └─ Reach limited
    │
    ├─ Conversion Rate Issues
    │   ├─ Marketing not effective
    │   │   ├─ Wrong message
    │   │   ├─ Wrong channel
    │   │   └─ Wrong timing
    │   │
    │   └─ Product not compelling
    │       ├─ Price too high
    │       ├─ Features insufficient
    │       └─ Value unclear
    │
    └─ Process Issues
        ├─ Funnel leaks
        │   ├─ Website abandonment
        │   ├─ Shopping cart abandonment
        │   └─ Sign-up friction
        │
        └─ Sales execution
            ├─ Response time slow
            ├─ Follow-up inadequate
            └─ Closing weak
```

**MECE Check**:
- Mutually Exclusive? ✓ (Market, conversion, and process are distinct)
- Collectively Exhaustive? ✓ (All acquisition components covered)

## Example 3: Employee Turnover

**Question**: Why is employee turnover high?

```
Employee Turnover = Voluntary + Involuntary
    │
    ├─ Voluntary Turnover
    │   ├─ Push Factors (Company Issues)
    │   │   ├─ Compensation
    │   │   │   ├─ Base salary below market
    │   │   │   ├─ Benefits inadequate
    │   │   │   └─ Bonus structure poor
    │   │   │
    │   │   ├─ Working Conditions
    │   │   │   ├─ Excessive workload
    │   │   │   ├─ Poor work-life balance
    │   │   │   └─ Toxic culture
    │   │   │
    │   │   └─ Career Development
    │   │       ├─ No growth opportunities
    │   │       ├─ Poor management
    │   │       └─ Lack of recognition
    │   │
    │   └─ Pull Factors (External Opportunities)
    │       ├─ Better offers
    │       ├─ Industry growth
    │       └─ Geographic relocation
    │
    └─ Involuntary Turnover
        ├─ Performance Issues
        │   ├─ Poor hiring
        │   ├─ Inadequate training
        │   └─ Unclear expectations
        │
        ├─ Structural Issues
        │   ├─ Restructuring
        │   ├─ Layoffs
        │   └─ Role elimination
        │
        └─ Misconduct
            ├─ Policy violations
            ├─ Behavioral issues
            └─ Legal problems
```

**MECE Check**:
- Mutually Exclusive? ✓ (Voluntary vs. involuntary; push vs. pull)
- Collectively Exhaustive? ✓ (All turnover reasons covered)

## Example 4: Product Launch Decision

**Question**: Should we launch this product?

```
Go/No-Go Decision
    │
    ├─ Market Factors
    │   ├─ Market Attractiveness
    │   │   ├─ Size sufficient?
    │   │   ├─ Growth rate adequate?
    │   │   └─ Profit potential real?
    │   │
    │   └─ Competitive Landscape
    │       ├─ Gap exists?
    │       ├─ Differentiation possible?
    │       └─ Defendable position?
    │
    ├─ Capability Factors
    │   ├─ Technical Feasibility
    │   │   ├─ Technology ready?
    │   │   ├─ Resources available?
    │   │   └─ Timeline realistic?
    │   │
    │   └─ Financial Viability
    │       ├─ ROI acceptable?
    │       ├─ Payback period reasonable?
    │       └─ Risk within tolerance?
    │
    └─ Strategic Fit
        ├─ Alignment with strategy
        │   ├─ Core competencies?
        │   ├─ Vision match?
        │   └─ Portfolio fit?
        │
        └─ Strategic Value
            ├─ Platform potential?
            ├─ Learning opportunity?
            └─ Market entry?
```

**MECE Check**:
- Mutually Exclusive? ✓ (Market, capability, and strategy are distinct)
- Collectively Exhaustive? ✓ (All decision factors covered)

## Example 5: System Performance Issues

**Question**: Why is the system slow?

```
System Performance = Frontend + Backend + Network
    │
    ├─ Frontend Issues
    │   ├─ Rendering
    │   │   ├─ Large DOM size
    │   │   ├─ Inefficient re-renders
    │   │   └─ Unoptimized images
    │   │
    │   ├─ JavaScript
    │   │   ├─ Large bundle size
    │   │   ├─ Synchronous operations
    │   │   └─ Memory leaks
    │   │
    │   └─ CSS
    │       ├─ Expensive selectors
    │       ├─ Layout thrashing
    │       └─ Paint/repaint issues
    │
    ├─ Backend Issues
    │   ├─ Database
    │   │   ├─ Missing indexes
    │   │   ├─ N+1 queries
    │   │   ├─ No caching
    │   │   └─ Large result sets
    │   │
    │   ├─ Application Logic
    │   │   ├─ Inefficient algorithms
    │   │   ├─ Synchronous operations
    │   │   └─ Poor error handling
    │   │
    │   └─ Infrastructure
    │       ├─ Insufficient resources
    │       ├─ Poor configuration
    │       └─ Bottlenecks
    │
    └─ Network Issues
        ├─ Bandwidth
        │   ├─ Limited capacity
        │   ├─ Large payloads
        │   └─ No compression
        │
        ├─ Latency
        │   ├─ Distance to servers
        │   ├─ Too many requests
        │   └─ No CDN
        │
        └─ Reliability
            ├─ Packet loss
            ├─ Connection issues
            └─ DNS problems
```

**MECE Check**:
- Mutually Exclusive? ✓ (Frontend, backend, and network are distinct)
- Collectively Exhaustive? ✓ (All performance components covered)

## Creating Your Own Issue Trees

### Steps:

1. **Start with the question** - What are you trying to answer?

2. **Break into 2-4 major branches** - What are the major components?

3. **For each branch, break down further** - What are the sub-components?

4. **Check for MECE**:
   - Mutually Exclusive: Does any item belong in more than one branch?
   - Collectively Exhaustive: Are there any items that don't fit anywhere?

5. **Refine and iterate** - Adjust until MECE is achieved

### Tips:

- **2x2 matrices** are always MECE - use them when possible
- **Mathematical relationships** are inherently MECE (e.g., Profit = Revenue - Cost)
- **Process flows** are MECE if sequential and complete
- **Keep going** until you reach actionable items
- **Test with examples** - Run actual items through the tree

Issue trees provide a structured way to break down complex problems into manageable, MECE components that can be analyzed systematically.
