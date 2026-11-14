-- ============================================================================
--  CrisisChain - FINAL SCHEMA (12 tables)           Database: crisischain_db
--  Run this FIRST in MySQL Workbench, then run seed.sql.
--
--  Reading guide for beginners:
--    PRIMARY KEY  = the column that uniquely names each row (never repeats)
--    FOREIGN KEY  = a column that points at a row in another table
--    AUTO_INCREMENT = MySQL numbers the rows for you (1, 2, 3 ...)
--    ENUM         = the column may only hold one of the listed words
--    CHECK        = a rule the data must obey (MySQL 8.0.16+ enforces it)
--    ON DELETE RESTRICT  = refuse to delete a row that others still point to
--    ON DELETE SET NULL  = if the parent is deleted, blank the pointer
--    ON DELETE CASCADE   = if the parent is deleted, delete the children too
--
--  Words below match the website EXACTLY (checked against the codebase audit),
--  so the app needs no translation layer for severity, type or center words.
--
--  HOW TO USE THIS FILE
--  --------------------
--  Initial setup (first time only):
--    1. Create the database:  CREATE DATABASE IF NOT EXISTS crisischain_db;
--    2. Run this file in MySQL Workbench (once).
--    3. Run seed.sql to load demo data.
--
--  NEVER run this file a second time on a live database — the CREATE TABLE IF
--  NOT EXISTS statements are safe (they skip existing tables), but re-running
--  it will NOT wipe or reset data.  Use reset.sql if you intentionally want
--  a clean slate (see the WARNING in that file first).
-- ============================================================================

CREATE DATABASE IF NOT EXISTS crisischain_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE crisischain_db;

-- ---------------------------------------------------------------------------
-- NOTE: DROP statements have been moved to server/db/reset.sql.
--       This file is now safe to inspect and re-read without risking data loss.
-- ---------------------------------------------------------------------------

-- ===========================================================================
-- 1. ORGANIZATION  (NEW - mentor feedback)
--    A real record for each hospital / fire dept / police unit / NGO.
--    Replaces the old typed-text "organization_name".
--    'status' uses the words the Settings page shows: Active / Inactive.
--    'capacity_note' is only a display label such as '200 Beds'
--    (the real numbers live in the resource table).
-- ===========================================================================
CREATE TABLE IF NOT EXISTS organization (
    org_id         INT           NOT NULL AUTO_INCREMENT,
    name           VARCHAR(200)  NOT NULL,
    org_type       ENUM('Hospital','FireDept','Police','Military','NGO','Other') NOT NULL,
    contact_number VARCHAR(20)   NULL,
    address        VARCHAR(255)  NULL,
    capacity_note  VARCHAR(50)   NULL,
    status         ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
    created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (org_id),
    UNIQUE KEY uq_org_name (name),
    KEY idx_org_type   (org_type),    -- speeds up "show all hospitals"
    KEY idx_org_status (status)       -- speeds up "show only Active orgs"
) ENGINE=InnoDB;

-- ===========================================================================
-- 2. USERS  - everyone who can log in. Login = email + password.
--    (Aadhar removed. The ID is a plain auto-number.)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS users (
    user_id       INT           NOT NULL AUTO_INCREMENT,
    full_name     VARCHAR(150)  NOT NULL,
    email         VARCHAR(255)  NOT NULL,
    phone_number  VARCHAR(15)   NOT NULL,
    password_hash VARCHAR(255)  NOT NULL,          -- bcrypt hash, never the real password
    role          ENUM('citizen','responder','hospital','admin') NOT NULL DEFAULT 'citizen',
    is_active     TINYINT(1)    NOT NULL DEFAULT 1,
    created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id),
    UNIQUE KEY uq_users_email (email),
    KEY idx_users_role      (role),          -- speeds up "list all responders"
    KEY idx_users_is_active (is_active)      -- speeds up "list only active users"
) ENGINE=InnoDB;

