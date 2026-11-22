-- ============================================================================
--  CrisisChain - SEED DATA.  Run AFTER schema.sql.
--  Copied from your real mock arrays (alertController.js / resourceController.js)
--  so the website looks the same once it reads from MySQL.
--
--  DEMO LOGIN for every seeded user:  password = CrisisDemo@123
--  (stored below only as a bcrypt hash). Change it before any public demo.
--
--  ORDER MATTERS: parents first, because a foreign key needs something to point at.
-- ============================================================================
USE crisischain_db;

-- 1. INCIDENT TYPES (same 8 words as src/lib/incidentTypes.js) ----------------
INSERT INTO incident_type (type_id, type_name, icon_name) VALUES
 (1,'Fire','Flame'), (2,'Flood','Droplets'), (3,'Medical Emergency','HeartPulse'),
 (4,'Road Accident','AlertTriangle'), (5,'Natural Disaster','Wind'),
 (6,'Structural Collapse','Shield'), (7,'Hazardous Material','Radiation'),
 (8,'Other','AlertTriangle');

-- 2. ORGANIZATIONS (demo data built from your 7 mock centers) ------------------
INSERT INTO organization (org_id, name, org_type, contact_number, address, capacity_note, status) VALUES
 (1,'KMC Hospital Mangaluru','Hospital','08242225533','Ambedkar Circle, Mangaluru',NULL,'Active'),
 (2,'Nitte Gajria Hospital','Hospital','08202524820','Karkala Road, Udupi',NULL,'Active'),
 (3,'Government Hospital Mangaluru','Hospital','08242220223','Lalbagh, Mangaluru',NULL,'Active'),
 (4,'Dr. T.M.A. Pai Rotary Hospital','Hospital','08202922217','Manipal, Udupi',NULL,'Active'),
 (5,'Father Muller Medical College','Hospital','08242238000','Kankanady, Mangaluru',NULL,'Active'),
 (6,'Mangaluru Fire and Emergency Services','FireDept','08242231414','Hampankatta, Mangaluru',NULL,'Active'),
 (7,'Mangaluru City Police','Police','08242220600','Balmatta, Mangaluru',NULL,'Active'),
 (8,'Red Cross Mangaluru','NGO',NULL,'Mangaluru',NULL,'Inactive');
-- (org 8 owns no center on purpose: great for a LEFT JOIN demo)

-- 3. RESOURCE CENTERS (your 7 mock centers; center_id 1..7 = C-01..C-07) -------
INSERT INTO resource_center (center_id, org_id, name, center_type, latitude, longitude, address, contact_number) VALUES
 (1,1,'KMC Hospital Mangaluru','Hospital',12.864500,74.843200,'Ambedkar Circle, Mangaluru','08242225533'),
 (2,2,'Nitte Gajria Hospital','Hospital',13.225700,75.013300,'Karkala Road, Udupi','08202524820'),
 (3,3,'Government Hospital Mangaluru','Hospital',12.867800,74.843000,'Lalbagh, Mangaluru','08242220223'),
 (4,4,'Dr.T.M.A. Pai Rotary Hospital','Hospital',13.223500,74.977400,'Manipal, Udupi','08202922217'),
 (5,5,'Father Muller Medical College','Hospital',12.914100,74.856000,'Kankanady, Mangaluru','08242238000'),
 (6,6,'Mangaluru Fire Station','FireStation',12.871900,74.842200,'Hampankatta, Mangaluru','08242231414'),
 (7,7,'Mangaluru City Police HQ','Police',12.866600,74.843800,'Balmatta, Mangaluru','08242220600');

-- 4. RESOURCES (stock inside each center) --------------------------------------
INSERT INTO resource (resource_id, center_id, resource_type, quantity_available) VALUES
 (1,1,'ICU Beds',45),(2,1,'Ventilators',12),(3,1,'Ambulances',5),
 (4,2,'ICU Beds',20),(5,2,'Ventilators',8),(6,2,'Ambulances',3),
 (7,3,'General Beds',80),(8,3,'Ambulances',8),
 (9,4,'ICU Beds',35),(10,4,'Ventilators',15),
 (11,5,'ICU Beds',60),(12,5,'Ambulances',10),
 (13,6,'Fire Engines',6),(14,6,'Rescue Teams',4),
 (15,7,'Patrol Cars',15),(16,7,'Officers',50);

