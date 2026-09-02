import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { store } from "../src/models/store.js";
import { setGeminiClientFactory, GeminiClient } from "../src/services/gemini.js";

/* ─── Gemini mock helpers ────────────────────────────────────────────────── */

function makeMockClient(responseText: string): () => GeminiClient {
  return () => ({
    getGenerativeModel: () => ({
      generateContent: async () => ({
        response: { text: () => responseText },
      }),
    }),
  });
}

// We place an item exactly at Lat 32.9916, Lng 74.9310
const VALID_GEMINI_RESPONSE = JSON.stringify([
  {
    day: 1,
    items: [
      { name: "Katra Base Camp", lat: 32.9916, lng: 74.9310, type: "checkpoint", completed: false },
      { name: "Vaishno Devi Shrine", lat: 33.0296, lng: 74.9477, type: "checkpoint", completed: false },
    ],
  }
]);

// Install default mock before any tests run
setGeminiClientFactory(makeMockClient(VALID_GEMINI_RESPONSE));

/* ─── Test helpers ───────────────────────────────────────────────────────── */

async function createTripAndGenerateItinerary(): Promise<string> {
  const createRes = await request(app)
    .post("/api/trips")
    .send({
      type: "trip",
      mode: "group",
      destination: "Vaishno Devi",
      days: 1,
      people: 2,
    })
    .expect(201);
    
  const tripId = createRes.body.tripId;

  await request(app)
    .post("/api/itinerary/generate")
    .send({ tripId })
    .expect(200);

  return tripId;
}

/* ─── Reset store + default mock before each test ────────────────────────── */
beforeEach(() => {
  store.clear();
  setGeminiClientFactory(makeMockClient(VALID_GEMINI_RESPONSE));
});

/* ════════════════════════════════════════════
   Location API Tests
   ════════════════════════════════════════════ */
describe("Location API", () => {
  describe("POST /api/location/update", () => {
    it("returns 404 TRIP_NOT_FOUND when trip does not exist", async () => {
      const res = await request(app)
        .post("/api/location/update")
        .send({
          tripId: "bad_id",
          userId: "u_1",
          lat: 32.99,
          lng: 74.93,
          timestamp: new Date().toISOString()
        })
        .expect(404);

      expect(res.body.error.code).toBe("TRIP_NOT_FOUND");
    });

    it("returns 404 ITINERARY_NOT_FOUND when trip exists but has no itinerary", async () => {
      const createRes = await request(app)
        .post("/api/trips")
        .send({
          type: "trip", mode: "solo", destination: "Goa", days: 3, people: 2
        })
        .expect(201);
      
      const res = await request(app)
        .post("/api/location/update")
        .send({
          tripId: createRes.body.tripId,
          userId: "u_1",
          lat: 32.99,
          lng: 74.93,
          timestamp: new Date().toISOString()
        })
        .expect(404);

      expect(res.body.error.code).toBe("ITINERARY_NOT_FOUND");
    });

    it("returns 400 MISSING_FIELDS if lat/lng are omitted", async () => {
      const res = await request(app)
        .post("/api/location/update")
        .send({
          tripId: "t_1",
          userId: "u_1",
          timestamp: new Date().toISOString()
        })
        .expect(400);

      expect(res.body.error.code).toBe("MISSING_FIELDS");
    });

    it("does not reach any item when location is far away", async () => {
      const tripId = await createTripAndGenerateItinerary();

      const res = await request(app)
        .post("/api/location/update")
        .send({
          tripId,
          userId: "u_1",
          lat: 32.0, // Far from 32.9916
          lng: 74.0, // Far from 74.9310
          timestamp: new Date().toISOString()
        })
        .expect(200);

      expect(res.body.reached).toEqual([]);
      expect(res.body.updatedItinerary).toBe(false);

      // Verify item is still not completed in store
      const trip = store.findById(tripId);
      expect(trip?.itinerary?.days[0].items[0].completed).toBe(false);
    });

    it("reaches an item when location is within threshold (<=150m)", async () => {
      const tripId = await createTripAndGenerateItinerary();

      // Target: 32.9916, 74.9310
      // Send something extremely close (e.g., offset by 0.0001 degrees, roughly 11 meters)
      const res = await request(app)
        .post("/api/location/update")
        .send({
          tripId,
          userId: "u_1",
          lat: 32.99165,
          lng: 74.93105,
          timestamp: new Date().toISOString()
        })
        .expect(200);

      expect(res.body.reached.length).toBe(1);
      const itemId = res.body.reached[0];
      
      // Verify item is completed in store
      const trip = store.findById(tripId);
      const item = trip?.itinerary?.days[0].items.find(i => i.itemId === itemId);
      expect(item).toBeDefined();
      expect(item?.completed).toBe(true);
    });
  });

  describe("GET /api/location/:tripId", () => {
    it("tracks multiple users independently and returns their latest positions", async () => {
      const tripId = await createTripAndGenerateItinerary();

      const t1 = new Date().toISOString();
      await request(app).post("/api/location/update").send({
        tripId, userId: "u_1", lat: 32.0, lng: 74.0, timestamp: t1
      });

      const t2 = new Date().toISOString();
      await request(app).post("/api/location/update").send({
        tripId, userId: "u_2", lat: 33.0, lng: 75.0, timestamp: t2
      });

      const t3 = new Date().toISOString();
      await request(app).post("/api/location/update").send({
        tripId, userId: "u_1", lat: 32.5, lng: 74.5, timestamp: t3
      });

      const res = await request(app)
        .get(`/api/location/${tripId}`)
        .expect(200);

      expect(res.body.tripId).toBe(tripId);
      
      // We expect locations to contain u_1's second location and u_2's only location
      const locs = res.body.locations;
      expect(locs).toHaveLength(2);
      
      const u1Loc = locs.find((l: any) => l.userId === "u_1");
      const u2Loc = locs.find((l: any) => l.userId === "u_2");

      expect(u1Loc).toMatchObject({ lat: 32.5, lng: 74.5, timestamp: t3 });
      expect(u2Loc).toMatchObject({ lat: 33.0, lng: 75.0, timestamp: t2 });
    });
  });
});