-- ===========================================================================
-- 3. AUTHORITY_PROFILE - extra details for responder / hospital users.
--    ONE-TO-ONE with users (user_id is UNIQUE).
--    MANY profiles belong to ONE organization.
-- ===========================================================================
CREATE TABLE IF NOT EXISTS authority_profile (
    authority_id        INT          NOT NULL AUTO_INCREMENT,
    user_id             INT          NOT NULL,
    org_id              INT          NOT NULL,
    authority_type      VARCHAR(80)  NOT NULL,        -- e.g. Paramedic, Fire Officer
    credential_id       VARCHAR(100) NULL,            -- badge / employee number
    availability_status ENUM('Available','Busy','Offline') NOT NULL DEFAULT 'Available',
    coverage_radius_km  DECIMAL(6,2) NOT NULL DEFAULT 10.00,
    created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (authority_id),
    UNIQUE KEY uq_authority_user (user_id),           -- UNIQUE makes it 1:1
    KEY idx_authority_org         (org_id),           -- speeds up "responders in org X"
    KEY idx_authority_avail       (availability_status),
    CONSTRAINT fk_authority_user FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_authority_org  FOREIGN KEY (org_id)  REFERENCES organization(org_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ===========================================================================
-- 4. INCIDENT_TYPE - the lookup list (the dropdown). 8 rows, same words as
--    src/lib/incidentTypes.js. type_name is what the frontend sends.
-- ===========================================================================
CREATE TABLE IF NOT EXISTS incident_type (
    type_id    INT          NOT NULL AUTO_INCREMENT,
    type_name  VARCHAR(100) NOT NULL,
    icon_name  VARCHAR(50)  NULL,
    PRIMARY KEY (type_id),
    UNIQUE KEY uq_type_name (type_name)
) ENGINE=InnoDB;

-- ===========================================================================
-- 5. INCIDENT - one row per emergency report. The heart of the project.
--    reporter_id may be NULL = anonymous guest report.
--    The frontend shows ids like 'AL-1001': AUTO_INCREMENT starts at 1001 and
--    the backend simply writes 'AL-' + incident_id.
--    'title' is filled by the backend from the description (the report form
--    has no title box).
--    Status words: the website's "Responding" button = 'InProgress' here.
-- ===========================================================================
CREATE TABLE IF NOT EXISTS incident (
    incident_id     INT           NOT NULL AUTO_INCREMENT,
    reporter_id     INT           NULL,
    type_id         INT           NOT NULL,
    title           VARCHAR(150)  NOT NULL,
    description     TEXT          NULL,
    location_text   VARCHAR(500)  NULL,
    latitude        DECIMAL(9,6)  NULL
                    CHECK (latitude  IS NULL OR (latitude  BETWEEN -90  AND 90)),
    longitude       DECIMAL(9,6)  NULL
                    CHECK (longitude IS NULL OR (longitude BETWEEN -180 AND 180)),
    image_url       VARCHAR(500)  NULL,
    incident_status ENUM('Reported','Assigned','InProgress','Resolved') NOT NULL DEFAULT 'Reported',
    priority_level  ENUM('Low','Medium','High','Critical') NOT NULL DEFAULT 'Medium',
    created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at     TIMESTAMP     NULL,
    updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (incident_id),
    KEY idx_incident_status   (incident_status),    -- speeds up "WHERE status = ..."
    KEY idx_incident_created  (created_at),         -- speeds up ORDER BY created_at
    KEY idx_incident_priority (priority_level),     -- speeds up "WHERE priority = Critical"
    KEY idx_incident_type     (type_id),            -- speeds up JOIN on type_id
    KEY idx_incident_reporter (reporter_id),        -- speeds up "my reports" queries
    CONSTRAINT fk_incident_reporter FOREIGN KEY (reporter_id) REFERENCES users(user_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_incident_type FOREIGN KEY (type_id) REFERENCES incident_type(type_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1001;

-- ===========================================================================
-- 6. INCIDENT_ASSIGNMENT - which responder handles which incident.
--    MANY-TO-MANY between incident and authority_profile.
--    UNIQUE(incident_id, authority_id): the same responder cannot be
--    assigned to the same incident twice.
-- ===========================================================================
CREATE TABLE IF NOT EXISTS incident_assignment (
    assignment_id     INT       NOT NULL AUTO_INCREMENT,
    incident_id       INT       NOT NULL,
    authority_id      INT       NOT NULL,
    assigned_by       INT       NULL,                   -- the admin who assigned it
    assignment_status ENUM('Pending','Accepted','EnRoute','Arrived','Completed','Rejected')
                                NOT NULL DEFAULT 'Pending',
    assigned_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    accepted_at       TIMESTAMP NULL,
    arrived_at        TIMESTAMP NULL,
    completed_at      TIMESTAMP NULL,
    PRIMARY KEY (assignment_id),
    UNIQUE KEY uq_assign_pair (incident_id, authority_id),
    KEY idx_assign_incident  (incident_id),   -- speeds up "assignments for incident X"
    KEY idx_assign_authority (authority_id),  -- speeds up "jobs for responder Y"
    KEY idx_assign_status    (assignment_status),
    CONSTRAINT fk_assign_incident  FOREIGN KEY (incident_id)  REFERENCES incident(incident_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_assign_authority FOREIGN KEY (authority_id) REFERENCES authority_profile(authority_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_assign_by        FOREIGN KEY (assigned_by)  REFERENCES users(user_id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ===========================================================================
-- 7. INCIDENT_REPORT_LOG - APPEND-ONLY diary.
--    Rule: the app only ever runs INSERT on this table. Never UPDATE/DELETE.
--    incident_id uses RESTRICT so an incident with history cannot be deleted.
-- ===========================================================================
CREATE TABLE IF NOT EXISTS incident_report_log (
    log_id      INT        NOT NULL AUTO_INCREMENT,
    incident_id INT        NOT NULL,
    logged_by   INT        NULL,                        -- NULL = system
    log_type    ENUM('StatusChange','AuthorityAssigned','FieldNote',
                     'ResolutionSummary','SystemEvent') NOT NULL,
    old_value   TEXT       NULL,
    new_value   TEXT       NULL,
    notes       TEXT       NULL,
    logged_at   TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (log_id),
    KEY idx_log_incident (incident_id, logged_at),
    KEY idx_log_type     (log_type),
    CONSTRAINT fk_log_incident FOREIGN KEY (incident_id) REFERENCES incident(incident_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_log_user FOREIGN KEY (logged_by) REFERENCES users(user_id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ===========================================================================
-- 8. RESOURCE_CENTER - hospitals, fire stations, police stations (map pins).
--    center_type words match ResourceInventory.jsx exactly.
--    org_id says which organization runs the center.
-- ===========================================================================
CREATE TABLE IF NOT EXISTS resource_center (
    center_id      INT          NOT NULL AUTO_INCREMENT,
    org_id         INT          NOT NULL,
    name           VARCHAR(200) NOT NULL,
    center_type    ENUM('Hospital','FireStation','Police','Military','NGO','Other') NOT NULL,
    latitude       DECIMAL(9,6) NOT NULL
                   CHECK (latitude  BETWEEN -90  AND 90),
    longitude      DECIMAL(9,6) NOT NULL
                   CHECK (longitude BETWEEN -180 AND 180),
    address        VARCHAR(255) NOT NULL,
    contact_number VARCHAR(20)  NULL,
    created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (center_id),
    KEY idx_center_org    (org_id),          -- speeds up "centers for org X"
    KEY idx_center_type   (center_type),     -- speeds up "show all hospitals"
    KEY idx_center_coords (latitude, longitude), -- speeds up map/nearest queries
    CONSTRAINT fk_center_org FOREIGN KEY (org_id) REFERENCES organization(org_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ===========================================================================
-- 9. RESOURCE - stock inside a center (ICU Beds, Ambulances, Fire Engines).
--    CHECK stops negative stock: try inserting -1 and MySQL refuses.
-- ===========================================================================
CREATE TABLE IF NOT EXISTS resource (
    resource_id        INT          NOT NULL AUTO_INCREMENT,
    center_id          INT          NOT NULL,
    resource_type      VARCHAR(100) NOT NULL,
    quantity_available INT          NOT NULL DEFAULT 0,
    last_updated       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (resource_id),
    UNIQUE KEY uq_center_resource (center_id, resource_type),
    KEY idx_resource_center (center_id),         -- speeds up "stock in center X"
    CONSTRAINT chk_resource_qty CHECK (quantity_available >= 0),
    CONSTRAINT fk_resource_center FOREIGN KEY (center_id) REFERENCES resource_center(center_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ===========================================================================
-- 10. INCIDENT_RESOURCE_ALLOCATION
--     Which stock was used on which incident. MANY-TO-MANY between
--     incident and resource. released_at stays NULL until stock is returned.
--
--     CONSTRAINT NOTE (important):
--     The old schema used UNIQUE KEY uq_incident_resource (incident_id, resource_id).
--     That prevented re-allocating the same resource to the same incident after
--     it had been released. This is now REMOVED. Instead:
--
--       - Duplicate ACTIVE allocations (same incident + resource, released_at IS NULL)
--         are blocked by the application layer (the INSERT checks first).
--       - Re-allocation after release is explicitly allowed and is the correct
--         real-world behaviour (e.g., an ambulance can be re-deployed to the
--         same incident after returning to base).
--       - The allocated_by column records which admin/user triggered the allocation.
-- ===========================================================================
CREATE TABLE IF NOT EXISTS incident_resource_allocation (
    allocation_id      INT       NOT NULL AUTO_INCREMENT,
    incident_id        INT       NOT NULL,
    resource_id        INT       NOT NULL,
    quantity_allocated INT       NOT NULL,
    allocated_by       INT       NULL,             -- user_id of admin who allocated
    allocated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    released_at        TIMESTAMP NULL,             -- NULL = still in use
    PRIMARY KEY (allocation_id),
    KEY idx_alloc_incident  (incident_id),         -- speeds up "resources for incident X"
    KEY idx_alloc_resource  (resource_id),         -- speeds up "incidents using resource Y"
    KEY idx_alloc_active    (incident_id, resource_id, released_at),
    CONSTRAINT chk_alloc_qty CHECK (quantity_allocated > 0),
    CONSTRAINT fk_alloc_incident FOREIGN KEY (incident_id) REFERENCES incident(incident_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_alloc_resource FOREIGN KEY (resource_id) REFERENCES resource(resource_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_alloc_by FOREIGN KEY (allocated_by) REFERENCES users(user_id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ===========================================================================
-- 11. AUTHORITY_LIVE_LOCATION - breadcrumb trail of responder GPS points.
--     No screen shows it yet; you demo it with queries in Workbench.
-- ===========================================================================
CREATE TABLE IF NOT EXISTS authority_live_location (
    location_id  INT          NOT NULL AUTO_INCREMENT,
    authority_id INT          NOT NULL,
    incident_id  INT          NULL,                    -- NULL = not on a job
    latitude     DECIMAL(9,6) NOT NULL
                 CHECK (latitude  BETWEEN -90  AND 90),
    longitude    DECIMAL(9,6) NOT NULL
                 CHECK (longitude BETWEEN -180 AND 180),
    recorded_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (location_id),
    KEY idx_authority_latest (authority_id, recorded_at),
    CONSTRAINT fk_loc_authority FOREIGN KEY (authority_id) REFERENCES authority_profile(authority_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_loc_incident FOREIGN KEY (incident_id) REFERENCES incident(incident_id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ===========================================================================
-- 12. NOTIFICATION (MERGED: old notification + notification_recipient)
--     One row = one message for one person. is_read powers the bell badge.
-- ===========================================================================
CREATE TABLE IF NOT EXISTS notification (
    notification_id   INT       NOT NULL AUTO_INCREMENT,
    recipient_id      INT       NOT NULL,
    incident_id       INT       NULL,
    notification_type ENUM('Alert','Assignment','StatusUpdate','Broadcast','System') NOT NULL,
    title             VARCHAR(200) NULL,
    message           TEXT      NULL,
    is_read           TINYINT(1) NOT NULL DEFAULT 0,
    read_at           TIMESTAMP NULL,
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (notification_id),
    KEY idx_notif_recipient (recipient_id, is_read),  -- speeds up unread-count badge
    KEY idx_notif_incident  (incident_id),            -- speeds up "notifications for incident X"
    CONSTRAINT fk_notif_user FOREIGN KEY (recipient_id) REFERENCES users(user_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_notif_incident FOREIGN KEY (incident_id) REFERENCES incident(incident_id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
--  Quick check after running:
--    SHOW TABLES;             -- should list exactly 12 tables
--    SHOW CREATE TABLE incident_resource_allocation;   -- confirm no uq_incident_resource
-- ============================================================================
