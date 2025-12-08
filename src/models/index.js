const { sequelize } = require('../config/database');
const User = require('./User');
const Layout = require('./Layout');
const Plot = require('./Plot');
const Booking = require('./Booking');

// Define associations
Layout.hasMany(Plot, { foreignKey: 'layoutId', as: 'plots' });
Plot.belongsTo(Layout, { foreignKey: 'layoutId', as: 'layout' });

Plot.hasMany(Booking, { foreignKey: 'plotId', as: 'bookings' });
Booking.belongsTo(Plot, { foreignKey: 'plotId', as: 'plot' });

User.hasMany(Booking, { foreignKey: 'createdBy', as: 'createdBookings' });
Booking.belongsTo(User, { foreignKey: 'createdBy', as: 'admin' });

// Sync database
const syncDatabase = async (force = false) => {
  try {
    await sequelize.sync({ force });
    console.log('Database synchronized successfully');
  } catch (error) {
    console.error('Error synchronizing database:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  User,
  Layout,
  Plot,
  Booking,
  syncDatabase
};

