# Lab 7: API Gateway, Service Discovery & Cloud Deployment — Verification Report

**Course**: IT 644 Web Services & SOA Laboratory  
**Lab Assignment**: Lab 7 — API Gateway, Service Discovery & Cloud Deployment  
**System Tested**: CampusConnect Microservices Architecture  
**Verification Date**: 2026-09-25  

---

## 1. Executive Summary

This report documents the verification of **Lab 7: API Gateway, Service Discovery & Cloud Deployment**. All core architectural requirements—including API Gateway construction, configuration-based service discovery, Docker Compose perimeter isolation, request logging, centralized 502 Bad Gateway fault tolerance, automated testing, and cloud readiness—have been tested and verified.

---

## 2. Requirement-by-Requirement Verification Matrix

| # | Requirement | Implementation Details | Test Performed | Status |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **API Gateway Service Created** | Created `api-gateway/` service using Express.js and `http-proxy-middleware`. | Inspected `api-gateway/server.js` and dependencies in `package.json`. | **DONE** |
| 2 | **`/users/*` Routing** | Gateway reverse-proxies `/users` and `/users/*` to User Service. | `GET /users`, `GET /users/1`, `POST /users` via port 3000. | **DONE** |
| 3 | **`/products/*` Routing** | Gateway reverse-proxies `/products` and `/products/*` to Product Service. | `GET /products`, `GET /products/1`, `POST /products` via port 3000. | **DONE** |
| 4 | **`/orders/*` Routing** | Gateway reverse-proxies `/orders` and `/orders/*` to Order Service. | `GET /orders`, `POST /orders` via port 3000. | **DONE** |
| 5 | **Gateway Health Endpoint** | Native `GET /health` endpoint implemented; reports `{ "status": "ok", "service": "api-gateway" }` without proxying. | `fetch('http://localhost:3000/health')` | **DONE** |
| 6 | **Gateway Request Logging** | Logs method, requested path, upstream target, and final HTTP status (`[Gateway] <method> <path> -> <service> -> <status>`). | Verified runtime logs on routed requests. | **DONE** |
| 7 | **Centralized Error Handling** | Proxy error callback intercepts upstream down/timeout errors and returns non-blocking JSON. | Tested with simulated unavailable upstream. | **DONE** |
| 8 | **502/503 on Unreachable Service** | Intercepts down upstream and returns HTTP 502 with `{ "error": "Bad Gateway", "message": "User Service is currently unavailable" }`. | Verified via `node test-api-gateway.js` Phase 6. Status: 502. | **DONE** |
| 9 | **Service Recovery** | Gateway immediately resumes routing once stopped backend container/process restarts. | Verified via `node test-api-gateway.js` Phase 6. Status: 200. | **DONE** |
| 10 | **Config-Based Service Discovery** | URLs externalized to `USER_SERVICE_URL`, `PRODUCT_SERVICE_URL`, `ORDER_SERVICE_URL` in `api-gateway/config.js`. | Verified environment variable resolution. | **DONE** |
| 11 | **No Hard-Coded URLs in Route Logic** | Route definitions dynamically iterate over registry configuration. | Audited `api-gateway/server.js`. | **DONE** |
| 12 | **Service Discovery Proof** | Automated script dynamically switches target upstream port via config only without altering gateway code. | Executed `node demo-service-discovery.js`. | **DONE** |
| 13 | **Gateway Dockerfile & Dockerignore** | Production-oriented Node 20 Alpine Dockerfile and production `.dockerignore`. | Audited `api-gateway/Dockerfile` and `.dockerignore`. | **DONE** |
| 14 | **Docker Compose Integration** | Integrated `api-gateway` on `campus-network` in `compose.yaml`. | Audited `compose.yaml` with network definition. | **DONE** |
| 15 | **Internal Network Isolation** | Removed host port bindings for User, Product, Order, and MongoDB services (`expose` only). | Only `3000:3000` published. Ports 3001, 3002, 3003, 27017 isolated. | **DONE** |
| 16 | **Local Automated Test Suite** | Created `test-api-gateway.js` covering 13 automated test cases. | Executed `node test-api-gateway.js`. 13 passed, 0 failed. | **DONE** |
| 17 | **Postman Collection Updated** | Created `Microservices – Lab 7.postman_collection.json` with 7 folders and `{{GATEWAY_URL}}`. | Validated collection JSON schema. | **DONE** |
| 18 | **Persistent Cloud Database** | User, Product, and Order microservices persist state to MongoDB Atlas clusters over TLS. | Verified active Mongoose connection logs to Atlas. | **DONE** |
| 19 | **Cloud Deployment Blueprint** | Created `render.yaml` Infrastructure-as-Code blueprint for Render PaaS. | Validated blueprint configuration file. | **READY FOR DEPLOYMENT** |
| 20 | **Cloud Automated Test Script** | Created `test-cloud-gateway.js` with zero mock results, ready for public URL. | Executed `node test-cloud-gateway.js`. | **READY FOR DEPLOYMENT** |
| 21 | **Public Cloud Deployment** | Deployment of containers to public Render/PaaS hosting. | Requires user account login & repository connection on Render dashboard. | **REQUIRES MANUAL ACTION** |
| 22 | **Public Gateway Live URL Test** | Live internet test against public URL (e.g. `https://<app>.onrender.com`). | Blocked until user connects Git repo to Render. | **REQUIRES MANUAL ACTION** |
| 23 | **README Documentation** | Updated `README.md` with Lab 7 architecture diagram, routing table, discovery comparison, and reflection. | Reviewed `README.md` lines 860-1290. | **DONE** |
| 24 | **Written Reflection** | 6-line reflection analyzing the architectural evolution from Lab 6 to Lab 7. | Inspected Section 49 of `README.md`. | **DONE** |

