import { getAuthUserFromCookie, issueAuthCookie, type AuthTokenPayload } from '@/lib/auth';

export type AuthUser = AuthTokenPayload & {
  name?: string;
};

export async function setAuthCookie(user: {
  id: string;
  email: string;
  role: 'admin' | 'owner' | 'user';
  name?: string;
  username?: string;
}) {
  await issueAuthCookie({
    userId: user.id,
    username: user.username || user.email,
    email: user.email,
    fullName: user.name || user.username || user.email,
    role: user.role,
    zones: [],
  });
}

export async function getAuthUser() {
  return getAuthUserFromCookie();
}

export async function isAdmin() {
  const user = await getAuthUser();
  return user?.role === 'admin';
}

export async function isOwner() {
  const user = await getAuthUser();
  return user?.role === 'owner';
}