/**
 * Trip routes — implements section 9.1 of PROJECT_SPEC.md
 *
 *   POST /api/trips       — create a trip
 *   POST /api/trips/join  — join an existing group trip
 */
import { Router, Request, Response } from "express";
import { store } from "../models/store.js";
import { generateId, generateRoomCode } from "../services/idgen.js";
import { sendError } from "../services/errors.js";

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
  const resolvedMode: "solo" | "group" = mode === "group" ? "group" : "solo";
  const roomCode = resolvedMode === "group" ? generateRoomCode() : undefined;

  store.save({
    tripId,
    type: type ?? "trip",
    mode: resolvedMode,
    destination,
    days,
    people,
    prompt: prompt ?? undefined,
    roomCode,
    members: {},
    createdAt: new Date().toISOString(),
  });

  // Response shape from spec §9.1
  // roomCode is omitted (not included as null) for solo trips
  const responseBody: { tripId: string; roomCode?: string } = { tripId };
  if (roomCode) responseBody.roomCode = roomCode;

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
  if (!userName) {
    return sendError(res, 400, "MISSING_FIELDS", "The following fields are required: userName.");
  }

  const trip = store.findByRoomCode(String(roomCode));
  if (!trip) {
    return sendError(res, 404, "ROOM_NOT_FOUND", "No trip found with that room code.");
  }

  const userId = generateId("u");
  trip.members[userId] = String(userName);
  store.save(trip); // persist the updated member list

  // Response shape from spec §9.1
  return res.status(200).json({ tripId: trip.tripId, userId });
});

export default router;
