// Crime Incident Data Model

export interface CrimeIncident {
  id?: number;
  incident_number: string;
  incident_address: string | null;
  latitude: number | null;
  longitude: number | null;
  nibrs_crime: string | null;
  date1: string | null; // Occurrence date (when crime happened) - ISO 8601 format
  edate: string | null; // Date incident created/entered (when added to system) - ISO 8601 format
  eyear: string | null; // Year of incident
  raw_data: string; // JSON string
  geo_category?: 'inside' | 'bordering' | 'outside' | null;
  fetched_at?: string;
  categorized_at?: string | null;
}

// Raw API response from Dallas Open Data
export interface DallasPoliceIncidentRaw {
  incident_number?: string;
  incidentnum?: string;
  incident_address?: string;
  geocoded_column?: {
    latitude?: string;
    longitude?: string;
    human_address?: string;
  };
  nibrs_crime?: string;
  date1?: string; // Occurrence date (when crime happened)
  date1_of_occurrence?: string;
  edate?: string; // Date incident created/entered
  eyear?: string; // Year of incident
  // Many other fields exist - we store full response in raw_data
  [key: string]: any;
}

// Validated and transformed incident
export interface ValidatedIncident {
  incident_number: string;
  incident_address: string | null;
  latitude: number | null;
  longitude: number | null;
  nibrs_crime: string | null;
  date1: string | null;
  edate: string | null;
  eyear: string | null;
  raw_data: DallasPoliceIncidentRaw;
}

// Database query result
export interface IncidentQueryResult {
  id: number;
  incident_number: string;
  incident_address: string | null;
  latitude: number | null;
  longitude: number | null;
  nibrs_crime: string | null;
  date1: string | null;
  edate: string | null;
  eyear: string | null;
  geo_category: 'inside' | 'bordering' | 'outside' | null;
  fetched_at: string;
  categorized_at: string | null;
}
