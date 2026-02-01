import db from '../config/database';
import { logger } from '../config/logger';

/**
 * Migration script to fix date field usage
 * Changes from date1 (occurrence date) to edate (incident created date)
 */

async function migrateDates() {
  try {
    logger.info('Starting date migration...');

    // Step 1: Add new columns
    logger.info('Adding edate and eyear columns...');
    db.exec(`
      ALTER TABLE crime_incidents ADD COLUMN edate TEXT;
    `);
    db.exec(`
      ALTER TABLE crime_incidents ADD COLUMN eyear TEXT;
    `);

    // Step 2: Populate from raw_data
    logger.info('Extracting edate and eyear from raw_data...');

    const records = db.prepare('SELECT id, raw_data FROM crime_incidents').all() as Array<{
      id: number;
      raw_data: string;
    }>;

    logger.info(`Processing ${records.length} records...`);

    const updateStmt = db.prepare(`
      UPDATE crime_incidents
      SET edate = ?, eyear = ?
      WHERE id = ?
    `);

    const updateMany = db.transaction((records: any[]) => {
      for (const record of records) {
        try {
          const data = JSON.parse(record.raw_data);
          updateStmt.run(data.edate || null, data.eyear || null, record.id);
        } catch (error) {
          logger.error(`Failed to parse record ${record.id}:`, error);
        }
      }
    });

    updateMany(records);

    logger.info('Data migration complete!');

    // Step 3: Create indexes on new columns
    logger.info('Creating indexes...');
    db.exec(`CREATE INDEX IF NOT EXISTS idx_crime_edate ON crime_incidents(edate);`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_crime_eyear ON crime_incidents(eyear);`);

    // Step 4: Verify data
    logger.info('Verifying migration...');
    const stats = db.prepare(`
      SELECT
        COUNT(*) as total,
        COUNT(edate) as with_edate,
        COUNT(eyear) as with_eyear,
        MIN(edate) as earliest,
        MAX(edate) as latest
      FROM crime_incidents
    `).get() as any;

    logger.info('Migration statistics:', stats);

    // Check if we have pre-2014 dates
    const pre2014 = db.prepare(`
      SELECT COUNT(*) as count
      FROM crime_incidents
      WHERE eyear < '2014'
    `).get() as any;

    logger.info(`Records before 2014: ${pre2014.count}`);

    logger.info('✅ Date migration completed successfully!');
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  }
}

migrateDates()
  .then(() => {
    logger.info('Migration script finished');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Migration script failed:', error);
    process.exit(1);
  });
