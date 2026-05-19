import {
  deleteCampaign,
  getCampaignDetails,
  getDashboardStats,
  getUserDetails,
  getUserDonations,
  listActivities,
  listCampaigns,
  listDonations,
  listUsers,
  updateUserStatus,
} from "../services/adminService.js";

export async function getAdminDashboardStats(req, res) {
  try {
    const stats = await getDashboardStats();
    return res.json(stats);
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
}

export async function getAdminUsers(req, res) {
  try {
    const result = await listUsers({
      role: req.query.role,
      search: req.query.search,
      page: req.query.page,
      limit: req.query.limit,
    });

    if (result.status) {
      return res.status(result.status).json({ message: result.message });
    }

    return res.json({
      users: result.users,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      total: result.total,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
}

export async function getAdminUserDetails(req, res) {
  try {
    const result = await getUserDetails({ userId: req.params.userId });

    if (result.status) {
      return res.status(result.status).json({ message: result.message });
    }

    return res.json({
      user: result.user,
      campaigns: result.campaigns,
      donations: result.donations,
      activities: result.activities,
      withdrawalRequests: result.withdrawalRequests,
    });
  } catch (error) {
    console.error("Error fetching user details:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
}

export async function getAdminUserDonations(req, res) {
  try {
    const result = await getUserDonations({ userId: req.params.userId });

    if (result.status) {
      return res.status(result.status).json({ message: result.message });
    }

    return res.json({
      donations: result.donations,
      totalAmount: result.totalAmount,
      totalCount: result.totalCount,
    });
  } catch (error) {
    console.error("Error fetching user donations:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
}

export async function patchAdminUserStatus(req, res) {
  try {
    const result = await updateUserStatus({
      userId: req.params.userId,
      adminUserId: req.user.userId,
      role: req.body.role,
      isOrganizerApproved: req.body.isOrganizerApproved,
    });

    if (result.status) {
      return res.status(result.status).json({ message: result.message });
    }

    return res.json({
      message: "User status updated successfully",
      user: result.user,
    });
  } catch (error) {
    console.error("Error updating user status:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
}

export async function getAdminCampaigns(req, res) {
  try {
    const result = await listCampaigns({
      search: req.query.search,
      page: req.query.page,
      limit: req.query.limit,
    });

    return res.json({
      campaigns: result.campaigns,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      total: result.total,
    });
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
}

export async function getAdminCampaignDetails(req, res) {
  try {
    const result = await getCampaignDetails({
      campaignId: req.params.campaignId,
    });

    if (result.status) {
      return res.status(result.status).json({ message: result.message });
    }

    return res.json({
      campaign: result.campaign,
      donations: result.donations,
      withdrawalRequests: result.withdrawalRequests,
    });
  } catch (error) {
    console.error("Error fetching campaign details:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
}

export async function removeAdminCampaign(req, res) {
  try {
    const result = await deleteCampaign({
      campaignId: req.params.campaignId,
      adminUserId: req.user.userId,
    });

    if (result.status) {
      return res.status(result.status).json({ message: result.message });
    }

    return res.json({ message: "Campaign marked as inactive successfully" });
  } catch (error) {
    console.error("Error deleting campaign:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
}

export async function getAdminDonations(req, res) {
  try {
    const result = await listDonations({
      status: req.query.status,
      page: req.query.page,
      limit: req.query.limit,
    });

    if (result.status) {
      return res.status(result.status).json({ message: result.message });
    }

    return res.json({
      donations: result.donations,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      total: result.total,
    });
  } catch (error) {
    console.error("Error fetching donations:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
}

export async function getAdminActivities(req, res) {
  try {
    const result = await listActivities({
      activityType: req.query.activityType,
      userId: req.query.userId,
      page: req.query.page,
      limit: req.query.limit,
    });

    return res.json({
      activities: result.activities,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      total: result.total,
    });
  } catch (error) {
    console.error("Error fetching activities:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
}
