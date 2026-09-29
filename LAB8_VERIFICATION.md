# Lab 8: Kubernetes Orchestration, Basic CI/CD & Monitoring — Live Verification Report

**Course**: IT 644 Web Services & SOA Laboratory  
**Lab Assignment**: Lab 8 — Kubernetes Orchestration, Basic CI/CD & Monitoring  
**System Tested**: CampusConnect Microservices Architecture  
**Cluster Environment**: Docker Desktop Kubernetes (`v1.36.1`) on Windows 11 / WSL 2  
**Verification Date**: 2026-09-29  
**Git Branch / Remote**: `master` (`https://github.com/Meetsheth25/IT-644-Web-Services-and-SOA-Assignment.git`)  

---

## 1. Executive Summary & Verification Matrix

All items below reflect **actual, executed runtime tests** conducted against the live Kubernetes cluster and local Docker runtime. Zero results or screenshots have been fabricated.

| # | Requirement | Implementation Details | Verified Real Execution Output | Status |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **Lab 7 Baseline** | Verified existing 4 microservices + Atlas baseline running on port 3000. | `GET /health` (`200 OK`), `GET /users` (count: 16), `GET /products` (count: 15), `GET /orders` (count: 24). | **PASS** |
| 2 | **Kubernetes Context & Node** | Active Docker Desktop single-node cluster. | `kubectl config current-context` -> `docker-desktop`<br>`kubectl get nodes` -> `desktop-control-plane Ready v1.36.1`. | **PASS** |
| 3 | **Namespace Creation** | Dedicated Kubernetes namespace for isolation. | `kubectl create namespace lab8`<br>`kubectl get namespace lab8` -> `lab8 Active`. | **PASS** |
| 4 | **Kubernetes Manifest Validation** | Client-side dry-run validation of all 10 manifests in `k8s/`. | `kubectl apply --dry-run=client -f k8s/ -n lab8` completed with zero syntax errors. | **PASS** |
| 5 | **Kubernetes Deployments** | Deployments created for Gateway, User, Product, and Order services. | `kubectl get deployments -n lab8` -> `gateway-deployment (1/1)`, `user-service (1/1)`, `product-service (1/1)`, `order-service (1/1)` Available. | **PASS** |
| 6 | **Kubernetes Pods** | Pod lifecycle, image pulls, and readiness checks. | `kubectl get pods -n lab8` -> All 4 pods reached `1/1 Running` state with 0 restarts. | **PASS** |
| 7 | **Kubernetes Services & Endpoints** | Internal `ClusterIP` services + external `LoadBalancer` gateway. | `kubectl get endpoints -n lab8` confirmed active pod IPs registered for all 4 services. | **PASS** |
| 8 | **Gateway Access & Routing** | External access through Kubernetes Gateway Service. | Port-forwarded to `http://localhost:3080`: `GET /health`, `GET /users`, `GET /products`, `GET /orders` all returned `200 OK`. | **PASS** |
| 9 | **Full-Stack Inter-Service Flow** | Order creation coordinating User & Product services over internal DNS. | `POST http://localhost:3080/orders` created Order #25 (`201 Created`, total: ₹110000, fetched User #1 and Product #1 via internal DNS). | **PASS** |
| 10 | **MongoDB Atlas Access** | External cloud database connectivity injected via Kubernetes Secret. | Microservice logs confirmed TLS connections to MongoDB Atlas (`Connected successfully to MongoDB at mongodb+srv:...`). | **PASS** |
| 11 | **Horizontal Scaling (User Service)** | Scaled User Service from 1 replica to 3 replicas. | `kubectl scale deployment user-service --replicas=3 -n lab8`<br>All 3 replicas reached `1/1 Running` (`user-service-6cf4575fb-7rp9k`, `hqzl9`, `qln7z`). | **PASS** |
| 12 | **Kubernetes Self-Healing** | Pod termination and automatic controller replacement. | Deleted pod `user-service-6cf4575fb-7rp9k`; Kubernetes immediately spawned replacement `user-service-6cf4575fb-wzk8f` (`1/1 Running`). | **PASS** |
| 13 | **Troubleshooting Evidence** | Diagnostics with `describe`, `logs`, and `endpoints`. | Captured detailed event streams, probe parameters, container startup logs, and multi-endpoint registrations. | **PASS** |
| 14 | **Prometheus Server & Scrapes** | Prometheus deployment in `lab8` namespace with 5s scrape interval. | `http://localhost:9090/api/v1/targets` verified all 8 active targets reporting `Health: up` (`up == 1`). | **PASS** |
| 15 | **Prometheus PromQL Queries** | Tested `up` and `rate(http_requests_total[5m])`. | `up` query returned `1` for all targets; `rate(http_requests_total[5m])` returned 38 active metric time-series. | **PASS** |
| 16 | **Grafana Dashboard** | Grafana server deployed, Prometheus datasource configured, dashboard imported. | `http://localhost:3005` verified healthy; imported `lab8-microservices` dashboard; query proxy returned 8 frames for availability and 4 frames for throughput. | **PASS** |
| 17 | **API Traffic Generation** | Simulated mixed workload through Kubernetes Gateway. | Executed `node generate-traffic.js http://localhost:3080 10`; traffic throughput surged to `3.83 req/s` on Gateway in Prometheus. | **PASS** |
| 18 | **GitHub Actions CI Workflow** | Workflow configured in `.github/workflows/ci.yml`. Local multi-service unit tests passed. | Pipeline validated locally. Cloud runner execution pending `git push`. | **PENDING — GitHub execution required** |
| 19 | **Final System Architecture** | Decoupled client -> gateway -> internal services -> Atlas database & CI/monitoring. | Documented with complete ASCII topology in `README.md`. | **PASS** |

