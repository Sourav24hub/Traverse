import { useState } from 'react';
import { createTrip } from '../api/mockApi';
import './CreateTrip.css';

const INITIAL = {
  type: 'trip',
  mode: 'group',
  destination: '',
  days: '',
  people: '',
  prompt: '',
};

export default function CreateTrip({ onBack, onSuccess }) {
  const [form, setForm] = useState(INITIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const set = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  const setNum = (key) => (e) => {
    const raw = e.target.value;
    setForm((prev) => ({ ...prev, [key]: raw === '' ? '' : Math.max(1, Number(raw)) }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await createTrip({
      ...form,
      days: Number(form.days),
      people: Number(form.people),
    });

    setLoading(false);

    if (!res.ok) {
      setError(res.data.error);
    } else {
      onSuccess?.({ tripId: res.data.tripId, destination: form.destination });
    }
  }


  /* ---------- Form state ---------- */

  return (
    <div className="ct-page" id="create-trip-form-page">
      {/* ── Dark header band — the hero moment ── */}
      <header className="ct-header">
        <button type="button" className="ct-back ct-back--light" onClick={onBack} id="create-trip-back-btn">
          ← Back
        </button>
        <h1 className="ct-display">
          Plan your next<br /><em>adventure.</em>
        </h1>
        <p className="ct-header-sub">Your crew can join once you're done.</p>
      </header>

      {/* ── Form card ── */}
      <form className="ct-form" onSubmit={handleSubmit}>

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
              max={14}
              placeholder="e.g. 3 (max 14)"
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
              placeholder="e.g. 5"
              value={form.people}
              onChange={setNum('people')}
              id="create-trip-people"
            />
          </label>
        </div>

        {/* Prompt */}
        <label className="ct-field" id="create-trip-prompt-field">
          <span className="ct-label">Custom Notes <small>(optional)</small></span>
          <textarea
            className="ct-textarea"
            rows={3}
            placeholder="Any preferences? e.g. 'vegetarian food only', 'wheelchair accessible routes'…"
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
          className="ct-btn-primary"
          disabled={loading}
          id="create-trip-submit"
        >
          {loading ? (
            <span className="ct-spinner-wrap">
              <span className="ct-spinner" />
              Creating…
            </span>
          ) : (
            'Create Trip →'
          )}
        </button>
      </form>
    </div>
  );
}
