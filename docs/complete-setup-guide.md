# Okada Rider App - Complete Setup Guide

This guide provides comprehensive instructions for setting up the Okada Rider App development environment, including the PostgreSQL database, backend server, and mobile application.

## Prerequisites

- Node.js v14 or higher
- npm or yarn
- PostgreSQL (local installation or Docker)
- PostGIS extension for PostgreSQL
- Expo CLI (for running the mobile app)

## 1. Setting Up PostgreSQL Database with PostGIS

### Installing PostGIS

PostGIS is required for handling geographical data in the app. To install it:

```bash
./scripts/install-postgis.sh
```

This script will:
- Install PostGIS on your system
- Create the required database if it doesn't exist
- Enable the PostGIS extension in your database

For manual installation instructions, see [PostGIS Setup Guide](./postgis-setup.md).

### Setting Up the Database

After installing PostGIS, set up the database:

#### Option A: Using Local PostgreSQL Installation

1. Run the local database setup script:
   ```bash
   ./scripts/setup-local-rider-db.sh
   ```
   
2. Enter your PostgreSQL username and password when prompted

### Option B: Using Docker (Recommended for Consistency)

1. Install Docker Desktop
   - Follow the instructions in [docs/docker-installation.md](./docker-installation.md)

2. Run the Docker database setup script:
   ```bash
   ./scripts/setup-rider-db.sh
   ```

## 2. Starting the Backend Server

1. Set up environment variables
   - A default `.env` file has been created in the `backend` directory
   - Modify the values if necessary

2. Run the backend server:
   ```bash
   ./scripts/start-backend-server.sh
   ```

3. Verify the server is running by accessing:
   ```
   http://localhost:3000/api/v1/health
   ```

## 3. Starting the Rider App

1. Set up environment variables
   - A default `.env` file has been created in the `mobile/rider-app/OkadaRiderApp` directory
   - Modify the values if necessary, especially if you're running on a physical device

2. Run the rider app:
   ```bash
   ./scripts/start-rider-app.sh
   ```

3. Follow the instructions in the terminal to run the app on:
   - iOS Simulator (requires macOS with Xcode)
   - Android Emulator (requires Android Studio)
   - Physical device (scan QR code with Expo Go app)

## Database Migrations and Seeding

If you need to manually run migrations or seed the database:

```bash
cd backend
npx sequelize-cli db:migrate
npx sequelize-cli db:seed:all
```

## Troubleshooting

### Database Connection Issues

- Verify PostgreSQL is running (`ps aux | grep postgres` or `brew services list`)
- Check credentials in `backend/.env`
- For Docker setup, ensure Docker is running (`docker ps`)
- Test your database connection with: `./scripts/test-database.sh`

### PostGIS Issues

If you encounter geometry-related errors like `ERROR: type "geometry" does not exist`:
1. Make sure PostGIS is installed: `./scripts/install-postgis.sh`
2. Manually enable the extension: 
   ```
   psql -U postgres -d okada_transport -c "CREATE EXTENSION IF NOT EXISTS postgis;"
   ```
3. Check our [PostGIS Setup Guide](./postgis-setup.md) for more troubleshooting tips

### Backend Server Issues

- Verify there are no port conflicts on 3000
- Check server logs for errors
- Ensure all dependencies are installed (`cd backend && npm install`)

### Mobile App Issues

- Ensure the backend server is running
- Verify API_URL in `mobile/rider-app/OkadaRiderApp/.env` is correct
- For physical devices, use your machine's IP address instead of `localhost`

## Project Structure

- `backend/`: Backend API server
  - `src/api/v1/`: API routes and controllers
  - `src/models/`: Sequelize database models
  - `src/migrations/`: Database migrations
  - `src/services/`: Business logic services

- `mobile/rider-app/`: Rider mobile application
  - `OkadaRiderApp/src/screens/`: Application screens
  - `OkadaRiderApp/src/api/`: API client and services
  - `OkadaRiderApp/src/components/`: Reusable UI components

## Development Workflow

1. Start the PostgreSQL database
2. Start the backend server
3. Start the mobile rider app
4. Make changes to code
5. Test changes in the app

## Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Sequelize Documentation](https://sequelize.org/)
- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [Expo Documentation](https://docs.expo.dev/)
