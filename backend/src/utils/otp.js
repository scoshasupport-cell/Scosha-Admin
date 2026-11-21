const crypto = require('crypto');

function generateOtp(length = 6) {
  const max = 10 ** length;
  const num = crypto.randomInt(0, max);
  return String(num).padStart(length, '0');
}

module.exports = { generateOtp };
