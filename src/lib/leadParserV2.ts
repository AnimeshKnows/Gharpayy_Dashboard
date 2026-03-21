import { AREAS, GEO_TECH_PARKS, ZONES, fmtAmt, detectAllZones } from './leadGeoData';

// ═══════════════════════════════════════════════════════════════════════
//  TIME + DATE ENGINE
// ═══════════════════════════════════════════════════════════════════════
const MS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ML = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

export type MoveInParsed = {
  raw: string; resolved: Date | null; label: string; urgencyDays: number;
  urgency: "immediate" | "hot" | "warm" | "cold";
};

export function parseMoveInV2(raw: string): MoveInParsed | null {
  if (!raw) return null;
  const now = new Date();
  const t = raw.toLowerCase().replace(/\s+/g, " ").trim();
  const diffDays = (d: Date) => Math.round((d.getTime() - now.getTime()) / 864e5);
  const classify = (days: number): MoveInParsed['urgency'] =>
    days <= 0 ? "immediate" : days <= 10 ? "hot" : days <= 30 ? "warm" : "cold";
  const build = (d: Date, rawStr: string): MoveInParsed => {
    const days = diffDays(d);
    return { raw: rawStr, resolved: d, label: d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }), urgencyDays: Math.max(0, days), urgency: classify(days) };
  };

  if (/\b(immediately|immediate|asap|today|right away|right now|urgent|as soon as)\b/i.test(raw))
    return { raw: t, resolved: now, label: "Immediately", urgencyDays: 0, urgency: "immediate" };

  const comingMatch = raw.match(/(?:coming|reaching|arriving|joining)\s+(?:on\s+)?(\d{1,2}(?:st|nd|rd|th)?\s+\w+|\w+\s+\d{1,2})/i);
  if (comingMatch) { const d = new Date(comingMatch[1] + " " + now.getFullYear()); if (!isNaN(d.getTime())) return build(d, comingMatch[1]); }

  const calMatch = raw.match(/(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday),?\s+(\w+\s+\d{1,2},?\s+\d{4})/i);
  if (calMatch) { const d = new Date(calMatch[1]); if (!isNaN(d.getTime())) return build(d, calMatch[1]); }

  const ordMap: Record<string, number> = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10, eleventh: 11, twelfth: 12, thirteenth: 13, fourteenth: 14, fifteenth: 15, sixteenth: 16, seventeenth: 17, eighteenth: 18, nineteenth: 19, twentieth: 20 };
  for (let i = 0; i < ML.length; i++) {
    if (!t.includes(ML[i]) && !t.includes(MS[i].toLowerCase())) continue;
    const dayNumMatch = raw.match(new RegExp(`(?:${ML[i]}|${MS[i]})\\s+(\\d{1,2})(?:st|nd|rd|th)?`, "i")) ||
      raw.match(new RegExp(`(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(?:${ML[i]}|${MS[i]})`, "i"));
    let day = 1;
    if (dayNumMatch) day = parseInt(dayNumMatch[1]);
    for (const [word, num] of Object.entries(ordMap)) { if (t.includes(word)) { day = num; break; } }
    const year = now.getFullYear() + (i < now.getMonth() ? 1 : 0);
    const d = new Date(year, i, day);
    if (!isNaN(d.getTime())) return build(d, raw.trim());
  }

  if (/\bnext\s+month\b/i.test(t)) return build(new Date(now.getFullYear(), now.getMonth() + 1, 1), "Next month");
  if (/\bthis\s+month\b/i.test(t)) return build(new Date(now.getFullYear(), now.getMonth() + 1, 0), "This month");

  const relMatch = t.match(/(?:in\s+)?(\d+)\s+(day|days|week|weeks)/i);
  if (relMatch) { const n = parseInt(relMatch[1]) * (relMatch[2].startsWith("week") ? 7 : 1); return build(new Date(now.getTime() + n * 864e5), raw.trim()); }

  const slashMatch = raw.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
  if (slashMatch) {
    const [, dd, mm, yy] = slashMatch;
    const year = yy ? (yy.length === 2 ? 2000 + parseInt(yy) : parseInt(yy)) : now.getFullYear();
    const d = new Date(year, parseInt(mm) - 1, parseInt(dd));
    if (!isNaN(d.getTime())) return build(d, raw.trim());
  }

  return { raw: raw.trim(), resolved: null, label: raw.trim(), urgencyDays: 999, urgency: "cold" };
}

