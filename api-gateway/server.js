require('dotenv').config();
const dns = require('dns');
try {
  dns.setDefaultResultOrder('ipv4first');
} catch (e) {}

const express = require('express');
const cors = require('cors');
const { createProxyMiddleware, fixRequestBody } = require('http-proxy-middleware');
const { loadConfig } = require('./config');

const config = loadConfig();
const app = express();

// Configurable CORS support (Part 15)
const corsOptions = process.env.CORS_ORIGIN && process.env.CORS_ORIGIN !== '*'
  ? { origin: process.env.CORS_ORIGIN.split(',').map(s => s.trim()) }
  : {};
app.use(cors(corsOptions));

// Request logging middleware (Part C: HTTP method, requested path, target service, response status)
app.use((req, res, next) => {
  res.on('finish', () => {
    const serviceEntry = Object.values(config.services).find(s => 
      req.originalUrl === s.pathPrefix || 
      req.originalUrl.startsWith(s.pathPrefix + '/') || 
      req.originalUrl.startsWith(s.pathPrefix + '?')
    );
    const target = serviceEntry ? serviceEntry.serviceId : 'gateway';
    console.log(`[Gateway] ${req.method} ${req.originalUrl} -> ${target} -> ${res.statusCode}`);
  });
  next();
});

// Part F: Gateway Health Check (Not proxied to any service)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'api-gateway',
    timestamp: new Date().toISOString()
  });
});

// Factory for proxying requests with centralized error handling (Part D)
function createServiceProxy(service) {
  return createProxyMiddleware({
    target: service.url,
    changeOrigin: true,
    pathFilter: (pathname) => pathname === service.pathPrefix || pathname.startsWith(service.pathPrefix + '/'),
    on: {
      proxyReq: fixRequestBody,
      error: (err, req, res) => {
        console.error(`[Gateway Error] ${req.method} ${req.originalUrl} -> ${service.serviceId} unreachable: ${err.message}`);
        if (!res.headersSent) {
          const isTimeout = err.code === 'ETIMEDOUT' || err.code === 'ESOCKETTIMEDOUT';
          const statusCode = isTimeout ? 503 : 502;
          const errorName = isTimeout ? 'Service Unavailable' : 'Bad Gateway';
          res.status(statusCode).json({
            error: errorName,
            message: `${service.name} is currently unavailable`
          });
        }
      }
    }
  });
}

// Part A & B: Configuration-based routing table
Object.values(config.services).forEach((service) => {
  console.log(`[Service Discovery] Registered route: ${service.pathPrefix}/* -> ${service.url} (${service.name})`);
  app.use(createServiceProxy(service));
});

// Centralized 404 handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Centralized 500 handler
app.use((err, req, res, next) => {
  console.error('[Gateway Internal Error]', err);
  if (!res.headersSent) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: err.message || 'An unexpected error occurred in API Gateway'
    });
  }
});

let serverInstance = null;
if (require.main === module) {
  serverInstance = app.listen(config.port, '0.0.0.0', () => {
    console.log(`[API Gateway] Listening on http://0.0.0.0:${config.port}`);
    console.log(`[API Gateway] Health Check: http://localhost:${config.port}/health`);
    console.log(`[API Gateway] Service Registry:`, JSON.stringify(config.services, null, 2));
  });
}

module.exports = { app, loadConfig };
