
export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
}

export type POIStatus = 'idle' | 'approaching' | 'playing' | 'played' | 'error';

export interface POI {
  id: string;
  name: string;
  description: string;
  coordinates: Coordinates;
  audioSrc: string;
  triggerRadiusMeters: number; // Distance in meters to trigger audio
  status: POIStatus;
}

export interface GeolocationData {
  coords: Coordinates;
  timestamp: number;
}
