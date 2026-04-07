import { afterEach, describe, expect, it, vi } from "vitest";

const listenMock = vi.fn();
const dotenvConfigMock = vi.fn();
const startCampaignExpirationJobMock = vi.fn();

vi.mock("./app", () => ({
  default: {
    listen: listenMock,
  },
}));

vi.mock("dotenv", () => ({
  default: {
    config: dotenvConfigMock,
  },
}));

vi.mock("./src/jobs/campaignExpiration.job.js", () => ({
  startCampaignExpirationJob: startCampaignExpirationJobMock,
}));

describe("server startup", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    listenMock.mockReset();
    dotenvConfigMock.mockReset();
    startCampaignExpirationJobMock.mockReset();
    delete process.env.NODE_ENV;
  });

  it("starts the server and campaign expiration job in non-test env", async () => {
    process.env.NODE_ENV = "development";

    listenMock.mockImplementation((_: number, cb: () => void) => {
      cb();
      return { close: vi.fn() };
    });

    await import("./server");

    expect(dotenvConfigMock).toHaveBeenCalled();
    expect(listenMock).toHaveBeenCalledTimes(1);
    expect(startCampaignExpirationJobMock).toHaveBeenCalledTimes(1);
  });

  it("starts server but does not start campaign expiration job in test env", async () => {
    process.env.NODE_ENV = "test";

    listenMock.mockImplementation((_: number, cb: () => void) => {
      cb();
      return { close: vi.fn() };
    });

    const serverModule = await import("./server");
    serverModule.startServer();

    expect(dotenvConfigMock).toHaveBeenCalled();
    expect(listenMock).toHaveBeenCalledTimes(1);
    expect(startCampaignExpirationJobMock).not.toHaveBeenCalled();
  });
});
