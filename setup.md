# CrisisChain — Setup Guide

> **Who this guide is for:** A solo developer setting up CrisisChain for the first time on a Windows machine. Every command is copied from the actual project files so there is nothing invented.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Prerequisites](#2-prerequisites)
3. [Clone / Download the Project](#3-clone--download-the-project)
4. [Database Setup (MySQL)](#4-database-setup-mysql)
5. [Environment Variables](#5-environment-variables)
6. [Install Dependencies](#6-install-dependencies)
7. [Run the Application](#7-run-the-application)
8. [Verify Everything Works](#8-verify-everything-works)
9. [Resetting the Database](#9-resetting-the-database-danger-zone)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Project Overview

CrisisChain is a full-stack disaster-management web application built with:

| Layer    | Technology              |
|----------|-------------------------|
| Frontend | React 19 + Vite + Tailwind CSS |
| Backend  | Node.js + Express       |
| Database | MySQL 8                 |
| Auth     | JWT (jsonwebtoken) + bcryptjs |

The backend lives in the `server/` subfolder. The frontend is at the project root.

---

## 2. Prerequisites

Install these tools before anything else.

| Tool | Minimum version | How to check |
|------|----------------|--------------|
| Node.js | v18 or higher | `node -v` |
| npm | v8 or higher | `npm -v` |
| MySQL Server | v8.0 | `mysql --version` |
| MySQL Workbench | any 8.x | (optional but recommended) |
| Git | any | `git --version` |

> **Windows tip:** MySQL Server 8.0 installs to  
> `C:\Program Files\MySQL\MySQL Server 8.0\bin\`  
> Add that folder to your system `PATH` so you can type `mysql` in any terminal.

---

## 3. Clone / Download the Project

```bash
git clone <your-repo-url>
cd CRISISCHAIN-MY
```

Or simply open the folder you already have.

---

## 4. Database Setup (MySQL)

### Step 4.1 — Start the MySQL service

**Windows (Services app):**
1. Press `Win + R`, type `services.msc`, press Enter.
2. Find **MySQL80** in the list.
3. Right-click → **Start**.

**Or from PowerShell (run as Administrator):**
```powershell
Start-Service -Name MySQL80
```

Confirm it is running:
```powershell
Get-Service -Name MySQL80
```
You should see `Status: Running`.

---

### Step 4.2 — Create the database

Open MySQL Workbench (or any MySQL client) and run:

```sql
CREATE DATABASE IF NOT EXISTS crisischain_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

---

### Step 4.3 — Create a MySQL user (optional but recommended)

You can use the `root` account for local development, but creating a dedicated user is safer:

```sql
CREATE USER IF NOT EXISTS 'crisischain_user'@'localhost' IDENTIFIED BY 'YourStrongPassword';
GRANT ALL PRIVILEGES ON crisischain_db.* TO 'crisischain_user'@'localhost';
FLUSH PRIVILEGES;
```

If you use `root`, skip this step and use `root` in your `.env`.

---

### Step 4.4 — Import the schema (creates all 12 tables)

**In MySQL Workbench:**

1. Open a Query tab.
2. Click **File → Open SQL Script**.
3. Navigate to `server/db/schema.sql` and open it.
4. Click the ⚡ (Execute) button (or press `Ctrl+Shift+Enter`).

**Or from the terminal** (run from the project root):
```bash
mysql -u root -p crisischain_db < server/db/schema.sql
```

You will be prompted for your MySQL root password.

Verify the tables were created:
```sql
USE crisischain_db;
SHOW TABLES;
-- Expected: 12 tables
```

---

### Step 4.5 — Import the seed data (demo records)

```bash
mysql -u root -p crisischain_db < server/db/seed.sql
```

Verify (these exact counts only hold for a freshly-imported database — an actively-used install will show higher numbers, which is expected and fine):
```sql
SELECT COUNT(*) FROM incident;        -- expects 7
SELECT COUNT(*) FROM resource_center; -- expects 7
SELECT COUNT(*) FROM users;           -- expects 6
SELECT COUNT(*) FROM organization;    -- expects 8
```

**Demo login for all seeded users:**
- Admin (`admin@crisischain.com`): password `admin123`
- Every other seeded user (`asha@example.com`, `ravi.paramedic@example.com`, `meera.fire@example.com`, `anil.kmc@example.com`, `dsouza.police@example.com`): password `password123`

---

## 5. Environment Variables

### 5.1 — Backend (`server/.env`)

Copy the example file:
```bash
copy server\.env.example server\.env
```

Open `server/.env` and fill in your values:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_actual_mysql_password
DB_NAME=crisischain_db
JWT_SECRET=replace_with_a_long_random_secret_at_least_32_chars
PORT=5001
```

> **JWT_SECRET tip:** Generate a strong secret with:  
> `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`  
> Copy the output into `JWT_SECRET`.

### 5.2 — Frontend (`.env` at project root)

Copy the example file:
```bash
copy .env.example .env
```

The default value is correct for local development — no changes needed:
```env
VITE_API_URL=http://localhost:5001
```

---

## 6. Install Dependencies

You need to install dependencies in **two separate folders**.

### 6.1 — Backend dependencies

```bash
cd server
npm install
```

This installs: `express`, `mysql2`, `jsonwebtoken`, `bcryptjs`, `dotenv`, `cors`, `nodemon`.

### 6.2 — Frontend dependencies

```bash
# From the project root (not inside server/)
npm install
```

This installs React, Vite, Tailwind CSS, Leaflet, Recharts, and all other frontend packages.

---

## 7. Run the Application

You need **two terminal windows** running at the same time.

### Terminal 1 — Backend server

```bash
cd server
npm run dev
```

Expected output:
```
[nodemon] starting...
Server running on port 5001
MySQL connected successfully
```

### Terminal 2 — Frontend (Vite dev server)

```bash
# From the project root
npm run dev
```

Expected output:
```
  VITE v8.x.x  ready in xxx ms
  ➜  Local:   http://localhost:5173/
```

Open `http://localhost:5173` in your browser.

---

## 8. Verify Everything Works

### 8.1 — Backend health check

```bash
curl http://localhost:5001/api/health/db
```

Expected response:
```json
{ "status": "ok", "message": "MySQL connected" }
```

### 8.2 — MySQL Workbench quick checks

Run these queries one at a time:

```sql
-- All 12 tables should appear
SHOW TABLES;

-- Demo incidents (should return 7 rows)
SELECT incident_id, title, incident_status, priority_level FROM incident;

-- Users with their roles (should return 6 rows)
SELECT user_id, full_name, email, role, is_active FROM users;

-- Demo allocation check (should return 3 rows)
SELECT * FROM incident_resource_allocation;
```

---

## 9. Resetting the Database (Danger Zone)

> ⚠️ **This permanently deletes all data. Only do this when you intentionally want a clean slate.**

```bash
mysql -u root -p crisischain_db < server/db/reset.sql
mysql -u root -p crisischain_db < server/db/schema.sql
mysql -u root -p crisischain_db < server/db/seed.sql
```

`reset.sql` drops all 12 tables. `schema.sql` recreates them. `seed.sql` reloads the demo data.

---

## 10. Troubleshooting

### ❌ `Access denied for user 'root'@'localhost'`

Your password in `server/.env` is wrong. Double-check `DB_PASSWORD`.  
Try logging in directly: `mysql -u root -p` — enter your password manually.

---

### ❌ `Error: connect ECONNREFUSED 127.0.0.1:3306`

MySQL is not running. Start the MySQL80 service (see Step 4.1).

---

### ❌ `Unknown database 'crisischain_db'`

You haven't created the database yet. Run Step 4.2.

---

### ❌ `Table 'crisischain_db.incident' doesn't exist`

You haven't run the schema yet. Run Step 4.4.

---

### ❌ `Cannot find module 'express'` or similar

You haven't installed backend dependencies. Run:
```bash
cd server
npm install
```

---

### ❌ `ENOENT: no such file or directory, open '.env'`

The `server/.env` file is missing. Copy it from the example:
```bash
copy server\.env.example server\.env
```
Then fill in your MySQL password and JWT secret.

---

### ❌ Port 5001 already in use

Another process is using port 5001. Find and kill it:
```powershell
netstat -ano | findstr :5001
# Note the PID in the last column, then:
taskkill /PID <pid_number> /F
```
Or change `PORT=5001` in `server/.env` to another port (e.g., `5002`) and restart.

---

### ❌ Vite frontend shows blank page or API errors

1. Make sure the backend is running (Terminal 1).
2. Check that `.env` at the root has `VITE_API_URL=http://localhost:5001`.
3. Check the browser console for the actual error message.

---

*Last updated: 2026-11-23, after a full verification pass. Backend controllers and frontend API integration are complete, not Phase 2 — see `DEMO_SCRIPT.md` and the verification report in `docs/markdown/` for what was actually confirmed working.*
