# RESTful Student Management System — Lab 3, Lab 4, Lab 5, Lab 6 & Lab 7

Web Services & SOA Laboratory
- **Lab 4 Assignment**: Full-Stack Client & Database Integration
- **Lab 5 Assignment**: Docker & Containerization – Dockerizing the Student REST API
- **Lab 6 Assignment**: Docker & Microservices – Decomposing and Running Backend as Independent Services
- **Lab 7 Assignment**: API Gateway, Configuration-Based Service Discovery & Cloud Deployment

---

## Part I: Lab 4 Architecture & Full-Stack Implementation

### 1. Executive Summary & Objective

The objective of **Lab 4** is to extend the **Student RESTful Web Service** built in Lab 3 into a complete multi-client full-stack architecture. 

1. **Persistent Data Store**: In-memory array storage is replaced with **MongoDB Atlas** using **Mongoose** Object Data Modeling (ODM).
2. **Web Client**: A full-CRUD **React Web Client** built with **Vite** (`student-client`).
3. **Mobile Client**: An equivalent **Android Mobile Client** built with **Kotlin**, **Retrofit 2**, and **Gson** (`android-client`).
4. **Service Architecture**: Both React and Android clients communicate exclusively with the centralized **Express.js REST API**, demonstrating Service-Oriented Architecture (SOA) principles.

---

### 2. Multi-Client / SOA Architecture

```text
               ┌───────────────────────────────┐
               │    MongoDB Atlas Database     │
               └───────────────▲───────────────┘
                               │ (Mongoose Driver)
                               ▼
               ┌───────────────────────────────┐
               │   Express.js RESTful API      │
               │     (http://localhost:3000)   │
               └───────▲───────────────▲───────┘
                       │               │
        (HTTP / JSON)  │               │ (HTTP / JSON)
                       │               │
  ┌────────────────────┴───┐       ┌───┴────────────────────┐
  │   React Web Client     │       │ Android Mobile Client  │
  │ (http://localhost:5173)│       │ (Emulator: 10.0.2.2)   │
  └────────────────────────┘       └────────────────────────┘
```

| Application Layer | Communicates With | Never Communicates With |
| :--- | :--- | :--- |
| **React Client** | REST API (`HTTP/JSON`) | MongoDB Atlas directly |
| **Android Client** | REST API (`HTTP/JSON`) | MongoDB Atlas directly |
| **Express REST API** | MongoDB Atlas (Mongoose ODM) | — |

#### Discussion: Why React and Android Access the REST API Instead of Direct Database Access

1. **Security**: Direct database connections from client applications expose database credentials and connection strings in client-side bundles or APK files. Routing requests through a REST API keeps database credentials strictly server-side.
2. **Centralized Business Logic & Validation**: Input rules (e.g., non-empty name, email regex, positive semester) and database constraint error mappings are enforced in one central location. Clients do not need to duplicate business rules.
3. **Decoupling & Maintainability**: The backend database can be migrated (e.g., from MongoDB to PostgreSQL or MySQL) without requiring code modifications or redeployment of React or Android client apps.
4. **Access Control**: The REST API provides a controlled interface for authentication, authorization, and rate limiting.

---

### 3. Technologies Used

- **Backend**: Node.js v24.14.1, Express.js v4.19.2, Mongoose v8.6.0, dotenv v16.4.5, cors v2.8.5
- **Database**: MongoDB Atlas (M0 Free Tier) & Local MongoDB Docker Container
- **Containerization (Lab 5)**: Docker Engine, Docker Compose (`compose.yaml`), Node 20 Alpine, Mongo Official Image
- **Web Client**: React v18.3.1, Vite v5.4.2, JavaScript (ES6+), CSS3
- **Mobile Client**: Android SDK 34, Kotlin v1.9, Retrofit v2.9.0, Gson Converter v2.9.0, OkHttp3 Logging Interceptor
- **Testing & Tooling**: Node.js native HTTP runner, Swagger UI, Postman v2.1.0 collection

---

### 4. Backend & MongoDB Atlas Setup (`express-api/`)

#### Environment Setup (`.env`)

Create `.env` inside `express-api/` using `.env.example` as a template:

```env
# MongoDB Atlas Connection String
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/student_db?retryWrites=true&w=majority

# Server Port
PORT=3000
```

> [!IMPORTANT]
> The `.env` file is listed in `express-api/.gitignore` and must never be committed to Git repositories or exposed in screenshots.

#### Database Schema & Unique Email Constraint

```javascript
const studentSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  course: { type: String, required: true, trim: true },
  semester: { type: Number, required: true, min: 1 }
}, { timestamps: true });
```

- **Constraint Rationale**: `email` is enforced as a unique index in MongoDB. This prevents duplicate student account registration and ensures data integrity.
- **Error Mapping**: Duplicate key errors (`E11000`) are intercepted by Express error middleware and returned as `HTTP 400 Bad Request` with structured JSON error details:
  ```json
  {
    "error": "Validation failed",
    "message": "Email address 'aarav@example.com' is already registered."
  }
  ```

---

### 5. Cross-Origin Resource Sharing (CORS)

Browser clients running on `http://localhost:5173` (Vite) are blocked by browser Same-Origin Policy when calling `http://localhost:3000`. CORS is explicitly enabled in `express-api/server.js`:

```javascript
const cors = require('cors');
app.use(cors());
```

---

### 6. React Web Client (`student-client/`)

#### Centralized `API_BASE_URL`

