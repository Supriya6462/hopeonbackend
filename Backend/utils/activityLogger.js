import ActivityLog from "../Models/ActivityLog.js";

/**
 * Utility function to log user activities
 * @param {Object} params - Activity log parameters
 */
export const logActivity = async ({
  userId,
  activityType,
  description,
  metadata = {},
  ipAddress = null,
  userAgent = null,
  relatedEntity = null,
}) => {
  try {
    await ActivityLog.create({
      user: userId,
      activityType,
      description,
      metadata,
      ipAddress,
      userAgent,
      relatedEntity,
    });
  } catch (error) {
    console.error("Error logging activity:", error);
    // Don't throw error to prevent breaking main flow
  }
};

/**
 * Middleware to automatically log activities from requests
 */
export const activityLoggerMiddleware = (activityType, getDescription) => {
  return async (req, res, next) => {
    const originalSend = res.send;

    res.send = function (data) {
      // Only log on successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        logActivity({
          userId: req.user?.userId,
          activityType,
          description: typeof getDescription === "function" ? getDescription(req, res) : getDescription,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get("user-agent"),
        }).catch(console.error);
      }

      originalSend.call(this, data);
    };

    next();
  };
};
