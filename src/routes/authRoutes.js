const express = require('express');
const router = express.Router();
const { login, createAdmin, getProfile } = require('../controllers/authController');
const { authenticate, isAdmin } = require('../middleware/auth');

// Public routes
router.post('/login', login);

// Create first admin (should be protected or removed in production)
router.post('/create-admin', createAdmin);

// Protected routes
router.get('/profile', authenticate, getProfile);

module.exports = router;

