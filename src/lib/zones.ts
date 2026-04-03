
export const ZONES = {
  KORA: {
    name: 'KORA (South/Central)',
    subzones: [
      'Koramangala All Blocks',
      'SG Palya / Silk Board / Nexus',
      'HSR Layout (All Sectors)',
      'BTM Layout (All Stages)',
      'Jayanagar / JP Nagar',
      'Indiranagar / Domlur',
      'Richmond Town / MG Road',
      'Ejipura / Viveknagar',
      'Bannerghatta Road / Arekere',
      'Electronic City Phase 1 & 2',
    ],
  },
  MWB: {
    name: 'MWB (East/ORR)',
    subzones: [
      'Bellandur / Ecoworld / Kadubeesanahalli',
      'Marathahalli / Spice Garden',
      'Whitefield / ITPL / Hope Farm',
      'Mahadevapura / Bagmane / CV Raman Nagar',
      'Brookfield / AECS / Kundalahalli',
      'Sarjapur Road / Haralur',
      'Hoodi / Kadugodi / Varthur',
      'Outskirts',
    ],
  },
  MTP: {
    name: 'MTP (North)',
    subzones: [
      'Manyata Tech Park',
      'Nagawara / Hebbal',
      'Thanisandra / Hennur',
      'HBR Layout / Banaswadi',
      'RT Nagar / Jakkur',
      'Sahakarnagar / Vidyaranyapura',
      'Yelahanka / Devanahalli',
    ],
  },
  YPR: {
    name: 'YPR (West)',
    subzones: [
      'Yeshwanthpur / Malleshwaram',
      'Rajajinagar / Vijayanagar',
      'Nagasandra / Peenya',
      'Dasarahalli / Jalahalli',
      'Kengeri / Mysore Road',
    ],
  },
} as const;

export type ZoneKey = keyof typeof ZONES;

