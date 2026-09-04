import { Router, Request, Response } from "express";
import { store } from "../models/store.js";
import { sendError } from "../services/errors.js";

const router = Router();

/* ─────────────────────────────────────────────
   GET /api/users/:userId/trips — Get all trips for a user
   ───────────────────────────────────────────── */
router.get("/:userId/trips", (req: Request, res: Response) => {
  const { userId } = req.params;
  if (!userId) {
    return sendError(res, 400, "MISSING_FIELDS", "userId is required.");
  }

  const allTrips = store.getAllTrips();
  const userTrips = allTrips
    .filter(trip => Boolean(trip.members[userId]))
    .map(trip => ({
      tripId: trip.tripId,
      destination: trip.destination,
      days: trip.days,
      mode: trip.mode,
      type: trip.type,
      isAdmin: trip.members[userId].isAdmin,
      roomCode: trip.roomCode,
      createdAt: trip.createdAt,
    }))
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  return res.status(200).json({ trips: userTrips });
});

export default router;
