require('dotenv').config();
const dns = require('dns');
try {
  dns.setDefaultResultOrder('ipv4first');
} catch (e) {}

// For Atlas SRV lookup on local networks where local ISP/router DNS fails to resolve SRV records
// Guarded so it never overrides container DNS on Docker or Render private networks
if (process.env.CUSTOM_DNS === 'true') {
  try {
    dns.setServers(['8.8.8.8', '8.8.4.4']);
  } catch (e) {}
}

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || process.env.USER_SERVICE_PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || process.env.USER_MONGODB_URI || 'mongodb://localhost:27017/user_db';

const corsOptions = process.env.CORS_ORIGIN && process.env.CORS_ORIGIN !== '*'
  ? { origin: process.env.CORS_ORIGIN.split(',').map(s => s.trim()) }
  : {};
app.use(cors(corsOptions));
app.use(express.json());

// Lab 8: Prometheus Metrics Collection
const client = require('prom-client');
const register = new client.Registry();
client.collectDefaultMetrics({ register, prefix: 'user_service_' });

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests processed by User Service',
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
      service: 'user-service'
    });
    httpRequestDurationSeconds.observe({
      method: req.method,
      route,
      status_code: res.statusCode.toString(),
      service: 'user-service'
    }, durationSeconds);
  });
  next();
});

// Handle invalid JSON body syntax
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'Invalid JSON body syntax'
    });
  }
  next(err);
});

// User Mongoose Schema
const userSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  role: { type: String, default: 'Student', trim: true },
  department: { type: String, default: 'Computer Science', trim: true }
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      delete ret._id;
      delete ret.__v;
      delete ret.createdAt;
      delete ret.updatedAt;
      return ret;
    }
  }
});

const UserModel = mongoose.model('User', userSchema);

// Mongoose Connection
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log(`[User Service] Connected successfully to MongoDB at ${MONGODB_URI}`);
  })
  .catch((err) => {
    console.error(`[User Service] MongoDB Connection error: ${err.message}`);
  });

// Validation helper
function validateUser(data) {
  const errors = [];
  if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
    errors.push('Name is required and cannot be empty.');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!data.email || typeof data.email !== 'string' || !emailRegex.test(data.email.trim())) {
    errors.push('A valid email address is required.');
  }

  return errors;
}

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'user-service',
    port: PORT,
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

// GET /users - Retrieve all users
app.get('/users', async (req, res, next) => {
  try {
    const users = await UserModel.find({}, '-_id -__v -createdAt -updatedAt').sort({ id: 1 });
    return res.status(200).json(users);
  } catch (err) {
    next(err);
  }
});

// GET /users/:id - Retrieve user by ID
app.get('/users/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'User ID must be a valid integer'
      });
    }

    const user = await UserModel.findOne({ id }, '-_id -__v -createdAt -updatedAt');
    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: `User with ID ${id} not found`
      });
    }
    return res.status(200).json(user);
  } catch (err) {
    next(err);
  }
});

// POST /users - Create new user
app.post('/users', async (req, res, next) => {
  try {
    const validationErrors = validateUser(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        message: validationErrors.join(' ')
      });
    }

    const emailTrimmed = req.body.email.trim().toLowerCase();

    // Check for duplicate email
    const existingEmail = await UserModel.findOne({ email: emailTrimmed });
    if (existingEmail) {
      return res.status(400).json({
        error: 'Validation failed',
        message: `Email address '${emailTrimmed}' is already registered.`
      });
    }

    // Generate next numeric ID
    const maxUser = await UserModel.findOne().sort({ id: -1 });
    const newId = maxUser ? maxUser.id + 1 : 1;

    const newUserDoc = new UserModel({
      id: newId,
      name: req.body.name.trim(),
      email: emailTrimmed,
      role: req.body.role ? req.body.role.trim() : 'Student',
      department: req.body.department ? req.body.department.trim() : 'Computer Science'
    });

    const savedUser = await newUserDoc.save();
    return res.status(201).json(savedUser.toJSON());
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Duplicate key error: email address already exists in database.'
      });
    }
    next(err);
  }
});

// PUT /users/:id - Update user
app.put('/users/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'User ID must be a valid integer'
      });
    }

    const validationErrors = validateUser(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        message: validationErrors.join(' ')
      });
    }

    const emailTrimmed = req.body.email.trim().toLowerCase();

    const user = await UserModel.findOne({ id });
    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: `User with ID ${id} not found`
      });
    }

    // Check unique email conflict
    const duplicateEmail = await UserModel.findOne({ email: emailTrimmed, id: { $ne: id } });
    if (duplicateEmail) {
      return res.status(400).json({
        error: 'Validation failed',
        message: `Email address '${emailTrimmed}' is already in use by another user.`
      });
    }

    user.name = req.body.name.trim();
    user.email = emailTrimmed;
    if (req.body.role) user.role = req.body.role.trim();
    if (req.body.department) user.department = req.body.department.trim();

    const updatedUser = await user.save();
    return res.status(200).json(updatedUser.toJSON());
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Duplicate key error: email address already exists in database.'
      });
    }
    next(err);
  }
});

// DELETE /users/:id - Delete user
app.delete('/users/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'User ID must be a valid integer'
      });
    }

    const deletedUser = await UserModel.findOneAndDelete({ id });
    if (!deletedUser) {
      return res.status(404).json({
        error: 'Not Found',
        message: `User with ID ${id} not found`
      });
    }
    return res.status(200).json({ message: `User with ID ${id} deleted successfully` });
  } catch (err) {
    next(err);
  }
});

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// 500 Error Handler
app.use((err, req, res, next) => {
  console.error('[User Service Error]:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected server error occurred in User Service'
  });
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[User Service] Running at http://0.0.0.0:${PORT} (accessible via http://localhost:${PORT})`);
});