export function parseMonth(text: string | undefined) {
  if (!text) return null;
  const t = text.toLowerCase();
  for (let i = 0; i < ML.length; i++)
    if (t.includes(ML[i]) || t.includes(MS[i].toLowerCase()))
      return { index: i, label: MS[i] + " 2025" };
  return null;
}

// ═══════════════════════════════════════════════════════════════════════
//  BUDGET MULTI-RANGE PARSER
// ═══════════════════════════════════════════════════════════════════════
export type BudgetRange = { lo: number; hi: number; display: string };

export function parseBudgetV2(raw: string): { raw: string; ranges: BudgetRange[]; display: string } {
  if (!raw) return { raw: "", ranges: [], display: "" };
  const t = raw.replace(/[₹,\s]/g, "").toLowerCase();
  const toNum = (s: string): number | null => {
    const n = parseFloat(s.replace(/[^\d.]/g, ""));
    if (isNaN(n)) return null;
    if (s.includes("l") || s.includes("lac") || s.includes("lakh")) return n * 100000;
    if (s.includes("cr")) return n * 10000000;
    if (s.includes("k")) return n * 1000;
    return n;
  };
  const rangeRe = /(\d+(?:\.\d+)?(?:k|l|lac(?:s)?|lakh|cr)?)\s*(?:to|-|–)\s*(\d+(?:\.\d+)?(?:k|l|lac(?:s)?|lakh|cr)?)/gi;
  const ranges: BudgetRange[] = [];
  let m;
  while ((m = rangeRe.exec(t)) !== null) {
    const lo = toNum(m[1]), hi = toNum(m[2]);
    if (lo && hi) ranges.push({ lo, hi, display: `₹${fmtAmt(lo)}–${fmtAmt(hi)}` });
  }
  if (!ranges.length) {
    const singleRe = /(\d+(?:\.\d+)?(?:k|l|lac(?:s)?|lakh|cr))/gi;
    const singles: number[] = [];
    let sm;
    while ((sm = singleRe.exec(t)) !== null) { const v = toNum(sm[1]); if (v) singles.push(v); }
    if (singles.length === 1) ranges.push({ lo: singles[0], hi: singles[0], display: `₹${fmtAmt(singles[0])}` });
    else if (singles.length >= 2) ranges.push({ lo: singles[0], hi: singles[singles.length - 1], display: `₹${fmtAmt(singles[0])}–${fmtAmt(singles[singles.length - 1])}` });
  }
  const display = ranges.map(r => r.display).join(" / ");
  return { raw: raw.trim(), ranges, display: display || raw.trim() };
}

