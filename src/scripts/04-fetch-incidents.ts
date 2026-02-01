#!/usr/bin/env tsx

/**
 * Script 04: Fetch Crime Incidents
 *
 * This script fetches crime incident data from the Dallas Police Department API.
 * It can fetch all historical data or just test with a small sample.
 *
 * Usage:
 *   npm run script:fetch-incidents           # Fetch all historical data
 *   npm run script:fetch-incidents -- --limit 1000   # Test with 1000 records
 */

import { logger } from '../config/logger';
import { dataFetcher } from '../services/DataFetcher';
import db from '../config/database';

async function fetchIncidents(): Promise<void> {
  try {
    // Check for --limit argument
    const args = process.argv.slice(2);
    const limitIndex = args.indexOf('--limit');
    const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1]) : null;

    if (limit) {
      logger.info(`Running in TEST MODE - fetching only ${limit} records`);
      await fetchTestSample(limit);
    } else {
      logger.info('Running in FULL MODE - fetching ALL historical data');
      logger.info('⚠️  This will take 2-4 hours for ~1.4M records');
      logger.info('   Press Ctrl+C to cancel\n');

      // Give user 5 seconds to cancel
      await sleep(5000);

      await fetchFullHistorical();
    }

    // Display stats
    const stats = dataFetcher.getStats();
    console.log('\n=== Database Statistics ===');
    console.log(`Total records: ${stats.totalRecords.toLocaleString()}`);
    console.log(`With coordinates: ${stats.withCoordinates.toLocaleString()} (${((stats.withCoordinates / stats.totalRecords) * 100).toFixed(1)}%)`);
    console.log(`Missing coordinates: ${stats.missingCoordinates.toLocaleString()} (${((stats.missingCoordinates / stats.totalRecords) * 100).toFixed(1)}%)`);
    console.log(`Categorized: ${stats.categorized.toLocaleString()}`);
    console.log(`Uncategorized: ${stats.uncategorized.toLocaleString()}`);
    console.log('===========================\n');

    if (stats.uncategorized > 0) {
      logger.info('⚠️  Run "npm run script:categorize-all" to categorize the incidents');
    }

    process.exit(0);
  } catch (error) {
    logger.error('Failed to fetch incidents:', error);
    process.exit(1);
  }
}

/**
 * Fetch a test sample of records
 */
async function fetchTestSample(limit: number): Promise<void> {
  logger.info(`Fetching test sample of ${limit} records...`);

  // Temporarily modify batch size for testing
  const originalFetch = dataFetcher.fetchAllHistoricalData;

  // Simple approach: fetch one batch with custom limit
  const API_BASE = 'https://www.dallasopendata.com/resource/qv6i-rri7.json';

  const axios = require('axios');
  const params: any = {
    $limit: limit,
    $offset: 0,
    $order: 'date1 DESC', // Get most recent for testing
  };

  const headers: any = {};
  if (process.env.SOCRATA_APP_TOKEN) {
    headers['X-App-Token'] = process.env.SOCRATA_APP_TOKEN;
  }

  logger.info(`Fetching from API...`);
  const response = await axios.get(API_BASE, { params, headers, timeout: 60000 });

  logger.info(`✓ Received ${response.data.length} records`);

  // Use DataFetcher's internal methods via a single batch insert
  // We'll need to validate and save them
  const records = response.data.map((raw: any) => ({
    incident_number: raw.incident_number || raw.incidentnum || 'UNKNOWN',
    incident_address: raw.incident_address || null,
    latitude: raw.geocoded_column?.latitude ? parseFloat(raw.geocoded_column.latitude) : null,
    longitude: raw.geocoded_column?.longitude ? parseFloat(raw.geocoded_column.longitude) : null,
    nibrs_crime: raw.nibrs_crime || null,
    date1: raw.date1 || raw.date1_of_occurrence || null,
    raw_data: JSON.stringify(raw),
  }));

  // Insert records
  const stmt = db.prepare(`
    INSERT INTO crime_incidents
      (incident_number, incident_address, latitude, longitude, nibrs_crime, date1, raw_data)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(incident_number) DO UPDATE SET
      incident_address = excluded.incident_address,
      latitude = excluded.latitude,
      longitude = excluded.longitude,
      nibrs_crime = excluded.nibrs_crime,
      date1 = excluded.date1,
      raw_data = excluded.raw_data,
      fetched_at = CURRENT_TIMESTAMP
  `);

  const insertMany = db.transaction((records: any[]) => {
    for (const record of records) {
      stmt.run(
        record.incident_number,
        record.incident_address,
        record.latitude,
        record.longitude,
        record.nibrs_crime,
        record.date1,
        record.raw_data
      );
    }
  });

  insertMany(records);

  logger.info(`✓ Saved ${records.length} test records to database`);
}

/**
 * Fetch all historical data
 */
async function fetchFullHistorical(): Promise<void> {
  let lastProgress = 0;

  const totalRecords = await dataFetcher.fetchAllHistoricalData((fetched, total) => {
    // Log progress every 50k records
    if (fetched - lastProgress >= 50000) {
      logger.info(`Progress: ${fetched.toLocaleString()} records fetched`);
      lastProgress = fetched;
    }
  });

  logger.info(`✓ Completed! Total records fetched: ${totalRecords.toLocaleString()}`);
}

/**
 * Utility: Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Run the script
fetchIncidents();
