import express from "express";
import tripsRouter from "./routes/trips.js";
import itineraryRouter from "./routes/itinerary.js";

const app = express();

app.use(express.json());

// Mount routers
app.use("/api/trips", tripsRouter);
app.use("/api/itinerary", itineraryRouter);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

export default app;
