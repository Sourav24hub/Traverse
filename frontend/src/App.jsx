import { useState } from 'react'
import CreateTrip from './components/CreateTrip'
import JoinTrip from './components/JoinTrip'
import './App.css'

function App() {
  // 'landing' | 'create' | 'join'
  const [screen, setScreen] = useState('landing')

  return (
    <div className="app-shell">
      {screen === 'landing' && (
        <div className="landing" id="landing-screen">
          {/* Logo */}
          <div className="landing-logo" aria-hidden="true">🧭</div>

          <h1 className="landing-brand">Traverse</h1>
          <p className="landing-tagline">
            Your AI-powered travel companion. Plan, track, adapt, and
            visualize your journey — together or solo.
          </p>

          {/* Action cards */}
          <div className="landing-actions">
            <button
              className="landing-card"
              onClick={() => setScreen('create')}
              id="go-create-trip"
            >
              <span className="landing-card-icon">🗺️</span>
              <span className="landing-card-title">Create Trip</span>
              <span className="landing-card-desc">
                Start a new trip or outing and invite your crew
              </span>
            </button>

            <button
              className="landing-card"
              onClick={() => setScreen('join')}
              id="go-join-trip"
            >
              <span className="landing-card-icon">🔗</span>
              <span className="landing-card-title">Join Trip</span>
              <span className="landing-card-desc">
                Enter a room code to hop into a group trip
              </span>
            </button>
          </div>

          <p className="landing-footer">Plan → Generate → Travel → Adapt → Reward</p>
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
