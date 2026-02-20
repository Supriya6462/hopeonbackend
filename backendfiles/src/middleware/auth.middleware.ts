import { Request, Response, NextFunction } from "express";
import { User, IUser } from "../models/User.model.js";
import { Role } from "../types/enums.js";
import { ApiError } from "../utils/ApiError.js";
import { verifyAccessToken } from "../utils/generateTokens.js";

export interface AuthRequest extends Request {
  user?: IUser;
}

// Verify JWT token and attach user to request
export const authenticate = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.split(" ")[1]; // Bearer <token>

    if (!token) {
    throw new ApiError("Authentication required", 401, "AUTH_REQUIRED");
    }

    const decoded = verifyAccessToken(token) as { userId: string};
    const user = await User.findById(decoded.userId).select("-passwordHash");

    if (!user) {
    throw new ApiError("User not found", 401, "AUTH_USER_NOT_FOUND");
    }

    req.user = user as IUser;
    next();
  } catch (error) {
    next(error);
  }
};

// Role-based access control
export const authorize = (...allowedRoles: Role[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    if (!allowedRoles.includes(req.user.role as Role)) {
      res.status(403).json({
        message: "Access denied. Insufficient permissions",
        requiredRoles: allowedRoles,
        yourRole: req.user.role,
      });
      return;
    }

    next();
  };
};

// Check if organizer is approved and not revoked
export const requireApprovedOrganizer = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  if (req.user.role === Role.ORGANIZER) {
    // Check if revoked
    if (req.user.isOrganizerRevoked) {
      res.status(403).json({
        message: "Your organizer account has been revoked",
        status: "revoked",
        reason: req.user.revocationReason || "Account revoked by admin",
        revokedAt: req.user.revokedAt,
      });
      return;
    }

    // Check if approved
    if (!req.user.isOrganizerApproved) {
      res.status(403).json({
        message: "Your organizer account is pending approval",
        status: "pending_approval",
      });
      return;
    }
  }

  next();
};

// Check resource ownership (for organizers accessing their own resources)
export const checkOwnership = (resourceField: string = "owner") => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    // Admins can access everything
    if (req.user.role === Role.ADMIN) {
      next();
      return;
    }

    // For organizers, check ownership in the route handler
    // This middleware just marks that ownership check is required
    (req as any).requireOwnershipCheck = true;
    (req as any).ownershipField = resourceField;
    next();
  };
};
