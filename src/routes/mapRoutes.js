const express = require('express');
const router = express.Router();
const { 
  generateSVGMap, 
  generateHTMLMap, 
  getMapData 
} = require('../controllers/mapController');

// All map routes are public - no auth required

// Get complete SVG map (embed directly)
// Usage: <img src="/api/map/:layoutId/svg" /> or <object data="/api/map/:layoutId/svg" />
router.get('/:id/svg', generateSVGMap);

// Get complete HTML page with interactive map (embed in iframe)
// Usage: <iframe src="/api/map/:layoutId/html"></iframe>
router.get('/:id/html', generateHTMLMap);

// Get map data as JSON (for custom rendering)
router.get('/:id/data', getMapData);

module.exports = router;

