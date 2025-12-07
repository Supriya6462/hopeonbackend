import connectDB from "./dbconnection.js";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { errorHandler } from "./src/middleware/errorHandler.middleware.js";

// Import routes
import authRoutes from "./src/Authentication/auth.routes.js";
import campaignRoutes from "./src/Campaign/campaign.routes.js";
import donationRoutes from "./src/Donations/donation.routes.js";
import organizerRoutes from "./src/Organizer/organizer.routes.js";
import withdrawalRoutes from "./src/Organizer/withdrawal.routes.js";

dotenv.config();
connectDB();

const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/campaigns", campaignRoutes);
app.use("/api/donations", donationRoutes);
app.use("/api/organizer", organizerRoutes);
app.use("/api/withdrawals", withdrawalRoutes);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Global error handler
app.use(errorHandler);

export default app;
