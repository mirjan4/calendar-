const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');
const { authenticateToken } = require('../middleware/auth');
const { uploadImport } = require('../middleware/upload');

// Public hierarchical lookup
router.get('/districts', locationController.getDistricts);
router.get('/zones', locationController.getZones);
router.get('/circles', locationController.getCircles);
router.get('/units', locationController.getUnits);
router.get('/units/available', locationController.getAvailableUnits);

// Protected Admin Location Management
// Districts
router.get('/admin/districts', authenticateToken, locationController.getAllDistrictsAdmin);
router.post('/admin/districts', authenticateToken, locationController.createDistrict);
router.put('/admin/districts/:id', authenticateToken, locationController.updateDistrict);
router.delete('/admin/districts/:id', authenticateToken, locationController.deleteDistrict);

// Zones
router.get('/admin/zones', authenticateToken, locationController.getAllZonesAdmin);
router.post('/admin/zones', authenticateToken, locationController.createZone);
router.put('/admin/zones/:id', authenticateToken, locationController.updateZone);
router.delete('/admin/zones/:id', authenticateToken, locationController.deleteZone);

// Circles
router.get('/admin/circles', authenticateToken, locationController.getAllCirclesAdmin);
router.post('/admin/circles', authenticateToken, locationController.createCircle);
router.put('/admin/circles/:id', authenticateToken, locationController.updateCircle);
router.delete('/admin/circles/:id', authenticateToken, locationController.deleteCircle);

// Units
router.get('/admin/units', authenticateToken, locationController.getAllUnitsAdmin);
router.post('/admin/units', authenticateToken, locationController.createUnit);
router.put('/admin/units/:id', authenticateToken, locationController.updateUnit);
router.delete('/admin/units/:id', authenticateToken, locationController.deleteUnit);


// Combined Place Management (Districts -> Zones -> Circles -> Units + Assigned Student)
router.get('/admin/places', authenticateToken, locationController.getCombinedPlacesAdmin);
router.post('/admin/places/import', authenticateToken, uploadImport.single('file'), locationController.importPlaces);

module.exports = router;
