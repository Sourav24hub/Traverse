import { Router } from "express";
import { store, UserLocation } from "../models/store.js";
import { sendError } from "../services/errors.js";
import { haversineDistance } from "../services/haversine.js";

const locationRouter = Router();

const PROXIMITY_THRESHOLD_METERS = 150;

/**
 * POST /api/location/update
 * Body: { tripId: string, userId: string, lat: number, lng: number, timestamp: string }
 * Returns: { reached: string[], updatedItinerary: boolean }
 */
locationRouter.post("/update", (req, res) => {
  const { tripId, userId, lat, lng, timestamp } = req.body;

  if (!tripId || !userId || lat == null || lng == null || !timestamp) {
    return sendError(res, 400, "MISSING_FIELDS", "The following fields are required: tripId, userId, lat, lng, timestamp.");
  }

  const trip = store.findById(tripId);
  if (!trip) {
    return sendError(res, 404, "TRIP_NOT_FOUND", "No trip with that ID.");
  }

  if (!trip.itinerary) {
    return sendError(res, 404, "ITINERARY_NOT_FOUND", "No itinerary has been generated for this trip yet.");
  }

  // Initialize tracking collections if needed
  if (!trip.latestLocations) {
    trip.latestLocations = {};
  }
  if (!trip.locationHistory) {
    trip.locationHistory = {};
  }
  if (!trip.locationHistory[userId]) {
    trip.locationHistory[userId] = [];
  }

  const userLoc: UserLocation = { userId, lat, lng, timestamp };

  // Store user location
  trip.latestLocations[userId] = userLoc;
  trip.locationHistory[userId].push(userLoc);

  // Check proximity against itinerary
  const reached: string[] = [];
  
  for (const day of trip.itinerary.days) {
    for (const item of day.items) {
      if (!item.completed) {
        const distance = haversineDistance(lat, lng, item.lat, item.lng);
        if (distance <= PROXIMITY_THRESHOLD_METERS) {
          item.completed = true;
          reached.push(item.itemId);
        }
      }
    }
  }

  // Spec §9.3: Return reached items and updatedItinerary status
  res.json({
    reached,
    updatedItinerary: false,
  });
});

/**
 * GET /api/location/:tripId
 * Returns latest known positions for all members
 */
locationRouter.get("/:tripId", (req, res) => {
  const { tripId } = req.params;
  const trip = store.findById(tripId);

  if (!trip) {
    return sendError(res, 404, "TRIP_NOT_FOUND", "No trip with that ID.");
  }

  // If trip has no location history yet, just return empty locations
  const locations = trip.latestLocations || {};

  // For this hackathon, we simply return the dictionary/array of members' locations
  // Converting object to an array since that is a common API design for lists of members,
  // but let's stick to an array or map based on standard usage. 
  // We'll return an array of user locations.
  res.json({
    tripId,
    locations: Object.values(locations),
  });
});

export default locationRouter;
