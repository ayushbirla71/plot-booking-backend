const express = require('express');
const router = express.Router();
const { 
  createLayout, 
  getAllLayouts, 
  getLayoutById, 
  updateLayout, 
  deleteLayout 
} = require('../controllers/layoutController');
const { authenticate, isAdmin } = require('../middleware/auth');
const upload = require('../config/multer');

// Public routes - anyone can view layouts
router.get('/', getAllLayouts);
router.get('/:id', getLayoutById);

// Admin routes - require authentication
router.post('/', authenticate, isAdmin, upload.single('image'), createLayout);
router.put('/:id', authenticate, isAdmin, upload.single('image'), updateLayout);
router.delete('/:id', authenticate, isAdmin, deleteLayout);

module.exports = router;

