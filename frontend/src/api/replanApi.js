const API_BASE = '/api/itinerary';

export async function replanItinerary({ tripId, prompt }) {
  try {
    const res = await fetch(`${API_BASE}/replan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripId, prompt }),
    });
    const data = await res.json();
    return { ok: res.ok, data };
  } catch (err) {
    return { ok: false, data: { error: { code: 'NETWORK_ERROR', message: err.message } } };
  }
}

