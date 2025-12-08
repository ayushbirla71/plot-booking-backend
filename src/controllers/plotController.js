const { Plot, Layout, Booking } = require('../models');

// Create a new plot on a layout (Admin draws on image)
const createPlot = async (req, res) => {
  try {
    const { layoutId, plotNumber, x, y, width, height, polygonCoordinates, 
            price, size, facing, description, status } = req.body;

    if (!layoutId || !plotNumber || x === undefined || y === undefined || 
        width === undefined || height === undefined) {
      return res.status(400).json({
        success: false,
        message: 'layoutId, plotNumber, x, y, width, and height are required'
      });
    }

    // Check if layout exists
    const layout = await Layout.findByPk(layoutId);
    if (!layout) {
      return res.status(404).json({
        success: false,
        message: 'Layout not found'
      });
    }

    // Check for duplicate plot number in same layout
    const existingPlot = await Plot.findOne({ 
      where: { layoutId, plotNumber } 
    });
    if (existingPlot) {
      return res.status(400).json({
        success: false,
        message: 'Plot number already exists in this layout'
      });
    }

    const plot = await Plot.create({
      layoutId,
      plotNumber,
      x,
      y,
      width,
      height,
      polygonCoordinates,
      price,
      size,
      facing,
      description,
      status: status || 'available'
    });

    res.status(201).json({
      success: true,
      message: 'Plot created successfully',
      data: plot
    });
  } catch (error) {
    console.error('Create plot error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating plot'
    });
  }
};

// Create multiple plots at once (batch)
const createBatchPlots = async (req, res) => {
  try {
    const { layoutId, plots } = req.body;

    if (!layoutId || !plots || !Array.isArray(plots) || plots.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'layoutId and plots array are required'
      });
    }

    const layout = await Layout.findByPk(layoutId);
    if (!layout) {
      return res.status(404).json({
        success: false,
        message: 'Layout not found'
      });
    }

    const plotsToCreate = plots.map(plot => ({
      ...plot,
      layoutId,
      status: plot.status || 'available'
    }));

    const createdPlots = await Plot.bulkCreate(plotsToCreate);

    res.status(201).json({
      success: true,
      message: `${createdPlots.length} plots created successfully`,
      data: createdPlots
    });
  } catch (error) {
    console.error('Batch create plots error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating plots'
    });
  }
};

// Get single plot with booking details
const getPlotById = async (req, res) => {
  try {
    const { id } = req.params;

    const plot = await Plot.findByPk(id, {
      include: [
        { model: Layout, as: 'layout' },
        { model: Booking, as: 'bookings', order: [['createdAt', 'DESC']] }
      ]
    });

    if (!plot) {
      return res.status(404).json({
        success: false,
        message: 'Plot not found'
      });
    }

    res.json({
      success: true,
      data: plot
    });
  } catch (error) {
    console.error('Get plot error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching plot'
    });
  }
};

// Update plot details and coordinates
const updatePlot = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const plot = await Plot.findByPk(id);
    if (!plot) {
      return res.status(404).json({
        success: false,
        message: 'Plot not found'
      });
    }

    await plot.update(updateData);

    res.json({
      success: true,
      message: 'Plot updated successfully',
      data: plot
    });
  } catch (error) {
    console.error('Update plot error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating plot'
    });
  }
};

// Update plot status (book, hold, available)
const updatePlotStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['available', 'booked', 'hold'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be: available, booked, or hold'
      });
    }

    const plot = await Plot.findByPk(id);
    if (!plot) {
      return res.status(404).json({
        success: false,
        message: 'Plot not found'
      });
    }

    plot.status = status;
    await plot.save();

    res.json({
      success: true,
      message: `Plot status updated to ${status}`,
      data: plot
    });
  } catch (error) {
    console.error('Update plot status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating plot status'
    });
  }
};

// Delete plot
const deletePlot = async (req, res) => {
  try {
    const { id } = req.params;

    const plot = await Plot.findByPk(id);
    if (!plot) {
      return res.status(404).json({
        success: false,
        message: 'Plot not found'
      });
    }

    await plot.destroy();

    res.json({
      success: true,
      message: 'Plot deleted successfully'
    });
  } catch (error) {
    console.error('Delete plot error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting plot'
    });
  }
};

// Search plots by number
const searchPlots = async (req, res) => {
  try {
    const { layoutId, query } = req.query;
    const { Op } = require('sequelize');

    const whereClause = {};
    if (layoutId) whereClause.layoutId = layoutId;
    if (query) {
      whereClause.plotNumber = { [Op.iLike]: `%${query}%` };
    }

    const plots = await Plot.findAll({
      where: whereClause,
      include: [{ model: Layout, as: 'layout', attributes: ['id', 'name'] }],
      order: [['plotNumber', 'ASC']]
    });

    res.json({
      success: true,
      data: plots
    });
  } catch (error) {
    console.error('Search plots error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error searching plots'
    });
  }
};

module.exports = {
  createPlot,
  createBatchPlots,
  getPlotById,
  updatePlot,
  updatePlotStatus,
  deletePlot,
  searchPlots
};

