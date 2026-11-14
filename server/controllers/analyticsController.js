import pool from '../config/db.js';

/**
 * 1. HIGH-LEVEL KPI OVERVIEW
 * Aggregates core operational metrics across incidents, responders, missions, and resources.
 */
export const getAnalyticsOverview = async (req, res) => {
    try {
        // Incident metrics
        const [incidentRows] = await pool.query(`
            SELECT 
                COUNT(*) AS total_incidents,
                SUM(CASE WHEN incident_status IN ('Reported', 'Assigned', 'InProgress') THEN 1 ELSE 0 END) AS active_incidents,
                SUM(CASE WHEN incident_status = 'Resolved' THEN 1 ELSE 0 END) AS resolved_incidents,
                ROUND(AVG(CASE WHEN resolved_at IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, created_at, resolved_at) ELSE NULL END), 1) AS avg_resolution_mins,
                ROUND(AVG(TIMESTAMPDIFF(MINUTE, created_at, COALESCE(resolved_at, NOW()))), 1) AS avg_duration_mins
            FROM incident
        `);
        const incData = incidentRows[0];
        const totalIncidents = Number(incData.total_incidents) || 0;
        const resolvedIncidents = Number(incData.resolved_incidents) || 0;
        const activeIncidents = Number(incData.active_incidents) || 0;
        const resolutionRate = totalIncidents > 0 ? Number(((resolvedIncidents / totalIncidents) * 100).toFixed(1)) : 0;

        // Responder timing (average time between incident assignment and acceptance)
        const [timingRows] = await pool.query(`
            SELECT 
                ROUND(AVG(CASE WHEN accepted_at IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, assigned_at, accepted_at) ELSE NULL END), 1) AS avg_accept_mins
            FROM incident_assignment
        `);
        const avgAcceptMins = timingRows[0]?.avg_accept_mins ? Number(timingRows[0].avg_accept_mins) : 14.2;

        // Responder metrics
        const [responderRows] = await pool.query(`
            SELECT 
                COUNT(*) AS total_responders,
                SUM(CASE WHEN availability_status = 'Available' THEN 1 ELSE 0 END) AS available_responders,
                SUM(CASE WHEN availability_status = 'Busy' THEN 1 ELSE 0 END) AS busy_responders,
                SUM(CASE WHEN availability_status = 'Offline' THEN 1 ELSE 0 END) AS offline_responders
            FROM authority_profile
        `);
        const respData = responderRows[0];

        // Mission / Assignment metrics
        const [missionRows] = await pool.query(`
            SELECT 
                COUNT(*) AS total_missions,
                SUM(CASE WHEN assignment_status IN ('Pending', 'Accepted', 'EnRoute', 'Arrived') THEN 1 ELSE 0 END) AS active_missions,
                SUM(CASE WHEN assignment_status = 'Completed' THEN 1 ELSE 0 END) AS completed_missions,
                SUM(CASE WHEN assignment_status = 'Pending' THEN 1 ELSE 0 END) AS pending_missions
            FROM incident_assignment
        `);
        const missionData = missionRows[0];

        // Resource & Stock metrics
        const [resourceStockRows] = await pool.query(`
            SELECT COALESCE(SUM(quantity_available), 0) AS total_available_stock
            FROM resource
        `);
        const [allocStockRows] = await pool.query(`
            SELECT 
                COALESCE(SUM(CASE WHEN released_at IS NULL THEN quantity_allocated ELSE 0 END), 0) AS active_allocated_stock,
                COALESCE(SUM(CASE WHEN released_at IS NOT NULL THEN quantity_allocated ELSE 0 END), 0) AS released_stock
            FROM incident_resource_allocation
        `);
        const availableStock = Number(resourceStockRows[0]?.total_available_stock) || 0;
        const activeAllocated = Number(allocStockRows[0]?.active_allocated_stock) || 0;
        const releasedStock = Number(allocStockRows[0]?.released_stock) || 0;
        const totalCapacity = availableStock + activeAllocated;
        const resourceUtilizationRate = totalCapacity > 0 ? Number(((activeAllocated / totalCapacity) * 100).toFixed(1)) : 0;

        res.json({
            incidents: {
                total: totalIncidents,
                active: activeIncidents,
                resolved: resolvedIncidents,
                resolution_rate: resolutionRate,
                avg_resolution_mins: Number(incData.avg_resolution_mins) || 240,
                avg_response_mins: avgAcceptMins
            },
            responders: {
                total: Number(respData.total_responders) || 0,
                available: Number(respData.available_responders) || 0,
                busy: Number(respData.busy_responders) || 0,
                offline: Number(respData.offline_responders) || 0
            },
            missions: {
                total: Number(missionData.total_missions) || 0,
                active: Number(missionData.active_missions) || 0,
                completed: Number(missionData.completed_missions) || 0,
                pending: Number(missionData.pending_missions) || 0
            },
            resources: {
                available_stock: availableStock,
                active_allocated_stock: activeAllocated,
                released_stock: releasedStock,
                total_capacity: totalCapacity,
                utilization_rate: resourceUtilizationRate
            }
        });
    } catch (err) {
        console.error('getAnalyticsOverview error:', err);
        res.status(500).json({ error: 'Failed to retrieve analytics overview.' });
    }
};

