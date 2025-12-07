import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User, IUser } from "../models/User.model.js";
import { Role } from "../types/enums.js";

export interface AuthRequest extends Request {
  user?: IUser;
}

// Verify JWT token and attach user to request
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.split(" ")[1]; // Bearer <token>

    if (!token) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
    };
    const user = await User.findById(decoded.userId).select("-passwordHash");

    if (!user) {
      res.status(401).json({ message: "User not found" });
      return;
    }

    req.user = user as IUser;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired token" });
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
