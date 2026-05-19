import app from "./app.js";
import { startCampaignExpirationJob } from "./services/campaignExpirationJob.js";

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  startCampaignExpirationJob();
  console.log(`🚀 Server running on port ${PORT}`);
});
