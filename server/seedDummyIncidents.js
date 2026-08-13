import crypto from 'crypto';
import pool from './db.js';

const dummyIncidents = [
  { type: 1, desc: 'Major structure fire at downtown block', loc: '123 Main St, Mangaluru', lat: 12.8719, lng: 74.8422, status: 'Reported', severity: 'High' },
  { type: 4, desc: 'Multiple vehicle collision on highway', loc: 'NH-66, near Pumpwell', lat: 12.8593, lng: 74.8550, status: 'InProgress', severity: 'Critical' },
  { type: 3, desc: 'Mass casualty medical emergency', loc: 'KMC Hospital area', lat: 12.8644, lng: 74.8432, status: 'Assigned', severity: 'Critical' },
  { type: 2, desc: 'Severe flash flood due to heavy rains', loc: 'Lower Bendoorwell', lat: 12.8710, lng: 74.8560, status: 'Reported', severity: 'Medium' },
  { type: 7, desc: 'Chemical spill at industrial estate', loc: 'Baikampady Industrial Estate', lat: 12.9340, lng: 74.8142, status: 'InProgress', severity: 'Critical' },
  { type: 6, desc: 'Old building collapse', loc: 'Bunder area', lat: 12.8655, lng: 74.8360, status: 'Resolved', severity: 'Medium' },
  { type: 5, desc: 'Cyclone alert and high winds', loc: 'Panambur Beach', lat: 12.9141, lng: 74.8105, status: 'Reported', severity: 'Medium' }
];

const dummyCenters = [
  { id: crypto.randomUUID(), name: "KMC Hospital Mangaluru", type: "Hospital", lat: 12.864500, lng: 74.843200, address: "Ambedkar Circle, Mangaluru", phone: "08242225533" },
  { id: crypto.randomUUID(), name: "Nitte Gajria Hospital", type: "Hospital", lat: 13.225700, lng: 75.013300, address: "Karkala Road, Udupi", phone: "08202524820" },
  { id: crypto.randomUUID(), name: "Government Hospital Mangaluru", type: "Hospital", lat: 12.867800, lng: 74.843000, address: "Lalbagh, Mangaluru", phone: "08242220223" },
  { id: crypto.randomUUID(), name: "Dr.T.M.A. Pai Rotary Hospital", type: "Hospital", lat: 13.223500, lng: 74.977400, address: "Manipal, Udupi", phone: "08202922217" },
  { id: crypto.randomUUID(), name: "Father Muller Medical College", type: "Hospital", lat: 12.914100, lng: 74.856000, address: "Kankanady, Mangaluru", phone: "08242238000" },
  { id: crypto.randomUUID(), name: "Mangaluru Fire Station", type: "FireStation", lat: 12.871900, lng: 74.842200, address: "Hampankatta, Mangaluru", phone: "08242231414" },
  { id: crypto.randomUUID(), name: "Mangaluru City Police HQ", type: "Police", lat: 12.866600, lng: 74.843800, address: "Balmatta, Mangaluru", phone: "08242220600" }
];

const resourceTypes = ["ICU Beds", "General Beds", "Ventilators", "Ambulances"];

async function seed() {
  let conn;
  try {
    conn = await pool.getConnection();
    console.log('Connected to SQLite Database. Seeding...');
    
    // SQLite uses different commands for clearing
    await conn.execute('DELETE FROM incident_report_log');
    await conn.execute('DELETE FROM incident');
    await conn.execute('DELETE FROM resource');
    await conn.execute('DELETE FROM resource_center');
    
    for (const center of dummyCenters) {
      await conn.execute(
        `INSERT INTO resource_center (center_id, name, center_type, latitude, longitude, address, contact_number)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [center.id, center.name, center.type, center.lat, center.lng, center.address, center.phone]
      );
      
      for (const resType of resourceTypes) {
        let maxQty = resType.includes('Beds') ? 50 : 10;
        if (center.type !== 'Hospital' && resType.includes('Beds')) continue;
        const qty = Math.floor(Math.random() * maxQty);
        await conn.execute(
          `INSERT INTO resource (resource_id, center_id, resource_type, quantity_available)
           VALUES (?, ?, ?, ?)`,
          [crypto.randomUUID(), center.id, resType, qty]
        );
      }
    }
    
    console.log('Seeding Tactical Users...');
    const testPasswordHash = '$2a$10$B4OXDSqG1AWH5/WKI5GYfe62cqrAzO7rfkftUFYoNhvwPnktp26/y'; // admin123
    
    const users = [
      { aadhar: '000000000000', name: 'Admin HQ', email: 'admin@crisischain.com', role: 'admin' },
      { aadhar: '111111111111', name: 'KMC Hospital', email: 'hospital@crisischain.com', role: 'hospital' },
      { aadhar: '222222222222', name: 'Rescue Team Alpha', email: 'responder@crisischain.com', role: 'responder' },
      { aadhar: '333333333333', name: 'Standard Citizen', email: 'user@crisischain.com', role: 'user' },
    ];

    for (const u of users) {
        const aadhar_id = crypto.createHash('sha256').update(u.aadhar.trim()).digest('hex');
        await conn.execute(
          `INSERT OR IGNORE INTO users (aadhar_id, full_name, email, phone_number, password_hash, role, is_verified, is_active) 
           VALUES (?, ?, ?, '0000000000', ?, ?, 1, 1)`,
          [aadhar_id, u.name, u.email, testPasswordHash, u.role]
        );
    }
    
    for (const inc of dummyIncidents) {
      const id = crypto.randomUUID();
      await conn.execute(
        `INSERT INTO incident (incident_id, type_id, description, location_text, latitude, longitude, incident_status, priority_level)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, inc.type, inc.desc, inc.loc, inc.lat, inc.lng, inc.status, inc.severity]
      );
      
      await conn.execute(
        `INSERT INTO incident_report_log (log_id, incident_id, log_type, new_value, notes, is_system)
         VALUES (?, ?, 'SystemEvent', 'Reported', 'Dummy data automatically seeded', 1)`,
        [crypto.randomUUID(), id]
      );
    }
    
    console.log(`\n✅ Seeding Complete!`);
  } catch (err) {
    console.error('❌ Failed to seed:', err.message);
  } finally {
    process.exit(0);
  }
}

seed();
