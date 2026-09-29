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

// Lab 8: Prometheus Metrics Collection
const client = require('prom-client');
const register = new client.Registry();
client.collectDefaultMetrics({ register, prefix: 'gateway_' });

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests processed by API Gateway',
  labelNames: ['method', 'route', 'status_code', 'service'],
  registers: [register]
});

const httpRequestDurationSeconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code', 'service'],
  registers: [register],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5]
});

// Request logging & metrics middleware (HTTP method, path, target service, response status, duration)
app.use((req, res, next) => {
  const startTime = process.hrtime();
  res.on('finish', () => {
    const diff = process.hrtime(startTime);
    const durationSeconds = diff[0] + diff[1] / 1e9;
    const serviceEntry = Object.values(config.services).find(s => 
      req.originalUrl === s.pathPrefix || 
      req.originalUrl.startsWith(s.pathPrefix + '/') || 
      req.originalUrl.startsWith(s.pathPrefix + '?')
    );
    const target = serviceEntry ? serviceEntry.serviceId : (req.path === '/health' || req.path === '/metrics' ? 'gateway' : 'unmatched');
    const route = serviceEntry ? serviceEntry.pathPrefix : req.path;

    // Track Prometheus metrics (Lab 8)
    httpRequestsTotal.inc({
      method: req.method,
      route,
      status_code: res.statusCode.toString(),
      service: target
    });
    httpRequestDurationSeconds.observe({
      method: req.method,
      route,
      status_code: res.statusCode.toString(),
      service: target
    }, durationSeconds);

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

// Lab 8: Prometheus Metrics Endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err.message);
  }
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
        console.error(`[Gateway Error] ${req.method} ${req.originalUrl} -> ${service.serviceId} (${service.url}) unreachable: ${err.message} [code: ${err.code || 'UNKNOWN'}]`);
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
