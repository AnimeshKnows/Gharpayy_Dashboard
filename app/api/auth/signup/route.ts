import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';
import { normalizeUsername } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { email, password, fullName, username: rawUsername } = await req.json();
    const normalizedEmail = email?.trim().toLowerCase();
    const username = normalizeUsername(rawUsername || normalizedEmail);

    if (!normalizedEmail || !password || !fullName || !username) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await connectToDatabase();

    const existingUser = await User.findOne({ $or: [{ email: normalizedEmail }, { username }] });
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists with this email/username' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = await User.create({
      username,
      email: normalizedEmail,
      password: hashedPassword,
      fullName,
      role: 'user',
    });

    return NextResponse.json({ message: 'User created successfully', user: { username: newUser.username, email: newUser.email, fullName: newUser.fullName } }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
