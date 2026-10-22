const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { authenticateToken } = require('../middleware/auth');
const { lookupLimiter, liveSearchLimiter } = require('../middleware/rateLimiter');

// Public search endpoints
router.get('/lookup', lookupLimiter, studentController.lookupStudent);
router.get('/live-search', liveSearchLimiter, studentController.liveSearchStudents);

// Protected Admin endpoints
router.get('/', authenticateToken, studentController.getStudents);
router.get('/:id', authenticateToken, studentController.getStudentById);
router.post('/', authenticateToken, studentController.createStudent);
router.put('/:id', authenticateToken, studentController.updateStudent);
router.patch('/:id/status', authenticateToken, studentController.toggleStudentStatus);
router.delete('/:id', authenticateToken, studentController.deleteStudent);

module.exports = router;
