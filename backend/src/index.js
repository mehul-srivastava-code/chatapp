import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";

import path from "path";

import { connectDB } from "./lib/db.js";
import { metricsMiddleware, metricsHandler } from "./lib/metrics.js";

import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import { app, server } from "./lib/socket.js";

dotenv.config();

const PORT = process.env.PORT;
const __dirname = path.resolve();

app.use(express.json());
app.use(cookieParser());
// Allow development frontends (Vite at 5173, static container at 8081).
const allowedOrigins = (process.env.CORS_ORIGINS && process.env.CORS_ORIGINS.split(",")) || [
  "http://localhost:5173",
  "http://localhost:8081",
];

app.use(
  cors({
    origin: (origin, cb) => {
      // allow non-browser tools (curl, server-side) with no origin
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// Prometheus metrics middleware (optional: enable via STORAGE_PROVIDER or always)
app.use(metricsMiddleware);

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

// Prometheus metrics endpoint
app.get('/metrics', metricsHandler);

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

server.listen(PORT, () => {
  console.log("server is running on PORT:" + PORT);
  connectDB();
});
