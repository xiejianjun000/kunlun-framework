/**
 * 多租户管理模块 Jest 配置
 * Multi-Tenant Module Jest Configuration
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }],
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: [
    'src/core/multi-tenant/**/*.ts',
    '!src/**/*.d.ts',
  ],
  coverageDirectory: 'coverage/multi-tenant',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
};
