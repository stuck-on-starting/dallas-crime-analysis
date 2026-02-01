import axios, { AxiosError } from 'axios';
import { logger } from '../config/logger';
import db from '../config/database';
import {
  DallasPoliceIncidentRaw,
  ValidatedIncident,
  CrimeIncident,
} from '../models/CrimeIncident';
import * as dotenv from 'dotenv';

dotenv.config();

export class DataFetcher {
  private readonly API_BASE = 'https://www.dallasopendata.com/resource/qv6i-rri7.json';
  private readonly BATCH_SIZE = 50000; // Recommended by Socrata
  private readonly RATE_LIMIT_DELAY = 1800; // 1.8 seconds between requests
  private readonly APP_TOKEN = process.env.SOCRATA_APP_TOKEN;

  /**
   * Fetch all historical crime data
   */
  async fetchAllHistoricalData(
    progressCallback?: (fetched: number, total: number) => void
  ): Promise<number> {
    logger.info('Starting historical data fetch...');
    logger.info(`API: ${this.API_BASE}`);
    logger.info(`Batch size: ${this.BATCH_SIZE}`);
    logger.info(`App token: ${this.APP_TOKEN ? 'Configured' : 'Not configured (may hit rate limits)'}`);

    let offset = 0;
    let totalFetched = 0;
    let hasMore = true;

    // Track fetch in database
    const fetchId = this.startFetchTracking();

    try {
      while (hasMore) {
        logger.info(`Fetching records ${offset} to ${offset + this.BATCH_SIZE}...`);

        const records = await this.fetchBatch(offset);

        if (records.length === 0) {
          hasMore = false;
          logger.info('No more records to fetch');
        } else {
          // Validate and save records
          const validatedRecords = records.map((r) => this.validateAndTransform(r));
          await this.saveRecordsBatch(validatedRecords);

          totalFetched += records.length;
          offset += this.BATCH_SIZE;

          logger.info(`✓ Fetched and saved ${totalFetched} records so far`);

          if (progressCallback) {
            progressCallback(totalFetched, totalFetched); // We don't know total upfront
          }

          // Rate limiting
          if (hasMore && records.length === this.BATCH_SIZE) {
            logger.info(`Rate limiting: waiting ${this.RATE_LIMIT_DELAY}ms...`);
            await this.sleep(this.RATE_LIMIT_DELAY);
          }
        }
      }

      // Mark fetch as complete
      this.completeFetchTracking(fetchId, totalFetched);

      logger.info(`✓ Historical data fetch complete! Total records: ${totalFetched}`);
      return totalFetched;
    } catch (error) {
      this.failFetchTracking(fetchId, error);
      throw error;
    }
  }

  /**
   * Fetch incremental updates (new records since last fetch)
   */
  async fetchIncrementalUpdates(): Promise<number> {
    logger.info('Starting incremental update...');

    const lastFetch = this.getLastSuccessfulFetch();
    const lastDate = lastFetch?.max_date_fetched || '2014-01-01';

    logger.info(`Fetching records with date1 > '${lastDate}'`);

    const fetchId = this.startFetchTracking();

    try {
      let offset = 0;
      let totalFetched = 0;
      let hasMore = true;

      while (hasMore) {
        const records = await this.fetchBatch(offset, lastDate);

        if (records.length === 0) {
          hasMore = false;
        } else {
          const validatedRecords = records.map((r) => this.validateAndTransform(r));
          await this.saveRecordsBatch(validatedRecords);

          totalFetched += records.length;
          offset += this.BATCH_SIZE;

          logger.info(`✓ Fetched ${totalFetched} new records`);

          if (hasMore && records.length === this.BATCH_SIZE) {
            await this.sleep(this.RATE_LIMIT_DELAY);
          }
        }
      }

      this.completeFetchTracking(fetchId, totalFetched);

      logger.info(`✓ Incremental update complete! New records: ${totalFetched}`);
      return totalFetched;
    } catch (error) {
      this.failFetchTracking(fetchId, error);
      throw error;
    }
  }

