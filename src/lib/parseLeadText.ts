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
  confidence: {
    name: number;
    phone: number;
    email: number;
    budget: number;
    location: number;
  };
}

const PHONE_RE = /(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}|\+\d{8,15}/g;
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const BUDGET_RE = /(?:₹|rs\.?|inr|budget|under|max|within)\s*[:\-]?\s*([0-9][0-9\s.,/-]*(?:k|l|lac|lakh|cr|crore)?(?:\s*(?:to|-|or)\s*[0-9][0-9\s.,/-]*(?:k|l|lac|lakh|cr|crore)?)?)/i;
const BUDGET_RANGE_RE = /\b\d{1,2}\s*(?:k|K)\s*(?:-|to|or)\s*\d{1,2}\s*(?:k|K)?\b/;
const MOVE_IN_HINT_RE = /(?:move\s*-?in(?:\s*date)?|moving\s*date|move\s*ib|movi\s*in)\s*[:\-]?\s*([^\n]+)/i;
const ROOM_RE = /\b(private|shared|sharing|both|any|2\s*share|double\s*sharing|single\s*sharing)\b/i;
const NEED_RE = /\b(boys\/?coed|girls\/?coed|boys|girls|coed|couple|any)\b/i;

const KV_NAME_RE = /(?:^|\n|\b)name\s*[:\-]?\s*([^\n]+)/i;
const KV_PHONE_RE = /(?:^|\n|\b)(?:phone|mobile|contact|number|whatsapp)\s*[:\-]?\s*([^\n]+)/i;
const KV_EMAIL_RE = /(?:^|\n|\b)(?:email|e-?mail)\s*[:\-]?\s*([^\n]+)/i;
const KV_LOCATION_RE = /(?:preferred\s*location\/?landmark|preferred\s*location|which\s*location|location|area)\s*[:\-]?\s*([^\n]+)/i;
const KV_BUDGET_RE = /(?:budget\s*range|actual\s*budget|budget)\s*[:\-]?\s*([^\n]+)/i;
const KV_MOVE_IN_RE = /(?:move\s*-?in\s*date|moving\s*date|move\s*in\s*date|move\s*ib|movi\s*in)\s*[:\-]?\s*([^\n]+)/i;
const KV_ROOM_RE = /(?:room|private\s*\/\s*sharing|shared\s*\/\s*private)\s*[:\-]?\s*([^\n]+)/i;
const KV_NEED_RE = /(?:need|boys\s*\/\s*girls\s*\/\s*coed|girls\s*\/\s*coed|boys\s*\/\s*coed)\s*[:\-]?\s*([^\n]+)/i;
const KV_SPECIAL_RE = /(?:special\s*requests?|any\s*special\s*expectations?)\s*[:\-]?\s*([^\n]+)/i;

const NEXT_FIELD_RE = /\b(?:phone|mobile|email|preferred\s*location|location|budget|move\s*-?in|moving\s*date|student\/?working|room|need|special\s*requests?)\b\s*[:\-]/i;

const NOISE_RE = /(gharpayy|your\s+superstay\s+awaits|aayushi\s+from\s+gharpayy|take\s*18\s*sec|fill\s*this|not\s*filled|\*+|_+|⚡|🔥|🥵|💛)/gi;

export function parseLeadText(raw: string): ParsedLead {
  if (!raw || !raw.trim()) {
    return empty();
  }

  const normalized = normalizeRaw(raw);

  const nameFromLabel = extractField(normalized, KV_NAME_RE);
  const phoneFromLabel = extractField(normalized, KV_PHONE_RE);
  const emailFromLabel = extractField(normalized, KV_EMAIL_RE);
  const locationFromLabel = extractField(normalized, KV_LOCATION_RE);
  const budgetFromLabel = extractField(normalized, KV_BUDGET_RE);
  const moveInFromLabel = extractField(normalized, KV_MOVE_IN_RE);
  const roomFromLabel = extractField(normalized, KV_ROOM_RE);
  const needFromLabel = extractField(normalized, KV_NEED_RE);
  const specialFromLabel = extractField(normalized, KV_SPECIAL_RE);

  const phone = normalizePhone(phoneFromLabel || findFirst(normalized, PHONE_RE));
  const email = (emailFromLabel || findFirst(normalized, EMAIL_RE) || '').toLowerCase();

  const budgetMatch = budgetFromLabel || extractBudget(normalized);
  const location = cleanupField(locationFromLabel || extractLocation(normalized));

  const moveInDate = cleanupField(moveInFromLabel || extractMoveIn(normalized));
  const profession = cleanupField(extractProfession(normalized));
  const roomType = cleanupField(roomFromLabel || extractRoomType(normalized));
  const needPreference = cleanupField(needFromLabel || extractNeedPreference(normalized));
  const specialRequests = cleanupField(specialFromLabel || extractSpecialRequests(normalized));

  let name = cleanupField(nameFromLabel || extractName(normalized, phone, email));
  if (!name || /^not\s*filled$/i.test(name)) name = '';

  const notes = [
    specialRequests ? '' : extractAmenityHints(normalized),
  ].filter(Boolean).join(', ');

  return {
    name,
    phone,
    email,
    budget: cleanupField(budgetMatch),
    preferred_location: location,
    move_in_date: moveInDate,
    profession,
    room_type: roomType,
    need_preference: needPreference,
    special_requests: specialRequests,
    notes,
    confidence: {
      name: name ? (nameFromLabel ? 0.95 : 0.7) : 0,
      phone: phone ? (phoneFromLabel ? 1 : 0.85) : 0,
      email: email ? (emailFromLabel ? 1 : 0.8) : 0,
      budget: budgetMatch ? (budgetFromLabel ? 0.95 : 0.75) : 0,
      location: location ? (locationFromLabel ? 0.95 : 0.7) : 0,
    },
  };
}

