import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import path from "node:path";
import connectDB from "./dbconnection.js";
import { apiRateLimiter } from "./middleware/rateLimiter.js";
import { logError, logInfo } from "./utils/logger.js";

import authRouter from "./Routes/auth.js";
import campaignRouter from "./Routes/campaigns.js";
import donationRouter from "./Routes/donations.js";
import paypalrouter from "./Routes/paypal.js";
import paymentRouter from "./Routes/PaymentRoutes.js";
import organizerRouter from "./Routes/organizer.js";
import withdrawalRouter from "./Routes/withdrawals.js";
import adminRouter from "./Routes/admin.js";
import notificationsRouter from "./Routes/notifications.js";
import uploadRouter from "./Routes/upload.js";
import blockchainRouter from "./Routes/blockchain.js";

// Load environment variables
dotenv.config();

// Validate critical environment variables
const requiredEnvVars = ["DATABASE_URL", "JWT_SECRET"];
const enabledGateways = (
  process.env.ENABLED_PAYMENT_GATEWAYS || "paypal,esewa,khalti"
)
  .split(",")
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);

if (enabledGateways.includes("paypal")) {
  requiredEnvVars.push("PAYPAL_CLIENT_ID", "PAYPAL_SECRET");
}

if (enabledGateways.includes("esewa")) {
  requiredEnvVars.push(
    "ESEWA_MERCHANT_ID",
    "ESEWA_SECRET",
    "ESEWA_PAYMENT_URL",
    "ESEWA_PAYMENT_STATUS_CHECK_URL",
    "ESEWA_RETURN_URL",
    "ESEWA_CANCEL_URL",
  );
}

if (enabledGateways.includes("khalti")) {
  requiredEnvVars.push(
    "KHALTI_PUBLIC_KEY",
    "KHALTI_SECRET_KEY",
    "KHALTI_PAYMENT_URL",
    "KHALTI_VERIFICATION_URL",
    "KHALTI_RETURN_URL",
    "KHALTI_CANCEL_URL",
  );
}

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// ENCRYPTION_KEY is mandatory in production to avoid insecure fallback crypto.
if (!process.env.ENCRYPTION_KEY) {
  if (process.env.NODE_ENV === "production") {
    console.error("❌ Missing required environment variable: ENCRYPTION_KEY");
    process.exit(1);
  }

  console.warn(
    "⚠️  WARNING: ENCRYPTION_KEY not set. Sensitive data encryption will use default key.",
  );
}

// Connect to database
connectDB();

const app = express();
const uploadDirName = process.env.UPLOAD_DIR || "uploads";
const uploadDirPath = path.resolve(process.cwd(), uploadDirName);

// Trust proxy (for rate limiting and IP detection behind reverse proxy)
app.set("trust proxy", 1);

// Security headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: [
          "'self'",
          "https://www.paypal.com",
          "https://www.sandbox.paypal.com",
        ],
        frameSrc: ["https://www.paypal.com", "https://www.sandbox.paypal.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: [
          "'self'",
          "https://api.paypal.com",
          "https://api.sandbox.paypal.com",
        ],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  }),
);

// CORS configuration
function normalizeOrigin(value) {
  return typeof value === "string" ? value.trim().replace(/\/+$/, "") : value;
}

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:3001",
  normalizeOrigin(process.env.FRONTEND_URL),
  normalizeOrigin(process.env.BACKREND_URL),
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logError("CORS blocked request", null, { origin });
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Idempotency-Key"],
    maxAge: 86400, // 24 hours
  }),
);

// Body parsing with size limits
app.use(express.json({ limit: "5mb" })); // Reduced from 10mb
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// Apply rate limiting to all API routes (only in production or if explicitly enabled)
if (
  process.env.NODE_ENV === "production" ||
  process.env.ENABLE_RATE_LIMITING === "true"
) {
  app.use("/api", apiRateLimiter);
  logInfo("Rate limiting enabled for API routes");
} else {
  logInfo("Rate limiting disabled for development");
}

// Health check endpoint (no auth required)
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    rateLimiting:
      process.env.NODE_ENV === "production" ||
      process.env.ENABLE_RATE_LIMITING === "true",
  });
});

// Expose uploaded files as static assets.
app.use(
  "/uploads",
  express.static(uploadDirPath, {
    index: false,
  }),
);

// API Routes
app.use("/api/auth", authRouter);
app.use("/api/campaigns", campaignRouter);
app.use("/api/donations", donationRouter);
app.use("/api", paymentRouter);
app.use("/api", paypalrouter);
app.use("/api", organizerRouter);
app.use("/api", withdrawalRouter);
app.use("/api", adminRouter);
app.use("/api", notificationsRouter);
app.use("/api", uploadRouter);
app.use("/api", blockchainRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Endpoint not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  logError("Unhandled error", err, {
    path: req.path,
    method: req.method,
    userId: req.user?.userId,
  });

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV !== "production";

  res.status(err.status || 500).json({
    message: isDevelopment ? err.message : "Internal server error",
    ...(isDevelopment && { stack: err.stack }),
  });
});

export default app;