  /**
   * Fetch a single batch of records
   */
  private async fetchBatch(offset: number, afterDate?: string): Promise<DallasPoliceIncidentRaw[]> {
    try {
      const params: any = {
        $limit: this.BATCH_SIZE,
        $offset: offset,
        $order: 'date1 ASC',
      };

      if (afterDate) {
        params.$where = `date1 > '${afterDate}'`;
      }

      const headers: any = {};
      if (this.APP_TOKEN) {
        headers['X-App-Token'] = this.APP_TOKEN;
      }

      const response = await axios.get<DallasPoliceIncidentRaw[]>(this.API_BASE, {
        params,
        headers,
        timeout: 180000, // 180 second (3 minute) timeout - Socrata is slow with large offsets
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error('API request failed:', {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
        });
      }
      throw error;
    }
  }

  /**
   * Validate and transform raw API data
   */
  private validateAndTransform(raw: DallasPoliceIncidentRaw): ValidatedIncident {
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
      raw_data: raw,
    };
  }

  /**
   * Save a batch of records to the database
   */
  private async saveRecordsBatch(records: ValidatedIncident[]): Promise<void> {
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

    // Use transaction for better performance
    const insertMany = db.transaction((records: ValidatedIncident[]) => {
      for (const record of records) {
        stmt.run(
          record.incident_number,
          record.incident_address,
          record.latitude,
          record.longitude,
          record.nibrs_crime,
          record.date1,
          JSON.stringify(record.raw_data)
        );
      }
    });

    insertMany(records);
  }

  /**
   * Start tracking a fetch operation
   */
  private startFetchTracking(): number {
    const stmt = db.prepare(`
      INSERT INTO fetch_metadata (fetch_date, status)
      VALUES (datetime('now'), 'in_progress')
    `);

    const result = stmt.run();
    return result.lastInsertRowid as number;
  }

  /**
   * Mark fetch as complete
   */
  private completeFetchTracking(fetchId: number, recordsFetched: number): void {
    // Get the max date from fetched records
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

  /**
   * Mark fetch as failed
   */
  private failFetchTracking(fetchId: number, error: any): void {
    const errorMessage = error instanceof Error ? error.message : String(error);

    const stmt = db.prepare(`
      UPDATE fetch_metadata
      SET status = 'failed',
          error_message = ?
      WHERE id = ?
    `);

    stmt.run(errorMessage, fetchId);
  }

  /**
   * Get the last successful fetch metadata
   */
  private getLastSuccessfulFetch(): { max_date_fetched: string } | null {
    const stmt = db.prepare(`
      SELECT max_date_fetched
      FROM fetch_metadata
      WHERE status = 'completed'
      ORDER BY fetch_date DESC
      LIMIT 1
    `);

    return stmt.get() as { max_date_fetched: string } | undefined || null;
  }

  /**
   * Utility: Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get database statistics
   */
  getStats(): {
    totalRecords: number;
    withCoordinates: number;
    missingCoordinates: number;
    categorized: number;
    uncategorized: number;
  } {
    const total = db
      .prepare('SELECT COUNT(*) as count FROM crime_incidents')
      .get() as { count: number };

    const withCoords = db
      .prepare('SELECT COUNT(*) as count FROM crime_incidents WHERE latitude IS NOT NULL')
      .get() as { count: number };

    const categorized = db
      .prepare('SELECT COUNT(*) as count FROM crime_incidents WHERE geo_category IS NOT NULL')
      .get() as { count: number };

    return {
      totalRecords: total.count,
      withCoordinates: withCoords.count,
      missingCoordinates: total.count - withCoords.count,
      categorized: categorized.count,
      uncategorized: total.count - categorized.count,
    };
  }
}

// Export singleton instance
export const dataFetcher = new DataFetcher();
