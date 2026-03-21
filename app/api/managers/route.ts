import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';
import { getAuthUserFromCookie, normalizeUsername } from '@/lib/auth';

export async function GET() {
  try {
    const authUser = await getAuthUserFromCookie();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (authUser.role !== 'ceo') {
      return NextResponse.json({ error: 'Only CEO can access manager list' }, { status: 403 });
    }

    await connectToDatabase();

    // Get all managers with their details
    const managers = await User.find({ role: 'manager' })
      .select('-password')
      .populate('adminIds', '-password')
      .sort({ fullName: 1 });

    const mapped = managers.map((manager) => ({
      id: manager._id,
      username: manager.username,
      fullName: manager.fullName,
      email: manager.email,
      phone: manager.phone,
      admins: manager.adminIds?.map((admin: any) => ({
        id: admin._id,
        username: admin.username,
        fullName: admin.fullName,
        email: admin.email,
        phone: admin.phone,
        zones: admin.zones || [],
        role: admin.role,
      })) || [],
      createdAt: manager.createdAt,
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
      return NextResponse.json({ error: 'Only CEO can add managers' }, { status: 403 });
    }

    const body = await req.json();
    const username = normalizeUsername(body.username);
    const email = body.email?.trim().toLowerCase();
    const fullName = body.fullName?.trim();
    const phone = body.phone?.trim();
    const password = body.password;
    const adminIds = body.adminIds || []; // Array of admin IDs to assign

    if (!fullName || !email || !phone || !username || !password) {
      return NextResponse.json(
        { error: 'Name, email, phone, username and password are required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Check if manager already exists
    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) {
      return NextResponse.json(
        { error: 'Manager already exists with this email/username' },
        { status: 400 }
      );
    }

    // Validate that all provided admin IDs exist and are admins
    if (adminIds.length > 0) {
      const existingAdmins = await User.find({
        _id: { $in: adminIds },
        role: 'admin',
      });

      if (existingAdmins.length !== adminIds.length) {
        return NextResponse.json(
          { error: 'One or more provided admins do not exist or are not admins' },
          { status: 400 }
        );
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const manager = await User.create({
      username,
      email,
      phone,
      password: hashedPassword,
      fullName,
      role: 'manager',
      zones: [],
      adminIds,
      managerIds: [],
    });

    // Update the admins' managerId reference
    if (adminIds.length > 0) {
      await User.updateMany(
        { _id: { $in: adminIds } },
        { managerId: manager._id }
      );
    }

    await manager.populate('adminIds', '-password');

    return NextResponse.json(
      {
        message: 'Manager created successfully',
        manager: {
          id: manager._id,
          username: manager.username,
          fullName: manager.fullName,
          email: manager.email,
          phone: manager.phone,
          admins: manager.adminIds?.map((admin: any) => ({
            id: admin._id,
            username: admin.username,
            fullName: admin.fullName,
            email: admin.email,
            phone: admin.phone,
            zones: admin.zones || [],
          })) || [],
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
