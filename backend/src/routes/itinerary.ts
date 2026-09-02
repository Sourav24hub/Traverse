/**
 * Itinerary routes — implements section 9.2 of PROJECT_SPEC.md
 *
 *   POST /api/itinerary/generate   — call Gemini to generate and store an itinerary
 *   GET  /api/itinerary/:tripId    — retrieve the stored itinerary
 */
import { Router, Request, Response } from "express";
import { store } from "../models/store.js";
import { sendError } from "../services/errors.js";
import { generateItinerary } from "../services/gemini.js";

const router = Router();

/* ─────────────────────────────────────────────
   POST /api/itinerary/generate
   Body: { tripId: string }
   ───────────────────────────────────────────── */
router.post("/generate", async (req: Request, res: Response) => {
  const { tripId } = req.body ?? {};

  if (!tripId) {
    return sendError(res, 400, "MISSING_FIELDS", "The following fields are required: tripId.");
  }

  const trip = store.findById(String(tripId));
  if (!trip) {
    return sendError(res, 404, "TRIP_NOT_FOUND", "No trip with that ID.");
  }

  try {
    const days = await generateItinerary({
      destination: trip.destination,
      days: trip.days,
      people: trip.people,
      prompt: trip.prompt,
    });

    // Store itinerary back on the trip record
    trip.itinerary = { tripId: trip.tripId, days };
    store.save(trip);

    // Response shape from spec §9.2
    return res.status(200).json({ tripId: trip.tripId, days });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error during generation.";
    console.error("[itinerary/generate] Gemini error:", message);
    return sendError(res, 502, "GENERATION_FAILED", `Failed to generate itinerary: ${message}`);
  }
});

/* ─────────────────────────────────────────────
   GET /api/itinerary/:tripId
   ───────────────────────────────────────────── */
router.get("/:tripId", (req: Request, res: Response) => {
  const { tripId } = req.params;

  const trip = store.findById(tripId);
  if (!trip) {
    return sendError(res, 404, "TRIP_NOT_FOUND", "No trip with that ID.");
  }

  if (!trip.itinerary) {
    return sendError(
      res,
      404,
      "ITINERARY_NOT_FOUND",
      "No itinerary has been generated for this trip yet. Call POST /api/itinerary/generate first."
    );
  }

  // Response shape from spec §9.2 (same as generate)
  return res.status(200).json(trip.itinerary);
});

export default router;
