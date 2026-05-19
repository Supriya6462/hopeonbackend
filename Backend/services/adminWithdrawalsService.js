import WithdrawalRequest from "../Models/WithdrawalRequest.js";
import ActivityLog from "../Models/ActivityLog.js";
import { parsePositiveInt } from "../utils/http.js";

const WITHDRAWAL_STATUSES = [
  "pending",
  "under_review",
  "approved",
  "rejected",
  "completed",
];

const TRANSITIONS = {
  // From pending, admin can directly approve, reject, or first mark as under review
  pending: ["under_review", "approved", "rejected"],
  // From under review, admin can approve or reject
  under_review: ["approved", "rejected"],
  // From approved, admin can complete the payment or reject (if issues found)
  approved: ["completed", "rejected"],
  // Rejected is a terminal state (can be reconsidered by creating new request)
  rejected: [],
  // Completed is a terminal state
  completed: [],
};

const ALLOWED_DOCUMENT_TYPES = [
  "governmentId",
  "bankProof",
  "addressProof",
  "taxDocument",
];

export async function listWithdrawalRequests({ status, page, limit }) {
  const parsedPage = parsePositiveInt(page, 1, 10000);
  const parsedLimit = parsePositiveInt(limit, 20, 100);

  if (status && !WITHDRAWAL_STATUSES.includes(status)) {
    return { status: 400, message: "Invalid status filter" };
  }

  const query = status ? { status } : {};

  const withdrawalRequests = await WithdrawalRequest.find(query)
    .populate("organizer", "name email")
    .populate("campaign", "title imageURL target raised")
    .populate("reviewedBy", "name email")
    .sort({ createdAt: -1 })
    .limit(parsedLimit * 1)
    .skip((parsedPage - 1) * parsedLimit);

  const count = await WithdrawalRequest.countDocuments(query);

  return {
    withdrawalRequests,
    totalPages: Math.ceil(count / parsedLimit),
    currentPage: parsedPage,
    total: count,
  };
}

export async function getWithdrawalRequestDetails({
  withdrawalRequestId,
  requesterRole,
  requesterUserId,
}) {
  const withdrawalRequest = await WithdrawalRequest.findById(
    withdrawalRequestId,
  )
    .populate("organizer", "name email")
    .populate("campaign", "title imageURL target raised")
    .populate("reviewedBy", "name email");

  if (!withdrawalRequest) {
    return { status: 404, message: "Withdrawal request not found" };
  }

  // Convert to plain object and ensure bank details are accessible
  const withdrawalRequestObj = withdrawalRequest.toObject();
  
  // Get decrypted bank details for admin view
  if (withdrawalRequest.getDecryptedBankDetails) {
    withdrawalRequestObj.bankDetails = withdrawalRequest.getDecryptedBankDetails();
  }

  if (
    requesterRole === "organizer" &&
    withdrawalRequest.organizer._id.toString() !== requesterUserId
  ) {
    return { status: 403, message: "Access denied" };
  }

  return { withdrawalRequest: withdrawalRequestObj };
}

export async function updateWithdrawalStatus({
  withdrawalRequestId,
  adminUserId,
  status,
  reviewNotes,
  rejectionReason,
  transactionReference,
}) {
  if (!status || !WITHDRAWAL_STATUSES.includes(status)) {
    return { status: 400, message: "Invalid withdrawal status" };
  }

  const withdrawalRequest = await WithdrawalRequest.findById(
    withdrawalRequestId,
  )
    .populate("organizer", "name email")
    .populate("campaign", "title");

  if (!withdrawalRequest) {
    return { status: 404, message: "Withdrawal request not found" };
  }

  const currentStatus = withdrawalRequest.status;
  const allowedTransitions = TRANSITIONS[currentStatus] || [];
  if (!allowedTransitions.includes(status)) {
    return {
      status: 400,
      message: `Invalid status transition from ${currentStatus} to ${status}`,
    };
  }

  if (status === "rejected" && !rejectionReason?.trim()) {
    return { status: 400, message: "Rejection reason is required" };
  }

  if (status === "completed" && !transactionReference?.trim()) {
    return { status: 400, message: "Transaction reference is required" };
  }

  withdrawalRequest.status = status;
  withdrawalRequest.reviewedBy = adminUserId;
  withdrawalRequest.reviewedAt = new Date();
  withdrawalRequest.reviewNotes = reviewNotes;

  if (status === "rejected" && rejectionReason) {
    withdrawalRequest.rejectionReason = rejectionReason;
  }

  if (status === "completed") {
    withdrawalRequest.completedAt = new Date();
    withdrawalRequest.transactionReference = transactionReference;
  }

  await withdrawalRequest.save();

  await ActivityLog.create({
    user: adminUserId,
    activityType: `withdrawal_${status}`,
    description: `Withdrawal request ${status} for campaign "${withdrawalRequest.campaign.title}"`,
    metadata: {
      withdrawalRequestId: withdrawalRequest._id,
      amount: withdrawalRequest.amount,
      organizerId: withdrawalRequest.organizer._id,
    },
    relatedEntity: {
      entityType: "WithdrawalRequest",
      entityId: withdrawalRequest._id,
    },
  });

  return { withdrawalRequest };
}

export async function verifyWithdrawalDocument({
  withdrawalRequestId,
  documentType,
  verified,
}) {
  if (!ALLOWED_DOCUMENT_TYPES.includes(documentType)) {
    return { status: 400, message: "Invalid document type" };
  }

  if (typeof verified !== "boolean") {
    return { status: 400, message: "verified must be boolean" };
  }

  const withdrawalRequest =
    await WithdrawalRequest.findById(withdrawalRequestId);
  if (!withdrawalRequest) {
    return { status: 404, message: "Withdrawal request not found" };
  }

  if (!withdrawalRequest.documents[documentType]) {
    return { status: 400, message: "Invalid document type" };
  }

  withdrawalRequest.documents[documentType].verified = verified;
  await withdrawalRequest.save();

  return { withdrawalRequest };
}
