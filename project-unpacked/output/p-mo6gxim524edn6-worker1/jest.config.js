module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: [
    '/root/.openclaw/.arkclaw-team/projects/p-mo6gxim524edn6/output/p-mo6gxim524edn6-worker1/tests',
    '/root/.openclaw/.arkclaw-team/projects/p-mo6gxim524edn6/output/p-mo6gxim524edn6-worker3/src'
  ],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/*.(test|spec).+(ts|tsx|js)'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  collectCoverage: true,
  collectCoverageFrom: [
    'output/p-mo6gxim524edn6-worker3/src/**/*.+(ts|tsx|js)',
    '!output/p-mo6gxim524edn6-worker3/src/**/*.d.ts'
  ],
  coverageDirectory: 'output/p-mo6gxim524edn6-worker1/coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80
    },
    'output/p-mo6gxim524edn6-worker3/src/adapters/llm/**/*.ts': {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80
    }
  },
  testTimeout: 10000
};
