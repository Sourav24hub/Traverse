import { Request, Response, NextFunction } from "express";
import { getSupabaseClient } from "../services/supabase.js";

declare module "express-serve-static-core" {
  interface Request {
    user?: {
      id: string;
      email: string;
      username: string;
    };
  }
}

/**
 * Optional Auth Middleware
 * Extracts the Bearer token, verifies it with Supabase, and attaches `req.user`.
 * Does NOT reject unauthenticated requests.
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.split(" ")[1];
  try {
    const supabase = getSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (!error && user) {
      req.user = {
        id: user.id,
        email: user.email ?? "",
        username: user.user_metadata?.username ?? "User",
      };
    }
  } catch (err) {
    // Ignore errors for optional auth (e.g., token expired, mock client in tests)
  }
  
  next();
}
