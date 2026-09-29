require('dotenv').config();

/**
 * Normalizes service target URLs:
 * - If protocol is missing (e.g. Render hostport format "campusconnect-user-service:10000"), prepends "http://".
 * - Strips any trailing slashes.
 * - Handles Render platform defaults when RENDER=true.
 */
function formatServiceUrl(inputUrl, defaultUrl) {
  if (!inputUrl || typeof inputUrl !== 'string' || inputUrl.trim() === '') {
    return defaultUrl;
  }
  let url = inputUrl.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = `http://${url}`;
  }
  return url.replace(/\/+$/, '');
}

/**
 * Service Discovery & Upstream Registry Configuration
 * 
 * In accordance with Lab 7 requirements, service target URLs are completely
 * externalized into environment variables. The gateway does not contain
 * hard-coded service URLs inside route handlers.
 */
function loadConfig() {
  const isRender = process.env.RENDER === 'true';
  const defaultUserUrl = isRender ? 'http://campusconnect-user-service:10000' : 'http://localhost:3001';
  const defaultProductUrl = isRender ? 'http://campusconnect-product-service:10000' : 'http://localhost:3002';
  const defaultOrderUrl = isRender ? 'http://campusconnect-order-service:10000' : 'http://localhost:3003';

  return {
    port: parseInt(process.env.PORT || process.env.GATEWAY_PORT || '3000', 10),
    services: {
      user: {
        name: 'User Service',
        serviceId: 'user-service',
        pathPrefix: '/users',
        url: formatServiceUrl(process.env.USER_SERVICE_URL, defaultUserUrl)
      },
      product: {
        name: 'Product Service',
        serviceId: 'product-service',
        pathPrefix: '/products',
        url: formatServiceUrl(process.env.PRODUCT_SERVICE_URL, defaultProductUrl)
      },
      order: {
        name: 'Order Service',
        serviceId: 'order-service',
        pathPrefix: '/orders',
        url: formatServiceUrl(process.env.ORDER_SERVICE_URL, defaultOrderUrl)
      }
    }
  };
}

module.exports = {
  loadConfig,
  formatServiceUrl
};
