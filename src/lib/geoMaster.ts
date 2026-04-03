
type LandmarkEntry = {
  'Area Name': string;
  'Landmark #1'?: string;
  'Landmark #2'?: string;
  'Landmark #3'?: string;
};

type TechParkEntry = {
  'Area Name': string;
  'Tech Park #1'?: string;
  'Tech Park #2'?: string;
};

type MetroEntry = {
  'Area Name': string;
  'Metro Station #1'?: string;
  'Metro Station #2'?: string;
};

type GeoMappings = {
  landmarks: LandmarkEntry[];
  techParks: TechParkEntry[];
  metro: MetroEntry[];
};

// Placeholder fallback datasets so this module does not depend on external tmp files.
const geoData: any[] = [];
const geoMappings: GeoMappings = { landmarks: [], techParks: [], metro: [] };

export interface GeoMasterEntry {
  areaId: string;
  subArea: string; 
  area: string;    
  pincode: string;
  lat: number;
  lng: number;
  tier: string;
  type: string;
  region: string;
  cityZone: string;
}

const rawData: any[] = geoData;

export const GEO_MASTER: GeoMasterEntry[] = rawData.map(r => ({
  areaId: r['Area ID'],
  subArea: r['Area Name'],
  area: r['Parent Area'] || r['Area Name'],
  pincode: r['PIN Code']?.toString(),
  lat: r['Latitude'],
  lng: r['Longitude'],
  tier: r['Tier'],
  type: r['Type'],
  region: r['Region'],
  cityZone: r['City Zone']
}));

export const AREAS_LIST = Array.from(new Set(GEO_MASTER.map(g => g.area))).sort();

export function getSubAreasForArea(area: string) {
  if (!area || area === 'All') return Array.from(new Set(GEO_MASTER.map(g => g.subArea))).sort();
  return Array.from(new Set(GEO_MASTER.filter(g => g.area === area).map(g => g.subArea))).sort();
}

/**
 * Robustly find which Area/Sub-Area a property belongs to based on its text (name, locality, landmarks)
 */
export function matchPropertyToGeo(p: { name?: string; area?: string; locality?: string; landmarks?: string }) {
  const normalize = (s: string) => (s || '').toLowerCase().replace(/[\s-]/g, '');
  const pText = normalize(`${p.name} ${p.area} ${p.locality} ${p.landmarks}`);

  // 1. Try SubArea Match
  for (const g of GEO_MASTER) {
    if (pText.includes(normalize(g.subArea))) return g;
  }

  // 2. Try Landmark Match using Mappings
  const allLandmarks = (geoMappings.landmarks || []);
  const allTechParks = (geoMappings.techParks || []);
  const allMetro = (geoMappings.metro || []);

  for (const g of GEO_MASTER) {
    const lMatch = allLandmarks.find(l => l['Area Name'] === g.subArea);
    const tMatch = allTechParks.find(t => t['Area Name'] === g.subArea);
    const mMatch = allMetro.find(m => m['Area Name'] === g.subArea);

    const check = [
      lMatch?.['Landmark #1'], lMatch?.['Landmark #2'], lMatch?.['Landmark #3'],
      tMatch?.['Tech Park #1'], tMatch?.['Tech Park #2'],
      mMatch?.['Metro Station #1'], mMatch?.['Metro Station #2']
    ].filter(Boolean).map(normalize);

    if (check.some(c => pText.includes(c))) return g;
  }

  // 3. Try Parent Area match
  for (const g of GEO_MASTER) {
    if (pText.includes(normalize(g.area))) return g;
  }

  return null;
}
