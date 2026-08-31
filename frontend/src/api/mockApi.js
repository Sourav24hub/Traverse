/**
 * ============================================================
 *  MOCK API — Swap these functions for real fetch() calls
 *  when the backend is ready. The request/response shapes
 *  match PROJECT_SPEC.md §9.1 exactly.
 * ============================================================
 */

const MOCK_DELAY_MS = 1200;

/**
 * POST /api/trips — create a new trip
 *
 * Request : { type, mode, destination, days, people, prompt }
 * Response: { tripId, roomCode }           // roomCode is null for solo
 */
export async function createTrip({ type, mode, destination, days, people, prompt }) {
  // ---------- MOCK: replace this block with a real fetch ----------
  await new Promise((r) => setTimeout(r, MOCK_DELAY_MS));

  // Simulate a ~5% random error for testing the error state
  if (Math.random() < 0.05) {
    return {
      ok: false,
      data: {
        error: {
          code: 'TRIP_CREATION_FAILED',
          message: 'Something went wrong while creating the trip. Please try again.',
        },
      },
    };
  }

  const tripId = 'trip_' + Math.random().toString(36).slice(2, 9);
  const roomCode = mode === 'group' ? generateRoomCode() : null;

  return {
    ok: true,
    data: { tripId, roomCode },
  };
  // ---------- END MOCK -------------------------------------------
}

/**
 * POST /api/trips/join — join an existing room
 *
 * Request : { roomCode, userName }
 * Response: { tripId, userId }
 */
export async function joinTrip({ roomCode, userName }) {
  // ---------- MOCK: replace this block with a real fetch ----------
  await new Promise((r) => setTimeout(r, MOCK_DELAY_MS));

  if (Math.random() < 0.05) {
    return {
      ok: false,
      data: {
        error: {
          code: 'ROOM_NOT_FOUND',
          message: 'No room with that code was found.',
        },
      },
    };
  }

  const tripId = 'trip_' + Math.random().toString(36).slice(2, 9);
  const userId = 'u_' + Math.random().toString(36).slice(2, 8);

  return {
    ok: true,
    data: { tripId, userId },
  };
  // ---------- END MOCK -------------------------------------------
}

/* ---------- helpers ---------- */

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I to avoid confusion
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
