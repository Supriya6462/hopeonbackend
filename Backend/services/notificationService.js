import Notification from "../Models/Notification.js";
import Donation from "../Models/Donation.js";

export async function createInAppNotification({
  recipient,
  eventType,
  title,
  message,
  payload = {},
}) {
  if (!recipient || !eventType || !title || !message) {
    return null;
  }

  return Notification.create({
    recipient,
    channel: "in_app",
    eventType,
    title,
    message,
    payload,
  });
}

export async function notifyCampaignDonorsInApp({
  campaignId,
  withdrawalRequestId,
  campaignTitle,
  status,
  amount,
  eventDate,
}) {
  if (!campaignId || !withdrawalRequestId || !campaignTitle || !status) {
    return { notifiedCount: 0 };
  }

  const donorIds = await Donation.distinct("donor", {
    campaign: campaignId,
    status: "COMPLETED",
  });

  if (!donorIds.length) {
    return { notifiedCount: 0 };
  }

  const eventType = `campaign_withdrawal_${status}`;
  const existing = await Notification.find({
    recipient: { $in: donorIds },
    eventType,
    "payload.withdrawalRequestId": String(withdrawalRequestId),
  }).select("recipient");

  const existingRecipientSet = new Set(
    existing.map((item) => String(item.recipient)),
  );
  const recipientsToNotify = donorIds.filter(
    (id) => !existingRecipientSet.has(String(id)),
  );

  if (!recipientsToNotify.length) {
    return { notifiedCount: 0 };
  }

  const statusText = status === "completed" ? "paid out" : "scheduled";
  const message = `Campaign ${campaignTitle} has a fund transfer ${statusText}.`;

  const notifications = recipientsToNotify.map((recipient) => ({
    recipient,
    channel: "in_app",
    eventType,
    title: "Campaign Fund Update",
    message,
    payload: {
      campaignId,
      withdrawalRequestId: String(withdrawalRequestId),
      status,
      amount,
      eventDate,
    },
  }));

  await Notification.insertMany(notifications, { ordered: false });

  return { notifiedCount: notifications.length };
}
