# Okada Transportation Backend

Backend API for the Okada Transportation Platform, providing services for both rider and passenger applications.

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- PostgreSQL (v14 recommended)

## Getting Started

### 1. Database Setup

You can set up the PostgreSQL database in two ways:

#### Option A: Using Local PostgreSQL

Run the setup script that will prompt for your database credentials:

```bash
./scripts/setup-local-rider-db.sh
```

#### Option B: Using Docker

Ensure Docker is installed and running, then execute:

```bash
./scripts/setup-rider-db.sh
```

### 2. Test Database Connection

To verify your database connection is working correctly:

```bash
cd backend
node src/scripts/test-db-connection.js
```

### 3. Start the Backend Server

Start the development server:

```bash
./scripts/start-backend-server.sh
```

Or manually:

```bash
cd backend
npm install  # Only needed first time
npm run dev
```

The server will be available at http://localhost:3000/api/v1.

## Environment Variables

Create a `.env` file in the backend directory with the following variables:

```
# Database Configuration
DB_USERNAME=postgres
DB_PASSWORD=your_postgres_password
DB_NAME=okada_transport
DB_HOST=localhost
DB_PORT=5432

# Server Configuration
PORT=3000
NODE_ENV=development

# Authentication
JWT_SECRET=your_secret_key
```

## API Documentation

The API provides endpoints for:

- Authentication (login, register, password reset)
- User management (profiles, settings)
- Ride management (requests, tracking, history)
- Payments (processing, history)
- Documents (upload, verification)
- Messaging (notifications, SMS)

### API Health Check

You can verify the API is running by accessing:

```
GET /api/v1/health
```

## Project Structure

```
backend/
├── src/
│   ├── api/
│   │   └── v1/           # API version 1
│   │       ├── controllers/  # Request handlers
│   │       ├── middlewares/  # Express middlewares
│   │       ├── routes/       # API route definitions
│   │       └── validators/   # Request validation
│   ├── config/          # Configuration files
│   ├── migrations/      # Database migrations
│   ├── models/          # Sequelize models
│   ├── scripts/         # Utility scripts
│   ├── seeders/         # Database seed data
│   ├── services/        # Business logic
│   └── utils/           # Helper functions
├── tests/               # Tests
└── index.js             # Application entry point
```

## Development

### Database Migrations

Create a new migration:

```bash
npx sequelize-cli migration:generate --name migration-name
```

Run migrations:

```bash
npx sequelize-cli db:migrate
```

Undo last migration:

```bash
npx sequelize-cli db:migrate:undo
```

### Database Seeding

Seed the database with test data:

```bash
npx sequelize-cli db:seed:all
```

## Troubleshooting

If you encounter database connection issues:

1. Ensure PostgreSQL is running
2. Verify your `.env` credentials are correct
3. Check if the database exists
4. Run the test connection script: `node src/scripts/test-db-connection.js`
