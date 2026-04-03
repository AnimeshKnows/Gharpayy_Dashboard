"use client";

import { useState, useMemo, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import { useLeads, useUpdateLead, useCreateVisit, useAgents } from '@/hooks/useCrmData';
import {
  Sparkles, MapPin, Users, Loader2, ChevronRight, Navigation,
  Search, Brain, Target, DollarSign, X, SlidersHorizontal, Calendar, Check, ChevronDown, ChevronUp, List, Grid, Map, ShieldAlert, FileText
} from 'lucide-react';
import brochureMap from '@/data/brochureMap.json';
import { useRoomStore, type VisitData, type RoomState } from '@/hooks/useInventoryStore';
import { ROOM_MASTER, getRoomsForPG, type Room } from '@/data/roomMasterData';
import { haversine, resolveLocationToCoords } from '@/lib/areaCoordinates';
import { parseRoomEntries } from '@/lib/parseRoomEntries';
import { ZONES, SUBZONE_MAPPING, getZoneByArea } from '@/lib/zones';
import { AREAS_LIST, getSubAreasForArea, matchPropertyToGeo, GEO_MASTER } from '@/lib/geoMaster';
import SearchableSelect from '@/components/SearchableSelect';
import { T, GlobalStyles, Card, Btn, Label } from '@/components/Gharpayy3X';
import { PG_DATA, type PGEntry } from '@/data/pgMasterData';
import { fetchLivePGData, normalizeArea } from '@/lib/sheetsSync';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

// --- GEODATA MAPPING ---
// Dynamically derived from PG_DATA in the component

// ─── MEGA DATABASE INTELLIGENCE ────────────────────────────────
const LEAD_MATCHER_INTEL: Record<string, { budget: string; demand: string; demandLevel: number; companies: string; subAreas: string[]; commute: string; profile: string; }> = {
  "koramangala":      { budget:"₹8,000–25,000",  demand:"Very High", demandLevel:5, companies:"CRED, Swiggy, Zepto, Razorpay, Postman",          subAreas:["koramangala 4th block","koramangala 6th block","btm layout","ejipura"],          commute:"10–30 min walk/auto",     profile:"IT professionals, startup employees, fintech workers" },
  "hsr layout":       { budget:"₹7,000–22,000",  demand:"Very High", demandLevel:5, companies:"Groww, Chargebee, Khatabook, Slice, Fi Money",     subAreas:["hsr sector 1","hsr sector 2","hsr sector 3","agara lake"],                      commute:"10–25 min walk/auto",     profile:"FinTech, EdTech, WealthTech professionals" },
  "whitefield":       { budget:"₹7,000–18,000",  demand:"Very High", demandLevel:5, companies:"SAP Labs, Oracle, Wipro, HCL, Kalyani Tech Park",  subAreas:["whitefield main rd","itpl road","hope farm","brookefield","hoodi"],             commute:"5–20 min auto/bus",       profile:"IT professionals from IT parks" },
  "bellandur":        { budget:"₹8,000–22,000",  demand:"Very High", demandLevel:5, companies:"Google, Cisco, Flipkart, Meesho, Embassy TV",      subAreas:["bellandur main road","harlur road","iblur junction","kadubeesanahalli"],        commute:"10–20 min auto",          profile:"GCC and tech workers, ORR corridor" },
  "marathahalli":     { budget:"₹6,000–16,000",  demand:"Very High", demandLevel:5, companies:"Prestige Tech Park, Bagmane WTC, ORR companies",   subAreas:["marathahalli bridge","marathahalli colony","aecs layout","kundalahalli"],       commute:"10–15 min auto/bus",      profile:"IT professionals from ORR and Whitefield" },
  "electronic city":  { budget:"₹5,000–14,000",  demand:"Very High", demandLevel:5, companies:"Infosys, Wipro, HCL, TCS, Biocon",                 subAreas:["ec phase 1","ec phase 2","hebbagodi","singasandra","chandapura"],               commute:"5–15 min auto/bus",       profile:"IT professionals, BPO workers" },
  "indiranagar":      { budget:"₹10,000–30,000", demand:"Very High", demandLevel:5, companies:"Deutsche Bank EGL, Domlur companies, expats",      subAreas:["100 feet road","cmh road","12th main","defence colony"],                       commute:"10–20 min to Domlur",     profile:"Premium professionals, MNC workers, expats" },
  "hebbal":           { budget:"₹7,000–18,000",  demand:"Very High", demandLevel:5, companies:"Manyata Tech Park (JP Morgan, Wells Fargo, IBM)",  subAreas:["hebbal kere","sahakar nagar","bellary road","thanisandra","nagawara"],          commute:"5–15 min auto/bus",       profile:"IT professionals from Manyata and Hebbal parks" },
  "manyata":          { budget:"₹6,500–17,000",  demand:"Very High", demandLevel:5, companies:"IBM, Microsoft, JP Morgan, Wells Fargo",           subAreas:["thanisandra main road","manyata layout","nagawara","hennur road"],              commute:"5–10 min walk/auto",      profile:"IT professionals near Manyata Tech Park" },
  "mg road":          { budget:"₹12,000–35,000", demand:"Very High", demandLevel:5, companies:"MNC offices, Big4, BFSI companies",                subAreas:["richmond town","residency road","vasanthnagar","lavelle road"],                 commute:"Walking distance",        profile:"Corporate professionals, BFSI, expats" },
  "btm layout":       { budget:"₹5,500–15,000",  demand:"Very High", demandLevel:5, companies:"Adjacent to Koramangala and HSR ecosystem",        subAreas:["btm layout stage 1","btm layout stage 2","madiwala"],                          commute:"5–15 min metro/bus",      profile:"Startup employees, tech workers, students" },
  "sarjapur road":    { budget:"₹7,000–20,000",  demand:"Very High", demandLevel:5, companies:"RMZ Ecospace, Cessna, Pritech, Prestige TP",       subAreas:["orr marathahalli","orr bellandur","kadubeesanahalli","sarjapur town"],         commute:"5–15 min from ORR",       profile:"Tech workers across multiple ORR parks" },
  "jp nagar":         { budget:"₹5,500–14,000",  demand:"High",      demandLevel:4, companies:"Apollo, Narayana, NIMHANS, nearby IT",             subAreas:["jp nagar 1-9 phase","bannerghatta road","gottigere"],                          commute:"Jayadeva Hospital Metro", profile:"Healthcare workers, IT professionals" },
  "malleswaram":      { budget:"₹7,000–18,000",  demand:"High",      demandLevel:4, companies:"IISc, ISRO, DRDO, MS Ramaiah",                    subAreas:["malleswaram 8th cross","iisc campus area","new bel road"],                     commute:"Mahalakshmi Metro",       profile:"Researchers, IISc, ISRO workers" },
  "cv raman nagar":   { budget:"₹5,000–13,000",  demand:"High",      demandLevel:4, companies:"Bagmane Tech Park, Dell, Samsung, DRDO",           subAreas:["cv raman nagar","banaswadi","kalyan nagar","hrbr layout"],                     commute:"Banaswadi Metro (Green)", profile:"IT workers from Bagmane, DRDO" },
  "rajajinagar":      { budget:"₹5,000–13,000",  demand:"High",      demandLevel:4, companies:"BEL, BHEL, KC General workers",                   subAreas:["rajajinagar 1st-6th block","rajajinagar industrial"],                          commute:"Metro nearby (Green Line)", profile:"BEL workers, industrial, some IT" },
  "bannerghatta road":{ budget:"₹5,500–15,000",  demand:"High",      demandLevel:4, companies:"IIM Bangalore, Apollo, Fortis, IT workers",        subAreas:["bannerghatta road near jayadeva","arekere","hulimavu"],                        commute:"Jayadeva Hospital Metro", profile:"IT/healthcare professionals" },
  "old airport road": { budget:"₹7,500–20,000",  demand:"High",      demandLevel:4, companies:"HAL, NAL, Diamond District, EGL workers",          subAreas:["domlur","hal 2nd stage","ulsoor","murugeshpalya"],                             commute:"HAL Metro (Purple Line)", profile:"IT, HAL, NAL workers" },
  "jayanagar":        { budget:"₹5,500–15,000",  demand:"High",      demandLevel:4, companies:"St Johns, KIMS, NIMHANS staff",                   subAreas:["jayanagar 4th block","jayanagar 9th block"],                                   commute:"Jayadeva Hospital Metro", profile:"Medical college students, hospital staff" },
  "peenya":           { budget:"₹4,000–10,000",  demand:"Medium",    demandLevel:3, companies:"BEL, Peenya industrial workers, HMT",              subAreas:["peenya industrial","jalahalli","yeshwanthpur adj"],                            commute:"Peenya Metro (Green Line)", profile:"Industrial workers, manufacturing employees" },
  "yelahanka":        { budget:"₹4,500–11,000",  demand:"Medium",    demandLevel:3, companies:"IAF Yelahanka, CRPF, defence establishments",      subAreas:["yelahanka new town","yelahanka old town","air force area"],                    commute:"Yelahanka Metro (Yellow)", profile:"Air force staff, CRPF, DRDO, JNCASR" },
  "kengeri":          { budget:"₹4,000–10,000",  demand:"Medium",    demandLevel:3, companies:"Global Village Tech Park, HP India workers",       subAreas:["kengeri","uttarahalli","global village area","mysore road"],                   commute:"Mysore Road/Kengeri Metro", profile:"IT workers at Global Village, budget seekers" },
  "nagarbhavi":       { budget:"₹4,500–12,000",  demand:"Medium",    demandLevel:3, companies:"NLSIU, RVCE, Global Village adj",                  subAreas:["nagarbhavi","nyanappanahalli","nlsiu area"],                                   commute:"Mysore Road Metro",       profile:"Law students, IT workers at Global Village" },
  "devanahalli":      { budget:"₹5,000–12,000",  demand:"Medium",    demandLevel:3, companies:"HAL Aerospace SEZ, Rolls Royce, Boeing",           subAreas:["devanahalli","aerospace park","bial adj"],                                     commute:"BIAL Airport (Yellow Line)", profile:"Aerospace, aviation, airport staff" },
};

const COMPANY_AREA_MAP: Record<string, string> = {
  "google":"bellandur","cisco":"bellandur","flipkart":"bellandur","meesho":"bellandur","embassy":"bellandur",
  "swiggy":"koramangala","cred":"koramangala","razorpay":"koramangala","zepto":"koramangala","postman":"koramangala",
  "groww":"hsr layout","chargebee":"hsr layout","khatabook":"hsr layout","slice":"hsr layout",
  "infosys":"electronic city","wipro":"electronic city","hcl":"electronic city","tcs":"whitefield","biocon":"electronic city",
  "sap labs":"whitefield","oracle":"whitefield","intel":"whitefield","kalyani":"whitefield",
  "jp morgan":"hebbal","wells fargo":"hebbal","ibm":"hebbal","microsoft":"hebbal","manyata":"hebbal",
  "accenture":"bellandur","deloitte":"bellandur","ey":"bellandur","kpmg":"bellandur",
  "amazon":"whitefield","bosch":"koramangala","dell":"cv raman nagar","samsung":"cv raman nagar",
  "bagmane":"cv raman nagar","isro":"malleswaram","iisc":"malleswaram","drdo":"malleswaram",
  "narayana":"jp nagar","apollo":"jp nagar","nimhans":"jp nagar","fortis":"bannerghatta road",
  "hal":"old airport road","nal":"old airport road",
  "bel road":"rajajinagar","bhel":"rajajinagar",
  "prestige":"sarjapur road","rmz":"sarjapur road","cessna":"sarjapur road",
};

const DEMAND_COLORS: Record<string, string> = { "Very High": T.green, "High": T.amber, "Medium": T.blue, "Low": T.t2 };
// All areas derived from PG_DATA — same source as inventory
const ALL_PG_AREAS = Array.from(new Set(PG_DATA.map(p => p.area).filter(Boolean))).sort();
const HOT_ZONES = ALL_PG_AREAS;

// ─── HELPERS ───────────────────────────────────────────────────
// Robust area/landmark detection from text — returns an array of ALL matches
function detectAreasFromText(text: string): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  const cleaned = lower.replace(/[\s\/-]/g, ''); 
  
  const matches = new Set<string>();

  // 1. Try PG_DATA areas
  const pgAreas = Array.from(new Set(PG_DATA.map(p => p.area.toLowerCase()))).sort((a, b) => b.length - a.length);
  for (const area of pgAreas) {
    const areaLower = area.toLowerCase();
    const areaCleaned = areaLower.replace(/\s/g, '');
    if (lower.includes(areaLower) || cleaned.includes(areaCleaned)) {
      matches.add(normalizeArea(areaLower));
    }
  }

  // 2. Extra keywords check
  if (lower.includes('hsr')) matches.add('HSR Layout');
  if (lower.includes('btm')) matches.add('BTM Layout');
  if (lower.includes('kora')) matches.add('Koramangala');
  if (lower.includes('bellandur')) matches.add('Bellandur');
  if (lower.includes('jp') || lower.includes('j.p')) matches.add('JP Nagar');
  if (lower.includes('jaya')) matches.add('Jayanagar');
  if (lower.includes('whitefield')) matches.add('Whitefield');
  if (lower.includes('e city') || lower.includes('ecity') || lower.includes('e-city')) matches.add('Electronic City');
  if (lower.includes('indira') || lower.includes('indra')) matches.add('Indiranagar');
  if (lower.includes('domlur')) matches.add('Domlur');
  if (lower.includes('sarjapur')) matches.add('Sarjapur Road');
  if (lower.includes('hebbal') || lower.includes('manyata')) matches.add('Hebbal');

  return Array.from(matches);
}

