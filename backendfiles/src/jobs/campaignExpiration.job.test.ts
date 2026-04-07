import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../models/Campaign.model.js", () => ({
  Campaign: {
    updateMany: vi.fn(),
  },
}));

import { Campaign } from "../models/Campaign.model.js";
import {
  expireCampaignsByDeadline,
  startCampaignExpirationJob,
} from "./campaignExpiration.job.js";

describe("campaignExpiration.job", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("expires eligible campaigns and returns modified count", async () => {
    vi.mocked(Campaign.updateMany).mockResolvedValue({
      modifiedCount: 3,
    } as any);

    const modifiedCount = await expireCampaignsByDeadline();

    expect(modifiedCount).toBe(3);
    expect(Campaign.updateMany).toHaveBeenCalledTimes(1);

    const [query, update] = vi.mocked(Campaign.updateMany).mock.calls[0];

    expect(query).toMatchObject({
      status: "active",
      isDonationEnabled: true,
      deadlineAt: { $lte: expect.any(Date) },
    });

    expect(update).toMatchObject({
      $set: {
        status: "expired",
        isDonationEnabled: false,
        endedAt: expect.any(Date),
        expiresProcessedAt: expect.any(Date),
      },
    });
  });

  it("returns 0 when updateMany throws", async () => {
    vi.mocked(Campaign.updateMany).mockRejectedValue(new Error("db error"));

    const modifiedCount = await expireCampaignsByDeadline();

    expect(modifiedCount).toBe(0);
    expect(Campaign.updateMany).toHaveBeenCalledTimes(1);
  });

  it("runs once immediately and then on interval", async () => {
    vi.mocked(Campaign.updateMany).mockResolvedValue({
      modifiedCount: 0,
    } as any);

    const timer = startCampaignExpirationJob();

    await Promise.resolve();
    expect(Campaign.updateMany).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    expect(Campaign.updateMany).toHaveBeenCalledTimes(2);

    clearInterval(timer);
  });
});
