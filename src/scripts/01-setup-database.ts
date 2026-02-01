#!/usr/bin/env tsx

/**
 * Script 01: Setup Database
 *
 * This script initializes the SQLite database with the required schema.
 * Run this first before any other scripts.
 *
 * Usage: npm run script:setup-database
 */

import { initializeSchema, isDatabaseInitialized, db } from '../config/database';
import { logger } from '../config/logger';

async function setupDatabase(): Promise<void> {
  try {
    logger.info('Starting database setup...');

    // Check if database is already initialized
    if (isDatabaseInitialized()) {
      logger.info('Database is already initialized');
      const response = await promptUser(
        'Database tables already exist. Recreate them? (y/N): '
      );

      if (response.toLowerCase() !== 'y') {
        logger.info('Skipping database initialization');
        return;
      }

      // Drop existing tables
      logger.info('Dropping existing tables...');
      db.exec('DROP TABLE IF EXISTS validation_samples');
      db.exec('DROP TABLE IF EXISTS fetch_metadata');
      db.exec('DROP TABLE IF EXISTS geographic_boundaries');
      db.exec('DROP TABLE IF EXISTS crime_incidents');
      logger.info('✓ Existing tables dropped');
    }

    // Initialize schema
    initializeSchema();

    // Verify tables were created
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
      )
      .all() as { name: string }[];

    logger.info('✓ Database setup complete!');
    logger.info(`Created ${tables.length} tables:`);
    tables.forEach((table) => logger.info(`  - ${table.name}`));

    // Show database location
    logger.info(`\nDatabase location: ${process.env.DATABASE_URL || 'database/crime_analysis.db'}`);

    process.exit(0);
  } catch (error) {
    logger.error('Failed to setup database:', error);
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
setupDatabase();
