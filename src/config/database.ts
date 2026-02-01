import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

const DB_PATH = process.env.DATABASE_URL || 'database/crime_analysis.db';
const DB_DIR = path.dirname(DB_PATH);

// Ensure database directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Create database connection
// Note: Verbose logging disabled for production use
export const db = new Database(DB_PATH);

// Enable Write-Ahead Logging for better performance
db.pragma('journal_mode = WAL');

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Load SpatiaLite extension (if available)
// Note: SpatiaLite is optional - system works without it
try {
  // Attempt to load SpatiaLite
  // The exact path varies by system: mod_spatialite, libspatialite
  const possiblePaths = [
    'mod_spatialite',
    '/usr/lib/x86_64-linux-gnu/mod_spatialite.so',
    '/usr/local/lib/mod_spatialite.so',
    'libspatialite',
  ];

  let loaded = false;
  for (const spatialitePath of possiblePaths) {
    try {
      db.loadExtension(spatialitePath);
      console.log(`✓ SpatiaLite extension loaded from: ${spatialitePath}`);
      loaded = true;
      break;
    } catch (err) {
      // Continue to next path
    }
  }

  if (!loaded) {
    console.log('⚠ SpatiaLite extension not found - continuing without spatial functions');
    console.log('  System will work but without advanced spatial query capabilities');
  }
} catch (error) {
  console.log('⚠ Could not load SpatiaLite extension - continuing without it');
}

// Initialize database schema
export function initializeSchema(): void {
  const schemaPath = path.join(__dirname, '../../database/schema.sql');

  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema file not found at: ${schemaPath}`);
  }

  const schema = fs.readFileSync(schemaPath, 'utf-8');

  // Execute the entire schema at once - SQLite handles multiple statements
  try {
    db.exec(schema);
    console.log('✓ Database schema initialized successfully');
  } catch (error) {
    console.error('Error executing schema:', error);
    throw error;
  }
}

// Utility function to check if database is initialized
export function isDatabaseInitialized(): boolean {
  try {
    const result = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='crime_incidents'"
      )
      .get();
    return !!result;
  } catch (error) {
    return false;
  }
}

// Close database connection
export function closeDatabase(): void {
  db.close();
  console.log('✓ Database connection closed');
}

// Export default connection
export default db;
