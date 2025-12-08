const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const layoutRoutes = require('./layoutRoutes');
const plotRoutes = require('./plotRoutes');
const bookingRoutes = require('./bookingRoutes');
const mapRoutes = require('./mapRoutes');
const adminToolRoutes = require('./adminToolRoutes');

router.use('/auth', authRoutes);
router.use('/layouts', layoutRoutes);
router.use('/plots', plotRoutes);
router.use('/bookings', bookingRoutes);
router.use('/map', mapRoutes);
router.use('/admin', adminToolRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;

