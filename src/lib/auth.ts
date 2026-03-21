import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_change_me';
const ZONES = ['Zone1', 'Zone2', 'Zone3', 'Zone4', 'Zone5'] as const;
const DEFAULT_ADMIN_PASSWORD = '12345678';
const ZONE_ADMIN_NAMES: Record<ZoneName, string> = {
  Zone1: 'AK',
  Zone2: 'BK',
  Zone3: 'CK',
  Zone4: 'DK',
  Zone5: 'EK',
};

export type ZoneName = (typeof ZONES)[number];

export type AuthTokenPayload = {
  userId: string;
  username: string;
  email: string;
  fullName: string;
  role: 'super_admin' | 'manager' | 'admin' | 'member' | 'user';
  zones?: string[];
  zoneName?: string; // deprecated, kept for backward compatibility
};

export async function ensureDefaultCEO() {
  await connectToDatabase();

  const ceoUsername = normalizeUsername('superadmin@gharpayy');
  const ceoEmail = 'superadmin@gharpayy';
  const ceoFullName = 'Gharpayy';
  const ceoPassword = '12345678';
  const existing = await User.findOne({ username: ceoUsername });

  if (existing) {
    return;
  }

  // Create default Super Admin user
  const hashedPassword = await bcrypt.hash(ceoPassword, 12);
  await User.create({
    username: ceoUsername,
    email: ceoEmail,
    password: hashedPassword,
    fullName: ceoFullName,
    role: 'super_admin',
    zones: [],
    managerIds: [],
    adminIds: [],
  });
}

export async function ensureDefaultZoneAdmins() {
  await connectToDatabase();

  for (let i = 1; i <= 5; i += 1) {
    const zoneName = `Zone${i}` as ZoneName;
    const username = `zone${i}admin@gharpayy`;
    const email = `zone${i}admin@gharpayy.com`;
    const fullName = ZONE_ADMIN_NAMES[zoneName];

    const existing = await User.findOne({ username });
    if (existing) {
      if (!existing.zoneName || existing.role !== 'admin' || existing.fullName !== fullName) {
        existing.zoneName = zoneName;
        existing.role = 'admin';
        existing.fullName = fullName;
        await existing.save();
      }
      continue;
    }

    const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 12);
    await User.create({
      username,
      email,
      password: hashedPassword,
      fullName,
      role: 'admin',
      zoneName,
    });
  }
}

export async function issueAuthCookie(payload: AuthTokenPayload) {
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  const cookieStore = await cookies();
  cookieStore.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
}

export async function getAuthUserFromCookie() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) return null;

    const decoded = jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
    await connectToDatabase();

    const user = await User.findById(decoded.userId).select('-password');
    if (!user) return null;

    return {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      zones: user.zones || [],
      zoneName: user.zones?.[0], // for backward compatibility
      phone: user.phone,
    };
  } catch (error) {
    return null;
  }
}

export function normalizeUsername(value?: string) {
  return value?.trim().toLowerCase() || '';
}
