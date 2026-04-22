module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  collectCoverageFrom: ['src/**/*.ts'],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  // 全局超时配置 - 性能测试需要更长时间
  testTimeout: 300000, // 5 分钟
  // 避免并行运行性能测试，防止资源竞争
  maxWorkers: process.env.CI ? 2 : '50%',
  // 更清晰的测试输出
  verbose: true,
  // 测试路径忽略模式
  testPathIgnorePatterns: ['/node_modules/'],
  // 转换设置
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json'
    }]
  }
};
