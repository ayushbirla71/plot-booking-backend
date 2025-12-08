const { Booking, Plot, Layout, User } = require('../models');

// Create a new booking (Admin marks a plot as booked)
const createBooking = async (req, res) => {
  try {
    const { plotId } = req.body;

    if (!plotId) {
      return res.status(400).json({
        success: false,
        message: 'plotId is required'
      });
    }

    // Check if plot exists and is available
    const plot = await Plot.findByPk(plotId);
    if (!plot) {
      return res.status(404).json({
        success: false,
        message: 'Plot not found'
      });
    }

    if (plot.status === 'booked') {
      return res.status(400).json({
        success: false,
        message: 'Plot is already booked'
      });
    }

    // Create booking
    const booking = await Booking.create({
      plotId,
      createdBy: req.user.id,
      status: 'confirmed'
    });

    // Update plot status to booked
    plot.status = 'booked';
    await plot.save();

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: booking
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating booking'
    });
  }
};

// Get all bookings
const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.findAll({
      include: [
        { 
          model: Plot, 
          as: 'plot',
          include: [{ model: Layout, as: 'layout', attributes: ['id', 'name'] }]
        },
        { model: User, as: 'admin', attributes: ['id', 'name', 'email'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: bookings
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching bookings'
    });
  }
};

// Get single booking
const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findByPk(id, {
      include: [
        { 
          model: Plot, 
          as: 'plot',
          include: [{ model: Layout, as: 'layout' }]
        },
        { model: User, as: 'admin', attributes: ['id', 'name', 'email'] }
      ]
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    res.json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching booking'
    });
  }
};

// Update booking
const updateBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const booking = await Booking.findByPk(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    await booking.update(updateData);

    res.json({
      success: true,
      message: 'Booking updated successfully',
      data: booking
    });
  } catch (error) {
    console.error('Update booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating booking'
    });
  }
};

// Cancel booking
const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findByPk(id, {
      include: [{ model: Plot, as: 'plot' }]
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Update booking status
    booking.status = 'cancelled';
    await booking.save();

    // Update plot status back to available
    if (booking.plot) {
      booking.plot.status = 'available';
      await booking.plot.save();
    }

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      data: booking
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error cancelling booking'
    });
  }
};

module.exports = {
  createBooking,
  getAllBookings,
  getBookingById,
  updateBooking,
  cancelBooking
};

