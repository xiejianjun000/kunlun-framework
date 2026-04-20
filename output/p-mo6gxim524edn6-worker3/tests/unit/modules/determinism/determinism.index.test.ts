import * as determinism from '../../../../src/modules/determinism';

describe('Determinism Module Index', () => {
  it('should export all classes', () => {
    expect(determinism.WFGYVerifier).toBeDefined();
    expect(determinism.SelfConsistencyChecker).toBeDefined();
    expect(determinism.SourceTracer).toBeDefined();
    expect(determinism.HallucinationDetector).toBeDefined();
  });

  it('should export all type definitions via export *', () => {
    // Type exports exist at compile time, this check verifies the export list is complete
    const exports = Object.keys(determinism);
    expect(exports).toContain('WFGYVerifier');
    expect(exports).toContain('SelfConsistencyChecker');
    expect(exports).toContain('SourceTracer');
    expect(exports).toContain('HallucinationDetector');
  });
});
