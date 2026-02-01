#!/usr/bin/env tsx

/**
 * Script 05: Categorize All Incidents
 *
 * This script categorizes all crime incidents in the database based on
 * their geographic location relative to the Prestonwood boundaries.
 *
 * Usage: npm run script:categorize-all
 */

import { logger } from '../config/logger';
import { geoCategorizer } from '../services/GeographicCategorizer';
import db from '../config/database';

const BATCH_SIZE = 10000; // Process 10k records at a time

async function categorizeAll(): Promise<void> {
  try {
    logger.info('Starting batch categorization...');

    // Initialize the categorizer
    await geoCategorizer.initialize();

    // Get boundary stats
    const boundaryStats = geoCategorizer.getBoundaryStats();
    if (boundaryStats) {
      console.log('\n=== Boundary Information ===');
      console.log(`District: ${boundaryStats.district.name}`);
      console.log(`  Area: ${(boundaryStats.district.area / 1000000).toFixed(2)} km²`);
      console.log(`Buffer: ${boundaryStats.buffer.name}`);
      console.log(`  Area: ${(boundaryStats.buffer.area / 1000000).toFixed(2)} km²`);
      console.log('============================\n');
    }

    // Get total count
    const totalResult = db
      .prepare('SELECT COUNT(*) as count FROM crime_incidents')
      .get() as { count: number };

    const total = totalResult.count;

    if (total === 0) {
      logger.info('No incidents in database. Run script:fetch-incidents first.');
      process.exit(0);
    }

    logger.info(`Total incidents to categorize: ${total.toLocaleString()}`);

    // Process in batches
    let offset = 0;
    let categorized = 0;
    const startTime = Date.now();

    const categoryCount = {
      inside: 0,
      bordering: 0,
      outside: 0,
      missing_coords: 0,
    };

    while (offset < total) {
      const batchStartTime = Date.now();

      // Fetch batch
      const incidents = db
        .prepare(
          `SELECT id, latitude, longitude
           FROM crime_incidents
           LIMIT ? OFFSET ?`
        )
        .all(BATCH_SIZE, offset) as Array<{
        id: number;
        latitude: number | null;
        longitude: number | null;
      }>;

      // Categorize batch
      const results = geoCategorizer.categorizeBatch(incidents);

      // Update database
      const updateStmt = db.prepare(`
        UPDATE crime_incidents
        SET geo_category = ?,
            categorized_at = datetime('now')
        WHERE id = ?
      `);

      const updateMany = db.transaction((results: Map<number, string>) => {
        for (const [id, category] of results) {
          updateStmt.run(category, id);

          // Count categories
          if (category === 'inside') categoryCount.inside++;
          else if (category === 'bordering') categoryCount.bordering++;
          else categoryCount.outside++;
        }
      });

      updateMany(results);

      categorized += incidents.length;
      offset += BATCH_SIZE;

      const batchTime = Date.now() - batchStartTime;
      const recordsPerSec = (incidents.length / batchTime) * 1000;
      const progress = (categorized / total) * 100;

      logger.info(
        `Progress: ${categorized.toLocaleString()}/${total.toLocaleString()} (${progress.toFixed(1)}%) - ${recordsPerSec.toFixed(0)} records/sec`
      );
    }

    const totalTime = Date.now() - startTime;
    const avgRecordsPerSec = (total / totalTime) * 1000;

    console.log('\n=== Categorization Complete ===');
    console.log(`Total incidents: ${total.toLocaleString()}`);
    console.log(`Time taken: ${(totalTime / 1000).toFixed(1)} seconds`);
    console.log(`Average speed: ${avgRecordsPerSec.toFixed(0)} records/second`);
    console.log('\n=== Category Distribution ===');
    console.log(
      `Inside District: ${categoryCount.inside.toLocaleString()} (${((categoryCount.inside / total) * 100).toFixed(2)}%)`
    );
    console.log(
      `Bordering District: ${categoryCount.bordering.toLocaleString()} (${((categoryCount.bordering / total) * 100).toFixed(2)}%)`
    );
    console.log(
      `Outside District: ${categoryCount.outside.toLocaleString()} (${((categoryCount.outside / total) * 100).toFixed(2)}%)`
    );
    console.log('==============================\n');

    // Validation checks
    console.log('=== Validation Checks ===');

    if (categoryCount.inside > total * 0.1) {
      logger.warn('⚠️  WARNING: Inside district > 10% - possible boundary error');
    } else {
      logger.info('✓ Inside district percentage looks reasonable');
    }

    if (categoryCount.inside === 0) {
      logger.warn('⚠️  WARNING: No incidents inside district - check boundaries');
    }

    // Check for missing coordinates
    const missingCoords = db
      .prepare('SELECT COUNT(*) as count FROM crime_incidents WHERE latitude IS NULL')
      .get() as { count: number };

    console.log(`Missing coordinates: ${missingCoords.count.toLocaleString()} (${((missingCoords.count / total) * 100).toFixed(2)}%)`);

    if (missingCoords.count / total > 0.2) {
      logger.warn('⚠️  WARNING: > 20% missing coordinates - data quality issue');
    }

    console.log('=========================\n');

    logger.info('✓ Categorization complete!');
    logger.info('💡 Next step: Run "npm run script:validate" to generate validation reports');

    process.exit(0);
  } catch (error) {
    logger.error('Failed to categorize incidents:', error);
    process.exit(1);
  }
}

// Run the script
categorizeAll();