// ═══════════════════════════════════════════════════════════════════════
//  EXTRACTORS
// ═══════════════════════════════════════════════════════════════════════
export function extractLocations(raw: string) {
  if (!raw) return { areas: [] as string[], mapLinks: [] as string[], buildingName: "", fullAddress: "" };
  const mapLinks: string[] = [];
  const urlRe = /https?:\/\/(?:share\.google|maps\.app\.goo\.gl|goo\.gl|maps\.google|google\.com\/maps)[^\s)>]*/gi;
  let um; while ((um = urlRe.exec(raw)) !== null) mapLinks.push(um[0]);
  const stripped = raw.replace(urlRe, "").replace(/\[[\d:,\s]+(AM|PM)\]/gi, "").replace(/[📝📱✉️📍💰📆👨🏢👫✨💥💯⚡🔥💛🏙⭐]/g, "").replace(/\*{1,2}([^*\n]+)\*{1,2}/g, "$1");
  const fullAddrRe = /\d+[\w\s,/-]{8,}(?:road|rd|main|cross|layout|nagar|sector|stage|block|phase|colony|street|st)[\w\s,/-]{0,80}/i;
  const fa = fullAddrRe.exec(stripped);
  const fullAddress = fa ? fa[0].replace(/\s+/g, " ").trim() : "";
  const buildingRe = /(?:ground floor|first floor|second floor|third floor|tower|block|wing|flat|apartment|house)[^\n,]{0,60}/im;
  const bm = buildingRe.exec(stripped);
  const buildingName = bm ? bm[0].replace(/\s+/g, " ").trim() : "";
  const locLabel = stripped.match(/(?:Preferred Location|Location|Where|Area|Near)[^:\n]*[:\-–]+\s*([^\n]{3,120})/i);
  let locSource = locLabel ? locLabel[1] : stripped;
  if (fullAddress) locSource = locSource.replace(fullAddress, "");
  const rawSegs = locSource.split(/[,\/]|\bor\b|\band\b/i).map(s => s.replace(/[^\w\s\-]/g, "").replace(/\s+/g, " ").trim()).filter(s => s.length > 2 && s.length < 60);
  const noiseRe = /^(?:bengaluru|bangalore|karnataka|india|near|for\s+men|for\s+women|pg|hostel|\d+)$/i;
  const areas = rawSegs.filter(s => !noiseRe.test(s) && !/^\d+$/.test(s));
  return { areas, mapLinks, buildingName, fullAddress };
}

export function extractPhone(raw: string): string {
  if (!raw) return "";
  const labeled = raw.match(/(?:Phone|Ph|Mobile|Mob|Contact|Number|Cell)\s*[:\-–*]?\s*([\d\s+\-()]{8,18})/i);
  if (labeled) { const m = labeled[1].match(/(?:\+?91[-\s]?)?([6-9]\d{9})/); if (m) return m[0].replace(/\D/g, "").replace(/^91(\d{10})$/, "$1"); }
  const all = Array.from(raw.matchAll(/(?:\+91[-\s]?|91[-\s]?)?([6-9]\d{9})/g));
  if (all.length) { const digits = all[0][0].replace(/\D/g, ""); return digits.startsWith("91") && digits.length === 12 ? digits.slice(2) : digits.slice(-10); }
  return "";
}

export function extractName(raw: string, clean: string): string {
  const labeled = clean.match(/(?:^|\n)\s*(?:📝\s*)?Name\s*[:\-–*]+\s*([^\n,📱\d]{2,45})/im);
  if (labeled) return labeled[1].replace(/[^\w\s\-\.]/g, "").trim();
  const colonName = clean.match(/Name\s*:\s*([A-Z][a-zA-Z\s]{1,35})/);
  if (colonName) return colonName[1].trim();
  const firstLine = clean.split("\n")[0].replace(/\*/g, "").trim();
  if (/^[A-Z][a-zA-Z\s]{1,25}$/.test(firstLine) && !firstLine.match(/\d/)) return firstLine;
  const namePhone = firstLine.match(/^([A-Z][a-zA-Z][a-zA-Z\s]{1,25}?)\s+(?:\+?91[-\s]?)?[6-9]\d{9}/);
  if (namePhone) return namePhone[1].trim();
  return "";
}

export function detectLeadSource(raw: string): string {
  if (/GHARPAYY.*SuperStay|Aayushi|fill this/i.test(raw)) return "L1";
  if (/Share\.google|maps\.app\.goo|goo\.gl\/maps|google\.com\/maps/i.test(raw) || /\d+,\s*\d+(?:th|st|nd|rd)\s+(?:Main|Cross|Road)/i.test(raw)) return "L2";
  if (/📝[\s\S]*Name[\s\S]*📱[\s\S]*Phone[\s\S]*✉️[\s\S]*Email/i.test(raw)) return "L3";
  if (/^[A-Z][a-z]+\s*\n[6-9]\d{9}/m.test(raw)) return "L4";
  if (/Google Calendar|Organizer|Shifting date|WILLING TO PREBOOK/i.test(raw)) return "L5";
  if (/\[\d{2}\/\d{2},\s+\d+:\d+\s+[ap]m\]/i.test(raw)) return "L6";
  return "Manual";
}