// Wrapper for single area detection (returns the first match)
function detectAreaFromText(text: string): string {
  const areas = detectAreasFromText(text);
  return areas.length > 0 ? areas[0] : '';
}

function getBrochureUrl(name: string): string | null {
  if (!name) return null;
  const map = brochureMap as Record<string, string>;
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const key = normalize(name.replace(/^gharpayy\s+/i, '').replace(/^gg\s+/i, ''));
  if (map[key]) return `/brochures/${map[key]}`;
  const first = name.trim().split(/\s+/)[0]?.toLowerCase();
  if (map[first]) return `/brochures/${map[first]}`;
  const all = Object.keys(map);
  const substr = all.find(k => key.includes(k) || k.includes(key));
  if (substr) return `/brochures/${map[substr]}`;
  return null;
}

function parseLeadText(raw: string) {
  if (!raw || raw.trim().length < 4) return null;
  const clean = raw.replace(/\*{1,2}([^*\n]+)\*{1,2}/g, "$1");
  const lower = clean.toLowerCase();
  
  const grab = (...patterns: RegExp[]) => {
    for (const re of patterns) { const m = clean.match(re); if (m?.[1]) return m[1].replace(/[^\w\s,\.:\(\)\/\-]/g, "").trim(); }
    return "";
  };
  
  const name = grab(/(?:^|\n)\s*Name\s*[:\-–]+\s*([^\n,\d]{2,40})/im).trim();
  const phoneMatch = clean.match(/(?:\+?91[-\s]?)?([6-9]\d{9})/);
  const phone = phoneMatch ? phoneMatch[0].replace(/\D/g, "") : "";
  const location = grab(/(?:Preferred\s+)?Location[^:\n]*[:\-–]+\s*([^\n]{3,80})/i, /Area\s*[:\-–]+\s*([^\n]{3,50})/i).trim();
  
  // Enhanced budget detection
  let budget = grab(/(?:Actual budget|Budget Range|Budget)\s*[:\-–(]+\s*([^\n)]{2,35})/i).trim();
  if (!budget) {
    // Look for patterns like "15k", "20000", "15-20k"
    const budgetMatch = clean.match(/(\d{1,2}k|\d{4,6})(?:\s*-\s*(\d{1,2}k|\d{4,6}))?/i);
    if (budgetMatch) budget = budgetMatch[0];
  }

  const genderRaw = grab(/Need[^:\n]*[:\-–]+\s*([^\n]{2,35})/i).toLowerCase();
  const moveIn = grab(/Move[-\s]?in[-\s]?Date\s*[:\-–]+\s*([^\n]{2,35})/i).trim();
  
  let gender = "";
  if (genderRaw.includes("girl") || /\bgirls?\b/i.test(clean)) gender = "Girls";
  else if (genderRaw.includes("boy") || /\bboys?\b/i.test(clean)) gender = "Boys";
  else if (genderRaw.includes("co") || genderRaw.includes("mix") || /\bcoed\b/i.test(clean)) gender = "coed";
  
  const canonicalArea = detectAreaFromText(location || raw);
  
  const prefs = [];
  if (lower.includes('balcony')) prefs.push('balcony');
  if (lower.includes('gym')) prefs.push('gym');
  if (lower.includes('ac') || lower.includes('air cond')) prefs.push('ac');
  if (lower.includes('parking') || lower.includes('2w') || lower.includes('4w')) prefs.push('parking');
  if (lower.includes('clean') || lower.includes('housekeeping')) prefs.push('cleaning');
  if (lower.includes('premium') || lower.includes('luxury') || lower.includes('high end')) prefs.push('premium');

  return { name, phone, location, canonicalArea, budget, gender, moveIn, preferences: prefs };
}

