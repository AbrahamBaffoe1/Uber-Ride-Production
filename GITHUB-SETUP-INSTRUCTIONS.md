# GitHub Repository Setup Instructions

Follow these steps to create a GitHub repository and push your Okada Transportation Solution code.

## 🚀 Step 1: Create GitHub Repository

### Option A: Using GitHub Web Interface (Recommended)
1. Go to [GitHub.com](https://github.com) and sign in
2. Click the "+" icon in the top right corner
3. Select "New repository"
4. Fill in the repository details:
   - **Repository name**: `okada-transportation`
   - **Description**: `Complete ride-hailing platform for motorcycle taxis with mobile apps, web dashboards, and backend API`
   - **Visibility**: Choose Public or Private
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
5. Click "Create repository"

### Option B: Using GitHub CLI (if you have it installed)
```bash
gh repo create okada-transportation --public --description "Complete ride-hailing platform for motorcycle taxis"
```

## 🔗 Step 2: Connect Local Repository to GitHub

After creating the repository, GitHub will show you the setup instructions. Use these commands:

```bash
# Add the remote origin (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/okada-transportation.git

# Verify the remote was added correctly
git remote -v

# Push your code to GitHub
git push -u origin main
```

## 📋 Step 3: Verify Upload

1. Refresh your GitHub repository page
2. You should see all your project files
3. Verify the README.md displays correctly
4. Check that sensitive files (.env) are not visible (they should be ignored by .gitignore)

## 🔧 Step 4: Repository Settings (Optional but Recommended)

### Enable GitHub Pages (for documentation)
1. Go to repository Settings
2. Scroll to "Pages" section
3. Select source: "Deploy from a branch"
4. Choose "main" branch and "/ (root)" folder
5. Your documentation will be available at: `https://yourusername.github.io/okada-transportation`

### Add Repository Topics
1. Go to repository main page
2. Click the gear icon next to "About"
3. Add topics: `react-native`, `nodejs`, `mongodb`, `ride-hailing`, `transportation`, `mobile-app`, `expo`

### Set up Branch Protection (for team collaboration)
1. Go to Settings → Branches
2. Add rule for `main` branch
3. Enable "Require pull request reviews before merging"
4. Enable "Require status checks to pass before merging"

## 🚀 Step 5: Set up GitHub Actions (Optional)

Create `.github/workflows/ci.yml` for automated testing:

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: backend/package-lock.json
    - name: Install dependencies
      run: cd backend && npm ci
    - name: Run tests
      run: cd backend && npm test
    - name: Run linter
      run: cd backend && npm run lint

  test-mobile-apps:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        app: [passenger-app, rider-app]
    steps:
    - uses: actions/checkout@v3
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    - name: Install dependencies
      run: cd mobile/${{ matrix.app }}/OkadaPassengerApp && npm ci
    - name: Run tests
      run: cd mobile/${{ matrix.app }}/OkadaPassengerApp && npm test
```

## 📱 Step 6: Mobile App Repository Links

For mobile app deployment, you'll need to link your GitHub repository:

### Expo/EAS Build Setup
```bash
# In each mobile app directory
cd mobile/passenger-app/OkadaPassengerApp
eas build:configure

cd ../../../mobile/rider-app/OkadaRiderApp  
eas build:configure
```

## 🌐 Step 7: Web Dashboard Deployment

### Vercel Deployment
1. Go to [Vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Configure build settings:
   - **Framework Preset**: React
   - **Root Directory**: `web/admin-dashboard` (for admin dashboard)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### Netlify Deployment
1. Go to [Netlify.com](https://netlify.com)
2. Click "New site from Git"
3. Choose GitHub and select your repository
4. Configure build settings:
   - **Base directory**: `web/admin-dashboard`
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`

## 🔧 Step 8: Backend Deployment

### Railway Deployment
1. Go to [Railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository
5. Set root directory to `backend`
6. Configure environment variables in Railway dashboard

### Heroku Deployment
```bash
# Install Heroku CLI and login
heroku login

# Create Heroku app
heroku create okada-transportation-api

# Set buildpack for Node.js in subdirectory
heroku buildpacks:set https://github.com/timanovsky/subdir-heroku-buildpack
heroku config:set PROJECT_PATH=backend

# Add Node.js buildpack
heroku buildpacks:add heroku/nodejs

# Deploy
git push heroku main
```

## 📊 Step 9: Set up Monitoring

### GitHub Repository Insights
1. Enable "Insights" tab in repository settings
2. Monitor code frequency, contributors, and traffic
3. Set up security alerts for dependencies

### Repository Badges (Optional)
Add badges to your README.md:
```markdown
![GitHub stars](https://img.shields.io/github/stars/yourusername/okada-transportation)
![GitHub forks](https://img.shields.io/github/forks/yourusername/okada-transportation)
![GitHub issues](https://img.shields.io/github/issues/yourusername/okada-transportation)
![GitHub license](https://img.shields.io/github/license/yourusername/okada-transportation)
```

## 🔐 Step 10: Security Setup

### Secrets Management
1. Go to repository Settings → Secrets and variables → Actions
2. Add secrets for:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `TWILIO_AUTH_TOKEN`
   - `GOOGLE_MAPS_API_KEY`
   - `AWS_SECRET_ACCESS_KEY`

### Dependabot Alerts
1. Go to Settings → Security & analysis
2. Enable "Dependency graph"
3. Enable "Dependabot alerts"
4. Enable "Dependabot security updates"

## ✅ Verification Checklist

- [ ] Repository created successfully
- [ ] All code pushed to GitHub
- [ ] README.md displays correctly
- [ ] .gitignore working (no .env files visible)
- [ ] Repository topics added
- [ ] Branch protection rules set (if needed)
- [ ] GitHub Actions configured (optional)
- [ ] Deployment platforms connected
- [ ] Environment variables configured
- [ ] Security features enabled

## 🆘 Troubleshooting

### Common Issues:

1. **Authentication Error**
   ```bash
   # Use personal access token instead of password
   git remote set-url origin https://YOUR_TOKEN@github.com/YOUR_USERNAME/okada-transportation.git
   ```

2. **Large File Error**
   ```bash
   # Remove large files and use Git LFS
   git lfs track "*.zip"
   git lfs track "*.apk"
   ```

3. **Permission Denied**
   ```bash
   # Check SSH key setup
   ssh -T git@github.com
   ```

## 🎯 Next Steps

1. **Share Repository**: Send the GitHub URL to team members
2. **Set up Collaborators**: Add team members with appropriate permissions
3. **Create Issues**: Set up issue templates for bug reports and feature requests
4. **Documentation**: Keep README and documentation updated
5. **Releases**: Create releases for major versions

---

**Repository URL Format**: `https://github.com/YOUR_USERNAME/okada-transportation`

Replace `YOUR_USERNAME` with your actual GitHub username in all commands and URLs.
