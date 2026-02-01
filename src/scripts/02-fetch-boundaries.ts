#!/usr/bin/env tsx

/**
 * Script 02: Fetch Boundaries
 *
 * This script fetches the Prestonwood PID boundary from the Dallas GIS API
 * and saves it to the database and local file.
 *
 * Usage: npm run script:fetch-boundaries
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../config/logger';
import { boundaryManager } from '../services/BoundaryManager';
import { Feature, Polygon, MultiPolygon } from '@turf/helpers';

// Dallas County Appraisal District (DCAD) REST API endpoint
// Layer ID 105 = Special Tax Districts (includes PIDs)
const DCAD_REST_API =
  'https://maps.dcad.org/prdwa/rest/services/Juris/Jurisdictions/MapServer/105/query';
const PRESTONWOOD_NAME = 'Prestonwood';

// Interface for ArcGIS REST API response (ESRI JSON format)
interface ArcGISJSONResponse {
  features: Array<{
    attributes: {
      SPTXDTDSCRP?: string; // Special Tax District Description
      [key: string]: any;
    };
    geometry: {
      rings: number[][][]; // Array of rings (polygons)
    };
  }>;
}

async function fetchPrestorwoodBoundary(): Promise<void> {
  try {
    logger.info('Starting boundary fetch...');

    // Check if boundary already exists
    if (boundaryManager.boundaryExists('Prestonwood', 'district')) {
      logger.info('Prestonwood boundary already exists in database');
      const response = await promptUser(
        'Prestonwood boundary already exists. Re-fetch? (y/N): '
      );

      if (response.toLowerCase() !== 'y') {
        logger.info('Skipping boundary fetch');
        process.exit(0);
      }

      // Deactivate existing boundary
      const existing = boundaryManager.getBoundary('Prestonwood', 'district');
      if (existing) {
        boundaryManager.deleteBoundary(existing.id);
        logger.info('Deactivated existing boundary');
      }
    }

    // Fetch boundary from DCAD REST API (ArcGIS format)
    logger.info(`Fetching Prestonwood boundary from DCAD REST API...`);
    logger.info(`API: ${DCAD_REST_API}`);

    const response = await axios.get(DCAD_REST_API, {
      params: {
        where: `SPTXDTDSCRP LIKE '%${PRESTONWOOD_NAME}%'`,
        outFields: '*',
        returnGeometry: true,
        f: 'json', // Standard ArcGIS JSON format
        outSR: 4326, // WGS84 coordinate system
      },
      timeout: 30000,
    });

    if (!response.data || !response.data.features || response.data.features.length === 0) {
      logger.error('API response:', JSON.stringify(response.data));
      throw new Error('No data returned from DCAD API');
    }

    logger.info(`✓ Received ${response.data.features.length} features`);

    // Get the first feature (should be Prestonwood)
    const esriFeature = response.data.features[0];

    if (!esriFeature) {
      throw new Error('No Prestonwood boundary found in API response');
    }

    logger.info(`✓ Found boundary: ${esriFeature.attributes?.SPTXDTDSCRP || 'Unknown'}`);
    // Validate the boundary data
    if (!esriFeature.geometry || !esriFeature.geometry.rings) {
      throw new Error('No geometry data in API response');
    }

    // Convert ESRI JSON to GeoJSON
    // ESRI format uses "rings" array, GeoJSON uses "coordinates"
    const rings = esriFeature.geometry.rings;

    let geometry: Polygon | MultiPolygon;

    if (rings.length === 1) {
      // Single polygon
      geometry = {
        type: 'Polygon',
        coordinates: rings,
      };
    } else {
      // Multiple rings - could be MultiPolygon or Polygon with holes
      // For simplicity, treat as MultiPolygon
      geometry = {
        type: 'MultiPolygon',
        coordinates: rings.map((ring: any) => [ring]),
      };
    }

    const feature: Feature<Polygon | MultiPolygon> = {
      type: 'Feature',
      properties: {
        name: 'Prestonwood',
        originalName: esriFeature.attributes?.SPTXDTDSCRP || 'Prestonwood',
        source: 'DCAD REST API',
      },
      geometry,
    };

    // Validate geometry type
    if (!['Polygon', 'MultiPolygon'].includes(feature.geometry.type)) {
      throw new Error(`Invalid geometry type: ${feature.geometry.type}`);
    }

    logger.info(`Geometry type: ${feature.geometry.type}`);

    // Save to database
    const metadata = {
      source: 'api' as const,
      createdAt: new Date(),
      description: 'Prestonwood Public Improvement District boundary from DCAD REST API',
      apiEndpoint: DCAD_REST_API,
    };

    const boundaryId = boundaryManager.saveBoundaryFeature(
      'Prestonwood',
      'district',
      feature,
      metadata
    );

    logger.info(`✓ Saved boundary to database (ID: ${boundaryId})`);

    // Save to local file
    const boundariesDir = path.join(__dirname, '../../data/boundaries');
    if (!fs.existsSync(boundariesDir)) {
      fs.mkdirSync(boundariesDir, { recursive: true });
    }

    const filePath = path.join(boundariesDir, 'prestonwood.geojson');
    fs.writeFileSync(filePath, JSON.stringify(feature, null, 2));

    logger.info(`✓ Saved boundary to file: ${filePath}`);

    // Display boundary info
    console.log('\n=== Prestonwood Boundary Info ===');
    console.log(`Name: ${feature.properties?.name}`);
    console.log(`Original Name: ${feature.properties?.originalName}`);
    console.log(`Geometry Type: ${feature.geometry.type}`);
    console.log(`Database ID: ${boundaryId}`);
    console.log(`File: ${filePath}`);
    console.log('================================\n');

    logger.info('✓ Boundary fetch complete!');
    process.exit(0);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      logger.error('API request failed:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
    } else {
      logger.error('Failed to fetch boundary:', error);
    }
    process.exit(1);
  }
}

// Simple prompt utility for user input
function promptUser(question: string): Promise<string> {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer: string) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// Run the script
fetchPrestorwoodBoundary();