async function geocodeAddress(address: string): Promise<any> {
  if (!GOOGLE_API_KEY) return null;
  try {
    const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address + ", Bengaluru, Karnataka, India")}&key=${GOOGLE_API_KEY}`);
    const data = await res.json();
    if (data.status === "OK" && data.results.length > 0) {
      const { lat, lng } = data.results[0].geometry.location;
      return { lat, lng, name: data.results[0].formatted_address };
    }
  } catch (e) { console.error("Geocoding", e); }
  return null;
}

function getMinPrice(p: any) {
  // Try minPrice field first (from pgMasterData)
  if (p.minPrice && p.minPrice > 5000) return p.minPrice;
  
  // Try T/D/S price fields
  const prices = [p.triplePrice, p.doublePrice, p.singlePrice]
    .filter((v): v is number => typeof v === 'number' && v > 5000 && v < 500000);
  if (prices.length > 0) return Math.min(...prices);
  
  // Try parsed room entries (for geo-matched properties)
  const rooms = parseRoomEntries(p.price || '', p.lows || '', p.priceMin || '', p.priceMax || '');
  const parsedPrices = rooms.map((r: any) => r.price).filter((v: any) => v && v > 5000 && v < 500000);
  if (parsedPrices.length > 0) return Math.min(...parsedPrices);

  // Try to find matching PG in master data by name
  const masterMatch = PG_DATA.find(pg =>
    pg.name.toLowerCase() === (p.name || '').toLowerCase() ||
    pg.id === p.id
  );
  if (masterMatch) {
    const mp = [masterMatch.triplePrice, masterMatch.doublePrice, masterMatch.singlePrice]
      .filter((v): v is number => typeof v === 'number' && v > 5000 && v < 500000);
    if (mp.length > 0) return Math.min(...mp);
  }

  return 0;
}

const formatPrice = (price: number) => {
  if (!price || price <= 0) return '₹—';
  return `from ₹${Math.round(price / 1000)}k/mo`;
};

function parseBudget(str: string): number {
  if (!str) return 0;
  const clean = str.toString().toLowerCase().replace(/[^\d.k]/g, '');
  if (clean.includes('k')) {
    return parseFloat(clean.replace('k', '')) * 1000;
  }
  const val = parseInt(clean);
  return isNaN(val) ? 0 : val;
}

function calculateMatchScore(p: PGEntry, lead: any) {
  if (!lead) return 100;

  let score = 0;
  
  // 1. Gender (CRITICAL: 40 points)
  if (lead.gender && p.gender) {
    const pgG = p.gender.toLowerCase();
    const leadG = lead.gender.toLowerCase();
    const isBoy = leadG.includes('boy') || leadG.includes('male');
    const isGirl = leadG.includes('girl') || leadG.includes('female');
    
    if (isBoy && pgG.includes('girl')) return 0;
    if (isGirl && pgG.includes('boy')) return 0;
    
    // Exact match or Co-live match
    if (isBoy && pgG.includes('boy')) score += 40;
    else if (isGirl && pgG.includes('girl')) score += 40;
    else if (pgG.includes('co')) score += 35; // Co-live is a good match but not exact
    else score += 20;
  } else {
    score += 40; 
  }

  // 2. Budget (25 points)
  const minP = getMinPrice(p);
  const leadB = parseBudget(lead.budget);
  if (leadB > 1000 && minP > 0) {
    if (minP <= leadB) {
      // Bonus for being well under budget
      const savings = leadB - minP;
      if (savings > 5000) score += 25;
      else if (savings > 2000) score += 22;
      else score += 20;
    } else {
      const diff = minP - leadB;
      if (diff <= 1000) score += 15; // Barely over
      else if (diff <= 3000) score += 8; // Acceptable
      else score += 0;
    }
  } else {
    score += 15;
  }

  // 3. Distance / Location (25 points)
  if (p.distanceKm !== undefined && p.distanceKm !== 999) {
    if (p.distanceKm <= 0.5) score += 25;
    else if (p.distanceKm <= 1.5) score += 20;
    else if (p.distanceKm <= 3) score += 12;
    else if (p.distanceKm <= 5) score += 5;
  } else {
    const lArea = (lead.location || '').toString().toLowerCase();
    const pArea = (p.area || '').toString().toLowerCase();
    if (lArea && pArea && (lArea.includes(pArea) || pArea.includes(lArea))) {
      score += 20;
    } else {
      score += 5;
    }
  }

  // 4. Preferences & Amenities (10 points)
  const pAmenityString = (Array.isArray(p.amenities) ? p.amenities.join(' ') : (p.amenities || '')).toLowerCase();
  const pAllText = (JSON.stringify(p) + pAmenityString).toLowerCase();
  
  if (lead.preferences?.length > 0) {
    let prefMatches = 0;
    lead.preferences.forEach((pref: string) => {
      if (pAllText.includes(pref.toLowerCase())) prefMatches++;
    });
    score += (prefMatches / lead.preferences.length) * 10;
  } else {
    score += 5; 
  }

  // Tie breakers / Availability penalty
  if (p.availability === 0) score -= 15;
  if (p.priority === 'super urgent' || p.priority === 'PUSH') score += 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

// ─── FILTER CHIP ───────────────────────────────────────────────
function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5, background:T.goldD, border:`1px solid ${T.goldB}`, color:T.gold, borderRadius:100, fontFamily:T.mono, fontSize:10, fontWeight:600, padding:"2px 8px 2px 10px" }}>
      {label}
      <button onClick={onRemove} style={{ background:"none", border:"none", cursor:"pointer", color:T.gold, display:"flex", alignItems:"center", padding:0 }}><X size={10} /></button>
    </span>
  );
}

// ─── INTEL PANEL ───────────────────────────────────────────────
function IntelPanel({ area }: { area: string }) {
  const intel = LEAD_MATCHER_INTEL[area.toLowerCase()];
  if (!intel) return null;
  const dc = DEMAND_COLORS[intel.demand] || T.t2;
  return (
    <div className="gp-fade" style={{ background:T.bg2, border:`1px solid ${T.goldB}`, borderRadius:12, padding:"18px 20px", display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <Brain size={14} style={{ color:T.gold }} />
        <span style={{ fontFamily:T.mono, fontSize:10, fontWeight:700, color:T.gold, letterSpacing:"0.08em" }}>MEGA INTELLIGENCE · {area.toUpperCase()}</span>
      </div>
      <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
        <div style={{ background:T.bg3, border:`1px solid ${T.line}`, borderRadius:8, padding:"8px 14px", flex:1, minWidth:100 }}>
          <div style={{ fontFamily:T.mono, fontSize:8, color:T.t2, marginBottom:4, letterSpacing:"0.08em" }}>BUDGET RANGE</div>
          <div style={{ fontSize:14, fontWeight:700, color:T.t0 }}>{intel.budget}</div>
        </div>
        <div style={{ background:T.bg3, border:`1px solid ${dc}40`, borderRadius:8, padding:"8px 14px", flex:1, minWidth:100 }}>
          <div style={{ fontFamily:T.mono, fontSize:8, color:T.t2, marginBottom:4, letterSpacing:"0.08em" }}>PG DEMAND</div>
          <div style={{ fontSize:14, fontWeight:700, color:dc }}>{intel.demand}</div>
        </div>
        <div style={{ background:T.bg3, border:`1px solid ${T.line}`, borderRadius:8, padding:"8px 14px", flex:1, minWidth:100 }}>
          <div style={{ fontFamily:T.mono, fontSize:8, color:T.t2, marginBottom:4, letterSpacing:"0.08em" }}>COMMUTE</div>
          <div style={{ fontSize:12, fontWeight:600, color:T.t1 }}>{intel.commute}</div>
        </div>
      </div>
      <div style={{ fontSize:12, color:T.t2 }}><span style={{ color:T.t1, fontWeight:600 }}>Target: </span>{intel.companies}</div>
      <div style={{ fontSize:11, color:T.t2 }}><span style={{ color:T.t1, fontWeight:600 }}>Profile: </span>{intel.profile}</div>
      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
        {intel.subAreas.slice(0,4).map(s => (
          <span key={s} style={{ background:T.bg3, border:`1px solid ${T.line}`, borderRadius:4, fontFamily:T.mono, fontSize:9, color:T.t2, padding:"2px 7px" }}>{s}</span>
        ))}
      </div>
    </div>
  );
}


// ─── STATUS CFG AND ROOM ROW ───────────────────────────────────────
const STATUS_CFG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  LOCKED:      { label: 'Live',       color: '#22C55E', bg: 'rgba(34,197,94,0.1)',   dot: '#22C55E' },
  AVAILABLE:   { label: 'Live',       color: '#22C55E', bg: 'rgba(34,197,94,0.1)',   dot: '#22C55E' },
  APPROVED:    { label: 'Live',       color: '#22C55E', bg: 'rgba(34,197,94,0.1)',   dot: '#22C55E' },
  SOFT_LOCKED: { label: 'Tour Hold', color: '#60A5FA', bg: 'rgba(96,165,250,0.1)',   dot: '#60A5FA' },
  HARD_LOCKED: { label: 'Pre-Booked',color: '#A78BFA', bg: 'rgba(167,139,250,0.1)',  dot: '#A78BFA' },
  OCCUPIED:    { label: 'Occupied',   color: '#EF4444', bg: 'rgba(239,68,68,0.1)',   dot: '#EF4444' },
};

const RoomRow = ({ room, state }: { room: Room; state: RoomState }) => {
  const cfg = STATUS_CFG[state.status] || STATUS_CFG.LOCKED;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: 6, marginBottom: 4 }}>
      <div style={{ width: 28, height: 28, borderRadius: 5, background: T.bg3, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${T.line}`, fontFamily: T.mono, fontSize: 10, color: T.t0, fontWeight: 700 }}>{room.num}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: T.sans, fontSize: 11, color: T.t0, fontWeight: 600 }}>{room.type}</div>
      </div>
      <div style={{ background: cfg.bg, borderRadius: 3, padding: '1px 4px', border: `1px solid ${cfg.color}20` }}>
        <span style={{ fontFamily: T.mono, fontSize: 7, color: cfg.color, fontWeight: 700 }}>{cfg.label.toUpperCase()}</span>
      </div>
      <div style={{ textAlign: 'right', minWidth: 60 }}>
        <div style={{ fontFamily: T.mono, fontSize: 11, color: T.t1, fontWeight: 700 }}>₹{(state.retailPrice || state.expectedRent || room.basePrice).toLocaleString()}</div>
      </div>
    </div>
  );
};

