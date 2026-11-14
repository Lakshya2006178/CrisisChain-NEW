import pool from '../config/db.js';

// Canonical type/severity vocabulary — MUST match src/lib/incidentTypes.js on
// the frontend. Kept as a separate copy because this is a standalone Node
// package (server/) with its own package.json/node_modules and can't import
// across the frontend's src/ tree.
const ICON_BY_TYPE = {
    'Fire': 'Flame',
    'Flood': 'Droplets',
    'Medical Emergency': 'HeartPulse',
    'Road Accident': 'AlertTriangle',
    'Natural Disaster': 'Wind',
    'Structural Collapse': 'Shield',
    'Hazardous Material': 'Radiation',
    'Other': 'AlertTriangle',
};
const iconNameForType = (type) => ICON_BY_TYPE[type] || 'AlertTriangle';

const colorForSeverity = (severity) => {
    switch (severity) {
        case 'Critical':
        case 'High':
            return '#ef4444';
        case 'Medium':
            return '#f59e0b';
        case 'Low':
        default:
            return '#3b82f6';
    }
};

const formatTimeAgo = (date) => {
    if (!date) return 'Unknown';
    const now = Date.now();
    const diffMs = now - new Date(date).getTime();
    if (diffMs < 0) return 'Just now';
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffMin < 1) return 'Just now';
    if (diffMin === 1) return '1 min ago';
    if (diffMin < 60) return `${diffMin} mins ago`;
    if (diffHr === 1) return '1 hr ago';
    if (diffHr < 24) return `${diffHr} hrs ago`;
    if (diffDay === 1) return '1 day ago';
    return `${diffDay} days ago`;
};

// Formats a DB incident row into the frontend-expected shape
const formatIncidentRow = (row) => {
    const hasCoords = row.latitude != null && row.longitude != null;
    const lat = hasCoords ? Number(row.latitude) : null;
    const lng = hasCoords ? Number(row.longitude) : null;

    // Frontend Alert component checks:
    // status === 'Responding' (corresponds to DB 'InProgress')
    // status === 'Resolved', etc.
    const displayStatus = row.incident_status === 'InProgress' ? 'Responding' : row.incident_status;

    const resourceDisplay = (row.active_allocations && Number(row.active_allocations) > 0)
        ? `${row.active_allocations} Allocated`
        : (row.incident_status === 'Resolved' ? 'Released' : (row.incident_status === 'Assigned' ? 'Units Assigned' : 'None Allocated'));

    return {
        id: `AL-${row.incident_id}`,
        incident_id: `AL-${row.incident_id}`,
        numeric_id: row.incident_id,
        type: row.type_name,
        title: row.title,
        location: row.location_text || 'Unknown Location',
        severity: row.priority_level,
        status: displayStatus,
        incident_status: row.incident_status,
        db_status: row.incident_status,
        description: row.description || '',
        time: formatTimeAgo(row.created_at),
        timestamp: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
        iconName: row.icon_name || iconNameForType(row.type_name),
        color: colorForSeverity(row.priority_level),
        latitude: lat,
        longitude: lng,
        coordinates: hasCoords ? `${lat}, ${lng}` : null,
        image_url: row.image_url || null,
        resources: resourceDisplay,
        active_allocations: Number(row.active_allocations || 0),
        active_assignments: Number(row.active_assignments || 0),
        reporter_id: row.reporter_id,
        created_at: row.created_at,
        resolved_at: row.resolved_at,
        updated_at: row.updated_at
    };
};

/**
 * GET /api/alerts
 * Retrieves incidents from MySQL with optional filtering by status, severity, and type.
 */
