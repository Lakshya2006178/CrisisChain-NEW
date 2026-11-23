-- ============================================================================
--  CrisisChain - PRACTICE QUERIES (run ONE at a time in Workbench:
--  click inside the query, press Ctrl+Enter). Read the comment first,
--  guess the result, THEN run it.
-- ============================================================================
USE crisischain_db;

-- LEVEL 1: SELECT basics ------------------------------------------------------
-- Q1. Everything in one table.
SELECT * FROM incident;

-- Q2. Only some columns, only Critical ones, newest first.
SELECT incident_id, title, incident_status
FROM incident
WHERE priority_level = 'Critical'
ORDER BY created_at DESC;

-- Q3. Count incidents per status (GROUP BY).
SELECT incident_status, COUNT(*) AS how_many
FROM incident
GROUP BY incident_status;

-- LEVEL 2: JOIN (combine tables through their foreign keys) -------------------
-- Q4. INNER JOIN: each incident with its type NAME instead of a number.
SELECT i.incident_id, i.title, t.type_name
FROM incident i
JOIN incident_type t ON i.type_id = t.type_id;

-- Q5. LEFT JOIN: keep incidents even with NO reporter (anonymous = NULL).
--     Change LEFT JOIN to JOIN and watch the anonymous ones disappear.
SELECT i.incident_id, i.title, u.full_name AS reported_by
FROM incident i
LEFT JOIN users u ON i.reporter_id = u.user_id;

-- Q6. Organizations and how many centers each runs (LEFT JOIN + GROUP BY).
--     Red Cross shows 0 because LEFT JOIN keeps it.
SELECT o.name, o.org_type, COUNT(c.center_id) AS centers
FROM organization o
LEFT JOIN resource_center c ON c.org_id = o.org_id
GROUP BY o.org_id, o.name, o.org_type;

-- LEVEL 3: multi-table JOINs (your demo queries) --------------------------------
-- Q7. Dashboard view: incident + type + assigned responder + their organization.
SELECT i.incident_id, t.type_name, i.priority_level, i.incident_status,
       u.full_name AS responder, o.name AS organization, a.assignment_status
FROM incident i
JOIN incident_type t            ON i.type_id = t.type_id
LEFT JOIN incident_assignment a ON a.incident_id = i.incident_id
LEFT JOIN authority_profile p   ON a.authority_id = p.authority_id
LEFT JOIN users u               ON p.user_id = u.user_id
LEFT JOIN organization o        ON p.org_id = o.org_id
WHERE i.incident_status <> 'Resolved'
ORDER BY i.created_at DESC;

-- Q8. THE MENTOR QUERY (6 tables): which organization's stock was used where?
SELECT i.incident_id, t.type_name, r.resource_type,
       a.quantity_allocated, c.name AS center, o.name AS organization
FROM incident i
JOIN incident_type t                  ON i.type_id = t.type_id
JOIN incident_resource_allocation a   ON a.incident_id = i.incident_id
JOIN resource r                       ON a.resource_id = r.resource_id
JOIN resource_center c                ON r.center_id = c.center_id
JOIN organization o                   ON c.org_id = o.org_id;

-- Q9. Average response time in hours for resolved incidents.
SELECT ROUND(AVG(TIMESTAMPDIFF(MINUTE, created_at, resolved_at)) / 60, 1) AS avg_hours
FROM incident
WHERE resolved_at IS NOT NULL;

-- Q10. Latest GPS ping of each responder (why idx_authority_latest exists).
SELECT l.authority_id, l.latitude, l.longitude, l.recorded_at
FROM authority_live_location l
WHERE l.recorded_at = (SELECT MAX(recorded_at) FROM authority_live_location
                       WHERE authority_id = l.authority_id);

-- ============================================================================
--  INDEXING DEMO #2 (added during verification pass, 2026-11-23)
--  Three real slow-pattern queries, EXPLAIN before -> CREATE INDEX -> EXPLAIN
--  after. These three indexes were already DOCUMENTED in schema.sql's design
--  comments but were missing from the actual live database (schema drift) --
--  this demo both proves the indexing concept AND fixes that drift.
-- ============================================================================

-- IDX-1. "Show me all Critical incidents" (dashboard filter)
EXPLAIN SELECT * FROM incident WHERE priority_level = 'Critical';
-- BEFORE: type=ALL, key=NULL, rows=29 (full table scan)
CREATE INDEX idx_incident_priority ON incident (priority_level);
EXPLAIN SELECT * FROM incident WHERE priority_level = 'Critical';
-- AFTER:  type=ref, key=idx_incident_priority, rows=6 (direct lookup)

-- IDX-2. "Show me today's incidents" (analytics / daily trend query)
--        NOTE: on a small table (29 rows) with a WIDE date range, the
--        optimizer may legitimately still choose a full scan even with the
--        index present -- that is a correct, expected planner decision, not
--        a bug. Use a SELECTIVE single-day range to see it actually pick the
--        index (and FORCE/IGNORE INDEX to see both costs side by side):
EXPLAIN SELECT * FROM incident
  WHERE created_at >= '2026-11-23 00:00:00' AND created_at < '2026-11-24 00:00:00';
