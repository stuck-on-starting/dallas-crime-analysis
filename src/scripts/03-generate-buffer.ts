#!/usr/bin/env tsx

/**
 * Script 03: Generate Buffer Zone
 *
 * This script generates a buffer zone around the Prestonwood boundary
 * using the configured distance from .env (default 0.5km).
 *
 * Usage: npm run script:generate-buffer
 */

import * as fs from 'fs';
import * as path from 'path';
import * as turf from '@turf/turf';
import { logger } from '../config/logger';
import { boundaryManager } from '../services/BoundaryManager';
import { Feature, Polygon, MultiPolygon } from '@turf/helpers';
import * as dotenv from 'dotenv';

dotenv.config();

const BUFFER_DISTANCE_KM = parseFloat(process.env.BUFFER_DISTANCE_KM || '0.5');

async function generateBuffer(): Promise<void> {
  try {
    logger.info('Starting buffer generation...');

    // Get the Prestonwood district boundary
    const prestorwoodBoundary = boundaryManager.getBoundary('Prestonwood', 'district');

    if (!prestorwoodBoundary) {
      throw new Error(
        'Prestonwood boundary not found. Please run script:fetch-boundaries first.'
      );
    }

    logger.info(`✓ Found Prestonwood boundary (ID: ${prestorwoodBoundary.id})`);

    // Check if buffer already exists
    if (boundaryManager.boundaryExists('Prestonwood', 'buffer')) {
      logger.info('Buffer boundary already exists');
      const response = await promptUser(
        'Buffer boundary already exists. Regenerate? (y/N): '
      );

      if (response.toLowerCase() !== 'y') {
        logger.info('Skipping buffer generation');
        process.exit(0);
      }

      // Deactivate existing buffer
      const existing = boundaryManager.getBoundary('Prestonwood', 'buffer');
      if (existing) {
        boundaryManager.deleteBoundary(existing.id);
        logger.info('Deactivated existing buffer');
      }
    }

    // Generate buffer
    logger.info(`Generating ${BUFFER_DISTANCE_KM}km buffer around Prestonwood...`);

    const buffered = turf.buffer(prestorwoodBoundary.feature, BUFFER_DISTANCE_KM, {
      units: 'kilometers',
      steps: 64, // Smoothness of buffer polygon
    });

    if (!buffered) {
      throw new Error('Failed to generate buffer - turf.buffer returned null');
    }

    logger.info(`✓ Buffer generated (type: ${buffered.geometry.type})`);

    // Create feature with properties
    const bufferFeature: Feature<Polygon | MultiPolygon> = {
      type: 'Feature',
      properties: {
        name: 'Prestonwood Buffer',
        bufferDistance: BUFFER_DISTANCE_KM,
        bufferUnits: 'kilometers',
        source: 'generated-buffer',
      },
      geometry: buffered.geometry,
    };

    // Save to database
    const metadata = {
      source: 'generated-buffer' as const,
      bufferDistance: BUFFER_DISTANCE_KM,
      bufferUnits: 'kilometers' as const,
      createdAt: new Date(),
      description: `${BUFFER_DISTANCE_KM}km buffer zone around Prestonwood district`,
      baseBoundaryId: prestorwoodBoundary.id,
    };

    const bufferId = boundaryManager.saveBoundaryFeature(
      'Prestonwood',
      'buffer',
      bufferFeature,
      metadata
    );

    logger.info(`✓ Saved buffer to database (ID: ${bufferId})`);

    // Save to local file
    const boundariesDir = path.join(__dirname, '../../data/boundaries');
    if (!fs.existsSync(boundariesDir)) {
      fs.mkdirSync(boundariesDir, { recursive: true });
    }

    const filePath = path.join(boundariesDir, 'prestonwood-buffer.geojson');
    fs.writeFileSync(filePath, JSON.stringify(bufferFeature, null, 2));

    logger.info(`✓ Saved buffer to file: ${filePath}`);

    // Calculate and display buffer statistics
    const districtArea = turf.area(prestorwoodBoundary.feature);
    const bufferArea = turf.area(bufferFeature);
    const bufferOnlyArea = bufferArea - districtArea;

    console.log('\n=== Buffer Zone Info ===');
    console.log(`Name: Prestonwood Buffer`);
    console.log(`Buffer Distance: ${BUFFER_DISTANCE_KM} km`);
    console.log(`Geometry Type: ${bufferFeature.geometry.type}`);
    console.log(`District Area: ${(districtArea / 1000000).toFixed(2)} km²`);
    console.log(`Buffer Area (total): ${(bufferArea / 1000000).toFixed(2)} km²`);
    console.log(`Buffer Area (ring only): ${(bufferOnlyArea / 1000000).toFixed(2)} km²`);
    console.log(`Database ID: ${bufferId}`);
    console.log(`File: ${filePath}`);
    console.log('========================\n');

    // Verify both boundaries are in database
    const allBoundaries = boundaryManager.getAllBoundaries();
    console.log('Current boundaries in database:');
    allBoundaries.forEach((b) => {
      console.log(`  - ${b.name} (${b.category}) [ID: ${b.id}]`);
    });

    logger.info('✓ Buffer generation complete!');
    process.exit(0);
  } catch (error) {
    logger.error('Failed to generate buffer:', error);
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
generateBuffer();