All API requests in the React client import `API_BASE_URL` from [`student-client/src/config.js`](file:///m:/Mit/Clg/DAU/SY/SEM%203/IT%20644%20Web%20Services%20and%20SOA/practical/Lab%204%2025-8-26/student-client/src/config.js):

```javascript
export const API_BASE_URL = 'http://localhost:3000';
```

#### Components & Features

- `StudentList.jsx`: Displays students in a styled table with Edit and Delete action triggers.
- `StudentForm.jsx`: Reusable form for creating and updating students with client-side validation rules.
- `App.jsx`: State manager for fetching data, displaying loading states, consuming `GET /students/:id` on edit, success notifications, and error banners (400 validation, 404 not found, network errors).

---

### 7. Android Mobile Client (`android-client/`)

#### Android Emulator Networking (`10.0.2.2`)

Android Emulators run inside a virtual network loopback interface. Inside the emulator, `localhost` (127.0.0.1) refers to the emulator device itself. To communicate with the host computer's Express server on port 3000, Android uses `10.0.2.2`:

```kotlin
// RetrofitClient.kt
private const val BASE_URL = "http://10.0.2.2:3000/"
```

#### Manifest Network Security

`android-client/app/src/main/AndroidManifest.xml` includes `INTERNET` permission and cleartext HTTP support for local development:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<application android:usesCleartextTraffic="true" ... >
```

---

### 8. API Endpoint Summary Table

| Operation | Method | Endpoint | Used By | Expected Status |
| :--- | :--- | :--- | :--- | :--- |
| **List Students** | `GET` | `/students` | React, Android, Docker Test | `200 OK` |
| **Get Student by ID** | `GET` | `/students/{id}` | React, Docker Test | `200 OK` / `404 Not Found` |
| **Create Student** | `POST` | `/students` | React, Android, Docker Test | `201 Created` / `400 Bad Request` |
| **Update Student** | `PUT` | `/students/{id}` | React, Docker Test | `200 OK` / `400` / `404` |
| **Delete Student** | `DELETE` | `/students/{id}` | React, Docker Test | `200 OK` / `404 Not Found` |

---

## Part II: Lab 5 Docker & Containerization

### 9. Lab 5 Objective & Relationship with Lab 4

**Lab 5** containerizes the complete **Lab 4 Student REST API** and its persistent data store using **Docker** and **Docker Compose**. 

- **Direct Continuation**: The application architecture, validation logic, Mongoose schema, HTTP response formats, React web client, and Android client from Lab 4 remain identical.
- **Portability**: Packaging the Express API and MongoDB into isolated containers ensures reproducible deployment across development, testing, and production environments without dependency conflicts.

---

### 10. Containerization Architecture

```text
Host Machine (Localhost / Browser / React / Android)
                      │
           Port 3000  │  Port 27017 (Optional DB Debug)
                      ▼
   ┌─────────────────────────────────────────────────────────────┐
   │             Docker Network: student-network                 │
   │                                                             │
   │   ┌───────────────────────────┐                             │
   │   │  Container: student-api   │                             │
   │   │  Image: student-api:v1    │                             │
   │   │  Internal Port: 3000      │                             │
   │   └─────────────┬─────────────┘                             │
   │                 │ MONGODB_URI:                              │
   │                 │ mongodb://mongodb:27017/student_db        │
   │                 ▼                                           │
   │   ┌───────────────────────────┐                             │
   │   │  Container: mongodb       │                             │
   │   │  Image: mongo:latest      │                             │
   │   │  Internal Port: 27017     │                             │
   │   └─────────────┬─────────────┘                             │
   └─────────────────┼───────────────────────────────────────────┘
                     │ Volume Mount: /data/db
                     ▼
   ┌───────────────────────────────────┐
   │ Docker Volume: student-mongo-data │
   └───────────────────────────────────┘
```

---

### 11. Dockerfile & .dockerignore Implementation

#### Dockerfile (`express-api/Dockerfile`)

```dockerfile
# Use official Node.js LTS Alpine base image for minimal image size and attack surface
FROM node:20-alpine

# Set container working directory
WORKDIR /app

# Copy package manifests first to leverage Docker layer caching
COPY package*.json ./

# Install production dependencies cleanly
RUN npm ci --only=production

# Copy application source files
COPY . .

# Expose API port
EXPOSE 3000

# Set production environment
ENV NODE_ENV=production

# Start the Express server
CMD ["npm", "start"]
```

#### .dockerignore (`express-api/.dockerignore`)

```dockerignore
node_modules
npm-debug.log
.env
.git
.gitignore
Dockerfile
.dockerignore
test-express.js
*.md
```

- **Purpose**: Prevents copying heavy host dependencies (`node_modules`), secrets (`.env`), Git history, and non-runtime files into the container image, reducing build time and image size.

---

### 12. Express 0.0.0.0 Binding for Docker

Inside a Docker container, listening exclusively on `127.0.0.1` (localhost) restricts connections to the container itself, making port forwards from the host fail. In `express-api/server.js`, the server binds to `0.0.0.0`:

```javascript
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Express Student API server running at http://0.0.0.0:${PORT} (accessible via http://localhost:${PORT})`);
});
```

---

### 13. Docker Networking: `localhost` vs `mongodb`

- **Localhost Inside a Container**: Refers to the internal network namespace of that specific container. If `student-api` attempted to connect to `mongodb://localhost:27017`, it would search for MongoDB inside its own container, causing connection refused errors.
- **Docker Bridge DNS Resolution (`mongodb`)**: When containers are connected to the user-defined Docker network (`student-network`), Docker's embedded DNS server automatically resolves the service name `mongodb` to the internal IP address of the MongoDB container.
- **Connection URI**:
  ```env
  MONGODB_URI=mongodb://mongodb:27017/student_db
  ```

---

### 14. Volume Persistence (`student-mongo-data`)

Containers are ephemeral by default; any data written to container writable layers is lost when the container is deleted. To guarantee database persistence across container restarts and updates, a Docker named volume `student-mongo-data` is mounted to MongoDB's storage path `/data/db`:

```yaml
volumes:
  - student-mongo-data:/data/db
```

---

### 15. Multi-Container Orchestration (`compose.yaml`)

```yaml
services:
  mongodb:
    image: mongo:latest
    container_name: mongodb
    restart: unless-stopped
    ports:
      - "27017:27017"
    volumes:
      - student-mongo-data:/data/db
    networks:
      - student-network

  api:
    build:
      context: ./express-api
      dockerfile: Dockerfile
    container_name: student-api
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - MONGODB_URI=mongodb://mongodb:27017/student_db
    depends_on:
      - mongodb
    networks:
      - student-network

volumes:
  student-mongo-data:
    name: student-mongo-data

networks:
  student-network:
    name: student-network
```

---

### 16. Step-by-Step Execution Guide

#### Method A: Using Docker Compose (Recommended)

1. **Verify Docker Installation**:
   ```bash
   docker --version
   docker compose version
   ```

2. **Start Entire Application Stack**:
   ```bash
   docker compose up -d --build
   ```

3. **Check Running Containers**:
   ```bash
   docker compose ps
   ```

4. **View Container Logs**:
   ```bash
   docker compose logs -f api
   ```

5. **Run Automated Test Suite**:
   ```bash
   node test-docker.js
   ```

6. **Stop Stack Without Data Loss**:
   ```bash
   docker compose down
   ```

---

#### Method B: Standalone Docker CLI Commands

1. **Create Network & Volume**:
   ```bash
   docker network create student-network
   docker volume create student-mongo-data
   ```

2. **Run MongoDB Container**:
   ```bash
   docker run -d \
     --name mongodb \
     --network student-network \
     -v student-mongo-data:/data/db \
     -p 27017:27017 \
     mongo:latest
   ```

