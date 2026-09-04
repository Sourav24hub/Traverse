import { useState } from 'react';
import { createTrip } from '../api/mockApi';
import './TripDetails.css';

/**
 * Page 4 — Trip Details form + backend call + success/room-code display
 *
 * Props:
 *   mode      'solo' | 'group'   — from Page 2
 *   type      'trip' | 'outing'  — from Page 3
 *   onBack    () => void
 *   onSuccess ({ tripId, destination, roomCode }) => void
 *
 * Bug fixes applied:
 *   1. Solo → "people" field is NOT rendered; backend receives people: 1
 *   2. Outing → "days" field is NOT rendered; backend receives days: 1
 *   3. Group trips always show the roomCode returned from backend in success state
 */
const MIN_DAYS = 1;
const MAX_DAYS = 14;

export default function TripDetails({ mode, type, onBack, onSuccess }) {
  const [destination, setDestination] = useState('');
  const [days, setDays]               = useState('');
  const [daysError, setDaysError]     = useState('');
  const [people, setPeople]           = useState('');
  const [prompt, setPrompt]           = useState('');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);

  // Success state — shown inline before navigating to itinerary
  const [success, setSuccess] = useState(null); // { tripId, roomCode, adminUserId }
  const [copied, setCopied]   = useState(false);

  const isSolo   = mode === 'solo';
  const isOuting = type === 'outing';
  const isGroup  = mode === 'group';

  function handleDaysChange(e) {
    const raw = e.target.value;
    if (raw === '') {
      setDays('');
      setDaysError('');
      return;
    }
    const val = Number(raw);
    setDays(raw);
    if (isNaN(val)) {
      setDaysError('Please enter a valid number of days.');
    } else if (val > MAX_DAYS) {
      setDaysError(`Trips are capped at a maximum of ${MAX_DAYS} days for AI itineraries.`);
    } else if (val < MIN_DAYS) {
      setDaysError(`Trips must be at least ${MIN_DAYS} day.`);
    } else {
      setDaysError('');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!isOuting) {
      const d = Number(days);
      if (!days || isNaN(d)) {
        setDaysError('Please enter the number of days.');
        return;
      }
      if (d > MAX_DAYS) {
        setDaysError(`Trips are capped at a maximum of ${MAX_DAYS} days for AI itineraries.`);
        return;
      }
      if (d < MIN_DAYS) {
        setDaysError(`Trips must be at least ${MIN_DAYS} day.`);
        return;
      }
    }

    setLoading(true);
    setError(null);

    const payload = {
      type,
      mode,
      destination: destination.trim(),
      // Outing = always 1 day; never ask
      days:   isOuting ? 1 : Number(days),
      // Solo = always 1 person; never ask
      people: isSolo   ? 1 : Number(people),
      prompt: prompt.trim(),
    };

    const res = await createTrip(payload);
    setLoading(false);

    if (!res.ok) {
      setError(res.data.error);
      return;
    }

    const { tripId, roomCode, adminUserId } = res.data;

    if (isGroup && roomCode) {
      // Show room code success screen inline before going to itinerary
      setSuccess({ tripId, roomCode, adminUserId });
    } else {
      // Solo — go straight to itinerary
      onSuccess({ tripId, userId: adminUserId, destination: destination.trim(), roomCode: null });
    }
  }

  function copyCode() {
    if (success?.roomCode) {
      navigator.clipboard.writeText(success.roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  }

  function proceedToItinerary() {
    onSuccess({
      tripId: success.tripId,
      userId: success.adminUserId,
      destination: destination.trim(),
      roomCode: success.roomCode,
    });
  }

  /* ── Header subtitle copy adapts to mode+type ── */
  const headerSub = (() => {
    if (isGroup && !isOuting) return 'A room code will be generated for your crew.';
    if (isGroup && isOuting)  return 'Your group\'s day plan — a room code will be shared.';
    if (isSolo && isOuting)   return 'One perfect day, planned just for you.';
    return 'A personal day-by-day plan, just for you.';
  })();

  /* ══════════════════════════════════════════════
     SUCCESS STATE — Group room code display
     ══════════════════════════════════════════════ */
  if (success) {
    return (
      <div className="td-page" id="trip-details-success">
        <header className="td-header">
          <h1 className="td-display">
            Trip created.<br /><em>Share the code.</em>
          </h1>
          <p className="td-header-sub">
            Your crew can join using the code below.
          </p>
        </header>

        <div className="td-body">
          {/* Map-pin SVG */}
          <div className="td-success-icon" aria-hidden="true">
            <svg width="52" height="64" viewBox="0 0 56 68" fill="none">
              <path d="M28 0C12.536 0 0 12.536 0 28c0 10.386 5.664 19.432 14.04 24.248L28 68l13.96-15.752C50.336 47.432 56 38.386 56 28 56 12.536 43.464 0 28 0Z" fill="#E8602C"/>
              <path d="M18 28.5L24.5 35L38 21" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <h2 className="td-success-title">You're all set!</h2>
          <p className="td-success-sub">
            Trip to <strong>{destination}</strong> is ready.
          </p>

          {/* Room code card */}
          <div className="td-room-card" id="room-code-card">
            <span className="td-room-label">Room Code</span>
            <button
              className="td-room-code"
              onClick={copyCode}
              title="Click to copy room code"
              id="room-code-copy-btn"
            >
              {success.roomCode}
            </button>
            <span className="td-copy-hint">
              {copied ? '✓ Copied to clipboard!' : 'tap to copy'}
            </span>
            <p className="td-room-help">
              Share this code with your travel companions so they can join.
            </p>
          </div>

          <button
            className="td-btn-primary"
            onClick={proceedToItinerary}
            id="view-itinerary-btn"
          >
            View Itinerary →
          </button>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════
     FORM STATE
     ══════════════════════════════════════════════ */
  return (
    <div className="td-page" id="trip-details-form">
      <header className="td-header">
        <button type="button" className="td-back td-back--light" onClick={onBack} id="td-back-btn">
          ← Back
        </button>
        <h1 className="td-display">
          {isOuting ? 'Plan your' : 'Plan your'}<br />
          <em>{isOuting ? 'perfect day.' : 'adventure.'}</em>
        </h1>
        <p className="td-header-sub">{headerSub}</p>
      </header>

      <form className="td-form" onSubmit={handleSubmit} id="trip-details-form-el">
        
        {/* Destination */}
        <label className="td-field" id="td-destination-field">
          <span className="td-label">Destination</span>
          <input
            className="td-input"
            type="text"
            placeholder="e.g. Vaishno Devi, Goa, Paris…"
            required
            value={destination}
            onChange={e => setDestination(e.target.value)}
            id="td-destination"
          />
        </label>

        {/* Days — only shown for Trip (not Outing) */}
        {!isOuting && (
          <div className="td-field" id="td-days-field">
            <div className="td-label-row">
              <label htmlFor="td-days" className="td-label">Number of Days</label>
              <span className="td-field-hint">Max {MAX_DAYS} days</span>
            </div>
            <input
              className={`td-input ${daysError ? 'td-input--error' : ''}`}
              type="number"
              min={MIN_DAYS}
              max={MAX_DAYS}
              placeholder={`e.g. 3 (${MIN_DAYS}–${MAX_DAYS} days)`}
              required
              value={days}
              onChange={handleDaysChange}
              id="td-days"
              aria-invalid={!!daysError}
              aria-describedby={daysError ? 'td-days-error' : undefined}
            />
            {daysError && (
              <span className="td-field-error" id="td-days-error" role="alert">
                ⚠️ {daysError}
              </span>
            )}
          </div>
        )}

        {/* People — only shown for Group (not Solo) */}
        {!isSolo && (
          <label className="td-field" id="td-people-field">
            <span className="td-label">Number of People</span>
            <input
              className="td-input"
              type="number"
              min={1}
              max={50}
              placeholder="e.g. 4"
              required
              value={people}
              onChange={e => {
                const v = e.target.value;
                setPeople(v === '' ? '' : String(Math.max(1, Number(v))));
              }}
              id="td-people"
            />
          </label>
        )}

        {/* Prompt */}
        <label className="td-field" id="td-prompt-field">
          <span className="td-label">
            Custom Notes <small>(optional)</small>
          </span>
          <textarea
            className="td-textarea"
            rows={3}
            placeholder="Any preferences? e.g. 'vegetarian food only', 'wheelchair accessible routes'…"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            id="td-prompt"
          />
        </label>

        {/* Error */}
        {error && (
          <div className="td-error" id="td-error" role="alert">
            <span className="td-error-icon">⚠️</span>
            <div>
              <strong>{error.code}</strong>
              <p>{error.message}</p>
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          className="td-btn-primary"
          disabled={loading || (!isOuting && !!daysError)}
          id="td-submit"
        >
          {loading ? (
            <span className="td-spinner-wrap">
              <span className="td-spinner" />
              Creating…
            </span>
          ) : (
            isGroup ? 'Create & Get Room Code →' : 'Create Trip →'
          )}
        </button>
      </form>
    </div>
  );
}
