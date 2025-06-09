# PostgreSQL to MongoDB Migration Guide

This document explains how to migrate data from PostgreSQL to MongoDB using the provided migration tools. The migration process transfers data from a PostgreSQL database to MongoDB, preserving relationships between entities and ensuring data integrity.

## Overview

The migration tool is built as a Node.js script with a Bash wrapper for ease of use. It supports:

- Batch processing to handle large datasets efficiently
- Selective migration of specific data types
- Dry-run mode to test migrations without making changes
- Detailed logging and error handling
- Preservation of relationships between entities

## Prerequisites

Before running the migration, ensure you have:

1. Node.js installed (v14+ recommended)
2. Both PostgreSQL and MongoDB servers running and accessible
3. Required environment variables set in `.env`:
   - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (PostgreSQL connection)
   - `MONGODB_URI` (MongoDB connection string)
4. Backed up your existing data

## Migration Process

The tool migrates the following data types:

1. **Users**: Account information, credentials, profile data
2. **Rides**: Trip data including locations, status, and fare details
3. **Payments**: Payment transactions (converted to Transaction model in MongoDB)
4. **Rider Locations**: Current and historical rider positions
5. **Notifications**: User notifications and messaging data
6. **Documents**: Rider documentation like licenses and ID verification
7. **Earnings**: Rider earnings records (converted to Transaction model in MongoDB)

## How to Run the Migration

You can run the migration using the provided shell script:

```bash
cd /path/to/okada-transportation/backend
./scripts/run-mongo-migration.sh [options]
```

### Available Options

- `--all`: Migrate all data types (default if no specific option provided)
- `--users`: Migrate only users
- `--rides`: Migrate only rides
- `--payments`: Migrate only payments
- `--locations`: Migrate only rider locations
- `--notifications`: Migrate only notifications
- `--documents`: Migrate only rider documents
- `--earnings`: Migrate only rider earnings
- `--batch=N`: Set batch size for processing (default: 100)
- `--dry-run`: Run without writing to MongoDB
- `--verbose`: Show detailed output
- `--help`: Display help message

### Examples

Migrate all data with verbose output:
```bash
./scripts/run-mongo-migration.sh --all --verbose
```

Migrate only users and rides with a batch size of 50:
```bash
./scripts/run-mongo-migration.sh --users --rides --batch=50
```

Test migration of payments without making changes:
```bash
./scripts/run-mongo-migration.sh --payments --dry-run
```

## ID Mapping

The migration tool uses deterministic ID mapping to ensure that PostgreSQL IDs are consistently mapped to the same MongoDB ObjectIDs. This preserves relationships between entities and allows for incremental migrations.

## Post-Migration Verification

After migration, verify the data integrity by:

1. Comparing record counts between PostgreSQL and MongoDB
2. Testing application functionality with the MongoDB backend
3. Verifying relationships have been preserved correctly
4. Checking that data fields have been mapped correctly

## Architecture Changes

The migration involves several architectural changes:

1. **Transaction Model**: All financial operations now use a unified Transaction model in MongoDB
2. **Spatial Indexing**: Location data leverages MongoDB's geospatial indexing for efficient queries
3. **Schema Changes**: Some fields are normalized differently in the MongoDB schema
4. **API Endpoints**: API endpoints now use the `/api/v1/mongo` prefix

## Troubleshooting

### Common Issues

1. **Connection Problems**
   - Check that both databases are running
   - Verify connection strings in `.env` file
   - Check network connectivity and firewall settings

2. **Missing Collections**
   - MongoDB collections are created automatically during migration
   - Check MongoDB logs for any errors during collection creation

3. **Data Mapping Issues**
   - Review the field mappings in the migration script
   - Check for data type inconsistencies
   - Look for fields with special characters or non-UTF8 encoding

### Error Logs

The migration script creates detailed logs of any errors encountered. Check these logs for specific information about failed migrations.

## Rollback Plan

If issues are encountered, you can:

1. Keep the PostgreSQL database as the primary database
2. Drop the MongoDB collections and re-run the migration
3. Use the dry-run mode to test fixes before applying them

## Performance Considerations

- Migration performance depends on dataset size and server resources
- Using appropriate batch sizes can optimize memory usage
- Consider running migrations during off-peak hours for production systems
- For very large datasets, consider running migrations for each data type separately

## Support

For assistance with migration issues, contact the development team or refer to the MongoDB and PostgreSQL documentation for specific database operation details.
