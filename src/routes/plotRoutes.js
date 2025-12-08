const express = require('express');
const router = express.Router();
const { 
  createPlot, 
  createBatchPlots,
  getPlotById, 
  updatePlot, 
  updatePlotStatus,
  deletePlot,
  searchPlots
} = require('../controllers/plotController');
const { authenticate, isAdmin } = require('../middleware/auth');

// Public routes - anyone can view plots
router.get('/search', searchPlots);
router.get('/:id', getPlotById);

// Admin routes - require authentication
router.post('/', authenticate, isAdmin, createPlot);
router.post('/batch', authenticate, isAdmin, createBatchPlots);
router.put('/:id', authenticate, isAdmin, updatePlot);
router.patch('/:id/status', authenticate, isAdmin, updatePlotStatus);
router.delete('/:id', authenticate, isAdmin, deletePlot);

module.exports = router;

