const { Layout, Plot } = require('../models');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Helper function to get SVG dimensions
const getSvgDimensions = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');

  // Try to get width/height attributes
  const widthMatch = content.match(/width=["']([0-9.]+)(px)?["']/i);
  const heightMatch = content.match(/height=["']([0-9.]+)(px)?["']/i);

  if (widthMatch && heightMatch) {
    return {
      width: Math.round(parseFloat(widthMatch[1])),
      height: Math.round(parseFloat(heightMatch[1]))
    };
  }

  // Try viewBox
  const viewBoxMatch = content.match(/viewBox=["']([0-9.\s]+)["']/i);
  if (viewBoxMatch) {
    const parts = viewBoxMatch[1].trim().split(/\s+/);
    if (parts.length >= 4) {
      return {
        width: Math.round(parseFloat(parts[2])),
        height: Math.round(parseFloat(parts[3]))
      };
    }
  }

  // Default dimensions if nothing found
  return { width: 1000, height: 800 };
};

// Create layout with image upload
const createLayout = async (req, res) => {
  try {
    const { name, location, description } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Layout image is required'
      });
    }

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Layout name is required'
      });
    }

    const imagePath = req.file.path;
    const isSvg = req.file.mimetype === 'image/svg+xml';

    let imageWidth, imageHeight;

    if (isSvg) {
      // Get dimensions from SVG file
      const dimensions = getSvgDimensions(imagePath);
      imageWidth = dimensions.width;
      imageHeight = dimensions.height;
    } else {
      // Get image dimensions using sharp for raster images
      const metadata = await sharp(imagePath).metadata();
      imageWidth = metadata.width;
      imageHeight = metadata.height;
    }

    const layout = await Layout.create({
      name,
      location,
      description,
      imageUrl: `/uploads/${req.file.filename}`,
      imageWidth,
      imageHeight
    });

    res.status(201).json({
      success: true,
      message: 'Layout created successfully',
      data: layout
    });
  } catch (error) {
    console.error('Create layout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating layout'
    });
  }
};

// Get all layouts (public)
const getAllLayouts = async (req, res) => {
  try {
    const layouts = await Layout.findAll({
      where: { isActive: true },
      include: [{
        model: Plot,
        as: 'plots',
        attributes: ['id', 'plotNumber', 'status']
      }],
      order: [['createdAt', 'DESC']]
    });

    // Add plot statistics
    const layoutsWithStats = layouts.map(layout => {
      const plotData = layout.toJSON();
      const plots = plotData.plots || [];
      plotData.totalPlots = plots.length;
      plotData.availablePlots = plots.filter(p => p.status === 'available').length;
      plotData.bookedPlots = plots.filter(p => p.status === 'booked').length;
      plotData.holdPlots = plots.filter(p => p.status === 'hold').length;
      return plotData;
    });

    res.json({
      success: true,
      data: layoutsWithStats
    });
  } catch (error) {
    console.error('Get layouts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching layouts'
    });
  }
};

// Get single layout with all plots (public)
const getLayoutById = async (req, res) => {
  try {
    const { id } = req.params;

    const layout = await Layout.findByPk(id, {
      include: [{
        model: Plot,
        as: 'plots',
        order: [['plotNumber', 'ASC']]
      }]
    });

    if (!layout) {
      return res.status(404).json({
        success: false,
        message: 'Layout not found'
      });
    }

    res.json({
      success: true,
      data: layout
    });
  } catch (error) {
    console.error('Get layout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching layout'
    });
  }
};

// Update layout
const updateLayout = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location, description, isActive } = req.body;

    const layout = await Layout.findByPk(id);
    if (!layout) {
      return res.status(404).json({
        success: false,
        message: 'Layout not found'
      });
    }

    // If new image uploaded
    if (req.file) {
      const isSvg = req.file.mimetype === 'image/svg+xml';

      if (isSvg) {
        const dimensions = getSvgDimensions(req.file.path);
        layout.imageUrl = `/uploads/${req.file.filename}`;
        layout.imageWidth = dimensions.width;
        layout.imageHeight = dimensions.height;
      } else {
        const metadata = await sharp(req.file.path).metadata();
        layout.imageUrl = `/uploads/${req.file.filename}`;
        layout.imageWidth = metadata.width;
        layout.imageHeight = metadata.height;
      }
    }

    if (name) layout.name = name;
    if (location !== undefined) layout.location = location;
    if (description !== undefined) layout.description = description;
    if (isActive !== undefined) layout.isActive = isActive;

    await layout.save();

    res.json({
      success: true,
      message: 'Layout updated successfully',
      data: layout
    });
  } catch (error) {
    console.error('Update layout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating layout'
    });
  }
};

// Delete layout
const deleteLayout = async (req, res) => {
  try {
    const { id } = req.params;

    const layout = await Layout.findByPk(id);
    if (!layout) {
      return res.status(404).json({
        success: false,
        message: 'Layout not found'
      });
    }

    // Soft delete by setting isActive to false
    layout.isActive = false;
    await layout.save();

    res.json({
      success: true,
      message: 'Layout deleted successfully'
    });
  } catch (error) {
    console.error('Delete layout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting layout'
    });
  }
};

module.exports = {
  createLayout,
  getAllLayouts,
  getLayoutById,
  updateLayout,
  deleteLayout
};

