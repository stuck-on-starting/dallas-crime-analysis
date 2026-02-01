import { Router, Request, Response } from 'express';
import db from '../../config/database';
import { logger } from '../../config/logger';

export const incidentRoutes = Router();

/**
 * GET /api/incidents/time-series
 * Get time series data aggregated by month/year
 */
incidentRoutes.get('/time-series', (req: Request, res: Response) => {
  try {
    const { category, groupBy = 'month' } = req.query;

    let dateFormat: string;
    switch (groupBy) {
      case 'year':
        dateFormat = '%Y';
        break;
      case 'month':
        dateFormat = '%Y-%m';
        break;
      case 'day':
        dateFormat = '%Y-%m-%d';
        break;
      default:
        dateFormat = '%Y-%m';
    }

    let query = `
      SELECT
        strftime('${dateFormat}', edate) as period,
        geo_category,
        COUNT(*) as count
      FROM crime_incidents
      WHERE edate IS NOT NULL
    `;

    const params: any[] = [];

    if (category && category !== 'all') {
      query += ' AND geo_category = ?';
      params.push(category);
    }

    query += ' GROUP BY period, geo_category ORDER BY period ASC';

    const results = db.prepare(query).all(...params) as Array<{
      period: string;
      geo_category: string;
      count: number;
    }>;

    // Transform to format suitable for frontend
    const timeSeriesData: any = {};

    results.forEach((row) => {
      if (!timeSeriesData[row.period]) {
        timeSeriesData[row.period] = {
          period: row.period,
          inside: 0,
          bordering: 0,
          outside: 0,
        };
      }
      timeSeriesData[row.period][row.geo_category] = row.count;
    });

    const data = Object.values(timeSeriesData);

    res.json(data);
  } catch (error) {
    logger.error('Error in /api/incidents/time-series:', error);
    res.status(500).json({ error: 'Failed to fetch time series data' });
  }
});

/**
 * GET /api/incidents/by-year
 * Get yearly aggregated data
 */
incidentRoutes.get('/by-year', (req: Request, res: Response) => {
  try {
    const { category } = req.query;

    let query = `
      SELECT
        strftime('%Y', edate) as year,
        geo_category,
        COUNT(*) as count
      FROM crime_incidents
      WHERE edate IS NOT NULL
    `;

    const params: any[] = [];

    if (category && category !== 'all') {
      query += ' AND geo_category = ?';
      params.push(category);
    }

    query += ' GROUP BY year, geo_category ORDER BY year ASC';

    const results = db.prepare(query).all(...params) as Array<{
      year: string;
      geo_category: string;
      count: number;
    }>;

    // Transform data
    const yearlyData: any = {};

    results.forEach((row) => {
      if (!yearlyData[row.year]) {
        yearlyData[row.year] = {
          year: row.year,
          inside: 0,
          bordering: 0,
          outside: 0,
        };
      }
      yearlyData[row.year][row.geo_category] = row.count;
    });

    const data = Object.values(yearlyData);

    res.json(data);
  } catch (error) {
    logger.error('Error in /api/incidents/by-year:', error);
    res.status(500).json({ error: 'Failed to fetch yearly data' });
  }
});

/**
 * GET /api/incidents/nibrs-categories
 * Get list of all NIBRS crime categories
 */
incidentRoutes.get('/nibrs-categories', (req: Request, res: Response) => {
  try {
    const results = db
      .prepare(
        `SELECT DISTINCT nibrs_crime
         FROM crime_incidents
         WHERE nibrs_crime IS NOT NULL
         ORDER BY nibrs_crime ASC`
      )
      .all() as Array<{ nibrs_crime: string }>;

    const categories = results.map((r) => r.nibrs_crime);

    res.json(categories);
  } catch (error) {
    logger.error('Error in /api/incidents/nibrs-categories:', error);
    res.status(500).json({ error: 'Failed to fetch NIBRS categories' });
  }
});

/**
 * GET /api/incidents/filtered
 * Get filtered time series data by NIBRS category
 */
incidentRoutes.get('/filtered', (req: Request, res: Response) => {
  try {
    const { nibrs, category, groupBy = 'month' } = req.query;

    let dateFormat: string;
    switch (groupBy) {
      case 'year':
        dateFormat = '%Y';
        break;
      case 'month':
        dateFormat = '%Y-%m';
        break;
      case 'day':
        dateFormat = '%Y-%m-%d';
        break;
      default:
        dateFormat = '%Y-%m';
    }

    let query = `
      SELECT
        strftime('${dateFormat}', edate) as period,
        geo_category,
        COUNT(*) as count
      FROM crime_incidents
      WHERE edate IS NOT NULL
    `;

    const params: any[] = [];

    // Filter by NIBRS category
    if (nibrs) {
      const nibrsArray = Array.isArray(nibrs) ? nibrs : [nibrs];
      const placeholders = nibrsArray.map(() => '?').join(',');
      query += ` AND nibrs_crime IN (${placeholders})`;
      params.push(...nibrsArray);
    }

    // Filter by geo category
    if (category && category !== 'all') {
      query += ' AND geo_category = ?';
      params.push(category);
    }

    query += ' GROUP BY period, geo_category ORDER BY period ASC';

    const results = db.prepare(query).all(...params) as Array<{
      period: string;
      geo_category: string;
      count: number;
    }>;

    // Transform data
    const timeSeriesData: any = {};

    results.forEach((row) => {
      if (!timeSeriesData[row.period]) {
        timeSeriesData[row.period] = {
          period: row.period,
          inside: 0,
          bordering: 0,
          outside: 0,
        };
      }
      timeSeriesData[row.period][row.geo_category] = row.count;
    });

    const data = Object.values(timeSeriesData);

    res.json(data);
  } catch (error) {
    logger.error('Error in /api/incidents/filtered:', error);
    res.status(500).json({ error: 'Failed to fetch filtered data' });
  }
});

