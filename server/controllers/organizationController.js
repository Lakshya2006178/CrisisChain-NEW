import pool from '../config/db.js';

const VALID_ORG_TYPES = ['Hospital', 'FireDept', 'Police', 'Military', 'NGO', 'Other'];

/**
 * Normalizes user-supplied org_type strings to canonical MySQL ENUM values.
 */
const normalizeOrgType = (type) => {
    if (!type) return null;
    const clean = String(type).trim().toLowerCase().replace(/[\s\-_]/g, '');
    const map = {
        'hospital': 'Hospital',
        'firedept': 'FireDept',
        'firedepartment': 'FireDept',
        'fire': 'FireDept',
        'police': 'Police',
        'military': 'Military',
        'ngo': 'NGO',
        'other': 'Other'
    };
    return map[clean] || (VALID_ORG_TYPES.includes(type) ? type : null);
};

/**
 * Normalizes status string to 'Active' or 'Inactive'.
 */
const normalizeStatus = (status) => {
    if (!status) return null;
    const clean = String(status).trim().toLowerCase();
    if (clean === 'active') return 'Active';
    if (clean === 'inactive') return 'Inactive';
    return null;
};

/**
 * Formats an organization row with standard frontend fields.
 */
const formatOrgRow = (row, centers = [], staff = []) => {
    const centerCount = Number(row.center_count) || centers.length || 0;
    const responderCount = Number(row.responder_count) || staff.length || 0;

    let displayCapacity = row.capacity_note;
    if (!displayCapacity) {
        if (centerCount > 0) {
            displayCapacity = `${centerCount} Center${centerCount > 1 ? 's' : ''}`;
        } else {
            displayCapacity = 'Standby';
        }
    }

    return {
        id: row.org_id,
        org_id: row.org_id,
        name: row.name,
        type: row.org_type,
        org_type: row.org_type,
        contact: row.contact_number || 'N/A',
        contact_number: row.contact_number,
        address: row.address || 'N/A',
        location: row.address || 'N/A',
        capacity: displayCapacity,
        capacity_note: row.capacity_note,
        status: row.status,
        created_at: row.created_at,
        center_count: centerCount,
        responder_count: responderCount,
        resource_centers: centers,
        staff: staff
    };
};

/**
 * GET /api/organizations
 * Retrieves organizations from MySQL with optional type, status, and search filters.
 */
