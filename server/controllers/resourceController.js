import pool from '../config/db.js';

/**
 * Calculates the great-circle distance between two points on the Earth's surface
 * using the Haversine formula (returns distance in kilometers).
 */
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Maps a resource category / name to a compatible Lucide icon name.
 */
const iconNameForResourceType = (type) => {
    const t = String(type || '').toLowerCase();
    if (t.includes('ambulance') || t.includes('truck') || t.includes('car')) return 'Truck';
    if (t.includes('icu') || t.includes('bed') || t.includes('medical')) return 'HeartPulse';
    if (t.includes('ventilator') || t.includes('oxygen')) return 'Activity';
    if (t.includes('fire') || t.includes('engine')) return 'Flame';
    if (t.includes('officer') || t.includes('patrol') || t.includes('police')) return 'Shield';
    if (t.includes('rescue') || t.includes('team')) return 'Users';
    return 'Package';
};

/**
 * Formats a joined resource database row into the shape expected across the frontend.
 */
const formatResourceRow = (row) => {
    const deployed = Number(row.deployed) || 0;
    const available = Number(row.quantity_available) || 0;
    const total = available + deployed;
    const lat = row.latitude != null ? Number(row.latitude) : null;
    const lng = row.longitude != null ? Number(row.longitude) : null;

    return {
        id: row.resource_id,
        resource_id: row.resource_id,
        name: `${row.resource_type} (${row.center_name})`,
        title: `${row.resource_type} - ${row.center_name}`,
        raw_name: row.resource_type,
        resource_type: row.resource_type,
        quantity: available,
        quantity_available: available,
        deployed,
        total,
        status: available > 0 ? 'Available' : 'Depleted',
        center_id: row.center_id,
        center_name: row.center_name,
        center_type: row.center_type,
        org_id: row.org_id,
        organization_name: row.organization_name,
        address: row.address,
        contact_number: row.contact_number,
        latitude: lat,
        longitude: lng,
        coordinates: (lat != null && lng != null) ? `${lat}, ${lng}` : null,
        iconName: iconNameForResourceType(row.resource_type),
        last_updated: row.last_updated,
        resources: [
            {
                resource_id: row.resource_id,
                resource_type: row.resource_type,
                quantity_available: available,
                deployed
            }
        ]
    };
};

/**
 * GET /api/resources
 * Retrieves all resources from MySQL with optional filtering by type, center, search, or status.
 */