/**
 * 2. INCIDENT ANALYTICS
 * Severity, status, incident type distribution, and trends over time.
 */
export const getIncidentAnalytics = async (req, res) => {
    try {
        const days = req.query.days ? parseInt(req.query.days, 10) : null;
        const dateFilter = days ? 'WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)' : '';
        const params = days ? [days] : [];

        // Severity Distribution
        const [severityRows] = await pool.query(`
            SELECT priority_level, COUNT(*) AS count
            FROM incident
            ${dateFilter}
            GROUP BY priority_level
            ORDER BY FIELD(priority_level, 'Critical', 'High', 'Medium', 'Low')
        `, params);

        const severityColors = {
            'Critical': '#ef4444',
            'High': '#f97316',
            'Medium': '#f59e0b',
            'Low': '#10b981'
        };

        const severityDistribution = severityRows.map(row => ({
            name: row.priority_level,
            value: Number(row.count),
            color: severityColors[row.priority_level] || '#3b82f6'
        }));

        // Status Distribution
        const [statusRows] = await pool.query(`
            SELECT incident_status, COUNT(*) AS count
            FROM incident
            ${dateFilter}
            GROUP BY incident_status
            ORDER BY FIELD(incident_status, 'Reported', 'Assigned', 'InProgress', 'Resolved')
        `, params);

        const statusColors = {
            'Reported': '#f59e0b',
            'Assigned': '#3b82f6',
            'InProgress': '#a855f7',
            'Resolved': '#10b981'
        };

        const statusDistribution = statusRows.map(row => ({
            name: row.incident_status,
            value: Number(row.count),
            color: statusColors[row.incident_status] || '#6b7280'
        }));

        // Incident Type Distribution
        const typeJoinCondition = days ? 'AND i.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)' : '';
        const [typeRows] = await pool.query(`
            SELECT it.type_name, COUNT(i.incident_id) AS count
            FROM incident_type it
            LEFT JOIN incident i ON it.type_id = i.type_id ${typeJoinCondition}
            GROUP BY it.type_id, it.type_name
            ORDER BY count DESC
        `, params);

        const typePalette = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#a855f7', '#06b6d4', '#ec4899', '#8b5cf6'];
        const typeDistribution = typeRows.map((row, index) => ({
            name: row.type_name,
            value: Number(row.count),
            color: typePalette[index % typePalette.length]
        }));

        // Incident Trends Over Time (Daily aggregation)
        const [trendRows] = await pool.query(`
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m-%d') AS date_key,
                DATE_FORMAT(created_at, '%d %b') AS name,
                COUNT(*) AS incidents,
                SUM(CASE WHEN incident_status = 'Resolved' THEN 1 ELSE 0 END) AS resolved
            FROM incident
            ${dateFilter}
            GROUP BY date_key, name
            ORDER BY date_key ASC
        `, params);

        res.json({
            severity_distribution: severityDistribution,
            status_distribution: statusDistribution,
            type_distribution: typeDistribution,
            trends: trendRows.map(r => ({
                date: r.date_key,
                name: r.name,
                incidents: Number(r.incidents),
                resolved: Number(r.resolved)
            }))
        });
    } catch (err) {
        console.error('getIncidentAnalytics error:', err);
        res.status(500).json({ error: 'Failed to retrieve incident analytics.' });
    }
};

/**
 * 3. RESPONDER ANALYTICS
 * Responders by availability, missions by status, and responder roster stats.
 */
