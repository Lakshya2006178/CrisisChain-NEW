import pool from '../config/db.js';

const VALID_ASSIGNMENT_STATUSES = ['Pending', 'Accepted', 'EnRoute', 'Arrived', 'Completed', 'Rejected'];

/**
 * Normalizes assignment status string to canonical enum value.
 */
const normalizeStatus = (status) => {
    if (!status) return null;
    const clean = String(status).trim().toLowerCase();
    const map = {
        'pending': 'Pending',
        'accepted': 'Accepted',
        'enroute': 'EnRoute',
        'en route': 'EnRoute',
        'arrived': 'Arrived',
        'completed': 'Completed',
        'resolved': 'Completed',
        'rejected': 'Rejected'
    };
    return map[clean] || null;
};

/**
 * Helper to format raw joined assignment database row into API response.
 */
const formatAssignmentRow = (row) => ({
    assignment_id: row.assignment_id,
    incident_id: row.incident_id,
    incident_code: `AL-${row.incident_id}`,
    authority_id: row.authority_id,
    assigned_by: row.assigned_by,
    assignment_status: row.assignment_status,
    assigned_at: row.assigned_at,
    accepted_at: row.accepted_at,
    arrived_at: row.arrived_at,
    completed_at: row.completed_at,
    // Incident fields
    incident: {
        incident_id: row.incident_id,
        code: `AL-${row.incident_id}`,
        title: row.incident_title,
        priority: row.incident_priority,
        status: row.incident_status,
        type: row.incident_type,
        location: row.incident_location,
        latitude: row.incident_latitude != null ? Number(row.incident_latitude) : null,
        longitude: row.incident_longitude != null ? Number(row.incident_longitude) : null,
        created_at: row.incident_created_at
    },
    // Responder / Authority fields
    responder: {
        authority_id: row.authority_id,
        user_id: row.responder_user_id,
        name: row.responder_name,
        email: row.responder_email,
        phone_number: row.responder_phone,
        authority_type: row.authority_type,
        credential_id: row.credential_id,
        availability_status: row.responder_availability
    },
    // Organization fields
    organization: {
        org_id: row.org_id,
        name: row.org_name,
        org_type: row.org_type
    },
    // Assignor
    assigned_by_name: row.assigned_by_name || 'System'
});

/**
 * Base SELECT query with all necessary joins.
 */
const BASE_ASSIGNMENT_SELECT = `
    SELECT 
        ia.assignment_id,
        ia.incident_id,
        ia.authority_id,
        ia.assigned_by,
        ia.assignment_status,
        ia.assigned_at,
        ia.accepted_at,
        ia.arrived_at,
        ia.completed_at,
        -- Incident fields
        i.title AS incident_title,
        i.priority_level AS incident_priority,
        i.incident_status,
        i.location_text AS incident_location,
        i.latitude AS incident_latitude,
        i.longitude AS incident_longitude,
        i.created_at AS incident_created_at,
        it.type_name AS incident_type,
        -- Authority / Responder fields
        ap.authority_type,
        ap.credential_id,
        ap.availability_status AS responder_availability,
        u_resp.user_id AS responder_user_id,
        u_resp.full_name AS responder_name,
        u_resp.email AS responder_email,
        u_resp.phone_number AS responder_phone,
        -- Organization fields
        o.org_id,
        o.name AS org_name,
        o.org_type,
        -- Assignor
        u_assign.full_name AS assigned_by_name
    FROM incident_assignment ia
    JOIN incident i ON ia.incident_id = i.incident_id
    JOIN incident_type it ON i.type_id = it.type_id
    JOIN authority_profile ap ON ia.authority_id = ap.authority_id
    JOIN users u_resp ON ap.user_id = u_resp.user_id
    JOIN organization o ON ap.org_id = o.org_id
    LEFT JOIN users u_assign ON ia.assigned_by = u_assign.user_id
`;

/**
 * GET /api/assignments
 * List assignments with optional filters: incident_id, authority_id, status, my
 */
