import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, GeoJSON, LayersControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '../api/client';
import type { BoundaryFeature, IncidentFeature } from '../api/client';

// Available years for selection (2014 to current year)
const currentYear = new Date().getFullYear();
const availableYears = Array.from(
  { length: currentYear - 2014 + 1 },
  (_, i) => (2014 + i).toString()
).reverse();

// Format date to mm-dd-yyyy hh:mm AM/PM
const formatDateTime = (dateStr: string | null): string => {
  if (!dateStr) return 'N/A';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'N/A';

    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();

    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;

    return `${month}-${day}-${year} ${hours}:${minutes} ${ampm}`;
  } catch {
    return 'N/A';
  }
};

// Format category to display name
const formatArea = (category: string): string => {
  switch (category) {
    case 'inside':
      return 'Inside District';
    case 'bordering':
      return 'Bordering District';
    default:
      return category;
  }
};

// Get category color
const getCategoryColor = (cat: string): string => {
  switch (cat) {
    case 'inside':
      return '#ff6b00';
    case 'bordering':
      return '#00d4ff';
    default:
      return '#ffff00';
  }
};

// Create popup content for an incident
const createPopupContent = (props: IncidentFeature['properties']): string => {
  return `
    <div>
      <strong>Incident: ${props.incident_number}</strong><br/>
      <strong>Date:</strong> ${formatDateTime(props.date)}<br/>
      <strong>Address:</strong> ${props.address || 'N/A'}<br/>
      <strong>Call (911) Problem:</strong> ${props.call_problem || 'N/A'}<br/>
      <strong>Type of Incident:</strong> ${props.incident_type || 'N/A'}<br/>
      <strong>NIBRS Crime:</strong> ${props.nibrs_crime || 'N/A'}<br/>
      <strong>MO:</strong> ${props.mo || 'N/A'}<br/>
      <strong>Area:</strong> ${formatArea(props.category)}
    </div>
  `;
};

// Component to render incidents using native Leaflet (much faster than React components)
function IncidentsLayer({ incidents }: { incidents: { type: 'FeatureCollection'; features: IncidentFeature[] } | undefined }) {
  const map = useMap();
  const layerRef = useRef<L.GeoJSON | null>(null);
  const rendererRef = useRef<L.Canvas | null>(null);

  useEffect(() => {
    // Remove existing layer
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }

    if (!incidents || incidents.features.length === 0) return;

    // Create a single shared Canvas renderer for all markers
    if (!rendererRef.current) {
      rendererRef.current = L.canvas({ padding: 0.5 });
    }
    const canvasRenderer = rendererRef.current;

    // Create GeoJSON layer with shared Canvas renderer for performance
    const geojsonLayer = L.geoJSON(incidents as any, {
      pointToLayer: (feature, latlng) => {
        const marker = L.circleMarker(latlng, {
          radius: 6,
          fillColor: getCategoryColor(feature.properties.category),
          color: '#ffffff',
          weight: 1,
          fillOpacity: 0.8,
          renderer: canvasRenderer,
          interactive: true,  // Ensure markers are clickable
        });

        // Bind popup directly to each marker
        marker.bindPopup(createPopupContent(feature.properties), {
          maxWidth: 300,
        });

        return marker;
      },
    });

    geojsonLayer.addTo(map);
    layerRef.current = geojsonLayer;

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
      }
    };
  }, [incidents, map]);

  return null;
}

