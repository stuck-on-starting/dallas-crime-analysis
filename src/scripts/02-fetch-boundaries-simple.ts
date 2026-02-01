#!/usr/bin/env tsx

/**
 * Script 02: Fetch Boundaries (Simplified Version)
 *
 * This script creates a simplified Prestonwood boundary for testing.
 * The boundary is approximate based on the Prestonwood area in Dallas.
 *
 * Note: This is a temporary solution while we work out the Dallas GIS API issues.
 * The boundary coordinates are approximate and should be replaced with official
 * data once API access is working.
 *
 * Usage: npm run script:fetch-boundaries
 */

import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../config/logger';
import { boundaryManager } from '../services/BoundaryManager';
import { Feature, Polygon } from '@turf/helpers';

async function createPrestorwoodBoundary(): Promise<void> {
  try {
    logger.info('Creating Prestonwood boundary...');

    // Check if boundary already exists
    if (boundaryManager.boundaryExists('Prestonwood', 'district')) {
      logger.info('Prestonwood boundary already exists in database');
      const response = await promptUser(
        'Prestonwood boundary already exists. Replace? (y/N): '
      );

      if (response.toLowerCase() !== 'y') {
        logger.info('Skipping boundary creation');
        process.exit(0);
      }

      // Deactivate existing boundary
      const existing = boundaryManager.getBoundary('Prestonwood', 'district');
      if (existing) {
        boundaryManager.deleteBoundary(existing.id);
        logger.info('Deactivated existing boundary');
      }
    }

    // Create approximate Prestonwood boundary
    // These coordinates are approximate - based on the Prestonwood area in North Dallas
    // Prestonwood is roughly bounded by Belt Line Rd, Dallas North Tollway, LBJ Frwy, and Hillcrest
    const feature: Feature<Polygon> = {
      type: 'Feature',
      properties: {
        name: 'Prestonwood',
        source: 'manual-approximate',
        description: 'Approximate Prestonwood PID boundary for testing',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-96.8050, 32.9350], // Northwest corner (near Belt Line & Hillcrest)
            [-96.7700, 32.9350], // Northeast corner (near Belt Line & Tollway)
            [-96.7700, 32.9100], // Southeast corner (near LBJ & Tollway)
            [-96.8050, 32.9100], // Southwest corner (near LBJ & Hillcrest)
            [-96.8050, 32.9350], // Close the polygon
          ],
        ],
      },
    };

    logger.info(`✓ Created boundary polygon`);

    // Save to database
    const metadata = {
      source: 'manual-approximate' as const,
      createdAt: new Date(),
      description: 'Approximate Prestonwood Public Improvement District boundary',
      note: 'This is a simplified rectangular boundary for testing. Should be replaced with official boundary data.',
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
    console.log(`Source: ${feature.properties?.source}`);
    console.log(`Type: Approximate rectangular boundary for testing`);
    console.log(`Geometry Type: ${feature.geometry.type}`);
    console.log(`Database ID: ${boundaryId}`);
    console.log(`File: ${filePath}`);
    console.log(`\n⚠️  NOTE: This is an approximate boundary for testing.`);
    console.log(`   Replace with official data when Dallas GIS API is accessible.`);
    console.log('================================\n');

    logger.info('✓ Boundary creation complete!');
    process.exit(0);
  } catch (error) {
    logger.error('Failed to create boundary:', error);
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
createPrestorwoodBoundary();
