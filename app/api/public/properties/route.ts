import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Property from '@/models/Property';
import Room from '@/models/Room';
import Bed from '@/models/Bed';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const city = searchParams.get('city');
    const area = searchParams.get('area');
    const gender = searchParams.get('gender');
    // ... other filters could be added

    await connectToDatabase();
    
    let query: any = { isActive: true };
    if (city) query.city = { $regex: city, $options: 'i' };
    if (area) query.area = { $regex: area, $options: 'i' };
    if (gender && gender !== 'any') query.genderAllowed = gender;

    const properties = await Property.find(query)
      .populate({
        path: 'ownerId',
        select: 'name'
      })
      .sort({ rating: -1 });

    // For each property, we might need some room/bed info for the preview
    // In a real app, we might want to aggregate this or do separate queries
    const results = await Promise.all(properties.map(async (p) => {
      const rooms = await Room.find({ propertyId: p._id }).populate('beds');
      return {
        ...p.toObject(),
        id: p._id,
        owners: p.ownerId,
        rooms: rooms.map(r => ({
          ...r.toObject(),
          id: r._id,
          beds: (r as any).beds?.map((b: any) => ({ ...b.toObject(), id: b._id })) || []
        }))
      };
    }));

    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
