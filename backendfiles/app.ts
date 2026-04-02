import connectDB from "./dbconnection.js";
import express, { Request, Response, NextFunction } from "express";
import path from "node:path";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import hpp from "hpp";
import morgan from "morgan";
import { errorHandler } from "./src/middleware/errorHandler.middleware.js";

// Import routes
import authRoutes from "./src/Authentication/auth.routes.js";
import campaignRoutes from "./src/Campaign/campaign.routes.js";
import donationRoutes from "./src/Donations/donation.routes.js";
import organizerRoutes from "./src/Organizer/organizer.routes.js";
import withdrawalRoutes from "./src/Organizer/withdrawal.routes.js";
import paymentRoutes from "./src/payments/payment.routes.js";

dotenv.config();
connectDB();

const app = express();

// ===========================================
// SECURITY MIDDLEWARE
// ===========================================

// Set security HTTP headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin for images
    contentSecurityPolicy:
      process.env.NODE_ENV === "production" ? undefined : false, // Disable CSP in dev
  }),
);

// Request logging (dev only)
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// Rate limiting - prevent brute force attacks
const limiter = rateLimit({
  max: 100, // 100 requests per IP
  windowMs: 15 * 60 * 1000, // 15 minutes
  message: {
    success: false,
    message:
      "Too many requests from this IP, please try again after 15 minutes",
    code: 429,
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", limiter);

// Stricter rate limit for auth routes
const authLimiter = rateLimit({
  max: 10, // 10 requests per IP
  windowMs: 15 * 60 * 1000, // 15 minutes
  message: {
    success: false,
    message:
      "Too many authentication attempts, please try again after 15 minutes",
    code: 429,
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/verify-otp", authLimiter);

// CORS
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Body parsers
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Serve local uploads
const uploadDirName = process.env.UPLOAD_DIR || "uploads";
const uploadDirPath = path.resolve(process.cwd(), uploadDirName);
app.use(`/${uploadDirName}`, express.static(uploadDirPath));

// Custom NoSQL injection sanitization (Express 5 compatible)
const sanitizeObject = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const sanitized: any = {};
  for (const key of Object.keys(obj)) {
    // Remove keys starting with $ or containing .
    if (key.startsWith("$") || key.includes(".")) {
      continue;
    }
    sanitized[key] = sanitizeObject(obj[key]);
  }
  return sanitized;
};

app.use((req: Request, _res: Response, next: NextFunction) => {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  // Note: req.query is read-only in Express 5, but we validate via ApiError in services
  next();
});

// Prevent parameter pollution (duplicate query params)
app.use(
  hpp({
    whitelist: ["status", "sort", "page", "limit"], // Allow these params to have multiple values
  }),
);

// Compress responses
app.use(compression());

// ===========================================
// ROUTES
// ===========================================
app.use("/api/auth", authRoutes);
app.use("/api/campaigns", campaignRoutes);
app.use("/api/donations", donationRoutes);
app.use("/api/organizer", organizerRoutes);
app.use("/api/withdrawals", withdrawalRoutes);
app.use("/api/payments", paymentRoutes);

// Health check
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    message: "Server is running",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Global error handler
app.use(errorHandler);

export default app;
