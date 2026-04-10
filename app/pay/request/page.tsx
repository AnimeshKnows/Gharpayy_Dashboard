"use client";

import { useState } from 'react';

type State = 'request' | 'pending' | 'submitted';

interface FormData {
  tenantName: string;
  tenantPhone: string;
  propertyName: string;
  moveInDate: string;
}

export default function TenantRequestPage() {
  const [state, setState] = useState<State>('request');
  const [form, setForm] = useState<FormData>({
    tenantName: '', tenantPhone: '', propertyName: '', moveInDate: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);

  // Read ?zone= from URL
  const zoneId = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('zone') ?? undefined
    : undefined;

  const set = (key: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.tenantName.trim() || !form.tenantPhone.trim() || !form.propertyName.trim()) {
      setError('Please fill in your name, phone number, and preferred location.');
      return;
    }
    setState('pending');

    try {
      const res = await fetch('/api/payments/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantName: form.tenantName.trim(),
          tenantPhone: form.tenantPhone.trim(),
          propertyName: form.propertyName.trim(),
          notes: form.moveInDate ? `Move-in: ${form.moveInDate}` : undefined,
          zoneId,
        }),
      });

      if (!res.ok) throw new Error('Something went wrong');
      const data = await res.json();
      window.location.href = `/pay/${data.id}`;
    } catch {
      setError('Something went wrong. Please try again or contact us on WhatsApp.');
      setState('request');
    }
  };

  const inputStyle = (name: string): React.CSSProperties => ({
    width: '100%',
    padding: '11px 14px',
    background: 'transparent',
    border: `0.5px solid ${focused === name ? '#C9A84C' : 'rgba(255,255,255,0.18)'}`,
    boxShadow: focused === name ? '0 0 0 3px rgba(201,168,76,0.08)' : 'none',
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Arial, sans-serif',
    outline: 'none',
    borderRadius: 2,
    marginBottom: 14,
    transition: 'border 0.2s',
  });

  const focusProps = (name: string) => ({
    onFocus: () => setFocused(name),
    onBlur: () => setFocused(null),
  });

  return (
    <div style={{ background: '#0c0c0a', minHeight: '100vh', fontFamily: 'Georgia, serif', color: '#fff' }}>

      {/* Navbar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 40px', borderBottom: '0.5px solid rgba(255,255,255,0.08)',
        background: '#0c0c0a', position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ fontSize: 17, letterSpacing: 2, color: '#C9A84C', fontWeight: 700, fontFamily: 'Arial, sans-serif' }}>
          GHAR<span style={{ color: '#fff' }}>PAYY</span>
        </div>
        <div style={{ fontSize: 10, letterSpacing: 2, color: '#C9A84C', fontFamily: 'Arial, sans-serif', display: 'flex', alignItems: 'center', gap: 6 }}>
          🔒 SECURE BOOKING
        </div>
      </div>

      {/* STATE 1: REQUEST FORM */}
      {state === 'request' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '56px 20px 48px', textAlign: 'center' }}>
          <div style={{
            width: 76, height: 76, borderRadius: '50%', background: '#1e1e14',
            border: '1px solid rgba(201,168,76,0.25)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 32, marginBottom: 28,
          }}>🏠</div>

          <div style={{ fontSize: 10, letterSpacing: 3, color: '#C9A84C', fontFamily: 'Arial, sans-serif', marginBottom: 14 }}>
            Exclusive Pre–Booking
          </div>
          <h1 style={{ fontSize: 40, fontWeight: 700, lineHeight: 1.2, marginBottom: 18 }}>
            Lock Your Room<br />Before Anyone Else Does
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', maxWidth: 420, lineHeight: 1.8, marginBottom: 36, fontFamily: 'Arial, sans-serif' }}>
            Share your details. Our team reviews availability and unlocks a private offer — valid for 15 minutes only. No commitment yet.
          </p>

          <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 440, textAlign: 'left' }}>
            <label style={{ fontSize: 10, letterSpacing: 2.5, color: '#C9A84C', fontFamily: 'Arial, sans-serif', marginBottom: 7, display: 'block' }}>
              Your Full Name
            </label>
            <input
              style={inputStyle('name')} {...focusProps('name')}
              type="text" placeholder="e.g. Rahul Sharma"
              value={form.tenantName} onChange={set('tenantName')} required
            />

            <label style={{ fontSize: 10, letterSpacing: 2.5, color: '#C9A84C', fontFamily: 'Arial, sans-serif', marginBottom: 7, display: 'block' }}>
              Phone Number (WhatsApp)
            </label>
            <input
              style={inputStyle('phone')} {...focusProps('phone')}
              type="tel" placeholder="+91 98765 43210"
              value={form.tenantPhone} onChange={set('tenantPhone')} required
            />

            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 10, letterSpacing: 2.5, color: '#C9A84C', fontFamily: 'Arial, sans-serif', marginBottom: 7, display: 'block' }}>
                  Preferred Location
                </label>
                <input
                  style={inputStyle('prop')} {...focusProps('prop')}
                  type="text" placeholder="e.g. Koramangala"
                  value={form.propertyName} onChange={set('propertyName')} required
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 10, letterSpacing: 2.5, color: '#C9A84C', fontFamily: 'Arial, sans-serif', marginBottom: 7, display: 'block' }}>
                  Move-in Date
                </label>
                <input
                  style={inputStyle('date')} {...focusProps('date')}
                  type="text" placeholder="DD / MM / YYYY"
                  value={form.moveInDate} onChange={set('moveInDate')}
                />
              </div>
            </div>

            {error && (
              <div style={{ background: 'rgba(209,79,79,0.10)', border: '1px solid rgba(209,79,79,0.25)', borderRadius: 4, padding: '10px 14px', fontSize: 12, color: '#e08080', marginBottom: 12, fontFamily: 'Arial, sans-serif' }}>
                {error}
              </div>
            )}

            <button type="submit" style={{
              width: '100%', padding: 13, background: '#C9A84C', color: '#0c0c0a',
              border: 'none', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' as const,
              fontFamily: 'Arial, sans-serif', fontWeight: 700, cursor: 'pointer',
              borderRadius: 2, marginTop: 4, transition: 'background 0.2s',
            }}>
              Request My Private Offer →
            </button>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textAlign: 'center', marginTop: 10, fontFamily: 'Arial, sans-serif', letterSpacing: 1 }}>
              ⏱ Offer valid for 15 minutes once unlocked
            </p>
          </form>
        </div>
      )}

      {/* STATE 2: PENDING */}
      {state === 'pending' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', padding: '40px 20px', textAlign: 'center' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            border: '1.5px solid rgba(201,168,76,0.15)', borderTopColor: '#C9A84C',
            animation: 'spin 1.2s linear infinite', marginBottom: 30,
          }} />
          <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 14 }}>Your Request Is In.</h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', maxWidth: 380, lineHeight: 1.8, fontFamily: 'Arial, sans-serif', marginBottom: 28 }}>
            We're checking availability and preparing your private quote. Keep an eye on WhatsApp — your offer lands there in a few minutes.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            {[0, 200, 400].map((delay, i) => (
              <div key={i} style={{
                width: 7, height: 7, borderRadius: '50%', background: '#C9A84C',
                animation: `pulse 1.4s ease-in-out ${delay}ms infinite`,
              }} />
            ))}
          </div>
        </div>
      )}

      {/* STATE 3: SUBMITTED */}
      {state === 'submitted' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', padding: '40px 20px', textAlign: 'center' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', background: 'rgba(20,60,30,0.8)',
            border: '1px solid rgba(80,180,100,0.3)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 32, marginBottom: 28,
          }}>✓</div>
          <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 14 }}>Request Received!</h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', maxWidth: 380, lineHeight: 1.8, fontFamily: 'Arial, sans-serif', marginBottom: 28 }}>
            Hey {form.tenantName.split(' ')[0]}! We've got your enquiry. Our advisor will reach out on WhatsApp within a few hours with your personalised offer.
          </p>
          <div style={{ background: 'rgba(20,60,30,0.8)', border: '0.5px solid rgba(80,180,100,0.3)', borderRadius: 6, padding: '16px 24px', fontSize: 13, color: 'rgba(255,255,255,0.6)', fontFamily: 'Arial, sans-serif', textAlign: 'left', maxWidth: 380, width: '100%' }}>
            <div style={{ marginBottom: 8 }}>› We'll WhatsApp you on <strong style={{ color: '#fff' }}>{form.tenantPhone}</strong></div>
            <div style={{ marginBottom: 8 }}>› Once your offer is ready, you'll get a private link to pay the token and lock your room</div>
            <div>› Zero brokerage — you only pay the token amount</div>
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 24, fontFamily: 'Arial, sans-serif' }}>
            © 2025–2026 Gharpayy. All rights reserved.
          </p>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:0.2; } 50% { opacity:1; } }
      `}</style>
    </div>
  );
}