export const getResources = async (req, res) => {
    try {
        const { type, category, resource_type, center_type, center_id, org_id, search, status, format, grouped } = req.query;

        const conditions = [];
        const params = [];

        const targetType = type || category || resource_type;
        if (targetType) {
            conditions.push("LOWER(r.resource_type) LIKE ?");
            params.push(`%${targetType.trim().toLowerCase()}%`);
        }

        if (center_type) {
            conditions.push("LOWER(rc.center_type) = ?");
            params.push(center_type.trim().toLowerCase());
        }

        if (center_id) {
            const numCenter = parseInt(String(center_id).replace(/^C-0?/i, ''), 10);
            if (!isNaN(numCenter)) {
                conditions.push("rc.center_id = ?");
                params.push(numCenter);
            }
        }

        if (org_id) {
            conditions.push("rc.org_id = ?");
            params.push(parseInt(org_id, 10));
        }

        if (search) {
            const s = `%${search.trim().toLowerCase()}%`;
            conditions.push("(LOWER(r.resource_type) LIKE ? OR LOWER(rc.name) LIKE ? OR LOWER(rc.address) LIKE ? OR LOWER(o.name) LIKE ?)");
            params.push(s, s, s, s);
        }

        if (status) {
            const s = status.trim().toLowerCase();
            if (s === 'available') {
                conditions.push("r.quantity_available > 0");
            } else if (s === 'depleted' || s === 'empty') {
                conditions.push("r.quantity_available = 0");
            }
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const sql = `
            SELECT 
                r.resource_id,
                r.center_id,
                r.resource_type,
                r.quantity_available,
                r.last_updated,
                rc.name AS center_name,
                rc.center_type,
                rc.address,
                rc.contact_number,
                rc.latitude,
                rc.longitude,
                o.org_id,
                o.name AS organization_name,
                COALESCE(SUM(CASE WHEN ira.released_at IS NULL THEN ira.quantity_allocated ELSE 0 END), 0) AS deployed
            FROM resource r
            JOIN resource_center rc ON r.center_id = rc.center_id
            JOIN organization o ON rc.org_id = o.org_id
            LEFT JOIN incident_resource_allocation ira ON r.resource_id = ira.resource_id
            ${whereClause}
            GROUP BY r.resource_id, rc.center_id, o.org_id
            ORDER BY rc.name, r.resource_type
        `;

        const [rows] = await pool.query(sql, params);

        // If the caller requested grouping by facility centers (format=centers or grouped=true)
        if (format === 'centers' || grouped === 'true') {
            const centerMap = {};
            for (const row of rows) {
                if (!centerMap[row.center_id]) {
                    centerMap[row.center_id] = {
                        center_id: `C-${String(row.center_id).padStart(2, '0')}`,
                        numeric_id: row.center_id,
                        name: row.center_name,
                        center_type: row.center_type,
                        address: row.address,
                        contact_number: row.contact_number,
                        latitude: Number(row.latitude),
                        longitude: Number(row.longitude),
                        organization_name: row.organization_name,
                        resources: []
                    };
                }
                centerMap[row.center_id].resources.push({
                    resource_id: row.resource_id,
                    resource_type: row.resource_type,
                    quantity_available: Number(row.quantity_available),
                    deployed: Number(row.deployed) || 0
                });
            }
            return res.json(Object.values(centerMap));
        }

        const formatted = rows.map(formatResourceRow);
        res.json(formatted);
    } catch (err) {
        console.error('Error fetching resources:', err);
        res.status(500).json({ error: 'Failed to fetch resources.' });
    }
};

/**
 * GET /api/resources/:id
 * Retrieves a single resource by its resource_id.
 */
export const getResourceById = async (req, res) => {
    try {
        const rawId = req.params.id;
        const numericId = parseInt(String(rawId).replace(/^[A-Za-z]+-0?/, ''), 10);

        if (isNaN(numericId)) {
            return res.status(400).json({ error: 'Invalid resource ID format.' });
        }

        const sql = `
            SELECT 
                r.resource_id,
                r.center_id,
                r.resource_type,
                r.quantity_available,
                r.last_updated,
                rc.name AS center_name,
                rc.center_type,
                rc.address,
                rc.contact_number,
                rc.latitude,
                rc.longitude,
                o.org_id,
                o.name AS organization_name,
                COALESCE(SUM(CASE WHEN ira.released_at IS NULL THEN ira.quantity_allocated ELSE 0 END), 0) AS deployed
            FROM resource r
            JOIN resource_center rc ON r.center_id = rc.center_id
            JOIN organization o ON rc.org_id = o.org_id
            LEFT JOIN incident_resource_allocation ira ON r.resource_id = ira.resource_id
            WHERE r.resource_id = ?
            GROUP BY r.resource_id, rc.center_id, o.org_id
        `;

        const [rows] = await pool.query(sql, [numericId]);
        if (rows.length === 0) {
            return res.status(404).json({ error: `Resource #${numericId} not found.` });
        }

        res.json(formatResourceRow(rows[0]));
    } catch (err) {
        console.error('Error fetching resource by ID:', err);
        res.status(500).json({ error: 'Failed to fetch resource.' });
    }
};

/**
 * GET /api/resources/nearby
 * Calculates distances between client coordinates and centers in MySQL, returning sorted results.
 */
export const getNearbyCenters = async (req, res) => {
    try {
        const { lat, lng, radius, type } = req.query;

        if (!lat || !lng) {
            return res.status(400).json({ error: 'lat and lng query parameters are required.' });
        }

        const userLat = parseFloat(lat);
        const userLng = parseFloat(lng);

        if (isNaN(userLat) || isNaN(userLng)) {
            return res.status(400).json({ error: 'lat and lng must be valid numbers.' });
        }

        const maxDist = radius ? parseFloat(radius) : 50;
        if (isNaN(maxDist) || maxDist <= 0) {
            return res.status(400).json({ error: 'radius must be a positive number.' });
        }

        const conditions = [];
        const params = [];

        if (type && type.trim()) {
            conditions.push("LOWER(rc.center_type) = ?");
            params.push(type.trim().toLowerCase());
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const sql = `
            SELECT 
                rc.center_id,
                rc.name,
                rc.center_type,
                rc.latitude,
                rc.longitude,
                rc.address,
                rc.contact_number,
                o.name AS organization_name,
                r.resource_id,
                r.resource_type,
                r.quantity_available
            FROM resource_center rc
            JOIN organization o ON rc.org_id = o.org_id
            LEFT JOIN resource r ON rc.center_id = r.center_id
            ${whereClause}
            ORDER BY rc.center_id, r.resource_type
        `;

        const [rows] = await pool.query(sql, params);

        // Group resources by center
        const centerMap = {};
        for (const row of rows) {
            if (!centerMap[row.center_id]) {
                const distanceKm = getDistanceFromLatLonInKm(
                    userLat,
                    userLng,
                    Number(row.latitude),
                    Number(row.longitude)
                );

                centerMap[row.center_id] = {
                    center_id: `C-${String(row.center_id).padStart(2, '0')}`,
                    numeric_id: row.center_id,
                    name: row.name,
                    center_type: row.center_type,
                    address: row.address,
                    contact_number: row.contact_number,
                    latitude: Number(row.latitude),
                    longitude: Number(row.longitude),
                    distance_km: Math.round(distanceKm * 10) / 10,
                    organization_name: row.organization_name,
                    resources: []
                };
            }

            if (row.resource_type) {
                centerMap[row.center_id].resources.push({
                    resource_id: row.resource_id,
                    resource_type: row.resource_type,
                    quantity_available: Number(row.quantity_available) || 0
                });
            }
        }

        // Filter by radius and sort by distance
        const results = Object.values(centerMap)
            .filter(c => c.distance_km <= maxDist)
            .sort((a, b) => a.distance_km - b.distance_km);

        res.json(results);
    } catch (err) {
        console.error('Error fetching nearby centers:', err);
        res.status(500).json({ error: 'Failed to fetch nearby centers.' });
    }
};

/**
 * POST /api/resources
 * Creates or registers stock for a resource center.
 */
export const createResource = async (req, res) => {
    try {
        const { center_id, resource_type, quantity_available } = req.body;

        if (!center_id) {
            return res.status(400).json({ error: 'center_id is required.' });
        }
        if (!resource_type || !String(resource_type).trim()) {
            return res.status(400).json({ error: 'resource_type is required.' });
        }

        const numCenter = parseInt(String(center_id).replace(/^[A-Za-z]+-0?/, ''), 10);
        if (isNaN(numCenter)) {
            return res.status(400).json({ error: 'Invalid center_id format.' });
        }

        const qty = quantity_available !== undefined ? parseInt(quantity_available, 10) : 0;
        if (isNaN(qty) || qty < 0) {
            return res.status(400).json({ error: 'quantity_available must be a non-negative integer.' });
        }

        // Verify resource center exists
        const [centerRows] = await pool.query('SELECT center_id, name, org_id FROM resource_center WHERE center_id = ?', [numCenter]);
        if (centerRows.length === 0) {
            return res.status(404).json({ error: `Resource center #${numCenter} not found.` });
        }

        // Enforce organizational boundary: non-admins can only create resources for their own organization
        if (req.user && req.user.role !== 'admin') {
            const [profile] = await pool.query(
                'SELECT org_id FROM authority_profile WHERE user_id = ?',
                [req.user.user_id || req.user.id]
            );
            const userOrgId = profile[0]?.org_id;
            if (!userOrgId || userOrgId !== centerRows[0].org_id) {
                return res.status(403).json({ error: 'Access denied: You can only manage resources for your own organization.' });
            }
        }

        const trimmedType = String(resource_type).trim();

        // Upsert into resource table
        const insertSql = `
            INSERT INTO resource (center_id, resource_type, quantity_available)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE quantity_available = quantity_available + VALUES(quantity_available)
        `;
        const [result] = await pool.execute(insertSql, [numCenter, trimmedType, qty]);
        const resourceId = result.insertId || (await pool.query('SELECT resource_id FROM resource WHERE center_id = ? AND resource_type = ?', [numCenter, trimmedType]))[0][0]?.resource_id;

        // Fetch complete record
        const [newRows] = await pool.query(`
            SELECT 
                r.resource_id, r.center_id, r.resource_type, r.quantity_available, r.last_updated,
                rc.name AS center_name, rc.center_type, rc.address, rc.contact_number, rc.latitude, rc.longitude,
                o.org_id, o.name AS organization_name,
                0 AS deployed
            FROM resource r
            JOIN resource_center rc ON r.center_id = rc.center_id
            JOIN organization o ON rc.org_id = o.org_id
            WHERE r.resource_id = ?
        `, [resourceId]);

        res.status(201).json(formatResourceRow(newRows[0]));
    } catch (err) {
        console.error('Error creating resource:', err);
        res.status(500).json({ error: 'Failed to create resource.' });
    }
};

/**
 * PATCH /api/resources/:id
 * Updates resource quantity or status in MySQL.
 */
export const updateResourceStatus = async (req, res) => {
    try {
        const rawId = req.params.id;
        const numericId = parseInt(String(rawId).replace(/^[A-Za-z]+-0?/, ''), 10);

        if (isNaN(numericId)) {
            return res.status(400).json({ error: 'Invalid resource ID format.' });
        }

        const [existingRows] = await pool.query(
            `SELECT r.resource_id, r.quantity_available, r.resource_type, r.center_id, rc.org_id 
             FROM resource r 
             JOIN resource_center rc ON r.center_id = rc.center_id 
             WHERE r.resource_id = ?`,
            [numericId]
        );

        if (existingRows.length === 0) {
            return res.status(404).json({ error: `Resource #${numericId} not found.` });
        }

        const current = existingRows[0];

        // Enforce organizational boundary: non-admins can only update resources for their own organization
        if (req.user && req.user.role !== 'admin') {
            const [profile] = await pool.query(
                'SELECT org_id FROM authority_profile WHERE user_id = ?',
                [req.user.user_id || req.user.id]
            );
            const userOrgId = profile[0]?.org_id;
            if (!userOrgId || userOrgId !== current.org_id) {
                return res.status(403).json({ error: 'Access denied: You can only manage resources for your own organization.' });
            }
        }
        let newQty = current.quantity_available;

        if (req.body.quantity_available !== undefined) {
            const parsed = parseInt(req.body.quantity_available, 10);
            if (isNaN(parsed) || parsed < 0) {
                return res.status(400).json({ error: 'quantity_available must be a non-negative integer.' });
            }
            newQty = parsed;
        } else if (req.body.quantity !== undefined) {
            const parsed = parseInt(req.body.quantity, 10);
            if (isNaN(parsed) || parsed < 0) {
                return res.status(400).json({ error: 'quantity must be a non-negative integer.' });
            }
            newQty = parsed;
        } else if (req.body.increment !== undefined) {
            const inc = parseInt(req.body.increment, 10);
            if (isNaN(inc)) {
                return res.status(400).json({ error: 'increment must be a valid integer.' });
            }
            newQty = current.quantity_available + inc;
            if (newQty < 0) {
                return res.status(400).json({ error: `Cannot reduce quantity below 0. Current available: ${current.quantity_available}` });
            }
        }

        await pool.execute(
            'UPDATE resource SET quantity_available = ? WHERE resource_id = ?',
            [newQty, numericId]
        );

        res.json({
            success: true,
            resource_id: numericId,
            resource_type: current.resource_type,
            quantity_available: newQty,
            deployed: req.body.deployed !== undefined ? req.body.deployed : undefined
        });
    } catch (err) {
        console.error('Error updating resource:', err);
        res.status(500).json({ error: 'Failed to update resource.' });
    }
};

/**
 * DELETE /api/resources/:id
 * Removes a resource if it has no active incident allocations.
 */
export const deleteResource = async (req, res) => {
    let conn;
    try {
        const rawId = req.params.id;
        const numericId = parseInt(String(rawId).replace(/^[A-Za-z]+-0?/, ''), 10);

        if (isNaN(numericId)) {
            return res.status(400).json({ error: 'Invalid resource ID format.' });
        }

        conn = await pool.getConnection();
        await conn.beginTransaction();

        const [existing] = await conn.query('SELECT resource_id, resource_type FROM resource WHERE resource_id = ?', [numericId]);
        if (existing.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: `Resource #${numericId} not found.` });
        }

        // Check for active incident allocations
        const [active] = await conn.query(
            'SELECT COUNT(*) AS count FROM incident_resource_allocation WHERE resource_id = ? AND released_at IS NULL',
            [numericId]
        );

        if (active[0].count > 0) {
            await conn.rollback();
            return res.status(400).json({
                error: 'Cannot delete resource with active allocations. Release all active incident allocations first.'
            });
        }

        // Delete historical allocations if any, then delete the resource
        await conn.execute('DELETE FROM incident_resource_allocation WHERE resource_id = ?', [numericId]);
        await conn.execute('DELETE FROM resource WHERE resource_id = ?', [numericId]);

        await conn.commit();

        res.json({
            success: true,
            message: `Resource #${numericId} (${existing[0].resource_type}) deleted successfully.`
        });
    } catch (err) {
        if (conn) await conn.rollback();
        console.error('Error deleting resource:', err);
        res.status(500).json({ error: 'Failed to delete resource.' });
    } finally {
        if (conn) conn.release();
    }
};
