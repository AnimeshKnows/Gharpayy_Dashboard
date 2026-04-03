import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectToDatabase from '@/lib/mongodb';
import Owner from '@/models/Owner';
import Property from '@/models/Property';
import { getAuthUser } from '@/lib/auth-service';

export async function GET(req: Request) {
  try {
    const authUser = await getAuthUser();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    
    await connectToDatabase();

    if (authUser?.role === 'owner') {
      const owner = await Owner.findById(authUser.id).select('-password');
      return NextResponse.json(owner ? [owner] : []);
    }

    const query = userId ? { userId } : {};
    const owners = await Owner.find(query).sort({ createdAt: -1 });
    return NextResponse.json(owners);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}


export async function POST(req: Request) {
  try {
    const body = await req.json();
    await connectToDatabase();
    const email = String(body.email || '').trim().toLowerCase();
    const username = String(body.username || email || body.phone || '').trim().toLowerCase();
    const password = String(body.password || body.phone || '12345678');

    if (!body.name || !body.phone || !email) {
      return NextResponse.json({ error: 'name, phone, and email are required' }, { status: 400 });
    }

    const existing = await Owner.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      return NextResponse.json({ error: 'Email or username already exists' }, { status: 400 });
    }

    const owner = await Owner.create({
      ...body,
      email,
      username,
      password: await bcrypt.hash(password, 12),
      role: 'owner',
      companyName: body.company_name || body.companyName || null,
      gharpayyPgName: body.gharpayyPgName || body.gharpayy_pg_name || null,
      exactPgName: body.exactPgName || body.exact_pg_name || null,
    });

    const linkedNames = [owner.exactPgName, owner.gharpayyPgName].filter(Boolean);
    if (linkedNames.length) {
      await Property.updateMany({ name: { $in: linkedNames } }, { ownerId: owner._id });
    }

    return NextResponse.json(owner, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
