import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';
import Agent from '@/models/Agent';
import Zone from '@/models/Zone';
import { getAuthUserFromCookie, normalizeUsername } from '@/lib/auth';

export async function GET() {
  try {
    const authUser = await getAuthUserFromCookie();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (authUser.role !== 'ceo') {
      return NextResponse.json({ error: 'Only CEO can access admin list' }, { status: 403 });
    }

    await connectToDatabase();

    const admins = await User.find({ role: 'admin' })
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
      agents: admin.adminIds?.map((agent: any) => ({
        id: agent._id,
        name: agent.fullName,
        email: agent.email,
        phone: agent.phone,
        username: agent.username,
        zones: agent.zones || [],
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
    if (authUser.role !== 'ceo') {
      return NextResponse.json({ error: 'Only CEO can add admins' }, { status: 403 });
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
    const invalidZones = zones.filter((z: string) => !zoneNames.has(String(z).trim().toLowerCase()));
    if (invalidZones.length > 0) {
      return NextResponse.json(
        { error: `Invalid zones selected: ${invalidZones.join(', ')}` },
        { status: 400 }
      );
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
        agents: [],
        message: 'Admin created successfully'
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
