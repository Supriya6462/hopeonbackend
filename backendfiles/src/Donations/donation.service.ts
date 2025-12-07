import { Donation } from "../models/Donation.model.js";
import { Campaign } from "../models/Campaign.model.js";
import { DonationStatus, DonationMethod } from "../types/enums.js";
import mongoose from "mongoose";

interface CreateDonationDTO {
  campaign: string;
  amount: number;
  method: DonationMethod;
  donorEmail: string;
  transactionId?: string;
  payerEmail?: string;
  payerName?: string;
  payerCountry?: string;
  cryptoCurrency?: "ETH" | "USDT" | "BTC";
  transactionHash?: string;
  network?: string;
}

interface UpdateDonationPaymentDetails {
  transactionId?: string;
  payerEmail?: string;
  payerName?: string;
  payerCountry?: string;
  captureDetails?: any;
  transactionHash?: string;
}

interface DonationFilters {
  status?: DonationStatus;
  method?: DonationMethod;
  campaign?: string;
  page?: number;
  limit?: number;
}

interface CampaignDonationFilters {
  page?: number;
  limit?: number;
}

export class DonationService {
  // Create donation
  async createDonation(donorId: string, donationData: CreateDonationDTO) {
    // Validate required fields
    if (!donationData.campaign || !donationData.amount || !donationData.method || !donationData.donorEmail) {
      throw new Error("Campaign, amount, method, and donor email are required");
    }

    // Validate amount
    const amount = Number(donationData.amount);
    if (isNaN(amount) || amount < 0.01) {
      throw new Error("Amount must be at least 0.01");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(donationData.donorEmail)) {
      throw new Error("Invalid email format");
    }

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(donorId)) {
      throw new Error("Invalid donor ID");
    }
    if (!mongoose.Types.ObjectId.isValid(donationData.campaign)) {
      throw new Error("Invalid campaign ID");
    }

    // Verify campaign exists and is approved
    const campaignDoc = await Campaign.findById(donationData.campaign);
    if (!campaignDoc) {
      throw new Error("Campaign not found");
    }

    if (!campaignDoc.isApproved) {
      throw new Error("Campaign is not approved for donations");
    }

    if (campaignDoc.isClosed) {
      throw new Error("Campaign is closed and no longer accepting donations");
    }

    // Create donation
    const donation = await Donation.create({
      campaign: donationData.campaign,
      donor: donorId,
      donorEmail: donationData.donorEmail.toLowerCase().trim(),
      amount,
      method: donationData.method,
      transactionId: donationData.transactionId,
      payerEmail: donationData.payerEmail,
      payerName: donationData.payerName,
      payerCountry: donationData.payerCountry,
      cryptoCurrency: donationData.cryptoCurrency,
      transactionHash: donationData.transactionHash,
      network: donationData.network,
      status: DonationStatus.PENDING,
    });

    return donation;
  }

  // Update donation status (after payment confirmation)
  async updateDonationStatus(
    donationId: string,
    status: DonationStatus,
    paymentDetails?: UpdateDonationPaymentDetails
  ) {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(donationId)) {
      throw new Error("Invalid donation ID");
    }

    // Validate status
    if (!Object.values(DonationStatus).includes(status)) {
      throw new Error("Invalid donation status");
    }

    const donation = await Donation.findById(donationId);

    if (!donation) {
      throw new Error("Donation not found");
    }

    const previousStatus = donation.status;

    // Use transaction for data consistency
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Update donation status
      donation.status = status;

      // Add payment details if provided
      if (paymentDetails) {
        if (paymentDetails.transactionId) donation.transactionId = paymentDetails.transactionId;
        if (paymentDetails.payerEmail) donation.payerEmail = paymentDetails.payerEmail;
        if (paymentDetails.payerName) donation.payerName = paymentDetails.payerName;
        if (paymentDetails.payerCountry) donation.payerCountry = paymentDetails.payerCountry;
        if (paymentDetails.captureDetails) donation.captureDetails = paymentDetails.captureDetails;
        if (paymentDetails.transactionHash) donation.transactionHash = paymentDetails.transactionHash;
      }

      await donation.save({ session });

      // If completed for the first time, update campaign raised amount
      if (status === DonationStatus.COMPLETED && previousStatus !== DonationStatus.COMPLETED) {
        await Campaign.findByIdAndUpdate(
          donation.campaign,
          { $inc: { raised: donation.amount } },
          { session }
        );
      }

      // If failed after being completed, deduct from campaign
      if (status === DonationStatus.FAILED && previousStatus === DonationStatus.COMPLETED) {
        const campaign = await Campaign.findById(donation.campaign);
        if (campaign) {
          campaign.raised = Math.max(0, campaign.raised - donation.amount);
          await campaign.save({ session });
        }
      }

      await session.commitTransaction();
      return donation;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // Get donations by campaign
  async getDonationsByCampaign(campaignId: string, filters: CampaignDonationFilters = {}) {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(campaignId)) {
      throw new Error("Invalid campaign ID");
    }

    // Pagination
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
    const skip = (page - 1) * limit;

    const query = { campaign: campaignId, status: DonationStatus.COMPLETED };

    const [donations, total] = await Promise.all([
      Donation.find(query)
        .populate("donor", "name image")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Donation.countDocuments(query),
    ]);

    return {
      donations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Get donations by donor
  async getDonationsByDonor(donorId: string) {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(donorId)) {
      throw new Error("Invalid donor ID");
    }

    return Donation.find({ donor: donorId })
      .populate("campaign", "title images owner")
      .sort({ createdAt: -1 })
      .lean();
  }

  // Get all donations (admin only)
  async getAllDonations(filters: DonationFilters = {}) {
    const query: any = {};

    // Filter by status
    if (filters.status && Object.values(DonationStatus).includes(filters.status)) {
      query.status = filters.status;
    }

    // Filter by method
    if (filters.method && Object.values(DonationMethod).includes(filters.method)) {
      query.method = filters.method;
    }

    // Filter by campaign
    if (filters.campaign && mongoose.Types.ObjectId.isValid(filters.campaign)) {
      query.campaign = filters.campaign;
    }

    // Pagination
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
    const skip = (page - 1) * limit;

    const [donations, total] = await Promise.all([
      Donation.find(query)
        .populate("campaign", "title owner")
        .populate("donor", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Donation.countDocuments(query),
    ]);

    return {
      donations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Get donation statistics
  async getDonationStats(campaignId?: string) {
    const match: any = { status: DonationStatus.COMPLETED };

    // Validate campaignId if provided
    if (campaignId) {
      if (!mongoose.Types.ObjectId.isValid(campaignId)) {
        throw new Error("Invalid campaign ID");
      }
      match.campaign = new mongoose.Types.ObjectId(campaignId);
    }

    const stats = await Donation.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          totalDonations: { $sum: 1 },
          avgDonation: { $avg: "$amount" },
          maxDonation: { $max: "$amount" },
          minDonation: { $min: "$amount" },
        },
      },
    ]);

    return (
      stats[0] || {
        totalAmount: 0,
        totalDonations: 0,
        avgDonation: 0,
        maxDonation: 0,
        minDonation: 0,
      }
    );
  }
}

export const donationService = new DonationService();
