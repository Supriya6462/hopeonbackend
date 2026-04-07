import dotenv from "dotenv";
import app from "./app";
import { startCampaignExpirationJob } from "./src/jobs/campaignExpiration.job.js";

dotenv.config();

const PORT: number = Number(process.env.PORT) || 3001;

export function startServer() {
  return app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);

    if (process.env.NODE_ENV !== "test") {
      startCampaignExpirationJob();
    }
  });
}

if (process.env.NODE_ENV !== "test") {
  startServer();
}
