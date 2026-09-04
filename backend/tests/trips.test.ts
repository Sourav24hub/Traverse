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

  it("creates a solo trip and returns tripId + adminUserId without roomCode", async () => {
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
    expect(res.body).toHaveProperty("adminUserId");
    expect(typeof res.body.adminUserId).toBe("string");
    // solo → roomCode must NOT be present
    expect(res.body).not.toHaveProperty("roomCode");
  });

  it("creates a group trip and returns tripId + adminUserId + 6-char roomCode", async () => {
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
    expect(res.body).toHaveProperty("adminUserId");
    expect(res.body).toHaveProperty("roomCode");
    expect(typeof res.body.roomCode).toBe("string");
    expect(res.body.roomCode).toHaveLength(6);
  });

  it("trip creator is automatically added as admin member in the store", async () => {
    const res = await request(app)
      .post("/api/trips")
      .send({
        destination: "Shimla",
        days: 1,
        people: 1,
        userName: "Alice",
      })
      .expect(201);

    const trip = store.findById(res.body.tripId);
    const admin = trip?.members[res.body.adminUserId];
    expect(admin).toBeDefined();
    expect(admin?.isAdmin).toBe(true);
    expect(admin?.userName).toBe("Alice");
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
    expect(res.body).toHaveProperty("adminUserId");
  });

  it("defaults to solo and trip when mode/type are omitted", async () => {
    const res = await request(app)
      .post("/api/trips")
      .send({ destination: "Goa", days: 7, people: 4 })
      .expect(201);

    expect(res.body).toHaveProperty("tripId");
    expect(res.body).toHaveProperty("adminUserId");
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
  async function createGroupTrip(): Promise<{ tripId: string; roomCode: string; adminUserId: string }> {
    const res = await request(app)
      .post("/api/trips")
      .send({ destination: "Ladakh", days: 6, people: 4, mode: "group" })
      .expect(201);
    return res.body as { tripId: string; roomCode: string; adminUserId: string };
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

  it("joined member is stored as non-admin", async () => {
    const { tripId, roomCode } = await createGroupTrip();

    const res = await request(app)
      .post("/api/trips/join")
      .send({ roomCode, userName: "Priya" })
      .expect(200);

    const trip = store.findById(tripId);
    const member = trip?.members[res.body.userId];
    expect(member).toBeDefined();
    expect(member?.isAdmin).toBe(false);
    expect(member?.userName).toBe("Priya");
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

/* ════════════════════════════════════════════
   GET /api/trips/:tripId/members — list members
   ════════════════════════════════════════════ */
describe("GET /api/trips/:tripId/members", () => {
  it("returns the admin plus joined members with correct isAdmin flags", async () => {
    // Create group trip
    const createRes = await request(app)
      .post("/api/trips")
      .send({ destination: "Manali", days: 3, people: 4, mode: "group", userName: "Leader" })
      .expect(201);
    const { tripId, roomCode, adminUserId } = createRes.body;

    // Join 2 members
    const j1 = await request(app).post("/api/trips/join").send({ roomCode, userName: "Priya" });
    const j2 = await request(app).post("/api/trips/join").send({ roomCode, userName: "Raj" });

    // Get member list
    const res = await request(app)
      .get(`/api/trips/${tripId}/members`)
      .expect(200);

    expect(res.body.tripId).toBe(tripId);
    expect(res.body.members).toHaveLength(3);

    const admin = res.body.members.find((m: any) => m.userId === adminUserId);
    expect(admin).toBeDefined();
    expect(admin.isAdmin).toBe(true);
    expect(admin.userName).toBe("Leader");

    const priya = res.body.members.find((m: any) => m.userId === j1.body.userId);
    expect(priya).toBeDefined();
    expect(priya.isAdmin).toBe(false);
    expect(priya.userName).toBe("Priya");

    const raj = res.body.members.find((m: any) => m.userId === j2.body.userId);
    expect(raj).toBeDefined();
    expect(raj.isAdmin).toBe(false);
  });

  it("returns 404 TRIP_NOT_FOUND for unknown tripId", async () => {
    const res = await request(app)
      .get("/api/trips/nonexistent/members")
      .expect(404);

    expect(res.body.error.code).toBe("TRIP_NOT_FOUND");
  });
});

/* ════════════════════════════════════════════
   DELETE /api/trips/:tripId/members/:userId — remove a member
   ════════════════════════════════════════════ */
describe("DELETE /api/trips/:tripId/members/:userId", () => {
  /** Helper: creates a group trip with 1 joined member, returns all IDs */
  async function setupTripWithMember() {
    const createRes = await request(app)
      .post("/api/trips")
      .send({ destination: "Goa", days: 3, people: 4, mode: "group", userName: "Admin" })
      .expect(201);
    const { tripId, roomCode, adminUserId } = createRes.body;

    const joinRes = await request(app)
      .post("/api/trips/join")
      .send({ roomCode, userName: "Member" })
      .expect(200);
    const memberId = joinRes.body.userId;

    return { tripId, adminUserId, memberId, roomCode };
  }

  it("admin can remove a member successfully", async () => {
    const { tripId, adminUserId, memberId } = await setupTripWithMember();

    const res = await request(app)
      .delete(`/api/trips/${tripId}/members/${memberId}`)
      .send({ adminUserId })
      .expect(200);

    expect(res.body.tripId).toBe(tripId);
    expect(res.body.removedUserId).toBe(memberId);

    // Confirm member is gone from the store
    const trip = store.findById(tripId);
    expect(trip?.members[memberId]).toBeUndefined();
  });

  it("returns 403 NOT_AUTHORIZED when a non-admin tries to remove someone", async () => {
    const { tripId, memberId, roomCode } = await setupTripWithMember();

    // Join another member who will try to do the removal
    const j2 = await request(app)
      .post("/api/trips/join")
      .send({ roomCode, userName: "Imposter" });
    const imposterId = j2.body.userId;

    const res = await request(app)
      .delete(`/api/trips/${tripId}/members/${memberId}`)
      .send({ adminUserId: imposterId })
      .expect(403);

    expect(res.body.error.code).toBe("NOT_AUTHORIZED");
  });

  it("returns 400 CANNOT_REMOVE_ADMIN when admin tries to remove themselves", async () => {
    const { tripId, adminUserId } = await setupTripWithMember();

    const res = await request(app)
      .delete(`/api/trips/${tripId}/members/${adminUserId}`)
      .send({ adminUserId })
      .expect(400);

    expect(res.body.error.code).toBe("CANNOT_REMOVE_ADMIN");
  });

  it("returns 404 MEMBER_NOT_FOUND when target user is not a member", async () => {
    const { tripId, adminUserId } = await setupTripWithMember();

    const res = await request(app)
      .delete(`/api/trips/${tripId}/members/u_nonexistent`)
      .send({ adminUserId })
      .expect(404);

    expect(res.body.error.code).toBe("MEMBER_NOT_FOUND");
  });

  it("returns 404 TRIP_NOT_FOUND for unknown tripId", async () => {
    const res = await request(app)
      .delete("/api/trips/bad_trip/members/u_1")
      .send({ adminUserId: "u_1" })
      .expect(404);

    expect(res.body.error.code).toBe("TRIP_NOT_FOUND");
  });

  it("returns 400 MISSING_FIELDS when adminUserId is absent", async () => {
    const { tripId, memberId } = await setupTripWithMember();

    const res = await request(app)
      .delete(`/api/trips/${tripId}/members/${memberId}`)
      .send({})
      .expect(400);

    expect(res.body.error.code).toBe("MISSING_FIELDS");
  });
});

describe('DELETE /api/trips/:tripId', () => {
  it('deletes trip completely when called by admin', async () => {
    const createRes = await request(app)
      .post('/api/trips')
      .send({ type: 'trip', mode: 'group', destination: 'Tokyo', days: 5, people: 4, userName: 'Admin' })
      .expect(201);
    
    const { tripId, adminUserId } = createRes.body;
    
    await request(app)
      .delete(`/api/trips/${tripId}`)
      .send({ adminUserId })
      .expect(200);
      
    // Verify it's gone
    const getRes = await request(app)
      .get(`/api/users/${adminUserId}/trips`)
      .expect(200);
    expect(getRes.body.trips.length).toBe(0);
  });

  it('returns 403 NOT_AUTHORIZED when called by non-admin', async () => {
    const createRes = await request(app)
      .post('/api/trips')
      .send({ type: 'trip', mode: 'group', destination: 'Tokyo', days: 5, people: 4, userName: 'Admin' })
      .expect(201);
    const { tripId, roomCode } = createRes.body;
    
    const joinRes = await request(app)
      .post('/api/trips/join')
      .send({ roomCode, userName: 'Joiner' })
      .expect(200);
    const joinUserId = joinRes.body.userId;
    
    const res = await request(app)
      .delete(`/api/trips/${tripId}`)
      .send({ adminUserId: joinUserId })
      .expect(403);
    
    expect(res.body.error.code).toBe('NOT_AUTHORIZED');
  });

  it('returns 404 TRIP_NOT_FOUND for nonexistent trip', async () => {
    const res = await request(app)
      .delete('/api/trips/nope')
      .send({ adminUserId: 'u_123' })
      .expect(404);
      
    expect(res.body.error.code).toBe('TRIP_NOT_FOUND');
  });
});
