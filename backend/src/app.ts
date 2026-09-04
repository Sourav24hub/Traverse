import express from "express";
import cors from "cors";
import authRouter from "./routes/auth.js";
import tripsRouter from "./routes/trips.js";
import itineraryRouter from "./routes/itinerary.js";
import locationRouter from "./routes/location.js";
import { optionalAuth } from "./middleware/auth.js";

import usersRouter from "./routes/users.js";

const app = express();

app.use(cors());
app.use(express.json());

// Global optional auth middleware — populates req.user if Bearer token is present and valid
app.use(optionalAuth);

// Mount routers
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/trips", tripsRouter);
app.use("/api/itinerary", itineraryRouter);
app.use("/api/location", locationRouter);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

export default app;
