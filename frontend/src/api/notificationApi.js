const API_BASE = '/api';

function getAuthHeader(accessToken) {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export const getNotifications = async (tripId, accessToken) => {
  let url = `${API_BASE}/notifications`;
  if (tripId) url += `?tripId=${tripId}`;

  const res = await fetch(url, {
    headers: {
      ...getAuthHeader(accessToken),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to fetch notifications (${res.status})`);
  }

  const data = await res.json();
  return data.notifications;
};

export const markNotificationRead = async (notificationId, accessToken) => {
  const res = await fetch(`${API_BASE}/notifications/read`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(accessToken),
    },
    body: JSON.stringify({ notificationId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to mark notification read");
  }

  return await res.json();
};
