export const formatRoleLabel = (role?: string | null) => {
  const normalized = (role || 'user')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .trim();

  return normalized || 'user';
};

export const formatUserLabel = (user?: {
  username?: string | null;
  fullName?: string | null;
  role?: string | null;
} | null) => {
  if (!user) return '';

  const fullName = (user.fullName || '').trim();
  const username = (user.username || '').trim();
  const fallbackName = username.includes('@') ? username.split('@')[0] : username;
  const name = fullName || fallbackName;
  const role = formatRoleLabel(user.role);

  return name ? `${name} [${role}]` : `[${role}]`;
};