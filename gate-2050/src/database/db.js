const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Database file path
const DB_PATH = path.join(__dirname, '../../data/gate2050.db');

// Ensure data directory exists
if (!fs.existsSync(path.dirname(DB_PATH))) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

// Initialize database connection
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Database connection error:', err.message);
    } else {
        console.log('Connected to the SQLite database');
        initializeDatabase();
    }
});

// Database schema initialization
function initializeDatabase() {
    db.serialize(() => {
        // Users table
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            refresh_token TEXT,
            college TEXT,
            gate_year INTEGER,
            prep_level TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        // Add refresh_token column if it doesn't exist
        db.get("PRAGMA table_info(users)", (err, columns) => {
            if (err) return console.error(err);
            const hasRefreshToken = columns.some(col => col.name === 'refresh_token');
            if (!hasRefreshToken) {
                db.run("ALTER TABLE users ADD COLUMN refresh_token TEXT");
            }
        });

        // Subjects table
        db.run(`CREATE TABLE IF NOT EXISTS subjects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            progress REAL DEFAULT 0,
            last_studied TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )`);

        // Study sessions table
        db.run(`CREATE TABLE IF NOT EXISTS study_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            start_time TIMESTAMP NOT NULL,
            end_time TIMESTAMP,
            subject_id INTEGER,
            pomodoro_count INTEGER DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (subject_id) REFERENCES subjects(id)
        )`);

        // Error log table
        db.run(`CREATE TABLE IF NOT EXISTS error_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            question_id TEXT NOT NULL,
            subject_id INTEGER NOT NULL,
            error_type TEXT NOT NULL,
            priority TEXT NOT NULL CHECK(priority IN ('urgent', 'important', 'normal', 'low')),
            notes TEXT,
            resolved BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (subject_id) REFERENCES subjects(id)
        )`);

        // Time blocks table
        db.run(`CREATE TABLE IF NOT EXISTS time_blocks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            day TEXT NOT NULL CHECK(day IN ('sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday')),
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            activity TEXT NOT NULL,
            is_locked BOOLEAN DEFAULT FALSE,
            supervisor_pin TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )`);

        // Subjects table
        db.run(`CREATE TABLE IF NOT EXISTS subjects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            target_hours INTEGER NOT NULL,
            completed_hours INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )`);

        // Subject resources table
        db.run(`CREATE TABLE IF NOT EXISTS subject_resources (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subject_id INTEGER NOT NULL,
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            url TEXT,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (subject_id) REFERENCES subjects(id)
        )`);

        // Pre-populate with GATE ECE subjects
        db.get("SELECT COUNT(*) as count FROM subjects", (err, row) => {
            if (err) return console.error(err);
            if (row.count === 0) {
                const subjects = [
                    'Engineering Mathematics',
                    'Signals and Systems',
                    'Digital Electronics',
                    'Electronic Devices and Circuits',
                    'Analog Circuits',
                    'Control Systems',
                    'Communications',
                    'Electromagnetics',
                    'Networks',
                    'Microprocessors'
                ];
                
                const stmt = db.prepare("INSERT INTO subjects (name) VALUES (?)");
                subjects.forEach(subject => stmt.run(subject));
                stmt.finalize();
            }
        });
    });
}

module.exports = { db };