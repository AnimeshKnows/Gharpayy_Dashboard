import { NextResponse } from 'next/server';
import { getAuthUserFromCookie } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getAuthUserFromCookie();
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ user: null });
  }
}
