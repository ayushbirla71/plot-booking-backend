const express = require('express');
const router = express.Router();
const { 
  createBooking, 
  getAllBookings, 
  getBookingById, 
  updateBooking,
  cancelBooking
} = require('../controllers/bookingController');
const { authenticate, isAdmin } = require('../middleware/auth');

// All booking routes require admin authentication
router.use(authenticate, isAdmin);

router.post('/', createBooking);
router.get('/', getAllBookings);
router.get('/:id', getBookingById);
router.put('/:id', updateBooking);
router.patch('/:id/cancel', cancelBooking);

module.exports = router;

