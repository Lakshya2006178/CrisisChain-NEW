# CrisisChain

> A full-stack disaster-management and emergency-response coordination platform built with React, Node.js/Express, and MySQL.

---

## Problem Statement

When a natural disaster or public emergency occurs, the response effort is fragmented across multiple agencies — hospitals, fire departments, police, and NGOs — each working in isolation with no shared situational awareness. Incident reports come in through scattered channels, resources are allocated by phone call, and there is no single place where an administrator can see the complete picture.

**CrisisChain** solves this by providing a unified web platform where:
- Citizens can submit emergency reports from any device.
- Administrators can see all active incidents on a live map, assign responders, and track progress.
- Responders can accept assignments, update their status, and log field notes.
- Hospital and resource managers can monitor available stock and equipment.
- Every action is recorded in an append-only audit log so nothing is ever lost.

---

## Main Features

| Feature | Description |
|---|---|
| 🚨 Citizen Reporting | Public incident submission form with GPS coordinates, type, and priority |
| 🗺️ Live Alerts Map | Real-time map of all active incidents with status colour-coding |
| 👮 Responder Assignment | Admin assigns available responders to incidents with one click |
| 📦 Resource Tracking | Stock view across all centers (ICU beds, ambulances, fire engines, etc.) |
| 📋 Incident Audit Log | Append-only diary of every status change and field note |
| 🔔 Notifications | Per-user alert bell with read/unread tracking |
| 📊 Analytics Dashboard | Incident counts, resolution times, and resource utilisation charts |
| 🏢 Organization Management | CRUD for hospitals, fire depts, police units, and NGOs |
| 👤 User Management | Activate / deactivate accounts; role-based access (admin / responder / hospital / citizen) |
| 📍 Responder GPS Trail | Breadcrumb location history for each responder on a job |

---

## Technology Stack

### Frontend
- **React 19** + **Vite 8** (component library and dev server)
- **Tailwind CSS 4** (utility-first styling)
- **React Router 7** (client-side routing)
- **Leaflet / React-Leaflet** (interactive maps)
- **Recharts** (analytics charts)
- **Axios** (HTTP client)
- **Lucide React** (icon library)

### Backend
- **Node.js** (runtime)
- **Express 4** (REST API framework)
- **mysql2** (MySQL connection pool with Promises)
- **jsonwebtoken** (JWT authentication)
- **bcryptjs** (password hashing)
- **dotenv** (environment variable loading)
- **cors** (cross-origin request handling)
- **nodemon** (auto-restart in development)

### Database
- **MySQL 8.0** — 12-table relational schema (see [Database Overview](#database-overview))

---

## Project Structure

```
CRISISCHAIN-MY/
├── src/                        # React frontend source
│   ├── api/                    # Axios wrappers for backend API calls
│   ├── components/             # Reusable UI components
│   │   └── panels/             # Dashboard panel components
│   ├── constants.js            # Shared constants
│   ├── context/                # React context providers
│   ├── lib/                    # Utility helpers (geo, incident types)
│   └── pages/                  # Full page components
│
├── server/                     # Node.js / Express backend
│   ├── config/
│   │   └── db.js               # MySQL connection pool
│   ├── controllers/            # Business logic (one file per domain)
│   ├── db/
│   │   ├── schema.sql          # Creates all 12 tables (run once)
│   │   ├── seed.sql            # Inserts demo data
│   │   ├── reset.sql           # ⚠️ Drops all tables (manual use only)
│   │   └── practice_queries.sql # Learning / demo queries for Workbench
│   ├── middleware/
│   │   └── auth.js             # JWT verification middleware
│   ├── routes/                 # Express route files (one per domain)
│   ├── index.js                # Entry point — mounts routes, starts server
│   ├── package.json            # Backend dependencies
│   └── .env.example            # Template for server/.env
│
├── docs/
│   └── old/                    # Archived old schema and design docs
│
├── package.json                # Frontend dependencies
├── .env.example                # Template for root .env
├── setup.md                    # ← Full setup instructions (read this first)
├── WORKFLOW.md                 # Development workflow notes
└── README.md                   # This file
```

---

## Database Overview

The MySQL schema has **12 tables** organised into four groups:

```
Users & Organisations          Incidents
─────────────────────          ─────────
organization                   incident_type
users                          incident
authority_profile              incident_assignment
                               incident_report_log

Resources                      Supporting
─────────                      ──────────
resource_center                authority_live_location
resource                       notification
incident_resource_allocation
```

**Key design decisions:**

- `incident` auto-starts at ID 1001 so the UI can display `AL-1001` etc.
- `incident_resource_allocation` allows re-allocation after release (the `uq_incident_resource` unique constraint was intentionally removed — see schema comments).
- `incident_report_log` is append-only: the backend never runs UPDATE or DELETE on it.
- All coordinate columns have `CHECK` constraints bounding them to valid lat/lon ranges.
- Status ENUMs (`Reported → Assigned → InProgress → Resolved`) match the frontend button labels exactly (the UI sends `'InProgress'`, not `'Responding'`).

---

## Setup Guide

See **[setup.md](./setup.md)** for the full step-by-step instructions, including:

- Starting MySQL on Windows
- Creating the database and user
- Importing schema and seed data
- Setting up environment variables
- Installing and starting both the backend and frontend
- Resetting the database (danger zone)
- Troubleshooting common errors

---

## How to Run

**Quick start (after first-time setup is complete):**

```bash
# Terminal 1 — Backend (from project root)
cd server
npm run dev
# → Runs on http://localhost:5001

# Terminal 2 — Frontend (from project root)
npm run dev
# → Runs on http://localhost:5173
```

Health check:
```bash
curl http://localhost:5001/api/health/db
# → {"status":"ok","message":"MySQL connected"}
```

---

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@crisischain.com` | `CrisisDemo@123` |
| Citizen | `asha@example.com` | `CrisisDemo@123` |
| Responder | `ravi.paramedic@example.com` | `CrisisDemo@123` |
| Hospital | `anil.kmc@example.com` | `CrisisDemo@123` |

---

## Development Status

| Layer | Status |
|-------|--------|
| Database schema (12 tables) | ✅ Complete |
| Seed data | ✅ Complete |
| Backend — Auth | 🔄 In progress (Phase 2) |
| Backend — Incidents / Alerts | 🔄 In progress (Phase 2) |
| Backend — Resources | 🔄 In progress (Phase 2) |
| Backend — Organizations | 🔄 In progress (Phase 2) |
| Frontend pages | ⚠️ Built with mock data (Phase 3 wiring) |

---

## Author

**Lakshya** — Solo developer, working independently.  
Project started as a DBMS course project; extended into a full-stack portfolio application.
