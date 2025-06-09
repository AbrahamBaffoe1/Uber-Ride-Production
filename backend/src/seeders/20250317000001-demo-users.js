'use strict';
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Hash passwords for demo users
    const passwordHash = await bcrypt.hash('password123', 10);
    
    // Create demo users
    return queryInterface.bulkInsert('Users', [
      {
        id: uuidv4(),
        email: 'passenger@okada.com',
        password: passwordHash,
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '+2341234567890',
        role: 'passenger',
        status: 'active',
        emailVerified: true,
        phoneVerified: true,
        city: 'Lagos',
        country: 'Nigeria',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        email: 'rider@okada.com',
        password: passwordHash,
        firstName: 'James',
        lastName: 'Smith',
        phoneNumber: '+2349876543210',
        role: 'rider',
        status: 'active',
        emailVerified: true,
        phoneVerified: true,
        city: 'Lagos',
        country: 'Nigeria',
        vehicleType: 'motorcycle',
        vehicleModel: 'Honda CB125F',
        licensePlate: 'LG-456-XY',
        licenseNumber: 'LCN123456789',
        insuranceNumber: 'INS987654321',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        email: 'admin@okada.com',
        password: passwordHash,
        firstName: 'Admin',
        lastName: 'User',
        phoneNumber: '+2348765432109',
        role: 'admin',
        status: 'active',
        emailVerified: true,
        phoneVerified: true,
        city: 'Lagos',
        country: 'Nigeria',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    return queryInterface.bulkDelete('Users', null, {});
  }
};
