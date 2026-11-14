import pool from '../config/db.js';

/**
 * Format a joined allocation row into a standard response object.
 */
const formatAllocationRow = (row) => {
    const isReleased = row.released_at !== null;
    return {
        allocation_id: row.allocation_id,
        id: row.allocation_id,
        incident_id: row.incident_id,
        incident_display_id: `AL-${row.incident_id}`,
        incident_title: row.incident_title,
        incident_status: row.incident_status,
        incident_priority: row.priority_level,
        incident_location: row.incident_location,
        resource_id: row.resource_id,
        resource_type: row.resource_type,
        quantity_allocated: Number(row.quantity_allocated),
        quantity: Number(row.quantity_allocated),
        allocated_by: row.allocated_by,
        allocated_by_name: row.allocated_by_name || 'System Admin',
        allocated_by_email: row.allocated_by_email,
        allocated_at: row.allocated_at,
        released_at: row.released_at,
        status: isReleased ? 'Released' : 'Active',
        center_id: row.center_id,
        center_name: row.center_name,
        center_type: row.center_type,
        center_address: row.center_address,
        org_id: row.org_id,
        organization_name: row.organization_name,
        current_available_stock: Number(row.current_available_stock || 0)
    };
};

/**
 * GET /api/allocations
 * Retrieves all incident resource allocations with filtering by incident, resource, center, or status.
 */