export const getOrganizations = async (req, res) => {
    try {
        const { type, org_type, status, search } = req.query;
        const conditions = [];
        const params = [];

        const targetType = type || org_type;
        if (targetType) {
            const normalized = normalizeOrgType(targetType);
            if (normalized) {
                conditions.push("o.org_type = ?");
                params.push(normalized);
            }
        }

        if (status) {
            const normalized = normalizeStatus(status);
            if (normalized) {
                conditions.push("o.status = ?");
                params.push(normalized);
            }
        }

        if (search) {
            const s = `%${search.trim().toLowerCase()}%`;
            conditions.push("(LOWER(o.name) LIKE ? OR LOWER(o.address) LIKE ? OR LOWER(o.contact_number) LIKE ?)");
            params.push(s, s, s);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const sql = `
            SELECT 
                o.org_id,
                o.name,
                o.org_type,
                o.contact_number,
                o.address,
                o.capacity_note,
                o.status,
                o.created_at,
                COUNT(DISTINCT rc.center_id) AS center_count,
                COUNT(DISTINCT ap.authority_id) AS responder_count
            FROM organization o
            LEFT JOIN resource_center rc ON o.org_id = rc.org_id
            LEFT JOIN authority_profile ap ON o.org_id = ap.org_id
            ${whereClause}
            GROUP BY o.org_id
            ORDER BY o.name ASC
        `;

        const [rows] = await pool.query(sql, params);
        const formatted = rows.map(r => formatOrgRow(r));
        res.json(formatted);
    } catch (err) {
        console.error('Error fetching organizations:', err);
        res.status(500).json({ error: 'Failed to fetch organizations.' });
    }
};

/**
 * GET /api/organizations/:id
 * Retrieves a single organization by its org_id, including linked centers and staff.
 */
export const getOrganizationById = async (req, res) => {
    try {
        const rawId = req.params.id;
        const numericId = parseInt(String(rawId).replace(/^[A-Za-z]+-0?/, ''), 10);
        if (isNaN(numericId)) {
            return res.status(400).json({ error: 'Invalid organization ID format.' });
        }

        const sql = `
            SELECT 
                o.org_id,
                o.name,
                o.org_type,
                o.contact_number,
                o.address,
                o.capacity_note,
                o.status,
                o.created_at,
                COUNT(DISTINCT rc.center_id) AS center_count,
                COUNT(DISTINCT ap.authority_id) AS responder_count
            FROM organization o
            LEFT JOIN resource_center rc ON o.org_id = rc.org_id
            LEFT JOIN authority_profile ap ON o.org_id = ap.org_id
            WHERE o.org_id = ?
            GROUP BY o.org_id
        `;

        const [rows] = await pool.query(sql, [numericId]);
        if (rows.length === 0) {
            return res.status(404).json({ error: `Organization #${numericId} not found.` });
        }

        // Fetch associated resource centers
        const [centers] = await pool.query(
            'SELECT center_id, name, center_type, address, contact_number, latitude, longitude FROM resource_center WHERE org_id = ? ORDER BY name ASC',
            [numericId]
        );

        // Fetch associated authority staff
        const [staff] = await pool.query(`
            SELECT ap.authority_id, ap.user_id, ap.authority_type, ap.credential_id, ap.availability_status, u.full_name, u.email, u.phone_number
            FROM authority_profile ap
            JOIN users u ON ap.user_id = u.user_id
            WHERE ap.org_id = ?
            ORDER BY u.full_name ASC
        `, [numericId]);

        res.json(formatOrgRow(rows[0], centers, staff));
    } catch (err) {
        console.error('Error fetching organization by ID:', err);
        res.status(500).json({ error: 'Failed to fetch organization.' });
    }
};

/**
 * POST /api/organizations
 * Creates a new organization in MySQL.
 */
export const createOrganization = async (req, res) => {
    try {
        const { name, org_type, contact_number, address, capacity_note, status } = req.body;

        if (!name || !String(name).trim()) {
            return res.status(400).json({ error: 'Organization name is required.' });
        }

        const normalizedType = normalizeOrgType(org_type);
        if (!normalizedType) {
            return res.status(400).json({
                error: 'Invalid org_type. Allowed types: Hospital, FireDept, Police, Military, NGO, Other.'
            });
        }

        const normalizedStatus = normalizeStatus(status) || 'Active';
        const trimmedName = String(name).trim();

        // Check if name already exists
        const [existing] = await pool.query('SELECT org_id FROM organization WHERE LOWER(name) = LOWER(?)', [trimmedName]);
        if (existing.length > 0) {
            return res.status(409).json({ error: `An organization with the name "${trimmedName}" already exists.` });
        }

        const insertSql = `
            INSERT INTO organization (name, org_type, contact_number, address, capacity_note, status)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        const [result] = await pool.execute(insertSql, [
            trimmedName,
            normalizedType,
            contact_number ? String(contact_number).trim() : null,
            address ? String(address).trim() : null,
            capacity_note ? String(capacity_note).trim() : null,
            normalizedStatus
        ]);

        const newId = result.insertId;

        const [newRows] = await pool.query('SELECT * FROM organization WHERE org_id = ?', [newId]);
        res.status(201).json(formatOrgRow(newRows[0]));
    } catch (err) {
        console.error('Error creating organization:', err);
        res.status(500).json({ error: 'Failed to create organization.' });
    }
};

/**
 * PATCH /api/organizations/:id
 * Updates an existing organization in MySQL.
 */
export const updateOrganization = async (req, res) => {
    try {
        const rawId = req.params.id;
        const numericId = parseInt(String(rawId).replace(/^[A-Za-z]+-0?/, ''), 10);
        if (isNaN(numericId)) {
            return res.status(400).json({ error: 'Invalid organization ID format.' });
        }

        const [existing] = await pool.query('SELECT * FROM organization WHERE org_id = ?', [numericId]);
        if (existing.length === 0) {
            return res.status(404).json({ error: `Organization #${numericId} not found.` });
        }

        const current = existing[0];
        const { name, org_type, contact_number, address, capacity_note, status } = req.body;

        let newName = current.name;
        if (name !== undefined) {
            if (!String(name).trim()) {
                return res.status(400).json({ error: 'Organization name cannot be empty.' });
            }
            newName = String(name).trim();
            if (newName.toLowerCase() !== current.name.toLowerCase()) {
                const [dup] = await pool.query(
                    'SELECT org_id FROM organization WHERE LOWER(name) = LOWER(?) AND org_id != ?',
                    [newName, numericId]
                );
                if (dup.length > 0) {
                    return res.status(409).json({ error: `An organization with the name "${newName}" already exists.` });
                }
            }
        }

        let newType = current.org_type;
        if (org_type !== undefined) {
            newType = normalizeOrgType(org_type);
            if (!newType) {
                return res.status(400).json({
                    error: 'Invalid org_type. Allowed types: Hospital, FireDept, Police, Military, NGO, Other.'
                });
            }
        }

        let newStatus = current.status;
        if (status !== undefined) {
            newStatus = normalizeStatus(status);
            if (!newStatus) {
                return res.status(400).json({ error: 'Invalid status. Allowed values: Active, Inactive.' });
            }
        }

        const newContact = contact_number !== undefined ? (contact_number ? String(contact_number).trim() : null) : current.contact_number;
        const newAddress = address !== undefined ? (address ? String(address).trim() : null) : current.address;
        const newCapacity = capacity_note !== undefined ? (capacity_note ? String(capacity_note).trim() : null) : current.capacity_note;

        const updateSql = `
            UPDATE organization 
            SET name = ?, org_type = ?, contact_number = ?, address = ?, capacity_note = ?, status = ?
            WHERE org_id = ?
        `;

        await pool.execute(updateSql, [newName, newType, newContact, newAddress, newCapacity, newStatus, numericId]);

        const [updatedRows] = await pool.query('SELECT * FROM organization WHERE org_id = ?', [numericId]);
        res.json(formatOrgRow(updatedRows[0]));
    } catch (err) {
        console.error('Error updating organization:', err);
        res.status(500).json({ error: 'Failed to update organization.' });
    }
};

