import { useEffect, useRef, useState } from 'react';
import './WelcomePage.css';

/* ── Feature waypoints data ── */
const WAYPOINTS = [
  {
    icon: '🧠',
    title: 'AI Route Planning',
    desc: 'Gemini crafts a personalized, day-by-day itinerary from a single sentence — destinations, restaurants, activities, stays.',
  },
  {
    icon: '📍',
    title: 'Live Location Tracking',
    desc: 'Share your real-time GPS position with your group. Automatic arrival detection marks checkpoints as you reach them.',
  },
  {
    icon: '🔄',
    title: 'Dynamic Replanning',
    desc: '"It\'s raining" — type what changed and the AI rewrites the rest of your trip on the fly, keeping what you\'ve already done.',
  },
  {
    icon: '🗺️',
    title: 'Journey Map',
    desc: 'Your entire trip visualized as a living route — see where everyone is, what\'s been completed, and what\'s ahead.',
  },
  {
    icon: '👥',
    title: 'Group Rooms',
    desc: 'Create a trip, share a 6-character code. Friends join instantly. One shared itinerary, everyone on the same map.',
  },
];

/* ── Pin positions along the route (approximate, relative to SVG viewBox) ── */
const PIN_POSITIONS = [
  { x: 120, y: 320 },
  { x: 700, y: 580 },
  { x: 200, y: 870 },
  { x: 650, y: 1140 },
  { x: 350, y: 1420 },
];

/* ══════════════════════════════════════════════════════
   Living Map SVG Background
   ══════════════════════════════════════════════════════ */
function LivingMap({ scrollProgress }) {
  /* The main route line path — meanders through the full page */
  const routePath =
    'M 80,180 C 200,200 300,280 400,300 S 600,350 700,320 ' +
    'S 500,500 350,550 C 200,600 100,650 150,720 ' +
    'S 400,800 600,780 C 750,760 800,850 700,920 ' +
    'S 400,1000 250,1050 C 100,1100 150,1180 350,1200 ' +
    'S 600,1250 650,1350 C 700,1450 400,1500 300,1550 ' +
    'S 200,1650 350,1700 C 500,1750 700,1700 750,1800';

  /* Total path length (approximate) — used for dash animation */
  const pathLength = 4200;
  const dashOffset = pathLength - (pathLength * scrollProgress);

  return (
    <svg
      className="wl-map-svg"
      viewBox="0 0 900 1900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* ── Topo contour lines — subtle background texture ── */}
      <path
        d="M-20 120 C100 100, 250 150, 400 130 S600 80, 750 110 S900 140, 950 125"
        className="wl-topo-line"
        stroke="rgba(255,255,255,0.03)"
        strokeWidth="1"
      />
      <path
        d="M-20 300 C80 275, 200 310, 350 290 S550 250, 700 280 S880 310, 950 295"
        className="wl-topo-line"
        stroke="rgba(255,255,255,0.025)"
        strokeWidth="0.8"
      />
      <path
        d="M-20 500 C120 480, 280 520, 420 500 S620 460, 760 490 S910 520, 960 505"
        className="wl-topo-line"
        stroke="rgba(255,255,255,0.035)"
        strokeWidth="1.1"
      />
      <path
        d="M-20 700 C90 680, 230 720, 380 700 S580 660, 720 690 S890 720, 950 705"
        className="wl-topo-line"
        stroke="rgba(255,255,255,0.02)"
        strokeWidth="0.8"
      />
      <path
        d="M-20 950 C110 930, 260 970, 410 950 S610 910, 750 940 S900 970, 960 955"
        className="wl-topo-line"
        stroke="rgba(255,255,255,0.03)"
        strokeWidth="1"
      />
      <path
        d="M-20 1200 C80 1180, 240 1220, 390 1200 S590 1160, 730 1190 S890 1220, 950 1205"
        className="wl-topo-line"
        stroke="rgba(255,255,255,0.025)"
        strokeWidth="0.9"
      />
      <path
        d="M-20 1500 C100 1480, 250 1520, 400 1500 S600 1460, 740 1490 S900 1520, 960 1505"
        className="wl-topo-line"
        stroke="rgba(255,255,255,0.03)"
        strokeWidth="1"
      />

      {/* ── Main route line — draws itself on scroll ── */}
      <path
        d={routePath}
        className="wl-route-line"
        strokeDasharray={pathLength}
        strokeDashoffset={dashOffset}
        style={{ transition: 'stroke-dashoffset 0.1s linear' }}
      />

      {/* ── Light "ghost" of the full route path ── */}
      <path
        d={routePath}
        fill="none"
        stroke="rgba(232,96,44,0.06)"
        strokeWidth="1.5"
        strokeDasharray="3 8"
      />

      {/* ── Location pin markers ── */}
      {PIN_POSITIONS.map((pin, i) => (
        <g key={i}>
          <circle
            className="wl-pin-glow"
            cx={pin.x}
            cy={pin.y}
            r="20"
            style={{ animationDelay: `${i * 0.5}s` }}
          />
          <circle
            className="wl-pin-outer"
            cx={pin.x}
            cy={pin.y}
            r="10"
            style={{ animationDelay: `${i * 0.5}s` }}
          />
          <circle
            className="wl-pin-inner"
            cx={pin.x}
            cy={pin.y}
            r="4"
          />
        </g>
      ))}
    </svg>
  );
}

