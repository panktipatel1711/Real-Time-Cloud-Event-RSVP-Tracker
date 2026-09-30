import React, { useState } from 'react';

export default function App() {
  const [going, setGoing] = useState(48);
  const [maybe, setMaybe] = useState(12);
  const [notGoing, setNotGoing] = useState(7);
  const [myRsvp, setMyRsvp] = useState(null);

  const handleRSVP = (type) => {
    if (myRsvp === type) return;
    
    // Previous state adjust
    if (myRsvp === 'GOING') setGoing((prev) => Math.max(0, prev - 1));
    if (myRsvp === 'MAYBE') setMaybe((prev) => Math.max(0, prev - 1));
    if (myRsvp === 'NOT_GOING') setNotGoing((prev) => Math.max(0, prev - 1));

    // New state set
    if (type === 'GOING') setGoing((prev) => prev + 1);
    if (type === 'MAYBE') setMaybe((prev) => prev + 1);
    if (type === 'NOT_GOING') setNotGoing((prev) => prev + 1);

    setMyRsvp(type);
  };

  const capacity = 100;
  const utilization = Math.min(Math.round((going / capacity) * 100), 100);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'sans-serif', padding: '24px' }}>
      <header style={{ maxWidth: '900px', margin: '0 auto 24px auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#0f172a' }}>CloudRSVP Platform</h1>
        <span style={{ fontSize: '12px', background: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: '12px', fontWeight: '600' }}>
          Live Telemetry Active
        </span>
      </header>

      <main style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Live Counters */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
          <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>GOING</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#16a34a' }}>{going}</div>
          </div>
          <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>MAYBE</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#d97706' }}>{maybe}</div>
          </div>
          <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>NOT GOING</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#dc2626' }}>{notGoing}</div>
          </div>
          <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>UTILIZATION</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#2563eb' }}>{utilization}%</div>
          </div>
        </div>

        {/* RSVP Card */}
        <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h2 style={{ marginTop: 0, color: '#0f172a' }}>Cloud Computing Workshop 2026</h2>
          <p style={{ color: '#475569', fontSize: '14px' }}>
            Venue: Auditorium Hall B &bull; Max Capacity: {capacity} Seats
          </p>

          <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
            <button
              onClick={() => handleRSVP('GOING')}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                background: myRsvp === 'GOING' ? '#16a34a' : '#f1f5f9',
                color: myRsvp === 'GOING' ? '#fff' : '#0f172a',
                fontWeight: '600',
              }}
            >
              Going
            </button>
            <button
              onClick={() => handleRSVP('MAYBE')}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                background: myRsvp === 'MAYBE' ? '#d97706' : '#f1f5f9',
                color: myRsvp === 'MAYBE' ? '#fff' : '#0f172a',
                fontWeight: '600',
              }}
            >
              Maybe
            </button>
            <button
              onClick={() => handleRSVP('NOT_GOING')}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                background: myRsvp === 'NOT_GOING' ? '#dc2626' : '#f1f5f9',
                color: myRsvp === 'NOT_GOING' ? '#fff' : '#0f172a',
                fontWeight: '600',
              }}
            >
              Not Going
            </button>
          </div>

          {myRsvp && (
            <p style={{ marginTop: '16px', fontSize: '13px', color: '#16a34a', fontWeight: '500' }}>
              Your response ({myRsvp}) has been updated locally in real time.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}