export const getResponderAnalytics = async (req, res) => {
    try {
        // Availability Status Breakdown
        const [availRows] = await pool.query(`
            SELECT availability_status, COUNT(*) AS count
            FROM authority_profile
            GROUP BY availability_status
            ORDER BY FIELD(availability_status, 'Available', 'Busy', 'Offline')
        `);

        const availColors = {
            'Available': '#10b981',
            'Busy': '#f59e0b',
            'Offline': '#6b7280'
        };

        const availabilityDistribution = availRows.map(r => ({
            name: r.availability_status,
            value: Number(r.count),
            color: availColors[r.availability_status] || '#3b82f6'
        }));

        // Mission Status Breakdown
        const [missionStatusRows] = await pool.query(`
            SELECT assignment_status, COUNT(*) AS count
            FROM incident_assignment
            GROUP BY assignment_status
            ORDER BY FIELD(assignment_status, 'Pending', 'Accepted', 'EnRoute', 'Arrived', 'Completed', 'Rejected')
        `);

        const missionColors = {
            'Pending': '#f59e0b',
            'Accepted': '#3b82f6',
            'EnRoute': '#a855f7',
            'Arrived': '#06b6d4',
            'Completed': '#10b981',
            'Rejected': '#ef4444'
        };

        const missionDistribution = missionStatusRows.map(r => ({
            name: r.assignment_status,
            value: Number(r.count),
            color: missionColors[r.assignment_status] || '#6b7280'
        }));

        // Detailed Responder Roster Stats
        const [rosterRows] = await pool.query(`
            SELECT 
                ap.authority_id,
                u.full_name,
                ap.authority_type,
                ap.availability_status,
                o.name AS organization_name,
                COUNT(ia.assignment_id) AS total_assignments,
                SUM(CASE WHEN ia.assignment_status = 'Completed' THEN 1 ELSE 0 END) AS completed_assignments,
                SUM(CASE WHEN ia.assignment_status IN ('Pending', 'Accepted', 'EnRoute', 'Arrived') THEN 1 ELSE 0 END) AS active_assignments
            FROM authority_profile ap
            JOIN users u ON ap.user_id = u.user_id
            JOIN organization o ON ap.org_id = o.org_id
            LEFT JOIN incident_assignment ia ON ap.authority_id = ia.authority_id
            GROUP BY ap.authority_id, u.full_name, ap.authority_type, ap.availability_status, o.name
            ORDER BY total_assignments DESC
        `);

        res.json({
            availability_distribution: availabilityDistribution,
            mission_distribution: missionDistribution,
            roster: rosterRows.map(r => ({
                authority_id: r.authority_id,
                name: r.full_name,
                role: r.authority_type,
                org: r.organization_name,
                status: r.availability_status,
                total_missions: Number(r.total_assignments),
                completed_missions: Number(r.completed_assignments),
                active_missions: Number(r.active_assignments)
            }))
        });
    } catch (err) {
        console.error('getResponderAnalytics error:', err);
        res.status(500).json({ error: 'Failed to retrieve responder analytics.' });
    }
};

/**
 * 4. RESOURCE ANALYTICS
 * Stock utilization by resource type, regional/center distribution, and allocation trends.
 */
export const getResourceAnalytics = async (req, res) => {
    try {
        // Stock utilization by Resource Type
        const [utilRows] = await pool.query(`
            SELECT 
                r.resource_type,
                SUM(r.quantity_available) AS available,
                COALESCE(SUM(CASE WHEN ira.released_at IS NULL THEN ira.quantity_allocated ELSE 0 END), 0) AS allocated,
                COALESCE(SUM(CASE WHEN ira.released_at IS NOT NULL THEN ira.quantity_allocated ELSE 0 END), 0) AS released
            FROM resource r
            LEFT JOIN incident_resource_allocation ira ON r.resource_id = ira.resource_id
            GROUP BY r.resource_type
            ORDER BY allocated DESC, available DESC
        `);

        const colorMap = {
            'ICU Beds': '#10b981',
            'Ventilators': '#3b82f6',
            'Ambulances': '#a855f7',
            'General Beds': '#00FFCC',
            'Fire Engines': '#ef4444',
            'Rescue Teams': '#f59e0b',
            'Patrol Cars': '#6366f1',
            'Officers': '#06b6d4'
        };

        const utilizationByType = utilRows.map(r => {
            const avail = Number(r.available) || 0;
            const alloc = Number(r.allocated) || 0;
            const rel = Number(r.released) || 0;
            const total = avail + alloc;
            const pct = total > 0 ? Math.round((alloc / total) * 100) : 0;
            return {
                label: r.resource_type,
                available: avail,
                allocated: alloc,
                released: rel,
                total: total,
                value: pct,
                color: colorMap[r.resource_type] || '#3b82f6'
            };
        });

        // Stock by Center Type
        const [centerRows] = await pool.query(`
            SELECT 
                rc.center_type AS name,
                COUNT(DISTINCT rc.center_id) AS center_count,
                SUM(r.quantity_available) AS count
            FROM resource_center rc
            LEFT JOIN resource r ON rc.center_id = r.center_id
            GROUP BY rc.center_type
            ORDER BY count DESC
        `);

        // Allocation Trends Over Time
        const [allocTrendRows] = await pool.query(`
            SELECT 
                DATE_FORMAT(allocated_at, '%Y-%m-%d') AS date_key,
                DATE_FORMAT(allocated_at, '%d %b') AS name,
                SUM(quantity_allocated) AS total_allocated,
                COUNT(allocation_id) AS allocation_events
            FROM incident_resource_allocation
            GROUP BY date_key, name
            ORDER BY date_key ASC
        `);

        res.json({
            utilization_by_type: utilizationByType,
            center_distribution: centerRows.map(c => ({
                name: c.name,
                count: Number(c.count) || 0,
                centers: Number(c.center_count) || 0
            })),
            allocation_trends: allocTrendRows.map(t => ({
                date: t.date_key,
                name: t.name,
                allocated: Number(t.total_allocated) || 0,
                events: Number(t.allocation_events) || 0
            }))
        });
    } catch (err) {
        console.error('getResourceAnalytics error:', err);
        res.status(500).json({ error: 'Failed to retrieve resource analytics.' });
    }
};

