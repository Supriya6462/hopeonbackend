import User from "../Models/User.js";
import Campaign from "../Models/Campaign.js";
import Donation from "../Models/Donation.js";
import WithdrawalRequest from "../Models/WithdrawalRequest.js";
import OrganizerApplication from "../Models/OrganizerApplication.js";
import ActivityLog from "../Models/ActivityLog.js";
import { parsePositiveInt } from "../utils/http.js";

const USER_ROLES = ["donor", "organizer", "admin"];
const DONATION_STATUSES = ["COMPLETED", "PENDING", "FAILED"];

export async function getDashboardStats() {
  const [
    totalUsers,
    totalDonors,
    totalOrganizers,
    totalCampaigns,
    activeCampaigns,
    totalDonations,
    pendingWithdrawals,
    pendingApplications,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: "donor" }),
    User.countDocuments({ role: "organizer", isOrganizerApproved: true }),
    Campaign.countDocuments(),
    Campaign.aggregate([
      {
        $match: {
          $expr: { $lt: ["$raised", "$target"] },
        },
      },
      { $count: "count" },
    ]),
    Donation.countDocuments({ status: "COMPLETED" }),
    WithdrawalRequest.countDocuments({ status: "pending" }),
    OrganizerApplication.countDocuments({ status: "pending" }),
  ]);

  const donationStats = await Donation.aggregate([
    { $match: { status: "COMPLETED" } },
    { $group: { _id: null, totalAmount: { $sum: "$amount" } } },
  ]);

  const withdrawalStats = await WithdrawalRequest.aggregate([
    { $match: { status: "completed" } },
    { $group: { _id: null, totalAmount: { $sum: "$amount" } } },
  ]);

  return {
    users: {
      total: totalUsers,
      donors: totalDonors,
      organizers: totalOrganizers,
    },
    campaigns: {
      total: totalCampaigns,
      active: activeCampaigns[0]?.count || 0,
    },
    donations: {
      count: totalDonations,
      totalAmount: donationStats[0]?.totalAmount || 0,
    },
    withdrawals: {
      pending: pendingWithdrawals,
      totalWithdrawn: withdrawalStats[0]?.totalAmount || 0,
    },
    applications: {
      pending: pendingApplications,
    },
  };
}

