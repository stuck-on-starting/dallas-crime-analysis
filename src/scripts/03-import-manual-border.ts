#!/usr/bin/env tsx

/**
 * Script 03b: Import Manually-Defined Border District Boundary
 *
 * Loads a hand-drawn GeoJSON polygon from prestonwood-buffer.geojson and
 * saves it to the database as the active 'buffer' boundary, replacing any
 * previously auto-generated buffer.
 *
 * Usage: npm run script:import-manual-border
 */

import * as fs from 'fs';
import * as path from 'path';
import * as turf from '@turf/turf';
import { logger } from '../config/logger';
import { boundaryManager } from '../services/BoundaryManager';
import { Feature, Polygon, MultiPolygon, FeatureCollection } from '@turf/helpers';

const BORDER_GEOJSON_PATH = path.join(
  __dirname,
  '../../data/boundaries/prestonwood-buffer.geojson'
);

async function importManualBorder(): Promise<void> {
  try {
    logger.info('Starting manual border district import...');

    if (!fs.existsSync(BORDER_GEOJSON_PATH)) {
      throw new Error(`GeoJSON file not found at: ${BORDER_GEOJSON_PATH}`);
    }

    const fileContent = fs.readFileSync(BORDER_GEOJSON_PATH, 'utf-8');
    const parsed = JSON.parse(fileContent);

    // Accept either a plain Feature or a FeatureCollection (e.g. exported from geojson.io)
    let rawFeature: GeoJSON.Feature;
    if (parsed.type === 'FeatureCollection') {
      const fc = parsed as FeatureCollection;
      if (!fc.features || fc.features.length === 0) {
        throw new Error('FeatureCollection contains no features');
      }
      rawFeature = fc.features[0];
      logger.info(`✓ Loaded FeatureCollection — using first feature`);
    } else if (parsed.type === 'Feature') {
      rawFeature = parsed as GeoJSON.Feature;
      logger.info('✓ Loaded Feature directly');
    } else {
      throw new Error(`Unexpected GeoJSON type: ${parsed.type}`);
    }

    if (!rawFeature.geometry) {
      throw new Error('Feature has no geometry');
    }

    const { type } = rawFeature.geometry;
    if (!['Polygon', 'MultiPolygon'].includes(type)) {
      throw new Error(`Expected Polygon or MultiPolygon, got: ${type}`);
    }

    logger.info(`Geometry type: ${type}`);

    // Deactivate any existing buffer boundary
    if (boundaryManager.boundaryExists('Prestonwood', 'buffer')) {
      const existing = boundaryManager.getBoundary('Prestonwood', 'buffer');
      if (existing) {
        boundaryManager.deleteBoundary(existing.id);
        logger.info('✓ Deactivated existing buffer boundary');
      }
    }

    // Build a clean feature for storage
    const borderFeature: Feature<Polygon | MultiPolygon> = {
      type: 'Feature',
      properties: {
        name: 'Prestonwood Border District',
        source: 'manual-geojson',
        originalName: rawFeature.properties?.Name ?? rawFeature.properties?.name ?? 'Border District',
      },
      geometry: rawFeature.geometry as Polygon | MultiPolygon,
    };

    const area = turf.area(borderFeature);

    const metadata = {
      source: 'user-defined' as const,
      createdAt: new Date(),
      description: 'Manually-defined border district boundary (hand-drawn, single-family homes only)',
      originalFile: 'prestonwood-buffer.geojson',
    };

    const borderId = boundaryManager.saveBoundaryFeature(
      'Prestonwood',
      'buffer',
      borderFeature,
      metadata
    );

    logger.info(`✓ Saved border district to database (ID: ${borderId})`);

    console.log('\n=== Manual Border District Info ===');
    console.log(`Name: ${borderFeature.properties?.name}`);
    console.log(`Geometry Type: ${borderFeature.geometry.type}`);
    console.log(`Area: ${(area / 1_000_000).toFixed(4)} km²  (${(area / 4046.86).toFixed(2)} acres)`);
    console.log(`Database ID: ${borderId}`);
    console.log(`Source File: ${BORDER_GEOJSON_PATH}`);
    console.log('===================================\n');

    const allBoundaries = boundaryManager.getAllBoundaries();
    console.log('Active boundaries in database:');
    allBoundaries.forEach((b) => {
      console.log(`  - ${b.name} (${b.category}) [ID: ${b.id}]`);
    });

    logger.info('✓ Manual border import complete! Run script:categorize-all next.');
    process.exit(0);
  } catch (error) {
    logger.error('Failed to import manual border:', error);
    process.exit(1);
  }
}

importManualBorder();