export const getAlerts = async (req, res) => {
    try {
        const { status, severity, type } = req.query;
        const conditions = [];
        const params = [];

        if (status) {
            const s = status.trim().toLowerCase();
            if (s === 'responding' || s === 'inprogress') {
                conditions.push("(i.incident_status = 'InProgress' OR i.incident_status = 'Assigned')");
            } else if (s === 'active') {
                conditions.push("i.incident_status != 'Resolved'");
            } else {
                conditions.push("LOWER(i.incident_status) = ?");
                params.push(s);
            }
        }

        if (severity) {
            conditions.push("LOWER(i.priority_level) = ?");
            params.push(severity.trim().toLowerCase());
        }

        if (type) {
            conditions.push("LOWER(t.type_name) = ?");
            params.push(type.trim().toLowerCase());
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const sql = `
            SELECT 
                i.incident_id,
                i.reporter_id,
                i.type_id,
                i.title,
                i.description,
                i.location_text,
                i.latitude,
                i.longitude,
                i.image_url,
                i.incident_status,
                i.priority_level,
                i.created_at,
                i.resolved_at,
                i.updated_at,
                t.type_name,
                t.icon_name,
                (SELECT COUNT(*) FROM incident_resource_allocation ira WHERE ira.incident_id = i.incident_id AND ira.released_at IS NULL) AS active_allocations,
                (SELECT COUNT(*) FROM incident_assignment ia WHERE ia.incident_id = i.incident_id AND ia.assignment_status IN ('Pending','Accepted','EnRoute','Arrived')) AS active_assignments
            FROM incident i
            JOIN incident_type t ON i.type_id = t.type_id
            ${whereClause}
            ORDER BY i.created_at DESC
        `;

        const [rows] = await pool.query(sql, params);
        const formatted = rows.map(formatIncidentRow);
        res.json(formatted);
    } catch (err) {
        console.error('Error fetching alerts:', err);
        res.status(500).json({ error: 'Failed to fetch alerts.' });
    }
};

/**
 * POST /api/alerts
 * Inserts a new incident and logs the initial 'Reported' status in incident_report_log.
 */
export const createAlert = async (req, res) => {
    let conn;
    try {
        const { type, location, description, severity, latitude, longitude, title } = req.body;

        if (!location || !String(location).trim()) {
            return res.status(400).json({ error: 'Location is required.' });
        }
        if (!description || !String(description).trim()) {
            return res.status(400).json({ error: 'Description is required.' });
        }

        const trimmedLocation = String(location).trim();
        const trimmedDesc = String(description).trim();

        // 1. Resolve type_id from incident_type table
        const reqType = (type || 'Other').trim();
        let [typeRows] = await pool.query(
            'SELECT type_id, type_name, icon_name FROM incident_type WHERE LOWER(type_name) = LOWER(?) LIMIT 1',
            [reqType]
        );

        if (typeRows.length === 0) {
            [typeRows] = await pool.query(
                "SELECT type_id, type_name, icon_name FROM incident_type WHERE type_name = 'Other' LIMIT 1"
            );
        }

        const typeRecord = typeRows[0] || { type_id: 8, type_name: 'Other', icon_name: 'AlertTriangle' };

        // 2. Normalize priority_level
        const severityMap = {
            critical: 'Critical',
            high: 'High',
            medium: 'Medium',
            low: 'Low'
        };
        const normalizedSeverity = severityMap[String(severity || '').toLowerCase()] || 'Medium';

        // 3. Image URL from upload or payload
        const imageUrl = req.file ? `/uploads/incidents/${req.file.filename}` : (req.body.image_url || null);

        // 4. Validate and resolve coordinates (explicit or extracted from location text)
        let latNum = parseFloat(latitude);
        let lngNum = parseFloat(longitude);

        if (isNaN(latNum) || isNaN(lngNum)) {
            // Check if coordinates were entered in location text (e.g., "12.9141, 74.8560" or "Lat: 12.9141, Lng: 74.8560")
            const coordMatch = trimmedLocation.match(/(-?\d{1,2}\.\d+)[,\s]+(-?\d{1,3}\.\d+)/);
            if (coordMatch) {
                latNum = parseFloat(coordMatch[1]);
                lngNum = parseFloat(coordMatch[2]);
            }
        }

        const hasCoords = !isNaN(latNum) && !isNaN(lngNum) &&
            latNum >= -90 && latNum <= 90 &&
            lngNum >= -180 && lngNum <= 180;

        const finalLat = hasCoords ? latNum : null;
        const finalLng = hasCoords ? lngNum : null;

        // 5. Generate title
        const incidentTitle = (title && String(title).trim())
            ? String(title).trim().substring(0, 150)
            : `${typeRecord.type_name} - ${trimmedLocation}`.substring(0, 150);

        // 6. Check reporter_id if user is authenticated
        let reporterId = req.user?.user_id || null;
        if (reporterId) {
            const [userRows] = await pool.query('SELECT user_id FROM users WHERE user_id = ?', [reporterId]);
            if (userRows.length === 0) {
                reporterId = null; // Stale or invalid user ID, proceed as anonymous
            }
        }

        // 7. Transactional insert into incident + incident_report_log
        conn = await pool.getConnection();
        await conn.beginTransaction();

        const insertIncidentSql = `
            INSERT INTO incident 
                (reporter_id, type_id, title, description, location_text, latitude, longitude, image_url, incident_status, priority_level)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Reported', ?)
        `;

        const [insertResult] = await conn.execute(insertIncidentSql, [
            reporterId,
            typeRecord.type_id,
            incidentTitle,
            trimmedDesc,
            trimmedLocation,
            finalLat,
            finalLng,
            imageUrl,
            normalizedSeverity
        ]);

        const incidentId = insertResult.insertId;

        const insertLogSql = `
            INSERT INTO incident_report_log 
                (incident_id, logged_by, log_type, old_value, new_value, notes)
            VALUES (?, ?, 'StatusChange', NULL, 'Reported', 'Emergency incident reported')
        `;

        await conn.execute(insertLogSql, [incidentId, reporterId]);

        await conn.commit();

        const newIncident = {
            id: `AL-${incidentId}`,
            incident_id: `AL-${incidentId}`,
            numeric_id: incidentId,
            type: typeRecord.type_name,
            title: incidentTitle,
            location: trimmedLocation,
            severity: normalizedSeverity,
            status: 'Reported',
            incident_status: 'Reported',
            db_status: 'Reported',
            description: trimmedDesc,
            time: 'Just now',
            timestamp: new Date().toISOString(),
            iconName: typeRecord.icon_name || iconNameForType(typeRecord.type_name),
            color: colorForSeverity(normalizedSeverity),
            latitude: finalLat,
            longitude: finalLng,
            coordinates: hasCoords ? `${finalLat}, ${finalLng}` : null,
            image_url: imageUrl,
            resources: 'None Allocated',
            reporter_id: reporterId,
            created_at: new Date(),
            resolved_at: null
        };

        res.status(201).json(newIncident);
    } catch (err) {
        if (conn) await conn.rollback();
        console.error('Error creating alert:', err);
        res.status(500).json({ error: 'Failed to create alert.' });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * PATCH /api/alerts/:id/status
 * Updates incident status in a transaction and records the transition in incident_report_log.
 */
export const updateAlertStatus = async (req, res) => {
    let conn;
    try {
        const rawId = req.params.id;
        const numericId = parseInt(String(rawId).replace(/^AL-/i, ''), 10);
        if (isNaN(numericId)) {
            return res.status(400).json({ error: 'Invalid incident ID format.' });
        }

        const rawStatus = String(req.body.status || '').trim().toLowerCase();
        const statusMap = {
            'reported': 'Reported',
            'assigned': 'Assigned',
            'inprogress': 'InProgress',
            'in progress': 'InProgress',
            'responding': 'InProgress',
            'resolved': 'Resolved'
        };

        const mappedStatus = statusMap[rawStatus];
        if (!mappedStatus) {
            return res.status(400).json({
                error: 'Invalid status. Allowed values: Reported, Assigned, InProgress, Responding, Resolved.'
            });
        }

        const loggedBy = req.user?.user_id || null;

        conn = await pool.getConnection();
        await conn.beginTransaction();

        const [rows] = await conn.execute(
            'SELECT incident_id, title, reporter_id, incident_status, resolved_at FROM incident WHERE incident_id = ? FOR UPDATE',
            [numericId]
        );

        if (rows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: `Incident AL-${numericId} not found.` });
        }

        const currentIncident = rows[0];
        const oldStatus = currentIncident.incident_status;

        // Perform status update & set resolved_at when appropriate
        if (mappedStatus === 'Resolved') {
            await conn.execute(
                'UPDATE incident SET incident_status = ?, resolved_at = NOW() WHERE incident_id = ?',
                [mappedStatus, numericId]
            );

            // Complete all active assignments and free up responders
            const [activeAssignments] = await conn.execute(
                `SELECT ia.assignment_id, ia.authority_id 
                 FROM incident_assignment ia 
                 WHERE ia.incident_id = ? AND ia.assignment_status IN ('Pending','Accepted','EnRoute','Arrived')`,
                [numericId]
            );

            await conn.execute(
                `UPDATE incident_assignment 
                 SET assignment_status = 'Completed', completed_at = COALESCE(completed_at, NOW()) 
                 WHERE incident_id = ? AND assignment_status IN ('Pending','Accepted','EnRoute','Arrived')`,
                [numericId]
            );

            for (const asgn of activeAssignments) {
                const [remaining] = await conn.execute(
                    `SELECT COUNT(*) AS count 
                     FROM incident_assignment 
                     WHERE authority_id = ? 
                       AND assignment_status IN ('Pending','Accepted','EnRoute','Arrived')`,
                    [asgn.authority_id]
                );
                if (remaining[0].count === 0) {
                    await conn.execute(
                        'UPDATE authority_profile SET availability_status = "Available" WHERE authority_id = ?',
                        [asgn.authority_id]
                    );
                }
            }

            // Release any active resource allocations back to inventory
            const [activeAllocations] = await conn.execute(
                `SELECT allocation_id, resource_id, quantity_allocated 
                 FROM incident_resource_allocation 
                 WHERE incident_id = ? AND released_at IS NULL`,
                [numericId]
            );

            for (const alloc of activeAllocations) {
                await conn.execute(
                    'UPDATE resource SET quantity_available = quantity_available + ? WHERE resource_id = ?',
                    [alloc.quantity_allocated, alloc.resource_id]
                );
            }

            await conn.execute(
                'UPDATE incident_resource_allocation SET released_at = NOW() WHERE incident_id = ? AND released_at IS NULL',
                [numericId]
            );
        } else {
            await conn.execute(
                'UPDATE incident SET incident_status = ?, resolved_at = NULL WHERE incident_id = ?',
                [mappedStatus, numericId]
            );
        }

        // Insert audit record in incident_report_log
        const userRole = req.user?.role || 'user';
        const logNote = `Status changed from ${oldStatus} to ${mappedStatus} by ${userRole}`;
        const logSql = `
            INSERT INTO incident_report_log 
                (incident_id, logged_by, log_type, old_value, new_value, notes)
            VALUES (?, ?, 'StatusChange', ?, ?, ?)
        `;
        await conn.execute(logSql, [numericId, loggedBy, oldStatus, mappedStatus, logNote]);

        // Insert notification for the reporter (if civilian/user)
        try {
            if (currentIncident.reporter_id && currentIncident.reporter_id !== loggedBy) {
                const notifTitle = `Incident ${mappedStatus}`;
                const notifMsg = `Your report for incident AL-${numericId} (${currentIncident.title}) status changed to '${mappedStatus}'.`;
                await conn.execute(
                    `INSERT INTO notification (recipient_id, incident_id, notification_type, title, message, is_read)
                     VALUES (?, ?, 'StatusUpdate', ?, ?, 0)`,
                    [currentIncident.reporter_id, numericId, notifTitle, notifMsg]
                );
            }

            // If resolved, also notify active responders assigned to this incident
            if (mappedStatus === 'Resolved') {
                const [responders] = await conn.query(
                    `SELECT ap.user_id 
                     FROM incident_assignment ia 
                     JOIN authority_profile ap ON ia.authority_id = ap.authority_id 
                     WHERE ia.incident_id = ? AND ia.assignment_status NOT IN ('Completed', 'Rejected')`,
                    [numericId]
                );
                for (const r of responders) {
                    if (r.user_id !== loggedBy) {
                        await conn.execute(
                            `INSERT INTO notification (recipient_id, incident_id, notification_type, title, message, is_read)
                             VALUES (?, ?, 'StatusUpdate', 'Incident Resolved', ?, 0)`,
                            [r.user_id, numericId, `Incident AL-${numericId} has been resolved by Admin.`]
                        );
                    }
                }
            }
        } catch (notifErr) {
            console.warn('Could not insert incident status notification:', notifErr.message);
        }

        await conn.commit();

        const displayStatus = mappedStatus === 'InProgress' ? 'Responding' : mappedStatus;

        res.json({
            success: true,
            incident_id: `AL-${numericId}`,
            new_status: displayStatus,
            db_status: mappedStatus,
            previous_status: oldStatus
        });
    } catch (err) {
        if (conn) await conn.rollback();
        console.error('Error updating alert status:', err);
        res.status(500).json({ error: 'Failed to update alert status.' });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * GET /api/alerts/stats
 * Returns live aggregated statistics from the incident table.
 */
export const getStats = async (req, res) => {
    try {
        const sql = `
            SELECT 
                COUNT(*) AS total,
                SUM(CASE WHEN incident_status != 'Resolved' THEN 1 ELSE 0 END) AS active,
                SUM(CASE WHEN incident_status = 'Resolved' THEN 1 ELSE 0 END) AS resolved,
                SUM(CASE WHEN priority_level = 'Critical' THEN 1 ELSE 0 END) AS critical,
                SUM(CASE WHEN incident_status IN ('InProgress', 'Assigned') THEN 1 ELSE 0 END) AS responding,
                ROUND(COALESCE(AVG(CASE WHEN resolved_at IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, created_at, resolved_at) END), 0), 1) AS avgResponseTimeMinutes
            FROM incident
        `;

        const [rows] = await pool.query(sql);
        const stats = rows[0] || {};

        res.json({
            total: Number(stats.total) || 0,
            active: Number(stats.active) || 0,
            resolved: Number(stats.resolved) || 0,
            critical: Number(stats.critical) || 0,
            responding: Number(stats.responding) || 0,
            avgResponseTimeMinutes: Number(stats.avgResponseTimeMinutes) || 0
        });
    } catch (err) {
        console.error('Error fetching alert stats:', err);
        res.status(500).json({ error: 'Failed to fetch alert statistics.' });
    }
};

/**
 * GET /api/alerts/detect-location
 * Server-side verified IP geolocation for reliable positioning in India
 */
export const detectLocation = async (req, res) => {
    try {
        let clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
        if (clientIp.includes(',')) clientIp = clientIp.split(',')[0].trim();
        if (clientIp.startsWith('::ffff:')) clientIp = clientIp.replace('::ffff:', '');

        const isPrivate = !clientIp || clientIp === '127.0.0.1' || clientIp === '::1' || clientIp.startsWith('192.168.') || clientIp.startsWith('10.');
        const url = isPrivate ? 'http://ip-api.com/json' : `http://ip-api.com/json/${clientIp}`;

        const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
        if (!response.ok) throw new Error('IP service unreachable');
        const data = await response.json();

        if (data.status === 'success') {
            return res.json({
                success: true,
                country: data.country || 'India',
                countryCode: data.countryCode || 'IN',
                region: data.regionName || 'Karnataka',
                city: data.city || 'Bengaluru',
                latitude: Number(data.lat),
                longitude: Number(data.lon),
                isp: data.isp || 'Bharti Airtel',
                formatted: `${data.city || 'Bengaluru'}, ${data.regionName || 'Karnataka'}, ${data.country || 'India'} (${Number(data.lat).toFixed(6)}, ${Number(data.lon).toFixed(6)})`
            });
        }

        // Default Indian coordinates (Mangaluru CrisisCenter HQ)
        return res.json({
            success: true,
            country: 'India',
            countryCode: 'IN',
            region: 'Karnataka',
            city: 'Mangaluru',
            latitude: 12.914142,
            longitude: 74.856012,
            formatted: 'Hampankatta, Mangaluru, Karnataka, India (12.914142, 74.856012)'
        });
    } catch (err) {
        console.warn('IP location detection fallback to default India HQ:', err.message);
        return res.json({
            success: true,
            country: 'India',
            countryCode: 'IN',
            region: 'Karnataka',
            city: 'Mangaluru',
            latitude: 12.914142,
            longitude: 74.856012,
            formatted: 'Hampankatta, Mangaluru, Karnataka, India (12.914142, 74.856012)'
        });
    }
};
