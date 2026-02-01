#!/usr/bin/env tsx

/**
 * Script 02: Import Official Prestonwood Boundary
 *
 * This script loads the official Prestonwood boundary from the provided
 * GeoJSON file containing all Dallas PIDs, filters for Prestonwood,
 * and saves it to the database.
 *
 * Usage: npm run script:fetch-boundaries
 */

import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../config/logger';
import { boundaryManager } from '../services/BoundaryManager';
import { Feature, Polygon, MultiPolygon, FeatureCollection } from '@turf/helpers';

const OFFICIAL_GEOJSON_PATH = path.join(
  __dirname,
  '../../data/boundaries/prestonwood-official.geojson'
);

async function importPrestorwoodBoundary(): Promise<void> {
  try {
    logger.info('Starting official boundary import...');

    // Check if the file exists
    if (!fs.existsSync(OFFICIAL_GEOJSON_PATH)) {
      throw new Error(`GeoJSON file not found at: ${OFFICIAL_GEOJSON_PATH}`);
    }

    // Read and parse the GeoJSON file
    logger.info(`Reading GeoJSON file: ${OFFICIAL_GEOJSON_PATH}`);
    const fileContent = fs.readFileSync(OFFICIAL_GEOJSON_PATH, 'utf-8');
    const geojsonData = JSON.parse(fileContent) as FeatureCollection;

    if (!geojsonData.features || geojsonData.features.length === 0) {
      throw new Error('No features found in GeoJSON file');
    }

    logger.info(`✓ Loaded ${geojsonData.features.length} features from file`);

    // Find the Prestonwood feature (Name = "Prestonwood", FID = 2)
    const prestorwoodFeature = geojsonData.features.find(
      (feature) =>
        feature.properties &&
        (feature.properties.Name === 'Prestonwood' ||
         feature.properties.name === 'Prestonwood') &&
        (feature.properties.FID === 2 || feature.properties.fid === 2)
    );

    if (!prestorwoodFeature) {
      // Log available features to help debug
      logger.error('Available features:',
        geojsonData.features.map(f => ({
          Name: f.properties?.Name,
          FID: f.properties?.FID
        }))
      );
      throw new Error('Prestonwood feature (Name=Prestonwood, FID=2) not found in file');
    }

    logger.info(`✓ Found Prestonwood feature: ${prestorwoodFeature.properties?.Name} (FID: ${prestorwoodFeature.properties?.FID})`);

    // Validate geometry
    if (!prestorwoodFeature.geometry) {
      throw new Error('Feature has no geometry');
    }

    const geometryType = prestorwoodFeature.geometry.type;
    if (!['Polygon', 'MultiPolygon'].includes(geometryType)) {
      throw new Error(`Invalid geometry type: ${geometryType}`);
    }

    logger.info(`Geometry type: ${geometryType}`);

    // Check if boundary already exists
    if (boundaryManager.boundaryExists('Prestonwood', 'district')) {
      logger.info('Prestonwood boundary already exists in database');

      // Deactivate existing boundary
      const existing = boundaryManager.getBoundary('Prestonwood', 'district');
      if (existing) {
        boundaryManager.deleteBoundary(existing.id);
        logger.info('✓ Deactivated old boundary');
      }
    }

    // Create clean feature for storage
    const feature: Feature<Polygon | MultiPolygon> = {
      type: 'Feature',
      properties: {
        name: 'Prestonwood',
        fid: prestorwoodFeature.properties?.FID,
        sqMi: prestorwoodFeature.properties?.SqMi,
        acres: prestorwoodFeature.properties?.Acres,
        source: 'official-geojson',
      },
      geometry: prestorwoodFeature.geometry as Polygon | MultiPolygon,
    };

    // Save to database
    const metadata = {
      source: 'user-defined' as const,
      createdAt: new Date(),
      description: 'Official Prestonwood Public Improvement District boundary from Dallas GIS',
      originalFile: 'prestonwood-official.geojson',
      fid: prestorwoodFeature.properties?.FID,
      area: {
        squareMiles: prestorwoodFeature.properties?.SqMi,
        acres: prestorwoodFeature.properties?.Acres,
      },
    };

    const boundaryId = boundaryManager.saveBoundaryFeature(
      'Prestonwood',
      'district',
      feature,
      metadata
    );

    logger.info(`✓ Saved official boundary to database (ID: ${boundaryId})`);

    // Save to individual file
    const boundariesDir = path.join(__dirname, '../../data/boundaries');
    const filePath = path.join(boundariesDir, 'prestonwood.geojson');
    fs.writeFileSync(filePath, JSON.stringify(feature, null, 2));

    logger.info(`✓ Saved boundary to file: ${filePath}`);

    // Display boundary info
    console.log('\n=== Official Prestonwood Boundary Info ===');
    console.log(`Name: ${feature.properties?.name}`);
    console.log(`FID: ${feature.properties?.fid}`);
    console.log(`Area: ${feature.properties?.sqMi?.toFixed(2)} sq mi (${feature.properties?.acres?.toFixed(2)} acres)`);
    console.log(`Geometry Type: ${feature.geometry.type}`);
    console.log(`Database ID: ${boundaryId}`);
    console.log(`File: ${filePath}`);
    console.log('=========================================\n');

    logger.info('✓ Official boundary import complete!');
    logger.info('⚠️  Run "npm run script:generate-buffer" to regenerate the buffer zone with the correct boundary');

    process.exit(0);
  } catch (error) {
    logger.error('Failed to import boundary:', error);
    process.exit(1);
  }
}

// Run the script
importPrestorwoodBoundary();
