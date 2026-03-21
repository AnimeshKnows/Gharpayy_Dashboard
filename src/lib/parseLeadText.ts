export interface BudgetRange {
  lo: number;
  hi: number;
  display: string;
}

export interface ParsedLeadMetadata {
  sourceFormat: string;
  areas: string[];
  zone: string;
  zones: string[];
  techParks: string[];
  mapLinks: string[];
  buildingName: string;
  fullAddress: string;
  inBLR: boolean | null;
  moveInRaw: string;
  moveInUrgency: 'immediate' | 'hot' | 'warm' | 'cold' | '';
  moveInUrgencyDays: number | null;
  budgetRanges: BudgetRange[];
  extraFields: Record<string, string>;
}

export interface ParsedLead {
  name: string;
  phone: string;
  email: string;
  budget: string;
  preferred_location: string;
  move_in_date: string;
  profession: string;
  room_type: string;
  need_preference: string;
  special_requests: string;
  notes: string;
  metadata: ParsedLeadMetadata;
  confidence: {
    name: number;
    phone: number;
    email: number;
    budget: number;
    location: number;
  };
}

type MoveInParsed = {
  raw: string;
  label: string;
  urgencyDays: number;
  urgency: 'immediate' | 'hot' | 'warm' | 'cold';
};

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
const MONTHS_LONG = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'] as const;

const ZONES = [
  {
    zone: 'South',
    keywords: [
      'koramangala', 'kormangala', 'btm', 'jayanagar', 'jp nagar', 'hsr', 'banashankari', 'basavanagudi',
      'electronic city', 'sg palya', 'sgpalya', 'silk board', 'agara', 'madiwala', 'bannerghatta', 'hosur road'
    ],
  },
  {
    zone: 'East',
    keywords: [
      'whitefield', 'itpl', 'kundalahalli', 'brookfield', 'hoodi', 'varthur', 'kr puram', 'bellandur',
      'sarjapur', 'ecospace', 'ecoworld', 'embassy tech village', 'indiranagar', 'domlur', 'ejipura',
      'cv raman nagar', 'old airport road', 'marathahalli', 'mahadevapura', 'bagmane', 'kadubeesanahalli'
    ],
  },
  {
    zone: 'North',
    keywords: [
      'yelahanka', 'hebbal', 'manyata', 'nagawara', 'thanisandra', 'jakkur', 'banaswadi', 'rt nagar',
      'devanahalli', 'hennur', 'peenya', 'kempegowda airport'
    ],
  },
  {
    zone: 'West',
    keywords: [
      'rajajinagar', 'vijayanagar', 'yeshwanthpur', 'nagarbhavi', 'malleswaram', 'kengeri', 'rr nagar', 'mysore road'
    ],
  },
  {
    zone: 'Central',
    keywords: [
      'mg road', 'brigade road', 'richmond', 'shantinagar', 'ashok nagar', 'majestic', 'frazer town',
      'cubbon park', 'ub city', 'trinity', 'halasuru', 'church street', 'richmond town', 'cox town'
    ],
  },
] as const;

const TECH_PARKS = [
  { name: 'Manyata Tech Park', keywords: ['manyata tech', 'manyata', 'manyatha'] },
  { name: 'Embassy Tech Village', keywords: ['embassy tech village', 'etv'] },
  { name: 'Bagmane Tech Park', keywords: ['bagmane tech', 'bagmane'] },
  { name: 'Prestige Tech Park', keywords: ['prestige tech park'] },
  { name: 'Electronic City (Infosys)', keywords: ['electronic city', 'infosys campus', 'ecity'] },
  { name: 'ITPL', keywords: ['itpl', 'international tech park'] },
  { name: 'EcoSpace Business Park', keywords: ['ecospace'] },
  { name: 'RMZ Ecoworld', keywords: ['rmz ecoworld', 'rmz eco world'] },
  { name: 'Cessna Business Park', keywords: ['cessna business', 'cessna'] },
  { name: 'Kirloskar Tech Park', keywords: ['kirloskar tech'] },
] as const;

