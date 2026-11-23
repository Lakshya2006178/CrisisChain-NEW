# CrisisChain — Demo Script

Ordered run-sheet for the final demonstration and DBMS viva. Everything in this script was verified live against the running application on 2026-11-23 (see the verification report in `docs/markdown/` for full evidence). Demo credentials below reflect the corrected password hashes — the previous demo-password fallback has been removed from the code, so these are the *real* passwords, not a convenience shortcut.

---

## 0. Pre-flight checklist

```bash
# Terminal 1 — backend
cd server
npm run dev
# Expected: "✅ MySQL connected to crisischain_db" then "🚀 Server running on port 5001"

# Terminal 2 — frontend
npm run dev
# Expected: Vite ready, Local: http://localhost:5173/

# Quick health check
curl http://localhost:5001/api/health/db
# Expected: {"status":"ok","now":"<current timestamp>"}
```

**Demo accounts** (all real, bcrypt-verified):

| Role | Email | Password |
|---|---|---|
| Admin | `admin@crisischain.com` | `admin123` |
| Citizen | `asha@example.com` | `password123` |
| Responder (Paramedic) | `ravi.paramedic@example.com` | `password123` |
| Hospital | `anil.kmc@example.com` | `password123` |

---

## PART A — Application Walkthrough

### A1. Citizen reports an emergency
1. Open `http://localhost:5173/report` (no login needed — public page).
2. Type a location (or click "USE DEVICE GPS" / tap the map) — e.g. `12.9000, 74.8500 Demo Fire`.
3. Select type **Fire**, severity **High**, fill a description, optionally attach a photo.
4. Click **SEND REPORT NOW**.
   - **Expected:** "REPORT RECEIVED" success screen with a cosmetic report ID (e.g. `#RI-XXXXXX`) — note this is a client-side display ID, distinct from the real backend incident ID (`AL-10xx`) an admin will see.

### A2. Admin sees it and assigns a responder
1. Log in at `/admin` as `admin@crisischain.com` / `admin123`.
2. Go to **Emergency Alerts** (`/alerts`) — the new report appears in the live feed (Total Alerts count increments).
3. Open the incident, click **Assign Responder**, pick Ravi Kumar (Paramedic).
   - **Expected:** incident status → `Assigned`; Ravi's roster entry shows `Busy`.

### A3. Admin allocates a resource
1. Still on the incident, allocate e.g. **2 ICU Beds** from KMC Hospital.
   - **Expected:** KMC's ICU bed stock visibly decrements by 2 in Resource Inventory / the allocation shows as `Active`.

### A4. Responder works the mission
1. Log in (separate browser / incognito) as `ravi.paramedic@example.com` / `password123`.
2. Go to `/org` → Incidents tab → **Accept** the mission, then progress **En Route → Arrived → Completed**.
   - **Expected:** incident status moves to `InProgress` once En Route is clicked; stays `InProgress` through Arrived/Completed (resolving is a separate, deliberate admin action, not automatic).

### A5. Admin resolves — cascade + refund
1. Back in the admin session, resolve the incident.
   - **Expected:** incident status → `Resolved`; the 2 allocated ICU beds are **automatically released and the stock count goes back up by 2** — this is a server-side cascade inside one transaction, not two separate manual steps.

### A6. Analytics
1. Go to `/analytics` — point out the KPI cards and charts are **live MySQL aggregates**, not placeholders (confirmed by independent SQL cross-check during verification — every number matched exactly).

### A7. Admin/Org/User management
1. `/settings` → Organizations tab: create/edit/deactivate an org live; point out a deactivated org's staff correctly drop off the admin's dispatch picker (this was a real bug found and fixed during verification — see Q&A below).
2. Users tab: deactivate/reactivate a user; show that a deactivated user is immediately blocked from logging in.

### A8. Hospital resource management
1. Log in as `anil.kmc@example.com` / `password123`, go to `/hospital-resources`, edit a bed count.
   - **Expected:** change persists in MySQL (survives a full backend restart — verified live) and is scoped only to KMC's own data (a different hospital account cannot see or touch it).

