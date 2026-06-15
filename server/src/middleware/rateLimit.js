const rateLimit = require('express-rate-limit');

const customHandler = (req, res) => {
  return res.status(429).json({
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests, please try again later.'
    }
  });
};

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  handler: customHandler,
  standardHeaders: true,
  legacyHeaders: false
});

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60,
  handler: customHandler,
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  handler: customHandler,
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  apiLimiter,
  writeLimiter,
  authLimiter
};
