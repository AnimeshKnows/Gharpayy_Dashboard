"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Lock, User, Eye, EyeOff, Mail, KeyRound } from 'lucide-react';
import { motion } from 'framer-motion';

const Auth = () => {
  const [mode, setMode] = useState<'login' | 'changePassword'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Change password form state
  const [cpEmail, setCpEmail] = useState('');
  const [cpOldPassword, setCpOldPassword] = useState('');
  const [cpNewPassword, setCpNewPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }
      
      toast.success('Welcome back!');
      // Force a fresh app load so AuthProvider re-reads cookie-backed session.
      window.location.href = '/dashboard';
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cpNewPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cpEmail,
          oldPassword: cpOldPassword,
          newPassword: cpNewPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change password');

      toast.success('Password changed! You can now sign in with your new password.');
      setCpEmail('');
      setCpOldPassword('');
      setCpNewPassword('');
      setMode('login');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden flex-col justify-between p-12" style={{ background: 'hsl(220, 16%, 8%)' }}>
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
              <span className="text-accent-foreground font-display font-bold text-lg">G</span>
            </div>
            <div>
              <h1 className="font-display font-bold text-lg text-white tracking-tight">Gharpayy</h1>
              <p className="text-[11px] text-white/40">Lead Management CRM</p>
            </div>
          </div>
        </div>

        <motion.div
          className="relative z-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.32, 0.72, 0, 1] }}
        >
          <h2 className="font-display text-2xl font-bold text-white leading-tight mb-4 tracking-tight">
            Every lead tracked.<br />Every deal closed.
          </h2>
          <p className="text-white/40 text-sm max-w-md leading-relaxed">
            Automated follow-ups, AI scoring, and real-time pipeline visibility for your entire team.
          </p>
          <div className="grid grid-cols-3 gap-4 mt-10">
            {[
              { label: 'Response Time', value: '<5 min' },
              { label: 'Lead Scoring', value: 'AI' },
              { label: 'Pipeline Stages', value: '8' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl p-4 border border-white/[0.06]" style={{ background: 'hsl(220, 14%, 12%)' }}>
                <p className="font-display font-bold text-white text-base">{s.value}</p>
                <p className="text-[10px] text-white/30 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <p className="relative z-10 text-[10px] text-white/20">© 2026 Gharpayy. All rights reserved.</p>

        {/* Subtle gradient orb */}
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, hsl(25, 95%, 53%), transparent)' }} />
      </div>

      {/* Right auth form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          className="w-full max-w-[380px]"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
          key={mode}
        >
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center">
              <span className="text-accent-foreground font-display font-bold">G</span>
            </div>
            <h1 className="font-display font-bold text-base text-foreground tracking-tight">Gharpayy</h1>
          </div>

          {mode === 'login' ? (
            <>
              <h2 className="font-display font-bold text-xl text-foreground mb-1 tracking-tight">Welcome back</h2>
              <p className="text-xs text-muted-foreground mb-8">
                Sign in with your username and password
              </p>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-2xs">Username</Label>
                  <div className="relative">
                    <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input className="pl-9 h-11 rounded-xl" placeholder="Enter username" value={username} onChange={e => setUsername(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-2xs">Password</Label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input className="pl-9 pr-9 h-11 rounded-xl" type={showPassword ? 'text' : 'password'} placeholder="Enter password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full h-11 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90" disabled={loading}>
                  {loading ? 'Please wait...' : 'Sign In'}
                </Button>
              </form>

              <button
                type="button"
                onClick={() => setMode('changePassword')}
                className="w-full text-center text-xs text-muted-foreground hover:text-accent mt-4 transition-colors"
              >
                Change Password
              </button>
            </>
          ) : (
            <>
              <h2 className="font-display font-bold text-xl text-foreground mb-1 tracking-tight">Change Password</h2>
              <p className="text-xs text-muted-foreground mb-8">
                Enter your email, current password, and new password
              </p>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-2xs">Email</Label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input className="pl-9 h-11 rounded-xl" placeholder="Enter email" type="email" value={cpEmail} onChange={e => setCpEmail(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-2xs">Old Password</Label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input className="pl-9 pr-9 h-11 rounded-xl" type={showOldPassword ? 'text' : 'password'} placeholder="Current password" value={cpOldPassword} onChange={e => setCpOldPassword(e.target.value)} required />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" onClick={() => setShowOldPassword(!showOldPassword)}>
                      {showOldPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-2xs">New Password</Label>
                  <div className="relative">
                    <KeyRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input className="pl-9 pr-9 h-11 rounded-xl" type={showNewPassword ? 'text' : 'password'} placeholder="New password (min 6 chars)" value={cpNewPassword} onChange={e => setCpNewPassword(e.target.value)} required minLength={6} />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" onClick={() => setShowNewPassword(!showNewPassword)}>
                      {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full h-11 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90" disabled={loading}>
                  {loading ? 'Please wait...' : 'Change Password'}
                </Button>
              </form>

              <button
                type="button"
                onClick={() => setMode('login')}
                className="w-full text-center text-xs text-muted-foreground hover:text-accent mt-4 transition-colors"
              >
                ← Back to Sign In
              </button>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;

