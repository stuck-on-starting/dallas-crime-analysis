#!/usr/bin/env tsx

console.log('1. Starting test...');

console.log('2. Loading dotenv...');
import * as dotenv from 'dotenv';
dotenv.config();
console.log('✓ dotenv loaded');

console.log('3. Loading logger...');
import { logger } from './src/config/logger';
console.log('✓ logger loaded');

console.log('4. Loading database...');
import db from './src/config/database';
console.log('✓ database loaded');

console.log('5. Testing database query...');
const result = db.prepare('SELECT COUNT(*) as count FROM crime_incidents').get();
console.log('✓ database query successful:', result);

console.log('6. Loading dataFetcher...');
import { dataFetcher } from './src/services/DataFetcher';
console.log('✓ dataFetcher loaded');

console.log('\nAll imports successful!');
process.exit(0);
