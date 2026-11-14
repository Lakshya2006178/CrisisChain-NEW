-- ============================================================================
--  CrisisChain - DATABASE RESET SCRIPT
--
--  ██████████████████████████████████████████████████████████████████████
--  ██                        !!!  WARNING  !!!                          ██
--  ██                                                                   ██
--  ██  Running this file PERMANENTLY DELETES ALL DATA in crisischain_db ██
--  ██  including every incident, user, organization, resource, log,     ██
--  ██  notification, and assignment row.                                ██
--  ██                                                                   ██
--  ██  ONLY run this file when you intentionally want to start fresh.   ██
--  ██  This file is NEVER called automatically by the application or    ██
--  ██  by the normal setup process.                                     ██
--  ██                                                                   ██
--  ██  Suggested workflow if you want a clean slate:                    ██
--  ██    1. Run reset.sql   (drops all tables)                         ██
--  ██    2. Run schema.sql  (recreates all 12 tables)                  ██
--  ██    3. Run seed.sql    (inserts demo data)                        ██
--  ██████████████████████████████████████████████████████████████████████
-- ============================================================================

USE crisischain_db;

-- ---------------------------------------------------------------------------
-- Temporarily disable foreign-key checks so we can drop in any order.
-- Children must still be dropped before parents in a real cascade-safe order,
-- but disabling FK checks gives us a safety net if the order is ever adjusted.
-- ---------------------------------------------------------------------------
SET FOREIGN_KEY_CHECKS = 0;

-- Drop children first, then parents.
-- (Tables that have FOREIGN KEY columns referencing other tables are children.)

DROP TABLE IF EXISTS notification;               -- references users, incident
DROP TABLE IF EXISTS authority_live_location;    -- references authority_profile, incident
DROP TABLE IF EXISTS incident_resource_allocation; -- references incident, resource, users
DROP TABLE IF EXISTS resource;                   -- references resource_center
DROP TABLE IF EXISTS resource_center;            -- references organization
DROP TABLE IF EXISTS incident_report_log;        -- references incident, users
DROP TABLE IF EXISTS incident_assignment;        -- references incident, authority_profile, users
DROP TABLE IF EXISTS incident;                   -- references users, incident_type
DROP TABLE IF EXISTS incident_type;              -- no foreign keys (parent only)
DROP TABLE IF EXISTS authority_profile;          -- references users, organization
DROP TABLE IF EXISTS users;                      -- no foreign keys (parent only)
DROP TABLE IF EXISTS organization;              -- no foreign keys (parent only)

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------------
-- After running this file, the database crisischain_db still exists but it
-- contains NO tables and NO data.
-- Run schema.sql next to rebuild the structure.
-- ---------------------------------------------------------------------------
SELECT 'reset.sql complete — all 12 CrisisChain tables have been dropped.' AS status;

