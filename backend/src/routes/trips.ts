/**
 * Trip routes — implements section 9.1 of PROJECT_SPEC.md
 *
 *   POST   /api/trips                       — create a trip
 *   POST   /api/trips/join                  — join an existing group trip
 *   GET    /api/trips/:tripId/members       — list trip members
 *   DELETE /api/trips/:tripId/members/:userId — remove a member (admin only)
 */
import { Router, Request, Response } from "express";
import { store } from "../models/store.js";
import { generateId, generateRoomCode } from "../services/idgen.js";
import { sendError } from "../services/errors.js";
import { fireDynamicNotification } from "../services/groq.js";

const router = Router();

/* ─────────────────────────────────────────────
   POST /api/trips — create a trip
   ───────────────────────────────────────────── */
router.post("/", (req: Request, res: Response) => {
  const { type, mode, destination, days, people, prompt } = req.body ?? {};

  // Validation — destination, days, and people are required (spec §9.1)
  const missing: string[] = [];
  if (!destination) missing.push("destination");
  if (days === undefined || days === null) missing.push("days");
  if (people === undefined || people === null) missing.push("people");

  if (missing.length > 0) {
    return sendError(
      res,
      400,
      "MISSING_FIELDS",
      `The following fields are required: ${missing.join(", ")}.`
    );
  }

  if (typeof days !== "number" || !Number.isInteger(days) || days < 1) {
    return sendError(res, 400, "INVALID_FIELD", "'days' must be a positive integer.");
  }
  if (typeof people !== "number" || !Number.isInteger(people) || people < 1) {
    return sendError(res, 400, "INVALID_FIELD", "'people' must be a positive integer.");
  }
  if (type && !["trip", "outing"].includes(type)) {
    return sendError(res, 400, "INVALID_FIELD", "'type' must be \"trip\" or \"outing\".");
  }
  if (mode && !["solo", "group"].includes(mode)) {
    return sendError(res, 400, "INVALID_FIELD", "'mode' must be \"solo\" or \"group\".");
  }

  const tripId = generateId("trip");
  
  // Use authenticated user ID if present, otherwise fallback to generating a random one
  const adminUserId = req.user?.id ?? generateId("u");
  const adminUserName = req.user?.username ?? req.body.userName ?? "Admin";

  const resolvedMode: "solo" | "group" = mode === "group" ? "group" : "solo";
  const roomCode = resolvedMode === "group" ? generateRoomCode() : undefined;

  // The trip creator is automatically the admin member
  const members: Record<string, { userId: string; userName: string; isAdmin: boolean }> = {
    [adminUserId]: {
      userId: adminUserId,
      userName: adminUserName,
      isAdmin: true,
    },
  };

  store.save({
    tripId,
    type: type ?? "trip",
    mode: resolvedMode,
    destination,
    days,
    people,
    prompt: prompt ?? undefined,
    roomCode,
    members,
    createdAt: new Date().toISOString(),
  });

  // Response — includes adminUserId so the creator can identify themselves
  const responseBody: { tripId: string; adminUserId: string; roomCode?: string } = {
    tripId,
    adminUserId,
  };
  if (roomCode) responseBody.roomCode = roomCode;

  // Notify creator
  fireDynamicNotification(adminUserId, tripId, "trip_created", { destination });

  return res.status(201).json(responseBody);
});

/* ─────────────────────────────────────────────
   POST /api/trips/join — join an existing group trip
   ───────────────────────────────────────────── */
router.post("/join", (req: Request, res: Response) => {
  const { roomCode, userName } = req.body ?? {};

  if (!roomCode) {
    return sendError(res, 400, "MISSING_FIELDS", "The following fields are required: roomCode.");
  }
  if (!userName && !req.user?.username) {
    return sendError(res, 400, "MISSING_FIELDS", "The following fields are required: userName.");
  }

  const trip = store.findByRoomCode(String(roomCode));
  if (!trip) {
    return sendError(res, 404, "ROOM_NOT_FOUND", "No trip found with that room code.");
  }

  const joinUserName = req.user?.username ?? String(userName);

  // Check if this userName has been blocked (removed by admin)
  const normalizedName = joinUserName.toLowerCase();
  if (trip.blockedUserNames && trip.blockedUserNames.includes(normalizedName)) {
    return sendError(res, 403, "USER_BLOCKED", "You have been removed from this trip by the admin and cannot rejoin.");
  }

  // Use authenticated user ID if present
  const userId = req.user?.id ?? generateId("u");
  
  trip.members[userId] = {
    userId,
    userName: joinUserName,
    isAdmin: false,
  };
  store.save(trip); // persist the updated member list

  // Notify the joiner
  fireDynamicNotification(userId, trip.tripId, "you_joined", { destination: trip.destination });

  // Notify existing members
  Object.values(trip.members).forEach(member => {
    if (member.userId !== userId) {
      fireDynamicNotification(member.userId, trip.tripId, "user_joined", { username: joinUserName });
    }
  });

  // Response shape from spec §9.1
  return res.status(200).json({ tripId: trip.tripId, userId });
});

