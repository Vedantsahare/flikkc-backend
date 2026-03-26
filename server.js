import dotenvSafe from "dotenv";

dotenvSafe.config({
  allowEmptyValues: true,
  example: ".env.example"
});

import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import http from "http";
import { Server } from "socket.io";
import * as Sentry from "@sentry/node";
import cookieParser from "cookie-parser";

import { connectDB } from "./config/db.js";
import logger from "./utils/logger.js";

/* Jobs */
import "./jobs/scheduler.js";

/* Routes */
import authRoutes from "./routes/auth.js";
import walletRoutes from "./routes/walletRoutes.js";
import chatbotRoutes from "./routes/chatbot.js";
import profileRoutes from "./routes/profileRoutes.js";
import eventRoutes from "./routes/eventRoutes.js";
import forumRoutes from "./routes/forum.js";
import adminRoutes from "./routes/adminRoutes.js";
import notificationRoutes from "./routes/notifications.js";
import aiNotificationRoutes from "./routes/aiNotifications.js";
import streamRoutes from "./routes/streamRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";
import kycRoutes from "./routes/kycRoutes.js";
import fraudRoutes from "./routes/fraudRoutes.js";
import contestFraudRoutes from "./routes/contestFraudRoutes.js";
import securityRoutes from "./routes/securityRoutes.js";
import blogRoutes from "./routes/blogRoutes.js";

/* Middleware */
import { apiLimiter } from "./middleware/rateLimiter.js";
import requestId from "./middleware/requestId.js";

/* Redis Adapter */
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";

const app = express();
const server = http.createServer(app);
app.set("trust proxy", 1);

/* =========================
   SENTRY
========================= */

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0
});



/* =========================
   SECURITY
========================= */

app.use(helmet({ contentSecurityPolicy: false }));

app.use(cors({
  origin: [process.env.FRONTEND_URL || "http://localhost:5173"],
  credentials: true
}));

app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use("/uploads", express.static("uploads"));

/* =========================
   LOGGING
========================= */

app.use(morgan("dev"));

/* =========================
   REQUEST ID
========================= */

app.use(requestId);

/* =========================
    COOKIE PARSER
========================= */

app.use(cookieParser());


/* =========================
   RATE LIMIT
========================= */

app.use("/api", apiLimiter);

/* =========================
    BLOG ROUTES
========================= */

app.use("/api/blogs", blogRoutes);

/* =========================
   SOCKET.IO + REDIS
========================= */

const io = new Server(server, {
  cors: {
    origin: [process.env.FRONTEND_URL || "http://localhost:5173"]
  }
});

const pubClient = createClient({
  url: process.env.REDIS_URL || "redis://127.0.0.1:6379"
});

const subClient = pubClient.duplicate();

await pubClient.connect();
await subClient.connect();

io.adapter(createAdapter(pubClient, subClient));

const streamViewers = new Map();

io.on("connection", (socket) => {

  socket.on("join-stream", (streamId) => {
    socket.join(streamId);
    const viewers = streamViewers.get(streamId) || 0;
    streamViewers.set(streamId, viewers + 1);
    io.to(streamId).emit("viewer-count", streamViewers.get(streamId));
  });

  socket.on("leave-stream", (streamId) => {
    socket.leave(streamId);
    const viewers = Math.max((streamViewers.get(streamId) || 1) - 1, 0);
    streamViewers.set(streamId, viewers);
    io.to(streamId).emit("viewer-count", viewers);
  });

});

/* =========================
   ROUTES
========================= */

app.use("/api/auth", authRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/chatbot", chatbotRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/forum", forumRoutes);
app.use("/api/admin", adminRoutes);

app.use("/api/notifications", notificationRoutes);
app.use("/api/ai/notifications", aiNotificationRoutes);
app.use("/api/streams", streamRoutes);

app.use("/api/kyc", kycRoutes);
app.use("/api/fraud", fraudRoutes);
app.use("/api/contest-fraud", contestFraudRoutes);
app.use("/api/security", securityRoutes);

app.use("/api/search", searchRoutes);



/* =========================
   HEALTH CHECK
========================= */

app.get("/", (req, res) => res.send("flikkc API running"));

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: Date.now()
  });
});

/* =========================
   ERROR HANDLING
========================= */



app.use((err, req, res, next) => {
  logger.error(err.stack);

  res.status(500).json({
    success: false,
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal server error"
  });
});

/* =========================
   START SERVER
========================= */

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  server.listen(PORT, () => {
    if (process.env.NODE_ENV !== "production") {
      console.log(`Server running on ${PORT}`);}
    logger.info(`Server running on ${PORT}`);
  });
});