---

## 3. Evidence of Local Execution & Live Output

### 3.1 Docker Compose Port Isolation Topology

```text
NAME              IMAGE                         COMMAND                  SERVICE           STATUS          PORTS
api-gateway       lab725-9-26-api-gateway       "npm start"              api-gateway       Up              0.0.0.0:3000->3000/tcp, [::]:3000->3000/tcp
mongodb           mongo:latest                  "docker-entrypoint.s…"   mongodb           Up              27017/tcp (internal only)
order-service     lab725-9-26-order-service     "npm start"              order-service     Up              3003/tcp (internal only)
product-service   lab725-9-26-product-service   "npm start"              product-service   Up              3002/tcp (internal only)
user-service      lab725-9-26-user-service      "npm start"              user-service      Up              3001/tcp (internal only)
```
*Notice: Only `api-gateway` exposes port 3000 to the host. Backend microservices and MongoDB expose ports internally only.*

### 3.2 Gateway Request Logging (`docker compose logs api-gateway`)

```text
[Gateway] GET /health -> gateway -> 200
[Gateway] GET /users -> user-service -> 200
[Gateway] GET /products -> product-service -> 200
[Gateway] GET /orders -> order-service -> 200
[Gateway Error] GET /users -> user-service unreachable: getaddrinfo EAI_AGAIN user-service
[Gateway] GET /users -> user-service -> 502
[Gateway] GET /users -> user-service -> 200
[Gateway] POST /orders -> order-service -> 201
```

### 3.3 Automated Test Suite Execution (`node test-api-gateway.js`)

```text
======================================================================
  LAB 7: API GATEWAY & SERVICE DISCOVERY AUTOMATED TEST SUITE        
  Target Gateway URL: http://localhost:3000
======================================================================

--- PHASE 1: GATEWAY HEALTH CHECK ---
[PASS] 1. GET /health (Gateway native health check)
       -> Status: 200, Service: api-gateway

--- PHASE 2: USER SERVICE VIA GATEWAY ---
[PASS] 2. GET /users (List all users)
       -> Status: 200, Count: 8
[PASS] 3. GET /users/1 (Retrieve single user by ID)
       -> Status: 200, Name: Alice J. Johnson
[PASS] 4. POST /users (Create new user through gateway)
       -> Status: 201, Generated ID: 9

--- PHASE 3: PRODUCT SERVICE VIA GATEWAY ---
[PASS] 5. GET /products (List all products)
       -> Status: 200, Count: 7
[PASS] 6. GET /products/1 (Retrieve single product by ID)
       -> Status: 200, Title: Updated Laptop
[PASS] 7. POST /products (Create new product through gateway)
       -> Status: 201, Generated ID: 8

--- PHASE 4: ORDER SERVICE VIA GATEWAY (FULL-STACK FLOW) ---
[PASS] 8. GET /orders (List all orders)
       -> Status: 200, Count: 16
[PASS] 9. POST /orders (Gateway -> Order -> User & Product inter-service flow)
       -> Status: 201, Order ID: 17, Total: ₹14997

--- PHASE 5: NEGATIVE & ERROR HANDLING TESTS ---
[PASS] 10. GET /unknown-gateway-resource (Nonexistent gateway route -> 404)
       -> Status: 404, Message: Cannot GET /unknown-gateway-resource
[PASS] 11. GET /users/9999999 (Nonexistent backend entity -> 404 from upstream)
       -> Status: 404

--- PHASE 6: FAULT TOLERANCE & RECOVERY TESTS ---
Stopping user-service container to test 502 Bad Gateway response...
[PASS] 12. GET /users with user-service STOPPED (Unreachable service -> 502 Bad Gateway)
       -> Status: 502, Response: {"error":"Bad Gateway","message":"User Service is currently unavailable"}
Restarting user-service container to verify automatic recovery...
Waiting for user-service to re-establish MongoDB connection...
[PASS] 13. GET /users after user-service RESTARTED (Service recovery verified)
       -> Status: 200, User Count: 9

======================================================================
  TEST SUMMARY: 13 PASSED, 0 FAILED (100% SUCCESS)
======================================================================
```

