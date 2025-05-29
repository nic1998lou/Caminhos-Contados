
import { Coordinates } from '../types';

// Calculate distance between two coordinates using Haversine formula
export function calculateDistance(coords1: Coordinates, coords2: Coordinates): number {
  const R = 6371e3; // Earth's radius in meters
  const lat1 = coords1.latitude * Math.PI / 180; // φ, λ in radians
  const lat2 = coords2.latitude * Math.PI / 180;
  const deltaLat = (coords2.latitude - coords1.latitude) * Math.PI / 180;
  const deltaLon = (coords2.longitude - coords1.longitude) * Math.PI / 180;

  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c; // in meters
  return distance;
}