// ═══════════════════════════════════════════════════════════════════════
//  FULL LEAD PARSER — V2
// ═══════════════════════════════════════════════════════════════════════
export type ParsedLeadV2 = {
  name: string; phone: string; email: string;
  location: string; areas: string[];
  buildingName: string; fullAddress: string; mapLinks: string[];
  budget: string; budgetRanges: BudgetRange[]; budgetRaw: string;
  moveIn: string; moveInParsed: MoveInParsed | null;
  type: string; room: string; need: string; specialReqs: string;
  inBLR: boolean | null; zone: string; zones: string[];
  techParks: string[]; source: string; quality: string; notes: any[];
  rawText?: string;
};

export function parseLeadV2(raw: string): ParsedLeadV2 | null {
  if (!raw || raw.trim().length < 4) return null;
  const clean = raw.replace(/\*{1,2}([^*\n]+)\*{1,2}/g, "$1").replace(/_{1,3}([^_\n]+)_{1,3}/g, "$1").replace(/`([^`]+)`/g, "$1");

  const phone = extractPhone(raw);
  const name = extractName(raw, clean);
  const emailMatch = raw.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch?.[0] ?? "";
  const locData = extractLocations(raw);
  const areas = locData.areas.length ? locData.areas : [];
  const location = areas.join(", ");

  const budgetRaw = (() => {
    const patterns = [/(?:Budget Range|Actual budget|Budget|Budjet)\s*[:\-–(]+\s*([^\n)📆👨🏢]{2,80})/i];
    for (const re of patterns) { const m = clean.match(re); if (m?.[1]) return m[1].replace(/[₹\[\]]/g, "").trim(); }
    const inline = clean.match(/\b(\d{1,2}k?\s*[-–to]+\s*\d{1,2}k(?:\s*(?:\/mo|per month|monthly|pm)?)?)\b/i);
    return inline ? inline[1] : "";
  })();
  const budgetParsed = parseBudgetV2(budgetRaw);

  const moveInRaw = (() => {
    const labeled = clean.match(/Move[- ]?in[- ]?(?:Date)?\s*[:\-–*]+\s*([^\n👨🏢👫✨]{2,60})/i) || clean.match(/Moving Date\s*[:\-–]+\s*([^\n]{2,40})/i) || clean.match(/Date[:\s]+([^\n]{2,40})/i);
    if (labeled?.[1]) return labeled[1].trim();
    const cal = raw.match(/(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday),?\s+[A-Z][a-z]+\s+\d{1,2},?\s+\d{4}/i);
    if (cal) return cal[0];
    const chat = raw.match(/(?:coming|reaching|arriving|joining)\s+(?:on\s+)?(?:\d{1,2}(?:st|nd|rd|th)?\s+\w+|\w+\s+\d{1,2})/i);
    if (chat) return chat[0];
    if (/next\s+month/i.test(raw)) return "next month";
    if (/immediately|immediate|asap|today/i.test(raw)) return "immediately";
    return "";
  })();
  const moveInParsed = parseMoveInV2(moveInRaw);

  const isWorking = /\bworking\b|\bprofessional\b|\bemployed\b/i.test(clean);
  const isStudent = /\bstudent\b/i.test(clean);
  const isIntern = /\bintern(?:ing)?\b/i.test(clean);
  const type = isWorking && isStudent ? "Student/Working" : isWorking ? "Working" : isStudent ? "Student" : isIntern ? "Intern" : "";

  const roomRaw = (clean.match(/Room\s*[*:\-–(]+\s*([^\n👫✨📞]{2,30})/i)?.[1] || "").toLowerCase();
  const hasPrivate = /private|single/i.test(roomRaw) || /\b(private|single)\s+(?:room|occupancy)\b/i.test(clean);
  const hasShared = /shared/i.test(roomRaw) || /\bshared\b/i.test(clean);
  const room = hasPrivate && hasShared ? "Both" : hasPrivate ? "Private" : hasShared ? "Shared" : "";

  const needRaw = (clean.match(/NEED\s*[*:\-–(]+\s*([^\n✨📞]{2,40})/i)?.[1] || clean.match(/Need\s*[:\-–]+\s*([^\n]{2,40})/i)?.[1] || "").toLowerCase();
  const wantGirls = needRaw.includes("girl") || /\bgirls?\b/i.test(clean);
  const wantBoys = needRaw.includes("boy") || /\bboys?\b/i.test(clean);
  const wantCoed = needRaw.includes("coed") || /\bco[\s-]?living\b/i.test(clean);
  const need = [wantGirls ? "Girls" : "", wantBoys ? "Boys" : "", wantCoed ? "Coed" : ""].filter(Boolean).join(" / ");

  const specialReqs = (clean.match(/Special Requests?\s*[*:\-–(]+\s*([^\n*📞]{2,200})/i)?.[1] || "").replace(/NA|None|n\/a|If any/gi, "").trim();

  let inBLR: boolean | null = null;
  const blrQ = raw.search(/Are you in Bangalore|in bangalore currently/i);
  if (blrQ > -1) {
    const after = raw.slice(blrQ);
    if (/\byes\b|i'?m in bangalore/i.test(after)) inBLR = true;
    else if (/\bno\b|not in bangalore|outside/i.test(after)) inBLR = false;
  }
  if (inBLR === null) {
    if (/\bin\s*blr\b|in bangalore|currently in bangalore|already in/i.test(raw)) inBLR = true;
    else if (/not in blr|not in bangalore|outside bangalore|relocating|will be coming/i.test(raw)) inBLR = false;
  }

  const zones = detectAllZones(raw);
  const zone = zones[0] ?? "";
  const detectedTechParks = GEO_TECH_PARKS.filter(p => p.kw.some(k => raw.toLowerCase().includes(k))).map(p => p.name);
  const source = detectLeadSource(raw);

  let autoQuality = "good";
  if (moveInParsed?.urgency === "immediate" || moveInParsed?.urgency === "hot") autoQuality = "hot";

  // Always return whatever we parsed — user can manually fill missing fields

  return {
    name, phone, email, location, areas,
    buildingName: locData.buildingName, fullAddress: locData.fullAddress, mapLinks: locData.mapLinks,
    budget: budgetParsed.display, budgetRanges: budgetParsed.ranges, budgetRaw: budgetParsed.raw,
    moveIn: moveInParsed?.label || moveInRaw, moveInParsed,
    type, room, need, specialReqs, inBLR, zone, zones,
    techParks: detectedTechParks, source, quality: autoQuality, notes: [],
  };
}

// ═══════════════════════════════════════════════════════════════════════
//  BULK SPLITTER
// ═══════════════════════════════════════════════════════════════════════
export function splitLeads(text: string): string[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const chunks: string[] = [];
  let cur: string[] = [];
  const isOpener = (line: string) => {
    const t = line.trim();
    if (t.length < 3) return false;
    return /^📝/.test(t) || /^GHARPAYY/i.test(t) || /^(?:\*?\s*Name\s*[:\-–*])/i.test(t) || /^Name\s*[-–]/i.test(t) || /^\.Name\s/i.test(t) || /^\[[\d:]+\s*(AM|PM),\s*\d/.test(t) || /^[A-Z][a-zA-Z]{1,20}\s+[6-9]\d{9}/.test(t) || /^(?:\+91[-\s]?)?[6-9]\d{9}\b/.test(t) || /^Name\s*:/i.test(t) || /^\*Name:/i.test(t);
  };
  const isJunk = (line: string) => { const t = line.trim(); return !t || /^(not filled|no|n\/a|xyz|na)$/i.test(t) || /^[\-–=*_]{3,}$/.test(t); };
  for (const line of lines) {
    if (isJunk(line)) { if (cur.length) { chunks.push(cur.join("\n")); cur = []; } continue; }
    if (!cur.length) { cur.push(line); } else if (isOpener(line)) { chunks.push(cur.join("\n")); cur = [line]; } else { cur.push(line); }
  }
  if (cur.length) chunks.push(cur.join("\n"));
  return chunks.filter(c => c.trim().length > 5);
}
