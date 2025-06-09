#!/usr/bin/env node

/**
 * Custom Metro Server for OkadaRiderApp
 * This server helps establish a reliable connection between
 * React Native clients and the Metro bundler.
 */

const { exec, execSync } = require('child_process');
const os = require('os');
const http = require('http');
const net = require('net');
const path = require('path');
const { URL } = require('url');
const Metro = require('metro');
// Import metroConfig rather than getDefaultConfig to avoid reporter issue
const metroConfig = require('./metro.config');

// Get local IP address using OS module
function getLocalIPAddress() {
  const interfaces = os.networkInterfaces();
  let ipAddress = '127.0.0.1'; // Default fallback
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip over non-IPv4 and internal (loopback) addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        ipAddress = iface.address;
        return ipAddress;
      }
    }
  }
  return ipAddress;
}

// Check if port is in use
function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer()
      .once('error', () => {
        // Port is in use
        resolve(true);
      })
      .once('listening', () => {
        // Port is free, close server
        server.close();
        resolve(false);
      })
      .listen(port);
  });
}

// Find an available port
async function findAvailablePort(startPort) {
  let port = startPort;
  while (await isPortInUse(port)) {
    console.log(`Port ${port} is in use, trying ${port + 1}...`);
    port++;
  }
  return port;
}

// Kill process running on a specific port (useful for Windows)
function killProcessOnPort(port) {
  try {
    if (process.platform === 'win32') {
      // Windows command
      execSync(`FOR /F "tokens=5" %P IN ('netstat -a -n -o ^| findstr :${port}') DO TaskKill /PID %P /F /T`);
    } else {
      // MacOS/Linux command
      execSync(`lsof -i:${port} | grep LISTEN | awk '{print $2}' | xargs kill -9`);
    }
    console.log(`Killed process on port ${port}`);
    return true;
  } catch (e) {
    return false;
  }
}

// Default to localhost unless explicitly overridden
const USE_LOCALHOST = process.env.USE_LOCALHOST !== 'false';
const HOST = USE_LOCALHOST 
  ? 'localhost' 
  : (process.env.IP_ADDRESS || getLocalIPAddress());
// Will attempt to get an available port, starting with the default 8082
let PORT = parseInt(process.env.PORT, 10) || 8082;

// Create a basic server status API endpoint
class StatusServer {
  constructor() {
    this.server = http.createServer(this.handleRequest.bind(this));
    this.port = null;
  }

  handleRequest(req, res) {
    if (req.url === '/status') {
      res.writeHead(200, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' 
      });
      res.end(JSON.stringify({
        status: 'running',
        host: HOST,
        port: PORT,
        localhost_url: `http://localhost:${PORT}`,
        network_url: `http://${getLocalIPAddress()}:${PORT}`,
        status_port: this.port,
        timestamp: new Date().toISOString()
      }));
    } else {
      res.writeHead(404);
      res.end();
    }
  }

  async start(desiredPort) {
    // Find an available port starting from desiredPort
    this.port = await findAvailablePort(desiredPort);
    
    return new Promise((resolve) => {
      // Listen on all interfaces (0.0.0.0) to make it accessible from both
      // localhost and the network
      this.server.listen(this.port, '0.0.0.0', () => {
        console.log(`📊 Status server running at:`);
        console.log(`  Local:   http://localhost:${this.port}/status`);
        console.log(`  Network: http://${getLocalIPAddress()}:${this.port}/status\n`);
        resolve(this.port);
      });
    });
  }

  stop() {
    if (this.server) {
      this.server.close();
    }
  }
}

// Create status server instance
const statusServer = new StatusServer();

async function startMetroServer() {
  console.log(`\n🔄 Starting custom Metro bundler server for OkadaRiderApp...`);
  if (USE_LOCALHOST) {
    console.log(`📱 Using localhost for connections`);
  } else {
    console.log(`📱 Using host: ${HOST}`);
    console.log(`📡 Network IP: ${getLocalIPAddress()}`);
  }
  
  try {
    // Check if port is in use
    if (await isPortInUse(PORT)) {
      console.log(`Port ${PORT} is currently in use.`);
      // Attempt to kill the process
      const killed = killProcessOnPort(PORT);
      if (!killed) {
        // Find another port if we couldn't kill the process
        PORT = await findAvailablePort(PORT + 1);
      }
    }
    
    console.log(`💡 Using port: ${PORT}`);
    
    // Clear Metro cache for fresh start
    console.log('🧹 Clearing Metro cache...');
    try {
      if (process.platform === 'win32') {
        exec('if exist node_modules\\.cache\\metro rmdir /s /q node_modules\\.cache\\metro');
      } else {
        exec('rm -rf node_modules/.cache/metro');
      }
      console.log('✅ Metro cache cleared');
    } catch (error) {
      console.warn('⚠️ Could not clear Metro cache:', error.message);
    }

    // Configure Metro with our loaded config
    const config = metroConfig;
    
    // Update server configuration with our host and port settings
    config.server = {
      ...(config.server || {}),
      port: PORT,
      // Use 0.0.0.0 to listen on all interfaces (both localhost and network)
      host: '0.0.0.0',
      enhanceMiddleware: (middleware) => {
        return (req, res, next) => {
          // Add CORS headers to allow connections from any origin
          res.setHeader('Access-Control-Allow-Origin', '*');
          return middleware(req, res, next);
        };
      }
    };

    // Add Metro reporter
    config.reporter = {
      update: () => {}
    };

    // Start Metro
    const metroBundlerServer = await Metro.runServer(config);
    console.log(`\n🚀 Metro Bundler running at:`);
    console.log(`  Local:   http://localhost:${PORT}`);
    console.log(`  Network: http://${getLocalIPAddress()}:${PORT}`);
    
    // Start the status server on a different port
    await statusServer.start(PORT + 1);

    // Log additional connection instructions
    console.log('\n📋 Connection instructions:');
    console.log('1. For simulators/emulators: Use the Local URL with localhost');
    console.log('2. For physical devices on the same network: Use the Network URL');
    console.log('3. If you experience connection issues:');
    console.log('   - Ensure your device is on the same WiFi network');
    console.log('   - Check firewall settings for port access');
    console.log('   - Try different connection methods in the dev menu\n');
    
    return { 
      metroBundlerServer, 
      localUrl: `http://localhost:${PORT}`,
      networkUrl: `http://${getLocalIPAddress()}:${PORT}`
    };
  } catch (error) {
    console.error('❌ Failed to start Metro bundler:', error);
    
    // Provide more helpful error messages
    if (error.code === 'EADDRINUSE') {
      console.error(`🔴 Port ${PORT} is already in use by another process.`);
      console.error('   Try running with a different port: PORT=8082 npm run server');
    }
    
    process.exit(1);
  }
}

// Handle graceful shutdown for common termination signals
['SIGINT', 'SIGTERM', 'SIGHUP'].forEach(signal => {
  process.on(signal, () => {
    console.log(`\n👋 Received ${signal}, shutting down servers...`);
    statusServer.stop();
    process.exit(0);
  });
});

// Start the server
startMetroServer();
