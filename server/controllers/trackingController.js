import pool from '../config/db.js';

/**
 * POST /api/tracking/location
 * Records a new GPS ping for an authenticated responder.
 */
export const recordLocation = async (req, res) => {
    try {
        const { latitude, longitude, incident_id } = req.body;

        if (latitude === undefined || longitude === undefined) {
            return res.status(400).json({ error: 'Latitude and longitude are required.' });
        }

        const latNum = Number(latitude);
        const lngNum = Number(longitude);

        if (isNaN(latNum) || isNaN(lngNum) || latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
            return res.status(400).json({ error: 'Invalid coordinate bounds.' });
        }

        // Resolve authority_id for this responder
        let authorityId = req.user?.authority_id;
        if (!authorityId) {
            const [profiles] = await pool.execute(
                'SELECT authority_id FROM authority_profile WHERE user_id = ?',
                [req.user.user_id || req.user.id]
            );
            if (profiles.length === 0) {
                return res.status(403).json({ error: 'User is not registered as an emergency authority.' });
            }
            authorityId = profiles[0].authority_id;
        }

        let incidentId = incident_id ? parseInt(String(incident_id).replace(/^AL-/i, ''), 10) : null;
        if (isNaN(incidentId)) incidentId = null;

        const [result] = await pool.execute(
            `INSERT INTO authority_live_location (authority_id, incident_id, latitude, longitude, recorded_at)
             VALUES (?, ?, ?, ?, NOW())`,
            [authorityId, incidentId, latNum, lngNum]
        );

        res.status(201).json({
            message: 'Live coordinates broadcasted successfully.',
            location_id: result.insertId,
            authority_id: authorityId,
            latitude: latNum,
            longitude: lngNum,
            incident_id: incidentId,
            recorded_at: new Date().toISOString()
        });
    } catch (err) {
        console.error('Error recording live location:', err);
        res.status(500).json({ error: 'Failed to record live location.' });
    }
};

/**
 * GET /api/tracking/live
 * Returns the most recent GPS ping for every responder who has broadcast telemetry.
 */
export const getLiveResponders = async (req, res) => {
    try {
        const sql = `
            SELECT 
                l.location_id,
                l.authority_id,
                l.incident_id,
                CAST(l.latitude AS DOUBLE) AS latitude,
                CAST(l.longitude AS DOUBLE) AS longitude,
                l.recorded_at,
                u.full_name AS responder_name,
                u.phone_number,
                ap.authority_type,
                ap.credential_id,
                ap.availability_status,
                o.org_id,
                o.name AS organization_name,
                o.org_type,
                i.title AS incident_title,
                CAST(i.latitude AS DOUBLE) AS incident_latitude,
                CAST(i.longitude AS DOUBLE) AS incident_longitude,
                ia.assignment_status,
                TIMESTAMPDIFF(SECOND, l.recorded_at, NOW()) AS seconds_ago
            FROM authority_live_location l
            JOIN authority_profile ap ON ap.authority_id = l.authority_id
            JOIN users u ON u.user_id = ap.user_id
            JOIN organization o ON o.org_id = ap.org_id
            LEFT JOIN incident i ON i.incident_id = l.incident_id
            LEFT JOIN incident_assignment ia ON ia.incident_id = l.incident_id AND ia.authority_id = l.authority_id
            WHERE l.recorded_at = (
                SELECT MAX(sub.recorded_at) 
                FROM authority_live_location sub 
                WHERE sub.authority_id = l.authority_id
            )
            ORDER BY l.recorded_at DESC;
        `;

        const [rows] = await pool.query(sql);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching live responders:', err);
        res.status(500).json({ error: 'Failed to fetch live responder locations.' });
    }
};

/**
 * POST /api/tracking/simulate
 * Injects a simulated GPS ping for a given responder (useful for live demonstrations).
 */
export const simulatePing = async (req, res) => {
    try {
        const authorityId = req.body.authority_id || 1; // Default to Ravi Kumar (Paramedic)
        const incidentId = req.body.incident_id ? parseInt(String(req.body.incident_id).replace(/^AL-/i, ''), 10) : 1001;
        const lat = req.body.latitude !== undefined ? Number(req.body.latitude) : 12.8685;
        const lng = req.body.longitude !== undefined ? Number(req.body.longitude) : 74.8450;

        const [result] = await pool.execute(
            `INSERT INTO authority_live_location (authority_id, incident_id, latitude, longitude, recorded_at)
             VALUES (?, ?, ?, ?, NOW())`,
            [authorityId, incidentId, lat, lng]
        );

        res.json({
            message: 'Simulated responder telemetry recorded.',
            location_id: result.insertId,
            authority_id: authorityId,
            incident_id: incidentId,
            latitude: lat,
            longitude: lng
        });
    } catch (err) {
        console.error('Error simulating telemetry:', err);
        res.status(500).json({ error: 'Failed to simulate telemetry.' });
    }
};