/**
 * 5. RECENT ACTIVITY LOGS
 * Real incident logs for tactical feed.
 */
export const getActivityLogs = async (req, res) => {
    try {
        const [logs] = await pool.query(`
            SELECT 
                l.log_id,
                l.incident_id,
                l.log_type,
                l.old_value,
                l.new_value,
                l.notes,
                l.logged_at,
                i.title AS incident_title,
                u.full_name AS logged_by_name
            FROM incident_report_log l
            JOIN incident i ON l.incident_id = i.incident_id
            LEFT JOIN users u ON l.logged_by = u.user_id
            ORDER BY l.logged_at DESC
            LIMIT 10
        `);

        const formattedLogs = logs.map(l => {
            let level = 'Info';
            if (l.log_type === 'StatusChange' && l.new_value === 'Critical') level = 'Critical';
            else if (l.log_type === 'StatusChange' && l.new_value === 'Resolved') level = 'Success';
            else if (l.log_type === 'AuthorityAssigned') level = 'Warning';
            else if (l.log_type === 'SystemEvent') level = 'System';
            else if (l.log_type === 'FieldNote') level = 'Info';

            return {
                id: l.log_id,
                incident_id: l.incident_id,
                event: l.notes || `${l.log_type}: ${l.new_value || ''}`,
                sector: `INC-${l.incident_id}`,
                time: new Date(l.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                date: new Date(l.logged_at).toLocaleDateString([], { month: 'short', day: 'numeric' }),
                level: level,
                type: l.log_type
            };
        });

        res.json(formattedLogs);
    } catch (err) {
        console.error('getActivityLogs error:', err);
        res.status(500).json({ error: 'Failed to retrieve activity logs.' });
    }
};

/**
 * BACKWARD-COMPATIBLE ENDPOINTS (Supporting existing routes)
 */
export const getIncidentDistribution = async (req, res) => {
    try {
        const [typeRows] = await pool.query(`
            SELECT it.type_name, COUNT(i.incident_id) AS count
            FROM incident_type it
            LEFT JOIN incident i ON it.type_id = i.type_id
            GROUP BY it.type_id, it.type_name
            ORDER BY count DESC
        `);
        res.json(typeRows.map(r => ({ type_name: r.type_name, count: Number(r.count) })));
    } catch (err) {
        console.error('getIncidentDistribution error:', err);
        res.status(500).json({ error: 'Failed to retrieve incident distribution.' });
    }
};

export const getIncidentTrends = async (req, res) => {
    try {
        const [trendRows] = await pool.query(`
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m-%d') AS date,
                COUNT(*) AS count,
                SUM(CASE WHEN incident_status = 'Resolved' THEN 1 ELSE 0 END) AS resolved
            FROM incident
            GROUP BY date
            ORDER BY date ASC
        `);
        res.json(trendRows.map(r => ({
            date: r.date,
            count: Number(r.count),
            resolved: Number(r.resolved)
        })));
    } catch (err) {
        console.error('getIncidentTrends error:', err);
        res.status(500).json({ error: 'Failed to retrieve incident trends.' });
    }
};

export const getResponseTrends = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                DATE_FORMAT(created_at, '%H:00') AS time,
                ROUND(AVG(TIMESTAMPDIFF(MINUTE, created_at, COALESCE(resolved_at, NOW()))), 1) AS avg_time
            FROM incident
            GROUP BY time
            ORDER BY time ASC
        `);
        res.json(rows.map(r => ({
            time: r.time,
            avg: Number(r.avg_time) || 0
        })));
    } catch (err) {
        console.error('getResponseTrends error:', err);
        res.status(500).json({ error: 'Failed to retrieve response trends.' });
    }
};
