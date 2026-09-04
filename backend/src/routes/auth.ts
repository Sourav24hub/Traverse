import { Router, Request, Response } from "express";
import { getSupabaseClient } from "../services/supabase.js";
import { sendError } from "../services/errors.js";
import { optionalAuth } from "../middleware/auth.js";

const router = Router();

/* ─────────────────────────────────────────────
   POST /api/auth/signup/start — trigger email OTP
   ───────────────────────────────────────────── */
router.post("/signup/start", async (req: Request, res: Response) => {
  const { email } = req.body ?? {};
  if (!email) {
    return sendError(res, 400, "MISSING_FIELDS", "The 'email' field is required.");
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signInWithOtp({ email });

  if (error) {
    return sendError(res, 500, "EMAIL_SEND_FAILED", error.message);
  }

  return res.status(200).json({ message: "OTP sent" });
});

/* ─────────────────────────────────────────────
   POST /api/auth/signup/verify — verify OTP and set username/password
   ───────────────────────────────────────────── */
router.post("/signup/verify", async (req: Request, res: Response) => {
  const { email, otp, username, password } = req.body ?? {};
  if (!email || !otp || !username || !password) {
    return sendError(res, 400, "MISSING_FIELDS", "email, otp, username, and password are required.");
  }

  const supabase = getSupabaseClient();
  
  // Verify the OTP
  const { data, error: verifyError } = await supabase.auth.verifyOtp({
    email,
    token: otp,
    type: "email",
  });

  if (verifyError || !data.user || !data.session) {
    return sendError(res, 401, "INVALID_OTP", verifyError?.message || "Invalid OTP code.");
  }

  // OTP is valid. Now update the user with their password and metadata.
  const { error: updateError } = await supabase.auth.updateUser({
    password,
    data: { username },
  });

  if (updateError) {
    return sendError(res, 500, "SIGNUP_FAILED", updateError.message);
  }

  return res.status(200).json({
    authUserId: data.user.id,
    username,
    email,
    accessToken: data.session.access_token,
  });
});

/* ─────────────────────────────────────────────
   POST /api/auth/login — log in with email/password
   ───────────────────────────────────────────── */
router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return sendError(res, 400, "MISSING_FIELDS", "email and password are required.");
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user || !data.session) {
    return sendError(res, 401, "INVALID_CREDENTIALS", error?.message || "Invalid login credentials.");
  }

  return res.status(200).json({
    authUserId: data.user.id,
    username: data.user.user_metadata?.username ?? "User",
    email: data.user.email,
    accessToken: data.session.access_token,
  });
});

/* ─────────────────────────────────────────────
   GET /api/auth/me — get profile from token
   ───────────────────────────────────────────── */
router.get("/me", optionalAuth, (req: Request, res: Response) => {
  if (!req.user) {
    return sendError(res, 401, "NOT_AUTHENTICATED", "Invalid or missing Bearer token.");
  }

  return res.status(200).json({
    authUserId: req.user.id,
    username: req.user.username,
    email: req.user.email,
  });
});

export default router;
