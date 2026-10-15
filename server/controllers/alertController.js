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

// In-Memory Mock Data (Replace with DB queries later)
let mockIncidents = [
    {
        id: 'AL-1001',
        incident_id: 'AL-1001',
        type: 'Fire',
        title: 'Major structure fire at downtown block',
        location: '123 Main St, Mangaluru',
        severity: 'High',
        status: 'Reported',
        description: 'Major structure fire at downtown block',
        time: '1 hr ago',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        iconName: 'Flame',
        color: colorForSeverity('High'),
        latitude: 12.8719,
        longitude: 74.8422,
        coordinates: '12.8719, 74.8422',
        resources: 'Dispatch Pending'
    },
    {
        id: 'AL-1002',
        incident_id: 'AL-1002',
        type: 'Road Accident',
        title: 'Multiple vehicle collision on highway',
        location: 'NH-66, near Pumpwell',
        severity: 'Critical',
        status: 'InProgress',
        description: 'Multiple vehicle collision on highway',
        time: '2 hrs ago',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        iconName: 'AlertTriangle',
        color: colorForSeverity('Critical'),
        latitude: 12.8593,
        longitude: 74.8550,
        coordinates: '12.8593, 74.8550',
        resources: 'Dispatch Pending'
    },
    {
        id: 'AL-1003',
        incident_id: 'AL-1003',
        type: 'Medical Emergency',
        title: 'Mass casualty medical emergency',
        location: 'KMC Hospital area',
        severity: 'Critical',
        status: 'Assigned',
        description: 'Mass casualty medical emergency',
        time: '3 hrs ago',
        timestamp: new Date(Date.now() - 10800000).toISOString(),
        iconName: 'HeartPulse',
        color: colorForSeverity('Critical'),
        latitude: 12.8644,
        longitude: 74.8432,
        coordinates: '12.8644, 74.8432',
        resources: 'Dispatch Pending'
    },
    {
        id: 'AL-1004',
        incident_id: 'AL-1004',
        type: 'Flood',
        title: 'Severe flash flood due to heavy rains',
        location: 'Lower Bendoorwell',
        severity: 'Medium',
        status: 'Reported',
        description: 'Severe flash flood due to heavy rains',
        time: '4 hrs ago',
        timestamp: new Date(Date.now() - 14400000).toISOString(),
        iconName: 'Droplets',
        color: colorForSeverity('Medium'),
        latitude: 12.8710,
        longitude: 74.8560,
        coordinates: '12.8710, 74.8560',
        resources: 'Dispatch Pending'
    },
    {
        id: 'AL-1005',
        incident_id: 'AL-1005',
        type: 'Hazardous Material',
        title: 'Chemical spill at industrial estate',
        location: 'Baikampady Industrial Estate',
        severity: 'Critical',
        status: 'InProgress',
        description: 'Chemical spill at industrial estate',
        time: '5 hrs ago',
        timestamp: new Date(Date.now() - 18000000).toISOString(),
        iconName: 'Radiation',
        color: colorForSeverity('Critical'),
        latitude: 12.9340,
        longitude: 74.8142,
        coordinates: '12.9340, 74.8142',
        resources: 'Dispatch Pending'
    },
    {
        id: 'AL-1006',
        incident_id: 'AL-1006',
        type: 'Structural Collapse',
        title: 'Old building collapse',
        location: 'Bunder area',
        severity: 'Medium',
        status: 'Resolved',
        description: 'Old building collapse',
        time: '6 hrs ago',
        timestamp: new Date(Date.now() - 21600000).toISOString(),
        iconName: 'Shield',
        color: colorForSeverity('Medium'),
        latitude: 12.8655,
        longitude: 74.8360,
        coordinates: '12.8655, 74.8360',
        resources: 'Dispatch Pending'
    },
    {
        id: 'AL-1007',
        incident_id: 'AL-1007',
        type: 'Natural Disaster',
        title: 'Cyclone alert and high winds',
        location: 'Panambur Beach',
        severity: 'Medium',
        status: 'Reported',
        description: 'Cyclone alert and high winds',
        time: '7 hrs ago',
        timestamp: new Date(Date.now() - 25200000).toISOString(),
        iconName: 'Wind',
        color: colorForSeverity('Medium'),
        latitude: 12.9141,
        longitude: 74.8105,
        coordinates: '12.9141, 74.8105',
        resources: 'Dispatch Pending'
    }
];

export const getAlerts = async (req, res) => {
    try {
        // MOCK: Return in-memory array
        // TODO (DBMS Project): Replace with SELECT * FROM incident JOIN incident_type...
        res.json(mockIncidents);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const createAlert = async (req, res) => {
    try {
        const { type, location, description, severity, latitude, longitude } = req.body;

        const resolvedType = type || 'Other';
        const resolvedSeverity = severity || 'Medium';

        // latitude/longitude only come through if the reporter's browser
        // actually captured a position (GPS or IP fallback). Previously a
        // missing position silently defaulted to New Delhi's coordinates,
        // which planted a fake pin on the map for every failed-GPS report.
        // Now we just store "no position" honestly — map components already
        // know how to skip a marker with no coordinates.
        const hasCoords = latitude != null && longitude != null && !isNaN(latitude) && !isNaN(longitude);

        const newIncident = {
            id: 'AL-' + Math.floor(Math.random() * 10000),
            incident_id: 'AL-' + Math.floor(Math.random() * 10000),
            type: resolvedType,
            title: `${resolvedType} - ${location || 'Unknown'}`,
            location: location || 'Unknown Location',
            severity: resolvedSeverity,
            status: 'Reported',
            description: description || '',
            time: 'Just now',
            timestamp: new Date().toISOString(),
            iconName: iconNameForType(resolvedType),
            color: colorForSeverity(resolvedSeverity),
            latitude: hasCoords ? Number(latitude) : null,
            longitude: hasCoords ? Number(longitude) : null,
            coordinates: hasCoords ? `${latitude}, ${longitude}` : null,
            resources: 'Dispatch Pending'
        };

        // MOCK: Push to in-memory array
        // TODO (DBMS Project): Replace with INSERT INTO incident...
        mockIncidents.unshift(newIncident);

        res.status(201).json(newIncident);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const updateAlertStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const { id } = req.params;

        // MOCK: Update in-memory array
        // TODO (DBMS Project): Replace with UPDATE incident SET status = ? WHERE id = ?
        const incident = mockIncidents.find(i => i.id === id || i.incident_id === id);
        if (incident) {
            incident.status = status;
        }

        res.json({ success: true, incident_id: id, new_status: status });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getStats = async (req, res) => {
    try {
        // MOCK: Calculate from in-memory array
        // TODO (DBMS Project): Replace with SELECT COUNT(*) FROM incident...
        const total = mockIncidents.length;
        const active = mockIncidents.filter(i => i.status !== 'Resolved').length;
        const resolved = mockIncidents.filter(i => i.status === 'Resolved').length;
        
        res.json({ total, active, resolved, avgResponseTimeMinutes: 14.2 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
