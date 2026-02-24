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
      <div className="flex items-center justify-center py-16">
        <div className="w-10 h-10 border-4 rounded-full animate-spin" style={{ borderColor: 'var(--muted)', borderTopColor: 'var(--accent)' }} />
        <span className="ml-4" style={{ color: 'var(--muted-foreground)' }}>Loading boundary data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-md" style={{ color: 'var(--destructive)', background: 'oklch(0.95 0.05 27)' }}>
        Error loading boundaries: {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    );
  }

  const center: [number, number] = [32.9665, -96.7943];

  const getBoundaryStyle = (feature: BoundaryFeature) => ({
    color: feature.properties.category === 'district' ? '#ff0000' : '#0000ff',
    weight: 3,
    fillOpacity: 0.15,
  });

  const districtBoundary = boundaries?.features.find(
    (f) => f.properties.category === 'district'
  );
  const bufferBoundary = boundaries?.features.find(
    (f) => f.properties.category === 'buffer'
  );

  return (
    <div className="flex flex-col gap-4">
      <MapContainer
        center={center}
        zoom={14}
        style={{ height: '700px', width: '100%' }}
      >
        <LayersControl position="topright">
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

      <div className="mt-2 p-4 rounded-lg border-l-4" style={{ background: 'var(--muted)', borderLeftColor: 'var(--accent)' }}>
        <h4 className="font-medium mb-2" style={{ color: 'var(--foreground)' }}>Map Controls:</h4>
        <ul className="space-y-1 pl-4 list-disc text-sm" style={{ color: 'var(--muted-foreground)' }}>
          <li><strong style={{ color: 'var(--accent)' }}>Base Layers:</strong> Use the layer control (top right) to switch between Street, Satellite, and Terrain views</li>
          <li><strong style={{ color: 'var(--accent)' }}>Overlays:</strong> Toggle boundaries on/off using the layer control</li>
          <li><strong style={{ color: 'var(--accent)' }}>Zoom:</strong> Use mouse wheel or +/- buttons to zoom</li>
          <li><strong style={{ color: 'var(--accent)' }}>Pan:</strong> Click and drag to move around the map</li>
        </ul>
      </div>
    </div>
  );
}
