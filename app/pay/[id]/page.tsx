"use client";

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';

type PayTab = 'qr' | 'upi' | 'bank';

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      onClick={() => setOpen(o => !o)}
      style={{ borderBottom: '0.5px solid rgba(255,255,255,0.07)', padding: '14px 0', cursor: 'pointer' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 13, fontFamily: 'Arial, sans-serif', color: 'rgba(255,255,255,0.75)' }}>{question}</span>
        <span style={{ color: '#C9A84C', fontSize: 16, minWidth: 16 }}>{open ? '−' : '+'}</span>
      </div>
      {open && (
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: 'Arial, sans-serif', lineHeight: 1.7, marginTop: 10, marginBottom: 0 }}>
          {answer}
        </p>
      )}
    </div>
  );
}

interface FormData {
  tenantName: string;
  tenantPhone: string;
  propertyName: string;
  moveInDate: string;
}

export default function TenantOfferPage() {
  const params = useParams();
  const id = params?.id as string;

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PayTab>('qr');
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [secsLeft, setSecsLeft] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pollRef  = useRef<NodeJS.Timeout | null>(null);
  const [extending, setExtending] = useState(false);
  const [extendError, setExtendError] = useState<string | null>(null);

  const handleExtend = async () => {
    setExtending(true);
    setExtendError(null);
    try {
      const res = await fetch(`/api/payments/${id}/extend`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setExtendError(data.error || 'Extension failed. Please try again.');
        return;
      }
      // Restart timer with 10 minutes and flip booking state back to approved
      setBooking({ ...data });
      setSecsLeft(600);
    } catch {
      setExtendError('Network error. Please try again.');
    } finally {
      setExtending(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    fetch(`/api/payments/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return; }
        setBooking(data);
        if (data.status === 'approved' && data.offerExpiresAt) {
          const diff = Math.floor((new Date(data.offerExpiresAt).getTime() - Date.now()) / 1000);
          setSecsLeft(Math.max(0, diff));
        }
      })
      .catch(() => setError('Failed to load offer'))
      .finally(() => setLoading(false));
  }, [id]);

  // Auto-poll every 10s while status is pending — clears itself on approval or unmount
  useEffect(() => {
    if (!booking || booking.status !== 'pending') {
      clearInterval(pollRef.current!);
      return;
    }
    pollRef.current = setInterval(() => {
      fetch(`/api/payments/${id}`)
        .then(r => r.json())
        .then(data => {
          if (data.status !== 'pending') {
            clearInterval(pollRef.current!);
            setBooking(data);
            if (data.status === 'approved' && data.offerExpiresAt) {
              const diff = Math.floor((new Date(data.offerExpiresAt).getTime() - Date.now()) / 1000);
              setSecsLeft(Math.max(0, diff));
            }
          }
        })
        .catch(() => { /* silent — don't surface poll errors to tenant */ });
    }, 10_000);
    return () => clearInterval(pollRef.current!);
  }, [booking?.status, id]);

  useEffect(() => {
    if (secsLeft === null || secsLeft <= 0) return;
    timerRef.current = setInterval(() => {
      setSecsLeft(s => {
        if (s === null || s <= 1) { clearInterval(timerRef.current!); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [secsLeft !== null]);

  const fmtTimer = (s: number) => {
    const m = String(Math.floor(s / 60)).padStart(2, '0');
    const sec = String(s % 60).padStart(2, '0');
    return `${m}:${sec}`;
  };

  const fmt = (n: number) => new Intl.NumberFormat('en-IN').format(n);

  const waText = booking
    ? `Hi Gharpayy! I've made the token payment of ₹${fmt(booking.tokenAmount)} for ${booking.propertyName}. Please confirm my booking. 🙏`
    : '';

  const waHref = booking?.adminPhone
    ? `https://wa.me/91${booking.adminPhone.replace(/\D/g, '')}?text=${encodeURIComponent(waText)}`
    : `https://wa.me/?text=${encodeURIComponent(waText)}`;

  if (loading) return (
    <div style={{ background: '#0c0c0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', border: '1.5px solid rgba(201,168,76,0.15)', borderTopColor: '#C9A84C', animation: 'spin 1.2s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error || !booking) return (
    <div style={{ background: '#0c0c0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'Arial, sans-serif', textAlign: 'center', padding: 20 }}>
      <div>
        <div style={{ fontSize: 48, marginBottom: 16 }}>😕</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Offer Not Found</h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>{error || 'This link may have expired or is invalid.'}</p>
      </div>
    </div>
  );

  const expired = booking.status === 'expired' || (secsLeft !== null && secsLeft <= 0);
  const paid    = booking.status === 'paid';
  const savings = (booking.actualRent || 0) - (booking.discountedRent || 0);
  const total   = (booking.discountedRent || 0) + (booking.deposit || 0) + (booking.maintenanceFee || 0);

  const upiLink = booking.upiId
    ? `upi://pay?pa=${booking.upiId}&pn=Gharpayy&am=${booking.tokenAmount || ''}&cu=INR`
    : '';

  return (
    <div style={{ background: '#0c0c0a', minHeight: '100vh', fontFamily: 'Georgia, serif', color: '#fff' }}>

      {/* Navbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 36px', borderBottom: '0.5px solid rgba(255,255,255,0.08)', background: '#0c0c0a', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ fontSize: 17, letterSpacing: 2, color: '#C9A84C', fontWeight: 700, fontFamily: 'Arial, sans-serif' }}>
          GHAR<span style={{ color: '#fff' }}>PAYY</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href={waHref} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 16px', border: '1px solid #25d366', borderRadius: 20, color: '#25d366', fontSize: 12, fontFamily: 'Arial, sans-serif', textDecoration: 'none' }}>
            💬 Help
          </a>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'Arial, sans-serif', letterSpacing: 1 }}>🔒 SECURE</div>
        </div>
      </div>

      <div style={{ maxWidth: 540, margin: '0 auto', padding: '28px 20px 120px' }}>

        {/* PAID STATE */}
        {paid && (
          <div style={{ background: 'rgba(20,60,30,0.8)', border: '0.5px solid rgba(80,180,100,0.3)', borderRadius: 8, padding: '28px 24px', textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Room Locked!</h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', fontFamily: 'Arial, sans-serif', lineHeight: 1.7 }}>
              Payment confirmed for <strong style={{ color: '#fff' }}>{booking.propertyName}</strong>.
              Our team will reach out on WhatsApp with check-in details.
            </p>
          </div>
        )}

        {/* EXPIRED STATE */}
        {!paid && expired && (
          <div style={{ background: 'rgba(60,8,8,0.6)', border: '0.5px solid rgba(160,40,40,0.4)', borderRadius: 8, padding: '28px 24px', textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏰</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Offer Expired</h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', fontFamily: 'Arial, sans-serif', lineHeight: 1.7 }}>
              This offer has expired. Message us on WhatsApp — we may be able to reactivate it.
            </p>

            {/* Extension button — one-time only */}
            {!booking.extensionUsed && (
              <div style={{ marginTop: 20 }}>
                <button
                  onClick={handleExtend}
                  disabled={extending}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 28px', background: extending ? 'rgba(201,168,76,0.15)' : '#C9A84C', color: extending ? '#C9A84C' : '#0c0c0a', border: '1px solid #C9A84C', borderRadius: 6, fontSize: 13, fontFamily: 'Arial, sans-serif', fontWeight: 700, cursor: extending ? 'not-allowed' : 'pointer', width: '100%', justifyContent: 'center' }}
                >
                  {extending ? (
                    <>
                      <span style={{ width: 14, height: 14, border: '2px solid #C9A84C', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                      Requesting…
                    </>
                  ) : '⏱ Request 10-Min Extension'}
                </button>
                {extendError && (
                  <p style={{ fontSize: 12, color: '#f87171', fontFamily: 'Arial, sans-serif', marginTop: 8 }}>{extendError}</p>
                )}
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: 'Arial, sans-serif', marginTop: 6 }}>
                  One-time extension · 10 minutes added
                </p>
              </div>
            )}

            <a href={waHref} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 16, padding: '13px 28px', background: '#25d366', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontFamily: 'Arial, sans-serif', fontWeight: 700, textDecoration: 'none' }}>
              💬 Contact Us on WhatsApp
            </a>

            {booking.extensionUsed && (
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: 'Arial, sans-serif', marginTop: 12 }}>
                Extension already used. Contact your agent for a new offer.
              </p>
            )}
          </div>
        )}

        {/* ACTIVE OFFER */}
        {!paid && !expired && booking.status === 'approved' && (
          <>
            {/* Alert */}
            <div style={{ background: 'rgba(15,50,25,0.9)', border: '0.5px solid rgba(37,180,80,0.3)', borderRadius: 6, padding: '14px 18px', fontSize: 13, color: '#7be89a', fontFamily: 'Arial, sans-serif', marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 10, lineHeight: 1.6 }}>
              <div style={{ width: 8, height: 8, minWidth: 8, borderRadius: '50%', background: '#25d366', marginTop: 4 }} />
              <div><strong>Offer approved for you.</strong> Your room is held — pay before the timer ends to lock it in.</div>
            </div>

            {/* Timer */}
            <div style={{ background: 'rgba(60,8,8,0.6)', border: '0.5px solid rgba(160,40,40,0.4)', borderRadius: 8, padding: '20px 24px', marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 10, letterSpacing: 2.5, color: 'rgba(255,255,255,0.4)', fontFamily: 'Arial, sans-serif', marginBottom: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#e05555', animation: 'blink 1s infinite' }} />
                    OFFER EXPIRES IN
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontFamily: 'Arial, sans-serif' }}>After this, room returns to open listing</div>
                </div>
                <div style={{ fontSize: 42, fontWeight: 700, color: '#e87070', fontFamily: "'Courier New', monospace", letterSpacing: 4, lineHeight: 1 }}>
                  {secsLeft !== null ? fmtTimer(secsLeft) : '—'}
                </div>
              </div>
            </div>

            {/* Room Card */}
            <div style={{ background: '#111108', border: '0.5px solid rgba(201,168,76,0.2)', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
              <div onClick={() => setBreakdownOpen(o => !o)} style={{ padding: '13px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '0.5px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
                <div style={{ fontSize: 10, letterSpacing: 2, color: 'rgba(255,255,255,0.4)', fontFamily: 'Arial, sans-serif' }}>
                  {booking.propertyName?.toUpperCase()}{booking.roomNumber ? ` · ROOM ${booking.roomNumber}` : ''}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ background: '#2a2510', border: '0.5px solid rgba(201,168,76,0.4)', color: '#C9A84C', fontSize: 10, letterSpacing: 1.5, padding: '4px 12px', borderRadius: 20, fontFamily: 'Arial, sans-serif' }}>
                    1 SEAT LEFT
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>{breakdownOpen ? '▲' : '▼'}</span>
                </div>
              </div>

              <div style={{ padding: '20px 20px 16px' }}>
                {booking.actualRent > 0 && (
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', fontFamily: 'Arial, sans-serif', marginBottom: 4, textDecoration: 'line-through' }}>
                    ₹{fmt(booking.actualRent)}/mo
                  </div>
                )}
                <div style={{ fontSize: 44, fontWeight: 700, color: '#C9A84C', lineHeight: 1, display: 'flex', alignItems: 'flex-start' }}>
                  <sup style={{ fontSize: 20, marginTop: 8 }}>₹</sup>
                  {fmt(booking.discountedRent || 0)}
                  <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.35)', fontWeight: 400, alignSelf: 'flex-end', marginBottom: 4 }}>/mo</span>
                </div>
                {savings > 0 && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(15,55,25,0.9)', border: '0.5px solid rgba(37,180,80,0.25)', color: '#7be89a', fontSize: 11, padding: '5px 12px', borderRadius: 20, fontFamily: 'Arial, sans-serif', margin: '12px 0' }}>
                    ✓ You save ₹{fmt(savings)} every month
                  </div>
                )}
              </div>

              {breakdownOpen && (
                <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.07)', padding: '16px 20px' }}>
                  {[
                    ['First Month Rent', booking.discountedRent],
                    ['Refundable Deposit', booking.deposit],
                    ['Maintenance (Monthly)', booking.maintenanceFee],
                  ].map(([label, val]) => (
                    <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '0.5px solid rgba(255,255,255,0.05)', fontSize: 13, fontFamily: 'Arial, sans-serif', color: 'rgba(255,255,255,0.65)' }}>
                      <span>{label}</span><span>₹{fmt(val as number || 0)}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '0.5px solid rgba(255,255,255,0.05)', fontSize: 14, fontFamily: 'Arial, sans-serif', fontWeight: 700, color: '#fff' }}>
                    <span>Total at Move-In</span><span>₹{fmt(total)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', fontSize: 14, fontFamily: 'Arial, sans-serif', fontWeight: 700, color: '#C9A84C' }}>
                    <span>Pay Now to Lock Room</span><span>₹{fmt(booking.tokenAmount || 0)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Why box */}
            <div style={{ background: '#161610', border: '0.5px solid rgba(201,168,76,0.25)', borderRadius: 6, padding: '18px 20px', marginBottom: 16, fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.8, fontFamily: 'Arial, sans-serif' }}>
              <strong style={{ color: '#C9A84C' }}>Why ₹{fmt(booking.tokenAmount || 0)} now?</strong> This is your room lock-in amount — it confirms the room is yours and freezes the offer price. The remaining balance is collected at check-in. If you don't pay in the next <strong style={{ color: '#fff' }}>15 minutes</strong>, this room goes back to the open listing.
            </div>

            {/* Payment Section */}
            <div style={{ fontSize: 10, letterSpacing: 2.5, color: 'rgba(255,255,255,0.3)', fontFamily: 'Arial, sans-serif', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
              PAY ₹{fmt(booking.tokenAmount || 0)} TO LOCK YOUR ROOM
              <div style={{ flex: 1, height: 0.5, background: 'rgba(255,255,255,0.1)' }} />
            </div>

            {/* Pay Tabs */}
            <div style={{ display: 'flex', background: '#111108', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 6, overflow: 'hidden', marginBottom: 16 }}>
              {([['qr', '📱', 'Scan QR'], ['upi', '💳', 'UPI ID'], ['bank', '🏦', 'Bank']] as const).map(([tab, icon, label]) => (
                <div key={tab} onClick={() => setActiveTab(tab)}
                  style={{ flex: 1, padding: '13px 8px', textAlign: 'center', fontSize: 12, fontFamily: 'Arial, sans-serif', color: activeTab === tab ? '#C9A84C' : 'rgba(255,255,255,0.4)', cursor: 'pointer', borderRight: tab !== 'bank' ? '0.5px solid rgba(255,255,255,0.06)' : 'none', borderBottom: activeTab === tab ? '2px solid #C9A84C' : '2px solid transparent', background: activeTab === tab ? '#1a1a10' : 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 18 }}>{icon}</span>
                  {label}
                </div>
              ))}
            </div>

            {/* QR Panel */}
            {activeTab === 'qr' && (
              <div style={{ background: '#111108', border: '0.5px solid rgba(201,168,76,0.15)', borderRadius: 6, padding: '24px 20px', marginBottom: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 10, letterSpacing: 2.5, color: '#C9A84C', fontFamily: 'Arial, sans-serif', marginBottom: 6 }}>Scan to Pay ₹{fmt(booking.tokenAmount || 0)}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontFamily: 'Arial, sans-serif', marginBottom: 20 }}>Use GPay, PhonePe, Paytm, or your bank app.</div>
                {upiLink ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                    <div style={{ background: '#fff', padding: 12, borderRadius: 8, display: 'inline-block' }}>
                      <QRCodeSVG value={upiLink} size={180} />
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'Arial, sans-serif', fontSize: 12, margin: 0 }}>
                      UPI ID: <strong style={{ color: '#C9A84C' }}>{booking.upiId}</strong>
                    </p>
                  </div>
                ) : (
                  <div style={{ background: 'rgba(201,168,76,0.08)', border: '0.5px solid rgba(201,168,76,0.2)', borderRadius: 8, padding: '20px' }}>
                    <p style={{ color: '#C9A84C', fontFamily: 'Arial, sans-serif', fontSize: 13, marginBottom: 8 }}>
                      Contact us on WhatsApp for payment details
                    </p>
                    <a href={waHref} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: '#25d366', color: '#fff', borderRadius: 6, fontSize: 12, fontFamily: 'Arial, sans-serif', fontWeight: 700, textDecoration: 'none' }}>
                      💬 WhatsApp Us
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* UPI Panel */}
            {activeTab === 'upi' && (
              <div style={{ background: '#111108', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '20px', marginBottom: 16 }}>
                <div style={{ fontSize: 10, letterSpacing: 2.5, color: 'rgba(255,255,255,0.3)', fontFamily: 'Arial, sans-serif', marginBottom: 12 }}>UPI ID</div>
                <div style={{ padding: '12px 14px', border: '0.5px solid rgba(201,168,76,0.4)', borderRadius: 4, fontSize: 16, fontFamily: 'Arial, sans-serif', color: '#C9A84C', marginBottom: 8, letterSpacing: 1 }}>
                  {booking.upiId || '—'}
                </div>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontFamily: 'Arial, sans-serif' }}>
                  Copy this UPI ID into any payment app and send ₹{fmt(booking.tokenAmount || 0)}.
                </p>
              </div>
            )}

            {/* Bank Panel */}
            {activeTab === 'bank' && (
              <div style={{ background: '#111108', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '20px', marginBottom: 16 }}>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontFamily: 'Arial, sans-serif', lineHeight: 1.7 }}>
                  For bank transfer details, please message us on WhatsApp. We'll share NEFT/IMPS details within minutes.
                </p>
                <a href={waHref} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 12, padding: '10px 20px', background: '#25d366', color: '#fff', borderRadius: 6, fontSize: 12, fontFamily: 'Arial, sans-serif', fontWeight: 700, textDecoration: 'none' }}>
                  💬 Get Bank Details on WhatsApp
                </a>
              </div>
            )}

            {/* After payment steps */}
            <div style={{ background: 'rgba(10,35,15,0.7)', border: '0.5px solid rgba(37,180,80,0.2)', borderRadius: 8, padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>After You Pay</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', fontFamily: 'Arial, sans-serif', lineHeight: 1.6, marginBottom: 16 }}>
                Send your payment screenshot on WhatsApp — we confirm within minutes.
              </div>
              <a href={waHref} target="_blank" rel="noopener noreferrer" style={{ width: '100%', padding: 14, background: '#25d366', color: '#fff', border: 'none', fontSize: 13, letterSpacing: 1, fontFamily: 'Arial, sans-serif', fontWeight: 700, cursor: 'pointer', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, textDecoration: 'none' }}>
                <span style={{ fontSize: 18 }}>💬</span> I've Paid — Send Screenshot
              </a>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: 'Arial, sans-serif', textAlign: 'center', marginTop: 10, lineHeight: 1.6 }}>
                We reply fast. Room confirmed once we verify your payment.
              </p>
            </div>

            {/* FAQ */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 10, letterSpacing: 2.5, color: 'rgba(255,255,255,0.3)', fontFamily: 'Arial, sans-serif', marginBottom: 16 }}>FREQUENTLY ASKED QUESTIONS</div>
              {[
                ['Is this token amount refundable?', "Yes — it gets adjusted in your first month's rent. You pay less at move-in."],
                ['What if I don\'t pay in 15 minutes?', 'The room goes back to open listing. Message us on WhatsApp and we\'ll try to reactivate your offer.'],
                ['Is it safe to pay here?', "You're paying directly to Gharpayy's UPI. No third-party involved. Screenshot confirms your booking."],
                ['When do I get room access?', 'Our team confirms via WhatsApp within minutes of payment. Check-in details follow.'],
                ['Can I visit the property first?', 'Absolutely. Message us on WhatsApp and we\'ll schedule a visit — token locks your priority slot.'],
              ].map(([q, a]) => (
                <FAQItem key={q} question={q} answer={a} />
              ))}
            </div>

            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', textAlign: 'center', lineHeight: 1.7, fontFamily: 'Arial, sans-serif', marginBottom: 12 }}>
              Room lock-in is non-refundable if you cancel within 48 hours of check-in. For queries, message us on WhatsApp.
            </p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
              © 2025–2026 Gharpayy. All rights reserved.
            </p>
          </>
        )}

        {/* PENDING STATE */}
        {!paid && !expired && booking.status === 'pending' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', border: '1.5px solid rgba(201,168,76,0.15)', borderTopColor: '#C9A84C', animation: 'spin 1.2s linear infinite', marginBottom: 28 }} />
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Request Under Review</h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', maxWidth: 360, lineHeight: 1.8, fontFamily: 'Arial, sans-serif' }}>
              Our team is checking availability for <strong style={{ color: '#fff' }}>{booking.propertyName}</strong>. You'll get your offer link on WhatsApp shortly.
            </p>
          </div>
        )}
      </div>

      {/* Sticky bottom pay bar */}
      {!paid && !expired && booking.status === 'approved' && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#0c0c0a', borderTop: '0.5px solid rgba(255,255,255,0.1)', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 14, zIndex: 200 }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 10, letterSpacing: 1.5, color: 'rgba(255,255,255,0.3)', fontFamily: 'Arial, sans-serif', marginBottom: 2 }}>PAY NOW TO LOCK</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#C9A84C', fontFamily: 'Georgia, serif' }}>₹{fmt(booking.tokenAmount || 0)}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontFamily: 'Arial, sans-serif' }}>Adjusted in first month rent</div>
          </div>
          <a href={waHref} target="_blank" rel="noopener noreferrer" style={{ flex: 1, padding: 15, background: '#C9A84C', color: '#0c0c0a', border: 'none', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'Arial, sans-serif', fontWeight: 700, cursor: 'pointer', borderRadius: 4, textAlign: 'center', textDecoration: 'none', display: 'block' }}>
            Pay & Confirm on WhatsApp
          </a>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  );
}
