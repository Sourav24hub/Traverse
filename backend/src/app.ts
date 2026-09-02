import express from "express";
import cors from "cors";
import tripsRouter from "./routes/trips.js";
import itineraryRouter from "./routes/itinerary.js";
import locationRouter from "./routes/location.js";

const app = express();

app.use(cors());
app.use(express.json());

// Mount routers
app.use("/api/trips", tripsRouter);
app.use("/api/itinerary", itineraryRouter);
app.use("/api/location", locationRouter);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

export default app;
