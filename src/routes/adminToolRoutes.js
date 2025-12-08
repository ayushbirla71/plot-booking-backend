const express = require('express');
const router = express.Router();
const { getPlotDrawingTool } = require('../controllers/adminToolController');

// Admin plot drawing tool - visual editor
router.get('/draw-plots/:id', getPlotDrawingTool);

module.exports = router;

