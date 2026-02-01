import db from '../config/database';
import { logger } from '../config/logger';
import * as fs from 'fs';
import * as path from 'path';

export interface ValidationSample {
  incident_id: number;
  incident_number: string;
  incident_address: string | null;
  latitude: number | null;
  longitude: number | null;
  geo_category: string;
  nibrs_crime: string | null;
  edate: string | null;
  google_maps_link: string;
}

export class SampleGenerator {
  /**
   * Generate stratified random sample for manual validation
   */
  generateSample(samplesPerCategory: number = 33): ValidationSample[] {
    logger.info(`Generating validation sample (${samplesPerCategory} per category)...`);

    const samples: ValidationSample[] = [];

    // Get samples from each category
    ['inside', 'bordering', 'outside'].forEach((category) => {
      const categorySamples = this.getSamplesForCategory(category, samplesPerCategory);
      samples.push(...categorySamples);
    });

    logger.info(`✓ Generated ${samples.length} validation samples`);
    return samples;
  }

  /**
   * Get random samples for a specific category
   */
  private getSamplesForCategory(category: string, count: number): ValidationSample[] {
    const records = db
      .prepare(
        `SELECT
          id as incident_id,
          incident_number,
          incident_address,
          latitude,
          longitude,
          geo_category,
          nibrs_crime,
          edate
        FROM crime_incidents
        WHERE geo_category = ?
          AND latitude IS NOT NULL
          AND longitude IS NOT NULL
        ORDER BY RANDOM()
        LIMIT ?`
      )
      .all(category, count) as Array<{
      incident_id: number;
      incident_number: string;
      incident_address: string | null;
      latitude: number;
      longitude: number;
      geo_category: string;
      nibrs_crime: string | null;
      edate: string | null;
    }>;

    return records.map((record) => ({
      ...record,
      google_maps_link: `https://www.google.com/maps?q=${record.latitude},${record.longitude}`,
    }));
  }

  /**
   * Export samples to CSV file
   */
  exportToCSV(samples: ValidationSample[], outputPath: string): void {
    logger.info(`Exporting samples to CSV: ${outputPath}`);

    // Create CSV header
    const header = [
      'Incident ID',
      'Incident Number',
      'Address',
      'Category',
      'NIBRS Crime',
      'Date',
      'Latitude',
      'Longitude',
      'Google Maps Link',
      'Validation Status',
      'Notes',
    ].join(',');

    // Create CSV rows
    const rows = samples.map((sample) => {
      const row = [
        sample.incident_id,
        sample.incident_number,
        `"${(sample.incident_address || '').replace(/"/g, '""')}"`,
        sample.geo_category,
        `"${(sample.nibrs_crime || '').replace(/"/g, '""')}"`,
        sample.edate || '',
        sample.latitude || '',
        sample.longitude || '',
        sample.google_maps_link,
        '', // Empty validation status for user to fill
        '', // Empty notes for user to fill
      ];
      return row.join(',');
    });

    const csv = [header, ...rows].join('\n');

    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, csv, 'utf-8');
    logger.info(`✓ Exported ${samples.length} samples to CSV`);
  }

  /**
   * Export samples as GeoJSON for visual inspection
   */
  exportToGeoJSON(samples: ValidationSample[], outputPath: string): void {
    logger.info(`Exporting samples to GeoJSON: ${outputPath}`);

    const features = samples
      .filter((s) => s.latitude && s.longitude)
      .map((sample) => ({
        type: 'Feature',
        properties: {
          incident_id: sample.incident_id,
          incident_number: sample.incident_number,
          address: sample.incident_address,
          category: sample.geo_category,
          nibrs_crime: sample.nibrs_crime,
          date: sample.edate,
        },
        geometry: {
          type: 'Point',
          coordinates: [sample.longitude, sample.latitude],
        },
      }));

    const geojson = {
      type: 'FeatureCollection',
      features,
    };

    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(geojson, null, 2), 'utf-8');
    logger.info(`✓ Exported ${features.length} samples to GeoJSON`);
  }
}

export const sampleGenerator = new SampleGenerator();
