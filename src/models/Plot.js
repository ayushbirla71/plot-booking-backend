const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Plot = sequelize.define('Plot', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  layoutId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'layouts',
      key: 'id'
    }
  },
  plotNumber: {
    type: DataTypes.STRING,
    allowNull: false
  },
  // Coordinates for rectangular plots
  x: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  y: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  width: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  height: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  // Polygon coordinates for complex shapes (JSON array of {x, y} points)
  polygonCoordinates: {
    type: DataTypes.JSON,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('available', 'booked', 'hold'),
    defaultValue: 'available'
  },
  price: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  },
  size: {
    type: DataTypes.STRING,
    allowNull: true
  },
  facing: {
    type: DataTypes.STRING,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'plots',
  timestamps: true
});

module.exports = Plot;

