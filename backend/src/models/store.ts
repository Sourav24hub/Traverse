/**
 * In-memory store for trips, members, and itineraries.
 * Suitable for hackathon use. Replace with a DB (e.g. SQLite / Postgres) as needed.
 */

/** A single stop/activity within a day's plan — matches spec §9.2 */
export interface ItineraryItem {
  itemId: string;
  name: string;
  lat: number;
  lng: number;
  type: string;       // e.g. "checkpoint", "restaurant", "activity"
  completed: boolean;
}

/** One day's worth of itinerary items — matches spec §9.2 */
export interface ItineraryDay {
  day: number;
  items: ItineraryItem[];
}

/** Full itinerary stored against a trip — matches spec §9.2 response shape */
export interface Itinerary {
  tripId: string;
  days: ItineraryDay[];
}

export interface UserLocation {
  userId: string;
  lat: number;
  lng: number;
  timestamp: string;
}

export interface Member {
  userId: string;
  userName: string;
  isAdmin: boolean;
}

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
  /** Map of userId → Member for trip participants */
  members: Record<string, Member>;
  createdAt: string;
  /** Set after POST /api/itinerary/generate is called */
  itinerary?: Itinerary;
  /** Map of userId → latest known UserLocation */
  latestLocations?: Record<string, UserLocation>;
  /** Map of userId → array of historical UserLocations */
  locationHistory?: Record<string, UserLocation[]>;
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
