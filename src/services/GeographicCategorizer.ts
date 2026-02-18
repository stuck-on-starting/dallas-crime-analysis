import * as turf from '@turf/turf';
import { point } from '@turf/helpers';
import { logger } from '../config/logger';
import { boundaryManager } from './BoundaryManager';
import { ParsedBoundary } from '../models/Boundary';

export type GeoCategory = 'inside' | 'bordering' | 'outside';

export class GeographicCategorizer {
  private districtBoundary: ParsedBoundary | null = null;
  private bufferBoundary: ParsedBoundary | null = null;
  private districtBBox: number[] | null = null;
  private bufferBBox: number[] | null = null;
  private combinedBBox: number[] | null = null;
  private isInitialized: boolean = false;

  /**
   * Initialize the categorizer by loading boundaries from database
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Geographic Categorizer...');

      // Load district boundary
      this.districtBoundary = boundaryManager.getBoundary('Prestonwood', 'district');
      if (!this.districtBoundary) {
        throw new Error('District boundary not found. Run script:fetch-boundaries first.');
      }

      // Load buffer boundary
      this.bufferBoundary = boundaryManager.getBoundary('Prestonwood', 'buffer');
      if (!this.bufferBoundary) {
        throw new Error('Buffer boundary not found. Run script:generate-buffer first.');
      }

      // Calculate bounding boxes for fast filtering.
      // combinedBBox covers both polygons so that points in either district
      // or the adjacent border district pass the fast-reject check.
      this.districtBBox = turf.bbox(this.districtBoundary.feature);
      this.bufferBBox = turf.bbox(this.bufferBoundary.feature);
      this.combinedBBox = [
        Math.min(this.districtBBox[0], this.bufferBBox[0]), // minLng
        Math.min(this.districtBBox[1], this.bufferBBox[1]), // minLat
        Math.max(this.districtBBox[2], this.bufferBBox[2]), // maxLng
        Math.max(this.districtBBox[3], this.bufferBBox[3]), // maxLat
      ];

      this.isInitialized = true;

      logger.info('✓ Geographic Categorizer initialized');
      logger.info(`  District: ${this.districtBoundary.name}`);
      logger.info(`  Border: ${this.bufferBoundary.name}`);
    } catch (error) {
      logger.error('Failed to initialize Geographic Categorizer:', error);
      throw error;
    }
  }

  /**
   * Categorize a single incident by its coordinates
   */
  categorizePoint(latitude: number, longitude: number): GeoCategory {
    if (!this.isInitialized) {
      throw new Error('Categorizer not initialized. Call initialize() first.');
    }

    // Handle invalid coordinates
    if (
      !latitude ||
      !longitude ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return 'outside';
    }

    const pt = point([longitude, latitude]);

    // TIER 1: Bounding box check (fastest - eliminates ~95% of points)
    // Use the combined bbox of both polygons so points in either the district
    // or the adjacent border district are not fast-rejected.
    if (!this.isInBoundingBox(pt.geometry.coordinates, this.combinedBBox!)) {
      return 'outside';
    }

    // TIER 2: Check if inside district boundary
    if (turf.booleanPointInPolygon(pt, this.districtBoundary!.feature)) {
      return 'inside';
    }

    // TIER 3: Check if in buffer zone
    if (turf.booleanPointInPolygon(pt, this.bufferBoundary!.feature)) {
      return 'bordering';
    }

    return 'outside';
  }

  /**
   * Batch categorization for multiple incidents
   */
  categorizeBatch(
    incidents: Array<{ id: number; latitude: number | null; longitude: number | null }>
  ): Map<number, GeoCategory> {
    if (!this.isInitialized) {
      throw new Error('Categorizer not initialized. Call initialize() first.');
    }

    const results = new Map<number, GeoCategory>();

    for (const incident of incidents) {
      if (incident.latitude && incident.longitude) {
        const category = this.categorizePoint(incident.latitude, incident.longitude);
        results.set(incident.id, category);
      } else {
        // Missing coordinates default to outside
        results.set(incident.id, 'outside');
      }
    }

    return results;
  }

  /**
   * Fast bounding box check
   * Returns true if point is within the bounding box
   */
  private isInBoundingBox(coords: number[], bbox: number[]): boolean {
    const [lng, lat] = coords;
    const [minLng, minLat, maxLng, maxLat] = bbox;

    return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
  }

  /**
   * Get statistics about the boundaries
   */
  getBoundaryStats(): {
    district: { name: string; area: number };
    buffer: { name: string; area: number };
  } | null {
    if (!this.isInitialized) {
      return null;
    }

    return {
      district: {
        name: this.districtBoundary!.name,
        area: turf.area(this.districtBoundary!.feature),
      },
      buffer: {
        name: this.bufferBoundary!.name,
        area: turf.area(this.bufferBoundary!.feature),
      },
    };
  }

  /**
   * Check if categorizer is ready to use
   */
  isReady(): boolean {
    return this.isInitialized;
  }
}

// Export singleton instance
export const geoCategorizer = new GeographicCategorizer();
