import jwt from "jsonwebtoken";
import User from "../Models/User.js";

/**
 * Authentication middleware - verifies JWT token and attaches user to request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.split(" ")[1]; // "Bearer <token>"
    
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    // Verify JWT with proper error handling
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Token expired" });
      }
      if (jwtError.name === "JsonWebTokenError") {
        return res.status(401).json({ message: "Invalid token" });
      }
      throw jwtError;
    }

    // Verify user still exists and is active
    const user = await User.findById(payload.userId).select("_id role email name");
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Attach user info to request
    req.user = {
      userId: user._id.toString(),
      role: user.role,
      email: user.email,
      name: user.name,
    };
    
    next();
  } catch (err) {
    console.error("Authentication error:", err.message);
    return res.status(401).json({ message: "Unauthorized" });
  }
}

// Alias for consistency with other routes
export const authenticateToken = requireAuth;

/**
 * Role-based authorization middleware
 * @param {string|string[]} allowedRoles - Single role or array of allowed roles
 * @returns {Function} Express middleware function
 */
export function requireRole(allowedRoles) {
  // Normalize to array
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: "Forbidden: Insufficient permissions",
        required: roles,
        current: req.user.role
      });
    }
    
    next();
  };
}
