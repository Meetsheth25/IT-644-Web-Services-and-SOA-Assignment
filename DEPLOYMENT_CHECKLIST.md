# Lab 7: Production & Cloud Deployment Readiness Checklist

This checklist tracks every phase required to transition the CampusConnect Microservices System from local development to production containerized cloud deployment on Render (or alternative PaaS / Kubernetes).

---

## 1. Codebase & Configuration Readiness

- [x] **Git Repository Structure Cleaned**: Source directories (`api-gateway/`, `user-service/`, `product-service/`, `order-service/`) structured cleanly.
- [x] **`.env` Ignored by Version Control**: Root `.gitignore` explicitly ignores `.env` and `.env.*` while preserving `.env.example`.
- [x] **Safe `.env.example` Files Created**:
  - [x] Root `.env.example`
  - [x] `api-gateway/.env.example`
  - [x] `user-service/.env.example`
  - [x] `product-service/.env.example`
  - [x] `order-service/.env.example`
- [x] **Zero Hard-Coded Secrets**: No database passwords, API tokens, or cloud secrets committed in source code, Dockerfiles, or configuration files.
- [x] **Dynamic Cloud Port Compatibility**:
  - [x] `api-gateway`: `process.env.PORT || process.env.GATEWAY_PORT || 3000`
  - [x] `user-service`: `process.env.PORT || process.env.USER_SERVICE_PORT || 3001`
  - [x] `product-service`: `process.env.PORT || process.env.PRODUCT_SERVICE_PORT || 3002`
  - [x] `order-service`: `process.env.PORT || process.env.ORDER_SERVICE_PORT || 3003`
- [x] **Production Host Binding**: All services listen on `0.0.0.0` to permit container and cloud networking (`app.listen(PORT, '0.0.0.0', ...)`).
- [x] **Configurable CORS**: All services support `CORS_ORIGIN` environment variable for production origin restrictions.
- [x] **Configuration-Based Service Discovery**: Gateway route definitions dynamically read `USER_SERVICE_URL`, `PRODUCT_SERVICE_URL`, and `ORDER_SERVICE_URL` without hard-coded route targets.
- [x] **Native Health Endpoints**: All services provide standalone `GET /health` endpoints independent of database connections.

---

## 2. Docker & Containerization Verification

- [x] **Production Dockerfiles Verified**: All 4 Dockerfiles use `node:20-alpine`, implement optimized layer dependency caching, expose appropriate ports, and run production scripts.
- [x] **Perimeter Network Isolation**: `compose.yaml` exposes ONLY port 3000 (API Gateway) to the external host. Backend microservices (`user-service:3001`, `product-service:3002`, `order-service:3003`) reside exclusively on `campus-network`.
- [x] **Docker Compose Health**: `docker compose up -d` boots all 5 containers (`api-gateway`, `user-service`, `product-service`, `order-service`, `mongodb`) with zero exit failures.

---

## 3. Local Verification & Resilience

- [x] **Automated Local Test Suite Passed**: `node test-api-gateway.js` executed with 13/13 tests passing:
  - [x] `GET /health` (200 OK)
  - [x] `GET /users` (200 OK)
  - [x] `GET /users/:id` (200 OK)
  - [x] `POST /users` (201 Created)
  - [x] `GET /products` (200 OK)
  - [x] `GET /products/:id` (200 OK)
  - [x] `POST /products` (201 Created)
  - [x] `GET /orders` (200 OK)
  - [x] `POST /orders` (201 Created - cross-service resolution verified)
  - [x] Nonexistent Gateway Route (404 Not Found)
  - [x] Nonexistent Upstream Resource (404 Not Found)
  - [x] Simulated Service Failure (`docker compose stop user-service` -> 502 Bad Gateway)
  - [x] Automatic Service Recovery (`docker compose start user-service` -> 200 OK)
- [x] **Service Discovery Proof Passed**: `node demo-service-discovery.js` verified configuration-driven target switching without code modification.
- [x] **Postman Collection Ready**: `Microservices – Lab 7.postman_collection.json` parameterizes `{{GATEWAY_URL}}`.

---

## 4. Render Cloud Deployment Steps (User Action Required)

- [x] **Infrastructure-as-Code Validated**: `render.yaml` blueprint prepared with 4 Docker service specifications.
- [ ] **GitHub Repository Initialized & Pushed**:
  ```bash
  git init
  git add .
  git commit -m "feat: complete Lab 7 API Gateway and cloud deployment configuration"
  git branch -M main
  git remote add origin https://github.com/<YOUR-USERNAME>/<YOUR-REPO-NAME>.git
  git push -u origin main
  ```
