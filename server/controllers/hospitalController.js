import pool from '../config/db.js';

const DEFAULT_HOSPITAL_DATA = {
    beds: [
        { id: 1, ward: 'ICU',       total: 20, available: 5,  status: 'Near Capacity' },
        { id: 2, ward: 'General',   total: 80, available: 35, status: 'Available' },
        { id: 3, ward: 'Emergency', total: 15, available: 0,  status: 'Full' },
        { id: 4, ward: 'Pediatric', total: 20, available: 12, status: 'Available' },
    ],
    ambulances: [
        { id: 1, unit: 'AMB-KMC-01', driver: 'Rajan K.', status: 'Available', location: 'Hospital Bay' },
        { id: 2, unit: 'AMB-KMC-02', driver: 'Sunil M.', status: 'Dispatched', location: 'Kadri Road' },
        { id: 3, unit: 'AMB-KMC-03', driver: 'Vijay P.', status: 'Maintenance', location: 'Garage' },
    ],
    kits: [
        { id: 1, name: 'Trauma Kit',          qty: 25, expiry: '2026-12-01', location: 'Store A' },
        { id: 2, name: 'Cardiac Arrest Kit',  qty: 10, expiry: '2027-03-15', location: 'ICU' },
        { id: 3, name: 'First Aid Kit',        qty: 50, expiry: '2026-09-30', location: 'Emergency' },
        { id: 4, name: 'Surgical Kit',         qty: 8,  expiry: '2027-01-10', location: 'OT' },
    ],
    staff: [
        { id: 1, name: 'Dr. Anitha Rao',   role: 'Surgeon',    shift: 'Morning', status: 'On Duty',  specialization: 'Cardiothoracic' },
        { id: 2, name: 'Dr. Kiran Shetty', role: 'Physician',  shift: 'Night',   status: 'Off Duty', specialization: 'General Medicine' },
        { id: 3, name: 'Nurse Priya T.',   role: 'Nurse',      shift: 'Morning', status: 'On Duty',  specialization: 'ICU' },
        { id: 4, name: 'Para. Mohan D.',   role: 'Paramedic',  shift: 'Afternoon',status: 'On Duty', specialization: 'Emergency' },
    ],
};

let tableEnsured = false;
async function ensureHospitalTable() {
    if (tableEnsured) return;
    await pool.query(`
        CREATE TABLE IF NOT EXISTS hospital_resources (
            id INT NOT NULL AUTO_INCREMENT,
            org_id INT NOT NULL,
            beds JSON NOT NULL,
            ambulances JSON NOT NULL,
            kits JSON NOT NULL,
            staff JSON NOT NULL,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_hosp_org (org_id)
        ) ENGINE=InnoDB;
    `);
    tableEnsured = true;
}

async function resolveOrgId(req) {
    if (req.user) {
        if (req.user.org_id) return req.user.org_id;
        const [profiles] = await pool.query(
            'SELECT org_id FROM authority_profile WHERE user_id = ?',
            [req.user.user_id || req.user.id]
        );
        if (profiles.length > 0 && profiles[0].org_id) {
            return profiles[0].org_id;
        }
    }
    return 1;
}

async function syncToResourceTable(orgId, data) {
    try {
        const [centers] = await pool.query('SELECT center_id FROM resource_center WHERE org_id = ?', [orgId]);
        if (centers.length === 0) return;
        const centerId = centers[0].center_id;

        if (Array.isArray(data.beds)) {
            const icuBed = data.beds.find(b => String(b.ward || '').toUpperCase().includes('ICU'));
            if (icuBed && icuBed.available !== undefined) {
                await pool.execute(
                    'UPDATE resource SET quantity_available = ? WHERE center_id = ? AND resource_type LIKE "%ICU Bed%"',
                    [Number(icuBed.available) || 0, centerId]
                );
            }
            const generalBed = data.beds.find(b => String(b.ward || '').toUpperCase().includes('GENERAL'));
            if (generalBed && generalBed.available !== undefined) {
                await pool.execute(
                    'UPDATE resource SET quantity_available = ? WHERE center_id = ? AND resource_type LIKE "%General Bed%"',
                    [Number(generalBed.available) || 0, centerId]
                );
            }
        }

        if (Array.isArray(data.ambulances)) {
            const availAmbs = data.ambulances.filter(a => a.status === 'Available').length;
            await pool.execute(
                'UPDATE resource SET quantity_available = ? WHERE center_id = ? AND resource_type LIKE "%Ambulance%"',
                [availAmbs, centerId]
            );
        }
    } catch (err) {
        console.warn('Could not sync hospital resources to resource table:', err.message);
    }
}