export const getAllocations = async (req, res) => {
    try {
        const { incident_id, resource_id, center_id, status } = req.query;

        const conditions = [];
        const params = [];

        if (incident_id) {
            const numIncident = parseInt(String(incident_id).replace(/^AL-0?/i, ''), 10);
            if (!isNaN(numIncident)) {
                conditions.push("ira.incident_id = ?");
                params.push(numIncident);
            }
        }

        if (resource_id) {
            const numResource = parseInt(String(resource_id).replace(/^[A-Za-z]+-0?/, ''), 10);
            if (!isNaN(numResource)) {
                conditions.push("ira.resource_id = ?");
                params.push(numResource);
            }
        }

        if (center_id) {
            const numCenter = parseInt(String(center_id).replace(/^C-0?/i, ''), 10);
            if (!isNaN(numCenter)) {
                conditions.push("r.center_id = ?");
                params.push(numCenter);
            }
        }

        if (status) {
            const s = status.trim().toLowerCase();
            if (s === 'active' || s === 'allocated') {
                conditions.push("ira.released_at IS NULL");
            } else if (s === 'released' || s === 'completed') {
                conditions.push("ira.released_at IS NOT NULL");
            }
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const sql = `
            SELECT 
                ira.allocation_id,
                ira.incident_id,
                ira.resource_id,
                ira.quantity_allocated,
                ira.allocated_by,
                ira.allocated_at,
                ira.released_at,
                i.title AS incident_title,
                i.incident_status,
                i.priority_level,
                i.location_text AS incident_location,
                r.resource_type,
                r.quantity_available AS current_available_stock,
                rc.center_id,
                rc.name AS center_name,
                rc.center_type,
                rc.address AS center_address,
                o.org_id,
                o.name AS organization_name,
                u.full_name AS allocated_by_name,
                u.email AS allocated_by_email
            FROM incident_resource_allocation ira
            JOIN incident i ON ira.incident_id = i.incident_id
            JOIN resource r ON ira.resource_id = r.resource_id
            JOIN resource_center rc ON r.center_id = rc.center_id
            JOIN organization o ON rc.org_id = o.org_id
            LEFT JOIN users u ON ira.allocated_by = u.user_id
            ${whereClause}
            ORDER BY ira.allocated_at DESC, ira.allocation_id DESC
        `;

        const [rows] = await pool.query(sql, params);
        res.json(rows.map(formatAllocationRow));
    } catch (err) {
        console.error('Error fetching allocations:', err);
        res.status(500).json({ error: 'Failed to fetch allocations.' });
    }
};

/**
 * GET /api/allocations/:id
 * Retrieves details of a single resource allocation.
 */
export const getAllocationById = async (req, res) => {
    try {
        const rawId = req.params.id;
        const allocationId = parseInt(rawId, 10);

        if (isNaN(allocationId)) {
            return res.status(400).json({ error: 'Invalid allocation ID.' });
        }

        const sql = `
            SELECT 
                ira.allocation_id,
                ira.incident_id,
                ira.resource_id,
                ira.quantity_allocated,
                ira.allocated_by,
                ira.allocated_at,
                ira.released_at,
                i.title AS incident_title,
                i.incident_status,
                i.priority_level,
                i.location_text AS incident_location,
                r.resource_type,
                r.quantity_available AS current_available_stock,
                rc.center_id,
                rc.name AS center_name,
                rc.center_type,
                rc.address AS center_address,
                o.org_id,
                o.name AS organization_name,
                u.full_name AS allocated_by_name,
                u.email AS allocated_by_email
            FROM incident_resource_allocation ira
            JOIN incident i ON ira.incident_id = i.incident_id
            JOIN resource r ON ira.resource_id = r.resource_id
            JOIN resource_center rc ON r.center_id = rc.center_id
            JOIN organization o ON rc.org_id = o.org_id
            LEFT JOIN users u ON ira.allocated_by = u.user_id
            WHERE ira.allocation_id = ?
        `;

        const [rows] = await pool.query(sql, [allocationId]);
        if (rows.length === 0) {
            return res.status(404).json({ error: `Allocation #${allocationId} not found.` });
        }

        res.json(formatAllocationRow(rows[0]));
    } catch (err) {
        console.error('Error fetching allocation by ID:', err);
        res.status(500).json({ error: 'Failed to fetch allocation.' });
    }
};

/**
 * POST /api/allocations
 * Allocates a quantity of a resource to an incident with transaction and row-level locking.
 * Deducts stock from resource table atomically.
 */
export const createAllocation = async (req, res) => {
    let conn;
    try {
        const { incident_id, resource_id, quantity_allocated, quantity } = req.body;

        if (!incident_id) {
            return res.status(400).json({ error: 'incident_id is required.' });
        }
        if (!resource_id) {
            return res.status(400).json({ error: 'resource_id is required.' });
        }

        const numIncident = parseInt(String(incident_id).replace(/^AL-0?/i, ''), 10);
        if (isNaN(numIncident)) {
            return res.status(400).json({ error: 'Invalid incident_id format.' });
        }

        const numResource = parseInt(String(resource_id).replace(/^[A-Za-z]+-0?/, ''), 10);
        if (isNaN(numResource)) {
            return res.status(400).json({ error: 'Invalid resource_id format.' });
        }

        const rawQty = quantity_allocated !== undefined ? quantity_allocated : quantity;
        const numQty = parseInt(rawQty, 10);
        if (isNaN(numQty) || numQty <= 0) {
            return res.status(400).json({ error: 'quantity_allocated must be a positive integer greater than zero.' });
        }

        conn = await pool.getConnection();
        await conn.beginTransaction();

        // 1. Verify Incident exists and is active (not Resolved or Cancelled)
        const [incidentRows] = await conn.query(
            'SELECT incident_id, title, incident_status FROM incident WHERE incident_id = ?',
            [numIncident]
        );

        if (incidentRows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: `Incident AL-${numIncident} not found.` });
        }

        const inc = incidentRows[0];
        if (inc.incident_status === 'Resolved' || inc.incident_status === 'Cancelled') {
            await conn.rollback();
            return res.status(400).json({
                error: `Cannot allocate resources to incident AL-${numIncident} because it is already marked '${inc.incident_status}'.`
            });
        }

        // 2. Lock Resource row to prevent race conditions & check stock
        const [resourceRows] = await conn.query(
            `SELECT r.resource_id, r.resource_type, r.quantity_available, r.center_id, rc.name AS center_name
             FROM resource r
             JOIN resource_center rc ON r.center_id = rc.center_id
             WHERE r.resource_id = ?
             FOR UPDATE`,
            [numResource]
        );

        if (resourceRows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: `Resource #${numResource} not found.` });
        }

        const resItem = resourceRows[0];

        if (resItem.quantity_available < numQty) {
            await conn.rollback();
            return res.status(400).json({
                error: `Insufficient stock for ${resItem.resource_type} at ${resItem.center_name}. Requested: ${numQty}, Available: ${resItem.quantity_available}.`
            });
        }

        // 3. Prevent duplicate ACTIVE allocations for the same incident and resource
        const [existingActive] = await conn.query(
            'SELECT allocation_id, quantity_allocated FROM incident_resource_allocation WHERE incident_id = ? AND resource_id = ? AND released_at IS NULL',
            [numIncident, numResource]
        );

        if (existingActive.length > 0) {
            await conn.rollback();
            return res.status(409).json({
                error: `Active allocation #${existingActive[0].allocation_id} already exists for ${resItem.resource_type} on incident AL-${numIncident} (${existingActive[0].quantity_allocated} units deployed). Release the current allocation before re-allocating.`
            });
        }

        // 4. Decrement available quantity from resource stock
        await conn.execute(
            'UPDATE resource SET quantity_available = quantity_available - ? WHERE resource_id = ?',
            [numQty, numResource]
        );

        // 5. Insert new allocation record
        const allocatedBy = req.user?.user_id || req.user?.id || null;
        const [insertResult] = await conn.execute(
            `INSERT INTO incident_resource_allocation 
             (incident_id, resource_id, quantity_allocated, allocated_by, allocated_at, released_at)
             VALUES (?, ?, ?, ?, NOW(), NULL)`,
            [numIncident, numResource, numQty, allocatedBy]
        );

        const newAllocationId = insertResult.insertId;

        // 6. Record audit log in incident_report_log
        const auditNote = `Allocated ${numQty} x ${resItem.resource_type} from ${resItem.center_name} by admin (User #${allocatedBy || 'System'})`;
        try {
            await conn.execute(
                `INSERT INTO incident_report_log 
                 (incident_id, logged_by, log_type, old_value, new_value, notes)
                 VALUES (?, ?, 'SystemEvent', NULL, 'ResourceAllocated', ?)`,
                [numIncident, allocatedBy, auditNote]
            );
        } catch (logErr) {
            console.warn('Could not write audit log:', logErr.message);
        }

        // 7. Record notification
        try {
            const notifMsg = `Allocated ${numQty} x ${resItem.resource_type} deployed to incident AL-${numIncident}`;
            await conn.execute(
                `INSERT INTO notification (recipient_id, incident_id, notification_type, title, message, is_read)
                 VALUES (?, ?, 'System', 'Resource Allocated', ?, 0)`,
                [allocatedBy || 1, numIncident, notifMsg]
            );
        } catch (notifErr) {
            console.warn('Could not write notification:', notifErr.message);
        }

        await conn.commit();

        // 8. Fetch complete allocation data to return
        const [createdRows] = await pool.query(`
            SELECT 
                ira.allocation_id,
                ira.incident_id,
                ira.resource_id,
                ira.quantity_allocated,
                ira.allocated_by,
                ira.allocated_at,
                ira.released_at,
                i.title AS incident_title,
                i.incident_status,
                i.priority_level,
                i.location_text AS incident_location,
                r.resource_type,
                r.quantity_available AS current_available_stock,
                rc.center_id,
                rc.name AS center_name,
                rc.center_type,
                rc.address AS center_address,
                o.org_id,
                o.name AS organization_name,
                u.full_name AS allocated_by_name,
                u.email AS allocated_by_email
            FROM incident_resource_allocation ira
            JOIN incident i ON ira.incident_id = i.incident_id
            JOIN resource r ON ira.resource_id = r.resource_id
            JOIN resource_center rc ON r.center_id = rc.center_id
            JOIN organization o ON rc.org_id = o.org_id
            LEFT JOIN users u ON ira.allocated_by = u.user_id
            WHERE ira.allocation_id = ?
        `, [newAllocationId]);

        res.status(201).json({
            message: 'Resource allocated successfully.',
            allocation: formatAllocationRow(createdRows[0]),
            remaining_stock: resItem.quantity_available - numQty
        });
    } catch (err) {
        if (conn) await conn.rollback();
        console.error('Error creating resource allocation:', err);
        res.status(500).json({ error: 'Failed to create resource allocation.' });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * PATCH /api/allocations/:id/release
 * Releases an allocation and restores stock to the resource table exactly once.
 */
export const releaseAllocation = async (req, res) => {
    let conn;
    try {
        const rawId = req.params.id;
        const allocationId = parseInt(rawId, 10);

        if (isNaN(allocationId)) {
            return res.status(400).json({ error: 'Invalid allocation ID.' });
        }

        conn = await pool.getConnection();
        await conn.beginTransaction();

        // 1. Lock Allocation row
        const [allocRows] = await conn.query(
            `SELECT ira.*, r.resource_type, rc.name AS center_name
             FROM incident_resource_allocation ira
             JOIN resource r ON ira.resource_id = r.resource_id
             JOIN resource_center rc ON r.center_id = rc.center_id
             WHERE ira.allocation_id = ?
             FOR UPDATE`,
            [allocationId]
        );

        if (allocRows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: `Allocation #${allocationId} not found.` });
        }

        const alloc = allocRows[0];

        // 2. Check if already released (prevent duplicate stock restoration)
        if (alloc.released_at !== null) {
            await conn.rollback();
            return res.status(400).json({
                error: `Allocation #${allocationId} was already released on ${alloc.released_at}. Resources cannot be restored more than once.`
            });
        }

        // 3. Lock Resource row and restore stock
        await conn.query('SELECT resource_id, quantity_available FROM resource WHERE resource_id = ? FOR UPDATE', [alloc.resource_id]);

        await conn.execute(
            'UPDATE resource SET quantity_available = quantity_available + ? WHERE resource_id = ?',
            [alloc.quantity_allocated, alloc.resource_id]
        );

        // 4. Update released_at timestamp
        await conn.execute(
            'UPDATE incident_resource_allocation SET released_at = NOW() WHERE allocation_id = ?',
            [allocationId]
        );

        // 5. Record audit log
        const userId = req.user?.user_id || req.user?.id || null;
        const auditNote = `Released ${alloc.quantity_allocated} x ${alloc.resource_type} back to ${alloc.center_name} by user #${userId || 'System'}`;
        try {
            await conn.execute(
                `INSERT INTO incident_report_log 
                 (incident_id, logged_by, log_type, old_value, new_value, notes)
                 VALUES (?, ?, 'SystemEvent', 'Allocated', 'ResourceReleased', ?)`,
                [alloc.incident_id, userId, auditNote]
            );
        } catch (logErr) {
            console.warn('Could not write audit log on release:', logErr.message);
        }

        // 6. Record notification
        try {
            const notifMsg = `Released ${alloc.quantity_allocated} x ${alloc.resource_type} back to ${alloc.center_name} inventory`;
            await conn.execute(
                `INSERT INTO notification (recipient_id, incident_id, notification_type, title, message, is_read)
                 VALUES (?, ?, 'System', 'Resource Released', ?, 0)`,
                [userId || 1, alloc.incident_id, notifMsg]
            );
        } catch (notifErr) {
            console.warn('Could not write release notification:', notifErr.message);
        }

        await conn.commit();

        // 6. Fetch updated record
        const [updatedRows] = await pool.query(`
            SELECT 
                ira.allocation_id,
                ira.incident_id,
                ira.resource_id,
                ira.quantity_allocated,
                ira.allocated_by,
                ira.allocated_at,
                ira.released_at,
                i.title AS incident_title,
                i.incident_status,
                i.priority_level,
                i.location_text AS incident_location,
                r.resource_type,
                r.quantity_available AS current_available_stock,
                rc.center_id,
                rc.name AS center_name,
                rc.center_type,
                rc.address AS center_address,
                o.org_id,
                o.name AS organization_name,
                u.full_name AS allocated_by_name,
                u.email AS allocated_by_email
            FROM incident_resource_allocation ira
            JOIN incident i ON ira.incident_id = i.incident_id
            JOIN resource r ON ira.resource_id = r.resource_id
            JOIN resource_center rc ON r.center_id = rc.center_id
            JOIN organization o ON rc.org_id = o.org_id
            LEFT JOIN users u ON ira.allocated_by = u.user_id
            WHERE ira.allocation_id = ?
        `, [allocationId]);

        res.json({
            message: `Allocation #${allocationId} released successfully. Stock of ${alloc.resource_type} restored.`,
            allocation: formatAllocationRow(updatedRows[0])
        });
    } catch (err) {
        if (conn) await conn.rollback();
        console.error('Error releasing allocation:', err);
        res.status(500).json({ error: 'Failed to release allocation.' });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * DELETE /api/allocations/:id
 * Admin removal of an allocation. If still active, restores stock to inventory before removing.
 */
export const deleteAllocation = async (req, res) => {
    let conn;
    try {
        const rawId = req.params.id;
        const allocationId = parseInt(rawId, 10);

        if (isNaN(allocationId)) {
            return res.status(400).json({ error: 'Invalid allocation ID.' });
        }

        conn = await pool.getConnection();
        await conn.beginTransaction();

        const [allocRows] = await conn.query(
            'SELECT * FROM incident_resource_allocation WHERE allocation_id = ? FOR UPDATE',
            [allocationId]
        );

        if (allocRows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: `Allocation #${allocationId} not found.` });
        }

        const alloc = allocRows[0];

        // If allocation is active, restore stock
        if (alloc.released_at === null) {
            await conn.execute(
                'UPDATE resource SET quantity_available = quantity_available + ? WHERE resource_id = ?',
                [alloc.quantity_allocated, alloc.resource_id]
            );
        }

        await conn.execute('DELETE FROM incident_resource_allocation WHERE allocation_id = ?', [allocationId]);

        await conn.commit();

        res.json({
            message: `Allocation #${allocationId} removed successfully.`
        });
    } catch (err) {
        if (conn) await conn.rollback();
        console.error('Error deleting allocation:', err);
        res.status(500).json({ error: 'Failed to delete allocation.' });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * GET /api/allocations/stats
 * Aggregate statistics for dashboard and inventory metrics.
 */
export const getAllocationStats = async (req, res) => {
    try {
        const [stats] = await pool.query(`
            SELECT 
                COUNT(*) AS total_allocations,
                COALESCE(SUM(CASE WHEN released_at IS NULL THEN 1 ELSE 0 END), 0) AS active_allocations,
                COALESCE(SUM(CASE WHEN released_at IS NOT NULL THEN 1 ELSE 0 END), 0) AS released_allocations,
                COALESCE(SUM(CASE WHEN released_at IS NULL THEN quantity_allocated ELSE 0 END), 0) AS total_units_deployed
            FROM incident_resource_allocation
        `);

        res.json(stats[0]);
    } catch (err) {
        console.error('Error fetching allocation stats:', err);
        res.status(500).json({ error: 'Failed to fetch allocation stats.' });
    }
};

