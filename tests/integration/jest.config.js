/**
 * Jest Integration Tests Configuration
 * 集成测试Jest配置
 */

module.exports = {
  ...require('../../jest.config.js'),
  testMatch: ['**/tests/integration/**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  displayName: {
    name: 'Integration Tests',
    color: '#2563EB',
  },
  // 集成测试超时时间更长
  testTimeout: 30000,
  // 集成测试需要更详细的输出
  verbose: true,
  // 集成测试并行度降低
  maxWorkers: 2,
  globals: {
    'ts-jest': {
      tsconfig: {
        esModuleInterop: true,
        module: 'commonjs',
        target: 'ES2022',
        strict: true,
        skipLibCheck: true,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        types: ['jest', 'node'],
      },
    },
  },
};
