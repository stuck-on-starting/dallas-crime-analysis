#!/usr/bin/env tsx

/**
 * Incremental Update Script
 *
 * This script fetches new crime incidents since the last fetch and categorizes them.
 * Designed to be run daily via cron job.
 *
 * Usage: npm run update:incremental
 *
 * Cron setup (daily at 2 AM):
 * 0 2 * * * cd /path/to/dallas-crime-analysis && npm run update:incremental >> logs/update.log 2>&1
 */

import { logger } from '../config/logger';
import { dataFetcher } from '../services/DataFetcher';
import { geoCategorizer } from '../services/GeographicCategorizer';
import { refreshStatsCache } from './cache-stats';
import db from '../config/database';

async function runIncrementalUpdate(): Promise<void> {
  const startTime = Date.now();

  try {
    logger.info('='.repeat(60));
    logger.info('Starting incremental update...');
    logger.info(`Timestamp: ${new Date().toISOString()}`);
    logger.info('='.repeat(60));

    // Step 1: Fetch new records
    logger.info('\nStep 1: Fetching new records from Dallas PD API...');
    const newRecords = await dataFetcher.fetchIncrementalUpdates();

    if (newRecords === 0) {
      logger.info('✓ No new records to process');
      logger.info('='.repeat(60));
      process.exit(0);
    }

    logger.info(`✓ Fetched ${newRecords} new records`);

    // Step 2: Initialize categorizer
    logger.info('\nStep 2: Initializing geographic categorizer...');
    await geoCategorizer.initialize();
    logger.info('✓ Categorizer ready');

    // Step 3: Categorize new records
    logger.info('\nStep 3: Categorizing new records...');

    const uncategorized = db
      .prepare(
        `SELECT id, latitude, longitude
         FROM crime_incidents
         WHERE geo_category IS NULL
         AND latitude IS NOT NULL`
      )
      .all() as Array<{
      id: number;
      latitude: number;
      longitude: number;
    }>;

    if (uncategorized.length > 0) {
      logger.info(`Found ${uncategorized.length} records to categorize`);

      const results = geoCategorizer.categorizeBatch(uncategorized);

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
        }
      });

      updateMany(results);

      logger.info(`✓ Categorized ${uncategorized.length} records`);
    } else {
      logger.info('✓ All records already categorized');
    }

    // Step 4: Refresh statistics cache
    logger.info('\nStep 4: Refreshing statistics cache...');
    refreshStatsCache();
    logger.info('✓ Statistics cache refreshed');

    // Step 5: Generate update summary
    logger.info('\nStep 5: Generating summary...');

    const stats = dataFetcher.getStats();
    const categoryDist = db
      .prepare(
        `SELECT geo_category, COUNT(*) as count
         FROM crime_incidents
         WHERE geo_category IS NOT NULL
         GROUP BY geo_category`
      )
      .all() as Array<{ geo_category: string; count: number }>;

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('INCREMENTAL UPDATE SUMMARY');
    console.log('='.repeat(60));
    console.log(`New records fetched: ${newRecords}`);
    console.log(`Duration: ${duration} seconds`);
    console.log('\nCurrent Database Status:');
    console.log(`  Total records: ${stats.totalRecords.toLocaleString()}`);
    console.log(`  With coordinates: ${stats.withCoordinates.toLocaleString()}`);
    console.log(`  Categorized: ${stats.categorized.toLocaleString()}`);
    console.log('\nCategory Distribution:');
    categoryDist.forEach((row) => {
      console.log(`  ${row.geo_category}: ${row.count.toLocaleString()}`);
    });
    console.log('='.repeat(60));

    logger.info('✓ Incremental update complete!');
    process.exit(0);
  } catch (error) {
    logger.error('Incremental update failed:', error);
    logger.error('='.repeat(60));

    // Send notification (could be expanded to email/Slack)
    console.error('\n⚠️  INCREMENTAL UPDATE FAILED');
    console.error('Check logs for details\n');

    process.exit(1);
  }
}

// Run the update
runIncrementalUpdate();
