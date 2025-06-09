/**
 * MongoDB Database Configuration
 * This file has been updated to remove PostgreSQL references and rely solely on MongoDB.
 */
require('dotenv').config();

// MongoDB Configuration
const MONGODB_RIDER_URI = process.env.MONGODB_RIDER_URI || 'mongodb+srv://as4474gq:qGlK0v7ELpFVUPuJ@okadacluster.i9osi.mongodb.net/okada-rider?retryWrites=true&w=majority&appName=OkadaCluster';
const MONGODB_PASSENGER_URI = process.env.MONGODB_PASSENGER_URI || 'mongodb+srv://as4474gq:qGlK0v7ELpFVUPuJ@okadacluster.i9osi.mongodb.net/okada-passenger?retryWrites=true&w=majority&appName=OkadaCluster';

console.log(`Using MongoDB databases for rider and passenger data`);

module.exports = {
  // Rider database configuration
  rider: {
    uri: MONGODB_RIDER_URI,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      retryWrites: true,
      w: 'majority'
    }
  },
  // Passenger database configuration
  passenger: {
    uri: MONGODB_PASSENGER_URI,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      retryWrites: true,
      w: 'majority'
    }
  }
};
