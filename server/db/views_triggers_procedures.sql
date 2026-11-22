-- ============================================================================
--  CrisisChain - VIEWS, TRIGGERS & STORED PROCEDURES
--  Run AFTER schema.sql and seed.sql.
--
--  What this file adds (great for DBMS viva!):
--    3 Views        - Pre-built SELECT queries you can query like a table
--    1 Trigger      - Auto-logs status changes to incident_report_log
--    1 Stored Proc  - Atomic responder assignment wrapped in a transaction
--
--  HOW TO RUN:
--    Open MySQL Workbench, run this whole file once.
--    Then try:  SELECT * FROM v_active_incidents;
--               CALL sp_assign_responder(1004, 1, 1);
-- ============================================================================
USE crisischain_db;

-- ============================================================================
-- DROP EXISTING (safe re-run)
-- ============================================================================
DROP VIEW IF EXISTS v_active_incidents;
DROP VIEW IF EXISTS v_resource_summary;
DROP VIEW IF EXISTS v_responder_workload;
DROP TRIGGER IF EXISTS trg_incident_status_log;
DROP PROCEDURE IF EXISTS sp_assign_responder;

-- ============================================================================
-- VIEW 1: v_active_incidents
-- Purpose : Dashboard view — shows every non-resolved incident with its
--           type, reporter, and currently assigned responder (if any).
-- Uses    : incident ⟶ incident_type ⟶ users (reporter)
--                     ⟶ incident_assignment ⟶ authority_profile
--                     ⟶ users (responder) ⟶ organization
-- Demo    : SELECT * FROM v_active_incidents;
--           SELECT * FROM v_active_incidents WHERE priority_level = 'Critical';
-- ============================================================================
CREATE VIEW v_active_incidents AS
SELECT
    i.incident_id,
    CONCAT('AL-', i.incident_id)       AS display_id,
    i.title,
    t.type_name,
    i.priority_level,
    i.incident_status,
    i.location_text,
    i.latitude,
    i.longitude,
    reporter.full_name                  AS reported_by,
    responder.full_name                 AS assigned_responder,
    ap.authority_type                   AS responder_type,
    o.name                              AS responder_organization,
    ia.assignment_status,
    ia.assigned_at,
    i.created_at,
    TIMESTAMPDIFF(MINUTE, i.created_at, NOW()) AS minutes_since_reported
FROM incident i
JOIN  incident_type        t         ON t.type_id        = i.type_id
LEFT JOIN users            reporter  ON reporter.user_id  = i.reporter_id
LEFT JOIN incident_assignment ia      ON ia.incident_id   = i.incident_id
LEFT JOIN authority_profile   ap      ON ap.authority_id  = ia.authority_id
LEFT JOIN users            responder  ON responder.user_id = ap.user_id
LEFT JOIN organization        o       ON o.org_id         = ap.org_id
WHERE i.incident_status <> 'Resolved'
ORDER BY
    FIELD(i.priority_level, 'Critical', 'High', 'Medium', 'Low'),
    i.created_at DESC;

-- ============================================================================
-- VIEW 2: v_resource_summary
-- Purpose : Inventory view — every resource with its center and organization.
-- Uses    : resource ⟶ resource_center ⟶ organization
-- Demo    : SELECT * FROM v_resource_summary WHERE center_type = 'Hospital';
--           SELECT * FROM v_resource_summary WHERE quantity_available = 0;
-- ============================================================================
CREATE VIEW v_resource_summary AS
SELECT
    r.resource_id,
    r.resource_type,
    r.quantity_available,
    rc.center_id,
    rc.name                             AS center_name,
    rc.center_type,
    rc.address                          AS center_address,
    rc.latitude,
    rc.longitude,
    o.org_id,
    o.name                              AS organization_name,
    o.org_type,
    r.last_updated,
    -- Active (un-released) allocations for this resource
    COALESCE((
        SELECT SUM(a.quantity_allocated)
        FROM incident_resource_allocation a
        WHERE a.resource_id = r.resource_id
          AND a.released_at IS NULL
    ), 0)                               AS quantity_in_use
FROM resource r
JOIN resource_center rc ON rc.center_id = r.center_id
JOIN organization    o  ON o.org_id     = rc.org_id
ORDER BY o.name, rc.name, r.resource_type;

-- ============================================================================
-- VIEW 3: v_responder_workload
-- Purpose : Shows every responder, their organization, availability, and
--           how many ACTIVE missions they currently have.
-- Uses    : authority_profile ⟶ users ⟶ organization
--                              ⟶ incident_assignment (aggregated)
-- Demo    : SELECT * FROM v_responder_workload ORDER BY active_missions DESC;
--           SELECT * FROM v_responder_workload WHERE availability_status = 'Available';
-- ============================================================================
CREATE VIEW v_responder_workload AS
SELECT
    ap.authority_id,
    u.user_id,
    u.full_name                         AS responder_name,
    u.email,
    ap.authority_type,
    ap.credential_id,
    ap.availability_status,
    ap.coverage_radius_km,
    o.name                              AS organization_name,
    o.org_type,
    COUNT(CASE
        WHEN ia.assignment_status IN ('Pending','Accepted','EnRoute','Arrived')
        THEN ia.assignment_id
    END)                                AS active_missions,
    COUNT(CASE
        WHEN ia.assignment_status = 'Completed'
        THEN ia.assignment_id
    END)                                AS completed_missions,
    COUNT(ia.assignment_id)             AS total_missions
