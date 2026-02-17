export function App() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
        background:
          'radial-gradient(circle at top, #0f172a 0, #020617 40%, #000000 100%)',
        color: '#e5e7eb',
        padding: '2rem'
      }}
    >
      <div
        style={{
          maxWidth: '720px',
          width: '100%',
          borderRadius: '1.5rem',
          border: '1px solid rgba(148, 163, 184, 0.35)',
          background:
            'linear-gradient(to bottom right, rgba(15, 23, 42, 0.95), rgba(15, 23, 42, 0.75))',
          boxShadow:
            '0 24px 80px rgba(15, 23, 42, 0.85), 0 0 0 1px rgba(15, 23, 42, 1)',
          padding: '2rem 2.4rem'
        }}
      >
        <h1
          style={{
            fontSize: '2rem',
            marginBottom: '0.5rem',
            fontWeight: 700,
            letterSpacing: '-0.04em'
          }}
        >
          Stellar RevenueShare – Revora
        </h1>
        <p style={{ marginBottom: '1.5rem', color: '#9ca3af' }}>
          Tokenized revenue-sharing infrastructure on Stellar. This is a basic
          frontend shell you can extend into startup and investor dashboards.
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.25rem'
          }}
        >
          <section
            style={{
              borderRadius: '1rem',
              border: '1px solid rgba(156, 163, 175, 0.4)',
              padding: '1rem 1.2rem',
              background: 'rgba(15, 23, 42, 0.9)'
            }}
          >
            <h2
              style={{
                fontSize: '0.95rem',
                fontWeight: 600,
                marginBottom: '0.5rem'
              }}
            >
              Startup Dashboard
            </h2>
            <ul style={{ fontSize: '0.85rem', color: '#9ca3af' }}>
              <li>Configure revenue-share offerings</li>
              <li>Report monthly revenue</li>
              <li>Track on-chain payouts</li>
            </ul>
          </section>
          <section
            style={{
              borderRadius: '1rem',
              border: '1px solid rgba(156, 163, 175, 0.4)',
              padding: '1rem 1.2rem',
              background: 'rgba(15, 23, 42, 0.9)'
            }}
          >
            <h2
              style={{
                fontSize: '0.95rem',
                fontWeight: 600,
                marginBottom: '0.5rem'
              }}
            >
              Investor Portal
            </h2>
            <ul style={{ fontSize: '0.85rem', color: '#9ca3af' }}>
              <li>Discover offerings</li>
              <li>Invest using USDC on Stellar</li>
              <li>See revenue-share distributions</li>
            </ul>
          </section>
        </div>
        <div
          style={{
            marginTop: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.8rem',
            color: '#6b7280'
          }}
        >
          <span>revora-frontend (React + Vite + TS)</span>
          <span>Connect this UI to your backend at `/api/*`</span>
        </div>
      </div>
    </div>
  );
}

