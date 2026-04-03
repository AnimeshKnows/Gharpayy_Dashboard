import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Bed from '@/models/Bed';
import Room from '@/models/Room';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get('roomId') || searchParams.get('room_id');
    
    await connectToDatabase();
    
    let query = Bed.find({}).populate({
      path: 'roomId',
      populate: { path: 'propertyId' }
    });
    
    if (roomId) {
      query = query.where('roomId').equals(roomId);
    }
    
    const beds = await query.sort({ bedNumber: 1 });
    
    const transformedBeds = beds.map(b => ({
      ...b.toObject(),
      id: b._id,
      roomId: b.roomId,
      room_id: b.roomId,
      bedNumber: b.bedNumber,
      bed_number: b.bedNumber,
      rooms: b.roomId // frontend expects 'rooms' key
    }));

    return NextResponse.json(transformedBeds);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await connectToDatabase();
    const bed = await Bed.create({
      roomId: body.roomId || body.room_id,
      bedNumber: body.bedNumber || body.bed_number,
      status: body.status || 'vacant',
      notes: body.notes || null,
    });
    return NextResponse.json(bed, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
