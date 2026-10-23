const { randomInt } = require('crypto');

// Keep credentials as strings throughout email delivery and activation.
function generateTemporaryPassword() {
  return String(randomInt(1000000000, 10000000000));
}

module.exports = { generateTemporaryPassword };
