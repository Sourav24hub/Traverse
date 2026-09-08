/**
 * Itinerary routes — implements section 9.2 of PROJECT_SPEC.md
 *
 *   POST /api/itinerary/generate   — call Gemini to generate and store an itinerary
 *   GET  /api/itinerary/:tripId    — retrieve the stored itinerary
 */
import { Router, Request, Response } from "express";
import { store } from "../models/store.js";
import { sendError } from "../services/errors.js";
import { generateItinerary, replanItinerary, validateReplanPrompt } from "../services/gemini.js";
import { fireDynamicNotification } from "../services/groq.js";

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

/* ─────────────────────────────────────────────
   POST /api/itinerary/replan
   Body: { tripId: string, prompt: string }
   ───────────────────────────────────────────── */
router.post("/replan", async (req: Request, res: Response) => {
  const { tripId, prompt } = req.body ?? {};

  if (!tripId || !prompt) {
    return sendError(res, 400, "MISSING_FIELDS", "The following fields are required: tripId, prompt.");
  }

  const trip = store.findById(String(tripId));
  if (!trip) {
    return sendError(res, 404, "TRIP_NOT_FOUND", "No trip with that ID.");
  }

  if (!trip.itinerary) {
    return sendError(
      res,
      404,
      "ITINERARY_NOT_FOUND",
      "No itinerary has been generated for this trip yet."
    );
  }

  try {
    const validation = await validateReplanPrompt(String(prompt));
    if (!validation.valid) {
      return sendError(res, 400, "INVALID_REPLAN_PROMPT", validation.reason || "We couldn't understand that as a valid trip change request.");
    }

    const { updatedDays, reason } = await replanItinerary({
      days: trip.itinerary.days,
      prompt: String(prompt),
    });

    // Enforce rule: never modify or remove completed items.
    // We will build the new full itinerary by taking all completed items from the old itinerary
    // and merging them with the updatedDays (which should ideally contain the remaining items).
    // Or, more simply, we just replace the uncompleted items with the ones returned by Gemini, 
    // ensuring completed items stay exactly as they were.
    const newDays: typeof trip.itinerary.days = [];
    
    // Group new items by day to make merging easier
    const newItemsByDay = new Map<number, typeof updatedDays[0]["items"]>();
    for (const day of updatedDays) {
       newItemsByDay.set(day.day, day.items);
    }

    for (const oldDay of trip.itinerary.days) {
      const completedItems = oldDay.items.filter(i => i.completed);
      
      // Look up if Gemini provided new items for this day
      const newDayItems = newItemsByDay.get(oldDay.day) || [];
      const uncompletedNewItems = newDayItems.filter(i => !i.completed);

      // Even if Gemini omits the day, we must keep completed items.
      if (completedItems.length > 0 || uncompletedNewItems.length > 0) {
        newDays.push({
          day: oldDay.day,
          items: [...completedItems, ...uncompletedNewItems],
        });
      }
    }
    
    // What if Gemini added entirely new days?
    for (const day of updatedDays) {
      if (!trip.itinerary.days.some(d => d.day === day.day)) {
        newDays.push(day);
      }
    }

    // Sort days by day number just in case
    newDays.sort((a, b) => a.day - b.day);

    trip.itinerary.days = newDays;
    store.save(trip);

    // Notify all members
    Object.values(trip.members).forEach(member => {
      fireDynamicNotification(member.userId, tripId, "itinerary_replanned", { destination: trip.destination });
    });

    return res.status(200).json({
      tripId: trip.tripId,
      updatedDays: newDays,
      reason
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error during replanning.";
    console.error("[itinerary/replan] Gemini error:", message);
    return sendError(res, 502, "REPLAN_FAILED", `Failed to replan itinerary: ${message}`);
  }
});

export default router;
