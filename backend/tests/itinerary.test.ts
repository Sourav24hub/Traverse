/**
 * Tests for POST /api/itinerary/generate and GET /api/itinerary/:tripId
 * (spec §9.2)
 *
 * Gemini is mocked via setGeminiClientFactory() — no real API calls are made.
 */
import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { store } from "../src/models/store.js";
import { setGeminiClientFactory, GeminiClient } from "../src/services/gemini.js";

/* ─── Gemini mock helpers ────────────────────────────────────────────────── */

/**
 * Builds a mock Gemini client factory that returns a fixed string response.
 * Type-safe — returns () => GeminiClient directly.
 */
function makeMockClient(responseText: string): () => GeminiClient {
  return () => ({
    getGenerativeModel: () => ({
      generateContent: async () => ({
        response: { text: () => responseText },
      }),
    }),
  });
}

/**
 * Builds a mock Gemini client factory where generateContent throws.
 * Used to test the 502 GENERATION_FAILED error path.
 */
function makeMockClientThrowing(errorMsg: string): () => GeminiClient {
  return () => ({
    getGenerativeModel: () => ({
      generateContent: async (): Promise<never> => {
        throw new Error(errorMsg);
      },
    }),
  });
}

/* ─── Fixed mock response (2-day Vaishno Devi trip) ─────────────────────── */
const VALID_GEMINI_RESPONSE = JSON.stringify([
  {
    day: 1,
    items: [
      { name: "Katra Base Camp",    lat: 32.9916, lng: 74.9310, type: "checkpoint", completed: false },
      { name: "Vaishno Devi Shrine", lat: 33.0296, lng: 74.9477, type: "checkpoint", completed: false },
    ],
  },
  {
    day: 2,
    items: [
      { name: "Bhairon Temple", lat: 33.031, lng: 74.95, type: "checkpoint", completed: false },
    ],
  },
]);

// Install default mock before any tests run
setGeminiClientFactory(makeMockClient(VALID_GEMINI_RESPONSE));

/* ─── Test helpers ───────────────────────────────────────────────────────── */

/** Create a solo trip and return its tripId */
async function createTrip(overrides: Record<string, unknown> = {}): Promise<string> {
  const res = await request(app)
    .post("/api/trips")
    .send({
      type: "trip",
      mode: "solo",
      destination: "Vaishno Devi",
      days: 2,
      people: 3,
      ...overrides,
    })
    .expect(201);
  return res.body.tripId as string;
}

/* ─── Reset store + default mock before each test ────────────────────────── */
beforeEach(() => {
  store.clear();
  setGeminiClientFactory(makeMockClient(VALID_GEMINI_RESPONSE));
});

/* ════════════════════════════════════════════
   POST /api/itinerary/generate
   ════════════════════════════════════════════ */
