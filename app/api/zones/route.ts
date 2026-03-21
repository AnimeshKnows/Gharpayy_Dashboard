import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Zone from '@/models/Zone';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function serializeZone(zone: any) {
  if (!zone) return zone;
  const id = zone._id?.toString?.() || String(zone._id || zone.id || '');
  return {
    ...zone,
    id,
    _id: id,
  };
}

export async function GET() {
  try {
    await connectToDatabase();
    const zones = await Zone.collection.find({ isActive: true }).sort({ name: 1 }).toArray();
    return NextResponse.json(zones.map(serializeZone));
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body.name || '').trim();
    const city = String(body.city || '').trim();
    const areas = Array.isArray(body.areas)
      ? body.areas.map((a: any) => String(a).trim()).filter(Boolean)
      : [];
    const color = String(body.color || '').trim();

    if (!name) {
      return NextResponse.json({ error: 'Zone name is required' }, { status: 400 });
    }

    await connectToDatabase();

    // Upsert by zone name (case-insensitive): re-adding a zone can restore missing fields.
    const existing = await Zone.collection.findOne({ name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } });
    if (existing) {
      await Zone.collection.updateOne(
        { _id: existing._id },
        {
          $set: {
            name,
            city,
            areas,
            color,
            description: body.description || '',
            isActive: true,
            updatedAt: new Date(),
          },
        }
      );
      const updated = await Zone.collection.findOne({ _id: existing._id });
      return NextResponse.json(serializeZone(updated), { status: 200 });
    }

    const now = new Date();
    const insertResult = await Zone.collection.insertOne({
      name,
      city,
      areas,
      color,
      description: body.description || '',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    const zone = await Zone.collection.findOne({ _id: insertResult.insertedId });
    return NextResponse.json(serializeZone(zone), { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
