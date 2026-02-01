#!/usr/bin/env tsx

import { logger } from './src/config/logger';
import { dataFetcher } from './src/services/DataFetcher';

async function testDataFetcher() {
  console.log('Testing DataFetcher with progress callback...');

  try {
    const totalRecords = await dataFetcher.fetchAllHistoricalData((fetched, total) => {
      console.log(`Progress: ${fetched.toLocaleString()} records`);
    });

    console.log(`✓ Completed! Total: ${totalRecords.toLocaleString()}`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    logger.error('Test failed:', error);
    process.exit(1);
  }
}

testDataFetcher();
