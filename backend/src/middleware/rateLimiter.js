const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Max 20 attempts
  message: {
    success: false,
    message: 'Too many login attempts from this IP. Please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const lookupLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 120, // Max 120 lookups per 5 minutes
  message: {
    success: false,
    message: 'Too many search requests. Please wait a moment and try again.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const liveSearchLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 300, // Max 300 real-time queries per 5 minutes
  message: {
    success: false,
    message: 'Too many search requests. Please slow down and try again.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const registrationLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  message: {
    success: false,
    message: 'Too many registration requests. Please wait a few minutes before submitting again.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  loginLimiter,
  lookupLimiter,
  liveSearchLimiter,
  registrationLimiter
};

