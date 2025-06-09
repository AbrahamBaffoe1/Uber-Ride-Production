# Okada Transportation Database Architecture

## Overview

The Okada Transportation system has been refactored to support separate MongoDB databases for the rider and passenger applications, while maintaining a shared backend codebase. This architecture provides several benefits:

1. **Data Isolation**: Rider and passenger data are stored in separate databases, providing better security and data isolation.
2. **Performance**: Each database can be optimized for its specific use case and workload.
3. **Scalability**: Each database can scale independently based on usage patterns.
4. **Maintainability**: Changes to one app's data model won't affect the other app.

## Database Structure

The system now uses two separate MongoDB databases:

### 1. Rider Database (`okada-rider`)

- **Purpose**: Stores all rider-specific data
- **Primary collections**:
  - Users (with role='rider')
  - RiderLocations
  - Earnings
  - Documents
  - Rides (synced from passenger database)
  - Other rider-specific collections

### 2. Passenger Database (`okada-passenger`)

- **Purpose**: Stores all passenger-specific data
- **Primary collections**:
  - Users (with role='passenger')
  - SavedLocations
  - PaymentMethods
  - Rides (primary source)
  - Other passenger-specific collections

## Connection Management

The database connections are managed in `backend/src/config/mongodb.js`. This module provides:

- Separate connection functions for rider and passenger databases
- Connection pooling for each database
- Error handling and reconnection logic
- Environment-specific configuration (development vs. production)

## Route Structure

The API routes are organized into three main categories:

### 1. Rider Routes (`/api/v1/rider/...`)

- Routes specific to the rider app
- Examples: rider profile, earnings, availability management
- Use the rider database connection

### 2. Passenger Routes (`/api/v1/passenger/...`)

- Routes specific to the passenger app
- Examples: ride requests, saved locations, payment methods
- Use the passenger database connection

### 3. Shared Routes (`/api/v1/shared/...`)

- Routes used by both apps
- Examples: authentication, ride status updates
- Access both databases as needed
- Handle cross-database operations (e.g., ride matching)

## Backward Compatibility

To maintain backward compatibility with existing clients, the system also supports legacy routes at `/api/v1/` and `/api/v1/mongo/`. These are mappings to the new route structure based on context.

## Data Synchronization

Some data needs to exist in both databases. The primary example is ride information:

1. Rides are initially created in the passenger database when a passenger requests a ride
2. When a rider is matched with a ride, a copy of the ride is created in the rider database
3. Ride status updates are synchronized between both databases

## Environment Configuration

The `.env` file now includes separate connection strings for each database:

```
# Rider Database
MONGODB_RIDER_URI=mongodb://localhost:27017/okada-rider
MONGODB_RIDER_LOCAL_URI=mongodb://localhost:27017/okada-rider

# Passenger Database
MONGODB_PASSENGER_URI=mongodb://localhost:27017/okada-passenger
MONGODB_PASSENGER_LOCAL_URI=mongodb://localhost:27017/okada-passenger
```

## Development Guidelines

When developing new features:

1. **Determine the appropriate database**: Consider which app (rider or passenger) the feature is primarily for.
2. **Use the correct route category**: Add new endpoints to rider, passenger, or shared routes as appropriate.
3. **For shared functionality**: Use the shared routes and be careful to handle both databases correctly.
4. **Cross-database operations**: When data needs to be synchronized between databases, follow the patterns established in the shared routes.

## Migration Strategy

For migrating existing data:

1. Create both databases 
2. Copy user records to the appropriate database based on role
3. Copy ride records to both databases where appropriate
4. Validate data consistency between databases

## Examples

### Example 1: Rider location updates (rider-specific)

```javascript
// In rider routes
router.post('/location', authenticate, checkRole(['rider']), async (req, res) => {
  const riderId = req.user.id;
  const { location } = req.body;
  
  // Use rider database connection
  const RiderLocation = riderConnection.model('RiderLocation', require('../../models/RiderLocation').schema);
  
  await RiderLocation.findOneAndUpdate(
    { riderId },
    { location, lastUpdated: new Date() },
    { upsert: true }
  );
  
  res.status(200).json({ success: true });
});
```

### Example 2: User authentication (shared)

```javascript
// In shared routes
router.post('/auth/login', async (req, res) => {
  const { email, password, role } = req.body;
  
  let user;
  
  // Check appropriate database based on role
  if (role === 'rider') {
    user = await RiderUser.findOne({ email });
  } else if (role === 'passenger') {
    user = await PassengerUser.findOne({ email });
  } else {
    // If role not specified, check both
    user = await RiderUser.findOne({ email }) || await PassengerUser.findOne({ email });
  }
  
  // Proceed with authentication...
});
```

## Troubleshooting

Common issues and their solutions:

1. **Connection errors**: Verify the correct database URI is specified in the .env file
2. **Missing data**: Check you're querying the correct database for the user role
3. **Authentication issues**: Remember user data is stored in separate databases based on role
4. **Synchronization issues**: Check both databases when debugging ride-related issues
