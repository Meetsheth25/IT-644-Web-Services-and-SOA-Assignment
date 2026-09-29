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
const PORT = process.env.PORT || process.env.PRODUCT_SERVICE_PORT || 3002;
const MONGODB_URI = process.env.MONGODB_URI || process.env.PRODUCT_MONGODB_URI || 'mongodb://localhost:27017/product_db';

const corsOptions = process.env.CORS_ORIGIN && process.env.CORS_ORIGIN !== '*'
  ? { origin: process.env.CORS_ORIGIN.split(',').map(s => s.trim()) }
  : {};
app.use(cors(corsOptions));
app.use(express.json());

// Lab 8: Prometheus Metrics Collection
const client = require('prom-client');
const register = new client.Registry();
client.collectDefaultMetrics({ register, prefix: 'product_service_' });

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests processed by Product Service',
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
      service: 'product-service'
    });
    httpRequestDurationSeconds.observe({
      method: req.method,
      route,
      status_code: res.statusCode.toString(),
      service: 'product-service'
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

// Product Mongoose Schema
const productSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  category: { type: String, required: true, trim: true },
  stock: { type: Number, required: true, min: 0, default: 10 }
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

const ProductModel = mongoose.model('Product', productSchema);

// Mongoose Connection
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log(`[Product Service] Connected successfully to MongoDB at ${MONGODB_URI}`);
  })
  .catch((err) => {
    console.error(`[Product Service] MongoDB Connection error: ${err.message}`);
  });

// Validation helper
function validateProduct(data) {
  const errors = [];
  if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
    errors.push('Product name is required and cannot be empty.');
  }

  if (data.price === undefined || data.price === null || typeof data.price !== 'number' || data.price <= 0) {
    errors.push('Price is required and must be a positive number.');
  }

  if (!data.category || typeof data.category !== 'string' || data.category.trim() === '') {
    errors.push('Category is required and cannot be empty.');
  }

  if (data.stock !== undefined && (typeof data.stock !== 'number' || !Number.isInteger(data.stock) || data.stock < 0)) {
    errors.push('Stock must be a non-negative integer.');
  }

  return errors;
}

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'product-service',
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

// GET /products - Retrieve all products
app.get('/products', async (req, res, next) => {
  try {
    const products = await ProductModel.find({}, '-_id -__v -createdAt -updatedAt').sort({ id: 1 });
    return res.status(200).json(products);
  } catch (err) {
    next(err);
  }
});

// GET /products/:id - Retrieve product by ID
app.get('/products/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Product ID must be a valid integer'
      });
    }

    const product = await ProductModel.findOne({ id }, '-_id -__v -createdAt -updatedAt');
    if (!product) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Product with ID ${id} not found`
      });
    }
    return res.status(200).json(product);
  } catch (err) {
    next(err);
  }
});

// POST /products - Create new product
app.post('/products', async (req, res, next) => {
  try {
    const validationErrors = validateProduct(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        message: validationErrors.join(' ')
      });
    }

    // Generate next numeric ID
    const maxProduct = await ProductModel.findOne().sort({ id: -1 });
    const newId = maxProduct ? maxProduct.id + 1 : 1;

    const newProductDoc = new ProductModel({
      id: newId,
      name: req.body.name.trim(),
      price: req.body.price,
      category: req.body.category.trim(),
      stock: req.body.stock !== undefined ? req.body.stock : 10
    });

    const savedProduct = await newProductDoc.save();
    return res.status(201).json(savedProduct.toJSON());
  } catch (err) {
    next(err);
  }
});

// PUT /products/:id - Update product
app.put('/products/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Product ID must be a valid integer'
      });
    }

    const validationErrors = validateProduct(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        message: validationErrors.join(' ')
      });
    }

    const product = await ProductModel.findOne({ id });
    if (!product) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Product with ID ${id} not found`
      });
    }

    product.name = req.body.name.trim();
    product.price = req.body.price;
    product.category = req.body.category.trim();
    if (req.body.stock !== undefined) product.stock = req.body.stock;

    const updatedProduct = await product.save();
    return res.status(200).json(updatedProduct.toJSON());
  } catch (err) {
    next(err);
  }
});

// DELETE /products/:id - Delete product
app.delete('/products/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Product ID must be a valid integer'
      });
    }

    const deletedProduct = await ProductModel.findOneAndDelete({ id });
    if (!deletedProduct) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Product with ID ${id} not found`
      });
    }
    return res.status(200).json({ message: `Product with ID ${id} deleted successfully` });
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
  console.error('[Product Service Error]:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected server error occurred in Product Service'
  });
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Product Service] Running at http://0.0.0.0:${PORT} (accessible via http://localhost:${PORT})`);
});
