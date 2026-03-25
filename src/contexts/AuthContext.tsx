import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface AuthUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: string;
  phone?: string;
  zones?: string[];
  zoneName?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  checkUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true, 
  signOut: async () => {},
  checkUser: async () => {}
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const checkUser = async () => {
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      const data = await res.json();
      if (data.user) {
        setUser({
          id: data.user.id || data.user._id,
          username: data.user.username,
          email: data.user.email,
          fullName: data.user.fullName,
          role: data.user.role,
          phone: data.user.phone,
          zones: data.user.zones || [],
          zoneName: data.user.zoneName,
        });
      } else {
        setUser(null);
      }
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkUser();
  }, []);

  const signOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      window.location.href = '/auth';
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut, checkUser }}>
      {children}
    </AuthContext.Provider>
  );
};

