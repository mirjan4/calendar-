const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimiter');

router.post('/login', loginLimiter, authController.login);
router.post('/reset-password', loginLimiter, authController.resetPassword);
router.get('/profile', authenticateToken, authController.getProfile);
router.put('/profile', authenticateToken, authController.updateProfile);
router.post('/logout', authenticateToken, authController.logout);

module.exports = router;