export const SUBZONE_MAPPING: Record<string, { zone: ZoneKey; subzone: string }> = {
  // KORA
  'koramangala': { zone: 'KORA', subzone: 'Koramangala All Blocks' },
  'sg palya': { zone: 'KORA', subzone: 'SG Palya / Silk Board / Nexus' },
  'silk board': { zone: 'KORA', subzone: 'SG Palya / Silk Board / Nexus' },
  'nexus': { zone: 'KORA', subzone: 'SG Palya / Silk Board / Nexus' },
  'hsr': { zone: 'KORA', subzone: 'HSR Layout (All Sectors)' },
  'bommanahalli': { zone: 'KORA', subzone: 'HSR Layout (All Sectors)' },
  'btm': { zone: 'KORA', subzone: 'BTM Layout (All Stages)' },
  'jayanagar': { zone: 'KORA', subzone: 'Jayanagar / JP Nagar' },
  'jp nagar': { zone: 'KORA', subzone: 'Jayanagar / JP Nagar' },
  'j p nagar': { zone: 'KORA', subzone: 'Jayanagar / JP Nagar' },
  'indiranagar': { zone: 'KORA', subzone: 'Indiranagar / Domlur' },
  'domlur': { zone: 'KORA', subzone: 'Indiranagar / Domlur' },
  'mg road': { zone: 'KORA', subzone: 'Richmond Town / MG Road' },
  'richmond': { zone: 'KORA', subzone: 'Richmond Town / MG Road' },
  'ejipura': { zone: 'KORA', subzone: 'Ejipura / Viveknagar' },
  'bannerghatta': { zone: 'KORA', subzone: 'Bannerghatta Road / Arekere' },
  'electronic city': { zone: 'KORA', subzone: 'Electronic City Phase 1 & 2' },
  'e city': { zone: 'KORA', subzone: 'Electronic City Phase 1 & 2' },
  'ecity': { zone: 'KORA', subzone: 'Electronic City Phase 1 & 2' },
  'e-city': { zone: 'KORA', subzone: 'Electronic City Phase 1 & 2' },
  'indranagar': { zone: 'KORA', subzone: 'Indiranagar / Domlur' },
  'indira nagar': { zone: 'KORA', subzone: 'Indiranagar / Domlur' },

  // MWB
  'bellandur': { zone: 'MWB', subzone: 'Bellandur / Ecoworld / Kadubeesanahalli' },
  'ecoworld': { zone: 'MWB', subzone: 'Bellandur / Ecoworld / Kadubeesanahalli' },
  'marathahalli': { zone: 'MWB', subzone: 'Marathahalli / Spice Garden' },
  'spice garden': { zone: 'MWB', subzone: 'Marathahalli / Spice Garden' },
  'whitefield': { zone: 'MWB', subzone: 'Whitefield / ITPL / Hope Farm' },
  'itpl': { zone: 'MWB', subzone: 'Whitefield / ITPL / Hope Farm' },
  'mahadevapura': { zone: 'MWB', subzone: 'Mahadevapura / Bagmane / CV Raman Nagar' },
  'bagmane': { zone: 'MWB', subzone: 'Mahadevapura / Bagmane / CV Raman Nagar' },
  'brookfield': { zone: 'MWB', subzone: 'Brookfield / AECS / Kundalahalli' },
  'aecs': { zone: 'MWB', subzone: 'Brookfield / AECS / Kundalahalli' },
  'kundalahalli': { zone: 'MWB', subzone: 'Brookfield / AECS / Kundalahalli' },
  'sarjapur': { zone: 'MWB', subzone: 'Sarjapur Road / Haralur' },
  'hoodi': { zone: 'MWB', subzone: 'Hoodi / Kadugodi / Varthur' },
  'kadugodi': { zone: 'MWB', subzone: 'Hoodi / Kadugodi / Varthur' },
  'outskirts': { zone: 'MWB', subzone: 'Outskirts' },

  // MTP
  'manyata': { zone: 'MTP', subzone: 'Manyata Tech Park' },
  'nagawara': { zone: 'MTP', subzone: 'Nagawara / Hebbal' },
  'hebbal': { zone: 'MTP', subzone: 'Nagawara / Hebbal' },
  'thanisandra': { zone: 'MTP', subzone: 'Thanisandra / Hennur' },
  'hennur': { zone: 'MTP', subzone: 'Thanisandra / Hennur' },
  'hbr': { zone: 'MTP', subzone: 'HBR Layout / Banaswadi' },
  'banaswadi': { zone: 'MTP', subzone: 'HBR Layout / Banaswadi' },
  'yelahanka': { zone: 'MTP', subzone: 'Yelahanka / Devanahalli' },
  'devanahalli': { zone: 'MTP', subzone: 'Yelahanka / Devanahalli' },

  // YPR
  'yeshwanthpur': { zone: 'YPR', subzone: 'Yeshwanthpur / Malleshwaram' },
  'malleshwaram': { zone: 'YPR', subzone: 'Yeshwanthpur / Malleshwaram' },
  'nagasandra': { zone: 'YPR', subzone: 'Nagasandra / Peenya' },
  'peenya': { zone: 'YPR', subzone: 'Nagasandra / Peenya' },
  'kengeri': { zone: 'YPR', subzone: 'Kengeri / Mysore Road' },
  'mysore road': { zone: 'YPR', subzone: 'Kengeri / Mysore Road' },
};

export function getZoneByArea(area: string): { zone: ZoneKey; subzone: string } {
  if (!area) return { zone: 'KORA', subzone: 'Other Areas' };
  
  const normalizedArea = area.toLowerCase().trim();
  
  // Sort keys by length descending to match longest possible area first (e.g. "jp nagar" before "jp")
  const sortedKeys = Object.keys(SUBZONE_MAPPING).sort((a, b) => b.length - a.length);
  
  for (const key of sortedKeys) {
    if (normalizedArea.includes(key.toLowerCase())) {
      return SUBZONE_MAPPING[key] as { zone: ZoneKey; subzone: string };
    }
  }
  
  return { zone: 'KORA', subzone: 'Other Areas' };
}
