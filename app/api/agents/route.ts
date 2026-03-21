import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Agent from '@/models/Agent';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import Zone from '@/models/Zone';
import { getAuthUserFromCookie, normalizeUsername } from '@/lib/auth';

export async function GET() {
  try {
    const authUser = await getAuthUserFromCookie();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectToDatabase();

    let agents;
    if (authUser.role === 'ceo' || authUser.role === 'manager') {
      // CEO and manager see all agents
      agents = await User.find({ role: 'agent' })
        .select('-password')
        .populate('adminId', 'fullName email username')
        .sort({ fullName: 1 });

      const transformed = agents.map((a) => ({
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

    // For admins, show only agents under them
    if (authUser.role === 'admin') {
      agents = await User.find({ adminId: authUser.id })
        .select('-password')
        .sort({ fullName: 1 });

      const transformed = agents.map((a) => ({
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

    // For agents and others, use legacy Agent collection if they still have access
    const query = authUser.zoneName ? { zoneName: authUser.zoneName } : {};
    const legacyAgents = await Agent.find(query).sort({ name: 1 });
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
    if (authUser.role !== 'ceo') {
      return NextResponse.json({ error: 'Only CEO can add agents' }, { status: 403 });
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

    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Agent already exists with this email/username' },
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
    const agent = await User.create({
      username,
      email,
      phone: body.phone,
      password: hashedPassword,
      fullName: body.fullName,
      role: 'agent',
      zones,
      adminId: adminId || undefined,
      adminIds: [],
    });

    // Update admin's adminIds list
    if (adminId) {
      await User.findByIdAndUpdate(adminId, {
        $push: { adminIds: agent._id }
      });
    }

    return NextResponse.json(
      {
        id: agent._id,
        name: agent.fullName,
        email: agent.email,
        phone: agent.phone,
        username: agent.username,
        zones: agent.zones || [],
        adminId: agent.adminId,
        message: 'Agent created successfully'
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

