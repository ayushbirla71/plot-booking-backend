/**
 * Seed script to create a layout from the PDF-converted image
 * Run: node src/scripts/seedLayout.js
 */

require('dotenv').config();
const path = require('path');
const { sequelize } = require('../config/database');
const { User, Layout, Plot } = require('../models');
const bcrypt = require('bcryptjs');

async function seedDatabase() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Connected!\n');

    // Create admin user if not exists
    let admin = await User.findOne({ where: { email: 'admin@example.com' } });
    if (!admin) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      admin = await User.create({
        name: 'Admin',
        email: 'admin@example.com',
        phone: '9876543210',
        password: hashedPassword,
        role: 'admin',
        isActive: true
      });
      console.log('✅ Admin user created: admin@example.com / admin123');
    } else {
      console.log('ℹ️  Admin user already exists');
    }

    // Create layout from the converted PDF image
    let layout = await Layout.findOne({ where: { name: 'Main Plot Layout' } });
    if (!layout) {
      layout = await Layout.create({
        name: 'Main Plot Layout',
        location: 'Project Site',
        description: 'Layout from page 4.pdf - Main plot layout for the project',
        imageUrl: '/uploads/layout-1.png',
        imageWidth: 1024,
        imageHeight: 792,
        isActive: true
      });
      console.log('✅ Layout created from page 4.pdf');
      console.log(`   ID: ${layout.id}`);
      console.log(`   Image: /uploads/layout-1.png (1024 x 792)`);
    } else {
      console.log('ℹ️  Layout already exists');
    }

    console.log('\n========================================');
    console.log('📋 NEXT STEPS:');
    console.log('========================================');
    console.log('1. Start the server: npm start');
    console.log('2. Open browser: http://localhost:3000/api/map/' + layout.id + '/html');
    console.log('3. View the layout image and note the coordinates for each plot');
    console.log('4. Use Postman to add plots with coordinates');
    console.log('\nExample plot creation:');
    console.log(`
POST /api/plots
{
  "layoutId": "${layout.id}",
  "plotNumber": "101",
  "x": 100,
  "y": 100,
  "width": 50,
  "height": 50,
  "status": "available",
  "price": 500000,
  "size": "30x40",
  "facing": "East"
}
    `);
    console.log('========================================\n');

    await sequelize.close();
    console.log('Done!');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

seedDatabase();