function emptyMetadata(): ParsedLeadMetadata {
  return {
    sourceFormat: 'Manual',
    areas: [],
    zone: '',
    zones: [],
    techParks: [],
    mapLinks: [],
    buildingName: '',
    fullAddress: '',
    inBLR: null,
    moveInRaw: '',
    moveInUrgency: '',
    moveInUrgencyDays: null,
    budgetRanges: [],
    extraFields: {},
  };
}

function emptyLead(): ParsedLead {
  return {
    name: '',
    phone: '',
    email: '',
    budget: '',
    preferred_location: '',
    move_in_date: '',
    profession: '',
    room_type: '',
    need_preference: '',
    special_requests: '',
    notes: '',
    metadata: emptyMetadata(),
    confidence: { name: 0, phone: 0, email: 0, budget: 0, location: 0 },
  };
}

function unique(items: string[]): string[] {
  return Array.from(new Set(items.filter(Boolean)));
}

function fmtAmt(n: number): string {
  if (n >= 10000000) return `${(n / 10000000).toFixed(1).replace(/\.0$/, '')}Cr`;
  if (n >= 100000) return `${(n / 100000).toFixed(1).replace(/\.0$/, '')}L`;
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return String(Math.round(n));
}

function detectLeadSource(raw: string): string {
  if (/GHARPAYY.*SuperStay|Aayushi|fill this/i.test(raw)) return 'L1';
  if (/Share\.google|maps\.app\.goo|goo\.gl\/maps|google\.com\/maps/i.test(raw) || /\d+,\s*\d+(?:th|st|nd|rd)\s+(?:Main|Cross|Road)/i.test(raw)) return 'L2';
  if (/📝[\s\S]*Name[\s\S]*📱[\s\S]*Phone[\s\S]*✉️[\s\S]*Email/i.test(raw)) return 'L3';
  if (/^[A-Z][a-z]+\s*\n[6-9]\d{9}/m.test(raw) || /Budget[^:\n]*\.{3}/i.test(raw)) return 'L4';
  if (/Google Calendar|Organizer|Shifting date|WILLING TO PREBOOK/i.test(raw)) return 'L5';
  if (/\[\d{2}\/\d{2},\s+\d+:\d+\s+[ap]m\]/i.test(raw) || /I'll be coming|I'm reaching|would it be possible to schedule/i.test(raw)) return 'L6';
  return 'Manual';
}

function extractPhone(raw: string): string {
  const labeled = raw.match(/(?:Phone|Ph|Mobile|Mob|Contact|Number|Cell|Whatsapp)\s*[:\-–*]?\s*([\d\s+\-()]{8,18})/i);
  if (labeled) {
    const m = labeled[1].match(/(?:\+?91[-\s]?)?([6-9]\d{9})/);
    if (m) {
      const digits = m[0].replace(/\D/g, '');
      return digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits.slice(-10);
    }
  }

  const anyPhone = raw.match(/(?:\+?91[-\s]?)?[6-9]\d{9}/);
  if (anyPhone) {
    const digits = anyPhone[0].replace(/\D/g, '');
    return digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits.slice(-10);
  }

  const wa = raw.match(/\+91\s*([\d\s]{10,14}):/);
  if (wa) return wa[1].replace(/\D/g, '').slice(-10);
  return '';
}

