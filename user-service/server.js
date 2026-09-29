require('dotenv').config();
const dns = require('dns');
try {
  dns.setDefaultResultOrder('ipv4first');
} catch (e) {}

// For Atlas SRV lookup on networks where local ISP/router DNS fails to resolve SRV records
const rawUserMongoUri = process.env.MONGODB_URI || process.env.USER_MONGODB_URI || '';
if (rawUserMongoUri.startsWith('mongodb+srv://') || process.env.CUSTOM_DNS) {
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
