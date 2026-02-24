#!/usr/bin/env tsx

/**
 * Script: Count Single-Family Homes Per District
 *
 * Queries the Dallas Open Data parcel dataset (Socrata API) for single-family
 * residential parcels (sptbcode starting with 'A') within the bounding box of
 * both districts, then uses point-in-polygon tests to assign each parcel to the
 * inside district, the border district, or neither.
 *
 * Data source: Dallas Open Data — Parcel Shapefile
 *   https://www.dallasopendata.com/Services/Parcel-Shapefile/hy5f-5hrv
 *   API endpoint: https://www.dallasopendata.com/resource/77mr-n8tf.json
 *
 * Usage: npm run script:count-homes
 */

import axios from 'axios';
import * as turf from '@turf/turf';
import { logger } from '../config/logger';
import { boundaryManager } from '../services/BoundaryManager';

const PARCEL_API = 'https://www.dallasopendata.com/resource/77mr-n8tf.json';
const PAGE_SIZE = 50000;

// Texas SPTB codes starting with 'A' = single-family residential.
// Codes starting with 'B' or higher = multi-family, commercial, etc.
const SFH_CODE_PREFIX = 'A';

interface ParcelRecord {
  the_geom?: {
    type: string;
    coordinates: unknown;
  };
  sptbcode?: string;
  prop_cl?: string;
  acct?: string;
  st_num?: string;
  st_name?: string;
  st_type?: string;
  city?: string;
}

async function fetchPage(
  bbox: number[],
  offset: number
): Promise<ParcelRecord[]> {
  const [minLng, minLat, maxLng, maxLat] = bbox;

  // Socrata intersects() filters parcels whose geometry overlaps the bbox polygon.
  const bboxWkt =
    `POLYGON((${minLng} ${minLat}, ${maxLng} ${minLat}, ` +
    `${maxLng} ${maxLat}, ${minLng} ${maxLat}, ${minLng} ${minLat}))`;

  const params: Record<string, string | number> = {
    $where: `intersects(the_geom, '${bboxWkt}') AND sptbcode like '${SFH_CODE_PREFIX}%'`,
    $select: 'the_geom,sptbcode,prop_cl,acct,st_num,st_name,st_type,city',
    $limit: PAGE_SIZE,
    $offset: offset,
  };

  const response = await axios.get<ParcelRecord[]>(PARCEL_API, { params });
  return response.data;
}

async function countHomes(): Promise<void> {
  try {
    logger.info('Starting single-family home count...');

    // Load both boundaries from the database
    const districtBoundary = boundaryManager.getBoundary('Prestonwood', 'district');
    const borderBoundary = boundaryManager.getBoundary('Prestonwood', 'buffer');

    if (!districtBoundary) throw new Error('District boundary not found in database.');
    if (!borderBoundary) throw new Error('Border boundary not found in database.');

    logger.info(`✓ Loaded district boundary: ${districtBoundary.name}`);
    logger.info(`✓ Loaded border boundary:   ${borderBoundary.name}`);

    // Build combined bounding box to use as the API spatial filter
    const districtBBox = turf.bbox(districtBoundary.feature);
    const borderBBox = turf.bbox(borderBoundary.feature);
    const combinedBBox = [
      Math.min(districtBBox[0], borderBBox[0]),
      Math.min(districtBBox[1], borderBBox[1]),
      Math.max(districtBBox[2], borderBBox[2]),
      Math.max(districtBBox[3], borderBBox[3]),
    ];

    logger.info(
      `Combined bbox: [${combinedBBox.map((v) => v.toFixed(5)).join(', ')}]`
    );

    // Fetch all single-family parcels within the combined bbox
    logger.info('Fetching single-family parcels from Dallas Open Data...');
    let allParcels: ParcelRecord[] = [];
    let offset = 0;

    while (true) {
      logger.info(`  Fetching page at offset ${offset}...`);
      const page = await fetchPage(combinedBBox, offset);
      if (page.length === 0) break;
      allParcels = allParcels.concat(page);
      logger.info(`  ${allParcels.length} parcels fetched so far`);
      if (page.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }

    logger.info(`✓ Total single-family parcels in area: ${allParcels.length}`);

    // Classify each parcel by computing its centroid and testing containment
    let insideCount = 0;
    let borderCount = 0;
    let neitherCount = 0;
    let skippedNoGeom = 0;

    for (const parcel of allParcels) {
      if (!parcel.the_geom) {
        skippedNoGeom++;
        continue;
      }

      // Compute centroid of the parcel polygon
      let centroid: turf.Feature<turf.Point>;
      try {
        const feature = turf.feature(parcel.the_geom as turf.Geometry);
        centroid = turf.centroid(feature);
      } catch {
        skippedNoGeom++;
        continue;
      }

      if (turf.booleanPointInPolygon(centroid, districtBoundary.feature)) {
        insideCount++;
      } else if (turf.booleanPointInPolygon(centroid, borderBoundary.feature)) {
        borderCount++;
      } else {
        neitherCount++;
      }
    }

    // Report results
    console.log('\n=== Single-Family Home Count ===');
    console.log(`Data source: Dallas Open Data Parcel Shapefile (sptbcode LIKE 'A%')`);
    console.log(`Parcels fetched (combined area):  ${allParcels.length.toLocaleString()}`);
    console.log(`Skipped (no geometry):            ${skippedNoGeom.toLocaleString()}`);
    console.log('');
    console.log(`Inside Prestonwood district:      ${insideCount.toLocaleString()}`);
    console.log(`Inside border district:           ${borderCount.toLocaleString()}`);
    console.log(`Outside both (bbox spill-over):   ${neitherCount.toLocaleString()}`);
    console.log('');
    if (insideCount > 0 && borderCount > 0) {
      const ratio = (borderCount / insideCount).toFixed(2);
      console.log(`Border / Inside ratio:            ${ratio}x`);
      const pctDiff = (((borderCount - insideCount) / insideCount) * 100).toFixed(1);
      console.log(`Difference:                       ${pctDiff}%`);
    }
    console.log('================================\n');

    logger.info('✓ Home count complete.');
    process.exit(0);
  } catch (error) {
    logger.error('Failed to count homes:', error);
    process.exit(1);
  }
}

countHomes();
