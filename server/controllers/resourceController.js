// MOCK: In-memory resources array
// TODO (DBMS Project): Replace with SELECT * FROM resource_center ...
let mockCenters = [
    {
        center_id: 'C-01',
        center_type: 'Hospital',
        name: 'KMC Hospital Mangaluru',
        address: 'Ambedkar Circle, Mangaluru',
        contact_number: '08242225533',
        latitude: 12.864500,
        longitude: 74.843200,
        distance_km: 2.3,
        resources: [
            { resource_type: 'ICU Beds', quantity_available: 45 },
            { resource_type: 'Ventilators', quantity_available: 12 },
            { resource_type: 'Ambulances', quantity_available: 5 }
        ]
    },
    {
        center_id: 'C-02',
        center_type: 'Hospital',
        name: 'Nitte Gajria Hospital',
        address: 'Karkala Road, Udupi',
        contact_number: '08202524820',
        latitude: 13.225700,
        longitude: 75.013300,
        distance_km: 4.1,
        resources: [
            { resource_type: 'ICU Beds', quantity_available: 20 },
            { resource_type: 'Ventilators', quantity_available: 8 },
            { resource_type: 'Ambulances', quantity_available: 3 }
        ]
    },
    {
        center_id: 'C-03',
        center_type: 'Hospital',
        name: 'Government Hospital Mangaluru',
        address: 'Lalbagh, Mangaluru',
        contact_number: '08242220223',
        latitude: 12.867800,
        longitude: 74.843000,
        distance_km: 1.8,
        resources: [
            { resource_type: 'General Beds', quantity_available: 80 },
            { resource_type: 'Ambulances', quantity_available: 8 }
        ]
    },
    {
        center_id: 'C-04',
        center_type: 'Hospital',
        name: 'Dr.T.M.A. Pai Rotary Hospital',
        address: 'Manipal, Udupi',
        contact_number: '08202922217',
        latitude: 13.223500,
        longitude: 74.977400,
        distance_km: 7.2,
        resources: [
            { resource_type: 'ICU Beds', quantity_available: 35 },
            { resource_type: 'Ventilators', quantity_available: 15 }
        ]
    },
    {
        center_id: 'C-05',
        center_type: 'Hospital',
        name: 'Father Muller Medical College',
        address: 'Kankanady, Mangaluru',
        contact_number: '08242238000',
        latitude: 12.914100,
        longitude: 74.856000,
        distance_km: 3.5,
        resources: [
            { resource_type: 'ICU Beds', quantity_available: 60 },
            { resource_type: 'Ambulances', quantity_available: 10 }
        ]
    },
    {
        center_id: 'C-06',
        center_type: 'FireStation',
        name: 'Mangaluru Fire Station',
        address: 'Hampankatta, Mangaluru',
        contact_number: '08242231414',
        latitude: 12.871900,
        longitude: 74.842200,
        distance_km: 2.1,
        resources: [
            { resource_type: 'Fire Engines', quantity_available: 6 },
            { resource_type: 'Rescue Teams', quantity_available: 4 }
        ]
    },
    {
        center_id: 'C-07',
        center_type: 'Police',
        name: 'Mangaluru City Police HQ',
        address: 'Balmatta, Mangaluru',
        contact_number: '08242220600',
        latitude: 12.866600,
        longitude: 74.843800,
        distance_km: 1.5,
        resources: [
            { resource_type: 'Patrol Cars', quantity_available: 15 },
            { resource_type: 'Officers', quantity_available: 50 }
        ]
    }
];

// Helper to calculate distance
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    var R = 6371; // Radius of the earth in km
    var dLat = (lat2 - lat1) * (Math.PI / 180);
    var dLon = (lon2 - lon1) * (Math.PI / 180);
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
}

export const getNearbyCenters = async (req, res) => {
    try {
        const { lat, lng, radius, type } = req.query;
        
        if (!lat || !lng) {
            return res.status(400).json({ error: 'lat and lng are required' });
        }

        const maxDist = radius ? parseFloat(radius) : 50;

        // MOCK: Calculate distance dynamically based on input instead of SQL spatial queries
        let results = mockCenters.map(center => {
            const distance_km = getDistanceFromLatLonInKm(
                parseFloat(lat), parseFloat(lng), 
                center.latitude, center.longitude
            );
            return { ...center, distance_km: Math.round(distance_km * 10) / 10 };
        });

        // Filter by radius and type
        results = results.filter(c => c.distance_km <= maxDist);
        if (type) {
            results = results.filter(c => c.center_type === type);
        }

        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getResources = async (req, res) => {
    try {
        res.json(mockCenters);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const updateResourceStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { deployed } = req.body;
        // Mock update
        res.json({ success: true, id, deployed });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
