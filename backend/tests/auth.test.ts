import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { setSupabaseClientFactory } from "../src/services/supabase.js";
import { SupabaseClient } from "@supabase/supabase-js";

/** Mock Supabase client for testing */
function makeMockSupabase(success: boolean): () => SupabaseClient {
  return () => ({
    auth: {
      signInWithOtp: async () => success ? { data: {}, error: null } : { data: null, error: new Error("OTP send failed") },
      verifyOtp: async () => success 
        ? { data: { user: { id: "u_123" }, session: { access_token: "token123" } }, error: null }
        : { data: { user: null, session: null }, error: new Error("Invalid OTP") },
      updateUser: async () => success ? { data: {}, error: null } : { data: null, error: new Error("Update failed") },
      signInWithPassword: async () => success
        ? { data: { user: { id: "u_123", email: "test@example.com", user_metadata: { username: "Tester" } }, session: { access_token: "token123" } }, error: null }
        : { data: { user: null, session: null }, error: new Error("Invalid credentials") },
      getUser: async (token: string) => token === "token123"
        ? { data: { user: { id: "u_123", email: "test@example.com", user_metadata: { username: "Tester" } } }, error: null }
        : { data: { user: null }, error: new Error("Invalid token") },
    }
  } as unknown as SupabaseClient);
}

beforeEach(() => {
  setSupabaseClientFactory(makeMockSupabase(true));
});

describe("Auth Routes", () => {
  describe("POST /api/auth/signup/start", () => {
    it("should send OTP on valid email", async () => {
      const res = await request(app).post("/api/auth/signup/start").send({ email: "test@example.com" }).expect(200);
      expect(res.body.message).toBe("OTP sent");
    });
    it("should fail without email", async () => {
      const res = await request(app).post("/api/auth/signup/start").send({}).expect(400);
      expect(res.body.error.code).toBe("MISSING_FIELDS");
    });
  });

  describe("POST /api/auth/signup/verify", () => {
    it("should verify OTP and return session", async () => {
      const res = await request(app).post("/api/auth/signup/verify").send({ email: "test@example.com", otp: "123456", username: "Tester", password: "password123" }).expect(200);
      expect(res.body.authUserId).toBe("u_123");
      expect(res.body.accessToken).toBe("token123");
    });
    it("should fail with bad OTP", async () => {
      setSupabaseClientFactory(makeMockSupabase(false));
      const res = await request(app).post("/api/auth/signup/verify").send({ email: "test@example.com", otp: "wrong", username: "Tester", password: "password123" }).expect(401);
      expect(res.body.error.code).toBe("INVALID_OTP");
    });
  });

  describe("POST /api/auth/login", () => {
    it("should login with valid credentials", async () => {
      const res = await request(app).post("/api/auth/login").send({ email: "test@example.com", password: "password123" }).expect(200);
      expect(res.body.authUserId).toBe("u_123");
      expect(res.body.accessToken).toBe("token123");
    });
  });

  describe("GET /api/auth/me", () => {
    it("should return user profile with valid token", async () => {
      const res = await request(app).get("/api/auth/me").set("Authorization", "Bearer token123").expect(200);
      expect(res.body.authUserId).toBe("u_123");
      expect(res.body.username).toBe("Tester");
    });
    it("should fail without token", async () => {
      const res = await request(app).get("/api/auth/me").expect(401);
      expect(res.body.error.code).toBe("NOT_AUTHENTICATED");
    });
  });
});
