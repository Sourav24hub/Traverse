/**
 * ============================================================
 *  API client — real fetch() calls to the Traverse backend.
 *
 *  In dev, Vite proxies /api/* → http://localhost:3001
 *  (configured in vite.config.js).
 *
 *  The request/response shapes match PROJECT_SPEC.md §9.1,
 *  verified against backend/src/routes/trips.ts.
 * ============================================================
 */

const API_BASE = '/api';

function getHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const session = sessionStorage.getItem('traverse_auth_session');
  if (session) {
    try {
      const { accessToken } = JSON.parse(session);
      if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
    } catch (e) {}
  }
  return headers;
}

/**
 * POST /api/trips — create a new trip
 *
 * Request : { type, mode, destination, days, people, prompt }
 * Response: { tripId, roomCode? }
 *   - roomCode is present only when mode === "group"
 *   - Backend returns 201 on success
 *   - Backend returns { error: { code, message } } on failure (§9.6)
 */
export async function createTrip({ type, mode, destination, days, people, prompt }) {
  try {
    const res = await fetch(`${API_BASE}/trips`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ type, mode, destination, days, people, prompt }),
    });

    const data = await res.json();

    if (!res.ok) {
      // Backend sends { error: { code, message } } for all errors
      return { ok: false, data };
    }

    return { ok: true, data };
  } catch (err) {
    // Network failure / backend not reachable
    return {
      ok: false,
      data: {
        error: {
          code: 'NETWORK_ERROR',
          message: `Could not reach the server. Is the backend running on port 3001? (${err.message})`,
        },
      },
    };
  }
}

/**
 * POST /api/trips/join — join an existing group trip
 *
 * Request : { roomCode, userName }
 * Response: { tripId, userId }
 *   - Backend returns 200 on success
 *   - Backend returns { error: { code, message } } on failure (§9.6)
 */
export async function joinTrip({ roomCode, userName }) {
  try {
    const res = await fetch(`${API_BASE}/trips/join`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ roomCode, userName }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { ok: false, data };
    }

    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      data: {
        error: {
          code: 'NETWORK_ERROR',
          message: `Could not reach the server. Is the backend running on port 3001? (${err.message})`,
        },
      },
    };
  }
}

/**
 * GET /api/trips/:tripId/members — list members
 */
export async function getMembers(tripId) {
  try {
    const res = await fetch(`${API_BASE}/trips/${encodeURIComponent(tripId)}/members`);
    const data = await res.json();
    if (!res.ok) return { ok: false, data };
    return { ok: true, data };
  } catch (err) {
    return { ok: false, data: { error: { code: 'NETWORK_ERROR', message: err.message } } };
  }
}

/**
 * DELETE /api/trips/:tripId/members/:userId — remove a member
 */
export async function removeMember(tripId, targetUserId, adminUserId) {
  try {
    const res = await fetch(`${API_BASE}/trips/${encodeURIComponent(tripId)}/members/${encodeURIComponent(targetUserId)}`, {
      method: 'DELETE',
      headers: getHeaders(),
      body: JSON.stringify({ adminUserId }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, data };
    return { ok: true, data };
  } catch (err) {
    return { ok: false, data: { error: { code: 'NETWORK_ERROR', message: err.message } } };
  }
}

export async function getUserTrips(userId) {
  try {
    const res = await fetch(`${API_BASE}/users/${encodeURIComponent(userId)}/trips`, {
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, data };
    return { ok: true, data };
  } catch (err) {
    return { ok: false, data: { error: { code: 'NETWORK_ERROR', message: err.message } } };
  }
}

export async function deleteTrip(tripId, adminUserId) {
  try {
    const res = await fetch(`${API_BASE}/trips/${encodeURIComponent(tripId)}`, {
      method: 'DELETE',
      headers: getHeaders(),
      body: JSON.stringify({ adminUserId }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, data };
    return { ok: true, data };
  } catch (err) {
    return { ok: false, data: { error: { code: 'NETWORK_ERROR', message: err.message } } };
  }
}

