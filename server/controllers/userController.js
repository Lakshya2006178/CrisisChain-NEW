import pool from '../config/db.js';

const VALID_ROLES = ['citizen', 'responder', 'hospital', 'admin'];

/**
 * Normalizes role string to canonical enum value.
 */
const normalizeRole = (role) => {
    if (!role) return null;
    const clean = String(role).trim().toLowerCase();
    return VALID_ROLES.includes(clean) ? clean : null;
};

/**
 * Formats a joined user database row (never exposes password_hash).
 */
const formatUserRow = (row) => {
    const isActive = Boolean(row.is_active);
    const hasAuthority = row.authority_id != null;

    return {
        id: row.user_id,
        user_id: row.user_id,
        name: row.full_name,
        full_name: row.full_name,
        email: row.email,
        phone_number: row.phone_number,
        role: row.role,
        is_active: isActive,
        status: isActive ? 'Active' : 'Deactivated',
        created_at: row.created_at,
        updated_at: row.updated_at,
        org: row.org_name || (row.role === 'citizen' ? 'Citizen' : 'Independent'),
        org_name: row.org_name || null,
        org_id: row.org_id || null,
        authority_profile: hasAuthority ? {
            authority_id: row.authority_id,
            authority_type: row.authority_type,
            credential_id: row.credential_id,
            availability_status: row.availability_status,
            coverage_radius_km: Number(row.coverage_radius_km) || 10,
            org_id: row.org_id,
            org_name: row.org_name
        } : null
    };
};

/**
 * GET /api/users
 * Returns a list of users with their authority profiles and organizations.
 * Accessible only by administrators.
 */
export const getUsers = async (req, res) => {
    try {
        const { role, status, search } = req.query;
        const conditions = [];
        const params = [];

        if (role && role !== 'All') {
            const normalized = normalizeRole(role);
            if (normalized) {
                conditions.push("u.role = ?");
                params.push(normalized);
            }
        }

        if (status && status !== 'All') {
            const s = status.trim().toLowerCase();
            if (s === 'active' || s === '1' || s === 'true') {
                conditions.push("u.is_active = 1");
            } else if (s === 'inactive' || s === 'deactivated' || s === '0' || s === 'false') {
                conditions.push("u.is_active = 0");
            }
        }

        if (search && search.trim()) {
            const s = `%${search.trim().toLowerCase()}%`;
            conditions.push("(LOWER(u.full_name) LIKE ? OR LOWER(u.email) LIKE ? OR LOWER(u.phone_number) LIKE ? OR LOWER(o.name) LIKE ?)");
            params.push(s, s, s, s);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const sql = `
            SELECT 
                u.user_id,
                u.full_name,
                u.email,
                u.phone_number,
                u.role,
                u.is_active,
                u.created_at,
                u.updated_at,
                ap.authority_id,
                ap.authority_type,
                ap.credential_id,
                ap.availability_status,
                ap.coverage_radius_km,
                o.org_id,
                o.name AS org_name,
                o.org_type
            FROM users u
            LEFT JOIN authority_profile ap ON u.user_id = ap.user_id
            LEFT JOIN organization o ON ap.org_id = o.org_id
            ${whereClause}
            ORDER BY u.user_id ASC
        `;

        const [rows] = await pool.query(sql, params);
        const formatted = rows.map(formatUserRow);
        res.json(formatted);
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ error: 'Failed to fetch users.' });
    }
};

/**
 * GET /api/users/:id
 * Retrieves details for a specific user.
 */
export const getUserById = async (req, res) => {
    try {
        const rawId = req.params.id;
        const numericId = parseInt(rawId, 10);
        if (isNaN(numericId)) {
            return res.status(400).json({ error: 'Invalid user ID format.' });
        }

        const sql = `
            SELECT 
                u.user_id,
                u.full_name,
                u.email,
                u.phone_number,
                u.role,
                u.is_active,
                u.created_at,
                u.updated_at,
                ap.authority_id,
                ap.authority_type,
                ap.credential_id,
                ap.availability_status,
                ap.coverage_radius_km,
                o.org_id,
                o.name AS org_name,
                o.org_type
            FROM users u
            LEFT JOIN authority_profile ap ON u.user_id = ap.user_id
            LEFT JOIN organization o ON ap.org_id = o.org_id
            WHERE u.user_id = ?
        `;

        const [rows] = await pool.query(sql, [numericId]);
        if (rows.length === 0) {
            return res.status(404).json({ error: `User #${numericId} not found.` });
        }

        res.json(formatUserRow(rows[0]));
    } catch (err) {
        console.error('Error fetching user by ID:', err);
        res.status(500).json({ error: 'Failed to fetch user.' });
    }
};

/**
 * PATCH /api/users/:id/status
 * Activates or deactivates a user account.
 * Prevents admins from deactivating their own account.
 */
