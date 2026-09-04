import { useCallback, useEffect, useRef, useState } from 'react';
import { generateItinerary } from '../api/itineraryApi';
import { updateLocation } from '../api/locationApi';
import { getMembers, removeMember } from '../api/membersApi';
import './ItineraryView.css';

/* ── Type badge metadata ── */
const TYPE_META = {
  checkpoint:    { label: 'Checkpoint', icon: '📍' },
  restaurant:    { label: 'Restaurant', icon: '🍽' },
  activity:      { label: 'Activity',   icon: '🎯' },
  accommodation: { label: 'Stay',       icon: '🏨' },
  transport:     { label: 'Transport',  icon: '🚌' },
};

/* ── Location tracking interval (ms) ── */
const TRACK_INTERVAL_MS = 10_000;

/* ── Generate a stable per-session userId ── */
function getSessionUserId() {
  const key = 'traverse_session_uid';
  let uid = sessionStorage.getItem(key);
  if (!uid) {
    uid = 'u_' + Math.random().toString(36).slice(2, 10);
    sessionStorage.setItem(key, uid);
  }
  return uid;
}

/* ── Single itinerary item card ── */
function ItemCard({ item, justReached }) {
  const meta = TYPE_META[item.type] ?? { label: item.type, icon: '📌' };
  return (
    <div
      className={[
        'iv-item',
        item.completed  ? 'iv-item--done'    : '',
        justReached     ? 'iv-item--reached' : '',
      ].filter(Boolean).join(' ')}
    >
      <span className="iv-item-icon">{meta.icon}</span>
      <div className="iv-item-body">
        <span className="iv-item-name">{item.name}</span>
        <span className="iv-item-type">{meta.label}</span>
      </div>
      {item.completed && (
        <span className="iv-item-check" aria-label="Completed">✓</span>
      )}
    </div>
  );
}

/* ── Location status pill ── */
function LocationBadge({ status, error, isSyncing, lastUpdated }) {
  const cfg = {
    idle:     { cls: 'iv-loc--idle',    icon: '📍', text: 'Live tracking idle' },
    asking:   { cls: 'iv-loc--asking',  icon: '⏳', text: 'Requesting GPS…' },
    tracking: { cls: 'iv-loc--on',      icon: '🟢', text: isSyncing ? 'Syncing location…' : 'Tracking live' },
    denied:   { cls: 'iv-loc--denied',  icon: '🚫', text: 'Location denied' },
    unavail:  { cls: 'iv-loc--denied',  icon: '⚠️', text: 'GPS unavailable' },
    error:    { cls: 'iv-loc--denied',  icon: '⚠️', text: error || 'Location error' },
  };
  const { cls, icon, text } = cfg[status] ?? cfg.error;
  return (
    <span className={`iv-loc-badge ${cls}`}>
      {icon} {text} {status === 'tracking' && lastUpdated && !isSyncing && `(Updated ${lastUpdated})`}
    </span>
  );
}

/* ══════════════════════════════════════════════════════
   Main component
   ══════════════════════════════════════════════════════ */
