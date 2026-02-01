import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, GeoJSON, LayersControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '../api/client';
import type { BoundaryFeature } from '../api/client';

export function BoundariesMap() {
  const { data: boundaries, isLoading, error } = useQuery({
    queryKey: ['boundaries'],
    queryFn: () => api.getBoundaries(),
  });

  if (isLoading) {
    return (
      <div className="loading">
        <span className="loading-text">Loading boundary data...</span>
      </div>
    );
  }

  if (error) {
    return <div className="error">Error loading boundaries: {error instanceof Error ? error.message : 'Unknown error'}</div>;
  }

  // Prestonwood district center coordinates
  const center: [number, number] = [32.9665, -96.7943];

  // Get boundary style
  const getBoundaryStyle = (feature: BoundaryFeature) => {
    return {
      color: feature.properties.category === 'district' ? '#ff0000' : '#0000ff',
      weight: 3,
      fillOpacity: 0.15,
    };
  };

  const districtBoundary = boundaries?.features.find(
    (f) => f.properties.category === 'district'
  );
  const bufferBoundary = boundaries?.features.find(
    (f) => f.properties.category === 'buffer'
  );

  return (
    <div className="map-container">
      <MapContainer
        center={center}
        zoom={14}
        style={{ height: '700px', width: '100%' }}
      >
        <LayersControl position="topright">
          {/* Base Layers - User can switch between these */}
          <LayersControl.BaseLayer checked name="Street Map">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>

          <LayersControl.BaseLayer name="Satellite">
            <TileLayer
              attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={19}
            />
          </LayersControl.BaseLayer>

          <LayersControl.BaseLayer name="Terrain">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
              maxZoom={17}
            />
          </LayersControl.BaseLayer>

          {/* Overlay Layers - User can toggle these on/off */}
          <LayersControl.Overlay checked name="District Boundary (Red)">
            {districtBoundary && (
              <GeoJSON
                data={districtBoundary as any}
                style={(feature) => getBoundaryStyle(feature as BoundaryFeature)}
              />
            )}
          </LayersControl.Overlay>

          <LayersControl.Overlay checked name="Buffer Zone (Blue)">
            {bufferBoundary && (
              <GeoJSON
                data={bufferBoundary as any}
                style={(feature) => getBoundaryStyle(feature as BoundaryFeature)}
              />
            )}
          </LayersControl.Overlay>
        </LayersControl>
      </MapContainer>

      <div className="map-info-box">
        <h4>Map Controls:</h4>
        <ul>
          <li><strong>Base Layers:</strong> Use the layer control (top right) to switch between Street, Satellite, and Terrain views</li>
          <li><strong>Overlays:</strong> Toggle boundaries on/off using the layer control</li>
          <li><strong>Zoom:</strong> Use mouse wheel or +/- buttons to zoom</li>
          <li><strong>Pan:</strong> Click and drag to move around the map</li>
        </ul>
      </div>
    </div>
  );
}