---

## PART B — DBMS Viva

### B1. Constraints (run in MySQL Workbench against `crisischain_db`, one at a time — all 6 are *designed to fail*)

```sql
-- B1. Foreign key: no incident_type 99 exists
INSERT INTO incident (type_id, title, incident_status, priority_level) VALUES (99, 'Test', 'Reported', 'Low');
-- Expected: Error 1452 (ER_NO_REFERENCED_ROW_2, fk_incident_type)

-- B2. CHECK: stock can never go negative
UPDATE resource SET quantity_available = -1 WHERE resource_id = 1;
-- Expected: Error 3819 (ER_CHECK_CONSTRAINT_VIOLATED, chk_resource_qty)

-- B3. ENUM: 'Responding' isn't a valid status word
UPDATE incident SET incident_status = 'Responding' WHERE incident_id = 1001;
-- Expected: Error 1265 (WARN_DATA_TRUNCATED -- MySQL 8's strict mode makes this a hard error)

-- B4. RESTRICT: can't delete an org that still owns resource centers / staff
DELETE FROM organization WHERE org_id = 1;
-- Expected: Error 1451 (ER_ROW_IS_REFERENCED_2, fk_authority_org)
-- (Note: 1451 is "can't delete a referenced parent"; 1452 above is "can't insert a child with a missing parent" -- two different, correctly-distinct codes.)

-- B5. UNIQUE: same responder can't be double-assigned to the same incident
INSERT INTO incident_assignment (incident_id, authority_id) VALUES (1003, 1);
-- Expected: Error 1062 (ER_DUP_ENTRY, uq_assign_pair)

-- B6. UNIQUE: email must be unique
INSERT INTO users (full_name, email, phone_number, password_hash) VALUES ('Dup', 'asha@example.com', '9', 'x');
-- Expected: Error 1062 (ER_DUP_ENTRY, uq_users_email)
```

### B2. Indexing — EXPLAIN before/after (also in `server/db/practice_queries.sql`)

```sql
-- IDX-1: dashboard "show Critical incidents" filter
EXPLAIN SELECT * FROM incident WHERE priority_level = 'Critical';
-- BEFORE this index existed: type=ALL, key=NULL, rows=29 (full scan)
-- Index already created live: CREATE INDEX idx_incident_priority ON incident (priority_level);
-- AFTER: type=ref, key=idx_incident_priority, rows=6

-- IDX-3: admin dispatch queue "show Pending assignments"
EXPLAIN SELECT * FROM incident_assignment WHERE assignment_status = 'Pending';
-- BEFORE: type=ALL, key=NULL, rows=5
-- Index already created live: CREATE INDEX idx_assign_status ON incident_assignment (assignment_status);
-- AFTER: type=ref, key=idx_assign_status, rows=2

-- IDX-2: a cautionary, equally valid teaching point -- the optimizer doesn't
-- always use an available index. With a WIDE date range on a small table it
-- may still choose a full scan (correct planner judgment, not a bug). With a
-- SELECTIVE single-day range it genuinely picks the index:
EXPLAIN SELECT * FROM incident WHERE created_at >= '2026-11-23 00:00:00' AND created_at < '2026-11-24 00:00:00';
-- type=range, key=idx_incident_created, rows=1
EXPLAIN SELECT * FROM incident IGNORE INDEX (idx_incident_created)
  WHERE created_at >= '2026-11-23 00:00:00' AND created_at < '2026-11-24 00:00:00';
-- forced full-scan baseline for comparison: type=ALL, key=NULL, rows=29
```

### B3. Transaction rollback vs. commit

