# Deployment Guide - Okada Transportation Solution

This guide covers deploying all components of the Okada Transportation Solution to production environments.

## 🚀 Quick Deployment Overview

### Components to Deploy:
1. **Backend API** → Railway/Heroku/DigitalOcean
2. **Passenger Mobile App** → App Store/Google Play (via EAS Build)
3. **Rider Mobile App** → App Store/Google Play (via EAS Build)
4. **Admin Dashboard** → Vercel/Netlify
5. **Regulatory Dashboard** → Vercel/Netlify

## 📋 Prerequisites

### Required Accounts:
- GitHub account (for code repository)
- MongoDB Atlas account (database)
- Railway/Heroku account (backend hosting)
- Vercel/Netlify account (web hosting)
- Expo account (mobile app builds)
- Apple Developer account (iOS apps)
- Google Play Console account (Android apps)

### Required API Keys:
- Google Maps API key
- Twilio account (SMS/OTP)
- Stripe/Paystack (payments)
- AWS S3 (file storage)

## 🔧 Backend Deployment (Railway)

### 1. Database Setup (MongoDB Atlas)
```bash
# 1. Create MongoDB Atlas cluster
# 2. Create database user
# 3. Whitelist IP addresses
# 4. Get connection string
```

### 2. Deploy to Railway
```bash
# 1. Connect GitHub repository to Railway
# 2. Set environment variables in Railway dashboard
# 3. Deploy automatically from main branch
```

### Environment Variables for Backend:
```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/okada_transportation
JWT_SECRET=your_production_jwt_secret
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
GOOGLE_MAPS_API_KEY=your_google_maps_key
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
STRIPE_SECRET_KEY=your_stripe_secret
```

## 📱 Mobile App Deployment

### 1. Setup EAS Build
```bash
# Install EAS CLI
npm install -g @expo/eas-cli

# Login to Expo
eas login

# Configure EAS for each app
cd mobile/passenger-app/OkadaPassengerApp
eas build:configure

cd ../../../mobile/rider-app/OkadaRiderApp
eas build:configure
```

### 2. Build for Production
```bash
# Passenger App
cd mobile/passenger-app/OkadaPassengerApp
eas build --platform all --profile production

# Rider App
cd ../../../mobile/rider-app/OkadaRiderApp
eas build --platform all --profile production
```

### 3. Submit to App Stores
```bash
# iOS App Store
eas submit --platform ios

# Google Play Store
eas submit --platform android
```

## 🌐 Web Dashboard Deployment (Vercel)

### 1. Admin Dashboard
```bash
# 1. Connect GitHub repository to Vercel
# 2. Set build command: npm run build
# 3. Set output directory: dist
# 4. Set environment variables
```

### Environment Variables for Web:
```env
VITE_API_BASE_URL=https://your-backend-url.railway.app/api/v1
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key
VITE_SOCKET_URL=https://your-backend-url.railway.app
```

### 2. Regulatory Dashboard
```bash
# Same process as Admin Dashboard
# Deploy to separate Vercel project
```

## 🔐 Security Configuration

### 1. Environment Variables
- Never commit `.env` files
- Use platform-specific environment variable management
- Rotate secrets regularly

### 2. CORS Configuration
```javascript
// Update backend CORS settings for production domains
const corsOptions = {
  origin: [
    'https://admin.okadatransport.com',
    'https://regulatory.okadatransport.com',
    'https://your-mobile-app-domain.com'
  ]
};
```

### 3. Database Security
- Enable MongoDB Atlas IP whitelisting
- Use strong database passwords
- Enable database encryption

## 📊 Monitoring & Analytics

### 1. Backend Monitoring
- Set up Railway/Heroku monitoring
- Configure error tracking (Sentry)
- Set up uptime monitoring

### 2. Mobile App Analytics
- Configure Expo Analytics
- Set up crash reporting
- Monitor app performance

### 3. Web Analytics
- Google Analytics
- Vercel Analytics
- User behavior tracking

## 🚀 CI/CD Pipeline

### 1. GitHub Actions Setup
```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Railway
        # Railway deployment steps
  
  deploy-web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Vercel
        # Vercel deployment steps
```

### 2. Automated Testing
```bash
# Add to CI pipeline
npm run test
npm run lint
npm run build
```

## 🔄 Update Process

### 1. Backend Updates
```bash
git push origin main
# Railway auto-deploys from main branch
```

### 2. Mobile App Updates
```bash
# Over-the-air updates for minor changes
eas update --branch production

# App store updates for major changes
eas build --platform all --profile production
eas submit --platform all
```

### 3. Web Dashboard Updates
```bash
git push origin main
# Vercel auto-deploys from main branch
```

## 📱 Domain Configuration

### 1. Custom Domains
- Backend: `api.okadatransport.com`
- Admin Dashboard: `admin.okadatransport.com`
- Regulatory Dashboard: `regulatory.okadatransport.com`

### 2. SSL Certificates
- Railway/Vercel provide automatic SSL
- Configure custom domain SSL

## 🔧 Performance Optimization

### 1. Backend Optimization
- Enable gzip compression
- Configure caching headers
- Optimize database queries
- Use CDN for static assets

### 2. Mobile App Optimization
- Enable Hermes engine
- Optimize bundle size
- Configure app icons and splash screens
- Enable push notifications

### 3. Web Optimization
- Code splitting
- Image optimization
- Lazy loading
- Service worker caching

## 📋 Post-Deployment Checklist

### Backend
- [ ] API endpoints responding correctly
- [ ] Database connections working
- [ ] Authentication flow working
- [ ] Real-time features working
- [ ] Payment processing working

### Mobile Apps
- [ ] Apps install and launch correctly
- [ ] Authentication working
- [ ] Maps and location services working
- [ ] Push notifications working
- [ ] Payment flows working

### Web Dashboards
- [ ] Dashboards load correctly
- [ ] Authentication working
- [ ] Data visualization working
- [ ] Real-time updates working

## 🆘 Troubleshooting

### Common Issues:
1. **CORS errors**: Update backend CORS configuration
2. **Environment variables**: Check all required variables are set
3. **Database connection**: Verify MongoDB Atlas configuration
4. **API rate limits**: Configure appropriate rate limiting
5. **Mobile app crashes**: Check native module compatibility

### Support Resources:
- Railway Documentation
- Vercel Documentation
- Expo Documentation
- MongoDB Atlas Documentation

## 📞 Production Support

### Monitoring Alerts:
- Set up alerts for API downtime
- Monitor database performance
- Track mobile app crash rates
- Monitor web dashboard performance

### Backup Strategy:
- Daily database backups
- Code repository backups
- Environment variable backups
- SSL certificate backups

---

## 🎯 Next Steps After Deployment

1. **Load Testing**: Test with simulated traffic
2. **Security Audit**: Perform security assessment
3. **Performance Monitoring**: Set up comprehensive monitoring
4. **User Feedback**: Collect and analyze user feedback
5. **Scaling Plan**: Prepare for traffic growth

For detailed platform-specific instructions, refer to the respective platform documentation.
