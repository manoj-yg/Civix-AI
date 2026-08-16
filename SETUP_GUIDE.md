# CIVIX AI: Step-by-Step Setup Guide & Complete Project Documentation

Welcome to the **CIVIX AI Infrastructure Intelligence Platform**. This document provides the complete, step-by-step instructions to configure, connect the database, set up environment variables, run migrations, and launch both the backend and frontend applications.

---

## 1. Prerequisites & Required Tools

Ensure the following tools are installed on your machine before beginning setup:

- **Python 3.12** or **3.11**
- **Node.js 20+** and **npm**
- **PostgreSQL 15+** with **PostGIS 3+** extension
- **Redis Server** (or running via Docker / WSL)
- *(Optional for Containerized Execution)*: **Docker Desktop**

---

## 2. Manual Action Items Checklist

Follow this checklist step-by-step:

- [ ] **Step 1**: Create PostgreSQL Database `civix_ai_db` & Enable `postgis` extension.
- [ ] **Step 2**: Create and update `backend/.env` with your database credentials.
- [ ] **Step 3**: Create Python virtual environment (`venv`) and install `requirements.txt`.
- [ ] **Step 4**: Run database migrations using Alembic (`alembic upgrade head`).
- [ ] **Step 5**: Start Redis server on `localhost:6379`.
- [ ] **Step 6**: Launch FastAPI Backend Server (`python app/main.py`).
- [ ] **Step 7**: Launch Async Background AI Worker (`python -m app.workers.tasks`).
- [ ] **Step 8**: Install and launch Frontend Vite App (`npm install && npm run dev` in `frontend/`).

---

## 3. Environment Variables Reference (`backend/.env`)

Below is the complete reference of all environment variables used by the application and **where to get each value**:

