import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Room from '@/models/Room';
import Property from '@/models/Property';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get('propertyId') || searchParams.get('property_id');
    
    await connectToDatabase();
    
    let query = Room.find({}).populate('propertyId');
    if (propertyId) {
      query = query.where('propertyId').equals(propertyId);
    }
    
    const rooms = await query.sort({ roomNumber: 1 });
    
    const transformedRooms = rooms.map(r => ({
      ...r.toObject(),
      id: r._id,
      propertyId: r.propertyId,
      property_id: r.propertyId,
      roomNumber: r.roomNumber,
      room_number: r.roomNumber,
      bedCount: r.bedCount,
      bed_count: r.bedCount,
      autoLocked: (r as any).autoLocked || false,
      auto_locked: (r as any).autoLocked || false,
      lastConfirmedAt: (r as any).lastConfirmedAt,
      last_confirmed_at: (r as any).lastConfirmedAt,
      properties: r.propertyId
    }));

    return NextResponse.json(transformedRooms);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await connectToDatabase();
    const room = await Room.create({
      propertyId: body.propertyId || body.property_id,
      roomNumber: body.roomNumber || body.room_number,
      floor: body.floor || null,
      bedCount: body.bedCount || body.bed_count || 0,
      status: body.status || 'vacant',
      actualRent: body.actualRent || body.actual_rent || null,
      expectedRent: body.expectedRent || body.expected_rent || null,
      roomType: body.roomType || body.room_type || null,
      notes: body.notes || null,
      rentPerBed: body.rentPerBed || body.rent_per_bed || null,
      autoLocked: body.autoLocked || body.auto_locked || false,
      lastConfirmedAt: body.lastConfirmedAt || body.last_confirmed_at || null,
    });
    return NextResponse.json(room, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
