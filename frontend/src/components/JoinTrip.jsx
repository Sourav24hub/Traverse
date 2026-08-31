import { useState } from 'react';
import { joinTrip } from '../api/mockApi';
import './JoinTrip.css';

export default function JoinTrip({ onBack }) {
  const [roomCode, setRoomCode] = useState('');
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    const res = await joinTrip({ roomCode: roomCode.trim().toUpperCase(), userName: userName.trim() });

    setLoading(false);

    if (!res.ok) {
      setError(res.data.error);
    } else {
      setResult(res.data);
    }
  }

  /* ---------- Success state ---------- */
  if (result) {
    return (
      <div className="jt-success" id="join-trip-success">
        <div className="jt-success-icon">
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
            <circle cx="28" cy="28" r="28" fill="url(#joinGrad)" />
            <path d="M18 28.5L24.5 35L38 21" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            <defs>
              <linearGradient id="joinGrad" x1="0" y1="0" x2="56" y2="56">
                <stop stopColor="#818cf8" />
                <stop offset="1" stopColor="#c084fc" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <h2 className="jt-success-title">You're In!</h2>
        <p className="jt-success-sub">
          Welcome, <strong>{userName}</strong>. You've joined the trip.
        </p>

        <div className="jt-detail-card">
          <div className="jt-detail-row">
            <span className="jt-detail-label">Trip ID</span>
            <span className="jt-detail-value">{result.tripId}</span>
          </div>
          <div className="jt-detail-row">
            <span className="jt-detail-label">User ID</span>
            <span className="jt-detail-value">{result.userId}</span>
          </div>
        </div>

        <button className="jt-btn jt-btn--outline" onClick={onBack} id="join-trip-done-btn">
          ← Back to Home
        </button>
      </div>
    );
  }

  /* ---------- Form state ---------- */
  return (
    <form className="jt-form" onSubmit={handleSubmit} id="join-trip-form">
      <button type="button" className="jt-back" onClick={onBack} id="join-trip-back-btn">
        ← Back
      </button>

      <h1 className="jt-title">Join a Trip</h1>
      <p className="jt-subtitle">Enter the room code shared by your trip leader.</p>

      <div className="jt-code-field" id="join-trip-code-field">
        <span className="jt-label">Room Code</span>
        <input
          className="jt-code-input"
          type="text"
          maxLength={6}
          placeholder="E.g. X72K9P"
          required
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          autoComplete="off"
          spellCheck="false"
          id="join-trip-roomcode"
        />
      </div>

      <label className="jt-field" id="join-trip-name-field">
        <span className="jt-label">Your Name</span>
        <input
          className="jt-input"
          type="text"
          placeholder="What should we call you?"
          required
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          id="join-trip-username"
        />
      </label>

      {/* Error */}
      {error && (
        <div className="jt-error" id="join-trip-error" role="alert">
          <span className="jt-error-icon">⚠️</span>
          <div>
            <strong>{error.code}</strong>
            <p>{error.message}</p>
          </div>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        className="jt-btn jt-btn--primary"
        disabled={loading}
        id="join-trip-submit"
      >
        {loading ? (
          <span className="jt-spinner-wrap">
            <span className="jt-spinner" />
            Joining…
          </span>
        ) : (
          'Join Trip'
        )}
      </button>
    </form>
  );
}
