# TrustGraph — Multi-Modal Risk Analysis & Forensics Prototype

TrustGraph is an explainable AI and multi-modal risk analysis prototype engineered for digital artifact forensics, transaction stream risk evaluation, and graph-based collusion detection.

---

## 🛡️ Core Capabilities

* **Multi-Modal Risk Synthesis**: Synthesizes forensic vectors across 4 input modalities (Documents, Images, Websites, Text).
* **Calibrated Machine Learning Inference**: Logistic risk model trained on standardized forensic telemetry with Z-score feature scaling and sigmoid activation.
* **Empirical Benchmarking Engine**: Real-time evaluation against ground-truth validation datasets computing empirical Precision, Recall, F1, Specificity, and ROC-AUC curve points.
* **Explainable AI (Feature Attribution)**: Local SHAP-style positive/negative impact decomposition and actionable counterfactual recommendations ("What-if" improvements).
* **Topological Abuse-Ring Detection**: Graph cycle detection (DFS with recursion stack tracking) and shared-attribute hub centrality analysis for detecting circular collusion networks.
* **Transaction Risk Simulator**: Streaming simulation environment testing 5 attack vector scenarios (`NORMAL_COMMERCE`, `CARD_TESTING_BURST`, `ACCOUNT_TAKEOVER`, `ABUSE_RING_COLLUSION`, `PHISHING_CREDENTIAL_DRAIN`).
* **Cost-Sensitive Loss Optimization**: Financial expected loss calculation \(\mathbb{E}[\text{Loss}] = P(\text{Fraud}) \times \text{Amount} + (\text{Chargeback} \times P(\text{Fraud}))\) and automated tier routing (`APPROVE`, `STEP_UP_KYC`, `MANUAL_REVIEW`, `REJECT_BLOCK`).
* **Deterministic Policy Engine**: Declarative JSON rule evaluation with priority-ordered execution traces.
* **Security Guardrails**: Strict SSRF protection (blocking loopback, RFC 1918 subnets, IPv6 link-local, and cloud metadata), path traversal validation, sliding-window rate limiting, and circuit breaker fault tolerance.

---

## 🏗️ Architecture Overview

```
TrustGraph Architecture
├── Backend (Node.js 20, Express, MongoDB)
│   ├── /src/ml/              # Calibrated ML risk model & empirical metrics evaluator
│   ├── /src/services/        # Multi-modal synthesis, graph rings, explainability, loss engine
│   ├── /src/middlewares/     # Auth, sliding-window rate limit, idempotency, upload security
│   └── /src/utils/           # SSRF validator, circuit breaker, async handlers
└── Frontend (React 19, Vite, TailwindCSS)
    ├── /client/src/pages/    # Multi-modal risk pages, attack simulator, benchmark view
    └── /client/src/components/ # Interactive SVG topology visualizer, navigation, layouts
```

---

## 🚀 Getting Started

### 1. Prerequisites
* Node.js v20+
* MongoDB v7+ (local instance or container)

### 2. Environment Setup
Copy the configuration template:
```bash
cp .env.example .env
```
Fill in your local environment variables in `.env`:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/trustgraph
JWT_SECRET=your_super_secret_jwt_key_here_at_least_32_characters
JWT_EXPIRES_IN=1d
CLIENT_ORIGIN=http://localhost:5173
```

### 3. Install Dependencies
```bash
# Backend dependencies
npm install

# Frontend dependencies
cd client
npm install
cd ..
```

### 4. Running the Application
```bash
# Start backend server (Default: http://localhost:5000)
npm run dev

# Start frontend development server (Default: http://localhost:5173)
cd client
npm run dev
```

---

## 🧪 Testing & Verification

Run the automated backend test suite:
```bash
npm test
```

Build the frontend client:
```bash
cd client
npm run build
```

---

## 📡 API Documentation

Interactive Swagger API documentation is available at:
```
http://localhost:5000/api/docs
```

Prometheus observability metrics:
```
http://localhost:5000/metrics
```

Health check:
```
http://localhost:5000/health
```

---

## 🔒 Security Policy
* **SSRF Protection**: All outbound network calls validate DNS and destination IPs against loopback (`127.0.0.0/8`), private networks (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), link-local metadata (`169.254.0.0/16`), and IPv6 link-local addresses.
* **File Upload Security**: Uploads are restricted by extension whitelist, MIME validation, dangerous script name blocking, and path traversal normalization.