3. **Build Student API Image**:
   ```bash
   docker build -t student-api:v1 ./express-api
   ```

4. **Run Student API Container**:
   ```bash
   docker run -d \
     --name student-api \
     --network student-network \
     -p 3000:3000 \
     -e PORT=3000 \
     -e MONGODB_URI=mongodb://mongodb:27017/student_db \
     student-api:v1
   ```

---

### 17. Manual MongoDB Persistence Test Procedure

1. **Create Student Record**:
   ```bash
   curl -X POST http://localhost:3000/students \
     -H "Content-Type: application/json" \
     -d '{"name":"Persistence Student","email":"persistence@test.com","course":"Cloud","semester":4}'
   ```
   *(Note the returned student `id`, e.g., 1)*.

2. **Stop and Remove MongoDB Container**:
   ```bash
   docker stop mongodb
   docker rm mongodb
   ```

3. **Recreate MongoDB Container with Same Volume**:
   ```bash
   docker run -d \
     --name mongodb \
     --network student-network \
     -v student-mongo-data:/data/db \
     -p 27017:27017 \
     mongo:latest
   ```

4. **Retrieve Student Record via API**:
   ```bash
   curl http://localhost:3000/students/1
   ```
   *Confirm the student data is returned intact, proving volume persistence.*

---

### 18. React Client Compatibility

The React client (`student-client`) connects to `http://localhost:3000`. Because `compose.yaml` maps host port `3000` to container port `3000`, the React client functions seamlessly without any code changes:

```powershell
cd student-client
npm run dev
```
Open `http://localhost:5173` to interact with the Dockerized API.

---

### 19. Hardware & Testing Notice

