import Campaign from "../Models/Campaign.js";
import { logInfo, logError } from "../utils/logger.js";

const EXPIRATION_INTERVAL_MS = 5 * 60 * 1000;

export async function expireCampaignsByDeadline() {
  const now = new Date();

  try {
    const result = await Campaign.updateMany(
      {
        status: "active",
        isDonationEnabled: true,
        deadlineAt: { $lte: now },
      },
      {
        $set: {
          status: "expired",
          isDonationEnabled: false,
          endedAt: now,
          expiresProcessedAt: now,
        },
      },
    );

    if (result.modifiedCount > 0) {
      logInfo("Campaign expiration job processed campaigns", {
        modifiedCount: result.modifiedCount,
      });
    }

    return result.modifiedCount;
  } catch (error) {
    logError("Campaign expiration job failed", error);
    return 0;
  }
}

export function startCampaignExpirationJob() {
  // Run once on startup so stale campaigns are corrected quickly.
  expireCampaignsByDeadline().catch(() => {});

  const timer = setInterval(() => {
    expireCampaignsByDeadline().catch(() => {});
  }, EXPIRATION_INTERVAL_MS);

  return timer;
}
