import { Feature, Polygon, MultiPolygon } from '@turf/helpers';

// Boundary data model
export interface Boundary {
  id?: number;
  name: string;
  category: 'district' | 'buffer';
  boundary_geojson: string; // JSON string
  metadata?: string; // JSON string
  is_active?: number; // SQLite uses integers for booleans
  created_at?: string;
}

// Parsed boundary metadata
export interface BoundaryMetadata {
  source?: 'api' | 'user-defined' | 'generated-buffer';
  bufferDistance?: number;
  bufferUnits?: 'kilometers' | 'miles' | 'meters';
  createdAt?: Date;
  description?: string;
}

// GeoJSON Feature for boundaries
export type BoundaryFeature = Feature<Polygon | MultiPolygon>;

// Database query result
export interface BoundaryQueryResult {
  id: number;
  name: string;
  category: 'district' | 'buffer';
  boundary_geojson: string;
  metadata: string | null;
  is_active: number;
  created_at: string;
}

// Parsed boundary (ready for use)
export interface ParsedBoundary {
  id: number;
  name: string;
  category: 'district' | 'buffer';
  feature: BoundaryFeature;
  metadata: BoundaryMetadata;
  is_active: boolean;
  created_at: Date;
}
