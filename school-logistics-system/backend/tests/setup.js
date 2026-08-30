const mongoose = require("mongoose");

// Use test database
process.env.MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/slsrms_test";

// Suppress console logs during tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  // Keep error for debugging
  error: console.error,
};

// Close DB after the suite completes.
afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});

// NOTE: End-to-end workflow tests intentionally keep state across steps.
// Do not delete collections before each test here because that breaks
// the complete request lifecycle under test.