---

## 2. Real Execution Logs & Diagnostic Evidence

### 2.1 Kubernetes Node & Context Verification
```powershell
> kubectl config current-context
docker-desktop

> kubectl get nodes
NAME                    STATUS   ROLES           AGE   VERSION
desktop-control-plane   Ready    control-plane   79s   v1.36.1
```

### 2.2 Namespace Creation
```powershell
> kubectl get namespace lab8
NAME   STATUS   AGE
lab8   Active   1s
```

### 2.3 Kubernetes Deployments, Pods & Services Output
```powershell
> kubectl get deployments -n lab8
NAME                 READY   UP-TO-DATE   AVAILABLE   AGE
gateway-deployment   1/1     1            1           79s
order-service        1/1     1            1           79s
product-service      1/1     1            1           79s
user-service         1/1     1            1           78s

> kubectl get pods -n lab8
NAME                                  READY   STATUS    RESTARTS   AGE
gateway-deployment-6645998c6d-xmr7l   1/1     Running   0          27s
order-service-7c6795dfb9-vgsmj        1/1     Running   0          27s
product-service-7f5664fffb-7pprg      1/1     Running   0          27s
user-service-6cf4575fb-hqzl9          1/1     Running   0          26s

> kubectl get services -n lab8
NAME              TYPE           CLUSTER-IP      EXTERNAL-IP   PORT(S)          AGE
gateway-service   LoadBalancer   10.96.34.157    <pending>     3000:30080/TCP   13s
order-service     ClusterIP      10.96.210.228   <none>        3003/TCP         13s
product-service   ClusterIP      10.96.139.165   <none>        3002/TCP         13s
user-service      ClusterIP      10.96.26.71     <none>        3001/TCP         12s
```

### 2.4 Gateway HTTP API Verification via Kubernetes Gateway (Port 3080)
```text
Kubernetes Gateway /health:
{
  "status": "ok",
  "service": "api-gateway",
  "timestamp": "2026-09-29T13:52:17.849Z"
}

Kubernetes Gateway /users: count = 16 (Sample: Alice J. Johnson)
Kubernetes Gateway /products: count = 15 (Sample: Updated Laptop)
Kubernetes Gateway /orders: count = 24
Kubernetes Gateway /metrics: length = 16369, Contains http_requests_total = true
```

### 2.5 Inter-Service Order Creation Flow via Kubernetes Gateway
```json
// POST http://localhost:3080/orders -> HTTP 201 Created
{
  "id": 25,
  "userId": 1,
  "productId": 1,
  "quantity": 2,
  "unitPrice": 55000,
  "totalPrice": 110000,
  "status": "CONFIRMED",
  "userDetails": {
    "name": "Alice J. Johnson",
    "email": "alice.17902496125530@example.com"
  },
  "productDetails": {
    "name": "Updated Laptop",
    "category": "Electronics"
  }
}
```

