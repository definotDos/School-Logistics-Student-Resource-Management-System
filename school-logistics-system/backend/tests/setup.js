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

// Clean up after all tests
afterAll(async () => {
  await mongoose.connection.close();
});

// Clean up collections before each test
beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});