export function CrimeMap() {
  const [selectedYear, setSelectedYear] = useState<string>('');

  // Always load boundaries
  const { data: boundaries, isLoading: boundariesLoading } = useQuery({
    queryKey: ['boundaries'],
    queryFn: () => api.getBoundaries(),
  });

  // Only load incidents when a year is selected
  const { data: incidents, isLoading: incidentsLoading, isFetching: incidentsFetching } = useQuery({
    queryKey: ['mapIncidents', selectedYear],
    queryFn: async () => {
      const [insideData, borderingData] = await Promise.all([
        api.getMapIncidents('inside', 50000, selectedYear),
        api.getMapIncidents('bordering', 50000, selectedYear),
      ]);

      return {
        type: 'FeatureCollection' as const,
        features: [...insideData.features, ...borderingData.features],
      };
    },
    enabled: !!selectedYear,
  });

  // Memoize boundary data to prevent unnecessary re-renders
  const districtBoundary = useMemo(() =>
    boundaries?.features.find((f) => f.properties.category === 'district'),
    [boundaries]
  );

  const bufferBoundary = useMemo(() =>
    boundaries?.features.find((f) => f.properties.category === 'buffer'),
    [boundaries]
  );

  if (boundariesLoading) {
    return (
      <div className="loading">
        <span className="loading-text">Loading map data...</span>
      </div>
    );
  }

  const center: [number, number] = [32.9665, -96.7943];

  const getBoundaryStyle = (feature: BoundaryFeature) => ({
    color: feature.properties.category === 'district' ? '#ff0000' : '#0000ff',
    weight: 2,
    fillOpacity: 0.1,
  });

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedYear(e.target.value);
  };

  return (
    <div className="map-container" style={{ width: '100%' }}>
      <div className="map-controls" style={{ width: '100%' }}>
        <label>
          Select Year:
          <select
            value={selectedYear}
            onChange={handleYearChange}
            style={{ marginLeft: '10px', padding: '8px', fontSize: '1rem' }}
          >
            <option value="">-- Select a year --</option>
            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>

        {selectedYear && (
          <span className="map-info" style={{ marginLeft: '20px' }}>
            {incidentsLoading || incidentsFetching ? (
              'Loading incidents...'
            ) : incidents ? (
              `Showing ${incidents.features.length.toLocaleString()} incidents for ${selectedYear}`
            ) : null}
          </span>
        )}

        {!selectedYear && (
          <span className="map-info" style={{ marginLeft: '20px', color: '#666' }}>
            Select a year to display crime incidents on the map
          </span>
        )}
      </div>

      {(incidentsLoading || incidentsFetching) && selectedYear && (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          background: '#f8f9fa',
          borderRadius: '8px',
          marginBottom: '15px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '15px'
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            border: '3px solid #f3f3f3',
            borderTop: '3px solid #667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <span>Loading incidents for {selectedYear}...</span>
        </div>
      )}

      <MapContainer
        center={center}
        zoom={14}
        style={{ height: '700px', width: '100%' }}
        preferCanvas={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <LayersControl position="topright">
          <LayersControl.Overlay checked name="District Boundary">
            {districtBoundary && (
              <GeoJSON
                data={districtBoundary as any}
                style={() => getBoundaryStyle(districtBoundary)}
              />
            )}
          </LayersControl.Overlay>

          <LayersControl.Overlay checked name="Buffer Zone">
            {bufferBoundary && (
              <GeoJSON
                data={bufferBoundary as any}
                style={() => getBoundaryStyle(bufferBoundary)}
              />
            )}
          </LayersControl.Overlay>
        </LayersControl>

        {/* Render incidents using native Leaflet for performance */}
        <IncidentsLayer incidents={incidents} />
      </MapContainer>

      <div className="map-legend" style={{ color: '#333' }}>
        <h4 style={{ color: '#333' }}>Legend:</h4>
        <div className="legend-item" style={{ color: '#333' }}>
          <span className="legend-color" style={{ backgroundColor: '#ff6b00', border: '2px solid white', boxShadow: '0 0 2px rgba(0,0,0,0.3)' }}></span>
          Inside District
        </div>
        <div className="legend-item" style={{ color: '#333' }}>
          <span className="legend-color" style={{ backgroundColor: '#00d4ff', border: '2px solid white', boxShadow: '0 0 2px rgba(0,0,0,0.3)' }}></span>
          Bordering District
        </div>
        <div className="legend-item" style={{ color: '#333' }}>
          <span className="legend-line" style={{ backgroundColor: '#ff0000' }}></span>
          District Boundary
        </div>
        <div className="legend-item" style={{ color: '#333' }}>
          <span className="legend-line" style={{ backgroundColor: '#0000ff' }}></span>
          Buffer Zone
        </div>
      </div>
    </div>
  );
}