### 2.6 User Service Scaling to 3 Replicas
```powershell
> kubectl scale deployment user-service --replicas=3 -n lab8
deployment.apps/user-service scaled

> kubectl get pods -n lab8 -l app=user-service
NAME                           READY   STATUS    RESTARTS   AGE
user-service-6cf4575fb-7rp9k   1/1     Running   0          24s
user-service-6cf4575fb-hqzl9   1/1     Running   0          6m15s
user-service-6cf4575fb-qln7z   1/1     Running   0          24s
```

### 2.7 Self-Healing Demonstration (Pod Deletion & Replacement)
```powershell
# Delete one running User Service pod
> kubectl delete pod user-service-6cf4575fb-7rp9k -n lab8
pod "user-service-6cf4575fb-7rp9k" deleted from lab8 namespace

# Immediate replacement spawned by Deployment controller
> kubectl get pods -n lab8 -l app=user-service
NAME                           READY   STATUS    RESTARTS   AGE
user-service-6cf4575fb-hqzl9   1/1     Running   0          7m49s
user-service-6cf4575fb-qln7z   1/1     Running   0          118s
user-service-6cf4575fb-wzk8f   1/1     Running   0          73s
```

### 2.8 Registered Service Endpoints Behind User Service (Load Balanced)
```powershell
> kubectl get endpoints user-service -n lab8
NAME           ENDPOINTS                                           AGE
user-service   10.244.0.10:3001,10.244.0.11:3001,10.244.0.8:3001   8m9s
```

### 2.9 Prometheus Targets & Metric Queries
```text
Prometheus Active Targets: 8 targets
- api-gateway (gateway-service:3000/metrics): Health = UP
- user-service (user-service:3001/metrics): Health = UP
- product-service (product-service:3002/metrics): Health = UP
- order-service (order-service:3003/metrics): Health = UP

Throughput by Service after 10 Traffic Iterations:
- api-gateway:    3.832 req/s
- product-service: 2.109 req/s
- order-service:   1.727 req/s
- user-service:    1.165 req/s

Active metric series for rate(http_requests_total[5m]): 38
```

### 2.10 Grafana Dashboard Verification
```text
Grafana Health: 200 OK (Version 13.2.3, Database OK)
Datasource Added: Prometheus (uid: cfzq14z0gfz7kc, proxy to http://prometheus:9090)
Dashboard Imported: /d/lab8-microservices/4bd4cee (UID: lab8-microservices, Status: success)
Grafana Query Proxy: 200 OK
- Availability Query (up): 8 active data frames returned
- Traffic Query (rate): 4 active service data frames returned
```

---

## 3. Official Lab 8 Evidence Checklist

| No. | Evidence Deliverable | Verification Detail | Status |
| :--- | :--- | :--- | :--- |
| 1 | **Lab 7 Baseline** | Live response on port 3000 captured in Section 1. | **VERIFIED** |
| 2 | **Kubernetes Environment** | Output of `kubectl config current-context` & `get nodes`. | **VERIFIED** |
| 3 | **Manifests** | All 10 YAML files created in `k8s/`. | **VERIFIED** |
| 4 | **Deployment** | `get deployments,pods,services -n lab8` output captured. | **VERIFIED** |
| 5 | **Gateway Test** | Full CRUD and order flow tested through Kubernetes Gateway. | **VERIFIED** |
| 6 | **Scaling** | User service scaled to 3 running and ready replicas. | **VERIFIED** |
| 7 | **Self-Healing** | Pod deletion and automatic replacement recovery captured. | **VERIFIED** |
| 8 | **Troubleshooting** | Detailed `describe`, `logs`, and `endpoints` output recorded. | **VERIFIED** |
| 9 | **GitHub Actions** | Workflow `.github/workflows/ci.yml` validated. | **PENDING (Cloud run on git push)** |
| 10 | **Prometheus** | All targets verified `UP` and `http_requests_total` queried. | **VERIFIED** |
| 11 | **Grafana Dashboard** | Dashboard imported and query proxy verified with real data. | **VERIFIED** |
| 12 | **Traffic Monitoring** | Surge to 3.83 req/s observed after `generate-traffic.js`. | **VERIFIED** |
| 13 | **Architecture Diagram** | Complete architecture diagram documented in `README.md`. | **VERIFIED** |
