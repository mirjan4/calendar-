const express = require('express');
const router = express.Router();
const registrationController = require('../controllers/registrationController');
const { authenticateToken } = require('../middleware/auth');
const { registrationLimiter } = require('../middleware/rateLimiter');

// Public registration submission (Inside Kerala or Outside Kerala)
router.post('/', registrationLimiter, registrationController.submitRegistration);

// Protected Admin registration management
router.get('/', authenticateToken, registrationController.getRegistrations);
router.get('/:id', authenticateToken, registrationController.getRegistrationById);
router.patch('/:id/status', authenticateToken, registrationController.updateRegistrationStatus);
router.patch('/:id/quota', authenticateToken, registrationController.updateCalendarQuota);
router.delete('/:id', authenticateToken, registrationController.deleteRegistration);

module.exports = router;
