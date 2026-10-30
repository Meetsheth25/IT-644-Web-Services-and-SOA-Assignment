/**
 * Lab 9 - Generative AI Microservice Server Bootstrap
 * 
 * Part of CampusConnect Microservices Architecture.
 * Handles operational endpoints (/health, /metrics), Prometheus instrumentation,
 * and mounts the application router under '/api/ai'.
 */

const path = require('path');
const dns = require('dns');
try {
  dns.setDefaultResultOrder('ipv4first');
} catch (e) {}
const dotenv = require('dotenv');

// Explicit dotenv path resolution: checks ai-service/.env first, falls back to root .env
dotenv.config({ path: path.resolve(__dirname, '.env') });
if (!process.env.AI_API_KEY) {
  dotenv.config({ path: path.resolve(__dirname, '../.env') });
}

const express = require('express');
const cors = require('cors');
const aiRoutes = require('./routes/ai.routes');

const PORT = parseInt(process.env.PORT || process.env.AI_SERVICE_PORT || '3004', 10);
const app = express();

// Configurable CORS support
const corsOptions = process.env.CORS_ORIGIN && process.env.CORS_ORIGIN !== '*'
  ? { origin: process.env.CORS_ORIGIN.split(',').map(s => s.trim()) }
  : {};
app.use(cors(corsOptions));
app.use(express.json());

// Prometheus Metrics Instrumentation
const client = require('prom-client');
const register = new client.Registry();
client.collectDefaultMetrics({ register, prefix: 'ai_service_' });

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests processed by AI Service',
  labelNames: ['method', 'route', 'status_code', 'service'],
  registers: [register]
});

const httpRequestDurationSeconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code', 'service'],
  registers: [register],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30]
});

// Metrics & request tracking middleware
app.use((req, res, next) => {
  const startTime = process.hrtime();
  res.on('finish', () => {
    const diff = process.hrtime(startTime);
    const durationSeconds = diff[0] + diff[1] / 1e9;
    const route = req.route ? req.route.path : req.path;

    httpRequestsTotal.inc({
      method: req.method,
      route,
      status_code: res.statusCode.toString(),
      service: 'ai-service'
    });
    httpRequestDurationSeconds.observe({
      method: req.method,
      route,
      status_code: res.statusCode.toString(),
      service: 'ai-service'
    }, durationSeconds);

    console.log(`[AI Service] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${(durationSeconds * 1000).toFixed(1)}ms)`);
  });
  next();
});

// Handle invalid JSON body syntax
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: 'Invalid JSON body syntax.',
      statusCode: 400
    });
  }
  next(err);
});

// Operational Route: Health Check (for Docker & Kubernetes probes)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'ai-service',
    port: PORT,
    model: process.env.AI_MODEL || 'gemini-3.8-flash',
    configured: Boolean(process.env.AI_API_KEY && process.env.AI_API_KEY.trim() !== ''),
    timestamp: new Date().toISOString()
  });
});

// Operational Route: Prometheus Metrics Endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err.message);
  }
});

// Application Routes: Mounted at '/api/ai' to match API Gateway path preservation
app.use('/api/ai', aiRoutes);

// Centralized 404 handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    statusCode: 404
  });
});

// Centralized 500 error handler
app.use((err, req, res, next) => {
  console.error('[AI Service Internal Error]', err);
  if (!res.headersSent) {
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'An unexpected internal error occurred in AI Service',
      statusCode: 500
    });
  }
});

let serverInstance = null;
if (require.main === module) {
  serverInstance = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AI Service] Running at http://0.0.0.0:${PORT} (model: ${process.env.AI_MODEL || 'gemini-3.8-flash'})`);
    console.log(`[AI Service] Health check: http://localhost:${PORT}/health`);
    console.log(`[AI Service] Metrics: http://localhost:${PORT}/metrics`);
    console.log(`[AI Service] Application endpoint: http://localhost:${PORT}/api/ai/generate`);
  });
}

module.exports = { app };

