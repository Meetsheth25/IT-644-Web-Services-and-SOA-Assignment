require('dotenv').config();

/**
 * Service Discovery & Upstream Registry Configuration
 * 
 * In accordance with Lab 7 requirements, service target URLs are completely
 * externalized into environment variables. The gateway does not contain
 * hard-coded service URLs inside route handlers.
 */
function loadConfig() {
  return {
    port: parseInt(process.env.PORT || process.env.GATEWAY_PORT || '3000', 10),
    services: {
      user: {
        name: 'User Service',
        serviceId: 'user-service',
        pathPrefix: '/users',
        url: process.env.USER_SERVICE_URL || 'http://localhost:3001'
      },
      product: {
        name: 'Product Service',
        serviceId: 'product-service',
        pathPrefix: '/products',
        url: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002'
      },
      order: {
        name: 'Order Service',
        serviceId: 'order-service',
        pathPrefix: '/orders',
        url: process.env.ORDER_SERVICE_URL || 'http://localhost:3003'
      }
    }
  };
}

module.exports = {
  loadConfig
};
