/**
 * Itinerary API — real fetch() calls to /api/itinerary
 * Mirrors the pattern in mockApi.js, same { ok, data } wrapper.
 *
 * Backend contract (confirmed from backend/src/routes/itinerary.ts):
 *   POST /api/itinerary/generate   body: { tripId }
 *   GET  /api/itinerary/:tripId
 *
 * Both return: { tripId, days: [{ day, items: [{ itemId, name, lat, lng, type, completed }] }] }
 * Errors:      { error: { code, message } }  — per spec §9.6
 */

const BASE = '/api/itinerary';

function wrapNetworkError(err) {
  return {
    ok: false,
    data: { error: { code: 'NETWORK_ERROR', message: err.message ?? 'Network request failed.' } },
  };
}

/**
 * POST /api/itinerary/generate
 * Triggers AI generation and stores the result on the trip.
 * @param {string} tripId
 */
export async function generateItinerary(tripId) {
  try {
    const res = await fetch(`${BASE}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripId }),
    });
    const data = await res.json();
    return { ok: res.ok, data };
  } catch (err) {
    return wrapNetworkError(err);
  }
}

/**
 * GET /api/itinerary/:tripId
 * Fetches a previously generated itinerary.
 * @param {string} tripId
 */
export async function getItinerary(tripId) {
  try {
    const res = await fetch(`${BASE}/${encodeURIComponent(tripId)}`);
    const data = await res.json();
    return { ok: res.ok, data };
  } catch (err) {
    return wrapNetworkError(err);
  }
}
