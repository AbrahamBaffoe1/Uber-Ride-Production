# PostGIS Setup Guide

This guide explains how to install and set up PostGIS, a spatial database extension for PostgreSQL that is required for the Okada Transportation app to handle location data.

## What is PostGIS?

PostGIS adds support for geographic objects to PostgreSQL, allowing for location queries to be run in SQL. The Okada Transportation app uses PostGIS to store and query rider and passenger locations, compute distances, and optimize routes.

## Installing PostGIS

### macOS

If you installed PostgreSQL via Homebrew, you can add PostGIS:

```bash
brew install postgis
```

### Ubuntu/Debian

```bash
sudo apt-get update
sudo apt-get install postgis postgresql-14-postgis-3
```

### Windows

If you're using the EnterpriseDB PostgreSQL installer:

1. Open StackBuilder (it should be available in your Start menu after PostgreSQL installation)
2. Select your PostgreSQL installation
3. Navigate to "Spatial Extensions" > "PostGIS"
4. Follow the installation wizard

## Enabling PostGIS for Your Database

After installing PostGIS, you need to enable it for your database:

```bash
psql -U postgres -d okada_transport -c "CREATE EXTENSION IF NOT EXISTS postgis;"
```

## Verify PostGIS Installation

To verify PostGIS is properly installed and enabled:

```bash
psql -U postgres -d okada_transport -c "SELECT PostGIS_Version();"
```

This should return the version of PostGIS installed.

## Troubleshooting

### Common Issues

1. **ERROR: could not open extension control file**: This usually means PostGIS is not properly installed. Try reinstalling PostGIS.

2. **ERROR: permission denied to create extension "postgis"**: Make sure your database user has the necessary permissions. You might need to connect as a superuser.

3. **ERROR: type "geometry" does not exist**: This indicates that while PostGIS might be installed, it hasn't been enabled for the current database. Run the "CREATE EXTENSION postgis;" command.

### Using Docker

If you're using Docker, our PostgreSQL image should already include PostGIS. If you're seeing errors, try rebuilding the Docker container:

```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## Migration Error Handling

The Okada Transportation app has a migration that automatically tries to enable PostGIS for your database. If this migration fails, it will show a clear error message asking you to install PostGIS.

After installing PostGIS, run the migration again:

```bash
cd backend
npx sequelize-cli db:migrate
```

## Additional Resources

- [PostGIS Official Documentation](https://postgis.net/documentation/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
