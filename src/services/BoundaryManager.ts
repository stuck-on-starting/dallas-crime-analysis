import db from '../config/database';
import { logger } from '../config/logger';
import {
  Boundary,
  BoundaryQueryResult,
  ParsedBoundary,
  BoundaryMetadata,
  BoundaryFeature,
} from '../models/Boundary';
import { Feature, Polygon, MultiPolygon } from '@turf/helpers';

export class BoundaryManager {
  /**
   * Save a boundary to the database
   */
  saveBoundary(boundary: Omit<Boundary, 'id' | 'created_at'>): number {
    try {
      const stmt = db.prepare(`
        INSERT INTO geographic_boundaries
          (name, category, boundary_geojson, metadata, is_active)
        VALUES (?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        boundary.name,
        boundary.category,
        boundary.boundary_geojson,
        boundary.metadata || null,
        boundary.is_active !== undefined ? boundary.is_active : 1
      );

      logger.info(`Saved boundary: ${boundary.name} (category: ${boundary.category})`);
      return result.lastInsertRowid as number;
    } catch (error) {
      logger.error(`Failed to save boundary ${boundary.name}:`, error);
      throw error;
    }
  }

  /**
   * Get a boundary by name and category
   */
  getBoundary(name: string, category: 'district' | 'buffer'): ParsedBoundary | null {
    try {
      const stmt = db.prepare(`
        SELECT * FROM geographic_boundaries
        WHERE name = ? AND category = ? AND is_active = 1
        ORDER BY created_at DESC
        LIMIT 1
      `);

      const result = stmt.get(name, category) as BoundaryQueryResult | undefined;

      if (!result) {
        return null;
      }

      return this.parseBoundary(result);
    } catch (error) {
      logger.error(`Failed to get boundary ${name}:`, error);
      throw error;
    }
  }

  /**
   * Get all active boundaries
   */
  getAllBoundaries(): ParsedBoundary[] {
    try {
      const stmt = db.prepare(`
        SELECT * FROM geographic_boundaries
        WHERE is_active = 1
        ORDER BY category, name
      `);

      const results = stmt.all() as BoundaryQueryResult[];
      return results.map((r) => this.parseBoundary(r));
    } catch (error) {
      logger.error('Failed to get all boundaries:', error);
      throw error;
    }
  }

  /**
   * Get boundaries by category
   */
  getBoundariesByCategory(category: 'district' | 'buffer'): ParsedBoundary[] {
    try {
      const stmt = db.prepare(`
        SELECT * FROM geographic_boundaries
        WHERE category = ? AND is_active = 1
        ORDER BY name
      `);

      const results = stmt.all(category) as BoundaryQueryResult[];
      return results.map((r) => this.parseBoundary(r));
    } catch (error) {
      logger.error(`Failed to get boundaries by category ${category}:`, error);
      throw error;
    }
  }

  /**
   * Update boundary active status
   */
  setBoundaryActive(id: number, isActive: boolean): void {
    try {
      const stmt = db.prepare(`
        UPDATE geographic_boundaries
        SET is_active = ?
        WHERE id = ?
      `);

      stmt.run(isActive ? 1 : 0, id);
      logger.info(`Updated boundary ${id} active status to ${isActive}`);
    } catch (error) {
      logger.error(`Failed to update boundary ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a boundary (soft delete by setting is_active = 0)
   */
  deleteBoundary(id: number): void {
    this.setBoundaryActive(id, false);
    logger.info(`Soft deleted boundary ${id}`);
  }

  /**
   * Check if a boundary exists
   */
  boundaryExists(name: string, category: 'district' | 'buffer'): boolean {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM geographic_boundaries
      WHERE name = ? AND category = ? AND is_active = 1
    `);

    const result = stmt.get(name, category) as { count: number };
    return result.count > 0;
  }

  /**
   * Parse a database boundary result into a ParsedBoundary
   */
  private parseBoundary(result: BoundaryQueryResult): ParsedBoundary {
    const feature = JSON.parse(result.boundary_geojson) as BoundaryFeature;
    const metadata = result.metadata
      ? (JSON.parse(result.metadata) as BoundaryMetadata)
      : {};

    return {
      id: result.id,
      name: result.name,
      category: result.category,
      feature,
      metadata,
      is_active: result.is_active === 1,
      created_at: new Date(result.created_at),
    };
  }

  /**
   * Save a GeoJSON feature as a boundary
   */
  saveBoundaryFeature(
    name: string,
    category: 'district' | 'buffer',
    feature: BoundaryFeature,
    metadata?: BoundaryMetadata
  ): number {
    const boundary: Omit<Boundary, 'id' | 'created_at'> = {
      name,
      category,
      boundary_geojson: JSON.stringify(feature),
      metadata: metadata ? JSON.stringify(metadata) : undefined,
      is_active: 1,
    };

    return this.saveBoundary(boundary);
  }
}

// Export singleton instance
export const boundaryManager = new BoundaryManager();
