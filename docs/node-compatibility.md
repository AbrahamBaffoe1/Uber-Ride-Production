# Node.js Compatibility Guide

This document provides information about Node.js compatibility for the Okada Transportation project, with special attention to newer Node.js versions (v22+).

## Supported Node.js Versions

The Okada Transportation app has been tested with the following Node.js versions:

- Node.js v14.x (Initial development target)
- Node.js v16.x
- Node.js v18.x
- Node.js v20.x
- Node.js v22.x (with compatibility fixes)

## Using Node.js v22

If you're using Node.js v22.12.0 or later, some important compatibility fixes have been applied to the codebase:

1. **Sequelize DataTypes Passing**: Model initialization in `models/index.js` has been updated to properly pass the DataTypes parameter to model definitions, fixing "Cannot read properties of undefined (reading 'UUID')" errors.

2. **Proper Error Handling**: Error messages have been made more descriptive to accommodate changes in error handling in Node.js v22.

## Node Version Management

It's recommended to use a Node version manager like `nvm` (Node Version Manager) to easily switch between different Node.js versions.

### Installing nvm

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash

# Install and use specific Node.js version
nvm install 22
nvm use 22
```

## Troubleshooting Common Node.js v22 Issues

If you encounter issues with Node.js v22:

### Sequelize DataTypes Issues

Error messages like:
```
TypeError: Cannot read properties of undefined (reading 'UUID')
```

**Solution**: The fix has been applied to the codebase in `models/index.js`. If you're still seeing this error, make sure you have the latest code version.

### Node Module Issues

If you encounter issues with missing modules:

1. Clear npm cache: `npm cache clean --force`
2. Delete node_modules: `rm -rf node_modules`
3. Reinstall dependencies: `npm install`

## Node.js Version-Specific Features

When developing new features for this project:

1. Avoid using features exclusive to the latest Node.js version to maintain backward compatibility
2. If using newer features, document them here and provide fallbacks where possible
3. Consider polyfills for important newer JavaScript features to maintain compatibility across Node.js versions