describe("POST /api/itinerary/generate", () => {

  // ── Happy paths ──────────────────────────

  it("returns correct spec §9.2 shape for a valid trip", async () => {
    const tripId = await createTrip();
    const res = await request(app)
      .post("/api/itinerary/generate")
      .send({ tripId })
      .expect(200);

    const { body } = res;

    // Top-level: tripId + days array
    expect(body).toHaveProperty("tripId", tripId);
    expect(Array.isArray(body.days)).toBe(true);
    expect(body.days.length).toBeGreaterThan(0);

    // Each day has a day number and items array
    for (const day of body.days) {
      expect(typeof day.day).toBe("number");
      expect(Array.isArray(day.items)).toBe(true);

      // Each item has all spec §9.2 fields
      for (const item of day.items) {
        expect(typeof item.itemId).toBe("string");
        expect(typeof item.name).toBe("string");
        expect(typeof item.lat).toBe("number");
        expect(typeof item.lng).toBe("number");
        expect(typeof item.type).toBe("string");
        expect(item.completed).toBe(false);
      }
    }
  });

  it("stores the generated itinerary on the trip record so GET works afterward", async () => {
    const tripId = await createTrip();

    await request(app)
      .post("/api/itinerary/generate")
      .send({ tripId })
      .expect(200);

    const trip = store.findById(tripId);
    expect(trip?.itinerary).toBeDefined();
    expect(trip?.itinerary?.tripId).toBe(tripId);
    expect(Array.isArray(trip?.itinerary?.days)).toBe(true);
  });

  it("assigns unique itemIds across all days and items", async () => {
    const tripId = await createTrip();
    const res = await request(app)
      .post("/api/itinerary/generate")
      .send({ tripId })
      .expect(200);

    const allIds: string[] = res.body.days.flatMap(
      (d: { items: { itemId: string }[] }) => d.items.map((i) => i.itemId)
    );
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it("generates separate itineraries for two different trips", async () => {
    const id1 = await createTrip();
    const id2 = await createTrip({ destination: "Manali", days: 3 });

    const [r1, r2] = await Promise.all([
      request(app).post("/api/itinerary/generate").send({ tripId: id1 }),
      request(app).post("/api/itinerary/generate").send({ tripId: id2 }),
    ]);

    expect(r1.body.tripId).toBe(id1);
    expect(r2.body.tripId).toBe(id2);
    expect(r1.body.tripId).not.toBe(r2.body.tripId);
  });

  it("handles Gemini returning JSON wrapped in markdown fences (```json ... ```)", async () => {
    setGeminiClientFactory(
      makeMockClient("```json\n" + VALID_GEMINI_RESPONSE + "\n```")
    );

    const tripId = await createTrip();
    const res = await request(app)
      .post("/api/itinerary/generate")
      .send({ tripId })
      .expect(200);

    expect(res.body.days.length).toBeGreaterThan(0);
  });

  // ── Validation / error paths ──────────────

  it("returns 400 MISSING_FIELDS when tripId is absent", async () => {
    const res = await request(app)
      .post("/api/itinerary/generate")
      .send({})
      .expect(400);

    expect(res.body.error.code).toBe("MISSING_FIELDS");
    expect(res.body.error.message).toMatch(/tripId/i);
  });

  it("returns 404 TRIP_NOT_FOUND for an unknown tripId", async () => {
    const res = await request(app)
      .post("/api/itinerary/generate")
      .send({ tripId: "nonexistent_id" })
      .expect(404);

    expect(res.body.error.code).toBe("TRIP_NOT_FOUND");
    expect(res.body.error.message).toMatch(/no trip/i);
  });

  it("returns 502 GENERATION_FAILED when Gemini throws", async () => {
    setGeminiClientFactory(makeMockClientThrowing("Gemini API quota exceeded"));

    const tripId = await createTrip();
    const res = await request(app)
      .post("/api/itinerary/generate")
      .send({ tripId })
      .expect(502);

    expect(res.body.error.code).toBe("GENERATION_FAILED");
  });
});

/* ════════════════════════════════════════════
   GET /api/itinerary/:tripId
   ════════════════════════════════════════════ */
describe("GET /api/itinerary/:tripId", () => {

  it("returns the stored itinerary in spec §9.2 shape", async () => {
    const tripId = await createTrip();

    await request(app)
      .post("/api/itinerary/generate")
      .send({ tripId })
      .expect(200);

    const res = await request(app)
      .get(`/api/itinerary/${tripId}`)
      .expect(200);

    expect(res.body).toHaveProperty("tripId", tripId);
    expect(Array.isArray(res.body.days)).toBe(true);

    for (const day of res.body.days) {
      expect(typeof day.day).toBe("number");
      expect(Array.isArray(day.items)).toBe(true);
      for (const item of day.items) {
        expect(typeof item.itemId).toBe("string");
        expect(typeof item.name).toBe("string");
        expect(typeof item.lat).toBe("number");
        expect(typeof item.lng).toBe("number");
        expect(typeof item.type).toBe("string");
        expect(item.completed).toBe(false);
      }
    }
  });

  it("GET response matches POST /generate response exactly", async () => {
    const tripId = await createTrip();

    const genRes = await request(app)
      .post("/api/itinerary/generate")
      .send({ tripId })
      .expect(200);

    const getRes = await request(app)
      .get(`/api/itinerary/${tripId}`)
      .expect(200);

    expect(getRes.body).toEqual(genRes.body);
  });

  it("returns 404 TRIP_NOT_FOUND for an unknown tripId", async () => {
    const res = await request(app)
      .get("/api/itinerary/does_not_exist")
      .expect(404);

    expect(res.body.error.code).toBe("TRIP_NOT_FOUND");
  });

  it("returns 404 ITINERARY_NOT_FOUND when trip exists but generate was never called", async () => {
    const tripId = await createTrip(); // trip created, no generate call

    const res = await request(app)
      .get(`/api/itinerary/${tripId}`)
      .expect(404);

    expect(res.body.error.code).toBe("ITINERARY_NOT_FOUND");
  });
});

/* ════════════════════════════════════════════
   POST /api/itinerary/replan
   ════════════════════════════════════════════ */
describe("POST /api/itinerary/replan", () => {
  const VALID_REPLAN_GEMINI_RESPONSE = JSON.stringify({
    valid: true,
    updatedDays: [
      {
        day: 2,
        items: [
          { name: "Alternative Temple", lat: 33.0, lng: 74.0, type: "checkpoint", completed: false }
        ]
      }
    ],
    reason: "Replaced due to weather."
  });

  const INVALID_PROMPT_GEMINI_RESPONSE = JSON.stringify({
    valid: false,
    reason: "Prompt is not related to trip changes."
  });

  it("successfully replans for a valid free-text prompt", async () => {
    const tripId = await createTrip();
    
    // 1. Generate initial itinerary
    await request(app)
      .post("/api/itinerary/generate")
      .send({ tripId })
      .expect(200);

    // 2. Setup mock for replan
    setGeminiClientFactory(makeMockClient(VALID_REPLAN_GEMINI_RESPONSE));

    // 3. Replan
    const res = await request(app)
      .post("/api/itinerary/replan")
      .send({ tripId, prompt: "It's raining, we need indoor things." })
      .expect(200);

    expect(res.body).toHaveProperty("tripId", tripId);
    expect(Array.isArray(res.body.updatedDays)).toBe(true);
    expect(res.body).toHaveProperty("reason", "Replaced due to weather.");
  });

  it("returns 400 INVALID_REPLAN_PROMPT when Gemini marks the prompt as invalid", async () => {
    const tripId = await createTrip();
    
    // Generate initial itinerary
    await request(app)
      .post("/api/itinerary/generate")
      .send({ tripId })
      .expect(200);

    // Setup mock to fail validation
    setGeminiClientFactory(makeMockClient(INVALID_PROMPT_GEMINI_RESPONSE));

    const res = await request(app)
      .post("/api/itinerary/replan")
      .send({ tripId, prompt: "what is the meaning of life?" })
      .expect(400);

    expect(res.body.error.code).toBe("INVALID_REPLAN_PROMPT");
    expect(res.body.error.message).toBe("Prompt is not related to trip changes.");
  });

  it("returns 404 TRIP_NOT_FOUND for an unknown tripId", async () => {
    const res = await request(app)
      .post("/api/itinerary/replan")
      .send({ tripId: "nonexistent_id", prompt: "rain" })
      .expect(404);

    expect(res.body.error.code).toBe("TRIP_NOT_FOUND");
  });

  it("confirms already-completed items are never altered", async () => {
    const tripId = await createTrip();
    
    // Generate initial itinerary
    await request(app)
      .post("/api/itinerary/generate")
      .send({ tripId })
      .expect(200);

    // Mark an item as completed manually in the store
    const trip = store.findById(tripId);
    if (!trip || !trip.itinerary) throw new Error("Setup failed");
    
    // Mark the first item on day 1 as completed
    const itemToComplete = trip.itinerary.days[0].items[0];
    itemToComplete.completed = true;
    const originalItemId = itemToComplete.itemId;
    const originalItemName = itemToComplete.name;
    store.save(trip);

    // Setup mock for replan (returns a different plan for day 1 and 2, valid flag for validation)
    const REPLAN_MOCK = JSON.stringify({
      valid: true,
      updatedDays: [
        {
          day: 1,
          items: [{ name: "New Day 1 Item", lat: 1, lng: 1, type: "checkpoint", completed: false }]
        }
      ],
      reason: "Replaced."
    });
    setGeminiClientFactory(makeMockClient(REPLAN_MOCK));

    const res = await request(app)
      .post("/api/itinerary/replan")
      .send({ tripId, prompt: "late start" })
      .expect(200);

    // Fetch the updated trip to verify
    const updatedTrip = store.findById(tripId);
    
    // Day 1 should have the completed item + the new uncompleted item
    const day1 = updatedTrip?.itinerary?.days.find(d => d.day === 1);
    expect(day1).toBeDefined();
    
    const completedItem = day1?.items.find(i => i.completed);
    expect(completedItem).toBeDefined();
    expect(completedItem?.itemId).toBe(originalItemId);
    expect(completedItem?.name).toBe(originalItemName);
  });
});

