import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../src/app";
import { store } from "../src/models/store";
import { setSupabaseClientFactory } from "../src/services/supabase.js";
import { SupabaseClient } from "@supabase/supabase-js";

function makeMockSupabase(): () => SupabaseClient {
  return () => ({
    auth: {
      getUser: async (token: string) => {
        if (token === "token123") return { data: { user: { id: "u_123", email: "test@example.com", user_metadata: { username: "Alice" } } }, error: null };
        if (token === "token_bob") return { data: { user: { id: "u_bob", email: "bob@example.com", user_metadata: { username: "Bob" } } }, error: null };
        return { data: { user: null }, error: new Error("Invalid token") };
      },
    }
  } as unknown as SupabaseClient);
}

describe("Notifications System", () => {
  beforeEach(() => {
    store.clear();
    setSupabaseClientFactory(makeMockSupabase());
  });

  it("should store a trip_created notification under the auth user's ID and retrieve it via /api/notifications", async () => {
    // Create a trip authenticated as Alice (token123 → u_123)
    const tripRes = await request(app)
      .post("/api/trips")
      .set("Authorization", `Bearer token123`)
      .send({
        type: "trip",
        mode: "group",
        destination: "Paris",
        days: 3,
        people: 2,
      });

    expect(tripRes.status).toBe(201);
    // adminUserId must be the auth user's ID (u_123), NOT a randomly generated one
    expect(tripRes.body.adminUserId).toBe("u_123");

    // Fetch notifications using /api/notifications (no userId in URL — inferred from token)
    const notifRes = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer token123`);

    expect(notifRes.status).toBe(200);
    expect(notifRes.body.notifications.length).toBe(1);
    expect(notifRes.body.notifications[0].type).toBe("trip_created");
    expect(notifRes.body.notifications[0].message).toContain("Paris");
    expect(notifRes.body.notifications[0].read).toBe(false);

    // Mark as read
    const readRes = await request(app)
      .post("/api/notifications/read")
      .set("Authorization", `Bearer token123`)
      .send({ notificationId: notifRes.body.notifications[0].id });

    expect(readRes.status).toBe(200);

    // Verify it's now read
    const checkRes = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer token123`);
    expect(checkRes.body.notifications[0].read).toBe(true);
  });

  it("should notify all relevant users when someone joins a trip", async () => {
    // Create trip as Alice
    const tripRes = await request(app)
      .post("/api/trips")
      .set("Authorization", `Bearer token123`)
      .send({ type: "trip", mode: "group", destination: "Rome", days: 3, people: 4 });

    expect(tripRes.body.adminUserId).toBe("u_123");
    const { roomCode } = tripRes.body;

    // Bob joins the trip
    const joinRes = await request(app)
      .post("/api/trips/join")
      .set("Authorization", `Bearer token_bob`)
      .send({ roomCode, userName: "Bob" });

    expect(joinRes.status).toBe(200);
    expect(joinRes.body.userId).toBe("u_bob");

    // Alice (admin) should get a user_joined notification
    const aliceNotifs = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer token123`);

    expect(aliceNotifs.body.notifications.some(
      (n: any) => n.type === "user_joined" && n.message.toLowerCase().includes("bob")
    )).toBe(true);

    // Bob (joiner) should get a you_joined notification
    const bobNotifs = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer token_bob`);

    expect(bobNotifs.body.notifications.some(
      (n: any) => n.type === "you_joined"
    )).toBe(true);
  });
});