```sql
-- ROLLBACK case
SELECT quantity_available FROM resource WHERE resource_id = 1;   -- note BEFORE value
START TRANSACTION;
  UPDATE resource SET quantity_available = quantity_available - 2 WHERE resource_id = 1;
  INSERT INTO incident_resource_allocation (incident_id, resource_id, quantity_allocated, allocated_by)
  VALUES (1001, 1, 2, 1);
ROLLBACK;
SELECT quantity_available FROM resource WHERE resource_id = 1;   -- back to the BEFORE value, insert undone too

-- COMMIT case (same steps, kept)
START TRANSACTION;
  UPDATE resource SET quantity_available = quantity_available - 2 WHERE resource_id = 1;
  INSERT INTO incident_resource_allocation (incident_id, resource_id, quantity_allocated, allocated_by)
  VALUES (1001, 1, 2, 1);
COMMIT;
SELECT quantity_available FROM resource WHERE resource_id = 1;   -- genuinely decremented now
```

### B4. Row-locked allocation + resolve-triggered refund (the "real" app logic, not a toy demo)

Point out in `server/controllers/allocationController.js`'s `createAllocation`: it opens a transaction, does `SELECT ... FOR UPDATE` on the resource row (row-level lock preventing two concurrent requests from both reading "sufficient stock" before either writes), checks stock, decrements, inserts the allocation, writes an audit log entry and a notification, then commits. Demonstrate live:

```bash
curl -X POST http://localhost:5001/api/allocations \
  -H "Content-Type: application/json" -H "Authorization: Bearer <admin token>" \
  -d '{"incident_id":1001,"resource_id":1,"quantity_allocated":200000}'
# Expected: 400, "Insufficient stock for ICU Beds at KMC Hospital Mangaluru. Requested: 200000, Available: <real number>."
# Then confirm via SQL that quantity_available is unchanged -- the failed request touched nothing.
```

Then resolve an incident with an active allocation (Part A5 above) and show the refund happens automatically, in the same transaction as the status change — not a second manual step.

---

## Likely Mentor Questions & Short Answers

**Q: Why does the EXPLAIN for the date-range query sometimes not use the index you just created?**
A: MySQL's optimizer estimates cost from table statistics. On a small table (29 rows) with a filter that matches a large fraction of rows, a full scan can genuinely be cheaper than an index lookup plus the extra random I/O of fetching matching rows — so the optimizer correctly skips the index. A more selective filter (e.g. a single day instead of a month) makes the index clearly win. This is expected planner behavior, not a flaw in the index.

**Q: Why is the RESTRICT-delete error 1451 and not 1452?**
A: They're two distinct, correctly-named MySQL errors: 1452 (`ER_NO_REFERENCED_ROW_2`) fires when you try to *insert/update a child row* pointing at a parent that doesn't exist; 1451 (`ER_ROW_IS_REFERENCED_2`) fires when you try to *delete/update a parent row* that children still reference. Both come from the same foreign-key mechanism, applied in opposite directions.

**Q: Why does `incident_resource_allocation` have no `UNIQUE(incident_id, resource_id)` constraint?**
A: By design — it needs to allow the same resource to be allocated to the same incident more than once over time (e.g. an ambulance redeployed after returning to base). Preventing a *duplicate active* allocation (not yet released) is enforced in the application layer (`allocationController.js`) instead of the database, which is a documented, deliberate trade-off.

**Q: What was the single most important bug found during verification?**
A: A hardcoded password fallback in the login controller that let any account (including self-registered ones) be accessed without its real password, plus a related issue where the public registration endpoint allowed self-assigning the `admin` role. Both were removed; authentication now uses bcrypt comparison only, and admin accounts can only be seeded/provisioned directly, never self-registered.

**Q: Is the Analytics page using real data or a demo dataset?**
A: Real, live MySQL aggregate queries — independently re-computed with separate SQL during verification and matched the API's numbers exactly, including the two different "response time" definitions (assignment-acceptance latency vs. full resolution time) and correct NULL-exclusion handling.

**Q: What's still not implemented?**
A: The responder GPS breadcrumb trail (`authority_live_location` table and 4 seed rows exist for Workbench demo queries only — no API route or frontend map screen for it), and a handful of secondary admin/UI screens (Resource Inventory's manual "Add Stock" form, Responder Org's Fleet/Equipment/Personnel tabs, Settings' Security card) remain local-only mock data, not backend-wired. These are clearly scoped, deliberate gaps, not hidden defects.
