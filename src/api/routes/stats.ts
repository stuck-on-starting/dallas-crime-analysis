import { Router, Request, Response } from 'express';
import db from '../../config/database';
import { logger } from '../../config/logger';
import { getCachedStats, refreshStatsCache } from '../../scripts/cache-stats';

export const statsRoutes = Router();

/**
 * GET /api/stats/overview
 * Get overall statistics (from cache for instant response)
 */
statsRoutes.get('/overview', (req: Request, res: Response) => {
  try {
    // Try to get cached stats first
    let stats = getCachedStats();

    // If no cached stats, calculate and cache them
    if (!stats) {
      logger.info('No cached stats found, calculating...');
      stats = refreshStatsCache();
    }

    res.json({
      totalRecords: stats.totalRecords,
      categoryDistribution: stats.categoryDistribution,
      dateRange: stats.dateRange,
      nibrsCategories: stats.nibrsCategories,
      lastUpdated: stats.calculatedAt,
    });
  } catch (error) {
    logger.error('Error in /api/stats/overview:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

/**
 * POST /api/stats/refresh
 * Manually trigger a cache refresh
 */
statsRoutes.post('/refresh', (req: Request, res: Response) => {
  try {
    logger.info('Manual stats cache refresh requested');
    const stats = refreshStatsCache();
    res.json({
      message: 'Statistics cache refreshed successfully',
      stats,
    });
  } catch (error) {
    logger.error('Error refreshing stats cache:', error);
    res.status(500).json({ error: 'Failed to refresh statistics cache' });
  }
});

/**
 * GET /api/stats/by-nibrs
 * Get crime counts by NIBRS category
 */
statsRoutes.get('/by-nibrs', (req: Request, res: Response) => {
  try {
    const { category } = req.query;

    let query = `
      SELECT nibrs_crime, COUNT(*) as count
      FROM crime_incidents
      WHERE nibrs_crime IS NOT NULL
    `;

    const params: any[] = [];

    if (category && category !== 'all') {
      query += ' AND geo_category = ?';
      params.push(category);
    }

    query += ' GROUP BY nibrs_crime ORDER BY count DESC';

    const results = db.prepare(query).all(...params) as Array<{
      nibrs_crime: string;
      count: number;
    }>;

    res.json(results);
  } catch (error) {
    logger.error('Error in /api/stats/by-nibrs:', error);
    res.status(500).json({ error: 'Failed to fetch NIBRS statistics' });
  }
});
