#!/usr/bin/env tsx

import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const API_BASE = 'https://www.dallasopendata.com/resource/qv6i-rri7.json';
const APP_TOKEN = process.env.SOCRATA_APP_TOKEN;

async function testAPICall() {
  console.log('Testing API call...');
  console.log(`API: ${API_BASE}`);
  console.log(`Token: ${APP_TOKEN ? 'Configured' : 'Not configured'}`);

  try {
    console.log('\nMaking request with $limit=100...');
    const startTime = Date.now();

    const params = {
      $limit: 100,
      $offset: 0,
      $order: 'date1 ASC',
    };

    const headers: any = {};
    if (APP_TOKEN) {
      headers['X-App-Token'] = APP_TOKEN;
    }

    console.log('Params:', params);
    console.log('Headers:', Object.keys(headers));

    const response = await axios.get(API_BASE, {
      params,
      headers,
      timeout: 60000,
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`\n✓ Success!`);
    console.log(`  Records received: ${response.data.length}`);
    console.log(`  Time: ${elapsed}s`);
    console.log(`  Status: ${response.status}`);

    if (response.data.length > 0) {
      const first = response.data[0];
      console.log(`\n  First record:`);
      console.log(`    Incident: ${first.incidentnum}`);
      console.log(`    Date: ${first.date1}`);
      console.log(`    Address: ${first.incident_address}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('\n✗ Error:', error);
    if (axios.isAxiosError(error)) {
      console.error('  Status:', error.response?.status);
      console.error('  Message:', error.message);
    }
    process.exit(1);
  }
}

testAPICall();
