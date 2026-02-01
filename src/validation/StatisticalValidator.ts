import db from '../config/database';
import { logger } from '../config/logger';

export interface ValidationReport {
  timestamp: Date;
  totalRecords: number;
  recordsWithCoordinates: number;
  recordsWithoutCoordinates: number;
  categoryDistribution: {
    inside: { count: number; percentage: number };
    bordering: { count: number; percentage: number };
    outside: { count: number; percentage: number };
  };
  coordinateBounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
  duplicates: number;
  dateRange: {
    earliest: string | null;
    latest: string | null;
  };
  nibrsCategoryCount: number;
  validationFlags: string[];
}

export class StatisticalValidator {
  /**
   * Generate a comprehensive validation report
   */
  generateReport(): ValidationReport {
    logger.info('Generating statistical validation report...');

    const total = this.getTotalRecords();
    const withCoords = this.getRecordsWithCoordinates();
    const categoryDist = this.getCategoryDistribution(total);
    const bounds = this.getCoordinateBounds();
    const duplicates = this.findDuplicates();
    const dateRange = this.getDateRange();
    const nibrsCount = this.getNIBRSCategoryCount();

    const validationFlags = this.checkForIssues(
      total,
      withCoords,
      categoryDist,
      bounds
    );

    const report: ValidationReport = {
      timestamp: new Date(),
      totalRecords: total,
      recordsWithCoordinates: withCoords,
      recordsWithoutCoordinates: total - withCoords,
      categoryDistribution: categoryDist,
      coordinateBounds: bounds,
      duplicates,
      dateRange,
      nibrsCategoryCount: nibrsCount,
      validationFlags,
    };

    logger.info('✓ Validation report generated');
    return report;
  }

  private getTotalRecords(): number {
    const result = db
      .prepare('SELECT COUNT(*) as count FROM crime_incidents')
      .get() as { count: number };
    return result.count;
  }

  private getRecordsWithCoordinates(): number {
    const result = db
      .prepare('SELECT COUNT(*) as count FROM crime_incidents WHERE latitude IS NOT NULL')
      .get() as { count: number };
    return result.count;
  }

  private getCategoryDistribution(total: number): {
    inside: { count: number; percentage: number };
    bordering: { count: number; percentage: number };
    outside: { count: number; percentage: number };
  } {
    const results = db
      .prepare(
        `SELECT geo_category, COUNT(*) as count
         FROM crime_incidents
         WHERE geo_category IS NOT NULL
         GROUP BY geo_category`
      )
      .all() as Array<{ geo_category: string; count: number }>;

    const dist = {
      inside: { count: 0, percentage: 0 },
      bordering: { count: 0, percentage: 0 },
      outside: { count: 0, percentage: 0 },
    };

    results.forEach((row) => {
      const category = row.geo_category as 'inside' | 'bordering' | 'outside';
      dist[category].count = row.count;
      dist[category].percentage = (row.count / total) * 100;
    });

    return dist;
  }

  private getCoordinateBounds(): {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  } {
    const result = db
      .prepare(
        `SELECT
          MIN(latitude) as minLat,
          MAX(latitude) as maxLat,
          MIN(longitude) as minLng,
          MAX(longitude) as maxLng
        FROM crime_incidents
        WHERE latitude IS NOT NULL`
      )
      .get() as {
      minLat: number;
      maxLat: number;
      minLng: number;
      maxLng: number;
    };

    return result;
  }

  private findDuplicates(): number {
    const result = db
      .prepare(
        `SELECT COUNT(*) as count FROM (
          SELECT incident_number, COUNT(*) as cnt
          FROM crime_incidents
          GROUP BY incident_number
          HAVING cnt > 1
        )`
      )
      .get() as { count: number };

    return result.count;
  }

  private getDateRange(): { earliest: string | null; latest: string | null } {
    const result = db
      .prepare(
        `SELECT
          MIN(edate) as earliest,
          MAX(edate) as latest
        FROM crime_incidents
        WHERE edate IS NOT NULL`
      )
      .get() as { earliest: string | null; latest: string | null };

    return result;
  }

  private getNIBRSCategoryCount(): number {
    const result = db
      .prepare(
        `SELECT COUNT(DISTINCT nibrs_crime) as count
         FROM crime_incidents
         WHERE nibrs_crime IS NOT NULL`
      )
      .get() as { count: number };

    return result.count;
  }

  private checkForIssues(
    total: number,
    withCoords: number,
    categoryDist: any,
    bounds: any
  ): string[] {
    const flags: string[] = [];

    // Check missing coordinates
    const missingCoordsPct = ((total - withCoords) / total) * 100;
    if (missingCoordsPct > 20) {
      flags.push(`HIGH: ${missingCoordsPct.toFixed(1)}% records missing coordinates (> 20% threshold)`);
    } else if (missingCoordsPct > 10) {
      flags.push(`MEDIUM: ${missingCoordsPct.toFixed(1)}% records missing coordinates (> 10% threshold)`);
    }

    // Check inside district percentage
    if (categoryDist.inside.percentage > 10) {
      flags.push(`HIGH: Inside district = ${categoryDist.inside.percentage.toFixed(2)}% (> 10%, possible boundary error)`);
    }

    if (categoryDist.inside.count === 0) {
      flags.push('HIGH: No incidents inside district - check boundaries');
    }

    // Check coordinate bounds (Dallas area)
    if (bounds.minLat < 32.5 || bounds.maxLat > 33.2) {
      flags.push(`MEDIUM: Latitude out of Dallas range (${bounds.minLat.toFixed(2)} to ${bounds.maxLat.toFixed(2)})`);
    }

    if (bounds.minLng < -97.0 || bounds.maxLng > -96.5) {
      flags.push(`MEDIUM: Longitude out of Dallas range (${bounds.minLng.toFixed(2)} to ${bounds.maxLng.toFixed(2)})`);
    }

    // Check outside percentage
    if (categoryDist.outside.percentage < 90) {
      flags.push(`MEDIUM: Outside district = ${categoryDist.outside.percentage.toFixed(2)}% (< 90%, unexpected)`);
    }

    if (flags.length === 0) {
      flags.push('✓ All validation checks passed');
    }

    return flags;
  }
}

export const statisticalValidator = new StatisticalValidator();