export const updateUserStatus = async (req, res) => {
    try {
        const rawId = req.params.id;
        const numericId = parseInt(rawId, 10);
        if (isNaN(numericId)) {
            return res.status(400).json({ error: 'Invalid user ID format.' });
        }

        const { is_active } = req.body;
        if (is_active === undefined) {
            return res.status(400).json({ error: 'is_active field is required.' });
        }

        const newActive = (is_active === 1 || is_active === true || is_active === '1' || is_active === 'true') ? 1 : 0;

        // Prevent admin self-deactivation
        if (req.user?.user_id === numericId && newActive === 0) {
            return res.status(400).json({ error: 'You cannot deactivate your own admin account.' });
        }

        const [existing] = await pool.query('SELECT user_id, full_name, is_active FROM users WHERE user_id = ?', [numericId]);
        if (existing.length === 0) {
            return res.status(404).json({ error: `User #${numericId} not found.` });
        }

        await pool.execute('UPDATE users SET is_active = ? WHERE user_id = ?', [newActive, numericId]);

        res.json({
            success: true,
            user_id: numericId,
            is_active: Boolean(newActive),
            status: newActive ? 'Active' : 'Deactivated',
            message: `User ${existing[0].full_name} is now ${newActive ? 'active' : 'deactivated'}.`
        });
    } catch (err) {
        console.error('Error updating user status:', err);
        res.status(500).json({ error: 'Failed to update user status.' });
    }
};

/**
 * PATCH /api/users/:id/role
 * Updates a user's role.
 * Validates against allowed ENUM values: 'citizen', 'responder', 'hospital', 'admin'.
 * Prevents admin from demoting themselves.
 */
export const updateUserRole = async (req, res) => {
    try {
        const rawId = req.params.id;
        const numericId = parseInt(rawId, 10);
        if (isNaN(numericId)) {
            return res.status(400).json({ error: 'Invalid user ID format.' });
        }

        const { role } = req.body;
        if (!role) {
            return res.status(400).json({ error: 'Role is required.' });
        }

        const normalizedRole = normalizeRole(role);
        if (!normalizedRole) {
            return res.status(400).json({
                error: `Invalid role "${role}". Allowed roles: ${VALID_ROLES.join(', ')}.`
            });
        }

        // Prevent self-demotion of admin
        const currentAdminId = req.user?.user_id || req.user?.id;
        if (currentAdminId === numericId && normalizedRole !== 'admin') {
            return res.status(400).json({ error: 'You cannot remove your own admin privileges.' });
        }

        const [existing] = await pool.query('SELECT user_id, full_name, role FROM users WHERE user_id = ?', [numericId]);
        if (existing.length === 0) {
            return res.status(404).json({ error: `User #${numericId} not found.` });
        }

        await pool.execute('UPDATE users SET role = ? WHERE user_id = ?', [normalizedRole, numericId]);

        res.json({
            success: true,
            user_id: numericId,
            previous_role: existing[0].role,
            role: normalizedRole,
            message: `Role for ${existing[0].full_name} updated to ${normalizedRole}.`
        });
    } catch (err) {
        console.error('Error updating user role:', err);
        res.status(500).json({ error: 'Failed to update user role.' });
    }
};

/**
 * PATCH /api/users/:id
 * General user update (role, is_active, full_name, phone_number).
 */
export const updateUser = async (req, res) => {
    try {
        const rawId = req.params.id;
        const numericId = parseInt(rawId, 10);
        if (isNaN(numericId)) {
            return res.status(400).json({ error: 'Invalid user ID format.' });
        }

        const [existing] = await pool.query('SELECT * FROM users WHERE user_id = ?', [numericId]);
        if (existing.length === 0) {
            return res.status(404).json({ error: `User #${numericId} not found.` });
        }

        const current = existing[0];
        const { role, is_active, full_name, phone_number } = req.body;

        const currentAdminId = req.user?.user_id || req.user?.id;

        let newActive = current.is_active;
        if (is_active !== undefined) {
            newActive = (is_active === 1 || is_active === true || is_active === '1' || is_active === 'true') ? 1 : 0;
            if (currentAdminId === numericId && newActive === 0) {
                return res.status(400).json({ error: 'You cannot deactivate your own admin account.' });
            }
        }

        let newRole = current.role;
        if (role !== undefined) {
            newRole = normalizeRole(role);
            if (!newRole) {
                return res.status(400).json({
                    error: `Invalid role "${role}". Allowed roles: ${VALID_ROLES.join(', ')}.`
                });
            }
            if (currentAdminId === numericId && newRole !== 'admin') {
                return res.status(400).json({ error: 'You cannot remove your own admin privileges.' });
            }
        }

        const newName = (full_name && String(full_name).trim()) ? String(full_name).trim().substring(0, 150) : current.full_name;
        const newPhone = (phone_number && String(phone_number).trim()) ? String(phone_number).trim().substring(0, 15) : current.phone_number;

        const updateSql = `
            UPDATE users
            SET role = ?, is_active = ?, full_name = ?, phone_number = ?
            WHERE user_id = ?
        `;

        await pool.execute(updateSql, [newRole, newActive, newName, newPhone, numericId]);

        // Return updated user
        const sql = `
            SELECT 
                u.user_id, u.full_name, u.email, u.phone_number, u.role, u.is_active, u.created_at, u.updated_at,
                ap.authority_id, ap.authority_type, ap.credential_id, ap.availability_status, ap.coverage_radius_km,
                o.org_id, o.name AS org_name, o.org_type
            FROM users u
            LEFT JOIN authority_profile ap ON u.user_id = ap.user_id
            LEFT JOIN organization o ON ap.org_id = o.org_id
            WHERE u.user_id = ?
        `;
        const [updatedRows] = await pool.query(sql, [numericId]);

        res.json(formatUserRow(updatedRows[0]));
    } catch (err) {
        console.error('Error updating user:', err);
        res.status(500).json({ error: 'Failed to update user.' });
    }
};

