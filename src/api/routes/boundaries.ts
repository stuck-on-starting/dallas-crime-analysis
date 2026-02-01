import { Router, Request, Response } from 'express';
import { boundaryManager } from '../../services/BoundaryManager';
import { logger } from '../../config/logger';

export const boundaryRoutes = Router();

/**
 * GET /api/boundaries
 * Get all active boundaries as GeoJSON
 */
boundaryRoutes.get('/', (req: Request, res: Response) => {
  try {
    const boundaries = boundaryManager.getAllBoundaries();

    // Convert to GeoJSON FeatureCollection
    const features = boundaries.map((boundary) => ({
      ...boundary.feature,
      properties: {
        ...boundary.feature.properties,
        id: boundary.id,
        name: boundary.name,
        category: boundary.category,
        created_at: boundary.created_at,
      },
    }));

    const geojson = {
      type: 'FeatureCollection',
      features,
    };

    res.json(geojson);
  } catch (error) {
    logger.error('Error in /api/boundaries:', error);
    res.status(500).json({ error: 'Failed to fetch boundaries' });
  }
});

/**
 * GET /api/boundaries/:category
 * Get boundaries by category (district or buffer)
 */
boundaryRoutes.get('/:category', (req: Request, res: Response) => {
  try {
    const { category } = req.params;

    if (category !== 'district' && category !== 'buffer') {
      return res.status(400).json({ error: 'Invalid category. Must be "district" or "buffer"' });
    }

    const boundaries = boundaryManager.getBoundariesByCategory(
      category as 'district' | 'buffer'
    );

    const features = boundaries.map((boundary) => ({
      ...boundary.feature,
      properties: {
        ...boundary.feature.properties,
        id: boundary.id,
        name: boundary.name,
        category: boundary.category,
        created_at: boundary.created_at,
      },
    }));

    const geojson = {
      type: 'FeatureCollection',
      features,
    };

    res.json(geojson);
  } catch (error) {
    logger.error(`Error in /api/boundaries/${req.params.category}:`, error);
    res.status(500).json({ error: 'Failed to fetch boundaries' });
  }
});
