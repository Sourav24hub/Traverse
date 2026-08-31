/**
 * In-memory store for trips and members.
 * Suitable for hackathon use. Replace with a DB (e.g. SQLite / Postgres) as needed.
 */

export interface Trip {
  tripId: string;
  type: "trip" | "outing";
  mode: "solo" | "group";
  destination: string;
  days: number;
  people: number;
  prompt?: string;
  /** Only present for group trips */
  roomCode?: string;
  /** Map of userId → userName for members who joined */
  members: Record<string, string>;
  createdAt: string;
}

/** Keyed by tripId */
const trips = new Map<string, Trip>();

/** Keyed by roomCode → tripId (for fast join lookups) */
const roomCodeIndex = new Map<string, string>();

export const store = {
  save(trip: Trip): void {
    trips.set(trip.tripId, trip);
    if (trip.roomCode) {
      roomCodeIndex.set(trip.roomCode, trip.tripId);
    }
  },

  findById(tripId: string): Trip | undefined {
    return trips.get(tripId);
  },

  findByRoomCode(roomCode: string): Trip | undefined {
    const tripId = roomCodeIndex.get(roomCode.toUpperCase());
    if (!tripId) return undefined;
    return trips.get(tripId);
  },

  /** Test helper — clear all data between test runs */
  clear(): void {
    trips.clear();
    roomCodeIndex.clear();
  },
};
