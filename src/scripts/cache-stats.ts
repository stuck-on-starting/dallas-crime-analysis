/**
 * Cache Statistics Script
 * Pre-calculates and caches statistics for instant API responses
 * Run this after data refresh or on a schedule
 */

import db from '../config/database';
import { logger } from '../config/logger';

interface CachedStats {
  totalRecords: number;
  categoryDistribution: {
    inside: number;
    bordering: number;
    outside: number;
  };
  dateRange: {
    earliest: string;
    latest: string;
  };
  nibrsCategories: number;
  calculatedAt: string;
}

// Create cached_stats table if it doesn't exist
function ensureTable(): void {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS cached_stats (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      stats_json TEXT NOT NULL,
      calculated_at TEXT NOT NULL
    )
  `).run();

  logger.info('Cached stats table ensured');
}

// Calculate all statistics
function calculateStats(): CachedStats {
  logger.info('Calculating statistics...');
  const startTime = Date.now();

  // Total records
  const totalResult = db
    .prepare('SELECT COUNT(*) as count FROM crime_incidents')
    .get() as { count: number };
  logger.info(`  Total records: ${totalResult.count.toLocaleString()}`);

  // Category distribution
  const categoryResults = db
    .prepare(
      `SELECT geo_category, COUNT(*) as count
       FROM crime_incidents
       WHERE geo_category IS NOT NULL
       GROUP BY geo_category`
    )
    .all() as Array<{ geo_category: string; count: number }>;

  const categoryDist = {
    inside: 0,
    bordering: 0,
    outside: 0,
  };

  categoryResults.forEach((row) => {
    if (row.geo_category in categoryDist) {
      categoryDist[row.geo_category as keyof typeof categoryDist] = row.count;
    }
  });
  logger.info(`  Category distribution calculated`);

  // Date range
  const dateRange = db
    .prepare(
      `SELECT MIN(edate) as earliest, MAX(edate) as latest
       FROM crime_incidents
       WHERE edate IS NOT NULL`
    )
    .get() as { earliest: string; latest: string };
  logger.info(`  Date range: ${dateRange.earliest} to ${dateRange.latest}`);

  // NIBRS categories count
  const nibrsCount = db
    .prepare(
      `SELECT COUNT(DISTINCT nibrs_crime) as count
       FROM crime_incidents
       WHERE nibrs_crime IS NOT NULL`
    )
    .get() as { count: number };
  logger.info(`  NIBRS categories: ${nibrsCount.count}`);

  const calculatedAt = new Date().toISOString();
  const duration = Date.now() - startTime;
  logger.info(`Statistics calculated in ${duration}ms`);

  return {
    totalRecords: totalResult.count,
    categoryDistribution: categoryDist,
    dateRange: {
      earliest: dateRange.earliest,
      latest: dateRange.latest,
    },
    nibrsCategories: nibrsCount.count,
    calculatedAt,
  };
}

// Save stats to cache
function saveStats(stats: CachedStats): void {
  const statsJson = JSON.stringify(stats);

  db.prepare(`
    INSERT INTO cached_stats (id, stats_json, calculated_at)
    VALUES (1, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      stats_json = excluded.stats_json,
      calculated_at = excluded.calculated_at
  `).run(statsJson, stats.calculatedAt);

  logger.info('Statistics cached successfully');
}

// Get cached stats
export function getCachedStats(): CachedStats | null {
  try {
    const row = db
      .prepare('SELECT stats_json FROM cached_stats WHERE id = 1')
      .get() as { stats_json: string } | undefined;

    if (row) {
      return JSON.parse(row.stats_json);
    }
    return null;
  } catch (error) {
    logger.error('Error reading cached stats:', error);
    return null;
  }
}

// Main function to refresh cache
export function refreshStatsCache(): CachedStats {
  ensureTable();
  const stats = calculateStats();
  saveStats(stats);
  return stats;
}

// Run if called directly
if (require.main === module) {
  logger.info('=== Refreshing Statistics Cache ===');
  try {
    const stats = refreshStatsCache();
    console.log('\nCached Statistics:');
    console.log(JSON.stringify(stats, null, 2));
    logger.info('=== Cache refresh complete ===');
  } catch (error) {
    logger.error('Failed to refresh cache:', error);
    process.exit(1);
  }
}
