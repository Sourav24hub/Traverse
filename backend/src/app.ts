import express from "express";
import tripsRouter from "./routes/trips.js";

const app = express();

app.use(express.json());

// Mount routers
app.use("/api/trips", tripsRouter);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

export default app;