function extractName(raw: string, clean: string): string {
  const labeled = clean.match(/(?:^|\n)\s*(?:📝\s*)?Name\s*[:\-–*]+\s*([^\n,📱\d]{2,45})/im);
  if (labeled) return labeled[1].replace(/[^\w\s\-.]/g, '').trim();

  const calGuest = raw.match(/Guest\s+[+\d\s]+([A-Z][a-z][a-zA-Z\s]{1,28})/);
  if (calGuest) return calGuest[1].trim();

  const colonName = clean.match(/Name\s*:\s*([A-Z][a-zA-Z\s]{1,35})/);
  if (colonName) return colonName[1].trim();

  const firstLine = clean.split('\n')[0].replace(/\*/g, '').trim();
  if (/^[A-Z][a-zA-Z\s]{1,25}$/.test(firstLine) && !/\d/.test(firstLine)) return firstLine;

  const namePhone = firstLine.match(/^([A-Z][a-zA-Z][a-zA-Z\s]{1,25}?)\s+(?:\+?91[-\s]?)?[6-9]\d{9}/);
  if (namePhone) return namePhone[1].trim();

  return '';
}

function extractLocations(raw: string): { areas: string[]; mapLinks: string[]; buildingName: string; fullAddress: string } {
  const mapLinks = Array.from(raw.matchAll(/https?:\/\/(?:share\.google|maps\.app\.goo\.gl|goo\.gl|maps\.google|google\.com\/maps)[^\s)>]*/gi)).map(m => m[0]);

  const stripped = raw
    .replace(/https?:\/\/(?:share\.google|maps\.app\.goo\.gl|goo\.gl|maps\.google|google\.com\/maps)[^\s)>]*/gi, '')
    .replace(/\[[\d:,\s]+(AM|PM)\]/gi, '')
    .replace(/[📝📱✉️📍💰📆👨🏢👫✨💥💯⚡🔥💛🏙⭐]/g, '')
    .replace(/\*{1,2}([^*\n]+)\*{1,2}/g, '$1');

  const fullAddressMatch = stripped.match(/\d+[\w\s,/-]{8,}(?:road|rd|main|cross|layout|nagar|sector|stage|block|phase|colony|street|st)[\w\s,/-]{0,80}/i);
  const fullAddress = fullAddressMatch?.[0]?.replace(/\s+/g, ' ').trim() || '';

  const buildingMatch = stripped.match(/(?:ground floor|first floor|second floor|third floor|tower|block|wing|flat|apartment|house)[^\n,]{0,70}/i);
  const buildingName = buildingMatch?.[0]?.replace(/\s+/g, ' ').trim() || '';

  const locLabel = stripped.match(/(?:Preferred Location|Location|Where|Area|Near)[^:\n]*[:\-–]+\s*([^\n]{3,120})/i);
  let locSource = locLabel ? locLabel[1] : stripped;
  if (fullAddress) locSource = locSource.replace(fullAddress, ' ');

  const segments = locSource
    .split(/[,/]|\bor\b|\band\b/i)
    .map(s => s.replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim())
    .filter(s => s.length > 2 && s.length < 60);

  const noise = /^(?:bengaluru|bangalore|karnataka|india|near|for\s+men|for\s+women|pg|hostel|\d+)$/i;
  const areas = unique(segments.filter(s => !noise.test(s) && !/^\d+$/.test(s)));

  return { areas, mapLinks: unique(mapLinks), buildingName, fullAddress };
}

function detectAllZones(raw: string): string[] {
  const t = raw.toLowerCase();
  const found: string[] = [];
  for (const z of ZONES) {
    if (z.keywords.some(k => t.includes(k))) found.push(z.zone);
  }
  return unique(found);
}

function detectTechParks(raw: string): string[] {
  const t = raw.toLowerCase();
  return unique(
    TECH_PARKS.filter(p => p.keywords.some(k => t.includes(k))).map(p => p.name)
  );
}

