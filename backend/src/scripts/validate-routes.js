#!/usr/bin/env node

/**
 * Route Validator Script
 * Scans all route files to identify potential errors with middleware and controllers
 */

const fs = require('fs');
const path = require('path');

// Color for terminal output
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[36m';
const RESET = '\x1b[0m';

// Routes directory
const ROUTES_DIR = path.join(__dirname, '../api/v1/routes');
const CONTROLLERS_DIR = path.join(__dirname, '../api/v1/controllers');

// Patterns to match in route files
const PATTERNS = {
  UNDEFINED_CONTROLLER: /controller\.[a-zA-Z0-9_]+/g,
  OLD_MIDDLEWARE: /authMiddleware\./g,
  ROUTER_METHOD: /router\.(get|post|put|patch|delete)\(/g
};

// Track validation results
let errors = 0;
let warnings = 0;
let routesChecked = 0;

console.log(`${BLUE}======================================${RESET}`);
console.log(`${BLUE}      ROUTE VALIDATION REPORT        ${RESET}`);
console.log(`${BLUE}======================================${RESET}\n`);

// Get all controller files
const controllerFiles = fs.readdirSync(CONTROLLERS_DIR)
  .filter(file => file.endsWith('.js'));

// Load all controllers to check method existence
const controllerMethods = {};
controllerFiles.forEach(file => {
  const controllerName = file.replace('.js', '');
  try {
    const controller = require(path.join(CONTROLLERS_DIR, file));
    controllerMethods[controllerName] = Object.keys(controller);
  } catch (error) {
    console.log(`${RED}Error loading controller ${controllerName}: ${error.message}${RESET}`);
  }
});

// Get all route files
const routeFiles = fs.readdirSync(ROUTES_DIR)
  .filter(file => file.endsWith('.js') && file !== 'index.js');

// Process each route file
routeFiles.forEach(file => {
  routesChecked++;
  const filePath = path.join(ROUTES_DIR, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const routeName = file.replace('.js', '');
  
  console.log(`${BLUE}Checking ${routeName} routes...${RESET}`);
  
  // Extract controller imports
  const controllerMatch = content.match(/const\s+(\w+)\s+=\s+require\(['"](.*?)['"]\)/g) || [];
  const controllerImport = controllerMatch.find(line => line.includes('controller')) || '';
  const controllerName = controllerImport.match(/const\s+(\w+)\s+=/) 
    ? controllerImport.match(/const\s+(\w+)\s+=/)[1] 
    : '';
  
  const controllerFile = controllerImport.match(/require\(['"](.*?)['"]\)/)
    ? controllerImport.match(/require\(['"](.*?)['"]\)/)[1].split('/').pop() 
    : '';
  
  // Check for authMiddleware usage
  if (PATTERNS.OLD_MIDDLEWARE.test(content)) {
    console.log(`${YELLOW}WARNING: Using old middleware syntax 'authMiddleware' in ${file}${RESET}`);
    warnings++;
  }
  
  // Check for controller methods
  const routeMethods = [];
  const routeMatches = content.match(PATTERNS.ROUTER_METHOD) || [];
  
  routeMatches.forEach(routeMethod => {
    // Find all controller method references
    const methodLine = content.substring(
      content.indexOf(routeMethod),
      content.indexOf(')', content.indexOf(routeMethod)) + 1
    );
    
    // Extract controller method
    const controllerMethodMatch = methodLine.match(/(\w+)\.(\w+)/) || [];
    if (controllerMethodMatch.length >= 3) {
      const controllerRef = controllerMethodMatch[1];
      const methodName = controllerMethodMatch[2];
      
      if (controllerRef === controllerName) {
        routeMethods.push(methodName);
      }
    }
  });
  
  // Validate controller methods exist
  if (controllerFile && controllerFile.endsWith('.js')) {
    const ctrlName = controllerFile.replace('.js', '');
    
    if (controllerMethods[ctrlName]) {
      routeMethods.forEach(method => {
        if (!controllerMethods[ctrlName].includes(method)) {
          console.log(`${RED}ERROR: Method '${method}' not found in ${ctrlName}${RESET}`);
          errors++;
        }
      });
    } else {
      console.log(`${YELLOW}WARNING: Could not validate controller methods for ${ctrlName}${RESET}`);
      warnings++;
    }
  }
});

console.log(`\n${BLUE}======================================${RESET}`);
console.log(`${BLUE}             SUMMARY                 ${RESET}`);
console.log(`${BLUE}======================================${RESET}`);
console.log(`Routes checked: ${routesChecked}`);
console.log(`Errors found: ${errors > 0 ? RED : GREEN}${errors}${RESET}`);
console.log(`Warnings found: ${warnings > 0 ? YELLOW : GREEN}${warnings}${RESET}`);

// Provide recommendations
if (errors > 0 || warnings > 0) {
  console.log(`\n${BLUE}Recommendations:${RESET}`);
  
  if (errors > 0) {
    console.log(`${RED}1. Fix missing controller methods${RESET}`);
    console.log(`   - Add the missing methods to the controller`);
    console.log(`   - Or use ensureControllerMethod() to handle undefined methods`);
  }
  
  if (warnings > 0) {
    console.log(`${YELLOW}2. Update old middleware syntax${RESET}`);
    console.log(`   - Change 'authMiddleware' to 'authenticate'`);
    console.log(`   - Update imports to use { authenticate, hasRole }`);
  }
}

process.exit(errors > 0 ? 1 : 0);