export default function ItineraryView({ tripId, destination, roomCode, userId: propUserId, mode, onBack }) {
  const isGroup = mode === 'group' || Boolean(roomCode);

  /* ── User identification ── */
  const storedAdminId = typeof window !== 'undefined' ? sessionStorage.getItem(`traverse_admin_${tripId}`) : null;
  const storedCurrentUserId = typeof window !== 'undefined' ? sessionStorage.getItem('traverse_current_userId') : null;
  const currentUserId = propUserId || storedCurrentUserId || storedAdminId || getSessionUserId();
  const userId = useRef(currentUserId).current;

  /* ── Itinerary state ── */
  const [itinerary, setItinerary] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [activeDay, setActiveDay] = useState(0);

  /* ── Persistent room code copy state ── */
  const [copiedCode, setCopiedCode] = useState(false);

  const copyRoomCode = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  /* ── Group Members state (PROJECT_SPEC.md §9.5.1) ── */
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [removingUserId, setRemovingUserId] = useState(null);

  const loadMembers = useCallback(async () => {
    if (!isGroup) return;
    setMembersLoading(true);
    setMembersError(null);
    const res = await getMembers(tripId);
    setMembersLoading(false);

    if (!res.ok) {
      setMembersError(res.data?.error || { code: 'LOAD_FAILED', message: 'Failed to load trip members.' });
    } else {
      setMembers(res.data.members || []);
    }
  }, [tripId, isGroup]);

  useEffect(() => {
    if (isGroup) {
      loadMembers();
    }
  }, [isGroup, loadMembers]);

  // Check if current user is admin
  const isCurrentUserAdmin =
    (storedAdminId && (storedAdminId === userId || storedAdminId === propUserId)) ||
    members.some((m) => (m.userId === userId || m.userId === propUserId || m.userId === storedAdminId) && m.isAdmin);

  async function handleRemoveMember(targetUserId) {
    setActionError(null);
    setRemovingUserId(targetUserId);

    const adminMember = members.find((m) => m.isAdmin);
    const adminIdToSend = adminMember ? adminMember.userId : (storedAdminId || userId);

    const res = await removeMember(tripId, targetUserId, adminIdToSend);
    setRemovingUserId(null);

    if (!res.ok) {
      setActionError(res.data?.error || { code: 'REMOVE_FAILED', message: 'Failed to remove member.' });
    } else {
      // Immediate refresh as required by Requirement 5
      await loadMembers();
    }
  }

  /* ── Location tracking state ── */
  // 'idle' | 'asking' | 'tracking' | 'denied' | 'unavail' | 'error'
  const [locStatus, setLocStatus]   = useState('idle');
  const [locError, setLocError]     = useState(null);
  const [isSyncing, setIsSyncing]   = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [lastCoords, setLastCoords]   = useState(null);
  const [recentlyReached, setRecentlyReached] = useState(new Set()); // itemIds flashed green

  const intervalRef  = useRef(null);

  /* ─────────────────────────────────
     Load itinerary on mount
     ───────────────────────────────── */
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      const res = await generateItinerary(tripId);
      if (cancelled) return;
      setLoading(false);
      if (!res.ok) {
        setError(res.data.error);
      } else {
        setItinerary(res.data);
        setActiveDay(0);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [tripId]);

  /* ─────────────────────────────────
     Send one GPS ping to backend
     ───────────────────────────────── */
  const sendLocationUpdate = useCallback(async (lat, lng) => {
    setIsSyncing(true);
    const res = await updateLocation({ tripId, userId, lat, lng });
    setIsSyncing(false);

    if (!res.ok) {
      console.warn('[location] update failed:', res.data?.error);
      setLocStatus('error');
      setLocError(res.data?.error?.message || 'Server error updating location');
      return;
    }

    setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    setLastCoords({ lat, lng });
    setLocStatus('tracking');
    setLocError(null);

    const { reached } = res.data;
    if (!reached || reached.length === 0) return;

    // Mark reached items as completed in local state (no full refetch)
    setItinerary(prev => {
      if (!prev) return prev;
      const reachedSet = new Set(reached);
      return {
        ...prev,
        days: prev.days.map(day => ({
          ...day,
          items: day.items.map(item =>
            reachedSet.has(item.itemId)
              ? { ...item, completed: true }
              : item
          ),
        })),
      };
    });

    // Flash the reached items with a brief highlight
    setRecentlyReached(new Set(reached));
    setTimeout(() => setRecentlyReached(new Set()), 3000);
  }, [tripId, userId]);

  /* ─────────────────────────────────
     Start watching GPS
     ───────────────────────────────── */
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setLocStatus('unavail');
      return;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setLocStatus('asking');
    setLocError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setLocStatus('tracking');

        // Send immediately, then every TRACK_INTERVAL_MS
        sendLocationUpdate(lat, lng);

        intervalRef.current = setInterval(() => {
          navigator.geolocation.getCurrentPosition(
            (p) => sendLocationUpdate(p.coords.latitude, p.coords.longitude),
            (e) => {
              console.warn('[location] interval error:', e.message);
              setLocError(e.message);
            },
            { enableHighAccuracy: true, timeout: 8000 }
          );
        }, TRACK_INTERVAL_MS);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setLocStatus('denied');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setLocStatus('unavail');
        } else {
          setLocStatus('error');
          setLocError(err.message);
        }
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }, [sendLocationUpdate]);

  /* ─────────────────────────────────
     Clean up interval on unmount
     ───────────────────────────────── */
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  /* ══════════════
     Loading state
     ══════════════ */
  if (loading) {
    return (
      <div className="iv-page" id="itinerary-loading">
        <header className="iv-header">
          <div className="iv-header-top">
            <button type="button" className="iv-back iv-back--light" onClick={onBack}>← Back</button>
            {roomCode && (
              <div className="iv-room-chip" id="itinerary-loading-room-chip">
                <span className="iv-room-chip-label">Room</span>
                <span className="iv-room-chip-code">{roomCode}</span>
                <button
                  type="button"
                  className="iv-room-chip-copy"
                  onClick={copyRoomCode}
                  title="Copy room code"
                  id="copy-room-code-loading-chip"
                >
                  {copiedCode ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            )}
          </div>
          <h1 className="iv-display">
            Building your<br /><em>itinerary…</em>
          </h1>
          <p className="iv-header-sub">Gemini is crafting your day-by-day plan.</p>
        </header>
        <div className="iv-body">
          <div className="iv-skeleton-tabs">
            {[1, 2, 3].map(i => <div key={i} className="iv-skel iv-skel--tab" />)}
          </div>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="iv-skel iv-skel--item" style={{ animationDelay: `${i * 0.08}s` }} />
          ))}
        </div>
      </div>
    );
  }

  /* ══════════════
     Error state
     ══════════════ */
  if (error) {
    return (
      <div className="iv-page" id="itinerary-error">
        <header className="iv-header">
          <div className="iv-header-top">
            <button type="button" className="iv-back iv-back--light" onClick={onBack}>← Back</button>
            {roomCode && (
              <div className="iv-room-chip" id="itinerary-error-room-chip">
                <span className="iv-room-chip-label">Room</span>
                <span className="iv-room-chip-code">{roomCode}</span>
                <button
                  type="button"
                  className="iv-room-chip-copy"
                  onClick={copyRoomCode}
                  title="Copy room code"
                >
                  {copiedCode ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            )}
          </div>
          <h1 className="iv-display">Something<br /><em>went wrong.</em></h1>
        </header>
        <div className="iv-body">
          <div className="iv-error" role="alert">
            <span className="iv-error-icon">⚠️</span>
            <div>
              <strong>{error.code}</strong>
              <p>{error.message}</p>
            </div>
          </div>
          <button className="iv-btn-primary" onClick={onBack}>← Back to home</button>
        </div>
      </div>
    );
  }

  /* ══════════════
     Itinerary + tracking view
     ══════════════ */
  const { days } = itinerary;
  const currentDay = days[activeDay];
  const totalStops = days.reduce((n, d) => n + d.items.length, 0);
  const completedStops = days.reduce(
    (n, d) => n + d.items.filter(i => i.completed).length, 0
  );

  return (
    <div className="iv-page" id="itinerary-view">
      {/* Dark header */}
      <header className="iv-header">
        <div className="iv-header-top">
          <button type="button" className="iv-back iv-back--light" onClick={onBack}>← Back</button>
          {roomCode && (
            <div className="iv-room-chip" id="itinerary-room-chip">
              <span className="iv-room-chip-label">Room</span>
              <span className="iv-room-chip-code">{roomCode}</span>
              <button
                type="button"
                className="iv-room-chip-copy"
                onClick={copyRoomCode}
                title="Copy room code"
                id="copy-room-code-chip"
              >
                {copiedCode ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          )}
        </div>
        <h1 className="iv-display">
          {destination}<br />
          <em>{days.length}-day itinerary.</em>
        </h1>
        <p className="iv-header-sub">
          {days.length} day{days.length !== 1 ? 's' : ''} · {totalStops} stops · {completedStops} reached
        </p>
      </header>

      {/* Body */}
      <div className="iv-body">

        {/* ── Location tracking bar ── */}
        <div className="iv-tracking-bar" id="itinerary-tracking-bar">
          <LocationBadge
            status={locStatus}
            error={locError}
            isSyncing={isSyncing}
            lastUpdated={lastUpdated}
          />

          {(locStatus === 'idle' || locStatus === 'error' || locStatus === 'denied' || locStatus === 'unavail') && (
            <button
              className="iv-track-btn"
              onClick={startTracking}
              id="start-tracking-btn"
            >
              {locStatus === 'idle' ? 'Enable tracking →' : 'Retry tracking'}
            </button>
          )}

          {locStatus === 'idle' && (
            <p className="iv-track-hint">
              Enable GPS to automatically detect arrivals and mark places visited in real time.
            </p>
          )}

          {locStatus === 'asking' && (
            <p className="iv-track-hint">
              Please allow location permission in your browser prompt.
            </p>
          )}

          {locStatus === 'denied' && (
            <p className="iv-track-hint">
              Location permission was denied. Allow location in browser settings to track automatically.
            </p>
          )}

          {locStatus === 'unavail' && (
            <p className="iv-track-hint">
              GPS or position service is unavailable on this device.
            </p>
          )}

          {locStatus === 'error' && (
            <p className="iv-track-hint">
              {locError || 'Failed to sync location with server. Will retry automatically.'}
            </p>
          )}

          {locStatus === 'tracking' && (
            <p className="iv-track-hint">
              {lastCoords
                ? `GPS: ${lastCoords.lat.toFixed(4)}, ${lastCoords.lng.toFixed(4)} · Automatic arrival detection active`
                : 'Automatic arrival detection active'}
            </p>
          )}
        </div>

        {/* Progress bar */}
        {completedStops > 0 && (
          <div className="iv-progress" aria-label={`${completedStops} of ${totalStops} stops reached`}>
            <div
              className="iv-progress-fill"
              style={{ width: `${(completedStops / totalStops) * 100}%` }}
            />
          </div>
        )}

        {/* Day tabs */}
        <div className="iv-tabs" role="tablist" aria-label="Days">
          {days.map((d, idx) => (
            <button
              key={d.day}
              role="tab"
              aria-selected={idx === activeDay}
              className={`iv-tab ${idx === activeDay ? 'iv-tab--active' : ''}`}
              onClick={() => setActiveDay(idx)}
            >
              Day {d.day}
            </button>
          ))}
        </div>

        {/* Item list */}
        <div className="iv-items" id={`itinerary-day-${currentDay.day}`}>
          {currentDay.items.map((item, i) => (
            <div
              key={item.itemId}
              className="iv-item-wrap"
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <ItemCard
                item={item}
                justReached={recentlyReached.has(item.itemId)}
              />
            </div>
          ))}
        </div>

        {/* ── Group Members Section (spec §9.5.1) ── */}
        {isGroup && (
          <section className="iv-members-card" id="group-members-section" aria-label="Group Members">
            <div className="iv-members-header">
              <div className="iv-members-title-wrap">
                <span className="iv-members-icon" aria-hidden="true">👥</span>
                <h3 className="iv-members-title">Group Members</h3>
                <span className="iv-members-count">{members.length}</span>
              </div>
              {isCurrentUserAdmin && (
                <span className="iv-admin-indicator-chip" title="You are the trip admin">
                  Trip Admin
                </span>
              )}
            </div>

            {membersError && (
              <div className="iv-members-alert iv-members-alert--error" role="alert">
                <span className="iv-members-alert-icon">⚠️</span>
                <div>
                  <strong>{membersError.code}</strong>
                  <p>{membersError.message}</p>
                </div>
              </div>
            )}

            {actionError && (
              <div className="iv-members-alert iv-members-alert--error" role="alert">
                <span className="iv-members-alert-icon">⚠️</span>
                <div className="iv-members-alert-body">
                  <strong>{actionError.code}</strong>
                  <p>{actionError.message}</p>
                </div>
                <button
                  type="button"
                  className="iv-members-alert-dismiss"
                  onClick={() => setActionError(null)}
                  title="Dismiss error"
                >
                  ✕
                </button>
              </div>
            )}

            {membersLoading && members.length === 0 ? (
              <div className="iv-members-loading">
                <div className="iv-skel iv-skel--member" />
                <div className="iv-skel iv-skel--member" />
              </div>
            ) : members.length === 0 ? (
              <p className="iv-members-empty">No members found.</p>
            ) : (
              <div className="iv-members-list">
                {members.map((member) => {
                  const isThisMemberAdmin = Boolean(member.isAdmin);
                  const isSelf = member.userId === userId || member.userId === propUserId;
                  const canRemove = isCurrentUserAdmin && !isThisMemberAdmin;

                  return (
                    <div
                      key={member.userId}
                      className={`iv-member-row ${isThisMemberAdmin ? 'iv-member-row--admin' : ''}`}
                      id={`member-${member.userId}`}
                    >
                      <div className="iv-member-profile">
                        <div className={`iv-member-avatar ${isThisMemberAdmin ? 'iv-member-avatar--admin' : ''}`}>
                          {member.userName ? member.userName.charAt(0).toUpperCase() : '👤'}
                        </div>
                        <div className="iv-member-meta">
                          <div className="iv-member-name-row">
                            <span className="iv-member-name">{member.userName}</span>
                            {isThisMemberAdmin && (
                              <span className="iv-member-admin-tag">Admin</span>
                            )}
                            {isSelf && (
                              <span className="iv-member-you-tag">You</span>
                            )}
                          </div>
                          <span className="iv-member-id">ID: {member.userId}</span>
                        </div>
                      </div>

                      <div className="iv-member-actions">
                        {canRemove && (
                          <button
                            type="button"
                            className="iv-member-remove-btn"
                            onClick={() => handleRemoveMember(member.userId)}
                            disabled={removingUserId === member.userId}
                            id={`remove-member-${member.userId}`}
                            title={`Remove ${member.userName} from trip`}
                          >
                            {removingUserId === member.userId ? 'Removing…' : 'Remove'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Back button */}
        <button className="iv-btn-secondary" onClick={onBack}>
          ← Back to home
        </button>
      </div>
    </div>
  );
}
