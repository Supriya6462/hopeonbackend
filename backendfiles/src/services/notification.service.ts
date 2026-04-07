import Notification from "../models/Notification.js";
import { Donation } from "../models/Donation.model.js";
import mongoose from "mongoose";

export const NotificationEventType = {
  ORGANIZER_APPLICATION_SUBMITTED: "organizer_application_submitted",
  ORGANIZER_APPLICATION_PENDING_REVIEW: "organizer_application_pending_review",
  ORGANIZER_APPLICATION_APPROVED: "organizer_application_approved",
  ORGANIZER_APPLICATION_REJECTED: "organizer_application_rejected",
  ORGANIZER_PROFILE_PENDING_REVIEW: "organizer_profile_pending_review",
  ORGANIZER_PROFILE_VERIFIED: "organizer_profile_verified",
  ORGANIZER_PROFILE_REJECTED: "organizer_profile_rejected",
  CAMPAIGN_APPROVED: "campaign_approved",
  DONATION_COMPLETED: "donation_completed",
  DONATION_RECEIVED: "donation_received",
  CAMPAIGN_WITHDRAWAL_COMPLETED: "campaign_withdrawal_completed",
  CAMPAIGN_WITHDRAWAL_SCHEDULED: "campaign_withdrawal_scheduled",
} as const;

interface CreateInAppNotificationParams {
  recipient: string | mongoose.Types.ObjectId;
  eventType: string;
  title: string;
  message: string;
  payload?: Record<string, unknown>;
}

interface NotifyCampaignDonorsInAppParams {
  campaignId: string;
  withdrawalRequestId: string;
  campaignTitle: string;
  status: "completed" | "scheduled";
  amount?: number;
  eventDate?: Date | string;
}

export async function createInAppNotification({
  recipient,
  eventType,
  title,
  message,
  payload = {},
}: CreateInAppNotificationParams) {
  if (!recipient || !eventType || !title || !message) {
    return null;
  }

  return Notification.create({
    recipient: recipient as any,
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
}: NotifyCampaignDonorsInAppParams) {
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

  const eventType =
    status === "completed"
      ? NotificationEventType.CAMPAIGN_WITHDRAWAL_COMPLETED
      : NotificationEventType.CAMPAIGN_WITHDRAWAL_SCHEDULED;

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