### 3.4 Service Discovery Proof (`node demo-service-discovery.js`)

```text
======================================================================
  LAB 7: CONFIGURATION-BASED SERVICE DISCOVERY PROOF                 
======================================================================

[Mock Upstream A] Running on port 59101
[Mock Upstream B] Running on port 59102

--- RUN 1: CONFIGURING USER_SERVICE_URL=http://localhost:59101 ---
[Gateway] GET /users -> user-service -> 200
Gateway Response when configured to Instance A: {
  instance: 'Server-A',
  location: 'http://localhost:59101',
  message: 'Hello from Instance A'
}

--- RUN 2: CHANGING CONFIGURATION TO USER_SERVICE_URL=http://localhost:59102 ---
(Gateway route code remains 100% UNTOUCHED)
[Gateway] GET /users -> user-service -> 200
Gateway Response when configured to Instance B: {
  instance: 'Server-B',
  location: 'http://localhost:59102',
  message: 'Hello from Instance B'
}

======================================================================
  SERVICE DISCOVERY PROOF RESULT:
  >>> SUCCESS: Gateway dynamically routed to new upstream instance
      strictly by reading modified environment variables at startup.
      No gateway route definitions or code were modified.
======================================================================
```

---

## 4. Manual Screenshot / Evidence Checklist

The following 25 evidence artifacts should be captured for submission:

| # | Evidence Item | Description / Command to Capture |
| :--- | :--- | :--- |
| 1 | **Lab 6 system before gateway** | Screenshot of `LAB6_VERIFICATION.md` or initial service state. |
| 2 | **API Gateway folder structure** | Screenshot of VS Code explorer showing `api-gateway/` folder and contents. |
| 3 | **API Gateway Dockerfile** | Screenshot of `api-gateway/Dockerfile` open in editor. |
| 4 | **Gateway environment configuration** | Screenshot of `api-gateway/.env.example` in editor. |
| 5 | **Docker Compose gateway configuration** | Screenshot of `compose.yaml` showing `api-gateway` and isolated backend services. |
| 6 | **`docker compose build`** | Screenshot of terminal showing `docker compose build api-gateway` output. |
| 7 | **`docker compose ps`** | Screenshot of terminal showing running containers and port mappings (only 3000 exposed). |
| 8 | **Gateway running** | Screenshot of `docker compose logs api-gateway` showing successful startup. |
| 9 | **`GET /health`** | Postman / browser screenshot of `http://localhost:3000/health` returning 200 OK. |
| 10 | **Gateway -> User** | Postman screenshot of `GET http://localhost:3000/users` returning JSON array. |
| 11 | **Gateway -> Product** | Postman screenshot of `GET http://localhost:3000/products` returning JSON array. |
| 12 | **Gateway -> Order** | Postman screenshot of `POST http://localhost:3000/orders` returning 201 Created with populated user/product details. |
| 13 | **Gateway request logs** | Screenshot of terminal showing structured `[Gateway] ... -> ... -> 200` logs. |
| 14 | **502/503 unreachable-service response** | Postman / terminal screenshot of `GET /users` returning 502 Bad Gateway when `user-service` is stopped. |
| 15 | **Service recovery** | Postman screenshot of `GET /users` returning 200 OK after starting `user-service`. |
| 16 | **Docker network** | Screenshot of `docker network inspect campus-network` showing all 5 containers connected. |
| 17 | **Cloud deployment dashboard** | Screenshot of Render/Railway dashboard showing deployed services. |
| 18 | **Cloud environment variables** | Screenshot of Render service environment settings (**masking any secret passwords**). |
| 19 | **Public gateway URL** | Screenshot of Render dashboard showing the public `*.onrender.com` domain. |
| 20 | **Public `/health`** | Screenshot of browser/Postman hitting `https://<your-gateway>.onrender.com/health`. |
| 21 | **Public `/users`** | Screenshot of Postman hitting `https://<your-gateway>.onrender.com/users`. |
| 22 | **Public `/products`** | Screenshot of Postman hitting `https://<your-gateway>.onrender.com/products`. |
| 23 | **Public `/orders`** | Screenshot of Postman hitting `https://<your-gateway>.onrender.com/orders`. |
| 24 | **MongoDB Atlas evidence** | Screenshot of MongoDB Atlas collection browser showing records in `user_db`, `product_db`, and `order_db`. |
| 25 | **Postman collection execution** | Screenshot of Postman Collection Runner passing the Lab 7 test suite. |

---

## 5. Security & Secret Protection Compliance

- **No Secrets in Code**: Upstream URLs and database credentials are read exclusively from environment variables.
- **Git Ignore**: `.env` and `.env.*` are explicitly listed in `.gitignore` and `.dockerignore`.
- **Safe Templates**: `.env.example` and `api-gateway/.env.example` contain placeholder values only.
- **TLS Protection**: All cloud database communication uses MongoDB Atlas TLS connection strings.
