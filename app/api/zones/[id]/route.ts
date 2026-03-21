import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Zone from '@/models/Zone';
import { Types } from 'mongoose';

function serializeZone(zone: any) {
  if (!zone) return zone;
  const id = zone._id?.toString?.() || String(zone._id || zone.id || '');
  return {
    ...zone,
    id,
    _id: id,
  };
}

function toObjectId(id: string) {
  if (!Types.ObjectId.isValid(id)) return null;
  return new Types.ObjectId(id);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const objectId = toObjectId(id);
    if (!objectId) {
      return NextResponse.json({ error: 'Invalid zone id' }, { status: 400 });
    }

    const body = await req.json();
    await connectToDatabase();

    const updates: any = {};

    if (body.name !== undefined) {
      const name = String(body.name || '').trim();
      if (!name) {
        return NextResponse.json({ error: 'Zone name is required' }, { status: 400 });
      }
      updates.name = name;
    }

    if (body.city !== undefined) {
      updates.city = String(body.city || '').trim();
    }

    if (body.areas !== undefined) {
      updates.areas = Array.isArray(body.areas)
        ? body.areas.map((a: any) => String(a).trim()).filter(Boolean)
        : [];
    }

    if (body.color !== undefined) {
      updates.color = String(body.color || '').trim();
    }

    const updateResult = await Zone.collection.findOneAndUpdate(
      { _id: objectId },
      { $set: { ...updates, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (!updateResult) {
      return NextResponse.json({ error: 'Zone not found' }, { status: 404 });
    }

    return NextResponse.json(serializeZone(updateResult));
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const objectId = toObjectId(id);
    if (!objectId) {
      return NextResponse.json({ error: 'Invalid zone id' }, { status: 400 });
    }

    await connectToDatabase();

    const updateResult = await Zone.collection.findOneAndUpdate(
      { _id: objectId },
      { $set: { isActive: false, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (!updateResult) {
      return NextResponse.json({ error: 'Zone not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Zone deleted successfully', zone: serializeZone(updateResult) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
