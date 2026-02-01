#!/usr/bin/env tsx

/**
 * Script 04B: Fetch Crime Incidents by Year (Optimized)
 *
 * This script fetches crime incident data year-by-year to avoid Socrata's slow OFFSET performance.
 * Much faster than offset-based pagination for large datasets.
 *
 * Usage: npm run script:fetch-by-year
 */

import axios from 'axios';
import { logger } from '../config/logger';
import db from '../config/database';
import * as dotenv from 'dotenv';

dotenv.config();

const API_BASE = 'https://www.dallasopendata.com/resource/qv6i-rri7.json';
const APP_TOKEN = process.env.SOCRATA_APP_TOKEN;
const BATCH_SIZE = 50000;
const RATE_LIMIT_DELAY = 1800;

async function fetchByYear() {
  try {
    console.log('='.repeat(70));
    console.log('YEAR-BY-YEAR FETCH STRATEGY');
    console.log('='.repeat(70));
    console.log('This approach avoids slow OFFSET queries by fetching year-by-year\n');

    // Fetch from 1967 (earliest record) to 2026 (current year)
    const startYear = 1967;
    const endYear = 2026;
    let grandTotal = 0;

    const fetchId = startFetchTracking();

    for (let year = startYear; year <= endYear; year++) {
      console.log(`\n${'='.repeat(70)}`);
      console.log(`Processing Year: ${year}`);
      console.log('='.repeat(70));

      const yearStart = `${year}-01-01`;
      const yearEnd = `${year}-12-31`;

      let offset = 0;
      let yearTotal = 0;
      let hasMore = true;

      while (hasMore) {
        logger.info(`Fetching ${year} records ${offset} to ${offset + BATCH_SIZE}...`);

        try {
          const params: any = {
            $limit: BATCH_SIZE,
            $offset: offset,
            $where: `date1 >= '${yearStart}' AND date1 <= '${yearEnd}'`,
            $order: 'date1 ASC',
          };

          const headers: any = {};
          if (APP_TOKEN) {
            headers['X-App-Token'] = APP_TOKEN;
          }

          const response = await axios.get(API_BASE, {
            params,
            headers,
            timeout: 120000, // 2 minute timeout
          });

          const records = response.data;

          if (records.length === 0) {
            hasMore = false;
            logger.info(`✓ No more records for ${year}`);
          } else {
            // Transform and save
            const validatedRecords = records.map((raw: any) => transformRecord(raw));
            await saveRecordsBatch(validatedRecords);

            yearTotal += records.length;
            offset += BATCH_SIZE;

            logger.info(`✓ Year ${year}: Fetched ${yearTotal} records so far`);

            // If we got less than batch size, we're done with this year
            if (records.length < BATCH_SIZE) {
              hasMore = false;
            }

            // Rate limiting
            if (hasMore) {
              logger.info(`Rate limiting: waiting ${RATE_LIMIT_DELAY}ms...`);
              await sleep(RATE_LIMIT_DELAY);
            }
          }
        } catch (error: any) {
          if (error.code === 'ECONNABORTED') {
            logger.error(`Timeout for year ${year}, offset ${offset}. Retrying...`);
            await sleep(5000);
            continue; // Retry same batch
          }
          throw error;
        }
      }

      grandTotal += yearTotal;
      console.log(`✓ Year ${year} complete: ${yearTotal.toLocaleString()} records`);
      console.log(`  Grand total so far: ${grandTotal.toLocaleString()} records\n`);
    }

    completeFetchTracking(fetchId, grandTotal);

    // Final summary
    console.log('\n' + '='.repeat(70));
    console.log('FETCH COMPLETE!');
    console.log('='.repeat(70));
    console.log(`Total new records fetched: ${grandTotal.toLocaleString()}`);

    // Get overall stats
    const totalInDB = db.prepare('SELECT COUNT(*) as count FROM crime_incidents').get() as { count: number };
    const withCoords = db.prepare('SELECT COUNT(*) as count FROM crime_incidents WHERE latitude IS NOT NULL').get() as { count: number };

    console.log(`\nDatabase Status:`);
    console.log(`  Total records: ${totalInDB.count.toLocaleString()}`);
    console.log(`  With coordinates: ${withCoords.count.toLocaleString()} (${((withCoords.count / totalInDB.count) * 100).toFixed(1)}%)`);
    console.log('='.repeat(70));

    process.exit(0);
  } catch (error) {
    logger.error('Year-by-year fetch failed:', error);
    console.error('\n⚠️  FETCH FAILED - See logs for details\n');
    process.exit(1);
  }
}

function transformRecord(raw: any): any {
  // Extract coordinates
  const lat = raw.geocoded_column?.latitude
    ? parseFloat(raw.geocoded_column.latitude)
    : null;
  const lng = raw.geocoded_column?.longitude
    ? parseFloat(raw.geocoded_column.longitude)
    : null;

  // Validate coordinates are within Dallas area
  const validLat = lat && lat >= 32.5 && lat <= 33.2;
  const validLng = lng && lng >= -97.0 && lng <= -96.5;

  // Use incident_number or incidentnum
  const incidentNumber = raw.incident_number || raw.incidentnum || 'UNKNOWN';

  return {
    incident_number: incidentNumber,
    incident_address: raw.incident_address || null,
    latitude: validLat ? lat : null,
    longitude: validLng ? lng : null,
    nibrs_crime: raw.nibrs_crime || null,
    date1: raw.date1 || raw.date1_of_occurrence || null,
    raw_data: JSON.stringify(raw),
  };
}

async function saveRecordsBatch(records: any[]): Promise<void> {
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
}

function startFetchTracking(): number {
  const stmt = db.prepare(`
    INSERT INTO fetch_metadata (fetch_date, status)
    VALUES (datetime('now'), 'in_progress')
  `);

  const result = stmt.run();
  return result.lastInsertRowid as number;
}

function completeFetchTracking(fetchId: number, recordsFetched: number): void {
  const maxDateResult = db
    .prepare('SELECT MAX(date1) as max_date FROM crime_incidents')
    .get() as { max_date: string | null };

  const stmt = db.prepare(`
    UPDATE fetch_metadata
    SET status = 'completed',
        records_fetched = ?,
        max_date_fetched = ?
    WHERE id = ?
  `);

  stmt.run(recordsFetched, maxDateResult.max_date, fetchId);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Run the script
fetchByYear();
