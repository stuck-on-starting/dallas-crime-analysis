/**
 * API Client for Dallas Crime Analysis Backend
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface StatsOverview {
  totalRecords: number;
  categoryDistribution: {
    inside: number;
    bordering: number;
    outside: number;
  };
  dateRange: {
    earliest: string;
    latest: string;
  };
  nibrsCategories: number;
  lastUpdated: string;
}

export interface TimeSeriesData {
  period: string;
  inside: number;
  bordering: number;
  outside: number;
}

export interface YearlyData {
  year: string;
  inside: number;
  bordering: number;
  outside: number;
}

export interface NIBRSCategory {
  nibrs_crime: string;
  count: number;
}

export interface IncidentFeature {
  type: 'Feature';
  properties: {
    id: number;
    incident_number: string;
    address: string | null;
    category: string;
    nibrs_crime: string | null;
    date: string | null;
    call_problem: string | null;
    incident_type: string | null;
    mo: string | null;
  };
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
}

export interface BoundaryFeature {
  type: 'Feature';
  properties: {
    id: number;
    name: string;
    category: 'district' | 'buffer';
    created_at: string;
  };
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
}

export interface IncidentRecord {
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
}

export interface RecordsResponse {
  records: IncidentRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface RecordsFilters {
  page?: number;
  limit?: number;
  category?: string;
  nibrs?: string | string[];
  startDate?: string;
  endDate?: string;
  search?: string;
}

async function fetchAPI<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`);
  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }
  return response.json();
}

export const api = {
  // Statistics
  getOverview: () => fetchAPI<StatsOverview>('/api/stats/overview'),

  // Time Series
  getTimeSeries: (category?: string, groupBy: string = 'month') =>
    fetchAPI<TimeSeriesData[]>(
      `/api/incidents/time-series?category=${category || 'all'}&groupBy=${groupBy}`
    ),

  // Yearly Data
  getYearlyData: (category?: string) =>
    fetchAPI<YearlyData[]>(
      `/api/incidents/by-year?category=${category || 'all'}`
    ),

  // NIBRS Categories
  getNIBRSCategories: () =>
    fetchAPI<string[]>('/api/incidents/nibrs-categories'),

  getNIBRSStats: (category?: string) =>
    fetchAPI<NIBRSCategory[]>(
      `/api/stats/by-nibrs?category=${category || 'all'}`
    ),

  // Filtered Data
  getFilteredData: (
    nibrs?: string[],
    category?: string,
    groupBy: string = 'month'
  ) => {
    const params = new URLSearchParams();
    if (nibrs && nibrs.length > 0) {
      nibrs.forEach((n) => params.append('nibrs', n));
    }
    if (category) params.append('category', category);
    params.append('groupBy', groupBy);
    return fetchAPI<TimeSeriesData[]>(
      `/api/incidents/filtered?${params.toString()}`
    );
  },

  // Map Data
  getMapIncidents: (category?: string, limit: number = 10000, year?: string) => {
    const params = new URLSearchParams();
    params.append('category', category || 'all');
    params.append('limit', limit.toString());
    if (year) params.append('year', year);
    return fetchAPI<{ type: 'FeatureCollection'; features: IncidentFeature[] }>(
      `/api/incidents/map?${params.toString()}`
    );
  },

  getBoundaries: () =>
    fetchAPI<{ type: 'FeatureCollection'; features: BoundaryFeature[] }>(
      '/api/boundaries'
    ),

  // Paginated Records
  getRecords: (filters: RecordsFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.category) params.append('category', filters.category);
    if (filters.nibrs) {
      const nibrsArray = Array.isArray(filters.nibrs) ? filters.nibrs : [filters.nibrs];
      nibrsArray.forEach((n) => params.append('nibrs', n));
    }
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.search) params.append('search', filters.search);

    return fetchAPI<RecordsResponse>(
      `/api/incidents/records?${params.toString()}`
    );
  },
};
