/**
 * Register all models on the appropriate database connections
 */
import RiderLocation from './RiderLocation.js';
import SavedLocation from './SavedLocation.js';
import User from './User.js';
import Ride from './Ride.js';
import Notification from './Notification.js';
import TrackingEvent from './TrackingEvent.js';

/**
 * Register models on the appropriate connections
 * @param {Object} riderConnection - Mongoose connection to rider database
 * @param {Object} passengerConnection - Mongoose connection to passenger database
 */
export const registerModels = (riderConnection, passengerConnection) => {
  try {
    // Register models on rider connection
    if (!riderConnection.models.RiderLocation) {
      riderConnection.model('RiderLocation', RiderLocation.schema);
    }
    if (!riderConnection.models.User) {
      riderConnection.model('User', User.schema);
    }
    if (!riderConnection.models.Ride) {
      riderConnection.model('Ride', Ride.schema);
    }
    if (!riderConnection.models.Notification) {
      riderConnection.model('Notification', Notification.schema);
    }
    if (!riderConnection.models.TrackingEvent) {
      riderConnection.model('TrackingEvent', TrackingEvent.schema);
    }

    // Register models on passenger connection
    if (!passengerConnection.models.SavedLocation) {
      passengerConnection.model('SavedLocation', SavedLocation.schema);
    }
    if (!passengerConnection.models.User) {
      passengerConnection.model('User', User.schema);
    }
    if (!passengerConnection.models.Ride) {
      passengerConnection.model('Ride', Ride.schema);
    }
    if (!passengerConnection.models.Notification) {
      passengerConnection.model('Notification', Notification.schema);
    }

    console.log('All models registered successfully on database connections');
  } catch (error) {
    console.error('Error registering models:', error);
    throw error;
  }
};
