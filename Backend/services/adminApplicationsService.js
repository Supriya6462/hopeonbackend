import OrganizerApplication from "../Models/OrganizerApplication.js";
import User from "../Models/User.js";

function appendStatusHistory(
  application,
  { fromStatus, toStatus, changedBy, reason = null },
) {
  application.statusHistory = application.statusHistory || [];
  application.statusHistory.push({
    fromStatus,
    toStatus,
    changedBy,
    reason,
    changedAt: new Date(),
  });
}

export async function listSubmittedApplications() {
  return OrganizerApplication.find({
    status: { $ne: "draft" },
  })
    .populate("user", "name email")
    .sort({ createdAt: -1 });
}

export async function approveApplication({ applicationId, adminUserId }) {
  const application = await OrganizerApplication.findById(applicationId);
  if (!application) {
    return { status: 404, message: "Application not found." };
  }
  if (application.status !== "pending") {
    return {
      status: 400,
      message: "Only pending applications can be approved.",
    };
  }

  const previousStatus = application.status;
  application.status = "approved";
  application.reviewedBy = adminUserId;
  application.reviewedAt = new Date();
  appendStatusHistory(application, {
    fromStatus: previousStatus,
    toStatus: "approved",
    changedBy: adminUserId,
  });
  await application.save();

  const userToApprove = await User.findById(application.user);
  if (userToApprove) {
    userToApprove.role = "organizer";
    userToApprove.isOrganizerApproved = true;
    await userToApprove.save();
  }

  return { application, userToApprove };
}

export async function rejectApplication({
  applicationId,
  adminUserId,
  rejectionReason,
}) {
  const application = await OrganizerApplication.findById(applicationId);
  if (!application) {
    return { status: 404, message: "Application not found." };
  }
  if (application.status !== "pending") {
    return {
      status: 400,
      message: "Only pending applications can be rejected.",
    };
  }

  const previousStatus = application.status;
  application.status = "rejected";
  application.reviewedBy = adminUserId;
  application.reviewedAt = new Date();
  application.rejectionReason = rejectionReason?.trim() || null;
  appendStatusHistory(application, {
    fromStatus: previousStatus,
    toStatus: "rejected",
    changedBy: adminUserId,
    reason: application.rejectionReason,
  });
  await application.save();

  const userToNotify = await User.findById(application.user);

  return { application, userToNotify };
}

export async function revokeApplication({
  applicationId,
  adminUserId,
  reason,
}) {
  const application = await OrganizerApplication.findById(applicationId);
  if (!application) {
    return { status: 404, message: "Application not found." };
  }
  if (application.status !== "approved") {
    return {
      status: 400,
      message: "Only an approved application can be revoked.",
    };
  }

  const previousStatus = application.status;
  application.status = "revoked";
  application.reviewedBy = adminUserId;
  application.reviewedAt = new Date();
  if (reason) {
    application.rejectionReason = reason.trim();
  }
  appendStatusHistory(application, {
    fromStatus: previousStatus,
    toStatus: "revoked",
    changedBy: adminUserId,
    reason: application.rejectionReason,
  });
  await application.save();

  const userToRevoke = await User.findById(application.user);
  if (userToRevoke) {
    userToRevoke.role = "donor";
    userToRevoke.isOrganizerApproved = false;
    await userToRevoke.save();
  }

  return { application, userToRevoke };
}
