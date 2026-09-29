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

## 4. Render Cloud Deployment Steps

- [x] **Infrastructure-as-Code Validated**: `render.yaml` blueprint prepared with 4 Docker service specifications (Gateway + 3 microservices).
- [x] **GitHub Repository Configured**: Remote repository (`Meetsheth25/IT-644-Web-Services-and-SOA-Assignment`) on branch `master`.
- [x] **Render Blueprint Service Topology Configured**:
  - `it-644-web-services-and-soa-assignment` (API Gateway, Public Web Service, Port 10000)
  - `campusconnect-user-service` (User Service, Private Service, Port 10000)
  - `campusconnect-product-service` (Product Service, Private Service, Port 10000)
  - `campusconnect-order-service` (Order Service, Private Service, Port 10000)
- [x] **MongoDB Atlas Credentials Configured on Render**:
  - `MONGODB_URI` for `user-service`: `mongodb+srv://<username>:<password>@cluster0.mongodb.net/user_db`
  - `MONGODB_URI` for `product-service`: `mongodb+srv://<username>:<password>@cluster0.mongodb.net/product_db`
  - `MONGODB_URI` for `order-service`: `mongodb+srv://<username>:<password>@cluster0.mongodb.net/order_db`
- [x] **Service Discovery URLs Configured on Render**:
  - For `api-gateway`: `USER_SERVICE_URL`, `PRODUCT_SERVICE_URL`, `ORDER_SERVICE_URL`
  - For `order-service`: `USER_SERVICE_URL`, `PRODUCT_SERVICE_URL`
- [x] **Live Public Gateway Provisioned**:
  - Live Public URL: `https://it-644-web-services-and-soa-assignment.onrender.com`
  - Health check verified live returning 200 OK.
  - Gateway error interceptor verified live returning 502 Bad Gateway when backend is unreachable.

---

## 5. Live Cloud Verification & Status Summary

- [x] **Cloud Health Check (`GET /health`)**: VERIFIED (200 OK — Evidence: [`screenshot/03_Public_Health_200.png`](screenshot/03_Public_Health_200.png))
- [x] **Backend Services Routing (`/users`, `/products`, `/orders`)**: VERIFIED (200 OK — Evidence: [`screenshot/04_Public_Users_200.png`](screenshot/04_Public_Users_200.png), [`screenshot/06_Public_Products_200.png`](screenshot/06_Public_Products_200.png), [`screenshot/08_Public_Orders_200.png`](screenshot/08_Public_Orders_200.png))
- [x] **End-to-End Inter-Service Flow (`POST /orders`)**: VERIFIED (201 Created — Evidence: [`screenshot/10_POST_Orders_201.png`](screenshot/10_POST_Orders_201.png), [`screenshot/11_POST_Orders_Routing.png`](screenshot/11_POST_Orders_Routing.png))
- [x] **MongoDB Atlas Cloud Persistence**: VERIFIED (Document persistence in `order_db.orders` — Evidence: [`screenshot/12_MongoDB_Atlas_Data.png`](screenshot/12_MongoDB_Atlas_Data.png))
- [x] **Unreachable Service 502/503 Interception**: VERIFIED (502 Bad Gateway — Evidence: [`screenshot/13_Public_502.png`](screenshot/13_Public_502.png), [`screenshot/14_Render_502_Log.png`](screenshot/14_Render_502_Log.png))
- [x] **Automatic Service Recovery**: VERIFIED (Restored to 200 OK — Evidence: [`screenshot/15_Users_After_Restore.png`](screenshot/15_Users_After_Restore.png))
- [x] **Environment Variable Configuration**: VERIFIED (Masked discovery URLs — Evidence: [`screenshot/16_Render_Environment_Config.png`](screenshot/16_Render_Environment_Config.png))
- [x] **Public Gateway Domain Overview**: VERIFIED (Public URL — Evidence: [`screenshot/17_Render_Public_URL.png`](screenshot/17_Render_Public_URL.png))
- [x] **Multi-Service Deployment Status**: VERIFIED (All 4 services operational — Evidence: [`screenshot/01_Render_All_Services_Live.png`](screenshot/01_Render_All_Services_Live.png), [`screenshot/18_Final_Render_Deployment.png`](screenshot/18_Final_Render_Deployment.png))

---

## 6. Requirement Verification Status & Evidence Table

| Requirement | Status | Evidence |
| :--- | :---: | :--- |
| **1. API Gateway Single Entry Point** | **VERIFIED** | Local: Port 3000 only in `compose.yaml`. Cloud: `https://it-644-web-services-and-soa-assignment.onrender.com` |
| **2. Gateway Routes (`/users`, `/products`, `/orders`)** | **VERIFIED** | Configured in `api-gateway/server.js` with `http-proxy-middleware` and body streaming |
| **3. Gateway Native Health Check (`GET /health`)** | **VERIFIED** | Live 200 OK on Render. Screenshot: `screenshot/03_Public_Health_200.png` |
| **4. Gateway Request Logging** | **VERIFIED** | Formatted request logs `[Gateway] <method> <path> -> <target> -> <status>` in `server.js` |
| **5. Unreachable Service 502/503 Error Handling** | **VERIFIED** | Intercepts down upstream cleanly returning 502 Bad Gateway. Screenshot: `screenshot/13_Public_502.png`, `screenshot/14_Render_502_Log.png` |
| **6. Config-Based Service Discovery** | **VERIFIED** | Externalized to `USER_SERVICE_URL`, `PRODUCT_SERVICE_URL`, `ORDER_SERVICE_URL` in `config.js` |
| **7. Host Port Perimeter Security** | **VERIFIED** | `compose.yaml` publishes only 3000:3000; User, Product, Order, MongoDB ports internal |
| **8. Docker Container Network** | **VERIFIED** | Inter-service traffic runs on `campus-network` bridge |
| **9. Cloud Deployment on Render** | **VERIFIED** | Services deployed on Render. Screenshot: `screenshot/01_Render_All_Services_Live.png`, `screenshot/18_Final_Render_Deployment.png` |
| **10. Public Gateway -> Backend Routing** | **VERIFIED** | Verified 200 OK on `/users`, `/products`, `/orders` and 201 Created on `POST /orders`. Screenshots: `04`, `06`, `08`, `10` |
| **11. MongoDB Atlas Cloud Integration** | **VERIFIED** | Verified active TLS cluster connection and document persistence. Screenshot: `screenshot/12_MongoDB_Atlas_Data.png` |
| **12. 502/503 Fault Recovery Test** | **VERIFIED** | Verified locally (13/13 tests pass in `test-api-gateway.js`) and verified live on Render. Screenshots: `13`, `14`, `15` |
| **13. Postman Collection Updated** | **VERIFIED** | Parameterized `{{GATEWAY_URL}}` in `Microservices – Lab 7.postman_collection.json` |
| **14. README Complete Documentation** | **VERIFIED** | Architecture diagram, discovery comparison, live test logs, reflection in `README.md` |
| **15. Reflection (5-8 lines)** | **VERIFIED** | Complete architectural evolution reflection in `README.md` Section 49 |
| **16. Evidence Screenshots in `screenshot/`** | **VERIFIED** | All 18 screenshots complete in 16:9 Windows 11 desktop format (`01` through `18`) |