function empty(): ParsedLead {
  return {
    name: '', phone: '', email: '', budget: '', preferred_location: '', move_in_date: '', profession: '', room_type: '', need_preference: '', special_requests: '', notes: '',
    confidence: { name: 0, phone: 0, email: 0, budget: 0, location: 0 },
  };
}

function normalizeRaw(input: string): string {
  return input
    .replace(NOISE_RE, ' ')
    .replace(/\[\d{1,2}:\d{2}[^\]]*\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractField(text: string, re: RegExp): string {
  const match = text.match(re);
  if (!match?.[1]) return '';
  return trimAtNextField(match[1]);
}

function trimAtNextField(value: string): string {
  const next = value.search(NEXT_FIELD_RE);
  const withFieldCut = next >= 0 ? value.slice(0, next) : value;
  return withFieldCut
    .split(/(?:📱|✉️|📍|💰|📆|👨‍💻|🏢|👫|✨|Gharpayy\.com)/i)[0]
    .replace(/[|]+/g, ' ')
    .trim();
}

function normalizePhone(value: string): string {
  if (!value) return '';
  const phoneMatch = value.match(/(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}|\+\d{8,15}/);
  if (!phoneMatch) return value.replace(/\s+/g, '');
  const digits = phoneMatch[0].replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length > 10 && digits.startsWith('0')) return digits.slice(-10);
  if (digits.length > 10 && digits.startsWith('91')) return digits.slice(-10);
  return digits;
}

function findFirst(text: string, re: RegExp): string {
  const m = text.match(re);
  return m?.[0]?.trim() || '';
}

function extractBudget(text: string): string {
  const byLabel = text.match(BUDGET_RE)?.[1]?.trim();
  if (byLabel) return byLabel;
  return text.match(BUDGET_RANGE_RE)?.[0]?.trim() || '';
}

function extractLocation(text: string): string {
  const near = text.match(/(?:near|around|in and around|located near)\s+([^,.]{3,80})/i)?.[1];
  if (near) return near;
  return '';
}

function extractMoveIn(text: string): string {
  const explicit = text.match(MOVE_IN_HINT_RE)?.[1];
  if (explicit) return explicit;
  const relative = text.match(/\b(?:asap|immediate|urgently|next month|within a week|this month)\b/i)?.[0];
  if (relative) return relative;
  const dateLike = text.match(/\b(?:[0-3]?\d(?:st|nd|rd|th)?\s+[A-Za-z]{3,9}(?:\s+\d{2,4})?|[A-Za-z]{3,9}\s+[0-3]?\d(?:st|nd|rd|th)?(?:\s+\d{2,4})?|[0-3]?\d[/-][0-1]?\d(?:[/-]\d{2,4})?)\b/i)?.[0];
  return dateLike || '';
}

function extractProfession(text: string): string {
  if (/\bintern(?:ing)?\b/i.test(text)) return 'intern';
  if (/\bworking\b/i.test(text)) return 'working';
  if (/\bstudent\b/i.test(text)) return 'student';
  return '';
}

function extractRoomType(text: string): string {
  return text.match(ROOM_RE)?.[1] || '';
}

function extractNeedPreference(text: string): string {
  return text.match(NEED_RE)?.[1] || '';
}

function extractSpecialRequests(text: string): string {
  const request = text.match(/(?:special\s*requests?|request)\s*[:\-]?\s*([^\n]+)/i)?.[1];
  if (request) return trimAtNextField(request);
  return '';
}

function extractAmenityHints(text: string): string {
  const hints = text.match(/\b(?:wifi|laundry|parking|food|north indian|pure veg|peaceful|metro|gym|pictures|time constraints?)\b/gi) || [];
  return hints.length ? `Preferences: ${Array.from(new Set(hints.map(h => h.toLowerCase()))).join(', ')}` : '';
}

function extractName(text: string, phone: string, email: string): string {
  let cleaned = text;
  if (phone) cleaned = cleaned.replace(phone, ' ');
  if (email) cleaned = cleaned.replace(email, ' ');
  cleaned = cleaned
    .replace(/name\s*[:\-]?/i, ' ')
    .replace(/\b(?:phone|email|location|budget|move\s*-?in|room|need|special\s*requests?)\b.*$/i, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const candidate = cleaned.match(/[A-Za-z][A-Za-z.'-]*(?:\s+[A-Za-z][A-Za-z.'-]*){0,3}/)?.[0] || '';
  if (!candidate) return '';
  if (/^(?:request|preferred|budget|near|student|working)$/i.test(candidate)) return '';
  return candidate;
}

function cleanupField(value: string): string {
  if (!value) return '';
  return value
    .replace(/\s+/g, ' ')
    .replace(/^[-:.,\s]+|[-:.,\s]+$/g, '')
    .trim();
}
