import { useState } from 'react';
import { joinTrip } from '../api/mockApi';
import './JoinTrip.css';

export default function JoinTrip({ onBack, onSuccess }) {
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
      if (res.data?.userId) {
        sessionStorage.setItem('traverse_current_userId', res.data.userId);
      }
      setResult(res.data);
    }
  }

  /* ---------- Success state ---------- */
  if (result) {
    return (
      <div className="jt-page" id="join-trip-success">
        <button type="button" className="jt-back" onClick={onBack}>← Back</button>
        <div className="jt-success">
          <div className="jt-success-icon">
            <svg width="56" height="68" viewBox="0 0 56 68" fill="none">
              <path d="M28 0C12.536 0 0 12.536 0 28c0 10.386 5.664 19.432 14.04 24.248L28 68l13.96-15.752C50.336 47.432 56 38.386 56 28 56 12.536 43.464 0 28 0Z" fill="#0d9488"/>
              <path d="M18 28.5L24.5 35L38 21" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
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

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button className="jt-btn-secondary" onClick={onBack} id="join-trip-done-btn">
              ← Back to home
            </button>
            {onSuccess && (
              <button
                className="jt-btn-primary"
                onClick={() => onSuccess({ tripId: result.tripId, userId: result.userId, destination: 'Group Trip', roomCode: roomCode.trim().toUpperCase(), mode: 'group' })}
                id="join-trip-itinerary-btn"
              >
                View Itinerary →
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Form state ---------- */
  return (
    <div className="jt-page" id="join-trip-form-page">
      {/* ── Dark header band ── */}
      <header className="jt-header">
        <button type="button" className="jt-back jt-back--light" onClick={onBack} id="join-trip-back-btn">
          ← Back
        </button>
        <h1 className="jt-display">
          Join the<br /><em>journey.</em>
        </h1>
        <p className="jt-header-sub">Enter the room code shared by your trip leader.</p>
      </header>

      {/* ── Form card ── */}
      <form className="jt-form" onSubmit={handleSubmit} id="join-trip-form">

        {/* Room Code */}
        <div className="jt-code-section" id="join-trip-code-field">
          <span className="jt-label">Room Code</span>
          <input
            className="jt-code-input"
            type="text"
            maxLength={6}
            placeholder="X72K9P"
            required
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            autoComplete="off"
            spellCheck="false"
            id="join-trip-roomcode"
          />
        </div>

        {/* Name */}
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
          className="jt-btn-primary"
          disabled={loading}
          id="join-trip-submit"
        >
          {loading ? (
            <span className="jt-spinner-wrap">
              <span className="jt-spinner" />
              Joining…
            </span>
          ) : (
            'Join Trip →'
          )}
        </button>
      </form>
    </div>
  );
}