- [ ] **Render Blueprint Created**:
  1. Open [dashboard.render.com](https://dashboard.render.com).
  2. Click **New +** -> **Blueprint**.
  3. Connect your GitHub repository.
  4. Render will parse `render.yaml` and prompt for environment variables.
- [ ] **MongoDB Atlas Credentials Configured on Render**:
  - Add `MONGODB_URI` for `user-service`: `mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/user_db`
  - Add `MONGODB_URI` for `product-service`: `mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/product_db`
  - Add `MONGODB_URI` for `order-service`: `mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/order_db`
- [ ] **Service Discovery URLs Configured on Render**:
  - For `api-gateway`: Set `USER_SERVICE_URL`, `PRODUCT_SERVICE_URL`, `ORDER_SERVICE_URL` to the deployed URLs.
  - For `order-service`: Set `USER_SERVICE_URL`, `PRODUCT_SERVICE_URL`.
  *(Note: If free tier restricts 4 concurrent services, deploy Gateway + User Service chain as permitted by Lab 7 guidelines).*
- [x] **Live Public Gateway Provisioned**:
  - Live Public URL: `https://it-644-web-services-and-soa-assignment.onrender.com`
  - Health check verified live returning 200 OK.
  - Gateway error interceptor verified live returning 502 Bad Gateway when backend is unreachable.

---

## 5. Live Cloud Verification & Status Summary

- [x] **Cloud Health Check (`GET /health`)**: VERIFIED (200 OK)
- [x] **Unreachable Service 502/503 Interception**: VERIFIED (502 Bad Gateway)
- [ ] **Backend Services Routing (`/users`, `/products`, `/orders`)**: PENDING (Requires user to sync updated Blueprint / environment variables with Render internal network URLs)
- [ ] **End-to-End Inter-Service Flow (`POST /orders`)**: PENDING (Requires redeployment of backend services)

---

## 6. Requirement Verification Status & Evidence Table

| Requirement | Status | Evidence |
| :--- | :---: | :--- |
| **1. API Gateway Single Entry Point** | **VERIFIED** | Local: Port 3000 only in `compose.yaml`. Cloud: `https://it-644-web-services-and-soa-assignment.onrender.com` |
| **2. Gateway Routes (`/users`, `/products`, `/orders`)** | **VERIFIED** | Configured in `api-gateway/server.js` with `http-proxy-middleware` and body streaming |
| **3. Gateway Native Health Check (`GET /health`)** | **VERIFIED** | Live 200 OK on Render. Screenshot: `screenshot/03_Public_Health_200.png` |
| **4. Gateway Request Logging** | **VERIFIED** | Formatted request logs `[Gateway] <method> <path> -> <target> -> <status>` in `server.js` |
| **5. Unreachable Service 502/503 Error Handling** | **VERIFIED** | Intercepts down upstream cleanly returning 502 Bad Gateway. Tested live on Render |
| **6. Config-Based Service Discovery** | **VERIFIED** | Externalized to `USER_SERVICE_URL`, `PRODUCT_SERVICE_URL`, `ORDER_SERVICE_URL` in `config.js` |
| **7. Host Port Perimeter Security** | **VERIFIED** | `compose.yaml` publishes only 3000:3000; User, Product, Order, MongoDB ports internal |
| **8. Docker Container Network** | **VERIFIED** | Inter-service traffic runs on `campus-network` bridge |
| **9. Cloud Deployment on Render** | **VERIFIED** | Services deployed on Render. Screenshot: `screenshot/01_Render_All_Services_Live.png` |
| **10. Public Gateway -> Backend Routing** | **NEEDS MANUAL ACTION** | Awaiting Git push & Render sync so Render uses private network hostnames |
| **11. MongoDB Atlas Cloud Integration** | **NEEDS MANUAL ACTION** | Configured via `MONGODB_URI`; awaits live backend query post-redeploy |
| **12. 502/503 Fault Recovery Test** | **VERIFIED** | Verified locally (13/13 tests pass in `test-api-gateway.js`) and verified live on Render |
| **13. Postman Collection Updated** | **VERIFIED** | Parameterized `{{GATEWAY_URL}}` in `Microservices – Lab 7.postman_collection.json` |
| **14. README Complete Documentation** | **VERIFIED** | Architecture diagram, discovery comparison, live test logs, reflection in `README.md` |
| **15. Reflection (5-8 lines)** | **VERIFIED** | Complete architectural evolution reflection in `README.md` Section 49 |
| **16. Evidence Screenshots in `screenshot/`** | **NEEDS MANUAL ACTION** | Initial evidence verified (`01_Render_All_Services_Live.png`, `03_Public_Health_200.png`); remaining logs to capture post-sync |

