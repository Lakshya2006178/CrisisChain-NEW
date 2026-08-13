import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'crisischain.sqlite');

let dbInstance = null;

const getDb = async () => {
    if (!dbInstance) {
        dbInstance = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });
        console.log('✅ SQLite Connection Initialized');
        
        await dbInstance.exec(`
            CREATE TABLE IF NOT EXISTS users (
                aadhar_id TEXT PRIMARY KEY,
                full_name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                phone_number TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT CHECK(role IN ('citizen','responder','hospital','admin')) NOT NULL DEFAULT 'citizen',
                is_verified INTEGER NOT NULL DEFAULT 0,
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS incident_type (
                type_id INTEGER PRIMARY KEY AUTOINCREMENT,
                type_name TEXT UNIQUE NOT NULL,
                icon_name TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS incident (
                incident_id TEXT PRIMARY KEY,
                aadhar_id TEXT,
                type_id INTEGER NOT NULL,
                description TEXT,
                location_text TEXT,
                latitude REAL,
                longitude REAL,
                incident_status TEXT CHECK(incident_status IN ('Reported','Assigned','InProgress','Resolved','Closed')) DEFAULT 'Reported',
                priority_level TEXT CHECK(priority_level IN ('Low','Medium','High','Critical')) DEFAULT 'Medium',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                resolved_at DATETIME,
                FOREIGN KEY (aadhar_id) REFERENCES users(aadhar_id),
                FOREIGN KEY (type_id) REFERENCES incident_type(type_id)
            );

            CREATE TABLE IF NOT EXISTS incident_report_log (
                log_id TEXT PRIMARY KEY,
                incident_id TEXT NOT NULL,
                logged_by TEXT,
                log_type TEXT NOT NULL,
                old_value TEXT,
                new_value TEXT,
                notes TEXT,
                is_system INTEGER DEFAULT 0,
                logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (incident_id) REFERENCES incident(incident_id)
            );

            CREATE TABLE IF NOT EXISTS resource_center (
                center_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                center_type TEXT NOT NULL,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                address TEXT NOT NULL,
                contact_number TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS resource (
                resource_id TEXT PRIMARY KEY,
                center_id TEXT NOT NULL,
                resource_type TEXT NOT NULL,
                quantity_available INTEGER NOT NULL DEFAULT 0,
                last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (center_id) REFERENCES resource_center(center_id)
            );

            -- Seed incident types
            INSERT OR IGNORE INTO incident_type (type_id, type_name, icon_name) VALUES
            (1, 'Fire', 'Flame'),
            (2, 'Flood', 'Droplets'),
            (3, 'Medical Emergency', 'HeartPulse'),
            (4, 'Road Accident', 'AlertTriangle'),
            (5, 'Natural Disaster', 'Wind'),
            (6, 'Structural Collapse', 'Building'),
            (7, 'Hazardous Material', 'Radiation');
        `);
    }
    return dbInstance;
};

const pool = {
    query: async (sql, params = []) => {
        const db = await getDb();
        const isSelect = sql.trim().toUpperCase().startsWith('SELECT');
        if (isSelect) {
            const rows = await db.all(sql, params);
            return [rows];
        } else {
            const result = await db.run(sql, params);
            return [{ insertId: result.lastID, affectedRows: result.changes }];
        }
    },
    execute: async (sql, params = []) => pool.query(sql, params),
    getConnection: async () => ({
        query: pool.query,
        execute: pool.execute,
        release: () => {}
    })
};

export default pool;
