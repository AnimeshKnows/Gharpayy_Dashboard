import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Member from '@/models/User';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import Zone from '@/models/Zone';
import { getAuthUserFromCookie, normalizeUsername } from '@/lib/auth';

export async function GET() {
  try {
    const authUser = await getAuthUserFromCookie();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectToDatabase();

    let members;
    if (['super_admin', 'manager', 'member'].includes(authUser.role)) {
      // Super Admin, manager, and member see all members
      members = await User.find({ role: 'member' })
        .select('-password')
        .populate('adminId', 'fullName email username')
        .sort({ fullName: 1 });

      const transformed = members.map((a) => ({
        id: a._id,
        name: a.fullName,
        email: a.email,
        phone: a.phone,
        username: a.username,
        zones: a.zones || [],
        adminId: a.adminId,
        isActive: true,
      }));

      return NextResponse.json(transformed);
    }

    // For admins, show members whose zones overlap with admin zones
    if (authUser.role === 'admin') {
      const adminUser = await User.findById(authUser.id).select('zones');
      const adminZones = new Set(
        (adminUser?.zones || []).map((z: any) => String(z).trim().toLowerCase())
      );

      const allMembers = await User.find({ role: 'member' })
        .select('-password')
        .populate('adminId', 'fullName email username')
        .sort({ fullName: 1 });

      members = allMembers.filter((m: any) => {
        const memberZones = Array.isArray(m.zones)
          ? m.zones.map((z: any) => String(z).trim().toLowerCase())
          : [];
        return memberZones.some((z: string) => adminZones.has(z));
      });

      const transformed = members.map((a) => ({
        id: a._id,
        name: a.fullName,
        email: a.email,
        phone: a.phone,
        username: a.username,
        zones: a.zones || [],
        adminId: a.adminId,
        isActive: true,
      }));

      return NextResponse.json(transformed);
    }

    // For members and others, use legacy Member collection if they still have access
    const query = authUser.zoneName ? { zoneName: authUser.zoneName } : {};
    const legacyAgents = await Member.find(query).sort({ name: 1 });
    const transformed = legacyAgents.map((a) => ({
      ...a.toObject(),
      id: a._id,
      is_active: a.isActive,
    }));
    return NextResponse.json(transformed);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const authUser = await getAuthUserFromCookie();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (authUser.role !== 'super_admin') {
      return NextResponse.json({ error: 'Only Super Admin can add members' }, { status: 403 });
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

    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Member already exists with this email/username' },
        { status: 400 }
      );
    }

    // Validate that all provided admin IDs exist and are admins
    const adminId = body.adminId;
    if (adminId) {
      const existingAdmin = await User.findOne({
        _id: adminId,
        role: 'admin',
      });

      if (!existingAdmin) {
        return NextResponse.json(
          { error: 'Provided admin does not exist or is not an admin' },
          { status: 400 }
        );
      }
    }

    const hashedPassword = await bcrypt.hash(body.password, 12);
    const member = await User.create({
      username,
      email,
      phone: body.phone,
      password: hashedPassword,
      fullName: body.fullName,
      role: 'member',
      zones,
      adminId: adminId || undefined,
      adminIds: [],
    });

    // Update admin's adminIds list
    if (adminId) {
      await User.findByIdAndUpdate(adminId, {
        $push: { adminIds: member._id }
      });
    }

    return NextResponse.json(
      {
        id: member._id,
        name: member.fullName,
        email: member.email,
        phone: member.phone,
        username: member.username,
        zones: member.zones || [],
        adminId: member.adminId,
        message: 'Member created successfully'
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

