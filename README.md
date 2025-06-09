# Okada Transportation Solution

A comprehensive ride-hailing platform for motorcycle taxis (Okada) featuring mobile apps for passengers and riders, web dashboards for administration and regulatory oversight, and a robust backend API.

## 🚀 Project Overview

The Okada Transportation Solution is a full-stack application that includes:

- **Mobile Apps**: React Native apps for passengers and riders
- **Web Dashboards**: Admin and regulatory oversight dashboards
- **Backend API**: Node.js/Express API with MongoDB
- **Real-time Features**: Live tracking, notifications, and ride matching

## 📱 Mobile Applications

### Passenger App
- **Location**: `mobile/passenger-app/OkadaPassengerApp/`
- **Features**: 
  - User registration and authentication
  - Ride booking and tracking
  - Payment integration
  - Safety features
  - Ride history

### Rider App
- **Location**: `mobile/rider-app/OkadaRiderApp/`
- **Features**:
  - Driver registration and verification
  - Ride acceptance and navigation
  - Earnings tracking
  - Real-time location sharing
  - Trip management

## 🌐 Web Applications

### Admin Dashboard
- **Location**: `web/admin-dashboard/`
- **Features**:
  - User management
  - Ride monitoring
  - Analytics and reporting
  - Payment management
  - System configuration

### Regulatory Dashboard
- **Location**: `web/regulatory-dashboard/`
- **Features**:
  - Compliance monitoring
  - Safety oversight
  - Regulatory reporting
  - Driver verification
  - Incident management

## 🔧 Backend API

### Core Services
- **Location**: `backend/`
- **Technology**: Node.js, Express, MongoDB
- **Features**:
  - RESTful API
  - Real-time WebSocket connections
  - Authentication and authorization
  - Payment processing
  - Geolocation services
  - Push notifications

### Key Components
- **Authentication**: JWT-based auth with OTP verification
- **Real-time Tracking**: Socket.io for live location updates
- **Payment Integration**: Multiple payment gateway support
- **Maps Integration**: Google Maps API for routing and geocoding
- **Database**: MongoDB with optimized indexes

## 🛠️ Technology Stack

### Mobile Apps
- **Framework**: React Native with Expo
- **State Management**: Redux Toolkit
- **Navigation**: React Navigation
- **Maps**: React Native Maps
- **Real-time**: Socket.io client

### Web Dashboards
- **Framework**: React.js
- **UI Library**: Material-UI / Ant Design
- **State Management**: Redux
- **Charts**: Chart.js / D3.js

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB
- **Real-time**: Socket.io
- **Authentication**: JWT + Twilio Verify
- **File Storage**: AWS S3 / CloudFront
- **Maps**: Google Maps API

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- Expo CLI
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/okada-transportation.git
   cd okada-transportation
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install

   # Install backend dependencies
   cd backend && npm install

   # Install passenger app dependencies
   cd ../mobile/passenger-app/OkadaPassengerApp && npm install

   # Install rider app dependencies
   cd ../../../mobile/rider-app/OkadaRiderApp && npm install

   # Install admin dashboard dependencies
   cd ../../../web/admin-dashboard && npm install

   # Install regulatory dashboard dependencies
   cd ../web/regulatory-dashboard && npm install
   ```

3. **Environment Configuration**
   
   Create `.env` files in each component:
   
   **Backend** (`backend/.env`):
   ```env
   NODE_ENV=development
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/okada_transportation
   JWT_SECRET=your_jwt_secret_here
   TWILIO_ACCOUNT_SID=your_twilio_sid
   TWILIO_AUTH_TOKEN=your_twilio_token
   TWILIO_VERIFY_SERVICE_SID=your_verify_service_sid
   GOOGLE_MAPS_API_KEY=your_google_maps_key
   AWS_ACCESS_KEY_ID=your_aws_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret
   AWS_REGION=your_aws_region
   AWS_S3_BUCKET=your_s3_bucket
   ```

   **Mobile Apps** (`.env` in each app directory):
   ```env
   EXPO_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
   EXPO_PUBLIC_SOCKET_URL=http://localhost:3000
   ```

4. **Database Setup**
   ```bash
   # Start MongoDB
   mongod

   # Run database initialization scripts
   cd backend && npm run db:setup
   ```

### Running the Applications

#### Backend API
```bash
cd backend
npm run dev
```
The API will be available at `http://localhost:3000`

