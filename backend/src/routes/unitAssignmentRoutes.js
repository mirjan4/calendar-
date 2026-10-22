const express = require('express');
const router = express.Router();
const unitAssignmentController = require('../controllers/unitAssignmentController');
const { authenticateToken } = require('../middleware/auth');

// Protected Admin unit assignment management
router.get('/', authenticateToken, unitAssignmentController.getUnitAssignments);
router.get('/:id', authenticateToken, unitAssignmentController.getUnitAssignmentById);
router.post('/:id/release', authenticateToken, unitAssignmentController.releaseUnitAssignment);

module.exports = router;
