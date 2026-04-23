const baseConfig = require('../../package.json').jest;

module.exports = {
  ...baseConfig,
  roots: ['<rootDir>'],
  testMatch: [
    '**/*.test.ts'
  ],
  testTimeout: 30000,
  verbose: true,
};