/**
 * DELETE /api/organizations/:id
 * Deletes an organization if it has no associated resource centers or authority profiles.
 */
export const deleteOrganization = async (req, res) => {
    try {
        const rawId = req.params.id;
        const numericId = parseInt(String(rawId).replace(/^[A-Za-z]+-0?/, ''), 10);
        if (isNaN(numericId)) {
            return res.status(400).json({ error: 'Invalid organization ID format.' });
        }

        const [existing] = await pool.query('SELECT org_id, name FROM organization WHERE org_id = ?', [numericId]);
        if (existing.length === 0) {
            return res.status(404).json({ error: `Organization #${numericId} not found.` });
        }

        // Check for linked resource centers or authority profiles (ON DELETE RESTRICT in schema)
        const [centers] = await pool.query('SELECT COUNT(*) AS count FROM resource_center WHERE org_id = ?', [numericId]);
        const [authorities] = await pool.query('SELECT COUNT(*) AS count FROM authority_profile WHERE org_id = ?', [numericId]);

        const centerCount = centers[0].count;
        const authCount = authorities[0].count;

        if (centerCount > 0 || authCount > 0) {
            return res.status(400).json({
                error: `Cannot delete organization "${existing[0].name}". It has ${centerCount} linked resource center(s) and ${authCount} linked responder/staff profile(s). Reassign or delete them first.`
            });
        }

        await pool.execute('DELETE FROM organization WHERE org_id = ?', [numericId]);

        res.json({
            success: true,
            message: `Organization #${numericId} (${existing[0].name}) deleted successfully.`
        });
    } catch (err) {
        console.error('Error deleting organization:', err);
        res.status(500).json({ error: 'Failed to delete organization.' });
    }
};

