#!/usr/bin/env tsx

/**
 * Script 06: Validate Data
 *
 * This script generates validation reports and samples for manual verification.
 *
 * Usage: npm run script:validate
 */

import * as path from 'path';
import * as fs from 'fs';
import { logger } from '../config/logger';
import { statisticalValidator } from '../validation/StatisticalValidator';
import { sampleGenerator } from '../validation/SampleGenerator';

async function validateData(): Promise<void> {
  try {
    logger.info('Starting data validation...');

    // Generate statistical validation report
    logger.info('Generating statistical validation report...');
    const report = statisticalValidator.generateReport();

    // Display report
    console.log('\n' + '='.repeat(60));
    console.log('STATISTICAL VALIDATION REPORT');
    console.log('='.repeat(60));
    console.log(`\nGenerated: ${report.timestamp.toISOString()}\n`);

    console.log('--- Record Counts ---');
    console.log(`Total records: ${report.totalRecords.toLocaleString()}`);
    console.log(`With coordinates: ${report.recordsWithCoordinates.toLocaleString()} (${((report.recordsWithCoordinates / report.totalRecords) * 100).toFixed(1)}%)`);
    console.log(`Without coordinates: ${report.recordsWithoutCoordinates.toLocaleString()} (${((report.recordsWithoutCoordinates / report.totalRecords) * 100).toFixed(1)}%)`);

    console.log('\n--- Category Distribution ---');
    console.log(`Inside District: ${report.categoryDistribution.inside.count.toLocaleString()} (${report.categoryDistribution.inside.percentage.toFixed(2)}%)`);
    console.log(`Bordering District: ${report.categoryDistribution.bordering.count.toLocaleString()} (${report.categoryDistribution.bordering.percentage.toFixed(2)}%)`);
    console.log(`Outside District: ${report.categoryDistribution.outside.count.toLocaleString()} (${report.categoryDistribution.outside.percentage.toFixed(2)}%)`);

    console.log('\n--- Coordinate Bounds ---');
    console.log(`Latitude: ${report.coordinateBounds.minLat.toFixed(4)} to ${report.coordinateBounds.maxLat.toFixed(4)}`);
    console.log(`Longitude: ${report.coordinateBounds.minLng.toFixed(4)} to ${report.coordinateBounds.maxLng.toFixed(4)}`);
    console.log(`(Expected Dallas area: lat 32.5-33.2, lng -97.0 to -96.5)`);

    console.log('\n--- Data Quality ---');
    console.log(`Date range: ${report.dateRange.earliest || 'N/A'} to ${report.dateRange.latest || 'N/A'}`);
    console.log(`NIBRS crime categories: ${report.nibrsCategoryCount}`);
    console.log(`Duplicate incident numbers: ${report.duplicates}`);

    console.log('\n--- Validation Flags ---');
    report.validationFlags.forEach((flag) => {
      if (flag.startsWith('✓')) {
        console.log(`✓ ${flag.substring(2)}`);
      } else if (flag.startsWith('HIGH:')) {
        console.log(`🔴 ${flag}`);
      } else if (flag.startsWith('MEDIUM:')) {
        console.log(`🟡 ${flag}`);
      } else {
        console.log(`  ${flag}`);
      }
    });

    console.log('\n' + '='.repeat(60) + '\n');

    // Save report to JSON
    const validationDir = path.join(__dirname, '../../data/validation');
    if (!fs.existsSync(validationDir)) {
      fs.mkdirSync(validationDir, { recursive: true });
    }

    const reportPath = path.join(validationDir, 'statistical-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
    logger.info(`✓ Saved statistical report to: ${reportPath}`);

    // Generate manual validation sample
    logger.info('\nGenerating manual validation sample...');
    const samples = sampleGenerator.generateSample(10); // 10 samples per category

    // Export to CSV
    const csvPath = path.join(validationDir, 'manual-sample.csv');
    sampleGenerator.exportToCSV(samples, csvPath);
    console.log(`✓ Manual validation CSV: ${csvPath}`);
    console.log(`  Open this file to manually verify sample categorizations`);

    // Export to GeoJSON
    const geojsonPath = path.join(validationDir, 'validation-map.geojson');
    sampleGenerator.exportToGeoJSON(samples, geojsonPath);
    console.log(`✓ Validation map GeoJSON: ${geojsonPath}`);
    console.log(`  Import into QGIS or Google Earth for visual inspection`);

    console.log('\n' + '='.repeat(60));
    console.log('VALIDATION COMPLETE');
    console.log('='.repeat(60));
    console.log('\nNext steps:');
    console.log('1. Review the statistical report above');
    console.log('2. Open manual-sample.csv and verify 5-10 samples per category');
    console.log('3. Import validation-map.geojson into mapping software');
    console.log('4. If validation passes, proceed with full data analysis');
    console.log('='.repeat(60) + '\n');

    process.exit(0);
  } catch (error) {
    logger.error('Failed to validate data:', error);
    process.exit(1);
  }
}

// Run the script
validateData();
