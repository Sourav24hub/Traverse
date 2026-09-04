const API_BASE = '/api/auth';

export async function signupStart(email) {
  try {
    const res = await fetch(`${API_BASE}/signup/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    return { ok: res.ok, data };
  } catch (err) {
    return { ok: false, data: { error: { code: 'NETWORK_ERROR', message: err.message } } };
  }
}

export async function signupVerify({ email, otp, username, password }) {
  try {
    const res = await fetch(`${API_BASE}/signup/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, username, password }),
    });
    const data = await res.json();
    return { ok: res.ok, data };
  } catch (err) {
    return { ok: false, data: { error: { code: 'NETWORK_ERROR', message: err.message } } };
  }
}

export async function login({ email, password }) {
  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    return { ok: res.ok, data };
  } catch (err) {
    return { ok: false, data: { error: { code: 'NETWORK_ERROR', message: err.message } } };
  }
}

export async function getMe(token) {
  try {
    const res = await fetch(`${API_BASE}/me`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
    });
    const data = await res.json();
    return { ok: res.ok, data };
  } catch (err) {
    return { ok: false, data: { error: { code: 'NETWORK_ERROR', message: err.message } } };
  }
}