#### Passenger Mobile App
```bash
cd mobile/passenger-app/OkadaPassengerApp
npm run start
```

#### Rider Mobile App
```bash
cd mobile/rider-app/OkadaRiderApp
npm run start
```

#### Admin Dashboard
```bash
cd web/admin-dashboard
npm run dev
```

#### Regulatory Dashboard
```bash
cd web/regulatory-dashboard
npm run dev
```

## 📋 Available Scripts

### Backend
- `npm run dev` - Start development server with hot reload
- `npm run start` - Start production server
- `npm run test` - Run tests
- `npm run db:setup` - Initialize database with indexes and seed data

### Mobile Apps
- `npm run start` - Start Expo development server
- `npm run ios` - Run on iOS simulator
- `npm run android` - Run on Android emulator
- `npm run web` - Run in web browser
- `npm run build` - Build for production

### Web Dashboards
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## 🔧 Configuration

### Environment Variables

Each component requires specific environment variables. See the `.env.example` files in each directory for complete configuration options.

### Database Configuration

The application uses MongoDB with the following collections:
- `users` - User accounts (passengers and riders)
- `rides` - Ride requests and history
- `locations` - Real-time location data
- `payments` - Payment transactions
- `notifications` - Push notifications

## 🚀 Deployment

### Backend Deployment (Heroku/Railway/DigitalOcean)
1. Set up environment variables
2. Configure MongoDB Atlas or managed database
3. Deploy using Git or Docker

### Mobile App Deployment
1. **iOS**: Build and submit to App Store using EAS Build
2. **Android**: Build and submit to Google Play Store using EAS Build

### Web Dashboard Deployment (Vercel/Netlify)
1. Connect repository to deployment platform
2. Configure build settings
3. Set environment variables
4. Deploy

## 🧪 Testing

### Backend Testing
```bash
cd backend
npm run test
```

### Mobile App Testing
```bash
cd mobile/passenger-app/OkadaPassengerApp
npm run test
```

## 📚 API Documentation

The API documentation is available at `/api-docs` when running the backend server. It includes:
- Authentication endpoints
- User management
- Ride management
- Payment processing
- Real-time tracking

## 🔒 Security Features

- JWT-based authentication
- OTP verification via Twilio
- Rate limiting
- Input validation and sanitization
- CORS configuration
- Helmet.js security headers
- MongoDB injection prevention

## 🌟 Key Features

### Real-time Tracking
- Live location updates using Socket.io
- Optimized for battery efficiency
- Offline capability with sync

### Payment Integration
- Multiple payment methods
- Secure payment processing
- Transaction history
- Refund management

### Safety Features
- Emergency contacts
- Ride sharing
- Driver verification
- Trip monitoring

### Analytics
- Real-time dashboards
- Performance metrics
- User behavior analysis
- Revenue tracking

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support and questions:
- Email: support@okadatransport.com
- Documentation: [docs.okadatransport.com](https://docs.okadatransport.com)
- Issues: [GitHub Issues](https://github.com/yourusername/okada-transportation/issues)

## 🗺️ Roadmap

- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Voice navigation
- [ ] AI-powered route optimization
- [ ] Integration with public transport
- [ ] Carbon footprint tracking
- [ ] Loyalty program
- [ ] Fleet management tools

## 📊 Project Status

- ✅ Backend API - Complete
- ✅ Mobile Apps - Complete
- ✅ Admin Dashboard - Complete
- ✅ Regulatory Dashboard - Complete
- ✅ Real-time Features - Complete
- ✅ Payment Integration - Complete
- 🔄 Advanced Analytics - In Progress
- 📋 Multi-language Support - Planned

---

Built with ❤️ for the future of urban transportation
