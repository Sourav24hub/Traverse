import { useState } from 'react';
import { createTrip } from '../api/mockApi';
import './CreateTrip.css';

const INITIAL = {
  type: 'trip',
  mode: 'group',
  destination: '',
  days: 1,
  people: 1,
  prompt: '',
};

export default function CreateTrip({ onBack }) {
  const [form, setForm] = useState(INITIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const set = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  const setNum = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: Math.max(1, Number(e.target.value)) }));

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    const res = await createTrip({
      ...form,
      days: Number(form.days),
      people: Number(form.people),
    });

    setLoading(false);

    if (!res.ok) {
      setError(res.data.error);
    } else {
      setResult(res.data);
    }
  }

  function copyCode() {
    if (result?.roomCode) {
      navigator.clipboard.writeText(result.roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  /* ---------- Success state ---------- */
  if (result) {
    return (
      <div className="ct-success" id="create-trip-success">
        <div className="ct-success-icon">
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
            <circle cx="28" cy="28" r="28" fill="url(#successGrad)" />
            <path d="M18 28.5L24.5 35L38 21" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            <defs>
              <linearGradient id="successGrad" x1="0" y1="0" x2="56" y2="56">
                <stop stopColor="#34d399" />
                <stop offset="1" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <h2 className="ct-success-title">Trip Created!</h2>
        <p className="ct-success-sub">
          Your trip to <strong>{form.destination}</strong> is ready.
        </p>

        {result.roomCode && (
          <div className="ct-room-code-card">
            <span className="ct-room-label">Room Code</span>
            <button
              className="ct-room-value"
              onClick={copyCode}
              title="Click to copy"
              id="room-code-copy-btn"
            >
              {result.roomCode}
              <span className="ct-copy-hint">{copied ? 'Copied!' : 'Click to copy'}</span>
            </button>
            <p className="ct-room-help">
              Share this code with your travel companions so they can join.
            </p>
          </div>
        )}

        <button className="ct-btn ct-btn--outline" onClick={onBack} id="create-trip-done-btn">
          ← Back to Home
        </button>
      </div>
    );
  }

  /* ---------- Form state ---------- */
  return (
    <form className="ct-form" onSubmit={handleSubmit} id="create-trip-form">
      <button type="button" className="ct-back" onClick={onBack} id="create-trip-back-btn">
        ← Back
      </button>

      <h1 className="ct-title">Create a Trip</h1>
      <p className="ct-subtitle">Set up your next adventure — your crew can join later.</p>

      {/* Type */}
      <fieldset className="ct-field" id="create-trip-type-field">
        <legend>What are you planning?</legend>
        <div className="ct-toggle-group">
          <label className={`ct-toggle ${form.type === 'trip' ? 'ct-toggle--active' : ''}`}>
            <input type="radio" name="type" value="trip" checked={form.type === 'trip'} onChange={set('type')} />
            <span className="ct-toggle-icon">🧳</span>
            <span>
              <strong>Trip</strong>
              <small>Multi-day journey</small>
            </span>
          </label>
          <label className={`ct-toggle ${form.type === 'outing' ? 'ct-toggle--active' : ''}`}>
            <input type="radio" name="type" value="outing" checked={form.type === 'outing'} onChange={set('type')} />
            <span className="ct-toggle-icon">☀️</span>
            <span>
              <strong>Outing</strong>
              <small>Single-day adventure</small>
            </span>
          </label>
        </div>
      </fieldset>

      {/* Mode */}
      <fieldset className="ct-field" id="create-trip-mode-field">
        <legend>Who's coming along?</legend>
        <div className="ct-toggle-group">
          <label className={`ct-toggle ${form.mode === 'solo' ? 'ct-toggle--active' : ''}`}>
            <input type="radio" name="mode" value="solo" checked={form.mode === 'solo'} onChange={set('mode')} />
            <span className="ct-toggle-icon">🧍</span>
            <span>
              <strong>Solo</strong>
              <small>Just me</small>
            </span>
          </label>
          <label className={`ct-toggle ${form.mode === 'group' ? 'ct-toggle--active' : ''}`}>
            <input type="radio" name="mode" value="group" checked={form.mode === 'group'} onChange={set('mode')} />
            <span className="ct-toggle-icon">👥</span>
            <span>
              <strong>Group</strong>
              <small>Generates a room code</small>
            </span>
          </label>
        </div>
      </fieldset>

      {/* Destination */}
      <label className="ct-field" id="create-trip-destination-field">
        <span className="ct-label">Destination</span>
        <input
          className="ct-input"
          type="text"
          placeholder="e.g. Vaishno Devi, Goa, Paris…"
          required
          value={form.destination}
          onChange={set('destination')}
          id="create-trip-destination"
        />
      </label>

      {/* Days & People */}
      <div className="ct-row">
        <label className="ct-field" id="create-trip-days-field">
          <span className="ct-label">Days</span>
          <input
            className="ct-input"
            type="number"
            min={1}
            max={30}
            value={form.days}
            onChange={setNum('days')}
            id="create-trip-days"
          />
        </label>
        <label className="ct-field" id="create-trip-people-field">
          <span className="ct-label">People</span>
          <input
            className="ct-input"
            type="number"
            min={1}
            max={50}
            value={form.people}
            onChange={setNum('people')}
            id="create-trip-people"
          />
        </label>
      </div>

      {/* Prompt */}
      <label className="ct-field" id="create-trip-prompt-field">
        <span className="ct-label">Custom Prompt <small>(optional)</small></span>
        <textarea
          className="ct-textarea"
          rows={3}
          placeholder="Any preferences? e.g. '4 people are vegetarian', 'wheelchair accessible routes'…"
          value={form.prompt}
          onChange={set('prompt')}
          id="create-trip-prompt"
        />
      </label>

      {/* Error */}
      {error && (
        <div className="ct-error" id="create-trip-error" role="alert">
          <span className="ct-error-icon">⚠️</span>
          <div>
            <strong>{error.code}</strong>
            <p>{error.message}</p>
          </div>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        className="ct-btn ct-btn--primary"
        disabled={loading}
        id="create-trip-submit"
      >
        {loading ? (
          <span className="ct-spinner-wrap">
            <span className="ct-spinner" />
            Creating…
          </span>
        ) : (
          'Create Trip'
        )}
      </button>
    </form>
  );
}
