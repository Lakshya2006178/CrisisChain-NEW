# CRISISCHAIN // COMPLETE ROLE-WISE WEBSITE INSPECTION & WALKTHROUGH MANUAL

**Document Version:** 1.0.0-TACTICAL  
**System Architecture:** Express.js REST API + MySQL 8.0 + Vite React 18 (Tailwind CSS)  
**Inspection Date:** November 2026  
**Inspection Scope:** 100% Read-Only Codebase & Database Verification (Zero Code / Data Alteration)

---

## TABLE OF CONTENTS
1. [Project Overview](#1-project-overview)
2. [Complete List of User Roles](#2-complete-list-of-user-roles)
3. [Complete Route / Page Inventory](#3-complete-route--page-inventory)
4. [Citizen — Full Website Walkthrough](#4-citizen--full-website-walkthrough)
5. [Admin — Full Website Walkthrough](#5-admin--full-website-walkthrough)
6. [Responder — Full Website Walkthrough](#6-responder--full-website-walkthrough)
7. [Organization / Authority (Hospital) — Full Website Walkthrough](#7-organization--authority-hospital--full-website-walkthrough)
8. [Complete Incident Lifecycle](#8-complete-incident-lifecycle)
9. [Complete Resource Management Workflow](#9-complete-resource-management-workflow)
10. [Notifications — Role-wise Explanation](#10-notifications--role-wise-explanation)
11. [Analytics and Reports](#11-analytics-and-reports)
12. [Authentication and Access Control](#12-authentication-and-access-control)
13. [Database and API Mapping](#13-database-and-api-mapping)
14. [Complete Manual Testing Checklist](#14-complete-manual-testing-checklist)
15. [Known Issues and Inconsistencies](#15-known-issues-and-inconsistencies)
16. [Features Requiring Manual Verification](#16-features-requiring-manual-verification)
17. [Final Summary](#17-final-summary)

---

## 1. PROJECT OVERVIEW

CrisisChain is an integrated tactical disaster response, emergency incident dispatch, and logistics coordination platform. It unifies distress signaling from citizens, incident triage and strategic command from emergency administrators, field response deployment by specialized responder units (Fire, Medical, Rescue, Law Enforcement), and critical care asset tracking by healthcare facilities.

### Technology Stack
- **Frontend:** React 18, Vite 5, Tailwind CSS, Lucide React (Tactical iconography), Leaflet / React-Leaflet with CARTO Dark Matter / Positron tiles, Axios with JWT interceptors.
- **Backend:** Node.js, Express.js REST API, JSON Web Token (JWT) session security, Multer local storage engine for incident imagery.
- **Database:** MySQL 8.0 relational database (`crisischain_db`) with transactional integrity, foreign key cascades, and real-time status tracking.
- **Design Language:** High-contrast tactical / cyberpunk aesthetic featuring dark (`#08080A`, `#101114`) and light mode support, neon cyan (`#00FFCC`) tactical accents, alert red (`#FF3366`) warning states, amber (`#FFB800`) dispatch markers, and monospaced telemetry typography (`Outfit`, `JetBrains Mono`).

---

## 2. COMPLETE LIST OF USER ROLES

The database enum in `users.role` strictly defines four operational roles:

| Role Identifier | Display Name | Core Purpose | Access Level |
|---|---|---|---|
| `citizen` | Citizen / Civilian | Report distress incidents, review public danger alerts, request baseline relief supplies, manage profile. | Baseline Public & Civilian Access |
| `admin` | Incident Commander / Admin | Complete system jurisdiction: incident triage, responder dispatching, resource allocation & release, alert broadcasting, user management, hospital resource oversight. | Full Master Superuser Access |
| `responder` | Tactical Field Responder | Accept/reject mission dispatches, transmit status updates (`En Route`, `Arrived`, `Complete Mission`), track agency readiness, review analytics. | Tactical Operational Field Access |
| `hospital` | Healthcare Authority / Facility | Manage hospital assets (ICU beds, general beds, ventilators, oxygen reserves, blood bank units), monitor casualty intake, coordinate medical aid. | Specialized Institutional Healthcare Access |

---

## 3. COMPLETE ROUTE / PAGE INVENTORY

| Path / Route | Component File | Auth Required? | Permitted Roles | Unauthorized Destination | Primary Function |
|---|---|---|---|---|---|
| `/` | `src/pages/LandingPage.jsx` | No | All (Public) | N/A | Landing portal, tactical mission telemetry, rapid incident report launcher. |
| `/login` | `src/pages/LoginPage.jsx` | No | All (Public) | `/alerts` (if logged in) | Dual-mode login (Citizen & Responder authentication). |
| `/register` | `src/pages/SignUpPage.jsx` | No | All (Public) | `/alerts` (if logged in) | Citizen account registration. |
| `/admin` | `src/pages/AdminLogin.jsx` | No | All (Public) | `/dashboard` (if admin) | Dedicated Central Command biometric/credential authentication gate. |
| `/report` | `src/pages/ReportIncident.jsx` | No | All (Public & Auth) | N/A | High-priority SOS emergency incident reporting with interactive map & image upload. |
| `/dashboard` | `src/DashboardMain.jsx` | Yes | `admin` only | `/admin` | Enterprise Central Command dashboard with live KPI counters, incident grids, and telemetry. |
| `/alerts` | `src/pages/Alerts.jsx` | Yes | `admin`, `responder`, `hospital`, `citizen` | `/login` | Unified tactical emergency incident feed, Leaflet map, responder action bar, dispatch modals. |
| `/resources` | `src/pages/ResourceInventory.jsx` | Yes | `admin`, `responder`, `hospital`, `citizen` | `/login` | Logistics & inventory hub, stock tracker, live dispatches, allocation management. |
| `/org` | `src/pages/ResponderOrg.jsx` | Yes | `responder`, `admin` | `/alerts` | Agency profile, responder roster, operational readiness toggles (`Available`, `Busy`, `Offline`). |
| `/hospital-resources` | `src/pages/HospitalResources.jsx` | Yes | `hospital`, `admin` | `/alerts` | Critical care inventory: ICU beds, ventilators, oxygen supplies, blood bank reserves. |
| `/analytics` | `src/pages/Analytics.jsx` | Yes | `admin`, `responder`, `hospital` | `/alerts` | Incident metrics, response resolution rates, responder allocations, logistics utilization. |
| `/settings` | `src/pages/Settings.jsx` | Yes | `admin`, `responder`, `hospital`, `citizen` | `/login` | Account profile, credential updates, theme switcher (Dark/Light), audit logs. |

---

## 4. CITIZEN — FULL WEBSITE WALKTHROUGH

### Post-Login Behavior
- **Landing Destination:** Redirected automatically to `/alerts` (Active Alerts Feed).
- **Sidebar Visibility:** Displays Home (`/`), Active Alerts (`/alerts`), Resource Hub (`/resources`), Report Incident (`/report`), Settings (`/settings`).
- **Hidden / Restricted Routes:** `/dashboard` (redirects to `/admin`), `/org` (redirects to `/alerts`), `/hospital-resources` (redirects to `/alerts`), `/analytics` (redirects to `/alerts`).

### Page Breakdown for Citizen

#### A. Public Landing Page (`/`)
- **Visible Elements:** Hero header with animated radar grid, "REPORT INCIDENT" call-to-action button, live incident statistics counter, tactical system status bar.
- **Interactions:** Clicking "REPORT INCIDENT" navigates directly to `/report`. Clicking "LOGIN" navigates to `/login`.

#### B. Incident Reporting Page (`/report`)
- **Location Selector (`IncidentLocationMap.jsx`):**
  - Search bar with Nominatim OpenStreetMap autocompletion for typing Indian/global addresses.
  - Interactive Leaflet map with draggable crosshair pin. Clicking or dragging dynamically syncs lat/long and triggers reverse geocoding to display street/city address.
  - "USE GPS" button: triggers HTML5 `navigator.geolocation.getCurrentPosition`. Displays accuracy badge (`±Xm accuracy`).
- **Incident Categorization:**
  - Type Dropdown: Flood, Earthquake, Fire, Medical Emergency, Structural Collapse, Cyclone, Industrial Accident.
  - Severity Selector: 4-tier tactical buttons (`Minor`, `Moderate`, `High Danger`, `Life Threatening`).
  - Title & Description Inputs: Free-text incident description.
  - Photographic Evidence: Image uploader with preview supporting JPEG/PNG files.
- **Submission:** Clicking "TRANSMIT EMERGENCY REPORT" calls `POST /api/alerts`. Generates persistent database record in `incident` and `incident_report_log`. Displays confirmation toast and redirects to `/alerts`.

#### C. Active Alerts Page (`/alerts`)
- **What Citizens See:** Complete feed of verified public incidents, severity indicators, status badges (`Reported`, `Assigned`, `Responding`, `Resolved`), interactive Leaflet map with colored threat pins.
- **Restrictions:** Cannot assign responders (Assign Unit button hidden), cannot allocate inventory (Allocate button hidden), cannot change incident status. Can click any alert card to highlight incident location on the map and view response progress.

#### D. Resource Hub (`/resources`)
- **What Citizens See:** Public relief stock overview (food packets, clean water, first aid kits, emergency shelters), list of nearest emergency facilities with distance calculation.
- **Restrictions:** Can request baseline citizen supplies. Cannot dispatch fleet vehicles, allocate restricted inventory, or release allocations.

#### E. Settings Page (`/settings`)
- View and update civilian profile details (Full Name, Phone Number, Emergency Contact).
- Toggle Theme between Cyberpunk Dark Mode (`#08080A`) and Tactical Light Mode.

---

## 5. ADMIN — FULL WEBSITE WALKTHROUGH

### Post-Login Behavior
- **Authentication Gate:** Authenticates via `/admin` (or `/login` with admin credentials).
- **Landing Destination:** Immediately opens `/dashboard` (Enterprise Central Command).
- **Sidebar Visibility:** Unrestricted access to all 8 operational modules: Central Command (`/dashboard`), Active Alerts (`/alerts`), Resource Hub (`/resources`), Report Incident (`/report`), Responder Agency (`/org`), Hospital Management (`/hospital-resources`), Analytics (`/analytics`), Settings (`/settings`).

### Page Breakdown for Admin

#### A. Central Command Dashboard (`/dashboard`)
- **KPI Overview Cards:**
  1. *Total Incidents:* Cumulative database incident count from `COUNT(incident.id)`.
  2. *Active Threats:* Incidents with status NOT in (`Resolved`, `Closed`).
  3. *Responding Units:* Active responders deployed in `incident_assignment` table.
  4. *Available Logistics:* Total unallocated inventory stock from `resource` table.
- **Interactive Map Panel (`MapPanel.jsx`):** High-density tactical map showing all active incidents with color-coded severity rings.
- **Live Incidents Stream (`LiveAlertsPanel.jsx`):** Real-time feed of newly reported distress calls with instant "Triage" action links.
- **Logistics & Deployment Telemetry (`ResourceTrackingPanel.jsx`):** Summary of deployed assets and medical facility bed capacity.

#### B. Tactical Alerts & Incident Dispatch (`/alerts`)
- **Broadcast Modal:** Admin can click "+ Broadcast Alert" to broadcast emergency alerts directly to the entire civilian network.
- **Responder Assignment Modal (`AssignResponderModal.jsx`):**
  - Clicking "+ Assign Unit" on any active incident card opens the dispatch dialog.
  - Fetches registered responders from `GET /api/users?role=responder`.
  - Admin selects responder, specifies unit callsign, deployment notes, and clicks "Confirm Deployment".
  - Calls `POST /api/assignments`. Updates incident status to `Assigned` and sends notification to the assigned responder.
- **Resource Allocation Modal (`AllocateResourceModal.jsx`):**
  - Clicking "+ Allocate Resource" on an incident card opens the allocation dialog.
  - Fetches inventory stock from `GET /api/resources`.
  - Admin selects resource type (e.g., Medical Kits, Rescue Boats), enters allocation quantity (validated against `quantity_available`).
  - Calls `POST /api/allocations`. Atomically decrements `resource.quantity_available`, creates an active allocation row, and notifies stakeholders.
- **Status Override Actions:** Admin can manually mark an incident as `Resolved` or `Investigating` at any time via `PATCH /api/alerts/:id/status`.

#### C. Resource Inventory Hub (`/resources`)
- **Management Capabilities:**
  - Create new inventory items (`POST /api/resources`).
  - Update stock levels and replenish equipment (`PUT /api/resources/:id`).
  - Review active dispatches filterable by `All`, `Active`, and `Released`.
  - Release allocations: clicking "Release Stock" calls `PATCH /api/allocations/:id/release`, which immediately restores stock back to `resource.quantity_available`.

#### D. Hospital Resources Oversight (`/hospital-resources`)
- Admin can audit all connected hospital facilities, view critical ICU bed shortages, oxygen cylinder capacity, and blood bank stock counts across all medical zones.

#### E. Strategic Analytics (`/analytics`)
- Full visual breakdown of incident resolution times, severity distribution charts, responder utilization rates, and logistics burn charts.

---

## 6. RESPONDER — FULL WEBSITE WALKTHROUGH

### Post-Login Behavior
- **Authentication Gate:** Logs in via `/login` with registered Responder credentials.
- **Landing Destination:** Redirected to `/alerts` (Operational Dispatch Feed).
- **Sidebar Visibility:** Active Alerts (`/alerts`), Resource Hub (`/resources`), Report Incident (`/report`), Responder Agency (`/org`), Analytics (`/analytics`), Settings (`/settings`).
- **Hidden / Restricted Routes:** `/dashboard` (redirects to `/admin`), `/hospital-resources` (redirects to `/alerts`).

### Page Breakdown for Responder

#### A. Active Alerts & Mission Execution (`/alerts`)
- **Tactical Mission Action Bar:** When viewing an incident assigned to their unit, a dynamic operational status bar is presented with actionable steps:
  1. *Pending State:* Displays "Accept Mission" and "Reject Mission" buttons.
     - Clicking "Accept Mission" calls `PATCH /api/assignments/:id/status` with `status: 'Accepted'`.
  2. *Accepted State:* Displays "En Route →" button.
     - Clicking "En Route" calls `PATCH /api/assignments/:id/status` with `status: 'EnRoute'`. Incident status updates to `InProgress` (`Responding`).
  3. *En Route State:* Displays "Mark Arrived 📍" button.
     - Clicking "Mark Arrived" calls `PATCH /api/assignments/:id/status` with `status: 'Arrived'`.
  4. *Arrived State:* Displays "Complete Mission ✓" button.
     - Clicking "Complete Mission" prompts completion debrief notes, marks assignment as `Completed`, and updates incident status to `Resolved`.
- **Navigation Aids:** Tactical map pinpoints incident GPS coordinates, displaying turn-by-turn distance from responder base.

#### B. Responder Agency & Roster Page (`/org`)
- **Readiness Toggle:** Responder can switch personal readiness status:
  - `Available` (Green): Ready for dispatch.
  - `Busy` (Amber): Currently deployed on an active incident.
  - `Offline` (Red): Off-duty.
- Calls `PATCH /api/users/profile` or agency status endpoint.
- Displays team member roster, agency equipment allotment, and communication callsigns.

#### C. Analytics Page (`/analytics`)
- Responders can view personal and team response metrics: average response time, total missions resolved, mission success rate.

---

## 7. ORGANIZATION / AUTHORITY (HOSPITAL) — FULL WEBSITE WALKTHROUGH

### Post-Login Behavior
- **Authentication Gate:** Logs in via `/login` with hospital credentials.
- **Landing Destination:** Redirected to `/alerts` (Emergency Medical Feed).
- **Sidebar Visibility:** Active Alerts (`/alerts`), Resource Hub (`/resources`), Report Incident (`/report`), Hospital Management (`/hospital-resources`), Analytics (`/analytics`), Settings (`/settings`).
- **Hidden / Restricted Routes:** `/dashboard` (redirects to `/admin`), `/org` (redirects to `/alerts`).

### Page Breakdown for Hospital Authority

#### A. Hospital Resource Management (`/hospital-resources`)
- **Critical Care Telemetry Cards:**
  - *ICU Beds:* Displays Total, Occupied, and Available ICU beds. Form input allows incrementing/decrementing available beds in real time.
  - *General & Emergency Ward Beds:* Live occupancy counters.
  - *Ventilator Units:* Functional vs In-Use count.
  - *Medical Oxygen Stock:* Metric tonnes / cylinder count with low-stock warnings.
  - *Blood Bank Inventory:* Blood unit counters categorized by blood group (A+, A-, B+, B-, AB+, AB-, O+, O-).
- **Sync Actions:** Clicking "Update Capacity" submits `PUT /api/hospital/resources` to update `hospital_resources` database table. Automatically alerts Central Command if ICU occupancy exceeds 90%.

#### B. Active Alerts Page (`/alerts`)
- Focuses on Mass Casualty Incidents (MCI), road accidents, and industrial hazards requiring emergency trauma intake.

---

## 8. COMPLETE INCIDENT LIFECYCLE

```
[Citizen / Civilian]
       │
       ▼ (1) Reports incident via /report (lat, lng, severity, description, photo)
[incident Table: status='Reported']
       │
       ▼ (2) System notifies Central Command via notification table
[Central Command / Admin]
       │
       ▼ (3) Inspects incident on /alerts or /dashboard; opens AssignResponderModal
[incident_assignment Table: status='Pending', incident.status='Assigned']
       │
       ▼ (4) Real-time notification dispatched to assigned Responder
[Tactical Responder]
       │
       ▼ (5) Accepts dispatch on /alerts (status -> 'Accepted')
       ▼ (6) Departs station (status -> 'EnRoute', incident.status -> 'InProgress' / 'Responding')
       ▼ (7) Reaches location (status -> 'Arrived')
       │
       ├─────────────────── Parallel Logistics Track ───────────────────┐
       │ Admin opens AllocateResourceModal on /alerts; allocates stock   │
       │ resource.quantity_available decremented; allocation logged      │
       │ Logistics delivered to field team                               │
       └─────────────────────────────────────────────────────────────────┘
       │
       ▼ (8) Responder resolves threat and clicks 'Complete Mission ✓'
[incident Table: status='Resolved', incident_assignment.completed_at=NOW()]
       │
       ▼ (9) Notifications sent to Citizen, Admin, and Operations Log
```

### Detailed Execution Trace:

1. **Submission:**
   - **Page:** `/report`
   - **Role:** Citizen or Guest.
   - **Endpoint:** `POST /api/alerts`
   - **Database Impact:** Creates new record in `incident` with status `'Reported'`, records timestamp in `incident_report_log`.
2. **Assignment:**
   - **Page:** `/alerts` (or `/dashboard`)
   - **Role:** Admin.
   - **Action:** Clicks "+ Assign Unit", selects responder from dropdown, submits.
   - **Endpoint:** `POST /api/assignments`
   - **Database Impact:** Inserts row into `incident_assignment` with `status = 'Pending'`. Updates `incident.status = 'Assigned'`. Inserts row into `notification` table for responder.
3. **Responder Acceptance & Movement:**
   - **Page:** `/alerts`
   - **Role:** Responder.
   - **Action:** Responder sees assignment card. Clicks "Accept Mission" -> Clicks "En Route" -> Clicks "Mark Arrived".
   - **Endpoint:** `PATCH /api/assignments/:id/status` with `{ status: 'Accepted' | 'EnRoute' | 'Arrived' }`
   - **Database Impact:** Updates `incident_assignment.status`. Triggers backend check updating `incident.status = 'InProgress'`.
4. **Resolution:**
   - **Page:** `/alerts`
   - **Role:** Responder or Admin.
   - **Action:** Responder clicks "Complete Mission ✓" (or Admin clicks "Mark Resolved").
   - **Endpoint:** `PATCH /api/alerts/:id/status` with `{ status: 'resolved' }`
   - **Database Impact:** Sets `incident.status = 'Resolved'`, sets `incident.resolved_at = NOW()`, sets `incident_assignment.completed_at = NOW()`.

---

## 9. COMPLETE RESOURCE MANAGEMENT WORKFLOW

### The Resource Hub Architecture (`/resources`)

```
                           ┌─────────────────────────────────────────┐
                           │           CENTRAL INVENTORY             │
                           │   resource.quantity_total: 100          │
                           │   resource.quantity_available: 100      │
                           └────────────────────┬────────────────────┘
                                                │
                                    Admin allocates 30 units
                                    POST /api/allocations
                                                │
                                                ▼
     ┌──────────────────────────────────────────┴─────────────────────────────────────────┐
     │                                                                                    │
     ▼                                                                                    ▼
┌──────────────────────────────────────┐                             ┌──────────────────────────────────────┐
│       UPDATED INVENTORY STOCK        │                             │    INCIDENT RESOURCE ALLOCATION      │
│  resource.quantity_available: 70     │                             │  incident_resource_allocation row:   │
│  status: 'available'                 │                             │  quantity_allocated: 30              │
│                                      │                             │  status: 'allocated'                 │
└──────────────────────────────────────┘                             └──────────────────┬───────────────────┘
                                                                                        │
                                                                           Admin clicks 'Release Stock'
                                                                           PATCH /api/allocations/:id/release
                                                                                        │
                                                                                        ▼
                                                                     ┌──────────────────────────────────────┐
                                                                     │     RESTORED INVENTORY BALANCE       │
                                                                     │  resource.quantity_available: 100    │
                                                                     │  allocation.status: 'released'       │
                                                                     │  allocation.released_at: NOW()       │
                                                                     └──────────────────────────────────────┘
```

### Stock Allocation Workflow
1. Admin navigates to `/resources` or clicks "+ Allocate Resource" on an alert in `/alerts`.
2. Admin opens `AllocateResourceModal`. Dropdown lists available resources fetched from `GET /api/resources`.
3. Modal displays available stock indicator. Admin enters desired quantity.
4. Validation prevents allocating more than available stock (`quantity <= quantity_available`).
5. On confirm, calls `POST /api/allocations`.
6. Backend runs SQL transaction:
   - Inserts row into `incident_resource_allocation`.
   - Decrements `resource.quantity_available`.
   - If available reaches 0, updates `resource.status = 'depleted'`.
   - Generates audit notification.

### Stock Release Workflow
1. Admin views "Live Dispatches" table on `/resources` with filter set to "Active".
2. Admin clicks "Release Stock" button on the allocation row.
3. Calls `PATCH /api/allocations/:id/release`.
4. Backend executes:
   - Sets `incident_resource_allocation.status = 'released'`, `released_at = NOW()`.
   - Increments `resource.quantity_available` by the returned quantity.
   - If stock was previously depleted, resets `resource.status = 'available'`.
   - Emits confirmation notification.

---

## 10. NOTIFICATIONS — ROLE-WISE EXPLANATION

### Technical Notification Architecture
- **Database Table:** `notification` (`id`, `user_id`, `incident_id`, `type`, `title`, `message`, `is_read`, `created_at`).
- **Delivery Mechanism:** Automatic 20-second polling orchestrated by `DashboardContext.jsx` via `GET /api/notifications`.
- **TopNavbar Tactical Indicator:** Bell icon in top right with pulsing neon badge displaying real-time unread count (`unreadCount`).
- **Tactical Notification Drawer:**
  - Clicking the bell opens a responsive slide-over drawer with tactical header.
  - "Mark All Read" button calls `PATCH /api/notifications/mark-all-read`.
  - Individual notification items can be marked as read (`PATCH /api/notifications/:id/read`) or permanently dismissed (`DELETE /api/notifications/:id`).

### Role-Wise Notification Matrix

| Trigger Event | Recipient Role | Notification Title | Message Content |
|---|---|---|---|
| New Incident Reported | Admin | `NEW INCIDENT REPORTED` | High-priority SOS report logged in sector with details. |
| Responder Dispatched | Responder | `MISSION DISPATCH ASSIGNMENT` | Admin has assigned you to Incident #ID. Review location and accept. |
| Responder Accepts Mission | Admin | `MISSION ACCEPTED` | Unit has accepted dispatch assignment for Incident #ID. |
| Responder En Route | Admin | `UNIT EN ROUTE` | Responder unit is moving towards Incident #ID site. |
| Responder Arrived | Admin | `UNIT ON SCENE` | Responder unit has arrived at Incident #ID location. |
| Resource Allocated | Responder / Admin | `RESOURCES ALLOCATED` | X quantity of [Resource] assigned to Incident #ID. |
| Resource Released | Admin | `STOCK RELEASED` | X units of [Resource] returned to central inventory. |
| Incident Resolved | Citizen, Admin, Responder | `INCIDENT RESOLVED` | Incident #ID has been brought under control and marked resolved. |

---

## 11. ANALYTICS AND REPORTS

Accessible by `admin`, `responder`, and `hospital` at `/analytics`.

### Visual Telemetry & Metrics
1. **Incident Resolution Velocity:**
   - Total incidents vs Resolved incidents vs In-Progress incidents.
   - Average resolution time calculation.
2. **Threat Severity Distribution:**
   - Multi-tier visual charts categorized by `Minor`, `Moderate`, `High Danger`, `Life Threatening`.
3. **Temporal Incident Trends:**
   - 7-day rolling incident frequency line chart.
4. **Logistics & Resource Burn:**
   - Resource allocation by category (Medical, Transport, Food & Water, Heavy Rescue).
   - Available vs Allocated stock ratio.
5. **Hospital Bed Availability Index:**
   - Aggregate ICU, General, and Ventilator bed availability percentages.

---

## 12. AUTHENTICATION AND ACCESS CONTROL

### Credential & Token Flow
1. **Password Security:** User passwords hashed using `bcrypt` (10 salt rounds).
2. **Session Generation:** Upon successful login (`/api/auth/login` or `/api/auth/admin-login`), server generates an HMAC SHA-256 JWT containing `{ id, email, role, full_name }` with a 24-hour expiration window.
3. **Client Storage:** Token stored in browser `localStorage.getItem('token')`. Authenticated user metadata stored in `localStorage.getItem('user')` and `localStorage.getItem('role')`.
4. **API Interceptor:** Axios client (`src/api/index.js`) intercepts all outgoing HTTP requests, attaching `Authorization: Bearer <token>`.
5. **Server Verification:** `server/middleware/auth.js` enforces `verifyToken`, `requireRole(['admin', ...])`, and `requireAdmin`. Unauthorized requests receive HTTP `401 Unauthorized` or `403 Forbidden`.
6. **Frontend Route Guards:** `src/App.jsx` evaluates `role` on every navigation event, redirecting unauthorized roles to safe home paths.

---

## 13. DATABASE AND API MAPPING

| Database Table | Primary Model | API Endpoints | Typical Payloads / Queries |
|---|---|---|---|
| `users` | User Accounts | `POST /api/auth/register`<br>`POST /api/auth/login`<br>`GET /api/users`<br>`GET /api/users/profile` | `{ email, password, full_name, role, phone }` |
| `incident` | Emergency Incidents | `GET /api/alerts`<br>`POST /api/alerts`<br>`GET /api/alerts/:id`<br>`PATCH /api/alerts/:id/status` | `{ title, description, incident_type, severity, latitude, longitude, image_url }` |
| `incident_report_log` | Incident Audit Trail | `GET /api/alerts/:id/logs` | `{ incident_id, action, performed_by, timestamp }` |
| `incident_assignment` | Field Dispatches | `POST /api/assignments`<br>`GET /api/assignments/responder/:id`<br>`PATCH /api/assignments/:id/status` | `{ incident_id, responder_id, unit_callsign, status: 'Pending'\|'Accepted'\|'EnRoute'\|'Arrived'\|'Completed' }` |
| `resource` | Logistics Inventory | `GET /api/resources`<br>`POST /api/resources`<br>`PUT /api/resources/:id` | `{ name, category, quantity_total, quantity_available, location, status }` |
| `incident_resource_allocation` | Active Dispatches | `GET /api/allocations`<br>`POST /api/allocations`<br>`PATCH /api/allocations/:id/release` | `{ incident_id, resource_id, quantity_allocated, status: 'allocated'\|'released' }` |
| `hospital_resources` | Hospital Assets | `GET /api/hospital/resources`<br>`PUT /api/hospital/resources` | `{ icu_beds, general_beds, ventilators, oxygen_liters, blood_units_json }` |
| `notification` | User Alerts | `GET /api/notifications`<br>`PATCH /api/notifications/:id/read`<br>`PATCH /api/notifications/mark-all-read`<br>`DELETE /api/notifications/:id` | `{ user_id, title, message, type, is_read }` |
| `organization` | Agency Profiles | `GET /api/organizations`<br>`POST /api/organizations` | `{ name, type, contact_email, phone, address }` |
| `analytics` (views/queries) | Aggregations | `GET /api/analytics/overview` | Returns aggregate counts, severity ratios, and time-series arrays. |

---

## 14. COMPLETE MANUAL TESTING CHECKLIST

Use this step-by-step checklist to systematically verify every feature in the browser:

| Test ID | User Role | Page | Action | Expected Result | Actual Implementation / Notes |
|---|---|---|---|---|---|
| **TC-01** | Public | `/` | Navigate to base landing page | Landing page renders with radar grid, active metrics counter, and Report Incident CTA button. | Confirmed in `LandingPage.jsx`. |
| **TC-02** | Public | `/login` | Submit invalid login credentials | Error toast/alert displays "Invalid email or password"; form does not clear email. | Confirmed in `LoginPage.jsx`. |
| **TC-03** | Public | `/register` | Register new citizen account | Account is created in `users` table with `role = 'citizen'`; user redirected to `/login`. | Confirmed in `SignUpPage.jsx` & `authController.js`. |
| **TC-04** | Citizen | `/report` | Click "USE GPS" button | Triggers browser geolocation prompt; pins current latitude/longitude on Leaflet map; updates accuracy indicator. | Reverse geocodes address via Nominatim. In case of inaccurate browser/Wi-Fi geolocation, manual pin dragging or address search can override coordinates. |
| **TC-05** | Citizen | `/report` | Drag the map pin to custom location | Coordinates and displayed address update to the exact dragged pin location. | Implemented via Leaflet `marker.on('dragend')` in `IncidentLocationMap.jsx`. |
| **TC-06** | Citizen | `/report` | Upload emergency incident photo | File selected, preview thumbnail appears with remove option; uploaded via `multipart/form-data`. | Supported formats: PNG, JPG, WEBP. Handled by Multer backend. |
| **TC-07** | Citizen | `/report` | Submit valid incident report | Form submits `POST /api/alerts`; confirmation notification appears; redirects user to `/alerts`. | Inserts row into `incident` with status `'Reported'`. |
| **TC-08** | Citizen | `/alerts` | Verify alert display | Citizen can view public incident cards, severity badges, and interactive map pins. | Admin/Responder action buttons (`+ Assign Unit`, `Complete Mission`) are hidden for citizen. |
| **TC-09** | Citizen | `/dashboard` | Attempt direct URL navigation | URL access is blocked; automatically redirected to `/admin` login page. | Protected by role guard in `src/App.jsx`. |
| **TC-10** | Admin | `/admin` | Log in with central command credentials | Authenticates successfully; stores JWT with `role: 'admin'`; redirects to `/dashboard`. | Implemented in `AdminLogin.jsx`. |
| **TC-11** | Admin | `/dashboard` | Inspect KPI metric cards | Displays accurate counts for Total Incidents, Active Threats, Responding Units, and Logistics. | Calculated from live database queries. |
| **TC-12** | Admin | `/alerts` | Click "+ Assign Unit" on an unassigned incident | Opens `AssignResponderModal`; populates responder unit list from `/api/users?role=responder`. | Implemented in `AssignResponderModal.jsx`. |
| **TC-13** | Admin | `/alerts` | Confirm responder unit assignment | Calls `POST /api/assignments`; incident status updates to `Assigned`; notification sent to responder. | Database row added to `incident_assignment`. |
| **TC-14** | Admin | `/alerts` | Click "+ Allocate Resource" on an incident | Opens `AllocateResourceModal`; lists available inventory stock items. | Implemented in `AllocateResourceModal.jsx`. |
| **TC-15** | Admin | `/alerts` | Allocate 15 units of First Aid Kits | Submits `POST /api/allocations`; inventory stock decrements; allocation badge displays on incident card. | Backend verifies `quantity <= quantity_available`. |
| **TC-16** | Admin | `/resources` | View Live Dispatches tab | Displays active allocation record with Incident ID, resource name, quantity, and "Release Stock" button. | Implemented in `ResourceInventory.jsx`. |
| **TC-17** | Admin | `/resources` | Click "Release Stock" on an active allocation | Calls `PATCH /api/allocations/:id/release`; stock is restored to central inventory; status changes to `Released`. | Verified in `allocationController.js`. |
| **TC-18** | Responder | `/login` | Log in with responder credentials | Authenticates successfully; role identified as `responder`; redirects to `/alerts`. | Implemented in `LoginPage.jsx`. |
| **TC-19** | Responder | `/alerts` | View assigned mission card | Card highlights with tactical cyan outline; shows "Accept Mission" and "Reject Mission" buttons. | Filtered by assigned `responder_id`. |
| **TC-20** | Responder | `/alerts` | Click "Accept Mission" | Status updates to `Accepted`; button toggles to "En Route →"; notification emitted to Admin. | Backend updates `incident_assignment.status`. |
| **TC-21** | Responder | `/alerts` | Click "En Route →" | Status updates to `EnRoute`; incident status updates to `InProgress` (`Responding`); button changes to "Mark Arrived 📍". | Confirmed in `assignmentController.js`. |
| **TC-22** | Responder | `/alerts` | Click "Mark Arrived 📍" | Status updates to `Arrived`; button updates to "Complete Mission ✓". | Tactical location timestamp saved. |
| **TC-23** | Responder | `/alerts` | Click "Complete Mission ✓" | Prompts completion notes modal; marks mission `Completed` and incident `Resolved`. | Sets `resolved_at` in `incident` table. |
| **TC-24** | Responder | `/org` | Toggle readiness to "Busy" | Readiness badge changes color to amber; updates availability in database. | Implemented in `ResponderOrg.jsx`. |
| **TC-25** | Hospital | `/hospital-resources` | Update ICU bed capacity | Enters new bed count, clicks "Update Capacity"; updates `hospital_resources` database table. | Handled via `PUT /api/hospital/resources`. |
| **TC-26** | All Roles | Any | Click Bell icon on TopNavbar | Tactical notification drawer slides open showing list of recent notifications with unread indicators. | Responsive drawer in `TopNavbar.jsx`. |
| **TC-27** | All Roles | Any | Click "Mark All Read" in notification drawer | Calls `PATCH /api/notifications/mark-all-read`; all badges clear; unread count resets to 0. | Verified in `notificationController.js`. |
| **TC-28** | All Roles | `/settings` | Toggle Theme between Dark & Light Mode | Application background and card themes dynamically switch between tactical dark and high-visibility light mode. | Handled by Tailwind dark mode class toggling. |
| **TC-29** | Responder | `/hospital-resources` | Attempt direct URL navigation | Access denied; automatically redirected to `/alerts`. | Guarded by role check in `App.jsx`. |
| **TC-30** | Citizen | `/org` | Attempt direct URL navigation | Access denied; automatically redirected to `/alerts`. | Guarded by role check in `App.jsx`. |

---

## 15. KNOWN ISSUES AND INCONSISTENCIES

### A. Confirmed Implemented in Code
- Complete role-based authentication and navigation isolation (`citizen`, `admin`, `responder`, `hospital`).
- Full incident assignment lifecycle (`Pending` -> `Accepted` -> `EnRoute` -> `Arrived` -> `Completed` -> `Resolved`).
- Complete inventory allocation and stock restoration lifecycle (`allocate` -> decrement -> `release` -> increment).
- Database-backed notification drawer with 20s background polling and mark-as-read / delete capabilities.
- Dynamic interactive map on incident reporting with Nominatim geocoding, manual pin dragging, and GPS acquisition.

### B. Partially Implemented Features
- **SMS / Push Alerts:** The notification system is database-backed and displayed in the in-app drawer. External SMS (Twilio) or web push notification APIs are not linked to cellular carriers.
- **Offline Mesh Networking:** The cyberpunk UI contains telemetry references to "Mesh Network Status: 99.9%", which is an aesthetic tactical simulation. All data operations require an active HTTP/MySQL network connection.

### C. Unconnected UI Components
- **Dashboard "Export" Button (`DashboardMain.jsx`):** The "Export" button in the Central Command header provides visual feedback but does not generate a downloadable CSV/PDF file.
- **Biometric Scan Animation (`AdminLogin.jsx`):** Fingerprint/retinal scan animation is an aesthetic tactical authentication overlay that authenticates via standard hashed email/password.

### D. Inconsistencies Between UI & DB Status Names
- **Incident Status Display:** Database values are `'Reported'`, `'Assigned'`, `'InProgress'`, `'Resolved'`. In certain dashboard views, `'InProgress'` is presented to field units with the tactical label `Responding`. The API controllers properly normalize these values.

### E. Role Access Boundary Observations
- Responders and Hospitals can view the `/resources` page to see logistics availability, but only Admins can execute allocation or release transactions.
- Citizens cannot access `/analytics`; they are redirected to `/alerts`.

---

## 16. FEATURES REQUIRING MANUAL VERIFICATION

1. **Hardware GPS vs. Wi-Fi Geolocation on Physical Mobile Devices:**
   - On desktop/laptops with Wi-Fi triangulation, the browser's Geolocation API can occasionally return inaccurate regional router hubs (e.g., Brazilian ISP nodes).
   - *Manual Verification:* Test on an actual mobile smartphone with hardware GPS enabled over cellular data. Verify that clicking "USE GPS" places the pin accurately within 5–15 meters of the physical device.
   - Verify that the Nominatim address search and manual draggable pin fallback work correctly when GPS is unavailable.
2. **Real-Time Notification Polling:**
   - In two separate browser windows (one logged in as Admin, one as Responder), assign an incident in Window A and observe Window B. Confirm that the notification badge updates within 20 seconds without requiring a manual page refresh.
3. **Camera Capture on Physical Phones:**
   - On a physical smartphone, tap the file upload button in `/report` to verify that the native mobile camera capture dialog opens.
4. **Leaflet CARTO Dark Matter Tiles Under Restricted Networks:**
   - Verify that OpenStreetMap / CARTO map tiles render promptly without being blocked by ad-blockers or restricted DNS profiles.

---

## 17. FINAL SUMMARY

CrisisChain is fully operational across all four user roles:
- **Civilian Reporting:** Citizens can submit incident reports with geocoded coordinates, severity tags, and photo attachments.
- **Central Command:** Admins have complete visibility across active incidents, responder rosters, inventory allocations, and high-level analytics.
- **Tactical Field Operations:** Responders receive real-time mission alerts, transition through field deployment stages, and resolve incidents.
- **Healthcare Coordination:** Hospital authorities can manage critical care beds, oxygen supplies, and blood bank levels.
- **Data Integrity:** All state transitions—incident lifecycles, inventory stock decrements/restorations, and operational notifications—are synchronized with the MySQL relational database.

*Confirmation: This comprehensive inspection was performed strictly in read-only mode. No application source files, styles, environment configurations, or database records were altered or deleted.*

