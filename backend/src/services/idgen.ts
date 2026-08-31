import { v4 as uuidv4 } from "uuid";

/**
 * Generate a random 6-character uppercase room code, e.g. "X72K9P".
 * Uses crypto-safe randomness via uuid v4 under the hood.
 */
export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no confusable chars (0/O, 1/I)
  let code = "";
  // Use uuid bytes as entropy source
  const bytes = uuidv4().replace(/-/g, "");
  for (let i = 0; i < 6; i++) {
    const byte = parseInt(bytes.slice(i * 2, i * 2 + 2), 16);
    code += chars[byte % chars.length];
  }
  return code;
}

/**
 * Generate a prefixed short ID for trips and users.
 * e.g. trip_abc123de, u_abc123de
 */
export function generateId(prefix: string): string {
  return `${prefix}_${uuidv4().replace(/-/g, "").slice(0, 8)}`;
}
