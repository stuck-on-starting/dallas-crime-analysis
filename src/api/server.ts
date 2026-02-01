import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { logger } from '../config/logger';
import { incidentRoutes } from './routes/incidents';
import { statsRoutes } from './routes/stats';
import { boundaryRoutes } from './routes/boundaries';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req: Request, res: Response, next) => {
  logger.info(`${req.method} ${req.path}`, {
    query: req.query,
    ip: req.ip,
  });
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes
app.use('/api/incidents', incidentRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/boundaries', boundaryRoutes);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'Dallas Crime Analysis API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      stats: '/api/stats/overview',
      incidents: {
        timeSeries: '/api/incidents/time-series',
        byYear: '/api/incidents/by-year',
        nibrsCategories: '/api/incidents/nibrs-categories',
        filtered: '/api/incidents/filtered',
        map: '/api/map/incidents',
      },
      boundaries: '/api/boundaries',
    },
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: any) => {
  logger.error('API Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 Dallas Crime Analysis API running on port ${PORT}`);
  logger.info(`   Health check: http://localhost:${PORT}/health`);
  logger.info(`   API docs: http://localhost:${PORT}/`);
});

export default app;