export async function listUsers({ role, search, page, limit }) {
  const parsedPage = parsePositiveInt(page, 1, 10000);
  const parsedLimit = parsePositiveInt(limit, 20, 100);
  const query = {};

  if (role) {
    if (!USER_ROLES.includes(role)) {
      return { status: 400, message: "Invalid role filter" };
    }
    query.role = role;
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const users = await User.find(query)
    .select("-passwordHash -resetToken -resetTokenExpiry")
    .sort({ createdAt: -1 })
    .limit(parsedLimit * 1)
    .skip((parsedPage - 1) * parsedLimit);

  const count = await User.countDocuments(query);

  return {
    users,
    totalPages: Math.ceil(count / parsedLimit),
    currentPage: parsedPage,
    total: count,
  };
}

export async function getUserDetails({ userId }) {
  const user = await User.findById(userId).select(
    "-passwordHash -resetToken -resetTokenExpiry",
  );

  if (!user) {
    return { status: 404, message: "User not found" };
  }

  let campaigns = [];
  if (user.role === "organizer") {
    campaigns = await Campaign.find({ owner: user._id }).sort({
      createdAt: -1,
    });
  }

  const donations = await Donation.find({ donor: user._id })
    .populate("campaign", "title imageURL")
    .sort({ createdAt: -1 })
    .limit(10);

  const activities = await ActivityLog.find({ user: user._id })
    .sort({ createdAt: -1 })
    .limit(20);

  let withdrawalRequests = [];
  if (user.role === "organizer") {
    withdrawalRequests = await WithdrawalRequest.find({ organizer: user._id })
      .populate("campaign", "title")
      .sort({ createdAt: -1 });
  }

  return {
    user,
    campaigns,
    donations,
    activities,
    withdrawalRequests,
  };
}

export async function updateUserStatus({
  userId,
  adminUserId,
  role,
  isOrganizerApproved,
}) {
  const user = await User.findById(userId);

  if (!user) {
    return { status: 404, message: "User not found" };
  }

  if (isOrganizerApproved !== undefined) {
    user.isOrganizerApproved = isOrganizerApproved;
  }

  if (role && !USER_ROLES.includes(role)) {
    return { status: 400, message: "Invalid role value" };
  }

  if (role && adminUserId === user._id.toString() && role !== "admin") {
    return { status: 400, message: "Admin cannot remove own admin role" };
  }

  if (role === "organizer" && isOrganizerApproved === false) {
    return {
      status: 400,
      message: "Organizer role requires isOrganizerApproved=true",
    };
  }

  if (role && USER_ROLES.includes(role)) {
    user.role = role;
  }

  await user.save();

  await ActivityLog.create({
    user: adminUserId,
    activityType: "profile_updated",
    description: `Admin updated user ${user.email} status`,
    metadata: { targetUserId: user._id, isOrganizerApproved, role },
  });

  return { user };
}

export async function listCampaigns({ search, page, limit }) {
  const parsedPage = parsePositiveInt(page, 1, 10000);
  const parsedLimit = parsePositiveInt(limit, 20, 100);
  const query = {};

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  const campaigns = await Campaign.find(query)
    .populate("owner", "name email")
    .sort({ createdAt: -1 })
    .limit(parsedLimit * 1)
    .skip((parsedPage - 1) * parsedLimit);

  const count = await Campaign.countDocuments(query);

  return {
    campaigns,
    totalPages: Math.ceil(count / parsedLimit),
    currentPage: parsedPage,
    total: count,
  };
}

export async function getCampaignDetails({ campaignId }) {
  const campaign = await Campaign.findById(campaignId).populate(
    "owner",
    "name email",
  );

  if (!campaign) {
    return { status: 404, message: "Campaign not found" };
  }

  const donations = await Donation.find({ campaign: campaign._id })
    .populate("donor", "name email")
    .sort({ createdAt: -1 });

  const withdrawalRequests = await WithdrawalRequest.find({
    campaign: campaign._id,
  })
    .populate("organizer", "name email")
    .sort({ createdAt: -1 });

  return {
    campaign,
    donations,
    withdrawalRequests,
  };
}

export async function deleteCampaign({ campaignId, adminUserId }) {
  const campaign = await Campaign.findById(campaignId);

  if (!campaign) {
    return { status: 404, message: "Campaign not found" };
  }

  await Campaign.findByIdAndUpdate(campaignId, {
    $set: {
      status: "inactive",
      isDonationEnabled: false,
      endedAt: campaign.endedAt || new Date(),
    },
  });

  await ActivityLog.create({
    user: adminUserId,
    activityType: "campaign_deleted",
    description: `Admin marked campaign "${campaign.title}" as inactive`,
    metadata: {
      campaignId: campaign._id,
      campaignTitle: campaign.title,
      status: "inactive",
    },
  });

  return {};
}

export async function listDonations({ status, page, limit }) {
  const parsedPage = parsePositiveInt(page, 1, 10000);
  const parsedLimit = parsePositiveInt(limit, 20, 100);

  if (status && !DONATION_STATUSES.includes(status)) {
    return { status: 400, message: "Invalid donation status filter" };
  }

  const query = status ? { status } : {};

  const donations = await Donation.find(query)
    .populate("donor", "name email")
    .populate("campaign", "title owner")
    .sort({ createdAt: -1 })
    .limit(parsedLimit * 1)
    .skip((parsedPage - 1) * parsedLimit);

  const count = await Donation.countDocuments(query);

  return {
    donations,
    totalPages: Math.ceil(count / parsedLimit),
    currentPage: parsedPage,
    total: count,
  };
}

export async function listActivities({ activityType, userId, page, limit }) {
  const parsedPage = parsePositiveInt(page, 1, 10000);
  const parsedLimit = parsePositiveInt(limit, 50, 200);
  const query = {};

  if (activityType) query.activityType = activityType;
  if (userId) query.user = userId;

  const activities = await ActivityLog.find(query)
    .populate("user", "name email role")
    .sort({ createdAt: -1 })
    .limit(parsedLimit * 1)
    .skip((parsedPage - 1) * parsedLimit);

  const count = await ActivityLog.countDocuments(query);

  return {
    activities,
    totalPages: Math.ceil(count / parsedLimit),
    currentPage: parsedPage,
    total: count,
  };
}

export async function getUserDonations({ userId }) {
  // Validate user exists
  const user = await User.findById(userId);
  if (!user) {
    return { status: 404, message: "User not found" };
  }

  // Fetch donations with campaign population
  const donations = await Donation.find({
    donor: userId,
    status: "COMPLETED",
  })
    .populate("campaign", "title imageURL")
    .sort({ createdAt: -1 });

  // Calculate total amount
  const totalAmount = donations.reduce((sum, d) => sum + d.amount, 0);

  return {
    donations,
    totalAmount,
    totalCount: donations.length,
  };
}