export const getHospitalResources = async (req, res) => {
    try {
        await ensureHospitalTable();
        const orgId = await resolveOrgId(req);

        const [rows] = await pool.query('SELECT * FROM hospital_resources WHERE org_id = ?', [orgId]);
        if (rows.length === 0) {
            await pool.query(
                'INSERT INTO hospital_resources (org_id, beds, ambulances, kits, staff) VALUES (?, ?, ?, ?, ?)',
                [
                    orgId,
                    JSON.stringify(DEFAULT_HOSPITAL_DATA.beds),
                    JSON.stringify(DEFAULT_HOSPITAL_DATA.ambulances),
                    JSON.stringify(DEFAULT_HOSPITAL_DATA.kits),
                    JSON.stringify(DEFAULT_HOSPITAL_DATA.staff)
                ]
            );
            return res.json({ org_id: orgId, ...DEFAULT_HOSPITAL_DATA });
        }

        const record = rows[0];
        const data = {
            org_id: orgId,
            beds: typeof record.beds === 'string' ? JSON.parse(record.beds) : record.beds,
            ambulances: typeof record.ambulances === 'string' ? JSON.parse(record.ambulances) : record.ambulances,
            kits: typeof record.kits === 'string' ? JSON.parse(record.kits) : record.kits,
            staff: typeof record.staff === 'string' ? JSON.parse(record.staff) : record.staff,
            updated_at: record.updated_at
        };

        res.json(data);
    } catch (err) {
        console.error('Error fetching hospital resources:', err);
        res.status(500).json({ error: 'Failed to fetch hospital resources.' });
    }
};

export const updateHospitalResources = async (req, res) => {
    try {
        await ensureHospitalTable();
        const orgId = await resolveOrgId(req);
        const { beds, ambulances, kits, staff } = req.body;

        const [rows] = await pool.query('SELECT * FROM hospital_resources WHERE org_id = ?', [orgId]);
        let current = rows.length > 0 ? rows[0] : DEFAULT_HOSPITAL_DATA;

        const updatedData = {
            beds: beds || (typeof current.beds === 'string' ? JSON.parse(current.beds) : current.beds),
            ambulances: ambulances || (typeof current.ambulances === 'string' ? JSON.parse(current.ambulances) : current.ambulances),
            kits: kits || (typeof current.kits === 'string' ? JSON.parse(current.kits) : current.kits),
            staff: staff || (typeof current.staff === 'string' ? JSON.parse(current.staff) : current.staff)
        };

        await pool.query(`
            INSERT INTO hospital_resources (org_id, beds, ambulances, kits, staff)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                beds = VALUES(beds),
                ambulances = VALUES(ambulances),
                kits = VALUES(kits),
                staff = VALUES(staff)
        `, [
            orgId,
            JSON.stringify(updatedData.beds),
            JSON.stringify(updatedData.ambulances),
            JSON.stringify(updatedData.kits),
            JSON.stringify(updatedData.staff)
        ]);

        await syncToResourceTable(orgId, updatedData);

        res.json({
            success: true,
            message: 'Hospital resources updated successfully.',
            org_id: orgId,
            ...updatedData
        });
    } catch (err) {
        console.error('Error updating hospital resources:', err);
        res.status(500).json({ error: 'Failed to update hospital resources.' });
    }
};

export const updateHospitalItem = async (req, res) => {
    try {
        await ensureHospitalTable();
        const orgId = await resolveOrgId(req);
        const { category, id } = req.params;
        const validCategories = ['beds', 'ambulances', 'kits', 'staff'];

        if (!validCategories.includes(category)) {
            return res.status(400).json({ error: `Invalid category. Must be one of: ${validCategories.join(', ')}` });
        }

        const [rows] = await pool.query('SELECT * FROM hospital_resources WHERE org_id = ?', [orgId]);
        let current = rows.length > 0 ? rows[0] : null;

        let fullData = current ? {
            beds: typeof current.beds === 'string' ? JSON.parse(current.beds) : current.beds,
            ambulances: typeof current.ambulances === 'string' ? JSON.parse(current.ambulances) : current.ambulances,
            kits: typeof current.kits === 'string' ? JSON.parse(current.kits) : current.kits,
            staff: typeof current.staff === 'string' ? JSON.parse(current.staff) : current.staff
        } : JSON.parse(JSON.stringify(DEFAULT_HOSPITAL_DATA));

        const list = fullData[category] || [];
        const targetIndex = list.findIndex(item => String(item.id) === String(id));

        if (targetIndex === -1) {
            return res.status(404).json({ error: `Item #${id} not found in category '${category}'.` });
        }

        const existingItem = list[targetIndex];
        const updatedItem = { ...existingItem, ...req.body, id: existingItem.id };

        if (updatedItem.total !== undefined) updatedItem.total = Number(updatedItem.total);
        if (updatedItem.available !== undefined) updatedItem.available = Number(updatedItem.available);
        if (updatedItem.qty !== undefined) updatedItem.qty = Number(updatedItem.qty);

        list[targetIndex] = updatedItem;
        fullData[category] = list;

        await pool.query(`
            INSERT INTO hospital_resources (org_id, beds, ambulances, kits, staff)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                beds = VALUES(beds),
                ambulances = VALUES(ambulances),
                kits = VALUES(kits),
                staff = VALUES(staff)
        `, [
            orgId,
            JSON.stringify(fullData.beds),
            JSON.stringify(fullData.ambulances),
            JSON.stringify(fullData.kits),
            JSON.stringify(fullData.staff)
        ]);

        await syncToResourceTable(orgId, fullData);

        res.json({
            success: true,
            message: 'Item updated successfully.',
            category,
            item: updatedItem,
            data: fullData
        });
    } catch (err) {
        console.error('Error updating hospital item:', err);
        res.status(500).json({ error: 'Failed to update hospital item.' });
    }
};

