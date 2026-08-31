import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { store } from "../src/models/store.js";

// Reset in-memory store before each test so tests are independent
beforeEach(() => {
  store.clear();
});

/* ════════════════════════════════════════════
   POST /api/trips — create a trip
   ════════════════════════════════════════════ */
describe("POST /api/trips", () => {
  // ── Happy paths ──────────────────────────

  it("creates a solo trip and returns tripId without roomCode", async () => {
    const res = await request(app)
      .post("/api/trips")
      .send({
        type: "trip",
        mode: "solo",
        destination: "Vaishno Devi",
        days: 3,
        people: 2,
        prompt: "vegetarian only",
      })
      .expect(201);

    expect(res.body).toHaveProperty("tripId");
    expect(typeof res.body.tripId).toBe("string");
    // solo → roomCode must NOT be present
    expect(res.body).not.toHaveProperty("roomCode");
  });

  it("creates a group trip and returns tripId + 6-char roomCode", async () => {
    const res = await request(app)
      .post("/api/trips")
      .send({
        type: "trip",
        mode: "group",
        destination: "Manali",
        days: 5,
        people: 8,
      })
      .expect(201);

    expect(res.body).toHaveProperty("tripId");
    expect(res.body).toHaveProperty("roomCode");
    expect(typeof res.body.roomCode).toBe("string");
    expect(res.body.roomCode).toHaveLength(6);
  });

  it("creates an outing (single-day trip type)", async () => {
    const res = await request(app)
      .post("/api/trips")
      .send({
        type: "outing",
        mode: "solo",
        destination: "Shimla",
        days: 1,
        people: 1,
      })
      .expect(201);

    expect(res.body).toHaveProperty("tripId");
  });

  it("defaults to solo and trip when mode/type are omitted", async () => {
    const res = await request(app)
      .post("/api/trips")
      .send({ destination: "Goa", days: 7, people: 4 })
      .expect(201);

    expect(res.body).toHaveProperty("tripId");
    expect(res.body).not.toHaveProperty("roomCode");
  });

  // ── Validation errors ─────────────────────

  it("returns 400 MISSING_FIELDS when destination is absent", async () => {
    const res = await request(app)
      .post("/api/trips")
      .send({ days: 3, people: 2 })
      .expect(400);

    expect(res.body.error.code).toBe("MISSING_FIELDS");
    expect(res.body.error.message).toMatch(/destination/i);
  });

  it("returns 400 MISSING_FIELDS when days is absent", async () => {
    const res = await request(app)
      .post("/api/trips")
      .send({ destination: "Kerala", people: 3 })
      .expect(400);

    expect(res.body.error.code).toBe("MISSING_FIELDS");
    expect(res.body.error.message).toMatch(/days/i);
  });

  it("returns 400 MISSING_FIELDS when people is absent", async () => {
    const res = await request(app)
      .post("/api/trips")
      .send({ destination: "Kerala", days: 4 })
      .expect(400);

    expect(res.body.error.code).toBe("MISSING_FIELDS");
    expect(res.body.error.message).toMatch(/people/i);
  });

  it("returns 400 MISSING_FIELDS listing all missing fields at once", async () => {
    const res = await request(app)
      .post("/api/trips")
      .send({})
      .expect(400);

    expect(res.body.error.code).toBe("MISSING_FIELDS");
    expect(res.body.error.message).toMatch(/destination/i);
    expect(res.body.error.message).toMatch(/days/i);
    expect(res.body.error.message).toMatch(/people/i);
  });

  it("returns 400 INVALID_FIELD for non-integer days", async () => {
    const res = await request(app)
      .post("/api/trips")
      .send({ destination: "Goa", days: 2.5, people: 3 })
      .expect(400);

    expect(res.body.error.code).toBe("INVALID_FIELD");
  });

  it("returns 400 INVALID_FIELD for days < 1", async () => {
    const res = await request(app)
      .post("/api/trips")
      .send({ destination: "Goa", days: 0, people: 3 })
      .expect(400);

    expect(res.body.error.code).toBe("INVALID_FIELD");
  });

  it("returns 400 INVALID_FIELD for unknown mode", async () => {
    const res = await request(app)
      .post("/api/trips")
      .send({ destination: "Goa", days: 3, people: 2, mode: "team" })
      .expect(400);

    expect(res.body.error.code).toBe("INVALID_FIELD");
  });
});

/* ════════════════════════════════════════════
   POST /api/trips/join — join a trip
   ════════════════════════════════════════════ */
describe("POST /api/trips/join", () => {
  async function createGroupTrip(): Promise<{ tripId: string; roomCode: string }> {
    const res = await request(app)
      .post("/api/trips")
      .send({ destination: "Ladakh", days: 6, people: 4, mode: "group" })
      .expect(201);
    return res.body as { tripId: string; roomCode: string };
  }

  it("returns tripId and userId when joining with a valid room code", async () => {
    const { tripId, roomCode } = await createGroupTrip();

    const res = await request(app)
      .post("/api/trips/join")
      .send({ roomCode, userName: "Priya" })
      .expect(200);

    expect(res.body.tripId).toBe(tripId);
    expect(res.body).toHaveProperty("userId");
    expect(typeof res.body.userId).toBe("string");
  });

  it("is case-insensitive for room codes", async () => {
    const { tripId, roomCode } = await createGroupTrip();

    const res = await request(app)
      .post("/api/trips/join")
      .send({ roomCode: roomCode.toLowerCase(), userName: "Raj" })
      .expect(200);

    expect(res.body.tripId).toBe(tripId);
  });

  it("assigns unique userId to each member who joins", async () => {
    const { roomCode } = await createGroupTrip();

    const [r1, r2] = await Promise.all([
      request(app).post("/api/trips/join").send({ roomCode, userName: "Alice" }),
      request(app).post("/api/trips/join").send({ roomCode, userName: "Bob" }),
    ]);

    expect(r1.body.userId).not.toBe(r2.body.userId);
  });

  it("returns 404 ROOM_NOT_FOUND for an unknown room code", async () => {
    const res = await request(app)
      .post("/api/trips/join")
      .send({ roomCode: "XXXXXX", userName: "Ghost" })
      .expect(404);

    expect(res.body.error.code).toBe("ROOM_NOT_FOUND");
  });

  it("returns 400 MISSING_FIELDS when roomCode is absent", async () => {
    const res = await request(app)
      .post("/api/trips/join")
      .send({ userName: "Ravi" })
      .expect(400);

    expect(res.body.error.code).toBe("MISSING_FIELDS");
    expect(res.body.error.message).toMatch(/roomCode/i);
  });

  it("returns 400 MISSING_FIELDS when userName is absent", async () => {
    const { roomCode } = await createGroupTrip();

    const res = await request(app)
      .post("/api/trips/join")
      .send({ roomCode })
      .expect(400);

    expect(res.body.error.code).toBe("MISSING_FIELDS");
    expect(res.body.error.message).toMatch(/userName/i);
  });
});
