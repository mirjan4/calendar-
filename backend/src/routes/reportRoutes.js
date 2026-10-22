const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateToken } = require('../middleware/auth');

router.get('/:type', authenticateToken, reportController.getReport);

module.exports = router;
