/**
 * Location API — real fetch() calls to /api/location
 * Same { ok, data } wrapper as mockApi.js / itineraryApi.js
 *
 * Backend contract (confirmed from backend/src/routes/location.ts):
 *
 *   POST /api/location/update
 *   Body:    { tripId: string, userId: string, lat: number, lng: number, timestamp: string }
 *   Returns: { reached: string[], updatedItinerary: boolean }
 *   Errors:  { error: { code, message } }  — per spec §9.6
 *
 *   GET /api/location/:tripId
 *   Returns: { tripId: string, locations: [{ userId, lat, lng, timestamp }] }
 */

const BASE = '/api/location';

function wrapNetworkError(err) {
  return {
    ok: false,
    data: { error: { code: 'NETWORK_ERROR', message: err.message ?? 'Network request failed.' } },
  };
}

/**
 * POST /api/location/update
 * Sends the user's current GPS coordinates to the backend.
 * The backend checks proximity (150m threshold) and marks items as completed.
 *
 * @param {{ tripId: string, userId: string, lat: number, lng: number }} params
 * @returns {{ ok: boolean, data: { reached: string[], updatedItinerary: boolean } | { error } }}
 */
export async function updateLocation({ tripId, userId, lat, lng }) {
  try {
    const res = await fetch(`${BASE}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tripId,
        userId,
        lat,
        lng,
        timestamp: new Date().toISOString(),
      }),
    });
    const data = await res.json();
    return { ok: res.ok, data };
  } catch (err) {
    return wrapNetworkError(err);
  }
}


