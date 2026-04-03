type LocationNode = {
  lat: number;
  lng: number;
  name: string;
  tier?: 'luxury' | 'premium' | 'mid' | 'budget';
};

const LOCATIONS: LocationNode[] = [
  { name: 'Koramangala', lat: 12.9352, lng: 77.6245, tier: 'premium' },
  { name: 'HSR Layout', lat: 12.9116, lng: 77.6389, tier: 'premium' },
  { name: 'Whitefield', lat: 12.9698, lng: 77.7499, tier: 'mid' },
  { name: 'Bellandur', lat: 12.9256, lng: 77.6720, tier: 'mid' },
  { name: 'Marathahalli', lat: 12.9545, lng: 77.7011, tier: 'mid' },
  { name: 'Electronic City', lat: 12.8456, lng: 77.6603, tier: 'mid' },
  { name: 'Indiranagar', lat: 12.9784, lng: 77.6408, tier: 'luxury' },
  { name: 'Hebbal', lat: 13.0358, lng: 77.5970, tier: 'premium' },
  { name: 'Jayanagar', lat: 12.9250, lng: 77.5938, tier: 'premium' },
  { name: 'JP Nagar', lat: 12.9063, lng: 77.5830, tier: 'premium' },
  { name: 'BTM Layout', lat: 12.9165, lng: 77.6101, tier: 'mid' },
  { name: 'Sarjapur Road', lat: 12.9102, lng: 77.6805, tier: 'mid' },
];

function normalizeAreaName(name: string): string {
  if (!name) return '';
  return name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '').replace(/layout|sector|block|stage|phase|nagar|cross|main|road/g, '');
}

function resolveLocationToCoords(query: string): { lat: number; lng: number; name: string } | null {
  if (!query) return null;
  const normalized = normalizeAreaName(query);
  if (!normalized) return null;

  const match = LOCATIONS.find((loc) => {
    const locNorm = normalizeAreaName(loc.name);
    return locNorm === normalized || locNorm.includes(normalized) || normalized.includes(locNorm);
  });

  return match ? { lat: match.lat, lng: match.lng, name: match.name } : null;
}

function findAreaCoordinates(query: string) {
  const resolved = resolveLocationToCoords(query);
  if (resolved) return { area: resolved.name, ...resolved };
  return null;
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 100) / 100;
}

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  return haversine(lat1, lon1, lat2, lon2);
}

export { findAreaCoordinates, getDistance, normalizeAreaName, resolveLocationToCoords, haversine };