function parseBudget(raw: string): { raw: string; ranges: BudgetRange[]; display: string } {
  if (!raw) return { raw: '', ranges: [], display: '' };
  const normalized = raw.toLowerCase();

  const toNum = (s: string): number | null => {
    const n = parseFloat(s.replace(/[^\d.]/g, ''));
    if (Number.isNaN(n)) return null;
    if (/l|lac|lakh/.test(s)) return n * 100000;
    if (/cr/.test(s)) return n * 10000000;
    if (/k/.test(s)) return n * 1000;
    return n;
  };

  const ranges: BudgetRange[] = [];
  const rangeRe = /(\d+(?:\.\d+)?(?:k|l|lac(?:s)?|lakh|cr)?)\s*(?:to|-|–)\s*(\d+(?:\.\d+)?(?:k|l|lac(?:s)?|lakh|cr)?)/gi;
  let m: RegExpExecArray | null;
  while ((m = rangeRe.exec(normalized)) !== null) {
    const lo = toNum(m[1]);
    const hi = toNum(m[2]);
    if (lo && hi) ranges.push({ lo, hi, display: `₹${fmtAmt(lo)}-${fmtAmt(hi)}` });
  }

  if (!ranges.length) {
    const singleTokens = Array.from(normalized.matchAll(/(\d+(?:\.\d+)?(?:k|l|lac(?:s)?|lakh|cr)?)/gi)).map(x => x[1]);
    const values = singleTokens.map(toNum).filter((x): x is number => !!x);
    if (values.length === 1) {
      ranges.push({ lo: values[0], hi: values[0], display: `₹${fmtAmt(values[0])}` });
    } else if (values.length >= 2) {
      ranges.push({ lo: values[0], hi: values[values.length - 1], display: `₹${fmtAmt(values[0])}-${fmtAmt(values[values.length - 1])}` });
    }
  }

  return {
    raw: raw.trim(),
    ranges,
    display: ranges.map(r => r.display).join(' / ') || raw.trim(),
  };
}