FROM authority_profile ap
JOIN users         u  ON u.user_id  = ap.user_id
JOIN organization  o  ON o.org_id   = ap.org_id
LEFT JOIN incident_assignment ia ON ia.authority_id = ap.authority_id
GROUP BY
    ap.authority_id, u.user_id, u.full_name, u.email,
    ap.authority_type, ap.credential_id, ap.availability_status,
    ap.coverage_radius_km, o.name, o.org_type
ORDER BY active_missions DESC, u.full_name;

-- ============================================================================
-- TRIGGER: trg_incident_status_log
-- Purpose : AFTER every status change on the incident table, automatically
--           writes a diary row into incident_report_log.
--           This means the audit log is ALWAYS complete — even if the app
--           forgets to write the log entry.
-- Demo    : UPDATE incident SET incident_status = 'Assigned' WHERE incident_id = 1007;
--           SELECT * FROM incident_report_log WHERE incident_id = 1007 ORDER BY log_id DESC LIMIT 3;
-- ============================================================================
DELIMITER $$

CREATE TRIGGER trg_incident_status_log
AFTER UPDATE ON incident
FOR EACH ROW
BEGIN
    -- Only fire when the status actually changes
    IF NEW.incident_status <> OLD.incident_status THEN
        INSERT INTO incident_report_log
            (incident_id, logged_by, log_type, old_value, new_value, notes)
        VALUES
            (NEW.incident_id,
             NULL,                       -- NULL = system / trigger
             'StatusChange',
             OLD.incident_status,
             NEW.incident_status,
             CONCAT('Auto-logged by trigger. Incident: AL-', NEW.incident_id));
    END IF;
END$$

DELIMITER ;

-- ============================================================================
-- STORED PROCEDURE: sp_assign_responder
-- Purpose : Wraps the "assign a responder to an incident" operation inside
--           a transaction so BOTH the assignment row AND the diary entry
--           succeed or fail together (atomicity).
--
--   p_incident_id   - The incident to assign (e.g. 1004)
--   p_authority_id  - The responder's authority_profile.authority_id (e.g. 1)
--   p_assigned_by   - The admin's user_id who is doing the assigning (e.g. 1)
--
-- Demo    : CALL sp_assign_responder(1004, 1, 1);
--           SELECT * FROM v_active_incidents WHERE display_id = 'AL-1004';
--           SELECT * FROM incident_report_log WHERE incident_id = 1004 ORDER BY log_id DESC;
-- ============================================================================
DELIMITER $$

CREATE PROCEDURE sp_assign_responder(
    IN p_incident_id   INT,
    IN p_authority_id  INT,
    IN p_assigned_by   INT
)
BEGIN
    -- Declare handler: on any SQL error, roll back and re-signal
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

        -- 1. Create the assignment record
        INSERT INTO incident_assignment
            (incident_id, authority_id, assigned_by, assignment_status, assigned_at)
        VALUES
            (p_incident_id, p_authority_id, p_assigned_by, 'Pending', NOW());

        -- 2. Promote the incident from Reported → Assigned
        --    (the trigger will auto-write the status-change diary entry)
        UPDATE incident
        SET incident_status = 'Assigned'
        WHERE incident_id = p_incident_id
          AND incident_status = 'Reported';   -- safety: only promote if still Reported

        -- 3. Write the authority-assignment diary entry
        INSERT INTO incident_report_log
            (incident_id, logged_by, log_type, old_value, new_value, notes)
        VALUES
            (p_incident_id,
             p_assigned_by,
             'AuthorityAssigned',
             NULL,
             (SELECT u.full_name
              FROM authority_profile ap
              JOIN users u ON u.user_id = ap.user_id
              WHERE ap.authority_id = p_authority_id),
             CONCAT('Assigned via sp_assign_responder by user_id=', p_assigned_by));

    COMMIT;
END$$

DELIMITER ;

-- ============================================================================
-- QUICK DEMO / VERIFICATION QUERIES  (run these one at a time in Workbench)
-- ============================================================================

-- 1. See all active incidents with responders:
-- SELECT * FROM v_active_incidents;

-- 2. See all resources, sorted by stock level:
-- SELECT * FROM v_resource_summary ORDER BY quantity_available ASC;

-- 3. See responder workload:
-- SELECT * FROM v_responder_workload;

-- 4. Test the stored procedure (assigns responder 1 to incident 1004):
-- CALL sp_assign_responder(1004, 1, 1);

-- 5. See the auto-logged trigger entries:
-- SELECT * FROM incident_report_log ORDER BY log_id DESC LIMIT 10;

-- 6. Test the trigger directly:
-- UPDATE incident SET incident_status = 'InProgress' WHERE incident_id = 1001;
-- SELECT * FROM incident_report_log WHERE incident_id = 1001 ORDER BY log_id DESC LIMIT 3;
