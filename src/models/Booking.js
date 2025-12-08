const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Booking = sequelize.define('Booking', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  plotId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'plots',
      key: 'id'
    }
  },
  // Client details
  clientName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  clientEmail: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  clientPhone: {
    type: DataTypes.STRING,
    allowNull: false
  },
  clientAddress: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Booking details
  bookingDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'cancelled'),
    defaultValue: 'confirmed'
  },
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'partial', 'completed'),
    defaultValue: 'pending'
  },
  amountPaid: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Admin who created the booking
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'bookings',
  timestamps: true
});

module.exports = Booking;

