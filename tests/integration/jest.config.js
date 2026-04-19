const baseConfig = require('../../package.json').jest;

module.exports = {
  ...baseConfig,
  testMatch: [
    '**/tests/integration/**/*.test.ts'
  ],
  testTimeout: 30000,
  verbose: true,
};
