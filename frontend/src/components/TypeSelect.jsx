import './SelectPage.css';

/**
 * Page 3 — Trip or Outing selection
 * Receives mode so it can tailor the subtitle.
 */
export default function TypeSelect({ mode, onBack, onChoose }) {
  return (
    <div className="sp-page" id="type-select">
      <header className="sp-header">
        <button type="button" className="sp-back sp-back--light" onClick={onBack}>
          ← Back
        </button>
        <h1 className="sp-display">
          What kind of<br /><em>adventure?</em>
        </h1>
        <p className="sp-header-sub">
          {mode === 'solo' ? 'Your solo plan will be tailored accordingly.' : 'Your group plan will be tailored accordingly.'}
        </p>
      </header>

      <div className="sp-body">
        <div className="sp-choices">
          <button
            className="sp-choice"
            onClick={() => onChoose('trip')}
            id="choose-trip"
          >
            <span className="sp-choice-icon">🧳</span>
            <div className="sp-choice-text">
              <strong>Trip</strong>
              <span>Multi-day journey with a day-by-day itinerary.</span>
            </div>
            <span className="sp-choice-arrow">→</span>
          </button>

          <button
            className="sp-choice"
            onClick={() => onChoose('outing')}
            id="choose-outing"
          >
            <span className="sp-choice-icon">☀️</span>
            <div className="sp-choice-text">
              <strong>Outing</strong>
              <span>Single day — one perfect day planned for you.</span>
            </div>
            <span className="sp-choice-arrow">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
