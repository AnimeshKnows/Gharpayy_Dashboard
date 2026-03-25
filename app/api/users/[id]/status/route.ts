import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';
import { getAuthUserFromCookie } from '@/lib/auth';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await getAuthUserFromCookie();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (authUser.role !== 'super_admin') {
      return NextResponse.json({ error: 'Only Super Admin can change user status' }, { status: 403 });
    }

    const { id } = await params;
    const { action } = await req.json();

    if (!['activate', 'deactivate', 'delete'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Use activate, deactivate, or delete' }, { status: 400 });
    }

    await connectToDatabase();
    const user = await User.findById(id);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (user.role === 'super_admin') {
      return NextResponse.json({ error: 'Cannot change Super Admin status' }, { status: 403 });
    }

    switch (action) {
      case 'activate':
        user.status = 'active';
        break;
      case 'deactivate':
        user.status = 'inactive';
        break;
      case 'delete':
        user.status = 'deleted';
        user.deletedAt = new Date();
        break;
    }

    await user.save();

    return NextResponse.json({
      message: `User ${action}d successfully`,
      status: user.status,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