/* ─────────────────────────────────────────────
   GET /api/trips/:tripId/members — list members
   ───────────────────────────────────────────── */
router.get("/:tripId/members", (req: Request, res: Response) => {
  const { tripId } = req.params;

  const trip = store.findById(tripId);
  if (!trip) {
    return sendError(res, 404, "TRIP_NOT_FOUND", "No trip with that ID.");
  }

  const memberList = Object.values(trip.members).map((m) => ({
    userId: m.userId,
    userName: m.userName,
    isAdmin: m.isAdmin,
  }));

  return res.json({ tripId, members: memberList });
});

/* ─────────────────────────────────────────────
   DELETE /api/trips/:tripId/members/:userId — remove a member (admin only)
   ───────────────────────────────────────────── */
router.delete("/:tripId/members/:userId", (req: Request, res: Response) => {
  const { tripId, userId } = req.params;

  // Prefer the authenticated user's ID from the verified Bearer token.
  // Fall back to body only for backward-compat with unauthenticated test calls.
  const adminUserId = req.user?.id ?? req.body?.adminUserId;

  if (!adminUserId) {
    return sendError(res, 401, "UNAUTHORIZED", "Authentication required to remove a member.");
  }

  const trip = store.findById(tripId);
  if (!trip) {
    return sendError(res, 404, "TRIP_NOT_FOUND", "No trip with that ID.");
  }

  // Verify the requester is the actual admin
  const admin = trip.members[adminUserId];
  if (!admin || !admin.isAdmin) {
    return sendError(res, 403, "NOT_AUTHORIZED", "Only the trip admin can remove members.");
  }

  // Admin cannot remove themselves
  if (userId === adminUserId) {
    return sendError(res, 400, "CANNOT_REMOVE_ADMIN", "The admin cannot remove themselves from the trip.");
  }

  // Check target member exists
  if (!trip.members[userId]) {
    return sendError(res, 404, "MEMBER_NOT_FOUND", "No member with that ID in this trip.");
  }

  const removedUser = trip.members[userId];
  const removedName = removedUser.userName.toLowerCase();
  if (!trip.blockedUserNames) trip.blockedUserNames = [];
  if (!trip.blockedUserNames.includes(removedName)) {
    trip.blockedUserNames.push(removedName);
  }

  delete trip.members[userId];
  store.save(trip);

  // Notify the removed user
  fireDynamicNotification(userId, tripId, "you_removed", { destination: trip.destination });

  return res.json({ tripId, removedUserId: userId });
});

/* ─────────────────────────────────────────────
   POST /api/trips/:tripId/leave — Leave a trip
   ───────────────────────────────────────────── */
router.post("/:tripId/leave", (req: Request, res: Response) => {
  const { tripId } = req.params;
  const userId = req.user?.id ?? req.body.userId;

  if (!userId) {
    return sendError(res, 400, "MISSING_FIELDS", "userId is required.");
  }

  const trip = store.findById(tripId);
  if (!trip) {
    return sendError(res, 404, "TRIP_NOT_FOUND", "Trip not found.");
  }

  const leavingUser = trip.members[userId];
  if (!leavingUser) {
    return sendError(res, 404, "MEMBER_NOT_FOUND", "No member with that ID in this trip.");
  }

  if (leavingUser.isAdmin) {
    return sendError(res, 400, "ADMIN_CANNOT_LEAVE", "The admin cannot leave the trip. Delete the trip instead.");
  }

  delete trip.members[userId];
  store.save(trip);

  // Notify the leaving user
  fireDynamicNotification(userId, tripId, "you_left", { destination: trip.destination });

  // Notify remaining members
  Object.values(trip.members).forEach(member => {
    fireDynamicNotification(member.userId, tripId, "user_left", { username: leavingUser.userName });
  });

  return res.json({ tripId, leftUserId: userId });
});

/* ─────────────────────────────────────────────
   DELETE /api/trips/:tripId — Delete an entire trip (Admin only)
   ───────────────────────────────────────────── */
router.delete("/:tripId", (req: Request, res: Response) => {
  const { tripId } = req.params;
  const adminUserId = req.user?.id ?? req.body.adminUserId;

  if (!adminUserId) {
    return sendError(res, 400, "MISSING_FIELDS", "adminUserId is required (via body or Bearer token).");
  }

  const trip = store.findById(tripId);
  if (!trip) {
    return sendError(res, 404, "TRIP_NOT_FOUND", "Trip not found.");
  }

  const requesterMember = trip.members[adminUserId];
  if (!requesterMember || !requesterMember.isAdmin) {
    return sendError(res, 403, "NOT_AUTHORIZED", "Only the trip admin can delete the trip.");
  }

  // Notify all members before deleting
  Object.values(trip.members).forEach(member => {
    fireDynamicNotification(member.userId, undefined, "trip_deleted", { destination: trip.destination });
  });

  // Delete from store completely
  store.deleteTrip(tripId);

  return res.status(200).json({ tripId, deleted: true });
});

export default router;