> [!NOTE]
> **Postman Desktop Execution Notice**:
> Postman Desktop execution was not performed because of local hardware and performance limitations. API behavior and validation were verified using live HTTP requests through the Node.js test runner [`test-docker.js`](file:///m:/Mit/Clg/DAU/SY/SEM%203/IT%20644%20Web%20Services%20and%20SOA/practical/Lab%204%2025-8-26/test-docker.js) and CLI testing.

---

### 20. Troubleshooting Guide

- **Container Exits with Code 1 / Cannot Connect to MongoDB**:
  - Verify that both `student-api` and `mongodb` are connected to `student-network`.
  - Ensure `MONGODB_URI=mongodb://mongodb:27017/student_db` is used inside Docker (not `localhost`).
- **Port 3000 Already in Use**:
  - Ensure any local Node.js process is stopped (`Get-Process -Name node | Stop-Process` on Windows).
- **Cannot Reach API from Browser / Postman**:
  - Verify `app.listen(PORT, '0.0.0.0')` is configured in `server.js`.
  - Check port forwarding using `docker ps` (`0.0.0.0:3000->3000/tcp`).

---

### 21. Screenshot Checklist for Lab 5 Submission

- [ ] `docker --version` and `docker compose version` command output.
- [ ] `docker build -t student-api:v1 ./express-api` build logs.
- [ ] `docker images` showing `student-api:v1` and `mongo:latest`.
- [ ] `docker compose up -d` execution output.
- [ ] `docker compose ps` showing running containers.
- [ ] `docker compose logs` showing successful MongoDB connection.
- [ ] Browser / CLI output of `http://localhost:3000/students` (`200 OK`).
- [ ] `test-docker.js` execution output showing 11/11 tests passing.
- [ ] MongoDB container removal and recreation persistence verification.

---

## Part III: Lab 6 Architecture & Microservices Implementation

### 22. Project Overview & Context

**Lab 6** decomposes the monolithic, containerized REST API developed in Lab 5 into a distributed, decoupled **Microservices Architecture**. Instead of running all domain entities (Users, Products, Orders) within a single backend application or database, each domain is isolated into its own independent microservice with its own dedicated codebase, runtime, database, and container lifecycle.

---

### 23. Relationship to Previous Labs

- **Lab 3**: Built the initial Express.js REST API with in-memory storage for students.
- **Lab 4**: Integrated MongoDB Atlas via Mongoose ODM and connected full-stack web (`student-client`) and mobile (`android-client`) clients.
- **Lab 5**: Containerized the application with Docker and Docker Compose, running MongoDB in a local container on `student-network` with data volume persistence (`student-mongo-data`).
- **Lab 6**: Decomposes the backend into three distinct microservices (`user-service`, `product-service`, `order-service`) connected via a shared bridge network (`campus-network`), enforcing **Database-per-Service** and synchronous **REST inter-service communication**.

---

### 24. Why Microservices? Architectural Motivations

1. **Independent Deployability**: Each service can be built, updated, and deployed without rebuilding or restarting unrelated services.
2. **Fault Isolation**: A crash or high load in the Product catalog does not prevent users from authenticating or managing their user profiles.
3. **Decoupled Data Ownership**: Services encapsulate their own databases, avoiding shared SQL/NoSQL schema locking and unintended coupling.
4. **Targeted Scalability**: Services with high throughput (e.g., Order checkout) can be scaled horizontally without scaling the entire application stack.

---

### 25. Service Boundaries & Responsibilities

| Service | Port | Database | Primary Responsibility |
| :--- | :--- | :--- | :--- |
| **User Service** | `3001` | `user_db` | Manages user profiles, role assignments, department affiliations, and unique email constraints. |
| **Product Service** | `3002` | `product_db` | Manages product inventory, categories, pricing, and stock tracking. |
| **Order Service** | `3003` | `order_db` | Coordinates order placement, calculates totals, validates user/product existence via REST APIs, and stores order records. |

---

### 26. REST API Endpoint Specification

#### User Service (`http://localhost:3001`)

| Method | Endpoint | Description | Status Codes |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Service health status check | `200 OK` |
| `GET` | `/users` | List all users | `200 OK` |
| `GET` | `/users/:id` | Get user by numeric ID | `200 OK`, `400 Bad Request`, `404 Not Found` |
| `POST` | `/users` | Create new user | `201 Created`, `400 Bad Request` (Validation/Duplicate) |
| `PUT` | `/users/:id` | Update user by ID | `200 OK`, `400 Bad Request`, `404 Not Found` |
| `DELETE` | `/users/:id` | Delete user by ID | `200 OK`, `400 Bad Request`, `404 Not Found` |

#### Product Service (`http://localhost:3002`)

| Method | Endpoint | Description | Status Codes |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Service health status check | `200 OK` |
| `GET` | `/products` | List all products | `200 OK` |
| `GET` | `/products/:id` | Get product by numeric ID | `200 OK`, `400 Bad Request`, `404 Not Found` |
| `POST` | `/products` | Create new product | `201 Created`, `400 Bad Request` |
| `PUT` | `/products/:id` | Update product by ID | `200 OK`, `400 Bad Request`, `404 Not Found` |
| `DELETE` | `/products/:id` | Delete product by ID | `200 OK`, `400 Bad Request`, `404 Not Found` |

#### Order Service (`http://localhost:3003`)

| Method | Endpoint | Description | Status Codes |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Service health status & configured dependency URLs | `200 OK` |
| `GET` | `/orders` | List all orders | `200 OK` |
| `GET` | `/orders/:id` | Get order by numeric ID | `200 OK`, `400 Bad Request`, `404 Not Found` |
| `POST` | `/orders` | Create order (validates user & product via REST) | `201 Created`, `400 Bad Request`, `404 Not Found`, `503 Service Unavailable` |

---

### 27. Database-per-Service Architecture

Each microservice strictly owns its own data storage. No service queries another service's database directly:

```
[User Service]    --->  mongodb://mongodb:27017/user_db
[Product Service] --->  mongodb://mongodb:27017/product_db
[Order Service]   --->  mongodb://mongodb:27017/order_db
```

- Cross-service database access is strictly forbidden.
- The `Order Service` never queries `user_db` or `product_db`. Instead, it communicates with `User Service` and `Product Service` exclusively over HTTP REST.

---

### 28. Service-to-Service Communication (Synchronous REST)

When `POST /orders` is invoked on the Order Service:

```text
 Client / Postman
       │
       │ POST /orders { userId: 1, productId: 1, quantity: 2 }
       ▼
 ┌───────────────┐
 │ Order Service │ (Port 3003)
 └───────┬───────┘
         │
         ├─── 1. GET http://user-service:3001/users/1 ──────────> ┌──────────────┐
         │    <── 200 OK { id: 1, name: "Alice Johnson", ... } ─── │ User Service │
         │                                                        └──────────────┘
         │
         ├─── 2. GET http://product-service:3002/products/1 ─────> ┌─────────────────┐
         │    <── 200 OK { id: 1, name: "Cloud Textbook", ... } ── │ Product Service │
         │                                                        └─────────────────┘
         │
         ▼
 3. Check stock & calculate total
 4. Save to order_db
 5. Return HTTP 201 Created with order payload
```

#### Docker Internal Networking Rule
Inside Docker, services communicate using **Docker Compose service names**:
- `http://user-service:3001`
- `http://product-service:3002`

`localhost` is NEVER used for container-to-container calls because `localhost` inside a container resolves to that container itself.

---

### 29. Error Handling & Resilience (404 and 503)

- **Invalid User or Product ID**:
  If the referenced User ID or Product ID does not exist in the respective service, that service returns `404 Not Found`. Order Service intercepts this and returns `404 Not Found` with a clear message:
  ```json
  {
    "error": "Not Found",
    "message": "Referenced User with ID 999999 not found in User Service."
  }
  ```

- **Dependency Failure (503 Service Unavailable)**:
  If `user-service` or `product-service` is stopped or unreachable, Order Service does not crash or hang. It catches the network connection error / timeout (via `AbortSignal.timeout(3500)`) and returns `HTTP 503 Service Unavailable`:
  ```json
  {
    "error": "Service Unavailable",
    "message": "User Service is currently unavailable"
  }
  ```

---

### 30. Docker Network & Compose Configuration

- **Network**: `campus-network` (bridge driver)
- **Compose file**: [`compose.yaml`](file:///m:/Mit/Clg/DAU/SY/SEM%203/IT%20644%20Web%20Services%20and%20SOA/practical/Lab%206%2022-9-26/compose.yaml)

```yaml
services:
  mongodb:
    image: mongo:latest
    container_name: mongodb
    restart: unless-stopped
    ports:
      - "27017:27017"
    volumes:
      - campus-mongo-data:/data/db
    networks:
      - campus-network

  user-service:
    build:
      context: ./user-service
      dockerfile: Dockerfile
    container_name: user-service
    ports:
      - "3001:3001"
    environment:
      - PORT=3001
      - USER_SERVICE_PORT=3001
      - MONGODB_URI=mongodb://mongodb:27017/user_db
    depends_on:
      - mongodb
    networks:
      - campus-network

  product-service:
    build:
      context: ./product-service
      dockerfile: Dockerfile
    container_name: product-service
    ports:
      - "3002:3002"
    environment:
      - PORT=3002
      - PRODUCT_SERVICE_PORT=3002
      - MONGODB_URI=mongodb://mongodb:27017/product_db
    depends_on:
      - mongodb
    networks:
      - campus-network

  order-service:
    build:
      context: ./order-service
      dockerfile: Dockerfile
    container_name: order-service
    ports:
      - "3003:3003"
    environment:
      - PORT=3003
      - ORDER_SERVICE_PORT=3003
      - MONGODB_URI=mongodb://mongodb:27017/order_db
      - USER_SERVICE_URL=http://user-service:3001
      - PRODUCT_SERVICE_URL=http://product-service:3002
    depends_on:
      - mongodb
      - user-service
      - product-service
    networks:
      - campus-network

volumes:
  campus-mongo-data:
    name: campus-mongo-data

networks:
  campus-network:
    name: campus-network
```

---

### 31. Independent Service Operation & Build Instructions

Each service can be run locally or built independently:

#### Running Locally (Direct Node.js)
```bash
# Terminal 1: User Service
cd user-service
npm install
npm start

# Terminal 2: Product Service
cd product-service
npm install
npm start

# Terminal 3: Order Service
cd order-service
npm install
npm start
```

#### Independent Docker Image Builds
```bash
docker build -t user-service:v1 ./user-service
docker build -t product-service:v1 ./product-service
docker build -t order-service:v1 ./order-service
```

#### Complete Multi-Service Stack Orchestration
```bash
docker compose up -d --build
docker compose ps
docker compose logs
```

---

### 32. Verification & Automated Test Results

Automated verification is performed via [`test-microservices.js`](file:///m:/Mit/Clg/DAU/SY/SEM%203/IT%20644%20Web%20Services%20and%20SOA/practical/Lab%206%2022-9-26/test-microservices.js):

```bash
node test-microservices.js
```

#### Actual Test Execution Summary:
- **Phase 1: Health Checks**: User (:3001), Product (:3002), Order (:3003) all return `200 OK`.
- **Phase 2: User Service CRUD**: POST (`201`), GET by ID (`200`), GET all (`200`), PUT (`200`) verified.
- **Phase 3: Product Service CRUD**: POST (`201`), GET by ID (`200`), GET all (`200`), PUT (`200`) verified.
- **Phase 4: Order Service & Inter-Service REST**: POST valid order triggers User & Product lookup, returns `201 Created` with snapshot data.
- **Phase 5: Negative Tests**:
  - Non-existent User ID 999999 returns `404 Not Found`.
  - Non-existent Product ID 999999 returns `404 Not Found`.
  - Duplicate user email returns `400 Bad Request`.
  - Invalid order body payload returns `400 Bad Request`.
- **Phase 6: Dependency Failure & Recovery**:
  - `docker compose stop user-service` -> `POST /orders` returns `503 Service Unavailable`.
  - `docker compose start user-service` -> `GET /users` returns `200 OK`, `POST /orders` returns `201 Created`.

---

### 33. Complete Architecture Diagram

```text
                      Postman / Host Client
                                │
          ┌─────────────────────┼─────────────────────┐
          │ :3001               │ :3002               │ :3003
          ▼                     ▼                     ▼
 ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
 │  user-service   │   │ product-service │   │  order-service  │
 │     (:3001)     │   │     (:3002)     │   │     (:3003)     │
 └────────┬────────┘   └────────┬────────┘   └────────┬────────┘
          │                     │                     │
          │                     │                     ├──── REST (GET /users/:id) ────> user-service:3001
          │                     │                     │
          │                     │                     └──── REST (GET /products/:id) ─> product-service:3002
          │                     │                     │
          ▼                     ▼                     ▼
   [ user_db ]          [ product_db ]        [ order_db ]
          │                     │                     │
          └─────────────────────┼─────────────────────┘
                                │
                                ▼
                   ┌─────────────────────────┐
                   │    MongoDB Container    │
                   │      (mongo:latest)     │
                   └────────────┬────────────┘
                                │
                                ▼
                   ┌─────────────────────────┐
                   │   campus-mongo-data     │
                   │    (Docker Volume)      │
                   └─────────────────────────┘

 ═══════════════════════════════════════════════════════════════════
   Docker Shared Bridge Network: campus-network (172.19.0.0/16)
 ═══════════════════════════════════════════════════════════════════
   * Note: API Gateway is Optional / Conceptual — Not Implemented.
```

---

### 34. API & Communication Exercise (Lab 6 Worksheet)

#### Service Design Table

| Specification | User Service | Product Service | Order Service |
| :--- | :--- | :--- | :--- |
| **Responsibility** | User profile creation, retrieval, updates, and deletion. | Product catalog, pricing, category, and inventory management. | Order placement, user & product verification, total price calculation. |
| **Host Port** | `3001` | `3002` | `3003` |
| **Main Resource** | Users | Products | Orders |
| **Core Endpoints** | `GET /users`<br>`GET /users/:id`<br>`POST /users`<br>`PUT /users/:id`<br>`DELETE /users/:id` | `GET /products`<br>`GET /products/:id`<br>`POST /products`<br>`PUT /products/:id`<br>`DELETE /products/:id` | `POST /orders`<br>`GET /orders`<br>`GET /orders/:id` |
| **Database Ownership** | `user_db` in MongoDB | `product_db` in MongoDB | `order_db` in MongoDB |

#### Service-to-Service Interaction Design

| Attribute | Call 1 (Order -> User) | Call 2 (Order -> Product) |
| :--- | :--- | :--- |
| **Calling Service** | `order-service` | `order-service` |
| **Target Service** | `user-service` | `product-service` |
| **Protocol / Method**| HTTP / `GET` | HTTP / `GET` |
| **Target Endpoint** | `${USER_SERVICE_URL}/users/:id` | `${PRODUCT_SERVICE_URL}/products/:id` |
| **Internal URL** | `http://user-service:3001/users/{userId}` | `http://product-service:3002/products/{productId}` |
| **Request Payload** | Referenced User ID in path parameter | Referenced Product ID in path parameter |
| **Success Response** | `200 OK` with user JSON object | `200 OK` with product JSON object |
| **Invalid Resource** | `404 Not Found` -> Order returns `404` | `404 Not Found` -> Order returns `404` |
| **Target Down** | Connection Error / Timeout -> Order returns `503 Service Unavailable` | Connection Error / Timeout -> Order returns `503 Service Unavailable` |

---

### 35. Troubleshooting Guide for Lab 6

- **Order Service returns 503 Service Unavailable**:
  - Check if `user-service` and `product-service` are running: `docker compose ps`.
  - Verify that `USER_SERVICE_URL=http://user-service:3001` and `PRODUCT_SERVICE_URL=http://product-service:3002` are passed into the Order Service container environment.
  - Verify container DNS resolution over `campus-network`.
- **Port Conflict (3001, 3002, 3003, or 27017)**:
  - Stop any conflicting local Node.js or MongoDB instances.
  - Run `docker compose down` and restart with `docker compose up -d`.
- **Database Cross-Talk Prevention**:
  - Each service specifies its own database name in its connection string (`user_db`, `product_db`, `order_db`), ensuring clean schema and collection boundaries.

---

## Part IV: Lab 7 API Gateway, Service Discovery & Cloud Deployment

### 36. Executive Summary & Objective

In **Lab 6**, the monolithic backend was decomposed into three independently runnable microservices—**User Service**, **Product Service**, and **Order Service**—communicating directly across a shared Docker bridge network (`campus-network`), while the API Gateway was treated as an optional architectural concept.

**Lab 7** brings this architecture to production readiness by implementing:
1. **Real API Gateway**: Built with Node.js, Express, and `http-proxy-middleware`, functioning as the single public entry point for all clients.
2. **Reverse Proxying & Routing**: Routing `/users/*` to User Service, `/products/*` to Product Service, and `/orders/*` to Order Service.
3. **Gateway Health Check**: Native `GET /health` endpoint reporting gateway uptime without proxying.
4. **Structured Request Logging**: Logging method, requested path, upstream target, and final status code for every routed request.
5. **Centralized Error Handling**: Non-blocking fault tolerance returning clean `502 Bad Gateway` responses when upstream services are unreachable.
6. **Configuration-Based Service Discovery**: Upstream locations externalized via environment variables (`USER_SERVICE_URL`, `PRODUCT_SERVICE_URL`, `ORDER_SERVICE_URL`), allowing routing targets to change dynamically without modifying gateway code.
7. **Architectural Perimeter Security**: In `compose.yaml`, backend microservices (ports 3001, 3002, 3003) are stripped of host port mappings and isolated strictly inside `campus-network`. Only the API Gateway (port 3000) is published externally.
8. **Cloud Deployment Preparation & Strategy**: Docker blueprint configuration (`render.yaml`), cloud environment specifications, MongoDB Atlas integration, and automated verification scripts for public deployment.

---

### 37. Architecture Diagram

#### Local & Container Architecture

```text
 ═══════════════════════════════════════════════════════════════════════════════════════════════
                           PUBLIC INTERNET / HOST MACHINE
 ═══════════════════════════════════════════════════════════════════════════════════════════════
            │
            │ HTTP Requests (:3000)
            ▼
 ┌─────────────────────────────────────────────────────────────────────────────────────────────┐
 │                                   API GATEWAY                                               │
 │                         (Express.js + http-proxy-middleware)                                │
 │   • Single Public Entry Point       • Request Logging: [Gateway] GET /users -> 200          │
 │   • Service Registry / Discovery    • Centralized 502/503 Fault Handling                    │
 └───────┬───────────────────────────────────┬───────────────────────────────────┬─────────────┘
         │                                   │                                   │
 ════════╪═══════════════════════════════════╪═══════════════════════════════════╪═════════════
         │   DOCKER INTERNAL BRIDGE NETWORK: campus-network                      │
         │   (Backend Microservices Isolated — No Host Ports Exposed)            │
         ▼                                   ▼                                   ▼
 ┌───────────────────────┐       ┌───────────────────────┐       ┌─────────────────────────────┐
 │     User Service      │       │    Product Service    │       │        Order Service        │
 │    (Port 3001 only)   │       │   (Port 3002 only)    │       │      (Port 3003 only)       │
 │   • /users            │       │   • /products         │       │   • /orders                 │
 │   • /users/:id        │       │   • /products/:id     │       │   • Inter-Service Client    │
 └───────────┬───────────┘       └───────────┬───────────┘       └──────┬───────────────┬──────┘
             │                               │                          │               │
             │                               │   GET /users/:id         │               │
             │                               ◄──────────────────────────┘               │
             │                                   GET /products/:id                      │
             │                               ◄──────────────────────────────────────────┘
             │                               │
             ▼                               ▼
 ═══════════════════════════════════════════════════════════════════════════════════════════════
                 EXTERNAL CLOUD PERSISTENCE (MONGODB ATLAS CLOUD CLUSTERS)
 ═══════════════════════════════════════════════════════════════════════════════════════════════
             │                               │                          │
             ▼                               ▼                          ▼
     [ user_db Cluster ]           [ product_db Cluster ]     [ order_db Cluster ]
```

```mermaid
flowchart TD
    Client["Client / Postman"] -->|"HTTP Requests (:3000)"| Gateway["API Gateway (Port 3000)"]
    
    subgraph CampusNetwork["Docker Internal Network (campus-network)"]
        Gateway -->|"/users/*"| UserSvc["User Service (:3001)"]
        Gateway -->|"/products/*"| ProdSvc["Product Service (:3002)"]
        Gateway -->|"/orders/*"| OrderSvc["Order Service (:3003)"]
        
        OrderSvc -.->|"Inter-Service GET /users/:id"| UserSvc
        OrderSvc -.->|"Inter-Service GET /products/:id"| ProdSvc
    end

    subgraph CloudStorage["MongoDB Atlas Cloud Storage"]
        UserSvc -->|"TLS / Mongoose"| UserDB[("user_db")]
        ProdSvc -->|"TLS / Mongoose"| ProdDB[("product_db")]
        OrderSvc -->|"TLS / Mongoose"| OrderDB[("order_db")]
    end
```

---

### 38. Gateway Endpoints & Routing Table

| Inbound Gateway Path | HTTP Method | Routed Upstream Target | Upstream Address (Docker Internal) | Description |
| :--- | :--- | :--- | :--- | :--- |
| `/health` | `GET` | *API Gateway (Native)* | `http://localhost:3000/health` | Gateway health status check (not proxied) |
| `/users` | `GET`, `POST` | User Service | `http://user-service:3001/users` | List users / Register new user |
| `/users/:id` | `GET`, `PUT`, `DELETE` | User Service | `http://user-service:3001/users/:id` | Retrieve, modify, or remove user |
| `/products` | `GET`, `POST` | Product Service | `http://product-service:3002/products` | Browse catalog / Add product |
| `/products/:id` | `GET`, `PUT`, `DELETE` | Product Service | `http://product-service:3002/products/:id` | Retrieve, update, or remove product |
| `/orders` | `GET`, `POST` | Order Service | `http://order-service:3003/orders` | List orders / Place new order (cross-service) |
| `/orders/:id` | `GET` | Order Service | `http://order-service:3003/orders/:id` | Retrieve specific order |
| `/*` (unmatched) | `ALL` | *API Gateway (Native)* | — | Centralized `404 Not Found` response |

---

### 39. Discussion: Why Introduce an API Gateway?

> **Assignment Discussion Question**:
> *Why introduce an API Gateway instead of letting clients call each service directly? Think about a single entry point, hiding internal structure, and centralizing concerns like logging and error handling.*

1. **Single Entry Point**: Without an API Gateway, client applications (web, iOS, Android, third-party consumers) must track the individual IP addresses, hostnames, and ports of every microservice. An API Gateway exposes a single, unified domain and entry point (`/users`, `/products`, `/orders`), dramatically simplifying client configuration and DNS setup.
2. **Encapsulation & Hiding Internal Architecture**: The gateway creates an architectural boundary that completely conceals internal service topology, ports (3001, 3002, 3003), container network addresses, and inter-service dependencies. Backend microservices can be split, refactored, or renamed without breaking public client contracts.
3. **Perimeter Security & Attack Surface Reduction**: Exposing backend microservices directly to the public internet requires every microservice to manage its own TLS termination, CORS configuration, firewall rules, and DDoS defenses. With an API Gateway, only one service is exposed to the public internet, leaving all business services protected inside an isolated internal Docker bridge network.
4. **Cross-Cutting Concern Centralization**: Cross-cutting concerns—such as structured request logging, authorization, rate limiting, and centralized error normalization—are implemented once at the gateway rather than duplicated inconsistently across dozens of microservices.
5. **Normalized Failure Isolation**: If a microservice fails or crashes, direct client calls result in raw TCP connection refused errors or timeouts. The API Gateway intercepts upstream network failures and returns clean, uniform HTTP status codes (`502 Bad Gateway` / `503 Service Unavailable`) alongside standardized JSON error envelopes.

---

### 40. Configuration-Based Service Discovery

In microservice environments, service locations change across environments (local development, Docker Compose, Kubernetes, and Cloud PaaS). Hard-coding service URLs inside route handlers binds code to a specific deployment topology.

In Lab 7, service discovery is implemented via **Externalized Configuration** in `api-gateway/config.js`:

```javascript
// api-gateway/config.js
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
```

The gateway dynamically iterates over this registry at boot to bind reverse-proxy middleware:

```javascript
Object.values(config.services).forEach((service) => {
  app.use(createServiceProxy(service));
});
```

#### Service Discovery Proof

We created an automated demonstration script (`demo-service-discovery.js`) that empirically validates configuration-driven routing:
- **Run 1**: `USER_SERVICE_URL` is set to `http://localhost:59101` (Mock Server A). The gateway forwards `/users` to Server A.
- **Run 2**: Without modifying any gateway route-handling code, `USER_SERVICE_URL` is switched to `http://localhost:59102` (Mock Server B). The gateway immediately boots and routes `/users` to Server B.

Execution command:
```bash
node demo-service-discovery.js
```

---

### 41. Static vs. Dynamic Service Discovery

> **Assignment Discussion Question**:
> *Briefly contrast this static/config-based approach with dynamic service discovery (e.g. Consul, Eureka, Kubernetes DNS) - what would a dynamic registry add that a static config file cannot?*

| Feature | Static / Config-Based Discovery (Lab 7) | Dynamic Service Discovery (Consul / Eureka / K8s) |
| :--- | :--- | :--- |
| **Registration Mechanism** | Manual configuration files / environment variables (`.env`, `compose.yaml`). | Automated self-registration via service agents, sidecars, or container orchestrators on startup. |
| **Health Checking & Heartbeats** | Static; gateway attempts connection and handles failure reactively (502). | Continuous active health checks; unhealthy instances are automatically derecognized from the active pool. |
| **Horizontal Auto-Scaling** | Fixed upstream targets; scaling requires manual configuration update or external load balancer. | Seamless multi-instance routing; new replica instances instantly register and participate in client-side or server-side load balancing. |
| **Zero-Downtime Reconfiguration** | Requires container restart or process reboot to reload environment variables. | Live real-time discovery via pub/sub or watcher APIs; gateway routing tables update dynamically without rebooting. |
| **Operational Overhead** | Extremely lightweight; zero additional infrastructure required. | Requires dedicated registry clusters, quorum algorithms (e.g., Raft), and persistent agent monitoring. |

**Key Takeaway**: Static configuration is ideal for small, stable microservice topologies (such as Docker Compose environments). Dynamic registries add **self-healing registration**, **ephemeral instance tracking**, **automatic load balancing**, and **dynamic elasticity** required by massive, auto-scaling enterprise clusters.

---

### 42. Gateway Logging & Error Handling

#### Request Logging (Part C)
Every request passing through the gateway is logged upon completion with its HTTP method, incoming route, upstream target service, and final status code:
```text
[Gateway] GET /health -> gateway -> 200
[Gateway] GET /users -> user-service -> 200
[Gateway] GET /products -> product-service -> 200
[Gateway] POST /orders -> order-service -> 201
[Gateway] GET /users -> user-service -> 502
```

#### Centralized Error Handling (Part D)
When an upstream service is stopped, unreachable, or times out, the reverse-proxy error interceptor prevents gateway crashes or connection hangs, returning a standardized HTTP 502 payload:
```json
{
  "error": "Bad Gateway",
  "message": "User Service is currently unavailable"
}
```

---

### 43. Docker Compose & Network Isolation (Part E)

In `compose.yaml`, the microservice architecture boundary is strictly enforced:
- **`api-gateway`**: Binds port `3000:3000` to the external host as the single public entry point.
- **`user-service`**, **`product-service`**, **`order-service`**, and **`mongodb`**: Host port bindings (`ports:`) are removed. Instead, `expose: ["3001"]`, `expose: ["3002"]`, `expose: ["3003"]`, and `expose: ["27017"]` are used, making them accessible exclusively within the internal `campus-network`.
- **`mongodb`**: Uses persistence volume `campus-mongo-data` and communicates exclusively on internal network.

To start the Lab 7 system:
```bash
docker compose up -d --build
```

To verify container statuses and isolated ports:
```bash
docker compose ps
```

Output:
```text
NAME              IMAGE                         COMMAND                  PORTS
api-gateway       lab725-9-26-api-gateway       "npm start"              0.0.0.0:3000->3000/tcp
mongodb           mongo:latest                  "docker-entrypoint.sh"   27017/tcp
order-service     lab725-9-26-order-service     "npm start"              3003/tcp
product-service   lab725-9-26-product-service   "npm start"              3002/tcp
user-service      lab725-9-26-user-service      "npm start"              3001/tcp
```

---

### 44. Local Automated Verification (Part G)

An automated end-to-end test suite (`test-api-gateway.js`) tests all 13 core requirements across health, users, products, orders, negative scenarios, fault tolerance, and automatic recovery.

Run the test suite:
```bash
node test-api-gateway.js
```

#### Test Execution Summary
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

---

### 45. Cloud Deployment Blueprint (Render / PaaS)

> **Cloud Deployment Status**: **Pending manual deployment.**  
> The Infrastructure-as-Code blueprint (`render.yaml`), container Dockerfiles, and automated cloud verification script (`test-cloud-gateway.js`) are fully prepared and validated. Actual public deployment is pending connecting the GitHub repository to the Render dashboard. No live public Gateway URL has been provisioned yet.

For cloud deployment, the project includes a complete Infrastructure-as-Code specification (`render.yaml`) that defines Docker container web services on Render.

#### Deployment Architecture on Cloud

```text
 ┌─────────────────────────────────────────────────────────────┐
 │                      PUBLIC INTERNET                        │
 └──────────────────────────────┬──────────────────────────────┘
                                │ HTTPS Requests
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │                Render Cloud: api-gateway                    │
 │        (https://<YOUR-GATEWAY-URL>.onrender.com [Pending])  │
 └──────────────┬───────────────┬───────────────┬──────────────┘
                │               │               │
      USER_SERVICE_URL  PRODUCT_SERVICE_URL  ORDER_SERVICE_URL
                │               │               │
                ▼               ▼               ▼
         ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
         │user-service │ │product-svc  │ │order-service│
         └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
                │               │               │
                └───────────────┼───────────────┘
                                │ Mongoose TLS Connection
                                ▼
                 ┌─────────────────────────────┐
                 │    MongoDB Atlas Cluster    │
                 │   (user_db, product_db,     │
                 │          order_db)          │
                 └─────────────────────────────┘
```

#### Steps to Deploy to Render:
1. Push this repository to GitHub or GitLab.
2. In the Render Dashboard, select **New -> Blueprint** and connect your repository.
3. Render reads `render.yaml` and parses the 4 Docker container definitions.
4. Set the environment variable `MONGODB_URI` for each microservice using your MongoDB Atlas connection string.
5. If using Render's free tier (which limits concurrent free web services), deploy the **API Gateway + User Service** chain to demonstrate functional cloud reverse proxying, per assignment Part J guidelines.
6. Once deployed, run the automated verification script against the live cloud URL:
   ```bash
   node test-cloud-gateway.js <YOUR_RENDER_GATEWAY_URL>
   ```

---

### 46. Postman Collection for Lab 7

The collection file `Microservices – Lab 7.postman_collection.json` contains structured requests organized into 7 folders:
1. `1. Gateway`: `GET /health`
2. `2. User Routes`: `GET /users`, `GET /users/:id`, `POST /users`, `PUT /users/:id`, `DELETE /users/:id`
3. `3. Product Routes`: `GET /products`, `GET /products/:id`, `POST /products`, `PUT /products/:id`, `DELETE /products/:id`
4. `4. Order Routes`: `GET /orders`, `GET /orders/:id`, `POST /orders`
5. `5. Negative Tests`: Gateway 404, Upstream 404, Validation 400
6. `6. Resilience Tests`: Unreachable service 502 Bad Gateway
7. `7. Cloud Gateway Tests`: Cloud health, collection queries, and end-to-end order placement

All requests parameterize the host as `{{GATEWAY_URL}}`. Switching between local testing (`http://localhost:3000`) and cloud testing (`https://<YOUR-CLOUD-GATEWAY-URL>.onrender.com`) is achieved by simply updating the collection variable.

---

### 47. Lab 7 Troubleshooting Guide

- **API Gateway returns 502 Bad Gateway on `/users`**:
  - Verify that `user-service` is running: `docker compose ps`.
  - Verify that `USER_SERVICE_URL=http://user-service:3001` is passed to `api-gateway`.
  - Check gateway logs: `docker compose logs api-gateway`.
- **Order Service returns 503 during `POST /orders`**:
  - Verify that both `user-service` and `product-service` are running and connected to MongoDB Atlas.
  - Test inter-service connectivity: `docker compose logs order-service`.
- **DNS Resolution Error with MongoDB Atlas inside Docker**:
  - Ensure `dns.setServers(['8.8.8.8', '8.8.4.4'])` is active in `server.js` to ensure Atlas SRV lookups resolve over IPv4.
- **Port Conflict on Port 3000**:
  - Stop any existing service on port 3000 or adjust `GATEWAY_PORT=3004` in `.env` and `compose.yaml`.

---

### 48. Production / Cloud Deployment Configuration

The CampusConnect microservices architecture supports three distinct runtime environments without requiring a single line of code modification:

1. **Local Host Development**:
   - Each service runs directly on the developer's workstation using Node.js.
   - The API Gateway runs on `http://localhost:3000`.
   - Upstream services run on `http://localhost:3001`, `http://localhost:3002`, and `http://localhost:3003`.
   - `localhost` is **strictly an environment-specific network loopback** address and is NEVER used for container-to-container or cloud communication.

2. **Docker Compose Network (`campus-network`)**:
   - Services run in isolated Linux containers sharing a private bridge network.
   - Container-to-container traffic uses **Docker Internal Service DNS Names** instead of localhost:
     - Gateway -> User Service: `http://user-service:3001`
     - Gateway -> Product Service: `http://product-service:3002`
     - Gateway -> Order Service: `http://order-service:3003`
     - Order Service -> User Service: `http://user-service:3001`
     - Order Service -> Product Service: `http://product-service:3002`
   - Perimeter isolation prevents external access to backend ports 3001, 3002, and 3003. Only port 3000 (API Gateway) is bound to the host.

3. **Cloud Deployment (e.g. Render / Container PaaS)**:
   - Each service is deployed as a managed container web service.
   - Dynamic port binding is enforced via `process.env.PORT` across all services.
   - The API Gateway is exposed to the public internet via its assigned cloud domain (e.g., `https://campusconnect-gateway.onrender.com`).
   - Upstream service locations are supplied via cloud environment variables, completely replacing local or Docker service addresses.

#### Safe Environment Variable Mapping Matrix

| Environment Variable | Service Scope | Local Host Development | Docker Compose (`campus-network`) | Production Cloud (Render) |
| :--- | :--- | :--- | :--- | :--- |
| `PORT` | All Services | `3000`, `3001`, `3002`, `3003` | `3000`, `3001`, `3002`, `3003` | Provided dynamically by platform (e.g., `10000`) |
| `CORS_ORIGIN` | All Services | `http://localhost:5173` or `*` | `*` | `https://your-frontend-domain.com` or `*` |
| `USER_SERVICE_URL` | Gateway & Order | `http://localhost:3001` | `http://user-service:3001` | `https://campusconnect-user-service.onrender.com` |
| `PRODUCT_SERVICE_URL` | Gateway & Order | `http://localhost:3002` | `http://product-service:3002` | `https://campusconnect-product-service.onrender.com` |
| `ORDER_SERVICE_URL` | Gateway | `http://localhost:3003` | `http://order-service:3003` | `https://campusconnect-order-service.onrender.com` |
| `MONGODB_URI` | User Service | `mongodb://localhost:27017/user_db` | `mongodb://mongodb:27017/user_db` | `mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/user_db` |
| `MONGODB_URI` | Product Service | `mongodb://localhost:27017/product_db` | `mongodb://mongodb:27017/product_db` | `mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/product_db` |
| `MONGODB_URI` | Order Service | `mongodb://localhost:27017/order_db` | `mongodb://mongodb:27017/order_db` | `mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/order_db` |
| `GATEWAY_URL` | Client / Tests | `http://localhost:3000` | `http://localhost:3000` | `https://<YOUR-GATEWAY-URL>.onrender.com` |

---

### 49. Written Reflection (Lab 7)

Introducing an API Gateway and containerized cloud deployment fundamentally transformed our architecture from an internal set of disjointed microservices into a coherent, production-ready enterprise system. In Lab 6, clients were forced to manage multiple backend ports and had direct exposure to internal network topologies, which created tight coupling and significant security vulnerabilities. By centralizing entry points through the API Gateway, we established an architectural security perimeter that shields backend containers, unifies request logging, and standardizes failure handling with clean 502/503 responses. Furthermore, externalizing service locations into a configuration-based service registry eliminated hard-coded dependencies, allowing our microservice endpoints to transition seamlessly from local Docker bridge networks to cloud environments without altering application code.