// ─── MAIN PROPERTY CARD ───────────────────────────────
const PropertyCard = ({
  pg, idx, pgRooms, onScheduleVisit, onClick, lead, viewMode = 'grid'
}: {
  pg: PGEntry;
  idx: number;
  pgRooms: (Room & { state: RoomState })[];
  onScheduleVisit: () => void;
  onClick?: () => void;
  lead?: any;
  viewMode?: 'grid' | 'list';
}) => {
  const [expanded, setExpanded]           = useState(false);
  const [roomsExpanded, setRoomsExpanded]   = useState(false);
  const [copiedWA, setCopiedWA]             = useState(false);
  const [copiedMap, setCopiedMap]           = useState(false);
  
  const minPrice = getMinPrice(pg);
  const matchPercent = lead ? calculateMatchScore(pg, lead) : 100;

  const genderConfig = pg.gender?.toLowerCase().includes('girl') || pg.gender?.toLowerCase().includes('female')
    ? { color: '#EC4899', bg: 'rgba(236,72,153,0.08)', border: 'rgba(236,72,153,0.22)', label: 'Girls' }
    : pg.gender?.toLowerCase().includes('boy') || pg.gender?.toLowerCase().includes('male')
      ? { color: T.blue, bg: T.blueD, border: T.blueB, label: 'Boys' }
      : { color: T.t1, bg: T.bg3, border: T.line, label: 'coed' };

  const copyWA = (e: React.MouseEvent) => {
    e.stopPropagation();
    const t_was = pg.triplePrice ? Math.round((pg.triplePrice + 2000)/1000) : 15;
    const t_now = pg.triplePrice ? Math.round(pg.triplePrice/1000) : 13;
    const d_was = pg.doublePrice ? Math.round((pg.doublePrice + 2000)/1000) : 18;
    const d_now = pg.doublePrice ? Math.round(pg.doublePrice/1000) : 16;
    const s_was = pg.singlePrice ? Math.round((pg.singlePrice + 2000)/1000) : 27;
    const s_now = pg.singlePrice ? Math.round(pg.singlePrice/1000) : 23;

    const msg = `⚡️ Welcome to Gharpayy ${pg.name.toUpperCase()} - ${(pg.gender || 'COED').toUpperCase()}! ⚡️ ❤️ We're thrilled you loved our rooms.🚀 *Exclusive Offer Alert:* **2K OFF MONTHLY** \n\n` +
      `🧡Triple Sharing. - ~Was ${t_was}K~, **now only ${t_now}k!*\n` +
      `💛Dual Sharing. - ~Originally ${d_was}K~, **now just ${d_now}K!*\n` +
      `❤️Private rooms - ~Formerly ${s_was}k~, **now specially priced at ${s_now}K!*\n\n` +
      `💥 Act Fast: Lock in your reservation NOW and save 2000+ RS every month on a 12-month stay! *Offer expires in 4 hours. *Prebook* now for just 20k!*🔥   enjoy complimentary good food.`;

    navigator.clipboard.writeText(msg);
    setCopiedWA(true);
    setTimeout(() => setCopiedWA(false), 2000);
    toast.success('Exclusive Offer Message Copied! ⚡️');
  };

  const copyMap = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = pg.mapsLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((pg.name || '') + ' ' + (pg.locality || pg.area || '') + ' Bangalore')}`;
    const pName = pg.name.toUpperCase();
    const displayName = pName.startsWith('GHARPAYY') ? pName : `GHARPAYY ${pName}`;
    const msg = `📍 ${displayName}\n` +
      `🚀 Attention: Pre-Booking Required! _enjoy a seamless experience upon arrival!_\n\n` +
      `🎯 DESTINATION ${link} |\n\n` +
      `Secure your spot before you regret it! See you soon in Bangalore! ✨ 🚀`;
    navigator.clipboard.writeText(msg);
    setCopiedMap(true);
    setTimeout(() => setCopiedMap(false), 2000);
    toast.success('Location Message copied! 📍');
  };

  const isList = viewMode === 'list';

  return (
    <div className={`gp-card ${isList ? 'inventory-list-card' : ''}`} style={{ 
      background: T.bg2, 
      border: `1px solid ${T.line}`, 
      borderRadius: 12, 
      overflow: 'hidden', 
      height: 'fit-content',
      transition: 'all 0.2s'
    }}>
      
      {/* Small Header */}
      <div style={{ padding: '14px 16px', flex: isList ? '1' : 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {isList && lead && (<div style={{ width:38, height:38, borderRadius:8, background: matchPercent >= 80 ? '#22C55E' : matchPercent >= 50 ? '#F59E0B' : '#EF4444', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, border:'1.5px solid #000', marginRight: 10 }}><span style={{ color:'#fff', fontSize:10, fontWeight:900, lineHeight:1 }}>{matchPercent}%</span></div>)}
              <h3 onClick={onClick} style={{ fontFamily: T.sans, fontWeight: 800, fontSize: 14, color: '#111827', margin: 0, letterSpacing: '-0.01em', cursor: 'pointer' }}>{pg.name.toUpperCase()}</h3>
              <span style={{ fontFamily: T.mono, fontSize: 8, color: T.gold, fontWeight: 800, background: T.goldD, padding: '2px 4px', borderRadius: 4 }}>{pg.pid}</span>
              {!isList && lead && (<span style={{ background: matchPercent >= 80 ? '#22C55E' : matchPercent >= 50 ? '#F59E0B' : '#EF4444', color: '#fff', borderRadius: 4, fontSize: 9, fontWeight: 900, padding: '2px 8px', border: '1.5px solid #000' }}>{matchPercent}% MATCH</span>)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <MapPin size={10} style={{ color: T.t2 }} />
              <span style={{ fontFamily: T.mono, fontSize: 9, color: T.t2, fontWeight: 600 }}>{pg.area}</span>
              {pg.landmarks && <span style={{ fontFamily: T.mono, fontSize: 8, color: T.t2, marginLeft: 6 }}>• {pg.landmarks}</span>}
            </div>
          </div>
            {!isList && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: T.gold, fontWeight: 900, fontSize: 13, textTransform: 'uppercase' }}>{formatPrice(minPrice)}</div>
                <div style={{ fontFamily: T.mono, fontSize: 8, color: T.t2, fontWeight: 700, marginTop: 2 }}>
                  {[
                    pg.triplePrice && pg.triplePrice > 0 ? `T:₹${Math.round(pg.triplePrice/1000)}k` : null,
                    pg.doublePrice && pg.doublePrice > 0 ? `D:₹${Math.round(pg.doublePrice/1000)}k` : null,
                    pg.singlePrice && pg.singlePrice > 0 ? `S:₹${Math.round(pg.singlePrice/1000)}k` : null,
                  ].filter(Boolean).join(' ')}
                </div>
              </div>
            )}
          </div>
  
          {/* Essential Badges Only */}
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 10 }}>
            <span style={{ background: genderConfig.bg, color: genderConfig.color, border: `1px solid ${genderConfig.border}`, borderRadius: 6, fontFamily: T.mono, fontSize: 8, fontWeight: 800, padding: '2px 8px' }}>
              {genderConfig.label.toUpperCase()}
            </span>
            {pg.propertyType && <span style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A', borderRadius: 6, fontFamily: T.mono, fontSize: 8, fontWeight: 800, padding: '2px 8px' }}>{pg.propertyType.toUpperCase()}</span>}
            
            {/* Inventory Status Badges */}
            {pgRooms && pgRooms.some(r => r.state.status === 'APPROVED') && <span style={{ background: '#DCFCE7', color: '#15803D', border: '1px solid #BBF7D0', borderRadius: 6, fontFamily: T.mono, fontSize: 8, fontWeight: 800, padding: '2px 8px' }}>LIVE</span>}
            {pgRooms && pgRooms.some(r => r.state.status === 'SOFT_LOCKED') && <span style={{ background: '#DBEAFE', color: '#1D4ED8', border: '1px solid #BFDBFE', borderRadius: 6, fontFamily: T.mono, fontSize: 8, fontWeight: 800, padding: '2px 8px' }}>BOOKED</span>}
            {pg.managerContact && <span style={{ background: '#F3F4F6', color: '#374151', border: '1px solid #D1D5DB', borderRadius: 6, fontFamily: T.mono, fontSize: 8, fontWeight: 800, padding: '2px 8px' }}>MGR: {pg.managerContact}</span>}
          </div>
        </div>
  
        {isList && (
          <div className="list-price-panel" style={{ width: 140, display: 'flex', flexDirection: 'column', justifyContent: 'center', borderLeft: `1px solid ${T.line}`, padding: '0 12px', background: '#fff' }}>
            <div style={{ color: T.gold, fontWeight: 900, fontSize: 13 }}>{formatPrice(minPrice)}</div>
            <div style={{ fontFamily: T.mono, fontSize: 8, color: T.t2, fontWeight: 700, marginTop: 2 }}>
              {[
                pg.triplePrice && pg.triplePrice > 0 ? `T:₹${Math.round(pg.triplePrice/1000)}k` : null,
                pg.doublePrice && pg.doublePrice > 0 ? `D:₹${Math.round(pg.doublePrice/1000)}k` : null,
                pg.singlePrice && pg.singlePrice > 0 ? `S:₹${Math.round(pg.singlePrice/1000)}k` : null,
              ].filter(Boolean).join(' ')}
            </div>
          </div>
        )}

      {/* ── ROOMS DRAWER (Collapsible) - Hide in List View initially to keep it clean */}
      {!isList && pgRooms && pgRooms.length > 0 && (
        <div style={{ borderTop: `1px solid ${T.line}` }}>
          <button onClick={() => setRoomsExpanded(!roomsExpanded)}
            style={{ width: '100%', background: roomsExpanded ? 'rgba(255,255,255,0.03)' : 'transparent', border: 'none', borderBottom: roomsExpanded ? `1px solid ${T.line}` : 'none', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', color: '#111827', fontFamily: T.mono, fontSize: 9 }}>
            <span style={{ fontWeight: 900 }}>ROOM INVENTORY ({pgRooms.filter(r => r.state && r.state.status !== 'LOCKED').length})</span>
            {roomsExpanded ? <ChevronUp size={12} strokeWidth={3} /> : <ChevronDown size={12} strokeWidth={3} />}
          </button>
          {roomsExpanded && (
            <div style={{ padding: '8px 12px' }}>
              {pgRooms.map(r => <RoomRow key={r.id} room={r} state={r.state} />)}
            </div>
          )}
        </div>
      )}

      {/* compact Actions */}
      <div style={{ 
        padding: '12px 16px', 
        display: 'flex', 
        gap: 8, 
        borderTop: isList ? 'none' : `1px solid ${T.line}`,
        borderLeft: isList ? `1px solid ${T.line}` : 'none',
        width: isList ? 'auto' : '100%',
        alignItems: 'center',
        background: '#fff'
      }}>
        <button onClick={onScheduleVisit}
          style={{ flex: isList ? 'none' : 2, background: '#fff', border: `1.5px solid #000`, borderRadius: 8, padding: '10px 14px', fontSize: 11, color: '#000', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', boxShadow: '1px 1px 0 #000' }}>
          <Calendar size={13} strokeWidth={3} /> TOUR
        </button>
        
        <div style={{ display: 'flex', gap: 6 }}>
          {getBrochureUrl(pg.name) && (
          <button onClick={(e) => { e.stopPropagation(); window.open(getBrochureUrl(pg.name), '_blank'); }} title="Download Brochure"
            style={{ background: '#fff', border: `1.5px solid #000`, borderRadius: 8, padding: '10px', display: 'flex', alignItems: 'center', color: '#000', cursor: 'pointer', boxShadow: '1px 1px 0 #000' }}>
            <FileText size={14} strokeWidth={3} />
          </button>
          )}
          <button onClick={copyWA} title="Copy WhatsApp Offer"
            style={{ background: '#fff', border: `1.5px solid #000`, borderRadius: 8, padding: '10px', display: 'flex', alignItems: 'center', color: copiedWA ? '#16A34A' : '#000', cursor: 'pointer', boxShadow: '1px 1px 0 #000' }}>
            {copiedWA ? <Check size={14} strokeWidth={3} /> : <DollarSign size={14} strokeWidth={3} />}
          </button>
          
          <button onClick={copyMap} title="Copy Map Location"
            style={{ background: '#fff', border: `1.5px solid #000`, borderRadius: 8, padding: '10px', display: 'flex', alignItems: 'center', color: copiedMap ? '#16A34A' : '#000', cursor: 'pointer', boxShadow: '1px 1px 0 #000' }}>
            {copiedMap ? <Check size={14} strokeWidth={3} /> : <MapPin size={14} strokeWidth={3} />}
          </button>
        </div>

        <button onClick={() => setExpanded(!expanded)}
          style={{ flex: isList ? 'none' : 1, width: isList ? 'auto' : 'auto', background: 'none', border: 'none', padding: '8px', fontSize: 11, color: T.t2, fontWeight: 600, cursor: 'pointer' }}>
          {expanded ? 'Hide' : 'Details'}
        </button>
      </div>

      {/* Details Drawer */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${T.line}`, padding: '16px 14px', background: T.bg3, animation: 'fadeIn 0.2s', width: isList ? '100%' : 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
            <div><div style={{ fontFamily: T.mono, fontSize: 8, color: '#111827', fontWeight: 900, marginBottom: 2 }}>DEPOSIT</div><div style={{ fontSize: 10, color: T.t1 }}>{pg.deposit || '—'}</div></div>
            <div><div style={{ fontFamily: T.mono, fontSize: 8, color: '#111827', fontWeight: 900, marginBottom: 2 }}>MIN STAY</div><div style={{ fontSize: 10, color: T.t1 }}>{pg.minStay || '—'}</div></div>
            <div><div style={{ fontFamily: T.mono, fontSize: 8, color: '#111827', fontWeight: 900, marginBottom: 2 }}>MEALS</div><div style={{ fontSize: 10, color: T.t1 }}>{pg.meals || '—'}</div></div>
          </div>
          {pg.vibe && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontFamily: T.mono, fontSize: 8, color: '#111827', fontWeight: 900, marginBottom: 4 }}>BRAND VIBE</div>
              <div style={{ fontSize: 11, color: T.t1, lineHeight: 1.5 }}>{pg.vibe}</div>
            </div>
          )}
          {pg.houseRules && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontFamily: T.mono, fontSize: 8, color: '#111827', fontWeight: 900, marginBottom: 4 }}>HOUSE RULES</div>
              <div style={{ fontSize: 11, color: T.t1, fontWeight: 700, textTransform: 'uppercase' }}>{pg.houseRules}</div>
            </div>
          )}
          {pg.amenities && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              {pg.amenities.slice(0, 12).map((a: any) => <span key={a} style={{ background: '#fff', border: `1.5px solid #000`, color: '#000', fontWeight: 800, padding: '3px 8px', borderRadius: 6, fontSize: 9 }}>{a}</span>)}
              {(pg.commonAreas || []).map((a: any) => <span key={a} style={{ background: T.amberD, border: `1.5px solid ${T.amber}`, color: T.amber, fontWeight: 800, padding: '3px 8px', borderRadius: 6, fontSize: 9 }}>🏠 {a}</span>)}
            </div>
          )}
          {pg.safety && pg.safety.length > 0 && (
             <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {pg.safety.map((s: any) => <span key={s} style={{ background: T.redD, border: `1.5px solid ${T.red}`, color: T.red, fontWeight: 800, padding: '3px 8px', borderRadius: 6, fontSize: 9 }}>🛡️ {s}</span>)}
             </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── DETAIL MODAL ──────────────────────────────────────────────
function DetailModal({ p, onClose }: { p: PGEntry; onClose: () => void }) {
  const minPrice = getMinPrice(p);
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, padding:20 }} className="detail-modal-wrap" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="gp-fade detail-modal-inner" style={{ background:T.bg1, border:`1px solid ${T.lineH}`, borderRadius:16, maxWidth:680, width:"100%", maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ background:T.bg0, padding:"28px 28px 24px", borderBottom:`1px solid ${T.line}`, position:"relative" }}>
          <button onClick={onClose} style={{ position:"absolute", top:20, right:20, background:T.bg3, border:`1px solid ${T.line}`, borderRadius:8, width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:T.t2 }}><X size={14} /></button>
          <span style={{ background:T.goldD, color:T.gold, border:`1px solid ${T.goldB}`, borderRadius:4, fontFamily:T.mono, fontSize:9, fontWeight:700, padding:"3px 8px", display:"inline-block", marginBottom:12 }}>{p.source?.toUpperCase()} DATASET</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <h2 style={{ fontSize:26, fontWeight:800, color:T.t0, margin:"0 0 8px", lineHeight:1.1 }}>{p.name}</h2>
            <span style={{ fontSize: 12, fontWeight: 800, color: T.gold, background: T.goldD, padding: '2px 6px', borderRadius: 5, fontFamily: T.mono }}>{p.pid}</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:6, color:T.t2, fontSize:13, marginBottom:4 }}>
            <MapPin size={14} style={{ color:T.gold }} /> {p.locality || p.area}
          </div>
          {p.landmarks && (
            <div style={{ fontSize:11, color:T.t2, fontWeight: 700, marginLeft: 20 }}>
              <span style={{ color:T.t1 }}>Nearby: </span>{p.landmarks}
            </div>
          )}
        </div>
        <div style={{ padding:"20px 28px", display:"flex", flexDirection:"column", gap:20 }}>
          <div className="detail-stats-grid">
            <div style={{ background:T.bg2, border:`1px solid ${T.line}`, borderRadius:10, padding:"12px 14px", textAlign:"center" }}>
              <div style={{ fontFamily:T.mono, fontSize:8, color:'#111827', fontWeight: 900, marginBottom:6, letterSpacing:"0.08em" }}>RENT STARTS</div>
              <div style={{ fontSize:15, fontWeight:700, color:T.t0 }}>{minPrice > 0 ? `₹${minPrice.toLocaleString()}` : 'Ask'}</div>
            </div>
            <div style={{ background:T.bg2, border:`1px solid ${T.line}`, borderRadius:10, padding:"12px 14px", textAlign:"center" }}>
              <div style={{ fontFamily:T.mono, fontSize:8, color:'#111827', fontWeight: 900, marginBottom:6, letterSpacing:"0.08em" }}>DISTANCE</div>
              <div style={{ fontSize:15, fontWeight:700, color:T.gold }}>{p.distanceKm?.toFixed(1)} KM</div>
            </div>
            <div style={{ background:T.bg2, border:`1px solid ${T.line}`, borderRadius:10, padding:"12px 14px", textAlign:"center" }}>
              <div style={{ fontFamily:T.mono, fontSize:8, color:'#111827', fontWeight: 900, marginBottom:6, letterSpacing:"0.08em" }}>COMMUTE</div>
              <div style={{ fontSize:15, fontWeight:700, color:T.green }}>{Math.round((p.distanceKm||0)*2.5)}m</div>
            </div>
            <div style={{ background:T.bg2, border:`1px solid ${T.line}`, borderRadius:10, padding:"12px 14px", textAlign:"center" }}>
              <div style={{ fontFamily:T.mono, fontSize:8, color:'#111827', fontWeight: 900, marginBottom:6, letterSpacing:"0.08em" }}>GENDER</div>
              <div style={{ fontSize:15, fontWeight:700, color:T.t0 }}>{p.gender||'Any'}</div>
            </div>
          </div>
          
          <div className="detail-two-col">
            <div style={{ background:T.bg2, border:`1.5px solid #000`, borderRadius:12, padding:"18px 20px" }}>
              <h4 style={{ fontSize:10, fontFamily:T.mono, fontWeight:800, color:T.t2, marginBottom:12, letterSpacing:0.1 }}>PRICING & INVENTORY</h4>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between" }}>
                  <span style={{ fontSize:12, color:T.t2 }}>Triple Sharing</span>
                  <span style={{ fontSize:12, fontWeight:900, color:T.t1 }}>₹{(p.triplePrice||0).toLocaleString()}</span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between" }}>
                  <span style={{ fontSize:12, color:T.t2 }}>Double Sharing</span>
                  <span style={{ fontSize:12, fontWeight:900, color:T.t1 }}>₹{(p.doublePrice||0).toLocaleString()}</span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between" }}>
                  <span style={{ fontSize:12, color:T.t2 }}>Single Sharing</span>
                  <span style={{ fontSize:12, fontWeight:900, color:T.t1 }}>₹{(p.singlePrice||0).toLocaleString()}</span>
                </div>
                <div style={{ borderTop:`1px solid ${T.line}`, paddingTop:8, marginTop:4, display:"flex", justifyContent:"space-between" }}>
                  <span style={{ fontSize:12, fontWeight:900, color:T.gold }}>INVENTORY</span>
                  <span style={{ fontSize:12, fontWeight:900, color:'#000', background:T.gold, padding:'1px 8px', borderRadius:100 }}>{p.availability || 0} Rooms</span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between" }}>
                  <span style={{ fontSize:12, fontWeight:900, color:T.t1 }}>DEPOSIT</span>
                  <span style={{ fontSize:12, fontWeight:900, color:T.t0 }}>{p.deposit || '1 Month'}</span>
                </div>
              </div>
            </div>
            
            <div style={{ background:T.bg2, border:`1.5px solid #000`, borderRadius:12, padding:"18px 20px" }}>
              <h4 style={{ fontSize:10, fontFamily:T.mono, fontWeight:800, color:T.t2, marginBottom:12, letterSpacing:0.1 }}>AMENITIES & AREAS</h4>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {(Array.isArray(p.amenities) ? p.amenities : []).map((a: string) => (
                  <span key={a} style={{ background:'#fff', border:`1.5px solid #000`, color:'#000', borderRadius:6, fontSize:9, fontWeight:900, padding:"3px 8px", textTransform: 'uppercase' }}>{a.trim()}</span>
                ))}
                {(Array.isArray(p.commonAreas) ? p.commonAreas : []).map((a: string) => (
                  <span key={a} style={{ background:T.gold, border:`1.5px solid #000`, color:'#000', borderRadius:6, fontSize:9, fontWeight:900, padding:"3px 8px", textTransform: 'uppercase' }}>🏠 {a.trim()}</span>
                ))}
              </div>
              
              {p.safety && (Array.isArray(p.safety) ? p.safety.length > 0 : p.safety) && (
                <div style={{ marginTop: 16 }}>
                  <h4 style={{ fontSize:10, fontFamily:T.mono, fontWeight:800, color:T.t2, marginBottom:8 }}>SAFETY FEATURES</h4>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                    {(Array.isArray(p.safety) ? p.safety : []).map((s: string) => (
                      <span key={s} style={{ background:'#fff', border:`1.5px solid #EF4444`, color:'#EF4444', borderRadius:6, fontSize:9, fontWeight:900, padding:"3px 8px", textTransform: 'uppercase' }}>🛡️ {s.trim()}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div style={{ display:"grid", gridTemplateColumns:"1.5fr 1fr", gap:16 }}>
             <div style={{ background:T.bg2, border:`1.5px solid #000`, borderRadius:12, padding:"18px 20px" }}>
                <h4 style={{ fontSize:10, fontFamily:T.mono, fontWeight:800, color:T.t2, marginBottom:12, letterSpacing:0.1 }}>HOUSE RULES & VIBE</h4>
                <div style={{ fontSize: 13, color: T.t1, fontWeight: 900, marginBottom: 8, textTransform: 'uppercase' }}>
                  {p.houseRules || 'Standard PG Rules Apply'}
                </div>
                <div style={{ fontSize: 12, color: T.t2, fontStyle: 'italic' }}>
                   {p.vibe}
                </div>
             </div>
             
             <div style={{ background:T.bg2, border:`1.5px solid #000`, borderRadius:12, padding:"18px 20px" }}>
                <h4 style={{ fontSize:10, fontFamily:T.mono, fontWeight:800, color:T.t2, marginBottom:12, letterSpacing:0.1 }}>MANAGEMENT</h4>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  <div style={{ fontSize:12, fontWeight:900, color:T.t1 }}>{p.managerName || 'Resident Manager'}</div>
                  <div style={{ fontSize:14, fontWeight:900, color:T.gold }}>{p.managerContact || 'N/A'}</div>
                </div>
             </div>
          </div>
          

        </div>
      </div>
    </div>
  );
}

// ─── SCHEDULE TOUR DIALOG ─────────────────────────────────────
function ScheduleTourDialog({ pg, lead, onClose }: { pg: PGEntry; lead: any; onClose: () => void }) {
  const [visitDate, setVisitDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [visitTime, setVisitTime] = useState('10:00');
  const [tourType, setTourType] = useState<'Physical' | 'Online'>('Physical');
  const [agentId, setAgentId] = useState('');
  const { data: agents } = useAgents();
  const createVisit = useCreateVisit();
  const updateLead = useUpdateLead();

  const handleSubmit = async () => {
    if (!lead || !pg || !visitDate || !visitTime || !agentId) {
      toast.error('Please fill all visit details.');
      return;
    }

    const visitDateTime = new Date(`${visitDate}T${visitTime}:00`);

    try {
      // Find room ID if available from API-source properties
      const roomId = (pg as any).roomId || ((pg as any).rooms?.[0]?.id) || (pg as any)._id;

      await createVisit.mutateAsync({
        leadId: lead.id,
        propertyId: (pg as any)._id || pg.id,
        roomId: roomId || null,
        assignedStaffId: agentId,
        scheduledAt: visitDateTime.toISOString(),
        tourType: tourType,
      });

      await updateLead.mutateAsync({
        id: lead.id,
        lastActivity: `${tourType} Tour scheduled for ${pg.name} on ${format(visitDateTime, 'MMM d, p')}`,
        status: 'Tour Scheduled',
      });

      toast.success(`${tourType} Tour scheduled for ${pg.name} on ${format(visitDateTime, 'MMM d, p')}`);
      onClose();
    } catch (error) {
      toast.error('Failed to schedule visit.');
      console.error('Error scheduling visit:', error);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }}
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          style={{ background: T.bg1, border: `1px solid ${T.lineH}`, borderRadius: 16, maxWidth: 480, width: "100%", maxHeight: "90vh", overflowY: "auto" }}
        >
          <div style={{ background: T.bg0, padding: "28px 28px 24px", borderBottom: `1px solid ${T.line}`, position: "relative" }}>
            <button onClick={onClose} style={{ position: "absolute", top: 20, right: 20, background: T.bg3, border: `1px solid ${T.line}`, borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: T.t2 }}><X size={14} /></button>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: T.t0, margin: "0 0 8px", lineHeight: 1.1 }}>Schedule Tour</h2>
            <p style={{ fontSize: 13, color: T.t2 }}>For <span style={{ color: T.gold, fontWeight: 600 }}>{pg.name}</span> and Lead <span style={{ color: T.gold, fontWeight: 600 }}>{lead?.name || 'N/A'}</span></p>
          </div>
          <div style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
              <button onClick={() => setTourType('Physical')} style={{ flex: 1, padding: '8px', fontSize: 11, fontWeight: 700, borderRadius: 8, border: `1px solid ${tourType === 'Physical' ? T.gold : T.line}`, background: tourType === 'Physical' ? T.goldD : T.bg3, color: tourType === 'Physical' ? T.gold : T.t1, cursor: 'pointer' }}>Physical Tour</button>
              <button onClick={() => setTourType('Online')} style={{ flex: 1, padding: '8px', fontSize: 11, fontWeight: 700, borderRadius: 8, border: `1px solid ${tourType === 'Online' ? T.gold : T.line}`, background: tourType === 'Online' ? T.goldD : T.bg3, color: tourType === 'Online' ? T.gold : T.t1, cursor: 'pointer' }}>Online Tour</button>
            </div>
            <div>
              <Label>Tour Date</Label>
              <input type="date" value={visitDate} onChange={e => setVisitDate(e.target.value)}
                style={{ width: "100%", background: T.bg3, border: `1px solid ${T.line}`, borderRadius: 8, padding: "10px 12px", color: T.t0, fontSize: 13, fontFamily: T.sans, outline: "none" }} />
            </div>
            <div>
              <Label>Tour Time</Label>
              <input type="time" value={visitTime} onChange={e => setVisitTime(e.target.value)}
                style={{ width: "100%", background: T.bg3, border: `1px solid ${T.line}`, borderRadius: 8, padding: "10px 12px", color: T.t0, fontSize: 13, fontFamily: T.sans, outline: "none" }} />
            </div>
            <div>
              <Label>Assign Agent</Label>
              <select value={agentId} onChange={e => setAgentId(e.target.value)}
                style={{ width: "100%", background: T.bg3, border: `1px solid ${T.line}`, borderRadius: 8, padding: "10px 12px", color: agentId ? T.t0 : T.t2, fontSize: 13, fontFamily: T.sans, outline: "none" }}>
                <option value="">Select an agent</option>
                {agents?.map((agent: any) => (
                  <option key={agent.id} value={agent.id}>{agent.name}</option>
                ))}
              </select>
            </div>
            <Btn variant="gold" onClick={handleSubmit} disabled={createVisit.isPending} style={{ width: "100%", marginTop: 10 }}>
              {createVisit.isPending ? <Loader2 size={16} className="gp-spin" /> : <Check size={16} />}
              Confirm Schedule
            </Btn>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}


// ─── MAIN PAGE ─────────────────────────────────────────────────
export default function MatchingPage() {
  const { getRoom } = useRoomStore();
  const { data: leads } = useLeads();
  const [waRawText, setWaRawText] = useState('');
  const [pgSearchQuery, setPgSearchQuery] = useState('');
  const [pgResults, setPgResults] = useState<PGEntry[]>([]);
  const [allProperties, setAllProperties] = useState<PGEntry[]>([]);
  const [isPgLoading, setIsPgLoading] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<PGEntry | null>(null);
  const [pgResolvedOrigin, setPgResolvedOrigin] = useState<any>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [parsedLead, setParsedLead] = useState<any>(null);
  const [intelArea, setIntelArea] = useState('');
  const [rangeKm, setRangeKm] = useState(5);
  const [showFilters, setShowFilters] = useState(false);
  const [filterArea, setFilterArea] = useState('All');
  const [filterCityZone, setFilterCityZone] = useState('All');
  const [filterSubArea, setFilterSubArea] = useState('All');
  const [filterGender, setFilterGender] = useState('Any');
  const [filterFood, setFilterFood] = useState('Any');
  const [filterType, setFilterType] = useState('Any');
  const [filterBudget, setFilterBudget] = useState(35000);
  const [sortBy, setSortBy] = useState<'distance' | 'budget'>('distance');
  const [pgToSchedule, setPgToSchedule] = useState<PGEntry | null>(null);
  const [areaSidebarSearch, setAreaSidebarSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showScheduleVisitDialog, setShowScheduleVisitDialog] = useState(false);
  const areasWithPGs = useMemo(() => {
    const areaSet = new Set(allProperties.map(p => (p.area || '').trim()).filter(Boolean));
    return Array.from(areaSet).sort((a, b) => a.localeCompare(b));
  }, [allProperties]);

  const sidebarAreas = useMemo(() => {
    let list = areasWithPGs;
    if (filterCityZone !== 'All') {
      list = list.filter(a => getZoneByArea(a).zone === filterCityZone);
    }
    if (areaSidebarSearch.trim()) {
      const q = areaSidebarSearch.toLowerCase();
      list = list.filter(a => a.toLowerCase().includes(q));
    }
    return list;
  }, [areasWithPGs, filterCityZone, areaSidebarSearch]);

  useEffect(() => {
    const load = async () => {
      try {
        const [iq, db, tri, liveSheet] = await Promise.all([
          fetch('/api/iq-properties').then(r => r.json()).catch(() => []),
          fetch('/api/properties').then(r => r.json()).catch(() => []),
          fetch('/api/inventory/properties').then(r => r.json()).catch(() => []),
          fetchLivePGData().catch(() => [])
        ]);

        // Use live sheet data if fetched, else fall back to static JSON
        const masterData = (Array.isArray(liveSheet) && liveSheet.length > 0)
          ? liveSheet
          : PG_DATA;

        if (Array.isArray(liveSheet) && liveSheet.length > 0) {
          toast.success(`Live Sync: ${liveSheet.length} PGs loaded from Sheet`);
        }
        
        const comb = [
          ...(Array.isArray(iq) ? iq : []).map((p: any) => ({ ...p, source:'iq', id: p.id || p._id })),
          ...(Array.isArray(db) ? db : []).map((p: any) => ({ ...p, source:'db', id: p.id || p._id })),
          ...(Array.isArray(tri) ? tri : []).flatMap((p: any) => (p.rooms || []).map((r: any) => ({ 
             ...p, 
             ...r, 
             id: `3x-${r.id}`, 
             originalId: r.id,
             location: p.location,
             source: '3x',
             retailStatus: r.state
          }))),
          ...masterData.map((p: PGEntry) => ({ ...p, source: p.source || 'master' }))
        ];

        // Deduplicate and Normalize
        const uniquePGs = new globalThis.Map<string, any>();
        comb.forEach((pg: any) => {
          const rawArea = pg.area || pg.locality || '';
          const a = normalizeArea(rawArea);
          
          pg.subArea = pg.subArea || rawArea; // Keep exact string as subArea
          pg.area = a;

          const nameTrim = (pg.name || '').trim().toLowerCase();
          const key = `${nameTrim}-${pg.area}`;
          // Prioritize live-sheet (master) over others if duplicate exists
          if (!uniquePGs.has(key) || pg.source === 'LIVE-SHEET' || pg.source === 'master') {
            uniquePGs.set(key, pg);
          }
        });

        setAllProperties(Array.from(uniquePGs.values()).map((pg: any) => {
          const coords = resolveLocationToCoords(pg.area || pg.name || '');
          return {
             ...pg, 
             pLat: coords?.lat || 12.9352,
             pLng: coords?.lng || 77.6245
          };
        }));
      } catch (e) { console.error(e); }
    };
    load();
  }, []);

  const executeSearch = useCallback(async (query: string, km = rangeKm) => {
    if (!query) return;
    setIsPgLoading(true);
    const detectedAreas = detectAreasFromText(query);
    setIntelArea(detectedAreas.length > 0 ? detectedAreas[0] : query.toLowerCase());
    let origin: any = resolveLocationToCoords(query);
    if (!origin && query.length > 3) origin = await geocodeAddress(query);
    setPgResolvedOrigin(origin);

    const normalizedQuery = query.toLowerCase();

    const matched = allProperties
      .map((p: any) => {
        const dist = origin
          ? haversine(origin.lat, origin.lng, p.pLat || 12.9716, p.pLng || 77.5946)
          : 999;
        return { ...p, distanceKm: dist };
      })
      .filter((p: any) => {
        const pArea = (p.area || '').toLowerCase();
        const pLocality = (p.locality || '').toLowerCase();

        // ── PRIMARY: if we detected specific areas, filter by ANY of them ──
        if (detectedAreas.length > 0) {
          const matchedAny = detectedAreas.some(da => {
            const daLower = da.toLowerCase();
            return pArea.includes(daLower) || 
                   daLower.includes(pArea) || 
                   pLocality.includes(daLower);
          });
          if (!matchedAny) return false;
        } else if (origin) {
          // No area detected — use distance
          if (p.distanceKm > km) return false;
        } else {
          // No area, no origin — text match only
          const pName = (p.name || '').toLowerCase();
          const textMatch =
            pArea.includes(normalizedQuery) ||
            normalizedQuery.includes(pArea) ||
            pName.includes(normalizedQuery);
          if (!textMatch) return false;
        }

        // ── SECONDARY FILTERS ──
        // ── AREA & SUB-AREA FILTERS (From GeoDataset) ──
        const normalize = (s: string) => (s || '').toLowerCase().replace(/[\s-]/g, '');
        
        if (filterCityZone !== 'All') {
          const pz = getZoneByArea(p.locality || p.area || p.name || '').zone;
          if (pz !== filterCityZone) return false;
        }

        if (filterArea !== 'All') {
          const qz = normalize(filterArea);
          const pz = normalize(p.area || p.locality || '');
          if (!pz.includes(qz)) return false;
        }
        if (filterSubArea !== 'All') {
          const qs = normalize(filterSubArea);
          const ps = normalize(`${p.locality} ${p.area} ${p.name} ${p.subArea}`);
          if (!ps.includes(qs)) return false;
        }

        if (p.source === '3x' && p.state !== 'APPROVED' && p.state !== 'AVAILABLE' && p.state !== 'SOFT_LOCKED') return false;

        if (filterGender !== 'Any') {
          const g = (p.gender || '').toLowerCase();
          if (filterGender === 'Boys' && g && !g.includes('boy') && !g.includes('male')) return false;
          if (filterGender === 'Girls' && g && !g.includes('girl') && !g.includes('female')) return false;
          if (filterGender === 'coed' && g && !g.includes('co') && !g.includes('mix')) return false;
        }

        const minP = getMinPrice(p);
        if (minP > 0 && minP > filterBudget) return false;

        if (filterFood !== 'Any') {
          const food = (p.food || p.meals || p.amenities || '').toString().toLowerCase();
          if (filterFood === 'Veg' && food && !food.includes('veg')) return false;
          if (filterFood === 'Non-Veg' && food && !food.includes('non')) return false;
        }

        if (filterType !== 'Any') {
          const type = (p.propertyType || '').toString().toLowerCase();
          if (filterType === 'Hostel' && type && !type.includes('hostel')) return false;
          if (filterType === 'Flat' && type && !type.includes('flat') && !type.includes('apartment')) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const scoreA = calculateMatchScore(a, parsedLead);
        const scoreB = calculateMatchScore(b, parsedLead);
        if (scoreA !== scoreB) return scoreB - scoreA;
        if (sortBy === 'budget') return getMinPrice(a) - getMinPrice(b);
        return a.distanceKm - b.distanceKm;
      });
    setPgResults(matched);
    setIsPgLoading(false);
  }, [allProperties, rangeKm, filterArea, filterCityZone, filterSubArea, filterGender, filterFood, filterType, filterBudget, sortBy]);

  useEffect(() => {
    if (pgSearchQuery) {
      executeSearch(pgSearchQuery);
    }
  }, [filterArea, filterCityZone, filterSubArea, filterGender, filterFood, filterType, filterBudget, sortBy, rangeKm, executeSearch, pgSearchQuery]);

  const filteredResults = useMemo(() => pgResults, [pgResults]);

  const syncFiltersToLead = (lead: any) => {
    const rawArea = lead.canonicalArea || lead.location || lead.preferredLocation || '';
    if (rawArea) {
      const detectedAreas = detectAreasFromText(rawArea);
      
      // Reset all secondary filters to ensure search is wide/correct
      setFilterSubArea('All');
      setFilterGender('Any');
      setFilterFood('Any');
      setFilterType('Any');
      setFilterBudget(35000);

      if (detectedAreas.length === 1) {
        setFilterArea(detectedAreas[0]);
        setFilterCityZone(getZoneByArea(detectedAreas[0]).zone);
      } else if (detectedAreas.length > 1) {
        // Multi-match: keep area/zone filters as "All" so search query does the filtering
        setFilterArea('All');
        setFilterCityZone('All');
      } else {
        // No match found — fallback to geoMaster if possible
        const geo = matchPropertyToGeo({ name: rawArea });
        if (geo) {
          setFilterArea(geo.area);
          setFilterCityZone(getZoneByArea(geo.area).zone);
        }
      }
    }
    
    // Auto Budget detection
    if (lead.budget) {
      const b = parseBudget(lead.budget);
      if (b > 5000) setFilterBudget(b + 2000); // Set slightly higher to show options
    }

    // Auto Gender detection
    if (lead.gender) {
      const g = lead.gender.toLowerCase();
      if (g.includes('girl') || g.includes('female')) setFilterGender('Girls');
      else if (g.includes('boy') || g.includes('male')) setFilterGender('Boys');
      else if (g.includes('co-live') || g.includes('co-ed') || g.includes('colive') || g.includes('mixed')) setFilterGender('coed');
    }
  };

  const onWaTextChange = (v: string) => {
    setWaRawText(v);
    const parsed = parseLeadText(v);
    if (!parsed) return;
    setParsedLead(parsed);
    syncFiltersToLead(parsed);

    const query = parsed.location || parsed.canonicalArea || v;
    if (query) { 
      setPgSearchQuery(query); 
      executeSearch(query); 
    }
  };

  const onLeadSelect = (id: string) => {
    setSelectedLeadId(id);
    const lead = leads?.find((l: any) => l.id === id);
    if (lead) {
      const p = {
        name: lead.name,
        location: lead.preferredLocation,
        canonicalArea: detectAreaFromText(lead.preferredLocation || ''),
        budget: lead.budget,
        gender: lead.gender,
        preferences: [] // CRM might not have detailed text for prefs
      };
      setParsedLead(p);
      syncFiltersToLead(p);

      // Prioritize the raw original text "p.location" (e.g. "JP/Jayanagar") 
      // over "p.canonicalArea" (normalized "Jayanagar") so our multi-area search triggers.
      const query = p.location || p.canonicalArea;
      if (query) { 
        setPgSearchQuery(query); 
        executeSearch(query); 
      }
    }
  };

  const quickSearch = (area: string) => { 
    setPgSearchQuery(area); 
    setFilterArea('All');
    setFilterSubArea('All');
    setFilterCityZone('All');
    setFilterGender('Any');
    setFilterFood('Any');
    setFilterType('Any');
    setFilterBudget(35000);
    executeSearch(area); 
  };

  const clearFilters = () => {
    setFilterArea('All');
    setFilterCityZone('All');
    setFilterSubArea('All');
    setFilterGender('Any');
    setFilterFood('Any');
    setFilterType('Any');
    setFilterBudget(35000);
    setRangeKm(5);
  };

  const activeFilterCount = [
    filterArea !== 'All',
    filterCityZone !== 'All',
    filterSubArea !== 'All',
    filterGender !== 'Any',
    filterFood !== 'Any',
    filterType !== 'Any',
    filterBudget < 35000
  ].filter(Boolean).length;

  const selStyle = (active: boolean) => ({ width:"100%", background:T.bg3, border:`1px solid ${active ? T.goldB : T.line}`, borderRadius:8, padding:"9px 12px", color:T.t0, fontSize:13, fontFamily:T.sans, outline:"none" });

  const handleScheduleVisit = (pg: PGEntry) => {
    if (!selectedLeadId) {
      toast.error('Please select a lead first to schedule a visit.');
      return;
    }
    setPgToSchedule(pg);
    setShowScheduleVisitDialog(true);
  };

  const currentLead = useMemo(() => leads?.find(l => l.id === selectedLeadId), [leads, selectedLeadId]);

  return (
    <AppLayout title="Property Matching">
      <GlobalStyles />
      <div className="gp-fade" style={{ padding:"16px 4px", display:"flex", flexDirection:"column", gap:20 }}>

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", flexWrap:"wrap", gap:12 }}>
          <div>
            <h1 style={{ fontSize:26, fontWeight:800, color:T.t0, display:"flex", alignItems:"center", gap:10, margin:0, letterSpacing:"-0.02em" }}>
              Lead → PG Matcher <Sparkles size={22} style={{ color:T.gold }} />
            </h1>
            <p style={{ fontSize:13, color:T.t2, margin:"5px 0 0" }}>Type a lead's office, area or landmark — get best matching PGs instantly</p>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <div style={{ background:T.bg2, border:`1px solid ${T.line}`, borderRadius:8, padding:"8px 16px", textAlign:"center" }}>
              <div style={{ fontFamily:T.mono, fontSize:8, color:T.t2, marginBottom:3, letterSpacing:"0.08em" }}>TOTAL PGS</div>
              <div style={{ fontSize:20, fontWeight:800, color:T.t0 }}>{allProperties.length}</div>
            </div>
            <div style={{ background:T.goldD, border:`1px solid ${T.goldB}`, borderRadius:8, padding:"8px 16px", textAlign:"center" }}>
              <div style={{ fontFamily:T.mono, fontSize:8, color:T.gold, marginBottom:3, letterSpacing:"0.08em" }}>AREAS</div>
              <div style={{ fontSize:20, fontWeight:800, color:T.gold }}>{Object.keys(LEAD_MATCHER_INTEL).length}</div>
            </div>
          </div>
        </div>

        {/* ── MAIN SEARCH BAR ── */}
        <div style={{ background:T.bg2, border:`1px solid ${T.lineH}`, borderRadius:12, overflow:"visible", position: "relative", zIndex: 50 }}>
          <div style={{ display:"flex", alignItems:"center" }}>
            <div style={{ position:"relative", flex:1 }}>
              <Search size={16} style={{ position:"absolute", left:16, top:"50%", transform:"translateY(-50%)", color:T.t2, pointerEvents:"none" }} />
              <input
                value={pgSearchQuery}
                onChange={e => setPgSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && executeSearch(pgSearchQuery)}
                placeholder="Search by name, area, company or landmark..."
                style={{ width:"100%", background:"transparent", border:"none", padding:"16px 16px 16px 46px", color:T.t0, fontSize:15, fontFamily:T.sans, outline:"none", borderTopLeftRadius: 11, borderBottomLeftRadius: 11 }}
              />
            </div>
            {pgSearchQuery && (
              <button onClick={() => { setPgSearchQuery(''); setPgResults([]); setPgResolvedOrigin(null); setIntelArea(''); }}
                style={{ background:"none", border:"none", cursor:"pointer", color:T.t2, padding:"0 12px", display:"flex", alignItems:"center" }}>
                <X size={16} />
              </button>
            )}
            <button onClick={() => {
                setFilterArea('All');
                setFilterSubArea('All');
                setFilterGender('Any');
                setFilterFood('Any');
                setFilterType('Any');
                setFilterBudget(35000);
                executeSearch(pgSearchQuery);
              }} 
              disabled={isPgLoading || !pgSearchQuery}
              style={{ background:isPgLoading||!pgSearchQuery?T.bg3:T.gold, color:isPgLoading||!pgSearchQuery?T.t2:T.bg0, border:"none", padding:"0 24px", height:52, fontFamily:T.sans, fontSize:14, fontWeight:700, cursor:isPgLoading||!pgSearchQuery?"not-allowed":"pointer", display:"flex", alignItems:"center", gap:8, transition:"all .15s", whiteSpace:"nowrap", borderTopRightRadius: 11, borderBottomRightRadius: 11 }}
            >
              {isPgLoading ? <Loader2 size={16} className="gp-spin" /> : <Target size={16} />}
              Find PGs
            </button>
          </div>

          {/* Row 2: Zone pills as clickable filters */}
          <div style={{ borderTop:`1px solid ${T.line}`, padding: "10px 16px", display: 'flex', flexDirection: 'column', gap: 6 }}>
            {/* Zone Pills */}
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' }}>
              {[{ key: 'All', label: 'All Zones' }, ...Object.keys(ZONES).map(k => ({ key: k, label: k }))].map(z => (
                <button key={z.key} onClick={() => { setFilterCityZone(z.key); setFilterArea('All'); setFilterSubArea('All'); }}
                  style={{
                    padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap',
                    border: filterCityZone === z.key ? `1.5px solid #000` : `1px solid ${T.line}`,
                    background: filterCityZone === z.key ? '#111827' : T.bg2,
                    color: filterCityZone === z.key ? '#fff' : T.t1,
                    boxShadow: filterCityZone === z.key ? '1px 1px 0 #000' : 'none',
                    transition: 'all 0.15s'
                  }}>{z.label}</button>
              ))}
            </div>

            <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap", marginTop: 4 }}>
              <button
                onClick={() => setShowFilters(v => !v)}
                style={{ background:showFilters?T.goldD:"none", border:showFilters?`1px solid ${T.goldB}`:"none", borderRadius:6, cursor:"pointer", color:showFilters?T.gold:T.t2, fontFamily:T.sans, fontSize:13, fontWeight:500, display:"flex", alignItems:"center", gap:6, padding:"8px 12px", flex: 1, justifyContent: 'center' }}
              >
                <SlidersHorizontal size={14} />
                {showFilters ? 'Hide More' : 'Other Config'}
                {activeFilterCount > 0 && <span style={{ background:T.gold, color:T.bg0, borderRadius:100, fontSize:10, fontWeight:700, padding:"0 5px", lineHeight:"16px" }}>{activeFilterCount}</span>}
              </button>
              <button onClick={clearFilters} style={{ background:"none", border:"none", color:T.t2, fontSize:11, fontWeight:700, textTransform:"uppercase", cursor:"pointer", padding:"8px 12px" }}>Clear All</button>
            </div>
          </div>

          {/* Expanded filters */}
          {showFilters && (
            <div className="gp-fade" style={{ borderTop:`1px solid ${T.line}`, padding:"16px 16px 20px", display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(150px, 1fr))", gap:16, alignItems:"end" }}>
              <div>
                <Label>GENDER</Label>
                <select value={filterGender} onChange={e => setFilterGender(e.target.value)} style={selStyle(filterGender !== 'Any')}>
                  {['Any','Boys','Girls','coed'].map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <Label>FOOD PREF</Label>
                <select value={filterFood} onChange={e => setFilterFood(e.target.value)} style={selStyle(filterFood !== 'Any')}>
                  {['Any','Veg','Non-Veg','Both'].map(f => <option key={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <Label>TYPE</Label>
                <select value={filterType} onChange={e => setFilterType(e.target.value)} style={selStyle(filterType !== 'Any')}>
                  {['Any','PG','Hostel','Flat'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ gridColumn:"span 2" }}>
                <Label>MAX BUDGET: <span style={{ color:T.gold }}>₹{(filterBudget/1000).toFixed(0)}k/mo</span></Label>
                <input type="range" min={3000} max={50000} step={1000} value={filterBudget} onChange={e => setFilterBudget(Number(e.target.value))} style={{ width:"100%", accentColor:T.gold, marginTop:4 }} />
                <div style={{ display:"flex", justifyContent:"space-between", fontFamily:T.mono, fontSize:9, color:T.t3, marginTop:2 }}><span>₹3k</span><span>₹50k</span></div>
              </div>
              <div>
                <Label>RADIUS: <span style={{ color:T.gold }}>{rangeKm} km</span></Label>
                <input type="range" min={1} max={15} value={rangeKm} onChange={e => setRangeKm(Number(e.target.value))} style={{ width:"100%", accentColor:T.gold, marginTop:4 }} />
              </div>
              <div>
                <Label>SORT BY</Label>
                <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} style={selStyle(false)}>
                  <option value="distance">Distance</option>
                  <option value="budget">Budget (Low to High)</option>
                </select>
              </div>
              <div style={{ display:"flex", alignItems:"flex-end" }}>
                <button onClick={clearFilters} style={{ background:"none", border:`1px solid ${T.line}`, borderRadius:8, color:T.t2, fontSize:10, fontWeight:600, padding:"6px 14px", cursor:"pointer", fontFamily:T.mono, width:"100%", height:38, transition: "color .15s, border-color .15s" }}>CLEAR ALL</button>
              </div>
            </div>
          )}
        </div>

        {/* Hot Zone Quick Buttons */}
        <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
          {HOT_ZONES.map(zone => (
            <button key={zone} onClick={() => quickSearch(zone)} style={{ padding:"6px 14px", borderRadius:100, border:`1px solid ${pgSearchQuery.toLowerCase()===zone.toLowerCase()?T.gold:T.line}`, background:pgSearchQuery.toLowerCase()===zone.toLowerCase()?T.goldD:"transparent", color:pgSearchQuery.toLowerCase()===zone.toLowerCase()?T.gold:T.t2, fontFamily:T.mono, fontSize:10, fontWeight:600, cursor:"pointer", transition:"all .13s" }}>
              {zone}
            </button>
          ))}
        </div>

        {/* Two-column layout with right sidebar */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          
          <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: 16 }}>
            {/* Lead Input Panel */}
            <div className="matching-left-panel" style={{ width: 340, flexShrink: 0, display:"flex", flexDirection:"column", gap:14 }}>
              <Card style={{ display:"flex", flexDirection:"column", gap:18 }}>
                <div>
                  <Label>SELECT CRM LEAD</Label>
                  <select value={selectedLeadId} onChange={e => onLeadSelect(e.target.value)} style={{ width:"100%", background:T.bg3, border:`1px solid ${T.line}`, borderRadius:8, padding:"10px 12px", color:selectedLeadId?T.t0:T.t2, fontSize:13, fontFamily:T.sans, outline:"none" }}>
                    <option value="">Search CRM Leads...</option>
                    {leads?.map((l: any) => <option key={l.id} value={l.id}>{l.name} — {l.preferredLocation||'No Location'}</option>)}
                  </select>
                </div>
                <div>
                  <Label>WHATSAPP / LINKEDIN PARSING</Label>
                  <textarea value={waRawText} onChange={e => onWaTextChange(e.target.value)} placeholder="Paste lead text, WhatsApp message, or company name here..." rows={4}
                    style={{ width:"100%", background:T.bg3, border:`1px solid ${T.line}`, borderRadius:8, padding:"10px 12px", color:T.t0, fontSize:13, fontFamily:T.sans, outline:"none", resize:"none", lineHeight:1.6 }} />
                  {parsedLead && (
                    <div className="gp-fade" style={{ background:"rgba(34,197,94,0.06)", border:`1px solid rgba(34,197,94,0.2)`, borderRadius:8, padding:"10px 14px", marginTop:8, display:"flex", flexDirection:"column", gap:4 }}>
                      <div style={{ fontFamily:T.mono, fontSize:9, color:T.green, fontWeight:700, marginBottom:2 }}>AI PARSED LEAD</div>
                      {parsedLead.name && <div style={{ fontSize:12, color:T.t1 }}>👤 {parsedLead.name}</div>}
                      {parsedLead.location && <div style={{ fontSize:12, color:T.t1 }}>📍 {parsedLead.location}</div>}
                      {parsedLead.budget && <div style={{ fontSize:12, color:T.t1 }}>💰 {parsedLead.budget}</div>}
                      {parsedLead.gender && <div style={{ fontSize:12, color:T.t1 }}>🏠 {parsedLead.gender}</div>}
                      {parsedLead.moveIn && <div style={{ fontSize:12, color:T.t1 }}>📅 {parsedLead.moveIn}</div>}
                    </div>
                  )}
                </div>
              </Card>

              {intelArea && <IntelPanel area={intelArea} />}

              {pgResolvedOrigin && (
                <div className="gp-fade" style={{ background:T.bg2, border:`1px solid ${T.lineH}`, borderRadius:12, padding:"14px 18px", display:"flex", alignItems:"center", gap:14 }}>
                  <div style={{ width:40, height:40, background:T.goldD, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", border:`1px solid ${T.goldB}`, flexShrink:0 }}>
                    <Navigation size={18} style={{ color:T.gold }} />
                  </div>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontFamily:T.mono, fontSize:9, color:T.gold, marginBottom:3, letterSpacing:"0.06em" }}>GIS NODE ACTIVE</div>
                    <div style={{ fontSize:13, fontWeight:700, color:T.t0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{pgResolvedOrigin.name}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Results Center Panel */}
            <div style={{ flex: 1, display:"flex", flexDirection:"column", gap:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <h2 style={{ fontSize:18, fontWeight:800, color:T.t0, margin:0, display:"flex", alignItems:"center", gap:10 }}>
                  PG Match Results
                  <span style={{ background:T.bg3, border:`1px solid ${T.line}`, borderRadius:6, fontFamily:T.mono, fontSize:12, fontWeight:700, color:filteredResults.length<pgResults.length?T.gold:T.t0, padding:"2px 10px" }}>
                    {filteredResults.length} Found
                  </span>
                </h2>
                <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                  <div style={{ display:"flex", background:T.bg2, borderRadius:4, padding:2, border:`1px solid ${T.line}` }}>
                    <button onClick={() => setViewMode('grid')} style={{ background:viewMode==='grid'?T.goldD:'transparent', border:'none', padding:"4px 8px", cursor:"pointer", color:viewMode==='grid'?T.gold:T.t2 }}><Grid size={13} /></button>
                    <button onClick={() => setViewMode('list')} style={{ background:viewMode==='list'?T.goldD:'transparent', border:'none', padding:"4px 8px", cursor:"pointer", color:viewMode==='list'?T.gold:T.t2 }}><List size={13} /></button>
                  </div>
                  {isPgLoading && <Loader2 size={16} className="gp-spin" style={{ color:T.gold }} />}
                </div>
              </div>

              {filteredResults.length === 0 && !isPgLoading && (
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"60px 20px", textAlign:"center", gap:12, background:T.bg1, border:`1px dashed ${T.line}`, borderRadius:12 }}>
                  <div style={{ width:60, height:60, background:T.bg2, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", border:`1px solid ${T.line}` }}>
                    <Search size={24} style={{ color:T.t3 }} />
                  </div>
                  <div style={{ fontSize:14, fontWeight:600, color:T.t2 }}>
                    {pgResults.length > 0 ? 'No PGs match your filters' : 'Paste lead text above to find matches'}
                  </div>
                </div>
              )}

              <div className={viewMode === 'grid' ? 'matching-results-grid' : ''} style={viewMode === 'list' ? { display:'flex', flexDirection:'column', gap:8 } : undefined}>
                {filteredResults.map((p, idx) => (
                  <PropertyCard key={`${p.source}-${p.id || idx}-${idx}`} pg={p} idx={idx} onClick={() => setSelectedProfile(p)} onScheduleVisit={() => handleScheduleVisit(p)} lead={parsedLead} viewMode={viewMode} pgRooms={getRoomsForPG(p.id).map(r => ({ ...r, state: getRoom(r) }))} />
                ))}
              </div>
            </div>
          </div>

          {/* Right Area Sidebar */}
          <div style={{ width: 180, flexShrink: 0, background: T.bg1, border: `1px solid ${T.line}`, borderRadius: 12, padding: '12px 10px', position: 'sticky', top: 100, maxHeight: 'calc(100vh - 120px)', overflowY: 'auto', zIndex: 10 }}>
            <div style={{ fontSize: 9, fontWeight: 900, color: T.t2, letterSpacing: '0.08em', marginBottom: 8, fontFamily: T.mono }}>AREAS WITH PGs</div>
            <div style={{ position: 'relative', marginBottom: 8 }}>
              <Search size={10} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: T.t2 }} />
              <input value={areaSidebarSearch} onChange={e => setAreaSidebarSearch(e.target.value)}
                placeholder="Search area..."
                style={{ width: '100%', background: T.bg2, border: `1px solid ${T.line}`, borderRadius: 6, padding: '6px 8px 6px 24px', fontSize: 10, color: T.t0, boxSizing: 'border-box' }} />
            </div>
            <button onClick={() => setFilterArea('All')}
              style={{ width: '100%', textAlign: 'left', padding: '6px 8px', borderRadius: 6, fontSize: 11, fontWeight: 800, cursor: 'pointer', marginBottom: 2, border: filterArea === 'All' ? '1.5px solid #000' : `1px solid transparent`, background: filterArea === 'All' ? '#111827' : 'transparent', color: filterArea === 'All' ? '#fff' : T.t1, transition: 'all 0.12s' }}>
              All Areas
            </button>
            {sidebarAreas.map(area => {
              const count = allProperties.filter((p: any) => (p.area || '').toLowerCase() === area.toLowerCase()).length;
              const isActive = filterArea === area;
              return (
                <button key={area} onClick={() => setFilterArea(isActive ? 'All' : area)}
                  style={{ width: '100%', textAlign: 'left', padding: '6px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer', marginBottom: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: isActive ? '1.5px solid #000' : `1px solid transparent`, background: isActive ? '#111827' : 'transparent', color: isActive ? '#fff' : T.t1, transition: 'all 0.12s' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 110 }}>{area}</span>
                  <span style={{ fontSize: 9, fontWeight: 900, background: isActive ? 'rgba(255,255,255,0.2)' : T.goldD, color: isActive ? '#fff' : T.gold, padding: '1px 5px', borderRadius: 10 }}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {selectedProfile && <DetailModal p={selectedProfile} onClose={() => setSelectedProfile(null)} />}
      
      {showScheduleVisitDialog && pgToSchedule && (
        <ScheduleTourDialog 
          pg={pgToSchedule} 
          lead={currentLead} 
          onClose={() => {
            setShowScheduleVisitDialog(false);
            setPgToSchedule(null);
          }} 
        />
      )}
    </AppLayout>
  );
}