function parseMoveIn(raw: string): MoveInParsed | null {
  if (!raw) return null;
  const now = new Date();
  const t = raw.toLowerCase().replace(/\s+/g, ' ').trim();

  const diffDays = (d: Date) => Math.round((d.getTime() - now.getTime()) / 864e5);
  const classify = (days: number): MoveInParsed['urgency'] => {
    if (days <= 0) return 'immediate';
    if (days <= 10) return 'hot';
    if (days <= 30) return 'warm';
    return 'cold';
  };

  const build = (d: Date, rawStr: string): MoveInParsed => {
    const days = diffDays(d);
    return {
      raw: rawStr,
      label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      urgencyDays: Math.max(0, days),
      urgency: classify(days),
    };
  };

  if (/\b(immediately|immediate|asap|today|right away|right now|urgent|as soon as)\b/i.test(raw)) {
    return { raw: t, label: 'Immediately', urgencyDays: 0, urgency: 'immediate' };
  }

  const nextMonth = /\bnext\s+month\b/i.test(t);
  if (nextMonth) {
    const d = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return build(d, 'Next month');
  }

  if (/\bthis\s+month\b/i.test(t)) {
    const d = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return build(d, 'This month');
  }

  const rel = t.match(/(?:in\s+)?(\d+)\s+(day|days|week|weeks)/i);
  if (rel) {
    const n = parseInt(rel[1], 10) * (rel[2].toLowerCase().startsWith('week') ? 7 : 1);
    return build(new Date(now.getTime() + n * 864e5), raw.trim());
  }

  const slash = raw.match(/(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?/);
  if (slash) {
    const dd = parseInt(slash[1], 10);
    const mm = parseInt(slash[2], 10) - 1;
    const yy = slash[3] ? parseInt(slash[3].length === 2 ? `20${slash[3]}` : slash[3], 10) : now.getFullYear();
    const d = new Date(yy, mm, dd);
    if (!Number.isNaN(d.getTime())) return build(d, raw.trim());
  }

  for (let i = 0; i < MONTHS_LONG.length; i += 1) {
    const re = new RegExp(`(?:${MONTHS_LONG[i]}|${MONTHS_SHORT[i]})\\s+(\\d{1,2})(?:st|nd|rd|th)?`, 'i');
    const m = raw.match(re);
    if (m) {
      const day = parseInt(m[1], 10);
      const year = i < now.getMonth() ? now.getFullYear() + 1 : now.getFullYear();
      const d = new Date(year, i, day);
      if (!Number.isNaN(d.getTime())) return build(d, raw.trim());
    }
  }

  return { raw: raw.trim(), label: raw.trim(), urgencyDays: 999, urgency: 'cold' };
}

function extractInBlr(raw: string): boolean | null {
  const questionIdx = raw.search(/Are you in Bangalore|in bangalore currently/i);
  if (questionIdx > -1) {
    const after = raw.slice(questionIdx);
    if (/\byes\b|i'?m in bangalore|i am in bangalore/i.test(after)) return true;
    if (/\bno\b|not in bangalore|outside bangalore|coming to bangalore|relocating/i.test(after)) return false;
  }

  if (/\bin\s*blr\b|in bangalore|currently in bangalore|already in/i.test(raw)) return true;
  if (/not in blr|not in bangalore|outside bangalore|relocating|will be coming|coming to bangalore/i.test(raw)) return false;
  return null;
}

function cleanup(v: string): string {
  return v.replace(/\s+/g, ' ').replace(/^(?:-|:|\.|,|\s)+|(?:-|:|\.|,|\s)+$/g, '').trim();
}

function extractFieldValue(clean: string, labels: string[]): string {
  for (const label of labels) {
    const re = new RegExp(`(?:^|\\n|\\b)${label}\\s*[:\\-–*]?\\s*([^\\n]+)`, 'i');
    const m = clean.match(re);
    if (m?.[1]) return cleanup(m[1]);
  }
  return '';
}

function extractExtraFields(clean: string): Record<string, string> {
  const out: Record<string, string> = {};
  const lines = clean
    .split(/\n+/)
    .map(l => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    const m = line.match(/^([A-Za-z][A-Za-z /_()-]{2,40})\s*[:\-–]\s*(.{2,200})$/);
    if (!m) continue;
    const key = cleanup(m[1]).toLowerCase();
    const value = cleanup(m[2]);
    if (!value) continue;
    if (['name', 'phone', 'mobile', 'contact', 'email', 'location', 'area', 'budget', 'move in', 'move-in', 'move in date', 'room', 'need', 'special requests', 'notes'].some(k => key.includes(k))) {
      continue;
    }
    out[key] = value;
  }

  return out;
}

export function parseLeadText(raw: string): ParsedLead {
  if (!raw || !raw.trim()) return emptyLead();

  const clean = raw
    .replace(/\*{1,2}([^*\n]+)\*{1,2}/g, '$1')
    .replace(/_{1,3}([^_\n]+)_{1,3}/g, '$1')
    .replace(/`([^`]+)`/g, '$1');

  const phone = extractPhone(raw);
  const name = extractName(raw, clean);
  const email = raw.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/)?.[0]?.toLowerCase() || '';

  const locData = extractLocations(raw);
  const preferred_location = locData.areas.join(', ');

  const budgetRaw =
    extractFieldValue(clean, ['Budget Range', 'Actual budget', 'Budget', 'Budjet']) ||
    clean.match(/\b(\d{1,2}k?\s*(?:to|-|–)\s*\d{1,2}k)\b/i)?.[1] ||
    '';
  const budgetParsed = parseBudget(budgetRaw);

  const moveInRaw =
    extractFieldValue(clean, ['Move[- ]?in(?: Date)?', 'Moving Date', 'Date']) ||
    raw.match(/(?:coming|reaching|arriving|joining)\s+(?:on\s+)?(?:\d{1,2}(?:st|nd|rd|th)?\s+\w+|\w+\s+\d{1,2})/i)?.[0] ||
    (/(next\s+month|immediately|immediate|asap|today)/i.test(raw) ? raw.match(/(next\s+month|immediately|immediate|asap|today)/i)?.[0] || '' : '');
  const moveInParsed = parseMoveIn(moveInRaw);

  const isWorking = /\bworking\b|\bprofessional\b|\bemployed\b/i.test(clean);
  const isStudent = /\bstudent\b/i.test(clean);
  const isIntern = /\bintern(?:ing)?\b/i.test(clean);
  const profession = isWorking && isStudent ? 'student/working' : isWorking ? 'working' : isStudent ? 'student' : isIntern ? 'intern' : '';

  const roomRaw = (extractFieldValue(clean, ['Room', 'Private \/ Sharing', 'Shared \/ Private']) || '').toLowerCase();
  const hasPrivate = /private|single/i.test(roomRaw) || /\b(private|single)\s+(?:room|occupancy)\b/i.test(clean);
  const hasShared = /shared|sharing|double/i.test(roomRaw) || /\bshared\b/i.test(clean);
  const room_type = hasPrivate && hasShared ? 'both' : hasPrivate ? 'private' : hasShared ? 'shared' : '';

  const needRaw = (
    extractFieldValue(clean, ['NEED', 'Need', 'Boys\/Girls\/Coed', 'Girls\/Coed', 'Boys\/Coed']) || ''
  ).toLowerCase();
  const wantGirls = needRaw.includes('girl') || /\bgirls?\b/i.test(clean);
  const wantBoys = needRaw.includes('boy') || /\bboys?\b/i.test(clean);
  const wantCoed = needRaw.includes('coed') || /\bco[\s-]?living\b/i.test(clean);
  const need_preference = [wantGirls ? 'girls' : '', wantBoys ? 'boys' : '', wantCoed ? 'coed' : ''].filter(Boolean).join(' / ');

  const special_requests = cleanup(
    extractFieldValue(clean, ['Special Requests?', 'Any special expectations?', 'Special request'])
      .replace(/\b(?:NA|None|n\/a|If any)\b/gi, '')
  );

  const zones = detectAllZones(raw);
  const zone = zones[0] || '';
  const techParks = detectTechParks(raw);
  const sourceFormat = detectLeadSource(raw);
  const inBLR = extractInBlr(raw);
  const extraFields = extractExtraFields(clean);

  if (!phone && !email && !name) return emptyLead();

  const notesParts: string[] = [];
  if (zone) notesParts.push(`Zone: ${zone}`);
  if (techParks.length) notesParts.push(`Tech parks: ${techParks.join(', ')}`);
  if (Object.keys(extraFields).length) {
    const sample = Object.entries(extraFields)
      .slice(0, 3)
      .map(([k, v]) => `${k}: ${v}`)
      .join(' | ');
    notesParts.push(`Extra info: ${sample}`);
  }

  return {
    name: cleanup(name),
    phone: cleanup(phone),
    email: cleanup(email),
    budget: cleanup(budgetParsed.display),
    preferred_location: cleanup(preferred_location),
    move_in_date: cleanup(moveInParsed?.label || moveInRaw),
    profession: cleanup(profession),
    room_type: cleanup(room_type),
    need_preference: cleanup(need_preference),
    special_requests,
    notes: notesParts.join(' | '),
    metadata: {
      sourceFormat,
      areas: locData.areas,
      zone,
      zones,
      techParks,
      mapLinks: locData.mapLinks,
      buildingName: locData.buildingName,
      fullAddress: locData.fullAddress,
      inBLR,
      moveInRaw: cleanup(moveInRaw),
      moveInUrgency: moveInParsed?.urgency || '',
      moveInUrgencyDays: moveInParsed ? moveInParsed.urgencyDays : null,
      budgetRanges: budgetParsed.ranges,
      extraFields,
    },
    confidence: {
      name: name ? 0.9 : 0,
      phone: phone ? 1 : 0,
      email: email ? 0.9 : 0,
      budget: budgetParsed.display ? 0.85 : 0,
      location: preferred_location ? 0.85 : 0,
    },
  };
}
