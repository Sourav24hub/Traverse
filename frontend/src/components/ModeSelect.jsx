import './SelectPage.css';

/**
 * Page 2 — Solo or Group selection
 * A single full-page choice. No form fields, just two cards.
 */
export default function ModeSelect({ onBack, onChoose }) {
  return (
    <div className="sp-page" id="mode-select">
      <header className="sp-header">
        <button type="button" className="sp-back sp-back--light" onClick={onBack}>
          ← Back
        </button>
        <h1 className="sp-display">
          Who's<br /><em>travelling?</em>
        </h1>
        <p className="sp-header-sub">This shapes your entire experience.</p>
      </header>

      <div className="sp-body">
        <div className="sp-choices">
          <button
            className="sp-choice"
            onClick={() => onChoose('solo')}
            id="choose-solo"
          >
            <span className="sp-choice-icon">🧍</span>
            <div className="sp-choice-text">
              <strong>Solo</strong>
              <span>Just me — personal itinerary, individual tracking.</span>
            </div>
            <span className="sp-choice-arrow">→</span>
          </button>

          <button
            className="sp-choice"
            onClick={() => onChoose('group')}
            id="choose-group"
          >
            <span className="sp-choice-icon">👥</span>
            <div className="sp-choice-text">
              <strong>Group</strong>
              <span>Shared room code, live tracking for everyone.</span>
            </div>
            <span className="sp-choice-arrow">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