export const getAssignments = async (req, res) => {
    try {
        const { incident_id, authority_id, status, my } = req.query;
        const conditions = [];
        const params = [];

        // Filter by incident
        if (incident_id) {
            const numId = parseInt(String(incident_id).replace(/^AL-/i, ''), 10);
            if (!isNaN(numId)) {
                conditions.push('ia.incident_id = ?');
                params.push(numId);
            }
        }

        // Filter by authority
        if (authority_id) {
            const authId = parseInt(authority_id, 10);
            if (!isNaN(authId)) {
                conditions.push('ia.authority_id = ?');
                params.push(authId);
            }
        }

        // Filter by status
        if (status && status !== 'All') {
            const normalized = normalizeStatus(status);
            if (normalized) {
                conditions.push('ia.assignment_status = ?');
                params.push(normalized);
            }
        }

        // Filter by logged-in responder's assignments
        if (my === 'true' || my === true) {
            conditions.push('ap.user_id = ?');
            params.push(req.user.user_id || req.user.id);
        }

        // Privacy boundary: Citizens without a specific incident filter can only see their reported incidents' assignments
        const isCitizen = req.user?.role === 'citizen';
        if (isCitizen && !incident_id) {
            conditions.push('i.reporter_id = ?');
            params.push(req.user.user_id || req.user.id);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const sql = `${BASE_ASSIGNMENT_SELECT} ${whereClause} ORDER BY ia.assigned_at DESC`;

        const [rows] = await pool.query(sql, params);
        const formatted = rows.map(r => {
            const rowObj = formatAssignmentRow(r);
            if (isCitizen) {
                // Redact responder personal contact info for citizen users
                if (rowObj.responder) {
                    rowObj.responder.phone = 'Protected';
                    rowObj.responder.email = 'Protected';
                }
                rowObj.responder_phone = 'Protected';
                rowObj.responder_email = 'Protected';
            }
            return rowObj;
        });
        res.json(formatted);
    } catch (err) {
        console.error('Error fetching assignments:', err);
        res.status(500).json({ error: 'Failed to fetch assignments.' });
    }
};

/**
 * GET /api/assignments/:id
 * Retrieve single assignment by ID
 */
export const getAssignmentById = async (req, res) => {
    try {
        const assignmentId = parseInt(req.params.id, 10);
        if (isNaN(assignmentId)) {
            return res.status(400).json({ error: 'Invalid assignment ID format.' });
        }

        const sql = `${BASE_ASSIGNMENT_SELECT} WHERE ia.assignment_id = ?`;
        const [rows] = await pool.query(sql, [assignmentId]);

        if (rows.length === 0) {
            return res.status(404).json({ error: `Assignment #${assignmentId} not found.` });
        }

        res.json(formatAssignmentRow(rows[0]));
    } catch (err) {
        console.error('Error fetching assignment by ID:', err);
        res.status(500).json({ error: 'Failed to fetch assignment.' });
    }
};

/**
 * POST /api/assignments
 * Assign a responder to an incident (Admin only)
 */
export const createAssignment = async (req, res) => {
    let conn;
    try {
        const { incident_id, authority_id, notes } = req.body;

        if (!incident_id) {
            return res.status(400).json({ error: 'incident_id is required.' });
        }
        if (!authority_id) {
            return res.status(400).json({ error: 'authority_id is required.' });
        }

        const numIncidentId = parseInt(String(incident_id).replace(/^AL-/i, ''), 10);
        const numAuthorityId = parseInt(authority_id, 10);

        if (isNaN(numIncidentId)) {
            return res.status(400).json({ error: 'Invalid incident ID format.' });
        }
        if (isNaN(numAuthorityId)) {
            return res.status(400).json({ error: 'Invalid authority ID format.' });
        }

        conn = await pool.getConnection();
        await conn.beginTransaction();

        // 1. Verify Incident exists and is not resolved
        const [incidentRows] = await conn.execute(
            'SELECT incident_id, title, incident_status FROM incident WHERE incident_id = ? FOR UPDATE',
            [numIncidentId]
        );
        if (incidentRows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: `Incident AL-${numIncidentId} not found.` });
        }
        const incident = incidentRows[0];
        if (incident.incident_status === 'Resolved') {
            await conn.rollback();
            return res.status(400).json({ error: 'Cannot assign a responder to a resolved incident.' });
        }

        // 2. Verify Authority exists and user is active
        const [authRows] = await conn.execute(
            `SELECT ap.authority_id, ap.user_id, ap.authority_type, ap.availability_status, u.full_name, u.is_active
             FROM authority_profile ap
             JOIN users u ON ap.user_id = u.user_id
             WHERE ap.authority_id = ? FOR UPDATE`,
            [numAuthorityId]
        );
        if (authRows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: `Authority profile #${numAuthorityId} not found.` });
        }
        const authority = authRows[0];
        if (!authority.is_active) {
            await conn.rollback();
            return res.status(400).json({ error: 'Cannot assign an inactive responder.' });
        }

        // 3. Check for existing assignment
        const [existingRows] = await conn.execute(
            'SELECT assignment_id, assignment_status FROM incident_assignment WHERE incident_id = ? AND authority_id = ?',
            [numIncidentId, numAuthorityId]
        );
        if (existingRows.length > 0) {
            await conn.rollback();
            return res.status(409).json({
                error: `Responder ${authority.full_name} is already assigned to incident AL-${numIncidentId} (Status: ${existingRows[0].assignment_status}).`
            });
        }

        // 4. Insert into incident_assignment
        const assignedBy = req.user?.user_id || null;
        const [insertResult] = await conn.execute(
            `INSERT INTO incident_assignment (incident_id, authority_id, assigned_by, assignment_status)
             VALUES (?, ?, ?, 'Pending')`,
            [numIncidentId, numAuthorityId, assignedBy]
        );
        const newAssignmentId = insertResult.insertId;

        // 5. Update incident status from 'Reported' to 'Assigned' if needed
        if (incident.incident_status === 'Reported') {
            await conn.execute(
                'UPDATE incident SET incident_status = "Assigned" WHERE incident_id = ?',
                [numIncidentId]
            );
        }

        // 6. Update responder availability status to 'Busy'
        await conn.execute(
            'UPDATE authority_profile SET availability_status = "Busy" WHERE authority_id = ?',
            [numAuthorityId]
        );

        // 7. Audit log in incident_report_log
        const logNote = notes ? String(notes).trim() : `Responder ${authority.full_name} (${authority.authority_type}) assigned by admin`;
        await conn.execute(
            `INSERT INTO incident_report_log (incident_id, logged_by, log_type, old_value, new_value, notes)
             VALUES (?, ?, 'AuthorityAssigned', NULL, ?, ?)`,
            [numIncidentId, assignedBy, `${authority.authority_type}: ${authority.full_name}`, logNote]
        );

        // 8. Create notification for the assigned responder
        await conn.execute(
            `INSERT INTO notification (recipient_id, incident_id, notification_type, title, message, is_read)
             VALUES (?, ?, 'Assignment', 'New Mission Assigned', ?, 0)`,
            [
                authority.user_id,
                numIncidentId,
                `You have been assigned to incident AL-${numIncidentId}: ${incident.title}`
            ]
        );

        await conn.commit();

        // 9. Fetch and return the newly created assignment with full joins
        const [newRows] = await pool.query(
            `${BASE_ASSIGNMENT_SELECT} WHERE ia.assignment_id = ?`,
            [newAssignmentId]
        );

        res.status(201).json(formatAssignmentRow(newRows[0]));
    } catch (err) {
        if (conn) await conn.rollback();
        console.error('Error creating assignment:', err);
        res.status(500).json({ error: 'Failed to create assignment.' });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * PATCH /api/assignments/:id/status
 * Update assignment status (Accepted, EnRoute, Arrived, Completed, Rejected)
 * Allowed for:
 * - Admin (any assignment)
 * - Assigned Responder (only their own assignment)
 */
export const updateAssignmentStatus = async (req, res) => {
    let conn;
    try {
        const assignmentId = parseInt(req.params.id, 10);
        if (isNaN(assignmentId)) {
            return res.status(400).json({ error: 'Invalid assignment ID format.' });
        }

        const rawStatus = req.body.status;
        const mappedStatus = normalizeStatus(rawStatus);
        if (!mappedStatus) {
            return res.status(400).json({
                error: `Invalid status. Allowed values: ${VALID_ASSIGNMENT_STATUSES.join(', ')}.`
            });
        }

        const notes = req.body.notes ? String(req.body.notes).trim() : null;

        conn = await pool.getConnection();
        await conn.beginTransaction();

        // 1. Fetch assignment and lock row
        const [rows] = await conn.execute(
            `SELECT 
                ia.assignment_id,
                ia.incident_id,
                ia.authority_id,
                ia.assignment_status,
                ia.accepted_at,
                ia.arrived_at,
                ia.completed_at,
                ap.user_id AS responder_user_id,
                ap.authority_type,
                u.full_name AS responder_name,
                i.incident_status,
                i.title AS incident_title
             FROM incident_assignment ia
             JOIN authority_profile ap ON ia.authority_id = ap.authority_id
             JOIN users u ON ap.user_id = u.user_id
             JOIN incident i ON ia.incident_id = i.incident_id
             WHERE ia.assignment_id = ? FOR UPDATE`,
            [assignmentId]
        );

        if (rows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: `Assignment #${assignmentId} not found.` });
        }

        const assignment = rows[0];
        const oldStatus = assignment.assignment_status;

        // 2. Authorization check: Admins can update any; Responders can only update their own
        if (req.user.role !== 'admin' && req.user.user_id !== assignment.responder_user_id) {
            await conn.rollback();
            return res.status(403).json({ error: 'Access denied. You can only update your own assignments.' });
        }

        // 3. Determine timestamp and incident updates based on new status
        let updateTimestampSql = '';
        if (mappedStatus === 'Accepted') {
            updateTimestampSql = ', accepted_at = COALESCE(accepted_at, NOW())';
            // Mark responder Busy
            await conn.execute(
                'UPDATE authority_profile SET availability_status = "Busy" WHERE authority_id = ?',
                [assignment.authority_id]
            );
        } else if (mappedStatus === 'EnRoute') {
            updateTimestampSql = ', accepted_at = COALESCE(accepted_at, NOW())';
            // Update incident to InProgress if currently Reported or Assigned
            if (assignment.incident_status === 'Reported' || assignment.incident_status === 'Assigned') {
                await conn.execute(
                    'UPDATE incident SET incident_status = "InProgress" WHERE incident_id = ?',
                    [assignment.incident_id]
                );
            }
        } else if (mappedStatus === 'Arrived') {
            updateTimestampSql = ', accepted_at = COALESCE(accepted_at, NOW()), arrived_at = COALESCE(arrived_at, NOW())';
            if (assignment.incident_status === 'Reported' || assignment.incident_status === 'Assigned') {
                await conn.execute(
                    'UPDATE incident SET incident_status = "InProgress" WHERE incident_id = ?',
                    [assignment.incident_id]
                );
            }
        } else if (mappedStatus === 'Completed') {
            updateTimestampSql = ', completed_at = COALESCE(completed_at, NOW())';

            // Check if responder has any other ongoing active assignments
            const [otherActive] = await conn.execute(
                `SELECT COUNT(*) AS active_count 
                 FROM incident_assignment 
                 WHERE authority_id = ? 
                   AND assignment_id != ? 
                   AND assignment_status IN ('Pending','Accepted','EnRoute','Arrived')`,
                [assignment.authority_id, assignmentId]
            );
            if (otherActive[0].active_count === 0) {
                // Free up responder
                await conn.execute(
                    'UPDATE authority_profile SET availability_status = "Available" WHERE authority_id = ?',
                    [assignment.authority_id]
                );
            }
        } else if (mappedStatus === 'Rejected') {
            // Check if responder has other active assignments
            const [otherActive] = await conn.execute(
                `SELECT COUNT(*) AS active_count 
                 FROM incident_assignment 
                 WHERE authority_id = ? 
                   AND assignment_id != ? 
                   AND assignment_status IN ('Pending','Accepted','EnRoute','Arrived')`,
                [assignment.authority_id, assignmentId]
            );
            if (otherActive[0].active_count === 0) {
                await conn.execute(
                    'UPDATE authority_profile SET availability_status = "Available" WHERE authority_id = ?',
                    [assignment.authority_id]
                );
            }

            // If all assignments for this incident are rejected, revert incident to Reported
            const [remainingActive] = await conn.execute(
                `SELECT COUNT(*) AS count 
                 FROM incident_assignment 
                 WHERE incident_id = ? 
                   AND assignment_id != ? 
                   AND assignment_status IN ('Pending','Accepted','EnRoute','Arrived','Completed')`,
                [assignment.incident_id, assignmentId]
            );
            if (remainingActive[0].count === 0 && assignment.incident_status === 'Assigned') {
                await conn.execute(
                    'UPDATE incident SET incident_status = "Reported" WHERE incident_id = ?',
                    [assignment.incident_id]
                );
            }
        }

        // 4. Update the assignment status
        await conn.execute(
            `UPDATE incident_assignment 
             SET assignment_status = ? ${updateTimestampSql} 
             WHERE assignment_id = ?`,
            [mappedStatus, assignmentId]
        );

        // 5. Append to incident_report_log
        const logNote = notes || `Assignment status updated from ${oldStatus} to ${mappedStatus} by ${req.user.role} (${req.user.email})`;
        await conn.execute(
            `INSERT INTO incident_report_log (incident_id, logged_by, log_type, old_value, new_value, notes)
             VALUES (?, ?, 'StatusChange', ?, ?, ?)`,
            [assignment.incident_id, req.user.user_id, oldStatus, mappedStatus, logNote]
        );

        // 6. Create in-app notification
        try {
            if (req.user.user_id === assignment.responder_user_id) {
                // Responder updated status -> notify Admin
                const adminRecipient = assignment.assigned_by || 1;
                const notifTitle = `Mission ${mappedStatus}`;
                const notifMsg = `Responder ${assignment.responder_name} (${assignment.authority_type}) marked mission on incident AL-${assignment.incident_id} as '${mappedStatus}'.`;
                await conn.execute(
                    `INSERT INTO notification (recipient_id, incident_id, notification_type, title, message, is_read)
                     VALUES (?, ?, 'Assignment', ?, ?, 0)`,
                    [adminRecipient, assignment.incident_id, notifTitle, notifMsg]
                );
            } else if (req.user.role === 'admin') {
                // Admin updated status -> notify Responder
                const notifTitle = `Mission Status Updated`;
                const notifMsg = `Your mission on incident AL-${assignment.incident_id} was updated to '${mappedStatus}' by Admin.`;
                await conn.execute(
                    `INSERT INTO notification (recipient_id, incident_id, notification_type, title, message, is_read)
                     VALUES (?, ?, 'Assignment', ?, ?, 0)`,
                    [assignment.responder_user_id, assignment.incident_id, notifTitle, notifMsg]
                );
            }
        } catch (notifErr) {
            console.warn('Could not insert assignment status notification:', notifErr.message);
        }

        await conn.commit();

        // 6. Return updated record with full joins
        const [updatedRows] = await pool.query(
            `${BASE_ASSIGNMENT_SELECT} WHERE ia.assignment_id = ?`,
            [assignmentId]
        );

        res.json(formatAssignmentRow(updatedRows[0]));
    } catch (err) {
        if (conn) await conn.rollback();
        console.error('Error updating assignment status:', err);
        res.status(500).json({ error: 'Failed to update assignment status.' });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * DELETE /api/assignments/:id
 * Remove / cancel an assignment (Admin only)
 */
export const deleteAssignment = async (req, res) => {
    let conn;
    try {
        const assignmentId = parseInt(req.params.id, 10);
        if (isNaN(assignmentId)) {
            return res.status(400).json({ error: 'Invalid assignment ID format.' });
        }

        conn = await pool.getConnection();
        await conn.beginTransaction();

        const [rows] = await conn.execute(
            `SELECT ia.assignment_id, ia.incident_id, ia.authority_id, u.full_name AS responder_name, i.incident_status
             FROM incident_assignment ia
             JOIN authority_profile ap ON ia.authority_id = ap.authority_id
             JOIN users u ON ap.user_id = u.user_id
             JOIN incident i ON ia.incident_id = i.incident_id
             WHERE ia.assignment_id = ? FOR UPDATE`,
            [assignmentId]
        );

        if (rows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: `Assignment #${assignmentId} not found.` });
        }

        const assignment = rows[0];

        // Delete assignment
        await conn.execute('DELETE FROM incident_assignment WHERE assignment_id = ?', [assignmentId]);

        // Check if other active assignments remain on incident
        const [remainingRows] = await conn.execute(
            `SELECT COUNT(*) AS count FROM incident_assignment 
             WHERE incident_id = ? AND assignment_status IN ('Pending','Accepted','EnRoute','Arrived')`,
            [assignment.incident_id]
        );

        if (remainingRows[0].count === 0 && assignment.incident_status === 'Assigned') {
            await conn.execute('UPDATE incident SET incident_status = "Reported" WHERE incident_id = ?', [assignment.incident_id]);
        }

        // Check if responder has other active assignments
        const [responderJobs] = await conn.execute(
            `SELECT COUNT(*) AS count FROM incident_assignment 
             WHERE authority_id = ? AND assignment_status IN ('Pending','Accepted','EnRoute','Arrived')`,
            [assignment.authority_id]
        );
        if (responderJobs[0].count === 0) {
            await conn.execute('UPDATE authority_profile SET availability_status = "Available" WHERE authority_id = ?', [assignment.authority_id]);
        }

        // Audit log
        await conn.execute(
            `INSERT INTO incident_report_log (incident_id, logged_by, log_type, old_value, new_value, notes)
             VALUES (?, ?, 'StatusChange', 'Assigned', NULL, ?)`,
            [assignment.incident_id, req.user.user_id, `Assignment #${assignmentId} (${assignment.responder_name}) removed by admin`]
        );

        await conn.commit();

        res.json({
            success: true,
            message: `Assignment #${assignmentId} removed successfully.`,
            incident_id: assignment.incident_id
        });
    } catch (err) {
        if (conn) await conn.rollback();
        console.error('Error deleting assignment:', err);
        res.status(500).json({ error: 'Failed to delete assignment.' });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * GET /api/assignments/responders/available
 * Returns all active authority profiles with their organization, availability, and active mission count.
 * Used for admin dispatching.
 */
export const getAvailableResponders = async (req, res) => {
    try {
        const sql = `
            SELECT 
                ap.authority_id,
                ap.authority_type,
                ap.credential_id,
                ap.availability_status,
                ap.coverage_radius_km,
                u.user_id,
                u.full_name,
                u.email,
                u.phone_number,
                o.org_id,
                o.name AS org_name,
                o.org_type,
                (SELECT COUNT(*) FROM incident_assignment ia 
                 WHERE ia.authority_id = ap.authority_id 
                   AND ia.assignment_status IN ('Pending','Accepted','EnRoute','Arrived')) AS active_assignments_count
            FROM authority_profile ap
            JOIN users u ON ap.user_id = u.user_id
            JOIN organization o ON ap.org_id = o.org_id
            WHERE u.is_active = 1
            ORDER BY 
                CASE WHEN ap.availability_status = 'Available' THEN 0 
                     WHEN ap.availability_status = 'Busy' THEN 1 
                     ELSE 2 END,
                active_assignments_count ASC,
                u.full_name ASC
        `;

        const [rows] = await pool.query(sql);

        const responders = rows.map(r => ({
            authority_id: r.authority_id,
            authority_type: r.authority_type,
            credential_id: r.credential_id,
            availability_status: r.availability_status,
            coverage_radius_km: Number(r.coverage_radius_km) || 10,
            user_id: r.user_id,
            name: r.full_name,
            full_name: r.full_name,
            email: r.email,
            phone_number: r.phone_number,
            organization: {
                org_id: r.org_id,
                name: r.org_name,
                type: r.org_type
            },
            active_assignments_count: Number(r.active_assignments_count) || 0
        }));

        res.json(responders);
    } catch (err) {
        console.error('Error fetching available responders:', err);
        res.status(500).json({ error: 'Failed to fetch available responders.' });
    }
};