/**
 * GET /api/incidents/records
 * Get paginated incident records with filters
 */
incidentRoutes.get('/records', (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      limit = '50',
      category,
      nibrs,
      startDate,
      endDate,
      search,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const offset = (pageNum - 1) * limitNum;

    // Build WHERE clause
    const whereClauses: string[] = [];
    const params: any[] = [];

    // Category filter
    if (category && category !== 'all') {
      whereClauses.push('geo_category = ?');
      params.push(category);
    }

    // NIBRS crime type filter
    if (nibrs && nibrs !== 'all') {
      const nibrsArray = Array.isArray(nibrs) ? nibrs : [nibrs];
      const placeholders = nibrsArray.map(() => '?').join(',');
      whereClauses.push(`nibrs_crime IN (${placeholders})`);
      params.push(...nibrsArray);
    }

    // Date range filter
    if (startDate) {
      whereClauses.push('edate >= ?');
      params.push(startDate);
    }
    if (endDate) {
      whereClauses.push('edate <= ?');
      params.push(endDate);
    }

    // Search filter (incident number or address)
    if (search) {
      whereClauses.push(
        '(incident_number LIKE ? OR incident_address LIKE ?)'
      );
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern);
    }

    const whereClause =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Count total records
    const countQuery = `SELECT COUNT(*) as total FROM crime_incidents ${whereClause}`;
    const countResult = db.prepare(countQuery).get(...params) as { total: number };
    const total = countResult.total;

    // Fetch records
    const dataQuery = `
      SELECT
        id,
        incident_number,
        incident_address,
        latitude,
        longitude,
        geo_category,
        nibrs_crime,
        edate,
        fetched_at,
        call_signal,
        offincident
      FROM crime_incidents
      ${whereClause}
      ORDER BY edate DESC
      LIMIT ? OFFSET ?
    `;

    const records = db
      .prepare(dataQuery)
      .all(...params, limitNum, offset) as Array<{
      id: number;
      incident_number: string;
      incident_address: string | null;
      latitude: number | null;
      longitude: number | null;
      geo_category: string;
      nibrs_crime: string | null;
      edate: string | null;
      fetched_at: string;
      call_signal: string | null;
      offincident: string | null;
    }>;

    const response = {
      records,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };

    res.json(response);
  } catch (error) {
    logger.error('Error in /api/incidents/records:', error);
    res.status(500).json({ error: 'Failed to fetch incident records' });
  }
});

/**
 * GET /api/map/incidents
 * Get incidents for map display (limited to prevent overwhelming the map)
 * Optimized: uses pre-extracted columns instead of parsing raw_data
 */
incidentRoutes.get('/map', (req: Request, res: Response) => {
  try {
    const { category, limit = 10000, year } = req.query;

    let query = `
      SELECT
        id,
        incident_number,
        incident_address,
        latitude,
        longitude,
        geo_category,
        nibrs_crime,
        edate,
        call_signal,
        offincident,
        mo
      FROM crime_incidents
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
    `;

    const params: any[] = [];

    if (category && category !== 'all') {
      query += ' AND geo_category = ?';
      params.push(category);
    }

    // Filter by year if provided
    if (year) {
      query += ' AND eyear = ?';
      params.push(year);
    }

    query += ' ORDER BY edate DESC LIMIT ?';
    params.push(Number(limit));

    const results = db.prepare(query).all(...params) as Array<{
      id: number;
      incident_number: string;
      incident_address: string | null;
      latitude: number;
      longitude: number;
      geo_category: string;
      nibrs_crime: string | null;
      edate: string | null;
      call_signal: string | null;
      offincident: string | null;
      mo: string | null;
    }>;

    // Convert to GeoJSON - no JSON parsing needed, use pre-extracted columns
    const features = results.map((incident) => ({
      type: 'Feature',
      properties: {
        id: incident.id,
        incident_number: incident.incident_number,
        address: incident.incident_address,
        category: incident.geo_category,
        nibrs_crime: incident.nibrs_crime,
        date: incident.edate,
        call_problem: incident.call_signal,
        incident_type: incident.offincident,
        mo: incident.mo,
      },
      geometry: {
        type: 'Point',
        coordinates: [incident.longitude, incident.latitude],
      },
    }));

    const geojson = {
      type: 'FeatureCollection',
      features,
    };

    res.json(geojson);
  } catch (error) {
    logger.error('Error in /api/map/incidents:', error);
    res.status(500).json({ error: 'Failed to fetch map data' });
  }
});
