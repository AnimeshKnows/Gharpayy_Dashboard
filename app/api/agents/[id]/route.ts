import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Agent from '@/models/Agent';
import User from '@/models/User';
import { getAuthUserFromCookie, normalizeUsername } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import Zone from '@/models/Zone';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await getAuthUserFromCookie();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await connectToDatabase();

    const agent = await User.findById(id)
      .select('-password')
      .populate('adminId', 'fullName email username');

    if (!agent || agent.role !== 'agent') {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // CEO can see all agents, admin can only see their own agents
    if (authUser.role !== 'ceo' && authUser.id !== agent.adminId?.toString()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      id: agent._id,
      name: agent.fullName,
      email: agent.email,
      phone: agent.phone,
      username: agent.username,
      zones: agent.zones || [],
      adminId: agent.adminId,
      createdAt: agent.createdAt,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await getAuthUserFromCookie();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (authUser.role !== 'ceo') {
      return NextResponse.json({ error: 'Only CEO can update agents' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    await connectToDatabase();

    const agent = await User.findById(id);
    if (!agent || agent.role !== 'agent') {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const username = body.username ? normalizeUsername(body.username) : undefined;
    const email = body.email?.trim().toLowerCase();

    if (username) {
      const existingWithUsername = await User.findOne({ username, _id: { $ne: agent._id } });
      if (existingWithUsername) {
        return NextResponse.json({ error: 'Username is already in use' }, { status: 400 });
      }
      agent.username = username;
    }

    if (email) {
      const existingWithEmail = await User.findOne({ email, _id: { $ne: agent._id } });
      if (existingWithEmail) {
        return NextResponse.json({ error: 'Email is already in use' }, { status: 400 });
      }
      agent.email = email;
    }

    if (Array.isArray(body.zones)) {
      const zoneDocs = await Zone.find({ isActive: true }).select('name');
      const zoneNames = new Set(zoneDocs.map((z: any) => String(z.name).trim().toLowerCase()));
      const invalidZones = body.zones.filter((z: string) => !zoneNames.has(String(z).trim().toLowerCase()));
      if (invalidZones.length > 0) {
        return NextResponse.json(
          { error: `Invalid zones selected: ${invalidZones.join(', ')}` },
          { status: 400 }
        );
      }
      agent.zones = body.zones;
    }

    // Update allowed fields
    if (body.fullName) agent.fullName = body.fullName;
    if (body.phone) agent.phone = body.phone;

    // Update password if provided
    if (body.password) {
      agent.password = await bcrypt.hash(body.password, 12);
    }

    // Update admin assignment if provided
    if (body.adminId !== undefined) {
      const oldAdminId = agent.adminId;

      // Remove agent from old admin's list
      if (oldAdminId) {
        await User.findByIdAndUpdate(oldAdminId, {
          $pull: { adminIds: agent._id }
        });
      }

      // Add agent to new admin's list
      if (body.adminId) {
        agent.adminId = new Types.ObjectId(body.adminId);
        await User.findByIdAndUpdate(body.adminId, {
          $push: { adminIds: agent._id }
        });
      } else {
        agent.adminId = undefined;
      }
    }

    await agent.save();

    return NextResponse.json({
      message: 'Agent updated successfully',
      agent: {
        id: agent._id,
        name: agent.fullName,
        email: agent.email,
        phone: agent.phone,
        username: agent.username,
        zones: agent.zones || [],
        adminId: agent.adminId,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await getAuthUserFromCookie();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (authUser.role !== 'ceo') {
      return NextResponse.json({ error: 'Only CEO can reset agent password' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    if (!body.password || String(body.password).length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    await connectToDatabase();

    const agent = await User.findById(id);
    if (!agent || agent.role !== 'agent') {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const hashedPassword = await bcrypt.hash(String(body.password), 12);
    await User.findByIdAndUpdate(id, { password: hashedPassword });

    return NextResponse.json({ message: 'Agent password reset successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await getAuthUserFromCookie();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (authUser.role !== 'ceo') {
      return NextResponse.json({ error: 'Only CEO can delete agents' }, { status: 403 });
    }

    const { id } = await params;
    await connectToDatabase();

    const agent = await User.findById(id);
    if (!agent || agent.role !== 'agent') {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Remove agent from admin's list
    if (agent.adminId) {
      await User.findByIdAndUpdate(agent.adminId, {
        $pull: { adminIds: agent._id }
      });
    }

    await User.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Agent deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
