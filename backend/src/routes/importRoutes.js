const express = require('express');
const router = express.Router();
const importController = require('../controllers/importController');
const { authenticateToken } = require('../middleware/auth');
const { uploadImport } = require('../middleware/upload');

// Admin Excel and CSV student import
router.post('/preview', authenticateToken, uploadImport.single('file'), importController.previewImport);
router.post('/confirm', authenticateToken, importController.confirmImport);
router.get('/history', authenticateToken, importController.getImportHistory);
router.get('/:id/errors', authenticateToken, importController.downloadRejectedRows);

module.exports = router;
