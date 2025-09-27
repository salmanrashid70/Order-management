module.exports = {
  // Specify test environment
  testEnvironment: 'node',

  // Test setup file
  setupFilesAfterEnv: ['<rootDir>/tests/setup/test.setup.ts'],

  // Test file patterns
  testMatch: [
    '<rootDir>/tests/unit/**/*.test.ts',
    '<rootDir>/tests/integration/**/*.test.ts',
    '<rootDir>/tests/e2e/**/*.test.ts'
  ],

  // TypeScript transform
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/types/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Module resolution
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },

  // Test timeout
  testTimeout: 10000,

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,
  
  // Reporter configuration
  reporters: ['default', 'jest-junit'],

  // Custom environment variables for tests
  testEnvironmentOptions: {
    NODE_ENV: 'test'
  }
}