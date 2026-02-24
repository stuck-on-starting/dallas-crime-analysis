import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, GeoJSON, LayersControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '../api/client';
import type { BoundaryFeature, IncidentFeature } from '../api/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

const formatArea = (category: string): string => {
  switch (category) {
    case 'inside': return 'Inside District';
    case 'bordering': return 'Bordering District';
    default: return category;
  }
};

const getCategoryColor = (cat: string): string => {
  switch (cat) {
    case 'inside': return '#ff6b00';
    case 'bordering': return '#00d4ff';
    default: return '#ffff00';
  }
};

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

function IncidentsLayer({ incidents }: { incidents: { type: 'FeatureCollection'; features: IncidentFeature[] } | undefined }) {
  const map = useMap();
  const layerRef = useRef<L.GeoJSON | null>(null);
  const rendererRef = useRef<L.Canvas | null>(null);

  useEffect(() => {
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }

    if (!incidents || incidents.features.length === 0) return;

    if (!rendererRef.current) {
      rendererRef.current = L.canvas({ padding: 0.5 });
    }
    const canvasRenderer = rendererRef.current;

    const geojsonLayer = L.geoJSON(incidents as any, {
      pointToLayer: (feature, latlng) => {
        const marker = L.circleMarker(latlng, {
          radius: 6,
          fillColor: getCategoryColor(feature.properties.category),
          color: '#ffffff',
          weight: 1,
          fillOpacity: 0.8,
          renderer: canvasRenderer,
          interactive: true,
        });

        marker.bindPopup(createPopupContent(feature.properties), { maxWidth: 300 });
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

  const { data: boundaries, isLoading: boundariesLoading } = useQuery({
    queryKey: ['boundaries'],
    queryFn: () => api.getBoundaries(),
  });

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
      <div className="flex items-center justify-center py-16">
        <div className="w-10 h-10 border-4 rounded-full animate-spin" style={{ borderColor: 'var(--muted)', borderTopColor: 'var(--accent)' }} />
        <span className="ml-4" style={{ color: 'var(--muted-foreground)' }}>Loading map data...</span>
      </div>
    );
  }

  const center: [number, number] = [32.9665, -96.7943];

  const getBoundaryStyle = (feature: BoundaryFeature) => ({
    color: feature.properties.category === 'district' ? '#ff0000' : '#0000ff',
    weight: 2,
    fillOpacity: 0.1,
  });

  return (
    <div className="flex flex-col gap-4" style={{ width: '100%' }}>
      {/* Year selector */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
            Select Year:
          </label>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="-- Select a year --" />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedYear && (
          <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            {incidentsLoading || incidentsFetching
              ? 'Loading incidents...'
              : incidents
              ? `Showing ${incidents.features.length.toLocaleString()} incidents for ${selectedYear}`
              : null}
          </span>
        )}

        {!selectedYear && (
          <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Select a year to display crime incidents on the map
          </span>
        )}
      </div>

      {/* Loading indicator */}
      {(incidentsLoading || incidentsFetching) && selectedYear && (
        <div className="flex items-center justify-center gap-4 p-4 rounded-lg" style={{ background: 'var(--muted)' }}>
          <div className="w-6 h-6 border-3 rounded-full animate-spin" style={{ borderColor: 'var(--muted)', borderTopColor: 'var(--accent)' }} />
          <span className="text-sm" style={{ color: 'var(--foreground)' }}>
            Loading incidents for {selectedYear}...
          </span>
        </div>
      )}

      {/* Map */}
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

        <IncidentsLayer incidents={incidents} />
      </MapContainer>

      {/* Legend */}
      <div className="p-3 rounded-lg" style={{ background: 'var(--muted)', color: 'var(--foreground)' }}>
        <h4 className="font-medium mb-2">Legend:</h4>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 rounded-full border-2 border-white shadow" style={{ backgroundColor: '#ff6b00' }} />
            <span className="text-sm">Inside District</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 rounded-full border-2 border-white shadow" style={{ backgroundColor: '#00d4ff' }} />
            <span className="text-sm">Bordering District</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-8 h-0.5" style={{ backgroundColor: '#ff0000' }} />
            <span className="text-sm">District Boundary</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-8 h-0.5" style={{ backgroundColor: '#0000ff' }} />
            <span className="text-sm">Buffer Zone</span>
          </div>
        </div>
      </div>
    </div>
  );
}
