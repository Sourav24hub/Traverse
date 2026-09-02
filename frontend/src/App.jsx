import { useState } from 'react'
import CreateTrip from './components/CreateTrip'
import JoinTrip from './components/JoinTrip'
import './App.css'

/* ── Topographic contour SVG (inline, no external file) ── */
function TopoTexture() {
  return (
    <svg
      className="landing-topo"
      viewBox="0 0 900 320"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Contour lines — hand-tuned bezier curves that read like topo rings */}
      <path d="M-20 220 C80 190, 180 240, 280 210 S440 160, 560 195 S700 240, 820 200 S900 175, 940 180" stroke="rgba(255,255,255,0.055)" strokeWidth="1.2"/>
      <path d="M-20 240 C60 208, 170 258, 290 228 S450 178, 570 213 S710 258, 830 218 S910 193, 950 198" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
      <path d="M-20 200 C90 172, 200 222, 300 192 S460 142, 580 177 S720 222, 840 182 S920 157, 960 162" stroke="rgba(255,255,255,0.07)" strokeWidth="1.4"/>
      <path d="M-20 180 C100 155, 220 200, 320 175 S480 128, 600 160 S740 202, 860 165 S930 140, 970 145" stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
      <path d="M-20 260 C50 230, 160 270, 270 245 S430 198, 545 228 S685 268, 800 232 S890 208, 940 214" stroke="rgba(255,255,255,0.035)" strokeWidth="0.8"/>
      <path d="M-20 155 C110 135, 240 175, 345 152 S505 108, 625 138 S765 178, 880 144 S948 120, 980 126" stroke="rgba(255,255,255,0.045)" strokeWidth="1"/>
      <path d="M-20 130 C125 112, 265 148, 375 128 S535 88, 655 115 S795 152, 910 120 S962 98, 992 103" stroke="rgba(255,255,255,0.03)" strokeWidth="0.7"/>
      {/* Route line — a bold trail across the landscape */}
      <path d="M60 270 C140 250, 200 200, 300 185 S420 175, 500 160 S620 145, 720 155 S820 170, 880 150" stroke="rgba(232,96,44,0.35)" strokeWidth="2" strokeDasharray="6 4"/>
      {/* Start dot */}
      <circle cx="60" cy="270" r="5" fill="rgba(232,96,44,0.6)"/>
      {/* End pin */}
      <circle cx="880" cy="150" r="5" fill="rgba(232,96,44,0.6)"/>
      <circle cx="880" cy="150" r="10" fill="none" stroke="rgba(232,96,44,0.3)" strokeWidth="1.5"/>
    </svg>
  )
}

function App() {
  const [screen, setScreen] = useState('landing')

  return (
    <div className="app-shell">
      {screen === 'landing' && (
        <div className="landing" id="landing-screen">

          {/* ── Top nav ── */}
          <nav className="landing-nav">
            <span className="landing-wordmark">traverse</span>
          </nav>

          {/* ── Hero block — full bleed Trail Ink ── */}
          <section className="landing-hero">
            <TopoTexture />
            <div className="landing-hero-content">
              <h1 className="landing-display">
                Your journey,<br />
                <em>mapped in real time.</em>
              </h1>
              <p className="landing-lead">
                AI trip planning + live location tracking for solo adventurers and groups.
              </p>
              <div className="landing-cta-group">
                <button
                  className="btn-primary"
                  onClick={() => setScreen('create')}
                  id="go-create-trip"
                >
                  Start a trip →
                </button>
                <button
                  className="btn-ghost"
                  onClick={() => setScreen('join')}
                  id="go-join-trip"
                >
                  Join with code
                </button>
              </div>
            </div>
          </section>

          {/* ── Below-fold feature strip ── */}
          <section className="landing-features">
            <div className="feature-item">
              <span className="feature-icon">📍</span>
              <span className="feature-text">Live location sharing</span>
            </div>
            <span className="feature-sep">·</span>
            <div className="feature-item">
              <span className="feature-icon">🗺</span>
              <span className="feature-text">AI route planning</span>
            </div>
            <span className="feature-sep">·</span>
            <div className="feature-item">
              <span className="feature-icon">🔁</span>
              <span className="feature-text">Real-time replanning</span>
            </div>
            <span className="feature-sep">·</span>
            <div className="feature-item">
              <span className="feature-icon">👥</span>
              <span className="feature-text">Group rooms</span>
            </div>
          </section>

        </div>
      )}

      {screen === 'create' && (
        <CreateTrip onBack={() => setScreen('landing')} />
      )}

      {screen === 'join' && (
        <JoinTrip onBack={() => setScreen('landing')} />
      )}
    </div>
  )
}

export default App
