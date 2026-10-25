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
