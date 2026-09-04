/**
 * Members API — real fetch() calls for trip members (PROJECT_SPEC.md §9.5.1)
 *
 * Backend routes (confirmed from backend/src/routes/trips.ts):
 *   GET    /api/trips/:tripId/members               — list members
 *   DELETE /api/trips/:tripId/members/:userId       — remove member (admin only)
 *
 * Uses the same fetch() + { ok, data } pattern as mockApi.js / itineraryApi.js.
 */

const BASE = '/api/trips';

function wrapNetworkError(err) {
  return {
    ok: false,
    data: {
      error: {
        code: 'NETWORK_ERROR',
        message: err.message ?? 'Network request failed. Could not reach server.',
      },
    },
  };
}

/**
 * GET /api/trips/:tripId/members
 * Lists all members belonging to a trip.
 * Response: { tripId: string, members: [{ userId, userName, isAdmin }] }
 *
 * @param {string} tripId
 * @returns {Promise<{ ok: boolean, data: { tripId: string, members: Array<{ userId: string, userName: string, isAdmin: boolean }> } | { error: { code: string, message: string } } }>}
 */
export async function getMembers(tripId) {
  try {
    const res = await fetch(`${BASE}/${encodeURIComponent(tripId)}/members`);
    const data = await res.json();
    return { ok: res.ok, data };
  } catch (err) {
    return wrapNetworkError(err);
  }
}

/**
 * DELETE /api/trips/:tripId/members/:userId
 * Removes a member from the trip (admin only).
 * Request body: { adminUserId: string }
 * Response: { tripId: string, removedUserId: string }
 *
 * @param {string} tripId
 * @param {string} userId - ID of the member to remove
 * @param {string} adminUserId - ID of the admin requesting the removal
 * @returns {Promise<{ ok: boolean, data: { tripId: string, removedUserId: string } | { error: { code: string, message: string } } }>}
 */
export async function removeMember(tripId, userId, adminUserId) {
  try {
    const res = await fetch(
      `${BASE}/${encodeURIComponent(tripId)}/members/${encodeURIComponent(userId)}`,
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminUserId }),
      }
    );
    const data = await res.json();
    return { ok: res.ok, data };
  } catch (err) {
    return wrapNetworkError(err);
  }
}
