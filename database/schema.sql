-- Dallas Crime Analysis Database Schema
-- SQLite + SpatiaLite

-- Main crime incidents table
CREATE TABLE IF NOT EXISTS crime_incidents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    incident_number TEXT UNIQUE NOT NULL,
    incident_address TEXT,
    latitude REAL,
    longitude REAL,
    nibrs_crime TEXT,
    date1 TEXT,  -- ISO 8601 format
    raw_data TEXT,  -- JSON string of complete API response

    -- Geographic categorization
    geo_category TEXT CHECK(geo_category IN ('inside', 'bordering', 'outside')),

    -- Metadata
    fetched_at TEXT DEFAULT CURRENT_TIMESTAMP,
    categorized_at TEXT,

    -- Ensure coordinates are valid when present
    CONSTRAINT valid_coordinates CHECK (
        (latitude IS NULL AND longitude IS NULL) OR
        (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
    )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_crime_date ON crime_incidents(date1);
CREATE INDEX IF NOT EXISTS idx_crime_category ON crime_incidents(geo_category);
CREATE INDEX IF NOT EXISTS idx_crime_nibrs ON crime_incidents(nibrs_crime);
CREATE INDEX IF NOT EXISTS idx_crime_coords ON crime_incidents(latitude, longitude);

-- Geographic boundaries table (supports multiple boundaries)
CREATE TABLE IF NOT EXISTS geographic_boundaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,  -- 'district' | 'buffer'
    boundary_geojson TEXT NOT NULL,  -- GeoJSON string
    metadata TEXT,  -- JSON string with source, buffer distance, etc.
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Track data fetches for incremental updates
CREATE TABLE IF NOT EXISTS fetch_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fetch_date TEXT NOT NULL,
    records_fetched INTEGER,
    max_date_fetched TEXT,
    status TEXT,  -- 'in_progress' | 'completed' | 'failed'
    error_message TEXT
);

-- Validation tracking
CREATE TABLE IF NOT EXISTS validation_samples (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    incident_id INTEGER REFERENCES crime_incidents(id),
    expected_category TEXT,
    actual_category TEXT,
    validated_by TEXT,
    validated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- Note: SpatiaLite spatial extensions will be loaded at runtime
-- Geometry columns will be added programmatically when SpatiaLite is available
