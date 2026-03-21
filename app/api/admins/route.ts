import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';
import Member from '@/models/User';
import Zone from '@/models/Zone';
import { getAuthUserFromCookie, normalizeUsername } from '@/lib/auth';

export async function GET() {
  try {
    const authUser = await getAuthUserFromCookie();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (authUser.role !== 'super_admin' && authUser.role !== 'manager') {
      return NextResponse.json({ error: 'Unauthorized to view admins' }, { status: 403 });
    }

    await connectToDatabase();

    const query = authUser.role === 'manager' ? { role: 'admin', managerId: authUser.id } : { role: 'admin' };
    const admins = await User.find(query)
      .select('-password')
      .populate('adminIds', '-password')
      .populate('managerId', 'fullName email username')
      .sort({ fullName: 1 });

    const mapped = admins.map((admin) => ({
      id: admin._id,
      username: admin.username,
      fullName: admin.fullName,
      email: admin.email,
      phone: admin.phone,
      zones: admin.zones || [],
      role: admin.role,
      managerId: admin.managerId,
      members: admin.adminIds?.map((member: any) => ({
        id: member._id,
        name: member.fullName,
        email: member.email,
        phone: member.phone,
        username: member.username,
        zones: member.zones || [],
        isActive: true,
      })) || [],
      createdAt: admin.createdAt,
    }));

    return NextResponse.json(mapped);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const authUser = await getAuthUserFromCookie();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (authUser.role !== 'super_admin') {
      return NextResponse.json({ error: 'Only Super Admin can add admins' }, { status: 403 });
    }

    const body = await req.json();
    const username = normalizeUsername(body.username);
    const email = body.email?.trim().toLowerCase();
    const zones = Array.isArray(body.zones) ? body.zones : [];

    if (!body.fullName || !email || !body.phone || zones.length === 0 || !username || !body.password) {
      return NextResponse.json(
        { error: 'Name, email, phone, zones, username and password are required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const zoneDocs = await Zone.find({ isActive: true }).select('name');
    const zoneNames = new Set(zoneDocs.map((z: any) => String(z.name).trim().toLowerCase()));
    for (const z of zones) {
      if (!zoneNames.has(String(z).trim().toLowerCase())) {
        try { await Zone.create({ name: String(z).trim(), isActive: true }); } catch (e) {}
      }
    }

    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) {
      return NextResponse.json(
        { error: 'Admin already exists with this email/username' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(body.password, 12);
    const admin = await User.create({
      username,
      email,
      phone: body.phone,
      password: hashedPassword,
      fullName: body.fullName,
      role: 'admin',
      zones,
      adminIds: [],
      managerId: body.managerId || undefined,
    });

    // Update manager if provided
    if (body.managerId) {
      await User.findByIdAndUpdate(body.managerId, {
        $push: { adminIds: admin._id }
      });
    }

    return NextResponse.json(
      {
        id: admin._id,
        username: admin.username,
        fullName: admin.fullName,
        email: admin.email,
        phone: admin.phone,
        zones: admin.zones || [],
        role: admin.role,
        members: [],
        message: 'Admin created successfully'
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
