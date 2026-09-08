import express from "express";
import { store } from "../models/store";
import { requireAuth } from "../middleware/auth";
import { sendError } from "../services/errors";

export const notificationRouter = express.Router();

/**
 * GET /api/notifications
 * Returns notifications for the authenticated user (userId inferred from Bearer token).
 * Optional query param: ?tripId=... to filter by trip.
 */
notificationRouter.get("/", requireAuth, (req, res) => {
  const userId = (req as any).user.id;
  const { tripId } = req.query;

  const notifications = store.getNotifications(userId, tripId as string | undefined);
  // Return sorted newest first
  const sorted = [...notifications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  res.json({ notifications: sorted });
});

/**
 * POST /api/notifications/read
 * Marks a notification as read for the authenticated user.
 */
notificationRouter.post("/read", requireAuth, (req, res) => {
  const userId = (req as any).user.id;
  const { notificationId } = req.body;

  if (!notificationId) {
    return sendError(res, 400, "MISSING_FIELDS", "notificationId is required.");
  }

  store.markNotificationRead(userId, notificationId);
  res.json({ success: true });
});
