import React, { useState, useEffect, useRef, useCallback } from "react";
import { getNotifications, markNotificationRead } from "../api/notificationApi";
import { useAuth } from "../context/AuthContext";
import "./NotificationBell.css";

export default function NotificationBell({ tripId }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifs = useCallback(async () => {
    if (!user?.accessToken) return;
    try {
      const notifs = await getNotifications(tripId, user.accessToken);
      setNotifications(notifs);
    } catch (err) {
      console.error("NotificationBell fetch error:", err.message);
    }
  }, [user, tripId]);

  // Initial fetch + polling every 5s
  useEffect(() => {
    if (!user) return;
    fetchNotifs();
    const id = setInterval(fetchNotifs, 5000);
    return () => clearInterval(id);
  }, [user, fetchNotifs]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkRead = async (notificationId) => {
    if (!user?.accessToken) return;
    try {
      await markNotificationRead(notificationId, user.accessToken);
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (err) {
      console.error("Mark read failed:", err);
    }
  };

  const formatTime = (iso) => {
    const date = new Date(iso);
    const diffMin = Math.round((Date.now() - date) / 60000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const h = Math.round(diffMin / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.round(h / 24)}d ago`;
  };

  return (
    <>

      {/* Bell button */}
      <div className="notif-container" ref={dropdownRef}>
        <button
          className="notif-bell-btn"
          onClick={() => setIsOpen(v => !v)}
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
        </button>

        {isOpen && (
          <div className="notif-dropdown">
            <div className="notif-header">
              <h3>Notifications</h3>
              {unreadCount > 0 && <span className="notif-unread-label">{unreadCount} new</span>}
            </div>
            <div className="notif-list">
              {notifications.length === 0 ? (
                <div className="notif-empty">No notifications yet.</div>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    className={`notif-item ${!n.read ? "unread" : ""}`}
                    onClick={() => !n.read && handleMarkRead(n.id)}
                    title={n.read ? "" : "Click to mark as read"}
                  >
                    <p className="notif-msg">{n.message}</p>
                    <span className="notif-time">{formatTime(n.createdAt)}</span>
                    {!n.read && <div className="notif-dot" />}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
