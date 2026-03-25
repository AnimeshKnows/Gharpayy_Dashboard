import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(req: Request) {
  try {
    const { email, oldPassword, newPassword } = await req.json();

    if (!email || !oldPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Email, old password, and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'New password must be at least 6 characters' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const user = await User.findOne({ email: email.trim().toLowerCase() });

    if (!user || !user.password) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const isValidOldPassword = await bcrypt.compare(String(oldPassword), String(user.password));
    if (!isValidOldPassword) {
      return NextResponse.json({ error: 'Old password is incorrect' }, { status: 401 });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    return NextResponse.json({ message: 'Password changed successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
