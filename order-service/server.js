require('dotenv').config();
const dns = require('dns');
try {
  dns.setDefaultResultOrder('ipv4first');
} catch (e) {}

// For Atlas SRV lookup on networks where local ISP/router DNS fails to resolve SRV records
const rawOrderMongoUri = process.env.MONGODB_URI || process.env.ORDER_MONGODB_URI || '';
if (rawOrderMongoUri.startsWith('mongodb+srv://') || process.env.CUSTOM_DNS) {
  try {
    dns.setServers(['8.8.8.8', '8.8.4.4']);
  } catch (e) {}
}

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || process.env.ORDER_SERVICE_PORT || 3003;
const MONGODB_URI = process.env.MONGODB_URI || process.env.ORDER_MONGODB_URI || 'mongodb://localhost:27017/order_db';

const USER_SERVICE_URL = (process.env.USER_SERVICE_URL || 'http://localhost:3001').replace(/\/+$/, '');
const PRODUCT_SERVICE_URL = (process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002').replace(/\/+$/, '');

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

// Order Mongoose Schema
const orderSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  userId: { type: Number, required: true },
  productId: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  status: { type: String, default: 'CONFIRMED' },
  userDetails: {
    name: { type: String },
    email: { type: String }
  },
  productDetails: {
    name: { type: String },
    category: { type: String }
  }
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

const OrderModel = mongoose.model('Order', orderSchema);

// Mongoose Connection
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log(`[Order Service] Connected successfully to MongoDB at ${MONGODB_URI}`);
  })
  .catch((err) => {
    console.error(`[Order Service] MongoDB Connection error: ${err.message}`);
  });

// Inter-Service Communication Helper: Fetch User from User Service
async function fetchUser(userId) {
  const targetUrl = `${USER_SERVICE_URL}/users/${userId}`;
  try {
    const response = await fetch(targetUrl, {
      signal: AbortSignal.timeout(3500)
    });

    if (response.status === 200) {
      const user = await response.json();
      return { success: true, user };
    }

    if (response.status === 404) {
      return {
        success: false,
        status: 404,
        error: 'Not Found',
        message: `Referenced User with ID ${userId} not found in User Service.`
      };
    }

    return {
      success: false,
      status: 503,
      error: 'Service Unavailable',
      message: `User Service returned unexpected HTTP status ${response.status}.`
    };
  } catch (err) {
    console.error(`[Order Service -> User Service Error] ${targetUrl}:`, err.message);
    return {
      success: false,
      status: 503,
      error: 'Service Unavailable',
      message: 'User Service is currently unavailable'
    };
  }
}

// Inter-Service Communication Helper: Fetch Product from Product Service
async function fetchProduct(productId) {
  const targetUrl = `${PRODUCT_SERVICE_URL}/products/${productId}`;
  try {
    const response = await fetch(targetUrl, {
      signal: AbortSignal.timeout(3500)
    });

    if (response.status === 200) {
      const product = await response.json();
      return { success: true, product };
    }

    if (response.status === 404) {
      return {
        success: false,
        status: 404,
        error: 'Not Found',
        message: `Referenced Product with ID ${productId} not found in Product Service.`
      };
    }

    return {
      success: false,
      status: 503,
      error: 'Service Unavailable',
      message: `Product Service returned unexpected HTTP status ${response.status}.`
    };
  } catch (err) {
    console.error(`[Order Service -> Product Service Error] ${targetUrl}:`, err.message);
    return {
      success: false,
      status: 503,
      error: 'Service Unavailable',
      message: 'Product Service is currently unavailable'
    };
  }
}

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'order-service',
    port: PORT,
    dependencies: {
      userServiceUrl: USER_SERVICE_URL,
      productServiceUrl: PRODUCT_SERVICE_URL
    },
    timestamp: new Date().toISOString()
  });
});

// GET /orders - Retrieve all orders
app.get('/orders', async (req, res, next) => {
  try {
    const orders = await OrderModel.find({}, '-_id -__v -createdAt -updatedAt').sort({ id: 1 });
    return res.status(200).json(orders);
  } catch (err) {
    next(err);
  }
});

// GET /orders/:id - Retrieve order by ID
app.get('/orders/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Order ID must be a valid integer'
      });
    }

    const order = await OrderModel.findOne({ id }, '-_id -__v -createdAt -updatedAt');
    if (!order) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Order with ID ${id} not found`
      });
    }
    return res.status(200).json(order);
  } catch (err) {
    next(err);
  }
});

// POST /orders - Create new order (with User & Product verification)
app.post('/orders', async (req, res, next) => {
  try {
    const { userId, productId, quantity } = req.body;

    // 1. Validate request body
    const errors = [];
    if (userId === undefined || userId === null || typeof userId !== 'number' || !Number.isInteger(userId) || userId <= 0) {
      errors.push('userId is required and must be a positive integer.');
    }
    if (productId === undefined || productId === null || typeof productId !== 'number' || !Number.isInteger(productId) || productId <= 0) {
      errors.push('productId is required and must be a positive integer.');
    }
    if (quantity === undefined || quantity === null || typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity <= 0) {
      errors.push('quantity is required and must be a positive integer.');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        message: errors.join(' ')
      });
    }

    // 2. Validate User via REST call to User Service
    const userResult = await fetchUser(userId);
    if (!userResult.success) {
      return res.status(userResult.status).json({
        error: userResult.error,
        message: userResult.message
      });
    }

    // 3. Validate Product via REST call to Product Service
    const productResult = await fetchProduct(productId);
    if (!productResult.success) {
      return res.status(productResult.status).json({
        error: productResult.error,
        message: productResult.message
      });
    }

    const user = userResult.user;
    const product = productResult.product;

    // Check stock availability if stock is tracked
    if (product.stock !== undefined && product.stock < quantity) {
      return res.status(400).json({
        error: 'Validation failed',
        message: `Insufficient product stock. Available: ${product.stock}, Requested: ${quantity}`
      });
    }

    const unitPrice = product.price;
    const totalPrice = Number((unitPrice * quantity).toFixed(2));

    // 4. Generate next numeric ID
    const maxOrder = await OrderModel.findOne().sort({ id: -1 });
    const newId = maxOrder ? maxOrder.id + 1 : 1;

    // 5. Store in Order Service's own database
    const newOrderDoc = new OrderModel({
      id: newId,
      userId: user.id,
      productId: product.id,
      quantity,
      unitPrice,
      totalPrice,
      status: 'CONFIRMED',
      userDetails: {
        name: user.name,
        email: user.email
      },
      productDetails: {
        name: product.name,
        category: product.category
      }
    });

    const savedOrder = await newOrderDoc.save();
    return res.status(201).json(savedOrder.toJSON());
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
  console.error('[Order Service Error]:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected server error occurred in Order Service'
  });
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Order Service] Running at http://0.0.0.0:${PORT} (accessible via http://localhost:${PORT})`);
  console.log(`[Order Service] Configured User Service URL: ${USER_SERVICE_URL}`);
  console.log(`[Order Service] Configured Product Service URL: ${PRODUCT_SERVICE_URL}`);
});
