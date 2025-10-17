// jest.setup.js - Load test environment variables
require('dotenv').config({ path: '.env.test' });

// Set any global test configurations
global.testTimeout = 10000;

// Mock console.error to reduce noise in tests
global.console.error = jest.fn();

// Set test environment
process.env.NODE_ENV = 'test';