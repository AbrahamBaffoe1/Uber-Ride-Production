/**
 * Register all models on the appropriate database connections
 */
import RiderLocation from './RiderLocation.js';
import SavedLocation from './SavedLocation.js';
import User from './User.js';
import Ride from './Ride.js';
import Notification from './Notification.js';
import TrackingEvent from './TrackingEvent.js';
import SupportTicket from './SupportTicket.js';
import FAQ from './FAQ.js';
import Rating from './Rating.js';

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
    
    // Make sure SavedLocation is available on both connections
    if (!riderConnection.models.SavedLocation) {
      riderConnection.model('SavedLocation', SavedLocation.schema);
    }

    // Register models on passenger connection
    if (passengerConnection && !passengerConnection.models.SavedLocation) {
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
    if (!passengerConnection.models.SupportTicket) {
      passengerConnection.model('SupportTicket', SupportTicket);
    }
    if (!passengerConnection.models.FAQ) {
      passengerConnection.model('FAQ', FAQ);
    }
    if (!passengerConnection.models.Rating) {
      passengerConnection.model('Rating', Rating);
    }
    
    // Also register support models on rider connection
    if (!riderConnection.models.SupportTicket) {
      riderConnection.model('SupportTicket', SupportTicket);
    }
    if (!riderConnection.models.FAQ) {
      riderConnection.model('FAQ', FAQ);
    }
    if (!riderConnection.models.Rating) {
      riderConnection.model('Rating', Rating);
    }

    console.log('All models registered successfully on database connections');
  } catch (error) {
    console.error('Error registering models:', error);
    throw error;
  }
};
