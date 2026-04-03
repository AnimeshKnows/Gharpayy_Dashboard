import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import IQProperty from '@/models/IQProperty';
import Property from '@/models/Property';
import { findAreaCoordinates, getDistance, normalizeAreaName, resolveLocationToCoords } from '@/lib/areaCoordinates';
import { parseRoomEntries } from '@/lib/parseRoomEntries';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { location = '', budget = 0, gender = '', occupation = '', range = 5 } = body;

    await connectToDatabase();

    const [iqProps, dbProps] = await Promise.all([
      IQProperty.find({}),
      Property.find({ isActive: true }).lean(),
    ]);

    const allCandidates = [
      ...iqProps.map((p: any) => ({ ...p.toObject(), source: 'iq' })),
      ...dbProps.map((p: any) => ({
        ...p,
        name: p.name,
        area: p.area || p.location || '',
        gender: p.gender || 'both',
        price: p.price || '',
        targetAudience: p.targetAudience || 'both',
        source: 'db',
      })),
    ];

    const leadCoords = resolveLocationToCoords(location);
    const searchAreaNorm = normalizeAreaName(location || '');
    const isAnywhere = !searchAreaNorm || searchAreaNorm === 'anywhere' || searchAreaNorm === 'any';
    const results: any[] = [];

    allCandidates.forEach((p: any) => {
      const pgAreaNorm = normalizeAreaName(p.area || '');
      const pgLocalityNorm = normalizeAreaName(p.locality || p.location || '');
      const pgNameNorm = normalizeAreaName(p.name || '');
      const pgNearbyNorm = normalizeAreaName(p.nearbyLandmarks || '');

      const isDirectMatch = !isAnywhere && (
        pgAreaNorm.includes(searchAreaNorm) ||
        searchAreaNorm.includes(pgAreaNorm) ||
        pgLocalityNorm.includes(searchAreaNorm) ||
        pgNearbyNorm.includes(searchAreaNorm) ||
        pgNameNorm.includes(searchAreaNorm)
      );

      let distanceKm = -1;
      let inArea = false;
      let locationScore = 0;

      const pgLat = p.lat || findAreaCoordinates(p.nearbyLandmarks || '')?.lat || findAreaCoordinates(p.locality || '')?.lat || findAreaCoordinates(p.area || '')?.lat;
      const pgLng = p.lng || findAreaCoordinates(p.nearbyLandmarks || '')?.lng || findAreaCoordinates(p.locality || '')?.lng || findAreaCoordinates(p.area || '')?.lng;

      if (leadCoords && pgLat && pgLng) {
        distanceKm = getDistance(leadCoords.lat, leadCoords.lng, pgLat, pgLng);
        if (distanceKm <= range) {
          inArea = true;
          locationScore = Math.max(10, 60 - Math.floor(distanceKm * 15));
        } else {
          return;
        }
      } else if (isDirectMatch || isAnywhere) {
        inArea = true;
        locationScore = 60;
        distanceKm = 0;
      } else {
        return;
      }

      let genderScore = 0;
      const pgGender = (p.gender || '').toLowerCase();
      const pgName = (p.name || '').toLowerCase();
      const leadGenderStr = (gender || '').toLowerCase();

      if (leadGenderStr) {
        const isMale = leadGenderStr === 'male' || leadGenderStr.includes('boy') || leadGenderStr === 'm';
        const isFemale = leadGenderStr === 'female' || leadGenderStr.includes('girl') || leadGenderStr === 'f';
        const isCoLiveLead = leadGenderStr.includes('co') || leadGenderStr.includes('both');
        const context = `${pgGender} ${pgName}`;
        const isPgGirls = context.includes('girl') || context.includes('female') || context.includes('ladies') || context.includes('women');
        const isPgBoys = context.includes('boy') || context.includes('male') || context.includes('men');
        const isPgCoed = context.includes('coed') || context.includes('co-ed') || context.includes('both') || context.includes('co-live');

        if (isCoLiveLead && isPgCoed) genderScore = 15;
        else if (isFemale && isPgGirls) genderScore = 15;
        else if (isMale && isPgBoys) genderScore = 15;
        else if (isPgCoed) genderScore = 10;
      } else {
        genderScore = 15;
      }

      const roomEntries = parseRoomEntries(p.price || '', p.lows || '', p.priceMin, p.priceMax);
      const prices = roomEntries.map((e: any) => e.price);
      let budgetScore = 0;
      const budgetVal = Number(budget);
      if (budgetVal > 0 && prices.length > 0) {
        const minAffordable = Math.min(...prices);
        budgetScore = minAffordable <= budgetVal + 1500 ? 15 : 0;
      } else {
        budgetScore = 15;
      }

      let occupationScore = 0;
      const pgAudience = (p.targetAudience || '').toLowerCase();
      const leadOcc = (occupation || '').toLowerCase();
      if (leadOcc) {
        const isS = leadOcc.includes('student');
        const isW = leadOcc.includes('work') || leadOcc.includes('job') || leadOcc.includes('prof');
        const pgS = pgAudience.includes('student');
        const pgW = pgAudience.includes('working') || pgAudience.includes('prof');
        const pgBoth = pgAudience.includes('both') || pgAudience.includes('all') || !pgAudience || (!pgS && !pgW);
        if (pgBoth || (isS && pgS) || (isW && pgW)) occupationScore = 10;
      } else {
        occupationScore = 10;
      }

      const matchScore = Math.max(0, Math.min(100, locationScore + budgetScore + genderScore + occupationScore));

      results.push({
        ...p,
        name: p.name,
        area: p.area,
        priceMin: prices.length > 0 ? Math.min(...prices) : (p.priceMin || 0),
        priceMax: prices.length > 0 ? Math.max(...prices) : (p.priceMax || 0),
        match_score: matchScore,
        distanceVal: distanceKm,
        inArea,
        distance: distanceKm > 0 ? distanceKm.toFixed(2) : '0.0',
        id: (p._id || p.id).toString(),
      });
    });

    const sorted = results.sort((a, b) => {
      if (a.inArea !== b.inArea) return a.inArea ? -1 : 1;
      if (a.distanceVal !== b.distanceVal) return a.distanceVal - b.distanceVal;
      return b.match_score - a.match_score;
    });

    return NextResponse.json(sorted);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}