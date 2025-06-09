# MongoDB Index Creation Guide

This document explains how to create and manage MongoDB indexes for the Okada Transportation application using the provided tools. Proper indexing is crucial for application performance, especially for location-based queries and high-volume collections.

## Overview

The index creation tool is built as a Node.js script with a Bash wrapper for ease of use. It creates all necessary indexes on MongoDB collections to ensure optimal query performance, including:

- Regular indexes for common query fields
- Unique indexes for fields requiring uniqueness constraints
- Geospatial (2dsphere) indexes for location-based queries
- Compound indexes for commonly combined query parameters

## Prerequisites

Before running the index creation tool, ensure you have:

1. Node.js installed (v14+ recommended)
2. MongoDB servers running and accessible
3. Required environment variables set in `.env`:
   - `MONGODB_RIDER_URI` (MongoDB connection string for rider database)
   - `MONGODB_PASSENGER_URI` (MongoDB connection string for passenger database)
4. Backed up your existing data

## Indexes Created

The tool creates the following indexes for better query performance:

### User Collection Indexes
- `email`: Unique index for user emails
- `phoneNumber`: Unique index for user phone numbers

### Rides Collection Indexes
- `riderId`: For quick filtering by rider
- `pickupLocation.coordinates`: Geospatial (2dsphere) index for location-based queries
- `destination.coordinates`: Geospatial (2dsphere) index for location-based queries
- `status`: For filtering rides by status
- `riderId, status`: Compound index for rider dashboard queries
- `userId, status`: Compound index for passenger history
- `createdAt`: For time-based sorting

### Rider Locations Collection Indexes
- `riderId`: For quick filtering by rider
- `currentLocation`: Geospatial (2dsphere) index for nearby rider searches
- `riderId, lastUpdated`: For tracking latest rider positions
- `status`: For filtering by rider availability

### Earnings Collection Indexes
- `userId`: For filtering by passenger
- `riderId`: For filtering by rider
- `pickupLocation.coordinates`: Geospatial (2dsphere) index
- `destination.coordinates`: Geospatial (2dsphere) index
- `status`: For filtering by payment status
- `riderId, status`: For rider earnings dashboard
- `userId, status`: For passenger payment history
- `createdAt`: For time-based sorting

### Saved Locations Collection Indexes
- `userId`: For filtering by passenger
- `riderId`: For filtering by rider
- `pickupLocation.coordinates`: Geospatial (2dsphere) index
- `destination.coordinates`: Geospatial (2dsphere) index
- `status`: For filtering by active/inactive status
- `riderId, status`: For rider saved locations
- `userId, status`: For passenger saved locations
- `createdAt`: For time-based sorting

## How to Run the Index Creation Tool

You can run the index creation using the provided shell script:

```bash
cd /path/to/okada-transportation/backend
./scripts/create-mongodb-indexes.sh [options]
```

### Available Options

- `--verbose`: Show detailed output
- `--help`: Display help message

### Examples

Create all indexes with standard output:
```bash
./scripts/create-mongodb-indexes.sh
```

Create all indexes with verbose output:
```bash
./scripts/create-mongodb-indexes.sh --verbose
```

### Using npm Script

You can also run the index creation tool using npm:

```bash
cd /path/to/okada-transportation/backend
npm run create-mongodb-indexes
```

## Index Creation Process

The tool performs the following steps:

1. Connects to both rider and passenger MongoDB databases
2. For each database, it:
   - Creates indexes on each collection
   - Skips any indexes that already exist
   - Reports successful index creations
   - Logs any errors encountered

## Performance Considerations

- Index creation can be resource-intensive, particularly on large collections
- Indexes increase query performance but slightly reduce write performance
- Indexes consume disk space, which should be monitored
- The background option is used for all indexes to minimize impact on running applications

## Index Maintenance

Over time, as the application evolves, you may need to:

1. Add new indexes for new query patterns
2. Remove unused indexes to improve write performance
3. Review index effectiveness using MongoDB's index statistics

## Troubleshooting

### Common Issues

1. **Connection Problems**
   - Check that MongoDB is running
   - Verify connection strings in `.env` file
   - Check network connectivity and firewall settings

2. **Permission Issues**
   - Ensure the MongoDB user has permissions to create indexes
   - Check MongoDB logs for authorization errors

3. **Resource Constraints**
   - Index creation can be memory-intensive on large collections
   - Consider increasing MongoDB's available memory if index creation fails

### Error Logs

The index creation script logs any errors encountered. Check these logs for specific information about failed index creations.

## Support

For assistance with index issues, contact the development team or refer to the MongoDB documentation for specific details on indexing strategies and performance optimization.