/* ══════════════════════════════════════════════════════
   WelcomePage Component
   ══════════════════════════════════════════════════════ */
export default function WelcomePage({ onLoginClick }) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const pageRef = useRef(null);

  /* ── Track scroll to animate the route line ── */
  useEffect(() => {
    function handleScroll() {
      if (!pageRef.current) return;
      const el = pageRef.current;
      const scrollTop = window.scrollY;
      const scrollHeight = el.scrollHeight - window.innerHeight;
      const progress = scrollHeight > 0 ? Math.min(scrollTop / scrollHeight, 1) : 0;
      setScrollProgress(progress);
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // initial
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  /* ── Smooth scroll to section ── */
  function scrollToSection(id) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  return (
    <div className="wl-page" ref={pageRef}>
      {/* ── Living Map Background ── */}
      <LivingMap scrollProgress={scrollProgress} />

      {/* ══ Sticky Navigation ══ */}
      <nav className="wl-nav">
        <span className="wl-nav-brand">traverse</span>
        <div className="wl-nav-links">
          <button
            className="wl-nav-link"
            onClick={() => scrollToSection('wl-hero')}
          >
            Home
          </button>
          <button
            className="wl-nav-link"
            onClick={() => scrollToSection('wl-features')}
          >
            Know More
          </button>
          <button
            className="wl-nav-link"
            onClick={() => scrollToSection('wl-contact')}
          >
            Contact Us
          </button>
          <button
            className="wl-nav-link wl-nav-link--login"
            onClick={onLoginClick}
          >
            Login
          </button>
        </div>
      </nav>

      {/* ══ HERO ══ */}
      <section className="wl-hero" id="wl-hero">
        <div className="wl-hero-content">
          <h1 className="wl-hero-title">
            Your journey,<br />
            <em>mapped in real time.</em>
          </h1>
          <p className="wl-hero-tagline">
            AI-powered trip planning meets live location tracking.
            Plan solo or with a group — Traverse builds the itinerary,
            tracks the journey, and adapts when plans change.
          </p>
          <button className="wl-hero-cta" onClick={onLoginClick}>
            Get Started <span>→</span>
          </button>
        </div>

        <div className="wl-scroll-hint">
          <span>Scroll to explore</span>
          <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
            <path d="M1 1l7 7 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </section>

      {/* ══ KNOW MORE — Feature Waypoints ══ */}
      <section className="wl-features" id="wl-features">
        <p className="wl-section-label">Know More</p>
        <h2 className="wl-section-title">
          Five waypoints.<br />
          <em>One seamless journey.</em>
        </h2>

        <div className="wl-waypoints">
          {WAYPOINTS.map((wp, i) => (
            <div className="wl-waypoint" key={i}>
              <span className="wl-waypoint-num">0{i + 1}</span>
              <span className="wl-waypoint-icon">{wp.icon}</span>
              <h3 className="wl-waypoint-title">{wp.title}</h3>
              <p className="wl-waypoint-desc">{wp.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══ CONTACT US ══ */}
      <section className="wl-contact" id="wl-contact">
        <div className="wl-contact-content">
          <p className="wl-section-label">Contact Us</p>
          <h2 className="wl-section-title">
            Let's connect.
          </h2>
          <p className="wl-contact-text">
            Have questions, feedback, or want to collaborate?
            We'd love to hear from you.
          </p>
          <div className="wl-contact-placeholder">
            [Contact info here — email, social handles, or a contact form will go here.]
          </div>
        </div>
      </section>

      {/* ══ Footer ══ */}
      <footer className="wl-footer">
        <span className="wl-footer-brand">traverse</span>
        <span className="wl-footer-copy">© 2026 Traverse. Plan boldly.</span>
      </footer>
    </div>
  );
}