| Variable Name | Example / Default Value | Where to Get / How to Generate |
| :--- | :--- | :--- |
| `PROJECT_NAME` | `CIVIX AI Infrastructure Intelligence Platform` | Project title string. |
| `VERSION` | `2.0.0` | Default application version. |
| `ENVIRONMENT` | `development` | Set `development` locally or `production` on server. |
| `DEBUG` | `true` | Set `false` in production environments. |
| `MODEL_VERSION` | `yolov8` | Set `yolov8` for default or `v2` for upgraded pipeline. |
| **`JWT_SECRET`** | `civix_ai_super_secret_jwt_key_2026` | Generate via: `python -c "import secrets; print(secrets.token_hex(32))"`. |
| `JWT_ALGORITHM` | `HS256` | Standard JWT signing algorithm. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `10080` | Token validity in minutes (7 days = 10080). |
| `RATE_LIMIT_PER_MINUTE` | `120` | Max requests allowed per IP/minute. |
| `MAX_FILE_SIZE_BYTES` | `52428800` | Max file upload limit in bytes (50 MB). |
| **`POSTGRES_SERVER`** | `localhost` | PostgreSQL host IP or hostname. |
| **`POSTGRES_PORT`** | `5432` | Standard PostgreSQL port. |
| **`POSTGRES_USER`** | `postgres` | Your PostgreSQL username (default: `postgres`). |
| **`POSTGRES_PASSWORD`** | `postgrespassword` | **Your local PostgreSQL superuser password**. |
| **`POSTGRES_DB`** | `civix_ai_db` | Database name created in PostgreSQL. |
| **`REDIS_URL`** | `redis://localhost:6379/0` | Running Redis server connection string. |
| `STORAGE_TYPE` | `local` | Set `local` for disk storage or `s3` for AWS S3. |
| `STORAGE_DIR` | `temp/uploads` | Local directory path to store uploaded images. |
| `BLOCKCHAIN_ENABLED` | `true` | Enables/disables blockchain audit logging. |
| `BLOCKCHAIN_PROVIDER` | `mock` | Set `mock` for local dev, or `web3` for EVM RPC node. |
| `BLOCKCHAIN_RPC_URL` | `http://127.0.0.1:8545` | EVM RPC node URL (Ganache / Hardhat / Anvil). |
| `BLOCKCHAIN_CONTRACT_ADDRESS` | `0x5FbDB2315678...` | Deployed `InspectionAudit.sol` contract address. |
| `LLM_PROVIDER` | `mock` | Set `mock`, `openai`, `anthropic`, or `local`. |
| `LLM_API_KEY` | `sk-...` | *(Optional)* Get from [OpenAI Platform](https://platform.openai.com) or [Anthropic Console](https://console.anthropic.com). |
| `ENABLE_EMAIL` | `false` | Set `true` to enable email alerts. |
| `SMTP_SERVER` | `smtp.gmail.com` | SMTP host (Gmail / SendGrid / AWS SES). |
| `SENDER_EMAIL` | `notifications@yourdomain.com` | Sender email address. |
| `SENDER_PASSWORD` | `xxxx xxxx xxxx xxxx` | SMTP App Password (generated via Google Account App Passwords). |

> **Note**: If PostgreSQL is not installed locally, the backend automatically uses an **in-memory SQLite fallback** so you can run and test immediately without blocking!

---

## 4. Step-by-Step Local Setup Guide

### Step 1: Create Database & PostGIS Extensions
Open **psql** terminal or **pgAdmin** and run the following SQL statements:

```sql
-- 1. Create target database
CREATE DATABASE civix_ai_db;

-- 2. Connect to the database
\c civix_ai_db;

-- 3. Enable PostGIS spatial extension
CREATE EXTENSION IF NOT EXISTS postgis;
```

---

### Step 2: Configure Environment File (`backend/.env`)
Create or edit `backend/.env` with your actual settings:

```env
PROJECT_NAME="CIVIX AI Infrastructure Intelligence Platform"
VERSION="2.0.0"
ENVIRONMENT="development"
DEBUG=true
MODEL_VERSION="yolov8"

JWT_SECRET="civix_ai_super_secret_jwt_key_2026_change_in_prod"
JWT_ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=10080

POSTGRES_SERVER="localhost"
POSTGRES_PORT="5432"
POSTGRES_USER="postgres"
POSTGRES_PASSWORD="YOUR_ACTUAL_POSTGRES_PASSWORD"
POSTGRES_DB="civix_ai_db"

REDIS_URL="redis://localhost:6379/0"

STORAGE_TYPE="local"
BLOCKCHAIN_ENABLED=true
BLOCKCHAIN_PROVIDER="mock"

LLM_PROVIDER="mock"
ENABLE_EMAIL=false
```

---

### Step 3: Set Up Backend Virtual Environment

Open a PowerShell terminal:

```powershell
# Navigate to backend directory
cd backend

# Create Python virtual environment
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Upgrade pip and install dependencies
pip install --upgrade pip
pip install -r requirements.txt
```

---

### Step 4: Run Database Migrations

Apply database schemas using Alembic:

```powershell
# Run from backend directory (with venv activated)
alembic upgrade head
```

---

### Step 5: Run Automated Test Suite

Run the full test suite to verify everything is functioning:

```powershell
pytest
```

Expected Output:
```text
====================== 29 passed, 44 warnings in 25.11s =======================
```

---

### Step 6: Start FastAPI Backend Server & Worker

#### Terminal 1 — FastAPI Server:
```powershell
cd backend
.\venv\Scripts\Activate.ps1
python app/main.py
```
- Interactive API Docs: **[http://localhost:8000/docs](http://localhost:8000/docs)**
- Health Probe: **[http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)**

#### Terminal 2 — Async Worker Task:
```powershell
cd backend
.\venv\Scripts\Activate.ps1
python -m app.workers.tasks
```

---

### Step 7: Set Up & Launch Frontend

Open a new PowerShell terminal:

```powershell
# Navigate to frontend directory
cd frontend

# Install Node.js dependencies
npm install

# Start Vite React development server
npm run dev
```

- Frontend App: **[http://localhost:5173](http://localhost:5173)**

---

## 5. Alternative 1-Command Docker Setup

If you prefer containerized deployment:

```powershell
cd backend

# Build and start Backend, Worker, Redis, and PostgreSQL+PostGIS containers
docker-compose up --build -d
```

---

## 6. API Route Summary (`/api/v1/`)

| Category | Endpoint | Method | Description |
| :--- | :--- | :--- | :--- |
| **Health** | `/api/v1/health` | `GET` | Service status |
| **Health** | `/api/v1/health/ready` | `GET` | Readiness probe (DB & AI load status) |
| **Auth** | `/api/v1/auth/register` | `POST` | User registration |
| **Auth** | `/api/v1/auth/login` | `POST` | JWT Authentication |
| **Inspections** | `/api/v1/inspections` | `POST` | Create inspection with GPS coordinates |
| **Inspections** | `/api/v1/inspections/{id}/media` | `POST` | Upload image/video & queue AI job |
| **Job Polling** | `/api/v1/jobs/{job_id}` | `GET` | Poll background AI job status |
| **GIS** | `/api/v1/gis/nearby-defects` | `GET` | PostGIS spatial radius query |
| **GIS** | `/api/v1/gis/severity-heatmap` | `GET` | Weighted GIS heatmap points |
| **Reports** | `/api/v1/reports/pdf/{inspection_id}` | `GET` | Download PDF engineering report |
| **Blockchain** | `/api/v1/blockchain/verify/{inspection_id}` | `GET` | SHA-256 on-chain hash verification |
| **Admin** | `/api/v1/admin/stats` | `GET` | System dashboard metrics |
