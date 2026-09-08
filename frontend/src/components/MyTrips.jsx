import { useState, useEffect } from 'react';
import { getUserTrips, deleteTrip } from '../api/tripApi';
import { useAuth } from '../context/AuthContext';
import './MyTrips.css';

export default function MyTrips({ onTripSelect }) {
  const { user } = useAuth();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadTrips() {
      if (!user) return;
      // Use user.id (Supabase UUID) — the canonical userId throughout the app
      const res = await getUserTrips(user.id);
      if (res.ok) {
        setTrips(res.data.trips);
      } else {
        setError(res.data?.error?.message || 'Failed to load trips');
      }
      setLoading(false);
    }
    loadTrips();
  }, [user]);

  const handleDelete = async (e, tripId) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this trip completely? This cannot be undone.")) return;

    const res = await deleteTrip(tripId, user.id);
    if (res.ok) {
      setTrips(trips.filter(t => t.tripId !== tripId));
    } else {
      alert(res.data?.error?.message || 'Failed to delete trip');
    }
  };

  if (loading) return <div className="mt-loading">Loading your trips...</div>;
  if (error) return <div className="mt-error">{error}</div>;
  if (trips.length === 0) return null; // Only show if they have trips

  return (
    <section className="my-trips-section">
      <h2 className="mt-title">My Trips</h2>
      <div className="mt-grid">
        {trips.map(trip => (
          <div
            key={trip.tripId}
            className="mt-card"
            onClick={() => onTripSelect({
              tripId: trip.tripId,
              destination: trip.destination,
              roomCode: trip.roomCode,
              userId: user.id,
            })}
          >
            <div className="mt-card-header">
              <span className="mt-dest">{trip.destination}</span>
              {trip.isAdmin && (
                <button
                  className="mt-delete-btn"
                  onClick={(e) => handleDelete(e, trip.tripId)}
                  title="Delete trip"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="mt-card-badges">
              <span className={`mt-badge ${trip.isAdmin ? 'mt-badge-admin' : 'mt-badge-joiner'}`}>
                {trip.isAdmin ? 'Admin' : 'Joiner'}
              </span>
              <span className="mt-badge">{trip.mode === 'group' ? 'Group' : 'Solo'}</span>
              <span className="mt-badge">{trip.days} {trip.days === 1 ? 'day' : 'days'}</span>
            </div>
            {trip.roomCode && (
              <div className="mt-room-code">Code: {trip.roomCode}</div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
