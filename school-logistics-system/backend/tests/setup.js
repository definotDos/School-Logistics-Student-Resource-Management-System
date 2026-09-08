const mongoose = require("mongoose");

// Database suites require an explicitly configured disposable database.
if (process.env.MONGODB_URI && !new URL(process.env.MONGODB_URI).pathname.endsWith("_test")) {
  throw new Error("Integration tests require a disposable database ending in _test.");
}

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