-- 5. USERS (login = email + password) -------------------------------------------
-- admin: admin123  |  other demo users: password123
INSERT INTO users (user_id, full_name, email, phone_number, password_hash, role) VALUES
 (1,'System Admin','admin@crisischain.com','9000000001','$2a$10$TJxwrIgJx10QNluoEYkjte3acrYvpfMqEP1r/JBz/vqXNRpt1P.B2','admin'),
 (2,'Asha Rao','asha@example.com','9000000002','$2a$10$GRXwKj/vVGbrVHjqTFTk0.ibVnf/ngziPK2EQXEQKkNM7RwgiIBGO','citizen'),
 (3,'Ravi Kumar','ravi.paramedic@example.com','9000000003','$2a$10$GRXwKj/vVGbrVHjqTFTk0.ibVnf/ngziPK2EQXEQKkNM7RwgiIBGO','responder'),
 (4,'Meera Shetty','meera.fire@example.com','9000000004','$2a$10$GRXwKj/vVGbrVHjqTFTk0.ibVnf/ngziPK2EQXEQKkNM7RwgiIBGO','responder'),
 (5,'Dr. Anil Hegde','anil.kmc@example.com','9000000005','$2a$10$GRXwKj/vVGbrVHjqTFTk0.ibVnf/ngziPK2EQXEQKkNM7RwgiIBGO','hospital'),
 (6,'Inspector Dsouza','dsouza.police@example.com','9000000006','$2a$10$GRXwKj/vVGbrVHjqTFTk0.ibVnf/ngziPK2EQXEQKkNM7RwgiIBGO','responder');

-- 6. AUTHORITY PROFILES (responders and hospital staff, linked to organizations) -
INSERT INTO authority_profile (authority_id, user_id, org_id, authority_type, credential_id, availability_status) VALUES
 (1,3,1,'Paramedic','EMP-KMC-014','Available'),
 (2,4,6,'Fire Officer','FD-0231','Busy'),
 (3,5,1,'Hospital Representative','EMP-KMC-002','Available'),
 (4,6,7,'Police Inspector','POL-1187','Busy');

-- 7. INCIDENTS (your 7 mock alerts; ids 1001..1007 display as AL-1001..AL-1007) -
INSERT INTO incident (incident_id, reporter_id, type_id, title, description, location_text, latitude, longitude, incident_status, priority_level, created_at, resolved_at) VALUES
 (1001,NULL,1,'Major structure fire at downtown block','Major structure fire at downtown block','123 Main St, Mangaluru',12.871900,74.842200,'Reported','High',NOW() - INTERVAL 1 HOUR,NULL),
 (1002,NULL,4,'Multiple vehicle collision on highway','Multiple vehicle collision on highway','NH-66, near Pumpwell',12.859300,74.855000,'InProgress','Critical',NOW() - INTERVAL 2 HOUR,NULL),
 (1003,NULL,3,'Mass casualty medical emergency','Mass casualty medical emergency','KMC Hospital area',12.864400,74.843200,'Assigned','Critical',NOW() - INTERVAL 3 HOUR,NULL),
 (1004,2,2,'Severe flash flood due to heavy rains','Severe flash flood due to heavy rains','Lower Bendoorwell',12.871000,74.856000,'Reported','Medium',NOW() - INTERVAL 4 HOUR,NULL),
 (1005,NULL,7,'Chemical spill at industrial estate','Chemical spill at industrial estate','Baikampady Industrial Estate',12.934000,74.814200,'InProgress','Critical',NOW() - INTERVAL 5 HOUR,NULL),
 (1006,NULL,6,'Old building collapse','Old building collapse','Bunder area',12.865500,74.836000,'Resolved','Medium',NOW() - INTERVAL 6 HOUR,NOW() - INTERVAL 2 HOUR),
 (1007,NULL,5,'Cyclone alert and high winds','Cyclone alert and high winds','Panambur Beach',12.914100,74.810500,'Reported','Medium',NOW() - INTERVAL 7 HOUR,NULL);