-- BEFORE (no index): type=ALL, key=NULL, rows=29
CREATE INDEX idx_incident_created ON incident (created_at);
EXPLAIN SELECT * FROM incident
  WHERE created_at >= '2026-11-23 00:00:00' AND created_at < '2026-11-24 00:00:00';
-- AFTER: type=range, key=idx_incident_created, rows=1
EXPLAIN SELECT * FROM incident IGNORE INDEX (idx_incident_created)
  WHERE created_at >= '2026-11-23 00:00:00' AND created_at < '2026-11-24 00:00:00';
-- forced full-scan baseline for comparison: type=ALL, key=NULL, rows=29

-- IDX-3. "Show me all Pending assignments" (admin dispatch queue)
EXPLAIN SELECT * FROM incident_assignment WHERE assignment_status = 'Pending';
-- BEFORE: type=ALL, key=NULL, rows=5
CREATE INDEX idx_assign_status ON incident_assignment (assignment_status);
EXPLAIN SELECT * FROM incident_assignment WHERE assignment_status = 'Pending';
-- AFTER:  type=ref, key=idx_assign_status, rows=2

-- ============================================================================
--  TRANSACTION ROLLBACK DEMO (added during verification pass, 2026-11-23)
--  Shows COMMIT keeps a change, ROLLBACK discards it -- the "bank transfer"
--  idea applied to resource stock + allocation together.
-- ============================================================================

-- TXN-1. ROLLBACK case: decrement stock + insert allocation, then undo both.
--        Substitute a real resource_id/incident_id (e.g. resource_id=1,
--        incident_id=1001) when running this by hand in Workbench.
SELECT quantity_available FROM resource WHERE resource_id = 1;      -- note the BEFORE value
START TRANSACTION;
  UPDATE resource SET quantity_available = quantity_available - 2 WHERE resource_id = 1;
  INSERT INTO incident_resource_allocation (incident_id, resource_id, quantity_allocated, allocated_by)
  VALUES (1001, 1, 2, 1);
  SELECT quantity_available FROM resource WHERE resource_id = 1;    -- inside the transaction: looks decremented
ROLLBACK;
SELECT quantity_available FROM resource WHERE resource_id = 1;      -- AFTER ROLLBACK: back to the BEFORE value
SELECT COUNT(*) FROM incident_resource_allocation WHERE incident_id = 1001 AND resource_id = 1 AND quantity_allocated = 2;
-- expect 0 rows: the INSERT was undone too.

-- TXN-2. COMMIT case: the same steps, but kept -- then released again to
--        leave the table exactly as it was before this demo.
START TRANSACTION;
  UPDATE resource SET quantity_available = quantity_available - 2 WHERE resource_id = 1;
  INSERT INTO incident_resource_allocation (incident_id, resource_id, quantity_allocated, allocated_by)
  VALUES (1001, 1, 2, 1);
COMMIT;
SELECT quantity_available FROM resource WHERE resource_id = 1;      -- now genuinely decremented
-- Clean-up (release the allocation the normal way the app does it, restoring stock):
UPDATE incident_resource_allocation SET released_at = NOW()
  WHERE incident_id = 1001 AND resource_id = 1 AND released_at IS NULL
  ORDER BY allocation_id DESC LIMIT 1;
UPDATE resource SET quantity_available = quantity_available + 2 WHERE resource_id = 1;
SELECT quantity_available FROM resource WHERE resource_id = 1;      -- back to the original BEFORE value

-- LEVEL 4: writing data and the TRANSACTION (the "bank transfer" idea) ----------
-- Q11. Change a status AND write the diary row together, or neither.
START TRANSACTION;
  INSERT INTO incident_report_log (incident_id, logged_by, log_type, old_value, new_value)
  VALUES (1001, 1, 'StatusChange', 'Reported', 'Assigned');
  UPDATE incident SET incident_status = 'Assigned' WHERE incident_id = 1001;
COMMIT;      -- use ROLLBACK; instead of COMMIT; to undo both steps

-- ============================================================================
--  BREAK IT ON PURPOSE (each should FAIL; this is your viva demo)
-- ============================================================================
-- B1. Foreign key: there is no incident type 99.
INSERT INTO incident (type_id, title, incident_status, priority_level)
VALUES (99, 'Test', 'Reported', 'Low');

-- B2. CHECK constraint: stock can never be negative.
UPDATE resource SET quantity_available = -1 WHERE resource_id = 1;

-- B3. ENUM: 'Responding' is not an allowed status word (the DB word is InProgress).
UPDATE incident SET incident_status = 'Responding' WHERE incident_id = 1001;

-- B4. RESTRICT: cannot delete an organization that still owns centers.
DELETE FROM organization WHERE org_id = 1;

-- B5. UNIQUE: the same responder cannot be assigned to the same incident twice.
INSERT INTO incident_assignment (incident_id, authority_id) VALUES (1003, 1);

-- B6. UNIQUE: email must be unique.
INSERT INTO users (full_name, email, phone_number, password_hash)
VALUES ('Dup', 'asha@example.com', '9', 'x');

-- ============================================================================
--  INDEX + EXPLAIN demo
-- ============================================================================
EXPLAIN SELECT * FROM incident WHERE incident_status = 'Reported';
-- Look at "key": it should say idx_incident_status. Then try:
-- EXPLAIN SELECT * FROM incident WHERE description = 'x';   (no index: key is NULL)
