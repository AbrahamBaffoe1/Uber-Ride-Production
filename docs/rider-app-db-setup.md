# PostgreSQL Database Setup for Okada Rider App

This document provides instructions for setting up the PostgreSQL database for the Okada Rider App.

## Prerequisites

You need either:
- PostgreSQL installed locally on your machine (recommended for development)
- Docker and Docker Compose installed (for containerized setup)

## Option 1: Setup with Local PostgreSQL (Recommended for Development)

1. Make sure PostgreSQL is installed on your system
   - On macOS: `brew install postgresql@14`
   - On Ubuntu/Debian: `sudo apt-get install postgresql-14`
   - On Windows: Download from [postgresql.org](https://www.postgresql.org/download/windows/)

2. Start PostgreSQL service (if not already running)
   - On macOS: `brew services start postgresql@14`
   - On Ubuntu/Debian: `sudo service postgresql start`
   - On Windows: It should be running as a service

3. Run the setup script:
   ```bash
   ./scripts/setup-local-rider-db.sh
   ```

   This script will:
   - Create the `okada_transport` database if it doesn't exist
   - Install backend dependencies
   - Run database migrations
   - Seed the database with initial data

## Option 2: Setup with Docker

1. Make sure Docker and Docker Compose are installed and running on your system

2. Run the setup script:
   ```bash
   ./scripts/setup-rider-db.sh
   ```

   This script will:
   - Start the PostgreSQL container if not already running
   - Verify database connection
   - Install backend dependencies
   - Run database migrations
   - Seed the database with initial data

## Environment Configuration

The backend application uses environment variables for database connection. These are loaded from the `.env` file in the backend directory. 

For local development with PostgreSQL running on your machine, the important settings are:
```
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=okada_transport
DB_HOST=localhost
DB_PORT=5432
```

For Docker setup, use:
```
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=okada_transport
DB_HOST=postgres
DB_PORT=5432
```

## Manually Running Migrations

If you need to run migrations manually:

```bash
cd backend
npx sequelize-cli db:migrate
```

## Manually Seeding the Database

If you need to seed the database manually:

```bash
cd backend
npx sequelize-cli db:seed:all
```

## Connecting from Rider App

The mobile Rider App should be configured to connect to the backend API at the correct URL. This is set in the `.env` file in the `mobile/rider-app/OkadaRiderApp` directory.

For local development, ensure the mobile app has:
```
API_URL=http://localhost:3000/api/v1
```

When running on a physical device, you'll need to use your machine's IP address instead of localhost.

## Troubleshooting

1. **Connection refused errors**: Make sure PostgreSQL is running. Check with `ps aux | grep postgres` or `brew services list`.
2. **Authentication errors**: Verify your username/password in the `.env` file.
3. **Database doesn't exist**: Run `createdb okada_transport` manually or use the setup script.
4. **Failed migrations**: Check that your PostgreSQL version is compatible (PostgreSQL 14 is recommended).