-- 8. ASSIGNMENTS (kept consistent with each incident's status) --------------------
INSERT INTO incident_assignment (assignment_id, incident_id, authority_id, assigned_by, assignment_status, assigned_at, accepted_at, arrived_at, completed_at) VALUES
 (1,1002,4,1,'Accepted',NOW() - INTERVAL 110 MINUTE,NOW() - INTERVAL 100 MINUTE,NULL,NULL),
 (2,1003,1,1,'Pending',NOW() - INTERVAL 170 MINUTE,NULL,NULL,NULL),
 (3,1005,2,1,'Accepted',NOW() - INTERVAL 280 MINUTE,NOW() - INTERVAL 270 MINUTE,NULL,NULL),
 (4,1006,2,1,'Completed',NOW() - INTERVAL 350 MINUTE,NOW() - INTERVAL 340 MINUTE,NOW() - INTERVAL 300 MINUTE,NOW() - INTERVAL 120 MINUTE);

-- 9. DIARY / AUDIT LOG (append-only: only INSERTs, never UPDATE or DELETE) --------
INSERT INTO incident_report_log (incident_id, logged_by, log_type, old_value, new_value, notes) VALUES
 (1001,NULL,'StatusChange',NULL,'Reported','Report received'),
 (1002,NULL,'StatusChange',NULL,'Reported','Report received'),
 (1002,1,'AuthorityAssigned',NULL,'Inspector Dsouza','Assigned by admin'),
 (1002,1,'StatusChange','Reported','InProgress',NULL),
 (1003,NULL,'StatusChange',NULL,'Reported','Report received'),
 (1003,1,'StatusChange','Reported','Assigned',NULL),
 (1004,2,'StatusChange',NULL,'Reported','Report received'),
 (1005,NULL,'StatusChange',NULL,'Reported','Report received'),
 (1005,1,'StatusChange','Reported','InProgress',NULL),
 (1006,NULL,'StatusChange',NULL,'Reported','Report received'),
 (1006,1,'StatusChange','Reported','InProgress',NULL),
 (1006,4,'ResolutionSummary','InProgress','Resolved','Area cleared, no casualties'),
 (1007,NULL,'StatusChange',NULL,'Reported','Report received');

-- 10. RESOURCE ALLOCATION (which stock was used on which incident) ----------------
INSERT INTO incident_resource_allocation (incident_id, resource_id, quantity_allocated) VALUES
 (1003,3,2),   -- 2 KMC ambulances to the mass-casualty incident
 (1005,13,2),  -- 2 fire engines to the chemical spill
 (1006,14,1);  -- 1 rescue team to the building collapse

-- 11. RESPONDER GPS BREADCRUMBS ----------------------------------------------------
INSERT INTO authority_live_location (authority_id, incident_id, latitude, longitude, recorded_at) VALUES
 (1,1003,12.862000,74.841000,NOW() - INTERVAL 20 MINUTE),
 (1,1003,12.863600,74.842500,NOW() - INTERVAL 5 MINUTE),
 (2,1005,12.920000,74.820000,NOW() - INTERVAL 15 MINUTE),
 (4,1002,12.858000,74.853000,NOW() - INTERVAL 10 MINUTE);

-- 12. NOTIFICATIONS (one row = one message for one person) ---------------------------
INSERT INTO notification (recipient_id, incident_id, notification_type, message, is_read) VALUES
 (1,1002,'Alert','Critical: multiple vehicle collision on NH-66',0),
 (3,1003,'Assignment','You have been assigned to the mass casualty emergency near KMC',0),
 (2,1004,'StatusUpdate','Your flood report has been received',1);

-- Check:  SELECT COUNT(*) FROM incident;  -> 7     SELECT COUNT(*) FROM resource_center; -> 7
